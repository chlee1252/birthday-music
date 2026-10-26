import {migrateCatalog} from '../lib/catalog/migrate.js';
// Copy this app's pilot catalog into Supabase, without exporting credentials or raw responses.
import pg from 'pg';
import {readFile} from 'node:fs/promises';
import {database,closeDatabase} from '../lib/catalog/database.js';
const sourceUrl=process.env.MUSIC_CATALOG_SOURCE_URL;
if(!sourceUrl||!process.env.MUSIC_DATABASE_URL||sourceUrl===process.env.MUSIC_DATABASE_URL)throw new Error('Set distinct MUSIC_CATALOG_SOURCE_URL and MUSIC_DATABASE_URL');
const source=new pg.Pool({connectionString:sourceUrl,max:1,connectionTimeoutMillis:5000,types:{getTypeParser:(oid,format)=>oid===1082?value=>value:pg.types.getTypeParser(oid,format)}});
try{
 await migrateCatalog();
 for(const table of ['artists','albums','tracks','jobs']){
  const {rows:columns}=await source.query("select column_name from information_schema.columns where table_schema='music_catalog' and table_name=$1 and is_generated='NEVER' order by ordinal_position",[table]);
  // Column names come from our migration, never from request input.
  const names=columns.map(c=>'"'+c.column_name.replaceAll('"','""')+'"').join(',');
  let cursor='',count=0;
  while(true){
   const {rows}=await source.query(`select ${names} from music_catalog.${table} where id>$1 order by id limit 100`,[cursor]);
   if(!rows.length)break;
   const updates=columns.filter(c=>c.column_name!=='id').map(c=>`"${c.column_name}"=excluded."${c.column_name}"`).join(',');
   const timestamp=table==='jobs'?'updated_at':'fetched_at';
   await database().query(`insert into music_catalog.${table} (${names}) select ${names} from jsonb_populate_recordset(null::music_catalog.${table},$1::jsonb) on conflict(id) do update set ${updates} where excluded.${timestamp}>=music_catalog.${table}.${timestamp}`,[JSON.stringify(rows)]);
   cursor=rows.at(-1).id;count+=rows.length;
  }
  console.log(`${table}: ${count} rows processed (newer destination records preserved)`);
 }
 const {rows:charts}=await source.query('select * from music_catalog.chart_entries order by year,region,rank');
 for(let offset=0;offset<charts.length;offset+=100)await database().query(`insert into music_catalog.chart_entries select * from jsonb_populate_recordset(null::music_catalog.chart_entries,$1::jsonb)
 on conflict(year,region,rank) do update set track_id=excluded.track_id,title=excluded.title,artist_name=excluded.artist_name,source_url=excluded.source_url,fetched_at=excluded.fetched_at where excluded.fetched_at>=music_catalog.chart_entries.fetched_at`,[JSON.stringify(charts.slice(offset,offset+100))]);
 console.log(`chart_entries: ${charts.length} rows processed`);
}catch(error){console.error(error.code||'Catalog transfer failed');process.exitCode=1;}
finally{await source.end();await closeDatabase();}
