"""End-to-end seller onboarding + listing CRUD + upload + admin approval => discoverability."""
import io
import uuid

import pytest
import requests

from conftest import API, ADMIN, new_session

WHITEFIELD = {"lat": 12.9724, "lng": 77.7472}


def png_bytes():
    # 1x1 transparent PNG
    return (b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x06\x00\x00\x00"
            b"\x1f\x15\xc4\x89\x00\x00\x00\nIDATx\x9cc\x00\x01\x00\x00\x05\x00\x01\r\n-\xb4\x00\x00"
            b"\x00\x00IEND\xaeB`\x82")


@pytest.fixture(scope="module")
def ctx():
    return {}


class TestSellerLifecycle:
    def test_01_register_seller_account(self, ctx):
        s = new_session()
        email = f"TEST_seller_{uuid.uuid4().hex[:8]}@example.com"
        r = s.post(f"{API}/auth/register", json={"name": "TEST Seller", "email": email,
                                                "password": "Sell@1234", "role": "seller"})
        assert r.status_code == 200, r.text
        s.headers.update({"Authorization": f"Bearer {r.json()['token']}"})
        s.cookies.clear()
        ctx["seller_session"] = s
        ctx["seller_email"] = email

    def test_02_no_profile_yet(self, ctx):
        r = ctx["seller_session"].get(f"{API}/seller/listings")
        assert r.status_code == 404, f"expected 404 before profile exists, got {r.status_code}"

    def test_03_create_business_profile(self, ctx):
        s = ctx["seller_session"]
        body = {"full_name": "TEST Owner", "business_name": f"TEST Biz {uuid.uuid4().hex[:5]}",
                "phone": "+919845000111", "whatsapp_number": "+919845000111",
                "business_type": "product", "categories": ["food"],
                "description": "TEST hyperlocal biz", "locality": "Whitefield", "city": "Bengaluru",
                "lat": WHITEFIELD["lat"], "lng": WHITEFIELD["lng"], "service_radius_km": 5,
                "operating_hours": "9:00 AM - 8:00 PM"}
        r = s.post(f"{API}/seller/profile", json=body)
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["verification_status"] == "pending"
        assert d["business_name"] == body["business_name"]
        assert "_id" not in d
        ctx["seller_id"] = d["id"]
        ctx["business_name"] = d["business_name"]

        # persistence check via /auth/me
        me = s.get(f"{API}/auth/me").json()
        assert me["seller"]["id"] == d["id"]
        assert me["user"]["role"] == "seller"

    def test_04_duplicate_profile_rejected(self, ctx):
        r = ctx["seller_session"].post(f"{API}/seller/profile", json={
            "full_name": "x", "business_name": "y", "phone": "1", "whatsapp_number": "1",
            "locality": "Whitefield", "lat": 12.9, "lng": 77.7})
        assert r.status_code == 400

    def test_05_profile_validation(self, ctx):
        r = ctx["seller_session"].put(f"{API}/seller/profile", json={"full_name": "only-name"})
        assert r.status_code == 422

    def test_06_upload_image(self, ctx):
        auth = {"Authorization": ctx["seller_session"].headers["Authorization"]}
        r = requests.post(f"{API}/upload", headers=auth,
                          files={"file": ("test.png", io.BytesIO(png_bytes()), "image/png")})
        assert r.status_code == 200, f"upload failed: {r.status_code} {r.text[:300]}"
        url = r.json()["url"]
        assert url.startswith("/api/files/"), url
        ctx["image_url"] = url

        base = API[: -len("/api")]
        fetched = requests.get(f"{base}{url}")
        assert fetched.status_code == 200, f"uploaded file not retrievable: {fetched.status_code}"
        assert fetched.headers["content-type"].startswith("image/")
        assert len(fetched.content) > 0

    def test_07_upload_rejects_non_image(self, ctx):
        auth = {"Authorization": ctx["seller_session"].headers["Authorization"]}
        r = requests.post(f"{API}/upload", headers=auth,
                          files={"file": ("a.txt", io.BytesIO(b"hello"), "text/plain")})
        assert r.status_code == 400

    def test_08_create_product_and_service_listings(self, ctx):
        s = ctx["seller_session"]
        prod = {"type": "product", "name": "TEST Mango Pickle", "category": "food",
                "description": "TEST homemade pickle", "price": 249, "unit": "per 500g",
                "images": [ctx.get("image_url", "")], "highlights": ["TEST No preservatives"]}
        r = s.post(f"{API}/seller/listings", json=prod)
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["status"] == "pending" and d["active"] is True
        assert d["price"] == 249 and d["name"] == prod["name"]
        assert "_id" not in d
        ctx["product_id"] = d["id"]

        svc = {"type": "service", "name": "TEST Yoga Session", "category": "fitness",
               "description": "TEST yoga at home", "price": 500, "unit": "per session"}
        r2 = s.post(f"{API}/seller/listings", json=svc)
        assert r2.status_code == 200, r2.text
        ctx["service_id"] = r2.json()["id"]

        got = s.get(f"{API}/seller/listings").json()
        ids = {x["id"] for x in got["listings"]}
        assert ctx["product_id"] in ids and ctx["service_id"] in ids
        assert got["seller"]["id"] == ctx["seller_id"]

    def test_09_listing_validation(self, ctx):
        r = ctx["seller_session"].post(f"{API}/seller/listings",
                                      json={"type": "product", "name": "TEST No price", "category": "food"})
        assert r.status_code == 422

    def test_10_pending_listing_not_discoverable(self, ctx):
        out = requests.get(f"{API}/listings", params={**WHITEFIELD, "radius_km": 5, "limit": 2000}).json()
        assert ctx["product_id"] not in {l["id"] for l in out}

    def test_11_toggle_active(self, ctx):
        s = ctx["seller_session"]
        r = s.patch(f"{API}/seller/listings/{ctx['product_id']}/active")
        assert r.status_code == 200 and r.json()["active"] is False
        got = [x for x in s.get(f"{API}/seller/listings").json()["listings"] if x["id"] == ctx["product_id"]][0]
        assert got["active"] is False
        r = s.patch(f"{API}/seller/listings/{ctx['product_id']}/active")
        assert r.json()["active"] is True

    def test_12_edit_listing(self, ctx):
        s = ctx["seller_session"]
        body = {"type": "product", "name": "TEST Mango Pickle v2", "category": "food",
                "description": "TEST updated", "price": 299, "unit": "per 500g"}
        r = s.put(f"{API}/seller/listings/{ctx['product_id']}", json=body)
        assert r.status_code == 200, r.text
        assert r.json()["name"] == body["name"] and r.json()["price"] == 299
        got = [x for x in s.get(f"{API}/seller/listings").json()["listings"] if x["id"] == ctx["product_id"]][0]
        assert got["name"] == "TEST Mango Pickle v2" and got["price"] == 299

    def test_13_cannot_touch_other_sellers_listing(self, ctx):
        other = requests.get(f"{API}/listings", params={"lat": 12.9352, "lng": 77.6245, "radius_km": 5}).json()[0]
        s = ctx["seller_session"]
        assert s.patch(f"{API}/seller/listings/{other['id']}/active").status_code == 404
        assert s.delete(f"{API}/seller/listings/{other['id']}").status_code == 404

    def test_14_admin_approves_seller_and_listings(self, ctx):
        a = new_session()
        a.headers.update({"Authorization": f"Bearer {a.post(f'{API}/auth/login', json=ADMIN).json()['token']}"})
        a.cookies.clear()
        ctx["admin"] = a

        r = a.patch(f"{API}/admin/sellers/{ctx['seller_id']}/status", params={"status": "approved"})
        assert r.status_code == 200 and r.json()["status"] == "approved"
        sellers = a.get(f"{API}/admin/sellers", params={"status": "approved"}).json()
        assert any(s["id"] == ctx["seller_id"] for s in sellers)

        for lid in (ctx["product_id"], ctx["service_id"]):
            r = a.patch(f"{API}/admin/listings/{lid}/status", params={"status": "approved"})
            assert r.status_code == 200 and r.json()["status"] == "approved"

    def test_15_approved_listing_now_discoverable(self, ctx):
        out = requests.get(f"{API}/listings", params={**WHITEFIELD, "radius_km": 5, "limit": 2000}).json()
        by_id = {l["id"]: l for l in out}
        assert ctx["product_id"] in by_id, "approved listing still not discoverable"
        assert ctx["service_id"] in by_id
        l = by_id[ctx["product_id"]]
        assert l["distance_m"] < 500
        assert l["seller"]["business_name"] == ctx["business_name"]
        assert l["seller"]["verified"] is False  # approved != verified badge

    def test_16_verify_seller_sets_badge(self, ctx):
        a = ctx["admin"]
        assert a.patch(f"{API}/admin/sellers/{ctx['seller_id']}/status",
                       params={"status": "verified"}).status_code == 200
        out = requests.get(f"{API}/listings", params={**WHITEFIELD, "radius_km": 5, "limit": 2000}).json()
        l = [x for x in out if x["id"] == ctx["product_id"]][0]
        assert l["seller"]["verified"] is True

    def test_17_suspend_seller_hides_listings(self, ctx):
        a = ctx["admin"]
        a.patch(f"{API}/admin/sellers/{ctx['seller_id']}/status", params={"status": "suspended"})
        out = requests.get(f"{API}/listings", params={**WHITEFIELD, "radius_km": 5, "limit": 2000}).json()
        assert ctx["product_id"] not in {l["id"] for l in out}, "suspended seller listings still visible"
        a.patch(f"{API}/admin/sellers/{ctx['seller_id']}/status", params={"status": "verified"})

    def test_18_reject_listing_hides_it(self, ctx):
        a = ctx["admin"]
        a.patch(f"{API}/admin/listings/{ctx['service_id']}/status", params={"status": "rejected"})
        out = requests.get(f"{API}/listings", params={**WHITEFIELD, "radius_km": 5, "limit": 2000}).json()
        assert ctx["service_id"] not in {l["id"] for l in out}

    def test_19_edit_resets_status_to_pending(self, ctx):
        s = ctx["seller_session"]
        s.put(f"{API}/seller/listings/{ctx['product_id']}", json={
            "type": "product", "name": "TEST Mango Pickle v3", "category": "food",
            "description": "TEST re-edit", "price": 310})
        got = [x for x in s.get(f"{API}/seller/listings").json()["listings"] if x["id"] == ctx["product_id"]][0]
        assert got["status"] == "pending"
        out = requests.get(f"{API}/listings", params={**WHITEFIELD, "radius_km": 5, "limit": 2000}).json()
        assert ctx["product_id"] not in {l["id"] for l in out}

    def test_20_delete_listings_cleanup(self, ctx):
        s = ctx["seller_session"]
        assert s.delete(f"{API}/seller/listings/{ctx['product_id']}").status_code == 200
        assert s.delete(f"{API}/seller/listings/{ctx['product_id']}").status_code == 404
        a = ctx["admin"]
        assert a.delete(f"{API}/admin/listings/{ctx['service_id']}").status_code == 200
        remaining = s.get(f"{API}/seller/listings").json()["listings"]
        assert remaining == []
        # remove the test seller profile from public/admin surface
        a.patch(f"{API}/admin/sellers/{ctx['seller_id']}/status", params={"status": "rejected"})
