import apiClient from '../../../api/client';

export interface Order {
  orderId: number;
  orderNumber: string;
  customerId: number;
  customerName?: string;
  totalAmount: number;
  orderDate: string;
  status: string;
  expectedDeliveryDate?: string;
  pmRemarks?: string;
}

export interface OrderDetail {
  orderDetailId: number;
  orderId: number;
  productId: number;
  productName?: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export interface InventoryCheckResult {
  productId: number;
  productName: string;
  orderedQuantity: number;
  availableQuantity: number;
  canFulfill: boolean;
  materials: MaterialRequirement[];
  materialsAvailable: boolean;
}

export interface MaterialRequirement {
  materialId: number;
  materialName: string;
  percentage: number;
  requiredQuantity: number;
  availableQuantity: number;
}

export interface Batch {
  batchId: number;
  batchNo: string;
  masterProductId: number;
  masterProductName?: string;
  scheduledDate: string;
  plannedQuantity: number;
  actualQuantity?: number;
  status: string;
  supervisorId?: number;
  supervisorName?: string;
  density?: number;
  waterPercentage?: number;
  viscosity?: number;
  startedAt?: string;
  createdAt?: string;
}

export interface BatchMaterial {
  materialId: number;
  materialName?: string;
  requiredQuantity: number;
  requiredUsePer?: number;
  requiredUseQty?: number;
}

export const productionManagerApi = {
  getAcceptedOrders: async () => {
    const response = await apiClient.get<{ success: boolean; data: any[] }>(
      '/production-manager/accepted-orders'
    );
    return response.data.data;
  },

  getBatchableOrders: async () => {
    const response = await apiClient.get<{ success: boolean; data: any[] }>(
      '/production-manager/batchable-orders'
    );
    return response.data.data;
  },

  getOrderDetails: async (orderId: number) => {
    const response = await apiClient.get<{ success: boolean; data: any }>(
      `/production-manager/orders/${orderId}`
    );
    return response.data.data;
  },

  checkInventory: async (products: { productId: number; quantity: number }[]) => {
    const response = await apiClient.post<{ success: boolean; data: InventoryCheckResult[] }>(
      '/production-manager/check-inventory',
      { products }
    );
    return response.data.data;
  },

  calculateBOM: async (products: { productId: number; quantity: number }[]) => {
    const response = await apiClient.post<{ success: boolean; data: MaterialRequirement[] }>(
      '/production-manager/calculate-bom',
      { products }
    );
    return response.data.data;
  },

  scheduleBatch: async (batchData: {
    masterProductId: number;
    scheduledDate: string;
    plannedQuantity: number;
    density?: number;
    waterPercentage?: number;
    viscosity?: number;
    supervisorId: number;
    orders: { orderId: number; productId: number; quantity: number }[];
    materials: {
      materialId: number;
      requiredQuantity: number;
      requiredUsePer?: number;
      requiredUseQty?: number;
    }[];
    expectedDeliveryDate?: string;
    pmRemarks?: string;
  }) => {
    const response = await apiClient.post<{ success: boolean; data: any }>(
      '/production-manager/schedule-batch',
      batchData,
      { successMessage: 'Batch scheduled successfully' }
    );
    return response.data.data;
  },

  getAllBatches: async (filters?: { status?: string; supervisorId?: number }) => {
    const params = new URLSearchParams();
    if (filters?.status) params.append('status', filters.status);
    if (filters?.supervisorId) params.append('supervisorId', filters.supervisorId.toString());

    const response = await apiClient.get<{ success: boolean; data: Batch[] }>(
      `/production-manager/batches?${params.toString()}`
    );
    return response.data.data;
  },

  getBatchDetails: async (batchId: number) => {
    const response = await apiClient.get<{ success: boolean; data: any }>(
      `/production-manager/batches/${batchId}`
    );
    return response.data.data;
  },

  updateBatch: async (batchId: number, updates: Partial<Batch>) => {
    const response = await apiClient.put<{ success: boolean; data: Batch }>(
      `/production-manager/batches/${batchId}`,
      updates,
      { successMessage: 'Batch updated successfully' }
    );
    return response.data.data;
  },

  cancelBatch: async (batchId: number, reason: string) => {
    const response = await apiClient.put<{ success: boolean; data: any }>(
      `/production-manager/batches/${batchId}/cancel`,
      { reason },
      { successMessage: 'Batch cancelled successfully' }
    );
    return response.data.data;
  },

  updateDeliveryDate: async (orderIds: number[], deliveryDate: string) => {
    const response = await apiClient.put<{ success: boolean; data: any }>(
      '/production-manager/update-delivery-date',
      { orderIds, deliveryDate },
      { successMessage: 'Delivery dates updated successfully' }
    );
    return response.data.data;
  },

  updateOrderDetails: async (
    orderId: number,
    updates: { expectedDeliveryDate?: string; pmRemarks?: string },
    config?: { successMessage?: string }
  ) => {
    const response = await apiClient.put<{ success: boolean; data: any }>(
      `/production-manager/orders/${orderId}`,
      updates,
      { successMessage: 'Order details updated successfully', ...config }
    );
    return response.data.data;
  },

  sendToDispatch: async (orderId: number) => {
    const response = await apiClient.post<{ success: boolean; data: any }>(
      `/production-manager/orders/${orderId}/send-to-dispatch`,
      {},
      { successMessage: 'Order sent to dispatch successfully!' }
    );
    return response.data.data;
  },

  getPlanningDashboardData: async () => {
    const response = await apiClient.get<{ success: boolean; data: any[] }>(
      '/production-manager/planning-dashboard'
    );
    return response.data.data;
  },

  checkProductionFeasibility: async (productId: number, productionQty: number) => {
    const response = await apiClient.post<{ success: boolean; data: any }>(
      '/production-manager/check-production-feasibility',
      { productId, productionQty }
    );
    return response.data.data;
  },

  checkGroupFeasibility: async (products: { productId: number; quantity: number }[]) => {
    const response = await apiClient.post<{ success: boolean; data: any }>(
      '/production-manager/check-group-feasibility',
      { products }
    );
    return response.data.data;
  },

  autoScheduleOrder: async (data: { orderId: number; expectedDeliveryDate: string }) => {
    const response = await apiClient.post<{ success: boolean; data: any }>(
      '/production-manager/auto-schedule',
      data,
      { successMessage: 'Order auto-scheduled successfully' }
    );
    return response.data.data;
  },

  completeBatch: async (
    batchId: number,
    completionData: {
      actualQuantity: number;
      actualDensity: number;
      actualWaterPercentage?: number;
      actualViscosity?: number;
      startedAt: string;
      completedAt: string;
      productionRemarks?: string;
      materials: {
        batchMaterialId: number;
        materialId: number;
        plannedQuantity: number;
        actualQuantity: number;
      }[];
    }
  ) => {
    const response = await apiClient.put<{ success: boolean; data: any }>(
      `/production-manager/batches/${batchId}/complete`,
      completionData,
      { successMessage: 'Batch completed successfully!' }
    );
    return response.data.data;
  },
};
