"""Firebase ID token verification (used by paid/secured endpoints).

Any endpoint that unlocks paid functionality MUST use `require_uid` — this
enforces a signed Firebase ID token, so an attacker can no longer curl with
just an `X-User-Id` header.

Fallback:
- If `FIREBASE_SERVICE_ACCOUNT_JSON` (or `_PATH`) is NOT configured AND
  env `SECURE_BILLING` is NOT "true", we allow the legacy `X-User-Id`
  header (backward-compat for the current preview build). A big warning is
  logged on startup. In production set `SECURE_BILLING=true` + provide the
  service-account JSON.
"""
from __future__ import annotations

import json
import logging
import os
from typing import Optional

from fastapi import Header, HTTPException, Depends

logger = logging.getLogger(__name__)

# --- Lazy Firebase Admin bootstrap ----------------------------------------
_fb_ready = False
_fb_error: Optional[str] = None

SECURE_BILLING = os.environ.get("SECURE_BILLING", "false").strip().lower() in {"1", "true", "yes"}


def _init_firebase() -> bool:
    global _fb_ready, _fb_error
    if _fb_ready:
        return True
    if _fb_error is not None:
        return False
    raw = os.environ.get("FIREBASE_SERVICE_ACCOUNT_JSON")
    path = os.environ.get("FIREBASE_SERVICE_ACCOUNT_PATH")
    if not raw and not path:
        _fb_error = "no_firebase_service_account_configured"
        if SECURE_BILLING:
            logger.error(
                "[auth] SECURE_BILLING=true but FIREBASE_SERVICE_ACCOUNT_JSON not set — "
                "auth-protected endpoints will refuse all requests."
            )
        else:
            logger.warning(
                "[auth] Firebase Admin credentials missing — falling back to X-User-Id "
                "trust mode. DO NOT ship this to production. Set FIREBASE_SERVICE_ACCOUNT_JSON."
            )
        return False
    try:
        import firebase_admin
        from firebase_admin import credentials
        if raw:
            info = json.loads(raw)
            cred = credentials.Certificate(info)
        else:
            cred = credentials.Certificate(path)
        try:
            firebase_admin.get_app()
        except ValueError:
            firebase_admin.initialize_app(cred)
        _fb_ready = True
        logger.info("[auth] firebase_admin initialised")
        return True
    except Exception as e:  # noqa: BLE001
        _fb_error = f"init_failed:{e}"
        logger.exception("[auth] firebase_admin init failed")
        return False


def _verify_id_token(token: str) -> Optional[str]:
    """Returns the uid inside the ID token, or None on any failure."""
    if not _init_firebase():
        return None
    try:
        from firebase_admin import auth as fb_auth
        decoded = fb_auth.verify_id_token(token, check_revoked=True)
        return decoded.get("uid")
    except Exception as e:  # noqa: BLE001
        logger.info("[auth] verify_id_token rejected: %s", e)
        return None


async def require_uid(
    authorization: Optional[str] = Header(default=None),
    x_user_id: Optional[str] = Header(default=None),
) -> str:
    """Resolves the calling user. Preference order:
    1. Bearer <firebase_id_token>  (verified via firebase_admin)
    2. X-User-Id header  (only if SECURE_BILLING=false — legacy trust mode)

    Raises 401 if neither yields a uid.
    """
    if authorization and authorization.lower().startswith("bearer "):
        token = authorization.split(None, 1)[1].strip()
        uid = _verify_id_token(token)
        if uid:
            return uid
        # Bad/expired token → hard reject (don't fall back to X-User-Id).
        raise HTTPException(status_code=401, detail="invalid_id_token")

    if SECURE_BILLING:
        raise HTTPException(status_code=401, detail="authorization_required")

    # Legacy trust mode (pre-migration builds still send only X-User-Id).
    if not x_user_id:
        raise HTTPException(status_code=401, detail="user_id_required")
    return x_user_id


async def optional_uid(
    authorization: Optional[str] = Header(default=None),
    x_user_id: Optional[str] = Header(default=None),
) -> Optional[str]:
    """Same as require_uid but returns None for anonymous callers instead of raising."""
    if authorization and authorization.lower().startswith("bearer "):
        token = authorization.split(None, 1)[1].strip()
        return _verify_id_token(token)
    return None if SECURE_BILLING else (x_user_id or None)


# Public helper: does the current process refuse trust-mode fallbacks?
def is_secure_mode() -> bool:
    return SECURE_BILLING
