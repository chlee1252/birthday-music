'use client';
export default function Error({reset}){return <main className="loading"><h1>음악을 불러오지 못했어요</h1><p>잠시 후 다시 시도해주세요.</p><button className="primary" onClick={()=>reset()}>다시 시도</button><a href="/">처음으로</a></main>}
