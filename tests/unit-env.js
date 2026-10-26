// Unit fixtures must never depend on or connect to the production catalog.
delete process.env.MUSIC_DATABASE_URL;
delete process.env.MUSIC_DATABASE_CA;
