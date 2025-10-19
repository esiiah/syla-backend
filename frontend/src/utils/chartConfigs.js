// frontend/src/utils/chartConfigs.js
// Centralized configuration for all 12 chart types

export const CHART_TYPES = {
  BAR: 'bar',              // Horizontal bars
  COLUMN: 'column',        // Vertical bars
  LINE: 'line',
  AREA: 'area',
  PIE: 'pie',
  DOUGHNUT: 'doughnut',
  SCATTER: 'scatter',
  BUBBLE: 'bubble',
  RADAR: 'radar',
  COMPARISON: 'comparison',  // Side-by-side vertical bars
  STACKED_BAR: 'stacked',    // Stacked vertical bars
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
export const getChartConfig = (chartType) => {
  const configs = {
    [CHART_TYPES.BAR]: {
      name: 'Bar Chart',
      description: 'Horizontal bars for comparing categories',
      indexAxis: 'y',
      stacked: false,
      features: {  sort: true, gradient: true, trendline: true, logScale: true,
        comparison: true, labels: true,   threeD: true }
    },

    [CHART_TYPES.COLUMN]: {
      name: 'Column Chart',
      description: 'Vertical bars for category comparison',
      indexAxis: 'x',
      stacked: false,
      features: { sort: true, gradient: true,  trendline: true,  logScale: true,
        comparison: true, labels: true, threeD: true }
    },

    [CHART_TYPES.LINE]: {
      name: 'Line Chart',
      description: 'Trends or changes over time',
      indexAxis: 'x',
      stacked: false,
      features: { sort: false, gradient: true, trendline: true, logScale: true,
        comparison: true, labels: true, threeD: true }
    },

    [CHART_TYPES.AREA]: {
      name: 'Area Chart',
      description: 'Filled area under a line showing volume or magnitude',
      indexAxis: 'x',
      stacked: true,
      features: { sort: false,  gradient: true, trendline: true, logScale: true,  comparison: true,
        labels: true, threeD: false
      }
    },

    [CHART_TYPES.PIE]: {
      name: 'Pie Chart',
      description: 'Circular slices representing parts of a whole',
      features: { sort: false, gradient: true, trendline: false, logScale: false, comparison: false,
        labels: true, threeD: true }
    },

    [CHART_TYPES.DOUGHNUT]: {
      name: 'Doughnut Chart',
      description: 'Like a pie chart with a central hole',
      features: { sort: false, gradient: true, trendline: false,
        logScale: false, comparison: false, labels: true, threeD: true }
    },
    
    [CHART_TYPES.SCATTER]: {
      name: 'Scatter Plot',
      description: 'Points showing relationships between two variables',
      features: {
        sort: false,
        gradient: true,
        trendline: true,
        logScale: true,
        comparison: false,
        labels: true,
        threeD: false
      }
    },
    [CHART_TYPES.BUBBLE]: {
      name: 'Bubble Chart',
      description: 'Scatter plot with variable bubble sizes',
      features: {
        sort: false,
        gradient: true,
        trendline: false,
        logScale: true,
        comparison: false,
        labels: true,
        threeD: false
      }
    },
    [CHART_TYPES.RADAR]: {
      name: 'Radar Chart',
      description: 'Values displayed on multiple axes from a central point',
      features: {
        sort: false,
        gradient: true,
        trendline: false,
        logScale: false,
        comparison: true,
        labels: true,
        threeD: false
      }
    },
    [CHART_TYPES.COMPARISON]: {
      name: 'Comparison Chart',
      description: 'Side-by-side vertical bars to compare series',
      indexAxis: 'x',
      stacked: false,
      features: {
        sort: true,
        gradient: true,
        trendline: false,
        logScale: true,
        comparison: true,
        labels: true,
        threeD: true
      }
    },
    [CHART_TYPES.STACKED_BAR]: {
      name: 'Stacked Bar Chart',
      description: 'Bars stacked to show parts of a whole across categories',
      indexAxis: 'x',
      stacked: true,
      features: {
        sort: true,
        gradient: true,
        trendline: false,
        logScale: true,
        comparison: false,
        labels: true,
        threeD: true
      }
    },
    [CHART_TYPES.GAUGE]: {
      name: 'Gauge Chart',
      description: 'Circular gauge showing current progress or performance',
      features: {
        sort: false,
        gradient: true,
        trendline: false,
        logScale: false,
        comparison: false,
        labels: true,
        threeD: false
      }
    }
  };

  return configs[chartType] || configs[CHART_TYPES.BAR];
};

// Generate gradient for area charts
export const generateAreaGradient = (ctx, color1, color2) => {
  const gradient = ctx.createLinearGradient(0, 0, 0, 400);
  gradient.addColorStop(0, color1);
  gradient.addColorStop(1, color2);
  return gradient;
};

// Add to CHART_FEATURES or create if doesn't exist
export const CHART_3D_SHADOW_POSITIONS = {
  BOTTOM_RIGHT: 'bottom-right',
  BOTTOM_LEFT: 'bottom-left',
  TOP_RIGHT: 'top-right',
  TOP_LEFT: 'top-left',
  BOTTOM: 'bottom',
  RIGHT: 'right'
};

export const get3DShadowOffset = (position, depth = 5) => {
  const offsets = {
    'bottom-right': { x: depth, y: depth },
    'bottom-left': { x: -depth, y: depth },
    'top-right': { x: depth, y: -depth },
    'top-left': { x: -depth, y: -depth },
    'bottom': { x: 0, y: depth },
    'right': { x: depth, y: 0 }
  };
  return offsets[position] || offsets['bottom-right'];
};

export default {
  CHART_TYPES,
  CHART_FEATURES,
  CHART_3D_SHADOW_POSITIONS,
  getChartConfig,
  generateAreaGradient,
  get3DShadowOffset
};