import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authAPI } from '../services/api';

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth muss innerhalb AuthProvider verwendet werden');
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const savedUser = localStorage.getItem('vente_user');
    const token = localStorage.getItem('vente_token');

    if (savedUser && token) {
      try {
        setUser(JSON.parse(savedUser));
      } catch {
        localStorage.clear();
      }
    }
    setLoading(false);
  }, []);

  const login = useCallback(async (email, password) => {
    const { data } = await authAPI.login({ email, password });
    if (data.success) {
      localStorage.setItem('vente_token', data.token);
      localStorage.setItem('vente_refresh_token', data.refreshToken);
      localStorage.setItem('vente_user', JSON.stringify(data.user));
      setUser(data.user);
      return data.user;
    }
    throw new Error(data.error || 'Login fehlgeschlagen');
  }, []);

  const register = useCallback(async (formData) => {
    const { data } = await authAPI.register(formData);
    if (data.success) return data.user;
    throw new Error(data.error || 'Registrierung fehlgeschlagen');
  }, []);

  const logout = useCallback(async () => {
    try { await authAPI.logout(); } catch { /* ignore */ }
    localStorage.removeItem('vente_token');
    localStorage.removeItem('vente_refresh_token');
    localStorage.removeItem('vente_user');
    setUser(null);
  }, []);

  const hasPermission = useCallback((permission) => {
    if (!user || !user.permissions) return false;
    return user.permissions.includes(permission);
  }, [user]);

  const hasRole = useCallback((roles) => {
    if (!user) return false;
    const roleList = Array.isArray(roles) ? roles : [roles];
    return roleList.includes(user.role);
  }, [user]);

  return (
    <AuthContext.Provider value={{
      user, loading, login, register, logout, hasPermission, hasRole,
      isAuthenticated: !!user
    }}>
      {children}
    </AuthContext.Provider>
  );
};
