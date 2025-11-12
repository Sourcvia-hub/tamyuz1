#!/usr/bin/env python3
"""
Setup test users directly in MongoDB for Sourcevia Procurement System
"""
import os
import hashlib
from datetime import datetime, timezone
from pymongo import MongoClient
import uuid

def hash_password(password: str) -> str:
    """Simple password hashing"""
    return hashlib.sha256(password.encode()).hexdigest()

# Get MongoDB connection details
mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017/')
db_name = os.environ.get('DB_NAME', 'test_database')

# Connect to MongoDB
client = MongoClient(mongo_url)
db = client[db_name]

# Test users
users = [
    {
        "id": str(uuid.uuid4()),
        "email": "procurement@test.com",
        "name": "Procurement Officer",
        "password": hash_password("password"),
        "role": "procurement_officer",
        "created_at": datetime.now(timezone.utc).isoformat()
    },
    {
        "id": str(uuid.uuid4()),
        "email": "manager@test.com",
        "name": "Project Manager",
        "password": hash_password("password"),
        "role": "project_manager",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
]

print("Setting up test users...")
print("=" * 60)

# Clear existing test users
db.users.delete_many({"email": {"$in": ["procurement@test.com", "manager@test.com"]}})

for user in users:
    # Insert user
    db.users.insert_one(user.copy())
    print(f"\n✅ Created: {user['name']}")
    print(f"   Email: {user['email']}")
    print(f"   Password: password")
    print(f"   Role: {user['role']}")

print("\n" + "=" * 60)
print("✅ Setup complete!")
print("=" * 60)
print("\n🔐 Login Credentials:")
print("\n1. Procurement Officer:")
print("   Email: procurement@test.com")
print("   Password: password")
print("\n2. Project Manager:")
print("   Email: manager@test.com")
print("   Password: password")
print("\n🌐 Open your app and login with these credentials!")
