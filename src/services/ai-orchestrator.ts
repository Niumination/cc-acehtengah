// ─── Otak AI Command Center ───
// Alur: Query → Intent Classification → Function Calling → LLM → Response Hybrid

import { detectIntent, IntentResult } from './intent-detector';
import { callLLM } from './llm-client';
import { retrieveContext } from './rag-retriever';
import { fetchFromSplp } from '@/lib/splp-bridge';

export interface HybridResponse {
  narasi: string;
  visualisasi: {
    tipe: 'chart' | 'table' | 'map' | 'metric' | 'none';
    konfigurasi: Record<string, any>;
  };
  rekomendasi?: string[];
  dataSource: string;
  timestamp: string;
}

export async function processAIQuery(query: string): Promise<HybridResponse> {
  // Step 1: Deteksi intent
  const intent: IntentResult = await detectIntent(query);

  // Step 2: Ambil data dari SPLP (jika butuh data real-time)
  let rawData: any = null;
  if (intent.butuhData && intent.splpEndpoint) {
    try {
      const response = await fetchFromSplp(intent.splpEndpoint);
      rawData = response.data;
    } catch {
      // SPLP offline → lanjut tanpa data real-time
    }
  }

  // Step 3: Ambil konteks regulasi dari Vector DB (RAG)
  const konteksRegulasi = await retrieveContext(query, intent.kategori);

  // Step 4: Panggil LLM dengan data + konteks
  const systemPrompt = buildSystemPrompt(intent);
  const llmResponse = await callLLM(systemPrompt, {
    query,
    data: rawData,
    konteks: konteksRegulasi,
  });

  // Step 5: Parse respons hybrid
  return parseHybridResponse(llmResponse, intent);
}

function buildSystemPrompt(intent: IntentResult): string {
  return `Anda adalah AI Command Center Pemerintah Kabupaten Aceh Tengah.
Tugas: Membantu Kepala Daerah mengambil keputusan berbasis data.
Aturan:
- HANYA gunakan data riil yang diberikan di context. Jangan berasumsi.
- Jika data tidak cukup, katakan "Data tidak tersedia" — jangan mengarang.
- RESPON HYBRID: {
  "narasi": "penjelasan eksekutif < 200 kata",
  "visualisasi": { "tipe": "chart|table|map", "konfigurasi": {...} },
  "rekomendasi": ["opsi1", "opsi2"]
}
- Bahasa Indonesia formal namun mudah dipahami.
- Untuk pertanyaan tren, tampilkan data per periode.
- Untuk pertanyaan perbandingan, tampilkan antar SKPK atau kecamatan.`;
}

function parseHybridResponse(
  raw: string,
  _intent: IntentResult,
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
    // LLM tidak return JSON valid → bungkus sebagai narasi saja
    return {
      narasi: raw,
      visualisasi: { tipe: 'none', konfigurasi: {} },
      dataSource: 'SAPA + SPLP',
      timestamp: new Date().toISOString(),
    };
  }
}
