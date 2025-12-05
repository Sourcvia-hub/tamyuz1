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
    
    print("[DB Extract] Returning None - no database name found")
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
print("[DB Config] Starting database configuration...")
print(f"[DB Config] MONGO_URL from env: {MONGO_URL[:80]}...")
print(f"[DB Config] MONGO_DB_NAME from env: {os.environ.get('MONGO_DB_NAME', 'NOT SET')}")
print(f"{'='*80}\n")

db_name_from_url = extract_db_name_from_url(MONGO_URL)

if db_name_from_url:
    # Database name found in URL - ALWAYS use this for Atlas compatibility
    MONGO_DB_NAME = db_name_from_url
    print(f"\n✅ [DECISION] Using database name from MONGO_URL: '{MONGO_DB_NAME}'")
    print("   (Ignoring any MONGO_DB_NAME environment variable)")
else:
    # No database in URL - check environment variable first
    env_db_name = os.environ.get('MONGO_DB_NAME')
    
    if 'mongodb+srv://' in MONGO_URL or 'mongodb.net' in MONGO_URL:
        # Using MongoDB Atlas - extract username which MUST match the database name
        # For Emergent Atlas: username = database name = user's access scope
        try:
            # Format: mongodb+srv://username:password@host/...
            if '@' in MONGO_URL:
                credentials = MONGO_URL.split('//')[1].split('@')[0]
                if ':' in credentials:
                    atlas_username = credentials.split(':')[0]
                    # ALWAYS use username as database name for Atlas
                    MONGO_DB_NAME = atlas_username
                else:
                    MONGO_DB_NAME = env_db_name if env_db_name else 'sourcevia'
            else:
                MONGO_DB_NAME = env_db_name if env_db_name else 'sourcevia'
        except Exception as e:
            MONGO_DB_NAME = env_db_name if env_db_name else 'sourcevia'
        
        print(f"\n✅ [Atlas] Using database: '{MONGO_DB_NAME}' (extracted from username)")
    else:
        # Local MongoDB - use environment variable or default
        if env_db_name == 'procurement_db':
            print("\n⚠️  WARNING: MONGO_DB_NAME is set to 'procurement_db' - this is deprecated!")
            print("   Overriding to 'sourcevia' to prevent authorization errors.")
            MONGO_DB_NAME = 'sourcevia'
        else:
            MONGO_DB_NAME = env_db_name if env_db_name else 'sourcevia'
        print(f"\n✅ [DECISION] Local MongoDB, using database: '{MONGO_DB_NAME}'")

# CRITICAL SAFETY CHECK: NEVER allow 'procurement_db'
if MONGO_DB_NAME == 'procurement_db':
    print("\n🚨 [CRITICAL ERROR] Database name is 'procurement_db' - this will cause authorization errors!")
    print("   FORCING override to 'sourcevia'")
    MONGO_DB_NAME = 'sourcevia'

print(f"\n{'='*80}")
print("🔗 FINAL MongoDB Configuration:")
print(f"   URL: {MONGO_URL[:70]}...")
print(f"   Database: '{MONGO_DB_NAME}'")
print(f"   Source: {'URL' if db_name_from_url else 'Environment Variable or Default'}")
print(f"{'='*80}")

# Final validation to guarantee we never use wrong database
if MONGO_DB_NAME == 'procurement_db':
    raise ValueError("FATAL: Cannot use 'procurement_db' database! This will cause authorization errors.")

# For Atlas URLs, verify the database name matches expectations
if ('mongodb+srv://' in MONGO_URL or 'mongodb.net' in MONGO_URL):
    if not db_name_from_url:
        print(f"\nℹ️  Note: Atlas URL reconstructed to include database '{MONGO_DB_NAME}'")
    print(f"ℹ️  Atlas user should have permissions on database: '{MONGO_DB_NAME}'")
    print()

print("\n[DB Init] Creating MongoDB client...")

# For Atlas URLs without database name in URL, reconstruct the URL
final_mongo_url = MONGO_URL
if ('mongodb+srv://' in MONGO_URL or 'mongodb.net' in MONGO_URL) and not db_name_from_url:
    print(f"[DB Init] Reconstructing Atlas URL to include database name '{MONGO_DB_NAME}'...")
    try:
        # Parse the URL
        parsed = urlparse(MONGO_URL)
        # Reconstruct with database name in path
        # Format: mongodb+srv://user:pass@host/dbname?options
        if parsed.query:
            final_mongo_url = f"{parsed.scheme}://{parsed.netloc}/{MONGO_DB_NAME}?{parsed.query}"
        else:
            final_mongo_url = f"{parsed.scheme}://{parsed.netloc}/{MONGO_DB_NAME}"
        print(f"[DB Init] Reconstructed URL: {final_mongo_url[:80]}...")
    except Exception as e:
        print(f"[DB Init] WARNING: Could not reconstruct URL: {e}")
        print(f"[DB Init] Using original URL and selecting database via client['{MONGO_DB_NAME}']")

client = AsyncIOMotorClient(final_mongo_url)
db = client[MONGO_DB_NAME]
print("[DB Init] Database client created successfully")
print(f"[DB Init] Will connect to database: '{MONGO_DB_NAME}'\n")

# Helper to get DB 
def get_db():
    return db