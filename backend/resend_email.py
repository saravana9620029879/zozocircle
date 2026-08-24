"""OTP email delivery via Emergent's managed email integration.

The email key and the OTP value are never logged or returned.
"""
import os
import re
import ipaddress
import logging
import httpx
from html import escape
from html.parser import HTMLParser
from urllib.parse import urlparse

logger = logging.getLogger("zozocircle.email")

# Emergent managed email proxy. Constant on purpose - must survive deployment.
EMAIL_BASE_URL = "https://integrations.emergentagent.com"


class EmailNotConfigured(Exception):
    pass


class EmailSendFailed(Exception):
    pass


_SHORTENERS = ("bit.ly", "tinyurl.com", "t.co", "is.gd", "cutt.ly", "goo.gl", "rebrand.ly")
_CRED_ASK = ("reply with your password", "reply with the code", "send your password", "cvv",
             "send us your password", "enter your password below", "confirm your card number",
             "your full card number", "seed phrase", "recovery phrase", "verify your card",
             "social security number", "confirm your bank details")
_HOSTISH = re.compile(r"\b(?:https?://)?((?:[a-z0-9-]+\.)+[a-z]{2,})", re.I)


def _host_ok(host: str) -> bool:
    if not host or "xn--" in host:
        return False
    try:
        ipaddress.ip_address(host)
        return False
    except ValueError:
        pass
    return not any(host == s or host.endswith("." + s) for s in _SHORTENERS)


def _same_site(shown: str, real: str) -> bool:
    return shown == real or real.endswith("." + shown) or shown.endswith("." + real)


class _EmailScan(HTMLParser):
    def __init__(self):
        super().__init__()
        self.tags, self.urls, self.anchors = set(), [], []
        self._href, self._text = None, []

    def handle_starttag(self, tag, attrs):
        self.tags.add(tag.lower())
        self.urls += [v for k, v in attrs if k.lower() in ("href", "src") and v]
        if tag.lower() == "a":
            self._href = dict((k.lower(), v) for k, v in attrs).get("href")
            self._text = []

    def handle_data(self, data):
        if self._href is not None:
            self._text.append(data)

    def handle_endtag(self, tag):
        if tag.lower() == "a" and self._href is not None:
            self.anchors.append((self._href, "".join(self._text)))
            self._href, self._text = None, []


def _assert_safe_email(subject: str, html: str) -> None:
    scan = _EmailScan()
    scan.feed(html)
    if scan.tags & {"form", "input", "textarea", "select"}:
        raise ValueError("No forms or input fields in email (G2)")
    body = f"{subject}\n{html}".lower()
    for p in _CRED_ASK:
        if p in body:
            raise ValueError(f"Email asks the recipient for credentials: {p!r} (G2)")
    for url in scan.urls:
        low = url.strip().lower()
        if low.startswith(("mailto:", "tel:", "cid:", "#")):
            continue
        if not low.startswith("https://"):
            raise ValueError(f"Email links/assets must be absolute https: {url!r} (G3)")
        host = urlparse(low).hostname or ""
        if not _host_ok(host) or urlparse(low).username is not None:
            raise ValueError(f"Shortened, numeric-host or credential-bearing URL: {url!r} (G3)")
    for href, text in scan.anchors:
        real = urlparse(href.strip().lower()).hostname or ""
        if not real:
            continue
        for m in _HOSTISH.finditer(text):
            if not _same_site(m.group(1).lower(), real):
                raise ValueError(f"Anchor text {m.group(1)!r} != real link host {real!r} (G3)")


async def _send_email(*, to: str, subject: str, html: str) -> None:
    _assert_safe_email(subject, html)
    key = (os.environ.get("EMERGENT_EMAIL_KEY") or "").strip()
    from_name = (os.environ.get("EMAIL_FROM_NAME") or "").strip()
    if not key or not from_name:
        raise EmailNotConfigured("Email integration is not configured")

    payload = {"to": [to], "subject": subject, "html": html, "from_name": from_name}
    reply_to = (os.environ.get("EMAIL_REPLY_TO") or "").strip()
    if reply_to:
        payload["contact_email"] = reply_to

    try:
        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.post(
                f"{EMAIL_BASE_URL}/api/v1/email/send",
                headers={"X-Email-Key": key},
                json=payload,
            )
        resp.raise_for_status()
    except httpx.HTTPStatusError as e:
        logger.error("OTP email failed for %s: http=%s", _mask(to), e.response.status_code)
        raise EmailSendFailed("Email provider rejected the request")
    except Exception as e:
        logger.error("OTP email error for %s: %s", _mask(to), type(e).__name__)
        raise EmailSendFailed("Could not reach the email provider")

    logger.info("OTP email dispatched to %s", _mask(to))


async def send_otp_email(to_email: str, otp: str) -> None:
    """Send this app's own login code. Server-side template only (G4)."""
    brand = escape((os.environ.get("EMAIL_FROM_NAME") or "ZOZOCIRCLE").strip())
    subject = f"{otp} is your {brand} login code"
    html = (
        '<table role="presentation" width="100%" style="background:#f6faf7;padding:24px 0">'
        '<tr><td align="center">'
        '<table role="presentation" width="100%" style="max-width:440px;background:#ffffff;'
        'border-radius:16px;padding:28px;font-family:Arial,Helvetica,sans-serif">'
        f'<tr><td style="font-size:13px;font-weight:bold;letter-spacing:2px;color:#19613F">'
        f'{brand}</td></tr>'
        '<tr><td style="padding-top:12px;font-size:20px;font-weight:bold;color:#12261c">'
        'Your login code</td></tr>'
        '<tr><td style="padding-top:6px;font-size:14px;color:#5b6b62">'
        'Use the code below to sign in. It expires in 5 minutes.</td></tr>'
        f'<tr><td align="center" style="padding:22px 0"><div style="display:inline-block;'
        f'background:#f0f7f2;border-radius:12px;padding:14px 24px;font-size:30px;'
        f'font-weight:bold;letter-spacing:8px;color:#19613F">{escape(otp)}</div></td></tr>'
        '<tr><td style="font-size:13px;color:#5b6b62">'
        'If you did not try to sign in, you can ignore this email.</td></tr>'
        f'<tr><td style="padding-top:18px;font-size:11px;color:#8a9992">Sent by {brand}. '
        'We never ask for your password or card details by email.</td></tr>'
        '</table></td></tr></table>'
    )
    await _send_email(to=to_email, subject=subject, html=html)


def _mask(email: str) -> str:
    name, _, domain = (email or "").partition("@")
    return f"{name[:2]}***@{domain}" if domain else "***"
