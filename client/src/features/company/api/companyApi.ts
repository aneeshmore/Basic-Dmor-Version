import { apiClient } from '@/api/client';
import { CompanyInfo } from '../types';

export const companyApi = {
    get: async () => {
        return apiClient.get<{ data: CompanyInfo }>('/company');
    },
    update: async (data: CompanyInfo) => {
        return apiClient.put<{ data: CompanyInfo }>('/company', data);
    },
};
