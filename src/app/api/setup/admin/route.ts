// ─── POST /api/setup/admin — Bootstrap tabel Admin (TERKUNCI) ───
//
// Endpoint ini TIDAK boleh terbuka untuk publik: ia membuat tabel dan akun admin.
// Akses diatur oleh guardSetupRoute() — lihat src/lib/setup-guard.ts
//
// Password admin awal WAJIB disuplai lewat env ADMIN_BOOTSTRAP_PASSWORD.
// Kredensial default `admin123` sudah dihapus permanen.
// Lihat: LAPORAN_AUDIT_PRODUCTION_READINESS.md §P0-02, §P0-03

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { hashPassword } from '@/lib/auth';
import { guardSetupRoute } from '@/lib/setup-guard';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const MIN_PASSWORD_LENGTH = 12;

async function ensureAdminTable(): Promise<void> {
  // Enum harus dibuat SEBELUM tabel yang memakainya.
  await prisma.$executeRawUnsafe(`
    DO $$ BEGIN
      CREATE TYPE "AdminRole" AS ENUM ('ADMIN', 'SUPERADMIN');
    EXCEPTION
      WHEN duplicate_object THEN null;
    END $$;
  `);
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "Admin" (
      "id" TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
      "username" TEXT NOT NULL,
      "password" TEXT NOT NULL,
      "nama" TEXT NOT NULL,
      "role" "AdminRole" NOT NULL DEFAULT 'ADMIN',
      "isActive" BOOLEAN NOT NULL DEFAULT true,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);
  await prisma.$executeRawUnsafe(`
    CREATE UNIQUE INDEX IF NOT EXISTS "Admin_username_key" ON "Admin"("username");
  `);
}

export async function POST(req: Request) {
  const denied = guardSetupRoute(req);
  if (denied) return denied;

  const bootstrapPassword = process.env.ADMIN_BOOTSTRAP_PASSWORD;
  const bootstrapUsername = process.env.ADMIN_BOOTSTRAP_USERNAME ?? 'admin';

  if (!bootstrapPassword || bootstrapPassword.length < MIN_PASSWORD_LENGTH) {
    return NextResponse.json(
      {
        success: false,
        error: `ADMIN_BOOTSTRAP_PASSWORD wajib di-set (minimal ${MIN_PASSWORD_LENGTH} karakter).`,
      },
      { status: 400 },
    );
  }

  try {
    await ensureAdminTable();

    const count = await prisma.admin.count();
    if (count > 0) {
      return NextResponse.json({
        success: true,
        message: `Tabel Admin siap. ${count} akun sudah ada — tidak ada seed baru.`,
      });
    }

    await prisma.admin.create({
      data: {
        username: bootstrapUsername,
        password: await hashPassword(bootstrapPassword),
        nama: 'Administrator',
        role: 'SUPERADMIN',
      },
    });

    return NextResponse.json({
      success: true,
      message:
        `Akun "${bootstrapUsername}" dibuat dengan password dari ADMIN_BOOTSTRAP_PASSWORD. ` +
        'Segera ganti password di /dashboard/akun, lalu set SETUP_ENABLED=false.',
    });
  } catch (err) {
    console.error('[setup/admin] Error:', err);
    return NextResponse.json(
      { success: false, error: 'Gagal menyiapkan tabel Admin. Periksa DATABASE_URL dan hak akses.' },
      { status: 500 },
    );
  }
}
