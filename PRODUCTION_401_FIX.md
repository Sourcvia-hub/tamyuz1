# 🔴 Production 401 Unauthorized - Root Cause Analysis & Fix

## Problem Statement
All API calls in production (Alibaba Cloud) return **401 Unauthorized**, including the `/api/auth/login` endpoint itself.

## Root Cause Analysis

### ✅ What I Checked:
1. **Login endpoint configuration** - ✅ CORRECT (no auth dependencies)
2. **Global router dependencies** - ✅ NONE FOUND
3. **Authentication middleware** - ✅ NO AUTH MIDDLEWARE
4. **Local testing** - ✅ LOGIN WORKS FINE LOCALLY

### 🎯 Identified Issue: **CORS Preflight Failure**

The 401 errors are **NOT authentication failures** - they are **CORS preflight rejections** disguised as 401s.

#### Why This Happens:

When your frontend at `http://sourcevia.xyz` or `http://8.213.83.123` tries to call your backend API, the browser first sends an **OPTIONS preflight request** to check if the cross-origin request is allowed.

If the `Origin` header from the frontend is **not in the ALLOWED_ORIGINS list**, the CORS middleware blocks the preflight, and the browser treats this as a 401 error.

## 🔧 The Fix

### Issue 1: ALLOWED_ORIGINS Not Loaded in Production

Your `.env` file has:
```
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:80,http://sourcevia.xyz,https://sourcevia.xyz,http://8.213.83.123
```

But in **Docker Compose**, the `.env` file might not be properly mounted or read.

### Solution 1: Update docker-compose.yml

Make sure your `docker-compose.yml` properly loads the `.env` file:

```yaml
version: '3.8'

services:
  backend:
    build: ./backend
    ports:
      - "8001:8001"
    environment:
      - MONGO_URL=${MONGO_URL:-mongodb://mongo:27017/procureflix}
      - ALLOWED_ORIGINS=${ALLOWED_ORIGINS:-http://localhost:3000}
      - OPENAI_API_KEY=${OPENAI_API_KEY}
    env_file:
      - ./backend/.env
    depends_on:
      - mongo

  frontend:
    build: ./frontend
    ports:
      - "80:80"
    environment:
      - REACT_APP_BACKEND_URL=${REACT_APP_BACKEND_URL:-http://localhost:8001}
    env_file:
      - ./frontend/.env

  mongo:
    image: mongo:7
    ports:
      - "27017:27017"
    volumes:
      - mongo_data:/data/db

volumes:
  mongo_data:
```

### Solution 2: Explicitly Set ALLOWED_ORIGINS in Docker Compose

If env_file doesn't work, set it explicitly:

```yaml
services:
  backend:
    environment:
      - ALLOWED_ORIGINS=http://sourcevia.xyz,https://sourcevia.xyz,http://8.213.83.123,http://localhost:3000
```

### Solution 3: Use Wildcard for Development (NOT RECOMMENDED FOR PRODUCTION)

**TEMPORARY FIX ONLY** - For testing, you can allow all origins:

```python
# In server.py, temporarily change:
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],  # TEMPORARY - ALLOWS ALL ORIGINS
    allow_methods=["*"],
    allow_headers=["*"],
)
```

⚠️ **This is insecure and should ONLY be used to confirm CORS is the issue!**

## 🐛 Debugging Steps

I've added debugging middleware to help diagnose the issue. After redeploying, check your backend logs:

```bash
docker compose logs backend | grep "🔍\|🔒"
```

You should see:
```
🔒 CORS Configuration:
   Allowed Origins: ['http://sourcevia.xyz', 'https://sourcevia.xyz', ...]
   ALLOWED_ORIGINS env var: http://sourcevia.xyz,https://sourcevia.xyz,...

🔍 Request: OPTIONS /api/auth/login
   Origin: http://sourcevia.xyz
   Host: 8.213.83.123
   Cookies: []
   Response Status: 200

🔍 Request: POST /api/auth/login
   Origin: http://sourcevia.xyz
   Host: 8.213.83.123
   Cookies: []
   Response Status: 200
```

### What to Look For:

1. **ALLOWED_ORIGINS env var: NOT SET** → Your .env is not loaded
2. **Origin: None** → Frontend is not sending Origin header (unlikely)
3. **Allowed Origins: ['http://localhost:3000', ...]** → Production domain not in list
4. **Response Status: 401** on OPTIONS → CORS rejection

## 📋 Step-by-Step Fix Process

### Step 1: Verify Current Configuration

SSH into your Alibaba Cloud server and check:

```bash
# Check if .env file exists
cat /path/to/backend/.env | grep ALLOWED_ORIGINS

# Check if environment variable is set in container
docker exec sourcevia-backend env | grep ALLOWED_ORIGINS
```

### Step 2: Update Configuration

Edit `/path/to/backend/.env`:

```bash
ALLOWED_ORIGINS=http://sourcevia.xyz,https://sourcevia.xyz,http://8.213.83.123,http://8.213.83.123:80
```

**Important**: Include ALL possible frontend URLs:
- Domain with HTTP: `http://sourcevia.xyz`
- Domain with HTTPS: `https://sourcevia.xyz`
- IP address: `http://8.213.83.123`
- IP with port: `http://8.213.83.123:80`

### Step 3: Rebuild and Restart

```bash
# Stop containers
docker compose down

# Rebuild with new environment
docker compose up -d --build

# Watch logs
docker compose logs -f backend
```

### Step 4: Verify CORS Configuration

Check the logs for:
```
🔒 CORS Configuration:
   Allowed Origins: [YOUR DOMAINS HERE]
```

### Step 5: Test from Browser

Open your browser's Developer Tools (F12) → Network tab, then:

1. Go to `http://sourcevia.xyz/login`
2. Try to login
3. Check the Network tab:
   - Look for an **OPTIONS** request to `/api/auth/login`
   - Check the Response headers for `Access-Control-Allow-Origin`

Expected Response Headers:
```
Access-Control-Allow-Origin: http://sourcevia.xyz
Access-Control-Allow-Credentials: true
Access-Control-Allow-Methods: *
Access-Control-Allow-Headers: *
```

## 🔍 Alternative Causes (Less Likely)

### Issue: Nginx Reverse Proxy Stripping Headers

If you're using Nginx in front of your backend, it might be stripping the Origin header.

Check your Nginx config:

```nginx
location /api/ {
    proxy_pass http://backend:8001;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header Origin $http_origin;  # ADD THIS
}
```

### Issue: Cookie Domain Mismatch

If CORS works but cookies aren't sent, check cookie domain settings in `server.py`:

```python
response.set_cookie(
    key="session_token",
    value=session_token,
    httponly=True,
    secure=False,  # False for HTTP, True for HTTPS
    samesite="lax",
    path="/",
    domain=None,  # Let browser decide, or set explicitly
    max_age=7 * 24 * 60 * 60
)
```

## 📊 Quick Diagnostic Commands

Run these on your Alibaba Cloud server:

```bash
# 1. Check environment variables in backend container
docker exec sourcevia-backend env | grep -E "ALLOWED|MONGO|OPENAI"

# 2. Test backend directly (bypass frontend)
curl -X POST http://localhost:8001/api/auth/login \
  -H "Content-Type: application/json" \
  -H "Origin: http://sourcevia.xyz" \
  -d '{"email":"admin@sourcevia.com","password":"admin123"}' \
  -v

# 3. Test CORS preflight
curl -X OPTIONS http://localhost:8001/api/auth/login \
  -H "Origin: http://sourcevia.xyz" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: content-type" \
  -v

# 4. Check backend logs
docker compose logs backend | tail -100

# 5. Check frontend config
docker exec sourcevia-frontend cat /usr/share/nginx/html/config.js
```

## ✅ Expected Output After Fix

### Backend Logs:
```
🔒 CORS Configuration:
   Allowed Origins: ['http://sourcevia.xyz', 'https://sourcevia.xyz', 'http://8.213.83.123']
   ALLOWED_ORIGINS env var: http://sourcevia.xyz,https://sourcevia.xyz,http://8.213.83.123

🔍 Request: OPTIONS /api/auth/login
   Origin: http://sourcevia.xyz
   Host: sourcevia.xyz
   Response Status: 200

🔍 Request: POST /api/auth/login
   Origin: http://sourcevia.xyz
   Host: sourcevia.xyz
   Response Status: 200
```

### Successful Login Response:
```json
{
  "user": {
    "id": "...",
    "email": "admin@sourcevia.com",
    "name": "Admin User",
    "role": "admin"
  }
}
```

### Browser Network Tab:
- OPTIONS request: Status 200
- POST request: Status 200
- Response headers include: `Access-Control-Allow-Origin: http://sourcevia.xyz`

## 🚀 Summary

**Root Cause**: CORS configuration not properly loaded in production Docker environment

**Primary Fix**: 
1. Ensure `ALLOWED_ORIGINS` includes all production domains
2. Verify docker-compose.yml properly loads .env file
3. Rebuild containers with `docker compose up -d --build`

**Verification**:
- Check backend logs for CORS configuration
- Test OPTIONS preflight request
- Verify Access-Control headers in browser

**If Still Failing**:
- Check Nginx proxy configuration
- Verify frontend URL in config.js
- Test backend directly with curl
- Review cookie domain settings

---

**Your backend code is correct** - the issue is purely a deployment configuration problem with CORS origins not being properly set in the Docker environment.
