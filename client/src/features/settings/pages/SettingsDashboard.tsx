import React from 'react';
import {
  Briefcase,
  Lock,
  KeyRound,
  ArrowRightLeft,
  Shield,
  Users,
  AlertCircle,
  LucideIcon,
  Crown,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { routeRegistry, findRouteByPath, RouteNode } from '@/config/routeRegistry';
import { isBasicPlan } from '@/utils/planAccess';

// Metadata for styling and descriptions that aren't in the registry
const ROUTE_METADATA: Record<
  string,
  { description: string; iconBg: string; iconColor: string; icon?: LucideIcon }
> = {
  'permission-management': {
    description: 'Manage system permissions',
    iconBg: 'bg-violet-50',
    iconColor: 'text-violet-600',
    icon: Shield,
  },
  roles: {
    // The id for role management might be 'roles' or similar if it existed, but it was deleted. Keeping for safety if re-added.
    description: 'Manage user roles and access',
    iconBg: 'bg-indigo-50',
    iconColor: 'text-indigo-600',
    icon: Users,
  },
  'lock-user': {
    description: 'Lock or unlock user accounts',
    iconBg: 'bg-red-50',
    iconColor: 'text-red-600',
    icon: Lock,
  },
  'password-reset': {
    description: 'Force reset user passwords',
    iconBg: 'bg-blue-50',
    iconColor: 'text-blue-600',
    icon: KeyRound,
  },
  'customer-transfer': {
    description: 'Transfer customers between accounts',
    iconBg: 'bg-green-50',
    iconColor: 'text-green-600',
    icon: ArrowRightLeft,
  },
  'notification-rules': {
    description: 'Configure notification rules',
    iconBg: 'bg-amber-50',
    iconColor: 'text-amber-600',
  },
};

const SettingsDashboard = () => {
  const navigate = useNavigate();
  const { hasPermission, user } = useAuth();
  const basicUser = isBasicPlan(user);

  // Find the settings route group
  const settingsRoute = findRouteByPath(routeRegistry, '/settings');

  // Get children or empty array
  const settingRoutes = settingsRoute?.children || [];

  // Filter based on permissions
  const visibleRoutes = settingRoutes.filter((route: RouteNode) => {
    const isProOnlyInBasic = basicUser && route.proOnly === true;
    if (isProOnlyInBasic) return true;

    // If no permission defined, show it (or should we hide it? safely show if public, but Settings usually restricted)
    // Actually, usually if no permission, it's public.
    // But check hasPermission if permission exists.
    if (!route.permission) return true;
    return hasPermission(route.permission.module, 'view');
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">Settings</h1>
          <p className="text-[var(--text-secondary)] mt-1">
            Configure system preferences, user access, and application settings.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {visibleRoutes.map((route: RouteNode) => {
          const meta = ROUTE_METADATA[route.id] || {
            description: 'Manage setting',
            iconBg: 'bg-gray-50',
            iconColor: 'text-gray-600',
            icon: AlertCircle,
          };

          // Use icon from registry if available, else from meta, else default
          const Icon = route.icon || meta.icon || AlertCircle;
          const isRestricted = basicUser && route.proOnly === true;

          return (
            <div
              key={route.id}
              className={`card p-6 group relative ${isRestricted ? 'opacity-70 cursor-not-allowed' : 'hover-lift cursor-pointer'
                }`}
              onClick={() => !isRestricted && navigate(route.path)}
            >
              {isRestricted && (
                <div className="absolute top-3 right-3 inline-flex items-center gap-1 rounded-full border border-amber-300 bg-amber-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-700">
                  <Lock className="h-3 w-3" />
                  Locked
                </div>
              )}
              <div className="flex flex-col h-full">
                <div
                  className={`w-12 h-12 rounded-lg flex items-center justify-center mb-4 ${meta.iconBg} ${meta.iconColor}`}
                >
                  <Icon size={24} />
                </div>

                <h3 className="font-bold text-[var(--text-primary)] mb-2 uppercase text-sm tracking-wide">
                  {route.label}
                </h3>

                <p className="text-sm text-[var(--text-secondary)] flex-grow">{meta.description}</p>
              </div>
            </div>
          );
        })}

        {visibleRoutes.length === 0 && (
          <div className="col-span-full p-8 text-center text-[var(--text-secondary)] border border-dashed border-[var(--border)] rounded-lg">
            No settings available.
          </div>
        )}
      </div>
    </div>
  );
};

export default SettingsDashboard;
