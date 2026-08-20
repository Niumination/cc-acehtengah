// ─── POST /api/auth/change-password — Ganti password sendiri ───
//
// Sebelumnya dokumen menulis "ganti password setelah login pertama", padahal
// tidak ada mekanisme apa pun untuk melakukannya.
// Lihat: LAPORAN_AUDIT_PRODUCTION_READINESS.md §P0-03

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { verifyPassword, hashPassword, verifyToken, COOKIE_NAME } from '@/lib/auth';
import { checkRateLimit, getClientIp, rateLimitHeaders } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const MIN_PASSWORD_LENGTH = 12;

const ChangePasswordSchema = z
  .object({
    currentPassword: z.string().min(1).max(200),
    newPassword: z
      .string()
      .min(MIN_PASSWORD_LENGTH, `Password baru minimal ${MIN_PASSWORD_LENGTH} karakter`)
      .max(200),
  })
  .refine((v) => v.currentPassword !== v.newPassword, {
    message: 'Password baru harus berbeda dari password lama',
    path: ['newPassword'],
  });

export async function POST(req: NextRequest) {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  const session = token ? await verifyToken(token) : null;

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const limit = checkRateLimit({
    key: `chpw:${session.id}:${getClientIp(req)}`,
    limit: 5,
    windowMs: 15 * 60 * 1000,
  });
  if (!limit.ok) {
    return NextResponse.json(
      { error: 'Terlalu banyak percobaan. Coba lagi nanti.' },
      { status: 429, headers: rateLimitHeaders(limit) },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Body harus JSON yang valid.' }, { status: 400 });
  }

  const parsed = ChangePasswordSchema.safeParse(body);
  if (!parsed.success) {
    const first =
      parsed.error.issues[0]?.message ?? 'Data tidak valid';
    return NextResponse.json({ error: first }, { status: 400 });
  }

  try {
    const admin = await prisma.admin.findUnique({ where: { id: session.id } });
    if (!admin || !admin.isActive) {
      return NextResponse.json({ error: 'Akun tidak ditemukan atau nonaktif' }, { status: 401 });
    }

    const valid = await verifyPassword(parsed.data.currentPassword, admin.password);
    if (!valid) {
      console.warn(`[auth] Ganti password gagal (password lama salah) user=${admin.username}`);
      return NextResponse.json({ error: 'Password saat ini salah' }, { status: 401 });
    }

    await prisma.admin.update({
      where: { id: admin.id },
      data: { password: await hashPassword(parsed.data.newPassword) },
    });

    // Paksa login ulang: cookie lama dibuang agar sesi lain tidak ikut terbawa.
    const response = NextResponse.json({
      success: true,
      message: 'Password berhasil diganti. Silakan masuk kembali.',
    });
    response.cookies.set(COOKIE_NAME, '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 0,
    });
    return response;
  } catch (err) {
    console.error('[auth/change-password] Error:', err);
    return NextResponse.json({ error: 'Gagal mengganti password.' }, { status: 500 });
  }
}
