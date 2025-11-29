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
# 1. Database name extracted from MONGO_URL (ALWAYS takes priority for Atlas)
# 2. Explicitly set MONGO_DB_NAME environment variable (for local development)
# 3. Default fallback to 'procurement_db'
#
# IMPORTANT: If MONGO_URL contains a database name (e.g., Atlas connection string),
# that database name MUST be used, regardless of MONGO_DB_NAME environment variable.
# This ensures authentication works correctly with MongoDB Atlas.

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
    # No database in URL - use environment variable or default
    MONGO_DB_NAME = os.environ.get('MONGO_DB_NAME', 'procurement_db')
    print(f"\n✅ [DECISION] No database in URL, using MONGO_DB_NAME or default: '{MONGO_DB_NAME}'")

print(f"\n{'='*60}")
print(f"🔗 MongoDB Configuration:")
print(f"   URL: {MONGO_URL[:60]}...")
print(f"   Database: {MONGO_DB_NAME}")
print(f"   Source: {'URL' if db_name_from_url else 'Environment Variable or Default'}")
print(f"{'='*60}\n")

client = AsyncIOMotorClient(MONGO_URL)
db = client[MONGO_DB_NAME]
