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

    // Extract keyword — threshold降到2 huruf (misal: 'asn', 'gizi')
    const keywords = query.toLowerCase().split(/\s+/);
    const stopWords = new Set([
      'bagaimana', 'tentang', 'berapa', 'data', 'status', 'informasi',
      'untuk', 'dari', 'dengan', 'apa', 'siapa', 'dimana', 'kapan',
      'mengapa', 'adalah', 'ada', 'yang', 'di', 'dan', 'atau', 'ini',
      'itu', 'bisa', 'tolong', 'jelaskan', 'tampilkan', 'perlihatkan',
      'daftar', 'list', 'show', 'opd', 'sapa', 'kabupaten',
    ]);
    const indicatorKeywords = keywords.filter(
      (w) => w.length >= 2 && !stopWords.has(w) && !/^\d+$/.test(w),
    );

    // Search indicator names (full text match)
    if (indicatorKeywords.length > 0 && !opdFilter) {
      const indicatorFiltered = indicatorKeywords.flatMap((kw) => filterByIndicator(allRecords, kw));
      if (indicatorFiltered.length > 0) {
        filteredData = [...new Map(indicatorFiltered.map((r) => [r.id, r])).values()];
      }
    }

    // Step 4: Build rich context for LLM
    const allOpds = getUniqueOpd(allRecords);
    const allIndicators = getUniqueIndicators(allRecords);
    const filteredOpds = getUniqueOpd(filteredData);
    const filteredIndicators = getUniqueIndicators(filteredData);

    // Build compact data for LLM
    const dataForLLM = {
      ringkasan: {
        total_data: allRecords.length,
        total_opd: allOpds.length,
        total_indikator: allIndicators.length,
        opd_list: allOpds.map(o => `${o.nama}(${o.jumlah})`).join(', '),
        tahun: [...new Set(allRecords.map(r => r.tahun))].join(', '),
      },
      filtered: {
        count: filteredData.length,
        opd: opdFilter || 'semua',
        opd_ditemukan: filteredOpds.map(o => o.nama).join(', '),
        // Send ALL indicator names for keyword search (not just filtered)
        semua_indikator: allIndicators.map(i => i.nama).filter(Boolean).join('; '),
        indikator_relevan: filteredIndicators.map(i => i.nama).join('; '),
        // Send MORE samples — 25 records instead of 10
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
Tugas: Membantu Kepala Daerah mengambil keputusan berbasis data dari SAPA.

STATISTIK: ${totalOpd} OPD, ${totalIndicators} indikator, sumber: api-splp.layanan.go.id

ATURAN:
1. HANYA gunakan data riil yang diberikan. Jangan mengarang angka.
2. Jika data spesifik tidak ditemukan, TETAP tampilkan data terkait yang tersedia.
   Contoh: User tanya "jumlah ASN" → tampilkan "Jumlah kenaikan pangkat PNS tepat waktu: 62 (periode Triwulan IV)" atau indikator PNS lainnya yang ada.
   JANGAN langsung bilang "belum tersedia" tanpa menunjukkan data apa pun.
3. Selalu sebutkan OPD dan sumber data.
4. Gunakan Bahasa Indonesia formal, lugas, actionable.
5. Analisis bermakna — interpretasi, bukan sekadar membaca angka.
6. Jika user bertanya tentang topik tertentu (stunting, gizi, ASN, dll), cari di field "semua_indikator" untuk melihat indikator yang relevan, lalu tampilkan datanya dari field "sample".

VISUALISASI (pilih salah satu):
- "table" untuk daftar (columns, rows)
- "metric" untuk ringkasan angka (metrics: [{label, value, unit}])
- "chart" untuk tren (xKey, lines/bar, data array)
- "none" jika tidak perlu

FORMAT JSON:
{"narasi":"...","visualisasi":{"tipe":"table|metric|chart|none","konfigurasi":{...}},"rekomendasi":["..."]}`;
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
