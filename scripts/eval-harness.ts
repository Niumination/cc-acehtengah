#!/usr/bin/env tsx
// ─── Harness Evaluasi WP6 ────────────────────────────────────────────────────
// Runner deterministik: memuat data/golden-queries.json, menjalankan
// fusi+narasi untuk tiap query (mock metric), dan menilai apakah caveat /
// discrepancy sesuai ekspektasi. Keluar 0 bila semua lulus, 1 bila ada gagal.
// Dipakai di CI: `npm run eval` (vitest) + `npx tsx scripts/eval-harness.ts` (standalone).

import { readFileSync } from 'node:fs';
import { fuseMetrics } from '../src/lib/statistics/fusion';
import { buildNarrative } from '../src/lib/statistics/narrative';
import type { Metric } from '../src/lib/statistics/types';

interface GoldenQuery {
  id: string;
  question: string;
  expectedConceptId: string | null;
  mustMentionSources?: string[];
  expectDiscrepancy?: boolean;
  expectEmpty?: boolean;
}

function mkMetric(value: number, sourceLabel: string, sourceId: string, conceptId: string): Metric {
  return {
    id: `${sourceId}-${conceptId}`,
    conceptId,
    label: conceptId,
    measure: 'count',
    value, valueRaw: String(value), unitCanonical: 'jiwa', unitRaw: 'jiwa',
    period: { kind: 'year', year: 2024, label: '2024' },
    geo: { level: 'kabupaten', kabupaten: 'Aceh Tengah' },
    opd: 'Test', source: { id: sourceId as any, label: sourceLabel },
  } as Metric;
}

// Mock resolver: untuk harness, kita sediakan metrics tiruan per conceptId
function mockMetricsFor(conceptId: string | null): Metric[] {
  if (!conceptId) return [];
  if (conceptId === 'penduduk.total.count') {
    return [
      mkMetric(222643, 'SAPA BPS 2023', 'sapa', conceptId),
      mkMetric(234740, 'DTSEN-BAPPEDA Des 2025', 'dtsen-bappeda', conceptId),
    ];
  }
  // lain: satu sumber saja
  return [mkMetric(1234, 'SAPA', 'sapa', conceptId)];
}

const raw = JSON.parse(readFileSync('data/golden-queries.json', 'utf8'));
const queries: GoldenQuery[] = raw.queries;
let passed = 0, failed = 0;

for (const q of queries) {
  const metrics = mockMetricsFor(q.expectedConceptId);
  const fused = fuseMetrics(metrics);
  const out = buildNarrative({ fused, question: q.question });

  let ok = true;
  const reasons: string[] = [];

  if (q.expectEmpty) {
    if (!out.ringkasan.includes('Tidak ada data')) { ok = false; reasons.push('expected empty narrative'); }
  } else if (q.expectedConceptId) {
    if (!fused.has(q.expectedConceptId)) { ok = false; reasons.push(`missing concept ${q.expectedConceptId}`); }
    if (q.expectDiscrepancy && !out.hasDiscrepancy) { ok = false; reasons.push('expected discrepancy but none'); }
    if (q.expectDiscrepancy === false && out.hasDiscrepancy) { ok = false; reasons.push('unexpected discrepancy'); }
  }

  if (ok) { passed++; console.log(`✅ ${q.id}: ${q.question.slice(0, 50)}`); }
  else { failed++; console.log(`❌ ${q.id}: ${reasons.join(', ')}`); }
}

console.log(`\nHarness WP6: ${passed}/${queries.length} lulus, ${failed} gagal`);
process.exit(failed > 0 ? 1 : 0);
