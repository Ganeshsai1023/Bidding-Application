import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authService } from '../api/authService';
import { tokenStore } from '../api/axiosClient';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null);
  const [loading, setLoading] = useState(true);

  // On mount: try a silent refresh to restore session from the HttpOnly cookie
  useEffect(() => {
    const restore = async () => {
      try {
        const data = await authService.refresh();
        setUser(data.user);
      } catch {
        // No valid session — stay logged out
      } finally {
        setLoading(false);
      }
    };
    restore();
  }, []);

  // Listen for forced logout from the axios interceptor
  useEffect(() => {
    const handler = () => {
      setUser(null);
      tokenStore.clear();
    };
    window.addEventListener('auth:session-expired', handler);
    return () => window.removeEventListener('auth:session-expired', handler);
  }, []);

  const login = useCallback(async (credentials) => {
    const data = await authService.login(credentials);
    setUser(data.user);
    return data;
  }, []);

  const register = useCallback(async (formData) => {
    const data = await authService.register(formData);
    setUser(data.user);
    return data;
  }, []);

  const logout = useCallback(async () => {
    await authService.logout();
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
