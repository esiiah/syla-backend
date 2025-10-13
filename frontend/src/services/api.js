// frontend/src/services/api.js
class ApiService {
  constructor() {
    // ✅ SUPER SIMPLE - Just use /api (relative path)
    // Since everything runs on the same port (8080), no proxy detection needed!
    this.baseUrl = '/api';
    console.log("[API] Base URL:", this.baseUrl);
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
