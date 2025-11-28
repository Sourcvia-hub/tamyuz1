/**
 * API Configuration
 * Centralized configuration for backend API URL
 */

// Get backend URL from environment variable or use current origin as fallback
// This ensures the app works both in development and production
export const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || window.location.origin;
export const API_URL = `${BACKEND_URL}/api`;

// Log configuration for debugging (only in development)
if (process.env.NODE_ENV === 'development') {
  console.log('API Configuration:', {
    BACKEND_URL,
    API_URL,
    envVariable: process.env.REACT_APP_BACKEND_URL,
  });
}

export default {
  BACKEND_URL,
  API_URL,
};
