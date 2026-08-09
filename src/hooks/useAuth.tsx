import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';

type Role = 'ADMIN' | 'INTERN' | 'VIEWER';

export interface User {
  id: string;
  name: string;
  role: Role;
  email: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (id: string, pass: string) => Promise<boolean>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

// Map of our 3 hardcoded users to their fixed mock UUIDs from the DB
const MOCK_USERS: Record<string, User> = {
  'intern': {
    id: '11111111-1111-1111-1111-111111111111',
    name: 'Intern User',
    role: 'INTERN',
    email: 'intern@cirt.com'
  },
  'admin': {
    id: '22222222-2222-2222-2222-222222222222',
    name: 'Admin User',
    role: 'ADMIN',
    email: 'admin@cirt.com'
  },
  'anything': {
    id: '33333333-3333-3333-3333-333333333333',
    name: 'Viewer User',
    role: 'VIEWER',
    email: 'viewer@cirt.com'
  }
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Read from localStorage on mount
    const storedUser = localStorage.getItem('mock_user');
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch (e) {
        localStorage.removeItem('mock_user');
      }
    }
    setLoading(false);
  }, []);

  const login = async (id: string, pass: string) => {
    if (
      (id === 'intern' && pass === 'intern') ||
      (id === 'admin' && pass === 'admin') ||
      (id === 'anything' && pass === 'anything')
    ) {
      const u = MOCK_USERS[id];
      setUser(u);
      localStorage.setItem('mock_user', JSON.stringify(u));
      return true;
    }
    return false;
  };

  const logout = async () => {
    setUser(null);
    localStorage.removeItem('mock_user');
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
