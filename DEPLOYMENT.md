# AccredVerify — Deployment Guide & Project Summary

> Complete guide to deploying on **Render** (backend + DB) + **Vercel** (frontend) + **Cloudinary** (file storage) + **Resend** (email), plus a full project summary.

---

## Table of Contents

- [What You Need From Each Service](#what-you-need-from-each-service)
- [Step 1: Create Accounts](#step-1-create-accounts)
- [Step 2: Get Your API Keys](#step-2-get-your-api-keys)
- [Step 3: Deploy Backend on Render](#step-3-deploy-backend-on-render)
- [Step 4: Deploy Frontend on Vercel](#step-4-deploy-frontend-on-vercel)
- [Step 5: Connect Everything](#step-5-connect-everything)
- [Step 6: Seed the Production Database](#step-6-seed-the-production-database)
- [Verification Checklist](#verification-checklist)
- [Complete Project Summary](#complete-project-summary)
- [Architecture Decisions — Why We Chose What We Chose](#architecture-decisions--why-we-chose-what-we-chose)

---

## What You Need From Each Service

| Service | What You Need | Free Tier Limits | Cost |
|---------|---------------|------------------|------|
| **Render** | Account (GitHub OAuth) | 750 hrs/month, 256 MB PostgreSQL | $0 |
| **Vercel** | Account (GitHub OAuth) | 100 GB bandwidth, unlimited deploys | $0 |
| **Cloudinary** | `CLOUDINARY_URL` | 25 GB storage, 25 GB bandwidth/month | $0 |
| **Resend** | `RESEND_API_KEY` | 100 emails/day, 3,000/month | $0 |

**Total monthly cost: $0**

---

## Step 1: Create Accounts

### 1.1 Render (Backend + PostgreSQL)

1. Go to **https://render.com**
2. Click **"Get Started for Free"**
3. Sign up with **GitHub** (recommended — auto-connects your repo)
4. Verify your email

### 1.2 Vercel (Frontend)

1. Go to **https://vercel.com**
2. Click **"Sign Up"**
3. Sign up with **GitHub** (recommended — auto-deploys on push)
4. Verify your email

### 1.3 Cloudinary (File Storage)

1. Go to **https://cloudinary.com**
2. Click **"Sign Up for Free"**
3. Fill in name, email, password
4. Choose **"Programmable Media"** as your use case
5. Verify your email
6. After login, you'll see the **Dashboard** — your credentials are shown immediately

### 1.4 Resend (Email)

1. Go to **https://resend.com**
2. Click **"Get Started"**
3. Sign up with **GitHub** or email
4. Verify your email
5. You'll be guided through initial setup

---

## Step 2: Get Your API Keys

### 2.1 Cloudinary — Get `CLOUDINARY_URL`

1. Log in to **https://console.cloudinary.com**
2. On the Dashboard, you'll see:
   ```
   Cloud name: your_cloud_name
   API Key:    123456789012345
   API Secret: abc123def456ghi789
   ```
3. Your `CLOUDINARY_URL` is:
   ```
   cloudinary://123456789012345:abc123def456ghi789@your_cloud_name
   ```
   (Replace with your actual values)

4. **Or** click **"Go to API Keys"** → Copy the full **API Environment Variable** which looks like:
   ```
   CLOUDINARY_URL=cloudinary://123456789012345:abc123def456ghi789@your_cloud_name
   ```

### 2.2 Resend — Get `RESEND_API_KEY`

1. Log in to **https://resend.com/api-keys**
2. Click **"Create API Key"**
3. Name it: `accredverify-production`
4. Permission: **Sending access**
5. Domain: **All domains** (for now — later you can restrict)
6. Click **"Add"**
7. **Copy the key immediately** — it starts with `re_` and is shown only once!
   ```
   re_abc123DEF456...
   ```
8. Save it somewhere safe.

> **Important on Resend free tier:** By default you can only send emails **from** `onboarding@resend.dev`. To send from a custom domain (e.g., `noreply@yourdomain.com`), you need to add and verify a domain in Resend's settings. For testing, the default `onboarding@resend.dev` works fine.

---

## Step 3: Deploy Backend on Render

### Option A: Blueprint (Automatic — Recommended)

1. Log in to **https://dashboard.render.com**
2. Click **"New +"** → **"Blueprint"**
3. Select your GitHub repository: `vaibhav88614/assignment`
4. Render reads the `render.yaml` file and auto-creates:
   - A **Web Service** (Python backend)
   - A **PostgreSQL database** (free tier)
5. You'll be prompted to set environment variables. Fill in:

   | Variable | Value |
   |----------|-------|
   | `CLOUDINARY_URL` | `cloudinary://YOUR_KEY:YOUR_SECRET@YOUR_CLOUD_NAME` |
   | `RESEND_API_KEY` | `re_your_api_key_here` |
   | `CORS_ORIGINS` | Leave blank for now (set after Vercel deploy) |

6. Click **"Apply"** — Render will build and deploy

### Option B: Manual Setup

1. **Create PostgreSQL:**
   - Dashboard → **"New +"** → **"PostgreSQL"**
   - Name: `accredverify-db`
   - Region: Oregon
   - Plan: Free
   - Click **"Create Database"**
   - Copy the **Internal Database URL**

2. **Create Web Service:**
   - Dashboard → **"New +"** → **"Web Service"**
   - Connect your GitHub repo
   - Settings:
     - **Name:** `accredverify-api`
     - **Region:** Oregon
     - **Runtime:** Python
     - **Root Directory:** `backend`
     - **Build Command:** `pip install -r requirements.txt && python seed.py`
     - **Start Command:** `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
   - **Environment Variables:**

     | Key | Value |
     |-----|-------|
     | `DATABASE_URL` | *(paste Internal Database URL from step 1)* |
     | `JWT_SECRET_KEY` | *(click "Generate" or paste a random 64-char hex)* |
     | `DEBUG` | `false` |
     | `CLOUDINARY_URL` | `cloudinary://YOUR_KEY:YOUR_SECRET@YOUR_CLOUD_NAME` |
     | `RESEND_API_KEY` | `re_your_api_key_here` |
     | `RESEND_FROM_EMAIL` | `AccredVerify <onboarding@resend.dev>` |
     | `CORS_ORIGINS` | `["https://your-app.vercel.app"]` *(set after step 4)* |
     | `PYTHON_VERSION` | `3.11.7` |

   - Click **"Create Web Service"**

3. Wait for deploy to complete. Note your backend URL:
   ```
   https://accredverify-api.onrender.com
   ```

---

## Step 4: Deploy Frontend on Vercel

1. Log in to **https://vercel.com/dashboard**
2. Click **"Add New..." → "Project"**
3. **Import** your GitHub repository: `vaibhav88614/assignment`
4. Configure:
   - **Framework Preset:** Vite
   - **Root Directory:** Click "Edit" → type `frontend`
   - **Build Command:** `npm run build` (auto-detected)
   - **Output Directory:** `dist` (auto-detected)
5. **Environment Variables — Add one:**

   | Key | Value |
   |-----|-------|
   | `VITE_API_URL` | `https://accredverify-api.onrender.com/api` |

   *(Replace with your actual Render backend URL from step 3)*

6. Click **"Deploy"**
7. Note your frontend URL:
   ```
   https://your-app.vercel.app
   ```

---

## Step 5: Connect Everything

Now that both services are live, you need to set the CORS origin on Render to allow requests from Vercel.

1. Go to **Render Dashboard** → Your web service → **Environment**
2. Set (or update) `CORS_ORIGINS`:
   ```
   ["https://your-app.vercel.app"]
   ```
   *(Replace with your actual Vercel URL)*
3. Click **"Save Changes"** — Render will auto-redeploy

### Verify the Connection

1. Open your Vercel URL: `https://your-app.vercel.app`
2. You should see the AccredVerify landing page
3. Click **Login** → Enter `investor@demo.com` / `Password1!`
4. If the dashboard loads with data, everything is connected!

---

## Step 6: Seed the Production Database

The `render.yaml` build command includes `python seed.py`, so demo data is created automatically on first deploy. If you need to re-seed:

1. On **Render Dashboard**, go to your web service
2. Click **"Shell"** tab (or use the manual deploy)
3. Run:
   ```bash
   cd backend && python seed.py
   ```

---

## Verification Checklist

After deployment, verify each feature works:

- [ ] **Landing page** loads at Vercel URL
- [ ] **Login** with `investor@demo.com` / `Password1!`
- [ ] **Dashboard** shows investor's requests
- [ ] **New Request** → complete the 5-step wizard
- [ ] **Upload a document** → file appears in the request
- [ ] **Submit** the request → status changes to SUBMITTED
- [ ] **Login as reviewer** (`reviewer@demo.com`) → see review queue
- [ ] **Claim & review** a request → approve it
- [ ] **Download verification letter** (PDF or HTML)
- [ ] **Login as admin** (`admin@demo.com`) → admin dashboard works
- [ ] **Email notification** — check Resend dashboard for sent emails
- [ ] **Cloudinary** — check console for uploaded documents

---

## Complete Project Summary

### What Is AccredVerify?

AccredVerify is a **full-stack web application** for verifying accredited investor status under **SEC Rule 506(c)** of Regulation D. It replaces the traditional paper-based, email-driven verification process with a structured digital workflow.

### The Problem We Solved

Under SEC Rule 506(c), companies raising capital must take **"reasonable steps"** to verify that all investors are accredited (meeting specific income, net worth, or professional criteria). The traditional process involves:

- Back-and-forth emails with sensitive documents attached
- Manual tracking in spreadsheets
- No audit trail
- Missed deadlines with no enforcement
- Handwritten verification letters

This is slow, insecure, and doesn't scale.

### What We Built

A complete 3-tier application with:

1. **React Single-Page Application** (frontend)
   - Marketing landing page
   - Investor portal: register, submit requests via guided 5-step wizard, upload documents, track status, receive messages, download verification letters
   - Reviewer portal: filterable review queue, claim & review requests, approve/deny/request info with templates and deadlines
   - Admin portal: platform-wide stats, user management, letter audit log

2. **FastAPI REST API** (backend)
   - JWT authentication (access + refresh tokens) with role-based access control
   - 8-state request lifecycle state machine with enforced transitions
   - Document upload/download with type validation and size limits
   - Per-request messaging thread between investor and reviewer
   - Automated PDF verification letter generation
   - Background task for deadline enforcement (auto-deny expired requests)
   - Email notifications via Resend API

3. **Data Layer**
   - SQLite for local development (zero setup)
   - PostgreSQL for production (via Render)
   - Cloudinary for persistent file storage in production

### Why We Built It This Way

#### Why FastAPI?
- **Async by default** — handles concurrent requests without blocking (critical for file uploads and DB queries)
- **Auto-generated API docs** — Swagger UI and ReDoc are built-in, no extra work
- **Pydantic integration** — every request/response is validated automatically
- **Modern Python** — type hints, async/await, dataclass-style models

#### Why React + Vite + TailwindCSS?
- **React 19** — industry standard for component-based UIs
- **Vite** — sub-second hot module replacement during development, optimized production builds
- **TailwindCSS 4** — utility-first CSS eliminates the need for custom stylesheets entirely. Every component is styled inline, making the codebase self-documenting
- **TanStack Query** — handles server state (caching, refetching, loading states) so we don't reinvent the wheel

#### Why SQLAlchemy 2.0 Async?
- The **same ORM code** works with SQLite (dev) and PostgreSQL (prod) — just change one env var
- Async support means DB queries don't block the event loop
- Type-safe: models have type annotations that catch bugs at development time

#### Why a State Machine?
- The `VALID_TRANSITIONS` dictionary at the model level prevents **any invalid status change**
- No race conditions: transitions are validated before they execute
- Every state change auto-creates a system message for audit trail
- The 8-state lifecycle (DRAFT → SUBMITTED → UNDER_REVIEW → INFO_REQUESTED ↔ ADDITIONAL_INFO_PROVIDED → APPROVED/DENIED → EXPIRED) covers every real-world scenario

#### Why JWT (Not Sessions)?
- **Stateless** — the backend doesn't need to store sessions, which means:
  - Horizontally scalable (any server can validate any token)
  - No session store to manage
- **Auto-refresh** — the frontend interceptor transparently refreshes expired tokens, giving seamless UX
- **RBAC built-in** — role is embedded in the token, checked on every request

#### Why Cloudinary (Not Local Filesystem)?
- **Render's free tier has ephemeral storage** — files are deleted on every redeploy
- Cloudinary provides **25 GB free**, permanent storage for documents and letters
- Automatic CDN delivery — fast downloads globally
- The app auto-detects: if `CLOUDINARY_URL` is set, it uses cloud storage; otherwise, local disk (for dev)

#### Why Resend (Not SMTP)?
- **100 emails/day free** — more than enough for a demo/small deployment
- **Simple API** — one HTTP POST to send an email, no SMTP configuration headaches
- **Developer-friendly** — logs show delivery status, no bounced-email mysteries
- The app auto-detects: Resend → SMTP → console logging (dev), in priority order

#### Why Render + Vercel (Not a Single Platform)?
- **Vercel** is the best free platform for React/Vite SPAs — global CDN, instant deploys, zero config
- **Render** is the best free platform for Python backends — native PostgreSQL, persistent environment, no cold starts for scheduled tasks
- Together they cost **$0/month** with generous free tiers
- Separation of concerns: frontend and backend deploy independently

#### Why Not GitHub Pages?
- GitHub Pages only serves **static files** (HTML/CSS/JS)
- Our app has a Python backend, database, file uploads, background tasks, PDF generation
- GitHub Pages cannot run any of that

### Security Design

| Layer | Implementation |
|-------|---------------|
| **Authentication** | bcrypt password hashing, JWT access (30min) + refresh (7d) tokens |
| **Authorization** | Per-endpoint role guards: `require_role(UserRole.ADMIN)` decorator pattern |
| **File Security** | MIME whitelist, 10MB limit, UUID filenames (no user-controlled paths), directory traversal prevention |
| **Input Validation** | Pydantic v2 schemas validate every API request — malformed data never reaches the DB |
| **State Integrity** | Explicit transition map at model level — no invalid status jumps |
| **CORS** | Restricted to explicitly configured origins |
| **Secrets** | All credentials via environment variables, never in code |

### What Every Service Does

```
┌─────────────────┐
│    Vercel        │  Hosts the React SPA (static files on global CDN)
│    (Frontend)    │  Env: VITE_API_URL → points to Render backend
└────────┬────────┘
         │ HTTPS
         ▼
┌─────────────────┐
│    Render        │  Runs FastAPI + Uvicorn (Python web server)
│    (Backend)     │  Handles auth, business logic, background tasks
│                  │  Env: DATABASE_URL, CLOUDINARY_URL, RESEND_API_KEY
└────┬────┬───┬───┘
     │    │   │
     ▼    │   ▼
┌────────┐│ ┌─────────────┐
│Render  ││ │ Cloudinary   │  Stores uploaded documents and generated
│  PG DB ││ │ (Files)      │  verification letters persistently
└────────┘│ └─────────────┘
          ▼
  ┌─────────────┐
  │   Resend     │  Sends transactional emails (notifications,
  │   (Email)    │  deadline alerts, approval/denial notices)
  └─────────────┘
```

### Demo Accounts (Created by seed.py)

| Role | Email | Password |
|------|-------|----------|
| Investor | `investor@demo.com` | `Password1!` |
| Investor 2 | `investor2@demo.com` | `Password1!` |
| Reviewer | `reviewer@demo.com` | `Password1!` |
| Admin | `admin@demo.com` | `Password1!` |

---

## Troubleshooting

### Backend won't start on Render
- Check the **Logs** tab on Render dashboard
- Common issue: `PYTHON_VERSION` not set → add env var `PYTHON_VERSION=3.11.7`
- WeasyPrint may fail on Render (missing system libs) — the app falls back to HTML letters automatically

### Frontend shows "Network Error"
- Check that `VITE_API_URL` is set correctly in Vercel environment variables
- Ensure `CORS_ORIGINS` on Render includes your Vercel URL (with `https://`)
- After changing env vars on Vercel, you need to **redeploy** (Deployments → click latest → Redeploy)

### Emails not sending
- Check Resend dashboard at https://resend.com/emails for delivery logs
- On free tier, you can only send **from** `onboarding@resend.dev`
- Make sure `RESEND_API_KEY` is set correctly on Render

### File uploads fail
- Check Cloudinary dashboard for usage/errors
- Verify `CLOUDINARY_URL` format: `cloudinary://API_KEY:API_SECRET@CLOUD_NAME`
- Check Render logs for upload errors

### Database connection fails
- On Render, the DATABASE_URL is auto-injected when using Blueprint
- If manual: make sure you're using the **Internal Database URL**, not the external one
- The app auto-converts `postgres://` to `postgresql+asyncpg://`

---

## Summary of API Keys You Need to Provide

| Key | Where to Get It | Example Format |
|-----|----------------|----------------|
| `CLOUDINARY_URL` | https://console.cloudinary.com → Dashboard | `cloudinary://123:abc@mycloud` |
| `RESEND_API_KEY` | https://resend.com/api-keys → Create API Key | `re_abc123DEF456...` |

That's it. Only **2 API keys** needed. Everything else is auto-configured by Render + Vercel.
