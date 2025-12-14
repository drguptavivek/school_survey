## Role scoping plan (Users + Schools)

This is the intended access-control + data-scoping plan for the current legacy roles:

- `national_admin`
- `data_manager`
- `partner_manager`
- `team_member`

Key data relationships/attributes used for scoping:

- `users.partner_id`: present only for `partner_manager` and `team_member`
- `schools.partner_id`: every school belongs to exactly one partner
- `districts.partner_id`: every district belongs to exactly one partner

---

## 1) Users module

### 1.1 Create users (role allocation)

**Who can create which roles**

- `national_admin` can create: `national_admin`, `data_manager`, `partner_manager`, `team_member`
- `partner_manager` can create: `team_member`
- `data_manager`: cannot create users
- `team_member`: cannot create users

**Partner requirement on create**

- If `role` is `partner_manager` or `team_member`: `partnerId` is mandatory.
- If `role` is `national_admin` or `data_manager`: `partnerId` must be empty/ignored.

**Partner locking (when logged-in user is partner_manager)**

- Partner managers can only create users for their own partner:
  - UI: partner dropdown locked to their partner.
  - Server: override submitted `partnerId` with `currentUser.partnerId`.

### 1.2 List/search users (data visibility)

- `national_admin` and `data_manager`:
  - Can list/search all users across all partners.
  - Filters allowed: role, active, free-text search.
- `partner_manager`:
  - Can list/search only users in their partner: `users.partner_id = currentUser.partnerId`.
  - Filters allowed, but always within partner scope.
- `team_member`:
  - Read-only list of users in their partner (so they can see colleagues): `users.partner_id = currentUser.partnerId`.
  - Filters allowed, but always within partner scope.
  - Cannot create/edit other users; can reset only their own credentials.

### 1.3 Edit users (who can edit whom)

**Recommended rule (clear + safe):**

- `national_admin`: can edit any user.
- `data_manager`: can edit any user (current state; may be tightened later as distinct responsibilities evolve).
- `partner_manager`: can edit users in their own partner (including team members and themselves).
- `team_member`: can edit self credentials only.

**Partner field behavior on edit**

- Partner dropdown is visible only when selected role is `partner_manager` or `team_member`.
- Partner is mandatory for both roles.
- If editor is `partner_manager`, partner is locked to their own partner and cannot be changed.
- Role assignment UI must be restricted:
  - If editor is `partner_manager`, the only selectable role option is `team_member`.
  - If a `partner_manager` is editing their own profile, role should be rendered read-only (no dropdown).

### 1.4 Credentials / reset credentials

**Create**

- On create success, show credentials exactly once:
  - `email` (login identifier)
  - `code` (user code)
  - temporary password
  - include Copy/Print/QR

**Reset**

- `national_admin`: can reset credentials for any user.
- `data_manager`: can reset credentials for any user (current state; may be tightened later).
- `partner_manager`: can reset only for users in their partner.
- `team_member`: can reset own credentials only.
- Reset should not allow resetting a user outside your partner (even if you know the id).
  - Server must verify target user’s `partner_id`.

Optional hardening decision:

- Reset credentials should revoke existing sessions for that user (delete rows in `sessions` by `user_id`).

---

## 2) Schools module

### 2.1 List/search schools (data visibility)

- `national_admin` and `data_manager`:
  - Can list/search all schools.
  - Filters allowed: district, state, free-text search.
- `partner_manager`:
  - Can list/search only schools in their partner: `schools.partner_id = currentUser.partnerId`.
  - District/state filter options must be limited to their partner’s districts.
- `team_member`:
  - Can view schools in their partner (read-only): `schools.partner_id = currentUser.partnerId`.
  - Can propose/suggest changes (workflow) to partner_manager; suggestions must not directly mutate canonical school records.

### 2.2 Create schools

- `national_admin`: can create for any partner/district.
- `data_manager`: can create for any partner/district (current state; may be tightened later).
- `partner_manager`: can create only within their partner.
- `team_member`: cannot create schools.

Enforcement rules:

- District selected must belong to the partner:
  - If logged-in role is partner_manager, validate `district.partner_id === currentUser.partnerId`.
- Partner selection:
  - Can be auto-populated based on district.
  - For partner_manager, partner must be locked to `currentUser.partnerId`.

### 2.3 Edit schools

- `national_admin` can edit all schools.
- `partner_manager` can edit schools in their partner; server must enforce: `schools.partner_id === currentUser.partnerId`.
- `data_manager` edit policy: currently global (same as national_admin); may be tightened later.
- `team_member` cannot edit schools directly; can only submit "suggested changes" for review.

### 2.4 Delete schools (soft delete)

- `national_admin`: can delete any school (soft delete via `deletedAt` timestamp).
- `partner_manager`: can delete only schools in their partner; server enforces `schools.partner_id === currentUser.partnerId`.
- `data_manager` and `team_member`: cannot delete schools.
- Business rule: schools with survey data cannot be deleted (checked via `has_survey_data` flag).

---

## 3) Partners and Districts module

### 3.1 Delete partners (soft delete)

- `national_admin`: can delete any partner (soft delete via `deletedAt` timestamp).
- All other roles: cannot delete partners.
- Business rule: soft delete cascades visibility; districts/schools remain in DB but marked as deleted.

### 3.2 Delete districts (soft delete)

- `national_admin`: can delete any district (soft delete via `deletedAt` timestamp).
- All other roles: cannot delete districts.
- Business rule: soft delete cascades visibility; schools remain in DB but marked as deleted.

### 3.3 Delete users (soft delete)

- `national_admin`: can delete any user (soft delete via `deletedAt` timestamp + `isActive = false`).
- `partner_manager`: can delete only users in their partner; server enforces `users.partner_id === currentUser.partnerId`.
- `data_manager` and `team_member`: cannot delete users.

---

## 4) Implementation checklist (enforcement points)

Use this checklist any time a route/action/API is added:

1. **Guard**: route must call the correct guard (`requireRole` / `requirePartnerManager` / `requireUserAccess`).
2. **Scope**: all DB reads must include partner scoping when role is `partner_manager` or `team_member` (for partner-scoped pages). 
3. **Write validation**: all DB writes must re-validate scope server-side (never trust the UI).
4. **Partner field normalization**:
   - Missing partner field should be treated as `''` and validated by schema, not as `null`.
5. **UI lock + server lock**:
   - If a partner is “locked” in UI, server must also enforce it.
6. **Audit logging**:
   - Create/update actions should write audit logs with old/new snapshots where relevant.

---

## 5) Where scoping is enforced (code map)

This section links the scope rules above to the concrete places in code that enforce them.

### Guards / policies
- Auth required for app routes: `school-app/src/routes/(app)/+layout.server.ts`
- Base auth guard: `school-app/src/lib/server/guards.ts` (`requireAuth`)
- User access (edit/reset) with partner scoping: `school-app/src/lib/server/guards.ts` (`requireUserAccess`)
- Role assignment policy (prevents partner_manager promotion): `school-app/src/lib/server/guards.ts` (`canAssignUserRole`)
- School edit access with partner scoping: `school-app/src/lib/server/guards.ts` (`requireSchoolEditAccess`)

### Route-level scoping (queries)
- Users list scoping (`partnerScopeId` filter): `school-app/src/routes/(app)/users/+page.server.ts`
- Schools list scoping (`partnerScopeId` + districts/states filters): `school-app/src/routes/(app)/schools/+page.server.ts`
- Schools add (partner_manager district ownership enforced): `school-app/src/routes/(app)/schools/add/+page.server.ts`
- Schools-by-district API (scoped for partner_manager/team_member): `school-app/src/routes/(app)/schools/add/schools/+server.ts`
- Email uniqueness API (global uniqueness): `school-app/src/routes/(app)/users/check-email/+server.ts`

### UI enforcement (role/partner controls)
- Role dropdown options (server-provided): `school-app/src/lib/server/user-utils.ts` (`getAvailableRoleOptions`)
- Users add form role options + partner locking: `school-app/src/routes/(app)/users/add/+page.server.ts`, `school-app/src/routes/(app)/users/add/+page.svelte`
- Users edit form role options + self-role read-only for partner_manager: `school-app/src/routes/(app)/users/[id]/edit/+page.server.ts`, `school-app/src/routes/(app)/users/[id]/edit/+page.svelte`

### Delete enforcement (soft delete pattern)

**Client-side delete utilities:**
- Permission checking: `school-app/src/lib/client/delete-utils.ts` (`canDeleteItem()`)
  - Returns `true` only if: national_admin OR (partner_manager AND item belongs to their partner)
- Delete confirmation & API call: `school-app/src/lib/client/delete-utils.ts` (`deleteItem()`)
  - Shows confirmation dialog with context-specific message
  - Makes DELETE request to appropriate endpoint

**Delete UI component:**
- Reusable "Danger Zone" section: `school-app/src/lib/components/DeleteSection.svelte`
  - Conditionally renders delete button based on `canDeleteItem()` result
  - Used on all 4 edit pages (users, partners, districts, schools)

**Delete endpoints (server-side authorization):**
- Users delete: `school-app/src/routes/(app)/users/[id]/delete/+server.ts`
  - national_admin: can delete any user
  - partner_manager: can delete users in their partner only
  - Server-enforced: `users.partner_id === currentUser.partnerId`
- Partners delete: `school-app/src/routes/(app)/partners/[id]/delete/+server.ts`
  - national_admin only
- Districts delete: `school-app/src/routes/(app)/districts/[id]/delete/+server.ts`
  - national_admin only
- Schools delete: `school-app/src/routes/(app)/schools/[id]/delete/+server.ts`
  - Uses `requireSchoolEditAccess()` guard for role + partner validation
  - Checks `has_survey_data` flag before allowing deletion

**Delete list page actions:**
- Partners list delete button: `school-app/src/routes/(app)/partners/+page.svelte` (national_admin only)
- Districts list delete button: `school-app/src/routes/(app)/districts/+page.svelte` (national_admin only)
- Schools list delete button: `school-app/src/routes/(app)/schools/+page.svelte` (national_admin + partner_manager with partner scoping)
- Users list delete button: `school-app/src/routes/(app)/users/+page.svelte` (national_admin + partner_manager with partner scoping)

**Database schema:**
- Soft delete columns added: `deletedAt` timestamp on `users`, `partners`, `districts`, `schools` tables
- List queries filter soft-deleted: `isNull(table.deletedAt)` in all list page queries
- Audit logging: `src/lib/server/audit.ts` records old/new state snapshots for all deletions

## 6) Planned evolution (to avoid future confusion)

Right now `data_manager` is treated as “admin-like” in multiple areas (users + schools). As the app evolves, tighten this by defining:

- what `data_manager` can do that `national_admin` cannot, and vice-versa,
- which entities they can create/edit/reset,
- whether they are global or partner-scoped.
