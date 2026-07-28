// ─── POST /api/setup — Run DB migration (one-time) ───

import { NextResponse } from 'next/server';
import { ensureChatSessionTable } from '@/lib/db-migration';

export async function POST() {
  try {
    const ok = await ensureChatSessionTable();
    if (ok) {
      return NextResponse.json({
        success: true,
        message: 'ChatSession table created/verified successfully',
      });
    }
    return NextResponse.json({
      success: false,
      message: 'Failed to create ChatSession table — check Supabase permissions',
    }, { status: 500 });
  } catch (err: any) {
    return NextResponse.json({
      success: false,
      message: err.message || 'Unknown error',
    }, { status: 500 });
  }
}
