# Deployment Package - Fix www.sourcevia.xyz Login Issue

## Problem Summary

Your website `www.sourcevia.xyz` cannot login because:

1. **Backend is crashing** (500 error) at `sourcevia-mgmt.emergent.host`
2. **CORS is blocking** requests from sourcevia.xyz
3. **MongoDB connection is failing** (same error we fixed in this workspace)

## What's Been Fixed in This Workspace

✅ MongoDB database name extraction (handles Atlas URLs correctly)
✅ CORS configuration (properly reads from environment variables)  
✅ Login/Registration page (completely rewritten, tab switching fixed)
✅ All test users created in local database

## Files That Need to Be Deployed

### Backend Files (with fixes):
```
/app/backend/server.py                    - CORS fix applied
/app/backend/utils/database.py            - MongoDB Atlas fix applied
/app/backend/utils/auth.py                - No changes
/app/backend/utils/permissions.py         - No changes
/app/backend/models/                      - All model files
/app/backend/requirements.txt             - Dependencies
```

### Frontend Files (with fixes):
```
/app/frontend/src/pages/Login.js          - Completely rewritten
/app/frontend/src/config/api.js           - API URL configuration
/app/frontend/src/App.js                  - No changes needed
/app/frontend/src/components/             - All component files
/app/frontend/package.json                - Dependencies
```

## Required Environment Variables

### Backend (sourcevia-mgmt.emergent.host):
```bash
# CRITICAL: MongoDB Atlas connection with database name
MONGO_URL="mongodb+srv://username:password@cluster.mongodb.net/YOUR_DATABASE_NAME?retryWrites=true&w=majority"

# CRITICAL: CORS configuration
CORS_ORIGINS="https://sourcevia.xyz,https://www.sourcevia.xyz,https://sourcevia-mgmt.emergent.host"

# Optional: If using Emergent LLM features
EMERGENT_LLM_KEY="your_key_here"
```

### Frontend (www.sourcevia.xyz):
```bash
# CRITICAL: Backend API URL
REACT_APP_BACKEND_URL="https://sourcevia-mgmt.emergent.host"
```

## How to Deploy

### Method 1: Using Emergent Native Deployment (Easiest)

1. **From this workspace:**
   - Click "Deploy" or "Save to GitHub" then deploy from GitHub
   - Or use Emergent's native deployment feature

2. **Set environment variables:**
   - Go to your deployment settings
   - Add the environment variables listed above
   - Make sure to use YOUR actual MongoDB credentials and database name

3. **Deploy both frontend and backend**

### Method 2: Manual Deployment

#### Deploy Backend:

1. Copy these files to your production server:
```bash
scp -r /app/backend/* your-server:/path/to/backend/
```

2. SSH into your production server
3. Set environment variables in `.env` or system environment
4. Restart the backend service
```bash
supervisorctl restart backend
# OR
pm2 restart backend
# OR
systemctl restart sourcevia-backend
```

#### Deploy Frontend:

1. Update `.env` file:
```bash
REACT_APP_BACKEND_URL=https://sourcevia-mgmt.emergent.host
```

2. Rebuild:
```bash
cd /app/frontend
npm run build
# OR
yarn build
```

3. Deploy the `build/` folder to www.sourcevia.xyz

### Method 3: Using Docker

#### Build and push images:

```bash
# Backend
cd /app/backend
docker build -t your-registry/sourcevia-backend:latest .
docker push your-registry/sourcevia-backend:latest

# Frontend  
cd /app/frontend
docker build -t your-registry/sourcevia-frontend:latest .
docker push your-registry/sourcevia-frontend:latest
```

#### Update docker-compose.yml:

```yaml
version: '3.8'
services:
  backend:
    image: your-registry/sourcevia-backend:latest
    environment:
      - MONGO_URL=mongodb+srv://user:pass@cluster.net/dbname?opts
      - CORS_ORIGINS=https://sourcevia.xyz,https://www.sourcevia.xyz
    ports:
      - "8001:8001"
  
  frontend:
    image: your-registry/sourcevia-frontend:latest
    environment:
      - REACT_APP_BACKEND_URL=https://sourcevia-mgmt.emergent.host
    ports:
      - "3000:3000"
```

## Verification After Deployment

### 1. Check Backend Health

```bash
curl https://sourcevia-mgmt.emergent.host/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"test"}'
```

**Expected:** 401 Unauthorized (NOT 500 Internal Server Error)

If you get 500, check backend logs for MongoDB errors.

### 2. Check Backend Logs

Look for these messages in backend logs:

```
✅ [DECISION] Using database name from MONGO_URL: 'your_database'
🔗 FINAL MongoDB Configuration:
   Database: 'your_database'
   Source: URL

🔒 CORS Configuration:
   Allowed Origins: ['https://sourcevia.xyz', 'https://www.sourcevia.xyz', ...]
   Source: Environment Variable
```

### 3. Test Frontend Configuration

Open `https://www.sourcevia.xyz` in browser console:

```javascript
// Should see:
🔧 API Configuration: {
  BACKEND_URL: "https://sourcevia-mgmt.emergent.host",
  source: "environment variable"
}
```

### 4. Test Login

1. Go to `https://www.sourcevia.xyz/login`
2. Try: `admin@sourcevia.com` / `admin123`
3. Should redirect to dashboard

## If You Still Get Errors

### Error: 500 Internal Server Error

**Cause:** MongoDB connection failing

**Fix:**
1. Check MONGO_URL is correct
2. Check database name is in the URL
3. Check user has permissions for that database
4. Test connection: `mongosh "YOUR_MONGO_URL" --eval "db.users.countDocuments()"`

### Error: CORS blocked

**Cause:** CORS_ORIGINS not set correctly

**Fix:**
1. Check backend logs show correct CORS origins
2. Make sure domain matches exactly (https://sourcevia.xyz not http)
3. Restart backend after changing CORS_ORIGINS

### Error: Cannot connect to server

**Cause:** Frontend calling wrong backend URL

**Fix:**
1. Check browser console for API Configuration
2. Make sure REACT_APP_BACKEND_URL is set
3. Rebuild frontend if environment variable changed

## MongoDB Atlas Setup

### Find Your Database Name:

1. Login to MongoDB Atlas
2. Click your cluster
3. Click "Browse Collections"
4. The database name is shown at the top (e.g., `sourcevia_production`)

### Get Connection String:

1. Click "Connect" on your cluster
2. Choose "Connect your application"
3. Copy the connection string
4. Replace `<password>` with your password
5. **Add database name:** `...mongodb.net/YOUR_DATABASE_NAME?retryWrites...`

### Example:

```
Original:
mongodb+srv://user:pass@cluster.mongodb.net/?retryWrites=true

Fixed:
mongodb+srv://user:pass@cluster.mongodb.net/sourcevia_production?retryWrites=true
```

## Creating Test Users in Production

After deployment, if database is empty:

1. Go to `https://www.sourcevia.xyz/login`
2. Click "Register" tab
3. Create users with different roles
4. Or use curl to register:

```bash
curl -X POST https://sourcevia-mgmt.emergent.host/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Admin User",
    "email": "admin@sourcevia.com",
    "password": "admin123",
    "role": "admin"
  }'
```

## Summary Checklist

Before deployment works, you MUST:

- [ ] Deploy updated backend code to sourcevia-mgmt.emergent.host
- [ ] Set MONGO_URL with database name in production backend
- [ ] Set CORS_ORIGINS in production backend
- [ ] Deploy updated frontend to www.sourcevia.xyz
- [ ] Set REACT_APP_BACKEND_URL in production frontend
- [ ] Verify backend returns 401 (not 500) when testing
- [ ] Verify CORS allows your domain
- [ ] Create test users in production database

## Quick Test Commands

Copy and run these to verify everything:

```bash
# Test 1: Backend responds (should get 401, not 500)
curl https://sourcevia-mgmt.emergent.host/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test","password":"test"}'

# Test 2: CORS allows your domain
curl -I -X OPTIONS https://sourcevia-mgmt.emergent.host/api/auth/login \
  -H "Origin: https://sourcevia.xyz" \
  -H "Access-Control-Request-Method: POST"

# Test 3: Can register new user
curl -X POST https://sourcevia-mgmt.emergent.host/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Test","email":"test@test.com","password":"test123","role":"user"}'
```

## Support

If deployment still fails, share:

1. Backend logs (first 50 lines after start)
2. Result of Quick Test Commands above
3. Browser console screenshot from www.sourcevia.xyz
4. MongoDB Atlas connection string (hide password)

The root issue is that production backend needs the fixes from this workspace deployed with correct environment variables!
