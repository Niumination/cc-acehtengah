// ─── Semantic Layer — Compute (WP3.0c) ───────────────────────────────────────
// Satu implementasi statistik deskriptif untuk SEMUA konsumen (aturan A7 —
// jangan biarkan dua implementasi simpangan baku hidup berdampingan).
// Dipanggil dari bapokting-stats, dan akan dipakai analyzer WP2.x.

export interface DescriptiveStats {
  count: number;
  mean: number;
  stdDev: number; // simpangan baku SAMPEL (pembagi n−1)
  min: number;
  max: number;
}

/** Statistik deskriptif satu deret angka. count < 2 → stdDev 0 (tak terdefinisi). */
export function describe(values: number[]): DescriptiveStats {
  const count = values.length;
  if (count === 0) return { count, mean: 0, stdDev: 0, min: 0, max: 0 };
  const sum = values.reduce((a, b) => a + b, 0);
  const mean = sum / count;
  if (count < 2) return { count, mean, stdDev: 0, min: values[0], max: values[0] };
  const sumSquares = values.reduce((acc, v) => acc + Math.pow(v - mean, 2), 0);
  return {
    count,
    mean,
    stdDev: Math.sqrt(sumSquares / (count - 1)),
    min: Math.min(...values),
    max: Math.max(...values),
  };
}

/** Pertumbuhan persen: ((baru − lama) / lama) × 100. lama === 0 → 0 (hindari 0/0). */
export function growth(lama: number, baru: number): number {
  if (lama === 0) return 0;
  return ((baru - lama) / lama) * 100;
}

/** Ambang tren sederhana: |growth| > ambangNaikTurun (default 2%) → naik/turun. */
export function classifyTrend(growthPct: number, threshold = 2): 'naik' | 'turun' | 'stabil' {
  if (growthPct > threshold) return 'naik';
  if (growthPct < -threshold) return 'turun';
  return 'stabil';
}