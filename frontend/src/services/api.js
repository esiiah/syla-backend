// frontend/src/services/api.js

class ApiService {
  constructor() {
    this.baseUrl = this.getBaseUrl();
    console.log('[API] Base URL detected:', this.baseUrl);
  }

  getBaseUrl() {
    const pathname = window.location.pathname;

    // ✅ Detect VS Code code-server proxy, keep it RELATIVE
    const proxyMatch = pathname.match(/\/proxy\/\d+\//);
    if (proxyMatch) {
      return `${proxyMatch[0]}api`; // e.g. /proxy/8000/api
    }

    // ✅ Fallback for local dev or direct port access
    const envBase =
      import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000/api';
    return envBase;
  }

  async request(endpoint, options = {}) {
    // Ensure endpoint always begins with a slash
    const url = `${this.baseUrl}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;

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
