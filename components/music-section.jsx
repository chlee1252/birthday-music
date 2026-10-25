'use client';
import {useState} from 'react';
import {Music2,SearchX,WifiOff,ArrowUpRight,Play} from 'lucide-react';
import {AlbumCover} from './album-cover.jsx';
import {ExpandableTracks} from './expandable-tracks.jsx';
import {RegionChips} from './region-chips.jsx';
import {RetrySearch} from './retry-search.jsx';
import {BirthdayArtists} from './birthday-artists.jsx';
import {emptyMessage} from '../lib/search-status.js';
export function Track({track}){
 const detail=track.birthday?`${track.birthdayArtist} · ${track.birthday.replaceAll('-','.')} 출생`:track.date?track.date.replaceAll('-','.'):null;
 return <article className="track"><AlbumCover key={track.cover||track.id} src={track.cover} title={track.album||track.title}/><div className="track-body"><h3>{track.title}</h3><p>{track.artist}</p>{detail&&<p className="connection">{detail}</p>}<div className="track-links"><a className="listen" href={`https://www.youtube.com/results?search_query=${encodeURIComponent(track.artist+' '+track.title+' official')}`} target="_blank" rel="noreferrer" aria-label={`${track.title} YouTube에서 듣기 (새 탭)`}><Play size={12} fill="currentColor"/>YouTube <ArrowUpRight size={14}/></a>{track.provider==='itunes'&&<a href={track.source} target="_blank" rel="noreferrer" aria-label={`${track.title} Apple Music에서 보기`}>Apple Music ↗</a>}<details className="track-info"><summary>정보</summary><div><p>{track.birthday?'가수 생일 기준':track.date?(track.dateNote||'수록 앨범 발매일 기준'):'연도별 차트 수록곡'}</p><a href={track.source} target="_blank" rel="noreferrer">곡 정보 ↗</a>{track.evidence&&<a href={track.evidence} target="_blank" rel="noreferrer">{track.birthday?'생일':'발매'} 출처 ↗</a>}{track.popSource&&<a href={track.popSource} target="_blank" rel="noreferrer">인기곡 근거 ↗</a>}</div></details></div></div></article>;
}
export function MusicSection({id,title,label,date,year,filterKey,filters,regions}){
 const [region,setRegion]=useState(filters?.[filterKey]||'kr');
 const [retried,setRetried]=useState({});
 const {tracks=[],artists=[],status='ok',source,issues=[]}=retried[region]||regions[region];
 const isArtists=filterKey==='artists',count=isArtists?artists.length:tracks.length;
 const retry=<RetrySearch key={`${date}-${region}`} date={date} category={filterKey} region={region} onResult={result=>setRetried(previous=>({...previous,[region]:result}))}/>;
 return <section className={`chart-section ${year?'annual-section':'birthday-section'}`} aria-labelledby={id}><div className="chart-heading"><span className="eyebrow">{label}</span><div><h2 id={id}>{title}</h2><span className="result-count">{count>0&&`${count}${isArtists?'명':'곡'}`}</span></div></div>
 {filterKey&&<RegionChips title={title} date={date} region={region} onChange={setRegion} filterKey={filterKey}/>}
 {count>0?isArtists?<BirthdayArtists key={`${date}-${region}`} id={id} artists={artists} renderTrack={track=><Track key={track.id} track={track}/>}/>:<><div className="track-list">{tracks.slice(0,3).map(t=><Track key={t.id} track={t}/>)}</div>{tracks.length>3&&<ExpandableTracks key={`${date}-${region}`} id={id} count={tracks.length-3}><div className="more-tracks">{tracks.slice(3).map(t=><Track key={t.id} track={t}/>)}</div></ExpandableTracks>}</>:<div className="chart-empty compact-empty"><span className="empty-icon" aria-hidden="true">{status==='unavailable'?<WifiOff size={30}/>:<><Music2 size={30}/><SearchX size={16} className="empty-badge"/></>}</span><p>{emptyMessage(status,issues)}</p>{['unavailable','partial','empty'].includes(status)&&retry}</div>}
 {status==='partial'&&count>0&&<div className="partial-result"><span>일부 결과</span>{retry}</div>}
 {source&&<a className="section-source" href={source} target="_blank" rel="noreferrer">차트 출처 ↗</a>}</section>;
}
export function SectionLoading({title}){return <section className="chart-section section-loading" aria-busy="true"><h2>{title}</h2><p role="status">음악 찾는 중…</p><div/><div/><div/></section>;}
