// frontend/src/utils/chartValidation.js
// Validates data compatibility with different chart types

import { CHART_TYPES, CHART_FEATURES } from './chartConfigs';

export const validateChartData = (chartType, data, options = {}) => {
  const errors = [];
  const warnings = [];

  // Check if data exists
  if (!data || data.length === 0) {
    errors.push('No data available for chart');
    return { valid: false, errors, warnings };
  }

  // Chart-specific validations
  switch (chartType) {
    case CHART_TYPES.PIE:
    case CHART_TYPES.DOUGHNUT:
      if (data.length > 12) {
        warnings.push('Pie/Doughnut charts work best with 12 or fewer data points');
      }
      break;

    case CHART_TYPES.SCATTER:
    case CHART_TYPES.BUBBLE:
      if (data.length < 3) {
        warnings.push('Scatter/Bubble charts need at least 3 data points for meaningful visualization');
      }
      break;

    case CHART_TYPES.RADAR:
      if (data.length < 3) {
        errors.push('Radar charts require at least 3 data points');
      }
      if (data.length > 10) {
        warnings.push('Radar charts with more than 10 points may be cluttered');
      }
      break;

    case CHART_TYPES.GAUGE:
      if (data.length > 1) {
        warnings.push('Gauge chart will use average of all data points');
      }
      break;

    case CHART_TYPES.STACKED_BAR:
      if (!options.stackedSeries || options.stackedSeries.length < 2) {
        warnings.push('Stacked bar charts need multiple data series for stacking');
      }
      break;
  }

  // Validate feature compatibility
  const features = CHART_FEATURES[chartType];
  
  if (options.trendline && !features.supportsTrendline) {
    warnings.push(`Trendline is not supported for ${chartType} charts`);
  }

  if (options.logScale && !features.supportsLogScale) {
    warnings.push(`Logarithmic scale is not supported for ${chartType} charts`);
  }

  if (options.compareField && !features.supportsCompare) {
    warnings.push(`Comparison is not supported for ${chartType} charts`);
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
};

export const getRecommendedChartType = (data, dataTypes = {}) => {
  if (!data || data.length === 0) {
    return CHART_TYPES.BAR;
  }

  const dataLength = data.length;
  const hasNumericData = Object.values(dataTypes).some(type => type === 'numeric');
  const hasCategoricalData = Object.values(dataTypes).some(type => type === 'categorical');

  // Recommendation logic
  if (dataLength <= 5 && hasNumericData) {
    return CHART_TYPES.PIE; // Small categorical distributions
  }

  if (dataLength > 50 && hasNumericData) {
    return CHART_TYPES.LINE; // Large datasets better as lines
  }

  if (hasCategoricalData && hasNumericData) {
    return CHART_TYPES.BAR; // Mixed data
  }

  if (dataLength >= 12) {
    return CHART_TYPES.LINE; // Time series data
  }

  return CHART_TYPES.BAR; // Default
};

export const formatDataForChart = (chartType, rawData, xColumn, yColumn) => {
  const formatted = {
    labels: [],
    values: [],
    metadata: {}
  };

  rawData.forEach(row => {
    formatted.labels.push(row[xColumn]);
    formatted.values.push(parseFloat(row[yColumn]) || 0);
  });

  // Chart-specific formatting
  if (chartType === CHART_TYPES.BUBBLE) {
    formatted.bubbleData = formatted.values.map((val, idx) => ({
      x: idx,
      y: val,
      r: Math.abs(val / 10) + 5 // Size based on value
    }));
  }

  if (chartType === CHART_TYPES.SCATTER) {
    formatted.scatterData = formatted.values.map((val, idx) => ({
      x: idx,
      y: val
    }));
  }

  return formatted;
};