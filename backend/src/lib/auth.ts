import { SignJWT, jwtVerify } from 'jose';
import bcrypt from 'bcryptjs';
import { AuthenticationError } from './errors';

/**
 * Returns the JWT signing key.
 * Throws at call-time (not module load) if JWT_SECRET is missing.
 */
function getSigningKey(): Uint8Array {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error(
      'FATAL: JWT_SECRET environment variable is not set. ' +
      'Generate one with: openssl rand -hex 64'
    );
  }
  return new TextEncoder().encode(secret);
}

export type SessionPayload = {
  userId: string;
  email: string;
  roles?: string[];
  iat?: number;
  exp?: number;
};

export async function hashPassword(password: string): Promise<string> {
  return await bcrypt.hash(password, 10);
}

export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return await bcrypt.compare(password, hash);
}

export async function encrypt(payload: SessionPayload): Promise<string> {
  return await new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('24h')
    .sign(getSigningKey());
}

export async function decrypt(token: string): Promise<SessionPayload> {
  try {
    const { payload } = await jwtVerify(token, getSigningKey(), {
      algorithms: ['HS256'],
    });
    return payload as SessionPayload;
  } catch (error) {
    throw new AuthenticationError('Invalid or expired session');
  }
}
