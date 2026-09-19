import { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react';
import { api, setToken, getToken } from '../lib/api.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Restore the session from a stored token on first load.
  useEffect(() => {
    let cancelled = false;
    async function restore() {
      if (!getToken()) { setLoading(false); return; }
      try {
        const res = await api.get('/auth/me');
        if (!cancelled) setUser(res.data.user);
      } catch {
        setToken(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    restore();
    return () => { cancelled = true; };
  }, []);

  // Accepts either login(email, password) or login({ email, password }).
  const login = useCallback(async (emailOrPayload, maybePassword) => {
    const creds = typeof emailOrPayload === 'string'
      ? { email: emailOrPayload, password: maybePassword }
      : emailOrPayload;
    const res = await api.post('/auth/login', creds);
    setToken(res.data.token);
    setUser(res.data.user);
    return res.data.user;
  }, []);

  const adminLogin = useCallback(async (emailOrPayload, maybePassword) => {
    const creds = typeof emailOrPayload === 'string'
      ? { email: emailOrPayload, password: maybePassword }
      : emailOrPayload;
    const res = await api.post('/auth/admin/login', creds);
    setToken(res.data.token);
    setUser(res.data.user);
    return res.data.user;
  }, []);

  const register = useCallback(async (payload) => {
    const res = await api.post('/auth/register', payload);
    setToken(res.data.token);
    setUser(res.data.user);
    return res.data.user;
  }, []);

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
  }, []);

  const refresh = useCallback(async () => {
    try {
      const res = await api.get('/auth/me');
      setUser(res.data.user);
      return res.data.user;
    } catch {
      return null;
    }
  }, []);

  const value = useMemo(() => ({
    user,
    loading,
    isAuthenticated: Boolean(user),
    isAdmin: user?.role === 'admin',
    login,
    adminLogin,
    register,
    logout,
    refresh,
    setUser,
  }), [user, loading, login, adminLogin, register, logout, refresh]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
