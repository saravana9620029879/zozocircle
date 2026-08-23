import os
import uuid

import pytest
import requests
from dotenv import dotenv_values

frontend_env = dotenv_values("/app/frontend/.env")
base_url = os.environ.get("REACT_APP_BACKEND_URL") or frontend_env.get("REACT_APP_BACKEND_URL")
if not base_url:
    raise RuntimeError("REACT_APP_BACKEND_URL missing")
BASE_URL = base_url.rstrip("/")
API = f"{BASE_URL}/api"

ADMIN = {"email": "admin@zozocircle.com", "password": "Admin@123"}
SELLER1 = {"email": "seller1@zozocircle.com", "password": "Seller@123"}

# Koramangala / Indiranagar reference coords used by the frontend LOCALITIES list
KORAMANGALA = {"lat": 12.9352, "lng": 77.6245}


def new_session():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


def login(session, creds):
    r = session.post(f"{API}/auth/login", json=creds)
    if r.status_code != 200:
        pytest.fail(f"login failed for {creds['email']}: {r.status_code} {r.text[:300]}")
    token = r.json().get("token")
    if not token:
        pytest.fail("login response missing token")
    return token


@pytest.fixture(scope="session")
def api_url():
    return API


@pytest.fixture(scope="class")
def anon_client():
    return new_session()


@pytest.fixture(scope="class")
def admin_client():
    s = new_session()
    s.headers.update({"Authorization": f"Bearer {login(s, ADMIN)}"})
    s.cookies.clear()
    return s


@pytest.fixture(scope="class")
def customer_creds():
    return {
        "name": "TEST Customer",
        "email": f"TEST_cust_{uuid.uuid4().hex[:8]}@example.com",
        "password": "Cust@1234",
        "role": "customer",
    }


@pytest.fixture(scope="class")
def customer_client(customer_creds):
    s = new_session()
    r = s.post(f"{API}/auth/register", json=customer_creds)
    if r.status_code != 200:
        pytest.fail(f"customer register failed: {r.status_code} {r.text[:300]}")
    s.headers.update({"Authorization": f"Bearer {r.json()['token']}"})
    s.cookies.clear()
    return s
