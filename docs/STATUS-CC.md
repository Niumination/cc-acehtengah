# Status cc-acehtengah

> **Last update:** Sep 1, 2026 — **WP0.3 selesai:** 5 test pre-existing diperbaiki. Full suite **271/271 passing**, `tsc --noEmit` **0 error**. PR Lapis 2.1 (Question Router/WP2) tetap di branch ini.
> **Deploy state:** PROD live = `e07edae` (`main`). `hotfix/meeting-ready` = `main` + **23 commit** (Bapokting, PR Lapis 2.1, WP0.00 redaksi, WP0.3 test fix). `feat/ai-executive-answer-v3` = `main` + 13 commit. **6 branch** aktif di GitHub.

## Insiden Keamanan — WP0.00 (31 Agu 2026)

- **Temuan:** file `docs/ai/SESI-2026-08-29-dtsen-root-bnba.md` di `origin/main` berisi password `DTSEN_ROOT` dan NIK warga.
- **Status:** file tersebut sudah **di-redaksi** di `hotfix/meeting-ready` (`c19ac2e`). Password dan NIK tidak lagi muncul di branch ini.
- **Sisa risiko:** riwayat `origin/main` masih menyimpan data sensitif sampai force-push/maintenance dilakukan.
- **Tindakan lanjut:** rotasi password `dtsen_root` + `DTSEN_DATA_KEY` segera. Koordinasi tim untuk force-push `main` jika diperlukan.

## Audit pii-gate.sh (1 Sep 2026)

- **Hasil:** `bash scripts/pii-gate.sh .` → `LEAK_COUNT 0`.
- **Coverage:** `src/data/excel` + seluruh `docs/` (`*.md`, `*.txt`, `*.json`).
- **Pola yang dideteksi:** NIK 16-digit, kredensial (`cPtnkHE7NYD3Gg_s`, `sk-...`, `DTSEN_DATA_KEY=...`, `password: "..."`), nama per-orang.
- **Izinkan:** contoh redacted (`[NIK REDACTED]`, `[REDACTED]`) tidak di-flag.

## Cabang Aktif

| Branch | HEAD | Keterangan |
|--------|------|------------|
| `main` | `d86bdad` | Produksi live (`e07edae`) |
| `hotfix/meeting-ready` | `044f7a7` | Dev + fitur Bapokting + WP0.00 + WP0.3 |
| `feat/ai-executive-answer-v3` | `1dd5ed7` | Experimental — GitHub-only, jangan deploy |

## Catatan

- `docs/ai/SESI-2026-08-29-dtsen-root-bnba.md` di `hotfix/meeting-ready` sudah redacted.
- `AGENTS.md` baris `Deploy state` sudah dipindah ke berkas ini. Selalu perbarui dokumen ini saat deploy.
