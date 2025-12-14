# Routes Consistency Audit

**Generated:** December 14, 2024
**Scope:** All CRUD routes (Users, Schools, Partners, Districts)
**Target:** Ensure consistency in DB schema, Zod validation, TanStack forms, frontend validation, backend validation, error messages, scoping, and roles

---

## Critical Issues (Must Fix)

### 1. Hidden Input Fields Using `field.state.value` ❌

**Location:** `src/routes/(app)/users/[id]/edit/+page.svelte` (likely)
**Issue:** Hidden fields like `partnerId` use `field.state.value` which doesn't sync with native form submission
**Impact:** Form data sent to server may have missing/stale partner IDs
**Fix Required:** Use local reactive variables instead

---

### 2. School Edit Route Missing Partner Scoping Enforcement ❌

**Location:** `src/routes/(app)/schools/[id]/edit/+page.server.ts` (action)
**Issue:** Action doesn't verify `partner_manager` can only edit schools in their partner
**Current:** Only checks school exists, doesn't verify ownership
**Impact:** Partner managers could potentially edit schools outside their partner
**Fix Required:** Add partner ownership check after `requireSchoolEditAccess()`

---

### 3. Phone Number Validation Inconsistency ⚠️

**Locations:**
- `src/lib/validation/user.ts`: Exactly 10 digits (`min(10), max(10), regex(/^\d{10}$/)`)
- `src/lib/validation/partner.ts`: 6-20 chars with digits/symbols (`regex(/^[0-9+()\-\s]{6,20}$/)`)
- `src/lib/validation/school.ts`: At least 10 digits (`.replace(/\D/g, '')`)

**Issue:** Three different phone validation rules
**Fix Required:** Standardize to one pattern (recommend: 10-20 digits, allow +, -, (), space)

---

### 4. Optional Field Handling Inconsistency ⚠️

**Locations:**
- `user.ts`: `.string().trim().optional().or(z.literal('')).refine(...)`
- `partner.ts`: `.string().trim().email(...).optional().or(z.literal('')).transform(...)`
- `school.ts`: Mix of `.optional().or(z.literal(''))` and just `.optional()`
- `district.ts`: `.string().uuid(...)` - no optional handling

**Issue:** Inconsistent patterns for optional vs required fields
**Fix Required:** Standardize to `.optional().or(z.literal(''))` for all text fields

---

### 5. Boolean Enum Handling Inconsistency ⚠️

**Locations:**
- `partner.ts`: Custom `booleanString` transform (handles 'true', 'on', '1')
- `school.ts`: `z.boolean().optional().default(false)` (doesn't transform)

**Issue:** Partners transform string to boolean; Schools don't
**Impact:** Form data for `isActive` may fail validation
**Fix Required:** Use consistent boolean handling across all routes

---

## Medium Issues (Should Fix)

### 6. Enum Fallback Pattern Inconsistency ⚠️

**Locations:**
- `school.ts`: `.enum(['govt', ...]).catch('govt').optional()`
- `district.ts`: `.enum(INDIAN_STATES_UTS).catch(INDIAN_STATES_UTS[0])`

**Issue:** Different catch patterns
**Fix Required:** Standardize to explicit `.catch()` with clear default value

---

### 7. Duplicate Checks Not Using Zod Refine ⚠️

**Current Pattern:** Validation → Parse → Duplicate check → Return fail()
**Better Pattern:** Move duplicate checks into Zod `.superRefine()` blocks
**Affected:** Users (email), Schools (name + district), Districts (name + state)

---

### 8. Repetitive Error Recovery Code ⚠️

**Issue:** Routes re-fetch dropdowns 2-3 times on errors (validation, duplicate, permission)
**Example:** `users/add` re-fetches partners 3 times
**Fix Required:** Extract dropdown fetch into helper function

---

### 9. Inconsistent Error Message Phrasing ⚠️

| Entity | Duplicate Message | Current Pattern |
|--------|------------------|-----------------|
| User Email | "A user with this email already exists" | ✅ Clear |
| School Name | "A school with this name already exists in this district" | ✅ Clear |
| District Name | (Not implemented yet) | Pending |

**Fix Required:** Standardize message format: "A {entity} with this {field} already exists {scope}"

---

### 10. Audit Logging Inconsistency ⚠️

**Issue:** Field names differ between old/new data snapshots
- Users: `isActive` vs `active` (form uses 'Y'/'N')
- Schools: Mix of snake_case and camelCase
- Partners: Minimal field tracking

**Fix Required:** Standardize to always use database column names in audit logs

---

## Low Issues (Nice to Have)

### 11. Missing Field Normalization in Edit Routes ⚠️

**Issue:** Edit routes don't normalize empty strings → null for optional fields
**Example:** `address: address || null` (good) vs inconsistent handling elsewhere

---

### 12. Inconsistent "Locked" Field Behavior ⚠️

**Current:** Partner manager sees locked `partnerId` and `role` fields
**Issue:** UI locking doesn't always match server enforcement
**Locations:**
- Users: UI lock + server check ✅
- Schools: UI lock only, no server check ❌

---

## Summary Table

| Category | Users | Schools | Partners | Districts |
|----------|-------|---------|----------|-----------|
| **Guards** | ✅ Good | ⚠️ Edit action incomplete | ✅ Good | ✅ Good |
| **Zod Schemas** | ⚠️ Optional inconsistency | ⚠️ Multiple issues | ⚠️ Boolean transform | ✅ Clean |
| **Validation Flow** | ⚠️ Multiple re-fetches | ⚠️ Multiple re-fetches | ✅ Clean | ✅ Clean |
| **Scoping** | ✅ Good | ❌ Edit missing check | N/A | N/A |
| **Error Handling** | ⚠️ Repetitive | ⚠️ Repetitive | ✅ Clean | ✅ Clean |
| **Audit Logging** | ⚠️ Field name mismatch | ⚠️ Inconsistent fields | ⚠️ Minimal | ❌ Missing |
| **Frontend** | ❌ Hidden field issue | ⚠️ TBD | ✅ Clean | ✅ Clean |

---

## Fix Priority

1. **CRITICAL:** Fix hidden input field using `field.state.value` in users/[id]/edit
2. **CRITICAL:** Add partner scoping check to schools/[id]/edit action
3. **HIGH:** Standardize phone validation across all routes
4. **HIGH:** Fix boolean handling in school form
5. **MEDIUM:** Standardize optional field patterns in Zod
6. **MEDIUM:** Extract repetitive dropdown fetch logic
7. **LOW:** Standardize error messages
8. **LOW:** Improve audit logging field consistency

