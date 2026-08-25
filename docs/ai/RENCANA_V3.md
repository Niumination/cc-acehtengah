# Rencana Kerja v3 — `feat/ai-executive-answer-v3`

> Dibuat: 2026-08-26 · Branch dasar: `feat/ai-executive-answer-v2-live` @ `5280eae`
> Prinsip: sama dengan §13 instruksi penerapan — reversible, auditable, grounded.
> Aturan tetap: **tanpa persetujuan eksplisit** → tidak push ke main, tidak deploy
> Vercel, tidak menyentuh DB produksi (`prisma db push` / `migrate` dilarang auto-run).

## Konteks

- v2-live selesai penuh (laporan §12 di `REVIEW_EXECUTIVE_UI.md`), menunggu
  persetujuan merge ke main.
- Risiko #2 (jalur rollback flag=false) sudah **tertutup** lewat uji e2e visual
  di kedua jalur query (lihat §8 review).
- v3 berisi pekerjaan lanjutan yang TIDAK diblokir keputusan/izin.

## Scope A — Widget "Top OPD" + Analitik Drill-down (utama, tidak diblokir)

Sumber: BACKLOG.md item 2. Satu-satunya fitur backlog yang datanya sudah
tersedia tanpa perubahan skema.

1. Widget ringkas di `/dashboard`: top 10 OPD berdasar jumlah indikator/record,
   data dari `GET /api/analytics` (`opdBreakdown`) — sudah ada, deterministik.
2. Klik OPD → halaman detail analitik OPD (`/dashboard/analytics?opd=...`):
   tren tahunan indikator OPD tsb., daftar indikator dengan nilai terbaru.
3. Provenance jujur: label sumber + catatan record tanpa tahun (816 record)
   agar tren tidak dipaksakan (aturan §3.5 instruksi).
4. Gate ulang: test/tsc/build/lint + uji visual lokal (pola §8 review).

Kriteria selesai: widget render live, drill-down menampilkan tren benar untuk
≥3 OPD sampel, fallback rapi saat OPD tanpa deret waktu.

## Scope B — Checklist Verifikasi Pasca-Deploy (persiapan, tidak diblokir)

File `docs/ai/CHECKLIST_PASCA_DEPLOY.md` agar saat merge+deploy disetujui,
verifikasi tinggal dieksekusi:

1. `/api/health` produksi → SAPA ok, AI ok.
2. Dashboard produksi: badge SAPA Connected, jumlah record live ~2.032.
3. Query chip "OPD Teratas" → Executive Answer utuh + provenance.
4. Eksekusi sekali jalur rollback: set env flag=false → redeploy → cek legacy →
   balikkan flag → redeploy.
5. Amati build log Vercel sekali (validasi fix turbopack root di CI).

## Scope C — Perbaikan Kecil Executive Answer (opsional, mengalir)

Hanya jika ditemukan saat pengujian Scope A (mis. wiring follow-up chip,
edge case payload malformed). Tanpa fitur baru besar.

## Blokir — JANGAN dikerjakan di v3 tanpa persetujuan

| Item | Penghalang |
|---|---|
| Push main + deploy Vercel | Izin pemilik repo |
| Scraper Bapokting | Butuh tabel DB baru (keputusan migrasi Supabase) |
| Impor DTSEN penuh (xlsx) | Env `DTSEN_NIK_KEY` + tabel `DtsenRelease` (P2021) |
| Kartu "Sumber Data" versi penuh | DTSEN P2021 + klien Bapokting |

Semua penghalang bermuara pada satu keputusan: **migrasi skema Supabase
produksi** (BACKLOG.md item 5).

## Urutan eksekusi yang disarankan

B (checklist, cepat) → A (widget + drill-down) → C sesuai temuan.
