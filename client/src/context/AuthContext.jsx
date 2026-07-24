import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authAPI } from '../services/api';
import socket from '../services/socket';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      authAPI
        .getMe()
        .then((res) => {
          setUser(res.data.user);
          localStorage.setItem('user', JSON.stringify(res.data.user));
        })
        .catch(() => {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user?.id) {
      socket.io.opts.query = { userId: user.id };
      if (!socket.connected) {
        socket.connect();
      } else {
        socket.emit('identify', user.id);
        socket.emit('request_online_users');
      }
    } else if (socket.connected) {
      socket.disconnect();
    }
  }, [user?.id]);

  const login = async (email, password) => {
    const res = await authAPI.login({ email, password });
    const { token, user: userData } = res.data;
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(userData));
    setUser(userData);
    return res.data;
  };

  const register = async (data) => {
    const res = await authAPI.register(data);
    return res.data;
  };

  const logout = useCallback(() => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    if (socket.connected) socket.disconnect();
  }, []);

  const updateUser = useCallback((partialOrFullUser) => {
    setUser((prev) => {
      const updated = typeof partialOrFullUser === 'function'
        ? partialOrFullUser(prev)
        : { ...(prev || {}), ...partialOrFullUser };
      localStorage.setItem('user', JSON.stringify(updated));
      return updated;
    });
  }, []);

  // Auto-logout when API interceptor fires auth:expired (token expired server-side)
  useEffect(() => {
    const handler = () => logout();
    window.addEventListener('auth:expired', handler);
    return () => window.removeEventListener('auth:expired', handler);
  }, [logout]);

  return (
    <AuthContext.Provider value={{ user, setUser, updateUser, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
