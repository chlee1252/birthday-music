import 'server-only';
import {normalizeRecordings,recordingQuery} from './music-policy.js';
// One queue per Node process. Use a shared queue/cache before running multiple instances.
const state = globalThis.__birthdayKoreanMusic ||= { cache: new Map(), pending: new Map(), tail: Promise.resolve(), last: 0 };
export async function searchRecordings(target) {
 if (!/^\d{4}(-\d{2}-\d{2})?$/.test(target)) return { tracks: [], status: 'invalid' };
 const cached=state.cache.get(target);
 if(cached && cached.expires>Date.now()) return cached.value;
 if(state.pending.has(target)) return state.pending.get(target);
 const request=state.tail.then(async()=>{
  const wait=1100-(Date.now()-state.last); if(wait>0) await new Promise(r=>setTimeout(r,wait));
  state.last=Date.now();
  try {
   const response=await fetch(`https://musicbrainz.org/ws/2/recording/?fmt=json&limit=24&query=${encodeURIComponent(recordingQuery(target))}`,{cache:'no-store',headers:{'User-Agent':process.env.MUSICBRAINZ_USER_AGENT || 'BirthdayTracks/0.1 (local development)','Accept':'application/json'},signal:AbortSignal.timeout(6000)});
   if(!response.ok) throw new Error(`MusicBrainz ${response.status}`);
   const tracks=normalizeRecordings(await response.json(),target);
   const value={tracks,status:'ok'};
   state.cache.set(target,{value,expires:Date.now()+86400000});
   if(state.cache.size>300) state.cache.delete(state.cache.keys().next().value);
   return value;
  }catch {const value={tracks:[],status:'unavailable'};state.cache.set(target,{value,expires:Date.now()+30000});return value;}
 });
 state.tail=request.catch(()=>{});state.pending.set(target,request);
 try{return await request;}finally{state.pending.delete(target);}
}
