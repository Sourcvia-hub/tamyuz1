/**
 * API Configuration - Production
 * Backend URL must be set via REACT_APP_BACKEND_URL environment variable
 */

// Get backend URL from environment variable
// This must be set during Docker build or in .env file for development
const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

if (!BACKEND_URL) {
  console.error('❌ REACT_APP_BACKEND_URL is not set! Backend API calls will fail.');
  console.error('Set REACT_APP_BACKEND_URL in your .env file or Docker build args.');
}

export const API_URL = BACKEND_URL ? `${BACKEND_URL}/api` : '/api';

// Export for debugging
export const API_CONFIG = {
  BACKEND_URL: BACKEND_URL || 'NOT SET',
  API_URL,
  configured: !!BACKEND_URL
};

// Log configuration in development
if (process.env.NODE_ENV === 'development') {
  console.log('🔧 API Configuration:', API_CONFIG);
}
