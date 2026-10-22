# Event Splitter — Operational Task Log

> **Purpose:** Detailed operational log recording every executed task, implementation session, verification outcome, and status update.  
> **Rule:** Every time work is performed on the codebase, append an entry with the timestamp, task scope, files touched, and test results.

---

## Task Activity Log

### 📅 October 23, 2026

#### Task ID: `TSK-20261023-01`
- **Task Name:** Architectural Documentation & Operational Project Governance Setup
- **Category:** Documentation & Project Management
- **Status:** ✅ **COMPLETED**
- **Triggered By:** User Request
- **Context:** User requested standardizing 4 operational and architectural governance documents (`PROJECT_ARCHITECTURE.md`, `PROJECT_UPDATE_REFERENCE.md`, `TASK_LOG.md`, `TASK_LIST.md`) before initiating next-phase features.
- **Actions Taken:**
  1. Authored `PROJECT_ARCHITECTURE.md` with full Mermaid flowcharts, tech stack breakdown, end-to-end user journeys, relational schema details, integer-paise mathematical formulas, and security matrix.
  2. Authored `PROJECT_UPDATE_REFERENCE.md` cataloging date-wise change history from inception to current date with template for future additions.
  3. Authored `TASK_LOG.md` to track operational activities.
  4. Authored `TASK_LIST.md` structuring the active roadmap, sprint backlog, and development milestones.
- **Files Modified / Created:**
  - `PROJECT_ARCHITECTURE.md`
  - `PROJECT_UPDATE_REFERENCE.md`
  - `TASK_LOG.md`
  - `TASK_LIST.md`
- **Verification:**
  - Checked directory structure.
  - Ran `npm test` (18/18 passing) and `npm run typecheck` (0 errors).

#### Task ID: `TSK-20261023-02`
- **Task Name:** Fix Network "fetch failed" Errors & Sanitize Supabase Environment Configurations
- **Category:** Bug Fix & Developer Experience
- **Status:** ✅ **COMPLETED**
- **Triggered By:** User Report / Deployment Bug (`fetch failed` on Vercel)
- **Context & Objectives:** Masked errors and raw network exceptions (`fetch failed`) occurred on the deployed Vercel application when connecting to Supabase endpoints. The objectives were to:
  1. Build an automated sanitizer for Supabase URLs and keys to handle trailing slashes, surrounding quotes, leading/trailing whitespace, full `NAME=VALUE` copy-paste accidents, and `.supabase.com` typos.
  2. Provide clear, human-readable diagnostic messages on both the home page and admin login when network connection fails.
- **Actions Taken:**
  1. Created `cleanSupabaseUrl` and `cleanSupabaseKey` utility functions in `src/lib/supabase/admin.ts`.
  2. Updated `db()` in `src/lib/supabase/admin.ts`, `authClient()` in `src/lib/supabase/server.ts`, and `proxy()` in `src/proxy.ts` to sanitize all environment variables.
  3. Added friendly error handlers in `src/app/admin/actions.ts` (`adminLogin`) and `src/app/page.tsx` (`Home`) that display the attempted host URL and clear troubleshooting steps on `fetch failed`.
- **Files Modified:**
  - `src/lib/supabase/admin.ts`
  - `src/lib/supabase/server.ts`
  - `src/proxy.ts`
  - `src/app/admin/actions.ts`
  - `src/app/page.tsx`
- **Verification & Outcome:**
  - Verified TypeScript compilation with `npm run typecheck` (0 errors).
  - Executed automated tests with `npm test` (18/18 passing).

---

### 📅 October 22, 2026

#### Task ID: `TSK-20261022-02`
- **Task Name:** OTP Mode Configuration & SMTP Integration
- **Category:** Backend & Security
- **Status:** ✅ **COMPLETED**
- **Actions Taken:**
  - Added single-row `admin_settings` table to Supabase schema.
  - Built `/admin/settings` page with OTP toggle (Required vs Credentials Only) and SMTP credentials form.
  - Created Nodemailer transport helper in `src/lib/email.ts` to dispatch test emails and OTP codes.
  - Updated participant login workflow to respect the active OTP toggle setting.
- **Files Modified:**
  - `src/app/admin/settings/page.tsx`
  - `src/app/admin/settings/actions.ts`
  - `src/lib/settings.ts`
  - `src/lib/email.ts`
  - `src/app/e/[id]/login/page.tsx`
  - `supabase/schema.sql`
- **Verification:** Tested OTP toggle flow and SMTP validation logic.

#### Task ID: `TSK-20261022-01`
- **Task Name:** SVG Chart Engine & Standalone HTML Report Generation
- **Category:** Analytics & Export
- **Status:** ✅ **COMPLETED**
- **Actions Taken:**
  - Created pure SVG charts (Bar Chart, Donut Breakdown, Pair Settlement Chart) in `src/lib/charts.ts` with zero external chart library overhead.
  - Created standalone HTML report template with embedded styles, printable layouts, and detailed settlement breakdowns.
  - Added route handler `/api/admin/events/[id]/report/route.ts` supporting both inline display (`?inline=1`) and file download (`Content-Disposition: attachment`).
- **Files Modified:**
  - `src/lib/charts.ts`
  - `src/lib/report.ts`
  - `src/lib/report.test.ts`
  - `src/app/api/admin/events/[id]/report/route.ts`
- **Verification:** Ran `src/lib/report.test.ts` (3/3 passing).

---

### 📅 October 21, 2026

#### Task ID: `TSK-20261021-02`
- **Task Name:** Event Photo Gallery & Blurred Dynamic Backdrop
- **Category:** Frontend & Media Storage
- **Status:** ✅ **COMPLETED**
- **Actions Taken:**
  - Built photo gallery grid and modal lightbox viewer (`src/components/Gallery.tsx`).
  - Implemented dynamic background component (`src/components/Backdrop.tsx`) that cycles event photos with blur and low opacity.
  - Created multipart upload endpoint with 20-photo cap database trigger and 4MB file validation.
- **Files Modified:**
  - `src/components/Gallery.tsx`
  - `src/components/Backdrop.tsx`
  - `src/app/admin/events/[id]/PhotoUploader.tsx`
  - `src/app/api/admin/events/[id]/photos/route.ts`
  - `supabase/schema.sql`
- **Verification:** Verified photo limit trigger and client-side canvas compression.

#### Task ID: `TSK-20261021-01`
- **Task Name:** Deterministic Split & Greedy Debt Settlement Implementation
- **Category:** Core Logic & Algorithms
- **Status:** ✅ **COMPLETED**
- **Actions Taken:**
  - Formulated integer paise calculation in `src/lib/settle.ts`.
  - Implemented greedy debt clearing algorithm to produce minimal transfers between participants.
  - Authored automated Vitest suite in `src/lib/settle.test.ts` covering 7 complex test scenarios.
- **Files Modified:**
  - `src/lib/settle.ts`
  - `src/lib/settle.test.ts`
  - `src/lib/money.ts`
- **Verification:** Ran `src/lib/settle.test.ts` (7/7 passing).

---

### 📅 October 20, 2026

#### Task ID: `TSK-20261020-01`
- **Task Name:** Base Application Scaffolding, RLS Schema & Visual Theme Engine
- **Category:** Architecture & UI
- **Status:** ✅ **COMPLETED**
- **Actions Taken:**
  - Initialized Next.js project with TypeScript and Vanilla CSS design tokens.
  - Created procedural SVG `CoverArt.tsx` supporting 6 festival themes.
  - Configured Supabase schema with complete RLS lockdown.
  - Implemented participant session cookie encryption using `jose`.
- **Files Modified:**
  - `package.json`, `tsconfig.json`, `supabase/schema.sql`
  - `src/app/page.tsx`, `src/app/globals.css`
  - `src/components/CoverArt.tsx`, `src/components/CoverArt.test.tsx`
- **Verification:** Ran `CoverArt.test.tsx` (8/8 passing).

---

## Task Log Entry Template

```markdown
### 📅 [Month Day, Year]

#### Task ID: `TSK-YYYYMMDD-XX`
- **Task Name:** [Concise Name of the Task]
- **Category:** [Architecture | Frontend | Backend | Security | Database | Bug Fix]
- **Status:** [✅ COMPLETED | ⏳ IN PROGRESS | ⛔ BLOCKED]
- **Triggered By:** [User Request | Bug Report | Roadmap Milestone]
- **Context & Objectives:** [Brief explanation of the task context and goal]
- **Actions Taken:**
  1. [Action 1]
  2. [Action 2]
- **Files Modified / Created:**
  - `path/to/file.ts`
- **Verification & Outcome:** [Test commands run, visual check results]
```
