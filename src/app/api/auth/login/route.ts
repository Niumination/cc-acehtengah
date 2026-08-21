// ─── POST /api/auth/login — Admin Login ───
//
// Ditambahkan: proteksi brute force (rate limit per IP dan per username).
// Lihat: LAPORAN_AUDIT_PRODUCTION_READINESS.md §P2-20

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { verifyPassword, createToken, COOKIE_NAME } from '@/lib/auth';
import { checkRateLimit, resetRateLimit, getClientIp, rateLimitHeaders } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const LoginSchema = z.object({
  username: z.string().trim().min(1).max(100),
  password: z.string().min(1).max(200),
});

const MAX_ATTEMPTS_PER_IP = 10;
const MAX_ATTEMPTS_PER_USER = 5;
const WINDOW_MS = 10 * 60 * 1000;

/** Pesan seragam agar tidak membocorkan apakah username terdaftar. */
const INVALID_CREDENTIALS = 'Username atau password salah';

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);

  const ipLimit = await checkRateLimit({
    key: `login:ip:${ip}`,
    limit: MAX_ATTEMPTS_PER_IP,
    windowMs: WINDOW_MS,
  });
  if (!ipLimit.ok) {
    return NextResponse.json(
      { error: 'Terlalu banyak percobaan login. Coba lagi dalam beberapa menit.' },
      { status: 429, headers: rateLimitHeaders(ipLimit) },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Body harus JSON yang valid.' }, { status: 400 });
  }

  const parsed = LoginSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Username dan password harus diisi' }, { status: 400 });
  }

  const { username, password } = parsed.data;

  const userLimit = await checkRateLimit({
    key: `login:user:${username.toLowerCase()}`,
    limit: MAX_ATTEMPTS_PER_USER,
    windowMs: WINDOW_MS,
  });
  if (!userLimit.ok) {
    return NextResponse.json(
      { error: 'Akun ini sementara dikunci karena terlalu banyak percobaan gagal.' },
      { status: 429, headers: rateLimitHeaders(userLimit) },
    );
  }

  try {
    const admin = await prisma.admin.findUnique({ where: { username } });

    if (!admin || !admin.isActive) {
      console.warn(`[auth] Login gagal (user tidak ditemukan/nonaktif) ip=${ip} user=${username}`);
      return NextResponse.json({ error: INVALID_CREDENTIALS }, { status: 401 });
    }

    const valid = await verifyPassword(password, admin.password);
    if (!valid) {
      console.warn(`[auth] Login gagal (password salah) ip=${ip} user=${username}`);
      return NextResponse.json({ error: INVALID_CREDENTIALS }, { status: 401 });
    }

    const token = await createToken({
      id: admin.id,
      username: admin.username,
      nama: admin.nama,
      role: admin.role === 'SUPERADMIN' ? 'SUPERADMIN' : 'ADMIN',
    });

    // Login sukses → bersihkan hitungan percobaan.
    await resetRateLimit(`login:user:${username.toLowerCase()}`);
    await resetRateLimit(`login:ip:${ip}`);

    const response = NextResponse.json({
      success: true,
      admin: { username: admin.username, nama: admin.nama, role: admin.role },
    });

    response.cookies.set(COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7, // 7 hari
    });

    return response;
  } catch (err) {
    console.error('[auth/login] Error:', err);
    return NextResponse.json({ error: 'Gagal login. Coba lagi nanti.' }, { status: 500 });
  }
}
