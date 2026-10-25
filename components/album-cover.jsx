'use client';
import {useState} from 'react';
export function AlbumCover({src,title}){
 const [failed,setFailed]=useState(false);
 return <div className="album-cover">{src&&!failed?<img src={src} alt={`${title} 앨범 커버`} width="72" height="72" loading="lazy" decoding="async" referrerPolicy="no-referrer" onError={()=>setFailed(true)}/>:<span className="cover-missing" role="img" aria-label="앨범 커버 없음">♫</span>}</div>;
}
