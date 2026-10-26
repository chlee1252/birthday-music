import {normalizedName} from '../birthday-data.js';
export function catalogIdentity(title,artist){
 // Remaster/edition labels describe the same recording. Keep live, remix and acoustic versions distinct.
 const base=String(title||'').replace(/\s*[([][^)\]]*(?:remaster(?:ed)?|\d{2,4}\s+remaster|anniversary edition)[^)\]]*[)\]]/gi,'').replace(/\s*[-–—]\s*(?:\d{2,4}\s+)?remaster(?:ed)?(?:\s+\d{2,4})?\s*$/i,'');
 const key=value=>String(value).normalize('NFKC').toLowerCase().replace(/[^\p{L}\p{N}]/gu,'');
 return key(base)+'|'+normalizedName(artist);
}
export function albumEdition(title){
 if(/karaoke|tribute\s+to|originally performed|made famous by/i.test(title))return 'tribute';
 if(/\blive (?:at|from|in|on)\b|\(live\b|\[live\b|^live$|concert|unplugged/i.test(title))return 'live';
 if(/remix|rework/i.test(title))return 'remix';
 if(/remaster|deluxe|anniversary|expanded|reissue/i.test(title))return 'reissue';
 if(/greatest hits|essential|best of|collection|anthology/i.test(title))return 'compilation';
 return 'catalog';
}
export function trackQuality(track,album){
 const flags=[];
 if(!track.title?.trim()||!track.artist_name?.trim())flags.push('missing_identity');
 if(album?.edition==='tribute'||albumEdition(track.title)==='tribute')flags.push('tribute_or_karaoke');
 if(track.date_precision!=='day')flags.push('imprecise_date');
 // A recording cannot debut after the year in which it already charted.
 // Keep the source record but do not present that reissue date as the song's birthday.
 if(track.first_chart_year&&track.release_year>track.first_chart_year)flags.push('post_chart_release');
 if(!track.cover_url)flags.push('missing_cover');
 // January 1 can be real; flag it for review rather than silently deleting it or changing the date.
 if(track.release_date?.endsWith('-01-01'))flags.push('january_first_review');
 return {canonical_key:catalogIdentity(track.title,track.artist_name),quality_flags:flags,review_state:flags.some(f=>['missing_identity','tribute_or_karaoke','post_chart_release'].includes(f))?'quarantined':'accepted'};
}
