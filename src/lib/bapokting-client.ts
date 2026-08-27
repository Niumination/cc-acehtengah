// ─── Bapokting API Client — Fetch dari SPLP nasional ───
// Source: api-splp.layanan.go.id/bahan-pokok-penting-kabupaten-aceh-tengah/1.0/api/bapokting/harga
// API Key: Token JWT (bisa diperbarui via Vercel env vars)

const SPLP_BAPOKTING_URL = 'https://api-splp.layanan.go.id/bahan-pokok-penting-kabupaten-aceh-tengah/1.0/api/bapokting/harga';
const SPLP_DTSEN_URL = 'https://api-splp.layanan.go.id/dtsen-aceh-tengah/1.0/api/dtsen-aceh-tengah';

// Cache bahan baku untuk query DTSEN
let splpCache: { data: any[] | null; timestamp: number } | null = null;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export interface BapoktingPrice {
  namaBarang: string;
  harga: number;
  satuan: string;
  kecamatan?: string;
  keterangan?: string;
  updatedAt?: string;
}

export interface DtsenData {
  kecamatan: string;
  desil: string;
  desil_1?: number;
  desil_2?: number;
  desil_3?: number;
  desil_4?: number;
  desil_5?: number;
  pkh?: number;
  bpnt?: number;
  pbi_jk?: number;
  pbi_jk_non?: number;
  total_penerima?: number;
}

// Helper: ambil API key dari environment
function getSplpApiKey(): string {
  // API key dari token JWT di file dokumen
  return process.env.SPLP_API_KEY || '';
}

// Fetch bapokting data dari SPLP API
export async function fetchBapoktingFromSplp(): Promise<BapoktingPrice[]> {
  // Gunakan cache jika tersedia
  if (splpCache && Date.now() - splpCache.timestamp < CACHE_DURATION) {
    return splpCache.data || [];
  }

  const headers: Record<string, string> = {
    'Accept': 'application/json',
  };

  if (getSplpApiKey()) {
    headers['Authorization'] = `Bearer ${getSplpApiKey()}`;
  }

  try {
    const url = `${SPLP_BAPOKTING_URL}?tb=data_aset&s=kecamatan&f=desil`;
    const res = await fetch(url, {
      method: 'GET',
      headers,
      signal: AbortSignal.timeout(30000),
    });

    if (!res.ok) {
      throw new Error(`SPLP API error ${res.status}`);
    }

    const data = await res.json();
    const result: BapoktingPrice[] = [];

    // SPLP API: { status, sumber, tanggal, daftar_harga: [...] }
    const arr = Array.isArray(data) ? data : (data?.daftar_harga || data?.data || []);

    for (const item of arr) {
      const harga = parseInt(item.harga_eceran || item.harga_borongan || item.harga || item.price || '0', 10);
      if (harga > 0) {
        result.push({
          namaBarang: item.komoditi || item.nama_barang || item.nama || item.barang || 'Tidak diketahui',
          harga,
          satuan: item.satuan || item.unit || 'Kg',
          kecamatan: item.kecamatan || undefined,
          keterangan: item.keterangan || undefined,
          updatedAt: data?.tanggal || new Date().toISOString(),
        });
      }
    }

    // Update cache
    splpCache = { data: result, timestamp: Date.now() };

    return result;
  } catch (error) {
    console.error('[Bapokting SPLP] Fetch failed:', error);
    return [];
  }
}

// Fetch DTSEN aggregate data dari SPLP API
export async function fetchDtsenFromSplp(filters?: {
  kecamatan?: string;
  desa?: string;
  desil?: number;
}): Promise<DtsenData[]> {
  const headers: Record<string, string> = {
    'Accept': 'application/json',
  };

  if (getSplpApiKey()) {
    headers['Authorization'] = `Bearer ${getSplpApiKey()}`;
  }

  try {
    let url = `${SPLP_DTSEN_URL}?tb=data_aset&s=kecamatan&f=desil`;

    if (filters?.kecamatan) {
      url += `&kecamatan=${encodeURIComponent(filters.kecamatan)}`;
    }
    if (filters?.desa) {
      url += `&desa=${encodeURIComponent(filters.desa)}`;
    }
    if (filters?.desil !== undefined) {
      url += `&desil=${filters.desil}`;
    }

    const res = await fetch(url, {
      method: 'GET',
      headers,
      signal: AbortSignal.timeout(30000),
    });

    if (!res.ok) {
      throw new Error(`SPLP DTSEN API error ${res.status}`);
    }

    const data = await res.json();
    const result: DtsenData[] = [];

    if (Array.isArray(data)) {
      for (const item of data) {
        result.push({
          kecamatan: item.kecamatan || 'Tidak diketahui',
          desil: item.desil || item.desil_str || '1',
          pkh: parseInt(item.pkh || '0', 10),
          bpnt: parseInt(item.bpnt || '0', 10),
          pbi_jk: parseInt(item.pbi_jk || item.pbi_jk_buka || '0', 10),
          pbi_jk_non: parseInt(item.pbi_jk_non || item['pbi-jk-non'] || '0', 10),
          total_penerima: parseInt(item.total_penerima || item.total || '0', 10),
        });
      }
    } else if (data?.data && Array.isArray(data.data)) {
      for (const item of data.data) {
        result.push({
          kecamatan: item.kecamatan || 'Tidak diketahui',
          desil: item.desil || item.desil_str || '1',
          pkh: parseInt(item.pkh || '0', 10),
          bpnt: parseInt(item.bpnt || '0', 10),
          pbi_jk: parseInt(item.pbi_jk || item.pbi_jk_buka || '0', 10),
          pbi_jk_non: parseInt(item.pbi_jk_non || item['pbi-jk-non'] || '0', 10),
          total_penerima: parseInt(item.total_penerima || item.total || '0', 10),
        });
      }
    }

    return result;
  } catch (error) {
    console.error('[DTSEN SPLP] Fetch failed:', error);
    return [];
  }
}

// Fallback: ambil dari web scraping (original bapokting-client)
export async function fetchLatestBapoktingPrices(limit: number = 50): Promise<BapoktingPrice[]> {
  const fromApi = await fetchBapoktingFromSplp();
  
  if (fromApi.length > 0) {
    return fromApi.slice(0, limit);
  }

  // Fallback ke web scraping
  return fallbackWebScraping(limit);
}

// Original web scraping fallback
async function fallbackWebScraping(limit: number): Promise<BapoktingPrice[]> {
  const BASE_URL = 'https://cc.acehtengahkab.go.id/data-bapokting';
  const MAX_PAGES = 10; // Kurangi untuk testing

  const allPrices: BapoktingPrice[] = [];

  for (let page = 1; page <= MAX_PAGES; page++) {
    try {
      const url = `${BASE_URL}?page=${page}`;
      const res = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        },
        signal: AbortSignal.timeout(20000),
      });

      if (!res.ok) {
        break;
      }

      const html = await res.text();
      
      // Parse HTML table
      const rowRegex = /<tr[^>]*>(.*?)<\/tr>/gi;
      const cellRegex = /<(td|th)[^>]*>(.*?)<\/(td|th)>/gi;
      
      let rowMatch;
      let isFirstRow = true;

      while ((rowMatch = rowRegex.exec(html)) !== null) {
        const rowHtml = rowMatch[1];

        if (isFirstRow && rowHtml.includes('No')) {
          isFirstRow = false;
          continue;
        }

        const cells: string[] = [];
        let cellMatch;

        while ((cellMatch = cellRegex.exec(rowHtml)) !== null) {
          const cellText = cellMatch[2].replace(/<[^>]+>/g, '').trim();
          cells.push(cellText);
        }

        if (cells.length >= 3) {
          const hargaStr = cells[2] || '';
          const harga = parseInt(hargaStr.replace(/[Rp.\s]/g, '').trim(), 10) || 0;
          
          if (harga > 0) {
            allPrices.push({
              namaBarang: cells[1] || 'Tidak diketahui',
              harga,
              satuan: cells[3] || 'Kg',
            });
          }
        }
      }

      if (allPrices.length > 0 && allPrices.length >= limit) {
        break;
      }
    } catch (error) {
      break;
    }
  }

  return allPrices.slice(0, limit);
}
