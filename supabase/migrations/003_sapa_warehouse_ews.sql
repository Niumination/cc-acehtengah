-- ═══════════════════════════════════════════════════════════════════
-- Migrasi 003 — Gudang data SAPA (R1) + Early Warning System (R2)
--
-- Jalankan di Supabase Dashboard → SQL Editor, ATAU:
--   psql "$DATABASE_URL" -f supabase/migrations/003_sapa_warehouse_ews.sql
--
-- Migrasi ini idempoten: aman dijalankan berulang.
--
-- LATAR BELAKANG (LAPORAN_AUDIT_PRODUCTION_READINESS.md §P1-10)
-- Tabel lama Skpd/Dataset/DatasetRecord/Indicator tidak pernah terisi dan
-- memutus rantai data EWS. Tabel tersebut DIHAPUS di bagian akhir berkas ini.
--
-- ⚠️ Bagian penghapusan sengaja diletakkan paling akhir dan diberi pagar
--    pengaman: tabel hanya dibuang bila benar-benar kosong. Bila di lingkungan
--    Anda ternyata berisi data, penghapusan dilewati dan Anda akan melihat
--    NOTICE — tangani manual sebelum melanjutkan.
-- ═══════════════════════════════════════════════════════════════════

BEGIN;

-- ─── Tipe enum (harus dibuat sebelum tabel yang memakainya) ───

DO $$ BEGIN
  CREATE TYPE "SyncStatus" AS ENUM ('RUNNING', 'SUCCESS', 'FAILED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "ThresholdOperator" AS ENUM ('GT', 'GTE', 'LT', 'LTE');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "Severity" AS ENUM ('INFO', 'WARNING', 'CRITICAL');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "AdminRole" AS ENUM ('ADMIN', 'SUPERADMIN');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ─── R1: Gudang data SAPA ───

CREATE TABLE IF NOT EXISTS "SapaOpd" (
    "id"        INTEGER      NOT NULL PRIMARY KEY,
    "nama"      TEXT         NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "SapaOpd_nama_idx" ON "SapaOpd" ("nama");

CREATE TABLE IF NOT EXISTS "SapaIndicator" (
    "id"        INTEGER      NOT NULL PRIMARY KEY,
    "kode"      TEXT,
    "nama"      TEXT         NOT NULL,
    "satuan"    TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "SapaIndicator_nama_idx" ON "SapaIndicator" ("nama");

CREATE TABLE IF NOT EXISTS "SapaObservation" (
    "id"           TEXT         NOT NULL PRIMARY KEY,
    "indicatorId"  INTEGER      NOT NULL,
    "opdId"        INTEGER      NOT NULL,
    "tahun"        TEXT,
    "nilaiTeks"    TEXT         NOT NULL,
    "nilaiNumerik" DOUBLE PRECISION,
    "satuan"       TEXT,
    "jadwal"       TEXT,
    "fetchedAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SapaObservation_indicatorId_fkey"
      FOREIGN KEY ("indicatorId") REFERENCES "SapaIndicator" ("id") ON DELETE CASCADE,
    CONSTRAINT "SapaObservation_opdId_fkey"
      FOREIGN KEY ("opdId") REFERENCES "SapaOpd" ("id") ON DELETE CASCADE
);

-- Kunci upsert sinkronisasi.
-- CATATAN PENTING: di PostgreSQL, UNIQUE biasa memperlakukan setiap NULL
-- sebagai nilai berbeda, sehingga baris ber-"tahun" NULL akan terduplikasi
-- setiap kali sinkronisasi berjalan. Karena SAPA memang mengirim tahun kosong,
-- dipakai NULLS NOT DISTINCT agar NULL dianggap satu nilai yang sama.
CREATE UNIQUE INDEX IF NOT EXISTS "SapaObservation_indicatorId_opdId_tahun_key"
    ON "SapaObservation" ("indicatorId", "opdId", "tahun") NULLS NOT DISTINCT;

CREATE INDEX IF NOT EXISTS "SapaObservation_indicatorId_tahun_idx"
    ON "SapaObservation" ("indicatorId", "tahun");
CREATE INDEX IF NOT EXISTS "SapaObservation_opdId_idx"
    ON "SapaObservation" ("opdId");

CREATE TABLE IF NOT EXISTS "SapaSyncRun" (
    "id"             TEXT         NOT NULL PRIMARY KEY,
    "startedAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt"     TIMESTAMP(3),
    "status"         "SyncStatus" NOT NULL DEFAULT 'RUNNING',
    "recordCount"    INTEGER      NOT NULL DEFAULT 0,
    "opdCount"       INTEGER      NOT NULL DEFAULT 0,
    "indicatorCount" INTEGER      NOT NULL DEFAULT 0,
    "alertsCreated"  INTEGER      NOT NULL DEFAULT 0,
    "durationMs"     INTEGER,
    "error"          TEXT
);
CREATE INDEX IF NOT EXISTS "SapaSyncRun_startedAt_idx" ON "SapaSyncRun" ("startedAt");

-- ─── R2: Early Warning System ───

CREATE TABLE IF NOT EXISTS "IndicatorThreshold" (
    "id"          TEXT                NOT NULL PRIMARY KEY,
    "indicatorId" INTEGER             NOT NULL,
    "operator"    "ThresholdOperator" NOT NULL,
    "nilai"       DOUBLE PRECISION    NOT NULL,
    "severity"    "Severity"          NOT NULL DEFAULT 'WARNING',
    "pesan"       TEXT,
    "isActive"    BOOLEAN             NOT NULL DEFAULT true,
    "createdAt"   TIMESTAMP(3)        NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"   TIMESTAMP(3)        NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "IndicatorThreshold_indicatorId_fkey"
      FOREIGN KEY ("indicatorId") REFERENCES "SapaIndicator" ("id") ON DELETE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "IndicatorThreshold_indicatorId_operator_nilai_key"
    ON "IndicatorThreshold" ("indicatorId", "operator", "nilai");
CREATE INDEX IF NOT EXISTS "IndicatorThreshold_isActive_idx"
    ON "IndicatorThreshold" ("isActive");

-- EwsAlert lama merujuk tabel Indicator yang dihapus. Bentuk tabelnya berubah
-- total, jadi versi lama dibuang lebih dulu bila ada (selalu kosong di praktik).
DROP TABLE IF EXISTS "EwsAlert";

CREATE TABLE "EwsAlert" (
    "id"          TEXT             NOT NULL PRIMARY KEY,
    "thresholdId" TEXT             NOT NULL,
    "indicatorId" INTEGER          NOT NULL,
    "nilaiAktual" DOUBLE PRECISION NOT NULL,
    "batas"       DOUBLE PRECISION NOT NULL,
    "pesan"       TEXT             NOT NULL,
    "severity"    "Severity"       NOT NULL DEFAULT 'WARNING',
    "tahun"       TEXT,
    "resolvedAt"  TIMESTAMP(3),
    "createdAt"   TIMESTAMP(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "EwsAlert_thresholdId_fkey"
      FOREIGN KEY ("thresholdId") REFERENCES "IndicatorThreshold" ("id") ON DELETE CASCADE,
    CONSTRAINT "EwsAlert_indicatorId_fkey"
      FOREIGN KEY ("indicatorId") REFERENCES "SapaIndicator" ("id") ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS "EwsAlert_resolvedAt_severity_idx"
    ON "EwsAlert" ("resolvedAt", "severity");
CREATE INDEX IF NOT EXISTS "EwsAlert_indicatorId_idx"
    ON "EwsAlert" ("indicatorId");

-- Cegah alert ganda: hanya SATU alert aktif per (ambang, tahun).
-- Indeks parsial — setelah alert diselesaikan (resolvedAt terisi), alert baru
-- untuk kombinasi yang sama boleh dibuat lagi.
CREATE UNIQUE INDEX IF NOT EXISTS "EwsAlert_active_unique"
    ON "EwsAlert" ("thresholdId", "tahun") NULLS NOT DISTINCT
    WHERE "resolvedAt" IS NULL;

-- ─── Indeks tambahan untuk ChatSession (dipakai halaman Laporan) ───

CREATE INDEX IF NOT EXISTS "ChatSession_createdAt_idx" ON "ChatSession" ("createdAt");
CREATE INDEX IF NOT EXISTS "ChatSession_intent_idx"    ON "ChatSession" ("intent");

-- ─── Pembersihan tabel lama yang tidak pernah terisi ───
-- Hanya dihapus bila benar-benar kosong (pagar pengaman).

DO $$
DECLARE
  t   TEXT;
  n   BIGINT;
  -- Urutan penting: anak sebelum induk.
  tbl TEXT[] := ARRAY['DatasetRecord', 'Indicator', 'Dataset', 'Skpd'];
BEGIN
  FOREACH t IN ARRAY tbl LOOP
    IF to_regclass(format('public.%I', t)) IS NULL THEN
      CONTINUE;
    END IF;
    EXECUTE format('SELECT count(*) FROM %I', t) INTO n;
    IF n = 0 THEN
      EXECUTE format('DROP TABLE IF EXISTS %I CASCADE', t);
      RAISE NOTICE 'Tabel lama % dihapus (kosong).', t;
    ELSE
      RAISE NOTICE 'Tabel lama % DILEWATI: berisi % baris. Tangani manual.', t, n;
    END IF;
  END LOOP;
END $$;

-- Enum yang hanya dipakai tabel lama.
DO $$ BEGIN
  IF to_regclass('public."Dataset"') IS NULL THEN
    DROP TYPE IF EXISTS "KategoriSkpd";
    DROP TYPE IF EXISTS "Direction";
  END IF;
EXCEPTION WHEN dependent_objects_still_exist THEN
  RAISE NOTICE 'Tipe enum lama masih dipakai objek lain — dilewati.';
END $$;

COMMIT;
