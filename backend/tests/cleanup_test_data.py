"""One-off cleanup: remove TEST_* users, their seller profiles/listings/favorites and TEST categories.
Run: python /app/backend/tests/cleanup_test_data.py
"""
from dotenv import dotenv_values
from pymongo import MongoClient

env = dotenv_values("/app/backend/.env")
db = MongoClient(env["MONGO_URL"])[env["DB_NAME"]]

test_users = list(db.users.find({"email": {"$regex": "^TEST", "$options": "i"}}, {"_id": 0, "id": 1, "email": 1}))
uids = [u["id"] for u in test_users]
sellers = list(db.sellers.find({"$or": [{"user_id": {"$in": uids}},
                                        {"business_name": {"$regex": "^TEST", "$options": "i"}}]},
                               {"_id": 0, "id": 1, "business_name": 1}))
sids = [s["id"] for s in sellers]

res_l = db.listings.delete_many({"$or": [{"seller_id": {"$in": sids}},
                                         {"name": {"$regex": "^TEST", "$options": "i"}}]})
res_f = db.favorites.delete_many({"user_id": {"$in": uids}})
res_s = db.sellers.delete_many({"id": {"$in": sids}})
res_u = db.users.delete_many({"id": {"$in": uids}})
res_c = db.categories.delete_many({"slug": {"$regex": "^test-cat-"}})

print("test users:", [u["email"] for u in test_users])
print("test sellers:", [s["business_name"] for s in sellers])
print("deleted listings", res_l.deleted_count, "favorites", res_f.deleted_count,
      "sellers", res_s.deleted_count, "users", res_u.deleted_count, "categories", res_c.deleted_count)
print("pending sellers:", db.sellers.count_documents({"verification_status": "pending"}),
      "pending listings:", db.listings.count_documents({"status": "pending"}),
      "total sellers:", db.sellers.count_documents({}),
      "total listings:", db.listings.count_documents({}))
print("categories enabled:", db.categories.count_documents({"enabled": True}),
      "total:", db.categories.count_documents({}))
