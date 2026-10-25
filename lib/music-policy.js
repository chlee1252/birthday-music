// Verified MusicBrainz artist records (country KR), checked 2026-10-25.
// Use identifiers rather than Hangul, aliases, or a release's sales country.
export const koreanArtists = {
 'b9545342-1e6d-4dae-84ac-013374ad8d7c': '아이유',
 '0d79fe8e-ba27-4859-bb8c-2f255f346853': '방탄소년단',
 'b3785a55-2cf6-497d-b8e3-cfa21a36f997': 'EXO',
 'a1eba844-8c3e-4c61-8f54-f5e086b58c01': 'AKMU',
};
export function isApprovedKoreanRecording(track) {
 return track.region === 'kr' && Array.isArray(track.artistIds) && track.artistIds.length > 0 && track.artistIds.every(id=>Object.hasOwn(koreanArtists,id));
}
export function recordingQuery(target) {
 if(!/^\d{4}(-\d{2}-\d{2})?$/.test(target)) throw new Error('Invalid release date');
 return `firstreleasedate:${target} AND (${Object.keys(koreanArtists).map(id=>`arid:${id}`).join(' OR ')})`;
}
export function normalizeRecordings(data, target) {
 return (Array.isArray(data.recordings)?data.recordings:[]).flatMap(t=>{
  if(!/^[\da-f-]{36}$/.test(t.id) || typeof t.title!=='string' || typeof t['first-release-date']!=='string')return [];
  const date=t['first-release-date'];
  if(target.length===10?date!==target:date.slice(0,4)!==target)return [];
  const credits=t['artist-credit'];
  if(!Array.isArray(credits)||!credits.length)return [];
  const artistIds=credits.map(a=>a.artist?.id);
  if(!artistIds.every(id=>Object.hasOwn(koreanArtists,id)))return [];
  return [{id:t.id,title:t.title,artist:artistIds.map(id=>koreanArtists[id]).join(', '),artistIds,date,kind:'최초 발매 기록',region:'kr',color:'mint',source:`https://musicbrainz.org/recording/${t.id}`,sourceName:'MusicBrainz',note:'등록된 국내 아티스트의 최초 발매 기록입니다. 국가와 버전에 따라 발매일이 다를 수 있습니다.'}];
 });
}
