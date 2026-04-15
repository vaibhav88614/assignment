# AccredVerify — Accredited Investor Verification System

> SEC Rule 506(c) compliant accredited investor verification platform with full request lifecycle, document management, reviewer workflow, real-time messaging, deadline enforcement, and automated PDF verification letter generation.

---

## Table of Contents

- [Quick Start](#quick-start)
- [Prerequisites](#prerequisites)
- [Manual Setup](#manual-setup)
- [Usage Guide](#usage-guide)
- [Testing the Application](#testing-the-application)
- [Architecture & Design](#architecture--design)
- [Why This Approach](#why-this-approach)
- [API Reference](#api-reference)
- [Project Structure](#project-structure)
- [Configuration Reference](#configuration-reference)
- [Tech Stack](#tech-stack)

---

## Quick Start

### One-Command Setup

**Windows (PowerShell):**
```powershell
.\setup.ps1
```

**Linux / macOS:**
```bash
chmod +x setup.sh && ./setup.sh
```

This installs all dependencies, seeds the database with demo data, and prints next steps.

### Start the App

You need **two terminals**:

**Terminal 1 — Backend (API server on port 8000):**
```bash
cd backend

# Activate virtual environment:
# Windows PowerShell:
.\venv\Scripts\Activate.ps1
# Windows CMD:
venv\Scripts\activate.bat
# Linux/Mac:
source venv/bin/activate

uvicorn app.main:app --reload --port 8000
```

**Terminal 2 — Frontend (dev server on port 5173):**
```bash
cd frontend
npm run dev
```

Open **http://localhost:5173** in your browser.

---

## Prerequisites

| Tool | Version | Check |
|------|---------|-------|
| **Python** | 3.11+ | `python --version` |
| **Node.js** | 18+ | `node --version` |
| **npm** | 9+ | `npm --version` |

> **Note on WeasyPrint:** PDF generation uses WeasyPrint which requires GTK libraries on some systems. If `pip install` fails for weasyprint, see the [WeasyPrint installation docs](https://doc.courtbouillon.org/weasyprint/stable/first_steps.html). The app works fully without it — letters are saved as HTML and can still be viewed/printed from the browser.

---

## Manual Setup

### Backend

```bash
cd backend

# Create virtual environment
python -m venv venv

# Activate (pick your OS)
.\venv\Scripts\Activate.ps1      # Windows PowerShell
venv\Scripts\activate.bat        # Windows CMD
source venv/bin/activate         # Linux / macOS

# Install dependencies
pip install -r requirements.txt

# (Optional) Create local .env from the template
cp .env.example .env             # Linux/Mac
copy .env.example .env           # Windows

# Seed database with demo data
python seed.py

# Start the server
uvicorn app.main:app --reload --port 8000
```

The backend will:
- Auto-create an SQLite database (`aiv.db`) on first run
- Create all tables automatically
- Start a background task that checks for expired deadlines every 5 minutes

### Frontend

```bash
cd frontend
npm install
npm run dev
```

The Vite dev server proxies all `/api/*` requests to `http://localhost:8000` automatically — no CORS issues during development.

---

## Usage Guide

### Demo Accounts

The `seed.py` script creates four demo accounts with pre-populated data:

| Role | Email | Password | What to see |
|------|-------|----------|-------------|
| **Investor** | `investor@demo.com` | `Password1!` | 3 requests (Draft, Submitted, Approved with letter) |
| **Investor 2** | `investor2@demo.com` | `Password1!` | 3 requests (Under Review, Info Requested, Denied) |
| **Reviewer** | `reviewer@demo.com` | `Password1!` | Review queue with pending & in-progress requests |
| **Admin** | `admin@demo.com` | `Password1!` | Admin dashboard with stats, user management, letter audit |

### Walkthrough: Complete Verification Flow

#### As an Investor:
1. **Register** at `/register` or log in with a demo account
2. Click **"New Request"** on the dashboard → the 5-step wizard guides you:
   - **Step 1:** Choose Individual or Entity investor type
   - **Step 2:** Select verification method (Income, Net Worth, Professional Credential, etc.)
   - **Step 3:** Fill in the method-specific attestation form (income amounts, asset details, license info)
   - **Step 4:** Upload supporting documents via drag-and-drop (PDF, JPG, PNG up to 10 MB)
   - **Step 5:** Review everything and submit with attestation confirmation checkbox
3. Track your request status on the **Dashboard** — color-coded status badges show progress
4. If the reviewer requests more info: you'll see an **orange banner with a countdown timer** — upload new documents and click "Submit Additional Info" before the deadline
5. If approved: **download the PDF verification letter** directly from the request detail page

#### As a Reviewer:
1. Log in → the **Review Dashboard** shows all pending requests with status filters
2. Click a **Submitted** request → click **"Claim & Start Review"** to assign it to yourself
3. Review the investor's attestation data and uploaded documents side-by-side
4. Take action:
   - **Approve** → auto-generates a professional 90-day verification letter (PDF)
   - **Deny** → requires a written reason (shown to investor)
   - **Request More Info** → choose a pre-built message template or write custom text, set a deadline (24h to 7 days), investor gets notified with countdown
5. Communicate with the investor via the **message thread** (right sidebar on each request)

#### As an Admin:
1. Log in → navigate to **Admin Dashboard** (link in header) with three tabs:
   - **Overview:** live counts of users by role, requests by status, total letters issued
   - **Users:** table of all accounts — change roles or toggle active/inactive
   - **Letters:** audit log of all issued verification letters with validity tracking

### Communication & Deadline Enforcement

When a reviewer clicks **"Request More Info"**, the enhanced dialog provides:

- **Pre-built message templates:** "Invalid Documents", "Incomplete Info", "Unreadable Docs" — one click fills a professional message
- **Configurable deadline:** dropdown with 24h, 48h (default), 72h, 5 days, or 7 days
- **Automatic notification:** investor receives an email with the exact deadline (logged to console in dev mode)
- **Live countdown:** investor sees a real-time countdown timer on their request detail page, with color-coded urgency (orange → red when < 12 hours → expired)
- **Auto-denial:** a background task runs every 5 minutes — if the deadline passes without response, the request is automatically denied with a system message

---

## Testing the Application

### Test Scenario 1: Full Approval Flow
```
1. Login as investor@demo.com
2. Dashboard → "New Request" → Individual → Income → Fill form → Upload a PDF → Submit
3. Logout → Login as reviewer@demo.com
4. Dashboard → Click the new request → "Claim & Start Review"
5. Click "Approve"
6. Logout → Login as investor@demo.com
7. Dashboard → Request shows "Approved" with a "Download Letter" button
```

### Test Scenario 2: Info Request with Deadline
```
1. Login as reviewer@demo.com → go to Dashboard
2. Claim a Submitted request → Click "Request More Info"
3. Select "Invalid Documents" template → Set 48h deadline → Click "Send Request (48h deadline)"
4. Check terminal output: email notification logged with deadline date
5. Logout → Login as the investor
6. Open the request → See orange/red countdown timer banner
7. Upload a new document → Click "Submit Additional Info"
8. Status changes to "Additional Info Provided"
```

### Test Scenario 3: Denial Flow
```
1. Login as reviewer@demo.com
2. Claim a submitted request → Click "Deny"
3. Enter denial reason → Click "Confirm Denial"
4. Logout → Login as the investor
5. Request shows "Denied" badge with the denial reason
```

### Test Scenario 4: Admin Dashboard
```
1. Login as admin@demo.com
2. Navigate to /admin
3. Overview tab: verify user and request counts match seed data
4. Users tab: change a user's role or toggle active status
5. Letters tab: see all issued verification letters with validity
```

### API Testing with cURL

```bash
# Health check
curl http://localhost:8000/api/health

# Login (returns JWT tokens)
curl -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"investor@demo.com","password":"Password1!"}'

# List my requests (replace <TOKEN> with access_token from login)
curl http://localhost:8000/api/verification/requests \
  -H "Authorization: Bearer <TOKEN>"

# Register a new user
curl -X POST http://localhost:8000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"new@test.com","password":"Test123!","first_name":"Test","last_name":"User","role":"INVESTOR"}'
```

### Interactive API Docs

FastAPI auto-generates interactive documentation:
- **Swagger UI:** http://localhost:8000/docs
- **ReDoc:** http://localhost:8000/redoc

### Build for Production

```bash
cd frontend
npm run build     # Outputs optimized bundle to dist/
npm run preview   # Preview the production build locally
```

---

## Architecture & Design

### System Overview

```
┌─────────────────────────────┐      ┌──────────────────────────────────┐
│   React SPA (Vite)          │      │   FastAPI Backend                │
│                             │ /api │                                  │
│  ┌───────────────────────┐  │─────▶│  ┌────────────┐ ┌────────────┐  │
│  │ TanStack Query Cache  │  │      │  │ JWT Auth   │ │ RBAC Guard │  │
│  │ Axios + JWT Refresh   │  │      │  └─────┬──────┘ └──────┬─────┘  │
│  └───────────────────────┘  │      │        │               │        │
│                             │      │  ┌─────▼───────────────▼─────┐  │
│  Pages:                     │      │  │   API Routes               │  │
│  • Home (landing)           │      │  │   /auth /verification      │  │
│  • Login / Register         │      │  │   /documents /messages     │  │
│  • Dashboard                │      │  │   /admin                   │  │
│  • New Request Wizard       │      │  └─────────────┬─────────────┘  │
│  • Request Detail           │      │                │                │
│  • Review Queue & Detail    │      │  ┌─────────────▼─────────────┐  │
│  • Admin Dashboard          │      │  │   Service Layer            │  │
│                             │      │  │   • Verification Service   │  │
│  Components:                │      │  │   • Auth Service           │  │
│  • MessageThread (chat)     │      │  │   • Document Service       │  │
│  • FileUpload (drag & drop) │      │  │   • Letter Service (PDF)   │  │
│  • StatusBadge              │      │  │   • Notification Service   │  │
│  • Deadline Countdown       │      │  └─────────────┬─────────────┘  │
└─────────────────────────────┘      │                │                │
                                     │  ┌─────────────▼─────────────┐  │
                                     │  │   SQLite / PostgreSQL     │  │
                                     │  │   (SQLAlchemy 2.0 Async)  │  │
                                     │  └───────────────────────────┘  │
                                     │                                  │
                                     │  Background: Deadline Checker    │
                                     │  (auto-deny expired requests)    │
                                     └──────────────────────────────────┘
```

### Data Model

```
┌────────────┐     ┌──────────────────────┐     ┌────────────┐
│   User     │────▶│ VerificationRequest   │◀────│  Document  │
│            │     │                      │     │            │
│ id         │     │ id                   │     │ id         │
│ email      │     │ investor_id (FK)     │     │ request_id │
│ password   │     │ reviewer_id (FK)     │     │ doc_type   │
│ role       │     │ investor_type        │     │ filename   │
│ is_active  │     │ verification_method  │     │ stored_as  │
└────────────┘     │ status (8 states)    │     │ file_size  │
                   │ attestation_data     │     └────────────┘
                   │ info_deadline        │
                   │ submitted_at         │     ┌────────────┐
                   │ reviewed_at          │────▶│  Message   │
                   │ expires_at           │     │            │
                   └──────────┬───────────┘     │ sender_id  │
                              │                 │ content    │
                   ┌──────────▼───────────┐     │ is_system  │
                   │ VerificationLetter   │     └────────────┘
                   │                      │
                   │ letter_number        │
                   │ investor_name        │
                   │ issued_at / expires  │
                   │ pdf_path / html      │
                   └──────────────────────┘
```

### Request Lifecycle State Machine

```
                                 ┌──────────────────┐
                                 │      DRAFT        │ ← Investor creates request
                                 └────────┬─────────┘
                                          │ submit (requires docs + attestation)
                                 ┌────────▼─────────┐
                                 │    SUBMITTED      │ ← Enters review queue
                                 └────────┬─────────┘
                                          │ reviewer claims
                                 ┌────────▼─────────┐
                            ┌───▶│  UNDER_REVIEW     │◀───┐
                            │    └───┬─────┬────┬────┘    │
                            │        │     │    │         │ re-review
                            │   approve  deny  request   │
                            │        │     │    info      │
                   ┌────────▼──┐ ┌───▼──┐ ┌▼────────────┐│
                   │ APPROVED  │ │DENIED│ │INFO_REQUESTED││
                   └─────┬─────┘ └──────┘ └──────┬───────┘│
                         │                       │ investor│
                    90 days                 uploads docs   │
                         │                       │         │
                   ┌─────▼─────┐  ┌──────────────▼────┐   │
                   │  EXPIRED  │  │ ADDL_INFO_PROVIDED ├───┘
                   └───────────┘  └───────────────────┘

  • INFO_REQUESTED has a configurable deadline (24h–7 days, default 48h)
  • Background task auto-denies requests when deadline expires
  • APPROVED letters are valid for 90 days, then status → EXPIRED
```

### Security Model

| Layer | Mechanism |
|-------|-----------|
| **Authentication** | JWT access tokens (30 min) + refresh tokens (7 days) |
| **Password Storage** | bcrypt hashing via passlib |
| **Authorization** | Role-based: INVESTOR, REVIEWER, ADMIN with per-endpoint guards |
| **File Upload** | MIME type whitelist (PDF/JPG/PNG), 10 MB max, UUID-based disk storage |
| **File Access** | Directory traversal prevention, ownership-based download authorization |
| **CORS** | Restricted to explicitly configured origins |
| **Input Validation** | Pydantic v2 schemas on every API endpoint |
| **State Integrity** | Explicit transition map prevents invalid status jumps at the model level |

### Verification Methods (SEC Rule 501 of Regulation D)

| Method | Criteria | Typical Evidence |
|--------|----------|-----------------|
| **Income** | $200K+ individual / $300K+ joint for last 2 years | Tax returns, W-2s, 1099s |
| **Net Worth** | $1M+ excluding primary residence | Bank/brokerage statements, CPA letter |
| **Professional Credential** | Active Series 7, 65, or 82 license | FINRA license verification |
| **Professional Role** | Director, Officer, or GP of the issuer | Organization letter/confirmation |
| **Entity Assets >$5M** | Entity not formed solely for the investment | Formation docs, audited financials |
| **All Owners Accredited** | Every equity owner individually qualifies | Individual verification letters |
| **Institutional** | Bank, insurance co, registered investment company | Regulatory filings |

---

## Why This Approach

### vs. Manual / Paper-Based Verification

| Aspect | Paper-Based | AccredVerify |
|--------|-------------|--------------|
| **Turnaround** | Days to weeks via email & fax | Minutes to hours — fully digital |
| **Audit trail** | Scattered across email threads | Complete per-request history: messages, status changes, timestamps |
| **Document security** | Attachments floating in inboxes | UUID-stored files, type-validated, access-controlled per user |
| **Compliance tracking** | Easy to miss deadlines | Automated deadline enforcement with background auto-deny |
| **Verification letters** | Manual creation in Word/PDF | Auto-generated, numbered PDF with built-in 90-day expiry |
| **Scalability** | One person manages the inbox | Role-based queue — multiple reviewers work in parallel |

### vs. Simple Form Submissions (e.g., RealtySlices "Get Free Accreditation")

| Aspect | Simple Form | AccredVerify |
|--------|-------------|--------------|
| **Workflow visibility** | Submit form, wait for email | 8-state machine with real-time status on dashboard |
| **Communication** | Separate email threads | Integrated per-request message thread with history |
| **Document handling** | Email attachments | Drag-and-drop upload, typed documents, in-app download |
| **Info follow-up** | Manual email follow-up | Pre-built templates + countdown deadline + auto-deny |
| **Multi-method** | Usually income only | 7 verification paths (4 individual + 3 entity) |
| **Self-attestation** | One generic form | Dynamic form that changes per verification method |
| **Verification letter** | Email confirmation | Professional numbered PDF letter with unique letter ID, 90-day validity |
| **Admin oversight** | No dashboard | Full admin panel: user management, stats, letter audit |

### Key Architecture Decisions

| Decision | Rationale |
|----------|-----------|
| **FastAPI (async)** | Non-blocking I/O for concurrent requests; auto-generated OpenAPI/Swagger docs; native Pydantic integration |
| **SQLAlchemy 2.0 async** | Type-safe ORM with async support; trivially swap SQLite → PostgreSQL by changing one env var |
| **SQLite for development** | Zero-setup database; single file; the `seed.py` script creates a complete demo environment instantly |
| **JWT (not sessions)** | Stateless auth that scales horizontally; auto-refresh on 401 gives seamless UX |
| **State machine in code** | `VALID_TRANSITIONS` dict at the model level prevents any invalid status change — no race conditions, no bugs |
| **Background deadline checker** | Pure asyncio task — no Celery, no Redis, no external dependencies for the demo |
| **Pydantic v2 schemas** | Runtime validation + type-safe serialization on all API boundaries; catches bad data before it hits the database |
| **TanStack Query** | Declarative data fetching with intelligent caching, automatic refetching, and built-in loading/error states |
| **TailwindCSS 4** | Utility-first CSS with zero custom stylesheets; consistent design with no CSS specificity battles |
| **WeasyPrint (PDF)** | Python-native HTML→PDF; no external services or API keys; professional output from a Jinja2 template |
| **Message templates** | Reduces reviewer effort from 5 minutes typing to 1 click; ensures consistent, professional communication |

### 506(c) Compliance Features

SEC Rule 506(c) requires issuers to take **"reasonable steps"** to verify accredited investor status. This system addresses that:

1. **Structured self-attestation** — Method-specific forms capture exact data points the SEC expects (income figures, net worth breakdown, license numbers)
2. **Document collection** — Supports all accepted document types: tax returns, W-2s, bank statements, brokerage statements, CPA letters, attorney letters, license proofs, formation documents
3. **Qualified reviewer workflow** — Trained reviewers examine documents against attestation data in a structured side-by-side view
4. **Complete audit trail** — Every message, status change, and timestamp is permanently recorded per request
5. **Deadline enforcement** — Ensures timely document provision with configurable deadlines and automatic consequences
6. **Professional verification letter** — Numbered PDF with investor name, verification method, issue date, and 90-day expiration — the standard deliverable for 506(c) offerings
7. **Automatic expiry tracking** — Letters expire after 90 days per SEC guidance; the system tracks this automatically

---

## API Reference

### Authentication
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST` | `/api/auth/register` | — | Register a new user |
| `POST` | `/api/auth/login` | — | Login → returns JWT access + refresh tokens |
| `POST` | `/api/auth/refresh` | — | Refresh an expired access token |
| `GET` | `/api/auth/me` | Bearer | Get current user profile |
| `PATCH` | `/api/auth/me` | Bearer | Update current user profile |

### Verification Requests
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST` | `/api/verification/requests` | Investor | Create a new verification request |
| `GET` | `/api/verification/requests` | Investor | List investor's own requests |
| `GET` | `/api/verification/requests/:id` | Bearer | Get detailed request info |
| `PATCH` | `/api/verification/requests/:id` | Investor | Update a draft request |
| `POST` | `/api/verification/requests/:id/submit` | Investor | Submit draft for review |
| `POST` | `/api/verification/requests/:id/provide-info` | Investor | Mark additional info as provided |
| `POST` | `/api/verification/requests/:id/transition` | Reviewer/Admin | Change request status (approve, deny, request info) |
| `GET` | `/api/verification/review-queue` | Reviewer/Admin | Get the review queue (filterable) |
| `POST` | `/api/verification/check-deadlines` | Admin | Manually trigger expired deadline check |

### Documents
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST` | `/api/documents/:requestId` | Investor | Upload a document (multipart) |
| `GET` | `/api/documents/:requestId` | Bearer | List documents for a request |
| `GET` | `/api/documents/download/:docId` | Bearer | Download a document file |
| `DELETE` | `/api/documents/:docId` | Investor | Delete a document |

### Messages
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/api/messages/:requestId` | Bearer | Get message thread for a request |
| `POST` | `/api/messages/:requestId` | Bearer | Send a message |

### Admin
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/api/admin/stats` | Admin | System-wide statistics |
| `GET` | `/api/admin/users` | Admin | List all users |
| `PATCH` | `/api/admin/users/:id` | Admin | Update user (role, active status) |
| `GET` | `/api/admin/letters` | Admin | Verification letter audit log |
| `GET` | `/api/admin/letters/:id/download` | Admin | Download a letter PDF |

> **Interactive API docs:** http://localhost:8000/docs (Swagger UI) and http://localhost:8000/redoc (ReDoc) are auto-generated by FastAPI.

---

## Project Structure

```
AccredVerify/
├── setup.sh                    # One-command setup (Linux/Mac)
├── setup.ps1                   # One-command setup (Windows)
├── .gitignore                  # Git ignore rules
├── README.md                   # This documentation
│
├── backend/
│   ├── .env.example            # Environment variable template
│   ├── requirements.txt        # Python dependencies (pinned)
│   ├── seed.py                 # Demo data seeding script
│   ├── uploads/                # Uploaded documents (gitignored)
│   │   └── .gitkeep
│   └── app/
│       ├── main.py             # FastAPI app entry point + background tasks
│       ├── config.py           # Pydantic settings (env-driven)
│       ├── database.py         # SQLAlchemy async engine + session
│       ├── models/
│       │   ├── __init__.py     # Model registry (imports all models)
│       │   ├── user.py         # User model + Role enum
│       │   ├── verification_request.py  # Request model + State Machine
│       │   ├── document.py     # Uploaded document metadata
│       │   ├── message.py      # Chat messages
│       │   └── verification_letter.py   # PDF verification letters
│       ├── schemas/            # Pydantic request/response models
│       │   ├── user.py
│       │   ├── verification.py
│       │   ├── document.py
│       │   ├── message.py
│       │   └── letter.py
│       ├── api/                # Route handlers
│       │   ├── auth.py         # Register, login, refresh, profile
│       │   ├── verification.py # Request CRUD, status transitions, review queue
│       │   ├── documents.py    # Upload, download, delete
│       │   ├── messages.py     # Per-request chat thread
│       │   └── admin.py        # User management, stats, letter audit
│       ├── services/           # Business logic layer
│       │   ├── auth_service.py          # Registration, authentication, JWT
│       │   ├── verification_service.py  # State machine + deadline enforcement
│       │   ├── document_service.py      # Document lifecycle
│       │   ├── storage_service.py       # File I/O with security checks
│       │   ├── letter_service.py        # PDF generation via WeasyPrint
│       │   └── notification_service.py  # Email notifications (console in dev)
│       ├── middleware/
│       │   └── auth.py         # JWT decode + require_role() guard
│       └── templates/
│           └── verification_letter.html  # Jinja2 template for PDF letters
│
└── frontend/
    ├── package.json            # Node dependencies
    ├── vite.config.ts          # Dev proxy to backend + Tailwind plugin
    ├── tsconfig.json           # TypeScript configuration
    ├── index.html              # HTML entry point
    └── src/
        ├── main.tsx            # App entry point (providers)
        ├── App.tsx             # Router setup + protected route wrappers
        ├── index.css           # Tailwind CSS import
        ├── api/
        │   └── client.ts       # Axios instance + JWT interceptors + auto-refresh
        ├── context/
        │   └── AuthContext.tsx  # Auth state management + auto-restore session
        ├── types/
        │   └── index.ts        # TypeScript interfaces & enums (mirrors backend)
        ├── utils/
        │   └── constants.ts    # Display labels, colors, date/size formatters
        ├── components/
        │   ├── layout/         # Header (role-aware nav), Footer
        │   ├── common/         # StatusBadge, LoadingSpinner
        │   ├── documents/      # FileUpload (drag-and-drop with type selection)
        │   └── messages/       # MessageThread (chat-style UI)
        └── pages/
            ├── HomePage.tsx        # Marketing landing page
            ├── LoginPage.tsx       # Email/password login
            ├── RegisterPage.tsx    # Registration with role selection
            ├── DashboardPage.tsx   # Role-aware request list + stats cards
            ├── NewRequestPage.tsx  # 5-step verification request wizard
            ├── RequestDetailPage.tsx   # Investor view + deadline countdown
            ├── ReviewQueuePage.tsx     # Filterable review queue
            ├── ReviewDetailPage.tsx    # Side-by-side review + message templates
            └── AdminPage.tsx          # Tabbed admin panel (overview/users/letters)
```

---

## Configuration Reference

All backend settings live in `backend/app/config.py` and can be overridden via:
1. Environment variables (highest priority)
2. A `.env` file in the `backend/` directory
3. Default values in the code

See `backend/.env.example` for the complete template.

| Variable | Default | Description |
|----------|---------|-------------|
| `DEBUG` | `true` | Enable debug mode (SQL logging, etc.) |
| `DATABASE_URL` | SQLite (auto) | Database connection string. Change to PostgreSQL for production |
| `JWT_SECRET_KEY` | Dev default | **Change this in production!** Use a random 64+ char hex string |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | `30` | JWT access token lifetime |
| `REFRESH_TOKEN_EXPIRE_DAYS` | `7` | JWT refresh token lifetime |
| `MAX_UPLOAD_SIZE_MB` | `10` | Maximum document upload size |
| `SMTP_HOST` | (empty) | Set for real email delivery; empty = log to console |
| `SMTP_PORT` | `587` | SMTP server port |
| `SMTP_FROM_EMAIL` | `noreply@aiv-verify.com` | Sender email address |
| `LETTER_VALIDITY_DAYS` | `90` | Verification letter validity period |
| `INFO_RESPONSE_HOURS` | `48` | Default deadline for info requests |
| `ISSUER_ORG_NAME` | `AIV Verification Services` | Organization name on letters |
| `CORS_ORIGINS` | `localhost:5173,3000` | Allowed frontend origins |

---

## Tech Stack

| Layer | Technology | Version | Purpose |
|-------|-----------|---------|---------|
| **Frontend** | React | 19 | Component-based UI |
| | TypeScript | 6 | Type safety |
| | Vite | 8 | Build tool with instant HMR |
| | TailwindCSS | 4 | Utility-first styling |
| | TanStack Query | 5 | Server state management + caching |
| | React Router | 7 | Client-side routing with guards |
| | Axios | 1.15 | HTTP client with interceptors |
| | Lucide React | 1.8 | SVG icon library |
| **Backend** | Python | 3.11+ | Runtime |
| | FastAPI | 0.115 | Async web framework with auto-docs |
| | SQLAlchemy | 2.0 | Async ORM with type annotations |
| | Pydantic | 2.10 | Data validation & serialization |
| | aiosqlite | 0.20 | Async SQLite driver |
| | python-jose | 3.3 | JWT token creation/verification |
| | passlib + bcrypt | 1.7 | Password hashing |
| | WeasyPrint | 63 | HTML-to-PDF conversion |
| | Jinja2 | 3.1 | Template engine (letters) |

---

## License

This project was built as a technical assessment demonstrating full-stack engineering capabilities. All rights reserved.
# Accredited Investor Verification System

A full-stack application for SEC Rule 506(c) compliant accredited investor verification. Built with **React + TypeScript** frontend and **Python FastAPI** backend.

## Features

- **Multi-path verification**: Income, Net Worth, Professional Credentials, Professional Role, Entity Assets, Entity All-Owners, Entity Institutional
- **Document management**: Secure upload/download with type validation (PDF, JPG, PNG; max 10MB)
- **Workflow engine**: State machine enforcing valid transitions (Draft → Submitted → Under Review → Approved/Denied with Info Request loop)
- **Real-time messaging**: In-app communication between investor and reviewer per request
- **PDF verification letters**: Auto-generated on approval with unique letter numbers and 90-day validity
- **Role-based access**: Investor, Reviewer, Admin with enforced route and API protections
- **Admin dashboard**: User management, system stats, letter audit log

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, TypeScript, Vite, TailwindCSS, React Router v6, TanStack Query |
| Backend | Python 3.12+, FastAPI, SQLAlchemy 2.0 (async), Pydantic v2 |
| Database | SQLite (dev) — swappable to PostgreSQL |
| Auth | JWT (access + refresh tokens), bcrypt |
| PDF | WeasyPrint (fallback: HTML) |

## Quick Start

### Backend

```bash
cd backend
python -m venv venv
venv\Scripts\activate        # Windows
# source venv/bin/activate   # Linux/Mac
pip install -r requirements.txt
python seed.py               # Create demo data
uvicorn app.main:app --reload --port 8000
```

### Frontend

```bash
cd frontend
npm install
npm run dev                  # Starts on http://localhost:5173
```

The frontend proxies `/api` requests to the backend (port 8000) via Vite config.

### Demo Accounts

| Role | Email | Password |
|------|-------|----------|
| Investor | investor@demo.com | Password1! |
| Investor 2 | investor2@demo.com | Password1! |
| Reviewer | reviewer@demo.com | Password1! |
| Admin | admin@demo.com | Password1! |

## Architecture

### Verification Request State Machine

```
DRAFT → SUBMITTED → UNDER_REVIEW → APPROVED → EXPIRED (90 days)
                                  ↘ INFO_REQUESTED ↔ ADDITIONAL_INFO_PROVIDED ↗
                                  → DENIED
```

### Verification Methods (SEC Rule 501)

**Individual:**
- **Income**: $200k+ individual / $300k+ joint for last 2 years
- **Net Worth**: $1M+ excluding primary residence
- **Professional Credential**: Active Series 7, 65, or 82
- **Professional Role**: Director/Officer/GP of issuer

**Entity:**
- **Assets >$5M**: Not formed solely for the investment
- **All Owners Accredited**: Look-through rule
- **Institutional**: Banks, insurance, RIAs, etc.

### Security

- JWT with expiry and refresh token rotation
- bcrypt password hashing
- File uploads: type whitelisting, size limits, UUID storage (no original filenames on disk)
- Directory traversal prevention on file access
- Role-based API guards on all endpoints
- CORS restricted to configured origins

### API Endpoints

| Method | Endpoint | Role | Description |
|--------|----------|------|-------------|
| POST | /api/auth/register | Public | Register new user |
| POST | /api/auth/login | Public | Login (returns JWT) |
| POST | /api/auth/refresh | Public | Refresh access token |
| GET | /api/auth/me | Auth | Current user profile |
| POST | /api/verification/requests | Investor | Create verification request |
| GET | /api/verification/requests | Investor | List my requests |
| GET | /api/verification/requests/:id | Auth | Get request detail |
| POST | /api/verification/requests/:id/submit | Investor | Submit draft request |
| POST | /api/verification/requests/:id/transition | Reviewer/Admin | Change request status |
| POST | /api/documents/:requestId | Investor | Upload document |
| GET | /api/documents/:requestId | Auth | List documents |
| GET | /api/documents/download/:docId | Auth | Download document |
| GET | /api/messages/:requestId | Auth | Get message thread |
| POST | /api/messages/:requestId | Auth | Send message |
| GET | /api/admin/stats | Admin | System statistics |
| GET | /api/admin/users | Admin | List all users |
| GET | /api/admin/letters | Admin | Letter audit log |

## Project Structure

```
├── backend/
│   ├── app/
│   │   ├── main.py              # FastAPI app
│   │   ├── config.py            # Settings
│   │   ├── database.py          # SQLAlchemy async engine
│   │   ├── models/              # ORM models
│   │   ├── schemas/             # Pydantic request/response
│   │   ├── api/                 # Route handlers
│   │   ├── services/            # Business logic
│   │   ├── middleware/          # Auth & RBAC
│   │   └── templates/           # Letter HTML template
│   ├── seed.py                  # Demo data seed script
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── App.tsx              # Root with routing
│   │   ├── api/client.ts        # Axios with JWT interceptors
│   │   ├── context/AuthContext   # Auth state management
│   │   ├── components/          # Reusable UI components
│   │   ├── pages/               # Route pages
│   │   ├── types/               # TypeScript interfaces
│   │   └── utils/               # Constants & helpers
│   └── package.json
└── README.md
```
