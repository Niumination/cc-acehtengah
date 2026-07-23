# CC Aceh Tengah — Production Setup Guide (No Docker)

> **Stack**: Next.js 16 + Prisma 7 + PostgreSQL + OpenAI-compatible AI + SAPA API (public)
> **No Docker Required** — All services run as cloud/managed services

---

## 📋 Prerequisites Checklist

| Service | Required? | Options | Notes |
|---|---|---|---|
| **PostgreSQL** | ✅ **YES** | Neon, Supabase, Railway, local, VPS | Database for datasets, sync history, chat logs |
| **AI Provider (OpenAI-compatible)** | ✅ **YES** | OpenRouter, Groq, Together, DeepSeek, Huancheng, OpenAI | Cloud API only — no local Ollama |
| **Qdrant (Vector DB)** | ❌ **OPTIONAL** | Qdrant Cloud, Docker, Railway | RAG gracefully disabled if not set |
| **Node.js 20+** | ✅ **YES** | Local / CI / Server | For build & runtime |

---

## 🔐 1. Environment Configuration

### Create `.env.local`
```bash
cp .env.local.production .env.local
```

### Fill in these **REQUIRED** values:

```env
# ─── Database (REQUIRED) ───
# Get from: Neon (neon.tech), Supabase, Railway, or your PostgreSQL host
DATABASE_URL="postgresql://user:password@host:5432/cc_acehtengah?schema=public"

# ─── AI Provider (REQUIRED) ───
# Choose ONE provider below and set the 3 values:

## Option A: OpenCode Zen (tested, has free models)
AI_BASE_URL="https://opencode.ai/zen/v1"
AI_API_KEY="sk-..."
AI_MODEL="deepseek-v4-flash-free"  # free models: deepseek-v4-flash-free, mimo-v2.5-free, nemotron-3-ultra-free, north-mini-code-free, laguna-s-2.1-free

## Option B: OpenRouter (Recommended - 100+ models, free tier)
# AI_BASE_URL="https://openrouter.ai/api/v1"
# AI_API_KEY="sk-or-..."
# AI_MODEL="gpt-4o-mini"  # or: anthropic/claude-3.5-sonnet, deepseek/deepseek-chat, meta-llama/llama-3.1-70b

## Option C: Groq (Free, fast, open models)
# AI_BASE_URL="https://api.groq.com/openai/v1"
# AI_API_KEY="***"
# AI_MODEL="llama-3.1-70b-versatile"

## Option D: Together AI
# AI_BASE_URL="https://api.together.xyz/v1"
# AI_API_KEY="tgp_xxxxxxxxxxxxx"
# AI_MODEL="meta-llama/Meta-Llama-3.1-70B-Instruct-Turbo"

## Option E: DeepSeek
# AI_BASE_URL="https://api.deepseek.com/v1"
# AI_API_KEY="***"
# AI_MODEL="deepseek-chat"

## Option F: Huancheng (Your OpenCode provider)
# AI_BASE_URL="https://api.hcnsec.cn/v1"
# AI_API_KEY="***"
# AI_MODEL="DeepSeek-V4-Pro"

## Option G: OpenAI Direct
# AI_BASE_URL="https://api.openai.com/v1"
# AI_API_KEY="***"
# AI_MODEL="gpt-4o-mini"

# ─── Vector DB - OPTIONAL ───
# Uncomment only if you have Qdrant running
# QDRANT_URL="http://localhost:6333"
# Or Qdrant Cloud: QDRANT_URL="https://xxx.qdrant.tech:6333"
# QDRANT_API_KEY="your-api-key"  # If using Qdrant Cloud

# ─── Auth (Future) ───
NEXTAUTH_SECRET="generate-with: openssl rand -base64 32"
NEXTAUTH_URL="https://your-domain.com"  # Or http://localhost:3000 for dev

# ─── Mode ───
USE_MOCK_DATA=false  # true = demo mode, false = production
```

---

## 🐘 2. PostgreSQL Setup

### Option A: Neon (Free Tier, Serverless) — **Recommended**
```bash
# 1. Go to https://neon.tech → Create project
# 2. Copy connection string
# 3. Format: postgresql://user:pass@ep-xxx.us-east-1.aws.neon.tech/dbname?sslmode=require
```

### Option B: Supabase
```bash
# 1. Go to https://supabase.com → New project
# 2. Settings → Database → Connection string (URI)
# 3. Format: postgresql://postgres:pass@db.xxx.supabase.co:5432/postgres
```

### Option C: Railway
```bash
# 1. railway.app → New Project → PostgreSQL
# 2. Copy DATABASE_URL from variables
```

### Option D: Local / VPS
```bash
# Install PostgreSQL 15+
# Create database:
createdb cc_acehtengah
# DATABASE_URL=postgresql://postgres:password@localhost:5432/cc_acehtengah
```

---

## 🤖 3. AI Provider Setup

### OpenCode Zen (Current Default)
1. Go to https://opencode.ai/auth → Sign in
2. Copy your API key
3. Use base URL `https://opencode.ai/zen/v1`
4. Free models work without billing for basic usage:
   - `deepseek-v4-flash-free`
   - `mimo-v2.5-free`
   - `nemotron-3-ultra-free`
   - `north-mini-code-free`
   - `laguna-s-2.1-free`

### OpenRouter (Easiest - Multiple Models)
1. Go to https://openrouter.ai → Sign up
2. Settings → Keys → Create Key
3. Add credits ($5 = months of gpt-4o-mini usage)
4. Model recommendations:
   - **Cheap & Smart**: `gpt-4o-mini`, `deepseek/deepseek-chat`
   - **Best Quality**: `anthropic/claude-3.5-sonnet`, `openai/gpt-4o`
   - **Free Tier**: `meta-llama/llama-3.1-70b-instruct:free`

### Groq (Free, Very Fast)
1. Go to https://console.groq.com → API Keys
2. Model: `llama-3.1-70b-versatile` (best), `mixtral-8x7b-32768`
3. Rate limits generous for dev

### Huancheng (Your Existing)
- Already configured in OpenCode
- Same credentials work here

---

## 🔍 4. Qdrant Setup (Optional - Only if RAG Needed)

### Option A: Qdrant Cloud (Free 1GB)
1. Go to https://cloud.qdrant.io → Create cluster
2. Copy URL + API Key
3. Set in `.env.local`:
   ```env
   QDRANT_URL="https://xxx.qdrant.tech:6333"
   QDRANT_API_KEY="your-api-key"
   ```

### Option B: Local (Requires Docker)
```bash
docker run -d -p 6333:6333 qdrant/qdrant
# QDRANT_URL="http://localhost:6333"
```

### Option C: Skip (Default)
- Comment out `QDRANT_URL`
- RAG disabled, AI works without regulatory context
- Can enable later without code changes

---

## 🚀 5. Deploy Steps

### Local Development
```bash
cd /Users/zaryu/Desktop/Niumination/projects/cc-acehtengah

# 1. Install deps
npm install

# 2. Setup database
npx prisma db push

# 3. Verify SAPA connection
curl https://api-splp.layanan.go.id/sapa/1.0/api/daftar_data | jq '.api_status'

# 4. Start dev server
npm run dev
# Open http://localhost:3000/dashboard

# 5. Test AI query
curl -X POST http://localhost:3000/api/query \
  -H "Content-Type: application/json" \
  -d '{"query": "harga beras aceh tengah"}'
```

### Production Build
```bash
# Build
npm run build

# Start production server
npm start
# Runs on port 3000
```

### Deploy to Vercel (Easiest)
```bash
# 1. Push to GitHub
git add . && git commit -m "Production ready" && git push

# 2. Vercel → Import Project
# 3. Add Environment Variables in Vercel dashboard (copy from .env.local)
# 4. Deploy

# Note: Vercel needs PostgreSQL external (Neon/Supabase)
# Prisma works on Vercel with `prisma generate` in build
```

### Deploy to Railway/Render/Fly.io
```bash
# These support long-running processes + PostgreSQL
# 1. Connect GitHub repo
# 2. Set env vars
# 3. Add PostgreSQL addon
# 4. Deploy
```

---

## 🧪 6. Verification Checklist

After deploy, test these endpoints:

```bash
# 1. Health check (shows real SAPA status)
curl https://your-domain.com/api/health

# Expected: {"status":"healthy","services":{"sapa":"ok","ai":"ok","db":"ok","qdrant":"skip"}}

# 2. AI Query (real SAPA + AI)
curl -X POST https://your-domain.com/api/query \
  -H "Content-Type: application/json" \
  -d '{"query": "berapa harga cabe di takengon"}'

# Expected: JSON with narasi, visualisasi (table/chart), rekomendasi

# 3. Datasets API (requires DB)
curl https://your-domain.com/api/datasets

# Expected: Array of datasets from DB

# 4. Dashboard UI
# Open https://your-domain.com/dashboard
# - Sidebar navigation
# - Metric cards
# - Query input with suggestions
# - Response renderer (table/chart/metric)
```

---

## 🔄 7. Data Sync (Background Job)

Sync SAPA data to PostgreSQL for history/trends:

```bash
# Manual sync all datasets
curl -X POST https://your-domain.com/api/datasets/sync \
  -H "Content-Type: application/json" \
  -d '{"all": true}'

# Sync specific dataset
curl -X POST https://your-domain.com/api/datasets/sync \
  -H "Content-Type: application/json" \
  -d '{"slug": "data-sapa"}'
```

**Automate with cron** (Vercel Cron, Railway Cron, or external):
```yaml
# vercel.json
{
  "crons": [
    {
      "path": "/api/datasets/sync",
      "schedule": "0 2 * * *"  # Daily 2 AM
    }
  ]
}
```

---

## 📊 8. Monitoring & Logs

### Health Indicators
| Endpoint | Healthy If |
|---|---|
| `/api/health` | `status: "healthy"`, all services `ok` or `skip` |
| SAPA | `services.sapa: "ok"` (905+ records) |
| AI | `services.ai: "ok"` (provider responds) |
| DB | `services.db: "ok"` (Prisma connected) |
| Qdrant | `services.qdrant: "ok"` or `"skip"` |

### Key Logs to Watch
```bash
# AI query errors
grep "AI.*error" logs/

# SAPA fetch failures
grep "SAPA API error" logs/

# Prisma connection issues
grep "Prisma.*connect" logs/
```

---

## 🎯 9. Cost Estimation (Monthly)

| Service | Free Tier | Paid Estimate |
|---|---|---|
| **PostgreSQL (Neon)** | 0.5 GB, 100 hrs compute | $19/mo (Pro) |
| **AI (OpenRouter gpt-4o-mini)** | N/A | ~$0.50-2/mo (1000 queries) |
| **AI (Groq)** | Free (rate limited) | $0 |
| **Qdrant Cloud** | 1 GB free | $0-10/mo |
| **Vercel** | Hobby free | $20/mo (Pro) |
| **Total (Minimal)** | **$0** (Groq + Neon free + Vercel free) | **~$20-40/mo** |

---

## 🚨 10. Troubleshooting

### "AI_API_KEY tidak dikonfigurasi"
```bash
# Check env loaded
echo $AI_API_KEY
# Restart server after .env.local change
```

### "SAPA API error"
```bash
# Test directly
curl https://api-splp.layanan.go.id/sapa/1.0/api/daftar_data
# Should return api_status: 1
```

### "Prisma connection failed"
```bash
# Check DATABASE_URL format
# Must include ?schema=public for some providers
# Test: npx prisma db pull
```

### "Qdrant connection refused"
```bash
# Qdrant is optional - just don't set QDRANT_URL
# Or verify Qdrant Cloud URL + API key
```

### Build fails on Vercel
```bash
# Add to package.json scripts:
"postinstall": "prisma generate"
# Vercel runs this automatically
```

---

## 📁 11. Project Structure Reference

```
cc-acehtengah/
├── .env.local                    # YOUR PRODUCTION CONFIG (gitignored)
├── .env.local.production         # Template
├── prisma/
│   └── schema.prisma             # DB schema (SKPD, Dataset, Records, Indicators, Chat, EWS)
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── health/route.ts   # Health check (SAPA, AI, DB, Qdrant)
│   │   │   ├── query/route.ts    # AI query endpoint (mock or real)
│   │   │   ├── datasets/         # Dataset CRUD + sync
│   │   │   └── ews/route.ts      # Early Warning System
│   │   └── dashboard/            # Dashboard UI (React client)
│   ├── components/
│   │   ├── QueryInput.tsx        # Search input + suggestions
│   │   ├── HybridRenderer.tsx    # Renders table/chart/metric/none
│   │   ├── MetricCard.tsx        # Stat cards
│   │   ├── Sidebar.tsx           # Navigation
│   │   └── charts/TrendChart.tsx # Recharts wrapper
│   ├── lib/
│   │   ├── sapa-client.ts        # SAPA API client (PUBLIC, no auth)
│   │   ├── splp-bridge.ts        # Legacy SPLP (not used)
│   │   ├── prisma.ts             # Prisma singleton
│   │   ├── mock-data.ts          # Demo data from cc.acehtengahkab.go.id
│   │   └── error-handler.ts      # API error wrapper
│   ├── services/
│   │   ├── ai-orchestrator.ts    # Main AI pipeline (SAPA → LLM)
│   │   ├── llm-client.ts         # OpenAI-compatible client
│   │   ├── rag-retriever.ts      # Qdrant RAG (graceful fallback)
│   │   ├── intent-detector.ts    # Keyword → OPD/intent mapping
│   │   └── data-sync.ts          # SAPA → PostgreSQL sync
│   └── types/index.ts            # Shared TypeScript types
└── package.json
```

---

## ✅ Quick Start Summary

```bash
# 1. Get PostgreSQL (Neon free)
# 2. Get AI API key (OpenRouter $5 credit)
# 3. Copy template
cp .env.local.production .env.local

# 4. Edit .env.local with your values
#    DATABASE_URL, AI_API_KEY, AI_BASE_URL, AI_MODEL

# 5. Setup DB
npx prisma db push

# 6. Test
npm run dev
curl -X POST localhost:3000/api/query -d '{"query":"harga cabe"}'

# 7. Deploy to Vercel/Railway
#    Add same env vars in dashboard
```

---

**Ready for Diskominfo Aceh Tengah production deployment!** 🚀