import bcrypt
from pymongo import MongoClient

uri = 'mongodb+srv://bhatigalbhanu_db_user:Restourant123@cluster0.uyvuiuh.mongodb.net/my_new_db?appName=Cluster0'
client = MongoClient(uri, serverSelectionTimeoutMS=15000)
db = client['my_new_db']

NEW_PASSWORD = 'Admin@123'
new_hash = bcrypt.hashpw(NEW_PASSWORD.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

result = db.users.update_one(
    {'username': 'superadmin'},
    {
        '$set': {'passwordHash': new_hash},
        '$unset': {'password': '', 'pass': ''}
    }
)

print('Matched:', result.matched_count)
print('Modified:', result.modified_count)

# Verify
user = db.users.find_one({'username': 'superadmin'})
check_new = bcrypt.checkpw('Admin@123'.encode(), user['passwordHash'].encode())
check_old = bcrypt.checkpw('Admin@12345'.encode(), user['passwordHash'].encode())
print('New Admin@123 works:', check_new)
print('Old Admin@12345 works:', check_old)

client.close()
print('DONE')
