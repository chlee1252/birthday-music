import test from 'node:test';
import assert from 'node:assert/strict';
import {parseSectionRequest,searchSection} from '../lib/section-search.js';
test('section retry only calls its category and region, including the release mode',async()=>{
 for(const category of ['exact','same','artists','year','ten','twenty']){
  const calls=[],result={status:'ok',tracks:[]};
  const got=await searchSection({date:'2014-01-01',category,region:'pop'},{
   releases:async(...args)=>{calls.push(['releases',...args]);return [result];},
   artists:async(...args)=>{calls.push(['artists',...args]);return result;},
   chart:async(...args)=>{calls.push(['chart',...args]);return result;}
  });
  assert.equal(got,result);assert.equal(calls.length,1);
  if(['exact','same'].includes(category))assert.deepEqual(calls[0],['releases','2014-01-01','pop',category]);
  else if(category==='artists')assert.deepEqual(calls[0],['artists','2014-01-01','pop']);
  else assert.deepEqual(calls[0],['chart',2014-({year:0,ten:10,twenty:20}[category]),'POP']);
 }
});
test('invalid date, category and region never reach providers',()=>{
 for(const query of ['date=2014-02-30&category=exact&region=pop','date=2014-01-01&category=all&region=pop','date=2014-01-01&category=exact&region=anything'])assert.equal(parseSectionRequest(new URLSearchParams(query)),null);
 assert.deepEqual(parseSectionRequest(new URLSearchParams('date=2014.01.01&category=exact&region=kr')),{date:'2014-01-01',category:'exact',region:'kr'});
});
