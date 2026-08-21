# BACKLOG — cc-acehtengah

**Dibuat:** 2026-08-22 · **Status:** 🟢 Active (Fase 5)
**Sumber:** audit `cc-acehtengah` 22 Aug 2026

## 🔴 PRIORITAS TINGGI (blokir fitur inti)
- [ ] **R1 — Data Warehouse SAPA**: `Dataset`/`DatasetRecord` tidak pernah terisi dari SAPA.
  Tanpa ini, **EWS (`/api/ews`) tidak bisa fungsi** (rantai `EwsAlert→Indicator→Dataset` putus).
  Panel EWS saat ini selalu "normal" (false-positive). Butuh scheduler `data-sync.ts` menyimpan ke DB.
  Ref: `LAPORAN_AUDIT_PRODUCTION_READINESS.md` §P1-10, roadmap R1–R2.

## 🟡 PRIORITAS SEDANG (debt / risiko)
- [ ] **PR #12 (Prisma 6→7.9.1) = BREAKING**: jangan merge mentah. Perlu (a) migrasi schema,
  (b) test client Prisma di lokal, (c) cek compat `@prisma/client` 7 vs kode `lib/prisma.ts`.
  Selama belum test → tahan di branch dependabot.
- [ ] **7 PR Dependabot lain** (#8–#11, #13, #14): aman (jose, recharts, react, types, GH actions).
  Bisa di-merge berurutan setelah R1/Prisma beres.

## 🟢 SELESAI (konteks)
- ✅ Theme light default + WCAG AA (PR #15, merged ke main 22 Aug)
- ✅ Security Fase 1: JWT/setup/admin/proxy/rate-limit (#3)
- ✅ AI TableRenderer crash fix, analytics light fix, spinner fix
- ✅ `.gitignore` sekarang abaikan `.env*` (cegah leak) — commit 0761c11

---
*Backlog dirawat manual. Update saat ada progres.*
