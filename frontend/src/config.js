// frontend/src/config.js

function getApiBaseUrl() {
  // Check if we're running behind a proxy
  const pathname = window.location.pathname;
  const origin = window.location.origin;
  
  console.log('[Config] Pathname:', pathname);
  console.log('[Config] Origin:', origin);
  
  // ✅ If pathname starts with /proxy/, extract the base path
  if (pathname.includes('/proxy/')) {
    const proxyMatch = pathname.match(/^(\/proxy\/\d+\/)/);
    if (proxyMatch) {
      const proxyBase = proxyMatch[1]; // e.g., "/proxy/8000/"
      const fullUrl = `${origin}${proxyBase}api`;
      console.log('[Config] ✅ Proxy detected!');
      console.log('[Config] Proxy base:', proxyBase);
      console.log('[Config] Full API URL:', fullUrl);
      return fullUrl;
    }
  }
  
  // ✅ Fallback to environment variable or default
  const defaultUrl = import.meta.env.VITE_API_BASE_URL || '/api';
  console.log('[Config] ℹ️ No proxy detected. Using default:', defaultUrl);
  return defaultUrl;
}

export const config = {
  apiBaseUrl: getApiBaseUrl()
};

// Log the detected API base URL for debugging
console.log('[Config] 🎯 Final API Base URL:', config.apiBaseUrl);
