'use client';
import {useState} from 'react';
export function ShareButton({date}){
 const [status,setStatus]=useState('');return <div className="share"><button onClick={async()=>{const url=new URL(location.href);url.searchParams.set('date',date);try{await navigator.clipboard.writeText(url.href);setStatus('링크를 복사했어요.')}catch{setStatus(url.href)}}}>날짜 링크 복사</button><small>링크에 생년월일이 포함됩니다.</small><span role="status">{status}</span></div>;
}
