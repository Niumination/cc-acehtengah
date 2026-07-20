import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getMockHealth } from '@/lib/mock-data';

export async function GET() {
  if (process.env.USE_MOCK_DATA === 'true') {
    return NextResponse.json(getMockHealth());
  }

  const services: Record<string, 'ok' | 'error'> = {};

  // Cek PostgreSQL
  try {
    await prisma.$queryRaw`SELECT 1`;
    services.db = 'ok';
  } catch {
    services.db = 'error';
  }

  // Cek Ollama
  try {
    const res = await fetch(`${process.env.OLLAMA_BASE_URL ?? 'http://localhost:11434'}/api/tags`, {
      signal: AbortSignal.timeout(5000),
    });
    services.ollama = res.ok ? 'ok' : 'error';
  } catch {
    services.ollama = 'error';
  }

  // Cek Qdrant
  try {
    const res = await fetch(`${process.env.QDRANT_URL ?? 'http://localhost:6333'}/collections`, {
      signal: AbortSignal.timeout(5000),
    });
    services.qdrant = res.ok ? 'ok' : 'error';
  } catch {
    services.qdrant = 'error';
  }

  // Cek SPLP
  try {
    const splpUrl = process.env.SPLP_BASE_URL;
    if (splpUrl) {
      const res = await fetch(`${splpUrl}/api/v1/health`, {
        signal: AbortSignal.timeout(5000),
        headers: { Authorization: `Bearer ${process.env.SPLP_TOKEN ?? ''}` },
      });
      services.splp = res.ok ? 'ok' : 'error';
    } else {
      services.splp = 'error';
    }
  } catch {
    services.splp = 'error';
  }

  const allOk = Object.values(services).every((s) => s === 'ok');

  return NextResponse.json({
    status: allOk ? 'healthy' : 'degraded',
    timestamp: new Date().toISOString(),
    services,
  });
}
