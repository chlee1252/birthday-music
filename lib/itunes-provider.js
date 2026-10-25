import 'server-only';
import {persistentMusic} from './server-cache.js';
import {reserveRequestSlot} from './request-slots.js';
import {sourceRequest} from './source-request.js';
import {sameArtist,fullDate,normalizedName} from './birthday-data.js';
const state=globalThis.__birthdayItunes??={cache:new Map(),pending:new Map(),tail:Promise.resolve(),last:0};
function storeUrl(value){try{const u=new URL(value);return u.protocol==='https:'&&['music.apple.com','itunes.apple.com'].includes(u.hostname)?u.href:null;}catch{return null;}}
function artUrl(value){try{const u=new URL(value);return u.protocol==='https:'&&u.hostname.endsWith('.mzstatic.com')?u.href:null;}catch{return null;}}
export function normalizeItunesReleases(results,candidate,limit=1){
 const date=fullDate(candidate.date?.value),names=candidate.artistNames||[candidate.artistLabel?.value];
 const albumName=value=>normalizedName((value||'').replace(/\s*-\s*(EP|Single)$/i,''));
 if(!date)return [];
 const matches=results.filter(r=>r.kind==='song'&&Number.isSafeInteger(r.trackId)&&fullDate(r.releaseDate)===date&&names.some(name=>sameArtist(name,r.artistName))&&albumName(r.collectionName)===albumName(candidate.itemLabel.value)&&storeUrl(r.trackViewUrl));
 return matches.slice(0,limit).map(r=>({id:`itunes:${r.trackId}`,title:r.trackName,artist:r.artistName,album:r.collectionName,albumId:`itunes:${r.collectionId}`,date,cover:artUrl(r.artworkUrl100),source:storeUrl(r.trackViewUrl),provider:'itunes',evidence:candidate.item.value.replace('http:','https:'),dateNote:'Apple Music 수록 앨범 발매일 기준'}));
}
async function requestCatalog(term,url){
 const hit=state.cache.get(term);if(hit?.expires>Date.now())return hit.value;
 if(state.pending.has(term))return state.pending.get(term);
 // Apple documents approximately 20 calls/minute. Cache results and space request starts, including retries.
 const task=persistentMusic(`apple-v2:${term}`,async()=>{
  const data=await sourceRequest(url,{json:true,timeout:7000,retryTimeout:false,beforeAttempt:()=>reserveRequestSlot(state,3100)});
  if(!Array.isArray(data.results)){const e=new Error('Invalid Apple response');e.source='itunes.apple.com';e.code='INVALID_RESPONSE';throw e;}
  if(state.cache.size>=300)state.cache.delete(state.cache.keys().next().value);
  state.cache.set(term,{value:data.results,expires:Date.now()+86400000});return data.results;
 });
 state.pending.set(term,task);try{return await task;}finally{state.pending.delete(term);}
}
export async function fallbackRelease(candidate,limit=1){
 // Storefront does not determine nationality: use the already verified discovery candidate.
 const names=candidate.artistNames||[candidate.artistLabel.value];
 const name=names.find(n=>/^[\x20-\x7e]+$/.test(n))||names[0];
 return normalizeItunesReleases(await requestCatalog(name+' '+candidate.itemLabel.value,'https://itunes.apple.com/search?'+new URLSearchParams({term:name+' '+candidate.itemLabel.value,country:'US',media:'music',entity:'song',limit:'200'})),candidate,limit);
}

export async function fallbackArtist(artistId,candidate){
 if(!/^\d+$/.test(artistId||''))return [];
 const rows=await requestCatalog(`artist:${artistId}`,'https://itunes.apple.com/lookup?'+new URLSearchParams({id:artistId,entity:'song',limit:'10',country:'US'}));
 const birthday=fullDate(candidate.dob?.value);
 if(!birthday)return [];
 return rows.filter(r=>r.kind==='song'&&String(r.artistId)===artistId&&Number.isSafeInteger(r.trackId)&&storeUrl(r.trackViewUrl)).slice(0,4).map(r=>({id:`itunes:${r.trackId}`,title:r.trackName,artist:r.artistName,album:r.collectionName,cover:artUrl(r.artworkUrl100),source:storeUrl(r.trackViewUrl),provider:'itunes',birthday,birthdayArtist:r.artistName,evidence:candidate.person.value.replace('http:','https:')}));
}
