// ─── Layanan Early Warning System (R2) ───
//
// Aturan evaluasi ada di `src/lib/ews-evaluator.ts` (murni & teruji);
// berkas ini hanya lapisan basis data.

import { prisma } from '@/lib/prisma';
import {
  evaluateThresholds,
  type ExistingAlert,
  type ObservationInput,
  type ThresholdInput,
} from '@/lib/ews-evaluator';

export interface EwsRunResult {
  created: number;
  resolved: number;
  thresholdsEvaluated: number;
}

/**
 * Bandingkan seluruh ambang batas aktif dengan observasi terbaru, lalu
 * simpan alert baru dan selesaikan alert yang sudah tidak relevan.
 */
export async function evaluateAndPersistAlerts(): Promise<EwsRunResult> {
  const thresholdRows = await prisma.indicatorThreshold.findMany({
    where: { isActive: true },
    include: { indicator: { select: { nama: true, satuan: true } } },
  });

  if (thresholdRows.length === 0) {
    return { created: 0, resolved: 0, thresholdsEvaluated: 0 };
  }

  const indicatorIds = [...new Set(thresholdRows.map((t) => t.indicatorId))];

  const observationRows = await prisma.sapaObservation.findMany({
    where: { indicatorId: { in: indicatorIds }, nilaiNumerik: { not: null } },
    select: { indicatorId: true, tahun: true, nilaiNumerik: true },
  });

  const activeAlertRows = await prisma.ewsAlert.findMany({
    where: { resolvedAt: null },
    select: { id: true, thresholdId: true, tahun: true },
  });

  const thresholds: ThresholdInput[] = thresholdRows.map((t) => ({
    id: t.id,
    indicatorId: t.indicatorId,
    indicatorNama: t.indicator.nama,
    satuan: t.indicator.satuan,
    operator: t.operator,
    nilai: t.nilai,
    severity: t.severity,
    pesan: t.pesan,
    isActive: t.isActive,
  }));

  const observations: ObservationInput[] = observationRows.map((o) => ({
    indicatorId: o.indicatorId,
    tahun: o.tahun,
    nilaiNumerik: o.nilaiNumerik,
  }));

  const existing: ExistingAlert[] = activeAlertRows.map((a) => ({
    id: a.id,
    thresholdId: a.thresholdId,
    tahun: a.tahun,
  }));

  const { toCreate, toResolve } = evaluateThresholds(thresholds, observations, existing);

  if (toResolve.length > 0) {
    await prisma.ewsAlert.updateMany({
      where: { id: { in: toResolve } },
      data: { resolvedAt: new Date() },
    });
  }

  let created = 0;
  for (const alert of toCreate) {
    try {
      await prisma.ewsAlert.create({ data: alert });
      created += 1;
    } catch (err) {
      // Indeks unik parsial (thresholdId, tahun) WHERE resolvedAt IS NULL bisa
      // menolak bila dua proses sinkronisasi berjalan bersamaan. Itu justru
      // perilaku yang diinginkan — lewati tanpa menggagalkan seluruh proses.
      console.warn('[ews] Alert dilewati (kemungkinan duplikat serentak):', err);
    }
  }

  return { created, resolved: toResolve.length, thresholdsEvaluated: thresholds.length };
}
