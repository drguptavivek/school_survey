## Svelte Form Guidance (Partners)

- Current approach: plain HTML forms with Zod validation on the server; no Superforms. Keep client logic simple and let the server be the single source of truth.
- Shared schema: use `src/lib/validation/partner.ts` for both add and edit; schemas normalize code to uppercase and coerce checkbox booleans.
- Client-side validation: TanStack Form + Zod (via `src/lib/forms/zodAdapter.ts`) on add/edit pages, with per-field realtime errors stored in a Svelte store (`$fieldErrors`). Inputs validate on change, mark touched, and surface inline messages.
- Realtime uniqueness: partner code checked client-side against existing codes passed from the server; duplicate codes show an immediate error before submit.
- Routes:
  - Add: `/partners/add` (`+page.server.ts` does Zod validation, uniqueness check, redirect 303 to `/partners` on success).
  - Edit: `/partners/[id]/edit` (loads partner, validates with shared schema, enforces unique code, redirects 303 back to `/partners`).
  - List: `/partners` shows search and links to add/edit; no Superforms or client adapters.
  - Audit log: `/audit-log` (paginated) lists audit entries; nav link visible to national admins.
- Validation feedback: errors returned as `errors` + `values` in action data; inputs show first error per field. Keep phone pattern `[0-9+()\-\\s]{6,20}` and email max 255.
- Redirects: use `redirect(303, '/partners')` after successful create/update to avoid “validator.validate”/adapter issues seen with Superforms.
- Testing/checks: `npm run check` passes; run `npm run dev` to exercise add/edit flows manually.
- Accessibility: all fields have `id`/`for` pairing, `aria-invalid`, and `aria-describedby` when errors exist; search input has sr-only label plus `aria-label`.

### Steps to build a new form (TanStack + Zod pattern)
1) **Define schema** in `src/lib/validation/<entity>.ts` (Zod), include coercions/normalization.
2) **Expose helpers**: if you need field-level realtime validation, create a field schema map and (optionally) any client-only checks (e.g., uniqueness list).
3) **Server load**: return `values`, `errors` (null/ActionData), and any extra data needed for client checks (e.g., existing codes).
4) **Client setup**: `createForm(() => ({ defaultValues, validators: { onChange: zodAdapter(schema), onSubmit: zodAdapter(schema) }, onSubmit: () => formEl?.submit() }))`.
5) **Field rendering**: wrap inputs with `Field` (TanStack), bind value, mark touched on input, and call `validateFieldValue(fieldName, value)` to update `$fieldErrors`.
6) **Inline errors**: derive from `$fieldErrors[field]`; hydrate server errors into both TanStack meta and the store on mount.
7) **Submit**: prevent default and call `formApi.handleSubmit()`; rely on server actions for persistence and final validation/uniqueness.
- **Auditing**: use `logAudit` (`src/lib/server/audit.ts`) to record old/new snapshots on create/update. Pass `oldData` and `newData` from actions; partner add/edit already implement this pattern.
