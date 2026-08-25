import { NextResponse } from 'next/server';
import { fetchSapaData, dataSourceLabel, type SapaDataOrigin } from '@/lib/sapa-client';

// In-memory cache — satu entri per OPD, TTL 10 menit (pola sama dengan
// /api/analytics dan /api/stats).
interface CacheEntry {
  data: OpdDetail;
  expiry: number;
}
const cache = new Map<string, CacheEntry>();
const CACHE_TTL = 10 * 60 * 1000;

function getErrMessage(err: unknown): string {
  return err instanceof Error ? err.message : 'Kesalahan tidak diketahui';
}

export interface IndicatorRow {
  nama: string;
  nilai: string | null;
  satuan: string;
  tahun: string | null;
}

export interface IndicatorSeries {
  idKodeIndikator: number;
  nama: string;
  satuan: string;
  /** Titik dengan tahun valid saja — sudah terurut naik. */
  points: { tahun: number; nilai: number }[];
  /** Jumlah record indikator ini yang TIDAK punya tahun valid. */
  recordsWithoutYear: number;
}

export interface OpdDetail {
  nama: string;
  totalRecords: number;
  uniqueIndicators: number;
  /** Record OPD ini tanpa tahun valid (kualitas data, jujur ditampilkan). */
  recordsWithoutYear: number;
  /** Deret tren hanya untuk indikator yang benar-benar punya ≥2 titik tahunan. */
  trends: IndicatorSeries[];
  indicatorsWithoutTrend: number;
  topIndicators: IndicatorRow[];
  origin: SapaDataOrigin;
  sourceLabel: string;
  lastFetched: string;
}

function parseNumeric(value: string): number | null {
  // Format Indonesia: titik ribuan, koma desimal ("1.234,56").
  const cleaned = value.replace(/\s/g, '').replace(/\./g, '').replace(/,/g, '.');
  if (!/^\d+(\.\d+)?$/.test(cleaned)) return null;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  try {
    const { slug } = await params;
    const opdName = decodeURIComponent(slug).trim();
    if (!opdName || opdName.length > 200) {
      return NextResponse.json({ error: 'Parameter OPD tidak valid' }, { status: 400 });
    }

    const cached = cache.get(opdName);
    if (cached && Date.now() < cached.expiry) {
      return NextResponse.json(cached.data);
    }

    const { records, origin } = await fetchSapaData();
    // Pencocokan persis nama OPD (bukan filter token longgar filterByOpd) agar
    // drill-down tepat satu OPD; fallback case-insensitive.
    const target = records.find(r => r.opds_nama_opd === opdName)
      ?? records.find(r => r.opds_nama_opd.toLowerCase() === opdName.toLowerCase());
    if (!target) {
      return NextResponse.json({ error: `OPD "${opdName}" tidak ditemukan di data SAPA` }, { status: 404 });
    }
    const exactName = target.opds_nama_opd;
    const opdRecords = records.filter(r => r.opds_nama_opd === exactName);

    // Kelompokkan per indikator unik (id_kode_indikator), susun deret tahunan.
    type SapaRecordLike = (typeof records)[number];
    const byIndicator = new Map<number, SapaRecordLike[]>();
    for (const r of opdRecords) {
      const key = r.id_kode_indikator;
      const list = byIndicator.get(key);
      if (list) list.push(r);
      else byIndicator.set(key, [r]);
    }

    const trends: IndicatorSeries[] = [];
    let indicatorsWithoutTrend = 0;
    let recordsWithoutYear = 0;

    const rows: IndicatorRow[] = [];
    for (const [idKode, recs] of byIndicator) {
      const nama = recs[0]?.kode_indikator_nama_indikator?.trim() || `Indikator #${idKode}`;
      const satuan = recs[0]?.satuan || '-';

      // Baris tabel: record dengan nilai variabel terisi; urut tahun terbaru dulu.
      const withValues = recs
        .filter(r => r.variabel && r.variabel.trim() !== '')
        .sort((a, b) => (b.tahun ?? '').localeCompare(a.tahun ?? ''));
      if (withValues.length > 0) {
        rows.push({ nama, nilai: withValues[0].variabel, satuan, tahun: withValues[0].tahun });
      }

      // Deret tren: hanya pasangan (tahun>0, nilai numerik) yang valid.
      const yearPoints: { tahun: number; nilai: number }[] = [];
      let withoutYear = 0;
      for (const r of recs) {
        const year = parseInt(r.tahun ?? '', 10);
        const num = r.variabel ? parseNumeric(r.variabel) : null;
        if (!Number.isFinite(year) || year <= 1900) { withoutYear++; continue; }
        if (num === null) continue;
        yearPoints.push({ tahun: year, nilai: num });
      }
      recordsWithoutYear += withoutYear;
      yearPoints.sort((a, b) => a.tahun - b.tahun);

      if (yearPoints.length >= 2) {
        // Deduplikasi tahun (ambil nilai pertama per tahun).
        const seen = new Set<number>();
        const deduped = yearPoints.filter(p => {
          if (seen.has(p.tahun)) return false;
          seen.add(p.tahun);
          return true;
        });
        if (deduped.length >= 2) {
          trends.push({ idKodeIndikator: idKode, nama, satuan, points: deduped, recordsWithoutYear: withoutYear });
          continue;
        }
      }
      indicatorsWithoutTrend++;
    }

    trends.sort((a, b) => b.points.length - a.points.length);
    rows.sort((a, b) => (b.tahun ?? '').localeCompare(a.tahun ?? ''));

    const result: OpdDetail = {
      nama: exactName,
      totalRecords: opdRecords.length,
      uniqueIndicators: byIndicator.size,
      recordsWithoutYear,
      trends: trends.slice(0, 8),
      indicatorsWithoutTrend,
      topIndicators: rows.slice(0, 15),
      origin,
      sourceLabel: dataSourceLabel(origin),
      lastFetched: new Date().toISOString(),
    };

    cache.set(opdName, { data: result, expiry: Date.now() + CACHE_TTL });
    return NextResponse.json(result);
  } catch (err: unknown) {
    return NextResponse.json({ error: getErrMessage(err) }, { status: 500 });
  }
}
