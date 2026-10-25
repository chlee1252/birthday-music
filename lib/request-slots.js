// Limit request starts, not response completion. Slow requests may overlap safely.
export function reserveRequestSlot(state,interval,tailKey='tail',lastKey='last'){
 const slot=(state[tailKey]||Promise.resolve()).catch(()=>{}).then(async()=>{
  const delay=interval-(Date.now()-(state[lastKey]||0));
  if(delay>0)await new Promise(resolve=>setTimeout(resolve,delay));
  state[lastKey]=Date.now();
 });
 state[tailKey]=slot;
 return slot;
}
