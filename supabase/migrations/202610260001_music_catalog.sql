begin;
-- Private schema: only the server's database connection can access the catalog.
create schema if not exists music_catalog;
revoke all on schema music_catalog from public;
create table if not exists music_catalog.artists (
 id text primary key, name text not null, region text not null check(region in ('kr','pop')),
 source_url text not null, birthday date, birthday_source text, image_url text,
 fetched_at timestamptz not null default now()
);
create table if not exists music_catalog.albums (
 id text primary key, artist_id text not null references music_catalog.artists(id),
 title text not null, source_url text not null, cover_url text, edition text not null default 'catalog',
 fetched_at timestamptz not null default now()
);
create table if not exists music_catalog.tracks (
 id text primary key, album_id text references music_catalog.albums(id),
 artist_id text not null references music_catalog.artists(id), title text not null,
 artist_name text not null, region text not null check(region in ('kr','pop')),
 provider text not null check(provider in ('itunes','melon')),
 release_date date, release_year integer, release_month integer check(release_month between 1 and 12),
 date_precision text not null check(date_precision in ('day','month','year','unknown')),
 release_md integer generated always as ((extract(month from release_date)::integer * 100) + extract(day from release_date)::integer) stored,
 date_basis text not null default 'album', source_url text not null, cover_url text,
 popularity integer not null default 0, fetched_at timestamptz not null default now(),
 check ((date_precision = 'day') = (release_date is not null)),
 check (release_date is null or (release_year is not null and release_month is not null and extract(year from release_date) = release_year and extract(month from release_date) = release_month))
);
create index if not exists tracks_exact on music_catalog.tracks(region,release_date,popularity desc) where release_date is not null;
create index if not exists tracks_month_day on music_catalog.tracks(region,release_md,popularity desc) where release_date is not null;
create index if not exists tracks_artist on music_catalog.tracks(artist_id);
create index if not exists artists_birthday on music_catalog.artists((extract(month from birthday)),(extract(day from birthday))) where birthday is not null;
create table if not exists music_catalog.jobs (
 id text primary key, kind text not null check(kind in ('apple_artist','apple_albums','apple_tracks','melon_chart','melon_track')),
 payload jsonb not null, priority integer not null default 100,
 state text not null default 'pending' check(state in ('pending','done','failed')),
 attempts integer not null default 0, next_run timestamptz not null default now(),
 last_error text, updated_at timestamptz not null default now()
);
create index if not exists jobs_pending on music_catalog.jobs(priority,next_run) where state in ('pending','failed');
create table if not exists music_catalog.worker (
 id integer primary key check(id=1), lease_token text, lease_until timestamptz,
 apple_next_at timestamptz not null default now()
);
insert into music_catalog.worker(id) values(1) on conflict do nothing;
revoke all on all tables in schema music_catalog from public;
alter table music_catalog.artists enable row level security;
alter table music_catalog.albums enable row level security;
alter table music_catalog.tracks enable row level security;
alter table music_catalog.jobs enable row level security;
alter table music_catalog.worker enable row level security;
commit;
