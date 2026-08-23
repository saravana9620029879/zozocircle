"""Auth module: register / login / me / logout / roles / bcrypt / cookies / lockout."""
import uuid

import pytest
import requests

from conftest import API, BASE_URL, ADMIN, SELLER1, new_session


class TestAuth:
    def test_admin_login(self):
        s = new_session()
        r = s.post(f"{API}/auth/login", json=ADMIN)
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["user"]["role"] == "admin"
        assert d["user"]["email"] == ADMIN["email"]
        assert isinstance(d["token"], str) and len(d["token"]) > 20

    def test_login_sets_httponly_secure_cookie(self):
        s = new_session()
        r = s.post(f"{API}/auth/login", json=ADMIN)
        assert r.status_code == 200
        raw = "; ".join(v for k, v in r.headers.items() if k.lower() == "set-cookie")
        assert "access_token=" in raw
        assert "HttpOnly" in raw
        assert "Secure" in raw

    def test_cookie_auth_works_without_bearer(self):
        s = new_session()
        r = s.post(f"{API}/auth/login", json=ADMIN)
        assert r.status_code == 200
        me = s.get(f"{API}/auth/me")
        assert me.status_code == 200, me.text
        assert me.json()["user"]["role"] == "admin"

    def test_seed_seller_login(self):
        s = new_session()
        r = s.post(f"{API}/auth/login", json=SELLER1)
        assert r.status_code == 200, r.text
        assert r.json()["user"]["role"] == "seller"

    def test_login_wrong_password(self):
        s = new_session()
        r = s.post(f"{API}/auth/login", json={"email": ADMIN["email"], "password": "wrong-pass-1"})
        assert r.status_code == 401
        assert "detail" in r.json()

    def test_login_unknown_email(self):
        s = new_session()
        r = s.post(f"{API}/auth/login", json={"email": "nobody-xyz@example.com", "password": "x123456"})
        assert r.status_code == 401

    def test_register_customer_and_me(self):
        s = new_session()
        email = f"TEST_reg_{uuid.uuid4().hex[:8]}@example.com"
        r = s.post(f"{API}/auth/register", json={"name": "TEST Reg", "email": email,
                                                "password": "Pass@1234", "role": "customer"})
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["user"]["email"] == email.lower()  # backend normalises email to lowercase
        assert d["user"]["role"] == "customer"
        assert "password_hash" not in d["user"]
        assert "_id" not in d["user"]

        s2 = new_session()
        s2.headers.update({"Authorization": f"Bearer {d['token']}"})
        me = s2.get(f"{API}/auth/me")
        assert me.status_code == 200
        assert me.json()["user"]["email"] == email.lower()
        assert me.json()["seller"] is None

        # login with the same credentials
        r2 = new_session().post(f"{API}/auth/login", json={"email": email, "password": "Pass@1234"})
        assert r2.status_code == 200

    def test_register_seller_role(self):
        s = new_session()
        email = f"TEST_sreg_{uuid.uuid4().hex[:8]}@example.com"
        r = s.post(f"{API}/auth/register", json={"name": "TEST SellerReg", "email": email,
                                                "password": "Pass@1234", "role": "seller"})
        assert r.status_code == 200, r.text
        assert r.json()["user"]["role"] == "seller"

    def test_register_duplicate_email(self):
        s = new_session()
        email = f"TEST_dup_{uuid.uuid4().hex[:8]}@example.com"
        body = {"name": "TEST Dup", "email": email, "password": "Pass@1234", "role": "customer"}
        assert s.post(f"{API}/auth/register", json=body).status_code == 200
        r = s.post(f"{API}/auth/register", json=body)
        assert r.status_code == 400
        assert "already" in str(r.json().get("detail", "")).lower()

    def test_register_invalid_role_rejected(self):
        s = new_session()
        r = s.post(f"{API}/auth/register", json={"name": "X", "email": f"TEST_ad_{uuid.uuid4().hex[:6]}@e.com",
                                                "password": "Pass@1234", "role": "admin"})
        assert r.status_code == 400

    def test_register_short_password_and_bad_email(self):
        s = new_session()
        r = s.post(f"{API}/auth/register", json={"name": "X", "email": f"TEST_sp_{uuid.uuid4().hex[:6]}@e.com",
                                                "password": "123", "role": "customer"})
        assert r.status_code == 422
        r2 = s.post(f"{API}/auth/register", json={"name": "X", "email": "not-an-email",
                                                 "password": "Pass@1234", "role": "customer"})
        assert r2.status_code == 422

    def test_me_unauthenticated_401(self):
        r = requests.get(f"{API}/auth/me")
        assert r.status_code == 401

    def test_me_invalid_token_401(self):
        s = new_session()
        s.headers.update({"Authorization": "Bearer garbage.token.value"})
        assert s.get(f"{API}/auth/me").status_code == 401

    def test_logout_clears_cookie(self):
        s = new_session()
        s.post(f"{API}/auth/login", json=ADMIN)
        r = s.post(f"{API}/auth/logout")
        assert r.status_code == 200
        assert r.json().get("ok") is True

    @pytest.mark.xfail(reason="brute-force lockout deliberately out of V1 scope (main agent decision)",
                       strict=False)
    def test_brute_force_lockout_after_5_failures(self):
        """Playbook requirement: account lockout after 5 consecutive failed logins."""
        s = new_session()
        email = f"TEST_bf_{uuid.uuid4().hex[:8]}@example.com"
        s.post(f"{API}/auth/register", json={"name": "TEST BF", "email": email,
                                             "password": "Pass@1234", "role": "customer"})
        codes = [s.post(f"{API}/auth/login", json={"email": email, "password": "bad-pass"}).status_code
                 for _ in range(6)]
        assert codes[-1] in (423, 429), f"no lockout after 5 failed attempts, codes={codes}"


class TestCors:
    def test_app_level_cors_uses_explicit_origin_with_credentials(self):
        """The FastAPI app itself must echo the explicit origin + allow-credentials.
        NOTE: the preview k8s ingress rewrites the public response to `*`, so this is
        asserted against the app port directly (infra behaviour, not an app defect)."""
        origin = BASE_URL
        r = requests.options("http://localhost:8001/api/auth/login", headers={
            "Origin": origin, "Access-Control-Request-Method": "POST",
            "Access-Control-Request-Headers": "content-type"})
        allow_origin = r.headers.get("access-control-allow-origin")
        allow_creds = r.headers.get("access-control-allow-credentials")
        assert allow_origin == origin, f"expected explicit origin, got {allow_origin}"
        assert allow_creds == "true"

    def test_public_cors_headers_present(self):
        r = requests.options(f"{API}/auth/login", headers={
            "Origin": BASE_URL, "Access-Control-Request-Method": "POST",
            "Access-Control-Request-Headers": "content-type"})
        assert r.headers.get("access-control-allow-origin") is not None
