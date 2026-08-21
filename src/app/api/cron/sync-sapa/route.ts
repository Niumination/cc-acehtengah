// ─── GET/POST /api/cron/sync-sapa — Sinkronisasi SAPA + evaluasi EWS ───
//
// Dijadwalkan lewat `crons` di vercel.json. Inilah mesin yang membuat R1 (gudang
// data) dan R2 (EWS) benar-benar hidup: tanpa job ini, gudang data kosong dan
// tidak ada alert yang pernah dihasilkan.
//
// KEAMANAN: butuh `Authorization: Bearer <CRON_SECRET>`; bila tidak cocok → 404.

import { NextRequest, NextResponse } from 'next/server';
import { isCronAuthorized } from '@/lib/retention';
import { syncSapaToWarehouse } from '@/services/sapa-sync';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 300;

async function handler(req: NextRequest) {
  if (!isCronAuthorized(req.headers.get('authorization'), process.env.CRON_SECRET)) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  try {
    const ringkasan = await syncSapaToWarehouse();
    console.log('[cron/sync-sapa] Selesai:', ringkasan);
    return NextResponse.json({ success: true, ...ringkasan });
  } catch (err) {
    console.error('[cron/sync-sapa] Gagal:', err);
    return NextResponse.json(
      {
        success: false,
        error: 'Sinkronisasi gagal.',
        detail: err instanceof Error ? err.message : String(err),
      },
      { status: 503 },
    );
  }
}

export const GET = handler;
export const POST = handler;
