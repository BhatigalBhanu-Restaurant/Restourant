import sys
from pymongo import MongoClient

# Force UTF-8 output
sys.stdout.reconfigure(encoding='utf-8')

uri = 'mongodb+srv://bhatigalbhanu_db_user:Restourant123@cluster0.uyvuiuh.mongodb.net/my_new_db?appName=Cluster0'
client = MongoClient(uri, serverSelectionTimeoutMS=10000)
db = client['my_new_db']

print("=== ALL CATEGORIES ===")
dummy_category_ids = []
real_category_ids = []

for c in db.menu_categories.find():
    cid = c.get('id') or str(c.get('_id'))
    name = c.get('name', '')
    code = c.get('code', '')
    item_count = db.menu_items.count_documents({'categoryId': cid})
    
    # Check if this is one of the English seed categories
    is_dummy = cid in ['cat_kathiyawadi', 'cat_rotla', 'cat_thali', 'cat_farsan', 'cat_mithai', 'cat_chaas_bev']
    if is_dummy:
        dummy_category_ids.append(cid)
        print(f"[DUMMY SEED] id={cid} | name='{name}' | items={item_count}")
    else:
        real_category_ids.append(cid)
        print(f"[REAL GUJARATI] id={cid} | name='{name}' | items={item_count}")

print(f"\nDummy Category IDs: {dummy_category_ids}")
print(f"Real Category IDs: {real_category_ids}")

print("\n=== DUMMY ITEMS PREVIEW ===")
dummy_items = list(db.menu_items.find({'categoryId': {'$in': dummy_category_ids}}))
print(f"Total dummy items to remove: {len(dummy_items)}")
for it in dummy_items[:10]:
    print(f"  {it.get('id')} | {it.get('code')} | {it.get('name')}")

print("\n=== REAL ITEMS PREVIEW ===")
real_items = list(db.menu_items.find({'categoryId': {'$in': real_category_ids}}))
print(f"Total real Gujarati items to keep: {len(real_items)}")
for it in real_items[:10]:
    print(f"  {it.get('id')} | {it.get('code')} | {it.get('name')}")

client.close()
