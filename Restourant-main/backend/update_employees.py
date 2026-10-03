from pymongo import MongoClient

uri = 'mongodb+srv://bhatigalbhanu_db_user:Restourant123@cluster0.uyvuiuh.mongodb.net/my_new_db?appName=Cluster0'
client = MongoClient(uri, serverSelectionTimeoutMS=10000)
db = client['my_new_db']

count = 0
for emp in db.employees.find():
    first = emp.get('firstName', '')
    last = emp.get('lastName', '')
    full = emp.get('name') or f'{first} {last}'.strip() or emp.get('employeeCode', 'Staff')
    status = emp.get('status') or 'ACTIVE'
    wage = emp.get('wageType') or 'MONTHLY'
    db.employees.update_one(
        {'_id': emp['_id']},
        {'$set': {'name': full, 'status': status, 'wageType': wage}}
    )
    count += 1

print(f'Updated {count} employee documents in MongoDB directly')
client.close()
