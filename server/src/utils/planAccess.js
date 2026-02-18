export const PROTECTED_PLAN_FEATURE_ROUTES = new Set([
  // Employee Management (Restricted to Pro after first user)
  'get:/employees',
  'get:/employees/:param',
  'post:/employees',
  'put:/employees/:param',
  'delete:/employees/:param',

  // Master Settings (Pro only)
  'get:/masters/departments',
  'get:/masters/departments/:param',
  'post:/masters/departments',
  'put:/masters/departments/:param',
  'delete:/masters/departments/:param',
  'get:/masters/customer-types',
  'get:/masters/customer-types/:param',
  'post:/masters/customer-types',
  'put:/masters/customer-types/:param',
  'delete:/masters/customer-types/:param',

  // CRM Module (Pro only)
  'get:/crm/visits',
  'post:/crm/visits',
  'patch:/crm/visits/:param',

  // Reports (Pro only)
  'get:/reports/batch-production',
  'get:/reports/daily-consumption',
  'get:/reports/material-inward',
  'get:/reports/stock',
  'get:/reports/profit-loss',
  'get:/reports/product-wise',
  'get:/reports/order-counts',
  'get:/reports/cancelled-orders',
  'get:/reports/salesman-revenue',
  'get:/reports/salesperson-incentives',

  // Quotations (Pro only)
  'get:/quotations',
  'post:/quotations',
  'put:/quotations/:param',
  'patch:/quotations/:param/status',
  'post:/quotations/:param/approve',
  'post:/quotations/:param/reject',
  'post:/quotations/:param/convert',

  // Product Development (Pro only)
  'post:/product-development',
  'get:/product-development/master/:param',
  'get:/product-development/ratios/:param/:param',

  // Production Management Hub (Pro only - Basic is viewing allowed, Batching is manual)
  'get:/pm-orders/approval-queue',

  // Advanced Inventory
  'get:/inventory/products/low-stock',
]);

const normalizePlan = value => {
  if (!value || typeof value !== 'string') return null;
  const normalized = value.trim().toLowerCase();
  if (normalized === 'basic') return 'basic';
  if (normalized === 'pro' || normalized === 'professional') return 'pro';
  return null;
};

export const resolvePlanType = input => {
  const explicitPlan = normalizePlan(input?.planType);
  if (explicitPlan) return explicitPlan;

  const role = (input?.role || '').toLowerCase();
  if (role.includes('basic')) return 'basic';
  if (role.includes('pro')) return 'pro';

  // Testing default: treat users without explicit plan as Basic.
  return 'basic';
};

export const isBasicPlan = input => resolvePlanType(input) === 'basic';
