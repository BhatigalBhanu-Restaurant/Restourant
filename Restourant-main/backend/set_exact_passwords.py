import bcrypt
from pymongo import MongoClient

uri = 'mongodb+srv://bhatigalbhanu_db_user:Restourant123@cluster0.uyvuiuh.mongodb.net/my_new_db?appName=Cluster0'
client = MongoClient(uri, serverSelectionTimeoutMS=10000)
db = client['my_new_db']

# 1. Superadmin -> Admin@123
superadmin_hash = bcrypt.hashpw(b'Admin@123', bcrypt.gensalt()).decode('utf-8')
r1 = db.users.update_one(
    {'username': 'superadmin'},
    {
        '$set': {
            'passwordHash': superadmin_hash,
            'status': 'ACTIVE',
            'failedLoginAttempts': 0,
            'lockedUntil': None
        },
        '$unset': {'password': '', 'pass': ''}
    }
)
print('Updated superadmin to Admin@123:', r1.modified_count)

# 2. Owner -> owner123
owner_hash = bcrypt.hashpw(b'owner123', bcrypt.gensalt()).decode('utf-8')
r2 = db.users.update_one(
    {'username': 'owner'},
    {
        '$set': {
            'passwordHash': owner_hash,
            'status': 'ACTIVE',
            'failedLoginAttempts': 0,
            'lockedUntil': None
        },
        '$unset': {'password': '', 'pass': ''}
    }
)
print('Updated owner to owner123:', r2.modified_count)

# 3. Clear all sessions
r3 = db.user_sessions.delete_many({})
print('Cleared sessions:', r3.deleted_count)

# 4. Verify in DB
u_sa = db.users.find_one({'username': 'superadmin'})
print('Verify superadmin + Admin@123:  ', bcrypt.checkpw(b'Admin@123', u_sa['passwordHash'].encode()))
print('Verify superadmin + Admin@12345:', bcrypt.checkpw(b'Admin@12345', u_sa['passwordHash'].encode()))

u_ow = db.users.find_one({'username': 'owner'})
print('Verify owner + owner123:        ', bcrypt.checkpw(b'owner123', u_ow['passwordHash'].encode()))
print('Verify owner + Owner@1234:      ', bcrypt.checkpw(b'Owner@1234', u_ow['passwordHash'].encode()))

client.close()
