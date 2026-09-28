import uuid
from datetime import datetime, timezone
from pymongo import UpdateOne
from .database import get_db, ensure_indexes
from .utils.security import hash_password
from .constants.permissions import ALL_PERMISSIONS, DEFAULT_ROLES
from .utils.logger import logger

DEFAULT_USERS = [
  {
    "id": "usr_superadmin",
    "username": "superadmin",
    "email": "superadmin@erp.com",
    "pass": "Admin@12345",
    "firstName": "Super",
    "lastName": "Administrator",
    "phone": "9999999991",
    "roleId": "role_super_admin"
  },
  {
    "id": "usr_manager",
    "username": "manager",
    "email": "manager@erp.com",
    "pass": "Manager@12345",
    "firstName": "Restaurant",
    "lastName": "Manager",
    "phone": "9999999993",
    "roleId": "role_manager"
  },
  {
    "id": "usr_cashier",
    "username": "cashier",
    "email": "cashier@erp.com",
    "pass": "Cashier@12345",
    "firstName": "Head",
    "lastName": "Cashier",
    "phone": "9999999994",
    "roleId": "role_cashier"
  },
  {
    "id": "usr_waiter",
    "username": "waiter",
    "email": "waiter@erp.com",
    "pass": "Waiter@12345",
    "firstName": "Lead",
    "lastName": "Server",
    "phone": "9999999995",
    "roleId": "role_waiter"
  },
  {
    "id": "usr_chef",
    "username": "chef",
    "email": "chef@erp.com",
    "pass": "Chef@12345",
    "firstName": "Executive",
    "lastName": "Chef",
    "phone": "9999999996",
    "roleId": "role_kitchen"
  },
  {
    "id": "usr_inventory",
    "username": "inventory",
    "email": "inventory@erp.com",
    "pass": "Inventory@12345",
    "firstName": "Stores",
    "lastName": "Incharge",
    "phone": "9999999997",
    "roleId": "role_inventory"
  },
  {
    "id": "usr_purchase",
    "username": "purchase",
    "email": "purchase@erp.com",
    "pass": "Purchase@12345",
    "firstName": "Procurement",
    "lastName": "Officer",
    "phone": "9999999988",
    "roleId": "role_purchase"
  },
  {
    "id": "usr_accountant",
    "username": "accountant",
    "email": "accountant@erp.com",
    "pass": "Accountant@12345",
    "firstName": "Chief",
    "lastName": "Accountant",
    "phone": "9999999998",
    "roleId": "role_accountant"
  },
  {
    "id": "usr_hr",
    "username": "hr",
    "email": "hr@erp.com",
    "pass": "Hr@12345",
    "firstName": "HR",
    "lastName": "Specialist",
    "phone": "9999999999",
    "roleId": "role_hr"
  },
  {
    "id": "usr_receptionist",
    "username": "receptionist",
    "email": "reception@erp.com",
    "pass": "Receptionist@12345",
    "firstName": "Hostess",
    "lastName": "Receptionist",
    "phone": "9999999990",
    "roleId": "role_receptionist"
  }
]
DEPARTMENTS = [
  {
    "id": "dept_mgmt",
    "name": "Management",
    "code": "MGMT",
    "description": "Executive & Restaurant Management"
  },
  {
    "id": "dept_service",
    "name": "Service & Front of House",
    "code": "FOH",
    "description": "Waiters, Captains & Hosts"
  },
  {
    "id": "dept_kitchen",
    "name": "Kitchen & Culinary",
    "code": "BOH",
    "description": "Chefs, Cooks & Kitchen Crew"
  },
  {
    "id": "dept_inventory",
    "name": "Inventory & Stores",
    "code": "INV",
    "description": "Storekeepers & Material Handling"
  },
  {
    "id": "dept_accounts",
    "name": "Accounts & Finance",
    "code": "ACC",
    "description": "Accountants & Cashiers"
  },
  {
    "id": "dept_hr",
    "name": "Human Resources",
    "code": "HR",
    "description": "HR & People Operations"
  }
]
DESIGNATIONS = [
  {
    "id": "desig_gm",
    "departmentId": "dept_mgmt",
    "title": "General Manager"
  },
  {
    "id": "desig_rest_mgr",
    "departmentId": "dept_mgmt",
    "title": "Restaurant Manager"
  },
  {
    "id": "desig_head_chef",
    "departmentId": "dept_kitchen",
    "title": "Executive Chef"
  },
  {
    "id": "desig_line_cook",
    "departmentId": "dept_kitchen",
    "title": "Line Cook"
  },
  {
    "id": "desig_captain",
    "departmentId": "dept_service",
    "title": "Captain / Supervisor"
  },
  {
    "id": "desig_waiter",
    "departmentId": "dept_service",
    "title": "Senior Waiter"
  },
  {
    "id": "desig_hostess",
    "departmentId": "dept_service",
    "title": "Hostess / Receptionist"
  },
  {
    "id": "desig_cashier",
    "departmentId": "dept_accounts",
    "title": "Lead Cashier"
  },
  {
    "id": "desig_accountant",
    "departmentId": "dept_accounts",
    "title": "Senior Accountant"
  },
  {
    "id": "desig_inv_mgr",
    "departmentId": "dept_inventory",
    "title": "Inventory Incharge"
  },
  {
    "id": "desig_hr_exec",
    "departmentId": "dept_hr",
    "title": "HR Executive"
  }
]
UNITS = [
  {
    "id": "unit_kg",
    "name": "Kilogram",
    "symbol": "kg"
  },
  {
    "id": "unit_gm",
    "name": "Gram",
    "symbol": "g"
  },
  {
    "id": "unit_ltr",
    "name": "Litre",
    "symbol": "L"
  },
  {
    "id": "unit_ml",
    "name": "Millilitre",
    "symbol": "ml"
  },
  {
    "id": "unit_pcs",
    "name": "Pieces",
    "symbol": "pcs"
  },
  {
    "id": "unit_portion",
    "name": "Portion",
    "symbol": "portion"
  },
  {
    "id": "unit_can",
    "name": "Can",
    "symbol": "can"
  }
]
TAXES = [
  {
    "id": "tax_zero",
    "name": "Zero GST (0%)",
    "rate": 0.0,
    "type": "PERCENTAGE"
  },
  {
    "id": "tax_gst_5",
    "name": "Restaurant GST (5%)",
    "rate": 5.0,
    "type": "PERCENTAGE"
  },
  {
    "id": "tax_gst_18",
    "name": "Standard GST (18%)",
    "rate": 18.0,
    "type": "PERCENTAGE"
  }
]
CATEGORIES = [
  {
    "id": "cat_kathiyawadi",
    "name": "Kathiyawadi Curries",
    "code": "KATHI",
    "displayOrder": 1
  },
  {
    "id": "cat_rotla",
    "name": "Rotla & Traditional Breads",
    "code": "ROTLA",
    "displayOrder": 2
  },
  {
    "id": "cat_thali",
    "name": "Special Thali & Combos",
    "code": "THALI",
    "displayOrder": 3
  },
  {
    "id": "cat_farsan",
    "name": "Farsan & Starters",
    "code": "FARSAN",
    "displayOrder": 4
  },
  {
    "id": "cat_mithai",
    "name": "Traditional Sweets & Desserts",
    "code": "SWEETS",
    "displayOrder": 5
  },
  {
    "id": "cat_chaas_bev",
    "name": "Beverages & Chaas",
    "code": "BEV",
    "displayOrder": 6
  }
]
MENU_ITEMS = [
  {
    "id": "item_ringna_olo",
    "categoryId": "cat_kathiyawadi",
    "name": "Ringna No Olo with White Butter",
    "code": "KATHI-01",
    "price": 220,
    "costPrice": 75,
    "taxId": "tax_gst_5",
    "isVeg": True,
    "preparationTimeMinutes": 15,
    "displayOrder": 1
  },
  {
    "id": "item_kaju_gathiya",
    "categoryId": "cat_kathiyawadi",
    "name": "Kaju Gathiya Nu Shaak",
    "code": "KATHI-02",
    "price": 240,
    "costPrice": 90,
    "taxId": "tax_gst_5",
    "isVeg": True,
    "preparationTimeMinutes": 12,
    "displayOrder": 2
  },
  {
    "id": "item_sev_tameta",
    "categoryId": "cat_kathiyawadi",
    "name": "Kathiyawadi Sev Tameta Nu Shaak",
    "code": "KATHI-03",
    "price": 180,
    "costPrice": 55,
    "taxId": "tax_gst_5",
    "isVeg": True,
    "preparationTimeMinutes": 10,
    "displayOrder": 3
  },
  {
    "id": "item_lasaniya_bataka",
    "categoryId": "cat_kathiyawadi",
    "name": "Lasaniya Bataka Spiced Curry",
    "code": "KATHI-04",
    "price": 170,
    "costPrice": 50,
    "taxId": "tax_gst_5",
    "isVeg": True,
    "preparationTimeMinutes": 12,
    "displayOrder": 4
  },
  {
    "id": "item_bharela_bhinda",
    "categoryId": "cat_kathiyawadi",
    "name": "Kathiyawadi Bharela Bhinda",
    "code": "KATHI-05",
    "price": 190,
    "costPrice": 65,
    "taxId": "tax_gst_5",
    "isVeg": True,
    "preparationTimeMinutes": 14,
    "displayOrder": 5
  },
  {
    "id": "item_dahi_tikhari",
    "categoryId": "cat_kathiyawadi",
    "name": "Rajwadi Dahi Tikhari",
    "code": "KATHI-06",
    "price": 160,
    "costPrice": 45,
    "taxId": "tax_gst_5",
    "isVeg": True,
    "preparationTimeMinutes": 8,
    "displayOrder": 6
  },
  {
    "id": "item_sev_dungri",
    "categoryId": "cat_kathiyawadi",
    "name": "Sev Dungri Nu Shaak",
    "code": "KATHI-07",
    "price": 175,
    "costPrice": 55,
    "taxId": "tax_gst_5",
    "isVeg": True,
    "preparationTimeMinutes": 10,
    "displayOrder": 7
  },
  {
    "id": "item_sukhi_bhaji",
    "categoryId": "cat_kathiyawadi",
    "name": "Sukhi Bhaji (Batata Vagharela)",
    "code": "KATHI-08",
    "price": 150,
    "costPrice": 40,
    "taxId": "tax_gst_5",
    "isVeg": True,
    "preparationTimeMinutes": 8,
    "displayOrder": 8
  },
  {
    "id": "item_bharela_ringna",
    "categoryId": "cat_kathiyawadi",
    "name": "Bharela Ringna Bataka",
    "code": "KATHI-09",
    "price": 195,
    "costPrice": 60,
    "taxId": "tax_gst_5",
    "isVeg": True,
    "preparationTimeMinutes": 15,
    "displayOrder": 9
  },
  {
    "id": "item_bajri_rotlo",
    "categoryId": "cat_rotla",
    "name": "Deshi Bajri No Rotlo (with Ghee & Makhan)",
    "code": "ROT-01",
    "price": 60,
    "costPrice": 18,
    "taxId": "tax_gst_5",
    "isVeg": True,
    "preparationTimeMinutes": 8,
    "displayOrder": 10
  },
  {
    "id": "item_jowar_rotlo",
    "categoryId": "cat_rotla",
    "name": "Jowar No Rotlo with Ghee",
    "code": "ROT-02",
    "price": 60,
    "costPrice": 18,
    "taxId": "tax_gst_5",
    "isVeg": True,
    "preparationTimeMinutes": 8,
    "displayOrder": 11
  },
  {
    "id": "item_phulka_roti",
    "categoryId": "cat_rotla",
    "name": "Hot Phulka Roti with Ghee (3 Pcs)",
    "code": "ROT-03",
    "price": 45,
    "costPrice": 12,
    "taxId": "tax_gst_5",
    "isVeg": True,
    "preparationTimeMinutes": 6,
    "displayOrder": 12
  },
  {
    "id": "item_thepla",
    "categoryId": "cat_rotla",
    "name": "Deshi Masala Methi Thepla (2 Pcs)",
    "code": "ROT-04",
    "price": 50,
    "costPrice": 15,
    "taxId": "tax_gst_5",
    "isVeg": True,
    "preparationTimeMinutes": 8,
    "displayOrder": 13
  },
  {
    "id": "item_puri_basket",
    "categoryId": "cat_rotla",
    "name": "Puri Basket (4 Pcs)",
    "code": "ROT-05",
    "price": 40,
    "costPrice": 12,
    "taxId": "tax_gst_5",
    "isVeg": True,
    "preparationTimeMinutes": 5,
    "displayOrder": 14
  },
  {
    "id": "item_garlic_paratha",
    "categoryId": "cat_rotla",
    "name": "Garlic Butter Paratha",
    "code": "ROT-06",
    "price": 65,
    "costPrice": 20,
    "taxId": "tax_gst_5",
    "isVeg": True,
    "preparationTimeMinutes": 8,
    "displayOrder": 15
  },
  {
    "id": "item_bhatigal_thali",
    "categoryId": "cat_thali",
    "name": "Bhatigal Rajwadi Special Thali (Unlimited)",
    "code": "THALI-01",
    "price": 350,
    "costPrice": 125,
    "taxId": "tax_gst_5",
    "isVeg": True,
    "preparationTimeMinutes": 5,
    "displayOrder": 16
  },
  {
    "id": "item_executive_thali",
    "categoryId": "cat_thali",
    "name": "Kathiyawadi Executive Thali",
    "code": "THALI-02",
    "price": 260,
    "costPrice": 90,
    "taxId": "tax_gst_5",
    "isVeg": True,
    "preparationTimeMinutes": 5,
    "displayOrder": 17
  },
  {
    "id": "item_khichdi_kadhi",
    "categoryId": "cat_thali",
    "name": "Vaghareli Khichdi & Kathiyawadi Kadhi Bowl",
    "code": "THALI-03",
    "price": 190,
    "costPrice": 55,
    "taxId": "tax_gst_5",
    "isVeg": True,
    "preparationTimeMinutes": 10,
    "displayOrder": 18
  },
  {
    "id": "item_dal_dhokli",
    "categoryId": "cat_thali",
    "name": "Dal Dhokli Traditional Bowl",
    "code": "THALI-04",
    "price": 180,
    "costPrice": 50,
    "taxId": "tax_gst_5",
    "isVeg": True,
    "preparationTimeMinutes": 12,
    "displayOrder": 19
  },
  {
    "id": "item_nylon_khaman",
    "categoryId": "cat_farsan",
    "name": "Surti Nylon Khaman Plate",
    "code": "FARSAN-01",
    "price": 120,
    "costPrice": 35,
    "taxId": "tax_gst_5",
    "isVeg": True,
    "preparationTimeMinutes": 5,
    "displayOrder": 20
  },
  {
    "id": "item_patra",
    "categoryId": "cat_farsan",
    "name": "Steamed Patra with Mustard Tadka",
    "code": "FARSAN-02",
    "price": 130,
    "costPrice": 40,
    "taxId": "tax_gst_5",
    "isVeg": True,
    "preparationTimeMinutes": 8,
    "displayOrder": 21
  },
  {
    "id": "item_bharela_marcha",
    "categoryId": "cat_farsan",
    "name": "Fried Bharela Marcha Sambharo",
    "code": "FARSAN-03",
    "price": 90,
    "costPrice": 25,
    "taxId": "tax_gst_5",
    "isVeg": True,
    "preparationTimeMinutes": 6,
    "displayOrder": 22
  },
  {
    "id": "item_vanela_gathiya",
    "categoryId": "cat_farsan",
    "name": "Live Vanela Gathiya Plate",
    "code": "FARSAN-04",
    "price": 110,
    "costPrice": 30,
    "taxId": "tax_gst_5",
    "isVeg": True,
    "preparationTimeMinutes": 6,
    "displayOrder": 23
  },
  {
    "id": "item_methi_gota",
    "categoryId": "cat_farsan",
    "name": "Methi Na Gota Plate (6 Pcs)",
    "code": "FARSAN-05",
    "price": 100,
    "costPrice": 28,
    "taxId": "tax_gst_5",
    "isVeg": True,
    "preparationTimeMinutes": 8,
    "displayOrder": 24
  },
  {
    "id": "item_khandvi",
    "categoryId": "cat_farsan",
    "name": "Khandvi Rolls Plate",
    "code": "FARSAN-06",
    "price": 125,
    "costPrice": 35,
    "taxId": "tax_gst_5",
    "isVeg": True,
    "preparationTimeMinutes": 5,
    "displayOrder": 25
  },
  {
    "id": "item_churma_ladoo",
    "categoryId": "cat_mithai",
    "name": "Deshi Ghee Churma Ladoo",
    "code": "SWEET-01",
    "price": 120,
    "costPrice": 40,
    "taxId": "tax_gst_5",
    "isVeg": True,
    "preparationTimeMinutes": 5,
    "displayOrder": 26
  },
  {
    "id": "item_shrikhand",
    "categoryId": "cat_mithai",
    "name": "Kesar Pista Shrikhand / Matho",
    "code": "SWEET-02",
    "price": 110,
    "costPrice": 35,
    "taxId": "tax_gst_5",
    "isVeg": True,
    "preparationTimeMinutes": 4,
    "displayOrder": 27
  },
  {
    "id": "item_mohanthal",
    "categoryId": "cat_mithai",
    "name": "Kathiyawadi Deshi Mohanthal",
    "code": "SWEET-03",
    "price": 130,
    "costPrice": 42,
    "taxId": "tax_gst_5",
    "isVeg": True,
    "preparationTimeMinutes": 5,
    "displayOrder": 28
  },
  {
    "id": "item_jalebi",
    "categoryId": "cat_mithai",
    "name": "Garam Deshi Ghee Jalebi (150g)",
    "code": "SWEET-04",
    "price": 110,
    "costPrice": 32,
    "taxId": "tax_gst_5",
    "isVeg": True,
    "preparationTimeMinutes": 8,
    "displayOrder": 29
  },
  {
    "id": "item_malpua",
    "categoryId": "cat_mithai",
    "name": "Malpua with Rabdi (2 Pcs)",
    "code": "SWEET-05",
    "price": 140,
    "costPrice": 45,
    "taxId": "tax_gst_5",
    "isVeg": True,
    "preparationTimeMinutes": 10,
    "displayOrder": 30
  },
  {
    "id": "item_valona_chaas",
    "categoryId": "cat_chaas_bev",
    "name": "Deshi Valona Masala Chaas",
    "code": "BEV-01",
    "price": 40,
    "costPrice": 12,
    "taxId": "tax_gst_5",
    "isVeg": True,
    "preparationTimeMinutes": 3,
    "displayOrder": 31
  },
  {
    "id": "item_gol_makhan",
    "categoryId": "cat_chaas_bev",
    "name": "Deshi Gol & White Makhan Bowl",
    "code": "BEV-02",
    "price": 50,
    "costPrice": 15,
    "taxId": "tax_gst_5",
    "isVeg": True,
    "preparationTimeMinutes": 3,
    "displayOrder": 32
  },
  {
    "id": "item_rajwadi_chai",
    "categoryId": "cat_chaas_bev",
    "name": "Rajwadi Masala Kadak Chai",
    "code": "BEV-03",
    "price": 35,
    "costPrice": 10,
    "taxId": "tax_gst_5",
    "isVeg": True,
    "preparationTimeMinutes": 5,
    "displayOrder": 33
  },
  {
    "id": "item_lemon_soda",
    "categoryId": "cat_chaas_bev",
    "name": "Fresh Lemon Mint Soda",
    "code": "BEV-04",
    "price": 60,
    "costPrice": 15,
    "taxId": "tax_gst_5",
    "isVeg": True,
    "preparationTimeMinutes": 4,
    "displayOrder": 34
  },
  {
    "id": "item_kesar_milk",
    "categoryId": "cat_chaas_bev",
    "name": "Kesar Badam Milk (Cold)",
    "code": "BEV-05",
    "price": 80,
    "costPrice": 25,
    "taxId": "tax_gst_5",
    "isVeg": True,
    "preparationTimeMinutes": 3,
    "displayOrder": 35
  }
]
DEFAULT_FLOOR_ZONES = [
  {
    "id": "zone_main_hall",
    "code": "MAIN_HALL",
    "name": "Main Dining Hall",
    "description": "Ground floor spacious main dining area",
    "color": "#0d6efd",
    "displayOrder": 1,
    "isActive": True
  },
  {
    "id": "zone_ac_hall",
    "code": "AC_HALL",
    "name": "AC Family Section",
    "description": "Cool air-conditioned family dining section",
    "color": "#0dcaf0",
    "displayOrder": 2,
    "isActive": True
  },
  {
    "id": "zone_rooftop",
    "code": "ROOFTOP",
    "name": "Rooftop Lounge",
    "description": "Open-air scenic rooftop and terrace dining",
    "color": "#6f42c1",
    "displayOrder": 3,
    "isActive": True
  },
  {
    "id": "zone_garden",
    "code": "GARDEN",
    "name": "Garden Patio",
    "description": "Fresh green outdoor garden patio dining",
    "color": "#198754",
    "displayOrder": 4,
    "isActive": True
  },
  {
    "id": "zone_vip",
    "code": "VIP",
    "name": "VIP Private Room",
    "description": "Exclusive private dining and party room",
    "color": "#ffc107",
    "displayOrder": 5,
    "isActive": True
  }
]
TABLES = [
  {
    "id": "tbl_t1",
    "tableNumber": "T-01",
    "capacity": 2,
    "floorZone": "MAIN_HALL",
    "status": "AVAILABLE"
  },
  {
    "id": "tbl_t2",
    "tableNumber": "T-02",
    "capacity": 4,
    "floorZone": "MAIN_HALL",
    "status": "AVAILABLE"
  },
  {
    "id": "tbl_t3",
    "tableNumber": "T-03",
    "capacity": 4,
    "floorZone": "MAIN_HALL",
    "status": "AVAILABLE"
  },
  {
    "id": "tbl_t4",
    "tableNumber": "T-04",
    "capacity": 6,
    "floorZone": "MAIN_HALL",
    "status": "AVAILABLE"
  },
  {
    "id": "tbl_ac1",
    "tableNumber": "AC-01",
    "capacity": 4,
    "floorZone": "AC_HALL",
    "status": "AVAILABLE"
  },
  {
    "id": "tbl_ac2",
    "tableNumber": "AC-02",
    "capacity": 4,
    "floorZone": "AC_HALL",
    "status": "AVAILABLE"
  },
  {
    "id": "tbl_roof1",
    "tableNumber": "ROOF-01",
    "capacity": 4,
    "floorZone": "ROOFTOP",
    "status": "AVAILABLE"
  },
  {
    "id": "tbl_roof2",
    "tableNumber": "ROOF-02",
    "capacity": 6,
    "floorZone": "ROOFTOP",
    "status": "AVAILABLE"
  },
  {
    "id": "tbl_vip1",
    "tableNumber": "VIP-01",
    "capacity": 10,
    "floorZone": "VIP",
    "status": "AVAILABLE"
  }
]
INVENTORY_ITEMS = [
  {
    "id": "inv_bajri_flour",
    "itemCode": "RAW-001",
    "name": "Organic Bajri Flour",
    "category": "RAW_MATERIAL",
    "unitId": "unit_kg",
    "currentStock": 120.0,
    "minimumStockLevel": 30.0,
    "reorderQuantity": 80.0,
    "costPerUnit": 40.0
  },
  {
    "id": "inv_ringna",
    "itemCode": "RAW-002",
    "name": "Fresh Purple Brinjal / Eggplant",
    "category": "RAW_MATERIAL",
    "unitId": "unit_kg",
    "currentStock": 65.0,
    "minimumStockLevel": 20.0,
    "reorderQuantity": 50.0,
    "costPerUnit": 38.0
  },
  {
    "id": "inv_deshi_ghee",
    "itemCode": "RAW-003",
    "name": "Pure Deshi Cow Ghee",
    "category": "DAIRY",
    "unitId": "unit_kg",
    "currentStock": 45.0,
    "minimumStockLevel": 15.0,
    "reorderQuantity": 30.0,
    "costPerUnit": 650.0
  },
  {
    "id": "inv_white_makhan",
    "itemCode": "RAW-004",
    "name": "Fresh White Deshi Makhan",
    "category": "DAIRY",
    "unitId": "unit_kg",
    "currentStock": 35.0,
    "minimumStockLevel": 10.0,
    "reorderQuantity": 25.0,
    "costPerUnit": 380.0
  },
  {
    "id": "inv_curd_dahi",
    "itemCode": "RAW-005",
    "name": "Fresh Whole Milk Curd / Dahi",
    "category": "DAIRY",
    "unitId": "unit_kg",
    "currentStock": 60.0,
    "minimumStockLevel": 20.0,
    "reorderQuantity": 40.0,
    "costPerUnit": 65.0
  },
  {
    "id": "inv_gathiya",
    "itemCode": "RAW-006",
    "name": "Special Bhavnagri Gathiya",
    "category": "RAW_MATERIAL",
    "unitId": "unit_kg",
    "currentStock": 40.0,
    "minimumStockLevel": 10.0,
    "reorderQuantity": 25.0,
    "costPerUnit": 180.0
  },
  {
    "id": "inv_kaju",
    "itemCode": "RAW-007",
    "name": "Whole Premium Cashews W320",
    "category": "RAW_MATERIAL",
    "unitId": "unit_kg",
    "currentStock": 25.0,
    "minimumStockLevel": 5.0,
    "reorderQuantity": 15.0,
    "costPerUnit": 780.0
  },
  {
    "id": "inv_tomatoes",
    "itemCode": "RAW-008",
    "name": "Deshi Country Tomatoes",
    "category": "RAW_MATERIAL",
    "unitId": "unit_kg",
    "currentStock": 75.0,
    "minimumStockLevel": 20.0,
    "reorderQuantity": 50.0,
    "costPerUnit": 32.0
  },
  {
    "id": "inv_garlic",
    "itemCode": "RAW-009",
    "name": "Jamnagari Fresh Garlic",
    "category": "RAW_MATERIAL",
    "unitId": "unit_kg",
    "currentStock": 30.0,
    "minimumStockLevel": 10.0,
    "reorderQuantity": 20.0,
    "costPerUnit": 140.0
  },
  {
    "id": "inv_gol",
    "itemCode": "RAW-010",
    "name": "Organic Deshi Jaggery / Gol",
    "category": "RAW_MATERIAL",
    "unitId": "unit_kg",
    "currentStock": 80.0,
    "minimumStockLevel": 25.0,
    "reorderQuantity": 50.0,
    "costPerUnit": 55.0
  }
]
RECIPES = [
  {
    "id": "rec_ringna_olo",
    "menuItemId": "item_ringna_olo",
    "menuItemName": "Ringna No Olo with White Butter",
    "yieldQuantity": 1,
    "totalCost": 75.0,
    "foodCostPercentage": 34.0,
    "instructions": "Roast 400g brinjal on charcoal flame, mash with garlic paste, saute in mustard oil and fresh ginger, serve with 30g white butter",
    "ingredients": [
      {
        "id": "1368d93b-88a1-4ead-ac41-a51213765774",
        "inventoryItemId": "inv_ringna",
        "itemName": "Fresh Purple Brinjal",
        "quantity": 0.4,
        "unitId": "unit_kg",
        "unitSymbol": "kg",
        "cost": 15.2
      },
      {
        "id": "b94dcc90-924d-4285-ac2c-a3d0b03f184f",
        "inventoryItemId": "inv_white_makhan",
        "itemName": "Fresh White Deshi Makhan",
        "quantity": 0.05,
        "unitId": "unit_kg",
        "unitSymbol": "kg",
        "cost": 19.0
      },
      {
        "id": "0f7e745d-beae-49ec-98c6-a987e2dd7f9a",
        "inventoryItemId": "inv_garlic",
        "itemName": "Jamnagari Fresh Garlic",
        "quantity": 0.05,
        "unitId": "unit_kg",
        "unitSymbol": "kg",
        "cost": 7.0
      },
      {
        "id": "2c052c84-1179-4706-8403-15b9ce7355b9",
        "inventoryItemId": "inv_tomatoes",
        "itemName": "Deshi Country Tomatoes",
        "quantity": 0.15,
        "unitId": "unit_kg",
        "unitSymbol": "kg",
        "cost": 4.8
      }
    ]
  },
  {
    "id": "rec_kaju_gathiya",
    "menuItemId": "item_kaju_gathiya",
    "menuItemName": "Kaju Gathiya Nu Shaak",
    "yieldQuantity": 1,
    "totalCost": 90.0,
    "foodCostPercentage": 37.5,
    "instructions": "Saute 50g whole cashews in deshi ghee with tomato-garlic gravy, mix with fresh gathiya right before plating",
    "ingredients": [
      {
        "id": "2cfcc334-cd4e-4b0a-b5bf-3116a1895cc4",
        "inventoryItemId": "inv_kaju",
        "itemName": "Whole Premium Cashews",
        "quantity": 0.05,
        "unitId": "unit_kg",
        "unitSymbol": "kg",
        "cost": 39.0
      },
      {
        "id": "f2fab46e-8133-4c78-9458-39777035b000",
        "inventoryItemId": "inv_gathiya",
        "itemName": "Special Bhavnagri Gathiya",
        "quantity": 0.1,
        "unitId": "unit_kg",
        "unitSymbol": "kg",
        "cost": 18.0
      },
      {
        "id": "15b9b320-fbb9-4362-8052-1b323d93241f",
        "inventoryItemId": "inv_deshi_ghee",
        "itemName": "Pure Deshi Cow Ghee",
        "quantity": 0.03,
        "unitId": "unit_kg",
        "unitSymbol": "kg",
        "cost": 19.5
      },
      {
        "id": "9d9ae916-8322-4c67-a480-bd06a527b780",
        "inventoryItemId": "inv_tomatoes",
        "itemName": "Deshi Country Tomatoes",
        "quantity": 0.15,
        "unitId": "unit_kg",
        "unitSymbol": "kg",
        "cost": 4.8
      }
    ]
  },
  {
    "id": "rec_bajri_rotlo",
    "menuItemId": "item_bajri_rotlo",
    "menuItemName": "Deshi Bajri No Rotlo (with Ghee & Makhan)",
    "yieldQuantity": 1,
    "totalCost": 18.0,
    "foodCostPercentage": 30.0,
    "instructions": "Hand-pat 180g bajri flour dough on clay tavadio, cook on wood flame, glaze generously with deshi cow ghee and dollop of white makhan",
    "ingredients": [
      {
        "id": "b921f55d-1a9d-4729-9b79-72ef7402b485",
        "inventoryItemId": "inv_bajri_flour",
        "itemName": "Organic Bajri Flour",
        "quantity": 0.18,
        "unitId": "unit_kg",
        "unitSymbol": "kg",
        "cost": 7.2
      },
      {
        "id": "2e779a07-3770-4b6b-9d09-7c756d3411f6",
        "inventoryItemId": "inv_deshi_ghee",
        "itemName": "Pure Deshi Cow Ghee",
        "quantity": 0.015,
        "unitId": "unit_kg",
        "unitSymbol": "kg",
        "cost": 9.75
      }
    ]
  }
]
SUPPLIERS = [
  {
    "id": "sup_saurashtra",
    "name": "Manishbhai Patel",
    "companyName": "Saurashtra Deshi Krushi & Ghee Kendra",
    "email": "saurashtra.krushi@example.com",
    "phone": "9879011223",
    "taxId": "24AAAAA0000A1Z5",
    "address": "Grain Market Yard, Rajkot",
    "paymentTerms": "NET30",
    "outstandingBalance": 12500.0
  },
  {
    "id": "sup_farsan",
    "name": "Hiteshbhai Dave",
    "companyName": "Bhavnagar Farsan & Spices Suppliers",
    "email": "dave.farsan@example.com",
    "phone": "9879011224",
    "taxId": "24BBBBB1111B2Z6",
    "address": "Danapith, Bhavnagar",
    "paymentTerms": "NET15",
    "outstandingBalance": 6800.0
  }
]
CUSTOMERS = [
  {
    "id": "cust_vip1",
    "name": "Jayeshbhai Radadiya",
    "phone": "9898011223",
    "email": "jayesh.r@example.com",
    "address": "102 Kalawad Road",
    "city": "Rajkot",
    "loyaltyPoints": 520,
    "totalSpent": 24500.0
  },
  {
    "id": "cust_vip2",
    "name": "Bhavnaben Chovatia",
    "phone": "9898022334",
    "email": "bhavna.c@example.com",
    "address": "45 Amin Marg",
    "city": "Rajkot",
    "loyaltyPoints": 340,
    "totalSpent": 16800.0
  }
]
CHART_OF_ACCOUNTS = [
  {
    "id": "acc_cash_drawer",
    "accountCode": "1010",
    "accountName": "Cash in Counter Drawer",
    "accountType": "ASSET",
    "subType": "CASH",
    "currentBalance": 35000.0
  },
  {
    "id": "acc_bank_sbi",
    "accountCode": "1020",
    "accountName": "SBI Current Account (Rajkot Main)",
    "accountType": "ASSET",
    "subType": "BANK",
    "currentBalance": 620000.0
  },
  {
    "id": "acc_pos_receivable",
    "accountCode": "1030",
    "accountName": "Accounts Receivable (Customers)",
    "accountType": "ASSET",
    "subType": "CURRENT_ASSET",
    "currentBalance": 0.0
  },
  {
    "id": "acc_inventory_asset",
    "accountCode": "1040",
    "accountName": "Food & Kathiyawadi Provision Inventory Asset",
    "accountType": "ASSET",
    "subType": "CURRENT_ASSET",
    "currentBalance": 185000.0
  },
  {
    "id": "acc_supplier_payable",
    "accountCode": "2010",
    "accountName": "Accounts Payable (Farm & Spice Suppliers)",
    "accountType": "LIABILITY",
    "subType": "CURRENT_LIABILITY",
    "currentBalance": 19300.0
  },
  {
    "id": "acc_gst_payable",
    "accountCode": "2020",
    "accountName": "GST Output Tax Payable (5%)",
    "accountType": "LIABILITY",
    "subType": "CURRENT_LIABILITY",
    "currentBalance": 11400.0
  },
  {
    "id": "acc_owner_equity",
    "accountCode": "3010",
    "accountName": "Owner Capital / Equity",
    "accountType": "EQUITY",
    "subType": "EQUITY",
    "currentBalance": 750000.0
  },
  {
    "id": "acc_food_sales",
    "accountCode": "4010",
    "accountName": "Kathiyawadi Food & Thali Sales Revenue",
    "accountType": "REVENUE",
    "subType": "OPERATING_REVENUE",
    "currentBalance": 0.0
  },
  {
    "id": "acc_bev_sales",
    "accountCode": "4020",
    "accountName": "Chaas & Beverage Sales Revenue",
    "accountType": "REVENUE",
    "subType": "OPERATING_REVENUE",
    "currentBalance": 0.0
  },
  {
    "id": "acc_cogs_food",
    "accountCode": "5010",
    "accountName": "Cost of Goods Sold - Deshi Provisions",
    "accountType": "EXPENSE",
    "subType": "DIRECT_EXPENSE",
    "currentBalance": 0.0
  },
  {
    "id": "acc_exp_rent",
    "accountCode": "6010",
    "accountName": "Dining Hall Premises Rent",
    "accountType": "EXPENSE",
    "subType": "INDIRECT_EXPENSE",
    "currentBalance": 0.0
  },
  {
    "id": "acc_exp_utilities",
    "accountCode": "6020",
    "accountName": "Electricity & Gas Utilities",
    "accountType": "EXPENSE",
    "subType": "INDIRECT_EXPENSE",
    "currentBalance": 0.0
  },
  {
    "id": "acc_exp_salaries",
    "accountCode": "6030",
    "accountName": "Cook & Staff Salaries",
    "accountType": "EXPENSE",
    "subType": "INDIRECT_EXPENSE",
    "currentBalance": 0.0
  }
]
EMPLOYEES = [
  {
    "id": "emp_001",
    "employeeCode": "EMP-001",
    "firstName": "Rameshbhai",
    "lastName": "Patel",
    "email": "ramesh.p@bhatigalbhanu.com",
    "phone": "9879001100",
    "departmentId": "dept_mgmt",
    "departmentName": "Management",
    "designationId": "desig_gm",
    "designationTitle": "General Manager",
    "userId": "usr_manager",
    "joiningDate": "2025-01-15",
    "baseSalary": 65000
  },
  {
    "id": "emp_002",
    "employeeCode": "EMP-002",
    "firstName": "Dineshbhai",
    "lastName": "Maharaj",
    "email": "dinesh.m@bhatigalbhanu.com",
    "phone": "9879001101",
    "departmentId": "dept_kitchen",
    "departmentName": "Kitchen & Culinary",
    "designationId": "desig_head_chef",
    "designationTitle": "Head Maharaj / Chef",
    "userId": "usr_chef",
    "joiningDate": "2025-01-15",
    "baseSalary": 55000
  },
  {
    "id": "emp_003",
    "employeeCode": "EMP-003",
    "firstName": "Pareshbhai",
    "lastName": "Vora",
    "email": "paresh.v@bhatigalbhanu.com",
    "phone": "9879001102",
    "departmentId": "dept_accounts",
    "departmentName": "Accounts & Finance",
    "designationId": "desig_cashier",
    "designationTitle": "Head Cashier",
    "userId": "usr_cashier",
    "joiningDate": "2025-02-01",
    "baseSalary": 32000
  },
  {
    "id": "emp_004",
    "employeeCode": "EMP-004",
    "firstName": "Kishorbhai",
    "lastName": "Chavda",
    "email": "kishor.c@bhatigalbhanu.com",
    "phone": "9879001103",
    "departmentId": "dept_service",
    "departmentName": "Service & Front of House",
    "designationId": "desig_waiter",
    "designationTitle": "Head Captain",
    "userId": "usr_waiter",
    "joiningDate": "2025-02-10",
    "baseSalary": 26000
  },
  {
    "id": "emp_005",
    "employeeCode": "EMP-005",
    "firstName": "Mukeshbhai",
    "lastName": "Gohil",
    "email": "mukesh.g@bhatigalbhanu.com",
    "phone": "9879001104",
    "departmentId": "dept_inventory",
    "departmentName": "Inventory & Stores",
    "designationId": "desig_inv_mgr",
    "designationTitle": "Bhandar Incharge",
    "userId": "usr_inventory",
    "joiningDate": "2025-02-15",
    "baseSalary": 38000
  }
]
SYSTEM_SETTINGS = [
  {
    "key": "floor_zones_seeded_v1",
    "value": "true",
    "category": "SYSTEM",
    "description": "Initial floor zones seeded"
  },
  {
    "key": "floor_zones_seeded_v1",
    "value": "true",
    "category": "SYSTEM",
    "description": "Floor zones initialized"
  },
  {
    "key": "tables_seeded_v1",
    "value": "true",
    "category": "SYSTEM",
    "description": "Initial dining tables seeded"
  },
  {
    "key": "tables_seeded_v1",
    "value": "true",
    "category": "SYSTEM",
    "description": "Dining tables initialized"
  },
  {
    "key": "restaurant_name",
    "value": "Bhatigal Bhanu (\u0aad\u0abe\u0aa4\u0ac0\u0a97\u0ab3 \u0aad\u0abe\u0aa3\u0ac1\u0a82)",
    "category": "GENERAL",
    "description": "Restaurant Brand Name"
  },
  {
    "key": "restaurant_name_gujarati",
    "value": "\u0aad\u0abe\u0aa4\u0ac0\u0a97\u0ab3 \u0aad\u0abe\u0aa3\u0ac1\u0a82",
    "category": "GENERAL",
    "description": "Gujarati Brand Name"
  },
  {
    "key": "restaurant_tagline",
    "value": "...\u0aad\u0abe\u0ab5, \u0aad\u0a9c\u0aa8 \u0a85\u0aa8\u0ac7 \u0aad\u0acb\u0a9c\u0aa8\u0aa8\u0acb \u0aa4\u0acd\u0ab0\u0abf\u0ab5\u0ac7\u0aa3\u0ac0 \u0ab8\u0a82\u0a97\u0aae...",
    "category": "GENERAL",
    "description": "Brand Tagline"
  },
  {
    "key": "restaurant_address",
    "value": "Kothariya Ring Road, Near HP Petrol Pump, Rajkot, Gujarat - 360022",
    "category": "GENERAL",
    "description": "Physical Store Address"
  },
  {
    "key": "restaurant_phone",
    "value": "+91 98790 12345",
    "category": "GENERAL",
    "description": "Official Phone Number"
  },
  {
    "key": "restaurant_email",
    "value": "contact@bhatigalbhanu.com",
    "category": "GENERAL",
    "description": "Official Email Address"
  },
  {
    "key": "restaurant_website",
    "value": "https://bhatigalbhanu.com",
    "category": "GENERAL",
    "description": "Official Website"
  },
  {
    "key": "gst_number",
    "value": "24AAAFB1234A1Z8",
    "category": "TAX",
    "description": "GST Identification Number (GSTIN)"
  },
  {
    "key": "fssai_license",
    "value": "10724026000123",
    "category": "GENERAL",
    "description": "FSSAI Food License Number"
  },
  {
    "key": "currency_symbol",
    "value": "\u20b9",
    "category": "BILLING",
    "description": "Currency Symbol"
  },
  {
    "key": "currency_code",
    "value": "INR",
    "category": "BILLING",
    "description": "ISO Currency Code"
  },
  {
    "key": "system_timezone",
    "value": "Asia/Kolkata",
    "category": "GENERAL",
    "description": "System Timezone"
  },
  {
    "key": "date_format",
    "value": "DD/MM/YYYY",
    "category": "GENERAL",
    "description": "Date Display Format (DD/MM/YYYY, YYYY-MM-DD, DD-MM-YYYY)"
  },
  {
    "key": "time_format",
    "value": "12_HOUR",
    "category": "GENERAL",
    "description": "Time Display Format (12_HOUR, 24_HOUR)"
  },
  {
    "key": "financial_year_start",
    "value": "04-01",
    "category": "ACCOUNTS",
    "description": "Financial Year Start Date (MM-DD)"
  },
  {
    "key": "tax_gst_enabled",
    "value": "true",
    "category": "TAX",
    "description": "Enable GST on Invoices"
  },
  {
    "key": "tax_gst_percentage",
    "value": "5.0",
    "category": "TAX",
    "description": "Standard Restaurant GST Rate (%)"
  },
  {
    "key": "tax_cgst_percentage",
    "value": "2.5",
    "category": "TAX",
    "description": "Central GST Rate (%)"
  },
  {
    "key": "tax_sgst_percentage",
    "value": "2.5",
    "category": "TAX",
    "description": "State GST Rate (%)"
  },
  {
    "key": "tax_inclusive_pricing",
    "value": "false",
    "category": "TAX",
    "description": "Menu Prices Include Tax"
  },
  {
    "key": "service_charge_enabled",
    "value": "false",
    "category": "BILLING",
    "description": "Enable Mandatory Service Charge"
  },
  {
    "key": "service_charge_percentage",
    "value": "0.0",
    "category": "BILLING",
    "description": "Service Charge Percentage (%)"
  },
  {
    "key": "packaging_charge_takeaway",
    "value": "20",
    "category": "BILLING",
    "description": "Flat Packaging Charge for Takeaway (\u20b9)"
  },
  {
    "key": "delivery_charge_fixed",
    "value": "40",
    "category": "BILLING",
    "description": "Flat Delivery Charge (\u20b9)"
  },
  {
    "key": "max_discount_percentage",
    "value": "10",
    "category": "BILLING",
    "description": "Maximum Discount Limit without Override (%)"
  },
  {
    "key": "bill_rounding_mode",
    "value": "NEAREST",
    "category": "BILLING",
    "description": "Invoice Rounding Mode (NEAREST, UP, DOWN, NONE)"
  },
  {
    "key": "bill_invoice_prefix",
    "value": "BB-INV-",
    "category": "BILLING",
    "description": "Bill Invoice Number Prefix"
  },
  {
    "key": "bill_kot_prefix",
    "value": "KOT-",
    "category": "KITCHEN",
    "description": "Kitchen Order Ticket Prefix"
  },
  {
    "key": "accounts_default_cash_account",
    "value": "Cash in Drawer",
    "category": "ACCOUNTS",
    "description": "Default Cash Register Account Head"
  },
  {
    "key": "accounts_cash_variance_alert_threshold",
    "value": "200",
    "category": "ACCOUNTS",
    "description": "Day Closing Cash Variance Alert Threshold (\u20b9)"
  },
  {
    "key": "accounts_auto_journal_on_billing",
    "value": "true",
    "category": "ACCOUNTS",
    "description": "Auto Post Revenue Journal on Bill Settlement"
  },
  {
    "key": "billing_require_order_served",
    "value": "true",
    "category": "BILLING",
    "description": "Require Order to be SERVED before Bill Generation"
  },
  {
    "key": "billing_confirm_before_generation",
    "value": "true",
    "category": "BILLING",
    "description": "Require Confirmation Dialog before Bill Generation"
  },
  {
    "key": "billing_allow_custom_price",
    "value": "false",
    "category": "POS",
    "description": "Allow Cashier to Edit Item Selling Price at POS"
  },
  {
    "key": "orders_auto_send_kot",
    "value": "false",
    "category": "POS",
    "description": "Auto Dispatch KOT immediately on item selection"
  },
  {
    "key": "orders_dinein_customer_mandatory",
    "value": "false",
    "category": "POS",
    "description": "Require Customer Details for Dine-In Orders"
  },
  {
    "key": "orders_takeaway_customer_mandatory",
    "value": "true",
    "category": "POS",
    "description": "Require Customer Mobile for Takeaway Orders"
  },
  {
    "key": "receipt_format",
    "value": "80MM",
    "category": "PRINTER",
    "description": "Receipt Paper Size (80MM, 58MM, A4)"
  },
  {
    "key": "receipt_copies",
    "value": "1",
    "category": "PRINTER",
    "description": "Number of Printed Receipt Copies (1 or 2)"
  },
  {
    "key": "print_font_scale",
    "value": "MEDIUM",
    "category": "PRINTER",
    "description": "Thermal Slip Font Scale (SMALL, MEDIUM, LARGE)"
  },
  {
    "key": "payment_auto_print_receipt",
    "value": "true",
    "category": "PRINTER",
    "description": "Auto Open Print Dialog upon Payment Settlement"
  },
  {
    "key": "auto_kot_print",
    "value": "true",
    "category": "KITCHEN",
    "description": "Automatically trigger KOT print on order"
  },
  {
    "key": "payment_auto_download_pdf",
    "value": "false",
    "category": "PRINTER",
    "description": "Auto Download PDF Invoice upon Settlement"
  },
  {
    "key": "payment_audio_chime",
    "value": "true",
    "category": "PRINTER",
    "description": "Play Pleasant Audio Chime on Successful Payment"
  },
  {
    "key": "receipt_show_logo",
    "value": "true",
    "category": "PRINTER",
    "description": "Print Restaurant Logo on Thermal Slip"
  },
  {
    "key": "receipt_show_gstin",
    "value": "true",
    "category": "PRINTER",
    "description": "Print GSTIN on Thermal Slip"
  },
  {
    "key": "receipt_show_table",
    "value": "true",
    "category": "PRINTER",
    "description": "Print Table Number on Thermal Slip"
  },
  {
    "key": "receipt_show_customer",
    "value": "true",
    "category": "PRINTER",
    "description": "Print Customer Info on Thermal Slip"
  },
  {
    "key": "receipt_show_tax_breakdown",
    "value": "true",
    "category": "PRINTER",
    "description": "Print Detailed CGST/SGST Breakdown"
  },
  {
    "key": "receipt_show_service_charge",
    "value": "false",
    "category": "PRINTER",
    "description": "Print Service Charge Line on Receipt"
  },
  {
    "key": "receipt_show_footer",
    "value": "true",
    "category": "PRINTER",
    "description": "Print Custom Footer Note on Receipt"
  },
  {
    "key": "receipt_header_note",
    "value": "\u0a9c\u0aaf \u0ab6\u0acd\u0ab0\u0ac0 \u0a95\u0ac3\u0ab7\u0acd\u0aa3! \u0aaa\u0aa7\u0abe\u0ab0\u0a9c\u0acb...",
    "category": "PRINTER",
    "description": "Custom Header Note on Bill"
  },
  {
    "key": "receipt_custom_footer",
    "value": "\u0aae\u0ac1\u0ab2\u0abe\u0a95\u0abe\u0aa4 \u0aac\u0aa6\u0ab2 \u0a86\u0aad\u0abe\u0ab0! \u0aab\u0ab0\u0ac0 \u0aaa\u0aa7\u0abe\u0ab0\u0ab6\u0acb... \U0001f64f",
    "category": "PRINTER",
    "description": "Custom Footer Note on Bill"
  },
  {
    "key": "kds_refresh_seconds",
    "value": "10",
    "category": "KITCHEN",
    "description": "KDS Live Auto-Refresh Interval (seconds)"
  },
  {
    "key": "kds_warning_minutes",
    "value": "15",
    "category": "KITCHEN",
    "description": "KDS Yellow Warning Alert Threshold (minutes)"
  },
  {
    "key": "kds_critical_minutes",
    "value": "25",
    "category": "KITCHEN",
    "description": "KDS Red Critical Blinking Threshold (minutes)"
  },
  {
    "key": "kds_audio_alert",
    "value": "true",
    "category": "KITCHEN",
    "description": "Play Sound Alert on New KOT in Kitchen"
  },
  {
    "key": "kds_group_by_station",
    "value": "true",
    "category": "KITCHEN",
    "description": "Group Kitchen Dishes by Cooking Station"
  },
  {
    "key": "tables_dining_warning_minutes",
    "value": "45",
    "category": "TABLES",
    "description": "Dining Duration Alert Warning (minutes)"
  },
  {
    "key": "tables_auto_vacate_on_settlement",
    "value": "true",
    "category": "TABLES",
    "description": "Auto Mark Table Cleaning upon Bill Payment"
  },
  {
    "key": "token_auto_clear_seconds",
    "value": "120",
    "category": "TOKEN",
    "description": "Auto Clear Called Token from Display (seconds)"
  },
  {
    "key": "token_voice_announcement",
    "value": "false",
    "category": "TOKEN",
    "description": "Text-to-Speech Voice Token Calling"
  },
  {
    "key": "token_prefix",
    "value": "BB-T",
    "category": "TOKEN",
    "description": "Token Number Prefix"
  },
  {
    "key": "inventory_auto_recipe_deduction",
    "value": "true",
    "category": "INVENTORY",
    "description": "Auto Deduct Recipe Raw Materials on Order Complete"
  },
  {
    "key": "inventory_allow_negative_stock",
    "value": "false",
    "category": "INVENTORY",
    "description": "Allow Billing When Raw Stock is Insufficient"
  },
  {
    "key": "inventory_low_stock_threshold_percentage",
    "value": "20",
    "category": "INVENTORY",
    "description": "Low Stock Reorder Alert Threshold (%)"
  },
  {
    "key": "purchase_po_approval_threshold",
    "value": "10000",
    "category": "PROCUREMENT",
    "description": "PO Amount Requiring Manager Approval (\u20b9)"
  },
  {
    "key": "attendance_shift_duration_hours",
    "value": "9",
    "category": "STAFF",
    "description": "Standard Working Shift Duration (hours)"
  },
  {
    "key": "attendance_grace_period_minutes",
    "value": "15",
    "category": "STAFF",
    "description": "Attendance Punch Late Grace Period (minutes)"
  },
  {
    "key": "attendance_half_day_hours",
    "value": "4.5",
    "category": "STAFF",
    "description": "Minimum Hours for Half Day Present"
  },
  {
    "key": "attendance_overtime_multiplier",
    "value": "1.5",
    "category": "STAFF",
    "description": "Overtime Hourly Wage Rate Multiplier"
  },
  {
    "key": "payroll_monthly_calculation_days",
    "value": "30",
    "category": "STAFF",
    "description": "Base Days for Monthly Daily Wage Calculation"
  },
  {
    "key": "security_manager_pin",
    "value": "1234",
    "category": "STAFF",
    "description": "Manager Override 4-Digit Security PIN"
  },
  {
    "key": "security_session_timeout_minutes",
    "value": "480",
    "category": "SYSTEM",
    "description": "Inactivity Session Logout Timeout (minutes)"
  },
  {
    "key": "security_audit_log_retention_days",
    "value": "365",
    "category": "SYSTEM",
    "description": "Audit Trail Retention Period (days)"
  },
  {
    "key": "system_status",
    "value": "ONLINE",
    "category": "SYSTEM",
    "description": "System operational status (ONLINE/MAINTENANCE/LOCKDOWN)"
  }
]

def run_database_seeds():
    logger.info("[MongoDB Seed] Starting database initialization and seeding...")
    db = get_db()
    ensure_indexes()

    # 1. Seed Permissions
    logger.info(f"[MongoDB Seed] Synchronizing {len(ALL_PERMISSIONS)} permissions...")
    perm_ops = [
        UpdateOne({"id": p["id"]}, {"$set": p}, upsert=True)
        for p in ALL_PERMISSIONS
    ]
    if perm_ops:
        db.permissions.bulk_write(perm_ops)

    # 2. Seed Roles
    logger.info(f"[MongoDB Seed] Seeding {len(DEFAULT_ROLES)} role definitions...")
    role_ops = [
        UpdateOne({"id": r["id"]}, {"$set": r}, upsert=True)
        for r in DEFAULT_ROLES
    ]
    if role_ops:
        db.roles.bulk_write(role_ops)

    # 3. Seed Demo Users
    logger.info("[MongoDB Seed] Seeding demo users with hashed credentials...")
    user_ops = []
    for u in DEFAULT_USERS:
        pwd_hash = hash_password(u["pass"])
        doc = {
            "id": u["id"],
            "username": u["username"],
            "email": u["email"],
            "passwordHash": pwd_hash,
            "firstName": u["firstName"],
            "lastName": u["lastName"],
            "phone": u.get("phone", ""),
            "roleId": u["roleId"],
            "status": "ACTIVE",
            "failedLoginAttempts": 0,
            "createdAt": datetime.now(timezone.utc),
            "updatedAt": datetime.now(timezone.utc)
        }
        user_ops.append(
            UpdateOne({"$or": [{"id": u["id"]}, {"username": u["username"]}]}, {"$set": doc}, upsert=True)
        )
    if user_ops:
        db.users.bulk_write(user_ops)

    # 4. Departments & Designations
    if DEPARTMENTS:
        db.departments.bulk_write([
            UpdateOne({"id": d["id"]}, {"$set": d}, upsert=True) for d in DEPARTMENTS
        ])
    if DESIGNATIONS:
        db.designations.bulk_write([
            UpdateOne({"id": d["id"]}, {"$set": d}, upsert=True) for d in DESIGNATIONS
        ])

    # 5. Units
    if UNITS:
        db.units.bulk_write([
            UpdateOne({"id": u["id"]}, {"$set": u}, upsert=True) for u in UNITS
        ])

    # 6. Taxes
    if TAXES:
        db.taxes.bulk_write([
            UpdateOne({"id": t["id"]}, {"$set": t}, upsert=True) for t in TAXES
        ])

    # 7. Categories & Menu Items
    if CATEGORIES:
        db.menu_categories.bulk_write([
            UpdateOne({"id": c["id"]}, {"$set": c}, upsert=True) for c in CATEGORIES
        ])
    if MENU_ITEMS:
        db.menu_items.bulk_write([
            UpdateOne({"id": m["id"]}, {"$set": m}, upsert=True) for m in MENU_ITEMS
        ])

    # 8. Floor Zones & Tables
    if DEFAULT_FLOOR_ZONES:
        db.floor_zones.bulk_write([
            UpdateOne({"code": z["code"]}, {"$set": z}, upsert=True) for z in DEFAULT_FLOOR_ZONES
        ])
    if TABLES:
        db.dining_tables.bulk_write([
            UpdateOne({"id": tbl["id"]}, {"$set": tbl}, upsert=True) for tbl in TABLES
        ])

    # 9. Inventory Items & Recipes
    if INVENTORY_ITEMS:
        db.inventory_items.bulk_write([
            UpdateOne({"id": inv["id"]}, {"$set": inv}, upsert=True) for inv in INVENTORY_ITEMS
        ])
    if RECIPES:
        db.recipes.bulk_write([
            UpdateOne({"id": r["id"]}, {"$set": r}, upsert=True) for r in RECIPES
        ])

    # 10. Suppliers & Customers
    if SUPPLIERS:
        db.suppliers.bulk_write([
            UpdateOne({"id": s["id"]}, {"$set": s}, upsert=True) for s in SUPPLIERS
        ])
    if CUSTOMERS:
        db.customers.bulk_write([
            UpdateOne({"id": c["id"]}, {"$set": c}, upsert=True) for c in CUSTOMERS
        ])

    # 11. Chart of Accounts
    if CHART_OF_ACCOUNTS:
        db.chart_of_accounts.bulk_write([
            UpdateOne({"id": a["id"]}, {"$set": a}, upsert=True) for a in CHART_OF_ACCOUNTS
        ])

    # 12. Employees & Salary Structures
    if EMPLOYEES:
        db.employees.bulk_write([
            UpdateOne({"id": e["id"]}, {"$set": e}, upsert=True) for e in EMPLOYEES
        ])
        sal_ops = []
        for e in EMPLOYEES:
            base = e.get("baseSalary", 30000)
            sal_doc = {
                "id": str(uuid.uuid4()),
                "employeeId": e["id"],
                "baseSalary": base * 0.5,
                "hra": base * 0.2,
                "conveyance": 2000,
                "medicalAllowance": 1500,
                "specialAllowance": base * 0.15,
                "providentFund": base * 0.06,
                "professionalTax": 200,
                "tds": 0
            }
            sal_ops.append(UpdateOne({"employeeId": e["id"]}, {"$set": sal_doc}, upsert=True))
        if sal_ops:
            db.salary_structures.bulk_write(sal_ops)

    # 13. System Settings
    if SYSTEM_SETTINGS:
        db.system_settings.bulk_write([
            UpdateOne({"key": s["key"]}, {"$set": s}, upsert=True) for s in SYSTEM_SETTINGS
        ])

    logger.info("[MongoDB Seed] All database collections and default records seeded successfully.")

if __name__ == '__main__':
    run_database_seeds()
