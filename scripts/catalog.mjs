import {auditCatalog,reindexCatalog} from '../lib/catalog/audit.js';
import {migrateCatalog} from '../lib/catalog/migrate.js';
import {readFile} from 'node:fs/promises';
import {parseArgs} from 'node:util';
import {database,closeDatabase} from '../lib/catalog/database.js';
import {enqueueJobs,catalogStats} from '../lib/catalog/store.js';
import {initialJobs} from '../lib/catalog/seeds.js';
import {ingestCatalog} from '../lib/catalog/ingest.js';
const {positionals,values}=parseArgs({allowPositionals:true,options:{jobs:{type:'string',default:'20'},seconds:{type:'string',default:'50'},target:{type:'string'},artists:{type:'string',default:'40'}}});
function positive(value){const number=Number(value);if(!Number.isInteger(number)||number<1)throw new Error('Options must be positive integers');return number;}
try{
 const command=positionals[0];
 const target=new URL(process.env.MUSIC_DATABASE_URL||'postgresql://unconfigured');
 if(process.env.npm_lifecycle_event==='catalog:supabase'&&!target.hostname.endsWith('.supabase.com')&&!target.hostname.endsWith('.supabase.co'))throw new Error('SUPABASE_TARGET_REQUIRED');
 if(command==='ingest')console.log(JSON.stringify({event:'catalog_target',host:target.hostname,database:target.pathname}));
 if(command==='migrate'){
  await migrateCatalog();
  console.log('Catalog schema ready');
 }else if(command==='seed'){
  await enqueueJobs(initialJobs({artistLimit:positive(values.artists)}));console.log(await catalogStats());
 }else if(command==='ingest'){
  console.log(await ingestCatalog({maxJobs:positive(values.jobs),budgetMs:positive(values.seconds)*1000,targetTracks:values.target?positive(values.target):Infinity,onProgress:progress=>console.log(JSON.stringify({...progress,at:new Date().toISOString()}))}));
 }else if(command==='audit')console.log(JSON.stringify(await auditCatalog(),null,2));
 else if(command==='reindex')console.log(await reindexCatalog());
 else if(command==='stats')console.log(await catalogStats());
 else throw new Error('Usage: npm run catalog -- migrate|seed|ingest|stats [--jobs 20 --seconds 50 --target 1000 --artists 40]');
}catch(error){console.error(error.code||'Catalog command failed; check the database configuration and command arguments.');process.exitCode=1;}
finally{await closeDatabase();}
