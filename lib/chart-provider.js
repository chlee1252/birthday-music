import 'server-only';
import {sourceRequest,sourceIssue} from './source-request.js';
import {parseChart,chartUrl} from './charts.js';
const state=globalThis.__birthdayChartsV2??={cache:new Map(),pending:new Map()};
export async function getChartArchive(year,genre='KPOP') {
 const source=chartUrl(year,genre),empty={tracks:[],source};
 if(!Number.isInteger(year)||year<1955||year>=new Date().getFullYear()||!['KPOP','POP'].includes(genre))return {...empty,status:'unsupported'};
 const key=`${year}:${genre}`,cached=state.cache.get(key);
 if(cached?.expires>Date.now())return cached.value;
 if(state.pending.has(key))return state.pending.get(key);
 const task=(async()=>{
  let value;
  try {
   const url=new URL('https://www.melon.com/chart/age/list.htm');
   url.search=new URLSearchParams({idx:'1',chartType:'YE',chartGenre:genre,chartDate:String(year),moved:'Y'});
   const html=await sourceRequest(url,{timeout:10000});
   if(html.length>2000000)throw new Error('Unexpected chart size');
   const tracks=parseChart(html,100);
   // Empty responses can also be upstream markup changes: never substitute another year.
   value={tracks,source,status:tracks.length?'ok':'empty'};
  }catch(error){value={...empty,status:'unavailable',issues:[sourceIssue(error)]};}
  if(state.cache.size>=300)state.cache.delete(state.cache.keys().next().value);
  state.cache.set(key,{value,expires:Date.now()+(value.status==='ok'?86400000:15000)});
  return value;
 })();
 state.pending.set(key,task);
 try{return await task;}finally{state.pending.delete(key);}
}

export async function getChart(year,genre='KPOP'){const result=await getChartArchive(year,genre);return {...result,tracks:result.tracks.slice(0,10)};}
