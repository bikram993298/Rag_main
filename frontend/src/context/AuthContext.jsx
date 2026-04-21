import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Initialize from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem('auth');
    if (stored) {
      try {
        setUser(JSON.parse(stored));
      } catch (e) {
        console.error('Failed to parse stored auth:', e);
        localStorage.removeItem('auth');
      }
    }
    setLoading(false);
  }, []);

  // Save to localStorage whenever user changes
  useEffect(() => {
    if (user) {
      localStorage.setItem('auth', JSON.stringify(user));
    } else {
      localStorage.removeItem('auth');
    }
  }, [user]);

  const signup = async (email, fullName, password) => {
    setError(null);
    setLoading(true);
    try {
      const response = await axios.post(`${API_URL}/api/auth/signup`, {
        email,
        full_name: fullName,
        password,
      });

      // Signup returns a message, not tokens
      // User needs to verify email first
      return response.data;
    } catch (err) {
      const message = err.response?.data?.detail || 'Signup failed';
      setError(message);
      throw new Error(message);
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password) => {
    setError(null);
    setLoading(true);
    try {
      const response = await axios.post(`${API_URL}/api/auth/login`, {
        email,
        password,
      });

      const { access_token, refresh_token, user: userData } = response.data;
      setUser({
        ...userData,
        accessToken: access_token,
        refreshToken: refresh_token,
      });
      return userData;
    } catch (err) {
      const message = err.response?.data?.detail || 'Login failed';
      setError(message);
      throw new Error(message);
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
    setError(null);
  };

  const refreshAccessToken = async () => {
    if (!user?.refreshToken) {
      logout();
      return;
    }

    try {
      const response = await axios.post(`${API_URL}/api/auth/refresh`, {}, {
        headers: {
          Authorization: `Bearer ${user.refreshToken}`,
        },
      });

      const { access_token, user: userData } = response.data;
      setUser({
        ...user,
        ...userData,
        accessToken: access_token,
      });
      return access_token;
    } catch (err) {
      console.error('Token refresh failed:', err);
      logout();
    }
  };

  const resendVerificationEmail = async (email) => {
    setError(null);
    try {
      const response = await axios.post(
        `${API_URL}/api/auth/resend-verification-email?email=${email}`
      );
      return response.data;
    } catch (err) {
      const message = err.response?.data?.detail || 'Failed to resend email';
      setError(message);
      throw new Error(message);
    }
  };

  const value = {
    user,
    loading,
    error,
    isAuthenticated: !!user,
    signup,
    login,
    logout,
    refreshAccessToken,
    resendVerificationEmail,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

