import 'server-only';
import {database} from './database.js';

// Reserve before every job, including retries. An expired usage review or a
// failed query must not silently allow more collection.
export async function reserveCollectionBudget(){
 const {rows}=await database().query(`with usage as (
  select pg_database_size(current_database()) as bytes,(now() at time zone 'UTC')::date as day
 ), reserved as (
  update music_catalog.worker w set budget_day=u.day,
   daily_job_attempts=case when w.budget_day=u.day then w.daily_job_attempts+1 else 1 end
  from usage u where w.id=1 and w.budget_reviewed_until>now()
   and u.bytes<w.database_bytes_limit
   and (w.budget_day is distinct from u.day or w.daily_job_attempts<w.daily_job_limit)
  returning w.id
 ) select exists(select 1 from reserved) allowed,
  case when w.budget_reviewed_until is null or w.budget_reviewed_until<=now() then 'USAGE_REVIEW_REQUIRED'
   when u.bytes>=w.database_bytes_limit then 'DATABASE_SIZE_LIMIT'
   else 'DAILY_JOB_LIMIT' end as reason
 from music_catalog.worker w cross join usage u where w.id=1`);
 return rows[0]||{allowed:false,reason:'USAGE_REVIEW_REQUIRED'};
}
