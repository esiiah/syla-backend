// frontend/src/utils/rowSelectionUtils.js

/**
 * Apply row limits based on viewport
 * @param {Array} data - Full dataset
 * @param {boolean} isMobile - Whether current viewport is mobile
 * @returns {Array} - Filtered data
 */
export const filterRowsByLimit = (data, isMobile) => {
  const limit = isMobile ? 10 : 20;
  return data.slice(0, limit);
};

/**
 * Get top N rows by column value
 * @param {Array} data - Full dataset
 * @param {string} column - Column to sort by
 * @param {number} n - Number of rows
 * @returns {Array} - Top N rows with original indices
 */
export const getTopNRows = (data, column, n) => {
  return data
    .map((row, index) => ({ ...row, _originalIndex: index }))
    .sort((a, b) => {
      const aVal = parseFloat(a[column]) || 0;
      const bVal = parseFloat(b[column]) || 0;
      return bVal - aVal;
    })
    .slice(0, n);
};

/**
 * Get bottom N rows by column value
 * @param {Array} data - Full dataset
 * @param {string} column - Column to sort by
 * @param {number} n - Number of rows
 * @returns {Array} - Bottom N rows with original indices
 */
export const getBottomNRows = (data, column, n) => {
  return data
    .map((row, index) => ({ ...row, _originalIndex: index }))
    .sort((a, b) => {
      const aVal = parseFloat(a[column]) || 0;
      const bVal = parseFloat(b[column]) || 0;
      return aVal - bVal;
    })
    .slice(0, n);
};

/**
 * Search rows across all values
 * @param {Array} data - Full dataset
 * @param {string} searchTerm - Search term
 * @returns {Array} - Matching rows with original indices
 */
export const searchRows = (data, searchTerm) => {
  if (!searchTerm.trim()) return data.map((row, index) => ({ ...row, _originalIndex: index }));
  
  const term = searchTerm.toLowerCase();
  return data
    .map((row, index) => ({ ...row, _originalIndex: index }))
    .filter(row => 
      Object.values(row).some(val => 
        String(val).toLowerCase().includes(term)
      )
    );
};

/**
 * Apply user-selected row indices
 * @param {Array} data - Full dataset
 * @param {Array} selectedIndices - Array of selected row indices
 * @returns {Array} - Filtered data
 */
export const applyUserSelection = (data, selectedIndices) => {
  if (!selectedIndices || selectedIndices.length === 0) return data;
  return data.filter((_, index) => selectedIndices.includes(index));
};

/**
 * Detect if current viewport is mobile
 * @returns {boolean} - True if mobile viewport
 */
export const detectMobileViewport = () => {
  return window.innerWidth < 768;
};

/**
 * Get random sample of rows
 * @param {Array} data - Full dataset
 * @param {number} n - Number of rows to sample
 * @returns {Array} - Random sample with original indices
 */
export const getRandomSample = (data, n) => {
  const shuffled = data
    .map((row, index) => ({ ...row, _originalIndex: index }))
    .sort(() => Math.random() - 0.5);
  return shuffled.slice(0, n);
};
