from pymongo import MongoClient, ASCENDING, DESCENDING
from pymongo.database import Database
from typing import Optional
from .config import settings
from .utils.logger import logger

_mongo_client: Optional[MongoClient] = None
_db: Optional[Database] = None

def get_mongo_client() -> MongoClient:
    global _mongo_client
    if _mongo_client is None:
        try:
            logger.info(f"Connecting to MongoDB at: {settings.MONGODB_URI}")
            _mongo_client = MongoClient(
                settings.MONGODB_URI,
                serverSelectionTimeoutMS=8000,
                connectTimeoutMS=8000
            )
            # Test connection
            _mongo_client.admin.command('ping')
            logger.info("Successfully connected to MongoDB server.")
        except Exception as err:
            logger.error(f"Failed to connect to MongoDB: {err}")
            raise err
    return _mongo_client

def get_db() -> Database:
    global _db
    if _db is None:
        client = get_mongo_client()
        # Parse db name from URI if provided, else use settings.DB_NAME
        try:
            _db = client.get_default_database()
        except Exception:
            _db = client[settings.DB_NAME]
        if _db is None or _db.name == 'test':
            _db = client[settings.DB_NAME]
    return _db

def ensure_indexes():
    """Create essential MongoDB indexes for optimal performance."""
    try:
        db = get_db()
        # Users
        db.users.create_index([("id", ASCENDING)], unique=True)
        db.users.create_index([("username", ASCENDING)], unique=True)
        db.users.create_index([("email", ASCENDING)], unique=True)
        
        # Roles & Permissions
        db.roles.create_index([("id", ASCENDING)], unique=True)
        db.roles.create_index([("name", ASCENDING)], unique=True)
        db.permissions.create_index([("id", ASCENDING)], unique=True)
        db.permissions.create_index([("module", ASCENDING)])
        
        # Orders & KOT
        db.orders.create_index([("id", ASCENDING)], unique=True)
        db.orders.create_index([("orderNumber", ASCENDING)], unique=True)
        db.orders.create_index([("status", ASCENDING), ("createdAt", DESCENDING)])
        db.kot_tickets.create_index([("id", ASCENDING)], unique=True)
        db.kot_tickets.create_index([("kotNumber", ASCENDING)], unique=True)
        db.kot_tickets.create_index([("orderId", ASCENDING)])
        db.kot_tickets.create_index([("status", ASCENDING)])
        
        # Billing & Payments
        db.bills.create_index([("id", ASCENDING)], unique=True)
        db.bills.create_index([("billNumber", ASCENDING)], unique=True)
        db.bills.create_index([("orderId", ASCENDING)])
        db.payments.create_index([("id", ASCENDING)], unique=True)
        db.payments.create_index([("paymentNumber", ASCENDING)], unique=True)
        db.payments.create_index([("billId", ASCENDING)])
        
        # Masters
        db.menu_items.create_index([("id", ASCENDING)], unique=True)
        db.menu_categories.create_index([("id", ASCENDING)], unique=True)
        db.dining_tables.create_index([("id", ASCENDING)], unique=True)
        db.dining_tables.create_index([("tableNumber", ASCENDING)], unique=True)
        db.floor_zones.create_index([("code", ASCENDING)], unique=True)
        db.customers.create_index([("phone", ASCENDING)], unique=True)
        db.suppliers.create_index([("id", ASCENDING)], unique=True)
        
        # Inventory & Recipes
        db.inventory_items.create_index([("id", ASCENDING)], unique=True)
        db.inventory_items.create_index([("itemCode", ASCENDING)], unique=True)
        db.recipes.create_index([("menuItemId", ASCENDING)], unique=True)
        
        # Bookings & Queue Tokens
        db.bookings.create_index([("bookingDate", ASCENDING), ("status", ASCENDING)])
        db.queue_tokens.create_index([("tokenDate", ASCENDING), ("tokenNumber", ASCENDING)])
        
        # System
        db.system_settings.create_index([("key", ASCENDING)], unique=True)
        db.audit_logs.create_index([("timestamp", DESCENDING)])
        db.audit_logs.create_index([("module", ASCENDING)])
        
        logger.info("MongoDB database indexes successfully verified.")
    except Exception as e:
        logger.warning(f"Index creation warning (non-fatal): {e}")

def close_database():
    global _mongo_client, _db
    if _mongo_client:
        _mongo_client.close()
        _mongo_client = None
        _db = None
        logger.info("MongoDB connection closed.")
