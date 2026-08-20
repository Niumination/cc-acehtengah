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
