export interface DiscardEntry {
  discardId: number;
  productId: number;
  productName?: string;
  productType?: 'FG' | 'RM' | 'PM';
  currentStock?: number;
  discardDate: string;
  quantity: number;
  reason?: string;
  notes?: string;
  createdAt?: string;
}

export interface CreateDiscardInput {
  productId: number;
  productType: 'FG' | 'RM' | 'PM';
  unitId?: number;
  discardDate?: string;
  quantityPerUnit: number;
  numberOfUnits: number;
  reason?: string;
  notes?: string;
}

export interface UpdateDiscardInput {
  productId?: number;
  discardDate?: string;
  quantity?: number;
  reason?: string;
  notes?: string;
}
