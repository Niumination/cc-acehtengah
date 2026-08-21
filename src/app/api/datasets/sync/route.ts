// ─── POST /api/datasets/sync — Pemicu sinkronisasi manual (SUPERADMIN) ───
//
// Jalur otomatis ada di /api/cron/sync-sapa. Endpoint ini untuk pemicu manual
// oleh admin dari dashboard.
// Dua lapis proteksi: src/proxy.ts + verifikasi ulang peran di sini.

import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, COOKIE_NAME } from '@/lib/auth';
import { checkRateLimit, getClientIp, rateLimitHeaders } from '@/lib/rate-limit';
import { syncSapaToWarehouse } from '@/services/sapa-sync';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 300;

export async function POST(req: NextRequest) {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  const admin = token ? await verifyToken(token) : null;

  if (!admin) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }
  if (admin.role !== 'SUPERADMIN') {
    return NextResponse.json(
      { success: false, error: 'Hanya SUPERADMIN yang boleh menjalankan sinkronisasi.' },
      { status: 403 },
    );
  }

  const limit = await checkRateLimit({
    key: `sync:${admin.id}:${getClientIp(req)}`,
    limit: 3,
    windowMs: 10 * 60 * 1000,
  });
  if (!limit.ok) {
    return NextResponse.json(
      { success: false, error: 'Terlalu banyak permintaan sinkronisasi. Coba lagi nanti.' },
      { status: 429, headers: rateLimitHeaders(limit) },
    );
  }

  try {
    const ringkasan = await syncSapaToWarehouse();
    return NextResponse.json({ success: true, ...ringkasan });
  } catch (err) {
    console.error('[datasets/sync] Gagal:', err);
    return NextResponse.json(
      {
        success: false,
        error: 'Sinkronisasi gagal.',
        detail: err instanceof Error ? err.message : String(err),
      },
      { status: 503 },
    );
  }
}
