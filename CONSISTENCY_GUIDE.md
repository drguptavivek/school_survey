# Routes Consistency Guide

**For:** Future route development and maintenance
**Version:** 1.0
**Last Updated:** December 14, 2024

---

## Quick Reference: Route Patterns

When adding new CRUD routes, follow these consistent patterns across all modules:

### 1. Database & Schema

**Pattern:**
```typescript
// Always use Drizzle ORM with proper typing
const record = await db
  .select({ id: table.id, name: table.name })
  .from(table)
  .where(eq(table.id, recordId))
  .limit(1);
```

**Rules:**
- Use named selections (not `table.*`)
- Always add `.limit(1)` for single record fetches
- Use proper type inference with `infer<typeof>`

---

### 2. Zod Schema Structure

**Pattern:**
```typescript
// Create a base schema for shared fields
const baseSchema = z.object({
  name: z.string().trim().min(2, 'Name is required').max(255, 'Name too long'),
  email: z.string().trim().email('Invalid email').optional().or(z.literal('')).transform(v => v || null),
  phone: z.string().trim().regex(/^\d{10}$/, 'Phone must be 10 digits').optional().or(z.literal('')),
  active: z.union([z.string(), z.boolean()]).transform(v => v === true || v === 'on')
});

// Extend for create/update
export const createSchema = baseSchema;
export const updateSchema = baseSchema.extend({
  id: z.string().uuid('ID is required')
});

// Export inferred types
export type CreateInput = z.infer<typeof createSchema>;
export type UpdateInput = z.infer<typeof updateSchema>;
```

**Rules:**
- Trim all string inputs (`.trim()`)
- Optional text fields: `.optional().or(z.literal(''))`
- Transform booleans from checkbox strings to actual booleans
- Transform empty strings to `null` for optional nullable fields
- Custom validations in `.refine()` or `.superRefine()`
- Always export inferred types for component usage

---

### 3. Phone Number Validation

**Pattern:**
```typescript
// For personal users (strict):
phoneNumber: z
  .string()
  .trim()
  .min(10, 'Phone must be 10 digits')
  .max(10, 'Phone must be 10 digits')
  .regex(/^\d{10}$/, 'Phone must contain only digits')

// For organizations (flexible):
contactPhone: z
  .string()
  .trim()
  .regex(/^[0-9+()\-\s]{10,20}$/, 'Phone must be 10-20 characters with digits, +, -, (), and spaces')
  .optional()
  .or(z.literal(''))
  .transform(v => v || null)
```

**Rules:**
- Personal IDs: exactly 10 digits
- Organization phones: 10-20 characters allowing symbols
- Always trim before validation
- When optional, transform empty string to `null`

---

### 4. Boolean Handling

**Pattern:**
```typescript
// Checkbox fields must handle both boolean and string ('on') from form
isActive: z
  .union([z.string(), z.boolean()])
  .transform(value => {
    if (value === true) return true;
    if (typeof value === 'string') {
      return value.toLowerCase() === 'true' || value === 'on' || value === '1';
    }
    return false;
  })
```

**Rules:**
- Use `.union([z.string(), z.boolean()])` to accept both types
- Transform to boolean in explicit order: check `true`, then string parsing, then default
- Default to `false` for unchecked/missing values

---

### 5. Route Guards

**Pattern:**
```typescript
// Load function
export const load: PageServerLoad = async (event) => {
  const user = await requireRole(event, UserRole.NATIONAL_ADMIN, UserRole.PARTNER_MANAGER);

  // Optional scoping for partner managers
  const lockPartner = user.role === 'partner_manager';
  const lockedPartnerId = lockPartner ? user.partnerId : null;

  // Verify user has partner assigned if needed
  if (lockPartner && !lockedPartnerId) {
    return fail(400, { message: 'User not assigned to partner' });
  }

  // Fetch with scoping
  const items = await db.select(...).from(table)
    .where(lockPartner ? eq(table.partnerId, lockedPartnerId!) : undefined);
};

// Action
export const actions = {
  default: async (event) => {
    const user = await requireRole(event, UserRole.NATIONAL_ADMIN);

    // Validate payload
    const parsed = createSchema.safeParse(payload);
    if (!parsed.success) {
      return fail(400, { errors: parsed.error.flatten().fieldErrors });
    }

    // Enforce scoping
    if (user.role === 'partner_manager') {
      // Verify user can access/modify this resource
    }

    // Check duplicates
    const existing = await db.select(...).where(...);
    if (existing.length > 0) {
      return fail(400, { errors: { field: ['Already exists'] } });
    }

    // Persist with audit
    const result = await db.insert(table).values(...);
    await logAudit({ event, action: 'created', newData: result });

    throw redirect(303, '/list');
  }
};
```

**Rules:**
- Load: Check auth and return defaults
- Action: Re-validate all guards and schemas
- Always check duplicates server-side
- Always log audit actions
- Use `fail()` for validation errors, `redirect()` for success
- Return both form state for hydration and ui state (lockPartner, etc.)

---

### 6. Frontend Form Pattern

**Pattern:**
```svelte
<script lang="ts">
  import { createForm } from '@tanstack/svelte-form';
  import { zodAdapter } from '$lib/forms/zodAdapter';

  export let data: PageData;
  export let form: ActionData;

  let formEl: HTMLFormElement | null = null;
  let selectedPartnerId = data.values?.partnerId ?? '';  // Reactive for hidden fields

  const formApi = createForm(() => ({
    defaultValues: data.values,
    validators: {
      onChange: zodAdapter(createSchema),
      onSubmit: zodAdapter(createSchema)
    },
    onSubmit: () => formEl?.submit()
  }));

  function hydrateFromServer(values, errors) {
    // Re-populate form after server errors
    if (values) {
      for (const [key, val] of Object.entries(values)) {
        formApi.setFieldValue(key, val, { dontValidate: true });
      }
    }
  }

  $: if (form) hydrateFromServer(form.values, form.errors);
</script>

<form method="POST" bind:this={formEl}>
  <Field name="partnerId">
    {#snippet children(field)}
      {#if isLockedPartner()}
        <!-- Use reactive variable for hidden fields, NOT field.state.value -->
        <input type="hidden" name="partnerId" value={selectedPartnerId} />
      {/if}
      <select
        value={field.state.value ?? ''}
        on:change={(e) => {
          selectedPartnerId = e.currentTarget.value;  // Keep reactive var in sync
          field.handleChange(e.currentTarget.value);
        }}
      >
        <!-- Options -->
      </select>
    {/snippet}
  </Field>
</form>
```

**Rules:**
- Use local reactive variables for hidden fields, NOT `field.state.value`
- Form submission uses DOM element values, not TanStack's internal state
- Always call `hydrateFromServer()` when `form` prop changes
- Use `enhance()` to handle post-submit redirects
- Validate fields on blur with explicit `setTouched()`

---

### 7. Error Handling Pattern

**Pattern:**
```typescript
// Consistent error structure in action returns
return fail(400, {
  values: {
    // Return user input for form repopulation
    name: String(payload.name ?? ''),
    email: String(payload.email ?? '')
  },
  errors: {
    // Field errors from Zod
    email: ['A user with this email already exists'],
    role: ['You cannot assign this role']
  },
  // Additional UI state
  partners: partnersList,
  lockPartner: true
});
```

**Rules:**
- Always return `values` for form repopulation
- Flatten Zod errors: `parsed.error.flatten().fieldErrors`
- Use consistent error message format: "A {entity} with this {field} already exists"
- Include related dropdown/select data for form recovery
- Include UI state (lockPartner, isSelf, etc.) for conditional rendering

---

### 8. Audit Logging Pattern

**Pattern:**
```typescript
await logAudit({
  event,
  userId: event.locals.user?.id,
  action: 'user_created', // verb_entity
  entityType: 'user',
  entityId: newRecord.id,
  oldData: null, // for create
  newData: {
    id: newRecord.id,
    name: newRecord.name,
    email: newRecord.email,
    // Include all relevant fields for change tracking
    partnerId: newRecord.partnerId,
    isActive: newRecord.isActive
  }
});
```

**Rules:**
- Always log after successful create/update
- Use `verb_entity` format for action names: `user_created`, `school_updated`
- Include full snapshot of new data (after transformation)
- For updates, include both `oldData` and `newData`
- Use database column names (not form field names) in snapshots

---

## Common Mistakes to Avoid

### ❌ Hidden Inputs Using `field.state.value`
```typescript
// WRONG
<input type="hidden" name="partnerId" value={field.state.value} />

// CORRECT
<input type="hidden" name="partnerId" value={selectedPartnerId} />
```

### ❌ Skipping Partner Scoping in Action
```typescript
// WRONG
export const actions = {
  default: async (event) => {
    const user = await requirePartnerManager(event); // Only checks load
    // ... directly uses payload.partnerId without verifying access
  }
};

// CORRECT
export const actions = {
  default: async (event) => {
    const user = await requirePartnerManager(event);
    if (user.role === 'partner_manager') {
      // Verify payload.partnerId is user's partner
      // OR verify related records belong to user's partner
    }
  }
};
```

### ❌ Not Handling Optional Null Fields
```typescript
// WRONG
const parsed = schema.safeParse(payload); // Empty string passes through
const values = await db.insert(table).values(parsed.data); // Stores empty string

// CORRECT
address: z.string().trim().optional().or(z.literal('')).transform(v => v || null)
// Now empty string becomes null in database
```

### ❌ Inconsistent Boolean Handling
```typescript
// WRONG
hasPrimary: z.boolean() // Fails when form sends 'on'

// CORRECT
hasPrimary: z.union([z.string(), z.boolean()]).transform(v => v === true || v === 'on')
```

### ❌ Forgetting to Lock Partner in UI and Server
```typescript
// WRONG - UI locks but server doesn't check
<input disabled value={lockedPartnerId} />
// ... later in action
const { partnerId } = parsed.data; // Could be different!

// CORRECT - UI locks AND server enforces
<input type="hidden" value={selectedPartnerId} />
// ... in action
if (user.role === 'partner_manager' && parsed.data.partnerId !== user.partnerId) {
  return fail(403, { errors: { partnerId: ['Access denied'] } });
}
```

---

## Checklist for New Routes

When implementing a new CRUD route, verify:

- [ ] **Guards:** Correct role requirements on load and action
- [ ] **Scoping:** Partner manager filters applied to all queries
- [ ] **Schema:** Base, Create, and Update schemas defined
- [ ] **Validation:** Zod validation re-run on action (not just load)
- [ ] **Duplicates:** Checked server-side before insert/update
- [ ] **Transform:** Empty strings → null, strings → booleans as needed
- [ ] **Error Recovery:** Form state returned on validation failures
- [ ] **Audit:** Create/update actions logged with old/new snapshots
- [ ] **Frontend:** Reactive variables for hidden fields, not field.state.value
- [ ] **Phone:** Using correct validation (10 digits vs flexible)
- [ ] **Booleans:** Handle both boolean and string ('on') values
- [ ] **Redirect:** Use `throw redirect(303, '/path')` for success

---

## Type Safety

Always export and use inferred types from Zod schemas:

```typescript
// In validation file
export const userCreateSchema = ...;
export type UserCreateInput = z.infer<typeof userCreateSchema>;

// In component
import type { UserCreateInput } from '$lib/validation/user';

export let data: PageData;
const values: UserCreateInput = data.values;
const Field = formApi.Field; // Properly typed!
```

This provides full autocomplete and type checking for form fields.

