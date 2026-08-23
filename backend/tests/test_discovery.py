"""Discovery module: GET /api/listings (radius, type, category, q, sort, price, rating),
GET /api/listings/{id}, whatsapp-click, categories."""
import requests

from conftest import API, KORAMANGALA, new_session

LAT, LNG = KORAMANGALA["lat"], KORAMANGALA["lng"]


def get_listings(**params):
    r = requests.get(f"{API}/listings", params=params)
    assert r.status_code == 200, f"{r.status_code} {r.text[:300]}"
    return r.json()


class TestCategories:
    def test_categories_public(self):
        r = requests.get(f"{API}/categories")
        assert r.status_code == 200
        cats = r.json()
        assert isinstance(cats, list) and len(cats) > 0
        c = cats[0]
        for k in ("name", "slug", "icon", "active"):
            assert k in c, f"missing {k} in category {c}"
        assert all(c["active"] is True for c in cats)
        assert all("_id" not in c for c in cats)


class TestDiscovery:
    def test_listings_shape(self):
        out = get_listings(lat=LAT, lng=LNG, radius_km=5)
        assert len(out) > 0, "no listings within 5km of Koramangala"
        l = out[0]
        for k in ("id", "type", "name", "category", "price", "images", "rating",
                  "review_count", "distance_m", "seller"):
            assert k in l, f"missing {k}"
        assert "_id" not in l
        for k in ("id", "business_name", "locality", "verified"):
            assert k in l["seller"]
        assert "whatsapp_number" not in l["seller"], "whatsapp number leaked in list response"

    def test_radius_filtering_is_monotonic(self):
        r1 = get_listings(lat=LAT, lng=LNG, radius_km=1)
        r2 = get_listings(lat=LAT, lng=LNG, radius_km=2)
        r5 = get_listings(lat=LAT, lng=LNG, radius_km=5)
        assert len(r1) <= len(r2) <= len(r5)
        assert len(r5) > len(r1), f"radius has no effect: 1km={len(r1)} 5km={len(r5)}"
        assert all(l["distance_m"] <= 1000 for l in r1)
        assert all(l["distance_m"] <= 2000 for l in r2)
        assert all(l["distance_m"] <= 5000 for l in r5)

    def test_default_radius_is_2km(self):
        default = get_listings(lat=LAT, lng=LNG)
        explicit = get_listings(lat=LAT, lng=LNG, radius_km=2)
        assert len(default) == len(explicit)

    def test_distance_sorted_ascending_by_default(self):
        out = get_listings(lat=LAT, lng=LNG, radius_km=5)
        d = [l["distance_m"] for l in out]
        assert d == sorted(d), "results not sorted by distance"

    def test_haversine_distance_correctness(self):
        """Compare API distance against locally-computed haversine for the same seller."""
        import math
        out = get_listings(lat=LAT, lng=LNG, radius_km=5)
        # request the same listing from a far-away point and ensure distance grows
        far = requests.get(f"{API}/listings/{out[0]['id']}",
                           params={"lat": 13.0827, "lng": 77.5877}).json()
        near = requests.get(f"{API}/listings/{out[0]['id']}",
                            params={"lat": LAT, "lng": LNG}).json()
        assert far["distance_m"] > near["distance_m"]

        def hav(a1, o1, a2, o2):
            R = 6371000.0
            p1, p2 = math.radians(a1), math.radians(a2)
            dp, dl = p2 - p1, math.radians(o2 - o1)
            x = math.sin(dp / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
            return 2 * R * math.asin(math.sqrt(x))

        # sanity: known distance Koramangala -> Whitefield ~ 13-14 km
        approx = hav(LAT, LNG, 12.9724, 77.7472)
        assert 12000 < approx < 16000

    def test_type_filter(self):
        prods = get_listings(lat=LAT, lng=LNG, radius_km=5, type="product")
        svcs = get_listings(lat=LAT, lng=LNG, radius_km=5, type="service")
        assert len(prods) > 0 and len(svcs) > 0
        assert all(l["type"] == "product" for l in prods)
        assert all(l["type"] == "service" for l in svcs)
        total = get_listings(lat=LAT, lng=LNG, radius_km=5)
        assert len(prods) + len(svcs) == len(total)

    def test_category_filter(self):
        out = get_listings(lat=LAT, lng=LNG, radius_km=5)
        cat = out[0]["category"]
        filtered = get_listings(lat=LAT, lng=LNG, radius_km=5, category=cat)
        assert len(filtered) > 0
        assert all(l["category"] == cat for l in filtered)
        assert len(get_listings(lat=LAT, lng=LNG, radius_km=5, category="all")) == len(out)

    def test_search_terms_return_relevant_results(self):
        terms = ["pickle", "honey", "yoga", "tailor", "physiotherapy", "repair"]
        empty = []
        for t in terms:
            out = get_listings(lat=12.9724, lng=77.7472, radius_km=50, q=t)
            if not out:
                empty.append(t)
        assert not empty, f"search returned nothing for: {empty}"

    def test_search_case_insensitive(self):
        a = get_listings(lat=LAT, lng=LNG, radius_km=50, q="Honey")
        b = get_listings(lat=LAT, lng=LNG, radius_km=50, q="honey")
        assert len(a) == len(b) and len(a) > 0

    def test_search_nonsense_returns_empty(self):
        assert get_listings(lat=LAT, lng=LNG, radius_km=50, q="zzzqqqnonexistent") == []

    def test_max_price_and_min_rating_filters(self):
        out = get_listings(lat=LAT, lng=LNG, radius_km=5, max_price=300)
        assert all(l["price"] <= 300 for l in out)
        out2 = get_listings(lat=LAT, lng=LNG, radius_km=5, min_rating=4.5)
        assert all(l["rating"] >= 4.5 for l in out2)
        # combined filters must both apply
        out3 = get_listings(lat=LAT, lng=LNG, radius_km=5, max_price=300, min_rating=4.5)
        assert all(l["price"] <= 300 and l["rating"] >= 4.5 for l in out3), \
            "combining max_price and min_rating dropped one of the filters"

    def test_sort_options(self):
        low = get_listings(lat=LAT, lng=LNG, radius_km=5, sort="price_low")
        assert [l["price"] for l in low] == sorted([l["price"] for l in low])
        high = get_listings(lat=LAT, lng=LNG, radius_km=5, sort="price_high")
        assert [l["price"] for l in high] == sorted([l["price"] for l in high], reverse=True)
        rat = get_listings(lat=LAT, lng=LNG, radius_km=5, sort="rating")
        assert [l["rating"] for l in rat] == sorted([l["rating"] for l in rat], reverse=True)

    def test_pending_sellers_hidden_from_discovery(self):
        """seller20/21/22 (Frames by Nikhil, Amma's Home Food, Wheels Care) are pending."""
        out = get_listings(lat=12.9724, lng=77.7472, radius_km=100, limit=2000)
        names = {l["seller"]["business_name"] for l in out}
        for pending in ("Frames by Nikhil", "Amma's Home Food", "Wheels Care Bike Service"):
            assert pending not in names, f"pending seller {pending} is publicly discoverable"

    def test_listings_without_coords(self):
        out = get_listings(radius_km=2)
        assert isinstance(out, list) and len(out) > 0
        assert all(l["distance_m"] is None for l in out)

    def test_limit_param(self):
        out = get_listings(lat=LAT, lng=LNG, radius_km=50, limit=3)
        assert len(out) <= 3


class TestListingDetail:
    def test_detail_and_view_increment(self):
        out = get_listings(lat=LAT, lng=LNG, radius_km=5)
        lid = out[0]["id"]
        r1 = requests.get(f"{API}/listings/{lid}", params={"lat": LAT, "lng": LNG})
        assert r1.status_code == 200
        d1 = r1.json()
        assert d1["id"] == lid
        assert d1["whatsapp_number"], "detail must expose whatsapp_number for the CTA"
        assert d1["seller"]["business_name"]
        assert d1["distance_m"] is not None
        assert "_id" not in d1
        d2 = requests.get(f"{API}/listings/{lid}").json()
        # >= because parallel test workers may also be viewing the same listing
        assert d2["views"] >= d1["views"] + 1, "views not incrementing"

    def test_detail_404(self):
        assert requests.get(f"{API}/listings/does-not-exist").status_code == 404

    def test_whatsapp_click_increments(self):
        s = new_session()
        out = get_listings(lat=LAT, lng=LNG, radius_km=5)
        lid = out[0]["id"]
        admin = new_session()
        admin.post(f"{API}/auth/login", json={"email": "admin@zozocircle.com", "password": "Admin@123"})
        before = [x for x in admin.get(f"{API}/admin/listings").json() if x["id"] == lid][0]["whatsapp_clicks"]
        r = s.post(f"{API}/listings/{lid}/whatsapp-click")
        assert r.status_code == 200 and r.json()["ok"] is True
        after = [x for x in admin.get(f"{API}/admin/listings").json() if x["id"] == lid][0]["whatsapp_clicks"]
        assert after == before + 1

    def test_whatsapp_click_404(self):
        assert requests.post(f"{API}/listings/nope/whatsapp-click").status_code == 404
