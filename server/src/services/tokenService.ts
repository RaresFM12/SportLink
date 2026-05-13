import { createHmac, timingSafeEqual } from 'crypto';
import type { SessionUser } from './authService.js';

const TOKEN_SECRET = process.env.AUTH_TOKEN_SECRET ?? process.env.SESSION_SECRET ?? 'sportlink-dev-secret-change-in-prod';
const TOKEN_TTL_MS = Number(process.env.AUTH_TOKEN_TTL_MS ?? 1000 * 60 * 15);

export type AuthTokenPayload = SessionUser & {
  sid: string;
  iat: number;
  exp: number;
};

function base64Url(input: Buffer | string): string {
  return Buffer.from(input).toString('base64url');
}

function sign(data: string): string {
  return createHmac('sha256', TOKEN_SECRET).update(data).digest('base64url');
}

export function createAuthToken(user: SessionUser, sessionId: string, now = Date.now()): string {
  const header = base64Url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const payload = base64Url(JSON.stringify({
    ...user,
    sid: sessionId,
    iat: Math.floor(now / 1000),
    exp: Math.floor((now + TOKEN_TTL_MS) / 1000),
  }));
  const data = `${header}.${payload}`;
  return `${data}.${sign(data)}`;
}

export function verifyAuthToken(token: string, now = Date.now()): AuthTokenPayload | null {
  const parts = token.split('.');
  if (parts.length !== 3) return null;

  const [header, payload, signature] = parts;
  const data = `${header}.${payload}`;
  const expected = sign(data);

  const providedBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);
  if (
    providedBuffer.length !== expectedBuffer.length ||
    !timingSafeEqual(providedBuffer, expectedBuffer)
  ) {
    return null;
  }

  try {
    const decoded = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as AuthTokenPayload;
    if (!decoded.sid || !decoded.id) return null;
    if (decoded.exp * 1000 <= now) return null;
    return decoded;
  } catch {
    return null;
  }
}

export function readBearerToken(authorization?: string): string | null {
  if (!authorization?.startsWith('Bearer ')) return null;
  const token = authorization.slice('Bearer '.length).trim();
  return token || null;
}
