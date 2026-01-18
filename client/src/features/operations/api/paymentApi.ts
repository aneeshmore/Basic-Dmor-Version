
import { apiClient } from '@/api/client';

export interface PaymentInput {
    customerId: number;
    amount: number;
    paymentMode: string;
    referenceNo?: string;
    notes?: string;
    paymentDate?: string;
}

export const paymentApi = {
    create: (data: any) => apiClient.post('/payments', data),
    update: (id: number, data: any) => apiClient.put(`/payments/${id}`, data),
    getLedger: (customerId: number) => apiClient.get(`/payments/ledger/${customerId}`),
    getBalance: (customerId: number) => apiClient.get(`/payments/balance/${customerId}`),
    getReport: (params: any) => apiClient.get('/payments/reports/payments', { params }),
};
