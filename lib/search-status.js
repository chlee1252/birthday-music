export function emptyMessage(status,issues=[]){
 if(status==='unsupported')return '아직 차트가 없어요';
 if(status==='unavailable')return issues.some(i=>i.code==='TIMEOUT')?'검색 서버 응답이 늦어요':'검색을 완료하지 못했어요';
 if(status==='partial')return '일부 검색을 완료하지 못했어요';
 return '조건에 맞는 곡을 찾지 못했어요';
}
