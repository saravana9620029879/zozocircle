"""MSG91 OTP delivery. The auth key and OTP value are never returned or logged."""
import os
import logging
import requests

logger = logging.getLogger("zozocircle.msg91")

MSG91_URL = "https://control.msg91.com/api/v5/otp"


class SmsNotConfigured(Exception):
    pass


class SmsSendFailed(Exception):
    pass


def _auth_key() -> str:
    # Tolerate stray whitespace/quotes/trailing punctuation in the env value.
    raw = (os.environ.get("MSG91_AUTH_KEY") or "").strip().strip('".,\'')
    if not raw:
        raise SmsNotConfigured("MSG91_AUTH_KEY is not configured")
    return raw


def send_otp_sms(mobile_91: str, otp: str) -> None:
    """Send `otp` to a 91XXXXXXXXXX number. Raises SmsNotConfigured / SmsSendFailed."""
    template_id = (os.environ.get("MSG91_TEMPLATE_ID") or "").strip().strip('".,\'')
    if not template_id:
        raise SmsNotConfigured("MSG91_TEMPLATE_ID is not configured")

    payload = {"template_id": template_id, "mobile": mobile_91, "otp": otp}
    sender = (os.environ.get("MSG91_SENDER_ID") or "").strip().strip('".,\'')
    if sender:
        payload["sender"] = sender

    try:
        r = requests.post(
            MSG91_URL,
            json=payload,
            headers={"authkey": _auth_key(), "Content-Type": "application/json"},
            timeout=20,
        )
    except requests.RequestException as e:
        logger.error("MSG91 request error for %s: %s", _mask(mobile_91), type(e).__name__)
        raise SmsSendFailed("Could not reach the SMS provider")

    body = {}
    try:
        body = r.json()
    except ValueError:
        pass

    if r.status_code != 200 or str(body.get("type", "")).lower() == "error":
        # Log provider message only - never the OTP, never the auth key.
        logger.error(
            "MSG91 send failed for %s: http=%s type=%s msg=%s",
            _mask(mobile_91), r.status_code, body.get("type"), body.get("message"),
        )
        raise SmsSendFailed("SMS provider rejected the request")

    logger.info("OTP SMS dispatched to %s", _mask(mobile_91))


def _mask(mobile_91: str) -> str:
    return f"{mobile_91[:4]}****{mobile_91[-2:]}" if len(mobile_91) >= 8 else "****"
