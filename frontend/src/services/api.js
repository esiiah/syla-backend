// frontend/src/services/api.js

class ApiService {
  constructor() {
    this.baseUrl = this.getBaseUrl();
    console.log('[API] Base URL detected:', this.baseUrl);
  }

  getBaseUrl() {
    const pathname = window.location.pathname;
    
    // Detect if running behind proxy
    if (pathname.includes('/proxy/')) {
      const match = pathname.match(/^(\/proxy\/\d+\/)/);
      if (match) {
        const proxyBase = match[1];
        return `${window.location.origin}${proxyBase}api`;
      }
    }
    
    // Default: direct connection
    return `${window.location.origin}/api`;
  }

  async request(endpoint, options = {}) {
    const url = `${this.baseUrl}${endpoint}`;
    
    const config = {
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    };

    console.log(`[API] ${options.method || 'GET'} ${url}`);

    const response = await fetch(url, config);
    return response;
  }

  get(endpoint, options = {}) {
    return this.request(endpoint, { ...options, method: 'GET' });
  }

  post(endpoint, body, options = {}) {
    return this.request(endpoint, {
      ...options,
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  patch(endpoint, body, options = {}) {
    return this.request(endpoint, {
      ...options,
      method: 'PATCH',
      body: JSON.stringify(body),
    });
  }

  delete(endpoint, options = {}) {
    return this.request(endpoint, { ...options, method: 'DELETE' });
  }
}

const api = new ApiService();
export default api;
