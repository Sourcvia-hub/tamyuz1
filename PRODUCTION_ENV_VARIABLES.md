# 🔧 Production Environment Variables - Quick Reference

## Backend Environment Variables (sourcevia-mgmt.emergent.host)

```env
# MongoDB Atlas Connection
MONGO_URL=mongodb+srv://YOUR_USERNAME:YOUR_PASSWORD@YOUR_CLUSTER.mongodb.net/sourcevia?retryWrites=true&w=majority

# CORS Configuration
CORS_ORIGINS=https://sourcevia.xyz,https://www.sourcevia.xyz

# Emergent LLM Key (Already Set)
EMERGENT_LLM_KEY=sk-emergent-e9d7eEd061b2fCeDbB
```

### Important:
- Replace `YOUR_USERNAME`, `YOUR_PASSWORD`, `YOUR_CLUSTER` with your actual MongoDB Atlas credentials
- The database name `sourcevia` MUST be in the URL path
- Do NOT set `MONGO_DB_NAME` - it will be extracted from MONGO_URL automatically
- No spaces in CORS_ORIGINS (comma-separated only)

---

## Frontend Environment Variables (www.sourcevia.xyz)

```env
# Backend API URL
REACT_APP_BACKEND_URL=https://sourcevia-mgmt.emergent.host
```

### Important:
- No trailing slash
- No `/api` suffix (added automatically)
- Must point to your production backend

---

## MongoDB Atlas Setup

### 1. Get Your Connection String
1. Login to MongoDB Atlas
2. Go to your cluster
3. Click "Connect" button
4. Choose "Connect your application"
5. Copy the connection string
6. Replace `<password>` with your actual password
7. Add `/sourcevia` after `.mongodb.net/` and before `?retryWrites`

**Example:**
```
mongodb+srv://myuser:mypassword@cluster0.abc123.mongodb.net/sourcevia?retryWrites=true&w=majority
```

### 2. Configure IP Whitelist
1. In MongoDB Atlas, go to "Network Access"
2. Click "Add IP Address"
3. Choose "Allow Access from Anywhere" (0.0.0.0/0)
4. Or add your production server's IP address

### 3. Verify Database User Permissions
1. Go to "Database Access"
2. Ensure your user has "Read and write to any database" permission
3. Or at minimum, read/write access to the `sourcevia` database

---

## Verification Checklist

After setting environment variables:

### Backend Verification
- [ ] MONGO_URL includes database name in path (`/sourcevia`)
- [ ] CORS_ORIGINS includes both www and non-www domains
- [ ] Backend service restarted after environment variable changes

### Frontend Verification
- [ ] REACT_APP_BACKEND_URL points to production backend
- [ ] Frontend rebuilt after environment variable changes
- [ ] No trailing slashes in URLs

### MongoDB Atlas Verification
- [ ] Connection string tested (use MongoDB Compass or mongosh)
- [ ] IP whitelist configured
- [ ] Database user has correct permissions
- [ ] Database `sourcevia` exists (will be created automatically)

---

## Quick Test

After deployment, test with curl:

```bash
# Test backend is accessible
curl https://sourcevia-mgmt.emergent.host/api/auth/login

# Should return: {"detail":"Method Not Allowed"} (405 is expected for GET)

# Test login with actual credentials
curl -X POST https://sourcevia-mgmt.emergent.host/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@sourcevia.com","password":"admin123"}'

# Should return user data with token
```

### Expected Results:
- ✅ 405 Method Not Allowed for GET (correct)
- ✅ 200 OK with user data for POST with valid credentials
- ✅ 401 Unauthorized for POST with invalid credentials
- ❌ 502 Bad Gateway or 500 Internal Server Error = backend configuration issue
- ❌ CORS error in browser = CORS_ORIGINS not set correctly

---

## Common Issues

### "Cannot connect to server"
➜ Backend not accessible or environment variables not set
➜ Check backend is running and URL is correct

### "Internal Server Error" (500)
➜ MongoDB connection issue
➜ Check MONGO_URL is correct and database name is in path
➜ Check MongoDB Atlas IP whitelist

### CORS Error in Browser
➜ CORS_ORIGINS not configured correctly
➜ Must include both https://sourcevia.xyz and https://www.sourcevia.xyz
➜ Restart backend after changing environment variables

### "Invalid email or password" (401)
➜ Users not created in database yet
➜ Run the user creation script from DEPLOYMENT_GUIDE_FINAL.md

---

## Reference Files

- **Full Deployment Guide**: `/app/DEPLOYMENT_GUIDE_FINAL.md`
- **Test Results**: `/app/test_result.md`
- **Backend .env (dev)**: `/app/backend/.env`
- **Frontend .env (dev)**: `/app/frontend/.env`
