import test from 'node:test';
import assert from 'node:assert/strict';
import {sourceRequest} from '../lib/source-request.js';
test('a transient provider 503 retries once and can recover',async t=>{
 let calls=0;t.mock.method(globalThis,'fetch',async()=>++calls===1?new Response('',{status:503}):Response.json({ok:true}));
 assert.deepEqual(await sourceRequest('https://example.com/api',{json:true}),{ok:true});assert.equal(calls,2);
});
test('permanent 404 does not retry and carries safe source diagnostics',async t=>{
 let calls=0;t.mock.method(globalThis,'fetch',async()=>{calls++;return new Response('',{status:404});});
 await assert.rejects(sourceRequest('https://example.com/api?date=private'),e=>e.source==='example.com'&&e.code==='HTTP_404');assert.equal(calls,1);
});
test('DOMException timeout code 23 is normalized and retried',async t=>{
 let calls=0;t.mock.method(globalThis,'fetch',async()=>{calls++;throw new DOMException('Timed out','TimeoutError');});
 await assert.rejects(sourceRequest('https://example.com/api'),e=>e.code==='TIMEOUT'&&e.source==='example.com');assert.equal(calls,2);
});
