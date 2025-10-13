// frontend/src/config.js

function getApiBaseUrl() {
  // Check if we're running behind a proxy
  const pathname = window.location.pathname;
  
  // If pathname starts with /proxy/, extract the base path
  if (pathname.includes('/proxy/')) {
    const proxyMatch = pathname.match(/^(\/proxy\/\d+\/)/);
    if (proxyMatch) {
      const proxyBase = proxyMatch[1];
      return `${window.location.origin}${proxyBase}api`;
    }
  }
  
  // Fallback to environment variable or default
  return import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';
}

export const config = {
  apiBaseUrl: getApiBaseUrl()
};

// Log the detected API base URL for debugging
console.log('[Config] API Base URL:', config.apiBaseUrl);
