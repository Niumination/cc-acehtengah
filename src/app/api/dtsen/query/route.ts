// ─── POST /api/dtsen/query — pintu data restricted (PR-4a: kerangka fondasi) ───
// PR-4a membangun GERBANG + audit, bukan query engine: rilis DTSEN pertama
// baru masuk lewat PR-4b (impor manual) / PR-4d (API resmi). Sampai itu,
// route ini menjawab jujur "belum berisi data" HANYA untuk role yang sah.
// Matriks (desain §6.1): tanpa sesi → 401; ADMIN → 403; DTSEN_ANALYST/
// DTSEN_LOOKUP/SUPERADMIN → 200. Semua percobaan bersesi diaudit (UU PDP).
//
// Catatan arsitektur: route ini sengaja TIDAK mengimpor modul pipeline publik
// (/api/query) — pemisahan fisik dua jalur (desain §4).

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getAdminFromRequest } from '@/lib/auth';
import { checkRateLimit, getClientIp, rateLimitHeaders } from '@/lib/rate-limit';
import { decideDataAccess, buildAuditEntry } from '@/lib/data-gate';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// Lebih ketat dari /api/query publik: jalur restricted memang jarang & sensitif.
const RATE_PER_MINUTE = 5;
const RATE_PER_HOUR = 30;

const QuerySchema = z.object({
  query: z.string().trim().min(3).max(2000),
});

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  const perMinute = await checkRateLimit({ key: `dtsen:m:${ip}`, limit: RATE_PER_MINUTE, windowMs: 60_000 });
  if (!perMinute.ok) {
    return NextResponse.json({ error: 'Terlalu banyak permintaan. Tunggu sebentar.' }, { status: 429, headers: rateLimitHeaders(perMinute) });
  }
  const perHour = await checkRateLimit({ key: `dtsen:h:${ip}`, limit: RATE_PER_HOUR, windowMs: 3_600_000 });
  if (!perHour.ok) {
    return NextResponse.json({ error: 'Kuota per jam tercapai.' }, { status: 429, headers: rateLimitHeaders(perHour) });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Body harus JSON yang valid.' }, { status: 400 });
  }
  const parsed = QuerySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Query tidak valid', detail: parsed.error.flatten() }, { status: 400 });
  }
  const { query } = parsed.data;

  // ─── Gerbang fail-closed — otorisasi SEBELUM menyentuh tabel restricted ───
  const admin = await getAdminFromRequest(req);
  const decision = decideDataAccess(admin?.role ?? null, 'RESTRICTED_AGGR');

  if (!decision.ok) {
    // Percobaan DENGAN sesi (tapi role kurang) diaudit — sinyal keamanan penting.
    // Tanpa sesi (401) tidak ada identitas untuk diaudit.
    if (admin) {
      try {
        await prisma.dataAccessAudit.create({
          data: buildAuditEntry({ admin, aksi: 'QUERY_DTSEN_DITOLAK', detail: query, ip }),
        });
      } catch {}
    }
    return NextResponse.json(
      {
        error: decision.status === 401
          ? 'Data DTSEN terbatas — login dengan akun berrole DTSEN diperlukan.'
          : `Role Anda tidak berhak mengakses DTSEN agregat (butuh: ${decision.requiredRoles?.join(' / ')}).`,
      },
      { status: decision.status },
    );
  }

  // ─── Terotorisasi → audit wajib SEBELUM menjawab (desain §6.3) ───
  try {
    await prisma.dataAccessAudit.create({
      data: buildAuditEntry({ admin: admin!, aksi: 'QUERY_DTSEN', detail: query, ip, rowCount: 0 }),
    });
  } catch (err) {
    // Audit gagal = tabel fondasi belum ada → fail-closed, jangan setengah hati.
    console.error('[dtsen/query] audit write failed:', err);
    return NextResponse.json(
      { error: 'Fondasi tabel DTSEN belum dibuat. Jalankan sekali: POST /api/setup dengan x-setup-token.' },
      { status: 409 },
    );
  }

  const source = await prisma.dataSource.findUnique({ where: { slug: 'dtsen' } }).catch(() => null);

  // PR-4a: belum ada rilis yang di-load → jawaban jujur, tetap ber-provenance.
  return NextResponse.json({
    ok: true,
    source: source?.slug ?? 'dtsen',
    provenance: source?.provenanceLabel ?? 'DTSEN — Kemensos/BPS (menunggu rilis resmi)',
    results: [],
    message:
      'Fondasi akses DTSEN aktif dan permintaan Anda tercatat di audit trail. ' +
      'Warehouse DTSEN belum berisi rilis data — rilis pertama masuk lewat impor manual atau API resmi.',
  });
}
