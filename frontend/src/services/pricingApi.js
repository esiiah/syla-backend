// frontend/src/services/pricingApi.js
import { API_BASE_URL } from '../config';

const getAuthHeaders = () => {
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    ...(token && { 'Authorization': `Bearer ${token}` })
  };
};

// ==================== PRICING PLAN APIs ====================

/**
 * Get all pricing plans and their features
 */
export const getPricingPlans = async () => {
  const response = await fetch(`${API_BASE_URL}/pricing/plans`, {
    headers: getAuthHeaders()
  });
  if (!response.ok) throw new Error('Failed to fetch pricing plans');
  return response.json();
};

/**
 * Get details for a specific pricing plan
 * @param {string} planId - Plan ID ('free', 'professional', 'business')
 */
export const getPricingPlan = async (planId) => {
  const response = await fetch(`${API_BASE_URL}/pricing/plans/${planId}`, {
    headers: getAuthHeaders()
  });
  if (!response.ok) throw new Error('Failed to fetch pricing plan');
  return response.json();
};

/**
 * Get detailed plan comparison data
 */
export const comparePlans = async () => {
  const response = await fetch(`${API_BASE_URL}/pricing/compare`, {
    headers: getAuthHeaders()
  });
  if (!response.ok) throw new Error('Failed to fetch plan comparison');
  return response.json();
};

// ==================== SUBSCRIPTION APIs ====================

/**
 * Create or update a subscription
 * @param {string} plan - Plan ID ('free', 'professional', 'business')
 * @param {string} billingCycle - 'monthly' or 'yearly'
 * @param {string} paymentMethod - Optional payment method ID
 */
export const createSubscription = async (plan, billingCycle, paymentMethod = null) => {
  const response = await fetch(`${API_BASE_URL}/pricing/subscribe`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ 
      plan, 
      billing_cycle: billingCycle, 
      payment_method: paymentMethod 
    })
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to create subscription');
  }
  
  return response.json();
};

/**
 * Cancel current subscription
 */
export const cancelSubscription = async () => {
  const response = await fetch(`${API_BASE_URL}/pricing/subscription`, {
    method: 'DELETE',
    headers: getAuthHeaders()
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to cancel subscription');
  }
  
  return response.json();
};

// ==================== USAGE APIs ====================

/**
 * Get current user's usage statistics and limits
 */
export const getUsageLimits = async () => {
  const response = await fetch(`${API_BASE_URL}/pricing/usage`, {
    headers: getAuthHeaders()
  });
  if (!response.ok) throw new Error('Failed to fetch usage limits');
  return response.json();
};

/**
 * Get available discounts and promotions
 */
export const getAvailableDiscounts = async () => {
  const response = await fetch(`${API_BASE_URL}/pricing/discounts`, {
    headers: getAuthHeaders()
  });
  if (!response.ok) throw new Error('Failed to fetch discounts');
  return response.json();
};

// ==================== UTILITY FUNCTIONS ====================

/**
 * Format price with currency
 * @param {number} price - Price amount
 * @param {string} cycle - Billing cycle ('monthly' or 'yearly')
 */
export const formatPrice = (price, cycle = 'monthly') => {
  if (price === 0) return 'Free';
  const period = cycle === 'monthly' ? '/mo' : '/yr';
  return `$${price}${period}`;
};

/**
 * Calculate savings between monthly and yearly billing
 * @param {number} monthlyPrice - Monthly price
 * @param {number} yearlyPrice - Yearly price
 */
export const calculateSavings = (monthlyPrice, yearlyPrice) => {
  if (monthlyPrice === 0) return null;
  
  const yearlySavings = (monthlyPrice * 12) - yearlyPrice;
  const percentSavings = Math.round((yearlySavings / (monthlyPrice * 12)) * 100);
  
  return { 
    amount: yearlySavings, 
    percent: percentSavings 
  };
};

/**
 * Get plan feature count
 * @param {Object} plan - Plan object
 */
export const getPlanFeatureCount = (plan) => {
  return plan.features ? plan.features.length : 0;
};

/**
 * Check if a feature is included in a plan
 * @param {Object} plan - Plan object
 * @param {string} featureName - Feature name to check
 */
export const hasFeature = (plan, featureName) => {
  if (!plan.features) return false;
  return plan.features.some(f => 
    f.toLowerCase().includes(featureName.toLowerCase())
  );
};

/**
 * Get usage percentage
 * @param {number} used - Amount used
 * @param {number} limit - Usage limit (-1 for unlimited)
 */
export const getUsagePercentage = (used, limit) => {
  if (limit === -1) return 0; // unlimited
  if (limit === 0) return 100;
  return Math.min(100, Math.round((used / limit) * 100));
};

/**
 * Check if user is near usage limit
 * @param {number} used - Amount used
 * @param {number} limit - Usage limit
 * @param {number} threshold - Percentage threshold (default: 80)
 */
export const isNearLimit = (used, limit, threshold = 80) => {
  if (limit === -1) return false; // unlimited
  const percentage = getUsagePercentage(used, limit);
  return percentage >= threshold;
};

/**
 * Format usage display text
 * @param {number} used - Amount used
 * @param {number} limit - Usage limit (-1 for unlimited)
 */
export const formatUsage = (used, limit) => {
  if (limit === -1) return `${used.toLocaleString()} (unlimited)`;
  return `${used.toLocaleString()} / ${limit.toLocaleString()}`;
};

/**
 * Get recommended plan based on usage
 * @param {Object} usage - Usage object
 */
export const getRecommendedPlan = (usage) => {
  // If using over 80% of free tier forecasts
  if (usage.plan === 'free' && usage.ai_forecasts_used > 40) {
    return 'professional';
  }
  
  // If using over 80% of professional tier forecasts
  if (usage.plan === 'professional' && usage.ai_forecasts_used > 400) {
    return 'business';
  }
  
  return usage.plan;
};

export default {
  getPricingPlans,
  getPricingPlan,
  comparePlans,
  createSubscription,
  cancelSubscription,
  getUsageLimits,
  getAvailableDiscounts,
  formatPrice,
  calculateSavings,
  getPlanFeatureCount,
  hasFeature,
  getUsagePercentage,
  isNearLimit,
  formatUsage,
  getRecommendedPlan
};
