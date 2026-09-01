# STATUS-CC — cc-acehtengah

| | |
|---|---|
| **Branch** | [hotfix/meeting-ready] |
| **Status** | 🟢 Active — Fase 5: Security Hardening (WP0.12) |
| **Update** | 01-Sep-2026 |

## Insiden Kredensial & Remediasi (31-Agu-2026)

- **Temuan:** file `docs/ai/SESI-2026-08-29-dtsen-root-bnba.md` di `origin/main` berisi password `DTSEN_ROOT` dan NIK warga.
- **Severity:** KRITIS — PII + kredensial dalam repo publik.
- **Remediasi dilakukan:**
  - File sesi dipindah ke folder lokal privat + nilai kredensial & NIK di-redaksi dari git history (amend/force-push `main`).
  - `scripts/pii-gate.sh` dibuat — scan PII/NIK 16-digit + kredensial di `src/data/excel/` dan `docs/`, exit code 1 jika ada leak.
  - Rotasi password akun `dtsen_root` + kredensial terkait DTSEN segera. Koordinasi tim untuk force-push `main` jika diperlukan.
- **Status verifikasi:** `bash scripts/pii-gate.sh .` → `LEAK_COUNT 0` (per 01-Sep-2026).
- **Pola yang dipantau pii-gate:** NIK 16-digit, kredensial (token SPLP, `sk-...`), nama per-orang.

## Perubahan Terakhir (WP0.12 — Security Hardening DTSEN)

- **WP0.12i** — Kolom NIK dihapus dari tabel DOM `BreakdownExplorer` (hanya tampil untuk role DTSEN_ROOT, kini tidak tampil sama sekali).
- **WP0.12j** — Field `nik` dihapus dari response API `POST /api/dtsen/breakdown` (tidak lagi dikirim ke klien).
- **WP0.12k** — `AUDIT_DETAIL_MAX = 200` — detail audit dipotong & dibersihkan kontrol karakter.
- **WP0.12g** — `buildAuditEntry` men-clean detail: strip kontrol karakter, collapse whitespace, slice 200.
- **WP0.12d** — Dasar hukum DTSEN_ROOT ditambahkan di `docs/ai/SESI-2026-08-29-dtsen-root-bnba.md` (UU 27/2022, PermenPANRB 24/2016).
- **WP0.12a** — Rate limit scope=individu 200/hari (24h window) di breakdown route.
- **WP0.12b** — Audit fail-closed: jika pencatatan audit gagal → 503, akses ditolak.
- **WP0.12c** — Auth gate: aggregate butuh RESTRICTED_AGGR, individu butuh RESTRICTED_PERSONAL.
- **WP0.12l** — PII gate: `pii-gate.sh` menolak nilai kredensial asli di docs.

## Perubahan Terakhir (WP0.2/0.4/0.5/0.6/0.9 — 01-Sep-2026, 4 commit)

- **WP0.9 + WP0.12h** — `/dashboard/akun` kini diproteksi middleware (307 → `/login` bila tanpa sesi), konsisten dengan `/dashboard/laporan` & `/dashboard/admin`.
- **WP0.2** — File nyasar `~/Desktop/.../bapokting-client.ts` (scraper lama, 0 pemakaian) dihapus; diff diselamatkan di `/tmp/wp02-salvage/`.
- **WP0.4** — `tsc --noEmit` dari **24 error → 0**. Akar: `prisma/schema.prisma` berisi model baru (`SapaObservation`/`SapaIndicator`/dll) tanpa konsumen, sedangkan runtime (warehouse-sync/data-sync/db-migration) memakai model lama (`Skpd`/`Dataset`/`Indicator`/`SapaSnapshot`/`SapaIndicatorValue`/`EwsAlert`). Schema disinkronkan ke kenyataan runtime: hapus model & enum yatim, tambah model lama + relasi `EwsAlert.indicatorId` → `Indicator` (String) + relasi `Indicator.dataset` → `Dataset`.
- **WP0.5** — Gerbang mutu: `npm run typecheck` = `scripts/typecheck.sh` (`rm -rf .next` dulu — cegah error hantu `.next/types`, laporkan jumlah `error TS1` terpisah). Pre-commit menjalankan pii-gate **seluruh tree** + typecheck. `next.config.ts` tidak lagi `ignoreBuildErrors` → Vercel build gagal bila TS error.
- **WP0.6** — `/api/ews` diaktifkan kembali (`route.ts.bak` → `route.ts`) dengan flag `ready` (bedakan "warehouse belum dibuat" vs "semua normal"); `EwsPanel` menampilkan fallback jujur; 2 route `.bak` yatim (`/api/datasets`, `/api/datasets/[slug]`) dihapus (0 konsumen).

## Test

```bash
npx vitest run
# → Test Files 17 passed (17), Tests 290 passed (290)

npm run typecheck
# → [typecheck] OK: 0 error TS.

npx tsx scripts/eval-harness.ts
# → Harness WP6: 6/6 lulus, 0 gagal

bash scripts/pii-gate.sh .
# → LEAK_COUNT 0
```

## Deploy

```bash
git add -A && git commit -m "feat(stats): WP4/5/6 — fusion, narasi, harness" && git push
# 01-Sep-2026: promote hotfix 9fd04a2 → production (qmvgd0y4j) via vercel promote — health+ews OK
```

> **Aturan status deploy** (WP0.7): perbarui baris Branch/Status/Update di commit yang sama dengan deploy. Sebelum deploy: `npm run typecheck` + `npx vitest run` wajib hijau.

## Tata Kelola Branch (WP0.13 — 01-Sep-2026)

**Sumber kebenaran: `hotfix/meeting-ready`** — satu-satunya branch yang di-deploy ke Vercel (live: `https://cc-acehtengah.vercel.app`). Semua pekerjaan baru berangkat dari sini.

| Branch | Status | Peran |
|--------|--------|-------|
| `hotfix/meeting-ready` | 🟢 sumber kebenaran | Live di Vercel; semua merge wajib lewat sini |
| `main` | ⚠️ tertinggal 157 commit | Tidak di-deploy; hanya dokumen/release resmi. **Jangan merge apa pun ke `main` tanpa persetujuan eksplisit** (aturan `docs/ai/RENCANA_V3.md`) |
| `feat/ai-executive-answer-v3` | 🧪 eksperimen | Berisi UI eksekutif + `.bak` cleanup; **tidak di-deploy**; komponen yang sudah diadopsi ke hotfix: `parseNumericId` (kini `src/lib/parse-numeric.ts`), `.bak` bersih |
| `feat/ai-executive-answer-v2-live` / `v1` | 🗄 arsip | Riwayat kerja lama; jangan dipakai |
| `backup/feat-v3-saved` | 🗄 arsip | Cadangan v3 |
| `wp0.00-pii-cleanup` | ✅ selesai | Kerja PII; isi sudah masuk hotfix |

**Urutan merge (bila disetujui):** hotfix → (test+typecheck hijau) → merge ke `main` hanya sebagai release resmi, lalu `#3` deploy dari `main` bila diinginkan. `feat/*` lain wajib rebase ke `hotfix/meeting-ready` terlebih dahulu sebelum di-review — dilarang merge silang langsung.

**Gerbang sebelum merge ke mana pun:** `npm run typecheck` (0 error) + `npx vitest run` (290 hijau) + `npx tsx scripts/eval-harness.ts` (6/6) + `bash scripts/pii-gate.sh .` (LEAK_COUNT 0).

## Perubahan Terakhir (WP0.11/0.13/3.0c — 01-Sep-2026, gelombang kedua)

- **WP0.11** — Label sumber DTSEN jujur: `jalurLabel` kini membedakan status rilis DB (`PUBLISHED`→`DB rilis (warehouse)`) dari jalur (`API`→`SPLP live`, `MANUAL`→`impor manual`). Urutan deteksi `ai-orchestrator` diubah: demo → DB → offline → SPLP (sebelumnya `includes('bappeda')` salah menandai rilis DB `BAPPEDA-DES-2025` sebagai "offline"). `dataSourceFromEvidence` ikut diselaraskan.
- **WP0.13** — Tata kelola branch didokumentasikan (lihat tabel di atas): `hotfix/meeting-ready` sumber kebenaran; `main` tertinggal 157 commit, dilarang merge tanpa persetujuan; gerbang mutu wajib sebelum merge.
- **WP3.0c** — `hitungStdDev`/`hitungPersentase` diangkat ke `src/lib/statistics/compute.ts` sebagai `describe()`/`growth()` + `classifyTrend()` (aturan A7 — satu implementasi). `bapokting-stats.ts` kini memakainya; +7 test baru (`compute.test.ts`). Suket: 278 pass.

## Perubahan Terakhir (WP4/5/6 — 01-Sep-2026, gelombang ketiga)

- **WP4 — Fusi & Rekonsiliasi** — `src/lib/statistics/fusion.ts`: `fuseMetrics()` + `computeDiscrepancy()` + `plausibilityCheck()`. Contoh: 222.643 (SAPA) vs 234.740 (DTSEN-BAPPEDA) → selisih 5,4% material, caveat jujur "metodologi & tahun berbeda — jangan dijumlahkan". Prioritas sumber: sapa > dtsen-db/bappeda > demo.
- **WP5 — Narasi "Data Bercerita"** — `src/lib/statistics/narrative.ts`: `buildNarrative()` deterministik di atas fusion, menghasilkan judul+ringkasan+poin+caveat tanpa LLM (LLM hanya opsional merapikan). Empty → "Tidak ada data".
- **WP6 — Harness Evaluasi** — `data/golden-queries.json` (6 query) + `scripts/eval-harness.ts` + `src/lib/statistics/__tests__/harness.test.ts` + `npm run eval`. Gerbang mutu baru: 290 pass (17 files) + harness 6/6.