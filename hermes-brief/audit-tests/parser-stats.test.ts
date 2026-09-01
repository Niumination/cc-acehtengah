/**
 * AUDIT — pembuktian empiris bug parser angka + mesin statistik Bapokting.
 * Tidak di-commit ke repo; hanya untuk audit.
 */
import { describe, it, expect } from 'vitest';

// Salinan VERBATIM dari src/lib/sapa-client.ts:433 (identik di main/hotfix/v3)
const parseRusak = (raw: unknown): number =>
  Number(String(raw).replace(/[^\d.-]/g, ''));

// Salinan VERBATIM dari src/services/opd-drilldown.ts:35-41 (hanya ada di v3)
function parseNumericId(value: string): number | null {
  const cleaned = value.replace(/\s/g, '').replace(/\./g, '').replace(/,/g, '.');
  if (!/^\d+(\.\d+)?$/.test(cleaned)) return null;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

const KASUS: [string, number | null, string][] = [
  ['31,4', 31.4, 'persen desimal Indonesia'],
  ['2.156,28', 2156.28, 'ribuan + desimal'],
  ['11.503.360.000.000', 11503360000000, 'PDRB — 14 digit'],
  ['Rp 1.250.000', 1250000, 'rupiah berformat'],
  ['16.000', 16000, 'harga Bapokting berformat'],
  ['16000', 16000, 'integer polos'],
  ['4,9', 4.9, 'prevalensi'],
  ['0', 0, 'nol'],
  ['1.234,567', 1234.567, 'ribuan + 3 desimal'],
];

describe('P1 — parser RUSAK di sapa-client.ts:433 (dipakai agregasi utama)', () => {
  it.each(KASUS)('"%s" harusnya %s (%s)', (raw, benar) => {
    const hasil = parseRusak(raw);
    if (hasil !== benar) {
      console.log(`  [RUSAK] "${raw}" → ${hasil}   (seharusnya ${benar})`);
    }
  });

  it('bukti keras: 7 dari 9 kasus salah (2 kebetulan benar)', () => {
    const salah = KASUS.filter(([raw, benar]) => parseRusak(raw) !== benar);
    KASUS.forEach(([raw, benar]) =>
      console.log(`  "${raw}" → ${parseRusak(raw)}  | benar: ${benar}  | ${parseRusak(raw) === benar ? 'OK' : 'SALAH'}`));
    expect(salah.length).toBe(7);
    // Yang kebetulan benar hanya integer polos ("16000") dan nol ("0").
    expect(parseRusak('16000')).toBe(16000);
    expect(parseRusak('0')).toBe(0);
  });
});

describe('P2 — parser BENAR di opd-drilldown.ts (hanya ada di v3)', () => {
  it.each(KASUS.filter(([raw]) => !raw.startsWith('Rp')))('"%s" -> %s', (raw, benar) => {
    expect(parseNumericId(raw)).toBe(benar);
  });

  it('menolak teks non-numerik dengan null (tidak mengarang)', () => {
    expect(parseNumericId('N/A')).toBeNull();
    expect(parseNumericId('')).toBeNull();
    expect(parseNumericId('-')).toBeNull();
    expect(parseNumericId('belum ada data')).toBeNull();
  });

  it('CATATAN: menolak "Rp 1.250.000" (regex tidak mengizinkan huruf) — gagal AMAN, bukan mengarang', () => {
    expect(parseNumericId('Rp 1.250.000')).toBeNull();
    // bandingkan: parser rusak MENGARANG NaN
    expect(Number.isNaN(parseRusak('Rp 1.250.000'))).toBe(true);
  });
});

// ─── Salinan VERBATIM helper dari src/lib/bapokting-stats.ts (hanya di hotfix) ───
function hitungStdDev(values: number[], rataRata: number): number {
  if (values.length < 2) return 0;
  const sumSquares = values.reduce((sum, v) => sum + Math.pow(v - rataRata, 2), 0);
  return Math.sqrt(sumSquares / (values.length - 1));
}
function hitungPersentase(lama: number, baru: number): number {
  if (lama === 0) return 0;
  return ((baru - lama) / lama) * 100;
}

describe('P3 — mesin statistik Bapokting: benar secara matematis?', () => {
  it('hitungStdDev = simpangan baku SAMPEL (pembagi n−1), cocok dengan rumus', () => {
    const v = [10, 12, 14, 16, 18];
    const mean = v.reduce((a, b) => a + b, 0) / v.length;
    expect(hitungStdDev(v, mean)).toBeCloseTo(3.16227766, 6);   // sqrt(40/4)
    // bandingkan dengan populasi (pembagi n) yang SALAH untuk sampel:
    expect(Math.sqrt(40 / 5)).toBeCloseTo(2.82842712, 6);
  });

  it('hitungStdDev n=1 -> 0 (tidak membagi nol)', () => {
    expect(hitungStdDev([5], 5)).toBe(0);
  });

  it('hitungPersentase arah & besarnya benar', () => {
    expect(hitungPersentase(100, 110)).toBeCloseTo(10);
    expect(hitungPersentase(100, 90)).toBeCloseTo(-10);
    expect(hitungPersentase(0, 50)).toBe(0);          // aman dari Infinity
  });

  it('CATATAN: hitungPersentase(0,0)=0 dan (0,-5)=0 menyembunyikan perubahan', () => {
    expect(hitungPersentase(0, 0)).toBe(0);
    expect(hitungPersentase(0, -5)).toBe(0);   // dari 0 ke −5 dilaporkan "0%"
  });
});

describe('P4 — ambang tren ±2% pada harga pangan: terlalu longgar?', () => {
  it('kenaikan 2,1% sudah dilabeli "naik"', () => {
    const pct = hitungPersentase(15000, 15315);   // +2,1%
    expect(pct).toBeGreaterThan(2);
    expect(pct > 2 ? 'naik' : pct < -2 ? 'turun' : 'stabil').toBe('naik');
  });
  it('kenaikan Rp 300 pada harga Rp 15.000 = 2% -> "stabil" (batas tepat)', () => {
    expect(hitungPersentase(15000, 15300)).toBe(2);
    expect(2 > 2).toBe(false);   // jadi "stabil"
  });
  it('volatilitas harian beras bisa >2% dalam seminggu → label tren tidak stabil antar-hari', () => {
    // contoh: 14.800 → 15.200 = +2,7%
    expect(hitungPersentase(14800, 15200)).toBeGreaterThan(2);
  });
});
