# cc-acehtengah — Command Center Aceh Tengah

> **Next.js 16 + Prisma 6 + LLM + RAG** — Integrasi SAPA → SPLP → Command Center AI
> **Path:** `services/cc-acehtengah/`
> **Status:** 🟢 **Active — Fase 5: Theme/Accessibility + Security Hardening**
> **Deploy:** GitHub + Vercel (https://cc-acehtengah.vercel.app)
> **Last update:** Aug 22, 2026 — theme light default + WCAG AA, security JWT/rate-limit (#3), analytics fix, AI spinner fix
> **Backlog priority:** P2

> **⚠️ EWS (Early Warning System) BELUM FUNGSIONAL — MASUK BACKLOG:**
> Endpoint `/api/ews` & panel UI ada, tapi tidak ada kode yang membuat `EwsAlert`.
> Rantai putus: `EwsAlert` → butuh `Indicator` → butuh `Dataset`, sedangkan `Dataset`
> tak pernah terisi (data SAPA diambil langsung, tidak disimpan). Panel selalu
> "normal". **Butuh R1 (data warehouse SAPA)** sebelum EWS bisa nyala.
> Lihat `LAPORAN_AUDIT_PRODUCTION_READINESS.md` §P1-10 + roadmap R1–R2.

## Arsitektur

```
SAPA ──[SPLP API]──→ AI Middleware ──→ Dashboard CC
(Data Source)     (Next.js API)     (Eksekutif)
                        │
                        ├── ChatSession DB (auto-log)
                        └── Admin Auth (JWT cookie)
```

## Stack

| Layer | Teknologi |
|-------|-----------|
| Frontend | Next.js 16, React 19, Tailwind, Recharts, Leaflet |
| Backend | Next.js API Routes, Prisma 6 |
| Database | Supabase PostgreSQL (Supavisor pooler, port 6543) |
| Auth | bcryptjs + jose (JWT) + httpOnly cookie |
| AI | OpenAI-compatible (OpenCode Zen, OpenRouter, etc.) |
| Integration | SAPA public API (api-splp.layanan.go.id) |

## Fitur Utama

| Fitur | Status | Endpoint |
|-------|:------:|----------|
| Dashboard utama | ✅ | `/dashboard` |
| AI Smart Query | ✅ | `POST /api/query` |
| Analitik SAPA | ✅ | `/dashboard/analytics` |
| Peta GIS | ✅ | `/dashboard/gis` |
| **Laporan AI (Auth)** | ✅ | `/dashboard/laporan` |
| Early Warning System | 🚧 **belum fungsional** | `/api/ews` |
| Admin Login | ✅ | `/login` |
| Health Check | ✅ | `/api/health` |

> **Catatan status EWS (terverifikasi):** endpoint dan panel UI sudah ada, tetapi
> **belum ada satu pun kode yang membuat `EwsAlert`**. Rantai datanya putus:
> `EwsAlert` → butuh `Indicator` → butuh `Dataset`, sedangkan `Dataset` tidak
> pernah terisi karena seluruh data diambil langsung dari SAPA tanpa disimpan.
> Akibatnya panel EWS akan selalu menampilkan "Semua indikator dalam batas
> normal". Menyalakannya butuh R1 (data warehouse SAPA) lebih dulu — lihat
> `LAPORAN_AUDIT_PRODUCTION_READINESS.md` §P1-10 dan roadmap R1–R2.

## Auth System

- **Protected:** `/dashboard/laporan`, `/dashboard/akun`, `/api/chat-logs`, `/api/datasets/sync`
- **Public pages:** `/dashboard`, `/dashboard/analytics`, `/dashboard/gis`
- **Akun admin:** tidak ada default. Dibuat via bootstrap terkunci (`ADMIN_BOOTSTRAP_PASSWORD`), ganti password di `/dashboard/akun`
- **Session:** JWT cookie (7 hari), httpOnly + secure

## Struktur

```
src/
├── app/
│   ├── api/
│   │   ├── auth/
│   │   │   ├── login/route.ts    # POST /api/auth/login
│   │   │   ├── logout/route.ts   # POST /api/auth/logout
│   │   │   ├── me/route.ts       # GET /api/auth/me
│   │   │   └── change-password/route.ts  # POST — ganti password sendiri
│   │   ├── chat-logs/route.ts    # GET /api/chat-logs (auth protected)
│   │   ├── query/route.ts        # POST /api/query — AI Smart Query
│   │   ├── stats/route.ts        # GET /api/stats — SAPA overview
│   │   ├── analytics/route.ts    # GET /api/analytics
│   │   ├── datasets/             # Dataset CRUD
│   │   ├── ews/route.ts          # Early Warning System
│   │   ├── geodata/route.ts      # GIS data
│   │   ├── health/route.ts       # Health check
│   │   └── setup/
│   │       └── admin/route.ts    # POST /api/setup/admin — TERKUNCI (x-setup-token)
│   ├── dashboard/
│   │   ├── layout.tsx            # Sidebar + header + EWS panel
│   │   ├── page.tsx              # Main dashboard
│   │   ├── analytics/page.tsx    # Analytics
│   │   ├── gis/page.tsx          # Peta GIS
│   │   ├── laporan/page.tsx      # Laporan AI (auth protected)
│   │   └── akun/page.tsx         # Profil, ganti password, logout (auth protected)
│   └── login/
│       ├── layout.tsx            # Minimal layout (no sidebar)
│       └── page.tsx              # Login form
├── components/
│   ├── Sidebar.tsx               # Navigation + hamburger toggle
│   ├── AiChatPanel.tsx           # AI chat interface
│   ├── AIResponseRenderer.tsx    # Render AI responses
│   ├── EwsPanel.tsx              # Early Warning panel
│   ├── SapaStats.tsx             # SAPA stats + charts
│   └── QueryBar.tsx              # Query input
├── lib/
│   ├── auth.ts                   # JWT + bcrypt helpers
│   ├── prisma.ts                 # Prisma client singleton
│   ├── sapa-client.ts            # SAPA API client (public)
│   └── db-migration.ts           # Auto-migration utility
├── proxy.ts                      # Proteksi route (Next.js 16; dulu middleware.ts)
└── services/
    ├── ai-orchestrator.ts        # AI pipeline (SAPA → LLM → DB log)
    ├── intent-detector.ts        # NLP intent classification
    ├── llm-client.ts             # OpenAI-compatible client
    ├── rag-retriever.ts          # Qdrant RAG (graceful fallback)
    └── data-sync.ts              # SPLP sync scheduler
```

## Database Schema (Prisma)

| Model | Deskripsi |
|-------|-----------|
| `Skpd` | OPD/SKPK metadata |
| `Dataset` | Dataset SAPA |
| `DatasetRecord` | Record data |
| `Indicator` | Indikator kunci |
| `ChatSession` | **AI query log** (auto-save) |
| `EwsAlert` | Early warning alerts |
| `Admin` | **Admin auth** (bcrypt password) |

## Deploy

```bash
# Push to GitHub → auto-deploy via Vercel
git add . && git commit -m "update" && git push

# Manual setup admin table (first time)
curl -X POST https://cc-acehtengah.vercel.app/api/setup/admin
```

## Environment Variables (Vercel)

| Variable | Contoh | Catatan |
|----------|--------|---------|
| `DATABASE_URL` | `postgresql://postgres.noxaotgovlbjpaufbdsm:***@aws-0-ap-northeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true&prepared_statements=false` | **Pooler** (bukan direct!) |
| `AI_BASE_URL` | `https://opencode.ai/zen/v1` | OpenAI-compatible |
| `AI_API_KEY` | `sk-...` | |
| `AI_MODEL` | `nemotron-3-ultra-free` | |
| `JWT_SECRET` | random string (min. 32 char) | **WAJIB** — app fail-closed tanpa ini. `openssl rand -base64 48` |
