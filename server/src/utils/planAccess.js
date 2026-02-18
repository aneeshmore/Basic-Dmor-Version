export const PROTECTED_PLAN_FEATURE_ROUTES = new Set([
  'GET:/employees',
  'GET:/employees/:id',
  'POST:/employees',
  'PUT:/employees/:id',
  'DELETE:/employees/:id',
  'GET:/masters/departments',
  'GET:/masters/departments/:id',
  'POST:/masters/departments',
  'PUT:/masters/departments/:id',
  'DELETE:/masters/departments/:id',
  'GET:/masters/customer-types',
  'GET:/masters/customer-types/:id',
  'POST:/masters/customer-types',
  'PUT:/masters/customer-types/:id',
  'DELETE:/masters/customer-types/:id',
  'GET:/reports/stock',
  'GET:/inventory/products/low-stock',
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
