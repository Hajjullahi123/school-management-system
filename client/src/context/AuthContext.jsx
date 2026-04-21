import React, { createContext, useState, useEffect, useContext } from 'react';
import { api } from '../api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const [dashboardUnlocked] = useState(true);

  const checkAuth = React.useCallback(async () => {
    try {
      const token = localStorage.getItem('token');

      if (!token) {
        setUser(null);
        setLoading(false);
        return;
      }

      // Race the API call against an 8-second timeout
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Auth check timed out')), 15000)
      );

      const response = await Promise.race([
        api.get('/api/auth/me'),
        timeoutPromise
      ]);

      if (response.ok) {
        const userData = await response.json();
        setUser(userData);
      } else {
        setUser(null);
        if (response.status === 401 || response.status === 403) {
          localStorage.removeItem('token');
          sessionStorage.removeItem('dashboardUnlocked');
        }
      }
    } catch (error) {
      setUser(null);
      // Keep token on timeout/network errors so user stays logged in after cold start
      if (error.message !== 'Auth check timed out' && !error.message.includes('FetchError') && !error.message.includes('Network Error')) {
        localStorage.removeItem('token');
        sessionStorage.removeItem('dashboardUnlocked');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  const demoLogin = async () => {
    // In a real app, this would call a special endpoint or use a guest account
    // For this demonstration, we'll simulate a login for 'demo_admin'
    return login('demo_admin', 'Pass1234!', 'demo');
  };

  const login = async (username, password, schoolSlug) => {
    try {
      const response = await api.post('/api/auth/login', { username, password, schoolSlug });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Login failed');
      }

      localStorage.setItem('token', data.token);

      // Persist schoolSlug — use caller-provided slug first, then fall back to what the server returned
      const resolvedSlug = (schoolSlug && schoolSlug !== 'null' && schoolSlug !== 'undefined')
        ? schoolSlug
        : (data.user?.school?.slug || data.user?.schoolSlug || null);

      if (resolvedSlug) {
        localStorage.setItem('schoolSlug', resolvedSlug);
      }

      setUser(data.user);

      return {
        success: true,
        mustChangePassword: data.user.mustChangePassword,
        role: data.user.role
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  const unlockDashboard = async () => ({ success: true });

  const lockDashboard = () => {};

  const logout = async () => {
    // Capture slug BEFORE clearing storage so the caller can redirect
    const isSuperAdmin = user?.role === 'superadmin';
    const savedSlug = localStorage.getItem('schoolSlug');

    try {
      // Create a promise that rejects after 3 seconds to avoid hanging the UI
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Logout timed out')), 3000)
      );

      // Race the API call against the timeout
      await Promise.race([
        api.post('/api/auth/logout'),
        timeoutPromise
      ]);
    } catch (error) {
      console.warn('Logout API notification skipped or timed out:', error.message);
    } finally {
      // Always clear local auth state regardless of API success or timeout
      localStorage.removeItem('token');
      if (isSuperAdmin) {
        localStorage.removeItem('schoolSlug');
      }
      sessionStorage.removeItem('dashboardUnlocked');
      setUser(null);
    }

    // Return the slug so callers can redirect to the school's landing page
    return { schoolSlug: isSuperAdmin ? null : savedSlug };
  };

  const isDemo = user?.username === 'demo_admin';

  const refreshUser = async () => {
    return checkAuth();
  };

  return (
    <AuthContext.Provider value={{ user, isDemo, login, demoLogin, logout, lockDashboard, unlockDashboard, dashboardUnlocked, loading, refreshUser }}>
      {loading ? (
        <div className="min-h-screen flex flex-col items-center justify-center bg-gray-900 text-white">
          <div className="w-16 h-16 border-4 border-indigo-500 border-t-white rounded-full animate-spin mb-6"></div>
          <h2 className="text-2xl font-black tracking-tighter animate-pulse">Initializing EduTechAI...</h2>
          <p className="text-gray-500 text-sm mt-2 font-medium">Securing connection to infrastructure</p>
        </div>
      ) : children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
