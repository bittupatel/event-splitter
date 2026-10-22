# Event Splitter — Project Update Reference & Change History

> **Purpose:** Detailed chronological track record of all new developments, architectural changes, feature additions, bug fixes, and configuration updates.  
> **Maintenance Rule:** Every new modification or feature addition must be documented here with the date, scope, affected files, and rationale.

---

## Daily Update Chronology

---

### 📅 October 23, 2026

#### 1. Comprehensive System Documentation & Operational Governance
- **Type:** Documentation / Developer Experience / Architecture
- **Description:** Established 4 primary operational and architectural files to ensure long-term maintainability, instant onboarding for developers and AI agents, and rigorous change tracking:
  - [`PROJECT_ARCHITECTURE.md`](file:///d:/Learning/event-splitter/PROJECT_ARCHITECTURE.md): End-to-end technical guide detailing system architecture, workflows, data schema, mathematical settlement proofs, and security matrix.
  - [`PROJECT_UPDATE_REFERENCE.md`](file:///d:/Learning/event-splitter/PROJECT_UPDATE_REFERENCE.md): This daily change-tracking reference.
  - [`TASK_LOG.md`](file:///d:/Learning/event-splitter/TASK_LOG.md): Operational log of executed tasks with verification outcomes.
  - [`TASK_LIST.md`](file:///d:/Learning/event-splitter/TASK_LIST.md): Active development roadmap, sprint backlog, and prioritised tasks.
- **Affected Files:**
  - `PROJECT_ARCHITECTURE.md`
  - `PROJECT_UPDATE_REFERENCE.md`
  - `TASK_LOG.md`
  - `TASK_LIST.md`

---

### 📅 October 22, 2026

#### 1. OTP Configuration & SMTP Delivery Engine
- **Type:** Feature Addition / Security / Admin Controls
- **Description:**
  - Added dedicated Admin Settings page at `/admin/settings` allowing the administrator to toggle OTP login requirements between "OTP Required" and "Credentials Only".
  - Implemented SMTP settings management in database (`admin_settings` table) with support for host, port, authentication, TLS/SSL, and customizable sender email.
  - Added "Send Test Email" feature within the admin console to verify SMTP connectivity.
  - Added `requestOtpAction` in participant login allowing users to trigger an OTP request that automatically dispatches to the administrator's email.
- **Affected Files:**
  - `src/app/admin/settings/page.tsx`
  - `src/app/admin/settings/actions.ts`
  - `src/lib/settings.ts`
  - `src/lib/email.ts`
  - `src/app/e/[id]/login/page.tsx`
  - `src/app/e/[id]/actions.ts`
  - `supabase/schema.sql`

#### 2. Standalone HTML Report Generation & Visual SVG Charts
- **Type:** Feature Addition / Analytics / Reporting
- **Description:**
  - Built zero-dependency SVG chart generation (`src/lib/charts.ts`): Bar charts, Donut charts, and Contributor Pair charts.
  - Created standalone exportable HTML report (`src/lib/report.ts` and `/api/admin/events/[id]/report/route.ts`). The report can be viewed inline in the browser or downloaded as an attachment with styling, print layouts, and settlement calculations embedded.
  - Tested HTML report generation and structure via automated Vitest test suite (`src/lib/report.test.ts`).
- **Affected Files:**
  - `src/lib/charts.ts`
  - `src/lib/report.ts`
  - `src/lib/report.test.ts`
  - `src/app/api/admin/events/[id]/report/route.ts`
  - `src/components/Chart.tsx`

---

### 📅 October 21, 2026

#### 1. Event Photo Gallery & Blurred Dynamic Backdrop
- **Type:** Feature Addition / UI & UX / Storage
- **Description:**
  - Implemented 20-photo gallery for each event.
  - Created client-side browser image compression (≤1600px JPEG) to respect Supabase free-tier storage quotas before upload.
  - Added server-side MIME-type magic byte validation and 4MB size limits.
  - Created database trigger `enforce_photo_limit` with advisory locks to prevent exceeding the 20-photo limit.
  - Created `Backdrop.tsx` component that takes event gallery photos and dynamically rotates them in the background with a blur filter and low opacity.
- **Affected Files:**
  - `src/components/Gallery.tsx`
  - `src/components/Backdrop.tsx`
  - `src/app/admin/events/[id]/PhotoUploader.tsx`
  - `src/app/api/admin/events/[id]/photos/route.ts`
  - `supabase/schema.sql`

#### 2. Deterministic Equal Split & Greedy Settlement Engine
- **Type:** Core Business Logic / Mathematics
- **Description:**
  - Designed `settle.ts` module with integer paise arithmetic.
  - Implemented remainder paise distribution to eliminate rounding inconsistencies.
  - Implemented greedy debt matching algorithm producing minimal peer-to-peer transfers.
  - Added unit test suite `src/lib/settle.test.ts` with test cases including the Pizza (₹400) and Mazza (₹35) scenario with 5 participants.
- **Affected Files:**
  - `src/lib/settle.ts`
  - `src/lib/settle.test.ts`
  - `src/lib/money.ts`
  - `scripts/seed.mjs`

---

### 📅 October 20, 2026

#### 1. Initial Project Scaffolding & Security Architecture
- **Type:** Project Inception / Architecture / Authentication
- **Description:**
  - Initialized Next.js App Router application with TypeScript and Vanilla CSS.
  - Designed festive theme system (`src/lib/themes.ts`) featuring Lantern, Marigold, Bonfire, Kite, Gulal, and Midnight themes with procedural SVG `CoverArt.tsx`.
  - Configured Supabase database schema with complete Row Level Security (`REVOKE ALL FROM anon, authenticated`).
  - Implemented admin authentication restricted to `ADMIN_EMAIL` (`bittu280902@gmail.com`).
  - Implemented event-scoped participant session cookies using signed JWTs via `jose`.
  - Added brute-force protection tracking failed login attempts with IP and email lockouts.
- **Affected Files:**
  - `package.json`
  - `tsconfig.json`
  - `supabase/schema.sql`
  - `src/app/layout.tsx`
  - `src/app/page.tsx`
  - `src/app/globals.css`
  - `src/lib/auth-admin.ts`
  - `src/lib/session.ts`
  - `src/lib/themes.ts`
  - `src/components/CoverArt.tsx`

---

## Change Log Template for Future Entries

When recording future updates, append a new section using this format:

```markdown
### 📅 [Month Day, Year]

#### [Task Number]. [Title of Feature / Fix / Change]
- **Type:** [Feature Addition | Bug Fix | UI Enhancement | Performance | Security | Refactor]
- **Description:** Concise summary of what was done, why it was done, and behavioral impact.
- **Affected Files:**
  - `path/to/modified/file.ts`
  - `path/to/created/file.tsx`
- **Verification:** Description of tests executed (e.g., `npm test`, browser check, build output).
```
