import os
import sys
from datetime import datetime, timezone
from pymongo import MongoClient

# Add root directory to sys.path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend.app.config import settings

def migrate_menu():
    print("=============================================================")
    print("Starting Menu & Category Migration for Bhatigal Bhanu...")
    print("=============================================================")

    client = MongoClient(settings.MONGODB_URI)
    db = client[settings.DB_NAME]

    # 1. Define Authentic Categories from Photo 1 & 2
    categories = [
        {
            "id": "cat_sweet",
            "code": "SWEET",
            "name": "સ્વીટ (Sweets)",
            "nameGujarati": "સ્વીટ",
            "displayOrder": 1,
            "isActive": True,
            "description": "ચુરમાના લાડુ, ગુલાબ જાંબુ, સુખડી"
        },
        {
            "id": "cat_subji_1",
            "code": "SUBJI1",
            "name": "૧. સબ્જી (સ્પેશિયલ શાક)",
            "nameGujarati": "૧. સબ્જી",
            "displayOrder": 2,
            "isActive": True,
            "description": "સ્પે. વરાળિયું, ટામેટાં કોફતા"
        },
        {
            "id": "cat_subji_2",
            "code": "SUBJI2",
            "name": "૨. સબ્જી (કાઠિયાવાડી & પનીર શાક)",
            "nameGujarati": "૨. સબ્જી",
            "displayOrder": 3,
            "isActive": True,
            "description": "કાજુ ગાંઠિયા, દાલ મખની, ઓળો, પનીર આઇટમ્સ"
        },
        {
            "id": "cat_subji_3",
            "code": "SUBJI3",
            "name": "૩. સબ્જી (રોજિંદા શાક)",
            "nameGujarati": "૩. સબ્જી",
            "displayOrder": 4,
            "isActive": True,
            "description": "સેવ ટામેટા, છાલવાળા બટેટા, વટાણા બટેટા ટામેટાં"
        },
        {
            "id": "cat_farsan",
            "code": "FARSAN",
            "name": "ફરસાણ (Farsan & Starters)",
            "nameGujarati": "ફરસાણ",
            "displayOrder": 5,
            "isActive": True,
            "description": "સમોસા, કટલેસ, કોથમરી વડી, ભજીયાં"
        },
        {
            "id": "cat_tadka",
            "code": "TADKA",
            "name": "ગુજરાતી તડકા (ખીચડી & પુલાવ)",
            "nameGujarati": "ગુજરાતી તડકા",
            "displayOrder": 6,
            "isActive": True,
            "description": "સાદી કઢી ખીચડી, વઘારેલી ખીચડી, ગિરનારી ખીચડી, વેજ પુલાવ"
        },
        {
            "id": "cat_rotla",
            "code": "ROTLA",
            "name": "રોટલા & પરોઠા (ફરજીયાત મેનુ)",
            "nameGujarati": "રોટલા & પરોઠા",
            "displayOrder": 7,
            "isActive": True,
            "description": "વઘારેલો રોટલો, બાજરા ના રોટલા, તવા પરોઠા, ભાખરી"
        },
        {
            "id": "cat_salad",
            "code": "SALAD",
            "name": "સલાડ, ચટણી & સાઈડ્સ (ફરજીયાત મેનુ)",
            "nameGujarati": "સલાડ & ચટણી",
            "displayOrder": 8,
            "isActive": True,
            "description": "ભરેલ મરચાં, સલાડ, લાલ - લીલી ચટણી, ફ્રાઇમ્સ"
        },
        {
            "id": "cat_chhas",
            "code": "BEV",
            "name": "પીણું (છાસ)",
            "nameGujarati": "પીણું",
            "displayOrder": 9,
            "isActive": True,
            "description": "દેશી મસાલા છાસ"
        }
    ]

    # 2. Define 44 Authentic Menu Items Transcribed from Photos
    raw_items = [
        # --- ૧. સ્વીટ ---
        {"cat": "cat_sweet", "code": "SW-01", "name": "ચુરમાના લાડુ", "price": 80},
        {"cat": "cat_sweet", "code": "SW-02", "name": "ગુલાબ જાંબુ", "price": 70},
        {"cat": "cat_sweet", "code": "SW-03", "name": "સુખડી (મિનિમમ 50 મહેમાન)", "price": 90},

        # --- ૨. ૧. સબ્જી ---
        {"cat": "cat_subji_1", "code": "SB1-01", "name": "સ્પે. વરાળિયું", "price": 180},
        {"cat": "cat_subji_1", "code": "SB1-02", "name": "ટામેટાં કોફતા", "price": 160},

        # --- ૩. ૨. સબ્જી (કાઠિયાવાડી & પનીર) ---
        {"cat": "cat_subji_2", "code": "SB2-01", "name": "કાજુ ગાંઠિયા", "price": 190},
        {"cat": "cat_subji_2", "code": "SB2-02", "name": "દાલ મખની", "price": 160},
        {"cat": "cat_subji_2", "code": "SB2-03", "name": "તુરીયા પાત્રા", "price": 150},
        {"cat": "cat_subji_2", "code": "SB2-04", "name": "વાડી નું શાક", "price": 160},
        {"cat": "cat_subji_2", "code": "SB2-05", "name": "રીંગણાં નો ઓળો", "price": 170},
        {"cat": "cat_subji_2", "code": "SB2-06", "name": "મકાઈ પાત્રા નું શાક", "price": 150},
        {"cat": "cat_subji_2", "code": "SB2-07", "name": "પંચકુટિયું શાક", "price": 160},
        {"cat": "cat_subji_2", "code": "SB2-08", "name": "રીંગણાં ડીંટીયા નું શાક", "price": 150},
        {"cat": "cat_subji_2", "code": "SB2-09", "name": "તુવેર ટોઠા", "price": 170},
        {"cat": "cat_subji_2", "code": "SB2-10", "name": "રજવાડી ઉંધિયું", "price": 180},
        {"cat": "cat_subji_2", "code": "SB2-11", "name": "પંચરત્ન દાળ", "price": 140},
        {"cat": "cat_subji_2", "code": "SB2-12", "name": "રજવાડી ઢોકળી", "price": 150},
        {"cat": "cat_subji_2", "code": "SB2-13", "name": "લસણ કરી નું શાક", "price": 160},
        {"cat": "cat_subji_2", "code": "SB2-14", "name": "લાઈવ ગાંઠીયા ટામેટાં", "price": 150},
        {"cat": "cat_subji_2", "code": "SB2-15", "name": "વેજ. પનીર મસાલા", "price": 210},
        {"cat": "cat_subji_2", "code": "SB2-16", "name": "પનીર ભૂરજી", "price": 220},
        {"cat": "cat_subji_2", "code": "SB2-17", "name": "પનીર પતિયાલા", "price": 220},
        {"cat": "cat_subji_2", "code": "SB2-18", "name": "પનીર લવાબદાર", "price": 230},

        # --- ૪. ૩. સબ્જી (રોજિંદા શાક) ---
        {"cat": "cat_subji_3", "code": "SB3-01", "name": "સેવ ટામેટા", "price": 130},
        {"cat": "cat_subji_3", "code": "SB3-02", "name": "છાલવાળા બટેટા", "price": 120},
        {"cat": "cat_subji_3", "code": "SB3-03", "name": "વટાણા બટેટા ટામેટાં", "price": 130},

        # --- ૫. ફરસાણ ---
        {"cat": "cat_farsan", "code": "FR-01", "name": "સમોસા", "price": 60},
        {"cat": "cat_farsan", "code": "FR-02", "name": "કટલેસ", "price": 60},
        {"cat": "cat_farsan", "code": "FR-03", "name": "કોથમરી વડી", "price": 70},
        {"cat": "cat_farsan", "code": "FR-04", "name": "મિક્સ ભજીયાં (મિનિમમ 50 મહેમાન)", "price": 80},

        # --- ૬. ગુજરાતી તડકા ---
        {"cat": "cat_tadka", "code": "TD-01", "name": "સાદી કઢી - ખીચડી", "price": 120},
        {"cat": "cat_tadka", "code": "TD-02", "name": "વઘારેલી ખીચડી", "price": 130},
        {"cat": "cat_tadka", "code": "TD-03", "name": "ગિરનારી ખીચડી", "price": 140},
        {"cat": "cat_tadka", "code": "TD-04", "name": "પંચરત્ન ખીચડી", "price": 150},
        {"cat": "cat_tadka", "code": "TD-05", "name": "વેજ. પુલાવ", "price": 140},

        # --- ૭. રોટલા & પરોઠા (ફરજીયાત મેનુ લિસ્ટ) ---
        {"cat": "cat_rotla", "code": "RT-01", "name": "વઘારેલો રોટલો", "price": 110},
        {"cat": "cat_rotla", "code": "RT-02", "name": "બાજરા ના રોટલા", "price": 50},
        {"cat": "cat_rotla", "code": "RT-03", "name": "તવા પરોઠા", "price": 40},
        {"cat": "cat_rotla", "code": "RT-04", "name": "ભાખરી", "price": 45},

        # --- ૮. સલાડ, ચટણી & સાઈડ્સ (ફરજીયાત મેનુ લિસ્ટ) ---
        {"cat": "cat_salad", "code": "SL-01", "name": "ભરેલ મરચાં", "price": 40},
        {"cat": "cat_salad", "code": "SL-02", "name": "સલાડ", "price": 35},
        {"cat": "cat_salad", "code": "SL-03", "name": "લાલ - લીલી ચટણી", "price": 30},
        {"cat": "cat_salad", "code": "SL-04", "name": "ફ્રાઇમ્સ", "price": 30},

        # --- ૯. પીણું (ફરજીયાત મેનુ લિસ્ટ) ---
        {"cat": "cat_chhas", "code": "BV-01", "name": "છાસ", "price": 25}
    ]

    items_to_insert = []
    for idx, item in enumerate(raw_items, 1):
        slug = f"item_{item['code'].lower().replace('-', '_')}"
        items_to_insert.append({
            "id": slug,
            "code": item["code"],
            "name": item["name"],
            "nameGujarati": item["name"],
            "categoryId": item["cat"],
            "price": float(item["price"]),
            "costPrice": float(round(item["price"] * 0.4, 2)),
            "taxRate": 5.0,
            "isVeg": True,
            "isAvailable": True,
            "preparationTimeMinutes": 15,
            "displayOrder": idx,
            "createdAt": datetime.now(timezone.utc),
            "updatedAt": datetime.now(timezone.utc)
        })

    # 3. Purge old collections
    print("Purging old menu_items and menu_categories collections...")
    db.menu_items.drop()
    db.menu_categories.drop()

    # 4. Insert new categories
    print(f"Inserting {len(categories)} authentic categories...")
    db.menu_categories.insert_many(categories)

    # 5. Insert new items
    print(f"Inserting {len(items_to_insert)} authentic dishes...")
    db.menu_items.insert_many(items_to_insert)

    # 6. Reset daily menus with fresh sample selection
    print("Initializing clean Daily Menus for all 7 days...")
    all_days = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY", "SUNDAY"]
    
    # Pick a rich sample set for default days
    sample_ids = [
        "item_sw_01",    # ચુરમાના લાડુ
        "item_sb1_01",   # સ્પે. વરાળિયું
        "item_sb2_01",   # કાજુ ગાંઠિયા
        "item_sb2_05",   # રીંગણાં નો ઓળો
        "item_sb3_01",   # સેવ ટામેટા
        "item_fr_01",    # સમોસા
        "item_td_02",    # વઘારેલી ખીચડી
        "item_rt_01",    # વઘારેલો રોટલો
        "item_rt_02",    # બાજરા ના રોટલા
        "item_sl_01",    # ભરેલ મરચાં
        "item_bv_01"     # છાસ
    ]

    db.daily_menus.delete_many({})
    for day in all_days:
        db.daily_menus.insert_one({
            "id": f"daily_menu_{day.lower()}",
            "dayOfWeek": day,
            "itemIds": sample_ids if day in ["MONDAY", "FRIDAY", "SUNDAY"] else sample_ids[:6],
            "notes": "ભાતીગળ કાઠિયાવાડી સ્પેશિયલ થાળી",
            "isActive": True,
            "updatedAt": datetime.now(timezone.utc)
        })

    print("=============================================================")
    print(f"SUCCESS! Created {len(categories)} categories & {len(items_to_insert)} dishes!")
    print("=============================================================")

if __name__ == "__main__":
    migrate_menu()
