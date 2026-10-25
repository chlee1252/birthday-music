'use client';
import {useRef,useState} from 'react';
import {ChevronDown,ChevronUp} from 'lucide-react';
export function ExpandableTracks({children,count,id}){
 const [expanded,setExpanded]=useState(false),button=useRef(null);
 function toggle(){
  if(expanded){
   const section=button.current.closest('section');
   setExpanded(false);
   requestAnimationFrame(()=>{button.current?.focus({preventScroll:true});if(section.getBoundingClientRect().top<0)section.scrollIntoView({block:'start',behavior:'instant'});});
  }else setExpanded(true);
 }
 return <><div id={`${id}-more`} hidden={!expanded}>{children}</div><button ref={button} type="button" className="expand-tracks" aria-expanded={expanded} aria-controls={`${id}-more`} onClick={toggle}>{expanded?'접기':`더보기 · ${count}곡`}{expanded?<ChevronUp size={16}/>:<ChevronDown size={16}/>}</button></>;
}
