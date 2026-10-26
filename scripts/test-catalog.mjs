// Integration test against a separate, disposable local PostgreSQL database.
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {database,closeDatabase} from '../lib/catalog/database.js';
import {saveCatalog,enqueueJobs,catalogStats} from '../lib/catalog/store.js';
import {findCatalogReleases} from '../lib/catalog/search.js';
import {ingestCatalog} from '../lib/catalog/ingest.js';
import {releaseDateParts} from '../lib/catalog/normalize.js';
const url=new URL(process.env.MUSIC_DATABASE_URL||'postgresql://localhost/invalid');
if(url.hostname!=='127.0.0.1'||url.pathname!=='/birthday_catalog_test')throw new Error('Use the isolated local birthday_catalog_test database');
try{
 await database().query(await readFile(new URL('../supabase/migrations/202610260001_music_catalog.sql',import.meta.url),'utf8'));
 const artist={id:'test:artist',name:'Singer',region:'pop',source_url:'https://music.apple.com/us/artist/1'};
 const song=(id,date,region='pop')=>({id,artist_id:artist.id,title:id,artist_name:'Singer',region,provider:'itunes',...releaseDateParts(date),date_basis:'album',source_url:'https://music.apple.com/us/album/2',popularity:10});
 await saveCatalog({artists:[artist],tracks:[song('test:exact','1995-01-24'),song('test:same','2000-01-24'),song('test:year','1995'),song('test:other','1995-01-25'),song('test:kr','1995-01-24','kr'),song('test:leap','2000-02-29')]});
 await database().query("update music_catalog.artists set birthday='1980-02-29',birthday_source='https://www.wikidata.org/entity/Q1' where id='test:artist'");
 await saveCatalog({artists:[artist],tracks:[song('test:exact','1995-01-24')]});
 assert.equal((await database().query("select birthday::text from music_catalog.artists where id='test:artist'")).rows[0].birthday,'1980-02-29','catalog refresh must preserve independently verified birthday metadata');
 assert.equal((await catalogStats()).tracks,6,'upsert must not duplicate tracks');
 assert.deepEqual((await findCatalogReleases('1995-01-24','pop','exact')).map(t=>t.id),['test:exact']);
 assert.deepEqual((await findCatalogReleases('1995-01-24','pop','same')).map(t=>t.id),['test:same']);
 assert.equal((await findCatalogReleases('1995-01-01','pop','exact')).length,0);
 assert.equal((await findCatalogReleases('2004-02-29','pop','same'))[0].id,'test:leap');
 await assert.rejects(findCatalogReleases('1995-01-24',"pop' OR true --",'exact'));
 await assert.rejects(saveCatalog({tracks:[{...song('test:bad','1995'),date_precision:'day'}]}));
 await assert.rejects(saveCatalog({tracks:[{...song('test:missing-year','1995-01-24'),release_year:null}]}));
 assert.equal((await catalogStats()).tracks,6,'invalid writes roll back');
 await enqueueJobs([{id:'test:job',kind:'apple_artist',payload:{name:'Singer',region:'pop'}}]);
 await enqueueJobs([{id:'test:job',kind:'apple_artist',payload:{name:'Singer',region:'pop'}}]);
 assert.equal((await catalogStats()).pending_jobs,1);
 await database().query("update music_catalog.worker set lease_token='another-worker',lease_until=now()+interval '1 minute' where id=1");
 assert.equal((await ingestCatalog()).busy,true,'concurrent worker must not run');
 const security=await database().query("select bool_and(relrowsecurity) enabled from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='music_catalog' and c.relkind='r'");
 assert.equal(security.rows[0].enabled,true);
 console.log('PostgreSQL integration passed: dates, regions, leap days, upserts, rollback, jobs, lease, RLS.');
}finally{await closeDatabase();}
