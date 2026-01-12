import React, { createContext, useState, useEffect, useContext } from 'react';
import { api } from '../api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const [dashboardUnlocked, setDashboardUnlocked] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const checkAuth = async () => {
      try {
        const token = localStorage.getItem('token');
        console.log('Checking auth, token:', token ? 'exists' : 'missing');

        if (!token) {
          if (isMounted) {
            console.log('No token found, setting user to null');
            setUser(null);
            setDashboardUnlocked(false);
            setLoading(false);
          }
          return;
        }

        const response = await api.get('/api/auth/me');

        console.log('Auth check response status:', response.status);

        if (response.ok) {
          const userData = await response.json();
          if (isMounted) {
            console.log('User authenticated:', userData.role);
            setUser(userData);

            // Restore dashboard unlocked state from session storage
            const isUnlocked = sessionStorage.getItem('dashboardUnlocked') === 'true';
            setDashboardUnlocked(isUnlocked);
          }
        } else {
          if (isMounted) {
            console.log('Auth check failed, clearing token');
            setUser(null);
            setDashboardUnlocked(false);
            localStorage.removeItem('token');
            sessionStorage.removeItem('dashboardUnlocked');
          }
        }
      } catch (error) {
        if (isMounted) {
          console.error('Auth check error:', error);
          setUser(null);
          setDashboardUnlocked(false);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    checkAuth();

    return () => {
      isMounted = false;
    };
  }, []);

  const login = async (username, password, schoolSlug) => {
    try {
      const response = await api.post('/api/auth/login', { username, password, schoolSlug });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Login failed');
      }

      localStorage.setItem('token', data.token);
      localStorage.setItem('schoolSlug', schoolSlug);
      setUser(data.user);

      // Superadmins bypass the second layer
      if (data.user.role === 'superadmin') {
        setDashboardUnlocked(true);
        sessionStorage.setItem('dashboardUnlocked', 'true');
      } else {
        setDashboardUnlocked(false);
        sessionStorage.removeItem('dashboardUnlocked');
      }

      return {
        success: true,
        mustChangePassword: data.user.mustChangePassword,
        role: data.user.role
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  const unlockDashboard = async (password) => {
    try {
      if (!user) throw new Error('No user logged in');

      // We can re-use the login endpoint, but we need the school slug.
      // We can get it from localStorage or user settings if available.
      const schoolSlug = localStorage.getItem('schoolSlug') || '';

      const response = await api.post('/api/auth/login', {
        username: user.username,
        password,
        schoolSlug
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Verification failed');
      }

      // If successful, unlock dashboard
      setDashboardUnlocked(true);
      sessionStorage.setItem('dashboardUnlocked', 'true');
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  const lockDashboard = () => {
    setDashboardUnlocked(false);
    sessionStorage.removeItem('dashboardUnlocked');
  };

  const logout = async () => {
    try {
      const isSuperAdmin = user?.role === 'superadmin';
      await api.post('/api/auth/logout');
      localStorage.removeItem('token');
      if (isSuperAdmin) {
        localStorage.removeItem('schoolSlug');
      }
      sessionStorage.removeItem('dashboardUnlocked');
      setUser(null);
      setDashboardUnlocked(false);
    } catch (error) {
      console.error('Logout failed:', error);
      // Even if API fails, clear local state
      localStorage.removeItem('token');
      sessionStorage.removeItem('dashboardUnlocked');
      setUser(null);
      setDashboardUnlocked(false);
    }
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, lockDashboard, unlockDashboard, dashboardUnlocked, loading }}>
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
