import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

export const STORAGE_KEY = 'validecert_session';

const DEMO_USER = 'Vilson';
const DEMO_PASSWORD = '1234';

export type Session = {
  username: string;
};

export type AuthContextData = {
  user: Session | null;
  isAuthenticated: boolean;
  initialized: boolean;
  login: (username: string, password: string) => boolean;
  logout: () => void;
};

function readSession(): Session | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (
      typeof parsed === 'object' &&
      parsed !== null &&
      typeof (parsed as Session).username === 'string' &&
      (parsed as Session).username === DEMO_USER
    ) {
      return { username: DEMO_USER };
    }
    localStorage.removeItem(STORAGE_KEY);
    return null;
  } catch {
    localStorage.removeItem(STORAGE_KEY);
    return null;
  }
}

const AuthContext = createContext<AuthContextData | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<Session | null>(() => readSession());
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    setInitialized(true);
  }, []);

  const login = useCallback((username: string, password: string) => {
    const u = username.trim();
    if (u === DEMO_USER && password === DEMO_PASSWORD) {
      const session: Session = { username: DEMO_USER };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
      setUser(session);
      return true;
    }
    return false;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setUser(null);
  }, []);

  const value = useMemo<AuthContextData>(
    () => ({
      user,
      isAuthenticated: user !== null,
      initialized,
      login,
      logout,
    }),
    [user, initialized, login, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextData {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth deve ser usado dentro de AuthProvider');
  }
  return ctx;
}
