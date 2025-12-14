# School Survey Application - Claude Code Reference

This document provides context for Claude Code to assist with the School Eye Health Survey application development.

## Project Overview

**Nation-wide School Eye Health Survey System** - A large-scale multi-tenant survey application for educational data collection across 60 districts with hierarchical access control.

**Tech Stack:**
- Frontend: Svelte 5 with runes ($state, $derived)
- Framework: SvelteKit (SSR, form actions, file-based routing)
- Backend: Node.js 20
- Database: PostgreSQL 18 in Docker
- ORM: Drizzle ORM with migrations
- Validation: Zod (server + client)
- Authentication: Session-based (httpOnly cookies)
- Forms: TanStack Form + Zod for real-time validation
- Reporting: ExcelJS (Excel), json2csv (CSV)
- Charts: Chart.js for visualizations
- Deployment: Docker Compose with Docker Secrets

---

## User Roles & Hierarchy

### Four Core Roles (Legacy)

1. **national_admin** - Full system access, can create partners and map to districts
2. **data_manager** - View all data, download national-level reports
3. **partner_manager** - Manage teams, upload schools, download partner reports (partner-scoped)
4. **team_member** - Submit survey forms at schools (partner-scoped)

**Key Attributes:**
- `users.partner_id`: Present only for `partner_manager` and `team_member`
- `schools.partner_id`: Every school belongs to exactly one partner
- `districts.partner_id`: Every district belongs to exactly one partner

---

## Role-Based Access Control (RBAC)

### Users Module (1.1-1.4 in role_scoping_plan.md)

**Who can create which roles:**
- `national_admin` can create: all roles
- `partner_manager` can create: `team_member` only
- `data_manager`: cannot create users
- `team_member`: cannot create users

**List/search users:**
- `national_admin` & `data_manager`: see all users across all partners
- `partner_manager` & `team_member`: see only users in their partner (`users.partner_id = currentUser.partnerId`)

**Edit users:**
- `national_admin`: can edit any user
- `data_manager`: can edit any user (current state)
- `partner_manager`: can edit users in their partner only; partner_manager can only assign `team_member` role
- `team_member`: can edit self credentials only

**Credentials/Reset:**
- `national_admin` & `data_manager`: can reset for any user
- `partner_manager`: can reset for users in their partner only
- `team_member`: can reset own credentials only

### Schools Module (2.1-2.3 in role_scoping_plan.md)

**List/search schools:**
- `national_admin` & `data_manager`: all schools
- `partner_manager`: schools in their partner only (`schools.partner_id = currentUser.partnerId`)
- `team_member`: read-only view of schools in their partner

**Create schools:**
- `national_admin` & `data_manager`: any partner/district
- `partner_manager`: within their partner only
- `team_member`: cannot create schools

**Edit schools:**
- `national_admin`: all schools
- `data_manager`: all schools (current state)
- `partner_manager`: schools in their partner only; server enforces `schools.partner_id === currentUser.partnerId`
- `team_member`: cannot edit schools directly

---

## Code Organization & Enforcement Points

### Guards & Policies
- Auth required: `src/routes/(app)/+layout.server.ts`
- Base auth guard: `src/lib/server/guards.ts` (`requireAuth`)
- User access (edit/reset): `src/lib/server/guards.ts` (`requireUserAccess`)
- Role assignment policy: `src/lib/server/guards.ts` (`canAssignUserRole`)
- School edit access: `src/lib/server/guards.ts` (`requireSchoolEditAccess`)

### Route-Level Scoping (Queries)
- Users list: `src/routes/(app)/users/+page.server.ts` (uses `partnerScopeId` filter)
- Schools list: `src/routes/(app)/schools/+page.server.ts` (partner + district scoping)
- Schools add: `src/routes/(app)/schools/add/+page.server.ts` (partner_manager district ownership enforced)
- Schools-by-district API: `src/routes/(app)/schools/add/schools/+server.ts` (scoped for partner_manager/team_member)
- Email uniqueness API: `src/routes/(app)/users/check-email/+server.ts` (global uniqueness)

### UI Enforcement
- Role dropdown options: `src/lib/server/user-utils.ts` (`getAvailableRoleOptions`)
- Users add form: `src/routes/(app)/users/add/+page.server.ts` & `+page.svelte` (role options + partner locking)
- Users edit form: `src/routes/(app)/users/[id]/edit/+page.server.ts` & `+page.svelte` (self-role read-only for partner_manager)

---


## Current Implementation Status

**Phase**: 2 - School & Survey Management
**Week**: 4 - School Management (COMPLETED) → Week 5 (NEXT)
**Last Updated**: December 14, 2024

### Completed (Weeks 1-4)
- ✅ Docker environment with PostgreSQL 18
- ✅ Authentication system with session management
- ✅ Role-based access control (4 roles)
- ✅ Password hashing with bcrypt (12 rounds)
- ✅ Partner management with auto-generated codes (starts at 11)
- ✅ District management with auto-generated codes (starts at 101)
- ✅ Audit logging for sensitive operations
- ✅ School add/edit forms with 17 fields
- ✅ Auto-generated school codes (starts at 201)
- ✅ Form validation (phone, student strength)
- ✅ Database migrations applied
- ✅ **Routes Consistency Audit** - All CRUD routes now follow consistent patterns
- ✅ **Critical Security Fixes** - Partner scoping enforcement in edit routes
- ✅ **Developer Documentation** - Comprehensive guides for future development

### Weeks 5-6 (Current)
- ⏳ CSV bulk upload
- ⏳ School selection interface
- ⏳ Survey form implementation (50+ fields)
- ⏳ Partner manager interface
- ⏳ Team member account creation

---

## Database Schema Key Tables

### survey_responses
- 50+ columns covering 7 sections (A-G) of eye health survey
- `survey_unique_id`: `{district_code}-{school_code}-{class}-{section}-{roll_no}`
- Edit deadlines: team_member (24h), partner_manager (15 days), national_admin (unlimited)
- Audit fields: `submitted_by`, `last_edited_by`, timestamps

### users
- `id`, `email` (unique), `password_hash`
- `role` (enum: national_admin, data_manager, partner_manager, team_member)
- `partner_id` (FK, required for partner_manager & team_member only)
- Auto-generated: `code` (sequence), `temporary_password`
- `phone_number` (10-digit validation), `date_active_till`, `years_of_experience`

### partners
- Auto-generated `code` (sequence, starts at 11)
- Each partner mapped to exactly one district (1:1 relationship)

### districts
- Auto-generated `code` (sequence, starts at 101)
- `partner_id` (FK to partners, unique - enforces 1:1)

### schools
- Auto-generated `code` (sequence, starts at 201)
- `partner_id` (FK, inherited from district)
- 17 fields: phone, email, pincode, village, block, taluk, state, etc.
- `is_active` (boolean, false = deactivated)
- `has_survey_data` (boolean, prevents deletion if true)

### sessions
- Session-based authentication with httpOnly cookies
- Automatic cleanup and expiry logic

### audit_logs
- Tracks all sensitive operations (create/update/delete)
- Old/new data snapshots for change tracking

---

## Key Business Rules

1. **Unique Survey ID**: `{district_code}-{school_code}-{class}-{section}-{roll_no}` (prevents duplicates)
2. **Edit Time Windows**:
   - Team members: 24 hours after submission
   - Partner managers: 15 days after submission
   - National level: No time limit
3. **School Deactivation**: Schools with survey data cannot be deleted, only deactivated
4. **Conditional Fields**: Section F (spectacle details) only shown when `uses_distance_glasses = true`
5. **Barrier Selection**: Up to 2 barriers can be selected per survey
6. **Data Isolation**: PostgreSQL Row-Level Security (RLS) policies + session variables
7. **Team Visibility**: Team members can view all surveys submitted by their partner's team

---

## Svelte & SvelteKit MCP Tools

You have access to comprehensive Svelte 5 and SvelteKit documentation:

### 1. list-sections
Discover all available documentation sections. Returns titles, use_cases, and paths.

### 2. get-documentation
Retrieve full documentation content for specific sections.

### 3. svelte-autofixer
Analyzes Svelte code and returns issues/suggestions. **Must use before sending Svelte code to user.**

### 4. playground-link
Generates Svelte Playground links. Only call after user confirmation, never for project files.

---

## Routes Consistency & Best Practices

**Important:** All CRUD routes have been audited and standardized. Refer to these documents when developing new features:

### Documentation Files (Root Directory)

1. **FORMS_GUIDE.md** (600+ lines) ⭐ **START HERE FOR NEW FORMS**
   - Complete Svelte + TanStack Form + Zod implementation guide
   - Schema patterns, server load/action patterns, frontend component patterns
   - Phone validation rules, boolean transforms, optional field handling
   - Common mistakes and pitfalls with examples
   - Full working component examples
   - Form testing patterns
   - **USE THIS:** When building any new form

2. **CONSISTENCY_GUIDE.md** (800+ lines)
   - Developer reference for building consistent CRUD routes
   - Pattern templates for guards, scoping, error handling, audit logging
   - Best practices and common mistakes to avoid
   - Comprehensive checklist for new routes
   - **USE THIS:** When implementing new CRUD routes (after reviewing FORMS_GUIDE.md)

3. **CONSISTENCY_FIXES.md** (400+ lines)
   - Detailed explanation of critical fixes applied
   - Testing recommendations
   - Security implications
   - **USE THIS:** To understand what was fixed and why

4. **CONSISTENCY_AUDIT.md** (500+ lines)
   - Complete analysis of consistency issues found
   - Impact assessment and priority levels
   - Before/after comparisons
   - **USE THIS:** To understand the full scope of issues addressed

5. **SESSION_SUMMARY.md** (300+ lines)
   - Complete overview of development session
   - List of all files modified
   - Deployment recommendations
   - **USE THIS:** For historical context and deployment planning

### Key Patterns Established (Quick Reference)

**Hidden Form Fields:**
```svelte
<!-- ❌ WRONG - uses stale field state -->
<input type="hidden" name="partnerId" value={field.state.value} />

<!-- ✅ CORRECT - uses reactive variable -->
<script>
  let selectedPartnerId = $state(data.values?.partnerId ?? '');
</script>
<input type="hidden" name="partnerId" value={selectedPartnerId} />
```

**Phone Validation:**
- **Users (Personal):** Exactly 10 digits → `/^\d{10}$/`
- **Partners/Schools (Organizations):** 10-20 chars with +, -, (), spaces → `/^[0-9+()\-\s]{10,20}$/`

**Boolean Transformation (Checkboxes):**
```typescript
isActive: z
  .union([z.string(), z.boolean()])
  .transform(v => v === true || v === 'on' || v === 'true')
```

**Partner Scoping in Actions:**
```typescript
// Always verify scoping in action, not just load
if (user.role === 'partner_manager' && user.partnerId) {
  const record = await db.select(...).where(eq(table.partnerId, newValue));
  if (!record || record[0].partnerId !== user.partnerId) {
    return fail(403, { errors: { field: ['Access denied'] } });
  }
}
```

---

## Svelte + TanStack Form + Zod

**See:** `FORMS_GUIDE.md` for complete implementation guide

Quick summary:
- **Schema:** Define in `src/lib/validation/<entity>.ts` with create/update variants
- **Load:** Return `values`, `errors`, `partners` (for dropdowns), and UI state (`lockPartner`, `lockedPartnerId`)
- **Action:** Re-validate with Zod, check duplicates, enforce scoping, log audit trail
- **Frontend:** Use `<Field>` snippet pattern, local reactive variables for hidden fields, always re-hydrate on errors

**Critical Pattern - Hidden Fields:**
```svelte
<!-- ❌ WRONG - uses stale field state -->
<input type="hidden" value={field.state.value} name="partnerId" />

<!-- ✅ CORRECT - uses reactive variable -->
<script>
  let selectedPartnerId = $state(data.values?.partnerId ?? '');
</script>
<input type="hidden" value={selectedPartnerId} name="partnerId" />
```

Refer to `FORMS_GUIDE.md` for full examples, patterns, checklist, and common pitfalls.

---

## Common Svelte/SvelteKit Gotchas

### Gotcha 1: Form State Not Syncing Before Submission
- **Issue**: Hidden input fields using `field.state.value` don't sync with native form submission
- **Solution**: Use local reactive variables; the form data comes from DOM element values, not TanStack's internal state
- **Example**: `<input type="hidden" value={selectedPartner} name="partner_id" />`

### Gotcha 2: Number Input Allows Letters
- **Issue**: `type="number"` allows typing letters during input (they get stripped on submit)
- **Solution**: Use `type="text"` + `inputmode="numeric"` + JavaScript filtering to prevent non-numeric input
- **Code**: `.replace(/[^0-9]/g, '')`

### Gotcha 3: Checkboxes Skip Keyboard Navigation
- **Issue**: Checkboxes are not included in Tab order without explicit `tabindex`
- **Solution**: Add `tabindex="0"` to checkbox labels/wrappers for keyboard accessibility

### Gotcha 4: Keyboard Handlers Need Role Attributes
- **Issue**: Elements with keyboard handlers trigger a11y warnings if not interactive
- **Solution**: Add `role="presentation"` or a meaningful role + aria-label to non-interactive wrappers

### Gotcha 5: `use:enhance` Doesn't Auto-Handle Redirects
- **Issue**: After a 302 action, form stays on same page without explicit redirect handling
- **Solution**: Add `redirect` branch in enhance callback and call `goto(result.location)`

### Gotcha 6: Logout Should Be a `+server.ts` Endpoint
- **Issue**: Using `+page.server.ts` load causes "cookies.set after response generated" errors
- **Solution**: Implement logout as `+server.ts` endpoint that clears cookies before redirect

### Gotcha 7: Form Fields Not Re-enabled on Error
- **Issue**: Fields disabled during loading remain disabled after form submission failure
- **Solution**: Re-enable fields on `failure`/`error` results so users can retry

### Gotcha 8: Stale `.svelte-kit/types`
- **Issue**: Deleted `.svelte-kit/types` folder doesn't auto-regenerate; causes ENOENT errors
- **Solution**: Run `npm run prepare` (svelte-kit sync) to regenerate type definitions

### Gotcha 9: Tests in `src/routes` Cause Type Churn
- **Issue**: Files under `src/routes` with `+` prefix reserved; tests here cause type generation issues
- **Solution**: Place tests in `src/tests/` directory instead of route folders

### Gotcha 10: Reactive Conditions with Form State
- **Issue**: Using `formApi.getFieldValue('x')` in `{#if}` conditions doesn't create reactive dependencies
- **Solution**: Keep local reactive variables updated in `on:change` handlers, or render conditionals inside `<Field>` snippet using `field.state.value`

### Gotcha 11: Page Component Not Remounting After Submit
- **Issue**: When using `use:enhance`, page often doesn't remount, so server-returned `form` data needs manual hydration
- **Solution**: Call `update()` in enhance callback and re-hydrate when `form` prop changes (e.g., `$: if (form) hydrateFromServer(form.values, form.errors)`)

### Gotcha 12: Drizzle Migrations Aren't Auto-Applied
- **Issue**: `npm run db:generate` creates migration files but doesn't apply them to database
- **Solution**: Always run `npm run db:migrate` after `npm run db:generate` to apply pending migrations (see Setup & Development section for full workflow)

---

## TanStack Form Best Practices

**See:** `FORMS_GUIDE.md` for complete best practices and 8-step process

Quick checklist:
- ✅ Create schemas in `src/lib/validation/<entity>.ts` with create/update variants
- ✅ Include coercions (booleans from strings, optional→null transforms)
- ✅ Validate on **load, action, and field change**
- ✅ Check duplicates server-side before insert
- ✅ Always re-validate in action (never trust client)
- ✅ Enforce partner scoping in action, not just load
- ✅ Log audit trail with old/new data snapshots
- ✅ Return form state on error for recovery
- ✅ Use `throw redirect(303, '/path')` on success

---


## Implementation Checklist Template

Use this checklist when adding new routes/actions/APIs:

1. **Guard**: route calls correct guard (`requireRole` / `requirePartnerManager` / `requireUserAccess`)
2. **Scope**: all DB reads include partner scoping when role is `partner_manager` or `team_member`
3. **Write validation**: all DB writes re-validate scope server-side
4. **Partner field normalization**: missing partner treated as `''`, validated by schema
5. **UI + server lock**: if partner is locked in UI, server also enforces it
6. **Audit logging**: create/update actions write audit logs with old/new snapshots

---

## Setup & Development

**Starting the application:**
```bash
cd /Users/vivekgupta/workspace/schoo_survey/school-app
docker compose up -d
```

**Database operations:**
```bash
npm run db:generate    # Generate migrations from schema changes
npm run db:migrate     # Apply migrations to PostgreSQL database
npm run db:seed        # Seed test users (creates if missing, resets passwords if exist)
```

**Reset test passwords to default:**
```bash
npm run db:seed        # Simply run seed again - will update passwords for existing accounts
```

**Drizzle Migration Workflow:**
1. Make schema changes in `src/lib/server/db/schema.ts`
2. Run `npm run db:generate` - generates migration files in `drizzle/` folder
3. Run `npm run db:migrate` - applies migrations to PostgreSQL
4. Commit both `drizzle/*.sql` migration files and `drizzle/meta/` metadata

**Verify migration state:**
```bash
psql "$DATABASE_URL" -c 'SELECT id, hash, created_at FROM drizzle.__drizzle_migrations ORDER BY id;'
```

**Clean local reset (wipe all data):**
```bash
psql "$DATABASE_URL" -c 'DROP SCHEMA public CASCADE; CREATE SCHEMA public; GRANT ALL ON SCHEMA public TO survey_admin; GRANT ALL ON SCHEMA public TO public;'
npm run db:migrate
npm run db:seed
```

**Key migration notes:**
- Migrations are tracked in `drizzle/__drizzle_migrations` table
- Do NOT hand-edit `drizzle/meta/_journal.json` - regenerate with `npm run db:generate`
- If DB is missing recorded migrations: make migrations idempotent (use `IF NOT EXISTS` guards)
- Enums use DO blocks for safety on PostgreSQL < 14

**Testing:**
```bash
npm test               # Run tests (server tests only)
npm run check          # TypeScript check
```

**Quick Reference:**
- App: http://localhost:5173
- Database: localhost:5432 (or localhost:5442 for external tools)
- Test Users:
  - admin@example.com (national_admin) / password123
  - manager@example.com (partner_manager) / password123
  - team@example.com (team_member) / password123
