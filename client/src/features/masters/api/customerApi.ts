import apiClient from '@/api/client';
import { Customer } from '../types';

const API_PREFIX = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1';

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export const customerApi = {
  getAll: async (): Promise<ApiResponse<Customer[]>> => {
    try {
      const { data } = await apiClient.get(`${API_PREFIX}/masters/customers`);
      return { success: true, data: data.data ?? data };
    } catch (err: any) {
      return {
        success: false,
        error: err?.response?.data?.error || err?.message || 'Failed to load customers',
      };
    }
  },

  getActive: async (): Promise<ApiResponse<Customer[]>> => {
    try {
      const { data } = await apiClient.get(`${API_PREFIX}/masters/customers/active-list`);
      return { success: true, data: data.data ?? data };
    } catch (err: any) {
      return {
        success: false,
        error: err?.response?.data?.error || err?.message || 'Failed to load active customers',
      };
    }
  },

  getMyCustomers: async (): Promise<ApiResponse<Customer[]>> => {
    try {
      const { data } = await apiClient.get(`${API_PREFIX}/masters/customers/my-customers`);
      return { success: true, data: data.data ?? data };
    } catch (err: any) {
      return {
        success: false,
        error: err?.response?.data?.error || err?.message || 'Failed to load my customers',
      };
    }
  },

  create: async (customer: Omit<Customer, 'CustomerID'>): Promise<ApiResponse<Customer>> => {
    try {
      const { data } = await apiClient.post(`${API_PREFIX}/masters/customers`, customer);
      return { success: true, data: data.data ?? data };
    } catch (err: any) {
      return {
        success: false,
        error: err?.response?.data?.error || err?.message || 'Failed to create customer',
      };
    }
  },

  update: async (id: number, customer: Customer): Promise<ApiResponse<Customer>> => {
    try {
      const { data } = await apiClient.put(`${API_PREFIX}/masters/customers/${id}`, customer);
      return { success: true, data: data.data ?? data };
    } catch (err: any) {
      return {
        success: false,
        error: err?.response?.data?.error || err?.message || 'Failed to update customer',
      };
    }
  },

  delete: async (id: number): Promise<ApiResponse<void>> => {
    try {
      await apiClient.delete(`${API_PREFIX}/masters/customers/${id}`);
      return { success: true };
    } catch (err: any) {
      return {
        success: false,
        error: err?.response?.data?.error || err?.message || 'Failed to delete customer',
      };
    }
  },
};
