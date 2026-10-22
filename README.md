# Event Splitter

A festive expense-splitting web app for friend groups. Live event hub, event-scoped participant login (email + shared password, with optional admin-issued/emailed one-time code), admin workspace with dashboard and exportable HTML report with detailed who-pays-whom settlements, 20-photo gallery with a blurred rotating backdrop, and exact equal-split settlements in ₹.

**Stack (all free tiers):** Next.js (App Router) on Vercel Hobby · Supabase (Postgres + Auth + Storage).

👉 **For a complete, beginner-friendly live setup tutorial, see [DEPLOYMENT_GUIDE.md](file:///d:/Learning/event-splitter/DEPLOYMENT_GUIDE.md).**

## 1. Supabase setup (5 min)

1. Create a project at supabase.com.
2. **SQL Editor** → paste and run `supabase/schema.sql`. This creates the tables, RLS lockdown, the 20-photo trigger and the private `event-photos` bucket.
3. **Authentication → Providers → Email**: keep Email on. Turn **off** "Allow new users to sign up" after you have created your admin account (see step 5). Even if left on, only the `ADMIN_EMAIL` address gets admin rights.
4. **Settings → API**: copy the Project URL, `anon` key and `service_role` key.

## 2. Local run

```bash
cp .env.example .env.local      # fill in the values
npm install
npm run dev                     # http://localhost:3000
```

`SESSION_SECRET` must be 32+ random characters:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
```

## 3. Create the admin account

Open `/admin/login` → **First time? Create the admin account** → use the email set in `ADMIN_EMAIL`. Confirm via the email Supabase sends, then sign in.
(Alternative: Supabase → Authentication → Users → *Add user* with that email and **Auto Confirm**.)

## 4. Deploy to Vercel

1. Push this folder to a GitHub repo.
2. Vercel → *Add New Project* → import it (framework auto-detected).
3. Add the 5 environment variables from `.env.example` (Production + Preview).
4. Deploy. In Supabase → Authentication → URL Configuration, set **Site URL** to your Vercel URL so confirmation emails link correctly.

## How it works

| Who | Does what |
|---|---|
| **Admin** (`/admin`) | Creates events, sets the shared event password, adds people (name, email, emoji, note), issues one-time login codes, adds/edits/deletes expenses, uploads up to 20 photos, sees the dashboard, downloads the HTML report. |
| **Participant** (`/e/<id>/login`) | Signs in with their invited email + the event's shared password + a 6-digit code the admin issued. Then adds items, sees day-by-day totals, their balance and who to pay. |

### Login codes
- Admin presses **Issue login code** next to a person; the code is shown **once** and only its hash is stored.
- Single use, 30-minute expiry, and issuing a new code retires the old one. A fresh code is needed for every sign-in.
- Wrong attempts are rate-limited: 5 per email and 20 per IP per 15 minutes.

### Money
All amounts are integer paise, so there is no floating-point drift. Total ÷ people = share; leftover paise (if it does not divide evenly) are spread one each, so shares always sum exactly to the total. Settlements use a minimal-transfer greedy match (largest debtor pays largest creditor).

Example: Pizza ₹400 (Arun) + Mazza ₹35 (Rahul), 5 people → total ₹435, ₹87 each. Arun gets ₹313; Rahul pays Arun ₹52; Rekha, Nikita and Viren pay Arun ₹87 each.

### Security model
- Every table has RLS enabled with **no policies** and no grants for `anon`/`authenticated`: the public Supabase API can read nothing.
- All data access runs on the server with the service-role key, after verifying either the confirmed admin identity (`ADMIN_EMAIL` allow-list) or a signed, httpOnly, event-scoped session cookie.
- The public hub exposes only title, tagline, dates and a people count.
- Photos live in a private bucket and are served through 1-hour signed URLs. Uploads are magic-byte checked, limited to 4 MB, and the 20-photo cap is enforced by a database trigger.

## Free-tier notes
- Supabase pauses projects after ~7 days of inactivity; restore with one click (or ping the site weekly).
- Photos are resized to ≤1600px JPEG in the browser before upload, so 20 per event stays small against the 1 GB storage quota.
- Vercel Hobby is for non-commercial use, which fits a friends' app.

## Scripts
- `npm run dev` / `build` / `start`
- `npm test` — settlement math, report output, cover art
- `npm run typecheck`
- `npm run seed` — demo event with the Pizza + Mazza example (password `festival123`)

## Project layout
```
supabase/schema.sql          tables, RLS, trigger, storage bucket
src/lib/settle.ts            split + settlement math (tested)
src/lib/report.ts            standalone HTML report with SVG charts
src/lib/charts.ts            dependency-free SVG charts
src/app/page.tsx             live event hub
src/app/e/[id]/...           participant login + event view
src/app/admin/...            admin login, dashboard, event workspace
src/app/api/admin/...        photo upload + report download
src/components/CoverArt.tsx  generated festival artwork (6 looks)
```
