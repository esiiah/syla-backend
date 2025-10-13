// frontend/src/services/api.js
class ApiService {
  constructor() {
    this.baseUrl = this.getBaseUrl();
    console.log("[API] Base URL detected:", this.baseUrl);
  }

  getBaseUrl() {
    const pathname = window.location.pathname;

    // ✅ Detect if running inside VS Code code-server proxy
    if (pathname.includes("/proxy/")) {
      // Extract the proxy base path (e.g., "/proxy/8000/")
      const proxyMatch = pathname.match(/^(\/proxy\/\d+\/)/);
      if (proxyMatch) {
        const proxyBase = proxyMatch[1]; // e.g., "/proxy/8000/"
        // Construct full URL with proxy path
        return `${window.location.origin}${proxyBase}api`;
      }
    }

    // ✅ Normal local/production mode (Docker)
    return import.meta.env.VITE_API_BASE_URL || "/api";
  }

  async request(endpoint, options = {}) {
    const url = `${this.baseUrl}${endpoint.startsWith("/") ? "" : "/"}${endpoint}`;
    const config = {
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        ...options.headers,
      },
      ...options,
    };
    console.log(`[API] ${options.method || "GET"} ${url}`);
    
    try {
      const response = await fetch(url, config);
      return response;
    } catch (error) {
      console.error(`[API] Request failed:`, error);
      throw error;
    }
  }

  get(e, o = {}) { return this.request(e, { ...o, method: "GET" }); }
  post(e, b, o = {}) { return this.request(e, { ...o, method: "POST", body: JSON.stringify(b) }); }
  patch(e, b, o = {}) { return this.request(e, { ...o, method: "PATCH", body: JSON.stringify(b) }); }
  delete(e, o = {}) { return this.request(e, { ...o, method: "DELETE" }); }
}

const api = new ApiService();
export default api;
