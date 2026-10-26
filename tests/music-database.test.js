import test from 'node:test';
import assert from 'node:assert/strict';
import {releaseDateParts,appleArtist,appleAlbum,appleTrack} from '../lib/catalog/normalize.js';
import {catalogFirstReleases} from '../lib/catalog/search.js';
import {GET as sync} from '../app/api/catalog/sync/route.js';
import {catalogIdentity,albumEdition,trackQuality} from '../lib/catalog/quality.js';
test('quality groups remasters but preserves different live/remix recordings',()=>{
 assert.equal(catalogIdentity('Song (2011 Remaster)','Singer'),catalogIdentity('Song','Singer'));
 assert.notEqual(catalogIdentity('Song (Live)','Singer'),catalogIdentity('Song','Singer'));
 assert.notEqual(catalogIdentity('Song (Remix)','Singer'),catalogIdentity('Song','Singer'));
 assert.equal(albumEdition('Live While We Are Young - Single'),'catalog');
 assert.equal(albumEdition('Live at Wembley'),'live');
});
test('quality quarantines tribute records and preserves uncertain date evidence',()=>{
 const row={title:'Song',artist_name:'Singer',date_precision:'day',release_date:'1995-01-01',cover_url:'https://example.com/a.jpg'};
 assert.equal(trackQuality(row,{edition:'tribute'}).review_state,'quarantined');
 assert.equal(trackQuality(row).review_state,'accepted');
 assert.ok(trackQuality(row).quality_flags.includes('january_first_review'));
 assert.ok(trackQuality({...row,date_precision:'year',release_date:null}).quality_flags.includes('imprecise_date'));
 assert.equal(trackQuality({...row,release_year:2009,first_chart_year:1983}).review_state,'quarantined');
});
test('catalog keeps year/month precision and never invents January 1',()=>{
 assert.equal(releaseDateParts('1995').date_precision,'year');
 assert.equal(releaseDateParts('1995').release_date,null);
 assert.equal(releaseDateParts('1995.04').date_precision,'month');
 assert.equal(releaseDateParts('1995-02-30').date_precision,'unknown');
 assert.equal(releaseDateParts('2000-02-29T08:00:00Z').release_date,'2000-02-29');
});
const artist={id:'itunes:1',name:'Singer',region:'pop',source_url:'https://music.apple.com/us/artist/1'};
const album={id:'itunes:2',artist_id:artist.id,title:'Album',edition:'catalog',source_url:'https://music.apple.com/us/album/2'};
test('Apple discovery rejects ambiguous names and mismatched artist/album identities',()=>{
 const row={wrapperType:'artist',artistId:1,artistName:'Singer',artistLinkUrl:artist.source_url};
 assert.equal(appleArtist([row],'Singer','pop').id,artist.id);
 assert.throws(()=>appleArtist([row,{...row,artistId:2}],'Singer','pop'));
 assert.equal(appleArtist([row,{...row,artistId:2}],'Singer','pop',1).id,'itunes:1');
 assert.throws(()=>appleArtist([row],'Other singer','pop'));
 const song={kind:'song',trackId:3,artistId:1,artistName:'Singer',collectionId:2,trackName:'Song',releaseDate:'1995-01-24T08:00:00Z',trackViewUrl:'https://music.apple.com/us/album/2?i=3'};
 assert.equal(appleTrack(song,album,artist).release_date,'1995-01-24');
 assert.equal(appleTrack({...song,artistId:999},album,artist),null);
 assert.equal(appleTrack({...song,collectionId:999},album,artist),null);
 assert.equal(appleTrack({...song,trackViewUrl:'https://evil.example/song'},album,artist),null);
 assert.equal(appleAlbum({wrapperType:'collection',collectionType:'Album',artistId:1,collectionId:2,collectionName:'Album (Remastered)',collectionViewUrl:album.source_url},artist).edition,'reissue');
});
test('catalog hits avoid upstream calls; misses fall back only for their mode',async()=>{
 const calls=[],track={title:'Song'};
 const live=async(...args)=>{calls.push(args);return [{mode:args[2],status:'ok',tracks:[],issues:[]}];};
 const result=await catalogFirstReleases('1995-01-24','pop',null,live,{configured:true,lookup:async(_d,_r,mode)=>mode==='exact'?[track]:[]});
 assert.equal(result[0].origin,'catalog');assert.equal(result[0].limited,true);
 assert.deepEqual(calls,[['1995-01-24','pop','same']]);
});
test('catalog outage preserves live tracks and distinguishes failure from no matches',async()=>{
 const live=async(_d,_r,mode)=>[{mode,status:'ok',tracks:[{title:'Live song'}],issues:[]}];
 const [result]=await catalogFirstReleases('1995-01-24','kr','exact',live,{configured:true,lookup:async()=>{throw new Error('Disconnected');}});
 assert.equal(result.status,'partial');assert.equal(result.tracks[0].title,'Live song');assert.equal(result.issues[0].code,'DATABASE_UNAVAILABLE');
});
test('unconfigured catalog preserves the existing combined live search',async()=>{
 let calls=0;
 await catalogFirstReleases('1995-01-24','kr',null,async(_d,_r,mode)=>{calls++;assert.equal(mode,null);return [];},{configured:false,lookup:async()=>assert.fail('Not configured')});
 assert.equal(calls,1);
});
test('catalog sync cannot be triggered without the server secret',async t=>{
 const previous=process.env.CRON_SECRET;process.env.CRON_SECRET='test-secret';t.after(()=>{if(previous===undefined)delete process.env.CRON_SECRET;else process.env.CRON_SECRET=previous;});
 for(const headers of [{},{authorization:'Bearer wrong'}])assert.equal((await sync(new Request('https://example.com/api/catalog/sync',{headers}))).status,401);
});
