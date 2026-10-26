import 'server-only';
import {database,transaction} from './database.js';
import {albumEdition,trackQuality} from './quality.js';
export async function reindexCatalog(){
 await database().query(`with best as (select distinct on(track_id) track_id,rank,source_url from music_catalog.chart_entries order by track_id,rank,year desc)
 update music_catalog.tracks t set popularity=greatest(t.popularity,1000-best.rank),chart_source=best.source_url from best where t.id=best.track_id`);
 await database().query(`update music_catalog.tracks t set first_chart_year=c.year from (select track_id,min(year) as year from music_catalog.chart_entries group by track_id) c where t.id=c.track_id`);
 // Transfer chronology evidence across providers for an exactly matching normalized song/artist.
 await database().query(`with years as(select canonical_key,min(first_chart_year) as year from music_catalog.tracks where canonical_key is not null group by canonical_key)
 update music_catalog.tracks t set first_chart_year=y.year from years y where t.canonical_key=y.canonical_key and y.year is not null`);
 const albums=(await database().query('select id,title from music_catalog.albums')).rows;
 for(const album of albums)await database().query('update music_catalog.albums set edition=$2 where id=$1',[album.id,albumEdition(album.title)]);
 let cursor='',updated=0;
 while(true){
  const {rows}=await database().query('select t.*,t.release_date::text as release_date,a.edition from music_catalog.tracks t left join music_catalog.albums a on a.id=t.album_id where t.id>$1 order by t.id limit 200',[cursor]);
  if(!rows.length)break;
  await transaction(async client=>{for(const row of rows){const q=trackQuality(row,{edition:row.edition});await client.query('update music_catalog.tracks set canonical_key=$2,quality_flags=$3,review_state=$4 where id=$1',[row.id,q.canonical_key,q.quality_flags,q.review_state]);}});
  updated+=rows.length;cursor=rows.at(-1).id;
 }
 return {reindexed:updated};
}
export async function auditCatalog(){
 const db=database();
 const regions=(await db.query(`with eligible as (select t.* from music_catalog.tracks t where t.review_state='accepted' and t.date_precision='day' and t.release_date<=current_date
  and not exists(select 1 from music_catalog.tracks e where e.canonical_key=t.canonical_key and e.review_state='accepted' and e.date_precision='day' and e.release_date<t.release_date))
 select region,count(*)::int records,count(distinct canonical_key)::int songs,
  count(distinct artist_id)::int artist_credits,
  count(*) filter(where date_precision='day')::int dated,
  count(*) filter(where review_state='quarantined')::int quarantined,
  count(*) filter(where cover_url is not null)::int with_cover,
  (select count(distinct e.release_md)::int from eligible e where e.region=t.region) covered_month_days,
  (select count(distinct e.canonical_key)::int from eligible e where e.region=t.region) searchable_songs,
  min(release_year) as oldest_year,max(release_year) as newest_year
  from music_catalog.tracks t group by region order by region`)).rows;
 const charts=(await db.query(`select e.year,e.region,count(*)::int chart_songs,count(t.id)::int indexed,
  count(*) filter(where t.review_state='accepted' and t.date_precision='day')::int usable_dates
  from music_catalog.chart_entries e left join music_catalog.tracks t on t.id=e.track_id group by e.year,e.region order by e.year,e.region`)).rows;
 const failures=(await db.query("select kind,last_error,count(*)::int jobs from music_catalog.jobs where state='failed' group by kind,last_error order by kind,last_error")).rows;
 const flags=(await db.query('select unnest(quality_flags) as flag,count(*)::int records from music_catalog.tracks group by flag order by flag')).rows;
 const conflicts=(await db.query(`select count(*)::int groups from (select canonical_key from music_catalog.tracks where canonical_key is not null and date_precision='day' group by canonical_key having count(distinct provider)>1 and count(distinct release_date)>1) c`)).rows[0].groups;
 return {generatedAt:new Date().toISOString(),regions,charts,flags,failures,crossProviderDateConflicts:conflicts};
}
