// ─── Auto-migration: ensures ChatSession table exists ───

import { prisma } from '@/lib/prisma';

let tableReady = false;

export async function ensureChatSessionTable(): Promise<boolean> {
  if (tableReady) return true;

  try {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "ChatSession" (
        "id" TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
        "userId" TEXT,
        "query" TEXT NOT NULL,
        "intent" TEXT,
        "aiResponse" JSONB,
        "metadata" JSONB,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);
    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "ChatSession_createdAt_idx" ON "ChatSession"("createdAt" DESC);
    `);
    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "ChatSession_intent_idx" ON "ChatSession"("intent");
    `);
    tableReady = true;
    console.log('[db] ChatSession table ensured');
    return true;
  } catch (err) {
    console.error('[db] Auto-migration failed:', err);
    return false;
  }
}
