import 'server-only';
import {database,catalogConfigured} from './database.js';
import {fullDate,uniqueTracks} from '../birthday-data.js';
export async function findCatalogReleases(date,region,mode){
 if(!fullDate(date)||!['kr','pop'].includes(region)||!['exact','same'].includes(mode))throw new Error('Invalid catalog search');
 const md=Number(date.slice(5,7))*100+Number(date.slice(8));
 const {rows}=await database().query(`select t.id,t.title,t.artist_name as artist,t.provider,t.release_date::text as date,t.cover_url as cover,t.source_url as source,a.title as album
  from music_catalog.tracks t left join music_catalog.albums a on a.id=t.album_id
  where t.region=$1 and t.date_precision='day' and t.release_date<=current_date and ${mode==='exact'?'t.release_date=$2::date':'t.release_md=$3 and t.release_date<>$2::date'}
  order by t.popularity desc,t.release_date,t.id limit 100`,mode==='exact'?[region,date]:[region,date,md]);
 return uniqueTracks(rows.map(t=>({...t,evidence:t.source,dateNote:t.provider==='itunes'?'Apple Music 수록 앨범 발매일 기준':'멜론 수록 앨범 발매일 기준'})));
}
// Do not call a sparse catalog "complete" or turn a database outage into an empty result.
export async function catalogFirstReleases(date,region,selectedMode,live,{configured=catalogConfigured(),lookup=findCatalogReleases}={}){
 if(!configured)return live(date,region,selectedMode);
 const modes=selectedMode?[selectedMode]:['exact','same'];
 const hits=await Promise.all(modes.map(async mode=>{try{return {mode,tracks:await lookup(date,region,mode)};}catch{return {mode,tracks:[],failed:true};}}));
 return Promise.all(hits.map(async hit=>{
  if(hit.tracks.length)return {mode:hit.mode,status:'ok',tracks:hit.tracks,issues:[],limited:true,origin:'catalog'};
  const [result]=await live(date,region,hit.mode);
  if(!hit.failed)return result;
  const issues=[...(result.issues||[]),{source:'music-catalog',code:'DATABASE_UNAVAILABLE'}];
  return {...result,status:result.status==='unavailable'?'unavailable':'partial',issues};
 }));
}
