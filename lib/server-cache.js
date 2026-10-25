import 'server-only';
import {unstable_cache} from 'next/cache.js';
export function cacheable(value){
 if(!value||typeof value!=='object')return true;
 if(value.issues?.length||['partial','unavailable','empty'].includes(value.status))return false;
 return Object.values(value).every(cacheable);
}
class IncompleteResult extends Error {constructor(value){super('Incomplete music result');this.value=value;}}
// Next's Data Cache survives function restarts/deployments. CLI tests use memory only.
export async function persistentMusic(key,task,revalidate=86400){
 if(process.env.NEXT_RUNTIME!=='nodejs')return task();
 try{return await unstable_cache(async()=>{const result=await task();if(!cacheable(result))throw new IncompleteResult(result);return result;},['birthday-music-v2',key],{revalidate})();}
 catch(error){if(error instanceof IncompleteResult)return error.value;throw error;}
}
