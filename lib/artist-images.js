import 'server-only';
import {load} from 'cheerio';
import {persistentMusic} from './server-cache.js';
const safeUrl=(value,host)=>{try{const u=new URL(value);return u.protocol==='https:'&&u.hostname===host?u.href:null;}catch{return null;}};
const plain=value=>load(value||'').text().trim();
export function normalizePortrait(info){
 const src=safeUrl(info?.thumburl,'upload.wikimedia.org')||safeUrl(info?.thumburl,'thumb.wikimedia.org');
 const source=safeUrl(info?.descriptionurl,'commons.wikimedia.org');
 if(!src||!source)return null;
 const metadata=info.extmetadata||{};
 return {src,source,author:plain(metadata.Artist?.value),license:plain(metadata.LicenseShortName?.value)};
}
async function json(url){
 // Optional pictures must not repeat timeout windows or fail the music search.
 const response=await fetch(url,{cache:'no-store',signal:AbortSignal.timeout(3500),headers:{'User-Agent':'BirthdayTracks/0.6 (https://github.com/chlee1252/birthday-music)'}});
 if(!response.ok)throw new Error('Portrait lookup failed');
 return response.json();
}
export async function getArtistImages(entityUrls){
 const ids=[...new Set(entityUrls.map(url=>url.match(/Q[0-9]+$/)?.[0]).filter(Boolean))].sort();
 if(!ids.length)return {};
 try{return await persistentMusic(`artist-images-v2:${ids.join('|')}`,async()=>{
  const data=await json('https://www.wikidata.org/w/api.php?'+new URLSearchParams({action:'wbgetentities',ids:ids.join('|'),props:'claims',format:'json'}));
  if(!data.entities)throw new Error('Invalid artist image response');
  const files=Object.fromEntries(ids.flatMap(id=>{
   const claims=(data.entities?.[id]?.claims?.P18||[]).filter(c=>c.rank!=='deprecated');
   const file=(claims.find(c=>c.rank==='preferred')||claims[0])?.mainsnak?.datavalue?.value;
   return typeof file==='string'?[[id,'File:'+file.replaceAll('_',' ')]]:[];
  }));
  if(!Object.keys(files).length)return {};
  const media=await json('https://commons.wikimedia.org/w/api.php?'+new URLSearchParams({action:'query',format:'json',titles:[...new Set(Object.values(files))].join('|'),prop:'imageinfo',iiprop:'url|extmetadata',iiurlwidth:'160',iiextmetadatafilter:'Artist|LicenseShortName'}));
  if(!media.query?.pages)throw new Error('Invalid portrait response');
  const pages=Object.values(media.query.pages),renames=new Map((media.query.normalized||[]).map(r=>[r.from,r.to]));
  return Object.fromEntries(Object.entries(files).flatMap(([id,file])=>{
   const info=pages.find(p=>p.title===(renames.get(file)||file))?.imageinfo?.[0];
   const portrait=normalizePortrait(info);return portrait?[[id,portrait]]:[];
  }));
 },604800);}catch{return {};}
}
