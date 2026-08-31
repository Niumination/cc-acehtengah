// ─── Registri Indikator (WP1.3) ───────────────────────────────────────────────
// Varian nama SAPA → satu conceptId kanonik.
// 40+ konsep prioritas Aceh Tengah.

import type { MeasureType } from './types';

export interface IndicatorConcept {
  conceptId: string;
  canonicalName: string;
  aliases: string[];
  matchRegex?: RegExp;
  measure: MeasureType;
  unitCanonical: string;
  ownerOpd?: string;
  denominatorConceptId?: string;
  isPrimary: boolean;
  notes?: string;
}

const CONCEPTS: IndicatorConcept[] = [
  // ─── Stunting ───
  {
    conceptId: 'stunting.balita.count',
    canonicalName: 'Jumlah Balita Stunting',
    aliases: [
      'jumlah anak balita yang mengalami stunting',
      'jumlah balita stunting',
      'balita stunting',
      'stunting balita',
    ],
    matchRegex: /stunting/i,
    measure: 'count',
    unitCanonical: 'jiwa',
    ownerOpd: 'Dinas Kesehatan',
    denominatorConceptId: 'penduduk.balita.count',
    isPrimary: true,
  },
  {
    conceptId: 'stunting.balita.rate',
    canonicalName: 'Prevalensi Stunting Balita',
    aliases: ['prevalensi stunting', 'angka stunting persen', 'prevalensi stunting (pendek dam sangat pendek)'],
    matchRegex: /prevalensi\s+stunting/i,
    measure: 'rate_percent',
    unitCanonical: 'persen',
    ownerOpd: 'Dinas Kesehatan',
    isPrimary: true,
  },
  // ─── Kemiskinan ───
  {
    conceptId: 'kemiskinan.penduduk.count',
    canonicalName: 'Jumlah Penduduk Miskin',
    aliases: ['jumlah penduduk miskin', 'penduduk miskin', 'warga miskin'],
    matchRegex: /penduduk\s+miskin/i,
    measure: 'count',
    unitCanonical: 'jiwa',
    denominatorConceptId: 'penduduk.total.count',
    isPrimary: true,
  },
  {
    conceptId: 'kemiskinan.penduduk.rate',
    canonicalName: 'Persentase Kemiskinan',
    aliases: ['tingkat kemiskinan', 'persentase penduduk miskin', 'angka kemiskinan', 'persen miskin'],
    matchRegex: /tingkat\s+kemiskinan|persentase\s+kemiskinan/i,
    measure: 'rate_percent',
    unitCanonical: 'persen',
    isPrimary: true,
  },
  // ─── Penduduk ───
  {
    conceptId: 'penduduk.total.count',
    canonicalName: 'Jumlah Penduduk',
    aliases: ['jumlah penduduk', 'total penduduk', 'populasi', 'jumlah warga'],
    matchRegex: /jumlah\s+penduduk|total\s+penduduk/i,
    measure: 'count',
    unitCanonical: 'jiwa',
    isPrimary: true,
  },
  {
    conceptId: 'penduduk.balita.count',
    canonicalName: 'Jumlah Balita',
    aliases: ['jumlah balita', 'anak balita', 'balita', 'anak usia 0-5 tahun'],
    measure: 'count',
    unitCanonical: 'jiwa',
    isPrimary: false,
  },
  {
    conceptId: 'penduduk.kk.count',
    canonicalName: 'Jumlah Kepala Keluarga',
    aliases: ['jumlah kk', 'jumlah keluarga', 'kepala keluarga', 'kk'],
    measure: 'count',
    unitCanonical: 'kk',
    isPrimary: true,
  },
  // ─── IPM ───
  {
    conceptId: 'ipm.index',
    canonicalName: 'Indeks Pembangunan Manusia (IPM)',
    aliases: ['ipm', 'indeks pembangunan manusia', 'human development index', 'hdi'],
    matchRegex: /\bipm\b|indeks\s+pembangunan\s+manusia/i,
    measure: 'index',
    unitCanonical: 'indeks',
    isPrimary: true,
  },
  // ─── PDRB ───
  {
    conceptId: 'pdrb.total.currency',
    canonicalName: 'PDRB',
    aliases: ['pdrb', 'produk domestik regional bruto', 'regional gross domestic product'],
    matchRegex: /\bpdrb\b/i,
    measure: 'currency',
    unitCanonical: 'rupiah',
    isPrimary: true,
  },
  // ─── Pendidikan ───
  {
    conceptId: 'pendidikan.siswa.sd.count',
    canonicalName: 'Jumlah Siswa SD',
    aliases: ['jumlah siswa sd', 'siswa sekolah dasar', 'murid sd'],
    matchRegex: /siswa\s+sd|murid\s+sd/i,
    measure: 'count',
    unitCanonical: 'jiwa',
    ownerOpd: 'Dinas Pendidikan',
    isPrimary: false,
  },
  {
    conceptId: 'pendidikan.putus.sekolah.count',
    canonicalName: 'Jumlah Putus Sekolah',
    aliases: ['putus sekolah', 'dropout', 'anak tidak sekolah'],
    matchRegex: /putus\s+sekolah/i,
    measure: 'count',
    unitCanonical: 'jiwa',
    ownerOpd: 'Dinas Pendidikan',
    isPrimary: false,
  },
  // ─── Pertanian & Perkebunan ───
  {
    conceptId: 'kopi.arabika.produksi.weight',
    canonicalName: 'Produksi Kopi Arabika',
    aliases: ['produksi kopi arabika', 'kopi arabika', 'arabika'],
    matchRegex: /kopi\s+arabika/i,
    measure: 'weight',
    unitCanonical: 'ton',
    ownerOpd: 'Dinas Perkebunan',
    isPrimary: true,
  },
  {
    conceptId: 'kopi.robusta.produksi.weight',
    canonicalName: 'Produksi Kopi Robusta',
    aliases: ['produksi kopi robusta', 'kopi robusta', 'robusta'],
    matchRegex: /kopi\s+robusta/i,
    measure: 'weight',
    unitCanonical: 'ton',
    ownerOpd: 'Dinas Perkebunan',
    isPrimary: false,
  },
  // ─── Infrastruktur ───
  {
    conceptId: 'jalan.panjang.length',
    canonicalName: 'Panjang Jalan',
    aliases: ['panjang jalan', 'jalan kabupaten', 'panjang ruas jalan'],
    matchRegex: /panjang\s+jalan/i,
    measure: 'length',
    unitCanonical: 'km',
    ownerOpd: 'Dinas PU',
    isPrimary: false,
  },
  // ─── Bansos ───
  {
    conceptId: 'bansos.pkh.count',
    canonicalName: 'Penerima PKH',
    aliases: ['penerima pkh', 'pkh', 'program keluarga harapan'],
    matchRegex: /\bpkh\b/i,
    measure: 'count',
    unitCanonical: 'jiwa',
    ownerOpd: 'Dinas Sosial',
    isPrimary: true,
  },
  {
    conceptId: 'bansos.bpnt.count',
    canonicalName: 'Penerima BPNT',
    aliases: ['penerima bpnt', 'bpnt', 'bantuan pangan non tunai'],
    matchRegex: /\bbpnt\b/i,
    measure: 'count',
    unitCanonical: 'jiwa',
    ownerOpd: 'Dinas Sosial',
    isPrimary: false,
  },
  {
    conceptId: 'bansos.pbi.count',
    canonicalName: 'Penerima PBI',
    aliases: ['penerima pbi', 'pbi', 'penerima pbi jk', 'pbi jaminan kesehatan'],
    matchRegex: /\bpbi\b/i,
    measure: 'count',
    unitCanonical: 'jiwa',
    ownerOpd: 'Dinas Sosial',
    isPrimary: false,
  },
  // ─── ASN ───
  {
    conceptId: 'asn.count',
    canonicalName: 'Jumlah ASN',
    aliases: ['jumlah asn', 'asn', 'pegawai negeri', 'pns'],
    matchRegex: /\basn\b|\bpns\b/i,
    measure: 'count',
    unitCanonical: 'jiwa',
    isPrimary: false,
  },
  {
    conceptId: 'pppk.count',
    canonicalName: 'Jumlah PPPK',
    aliases: ['jumlah pppk', 'pppk', 'p3k'],
    matchRegex: /\bpppk\b|\bp3k\b/i,
    measure: 'count',
    unitCanonical: 'jiwa',
    isPrimary: false,
  },
];

// Build index: lowercase alias/name → conceptId
const _aliasIndex = new Map<string, string>();
for (const c of CONCEPTS) {
  _aliasIndex.set(c.canonicalName.toLowerCase(), c.conceptId);
  for (const a of c.aliases) _aliasIndex.set(a.toLowerCase(), c.conceptId);
}

export function resolveConceptId(rawName: string): string | undefined {
  const lower = rawName.trim().toLowerCase();
  // exact alias match first
  const exact = _aliasIndex.get(lower);
  if (exact) return exact;
  // regex match
  for (const c of CONCEPTS) {
    if (c.matchRegex?.test(rawName)) return c.conceptId;
  }
  return undefined;
}

export function getConcept(conceptId: string): IndicatorConcept | undefined {
  return CONCEPTS.find((c) => c.conceptId === conceptId);
}

export function getAllConcepts(): IndicatorConcept[] {
  return CONCEPTS;
}
