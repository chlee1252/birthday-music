import test from 'node:test';
import assert from 'node:assert/strict';
import {getArtistImages,normalizePortrait} from '../lib/artist-images.js';
test('portrait metadata allows Wikimedia URLs and strips attribution HTML',()=>{
 const info={thumburl:'https://upload.wikimedia.org/test.jpg',descriptionurl:'https://commons.wikimedia.org/wiki/File:Test.jpg',extmetadata:{Artist:{value:'<a href="https://example.org">Photographer</a>'},LicenseShortName:{value:'CC BY 4.0'}}};
 assert.equal(normalizePortrait(info).author,'Photographer');
 assert.ok(normalizePortrait({...info,thumburl:'https://thumb.wikimedia.org/test.jpg'}));
 assert.equal(normalizePortrait({...info,thumburl:'https://elsewhere.example/test.jpg'}),null);
});
test('artist identity selects its P18 portrait, without name matching or deprecated images',async t=>{
 t.mock.method(globalThis,'fetch',async input=>{
  const url=new URL(input);
  if(url.hostname==='www.wikidata.org')return Response.json({entities:{Q1:{claims:{P18:[{rank:'deprecated',mainsnak:{datavalue:{value:'Wrong.jpg'}}},{rank:'normal',mainsnak:{datavalue:{value:'Singer.jpg'}}}]}},Q2:{claims:{}}}});
  assert.equal(url.searchParams.get('titles'),'File:Singer.jpg');
  return Response.json({query:{pages:{1:{title:'File:Singer.jpg',imageinfo:[{thumburl:'https://upload.wikimedia.org/singer.jpg',descriptionurl:'https://commons.wikimedia.org/wiki/File:Singer.jpg'}]}}}});
 });
 const images=await getArtistImages(['https://www.wikidata.org/entity/Q1','https://www.wikidata.org/entity/Q2']);
 assert.ok(images.Q1);assert.equal(images.Q2,undefined);
});
test('optional portrait outage does not reject the music results',async t=>{
 t.mock.method(globalThis,'fetch',async()=>{throw new Error('Offline');});
 assert.deepEqual(await getArtistImages(['https://www.wikidata.org/entity/Q1']),{});
});
