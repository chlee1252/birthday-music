import {timingSafeEqual} from 'node:crypto';
import {catalogConfigured} from '../../../../lib/catalog/database.js';
import {ingestCatalog} from '../../../../lib/catalog/ingest.js';
export const maxDuration=120;
export async function GET(request){
 const expected=process.env.CRON_SECRET&&`Bearer ${process.env.CRON_SECRET}`,provided=request.headers.get('authorization')||'';
 if(!expected||Buffer.byteLength(expected)!==Buffer.byteLength(provided)||!timingSafeEqual(Buffer.from(expected),Buffer.from(provided)))return Response.json({error:'Unauthorized'},{status:401});
 if(!catalogConfigured())return Response.json({error:'Catalog is not configured'},{status:503});
 try{return Response.json(await ingestCatalog(),{headers:{'Cache-Control':'no-store'}});}catch{return Response.json({error:'Catalog sync failed'},{status:502});}
}
