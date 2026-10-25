import test from 'node:test';
import assert from 'node:assert/strict';
import {emptyMessage} from '../lib/search-status.js';
test('empty records, incomplete lookup and provider timeout remain distinct',()=>{
 assert.equal(emptyMessage('ok'),'조건에 맞는 곡을 찾지 못했어요');
 assert.equal(emptyMessage('partial'),'일부 검색을 완료하지 못했어요');
 assert.equal(emptyMessage('unavailable',[{code:'TIMEOUT'}]),'검색 서버 응답이 늦어요');
 assert.equal(emptyMessage('unavailable',[{code:'HTTP_503'}]),'검색을 완료하지 못했어요');
});
