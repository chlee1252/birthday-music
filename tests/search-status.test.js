import test from 'node:test';
import assert from 'node:assert/strict';
import {emptyMessage} from '../lib/search-status.js';
test('empty records, incomplete lookup and provider timeout remain distinct',()=>{
 assert.equal(emptyMessage('ok'),'조회한 데이터에서 일치하는 곡이 없어요');
 assert.equal(emptyMessage('empty'),'검색 결과를 확인하지 못했어요');
 assert.equal(emptyMessage('partial'),'일부 검색을 완료하지 못했어요');
 assert.equal(emptyMessage('unavailable',[{code:'TIMEOUT'}]),'검색 서버 응답이 늦어요');
 assert.equal(emptyMessage('unavailable',[{code:'HTTP_503'}]),'검색을 완료하지 못했어요');
});
