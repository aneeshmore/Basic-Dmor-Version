import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { AuthUser, LoginCredentials } from '@/types';
import apiClient from '@/api/client';
import logger from '@/utils/logger';
import { authApi } from '@/features/authority/api/authApi';

interface AuthContextType {
  user: AuthUser | null;
  token: string | null;
  loading: boolean;
  login: (
    credentials: LoginCredentials
  ) => Promise<{ success: boolean; message?: string; landingPage?: string; user?: AuthUser }>;
  logout: () => void;
  hasPermission: (
    moduleName: string,
    action: 'create' | 'modify' | 'view' | 'lock' | 'delete' | 'export'
  ) => boolean;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const TOKEN_KEY = 'morex_auth_token';
const USER_KEY = 'morex_user';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Initialize with server-side validation
  useEffect(() => {
    const validateAndRestore = async () => {
      const storedToken = localStorage.getItem(TOKEN_KEY);

      if (!storedToken) {
        setLoading(false);
        return;
      }

      // Set token in axios client first
      apiClient.defaults.headers.common['Authorization'] = `Bearer ${storedToken}`;

      try {
        // Validate token with server by calling /auth/me
        const response = await authApi.getCurrentUser();

        if (response.success && response.data) {
          // Token is valid - use fresh user data from server
          const userData: AuthUser = {
            EmployeeID: response.data.EmployeeID,
            FirstName: response.data.FirstName,
            LastName: response.data.LastName,
            Username: response.data.Username,
            Role: response.data.Role,
            planType: response.data.planType,
            landingPage: response.data.landingPage,
            permissions: response.data.permissions || [],
            // Dealer specific fields
            companyName: response.data.companyName,
            address: response.data.address,
            gstin: response.data.gstin,
            mobileNo: response.data.mobileNo,
          };

          setToken(storedToken);
          setUser(userData);

          // Update localStorage with fresh data
          localStorage.setItem(USER_KEY, JSON.stringify(userData));

          logger.info('Token validated with server, user restored');
        } else {
          // Token invalid - clear everything
          throw new Error('Invalid token');
        }
      } catch {
        // Token validation failed - clear stored data
        logger.warn('Token validation failed, clearing session');
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(USER_KEY);
        delete apiClient.defaults.headers.common['Authorization'];
        setToken(null);
        setUser(null);
      }

      setLoading(false);
    };

    validateAndRestore();
  }, []);

  const login = async (credentials: LoginCredentials) => {
    try {
      const data = await authApi.login(credentials);

      if (data.success && data.token && data.user) {
        setToken(data.token);
        setUser(data.user);

        // Store in localStorage
        localStorage.setItem(TOKEN_KEY, data.token);
        localStorage.setItem(USER_KEY, JSON.stringify(data.user));

        // Set token in axios headers
        apiClient.defaults.headers.common['Authorization'] = `Bearer ${data.token}`;

        return {
          success: true,
          landingPage: data.user.landingPage || '/dashboard',
          user: data.user,
        };
      } else {
        return { success: false, message: data.message || 'Login failed' };
      }
    } catch (error: unknown) {
      logger.error('Login error', error);
      return {
        success: false,
        message: 'An unexpected error occurred',
      };
    }
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    delete apiClient.defaults.headers.common['Authorization'];
    window.location.href = '/login';
  };

  // Permission check - returns true if user has access to a page/module
  const hasPermission = (
    moduleName: string,
    _action: 'create' | 'modify' | 'view' | 'lock' | 'delete' | 'export' = 'view'
  ): boolean => {
    // Admin/SuperAdmin has all permissions
    if (user?.Role === 'Admin' || user?.Role === 'SuperAdmin') return true;

    if (!user?.permissions || user.permissions.length === 0) return false;

    // Find permission by module name (case-insensitive & separator-insensitive)
    const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
    const normalizedTarget = normalize(moduleName);

    const permission = user.permissions.find(p => normalize(p.PageName) === normalizedTarget);

    // If permission exists in user's list, they have access
    // (Server already filters out permissions with empty grantedApis)
    if (!permission) return false;

    // Additional check: ensure grantedApis has at least one entry
    return Array.isArray(permission.grantedApis) && permission.grantedApis.length > 0;
  };

  const value = {
    user,
    token,
    loading,
    login,
    logout,
    hasPermission,
    isAuthenticated: !!user && !!token,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
