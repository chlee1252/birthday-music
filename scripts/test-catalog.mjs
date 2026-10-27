import {migrateCatalog} from '../lib/catalog/migrate.js';
// Integration test against a separate, disposable local PostgreSQL database.
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {database,closeDatabase} from '../lib/catalog/database.js';
import {saveCatalog,enqueueJobs,catalogStats} from '../lib/catalog/store.js';
import {findCatalogReleases} from '../lib/catalog/search.js';
import {findCatalogChartArchive} from '../lib/catalog/charts.js';
import {getChartArchive} from '../lib/chart-provider.js';
import {reserveCollectionBudget} from '../lib/catalog/budget.js';
import {ingestCatalog} from '../lib/catalog/ingest.js';
import {releaseDateParts} from '../lib/catalog/normalize.js';
const url=new URL(process.env.MUSIC_DATABASE_URL||'postgresql://localhost/invalid');
if(url.hostname!=='127.0.0.1'||url.pathname!=='/birthday_catalog_test')throw new Error('Use the isolated local birthday_catalog_test database');
try{
 await migrateCatalog();
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
 // More than 100 editions must not crowd other matching songs out before deduplication.
 const editions=Array.from({length:105},(_,i)=>({...song(`edition:${i}`,'1995-01-24'),title:'Repeated song'}));
 await saveCatalog({tracks:[...editions,{...song('test:quarantine','1995-01-24'),title:'Karaoke tribute to Singer'}]});
 const many=await findCatalogReleases('1995-01-24','pop','exact');
 assert.equal(many.filter(t=>t.title==='Repeated song').length,1);
 assert.ok(many.some(t=>t.id==='test:exact'));
 assert.ok(many.every(t=>t.id!=='test:quarantine'));
 await saveCatalog({tracks:[{...song('original','1982-11-29'),title:'Original song'},{...song('reissue','2009-07-13'),title:'Original song'},
  {...song('late-chart','2007-01-01'),title:'Older hit',first_chart_year:1984}]});
 assert.ok((await findCatalogReleases('1982-11-29','pop','exact')).some(t=>t.id==='original'));
 assert.ok((await findCatalogReleases('2009-07-13','pop','exact')).every(t=>t.id!=='reissue'));
 assert.ok((await findCatalogReleases('2007-01-01','pop','exact')).every(t=>t.id!=='late-chart'));
 await saveCatalog({tracks:[{...song('other-provider-edition','2015-03-02'),title:'Older hit',provider:'melon'}]});
 assert.equal((await database().query("select review_state from music_catalog.tracks where id='other-provider-edition'")).rows[0].review_state,'quarantined','chart chronology must propagate across provider records');
 assert.equal((await findCatalogReleases('2015-03-02','pop','exact')).length,0);
 await database().query("update music_catalog.worker set lease_token=null,lease_until=null,melon_retry_at=now()+interval '5 minutes' where id=1");
 await database().query("insert into music_catalog.chart_entries(year,region,rank,track_id,title,artist_name,source_url) values (1995,'kr',1,'melon:101','Chart first','Singer','https://www.melon.com/chart/age/index.htm'),(1995,'kr',2,'melon:102','Chart second','Singer','https://www.melon.com/chart/age/index.htm')");
 await enqueueJobs([{id:'melon:track:101',kind:'melon_track',payload:{track:{cover:'https://cdnimg.melon.co.kr/cover.jpg'}}}]);
 const originalChartFetch=globalThis.fetch;
 globalThis.fetch=async()=>assert.fail('Stored charts must not contact Melon');
 try{
  const chart=await getChartArchive(1995,'KPOP');
  assert.equal(chart.origin,'catalog');assert.equal(chart.tracks.length,2);
  assert.equal(chart.tracks[0].title,'Chart first');assert.equal(chart.tracks[0].cover,'https://cdnimg.melon.co.kr/cover.jpg');
  assert.equal(chart.tracks[1].id,'102','unenriched tracks retain their chart ranking');
  assert.equal(await findCatalogChartArchive(1995,'POP'),null,'regions cannot be substituted');
  assert.equal(await findCatalogChartArchive(1996,'KPOP'),null,'years cannot be substituted');
 }finally{globalThis.fetch=originalChartFetch;}
 const originalBudgetFetch=globalThis.fetch;
 globalThis.fetch=async()=>assert.fail('No provider call is allowed before the budget review');
 try{assert.equal((await ingestCatalog({maxJobs:1})).stoppedReason,'USAGE_REVIEW_REQUIRED');}finally{globalThis.fetch=originalBudgetFetch;}
 await database().query("update music_catalog.worker set budget_reviewed_until=now()+interval '1 hour',database_bytes_limit=1 where id=1");
 assert.equal((await ingestCatalog({maxJobs:1})).stoppedReason,'DATABASE_SIZE_LIMIT');
 await database().query("update music_catalog.worker set database_bytes_limit=300000000,daily_job_limit=1,budget_day=null,daily_job_attempts=0 where id=1");
 const concurrentBudgets=await Promise.all([reserveCollectionBudget(),reserveCollectionBudget()]);
 assert.equal(concurrentBudgets.filter(b=>b.allowed).length,1,'concurrent reservations must share one budget');
 assert.equal((await ingestCatalog({maxJobs:1})).stoppedReason,'DAILY_JOB_LIMIT');
 await database().query("update music_catalog.worker set budget_reviewed_until=now()-interval '1 second' where id=1");
 assert.equal((await reserveCollectionBudget()).reason,'USAGE_REVIEW_REQUIRED');
 await database().query("update music_catalog.worker set budget_reviewed_until=now()+interval '1 hour',daily_job_limit=6000,budget_day=current_date-1 where id=1");
 assert.equal((await reserveCollectionBudget()).allowed,true,'a new UTC day gets a fresh budget');
 await enqueueJobs([{id:'test:melon-backoff',kind:'melon_chart',payload:{year:1995},priority:0}]);
 const originalFetch=globalThis.fetch;
 globalThis.fetch=async url=>{assert.equal(new URL(url).hostname,'itunes.apple.com');return Response.json({results:[{wrapperType:'artist',artistId:1,artistName:'Singer',artistLinkUrl:'https://music.apple.com/us/artist/1'}]});};
 try{assert.equal((await ingestCatalog({maxJobs:1})).completed,1);}finally{globalThis.fetch=originalFetch;}
 assert.equal((await database().query("select state from music_catalog.jobs where id='test:melon-backoff'")).rows[0].state,'pending','cooldown skips Melon without declaring missing data');
 console.log('PostgreSQL integration passed: dates, regions, leap days, upserts, rollback, jobs, lease, RLS.');
}finally{await closeDatabase();}
