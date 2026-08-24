import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { api } from '@/lib/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [seller, setSeller] = useState(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!localStorage.getItem('zz_token')) {
      setUser(null);
      setSeller(null);
      setLoading(false);
      return;
    }
    try {
      const { data } = await api.get('/auth/me');
      setUser(data.user);
      setSeller(data.seller);
    } catch {
      localStorage.removeItem('zz_token');
      setUser(null);
      setSeller(null);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const requestOtp = async (email, name) => {
    const { data } = await api.post('/auth/otp/request', { email, name });
    return data;
  };

  const verifyOtp = async ({ email, otp, name, role }) => {
    const { data } = await api.post('/auth/otp/verify', { email, otp, name, role });
    localStorage.setItem('zz_token', data.token);
    await refresh();
    return data;
  };

  const adminLogin = async (email, password) => {
    const { data } = await api.post('/auth/admin/login', { email, password });
    localStorage.setItem('zz_token', data.token);
    await refresh();
    return data.user;
  };

  const logout = async () => {
    await api.post('/auth/logout').catch(() => {});
    localStorage.removeItem('zz_token');
    setUser(null);
    setSeller(null);
  };

  return (
    <AuthContext.Provider
      value={{ user, seller, loading, requestOtp, verifyOtp, adminLogin, logout, refresh }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
