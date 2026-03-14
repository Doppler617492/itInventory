# IT Procurement & Finance Management

Full-stack IT procurement system with requests, approvals, finance inbox, assets, subscriptions, and reports.

## Tech Stack

- **Frontend**: React + Vite, Tailwind CSS
- **Backend**: FastAPI (Python), SQLAlchemy
- **Database**: PostgreSQL
- **Auth**: JWT (access + refresh), RBAC

## Quick Start

### Prerequisites

- Docker & Docker Compose
- Node.js 18+ (for frontend)
- Python 3.12+ (for local API dev)

### 1. Start Backend (Docker)

```bash
docker compose up -d
```

This starts:
- **PostgreSQL** on port 5432
- **API** on port 8000

### 2. Seed Data

```bash
cd api && python seed_data.py
```

Or with Docker:
```bash
docker compose exec api python seed_data.py
```

Demo login: `it@cungu.com` / `Dekodera1989@` (admin) ili `admin@company.com` / `admin123`

### 3. Start Frontend

```bash
npm install   # ili pnpm install
npm run dev  # ili pnpm dev
```

Frontend runs at http://localhost:5173

### Pokretanje bez Dockera (brzi start)

**Default: SQLite** – radi bez dodatne instalacije. Za produkciju preporučeno PostgreSQL.

```bash
# 1. Python venv i zavisnosti
python3 -m venv .venv
.venv/bin/pip install -r api/requirements.txt

# 2. Seed demo podataka (prvi put)
.venv/bin/python api/seed_data.py

# 3. API (terminal 1)
npm run api
# ili: .venv/bin/uvicorn api.main:app --reload --host 0.0.0.0 --port 8000

# 4. Frontend (terminal 2)
npm install && npm run dev
```

Login: `it@cungu.com` / `Dekodera1989@` (admin) ili `admin@company.com` / `admin123`

Za PostgreSQL: u `.env` postavi `DATABASE_URL=postgresql://itproc:itproc@localhost:5432/itproc`

### 4. Login & Use

- Visit http://localhost:5173
- Click "Desktop Application" or "Mobile Application"
- You'll be redirected to `/login` - use ` / `@`
- Dashboard, Requests, Finance, Assets, Subscriptions, Reports are wired to the API

## Project Structure

```
├── api/                    # FastAPI backend
│   ├── api/main.py         # App entry
│   ├── core/               # config, database, security
│   ├── models/             # SQLAlchemy models
│   ├── routers/            # API routes
│   ├── schemas/            # Pydantic schemas
│   ├── services/           # Business logic (approval workflow)
│   ├── seed_data.py        # Demo data
│   └── requirements.txt
├── src/                    # React frontend
│   ├── app/
│   │   ├── pages/          # Dashboard, Requests, Finance, etc.
│   │   ├── components/
│   │   └── routes.ts
│   └── lib/
│       ├── api.ts          # Fetch wrapper + auth
│       └── api-config.ts   # Centralized API URLs
├── docker-compose.yml
└── .env.example
```

## API Endpoints

| Group | Endpoints |
|-------|-----------|
| Auth | POST /api/auth/login, /refresh, GET /me, PATCH /me/preferences |
| Requests | GET/POST /api/requests, PATCH /{id}, POST /{id}/submit, /{id}/approve, /{id}/reject |
| Documents | POST /api/documents/upload, GET /{id}/download |
| Invoices | GET/POST /api/invoices, POST /{id}/match-request, /{id}/set-status, /{id}/mark-paid |
| Assets | GET/POST /api/assets, PATCH /{id} |
| Subscriptions | GET/POST /api/subscriptions, PATCH /{id}, GET /renewals |
| Reports | GET /api/reports/spend, /subscriptions/monthly |
| Dashboard | GET /api/dashboard |

## Approval Workflow

- **Steps**: Manager → Finance → CEO (based on amount)
- **Thresholds** (config in `api/core/config.py`):
  - &lt; €300: Manager only
  - €300–€2000: Manager + Finance
  - &gt; €2000: Manager + Finance + CEO

## Environment

Copy `.env.example` to `.env` and adjust:

- `DATABASE_URL` – PostgreSQL connection
- `JWT_SECRET` – Use strong secret in production
- `CORS_ORIGINS` – Frontend origins
- `UPLOAD_DIR` – Path for uploaded files
- `VITE_API_URL` – API base URL for frontend (default: http://localhost:8000)

### Email notifikacije (opciono)

Za slanje email obavijesti pri novim zahtjevima, postavite u `.env`:

- `SMTP_HOST` – SMTP server (npr. smtp.gmail.com)
- `SMTP_PORT` – 587 (TLS)
- `SMTP_USER` – email za prijavu
- `SMTP_PASSWORD` – lozinka
- `SMTP_FROM` – "IT Nabavka <noreply@domen.com>"

Bez ove konfiguracije, notifikacije se i dalje kreiraju u aplikaciji (ikona zvonce), samo se email ne šalje.
