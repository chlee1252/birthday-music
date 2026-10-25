import 'server-only';
import {persistentMusic} from './server-cache.js';
import {fallbackRelease,fallbackArtist} from './itunes-provider.js';
import {sourceRequest,sourceIssue,uniqueIssues} from './source-request.js';
import {getChartArchive} from './chart-provider.js';
import {normalizedName,artistSearchName} from './birthday-data.js';
import {parseAlbumSearch,parseSongSearch,parseSongDetail,parseArtistBirthday,sameArtist,matchesDate,fullDate,uniqueTracks} from './birthday-data.js';
const state=globalThis.__birthdayConnections??={cache:new Map(),pending:new Map(),mbTail:Promise.resolve(),mbLast:0};
async function cached(key,task){
 const hit=state.cache.get(key);if(hit?.expires>Date.now())return hit.value;
 if(state.pending.has(key))return state.pending.get(key);
 const pending=persistentMusic(key,task).then(value=>{if(state.cache.size>=600)state.cache.delete(state.cache.keys().next().value);state.cache.set(key,{value,expires:Date.now()+(value.issues?.length?15000:86400000)});return value;});
 state.pending.set(key,pending);try{return await pending;}finally{state.pending.delete(key);}
}
async function request(url,json=false,timeout=json?25000:8000,options={}){
 return sourceRequest(url,{json,timeout,...options});
}
async function queryWikidata(query){
 const data=await request('https://query.wikidata.org/sparql?format=json',true,10000,{retryTimeout:false,method:'POST',body:new URLSearchParams({query,format:'json'})});
 if(!Array.isArray(data.results?.bindings))throw new Error('Invalid Wikidata response');
 return data.results.bindings;
}
async function mapLimited(items,fn,concurrency=3){
 let next=0;const results=new Array(items.length);
 await Promise.all(Array.from({length:Math.min(concurrency,items.length)},async()=>{while(next<items.length){const i=next++;try{results[i]={value:await fn(items[i])};}catch(error){results[i]={error:sourceIssue(error)};}}}));return results;
}
function dayParts(date){if(!fullDate(date))throw new Error('Invalid birthday');return [+date.slice(5,7),+date.slice(8,10)];}
function dateValues(date,from=1900,to=new Date().getFullYear()){
 return Array.from({length:to-from+1},(_,i)=>`${from+i}-${date.slice(5)}`).filter(fullDate).map(d=>`"${d}T00:00:00Z"^^xsd:dateTime`).join(' ');
}
async function releaseCandidates(date,region){
 const [month,day]=dayParts(date);
 return cached(`releases:${region}:${month}-${day}`,()=>queryWikidata(`SELECT DISTINCT ?item ?itemLabel ?date ?artist ?artistLabel ?links WHERE {
 { SELECT DISTINCT ?item ?date ?artist ?links WHERE {
 ${date.endsWith('-01-01')?'':'VALUES ?date { '+dateValues(date)+' }'}
 ?item ${date.endsWith('-01-01')?'':'wdt:P577 ?date; '}p:P577/psv:P577 ?time; wdt:P175 ?artist; wikibase:sitelinks ?links.
 ?time wikibase:timeValue ?date; wikibase:timePrecision ?precision.
 FILTER(?precision >= 11 && MONTH(?date)=${month} && DAY(?date)=${day})
 ${region==='pop'?`?artist (wdt:P27|wdt:P495) ?country; wikibase:sitelinks ?artistLinks.
 VALUES ?country { wd:Q30 wd:Q145 wd:Q16 wd:Q408 wd:Q27 wd:Q664 }
 FILTER(?artistLinks >= 50 && ?links >= 5)`:'{ ?artist wdt:P27 wd:Q884 } UNION { ?artist wdt:P495 wd:Q884 }'}
 } ORDER BY DESC(?links) LIMIT 80 }
 SERVICE wikibase:label { bd:serviceParam wikibase:language "${region==='pop'?'en,ko':'ko,en'}". }
 } ORDER BY DESC(?links) LIMIT 80`));
}
async function addArtistAliases(candidates){
 const ids=[...new Set(candidates.map(c=>c.artist?.value?.match(/Q[0-9]+$/)?.[0]).filter(Boolean))];
 if(!ids.length)return candidates;
 const data=await cached(`aliases:${ids.sort().join('|')}`,()=>request('https://www.wikidata.org/w/api.php?'+new URLSearchParams({action:'wbgetentities',ids:ids.join('|'),props:'labels|aliases',languages:'ko|en',format:'json'}),true));
 return candidates.map(c=>{const id=c.artist?.value?.match(/Q[0-9]+$/)?.[0],entity=data.entities?.[id];
  const names=[c.artistLabel.value,...Object.values(entity?.labels||{}).map(v=>v.value),...Object.values(entity?.aliases||{}).flat().map(v=>v.value)];
  return {...c,artistNames:names};
 });
}
async function melonAlbumSongs(candidate){
 const title=candidate.itemLabel.value,artist=candidate.artistLabel.value,date=fullDate(candidate.date.value);
 const names=candidate.artistNames||[artist];
 const annotate=t=>({...t,evidence:candidate.item.value.replace('http:','https:'),connection:`발매일 · ${t.date.replaceAll('-','.')}`,dateNote:'멜론 수록 앨범 발매일 기준'});
 try{
  const html=await cached(`album-search:${title}`,()=>request('https://www.melon.com/search/album/index.htm?section=all&q='+encodeURIComponent(title)));
  return {tracks:parseAlbumSearch(html).filter(t=>t.date===date&&t.artists.some(a=>names.some(name=>sameArtist(a,name)))).map(annotate),issues:[]};
 }catch(error){
  // Melon's album tab currently returns its missing-page HTML with HTTP 406.
  // The public song search offers an album-name filter and verified song details.
  if(!['HTTP_406','HTTP_404'].includes(error.code))throw error;
 }
 const html=await cached(`album-song-search:${title}`,()=>request('https://www.melon.com/search/song/index.htm?section=album&sort=hit&q='+encodeURIComponent(title)));
 const songs=parseSongSearch(html).filter(t=>t.albumId&&t.artists.some(a=>names.some(name=>sameArtist(a.name,name))));
 const representatives=songs.filter((song,i)=>songs.findIndex(s=>s.albumId===song.albumId)===i).slice(0,4);
 const results=await mapLimited(representatives,async song=>{
  const info=await cached(`song:${song.id}`,async()=>parseSongDetail(await request(song.source)));
  if(!info.date){const error=new Error('Missing release date');error.source='www.melon.com';error.code='INVALID_RESPONSE';throw error;}
  return info.date===date?annotate({...song,...info}):null;
 },2);
 return {tracks:results.flatMap(r=>r.value?[r.value]:[]),issues:results.flatMap(r=>r.error?[r.error]:[])};
}
async function albumSongs(candidate,budget){
 let primary;
 try{primary=await melonAlbumSongs(candidate);if(!primary.issues.length)return primary;}
 catch(error){primary={tracks:[],issues:[sourceIssue(error)]};}
 if(budget.remaining--<=0)return {...primary,limited:true};
 try{
  const tracks=await fallbackRelease(candidate);
  if(tracks.length)return {tracks:uniqueTracks([...primary.tracks,...tracks]),issues:[]};
  return primary;
 }catch(error){return {...primary,issues:uniqueIssues([...primary.issues,sourceIssue(error)])};}
}
async function exactCandidates(date){
 return cached(`exact:${date}`,async()=>{
  const query=`date:${date} AND country:KR AND status:official AND lang:kor`;
  const work=state.mbTail.then(async()=>{
   const delay=1100-(Date.now()-state.mbLast);if(delay>0)await new Promise(resolve=>setTimeout(resolve,delay));
   state.mbLast=Date.now();
   return request(`https://musicbrainz.org/ws/2/release/?fmt=json&limit=100&query=${encodeURIComponent(query)}`,true,8000);
  });
  state.mbTail=work.catch(()=>{});
  const data=await work;
  if(!Array.isArray(data.releases))throw new Error('Invalid release response');
  return data.releases.filter(r=>r.date===date).map(r=>({item:{value:`https://musicbrainz.org/release/${r.id}`},itemLabel:{value:r.title},artistLabel:{value:r['artist-credit']?.[0]?.artist?.name||''},date:{value:date}}));
 });
}
export async function getReleaseConnections(date,region='kr'){
 const budget={remaining:8};
 const [wd,mb]=await Promise.allSettled([
  releaseCandidates(date,region).then(async candidates=>{try{return {candidates:await addArtistAliases(candidates),issues:[]};}catch(error){return {candidates,issues:[sourceIssue(error)]};}}),
  region==='kr'?exactCandidates(date):Promise.resolve([])
 ]);
 const today=new Date().toISOString().slice(0,10);
 const valid=(wd.status==='fulfilled'?wd.value.candidates:[]).filter(c=>fullDate(c.date?.value)&&c.date.value.slice(0,10)<=today&&c.date.value.slice(5,10)===date.slice(5));
 const exact=[...valid.filter(c=>c.date.value.slice(0,10)===date),...(mb.status==='fulfilled'?mb.value:[])];
 const same=valid.filter(c=>c.date.value.slice(0,10)!==date);
 return Promise.all([exact,same].map(async(candidates,index)=>{
  const unique=candidates.filter((c,i,a)=>a.findIndex(x=>x.itemLabel.value===c.itemLabel.value&&x.artistLabel.value===c.artistLabel.value)===i);
  const results=await mapLimited(unique.slice(0,24),async candidate=>{const result=await albumSongs(candidate,budget);if(region!=='pop')return result;const pop=await filterPopHits(result.tracks);return {...pop,issues:[...result.issues,...pop.issues]};});
  const mode=index?'same':'exact';
  const tracks=uniqueTracks(results.flatMap(r=>r.value?.tracks||[]).filter(t=>matchesDate(t.date,date,mode)));
  const sourceIssues=[...(wd.status==='rejected'?[sourceIssue(wd.reason)]:wd.value.issues),...(!index&&region==='kr'&&mb.status==='rejected'?[sourceIssue(mb.reason)]:[])];
  const issues=uniqueIssues([...sourceIssues,...results.flatMap(r=>r.error?[r.error]:r.value?.issues||[])]);
  const sourcesFailed=wd.status==='rejected'&&(index||region==='pop'||mb.status==='rejected');
  const allCandidatesFailed=results.length>0&&results.every(r=>r.error);
  return {mode,status:sourcesFailed||allCandidatesFailed?'unavailable':issues.length?'partial':'ok',tracks,issues,limited:unique.length>24||results.some(r=>r.value?.limited)};
 }));
}
async function artistSongs(candidate,date,region){
 const name=artistSearchName(candidate.personLabel.value),birthday=fullDate(candidate.dob.value);
 const html=await cached(`song-search:${name}`,()=>request('https://www.melon.com/search/song/index.htm?section=all&sort=hit&q='+encodeURIComponent(name)));
 const songs=parseSongSearch(html).filter(t=>t.artists.some(a=>sameArtist(a.name,name))).slice(0,4);
 if(!songs.length)return {tracks:[],issues:[]};
 const artistId=songs[0].artists.find(a=>sameArtist(a.name,name))?.id;
 if(!artistId)return {tracks:[],issues:[]};
 // A matching display name is insufficient: verify identity with the full birth date.
 const profile=await cached(`artist:${artistId}`,()=>request(`https://www.melon.com/artist/detail.htm?artistId=${artistId}`));
 if(parseArtistBirthday(profile)!==birthday||birthday.slice(5)!==date.slice(5))return {tracks:[],issues:[]};
 const enriched=await mapLimited(songs.filter(song=>song.artists.some(a=>a.id===artistId)),async song=>{
  const info=await cached(`song:${song.id}`,async()=>parseSongDetail(await request(song.source)));
  return {...song,...info,birthday,birthdayArtist:name,evidence:`https://www.melon.com/artist/detail.htm?artistId=${artistId}`,connection:`${name} · ${birthday.replaceAll('-','.')} 출생`};
 },2);
 const tracks=enriched.flatMap(r=>r.value?[r.value]:[]);
 const result=region==='pop'?await filterPopHits(tracks):{tracks,issues:[]};
 return {...result,issues:uniqueIssues([...result.issues,...enriched.flatMap(r=>r.error?[r.error]:[])])};
}
function januaryPopBirthdaysQuery(){
 return `SELECT DISTINCT ?person ?personLabel ?dob ?links WHERE {
 { SELECT DISTINCT ?person ?links WHERE {
 VALUES ?occupation {wd:Q177220 wd:Q639669 wd:Q753110 wd:Q488205}
 ?person wdt:P106 ?occupation; wikibase:sitelinks ?links. FILTER(?links>=50)
 } } hint:Prior hint:runFirst true.
 ?person wdt:P569 ?dob. FILTER(MONTH(?dob)=1 && DAY(?dob)=1)
 ?person p:P569/psv:P569 ?time. ?time wikibase:timeValue ?dob; wikibase:timePrecision ?precision. FILTER(?precision>=11)
 ?person wdt:P27 ?country. FILTER(?country IN(wd:Q30,wd:Q145,wd:Q16,wd:Q408,wd:Q27,wd:Q664))
 SERVICE wikibase:label {bd:serviceParam wikibase:language "en,ko".}
 } ORDER BY DESC(?links) LIMIT 12`;
}
export async function getBirthdayArtists(date,region='kr'){
 const [month,day]=dayParts(date);
 try{
  const candidates=await cached(`birthdays:${region}:${month}-${day}`,()=>queryWikidata(region==='pop'&&date.endsWith('-01-01')?januaryPopBirthdaysQuery():`SELECT DISTINCT ?person ?personLabel ?dob ?links WHERE {
   { SELECT DISTINCT ?person ?dob ?links WHERE {
   ${date.endsWith('-01-01')?'':'VALUES ?dob { '+dateValues(date)+' }'}
   ?person ${date.endsWith('-01-01')?'':'wdt:P569 ?dob; '} p:P569/psv:P569 ?time; wdt:P106 ?occupation; wikibase:sitelinks ?links.
   ${region==='pop'?'?person wdt:P27 ?country. VALUES ?country { wd:Q30 wd:Q145 wd:Q16 wd:Q408 wd:Q27 wd:Q664 } FILTER(?links >= 50)':'?person wdt:P27 wd:Q884.'}
   ?time wikibase:timeValue ?dob; wikibase:timePrecision ?precision.
   FILTER(?precision >= 11 && MONTH(?dob)=${month} && DAY(?dob)=${day})
   FILTER(?occupation IN(wd:Q177220,wd:Q639669,wd:Q753110,wd:Q488205))
   } ORDER BY DESC(?links) LIMIT 12 }
   SERVICE wikibase:label { bd:serviceParam wikibase:language "${region==='pop'?'en,ko':'ko,en'}". }
  } ORDER BY DESC(?links) LIMIT 12`));
  const valid=candidates.filter(c=>fullDate(c.dob?.value)?.slice(5)===date.slice(5));
  const result=await mapLimited(valid.slice(0,6),async c=>{
   try{return await artistSongs(c,date,region);}catch(error){
    try{
     const id=c.person.value.match(/Q[0-9]+$/)?.[0];
     if(!id)throw error;
     const entity=await cached(`artist-identifiers:${id}`,()=>request('https://www.wikidata.org/w/api.php?'+new URLSearchParams({action:'wbgetentities',ids:id,props:'claims',format:'json'}),true));
     const appleId=entity.entities?.[id]?.claims?.P2850?.find(v=>v.rank!=='deprecated')?.mainsnak?.datavalue?.value;
     const tracks=await fallbackArtist(appleId,c);
     if(tracks.length)return region==='pop'?filterPopHits(tracks):{tracks,issues:[]};
     return {tracks:[],issues:[sourceIssue(error)]};
    }catch(fallbackError){return {tracks:[],issues:uniqueIssues([sourceIssue(error),sourceIssue(fallbackError)])};}
   }
  });
  // Interleave artists, so one singer does not take all the first three slots.
  const groups=result.map(r=>r.value?.tracks||[]),tracks=[];
  for(let i=0;i<4;i++)for(const group of groups)if(group[i])tracks.push(group[i]);
  const issues=uniqueIssues(result.flatMap(r=>r.error?[r.error]:r.value?.issues||[]));
  return {status:result.length>0&&result.every(r=>r.error)?'unavailable':issues.length?'partial':'ok',tracks:uniqueTracks(tracks),issues,limited:valid.length>6};
 }catch(error){return {status:'unavailable',tracks:[],issues:[sourceIssue(error)]};}
}

// Check the song itself against historical pop charts, including older hits on reissues.
async function popArchive(){
 return cached('pop-hit-archive',async()=>{
  const years=Array.from({length:new Date().getFullYear()-1955},(_,i)=>1955+i);
  const results=await mapLimited(years,year=>getChartArchive(year,'POP'),3);
  const charts=results.flatMap(r=>r.value?[r.value]:[]);
  const hits=charts.flatMap(c=>c.tracks.map(({id,title,artist})=>({id,title,artist,popSource:c.source})));
  const issues=uniqueIssues([...results.flatMap(r=>r.error?[r.error]:[]),...charts.flatMap(c=>c.issues||[])]);
  return {hits,issues};
 });
}
async function filterPopHits(tracks){
 if(!tracks.length)return {tracks:[],issues:[]};
 const {hits,issues}=await popArchive();
 const verified=tracks.flatMap(track=>{
  const hit=hits.find(hit=>hit.id===track.id||(normalizedName(hit.title)===normalizedName(track.title)&&sameArtist(hit.artist,track.artist)));
  return hit?[{...track,popSource:hit.popSource}]:[];
 });
 return {tracks:verified,issues};
}
