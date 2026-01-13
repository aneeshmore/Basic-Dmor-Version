import axios, { AxiosError } from 'axios';
import logger from '@/utils/logger';
import { showToast } from '@/utils/toast';
import { loadingStore } from '@/utils/loadingStore';

// Extend Axios config to support custom toast options
declare module 'axios' {
  export interface AxiosRequestConfig {
    skipErrorToast?: boolean;
    successMessage?: string;
  }
}

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Optional request interceptor (auth/logging/idempotency)
apiClient.interceptors.request.use(
  config => {
    loadingStore.inc();

    // Add idempotency key for POST requests (prevents duplicate operations)
    if (config.method?.toLowerCase() === 'post' && !config.headers['X-Idempotency-Key']) {
      config.headers['X-Idempotency-Key'] = crypto.randomUUID();
    }

    logger.info(`[API] ${config.method?.toUpperCase()} ${config.url}`);
    return config;
  },
  error => {
    loadingStore.dec();
    return Promise.reject(error);
  }
);

// Response interceptor for normalized error handling
apiClient.interceptors.response.use(
  response => {
    loadingStore.dec();
    logger.debug(`[API] Response:`, response.data);

    // Auto-show success toast if configured
    if (response.config.successMessage) {
      showToast.success(response.config.successMessage);
    }

    return response;
  },
  (
    error: AxiosError<{
      message?: string;
      errors?: Array<{ field: string; message: string }>;
    }>
  ) => {
    loadingStore.dec();
    let errorMessage = 'An unexpected error occurred';

    if (error.response) {
      const status = error.response.status;
      const data = error.response.data;
      switch (status) {
        case 400:
          errorMessage = data?.message || 'Invalid request';
          if ((data as any)?.errors) {
            errorMessage += ': ' + (data as any).errors.map((e: any) => e.message).join(', ');
          }
          break;
        case 401:
          errorMessage = 'Unauthorized - Please login';
          // Clear auth tokens and redirect to login
          localStorage.removeItem('morex_auth_token');
          localStorage.removeItem('morex_user');
          // Redirect to login after a short delay to allow toast to show
          setTimeout(() => {
            window.location.href = '/login';
          }, 1500);
          break;
        case 403:
          errorMessage = data?.message || "Forbidden - You don't have permission";
          break;
        case 404:
          errorMessage = data?.message || 'Resource not found';
          break;
        case 409:
          errorMessage = data?.message || 'Resource already exists';
          break;
        case 429:
          errorMessage = 'Too many requests - Please try again later';
          break;
        case 500:
          errorMessage = 'Server error - Please try again later';
          break;
        default:
          errorMessage = data?.message || `Error: ${status}`;
      }
      logger.error('[API Error]', { status, message: errorMessage, data });
    } else if (error.request) {
      errorMessage = 'Network error - Please check your connection';
      logger.error('[Network Error]', error.request);
    } else {
      errorMessage = error.message || errorMessage;
      logger.error('[Error]', error.message);
    }

    // Auto-show error toast unless skipped
    if (!error.config?.skipErrorToast) {
      showToast.error(errorMessage, 'singleton-error-toast');
    }

    return Promise.reject({
      message: errorMessage,
      status: error.response?.status,
      data: error.response?.data,
    });
  }
);

export default apiClient;
