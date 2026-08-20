// ─── POST /api/setup — Migrasi tabel ChatSession (TERKUNCI) ───
//
// Menjalankan DDL, jadi tidak boleh terbuka untuk publik.
// Lihat: LAPORAN_AUDIT_PRODUCTION_READINESS.md §P0-02

import { NextResponse } from 'next/server';
import { ensureChatSessionTable } from '@/lib/db-migration';
import { guardSetupRoute } from '@/lib/setup-guard';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(req: Request) {
  const denied = guardSetupRoute(req);
  if (denied) return denied;

  try {
    const ok = await ensureChatSessionTable();
    if (ok) {
      return NextResponse.json({
        success: true,
        message: 'Tabel ChatSession berhasil dibuat/diverifikasi.',
      });
    }
    return NextResponse.json(
      {
        success: false,
        error: 'Gagal membuat tabel ChatSession — periksa hak akses database.',
      },
      { status: 500 },
    );
  } catch (err) {
    console.error('[setup] Error:', err);
    return NextResponse.json(
      { success: false, error: 'Gagal menjalankan migrasi.' },
      { status: 500 },
    );
  }
}
