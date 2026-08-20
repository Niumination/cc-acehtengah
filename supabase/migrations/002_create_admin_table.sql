-- ─── Migration: Create Admin table ───
-- Jalankan di Supabase SQL Editor.
--
-- PENTING (urutan): tipe enum "AdminRole" HARUS dibuat SEBELUM tabel yang
-- memakainya. Versi sebelumnya menaruh CREATE TYPE di bagian akhir sehingga
-- migrasi selalu gagal di database baru dengan error:
--   type "AdminRole" does not exist
-- Lihat: LAPORAN_AUDIT_PRODUCTION_READINESS.md §P1-09
--
-- CATATAN KEAMANAN: migrasi ini TIDAK lagi men-seed akun admin.
-- Seed kredensial default (admin/admin123) beserta hash bcrypt-nya sudah
-- dihapus karena ter-commit publik di repositori. Lihat §P0-03.
-- Untuk membuat akun pertama, gunakan salah satu:
--   a) POST /api/setup/admin  (butuh SETUP_ENABLED=true, header x-setup-token,
--      dan ADMIN_BOOTSTRAP_PASSWORD), lalu matikan lagi SETUP_ENABLED; atau
--   b) INSERT manual dengan hash bcrypt yang Anda generate sendiri:
--      node -e "console.log(require('bcryptjs').hashSync(process.argv[1],12))" 'PasswordAnda'

-- 1. Tipe enum
DO $$ BEGIN
  CREATE TYPE "AdminRole" AS ENUM ('ADMIN', 'SUPERADMIN');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- 2. Tabel Admin
CREATE TABLE IF NOT EXISTS "Admin" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
    "username" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "nama" TEXT NOT NULL,
    "role" "AdminRole" NOT NULL DEFAULT 'ADMIN',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 3. Unique constraint pada username
CREATE UNIQUE INDEX IF NOT EXISTS "Admin_username_key" ON "Admin"("username");
