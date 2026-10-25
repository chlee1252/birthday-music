import {load} from 'cheerio';
import {coverUrl} from './birthday-data.js';
export function chartUrl(year,genre='KPOP') {
 return `https://www.melon.com/chart/age/index.htm?chartType=YE&chartGenre=${genre}&chartDate=${year}`;
}
export function parseChart(html,limit=10) {
 const $=load(html), tracks=[],seen=new Set();
 $('tr.lst50, tr.lst100').each((_,row)=>{
  const el=$(row),id=el.find('input[name="input_check"]').attr('value');
  const title=el.find('.rank01 a').first().text().trim();
  const artist=el.find('.rank02 > a').map((_,a)=>$(a).text().trim()).get().join(', ');
  const rank=Number(el.find('span.rank').first().text().trim());
  if(!id||!/^\d+$/.test(id)||!title||!artist||!Number.isInteger(rank)||rank<1||seen.has(id))return;
  seen.add(id);tracks.push({id,title,artist,rank,cover:coverUrl(el.find('img').first().attr('src')),source:`https://www.melon.com/song/detail.htm?songId=${id}`});
 });
 // A partial or changed upstream page must not silently become a different chart.
 tracks.sort((a,b)=>a.rank-b.rank);
 if(tracks.length && tracks[0].rank!==1)throw new Error('Invalid chart');
 return tracks.slice(0,limit);
}
export function chartSections(year) {
 return [
  {year,genre:'KPOP',label:'태어난 해',title:'그해, 우리가 사랑한 노래'},
  {year:year-10,genre:'KPOP',label:'태어나기 10년 전',title:'10년을 거슬러 올라가면'},
  {year:year-20,genre:'KPOP',label:'태어나기 20년 전',title:'더 오래된, 익숙한 멜로디'},
  {year,genre:'POP',label:'해외 인기곡',title:'그해의 팝 히트곡'},
 ];
}
