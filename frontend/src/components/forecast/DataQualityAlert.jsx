// frontend/src/components/forecast/DataQualityAlert.jsx
import React from 'react';
import { AlertTriangle, Info, CheckCircle, X } from 'lucide-react';

export default function DataQualityAlert({ issues, warnings, onDismiss }) {
  if (!issues?.length && !warnings?.length) return null;

  const hasIssues = issues && issues.length > 0;

  return (
    <div
      className={`p-4 rounded-xl border-2 ${
        hasIssues
          ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-700'
          : 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-700'
      }`}
    >
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 mt-1">
          {hasIssues ? (
            <AlertTriangle size={20} className="text-red-600 dark:text-red-400" />
          ) : (
            <Info size={20} className="text-yellow-600 dark:text-yellow-400" />
          )}
        </div>

        <div className="flex-1">
          <h3
            className={`font-semibold mb-2 ${
              hasIssues
                ? 'text-red-800 dark:text-red-300'
                : 'text-yellow-800 dark:text-yellow-300'
            }`}
          >
            {hasIssues ? 'Data Quality Issues Detected' : 'Data Quality Warnings'}
          </h3>

          {hasIssues && (
            <div className="mb-3">
              <p className="text-sm text-red-700 dark:text-red-300 mb-2 font-medium">
                The following issues must be addressed before forecasting:
              </p>
              <ul className="space-y-1">
                {issues.map((issue, idx) => (
                  <li
                    key={idx}
                    className="text-sm text-red-700 dark:text-red-300 flex items-start gap-2"
                  >
                    <span className="mt-1">•</span>
                    <span>{issue}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {warnings && warnings.length > 0 && (
            <div>
              <p className="text-sm text-yellow-700 dark:text-yellow-300 mb-2 font-medium">
                {hasIssues ? 'Additional warnings:' : 'Please note:'}
              </p>
              <ul className="space-y-1">
                {warnings.map((warning, idx) => (
                  <li
                    key={idx}
                    className="text-sm text-yellow-700 dark:text-yellow-300 flex items-start gap-2"
                  >
                    <span className="mt-1">•</span>
                    <span>{warning}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {hasIssues && (
            <div className="mt-3 p-3 bg-white dark:bg-slate-800 rounded-lg">
              <p className="text-sm font-semibold text-gray-800 dark:text-slate-200 mb-2">
                Suggested Actions:
              </p>
              <ul className="text-sm text-gray-600 dark:text-slate-400 space-y-1">
                <li>• Upload more data (minimum 6 points recommended)</li>
                <li>• Ensure target column contains numeric values</li>
                <li>• Remove or fill missing values in your dataset</li>
                <li>• Check for data entry errors or inconsistencies</li>
              </ul>
            </div>
          )}
        </div>

        {onDismiss && (
          <button
            onClick={onDismiss}
            className="flex-shrink-0 p-1 hover:bg-white/50 dark:hover:bg-slate-800 rounded transition-colors"
          >
            <X size={18} />
          </button>
        )}
      </div>
    </div>
  );
}
