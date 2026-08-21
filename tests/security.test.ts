// Tes regresi keamanan untuk perbaikan Sprint 0.

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { checkRateLimit, resetRateLimit } from '../src/lib/rate-limit.ts';
import { evaluateSetupAccess } from '../src/lib/setup-guard.ts';

// ─── Open redirect (§P1-02) ───
// Salinan logika src/app/login/page.tsx agar bisa diuji tanpa DOM.
function safeRedirectTarget(raw: string | null): string {
  const fallback = '/dashboard/laporan';
  if (!raw) return fallback;
  if (!/^\/(?![/\\])/.test(raw)) return fallback;
  return raw;
}

test('open redirect: URL eksternal ditolak', () => {
  const jahat = [
    'https://evil.example',
    'http://evil.example',
    '//evil.example',
    '/\\evil.example',
    'javascript:alert(1)',
    '',
    null,
  ];
  for (const v of jahat) {
    assert.equal(safeRedirectTarget(v), '/dashboard/laporan', `harus ditolak: ${v}`);
  }
});

test('open redirect: path internal diterima apa adanya', () => {
  assert.equal(safeRedirectTarget('/dashboard/akun'), '/dashboard/akun');
  assert.equal(safeRedirectTarget('/dashboard/laporan?x=1'), '/dashboard/laporan?x=1');
});

// ─── Rate limit (§P0-05) ───

test('rate limit menolak setelah kuota habis', () => {
  const key = `uji-${Math.random()}`;
  for (let i = 0; i < 3; i++) {
    assert.equal(checkRateLimit({ key, limit: 3, windowMs: 60_000 }).ok, true);
  }
  const ditolak = checkRateLimit({ key, limit: 3, windowMs: 60_000 });
  assert.equal(ditolak.ok, false);
  assert.equal(ditolak.remaining, 0);
  assert.ok(ditolak.retryAfterSeconds > 0);
});

test('rate limit ter-reset setelah window lewat', () => {
  const key = `uji-window-${Math.random()}`;
  assert.equal(checkRateLimit({ key, limit: 1, windowMs: 1 }).ok, true);
  const nanti = Date.now() + 5;
  while (Date.now() < nanti) { /* tunggu window lewat */ }
  assert.equal(checkRateLimit({ key, limit: 1, windowMs: 1 }).ok, true);
});

test('resetRateLimit membersihkan hitungan (dipakai setelah login sukses)', () => {
  const key = `uji-reset-${Math.random()}`;
  checkRateLimit({ key, limit: 1, windowMs: 60_000 });
  assert.equal(checkRateLimit({ key, limit: 1, windowMs: 60_000 }).ok, false);
  resetRateLimit(key);
  assert.equal(checkRateLimit({ key, limit: 1, windowMs: 60_000 }).ok, true);
});

// ─── Setup guard (§P0-02) ───

function reqWithToken(token: string | null): { headers: { get(n: string): string | null } } {
  return { headers: { get: (n: string) => (n === 'x-setup-token' ? token : null) } };
}

test('setup guard: ditolak saat SETUP_ENABLED tidak aktif', () => {
  delete process.env.SETUP_ENABLED;
  process.env.SETUP_TOKEN = 'a'.repeat(32);
  const d = evaluateSetupAccess(reqWithToken('a'.repeat(32)));
  assert.equal(d.allowed, false);
  assert.equal(d.reason, 'disabled');
});

test('setup guard: ditolak saat SETUP_TOKEN terlalu pendek', () => {
  process.env.SETUP_ENABLED = 'true';
  process.env.SETUP_TOKEN = 'pendek';
  const d = evaluateSetupAccess(reqWithToken('pendek'));
  assert.equal(d.allowed, false);
  assert.equal(d.reason, 'misconfigured');
});

test('setup guard: ditolak saat token salah', () => {
  process.env.SETUP_ENABLED = 'true';
  process.env.SETUP_TOKEN = 'a'.repeat(32);
  assert.equal(evaluateSetupAccess(reqWithToken('b'.repeat(32))).reason, 'bad-token');
  assert.equal(evaluateSetupAccess(reqWithToken(null)).reason, 'bad-token');
  assert.equal(evaluateSetupAccess(reqWithToken('a'.repeat(31))).reason, 'bad-token');
});

test('setup guard: diizinkan hanya saat semua syarat terpenuhi', () => {
  process.env.SETUP_ENABLED = 'true';
  process.env.SETUP_TOKEN = 'a'.repeat(32);
  assert.equal(evaluateSetupAccess(reqWithToken('a'.repeat(32))).allowed, true);
});

// ─── Retensi log AI (§P2-19) ───

test('retensi: nilai tidak valid jatuh ke default 90 hari', async () => {
  const { resolveRetentionDays } = await import('../src/lib/retention.ts');
  // '' dan '   ' penting: Number('') === 0, bukan NaN. Tanpa penjagaan khusus,
  // variabel env yang ada tapi kosong akan memangkas retensi ke 7 hari.
  for (const v of [undefined, null, '', '   ', 'abc', '12.5', 'NaN']) {
    assert.equal(resolveRetentionDays(v), 90, `input: ${JSON.stringify(v)}`);
  }
});

test('retensi: dibatasi minimal 7 hari agar salah ketik tidak menghapus semua', async () => {
  const { resolveRetentionDays } = await import('../src/lib/retention.ts');
  assert.equal(resolveRetentionDays('0'), 7);
  assert.equal(resolveRetentionDays('1'), 7);
  assert.equal(resolveRetentionDays('-30'), 7);
});

test('retensi: nilai wajar dipakai apa adanya', async () => {
  const { resolveRetentionDays } = await import('../src/lib/retention.ts');
  assert.equal(resolveRetentionDays('30'), 30);
  assert.equal(resolveRetentionDays('365'), 365);
});

test('cron: otorisasi menolak tanpa/dengan secret salah', async () => {
  const { isCronAuthorized } = await import('../src/lib/retention.ts');
  const secret = 'x'.repeat(32);
  assert.equal(isCronAuthorized(`Bearer ${secret}`, secret), true);
  assert.equal(isCronAuthorized(`Bearer ${'y'.repeat(32)}`, secret), false);
  assert.equal(isCronAuthorized(null, secret), false);
  assert.equal(isCronAuthorized(secret, secret), false, 'tanpa prefiks Bearer harus ditolak');
  assert.equal(isCronAuthorized(`Bearer ${secret}`, undefined), false, 'CRON_SECRET kosong');
  assert.equal(isCronAuthorized('Bearer pendek', 'pendek'), false, 'secret < 16 karakter ditolak');
});

test('cron: cutoff dihitung mundur sesuai jumlah hari', async () => {
  const { retentionCutoff } = await import('../src/lib/retention.ts');
  const now = new Date('2026-08-21T00:00:00.000Z');
  assert.equal(retentionCutoff(90, now).toISOString(), '2026-05-23T00:00:00.000Z');
  assert.equal(retentionCutoff(7, now).toISOString(), '2026-08-14T00:00:00.000Z');
});
