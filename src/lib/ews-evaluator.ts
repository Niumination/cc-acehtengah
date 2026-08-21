// ─── Evaluator Early Warning System (R2) ───
//
// Modul murni: menerima observasi + ambang batas, mengembalikan alert yang
// harus DIBUAT dan yang harus DISELESAIKAN. Tidak menyentuh database sehingga
// seluruh aturan dapat diuji sebagai unit.
//
// LATAR BELAKANG (LAPORAN_AUDIT_PRODUCTION_READINESS.md §P1-10, R2)
// Sebelumnya tidak ada satu pun kode yang membuat EwsAlert — panel EWS selalu
// menampilkan "Semua indikator dalam batas normal" apa pun kondisinya.

export type ThresholdOperator = 'GT' | 'GTE' | 'LT' | 'LTE';
export type Severity = 'INFO' | 'WARNING' | 'CRITICAL';

export interface ThresholdInput {
  id: string;
  indicatorId: number;
  indicatorNama: string;
  satuan: string | null;
  operator: ThresholdOperator;
  nilai: number;
  severity: Severity;
  pesan: string | null;
  isActive: boolean;
}

export interface ObservationInput {
  indicatorId: number;
  tahun: string | null;
  nilaiNumerik: number | null;
}

export interface ExistingAlert {
  id: string;
  thresholdId: string;
  tahun: string | null;
}

export interface AlertToCreate {
  thresholdId: string;
  indicatorId: number;
  nilaiAktual: number;
  batas: number;
  pesan: string;
  severity: Severity;
  tahun: string | null;
}

export interface EvaluationResult {
  /** Alert baru yang harus disimpan. */
  toCreate: AlertToCreate[];
  /** Id alert yang kondisinya sudah tidak terpenuhi lagi → tandai selesai. */
  toResolve: string[];
}

const OPERATOR_LABEL: Record<ThresholdOperator, string> = {
  GT: 'melampaui',
  GTE: 'mencapai atau melampaui',
  LT: 'turun di bawah',
  LTE: 'berada pada atau di bawah',
};

/** Apakah nilai melanggar ambang batas? */
export function isBreached(nilai: number, operator: ThresholdOperator, batas: number): boolean {
  switch (operator) {
    case 'GT':
      return nilai > batas;
    case 'GTE':
      return nilai >= batas;
    case 'LT':
      return nilai < batas;
    case 'LTE':
      return nilai <= batas;
  }
}

/** Format angka gaya Indonesia untuk pesan yang dibaca pimpinan. */
function formatAngka(n: number): string {
  return new Intl.NumberFormat('id-ID', { maximumFractionDigits: 2 }).format(n);
}

/** Susun pesan otomatis bila ambang tidak menyediakan pesan kustom. */
export function buildPesan(threshold: ThresholdInput, nilai: number, tahun: string | null): string {
  if (threshold.pesan?.trim()) return threshold.pesan.trim();

  const satuan = threshold.satuan ? ` ${threshold.satuan}` : '';
  const periode = tahun ? ` (${tahun})` : '';
  return (
    `${threshold.indicatorNama}${periode} ${OPERATOR_LABEL[threshold.operator]} ` +
    `ambang batas: ${formatAngka(nilai)}${satuan} terhadap batas ${formatAngka(threshold.nilai)}${satuan}.`
  );
}

/**
 * Bandingkan observasi dengan seluruh ambang batas aktif.
 *
 * Aturan penting:
 *   • Observasi tanpa nilai numerik DIABAIKAN — tidak dapat dibandingkan.
 *   • Satu alert aktif per (ambang, tahun). Bila alert untuk kombinasi itu
 *     sudah ada, tidak dibuat lagi (mencegah banjir notifikasi tiap sinkronisasi).
 *   • Alert aktif yang kondisinya sudah tidak terpenuhi ditandai selesai —
 *     supaya panel tidak menampilkan peringatan basi.
 *   • Ambang non-aktif tidak menghasilkan alert baru, dan alert lamanya
 *     ikut diselesaikan.
 */
export function evaluateThresholds(
  thresholds: ThresholdInput[],
  observations: ObservationInput[],
  existingAlerts: ExistingAlert[],
): EvaluationResult {
  // Kelompokkan observasi per indikator untuk penelusuran cepat.
  const perIndikator = new Map<number, ObservationInput[]>();
  for (const o of observations) {
    if (o.nilaiNumerik == null || !Number.isFinite(o.nilaiNumerik)) continue;
    const daftar = perIndikator.get(o.indicatorId);
    if (daftar) daftar.push(o);
    else perIndikator.set(o.indicatorId, [o]);
  }

  const kunciAlertAktif = new Map<string, ExistingAlert>();
  for (const a of existingAlerts) {
    kunciAlertAktif.set(`${a.thresholdId}|${a.tahun ?? '\u0000'}`, a);
  }

  const toCreate: AlertToCreate[] = [];
  const masihMelanggar = new Set<string>();

  for (const t of thresholds) {
    if (!t.isActive) continue;

    for (const o of perIndikator.get(t.indicatorId) ?? []) {
      const nilai = o.nilaiNumerik as number;
      if (!isBreached(nilai, t.operator, t.nilai)) continue;

      const kunci = `${t.id}|${o.tahun ?? '\u0000'}`;
      masihMelanggar.add(kunci);

      // Sudah ada alert aktif untuk kombinasi ini → jangan buat lagi.
      if (kunciAlertAktif.has(kunci)) continue;

      toCreate.push({
        thresholdId: t.id,
        indicatorId: t.indicatorId,
        nilaiAktual: nilai,
        batas: t.nilai,
        pesan: buildPesan(t, nilai, o.tahun),
        severity: t.severity,
        tahun: o.tahun,
      });
    }
  }

  const toResolve: string[] = [];
  for (const [kunci, alert] of kunciAlertAktif) {
    if (!masihMelanggar.has(kunci)) toResolve.push(alert.id);
  }

  return { toCreate, toResolve };
}
