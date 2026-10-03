import sys
from pymongo import MongoClient

sys.stdout.reconfigure(encoding='utf-8')

uri = 'mongodb+srv://bhatigalbhanu_db_user:Restourant123@cluster0.uyvuiuh.mongodb.net/my_new_db?appName=Cluster0'
client = MongoClient(uri, serverSelectionTimeoutMS=10000)
db = client['my_new_db']

DUMMY_CATEGORY_IDS = [
    'cat_kathiyawadi',
    'cat_rotla',
    'cat_thali',
    'cat_farsan',
    'cat_mithai',
    'cat_chaas_bev'
]

print("=== STEP 1: DELETE DUMMY MENU ITEMS ===")
res_items = db.menu_items.delete_many({'categoryId': {'$in': DUMMY_CATEGORY_IDS}})
print(f"Deleted dummy items: {res_items.deleted_count}")

# Also delete any item where code starts with 'KATHI-', 'ROT-', 'THALI-', 'FARSAN-', 'SWEET-', 'BEV-' if still present
res_items_extra = db.menu_items.delete_many({
    'code': {'$in': [
        'KATHI-01', 'KATHI-02', 'KATHI-03', 'KATHI-04', 'KATHI-05', 'KATHI-06', 'KATHI-07', 'KATHI-08', 'KATHI-09',
        'ROT-01', 'ROT-02', 'ROT-03', 'ROT-04', 'ROT-05', 'ROT-06',
        'THALI-01', 'THALI-02', 'THALI-03', 'THALI-04',
        'FARSAN-01', 'FARSAN-02', 'FARSAN-03', 'FARSAN-04', 'FARSAN-05', 'FARSAN-06',
        'SWEET-01', 'SWEET-02', 'SWEET-03', 'SWEET-04', 'SWEET-05',
        'BEV-01', 'BEV-02', 'BEV-03', 'BEV-04', 'BEV-05'
    ]}
})
print(f"Deleted extra dummy items by code: {res_items_extra.deleted_count}")

print("\n=== STEP 2: DELETE DUMMY MENU CATEGORIES ===")
res_cats = db.menu_categories.delete_many({'id': {'$in': DUMMY_CATEGORY_IDS}})
print(f"Deleted dummy categories: {res_cats.deleted_count}")

print("\n=== STEP 3: CLEAN DAILY MENUS (if any dummy items referenced) ===")
# Remove dummy item IDs from any daily_menu documents
dummy_item_ids_set = set([
    'item_ringna_olo', 'item_kaju_gathiya', 'item_sev_tameta', 'item_lasaniya_bataka', 'item_bharela_bhinda',
    'item_dahi_tikhari', 'item_sev_dungri', 'item_sukhi_bhaji', 'item_bharela_ringna', 'item_bajri_rotlo',
    'item_jowar_rotlo', 'item_phulka_roti', 'item_thepla', 'item_puri_basket', 'item_garlic_paratha',
    'item_bhatigal_thali', 'item_executive_thali', 'item_khichdi_kadhi', 'item_dal_dhokli', 'item_nylon_khaman',
    'item_patra', 'item_bharela_marcha', 'item_vanela_gathiya', 'item_methi_gota', 'item_khandvi',
    'item_churma_ladoo', 'item_shrikhand', 'item_mohanthal', 'item_jalebi', 'item_malpua',
    'item_valona_chaas', 'item_gol_makhan', 'item_rajwadi_chai', 'item_lemon_soda', 'item_kesar_milk'
])

for dm in db.daily_menus.find():
    lunch = [i for i in dm.get('lunchItemIds', []) if i not in dummy_item_ids_set]
    dinner = [i for i in dm.get('dinnerItemIds', []) if i not in dummy_item_ids_set]
    db.daily_menus.update_one({'_id': dm['_id']}, {'$set': {'lunchItemIds': lunch, 'dinnerItemIds': dinner}})

print("\n=== FINAL VERIFICATION OF REMAINING MENU ===")
remaining_cats = list(db.menu_categories.find())
print(f"Remaining Categories ({len(remaining_cats)}):")
for c in remaining_cats:
    count = db.menu_items.count_documents({'categoryId': c.get('id')})
    print(f"  {c.get('name')} (id: {c.get('id')}) => {count} items")

remaining_items_count = db.menu_items.count_documents({})
print(f"\nTotal Remaining Items in DB (ALL ORIGINAL GUJARATI): {remaining_items_count}")

client.close()
print("DONE")
