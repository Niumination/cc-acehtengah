// ─── Guard untuk endpoint bootstrap/setup ───
//
// Endpoint setup menjalankan DDL dan bisa membuat akun admin. Sebelumnya
// endpoint ini terbuka untuk publik dan langsung men-seed kredensial default.
// Lihat: LAPORAN_AUDIT_PRODUCTION_READINESS.md §P0-02
//
// Aturan sekarang:
//   1. SETUP_ENABLED harus bernilai "true" (default: mati)
//   2. Header `x-setup-token` harus cocok dengan SETUP_TOKEN (min. 32 karakter)
//   3. Bila salah satu gagal → 404, bukan 401/403, agar keberadaan endpoint
//      tidak terkonfirmasi ke pemindai otomatis.
//
// Setelah bootstrap selesai, matikan kembali dengan SETUP_ENABLED=false.

import { NextResponse } from 'next/server';

const MIN_TOKEN_LENGTH = 32;

/** Perbandingan waktu-konstan agar tidak bocor lewat timing attack. */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

/** Mengembalikan NextResponse 404 bila akses ditolak, atau null bila diizinkan. */
export function guardSetupRoute(req: Request): NextResponse | null {
  const notFound = NextResponse.json({ error: 'Not found' }, { status: 404 });

  if (process.env.SETUP_ENABLED !== 'true') return notFound;

  const expected = process.env.SETUP_TOKEN;
  if (!expected || expected.length < MIN_TOKEN_LENGTH) return notFound;

  const provided = req.headers.get('x-setup-token');
  if (!provided || !timingSafeEqual(provided, expected)) return notFound;

  return null;
}
