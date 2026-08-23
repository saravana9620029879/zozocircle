"""Admin module: stats, sellers, listings, categories, users + DB-level hash format check."""
import os
import uuid

import pytest
import requests
from dotenv import dotenv_values

from conftest import API, ADMIN, new_session

backend_env = dotenv_values("/app/backend/.env")


class TestAdmin:
    def test_stats_shape(self, admin_client):
        r = admin_client.get(f"{API}/admin/stats")
        assert r.status_code == 200, r.text
        d = r.json()
        for k in ("total_sellers", "total_listings", "active_listings", "pending_listings",
                  "pending_sellers", "total_users", "whatsapp_clicks"):
            assert k in d, f"missing stat {k}"
            assert isinstance(d[k], int), f"{k} is not int: {d[k]!r}"
        assert d["total_sellers"] >= 22, f"expected >=22 seeded sellers, got {d['total_sellers']}"
        assert d["pending_sellers"] >= 3, "expected >=3 pending sellers for the approval demo"
        assert d["active_listings"] <= d["total_listings"]

    def test_sellers_list_and_status_filter(self, admin_client):
        allr = admin_client.get(f"{API}/admin/sellers")
        assert allr.status_code == 200
        sellers = allr.json()
        assert len(sellers) >= 22
        assert all("_id" not in s for s in sellers)
        for k in ("id", "business_name", "locality", "verification_status", "whatsapp_number"):
            assert k in sellers[0]
        pending = admin_client.get(f"{API}/admin/sellers", params={"status": "pending"}).json()
        assert all(s["verification_status"] == "pending" for s in pending)
        names = {s["business_name"] for s in pending}
        for n in ("Frames by Nikhil", "Amma's Home Food", "Wheels Care Bike Service"):
            assert n in names, f"expected pending seed seller {n} missing"

    def test_seller_status_validation(self, admin_client):
        sid = admin_client.get(f"{API}/admin/sellers").json()[0]["id"]
        assert admin_client.patch(f"{API}/admin/sellers/{sid}/status",
                                  params={"status": "bogus"}).status_code == 400
        assert admin_client.patch(f"{API}/admin/sellers/ghost-id/status",
                                  params={"status": "approved"}).status_code == 404

    def test_listings_list_and_filter(self, admin_client):
        r = admin_client.get(f"{API}/admin/listings")
        assert r.status_code == 200
        docs = r.json()
        assert len(docs) > 0
        assert all("_id" not in d for d in docs)
        assert "seller_name" in docs[0] and "seller_locality" in docs[0]
        pending = admin_client.get(f"{API}/admin/listings", params={"status": "pending"}).json()
        assert all(d["status"] == "pending" for d in pending)
        assert len(pending) >= 3, "expected pending seed listings for the approval demo"

    def test_listing_status_validation(self, admin_client):
        assert admin_client.patch(f"{API}/admin/listings/ghost/status",
                                  params={"status": "approved"}).status_code == 404
        lid = admin_client.get(f"{API}/admin/listings").json()[0]["id"]
        assert admin_client.patch(f"{API}/admin/listings/{lid}/status",
                                  params={"status": "bogus"}).status_code == 400
        assert admin_client.delete(f"{API}/admin/listings/ghost").status_code == 404

    def test_users_list_hides_password(self, admin_client):
        r = admin_client.get(f"{API}/admin/users")
        assert r.status_code == 200
        users = r.json()
        assert len(users) > 0
        assert all("password_hash" not in u and "_id" not in u for u in users)

    def test_category_add_toggle_and_public_visibility(self, admin_client):
        slug = f"test-cat-{uuid.uuid4().hex[:6]}"
        body = {"name": "TEST Category", "slug": slug, "icon": "Tag", "applies_to": "both", "active": True}
        r = admin_client.post(f"{API}/admin/categories", json=body)
        assert r.status_code == 200, r.text
        assert r.json()["slug"] == slug
        assert "_id" not in r.json()

        assert slug in {c["slug"] for c in requests.get(f"{API}/categories").json()}

        # duplicate slug rejected
        assert admin_client.post(f"{API}/admin/categories", json=body).status_code == 400

        # disable it -> disappears from public list, still in admin list
        off = admin_client.put(f"{API}/admin/categories/{slug}", json={**body, "active": False})
        assert off.status_code == 200 and off.json()["active"] is False
        assert slug not in {c["slug"] for c in requests.get(f"{API}/categories").json()}
        assert slug in {c["slug"] for c in admin_client.get(f"{API}/admin/categories").json()}

        # re-enable
        on = admin_client.put(f"{API}/admin/categories/{slug}", json={**body, "active": True})
        assert on.json()["active"] is True
        assert slug in {c["slug"] for c in requests.get(f"{API}/categories").json()}

        assert admin_client.put(f"{API}/admin/categories/ghost-slug", json=body).status_code == 404


class TestPasswordStorage:
    def test_bcrypt_hash_format(self):
        pytest.importorskip("pymongo")
        from pymongo import MongoClient
        mongo_url = backend_env.get("MONGO_URL") or os.environ.get("MONGO_URL")
        db_name = backend_env.get("DB_NAME") or os.environ.get("DB_NAME")
        if not mongo_url or not db_name:
            pytest.skip("MONGO_URL/DB_NAME unavailable")
        c = MongoClient(mongo_url, serverSelectionTimeoutMS=5000)
        u = c[db_name].users.find_one({"email": ADMIN["email"]})
        assert u is not None, "admin user missing in DB"
        h = u["password_hash"]
        assert h.startswith("$2b$"), f"password hash is not bcrypt $2b$: {h[:10]}"
        assert "$" in h and len(h) == 60
        c.close()

    def test_seed_admin_password_matches_env(self):
        env_pw = backend_env.get("ADMIN_PASSWORD")
        assert env_pw, "ADMIN_PASSWORD not set in backend/.env"
        r = new_session().post(f"{API}/auth/login",
                               json={"email": backend_env.get("ADMIN_EMAIL", ADMIN["email"]).lower(),
                                     "password": env_pw})
        assert r.status_code == 200, "seed_admin did not sync the env password"
