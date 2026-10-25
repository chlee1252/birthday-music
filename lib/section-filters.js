export const filterKeys=['exact','same','artists','year','ten','twenty'];
export function readFilters(params){return Object.fromEntries(filterKeys.map(key=>[key,params[key]==='pop'?'pop':'kr']));}
export function sectionUrl(date,filters,key,region,id){
 const params=new URLSearchParams({date});
 for(const name of filterKeys){const value=name===key?region:filters[name];if(value==='pop')params.set(name,'pop');}
 return '/?'+params.toString()+(id?'#'+id:'');
}
