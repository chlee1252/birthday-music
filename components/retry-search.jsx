'use client';
import {useTransition} from 'react';
import {SearchLoading} from './search-loading.jsx';
import {useRouter} from 'next/navigation';
export function RetrySearch(){const router=useRouter(),[pending,startTransition]=useTransition();return <><button className="retry" disabled={pending} onClick={()=>startTransition(()=>router.refresh())}>{pending?'다시 찾는 중…':'다시 찾기'}</button>{pending&&<SearchLoading/>}</>;}
