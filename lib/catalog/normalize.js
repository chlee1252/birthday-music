import {albumEdition} from './quality.js';
import {fullDate,normalizedName} from '../birthday-data.js';
export function releaseDateParts(value){
 const date=fullDate(value);
 if(date)return {release_date:date,release_year:+date.slice(0,4),release_month:+date.slice(5,7),date_precision:'day'};
 const text=String(value||'').trim().replaceAll('.','-');
 if(/^\d{4}-(0[1-9]|1[0-2])$/.test(text))return {release_date:null,release_year:+text.slice(0,4),release_month:+text.slice(5),date_precision:'month'};
 if(/^\d{4}$/.test(text))return {release_date:null,release_year:+text,release_month:null,date_precision:'year'};
 return {release_date:null,release_year:null,release_month:null,date_precision:'unknown'};
}
export function safeCatalogUrl(value,hosts){try{const u=new URL(value);return u.protocol==='https:'&&hosts.some(host=>u.hostname===host||u.hostname.endsWith('.'+host))?u.href:null;}catch{return null;}}
const appleUrl=value=>safeCatalogUrl(value,['music.apple.com','itunes.apple.com']);
export function appleArtist(rows,name,region,expectedId=null){
 const candidates=rows.filter(r=>r.wrapperType==='artist'&&(!expectedId||r.artistId===expectedId)&&Number.isSafeInteger(r.artistId)&&normalizedName(r.artistName)===normalizedName(name));
 const distinct=[...new Map(candidates.map(r=>[r.artistId,r])).values()];
 if(distinct.length!==1)throw new Error('ARTIST_IDENTITY_UNCONFIRMED');
 const r=distinct[0],source=appleUrl(r.artistLinkUrl||r.artistViewUrl);
 if(!source)throw new Error('INVALID_ARTIST_SOURCE');
 return {id:`itunes:${r.artistId}`,name:r.artistName,region,source_url:source};
}
export function appleAlbum(r,artist){
 if(r.wrapperType!=='collection'||r.collectionType!=='Album'||String(r.artistId)!==artist.id.split(':')[1]||!Number.isSafeInteger(r.collectionId)||!r.collectionName||!appleUrl(r.collectionViewUrl))return null;
 return {id:`itunes:${r.collectionId}`,artist_id:artist.id,title:r.collectionName,source_url:appleUrl(r.collectionViewUrl),cover_url:safeCatalogUrl(r.artworkUrl100,['mzstatic.com']),edition:albumEdition(r.collectionName)};
}
export function appleTrack(r,album,artist){
 if(r.kind!=='song'||!Number.isSafeInteger(r.trackId)||String(r.collectionId)!==album.id.split(':')[1]||String(r.artistId)!==artist.id.split(':')[1]||!r.trackName||!appleUrl(r.trackViewUrl))return null;
 return {id:`itunes:${r.trackId}`,album_id:album.id,artist_id:artist.id,title:r.trackName,artist_name:r.artistName,region:artist.region,provider:'itunes',...releaseDateParts(r.releaseDate),date_basis:'album',source_url:appleUrl(r.trackViewUrl),cover_url:safeCatalogUrl(r.artworkUrl100,['mzstatic.com'])||album.cover_url,popularity:album.edition==='reissue'?10:20};
}
