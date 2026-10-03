import sys
from pymongo import MongoClient

sys.stdout.reconfigure(encoding='utf-8')

uri = 'mongodb+srv://bhatigalbhanu_db_user:Restourant123@cluster0.uyvuiuh.mongodb.net/my_new_db?appName=Cluster0'
client = MongoClient(uri, serverSelectionTimeoutMS=10000)
db = client['my_new_db']

print("=== STEP 1: CLEAN DUMMY USERS ===")
dummy_usernames = [
    'manager', 'cashier', 'waiter', 'chef', 'inventory',
    'purchase', 'accountant', 'hr', 'receptionist'
]
res_users = db.users.delete_many({'username': {'$in': dummy_usernames}})
print(f"Deleted dummy users: {res_users.deleted_count}")
print("Remaining users in DB:")
for u in db.users.find():
    print(f"  username={u.get('username')} | roleId={u.get('roleId')} | status={u.get('status')}")

print("\n=== STEP 2: CLEAN DUMMY ENTITIES ===")
res_cust = db.customers.delete_many({})
print(f"Deleted dummy customers: {res_cust.deleted_count}")

res_supp = db.suppliers.delete_many({})
print(f"Deleted dummy suppliers: {res_supp.deleted_count}")

res_inv = db.inventory_items.delete_many({})
print(f"Deleted dummy inventory_items: {res_inv.deleted_count}")

res_rec = db.recipes.delete_many({})
print(f"Deleted dummy recipes: {res_rec.deleted_count}")

res_sal = db.salary_structures.delete_many({})
print(f"Deleted dummy salary_structures: {res_sal.deleted_count}")

print("\n=== STEP 3: VERIFY REAL MENU PRESERVED ===")
menu_count = db.menu_items.count_documents({})
cat_count = db.menu_categories.count_documents({})
print(f"Real Gujarati Menu Items preserved: {menu_count}")
print(f"Real Gujarati Categories preserved: {cat_count}")

client.close()
print("DONE")
