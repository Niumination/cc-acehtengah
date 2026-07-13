# cc-acehtengah — Command Center Aceh Tengah

> **Next.js 16 + Prisma 7 + LLM + RAG** — Integrasi SAPA → SPLP → Command Center AI
> **Path:** `projects/cc-acehtengah/`
> **Status:** 🔜 Fase 1 selesai — Foundation

## Arsitektur

```
SAPA ──[SPLP API]──→ AI Middleware ──→ Dashboard CC
(Data Source)     (Next.js API)     (Eksekutif)
```

## Stack

| Layer | Teknologi |
|-------|-----------|
| Frontend | Next.js 16, React 19, Tailwind, Recharts, Leaflet |
| Backend | Next.js API Routes, Prisma 7 |
| Database | PostgreSQL + Qdrant (Vector) |
| AI | Ollama (Qwen 2.5 7B), RAG pipeline |
| Integration | SPLP Bridge (REST API + Token) |

## Struktur

```
src/
├── app/
│   ├── api/
│   │   ├── query/          # POST /api/query — AI Smart Query
│   │   ├── datasets/       # Daftar dataset SAPA
│   │   └── ews/            # Early Warning System alerts
│   └── dashboard/          # (Fase 3)
├── components/
│   ├── charts/             # Recharts components
│   └── HybridRenderer.tsx  # Render respon AI
├── services/
│   ├── ai-orchestrator.ts  # AI pipeline utama
│   ├── intent-detector.ts  # NLP intent classification
│   ├── llm-client.ts       # Ollama client
│   ├── rag-retriever.ts    # Qdrant RAG
│   └── data-sync.ts        # SPLP sync scheduler
└── lib/
    ├── prisma.ts            # Prisma client
    └── splp-bridge.ts       # SPLP connector
```

## Fase

| Fase | Status | Deliverable |
|------|--------|-------------|
| 1 — Foundation | ✅ Selesai | Project init, schema, SPLP bridge, services |
| 2 — Core Integration | 🔜 | Data sync, API routes lengkap |
| 3 — AI + Dashboard | 🔜 | AI logic, UI komponen |
| 4 — Uji Coba | 🔜 | Testing, security, go live |
