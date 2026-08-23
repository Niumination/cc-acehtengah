// ─── POST /api/setup — Run DB migration (one-time) ───
// PR Lapis-0: TERKUNCI — wajib ADMIN_SETUP_TOKEN + header x-setup-token.

import { NextRequest, NextResponse } from 'next/server';
import { ensureChatSessionTable, ensureWarehouseTables } from '@/lib/db-migration';
import { isSetupAuthorized } from '@/lib/auth';

export async function POST(req: NextRequest) {
  if (!isSetupAuthorized(req)) {
    return NextResponse.json(
      { error: 'Setup dinonaktifkan. Butuh ADMIN_SETUP_TOKEN + header x-setup-token.' },
      { status: 403 },
    );
  }

  try {
    const chatOk = await ensureChatSessionTable();
    const warehouseOk = await ensureWarehouseTables();
    if (chatOk && warehouseOk) {
      return NextResponse.json({
        success: true,
        message: 'ChatSession + Warehouse (SapaSnapshot/SapaIndicatorValue + rantai EWS) ensured',
      });
    }
    return NextResponse.json(
      {
        success: false,
        message: `Gagal memastikan tabel (chat=${chatOk}, warehouse=${warehouseOk}) — cek Supabase permissions`,
      },
      { status: 500 },
    );
  } catch (err: any) {
    return NextResponse.json(
      {
        success: false,
        message: err.message || 'Unknown error',
      },
      { status: 500 },
    );
  }
}
