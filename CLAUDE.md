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

## Svelte & SvelteKit Patterns Used

### Form Handling
- **TanStack Form + Zod** for real-time validation with `zodAdapter`
- Field validation with `$fieldErrors` store
- Form submission with `formEl?.submit()` for native form handling
- Redirect handling: `goto(result.location)` for form action redirects
- **Hidden input handling**: Use local reactive variables (not `field.state.value`)

### Number Inputs
- Use `type="text"` + `inputmode="numeric"` + JavaScript filtering (NOT `type="number"`)
- Phone validation: min 10 digits in any format

### Accessibility
- Checkboxes need `tabindex="0"` for keyboard navigation
- Proper `role` attributes for keyboard handlers
- Input labels properly linked with `for` attributes

### Form State
- **Critical**: Native form submission requires proper state sync before submit
- Disabled fields on submission, re-enable on `failure`/`error`
- Local reactive variables for auto-generated fields (code, temp password)

---

## Current Implementation Status

**Phase**: 2 - School & Survey Management
**Week**: 4 - School Management (IN PROGRESS)
**Last Updated**: December 14, 2024

### Completed (Weeks 1-3)
- ✅ Docker environment with PostgreSQL 18
- ✅ Authentication system with session management
- ✅ Role-based access control (4 roles)
- ✅ Password hashing with bcrypt (12 rounds)
- ✅ Partner management with auto-generated codes (starts at 11)
- ✅ District management with auto-generated codes (starts at 101)
- ✅ Audit logging for sensitive operations

### Week 4 (Current)
- ✅ School add/edit forms with 17 fields
- ✅ Auto-generated school codes (starts at 201)
- ✅ Form validation (phone, student strength)
- ✅ Database migrations applied
- ⏳ CSV bulk upload (next)
- ⏳ School selection interface (next)

### Upcoming (Weeks 5-6)
- Survey form implementation (50+ fields)
- Partner manager interface
- Team member account creation

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

## Common Gotchas & Solutions

### Svelte Form Handling
- **Issue**: Form state not syncing before native submission
- **Solution**: Use local reactive variables for hidden inputs; call `formEl?.submit()` explicitly

### Number Input Validation
- **Issue**: `type="number"` allows letter input
- **Solution**: Use `type="text"` + `inputmode="numeric"` + JavaScript filtering

### Checkbox Accessibility
- **Issue**: Checkboxes not keyboard navigable
- **Solution**: Add `tabindex="0"` to checkbox labels or wrappers

### TanStack Form Validation
- **Issue**: Real-time validation not triggering
- **Solution**: Use `zodAdapter` with `validators: { onChange, onSubmit }` properly configured

### Database Migrations
- **Process**: `npm run db:generate` (Drizzle introspection) → `npm run db:migrate` (apply to DB)
- **Critical**: Both steps required; `db:generate` alone doesn't apply changes to database

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
npm run db:generate    # Update schema from migrations
npm run db:migrate     # Apply to PostgreSQL
npm run db:seed        # Seed test users (creates if missing, resets passwords if exist)
```

**Reset test passwords to default:**
```bash
npm run db:seed        # Simply run seed again - will update passwords for existing accounts
```

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
