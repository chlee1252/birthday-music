import test from 'node:test';
import assert from 'node:assert/strict';
import {parseDate} from '../lib/catalog.js';
import {readSearch,queryTarget,resultsFor} from '../lib/search.js';
test('accepts numeric mobile input and rejects invalid or repeated parameters',()=>{
 assert.equal(parseDate('19951127'),'1995-11-27');
 assert.equal(parseDate('20010229'),null);
 assert.equal(readSearch({date:['1995-11-27','2020-11-27']}).date,null);
 assert.equal(readSearch({date:'19951127',mode:'__proto__'}).mode,'all');
});
test('server searches use correct targets and keep curated-only categories separate',()=>{
 const search=readSearch({date:'1995-11-27'});
 assert.equal(queryTarget(search),'1995');
 assert.equal(queryTarget({...search,mode:'exact'}),'1995-11-27');
 assert.equal(queryTarget({...search,mode:'ten'}),'1985');
 assert.equal(queryTarget({...search,mode:'birthday'}),null);
 assert.equal(queryTarget({...search,mode:'same'}),null);
 assert.equal(queryTarget({...search,mode:'twenty',baseline:'today'},new Date(2026,9,25)),'2006');
});
test('domestic songs precede overseas selections and unverified API songs are excluded',()=>{
 const search=readSearch({date:'19951127',mode:'year'});
 const unverified={id:'unknown',title:'Unknown',artist:'Someone',date:'1995',region:'unknown'};
 const injected={...unverified,region:'global',featured:true};
 const list=resultsFor(search,[unverified,injected]);
 assert.deepEqual(list.map(t=>t.id),['wrong-meeting','beautiful-goodbye','wonderwall']);
 assert.equal(resultsFor({...search,region:'kr'}).every(t=>t.region==='kr'),true);
 assert.deepEqual(resultsFor({...search,region:'global'}).map(t=>t.id),['wonderwall']);
 assert.equal(resultsFor({...search,mode:'exact'},[unverified]).length,0);
});
test('verified domestic results merge once, without confusing English titles with overseas songs',()=>{
 const search=readSearch({date:'20170421',mode:'year'});
 const t={id:'online',title:'English title',artist:'아이유',date:'2017',region:'kr',artistIds:['b9545342-1e6d-4dae-84ac-013374ad8d7c']};
 const base=resultsFor(search).length;
 assert.equal(resultsFor(search,[t,t]).length,base+1);
 assert.equal(resultsFor(search,[{...t,artistIds:['unverified']}]).length,base);
 assert.equal(resultsFor({...search,region:'global'},[t]).length,0);
});
