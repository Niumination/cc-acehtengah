// ─── Narasi "Data Bercerita" (WP5) ────────────────────────────────────────────
// Layer narasi deterministik di ATAS fusion (WP4) + compute (WP3.0c).
// Bukan LLM — menghasilkan paragraf pimpinan dari FusedMetric dengan caveat jujur.
// LLM (bila dipakai) hanya merapikan bahasa, tidak menambah angka.

import type { FusedMetric } from './fusion';

export interface NarrativeInput {
  fused: Map<string, FusedMetric>;
  question?: string;
}

export interface NarrativeOutput {
  judul: string;
  ringkasan: string; // 1 paragraf utama
  poin: string[]; // bullet deterministik
  caveats: string[]; // caveat gabungan
  hasDiscrepancy: boolean;
}

/** Format angka Indonesia: 222643 → "222.643" */
function fmt(n: number): string {
  return n.toLocaleString('id-ID');
}

/** Buat narasi untuk penduduk total bila ada, fallback ke ringkasan umum. */
export function buildNarrative(input: NarrativeInput): NarrativeOutput {
  const caveats: string[] = [];
  const poin: string[] = [];
  let hasDiscrepancy = false;
  let judul = 'Ringkasan Data';
  let ringkasan = '';

  // Kumpulkan caveat global
  for (const fm of input.fused.values()) {
    for (const c of fm.caveats) caveats.push(c.message);
    if (fm.discrepancy?.isMaterial) hasDiscrepancy = true;
  }

  // Kasus khusus: penduduk total
  const penduduk = input.fused.get('penduduk.total.count');
  if (penduduk && penduduk.metrics.length > 0) {
    judul = 'Penduduk Aceh Tengah — Rekonsiliasi Antar Sumber';
    const primary = penduduk.primary!;
    const others = penduduk.metrics.filter(m => m.id !== primary.id);
    // Ringkasan: sebut primary + sebut perbedaan bila ada
    if (penduduk.metrics.length === 1) {
      ringkasan = `Menurut ${primary.source.label} (${primary.period.label}), jumlah penduduk Aceh Tengah tercatat ${fmt(primary.value)} ${primary.unitCanonical}.`;
      poin.push(`Sumber tunggal: ${primary.source.label} — ${fmt(primary.value)} jiwa (${primary.period.label}).`);
    } else {
      const srcList = penduduk.metrics.map(m => `${m.source.label} ${fmt(m.value)} (${m.period.label})`).join('; ');
      ringkasan = `Terdapat ${penduduk.metrics.length} angka untuk penduduk Aceh Tengah: ${srcList}. Angka acuan yang ditampilkan adalah ${fmt(primary.value)} jiwa dari ${primary.source.label} (${primary.period.label}). Perbedaan antar sumber wajar karena metodologi dan tahun pencacahan berbeda — lihat caveat.`;
      for (const m of penduduk.metrics) {
        poin.push(`${m.source.label} (${m.period.label}): ${fmt(m.value)} ${m.unitCanonical}.`);
      }
      if (penduduk.discrepancy) {
        poin.push(`Selisih ${penduduk.discrepancy.pctDiff.toFixed(1)}% antar sumber — material (ambang 3%).`);
      }
    }
    if (!penduduk.isPlausible) {
      caveats.push('Nilai di luar rentang wajar — periksa kembali sumber.');
    }
  } else if (input.fused.size > 0) {
    // Fallback umum: rangkum N konsep
    const concepts = [...input.fused.values()];
    judul = `Ringkasan ${concepts.length} Indikator`;
    const parts = concepts.slice(0, 3).map(fm => `${fm.label}: ${fmt(fm.primary?.value ?? 0)} ${fm.primary?.unitCanonical ?? ''} (${fm.primary?.source.label ?? '-'})`);
    ringkasan = parts.join(' • ') + (concepts.length > 3 ? ` • dan ${concepts.length - 3} indikator lain.` : '.');
    for (const fm of concepts) {
      poin.push(`${fm.label}: ${fmt(fm.primary?.value ?? 0)} (${fm.primary?.source.label ?? '-'})`);
    }
  } else {
    ringkasan = 'Tidak ada data yang memenuhi filter — coba longgarkan periode atau geografi, atau periksa ketersediaan sumber (SAPA/DTSEN/Bapokting/Dokumen).';
  }

  // Deduplicate caveats
  const uniqCaveats = [...new Set(caveats)];

  return { judul, ringkasan, poin, caveats: uniqCaveats, hasDiscrepancy };
}
