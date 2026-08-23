# cc-acehtengah — SAPA Smart AI Aceh Tengah

> **Next.js 16 + Prisma 6 + LLM + RAG** — Integrasi SAPA → SPLP → SAPA Smart AI
> **Path:** `services/cc-acehtengah/`
> **Status:** 🟢 **Active — Fase 5: Theme/Accessibility + Security Hardening**
> **Deploy:** GitHub + Vercel (https://cc-acehtengah.vercel.app)
> **Last update:** Aug 23, 2026 — PR Lapis 0 (keamanan fail-closed), Lapis 1 (retrieval v2 + meta-query), Lapis 2 (warehouse SAPA + KPI pimpinan + EWS aktif + tren/perbandingan OPD deterministik); sebelumnya: rebrand KOMANDO AT→SAPA Smart AI, model Ox Alpha (`x-preview-f-free`)
> **Backlog priority:** P2

> **✅ EWS SUDAH FUNGSIONAL (PR Lapis 2):**
> Warehouse SAPA kini diisi lewat `src/services/warehouse-sync.ts` — dipicu
> Vercel Cron harian `/api/cron/sync-sapa` (22:00 UTC, butuh env `CRON_SECRET`)
> atau manual oleh admin. Mesin `src/services/ews-engine.ts` membandingkan
> snapshot terakhir vs sebelumnya dan menulis `EwsAlert` (INFO/WARNING/CRITICAL).
> **Wajib sekali setelah deploy:** `POST /api/setup` dengan header `x-setup-token`
> untuk membuat tabel warehouse; tanpa itu cron menjawab 409.

> **🤖 AI Source-of-Truth SAPA:** `docs/ai/RENCANA_AI_SOURCE_OF_TRUTH.md` (kontrak 5 fase) · `docs/ai/AGENT_BRIEF_PR_AI_SOT.md` (brief + matriks R1–R12) · `docs/ai/AUDIT_AI_SISTEM.md` + `AUDIT_AI_794b80a.md` (audit HEAD vs baseline `794b80a`). Fase A–E selesai; **PR Lapis 0+1** (keamanan fail-closed + retrieval v2/meta-query) dan **PR Lapis 2** (warehouse, KPI, EWS, tren/perbandingan deterministik) sudah di branch ini.

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
| Early Warning System | ✅ | `/api/ews` (ditulis oleh cron warehouse) |
| **KPI Pimpinan** | ✅ | `/api/kpi` (deterministik, cache 10 mnt) |
| **Sinkronisasi Warehouse** | ✅ | `/api/cron/sync-sapa` (Vercel Cron harian) |
| Admin Login | ✅ | `/login` |
| Health Check | ✅ | `/api/health` |

## Auth System

- **Protected pages:** `/dashboard/laporan`, `/api/chat-logs`
- **Public pages:** `/dashboard`, `/dashboard/analytics`, `/dashboard/gis`
- **Akun admin:** tidak ada default. Dibuat via bootstrap terkunci: `POST /api/setup/admin` kini wajib header `x-setup-token` cocok dengan env `ADMIN_SETUP_TOKEN` (tanpa env → 403). Seed memakai `ADMIN_BOOTSTRAP_PASSWORD` atau password acak sekali-tampil; ganti password di `/dashboard/akun`. `JWT_SECRET` wajib (fail-closed, tanpa fallback)
- **Session:** JWT cookie (7 hari), httpOnly + secure

## Struktur

```
src/
├── app/
│   ├── api/
│   │   ├── auth/
│   │   │   ├── login/route.ts    # POST /api/auth/login
│   │   │   ├── logout/route.ts   # POST /api/auth/logout
│   │   │   └── me/route.ts       # GET /api/auth/me
│   │   ├── chat-logs/route.ts    # GET /api/chat-logs (auth protected)
│   │   ├── query/route.ts        # POST /api/query — AI Smart Query
│   │   ├── stats/route.ts        # GET /api/stats — SAPA overview
│   │   ├── analytics/route.ts    # GET /api/analytics
│   │   ├── datasets/             # Dataset CRUD
│   │   ├── ews/route.ts          # Early Warning System
│   │   ├── kpi/route.ts          # GET /api/kpi — KPI pimpinan
│   │   ├── cron/sync-sapa/       # GET/POST — sinkronisasi warehouse harian
│   │   ├── geodata/route.ts      # GIS data
│   │   ├── health/route.ts       # Health check
│   │   └── setup/
│   │       ├── route.ts          # POST /api/setup — migrasi tabel (terkunci)
│   │       └── admin/route.ts    # POST /api/setup/admin — bootstrap admin (terkunci)
│   ├── dashboard/
│   │   ├── layout.tsx            # Sidebar + header
│   │   ├── page.tsx              # Main dashboard + KPI panel + EWS panel
│   │   ├── analytics/page.tsx    # Analytics
│   │   ├── gis/page.tsx          # Peta GIS
│   │   └── laporan/page.tsx      # Laporan AI (auth protected)
│   └── login/
│       ├── layout.tsx            # Minimal layout (no sidebar)
│       └── page.tsx              # Login form
├── components/
│   ├── Sidebar.tsx               # Navigation + hamburger toggle
│   ├── AIResponseRenderer.tsx    # Render AI responses
│   ├── EwsPanel.tsx              # Early Warning panel
│   ├── KpiPanel.tsx              # KPI pimpinan (fetch /api/kpi)
│   ├── SapaStats.tsx             # SAPA stats + charts
│   └── QueryBar.tsx              # Query input
├── lib/
│   ├── auth.ts                   # JWT + bcrypt helpers
│   ├── prisma.ts                 # Prisma client singleton
│   ├── sapa-client.ts            # SAPA API client (public)
│   └── db-migration.ts           # Auto-migration utility
├── middleware.ts                  # Protect /dashboard/laporan + /api/chat-logs
└── services/
    ├── ai-orchestrator.ts        # AI pipeline (SAPA → LLM → DB log)
    ├── intent-detector.ts        # NLP intent classification
    ├── llm-client.ts             # OpenAI-compatible client
    ├── rag-retriever.ts          # Qdrant RAG (graceful fallback)
    ├── data-sync.ts              # SPLP sync scheduler
    ├── warehouse-sync.ts         # Sinkronisasi snapshot SAPA → warehouse
    ├── ews-engine.ts             # Evaluasi perubahan → EwsAlert
    ├── trend-analysis.ts         # Tren & perbandingan OPD deterministik
    ├── kpi.ts                    # KPI pimpinan terkurasi
    ├── grounding.ts              # Validasi narasi vs evidence
    └── meta-query.ts             # Statistik portal deterministik
```

## Database Schema (Prisma)

| Model | Deskripsi |
|-------|-----------|
| `Skpd` | OPD/SKPK metadata |
| `Dataset` | Dataset SAPA |
| `DatasetRecord` | Record data |
| `Indicator` | Indikator kunci (unik per dataset+nama+satuan) |
| `SapaSnapshot` | Snapshot publikasi SAPA (checksum, append-only) |
| `SapaIndicatorValue` | Nilai indikator per tahun per snapshot (deret histori) |
| `ChatSession` | **AI query log** (auto-save) |
| `EwsAlert` | Early warning alerts |
| `Admin` | **Admin auth** (bcrypt password) |

## Deploy

```bash
# Push to GitHub → auto-deploy via Vercel
git add . && git commit -m "update" && git push

# One-time setelah deploy (butuh ADMIN_SETUP_TOKEN):
# 1) buat tabel (ChatSession + warehouse)
curl -X POST https://cc-acehtengah.vercel.app/api/setup \
  -H "x-setup-token: $ADMIN_SETUP_TOKEN"
# 2) bootstrap admin pertama
curl -X POST https://cc-acehtengah.vercel.app/api/setup/admin \
  -H "x-setup-token: $ADMIN_SETUP_TOKEN"
# 3) isi warehouse pertama kali (atau tunggu cron harian 22:00 UTC)
curl -X POST https://cc-acehtengah.vercel.app/api/cron/sync-sapa \
  -H "x-setup-token: $ADMIN_SETUP_TOKEN"
```

## Environment Variables (Vercel)

| Variable | Contoh | Catatan |
|----------|--------|---------|
| `DATABASE_URL` | `postgresql://postgres.noxaotgovlbjpaufbdsm:***@aws-0-ap-northeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true&prepared_statements=false` | **Pooler** (bukan direct!) |
| `AI_BASE_URL` | `https://opencode.ai/zen/v1` | OpenAI-compatible |
| `AI_API_KEY` | `sk-...` | |
| `AI_MODEL` | `x-preview-f-free` | Dipakai PERSIS dari env; default `x-preview-f-free` jika kosong (tidak ada pemetaan tersembunyi) |
| `JWT_SECRET` | random string | **Wajib** (fail-closed; tanpa ini login admin nonaktif) |
| `ADMIN_SETUP_TOKEN` | random string ≥16 | Mengunci `/api/setup*` (403 tanpa token) |
| `CRON_SECRET` | random string ≥16 | Otorisasi `/api/cron/sync-sapa` (`Authorization: Bearer …`) |
