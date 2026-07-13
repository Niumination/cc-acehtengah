// ─── Klasifikasi Intent dari Natural Language ───

export interface IntentResult {
  kategori: 'tren' | 'perbandingan' | 'nilai_saat_ini' | 'rekomendasi' | 'ews' | 'umum';
  splpEndpoint?: string;
  datasetSlug?: string;
  periode?: string;
  lokasi?: string;
  butuhData: boolean;
  intentRaw: string;
}

const INTENT_PATTERNS: Record<string, RegExp[]> = {
  tren: [
    /tren/i, /perkembangan/i, /perubahan/i, /naik|turun/i,
    /(bulan|tahun|minggu) (terakhir|ini|depan)/i,
    /dalam (3|6|12) (bulan|tahun)/i,
  ],
  perbandingan: [
    /banding/i, /vs/i, /versus/i, /lebih (tinggi|rendah|besar)/i,
    /dibanding/i, /antar/i, /per (kecamatan|skpk|dinas)/i,
  ],
  ews: [
    /peringatan/i, /warning/i, /alert/i, /ambang/i,
    /melebihi (batas|threshold)/i, /kritis/i, /darurat/i,
  ],
  rekomendasi: [
    /rekomendasi/i, /saran/i, /solusi/i, /tindakan/i,
    /apa yang harus/i, /langkah/i,
  ],
};

export async function detectIntent(query: string): Promise<IntentResult> {
  for (const [kategori, patterns] of Object.entries(INTENT_PATTERNS)) {
    if (patterns.some((p) => p.test(query))) {
      return {
        kategori: kategori as IntentResult['kategori'],
        butuhData: true,
        intentRaw: kategori,
      };
    }
  }

  return {
    kategori: 'nilai_saat_ini',
    butuhData: true,
    intentRaw: 'nilai_saat_ini',
  };
}
