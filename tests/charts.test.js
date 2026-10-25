import test from 'node:test';
import assert from 'node:assert/strict';
import {parseChart,chartSections} from '../lib/charts.js';
const row=(rank,id=rank)=>`<tr class="lst50"><td><input name="input_check" value="${id}"><span class="rank">${rank}</span><div class="rank01"><a>Song &amp; ${rank}</a></div><div class="rank02"><a>Artist</a><span style="display:none"><a>Duplicate</a></span></div></td></tr>`;
test('chart parses entities, removes hidden artist duplicates, limits to top ten',()=>{
 const tracks=parseChart(`<table>${Array.from({length:12},(_,i)=>row(i+1)).join('')}${row(1)}</table>`);
 assert.equal(tracks.length,10);assert.equal(tracks[0].title,'Song & 1');assert.equal(tracks[0].artist,'Artist');assert.equal(tracks[9].rank,10);
});
test('missing and malformed chart never produce replacement songs',()=>{
 assert.deepEqual(parseChart('<html>Temporarily unavailable</html>'),[]);
 assert.throws(()=>parseChart(`<table>${row(5)}</table>`));
});
test('sections follow entered year, not example birthday or current year',()=>{
 assert.deepEqual(chartSections(2002).map(s=>[s.year,s.genre]),[[2002,'KPOP'],[1992,'KPOP'],[1982,'KPOP'],[2002,'POP']]);
});
