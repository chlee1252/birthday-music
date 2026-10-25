'use client';
import {useState} from 'react';
import {Mic2,ChevronDown,Music2} from 'lucide-react';
import {ExpandableTracks} from './expandable-tracks.jsx';
import {emptyMessage} from '../lib/search-status.js';
function ArtistAvatar({image,name}){
 const [failed,setFailed]=useState(false);
 return <span className="artist-avatar">{image?.src&&!failed?<img src={image.src} alt={`${name} 사진`} width="44" height="44" loading="lazy" decoding="async" referrerPolicy="no-referrer" onError={()=>setFailed(true)}/>:<Mic2 size={22} aria-hidden="true"/>}</span>;
}
export function BirthdayArtists({artists,id,renderTrack}){
 function card(artist){
  return <details className="birthday-artist" key={artist.id}>
   <summary><ArtistAvatar key={artist.image?.src||artist.id} image={artist.image} name={artist.name}/><span className="artist-name"><strong>{artist.name}</strong><span>{artist.birthday.replaceAll('-','.')} 출생</span></span><ChevronDown className="artist-chevron" size={18} aria-hidden="true"/></summary>
   <div className="artist-songs">
    {artist.tracks.length?<div className="track-list">{artist.tracks.map(renderTrack)}</div>:<div className="artist-songs-empty"><Music2 size={22} aria-hidden="true"/><p>{emptyMessage(artist.issues.length?'partial':'ok',artist.issues)}</p></div>}
    <a className="section-source" href={artist.source} target="_blank" rel="noreferrer">가수 정보 ↗</a>
    {artist.image&&<p className="artist-image-credit"><a href={artist.image.source} target="_blank" rel="noreferrer">사진 출처 ↗</a>{artist.image.author&&` · ${artist.image.author}`}{artist.image.license&&` · ${artist.image.license}`} · 원형 표시</p>}
   </div>
  </details>;
 }
 return <div className="birthday-artists">{artists.slice(0,3).map(card)}{artists.length>3&&<ExpandableTracks id={`${id}-artists`} count={artists.length-3} unit="명">{artists.slice(3).map(card)}</ExpandableTracks>}</div>;
}
