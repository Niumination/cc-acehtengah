# CC Aceh Tengah — Production Setup Guide

> **Stack**: Next.js 16 + Prisma 6 + Supabase PostgreSQL + AI + SAPA API
> **No Docker Required** — All services run as cloud/managed services
> **Live**: https://cc-acehtengah.vercel.app

---

## 📋 Prerequisites

| Service | Required? | Provider |
|---------|:---------:|----------|
| **PostgreSQL** | ✅ YES | Supabase (free tier) |
| **AI Provider** | ✅ YES | OpenCode Zen / OpenRouter / Groq |
| **Qdrant (Vector DB)** | ❌ OPTIONAL | Qdrant Cloud (RAG gracefully disabled) |

---

## 🔐 1. Environment Variables

### Supabase Database URL (CRITICAL)

**⚠️ Free tier Supabase = IPv6 only untuk direct connection!**

Vercel serverless = IPv4-only. **MUST use Supavisor pooler:**

```env
# ✅ CORRECT — Pooler Transaction Mode
DATABASE_URL=postgresql://postgres.noxaotgovlbjpaufbdsm:PASSWORD@aws-0-ap-northeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true&prepared_statements=false

# ❌ WRONG — Direct connection (IPv6 only, Vercel can't reach)
# DATABASE_URL=postgresql://postgres:PASSWORD@db.noxaotgovlbjpaufbdsm.supabase.co:5432/postgres
```

| Field | Pooler Value | Direct Value (❌) |
|-------|-------------|-------------------|
| Host | `aws-0-ap-northeast-1.pooler.supabase.com` | `db.noxaotgovlbjpaufbdsm.supabase.co` |
| Port | `6543` | `5432` |
| Username | `postgres.noxaotgovlbjpaufbdsm` | `postgres` |
| Params | `?pgbouncer=true&prepared_statements=false` | (none) |

### AI Provider

```env
AI_BASE_URL=https://opencode.ai/zen/v1
AI_API_KEY=sk-...
AI_MODEL=deepseek-v4-flash-free
```

---

## 🐘 2. Database Setup

### Supabase SQL Migrations

Run these in **Supabase Dashboard → SQL Editor**:

**Migration 1: ChatSession** (`supabase/migrations/001_create_chat_sessions.sql`)
```sql
CREATE TABLE IF NOT EXISTS "ChatSession" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
    "userId" TEXT,
    "query" TEXT NOT NULL,
    "intent" TEXT,
    "aiResponse" JSONB,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "ChatSession_createdAt_idx" ON "ChatSession"("createdAt" DESC);
CREATE INDEX IF NOT EXISTS "ChatSession_intent_idx" ON "ChatSession"("intent");
```

**Migration 2: Admin** (`supabase/migrations/002_create_admin_table.sql`)
```sql
DO $$ BEGIN
  CREATE TYPE "AdminRole" AS ENUM ('ADMIN', 'SUPERADMIN');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS "Admin" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
    "username" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "nama" TEXT NOT NULL,
    "role" "AdminRole" NOT NULL DEFAULT 'ADMIN',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX IF NOT EXISTS "Admin_username_key" ON "Admin"("username");
```

### Auto-setup (alternatif — endpoint terkunci)

Endpoint `/api/setup` dan `/api/setup/admin` **tidak lagi publik**.
Lihat bagian 4 untuk prosedur bootstrap yang aman.

---

## 🤖 3. AI Provider Setup

| Provider | Free? | Model | Base URL |
|----------|:-----:|-------|----------|
| **OpenCode Zen** | ✅ | `deepseek-v4-flash-free` | `https://opencode.ai/zen/v1` |
| OpenRouter | 💰 | `gpt-4o-mini` | `https://openrouter.ai/api/v1` |
| Groq | ✅ | `llama-3.1-70b-versatile` | `https://api.groq.com/openai/v1` |

---

## 🔐 4. Auth & Bootstrap Admin

### Variabel wajib

| Env | Wajib | Keterangan |
|-----|:-----:|------------|
| `JWT_SECRET` | ✅ **YA** | Minimal 32 karakter. **Tidak ada fallback** — endpoint auth akan menolak semua request bila kosong. Generate: `openssl rand -base64 48` |
| `SETUP_ENABLED` | hanya saat bootstrap | `true` untuk membuka `/api/setup*`, kembalikan ke `false` setelah selesai |
| `SETUP_TOKEN` | hanya saat bootstrap | Minimal 32 karakter. Dikirim sebagai header `x-setup-token` |
| `ADMIN_BOOTSTRAP_USERNAME` | opsional | Default `admin` |
| `ADMIN_BOOTSTRAP_PASSWORD` | hanya saat bootstrap | Minimal 12 karakter |

> Versi lama dokumen ini menyebut `JWT_SECRET` "auto-generated if not set".
> **Itu keliru** — dulu kode memakai secret yang di-hardcode di repositori, sehingga
> siapa pun bisa memalsukan sesi admin. Sekarang secret wajib dan tidak punya default.

### Cara kerja

1. Admin masuk di `/login` → cookie JWT httpOnly (7 hari)
2. `src/proxy.ts` melindungi `/dashboard/laporan`, `/dashboard/akun`, `/api/chat-logs`, `/api/datasets/sync`
3. Setiap route sensitif **memverifikasi ulang** sesi & peran sendiri (defense in depth)
4. Login dibatasi 10 percobaan/IP dan 5 percobaan/username per 10 menit
5. Ganti password di `/dashboard/akun`; logout membuang cookie

### Bootstrap akun pertama (sekali saja)

```bash
# 1. Set di Vercel (atau .env.local):
#    SETUP_ENABLED=true
#    SETUP_TOKEN=$(openssl rand -hex 32)
#    ADMIN_BOOTSTRAP_PASSWORD='PasswordKuatMinimal12'

# 2. Jalankan (endpoint membalas 404 bila token/flag salah)
curl -X POST https://cc-acehtengah.vercel.app/api/setup \
  -H "x-setup-token: $SETUP_TOKEN"
curl -X POST https://cc-acehtengah.vercel.app/api/setup/admin \
  -H "x-setup-token: $SETUP_TOKEN"

# 3. WAJIB: matikan kembali & hapus token
#    SETUP_ENABLED=false ; hapus SETUP_TOKEN & ADMIN_BOOTSTRAP_PASSWORD
```

**Tidak ada kredensial default.** Akun `admin/admin123` beserta hash bcrypt-nya
sudah dihapus dari repositori.

### File terkait

| File | Fungsi |
|------|--------|
| `src/lib/auth.ts` | JWT + bcrypt, validasi `JWT_SECRET` (fail closed) |
| `src/lib/rate-limit.ts` | Rate limiter in-memory (best effort, lihat catatan di file) |
| `src/lib/setup-guard.ts` | Kunci endpoint `/api/setup*` |
| `src/proxy.ts` | Proteksi route (Next.js 16 — menggantikan `middleware.ts`) |
| `src/app/api/auth/login/route.ts` | Login + rate limit |
| `src/app/api/auth/change-password/route.ts` | Ganti password |
| `src/app/dashboard/akun/page.tsx` | Halaman profil / ganti password / logout |

---

## 🚀 5. Deploy

### Vercel (Recommended)

```bash
# Push to GitHub → auto-deploy
git add . && git commit -m "update" && git push

# Bootstrap pertama kali — lihat bagian 4 (butuh SETUP_ENABLED + x-setup-token)
```

### Environment Variables in Vercel

1. Go to Vercel Dashboard → cc-acehtengah → Settings → Environment Variables
2. Set `DATABASE_URL` (pooler format, see above)
3. Set `AI_BASE_URL`, `AI_API_KEY`, `AI_MODEL`
4. Set `JWT_SECRET` (**wajib**, min. 32 karakter)
5. Redeploy

---

## 📊 6. Verification

```bash
# Health check
curl https://cc-acehtengah.vercel.app/api/health

# AI Query
curl -X POST https://cc-acehtengah.vercel.app/api/query \
  -H "Content-Type: application/json" \
  -d '{"query": "berapa jumlah OPD aceh tengah"}'

# Chat logs (requires auth)
curl https://cc-acehtengah.vercel.app/api/chat-logs

# Login test (pakai kredensial Anda sendiri)
curl -X POST https://cc-acehtengah.vercel.app/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"PASSWORD_ANDA"}'
```

---

## 🚨 Troubleshooting

### "Can't reach database server"
- **Cause:** Wrong connection string (direct instead of pooler)
- **Fix:** Use pooler host `aws-0-ap-northeast-1.pooler.supabase.com:6543`

### "Authentication failed"
- **Cause:** Wrong username or password
- **Fix:** Username must be `postgres.noxaotgovlbjpaufbdsm` (not `postgres`)

### "prepared statement already exists"
- **Cause:** Missing `prepared_statements=false`
- **Fix:** Add `?pgbouncer=true&prepared_statements=false` to DATABASE_URL

### "useSearchParams() should be wrapped in Suspense"
- **Cause:** Next.js 16 requires Suspense boundary
- **Fix:** Wrap component in `<Suspense>` (already done in login page)

---

## 📁 Project Structure

```
cc-acehtengah/
├── prisma/schema.prisma          # DB schema (Skpd, Dataset, ChatSession, Admin, EWS)
├── src/
│   ├── app/
│   │   ├── api/auth/             # Auth endpoints
│   │   ├── api/chat-logs/        # AI query logs
│   │   ├── api/query/            # AI Smart Query
│   │   ├── api/stats/            # SAPA overview
│   │   ├── dashboard/            # Dashboard UI
│   │   └── login/                # Login page
│   ├── components/               # UI components
│   ├── lib/                      # Auth, Prisma, SAPA client
│   ├── proxy.ts                   # Route protection (Next.js 16)
│   └── services/                 # AI pipeline
├── supabase/migrations/          # SQL migrations
├── AGENTS.md                     # Project docs
├── VERCEL_ENV.md                 # Env variables reference
└── PRODUCTION_SETUP.md           # This file
```

---

**Ready for Diskominfo Aceh Tengah production!** 🚀
