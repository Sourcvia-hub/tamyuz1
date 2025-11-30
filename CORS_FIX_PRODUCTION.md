# 🔒 CORS Error Fix - Production Deployment

## 🚨 Issue from Screenshot

**Error in Browser Console:**
```
Access to XMLHttpRequest at 'https://sourcevia-mgmt.emergent.host/api/auth/login' 
from origin 'https://sourcevia.xyz' has been blocked by CORS policy
```

**What this means:**
- Your frontend at `https://sourcevia.xyz` is trying to call the backend
- Backend at `https://sourcevia-mgmt.emergent.host` is rejecting the request
- CORS (Cross-Origin Resource Sharing) is blocking the request

## ✅ Root Cause

Your production backend's `CORS_ORIGINS` environment variable is not set correctly or is missing `https://sourcevia.xyz`.

## 🔧 Solution

### Required Environment Variable for Production Backend:

```env
CORS_ORIGINS=https://sourcevia.xyz,https://www.sourcevia.xyz
```

**Important:**
- Must include BOTH `https://sourcevia.xyz` (without www) AND `https://www.sourcevia.xyz` (with www)
- No spaces between domains
- Comma-separated only
- No trailing commas

## 📋 Step-by-Step Fix

### Step 1: Verify Current Backend CORS Configuration

The code in `server.py` is already correct and will read from the environment variable:

```python
cors_origins_str = os.environ.get('CORS_ORIGINS', 'http://localhost:3000')
cors_origins = ["*"] if cors_origins_str == "*" else [origin.strip() for origin in cors_origins_str.split(',')]
```

### Step 2: Set Environment Variable in Production

**Option A: Set in Deployment Configuration**
1. Go to your deployment settings in Emergent
2. Add/Update environment variable:
   - Key: `CORS_ORIGINS`
   - Value: `https://sourcevia.xyz,https://www.sourcevia.xyz`
3. Restart backend service

**Option B: Temporary Wildcard (Not Recommended for Production)**
```env
CORS_ORIGINS=*
```
This allows ALL origins (less secure, but useful for testing)

### Step 3: Deploy and Restart

1. Deploy your latest code via Emergent
2. Ensure environment variables are set correctly
3. Restart backend service
4. Test the login again

## 🧪 How to Test After Fix

1. Open browser Developer Tools (F12)
2. Go to Console tab
3. Visit https://www.sourcevia.xyz/login or https://sourcevia.xyz/login
4. Try to login with test credentials
5. Check Console - you should see:
   - ✅ `Backend is reachable!`
   - ✅ Successful login response
   - ❌ NO CORS errors

## 📊 Expected Backend Logs After Fix

When your backend starts, you should see:

```
🔒 CORS Configuration:
   Allowed Origins: ['https://sourcevia.xyz', 'https://www.sourcevia.xyz']
   Source: Environment Variable
```

## 🔍 Debugging

If CORS errors persist after setting the variable:

### Check 1: Verify Environment Variable is Set
```bash
# In production backend container
echo $CORS_ORIGINS
# Should output: https://sourcevia.xyz,https://www.sourcevia.xyz
```

### Check 2: Check Backend Logs
Look for the CORS configuration print statement in backend startup logs.

### Check 3: Test with curl
```bash
curl -X OPTIONS https://sourcevia-mgmt.emergent.host/api/auth/login \
  -H "Origin: https://sourcevia.xyz" \
  -H "Access-Control-Request-Method: POST" \
  -v
```

Should return `Access-Control-Allow-Origin: https://sourcevia.xyz`

### Check 4: Browser Network Tab
1. Open DevTools → Network tab
2. Try to login
3. Click on the failed request
4. Check Response Headers - should include:
   - `Access-Control-Allow-Origin: https://sourcevia.xyz`
   - `Access-Control-Allow-Credentials: true`

## ⚠️ Common Mistakes

1. **❌ Extra spaces**: `https://sourcevia.xyz, https://www.sourcevia.xyz` (space after comma)
   **✅ Correct**: `https://sourcevia.xyz,https://www.sourcevia.xyz`

2. **❌ Wrong protocol**: `http://sourcevia.xyz`
   **✅ Correct**: `https://sourcevia.xyz`

3. **❌ Trailing slash**: `https://sourcevia.xyz/`
   **✅ Correct**: `https://sourcevia.xyz`

4. **❌ Missing www variant**: Only setting `https://www.sourcevia.xyz`
   **✅ Correct**: Include both www and non-www

5. **❌ Not restarting backend**: Environment variables only load on startup
   **✅ Correct**: Always restart backend after changing environment variables

## 🎯 Complete Production Environment Variables

Your production backend needs these environment variables:

```env
# MongoDB Atlas Connection
MONGO_URL=mongodb+srv://USERNAME:PASSWORD@CLUSTER.mongodb.net/sourcevia?retryWrites=true&w=majority

# CORS Configuration (CRITICAL for frontend to work)
CORS_ORIGINS=https://sourcevia.xyz,https://www.sourcevia.xyz

# Emergent LLM Key
EMERGENT_LLM_KEY=sk-emergent-e9d7eEd061b2fCeDbB
```

Your production frontend needs:

```env
# Backend API URL
REACT_APP_BACKEND_URL=https://sourcevia-mgmt.emergent.host
```

## ✅ Success Indicators

After fixing CORS, you should see:

1. **Browser Console:**
   - ✅ No CORS errors
   - ✅ "Backend is reachable!" message
   - ✅ Successful login response

2. **Login Form:**
   - ✅ No "Connection error" message
   - ✅ Successful redirect to dashboard after login

3. **Network Tab:**
   - ✅ 200 OK responses from `/api/auth/login`
   - ✅ `Access-Control-Allow-Origin` header present

## 🚀 After CORS is Fixed

Once CORS is working:
1. All database authorization errors are already fixed ✅
2. Frontend URL construction is already fixed ✅
3. Your login should work immediately ✅
4. You can proceed with creating test users and testing the app

The CORS fix is the **final missing piece** for your production deployment!
