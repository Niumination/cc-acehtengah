// ─── Auth Helpers — JWT + bcrypt for Admin ───

import { SignJWT, jwtVerify } from 'jose';
import bcrypt from 'bcryptjs';

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'cc-acehtengah-secret-key-2026'
);

const COOKIE_NAME = 'cc-admin-session';

export interface AdminPayload {
  id: string;
  username: string;
  nama: string;
  role: string;
}

/** Hash password with bcrypt */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

/** Verify password against hash */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/** Create JWT token */
export async function createToken(admin: AdminPayload): Promise<string> {
  return new SignJWT(admin as any)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(JWT_SECRET);
}

/** Verify JWT token */
export async function verifyToken(token: string): Promise<AdminPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload as unknown as AdminPayload;
  } catch {
    return null;
  }
}

export { COOKIE_NAME };
