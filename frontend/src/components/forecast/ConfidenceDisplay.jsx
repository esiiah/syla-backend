// frontend/src/components/forecast/ConfidenceDisplay.jsx
import React from 'react';
import { AlertCircle, CheckCircle, Info, TrendingUp, Database } from 'lucide-react';

export default function ConfidenceDisplay({ validationData }) {
  if (!validationData) return null;

  const { confidence_score, data_quality, metrics } = validationData;

  const getRatingColor = (rating) => {
    switch (rating?.toLowerCase()) {
      case 'high':
      case 'excellent':
        return 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-700';
      case 'medium':
      case 'good':
        return 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-700';
      case 'low':
      case 'fair':
        return 'text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-700';
      default:
        return 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-700';
    }
  };

  const getIcon = (rating) => {
    const size = 20;
    switch (rating?.toLowerCase()) {
      case 'high':
      case 'excellent':
        return <CheckCircle size={size} />;
      case 'medium':
      case 'good':
        return <Info size={size} />;
      default:
        return <AlertCircle size={size} />;
    }
  };

  const confidenceRating = confidence_score?.rating || 'Unknown';
  const confidencePercent = confidence_score?.overall_score || 0;

  return (
    <div className="space-y-4">
      {/* Overall Confidence Score */}
      <div className={`p-4 rounded-xl border-2 ${getRatingColor(confidenceRating)}`}>
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 mt-1">
            {getIcon(confidenceRating)}
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-lg mb-1">
              Forecast Confidence: {confidenceRating}
            </h3>
            <div className="flex items-center gap-3 mb-3">
              <div className="flex-1 bg-white dark:bg-slate-800 rounded-full h-3 overflow-hidden">
                <div
                  className={`h-full transition-all duration-500 ${
                    confidenceRating === 'High' || confidenceRating === 'Excellent'
                      ? 'bg-green-600'
                      : confidenceRating === 'Medium' || confidenceRating === 'Good'
                      ? 'bg-blue-600'
                      : confidenceRating === 'Low' || confidenceRating === 'Fair'
                      ? 'bg-orange-600'
                      : 'bg-red-600'
                  }`}
                  style={{ width: `${confidencePercent}%` }}
                />
              </div>
              <span className="font-bold text-lg">{confidencePercent.toFixed(0)}%</span>
            </div>
            
            {confidence_score?.recommendations && (
              <div className="text-sm space-y-1">
                {confidence_score.recommendations.map((rec, idx) => (
                  <div key={idx} className="flex items-start gap-2">
                    <span className="text-xs mt-0.5">•</span>
                    <span>{rec}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Validation Metrics */}
      {metrics && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="p-3 bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700">
            <div className="text-xs text-gray-500 dark:text-slate-400 mb-1">MAPE</div>
            <div className="text-lg font-bold text-gray-800 dark:text-slate-200">
              {metrics.mape?.toFixed(2)}%
            </div>
            <div className="text-xs text-gray-500 mt-1">
              {metrics.mape < 10 ? 'Excellent' : metrics.mape < 20 ? 'Good' : 'Fair'}
            </div>
          </div>

          <div className="p-3 bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700">
            <div className="text-xs text-gray-500 dark:text-slate-400 mb-1">RMSE</div>
            <div className="text-lg font-bold text-gray-800 dark:text-slate-200">
              {metrics.rmse?.toFixed(2)}
            </div>
            <div className="text-xs text-gray-500 mt-1">Root Mean Sq Error</div>
          </div>

          <div className="p-3 bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700">
            <div className="text-xs text-gray-500 dark:text-slate-400 mb-1">MAE</div>
            <div className="text-lg font-bold text-gray-800 dark:text-slate-200">
              {metrics.mae?.toFixed(2)}
            </div>
            <div className="text-xs text-gray-500 mt-1">Mean Absolute Error</div>
          </div>

          <div className="p-3 bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700">
            <div className="text-xs text-gray-500 dark:text-slate-400 mb-1">R²</div>
            <div className="text-lg font-bold text-gray-800 dark:text-slate-200">
              {metrics.r_squared?.toFixed(3)}
            </div>
            <div className="text-xs text-gray-500 mt-1">
              {metrics.r_squared > 0.7 ? 'Strong fit' : 'Moderate fit'}
            </div>
          </div>
        </div>
      )}

      {/* Data Quality Summary */}
      {data_quality && (
        <div className="p-4 bg-gradient-to-r from-gray-50 to-blue-50 dark:from-slate-800 dark:to-slate-900 rounded-xl border border-gray-200 dark:border-slate-700">
          <div className="flex items-center gap-2 mb-3">
            <Database size={18} className="text-gray-600 dark:text-slate-400" />
            <h4 className="font-semibold text-sm text-gray-800 dark:text-slate-200">
              Data Quality: {data_quality.rating}
            </h4>
            <span className="ml-auto text-sm font-bold text-gray-800 dark:text-slate-200">
              {data_quality.score?.toFixed(0)}%
            </span>
          </div>

          {confidence_score?.factors && (
            <div className="grid grid-cols-3 gap-2 text-xs">
              {Object.entries(confidence_score.factors).map(([key, value]) => (
                <div key={key} className="flex flex-col">
                  <span className="text-gray-500 dark:text-slate-400 capitalize mb-1">
                    {key.replace(/_/g, ' ')}
                  </span>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 bg-gray-200 dark:bg-slate-700 rounded-full h-2">
                      <div
                        className={`h-full rounded-full ${
                          value >= 0.8
                            ? 'bg-green-600'
                            : value >= 0.6
                            ? 'bg-blue-600'
                            : 'bg-orange-600'
                        }`}
                        style={{ width: `${value * 100}%` }}
                      />
                    </div>
                    <span className="text-xs font-semibold">{(value * 100).toFixed(0)}%</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Interpretation Guide */}
      <div className="p-3 bg-gray-50 dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700">
        <h4 className="text-xs font-semibold text-gray-700 dark:text-slate-300 mb-2">
          Understanding These Metrics
        </h4>
        <div className="text-xs text-gray-600 dark:text-slate-400 space-y-1">
          <p>
            <strong>MAPE:</strong> Average error as percentage. Lower is better ({"<10%"} is excellent).
          </p>
          <p>
            <strong>Confidence:</strong> Overall reliability based on data quality, quantity, and validation accuracy.
          </p>
          <p>
            <strong>R²:</strong> How well the model fits the data (0-1 scale, higher is better).
          </p>
        </div>
      </div>
    </div>
  );
}
