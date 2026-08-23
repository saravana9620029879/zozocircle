"""Iteration-2 fix verification: favorites 404, seed coord jitter / radius realism, upload."""
import io
import struct
import zlib

import requests

from conftest import API, BASE_URL, SELLER1, new_session, login

LOCALITIES = {
    "Koramangala": (12.9352, 77.6245),
    "Indiranagar": (12.9719, 77.6412),
    "Jayanagar": (12.9250, 77.5938),
    "Whitefield": (12.9698, 77.7500),
    "Malleshwaram": (13.0055, 77.5692),
}


def png_bytes():
    def chunk(t, d):
        c = t + d
        return struct.pack(">I", len(d)) + c + struct.pack(">I", zlib.crc32(c) & 0xFFFFFFFF)
    ihdr = struct.pack(">IIBBBBB", 1, 1, 8, 2, 0, 0, 0)
    idat = zlib.compress(b"\x00\xff\x00\x00")
    return b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", ihdr) + chunk(b"IDAT", idat) + chunk(b"IEND", b"")


# --- FIX 4: POST /api/favorites/{id} with unknown id must 404 ---
class TestFavoriteNotFound:
    def test_favorite_unknown_listing_returns_404(self, customer_client):
        r = customer_client.post(f"{API}/favorites/does-not-exist-123")
        assert r.status_code == 404, f"expected 404, got {r.status_code} {r.text[:200]}"

    def test_favorite_real_listing_still_works(self, customer_client):
        listings = requests.get(f"{API}/listings", params={
            "lat": LOCALITIES["Koramangala"][0], "lng": LOCALITIES["Koramangala"][1],
            "radius_km": 5}).json()
        assert listings, "no listings near Koramangala to favourite"
        lid = listings[0]["id"]
        assert customer_client.post(f"{API}/favorites/{lid}").status_code == 200
        favs = customer_client.get(f"{API}/favorites").json()
        assert any(x["id"] == lid for x in favs)
        assert customer_client.delete(f"{API}/favorites/{lid}").status_code == 200


# --- FIX 5: jittered seed coords -> realistic non-zero, distinct distances ---
class TestSeedCoordJitter:
    def test_distances_are_non_zero_and_varied(self):
        for name, (lat, lng) in LOCALITIES.items():
            rows = requests.get(f"{API}/listings", params={
                "lat": lat, "lng": lng, "radius_km": 5, "limit": 100}).json()
            if not rows:
                continue
            dists = [r["distance_m"] for r in rows if r.get("distance_m") is not None]
            assert dists, f"{name}: no distance_m values returned"
            assert all(d > 0 for d in dists), f"{name}: zero distances present {dists[:5]}"
            assert len(set(dists)) > 1, f"{name}: all distances identical -> coords not jittered: {dists[:5]}"
            assert dists == sorted(dists), f"{name}: default sort not by distance: {dists[:6]}"

    def test_radius_1_2_5_give_different_counts(self):
        differing = 0
        for name, (lat, lng) in LOCALITIES.items():
            counts = []
            for r_km in (1, 2, 5):
                rows = requests.get(f"{API}/listings", params={
                    "lat": lat, "lng": lng, "radius_km": r_km, "limit": 200}).json()
                counts.append(len(rows))
            assert counts[0] <= counts[1] <= counts[2], f"{name}: non-monotonic counts {counts}"
            if len(set(counts)) > 1:
                differing += 1
        assert differing >= 3, "radius changes barely affect result counts across localities"

    def test_distance_matches_haversine(self):
        """Cross-check API distance_m against Haversine using the seller coords in Mongo."""
        import math
        import os
        from pymongo import MongoClient
        from dotenv import dotenv_values

        env = dotenv_values("/app/backend/.env")
        client = MongoClient(os.environ.get("MONGO_URL") or env["MONGO_URL"])
        db = client[os.environ.get("DB_NAME") or env["DB_NAME"]]

        lat, lng = LOCALITIES["Koramangala"]
        rows = requests.get(f"{API}/listings", params={
            "lat": lat, "lng": lng, "radius_km": 5, "limit": 20}).json()
        assert rows
        checked = 0
        for r in rows[:10]:
            sp = db.sellers.find_one({"id": r["seller"]["id"]}, {"_id": 0})
            if not sp or sp.get("lat") is None:
                continue
            dlat, dlng = math.radians(sp["lat"] - lat), math.radians(sp["lng"] - lng)
            a = (math.sin(dlat / 2) ** 2 + math.cos(math.radians(lat))
                 * math.cos(math.radians(sp["lat"])) * math.sin(dlng / 2) ** 2)
            expected_m = 6371000 * 2 * math.asin(math.sqrt(a))
            assert abs(expected_m - r["distance_m"]) < 60, \
                f"{r['id']}: api {r['distance_m']}m vs haversine {expected_m:.0f}m"
            assert r["distance_m"] <= 5000
            checked += 1
        assert checked >= 3, "could not cross-check enough sellers"


# --- FIX 2: upload works end-to-end and rejects bad input with a 4xx ---
class TestUploadFix:
    def test_upload_and_fetch(self):
        s = new_session()
        token = login(s, SELLER1)
        r = requests.post(f"{API}/upload", headers={"Authorization": f"Bearer {token}"},
                          files={"file": ("p.png", io.BytesIO(png_bytes()), "image/png")})
        assert r.status_code == 200, f"{r.status_code} {r.text[:300]}"
        url = r.json()["url"]
        assert url.startswith("/api/files/")
        got = requests.get(f"{BASE_URL}{url}")
        assert got.status_code == 200
        assert got.headers["content-type"].startswith("image/")

    def test_unknown_file_returns_404(self):
        got = requests.get(f"{BASE_URL}/api/files/nope/missing-file.png")
        assert got.status_code in (404, 400), got.status_code
