// frontend/src/services/helpApi.js
import { API_BASE_URL } from '../config';

const getAuthHeaders = () => {
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    ...(token && { 'Authorization': `Bearer ${token}` })
  };
};

// ==================== FAQ APIs ====================

/**
 * Get all FAQ categories and questions
 */
export const getAllFAQs = async () => {
  const response = await fetch(`${API_BASE_URL}/help/faqs`, {
    headers: getAuthHeaders()
  });
  if (!response.ok) throw new Error('Failed to fetch FAQs');
  return response.json();
};

// ==================== DOCUMENTATION APIs ====================

/**
 * Get available documentation sections
 */
export const getDocSections = async () => {
  const response = await fetch(`${API_BASE_URL}/help/docs/sections`, {
    headers: getAuthHeaders()
  });
  if (!response.ok) throw new Error('Failed to fetch doc sections');
  return response.json();
};

/**
 * Search documentation
 * @param {string} query - Search query
 */
export const searchDocumentation = async (query) => {
  const response = await fetch(`${API_BASE_URL}/help/docs/search?q=${encodeURIComponent(query)}`, {
    headers: getAuthHeaders()
  });
  if (!response.ok) throw new Error('Failed to search documentation');
  return response.json();
};

// ==================== UTILITY FUNCTIONS ====================

/**
 * Filter FAQs by tag
 * @param {Array} faqs - Array of FAQ objects
 * @param {string} tag - Tag to filter by
 */
export const filterByTag = (faqs, tag) => {
  return faqs.filter(faq => faq.tags && faq.tags.includes(tag));
};

/**
 * Get FAQ count for a category
 * @param {Object} category - Category object
 */
export const getFAQCount = (category) => {
  return category.faqs ? category.faqs.length : 0;
};

export default {
  getAllFAQs,
  getFAQCategory,
  searchFAQs,
  contactSupport,
  getDocSections,
  searchDocumentation,
  filterByTag,
  getFAQCount
};
};

/**
 * Get FAQs for a specific category
 * @param {string} categoryId - Category ID (e.g., 'getting-started')
 */
export const getFAQCategory = async (categoryId) => {
  const response = await fetch(`${API_BASE_URL}/help/faqs/${categoryId}`, {
    headers: getAuthHeaders()
  });
  if (!response.ok) throw new Error('Failed to fetch FAQ category');
  return response.json();
};

/**
 * Search FAQs by query string
 * @param {string} query - Search query
 * @param {string[]} categories - Optional array of category IDs to search within
 */
export const searchFAQs = async (query, categories = null) => {
  const response = await fetch(`${API_BASE_URL}/help/faqs/search`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ query, categories })
  });
  if (!response.ok) throw new Error('Failed to search FAQs');
  return response.json();
};

// ==================== SUPPORT APIs ====================

/**
 * Submit a support request
 * @param {Object} data - Support request data
 * @param {string} data.name - User's name
 * @param {string} data.email - User's email
 * @param {string} data.subject - Subject line
 * @param {string} data.message - Message content
 * @param {string} data.category - Category (optional, default: 'general')
 */
export const contactSupport = async (data) => {
  const response = await fetch(`${API_BASE_URL}/help/contact`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(data)
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to submit support request');
  }
  return response.json();
