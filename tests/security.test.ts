// Tes regresi keamanan untuk perbaikan Sprint 0.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

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

// ─── Rate limit (§P0-05, §P1-08) ───
// Tanpa Upstash dikonfigurasi, penyimpanan otomatis jatuh ke memori proses —
// itulah jalur yang diuji di sini.

test('rate limit menolak setelah kuota habis', async () => {
  const key = `uji-${Math.random()}`;
  for (let i = 0; i < 3; i++) {
    assert.equal((await checkRateLimit({ key, limit: 3, windowMs: 60_000 })).ok, true);
  }
  const ditolak = await checkRateLimit({ key, limit: 3, windowMs: 60_000 });
  assert.equal(ditolak.ok, false);
  assert.equal(ditolak.remaining, 0);
  assert.ok(ditolak.retryAfterSeconds > 0);
  assert.equal(ditolak.backend, 'memory', 'tanpa Upstash harus memakai cadangan memori');
});

test('rate limit ter-reset setelah window lewat', async () => {
  const key = `uji-window-${Math.random()}`;
  assert.equal((await checkRateLimit({ key, limit: 1, windowMs: 1 })).ok, true);
  await new Promise((r) => setTimeout(r, 8));
  assert.equal((await checkRateLimit({ key, limit: 1, windowMs: 1 })).ok, true);
});

test('resetRateLimit membersihkan hitungan (dipakai setelah login sukses)', async () => {
  const key = `uji-reset-${Math.random()}`;
  await checkRateLimit({ key, limit: 1, windowMs: 60_000 });
  assert.equal((await checkRateLimit({ key, limit: 1, windowMs: 60_000 })).ok, false);
  await resetRateLimit(key);
  assert.equal((await checkRateLimit({ key, limit: 1, windowMs: 60_000 })).ok, true);
});

test('rate limit: kunci berbeda tidak saling mengganggu', async () => {
  const a = `uji-a-${Math.random()}`;
  const b = `uji-b-${Math.random()}`;
  await checkRateLimit({ key: a, limit: 1, windowMs: 60_000 });
  assert.equal((await checkRateLimit({ key: a, limit: 1, windowMs: 60_000 })).ok, false);
  assert.equal((await checkRateLimit({ key: b, limit: 1, windowMs: 60_000 })).ok, true);
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

// ─── Penyimpanan bersama (§P1-08) ───

test('store: cache menyimpan dan mengambil nilai', async () => {
  const { cacheGet, cacheSet } = await import('../src/lib/store.ts');
  const key = `cache-${Math.random()}`;
  assert.equal(await cacheGet(key), null, 'awalnya kosong');
  await cacheSet(key, { a: 1, b: ['x'] }, 60_000);
  assert.deepEqual(await cacheGet(key), { a: 1, b: ['x'] });
});

test('store: nilai kedaluwarsa dianggap tidak ada', async () => {
  const { cacheGet, cacheSet } = await import('../src/lib/store.ts');
  const key = `cache-ttl-${Math.random()}`;
  await cacheSet(key, 'nilai', 1);
  await new Promise((r) => setTimeout(r, 8));
  assert.equal(await cacheGet(key), null);
});

test('store: cached() hanya menghitung sekali selama masih hangat', async () => {
  const { cached } = await import('../src/lib/store.ts');
  const key = `cached-${Math.random()}`;
  let panggilan = 0;
  const produce = async () => {
    panggilan += 1;
    return { n: panggilan };
  };
  assert.deepEqual(await cached(key, 60_000, produce), { n: 1 });
  assert.deepEqual(await cached(key, 60_000, produce), { n: 1 });
  assert.equal(panggilan, 1, 'produce hanya boleh dipanggil sekali');
});

test('store: nilai yang tidak dapat diserialisasi tidak melempar error', async () => {
  const { cacheSet, cacheGet } = await import('../src/lib/store.ts');
  const key = `cache-siklus-${Math.random()}`;
  const siklus: Record<string, unknown> = {};
  siklus.diri = siklus;
  await cacheSet(key, siklus, 60_000); // tidak boleh melempar
  assert.equal(await cacheGet(key), null);
});

test('store: tanpa Upstash, backend aktif adalah memori', async () => {
  const { activeBackend } = await import('../src/lib/store.ts');
  assert.equal(activeBackend(), 'memory');
});

// ─── Kontras tema gelap (§7.2 #8) ───
// Tema gelap tidak boleh mengorbankan keterbacaan. Nilai diambil langsung dari
// globals.css agar tes ikut gagal bila palet diubah sembarangan.

function luminansi(hex: string): number {
  const h = hex.replace('#', '');
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) / 255);
  const f = (c: number) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}

function rasio(a: string, b: string): number {
  const [x, y] = [luminansi(a), luminansi(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
}

function bacaToken(blok: 'root' | 'dark'): Record<string, string> {
  const css = readFileSync('src/app/globals.css', 'utf8');
  const penanda = blok === 'root' ? ':root {' : "[data-theme='dark'] {";
  const mulai = css.indexOf(penanda);
  assert.ok(mulai !== -1, `blok ${blok} tidak ditemukan`);
  const isi = css.slice(mulai, css.indexOf('\n}', mulai));
  const hasil: Record<string, string> = {};
  for (const m of isi.matchAll(/(--[\w-]+):\s*(#[0-9A-Fa-f]{6})/g)) hasil[m[1]] = m[2];
  return hasil;
}

test('tema gelap: teks memenuhi kontras AA di atas seluruh permukaan', () => {
  const t = bacaToken('dark');
  for (const teks of ['--text', '--text-body', '--text-muted']) {
    for (const latar of ['--surface', '--surface-card', '--surface-muted']) {
      const r = rasio(t[teks], t[latar]);
      assert.ok(r >= 4.5, `${teks} pada ${latar} hanya ${r.toFixed(2)}:1 (butuh 4,5)`);
    }
  }
});

test('tema gelap: pembatas kontrol memenuhi SC 1.4.11 (3:1) di semua permukaan', () => {
  const t = bacaToken('dark');
  for (const latar of ['--surface', '--surface-card', '--surface-muted']) {
    const r = rasio(t['--border-strong'], t[latar]);
    assert.ok(r >= 3, `--border-strong pada ${latar} hanya ${r.toFixed(2)}:1 (butuh 3)`);
  }
});

test('tema terang: pembatas kontrol memenuhi SC 1.4.11 di semua permukaan', () => {
  const t = bacaToken('root');
  for (const latar of ['--surface', '--surface-card', '--surface-muted']) {
    const r = rasio(t['--border-strong'], t[latar]);
    assert.ok(r >= 3, `--border-strong pada ${latar} hanya ${r.toFixed(2)}:1`);
  }
});

test('tema terang: token tetap memenuhi AA (regresi §7.1)', () => {
  const t = bacaToken('root');
  for (const teks of ['--text', '--text-body', '--text-muted']) {
    for (const latar of ['--surface', '--surface-card', '--surface-muted']) {
      const r = rasio(t[teks], t[latar]);
      assert.ok(r >= 4.5, `${teks} pada ${latar} hanya ${r.toFixed(2)}:1`);
    }
  }
});

test('kedua tema mendefinisikan kumpulan token yang sama', () => {
  const terang = Object.keys(bacaToken('root')).filter((k) => !k.startsWith('--background'));
  const gelap = Object.keys(bacaToken('dark'));
  for (const k of gelap) {
    assert.ok(terang.includes(k), `token ${k} hanya ada di tema gelap`);
  }
});
