import test from 'node:test';
import assert from 'node:assert/strict';
import {getReleaseConnections,getBirthdayArtists} from '../lib/birthday-provider.js';
const value=v=>({value:v});
const album=date=>`<li class="album11_li"><a class="thumb"><img src="https://cdnimg.melon.co.kr/a.jpg"></a><dt><a>PLAY</a></dt><dd class="atistname"><div class="ellipsis"><a>AKMU (악뮤)</a></div></dd><span album-song-id="42"></span><span class="songname12">200%</span><span class="cnt_view">${date}</span></li>`;
function reset(){
 // Existing discovery tests isolate the additional chart lookup.
 globalThis.__birthdayChartsV2.cache.clear();
 for(let year=1955;year<new Date().getFullYear();year++)globalThis.__birthdayChartsV2.cache.set(`${year}:KPOP`,{expires:Date.now()+60000,value:{status:'ok',tracks:[]}});
globalThis.__birthdayConnections.cache.clear();globalThis.__birthdayConnections.pending.clear();globalThis.__birthdayConnections.mbLast=0;globalThis.__birthdayItunes.cache.clear();globalThis.__birthdayItunes.last=0;}
test('live adapter joins verified aliases and never uses a mismatched date',async t=>{
 reset();t.mock.method(globalThis,'fetch',async input=>{
  const url=new URL(input);
  if(url.hostname==='query.wikidata.org')return Response.json({results:{bindings:[{item:value('https://www.wikidata.org/entity/Q123'),itemLabel:value('PLAY'),artist:value('https://www.wikidata.org/entity/Q456'),artistLabel:value('악동뮤지션'),date:value('2014-04-07T00:00:00Z')} ]}});
  if(url.hostname==='www.wikidata.org')return Response.json({entities:{Q456:{aliases:{en:[{value:'AKMU'}]}}}});
  if(url.hostname==='musicbrainz.org')return Response.json({releases:[{date:'2014-04-08',title:'Wrong date'}]});
  return new Response(album('2014.04.07'));
 });
 const [exact,same]=await getReleaseConnections('2014-04-07');
 assert.equal(exact.tracks[0].title,'200%');assert.equal(exact.tracks[0].date,'2014-04-07');assert.equal(same.tracks.length,0);
});
test('artist birthday must match full birth date, not just artist display name',async t=>{
 reset();t.mock.method(globalThis,'fetch',async input=>{
  const url=new URL(input);
  if(url.hostname==='query.wikidata.org')return Response.json({results:{bindings:[{person:value('https://www.wikidata.org/entity/Q1'),personLabel:value('Singer'),dob:value('1993-05-16T00:00:00Z')} ]}});
  if(url.pathname.includes('/search/'))return new Response(`<table><tr><td><input name="input_check" value="22"><a class="fc_gray">Song</a><div id="artistName"><a href="javascript:melon.link.goArtistDetail('9')">Singer</a></div></td></tr></table>`);
  if(url.pathname.includes('/artist/'))return new Response('<dt>생일</dt><dd>1980.05.16</dd>');
  throw new Error('Must not load a mismatched artist song');
 });
 const result=await getBirthdayArtists('2000-05-16');
 assert.equal(result.tracks.length,0);assert.equal(result.artists.length,1);assert.equal(result.artists[0].name,'Singer');assert.equal(result.artists[0].birthday,'1993-05-16');assert.deepEqual(result.artists[0].tracks,[]);
});
test('source failures are distinguishable from no matching records',async t=>{
 reset();t.mock.method(globalThis,'fetch',async()=>{throw new Error('Offline');});
 assert.equal((await getBirthdayArtists('1995-11-27')).status,'unavailable');
 const releases=await getReleaseConnections('1995-11-27');assert.ok(releases.every(r=>r.status==='unavailable'&&r.tracks.length===0));
});
test('pop results require matching annual chart evidence',async t=>{
 for(const hit of [false,true]){
  reset();globalThis.__birthdayChartsV2?.cache.clear();
  const mock=t.mock.method(globalThis,'fetch',async input=>{
   const url=new URL(input);
   if(url.hostname==='query.wikidata.org')return Response.json({results:{bindings:[{item:value('https://www.wikidata.org/entity/Q123'),itemLabel:value('PLAY'),artist:value('https://www.wikidata.org/entity/Q456'),artistLabel:value('AKMU'),date:value('2014-04-07T00:00:00Z')} ]}});
   if(url.hostname==='www.wikidata.org')return Response.json({entities:{}});
   if(url.hostname==='musicbrainz.org')return Response.json({'release-groups':[]});
   if(url.hostname==='itunes.apple.com')return Response.json({results:[]});
   if(url.pathname.includes('/chart/'))return new Response(`<table><tr class="lst50"><td><input name="input_check" value="${hit?42:99}"><span class="rank">1</span><div class="rank01"><a>Other song</a></div><div class="rank02"><a>Other artist</a></div></td></tr></table>`);
   return new Response(album('2014.04.07'));
  });
  const [exact]=await getReleaseConnections('2014-04-07','pop');
  assert.equal(exact.tracks.length,hit?1:0);if(hit)assert.match(exact.tracks[0].popSource,/chartGenre=POP/);
  mock.mock.restore();
 }
});
test('a failed pop year preserves songs verified in other years and reports partial results',async t=>{
 reset();globalThis.__birthdayChartsV2?.cache.clear();
 t.mock.method(globalThis,'fetch',async input=>{
  const url=new URL(input);
  if(url.hostname==='query.wikidata.org')return Response.json({results:{bindings:[{item:value('https://www.wikidata.org/entity/Q123'),itemLabel:value('PLAY'),artistLabel:value('AKMU'),date:value('2014-04-07T00:00:00Z')} ]}});
  if(url.hostname==='musicbrainz.org')return Response.json({'release-groups':[]});
   if(url.hostname==='itunes.apple.com')return Response.json({results:[]});
   if(url.pathname.includes('/chart/')){
   if(url.searchParams.get('chartDate')==='1990')throw new Error('Offline');
   return new Response('<table><tr class="lst50"><td><input name="input_check" value="42"><span class="rank">1</span><div class="rank01"><a>200%</a></div><div class="rank02"><a>AKMU</a></div></td></tr></table>');
  }
  return new Response(album('2014.04.07'));
 });
 const [exact]=await getReleaseConnections('2014-04-07','pop');
 assert.equal(exact.tracks.length,1);assert.equal(exact.status,'partial');assert.ok(exact.issues.some(i=>i.source==='www.melon.com'));
});
test('pop discovery failure is unavailable, not a successful disabled domestic fallback',async t=>{
 reset();t.mock.method(globalThis,'fetch',async()=>{throw new Error('Offline');});
 const results=await getReleaseConnections('2000-05-16','pop');assert.ok(results.every(r=>r.status==='unavailable'));
});
test('candidate limit is not reported as a connection failure',async t=>{
 reset();t.mock.method(globalThis,'fetch',async input=>{
  if(new URL(input).hostname==='query.wikidata.org')return Response.json({results:{bindings:Array.from({length:7},(_,i)=>({person:value(`https://www.wikidata.org/entity/Q${i+1}`),personLabel:value(`Singer${i}`),dob:value('1993-05-16T00:00:00Z')}))}});
  return new Response('<table></table>');
 });
 const result=await getBirthdayArtists('2000-05-16');assert.equal(result.status,'ok');assert.equal(result.limited,true);assert.deepEqual(result.issues,[]);assert.equal(result.artists.length,6);assert.equal(new Set(result.artists.map(a=>a.id)).size,6);
});
test('failed song detail fetch does not masquerade as no matching artist songs',async t=>{
 reset();t.mock.method(globalThis,'fetch',async input=>{
  const url=new URL(input);
  if(url.hostname==='query.wikidata.org')return Response.json({results:{bindings:[{person:value('https://www.wikidata.org/entity/Q1'),personLabel:value('Singer'),dob:value('1993-05-16T00:00:00Z')} ]}});
  if(url.pathname.includes('/search/'))return new Response(`<table><tr><td><input name="input_check" value="22"><a class="fc_gray">Song</a><div id="artistName"><a href="javascript:melon.link.goArtistDetail('9')">Singer</a></div></td></tr></table>`);
  if(url.pathname.includes('/artist/'))return new Response('<dt>생일</dt><dd>1993.05.16</dd>');
  throw new Error('Offline');
 });
 const result=await getBirthdayArtists('2000-05-16');assert.equal(result.status,'partial');assert.equal(result.tracks.length,0);assert.equal(result.issues[0].code,'NETWORK');
});
test('album 406 uses song album search and verifies artist, album and exact release date',async t=>{
 reset();let details=0;
 t.mock.method(globalThis,'fetch',async input=>{
  const url=new URL(input);
  if(url.hostname==='query.wikidata.org')return Response.json({results:{bindings:[{item:value('https://www.wikidata.org/entity/Q123'),itemLabel:value('PLAY'),artistLabel:value('AKMU'),date:value('2014-04-07T00:00:00Z')}]}});
  if(url.hostname==='musicbrainz.org')return Response.json({releases:[]});
  if(url.pathname==='/search/album/index.htm')return new Response('Missing page',{status:406});
  if(url.pathname==='/search/song/index.htm'){
   assert.equal(url.searchParams.get('section'),'album');
   const row=(id,artist,albumId)=>`<tr><td><input name="input_check" value="${id}"><a class="fc_gray">Song ${id}</a><div id="artistName"><a>${artist}</a></div><a href="javascript:melon.link.goAlbumDetail('${albumId}')">PLAY</a></td></tr>`;
   return new Response('<table>'+row(1,'AKMU',10)+row(2,'AKMU',10)+row(3,'Other artist',20)+row(4,'AKMU',30)+'</table>');
  }
  if(url.pathname==='/song/detail.htm'){
   details++;
   return new Response(`<div class="section_info"><dt>발매일</dt><dd>${url.searchParams.get('songId')==='1'?'2014.04.07':'2014.04.08'}</dd><div class="thumb"><img src="https://cdnimg.melon.co.kr/test.jpg"></div></div>`);
  }
  throw new Error('Unexpected request');
 });
 const [exact]=await getReleaseConnections('2014-04-07');
 assert.equal(exact.status,'ok');assert.deepEqual(exact.issues,[]);
 assert.equal(exact.tracks.length,1);assert.equal(exact.tracks[0].id,'1');
 assert.equal(exact.tracks[0].date,'2014-04-07');assert.ok(exact.tracks[0].cover);
 assert.equal(details,2,'one representative per album, wrong artist excluded before detail lookup');
});
test('Melon outages resolve through an independent Apple API with exact date validation',async t=>{
 reset();globalThis.__birthdayItunes.cache.clear();globalThis.__birthdayItunes.last=0;
 let appleCalls=0;
 t.mock.method(globalThis,'fetch',async input=>{
  const url=new URL(input);
  if(url.hostname==='query.wikidata.org')return Response.json({results:{bindings:[{item:value('https://www.wikidata.org/entity/Q123'),itemLabel:value('PLAY'),artistLabel:value('AKMU'),date:value('2014-04-07T00:00:00Z')}]}});
  if(url.hostname==='musicbrainz.org')return Response.json({releases:[]});
  if(url.hostname==='www.melon.com')return new Response('Unavailable',{status:406});
  if(url.hostname==='itunes.apple.com'){
   appleCalls++;return Response.json({results:[{kind:'song',trackId:123,artistName:'AKMU',trackName:'200%',collectionName:'PLAY',releaseDate:'2014-04-07T12:00:00Z',trackViewUrl:'https://music.apple.com/us/album/play/456?i=123',artworkUrl100:'https://is1-ssl.mzstatic.com/a.jpg'}]});
  }
  throw new Error('Unexpected source');
 });
 const [exact]=await getReleaseConnections('2014-04-07');
 assert.equal(appleCalls,1);assert.equal(exact.status,'ok');assert.equal(exact.tracks[0].provider,'itunes');assert.equal(exact.tracks[0].title,'200%');
});
test('pop uses Apple first and checks every matching album track against popularity evidence',async t=>{
 reset();globalThis.__birthdayChartsV2.cache.clear();let melonAlbumCalls=0;
 t.mock.method(globalThis,'fetch',async input=>{
  const url=new URL(input);
  if(url.hostname==='query.wikidata.org')return Response.json({results:{bindings:[{item:value('https://www.wikidata.org/entity/Q123'),itemLabel:value('Famous Album'),artistLabel:value('Famous Artist'),date:value('2014-04-07T00:00:00Z')}]}});
  if(url.hostname==='musicbrainz.org')return Response.json({'release-groups':[]});
  if(url.hostname==='itunes.apple.com')return Response.json({results:[1,2].map(n=>({kind:'song',trackId:n,artistName:'Famous Artist',trackName:n===1?'Album filler':'Famous hit',collectionName:'Famous Album',releaseDate:'2014-04-07T00:00:00Z',trackViewUrl:`https://music.apple.com/us/album/test/1?i=${n}`}))});
  if(url.pathname.includes('/chart/'))return new Response('<table><tr class="lst50"><td><input name="input_check" value="99"><span class="rank">1</span><div class="rank01"><a>Famous hit</a></div><div class="rank02"><a>Famous Artist</a></div></td></tr></table>');
  melonAlbumCalls++;throw new Error('Must not need Melon catalog');
 });
 const [result]=await getReleaseConnections('2014-04-07','pop','exact');
 assert.equal(result.status,'ok');assert.equal(result.tracks.length,1);assert.equal(result.tracks[0].title,'Famous hit');assert.equal(result.tracks[0].provider,'itunes');assert.equal(melonAlbumCalls,0);
});
test('retrying exact releases does not enrich same-month-day releases',async t=>{
 reset();const titles=[];
 t.mock.method(globalThis,'fetch',async input=>{
  const url=new URL(input);
  if(url.hostname==='query.wikidata.org')return Response.json({results:{bindings:['2014-04-07','2015-04-07'].map((date,i)=>({item:value(`https://www.wikidata.org/entity/Q${i+1}`),itemLabel:value(i?'Unrelated':'PLAY'),artistLabel:value('AKMU'),date:value(date)}))}});
  if(url.hostname==='musicbrainz.org')return Response.json({releases:[]});
  titles.push(url.searchParams.get('q'));return new Response(album('2014.04.07'));
 });
 const result=await getReleaseConnections('2014-04-07','kr','exact');
 assert.equal(result.length,1);assert.equal(result[0].mode,'exact');assert.deepEqual(titles,['PLAY']);
});
test('a widely documented pop song can qualify without a Melon chart entry',async t=>{
 reset();globalThis.__birthdayChartsV2.cache.clear();
 t.mock.method(globalThis,'fetch',async(input,options)=>{
  const url=new URL(input);
  if(url.hostname==='query.wikidata.org'){
   if(options.body.get('query').includes('SELECT DISTINCT ?song'))return Response.json({results:{bindings:[{song:value('http://www.wikidata.org/entity/Q789'),songLabel:value('Famous hit'),artist:value('http://www.wikidata.org/entity/Q456'),links:value('20')}]}});
   return Response.json({results:{bindings:[{item:value('https://www.wikidata.org/entity/Q123'),itemLabel:value('Famous Album'),artist:value('https://www.wikidata.org/entity/Q456'),artistLabel:value('Famous Artist'),date:value('2014-04-07T00:00:00Z')}]}});
  }
  if(url.hostname==='www.wikidata.org')return Response.json({entities:{}});
  if(url.hostname==='musicbrainz.org')return Response.json({'release-groups':[]});
  if(url.hostname==='itunes.apple.com')return Response.json({results:[{kind:'song',trackId:1,artistName:'Famous Artist',trackName:'Famous hit',collectionName:'Famous Album',releaseDate:'2014-04-07T00:00:00Z',trackViewUrl:'https://music.apple.com/us/album/test/1'}]});
  return new Response('<table></table>');
 });
 const [result]=await getReleaseConnections('2014-04-07','pop','exact');
 assert.equal(result.tracks.length,1);assert.equal(result.tracks[0].popSource,'https://www.wikidata.org/entity/Q789');
});
test('Apple outage followed by empty Melon results is incomplete, not no matching songs',async t=>{
 reset();
 t.mock.method(globalThis,'fetch',async input=>{
  const url=new URL(input);
  if(url.hostname==='query.wikidata.org')return Response.json({results:{bindings:[{item:value('https://www.wikidata.org/entity/Q1'),itemLabel:value('Album'),artistLabel:value('Artist'),date:value('2014-04-07')}]}});
  if(url.hostname==='musicbrainz.org')return Response.json({'release-groups':[]});
  if(url.hostname==='itunes.apple.com')return new Response('',{status:403});
  return new Response('<table></table>');
 });
 const [result]=await getReleaseConnections('2014-04-07','pop','exact');
 assert.equal(result.status,'partial');assert.equal(result.tracks.length,0);
 assert.ok(result.issues.some(issue=>issue.source==='itunes.apple.com'&&issue.code==='HTTP_403'));
});
test('release search stops scheduling candidates once ten distinct verified tracks are ready',async t=>{
 reset();let albumCalls=0;
 t.mock.method(globalThis,'fetch',async input=>{
  const url=new URL(input);
  if(url.hostname==='query.wikidata.org')return Response.json({results:{bindings:Array.from({length:24},(_,i)=>({item:value(`https://www.wikidata.org/entity/Q${i+1}`),itemLabel:value(`Album${i}`),artistLabel:value('AKMU'),date:value('2014-04-07')}))}});
  if(url.hostname==='musicbrainz.org')return Response.json({releases:[]});
  albumCalls++;const i=url.searchParams.get('q').replace('Album','');
  return new Response(album('2014.04.07').replace('200%',`Song${i}`).replace('album-song-id="42"',`album-song-id="${100+Number(i)}"`));
 });
 const [result]=await getReleaseConnections('2014-04-07','kr','exact');
 assert.equal(result.tracks.length,10);assert.ok(albumCalls>=10&&albumCalls<=12,`queried ${albumCalls} albums`);
});
test('pop song lookup starts while global popularity evidence is still pending',async t=>{
 reset();globalThis.__birthdayChartsV2.cache.clear();
 let releaseEvidence;const evidence=new Promise(resolve=>releaseEvidence=resolve);
 t.mock.method(globalThis,'fetch',async(input,options)=>{
  const url=new URL(input);
  if(url.hostname==='query.wikidata.org'){
   if(options.body.get('query').includes('SELECT DISTINCT ?song')){await evidence;return Response.json({results:{bindings:[]}});}
   return Response.json({results:{bindings:[{item:value('https://www.wikidata.org/entity/Q1'),itemLabel:value('Album'),artist:value('https://www.wikidata.org/entity/Q2'),artistLabel:value('Artist'),date:value('2014-04-07')}]}});
  }
  if(url.hostname==='www.wikidata.org')return Response.json({entities:{}});
  if(url.hostname==='musicbrainz.org')return Response.json({'release-groups':[]});
  if(url.hostname==='itunes.apple.com'){releaseEvidence();return Response.json({results:[]});}
  return new Response('<table></table>');
 });
 const [result]=await getReleaseConnections('2014-04-07','pop','exact');
 assert.equal(result.status,'ok');
});

test('Melon chart dates find Korean hits missing from both discovery catalogs',async t=>{
 reset();globalThis.__birthdayChartsV2.cache.clear();
 let detailRequests=0;
 t.mock.method(globalThis,'fetch',async input=>{
  const url=new URL(input);
  if(url.hostname==='query.wikidata.org')return Response.json({results:{bindings:[]}});
  if(url.hostname==='musicbrainz.org')return Response.json({releases:[]});
  if(url.pathname.includes('/chart/'))return new Response('<table><tr class="lst50"><td><input name="input_check" value="62462"><span class="rank">1</span><div class="rank01"><a>잘못된 만남</a></div><div class="rank02"><a>김건모</a></div></td></tr></table>');
  detailRequests++;
  return new Response('<div class="section_info"><div class="thumb"><img src="https://cdnimg.melon.co.kr/cover.jpg"></div><dt>발매일</dt><dd>1995.01.24</dd></div>');
 });
 const [match]=await getReleaseConnections('1995-01-24','kr','exact');
 assert.equal(match.status,'ok');assert.equal(match.tracks[0].title,'잘못된 만남');assert.equal(match.tracks[0].date,'1995-01-24');assert.ok(match.tracks[0].cover);
 const [other]=await getReleaseConnections('1995-01-25','kr','exact');
 assert.deepEqual(other.tracks,[]);assert.equal(detailRequests,1);
});
test('Melon hits survive discovery outages while preserving partial status',async t=>{
 reset();globalThis.__birthdayChartsV2.cache.clear();
 t.mock.method(globalThis,'fetch',async input=>{
  const url=new URL(input);
  if(url.hostname!=='www.melon.com')throw new Error('Offline');
  if(url.pathname.includes('/chart/'))return new Response('<table><tr class="lst50"><td><input name="input_check" value="62462"><span class="rank">1</span><div class="rank01"><a>잘못된 만남</a></div><div class="rank02"><a>김건모</a></div></td></tr></table>');
  return new Response('<div class="section_info"><dt>발매일</dt><dd>1995.01.24</dd></div>');
 });
 const [result]=await getReleaseConnections('1995-01-24','kr','exact');
 assert.equal(result.tracks[0].title,'잘못된 만남');assert.equal(result.status,'partial');assert.ok(result.issues.length);
});
