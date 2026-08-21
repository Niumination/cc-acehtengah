// ─── GET /api/ews — Early Warning System ───
//
// R2: kini membaca alert nyata yang dihasilkan evaluator ambang batas.
// Tetap mempertahankan pembedaan tiga keadaan dari §P1-07:
//   ok / unavailable / (0 alert = benar-benar aman).

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET() {
  try {
    const [alerts, thresholdCount, lastRun] = await Promise.all([
      prisma.ewsAlert.findMany({
        where: { resolvedAt: null },
        orderBy: [{ severity: 'desc' }, { createdAt: 'desc' }],
        take: 100,
        select: {
          id: true,
          pesan: true,
          severity: true,
          nilaiAktual: true,
          batas: true,
          tahun: true,
          createdAt: true,
          indicator: { select: { id: true, nama: true, satuan: true } },
        },
      }),
      prisma.indicatorThreshold.count({ where: { isActive: true } }),
      prisma.sapaSyncRun.findFirst({
        where: { status: 'SUCCESS' },
        orderBy: { startedAt: 'desc' },
        select: { startedAt: true },
      }),
    ]);

    return NextResponse.json({
      status: 'ok' as const,
      alerts,
      // Bila belum ada ambang batas, "0 alert" TIDAK berarti aman —
      // artinya belum ada yang dipantau. UI membedakan keduanya.
      thresholdCount,
      lastEvaluatedAt: lastRun?.startedAt ?? null,
    });
  } catch (err) {
    console.error('[ews] Gagal mengambil alert:', err);
    return NextResponse.json(
      {
        status: 'unavailable' as const,
        alerts: null,
        thresholdCount: null,
        error: 'Sistem peringatan dini tidak dapat dihubungi. Status indikator TIDAK diketahui.',
        errorCode: 'EWS_UNAVAILABLE',
      },
      { status: 503 },
    );
  }
}
