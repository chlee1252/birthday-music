import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeRecordings,recordingQuery,koreanArtists} from '../lib/music-policy.js';
const id='11111111-1111-1111-1111-111111111111';
const iu='b9545342-1e6d-4dae-84ac-013374ad8d7c';
const recording={id,title:'English title','first-release-date':'2017-04-21','artist-credit':[{name:'IU',artist:{id:iu}}]};
test('online classification uses verified artist IDs, not scripts or spoofed names',()=>{
 const list=normalizeRecordings({recordings:[recording]},'2017');
 assert.equal(list[0].region,'kr');
 assert.equal(list[0].artist,'아이유');
 assert.deepEqual(normalizeRecordings({recordings:[{...recording,'artist-credit':[{name:'아이유',artist:{id:'unknown'}}]}]},'2017'),[]);
 assert.deepEqual(normalizeRecordings({recordings:[{...recording,'artist-credit':[]}]},'2017'),[]);
});
test('exact date rejects partial or mismatched dates even for approved artists',()=>{
 assert.equal(normalizeRecordings({recordings:[recording]},'2017-04-21').length,1);
 assert.equal(normalizeRecordings({recordings:[recording]},'2017-04-22').length,0);
 assert.equal(normalizeRecordings({recordings:[{...recording,'first-release-date':'2017'}]},'2017-04-21').length,0);
});
test('query always restricts API search to the approved Korean artist roster',()=>{
 const query=recordingQuery('2017');
 assert.ok(query.startsWith('firstreleasedate:2017 AND ('));
 for(const artist of Object.keys(koreanArtists))assert.ok(query.includes('arid:'+artist));
 assert.throws(()=>recordingQuery('2017 OR *'));
});
