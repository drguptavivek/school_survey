# Survey Form Implementation Plan

**Phase:** School & Survey Management (Weeks 5-6)
**Context:** Web-based survey management system + API endpoints for Android app sync
**Updated:** December 14, 2024

## Overview

Implementation of a comprehensive survey form system with 50+ fields across 7 sections, supporting both web-based data entry and API endpoints for Android app synchronization. The system will feature conditional logic, role-based access control, time-based edit restrictions, and offline data collection capabilities.

## Key Requirements & Context

### Android App Integration (Primary Data Entry)
- Users authenticate with server credentials in the app
- Users **set local PIN** after successful login for offline access
- **Form validation logic primarily in Android App**
- School selection from partner/district list
- Offline data collection with sync when online
- **Sync ACK required for each form received via API**
- **PIN-based local authentication** for offline security

### Svelte Web Application (Data Management)
- **Form list/tabulated view** of all submitted surveys
- View individual forms with full details
- Edit/update forms with complete audit trail
- Delete forms with audit logging
- **Minimal validation** (trust Android app validation)
- API endpoints for receiving and acknowledging Android submissions

### Sync Protocol Requirements
- **Individual form ACK** for each received submission
- Reliable delivery confirmation
- Conflict resolution for duplicate submissions
- Status tracking for sync operations

### Business Rules
- **Unique Survey ID:** `{district_code}-{school_code}-{class}-{section}-{roll_no}`
- **Time-based editing:** Team (24h), Partner (15d), National (unlimited)
- **Conditional sections:** C (referral), F (glasses usage)
- **Partner scoping:** Data isolation by partner
- **Audit logging:** Complete change tracking

## Implementation Phases

### Phase 1: Foundation (Week 5)

#### 1.1 Android API Infrastructure
```typescript
// Core Android endpoints:
src/routes/api/auth/login/+server.ts           // Android user login + device token
src/routes/api/auth/verify/+server.ts           // Token verification for app
src/routes/api/auth/refresh/+server.ts         // Device token refresh
src/routes/api/sync/status/+server.ts          // Sync status and operations
src/routes/api/sync/upload/+server.ts          // Bulk form upload with ACK
src/routes/api/schools/by-partner/+server.ts    // Partner's school list
src/routes/api/surveys/submit/+server.ts        // Single form submission with ACK
src/routes/api/surveys/unique-id/+server.ts     // Validate unique survey IDs
src/routes/api/surveys/sync-status/+server.ts   // Check individual form sync status
```

**Key Implementation Details:**
- **Login with Device Token Issuance**: Long-lived tokens for Android devices
- **Comprehensive audit logging** for all device token operations
- **Token expiration and revocation** management in Svelte
- **Data encryption/decryption** using device tokens
- **Immediate ACK response** for each form submission
- **Duplicate detection** using survey_unique_id
- **Minimal server validation** (trust Android app)
- **Sync status tracking** for reliable delivery
- **Bulk sync support** for offline queue management

#### 1.2 Svelte Web Management
```typescript
// Web management files:
src/lib/validation/survey-basic.ts            // Basic validation for edits
src/lib/server/survey-utils.ts                // Helper functions
src/lib/data/visual-acuity.ts                 // Display constants
src/routes/(app)/surveys/+page.server.ts       // Survey list with filtering
src/routes/(app)/surveys/[id]/+page.server.ts  // Survey details view
```

**Minimal Validation Strategy:**
- Basic field presence checks
- Survey ID uniqueness enforcement
- Enum value validation
- Trust Android app for complex business rules

#### 1.3 Android Authentication & Device Token System
```typescript
// src/routes/api/auth/login/+server.ts
export const POST = async ({ request }) => {
  const { email, password, deviceId, deviceInfo } = await request.json();

  // Verify credentials
  const user = await authenticateUser(email, password);
  if (!user) {
    return json({ error: 'Invalid credentials' }, { status: 401 });
  }

  // Generate device token (long-lived)
  const deviceToken = generateDeviceToken(user.id, deviceId);

  // Store device token with metadata
  const insertedToken = await db.insert(deviceTokens).values({
    user_id: user.id,
    device_id: deviceId,
    token: deviceToken,
    device_info: deviceInfo,
    expires_at: new Date(Date.now() + (365 * 24 * 60 * 60 * 1000)), // 1 year
    last_used: new Date()
  }).returning();

  // **Comprehensive Audit Logging**
  await logAudit({
    action: 'device_token_issued',
    entityType: 'device_token',
    entityId: insertedToken[0].id,
    userId: user.id,
    newData: {
      device_id: deviceId,
      device_info: deviceInfo,
      expires_at: insertedToken[0].expires_at,
      ip_address: getClientIP(event),
      user_agent: event.request.headers.get('user-agent')
    }
  });

  return json({
    success: true,
    user: { id: user.id, email: user.email, role: user.role, partnerId: user.partnerId },
    deviceToken,
    expiresAt: new Date(Date.now() + (365 * 24 * 60 * 60 * 1000)),
    // **PIN Setup Response**
    requiresPinSetup: true,
    message: 'Login successful. Please set up your local PIN for offline access.'
  });
};

// src/routes/api/auth/verify/+server.ts
export const POST = async ({ request }) => {
  const token = request.headers.get('Authorization')?.replace('Bearer ', '');

  const deviceToken = await verifyDeviceToken(token);
  if (!deviceToken) {
    return json({ error: 'Invalid token' }, { status: 401 });
  }

  // Check token expiration
  if (deviceToken.expires_at < new Date()) {
    await logAudit({
      action: 'device_token_expired',
      entityType: 'device_token',
      entityId: deviceToken.id,
      userId: deviceToken.user_id,
      newData: {
        device_id: deviceToken.device_id,
        reason: 'Token expired during verification'
      }
    });

    // Revoke expired token
    await db.update(deviceTokens)
      .set({ is_revoked: true, revoked_at: new Date() })
      .where(eq(deviceTokens.token, token));

    return json({
      valid: false,
      error: 'Token expired',
      requiresReauth: true
    }, { status: 401 });
  }

  // Update last used timestamp
  await db.update(deviceTokens)
    .set({ last_used: new Date() })
    .where(eq(deviceTokens.token, token));

  return json({
    valid: true,
    user: deviceToken.users
  });
};
```

#### 1.4 Local PIN Security (Android App Side)

**Android PIN Setup Flow:**
1. **User logs in** with server credentials → receives device token
2. **App prompts user to set local PIN** (4-6 digits, confirmed twice)
3. **PIN is stored securely** on device (Android Keystore/Keychain)
4. **PIN encrypted device token** stored locally for offline access
5. **Subsequent app opens** require PIN verification, not server credentials

**PIN Security Implementation (Android App):**
```java
// Android PIN Setup Flow (pseudo-code)
public class PinManager {
    // After successful server login
    public void setupPinFlow(String deviceToken) {
        // Prompt user to create PIN
        String pin = promptForPin("Set up your PIN for offline access");
        String confirmPin = promptForPin("Confirm your PIN");

        if (pin.equals(confirmPin) && isValidPin(pin)) {
            // Encrypt and store device token with PIN
            String encryptedToken = encryptWithPin(deviceToken, pin);
            secureStorage.store("encrypted_device_token", encryptedToken);
            secureStorage.store("pin_hash", hashPin(pin));

            // Mark device as PIN-protected
            preferences.setPinRequired(true);
        }
    }

    // Verify PIN on app start
    public boolean verifyPin(String enteredPin) {
        String storedHash = secureStorage.get("pin_hash");
        return verifyPinHash(enteredPin, storedHash);
    }

    // Get device token for API calls
    public String getDeviceToken(String pin) {
        String encryptedToken = secureStorage.get("encrypted_device_token");
        return decryptWithPin(encryptedToken, pin);
    }
}
```

**PIN Requirements & Security:**
- **4-6 digit numeric PIN** (configurable)
- **PIN confirmation** during setup
- **Rate limiting** for failed attempts (e.g., 5 attempts → 30s lockout)
- **Secure storage** using Android Keystore
- **PIN-based encryption** for sensitive local data
- **Option to change/reset PIN** (requires re-authentication)

#### 1.5 Token Management & Encryption APIs

**Device Token Management Endpoints:**
```typescript
// src/routes/api/device-tokens/+page.server.ts
export const load: PageServerLoad = async ({ locals }) => {
  const user = await requireAuth(locals);

  const tokens = await db.select()
    .from(deviceTokens)
    .where(eq(deviceTokens.user_id, user.id))
    .orderBy(desc(deviceTokens.created_at));

  return { tokens };
};

// src/routes/api/device-tokens/[id]/revoke/+server.ts
export const POST = async ({ params, locals }) => {
  const user = await requireAuth(locals);
  const tokenId = params.id;

  const token = await db.select()
    .from(deviceTokens)
    .where(and(eq(deviceTokens.id, tokenId), eq(deviceTokens.user_id, user.id)))
    .limit(1);

  if (!token[0]) {
    return json({ error: 'Token not found' }, { status: 404 });
  }

  // Revoke token with audit
  await db.update(deviceTokens)
    .set({
      is_revoked: true,
      revoked_at: new Date(),
      revoked_by: user.id
    })
    .where(eq(deviceTokens.id, tokenId));

  await logAudit({
    action: 'device_token_revoked',
    entityType: 'device_token',
    entityId: tokenId,
    userId: user.id,
    oldData: token[0],
    newData: { is_revoked: true, revoked_at: new Date() }
  });

  return json({ success: true, message: 'Device token revoked successfully' });
};
```

**Data Encryption/Decryption with Device Tokens:**
```typescript
// src/routes/api/sync/upload/+server.ts (Enhanced with encryption)
export const POST = async ({ request }) => {
  const { forms, encryptionKey } = await request.json();
  const token = request.headers.get('Authorization')?.replace('Bearer ', '');

  const user = await verifyDeviceToken(token);
  if (!user) {
    return json({ error: 'Unauthorized' }, { status: 401 });
  }

  // **Validate device token and get encryption context**
  const deviceContext = await getDeviceEncryptionContext(token);
  if (!deviceContext) {
    await logAudit({
      action: 'encryption_context_failed',
      entityType: 'sync_operation',
      userId: user.id,
      newData: { reason: 'Invalid device context for decryption' }
    });
    return json({ error: 'Invalid device context' }, { status: 401 });
  }

  const results = [];

  for (const form of forms) {
    try {
      // **Decrypt form data using device token**
      const decryptedForm = await decryptFormData(form, deviceContext.encryptionKey);

      // Check duplicate
      const existing = await checkDuplicateSurvey(decryptedForm.survey_unique_id);
      if (existing) {
        results.push({
          localId: form.localId,
          success: false,
          error: 'Duplicate survey',
          existingId: existing.id
        });
        continue;
      }

      // Insert survey
      const survey = await db.insert(surveyResponses).values({
        ...decryptedForm,
        partner_id: user.partnerId,
        submitted_by: user.id,
        submitted_at: new Date()
      }).returning();

      results.push({
        localId: form.localId,
        success: true,
        surveyId: survey[0].id,
        timestamp: new Date(),
        ack: 'Form received and processed'
      });

    } catch (error) {
      await logAudit({
        action: 'form_decryption_failed',
        entityType: 'survey_response',
        userId: user.id,
        newData: {
          localId: form.localId,
          error: error.message,
          deviceId: deviceContext.deviceId
        }
      });

      results.push({
        localId: form.localId,
        success: false,
        error: 'Decryption failed'
      });
    }
  }

  // **Audit successful sync operation**
  await logAudit({
    action: 'bulk_sync_completed',
    entityType: 'sync_operation',
    userId: user.id,
    newData: {
      totalForms: forms.length,
      successfulForms: results.filter(r => r.success).length,
      failedForms: results.filter(r => !r.success).length,
      deviceId: deviceContext.deviceId
    }
  });

  return json({
    success: true,
    processed: forms.length,
    results
  });
};
```

#### 1.6 Enhanced Android Authentication Flow

**Complete Authentication Sequence:**
```java
// Complete Android Auth Flow with encryption
public class AuthenticationFlow {
    public void authenticate() {
        if (!preferences.isPinSetup()) {
            // First time setup
            loginWithServerCredentials();
        } else {
            // PIN-based access
            String pin = promptForPin("Enter your PIN");
            if (pinManager.verifyPin(pin)) {
                String deviceToken = pinManager.getDeviceToken(pin);
                initializeApiSession(deviceToken);
            } else {
                handleFailedPinAttempt();
            }
        }
    }

    private void loginWithServerCredentials() {
        // Get credentials from user
        String email = promptForEmail();
        String password = promptForPassword();
        String deviceId = getDeviceId();
        String deviceInfo = getDeviceInfo();

        // Server login
        LoginResponse response = apiService.login(email, password, deviceId, deviceInfo);

        if (response.success) {
            if (response.requiresPinSetup) {
                // Setup PIN flow
                pinManager.setupPinFlow(response.deviceToken);
                preferences.setPinSetup(true);
            }
            initializeApiSession(response.deviceToken);
        }
    }

    // **Data encryption before upload**
    public List<EncryptedForm> encryptFormsForUpload(List<SurveyForm> forms) {
        List<EncryptedForm> encryptedForms = new ArrayList<>();
        String deviceToken = getCurrentDeviceToken();

        for (SurveyForm form : forms) {
            try {
                String encryptedData = encryptForm(form, deviceToken);
                encryptedForms.add(new EncryptedForm(
                    form.getLocalId(),
                    encryptedData,
                    generateChecksum(form)
                ));
            } catch (Exception e) {
                Log.e("EncryptionError", "Failed to encrypt form: " + form.getLocalId());
            }
        }
        return encryptedForms;
    }
}
```

#### 1.6 Sync API with ACK
```typescript
// src/routes/api/sync/upload/+server.ts
export const POST = async ({ request }) => {
  const { forms } = await request.json();
  const token = request.headers.get('Authorization')?.replace('Bearer ', '');

  const user = await verifyDeviceToken(token);
  if (!user) {
    return json({ error: 'Unauthorized' }, { status: 401 });
  }

  const results = [];

  for (const form of forms) {
    try {
      // Check duplicate
      const existing = await checkDuplicateSurvey(form.survey_unique_id);
      if (existing) {
        results.push({
          localId: form.localId,
          success: false,
          error: 'Duplicate survey',
          existingId: existing.id
        });
        continue;
      }

      // Insert survey
      const survey = await db.insert(surveyResponses).values({
        ...form,
        partner_id: user.partnerId,
        submitted_by: user.id,
        submitted_at: new Date()
      }).returning();

      results.push({
        localId: form.localId,
        success: true,
        surveyId: survey[0].id,
        timestamp: new Date(),
        ack: 'Form received and processed'
      });

    } catch (error) {
      results.push({
        localId: form.localId,
        success: false,
        error: error.message
      });
    }
  }

  return json({
    success: true,
    processed: forms.length,
    results
  });
};
```

### Phase 2: Core Survey Management (Week 5-6)

#### 2.1 Android Form Submission API
```typescript
// src/routes/api/surveys/submit/+server.ts
export const POST = async ({ request }) => {
  const formData = await request.json();
  const user = await requireAuthFromToken(request);

  // Minimal validation - trust Android app
  const surveyData = {
    ...formData,
    partner_id: user.partnerId,
    submitted_by: user.id,
    submitted_at: new Date()
  };

  // Check for duplicates
  const existing = await checkDuplicateSurvey(surveyData.survey_unique_id);
  if (existing) {
    return json({
      success: false,
      error: 'Duplicate survey',
      existing_id: existing.id
    }, { status: 409 });
  }

  // Insert survey
  const survey = await db.insert(surveyResponses).values(surveyData).returning();

  // Log audit
  await logAudit({
    action: 'create',
    entityType: 'survey_response',
    entityId: survey[0].id,
    newData: surveyData
  });

  // **Immediate ACK Response**
  return json({
    success: true,
    survey_id: survey[0].id,
    timestamp: new Date(),
    ack: 'Form received and processed'
  });
};
```

#### 2.2 Web Survey Management Structure
```svelte
src/routes/(app)/surveys/
├── +page.server.ts                    // Survey list with filtering
├── +page.svelte                       // Tabulated survey list UI
├── [id]/
│   ├── +page.server.ts               // Survey details view
│   ├── +page.svelte                  // Full survey details display
│   ├── edit/
│   │   ├── +page.server.ts           // Edit with deadline check
│   │   ├── +page.svelte              // Edit form (simple fields)
│   │   └── +server.ts                // Update with audit trail
│   ├── delete/+server.ts             // Delete with audit
│   └── export/+server.ts             // CSV/Excel export

src/routes/(app)/device-tokens/
├── +page.server.ts                   // Device token list for user
├── +page.svelte                      // Device token management UI
├── [id]/
│   ├── +page.server.ts               // Individual token details
│   ├── +page.svelte                  // Token info and activity
│   └── revoke/+server.ts             // Revoke token endpoint
```

#### 2.3 Tabulated Survey List View
```svelte
<!-- Survey list with key information -->
<table>
  <thead>
    <tr>
      <th>Survey ID</th>
      <th>Student Name</th>
      <th>School</th>
      <th>Class/Section</th>
      <th>Submitted</th>
      <th>Status</th>
      <th>Actions</th>
    </tr>
  </thead>
  <tbody>
    {#each surveys as survey}
      <tr>
        <td>{survey.survey_unique_id}</td>
        <td>{survey.student_name}</td>
        <td>{survey.schools.name}</td>
        <td>{survey.class}-{survey.section}</td>
        <td>{formatDate(survey.submitted_at)}</td>
        <td>{getEditStatus(survey)}</td>
        <td>
          <a href="/surveys/{survey.id}">View</a>
          <a href="/surveys/{survey.id}/edit">Edit</a>
        </td>
      </tr>
    {/each}
  </tbody>
</table>
```

### Phase 3: Advanced Features (Week 6)

#### 3.1 Edit with Full Audit Trail
```typescript
// src/routes/(app)/surveys/[id]/edit/+page.server.ts
export const load = async ({ params, locals }) => {
  const user = await requireAuth(locals);
  const survey = await getSurveyWithDeadlines(params.id);

  // Check edit permissions and deadlines
  if (!canEditSurvey(user, survey.submitted_at, survey.submitted_by)) {
    throw error(403, 'Edit period has expired');
  }

  return { survey, editWindow: getEditWindow(user, survey) };
};

export const actions = {
  update: async ({ request, params, locals }) => {
    const user = await requireAuth(locals);
    const formData = await request.formData();
    const oldSurvey = await getSurvey(params.id);

    // Minimal validation for edits
    const updates = validateSurveyUpdates(formData);

    // Update with audit trail
    await db.update(surveyResponses)
      .set({
        ...updates,
        last_edited_by: user.id,
        last_edited_at: new Date()
      })
      .where(eq(surveyResponses.id, params.id));

    // **Complete audit logging**
    await logAudit({
      action: 'update',
      entityType: 'survey_response',
      entityId: params.id,
      oldData: oldSurvey,
      newData: { ...oldSurvey, ...updates }
    });

    return { success: true };
  }
};
```

#### 3.2 Delete with Audit Trail
```typescript
// src/routes/(app)/surveys/[id]/delete/+server.ts
export const POST = async ({ params, locals }) => {
  const user = await requireAuth(locals);
  const survey = await getSurvey(params.id);

  // Check deletion permissions
  if (!canDeleteSurvey(user, survey)) {
    throw error(403, 'Cannot delete this survey');
  }

  // **Soft delete with audit**
  await db.update(surveyResponses)
    .set({
      is_deleted: true,
      deleted_by: user.id,
      deleted_at: new Date()
    })
    .where(eq(surveyResponses.id, params.id));

  await logAudit({
    action: 'delete',
    entityType: 'survey_response',
    entityId: params.id,
    oldData: survey
  });

  return json({ success: true, message: 'Survey deleted successfully' });
};
```

#### 3.3 Export & Reporting
- Excel export with all survey fields
- CSV export for data analysis
- Filtering by date range, school, district, partner
- Role-based data access in exports

## Critical Files & Implementation Details

### 1. Android Form Submission API
**File:** `src/routes/api/surveys/submit/+server.ts`
- **Immediate ACK response** for each submission
- Minimal validation (trust Android app)
- Duplicate survey detection using unique_id
- Automatic partner scoping from user context
- Basic audit logging for received forms

### 2. Survey List View (Tabulated)
**File:** `src/routes/(app)/surveys/+page.svelte`
- **Table-based survey listing** with key columns
- Role-based filtering and search
- Partner scoping for limited access
- Edit status indicators (deadline remaining)
- Bulk operations (export, delete)

### 3. Survey Details View
**File:** `src/routes/(app)/surveys/[id]/+page.svelte`
- **Complete survey display** across all 7 sections
- Read-only view of all form data
- Audit trail visibility (who submitted, who edited)
- Edit permissions check with time remaining
- Action buttons (edit, delete, export)

### 4. Edit with Full Audit Trail
**File:** `src/routes/(app)/surveys/[id]/edit/+page.server.ts`
- **Complete audit logging** with old/new data snapshots
- Edit deadline enforcement by role
- Partner scoping verification
- Minimal validation for web edits
- Time window calculations and display

### 5. Device Token Management UI
**File:** `src/routes/(app)/device-tokens/+page.svelte`
- **Device token listing** with status, last used, expiration
- **Revoke functionality** with confirmation dialog
- **Token activity monitoring** with audit trail
- **Security information display** (device info, IP addresses)
- **Bulk revoke options** for all user tokens

### 6. Survey Management Utilities
**File:** `src/lib/server/survey-utils.ts`
- Unique survey ID validation
- Edit deadline calculations
- Partner scoping helpers
- Export formatting functions
- Audit log redaction for sensitive fields
- Device token encryption/decryption helpers

## Critical Security & Architecture Fixes (Week 5)

**⚠️ IMMEDIATE SECURITY FIXES REQUIRED BEFORE DEVELOPMENT**

### Authentication & Token Security
- [ ] **Reduce token lifetimes** (Access: 1 hour, Refresh: 30 days, Device: 90 days max)
- [ ] **Implement MFA with TOTP** for all user roles
- [ ] **Add device fingerprinting** and adaptive authentication
- [ ] **Implement biometric support** in Android app
- [ ] **Add rate limiting** (15 attempts per 15 minutes, 5 PIN attempts with exponential backoff)
- [ ] **Enhance PIN requirements** (6+ characters, include alphanumeric, lockout after 5 attempts)

### API Security Framework
- [ ] **Never trust client validation** - comprehensive server-side validation for ALL fields
- [ ] **Add security headers** (CSP, HSTS, X-Frame-Options, etc.)
- [ ] **Implement API gateway** with rate limiting and request signing
- [ ] **Add API versioning** and key rotation mechanisms
- [ ] **Implement CORS configuration** with strict origin validation
- [ ] **Add input sanitization** for all string fields (XSS prevention)

### Data Protection & Encryption
- [ ] **Define encryption standards** (AES-256-GCM, PBKDF2 key derivation, 100k iterations)
- [ ] **Implement field-level encryption** for PII in database
- [ ] **Add data masking** in audit logs (redact student names, phone numbers)
- [ ] **Secure key management** with hardware security modules (HSM) or cloud KMS
- [ ] **Implement certificate pinning** in Android app

### Database Schema & Architecture
- [ ] **Add device_tokens table** with proper indexing and constraints
- [ ] **Implement survey_responses partitioning** by submission date (monthly)
- [ ] **Add critical composite indexes** for query performance optimization
- [ ] **Set up audit_logs partitioning** (weekly) with automated compression
- [ ] **Create database connection pooling** (PgBouncer) and read replicas
- [ ] **Implement data retention policies** (2 years active, 5 years archive, 7 years cold storage)

## Implementation Checklist (Post-Security Fixes)

### Android API Foundation (Week 5-6)
- [ ] **Create secure login API** with MFA support and proper token lifetimes
- [ ] **Implement comprehensive audit logging** for all device token operations
- [ ] **Create device token management endpoints** (list, revoke, expire, rotate)
- [ ] **Implement end-to-end data encryption** with proper key management
- [ ] **Create optimized bulk sync API** with batch processing (100 forms per batch)
- [ ] **Create single form submission API** with immediate ACK
- [ ] **Implement duplicate survey detection** with proper indexing
- [ ] **Set up async audit logging** with message queues for performance
- [ ] **Create school listing API** with partner scoping and caching
- [ ] **Build unique survey ID validation endpoint** with proper validation
- [ ] **Design enhanced PIN-based authentication** with biometric support

### TypeScript & Code Architecture (Week 5-6)
- [ ] **Create comprehensive TypeScript interfaces** for all data contracts
- [ ] **Implement Result pattern** for better error handling and type safety
- [ ] **Add standardized API response types** with proper error codes
- [ ] **Create modular service architecture** (SurveyService, DeviceTokenService, AuthService)
- [ ] **Implement proper input validation schemas** using Zod for all endpoints
- [ ] **Add comprehensive error handling** with custom error classes
- [ ] **Create security middleware** for rate limiting and validation
- [ ] **Add comprehensive type definitions** for encryption contexts and audit data

### Web Management Interface (Week 5-6)
- [ ] **Build tabulated survey list view with filtering**
- [ ] **Create survey details view (read-only)**
- [ ] **Implement edit form with deadline enforcement**
- [ ] **Add delete functionality with complete audit trail**
- [ ] **Build export functionality (CSV/Excel)**
- [ ] **Partner scoping enforcement for all views**
- [ ] **Create device token management interface (list, view, revoke)**
- [ ] **Add audit log viewer for device token operations**

### Audit & Security (Week 6)
- [ ] **Complete audit logging for all operations**
- [ ] **Edit deadline enforcement by role**
- [ ] **Partner scoping verification**
- [ ] **Soft delete with audit trail**
- [ ] **Sensitive field redaction in logs**
- [ ] **Role-based access control for all features**

### Security Testing & Integration (Week 6)
- [ ] **Penetration testing** of all API endpoints
- [ ] **OWASP Top 10 vulnerability scanning**
- [ ] **Rate limiting and abuse prevention testing**
- [ ] **Encryption key management testing**
- [ ] **MFA implementation testing** across all roles
- [ ] **Mobile app security testing** (jailbreak/root detection, SafetyNet)
- [ ] **Input validation bypass testing**
- [ ] **SQL injection and XSS prevention testing**
- [ ] **Data masking and audit log security testing**
- [ ] **Load testing** with security monitoring
- [ ] **Android app integration testing**
- [ ] **Device token authentication testing**
- [ ] **PIN-based local authentication testing**
- [ ] **API ACK mechanism verification**
- [ ] **Bulk sync operations testing**
- [ ] **Duplicate submission handling**
- [ ] **Edit deadline testing by role**
- [ ] **Audit trail verification**
- [ ] **Partner scoping security testing**

## Technical Considerations

### Android App Integration (Security Enhanced)
- **Secure Token Lifecycle**: Access tokens (1h), Refresh tokens (30d), Device auth (90d max)
- **Multi-Factor Authentication**: TOTP + Biometric support for enhanced security
- **Enhanced PIN Security**: 6+ character alphanumeric PINs with exponential backoff lockout
- **App Integrity Verification**: SafetyNet/App Attest with certificate pinning
- **Root/Jailbreak Detection**: Block app execution on compromised devices
- **Secure Storage**: Android Keystore with proper key derivation and hardware backing
- **Immediate ACK Protocol**: Each form submission must receive acknowledgment
- **Bulk Sync Support**: Upload multiple forms with batch processing (100 forms/batch)
- **Duplicate Handling**: Robust detection using survey_unique_id with database constraints
- **Offline Queue**: Encrypted local storage with secure queuing for failed submissions
- **Conflict Resolution**: Clear protocol for handling duplicate submissions with audit trail

### Web Interface Performance
- **Table Pagination**: For large survey datasets
- **Efficient Filtering**: Database-level filtering by partner, district, school
- **Export Optimization**: Stream large exports to avoid memory issues
- **Audit Log Pagination**: Handle large audit histories efficiently

### Security & Compliance (Enhanced)
- **Zero-Trust Architecture**: Never trust client validation, comprehensive server-side verification
- **OWASP Top 10 Compliance**: Address all 10 security categories with proper controls
- **Data Protection**: Field-level encryption for PII, GDPR compliance, data masking in logs
- **Advanced Authentication**: MFA with TOTP, device fingerprinting, adaptive authentication
- **Rate Limiting**: Comprehensive abuse prevention (API calls, login attempts, PIN attempts)
- **Security Headers**: CSP, HSTS, X-Frame-Options, proper CORS configuration
- **Complete Audit Trail**: Every operation tracked with old/new data, security event monitoring
- **Partner Data Isolation**: Strict enforcement of partner scoping with database-level controls
- **Role-based Edit Windows**: Time-based restrictions enforced server-side
- **Regular Security Testing**: Automated vulnerability scanning, penetration testing

### API Reliability & Performance
- **Standardized Error Handling**: Result pattern with custom error classes and proper HTTP codes
- **Comprehensive Input Validation**: Zod schemas for all API contracts with sanitization
- **Optimized Bulk Operations**: Batch processing (100 items) with transaction management
- **Async Audit Logging**: Message queues for non-blocking audit log creation
- **Database Connection Pooling**: PgBouncer with read replicas for performance
- **Caching Layer**: Redis for frequent lookups (schools, districts, user sessions)
- **Status Tracking**: Comprehensive sync status with delivery confirmations
- **Retry Logic**: Exponential backoff for failed submissions with circuit breaker pattern
- **Performance Monitoring**: Real-time query performance tracking and alerting
- **Database Partitioning**: Time-based partitioning for large tables with automated maintenance

## Architecture Summary

**Secure Data Flow:**
1. **Android Login** → Credentials + MFA → **Secure Token Lifecycle** (Access: 1h, Refresh: 30d, Device: 90d) → **Enhanced PIN Setup** (Biometric + 6+ character PIN)
2. **Android App** → **Enhanced Authentication** (PIN + Biometric + Device Integrity) → **Encrypted Form Data** → **Batch API Submission** → **Individual ACK**
3. **Svelte API** → **Zero-Trust Validation** → Decrypt → Store + **Comprehensive Audit** → **Rate Limited Response**
4. **Web Interface** → **Role-based Access** → List surveys → View/Edit/Delete → **Complete Security Audit Trail**

**Secure Design Principles:**
- **Zero-Trust Architecture**: Comprehensive server-side validation, never trust client
- **Defense in Depth**: Multiple security layers (MFA, device integrity, encryption)
- **Secure Token Lifecycle**: Minimal token lifetimes with proper rotation and revocation
- **Enhanced Local Security**: Biometric + alphanumeric PIN with hardware-backed storage
- **OWASP Top 10 Compliance**: Address all security vulnerabilities with proper controls
- **Complete Audit Trail**: Every operation logged with security event monitoring
- **Performance Optimized**: Database partitioning, connection pooling, async operations
- **Scalable Architecture**: Read replicas, caching, batch processing for large datasets

**Critical Security Requirements:**
- **Authentication**: MFA required for all roles, device fingerprinting, adaptive authentication
- **Authorization**: RBAC with partner scoping, time-based edit windows, audit logging
- **Data Protection**: Field-level encryption, data masking in logs, GDPR compliance
- **API Security**: Rate limiting, input validation, security headers, CORS configuration
- **Mobile Security**: App integrity verification, root detection, certificate pinning
- **Database Security**: Partitioning, indexing, connection pooling, backup strategies

This comprehensive plan now implements enterprise-grade security with proper authentication, data protection, performance optimization, and compliance requirements, ensuring the survey system can securely handle sensitive educational data at scale.