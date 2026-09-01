/**
 * AUDIT — menguji mesin statistik Bapokting (hanya ada di hotfix) dengan data sintetis.
 * Menjalankan fungsi PRODUKSI yang sebenarnya. Tidak di-commit; hanya untuk audit.
 */
import { describe, it, expect } from 'vitest';
import { hitungStatsBapokting } from '@/lib/bapokting-stats';
import type { BapoktingPrice } from '@/lib/bapokting-client';

function hari(keBelakang: number): string {
  const d = new Date('2026-08-31T00:00:00Z');
  d.setUTCDate(d.getUTCDate() - keBelakang);
  return d.toISOString();
}

/** Deret harga `n` hari; `gen(i)` = harga pada i hari yang lalu (i=0 terbaru). */
function deret(nama: string, n: number, gen: (i: number) => number): BapoktingPrice[] {
  return Array.from({ length: n }, (_, i) => ({
    namaBarang: nama,
    harga: gen(i),                 // i=0 paling lama → gen(0); i=n-1 terbaru → gen(n-1)
    tanggal: hari(n - 1 - i),      // tanggal[0] paling lama
    satuan: 'Kg',
    kategori: 'Beras',
  })) as BapoktingPrice[];
}

describe('B1 — tren butuh 14 titik; di bawah itu diam-diam "stabil"', () => {
  it('13 titik dengan kenaikan 50% tetap dilaporkan "stabil" & perubahan 0%', () => {
    const data = deret('Beras Uji', 13, (i) => 10000 + i * 400);   // naik terus
    const s = hitungStatsBapokting(data, 7);
    const k = s.komoditas['Beras Uji']!;
    console.log('  [13 titik, naik terus] trend=', k.trend, '· pct=', k.persentasePerubahan);
    expect(k.trend).toBe('stabil');
    expect(k.persentasePerubahan).toBe(0);
  });

  it('14 titik -> tren terhitung', () => {
    const data = deret('Beras Uji', 14, (i) => 10000 + i * 400);
    const s = hitungStatsBapokting(data, 7);
    const k = s.komoditas['Beras Uji']!;
    console.log('  [14 titik, naik terus] trend=', k.trend, '· pct=', k.persentasePerubahan);
    expect(k.trend).toBe('naik');
  });

  it('TIDAK ada tanda bahwa tren tidak dihitung karena data kurang', () => {
    const data = deret('Beras Uji', 13, (i) => 10000 + i * 400);
    const s = hitungStatsBapokting(data, 7);
    expect((s.komoditas['Beras Uji'] as Record<string, unknown>).cukupData).toBeUndefined();
    expect((s as Record<string, unknown>).peringatan).toBeUndefined();
  });
});

describe('B2 — error tipe: arah "stabil" masuk ke daftar bertipe naik|turun', () => {
  it('trendStabil diisi objek ber-arah "stabil" (TS2322 di baris 156)', () => {
    const data = deret('Beras Uji', 14, () => 10000);   // flat
    const s = hitungStatsBapokting(data, 7);
    // runtime tidak error, tapi tipenya salah — inilah yang ditangkap tsc
    expect(Array.isArray(s.trend.stabil)).toBe(true);
    expect(s.trend.stabil.length).toBeGreaterThan(0);
    console.log('  [flat] trend.stabil =', JSON.stringify(s.trend.stabil));
  });
});

describe('B3 — kategori/kecamatan: hargaAvg kategori adalah rata-rata dari rata-rata', () => {
  it('rata-rata dari rata-rata ≠ rata-rata tertimbang bila jumlah titik beda', () => {
    const a = deret('Komoditas A', 14, () => 10000);            // 14 titik @10.000
    const b = deret('Komoditas B', 2, () => 30000);             // 2 titik @30.000
    const s = hitungStatsBapokting([...a, ...b] as BapoktingPrice[], 7);
    const kat = s.kategori['Beras']!;
    console.log('  [kategori] hargaAvg =', kat.hargaAvg, '· komoditasCount =', kat.komoditasCount);
    // (10000 + 30000)/2 = 20000 -> rata-rata dari rata-rata
    expect(kat.hargaAvg).toBe(20000);
    // padahal rata-rata tertimbang seluruh titik = (14*10000 + 2*30000)/16 = 12500
    expect(Math.round((14 * 10000 + 2 * 30000) / 16)).toBe(12500);
  });
});

describe('B4 — data kosong & ekstrem', () => {
  it('data kosong tidak crash', () => {
    const s = hitungStatsBapokting([] as BapoktingPrice[], 7);
    expect(Object.keys(s.komoditas)).toHaveLength(0);
  });

  it('CATATAN: `historis` mengambil 7 titik TERBARU, jadi harga 0 yang lama tidak terlihat', () => {
    const data = deret('Beras Uji', 14, (i) => (i < 7 ? 0 : 20000));  // 0 = 7 hari tertua
    const s = hitungStatsBapokting(data, 7);
    const k = s.komoditas['Beras Uji']!;
    console.log('  [harga 0 di 7 hari tertua] avg=', k.hargaAvg, 'min=', k.hargaMin, 'max=', k.hargaMax);
    expect(k.hargaMin).toBe(20000);   // 0 tidak pernah masuk jendela 7 hari
  });

  it('satu titik -> stdDev 0 (tidak membagi nol)', () => {
    const s = hitungStatsBapokting(deret('Beras Uji', 1, () => 15000), 7);
    expect(s.komoditas['Beras Uji']!.hargaStdDev).toBe(0);
  });
});

describe('B5 — volatilitas: apa yang sebenarnya dihitung?', () => {
  it('overallIndex ada dan berupa angka', () => {
    const data = deret('Beras Uji', 14, (i) => 10000 + (i % 3) * 500);
    const s = hitungStatsBapokting(data, 7);
    console.log('  volatility =', JSON.stringify(s.volatility).slice(0, 220));
    expect(typeof s.volatility.overallIndex).toBe('number');
  });
});

describe('B5b — overallIndex membagi nol saat tidak ada komoditas', () => {
  it('data kosong -> overallIndex NaN', () => {
    const s = hitungStatsBapokting([] as BapoktingPrice[], 7);
    console.log('  [kosong] overallIndex =', s.volatility.overallIndex);
    expect(Number.isNaN(s.volatility.overallIndex)).toBe(true);   // 0/0
  });
});

describe('B7 — satu komoditas disebut "paling fluktuatif" DAN "paling stabil"', () => {
  it('rekomendasi saling bertentangan untuk komoditas yang sama', () => {
    const s = hitungStatsBapokting(deret('Beras Uji', 14, (i) => 10000 + (i % 3) * 500), 7);
    const teks = s.rekomendasi.join(' | ');
    console.log('  ', teks);
    expect(teks).toContain('paling fluktuatif: Beras Uji');
    expect(teks).toContain('paling stabil: Beras Uji');
  });
});

describe('B6 — rekomendasi: berbasis angka atau template?', () => {
  it('isi rekomendasi', () => {
    const data = deret('Beras Uji', 14, (i) => 10000 + i * 600);   // naik tajam
    const s = hitungStatsBapokting(data, 7);
    console.log('  rekomendasi =', JSON.stringify(s.rekomendasi, null, 1));
    expect(Array.isArray(s.rekomendasi)).toBe(true);
  });
});
