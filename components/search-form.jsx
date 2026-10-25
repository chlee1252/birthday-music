'use client';
import {useTransition} from 'react';
import {useRouter} from 'next/navigation';
import {SearchLoading} from './search-loading.jsx';
export function SearchForm({children}){
 const router=useRouter(),[pending,startTransition]=useTransition();
 return <><form action="/" method="get" className="birthday-form" onSubmit={event=>{
  event.preventDefault();const date=new FormData(event.currentTarget).get('date');
  startTransition(()=>router.push('/?'+new URLSearchParams({date})));
 }}>{children}</form>{pending&&<SearchLoading/>}</>;
}
