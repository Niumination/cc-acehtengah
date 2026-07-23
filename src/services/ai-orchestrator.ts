// ─── AI Orchestrator — SAPA + Cloud AI ───

import { detectIntent } from './intent-detector';
import { callLLM } from './llm-client';
import { retrieveContext } from './rag-retriever';
import {
  fetchSapaData,
  filterByOpd,
  filterByIndicator,
  getSapaSummary,
  type SapaRecord,
} from '@/lib/sapa-client';
import { HybridResponse } from '@/types';

// In-memory cache (5 menit)
const queryCache = new Map<string, { response: HybridResponse; expiresAt: number }>();

function getCached(query: string): HybridResponse | null {
  const cached = queryCache.get(query);
  if (cached && cached.expiresAt > Date.now()) return cached.response;
  queryCache.delete(query);
  return null;
}

function setCache(query: string, response: HybridResponse) {
  queryCache.set(query, { response, expiresAt: Date.now() + 5 * 60 * 1000 });
  if (queryCache.size > 100) {
    const oldest = queryCache.keys().next().value;
    if (oldest) queryCache.delete(oldest);
  }
}

export async function processAIQuery(query: string): Promise<HybridResponse> {
  const cached = getCached(query);
  if (cached) return cached;

  try {
    // Step 1: Deteksi intent
    const intent = await detectIntent(query);
    const opdFilter = (intent as any).opdFilter as string | undefined;

    // Step 2: Fetch semua data SAPA
    const allRecords = await fetchSapaData();

    // Step 3: Filter sesuai intent
    let filteredData: SapaRecord[] = allRecords;
    if (opdFilter) {
      filteredData = filterByOpd(allRecords, opdFilter);
    }

    // Extract keyword dari query untuk filter indikator
    const keywords = query.toLowerCase().split(/\s+/);
    const indicatorKeywords = keywords.filter(
      (w) => w.length > 3 && !['bagaimana', 'tentang', 'berapa', 'data', 'status', 'informasi', 'untuk', 'dari', 'dengan'].includes(w),
    );
    if (indicatorKeywords.length > 0 && !opdFilter) {
      // Try filter by indicator keywords, keep all if no match
      const indicatorFiltered = indicatorKeywords.flatMap((kw) => filterByIndicator(allRecords, kw));
      if (indicatorFiltered.length > 0) {
        filteredData = [...new Map(indicatorFiltered.map((r) => [r.id, r])).values()];
      }
    }

    // Step 4: Ringkas data untuk LLM (jangan kirim 905 records mentah)
    const summary = getSapaSummary(allRecords);
    const filteredSummary = getSapaSummary(filteredData);

    // Build data untuk LLM — ringkas tapi informatif
    const dataForLLM = {
      ringkasan_sapa: summary,
      data_filtered: {
        total: filteredData.length,
        opd_filter: opdFilter ?? 'semua',
        ringkasan: filteredSummary,
        sample_data: filteredData.slice(0, 30).map((r) => ({
          indikator: r.kode_indikator_nama_indikator,
          opd: r.opds_nama_opd,
          nilai: r.variabel,
          satuan: r.satuan,
          periode: r.jadwal_pemutakhiran,
          tahun: r.tahun,
        })),
      },
    };

    // Step 5: Ambil konteks regulasi (opsional, Qdrant offline = skip)
    const konteksRegulasi = await retrieveContext(query, intent.kategori);

    // Step 6: Panggil LLM
    const systemPrompt = buildSystemPrompt();
    const llmResponse = await callLLM(systemPrompt, {
      query,
      data: dataForLLM,
      konteks: konteksRegulasi,
    });

    // Step 7: Parse & cache
    const result = parseHybridResponse(llmResponse, filteredData);
    setCache(query, result);
    return result;
  } catch (err) {
    console.error('[AI] Fallback triggered:', err);
    return {
      narasi: `Maaf, terjadi kesalahan: ${err instanceof Error ? err.message : 'Unknown error'}. Silakan coba lagi.`,
      visualisasi: { tipe: 'none', konfigurasi: {} },
      dataSource: 'error',
      timestamp: new Date().toISOString(),
    };
  }
}

function buildSystemPrompt(): string {
  return `Anda adalah AI Command Center Pemerintah Kabupaten Aceh Tengah.
Tugas: Membantu Kepala Daerah mengambil keputusan berbasis data dari SAPA (Satu Pintu Akses Data).

Data yang tersedia adalah data SAPA real Kabupaten Aceh Tengah — indikator pembangunan dari 35+ OPD.

Aturan:
- HANYA gunakan data riil yang diberikan. Jangan berasumsi atau mengarang angka.
- Jika data tidak cukup untuk menjawab, katakan "Data tidak tersedia untuk pertanyaan ini."
- Gunakan Bahasa Indonesia formal.
- Berikan analisis yang actionable — tidak hanya membaca angka.
- Untuk visualisasi, pilih tipe yang paling cocok:
  * "chart" untuk tren/comparasi (butuh data: xKey, lines, data array)
  * "table" untuk daftar perbandingan (butuh data: columns, rows)
  * "metric" untuk ringkasan angka (butuh data: metrics array)
  * "none" jika tidak perlu visualisasi

Format respons JSON:
{"narasi": "...", "visualisasi": {"tipe": "chart|table|metric|none", "konfigurasi": {...}}, "rekomendasi": ["..."]}`;
}

function parseHybridResponse(raw: string, records: SapaRecord[]): HybridResponse {
  try {
    const parsed = JSON.parse(raw);
    return {
      narasi: parsed.narasi ?? raw,
      visualisasi: parsed.visualisasi ?? { tipe: 'none', konfigurasi: {} },
      rekomendasi: parsed.rekomendasi,
      dataSource: 'SAPA Aceh Tengah (api-splp.layanan.go.id)',
      timestamp: new Date().toISOString(),
    };
  } catch {
    // LLM tidak return JSON valid — bungkus sebagai narasi
    return {
      narasi: raw,
      visualisasi: { tipe: 'none', konfigurasi: {} },
      dataSource: 'SAPA Aceh Tengah (api-splp.layanan.go.id)',
      timestamp: new Date().toISOString(),
    };
  }
}
