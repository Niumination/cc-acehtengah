// ─── Enhanced Intent Detection ───
// Mendeteksi intent + dataset spesifik + lokasi dari query

import { IntentResult } from '@/types';

// Mapping keywords → dataset slug → SPLP endpoint
const DATASET_KEYWORDS: Record<string, { slug: string; endpoint: string }> = {
  stunting: { slug: 'stunting', endpoint: 'sapa/dataset/stunting' },
  kemiskinan: { slug: 'kemiskinan', endpoint: 'sapa/dataset/kemiskinan' },
  inflasi: { slug: 'inflasi', endpoint: 'sapa/dataset/inflasi-pangan' },
  pangan: { slug: 'inflasi', endpoint: 'sapa/dataset/inflasi-pangan' },
  anggaran: { slug: 'anggaran', endpoint: 'sapa/dataset/realisasi-anggaran' },
  serapan: { slug: 'anggaran', endpoint: 'sapa/dataset/realisasi-anggaran' },
  bansos: { slug: 'bansos', endpoint: 'sapa/dataset/bantuan-sosial' },
  'bantuan sosial': { slug: 'bansos', endpoint: 'sapa/dataset/bantuan-sosial' },
  pendidikan: { slug: 'pendidikan', endpoint: 'sapa/dataset/pendidikan' },
  kesehatan: { slug: 'kesehatan', endpoint: 'sapa/dataset/kesehatan' },
  pegawai: { slug: 'kepegawaian', endpoint: 'sapa/dataset/kepegawaian' },
  kepegawaian: { slug: 'kepegawaian', endpoint: 'sapa/dataset/kepegawaian' },
};

const INTENT_PATTERNS: Record<string, RegExp[]> = {
  tren: [
    /tren/i, /perkembangan/i, /perubahan/i, /naik|turun/i,
    /(bulan|tahun|minggu) (terakhir|ini|depan)/i,
    /dalam (3|6|12) (bulan|tahun)/i,
    /sejak/i, /dari (bulan|tahun) (lalu|lalu)/i,
  ],
  perbandingan: [
    /banding/i, /vs/i, /versus/i, /lebih (tinggi|rendah|besar)/i,
    /dibanding/i, /antar/i, /per (kecamatan|skpk|dinas)/i,
    /tertinggi/i, /terendah/i,
  ],
  ews: [
    /peringatan/i, /warning/i, /alert/i, /ambang/i,
    /melebihi (batas|threshold)/i, /kritis/i, /darurat/i,
    /waspada/i,
  ],
  rekomendasi: [
    /rekomendasi/i, /saran/i, /solusi/i, /tindakan/i,
    /apa yang harus/i, /langkah/i, /sebaiknya/i,
  ],
};

export function detectDataset(query: string): { slug?: string; endpoint?: string } {
  for (const [keyword, mapping] of Object.entries(DATASET_KEYWORDS)) {
    if (query.toLowerCase().includes(keyword) && mapping.slug) {
      return { slug: mapping.slug, endpoint: mapping.endpoint };
    }
  }
  return {};
}

export function detectLocation(query: string): string | undefined {
  const kecamatanDiAcehTengah = [
    'lut tawar', 'bies', 'peusangan siblah krueng', 'ketol', 'celala',
    'rusip', 'kebayakan', 'pegasing', 'bintang', 'silih nara',
    'jagong jeger', 'atuh', 'pantan cuaca',
  ];
  for (const kcm of kecamatanDiAcehTengah) {
    if (query.toLowerCase().includes(kcm)) return kcm;
  }
  return undefined;
}

export async function detectIntent(query: string): Promise<IntentResult> {
  const location = detectLocation(query);
  const dataset = detectDataset(query);

  // Intent classification
  for (const [kategori, patterns] of Object.entries(INTENT_PATTERNS)) {
    if (patterns.some((p) => p.test(query))) {
      return {
        kategori: kategori as IntentResult['kategori'],
        splpEndpoint: dataset.endpoint,
        datasetSlug: dataset.slug,
        lokasi: location,
        butuhData: true,
        intentRaw: kategori,
      };
    }
  }

  return {
    kategori: 'nilai_saat_ini',
    splpEndpoint: dataset.endpoint,
    datasetSlug: dataset.slug,
    lokasi: location,
    butuhData: true,
    intentRaw: 'nilai_saat_ini',
  };
}
