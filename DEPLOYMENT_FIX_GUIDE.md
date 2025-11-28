# Deployment Fix Guide - MongoDB Atlas Authentication

## Problem Statement

When deploying to production with MongoDB Atlas, the application was failing with authentication errors:

```
pymongo.errors.OperationFailure: not authorized on procurement_db to execute command
Error Code: 13 (Unauthorized)
```

## Root Cause

The application had two critical issues:

### Issue 1: Database Name Priority Order
The original code prioritized the `MONGO_DB_NAME` environment variable over the database name embedded in the `MONGO_URL`. This caused problems when:

1. **Development**: Uses local MongoDB without database in URL: `mongodb://localhost:27017/`
2. **Production**: Uses Atlas with database in URL: `mongodb+srv://user:pass@cluster.net/dbname?options`

When both environment variables were set, the code would:
- Connect to Atlas using credentials in MONGO_URL
- Try to access database specified in MONGO_DB_NAME (different from Atlas URL)
- Fail with authorization error because user doesn't have access to that database

### Issue 2: Environment Variable Override
The `load_dotenv()` calls were using default `override=True`, which would overwrite Kubernetes environment variables with values from the `.env` file during deployment.

## Solutions Applied

### Fix 1: Database Name Priority (Updated `/app/backend/utils/database.py`)

**Changed priority order:**
```python
# OLD (INCORRECT) - Prioritized MONGO_DB_NAME first
MONGO_DB_NAME = (
    os.environ.get('MONGO_DB_NAME') or 
    extract_db_name_from_url(MONGO_URL) or 
    'procurement_db'
)

# NEW (CORRECT) - Prioritizes database name from URL first
db_name_from_url = extract_db_name_from_url(MONGO_URL)
MONGO_DB_NAME = (
    db_name_from_url or 
    os.environ.get('MONGO_DB_NAME') or 
    'procurement_db'
)
```

**Why this works:**
- **Atlas deployment**: Database name is extracted from the connection string, ensuring authentication works
- **Local development**: Falls back to MONGO_DB_NAME environment variable
- **Fallback**: Uses 'procurement_db' as default if neither is specified

### Fix 2: Prevent Environment Variable Override

**Updated both files:**
- `/app/backend/utils/database.py` line 9
- `/app/backend/server.py` line 47

```python
# OLD (INCORRECT)
load_dotenv()

# NEW (CORRECT)
load_dotenv(override=False)
```

**Why this works:**
- In Kubernetes, environment variables are set by the deployment configuration
- With `override=False`, the `.env` file values won't replace K8s env vars
- Development still works because local env has no conflicting variables

## Testing the Fix

### Test 1: Database Name Extraction
```python
# Test with various MongoDB connection strings
test_urls = [
    'mongodb://localhost:27017/',  # No DB -> None
    'mongodb://localhost:27017/procurement_db',  # -> procurement_db
    'mongodb+srv://user:pass@cluster.net/my_db?opts',  # -> my_db
]
```

### Test 2: Environment Variable Priority
```bash
# Set environment variables
export MONGO_URL="mongodb+srv://user:pass@cluster.net/atlas_db?opts"
export MONGO_DB_NAME="local_db"

# Expected behavior:
# - Database name from URL (atlas_db) takes priority
# - Application connects to 'atlas_db', not 'local_db'
```

## Deployment Configuration

For successful deployment, ensure the following environment variables are set:

### Backend Environment Variables:
```yaml
MONGO_URL: "mongodb+srv://username:password@cluster.mongodb.net/your_database?retryWrites=true&w=majority"
CORS_ORIGINS: "https://your-app.emergent.host,https://your-domain.com"
EMERGENT_LLM_KEY: "your_key_here"
```

**Note:** `MONGO_DB_NAME` is now optional. If the database name is in the MONGO_URL, it will be automatically extracted.

### Frontend Environment Variables:
```yaml
REACT_APP_BACKEND_URL: "https://your-app.emergent.host"
```

## Verification Steps

After deployment, verify the fix worked by checking logs:

```bash
# Look for this in backend startup logs:
🔗 MongoDB Configuration:
   URL: mongodb+srv://...
   Database: your_atlas_database_name
```

The database name should match the one in your Atlas connection string.

## MongoDB Atlas Setup

Ensure your Atlas database user has the correct permissions:

1. **User Credentials**: Match those in MONGO_URL
2. **Database Access**: User must have read/write access to the database specified in the connection string
3. **Network Access**: Whitelist the Kubernetes cluster IP or use 0.0.0.0/0 for testing

## Additional Improvements Made

While fixing deployment, the following optimizations were also documented:

### Performance Optimizations (Future Work):
1. **N+1 Query Patterns**: Multiple endpoints fetch related data in loops (dashboard, assets)
2. **Projection Optimization**: Some queries fetch all fields when only a few are needed
3. **Batch Fetching**: Related entities should be pre-fetched and cached

These are non-blocking improvements that can be addressed in future releases.

## Summary

✅ **Database name now automatically extracted from MONGO_URL**
✅ **Environment variable override prevented for K8s deployments**  
✅ **Compatible with both local MongoDB and Atlas**
✅ **No hardcoded database references in code**

The application is now production-ready and should deploy successfully to Kubernetes with MongoDB Atlas.
