// ─── GET /api/dtsen/release/[id] — detail untuk ditinjau sebelum publish ───
// Sampel yang dikembalikan HANYA bentuk terminimasi (nama masked + wilayah +
// desil). nikHash TIDAK PERNAH dikembalikan ke klien.
// Role: RESTRICTED_AGGR ke atas.

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAdminFromRequest } from '@/lib/auth';
import { decideDataAccess } from '@/lib/data-gate';
import { buildAgregatWilayah } from '@/services/dtsen-import';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await getAdminFromRequest(req);
  const decision = decideDataAccess(admin?.role ?? null, 'RESTRICTED_AGGR');
  if (!decision.ok) {
    return NextResponse.json({ error: 'Akses ditolak.' }, { status: decision.status });
  }

  const { id } = await params;
  try {
    const release = await prisma.dtsenRelease.findUnique({
      where: { id },
      select: {
        id: true, versi: true, jalur: true, status: true, totalBaris: true,
        ditolak: true, uploadedBy: true, publishedAt: true, createdAt: true, checksum: true,
      },
    });
    if (!release) return NextResponse.json({ error: 'Rilis tidak ditemukan.' }, { status: 404 });

    const rows = await prisma.dtsenIndividu.findMany({
      where: { releaseId: id },
      select: { namaMasked: true, keluargaId: true, kecamatan: true, desa: true, desil: true, nikHash: true, statusBansos: true },
    });

    // Preview agregat dihitung ulang deterministik dari baris terminimasi.
    const preview = buildAgregatWilayah(
      rows.map((r) => ({
        nikHash: r.nikHash,
        namaMasked: r.namaMasked,
        keluargaId: r.keluargaId,
        kecamatan: r.kecamatan,
        desa: r.desa,
        desil: r.desil ?? 0,
        statusBansos: { pkh: false, bpnt: false, pbi: false },
      })),
    );

    return NextResponse.json({
      release,
      sampelTerkover: rows.slice(0, 8).map((r) => ({
        namaMasked: r.namaMasked,
        kecamatan: r.kecamatan,
        desa: r.desa,
        desil: r.desil,
      })),
      sebaranKecamatan: Object.entries(
        rows.reduce<Record<string, number>>((acc, r) => {
          acc[r.kecamatan] = (acc[r.kecamatan] ?? 0) + 1;
          return acc;
        }, {}),
      )
        .sort((a, b) => b[1] - a[1])
        .map(([kecamatan, jiwa]) => ({ kecamatan, jiwa })),
      agregatPreview: {
        kelompokWilayahDesil: preview.rows.length,
        jiwaTerSensor: preview.jiwaTerSensor,
        kelompokTerSensor: preview.kelompokTerSensor,
        contoh: preview.rows.slice(0, 10),
      },
    });
  } catch (err) {
    console.error('[dtsen/release] gagal:', err);
    return NextResponse.json({ error: 'Gagal membaca rilis' }, { status: 500 });
  }
}
