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
 if(command==='migrate'){
  await database().query(await readFile(new URL('../supabase/migrations/202610260001_music_catalog.sql',import.meta.url),'utf8'));
  console.log('Catalog schema ready');
 }else if(command==='seed'){
  await enqueueJobs(initialJobs({artistLimit:positive(values.artists)}));console.log(await catalogStats());
 }else if(command==='ingest'){
  console.log(await ingestCatalog({maxJobs:positive(values.jobs),budgetMs:positive(values.seconds)*1000,targetTracks:values.target?positive(values.target):Infinity,onProgress:progress=>console.log(JSON.stringify(progress))}));
 }else if(command==='stats')console.log(await catalogStats());
 else throw new Error('Usage: npm run catalog -- migrate|seed|ingest|stats [--jobs 20 --seconds 50 --target 1000 --artists 40]');
}catch(error){console.error(error.code||'Catalog command failed; check the database configuration and command arguments.');process.exitCode=1;}
finally{await closeDatabase();}
