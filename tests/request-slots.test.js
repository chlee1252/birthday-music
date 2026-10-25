import test from 'node:test';
import assert from 'node:assert/strict';
import {reserveRequestSlot} from '../lib/request-slots.js';
test('request starts respect the interval without waiting for earlier responses',async()=>{
 const state={},starts=[];let finishFirst;
 const firstResponse=new Promise(resolve=>finishFirst=resolve);
 const first=reserveRequestSlot(state,25).then(()=>{starts.push(Date.now());return firstResponse;});
 await reserveRequestSlot(state,25);starts.push(Date.now());
 assert.equal(starts.length,2);assert.ok(starts[1]-starts[0]>=24);
 finishFirst();await first;
});
