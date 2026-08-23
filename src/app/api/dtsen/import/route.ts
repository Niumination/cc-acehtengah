// ─── POST /api/dtsen/import — impor manual CSV → staging (PR-4b) ───
// Alur ketat (desain §7.2): validasi template → baris kotor DITOLAK (dengan
// alasan per baris) → baris valid masuk STAGING dalam bentuk terminimasi
// (HMAC NIK + nama masked). CSV mentah & NIK mentah TIDAK PERNAH disimpan,
// TIDAK PERNAH dikembalikan di respons.
// Otorisasi: role RESTRICTED_PERSONAL (DTSEN_LOOKUP/SUPERADMIN) — via data-gate.

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAdminFromRequest } from '@/lib/auth';
import { checkRateLimit, getClientIp, rateLimitHeaders } from '@/lib/rate-limit';
import { decideDataAccess, buildAuditEntry } from '@/lib/data-gate';
import {
  parseAndValidateDtsenCsv,
  buildAgregatWilayah,
  importChecksum,
} from '@/services/dtsen-import';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 60;

const MAX_BODY_BYTES = 10 * 1024 * 1024; // 10 MB teks CSV
const CHUNK = 5000;

function audit(admin: any, aksi: 'IMPORT' | 'IMPORT_DITOLAK', detail: string, ip: string, rowCount = 0) {
  return prisma.dataAccessAudit
    .create({ data: buildAuditEntry({ admin, aksi, detail, ip, rowCount }) })
    .catch((e) => console.error('[dtsen/import] audit gagal:', e));
}

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  const rl = await checkRateLimit({ key: `dtsen:imp:${ip}`, limit: 10, windowMs: 3_600_000 });
  if (!rl.ok) {
    return NextResponse.json({ error: 'Kuota impor per jam tercapai.' }, { status: 429, headers: rateLimitHeaders(rl) });
  }

  const admin = await getAdminFromRequest(req);
  const decision = decideDataAccess(admin?.role ?? null, 'RESTRICTED_PERSONAL');
  if (!decision.ok) {
    if (admin) await audit(admin, 'IMPORT_DITOLAK', 'percobaan impor tanpa hak', ip);
    return NextResponse.json(
      {
        error: decision.status === 401
          ? 'Impor DTSEN terbatas — login dengan akun berrole DTSEN diperlukan.'
          : `Role Anda tidak berhak mengimpor (butuh: ${decision.requiredRoles?.join(' / ')}).`,
      },
      { status: decision.status },
    );
  }

  const secret = process.env.DTSEN_NIK_KEY ?? '';
  if (secret.length < 16) {
    return NextResponse.json(
      { error: 'DTSEN_NIK_KEY belum dikonfigurasi (min 16 karakter). Impor dinonaktifkan (fail-closed).' },
      { status: 409 },
    );
  }

  const raw = await req.text();
  if (raw.length === 0) {
    return NextResponse.json({ error: 'Body kosong — kirim teks CSV.' }, { status: 400 });
  }
  if (raw.length > MAX_BODY_BYTES) {
    return NextResponse.json({ error: 'Berkas terlalu besar (> 10 MB teks).' }, { status: 413 });
  }
  const filename = (req.nextUrl.searchParams.get('filename') ?? 'unggahan.csv').slice(0, 120);

  const result = parseAndValidateDtsenCsv(raw, secret);
  if (result.valid.length === 0) {
    await audit(admin!, 'IMPORT', `file=${filename} DITOLAK total: ${result.rejected[0]?.reason ?? 'tanpa baris valid'}`, ip);
    return NextResponse.json(
      {
        ok: false,
        error: 'Tidak ada baris valid yang bisa distaging.',
        totalDataLines: result.totalDataLines,
        rejected: result.rejected.slice(0, 100),
      },
      { status: 422 },
    );
  }

  const source = await prisma.dataSource.findUnique({ where: { slug: 'dtsen' } }).catch(() => null);
  if (!source) {
    return NextResponse.json(
      { error: 'Fondasi tabel belum ada. Jalankan sekali: POST /api/setup dengan x-setup-token.' },
      { status: 409 },
    );
  }

  try {
    const release = await prisma.dtsenRelease.create({
      data: {
        sourceId: source.id,
        versi: (req.nextUrl.searchParams.get('versi') ?? 'manual').slice(0, 60),
        jalur: 'MANUAL',
        status: 'STAGING',
        totalBaris: result.valid.length,
        ditolak: result.rejected.length,
        checksum: importChecksum(result.valid),
        uploadedBy: admin!.nama,
      },
    });
    for (let i = 0; i < result.valid.length; i += CHUNK) {
      await prisma.dtsenIndividu.createMany({
        data: result.valid.slice(i, i + CHUNK).map((r) => ({ releaseId: release.id, ...r })),
      });
    }

    const preview = buildAgregatWilayah(result.valid);
    await audit(
      admin!,
      'IMPORT',
      `file=${filename} valid=${result.valid.length} ditolak=${result.rejected.length} release=${release.id}`,
      ip,
      result.valid.length,
    );

    return NextResponse.json({
      ok: true,
      releaseId: release.id,
      status: 'STAGING',
      totalDataLines: result.totalDataLines,
      valid: result.valid.length,
      ditolak: result.rejected.length,
      rejectedSample: result.rejected.slice(0, 50),
      checksum: release.checksum,
      agregatPreview: {
        kelompokWilayahDesil: preview.rows.length,
        jiwaTerSensor: preview.jiwaTerSensor,
        kelompokTerSensor: preview.kelompokTerSensor,
      },
      message:
        'Rilis distaging (NIK sudah HMAC, nama ter-mask — data mentah tidak disimpan). ' +
        'Tinjau di halaman admin, lalu publish untuk menjadikannya rilis aktif.',
    });
  } catch (err) {
    console.error('[dtsen/import] gagal:', err);
    return NextResponse.json(
      { error: 'Gagal menulis staging', detail: err instanceof Error ? err.message : 'Unknown' },
      { status: 500 },
    );
  }
}
