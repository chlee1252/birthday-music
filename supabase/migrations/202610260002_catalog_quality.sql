begin;
alter table music_catalog.tracks add column if not exists canonical_key text;
alter table music_catalog.tracks add column if not exists quality_flags text[] not null default '{}';
alter table music_catalog.tracks add column if not exists review_state text not null default 'accepted' check(review_state in ('accepted','quarantined'));
alter table music_catalog.tracks add column if not exists chart_source text;
create index if not exists tracks_canonical on music_catalog.tracks(canonical_key);
create index if not exists tracks_searchable on music_catalog.tracks(region,release_md,popularity desc) where review_state='accepted' and date_precision='day';
create table if not exists music_catalog.chart_entries (
 year integer not null, region text not null check(region in ('kr','pop')), rank integer not null check(rank between 1 and 100),
 track_id text not null, title text not null, artist_name text not null, source_url text not null,
 fetched_at timestamptz not null default now(),primary key(year,region,rank)
);
alter table music_catalog.chart_entries enable row level security;
revoke all on music_catalog.chart_entries from public;
commit;
