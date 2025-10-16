// frontend/src/utils/pdfChartGenerator.js
import { Chart } from 'chart.js/auto';

/**
 * Convert chart to base64 image for PDF embedding
 */
export const chartToBase64 = (chartType, data, options = {}) => {
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas');
    canvas.width = options.width || 600;
    canvas.height = options.height || 400;
    
    const ctx = canvas.getContext('2d');
    
    // Paint white background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Create temporary chart
    const chart = new Chart(ctx, {
      type: chartType,
      data: data,
      options: {
        ...options,
        animation: false,
        responsive: false,
        maintainAspectRatio: false,
        plugins: {
          ...options.plugins,
          legend: {
            display: options.plugins?.legend?.display ?? true,
            position: options.plugins?.legend?.position || 'bottom',
            labels: {
              font: { size: 10 },
              boxWidth: 12,
              padding: 8,
              ...options.plugins?.legend?.labels
            }
          },
          datalabels: {
            display: true,
            color: '#000',
            font: { size: 9, weight: 'bold' },
            formatter: (value) => {
              if (typeof value === 'number') {
                return value.toFixed(0);
              }
              return value;
            },
            anchor: 'end',
            align: 'top',
            offset: 4,
            ...options.plugins?.datalabels
          }
        }
      }
    });
    
    // Wait for chart to render
    setTimeout(() => {
      const base64 = canvas.toDataURL('image/png', 1.0);
      chart.destroy();
      resolve(base64);
    }, 100);
  });
};

/**
 * Analyze forecast trend and generate insights
 */
export const analyzeForecastTrend = (forecastData) => {
  const forecast = forecastData?.forecast;
  
  if (!forecast || !Array.isArray(forecast) || forecast.length < 2) {
    return {
      trend: 'insufficient_data',
      trendPct: 0,
      peak: 0,
      trough: 0,
      volatility: 0,
      hasSeasonality: false,
      insights: ['Insufficient data for comprehensive analysis']
    };
  }

  const values = forecast.filter(v => typeof v === 'number' && !isNaN(v));
  
  if (values.length < 2) {
    return {
      trend: 'insufficient_data',
      trendPct: 0,
      peak: 0,
      trough: 0,
      volatility: 0,
      hasSeasonality: false,
      insights: ['Insufficient valid data for comprehensive analysis']
    };
  }

  const first = values[0];
  const last = values[values.length - 1];
  const trend = last - first;
  const trendPct = first !== 0 ? (trend / first) * 100 : 0;
  
  const peak = Math.max(...values);
  const trough = Math.min(...values);
  const avgValue = (peak + trough) / 2;
  const volatility = avgValue !== 0 ? ((peak - trough) / avgValue) * 100 : 0;
  
  // Detect seasonality (simplified)
  const hasSeasonality = values.length >= 12 && detectSeasonality(values);
  
  return {
    trend: trendPct > 5 ? 'upward' : trendPct < -5 ? 'downward' : 'stable',
    trendPct: trendPct.toFixed(1),
    peak: peak.toFixed(2),
    trough: trough.toFixed(2),
    volatility: volatility.toFixed(1),
    hasSeasonality,
    insights: generateInsights(trendPct, volatility, hasSeasonality, values)
  };
};

/**
 * Detect seasonality in data
 */
const detectSeasonality = (values) => {
  if (values.length < 12) return false;
  
  // Simple seasonality detection: check for repeating patterns
  const quarters = [];
  for (let i = 0; i < values.length; i += 3) {
    const quarterData = values.slice(i, i + 3);
    if (quarterData.length === 3) {
      const avg = quarterData.reduce((a, b) => a + b, 0) / 3;
      quarters.push(avg);
    }
  }
  
  return quarters.length >= 4;
};

/**
 * Generate insights from trend analysis
 */
const generateInsights = (trendPct, volatility, seasonal, values) => {
  const insights = [];
  
  // Trend insights
  if (trendPct > 10) {
    insights.push(`Strong upward trend detected with ${Math.abs(trendPct).toFixed(1)}% growth over forecast period`);
    insights.push('Demand is increasing steadily - consider scaling operations accordingly');
  } else if (trendPct > 5) {
    insights.push(`Moderate growth trend of ${trendPct}% indicates positive momentum`);
    insights.push('Continue current strategies while monitoring for acceleration opportunities');
  } else if (trendPct < -10) {
    insights.push(`Significant declining trend of ${Math.abs(trendPct).toFixed(1)}% requires immediate attention`);
    insights.push('Implement corrective measures to reverse downward trajectory');
  } else if (trendPct < -5) {
    insights.push(`Declining trend of ${Math.abs(trendPct).toFixed(1)}% detected - monitor closely`);
    insights.push('Review strategies and identify factors contributing to decline');
  } else {
    insights.push('Forecast shows stable performance with minimal deviation from baseline');
    insights.push('Focus on maintaining consistency while seeking optimization opportunities');
  }
  
  // Volatility insights
  if (volatility > 30) {
    insights.push(`High volatility (${volatility}%) suggests unpredictable fluctuations`);
    insights.push('Consider risk mitigation strategies and contingency planning');
  } else if (volatility > 15) {
    insights.push(`Moderate volatility (${volatility}%) indicates some variability in projections`);
  } else {
    insights.push('Low volatility indicates stable and predictable forecast patterns');
  }
  
  // Seasonality insights
  if (seasonal) {
    insights.push('Seasonal patterns identified - adjust inventory and staffing accordingly');
    insights.push('Plan for cyclical variations in demand throughout the year');
  }
  
  // Statistical summary
  const avg = values.reduce((a, b) => a + b, 0) / values.length;
  insights.push(`Average projected value: ${avg.toFixed(2)} across all forecast periods`);
  
  return insights;
};