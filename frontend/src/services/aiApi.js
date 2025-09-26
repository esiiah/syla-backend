// frontend/src/services/aiApi.js

const API_BASE_URL = '/api';

class AIApiService {
  constructor() {
    this.baseURL = API_BASE_URL;
  }

  // Helper method for making HTTP requests with error handling
  async makeRequest(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    const config = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      credentials: 'include', // Include cookies for auth
      ...options,
    };

    try {
      const response = await fetch(url, config);
      
      if (!response.ok) {
        let errorMessage = 'Request failed';
        try {
          const errorData = await response.json();
          errorMessage = errorData.detail || errorData.message || errorMessage;
        } catch {
          errorMessage = `HTTP ${response.status}: ${response.statusText}`;
        }
        throw new Error(errorMessage);
      }

      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        return await response.json();
      } else {
        return await response.text();
      }
    } catch (error) {
      console.error(`API request failed: ${endpoint}`, error);
      throw error;
    }
  }

  // Create what-if forecast
  async createWhatIfForecast(payload) {
    return await this.makeRequest('/forecast/whatif', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  // Parse scenario text into structured parameters
  async parseScenario(scenarioText, availableColumns) {
    return await this.makeRequest('/forecast/scenario/parse', {
      method: 'POST',
      body: JSON.stringify({
        scenario_text: scenarioText,
        available_columns: availableColumns,
      }),
    });
  }

  // Get available forecasting models
  async getAvailableModels() {
    return await this.makeRequest('/forecast/models', {
      method: 'GET',
    });
  }

  // Get user's AI usage statistics
  async getUserUsage(userId) {
    return await this.makeRequest(`/forecast/usage/${userId}`, {
      method: 'GET',
    });
  }

  // Clear user's forecast cache
  async clearCache() {
    return await this.makeRequest('/forecast/cache/clear', {
      method: 'DELETE',
    });
  }

  // Chart-related API endpoints
  
  // Generate chart payload from data
  async generateChartPayload(payload) {
    return await this.makeRequest('/chart/payload', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  // Save chart configuration
  async saveChart(chartPayload, description = '', ownerId = null) {
    return await this.makeRequest('/charts/save', {
      method: 'POST',
      body: JSON.stringify({
        chart_payload: chartPayload,
        description,
        owner_id: ownerId,
      }),
    });
  }

  // Export chart
  async exportChart(exportConfig) {
    return await this.makeRequest('/charts/export', {
      method: 'POST',
      body: JSON.stringify(exportConfig),
    });
  }

  // Get export job status
  async getExportStatus(jobId) {
    return await this.makeRequest(`/export/status/${jobId}`, {
      method: 'GET',
    });
  }

  // Data management endpoints

  // Get available datasets
  async getDatasets() {
    return await this.makeRequest('/datasets', {
      method: 'GET',
    });
  }

  // Get data preview
  async getDataPreview(fileId, rows = 10) {
    return await this.makeRequest(`/preview?file_id=${fileId}&n=${rows}`, {
      method: 'GET',
    });
  }

  // Upload file
  async uploadFile(file, onProgress = null) {
    const formData = new FormData();
    formData.append('file', file);

    try {
      return await new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        
        if (onProgress) {
          xhr.upload.onprogress = (e) => {
            if (e.lengthComputable) {
              const percentComplete = (e.loaded / e.total) * 100;
              onProgress(Math.round(percentComplete));
            }
          };
        }

        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            try {
              const response = JSON.parse(xhr.responseText);
              resolve(response);
            } catch (error) {
              reject(new Error('Invalid JSON response'));
            }
          } else {
            try {
              const errorData = JSON.parse(xhr.responseText);
              reject(new Error(errorData.detail || 'Upload failed'));
            } catch {
              reject(new Error(`HTTP ${xhr.status}: ${xhr.statusText}`));
            }
          }
        };

        xhr.onerror = () => reject(new Error('Network error during upload'));
        xhr.ontimeout = () => reject(new Error('Upload timeout'));

        xhr.open('POST', `${this.baseURL}/upload`);
        xhr.withCredentials = true; // Include cookies
        xhr.timeout = 300000; // 5 minutes timeout
        xhr.send(formData);
      });
    } catch (error) {
      console.error('File upload failed:', error);
      throw error;
    }
  }

  // Forecast management endpoints

  // Create standard forecast (non-AI)
  async createForecast(payload) {
    return await this.makeRequest('/forecast', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  // Get forecast status
  async getForecastStatus(jobId) {
    return await this.makeRequest(`/forecast/${jobId}`, {
      method: 'GET',
    });
  }

  // Get model metadata
  async getModelMetadata(modelId) {
    return await this.makeRequest(`/models/${modelId}`, {
      method: 'GET',
    });
  }

  // Utility methods

  // Check if user is authenticated (simple check)
  async checkAuth() {
    try {
      const response = await this.makeRequest('/auth/me', {
        method: 'GET',
      });
      return response;
    } catch (error) {
      return null;
    }
  }

  // Health check
  async healthCheck() {
    return await this.makeRequest('/health', {
      method: 'GET',
    });
  }

  // Retry mechanism for failed requests
  async retryRequest(requestFn, maxRetries = 3, delay = 1000) {
    let lastError;
    
    for (let i = 0; i < maxRetries; i++) {
      try {
        return await requestFn();
      } catch (error) {
        lastError = error;
        
        // Don't retry on authentication errors
        if (error.message.includes('401') || error.message.includes('403')) {
          throw error;
        }
        
        // Don't retry on validation errors
        if (error.message.includes('400')) {
          throw error;
        }
        
        if (i < maxRetries - 1) {
          await new Promise(resolve => setTimeout(resolve, delay * Math.pow(2, i)));
        }
      }
    }
    
    throw lastError;
  }

  // Batch operations
  async batchOperation(operations, concurrencyLimit = 5) {
    const results = [];
    const errors = [];
    
    for (let i = 0; i < operations.length; i += concurrencyLimit) {
      const batch = operations.slice(i, i + concurrencyLimit);
      const batchPromises = batch.map(async (operation, index) => {
        try {
          const result = await operation();
          return { index: i + index, result, error: null };
        } catch (error) {
          return { index: i + index, result: null, error };
        }
      });
      
      const batchResults = await Promise.all(batchPromises);
      
      for (const item of batchResults) {
        if (item.error) {
          errors.push({ index: item.index, error: item.error });
        } else {
          results.push({ index: item.index, result: item.result });
        }
      }
    }
    
    return { results, errors };
  }

  // Cache management
  getFromCache(key) {
    try {
      const cached = localStorage.getItem(`aiApi_cache_${key}`);
      if (cached) {
        const { data, timestamp, ttl } = JSON.parse(cached);
        if (Date.now() - timestamp < ttl) {
          return data;
        } else {
          localStorage.removeItem(`aiApi_cache_${key}`);
        }
      }
    } catch (error) {
      console.warn('Cache read error:', error);
    }
    return null;
  }

  setCache(key, data, ttlMinutes = 30) {
    try {
      const cacheItem = {
        data,
        timestamp: Date.now(),
        ttl: ttlMinutes * 60 * 1000
      };
      localStorage.setItem(`aiApi_cache_${key}`, JSON.stringify(cacheItem));
    } catch (error) {
      console.warn('Cache write error:', error);
    }
  }

  clearCache() {
    try {
      const keys = Object.keys(localStorage).filter(key => key.startsWith('aiApi_cache_'));
      keys.forEach(key => localStorage.removeItem(key));
    } catch (error) {
      console.warn('Cache clear error:', error);
    }
  }
}

// Create singleton instance
const aiApi = new AIApiService();

export default aiApi;
