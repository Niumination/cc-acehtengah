# ============================================================
# CC Aceh Tengah — Vercel Environment Variables
# Copy-paste ini ke: Vercel Dashboard → Project → Settings → Environment Variables
# ============================================================

# ─── Database (Supabase) ───
DATABASE_URL=postgresql://postgres:Met%40l082365469684@db.noxaotgovlbjpaufbdsm.supabase.co:5432/postgres?pgbouncer=true&connection_limit=1

# ─── AI Provider (OpenCode Zen - FREE models) ───
AI_BASE_URL=https://opencode.ai/zen/v1
AI_API_KEY=sk-cFkXinygDJrg01dkSzGi9KsWNY59AeBUNqx7GLs5zEtaP1afh9u17i5K37tCyvrw
AI_MODEL=deepseek-v4-flash-free

# ─── Auth ───
NEXTAUTH_SECRET=nI7vP3kQz2mR8wX4bJ6tY0cA5dF9gH1lE3nM7oS2uW6x

# ─── Mode ───
USE_MOCK_DATA=false

# ============================================================
# CATATAN:
# - Semua variabel di atas di-set ke scope "Production, Preview, Development"
# - Qdrant tidak diisi → RAG disabled, AI tetap jalan
# - AI_MODEL bisa diganti kapan saja tanpa rebuild
# ============================================================
