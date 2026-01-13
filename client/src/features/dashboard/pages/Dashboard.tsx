import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  Package,
  Factory,
  ClipboardList,
  BarChart3,
  ShoppingCart,
  UserPlus,
} from 'lucide-react';
import { productionManagerApi } from '@/features/production-manager/api/productionManagerApi';
import { reportsApi } from '@/features/reports/api/reportsApi';
import { employeeApi } from '@/features/employees/api/employeeApi';
import { customerApi } from '@/features/masters/api/customerApi';
import { productApi } from '@/features/master-products/api';
import { AlertsTicker } from '@/features/notifications/components/AlertsTicker';

import { useAuth } from '@/contexts/AuthContext';

export const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { hasPermission } = useAuth();
  const [activeProductionCount, setActiveProductionCount] = useState<number>(0);
  const [lowStockCount, setLowStockCount] = useState<number>(0);
  const [employeeCount, setEmployeeCount] = useState<number>(0);
  const [customerCount, setCustomerCount] = useState<number>(0);
  const [productCount, setProductCount] = useState<number>(0);

  useEffect(() => {
    const fetchData = async () => {
      // Production Data
      if (hasPermission('production-manager', 'view')) {
        try {
          const productionData = await productionManagerApi.getPlanningDashboardData();
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const uniqueMasterIds = new Set(productionData.map((item: any) => item.masterProductId));
          setActiveProductionCount(uniqueMasterIds.size);
        } catch (error) {
          console.error('Failed to fetch production data:', error);
        }
      }

      // Stock Data
      if (hasPermission('report-stock', 'view')) {
        try {
          const stockData = await reportsApi.getStockReport();

          const lowStock = stockData.filter(
            (item: any) => item.availableQuantity < item.minStockLevel
          ).length;
          setLowStockCount(lowStock);
        } catch (error) {
          console.error('Failed to fetch stock data:', error);
        }
      }

      // Employee Data
      if (hasPermission('employees', 'view')) {
        try {
          const employeeResponse = await employeeApi.getAll();
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const employees = (employeeResponse as any).data || [];
          setEmployeeCount(employees.length);
        } catch (error) {
          console.error('Failed to fetch employee data:', error);
        }
      }

      // Customer Data
      if (hasPermission('Add New Customer', 'view')) {
        try {
          const customerResponse = await customerApi.getAll();
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const customers = (customerResponse as any).data || [];
          setCustomerCount(customers.length);
        } catch (error) {
          console.error('Failed to fetch customer data:', error);
        }
      }

      // Product Data
      if (hasPermission('products', 'view')) {
        try {
          const productResponse = await productApi.getAll();
          if (productResponse.success && productResponse.data) {
            setProductCount(productResponse.data.length);
          }
        } catch (error) {
          console.error('Failed to fetch product data:', error);
        }
      }
    };

    fetchData();
  }, [hasPermission]);

  const cards = [
    {
      title: 'Create Order',
      icon: ShoppingCart,
      count: 'New',
      path: '/operations/create-order',
      color: 'text-green-500',
      bg: 'bg-green-500/10',
      permission: { module: 'create-order', action: 'create' },
    },
    {
      title: 'Employees',
      icon: Users,
      count: employeeCount,
      path: '/masters/employees',
      color: 'text-emerald-500',
      bg: 'bg-emerald-500/10',
      permission: { module: 'employees', action: 'view' },
    },
    {
      title: 'Customers',
      icon: UserPlus,
      count: customerCount,
      path: '/masters/customers',
      color: 'text-cyan-500',
      bg: 'bg-cyan-500/10',
      permission: { module: 'Add New Customer', action: 'view' },
    },
    {
      title: 'Products',
      icon: Package,
      count: productCount,
      path: '/masters/product-sub-master',
      color: 'text-violet-500',
      bg: 'bg-violet-500/10',
      permission: { module: 'products', action: 'view' },
    },
    {
      title: 'Production',
      icon: Factory,
      count: `${activeProductionCount} Active`,
      path: '/operations/pm-dashboard',
      color: 'text-orange-500',
      bg: 'bg-orange-500/10',
      permission: { module: 'pm-orders', action: 'view' },
    },
    {
      title: 'Stock Report',
      icon: ClipboardList,
      count: `Low Stock: ${lowStockCount}`,
      path: '/reports/low-stock',
      color: 'text-rose-500',
      bg: 'bg-rose-500/10',
      permission: { module: 'report-stock', action: 'view' },
    },
    {
      title: 'Reports',
      icon: BarChart3,
      count: 'View All',
      path: '/reports',
      color: 'text-amber-500',
      bg: 'bg-amber-500/10',
      permission: { module: 'reports', action: 'view' },
    },
  ];

  // Filter cards based on permissions
  const visibleCards = cards.filter(
    card => !card.permission || hasPermission(card.permission.module, card.permission.action as any)
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold text-[var(--text-primary)]">
          Welcome to Morex Technologies
        </h1>
        <p className="mt-2 text-sm text-[var(--text-secondary)]">
          Enterprise Resource Planning System
        </p>
      </div>

      <AlertsTicker />

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {visibleCards.map(card => {
          const Icon = card.icon;
          return (
            <button
              key={card.title}
              onClick={() => navigate(card.path)}
              className="group relative overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)] p-6 text-left transition-all hover:shadow-lg hover:border-[var(--primary)]"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className={`inline-flex p-3 rounded-lg ${card.bg} mb-4`}>
                    <Icon className={`h-6 w-6 ${card.color}`} />
                  </div>
                  <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-1">
                    {card.title}
                  </h3>
                  <p className="text-2xl font-bold text-[var(--text-primary)]">{card.count}</p>
                </div>
              </div>
              <div className="mt-4 flex items-center text-sm font-medium text-[var(--text-secondary)] group-hover:text-[var(--text-primary)]">
                View details
                <svg
                  className="ml-1 h-4 w-4 transition-transform group-hover:translate-x-1"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
