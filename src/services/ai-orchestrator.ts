// ─── AI Orchestrator — SAPA + Cloud AI (Optimized + Streaming) ───

import { detectIntent } from './intent-detector';
import { callLLM, streamLLM, extractNarasiPartial } from './llm-client';
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
import { prisma } from '@/lib/prisma';
import { ensureChatSessionTable } from '@/lib/db-migration';

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

// ─── Core pipeline: intent + fetch + filter + build context ───
async function buildContext(query: string) {
  const intent = await detectIntent(query);
  const opdFilter = (intent as any).opdFilter as string | undefined;

  const allRecords = await getCachedSapaData();

  let filteredData: SapaRecord[] = allRecords;
  if (opdFilter) {
    filteredData = filterByOpd(allRecords, opdFilter);
  }

  // Extract keyword — threshold 2 huruf (misal: 'asn', 'gizi')
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

  let matchedRecords: SapaRecord[] = [];
  if (indicatorKeywords.length > 0 && !opdFilter) {
    matchedRecords = indicatorKeywords.flatMap((kw) => filterByIndicator(allRecords, kw));
    matchedRecords = [...new Map(matchedRecords.map((r) => [r.id, r])).values()];
    if (matchedRecords.length > 0) {
      filteredData = matchedRecords;
    }
  }

  const allOpds = getUniqueOpd(allRecords);
  const allIndicators = getUniqueIndicators(allRecords);
  const filteredOpds = getUniqueOpd(filteredData);
  const filteredIndicators = getUniqueIndicators(filteredData);

  // Compact data for LLM — cap matched records to top 50 (smaller prompt = faster)
  const dataForLLM = {
    ringkasan: {
      total_data: allRecords.length,
      total_opd: allOpds.length,
      total_indikator: allIndicators.length,
      opd_list: allOpds.slice(0, 15).map(o => `${o.nama}(${o.jumlah})`).join(', '),
      tahun: [...new Set(allRecords.map(r => r.tahun))].join(', '),
    },
    filtered: {
      count: filteredData.length,
      opd: opdFilter || 'semua',
      opd_ditemukan: filteredOpds.map(o => o.nama).join(', '),
      indikator_relevan: filteredIndicators.slice(0, 30).map(i => i.nama).join('; '),
      data_ditemukan: filteredData.slice(0, 50).map((r) => ({
        opd: r.opds_nama_opd,
        indikator: r.kode_indikator_nama_indikator,
        nilai: r.variabel,
        satuan: r.satuan,
        tahun: r.tahun,
        periode: r.jadwal_pemutakhiran,
      })),
    },
  };

  const konteksRegulasi = await retrieveContext(query, intent.kategori);
  const systemPrompt = buildSystemPrompt(allOpds.length, allIndicators.length);

  return { intent, opdFilter, allRecords, filteredData, matchedRecords, dataForLLM, konteksRegulasi, systemPrompt };
}

// ─── Non-blocking DB save with latency metadata ───
async function saveChatSession(params: {
  query: string;
  intent: string;
  result: HybridResponse;
  metadata: Record<string, any>;
}) {
  try {
    await prisma.chatSession.create({
      data: {
        query: params.query,
        intent: params.intent,
        aiResponse: params.result as any,
        metadata: params.metadata,
      },
    });
  } catch (dbErr) {
    // Jangan sampai error DB menggagalkan response ke user
    console.error('[AI] DB save failed (non-blocking):', dbErr);
  }
}

export async function processAIQuery(query: string): Promise<HybridResponse> {
  const cached = getCached(query);
  if (cached) return cached;

  const startedAt = Date.now();
  const steps: Record<string, number> = {};

  try {
    // Step 1-3: intent + fetch + filter (context build)
    const ctx = await buildContext(query);
    steps.context = Date.now() - startedAt;

    // Step 4: Panggil LLM (non-streaming fallback path)
    const llmStarted = Date.now();
    const llmResponse = await callLLM(ctx.systemPrompt, {
      query,
      data: ctx.dataForLLM,
      konteks: ctx.konteksRegulasi,
    });
    steps.llm = Date.now() - llmStarted;

    // Step 5: Parse & cache
    const result = parseHybridResponse(llmResponse, ctx.filteredData);

    // Step 6: Simpan ke DB (non-blocking — tidak menunggu)
    const metadata = {
      opdFilter: ctx.opdFilter || null,
      totalData: ctx.allRecords.length,
      filteredCount: ctx.filteredData.length,
      matchedCount: ctx.matchedRecords.length,
      latencyMs: Date.now() - startedAt,
      stepsMs: steps,
      model: process.env.AI_MODEL,
      streamed: false,
    };
    void saveChatSession({ query, intent: ctx.intent.kategori, result, metadata });

    setCache(query, result);
    return result;
  } catch (err) {
    console.error('[AI] Fallback triggered:', err);
    const errorResult: HybridResponse = {
      narasi: `Maaf, terjadi kesalahan: ${err instanceof Error ? err.message : 'Unknown error'}. Silakan coba lagi.`,
      visualisasi: { tipe: 'none', konfigurasi: {} },
      dataSource: 'error',
      timestamp: new Date().toISOString(),
    };

    void saveChatSession({
      query,
      intent: 'error',
      result: errorResult,
      metadata: { error: err instanceof Error ? err.message : 'Unknown', latencyMs: Date.now() - startedAt },
    });

    return errorResult;
  }
}

/**
 * Streaming pipeline — onStatus() for progress events, onChunk() for narasi deltas.
 * Returns the final parsed HybridResponse.
 */
export async function processAIQueryStreaming(
  query: string,
  onStatus: (status: string) => void,
  onChunk: (delta: string) => void,
): Promise<HybridResponse> {
  const cached = getCached(query);
  if (cached) return cached;

  const startedAt = Date.now();
  const steps: Record<string, number> = {};

  try {
    // Step 1: Deteksi intent & ambil data
    onStatus('Menganalisis pertanyaan...');
    const ctx = await buildContext(query);
    steps.context = Date.now() - startedAt;

    // Step 2: Panggil LLM dengan streaming
    onStatus('AI sedang menyusun jawaban...');
    const llmStarted = Date.now();
    const llmResponse = await streamLLM(ctx.systemPrompt, { query, data: ctx.dataForLLM, konteks: ctx.konteksRegulasi }, onChunk);
    steps.llm = Date.now() - llmStarted;

    // Step 3: Parse & cache
    const result = parseHybridResponse(llmResponse, ctx.filteredData);

    // Step 4: Simpan ke DB (non-blocking)
    const metadata = {
      opdFilter: ctx.opdFilter || null,
      totalData: ctx.allRecords.length,
      filteredCount: ctx.filteredData.length,
      matchedCount: ctx.matchedRecords.length,
      latencyMs: Date.now() - startedAt,
      stepsMs: steps,
      model: process.env.AI_MODEL,
      streamed: true,
    };
    void saveChatSession({ query, intent: ctx.intent.kategori, result, metadata });

    setCache(query, result);
    return result;
  } catch (err) {
    console.error('[AI] Streaming fallback triggered:', err);
    const errorResult: HybridResponse = {
      narasi: `Maaf, terjadi kesalahan: ${err instanceof Error ? err.message : 'Unknown error'}. Silakan coba lagi.`,
      visualisasi: { tipe: 'none', konfigurasi: {} },
      dataSource: 'error',
      timestamp: new Date().toISOString(),
    };

    void saveChatSession({
      query,
      intent: 'error',
      result: errorResult,
      metadata: { error: err instanceof Error ? err.message : 'Unknown', latencyMs: Date.now() - startedAt },
    });

    return errorResult;
  }
}

/** Extract progressive narasi from accumulated LLM stream (for live rendering). */
export { extractNarasiPartial };

function buildSystemPrompt(totalOpd: number, totalIndicators: number): string {
  return `Anda adalah AI Command Center Pemerintah Kabupaten Aceh Tengah.
Tugas: Membantu Kepala Daerah mengambil keputusan berbasis data dari SAPA.

STATISTIK: ${totalOpd} OPD, ${totalIndicators} indikator, sumber: api-splp.layanan.go.id

ATURAN:
1. HANYA gunakan data riil dari field "data_ditemukan". Jangan mengarang angka.
2. Tampilkan data yang ditemukan dengan format yang jelas (nilai + satuan + periode).
3. Jika data spesifik tidak ada di "data_ditemukan", tampilkan data terkait dari "indikator_relevan".
4. Selalu sebutkan OPD dan sumber data.
5. Gunakan Bahasa Indonesia formal, lugas, actionable.
6. Analisis bermakna — interpretasi, bukan sekadar membaca angka.

CONTOH RESPONS:
Query: "berapa jumlah ASN"
Data ditemukan: [{opd:"BKPSDM", indikator:"Jumlah ASN", nilai:"9694", satuan:"orang", periode:"2025"}]
→ "Berdasarkan data SAPA, jumlah ASN di Kabupaten Aceh Tengah adalah 9.694 orang (sumber: BKPSDM, periode 2025)."

VISUALISASI (pilih salah satu):
- "table" untuk daftar (columns, rows)
- "metric" untuk ringkasan angka (metrics: [{label, value, unit}])
- "chart" untuk tren (xKey, lines/bar, data array)
- "none" jika tidak perlu

FORMAT JSON:
{"narasi":"...","visualisasi":{"tipe":"table|metric|chart|none","konfigurasi":{}},"rekomendasi":["..."]}`;
}

/**
 * Robust JSON extraction — handles markdown code fences (```json ... ```),
 * surrounding prose, and truncated-but-complete objects.
 */
function extractJsonObject(raw: string): any | null {
  // Strip markdown code fences
  let cleaned = raw.replace(/```(?:json)?/gi, '').trim();

  // Fallback: if there's a JSON object anywhere, extract the first balanced {...}
  const start = cleaned.indexOf('{');
  if (start === -1) return null;
  cleaned = cleaned.slice(start);

  // Find matching closing brace (respecting strings)
  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let i = 0; i < cleaned.length; i++) {
    const ch = cleaned[i];
    if (inString) {
      if (escaped) escaped = false;
      else if (ch === '\\') escaped = true;
      else if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') inString = true;
    else if (ch === '{') depth++;
    else if (ch === '}') {
      depth--;
      if (depth === 0) {
        const candidate = cleaned.slice(0, i + 1);
        try {
          return JSON.parse(candidate);
        } catch {
          return null;
        }
      }
    }
  }
  return null;
}

function parseHybridResponse(raw: string, records: SapaRecord[]): HybridResponse {
  try {
    const parsed = extractJsonObject(raw) ?? JSON.parse(raw);
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
