import { RouteNode } from '@/config/routeRegistry';
import { AuthUser } from '@/types';

/**
 * Checks if a user has permission for a specific module
 */
export const hasUserPermission = (user: AuthUser, moduleName: string): boolean => {
    // Admin/SuperAdmin has all permissions
    if (user.Role === 'Admin' || user.Role === 'SuperAdmin') return true;

    if (!user.permissions || user.permissions.length === 0) return false;

    const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
    const normalizedTarget = normalize(moduleName);

    const permission = user.permissions.find(p => normalize(p.PageName) === normalizedTarget);

    if (!permission) return false;

    return Array.isArray(permission.grantedApis) && permission.grantedApis.length > 0;
};

/**
 * Finds the first accessible route path for a user from the registry.
 * Traverses the route tree in order and returns the first leaf node (or clickable parent)
 * that is visible in the sidebar and accessible to the user.
 */
export const getFirstAccessibleRoute = (user: AuthUser, routes: RouteNode[]): string => {
    if (!user) return '/login';

    const traverse = (nodes: RouteNode[]): string | null => {
        for (const node of nodes) {
            // Skip items hidden from sidebar (unless it's the specific exception like dashboard which might be hidden but valid? 
            // User said "first page of the sidebar", so strict sidebar visibility is safe).
            if (node.showInSidebar === false) continue;

            const hasChildren = node.children && node.children.length > 0;

            // Check permission for this node if it exists
            const hasNodePermission = node.permission
                ? hasUserPermission(user, node.permission.module)
                : true; // If no permission required, it's accessible (unless it's a parent with no accessible children)

            if (hasChildren) {
                // Recursively check children
                const childPath = traverse(node.children!);
                if (childPath) return childPath;

                // If no children accessible, and parent requires specific permission that user doesn't have, skip.
                // If parent has permission and user has it, but no children, 'Sidebar.tsx' hides it.
                // So effectively, for a parent to be a redirect target, it usually needs accessible children 
                // OR be a standalone page that happens to have children (rare in this app's sidebar logic).
                // We'll trust that if children didn't return a path, this branch is dead end.
                continue;
            }

            // Leaf node logic
            if (hasNodePermission) {
                return node.path;
            }
        }
        return null;
    };

    // Try to find a valid route
    const path = traverse(routes);

    // Default fallback if nothing found (shouldn't happen for valid users)
    return path || '/dashboard/admin';
};
