# 🚀 Production Deployment - CORS Configuration

## Current Status

### Development Environment ✅ WORKING
```
Backend: http://localhost:8001
CORS Headers Present: ✅
All Endpoints Working: ✅

Test Results:
  ✅ /api/auth/me → access-control-allow-origin: https://sourcevia.xyz
  ✅ /api/health → access-control-allow-origin: https://sourcevia.xyz
  ✅ /api/auth/register → access-control-allow-origin: https://sourcevia.xyz
```

### Production Backend ❌ NEEDS DEPLOYMENT
```
Backend: https://sourcevia-secure.emergent.host
CORS Headers: ❌ Missing
Error: "No 'Access-Control-Allow-Origin' header is present"

Cause: Production is running OLD CODE without CORS fixes
```

## Verified Configuration

### 1. Backend .env ✅
**File:** `/app/backend/.env`
```env
CORS_ORIGINS=https://sourcevia.xyz,https://www.sourcevia.xyz,https://sourcevia-secure.emergent.host
MONGO_URL=mongodb://localhost:27017/sourcevia
EMERGENT_LLM_KEY=sk-emergent-e9d7eEd061b2fCeDbB
```

### 2. CORS Middleware ✅
**File:** `/app/backend/server.py` (Lines 3750-3769)
```python
from fastapi.middleware.cors import CORSMiddleware
import os

# ==================== APP SETUP ====================
# Configure CORS middleware (must be before including router)
DEFAULT_PRODUCTION_ORIGINS = [
    "https://sourcevia.xyz",
    "https://www.sourcevia.xyz",
    "https://sourcevia-secure.emergent.host",
]

cors_origins = os.environ.get("CORS_ORIGINS", ",".join(DEFAULT_PRODUCTION_ORIGINS)).split(",")

print(f"🔒 CORS Configuration:")
print(f"   Allowed Origins: {cors_origins}")

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=cors_origins,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include the router in the main app (must be after all endpoints are defined)
app.include_router(api_router)
```

### 3. Middleware Order ✅
```
Line 50:   app = FastAPI()
Line 3763: app.add_middleware(CORSMiddleware, ...)  ← CORS first
Line 3772: app.include_router(api_router)           ← Router second
```

**✅ Correct Order:** CORS middleware is added BEFORE router inclusion

### 4. OPTIONS Preflight ✅
All endpoints automatically handle OPTIONS requests via FastAPI's CORS middleware.

## Deployment Instructions

### Step 1: Deploy Backend to Production

**Option A: Via Emergent Dashboard**
1. Go to Emergent deployment dashboard
2. Find: **EMT-496c37 (sourcevia-secure)**
3. Click **Deploy** or **Redeploy**
4. Wait 10-15 minutes

**Option B: Via CLI** (if available)
```bash
emergent deploy sourcevia-secure
```

### Step 2: Configure Production Environment Variables

Set these environment variables in your production backend:

```env
# CORS Origins (REQUIRED)
CORS_ORIGINS=https://sourcevia.xyz,https://www.sourcevia.xyz,https://sourcevia-secure.emergent.host

# MongoDB Atlas (REQUIRED)
MONGO_URL=mongodb+srv://USERNAME:PASSWORD@CLUSTER.mongodb.net/sourcevia?retryWrites=true&w=majority

# Emergent LLM Key
EMERGENT_LLM_KEY=sk-emergent-e9d7eEd061b2fCeDbB
```

**For Debugging (Temporary):**
```env
CORS_ORIGINS=*
```
⚠️ Use `*` only for testing, then restrict to specific domains.

### Step 3: Restart Production Backend

After setting environment variables, restart the backend service.

## Verification Commands

Run these commands after deployment:

### 1. Check Backend Health
```bash
curl https://sourcevia-secure.emergent.host/api/health
```
**Expected:**
```json
{"status":"ok","database":"connected"}
```

### 2. Check CORS for /api/auth/me
```bash
curl -X OPTIONS https://sourcevia-secure.emergent.host/api/auth/me \
  -H "Origin: https://sourcevia.xyz" \
  -H "Access-Control-Request-Method: GET" \
  -v 2>&1 | grep "access-control-allow-origin"
```
**Expected:**
```
< access-control-allow-origin: https://sourcevia.xyz
```

### 3. Check CORS for /api/auth/register
```bash
curl -X OPTIONS https://sourcevia-secure.emergent.host/api/auth/register \
  -H "Origin: https://sourcevia.xyz" \
  -H "Access-Control-Request-Method: POST" \
  -v 2>&1 | grep "access-control-allow-origin"
```
**Expected:**
```
< access-control-allow-origin: https://sourcevia.xyz
```

### 4. Check CORS for /api/health
```bash
curl -X OPTIONS https://sourcevia-secure.emergent.host/api/health \
  -H "Origin: https://sourcevia.xyz" \
  -H "Access-Control-Request-Method: GET" \
  -v 2>&1 | grep "access-control-allow-origin"
```
**Expected:**
```
< access-control-allow-origin: https://sourcevia.xyz
```

### 5. Test from Browser
1. Visit `https://sourcevia.xyz/login`
2. Open DevTools (F12) → Network tab
3. Clear network log
4. Try to login
5. Check the request to `sourcevia-secure.emergent.host`
6. Look at Response Headers:
   - Should see: `access-control-allow-origin: https://sourcevia.xyz`
   - Should see: `access-control-allow-credentials: true`

## Expected Backend Logs

After deployment, backend logs should show:

```
🔒 CORS Configuration:
   Allowed Origins: ['https://sourcevia.xyz', 'https://www.sourcevia.xyz', 'https://sourcevia-secure.emergent.host']

INFO:     Application startup complete.
INFO:     Uvicorn running on http://0.0.0.0:8001 (Press CTRL+C to quit)
```

## Troubleshooting

### If CORS Still Not Working After Deployment

**Check 1: Verify Deployment Succeeded**
```bash
curl https://sourcevia-secure.emergent.host/api/health
```
If this fails, backend didn't deploy correctly.

**Check 2: Verify Environment Variable is Set**
```bash
# In production backend container
echo $CORS_ORIGINS
```
Should show: `https://sourcevia.xyz,https://www.sourcevia.xyz,https://sourcevia-secure.emergent.host`

**Check 3: Check Backend Logs**
Look for:
```
🔒 CORS Configuration:
   Allowed Origins: [...]
```

If you see empty or missing origins, environment variable not loaded.

**Check 4: Verify CORS Middleware is Loaded**
Check backend startup logs for any errors during middleware initialization.

**Check 5: Test with Wildcard (Temporary)**
Set `CORS_ORIGINS=*` and restart. If this works, the issue is with the origin list.

## What Will Work After Deployment

### Before Deployment ❌
```
Frontend: https://sourcevia.xyz
Request to: https://sourcevia-secure.emergent.host/api/auth/login
Result: ❌ CORS Error - No 'Access-Control-Allow-Origin' header
```

### After Deployment ✅
```
Frontend: https://sourcevia.xyz
Request to: https://sourcevia-secure.emergent.host/api/auth/login
Result: ✅ Success - CORS headers present
Response Headers:
  - access-control-allow-origin: https://sourcevia.xyz
  - access-control-allow-credentials: true
  - access-control-allow-methods: *
  - access-control-allow-headers: *
```

## Complete Testing Checklist

After deployment, test these endpoints:

- [ ] GET  /api/health
- [ ] POST /api/auth/register
- [ ] POST /api/auth/login
- [ ] GET  /api/auth/me
- [ ] POST /api/auth/logout

All should return proper CORS headers for origin `https://sourcevia.xyz`.

## Files That Need to Be in Production

1. `/app/backend/server.py` - Contains CORS middleware configuration
2. `/app/backend/.env` (or set environment variables separately)

## Summary

**Configuration Status:** ✅ CORRECT
- CORS middleware properly configured
- Origins list includes all required domains
- Middleware added before router
- OPTIONS preflight handled automatically

**Development Status:** ✅ TESTED
- All endpoints tested with CORS
- Headers present and correct
- No errors in development

**Production Status:** ⏳ PENDING DEPLOYMENT
- Code is ready
- Configuration is correct
- Just needs deployment to production

**Action Required:** 
**Deploy latest backend code to https://sourcevia-secure.emergent.host**

After deployment, all CORS errors will be resolved! 🚀
