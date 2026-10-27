import 'server-only';
import {randomUUID,createHash} from 'node:crypto';
import {load} from 'cheerio';
import {database} from './database.js';
import {reserveCollectionBudget} from './budget.js';
import {saveCatalog,enqueueJobs,catalogStats} from './store.js';
import {appleArtist,appleAlbum,appleTrack,releaseDateParts} from './normalize.js';
import {sourceRequest} from '../source-request.js';
import {parseChart,chartUrl} from '../charts.js';
import {parseSongDetail,normalizedName} from '../birthday-data.js';
const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function melonRequest(url){
 return sourceRequest(url,{timeout:8000,retryTimeout:false,beforeAttempt:async()=>{
  const {rows}=await database().query(`update music_catalog.worker set melon_next_at=greatest(now(),melon_next_at)+interval '1 second' where id=1 returning greatest(0,extract(epoch from (melon_next_at-now()-interval '1 second'))*1000)::int as wait_ms`);
  await pause(rows[0].wait_ms);
 }});
}
async function appleRequest(params){
 const url=new URL(params.id?'https://itunes.apple.com/lookup':'https://itunes.apple.com/search');
 url.search=new URLSearchParams({country:'US',...params});
 const data=await sourceRequest(url,{json:true,timeout:7000,retryTimeout:false,beforeAttempt:async()=>{
  // A durable slot prevents two ingestion processes exceeding Apple's request rate.
  const {rows}=await database().query(`update music_catalog.worker set apple_next_at=greatest(now(),apple_next_at)+interval '3.2 seconds' where id=1 returning greatest(0,extract(epoch from (apple_next_at-now()-interval '3.2 seconds'))*1000)::int as wait_ms`);
  await pause(rows[0].wait_ms);
 }});
 if(!Array.isArray(data.results))throw new Error('INVALID_APPLE_RESPONSE');
 return data.results;
}
async function runJob(job){
 const p=job.payload;
 if(job.kind==='apple_artist'){
  const artist=appleArtist(await appleRequest(p.verified?{id:String(p.verified.id)}:{term:p.name,entity:'musicArtist',attribute:'artistTerm',limit:'25'}),p.name,p.region,p.verified?.id);
  await saveCatalog({artists:[artist]});
  await enqueueJobs([{id:`apple:albums:${artist.id}`,kind:'apple_albums',payload:{artist},priority:20}]);
 }else if(job.kind==='apple_albums'){
  const rows=await appleRequest({id:p.artist.id.split(':')[1],entity:'album',limit:'200'});
  const albums=[...new Map(rows.map(r=>appleAlbum(r,p.artist)).filter(Boolean).map(a=>[a.id,a])).values()];
  if(!albums.length)throw new Error('NO_ALBUMS_RETURNED');
  await saveCatalog({artists:[p.artist],albums});
  await enqueueJobs(albums.map(album=>({id:`apple:tracks:${album.id}`,kind:'apple_tracks',payload:{album,artist:p.artist},priority:album.edition==='catalog'?32:album.edition==='tribute'?90:60})));
 }else if(job.kind==='apple_tracks'){
  const rows=await appleRequest({id:p.album.id.split(':')[1],entity:'song',limit:'200'});
  const tracks=rows.map(r=>appleTrack(r,p.album,p.artist)).filter(Boolean);
  if(!tracks.length)throw new Error('NO_TRACKS_RETURNED');
  await saveCatalog({artists:[p.artist],albums:[p.album],tracks});
 }else if(job.kind==='melon_chart'){
  const url='https://www.melon.com/chart/age/list.htm?'+new URLSearchParams({idx:'1',chartType:'YE',chartGenre:p.region==='pop'?'POP':'KPOP',chartDate:String(p.year),moved:'Y'});
  const tracks=parseChart(await melonRequest(url),100);
  if(!tracks.length)throw new Error('NO_CHART_RETURNED');
  for(const track of tracks)await database().query('insert into music_catalog.chart_entries(year,region,rank,track_id,title,artist_name,source_url) values($1,$2,$3,$4,$5,$6,$7) on conflict(year,region,rank) do update set track_id=excluded.track_id,title=excluded.title,artist_name=excluded.artist_name,source_url=excluded.source_url,fetched_at=now()',[p.year,p.region||'kr',track.rank,`melon:${track.id}`,track.title,track.artist,chartUrl(p.year,p.region==='pop'?'POP':'KPOP')]);
  await enqueueJobs(tracks.map(track=>({id:`melon:track:${track.id}`,kind:'melon_track',payload:{track,region:p.region||'kr',chart:chartUrl(p.year,p.region==='pop'?'POP':'KPOP')},priority:(p.region==='pop'?40:25)+Math.floor(track.rank/20)})));
 }else if(job.kind==='melon_track'){
  const t=p.track,html=await melonRequest(t.source),$=load(html),info=parseSongDetail(html);
  const rawDate=$('.section_info dt').filter((_,el)=>$(el).text().trim()==='발매일').next('dd').first().text().trim();
  if(!rawDate)throw new Error('INVALID_MELON_DETAIL');
  const firstChart=(await database().query('select min(year) as year from music_catalog.chart_entries where track_id=$1',[`melon:${t.id}`])).rows[0].year;
  // A chart credit can be a collaboration. It is not sufficient evidence for a birthday identity.
  const artist={id:'melon-credit:'+createHash('sha256').update(normalizedName(t.artist)).digest('hex').slice(0,24),name:t.artist,region:p.region||'kr',source_url:t.source};
  await saveCatalog({artists:[artist],tracks:[{id:`melon:${t.id}`,artist_id:artist.id,title:t.title,artist_name:t.artist,region:p.region||'kr',provider:'melon',...releaseDateParts(rawDate),date_basis:'album',source_url:t.source,cover_url:info.cover||t.cover,popularity:1000-t.rank,chart_source:p.chart,first_chart_year:firstChart}]});
  await pause(200);
 }else throw new Error('UNKNOWN_JOB_KIND');
}
export async function ingestCatalog({maxJobs=20,budgetMs=50000,targetTracks=Infinity,onProgress=()=>{}}={}){
 const token=randomUUID(),start=Date.now();
 const lock=await database().query(`update music_catalog.worker set lease_token=$1,lease_until=now()+interval '90 seconds' where id=1 and (lease_until is null or lease_until<now()) returning id`,[token]);
 if(!lock.rowCount)return {busy:true,completed:0,failed:0};
 let completed=0,failed=0,stoppedReason=null;
 try{
  for(let i=0;i<maxJobs&&Date.now()-start<budgetMs;i++){
   if(targetTracks!==Infinity&&(await catalogStats()).unique_titles>=targetTracks)break;
   const lease=await database().query(`update music_catalog.worker set lease_until=now()+interval '90 seconds' where id=1 and lease_token=$1 returning id`,[token]);
   if(!lease.rowCount)break;
   const {rows}=await database().query(`select * from music_catalog.jobs where next_run<=now() and (kind not like 'melon_%' or not exists(select 1 from music_catalog.worker where id=1 and melon_retry_at>now())) order by priority,case when kind='apple_tracks' then (select count(*) from music_catalog.tracks t where t.artist_id=jobs.payload->'artist'->>'id') else 0 end,updated_at,id limit 1`);
   const job=rows[0];if(!job)break;
   const budget=await reserveCollectionBudget();
   if(!budget.allowed){stoppedReason=budget.reason;break;}
   try{
    await runJob(job);
    if(job.kind.startsWith('melon_'))await database().query('update music_catalog.worker set melon_failures=0,melon_retry_at=null where id=1');
    await database().query(`update music_catalog.jobs set state='done',attempts=0,last_error=null,updated_at=now(),next_run=now()+interval '30 days' where id=$1`,[job.id]);
    completed++;onProgress({job:job.id,state:'done'});
   }catch(error){
    const code=/^[A-Z_0-9]+$/.test(error.code||error.message)?(error.code||error.message):'INGEST_FAILED';
    if(job.kind.startsWith('melon_')&&['TIMEOUT','NETWORK','HTTP_429','HTTP_403','HTTP_406','HTTP_503'].includes(code))await database().query(`update music_catalog.worker set melon_failures=melon_failures+1,melon_retry_at=case when melon_failures>=2 then now()+interval '5 minutes' else melon_retry_at end where id=1`);
    await database().query(`update music_catalog.jobs set state='failed',attempts=attempts+1,last_error=$2,updated_at=now(),next_run=now()+least(interval '1 day',interval '5 minutes'*power(2,least(attempts,8))) where id=$1`,[job.id,code]);
    failed++;onProgress({job:job.id,state:'failed',code});
   }
  }
  return {completed,failed,stoppedReason,elapsedMs:Date.now()-start,...await catalogStats()};
 }finally{await database().query('update music_catalog.worker set lease_token=null,lease_until=null where id=1 and lease_token=$1',[token]);}
}
