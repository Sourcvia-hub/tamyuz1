/**
 * API Configuration
 * Centralized backend URL management with robust fallback
 */

// Get backend URL with multiple fallback options
const getBackendURL = () => {
  // 1. Environment variable (set at build time)
  if (process.env.REACT_APP_BACKEND_URL) {
    return process.env.REACT_APP_BACKEND_URL;
  }

  // 2. Runtime config (can be updated without rebuild)
  if (window.APP_CONFIG?.BACKEND_URL) {
    return window.APP_CONFIG.BACKEND_URL;
  }

  // 3. Same origin fallback
  return window.location.origin;
};

const BACKEND_URL = getBackendURL();
export const API_URL = `${BACKEND_URL}/api`;

// Export for debugging
export const API_CONFIG = {
  BACKEND_URL,
  API_URL,
  source: process.env.REACT_APP_BACKEND_URL ? 'environment variable' : 
          window.APP_CONFIG?.BACKEND_URL ? 'runtime config' : 
          'same origin'
};

// Log configuration
console.log('🔧 API Configuration:', API_CONFIG);
