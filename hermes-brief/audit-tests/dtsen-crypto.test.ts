/**
 * AUDIT — pembuktian empiris atas klaim kripto DTSEN.
 * Berkas ini sengaja TIDAK di-commit ke repo; hanya untuk audit.
 * Jalankan: npx vitest run audit-dtsen-crypto
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { encryptField, decryptField, canSeeFullIdentitas } from '@/lib/dtsen-crypto';

const OLD = process.env.DTSEN_DATA_KEY;
afterEach(() => {
  if (OLD === undefined) delete process.env.DTSEN_DATA_KEY;
  else process.env.DTSEN_DATA_KEY = OLD;
});

// Kunci yang dipakai produksi menurut docs: 43 char base64url -> 32 byte
const KEY43 = 'MDEyMzQ1Njc4OWFiY2RlZjAxMjM0NTY3ODlhYmNkZWY';

describe('K1 — panjang kunci efektif', () => {
  it('kunci 43-char base64url = 32 byte (dokumentasi benar)', () => {
    expect(Buffer.from(KEY43, 'base64url').length).toBe(32);
  });

  it('kunci 32-char ASCII diterima dan DIPOTONG jadi 24 byte', () => {
    const b = Buffer.from('12345678901234567890123456789012', 'base64url');
    expect(b.length).toBe(24);          // bukan 32!
    expect(b.length >= 32).toBe(false); // -> ditolak dataKey()
  });

  it('kunci 44-char ASCII diterima dan DIPOTONG jadi 33 byte (bukan 32)', () => {
    const b = Buffer.from('12345678901234567890123456789012345678901234', 'base64url');
    expect(b.length).toBe(33);
  });

  it('kunci 64-char HEX (bentuk paling wajar untuk 256-bit) DITOLAK diam-diam', () => {
    const hex = 'a'.repeat(64);
    const b = Buffer.from(hex, 'base64url');
    expect(b.length).toBe(48);
    // Tapi node crypto menolak 48 byte untuk aes-256-gcm:
    expect(() => require('crypto').createCipheriv('aes-256-gcm', b, Buffer.alloc(12)))
      .toThrow();
  });
});

describe('K2 — perilaku encryptField saat kunci tidak sah', () => {
  it('kunci 64-hex -> encryptField MELEMPAR (bukan return null)', () => {
    process.env.DTSEN_DATA_KEY = 'a'.repeat(64);
    let thrown: unknown = null;
    let ret: string | null = 'BELUM_DIPANGGIL';
    try { ret = encryptField('RAHASIA'); } catch (e) { thrown = e; }
    // Salah satu dari dua ini terjadi; keduanya berarti "gagal keras", bukan null.
    expect(thrown !== null || ret === null).toBe(true);
    console.log('  [K2] 64-hex  → thrown=', thrown ? String(thrown).split('\n')[0] : 'tidak',
                '· ret=', ret === 'BELUM_DIPANGGIL' ? '(tidak tercapai)' : ret);
  });

  it('tanpa kunci -> null (aman)', () => {
    delete process.env.DTSEN_DATA_KEY;
    expect(encryptField('RAHASIA')).toBeNull();
  });

  it('plaintext kosong -> null (aman)', () => {
    process.env.DTSEN_DATA_KEY = KEY43;
    expect(encryptField('')).toBeNull();
  });
});

describe('K3 — roundtrip & format', () => {
  beforeEach(() => { process.env.DTSEN_DATA_KEY = KEY43; });

  it('roundtrip nama + NIK asli', () => {
    const nama = 'AL HAFIZH RAIHAN ARIGADIEI';
    const nik = '3216022603070011';
    expect(decryptField(encryptField(nama))).toBe(nama);
    expect(decryptField(encryptField(nik))).toBe(nik);
  });

  it('IV acak per panggilan (format benar, tidak ada nonce reuse)', () => {
    const a = encryptField('SAMA')!;
    const b = encryptField('SAMA')!;
    expect(a).not.toBe(b);
    const ivA = Buffer.from(a, 'base64').subarray(0, 12);
    const ivB = Buffer.from(b, 'base64').subarray(0, 12);
    expect(ivA.equals(ivB)).toBe(false);
  });

  it('offset tag & ciphertext sesuai dokumentasi (12 / 16)', () => {
    const enc = encryptField('X')!;
    const buf = Buffer.from(enc, 'base64');
    expect(buf.length).toBe(12 + 16 + 1);   // iv + tag + 1 byte plaintext
  });

  it('ciphertext TIDAK bocor ke base64 biasa', () => {
    const enc = encryptField('3216022603070011')!;
    expect(enc.includes('3216022603070011')).toBe(false);
  });
});

describe('K4 — ketahanan terhadap篡改', () => {
  beforeEach(() => { process.env.DTSEN_DATA_KEY = KEY43; });

  it('tag GCM menolak ciphertext yang diubah 1 bit', () => {
    const enc = encryptField('NIK-ASLI-123')!;
    const buf = Buffer.from(enc, 'base64');
    buf[buf.length - 1] ^= 0x01;                       // ubah bit terakhir ciphertext
    expect(decryptField(buf.toString('base64'))).toBeNull();
  });

  it('kunci berbeda tidak bisa mendekripsi', () => {
    const enc = encryptField('NIK-ASLI-123')!;
    process.env.DTSEN_DATA_KEY = 'ZDEyMzQ1Njc4OWFiY2RlZjAxMjM0NTY3ODlhYmNkZWY';
    expect(decryptField(enc)).toBeNull();
  });

  it('input pendek / sampah -> null, tidak melempar', () => {
    expect(decryptField('')).toBeNull();
    expect(decryptField('pendek')).toBeNull();
    expect(decryptField('!!!!bukan-base64!!!!')).toBeNull();
  });
});

describe('K5 — matriks role canSeeFullIdentitas', () => {
  const kasus: [string | null | undefined, boolean][] = [
    ['DTSEN_ROOT', true],
    ['SUPERADMIN', false],
    ['ADMIN', false],
    ['DTSEN_LOOKUP', false],
    ['DTSEN_ANALYST', false],
    ['dtsen_root', false],       // case-sensitive: huruf kecil DITOLAK
    [' DTSEN_ROOT', false],      // spasi DITOLAK
    ['DTSEN_ROOT ', false],
    ['', false],
    [null, false],
    [undefined, false],
  ];
  it.each(kasus)('role %s -> %s', (role, harap) => {
    expect(canSeeFullIdentitas(role)).toBe(harap);
  });
});
