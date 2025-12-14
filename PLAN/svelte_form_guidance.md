## Svelte Form Guidance (Partners)

- Current approach: plain HTML forms with Zod validation on the server; TanStack Form + Zod on the client for realtime feedback. No Superforms.
- Shared schemas in `src/lib/validation/partner.ts`:
  - Create/edit schemas exclude auto-generated fields (partner code now comes from a DB sequence).
  - Boolean coercion and phone/email constraints live here.
- Client-side validation: TanStack Form + `zodAdapter` on add/edit pages, per-field realtime errors in a Svelte store (`$fieldErrors`), validate on change, mark touched, show inline messages.
- Auto-generated fields: partner code is created server-side (sequence starting at 11); not inputtable. Show read-only in edit if needed.
- Routes:
  - Add: `/partners/add` validates with Zod, saves, audit logs, redirects 303 to `/partners`.
  - Edit: `/partners/[id]/edit` loads current data, validates editable fields only, audit logs, redirects 303 to `/partners`.
  - List: `/partners` search + links; `/audit-log` is paginated (national admins).
- Validation feedback: server returns `{ values, errors }`; client hydrates them and mirrors constraints. Phone pattern `[0-9+()\-\\s]{6,20}`; email max 255.
- Accessibility: every field has `id`/`for`, `aria-invalid`, `aria-describedby` when errors exist; search input has sr-only label + `aria-label`.
- Redirects: use `redirect(303, '/partners')` after success to avoid stale form state.
- Testing/checks: `npm run check`; manual via `npm run dev`.

### Reactivity guidance (TanStack Form + Svelte)
- Avoid using `formApi.getFieldValue('x')` directly inside Svelte markup conditions like `{#if ...}` or `{#each ...}`. It’s just a function call and does not create a reactive dependency, so the UI may not update when the field changes.
- Prefer one of these patterns for reactive UI:
  - **Local reactive state**: keep a local variable (e.g. `let selectedRole`) updated in the field’s `on:change` handler and during hydration; use `selectedRole` for conditional rendering.
  - **Field state**: render conditional UI inside the relevant `<Field name="...">` snippet and use `field.state.value` (this is reactive because the snippet re-renders with field state).
  - **Store/derived** (if you introduce one): subscribe to TanStack form state and derive values; use `$storeValue` in markup.
- When using `use:enhance`, the page component often does not remount after submit. If you display server-returned `form` data, ensure you:
  - call `update()` in the enhance callback, and
  - re-hydrate `values/errors` when the `form` prop changes (e.g. `$: if (form) hydrateFromServer(form.values, form.errors)`).
- For “start fresh” flows (e.g. “Add another …”), navigate with a query param (e.g. `?new=1`) and have `load` return a `reset` flag; then call `formApi.reset()` on the client when `reset` is true.

### Steps to build a new form (TanStack + Zod pattern)
1) **Define schema** (`src/lib/validation/<entity>.ts`), include coercions/normalization; omit auto-generated fields from create/edit schemas.
2) **Field helpers**: map field schemas and add any client-only checks if needed (e.g., uniqueness lists).
3) **Server load**: return `values`, `errors` (null/ActionData), and any extra data needed for client checks.
4) **Client setup**: `createForm(() => ({ defaultValues, validators: { onChange: zodAdapter(schema), onSubmit: zodAdapter(schema) }, onSubmit: () => formEl?.submit() }))`.
5) **Field rendering**: wrap inputs with `Field`, bind value, mark touched on input, call `validateFieldValue(name, value)` to sync `$fieldErrors`.
6) **Inline errors**: display first error per field from `$fieldErrors`; hydrate server errors into meta + store on mount.
7) **Submit**: prevent default, call `formApi.handleSubmit()`, let server action persist and final-validate.
8) **Auditing**: use `logAudit` (`src/lib/server/audit.ts`) to record old/new snapshots on create/update.
