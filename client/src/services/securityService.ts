import { apiUrl, sessionHeaders } from '../config/backend';

const API = apiUrl('/security');

export type ObservationUser = {
  id: number;
  userId: number;
  groupId: string;
  reason: string;
  suspicionScore: number;
  lastActionInfo: string;
  lastActionAt: string;
  createdAt: string;
  updatedAt: string;
  user: {
    id: number;
    username: string;
    displayName: string;
  };
};

export type ActionLog = {
  id: number;
  userId: number;
  groupId: string;
  actionInformation: string;
  method: string;
  path: string;
  statusCode: number;
  ipAddress?: string | null;
  userAgent?: string | null;
  createdAt: string;
  user: {
    id: number;
    username: string;
    displayName: string;
  };
};

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url, {
    credentials: 'include',
    headers: sessionHeaders(),
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { message?: string } | null;
    throw new Error(body?.message ?? `Request failed with status ${res.status}`);
  }
  return (await res.json()) as T;
}

export const securityService = {
  listObservationUsers(): Promise<ObservationUser[]> {
    return fetchJson<ObservationUser[]>(`${API}/observations`);
  },

  listRecentLogs(limit = 100): Promise<ActionLog[]> {
    return fetchJson<ActionLog[]>(`${API}/logs?limit=${limit}`);
  },
};
