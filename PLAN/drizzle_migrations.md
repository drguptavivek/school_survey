Drizzle migrations guidance (Postgres)

Normal workflow
- Generate migrations from schema: `npm run db:generate`.
- Apply to DB: `npm run db:migrate`.
- Commit both `drizzle/*.sql` and `drizzle/meta/*`.
- Verify state: `psql "$DATABASE_URL" -c 'SELECT id, hash, created_at FROM drizzle.__drizzle_migrations ORDER BY id;'`.

When existing DB is missing recorded migrations
- If `drizzle.__drizzle_migrations` only has older hashes but schema is missing later changes, make the migration idempotent (IF NOT EXISTS guards, DO blocks) so it can re-run safely.
- Manually apply the SQL: `psql "$DATABASE_URL" -f drizzle/00XX_name.sql`.
- Insert or update the hash in `drizzle.__drizzle_migrations` to match `shasum -a 256 drizzle/00XX_name.sql` so future `db:migrate` no-ops:
  - `psql "$DATABASE_URL" -c "INSERT INTO drizzle.__drizzle_migrations (hash, created_at) VALUES ('<hash>', <timestamp_ms>) ON CONFLICT DO NOTHING;"`.
  - Or `UPDATE ... SET hash='<hash>' WHERE id=<id>;` if the row exists with a different hash.

Enum / type safety
- PG < 14 lacks `CREATE TYPE IF NOT EXISTS`; wrap enum creation in a DO guard:
  ```
  DO $$
  BEGIN
    IF NOT EXISTS (
      SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace
      WHERE t.typname = 'area_type' AND n.nspname = 'public'
    ) THEN
      CREATE TYPE "public"."area_type" AS ENUM('rural', 'urban');
    END IF;
  END$$;
  ```
- When changing enum values, temporarily cast column to text, drop/recreate the type, then cast back.

Dev reset
- For a clean local reset: `psql "$DATABASE_URL" -c 'DROP SCHEMA public CASCADE; CREATE SCHEMA public; GRANT ALL ON SCHEMA public TO survey_admin; GRANT ALL ON SCHEMA public TO public;'` then `npm run db:migrate` (ensure `DATABASE_URL` is set).

Hygiene
- Do not hand-edit `drizzle/meta/_journal.json`; regenerate with `npm run db:generate` if needed.
- Keep non-source folders like `.svelte-kit` out of git; migrations and `drizzle/meta` should be tracked.
