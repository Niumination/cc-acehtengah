// Tes regresi kebijakan header keamanan.
//
// Tes ini mengunci sebuah kesalahan nyata yang sempat terjadi: kebijakan
// `script-src 'self'` (tanpa 'unsafe-inline' dan tanpa nonce) MEMBLOKIR inline
// script hidrasi Next.js, sehingga aplikasi tidak terhidrasi di produksi.
// Sekaligus mencegah pelonggaran yang berbahaya (mis. mengizinkan origin
// script eksternal atau membuka frame-ancestors).

import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  buildContentSecurityPolicy,
  buildSecurityHeaders,
  parseCsp,
} from '../src/lib/security-headers.ts';

const prod = parseCsp(buildContentSecurityPolicy(false));
const dev = parseCsp(buildContentSecurityPolicy(true));

test('script-src mengizinkan inline script hidrasi Next.js', () => {
  // Tanpa ini aplikasi tidak terhidrasi sama sekali di produksi.
  assert.ok(prod['script-src'].includes("'unsafe-inline'"));
  assert.ok(prod['script-src'].includes("'self'"));
});

test("script-src tidak memakai 'strict-dynamic' tanpa nonce", () => {
  // 'strict-dynamic' membuat browser mengabaikan 'self' dan 'unsafe-inline'.
  // Halaman proyek ini dipra-render statis sehingga tidak punya nonce.
  assert.ok(!prod['script-src'].includes("'strict-dynamic'"));
});

test('tidak ada origin script eksternal yang diizinkan', () => {
  const eksternal = prod['script-src'].filter((s) => /^https?:|^\/\//.test(s));
  assert.deepEqual(eksternal, [], `origin eksternal terdeteksi: ${eksternal.join(', ')}`);
});

test("'unsafe-eval' hanya aktif di mode pengembangan", () => {
  assert.ok(!prod['script-src'].includes("'unsafe-eval'"), 'produksi tidak boleh unsafe-eval');
  assert.ok(dev['script-src'].includes("'unsafe-eval'"), 'dev butuh unsafe-eval untuk HMR');
});

test('style-src mengizinkan inline (Leaflet & Recharts)', () => {
  assert.ok(prod['style-src'].includes("'unsafe-inline'"));
});

test('img-src mengizinkan tile OpenStreetMap dan data: URI', () => {
  assert.ok(prod['img-src'].some((s) => s.includes('tile.openstreetmap.org')));
  assert.ok(prod['img-src'].includes('data:'), 'ikon marker Leaflet memakai data: URI');
});

test('connect-src mengizinkan same-origin untuk fetch /api/*', () => {
  assert.ok(prod['connect-src'].includes("'self'"));
});

test('direktif pengerasan wajib aktif', () => {
  assert.deepEqual(prod['frame-ancestors'], ["'none'"]);
  assert.deepEqual(prod['object-src'], ["'none'"]);
  assert.deepEqual(prod['base-uri'], ["'self'"]);
  assert.deepEqual(prod['form-action'], ["'self'"]);
  assert.deepEqual(prod['default-src'], ["'self'"]);
});

test('daftar header keamanan lengkap', () => {
  const keys = buildSecurityHeaders(false).map((h) => h.key);
  for (const wajib of [
    'Content-Security-Policy',
    'Strict-Transport-Security',
    'X-Content-Type-Options',
    'X-Frame-Options',
    'Referrer-Policy',
    'Permissions-Policy',
    'Cross-Origin-Opener-Policy',
  ]) {
    assert.ok(keys.includes(wajib), `header hilang: ${wajib}`);
  }
});

test('HSTS memakai max-age minimal satu tahun', () => {
  const hsts = buildSecurityHeaders(false).find((h) => h.key === 'Strict-Transport-Security');
  const maxAge = Number(/max-age=(\d+)/.exec(hsts!.value)?.[1] ?? 0);
  assert.ok(maxAge >= 31_536_000, `max-age terlalu pendek: ${maxAge}`);
});
