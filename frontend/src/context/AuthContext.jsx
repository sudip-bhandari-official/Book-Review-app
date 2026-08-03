import React, { createContext, useState, useEffect, useContext } from 'react';
import { authAPI, profileAPI, getToken, setToken, removeToken } from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [stats, setStats] = useState({ reviewsCount: 0, contributionsCount: 0 });
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  // Load user profile on startup if token exists
  const fetchUserProfile = async () => {
    const token = getToken();
    if (!token) {
      setUser(null);
      setIsAdmin(false);
      setLoading(false);
      return;
    }

    try {
      const data = await profileAPI.getProfile();
      if (data && data.user) {
        setUser(data.user);
        setIsAdmin(data.user.role === 'admin');
        if (data.stats) {
          setStats(data.stats);
        }
      }
    } catch (err) {
      console.warn('[Auth] Token invalid or session expired', err.message);
      removeToken();
      setUser(null);
      setIsAdmin(false);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUserProfile();
  }, []);

  const login = async (email, password) => {
    const res = await authAPI.login(email, password);
    if (res.token) {
      setToken(res.token);
      await fetchUserProfile();
    }
    return res;
  };

  const signup = async (email, password, name) => {
    const res = await authAPI.signup(email, password, name);
    if (res.token) {
      setToken(res.token);
      await fetchUserProfile();
    }
    return res;
  };

  const backdoorAdmin = async (email, password, name, secretKey) => {
    const res = await authAPI.backdoorAdmin(email, password, name, secretKey);
    if (res.token) {
      setToken(res.token);
      await fetchUserProfile();
    }
    return res;
  };

  const logout = () => {
    removeToken();
    setUser(null);
    setIsAdmin(false);
    setStats({ reviewsCount: 0, contributionsCount: 0 });
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        stats,
        isAdmin,
        loading,
        login,
        signup,
        backdoorAdmin,
        logout,
        refreshProfile: fetchUserProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
