// ─── Auth Helpers — JWT + bcrypt for Admin ───
//
// KEAMANAN: JWT_SECRET WAJIB di-set lewat environment variable.
// Tidak ada nilai default/fallback — secret yang di-hardcode di source code
// berarti siapa pun yang bisa membaca repo dapat memalsukan sesi admin.
// Lihat: LAPORAN_AUDIT_PRODUCTION_READINESS.md §P0-01

import { SignJWT, jwtVerify, type JWTPayload } from 'jose';
import bcrypt from 'bcryptjs';

const COOKIE_NAME = 'cc-admin-session';
const MIN_SECRET_LENGTH = 32;
const TOKEN_TTL = '7d';
const BCRYPT_ROUNDS = 12;

export interface AdminPayload {
  id: string;
  username: string;
  nama: string;
  role: 'ADMIN' | 'SUPERADMIN';
}

/**
 * Resolusi JWT_SECRET secara lazy.
 *
 * Lazy (bukan top-level) supaya `next build` tetap bisa jalan di lingkungan CI
 * yang belum punya secret, tetapi request runtime apa pun yang menyentuh auth
 * akan langsung gagal (fail closed) bila secret tidak dikonfigurasi.
 */
let cachedSecret: Uint8Array | null = null;

function getJwtSecret(): Uint8Array {
  if (cachedSecret) return cachedSecret;

  const secret = process.env.JWT_SECRET;

  if (!secret) {
    throw new Error(
      'JWT_SECRET tidak dikonfigurasi. Set environment variable JWT_SECRET ' +
        '(minimal 32 karakter). Generate dengan: openssl rand -base64 48',
    );
  }
  if (secret.length < MIN_SECRET_LENGTH) {
    throw new Error(
      `JWT_SECRET terlalu pendek (${secret.length} karakter, minimal ${MIN_SECRET_LENGTH}). ` +
        'Generate dengan: openssl rand -base64 48',
    );
  }

  cachedSecret = new TextEncoder().encode(secret);
  return cachedSecret;
}

/** True jika JWT_SECRET sudah dikonfigurasi dengan benar (untuk health check). */
export function isAuthConfigured(): boolean {
  try {
    getJwtSecret();
    return true;
  } catch {
    return false;
  }
}

/** Hash password dengan bcrypt. */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

/** Verifikasi password terhadap hash. */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/** Buat JWT token untuk sesi admin. */
export async function createToken(admin: AdminPayload): Promise<string> {
  const payload: JWTPayload = {
    id: admin.id,
    username: admin.username,
    nama: admin.nama,
    role: admin.role,
  };

  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(TOKEN_TTL)
    .sign(getJwtSecret());
}

/** Verifikasi JWT token. Mengembalikan null bila tidak valid/kedaluwarsa/secret salah. */
export async function verifyToken(token: string): Promise<AdminPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getJwtSecret(), { algorithms: ['HS256'] });

    const { id, username, nama, role } = payload as Record<string, unknown>;
    if (
      typeof id !== 'string' ||
      typeof username !== 'string' ||
      typeof nama !== 'string' ||
      (role !== 'ADMIN' && role !== 'SUPERADMIN')
    ) {
      return null;
    }

    return { id, username, nama, role };
  } catch {
    return null;
  }
}

export { COOKIE_NAME };
