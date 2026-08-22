// ─── AI Orchestrator — SAPA + Cloud AI (Optimized + Streaming) ───

import { detectIntent } from './intent-detector';
import { callLLM, streamLLM, extractNarasiPartial, stripReasoningPrefix } from './llm-client';
import { retrieveContext } from './rag-retriever';
import { groundOutput, buildVizFromEvidence } from './grounding';
import type { EvidenceItem } from './grounding';
import {
  fetchSapaData,
  filterByOpd,
  filterByAnyKeyword,
  filterByAllKeywords,
  getUniqueOpd,
  getUniqueIndicators,
  aggregateByIndicator,
  normalizeText,
  tokenizeQuery,
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
  const key = normalizeText(query);
  const cached = queryCache.get(key);
  if (cached && cached.expiresAt > Date.now()) return cached.response;
  queryCache.delete(key);
  return null;
}

function setCache(query: string, response: HybridResponse) {
  const key = normalizeText(query);
  queryCache.set(key, { response, expiresAt: Date.now() + 5 * 60 * 1000 });
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

  // Tahun dibiarkan apa adanya (null jika kosong) — jangan relabel 'terbaru'
  const normalizedRecords = allRecords;

  const tokens = tokenizeQuery(query);

  // Hierarchical selection: byOpd∩AND → AND → byOpd∩OR → OR → byOpd → kosong
  let filteredData: SapaRecord[] = [];
  let matchedRecords: SapaRecord[] = [];
  let filterDipakai: string = 'none';

  const byOpd = opdFilter ? filterByOpd(normalizedRecords, opdFilter) : [];
  const byAnd = tokens.length > 0 ? filterByAllKeywords(normalizedRecords, tokens) : [];
  const byOr = tokens.length > 0 ? filterByAnyKeyword(normalizedRecords, tokens) : [];

  if (opdFilter && tokens.length > 0) {
    const opdAnd = byOpd.filter((r) =>
      tokens.every((t) => normalizeText(r.kode_indikator_nama_indikator).includes(normalizeText(t))),
    );
    if (opdAnd.length > 0) {
      filteredData = opdAnd;
      filterDipakai = 'opd+AND';
    } else if (byAnd.length > 0) {
      filteredData = byAnd;
      filterDipakai = 'AND';
    } else {
      const opdOr = byOpd.filter((r) =>
        tokens.some((t) => normalizeText(r.kode_indikator_nama_indikator).includes(normalizeText(t))),
      );
      if (opdOr.length > 0) {
        filteredData = opdOr;
        filterDipakai = 'opd+OR';
      } else if (byOr.length > 0) {
        filteredData = byOr;
        filterDipakai = 'OR';
      } else if (byOpd.length > 0) {
        filteredData = byOpd;
        filterDipakai = 'opd';
      } else {
        filteredData = [];
        filterDipakai = 'none';
      }
    }
  } else if (opdFilter) {
    filteredData = byOpd;
    filterDipakai = byOpd.length > 0 ? 'opd' : 'none';
  } else if (tokens.length > 0) {
    if (byAnd.length > 0) {
      filteredData = byAnd;
      filterDipakai = 'AND';
    } else if (byOr.length > 0) {
      filteredData = byOr;
      filterDipakai = 'OR';
    } else {
      filteredData = [];
      filterDipakai = 'none';
    }
  } else {
    filteredData = [];
    filterDipakai = 'none';
  }

  matchedRecords = filteredData;

  const allOpds = getUniqueOpd(normalizedRecords);
  const allIndicators = getUniqueIndicators(normalizedRecords);
  const filteredOpds = getUniqueOpd(filteredData);
  const filteredIndicators = getUniqueIndicators(filteredData);

  // AGGREGASI per indikator
  const aggregated = aggregateByIndicator(filteredData);
  const aggregatedAll = aggregateByIndicator(normalizedRecords);

  // Prioritaskan indikator match token di depan payload
  const tokenNorm = tokens.map(normalizeText);
  const prioritized: typeof aggregated = [];
  const rest: typeof aggregated = [];
  for (const a of aggregated) {
    const namaNorm = normalizeText(a.nama);
    const hit = tokenNorm.some((t) => namaNorm.includes(t));
    (hit ? prioritized : rest).push(a);
  }
  const ordered = [...prioritized, ...rest];

  // Evidence cap 30 compact (bukan 150 pretty) — untuk grounding SoT
  const evidence: EvidenceItem[] = ordered.slice(0, 30).map((a) => ({
    opd: a.opd,
    indikator: a.nama,
    nilai: a.nilai,
    satuan: a.satuan,
    tahun: a.tahun,
    id: a.id,
  }));

  // SoT Fase C: payload ringkas — HANYA evidence (bukan pretty ringkasan 150 baris)
  const dataForLLM = {
    query,
    intent: intent.kategori,
    filterDipakai,
    evidence,
    evidenceCount: evidence.length,
    total_data: normalizedRecords.length,
  };

  const konteksRegulasi = await retrieveContext(query, intent.kategori);
  const systemPrompt = buildSystemPrompt(allOpds.length, allIndicators.length);

  return {
    intent,
    opdFilter,
    filterDipakai,
    allRecords: normalizedRecords,
    filteredData,
    matchedRecords,
    evidence,
    dataForLLM,
    konteksRegulasi,
    systemPrompt,
  };
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

    // SoT Fase C: jika evidence kosong → jangan panggil LLM
    if (ctx.evidence.length === 0) {
      const empty: HybridResponse = {
        narasi: 'Data untuk pertanyaan ini tidak ditemukan di SAPA.',
        visualisasi: { tipe: 'none', konfigurasi: {} },
        rekomendasi: [],
        dataSource: 'SAPA Aceh Tengah (api-splp.layanan.go.id)',
        timestamp: new Date().toISOString(),
      };
      const metadata = {
        opdFilter: ctx.opdFilter || null,
        filterDipakai: ctx.filterDipakai,
        evidenceCount: 0,
        grounding: 'pass' as const,
        totalData: ctx.allRecords.length,
        filteredCount: ctx.filteredData.length,
        latencyMs: Date.now() - startedAt,
        stepsMs: steps,
        model: process.env.AI_MODEL,
        streamed: false,
      };
      void saveChatSession({ query, intent: ctx.intent.kategori, result: empty, metadata });
      setCache(query, empty);
      return empty;
    }

    // Step 4: Panggil LLM (satu kali)
    const llmStarted = Date.now();
    const llmResponse = await callLLM(ctx.systemPrompt, {
      query,
      data: ctx.dataForLLM,
      konteks: ctx.konteksRegulasi,
    });
    steps.llm = Date.now() - llmStarted;

    // Step 5: Parse + grounding SoT
    const parsed = parseHybridResponse(llmResponse, ctx.filteredData);
    const { response: grounded, grounding, reason } = groundOutput(parsed, ctx.evidence, query);
    let result = grounded;
    // Viz dari evidence jika model tidak kasih atau grounding mengganti
    if (result.visualisasi.tipe === 'none' && ctx.evidence.length > 0) {
      result = { ...result, visualisasi: buildVizFromEvidence(ctx.evidence) };
    } else if (grounding === 'replaced') {
      // groundOutput sudah pakai viz dari evidence, pastikan konsisten
      result = { ...grounded, visualisasi: buildVizFromEvidence(ctx.evidence) };
    }

    // Step 6: Simpan ke DB (non-blocking — tidak menunggu)
    const metadata = {
      opdFilter: ctx.opdFilter || null,
      filterDipakai: ctx.filterDipakai,
      evidenceCount: ctx.evidence.length,
      grounding,
      groundingReason: reason ?? null,
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
      rekomendasi: [],
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

    // SoT: evidence kosong → jangan panggil LLM
    if (ctx.evidence.length === 0) {
      const empty: HybridResponse = {
        narasi: 'Data untuk pertanyaan ini tidak ditemukan di SAPA.',
        visualisasi: { tipe: 'none', konfigurasi: {} },
        rekomendasi: [],
        dataSource: 'SAPA Aceh Tengah (api-splp.layanan.go.id)',
        timestamp: new Date().toISOString(),
      };
      const metadata = {
        opdFilter: ctx.opdFilter || null,
        filterDipakai: ctx.filterDipakai,
        evidenceCount: 0,
        grounding: 'pass' as const,
        totalData: ctx.allRecords.length,
        filteredCount: ctx.filteredData.length,
        latencyMs: Date.now() - startedAt,
        stepsMs: steps,
        model: process.env.AI_MODEL,
        streamed: true,
      };
      void saveChatSession({ query, intent: ctx.intent.kategori, result: empty, metadata });
      setCache(query, empty);
      return empty;
    }

    // Step 2: Panggil LLM dengan streaming (satu kali)
    onStatus('AI sedang menyusun jawaban...');
    const llmStarted = Date.now();
    const llmResponse = await streamLLM(ctx.systemPrompt, { query, data: ctx.dataForLLM, konteks: ctx.konteksRegulasi }, onChunk);
    steps.llm = Date.now() - llmStarted;

    // Step 3: Parse + grounding SoT
    const parsed = parseHybridResponse(llmResponse, ctx.filteredData);
    const { response: grounded, grounding, reason } = groundOutput(parsed, ctx.evidence, query);
    let result = grounded;
    if (result.visualisasi.tipe === 'none' && ctx.evidence.length > 0) {
      result = { ...result, visualisasi: buildVizFromEvidence(ctx.evidence) };
    } else if (grounding === 'replaced') {
      result = { ...grounded, visualisasi: buildVizFromEvidence(ctx.evidence) };
    }

    // Step 4: Simpan ke DB (non-blocking)
    const metadata = {
      opdFilter: ctx.opdFilter || null,
      filterDipakai: ctx.filterDipakai,
      evidenceCount: ctx.evidence.length,
      grounding,
      groundingReason: reason ?? null,
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
      rekomendasi: [],
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
  return `Anda adalah SAPA Smart AI Pemerintah Kabupaten Aceh Tengah.
Tugas: Merumuskan data dalam field "evidence" menjadi narasi Bahasa Indonesia yang akurat.

STATISTIK: ${totalOpd} OPD, ${totalIndicators} indikator, sumber: api-splp.layanan.go.id

ATURAN WAJIB:
1. HANYA gunakan angka, tahun, nama OPD, dan nama indikator yang ada di "evidence". Jangan menambah angka baru.
2. Jika "evidence" kosong: jawab "Data untuk pertanyaan ini tidak ditemukan di SAPA." — jangan mengarang.
3. Tahun: gunakan nilai "tahun" dari evidence. Jika null/kosong → tulis "tahun tidak tercantum di SAPA".
4. Selalu sebutkan OPD dan satuan dari evidence.
5. Bahasa Indonesia formal, lugas, actionable. Narasi = interpretasi evidence, bukan membaca ulang mentah.
6. "rekomendasi": 0-3 kalimat TANPA angka baru. Jika tidak relevan, kosongkan ([]).
7. "visualisasi" HANYA dari evidence:
   - 1 item → "metric" {metrics:[{label, value, unit}]}
   - 2-8 item → "chart" bar {type:"bar", xKey:"indikator", data:[{indikator, nilai}], bars:["nilai"]}
   - >8 item → "table" {columns:["Indikator","Nilai","Satuan","OPD","Tahun"], rows}
   - kosong → "none"
8. Jangan menambah detail di luar evidence (contoh: pecahan PNS/PPPK, jumlah pegawai turunan, dsb).

FORMAT JSON (wajib valid, satu object):
{"narasi":"...","visualisasi":{"tipe":"metric|table|chart|none","konfigurasi":{}},"rekomendasi":["..."]}`;
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
  // Bersihkan dulu dari markdown fence / reasoning / prose di luar JSON
  const cleanedInput = stripReasoningPrefix(raw);
  const extracted = extractJsonObject(cleanedInput);

  if (extracted && typeof extracted === 'object') {
    const narasi = typeof extracted.narasi === 'string' ? extracted.narasi.trim() : '';
    // Jika narasi kosong TAPI ada field lain, jangan tampilkan JSON mentah
    if (narasi) {
      return {
        narasi,
        visualisasi: normalizeVisualization(extracted.visualisasi),
        rekomendasi: Array.isArray(extracted.rekomendasi) ? extracted.rekomendasi : [],
        dataSource: 'SAPA Aceh Tengah (api-splp.layanan.go.id)',
        timestamp: new Date().toISOString(),
      };
    }
  }

  // Fallback: model tidak mengembalikan JSON valid — viz tetap dari evidence
  const fallbackNarasi = extractReadableNarasi(cleanedInput);
  return {
    narasi: fallbackNarasi,
    visualisasi: { tipe: 'none', konfigurasi: {} },
    rekomendasi: [],
    dataSource: 'SAPA Aceh Tengah (api-splp.layanan.go.id)',
    timestamp: new Date().toISOString(),
  };
}

/**
 * Ekstrak narasi yang bisa dibaca dari output model yang gagal jadi JSON.
 * - Jika ada field "narasi":"..." (meski JSON corrupt), ambil itu.
 * - Jika murni prose (bukan JSON object), gunakan prose tersebut.
 * - Jika benar-benar JSON mentah tanpa narasi, kembalikan pesan ramah.
 */
function extractReadableNarasi(cleaned: string): string {
  // Coba ekstrak nilai narasi via regex (tangani JSON korup sebagian)
  const m = cleaned.match(/"narasi"\s*:\s*"((?:[^"\\]|\\.)*)"/);
  if (m) {
    const s = m[1].replace(/\\n/g, '\n').replace(/\\"/g, '"').replace(/\\\\/g, '\\').trim();
    if (s) return s;
  }

  const trimmed = cleaned.trim();
  // Jika output berupa JSON object mentah (diawali { dan bukan prose), jangan tampilkan mentah
  if (trimmed.startsWith('{') || trimmed.startsWith('[') || trimmed.startsWith('```')) {
    return 'Maaf, AI gagal memformat respons dengan benar. Silakan ajukan pertanyaan dengan kalimat yang lebih spesifik.';
  }
  // Prosa biasa — gunakan apa adanya (sudah dibersihkan dari reasoning)
  return trimmed || 'Maaf, AI tidak memberikan respons yang dapat ditampilkan. Silakan coba lagi.';
}

// Dihapus Fase C SoT: generateAutoChart & ensureRekomendasi (LLM ke-2) —
// Viz sekarang hanya dari evidence via buildVizFromEvidence; rekomendasi tanpa angka baru.


/**
 * Normalize visualization config to the format the frontend renderer expects:
 * - "metric"  → { metrics: [{label, value, unit}] } (accepts {nilai,satuan,label,detail} from some models)
 * - "table"   → { columns, rows } (accepts {kolom, baris})
 * - "chart"   → { type, xKey, data, lines } (accepts {jenis, sumbuX, data, garis})
 * - "none"    → {}
 */
function normalizeVisualization(vis: any): { tipe: 'chart' | 'table' | 'map' | 'metric' | 'none'; konfigurasi: Record<string, any> } {
  const rawTipe = vis?.tipe ?? 'none';
  const tipe: 'chart' | 'table' | 'map' | 'metric' | 'none' =
    ['chart', 'table', 'map', 'metric', 'none'].includes(rawTipe) ? rawTipe : 'none';
  const cfg = vis?.konfigurasi ?? {};

  if (tipe === 'metric') {
    // Format A (deepseek): { metrics: [{label, value, unit}] }
    if (Array.isArray(cfg.metrics)) {
      return { tipe, konfigurasi: { metrics: cfg.metrics } };
    }
    // Format B (ling): { nilai, satuan, label, detail: [{label, nilai, satuan}] }
    const metrics: any[] = [];
    if (cfg.nilai != null) {
      metrics.push({ label: cfg.label ?? 'Nilai', value: cfg.nilai, unit: cfg.satuan ?? '' });
    }
    if (Array.isArray(cfg.detail)) {
      for (const d of cfg.detail) {
        metrics.push({
          label: d.label ?? 'Nilai',
          value: d.nilai ?? d.value,
          unit: d.satuan ?? d.unit ?? '',
        });
      }
    }
    if (metrics.length > 0) return { tipe, konfigurasi: { metrics } };
    return { tipe, konfigurasi: {} };
  }

  if (tipe === 'table') {
    // Format B: { kolom, baris } → { columns, rows }
    if (Array.isArray(cfg.kolom)) {
      return { tipe, konfigurasi: { columns: cfg.kolom, rows: cfg.baris ?? [] } };
    }
    return { tipe, konfigurasi: { columns: cfg.columns ?? [], rows: cfg.rows ?? [] } };
  }

  if (tipe === 'chart') {
    // Format B: { jenis, sumbuX, data, garis } → { type, xKey, data, lines }
    return {
      tipe,
      konfigurasi: {
        type: cfg.type ?? cfg.jenis ?? 'bar',
        xKey: cfg.xKey ?? cfg.sumbuX ?? 'name',
        data: cfg.data ?? [],
        lines: Array.isArray(cfg.lines) ? cfg.lines : (Array.isArray(cfg.garis) ? cfg.garis : (Array.isArray(cfg.bars) ? cfg.bars : [])),
      },
    };
  }

  return { tipe, konfigurasi: cfg };
}
