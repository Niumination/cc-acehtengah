// ─── SAPA Direct Client ───
// Fetch langsung dari api-splp.layanan.go.id (public, tanpa auth)
// Ganti SPLP bridge yang lama.

const SAPA_BASE = 'https://api-splp.layanan.go.id/sapa/1.0/api';

// ─── Types ───

export interface SapaRecord {
  id: number;
  id_kode_indikator: number;
  kode_indikator_kode_indikator: string | null;
  kode_indikator_nama_indikator: string | null;
  id_opds: number;
  opds_nama_opd: string;
  jadwal_pemutakhiran: string;
  satuan: string;
  tahun: string;
  variabel: string;
}

export interface SapaResponse {
  api_status: number;
  api_message: string;
  data: SapaRecord[];
}

// ─── Client ───

export async function fetchSapaData(): Promise<SapaRecord[]> {
  const res = await fetch(`${SAPA_BASE}/daftar_data`, {
    headers: { 'Content-Type': 'application/json' },
    signal: AbortSignal.timeout(30000),
  });

  if (!res.ok) {
    throw new Error(`SAPA API error ${res.status}: ${res.statusText}`);
  }

  const json: SapaResponse = await res.json();

  if (json.api_status !== 1) {
    throw new Error(`SAPA API failed: ${json.api_message}`);
  }

  return json.data;
}

// ─── Helpers: Aggregate SAPA data ───

/** Unique OPD list from records */
export function getUniqueOpd(records: SapaRecord[]): { nama: string; id: number; jumlah: number }[] {
  const map = new Map<string, { nama: string; id: number; jumlah: number }>();
  for (const r of records) {
    const key = r.opds_nama_opd.trim();
    const existing = map.get(key);
    if (existing) {
      existing.jumlah++;
    } else {
      map.set(key, { nama: key, id: r.id_opds, jumlah: 1 });
    }
  }
  return [...map.values()].sort((a, b) => b.jumlah - a.jumlah);
}

/** Unique indicators */
export function getUniqueIndicators(records: SapaRecord[]): { kode: string | null; nama: string | null; jumlah: number }[] {
  const map = new Map<string, { kode: string | null; nama: string | null; jumlah: number }>();
  for (const r of records) {
    const key = r.id_kode_indikator.toString();
    const existing = map.get(key);
    if (existing) {
      existing.jumlah++;
    } else {
      map.set(key, { kode: r.kode_indikator_kode_indikator, nama: r.kode_indikator_nama_indikator, jumlah: 1 });
    }
  }
  return [...map.values()].sort((a, b) => b.jumlah - a.jumlah);
}

/** Filter by OPD name (case-insensitive, partial match) */
export function filterByOpd(records: SapaRecord[], opdQuery: string): SapaRecord[] {
  const q = opdQuery.toLowerCase();
  return records.filter(r => r.opds_nama_opd.toLowerCase().includes(q));
}

/** Filter by indicator keyword (partial match on nama_indikator) */
export function filterByIndicator(records: SapaRecord[], keyword: string): SapaRecord[] {
  const q = keyword.toLowerCase();
  return records.filter(r =>
    r.kode_indikator_nama_indikator?.toLowerCase().includes(q) ?? false
  );
}

/** Summary stats */
export function getSapaSummary(records: SapaRecord[]) {
  const opds = getUniqueOpd(records);
  const indicators = getUniqueIndicators(records);
  return {
    totalRecords: records.length,
    totalOpd: opds.length,
    totalIndicators: indicators.length,
    topOpd: opds[0],
    tahun: [...new Set(records.map(r => r.tahun))],
  };
}
