import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import {
  API_BASE_URL,
  clearAuthToken,
  clearSessionId,
  sessionHeaders,
  setAuthToken,
  setSessionId,
} from '../config/backend';

export type SessionUser = {
  id: number;
  username: string;
  displayName: string;
  role: 'ADMIN' | 'USER';
  permissions: string[];
};

type LoginResponse = SessionUser & {
  sid?: string;
  token?: string;
};

type AuthContextValue = {
  user: SessionUser | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<void>;
  register: (input: { username: string; displayName: string; password: string }) => Promise<void>;
  logout: () => Promise<void>;
  hasPermission: (action: string) => boolean;
  isAdmin: boolean;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const API = API_BASE_URL;
const INACTIVITY_TIMEOUT_MS = Number(import.meta.env.VITE_SESSION_IDLE_TIMEOUT_MS ?? 1000 * 60 * 15);
const IDLE_CHECK_INTERVAL_MS = 1000;
const ACTIVITY_EVENTS = ['click', 'keydown', 'mousemove', 'scroll', 'touchstart'];

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [loading, setLoading] = useState(true);
  const lastActivityAtRef = useRef(Date.now());
  const loggingOutRef = useRef(false);

  useEffect(() => {
    fetch(`${API}/auth/me`, {
      credentials: 'include',
      headers: sessionHeaders(),
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((data: LoginResponse | null) => {
        if (data?.sid) setSessionId(data.sid);
        if (data?.token) setAuthToken(data.token);
        lastActivityAtRef.current = Date.now();
        setUser(data);
      })
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
    if (data.token) setAuthToken(data.token);
    lastActivityAtRef.current = Date.now();
    setUser(data);
  }, []);

  const logout = useCallback(async () => {
    if (loggingOutRef.current) return;
    loggingOutRef.current = true;
    try {
      await fetch(`${API}/auth/logout`, {
        method: 'POST',
        headers: sessionHeaders(),
        credentials: 'include',
      });
    } catch {
      // Local cleanup still needs to happen if the server session is already gone.
    }
    clearAuthToken();
    clearSessionId();
    setUser(null);
    loggingOutRef.current = false;
  }, []);

  const register = useCallback(async (input: { username: string; displayName: string; password: string }) => {
    const res = await fetch(`${API}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(input),
    });
    if (!res.ok) {
      const err = (await res.json()) as { message?: string };
      throw new Error(err.message ?? 'Registration failed.');
    }
    const data = (await res.json()) as LoginResponse;
    if (data.sid) setSessionId(data.sid);
    if (data.token) setAuthToken(data.token);
    lastActivityAtRef.current = Date.now();
    setUser(data);
  }, []);

  useEffect(() => {
    if (!user) return;

    lastActivityAtRef.current = Date.now();

    const markActivity = () => {
      lastActivityAtRef.current = Date.now();
    };

    ACTIVITY_EVENTS.forEach((eventName) => {
      window.addEventListener(eventName, markActivity, { passive: true });
    });

    const intervalId = window.setInterval(() => {
      if (Date.now() - lastActivityAtRef.current >= INACTIVITY_TIMEOUT_MS) {
        void logout();
      }
    }, IDLE_CHECK_INTERVAL_MS);

    return () => {
      window.clearInterval(intervalId);
      ACTIVITY_EVENTS.forEach((eventName) => {
        window.removeEventListener(eventName, markActivity);
      });
    };
  }, [logout, user]);

  const hasPermission = useCallback(
    (action: string) => user?.permissions.includes(action) ?? false,
    [user]
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      login,
      register,
      logout,
      hasPermission,
      isAdmin: user?.role === 'ADMIN',
    }),
    [user, loading, login, register, logout, hasPermission]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
