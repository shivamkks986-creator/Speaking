"""AdMob Server-Side Verification (SSV) signature validator.

When a rewarded ad completes, Google Ads pings a URL WE own (configured in
AdMob console per ad unit). That callback is signed with an ECDSA key that
Google publishes at https://www.gstatic.com/admob/reward/verifier-keys.json.

We verify the signature ourselves so a hostile client can't forge a reward
callback. Reference:
https://developers.google.com/admob/android/rewarded/server-side-verification

Flow:
  1. Google → GET /api/system/rewarded/ssv?ad_network=&ad_unit=&custom_data=&
                key_id=&reward_amount=&reward_item=&signature=&timestamp=&
                transaction_id=&user_id=
  2. Fetch verifier keys (cached in-process for 24h).
  3. Reconstruct the signed message (all query params EXCEPT `signature` and
     `key_id`, sorted by key, joined with `&`).
  4. ECDSA-verify signature (DER-encoded) with the matching public key.
  5. Idempotent grant: use `transaction_id` as the dedupe key.

Custom data format we set in the app:
    "uid:<firebase_uid>|endpoint:<endpoint_name>"
"""
from __future__ import annotations

import base64
import logging
import time
from typing import Optional

import httpx

logger = logging.getLogger(__name__)

VERIFIER_KEYS_URL = "https://www.gstatic.com/admob/reward/verifier-keys.json"
_KEYS_CACHE: dict = {"fetched_at": 0.0, "keys": {}}  # key_id -> ec key object
_CACHE_TTL_SEC = 24 * 60 * 60


async def _load_keys() -> dict:
    """Fetch (and cache) AdMob's verifier public keys. Returns dict keyed by
    string `keyId`. Each value is a cryptography EllipticCurvePublicKey."""
    global _KEYS_CACHE
    now = time.time()
    if _KEYS_CACHE["keys"] and (now - _KEYS_CACHE["fetched_at"]) < _CACHE_TTL_SEC:
        return _KEYS_CACHE["keys"]

    try:
        from cryptography.hazmat.primitives.serialization import load_pem_public_key
    except ImportError as e:
        logger.error("[ssv] cryptography library missing — cannot verify AdMob SSV")
        raise RuntimeError("cryptography_required") from e

    async with httpx.AsyncClient(timeout=10.0) as client:
        resp = await client.get(VERIFIER_KEYS_URL)
        resp.raise_for_status()
        payload = resp.json()

    parsed: dict = {}
    for k in payload.get("keys", []):
        key_id = str(k.get("keyId"))
        pem = k.get("pem")
        if not key_id or not pem:
            continue
        try:
            parsed[key_id] = load_pem_public_key(pem.encode("utf-8"))
        except Exception as e:  # noqa: BLE001
            logger.warning("[ssv] failed to parse key %s: %s", key_id, e)
    _KEYS_CACHE = {"fetched_at": now, "keys": parsed}
    logger.info("[ssv] loaded %d AdMob verifier keys", len(parsed))
    return parsed


def _canonical_message(query_string: str) -> Optional[str]:
    """Rebuild the signed message: everything BEFORE '&signature=' in the
    raw request query string. Google specifies this exact substring rule."""
    idx = query_string.find("signature=")
    if idx <= 0:
        return None
    # Strip the trailing '&' before 'signature='
    return query_string[: idx - 1]


async def verify_ssv(query_string: str, signature: str, key_id: str) -> bool:
    """Verify AdMob rewarded SSV signature.
    `query_string` = full raw request query string (without leading '?').
    Returns True if valid, False otherwise. Never raises for signature
    failures — only for missing crypto dependency (500)."""
    from cryptography.hazmat.primitives import hashes
    from cryptography.hazmat.primitives.asymmetric import ec
    from cryptography.exceptions import InvalidSignature

    keys = await _load_keys()
    pubkey = keys.get(str(key_id))
    if not pubkey:
        # Refresh once — Google may have rotated keys.
        _KEYS_CACHE["fetched_at"] = 0.0
        keys = await _load_keys()
        pubkey = keys.get(str(key_id))
    if not pubkey:
        logger.warning("[ssv] unknown key_id=%s", key_id)
        return False

    message = _canonical_message(query_string)
    if message is None:
        logger.warning("[ssv] malformed query string (no signature marker)")
        return False

    try:
        # Google URL-safe base64 encoded, no padding.
        sig_bytes = base64.urlsafe_b64decode(signature + "===")
    except Exception as e:  # noqa: BLE001
        logger.warning("[ssv] signature decode failed: %s", e)
        return False

    try:
        pubkey.verify(sig_bytes, message.encode("utf-8"), ec.ECDSA(hashes.SHA256()))
        return True
    except InvalidSignature:
        logger.warning("[ssv] signature invalid for key_id=%s", key_id)
        return False
    except Exception as e:  # noqa: BLE001
        logger.warning("[ssv] verify raised %s", e)
        return False


def parse_custom_data(custom_data: str) -> dict:
    """Parse our app-set custom_data (`uid:<uid>|endpoint:<ep>`) into a dict."""
    out: dict = {}
    if not custom_data:
        return out
    for kv in custom_data.split("|"):
        if ":" not in kv:
            continue
        k, v = kv.split(":", 1)
        out[k.strip()] = v.strip()
    return out
