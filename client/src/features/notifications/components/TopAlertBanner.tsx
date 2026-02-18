import React, { useState, useMemo } from 'react';
import { AlertTriangle, X, Check, ChevronDown, ChevronUp, Package } from 'lucide-react';
import { useNotifications, useMarkAsRead } from '../hooks';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { inventoryApi } from '@/features/inventory/api/inventoryApi';
import type { Notification } from '../types';
import { cn } from '@/utils/cn';
import { showToast } from '@/utils/toast';

interface TopAlertBannerProps {
  className?: string;
}

interface GroupedShortage {
  materialName: string;
  totalRequired: number;
  totalAvailable: number;
  unit: string;
  orderCount: number;
  orderNumbers: string[];
  notificationIds: number[];
  type: 'order' | 'lowstock';
  productType?: string;
}

export const TopAlertBanner: React.FC<TopAlertBannerProps> = ({ className }) => {
  const { data: alerts = [] } = useNotifications({ type: 'MaterialShortage' });
  const markAsRead = useMarkAsRead();
  const [dismissedAlerts, setDismissedAlerts] = useState<Set<number>>(new Set());
  const [dismissedLowStock, setDismissedLowStock] = useState<Set<number>>(new Set());
  const [isExpanded, setIsExpanded] = useState(false);

  const { hasPermission, loading: authLoading, user } = useAuth();

  // Fetch low stock products - ONLY if auth is complete AND user has 'report-low-stock' permission AND is NOT on basic plan
  const isBasic = user?.planType === 'basic';
  const canViewInventory = !authLoading && !!user && !isBasic && hasPermission('report-low-stock', 'view');

  const { data: lowStockProducts = [] } = useQuery({
    queryKey: ['lowStockProducts'],
    queryFn: () => inventoryApi.getLowStockProducts(),
    refetchInterval: canViewInventory ? 60000 : false, // Only refetch if has permission
    enabled: canViewInventory, // Only fetch if auth is complete AND user has permission
    retry: false, // Don't retry on 403 errors
  });

  const unacknowledgedAlerts = (alerts as Notification[]).filter(
    alert => !alert.isRead && !dismissedAlerts.has(alert.notificationId)
  );

  // Filter low stock products that haven't been dismissed
  const activeLowStock = lowStockProducts.filter((p: any) => !dismissedLowStock.has(p.productId));

  // Group order-based alerts by material name
  const groupedShortages = useMemo(() => {
    const groups: Record<string, GroupedShortage> = {};

    // Process order-based material shortages
    unacknowledgedAlerts.forEach((n: Notification) => {
      const shortages = n.data?.shortages || [];
      shortages.forEach((s: any) => {
        const matName = s.materialName || 'Unknown Material';
        const reqQty = Number(s.requiredQty) || 0;
        const availQty = Number(s.availableQty) || 0;
        const unit = s.unit || '';

        if (!groups[matName]) {
          groups[matName] = {
            materialName: matName,
            totalRequired: 0,
            totalAvailable: availQty,
            unit: unit,
            orderCount: 0,
            orderNumbers: [],
            notificationIds: [],
            type: 'order',
          };
        }
        groups[matName].totalRequired += reqQty;
        groups[matName].notificationIds.push(n.notificationId);
        if (n.data?.orderId) {
          const orderNum = n.data.orderNumber || `#${n.data.orderId}`;
          if (!groups[matName].orderNumbers.includes(orderNum)) {
            groups[matName].orderNumbers.push(orderNum);
            groups[matName].orderCount += 1;
          }
        }
      });
    });

    // Add low stock products (not order-related)
    activeLowStock.forEach((p: any) => {
      const matName = p.productName || 'Unknown Product';
      const key = `lowstock-${p.productId}`;
      if (!groups[key]) {
        groups[key] = {
          materialName: matName,
          totalRequired: Number(p.minStockLevel) || 0,
          totalAvailable: Number(p.availableQuantity) || 0,
          unit: p.unitName || '',
          orderCount: 0,
          orderNumbers: [],
          notificationIds: [p.productId],
          type: 'lowstock',
          productType: p.productType,
        };
      }
    });

    return Object.values(groups);
  }, [unacknowledgedAlerts, activeLowStock]);

  const orderShortages = groupedShortages.filter(g => g.type === 'order');
  const lowStockShortages = groupedShortages.filter(g => g.type === 'lowstock');

  if (groupedShortages.length === 0) {
    return null;
  }

  const handleClearAll = async () => {
    const count = unacknowledgedAlerts.length;
    if (count > 0) {
      await Promise.all(unacknowledgedAlerts.map(alert => markAsRead.mutate(alert.notificationId)));
    }
    // Dismiss all low stock
    activeLowStock.forEach((p: any) => {
      setDismissedLowStock(prev => new Set(prev).add(p.productId));
    });
    showToast.success('All alerts cleared');
  };

  const handleDismissAll = () => {
    unacknowledgedAlerts.forEach(alert => {
      setDismissedAlerts(prev => new Set(prev).add(alert.notificationId));
    });
    activeLowStock.forEach((p: any) => {
      setDismissedLowStock(prev => new Set(prev).add(p.productId));
    });
  };

  const totalMaterials = groupedShortages.length;
  const totalOrders = new Set(unacknowledgedAlerts.map(a => a.data?.orderId)).size;

  return (
    <div
      className={cn(
        'bg-[var(--error-bg,#fef2f2)] border-b border-[var(--error-border,#fecaca)]',
        className
      )}
    >
      <div className="px-4 py-2">
        {/* Compact Header Row */}
        <div className="flex items-center justify-between gap-3">
          <div
            className="flex items-center gap-2 flex-1 min-w-0 cursor-pointer"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            <AlertTriangle className="w-4 h-4 text-[var(--error,#dc2626)] flex-shrink-0" />
            <span className="font-medium text-[var(--error,#dc2626)] text-sm">Stock Alerts</span>
            {orderShortages.length > 0 && (
              <span className="text-xs bg-[var(--error,#dc2626)] text-white px-1.5 py-0.5 rounded">
                {orderShortages.length} Order
              </span>
            )}
            {lowStockShortages.length > 0 && (
              <span className="text-xs bg-orange-500 text-white px-1.5 py-0.5 rounded">
                {lowStockShortages.length} Low Stock
              </span>
            )}

            {/* Collapsed summary */}
            {!isExpanded && (
              <span className="text-xs text-[var(--text-secondary)] truncate hidden md:inline">
                —{' '}
                {groupedShortages
                  .slice(0, 2)
                  .map(g => g.materialName)
                  .join(', ')}
                {groupedShortages.length > 2 && ` +${groupedShortages.length - 2}`}
              </span>
            )}

            {isExpanded ? (
              <ChevronUp className="w-4 h-4 text-[var(--text-secondary)]" />
            ) : (
              <ChevronDown className="w-4 h-4 text-[var(--text-secondary)]" />
            )}
          </div>

          <div className="flex items-center gap-1 flex-shrink-0">
            <button
              onClick={() => (window.location.href = '/reports/stock')}
              className="flex items-center gap-1 px-2 py-1 bg-[var(--primary)] hover:opacity-90 text-white text-xs rounded transition-opacity"
            >
              View
            </button>
            <button
              onClick={handleClearAll}
              className="flex items-center gap-1 px-2 py-1 bg-[var(--error,#dc2626)] hover:opacity-90 text-white text-xs rounded transition-opacity"
            >
              <Check size={12} />
              <span className="hidden sm:inline">Clear</span>
            </button>
            <button
              onClick={handleDismissAll}
              className="p-1 text-[var(--text-secondary)] hover:bg-[var(--surface-highlight)] rounded transition-colors"
              title="Dismiss"
            >
              <X size={14} />
            </button>
          </div>
        </div>

        {/* Expanded Details */}
        {isExpanded && (
          <div className="mt-2 pt-2 border-t border-[var(--error-border,#fecaca)]">
            {/* Order-based shortages */}
            {orderShortages.length > 0 && (
              <div className="mb-2">
                <div className="text-xs font-medium text-[var(--error,#dc2626)] mb-1">
                  Order Material Shortages:
                </div>
                <div className="flex flex-wrap gap-2">
                  {orderShortages.slice(0, 4).map(group => {
                    const shortfall = group.totalRequired - group.totalAvailable;
                    return (
                      <div
                        key={group.materialName}
                        className="bg-[var(--surface)] rounded px-2 py-1.5 border border-[var(--border)] text-xs flex items-center gap-2"
                      >
                        <span className="font-medium text-[var(--text-primary)]">
                          {group.materialName}
                        </span>
                        <span className="text-[var(--error,#dc2626)] font-medium">
                          -{Number(shortfall || 0).toFixed(0)} {group.unit}
                        </span>
                        <span className="text-[var(--text-secondary)]">
                          ({group.orderCount} ord)
                        </span>
                      </div>
                    );
                  })}
                  {orderShortages.length > 4 && (
                    <span className="text-xs text-[var(--text-secondary)] self-center">
                      +{orderShortages.length - 4} more
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Low stock products */}
            {lowStockShortages.length > 0 && (
              <div>
                <div className="text-xs font-medium text-orange-600 mb-1">
                  Low Stock (Below Minimum):
                </div>
                <div className="flex flex-wrap gap-2">
                  {lowStockShortages.map(group => (
                    <div
                      key={`lowstock-${group.materialName}`}
                      className="bg-[var(--surface)] rounded px-2 py-1.5 border border-orange-200 text-xs flex items-center gap-2"
                    >
                      <Package size={12} className="text-orange-500" />
                      <span className="font-medium text-[var(--text-primary)]">
                        {group.materialName}
                      </span>
                      <span className="text-orange-600 font-medium">
                        {Number(group.totalAvailable || 0).toFixed(0)}/
                        {Number(group.totalRequired || 0).toFixed(0)} {group.unit}
                      </span>
                      {group.productType && (
                        <span className="text-[var(--text-secondary)] text-[10px] bg-gray-100 px-1 rounded">
                          {group.productType}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
