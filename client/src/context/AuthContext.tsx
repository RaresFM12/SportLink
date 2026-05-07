import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { API_BASE_URL, clearSessionId, sessionHeaders, setSessionId } from '../config/backend';

export type SessionUser = {
  id: number;
  username: string;
  displayName: string;
  role: 'ADMIN' | 'USER';
  permissions: string[];
};

type LoginResponse = SessionUser & {
  sid?: string;
};

type AuthContextValue = {
  user: SessionUser | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  hasPermission: (action: string) => boolean;
  isAdmin: boolean;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const API = API_BASE_URL;

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API}/auth/me`, {
      credentials: 'include',
      headers: sessionHeaders(),
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((data: SessionUser | null) => setUser(data))
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  const login = useCallback(async (username: string, password: string) => {
    const res = await fetch(`${API}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ username, password }),
    });
    if (!res.ok) {
      const err = (await res.json()) as { message?: string };
      throw new Error(err.message ?? 'Login failed.');
    }
    const data = (await res.json()) as LoginResponse;
    if (data.sid) setSessionId(data.sid);
    setUser(data);
  }, []);

  const logout = useCallback(async () => {
    await fetch(`${API}/auth/logout`, {
      method: 'POST',
      headers: sessionHeaders(),
      credentials: 'include',
    });
    clearSessionId();
    setUser(null);
  }, []);

  const hasPermission = useCallback(
    (action: string) => user?.permissions.includes(action) ?? false,
    [user]
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      login,
      logout,
      hasPermission,
      isAdmin: user?.role === 'ADMIN',
    }),
    [user, loading, login, logout, hasPermission]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
