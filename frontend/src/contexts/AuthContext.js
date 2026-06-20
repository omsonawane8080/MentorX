import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import api from '@/lib/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const checkAuth = useCallback(async () => {
    try {
      const { data } = await api.get('/auth/me');
      setUser(data);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // CRITICAL: If returning from OAuth callback, skip /me check.
    // AuthCallback will exchange the session_id and establish the session first.
    if (typeof window !== 'undefined' && window.location.hash?.includes('session_id=')) {
      setLoading(false);
      return;
    }
    checkAuth();
  }, [checkAuth]);

  const logout = useCallback(async () => {
    try { await api.post('/auth/logout'); } catch (err) {
      console.warn('Logout request failed (server may already have cleared session):', err?.message || err);
    }
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({ user, setUser, loading, checkAuth, logout }),
    [user, loading, checkAuth, logout],
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
