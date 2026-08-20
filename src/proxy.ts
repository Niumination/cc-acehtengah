// ─── Proxy (Next.js 16) — proteksi route ───
//
// Konvensi `middleware.ts` sudah deprecated di Next.js 16 dan TIDAK dijalankan
// oleh `next dev` bila file berada di root sementara `app/` ada di `src/`.
// Efeknya: seluruh proteksi auth mati saat pengembangan lokal.
// File ini harus berada di `src/proxy.ts` — sejajar dengan `src/app/`.
// Lihat: https://nextjs.org/docs/messages/middleware-to-proxy
//        LAPORAN_AUDIT_PRODUCTION_READINESS.md §P1-01
//
// CATATAN ARSITEKTUR: proxy adalah lapisan pertama, bukan satu-satunya.
// Setiap route handler sensitif WAJIB memverifikasi ulang sesi/peran sendiri
// (defense in depth) agar keamanan tidak bergantung pada satu file konvensi.

import { NextResponse, type NextRequest } from 'next/server';
import { verifyToken, COOKIE_NAME } from '@/lib/auth';

/** Path yang membutuhkan sesi admin yang valid. */
const PROTECTED_PATHS = [
  '/dashboard/laporan',
  '/dashboard/akun',
  '/api/chat-logs',
  '/api/datasets/sync',
] as const;

function isProtected(pathname: string): boolean {
  return PROTECTED_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

function unauthorized(req: NextRequest, reason: 'missing' | 'invalid'): NextResponse {
  const { pathname, search } = req.nextUrl;

  if (pathname.startsWith('/api/')) {
    return NextResponse.json(
      { error: reason === 'missing' ? 'Unauthorized' : 'Session expired' },
      { status: 401 },
    );
  }

  const loginUrl = new URL('/login', req.url);
  loginUrl.searchParams.set('from', `${pathname}${search}`);
  const res = NextResponse.redirect(loginUrl);

  // Bersihkan cookie yang sudah tidak valid agar tidak terjebak loop redirect.
  if (reason === 'invalid') {
    res.cookies.set(COOKIE_NAME, '', { path: '/', maxAge: 0 });
  }
  return res;
}

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (!isProtected(pathname)) {
    return NextResponse.next();
  }

  const token = req.cookies.get(COOKIE_NAME)?.value;
  if (!token) {
    return unauthorized(req, 'missing');
  }

  const admin = await verifyToken(token);
  if (!admin) {
    return unauthorized(req, 'invalid');
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/dashboard/laporan/:path*',
    '/dashboard/akun/:path*',
    '/api/chat-logs/:path*',
    '/api/datasets/sync/:path*',
  ],
};
