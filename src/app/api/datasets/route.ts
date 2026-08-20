// ─── GET /api/datasets — Daftar dataset terdaftar ───
//
// Sama seperti /api/ews: kegagalan DB tidak lagi disamarkan sebagai daftar kosong.
// Lihat LAPORAN_AUDIT_PRODUCTION_READINESS.md §P1-07

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET() {
  try {
    const datasets = await prisma.dataset.findMany({
      select: {
        slug: true,
        nama: true,
        deskripsi: true,
        isActive: true,
        lastSync: true,
        skpd: { select: { nama: true } },
        _count: { select: { records: true } },
      },
      orderBy: { nama: 'asc' },
    });

    return NextResponse.json({ datasets, status: 'ok' as const });
  } catch (err) {
    console.error('[datasets] Gagal mengambil dataset:', err);
    return NextResponse.json(
      {
        datasets: null,
        status: 'unavailable' as const,
        error: 'Database tidak dapat dihubungi.',
        errorCode: 'DB_UNAVAILABLE',
      },
      { status: 503 },
    );
  }
}
