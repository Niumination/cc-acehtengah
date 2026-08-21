// ─── Kebijakan retensi log kueri AI ───
//
// LATAR BELAKANG (LAPORAN_AUDIT_PRODUCTION_READINESS.md §P2-19)
//
// Tabel `ChatSession` menyimpan PERTANYAAN PENGGUNA apa adanya beserta respons
// AI, tanpa batas waktu. Dua risiko:
//   1. Privasi — pengguna bisa mengetik NIK, nama warga, atau data pribadi lain
//      di kolom pertanyaan. Menyimpannya selamanya tanpa dasar retensi tidak
//      sejalan dengan prinsip minimalisasi data.
//   2. Biaya & kinerja — tabel tumbuh tanpa batas pada basis data gratis.
//
// Modul ini sengaja bebas dari `next/server` agar dapat diuji sebagai unit.

export const DEFAULT_RETENTION_DAYS = 90;
export const MIN_RETENTION_DAYS = 7;
const MIN_SECRET_LENGTH = 16;

/** Perbandingan waktu-konstan untuk mencegah kebocoran lewat timing. */
export function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/**
 * Tentukan jumlah hari retensi dari nilai environment.
 * Nilai tidak valid → default. Nilai terlalu agresif dibatasi MIN_RETENTION_DAYS
 * agar salah ketik (mis. `0`) tidak menghapus hampir seluruh riwayat.
 */
export function resolveRetentionDays(raw: string | undefined | null): number {
  // PENTING: `Number('')` bernilai 0, bukan NaN. Tanpa penjagaan ini,
  // `CHAT_LOG_RETENTION_DAYS=""` (variabel ada tapi kosong — kasus umum di
  // berkas .env) akan diperlakukan sebagai 0 lalu dipangkas ke batas minimum,
  // sehingga retensi diam-diam menjadi 7 hari alih-alih default 90.
  const trimmed = raw?.trim();
  if (!trimmed) return DEFAULT_RETENTION_DAYS;

  const parsed = Number(trimmed);
  if (!Number.isFinite(parsed) || !Number.isInteger(parsed)) return DEFAULT_RETENTION_DAYS;
  return Math.max(MIN_RETENTION_DAYS, parsed);
}

/** Hitung batas waktu: log yang lebih tua dari titik ini boleh dihapus. */
export function retentionCutoff(retentionDays: number, now: Date = new Date()): Date {
  return new Date(now.getTime() - retentionDays * 24 * 60 * 60 * 1000);
}

/**
 * Otorisasi pemanggil job cron lewat `Authorization: Bearer <CRON_SECRET>`.
 * Vercel Cron otomatis mengirim header ini bila CRON_SECRET di-set.
 */
export function isCronAuthorized(
  authorizationHeader: string | null,
  secret: string | undefined,
): boolean {
  if (!secret || secret.length < MIN_SECRET_LENGTH) return false;
  if (!authorizationHeader?.startsWith('Bearer ')) return false;
  return timingSafeEqual(authorizationHeader.slice(7), secret);
}
