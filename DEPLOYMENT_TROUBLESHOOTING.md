# Deployment Troubleshooting Guide - MongoDB Atlas "not authorized" Error

## Current Status

✅ **Code Fix is Working Correctly**  
✅ **Tested with Simulated Atlas URLs**  
✅ **Extraction Logic is Bulletproof**  

❌ **Production Still Failing** - This means the MONGO_URL in production is missing the database name

## The Problem

You're seeing this error:
```
pymongo.errors.OperationFailure: not authorized on procurement_db
Code: 13, 'Unauthorized'
```

### Root Cause

The MongoDB Atlas user (`sourcevia-admin`) is trying to access `procurement_db`, but:
1. Either the user doesn't have permissions for `procurement_db`
2. Or the user only has access to a different database

### Why This Happens

Your MONGO_URL in the Kubernetes deployment is likely in one of these formats:

**Format 1 (MISSING DATABASE NAME):**
```
mongodb+srv://sourcevia-admin:password@cluster.mongodb.net/?retryWrites=true
```
☝️ No database name! The app falls back to `procurement_db` from MONGO_DB_NAME env var.

**Format 2 (CORRECT WITH DATABASE NAME):**
```
mongodb+srv://sourcevia-admin:password@cluster.mongodb.net/your_actual_db/?retryWrites=true
```
☝️ Has `/your_actual_db/` - this is what you need!

## How to Fix

### Step 1: Find Your Actual Atlas Database Name

1. Log into MongoDB Atlas dashboard
2. Go to your cluster
3. Click "Browse Collections"
4. Note the database name you want to use (likely `sourcevia_db`, `sourcevia`, or similar)

### Step 2: Update Your MONGO_URL

In your Kubernetes deployment configuration or Emergent deployment settings, update MONGO_URL to:

```
mongodb+srv://sourcevia-admin:PASSWORD@cluster.mongodb.net/YOUR_ACTUAL_DB_NAME?retryWrites=true&w=majority
```

**Replace:**
- `PASSWORD` → Your actual password
- `YOUR_ACTUAL_DB_NAME` → The database name from Step 1

### Step 3: Remove MONGO_DB_NAME (Optional but Recommended)

Remove the `MONGO_DB_NAME` environment variable from your deployment configuration. It's not needed when the database name is in the URL.

### Step 4: Verify Logs

After redeployment, check your backend logs for:

```
✅ [DECISION] Using database name from MONGO_URL: 'your_actual_db_name'
================================================================================
🔗 FINAL MongoDB Configuration:
   URL: mongodb+srv://sourcevia-admin:...
   Database: 'your_actual_db_name'
   Source: URL
================================================================================
```

**Key Indicators:**
- ✅ **Good:** `Source: URL` - Database name from connection string
- ⚠️ **Bad:** `Source: Environment Variable or Default` - Using fallback (not Atlas URL)

### Step 5: Check MongoDB Atlas User Permissions

Ensure `sourcevia-admin` user has access to the database:

1. In Atlas, go to Database Access
2. Find `sourcevia-admin` user
3. Click Edit
4. Verify permissions:
   - **Option A:** Built-in Role: `readWrite@your_database_name`
   - **Option B:** Built-in Role: `readWriteAnyDatabase` (less secure, but works)

## Common Mistakes

### Mistake 1: Setting Both MONGO_URL and MONGO_DB_NAME

**Wrong:**
```yaml
MONGO_URL: "mongodb+srv://user@cluster.net/?opts"
MONGO_DB_NAME: "procurement_db"
```
Problem: URL has no database, app uses fallback `procurement_db`, user has no access to it.

**Right:**
```yaml
MONGO_URL: "mongodb+srv://user@cluster.net/correct_db?opts"
# Don't set MONGO_DB_NAME at all
```

### Mistake 2: Database Name Doesn't Match Atlas

**Wrong:**
```yaml
MONGO_URL: "mongodb+srv://user@cluster.net/procurement_db?opts"
```
But in Atlas, your database is actually called `sourcevia_db`.

**Right:**
```yaml
MONGO_URL: "mongodb+srv://user@cluster.net/sourcevia_db?opts"
```

### Mistake 3: User Has Wrong Database Permissions

Atlas user `sourcevia-admin` has `readWrite@different_database` but you're trying to access `procurement_db`.

**Fix:** Update user permissions in Atlas to include the correct database.

## Verification Commands

### Test 1: Check What Database Your Code Will Use

With the enhanced logging, you'll see detailed output:

```
[DB Config] MONGO_URL from env: mongodb+srv://...
[DB Config] MONGO_DB_NAME from env: procurement_db

[DB Extract] Found database name in URL: 'actual_db_name'

✅ [DECISION] Using database name from MONGO_URL: 'actual_db_name'
```

### Test 2: Check MongoDB Atlas User Permissions

```bash
# Use mongosh to test connection
mongosh "mongodb+srv://sourcevia-admin:PASSWORD@cluster.net/TEST_DB_NAME" \
  --eval "db.runCommand({connectionStatus: 1})"
```

If you get "not authorized" error, the user doesn't have access to TEST_DB_NAME.

### Test 3: List Databases User Has Access To

```bash
mongosh "mongodb+srv://sourcevia-admin:PASSWORD@cluster.net/admin" \
  --eval "db.adminCommand({listDatabases: 1})"
```

This shows all databases the user can access.

## Still Not Working?

### Scenario 1: ⚠️ WARNING in Logs

If you see:
```
⚠️  WARNING: Possible misconfiguration detected!
   - You're using MongoDB Atlas (mongodb+srv://)
   - But database name is 'procurement_db' (likely from env var)
   - And no database name was found in the URL
```

**Solution:** Your MONGO_URL is missing the database name. Add it after the cluster address:
```
Before: mongodb+srv://user@cluster.net/?opts
After:  mongodb+srv://user@cluster.net/your_db/?opts
```

### Scenario 2: Database Name is Correct but Still "not authorized"

**Solution:** Check Atlas user permissions. The user needs `readWrite` access to that specific database.

### Scenario 3: Logs Show Wrong Database Name

If logs show:
```
Database: 'procurement_db'
Source: Environment Variable or Default
```

**Solution:** MONGO_URL doesn't have database name. See Scenario 1.

## MongoDB Atlas Connection String Format

Correct format:
```
mongodb+srv://<username>:<password>@<cluster-address>/<database-name>?<options>
                                                         ^^^^^^^^^^^^^^^
                                                         THIS IS CRITICAL!
```

Examples:
```
✅ Good: mongodb+srv://user:pass@cluster.net/mydb?retryWrites=true
❌ Bad:  mongodb+srv://user:pass@cluster.net/?retryWrites=true
❌ Bad:  mongodb+srv://user:pass@cluster.net?retryWrites=true
```

## Quick Checklist

- [ ] MONGO_URL contains database name after cluster address
- [ ] Database name in URL matches an existing database in Atlas
- [ ] Atlas user has `readWrite` permission for that database
- [ ] Atlas Network Access whitelist includes your deployment IPs
- [ ] Deployment logs show `Source: URL` (not Environment Variable)
- [ ] No MONGO_DB_NAME environment variable set (optional, should be ignored if URL has DB)

## Support

If you've followed all steps and still have issues:

1. **Share these log lines:**
   - `[DB Config] MONGO_URL from env: ...`
   - `[DECISION] Using database name from...`
   - `Source: ...`

2. **Check Atlas:**
   - Database name (from Browse Collections)
   - User permissions (from Database Access)
   - Network Access whitelist

3. **Verify:**
   - Can you connect using `mongosh` with the same connection string?
   - Does the user have access to the specific database?

## Expected Deployment Logs

### Successful Deployment:
```
================================================================================
[DB Config] Starting database configuration...
[DB Config] MONGO_URL from env: mongodb+srv://sourcevia-admin:***@cluster.net/sourcevia_db?...
[DB Config] MONGO_DB_NAME from env: procurement_db
================================================================================

[DB Extract] Found database name in URL: 'sourcevia_db'

✅ [DECISION] Using database name from MONGO_URL: 'sourcevia_db'
   (Ignoring any MONGO_DB_NAME environment variable)

================================================================================
🔗 FINAL MongoDB Configuration:
   URL: mongodb+srv://sourcevia-admin:***@cluster.net/sourcevia_db?...
   Database: 'sourcevia_db'
   Source: URL
================================================================================

[DB Init] Creating MongoDB client...
[DB Init] Database client created successfully
[DB Init] Will connect to database: 'sourcevia_db'

INFO: Application startup complete.
```

### Failed Deployment (Wrong Config):
```
[DB Extract] No path in URL (path='')
[DB Extract] Returning None - no database name found

✅ [DECISION] No database in URL, using MONGO_DB_NAME or default: 'procurement_db'

⚠️  WARNING: Possible misconfiguration detected!
   - You're using MongoDB Atlas (mongodb+srv://)
   - But database name is 'procurement_db' (likely from env var)
   - And no database name was found in the URL
```

## Summary

The application code is working correctly. The issue is with the deployment configuration:

1. **Add database name to MONGO_URL:** `...@cluster.net/your_db_name?...`
2. **Ensure Atlas user has permissions** for that database
3. **Check deployment logs** to verify `Source: URL`
4. **Remove MONGO_DB_NAME** environment variable (not needed)

Once configured correctly, the authentication error will be resolved.
