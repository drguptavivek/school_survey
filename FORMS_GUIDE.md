# Svelte + TanStack Form + Zod Implementation Guide

**Quick Reference for building consistent forms in this project**

---

## Overview

This guide covers the complete form implementation pattern used in the School Survey application. All examples follow the established best practices.

---

## 1. Schema Definition

**Location:** `src/lib/validation/<entity>.ts`

### Base Schema Pattern

```typescript
import { z } from 'zod';

// Create base schema with all shared fields
const baseSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, 'Name is required')
    .max(255, 'Name is too long'),

  email: z
    .string()
    .trim()
    .email('Please enter a valid email address')
    .max(255, 'Email is too long'),

  phoneNumber: z
    .string()
    .trim()
    .min(10, 'Phone must be exactly 10 digits')
    .max(10, 'Phone must be exactly 10 digits')
    .regex(/^\d{10}$/, 'Phone must contain only digits'),

  // Optional text field → transform to null
  address: z
    .string()
    .trim()
    .max(500, 'Address is too long')
    .optional()
    .or(z.literal(''))
    .transform(v => v || null),

  // Boolean from checkbox string
  isActive: z
    .union([z.string(), z.boolean()])
    .transform(v => v === true || v === 'on' || v === 'true'),
});

// Custom validation using superRefine
function requirePartnerForRole(data: { role: string; partnerId?: string }, ctx: z.RefinementCtx) {
  if ((data.role === 'partner_manager' || data.role === 'team_member') && !data.partnerId) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['partnerId'],
      message: 'Partner is required for this role'
    });
  }
}

// Create/Update schemas
export const createSchema = baseSchema.superRefine(requirePartnerForRole);
export const updateSchema = baseSchema
  .extend({
    id: z.string().uuid('ID is required')
  })
  .superRefine(requirePartnerForRole);

// Export inferred types
export type CreateInput = z.infer<typeof createSchema>;
export type UpdateInput = z.infer<typeof updateSchema>;
```

### Phone Validation Rules

**For Personal User IDs (strict):**
```typescript
phoneNumber: z
  .string()
  .trim()
  .min(10, 'Phone must be exactly 10 digits')
  .max(10, 'Phone must be exactly 10 digits')
  .regex(/^\d{10}$/, 'Phone must contain only digits')
```

**For Organizations (flexible):**
```typescript
contactPhone: z
  .string()
  .trim()
  .regex(/^[0-9+()\-\s]{10,20}$/, 'Phone must be 10-20 characters with digits, +, -, (), and spaces')
  .optional()
  .or(z.literal(''))
  .transform(v => v || null)
```

### Boolean Transformation (Checkboxes)

```typescript
// Checkboxes submit as 'on' string, need explicit transformation
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

### Optional Field Handling

```typescript
// For optional nullable fields, transform empty string to null
comments: z
  .string()
  .trim()
  .max(500, 'Comments too long')
  .optional()
  .or(z.literal(''))
  .transform(v => v || null)
```

---

## 2. Server Load Function

**Location:** `src/routes/(app)/<entity>/+page.server.ts` or `src/routes/(app)/<entity>/add/+page.server.ts`

### Load Pattern

```typescript
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
  // 1. Verify authorization
  const user = await requireRole(event, UserRole.NATIONAL_ADMIN);

  // 2. Determine scoping for partner managers
  const lockPartner = user.role === 'partner_manager';
  const lockedPartnerId = lockPartner ? user.partnerId : null;

  // 3. Verify user has required attributes
  if (lockPartner && !lockedPartnerId) {
    return fail(400, { message: 'User must be assigned to a partner' });
  }

  // 4. Fetch dropdown data (with scoping if needed)
  const partners = lockPartner
    ? await db
        .select({ id: partners.id, name: partners.name })
        .from(partners)
        .where(eq(partners.id, lockedPartnerId!))
    : await db
        .select({ id: partners.id, name: partners.name })
        .from(partners)
        .orderBy(partners.name);

  // 5. Return form data + UI state
  return {
    values: {
      name: '',
      email: '',
      phone: '',
      isActive: 'Y',
      partnerId: lockedPartnerId ?? ''
    },
    errors: null,
    partners,
    lockPartner,
    lockedPartnerId
  };
};
```

---

## 3. Server Action (Form Submission)

**Location:** `src/routes/(app)/<entity>/+page.server.ts` or `src/routes/(app)/<entity>/add/+page.server.ts`

### Action Pattern

```typescript
import type { Actions } from './$types';

export const actions: Actions = {
  default: async (event) => {
    // 1. Verify authorization
    const user = await requireRole(event, UserRole.NATIONAL_ADMIN);

    // 2. Get form data
    const formData = await event.request.formData();
    const payload = {
      name: formData.get('name'),
      email: formData.get('email'),
      phone: formData.get('phone'),
      isActive: formData.get('isActive')
    };

    // 3. Validate with Zod (re-validate, not just client-side)
    const parsed = createSchema.safeParse(payload);

    if (!parsed.success) {
      // Refetch UI data for error recovery
      const partners = await db.select(...).from(partners);

      return fail(400, {
        values: {
          name: String(payload.name ?? ''),
          email: String(payload.email ?? ''),
          phone: String(payload.phone ?? ''),
          isActive: String(payload.isActive ?? 'Y')
        },
        errors: parsed.error.flatten().fieldErrors,
        partners
      });
    }

    // 4. Check duplicates server-side
    const existing = await db
      .select({ id: table.id })
      .from(table)
      .where(ilike(table.email, parsed.data.email))
      .limit(1);

    if (existing.length > 0) {
      return fail(400, {
        values: parsed.data,
        errors: { email: ['Email already exists'] },
        partners: await db.select(...).from(partners)
      });
    }

    // 5. Enforce scoping (for partner managers)
    if (user.role === 'partner_manager' && parsed.data.partnerId !== user.partnerId) {
      return fail(403, {
        values: parsed.data,
        errors: { partnerId: ['You can only create for your partner'] },
        partners: await db.select(...).from(partners)
      });
    }

    // 6. Insert/Update with proper transformations
    const result = await db
      .insert(table)
      .values({
        name: parsed.data.name,
        email: parsed.data.email,
        phone: parsed.data.phone,
        isActive: parsed.data.isActive === 'Y',
        partnerId: parsed.data.partnerId || null,
        createdBy: user.id,
        createdAt: new Date()
      })
      .returning({ id: table.id, code: table.code });

    // 7. Log audit trail
    if (result[0]?.id) {
      await logAudit({
        event,
        userId: user.id,
        action: 'entity_created',
        entityType: 'entity',
        entityId: result[0].id,
        oldData: null,
        newData: {
          id: result[0].id,
          name: parsed.data.name,
          email: parsed.data.email,
          phone: parsed.data.phone,
          isActive: parsed.data.isActive === 'Y'
        }
      });
    }

    // 8. Redirect on success
    throw redirect(303, '/entities');
  }
};
```

---

## 4. Frontend Component

**Location:** `src/routes/(app)/<entity>/+page.svelte` or `src/routes/(app)/<entity>/add/+page.svelte`

### Component Pattern

```svelte
<script lang="ts">
  import type { ActionData, PageData } from './$types';
  import type { CreateInput } from '$lib/validation/entity';
  import { createSchema } from '$lib/validation/entity';
  import { zodAdapter } from '$lib/forms/zodAdapter';
  import { createForm } from '@tanstack/svelte-form';
  import { enhance } from '$app/forms';
  import { goto } from '$app/navigation';
  import { z } from 'zod';
  import { writable } from 'svelte/store';

  export let data: PageData;
  export let form: ActionData;

  let formEl: HTMLFormElement | null = null;

  // Type for field errors
  type Errors = Partial<Record<keyof CreateInput, string[]>>;

  // Initialize error tracking
  const errors: Errors | null = form?.errors ?? (data.errors as Errors | null);
  const values: CreateInput = (form?.values ?? data.values) as CreateInput;
  const fieldErrors = writable<Errors>({});

  // Track UI state
  let selectedPartnerId: string = values?.partnerId ?? '';
  const lockPartner = Boolean(data.lockPartner && data.lockedPartnerId);

  // Initialize form
  const formApi = createForm(() => ({
    defaultValues: values,
    validators: {
      onChange: zodAdapter(createSchema),
      onSubmit: zodAdapter(createSchema)
    },
    onSubmit: () => {
      formEl?.submit();
    }
  }));

  const Field = formApi.Field;

  // Map field schemas for validation
  const fieldSchemas: Record<keyof CreateInput, z.ZodTypeAny> = {
    name: createSchema.shape.name,
    email: createSchema.shape.email,
    phone: createSchema.shape.phone,
    isActive: createSchema.shape.isActive,
    partnerId: createSchema.shape.partnerId
  };

  // Validate individual field
  const validateFieldValue = (key: keyof CreateInput, value: unknown) => {
    const result = fieldSchemas[key].safeParse(value);
    const errs = result.success ? [] : result.error.issues.map(err => err.message);

    formApi.setFieldMeta(key, (prev) => ({ ...prev, errors: errs }));
    fieldErrors.update((curr) => ({ ...curr, [key]: errs }));
  };

  // Async email uniqueness check
  async function checkEmailUnique(email: string) {
    const trimmed = email.trim();
    if (!trimmed) return;

    try {
      const res = await fetch(
        `/users/check-email?email=${encodeURIComponent(trimmed)}`
      );
      if (!res.ok) return;
      const data = (await res.json()) as { exists: boolean };
      if (data.exists) {
        formApi.setFieldMeta('email', (prev) => ({
          ...prev,
          errors: ['Email already exists']
        }));
        fieldErrors.update((curr) => ({
          ...curr,
          email: ['Email already exists']
        }));
      }
    } catch {
      // Ignore network errors; server will validate
    }
  }

  // Re-hydrate from server after error
  function hydrateFromServer(nextValues: CreateInput | null, nextErrors: Errors | null) {
    if (nextValues) {
      for (const [key, val] of Object.entries(nextValues)) {
        formApi.setFieldValue(key as keyof CreateInput, val as never, {
          dontValidate: true
        });
      }
      if ('partnerId' in nextValues) selectedPartnerId = nextValues.partnerId ?? '';
    }
    if (nextErrors) {
      for (const [key, val] of Object.entries(nextErrors)) {
        const fieldKey = key as keyof CreateInput;
        formApi.setFieldMeta(fieldKey, (prev) => ({ ...prev, errors: val ?? [] }));
        fieldErrors.update((curr) => ({ ...curr, [fieldKey]: val ?? [] }));
      }
    }
  }

  // Get first error for display
  function getFirstError(fieldName: string): string | null {
    const errs = Object.entries($fieldErrors).find(([key]) => key === fieldName)?.[1];
    return errs && errs.length > 0 ? errs[0] : null;
  }

  // Re-hydrate when form result changes
  $: if (form) {
    hydrateFromServer(
      (form.values ?? null) as CreateInput | null,
      (form.errors ?? null) as Errors | null
    );
  }
</script>

<form
  method="POST"
  bind:this={formEl}
  use:enhance={() => {
    return async ({ result, update }) => {
      if (result.type === 'redirect') {
        await goto(result.location);
        return;
      }
      await update();
    };
  }}
  class="space-y-6"
>
  <!-- Name Field -->
  <Field name="name">
    {#snippet children(field)}
      <div>
        <label for="name" class="block text-sm font-medium text-gray-700 mb-1">
          Name <span class="text-red-500">*</span>
        </label>
        <input
          id="name"
          name="name"
          type="text"
          value={field.state.value ?? ''}
          on:input={(event) => {
            const value = (event.target as HTMLInputElement).value;
            field.handleChange(value);
            field.setMeta((prev) => ({ ...prev, isTouched: true }));
            validateFieldValue('name', value);
          }}
          on:blur={field.handleBlur}
          class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          class:border-red-500={getFirstError('name')}
          aria-invalid={getFirstError('name') ? 'true' : 'false'}
          aria-describedby={getFirstError('name') ? 'name-error' : undefined}
          required
        />
        {#if getFirstError('name')}
          <p id="name-error" class="mt-1 text-sm text-red-600">{getFirstError('name')}</p>
        {/if}
      </div>
    {/snippet}
  </Field>

  <!-- Email Field -->
  <Field name="email">
    {#snippet children(field)}
      <div>
        <label for="email" class="block text-sm font-medium text-gray-700 mb-1">
          Email <span class="text-red-500">*</span>
        </label>
        <input
          id="email"
          name="email"
          type="email"
          value={field.state.value ?? ''}
          on:input={(event) => {
            const value = (event.target as HTMLInputElement).value;
            field.handleChange(value);
            field.setMeta((prev) => ({ ...prev, isTouched: true }));
            validateFieldValue('email', value);
          }}
          on:blur={() => {
            field.handleBlur();
            checkEmailUnique(String(field.state.value ?? ''));
          }}
          class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          class:border-red-500={getFirstError('email')}
          aria-invalid={getFirstError('email') ? 'true' : 'false'}
          aria-describedby={getFirstError('email') ? 'email-error' : undefined}
          required
        />
        {#if getFirstError('email')}
          <p id="email-error" class="mt-1 text-sm text-red-600">{getFirstError('email')}</p>
        {/if}
      </div>
    {/snippet}
  </Field>

  <!-- Phone Field (10 digits only, no symbols) -->
  <Field name="phone">
    {#snippet children(field)}
      <div>
        <label for="phone" class="block text-sm font-medium text-gray-700 mb-1">
          Phone <span class="text-red-500">*</span>
        </label>
        <input
          id="phone"
          name="phone"
          type="text"
          inputmode="numeric"
          maxlength="10"
          value={field.state.value ?? ''}
          on:input={(event) => {
            const value = (event.target as HTMLInputElement).value.replace(/[^0-9]/g, '');
            (event.target as HTMLInputElement).value = value;
            field.handleChange(value);
            field.setMeta((prev) => ({ ...prev, isTouched: true }));
            validateFieldValue('phone', value);
          }}
          on:blur={field.handleBlur}
          class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          class:border-red-500={getFirstError('phone')}
          aria-invalid={getFirstError('phone') ? 'true' : 'false'}
          aria-describedby={getFirstError('phone') ? 'phone-error' : undefined}
          placeholder="1234567890"
          required
        />
        {#if getFirstError('phone')}
          <p id="phone-error" class="mt-1 text-sm text-red-600">{getFirstError('phone')}</p>
        {/if}
      </div>
    {/snippet}
  </Field>

  <!-- Partner Field (locked for partner managers) -->
  <Field name="partnerId">
    {#snippet children(field)}
      <div>
        {#if lockPartner}
          <!-- Hidden field for locked partner (ALWAYS use reactive variable!) -->
          <input type="hidden" name="partnerId" value={selectedPartnerId} />
        {/if}

        <label for="partnerId" class="block text-sm font-medium text-gray-700 mb-1">
          Partner <span class="text-red-500">*</span>
        </label>

        {#if lockPartner}
          <!-- Display only for partner managers -->
          <div class="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-700">
            {data.partners[0]?.name || 'Your Partner'}
          </div>
          <p class="mt-1 text-xs text-gray-500">Partner Managers can only create for their partner.</p>
        {:else}
          <!-- Dropdown for admins -->
          <select
            id="partnerId"
            name="partnerId"
            value={field.state.value ?? ''}
            on:change={(event) => {
              const value = (event.target as HTMLSelectElement).value;
              selectedPartnerId = value;
              field.handleChange(value);
              field.setMeta((prev) => ({ ...prev, isTouched: true }));
              validateFieldValue('partnerId', value);
            }}
            on:blur={field.handleBlur}
            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            class:border-red-500={getFirstError('partnerId')}
            aria-invalid={getFirstError('partnerId') ? 'true' : 'false'}
            aria-describedby={getFirstError('partnerId') ? 'partnerId-error' : undefined}
            required
          >
            <option value="">Select partner</option>
            {#each data.partners as partner}
              <option value={partner.id}>{partner.name}</option>
            {/each}
          </select>
        {/if}

        {#if getFirstError('partnerId')}
          <p id="partnerId-error" class="mt-1 text-sm text-red-600">{getFirstError('partnerId')}</p>
        {/if}
      </div>
    {/snippet}
  </Field>

  <!-- Active Status (Radio Buttons) -->
  <Field name="isActive">
    {#snippet children(field)}
      <div>
        <fieldset>
          <legend class="block text-sm font-medium text-gray-700 mb-2">
            Active Status <span class="text-red-500">*</span>
          </legend>
          <div class="flex space-x-6">
            <label class="flex items-center">
              <input
                type="radio"
                name="isActive"
                value="Y"
                checked={field.state.value === 'Y'}
                on:change={() => {
                  field.handleChange('Y');
                  field.setMeta((prev) => ({ ...prev, isTouched: true }));
                  validateFieldValue('isActive', 'Y');
                }}
                on:blur={field.handleBlur}
                class="mr-2"
              />
              <span class="text-sm">Yes</span>
            </label>
            <label class="flex items-center">
              <input
                type="radio"
                name="isActive"
                value="N"
                checked={field.state.value === 'N'}
                on:change={() => {
                  field.handleChange('N');
                  field.setMeta((prev) => ({ ...prev, isTouched: true }));
                  validateFieldValue('isActive', 'N');
                }}
                on:blur={field.handleBlur}
                class="mr-2"
              />
              <span class="text-sm">No</span>
            </label>
          </div>
        </fieldset>
        {#if getFirstError('isActive')}
          <p class="mt-1 text-sm text-red-600">{getFirstError('isActive')}</p>
        {/if}
      </div>
    {/snippet}
  </Field>

  <!-- Form Actions -->
  <div class="flex justify-end space-x-3 pt-6 border-t border-gray-200">
    <a
      href="/entities"
      class="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-md text-sm font-medium"
    >
      Cancel
    </a>
    <button
      type="submit"
      class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium"
    >
      Create Entity
    </button>
  </div>
</form>
```

---

## 5. Common Patterns & Pitfalls

### ❌ WRONG: Hidden Field Using `field.state.value`
```svelte
<!-- DON'T DO THIS -->
<input type="hidden" name="partnerId" value={field.state.value ?? ''} />
```

### ✅ CORRECT: Hidden Field Using Reactive Variable
```svelte
<!-- DO THIS -->
<script>
  let selectedPartnerId: string = values?.partnerId ?? '';
</script>
<input type="hidden" name="partnerId" value={selectedPartnerId} />
```

**Why:** Form submission uses DOM element values, not TanStack's internal state. Always sync reactive variables with field changes.

---

### ❌ WRONG: Not Re-validating on Server
```typescript
// Server action - DON'T skip validation
const formData = await event.request.formData();
const inserted = await db.insert(table).values(formData); // ❌ NO VALIDATION
```

### ✅ CORRECT: Always Re-validate Server-Side
```typescript
// Server action - ALWAYS validate
const formData = await event.request.formData();
const parsed = createSchema.safeParse(formData); // ✅ VALIDATE AGAIN
if (!parsed.success) {
  return fail(400, { errors: parsed.error.flatten().fieldErrors });
}
const inserted = await db.insert(table).values(parsed.data);
```

---

### ❌ WRONG: Forgetting Partner Scoping in Action
```typescript
// Action - DON'T skip scoping check
const parsed = createSchema.safeParse(payload);
await db.insert(table).values(parsed.data); // ❌ What if user is partner_manager?
```

### ✅ CORRECT: Always Enforce Scoping
```typescript
// Action - ALWAYS verify scoping
const user = await requireRole(event, UserRole.PARTNER_MANAGER);
const parsed = createSchema.safeParse(payload);

// Verify partner manager can only create for their partner
if (user.role === 'partner_manager' && parsed.data.partnerId !== user.partnerId) {
  return fail(403, { errors: { partnerId: ['Access denied'] } });
}
```

---

### ❌ WRONG: Not Checking Duplicates
```typescript
// Action - DON'T skip duplicate checks
const inserted = await db.insert(table).values(parsed.data); // ❌ Could violate uniqueness
```

### ✅ CORRECT: Check Duplicates Before Insert
```typescript
// Action - ALWAYS check duplicates
const existing = await db
  .select({ id: table.id })
  .from(table)
  .where(ilike(table.email, parsed.data.email))
  .limit(1);

if (existing.length > 0) {
  return fail(400, { errors: { email: ['Email already exists'] } });
}

const inserted = await db.insert(table).values(parsed.data);
```

---

## 6. Checklist for New Forms

Use this checklist when building a new form:

- [ ] **Schema:** Created in `src/lib/validation/<entity>.ts`
- [ ] **Types:** Exported `CreateInput` and `UpdateInput` types
- [ ] **Load:** Returns `values`, `errors`, `partners` (for dropdowns)
- [ ] **Load Guard:** Calls appropriate guard (`requireRole`, `requireUserAccess`, etc.)
- [ ] **Load Scoping:** Partner manager dropdowns filtered by partner
- [ ] **Action Guard:** Re-checks authorization
- [ ] **Action Validation:** Re-validates with Zod (never skip!)
- [ ] **Action Scoping:** Verifies partner_manager access if applicable
- [ ] **Duplicate Check:** Checks for existing records before insert
- [ ] **Error Recovery:** Returns form state + dropdown data on error
- [ ] **Audit Logging:** Logs create/update with old/new snapshots
- [ ] **Redirect:** Uses `throw redirect(303, '/path')` on success
- [ ] **Frontend Init:** Creates form with `zodAdapter` validators
- [ ] **Frontend Fields:** All use `<Field>` snippet pattern
- [ ] **Hidden Fields:** Use reactive variables, NOT `field.state.value`
- [ ] **Phone Fields:** Use `inputmode="numeric"` + filtering
- [ ] **Checkbox Fields:** Handle 'on' string transformation
- [ ] **Error Display:** Show first error with proper `aria-describedby`
- [ ] **Partner Lock:** Lock partner field in UI AND server for partner_manager
- [ ] **Form Submit:** Use `use:enhance` with redirect handling

---

## 7. File Structure Reference

```
src/lib/validation/
  └── entity.ts          ← Schema definitions (create, update, types)

src/routes/(app)/entity/
  ├── +page.server.ts    ← Load + actions
  └── +page.svelte       ← Form component

src/routes/(app)/entity/add/
  ├── +page.server.ts    ← Create load + actions
  └── +page.svelte       ← Create form component

src/routes/(app)/entity/[id]/edit/
  ├── +page.server.ts    ← Edit load + actions
  └── +page.svelte       ← Edit form component
```

---

## 8. Testing Forms

### Unit Test Pattern
```typescript
import { describe, it, expect } from 'vitest';
import { createSchema } from '$lib/validation/entity';

describe('Entity Schema', () => {
  it('should accept valid data', () => {
    const result = createSchema.safeParse({
      name: 'Test',
      email: 'test@example.com',
      phone: '1234567890',
      isActive: 'Y'
    });
    expect(result.success).toBe(true);
  });

  it('should reject invalid phone', () => {
    const result = createSchema.safeParse({
      name: 'Test',
      email: 'test@example.com',
      phone: '12345', // Too short
      isActive: 'Y'
    });
    expect(result.success).toBe(false);
    expect(result.error.flatten().fieldErrors.phone).toBeDefined();
  });

  it('should transform empty string to null', () => {
    const result = createSchema.safeParse({
      name: 'Test',
      email: 'test@example.com',
      phone: '1234567890',
      isActive: 'Y',
      address: '' // Empty string
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.address).toBeNull();
    }
  });
});
```

---

## 9. Quick Reference: Field Types

| Field Type | Input Element | Validation | Transform |
|-----------|--------------|-----------|-----------|
| Text (required) | `<input type="text" />` | `.min(2).max(255)` | `.trim()` |
| Email | `<input type="email" />` | `.email()` | `.trim()` |
| Phone (10 digit) | `<input inputmode="numeric" maxlength="10" />` | `/^\d{10}$/` | `.trim()` + filter `/[^0-9]/g` |
| Phone (flexible) | `<input />` | `/^[0-9+()\-\s]{10,20}$/` | `.trim()` |
| Checkbox | `<input type="checkbox" />` | `.union([z.string(), z.boolean()])` | `.transform(v => v === 'on')` |
| Radio | `<input type="radio" />` | `.enum(['Y', 'N'])` | `.default('Y')` |
| Select/Dropdown | `<select />` | `.uuid()` | None needed |
| Textarea | `<textarea />` | `.max(1000)` | `.trim()` |
| Date | `<input type="text" />` | `/^dd\/mm\/yyyy$/` with validation | None |
| Optional Text | `<input />` | `.optional().or(z.literal(''))` | `.transform(v => v \|\| null)` |

