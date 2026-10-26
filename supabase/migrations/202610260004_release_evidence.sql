begin;
alter table music_catalog.tracks add column if not exists first_chart_year integer;
create index if not exists chart_entries_track on music_catalog.chart_entries(track_id,year);
update music_catalog.tracks t set first_chart_year=c.year from (select track_id,min(year) as year from music_catalog.chart_entries group by track_id) c where t.id=c.track_id;
commit;
