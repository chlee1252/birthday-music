import {load} from 'cheerio';
export const normalizedName=value=>(value||'').normalize('NFKC').toLowerCase().replace(/\([^)]*\)/g,'').replace(/[^\p{L}\p{N}]/gu,'');
export function sameArtist(a,b){return !!normalizedName(a)&&normalizedName(a)===normalizedName(b);}
export function fullDate(value){
 const s=(value||'').slice(0,10).replaceAll('.','-');
 if(!/^\d{4}-\d{2}-\d{2}$/.test(s))return null;
 const d=new Date(s+'T00:00:00Z');return Number.isNaN(+d)||d.toISOString().slice(0,10)!==s?null:s;
}
export function matchesDate(value,birthday,mode){const date=fullDate(value);return !!date&&(mode==='exact'?date===birthday:date!==birthday&&date.slice(5)===birthday.slice(5));}
export function coverUrl(value){try{const url=new URL(value);return url.protocol==='https:'&&url.hostname==='cdnimg.melon.co.kr'?url.href.replace(/\/resize\/\d+/,'/resize/160'):null;}catch{return null;}}
export function parseAlbumSearch(html){
 const $=load(html);
 return $('.album11_li').map((_,el)=>{
  const row=$(el), id=row.find('[album-song-id]').first().attr('album-song-id');
  const artists=row.find('.atistname .ellipsis > a').map((_,a)=>$(a).text().trim()).get();
  const date=fullDate(row.find('.cnt_view').first().text().trim());
  const albumId=row.find('a.thumb').attr('href')?.match(/goAlbumDetail\('?(\d+)/)?.[1];
  if(!/^\d+$/.test(id||'')||!date||!artists.length)return null;
  return {id,title:row.find('.songname12').first().text().trim(),artist:artists.join(', '),artists,date,album:row.find('dt a').first().text().trim(),albumId,cover:coverUrl(row.find('a.thumb img').attr('src')),source:`https://www.melon.com/song/detail.htm?songId=${id}`};
 }).get().filter(t=>t?.title);
}
export function parseSongSearch(html){
 const $=load(html);
 return $('tr').map((_,el)=>{
  const row=$(el),id=row.find('input[name="input_check"]').attr('value');
  if(!/^\d+$/.test(id||''))return null;
  const title=row.find('a.fc_gray').first().text().trim();
  const artists=row.find('[id="artistName"] > a').map((_,a)=>({name:$(a).text().trim(),id:$(a).attr('href')?.match(/goArtistDetail\('?(\d+)/)?.[1]})).get();
  const albumLink=row.find('a').filter((_,a)=>/goAlbumDetail/.test($(a).attr('href')||'')).first();
  const albumId=albumLink.attr('href')?.match(/goAlbumDetail\('?(\d+)/)?.[1];
  return title&&artists.length?{id,title,albumId,album:albumLink.text().trim(),artists,artist:artists.map(a=>a.name).join(', '),source:`https://www.melon.com/song/detail.htm?songId=${id}`}:null;
 }).get().filter(Boolean);
}
export function parseSongDetail(html){
 const $=load(html),date=fullDate($('.section_info dt').filter((_,el)=>$(el).text().trim()==='발매일').next('dd').first().text().trim());
 return {date,cover:coverUrl($('.section_info .thumb img').first().attr('src'))};
}
export function parseArtistBirthday(html){const $=load(html);return fullDate($('dt').filter((_,el)=>$(el).text().trim()==='생일').next('dd').first().text().trim());}
export function uniqueTracks(tracks,limit=10){const seen=new Set();return tracks.filter(t=>{const key=normalizedName(t.title)+'|'+normalizedName(t.artist);if(seen.has(key))return false;seen.add(key);return true;}).slice(0,limit);}
// Wikidata disambiguation is metadata, not part of the stage name.
export function artistSearchName(value){return value.replace(/\s*\((?:가수|래퍼|음악가|singer|musician|rapper)\)\s*$/i,'').trim();}

export function hasPartialReleaseDate(html){const $=load(html),value=$('.section_info dt').filter((_,el)=>$(el).text().trim()==='발매일').next('dd').first().text().trim();return /^\d{4}(?:[.-](?:0[1-9]|1[0-2]))?$/.test(value);}
