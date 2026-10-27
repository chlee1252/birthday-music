-- Collection is fail-closed until usage has been reviewed. Quotas are shared
-- between CLI and cron workers; this does not meter website traffic or egress.
alter table music_catalog.worker
 add column if not exists budget_reviewed_until timestamptz,
 add column if not exists database_bytes_limit bigint not null default 300000000 check(database_bytes_limit between 1 and 300000000),
 add column if not exists budget_day date,
 add column if not exists daily_job_attempts integer not null default 0,
 add column if not exists daily_job_limit integer not null default 6000 check(daily_job_limit between 1 and 6000);
