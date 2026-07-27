'use client';
import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authApi } from '@/lib/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  // Define Handlers first to avoid temporal dead zone (TDZ) hoisting ReferenceErrors
  const login = useCallback(async (email, password, force = false) => {
    const res = await authApi.login({ email, password, force });
    if (res.success) {
      localStorage.setItem('gojim_token', res.token);
      localStorage.setItem('gojim_user', JSON.stringify(res.user));
      localStorage.setItem('gojim_last_activity', Date.now().toString());
      setToken(res.token);
      setUser(res.user);
    }
    return res;
  }, []);

  const register = useCallback(async (data) => {
    const res = await authApi.register(data);
    if (res.success) {
      localStorage.setItem('gojim_token', res.token);
      localStorage.setItem('gojim_user', JSON.stringify(res.user));
      localStorage.setItem('gojim_last_activity', Date.now().toString());
      setToken(res.token);
      setUser(res.user);
    }
    return res;
  }, []);

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } catch (error) {
      console.error('Failed to log out from backend:', error.message);
    } finally {
      localStorage.removeItem('gojim_token');
      localStorage.removeItem('gojim_user');
      localStorage.removeItem('gojim_last_activity');
      setToken(null);
      setUser(null);
    }
  }, []);

  const updateUser = useCallback((userData) => {
    setUser(prevUser => {
      const updatedUser = { ...prevUser, ...userData };
      localStorage.setItem('gojim_user', JSON.stringify(updatedUser));
      return updatedUser;
    });
  }, []);

  // Load active session from storage on component mount
  useEffect(() => {
    const savedToken = localStorage.getItem('gojim_token');
    const savedUser = localStorage.getItem('gojim_user');
    const lastActivity = localStorage.getItem('gojim_last_activity');
    if (savedToken && savedUser) {
      const now = Date.now();
      const oneHour = 3600000;
      if (lastActivity && (now - parseInt(lastActivity, 10) > oneHour)) {
        localStorage.removeItem('gojim_token');
        localStorage.removeItem('gojim_user');
        localStorage.removeItem('gojim_last_activity');
        setToken(null);
        setUser(null);
      } else {
        setToken(savedToken);
        setUser(JSON.parse(savedUser));
        localStorage.setItem('gojim_last_activity', now.toString());
      }
    }
    setLoading(false);
  }, []);

  // Automatic inactivity logout (1 hour of no movement in the system)
  useEffect(() => {
    if (!token) return;

    let timeoutId;
    let lastStorageWrite = 0;

    const resetInactivityTimer = (updateStorage = true) => {
      if (timeoutId) clearTimeout(timeoutId);
      
      const now = Date.now();
      if (updateStorage && (now - lastStorageWrite > 10000)) {
        localStorage.setItem('gojim_last_activity', now.toString());
        lastStorageWrite = now;
      }

      // Set timeout for 1 hour (3,600,000 milliseconds)
      timeoutId = setTimeout(() => {
        console.log('Session expired due to 1 hour of inactivity');
        logout();
      }, 3600000); 
    };

    // Track user movements/interactions in the window
    const events = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'];
    
    // Initialize timer on load
    resetInactivityTimer(true);

    const handleInteraction = () => {
      resetInactivityTimer(true);
    };

    // Attach interaction event listeners
    events.forEach(event => {
      window.addEventListener(event, handleInteraction);
    });

    // Synchronize inactivity and logout across multiple tabs
    const handleStorageChange = (e) => {
      if (e.key === 'gojim_last_activity' && e.newValue) {
        resetInactivityTimer(false);
      } else if (e.key === 'gojim_token' && !e.newValue) {
        logout();
      }
    };
    window.addEventListener('storage', handleStorageChange);

    // Cleanup listeners and clear timer on logout or token changes
    return () => {
      if (timeoutId) clearTimeout(timeoutId);
      events.forEach(event => {
        window.removeEventListener(event, handleInteraction);
      });
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [token, logout]);

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, logout, updateUser, isAuthenticated: !!token }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
