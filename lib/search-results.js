// Start both regions and every category together; render only after all settle.
export async function collectSearchResults(date,{releases,artists,chart}){
 const regions=['kr','pop'],year=Number(date.slice(0,4));
 const releaseTasks=Object.fromEntries(regions.map(region=>[region,releases(date,region)]));
 const artistTasks=Object.fromEntries(regions.map(region=>[region,artists(date,region)]));
 const specs=[['year',0,'태어난 해'],['ten',10,'10년 전'],['twenty',20,'20년 전']];
 const annual=specs.map(([key,offset,label])=>({key,id:`chart-${key}`,title:`${year-offset}년`,label,year:year-offset,tasks:Object.fromEntries(regions.map(region=>[region,chart(year-offset,region==='pop'?'POP':'KPOP')]))}));
 const sections=[...['exact','same'].map(mode=>({key:mode,id:`birthday-${mode}`,title:mode==='exact'?'같은 날 태어난 노래':'다른 해, 같은 날짜',label:mode==='exact'?date.replaceAll('-','.'):`${Number(date.slice(5,7))}월 ${Number(date.slice(8,10))}일`,tasks:Object.fromEntries(regions.map(region=>[region,releaseTasks[region].then(rows=>rows.find(row=>row.mode===mode))]))})),{key:'artists',id:'birthday-artists',title:'생일이 같은 가수',label:'같은 생일, 다른 목소리',tasks:artistTasks},...annual];
 return Promise.all(sections.map(async({tasks,...section})=>({...section,regions:Object.fromEntries(await Promise.all(regions.map(async region=>[region,await tasks[region]])))})));
}
