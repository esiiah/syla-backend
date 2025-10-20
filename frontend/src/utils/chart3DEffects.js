// frontend/src/utils/chart3DEffects.js
// Dedicated 3D rendering and transformation utilities

import { CHART_TYPES } from './chartConfigs';

/**
 * 3D transformation configurations for different chart types
 */
export const CHART_3D_CONFIGS = {
  [CHART_TYPES.BAR]: {
    perspective: 'horizontal',
    depthAxis: 'x',
    supports3D: true,
    depthRatio: 0.3,
    angleX: 45,
    angleY: 20
  },
  [CHART_TYPES.COLUMN]: {
    perspective: 'vertical',
    depthAxis: 'y',
    supports3D: true,
    depthRatio: 0.3,
    angleX: 45,
    angleY: 20
  },
  [CHART_TYPES.PIE]: {
    perspective: 'circular',
    supports3D: true,
    depth: 25,
    angle: 25
  },
  [CHART_TYPES.DOUGHNUT]: {
    perspective: 'circular',
    supports3D: true,
    depth: 20,
    angle: 25,
    innerDepth: 0.6
  },
  [CHART_TYPES.COMPARISON]: {
    perspective: 'vertical',
    depthAxis: 'y',
    supports3D: true,
    depthRatio: 0.25,
    angleX: 45,
    angleY: 20
  },
  [CHART_TYPES.STACKED_BAR]: {
    perspective: 'vertical',
    depthAxis: 'y',
    supports3D: true,
    depthRatio: 0.3,
    angleX: 45,
    angleY: 20
  }
};

/**
 * Generate 3D depth datasets for bar/column charts
 */
export const generate3DBarDepth = (chartData, chartType, options = {}) => {
  const config = CHART_3D_CONFIGS[chartType];
  if (!config || !config.supports3D) return chartData;

  const depthIntensity = options.shadow3DDepth || 8;
  const position = options.shadow3DPosition || 'bottom-right';
  
  // Calculate offsets based on position
  const getOffsets = (pos, depth) => {
    const offsets = {
      'bottom-right': { x: depth, y: depth },
      'bottom-left': { x: -depth, y: depth },
      'top-right': { x: depth, y: -depth },
      'top-left': { x: -depth, y: -depth },
      'bottom': { x: 0, y: depth },
      'right': { x: depth, y: 0 },
      'left': { x: -depth, y: 0 },
      'top': { x: 0, y: -depth }
    };
    return offsets[pos] || offsets['bottom-right'];
  };

  const offset = getOffsets(position, depthIntensity);
  
  // Use Chart.js shadow plugin approach instead of dataset duplication
  const enhancedData = {
    ...chartData,
    datasets: chartData.datasets.map((dataset, index) => {
      if (dataset.label?.includes('3D Depth') || dataset.label?.includes('Trend')) {
        return dataset; // Skip depth layers and trendlines
      }

      // Calculate depth color (darker version)
      const depthColor = darkenColor(dataset.backgroundColor, 0.5);
      
      return {
        ...dataset,
        // Add shadow configuration
        shadowOffsetX: offset.x,
        shadowOffsetY: offset.y,
        shadowBlur: depthIntensity / 2,
        shadowColor: depthColor,
        // Enhanced border for 3D effect
        borderWidth: 2,
        borderColor: darkenColor(dataset.backgroundColor, 0.2)
      };
    })
  };

  return enhancedData;
};

/**
 * Generate 3D pie/doughnut effect
 */
export const generate3DPieEffect = (chartData, chartType, options = {}) => {
  const config = CHART_3D_CONFIGS[chartType];
  if (!config || !config.supports3D) return chartData;

  const depth = options.shadow3DDepth || config.depth || 20;
  
  // For pie/doughnut, we'll use plugin-based 3D rendering
  return {
    ...chartData,
    options: {
      ...chartData.options,
      plugins: {
        ...chartData.options?.plugins,
        threeDEffect: {
          enabled: true,
          depth,
          angle: config.angle
        }
      }
    }
  };
};

/**
 * Custom Chart.js plugin for 3D pie/doughnut rendering
 */
export const Chart3DPlugin = {
  id: 'threeDEffect',
  
  beforeDatasetsDraw: (chart, args, options) => {
    if (!options.enabled) return;

    const { ctx, chartArea, data } = chart;
    const { top, bottom, left, right, width, height } = chartArea;

    const centerX = (left + right) / 2;
    const centerY = (top + bottom) / 2;
    const radius = Math.min(width, height) / 2;
    
    const depth = options.depth || 20;
    const angle = (options.angle || 25) * Math.PI / 180;

    ctx.save();

    // Draw depth layers for each segment
    data.datasets.forEach((dataset, datasetIndex) => {
      const meta = chart.getDatasetMeta(datasetIndex);
      if (!meta.data) return;

      meta.data.forEach((arc, index) => {
        const model = arc;
        const startAngle = model.startAngle || 0;
        const endAngle = model.endAngle || 0;
        const outerRadius = model.outerRadius || radius;
        const innerRadius = model.innerRadius || 0;

        // Calculate depth color
        const baseColor = dataset.backgroundColor[index] || dataset.backgroundColor;
        const depthColor = darkenColor(baseColor, 0.4);
        const sideColor = darkenColor(baseColor, 0.25);

        // Draw depth effect (bottom slice)
        for (let d = depth; d > 0; d -= 2) {
          const offsetY = d * Math.sin(angle);
          const layerOpacity = 1 - (d / depth) * 0.3;

          ctx.globalAlpha = layerOpacity;
          ctx.beginPath();
          ctx.arc(
            centerX,
            centerY + offsetY,
            outerRadius,
            startAngle,
            endAngle
          );
          ctx.arc(
            centerX,
            centerY + offsetY,
            innerRadius,
            endAngle,
            startAngle,
            true
          );
          ctx.closePath();
          ctx.fillStyle = d === depth ? depthColor : sideColor;
          ctx.fill();
        }

        ctx.globalAlpha = 1;
      });
    });

    ctx.restore();
  }
};

/**
 * Custom Chart.js plugin for 3D bar shadow rendering
 */
export const Chart3DBarPlugin = {
  id: 'threeDBar',
  
  beforeDatasetsDraw: (chart, args, pluginOptions) => {
    const { ctx, data, chartArea } = chart;
    if (!chartArea) return;

    ctx.save();

    data.datasets.forEach((dataset, datasetIndex) => {
      const meta = chart.getDatasetMeta(datasetIndex);
      if (!meta.data || !dataset.shadowOffsetX) return;

      meta.data.forEach((bar, index) => {
        const { x, y, width, height, base } = bar.getProps(['x', 'y', 'width', 'height', 'base'], true);
        
        // Draw shadow/depth
        ctx.fillStyle = dataset.shadowColor || 'rgba(0, 0, 0, 0.3)';
        ctx.shadowBlur = dataset.shadowBlur || 0;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;

        // Draw depth rectangles
        const offsetX = dataset.shadowOffsetX || 0;
        const offsetY = dataset.shadowOffsetY || 0;
        
        ctx.beginPath();
        if (chart.config.options.indexAxis === 'y') {
          // Horizontal bars
          ctx.rect(
            x + offsetX,
            y + offsetY,
            width,
            height
          );
        } else {
          // Vertical bars
          ctx.rect(
            x + offsetX,
            y + offsetY,
            width,
            height
          );
        }
        ctx.fill();
      });
    });

    ctx.restore();
  }
};

/**
 * Darken color for depth effect
 */
export const darkenColor = (color, factor = 0.3) => {
  if (Array.isArray(color)) {
    return color.map(c => darkenSingleColor(c, factor));
  }
  return darkenSingleColor(color, factor);
};

const darkenSingleColor = (color, factor) => {
  // Handle various color formats
  let r, g, b, a = 1;

  if (color.startsWith('#')) {
    const hex = color.replace('#', '');
    r = parseInt(hex.substr(0, 2), 16);
    g = parseInt(hex.substr(2, 2), 16);
    b = parseInt(hex.substr(4, 2), 16);
  } else if (color.startsWith('rgb')) {
    const match = color.match(/\d+\.?\d*/g);
    if (match) {
      r = parseInt(match[0]);
      g = parseInt(match[1]);
      b = parseInt(match[2]);
      a = match[3] ? parseFloat(match[3]) : 1;
    }
  } else {
    return color; // Unsupported format
  }

  // Darken by reducing RGB values
  r = Math.max(0, Math.floor(r * (1 - factor)));
  g = Math.max(0, Math.floor(g * (1 - factor)));
  b = Math.max(0, Math.floor(b * (1 - factor)));

  return `rgba(${r}, ${g}, ${b}, ${a})`;
};

/**
 * Apply 3D transformations to chart options
 */
export const apply3DTransformations = (chartOptions, chartType, enable3D, position, depth) => {
  if (!enable3D) return chartOptions;

  const config = CHART_3D_CONFIGS[chartType];
  if (!config || !config.supports3D) return chartOptions;

  const updatedOptions = { ...chartOptions };

  // Bar/Column specific 3D transformations
  if (chartType === CHART_TYPES.BAR || 
      chartType === CHART_TYPES.COLUMN || 
      chartType === CHART_TYPES.COMPARISON ||
      chartType === CHART_TYPES.STACKED_BAR) {
    
    // Add perspective padding
    if (!updatedOptions.layout) updatedOptions.layout = {};
    if (!updatedOptions.layout.padding) updatedOptions.layout.padding = {};
    
    updatedOptions.layout.padding = {
      ...updatedOptions.layout.padding,
      right: (updatedOptions.layout.padding.right || 0) + depth + 10,
      bottom: (updatedOptions.layout.padding.bottom || 0) + depth + 10
    };

    // Adjust bar spacing for depth effect
    if (!updatedOptions.elements) updatedOptions.elements = {};
    if (!updatedOptions.elements.bar) updatedOptions.elements.bar = {};
    
    updatedOptions.elements.bar.borderRadius = {
      topLeft: 4,
      topRight: 4,
      bottomLeft: 0,
      bottomRight: 0
    };
  }

  // Pie/Doughnut specific 3D
  if (chartType === CHART_TYPES.PIE || chartType === CHART_TYPES.DOUGHNUT) {
    if (!updatedOptions.plugins) updatedOptions.plugins = {};
    updatedOptions.plugins.threeDEffect = {
      enabled: true,
      depth: depth,
      angle: config.angle
    };
  }

  return updatedOptions;
};

/**
 * Check if chart type supports 3D
 */
export const supports3D = (chartType) => {
  const config = CHART_3D_CONFIGS[chartType];
  return config ? config.supports3D : false;
};

/**
 * Get recommended 3D settings for chart type
 */
export const get3DRecommendations = (chartType) => {
  const config = CHART_3D_CONFIGS[chartType];
  if (!config || !config.supports3D) {
    return null;
  }

  return {
    recommended: true,
    defaultDepth: chartType === CHART_TYPES.PIE || chartType === CHART_TYPES.DOUGHNUT ? 20 : 8,
    defaultPosition: 'bottom-right',
    availablePositions: ['bottom-right', 'bottom-left', 'top-right', 'top-left'],
    depthRange: { min: 5, max: 25 }
  };
};

export default {
  CHART_3D_CONFIGS,
  generate3DBarDepth,
  generate3DPieEffect,
  Chart3DPlugin,
  Chart3DBarPlugin,
  darkenColor,
  apply3DTransformations,
  supports3D,
  get3DRecommendations
};