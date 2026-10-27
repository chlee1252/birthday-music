import 'server-only';
import {database} from './database.js';
import {chartUrl} from '../charts.js';

export async function findCatalogChartArchive(year,genre='KPOP'){
 if(!Number.isInteger(year)||year<1955||year>=new Date().getFullYear()||!['KPOP','POP'].includes(genre))return null;
 const {rows}=await database().query(`select split_part(e.track_id,':',2) as id,e.title,e.artist_name as artist,e.rank,
  coalesce(t.cover_url,j.payload->'track'->>'cover') as cover
  from music_catalog.chart_entries e
  left join music_catalog.tracks t on t.id=e.track_id
  left join music_catalog.jobs j on j.id='melon:track:'||split_part(e.track_id,':',2)
  where e.year=$1 and e.region=$2 order by e.rank limit 100`,[year,genre==='POP'?'pop':'kr']);
 // Date quarantine applies to release-day searches, not historical chart membership.
 // Missing enrichment must not remove ranked songs or substitute a different year.
 if(!rows.length||rows[0].rank!==1||rows.some(r=>!/^\d+$/.test(r.id)))return null;
 return {status:'ok',source:chartUrl(year,genre),origin:'catalog',tracks:rows.map(r=>({...r,source:`https://www.melon.com/song/detail.htm?songId=${r.id}`}))};
}
