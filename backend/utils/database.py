"""
Database connection and utilities
"""
from motor.motor_asyncio import AsyncIOMotorClient
import os
from dotenv import load_dotenv
from urllib.parse import urlparse, parse_qs

# Load .env file but don't override existing environment variables (K8s deployment)
load_dotenv(override=False)

def extract_db_name_from_url(mongo_url):
    """
    Extract database name from MongoDB connection string.
    Supports both standard and Atlas connection strings.
    
    Examples:
    - mongodb://localhost:27017/mydb -> mydb
    - mongodb+srv://user:pass@cluster.net/mydb?options -> mydb
    - mongodb://localhost:27017/ -> None
    """
    try:
        # Parse the URL
        parsed = urlparse(mongo_url)
        
        # Get the path (everything after the host, before query string)
        path = parsed.path
        
        # Remove leading slash and query parameters
        if path and len(path) > 1:
            db_name = path.lstrip('/').split('?')[0]
            if db_name and db_name.strip():
                print(f"[DB Extract] Found database name in URL: '{db_name}'")
                return db_name.strip()
            else:
                print(f"[DB Extract] Path found but empty: '{path}'")
        else:
            print(f"[DB Extract] No path in URL (path='{path}')")
    except Exception as e:
        print(f"[DB Extract] ERROR parsing URL: {e}")
        import traceback
        traceback.print_exc()
    
    print(f"[DB Extract] Returning None - no database name found")
    return None

# MongoDB connection
MONGO_URL = os.environ.get('MONGO_URL', 'mongodb://localhost:27017/')

# Database name priority (CRITICAL for Atlas compatibility):
# 1. Database name extracted from MONGO_URL (ALWAYS takes priority)
# 2. If Atlas URL without DB name: Default to 'sourcevia' (NOT 'procurement_db')
# 3. If local MongoDB: Use MONGO_DB_NAME environment variable or default to 'sourcevia'
#
# IMPORTANT: If MONGO_URL contains a database name (e.g., Atlas connection string),
# that database name MUST be used, regardless of MONGO_DB_NAME environment variable.
# This ensures authentication works correctly with MongoDB Atlas.
#
# CRITICAL FIX: Never use 'procurement_db' as default for Atlas to avoid authorization errors.

print(f"\n{'='*80}")
print(f"[DB Config] Starting database configuration...")
print(f"[DB Config] MONGO_URL from env: {MONGO_URL[:80]}...")
print(f"[DB Config] MONGO_DB_NAME from env: {os.environ.get('MONGO_DB_NAME', 'NOT SET')}")
print(f"{'='*80}\n")

db_name_from_url = extract_db_name_from_url(MONGO_URL)

if db_name_from_url:
    # Database name found in URL - ALWAYS use this for Atlas compatibility
    MONGO_DB_NAME = db_name_from_url
    print(f"\n✅ [DECISION] Using database name from MONGO_URL: '{MONGO_DB_NAME}'")
    print(f"   (Ignoring any MONGO_DB_NAME environment variable)")
else:
    # No database in URL - check if using Atlas (which requires DB in URL)
    if 'mongodb+srv://' in MONGO_URL or 'mongodb.net' in MONGO_URL:
        # Using MongoDB Atlas but no DB name in URL - this is an error
        print(f"\n❌ [ERROR] MongoDB Atlas URL detected but no database name found in URL!")
        print(f"   MongoDB Atlas requires database name in the connection string.")
        print(f"   Current MONGO_URL: {MONGO_URL[:70]}...")
        print(f"\n   Please update MONGO_URL to include database name:")
        print(f"   Example: mongodb+srv://user:pass@cluster.net/sourcevia?options")
        print(f"\n   FORCING database name to 'sourcevia' to prevent authorization errors.")
        MONGO_DB_NAME = 'sourcevia'  # Force 'sourcevia' for Atlas
    else:
        # Local MongoDB - check environment variable but NEVER allow 'procurement_db'
        env_db_name = os.environ.get('MONGO_DB_NAME', 'sourcevia')
        if env_db_name == 'procurement_db':
            print(f"\n⚠️  WARNING: MONGO_DB_NAME is set to 'procurement_db' - this is deprecated!")
            print(f"   Overriding to 'sourcevia' to prevent authorization errors.")
            MONGO_DB_NAME = 'sourcevia'
        else:
            MONGO_DB_NAME = env_db_name
        print(f"\n✅ [DECISION] Local MongoDB, using database: '{MONGO_DB_NAME}'")

# CRITICAL SAFETY CHECK: NEVER allow 'procurement_db'
if MONGO_DB_NAME == 'procurement_db':
    print(f"\n🚨 [CRITICAL ERROR] Database name is 'procurement_db' - this will cause authorization errors!")
    print(f"   FORCING override to 'sourcevia'")
    MONGO_DB_NAME = 'sourcevia'

print(f"\n{'='*80}")
print(f"🔗 FINAL MongoDB Configuration:")
print(f"   URL: {MONGO_URL[:70]}...")
print(f"   Database: '{MONGO_DB_NAME}'")
print(f"   Source: {'URL' if db_name_from_url else 'Environment Variable or Default'}")
print(f"{'='*80}")

# CRITICAL VALIDATION: Verify Atlas URLs have database name
if ('mongodb+srv://' in MONGO_URL or 'mongodb.net' in MONGO_URL) and not db_name_from_url:
    print(f"\n⚠️  CRITICAL: MongoDB Atlas URL missing database name!")
    print(f"   Using fallback database 'sourcevia' to prevent authorization errors.")
    print(f"   For production, please update MONGO_URL to include database name:")
    print(f"   Example: mongodb+srv://user:pass@cluster.net/sourcevia?options")
    print(f"\n")

# Final validation to guarantee we never use wrong database
if MONGO_DB_NAME == 'procurement_db':
    raise ValueError("FATAL: Cannot use 'procurement_db' database! This will cause authorization errors.")

# For Atlas URLs, warn if not using 'sourcevia' but don't crash
if ('mongodb+srv://' in MONGO_URL or 'mongodb.net' in MONGO_URL) and MONGO_DB_NAME != 'sourcevia':
    print(f"\n⚠️  WARNING: Using database '{MONGO_DB_NAME}' with MongoDB Atlas.")
    print(f"   Make sure your Atlas user has permissions for this database.")
    print(f"   Recommended database name: 'sourcevia'")
    print()

print(f"\n[DB Init] Creating MongoDB client...")
client = AsyncIOMotorClient(MONGO_URL)
db = client[MONGO_DB_NAME]
print(f"[DB Init] Database client created successfully")
print(f"[DB Init] Will connect to database: '{MONGO_DB_NAME}'\n")

# Helper to get DB 
def get_db():
    return db