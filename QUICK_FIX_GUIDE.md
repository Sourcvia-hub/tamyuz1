# 🚀 Quick Fix Guide - MongoDB Atlas Permissions

## You Need To Do This (I Cannot Access Your Atlas Account)

### 5-Minute Fix:

**1. Login to MongoDB Atlas**
- Go to: https://cloud.mongodb.com
- Login with your credentials

**2. Navigate to Database Access**
- Click "Database Access" in the left sidebar

**3. Find Your User**
- Look for the username from your MONGO_URL
- MONGO_URL format: `mongodb+srv://USERNAME:PASSWORD@...`
- Find that USERNAME in the list

**4. Edit User**
- Click the "Edit" button (pencil icon) next to the user

**5. Grant Permissions**
- Scroll to "Database User Privileges"
- Click "Add Specific Privilege"
- Set:
  - **Database:** `sourcevia`
  - **Role:** `readWrite`
- Click "Add Privilege"

**6. Save**
- Scroll down and click "Update User"
- Wait 1-2 minutes for changes to propagate

**7. Restart Backend**
- Redeploy your backend in Emergent
- Or restart the backend service

## Quick Test After Fix:

```bash
# Test registration (should return 200 instead of 500)
curl -X POST https://sourcevia-secure.emergent.host/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Test User","email":"test@test.com","password":"test123456","role":"user"}'
```

## Alternative: Use Different Database

If you can't change permissions, update your MONGO_URL to use a database where your user already has access:

```env
# Old (no permissions)
MONGO_URL=mongodb+srv://user:pass@cluster.net/sourcevia?...

# New (use database where you have permissions)
MONGO_URL=mongodb+srv://user:pass@cluster.net/YOUR_PERMITTED_DB?...
```

Then redeploy the backend.

## What Will Work After Fix:

✅ POST /api/auth/register → 200 OK  
✅ POST /api/auth/login → 200 OK  
✅ GET /api/auth/me → 200 OK  
✅ Frontend registration/login works

## Need Help?

If you encounter issues while following these steps, let me know and I can provide more detailed guidance!
