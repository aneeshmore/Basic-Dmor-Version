import { ReactNode, Suspense, useEffect, useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { RoutePermission } from '@/config/routeRegistry';
import { ShieldOff, Loader2 } from 'lucide-react';
import { isBasicPlan } from '@/utils/planAccess';

interface PrivateRouteProps {
  children: ReactNode;
  permission?: RoutePermission;
}

/**
 * Loading spinner for Suspense fallback
 */
function LoadingSpinner() {
  return (
    <div className="min-h-[400px] flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--primary)]"></div>
    </div>
  );
}

/**
 * Access Denied - Auto redirects to dashboard
 */
function AccessDenied({ module }: { module?: string }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [countdown, setCountdown] = useState(3);

  // Determine redirect path
  const redirectPath =
    user?.landingPage || `/dashboard/${(user?.Role || 'admin').toLowerCase().replace(/\s+/g, '-')}`;

  useEffect(() => {
    // Countdown timer
    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          navigate(redirectPath, { replace: true });
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [navigate, redirectPath]);

  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center text-center p-8">
      <div className="w-20 h-20 rounded-full bg-red-500/10 flex items-center justify-center mb-6">
        <ShieldOff size={40} className="text-red-500" />
      </div>

      <h1 className="text-2xl font-bold text-[var(--text-primary)] mb-2">Access Denied</h1>

      <p className="text-[var(--text-secondary)] mb-4 max-w-md">
        You don&apos;t have permission to access this page.
        {module && (
          <span className="block mt-2 text-sm">
            Required permission:{' '}
            <code className="bg-[var(--surface)] px-2 py-1 rounded">{module}</code>
          </span>
        )}
      </p>

      <div className="flex items-center gap-2 text-[var(--text-secondary)]">
        <Loader2 size={16} className="animate-spin" />
        <span>Redirecting to your dashboard in {countdown}...</span>
      </div>
    </div>
  );
}

/**
 * PrivateRoute Component
 *
 * Wraps route content with authentication and authorization checks.
 *
 * Usage:
 * <PrivateRoute permission={{ module: 'orders', actions: ['view'] }}>
 *   <OrdersPage />
 * </PrivateRoute>
 */
export function PrivateRoute({ children, permission }: PrivateRouteProps) {
  const { isAuthenticated, loading, hasPermission, user } = useAuth();
  const location = useLocation();
  const basicUser = isBasicPlan(user);

  const BASIC_BLOCKED_PATHS = new Set([
    '/masters/employees',
    '/masters/customer-types',
    '/masters/departments',
    '/masters/double-development',
    '/reports/stock',
    '/reports/low-stock',
  ]);

  // Show loading spinner while checking auth state
  if (loading) {
    return <LoadingSpinner />;
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (basicUser && BASIC_BLOCKED_PATHS.has(location.pathname)) {
    return <AccessDenied module="pro-plan-required" />;
  }

  // Check permission if specified
  if (permission) {
    // Admin bypass - Admin has all permissions
    if (user?.Role === 'Admin' || user?.Role === 'SuperAdmin') {
      return <Suspense fallback={<LoadingSpinner />}>{children}</Suspense>;
    }

    // Check if user has view permission for the module
    const hasAccess = hasPermission(permission.module, 'view');

    if (!hasAccess) {
      return <AccessDenied module={permission.module} />;
    }
  }

  return <Suspense fallback={<LoadingSpinner />}>{children}</Suspense>;
}

/**
 * withPermission HOC
 *
 * Higher-order component for wrapping components with permission checks.
 * Useful for conditional rendering of buttons, sections, etc.
 *
 * Usage:
 * const ProtectedButton = withPermission(Button, { module: 'orders', actions: ['create'] });
 */
export function withPermission<P extends object>(
  Component: React.ComponentType<P>,
  permission: RoutePermission
) {
  return function ProtectedComponent(props: P) {
    const { hasPermission, user } = useAuth();

    // Admin bypass
    if (user?.Role === 'Admin' || user?.Role === 'SuperAdmin') {
      return <Component {...props} />;
    }

    const hasAccess = hasPermission(permission.module, 'view');

    if (!hasAccess) {
      return null;
    }

    return <Component {...props} />;
  };
}

export default PrivateRoute;
