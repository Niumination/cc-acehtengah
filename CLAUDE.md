@AGENTS.md

# CLAUDE.md — Project Context for cc-acehtengah

## Quick Reference
- **Framework:** Next.js 16 (App Router) + TypeScript
- **Database:** Supabase PostgreSQL via Prisma 6
- **Auth:** bcryptjs + jose (JWT cookie), middleware-protected routes
- **AI:** OpenAI-compatible API (not local Ollama)
- **Data Source:** SAPA public API (api-splp.layanan.go.id)

## Build Commands
```bash
npm run dev          # Dev server (port 3000)
npm run build        # Production build
npx prisma generate  # Regenerate Prisma client
npx prisma db push   # Push schema to DB
```

## Key Conventions
- Dark forest theme: `#0F2A1E`, `#1B4332`, `#2D6A4F`
- Light background: `#F5F3EC`, `#E9E6DA`
- Gold accent: `#D4A853`, `#D9C284`
- Text: `#1E2420` (primary), `#767D6F` (secondary)
- All chart text must use `fill: '#1E2420'` for readability on light backgrounds

## Database Connection
- **MUST use Supavisor pooler** (IPv4) for Vercel
- Host: `aws-0-ap-northeast-1.pooler.supabase.com:6543`
- Username: `postgres.noxaotgovlbjpaufbdsm` (not `postgres`)
- Params: `?pgbouncer=true&prepared_statements=false`

## Protected Routes
- `/dashboard/laporan` → Auth required (JWT cookie)
- `/api/chat-logs` → Auth required
- All other routes → Public
