// Runtime configuration - can be updated without rebuilding
// This file is served as static content and can be modified in production
window.APP_CONFIG = {
  // Backend API URL - will be used if REACT_APP_BACKEND_URL is not set
  // In Emergent deployment, this should be set to the same domain
  BACKEND_URL: window.location.origin,
};
