# Setup DTSEN untuk Meeting

## Environment Variables (Sudah Ada)
- ✅ `DTSEN_NIK_KEY` - Kunci HMAC untuk NIK masking
- ✅ `ADMIN_SETUP_TOKEN` - Token untuk setup API
- ✅ `DATABASE_URL` - Koneksi ke Supabase

## Langkah Setup (Sekali Saja)

### 1. Buat Tabel DTSEN
```bash
curl -X POST https://cc-acehtengah.vercel.app/api/setup \
  -H "x-setup-token: $ADMIN_SETUP_TOKEN"
```

### 2. Verifikasi
```bash
curl https://cc-acehtengah.vercel.app/api/health
```

### 3. Test Query DTSEN
```bash
curl -X POST https://cc-acehtengah.vercel.app/api/query \
  -H "Content-Type: application/json" \
  -d '{"query": "Berapa jumlah penerima bansos di Laut Tawar?"}'
```

## Fitur yang Tersedia

| Fitur | Status | Endpoint |
|-------|--------|----------|
| SAPA Stats | ✅ Live | `/api/stats` |
| AI Query | ✅ Live | `/api/query` |
| Bapokting Prices | ✅ Live | Scraper aktif |
| DTSEN Aggregates | ⏸️ Perlu Setup | `/api/dtsen/source` |
| DTSEN Import | ⏸️ Perlu Setup | `/api/dtsen/import` |

## Branch Status
- `hotfix/meeting-ready` - Siap presentasi (SAPA + Bapokting)
- `feat/ai-executive-answer-v3` - diamankan untuk client
- `main` - Production stable
