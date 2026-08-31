// ─── Parser angka Indonesia — single source of truth ───
// Menangani format: "31,4" → 31.4, "16.000" → 16000, "11.503.360.000.000" → 11503360000000, "Rp 1.250.000" → 1250000
// Gagal aman: return null (bukan NaN / angka karangan)

export function parseNumericId(value: string): number | null {
  // buang awalan satuan/mata uang
  let s = value.trim().replace(/^[^\d-]+/, '');
  s = s.replace(/\s/g, '').replace(/\./g, '').replace(/,/g, '.');
  if (!/^-?\d+(\.\d+)?$/.test(s)) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

export function parseNumericIdOrFallback(value: unknown, fallback = 0): number {
  if (value == null) return fallback;
  const r = parseNumericId(String(value));
  return r ?? fallback;
}
