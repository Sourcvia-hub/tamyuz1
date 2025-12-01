# 🚀 Local MongoDB Deployment Guide - No Atlas Required

## Configuration Complete ✅

Your backend is now configured to use **local MongoDB inside the Emergent container**.

### Current Configuration

**File:** `/app/backend/.env`
```env
MONGO_URL=mongodb://localhost:27017
MONGO_DB_NAME=sourcevia
```

This configuration:
- ✅ Uses local MongoDB (no external service)
- ✅ No authentication required
- ✅ Database name: "sourcevia"
- ✅ Tested and working

## Deployment Steps

### Step 1: Clean Environment Variables in Emergent

**Remove any Atlas MONGO_URL from your deployment:**

1. Go to your Emergent deployment settings
2. Find environment variables section
3. **Remove or clear** any `MONGO_URL` that points to Atlas
4. The backend will use the value from `.env` file (localhost)

**What to remove:**
```env
# Remove any URLs like this:
MONGO_URL=mongodb+srv://...@cluster.mongodb.net/...
```

**What to keep/set:**
```env
# Keep these (they're already in .env, but you can set them in Emergent too)
MONGO_DB_NAME=sourcevia
CORS_ORIGINS=https://sourcevia.xyz,https://www.sourcevia.xyz,https://sourcevia-secure.emergent.host
EMERGENT_LLM_KEY=sk-emergent-e9d7eEd061b2fCeDbB
```

### Step 2: Verify MongoDB is Running in Container

Emergent should automatically start MongoDB in the container. You can verify this in the logs:

**Expected logs:**
```
✅ [DECISION] Local MongoDB, using database: 'sourcevia'
🔗 FINAL MongoDB Configuration:
   URL: mongodb://localhost:27017
   Database: 'sourcevia'
[DB Init] Database client created successfully
```

### Step 3: Deploy

Deploy your backend through Emergent. The application will:
1. Start MongoDB locally in the container
2. Connect to `mongodb://localhost:27017`
3. Use database `sourcevia`
4. All auth endpoints will work

### Step 4: Create Initial Users

After deployment, you need to create users in the database.

**Option A: Via Registration Endpoint**
```bash
curl -X POST https://sourcevia-secure.emergent.host/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Admin User",
    "email": "admin@sourcevia.com",
    "password": "admin123",
    "role": "admin"
  }'
```

**Option B: Create Users via Script**

If you have backend shell access, run this Python script:

```python
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from passlib.context import CryptContext
from datetime import datetime, timezone

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

async def create_users():
    client = AsyncIOMotorClient("mongodb://localhost:27017")
    db = client["sourcevia"]
    
    # Clear existing users (optional)
    await db.users.delete_many({})
    
    # Create users
    users = [
        {
            "id": "admin-001",
            "email": "admin@sourcevia.com",
            "password": pwd_context.hash("admin123"),
            "name": "Admin User",
            "role": "admin",
            "department": "Administration",
            "created_at": datetime.now(timezone.utc)
        },
        {
            "id": "po-001",
            "email": "po@sourcevia.com",
            "password": pwd_context.hash("po123456"),
            "name": "PO User",
            "role": "procurement_officer",
            "department": "Procurement",
            "created_at": datetime.now(timezone.utc)
        },
        {
            "id": "user-001",
            "email": "user@sourcevia.com",
            "password": pwd_context.hash("user12345"),
            "name": "Regular User",
            "role": "user",
            "department": "Operations",
            "created_at": datetime.now(timezone.utc)
        }
    ]
    
    await db.users.insert_many(users)
    print(f"✅ Created {len(users)} users")
    client.close()

asyncio.run(create_users())
```

## Testing After Deployment

### 1. Health Check
```bash
curl https://sourcevia-secure.emergent.host/api/health
```
**Expected:** `{"status":"ok","database":"connected"}`

### 2. Login Test
```bash
curl -X POST https://sourcevia-secure.emergent.host/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@sourcevia.com","password":"admin123"}'
```
**Expected:** HTTP 200 with user data

### 3. Frontend Test
1. Visit https://sourcevia.xyz/login
2. Register a new user or login
3. Should work without errors

## Data Persistence

### Important Notes:

**Container Storage:**
- Data is stored inside the container
- **Data will be lost** if container is recreated/redeployed
- Not suitable for production with critical data

**For Data Persistence:**

If you need data to persist across deployments, you have two options:

**Option 1: Use External MongoDB**
- Self-hosted MongoDB on a separate server
- Update MONGO_URL to point to that server
- Data persists across deployments

**Option 2: Emergent Persistent Volumes**
- Check if Emergent supports persistent volumes
- Mount MongoDB data directory to persistent storage
- Data survives container restarts

**Option 3: Regular Backups**
- Export data before redeployment
- Import after deployment
- Manual but simple

## Troubleshooting

### Error: "Connection refused" to MongoDB

**Cause:** MongoDB not started in container

**Fix:**
- Check if MongoDB process is running: `ps aux | grep mongod`
- Start MongoDB: `mongod --bind_ip_all --fork --logpath /var/log/mongodb.log`
- Or check Emergent container startup scripts

### Error: "Database 'sourcevia' not found"

**Cause:** MongoDB doesn't auto-create databases until data is inserted

**Fix:** This is normal. Database will be created on first write operation (user registration)

### Error: Still getting "not authorized" errors

**Cause:** Environment variable still pointing to Atlas

**Fix:**
1. Check actual MONGO_URL in production: `echo $MONGO_URL`
2. Remove Atlas URL from Emergent environment variables
3. Redeploy

## Advantages of Local MongoDB

✅ **No external dependencies** - Everything in one container  
✅ **No authentication needed** - Simpler setup  
✅ **No network latency** - Fast local connections  
✅ **No monthly costs** - No cloud database fees  
✅ **Works offline** - No internet required  

## Limitations of Local MongoDB

⚠️ **Data not persistent** - Lost on container restart  
⚠️ **Single instance** - No redundancy  
⚠️ **No scaling** - Single container only  
⚠️ **Not production-ready** - For development/testing  

## Migration Path (Future)

When you want to move to persistent storage:

1. **Export data:**
   ```bash
   mongodump --uri="mongodb://localhost:27017/sourcevia" --out=/backup
   ```

2. **Set up external MongoDB** (your own server or other service)

3. **Update MONGO_URL:**
   ```env
   MONGO_URL=mongodb://your-server:27017
   ```

4. **Import data:**
   ```bash
   mongorestore --uri="mongodb://your-server:27017/sourcevia" /backup/sourcevia
   ```

## Summary

**Current Setup:**
- ✅ Local MongoDB in container
- ✅ No Atlas required
- ✅ Configuration complete
- ✅ Tested and working

**To Deploy:**
1. Remove Atlas MONGO_URL from Emergent environment variables
2. Deploy backend
3. Create initial users
4. Test authentication

**Data Note:**
- Local storage (not persistent across redeployments)
- Consider external MongoDB for production

---

**Your backend is ready to deploy with local MongoDB! 🚀**
