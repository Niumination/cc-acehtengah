// ─── AI Orchestrator — SAPA + Cloud AI (Optimized + Streaming) ───

import { detectIntent } from './intent-detector';
import { callLLM, streamLLM, extractNarasiPartial, stripReasoningPrefix } from './llm-client';
import { retrieveContext } from './rag-retriever';
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
  const evidence = ordered.slice(0, 30).map((a) => ({
    opd: a.opd,
    indikator: a.nama,
    nilai: a.nilai,
    satuan: a.satuan,
    tahun: a.tahun,
    id: a.id,
  }));

  // Compact data for LLM — tanpa pretty-print 15k putus tengah
  const dataForLLM = {
    ringkasan: {
      total_data: normalizedRecords.length,
      total_opd: allOpds.length,
      total_indikator: allIndicators.length,
      opd_list: allOpds.slice(0, 20).map((o) => `${o.nama}(${o.jumlah})`).join(', '),
      tahun: [...new Set(normalizedRecords.map((r) => (r.tahun?.trim() || '')) .filter(Boolean))].join(', '),
      filterDipakai,
    },
    filtered: {
      count: filteredData.length,
      opd: opdFilter || 'semua',
      opd_ditemukan: filteredOpds.map((o) => o.nama).join(', '),
      indikator_relevan: filteredIndicators.slice(0, 40).map((i) => i.nama).join('; '),
      data_ditemukan: evidence,
      evidenceCount: evidence.length,
      agregat_total: aggregatedAll.length,
    },
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
    // Pastikan rekomendasi selalu ada (Gemini sering mengabaikan field ini)
    if (result.rekomendasi.length === 0) {
      result.rekomendasi = await ensureRekomendasi(result.narasi, ctx.filteredData);
    }
    // Auto-chart: kalau model tidak kasih visualisasi tapi ada data, generate diagram statistik
    if (result.visualisasi.tipe === 'none') {
      result.visualisasi = generateAutoChart(ctx.filteredData);
    }

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

    // Step 2: Panggil LLM dengan streaming
    onStatus('AI sedang menyusun jawaban...');
    const llmStarted = Date.now();
    const llmResponse = await streamLLM(ctx.systemPrompt, { query, data: ctx.dataForLLM, konteks: ctx.konteksRegulasi }, onChunk);
    steps.llm = Date.now() - llmStarted;

    // Step 3: Parse & cache
    const result = parseHybridResponse(llmResponse, ctx.filteredData);
    // Pastikan rekomendasi selalu ada (Gemini sering mengabaikan field ini)
    if (result.rekomendasi.length === 0) {
      result.rekomendasi = await ensureRekomendasi(result.narasi, ctx.filteredData);
    }
    // Auto-chart: kalau model tidak kasih visualisasi tapi ada data, generate diagram statistik
    if (result.visualisasi.tipe === 'none') {
      result.visualisasi = generateAutoChart(ctx.filteredData);
    }

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
Tugas: Membantu Kepala Daerah mengambil keputusan berbasis data dari SAPA.

STATISTIK: ${totalOpd} OPD, ${totalIndicators} indikator, sumber: api-splp.layanan.go.id

ATURAN WAJIB:
1. HANYA gunakan data riil dari field "data_ditemukan". Jangan mengarang angka.
2. Data "tahun":"terbaru" berarti indikator tanpa tahun spesifik — gunakan sebagai data terkini.
3. Tampilkan data yang ditemukan dengan format jelas (nilai + satuan + periode + OPD sumber).
4. Jika data spesifik tidak ada di "data_ditemukan", tampilkan data terkait dari "indikator_relevan".
5. Selalu sebutkan OPD dan sumber data.
6. Gunakan Bahasa Indonesia formal, lugas, actionable.
7. Analisis bermakna — interpretasi, bukan sekadar membaca angka.
8. WAJIB mengisi "rekomendasi" dengan 2-3 poin tindakan nyata & spesifik untuk Kepala Daerah (berdasarkan data di atas). JANGAN biarkan kosong.
9. Pilih "visualisasi" yang TEPAT:
   - "metric" → untuk 1 nilai utama (mis. "Jumlah ASN: 9.610 orang")
   - "table" → untuk daftar >3 baris detail (columns + rows)
   - "chart" → untuk perbandingan antar kategori / tren antar tahun / komposisi rasio
     * bar: {type:"bar", xKey:"indikator", data:[{indikator, nilai}], bars:["nilai"]}
     * line/area: untuk tren {type:"line", xKey:"tahun", data:[{tahun, nilai}], lines:["nilai"]}
     * pie/donut: untuk komposisi {type:"donut", xKey:"indikator", data:[{indikator, nilai}], lines:["nilai"]}
   - "none" hanya jika benar-benar tidak ada data untuk divisualisasikan.
   Untuk query angka tunggal, GUNAKAN "metric" (nilai utama) — bukan chart.

CONTOH RESPONS:
Query: "berapa jumlah ASN"
Data: [{opd:"BKPSDM", indikator:"Jumlah ASN", nilai:"9610", satuan:"orang", periode:"2026"}]
→ {
  "narasi": "Berdasarkan data SAPA (BKPSDM, 2026), jumlah ASN Kabupaten Aceh Tengah adalah 9.610 orang, terdiri dari PNS dan PPPK.",
  "visualisasi": {"tipe":"metric", "konfigurasi":{"metrics":[{"label":"Jumlah ASN", "value":"9.610", "unit":"orang"}]}},
  "rekomendasi": [
    "Lakukan audit kejelasan status 84 pegawai menyusul reorganisasi OPD untuk menghindari tumpang tindih penugasan.",
    "Susun roadmap penguatan kompetensi PPPK paruh waktu menuju pegawai penuh waktu guna efisiensi layanan."
  ]
}

FORMAT JSON (wajib valid, satu object):
{"narasi":"...","visualisasi":{"tipe":"table|metric|chart|none","konfigurasi":{}},"rekomendasi":["...","..."]}`;
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

  // Fallback: model tidak mengembalikan JSON valid.
  // JANGAN tampilkan JSON mentah sebagai narasi.
  const fallbackNarasi = extractReadableNarasi(cleanedInput);
  return {
    narasi: fallbackNarasi,
    visualisasi: generateAutoChart(records),
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

/**
 * Auto-generate a statistical chart from SAPA records when the model
 * didn't provide a visualization. Uses aggregated indicator values.
 */
function generateAutoChart(records: SapaRecord[]): { tipe: 'chart' | 'table' | 'metric'; konfigurasi: Record<string, any> } {
  const aggregated = aggregateByIndicator(records);
  const entries = aggregated.slice(0, 12);

  // 1 nilai utama → metric (lebih tepat dari chart)
  if (entries.length === 1) {
    const e = entries[0];
    return {
      tipe: 'metric',
      konfigurasi: {
        metrics: [{ label: e.nama, value: e.nilaiNumber, unit: e.satuan ?? '' }],
      },
    };
  }

  // >8 indikator → table (lebih rapi & readable daripada bar chart ramai)
  if (entries.length > 8) {
    return {
      tipe: 'table',
      konfigurasi: {
        columns: ['Indikator', 'Nilai', 'Satuan'],
        rows: entries.map((e) => [e.nama, e.nilaiNumber, e.satuan ?? '']),
      },
    };
  }

  // 2-8 indikator → bar chart (perbandingan)
  return {
    tipe: 'chart',
    konfigurasi: {
      type: 'bar',
      xKey: 'indikator',
      data: entries.map((e) => ({
        indikator: e.nama.length > 35 ? e.nama.slice(0, 32) + '…' : e.nama,
        nilai: e.nilaiNumber,
        satuan: e.satuan,
      })),
      bars: ['nilai'],
    },
  };
}

/**
 * Fallback: kalau model tidak mengisi rekomendasi (Gemini sering skip field ini),
 * panggil LLM sekali lagi secara ringkas HANYA untuk menghasilkan 2-3 rekomendasi
 * berdasarkan narasi + data. Murah (max_tokens kecil). Kalau tetap gagal, pakai
 * heuristic dari data SAPA.
 */
async function ensureRekomendasi(narasi: string, records: SapaRecord[]): Promise<string[]> {
  try {
    const prompt = `Anda asisten kebijakan Pemkab Aceh Tengah. Berdasarkan narasi berikut, buatkan 2-3 poin rekomendasi tindakan NYATA & SPESIFIK untuk Kepala Daerah. Respons HANYA array JSON string, tanpa teks lain.\n\nNARASI:\n${narasi.slice(0, 1500)}`;
    const out = await callLLM(prompt, { query: 'rekomendasi', data: { ringkasan: { count: records.length } }, konteks: [] });
    const cleaned = stripReasoningPrefix(out).trim();
    const m = cleaned.match(/\[[\s\S]*\]/);
    if (m) {
      const arr = JSON.parse(m[0]);
      if (Array.isArray(arr) && arr.length > 0) {
        return arr.filter((x: any) => typeof x === 'string' && x.trim()).map((x: string) => x.trim()).slice(0, 3);
      }
    }
  } catch (e) {
    console.error('[AI] ensureRekomendasi gagal:', e);
  }
  const top = aggregateByIndicator(records).slice(0, 3);
  if (top.length > 0) {
    return [
      `Tinjau kembali indikator "${top[0].nama}" (${top[0].nilaiNumber} ${top[0].satuan ?? ''}) sebagai prioritas penyusunan kebijakan.`,
      'Lakukan verifikasi silang data dengan OPD terkait untuk memastikan akurasi sebelum pengambilan keputusan.',
      'Susun tindak lanjut berbasis data untuk peningkatan layanan publik di Kabupaten Aceh Tengah.',
    ];
  }
  return ['Lengkapi data SAPA untuk mendukung analisis yang lebih mendalam.', 'Koordinasikan antar-OPD guna penyelarasan indikator pembangunan.'];
}

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
