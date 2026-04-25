import React, { createContext, useState, useEffect, useContext } from 'react';
import { api } from '../api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const [dashboardUnlocked] = useState(true);

  const checkAuth = React.useCallback(async (retryCount = 0) => {
    try {
      const token = localStorage.getItem('token');

      if (!token || token === 'null' || token === 'undefined') {
        setUser(null);
        setLoading(false);
        if (token) localStorage.removeItem('token'); // Clean up invalid strings
        return;
      }

      // Race the API call against a 30-second timeout
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Auth check timed out')), 30000)
      );

      console.log(`[Auth] Checking session (Attempt ${retryCount + 1})...`);
      const response = await Promise.race([
        api.get('/api/auth/me'),
        timeoutPromise
      ]);

      if (response.ok) {
        const userData = await response.json();
        setUser(userData);
        setLoading(false);
        console.log('[Auth] Session restored successfully for:', userData.username);
      } else {
        // ONLY clear session on explicit authentication failure (Invalid Token)
        if (response.status === 401 || response.status === 403) {
          const errorData = await response.json().catch(() => ({}));
          console.warn(`[Auth] Session invalid (${response.status}). Reason: ${errorData.error || 'Unknown'}.`);
          
          // Don't nuke the token if it's a 403 (Forbidden) as the token might still be valid for other routes
          // Only nuke on 401 (Unauthorized/Expired)
          if (response.status === 401) {
            setUser(null);
            localStorage.removeItem('token');
            sessionStorage.removeItem('dashboardUnlocked');
            console.warn('[Auth] Token removed from storage.');
          }
          setLoading(false);
        } else {
          // For 500 or other server errors, we might want to retry if it's the initial load
          console.error(`[Auth] Server returned ${response.status} during auth check.`);
          if (retryCount < 2) {
            console.log(`[Auth] Retrying checkAuth (Attempt ${retryCount + 2}) in 2s...`);
            setTimeout(() => checkAuth(retryCount + 1), 2000);
          } else {
            setLoading(false);
          }
        }
      }
    } catch (error) {
      console.warn('[Auth] Connection error during auth check:', error.message);
      
      // If it's a network error or timeout, retry up to 3 times
      if (retryCount < 3) {
        const delay = Math.pow(2, retryCount) * 1000; // Exponential backoff
        console.log(`[Auth] Retrying in ${delay}ms...`);
        setTimeout(() => checkAuth(retryCount + 1), delay);
      } else {
        // If we really can't connect, we stop loading to let the app show its offline/error state
        // but we DON'T necessarily clear the user if we had one (though on refresh user is null)
        setLoading(false);
      }
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
