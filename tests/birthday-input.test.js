import test from 'node:test';
import assert from 'node:assert/strict';
import {formatBirthdayInput,birthdayCaret} from '../lib/birthday-input.js';
test('numeric typing and pasted dates produce the same dotted date',()=>{
 for(const value of ['19951127','1995.11.27','1995-11-27','1995/11/27'])assert.equal(formatBirthdayInput(value),'1995.11.27');
 assert.equal(formatBirthdayInput('19951'),'1995.1');assert.equal(formatBirthdayInput('1995112'),'1995.11.2');
 assert.equal(formatBirthdayInput('1995112700'),'1995.11.27');assert.equal(formatBirthdayInput(''), '');
});
test('caret follows the edited digit instead of jumping to the end',()=>{
 assert.equal(birthdayCaret('1995.11.27',5),6);assert.equal(birthdayCaret('1995.11.27',4),4);assert.equal(birthdayCaret('1995.11.27',0),0);
});
