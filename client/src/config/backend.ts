export const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3001/api'
).replace(/\/$/, '');

export const GRAPHQL_URL =
  import.meta.env.VITE_GRAPHQL_URL ?? 'http://localhost:3001/graphql';

export const WS_URL =
  import.meta.env.VITE_WS_URL ?? 'ws://localhost:3001/ws';

const SESSION_ID_STORAGE_KEY = 'sportlink.sid';

export function apiUrl(path = ''): string {
  if (!path) return API_BASE_URL;
  return `${API_BASE_URL}${path.startsWith('/') ? path : `/${path}`}`;
}

export function wsUrl(path = '/ws'): string {
  if (path === '/ws') return WS_URL;

  const url = new URL(WS_URL);
  url.pathname = path.startsWith('/') ? path : `/${path}`;
  url.search = '';
  url.hash = '';
  return url.toString();
}

export function getSessionId(): string | null {
  try {
    return window.localStorage.getItem(SESSION_ID_STORAGE_KEY);
  } catch {
    return null;
  }
}

export function setSessionId(sessionId: string): void {
  try {
    window.localStorage.setItem(SESSION_ID_STORAGE_KEY, sessionId);
  } catch {
    // Ignore storage failures; cookie-based sessions may still work locally.
  }
}

export function clearSessionId(): void {
  try {
    window.localStorage.removeItem(SESSION_ID_STORAGE_KEY);
  } catch {
    // Ignore storage failures.
  }
}

export function sessionHeaders(): HeadersInit {
  const sessionId = getSessionId();
  return sessionId ? { 'X-Session-Id': sessionId } : {};
}
