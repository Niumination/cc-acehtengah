import { NextResponse } from 'next/server';
import { getMockHealth } from '@/lib/mock-data';

export async function GET() {
  if (process.env.USE_MOCK_DATA === 'true') {
    return NextResponse.json(getMockHealth());
  }

  const services: Record<string, 'ok' | 'error' | 'skip'> = {};

  // Cek SAPA API (public)
  try {
    const res = await fetch('https://api-splp.layanan.go.id/sapa/1.0/api/daftar_data', {
      signal: AbortSignal.timeout(10000),
      headers: { 'Content-Type': 'application/json' },
    });
    const json = await res.json();
    services.sapa = res.ok && json.api_status === 1 ? 'ok' : 'error';
  } catch {
    services.sapa = 'error';
  }

  // Cek AI Provider
  try {
    const aiKey = process.env.AI_API_KEY;
    const aiUrl = process.env.AI_BASE_URL ?? 'https://api.openai.com/v1';
    if (!aiKey) {
      services.ai = 'skip';
    } else {
      const res = await fetch(`${aiUrl}/models`, {
        signal: AbortSignal.timeout(10000),
        headers: { Authorization: `Bearer ${aiKey}` },
      });
      services.ai = res.ok ? 'ok' : 'error';
    }
  } catch {
    services.ai = 'error';
  }

  // Cek Qdrant (opsional)
  try {
    const qdrantUrl = process.env.QDRANT_URL;
    if (!qdrantUrl) {
      services.qdrant = 'skip';
    } else {
      const res = await fetch(`${qdrantUrl}/collections`, {
        signal: AbortSignal.timeout(5000),
      });
      services.qdrant = res.ok ? 'ok' : 'error';
    }
  } catch {
    services.qdrant = 'skip';
  }

  const allOk = Object.values(services).every((s) => s === 'ok' || s === 'skip');
  const anyError = Object.values(services).some((s) => s === 'error');

  return NextResponse.json({
    status: anyError ? 'degraded' : 'healthy',
    timestamp: new Date().toISOString(),
    services,
    config: {
      sapa: 'https://api-splp.layanan.go.id/sapa/1.0/api/daftar_data',
      ai: process.env.AI_BASE_URL ?? 'https://api.openai.com/v1',
      aiModel: process.env.AI_MODEL ?? 'gpt-4o-mini',
      qdrant: process.env.QDRANT_URL ?? '(not configured)',
    },
  });
}
