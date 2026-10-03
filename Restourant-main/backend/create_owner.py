"""
Create Restaurant Owner role and user account.
Has full access EXCEPT: Users & Roles, System Control, Database Tools
"""
import os, uuid
from datetime import datetime, timezone
from pymongo import MongoClient
import bcrypt

uri = os.environ.get('MONGODB_URI', 'mongodb://localhost:27017/restaurant_erp')
client = MongoClient(uri, serverSelectionTimeoutMS=10000)
db_name = uri.split('/')[-1].split('?')[0] or 'restaurant_erp'
db = client[db_name]

now = datetime.now(timezone.utc)

# --- STEP 1: Find excluded permission IDs ---
excluded_modules = ['Users & Roles', 'System Control', 'Database Tools']
excluded_perms = list(db.permissions.find({'module': {'$in': excluded_modules}}, {'_id': 0, 'id': 1}))
excluded_ids = set(p['id'] for p in excluded_perms)
print(f"Excluded modules: {excluded_modules}")
print(f"Excluded permission count: {len(excluded_ids)}")

# Get all permissions minus excluded
all_perms = list(db.permissions.find({}, {'_id': 0, 'id': 1}))
all_ids = [p['id'] for p in all_perms]
allowed_ids = [pid for pid in all_ids if pid not in excluded_ids]
print(f"Total: {len(all_ids)} | Allowed for Owner: {len(allowed_ids)}")

# --- STEP 2: Create/Update role ---
role_id = 'restaurant_owner'
db.roles.delete_one({'id': role_id})
role_doc = {
    'id': role_id,
    'name': 'Restaurant Owner',
    'description': 'Restaurant owner - full access except User Roles Matrix and Emergency Control',
    'isSystemBuiltIn': False,
    'permissions': allowed_ids,
    'createdAt': now,
    'updatedAt': now
}
db.roles.insert_one(role_doc)
print(f"\n[OK] Role 'Restaurant Owner' created with {len(allowed_ids)} permissions")

# --- STEP 3: Create user ---
USERNAME = 'owner'
PASSWORD = 'Owner@1234'   # Default password - change after first login!
EMAIL = 'owner@bhatigalbhanu.com'
DISPLAY_NAME = 'Restaurant Owner'

# Hash password
hashed_pw = bcrypt.hashpw(PASSWORD.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

# Remove existing owner user if any
db.users.delete_one({'username': USERNAME})

user_doc = {
    'id': str(uuid.uuid4()),
    'username': USERNAME,
    'email': EMAIL,
    'displayName': DISPLAY_NAME,
    'passwordHash': hashed_pw,
    'roleId': role_id,
    'status': 'ACTIVE',
    'isSuperAdmin': False,
    'createdAt': now,
    'updatedAt': now
}
db.users.insert_one(user_doc)

print(f"\n[OK] User created successfully!")
print(f"  Username : {USERNAME}")
print(f"  Password : {PASSWORD}")
print(f"  Role     : Restaurant Owner")
print(f"  Access   : All modules EXCEPT User Roles Matrix & Emergency Control")
print(f"\n*** Change password after first login! ***")

client.close()
