import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';

export const DashboardRedirect: React.FC = () => {
  const { user, loading, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (loading) return; // Wait for auth to finish loading

    if (!isAuthenticated || !user) {
      // Not logged in - redirect to login
      navigate('/login', { replace: true });
      return;
    }

    // Role-based redirection - simplified to match Login logic
    if (user.Role) {
      switch (user.Role) {
        case 'SuperAdmin':
          navigate('/dashboard/admin', { replace: true });
          break;
        case 'Admin':
          navigate('/reports/salesperson-revenue', { replace: true });
          break;
        case 'Account':
          navigate('/operations/admin-accounts', { replace: true });
          break;
        case 'Sales Person':
          navigate('/operations/create-order', { replace: true });
          break;
        case 'Production Manager':
          navigate('/operations/pm-dashboard', { replace: true });
          break;
        default:
          console.log('No specific redirect for role, going to admin dashboard:', user.Role);
          navigate('/dashboard/admin', { replace: true });
      }
    } else {
      navigate('/dashboard/admin', { replace: true });
    }
  }, [user, loading, isAuthenticated, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--background)]">
      <div className="text-center">
        <Loader2 className="h-12 w-12 animate-spin text-[var(--primary)] mx-auto mb-4" />
        <p className="text-[var(--text-secondary)]">Redirecting...</p>
      </div>
    </div>
  );
};
