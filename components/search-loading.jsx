'use client';
import {searchTiming} from '../lib/search-timing.js';
export function SearchLoading(){
 return <div className="search-loading-screen" aria-busy="true">
  <div className="loading-record" aria-hidden="true"><span/><i/></div>
  <div className="loading-equalizer" aria-hidden="true">{[0,1,2,3,4].map(i=><i key={i} style={{animationDelay:`${i*.14}s`}}/>)}</div>
  <h1 role="status">음악 찾는 중</h1>
  <p>멜론 · Apple Music에서 음악을 찾고 있어요.</p>
  <p className="loading-sources">Wikidata · MusicBrainz에서 생일과 발매일 확인 중</p>
  <div className="search-loading-progress" aria-hidden="true"><span/></div>
  {searchTiming.averageSeconds&&<p className="loading-estimate">예상 소요 시간 약 {searchTiming.averageSeconds}초</p>}
 </div>;
}
