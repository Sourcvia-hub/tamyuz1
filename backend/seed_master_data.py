"""
Seed script to initialize master data:
- Buildings (Main Building, Annex Building)
- Floors for each building
- Asset Categories
"""

import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from datetime import datetime, timezone
import uuid
import os
from dotenv import load_dotenv

# Load environment
load_dotenv()

MONGO_URL = os.getenv("MONGO_URL", "mongodb://localhost:27017")
MONGO_DB_NAME = os.getenv("MONGO_DB_NAME", "sourcevia")

# Building data
BUILDINGS = [
    {
        "id": str(uuid.uuid4()),
        "name": "Main Building",
        "code": "MAIN",
        "address": "Main Campus",
        "is_active": True,
        "created_at": datetime.now(timezone.utc)
    },
    {
        "id": str(uuid.uuid4()),
        "name": "Annex Building",
        "code": "ANNEX",
        "address": "Annex Campus",
        "is_active": True,
        "created_at": datetime.now(timezone.utc)
    }
]

# Floors for Main Building
FLOORS_MAIN = [
    {"name": "Ground Floor", "number": 0},
    {"name": "1st Floor", "number": 1},
    {"name": "2nd Floor", "number": 2},
    {"name": "3rd Floor", "number": 3},
    {"name": "4th Floor", "number": 4},
]

# Floors for Annex Building
FLOORS_ANNEX = [
    {"name": "Ground Floor", "number": 0},
    {"name": "1st Floor", "number": 1},
    {"name": "2nd Floor", "number": 2},
]

# Asset Categories
ASSET_CATEGORIES = [
    {
        "id": str(uuid.uuid4()),
        "name": "IT Equipment",
        "description": "Computers, laptops, servers, networking equipment",
        "is_active": True,
        "created_at": datetime.now(timezone.utc)
    },
    {
        "id": str(uuid.uuid4()),
        "name": "Furniture",
        "description": "Desks, chairs, cabinets, shelves",
        "is_active": True,
        "created_at": datetime.now(timezone.utc)
    },
    {
        "id": str(uuid.uuid4()),
        "name": "HVAC Systems",
        "description": "Air conditioning, heating, ventilation systems",
        "is_active": True,
        "created_at": datetime.now(timezone.utc)
    },
    {
        "id": str(uuid.uuid4()),
        "name": "Security Equipment",
        "description": "CCTV cameras, access control, alarms",
        "is_active": True,
        "created_at": datetime.now(timezone.utc)
    },
    {
        "id": str(uuid.uuid4()),
        "name": "Office Equipment",
        "description": "Printers, scanners, photocopiers, fax machines",
        "is_active": True,
        "created_at": datetime.now(timezone.utc)
    },
    {
        "id": str(uuid.uuid4()),
        "name": "Electrical Equipment",
        "description": "UPS, generators, power distribution",
        "is_active": True,
        "created_at": datetime.now(timezone.utc)
    },
    {
        "id": str(uuid.uuid4()),
        "name": "Communication Systems",
        "description": "Phones, intercom, teleconference equipment",
        "is_active": True,
        "created_at": datetime.now(timezone.utc)
    },
    {
        "id": str(uuid.uuid4()),
        "name": "Kitchen Equipment",
        "description": "Refrigerators, microwaves, coffee machines",
        "is_active": True,
        "created_at": datetime.now(timezone.utc)
    },
    {
        "id": str(uuid.uuid4()),
        "name": "Vehicles",
        "description": "Company cars, vans, trucks",
        "is_active": True,
        "created_at": datetime.now(timezone.utc)
    },
    {
        "id": str(uuid.uuid4()),
        "name": "Tools & Equipment",
        "description": "Maintenance tools, specialized equipment",
        "is_active": True,
        "created_at": datetime.now(timezone.utc)
    }
]


async def seed_data():
    """Seed master data into MongoDB"""
    client = AsyncIOMotorClient(MONGO_URL)
    db = client[MONGO_DB_NAME]
    
    print("🌱 Seeding master data...")
    
    # 1. Seed Buildings
    print("\n📍 Seeding Buildings...")
    buildings_collection = db.buildings
    
    # Check if buildings already exist
    existing_buildings = await buildings_collection.count_documents({})
    if existing_buildings > 0:
        print(f"   ⚠️  {existing_buildings} buildings already exist. Skipping...")
    else:
        await buildings_collection.insert_many(BUILDINGS)
        print(f"   ✅ Created {len(BUILDINGS)} buildings (Main Building, Annex Building)")
    
    # 2. Seed Floors
    print("\n🏢 Seeding Floors...")
    floors_collection = db.floors
    
    existing_floors = await floors_collection.count_documents({})
    if existing_floors > 0:
        print(f"   ⚠️  {existing_floors} floors already exist. Skipping...")
    else:
        # Get building IDs
        main_building = await buildings_collection.find_one({"name": "Main Building"})
        annex_building = await buildings_collection.find_one({"name": "Annex Building"})
        
        if not main_building or not annex_building:
            print("   ❌ Buildings not found. Please run buildings seed first.")
            return
        
        floors_to_insert = []
        
        # Floors for Main Building
        for floor_data in FLOORS_MAIN:
            floors_to_insert.append({
                "id": str(uuid.uuid4()),
                "building_id": main_building["id"],
                "name": floor_data["name"],
                "number": floor_data["number"],
                "is_active": True,
                "created_at": datetime.now(timezone.utc)
            })
        
        # Floors for Annex Building
        for floor_data in FLOORS_ANNEX:
            floors_to_insert.append({
                "id": str(uuid.uuid4()),
                "building_id": annex_building["id"],
                "name": floor_data["name"],
                "number": floor_data["number"],
                "is_active": True,
                "created_at": datetime.now(timezone.utc)
            })
        
        await floors_collection.insert_many(floors_to_insert)
        print(f"   ✅ Created {len(floors_to_insert)} floors")
        print(f"      - Main Building: {len(FLOORS_MAIN)} floors")
        print(f"      - Annex Building: {len(FLOORS_ANNEX)} floors")
    
    # 3. Seed Asset Categories
    print("\n📦 Seeding Asset Categories...")
    categories_collection = db.asset_categories
    
    existing_categories = await categories_collection.count_documents({})
    if existing_categories > 0:
        print(f"   ⚠️  {existing_categories} categories already exist. Skipping...")
    else:
        await categories_collection.insert_many(ASSET_CATEGORIES)
        print(f"   ✅ Created {len(ASSET_CATEGORIES)} asset categories:")
        for cat in ASSET_CATEGORIES:
            print(f"      - {cat['name']}")
    
    print("\n✨ Master data seeding complete!")
    
    # Print summary
    print("\n📊 Summary:")
    building_count = await buildings_collection.count_documents({})
    floor_count = await floors_collection.count_documents({})
    category_count = await categories_collection.count_documents({})
    
    print(f"   Buildings: {building_count}")
    print(f"   Floors: {floor_count}")
    print(f"   Asset Categories: {category_count}")
    
    client.close()


if __name__ == "__main__":
    asyncio.run(seed_data())
