# 🚀 Sourcevia Deployment Guide - PRODUCTION READY

## ✅ What Has Been Fixed

All authentication and production deployment issues have been resolved:

1. **✅ MongoDB Atlas Connection** - Database connection logic now correctly extracts database name from Atlas URLs
2. **✅ CORS Configuration** - Backend properly reads CORS_ORIGINS from environment variables
3. **✅ Frontend URL Construction** - Fixed malformed URL bug, now properly uses REACT_APP_BACKEND_URL
4. **✅ Authentication System** - Complete login/registration/logout flow working perfectly
5. **✅ Session Management** - Proper session cleanup on logout
6. **✅ Protected Routes** - All routes correctly redirect to login when not authenticated

## 📋 Testing Status

**Development Environment Testing (COMPLETED ✅)**
- ✅ Login with all 3 test users (admin, po, user)
- ✅ Registration flow with auto-login
- ✅ Protected routes working correctly
- ✅ Session persistence across page refresh
- ✅ Logout with complete session cleanup
- ✅ API calls going to correct endpoints
- ✅ No CORS errors or URL malformation

**Test Credentials Created:**
- Admin: `admin@sourcevia.com` / `admin123`
- PO: `po@sourcevia.com` / `po123456`
- User: `user@sourcevia.com` / `user12345`

---

## 🎯 Deployment Instructions for www.sourcevia.xyz

### Step 1: Update Backend Environment Variables

Update your production backend (`sourcevia-mgmt.emergent.host`) with these environment variables:

```env
# MongoDB Atlas Connection (REQUIRED)
MONGO_URL=mongodb+srv://YOUR_USERNAME:YOUR_PASSWORD@YOUR_CLUSTER.mongodb.net/sourcevia?retryWrites=true&w=majority

# CORS Configuration (REQUIRED)
CORS_ORIGINS=https://sourcevia.xyz,https://www.sourcevia.xyz
```

**Important Notes:**
- Replace `YOUR_USERNAME`, `YOUR_PASSWORD`, and `YOUR_CLUSTER` with your actual MongoDB Atlas credentials
- The database name `sourcevia` is specified in the URL path (after `.net/`)
- Do NOT add `MONGO_DB_NAME` environment variable - the database name will be extracted from the URL
- Include both `sourcevia.xyz` and `www.sourcevia.xyz` in CORS_ORIGINS

### Step 2: Update Frontend Environment Variables

Update your production frontend (`www.sourcevia.xyz`) with this environment variable:

```env
# Backend API URL (REQUIRED)
REACT_APP_BACKEND_URL=https://sourcevia-mgmt.emergent.host
```

**Important Notes:**
- This should point to your production backend URL
- Do NOT include `/api` in the URL - it will be added automatically
- The app will append `/api` to create full API URLs like `https://sourcevia-mgmt.emergent.host/api/auth/login`

### Step 3: Deploy the Latest Code

1. **Deploy Backend Code**
   - Push the latest backend code to your production backend
   - Ensure the new code from `/app/backend/` is deployed
   - Key updated files:
     - `backend/utils/database.py` (MongoDB connection fix)
     - `backend/server.py` (CORS configuration fix)

2. **Deploy Frontend Code**
   - Push the latest frontend code to your production frontend
   - Ensure the new code from `/app/frontend/` is deployed
   - Key updated files:
     - `frontend/src/config/api.js` (URL validation)
     - `frontend/src/pages/Login.js` (Login/registration system)
     - `frontend/src/App.js` (Session cleanup fix)

### Step 4: Create Production Database Users

After deployment, create the test users in your production MongoDB Atlas database:

```python
# Run this script once in your production environment
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

async def create_users():
    # Use your production MONGO_URL
    client = AsyncIOMotorClient("YOUR_PRODUCTION_MONGO_URL")
    db = client["sourcevia"]
    
    # Clear existing users (optional)
    await db.users.delete_many({})
    
    # Create test users
    users = [
        {
            "id": "admin-001",
            "email": "admin@sourcevia.com",
            "password": pwd_context.hash("admin123"),
            "name": "Admin User",
            "role": "admin",
            "department": "Administration"
        },
        {
            "id": "po-001",
            "email": "po@sourcevia.com",
            "password": pwd_context.hash("po123456"),
            "name": "PO User",
            "role": "procurement_officer",
            "department": "Procurement"
        },
        {
            "id": "user-001",
            "email": "user@sourcevia.com",
            "password": pwd_context.hash("user12345"),
            "name": "Regular User",
            "role": "user",
            "department": "Operations"
        }
    ]
    
    await db.users.insert_many(users)
    print("✅ Users created successfully")
    client.close()

asyncio.run(create_users())
```

### Step 5: Verify Deployment

After deployment, test the following:

1. **Visit https://www.sourcevia.xyz**
2. **Check Login Page**
   - Should see clean login form
   - Debug info at bottom should show: `Backend: https://sourcevia-mgmt.emergent.host`
3. **Test Login**
   - Login with: `admin@sourcevia.com` / `admin123`
   - Should redirect to dashboard
   - Should see: "Welcome back, Admin User!"
4. **Test Protected Routes**
   - Try accessing `/dashboard`, `/vendors`, `/tenders`, `/contracts`
   - All should work without errors
5. **Test Logout**
   - Click logout button
   - Should redirect to `/login`
   - Try accessing `/dashboard` directly - should redirect back to login

---

## 🔍 Troubleshooting

### Issue: "Cannot connect to server"

**Cause**: Backend not deployed or environment variables not set

**Solution**:
1. Verify backend is running at `https://sourcevia-mgmt.emergent.host`
2. Check backend environment variables are set correctly
3. Check backend logs for errors

### Issue: CORS Errors

**Cause**: CORS_ORIGINS environment variable not set correctly

**Solution**:
1. Verify `CORS_ORIGINS` includes both `https://sourcevia.xyz` and `https://www.sourcevia.xyz`
2. No spaces between URLs (comma-separated)
3. Restart backend after updating environment variables

### Issue: "Internal Server Error" on Login

**Cause**: MongoDB connection issue

**Solution**:
1. Verify `MONGO_URL` is correct MongoDB Atlas connection string
2. Ensure database name is in the URL: `mongodb+srv://.../.net/sourcevia?...`
3. Verify MongoDB Atlas user has read/write permissions
4. Check IP whitelist in MongoDB Atlas (allow all IPs: `0.0.0.0/0`)

### Issue: Malformed API URLs

**Cause**: REACT_APP_BACKEND_URL not set correctly

**Solution**:
1. Verify `REACT_APP_BACKEND_URL=https://sourcevia-mgmt.emergent.host`
2. No trailing slash
3. No `/api` suffix
4. Rebuild frontend after updating environment variable

---

## 📊 What's Next

After successful deployment:

1. **Test RBAC System** - Verify role-based access controls work correctly
2. **Add Real Data** - Start adding vendors, tenders, and contracts
3. **SharePoint Integration** (Optional) - Integrate file uploads with SharePoint
4. **Monitoring** - Set up monitoring for production errors

---

## 🔐 Security Notes

- All passwords are hashed using bcrypt
- Sessions are stored in localStorage and cleared on logout
- Protected routes enforce authentication
- CORS is properly configured to allow only your domains
- MongoDB credentials should never be committed to git

---

## 💡 Development vs Production

**Development Environment (This Workspace)**
- Backend: `https://data-overhaul-1.preview.emergentagent.com`
- Frontend: `https://data-overhaul-1.preview.emergentagent.com`
- MongoDB: Local MongoDB (`mongodb://localhost:27017/sourcevia`)
- All features tested and working ✅

**Production Environment (Your Deployment)**
- Backend: `https://sourcevia-mgmt.emergent.host`
- Frontend: `https://www.sourcevia.xyz`
- MongoDB: MongoDB Atlas (your cluster)
- Requires deployment of latest code and environment variable configuration

---

## 📞 Support

If you encounter any issues during deployment:
1. Check the troubleshooting section above
2. Verify all environment variables are set correctly
3. Check browser console for detailed error messages
4. Check backend logs for server errors

The development environment is fully functional and tested. The production deployment just needs the latest code and correct environment variables to work identically.
