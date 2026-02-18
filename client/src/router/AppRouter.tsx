/**
 * App Router - Uses Route Registry
 *
 * Automatically generates routes from routeRegistry.
 * Applies PrivateRoute wrapper with permission checks.
 */

import { Routes, Route, Navigate } from 'react-router-dom';
import { Suspense, useMemo } from 'react';
import { routeRegistry, flattenRoutes } from '@/config/routeRegistry';
import { PrivateRoute } from '@/components/auth/PrivateRoute';
import { DashboardRedirect } from '@/features/dashboard/components/DashboardRedirect';
import { useAuth } from '@/contexts/AuthContext';
import { isBasicPlan } from '@/utils/planAccess';

/**
 * Loading fallback for lazy-loaded routes
 */
function RouteLoadingFallback() {
  return (
    <div className="min-h-[400px] flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--primary)]"></div>
    </div>
  );
}

/**
  if (!Component && !children?.length) {
    return null;
  }

  // Render route with permission wrapper
  const routeElement = Component ? (
    <PrivateRoute permission={permission}>
      <Component />
    </PrivateRoute>
  ) : null;

  // If there are children, render nested routes
  if (children && children.length > 0) {
    return (
      <Route key={node.id} path={path} element={routeElement}>
        {children.map(child => renderRouteNode(child))}
      </Route>
    );
  }

  // Simple route without children
  return <Route key={node.id} path={path} element={routeElement} />;
}

/**
 * Route Guard for Pro Plan
 */
function RouteGuard({
  children,
  proOnly
}: {
  children: React.ReactElement;
  proOnly?: boolean;
}) {
  const { user } = useAuth();

  if (proOnly && isBasicPlan(user)) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}

/**
 * Main App Router Component
 */
export function AppRouter() {
  // Flatten routes for simpler rendering (no nested Route elements)
  const flatRoutes = useMemo(() => flattenRoutes(routeRegistry), []);

  return (
    <Suspense fallback={<RouteLoadingFallback />}>
      <Routes>
        {/* Root redirect to dashboard */}
        <Route path="/" element={<Navigate to="/dashboard" replace />} />

        {/* Dashboard redirect - handles /dashboard -> /dashboard/{role} */}
        <Route path="/dashboard" element={<DashboardRedirect />} />

        {/* All routes from registry */}
        {flatRoutes.map(route => {
          if (!route.component) return null;

          const Component = route.component;

          return (
            <Route
              key={route.id}
              path={route.path}
              element={
                <RouteGuard proOnly={route.proOnly}>
                  <PrivateRoute permission={route.permission}>
                    <Component />
                  </PrivateRoute>
                </RouteGuard>
              }
            />
          );
        })}

        {/* Fallback for unknown routes - redirect to dashboard which will redirect to role-specific page */}
        <Route path="*" element={<DashboardRedirect />} />
      </Routes>
    </Suspense>
  );
}

export default AppRouter;
