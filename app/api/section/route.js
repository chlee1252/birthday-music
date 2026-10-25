import {parseSectionRequest,searchSection} from '../../../lib/section-search.js';
import {getReleaseConnections,getBirthdayArtists} from '../../../lib/birthday-provider.js';
import {getChart} from '../../../lib/chart-provider.js';
export const maxDuration=120;
export async function GET(request){
 const input=parseSectionRequest(new URL(request.url).searchParams);
 if(!input)return Response.json({error:'Invalid section request'},{status:400});
 try{
  const result=await searchSection(input,{releases:getReleaseConnections,artists:getBirthdayArtists,chart:getChart});
  return Response.json(result,{headers:{'Cache-Control':'no-store'}});
 }catch{return Response.json({error:'Section lookup failed'},{status:502});}
}
