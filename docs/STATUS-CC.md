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
# → Test Files 13 passed (13), Tests 271 passed (271)

npm run typecheck
# → [typecheck] OK: 0 error TS.
```

## Deploy

```bash
git add -A && git commit -m "fix(security): WP0.2/0.4/0.5/0.6/0.9 — akun protected, tsc 0 error, typecheck gate, EWS live" && git push
```

> **Aturan status deploy** (WP0.7): perbarui baris Branch/Status/Update di commit yang sama dengan deploy. Sebelum deploy: `npm run typecheck` + `npx vitest run` wajib hijau.