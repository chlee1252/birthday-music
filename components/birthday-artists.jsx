'use client';
import {Mic2,ChevronDown,Music2} from 'lucide-react';
import {ExpandableTracks} from './expandable-tracks.jsx';
import {emptyMessage} from '../lib/search-status.js';
export function BirthdayArtists({artists,id,renderTrack}){
 function card(artist){
  return <details className="birthday-artist" key={artist.id}>
   <summary><span className="artist-avatar" aria-hidden="true"><Mic2 size={22}/></span><span className="artist-name"><strong>{artist.name}</strong><span>{artist.birthday.replaceAll('-','.')} 출생</span></span><ChevronDown className="artist-chevron" size={18} aria-hidden="true"/></summary>
   <div className="artist-songs">
    {artist.tracks.length?<div className="track-list">{artist.tracks.map(renderTrack)}</div>:<div className="artist-songs-empty"><Music2 size={22} aria-hidden="true"/><p>{emptyMessage(artist.issues.length?'partial':'ok',artist.issues)}</p></div>}
    <a className="section-source" href={artist.source} target="_blank" rel="noreferrer">가수 정보 ↗</a>
   </div>
  </details>;
 }
 return <div className="birthday-artists">{artists.slice(0,3).map(card)}{artists.length>3&&<ExpandableTracks id={`${id}-artists`} count={artists.length-3} unit="명">{artists.slice(3).map(card)}</ExpandableTracks>}</div>;
}
