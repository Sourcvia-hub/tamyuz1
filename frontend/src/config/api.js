/**
 * API Configuration
 * Centralized configuration for backend API URL
 */

// Priority order:
// 1. Environment variable (build-time)
// 2. Runtime config from window.APP_CONFIG
// 3. Current origin (same domain deployment)
const getRuntimeConfig = () => {
  return window.APP_CONFIG?.BACKEND_URL || null;
};

export const BACKEND_URL = 
  process.env.REACT_APP_BACKEND_URL || 
  getRuntimeConfig() || 
  window.location.origin;

export const API_URL = `${BACKEND_URL}/api`;

// Log configuration for debugging
console.log('🔧 API Configuration:', {
  BACKEND_URL,
  API_URL,
  source: process.env.REACT_APP_BACKEND_URL 
    ? 'environment variable' 
    : (getRuntimeConfig() ? 'runtime config' : 'window.location.origin'),
  origin: window.location.origin,
});

export default {
  BACKEND_URL,
  API_URL,
};
