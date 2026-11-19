import React, { createContext, useContext, useState, useEffect } from 'react';
import { api, setStoredToken, getStoredToken } from '../services/apiClient';

const AuthContext = createContext(null);

export const DEMO_ACCOUNTS = {
  HR_ADMIN: {
    id: 'ADM-001',
    name: 'Alex Morgan',
    email: 'kumarabhinandan1307@gmail.com',
    password: 'Admin@123',
    role: 'HR_ADMIN',
    roleLabel: 'HR Administrator',
    department: 'People Operations',
    title: 'Head of Human Resources',
    avatar: '',
  },
  EMPLOYEE: {
    id: 'EMP-006',
    name: 'Jordan Lee',
    email: 'employee1@visartech.demo',
    password: 'Employee@123',
    role: 'EMPLOYEE',
    roleLabel: 'Employee',
    department: 'Engineering',
    title: 'Full Stack Software Engineer',
    avatar: '',
  },
};

const SESSION_STORAGE_KEY = 'visartech_people_demo_session';
const isDemoModeEnabled = import.meta.env?.VITE_ENABLE_DEMO_MODE === 'true';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const stored = sessionStorage.getItem(SESSION_STORAGE_KEY);
      if (!stored) return null;
      const parsed = JSON.parse(stored);
      // In production (demo mode disabled), never restore an unauthenticated local session without a valid token
      if (!isDemoModeEnabled && !getStoredToken()) {
        sessionStorage.removeItem(SESSION_STORAGE_KEY);
        return null;
      }
      return parsed;
    } catch {
      return null;
    }
  });
  const [isLoading, setIsLoading] = useState(false);

  // Sync state to sessionStorage
  useEffect(() => {
    try {
      if (user) {
        // Do not store password in storage
        const safeUser = { ...user };
        delete safeUser.password;
        sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(safeUser));
      } else {
        sessionStorage.removeItem(SESSION_STORAGE_KEY);
      }
    } catch (err) {
      console.error('Session storage sync error:', err);
    }
  }, [user]);

  // On initial mount: Verify stored JWT token against backend /api/auth/me
  useEffect(() => {
    const restoreSession = async () => {
      const token = getStoredToken();
      if (!token) {
        if (!isDemoModeEnabled) {
          sessionStorage.removeItem(SESSION_STORAGE_KEY);
          setUser(null);
        }
        return;
      }

      try {
        const res = await api.get('/auth/me');
        if (res.success && res.user) {
          const backendUser = res.user;
          const refreshedUser = {
            id: backendUser.employeeId,
            employeeId: backendUser.employeeId,
            name: `${backendUser.firstName} ${backendUser.lastName}`,
            firstName: backendUser.firstName,
            lastName: backendUser.lastName,
            email: backendUser.email,
            role: backendUser.role,
            roleLabel: backendUser.role === 'HR_ADMIN' ? 'HR Administrator' : 'Employee',
            department: backendUser.department,
            title: backendUser.jobTitle,
            jobTitle: backendUser.jobTitle,
            avatar: '',
            isBackendAuthenticated: true,
          };
          setUser(refreshedUser);
        } else if (res.status === 401) {
          // Token expired or invalid on server - clear session
          setStoredToken(null);
          setUser(null);
          sessionStorage.removeItem(SESSION_STORAGE_KEY);
        }
      } catch (err) {
        console.warn('Could not reach backend /auth/me to refresh session:', err);
      }
    };

    restoreSession();
  }, []);

  // Login Handler (Backend API first, with graceful offline demo fallback ONLY when enabled)
  const login = async (identifier, password) => {
    setIsLoading(true);

    const rawIdentifier = (identifier || '').trim();
    const normalizedEmail = rawIdentifier.toLowerCase();
    const cleanEmpId = rawIdentifier.toUpperCase();

    // 1. Attempt Real Backend API Authentication
    let apiErrorMsg = null;
    let isTimeout = false;

    try {
      const apiRes = await api.post('/auth/login', {
        identifier: rawIdentifier,
        loginId: rawIdentifier,
        email: normalizedEmail,
        password,
      });

      if (apiRes.success && apiRes.token) {
        setStoredToken(apiRes.token);

        const backendUser = apiRes.user;
        const authenticatedUser = {
          id: backendUser.employeeId,
          employeeId: backendUser.employeeId,
          name: `${backendUser.firstName} ${backendUser.lastName}`,
          firstName: backendUser.firstName,
          lastName: backendUser.lastName,
          email: backendUser.email,
          role: backendUser.role,
          roleLabel: backendUser.role === 'HR_ADMIN' ? 'HR Administrator' : 'Employee',
          department: backendUser.department,
          title: backendUser.jobTitle,
          jobTitle: backendUser.jobTitle,
          avatar: '',
          isBackendAuthenticated: true,
        };

        setUser(authenticatedUser);
        setIsLoading(false);
        return {
          success: true,
          user: authenticatedUser,
          isBackend: true,
        };
      }

      // If backend responded with rejection (e.g. 401 invalid credentials, 400 validation error)
      if (!apiRes.isOffline) {
        setIsLoading(false);
        return {
          success: false,
          message: apiRes.message || 'Invalid credentials. Please check your login details and password.',
        };
      }

      // Backend was offline or timed out
      isTimeout = apiRes.isTimeout || apiRes.message?.toLowerCase().includes('timed out');
      apiErrorMsg = isTimeout
        ? 'Server is waking up from sleep mode. Please wait a few moments and try again.'
        : (apiRes.message || 'Backend API is unreachable. Please verify network connectivity.');
    } catch (err) {
      console.warn('Backend login attempt encountered an exception:', err);
      isTimeout = err.name === 'AbortError' || err.message?.toLowerCase().includes('timed out');
      apiErrorMsg = isTimeout
        ? 'Server is waking up from sleep mode. Please wait a few moments and try again.'
        : 'Backend server connection error. Please try again.';
    }

    // 2. Offline Fallback to Demo Accounts ONLY if explicitly enabled
    if (!isDemoModeEnabled) {
      setIsLoading(false);
      return {
        success: false,
        message: apiErrorMsg || 'Backend service is unavailable. Please try again in a few moments.',
      };
    }

    await new Promise((resolve) => setTimeout(resolve, 300));

    const matchedAccount = Object.values(DEMO_ACCOUNTS).find(
      (acc) =>
        acc.email.toLowerCase() === normalizedEmail ||
        acc.id.toUpperCase() === cleanEmpId
    );

    if (!matchedAccount) {
      setIsLoading(false);
      return {
        success: false,
        message: 'Invalid credentials. Please check your login details and password.',
      };
    }

    if (matchedAccount.password !== password) {
      setIsLoading(false);
      return {
        success: false,
        message: 'Invalid credentials. Please check your login details and password.',
      };
    }

    // Success via demo account
    const authenticatedUser = { ...matchedAccount };
    delete authenticatedUser.password;

    setUser(authenticatedUser);
    setIsLoading(false);

    return {
      success: true,
      user: authenticatedUser,
      isDemo: true,
    };
  };

  // Demo Direct Login via role (One-click)
  const loginAsRole = async (roleKey) => {
    const account = DEMO_ACCOUNTS[roleKey];
    if (account) {
      return await login(account.email, account.password);
    }
    return { success: false, message: 'Invalid role key.' };
  };

  // Logout Handler
  const logout = () => {
    setUser(null);
    setStoredToken(null);
    api.post('/auth/logout').catch(() => {});
    try {
      sessionStorage.removeItem(SESSION_STORAGE_KEY);
    } catch (err) {
      console.error('Error clearing session:', err);
    }
  };

  const value = {
    user,
    isAuthenticated: !!user,
    isLoading,
    login,
    loginAsRole,
    logout,
    demoAccounts: DEMO_ACCOUNTS,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
