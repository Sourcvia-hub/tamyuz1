// craco.config.js - Production Configuration
const path = require("path");

module.exports = {
  webpack: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
    configure: (webpackConfig) => {
      // Production webpack configuration
      // No Emergent-specific plugins or configurations
      
      // Optimize for production
      if (process.env.NODE_ENV === 'production') {
        // Disable source maps in production for smaller bundle
        webpackConfig.devtool = false;
      }
      
      return webpackConfig;
    },
  },
};
