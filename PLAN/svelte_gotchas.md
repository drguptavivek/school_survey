## Svelte / SvelteKit gotchas (observed)

- `use:enhance` does not automatically handle redirects; add a `redirect` branch and call `goto(result.location)` or you’ll stay on the same page after a 302 action.
- When disabling form fields with a loading flag, re-enable on `failure`/`error` results so retries are possible after a bad login.
- Logout should be a `+server.ts` endpoint, not a `+page.server.ts` load, to avoid “cookies.set after response generated” errors; clear cookies before redirect.
- Files under `src/routes` cannot have names starting with `+` (aside from route files); place tests in `src/tests/...` to avoid the “Files prefixed with + are reserved” warning.
- If `.svelte-kit/types` goes missing or stale (e.g., ENOENT for `proxy+page.server.ts`), remove `.svelte-kit/types` and run `npm run prepare` to regenerate; avoid keeping tests inside route folders to prevent type churn.
