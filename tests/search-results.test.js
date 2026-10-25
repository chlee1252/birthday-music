import test from 'node:test';
import assert from 'node:assert/strict';
import {collectSearchResults} from '../lib/search-results.js';
import {cacheable} from '../lib/server-cache.js';
test('all six categories have both regions ready before the result resolves',async()=>{
 let releasePop;const gate=new Promise(resolve=>releasePop=resolve),calls=[];let complete=false;
 const result=collectSearchResults('2014-01-01',{
  releases:async(date,region)=>{calls.push('releases:'+region);if(region==='pop')await gate;return ['exact','same'].map(mode=>({mode,status:'ok',tracks:[{id:region+mode}]}));},
  artists:async(date,region)=>{calls.push('artists:'+region);return {status:'ok',tracks:[]};},
  chart:async(year,region)=>{calls.push(`${year}:${region}`);return {status:'ok',tracks:[]};}
 }).then(r=>{complete=true;return r;});
 await new Promise(resolve=>setImmediate(resolve));
 assert.equal(complete,false);assert.equal(calls.length,10);
 for(const year of [2014,2004,1994])for(const region of ['KPOP','POP'])assert.ok(calls.includes(`${year}:${region}`));
 releasePop();const sections=await result;
 assert.equal(sections.length,6);assert.ok(sections.every(s=>s.regions.kr&&s.regions.pop));
 assert.equal(sections[0].regions.pop.tracks[0].id,'popexact');
});
test('nested failures cannot enter the shared successful-results cache',()=>{
 assert.equal(cacheable([{regions:{kr:{status:'ok',tracks:[]},pop:{status:'partial',issues:[{code:'TIMEOUT'}]}}}]),false);
 assert.equal(cacheable([{regions:{kr:{status:'ok',tracks:[]},pop:{status:'ok',tracks:[]}}}]),true);
});
