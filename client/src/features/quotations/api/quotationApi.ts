import { apiClient } from '@/api/client';

export interface CreateQuotationPayload {
  customerId: number;
  buyerName: string;
  buyerAddress: string;
  paymentTerms: string;
  deliveryTerms: string;
  items: {
    productId: number;
    description: string;
    quantity: number;
    rate: number;
    discount: number;
  }[];
  remarks?: string;
}

export interface QuotationRecord {
  quotationId: number;
  quotationNo: string;
  quotationDate: string;
  companyName: string;
  buyerName: string;
  customerId?: number;
  content: any;
  status: 'Pending' | 'Approved' | 'Rejected' | 'Converted';
  rejectionRemark?: string;
  createdBy?: number;
  createdAt: string;
  updatedAt: string;
  salesPersonName?: string;
}

export const quotationApi = {
  create: (data: CreateQuotationPayload | any) => {
    return apiClient.post<{ success: boolean; data: QuotationRecord }>('/quotations', {
      quotationNo: data.quotationNo,
      quotationDate: data.date || data.quotationDate,
      companyName: data.companyName,
      buyerName: data.buyerName,
      customerId: data.customerId,
      content: data,
    });
  },

  getAll: () => {
    return apiClient.get<{ success: boolean; data: QuotationRecord[] }>('/quotations');
  },

  getByCustomer: (customerId: number) => {
    return apiClient.get<{ success: boolean; data: QuotationRecord[] }>(
      `/quotations?customerId=${customerId}`
    );
  },

  updateStatus: (id: number, status: string, rejectionRemark?: string) => {
    return apiClient.patch<{ success: boolean; data: QuotationRecord }>(
      `/quotations/${id}/status`,
      {
        status,
        rejectionRemark,
      }
    );
  },

  approve: (id: number) => {
    return apiClient.post<{ success: boolean; data: QuotationRecord }>(`/quotations/${id}/approve`);
  },

  reject: (id: number, remark: string) => {
    return apiClient.post<{ success: boolean; data: QuotationRecord }>(`/quotations/${id}/reject`, {
      remark,
    });
  },

  convertOrder: (id: number) => {
    return apiClient.post<{ success: boolean; data: any }>(`/quotations/${id}/convert`);
  },

  update: (id: number, data: any) => {
    return apiClient.put<{ success: boolean; data: QuotationRecord }>(`/quotations/${id}`, {
      quotationNo: data.quotationNo,
      quotationDate: data.date || data.quotationDate,
      companyName: data.companyName,
      buyerName: data.buyerName,
      customerId: data.customerId,
      content: data,
    });
  },
};
