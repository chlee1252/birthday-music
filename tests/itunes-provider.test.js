import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeItunesReleases} from '../lib/itunes-provider.js';
const candidate={item:{value:'https://www.wikidata.org/entity/Q1'},itemLabel:{value:'PLAY'},artistLabel:{value:'악동뮤지션'},artistNames:['AKMU','악동뮤지션'],date:{value:'2014-04-07T00:00:00Z'}};
const song={kind:'song',trackId:123,collectionId:456,trackName:'200%',artistName:'AKMU',collectionName:'PLAY',releaseDate:'2014-04-07T12:00:00Z',trackViewUrl:'https://music.apple.com/us/album/play/456?i=123',artworkUrl100:'https://is1-ssl.mzstatic.com/image/test.jpg'};
test('independent fallback verifies date, artist and album and namespaces IDs',()=>{
 const result=normalizeItunesReleases([song],candidate);assert.equal(result[0].id,'itunes:123');assert.equal(result[0].date,'2014-04-07');assert.ok(result[0].cover);
 for(const change of [{releaseDate:'2014'},{releaseDate:'2014-04-08'},{artistName:'Other'},{collectionName:'Other'},{trackViewUrl:'https://evil.test'}])assert.deepEqual(normalizeItunesReleases([{...song,...change}],candidate),[]);
 assert.equal(normalizeItunesReleases([{...song,artworkUrl100:'https://evil.test/a.jpg'}],candidate)[0].cover,null);
});
