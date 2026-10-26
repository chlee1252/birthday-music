'use client';
import {formatBirthdayInput,birthdayCaret} from '../lib/birthday-input.js';
function format(input){
 const digitsBefore=input.value.slice(0,input.selectionStart??input.value.length).replace(/\D/g,'').length;
 input.value=formatBirthdayInput(input.value);
 const caret=birthdayCaret(input.value,digitsBefore);
 input.setSelectionRange(caret,caret);
}
export function BirthdayInput(props){
 return <input {...props} onChange={event=>{if(!event.nativeEvent.isComposing)format(event.currentTarget);}} onCompositionEnd={event=>format(event.currentTarget)} onKeyDown={event=>{
  const input=event.currentTarget,start=input.selectionStart,end=input.selectionEnd;
  if(start!==end||start===null||event.nativeEvent.isComposing)return;
  // Deleting a separator also removes the adjacent digit instead of re-inserting the dot forever.
  if(event.key==='Backspace'&&input.value[start-1]==='.'){
   event.preventDefault();input.value=input.value.slice(0,start-2)+input.value.slice(start);input.setSelectionRange(start-2,start-2);format(input);
  }else if(event.key==='Delete'&&input.value[start]==='.'){
   event.preventDefault();input.value=input.value.slice(0,start)+input.value.slice(start+2);input.setSelectionRange(start,start);format(input);
  }
 }}/>;
}
