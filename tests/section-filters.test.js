import test from 'node:test';
import assert from 'node:assert/strict';
import {readFilters,sectionUrl} from '../lib/section-filters.js';
test('each category defaults to Korean and ignores invalid or repeated region values',()=>{
 const filters=readFilters({same:'pop',artists:['pop','kr'],year:'unknown'});
 assert.equal(filters.same,'pop');assert.equal(filters.exact,'kr');assert.equal(filters.artists,'kr');assert.equal(filters.year,'kr');
});
test('changing one chip preserves other category choices and anchors the selected category',()=>{
 const filters=readFilters({same:'pop',year:'pop'});
 const url=new URL(sectionUrl('2000-05-16',filters,'artists','pop','birthday-artists'),'http://localhost');
 assert.equal(url.searchParams.get('same'),'pop');assert.equal(url.searchParams.get('year'),'pop');assert.equal(url.searchParams.get('artists'),'pop');assert.equal(url.hash,'#birthday-artists');
 const reset=new URL(sectionUrl('2000-05-16',filters,'same','kr','birthday-same'),'http://localhost');
 assert.equal(reset.searchParams.has('same'),false);assert.equal(reset.searchParams.get('year'),'pop');
});
test('chip navigation URLs omit hash scrolling',()=>{
 const url=new URL(sectionUrl('2000-05-16',readFilters({}),'same','pop'),'http://localhost');
 assert.equal(url.hash,'');assert.equal(url.searchParams.get('same'),'pop');
});
