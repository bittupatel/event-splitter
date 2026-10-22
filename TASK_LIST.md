# Event Splitter — Development Task List & Roadmap

> **Purpose:** Active roadmap, sprint backlog, and prioritized task list for all current and future development.  
> **Maintenance Rule:** Update this file whenever a new task is proposed, started (⏳ In Progress), completed (✅ Done), or deferred.

---

## 🚀 Status Dashboard

| Metric | Count |
|---|---|
| **Active / In Progress** | 0 |
| **Ready for Development (High Priority)** | 4 |
| **Upcoming Backlog** | 6 |
| **Completed Tasks** | 8 |

---

## 📌 Active Development (Sprint: Current)

*No tasks currently in progress. Ready to begin next task selected by the user.*

---

## 🎯 Next Up / Ready for Development

The following tasks are prioritized for the next phase of development:

### 1. `TASK-010`: Participant Profile Customization (Avatars & Preferences)
- **Priority:** `P1 (High)`
- **Category:** User Experience / Database
- **Date Added:** October 23, 2026
- **Description:** Allow participants to customize their profile details within an event (choose custom avatar/photo, select emoji, update phone number or UPI ID for settlements).
- **Acceptance Criteria:**
  - Add optional avatar URL or UPI ID to `participants` table.
  - Profile edit modal/section in `/e/[id]`.
  - UPI ID displayed directly in the Settle Up section for 1-click payment links (`upi://pay?pa=...`).
- **Dependencies:** None.

### 2. `TASK-011`: Category Tagging & Expense Filters
- **Priority:** `P1 (High)`
- **Category:** Feature Addition
- **Date Added:** October 23, 2026
- **Description:** Add category tagging for expenses (e.g., Food & Drink, Transport, Tickets & Entry, Accommodation, Miscellaneous) with icon badges and filtering.
- **Acceptance Criteria:**
  - `category` column added to `expenses` table (default: `food`).
  - Category selector dropdown on "Add Expense" form for both Admin and Participant.
  - Expense filtering by category and date range on both Admin and Participant views.
  - Category breakdown chart added to Admin analytics and downloadable HTML report.

### 3. `TASK-012`: Expense Item Editing & Deletion for Participants
- **Priority:** `P2 (Medium)`
- **Category:** Permissions & Usability
- **Date Added:** October 23, 2026
- **Description:** Allow participants to edit or delete expenses that *they* added (within a grace window, e.g., 24 hours), with audit logs.
- **Acceptance Criteria:**
  - Check `added_by` or participant identity before permitting update/deletion.
  - Admin retains universal edit/delete rights.

### 4. `TASK-013`: Direct Settlement Marking & Payment Confirmation
- **Priority:** `P2 (Medium)`
- **Category:** Financial Workflows
- **Date Added:** October 23, 2026
- **Description:** Allow participants or admins to mark a peer-to-peer settlement payment as "Paid" or "Settled" with confirmation timestamps.
- **Acceptance Criteria:**
  - Create `settlement_payments` table linking payer, receiver, amount, and status (`pending`, `confirmed`).
  - Settlement list shows visual checkmarks for settled debts.

---

## 📋 Future Roadmap & Backlog

### Category: Analytics & Exports
- **`TASK-014`**: **CSV / Excel Spreadsheet Export:**
  - Allow admin and participants to download a `.csv` or `.xlsx` file containing all raw expense line items, dates, payers, and amounts.
- **`TASK-015`**: **PDF Report Export:**
  - In addition to standalone HTML, offer a clean single-click printable PDF generation option.

### Category: Communication & Notifications
- **`TASK-016`**: **WhatsApp Shareable Settlement Summary:**
  - Generate a formatted WhatsApp message (e.g., *"🎉 Lantern Night Split Summary: Rekha owes Arun ₹87..."*) with a 1-click `https://wa.me/?text=...` button.
- **`TASK-017`**: **Automated Email Notifications for Added Expenses:**
  - Dispatch a daily summary email to participants listing items added during that day.

### Category: Media & UI Enhancements
- **`TASK-018`**: **Photo Captions & Uploader Credits in Gallery:**
  - Allow attaching captions to gallery photos and noting who took or uploaded the picture.
- **`TASK-019`**: **Dark / Light Theme Toggle:**
  - Add optional user toggle for dark mode and high-contrast accessibility.

---

## ✅ Completed Tasks

| Task ID | Task Title | Completed Date | Category |
|---|---|---|---|
| `TASK-001` | Project scaffolding, Next.js App Router, Tailwind/Vanilla CSS tokens | Oct 20, 2026 | Architecture |
| `TASK-002` | Supabase Postgres schema with RLS lockdown & service role security | Oct 20, 2026 | Database |
| `TASK-003` | Equal split math & greedy debt settlement engine with unit tests | Oct 21, 2026 | Core Logic |
| `TASK-004` | 20-photo event gallery with database trigger & rotating blurred backdrop | Oct 21, 2026 | Media / UI |
| `TASK-005` | Standalone exportable HTML report with SVG charts (bar, donut, pair) | Oct 22, 2026 | Reporting |
| `TASK-006` | Admin settings page with OTP toggle & SMTP Nodemailer configuration | Oct 22, 2026 | Backend / Auth |
| `TASK-007` | Event-scoped participant login with email, password & OTP verification | Oct 22, 2026 | Security |
| `TASK-008` | Automated test suite (18 tests passing) & seed script for Pizza/Mazza case | Oct 22, 2026 | Testing |
| `TASK-009` | Comprehensive documentation setup (`PROJECT_ARCHITECTURE`, `UPDATE_REF`, `TASK_LOG`, `TASK_LIST`) | Oct 23, 2026 | Documentation |

---

## 🛠️ Task Lifecycle Guidelines

1. **Proposing a Task:** Add it under **Next Up** or **Future Roadmap** with an ID (`TASK-XXX`), Priority (`P0`, `P1`, `P2`), and Acceptance Criteria.
2. **Starting a Task:** Move it to **Active Development (Sprint: Current)** and mark status as `⏳ In Progress`.
3. **Completing a Task:**
   - Run tests (`npm test`) and typecheck (`npm run typecheck`).
   - Move from Active to **Completed Tasks** table with the completion date.
   - Record entry in [`TASK_LOG.md`](file:///d:/Learning/event-splitter/TASK_LOG.md) and [`PROJECT_UPDATE_REFERENCE.md`](file:///d:/Learning/event-splitter/PROJECT_UPDATE_REFERENCE.md).
