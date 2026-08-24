import os
from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

import logging
import math
import re
import secrets
import uuid
import bcrypt
import jwt
import requests
from datetime import datetime, timezone, timedelta
from typing import List, Optional

from fastapi import FastAPI, APIRouter, HTTPException, Depends, Request, UploadFile, File, Response, Query
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, EmailStr, Field

from seed_data import CATEGORIES, SELLERS
from msg91 import send_otp_sms, SmsNotConfigured, SmsSendFailed

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("zozocircle")

client = AsyncIOMotorClient(os.environ['MONGO_URL'])
db = client[os.environ['DB_NAME']]

JWT_SECRET = os.environ['JWT_SECRET']
JWT_ALGORITHM = "HS256"
OTP_TTL = int(os.environ.get("OTP_TTL_SECONDS", 300))
OTP_MAX_ATTEMPTS = int(os.environ.get("OTP_MAX_ATTEMPTS", 5))
OTP_RESEND_COOLDOWN = int(os.environ.get("OTP_RESEND_COOLDOWN_SECONDS", 30))
OTP_MAX_SENDS_PER_HOUR = int(os.environ.get("OTP_MAX_SENDS_PER_HOUR", 5))
INDIAN_MOBILE = re.compile(r"^[6-9]\d{9}$")
APP_NAME = "zozocircle"
STORAGE_BASE = (os.environ.get("INTEGRATION_PROXY_URL") or "").strip() or "https://integrations.emergentagent.com"
STORAGE_URL = STORAGE_BASE.rstrip("/") + "/objstore/api/v1/storage"
EMERGENT_KEY = os.environ.get("EMERGENT_LLM_KEY")
storage_key = None

app = FastAPI(title="ZOZOCIRCLE API")
api = APIRouter(prefix="/api")
bearer = HTTPBearer(auto_error=False)


# ---------- helpers ----------
def now_iso():
    return datetime.now(timezone.utc).isoformat()


def hash_password(p: str) -> str:
    return bcrypt.hashpw(p.encode(), bcrypt.gensalt()).decode()


def verify_password(p: str, h: str) -> bool:
    try:
        return bcrypt.checkpw(p.encode(), h.encode())
    except Exception:
        return False


def create_access_token(user_id: str, email: str, role: str) -> str:
    payload = {"sub": user_id, "email": email, "role": role,
               "exp": datetime.now(timezone.utc) + timedelta(days=7), "type": "access"}
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def haversine_m(lat1, lng1, lat2, lng2) -> float:
    R = 6371000.0
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dp = p2 - p1
    dl = math.radians(lng2 - lng1)
    a = math.sin(dp / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    return 2 * R * math.asin(math.sqrt(a))


async def get_current_user(request: Request, cred: Optional[HTTPAuthorizationCredentials] = Depends(bearer)):
    token = cred.credentials if cred else request.cookies.get("access_token")
    if not token:
        raise HTTPException(401, "Not authenticated")
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    except jwt.ExpiredSignatureError:
        raise HTTPException(401, "Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(401, "Invalid token")
    user = await db.users.find_one({"id": payload["sub"]}, {"_id": 0, "password_hash": 0})
    if not user:
        raise HTTPException(401, "User not found")
    return user


async def require_seller(user=Depends(get_current_user)):
    if user["role"] not in ("seller", "admin"):
        raise HTTPException(403, "Seller access required")
    return user


async def require_admin(user=Depends(get_current_user)):
    if user["role"] != "admin":
        raise HTTPException(403, "Admin access required")
    return user


def normalize_mobile(raw: str) -> str:
    """Return a 10-digit Indian mobile number, or raise 400."""
    digits = re.sub(r"\D", "", raw or "")
    if digits.startswith("0") and len(digits) == 11:
        digits = digits[1:]
    if digits.startswith("91") and len(digits) == 12:
        digits = digits[2:]
    if not INDIAN_MOBILE.match(digits):
        raise HTTPException(400, "Enter a valid 10-digit Indian mobile number")
    return digits


def hash_otp(phone: str, otp: str) -> str:
    return bcrypt.hashpw(f"{phone}:{otp}".encode(), bcrypt.gensalt()).decode()


def verify_otp_hash(phone: str, otp: str, otp_hash: str) -> bool:
    try:
        return bcrypt.checkpw(f"{phone}:{otp}".encode(), otp_hash.encode())
    except Exception:
        return False


async def notify(user_id: str, title: str, body: str, listing_id: Optional[str] = None):
    await db.notifications.insert_one({
        "id": str(uuid.uuid4()), "user_id": user_id, "title": title, "body": body,
        "listing_id": listing_id, "read": False, "created_at": now_iso(),
    })


def init_storage(force: bool = False):
    global storage_key
    if storage_key and not force:
        return storage_key
    r = requests.post(f"{STORAGE_URL}/init", json={"emergent_key": EMERGENT_KEY}, timeout=30)
    r.raise_for_status()
    storage_key = r.json()["storage_key"]
    return storage_key


# ---------- models ----------
class OtpRequestIn(BaseModel):
    phone: str
    name: Optional[str] = None


class OtpVerifyIn(BaseModel):
    phone: str
    otp: str = Field(min_length=4, max_length=8)
    name: Optional[str] = None
    role: str = "customer"


class AdminLoginIn(BaseModel):
    email: EmailStr
    password: str


class SellerIn(BaseModel):
    full_name: str
    business_name: str
    phone: str
    whatsapp_number: str
    business_type: str = "product"
    categories: List[str] = []
    description: str = ""
    locality: str
    city: str = "Bengaluru"
    lat: float
    lng: float
    service_radius_km: float = 5
    operating_hours: str = "9:00 AM - 8:00 PM"
    logo_url: Optional[str] = None


class ListingIn(BaseModel):
    type: str = "product"
    name: str
    category: str
    description: str = ""
    price: float
    unit: str = ""
    images: List[str] = []
    availability: str = "Available"
    highlights: List[str] = []


class CategoryIn(BaseModel):
    name: str
    slug: str
    icon: str = "Tag"
    applies_to: str = "both"
    active: bool = True


# ---------- auth (OTP for customers & sellers, password for admin only) ----------
def issue_session(user: dict, response: Response) -> dict:
    token = create_access_token(user["id"], user.get("email") or user.get("phone") or "", user["role"])
    response.set_cookie("access_token", token, httponly=True, secure=True, samesite="none", max_age=604800, path="/")
    return {
        "user": {"id": user["id"], "name": user["name"], "email": user.get("email"),
                 "phone": user.get("phone"), "role": user["role"]},
        "token": token,
    }


@api.post("/auth/otp/request")
async def request_otp(body: OtpRequestIn):
    phone = normalize_mobile(body.phone)
    now = datetime.now(timezone.utc)
    rec = await db.otp_requests.find_one({"phone": phone})

    if rec:
        last_sent = datetime.fromisoformat(rec["last_sent_at"])
        wait = OTP_RESEND_COOLDOWN - int((now - last_sent).total_seconds())
        if wait > 0:
            raise HTTPException(429, f"Please wait {wait}s before requesting another OTP")
        window_start = datetime.fromisoformat(rec["window_start"])
        if (now - window_start).total_seconds() < 3600 and rec.get("sends_in_window", 0) >= OTP_MAX_SENDS_PER_HOUR:
            raise HTTPException(429, "Too many OTP requests. Please try again after some time")

    otp = f"{secrets.randbelow(1000000):06d}"
    try:
        send_otp_sms(f"91{phone}", otp)
    except SmsNotConfigured:
        logger.error("OTP send blocked: MSG91 not fully configured")
        raise HTTPException(503, "SMS service is not configured yet. Please contact support")
    except SmsSendFailed:
        raise HTTPException(502, "Could not send OTP right now. Please try again")

    fresh_window = (not rec) or (now - datetime.fromisoformat(rec["window_start"])).total_seconds() >= 3600
    await db.otp_requests.update_one(
        {"phone": phone},
        {"$set": {
            "phone": phone,
            "otp_hash": hash_otp(phone, otp),
            "expires_at": (now + timedelta(seconds=OTP_TTL)).isoformat(),
            "attempts": 0,
            "last_sent_at": now.isoformat(),
            "window_start": now.isoformat() if fresh_window else rec["window_start"],
            "sends_in_window": 1 if fresh_window else rec.get("sends_in_window", 0) + 1,
            "pending_name": (body.name or "").strip() or None,
        }},
        upsert=True,
    )
    return {"sent": True, "phone": phone, "expires_in": OTP_TTL, "resend_in": OTP_RESEND_COOLDOWN}


@api.post("/auth/otp/verify")
async def verify_otp(body: OtpVerifyIn, response: Response):
    phone = normalize_mobile(body.phone)
    rec = await db.otp_requests.find_one({"phone": phone})
    if not rec:
        raise HTTPException(400, "Please request an OTP first")
    if datetime.now(timezone.utc) > datetime.fromisoformat(rec["expires_at"]):
        await db.otp_requests.delete_one({"phone": phone})
        raise HTTPException(400, "OTP has expired. Please request a new one")
    if rec.get("attempts", 0) >= OTP_MAX_ATTEMPTS:
        raise HTTPException(429, "Too many incorrect attempts. Please request a new OTP")
    if not verify_otp_hash(phone, body.otp.strip(), rec["otp_hash"]):
        await db.otp_requests.update_one({"phone": phone}, {"$inc": {"attempts": 1}})
        left = OTP_MAX_ATTEMPTS - (rec.get("attempts", 0) + 1)
        raise HTTPException(401, f"Incorrect OTP. {left} attempt(s) left" if left > 0
                            else "Incorrect OTP. Please request a new one")

    await db.otp_requests.delete_one({"phone": phone})
    user = await db.users.find_one({"phone": phone})
    is_new = False

    if not user:
        # Link an existing seller profile registered with this number (keeps role/listings/data).
        seller = await db.sellers.find_one({"$or": [{"phone": {"$regex": f"{phone}$"}},
                                                    {"whatsapp_number": {"$regex": f"{phone}$"}}]})
        if seller:
            await db.users.update_one({"id": seller["user_id"]}, {"$set": {"phone": phone}})
            user = await db.users.find_one({"id": seller["user_id"]})

    if not user:
        role = body.role if body.role in ("customer", "seller") else "customer"
        name = (body.name or rec.get("pending_name") or "").strip() or f"ZOZO {phone[-4:]}"
        user = {"id": str(uuid.uuid4()), "name": name, "phone": phone, "email": None,
                "role": role, "created_at": now_iso()}
        await db.users.insert_one(dict(user))
        is_new = True

    seller = await db.sellers.find_one({"user_id": user["id"]}, {"_id": 0})
    out = issue_session(user, response)
    out["is_new_user"] = is_new
    out["has_seller_profile"] = bool(seller)
    return out


@api.post("/auth/admin/login")
async def admin_login(body: AdminLoginIn, response: Response):
    email = body.email.lower()
    user = await db.users.find_one({"email": email})
    if not user or user.get("role") != "admin" or not user.get("password_hash") \
            or not verify_password(body.password, user["password_hash"]):
        raise HTTPException(401, "Invalid admin credentials")
    return issue_session(user, response)


@api.get("/auth/me")
async def me(user=Depends(get_current_user)):
    seller = await db.sellers.find_one({"user_id": user["id"]}, {"_id": 0})
    return {"user": user, "seller": seller}


@api.post("/auth/logout")
async def logout(response: Response):
    response.delete_cookie("access_token", path="/")
    return {"ok": True}


# ---------- categories ----------
@api.get("/categories")
async def list_categories():
    return await db.categories.find({"active": True}, {"_id": 0}).to_list(200)


# ---------- discovery ----------
def public_listing(l, seller, distance_m=None):
    return {
        "id": l["id"], "type": l["type"], "name": l["name"], "category": l["category"],
        "description": l.get("description", ""), "price": l["price"], "unit": l.get("unit", ""),
        "images": l.get("images") or [], "availability": l.get("availability", "Available"),
        "highlights": l.get("highlights") or [], "rating": l.get("rating", 0),
        "review_count": l.get("review_count", 0), "views": l.get("views", 0),
        "distance_m": round(distance_m) if distance_m is not None else None,
        "seller": {
            "id": seller["id"], "business_name": seller["business_name"],
            "locality": seller["locality"], "city": seller.get("city", "Bengaluru"),
            "verified": seller.get("verification_status") == "verified",
            "operating_hours": seller.get("operating_hours", ""),
            "description": seller.get("description", ""),
            "logo_url": seller.get("logo_url"),
            "business_type": seller.get("business_type", "product"),
        },
    }


@api.get("/listings")
async def listings(
    lat: Optional[float] = None, lng: Optional[float] = None,
    radius_km: float = 2, type: Optional[str] = None, category: Optional[str] = None,
    q: Optional[str] = None, min_rating: Optional[float] = None,
    max_price: Optional[float] = None, sort: str = "distance", limit: int = 100,
):
    active_sellers = {s["id"]: s for s in await db.sellers.find(
        {"verification_status": {"$in": ["approved", "verified"]}}, {"_id": 0}).to_list(1000)}
    query = {"status": "approved", "active": True, "seller_id": {"$in": list(active_sellers.keys())}}
    if type in ("product", "service"):
        query["type"] = type
    if category and category != "all":
        query["category"] = category
    if min_rating:
        query["rating"] = {"$gte": min_rating}
    if max_price:
        query["price"] = {"$lte": max_price}
    docs = await db.listings.find(query, {"_id": 0}).to_list(2000)

    if q:
        term = q.lower().strip()
        def matches(l):
            s = active_sellers[l["seller_id"]]
            blob = " ".join([l["name"], l.get("description", ""), l["category"],
                             s["business_name"], " ".join(l.get("highlights") or []),
                             s.get("description", "")]).lower()
            return term in blob
        docs = [l for l in docs if matches(l)]

    out = []
    for l in docs:
        s = active_sellers[l["seller_id"]]
        d = haversine_m(lat, lng, s["lat"], s["lng"]) if lat is not None and lng is not None else None
        if d is not None and d > radius_km * 1000:
            continue
        out.append(public_listing(l, s, d))

    if sort == "price_low":
        out.sort(key=lambda x: x["price"])
    elif sort == "price_high":
        out.sort(key=lambda x: -x["price"])
    elif sort == "rating":
        out.sort(key=lambda x: -x["rating"])
    else:
        out.sort(key=lambda x: (x["distance_m"] is None, x["distance_m"] or 0))
    return out[:limit]


@api.get("/listings/{listing_id}")
async def listing_detail(listing_id: str, lat: Optional[float] = None, lng: Optional[float] = None):
    l = await db.listings.find_one({"id": listing_id}, {"_id": 0})
    if not l:
        raise HTTPException(404, "Listing not found")
    s = await db.sellers.find_one({"id": l["seller_id"]}, {"_id": 0})
    if not s:
        raise HTTPException(404, "Seller not found")
    await db.listings.update_one({"id": listing_id}, {"$inc": {"views": 1}})
    d = haversine_m(lat, lng, s["lat"], s["lng"]) if lat is not None and lng is not None else None
    data = public_listing(l, s, d)
    data["whatsapp_number"] = s["whatsapp_number"]
    return data


@api.post("/listings/{listing_id}/whatsapp-click")
async def whatsapp_click(listing_id: str):
    r = await db.listings.update_one({"id": listing_id}, {"$inc": {"whatsapp_clicks": 1}})
    if r.matched_count == 0:
        raise HTTPException(404, "Listing not found")
    return {"ok": True}


# ---------- favorites ----------
@api.get("/favorites")
async def get_favorites(lat: Optional[float] = None, lng: Optional[float] = None, user=Depends(get_current_user)):
    favs = await db.favorites.find({"user_id": user["id"]}, {"_id": 0}).to_list(500)
    ids = [f["listing_id"] for f in favs]
    docs = await db.listings.find({"id": {"$in": ids}}, {"_id": 0}).to_list(500)
    out = []
    for l in docs:
        s = await db.sellers.find_one({"id": l["seller_id"]}, {"_id": 0})
        if not s:
            continue
        d = haversine_m(lat, lng, s["lat"], s["lng"]) if lat is not None and lng is not None else None
        out.append(public_listing(l, s, d))
    return out


@api.post("/favorites/{listing_id}")
async def add_favorite(listing_id: str, user=Depends(get_current_user)):
    if not await db.listings.find_one({"id": listing_id}):
        raise HTTPException(404, "Listing not found")
    await db.favorites.update_one({"user_id": user["id"], "listing_id": listing_id},
                                  {"$set": {"created_at": now_iso()}}, upsert=True)
    return {"ok": True, "saved": True}


@api.delete("/favorites/{listing_id}")
async def remove_favorite(listing_id: str, user=Depends(get_current_user)):
    await db.favorites.delete_one({"user_id": user["id"], "listing_id": listing_id})
    return {"ok": True, "saved": False}


# ---------- uploads ----------
@api.post("/upload")
async def upload(file: UploadFile = File(...), user=Depends(get_current_user)):
    data = await file.read()
    if len(data) > 8 * 1024 * 1024:
        raise HTTPException(400, "File too large (max 8MB)")
    ctype = file.content_type or "application/octet-stream"
    if not ctype.startswith("image/"):
        raise HTTPException(400, "Only images allowed")
    ext = (file.filename or "img.jpg").rsplit(".", 1)[-1].lower()
    path = f"{APP_NAME}/uploads/{user['id']}/{uuid.uuid4()}.{ext}"
    try:
        r = requests.put(f"{STORAGE_URL}/objects/{path}",
                         headers={"X-Storage-Key": init_storage(), "Content-Type": ctype},
                         data=data, timeout=120)
        if r.status_code == 404:
            r = requests.put(f"{STORAGE_URL}/objects/{path}",
                             headers={"X-Storage-Key": init_storage(force=True), "Content-Type": ctype},
                             data=data, timeout=120)
        r.raise_for_status()
        stored = r.json()["path"]
    except Exception as e:
        logger.error(f"upload failed: {e}")
        raise HTTPException(502, "Image upload failed")
    await db.files.insert_one({"id": str(uuid.uuid4()), "storage_path": stored, "content_type": ctype,
                              "original_filename": file.filename, "is_deleted": False,
                              "user_id": user["id"], "created_at": now_iso()})
    return {"url": f"/api/files/{stored}"}


@api.get("/files/{path:path}")
async def get_file(path: str):
    rec = await db.files.find_one({"storage_path": path, "is_deleted": False})
    if not rec:
        raise HTTPException(404, "File not found")
    r = requests.get(f"{STORAGE_URL}/objects/{path}", headers={"X-Storage-Key": init_storage()}, timeout=60)
    if r.status_code == 404:
        r = requests.get(f"{STORAGE_URL}/objects/{path}", headers={"X-Storage-Key": init_storage(force=True)}, timeout=60)
    if r.status_code != 200:
        raise HTTPException(404, "File not found")
    return Response(content=r.content, media_type=rec.get("content_type", "image/jpeg"),
                    headers={"Cache-Control": "public, max-age=86400"})


# ---------- seller ----------
@api.post("/seller/profile")
async def create_seller(body: SellerIn, user=Depends(get_current_user)):
    if await db.sellers.find_one({"user_id": user["id"]}):
        raise HTTPException(400, "Seller profile already exists")
    seller = body.model_dump()
    seller["lat"] += (hash(user["id"]) % 7 - 3) * 0.0032
    seller["lng"] += (hash(user["id"]) % 5 - 2) * 0.0036
    seller.update({"id": str(uuid.uuid4()), "user_id": user["id"], "verification_status": "pending",
                   "created_at": now_iso()})
    await db.sellers.insert_one(dict(seller))
    await db.users.update_one({"id": user["id"]}, {"$set": {"role": "seller"}})
    seller.pop("_id", None)
    return seller


@api.put("/seller/profile")
async def update_seller(body: SellerIn, user=Depends(require_seller)):
    s = await db.sellers.find_one({"user_id": user["id"]})
    if not s:
        raise HTTPException(404, "No seller profile")
    await db.sellers.update_one({"id": s["id"]}, {"$set": body.model_dump()})
    return await db.sellers.find_one({"id": s["id"]}, {"_id": 0})


@api.get("/seller/listings")
async def seller_listings(user=Depends(require_seller)):
    s = await db.sellers.find_one({"user_id": user["id"]}, {"_id": 0})
    if not s:
        raise HTTPException(404, "No seller profile")
    docs = await db.listings.find({"seller_id": s["id"]}, {"_id": 0}).sort("created_at", -1).to_list(500)
    return {"seller": s, "listings": docs}


@api.post("/seller/listings")
async def create_listing(body: ListingIn, user=Depends(require_seller)):
    s = await db.sellers.find_one({"user_id": user["id"]})
    if not s:
        raise HTTPException(404, "No seller profile")
    l = body.model_dump()
    l.update({"id": str(uuid.uuid4()), "seller_id": s["id"], "status": "pending", "active": True,
              "rating": 0, "review_count": 0, "views": 0, "whatsapp_clicks": 0, "created_at": now_iso()})
    await db.listings.insert_one(dict(l))
    l.pop("_id", None)
    return l


@api.put("/seller/listings/{listing_id}")
async def edit_listing(listing_id: str, body: ListingIn, user=Depends(require_seller)):
    s = await db.sellers.find_one({"user_id": user["id"]})
    l = await db.listings.find_one({"id": listing_id, "seller_id": s["id"] if s else None})
    if not l:
        raise HTTPException(404, "Listing not found")
    await db.listings.update_one({"id": listing_id}, {"$set": {**body.model_dump(), "status": "pending"}})
    return await db.listings.find_one({"id": listing_id}, {"_id": 0})


@api.patch("/seller/listings/{listing_id}/active")
async def toggle_listing(listing_id: str, user=Depends(require_seller)):
    s = await db.sellers.find_one({"user_id": user["id"]})
    l = await db.listings.find_one({"id": listing_id, "seller_id": s["id"] if s else None})
    if not l:
        raise HTTPException(404, "Listing not found")
    await db.listings.update_one({"id": listing_id}, {"$set": {"active": not l.get("active", True)}})
    return {"active": not l.get("active", True)}


@api.delete("/seller/listings/{listing_id}")
async def delete_listing(listing_id: str, user=Depends(require_seller)):
    s = await db.sellers.find_one({"user_id": user["id"]})
    r = await db.listings.delete_one({"id": listing_id, "seller_id": s["id"] if s else None})
    if r.deleted_count == 0:
        raise HTTPException(404, "Listing not found")
    return {"ok": True}


# ---------- notifications ----------
@api.get("/notifications")
async def get_notifications(user=Depends(get_current_user)):
    items = await db.notifications.find({"user_id": user["id"]}, {"_id": 0}).sort("created_at", -1).to_list(100)
    return {"items": items, "unread": sum(1 for i in items if not i.get("read"))}


@api.post("/notifications/read-all")
async def read_all_notifications(user=Depends(get_current_user)):
    await db.notifications.update_many({"user_id": user["id"], "read": False}, {"$set": {"read": True}})
    return {"ok": True}


# ---------- admin ----------
@api.get("/admin/stats")
async def admin_stats(user=Depends(require_admin)):
    clicks = await db.listings.aggregate([{"$group": {"_id": None, "t": {"$sum": "$whatsapp_clicks"}}}]).to_list(1)
    return {
        "total_sellers": await db.sellers.count_documents({}),
        "total_listings": await db.listings.count_documents({}),
        "active_listings": await db.listings.count_documents({"status": "approved", "active": True}),
        "pending_listings": await db.listings.count_documents({"status": "pending"}),
        "pending_sellers": await db.sellers.count_documents({"verification_status": "pending"}),
        "total_users": await db.users.count_documents({}),
        "whatsapp_clicks": (clicks[0]["t"] if clicks else 0) or 0,
    }


@api.get("/admin/sellers")
async def admin_sellers(status: Optional[str] = None, user=Depends(require_admin)):
    q = {"verification_status": status} if status and status != "all" else {}
    return await db.sellers.find(q, {"_id": 0}).sort("created_at", -1).to_list(500)


@api.patch("/admin/sellers/{seller_id}/status")
async def set_seller_status(seller_id: str, status: str = Query(...), user=Depends(require_admin)):
    if status not in ("approved", "rejected", "suspended", "verified", "pending"):
        raise HTTPException(400, "Invalid status")
    s = await db.sellers.find_one({"id": seller_id})
    if not s:
        raise HTTPException(404, "Seller not found")
    await db.sellers.update_one({"id": seller_id}, {"$set": {"verification_status": status}})
    texts = {
        "approved": ("Your business was approved", "Your business is live on ZOZOCIRCLE. Nearby customers can now find your listings."),
        "verified": ("Your business is verified", "You now have a verified badge on your listings."),
        "rejected": ("Your business was not approved", "Please review your business details and submit again."),
        "suspended": ("Your business was suspended", "Your listings are hidden. Contact ZOZOCIRCLE support for details."),
        "pending": ("Your business is under review", "We are reviewing your business details."),
    }
    title, body = texts[status]
    await notify(s["user_id"], title, body)
    return {"ok": True, "status": status}


@api.get("/admin/listings")
async def admin_listings(status: Optional[str] = None, user=Depends(require_admin)):
    q = {"status": status} if status and status != "all" else {}
    docs = await db.listings.find(q, {"_id": 0}).sort("created_at", -1).to_list(1000)
    sellers = {s["id"]: s for s in await db.sellers.find({}, {"_id": 0}).to_list(1000)}
    for d in docs:
        s = sellers.get(d["seller_id"], {})
        d["seller_name"] = s.get("business_name", "Unknown")
        d["seller_locality"] = s.get("locality", "")
    return docs


@api.patch("/admin/listings/{listing_id}/status")
async def set_listing_status(listing_id: str, status: str = Query(...), user=Depends(require_admin)):
    if status not in ("approved", "rejected", "pending"):
        raise HTTPException(400, "Invalid status")
    l = await db.listings.find_one({"id": listing_id})
    if not l:
        raise HTTPException(404, "Listing not found")
    await db.listings.update_one({"id": listing_id}, {"$set": {"status": status}})
    s = await db.sellers.find_one({"id": l["seller_id"]})
    if s:
        texts = {
            "approved": (f"“{l['name']}” is approved", "It is now live and can be discovered by nearby customers."),
            "rejected": (f"“{l['name']}” was not approved", "Please review the details or photos and submit again."),
            "pending": (f"“{l['name']}” is under review", "We will let you know once it is approved."),
        }
        title, body = texts[status]
        await notify(s["user_id"], title, body, listing_id)
    return {"ok": True, "status": status}


@api.delete("/admin/listings/{listing_id}")
async def admin_delete_listing(listing_id: str, user=Depends(require_admin)):
    r = await db.listings.delete_one({"id": listing_id})
    if r.deleted_count == 0:
        raise HTTPException(404, "Listing not found")
    return {"ok": True}


@api.get("/admin/categories")
async def admin_categories(user=Depends(require_admin)):
    return await db.categories.find({}, {"_id": 0}).to_list(200)


@api.post("/admin/categories")
async def add_category(body: CategoryIn, user=Depends(require_admin)):
    if await db.categories.find_one({"slug": body.slug}):
        raise HTTPException(400, "Slug already exists")
    doc = {**body.model_dump(), "id": str(uuid.uuid4())}
    await db.categories.insert_one(dict(doc))
    doc.pop("_id", None)
    return doc


@api.put("/admin/categories/{slug}")
async def edit_category(slug: str, body: CategoryIn, user=Depends(require_admin)):
    r = await db.categories.update_one({"slug": slug}, {"$set": body.model_dump()})
    if r.matched_count == 0:
        raise HTTPException(404, "Category not found")
    return await db.categories.find_one({"slug": slug}, {"_id": 0})


@api.get("/admin/users")
async def admin_users(user=Depends(require_admin)):
    return await db.users.find({}, {"_id": 0, "password_hash": 0}).sort("created_at", -1).to_list(500)


# ---------- startup ----------
async def seed():
    await db.users.create_index("email", unique=True, sparse=True)
    await db.users.create_index("phone", unique=True, sparse=True)
    await db.users.create_index("id")
    await db.otp_requests.create_index("phone", unique=True)
    await db.sellers.create_index("user_id")
    await db.sellers.create_index("verification_status")
    await db.listings.create_index("seller_id")
    await db.listings.create_index([("status", 1), ("active", 1)])
    await db.favorites.create_index([("user_id", 1), ("listing_id", 1)], unique=True)
    await db.notifications.create_index([("user_id", 1), ("created_at", -1)])

    admin_email = os.environ["ADMIN_EMAIL"].lower()
    admin_pw = os.environ["ADMIN_PASSWORD"]
    existing = await db.users.find_one({"email": admin_email})
    if not existing:
        await db.users.insert_one({"id": str(uuid.uuid4()), "name": "ZOZOCIRCLE Admin", "email": admin_email,
                                   "role": "admin", "password_hash": hash_password(admin_pw),
                                   "created_at": now_iso()})
    elif not verify_password(admin_pw, existing["password_hash"]):
        await db.users.update_one({"email": admin_email}, {"$set": {"password_hash": hash_password(admin_pw)}})

    for c in CATEGORIES:
        await db.categories.update_one({"slug": c["slug"]},
                                       {"$setOnInsert": {**c, "id": str(uuid.uuid4()), "active": True}}, upsert=True)

    if await db.sellers.count_documents({}) > 0:
        return

    for idx, (biz, owner, locality, lat, lng, btype, cat, vstatus, desc, items) in enumerate(SELLERS):
        email = f"seller{idx + 1}@zozocircle.com"
        uid = str(uuid.uuid4())
        await db.users.insert_one({"id": uid, "name": owner, "email": email, "role": "seller",
                                   "password_hash": hash_password("Seller@123"), "created_at": now_iso()})
        sid = str(uuid.uuid4())
        jlat = lat + ((idx % 5) - 2) * 0.0035
        jlng = lng + ((idx % 3) - 1) * 0.004
        await db.sellers.insert_one({
            "id": sid, "user_id": uid, "full_name": owner, "business_name": biz,
            "phone": f"+9198{45000000 + idx * 1237}", "whatsapp_number": f"+9198{45000000 + idx * 1237}",
            "business_type": btype, "categories": [cat], "description": desc, "locality": locality,
            "city": "Bengaluru", "lat": jlat, "lng": jlng, "service_radius_km": 5,
            "operating_hours": "9:00 AM - 8:00 PM", "logo_url": None,
            "verification_status": vstatus, "created_at": now_iso()})
        for (ltype, lname, lcat, price, unit, ldesc, imgs, rating, rc, lstatus, highlights) in items:
            await db.listings.insert_one({
                "id": str(uuid.uuid4()), "seller_id": sid, "type": ltype, "name": lname, "category": lcat,
                "description": ldesc, "price": price, "unit": unit, "images": imgs,
                "availability": "Available", "highlights": highlights, "status": lstatus, "active": True,
                "rating": rating, "review_count": rc, "views": 0, "whatsapp_clicks": 0,
                "created_at": now_iso()})
    logger.info("Seeded ZOZOCIRCLE demo data")


@app.on_event("startup")
async def on_start():
    await seed()
    try:
        init_storage()
    except Exception as e:
        logger.error(f"storage init failed: {e}")


@app.on_event("shutdown")
async def on_stop():
    client.close()


app.include_router(api)
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)
