Drizzle migrations guidance (Postgres)

- Prefer generated migrations: use `npm run db:generate` to capture schema changes, then `npm run db:migrate` to apply. Commit both SQL and `drizzle/meta` snapshot updates.
- When baseline schemas already exist, avoid `CREATE TYPE IF NOT EXISTS` (not supported on PG < 14). Use a DO block to guard enum creation:
  - ```
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1
        FROM pg_type t
        JOIN pg_namespace n ON n.oid = t.typnamespace
        WHERE t.typname = 'area_type' AND n.nspname = 'public'
      ) THEN
        CREATE TYPE "public"."area_type" AS ENUM('rural', 'urban');
      END IF;
    END$$;
    ```
- For a clean reset in dev: `psql "$DATABASE_URL" -c 'DROP SCHEMA public CASCADE; CREATE SCHEMA public; GRANT ALL ON SCHEMA public TO survey_admin; GRANT ALL ON SCHEMA public TO public;'` then `npm run db:migrate`. Ensure `.env` is sourced so `DATABASE_URL` is set.
- Always check applied migrations: `psql "$DATABASE_URL" -c 'SELECT id, tag, created_at FROM drizzle.__drizzle_migrations ORDER BY created_at;'`.
- Avoid hand-editing `drizzle/meta/_journal.json`; let drizzle-kit regenerate it. If you must change a baseline file, regenerate meta by running `npm run db:generate` after edits.
- Keep non-source folders like `.svelte-kit` out of git; migrations and `drizzle/meta` should be tracked.
