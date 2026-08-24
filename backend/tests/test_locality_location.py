"""Iteration 3: seller locality selection -> stored location -> customer distance correctness.

Covers:
- POST /api/seller/profile stores the picked locality centroid (+ privacy jitter)
- GPS path (arbitrary coords + nearest-locality label) is stored as given
- admin approval -> GET /api/listings distance filtering/sorting for the new sellers
- privacy: no seller lat/lng leaked in public listing payloads
"""
import math
import uuid

import pytest
import requests

from conftest import API, ADMIN, new_session, login

# frontend LOCALITIES source of truth (LocationContext.jsx)
LOC = {
    "Whitefield": (12.9724, 77.7472),
    "Koramangala": (12.9352, 77.6245),
    "Jayanagar": (12.9299, 77.5826),
    "Electronic City": (12.8452, 77.6602),
}
# max theoretical privacy jitter in POST /api/seller/profile
# lat: 3*0.0032 deg (~1.07 km), lng: 2*0.0036 deg (~0.78 km)
MAX_JITTER_M = 1400


def hav(a, b, c, d):
    R = 6371000.0
    p1, p2 = math.radians(a), math.radians(c)
    dp, dl = p2 - p1, math.radians(d - b)
    h = math.sin(dp / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    return 2 * R * math.asin(math.sqrt(h))


def make_seller(locality, lat, lng, suffix):
    """Register a fresh user and submit a seller profile exactly like SellerOnboard.jsx does."""
    s = new_session()
    email = f"TEST_loc_{suffix}_{uuid.uuid4().hex[:6]}@example.com"
    r = s.post(f"{API}/auth/register", json={"name": f"TEST Seller {suffix}", "email": email,
                                             "password": "Seller@1234", "role": "customer"})
    assert r.status_code == 200, r.text
    s.headers.update({"Authorization": f"Bearer {r.json()['token']}"})
    s.cookies.clear()
    body = {
        "full_name": f"TEST Seller {suffix}",
        "business_name": f"TEST Biz {suffix}",
        "phone": "+919876500000", "whatsapp_number": "+919876500000",
        "business_type": "product", "categories": ["home-food"],
        "description": "TEST locality seller",
        "locality": locality, "city": "Bengaluru", "lat": lat, "lng": lng,
        "service_radius_km": 5, "operating_hours": "9:00 AM - 8:00 PM", "logo_url": None,
    }
    r = s.post(f"{API}/seller/profile", json=body)
    assert r.status_code == 200, r.text
    return s, r.json(), email


@pytest.fixture(scope="module")
def admin():
    s = new_session()
    s.headers.update({"Authorization": f"Bearer {login(s, ADMIN)}"})
    s.cookies.clear()
    return s


@pytest.fixture(scope="module")
def sellers(admin):
    """Whitefield / Koramangala / GPS-Jayanagar sellers, each approved with one approved listing."""
    made = {}
    cases = [
        ("whitefield", "Whitefield", LOC["Whitefield"][0], LOC["Whitefield"][1]),
        ("koramangala", "Koramangala", LOC["Koramangala"][0], LOC["Koramangala"][1]),
        # GPS path: raw fix, label resolved by nearestLocality() on the client
        ("gps", "Jayanagar", 12.9299, 77.5826),
    ]
    for key, locality, lat, lng in cases:
        sess, doc, email = make_seller(locality, lat, lng, key)
        r = sess.post(f"{API}/seller/listings", json={
            "type": "product", "name": f"TEST Item {key}", "category": "home-food",
            "description": "TEST", "price": 100, "unit": "kg", "images": [],
            "availability": "Available", "highlights": ["fresh"],
        })
        assert r.status_code == 200, r.text
        listing_id = r.json()["id"]
        assert admin.patch(f"{API}/admin/sellers/{doc['id']}/status",
                           params={"status": "approved"}).status_code == 200
        assert admin.patch(f"{API}/admin/listings/{listing_id}/status",
                           params={"status": "approved"}).status_code == 200
        made[key] = {"session": sess, "seller": doc, "listing_id": listing_id, "email": email,
                     "picked": (lat, lng), "locality": locality}
    yield made
    # cleanup: remove listings + suspend sellers so seed data / demo stays clean
    for v in made.values():
        v["session"].delete(f"{API}/seller/listings/{v['listing_id']}")
        admin.delete(f"{API}/admin/listings/{v['listing_id']}")
        admin.patch(f"{API}/admin/sellers/{v['seller']['id']}/status", params={"status": "suspended"})


class TestStoredLocation:
    def test_whitefield_stored_near_centroid(self, sellers):
        s = sellers["whitefield"]["seller"]
        assert s["locality"] == "Whitefield"
        assert s["city"] == "Bengaluru"
        d = hav(s["lat"], s["lng"], *LOC["Whitefield"])
        assert d <= MAX_JITTER_M, f"Whitefield seller stored {d:.0f}m from centroid"

    def test_koramangala_stored_near_centroid_and_distinct(self, sellers):
        s = sellers["koramangala"]["seller"]
        w = sellers["whitefield"]["seller"]
        assert s["locality"] == "Koramangala"
        d = hav(s["lat"], s["lng"], *LOC["Koramangala"])
        assert d <= MAX_JITTER_M, f"Koramangala seller stored {d:.0f}m from centroid"
        # picked locality actually drives stored coords
        assert hav(s["lat"], s["lng"], w["lat"], w["lng"]) > 10000

    def test_gps_point_stored_not_locality_centroid(self, sellers):
        s = sellers["gps"]["seller"]
        assert s["locality"] == "Jayanagar"
        d = hav(s["lat"], s["lng"], *LOC["Jayanagar"])
        assert d <= MAX_JITTER_M
        # service radius preserved
        assert s["service_radius_km"] == 5

    def test_duplicate_profile_rejected(self, sellers):
        r = sellers["whitefield"]["session"].post(f"{API}/seller/profile", json={
            "full_name": "x", "business_name": "y", "phone": "+91", "whatsapp_number": "+91",
            "business_type": "product", "categories": [], "description": "",
            "locality": "Hebbal", "city": "Bengaluru", "lat": 13.0, "lng": 77.6,
            "service_radius_km": 3, "operating_hours": "9-9", "logo_url": None})
        assert r.status_code == 400


class TestCustomerDistance:
    @pytest.mark.parametrize("key,loc_name", [("whitefield", "Whitefield"),
                                              ("koramangala", "Koramangala"),
                                              ("gps", "Jayanagar")])
    def test_listing_visible_near_own_locality(self, sellers, key, loc_name):
        lat, lng = LOC[loc_name]
        out = requests.get(f"{API}/listings", params={"lat": lat, "lng": lng,
                                                     "radius_km": 2, "limit": 2000}).json()
        row = next((l for l in out if l["id"] == sellers[key]["listing_id"]), None)
        assert row is not None, f"{key} listing not discoverable from {loc_name} @2km"
        assert row["distance_m"] is not None and row["distance_m"] > 0
        assert row["distance_m"] <= 2000
        assert row["seller"]["locality"] == sellers[key]["locality"]
        # distance matches server-side haversine on stored coords
        s = sellers[key]["seller"]
        assert abs(row["distance_m"] - hav(lat, lng, s["lat"], s["lng"])) <= 2

    @pytest.mark.parametrize("key", ["whitefield", "koramangala", "gps"])
    def test_excluded_from_far_locality_at_1km(self, sellers, key):
        lat, lng = LOC["Electronic City"]
        out = requests.get(f"{API}/listings", params={"lat": lat, "lng": lng,
                                                     "radius_km": 1, "limit": 2000}).json()
        assert sellers[key]["listing_id"] not in {l["id"] for l in out}

    def test_sorted_by_distance(self, sellers):
        lat, lng = LOC["Koramangala"]
        out = requests.get(f"{API}/listings", params={"lat": lat, "lng": lng,
                                                     "radius_km": 5, "limit": 2000}).json()
        ds = [l["distance_m"] for l in out]
        assert ds == sorted(ds)


class TestPrivacy:
    def test_list_payload_has_no_coords(self, sellers):
        lat, lng = LOC["Whitefield"]
        out = requests.get(f"{API}/listings", params={"lat": lat, "lng": lng,
                                                     "radius_km": 5, "limit": 2000}).json()
        assert out, "no listings returned"
        for l in out:
            for bad in ("lat", "lng", "address", "phone"):
                assert bad not in l, f"listing leaks {bad}"
                assert bad not in l["seller"], f"listing.seller leaks {bad}"

    def test_detail_payload_has_no_coords(self, sellers):
        lid = sellers["whitefield"]["listing_id"]
        d = requests.get(f"{API}/listings/{lid}",
                         params={"lat": LOC["Whitefield"][0], "lng": LOC["Whitefield"][1]}).json()
        assert d["distance_m"] is not None
        assert "whatsapp_number" in d  # needed for the CTA
        for bad in ("lat", "lng", "address"):
            assert bad not in d and bad not in d["seller"]

    def test_seed_sellers_still_resolve(self):
        out = requests.get(f"{API}/listings", params={"lat": LOC["Koramangala"][0],
                                                      "lng": LOC["Koramangala"][1],
                                                      "radius_km": 5, "limit": 2000}).json()
        assert len(out) >= 5
        assert all(l["distance_m"] is not None for l in out)
        assert all(l["seller"]["locality"] for l in out)
