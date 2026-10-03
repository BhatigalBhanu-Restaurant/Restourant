import bcrypt
from pymongo import MongoClient

uri = 'mongodb+srv://bhatigalbhanu_db_user:Restourant123@cluster0.uyvuiuh.mongodb.net/my_new_db?appName=Cluster0'
client = MongoClient(uri, serverSelectionTimeoutMS=10000)
db = client['my_new_db']

new_hash = bcrypt.hashpw(b'Owner@1234', bcrypt.gensalt()).decode('utf-8')
r = db.users.update_one(
    {'username': 'owner'},
    {
        '$set': {
            'passwordHash': new_hash,
            'status': 'ACTIVE',
            'failedLoginAttempts': 0,
            'lockedUntil': None
        },
        '$unset': {'password': '', 'pass': ''}
    }
)
print('Updated owner password result:', r.modified_count)

u = db.users.find_one({'username': 'owner'})
check = bcrypt.checkpw(b'Owner@1234', u['passwordHash'].encode())
print('Verify Owner@1234:', check)
client.close()
