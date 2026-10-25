import test from 'node:test';
import assert from 'node:assert/strict';
import {matchesDate,fullDate,sameArtist,parseAlbumSearch,parseArtistBirthday,parseSongDetail,parseSongSearch,coverUrl,uniqueTracks} from '../lib/birthday-data.js';
test('full dates are mandatory; same month/day excludes exact birthday and invalid leap days',()=>{
 assert.equal(fullDate('1995'),null);assert.equal(fullDate('2023-02-29'),null);
 assert.equal(matchesDate('1995-11-27','1995-11-27','exact'),true);
 assert.equal(matchesDate('1995-11-27','1995-11-27','same'),false);
 assert.equal(matchesDate('2019-11-27','1995-11-27','same'),true);
 assert.equal(matchesDate('2019-11-28','1995-11-27','same'),false);
 assert.equal(matchesDate('2019-11','1995-11-27','same'),false);
});
test('artist name matching tolerates formatting but not homonyms or partial names',()=>{
 assert.ok(sameArtist('아이유 (IU)','아이유'));assert.ok(sameArtist('BabyMonster','BABYMONSTER'));
 assert.equal(sameArtist('김수진','수진'),false);assert.equal(sameArtist('',''),false);
});
test('album results carry actual representative song, date and album cover',()=>{
 const html=`<li class="album11_li"><a class="thumb" href="javascript:melon.link.goAlbumDetail('123')"><img src="https://cdnimg.melon.co.kr/album.jpg/melon/resize/260"></a><dt><a>Album</a></dt><dd class="atistname"><div class="ellipsis"><a>Artist</a><span><a>Hidden duplicate</a></span></div></dd><span album-song-id="42"></span><span class="songname12">Song &amp; Title</span><span class="cnt_view">2019.11.27</span></li>`;
 const [track]=parseAlbumSearch(html);assert.equal(track.id,'42');assert.equal(track.title,'Song & Title');assert.equal(track.artist,'Artist');assert.equal(track.date,'2019-11-27');assert.match(track.cover,/resize\/160/);
 assert.deepEqual(parseAlbumSearch(html.replace('2019.11.27','2019')),[]);
});
test('biography birth date and song release date use the correct labeled field',()=>{
 assert.equal(parseArtistBirthday('<dl><dt>데뷔</dt><dd>2000.11.27</dd><dt>생일</dt><dd>1979.11.27</dd></dl>'),'1979-11-27');
 assert.equal(parseArtistBirthday('<dl><dt>생일</dt><dd>1979</dd></dl>'),null);
 const detail=parseSongDetail('<div class="section_info"><div class="thumb"><img src="https://cdnimg.melon.co.kr/cover.jpg"></div><dl><dt>발매일</dt><dd>2019.11.27</dd></dl></div>');assert.equal(detail.date,'2019-11-27');assert.equal(detail.cover,'https://cdnimg.melon.co.kr/cover.jpg');
});
test('song search uses credited artist identities rather than title text',()=>{
 const html=`<table><tr><td><input name="input_check" value="55"><a class="fc_gray">Duet with A</a><div id="artistName"><a href="javascript:melon.link.goArtistDetail('12')">B</a><span><a>A</a></span></div></td></tr></table>`;
 assert.deepEqual(parseSongSearch(html)[0].artists,[{name:'B',id:'12'}]);
});
test('unsafe images are rejected and duplicate releases do not inflate results',()=>{
 for(const url of ['javascript:alert(1)','https://evil.test/cover','http://cdnimg.melon.co.kr/x'])assert.equal(coverUrl(url),null);
 assert.equal(uniqueTracks([{title:'Song',artist:'A'},{title:'song',artist:'A'}]).length,1);
});
test('artist search strips role disambiguation without stripping stage-name aliases',async()=>{
 const {artistSearchName}=await import('../lib/birthday-data.js');
 assert.equal(artistSearchName('김수철 (가수)'),'김수철');
 assert.equal(artistSearchName('Artist (singer)'),'Artist');
 assert.equal(artistSearchName('아이유 (IU)'),'아이유 (IU)');
});
