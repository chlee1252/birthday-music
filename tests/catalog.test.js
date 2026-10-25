import test from 'node:test';
import assert from 'node:assert/strict';
import {parseDate,selectTracks,tracks} from '../lib/catalog.js';
const today=new Date(2026,9,25);
test('dates: dots, leap years, invalid calendar dates, future and lower bound',()=>{
 assert.equal(parseDate('1995.11.27',today),'1995-11-27');
 assert.equal(parseDate('2000-2-29',today),'2000-02-29');
 for(const d of ['1900-02-29','1995-11-31','2026-10-26','1899-12-31','2024-13-01','2024-00-01','24.1.1','x'])assert.equal(parseDate(d,today),null,d);
 assert.equal(parseDate('2026-10-25',today),'2026-10-25');
});
test('exact day does not borrow other years or partial dates',()=>{
 assert.deepEqual(selectTracks('1995-11-27','exact'),[]);
 assert.deepEqual(selectTracks('2019-11-27','exact').map(t=>t.id),['obsession']);
 assert.deepEqual(selectTracks('1967-01-01','exact'),[]);
});
test('same month/day excludes selected year; birthday uses artist birthday',()=>{
 assert.deepEqual(selectTracks('2000-04-21','same').map(t=>t.id),['palette']);
 assert.deepEqual(selectTracks('1995-11-27','birthday').map(t=>t.id),['hendrix']);
 assert.equal(selectTracks('1995-11-28','birthday').length,0);
});
test('decade offsets use birth year and can switch to current year',()=>{
 assert.deepEqual(selectTracks('1995-11-27','ten').map(t=>t.id),['rule-world']);
 assert.deepEqual(selectTracks('1995-11-27','twenty').map(t=>t.id),['bohemian']);
 const year=new Date().getFullYear()-10;
 assert.equal(selectTracks('1995-11-27','ten',[{date:`${year}-01-01`}],'today').length,1);
});
test('curated tracks have unique identifiers and usable source URLs',()=>{
 assert.equal(new Set(tracks.map(t=>t.id)).size,tracks.length);
 for(const t of tracks){assert.equal(new URL(t.source).protocol,'https:');assert.match(t.date,/^\d{4}(-\d{2}-\d{2})?$/)}
});
