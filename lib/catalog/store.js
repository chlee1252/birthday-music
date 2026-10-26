import 'server-only';
import {database,transaction} from './database.js';
const fields={
 artists:['id','name','region','source_url','birthday','birthday_source','image_url'],
 albums:['id','artist_id','title','source_url','cover_url','edition'],
 tracks:['id','album_id','artist_id','title','artist_name','region','provider','release_date','release_year','release_month','date_precision','date_basis','source_url','cover_url','popularity'],
};
async function upsert(client,table,rows){
 if(!rows.length)return;
 const columns=fields[table];
 if(!columns)throw new Error('Invalid catalog table');
 for(const row of rows){
  await client.query(`insert into music_catalog.${table} (${columns.join(',')}) values (${columns.map((_,i)=>'$'+(i+1)).join(',')}) on conflict(id) do update set ${columns.filter(c=>c!=='id').map(c=>`${c}=${table==='artists'&&['birthday','birthday_source','image_url'].includes(c)?`coalesce(excluded.${c},music_catalog.${table}.${c})`:`excluded.${c}`}`).join(',')},fetched_at=now()`,columns.map(c=>row[c]??null));
 }
}
export async function saveCatalog({artists=[],albums=[],tracks=[]}){
 await transaction(async client=>{await upsert(client,'artists',artists);await upsert(client,'albums',albums);await upsert(client,'tracks',tracks);});
}
export async function enqueueJobs(jobs){
 for(const job of jobs)await database().query('insert into music_catalog.jobs(id,kind,payload,priority) values($1,$2,$3,$4) on conflict(id) do update set payload=excluded.payload,priority=excluded.priority,next_run=case when music_catalog.jobs.payload is distinct from excluded.payload then now() else music_catalog.jobs.next_run end',[job.id,job.kind,job.payload,job.priority??100]);
}
export async function catalogStats(){
 const {rows}=await database().query(`select
  (select count(*)::int from music_catalog.artists) artists,
  (select count(*)::int from music_catalog.albums) albums,
  (select count(*)::int from music_catalog.tracks) tracks,
  (select count(distinct (lower(title),lower(artist_name)))::int from music_catalog.tracks) unique_titles,
  (select count(*)::int from music_catalog.tracks where date_precision='day') dated_tracks,
  (select count(*)::int from music_catalog.jobs where state='pending') pending_jobs,
  (select count(*)::int from music_catalog.jobs where state='failed') failed_jobs,
  (select coalesce(sum(pg_total_relation_size(c.oid)),0)::bigint::text from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='music_catalog' and c.relkind='r') bytes`);
 return rows[0];
}
