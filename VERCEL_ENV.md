# CC Aceh Tengah — Vercel Environment Variables
# Copy-paste ini ke: Vercel Dashboard → Project → Settings → Environment Variables

# ─── Database (Supabase — Pooler Transaction Mode) ───
# ⚠️ PENTING: Pakai pooler, bukan direct! Port 6543, bukan 5432
# ⚠️ PENTING: Username = postgres.noxaotgovlbjpaufbdsm (bukan postgres)
DATABASE_URL=postgresql://postgres.noxaotgovlbjpaufbdsm:***@aws-0-ap-northeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true&prepared_statements=false

# ─── AI Provider (OpenCode Zen - FREE models) ───
AI_BASE_URL=https://opencode.ai/zen/v1
AI_API_KEY=«redacted:sk-…»
AI_MODEL=nemotron-3-ultra-free

# ─── Auth (WAJIB — tidak ada fallback, app fail-closed tanpa ini) ───
# Generate: openssl rand -base64 48    (minimal 32 karakter)
JWT_SECRET=«generate-sendiri-jangan-pakai-contoh»

# ─── Bootstrap admin (HANYA saat setup awal, matikan setelahnya) ───
SETUP_ENABLED=false
# SETUP_TOKEN=«openssl rand -hex 32»
# ADMIN_BOOTSTRAP_USERNAME=admin
# ADMIN_BOOTSTRAP_PASSWORD=«minimal 12 karakter»

# ─── URL publik (Open Graph, robots.txt, sitemap.xml) ───
NEXT_PUBLIC_SITE_URL=https://cc-acehtengah.vercel.app

# ─── Penyimpanan bersama (opsional, sangat disarankan) ───
# Tanpa ini rate limit & cache hanya per-instance serverless.
# UPSTASH_REDIS_REST_URL=https://xxx.upstash.io
# UPSTASH_REDIS_REST_TOKEN=«token»

# ─── Retensi log AI (job cron harian, lihat vercel.json) ───
CHAT_LOG_RETENTION_DAYS=90
CRON_SECRET=«openssl rand -hex 32»

# ─── Mode ───
USE_MOCK_DATA=false

# ============================================================
# CATATAN:
# - DATABASE_URL HARUS pakai pooler (aws-0-ap-northeast-1.pooler.supabase.com:6543)
# - JANGAN pakai direct connection (db.xxx.supabase.co:5432) — IPv6 only!
# - prepared_statements=false WAJIB untuk Supavisor transaction mode
# - JWT_SECRET WAJIB. Tanpa itu semua endpoint auth menolak request.
# - Tidak ada kredensial default. Bootstrap admin pertama:
#     SETUP_ENABLED=true + SETUP_TOKEN (min 32 char) + ADMIN_BOOTSTRAP_PASSWORD (min 12 char)
#     curl -X POST .../api/setup/admin -H "x-setup-token: $SETUP_TOKEN"
#     lalu SET SETUP_ENABLED=false dan hapus SETUP_TOKEN
# ============================================================
