// ─── SAPA Client — Direct API (OAuth) + SPLP fallback ───
// Prioritas: Direct API (sapa.acehtengahkab.go.id) dengan OAuth token.
// Fallback: SPLP nasional (api-splp.layanan.go.id) jika direct gagal.

const DIRECT_TOKEN_URL = process.env.SAPA_TOKEN_URL ?? 'https://sapa.acehtengahkab.go.id/oauth/token';
const DIRECT_API_URL = process.env.SAPA_API_URL ?? 'https://sapa.acehtengahkab.go.id/api';
const SPLP_BASE = 'https://api-splp.layanan.go.id/sapa/1.0/api';

const BROWSER_UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36';

// ─── OAuth Token Cache ───
let tokenCache: { token: string; expiresAt: number } | null = null;

async function getOAuthToken(): Promise<string> {
  // Gunakan cache jika masih valid (kurangi 60s margin)
  if (tokenCache && tokenCache.expiresAt > Date.now() + 60000) {
    return tokenCache.token;
  }

  const clientId = process.env.SAPA_CLIENT_ID ?? '3';
  const clientSecret = process.env.SAPA_CLIENT_SECRET ?? '';

  if (!clientSecret) {
    throw new Error('SAPA_CLIENT_SECRET tidak dikonfigurasi');
  }

  const form = new URLSearchParams();
  form.set('grant_type', 'client_credentials');
  form.set('client_id', clientId);
  form.set('client_secret', clientSecret);

  const res = await fetch(DIRECT_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'User-Agent': BROWSER_UA },
    body: form.toString(),
    signal: AbortSignal.timeout(15000),
  });

  if (!res.ok) {
    const errBody = await res.text().catch(() => '');
    throw new Error(`SAPA OAuth error ${res.status}: ${errBody.slice(0, 200)}`);
  }

  const data = await res.json();
  if (!data.access_token) {
    throw new Error('SAPA OAuth response tanpa access_token');
  }

  tokenCache = {
    token: data.access_token,
    expiresAt: Date.now() + (data.expires_in ?? 3600) * 1000,
  };
  return tokenCache.token;
}

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
  tahun: string | null;
  variabel: string;
}

export interface SapaResponse {
  api_status: number;
  api_message: string;
  data: SapaRecord[];
}

export type SapaDataOrigin = 'direct' | 'splp';

export function dataSourceLabel(origin: SapaDataOrigin): string {
  return origin === 'direct'
    ? 'SAPA Aceh Tengah (sapa.acehtengahkab.go.id)'
    : 'SAPA Aceh Tengah (api-splp.layanan.go.id)';
}

// ─── Fetch: Direct API (OAuth) dengan fallback SPLP ───

export async function fetchSapaData(): Promise<{ records: SapaRecord[]; origin: SapaDataOrigin }> {
  // 1. Coba Direct API dengan OAuth token
  try {
    const token = await getOAuthToken();
    const res = await fetch(`${DIRECT_API_URL}/daftar_data`, {
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/json', 'User-Agent': BROWSER_UA },
      signal: AbortSignal.timeout(30000),
    });

    if (!res.ok) {
      throw new Error(`Direct SAPA API error ${res.status}`);
    }

    const json: SapaResponse = await res.json();
    if (json.api_status !== 1 || !Array.isArray(json.data)) {
      throw new Error(`Direct SAPA API failed: ${json.api_message}`);
    }
    return { records: json.data, origin: 'direct' };
  } catch (directErr) {
    console.warn('[SAPA] Direct API gagal, fallback ke SPLP:', directErr instanceof Error ? directErr.message : directErr);
  }

  // 2. Fallback: SPLP nasional
  const res = await fetch(`${SPLP_BASE}/daftar_data`, {
    headers: { 'Content-Type': 'application/json', 'User-Agent': BROWSER_UA },
    signal: AbortSignal.timeout(30000),
  });

  if (!res.ok) {
    throw new Error(`SPLP API error ${res.status}: ${res.statusText}`);
  }

  const json: SapaResponse = await res.json();
  if (json.api_status !== 1) {
    throw new Error(`SPLP API failed: ${json.api_message}`);
  }
  return { records: json.data, origin: 'splp' };
}

// ─── Helpers: Normalisasi & Filtering ───

/** Normalize text: lowercase, strip diacritics-ish, collapse spaces. */
export function normalizeText(s: string | null | undefined): string {
  return (s ?? '')
    .toLowerCase()
    .replace(/[.,;:'"()[\]]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Token set dari query — hapus stopwords umum. */
export function tokenizeQuery(query: string): string[] {
  const stopWords = new Set([
    'bagaimana', 'tentang', 'berapa', 'data', 'status', 'informasi',
    'untuk', 'dari', 'dengan', 'apa', 'siapa', 'dimana', 'kapan',
    'mengapa', 'adalah', 'ada', 'yang', 'di', 'dan', 'atau', 'ini',
    'itu', 'bisa', 'tolong', 'jelaskan', 'tampilkan', 'perlihatkan',
    'daftar', 'list', 'show', 'opd', 'sapa', 'kabupaten', 'aceh',
    'tengah', 'saja', 'saya', 'mau', 'ingin', 'tolong', 'hitung',
    'jumlah', 'total', 'berapa', 'banyak', 'sebutkan', 'jelaskan',
  ]);
  return normalizeText(query)
    .split(' ')
    .filter((w) => w.length >= 3 && !stopWords.has(w) && !/^\d+$/.test(w));
}

/** Unique OPD list from records */
export function getUniqueOpd(records: SapaRecord[]): { nama: string; id: number; jumlah: number }[] {
  const map = new Map<string, { nama: string; id: number; jumlah: number }>();
  for (const r of records) {
    const key = normalizeText(r.opds_nama_opd) || 'unknown';
    const existing = map.get(key);
    if (existing) {
      existing.jumlah++;
    } else {
      map.set(key, { nama: r.opds_nama_opd.trim(), id: r.id_opds, jumlah: 1 });
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

/** Filter by OPD name (case-insensitive, partial match, normalized) */
export function filterByOpd(records: SapaRecord[], opdQuery: string): SapaRecord[] {
  const q = normalizeText(opdQuery);
  const tokens = q.split(' ').filter(Boolean);
  return records.filter((r) => {
    const name = normalizeText(r.opds_nama_opd);
    return tokens.every((t) => name.includes(t));
  });
}

/** Filter by indicator keyword — OR over tokens (more permissive than AND) */
export function filterByIndicator(records: SapaRecord[], keyword: string): SapaRecord[] {
  const q = normalizeText(keyword);
  if (!q) return [];
  return records.filter((r) => {
    const name = normalizeText(r.kode_indikator_nama_indikator);
    return name.includes(q);
  });
}

/** Filter by ANY of the given keywords (token-level OR match) */
export function filterByAnyKeyword(records: SapaRecord[], keywords: string[]): SapaRecord[] {
  const normalized = keywords.map(normalizeText).filter(Boolean);
  if (normalized.length === 0) return [];
  return records.filter((r) => {
    const name = normalizeText(r.kode_indikator_nama_indikator);
    return normalized.some((kw) => name.includes(kw));
  });
}

/** Filter by ALL keywords (token-level AND match) — indikator + OPD combined */
export function filterByAllKeywords(records: SapaRecord[], keywords: string[]): SapaRecord[] {
  const normalized = keywords.map(normalizeText).filter(Boolean);
  if (normalized.length === 0) return [];
  return records.filter((r) => {
    const combined =
      normalizeText(r.kode_indikator_nama_indikator) + ' ' + normalizeText(r.opds_nama_opd);
    return normalized.every((kw) => combined.includes(kw));
  });
}

function parseYear(tahun: string | null): number | null {
  if (!tahun) return null;
  const t = tahun.trim();
  if (!t) return null;
  if (!/^\d{4}$/.test(t)) return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

/**
 * Aggregate records per indicator — latest numeric value per indicator.
 * Pilih tahun numerik maksimum per id_kode_indikator (order-independent).
 * Jika semua tahun null/non-numerik → keep first. Sorted by nilaiNumber desc.
 */
export function aggregateByIndicator(records: SapaRecord[]): {
  id: number;
  nama: string;
  opd: string;
  nilai: string;
  nilaiNumber: number;
  satuan: string;
  tahun: string | null;
}[] {
  const map = new Map<number, {
    id: number; nama: string; opd: string; nilai: string; nilaiNumber: number;
    satuan: string; tahun: string | null;
  }>();

  for (const r of records) {
    const nama = r.kode_indikator_nama_indikator?.trim();
    if (!nama) continue;
    const nilaiNumber = Number(String(r.variabel).replace(/[^\d.-]/g, ''));
    if (!Number.isFinite(nilaiNumber)) continue;

    const existing = map.get(r.id_kode_indikator);
    if (!existing) {
      map.set(r.id_kode_indikator, {
        id: r.id_kode_indikator,
        nama,
        opd: r.opds_nama_opd.trim(),
        nilai: r.variabel,
        nilaiNumber,
        satuan: r.satuan,
        tahun: r.tahun || null,
      });
    } else {
      const ey = parseYear(existing.tahun);
      const ny = parseYear(r.tahun);
      let shouldReplace = false;
      if (ey === null && ny !== null) shouldReplace = true;
      else if (ey !== null && ny !== null && ny > ey) shouldReplace = true;
      if (shouldReplace) {
        map.set(r.id_kode_indikator, {
          id: r.id_kode_indikator,
          nama,
          opd: r.opds_nama_opd.trim(),
          nilai: r.variabel,
          nilaiNumber,
          satuan: r.satuan,
          tahun: r.tahun,
        });
      }
    }
  }

  return [...map.values()].sort((a, b) => b.nilaiNumber - a.nilaiNumber);
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
    tahun: [...new Set(records.map((r) => r.tahun?.trim() || '').filter(Boolean))],
  };
}
