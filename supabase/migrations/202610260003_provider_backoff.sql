begin;
alter table music_catalog.worker add column if not exists melon_failures integer not null default 0;
alter table music_catalog.worker add column if not exists melon_retry_at timestamptz;
alter table music_catalog.worker add column if not exists melon_next_at timestamptz not null default now();
commit;
