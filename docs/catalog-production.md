# Supabase production rollout

Snapshot: 2026-10-27 00:09 KST. Collection continues, so these are lower bounds after this snapshot.

Production: https://birthday-music-liard.vercel.app

Supabase Seoul Free project is connected over certificate-verified TLS. Private schema, RLS, server-only credentials and authenticated ingestion are enabled. No paid resources were provisioned.

| Region | Source records | Searchable songs | Month/day coverage | Covers |
|---|---:|---:|---:|---:|
| kr | 840 | 649 | 269/366 | 840 |
| pop | 3058 | 2276 | 300/366 | 3058 |

Total: 3,898 source records, 3,418 distinct title/artist pairs, 7,142 annual chart entries. Tables/indexes/TOAST occupy about 15.6 MB. Searchable counts are lower after date precision, chronology, edition and deduplication rules.

309 records fail chart chronology checks; 164 have imprecise dates. These must not be presented as exact-day releases. 138 January 1 records are flagged for review, not automatically declared false. 44 canonical groups have conflicting dates across providers. Four Apple album lookups returned no tracks and remain retryable failures.

## Verification

- 68 unit tests pass, including with production environment variables supplied; unit processes explicitly disconnect from the catalog.
- Isolated PostgreSQL integration tests pass: exact dates, leap days, duplicate editions, cross-provider chart evidence, RLS, rollback, worker exclusion and provider cooldown.
- Vercel deployment dpl_6jzmYbpyEiLFKvmRvMK2Tnp1TsJ1 is READY.
- Production exact release: 1995-01-24 KR returns 잘못된 만남 with cover (catalog, 1.08 s first measured request).
- Production exact release: 2014-10-27 POP returns 10 songs including Blank Space (catalog, 0.35 s).
- Production same month/day: 1995-11-27 KR returns To. X (catalog, 0.09 s).
- These are individual section-request measurements, not full-page averages.
- 2014-01-01 POP still falls back to live discovery: 22 s, partial due to Wikidata timeout. No claim that all dates are now fast or complete.
- Mobile production UI visually checked: date, cover, YouTube link and artist cards render.
- Sync route rejects missing authorization (401); authorized request detects the active collector and returns busy (200), preventing duplicate workers.

## Collection and remaining scope

The local bulk collector writes directly to Supabase, bounded to 7,000 jobs / two hours; the computer must stay running for this process. Korean chart songs have higher priority. It persists progress and provider cooldowns in PostgreSQL. A daily 04:00 KST Vercel job performs at most 20 jobs per run after bulk collection. This daily job is incremental maintenance, not a full catalog rebuild.

This is a functioning production database, but data coverage is not yet exhaustive or independently curated to archival standards. Continue ingestion and review date conflicts before advertising complete birthday coverage. Catalog misses retain live discovery. Artist birthdays and historical chart sections still use their existing live providers.

Resume/inspect with the CLI documented in supabase/README.md. Credentials remain only in ignored local environment files and Vercel secret environment variables. The password handoff file has been emptied.
