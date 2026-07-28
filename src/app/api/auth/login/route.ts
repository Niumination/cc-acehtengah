// ─── POST /api/auth/login — Admin Login ───

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyPassword, createToken, COOKIE_NAME } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const { username, password } = await req.json();

    if (!username || !password) {
      return NextResponse.json(
        { error: 'Username dan password harus diisi' },
        { status: 400 },
      );
    }

    const admin = await prisma.admin.findUnique({
      where: { username },
    });

    if (!admin || !admin.isActive) {
      return NextResponse.json(
        { error: 'Username atau password salah' },
        { status: 401 },
      );
    }

    const valid = await verifyPassword(password, admin.password);
    if (!valid) {
      return NextResponse.json(
        { error: 'Username atau password salah' },
        { status: 401 },
      );
    }

    const token = await createToken({
      id: admin.id,
      username: admin.username,
      nama: admin.nama,
      role: admin.role,
    });

    const response = NextResponse.json({
      success: true,
      admin: { username: admin.username, nama: admin.nama, role: admin.role },
    });

    response.cookies.set(COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });

    return response;
  } catch (err) {
    console.error('[auth/login] Error:', err);
    return NextResponse.json(
      { error: 'Gagal login' },
      { status: 500 },
    );
  }
}
