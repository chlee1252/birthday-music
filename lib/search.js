import {parseDate,selectTracks,tracks} from './catalog.js';
import {isApprovedKoreanRecording} from './music-policy.js';
export const modes={all:'모두',exact:'그날 발매',birthday:'같은 생일의 가수',year:'그해의 음악',same:'다른 해, 같은 날',ten:'10년 전',twenty:'20년 전'};
export function readSearch(params){
 const raw=typeof params.date==='string'?params.date:'';
 const date=parseDate(raw);
 return {date,raw,invalid:!!raw&&!date,mode:Object.hasOwn(modes,params.mode)?params.mode:'all',region:['kr','global'].includes(params.region)?params.region:'all',baseline:params.baseline==='today'?'today':'birthday'};
}
export function queryTarget({date,mode,baseline},today=new Date()){
 if(!date||['birthday','same'].includes(mode))return null;
 if(mode==='exact')return date;
 const year=baseline==='today'?today.getFullYear():+date.slice(0,4);
 return String(mode==='ten'?year-10:mode==='twenty'?year-20:date.slice(0,4));
}
export function resultsFor(search, extra=[]){
 // Overseas tracks must be selected in our own catalog; API results cannot opt in.
 const selected=tracks.filter(t=>t.region==='kr'||(t.region==='global'&&t.featured===true));
 const known=new Set(selected.map(t=>`${t.title.toLowerCase()}|${t.artist.toLowerCase()}`));
 const merged=[...selected];
 for(const t of extra){
  if(!isApprovedKoreanRecording(t))continue;
  const key=`${t.title.toLowerCase()}|${t.artist.toLowerCase()}`;
  if(!known.has(key)){merged.push(t);known.add(key);}
 }
 return selectTracks(search.date,search.mode,merged,search.baseline)
  .filter(t=>search.region==='all'||t.region===search.region)
  .sort((a,b)=>Number(a.region!=='kr')-Number(b.region!=='kr'));
}
export function searchUrl(search,patch={}){const s={...search,...patch};const p=new URLSearchParams({date:s.date,mode:s.mode,region:s.region,baseline:s.baseline});return '/?'+p.toString()+'#results';}
