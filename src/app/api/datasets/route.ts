// ─── GET /api/datasets — Indikator di gudang data (R1) ───
//
// Dulu endpoint ini membaca tabel `Dataset` yang tidak pernah terisi sehingga
// selalu mengembalikan daftar kosong. Kini membaca gudang data SAPA nyata.
// Lihat LAPORAN_AUDIT_PRODUCTION_READINESS.md §P1-10

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const QuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(200).catch(50),
  offset: z.coerce.number().int().min(0).max(100_000).catch(0),
  search: z.string().trim().max(200).optional(),
});

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const { limit, offset, search } = QuerySchema.parse({
    limit: url.searchParams.get('limit') ?? undefined,
    offset: url.searchParams.get('offset') ?? undefined,
    search: url.searchParams.get('search') ?? undefined,
  });

  const where = search
    ? { nama: { contains: search, mode: 'insensitive' as const } }
    : {};

  try {
    const [indicators, total, lastRun] = await Promise.all([
      prisma.sapaIndicator.findMany({
        where,
        orderBy: { nama: 'asc' },
        take: limit,
        skip: offset,
        select: {
          id: true,
          kode: true,
          nama: true,
          satuan: true,
          updatedAt: true,
          _count: { select: { observations: true, thresholds: true } },
        },
      }),
      prisma.sapaIndicator.count({ where }),
      prisma.sapaSyncRun.findFirst({
        where: { status: 'SUCCESS' },
        orderBy: { startedAt: 'desc' },
        select: { startedAt: true, recordCount: true, durationMs: true },
      }),
    ]);

    return NextResponse.json({
      status: 'ok' as const,
      indicators,
      total,
      limit,
      offset,
      lastSync: lastRun,
    });
  } catch (err) {
    console.error('[datasets] Gagal:', err);
    return NextResponse.json(
      {
        status: 'unavailable' as const,
        indicators: null,
        error: 'Database tidak dapat dihubungi.',
        errorCode: 'DB_UNAVAILABLE',
      },
      { status: 503 },
    );
  }
}
