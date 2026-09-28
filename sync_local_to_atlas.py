import sys
import os
from pymongo import MongoClient

# Unwanted legacy collections that do NOT belong to Bhatigal Bhanu
UNWANTED_COLLECTIONS = [
    "floor_zones", "floorzones",
    "dining_tables", "diningtables",
    "kot_tickets", "kottickets",
    "orders",
    "recipes",
    "queue_tokens", "queuetokens",
    "chart_of_accounts", "chartofaccounts",
    "taxmasters", "dailymenuconfigs", "dailymenus", "menuitems", "menucategories"
]

# Core Bhatigal Bhanu ERP collections to sync from local to Atlas
CORE_COLLECTIONS = [
    "users",
    "roles",
    "permissions",
    "menu_categories",
    "menu_items",
    "daily_menus",
    "daily_menu_configs",
    "bookings",
    "employees",
    "employee_advances",
    "employee_ledger",
    "salary_records",
    "daily_inventory_ledgers",
    "customers",
    "system_settings"
]

def sync(atlas_uri: str, local_uri: str = "mongodb://localhost:27017", db_name: str = "restaurant_erp"):
    print("=" * 65)
    print("BHATIGAL BHANU - LOCAL TO MONGODB ATLAS SYNC & CLEANUP")
    print("=" * 65)

    if not atlas_uri or not atlas_uri.startswith("mongodb"):
        print("\n[ERROR] Invalid Atlas MongoDB URI provided!")
        print("Usage: python sync_local_to_atlas.py \"mongodb+srv://<user>:<password>@cluster0.../restaurant_erp\"\n")
        return

    print(f"\n1. Connecting to Local MongoDB ({local_uri})...")
    try:
        local_client = MongoClient(local_uri, serverSelectionTimeoutMS=5000)
        local_db = local_client[db_name]
        # Quick check
        local_items_count = local_db.menu_items.count_documents({})
        print(f"   ✓ Connected to Local DB: {db_name} (Found {local_items_count} menu items)")
    except Exception as e:
        print(f"   ✗ Error connecting to Local MongoDB: {e}")
        return

    print(f"\n2. Connecting to MongoDB Atlas Cloud...")
    try:
        atlas_client = MongoClient(atlas_uri, serverSelectionTimeoutMS=10000)
        # Parse db name if provided in URI or default
        atlas_db = atlas_client[db_name]
        atlas_client.admin.command('ping')
        print(f"   ✓ Successfully connected to MongoDB Atlas!")
    except Exception as e:
        print(f"   ✗ Error connecting to MongoDB Atlas: {e}")
        return

    print(f"\n3. Cleaning unwanted legacy collections from Atlas...")
    atlas_cols = atlas_db.list_collection_names()
    dropped_count = 0
    for col in UNWANTED_COLLECTIONS:
        if col in atlas_cols:
            atlas_db.drop_collection(col)
            print(f"   🗑️  Dropped unwanted collection: {col}")
            dropped_count += 1
    if dropped_count == 0:
        print("   ✓ No unwanted legacy collections found.")

    print(f"\n4. Syncing local Bhatigal Bhanu data to MongoDB Atlas...")
    for col_name in CORE_COLLECTIONS:
        if col_name not in local_db.list_collection_names():
            continue
        
        docs = list(local_db[col_name].find({}))
        if not docs:
            continue

        print(f"   📦 Syncing {col_name} ({len(docs)} documents)...")
        # Clean existing target collection in Atlas
        atlas_db[col_name].delete_many({})
        # Insert all documents from local
        atlas_db[col_name].insert_many(docs)
        print(f"      ✓ Successfully synced {len(docs)} records to Atlas {col_name}")

    print("\n" + "=" * 65)
    print("🎉 SYNC & CLEANUP COMPLETE!")
    print("MongoDB Atlas is now 100% updated with your local Kathiyawadi ERP data.")
    print("All unwanted collections (floor_zones, kot, orders) have been removed.")
    print("=" * 65 + "\n")

if __name__ == "__main__":
    if len(sys.argv) > 1:
        target_uri = sys.argv[1]
    else:
        target_uri = os.environ.get("MONGODB_URI", "")
        if not target_uri:
            print("\nPlease enter your MongoDB Atlas Connection String:")
            print("(Example: mongodb+srv://username:password@cluster0.xxx.mongodb.net/restaurant_erp?retryWrites=true&w=majority)")
            target_uri = input("Atlas URI: ").strip()

    sync(target_uri)
