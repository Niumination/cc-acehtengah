// ─── Bapokting Client — Scraper Harga Komoditas ───
// Sumber: https://cc.acehtengahkab.go.id/data-bapokting
// Format: Tabel HTML publik, 2.433 baris, update mingguan, 121 halaman
// Pagination: parameter GET (?page=X)

const BASE_URL = 'https://cc.acehtengahkab.go.id/data-bapokting';
const MAX_PAGES = 121;

export interface BapoktingPrice {
  no: number;
  namaKomoditas: string;
  hargaPerKg: number;
  satuan: string;
  tanggal: string;
  sumber: string;
}

export interface BapoktingResponse {
  prices: BapoktingPrice[];
  totalRecords: number;
  lastUpdated: string;
}

function parsePriceValue(value: string): number {
  // HapusRp., spasi, konversi ke number
  const cleaned = value.replace(/[Rp.\s]/g, '').trim();
  const parsed = parseInt(cleaned, 10);
  return isNaN(parsed) ? 0 : parsed;
}

function parseHtmlTable(html: string): BapoktingPrice[] {
  const prices: BapoktingPrice[] = [];

  // Regex untuk menangkap baris tabel
  const rowRegex = /<tr[^>]*>(.*?)<\/tr>/gis;
  const cellRegex = /<(td|th)[^>]*>(.*?)<\/(td|th)>/gis;

  let rowMatch;
  let isFirstRow = true;

  while ((rowMatch = rowRegex.exec(html)) !== null) {
    const rowHtml = rowMatch[1];

    // Lewati header row
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

    if (cells.length >= 4) {
      try {
        prices.push({
          no: parseInt(cells[0], 10) || 0,
          namaKomoditas: cells[1] || '',
          hargaPerKg: parsePriceValue(cells[2]),
          satuan: cells[3] || 'Kg',
          tanggal: new Date().toISOString().split('T')[0],
          sumber: 'Bapokting Aceh Tengah',
        });
      } catch (e) {
        // Skip malformed rows
      }
    }
  }

  return prices;
}

async function fetchPage(page: number): Promise<BapoktingPrice[]> {
  const url = `${BASE_URL}?page=${page}`;

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
      },
      signal: AbortSignal.timeout(30000),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const html = await response.text();
    return parseHtmlTable(html);
  } catch (error) {
    console.error(`[Bapokting] Failed to fetch page ${page}:`, error);
    return [];
  }
}

export async function fetchBapoktingPrices(): Promise<BapoktingResponse> {
  const allPrices: BapoktingPrice[] = [];
  const seen = new Set<string>(); // Dedup by komoditas + harga

  for (let page = 1; page <= MAX_PAGES; page++) {
    const prices = await fetchPage(page);

    for (const price of prices) {
      const key = `${price.namaKomoditas}-${price.hargaPerKg}`;
      if (!seen.has(key)) {
        seen.add(key);
        allPrices.push(price);
      }
    }

    // Stop jika tidak ada data lagi
    if (prices.length === 0) {
      console.log(`[Bapokting] No more data at page ${page}`);
      break;
    }

    // Progress indicator
    if (page % 10 === 0) {
      console.log(`[Bapokting] Progress: ${page}/${MAX_PAGES} pages, ${allPrices.length} records`);
    }
  }

  return {
    prices: allPrices,
    totalRecords: allPrices.length,
    lastUpdated: new Date().toISOString(),
  };
}

export async function fetchLatestBapoktingPrices(limit: number = 50): Promise<BapoktingPrice[]> {
  const response = await fetchBapoktingPrices();
  return response.prices.slice(0, limit);
}
