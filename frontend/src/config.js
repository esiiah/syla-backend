// frontend/src/config.js

/**
 * Dynamically determine the correct API base URL
 * Handles both direct access and code-server proxy
 */
function getApiBaseUrl() {
  const currentPath = window.location.pathname;
  const origin = window.location.origin;
  
  // Check if we're behind code-server proxy
  if (currentPath.includes('/proxy/')) {
    // Extract proxy base (e.g., /proxy/8000/)
    const proxyMatch = currentPath.match(/^(\/proxy\/\d+\/)/);
    if (proxyMatch) {
      const proxyBase = proxyMatch[1];
      const apiUrl = `${origin}${proxyBase}api`;
      console.log('[Config] Proxy detected - API Base URL:', apiUrl);
      return apiUrl;
    }
  }
  
  // Check for environment variable (production/staging)
  if (import.meta.env.VITE_API_BASE_URL) {
    console.log('[Config] Using VITE_API_BASE_URL:', import.meta.env.VITE_API_BASE_URL);
    return import.meta.env.VITE_API_BASE_URL;
  }
  
  // Default: direct access
  const apiUrl = `${origin}/api`;
  console.log('[Config] Direct access - API Base URL:', apiUrl);
  return apiUrl;
}

// Export configuration object
export const config = {
  apiBaseUrl: getApiBaseUrl()
};

// Also export just the URL for convenience
export const API_BASE_URL = config.apiBaseUrl;

// Log configuration on load
console.log('[Config] Configuration loaded:', {
  apiBaseUrl: config.apiBaseUrl,
  currentPathname: window.location.pathname,
  origin: window.location.origin,
  isProxy: window.location.pathname.includes('/proxy/')
});
