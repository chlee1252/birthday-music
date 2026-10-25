import {parseDate} from './date.js';
import {filterKeys} from './section-filters.js';
export function parseSectionRequest(params){
 const date=parseDate(params.get('date')),category=params.get('category'),region=params.get('region');
 if(!date||!filterKeys.includes(category)||!['kr','pop'].includes(region))return null;
 return {date,category,region};
}
export async function searchSection({date,category,region},{releases,artists,chart}){
 if(category==='exact'||category==='same')return (await releases(date,region,category))[0];
 if(category==='artists')return artists(date,region);
 const offset={year:0,ten:10,twenty:20}[category];
 return chart(Number(date.slice(0,4))-offset,region==='pop'?'POP':'KPOP');
}
