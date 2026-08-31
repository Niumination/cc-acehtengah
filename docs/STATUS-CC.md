# Status cc-acehtengah

> **Last update:** Sep 1, 2026 — **WP0.00 remediation branch:** `wp0.00-pii-cleanup` berisi redaksi PII + pii-gate yang diperluas. **Peringatan:** `main` masih memuat kredensial/NIK di sejarah publik sampai branch ini di-deploy.
> **Deploy state:** PROD = `e07edae` (main). `hotfix/meeting-ready` = `main` + 23 commit (Bapokting, PR Lapis 2.1, WP0.00 redaksi). `feat/ai-executive-answer-v3` = `main` + 13 commit. **6 branch** aktif di GitHub.

## Insiden Keamanan — WP0.00 (31 Agu 2026)

- **Temuan:** `docs/ai/SESI-2026-08-29-dtsen-root-bnba.md` berisi password `DTSEN_ROOT` dan NIK warga di `origin/main` (repo publik).
- **Dampak:** kredensial + NIK terekspose di HTTP 200 tanpa login.
- **Perbaikan sementara:** redaksi + pii-gate yang diperluas sudah di-commit di branch `wp0.00-pii-cleanup` (berangkat dari `origin/main`).
- **Sisa risiko:** riwayat `main` asli masih menyimpan data sensitif sampai force-push dilakukan.
- **Tindakan lanjut:** rotasi password + DTSEN_DATA_KEY + force-push `main` setelah koordinasi tim.
