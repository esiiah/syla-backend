// frontend/src/services/aiApi.js
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';

class AIApiService {
  constructor() {
    this.baseURL = `${API_BASE_URL}/forecast`;
  }

  // Get auth token from localStorage
  getAuthToken() {
    return localStorage.getItem('token');
  }

  // Common fetch wrapper with auth and error handling
  async fetchWithAuth(endpoint, options = {}) {
    const token = this.getAuthToken();
    
    const config = {
      headers: {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` }),
        ...options.headers,
      },
      ...options,
    };

    try {
      const response = await fetch(`${this.baseURL}${endpoint}`, config);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.detail || 
          errorData.error || 
          `API Error: ${response.status} ${response.statusText}`
        );
      }

      return await response.json();
    } catch (error) {
      console.error(`API call failed: ${endpoint}`, error);
      
      if (error.name === 'TypeError' && error.message.includes('fetch')) {
        throw new Error('Network error - please check your connection');
      }
      
      throw error;
    }
  }

  // Create what-if forecast
  async createWhatIfForecast(requestData) {
    return this.fetchWithAuth('/whatif', {
      method: 'POST',
      body: JSON.stringify(requestData),
    });
  }

  // Parse scenario text into structured parameters
  async parseScenario(scenarioText, availableColumns) {
    return this.fetchWithAuth('/scenario/parse', {
      method: 'POST',
      body: JSON.stringify({
        scenario_text: scenarioText,
        available_columns: availableColumns,
      }),
    });
  }

  // Get available AI models and their capabilities
  async getAvailableModels() {
    return this.fetchWithAuth('/models', {
      method: 'GET',
    });
  }

  // Get user's AI usage statistics
  async getUserUsage(userId) {
    return this.fetchWithAuth(`/usage/${userId}`, {
      method: 'GET',
    });
  }

  // Clear user's cached forecasts
  async clearUserCache() {
    return this.fetchWithAuth('/cache/clear', {
      method: 'DELETE',
    });
  }

  // Utility: Validate forecast request before sending
  validateForecastRequest(data) {
    const errors = [];

    if (!data.csv_data && !data.dataset_id) {
      errors.push('Either csv_data or dataset_id is required');
    }

    if (!data.scenario_text || data.scenario_text.trim().length === 0) {
      errors.push('Scenario text is required');
    }

    if (data.scenario_text && data.scenario_text.length > 500) {
      errors.push('Scenario text must be 500 characters or less');
    }

    if (!data.target_column) {
      errors.push('Target column is required');
    }

    if (data.periods_ahead && (data.periods_ahead < 1 || data.periods_ahead > 120)) {
      errors.push('Periods ahead must be between 1 and 120');
    }

    if (data.confidence_level && (data.confidence_level < 0.5 || data.confidence_level > 0.99)) {
      errors.push('Confidence level must be between 0.5 and 0.99');
    }

    const validModels = ['auto', 'gpt', 'prophet', 'hybrid'];
    if (data.model_preference && !validModels.includes(data.model_preference)) {
      errors.push(`Model preference must be one of: ${validModels.join(', ')}`);
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  // Utility: Format forecast data for charting
  formatForecastForChart(forecastResult) {
    if (!forecastResult || !forecastResult.forecast) {
      return null;
    }

    const { forecast, lower, upper, timestamps } = forecastResult.forecast;

    return {
      labels: timestamps || forecast.map((_, i) => `Period ${i + 1}`),
      datasets: [
        {
          label: 'Forecast',
          data: forecast,
          borderColor: '#3b82f6',
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
          tension: 0.4,
        },
        ...(lower && upper ? [
          {
            label: 'Upper Bound',
            data: upper,
            borderColor: 'rgba(59, 130, 246, 0.3)',
            backgroundColor: 'rgba(59, 130, 246, 0.05)',
            fill: '+1',
            tension: 0.4,
          },
          {
            label: 'Lower Bound', 
            data: lower,
            borderColor: 'rgba(59, 130, 246, 0.3)',
            backgroundColor: 'rgba(59, 130, 246, 0.05)',
            tension: 0.4,
          }
        ] : [])
      ],
    };
  }

  // Utility: Export forecast data as CSV
  exportForecastToCSV(forecastResult, filename = 'forecast_data.csv') {
    if (!forecastResult || !forecastResult.forecast) {
      throw new Error('No forecast data to export');
    }

    const { forecast, lower, upper, timestamps } = forecastResult.forecast;
    
    const headers = ['Date', 'Forecast'];
    if (lower && upper) {
      headers.push('Lower_Bound', 'Upper_Bound');
    }

    const rows = [headers.join(',')];

    for (let i = 0; i < forecast.length; i++) {
      const row = [
        timestamps ? timestamps[i] : `Period_${i + 1}`,
        forecast[i].toFixed(2)
      ];

      if (lower && upper) {
        row.push(lower[i].toFixed(2), upper[i].toFixed(2));
      }

      rows.push(row.join(','));
    }

    const csvContent = rows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    
    // Create download link
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
    
    // Clean up
    URL.revokeObjectURL(link.href);
  }

  // Utility: Get cost estimate for forecast request
  getCostEstimate(modelPreference, periodsAhead = 12) {
    const costMap = {
      'prophet': '$0.00',
      'gpt': '$0.02 - $0.05',
      'hybrid': '$0.01 - $0.03',
      'auto': '$0.01 - $0.03'
    };

    const baseCost = costMap[modelPreference] || costMap['auto'];
    
    if (periodsAhead > 50) {
      return `${baseCost} (extended forecast)`;
    }
    
    return baseCost;
  }

  // Health check for AI services
  async checkAIHealth() {
    try {
      const response = await fetch(`${API_BASE_URL}/health`);
      const data = await response.json();
      return {
        available: response.ok,
        ai_enabled: data.ai_enabled || false,
        message: data.message || 'Unknown status'
      };
    } catch (error) {
      return {
        available: false,
        ai_enabled: false,
        error: error.message
      };
    }
  }
}

// Export singleton instance
export const aiApi = new AIApiService();
export default aiApi;
