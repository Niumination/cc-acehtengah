// ─── GET /api/dtsen/releases — daftar rilis (ringkasan saja, tanpa individu) ───
// Role: RESTRICTED_AGGR ke atas. Tidak ada data pribadi di sini — hanya metadata.

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAdminFromRequest } from '@/lib/auth';
import { decideDataAccess } from '@/lib/data-gate';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const admin = await getAdminFromRequest(req);
  const decision = decideDataAccess(admin?.role ?? null, 'RESTRICTED_AGGR');
  if (!decision.ok) {
    return NextResponse.json(
      {
        error: decision.status === 401
          ? 'Data DTSEN terbatas — login dengan akun berrole DTSEN diperlukan.'
          : `Role Anda tidak berhak (butuh: ${decision.requiredRoles?.join(' / ')}).`,
      },
      { status: decision.status },
    );
  }

  try {
    const releases = await prisma.dtsenRelease.findMany({
      orderBy: { createdAt: 'desc' },
      take: 50,
      select: {
        id: true, versi: true, jalur: true, status: true,
        totalBaris: true, ditolak: true, uploadedBy: true,
        publishedAt: true, createdAt: true, checksum: true,
      },
    });
    return NextResponse.json({ releases });
  } catch (err) {
    console.error('[dtsen/releases] gagal:', err);
    return NextResponse.json(
      { error: 'Tabel fondasi belum dibuat. Jalankan POST /api/setup dengan x-setup-token.' },
      { status: 409 },
    );
  }
}
