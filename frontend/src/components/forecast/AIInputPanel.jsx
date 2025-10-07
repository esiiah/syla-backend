// frontend/src/components/forecast/AIInputPanel.jsx
import React, { useState } from 'react';
import { Sparkles, ChevronDown, ChevronUp, Zap, Bot, TrendingUp } from 'lucide-react';

export default function AIInputPanel({ onSubmit, isLoading, targetColumn }) {
  const [prompt, setPrompt] = useState('');
  const [model, setModel] = useState('hybrid');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [periods, setPeriods] = useState(12);
  const [confidence, setConfidence] = useState(0.95);

  const models = [
    { 
      value: 'gpt', 
      label: 'GPT', 
      icon: Bot,
      description: 'AI-powered scenario analysis'
    },
    { 
      value: 'hybrid', 
      label: 'Hybrid', 
      icon: Zap,
      description: 'Best of both worlds'
    },
    { 
      value: 'prophet', 
      label: 'Prophet', 
      icon: TrendingUp,
      description: 'Statistical forecasting'
    }
  ];

  const examplePrompts = [
    "20% sales increase over next 6 months due to new product launch",
    "15% decline in Q3 due to seasonal factors, recovery in Q4",
    "Market expansion: 30% growth in new regions starting month 4"
  ];

  const handleSubmit = () => {
    if (!prompt.trim() || isLoading) return;
    
    onSubmit({
      prompt: prompt.trim(),
      model,
      periods,
      confidence
    });
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && e.ctrlKey) {
      handleSubmit();
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-700 shadow-lg overflow-hidden">
      {/* Model Selection */}
      <div className="p-4 border-b border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800/50">
        <div className="flex items-center gap-2">
          {models.map((m) => {
            const IconComponent = m.icon;
            return (
              <button
                key={m.value}
                onClick={() => setModel(m.value)}
                title={m.description}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium transition-all ${
                  model === m.value 
                    ? 'bg-blue-600 text-white shadow-md scale-105' 
                    : 'bg-white dark:bg-slate-900 text-gray-700 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-800 border border-gray-200 dark:border-slate-700'
                }`}
              >
                <IconComponent size={18} />
                {m.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Input Area */}
      <div className="p-6">
        <div className="relative">
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={`Write your forecast scenario for ${targetColumn || 'your data'}...\n\nExample: "Predict 25% growth over next 12 months with seasonal variations..."`}
            className="w-full h-32 p-4 pr-16 rounded-xl border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-gray-800 dark:text-slate-200 placeholder-gray-400 dark:placeholder-slate-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none transition-all text-sm leading-relaxed"
            maxLength={500}
            disabled={isLoading}
          />
          <div className="absolute bottom-3 right-3 flex flex-col items-end gap-1">
            <span className="text-xs text-gray-400 dark:text-slate-500 font-mono">
              {prompt.length}/500
            </span>
            <span className="text-xs text-gray-400 dark:text-slate-500">
              Ctrl+Enter to submit
            </span>
          </div>
        </div>

        {/* Quick Examples */}
        {!prompt && (
          <div className="mt-3 flex flex-wrap gap-2">
            {examplePrompts.map((example, idx) => (
              <button
                key={idx}
                onClick={() => setPrompt(example)}
                className="text-xs px-3 py-1.5 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
              >
                {example.slice(0, 40)}...
              </button>
            ))}
          </div>
        )}

        {/* Advanced Options */}
        <div className="mt-4 border-t border-gray-200 dark:border-slate-700 pt-4">
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="flex items-center gap-2 text-sm font-medium text-gray-600 dark:text-slate-400 hover:text-gray-800 dark:hover:text-slate-200 transition-colors"
          >
            <span>Advanced Settings</span>
            {showAdvanced ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>

          {showAdvanced && (
            <div className="mt-4 space-y-4 p-4 bg-gray-50 dark:bg-slate-800/50 rounded-lg">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-gray-700 dark:text-slate-300">
                    Forecast Periods
                  </label>
                  <span className="text-sm font-semibold text-blue-600 dark:text-blue-400">
                    {periods}
                  </span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="60"
                  value={periods}
                  onChange={(e) => setPeriods(Number(e.target.value))}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-slate-700"
                />
                <div className="flex justify-between text-xs text-gray-500 dark:text-slate-500 mt-1">
                  <span>1</span>
                  <span>60</span>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-gray-700 dark:text-slate-300">
                    Confidence Level
                  </label>
                  <span className="text-sm font-semibold text-blue-600 dark:text-blue-400">
                    {Math.round(confidence * 100)}%
                  </span>
                </div>
                <input
                  type="range"
                  min="0.5"
                  max="0.99"
                  step="0.01"
                  value={confidence}
                  onChange={(e) => setConfidence(Number(e.target.value))}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-slate-700"
                />
                <div className="flex justify-between text-xs text-gray-500 dark:text-slate-500 mt-1">
                  <span>50%</span>
                  <span>99%</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Submit Button */}
        <button
          onClick={handleSubmit}
          disabled={!prompt.trim() || isLoading}
          className={`w-full mt-4 px-6 py-3.5 rounded-xl font-semibold transition-all flex items-center justify-center gap-2 ${
            prompt.trim() && !isLoading
              ? 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg hover:shadow-xl transform hover:-translate-y-0.5'
              : 'bg-gray-300 dark:bg-slate-700 text-gray-500 dark:text-slate-500 cursor-not-allowed'
          }`}
        >
          {isLoading ? (
            <>
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              <span>Generating Forecast...</span>
            </>
          ) : (
            <>
              <Sparkles size={20} />
              <span>Generate Forecast</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
