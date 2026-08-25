# BACKLOG — cc-acehtengah

Semua item di bawah **sudah diselidiki dan ditahan** menunggu keputusan/izin.
Jangan implementasikan tanpa persetujuan eksplisit.
Terakhir diperbarui: 2026-08-24 (branch `feat/ai-executive-answer-v2-live`).

---

## 1. Dashboard "Sumber Data" (SAPA / DTSEN / Bapokting)

**Status:** dirancang, belum diimplementasi.

Kartu/ringkasan jumlah record per sumber data di dashboard utama:

| Sumber | Sumber data | Status |
|---|---|---|
| SAPA | `api-splp.layanan.go.id` via `sapa-client.ts` | ✅ live (~2.032 record) |
| DTSEN | tabel `DtsenRelease`/`DtsenAgregatWilayah` | ⛔ Prisma P2021: tabel belum ada di DB produksi |
| Bapokting | scraper website (item 3) | ⛔ belum ada client |

## 2. Dashboard Top OPD + Analitik Drill-down

**Status:** ✅ TERIMPLEMENTASI di branch `feat/ai-executive-answer-v3`
(`99d5f9e`, refactor `feat(opd-drilldown)`) — belum di main, menyusul merge.

- Widget "Top 10 OPD" deterministik di beranda (`TopOpdWidget.tsx`,
  sumber `/api/analytics` → `opdBreakdown`).
- Klik OPD → panel drill-down `/dashboard/analytics?opd=...`
  (`OpdDrilldown.tsx` + API `GET /api/analytics/opd/[slug]`):
  stat ringkas, chart tren (hanya ≥2 titik tahun valid), 15 indikator
  nilai terakhir, provenance + jumlah record tanpa tahun.
- Logika murni di `src/services/opd-drilldown.ts`, 11 unit test.

## 3. Scraper Bapokting

**Status:** kelayakan terverifikasi, menunggu izin + keputusan migrasi DB.

- Sumber: `https://cc.acehtengahkab.go.id/data-bapokting`
- Tabel HTML publik: **2.433 baris**, pembaruan mingguan sejak Jan 2026,
  **121 halaman**, filter via parameter GET (bukan JS-render) → mudah di-scrape.
- Rencana teknis:
  - Client baru `src/lib/bapokting-client.ts` (pola seperti `sapa-client.ts`)
  - Tabel DB baru untuk harga komoditas mingguan
  - **Blokir:** pembuatan tabel terkait keputusan migrasi Supabase (lihat item 5)

## 4. Integrasi Penuh DTSEN (xlsx + API key)

**Status:** kode impor **sudah ada** di repo, diblokir data & skema.

Lokasi yang sudah tersedia:
- Endpoint SPLP DTSEN: `src/app/api/dtsen/source/route.ts`
- Parser xlsx: `parseStuntingXlsx` / `parseKominfoXlsx` di `dtsen-multisource.ts`

Yang kurang:
- [ ] Env `DTSEN_NIK_KEY` (nilai tidak ada di `.env`; ada referensi folder lokal
      `~/Downloads/project-baru-dan-arena/bahan-pengembangan-cc-ai`)
- [ ] Impor dua berkas xlsx: `data kominfo.xlsx` (PPKS) dan
      `STUNTING BY NIK.xlsx` — diklasifikasi `RESTRICTED_PERSONAL`
- [ ] **Blokir skema:** Prisma P2021 `DtsenRelease` table missing

## 5. Keputusan Migrasi Skema Supabase (PREREQUISITE item 1–4)

**Status:** MENUNGGU KEPUTUSAN USER. Jangan pernah auto-run
`prisma db push` / `prisma migrate` terhadap DB produksi.

Drift skema terdeteksi saat pengujian live (pra-eksisting, bukan dari branch ini):
- P2021: tabel `DtsenRelease` (dan relasi DTSEN) tidak ada di DB
- P2022: kolom `EwsAlert.threshold` tidak ada di model Prisma

DB produksi: `db.noxaotgovlbjpaufbdsm.supabase.co`.

---

## Catatan rollback fitur UI Executive Answer

Feature flag: `NEXT_PUBLIC_AI_EXECUTIVE_UI=false` → UI legacy penuh.
Kontrak legacy dipertahankan: HybridResponse, event SSE, k-anonymity, gerbang DTSEN.
