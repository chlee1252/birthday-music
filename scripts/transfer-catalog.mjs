// Copy this app's pilot catalog into Supabase, without exporting credentials or raw responses.
import pg from 'pg';
import {readFile} from 'node:fs/promises';
import {database,closeDatabase} from '../lib/catalog/database.js';
const sourceUrl=process.env.MUSIC_CATALOG_SOURCE_URL;
if(!sourceUrl||!process.env.MUSIC_DATABASE_URL||sourceUrl===process.env.MUSIC_DATABASE_URL)throw new Error('Set distinct MUSIC_CATALOG_SOURCE_URL and MUSIC_DATABASE_URL');
const source=new pg.Pool({connectionString:sourceUrl,max:1,connectionTimeoutMillis:5000,types:{getTypeParser:(oid,format)=>oid===1082?value=>value:pg.types.getTypeParser(oid,format)}});
try{
 await database().query(await readFile(new URL('../supabase/migrations/202610260001_music_catalog.sql',import.meta.url),'utf8'));
 for(const table of ['artists','albums','tracks','jobs']){
  const {rows:columns}=await source.query("select column_name from information_schema.columns where table_schema='music_catalog' and table_name=$1 and is_generated='NEVER' order by ordinal_position",[table]);
  // Column names come from our migration, never from request input.
  const names=columns.map(c=>'"'+c.column_name.replaceAll('"','""')+'"').join(',');
  let cursor='',count=0;
  while(true){
   const {rows}=await source.query(`select ${names} from music_catalog.${table} where id>$1 order by id limit 100`,[cursor]);
   if(!rows.length)break;
   await database().query(`insert into music_catalog.${table} (${names}) select ${names} from jsonb_populate_recordset(null::music_catalog.${table},$1::jsonb) on conflict(id) do nothing`,[JSON.stringify(rows)]);
   cursor=rows.at(-1).id;count+=rows.length;
  }
  console.log(`${table}: ${count} rows processed (existing IDs preserved)`);
 }
}catch(error){console.error(error.code||'Catalog transfer failed');process.exitCode=1;}
finally{await source.end();await closeDatabase();}
