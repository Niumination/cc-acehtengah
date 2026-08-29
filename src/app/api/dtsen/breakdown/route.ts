// ─── GET /api/dtsen/breakdown — pecah agregat DTSEN per dimensi (tanpa LLM) ───
// @hotfix 29-Agu-2026: tombol "Pecah Jawaban" di output AI memakai endpoint ini.
// DETERMINISTIK murni dari rilis PUBLISHED (tidak ada panggilan model → hemat
// usage). Agregat k≥5 sudah disensor saat publish.
//
// Query params:
//   scope   = 'kecamatan' | 'desa' | 'desil'   (dimensi yang diminta)
//   kecamatan = filter kecamatan (untuk scope desa/desil)
//   desa      = filter desa (untuk scope desil)
//   program   = 'pbi' | 'pkh' | 'bpnt' | 'semua'  (hitung penerima bansos)
//
// Contoh:
//   /api/dtsen/breakdown?scope=kecamatan              → 14 kecamatan
//   /api/dtsen/breakdown?scope=desa&kecamatan=LINGE   → desa di Linge
//   /api/dtsen/breakdown?scope=desil&kecamatan=LINGE&desa=LUMUT
//   /api/dtsen/breakdown?scope=kecamatan&program=pbi  → penerima PBI per kecamatan

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 30;

export async function GET(req: NextRequest) {
  const scope = req.nextUrl.searchParams.get('scope') ?? 'kecamatan';
  const kecamatan = req.nextUrl.searchParams.get('kecamatan')?.toUpperCase() ?? null;
  const desa = req.nextUrl.searchParams.get('desa')?.toUpperCase() ?? null;
  const program = req.nextUrl.searchParams.get('program') ?? null;

  if (!['kecamatan', 'desa', 'desil'].includes(scope)) {
    return NextResponse.json({ error: `scope tidak dikenal: ${scope}` }, { status: 400 });
  }

  try {
    const release = await prisma.dtsenRelease.findFirst({
      where: { status: 'PUBLISHED' },
      orderBy: { publishedAt: 'desc' },
      select: { id: true, releaseNumber: true, status: true, publishedAt: true },
    });
    if (!release) {
      return NextResponse.json({ ok: false, error: 'Belum ada rilis DTSEN yang dipublish.' }, { status: 404 });
    }

    const baseWhere: any = { releaseId: release.id };
    if (kecamatan) baseWhere.kecamatan = { equals: kecamatan, mode: 'insensitive' };
    if (desa) baseWhere.desa = { equals: desa, mode: 'insensitive' };

    // ── Program bansos: hitung dari DtsenIndividu (bansos boolean) ──
    if (program && program !== 'semua') {
      const progMap: Record<string, { pkh: boolean; bpnt: boolean; pbi: boolean }> = {
        pbi: { pkh: false, bpnt: false, pbi: true },
        pkh: { pkh: true, bpnt: false, pbi: false },
        bpnt: { pkh: false, bpnt: true, pbi: false },
      };
      const filter = progMap[program];
      if (!filter) {
        return NextResponse.json({ error: `program tidak dikenal: ${program} (pilihan: pbi/pkh/bpnt)` }, { status: 400 });
      }

      // Prisma tidak punya field program per-individu (hanya bansos boolean).
      // Data BAPPEDA hanya memilah PBI (pbi_jk). pkh/bpnt = 0 di import ini.
      if (program !== 'pbi') {
        return NextResponse.json({
          ok: true,
          scope,
          program,
          release: { releaseNumber: release.releaseNumber, publishedAt: release.publishedAt },
          rows: [],
          total: 0,
          note: `Data BAPPEDA Des 2025 hanya memilah PBI (pbi_jk). Program ${program.toUpperCase()} tidak tersedia per-wilayah pada rilis ini.`,
        });
      }

      const grouped = await prisma.dtsenIndividu.groupBy({
        by: scope === 'desil' ? ['desil'] : scope === 'desa' ? ['desa'] : ['kecamatan'],
        where: { releaseId: release.id, bansos: true, ...(kecamatan ? { kecamatan: { equals: kecamatan, mode: 'insensitive' } } : {}), ...(desa ? { desa: { equals: desa, mode: 'insensitive' } } : {}) },
        _count: { _all: true },
      });
      const rows = grouped
        .filter((g) => {
          const v = scope === 'desil' ? g.desil : scope === 'desa' ? g.desa : g.kecamatan;
          return v !== null;
        })
        .map((g) => {
          const v = scope === 'desil' ? g.desil : scope === 'desa' ? g.desa : g.kecamatan;
          return { nama: scope === 'desil' ? `Desil ${v}` : v, nilai: g._count._all };
        })
        .sort((a, b) => b.nilai - a.nilai);

      return NextResponse.json({
        ok: true,
        scope,
        program,
        release: { releaseNumber: release.releaseNumber, publishedAt: release.publishedAt },
        total: rows.reduce((a, r) => a + r.nilai, 0),
        rows,
      });
    }

    // ── Tanpa program: agregat wilayah dari DtsenAgregatWilayah ──
    const grouped = await prisma.dtsenAgregatWilayah.groupBy({
      by: scope === 'desil' ? ['desil'] : scope === 'desa' ? ['desa'] : ['kecamatan'],
      where: baseWhere,
      _sum: { jiwa: true, kk: true },
    });
    const rows = grouped
      .filter((g) => {
        const v = scope === 'desil' ? g.desil : scope === 'desa' ? g.desa : g.kecamatan;
        return v !== null;
      })
      .map((g) => {
        const v = scope === 'desil' ? g.desil : scope === 'desa' ? g.desa : g.kecamatan;
        return { nama: scope === 'desil' ? `Desil ${v}` : v, jiwa: g._sum.jiwa ?? 0, keluarga: g._sum.kk ?? 0 };
      })
      .sort((a, b) => b.jiwa - a.jiwa);

    return NextResponse.json({
      ok: true,
      scope,
      program: null,
      release: { releaseNumber: release.releaseNumber, publishedAt: release.publishedAt },
      total: rows.reduce((a, r) => a + r.jiwa, 0),
      rows,
    });
  } catch (err) {
    console.error('[dtsen/breakdown] gagal:', err);
    return NextResponse.json(
      { ok: false, error: 'Gagal memecah data DTSEN.', detail: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}
