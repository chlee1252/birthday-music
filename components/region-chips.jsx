'use client';
import {readFilters,sectionUrl} from '../lib/section-filters.js';
export function RegionChips({title,date,filterKey,region,onChange}){
 function select(next){
  onChange(next);
  const filters=readFilters(Object.fromEntries(new URLSearchParams(window.location.search)));
  window.history.replaceState(null,'',sectionUrl(date,filters,filterKey,next));
 }
 return <nav className="region-chips" aria-label={`${title} 음악 선택`}>{[['kr','한국 노래'],['pop','팝송']].map(([key,text])=><button type="button" key={key} aria-pressed={region===key} onClick={()=>select(key)}>{text}</button>)}</nav>;
}
