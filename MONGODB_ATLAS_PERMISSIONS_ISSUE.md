# 🚨 MongoDB Atlas Permissions Issue - Production Deployment

## Error Analysis

### Error from Production Logs:
```
pymongo.errors.OperationFailure: not authorized on sourcevia to execute command
{ find: "users", filter: { email: "admin@test.com" }, projection: { _id: 0 }, ...
'code': 13, 'codeName': 'Unauthorized', '$db': 'sourcevia' }
```

### What's Happening:
1. ✅ Backend starts successfully
2. ✅ CORS working (OPTIONS requests return 200 OK)
3. ✅ Health endpoint working (`/api/health` returns 200 OK)
4. ❌ Auth endpoints fail with 500 errors (login, register, /me)

### Root Cause:
**The MongoDB Atlas user doesn't have read/write permissions on the "sourcevia" database.**

## Understanding the Error

### Error Code 13: Unauthorized
- MongoDB returns error code 13 when a user tries to access a database they don't have permissions for
- The error shows: `'codeName': 'Unauthorized'`
- This is a **database permission issue**, not a code issue

### What the Logs Show:
```
Database trying to access: "sourcevia"
Collections: users, user_sessions  
Operations: find, insert
Result: Permission denied (code 13)
```

## Why This Happens

### In Development (Sandboxed Environment):
- Uses local MongoDB: `mongodb://localhost:27017/sourcevia`
- Local MongoDB has no authentication/authorization
- All operations work fine ✅

### In Production (MongoDB Atlas):
- Uses MongoDB Atlas with authentication
- Database user has specific permissions
- User likely only has permissions on a different database name
- Trying to access "sourcevia" → Permission denied ❌

## The Solution

### Option 1: Grant Permissions in MongoDB Atlas (Recommended)

**Steps:**
1. Login to MongoDB Atlas (https://cloud.mongodb.com)
2. Go to "Database Access" section
3. Find your database user
4. Edit user permissions
5. Grant read/write permissions on the "sourcevia" database
6. Save changes

**Specific Permissions Needed:**
```
Database: sourcevia
Permissions: readWrite
Collections: users, user_sessions (and all others)
```

**Or grant broader permissions:**
```
Role: Read and write to any database
```

### Option 2: Change Database Name in Code

If you can't change Atlas permissions, change the database name in the code to match what your Atlas user has access to.

**Find out what database your Atlas user has access to:**
1. Check MongoDB Atlas → Database Access → Your User → Permissions
2. Note the database name (might be "admin", "test", or a custom name)

**Update the code:**
```python
# In /app/backend/utils/database.py
# Change the default database name
MONGO_DB_NAME = 'your_permitted_database_name'  # Instead of 'sourcevia'
```

### Option 3: Use Environment Variable

Set the database name via environment variable in production:

```env
MONGO_URL=mongodb+srv://USER:PASS@CLUSTER.mongodb.net/YOUR_DB_NAME?...
```

Make sure `YOUR_DB_NAME` is a database your Atlas user has permissions for.

## Verification

### Check Current Permissions:
1. Login to MongoDB Atlas
2. Database Access → Select your user
3. Check "Database User Privileges"
4. Look for permissions on "sourcevia" database

### Expected Permissions:
```
Database       Role
sourcevia      readWrite
```

### Test After Granting Permissions:
```bash
# Should return 200 OK with user data (after users are created)
curl -X POST https://your-backend.emergent.host/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@test.com","password":"yourpassword"}'
```

## Why Code-Level Fixes Won't Solve This

This is a **database permission issue**, not a code bug:

1. ✅ Code is correct - it's using the right database name ("sourcevia")
2. ✅ Connection string is correct - it's connecting to Atlas
3. ✅ Queries are correct - they work in development
4. ❌ **Database user lacks permissions** - this must be fixed in Atlas

**No amount of code changes will grant database permissions - this must be done in MongoDB Atlas.**

## Temporary Workaround (Not Recommended)

If you absolutely cannot change Atlas permissions, you could:

1. Create a completely separate MongoDB Atlas cluster with a user that has full permissions
2. Use that cluster's connection string
3. This is not ideal as it bypasses your current Atlas setup

## Recommended Action Plan

### Immediate Steps:
1. ✅ Login to MongoDB Atlas
2. ✅ Go to Database Access
3. ✅ Find your database user
4. ✅ Grant readWrite permission on "sourcevia" database
5. ✅ Save and wait 1-2 minutes for propagation
6. ✅ Re-deploy or restart your backend
7. ✅ Test login/register endpoints

### Expected Result After Fix:
```
POST /api/auth/register → 200 OK ✅
POST /api/auth/login → 200 OK ✅
GET /api/auth/me → 200 OK ✅
```

## Summary

**Problem:** MongoDB Atlas user doesn't have permissions on "sourcevia" database
**Solution:** Grant permissions in MongoDB Atlas
**Alternative:** Change database name to one your user has access to
**Action Required:** Database administration task, not code changes

The code is working correctly - the issue is with database access permissions that must be configured in MongoDB Atlas.
