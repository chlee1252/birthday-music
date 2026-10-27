import {trackQuality} from './quality.js';
import 'server-only';
import {database,transaction} from './database.js';
const fields={
 artists:['id','name','region','source_url','birthday','birthday_source','image_url'],
 albums:['id','artist_id','title','source_url','cover_url','edition'],
 tracks:['id','album_id','artist_id','title','artist_name','region','provider','release_date','release_year','release_month','date_precision','date_basis','source_url','cover_url','popularity','canonical_key','quality_flags','review_state','chart_source','first_chart_year'],
};
function updateExpression(table,column){
 const incoming=`excluded.${column}`,stored=`music_catalog.${table}.${column}`;
 if(table==='artists'&&['birthday','birthday_source','image_url'].includes(column))return `coalesce(${incoming},${stored})`;
 if(table==='tracks'&&column==='first_chart_year')return `least(${incoming},${stored})`;
 if(table==='tracks'&&column==='popularity')return `greatest(${incoming},${stored})`;
 if(table==='tracks'&&column==='chart_source')return `coalesce(${incoming},${stored})`;
 return incoming;
}
async function upsert(client,table,rows){
 if(!rows.length)return;
 const columns=fields[table];
 if(!columns)throw new Error('Invalid catalog table');
 for(const original of rows){
  const row=table==='tracks'?{...trackQuality(original),...original}:original;
  await client.query(`insert into music_catalog.${table} (${columns.join(',')}) values (${columns.map((_,i)=>'$'+(i+1)).join(',')}) on conflict(id) do update set ${columns.filter(c=>c!=='id').map(c=>`${c}=${updateExpression(table,c)}`).join(',')},fetched_at=now()`,columns.map(c=>row[c]??null));
 }
}
export async function saveCatalog({artists=[],albums=[],tracks=[]}){
 await transaction(async client=>{
  await upsert(client,'artists',artists);await upsert(client,'albums',albums);
  const checked=tracks.map(track=>({...track,...trackQuality(track,albums.find(a=>a.id===track.album_id))}));
  await upsert(client,'tracks',checked);
  if(checked.length)await client.query(`with evidence as (select canonical_key,min(first_chart_year) as year from music_catalog.tracks where canonical_key=any($1::text[]) group by canonical_key)
   update music_catalog.tracks t set first_chart_year=e.year,
   review_state=case when t.release_year>e.year then 'quarantined' else t.review_state end,
   quality_flags=case when t.release_year>e.year and not ('post_chart_release'=any(t.quality_flags)) then array_append(t.quality_flags,'post_chart_release') else t.quality_flags end
   from evidence e where t.canonical_key=e.canonical_key and e.year is not null`,[checked.map(t=>t.canonical_key)]);
 });
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
  pg_database_size(current_database())::text database_bytes,
  (select database_bytes_limit::text from music_catalog.worker where id=1) database_bytes_limit,
  (select budget_reviewed_until from music_catalog.worker where id=1) budget_reviewed_until,
  (select case when budget_day=(now() at time zone 'UTC')::date then daily_job_attempts else 0 end from music_catalog.worker where id=1) daily_job_attempts,
  (select daily_job_limit from music_catalog.worker where id=1) daily_job_limit,
  (select coalesce(sum(pg_total_relation_size(c.oid)),0)::bigint::text from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='music_catalog' and c.relkind='r') bytes`);
 return rows[0];
}
