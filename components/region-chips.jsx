'use client';
import Link from 'next/link';
import {createPortal} from 'react-dom';
import {SearchLoading} from './search-loading.jsx';
import {useLinkStatus} from 'next/link';
import {sectionUrl} from '../lib/section-filters.js';
function ChipLabel({children}){const {pending}=useLinkStatus();return <><span aria-busy={pending} className={pending?'chip-pending':undefined}>{children}</span>{pending&&createPortal(<SearchLoading/>,document.body)}</>;}
export function RegionChips({title,date,filters,filterKey}){
 const region=filters[filterKey];
 return <nav className="region-chips" aria-label={`${title} 음악 선택`}>{[['kr','한국 노래'],['pop','팝송']].map(([key,text])=><Link key={key} scroll={false} prefetch={false} aria-current={region===key?'true':undefined} href={sectionUrl(date,filters,filterKey,key)}><ChipLabel>{text}</ChipLabel></Link>)}</nav>;
}
