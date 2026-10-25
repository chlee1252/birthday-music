'use client';
import {useEffect,useRef,useState} from 'react';
export function RetrySearch({date,category,region,onResult}){
 const [pending,setPending]=useState(false),[failed,setFailed]=useState(false),controller=useRef(null);
 useEffect(()=>()=>controller.current?.abort(),[]);
 async function retry(){
  if(controller.current)return;
  const request=new AbortController();controller.current=request;setPending(true);setFailed(false);
  try{
   const response=await fetch('/api/section?'+new URLSearchParams({date,category,region}),{signal:request.signal,cache:'no-store'});
   if(!response.ok)throw new Error('Retry failed');
   const result=await response.json();
   if(!Array.isArray(result.tracks)||typeof result.status!=='string')throw new Error('Invalid result');
   onResult(result);
  }catch(error){if(error.name!=='AbortError')setFailed(true);}
  finally{if(!request.signal.aborted){controller.current=null;setPending(false);}}
 }
 return <div className="section-retry" aria-busy={pending}><button className="retry" disabled={pending} onClick={retry}>{pending?'다시 찾는 중…':'다시 찾기'}</button>{pending&&<div className="section-progress" role="progressbar" aria-label="이 카테고리의 음악 찾는 중"><span/></div>}{failed&&<p role="alert">연결이 안 돼요. 다시 시도해주세요.</p>}</div>;
}
