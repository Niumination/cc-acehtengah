// ─── Excel Document Query — deterministik, tanpa LLM (PR Lapis 1 paralel) ───
// Pertanyaan tentang Dokumen A/B/C (agregat Excel bebas-PII) dijawab langsung
// dari data ter-commit, tanpa LLM, sehingga bebas halusinasi dan menjaga SoT.
// Output berupa HybridResponse dengan visualisasi tipe 'table' yang akan
// dirender oleh AIDataWidget (format general mengikuti sumber asli).

import { HybridResponse } from '@/types';
import {
  matchExcelDoc,
  docSourceLabel,
  docPrimaryTable,
  type ExcelDoc,
} from '@/data/excelSources';

/** Deteksi apakah query dimaksudkan ke sumber Dokumen A/B/C. */
export function detectExcelDocQuery(query: string): ExcelDoc | null {
  return matchExcelDoc(query);
}

function fmtRp(n: number): string {
  return 'Rp ' + n.toLocaleString('id-ID');
}

function buildSummaryLine(doc: ExcelDoc): string {
  const parts: string[] = [];
  const r = doc.ringkasan ?? {};
  for (const [k, v] of Object.entries(r)) {
    const label = k.replace(/_/g, ' ');
    if (typeof v !== 'number') continue;
    const val = k.includes('rp') ? fmtRp(v) : v.toLocaleString('id-ID');
    parts.push(`${label} ${val}`);
  }
  return parts.join(', ');
}

/**
 * Bangun jawaban deterministik untuk satu dokumen.
 * Tidak pernah memanggil LLM; seluruh angka berasal dari evidence ter-commit.
 */
export function buildExcelDocResponse(query: string, doc: ExcelDoc): HybridResponse {
  const { headers, rows } = docPrimaryTable(doc);
  const summary = buildSummaryLine(doc);
  const catatan = doc.catatan;

  const narasi =
    `Berdasarkan ${docSourceLabel(doc)} (${doc.sumber_file}):\n` +
    (summary ? `${summary}.\n` : '') +
    `Tabel di bawah menampilkan agregat ${doc.dokumen === 'A' ? 'pemberdayaan' : doc.dokumen === 'B' ? 'kesehatan' : 'bantuan sosial'} ` +
    `menurut format sumber. ${catatan}`;

  return {
    narasi,
    visualisasi: {
      tipe: 'table',
      konfigurasi: {
        columns: headers,
        rows,
      },
    },
    rekomendasi: [
      `Verifikasi angka di atas dengan ${doc.opd} selaku produsen data untuk perencanaan lebih lanjut.`,
    ],
    dataSource: docSourceLabel(doc),
    timestamp: new Date().toISOString(),
  };
}

/**
 * Coba jawab dari Dokumen A/B/C. Balik null bila query tidak relevan.
 * Dipanggil SETELAH meta-query & DTSEN deflection, SEBELUM retrieval SAPA,
 * agar sumber dokumen memiliki prioritas deterministik sendiri.
 */
export function tryExcelDocQuery(query: string): HybridResponse | null {
  const doc = detectExcelDocQuery(query);
  if (!doc) return null;
  return buildExcelDocResponse(query, doc);
}

