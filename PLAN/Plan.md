# School Survey Application - Implementation Plan

## Project Overview
A large-scale multi-tenant survey application for educational data collection across 60 districts with hierarchical access control. Built with Svelte 5 + SvelteKit + PostgreSQL.

## User Hierarchy & Roles

### 1. National Coordinating Centre
- **National Admins (2-3)**: Create partners, map partners to districts, full system access
- **Data Managers (2-3)**: View all data, download national-level reports

### 2. Partners (40 partners across 60 districts)
- **Partner Managers (1-2 per partner)**: Manage teams, upload schools, download partner reports
- **Team Members (6-7 per partner)**: Submit child-level survey forms at schools

### 3. Survey Workflow
1. National admin creates partner accounts and maps them to districts
2. Partner managers upload school lists for their assigned districts
3. Partner managers select schools for survey
4. Team members visit schools and fill survey forms for each child
5. National level views all data; partners view only their own data

## Technology Stack
- **Frontend**: Svelte 5 with runes ($state, $derived)
- **Framework**: SvelteKit (SSR, form actions, file-based routing)
- **Backend**: Node.js 20
- **Database**: PostgreSQL 18 in Docker
- **ORM**: Drizzle ORM
- **Validation**: Zod (server + client)
- **Authentication**: Session-based (httpOnly cookies)
- **Reporting**: ExcelJS for Excel, json2csv for CSV exports
- **Charts**: Chart.js for visualizations
- **Deployment**: Docker Compose with Docker Secrets (local deployment)
- **Development**: Bind-mounted source files for hot reload

## Database Schema

### Core Tables

#### survey_responses (School Eye Health Survey)
Each row represents one child's complete eye health assessment with the following sections:

**Section A: Basic Details**
- `id` (UUID, primary key)
- `survey_unique_id` (varchar, unique) - Format: `{district_code}-{school_code}-{class}-{section}-{roll_no}`
- `survey_date` (date, required)
- `district_id` (UUID, FK to districts)
- `area_type` (enum: 'rural', 'urban')
- `school_id` (UUID, FK to schools)
- `school_type` (enum: 'government', 'private', 'aided', 'other')
- `class` (integer 3-12)
- `section` (varchar)
- `roll_no` (varchar)
- `student_name` (varchar, required)
- `sex` (enum: 'male', 'female')
- `age` (integer)
- `consent` (enum: 'yes', 'refused', 'absent')

**Section B: Distance Vision**
- `uses_distance_glasses` (boolean)
- `unaided_va_right_eye` (varchar - LogMAR value)
- `unaided_va_left_eye` (varchar - LogMAR value)
- `presenting_va_right_eye` (varchar - LogMAR value)
- `presenting_va_left_eye` (varchar - LogMAR value)
- `referred_for_refraction` (boolean)

**Section C: Refraction Details**
- `spherical_power_right` (decimal)
- `spherical_power_left` (decimal)
- `cylindrical_power_right` (decimal)
- `cylindrical_power_left` (decimal)
- `axis_right` (integer 0-180)
- `axis_left` (integer 0-180)
- `bcva_right_eye` (varchar - LogMAR value)
- `bcva_left_eye` (varchar - LogMAR value)

**Section D: Main Cause of Vision Impairment**
- `cause_right_eye` (enum: 'uncorrected_refractive_error', 'cataract', 'corneal_opacity', 'posterior_segment_diseases', 'phthisis', 'globe_abnormalities', 'other')
- `cause_right_eye_other` (varchar, nullable)
- `cause_left_eye` (enum: same as above)
- `cause_left_eye_other` (varchar, nullable)

**Section E: Barriers for Uncorrected Refractive Error** (up to 2 selections)
- `barrier_1` (enum: 'lack_of_awareness', 'no_time', 'can_manage', 'unable_to_afford', 'parental_disapproval', 'dont_like_glasses', 'no_one_to_accompany', 'glasses_broken', nullable)
- `barrier_2` (enum: same as above, nullable)

**Section F: Follow-up Details** (conditional: only shown if uses_distance_glasses = true)
- `time_since_last_checkup` (enum: 'less_than_1_year', '1_to_2_years', 'more_than_2_years', nullable)
- `place_of_last_refraction` (enum: 'government', 'private_ngo', nullable)
- `cost_of_glasses` (enum: 'free', 'paid', nullable)
- `uses_spectacle_regularly` (boolean, nullable)
- `spectacle_alignment_centering` (boolean, nullable)
- `spectacle_scratches` (enum: 'none', 'superficial_few', 'deep_multiple', nullable)
- `spectacle_frame_integrity` (enum: 'not_broken', 'broken_taped_glued', nullable)

**Section G: Advice**
- `spectacles_prescribed` (boolean)
- `referred_to_ophthalmologist` (boolean)

**Metadata & Audit**
- `partner_id` (UUID, FK to partners)
- `submitted_by` (UUID, FK to users)
- `submitted_at` (timestamp)
- `team_edit_deadline` (timestamp) - 24 hours after submission (team members can edit until this time)
- `partner_edit_deadline` (timestamp) - 15 days after submission (partner managers can edit until this time)
- `last_edited_by` (UUID, FK to users, nullable)
- `last_edited_at` (timestamp, nullable)
- `created_at` (timestamp)
- `updated_at` (timestamp)

#### Other Core Tables
- **users**: User accounts with role and partner association
- **partners**: Partner organizations
- **districts**: Geographic districts (60 districts) - each district assigned to exactly one partner
- **schools**: School listings uploaded by partners
  - `is_active` (boolean) - false means deactivated for further data entry
  - `has_survey_data` (boolean) - true if any surveys submitted (prevents deletion)
- **sessions**: Session management for authentication
- **audit_logs**: Track all sensitive operations (especially edits to survey data)

**Note**: District-Partner relationship is 1:1 (one partner per district). The `partner_id` field is directly on the districts table.

### Data Isolation Strategy
- PostgreSQL Row-Level Security (RLS) policies
- Session variables (`app.current_user_id`, `app.current_partner_id`)
- Automatic filtering based on user role and partner
- Audit logging for all survey data edits
- Team members can view all surveys submitted by their partner's team

### Business Rules
1. **Unique Survey ID**: `{district_code}-{school_code}-{class}-{section}-{roll_no}` (prevents duplicates)
2. **Edit Time Windows**:
   - Team members: 24 hours after submission
   - Partner managers: 15 days after submission
   - National level: No time limit
3. **School Deactivation**: Schools with survey data cannot be deleted, only deactivated
4. **Conditional Fields**: Section F (spectacle details) only shown when `uses_distance_glasses = true`
5. **Barrier Selection**: Up to 2 barriers can be selected per survey
6. **Offline Data Retention**: 4 days on device before auto-purge

### Operational Metrics & Reports
1. **Coverage Metrics**:
   - Number of schools covered (per district, per partner, national)
   - Number of students covered
   - Male/Female percentage
   - Age distribution
2. **Partner Reports**:
   - School-wise list of metrics
   - District totals within partner
   - Survey completion progress
3. **National Reports**:
   - Partner-wise comparison
   - District-wise coverage
   - Overall progress dashboard

## Project Structure

```
src/
├── lib/
│   ├── server/
│   │   ├── db/              # Database schema and queries
│   │   ├── auth.ts          # Session management
│   │   ├── guards.ts        # Authorization guards
│   │   ├── services/        # Business logic
│   │   └── reports/         # Report generation
│   ├── components/          # Shared UI components
│   │   ├── ui/             # Button, Input, Table, Modal
│   │   ├── forms/          # FormField, FileUpload, SurveyForm
│   │   └── layout/         # Header, Sidebar
│   └── types/              # TypeScript types
│
├── routes/
│   ├── (auth)/             # Login/logout
│   ├── (app)/              # Protected routes
│   │   ├── dashboard/
│   │   ├── partners/
│   │   ├── districts/
│   │   ├── schools/
│   │   ├── surveys/
│   │   ├── users/
│   │   └── reports/
│   └── api/                # API endpoints
│
└── hooks.server.ts         # Auth & session handling
```

## Implementation Phases

### Phase 1: Foundation (Weeks 1-3)
**Setup & Authentication**

**Week 1: Project Setup**
- Initialize SvelteKit project with TypeScript
- Configure PostgreSQL database
- Set up Drizzle ORM
- Configure project structure and tooling

**Week 2: Authentication**
- Session-based authentication system
- User management CRUD
- Role-based access control (RBAC)
- Login/logout flows
- Authorization guards

**Week 3: Core Data Models**
- Partner management
- District management
- Partner-district mapping
- Basic admin dashboard
- Audit logging

**Deliverables**: Working authentication, national admin can create partners and map to districts

### Phase 2: School & Survey Management (Weeks 4-6)
**Partner Manager Features**

**Week 4: School Management**
- School CRUD operations
- CSV bulk upload for schools
- School selection for surveys
- School list views with filtering
- Upload validation

**Week 5: Survey Form System**
- School Eye Health Survey form implementation
- Zod validation schemas (client + server)
- Visual acuity dropdown components
- Conditional field logic (e.g., B2 only if B1=Yes)
- Form state management with Svelte 5 runes

**Week 6: Partner Manager Interface**
- Partner manager dashboard
- Team member account creation
- School upload interface
- School selection interface
- Permission enforcement

**Deliverables**: Partner managers can upload schools, select schools for surveys, create team accounts

### Phase 3: Survey Collection (Weeks 7-9)
**Team Member Survey Submission**

**Week 7: Survey Submission & Editing**
- Survey submission workflow
- Data validation with Zod
- Survey data editing for partner managers
- Edit history and audit trail
- Data correction workflows

**Week 8: Offline Support**
- Service worker implementation
- LocalStorage for draft responses
- Background sync API
- Conflict resolution
- Sync status indicators

**Week 9: Team Member Interface**
- Team member dashboard
- School assignment view
- Survey submission interface
- Submission history
- Data quality checks

**Deliverables**: Team members can submit surveys online/offline with automatic sync

### Phase 4: Reporting & Analytics (Weeks 10-12)
**Data Views & Reports**

**Week 10: Data Views**
- Partner-level data views
- National-level data views
- Data filtering and search
- Paginated data tables
- Summary statistics

**Week 11: Report Generation**
- Report templates
- CSV export functionality
- Excel export functionality
- Partner-specific reports
- National-level reports

**Week 12: Dashboard & Analytics**
- Chart.js visualizations
- Progress tracking metrics
- Performance metrics
- Data quality reports
- Completion statistics

**Deliverables**: Comprehensive reporting with CSV/Excel exports, dashboards for all user types

### Phase 5: Polish & Production (Weeks 13-14)
**Testing & Deployment**

**Week 13**: Testing, security audit, bug fixes, documentation
**Week 14**: Production deployment, user training, monitoring setup

## Zod Validation Schema Structure

The School Eye Health Survey will have comprehensive Zod schemas for type-safe validation:

```typescript
// src/lib/validation/survey.ts
import { z } from 'zod';

const visualAcuityOptions = [
  '0.00', '0.10', '0.20', '0.30', '0.40', '0.50', '0.60',
  '0.70', '0.80', '0.90', '1.00', '1.3', '1.8', 'FCCF',
  'HM', 'PL+', 'PL-'
] as const;

export const surveySchema = z.object({
  // Section A: Basic Details
  survey_date: z.date(),
  district_id: z.string().uuid(),
  area_type: z.enum(['rural', 'urban']),
  school_id: z.string().uuid(),
  school_type: z.enum(['government', 'private', 'aided', 'other']),
  class: z.number().int().min(3).max(12),
  section: z.string().min(1),
  roll_no: z.string().min(1),
  student_name: z.string().min(2),
  sex: z.enum(['male', 'female']),
  age: z.number().int().min(5).max(20),
  consent: z.enum(['yes', 'refused', 'absent']),

  // Section B: Distance Vision
  uses_distance_glasses: z.boolean(),
  unaided_va_right_eye: z.enum(visualAcuityOptions).nullable(),
  unaided_va_left_eye: z.enum(visualAcuityOptions).nullable(),
  presenting_va_right_eye: z.enum(visualAcuityOptions),
  presenting_va_left_eye: z.enum(visualAcuityOptions),
  referred_for_refraction: z.boolean(),

  // Section C: Refraction Details (conditional)
  spherical_power_right: z.number().nullable(),
  spherical_power_left: z.number().nullable(),
  cylindrical_power_right: z.number().nullable(),
  cylindrical_power_left: z.number().nullable(),
  axis_right: z.number().int().min(0).max(180).nullable(),
  axis_left: z.number().int().min(0).max(180).nullable(),
  bcva_right_eye: z.enum(visualAcuityOptions).nullable(),
  bcva_left_eye: z.enum(visualAcuityOptions).nullable(),

  // Section D: Main Cause
  cause_right_eye: z.enum([
    'uncorrected_refractive_error', 'cataract', 'corneal_opacity',
    'posterior_segment_diseases', 'phthisis', 'globe_abnormalities', 'other'
  ]).nullable(),
  cause_right_eye_other: z.string().nullable(),
  cause_left_eye: z.enum([
    'uncorrected_refractive_error', 'cataract', 'corneal_opacity',
    'posterior_segment_diseases', 'phthisis', 'globe_abnormalities', 'other'
  ]).nullable(),
  cause_left_eye_other: z.string().nullable(),

  // Section E: Barriers (up to 2 selections)
  barrier_1: z.enum([
    'lack_of_awareness', 'no_time', 'can_manage', 'unable_to_afford',
    'parental_disapproval', 'dont_like_glasses', 'no_one_to_accompany',
    'glasses_broken'
  ]).nullable(),
  barrier_2: z.enum([
    'lack_of_awareness', 'no_time', 'can_manage', 'unable_to_afford',
    'parental_disapproval', 'dont_like_glasses', 'no_one_to_accompany',
    'glasses_broken'
  ]).nullable(),

  // Section F: Follow-up
  time_since_last_checkup: z.enum(['less_than_1_year', '1_to_2_years', 'more_than_2_years']).nullable(),
  place_of_last_refraction: z.enum(['government', 'private_ngo']).nullable(),
  cost_of_glasses: z.enum(['free', 'paid']).nullable(),
  uses_spectacle_regularly: z.boolean().nullable(),
  spectacle_alignment_centering: z.boolean().nullable(),
  spectacle_scratches: z.enum(['none', 'superficial_few', 'deep_multiple']).nullable(),
  spectacle_frame_integrity: z.enum(['not_broken', 'broken_taped_glued']).nullable(),

  // Section G: Advice
  spectacles_prescribed: z.boolean(),
  referred_to_ophthalmologist: z.boolean()
}).refine((data) => {
  // Custom validation: If uses_distance_glasses is true, unaided VA is required
  if (data.uses_distance_glasses) {
    return data.unaided_va_right_eye !== null && data.unaided_va_left_eye !== null;
  }
  return true;
}, {
  message: "Unaided visual acuity required when child uses glasses"
});

export type SurveyFormData = z.infer<typeof surveySchema>;
```

**Key Features:**
- Enum validation for dropdowns and radio buttons
- Range validation for numeric fields (age, class, axis)
- Conditional validation (e.g., unaided VA required if uses glasses)
- Nullable fields for optional data
- Type inference for TypeScript autocomplete

## Critical Files to Create First

1. **.env.example** - Environment variables template
2. **docker-compose.yml** - Docker setup with PostgreSQL 18 + secrets + bind mounts
3. **Dockerfile** - Development container with hot reload
4. **src/lib/server/db/schema.ts** - Complete database schema with all survey columns
5. **src/lib/validation/survey.ts** - Zod schemas for School Eye Health Survey
6. **src/hooks.server.ts** - Authentication and authorization middleware
7. **src/lib/server/guards.ts** - Role-based access control guards
8. **src/routes/(app)/surveys/submit/+page.svelte** - Main survey form
9. **src/lib/server/services/survey-service.ts** - Survey CRUD with edit capability
10. **.gitignore** - Include secrets/ directory

## Key Technical Decisions

### Why Session-based Auth?
- Immediate session revocation for security
- Better suited for SSR applications
- Simpler implementation with SvelteKit
- Built-in CSRF protection

### Why Drizzle ORM?
- Type-safe queries prevent runtime errors
- Excellent PostgreSQL support
- Lightweight compared to Prisma
- Easy to write raw SQL when needed

### Why Columnar Storage for Survey Data?
- Type-safe validation with Zod schemas
- Easier querying and filtering for reports
- Better data integrity with proper constraints
- Simplified data editing and correction workflows
- Clear schema for partner managers to understand data structure

### Why Materialized Views for Reports?
- Fast performance for complex aggregations
- Reduces database load during reporting
- Can refresh on schedule or on-demand

## Security Measures

- HTTPS only in production
- Password hashing with bcrypt (cost 12)
- httpOnly, secure session cookies
- CSRF protection (SvelteKit built-in)
- SQL injection prevention (parameterized queries)
- XSS prevention (Svelte auto-escaping)
- Rate limiting on auth endpoints
- Server + client input validation
- Audit logging for sensitive operations
- PostgreSQL Row-Level Security (RLS)

## Performance Optimizations

- Database indexes on all foreign keys and frequently queried columns
- Materialized views for reporting aggregations
- Query pagination (50-100 items per page)
- Lazy loading for survey forms
- HTTP caching for static data
- Debouncing for search inputs
- Code splitting (automatic with SvelteKit)

## Deployment Strategy

**Local Deployment with Docker Compose & Docker Secrets**

```yaml
# docker-compose.yml
services:
  db:
    image: postgres:18-alpine
    environment:
      POSTGRES_DB: school_survey
      POSTGRES_USER_FILE: /run/secrets/db_user
      POSTGRES_PASSWORD_FILE: /run/secrets/db_password
    secrets:
      - db_user
      - db_password
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U $$(cat /run/secrets/db_user)"]
      interval: 10s
      timeout: 5s
      retries: 5
    networks:
      - survey_network

  app:
    build:
      context: .
      dockerfile: Dockerfile
    ports:
      - "3000:3000"
      - "5173:5173"  # Vite dev server
    environment:
      NODE_ENV: development
      DATABASE_URL_FILE: /run/secrets/database_url
      SESSION_SECRET_FILE: /run/secrets/session_secret
    secrets:
      - database_url
      - session_secret
    depends_on:
      db:
        condition: service_healthy
    volumes:
      # Bind mount for hot reload during development
      - ./src:/app/src
      - ./static:/app/static
      - ./package.json:/app/package.json
      - ./svelte.config.js:/app/svelte.config.js
      - ./vite.config.ts:/app/vite.config.ts
      - ./tsconfig.json:/app/tsconfig.json
      # Named volume for node_modules (don't override)
      - node_modules:/app/node_modules
      # Upload directory
      - ./uploads:/app/uploads
    networks:
      - survey_network
    command: npm run dev -- --host 0.0.0.0

secrets:
  db_user:
    file: ./secrets/db_user.txt
  db_password:
    file: ./secrets/db_password.txt
  database_url:
    file: ./secrets/database_url.txt
  session_secret:
    file: ./secrets/session_secret.txt

volumes:
  postgres_data:
  node_modules:

networks:
  survey_network:
    driver: bridge
```

**Dockerfile**
```dockerfile
FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy application files
COPY . .

# Expose ports
EXPOSE 3000 5173

# Default command (can be overridden in docker-compose)
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]
```

**Production Dockerfile** (`Dockerfile.prod`)
```dockerfile
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM node:20-alpine

WORKDIR /app

COPY --from=builder /app/build ./build
COPY --from=builder /app/package*.json ./
RUN npm ci --only=production

EXPOSE 3000
CMD ["node", "build"]
```

**Environment Variables** (`.env.example`)
```bash
# Database Configuration
DB_USER=survey_admin
DB_PASSWORD=your_secure_password_here
DB_NAME=school_survey
DB_HOST=db
DB_PORT=5432

# Database URL (constructed from above)
DATABASE_URL=postgresql://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT}/${DB_NAME}

# Session Secret (generate with: openssl rand -base64 32)
SESSION_SECRET=your_session_secret_here

# Application
NODE_ENV=development
PORT=3000

# Optional: Sentry, Analytics, etc.
# SENTRY_DSN=
# ANALYTICS_ID=
```

**Setup Instructions**

1. Create secrets directory:
```bash
mkdir -p secrets
```

2. Create secret files:
```bash
echo "survey_admin" > secrets/db_user.txt
echo "$(openssl rand -base64 32)" > secrets/db_password.txt
echo "postgresql://survey_admin:$(cat secrets/db_password.txt)@db:5432/school_survey" > secrets/database_url.txt
echo "$(openssl rand -base64 32)" > secrets/session_secret.txt
```

3. Add secrets directory to .gitignore:
```bash
echo "secrets/" >> .gitignore
```

4. Start services:
```bash
docker compose up -d
```

**Backup Strategy**
- Daily PostgreSQL dumps using `pg_dump`
- Backup to external drive/NAS
- Retention: 30 days
- Automated backup script in `scripts/backup.sh`

## Next Steps

Once approved, implementation will begin with:
1. SvelteKit project initialization
2. PostgreSQL database setup
3. Drizzle ORM configuration
4. Authentication system implementation
5. User and partner management features

## Users Route Implementation Plan

### Overview
Implement comprehensive `/users` route similar to existing `/schools` route with hierarchical role-based access control and secure temporary password generation.

### User Role Hierarchy & Access Control

**New Role Structure:**
```typescript
export enum UserRole {
  CENTRAL_ADMIN = 'central_admin',           // Can create Partner Site Managers
  PARTNER_SITE_MANAGER = 'partner_site_manager', // Can create Optometrist, Field Worker, Social Worker
  OPTOMETRIST = 'optometrist',               // Can view/edit own profile
  FIELD_WORKER = 'field_worker',             // Can view/edit own profile  
  SOCIAL_WORKER = 'social_worker'            // Can view/edit own profile
}
```

**Access Control Matrix:**
| Current Role → Can Create | Central Admin | Partner Site Manager | Optometrist | Field Worker | Social Worker |
|---------------------------|---------------|----------------------|-------------|--------------|----------------|
| Central Admin             | ✓             | ✗                    | ✗           | ✗            | ✗              |
| Partner Site Manager      | ✗             | ✓                    | ✓           | ✓            | ✓              |
| Optometrist               | ✗             | ✗                    | ✗           | ✗            | ✗              |
| Field Worker              | ✗             | ✗                    | ✗           | ✗            | ✗              |
| Social Worker             | ✗             | ✗                    | ✗           | ✗            | ✗              |

### Database Schema Changes

**Migration Required:**
1. **Update Role Enum:**
   ```sql
   CREATE TYPE "user_role_new" AS ENUM (
     'central_admin', 'partner_site_manager', 'optometrist', 
     'field_worker', 'social_worker'
   );
   ```

2. **Add New User Fields:**
   - `code` (varchar, auto-generated via sequence)
   - `phone_number` (varchar, 10-digit validation)
   - `date_active_till` (date)
   - `years_of_experience` (integer)
   - `temporary_password` (varchar)

3. **Create Sequence:**
   ```sql
   CREATE SEQUENCE "user_code_seq" INCREMENT BY 1 MINVALUE 1001 START WITH 1001;
   ```

### Secure Password Generation

**Library Choice:** `random-word` by sindresorhus
- **Security:** 274,925 English words (2.7MB word list)
- **Combinations:** 274,925³ = 20.7 trillion possible passwords
- **Installation:** `npm install random-word`

**Password Generation Function:**
```typescript
import randomWord from 'random-word';

export function generateSecureTemporaryPassword(): string {
  const words = [];
  for (let i = 0; i < 3; i++) {
    words.push(randomWord());
  }
  return words.join('-');
}
```

### File Structure to Create

```
src/routes/(app)/users/
├── +page.server.ts     # List view with role-based filtering
├── +page.svelte        # List UI with table and search
├── add/
│   ├── +page.server.ts # Create form with hierarchy validation
│   └── +page.svelte    # Create form UI
└── [id]/
    └── edit/
        ├── +page.server.ts # Update form with access controls
        └── +page.svelte    # Update form UI
```

### User Attributes & Validation

**User Fields:**
- **Name** (text, required, 2-255 chars)
- **Phone Number** (10-digit number, required)
- **Role** (dropdown with role options based on current user's role)
- **Active** (Y/N toggle)
- **Date Active Till** (date picker, dd/mm/yyyy format)
- **Years of Experience** (number input, 0-99)
- **Auto-generated fields:** User code, temporary password

**Validation Schema (`src/lib/validation/user.ts`):**
- Phone number: Exactly 10 digits validation
- Date format: dd/mm/yyyy validation and conversion
- Years experience: Positive integer (0-99)
- Role hierarchy: Validates user can create specified role
- Email: Unique email validation
- Name: Required, 2-255 characters

### Implementation Features

**List View:**
- Role-based filtering (show only users at/below current user's level)
- Search by name, code, phone number, email
- Filter by role, active status, partner
- Pagination for large datasets
- Sorting by name, code, created date

**Create/Update Flow (Following Svelte Form Guidance):**
1. Authentication and role validation
2. **TanStack Form Setup:** `createForm(() => ({ defaultValues, validators: { onChange: zodAdapter(schema), onSubmit: zodAdapter(schema) }, onSubmit: () => formEl?.submit() }))`
3. **Real-time Validation:** Per-field validation with `$fieldErrors` store, `validateFieldValue(name, value)` calls
4. **Form Submission:** Prevent default, call `formApi.handleSubmit()`, handle redirects with `goto(result.location)`
5. **Hidden Input Handling:** Use local reactive variables for auto-generated fields (code, temp password)
6. **Number Input Validation:** Use `type="text"` + `inputmode="numeric"` + JavaScript filtering for phone/years
7. **Checkbox Accessibility:** Include `tabindex="0"` for Active Y/N toggle
8. **Duplicate Checks:** Email and phone number uniqueness validation
9. **Auto-generation:** User code (sequence) and temporary password (random-word)
10. **Password Hashing:** bcrypt with proper salt rounds
11. **Database Transaction:** Drizzle ORM with proper error handling
12. **Comprehensive Audit Logging:** `logAudit` with old/new data snapshots
13. **Error Handling:** Server returns `{ values, errors }`, client hydrates properly

**Security Measures:**
- Cryptographically secure password generation
- bcrypt hashing for password storage
- Role-based access control enforcement
- Server-side validation of all operations
- Comprehensive audit logging
- Input sanitization and validation

### Implementation Order (Critical Svelte Gotchas Applied)

1. **Database Migration** - Update user schema with new fields (remember: `db:generate` + `db:migrate`)
2. **Install Dependencies** - Add `random-word` library
3. **Update Role System** - Modify guards and enums for new hierarchy
4. **Create Validation Schema** - User validation with Zod in `src/lib/validation/user.ts`
5. **Utility Functions** - Password and code generation with proper error handling
6. **List Page** - Basic user listing with filtering and search
7. **Add Page** - User creation with:
   - TanStack Form + `zodAdapter` setup
   - Real-time validation with `$fieldErrors` store
   - Proper hidden input handling for auto-generated fields
   - Number input validation with `inputmode="numeric"`
   - Checkbox accessibility with `tabindex="0"`
   - Redirect handling with `goto()`
8. **Edit Page** - User updates with same form patterns and access controls
9. **Audit Logging** - Comprehensive operation tracking using `logAudit`
10. **Testing** - Role hierarchy and security validation (tests in `src/tests/` only)
11. **Type Generation** - Run `npm run prepare` to regenerate `.svelte-kit/types` if needed
12. **Accessibility Review** - Verify all keyboard navigation and ARIA attributes

### Integration with Existing System

**Follows Existing Patterns (Critical Svelte Gotchas Applied):**
- Same route structure as `/schools`
- **TanStack Form + Zod validation** with `zodAdapter` for real-time feedback
- **Shared schemas** in `src/lib/validation/user.ts` following partner pattern
- **Proper form submission** with `formEl?.submit()` and redirect handling via `goto()`
- **Hidden input handling** using local reactive variables (not `field.state.value`)
- **Number input validation** using `type="text"` + `inputmode="numeric"` + JS filtering
- **Checkbox accessibility** with `tabindex="0"` for keyboard navigation
- **Drizzle ORM** for database operations with proper migration process
- **Comprehensive audit logging** using `logAudit` from `src/lib/server/audit.ts`
- **Role-based access control** via guards with hierarchical validation
- **Error handling** with `{ values, errors }` pattern and proper hydration

**Consistent with Current Architecture:**
- Uses existing authentication system
- Follows established validation patterns from partners implementation
- Integrates with current audit logging system
- Maintains same UI/UX patterns with accessibility compliance
- Uses existing database connection and schema patterns
- **Critical:** Tests placed in `src/tests/` (not in route folders)
- **Critical:** Migration process includes both `db:generate` and `db:migrate` steps

**SvelteKit-Specific Considerations:**
- **Redirect handling:** Proper `use:enhance` with `goto(result.location)` for form redirects
- **Form state management:** Re-enable fields on `failure`/`error` for retry capability
- **Type generation:** Run `npm run prepare` if `.svelte-kit/types` becomes stale
- **Keyboard accessibility:** Proper `role` attributes for keyboard handlers
- **Input validation:** Client-side validation mirrors server-side constraints exactly

## Recent Updates
- Partners management now uses Superforms + Zod for realtime validation (email/phone/length) and pre-submit code uniqueness feedback.
- Partner add/edit flows are modal-based and persist via Drizzle with uniqueness checks against existing partner codes.
- Added comprehensive Users route implementation plan with secure password generation and hierarchical role-based access control.
