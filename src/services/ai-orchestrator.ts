// ─── AI Orchestrator — SAPA + Cloud AI (Optimized) ───

import { detectIntent } from './intent-detector';
import { callLLM } from './llm-client';
import { retrieveContext } from './rag-retriever';
import {
  fetchSapaData,
  filterByOpd,
  filterByIndicator,
  getUniqueOpd,
  getUniqueIndicators,
  type SapaRecord,
} from '@/lib/sapa-client';
import { HybridResponse } from '@/types';

// ─── SAPA Data Cache (10 menit) ───
let sapaCache: { records: SapaRecord[]; expiresAt: number } | null = null;
const SAPA_CACHE_TTL = 10 * 60 * 1000;

async function getCachedSapaData(): Promise<SapaRecord[]> {
  if (sapaCache && sapaCache.expiresAt > Date.now()) {
    return sapaCache.records;
  }
  const records = await fetchSapaData();
  sapaCache = { records, expiresAt: Date.now() + SAPA_CACHE_TTL };
  return records;
}

// ─── LLM Response Cache (5 menit) ───
const queryCache = new Map<string, { response: HybridResponse; expiresAt: number }>();

function getCached(query: string): HybridResponse | null {
  const cached = queryCache.get(query);
  if (cached && cached.expiresAt > Date.now()) return cached.response;
  queryCache.delete(query);
  return null;
}

function setCache(query: string, response: HybridResponse) {
  queryCache.set(query, { response, expiresAt: Date.now() + 5 * 60 * 1000 });
  if (queryCache.size > 50) {
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

    // Step 2: Fetch SAPA data (cached)
    const allRecords = await getCachedSapaData();

    // Step 3: Filter sesuai intent
    let filteredData: SapaRecord[] = allRecords;
    if (opdFilter) {
      filteredData = filterByOpd(allRecords, opdFilter);
    }

    // Extract keyword dari query untuk filter indikator
    const keywords = query.toLowerCase().split(/\s+/);
    const stopWords = ['bagaimana', 'tentang', 'berapa', 'data', 'status', 'informasi', 'untuk', 'dari', 'dengan', 'apa', 'siapa', 'dimana', 'kapan', 'mengapa', 'adalah', 'ada', 'yang', 'di', 'dan', 'atau', 'ini', 'itu', 'bisa', 'tolong', 'jelaskan', 'tampilkan', 'perlihatkan', 'daftar', 'list', 'show', 'list', 'opd', 'sapa', 'aceh', 'tengah', 'kabupaten'];
    const indicatorKeywords = keywords.filter(
      (w) => w.length > 3 && !stopWords.includes(w),
    );
    if (indicatorKeywords.length > 0 && !opdFilter) {
      const indicatorFiltered = indicatorKeywords.flatMap((kw) => filterByIndicator(allRecords, kw));
      if (indicatorFiltered.length > 0) {
        filteredData = [...new Map(indicatorFiltered.map((r) => [r.id, r])).values()];
      }
    }

    // Step 4: Pre-aggregate data untuk LLM (lebih efektif)
    const allOpds = getUniqueOpd(allRecords);
    const allIndicators = getUniqueIndicators(allRecords);
    const filteredOpds = getUniqueOpd(filteredData);
    const filteredIndicators = getUniqueIndicators(filteredData);

    // Build concise data summary for LLM
    const dataForLLM = {
      ringkasan: {
        total_data: allRecords.length,
        total_opd: allOpds.length,
        total_indikator: allIndicators.length,
        daftar_opd_lengkap: allOpds.map(o => o.nama).join(', '),
        tahun_tersedia: [...new Set(allRecords.map(r => r.tahun))].sort().join(', '),
      },
      data_terfilter: {
        jumlah: filteredData.length,
        opd_filter: opdFilter || 'semua',
        opd_ditemukan: filteredOpds.map(o => o.nama).join(', '),
        indikator_ditemukan: filteredIndicators.map(i => i.nama).join('; '),
        sample: filteredData.slice(0, 25).map((r) => ({
          opd: r.opds_nama_opd,
          indikator: r.kode_indikator_nama_indikator,
          nilai: r.variabel,
          satuan: r.satuan,
          tahun: r.tahun,
          periode: r.jadwal_pemutakhiran,
        })),
      },
    };

    // Step 5: Ambil konteks regulasi (opsional)
    const konteksRegulasi = await retrieveContext(query, intent.kategori);

    // Step 6: Panggil LLM
    const systemPrompt = buildSystemPrompt(allOpds.length, allIndicators.length);
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

function buildSystemPrompt(totalOpd: number, totalIndicators: number): string {
  return `Anda adalah AI Command Center Pemerintah Kabupaten Aceh Tengah.
Tugas: Membantu Kepala Daerah mengambil keputusan berbasis data dari SAPA (Satu Pintu Akses Data).

STATISTIK SAPA SAAT INI:
- Total OPD: ${totalOpd}
- Total Indikator: ${totalIndicators}
- Sumber: api-splp.layanan.go.id

DATA YANG TERSEDIA:
Data SAPA berisi indikator pembangunan dari OPD pemerintah daerah Kabupaten Aceh Tengah.
Setiap record memiliki: nama OPD, nama indikator, nilai (variabel), satuan, tahun, dan periode pemutakhiran.

ATURAN PENTING:
1. HANYA gunakan data riil yang diberikan. Jangan berasumsi atau mengarang angka.
2. Jika data tidak cukup untuk menjawab, katakan dengan jelas: "Data mengenai [topik] belum tersedia di SAPA saat ini. Data yang tersedia mencakup [sebutkan data yang relevan]."
3. Selalu sebutkan OPD dan sumber data dalam jawaban.
4. Gunakan Bahasa Indonesia formal, lugas, dan actionable.
5. Berikan analisis yang bermakna — tidak hanya membaca angka, tapi juga interpretasi.
6. Jika data menunjukkan tren, analisis penyebab potensial.
7. Jika ada perbandingan antar OPD, bandingkan secara fair.

UNTUK VISUALISASI, pilih tipe yang paling cocok:
- "chart" untuk tren/comparasi (butuh: xKey, lines/bar, data array)
- "table" untuk daftar perbandingan (butuh: columns, rows)
- "metric" untuk ringkasan angka (butuh: metrics array dengan label, value, unit)
- "none" jika tidak perlu visualisasi

FORMAT RESPONS HARUS JSON:
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
    return {
      narasi: raw,
      visualisasi: { tipe: 'none', konfigurasi: {} },
      dataSource: 'SAPA Aceh Tengah (api-splp.layanan.go.id)',
      timestamp: new Date().toISOString(),
    };
  }
}
