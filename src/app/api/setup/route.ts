// ─── POST /api/setup — Run DB migration (one-time) ───
// PR Lapis-0: TERKUNCI — wajib ADMIN_SETUP_TOKEN + header x-setup-token.

import { NextRequest, NextResponse } from 'next/server';
import { ensureChatSessionTable } from '@/lib/db-migration';
import { isSetupAuthorized } from '@/lib/auth';

export async function POST(req: NextRequest) {
  if (!isSetupAuthorized(req)) {
    return NextResponse.json(
      { error: 'Setup dinonaktifkan. Butuh ADMIN_SETUP_TOKEN + header x-setup-token.' },
      { status: 403 },
    );
  }

  try {
    const ok = await ensureChatSessionTable();
    if (ok) {
      return NextResponse.json({
        success: true,
        message: 'ChatSession table created/verified successfully',
      });
    }
    return NextResponse.json(
      {
        success: false,
        message: 'Failed to create ChatSession table — check Supabase permissions',
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
