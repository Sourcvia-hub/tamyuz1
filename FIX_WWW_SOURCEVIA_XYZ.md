# Fix "Cannot connect to server" on www.sourcevia.xyz

## Problem Analysis

When accessing www.sourcevia.xyz, you're getting:
```
Cannot connect to server. Please check your internet connection or try again later.
```

## Root Cause

Your frontend at `www.sourcevia.xyz` is trying to connect to the wrong backend URL.

**Current Setup:**
- Frontend: `https://www.sourcevia.xyz` (or `https://sourcevia.xyz`)
- Backend: `https://sourcevia-mgmt.emergent.host/api`

**What's Happening:**
The frontend doesn't have the `REACT_APP_BACKEND_URL` environment variable set in production, so it falls back to using `window.location.origin` (which is `https://www.sourcevia.xyz`). It then tries to call `https://www.sourcevia.xyz/api` which doesn't exist or doesn't have your backend.

## Solution

You need to configure the frontend to point to the correct backend URL in your production deployment.

### Option 1: Set Environment Variable (Recommended)

In your production deployment configuration (where www.sourcevia.xyz is hosted), set:

```yaml
# Frontend Environment Variables
REACT_APP_BACKEND_URL: "https://sourcevia-mgmt.emergent.host"
```

**Where to set this:**
- If using Emergent: In deployment environment variables
- If using Vercel: In project settings → Environment Variables
- If using Netlify: In site settings → Environment Variables
- If using Docker: In docker-compose.yml or Kubernetes deployment

**Example for Emergent Deployment:**
```yaml
frontend:
  env:
    - REACT_APP_BACKEND_URL=https://sourcevia-mgmt.emergent.host
```

### Option 2: Update Runtime Config File

If you have access to the deployed files, update `/public/config.js`:

```javascript
// In /public/config.js
window.APP_CONFIG = {
  BACKEND_URL: 'https://sourcevia-mgmt.emergent.host',
};
```

This file can be updated without rebuilding the React app.

### Option 3: Use Same Domain (Proxy Setup)

If your frontend and backend are on the same platform, configure a reverse proxy:

**Frontend:** `https://www.sourcevia.xyz`  
**Backend:** `https://www.sourcevia.xyz/api` (proxied to sourcevia-mgmt.emergent.host)

This requires nginx or similar proxy configuration.

## Backend Configuration

Also ensure your backend at `sourcevia-mgmt.emergent.host` has the correct CORS configuration:

```yaml
# Backend Environment Variables
CORS_ORIGINS: "https://sourcevia.xyz,https://www.sourcevia.xyz,https://sourcevia-mgmt.emergent.host"
MONGO_URL: "mongodb+srv://username:password@cluster.mongodb.net/database_name?retryWrites=true"
```

## Step-by-Step Fix

### Step 1: Update Frontend Environment Variable

In your production deployment for www.sourcevia.xyz:

1. Go to deployment settings
2. Add environment variable:
   - Key: `REACT_APP_BACKEND_URL`
   - Value: `https://sourcevia-mgmt.emergent.host`
3. Redeploy the frontend

### Step 2: Update Backend CORS

In your backend deployment at sourcevia-mgmt.emergent.host:

1. Go to deployment settings
2. Add/update environment variable:
   - Key: `CORS_ORIGINS`
   - Value: `https://sourcevia.xyz,https://www.sourcevia.xyz,https://sourcevia-mgmt.emergent.host`
3. Redeploy the backend

### Step 3: Verify Configuration

After redeployment:

1. Open www.sourcevia.xyz
2. Open browser console (F12)
3. Look for this message:
   ```
   🔧 API Configuration: {
     BACKEND_URL: "https://sourcevia-mgmt.emergent.host",
     API_URL: "https://sourcevia-mgmt.emergent.host/api",
     source: "environment variable"
   }
   ```

If you see `source: "window.location.origin"` instead, the environment variable is not set correctly.

### Step 4: Test Login

1. Go to www.sourcevia.xyz/login
2. Try to login with: `admin@sourcevia.com` / `admin123`
3. Check browser console for any errors
4. Should successfully login and redirect to dashboard

## Verification Commands

### Test Backend is Accessible

```bash
curl -X POST "https://sourcevia-mgmt.emergent.host/api/auth/login" \
  -H "Content-Type: application/json" \
  -H "Origin: https://www.sourcevia.xyz" \
  -d '{"email":"admin@sourcevia.com","password":"admin123"}'
```

**Expected:** Status 200 with user data

### Check Frontend API Configuration

Open browser console on www.sourcevia.xyz:

```javascript
console.log('Backend URL:', window.APP_CONFIG?.BACKEND_URL);
console.log('Origin:', window.location.origin);
```

## Common Issues

### Issue 1: Environment Variable Not Applied

**Symptom:** Console shows `source: "window.location.origin"`

**Solution:**
- Rebuild/redeploy frontend after setting env var
- For React apps, env vars must be set at build time
- Make sure the variable name is exact: `REACT_APP_BACKEND_URL`

### Issue 2: CORS Error After Fix

**Symptom:** "blocked by CORS policy" in console

**Solution:**
- Update backend CORS_ORIGINS to include www.sourcevia.xyz
- Restart backend after updating
- Verify backend logs show correct CORS origins

### Issue 3: 404 Not Found on Backend

**Symptom:** Backend URL returns 404

**Solution:**
- Verify backend is running: `curl https://sourcevia-mgmt.emergent.host/api/health`
- Check backend deployment status
- Verify backend URL is correct

### Issue 4: Still Using Wrong URL

**Symptom:** Frontend calls wrong backend despite env var

**Solution:**
- Clear browser cache: Ctrl+Shift+Delete
- Hard refresh: Ctrl+Shift+R or Cmd+Shift+R
- Try in incognito mode
- Check if service worker is caching old config

## Expected Configuration Summary

### Development Environment

**Frontend:** `https://data-overhaul-1.preview.emergentagent.com`
```
REACT_APP_BACKEND_URL=https://data-overhaul-1.preview.emergentagent.com
```

**Backend:** `https://data-overhaul-1.preview.emergentagent.com/api`
```
CORS_ORIGINS=https://data-overhaul-1.preview.emergentagent.com,http://localhost:3000
```

### Production Environment

**Frontend:** `https://www.sourcevia.xyz` (or `https://sourcevia.xyz`)
```
REACT_APP_BACKEND_URL=https://sourcevia-mgmt.emergent.host
```

**Backend:** `https://sourcevia-mgmt.emergent.host/api`
```
CORS_ORIGINS=https://sourcevia.xyz,https://www.sourcevia.xyz,https://sourcevia-mgmt.emergent.host
```

## Alternative: Single Domain Setup

If you want to simplify, you can deploy both frontend and backend under the same domain:

**Option A: Backend as subdomain**
- Frontend: `https://www.sourcevia.xyz`
- Backend: `https://api.sourcevia.xyz`

**Option B: Backend as path**
- Frontend: `https://www.sourcevia.xyz`
- Backend: `https://www.sourcevia.xyz/api` (requires proxy)

This eliminates CORS issues entirely.

## Quick Diagnostic

Run this in browser console on www.sourcevia.xyz:

```javascript
fetch(window.location.origin + '/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({email: 'admin@sourcevia.com', password: 'admin123'})
})
.then(r => {
  console.log('Response status:', r.status);
  return r.json();
})
.then(data => console.log('✅ Data:', data))
.catch(err => console.error('❌ Error:', err));
```

If this fails, it confirms the backend is not at `www.sourcevia.xyz/api`.

Then try:

```javascript
fetch('https://sourcevia-mgmt.emergent.host/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  credentials: 'include',
  body: JSON.stringify({email: 'admin@sourcevia.com', password: 'admin123'})
})
.then(r => r.json())
.then(data => console.log('✅ Backend working:', data))
.catch(err => console.error('❌ Backend error:', err));
```

If this works, it confirms you need to set `REACT_APP_BACKEND_URL`.

## Support Checklist

Before asking for help, provide:

1. **Frontend logs** (browser console on www.sourcevia.xyz):
   - Screenshot showing API Configuration log
   - Any error messages

2. **Backend URL test**:
   ```bash
   curl https://sourcevia-mgmt.emergent.host/api/auth/login
   ```

3. **Environment variables**:
   - What REACT_APP_BACKEND_URL is set to in production
   - What CORS_ORIGINS is set to in backend

4. **Deployment platform**:
   - Where is www.sourcevia.xyz hosted?
   - Where is sourcevia-mgmt.emergent.host hosted?

## Summary

**The fix is simple:** Set `REACT_APP_BACKEND_URL=https://sourcevia-mgmt.emergent.host` in your production frontend deployment configuration and redeploy.

This will make www.sourcevia.xyz call the correct backend at sourcevia-mgmt.emergent.host instead of trying to call a non-existent backend at www.sourcevia.xyz/api.
