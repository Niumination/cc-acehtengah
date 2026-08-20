// ─── GET /api/ews — Early Warning System ───
//
// PERUBAHAN (LAPORAN_AUDIT_PRODUCTION_READINESS.md §P1-07)
//
// Versi sebelumnya menangkap error database lalu mengembalikan
// `200 {"alerts": []}`. Akibatnya panel EWS menampilkan
// "Semua indikator dalam batas normal" justru ketika sistem peringatan dini
// sedang buta total. Untuk sistem EWS, kegagalan senyap yang terlihat seperti
// kondisi aman adalah kelas kesalahan paling berbahaya.
//
// Sekarang: kegagalan dikembalikan sebagai 503 dengan errorCode, sehingga UI
// bisa membedakan "aman" dari "tidak diketahui".

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET() {
  try {
    const alerts = await prisma.ewsAlert.findMany({
      where: { resolvedAt: null },
      include: {
        indicator: {
          select: { nama: true, satuan: true, dataset: { select: { slug: true, nama: true } } },
        },
      },
      orderBy: [{ severity: 'asc' }, { createdAt: 'desc' }],
    });

    return NextResponse.json({ alerts, status: 'ok' as const });
  } catch (err) {
    console.error('[ews] Gagal mengambil alert:', err);
    return NextResponse.json(
      {
        alerts: null,
        status: 'unavailable' as const,
        error: 'Sistem peringatan dini tidak dapat dihubungi. Status indikator TIDAK diketahui.',
        errorCode: 'EWS_UNAVAILABLE',
      },
      { status: 503 },
    );
  }
}
