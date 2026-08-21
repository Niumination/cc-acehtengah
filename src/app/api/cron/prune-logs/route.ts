// ─── GET/POST /api/cron/prune-logs — Jalankan retensi log kueri AI ───
//
// Kebijakannya ada di src/lib/retention.ts (murni & teruji); route ini hanya
// lapisan HTTP + akses database.
// Lihat LAPORAN_AUDIT_PRODUCTION_READINESS.md §P2-19
//
// KEAMANAN: butuh `Authorization: Bearer <CRON_SECRET>`. Bila tidak cocok →
// 404, agar keberadaan endpoint tidak terkonfirmasi ke pemindai otomatis.
// Dijadwalkan harian lewat `crons` di vercel.json.

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { isCronAuthorized, resolveRetentionDays, retentionCutoff } from '@/lib/retention';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 60;

async function prune(req: NextRequest) {
  if (!isCronAuthorized(req.headers.get('authorization'), process.env.CRON_SECRET)) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const retentionDays = resolveRetentionDays(process.env.CHAT_LOG_RETENTION_DAYS);
  const cutoff = retentionCutoff(retentionDays);

  try {
    const { count } = await prisma.chatSession.deleteMany({
      where: { createdAt: { lt: cutoff } },
    });

    console.log(
      `[cron/prune-logs] ${count} log dihapus (retensi ${retentionDays} hari, batas ${cutoff.toISOString()})`,
    );

    return NextResponse.json({
      success: true,
      deleted: count,
      retentionDays,
      cutoff: cutoff.toISOString(),
    });
  } catch (err) {
    console.error('[cron/prune-logs] Gagal:', err);
    return NextResponse.json(
      { success: false, error: 'Gagal menghapus log lama.', errorCode: 'DB_UNAVAILABLE' },
      { status: 503 },
    );
  }
}

// Vercel Cron memanggil dengan GET; POST untuk pemicu manual.
export const GET = prune;
export const POST = prune;
