import { NextResponse } from 'next/server';
import { getUniqueOpd, getUniqueIndicators, filterByOpd } from '@/lib/sapa-client';
import { getSapaRecords, isMockMode } from '@/lib/data-source';
import { cached } from '@/lib/store';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// Cache bersama (§P1-08) — dulu variabel modul per-instance.
const CACHE_TTL = 10 * 60 * 1000;
const cacheKey = () => `analytics:v2:${isMockMode() ? 'mock' : 'live'}`;

export async function GET() {
  try {
    const result = await cached(cacheKey(), CACHE_TTL, async () => {
    const records = await getSapaRecords();
    const opds = getUniqueOpd(records);
    const indicators = getUniqueIndicators(records);

    // OPD breakdown with indicator categories
    const opdBreakdown = opds.map(opd => {
      const opdRecords = filterByOpd(records, opd.nama);
      const opdIndicators = getUniqueIndicators(opdRecords);
      const filledValues = opdRecords
        .filter(r => r.variabel && r.variabel.trim() !== '')
        .map(r => ({
          indicator: r.kode_indikator_nama_indikator,
          value: r.variabel,
          unit: r.satuan,
          period: r.jadwal_pemutakhiran,
        }));
      return {
        nama: opd.nama,
        jumlahIndikator: opd.jumlah,
        uniqueIndicators: opdIndicators.length,
        totalRecords: opdRecords.length,
        // Jumlah PENUH record yang punya nilai — dipakai untuk hitung kelengkapan.
        // Sebelumnya perhitungan memakai sampleValues yang sudah dipotong 5,
        // sehingga kelengkapan mustahil melebihi 500/jumlahIndikator persen.
        // Lihat LAPORAN_AUDIT_PRODUCTION_READINESS.md §P1-05(b)
        filledRecords: filledValues.length,
        hasData: filledValues.length > 0,
        sampleValues: filledValues.slice(0, 5),
      };
    });

    // Indicator frequency analysis
    //
    // BUG SEBELUMNYA (§P1-05a): kode membandingkan `r.id_kode_indikator` (ID numerik)
    // dengan `ind.kode` (field kode_indikator_kode_indikator, berupa string kode).
    // Dua field berbeda → hasil `opds` hampir selalu kosong.
    // Sekarang OPD dikelompokkan sekali lewat Map berdasarkan ID indikator.
    const opdsByIndicatorId = new Map<number, Set<string>>();
    for (const r of records) {
      if (r.id_kode_indikator == null) continue;
      let set = opdsByIndicatorId.get(r.id_kode_indikator);
      if (!set) {
        set = new Set<string>();
        opdsByIndicatorId.set(r.id_kode_indikator, set);
      }
      const nama = r.opds_nama_opd?.trim();
      if (nama) set.add(nama);
    }

    const indicatorFrequency = indicators.map(ind => ({
      nama: ind.nama,
      kode: ind.kode,
      jumlah: ind.jumlah,
      opds: [...(opdsByIndicatorId.get(ind.id) ?? [])].slice(0, 5),
    }));

    // Satuan (unit) distribution
    const satuanMap = new Map<string, number>();
    records.forEach(r => {
      if (r.satuan) {
        satuanMap.set(r.satuan, (satuanMap.get(r.satuan) || 0) + 1);
      }
    });
    const satuanDist = [...satuanMap.entries()]
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 15);

    // Jadwal pemutakhiran distribution
    const jadwalMap = new Map<string, number>();
    records.forEach(r => {
      if (r.jadwal_pemutakhiran) {
        jadwalMap.set(r.jadwal_pemutakhiran, (jadwalMap.get(r.jadwal_pemutakhiran) || 0) + 1);
      }
    });
    const jadwalDist = [...jadwalMap.entries()]
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);

    // Data completeness per OPD
    // Definisi: persentase record OPD yang punya nilai (variabel terisi)
    // terhadap total record OPD tersebut. Dibatasi 0–100.
    const completeness = opdBreakdown.map(opd => ({
      nama: opd.nama,
      completeness: opd.totalRecords > 0
        ? Math.min(100, Math.round((opd.filledRecords / opd.totalRecords) * 100))
        : 0,
      filledRecords: opd.filledRecords,
      totalRecords: opd.totalRecords,
    })).sort((a, b) => b.completeness - a.completeness);

    // Indicator type categorization
    const kategoriIndicators = new Map<string, number>();
    records.forEach(r => {
      const name = r.kode_indikator_nama_indikator || '';
      if (/jumlah|total|count/i.test(name)) kategoriIndicators.set('Jumlah/Total', (kategoriIndicators.get('Jumlah/Total') || 0) + 1);
      else if (/persentase|%|rate/i.test(name)) kategoriIndicators.set('Persentase/Rate', (kategoriIndicators.get('Persentase/Rate') || 0) + 1);
      else if (/luas|area|hektar/i.test(name)) kategoriIndicators.set('Luas/Area', (kategoriIndicators.get('Luas/Area') || 0) + 1);
      else if (/nilai|value|rata/i.test(name)) kategoriIndicators.set('Nilai/Rata-rata', (kategoriIndicators.get('Nilai/Rata-rata') || 0) + 1);
      else kategoriIndicators.set('Lainnya', (kategoriIndicators.get('Lainnya') || 0) + 1);
    });
    const kategoriIndikatorDist = [...kategoriIndicators.entries()]
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);

    const result = {
      overview: {
        totalRecords: records.length,
        totalOpd: opds.length,
        totalIndicators: indicators.length,
      },
      opdBreakdown,
      indicatorFrequency: indicatorFrequency.slice(0, 20),
      satuanDistribusi: satuanDist,
      jadwalDistribusi: jadwalDist,
      completeness,
      kategoriIndikator: kategoriIndikatorDist,
      lastFetched: new Date().toISOString(),
    };

      return result;
    });

    return NextResponse.json(result);
  } catch (err) {
    console.error('[analytics] Gagal:', err);
    return NextResponse.json(
      { error: 'Gagal mengambil data SAPA', errorCode: 'SAPA_UNAVAILABLE' },
      { status: 503 },
    );
  }
}
