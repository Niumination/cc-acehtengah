// ─── GET /api/health — Status ketergantungan eksternal ───
//
// PERUBAHAN (LAPORAN_AUDIT_PRODUCTION_READINESS.md §P1-04)
//
// Sebelumnya mode mock mengembalikan bentuk yang BERBEDA dari mode live:
//   mock → { services: { db, ollama, qdrant, splp }, sapa: {...} }   ← Ollama sudah tak dipakai
//   live → { services: { sapa, ai, qdrant }, config: {...} }
// Konsumen mana pun akan pecah saat mode berganti. Sekarang satu tipe
// `HealthResponse` dipakai kedua jalur.
//
// Catatan keamanan: blok `config` tidak lagi membocorkan URL provider AI dan
// nama model ke publik — hanya menyebut apakah sudah dikonfigurasi.

import { NextResponse } from 'next/server';
import { isMockMode } from '@/lib/data-source';
import { isAuthConfigured } from '@/lib/auth';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type ServiceStatus = 'ok' | 'error' | 'skip';

interface HealthResponse {
  status: 'healthy' | 'degraded';
  mode: 'mock' | 'live';
  timestamp: string;
  services: {
    sapa: ServiceStatus;
    ai: ServiceStatus;
    qdrant: ServiceStatus;
    auth: ServiceStatus;
  };
  config: {
    sapaConfigured: boolean;
    aiConfigured: boolean;
    qdrantConfigured: boolean;
    authConfigured: boolean;
  };
}

const SAPA_HEALTH_URL = 'https://api-splp.layanan.go.id/sapa/1.0/api/daftar_data';

function summarize(services: HealthResponse['services']): 'healthy' | 'degraded' {
  return Object.values(services).some((s) => s === 'error') ? 'degraded' : 'healthy';
}

async function checkSapa(): Promise<ServiceStatus> {
  try {
    const res = await fetch(SAPA_HEALTH_URL, {
      signal: AbortSignal.timeout(10_000),
      headers: { 'Content-Type': 'application/json' },
    });
    if (!res.ok) return 'error';
    const json = await res.json();
    return json?.api_status === 1 ? 'ok' : 'error';
  } catch {
    return 'error';
  }
}

async function checkAi(): Promise<ServiceStatus> {
  const key = process.env.AI_API_KEY;
  if (!key) return 'skip';
  try {
    const baseUrl = process.env.AI_BASE_URL ?? 'https://opencode.ai/zen/v1';
    // Zen proxy tidak mengizinkan GET /models (403). Cek konektivitas ke
    // base URL root saja; validitas key/model diuji saat query sungguh.
    const res = await fetch(baseUrl, {
      method: 'HEAD',
      signal: AbortSignal.timeout(10_000),
      headers: { Authorization: `Bearer ${key}` },
    });
    // 2xx/3xx/401/403 semua berarti server terjangkau; 401/403 = key issue.
    return res.status < 500 ? 'ok' : 'error';
  } catch {
    return 'error';
  }
}

async function checkQdrant(): Promise<ServiceStatus> {
  const url = process.env.QDRANT_URL;
  if (!url) return 'skip';
  try {
    const res = await fetch(`${url}/collections`, { signal: AbortSignal.timeout(5_000) });
    return res.ok ? 'ok' : 'error';
  } catch {
    return 'error';
  }
}

export async function GET() {
  const authOk: ServiceStatus = isAuthConfigured() ? 'ok' : 'error';

  if (isMockMode()) {
    const services: HealthResponse['services'] = {
      sapa: 'skip',
      ai: 'skip',
      qdrant: 'skip',
      auth: authOk,
    };
    const payload: HealthResponse = {
      status: summarize(services),
      mode: 'mock',
      timestamp: new Date().toISOString(),
      services,
      config: {
        sapaConfigured: false,
        aiConfigured: false,
        qdrantConfigured: false,
        authConfigured: authOk === 'ok',
      },
    };
    return NextResponse.json(payload);
  }

  const [sapa, ai, qdrant] = await Promise.all([checkSapa(), checkAi(), checkQdrant()]);
  const services: HealthResponse['services'] = { sapa, ai, qdrant, auth: authOk };

  const payload: HealthResponse = {
    status: summarize(services),
    mode: 'live',
    timestamp: new Date().toISOString(),
    services,
    config: {
      sapaConfigured: true,
      aiConfigured: Boolean(process.env.AI_API_KEY),
      qdrantConfigured: Boolean(process.env.QDRANT_URL),
      authConfigured: authOk === 'ok',
    },
  };

  return NextResponse.json(payload, {
    status: payload.status === 'healthy' ? 200 : 503,
  });
}
