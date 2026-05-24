"""Lightweight HMAC-SHA256 token auth for admin endpoints.

No external dependencies — uses only Python stdlib (hmac, hashlib, base64, json, time).

Token format: base64(header.payload.signature)
  - header: {"alg":"HS256","typ":"Token"}
  - payload: {"sub":"admin","iat":<epoch>,"exp":<epoch>}
  - signature: HMAC-SHA256(base64(header) + "." + base64(payload), secret)

The secret is derived from ADMIN_PASSWORD (or a random fallback) so no extra
config key is needed.
"""

import hmac
import hashlib
import base64
import json
import time
import secrets
from typing import Optional

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

from app.config.settings import settings

# ── helpers ────────────────────────────────────────────────────────────────

_TOKEN_LIFETIME = 60 * 60 * 24  # 24 hours


def _b64(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).rstrip(b"=").decode("ascii")


def _b64dec(s: str) -> bytes:
    pad = 4 - len(s) % 4
    if pad != 4:
        s += "=" * pad
    return base64.urlsafe_b64decode(s)


def _get_secret() -> str:
    """Derive a stable HMAC secret from the configured admin password."""
    pwd = settings.ADMIN_PASSWORD or "changeme"
    return hashlib.sha256(f"neocockpit-admin:{pwd}".encode()).hexdigest()


# ── public API ─────────────────────────────────────────────────────────────

def create_token() -> str:
    """Create a signed admin token valid for 24 hours."""
    now = int(time.time())
    header = {"alg": "HS256", "typ": "Token"}
    payload = {"sub": "admin", "iat": now, "exp": now + _TOKEN_LIFETIME}

    h = _b64(json.dumps(header, separators=(",", ":")).encode())
    p = _b64(json.dumps(payload, separators=(",", ":")).encode())

    signing_input = f"{h}.{p}".encode()
    sig = hmac.new(_get_secret().encode(), signing_input, hashlib.sha256).hexdigest()

    return f"{h}.{p}.{sig}"


def verify_token(token: str) -> bool:
    """Return True when *token* is a valid, non-expired admin token."""
    try:
        parts = token.split(".")
        if len(parts) != 3:
            return False

        h, p, sig = parts

        # verify signature
        signing_input = f"{h}.{p}".encode()
        expected = hmac.new(_get_secret().encode(), signing_input, hashlib.sha256).hexdigest()
        if not hmac.compare_digest(sig, expected):
            return False

        # verify expiration
        payload = json.loads(_b64dec(p))
        exp = payload.get("exp", 0)
        if time.time() > exp:
            return False

        # verify subject
        if payload.get("sub") != "admin":
            return False

        return True
    except Exception:
        return False


def authenticate(username: str, password: str) -> Optional[str]:
    """Check credentials. Returns a token on success, None otherwise."""
    expected_user = settings.ADMIN_USERNAME or "admin"
    expected_pass = settings.ADMIN_PASSWORD or "changeme"

    if not hmac.compare_digest(username, expected_user):
        return None
    if not hmac.compare_digest(password, expected_pass):
        return None
    return create_token()


# ── FastAPI dependency ─────────────────────────────────────────────────────

_bearer_scheme = HTTPBearer(auto_error=False)


async def require_admin(
    credentials: HTTPAuthorizationCredentials = Depends(_bearer_scheme),
) -> None:
    """FastAPI dependency that rejects requests without a valid admin token."""
    if credentials is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="未提供认证凭据",
            headers={"WWW-Authenticate": "Bearer"},
        )
    if not verify_token(credentials.credentials):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="认证凭据无效或已过期",
            headers={"WWW-Authenticate": "Bearer"},
        )
