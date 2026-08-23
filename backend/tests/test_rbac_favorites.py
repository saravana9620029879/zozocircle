"""RBAC + favorites module."""
import requests

from conftest import API, new_session, KORAMANGALA

LAT, LNG = KORAMANGALA["lat"], KORAMANGALA["lng"]

SELLER_ENDPOINTS = [("get", "/seller/listings"), ("post", "/seller/listings"), ("put", "/seller/profile")]
ADMIN_ENDPOINTS = [("get", "/admin/stats"), ("get", "/admin/sellers"), ("get", "/admin/listings"),
                   ("get", "/admin/categories"), ("get", "/admin/users")]


class TestRBAC:
    def test_unauthenticated_401(self):
        for method, path in SELLER_ENDPOINTS + ADMIN_ENDPOINTS + [("get", "/favorites")]:
            r = requests.request(method, f"{API}{path}", json={})
            assert r.status_code == 401, f"{method.upper()} {path} -> {r.status_code} (expected 401)"

    def test_customer_forbidden_on_seller_and_admin(self, customer_client):
        for method, path in SELLER_ENDPOINTS + ADMIN_ENDPOINTS:
            r = customer_client.request(method, f"{API}{path}", json={})
            assert r.status_code == 403, f"{method.upper()} {path} -> {r.status_code} (expected 403)"

    def test_seller_forbidden_on_admin(self):
        s = new_session()
        r = s.post(f"{API}/auth/login", json={"email": "seller1@zozocircle.com", "password": "Seller@123"})
        s.headers.update({"Authorization": f"Bearer {r.json()['token']}"})
        s.cookies.clear()
        for method, path in ADMIN_ENDPOINTS:
            assert s.request(method, f"{API}{path}").status_code == 403, f"{path} not admin-protected"

    def test_upload_requires_auth(self):
        r = requests.post(f"{API}/upload", files={"file": ("a.png", b"x", "image/png")})
        assert r.status_code == 401


class TestFavorites:
    def test_add_list_remove_favorite(self, customer_client):
        listings = requests.get(f"{API}/listings", params={"lat": LAT, "lng": LNG, "radius_km": 5}).json()
        lid = listings[0]["id"]

        r = customer_client.post(f"{API}/favorites/{lid}")
        assert r.status_code == 200 and r.json()["saved"] is True

        favs = customer_client.get(f"{API}/favorites", params={"lat": LAT, "lng": LNG})
        assert favs.status_code == 200
        data = favs.json()
        assert any(f["id"] == lid for f in data)
        f = [x for x in data if x["id"] == lid][0]
        assert f["distance_m"] is not None
        assert f["seller"]["business_name"]
        assert "_id" not in f

        # idempotent add (upsert)
        assert customer_client.post(f"{API}/favorites/{lid}").status_code == 200
        assert len([x for x in customer_client.get(f"{API}/favorites").json() if x["id"] == lid]) == 1

        r = customer_client.delete(f"{API}/favorites/{lid}")
        assert r.status_code == 200 and r.json()["saved"] is False
        assert not any(x["id"] == lid for x in customer_client.get(f"{API}/favorites").json())

    def test_favorite_nonexistent_listing_is_not_returned(self, customer_client):
        r = customer_client.post(f"{API}/favorites/ghost-listing-id")
        assert r.status_code in (200, 404)
        if r.status_code == 200:
            favs = customer_client.get(f"{API}/favorites").json()
            assert not any(x["id"] == "ghost-listing-id" for x in favs)
            customer_client.delete(f"{API}/favorites/ghost-listing-id")
