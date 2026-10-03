import bcrypt
from pymongo import MongoClient

uri = 'mongodb+srv://bhatigalbhanu_db_user:Restourant123@cluster0.uyvuiuh.mongodb.net/my_new_db?appName=Cluster0'
client = MongoClient(uri, serverSelectionTimeoutMS=15000)
db = client['my_new_db']

NEW_PASSWORD = 'Admin@123'
new_hash = bcrypt.hashpw(NEW_PASSWORD.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

# Step 1: Change username from 'superadmin' to 'admin' AND set new password
# This breaks the old backdoor which specifically checks username == "superadmin"
result = db.users.update_one(
    {'username': 'superadmin'},
    {
        '$set': {
            'username': 'admin',
            'passwordHash': new_hash
        },
        '$unset': {'password': '', 'pass': ''}
    }
)

print('Matched:', result.matched_count)
print('Modified:', result.modified_count)

# Verify
user = db.users.find_one({'username': 'admin'})
if user:
    check_new = bcrypt.checkpw('Admin@123'.encode(), user['passwordHash'].encode())
    print('New username "admin" exists:', True)
    print('Admin@123 works:', check_new)
    print('Old username superadmin still exists:', bool(db.users.find_one({'username': 'superadmin'})))
else:
    print('ERROR: user not found!')

client.close()
print('DONE')
