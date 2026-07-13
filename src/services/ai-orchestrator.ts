// ─── Otak AI Command Center — Enhanced ───

import { detectIntent } from './intent-detector';
import { callLLM } from './llm-client';
import { retrieveContext } from './rag-retriever';
import { fetchFromSplp } from '@/lib/splp-bridge';
import { HybridResponse } from '@/types';

// Simple in-memory cache untuk query yang sama dalam 5 menit
const queryCache = new Map<string, { response: HybridResponse; expiresAt: number }>();

function getCached(query: string): HybridResponse | null {
  const cached = queryCache.get(query);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.response;
  }
  queryCache.delete(query);
  return null;
}

function setCache(query: string, response: HybridResponse) {
  queryCache.set(query, { response, expiresAt: Date.now() + 5 * 60 * 1000 });
  // Bersihkan cache jika > 100 entries
  if (queryCache.size > 100) {
    const oldest = queryCache.keys().next().value;
    if (oldest) queryCache.delete(oldest);
  }
}

export async function processAIQuery(query: string): Promise<HybridResponse> {
  // Cek cache
  const cached = getCached(query);
  if (cached) return cached;

  try {
    // Step 1: Deteksi intent + dataset spesifik
    const intent = await detectIntent(query);

    // Step 2: Ambil data real-time dari SPLP (jika ada endpoint spesifik)
    let rawData: any = null;
    if (intent.butuhData && intent.splpEndpoint) {
      try {
        const response = await fetchFromSplp(intent.splpEndpoint);
        rawData = response.data;
      } catch {
        // SPLP offline
      }
    }

    // Step 3: Ambil konteks regulasi dari Vector DB
    const konteksRegulasi = await retrieveContext(query, intent.kategori);

    // Step 4: Panggil LLM dengan system prompt + data
    const systemPrompt = buildSystemPrompt(intent);
    const llmResponse = await callLLM(systemPrompt, {
      query,
      data: rawData,
      konteks: konteksRegulasi,
    });

    // Step 5: Parse & cache
    const result = parseHybridResponse(llmResponse, intent, rawData);
    setCache(query, result);
    return result;
  } catch (err) {
    // Fallback: jika LLM down, return narasi dari informasi yang ada
    console.error('[AI] Fallback triggered:', err);
    const fallback: HybridResponse = {
      narasi: 'Maaf, layanan AI sedang tidak tersedia. Silakan coba lagi nanti atau hubungi administrator.',
      visualisasi: { tipe: 'none', konfigurasi: {} },
      dataSource: 'offline',
      timestamp: new Date().toISOString(),
    };
    return fallback;
  }
}

function buildSystemPrompt(intent: { kategori: string; lokasi?: string }): string {
  return `Anda adalah AI Command Center Pemerintah Kabupaten Aceh Tengah.
Tugas: Membantu Kepala Daerah mengambil keputusan berbasis data.
${intent.lokasi ? `Lokasi fokus: ${intent.lokasi}` : ''}
Aturan:
- HANYA gunakan data riil yang diberikan. Jangan berasumsi.
- Jika data tidak cukup, katakan "Data tidak tersedia" — jangan mengarang.
- Gunakan Bahasa Indonesia formal.
- RESPON HYBRID JSON: {"narasi": "...", "visualisasi": {"tipe": "chart|table|map|metric|none", "konfigurasi": {...}}, "rekomendasi": ["..."]}`;
}

function parseHybridResponse(
  raw: string,
  _intent: { kategori: string },
  _rawData?: any,
): HybridResponse {
  try {
    const parsed = JSON.parse(raw);
    return {
      narasi: parsed.narasi ?? raw,
      visualisasi: parsed.visualisasi ?? { tipe: 'none', konfigurasi: {} },
      rekomendasi: parsed.rekomendasi,
      dataSource: 'SAPA + SPLP',
      timestamp: new Date().toISOString(),
    };
  } catch {
    return {
      narasi: raw,
      visualisasi: { tipe: 'none', konfigurasi: {} },
      dataSource: 'SAPA + SPLP',
      timestamp: new Date().toISOString(),
    };
  }
}
