'use client';
import {useEffect,useState} from 'react';
import {searchTiming} from '../lib/search-timing.js';
export function SearchLoading(){
 const [elapsed,setElapsed]=useState(0);
 useEffect(()=>{const started=Date.now(),timer=setInterval(()=>setElapsed(Math.floor((Date.now()-started)/1000)),1000);return ()=>clearInterval(timer);},[]);
 const slow=elapsed>=Math.max(30,(searchTiming.averageSeconds||15)*2);
 return <div className="search-loading-screen" aria-busy="true">
  <div className="loading-record" aria-hidden="true"><span/><i/></div>
  <div className="loading-equalizer" aria-hidden="true">{[0,1,2,3,4].map(i=><i key={i} style={{animationDelay:`${i*.14}s`}}/>)}</div>
  <h1 role="status">음악 찾는 중</h1>
  <p>{slow?'외부 음악 서비스의 응답을 기다리고 있어요.':'날짜와 연결된 음악을 모으고 있어요.'}</p>
  <div className="search-loading-progress" aria-hidden="true"><span/></div>
  {searchTiming.averageSeconds&&<p className="loading-estimate">첫 조회 테스트 {searchTiming.sampleCount}회 평균 약 {searchTiming.averageSeconds}초</p>}
  <p className="loading-elapsed" aria-live="off">{elapsed}초 경과 · 처음 찾는 날짜는 더 걸릴 수 있어요</p>
 </div>;
}
