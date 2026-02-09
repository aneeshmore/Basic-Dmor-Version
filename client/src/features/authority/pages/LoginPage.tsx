import { useState, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import logger from '@/utils/logger';
import { routeRegistry } from '@/config/routeRegistry';
import { getFirstAccessibleRoute } from '@/utils/navigationUtils';
import { Eye, EyeOff, Lock, User, AlertCircle, ArrowRight, CheckCircle2 } from 'lucide-react';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    if (!username || !password) {
      setError('Please enter both username and password');
      return;
    }

    setLoading(true);

    try {
      const result = await login({ username, password });

      if (result.success && result.user) {
        console.log('User Role:', result.user.Role);
        // Role-based redirection
        switch (result.user.Role) {
          case 'SuperAdmin':
            navigate('/dashboard/admin');
            break;
          case 'Admin':
            navigate('/reports/salesperson-revenue');
            break;
          case 'Account':
            navigate('/operations/admin-accounts');
            break;
          case 'Sales Person':
            navigate('/operations/create-order');
            break;
          case 'Production Manager':
            navigate('/operations/pm-dashboard');
            break;
          default:
            console.log('No specific redirect for role:', result.user.Role);
            navigate('/dashboard/admin');
        }
      } else {
        setError(result.message || 'Invalid credentials');
      }
    } catch (err: any) {
      logger.error('Login error', err);
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-white dark:bg-gray-950 font-sans">
      {/* Left Panel - Hero Section */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-gray-950">
        <div className="absolute inset-0 bg-blue-950/20 mix-blend-overlay z-10" />
        <img
          src="/professional-bg.png"
          alt="Professional Background"
          className="absolute inset-0 w-full h-full object-cover opacity-60"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-gray-950 via-gray-950/70 to-transparent z-20" />

        <div className="relative z-30 flex flex-col items-center justify-center p-16 text-white h-full w-full text-center">
          <div className="max-w-xl flex flex-col items-center">
            {/* Logo and Brand */}
            <div className="mb-8 flex flex-col items-center">
              <div className="flex h-32 w-32 items-center justify-center rounded-3xl bg-white p-4 shadow-[0_0_50px_rgba(59,130,246,0.25)] mb-10 animate-fade-in border border-white/20 transition-transform hover:scale-105 duration-300 overflow-hidden">
                <img
                  src="/morex-logo.png"
                  alt="Morex Logo"
                  className="w-full h-full object-contain"
                />
              </div>
              <h1 className="text-6xl font-[900] tracking-tighter mb-4 leading-tight">
                <span className="text-white drop-shadow-[0_0_15px_rgba(59,130,246,0.5)]">
                  Morex Technologies
                </span>
                <span className="block text-blue-500 text-4xl mt-1 font-bold">
                  Operation Management System
                </span>
              </h1>
            </div>
          </div>
        </div>
      </div>

      {/* Right Panel - Login Form */}
      <div className="flex-1 flex flex-col justify-center px-4 md:px-16 lg:px-28 bg-white dark:bg-gray-950 relative">
        <div className="max-w-md w-full mx-auto">
          {/* Mobile Logo Branding */}
          <div className="lg:hidden mb-12 flex flex-col items-center">
            <img src="/dmor-logo.png" alt="DMOR Logo" className="h-20 w-auto mb-4" />
            <h2 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white uppercase text-center">
              DMOR Paints
              <br />
              <span className="text-sm font-medium text-gray-500">Operation Management System</span>
            </h2>
          </div>

          <div className="mb-10 animate-fade-in">
            <h2 className="text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight mb-2">
              Sign In
            </h2>
            <p className="text-gray-500 dark:text-gray-400 font-medium">Enterprise Access Portal</p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800 rounded-xl flex items-center gap-3 animate-fade-in">
              <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />
              <p className="text-sm text-red-700 dark:text-red-400 font-medium">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-8">
            <div className="space-y-1.5">
              <label
                htmlFor="username"
                className="block text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400"
              >
                Username
              </label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <User
                    size={18}
                    className="text-gray-400 group-focus-within:text-blue-600 transition-colors"
                  />
                </div>
                <input
                  id="username"
                  type="text"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  className="block w-full pl-11 pr-4 py-4 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-600/10 focus:border-blue-600 focus:bg-white dark:focus:bg-gray-800 dark:focus:text-white transition-all duration-200"
                  placeholder="Enter your username"
                  disabled={loading}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="password"
                className="block text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400"
              >
                Password
              </label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Lock
                    size={18}
                    className="text-gray-400 group-focus-within:text-blue-600 transition-colors"
                  />
                </div>
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="block w-full pl-11 pr-11 py-4 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-600/10 focus:border-blue-600 focus:bg-white dark:focus:bg-gray-800 dark:focus:text-white transition-all duration-200"
                  placeholder="Enter your password"
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-gray-600 transition-colors focus:outline-none"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center py-4 px-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg shadow-blue-600/20 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 dark:focus:ring-offset-gray-950 disabled:opacity-70 transition-all transform active:scale-[0.99]"
            >
              {loading ? (
                <>
                  <svg
                    className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  Authenticating...
                </>
              ) : (
                <>
                  Sign In{' '}
                  <ArrowRight
                    size={18}
                    className="ml-2 group-hover:translate-x-1 transition-transform"
                  />
                </>
              )}
            </button>
          </form>

          <p className="mt-12 text-center text-xs text-gray-400 font-bold uppercase tracking-widest leading-relaxed">
            Authorized Personnel Only
          </p>
        </div>

        <div className="absolute bottom-10 left-0 right-0 text-center text-[10px] font-bold text-gray-300 uppercase tracking-[0.2em]">
          Powered by Morex Technologies OMS
        </div>
      </div>
    </div>
  );
}
