// ─── POST /api/datasets/sync — Sinkronisasi SAPA → DB (HANYA SUPERADMIN) ───
//
// Sebelumnya endpoint ini terbuka untuk publik: siapa pun bisa memicu fetch SAPA
// penuh + penulisan DB berulang kali (vektor DoS & pembengkakan biaya).
// Lihat: LAPORAN_AUDIT_PRODUCTION_READINESS.md §P0-04
//
// Dua lapis proteksi:
//   1. src/proxy.ts — menolak request tanpa sesi valid (401)
//   2. route ini    — memverifikasi ulang token & mewajibkan peran SUPERADMIN
//      (defense in depth: tidak bergantung pada satu file konvensi Next.js)

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { syncDataset, syncAllDatasets } from '@/services/data-sync';
import { handleApiError, successResponse } from '@/lib/error-handler';
import { verifyToken, COOKIE_NAME } from '@/lib/auth';
import { checkRateLimit, getClientIp, rateLimitHeaders } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 60;

const SyncRequestSchema = z
  .object({
    slug: z.string().min(1).max(100).optional(),
    all: z.boolean().optional(),
  })
  .refine((v) => v.all === true || typeof v.slug === 'string', {
    message: 'Tentukan salah satu: "slug" atau "all": true',
  });

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

  // Sinkronisasi itu mahal — batasi walau pemanggilnya admin.
  const limit = checkRateLimit({
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
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { success: false, error: 'Body harus JSON yang valid.' },
        { status: 400 },
      );
    }

    const parsed = SyncRequestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: 'Permintaan tidak valid', detail: parsed.error.flatten() },
        { status: 400 },
      );
    }

    if (parsed.data.all) {
      const results = await syncAllDatasets();
      return NextResponse.json(successResponse(results));
    }

    await syncDataset(parsed.data.slug!);
    return NextResponse.json(successResponse({ slug: parsed.data.slug, synced: true }));
  } catch (err) {
    return handleApiError(err);
  }
}
