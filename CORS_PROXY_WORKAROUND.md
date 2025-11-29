# CORS Proxy Workaround for Immediate Testing

If you can't modify the production backend, use a CORS proxy as a temporary workaround.

## Option A: Use Public CORS Proxy (Testing Only)

Update your frontend `.env` or config:

```javascript
// In your production frontend
REACT_APP_BACKEND_URL: "https://cors-anywhere.herokuapp.com/https://sourcevia-mgmt.emergent.host"
```

⚠️ **Warning:** This is for testing only! Don't use in production.

## Option B: Deploy Your Own CORS Proxy

1. Create a simple proxy server:

```javascript
// proxy-server.js
const express = require('express');
const cors = require('cors');
const { createProxyMiddleware } = require('http-proxy-middleware');

const app = express();

app.use(cors({
  origin: ['https://sourcevia.xyz', 'https://www.sourcevia.xyz'],
  credentials: true
}));

app.use('/api', createProxyMiddleware({
  target: 'https://sourcevia-mgmt.emergent.host',
  changeOrigin: true,
  pathRewrite: {
    '^/api': '/api'
  }
}));

app.listen(8080, () => {
  console.log('CORS proxy running on port 8080');
});
```

2. Deploy this proxy server
3. Update frontend to use proxy URL

## Option C: Nginx Reverse Proxy

If you have nginx access, add this configuration:

```nginx
location /api {
    add_header 'Access-Control-Allow-Origin' 'https://sourcevia.xyz' always;
    add_header 'Access-Control-Allow-Credentials' 'true' always;
    add_header 'Access-Control-Allow-Methods' 'GET, POST, PUT, DELETE, OPTIONS' always;
    add_header 'Access-Control-Allow-Headers' 'Content-Type, Authorization' always;
    
    if ($request_method = 'OPTIONS') {
        return 204;
    }
    
    proxy_pass https://sourcevia-mgmt.emergent.host/api;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
}
```

## Best Solution: Fix the Root Cause

The real issue is that your production backend has TWO problems:

1. **500 Internal Server Error** - MongoDB connection failing
2. **CORS not configured** - Even if MongoDB works, CORS will block requests

You MUST fix both issues in production by:
1. Setting correct MONGO_URL with database name
2. Setting CORS_ORIGINS to allow your domain
3. Deploying the updated code from this workspace

These workarounds are temporary. The proper fix requires updating your production deployment.
