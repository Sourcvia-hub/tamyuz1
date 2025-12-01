# 🔍 Troubleshooting: Cannot Access www.sourcevia.xyz

## What We Need to Know

To help you fix the issue, please tell me:

### 1. What exactly happens when you visit www.sourcevia.xyz?

**Option A: Website doesn't load at all**
- Blank page
- "Site can't be reached"
- Connection timeout
- DNS error

**Option B: Website loads but login doesn't work**
- Login page shows but errors when trying to login
- CORS errors in browser console
- "Cannot connect to server"
- 500 Internal Server Error

**Option C: Something else**
- Describe what you see

### 2. Check Browser Console

1. Visit https://www.sourcevia.xyz/login
2. Press F12 (Developer Tools)
3. Go to Console tab
4. Try to login
5. **Copy and share any error messages you see**

Common errors to look for:
- CORS policy errors
- Network errors
- 404 Not Found
- 500 Internal Server Error

### 3. Check Network Tab

1. Keep Developer Tools open (F12)
2. Go to Network tab
3. Try to login
4. Look for failed requests (red)
5. **Share what URLs are failing**

## Quick Diagnostic Commands

Run these commands to check your deployment status:

### Check Frontend Status
```bash
curl -I https://www.sourcevia.xyz/login
```
Expected: HTTP 200

### Check Backend Status
```bash
curl https://sourcevia-secure.emergent.host/api/health
```
Expected: `{"status":"ok","database":"connected"}`

### Check Backend CORS
```bash
curl -X OPTIONS https://sourcevia-secure.emergent.host/api/auth/login \
  -H "Origin: https://sourcevia.xyz" \
  -H "Access-Control-Request-Method: POST" \
  -v 2>&1 | grep "access-control-allow-origin"
```
Expected: `< access-control-allow-origin: https://sourcevia.xyz`

## Common Issues and Solutions

### Issue 1: Frontend Not Deployed

**Symptom:** www.sourcevia.xyz doesn't load at all

**Check:**
```bash
curl -I https://www.sourcevia.xyz
```

**Fix:**
- Deploy frontend through Emergent
- Verify deployment completed successfully

### Issue 2: Backend Not Deployed

**Symptom:** Frontend loads but login shows "Cannot connect to server"

**Check:**
```bash
curl https://sourcevia-secure.emergent.host/api/health
```

**Fix:**
- Deploy backend through Emergent
- Verify backend is running
- Check backend environment variables

### Issue 3: Wrong Backend URL

**Symptom:** 404 errors on all API calls

**Check:** Look at browser console to see what URL frontend is calling

**Fix:**
- Frontend should have: `REACT_APP_BACKEND_URL=https://sourcevia-secure.emergent.host`
- Check debug info on login page shows correct backend URL

### Issue 4: MongoDB Not Configured

**Symptom:** 500 errors on login/register, backend logs show MongoDB errors

**Fix:**
1. Ensure backend environment variables have:
   ```env
   MONGO_URL=mongodb://localhost:27017
   MONGO_DB_NAME=sourcevia
   ```
2. Remove any Atlas MONGO_URL
3. Redeploy backend

### Issue 5: CORS Blocking Requests

**Symptom:** Browser console shows "blocked by CORS policy"

**Fix:**
1. Backend environment must have:
   ```env
   CORS_ORIGINS=https://sourcevia.xyz,https://www.sourcevia.xyz,https://sourcevia-secure.emergent.host
   ```
2. Redeploy backend

### Issue 6: No Users in Database

**Symptom:** Login fails with "Invalid email or password"

**Fix:**
1. Create users via registration endpoint
2. Or use the user creation script from LOCAL_MONGODB_DEPLOYMENT.md

## Deployment Checklist

Have you completed these steps?

### Frontend Deployment
- [ ] Deployed frontend code to Emergent
- [ ] Set environment variable: `REACT_APP_BACKEND_URL=https://sourcevia-secure.emergent.host`
- [ ] Frontend is accessible at https://www.sourcevia.xyz
- [ ] Login page loads

### Backend Deployment
- [ ] Deployed backend code to Emergent
- [ ] Set environment variables:
  - `MONGO_URL=mongodb://localhost:27017`
  - `MONGO_DB_NAME=sourcevia`
  - `CORS_ORIGINS=https://sourcevia.xyz,https://www.sourcevia.xyz,https://sourcevia-secure.emergent.host`
- [ ] Removed any Atlas MONGO_URL
- [ ] Backend is accessible at https://sourcevia-secure.emergent.host
- [ ] Health endpoint returns 200 OK

### Database Setup
- [ ] MongoDB running in backend container
- [ ] Database "sourcevia" exists
- [ ] Created at least one user for testing

## Step-by-Step Verification

### Step 1: Verify Frontend is Live
```bash
curl -I https://www.sourcevia.xyz
```
✅ Should return: `HTTP/2 200`

### Step 2: Verify Backend is Live
```bash
curl https://sourcevia-secure.emergent.host/api/health
```
✅ Should return: `{"status":"ok","database":"connected"}`

### Step 3: Verify CORS
```bash
curl -X OPTIONS https://sourcevia-secure.emergent.host/api/auth/login \
  -H "Origin: https://sourcevia.xyz" \
  -H "Access-Control-Request-Method: POST" \
  -v 2>&1 | grep "< access-control"
```
✅ Should show CORS headers

### Step 4: Test Registration
```bash
curl -X POST https://sourcevia-secure.emergent.host/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Test","email":"test@test.com","password":"test123456","role":"user"}'
```
✅ Should return: 200 OK with user data

### Step 5: Test from Browser
1. Visit https://www.sourcevia.xyz/login
2. Try to register a new user
3. Check browser console for errors

## Get Help

Please provide me with:

1. **What you see:** Describe what happens when you visit www.sourcevia.xyz
2. **Browser console errors:** Copy/paste any red errors
3. **Network tab:** Share which requests are failing
4. **Backend URL:** What does the debug info on login page show?
5. **Deployment status:** Did you deploy both frontend and backend?

With this information, I can help you fix the exact issue you're experiencing.
