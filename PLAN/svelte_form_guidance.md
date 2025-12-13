## Svelte Form Guidance (Partners)

- Current approach: plain HTML forms with Zod validation on the server; no Superforms. Keep client logic simple and let the server be the single source of truth.
- Shared schema: use `src/lib/validation/partner.ts` for both add and edit; schemas normalize code to uppercase and coerce checkbox booleans.
- Client-side validation: TanStack Form + Zod (via `src/lib/forms/zodAdapter.ts`) on add/edit pages, with per-field realtime errors stored in a Svelte store (`$fieldErrors`). Inputs validate on change, mark touched, and surface inline messages.
- Routes:
  - Add: `/partners/add` (`+page.server.ts` does Zod validation, uniqueness check, redirect 303 to `/partners` on success).
  - Edit: `/partners/[id]/edit` (loads partner, validates with shared schema, enforces unique code, redirects 303 back to `/partners`).
  - List: `/partners` shows search and links to add/edit; no Superforms or client adapters.
- Validation feedback: errors returned as `errors` + `values` in action data; inputs show first error per field. Keep phone pattern `[0-9+()\-\\s]{6,20}` and email max 255.
- Redirects: use `redirect(303, '/partners')` after successful create/update to avoid “validator.validate”/adapter issues seen with Superforms.
- Testing/checks: `npm run check` passes; run `npm run dev` to exercise add/edit flows manually.
- Accessibility: all fields have `id`/`for` pairing, `aria-invalid`, and `aria-describedby` when errors exist; search input has sr-only label plus `aria-label`.
