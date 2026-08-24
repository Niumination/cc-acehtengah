# cc-acehtengah — SAPA Smart AI Aceh Tengah

> **Next.js 16 + Prisma 6 + LLM + RAG** — Integrasi SAPA → SPLP → SAPA Smart AI
> **Path:** `services/cc-acehtengah/`
> **Status:** 🟢 **Active — Fase 5: Theme/Accessibility + Security Hardening**
> **Deploy:** GitHub + Vercel (https://cc-acehtengah.vercel.app)
> **Last update:** Aug 23, 2026 — PR-4b: jalur impor manual DTSEN (CSV→validasi→staging→publish atomik, purge rilis lama, UI admin `/dashboard/admin/dtsen`, env DTSEN_NIK_KEY); sebelumnya PR-4a fondasi, PR-3 Laporan Eksekutif, PR Lapis 0–2
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
| **Laporan Eksekutif (Auth)** | ✅ | `/dashboard/laporan` — generator naratif deterministik (bukan lagi sekadar log viewer) + `/api/report` |
| Riwayat Query AI (Auth) | ✅ | `/api/chat-logs` (log kini di-await saat simpan — tidak hilang di serverless) |
| Early Warning System | ✅ | `/api/ews` (ditulis oleh cron warehouse) |
| **KPI Pimpinan** | ✅ | `/api/kpi` (deterministik, cache 10 mnt) |
| **Sinkronisasi Warehouse** | ✅ | `/api/cron/sync-sapa` (Vercel Cron harian) |
| **Fondasi DTSEN (role-gated)** | ✅ | `POST /api/dtsen/query` — 401/403 fail-closed + audit (data via PR-4b/4d) |
| **Impor Manual DTSEN Multi-Sumber (role-gated)** | ✅ | `/dashboard/admin/dtsen` + `POST /api/dtsen/import?format=DTSEN_CSV|STUNTING_XLSX|KOMINFO_XLSX`, `release/[id]/publish` |
| **DTSEN SPLP API Source** | ✅ | `GET /api/dtsen/source` — fetch agregat DTSEN langsung dari api-splp.layanan.go.id |
| Admin Login | ✅ | `/login` |
| Health Check | ✅ | `/api/health` |

## API Routes — DTSEN Multi-Sumber (PR-4c)

| Route | Method | Deskripsi | Auth |
|-------|--------|-----------|------|
| `/api/dtsen/source` | GET | Fetch agregat DTSEN dari api-splp.layanan.go.id | RESTRICTED_AGGR |
| `/api/dtsen/import` | POST | Import CSV/Excel ke staging (multi-format) | RESTRICTED_PERSONAL |
| `/api/dtsen/query` | POST | Query restricted (aggr + by-NIK lookup) | Sesuai scope |
| `/api/dtsen/releases` | GET | Daftar rilis (metadata saja) | RESTRICTED_PERSONAL |
| `/api/dtsen/release/[id]/publish` | POST | Publish atomik + purge rilis lama | RESTRICTED_PERSONAL |

### Import Multi-Format (`POST /api/dtsen/import?format=...`)

| Format | Source | Kolom kunci | Catatan |
|--------|--------|-------------|---------|
| `DTSEN_CSV` | `dtsen` | nik, nama, no_kk, kecamatan, desa, desil, pkh, bpnt, pbi_jk | Format standar — bansos eksplisit |
| `STUNTING_XLSX` | `dtsen-stunting` | NIK, Nama, Kec, Desa/Kel | Bansos=false, desil default 1 |
| `KOMINFO_XLSX` | `dtsen-kominfo` | NIK, NAMA, KETERANGAN DESIL, KK, DESA, KECAMATAN | Bansos=false, desil dari kolom |

**SPLP API Source:** `GET /api/dtsen/source?type=aggr&source=splp&kecamatan=&desa=&desil=` — fetch langsung dari `api-splp.layanan.go.id/dtsen-aceh-tengah/1.0/api/dtsen-aceh-tengah`

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
│   │   ├── report/route.ts       # GET /api/report — Laporan Eksekutif
│   │   ├── cron/sync-sapa/       # GET/POST — sinkronisasi warehouse harian
│   │   ├── dtsen/query/          # POST — gerbang data restricted (role + audit)
│   │   ├── dtsen/import/         # POST — impor CSV → staging (DTSEN_LOOKUP+)
│   │   ├── dtsen/releases/       # GET — daftar rilis (metadata saja)
│   │   ├── dtsen/release/[id]/   # GET detail tinjau + POST publish atomik
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
│   │   ├── laporan/page.tsx      # Laporan Eksekutif + riwayat (auth protected)
│   │   └── admin/dtsen/page.tsx  # Admin rilis DTSEN: impor, tinjau, publish
│   └── login/
│       ├── layout.tsx            # Minimal layout (no sidebar)
│       └── page.tsx              # Login form
├── components/
│   ├── Sidebar.tsx               # Navigation + hamburger toggle
│   ├── AIResponseRenderer.tsx    # Render AI responses
│   ├── ExecutiveReport.tsx       # Laporan Eksekutif (fetch /api/report, cetak)
│   ├── EwsPanel.tsx              # Early Warning panel
│   ├── KpiPanel.tsx              # KPI pimpinan (fetch /api/kpi)
│   ├── SapaStats.tsx             # SAPA stats + charts
│   └── QueryBar.tsx              # Query input
├── lib/
│   ├── auth.ts                   # JWT + bcrypt helpers
│   ├── data-gate.ts              # Gerbang multi-sumber (role+audit), murni
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
    ├── dtsen-import.ts           # Impor CSV DTSEN: validasi, masking, agregat k≥5 (murni)
    ├── warehouse-sync.ts         # Sinkronisasi snapshot SAPA → warehouse
    ├── report-generator.ts       # Laporan Eksekutif naratif (murni, tanpa LLM)
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
| `DataSource` | Registry multi-sumber + klasifikasi `sensitivity` (Lapis 3) |
| `DtsenRelease` | Rilis DTSEN append-only (STAGING→PUBLISHED→SUPERSEDED) |
| `DtsenIndividu` | Data by-name — HMAC-hash NIK + nama masked saja |
| `DtsenAgregatWilayah` | Agregat desil per kecamatan/desa (k≥5 saja) |
| `DataAccessAudit` | Audit akses data restricted (UU PDP) |
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
| `DTSEN_NIK_KEY` | random string ≥16 | Kunci HMAC NIK jalur DTSEN; tanpa ini impor menolak (409) |

### Catatan Real-World Data Handling (PR-4c+ patch)

Parser multi-sumber (`src/services/dtsen-multisource.ts`) sudah divalidasi melawan file Excel riil:

| Isu | Solusi |
|-----|--------|
| NIK numerik (Excel mengembalikan sebagai `number`, bukan string) | `normalizeNik()` mengkonversi number → string sebelum validasi |
| NIK yang sudah masked (mengandung `*`, mis. `08022**********`) | Ditolak dengan pesan: `NIK harus 16 digit angka tanpa *` |
| Kecamatan alias lokal (`"LUT TAWAR"` ≠ `"Laut Tawar"`) | `KEC_ALIAS` map + `kecLookup()` menge-resolve alias sebelum pencocokan |
| Desil range (`"6-10"`) | `normalizeDesil()` mengambil batas bawah (6) |
| Desil teks (`"Belum Ada Desl"`) | Di-set ke 1 (prioritas tertinggi) + warning |
| Desil kosong/null | Di-set ke 1 + warning |
| Baris kosong di Excel (header offset, blank rows) | Dihandle oleh frontend parser sebelum kirim JSON ke API |
