import { describe, it, expect } from 'vitest';
import { describe as statDescribe, growth, classifyTrend } from '@/lib/statistics/compute';

// ─── compute.ts (WP3.0c) — statistik deskriptif tunggal ───

describe('statistics/compute — describe()', () => {
  it('count 0 → mean/stdDev 0', () => {
    const s = statDescribe([]);
    expect(s.count).toBe(0);
    expect(s.mean).toBe(0);
    expect(s.stdDev).toBe(0);
  });

  it('satu elemen → stdDev 0, mean = nilai', () => {
    const s = statDescribe([42]);
    expect(s.count).toBe(1);
    expect(s.mean).toBe(42);
    expect(s.stdDev).toBe(0);
  });

  it('simpangan baku sampel (pembagi n−1)', () => {
    // data [2,4,4,4,5,5,7,9]: mean 5, varians sampel 4.571.., stdDev ≈ 2.138
    const s = statDescribe([2, 4, 4, 4, 5, 5, 7, 9]);
    expect(s.mean).toBe(5);
    expect(s.stdDev).toBeCloseTo(2.138, 2);
    expect(s.min).toBe(2);
    expect(s.max).toBe(9);
  });

  it('harga identik → stdDev 0', () => {
    const s = statDescribe([100, 100, 100]);
    expect(s.stdDev).toBe(0);
  });
});

describe('statistics/compute — growth()', () => {
  it('persen perubahan normal', () => {
    expect(growth(100, 110)).toBeCloseTo(10, 6);
    expect(growth(110, 100)).toBeCloseTo(-9.0909, 3);
  });

  it('lama === 0 → 0 (hindari 0/0)', () => {
    expect(growth(0, 10)).toBe(0);
  });
});

describe('statistics/compute — classifyTrend()', () => {
  it('ambang default ±2%', () => {
    expect(classifyTrend(3)).toBe('naik');
    expect(classifyTrend(-3)).toBe('turun');
    expect(classifyTrend(1)).toBe('stabil');
    expect(classifyTrend(0)).toBe('stabil');
  });
});