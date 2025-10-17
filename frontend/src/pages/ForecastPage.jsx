// frontend/src/pages/ForecastPage.jsx
import React, { useState, useContext, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Brain, AlertTriangle, ArrowUpDown } from 'lucide-react';
import Sidebar from '../components/Sidebar';
import MiniChartPreview from '../components/forecast/MiniChartPreview';
import AIInputPanel from '../components/forecast/AIInputPanel';
import ForecastSummary from '../components/forecast/ForecastSummary';
import ExpandedChartModal from '../components/forecast/ExpandedChartModal';
import { UserContext } from '../context/UserContext';
import { useChartData } from '../context/ChartDataContext';
import aiApi from '../services/aiApi';
import ForecastPagination from '../components/forecast/ForecastPagination';

export default function ForecastPage() {
  const navigate = useNavigate();
  const { user, theme, setTheme } = useContext(UserContext);
  const { chartData, hasData, isDataLoaded } = useChartData();
  
  // State
  const [isChartMinimized, setIsChartMinimized] = useState(false);
  const [selectedChart, setSelectedChart] = useState(null);
  const [forecastResult, setForecastResult] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [targetColumn, setTargetColumn] = useState('');
  const [sortOrder, setSortOrder] = useState('none');

  // Initialize target column
  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    
    if (isDataLoaded && hasData) {
      const yCol = chartData.yAxis || chartData.columns.find(c => 
        chartData.data.slice(0, 5).some(r => !isNaN(Number(r[c])))
      ) || chartData.columns[0];
      setTargetColumn(yCol);
    }
  }, [user, hasData, isDataLoaded, chartData, navigate]);

  // Handle forecast submission
  const handleForecastSubmit = async (config) => {
    if (!hasData || !targetColumn) {
      setError('No data available. Please upload data first.');
      return;
    }

    setError('');
    setIsLoading(true);
    setForecastResult(null);

    const payload = {
      csv_data: chartData.data,
      scenario_text: config.prompt,
      target_column: targetColumn,
      date_column: chartData.columns.find(c => 
        c.toLowerCase().includes('date') || 
        c.toLowerCase().includes('time')
      ) || undefined,
      model_preference: config.model,
      periods_ahead: config.periods,
      confidence_level: config.confidence
    };

    try {
      const result = await aiApi.createWhatIfForecast(payload);
      setForecastResult(result);
      setIsChartMinimized(true);
      
      localStorage.setItem('lastForecast', JSON.stringify({
        result,
        timestamp: new Date().toISOString(),
        scenario: config.prompt,
        targetColumn
      }));
    } catch (err) {
      console.error('Forecast error:', err);
      setError(err.message || 'Forecast generation failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle chart click
  const handleChartClick = (chartId) => {
    setSelectedChart(chartId);
  };

  // Handle export report
  const handleExportReport = () => {
    console.log('Exporting comprehensive report...');
  };

  // Prepare chart preview data
  const chartPreviewData = hasData ? {
    labels: chartData.data.slice(0, 20).map(row => row[chartData.xAxis] || ''),
    values: chartData.data.slice(0, 20).map(row => {
      const val = row[targetColumn];
      return typeof val === 'number' ? val : parseFloat(String(val).replace(/,/g, '')) || 0;
    })
  } : null;

  // Extract insights and recommendations from forecast
  const extractInsights = () => {
    if (!forecastResult) return [];
    
    const forecast = forecastResult.forecast?.forecast || [];
    if (forecast.length === 0) return [];

    const insights = [];
    const avg = forecast.reduce((a, b) => a + b, 0) / forecast.length;
    const trend = forecast[forecast.length - 1] - forecast[0];
    const trendPct = (trend / forecast[0]) * 100;

    insights.push(`Average forecast value is ${avg.toFixed(2)} over the prediction period`);
    
    if (trendPct > 10) {
      insights.push(`Strong upward trend detected with ${trendPct.toFixed(1)}% growth`);
    } else if (trendPct < -10) {
      insights.push(`Declining trend identified with ${Math.abs(trendPct).toFixed(1)}% decrease`);
    } else {
      insights.push(`Stable trend with ${Math.abs(trendPct).toFixed(1)}% variation`);
    }

    insights.push(`Confidence intervals indicate ${forecastResult.metadata?.confidence_level > 0.9 ? 'high' : 'moderate'} prediction certainty`);
    insights.push(`Model used: ${forecastResult.metadata?.model_used || 'Hybrid'} for optimal accuracy`);

    return insights;
  };

  const extractRecommendations = () => {
    if (!forecastResult) return [];

    const forecast = forecastResult.forecast?.forecast || [];
    if (forecast.length === 0) return [];

    const recommendations = [];
    const trend = forecast[forecast.length - 1] - forecast[0];

    if (trend > 0) {
      recommendations.push('Consider increasing inventory or capacity to meet projected demand growth');
      recommendations.push('Monitor early indicators to capitalize on upward momentum');
    } else if (trend < 0) {
      recommendations.push('Implement cost optimization strategies to mitigate declining trends');
      recommendations.push('Review market conditions and adjust positioning accordingly');
    }

    recommendations.push('Conduct monthly reviews to compare actual vs. forecast performance');
    recommendations.push('Update forecast quarterly as new data becomes available');
    recommendations.push('Set up automated alerts for significant deviations from projections');

    return recommendations;
  };

  const sortedForecastData = React.useMemo(() => {
  if (!forecastResult?.forecast) return null;
  
  const forecast = forecastResult.forecast;
  if (sortOrder === 'none') return forecast;
  
  const indices = forecast.forecast.map((_, i) => i);
  const sorted = [...indices].sort((a, b) => {
    if (sortOrder === 'asc') {
      return forecast.forecast[a] - forecast.forecast[b];
    }
    return forecast.forecast[b] - forecast.forecast[a];
  });
  
  return {
    forecast: sorted.map(i => forecast.forecast[i]),
    lower: forecast.lower ? sorted.map(i => forecast.lower[i]) : undefined,
    upper: forecast.upper ? sorted.map(i => forecast.upper[i]) : undefined,
    timestamps: sorted.map(i => forecast.timestamps[i])
  };
}, [forecastResult, sortOrder]);

  if (!user) {
    return (
      <div className="flex min-h-screen bg-gray-50 dark:bg-slate-950">
        <Sidebar theme={theme} setTheme={setTheme} onReportChange={() => {}} />
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="text-center max-w-md">
            <Brain size={64} className="mx-auto text-blue-600 mb-4" />
            <h2 className="text-2xl font-bold mb-2">AI Forecasting</h2>
            <p className="text-gray-600 dark:text-slate-400 mb-6">
              Sign in to access AI-powered forecasting
            </p>
            <div className="flex justify-center gap-3">
              <button 
                onClick={() => navigate('/signup')}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Sign Up
              </button>
              <button 
                onClick={() => navigate('/login')}
                className="px-6 py-2 border rounded-lg hover:bg-gray-50"
              >
                Sign In
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-gray-50 dark:bg-slate-950">
      {/* Sidebar - No Navbar */}
      <Sidebar theme={theme} setTheme={setTheme} onReportChange={() => {}} />
      
      <div className="flex-1 relative">
        {/* Mini Chart Preview */}
        <MiniChartPreview
          chartData={chartPreviewData}
          isMinimized={isChartMinimized}
          onToggle={() => setIsChartMinimized(!isChartMinimized)}
          chartTitle={chartData.chartTitle || targetColumn}
        />

        {/* Main Content */}
        <div className="p-6 max-w-7xl mx-auto">
          {/* Header */}
          <div className="flex items-center gap-4 mb-8">
            <div className="p-3 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl text-white shadow-lg">
              <Brain size={32} />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-800 dark:text-slate-200">
                AI Forecasting
              </h1>
              <p className="text-gray-600 dark:text-slate-400">
                Natural language scenario analysis • {chartData.data.length.toLocaleString()} data points
              </p>
            </div>
          </div>

          {/* Error Display */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700/50 rounded-xl flex items-start gap-3">
              <AlertTriangle className="text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" size={20} />
              <div className="text-sm text-red-700 dark:text-red-300">{error}</div>
            </div>
          )}

          {/* Charts Grid - Only show after forecast */}
          {forecastResult && (
            <div className="mb-6">
              {/* Sorting Toggle */}
                <div className="flex items-center justify-between mb-4">
                <div className="text-sm text-gray-600 dark:text-slate-400">
                  Showing {sortedForecastData?.forecast?.length || 0} forecast periods
                </div>
      
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-600 dark:text-slate-400">Sort:</span>
                  <div className="flex bg-white dark:bg-slate-800 rounded-lg border border-gray-300 dark:border-slate-600 p-1">
                    <button
                      onClick={() => setSortOrder('none')}
                      className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                        sortOrder === 'none'
                          ? 'bg-blue-600 text-white'
                          : 'text-gray-700 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700'
                      }`}
                    >
                      Default
                    </button>
                    <button
                      onClick={() => setSortOrder('asc')}
                      className={`px-3 py-1.5 rounded text-sm font-medium transition-colors flex items-center gap-1 ${
                        sortOrder === 'asc'
                          ? 'bg-blue-600 text-white'
                          : 'text-gray-700 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700'
                      }`}
                    >
                      <ArrowUpDown size={14} />
                      Ascending
                    </button>
                    <button
                      onClick={() => setSortOrder('desc')}
                      className={`px-3 py-1.5 rounded text-sm font-medium transition-colors flex items-center gap-1 ${
                        sortOrder === 'desc'
                          ? 'bg-blue-600 text-white'
                          : 'text-gray-700 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700'
                      }`}
                    >
                      <ArrowUpDown size={14} className="rotate-180" />
                      Descending
                    </button>
                  </div>
                </div>
              </div>
    
              <ForecastPagination
                forecastData={sortedForecastData}
                onChartClick={handleChartClick}
                selectedChart={selectedChart}
              />
            </div>
          )}

          {/* Summary Section - Only show after forecast */}
          {forecastResult && (
            <div className="mb-6">
              <ForecastSummary
                summary={forecastResult.explanation}
                insights={extractInsights()}
                recommendations={extractRecommendations()}
                forecastData={sortedForecastData}
                targetColumn={targetColumn}
                scenario={forecastResult.scenario_parsed?.target_change ? 
                  `${forecastResult.scenario_parsed.target_change > 0 ? 'Increase' : 'Decrease'} by ${Math.abs(forecastResult.scenario_parsed.target_change)}%` : 
                  'Custom scenario'}
                onExportReport={handleExportReport}
              />
            </div>
          )}
          {/* AI Input Panel - Always visible at bottom */}
          <AIInputPanel
            onSubmit={handleForecastSubmit}
            isLoading={isLoading}
            targetColumn={targetColumn}
          />

          {/* No Data Message */}
          {!hasData && (
            <div className="mt-6 p-8 bg-white dark:bg-slate-900 rounded-2xl border text-center">
              <h3 className="text-xl font-semibold mb-2">No Data Available</h3>
              <p className="text-gray-600 dark:text-slate-400 mb-4">
                Upload CSV data to start forecasting
              </p>
              <button
                onClick={() => navigate('/')}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Upload Data
              </button>
            </div>
          )}
        </div>

        {/* Expanded Chart Modal */}
        {selectedChart && forecastResult && (
          <ExpandedChartModal
            chartType={selectedChart}
            data={sortedForecastData}
            onClose={() => setSelectedChart(null)}
            title={`${targetColumn} Forecast - ${selectedChart.charAt(0).toUpperCase() + selectedChart.slice(1)} Chart`}
          />
        )}
      </div>
    </div>
  );
}
