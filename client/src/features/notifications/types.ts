export type NotificationPriority = 'low' | 'normal' | 'high' | 'critical';

export interface MaterialShortageData {
  orderId: number;
  orderNumber?: string;
  customerName?: string;
  shortages: Array<{
    materialId: number;
    materialName: string;
    requiredQty: number;
    availableQty: number;
    unit: string;
    shortfall: number;
  }>;
}

export interface Notification {
  notificationId: number;
  recipientId: number;
  type: string;
  title: string;
  message: string;
  data?: MaterialShortageData | any;
  priority: NotificationPriority;
  isRead: boolean;
  isAcknowledged: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface NotificationFilters {
  limit?: number;
  offset?: number;
  isRead?: boolean;
  priority?: NotificationPriority;
  type?: string;
}

export interface UnreadCountResponse {
  unreadCount: number;
}
