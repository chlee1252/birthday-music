import 'server-only';
export function sourceIssue(error){return {source:error?.source||'music-source',code:error?.code||'INVALID_RESPONSE'};}
export function uniqueIssues(issues){return [...new Map(issues.map(i=>[`${i.source}:${i.code}`,i])).values()];}
export async function sourceRequest(url,{json=false,timeout=8000,retryTimeout=true,beforeAttempt,...options}={}){
 const source=new URL(url).hostname;
 for(let attempt=0;attempt<2;attempt++){
  try{
   await beforeAttempt?.();
   const response=await fetch(url,{...options,cache:'no-store',signal:AbortSignal.timeout(timeout),headers:{'User-Agent':process.env.MUSICBRAINZ_USER_AGENT||'BirthdayTracks/0.4 (https://github.com/chlee1252/birthday-music)',Accept:json?'application/json':'text/html',...options.headers}});
   if(!response.ok){const error=new Error('Music source HTTP failure');error.code=`HTTP_${response.status}`;error.retryable=response.status===408||response.status===429||response.status>=500;throw error;}
   return json?await response.json():await response.text();
  }catch(error){
   const code=error.name==='TimeoutError'||error.name==='AbortError'?'TIMEOUT':typeof error.code==='string'?error.code:error instanceof SyntaxError?'INVALID_RESPONSE':'NETWORK';
   const original=error;
   error=new Error('Music source request failed',{cause:original});
   error.source=source;error.code=code;error.retryable=original.retryable;
   const retryable=error.retryable||error.code==='TIMEOUT'||original instanceof TypeError;
   if(!attempt&&retryable&&(retryTimeout||error.code!=='TIMEOUT')){await new Promise(resolve=>setTimeout(resolve,source==='musicbrainz.org'?1100:350));continue;}
   if(process.env.MUSIC_DEBUG==='1')console.warn('[music-source]',JSON.stringify(sourceIssue(error)));
   throw error;
  }
 }
}
