import { AuthUser } from '@/types';

export type PlanType = 'basic' | 'pro';
const FORCE_DEMO_BASIC_PLAN = false;

const PLAN_STORAGE_KEYS = ['dmor_plan_type', 'morex_plan_type', 'selected_plan'];

const toPlanType = (value?: string | null): PlanType | null => {
  if (!value) return null;
  const normalized = value.trim().toLowerCase();
  if (normalized === 'basic') return 'basic';
  if (normalized === 'pro' || normalized === 'professional') return 'pro';
  return null;
};

const getPlanFromStorage = (): PlanType | null => {
  if (typeof window === 'undefined') return null;
  for (const key of PLAN_STORAGE_KEYS) {
    const parsed = toPlanType(window.localStorage.getItem(key));
    if (parsed) return parsed;
  }
  return null;
};

export const resolvePlanType = (user: AuthUser | null): PlanType => {
  if (FORCE_DEMO_BASIC_PLAN) return 'basic';

  const explicitPlan = toPlanType(user?.planType);
  if (explicitPlan) return explicitPlan;

  const role = user?.Role?.toLowerCase() || '';
  if (role.includes('basic')) return 'basic';
  if (role.includes('pro')) return 'pro';

  const storagePlan = getPlanFromStorage();
  if (storagePlan) return storagePlan;

  // Testing default: treat users without explicit plan as Basic.
  return 'basic';
};

export const isBasicPlan = (user: AuthUser | null): boolean => resolvePlanType(user) === 'basic';
