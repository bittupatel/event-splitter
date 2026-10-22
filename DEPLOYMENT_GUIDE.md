# 🚀 Complete Live Deployment & Setup Guide (Vercel + Supabase)

This guide takes you step-by-step from zero to a live, production-ready **Event Splitter** deployment on **Vercel** backed by **Supabase**.

---

## 📋 Table of Contents
1. [Prerequisites](#1-prerequisites)
2. [Supabase Backend Setup](#2-supabase-backend-setup-5-minutes)
3. [Environment Variables Reference](#3-environment-variables-reference)
4. [Deploying to Vercel](#4-deploying-to-vercel)
5. [Creating the Admin Account](#5-creating-the-admin-account)
6. [Configuring OTP Login & SMTP in the Admin Panel](#6-configuring-otp-login--smtp-in-the-admin-panel)
7. [How Participant Login Works (OTP ON vs. OTP OFF)](#7-how-participant-login-works-otp-on-vs-otp-off)
8. [Settlement Plan & Expense Report (Who Pays Whom)](#8-settlement-plan--expense-report-who-pays-whom)
9. [Troubleshooting & Common Issues](#9-troubleshooting--common-issues)

---

## 1. Prerequisites

Before beginning, ensure you have:
- A free [GitHub](https://github.com/) account.
- A free [Vercel](https://vercel.com/) account.
- A free [Supabase](https://supabase.com/) account.
- Node.js 18+ installed locally (for testing or generating secrets).

---

## 2. Supabase Backend Setup (5 minutes)

### Step 2.1: Create a Supabase Project
1. Go to [supabase.com/dashboard](https://supabase.com/dashboard) and log in.
2. Click **New Project**.
3. Fill in:
   - **Name**: `event-splitter` (or any name you like)
   - **Database Password**: Choose a strong password and save it somewhere secure.
   - **Region**: Choose a region close to your users (e.g., *South Asia (Mumbai)* or *US East*).
   - **Pricing Plan**: Free tier ($0/month).
4. Click **Create new project** and wait 1–2 minutes for the database to provision.

---

### Step 2.2: Run the Database Schema
1. In the Supabase left sidebar, click the **SQL Editor** (icon `>_`).
2. Click **New query**.
3. Open the file `supabase/schema.sql` from this repository, copy its entire content, and paste it into the SQL Editor.
4. Click **Run** (green button or press `Ctrl + Enter`).
5. You should see `Success. No rows returned`.

> **What this does:**
> - Creates tables: `events`, `participants`, `expenses`, `access_codes`, `login_attempts`, `event_photos`, `admin_settings`.
> - Enables strict Row Level Security (RLS) on all tables.
> - Creates the 20-photo limit database trigger.
> - Provisions the private `event-photos` Supabase storage bucket.

---

### Step 2.3: Configure Supabase Authentication
1. In the Supabase left sidebar, go to **Authentication** → **Providers** → click **Email**:
   - Ensure **Enable Email provider** is **ON**.
   - Ensure **Confirm email** is enabled (or toggle off if you prefer auto-confirming admin users).
2. Go to **Authentication** → **URL Configuration**:
   - Set **Site URL** temporarily to `http://localhost:3000` (you will change this to your production Vercel URL after deploying).
   - In **Redirect URLs**, add:
     - `http://localhost:3000/**`
     - `https://*.vercel.app/**`

---

### Step 2.4: Copy API Credentials
In the Supabase left sidebar, click **Project Settings** (gear icon) → **API**:
1. Copy **Project URL** (e.g., `https://abcdefghijklm.supabase.co`).
2. Copy **Project API keys** → `anon` (public key).
3. Copy **Project API keys** → `service_role` (secret key). Keep this safe! Never expose it publicly.

---

## 3. Environment Variables Reference

You will need these 5 environment variables for both local `.env.local` and Vercel:

| Variable Name | Description | Example |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase Project URL | `https://xyzproject.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase Anon Key (public) | `eyJhbGciOi...` |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase Service Role Key (server secret) | `eyJhbGciOi...` |
| `ADMIN_EMAIL` | Admin's email address (comma-separated if multiple) | `admin@gmail.com` |
| `SESSION_SECRET` | 32+ character random string for signing cookies | `w8rB9xL...` |

### How to Generate `SESSION_SECRET`:
Run this command in your terminal:
```bash
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
```
Copy the generated string.

---

## 4. Deploying to Vercel

### Step 4.1: Push Code to GitHub
1. Initialize git in your local project folder (if not done):
   ```bash
   git init
   git add .
   git commit -m "feat: live ready with OTP toggle, SMTP settings and enhanced settlement report"
   ```
2. Create a new repository on [GitHub](https://github.com/new).
3. Push your branch:
   ```bash
   git remote add origin https://github.com/YOUR_USERNAME/event-splitter.git
   git branch -M main
   git push -u origin main
   ```

---

### Step 4.2: Import Project in Vercel
1. Log in to [vercel.com](https://vercel.com/) and click **Add New** → **Project**.
2. Locate your `event-splitter` repository and click **Import**.
3. **Framework Preset**: Auto-detected as **Next.js**.
4. Expand **Environment Variables** and add all 5 keys:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `ADMIN_EMAIL`
   - `SESSION_SECRET`
   *(Ensure all 5 are checked for **Production**, **Preview**, and **Development**)*.
5. Click **Deploy**.
6. Wait ~60 seconds for the deployment to finish. Your app is now live at `https://your-project.vercel.app`! 🎉

---

### Step 4.3: Update Supabase Site URL
1. Go back to [supabase.com/dashboard](https://supabase.com/dashboard) → **Authentication** → **URL Configuration**.
2. Set **Site URL** to your live Vercel URL (e.g. `https://your-project.vercel.app`).
3. Add `https://your-project.vercel.app/**` to **Redirect URLs**.
4. Click **Save**.

---

## 5. Creating the Admin Account

Only emails listed in `ADMIN_EMAIL` can access the admin workspace.

### Method A (Direct via Supabase Dashboard - Recommended):
1. In Supabase, go to **Authentication** → **Users**.
2. Click **Add user** → **Create user**.
3. Enter the exact email specified in `ADMIN_EMAIL` and a secure password.
4. Check **Auto Confirm User?** so you don't need to click a confirmation link.
5. Click **Create user**.
6. Now visit `https://your-project.vercel.app/admin/login` and log in with your credentials!

### Method B (Via Web App Sign-up):
1. Visit `https://your-project.vercel.app/admin/login`.
2. Click **First time? Create the admin account**.
3. Enter your `ADMIN_EMAIL` and a password (8+ characters).
4. Click **Create admin account**.
5. Check your email inbox for the Supabase confirmation link, click it, and sign in.

---

## 6. Configuring OTP Login & SMTP in the Admin Panel

Once signed in to the admin panel:
1. In the top navigation bar, click **⚙️ Settings & SMTP** (or visit `/admin/settings`).
2. You will see three dedicated sections:

### 1. OTP-wise Login Control
- **Require OTP for login (ON)**:
  Participants must enter a 6-digit OTP code received on the **admin email** to sign in.
- **Allow login with credentials only (OFF)**:
  Participants sign in immediately with invited email + shared event password (no OTP needed).
- **Admin Notification Email**:
  Specify which email inbox should receive the OTP codes when users request them.

### 2. SMTP Mail Server Configuration
To allow the app to automatically dispatch OTP codes to your email, fill in your SMTP details:

#### 💡 Setup for Gmail (Free & Fast):
1. Go to your **Google Account** ([myaccount.google.com](https://myaccount.google.com/)).
2. Go to **Security** → ensure **2-Step Verification** is turned ON.
3. In the search bar at the top, search for **App passwords**.
4. Create an app password named `Event Splitter`.
5. Google will give you a **16-character password** (e.g., `abcd efgh ijkl mnop`).
6. In Event Splitter `/admin/settings`:
   - **SMTP Host**: `smtp.gmail.com`
   - **SMTP Port**: `587`
   - **Encryption**: `STARTTLS (Port 587 - Standard)`
   - **SMTP Username**: Your Gmail address (e.g. `you@gmail.com`)
   - **SMTP Password**: The 16-character App Password (without spaces)
   - **From Name & Email**: `Event Splitter <you@gmail.com>`
7. Click **Save SMTP Settings**.

#### Alternative Providers:
- **Brevo (Sendinblue)**: Host `smtp-relay.brevo.com`, Port `587`, User = Brevo login email, Password = Brevo SMTP master key.
- **Resend**: Host `smtp.resend.com`, Port `465` (SSL), User = `resend`, Password = API key.

### 3. Test SMTP Connection
- In the **Test SMTP Email Dispatch** box, enter your email and click **Send Test Email ✉️**.
- You will receive a test message confirming your setup works!

---

## 7. How Participant Login Works (OTP ON vs. OTP OFF)

### When OTP is ON (Toggle Enabled):
1. A participant visits the event link: `/e/[id]/login`.
2. They enter:
   - Their invited email address.
   - The event's shared password.
3. They click **✉️ Send OTP to Admin**:
   - The app verifies their credentials and generates a 6-digit code.
   - The code is immediately emailed to the **Admin's email address**.
   - The user sees: *"✅ OTP sent successfully to the organiser's email! Please get your 6-digit code from the admin."*
4. The admin checks their email, gives the code to the friend, and the friend enters the 6 digits.
5. Friend enters the event!

*(Alternatively, the Admin can click **Issue login code** next to any participant in `/admin/events/[id]?tab=people` to generate and email the code.)*

### When OTP is OFF (Toggle Disabled):
1. Participant visits `/e/[id]/login`.
2. The OTP field is completely hidden.
3. Participant enters their email + the event password and clicks **Enter event →**.
4. They are signed in immediately!

---

## 8. Settlement Plan & Expense Report (Who Pays Whom)

### The Problem It Solves:
When multiple friends pay for different items (e.g. Arun pays ₹400 for Pizza, Rahul pays ₹35 for drinks), figuring out who owes whom usually causes arguments.

### The Math:
- All calculations use **integer paise** (₹1 = 100 paise), completely eliminating floating-point rounding errors.
- Fair share = `Total ÷ Total People`.
- Any leftover paise are distributed 1 paisa each to guarantee shares sum **exactly** to the total spent.
- **Greedy Minimal-Transfer Matching**: Largest debtor pays largest creditor so the group settles up in the smallest possible number of transactions.

### Enhanced Settlement Report:
1. **Who Needs to Pay Whom Table**:
   - Clear columns: **Who Pays (Debtor)** → **Action** → **Who Receives (Creditor)** → **Amount to Pay**.
2. **Visual Flow Cards**:
   - Shows badge for debtor, arrow, creditor, and bold INR amount.
3. **Person-by-Person Breakdown**:
   - Detailed list under each person stating exactly whom they need to transfer money to, or whom they will receive money from.
4. **How to Access**:
   - **Admin**: Go to Event → **Report** tab → Click **Download HTML** or **Open in new tab** (can print directly to PDF with `Ctrl + P`).
   - **Participants**: Click **📄 View full report** inside their **Settle up** section on `/e/[id]`.

---

## 9. Troubleshooting & Common Issues

### Issue 1: Supabase project paused
- **Cause**: Supabase free-tier projects pause after ~7 days of inactivity.
- **Fix**: Log in to Supabase dashboard and click **Restore project** (takes ~30 seconds).

### Issue 2: Admin login says "That email is not the event administrator"
- **Cause**: The email does not match `ADMIN_EMAIL` in Vercel environment variables.
- **Fix**: Verify `ADMIN_EMAIL` in Vercel project settings (ensure no trailing spaces) and redeploy if changed.

### Issue 3: SMTP connection error / Authentication rejected
- **Cause**: Incorrect SMTP username/password, or 2-Step Verification not enabled for Gmail.
- **Fix**: For Gmail, you **must** use a 16-character **Google App Password**, not your normal account password. Ensure Port is `587` with STARTTLS, or `465` with SSL.

### Issue 4: "Too many attempts. Please wait 15 minutes"
- **Cause**: Rate limit triggered (5 failed attempts per email / 20 per IP).
- **Fix**: Wait 15 minutes, or in Supabase SQL Editor run:
  ```sql
  truncate table public.login_attempts;
  ```

---

Enjoy using **Event Splitter**! 🎊
