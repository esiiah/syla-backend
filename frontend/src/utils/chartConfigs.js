// frontend/src/utils/chartConfigs.js
// Centralized configuration for all 12 chart types

export const CHART_TYPES = {
  BAR: 'bar',
  LINE: 'line',
  AREA: 'area',
  PIE: 'pie',
  SCATTER: 'scatter',
  COLUMN: 'column',
  DOUGHNUT: 'doughnut',
  BUBBLE: 'bubble',
  RADAR: 'radar',
  COMPARISON: 'comparison',
  STACKED_BAR: 'stacked_bar',
  GAUGE: 'gauge'
};

// Define which features work with which chart types
export const CHART_FEATURES = {
  [CHART_TYPES.BAR]: {
    supports3D: true,
    supportsGradient: true,
    supportsTrendline: true,
    supportsLogScale: true,
    supportsCompare: true,
    supportsStacking: true,
    supportsLabels: true,
    icon: 'BarChart3'
  },
  [CHART_TYPES.LINE]: {
    supports3D: true,
    supportsGradient: true,
    supportsTrendline: true,
    supportsLogScale: true,
    supportsCompare: true,
    supportsStacking: false,
    supportsLabels: true,
    icon: 'LineChart'
  },
  [CHART_TYPES.AREA]: {
    supports3D: false,
    supportsGradient: true, // IMPORTANT: Area needs gradient
    supportsTrendline: true,
    supportsLogScale: true,
    supportsCompare: true,
    supportsStacking: true,
    supportsLabels: true,
    icon: 'AreaChart'
  },
  [CHART_TYPES.PIE]: {
    supports3D: true,
    supportsGradient: true,
    supportsTrendline: false, // No trendline for pie
    supportsLogScale: false,
    supportsCompare: false,
    supportsStacking: false,
    supportsLabels: true,
    icon: 'PieChart'
  },
  [CHART_TYPES.SCATTER]: {
    supports3D: false,
    supportsGradient: true,
    supportsTrendline: true,
    supportsLogScale: true,
    supportsCompare: false,
    supportsStacking: false,
    supportsLabels: true,
    icon: 'Circle'
  },
  [CHART_TYPES.COLUMN]: {
    supports3D: true,
    supportsGradient: true,
    supportsTrendline: true,
    supportsLogScale: true,
    supportsCompare: true,
    supportsStacking: true,
    supportsLabels: true,
    icon: 'BarChart2'
  },
  [CHART_TYPES.DOUGHNUT]: {
    supports3D: true,
    supportsGradient: true,
    supportsTrendline: false,
    supportsLogScale: false,
    supportsCompare: false,
    supportsStacking: false,
    supportsLabels: true,
    icon: 'PieChart'
  },
  [CHART_TYPES.BUBBLE]: {
    supports3D: false,
    supportsGradient: true,
    supportsTrendline: false,
    supportsLogScale: true,
    supportsCompare: false,
    supportsStacking: false,
    supportsLabels: true,
    icon: 'Circle'
  },
  [CHART_TYPES.RADAR]: {
    supports3D: false,
    supportsGradient: true,
    supportsTrendline: false,
    supportsLogScale: false,
    supportsCompare: true,
    supportsStacking: false,
    supportsLabels: true,
    icon: 'Target'
  },
  [CHART_TYPES.COMPARISON]: {
    supports3D: true,
    supportsGradient: true,
    supportsTrendline: false,
    supportsLogScale: true,
    supportsCompare: true,
    supportsStacking: false,
    supportsLabels: true,
    icon: 'BarChart'
  },
  [CHART_TYPES.STACKED_BAR]: {
    supports3D: true,
    supportsGradient: true,
    supportsTrendline: false,
    supportsLogScale: true,
    supportsCompare: false,
    supportsStacking: true,
    supportsLabels: true,
    icon: 'Layers'
  },
  [CHART_TYPES.GAUGE]: {
    supports3D: false,
    supportsGradient: true,
    supportsTrendline: false,
    supportsLogScale: false,
    supportsCompare: false,
    supportsStacking: false,
    supportsLabels: true,
    icon: 'Gauge'
  }
};

// Get chart-specific configuration
export const getChartConfig = (chartType, options = {}) => {
  const features = CHART_FEATURES[chartType] || CHART_FEATURES[CHART_TYPES.BAR];
  
  return {
    type: chartType,
    features,
    availableOptions: {
      gradient: features.supportsGradient,
      trendline: features.supportsTrendline,
      logScale: features.supportsLogScale,
      compare: features.supportsCompare,
      stacking: features.supportsStacking,
      labels: features.supportsLabels,
      threeD: features.supports3D
    }
  };
};

// Generate gradient for area charts
export const generateAreaGradient = (ctx, color1, color2) => {
  const gradient = ctx.createLinearGradient(0, 0, 0, 400);
  gradient.addColorStop(0, color1);
  gradient.addColorStop(1, color2);
  return gradient;
};

// 3D effect simulation (for bar, column, pie)
export const apply3DEffect = (dataset, chartType) => {
  if (chartType === CHART_TYPES.BAR || chartType === CHART_TYPES.COLUMN) {
    return {
      ...dataset,
      borderWidth: 3,
      borderColor: 'rgba(0, 0, 0, 0.2)',
      shadowOffsetX: 3,
      shadowOffsetY: 3,
      shadowBlur: 10,
      shadowColor: 'rgba(0, 0, 0, 0.3)'
    };
  }
  return dataset;
};

export default {
  CHART_TYPES,
  CHART_FEATURES,
  getChartConfig,
  generateAreaGradient,
  apply3DEffect
};