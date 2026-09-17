"""Google Play Developer API v3 receipt validator.

Verifies a purchase token server-side so we never trust the client. Handles:
- Subscriptions (v2 endpoint): monthly / yearly base plans
- One-time products (products.get): lifetime unlock
- Auto-acknowledge after validating so Play doesn't refund the user in 3 days

Configuration:
    GOOGLE_SERVICE_ACCOUNT_JSON   — full JSON string of the service-account key
    GOOGLE_SERVICE_ACCOUNT_PATH   — OR path to the JSON key file on disk
    PLAY_PACKAGE_NAME             — Android package (default com.speakmate.ai)

If NEITHER env var is set we return `None` from `verify_purchase()` so the
caller can fall back to trust-based behaviour (dev / preview). In production
one of the two MUST be provided.
"""
from __future__ import annotations

import json
import logging
import os
from dataclasses import dataclass
from typing import Optional

logger = logging.getLogger(__name__)

PACKAGE_NAME = os.environ.get("PLAY_PACKAGE_NAME", "com.speakmate.ai")
SCOPES = ["https://www.googleapis.com/auth/androidpublisher"]

# Lazy-cached Play API client — building the discovery doc is expensive so we
# do it once per process. `None` means "credentials not configured".
_play_client = None
_client_error: Optional[str] = None


def _build_client():
    """Build (and cache) the androidpublisher client. Returns None if the
    service-account credentials are not configured."""
    global _play_client, _client_error
    if _play_client is not None:
        return _play_client
    if _client_error is not None:
        return None

    raw_json = os.environ.get("GOOGLE_SERVICE_ACCOUNT_JSON")
    json_path = os.environ.get("GOOGLE_SERVICE_ACCOUNT_PATH")
    if not raw_json and not json_path:
        _client_error = "no_service_account_configured"
        logger.warning(
            "[play_verifier] GOOGLE_SERVICE_ACCOUNT_JSON / _PATH not set — "
            "subscription/verify will trust client tokens. DO NOT ship this to prod."
        )
        return None

    try:
        from google.oauth2 import service_account
        from googleapiclient.discovery import build

        if raw_json:
            info = json.loads(raw_json)
            creds = service_account.Credentials.from_service_account_info(info, scopes=SCOPES)
        else:
            creds = service_account.Credentials.from_service_account_file(json_path, scopes=SCOPES)

        _play_client = build("androidpublisher", "v3", credentials=creds, cache_discovery=False)
        logger.info("[play_verifier] androidpublisher client ready (package=%s)", PACKAGE_NAME)
        return _play_client
    except Exception as e:  # noqa: BLE001
        _client_error = f"init_failed:{e}"
        logger.exception("[play_verifier] failed to build client")
        return None


@dataclass
class VerifiedPurchase:
    entitled: bool
    state: str                    # e.g. "SUBSCRIPTION_STATE_ACTIVE", "PURCHASED"
    expiry_iso: Optional[str] = None
    acknowledged: bool = False
    order_id: Optional[str] = None


def _is_subscription(product_id: str, pricing: dict) -> bool:
    monthly = pricing.get("monthly_sku")
    yearly = pricing.get("yearly_sku")
    return product_id in {monthly, yearly}


def verify_purchase(product_id: str, purchase_token: str, pricing: dict) -> Optional[VerifiedPurchase]:
    """Verify a Play Store token. Returns None if credentials aren't
    configured (caller should fall back to trust mode). Raises for real
    verification failures so the API returns a clean 400."""
    client = _build_client()
    if client is None:
        return None

    if _is_subscription(product_id, pricing):
        return _verify_subscription(client, product_id, purchase_token)
    return _verify_product(client, product_id, purchase_token)


def _verify_subscription(client, product_id: str, purchase_token: str) -> VerifiedPurchase:
    """Uses purchases.subscriptionsv2.get — the current recommended endpoint."""
    from googleapiclient.errors import HttpError

    try:
        data = client.purchases().subscriptionsv2().get(
            packageName=PACKAGE_NAME, token=purchase_token
        ).execute()
    except HttpError as e:
        raise ValueError(f"play_api_error:{e.status_code}") from e

    state = data.get("subscriptionState", "SUBSCRIPTION_STATE_UNSPECIFIED")
    entitled = state in {"SUBSCRIPTION_STATE_ACTIVE", "SUBSCRIPTION_STATE_IN_GRACE_PERIOD"}
    line_items = data.get("lineItems") or []
    expiry_iso = line_items[0].get("expiryTime") if line_items else None
    ack_state = data.get("acknowledgementState")
    acknowledged = ack_state == "ACKNOWLEDGEMENT_STATE_ACKNOWLEDGED"

    # Auto-acknowledge the first time so Play doesn't refund in 3 days.
    if entitled and not acknowledged:
        try:
            client.purchases().subscriptions().acknowledge(
                packageName=PACKAGE_NAME,
                subscriptionId=product_id,
                token=purchase_token,
                body={},
            ).execute()
            acknowledged = True
        except HttpError as e:
            logger.warning("[play_verifier] subscription ack failed: %s", e)

    return VerifiedPurchase(
        entitled=entitled,
        state=state,
        expiry_iso=str(expiry_iso) if expiry_iso else None,
        acknowledged=acknowledged,
        order_id=str(data.get("latestOrderId") or "") or None,
    )


def _verify_product(client, product_id: str, purchase_token: str) -> VerifiedPurchase:
    """Uses purchases.products.get for one-time / lifetime products."""
    from googleapiclient.errors import HttpError

    try:
        data = client.purchases().products().get(
            packageName=PACKAGE_NAME, productId=product_id, token=purchase_token
        ).execute()
    except HttpError as e:
        raise ValueError(f"play_api_error:{e.status_code}") from e

    # purchaseState: 0=PURCHASED, 1=CANCELED, 2=PENDING
    purchase_state = data.get("purchaseState")
    entitled = purchase_state == 0
    ack_state = data.get("acknowledgementState")   # 0=YET_TO_BE, 1=ACKNOWLEDGED
    acknowledged = ack_state == 1

    if entitled and not acknowledged:
        try:
            client.purchases().products().acknowledge(
                packageName=PACKAGE_NAME,
                productId=product_id,
                token=purchase_token,
                body={},
            ).execute()
            acknowledged = True
        except HttpError as e:
            logger.warning("[play_verifier] product ack failed: %s", e)

    return VerifiedPurchase(
        entitled=entitled,
        state="PURCHASED" if purchase_state == 0 else f"STATE_{purchase_state}",
        expiry_iso=None,
        acknowledged=acknowledged,
        order_id=str(data.get("orderId") or "") or None,
    )
