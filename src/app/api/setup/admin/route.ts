// ─── POST /api/setup/admin — Auto-create Admin table ───

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { hashPassword } from '@/lib/auth';

export async function POST() {
  try {
    // Check if admin table exists by trying to query
    const existing = await prisma.admin.findFirst();
    if (existing) {
      return NextResponse.json({
        success: true,
        message: 'Admin table already exists',
        adminCount: await prisma.admin.count(),
      });
    }
  } catch {
    // Table doesn't exist, create it
    try {
      await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "Admin" (
          "id" TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
          "username" TEXT NOT NULL,
          "password" TEXT NOT NULL,
          "nama" TEXT NOT NULL,
          "role" "AdminRole" NOT NULL DEFAULT 'ADMIN',
          "isActive" BOOLEAN NOT NULL DEFAULT true,
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
      `);
      await prisma.$executeRawUnsafe(`
        CREATE UNIQUE INDEX IF NOT EXISTS "Admin_username_key" ON "Admin"("username")
      `);
    } catch (e: any) {
      // Enum might not exist yet, try without enum type
      if (e?.message?.includes('AdminRole')) {
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
          )
        `);
        await prisma.$executeRawUnsafe(`
          CREATE UNIQUE INDEX IF NOT EXISTS "Admin_username_key" ON "Admin"("username")
        `);
      } else {
        throw e;
      }
    }
  }

  // Seed admin if empty
  const count = await prisma.admin.count();
  if (count === 0) {
    const hash = await hashPassword('admin123');
    await prisma.admin.create({
      data: {
        username: 'admin',
        password: hash,
        nama: 'Administrator',
        role: 'ADMIN',
      },
    });
    return NextResponse.json({
      success: true,
      message: 'Admin table created + seeded (admin/admin123)',
    });
  }

  return NextResponse.json({
    success: true,
    message: `Admin table ready, ${count} admin(s) found`,
  });
}
