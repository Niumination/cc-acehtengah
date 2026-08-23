// ─── Grounding SoT SAPA — Fase C ───
// Validasi angka/tahun LLM vs evidence (pure, no network). Jika halu → template deterministik.

import type { HybridResponse } from '@/types';

export interface EvidenceItem {
  opd: string;
  indikator: string;
  nilai: string;
  satuan: string;
  tahun: string | null;
  id: number;
}

// Extract angka raw: urutan digit dengan . , sebagai pemisah
export function extractNumbers(text: string): string[] {
  return (text.match(/[\d.,]+/g) ?? []).filter((n) => /^\d/.test(n));
}

export function normalizeNumber(raw: string): string {
  return raw.replace(/[.,]/g, '');
}

function isFourDigitYear(s: string): boolean {
  return /^\d{4}$/.test(s);
}

export function buildAllowedNumbers(evidence: EvidenceItem[]): Set<string> {
  const set = new Set<string>();
  for (const e of evidence) {
    const raws = [e.nilai, String(e.nilai ?? ''), String((e as any).nilaiNumber ?? '')];
    for (const r of raws) {
      const m = r.match(/[\d.,]+/g) ?? [];
      for (const n of m) {
        const norm = normalizeNumber(n);
        if (/^\d+$/.test(norm) && norm.length > 0) set.add(norm);
      }
    }
    // also add nilaiNumber if present as number directly
    const nn = (e as any).nilaiNumber;
    if (typeof nn === 'number' && Number.isFinite(nn)) set.add(String(nn).replace(/[.,]/g, ''));
  }
  // dedup empty
  set.delete('');
  return set;
}

export function buildAllowedYears(evidence: EvidenceItem[]): Set<string> {
  const set = new Set<string>();
  for (const e of evidence) {
    const t = e.tahun?.trim() ?? '';
    if (isFourDigitYear(t)) set.add(t);
  }
  return set;
}

function collectTextForGrounding(parsed: HybridResponse): string {
  const parts: string[] = [];
  if (parsed.narasi) parts.push(parsed.narasi);
  if (Array.isArray(parsed.rekomendasi)) parts.push(parsed.rekomendasi.join(' '));
  try {
    parts.push(JSON.stringify(parsed.visualisasi?.konfigurasi ?? {}));
  } catch {}
  return parts.join(' ');
}

export function isGrounded(parsed: HybridResponse, evidence: EvidenceItem[]): { ok: boolean; reasons: string[] } {
  const reasons: string[] = [];
  if (evidence.length === 0) {
    // Jika tidak ada evidence, model seharusnya bilang tidak tersedia. Anggap gagal jika narasi mengandung angka >=10.
    const text = collectTextForGrounding(parsed);
    const nums = extractNumbers(text)
      .map(normalizeNumber)
      .filter((n) => /^\d+$/.test(n) && n.length >= 2 && Number(n) >= 10);
    if (nums.length > 0) reasons.push(`angka tanpa evidence: ${nums.slice(0, 3).join(',')}`);
    // tahun juga
    const years = (text.match(/\b\d{4}\b/g) ?? []).filter(Boolean);
    if (years.length > 0) reasons.push(`tahun tanpa evidence: ${years.slice(0, 3).join(',')}`);
    return { ok: reasons.length === 0, reasons };
  }

  const allowedNumbers = buildAllowedNumbers(evidence);
  const allowedYears = buildAllowedYears(evidence);
  const text = collectTextForGrounding(parsed);

  // 1. Tahun plausibel (1900-2100) harus subset evidence; nilai 4-digit seperti 9610 bukan tahun
  const yearsInText = (text.match(/\b\d{4}\b/g) ?? []).filter((y) => {
    const n = Number(y);
    if (!Number.isFinite(n) || n < 1900 || n > 2100) return false;
    // jika 4-digit ini juga merupakan nilai yang diizinkan, jangan anggap tahun
    if (allowedNumbers.has(y)) return false;
    return true;
  });
  for (const y of yearsInText) {
    if (!allowedYears.has(y)) {
      reasons.push(`tahun halu: ${y}`);
      break;
    }
  }

  // 2. Angka >=10 (setelah normalize) harus ada di evidence
  const nums = extractNumbers(text);
  for (const raw of nums) {
    const normForYear = raw.replace(/[.,]/g, '');
    // skip hanya tahun plausibel yang sudah divalidasi di atas
    if (/^\d{4}$/.test(normForYear) && Number(normForYear) >= 1900 && Number(normForYear) <= 2100) continue;
    const norm = normalizeNumber(raw);
    if (!/^\d+$/.test(norm) || norm.length < 2) continue;
    const n = Number(norm);
    if (!Number.isFinite(n) || n < 10) continue;
    if (!allowedNumbers.has(norm)) {
      // izinkan prefix tahun? tidak — strict
      reasons.push(`angka halu: ${raw}→${norm}`);
      break;
    }
  }

  return { ok: reasons.length === 0, reasons };
}

function buildDeterministicNarasi(evidence: EvidenceItem[], query: string): string {
  if (evidence.length === 0) return 'Data untuk pertanyaan ini tidak ditemukan di SAPA.';
  const top = evidence.slice(0, 3);
  const parts = top.map((e) => {
    const tahunStr = e.tahun && /^\d{4}$/.test(e.tahun.trim()) ? e.tahun.trim() : 'tahun tidak tercantum di SAPA';
    const satuanStr = e.satuan ? ` ${e.satuan}` : '';
    return `${e.indikator} ${e.nilai}${satuanStr} (${e.opd}, ${tahunStr})`;
  });
  const q = query.trim().slice(0, 120);
  return `Berdasarkan data SAPA untuk "${q}", ditemukan ${evidence.length} indikator terkait: ${parts.join('; ')}.`;
}

export function buildVizFromEvidence(evidence: EvidenceItem[]): HybridResponse['visualisasi'] {
  if (evidence.length === 0) return { tipe: 'none', konfigurasi: {} };
  if (evidence.length === 1) {
    const e = evidence[0];
    return {
      tipe: 'metric',
      konfigurasi: { metrics: [{ label: e.indikator, value: e.nilai, unit: e.satuan ?? '' }] },
    };
  }
  if (evidence.length > 8) {
    return {
      tipe: 'table',
      konfigurasi: {
        columns: ['Indikator', 'Nilai', 'Satuan', 'OPD', 'Tahun'],
        rows: evidence.slice(0, 12).map((e) => [e.indikator, e.nilai, e.satuan ?? '', e.opd, e.tahun ?? '-']),
      },
    };
  }
  return {
    tipe: 'chart',
    konfigurasi: {
      type: 'bar',
      xKey: 'indikator',
      data: evidence.map((e) => ({
        indikator: e.indikator.length > 35 ? e.indikator.slice(0, 32) + '…' : e.indikator,
        nilai: Number(String(e.nilai).replace(/[^\d.-]/g, '')) || 0,
        satuan: e.satuan,
      })),
      bars: ['nilai'],
    },
  };
}

export function groundOutput(
  parsed: HybridResponse,
  evidence: EvidenceItem[],
  query: string,
): { response: HybridResponse; grounding: 'pass' | 'replaced'; reason?: string } {
  const check = isGrounded(parsed, evidence);
  if (check.ok) return { response: parsed, grounding: 'pass' };

  const reason = check.reasons.join('; ');
  const narasi = buildDeterministicNarasi(evidence, query);
  const visualisasi = buildVizFromEvidence(evidence);
  const replaced: HybridResponse = {
    narasi,
    visualisasi,
    rekomendasi: [],
    dataSource: parsed.dataSource || 'SAPA Aceh Tengah (api-splp.layanan.go.id)',
    timestamp: new Date().toISOString(),
  };
  return { response: replaced, grounding: 'replaced', reason };
}
