// ─── Shared Types ───

export interface HybridResponse {
  narasi: string;
  visualisasi: {
    tipe: 'chart' | 'table' | 'map' | 'metric' | 'none';
    konfigurasi: Record<string, unknown>;
  };
  rekomendasi?: string[];
  dataSource: string;
  timestamp: string;
}

export interface IntentResult {
  kategori: 'tren' | 'perbandingan' | 'nilai_saat_ini' | 'rekomendasi' | 'ews' | 'umum';
  splpEndpoint?: string;
  datasetSlug?: string;
  periode?: string;
  lokasi?: string;
  butuhData: boolean;
  intentRaw: string;
  opdFilter?: string;
}

