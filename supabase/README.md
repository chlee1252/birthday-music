# Music catalog setup

The application uses Supabase **PostgreSQL**, via a server-only transaction-pooler connection. It does not expose tables, SQL, ingestion controls or database credentials to browsers. There is no Supabase Auth requirement for visitors.

## Connect

1. Create a Free project in the Supabase dashboard, preferably in the same region as the Vercel function (Seoul).
2. From **Connect → Transaction pooler**, copy the connection URI. URL-encode the database password and set `MUSIC_DATABASE_CA` to the PEM certificate downloaded from **Database Settings → SSL configuration**. The connection verifies the certificate and hostname. When using a custom CA, SSL URI parameters are removed so node-postgres does not overwrite the verified SSL configuration. Keep the URI in `.env.local` as `MUSIC_DATABASE_URL`, and in Vercel's server environment variables. Do not use a `NEXT_PUBLIC_` prefix or commit the URI.
3. Run `npm run catalog -- migrate` and `npm run catalog -- seed` from this project. Migration creates only the private `music_catalog` schema. All tables have RLS enabled; the app connects through the database owner. There are no browser grants or public ingestion policies.
4. Run `npm run catalog -- ingest --jobs 200 --seconds 600 --target 1000`. `--target` counts distinct lowercased song-title/artist-name pairs, while `tracks` includes source-specific album editions. Jobs are resumable and idempotent; repeat the command to continue. `npm run catalog -- stats` reports real counts and total table/index/TOAST size.
5. Set a random `CRON_SECRET` in the server environment. `/api/catalog/sync` accepts only `Authorization: Bearer <CRON_SECRET>` and performs at most 20 jobs / approximately 50 seconds of scheduling per invocation. In-flight requests may finish after that scheduling window. The Vercel daily cron runs at 19:00 UTC (04:00 KST); bulk loading should use the CLI instead.

Use Node 22.9+ for the CLI's optional `.env.local` loader. PostgreSQL parameters are bound values, and the pool is capped at two connections per server instance. No named prepared statements are used.

## Pilot transfer

An initial local pilot can be copied without repeating provider requests:

```
MUSIC_CATALOG_SOURCE_URL=postgresql://127.0.0.1:55439/birthday_catalog \
node --env-file=.env.local --conditions=react-server scripts/transfer-catalog.mjs
```

`MUSIC_DATABASE_URL` in `.env.local` must point to the destination Supabase project. This copies artists, albums, tracks, chart evidence and jobs in dependency order; existing IDs are preserved. Worker leases are not copied. No raw provider payloads, music files or image files are transferred. Stop the local ingestion worker before transferring for stable pilot counts.

## What is indexed

- Apple: a seed list of popular artist **names**, verified against their Apple artist ID; albums and songs fetched independently of Wikidata/MusicBrainz. Ambiguous identities fail for review rather than selecting an arbitrary namesake. Album lookups are capped by Apple's 200-result limit; the index is not exhaustive.
- Melon: 100 popular songs per seeded year, with each song's release information fetched separately. Chart credits do not establish a person's birthday identity.
- Day, month, year and unknown date precision are preserved. Only day-precision records participate in exact-date/month-day searches. An explicit `January 1` supplied by a provider is recorded as supplied; this cannot prove that its metadata is historically accurate. Sources remain visible for review.
- Source-specific IDs and album editions remain separate; a streaming/reissue date is never asserted to be the original single release date. Visible results use the earliest accepted day-precision record collected for the same song and artist. Remaster suffixes are normalized; live/remix recordings stay separate. A release year later than a known chart appearance is quarantined across matching provider records. This is the earliest collected evidence, not proof of the worldwide original single date.
- Catalog hits return up to 10 tracks directly and carry `limited: true`: the catalog does not represent every release. No hits use existing live discovery. Database failures fall back to live discovery but remain distinguishable from an empty successful search.
- The artist-birthday and annual-chart sections still use their existing providers. This first catalog migration accelerates release sections; it does not eliminate all external requests from a full search.
- Successful jobs are eligible for refresh after 30 days; failed jobs back off from 5 minutes to a day. One durable worker lease prevents concurrent ingestion; Apple calls reserve shared start slots at least 3.2 seconds apart. Melon calls are limited to one per second; three consecutive network/availability failures suspend Melon for five minutes while Apple work continues. The legacy live Apple client still has an instance-local limiter, so total traffic must be monitored before scaling.

## Validation

`npm test` includes catalog normalization, identity, fallback and sync authorization tests.

For a real SQL integration check, create a separate local database named `birthday_catalog_test`, then run:

```
MUSIC_DATABASE_URL=postgresql://127.0.0.1:55439/birthday_catalog_test \
node --conditions=react-server scripts/test-catalog.mjs
```

The integration script refuses a non-local or differently named database. It verifies exact dates, same month/day, leap days, regions, precision, idempotency, transactional rollback, worker exclusion and RLS configuration.

## Quality audit

`npm run catalog -- reindex` recomputes canonical identities, editions, chart evidence and quarantine flags. `npm run catalog -- audit` reports searchable songs, month/day coverage, missing dates, chart coverage, provider conflicts and failed jobs. Keep source dates intact; uncertain dates must not be filled with invented January 1 values. Album cover URLs are referenced remotely; media is not copied.
