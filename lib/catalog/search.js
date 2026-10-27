import 'server-only';
import {database,catalogConfigured} from './database.js';
import {fullDate} from '../birthday-data.js';
export async function findCatalogReleases(date,region,mode){
 if(!fullDate(date)||!['kr','pop'].includes(region)||!['exact','same'].includes(mode))throw new Error('Invalid catalog search');
 const md=Number(date.slice(5,7))*100+Number(date.slice(8));
 const {rows}=await database().query(`with candidates as (select t.id,t.title,t.artist_name as artist,t.provider,t.release_date::text as date,t.cover_url as cover,t.source_url as source,a.title as album,t.popularity,
  row_number() over(partition by coalesce(t.canonical_key,t.id) order by t.popularity desc,case when a.edition='catalog' then 0 else 1 end,t.fetched_at desc,t.id) as duplicate_rank
  from music_catalog.tracks t left join music_catalog.albums a on a.id=t.album_id
  where t.region=$1 and t.review_state='accepted' and t.date_precision='day' and t.release_date<=current_date and ${mode==='exact'?'t.release_date=$2::date':'t.release_md=$3 and t.release_date<>$2::date'}
  and not exists (select 1 from music_catalog.tracks earlier where earlier.canonical_key=t.canonical_key and earlier.review_state='accepted' and earlier.date_precision='day' and earlier.release_date<t.release_date)
 ), distinct_songs as (select *,row_number() over(partition by artist order by popularity desc,date,id) as artist_rank from candidates where duplicate_rank=1)
 select id,title,artist,provider,date,cover,source,album from distinct_songs order by artist_rank,popularity desc,date,id limit 10`,mode==='exact'?[region,date]:[region,date,md]);
 return rows.map(t=>({...t,evidence:t.source,dateNote:`${t.provider==='itunes'?'Apple Music':'멜론'} 발매일 · 수집한 판본 중 가장 이른 기록`}));
}
// Do not call a sparse catalog "complete" or turn a database outage into an empty result.
export async function catalogFirstReleases(date,region,selectedMode,live,{configured=catalogConfigured(),lookup=findCatalogReleases}={}){
 if(!configured)return live(date,region,selectedMode);
 const modes=selectedMode?[selectedMode]:['exact','same'];
 const hits=await Promise.all(modes.map(async mode=>{try{return {mode,tracks:await lookup(date,region,mode)};}catch{return {mode,tracks:[],failed:true};}}));
 const missing=hits.filter(hit=>!hit.tracks.length);
 const fallback=missing.length?await live(date,region,missing.length===2?null:missing[0].mode):[];
 return hits.map(hit=>{
  if(hit.tracks.length)return {mode:hit.mode,status:'ok',tracks:hit.tracks,issues:[],limited:true,origin:'catalog'};
  const result=fallback.find(row=>row.mode===hit.mode)||{mode:hit.mode,status:'unavailable',tracks:[],issues:[{source:'music-source',code:'INVALID_RESPONSE'}]};
  if(!hit.failed)return result;
  const issues=[...(result.issues||[]),{source:'music-catalog',code:'DATABASE_UNAVAILABLE'}];
  return {...result,status:result.status==='unavailable'?'unavailable':'partial',issues};
 });
}
