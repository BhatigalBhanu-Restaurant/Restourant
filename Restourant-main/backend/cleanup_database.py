"""
Restaurant ERP - Database Cleanup Script
=========================================
PURPOSE:
    Deletes all transactional/operational data from the database while
    PRESERVING all configuration and menu data.

PRESERVED COLLECTIONS (NOT touched):
    - menu_items, menu_categories, daily_menu   <-- MENU DATA IS PRESERVED
    - system_settings, users, roles, permissions
    - floor_zones, dining_tables, recipes

DELETED COLLECTIONS:
    - bookings, employees, employee_ledger
    - orders, kot_tickets, bills, payments
    - customers, suppliers, queue_tokens
    - audit_logs, daily_ledger, inventory_daily_ledger

HOW TO RUN:
    python cleanup_database.py

For Render / MongoDB Atlas:
    Set the environment variable first, then run:
        set MONGODB_URI=mongodb+srv://<user>:<password>@<cluster>.mongodb.net/<dbname>
        python cleanup_database.py

    On Linux/macOS:
        export MONGODB_URI=mongodb+srv://<user>:<password>@<cluster>.mongodb.net/<dbname>
        python cleanup_database.py
"""

import os
import sys

try:
    from pymongo import MongoClient
    from pymongo.errors import ConnectionFailure, OperationFailure
except ImportError:
    print("[ERROR] pymongo is not installed.")
    print("        Run:  pip install pymongo")
    sys.exit(1)


# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------

MONGODB_URI = os.environ.get(
    "MONGODB_URI",
    "mongodb://localhost:27017/restaurant_erp"
)

# Collections that will be WIPED
COLLECTIONS_TO_DELETE = [
    "bookings",
    "employees",
    "employee_ledger",
    "orders",
    "kot_tickets",
    "bills",
    "payments",
    "customers",
    "suppliers",
    "queue_tokens",
    "audit_logs",
    "daily_ledger",
    "inventory_daily_ledger",
]

# Collections that will be LEFT UNTOUCHED (listed for user visibility)
COLLECTIONS_TO_KEEP = [
    "menu_items",
    "menu_categories",
    "daily_menu",
    "system_settings",
    "users",
    "roles",
    "permissions",
    "floor_zones",
    "dining_tables",
    "recipes",
]


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def print_separator(char="=", width=60):
    print(char * width)


def print_warning():
    print_separator("!", 60)
    print("!!" + " " * 56 + "!!")
    print("!!        *** RESTAURANT DATABASE CLEANUP SCRIPT ***      !!")
    print("!!" + " " * 56 + "!!")
    print_separator("!", 60)
    print()
    print("  Target URI :", MONGODB_URI)
    print()
    print("  The following collections will be PERMANENTLY DELETED:")
    for col in COLLECTIONS_TO_DELETE:
        print(f"    ✗  {col}")
    print()
    print("  The following collections will be PRESERVED (not touched):")
    for col in COLLECTIONS_TO_KEEP:
        print(f"    ✓  {col}")
    print()
    print_separator("!", 60)
    print("!!  THIS ACTION IS IRREVERSIBLE. ALL LISTED DATA WILL BE  !!")
    print("!!  PERMANENTLY REMOVED. MAKE SURE YOU HAVE A BACKUP.    !!")
    print_separator("!", 60)
    print()


def confirm():
    print("Type  YES  (all caps) and press Enter to proceed.")
    print("Type anything else (or press Ctrl+C) to abort.")
    print()
    try:
        answer = input("Your confirmation: ").strip()
    except (KeyboardInterrupt, EOFError):
        print("\n\nAborted by user.")
        sys.exit(0)

    if answer != "YES":
        print("\nConfirmation not received. Aborting — no data was deleted.")
        sys.exit(0)


def get_database(uri: str):
    """Connect to MongoDB and return the database object."""
    client = MongoClient(uri, serverSelectionTimeoutMS=8000)
    # Trigger connection check
    client.admin.command("ping")
    # Extract database name from URI; fall back to 'restaurant_erp'
    db_name = uri.split("/")[-1].split("?")[0] or "restaurant_erp"
    return client, client[db_name]


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():
    print()
    print_warning()
    confirm()

    print()
    print_separator("-")
    print("Connecting to MongoDB …")
    try:
        client, db = get_database(MONGODB_URI)
    except ConnectionFailure as exc:
        print(f"[ERROR] Could not connect to MongoDB: {exc}")
        sys.exit(1)

    print(f"Connected.  Database: {db.name}")
    print_separator("-")
    print()

    results = {}
    total_deleted = 0

    for collection_name in COLLECTIONS_TO_DELETE:
        try:
            collection = db[collection_name]
            result = collection.delete_many({})
            deleted = result.deleted_count
            results[collection_name] = deleted
            total_deleted += deleted
            print(f"  Deleted {deleted:>8,} document(s)  ←  {collection_name}")
        except OperationFailure as exc:
            results[collection_name] = f"ERROR: {exc}"
            print(f"  [ERROR] {collection_name}: {exc}")

    print()
    print_separator("=")
    print("  CLEANUP SUMMARY")
    print_separator("=")
    for col, count in results.items():
        if isinstance(count, int):
            print(f"  {col:<30}  {count:>8,} document(s) deleted")
        else:
            print(f"  {col:<30}  {count}")
    print_separator("-")
    print(f"  {'TOTAL':<30}  {total_deleted:>8,} document(s) deleted")
    print_separator("=")
    print()
    print("  PRESERVED collections (untouched):")
    for col in COLLECTIONS_TO_KEEP:
        print(f"    ✓  {col}")
    print()
    print("Cleanup complete.")
    client.close()


if __name__ == "__main__":
    main()
