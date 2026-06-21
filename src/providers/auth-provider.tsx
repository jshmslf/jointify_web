'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { getMe } from '@/lib/queries/auth';
import { getToken, removeToken } from '@/lib/auth';

interface User {
  id:        string;
  email:     string;
  username:  string;
  givenName: string;
  surname:   string;
}

interface AuthContextType {
  user:       User | null;
  loading:    boolean;
  logout:     () => void;
  setUser:    (user: User) => void;
}

const AuthContext = createContext<AuthContextType>({
  user:    null,
  loading: true,
  logout:  () => {},
  setUser: () => {},
});

export function useAuth() {
  return useContext(AuthContext);
}

export default function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser]       = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = getToken();
    if (!token) {
      Promise.resolve().then(() => setLoading(false));
      return;
    }

    getMe()
      .then(setUser)
      .catch(() => removeToken())
      .finally(() => setLoading(false));
  }, []);

  function logout() {
    removeToken();
    setUser(null);
    window.location.href = '/login';
  }

  return (
    <AuthContext.Provider value={{ user, loading, logout, setUser }}>
      {children}
    </AuthContext.Provider>
  );
}