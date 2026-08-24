// ─── AI Orchestrator — SAPA + Cloud AI (Optimized + Streaming) ───

import { detectIntent } from './intent-detector';
import { callLLM, streamLLM, extractNarasiPartial, stripReasoningPrefix } from './llm-client';
import { retrieveContext } from './rag-retriever';
import { groundOutput, buildVizFromEvidence, buildDeterministicNarasi } from './grounding';
import type { EvidenceItem } from './grounding';
import type { Prisma } from '@prisma/client';

/** Metrik longgar untuk konfigurasi visualisasi 'metric' (payload LLM tidak terjamin bentuknya). */
interface MetricItem {
  label?: unknown;
  value?: unknown;
  unit?: unknown;
}

const VIZ_TIPE_LIST = ['chart', 'table', 'map', 'metric', 'none'] as const;
type VizTipe = (typeof VIZ_TIPE_LIST)[number];
import {
  fetchSapaData,
  dataSourceLabel,
  filterByOpd,
  getUniqueOpd,
  getUniqueIndicators,
  aggregateByIndicator,
  normalizeText,
  tokenizeQuery,
  buildMatchGroups,
  scoreRecord,
  stemId,
  extractYears,
  type MatchGroup,
  type SapaRecord,
  type SapaDataOrigin,
} from '@/lib/sapa-client';
import { detectMetaQuery, buildMetaResponse } from './meta-query';
import {
  publicDeflectionKind,
  buildPublicDeflectionNarasi,
  PUBLIC_DEFLECTION_REKOMENDASI,
  planDtsenQuery,
  fetchDtsenAgregatPublik,
} from './dtsen-planner';
import {
  isTrendQuery,
  findTrendCandidate,
  buildTrendResponse,
  buildTrendUnavailableResponse,
  isComparisonQuery,
  detectOpdsInQuery,
  buildOpdComparisonRows,
  buildComparisonResponse,
} from './trend-analysis';
import { HybridResponse } from '@/types';
import { prisma } from '@/lib/prisma';

// ─── SAPA Data Cache (10 menit) ───
let sapaCache: { records: SapaRecord[]; origin: SapaDataOrigin; expiresAt: number } | null = null;
const SAPA_CACHE_TTL = 10 * 60 * 1000;

async function getCachedSapaData(): Promise<{ records: SapaRecord[]; origin: SapaDataOrigin }> {
  if (sapaCache && sapaCache.expiresAt > Date.now()) {
    return { records: sapaCache.records, origin: sapaCache.origin };
  }
  const { records, origin } = await fetchSapaData();
  sapaCache = { records, origin, expiresAt: Date.now() + SAPA_CACHE_TTL };
  return { records, origin };
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
  const opdFilter = intent.opdFilter;

  const { records: sapaRecords, origin: dataOrigin } = await getCachedSapaData();

  // Tahun dibiarkan apa adanya (null jika kosong) — jangan relabel 'terbaru'
  const normalizedRecords = sapaRecords;

  const tokens = tokenizeQuery(query);

  // ─── Retrieval v2 (PR Lapis 1) ───
  // Substring matching lama digantikan skor relevansi kata-utuh + stemming
  // + sinonim. Gerbang kepercayaan: tanpa kata query yang cocok di NAMA
  // INDIKATOR → tidak ada evidence (jawab "tidak ditemukan", jangan mengarang).
  let filteredData: SapaRecord[] = [];
  let matchedRecords: SapaRecord[] = [];
  let filterDipakai: string = 'none';
  const yearsRequested = extractYears(query);
  let availableYears: string[] = [];
  /** Skor relevansi per id_kode_indikator (untuk urutan evidence). */
  const relevanceScore = new Map<number, number>();

  const byOpd = opdFilter ? filterByOpd(normalizedRecords, opdFilter) : [];

  // Grup token yang hanya mengulang nama OPD (mis. "kesehatan" saat opdFilter
  // = Dinas Kesehatan) bukan topik substantif — itu permintaan ringkasan OPD.
  const groupsAll = buildMatchGroups(tokens);
  const opdWords = new Set(
    normalizeText(opdFilter ?? '').split(' ').filter(Boolean).flatMap((w) => [w, stemId(w)]),
  );
  const groups: MatchGroup[] = opdFilter
    ? groupsAll.filter(
        (g) =>
          !g.alternatives.every((alt) => alt.every((w) => opdWords.has(w) || opdWords.has(stemId(w)))),
      )
    : groupsAll;

  const rank = (scored: { record: SapaRecord; score: number; indHits: number }[]) => {
    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, 80).map((s) => {
      const key = s.record.id_kode_indikator;
      relevanceScore.set(key, Math.max(relevanceScore.get(key) ?? 0, s.score));
      return s.record;
    });
  };

  if (groups.length === 0) {
    // Tanpa kata substantif: hanya ringkasan OPD yang masuk akal.
    if (opdFilter && byOpd.length > 0) {
      filteredData = byOpd;
      filterDipakai = 'opd';
    }
  } else {
    // Samakan dengan ambang retrieveRelevant: ≥3 kata topik → minimal 2 grup cocok.
    const minIndHits = groups.length >= 3 ? 2 : 1;
    const scoreAgainst = (pool: SapaRecord[]) =>
      pool.map((r) => scoreRecord(r, groups)).filter((s) => s.indHits >= minIndHits);
    if (opdFilter) {
      const scoped = scoreAgainst(byOpd);
      if (scoped.length > 0) {
        filteredData = rank(scoped);
        filterDipakai = 'opd+relevansi';
      }
    }
    if (filteredData.length === 0) {
      const global = scoreAgainst(normalizedRecords);
      if (global.length > 0) {
        filteredData = rank(global);
        filterDipakai = 'relevansi';
      } else if (opdFilter && byOpd.length > 0) {
        // OPD jelas tapi topik tak ditemukan di katalog → ringkasan OPD
        // (lebih jujur daripada memaksa jawaban salah topik).
        filteredData = byOpd;
        filterDipakai = 'opd-fallback';
      }
    }
  }

  // Filter tahun eksplisit ("produksi kopi 2024"): jika tak ada data tahun itu,
  // kosongkan evidence (jujur) dan catat tahun yang memang tersedia.
  if (yearsRequested.length > 0 && filteredData.length > 0) {
    const yr = new Set(yearsRequested);
    const byYear = filteredData.filter((r) => yr.has((r.tahun ?? '').trim()));
    if (byYear.length > 0) {
      filteredData = byYear;
      filterDipakai += '+tahun';
    } else {
      availableYears = [
        ...new Set(
          filteredData
            .map((r) => (r.tahun ?? '').trim())
            .filter((t) => /^\d{4}$/.test(t)),
        ),
      ].sort();
      filteredData = [];
      filterDipakai += '+tahun:kosong';
    }
  }

  matchedRecords = filteredData;

  const allOpds = getUniqueOpd(normalizedRecords);
  const allIndicators = getUniqueIndicators(normalizedRecords);

  // AGGREGASI per indikator (tahun maks per id), urut: skor relevansi → nilai
  const aggregated = aggregateByIndicator(filteredData);
  aggregated.sort((a, b) => {
    const ra = relevanceScore.get(a.id) ?? 0;
    const rb = relevanceScore.get(b.id) ?? 0;
    if (rb !== ra) return rb - ra;
    return b.nilaiNumber - a.nilaiNumber;
  });

  // Dedupe nama+tahun identik (katalog SAPA kadang berisi entri ganda)
  const seenKeys = new Set<string>();
  const ordered = aggregated.filter((a) => {
    const key = `${normalizeText(a.nama)}|${a.tahun ?? ''}`;
    if (seenKeys.has(key)) return false;
    seenKeys.add(key);
    return true;
  });

  // Evidence cap 30 compact — untuk grounding SoT
  const evidence: EvidenceItem[] = ordered.slice(0, 30).map((a) => ({
    opd: a.opd,
    indikator: a.nama,
    nilai: a.nilai,
    satuan: a.satuan,
    tahun: a.tahun,
    id: a.id,
  }));

  // ─── DTSEN Multi-Source Integration ───
  // Jika query relevan dengan DTSEN agregat, fetch dan gabungkan evidence DTSEN.
  const plan = planDtsenQuery(query);
  const dtsenEvidence: EvidenceItem[] = [];
  let dtsenProvenance: { label: string } = { label: '' };
  let dtsenNarasi: string | undefined;
  let dtsenSensor: string[] = [];

  if (plan.asksDtsen && plan.scope === 'AGGR' && (plan.kecamatan || plan.desa || plan.desil || plan.bansos)) {
    try {
      const dtsenResult = await fetchDtsenAgregatPublik({
        kecamatan: plan.kecamatan,
        desa: plan.desa,
        desil: plan.desil,
        bansos: plan.bansos,
      });
    if (dtsenResult) {
      // Bangun evidence DTSEN
      for (const d of dtsenResult.byDesil) {
        dtsenEvidence.push({
          opd: 'DTSEN (Kemensos/BPS)',
          indikator: `Desil ${d.desil} — jiwa`,
          nilai: String(d.jiwa),
          satuan: 'jiwa',
          tahun: null,
          id: `dtsen:desil:${d.desil}`,
        });
      }
      if (dtsenResult.bansos) {
        for (const b of dtsenResult.bansos) {
          dtsenEvidence.push({
            opd: 'DTSEN (Kemensos/BPS)',
            indikator: `Penerima ${b.program.toUpperCase()}`,
            nilai: b.jiwa === null ? '(disensor)' : String(b.jiwa),
            satuan: 'jiwa',
            tahun: null,
            id: `dtsen:bansos:${b.program}`,
          });
        }
      }
      for (const w of dtsenResult.byWilayah.slice(0, 10)) {
        dtsenEvidence.push({
          opd: 'DTSEN (Kemensos/BPS)',
          indikator: `${plan.kecamatan ? 'Desa' : 'Kecamatan'} ${w.nama} — jiwa`,
          nilai: String(w.jiwa),
          satuan: 'jiwa',
          tahun: null,
          id: `dtsen:wilayah:${encodeURIComponent(w.nama)}`,
        });
      }
      dtsenProvenance = { label: dtsenResult.provenance.label };
      dtsenNarasi = dtsenResult.narasi;
      dtsenSensor = dtsenResult.sensor;
    }
    } catch (err) {
      // Sumber DTSEN belum siap (mis. tabel rilis belum dimigrasi ke DB):
      // jangan gagalkan seluruh jawaban — lanjutkan dengan evidence SAPA saja.
      console.warn('[ai-orchestrator] DTSEN unavailable, lanjut tanpa evidence DTSEN:', err instanceof Error ? err.message : err);
    }
  }

  // Payload LLM ringkas: top-5 saat evidence besar; visualisasi penuh tetap
  // dibangun lokal via buildVizFromEvidence (tidak perlu LLM buat tabel besar).
  const allEvidence = [...evidence, ...dtsenEvidence];
  const evidenceForLLM = allEvidence.length > 8 ? allEvidence.slice(0, 5) : allEvidence;
  const dataForLLM = {
    query,
    intent: intent.kategori,
    filterDipakai,
    evidence: evidenceForLLM,
    evidenceCount: allEvidence.length,
    statistik_resmi: {
      total_data: normalizedRecords.length,
      total_opd: allOpds.length,
      total_indikator: allIndicators.length,
      ...(yearsRequested.length > 0 ? { tahun_diminta: yearsRequested } : {}),
    },
    ...(dtsenProvenance.label ? { dtsen_provenance: dtsenProvenance } : {}),
    ...(dtsenNarasi ? { dtsen_narasi: dtsenNarasi } : {}),
    ...(dtsenSensor.length > 0 ? { dtsen_sensor: dtsenSensor } : {}),
  };

  const konteksRegulasi = await retrieveContext(query, intent.kategori);
  const systemPrompt = buildSystemPrompt({
    totalOpd: allOpds.length,
    totalIndicators: allIndicators.length,
    totalData: normalizedRecords.length,
    evidenceCount: allEvidence.length,
    dtsenEvidence: dtsenEvidence.length,
  });

  return {
    intent,
    opdFilter,
    filterDipakai,
    dataOrigin,
    allRecords: normalizedRecords,
    filteredData,
    matchedRecords,
    evidence: allEvidence,
    dtsenEvidence,
    dtsenProvenance,
    dtsenNarasi,
    dataForLLM,
    konteksRegulasi,
    systemPrompt,
    yearsRequested,
    availableYears,
  };
}

// ─── PR Lapis 1: guard output — placeholder/kekosongan model ───
// Model lemah kadang menyalin literal placeholder format ("...", "…") atau
// mengembalikan narasi nyaris kosong. Grounding angka tidak menangkap itu.
export function isPlaceholderText(s: string): boolean {
  const t = (s ?? '').trim();
  if (!t) return true;
  if (/^[\s.…"'\-–—_*`~:;!?]*$/.test(t)) return true;
  const alpha = (t.match(/[A-Za-zÀ-ɏ]/g) ?? []).length;
  return alpha < 3;
}

/** Narasi "tidak ditemukan" — jujur, plus catatan tahun bila relevan. */
export function buildNotFoundNarasi(yearsRequested: string[], availableYears: string[]): string {
  const base = 'Data untuk pertanyaan ini tidak ditemukan di SAPA.';
  if (yearsRequested.length > 0) {
    const tersedia = availableYears.length > 0 ? ` Data terkait tersedia untuk tahun: ${availableYears.join(', ')}.` : '';
    return `Data untuk pertanyaan ini tidak ditemukan di SAPA untuk tahun ${yearsRequested.join(', ')}.${tersedia}`;
  }
  return base;
}

// ─── Non-blocking DB save with latency metadata ───
// PR-3: pemanggil WAJIB await — sebelumnya fire-and-forget (`void`), yang di
// serverless (Vercel) berisiko log hilang karena fungsi dibekukan begitu
// response terkirim (temuan audit §6). Satu INSERT ini hanya ~puluhan ms,
// jauh di bawah latensi LLM; error DB tetap tidak menggagalkan response.
async function saveChatSession(params: {
  query: string;
  intent: string;
  result: HybridResponse;
  metadata: Record<string, unknown>;
}) {
  try {
    await prisma.chatSession.create({
      data: {
        query: params.query,
        intent: params.intent,
        aiResponse: params.result as unknown as Prisma.InputJsonValue,
        metadata: params.metadata as unknown as Prisma.InputJsonValue,
      },
    });
  } catch (dbErr) {
    // Jangan sampai error DB menggagalkan response ke user
    console.error('[AI] DB save failed (non-blocking):', dbErr);
  }
}

// ─── Observability metadata builder (pure, testable) ───
export function buildObservabilityMeta(input: {
  opdFilter?: string | null;
  filterDipakai: string;
  evidence: EvidenceItem[];
  grounding: 'pass' | 'replaced';
  groundingReason?: string | null;
  totalData: number;
  filteredCount: number;
  matchedCount?: number;
  latencyMs: number;
  stepsMs: Record<string, number>;
  model: string | undefined | null;
  finishReason: string | null;
  dataOrigin: SapaDataOrigin;
  streamed: boolean;
  error?: string | null;
}): Record<string, unknown> {
  return {
    opdFilter: input.opdFilter ?? null,
    filterDipakai: input.filterDipakai,
    evidenceCount: input.evidence.length,
    evidenceIds: input.evidence.map((e) => e.id).slice(0, 30),
    grounding: input.grounding,
    groundingReason: input.groundingReason ?? null,
    totalData: input.totalData,
    filteredCount: input.filteredCount,
    matchedCount: input.matchedCount ?? null,
    latencyMs: input.latencyMs,
    stepsMs: input.stepsMs,
    model: input.model ?? null,
    finish_reason: input.finishReason ?? null,
    dataOrigin: input.dataOrigin,
    dataSource: dataSourceLabel(input.dataOrigin),
    streamed: input.streamed,
    ...(input.error ? { error: input.error } : {}),
  };
}

/** Jalur meta (daftar OPD / statistik portal / sebaran tahun) — deterministik, tanpa LLM. */
async function tryMetaQuery(
  query: string,
  startedAt: number,
  steps: Record<string, number>,
  streamed: boolean,
): Promise<HybridResponse | null> {
  const metaKind = detectMetaQuery(query);
  if (!metaKind) return null;
  const { records, origin } = await getCachedSapaData();
  const result = buildMetaResponse(metaKind, records, origin);
  steps.meta = Date.now() - startedAt;
  const metadata = buildObservabilityMeta({
    opdFilter: null,
    filterDipakai: `meta:${metaKind}`,
    evidence: [],
    grounding: 'pass',
    totalData: records.length,
    filteredCount: 0,
    latencyMs: Date.now() - startedAt,
    stepsMs: steps,
    model: null,
    finishReason: null,
    dataOrigin: origin,
    streamed,
  });
  await saveChatSession({ query, intent: 'meta', result, metadata });
  setCache(query, result);
  return result;
}

/**
 * PR-4c Enhanced (desain §8): integrasi DTSEN multi-source ke pipeline publik.
 * Berbeda dengan defleksi lama yang sepenuhnya mengalihkan, sekarang:
 *
 * - NIK / niat per-orang → tetap defleksi (privacy, audit trail)
 * - DTSEN agregat (desil, bansos, pembagian wilayah) → fetch publik DTSEN,
 *   gabungkan ke evidence, AI menjawab berdasarkan SAPA + DTSEN agregat
 * - DTSEN literal (kata kunci tanpa konteks agregat) → defleksi dengan saran

 * Provenance: setiap evidence DTSEN dilabeli dataOrigin 'dtsen' + provenance chip.
 * Sensor: k-anonymity sudah diterapkan saat publish (k≥5); sensor dinamis untuk
 * perhitungan bansos hasil query.
 */


async function tryDtsenDeflection(
  query: string,
  startedAt: number,
  steps: Record<string, number>,
  streamed: boolean,
): Promise<HybridResponse | null> {
  const plan = planDtsenQuery(query);

  // Jika pertanyaan adalah agregat DTSEN (bukan personal) → biarkan pipeline SAPA lanjut
  // dengan integrasi DTSEN di buildContext. Hanya defleksi untuk:
  // - NIK (privacy)
  // - niat per-orang (privacy)
  // - DTSEN literal tanpa konteks agregat nyata
  if (plan.scope === 'AGGR') {
    // Cek apakah query hanya kata kunci literal tanpa konteks agregat
    if (plan.kecamatan || plan.desa || plan.desil || plan.bansos) {
      // Ada konteks agregat — biarkan pipeline SAPA + DTSEN integrasi berjalan
      return null;
    }
    // DTSEN literal tanpa konteks — tetap defleksi dengan saran
    const kind = publicDeflectionKind(query);
    if (kind) {
      steps.dtsenDefleksi = Date.now() - startedAt;
      const result: HybridResponse = {
        narasi: buildPublicDeflectionNarasi(kind),
        visualisasi: { tipe: 'none', konfigurasi: {} },
        rekomendasi: [...PUBLIC_DEFLECTION_REKOMENDASI],
        dataSource: 'DTSEN (terbatas) — dialihkan dari jalur publik SAPA',
        timestamp: new Date().toISOString(),
      };
      const metadata = {
        ...buildObservabilityMeta({
          opdFilter: null,
          filterDipakai: `dtsen-defleksi:${kind.toLowerCase()}`,
          evidence: [],
          grounding: 'pass',
          totalData: 0,
          filteredCount: 0,
          latencyMs: Date.now() - startedAt,
          stepsMs: steps,
          model: null,
          finishReason: null,
          dataOrigin: 'splp',
          streamed,
        }),
        dataOrigin: 'dtsen',
        dataSource: 'DTSEN (terbatas) — dialihkan',
        dtsenDefleksi: kind,
      };
      await saveChatSession({ query, intent: 'dtsen-defleksi', result, metadata });
      setCache(query, result);
      return result;
    }
    return null;
  }

  // NIK / per-orang → defleksi (privacy)
  const kind = publicDeflectionKind(query);
  if (!kind) return null;
  steps.dtsenDefleksi = Date.now() - startedAt;
  const result: HybridResponse = {
    narasi: buildPublicDeflectionNarasi(kind),
    visualisasi: { tipe: 'none', konfigurasi: {} },
    rekomendasi: [...PUBLIC_DEFLECTION_REKOMENDASI],
    dataSource: 'DTSEN (terbatas) — dialihkan dari jalur publik SAPA',
    timestamp: new Date().toISOString(),
  };
  const metadata = {
    ...buildObservabilityMeta({
      opdFilter: null,
      filterDipakai: `dtsen-defleksi:${kind.toLowerCase()}`,
      evidence: [],
      grounding: 'pass',
      totalData: 0,
      filteredCount: 0,
      latencyMs: Date.now() - startedAt,
      stepsMs: steps,
      model: null,
      finishReason: null,
      dataOrigin: 'splp',
      streamed,
    }),
    dataOrigin: 'dtsen',
    dataSource: 'DTSEN (terbatas) — dialihkan',
    dtsenDefleksi: kind,
  };
  await saveChatSession({ query, intent: 'dtsen-defleksi', result, metadata });
  setCache(query, result);
  return result;
}

/** Statistik resmi yang juga disuplai ke prompt — grounding tidak boleh menghukumnya. */
interface OfficialStats {
  total_data?: number;
  total_opd?: number;
  total_indikator?: number;
}
function groundingExtras(ctx: { evidence: EvidenceItem[]; dataForLLM: { statistik_resmi?: OfficialStats } }) {
  const s = ctx.dataForLLM?.statistik_resmi ?? {};
  return {
    extraAllowedNumbers: [
      s.total_data ?? 0,
      s.total_opd ?? 0,
      s.total_indikator ?? 0,
      ctx.evidence.length,
    ].filter((n) => Number.isFinite(Number(n)) && Number(n) > 0),
  };
}

/**
 * PR Lapis 2: jawaban tren & perbandingan secara deterministik dari data —
 * TANPA LLM. Tren dibangun dari baris multi-tahun SAPA yang dulu dibuang
 * agregasi; perbandingan dari deteksi ≥2 nama OPD nyata di query.
 */
async function tryDeterministicDomainQuery(
  query: string,
  ctx: Awaited<ReturnType<typeof buildContext>>,
  startedAt: number,
  steps: Record<string, number>,
  streamed: boolean,
): Promise<HybridResponse | null> {
  let result: HybridResponse | null = null;
  let filterDipakai = '';

  if (isTrendQuery(query)) {
    const cand = findTrendCandidate(ctx.filteredData);
    if (cand) {
      result = buildTrendResponse(query, cand, ctx.dataOrigin);
      filterDipakai = 'tren-deterministik';
    } else {
      // Kata "tren" TANPA data multi-tahun jangan sampai lolos ke LLM
      // (undangan halusinasi) — jawab keterbatasannya secara jujur.
      const unavailable = buildTrendUnavailableResponse(ctx.filteredData, ctx.dataOrigin);
      if (unavailable) {
        result = unavailable;
        filterDipakai = 'tren-tidak-tersedia';
      }
    }
  }

  if (!result && isComparisonQuery(query)) {
    const opdNames = getUniqueOpd(ctx.allRecords).map((o) => o.nama);
    const matches = detectOpdsInQuery(query, opdNames);
    if (matches.length >= 2) {
      const rows = buildOpdComparisonRows(matches, ctx.allRecords);
      result = buildComparisonResponse(matches, rows, ctx.dataOrigin);
      filterDipakai = `perbandingan-deterministik:${matches.length}-opd`;
    }
  }

  if (!result) return null;

  steps.deterministic = Date.now() - startedAt;
  const isTrend = filterDipakai.startsWith('tren');
  const metadata = buildObservabilityMeta({
    opdFilter: ctx.opdFilter ?? null,
    filterDipakai,
    evidence: ctx.evidence,
    grounding: 'pass',
    totalData: ctx.allRecords.length,
    filteredCount: ctx.filteredData.length,
    matchedCount: ctx.matchedRecords.length,
    latencyMs: Date.now() - startedAt,
    stepsMs: steps,
    model: null,
    finishReason: null,
    dataOrigin: ctx.dataOrigin,
    streamed,
  });
  await saveChatSession({
    query,
    intent: isTrend ? 'tren' : 'perbandingan',
    result,
    metadata,
  });
  setCache(query, result);
  return result;
}

/** Guard Lapis 1: narasi placeholder / format gagal → template deterministik; rekomendasi bersih. */
function sanitizeParsed(parsed: HybridResponse, evidence: EvidenceItem[], query: string): HybridResponse {
  let narasi = parsed.narasi;
  if (
    isPlaceholderText(narasi) ||
    narasi.startsWith('Maaf, AI gagal') ||
    narasi.startsWith('Maaf, AI tidak memberikan')
  ) {
    narasi = buildDeterministicNarasi(evidence, query);
  }
  const rekomendasi = (parsed.rekomendasi ?? []).filter((r) => !isPlaceholderText(r)).slice(0, 3);
  return { ...parsed, narasi, rekomendasi };
}

export async function processAIQuery(query: string): Promise<HybridResponse> {
  const cached = getCached(query);
  if (cached) return cached;

  const startedAt = Date.now();
  const steps: Record<string, number> = {};

  try {
    // PR Lapis 1: meta-query portal → deterministik, tanpa LLM
    const meta = await tryMetaQuery(query, startedAt, steps, false);
    if (meta) return meta;

    // PR-4c: defleksi DTSEN (NIK/desil/per-orang) — sebelum retrieval SAPA
    const deflected = await tryDtsenDeflection(query, startedAt, steps, false);
    if (deflected) return deflected;

    // Step 1-3: intent + fetch + filter (context build)
    const ctx = await buildContext(query);
    steps.context = Date.now() - startedAt;

    // PR Lapis 2: tren & perbandingan → deterministik dari data, tanpa LLM
    const deterministic = await tryDeterministicDomainQuery(query, ctx, startedAt, steps, false);
    if (deterministic) return deterministic;

    // SoT Fase C: jika evidence kosong → jangan panggil LLM
    if (ctx.evidence.length === 0) {
      const empty: HybridResponse = {
        narasi: buildNotFoundNarasi(ctx.yearsRequested, ctx.availableYears),
        visualisasi: { tipe: 'none', konfigurasi: {} },
        rekomendasi: [],
        dataSource: dataSourceLabel(ctx.dataOrigin),
        timestamp: new Date().toISOString(),
      };
      const metadata = buildObservabilityMeta({
        opdFilter: ctx.opdFilter ?? null,
        filterDipakai: ctx.filterDipakai,
        evidence: [],
        grounding: 'pass',
        totalData: ctx.allRecords.length,
        filteredCount: ctx.filteredData.length,
        latencyMs: Date.now() - startedAt,
        stepsMs: steps,
        model: process.env.AI_MODEL,
        finishReason: null,
        dataOrigin: ctx.dataOrigin,
        streamed: false,
      });
      await saveChatSession({ query, intent: ctx.intent.kategori, result: empty, metadata });
      setCache(query, empty);
      return empty;
    }

    // Step 4: Panggil LLM (satu kali)
    const llmStarted = Date.now();
    const llmRes = await callLLM(ctx.systemPrompt, {
      query,
      data: ctx.dataForLLM,
      konteks: ctx.konteksRegulasi,
    });
    steps.llm = Date.now() - llmStarted;

    // Step 5: Parse + guard + grounding SoT (dengan statistik resmi yang diizinkan)
    const parsed = sanitizeParsed(parseHybridResponse(llmRes.text, ctx.filteredData, ctx.dataOrigin), ctx.evidence, query);
    const { response: grounded, grounding, reason } = groundOutput(parsed, ctx.evidence, query, groundingExtras(ctx));
    let result = grounded;
    // Viz dari evidence jika model tidak kasih atau grounding mengganti
    if (result.visualisasi.tipe === 'none' && ctx.evidence.length > 0) {
      result = { ...result, visualisasi: buildVizFromEvidence(ctx.evidence) };
    } else if (grounding === 'replaced') {
      // groundOutput sudah pakai viz dari evidence, pastikan konsisten
      result = { ...grounded, visualisasi: buildVizFromEvidence(ctx.evidence) };
    }

    // Step 6: Simpan ke DB (non-blocking — tidak menunggu)
    const metadata = buildObservabilityMeta({
      opdFilter: ctx.opdFilter ?? null,
      filterDipakai: ctx.filterDipakai,
      evidence: ctx.evidence,
      grounding,
      groundingReason: reason ?? null,
      totalData: ctx.allRecords.length,
      filteredCount: ctx.filteredData.length,
      matchedCount: ctx.matchedRecords.length,
      latencyMs: Date.now() - startedAt,
      stepsMs: steps,
      model: llmRes.model,
      finishReason: llmRes.finishReason,
      dataOrigin: ctx.dataOrigin,
      streamed: false,
    });
    await saveChatSession({ query, intent: ctx.intent.kategori, result, metadata });

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

    await saveChatSession({
      query,
      intent: 'error',
      result: errorResult,
      metadata: { error: err instanceof Error ? err.message : 'Unknown', latencyMs: Date.now() - startedAt, finish_reason: null, dataOrigin: 'splp' as const },
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
    // PR Lapis 1: meta-query portal → deterministik, tanpa LLM
    onStatus('Menganalisis pertanyaan...');
    const meta = await tryMetaQuery(query, startedAt, steps, true);
    if (meta) return meta;

    // PR-4c: defleksi DTSEN (NIK/desil/per-orang) — konvensi jalur deterministik:
    // tidak memakai onChunk (onChunk route mengharapkan fragmen JSON LLM);
    // narasi utuh dikirim lewat event 'result' oleh route.
    const deflected = await tryDtsenDeflection(query, startedAt, steps, true);
    if (deflected) return deflected;

    // Step 1: Deteksi intent & ambil data
    const ctx = await buildContext(query);
    steps.context = Date.now() - startedAt;

    // PR Lapis 2: tren & perbandingan → deterministik dari data, tanpa LLM.
    // Konvensi sama seperti meta-query: jalur deterministik tidak men-stream
    // narasi via onChunk (onChunk route mengharapkan fragmen JSON LLM);
    // narasi utuh dikirim lewat event 'result' oleh route.
    const deterministic = await tryDeterministicDomainQuery(query, ctx, startedAt, steps, true);
    if (deterministic) return deterministic;

    // SoT: evidence kosong → jangan panggil LLM
    if (ctx.evidence.length === 0) {
      const empty: HybridResponse = {
        narasi: buildNotFoundNarasi(ctx.yearsRequested, ctx.availableYears),
        visualisasi: { tipe: 'none', konfigurasi: {} },
        rekomendasi: [],
        dataSource: dataSourceLabel(ctx.dataOrigin),
        timestamp: new Date().toISOString(),
      };
      const metadata = buildObservabilityMeta({
        opdFilter: ctx.opdFilter ?? null,
        filterDipakai: ctx.filterDipakai,
        evidence: [],
        grounding: 'pass',
        totalData: ctx.allRecords.length,
        filteredCount: ctx.filteredData.length,
        latencyMs: Date.now() - startedAt,
        stepsMs: steps,
        model: process.env.AI_MODEL,
        finishReason: null,
        dataOrigin: ctx.dataOrigin,
        streamed: true,
      });
      await saveChatSession({ query, intent: ctx.intent.kategori, result: empty, metadata });
      setCache(query, empty);
      return empty;
    }

    // Step 2: Panggil LLM dengan streaming (satu kali)
    onStatus('AI sedang menyusun jawaban...');
    const llmStarted = Date.now();
    const llmRes = await streamLLM(ctx.systemPrompt, { query, data: ctx.dataForLLM, konteks: ctx.konteksRegulasi }, onChunk);
    steps.llm = Date.now() - llmStarted;

    // Step 3: Parse + guard + grounding SoT (dengan statistik resmi yang diizinkan)
    const parsed = sanitizeParsed(parseHybridResponse(llmRes.text, ctx.filteredData, ctx.dataOrigin), ctx.evidence, query);
    const { response: grounded, grounding, reason } = groundOutput(parsed, ctx.evidence, query, groundingExtras(ctx));
    let result = grounded;
    if (result.visualisasi.tipe === 'none' && ctx.evidence.length > 0) {
      result = { ...result, visualisasi: buildVizFromEvidence(ctx.evidence) };
    } else if (grounding === 'replaced') {
      result = { ...grounded, visualisasi: buildVizFromEvidence(ctx.evidence) };
    }

    // Step 4: Simpan ke DB (non-blocking)
    const metadata = buildObservabilityMeta({
      opdFilter: ctx.opdFilter ?? null,
      filterDipakai: ctx.filterDipakai,
      evidence: ctx.evidence,
      grounding,
      groundingReason: reason ?? null,
      totalData: ctx.allRecords.length,
      filteredCount: ctx.filteredData.length,
      matchedCount: ctx.matchedRecords.length,
      latencyMs: Date.now() - startedAt,
      stepsMs: steps,
      model: llmRes.model,
      finishReason: llmRes.finishReason,
      dataOrigin: ctx.dataOrigin,
      streamed: true,
    });
    await saveChatSession({ query, intent: ctx.intent.kategori, result, metadata });

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

    await saveChatSession({
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

function buildSystemPrompt(stats: {
  totalOpd: number;
  totalIndicators: number;
  totalData: number;
  evidenceCount: number;
  dtsenEvidence?: number;
}): string {
  return `Anda adalah SAPA Smart AI Pemerintah Kabupaten Aceh Tengah.
Tugas: Merumuskan data dalam field "evidence" menjadi narasi Bahasa Indonesia yang akurat.

STATISTIK RESMI (BOLEH dikutip apa adanya): total ${stats.totalData} data indikator, ${stats.totalOpd} OPD, ${stats.totalIndicators} jenis indikator, ${stats.evidenceCount} evidence terkait pertanyaan ini. Sumber: sapa.acehtengahkab.go.id / api-splp.layanan.go.id.

ATURAN WAJIB:
1. HANYA gunakan angka, tahun, nama OPD, dan nama indikator yang ada di "evidence" atau STATISTIK RESMI di atas. DILARANG angka lain.
2. Jika "evidence" tidak menjawab pertanyaan secara spesifik: katakan data spesifik itu tidak tersedia, lalu sebut data terkait yang ADA di evidence — tanpa mengarang.
3. Tahun: gunakan nilai "tahun" dari evidence. Jika null/kosong → tulis "tahun tidak tercantum di SAPA".
4. Selalu sebutkan OPD dan satuan dari evidence. Jangan menyebut OPD lain jika tidak ada di evidence.
5. Bahasa Indonesia formal, lugas. Narasi = interpretasi evidence, bukan membaca ulang mentah. Maksimal 3 kalimat. DILARANG menulis literal "..." atau placeholder kosong.
6. "rekomendasi": 0-3 kalimat TANPA angka baru. Jika tidak relevan, kosongkan ([]).
7. "visualisasi" HANYA dari evidence:
   - 1 item → "metric" {metrics:[{label, value, unit}]}
   - 2-8 item SATUAN SERAGAM → "chart" bar {type:"bar", xKey:"indikator", data:[{indikator, nilai}], bars:["nilai"]}
   - >8 item ATAU satuan campur → "table" {columns:["Indikator","Nilai","Satuan","OPD","Tahun"], rows} — jika rows banyak (>12), sertakan minimal 5 baris teratas di narasi ringkasan juga.
   - kosong → "none"
8. Jangan menambah detail di luar evidence (contoh: pecahan PNS/PPPK, jumlah pegawai turunan, dsb).

FORMAT OUTPUT: tepat SATU object JSON valid, tanpa teks lain sebelum/sesudah:
{"narasi":"...","visualisasi":{"tipe":"metric|table|chart|none","konfigurasi":{}},"rekomendasi":["..."]}`;
}

/**
 * Robust JSON extraction — handles markdown code fences (```json ... ```),
 * surrounding prose, and truncated-but-complete objects.
 */
function extractJsonObject(raw: string): Record<string, unknown> | null {
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

function parseHybridResponse(raw: string, _records: SapaRecord[], dataOrigin: SapaDataOrigin = 'splp'): HybridResponse {
  // Bersihkan dulu dari markdown fence / reasoning / prose di luar JSON
  const cleanedInput = stripReasoningPrefix(raw);
  const extracted = extractJsonObject(cleanedInput);

  // Adaptor: format alternatif SDI {"type":"data_dashboard", title, summary, metrics, table, metadata}
  if (extracted && extracted.type === 'data_dashboard') {
    const narasi = [extracted.title, extracted.summary].filter(Boolean).join(' — ') || 'Ringkasan data SAPA.';
    const metrics = Array.isArray(extracted.metrics) ? extracted.metrics : [];
    const table: Record<string, unknown> =
      (extracted.table ?? { headers: [], rows: [] }) as Record<string, unknown>;
    const headers: string[] = Array.isArray(table.headers) ? table.headers : Array.isArray(table.columns) ? table.columns : [];
    const rows: unknown[][] = Array.isArray(table.rows) ? table.rows : Array.isArray(table.baris) ? table.baris : [];
    // Pilih visualisasi: metrics kecil → metric, rows ada → table, else metric
    let visualisasi: HybridResponse['visualisasi'];
    if (rows.length > 0 && headers.length > 0) {
      visualisasi = { tipe: 'table', konfigurasi: { columns: headers, rows } };
    } else if (metrics.length > 0) {
      visualisasi = {
        tipe: 'metric',
        konfigurasi: {
          metrics: metrics.map((m: Record<string, unknown>) => ({
            label: String(m.label ?? ''),
            value: m.value,
            unit: typeof m.unit === 'string' ? m.unit : '',
          })),
        },
      };
    } else {
      visualisasi = { tipe: 'none', konfigurasi: {} };
    }
    return {
      narasi,
      visualisasi: normalizeVisualization(visualisasi),
      rekomendasi: [],
      dataSource: dataSourceLabel(dataOrigin),
      timestamp: new Date().toISOString(),
    };
  }

  if (extracted && typeof extracted === 'object') {
    const narasi = typeof extracted.narasi === 'string' ? extracted.narasi.trim() : '';
    // Jika narasi kosong TAPI ada field lain, jangan tampilkan JSON mentah
    if (narasi) {
      return {
        narasi,
        visualisasi: normalizeVisualization(extracted.visualisasi),
        rekomendasi: Array.isArray(extracted.rekomendasi) ? extracted.rekomendasi : [],
        dataSource: dataSourceLabel(dataOrigin),
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
    dataSource: dataSourceLabel(dataOrigin),
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
function normalizeVisualization(
  vis: unknown
): { tipe: VizTipe; konfigurasi: Record<string, unknown> } {
  const visObj = (vis && typeof vis === 'object' ? vis : {}) as {
    tipe?: unknown;
    konfigurasi?: unknown;
  };
  const cfg = (visObj.konfigurasi && typeof visObj.konfigurasi === 'object'
    ? visObj.konfigurasi
    : {}) as Record<string, unknown>;

  const rawTipe = visObj.tipe ?? 'none';
  const tipe: VizTipe =
    typeof rawTipe === 'string' && (VIZ_TIPE_LIST as readonly string[]).includes(rawTipe)
      ? (rawTipe as VizTipe)
      : 'none';

  if (tipe === 'metric') {
    // Format A (deepseek): { metrics: [{label, value, unit}] }
    if (Array.isArray(cfg.metrics)) {
      return {
        tipe,
        konfigurasi: {
          metrics: cfg.metrics.filter(
            (m): m is MetricItem => !!m && typeof m === 'object' && 'label' in m
          ),
        },
      };
    }
    // Format B (ling): { nilai, satuan, label, detail: [{label, nilai, satuan}] }
    const metrics: MetricItem[] = [];
    if (cfg.nilai != null) {
      metrics.push({ label: typeof cfg.label === 'string' ? cfg.label : 'Nilai', value: cfg.nilai, unit: typeof cfg.satuan === 'string' ? cfg.satuan : '' });
    }
    if (Array.isArray(cfg.detail)) {
      for (const d of cfg.detail as Record<string, unknown>[]) {
        metrics.push({
          label: typeof d.label === 'string' ? d.label : 'Nilai',
          value: d.nilai ?? d.value,
          unit: typeof (d.satuan ?? d.unit) === 'string' ? ((d.satuan ?? d.unit) as string) : '',
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
