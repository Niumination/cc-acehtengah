#!/usr/bin/env node
//
// Menghasilkan seluruh secret yang dibutuhkan aplikasi, siap disalin ke
// Vercel → Settings → Environment Variables.
//
// Pemakaian:
//   node scripts/generate-secrets.mjs           # tampilkan di layar
//   node scripts/generate-secrets.mjs --env     # format berkas .env
//
// CATATAN: nilai dicetak ke STDOUT. Jangan salurkan ke berkas di dalam
// repositori dan jangan tempel ke tiket/chat publik.

import { randomBytes } from 'node:crypto';

const asEnvFile = process.argv.includes('--env');

/** Base64url tanpa padding — aman dipakai di header dan URL. */
function secret(bytes) {
  return randomBytes(bytes).toString('base64url');
}

const values = {
  // Menandatangani cookie sesi admin. Minimal 32 karakter (lihat src/lib/auth.ts).
  JWT_SECRET: secret(48),
  // Mengotorisasi endpoint bootstrap /api/setup*. Minimal 32 karakter.
  SETUP_TOKEN: secret(32),
  // Mengotorisasi job cron retensi log. Minimal 16 karakter.
  CRON_SECRET: secret(32),
  // Password admin pertama. WAJIB diganti lewat /dashboard/akun setelah login.
  ADMIN_BOOTSTRAP_PASSWORD: secret(18),
};

if (asEnvFile) {
  for (const [key, value] of Object.entries(values)) {
    console.log(`${key}=${value}`);
  }
} else {
  console.log('\n  Secret baru — salin ke Vercel Environment Variables\n');
  for (const [key, value] of Object.entries(values)) {
    console.log(`  ${key.padEnd(26)} ${value}`);
  }
  console.log(`
  Panjang terverifikasi:
    JWT_SECRET               ${values.JWT_SECRET.length} karakter (min. 32)
    SETUP_TOKEN              ${values.SETUP_TOKEN.length} karakter (min. 32)
    CRON_SECRET              ${values.CRON_SECRET.length} karakter (min. 16)
    ADMIN_BOOTSTRAP_PASSWORD ${values.ADMIN_BOOTSTRAP_PASSWORD.length} karakter (min. 12)

  Langkah selanjutnya: docs/ops/rotasi-secret.md
`);
}
