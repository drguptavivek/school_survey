# Documentation Map

Quick navigation for all documentation in the School Survey project.

---

## Core Reference

### 🎯 CLAUDE.md
**Main project reference document**
- Project overview and tech stack
- User roles and hierarchy
- Role-Based Access Control (RBAC) rules
- Database schema overview
- Code organization and enforcement points
- Setup & development instructions
- Test users and quick reference
- Links to specialized guides

**When to use:** Understanding the overall project structure, roles, and how to get started

---

## Implementation Skills

### 🎓 FORMS_GUIDE.md ⭐ **START HERE FOR FORMS**
**Complete Svelte + TanStack Form + Zod implementation guide**
- Schema definition patterns (base, create, update)
- Phone validation rules (users vs organizations)
- Boolean transformation for checkboxes
- Optional field handling (→ null transforms)
- Server load function patterns with scoping
- Server action patterns with full workflow
- Frontend component full working example
- Common mistakes and pitfalls with fixes
- Form testing patterns (unit tests)
- Quick reference field type table
- Comprehensive form building checklist

**When to use:** Building any new form in the application

**Key sections:**
1. Schema Definition - How to define Zod schemas
2. Server Load Function - What to return from load
3. Server Action - How to handle form submission
4. Frontend Component - Complete Svelte example
5. Common Patterns & Pitfalls - Mistakes to avoid
6. Checklist - Ensure form is complete

---

### 📐 CONSISTENCY_GUIDE.md
**Developer reference for building consistent CRUD routes**
- Hidden form fields pattern (reactive variables)
- Phone validation patterns (strict vs flexible)
- Boolean schema patterns (checkbox handling)
- Route guards (requireRole, requireUserAccess, requireSchoolEditAccess)
- Role-based access enforcement
- Partner scoping at UI and server levels
- Error handling patterns
- Audit logging patterns
- Database schema patterns
- Checklist for new routes

**When to use:** Implementing new CRUD routes, ensuring consistency across the application

**Key sections:**
1. Quick Reference - Key patterns at a glance
2. Hidden Form Fields - The critical reactive variable pattern
3. Phone Validation - Different rules for different contexts
4. Route Guards - How to implement authorization
5. Frontend Validation - Form field patterns
6. Backend Validation - Server-side security
7. Common Mistakes - What NOT to do
8. Checklist for New Routes - Comprehensive verification list

---

## Implementation Details

### 📝 CONSISTENCY_FIXES.md
**Detailed explanation of all critical fixes applied**
- Hidden input field bug in users/[id]/edit form
- Missing partner scoping in schools/[id]/edit action
- Phone validation standardization across routes
- Boolean handling fixes in school schema
- Tailwind CSS class conflict fixes
- Testing recommendations
- Security implications of each fix
- Deployment recommendations

**When to use:** Understanding what security issues were fixed and why they matter

---

### 🔍 CONSISTENCY_AUDIT.md
**Complete analysis of consistency issues discovered**
- Critical issues (must fix immediately)
- High-priority issues (should standardize)
- Medium-priority issues (nice to have)
- Low-priority issues (cosmetic)
- Impact assessment for each issue
- Before/after comparisons
- Summary table of all issues

**When to use:** Understanding the full scope of consistency issues that were addressed

---

### 📋 SESSION_SUMMARY.md
**Complete overview of this development session**
- Overview of all work completed
- Critical security fixes summary
- High-priority standardizations
- Documentation created
- Verification and testing results
- Files modified listing
- Key insights and patterns
- Future work (medium priority items)
- Deployment recommendations
- Developer notes for next session

**When to use:** Understanding what was done in this session and deployment planning

---

## Usage Flowchart

```
Need to build a new feature?
│
├─ It's a FORM?
│  └─ Read: FORMS_GUIDE.md (start here!)
│     Then: CONSISTENCY_GUIDE.md (for route context)
│
├─ It's a new CRUD route?
│  └─ Read: CONSISTENCY_GUIDE.md (architecture)
│     Then: FORMS_GUIDE.md (form patterns)
│
├─ I want to understand authorization?
│  └─ Read: CLAUDE.md (roles overview)
│     Then: CONSISTENCY_GUIDE.md (enforcement patterns)
│
├─ I want to understand what was fixed?
│  └─ Read: CONSISTENCY_FIXES.md (what was fixed)
│     Then: CONSISTENCY_AUDIT.md (why it was needed)
│
└─ I want to understand the overall architecture?
   └─ Read: CLAUDE.md (overview)
      Then: CONSISTENCY_GUIDE.md (patterns)
      Then: FORMS_GUIDE.md (form specifics)
```

---

## File Modification Guide

| File | Contains | Last Updated |
|------|----------|--------------|
| `CLAUDE.md` | Project reference | 288302f |
| `FORMS_GUIDE.md` | Form implementation patterns | 288302f |
| `CONSISTENCY_GUIDE.md` | Route architecture patterns | 67c5b2d |
| `CONSISTENCY_FIXES.md` | Security fixes & changes | 67c5b2d |
| `CONSISTENCY_AUDIT.md` | Issue analysis | 67c5b2d |
| `SESSION_SUMMARY.md` | Development session overview | b34309f |
| `DOCUMENTATION_MAP.md` | This file | 288302f |

---

## Quick Reference: Common Tasks

### Building a User Creation Form
1. ✅ Schema in `src/lib/validation/user.ts` - See FORMS_GUIDE.md Section 1
2. ✅ Load function - See FORMS_GUIDE.md Section 2
3. ✅ Action handler - See FORMS_GUIDE.md Section 3
4. ✅ Frontend component - See FORMS_GUIDE.md Section 4
5. ✅ Use checklist - See FORMS_GUIDE.md Section 6

### Building a School Edit Route
1. ✅ Review FORMS_GUIDE.md Section 1-4 (form patterns)
2. ✅ Review CONSISTENCY_GUIDE.md (route architecture)
3. ✅ Add partner scoping check (CONSISTENCY_GUIDE.md)
4. ✅ Add audit logging (CONSISTENCY_GUIDE.md)
5. ✅ Use checklist (both guides)

### Understanding Partner Access Control
1. ✅ Roles - CLAUDE.md "User Roles & Hierarchy"
2. ✅ RBAC rules - CLAUDE.md "Role-Based Access Control"
3. ✅ Enforcement patterns - CONSISTENCY_GUIDE.md "Partner Scoping"
4. ✅ Form patterns - FORMS_GUIDE.md "Partner Lock Pattern"

### Fixing a Bug
1. ✅ Is it form-related? → FORMS_GUIDE.md "Common Mistakes"
2. ✅ Is it scoping? → CONSISTENCY_GUIDE.md "Partner Scoping"
3. ✅ Is it validation? → CONSISTENCY_GUIDE.md "Server Validation"
4. ✅ Still stuck? → CONSISTENCY_AUDIT.md or CONSISTENCY_FIXES.md

---

## Documentation Statistics

| Document | Lines | Purpose | Audience |
|----------|-------|---------|----------|
| CLAUDE.md | 450 | Project reference | All developers |
| FORMS_GUIDE.md | 600+ | Form implementation | Form builders |
| CONSISTENCY_GUIDE.md | 800+ | Route architecture | All developers |
| CONSISTENCY_FIXES.md | 400+ | Implementation details | Reviewers, architects |
| CONSISTENCY_AUDIT.md | 500+ | Issue analysis | Architects, reviewers |
| SESSION_SUMMARY.md | 300+ | Session overview | Deployment, architects |
| DOCUMENTATION_MAP.md | 250+ | Navigation guide | All developers |

---

## Getting Help

- **How do I build a form?** → FORMS_GUIDE.md
- **How do I add a new route?** → CONSISTENCY_GUIDE.md
- **What security issues were fixed?** → CONSISTENCY_FIXES.md
- **What was the scope of changes?** → CONSISTENCY_AUDIT.md
- **How do roles work?** → CLAUDE.md + CONSISTENCY_GUIDE.md
- **When was this documented?** → Session of 2024-12-14
- **Where are the code examples?** → FORMS_GUIDE.md (full working examples)

---

## Index

### By Topic
- **Authentication & Authorization** - CLAUDE.md, CONSISTENCY_GUIDE.md
- **Database Schema** - CLAUDE.md
- **Form Implementation** - FORMS_GUIDE.md
- **Route Architecture** - CONSISTENCY_GUIDE.md
- **Security Fixes** - CONSISTENCY_FIXES.md
- **Code Examples** - FORMS_GUIDE.md (comprehensive examples)
- **Checklists** - FORMS_GUIDE.md, CONSISTENCY_GUIDE.md
- **Best Practices** - All guides
- **Common Mistakes** - FORMS_GUIDE.md, CONSISTENCY_GUIDE.md
- **Testing** - FORMS_GUIDE.md

### By Document
- **CLAUDE.md** - General reference, project setup
- **FORMS_GUIDE.md** - How to build forms (comprehensive guide)
- **CONSISTENCY_GUIDE.md** - How to build routes (architecture guide)
- **CONSISTENCY_FIXES.md** - What was fixed and why
- **CONSISTENCY_AUDIT.md** - Issues found and analysis
- **SESSION_SUMMARY.md** - Work completed and deployment info
- **DOCUMENTATION_MAP.md** - You are here! Navigation guide

---

## Next Steps

1. **For form development:** Start with FORMS_GUIDE.md Section 1 (Schema Definition)
2. **For route development:** Start with CONSISTENCY_GUIDE.md "Quick Reference"
3. **For understanding the project:** Start with CLAUDE.md sections in order
4. **For security review:** Read CONSISTENCY_FIXES.md then CONSISTENCY_AUDIT.md
5. **For deployment:** Review SESSION_SUMMARY.md deployment recommendations

---

**Last Updated:** December 14, 2024
**Documentation Version:** 1.0
**Status:** Complete

All documentation is verified and ready to use. Each file is self-contained but references are provided for cross-document navigation.
