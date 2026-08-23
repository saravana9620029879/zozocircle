# ZOZOCIRCLE — PRD

**Tagline:** Your local circle.
**Loop:** Customer location → nearby products/services → local seller → WhatsApp contact

## Original Problem Statement (condensed)
Build a production-ready, mobile-first hyperlocal marketplace PWA called ZOZOCIRCLE that helps customers
discover PRODUCTS and SERVICES from small businesses and individual sellers near them. Launch city:
Bangalore, architecture must support more cities. Real geolocation + Haversine distance, radius 1/2/5 km
(default 2 km), search, category filters, listing detail, saved favourites, WhatsApp as the only V1
transaction channel (pre-filled message, no internal chat/payments/delivery). Seller registration +
dashboard, admin approval dashboard, JWT auth with customer/seller/admin roles, MongoDB, PWA, ≥20
fictional Bangalore sellers as seed data. Explicitly out of scope: payments, delivery, chat, wallet,
coupons, subscriptions, ads, AI recommendations, jobs/events/property/social/forum, native apps.

**User choices:** cloud object storage for image uploads · JWT email/password for all 3 roles ·
seed data with some sellers/listings left pending for the admin approval demo · reference screenshots
supplied by the user as the visual direction (clean white, green accent, mobile marketplace cards).

## Architecture
- **Backend:** FastAPI (`/app/backend/server.py`), all routes under `/api`. JWT (HS256, 7-day) returned in
  body + httpOnly cookie; frontend uses `Authorization: Bearer`. Haversine distance computed in Python over
  active sellers/listings. Image uploads proxied to Emergent object storage, served back via `/api/files/{path}`.
- **DB (MongoDB, uuid string ids):** `users`, `sellers`, `listings`, `categories`, `favorites`, `files`.
  Indexes on users.email (unique), users.id, sellers.user_id, sellers.verification_status,
  listings.seller_id, listings(status,active), favorites(user_id,listing_id) unique.
- **Frontend:** React + Tailwind + shadcn, `AuthProvider` + `LocationProvider`, react-router.
  Pages: Home, Explore, ListingDetail, Saved, Account, Auth (login/register), SellerOnboard,
  SellerDashboard, SellerProfile, AddListing, AdminDashboard. Bottom nav: Home | Explore | + | Saved | Account.
- **PWA:** `manifest.json`, `sw.js` (app-shell cache, `/api` never cached), theme colour, installable.

## User personas
1. **Customer** — needs pickle/honey/cake/tailor/physio/yoga near home; browses by distance, contacts on WhatsApp.
2. **Home seller / small business** — lists products/services, keeps exact address private, gets WhatsApp enquiries.
3. **Admin** — approves/verifies sellers and listings, manages categories, watches stats.

## Core requirements (static)
Location-driven discovery · real Haversine distances · 1/2/5 km radius (default 2) · manual locality fallback ·
product/service-first cards · search across name/description/category/seller · listing detail with
WhatsApp CTA · address privacy (approximate distance only) · seller self-service · admin approval gate ·
role-based JWT auth · mobile-first responsive PWA.

## Implemented (2026-06)
- JWT auth for customer/seller/admin + role guards (401/403 enforced).
- Discovery API with radius, type, category, free-text search, max price, min rating, sort; real Haversine distances.
- Home (What's near you?, radius chips, category strip, Popular near you, Services near you), Explore
  (search + ALL/PRODUCTS/SERVICES tabs + filters panel), Listing detail (gallery, rating, reviews count,
  distance, price/unit, highlights, availability, seller card, privacy note).
- WhatsApp CTA as a real anchor with spec-exact pre-filled product/service message + click counter.
- Saved/favourites, location picker sheet (GPS + 10-locality manual fallback), radius persisted.
- Seller: onboarding profile, dashboard (views, WhatsApp clicks, status), add/edit/delete/activate listings,
  real image upload to object storage, profile editing. All new/edited listings go to `pending`.
- Admin: stats overview, seller approve/verify/reject/suspend, listing approve/reject/delete, category add/edit/disable, users list.
- Seed: 22 fictional Bangalore sellers, 24 listings with real photos, jittered coordinates; sellers 20–22 and
  their listings left **pending** for the approval demo.
- PWA manifest + service worker; mobile 390/430 and desktop verified.
- Tested by QA agent across 2 iterations: 78 backend tests passing, full customer/seller/admin loops verified.

## Backlog
**P1** — Reviews write-flow (schema + ratings exist, submission UI not built); DELETE endpoint for categories;
login brute-force lockout; per-city onboarding (city switcher beyond Bengaluru).
**P2** — Seller notification when a listing is approved; richer seller analytics; desktop-optimised layout;
split `server.py` into routers; category-chip scroll affordance on desktop.

## Next tasks
1. Customer review submission on listing detail (1–5 stars + text) feeding the existing rating fields.
2. City switcher so a second launch city can be enabled without code changes.
3. Seller "approved" notification + share-my-listing link.
