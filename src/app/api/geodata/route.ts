import { NextResponse } from 'next/server';
import { fetchSapaData, filterByOpd, getUniqueIndicators } from '@/lib/sapa-client';

// Kecamatan di Kabupaten Aceh Tengah + koordinat + OPD mapping
const KECAMATAN_DATA = [
  { nama: 'Banda Mulia', lat: 4.4500, lng: 96.8500, opds: ['Dinas Pertanian', 'Dinas Pendidikan'] },
  { nama: 'Bebesen', lat: 4.6333, lng: 96.7167, opds: ['Dinas Kesehatan', 'Dinas Sosial', 'RSU Datu Beru'] },
  { nama: 'Burni Telong', lat: 4.5000, lng: 96.8167, opds: ['Dinas Pertanian', 'Dinas Perkebunan'] },
  { nama: 'Celala', lat: 4.5667, lng: 96.6500, opds: ['Dinas Pertanian', 'Dinas PUPR'] },
  { nama: 'Kebayakan', lat: 4.7167, lng: 96.7333, opds: ['Dinas Pendidikan', 'Dinas Pariwisata'] },
  { nama: 'Ketol', lat: 4.6833, lng: 96.6167, opds: ['Dinas Pertanian', 'Dinas Kehutanan'] },
  { nama: 'Kute Panang', lat: 4.5833, lng: 96.7833, opds: ['Dinas Pertanian', 'Dinas Perikanan'] },
  { nama: 'Laut Tawar', lat: 4.6500, lng: 96.7500, opds: ['Dinas Pariwisata', 'Dinas Perhubungan', 'Dinas Lingkungan Hidup'] },
  { nama: 'Linge', lat: 4.5333, lng: 96.7000, opds: ['Dinas Pariwisata', 'Dinas Kebudayaan'] },
  { nama: 'Pegasing', lat: 4.6167, lng: 96.8000, opds: ['Dinas Pertanian', 'Dinas Koperasi'] },
  { nama: 'Permata', lat: 4.5000, lng: 96.7500, opds: ['Dinas Pertanian', 'Dinas Perkebunan'] },
  { nama: 'Rusip Antara', lat: 4.4833, lng: 96.7833, opds: ['Dinas Pertanian', 'Dinas PUPR'] },
  { nama: 'Silih Nara', lat: 4.5500, lng: 96.7333, opds: ['Dinas Pertanian', 'Dinas Sosial'] },
  { nama: 'Bies Penjara', lat: 4.6667, lng: 96.7667, opds: ['Dinas Kesehatan', 'Dinas PPPA'] },
  { nama: 'Atu Lintang', lat: 4.5167, lng: 96.8167, opds: ['Dinas Pertanian', 'Dinas PUPR'] },
];

let geoCache: any = null;
let geoCacheExpiry = 0;

export async function GET() {
  try {
    if (geoCache && Date.now() < geoCacheExpiry) {
      return NextResponse.json(geoCache);
    }

    const records = await fetchSapaData();

    // Aggregate data per kecamatan
    const kecamatan = KECAMATAN_DATA.map(kec => {
      // Count records related to this kecamatan's OPDs
      let totalRecords = 0;
      let totalIndicators = 0;
      const indicatorSet = new Set<string>();
      const sampleData: any[] = [];

      for (const opdName of kec.opds) {
        const matched = records.filter(r =>
          r.opds_nama_opd.toLowerCase().includes(opdName.toLowerCase())
        );
        totalRecords += matched.length;
        matched.forEach(r => {
          if (r.kode_indikator_nama_indikator) indicatorSet.add(r.kode_indikator_nama_indikator);
        });
        sampleData.push(...matched.slice(0, 3).map(r => ({
          opd: r.opds_nama_opd,
          indicator: r.kode_indikator_nama_indikator,
          value: r.variabel,
          unit: r.satuan,
        })));
      }

      totalIndicators = indicatorSet.size;

      return {
        ...kec,
        totalRecords,
        totalIndicators,
        dataDensity: totalRecords / Math.max(kec.opds.length, 1),
        sampleData: sampleData.slice(0, 5),
      };
    });

    const result = {
      kecamatan,
      bounds: {
        center: [4.5833, 96.7500] as [number, number],
        zoom: 11,
      },
      summary: {
        totalKecamatan: kecamatan.length,
        totalRecords: kecamatan.reduce((s, k) => s + k.totalRecords, 0),
        avgDensity: Math.round(kecamatan.reduce((s, k) => s + k.dataDensity, 0) / kecamatan.length),
      },
      lastFetched: new Date().toISOString(),
    };

    geoCache = result;
    geoCacheExpiry = Date.now() + 10 * 60 * 1000;

    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
