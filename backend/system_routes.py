"""System / Admin routes — kill switch, config, usage stats, subscription & rewarded ads.

Public:
- GET  /api/system/config     — kill-switch flags (used by frontend bootstrap)
- GET  /api/system/pricing    — subscription plan prices + SKUs (used by PremiumScreen)
- GET  /api/system/usage      — today's usage summary
- GET  /api/system/quota      — per-user quota status
- POST /api/system/subscription/verify — verify Play Store receipt & activate premium
- POST /api/system/subscription/restore — restore purchase (looks up premium from DB)
- POST /api/system/rewarded/claim — grant rewarded-ad bonus quota

Admin-only (header X-Admin-Email must match env var ADMIN_EMAILS):
- POST /api/system/admin-toggle — flip flags / change budget / set maintenance msg
- POST /api/system/admin-pricing — configure subscription prices, SKUs, quotas
"""
from __future__ import annotations

import base64
import json
import logging
import os
from datetime import datetime, timezone
from typing import Any, Optional
from fastapi import APIRouter, Header, HTTPException, Depends
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field

import usage_tracker as ut
import play_verifier as pv
import admob_ssv as ssv
from auth_deps import require_uid, optional_uid, is_secure_mode

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/system")

ADMIN_EMAILS = {e.strip().lower() for e in os.environ.get("ADMIN_EMAILS", "").split(",") if e.strip()}
_db = AsyncIOMotorClient(os.environ["MONGO_URL"])[os.environ["DB_NAME"]]

# --- Ensure DB indexes for security & idempotency -------------------------
_indexes_ready = False


async def _ensure_indexes() -> None:
    """Create unique index on purchase_token — prevents one token being used
    to unlock premium on multiple accounts. Called lazily on first use."""
    global _indexes_ready
    if _indexes_ready:
        return
    try:
        await _db.subscriptions.create_index("purchase_token", unique=True, sparse=True)
        await _db.subscriptions.create_index([("uid", 1), ("active", 1), ("expires_at", -1)])
        await _db.rtdn_events.create_index("event_id", unique=True, sparse=True)
        _indexes_ready = True
    except Exception:  # noqa: BLE001
        logger.exception("[system] index creation failed (non-fatal)")


def _require_admin(email: Optional[str]) -> str:
    if not email or email.strip().lower() not in ADMIN_EMAILS:
        raise HTTPException(status_code=403, detail="admin_only")
    return email.strip().lower()


class SystemConfigResponse(BaseModel):
    global_ai_enabled: bool
    force_disabled: bool
    daily_budget_inr: float
    user_daily_free_limit: int
    maintenance_message: str
    today_cost_inr: float
    today_calls: int
    budget_remaining_pct: float


@router.get("/config", response_model=SystemConfigResponse)
async def system_config() -> SystemConfigResponse:
    state = await ut.get_state()
    usage = await ut.get_today_usage()
    budget = float(state.get("daily_budget_inr", ut.DEFAULT_DAILY_BUDGET_INR))
    remaining = max(0.0, 100.0 - (usage["total_cost_inr"] / max(budget, 0.01)) * 100.0)
    return SystemConfigResponse(
        global_ai_enabled=bool(state.get("global_ai_enabled", True)),
        force_disabled=bool(state.get("force_disabled", False)),
        daily_budget_inr=budget,
        user_daily_free_limit=int(state.get("user_daily_free_limit", ut.DEFAULT_USER_DAILY_LIMIT)),
        maintenance_message=str(state.get("maintenance_message", "")),
        today_cost_inr=float(usage["total_cost_inr"]),
        today_calls=int(usage["total_calls"]),
        budget_remaining_pct=round(remaining, 1),
    )


@router.get("/quota")
async def user_quota(uid: str = Depends(require_uid)):
    """Returns the calling user's daily quota status (used/limit/remaining).

    is_premium is resolved server-side by looking up the `subscriptions`
    collection — the client can NO LONGER lie about premium via a header.
    """
    await _ensure_indexes()
    plan = await ut.get_user_active_plan(uid)
    is_premium = plan is not None
    return await ut.get_user_quota_status(uid, is_premium)


@router.get("/usage")
async def system_usage(x_admin_email: Optional[str] = Header(default=None)):
    """Admin-only detailed usage by endpoint."""
    _require_admin(x_admin_email)
    return await ut.get_today_usage()


class AdminTogglePayload(BaseModel):
    global_ai_enabled: Optional[bool] = None
    force_disabled: Optional[bool] = None
    daily_budget_inr: Optional[float] = Field(default=None, ge=0)
    user_daily_free_limit: Optional[int] = Field(default=None, ge=0, le=10000)
    maintenance_message: Optional[str] = None


@router.post("/admin-toggle", response_model=SystemConfigResponse)
async def admin_toggle(
    payload: AdminTogglePayload,
    x_admin_email: Optional[str] = Header(default=None),
) -> SystemConfigResponse:
    _require_admin(x_admin_email)
    patch = {k: v for k, v in payload.model_dump().items() if v is not None}
    if not patch:
        raise HTTPException(status_code=400, detail="no_fields_to_update")
    await ut.update_state(patch)
    return await system_config()


# =============================================================================
# Subscription & Pricing
# =============================================================================

class PlanFeature(BaseModel):
    label: str
    included: bool
    note: Optional[str] = None


class PlanConfig(BaseModel):
    title: str
    cta: str
    billing_period: str
    badge: Optional[str] = None
    trial_days: Optional[int] = None
    features: list[PlanFeature]


class PricingResponse(BaseModel):
    monthly_inr: int
    yearly_inr: int
    lifetime_inr: int
    lifetime_enabled: bool
    monthly_sku: str
    yearly_sku: str
    lifetime_sku: str
    plans: dict[str, PlanConfig]


@router.get("/pricing", response_model=PricingResponse)
async def pricing():
    """Public: subscription prices + SKUs + per-plan features + CTAs. Used by PremiumScreen."""
    state = await ut.get_state()
    p = state.get("pricing", {})
    plans_raw = p.get("plans", {})
    plans: dict[str, PlanConfig] = {}
    for key in ("monthly", "yearly", "lifetime"):
        plan = plans_raw.get(key) or {}
        plans[key] = PlanConfig(
            title=str(plan.get("title", key.title() + " Premium")),
            cta=str(plan.get("cta", "Subscribe")),
            billing_period=str(plan.get("billing_period", "")),
            badge=plan.get("badge"),
            trial_days=plan.get("trial_days"),
            features=[PlanFeature(**f) for f in plan.get("features", [])],
        )
    return PricingResponse(
        monthly_inr=int(p.get("monthly_inr", 149)),
        yearly_inr=int(p.get("yearly_inr", 799)),
        lifetime_inr=int(p.get("lifetime_inr", 1499)),
        lifetime_enabled=bool(p.get("lifetime_enabled", True)),
        monthly_sku=str(p.get("monthly_sku", "premium_monthly")),
        yearly_sku=str(p.get("yearly_sku", "premium_yearly")),
        lifetime_sku=str(p.get("lifetime_sku", "premium_lifetime")),
        plans=plans,
    )


class SubscriptionVerifyPayload(BaseModel):
    """Payload sent by app after a successful Google Play purchase."""
    product_id: str      # e.g. "premium_monthly"
    purchase_token: str  # opaque token returned by Play Billing
    order_id: Optional[str] = None


class SubscriptionStatus(BaseModel):
    is_premium: bool
    plan: Optional[str] = None       # "monthly" | "yearly" | "lifetime" | None
    expires_at: Optional[str] = None
    source: Optional[str] = None     # "play_billing" | "admin_grant"


@router.post("/subscription/verify", response_model=SubscriptionStatus)
async def subscription_verify(
    payload: SubscriptionVerifyPayload,
    uid: str = Depends(require_uid),
):
    """Verify a Play Store receipt server-side and mark user as premium.

    Uses Google Play Developer API v3 (androidpublisher). If credentials are
    missing:
      - SECURE_BILLING=true (production): returns 503 verification_unavailable.
      - SECURE_BILLING=false (dev/preview): logs a warning and grants premium
        with source="play_billing_unverified". This flag must be ON in prod.
    """
    await _ensure_indexes()
    if not payload.purchase_token:
        raise HTTPException(status_code=400, detail="purchase_token_required")

    state = await ut.get_state()
    p = state.get("pricing", {})
    plan_map = {
        p.get("monthly_sku"): ("monthly", 30),
        p.get("yearly_sku"): ("yearly", 365),
        p.get("lifetime_sku"): ("lifetime", 365 * 100),
    }
    match = plan_map.get(payload.product_id)
    if not match:
        raise HTTPException(status_code=400, detail=f"unknown_product:{payload.product_id}")
    plan, days = match

    # --- Guard: same purchase_token already bound to a different uid? -------
    existing = await _db.subscriptions.find_one(
        {"purchase_token": payload.purchase_token},
        {"uid": 1, "active": 1},
    )
    if existing and existing.get("uid") and existing["uid"] != uid:
        logger.warning("[verify] cross-user token replay blocked: token bound to %s, requester=%s",
                       existing["uid"], uid)
        raise HTTPException(status_code=403, detail="purchase_token_bound_to_other_user")

    # --- Server-side verification via Google Play Developer API ------------
    verified: Optional[pv.VerifiedPurchase]
    try:
        verified = pv.verify_purchase(payload.product_id, payload.purchase_token, p)
    except ValueError as e:
        # Genuine Play API error (400/404 from Google) — reject.
        logger.warning("[verify] play api rejected token: %s", e)
        raise HTTPException(status_code=400, detail=f"play_verification_failed:{e}")
    except Exception as e:  # noqa: BLE001
        logger.exception("[verify] unexpected play_verifier error")
        raise HTTPException(status_code=500, detail="verify_internal_error") from e

    from datetime import timedelta
    now = datetime.now(timezone.utc)

    if verified is not None:
        # Real Play verification path — trust Google, not client.
        if not verified.entitled:
            raise HTTPException(status_code=400, detail=f"purchase_not_active:{verified.state}")
        expires_iso = verified.expiry_iso or (now + timedelta(days=days)).isoformat()
        source = "play_billing"
        order_id = verified.order_id or payload.order_id
    else:
        # Credentials not configured. In production (SECURE_BILLING=true) refuse.
        if is_secure_mode():
            raise HTTPException(status_code=503, detail="verification_unavailable")
        logger.warning("[verify] running in TRUST MODE — GOOGLE_SERVICE_ACCOUNT_JSON missing")
        expires_iso = (now + timedelta(days=days)).isoformat()
        source = "play_billing_unverified"
        order_id = payload.order_id

    doc = {
        "uid": uid,
        "product_id": payload.product_id,
        "purchase_token": payload.purchase_token,
        "order_id": order_id,
        "plan": plan,
        "granted_at": now.isoformat(),
        "expires_at": expires_iso,
        "source": source,
        "active": True,
    }
    try:
        await _db.subscriptions.update_one(
            {"purchase_token": payload.purchase_token},
            {"$set": doc},
            upsert=True,
        )
    except Exception as e:  # noqa: BLE001
        # DuplicateKey shouldn't fire (upsert on unique index), but log anyway.
        logger.exception("[verify] db upsert failed")
        raise HTTPException(status_code=500, detail="verify_persist_failed") from e
    return SubscriptionStatus(is_premium=True, plan=plan, expires_at=expires_iso, source=source)


@router.post("/subscription/restore", response_model=SubscriptionStatus)
async def subscription_restore(uid: str = Depends(require_uid)):
    """Look up user's most recent active subscription (used by 'Restore Purchases')."""
    return await _resolve_current_subscription(uid)


@router.get("/subscription/status", response_model=SubscriptionStatus)
async def subscription_status(uid: str = Depends(require_uid)):
    """Lightweight GET variant of restore — called by app on every launch so
    the app never trusts a stale local `isPremium` flag."""
    return await _resolve_current_subscription(uid)


async def _resolve_current_subscription(uid: str) -> "SubscriptionStatus":
    now = datetime.now(timezone.utc).isoformat()
    sub = await _db.subscriptions.find_one(
        {"uid": uid, "active": True, "expires_at": {"$gte": now}},
        sort=[("granted_at", -1)],
    )
    if not sub:
        return SubscriptionStatus(is_premium=False)
    return SubscriptionStatus(
        is_premium=True,
        plan=str(sub.get("plan", "")),
        expires_at=str(sub.get("expires_at", "")),
        source=str(sub.get("source", "play_billing")),
    )


# =============================================================================
# Rewarded ads
# =============================================================================

class RewardedClaimPayload(BaseModel):
    endpoint: Optional[str] = None
    ad_unit_id: Optional[str] = None  # for audit; not validated yet


class RewardedResponse(BaseModel):
    ok: bool
    reason: Optional[str] = None
    bonus_granted: Optional[int] = None
    total_bonus_today: Optional[int] = None
    remaining_bonus_slots: Optional[int] = None
    wait_seconds: Optional[int] = None


@router.post("/rewarded/claim", response_model=RewardedResponse)
async def rewarded_claim(
    payload: RewardedClaimPayload,
    uid: str = Depends(require_uid),
):
    """Called by app after a rewarded ad completes.

    PREFERRED path: AdMob calls `/api/system/rewarded/ssv` directly (Google →
    us, cryptographically signed). This endpoint remains as a fallback for
    dev/preview builds where SSV isn't configured yet — it's rate-limited by
    the cooldown/daily-cap in `usage_tracker.grant_rewarded_bonus`.
    """
    # Backend-resolved premium — client cannot lie via a header.
    plan = await ut.get_user_active_plan(uid)
    if plan is not None:
        return RewardedResponse(ok=False, reason="premium_no_bonus_needed")
    result = await ut.grant_rewarded_bonus(uid, endpoint=payload.endpoint)
    return RewardedResponse(**result)


# --- AdMob Server-Side Verification (signed callback from Google) ----------
from fastapi import Request


@router.get("/rewarded/ssv")
async def rewarded_ssv(request: Request):
    """AdMob SSV callback — receives a GET from Google's servers when a
    rewarded ad completes. Verifies the ECDSA signature against Google's
    published verifier keys, then atomically grants the reward (dedupe on
    transaction_id).

    Set this URL in AdMob console per ad unit:
        https://<backend>/api/system/rewarded/ssv
    """
    q = dict(request.query_params)
    signature = q.get("signature")
    key_id = q.get("key_id")
    txn = q.get("transaction_id")
    custom_data = q.get("custom_data", "")

    if not signature or not key_id or not txn:
        raise HTTPException(status_code=400, detail="ssv_missing_params")

    raw_qs = request.url.query
    ok = await ssv.verify_ssv(raw_qs, signature, key_id)
    if not ok:
        # Return 400 so Google retries; 200 would be interpreted as accepted.
        raise HTTPException(status_code=400, detail="ssv_signature_invalid")

    # Idempotent dedupe on transaction_id.
    already = await _db.rewarded_ssv.find_one({"transaction_id": txn}, {"_id": 1})
    if already:
        return {"ok": True, "reason": "already_processed"}

    parsed = ssv.parse_custom_data(custom_data)
    uid = parsed.get("uid") or q.get("user_id")
    endpoint = parsed.get("endpoint")
    if not uid:
        raise HTTPException(status_code=400, detail="ssv_missing_uid")

    result = await ut.grant_rewarded_bonus(uid, endpoint=endpoint)
    await _db.rewarded_ssv.insert_one({
        "transaction_id": txn,
        "uid": uid,
        "endpoint": endpoint,
        "key_id": key_id,
        "reward_amount": q.get("reward_amount"),
        "reward_item": q.get("reward_item"),
        "granted_at": datetime.now(timezone.utc).isoformat(),
        "result": result,
    })
    return {"ok": True, "result": result}


# =============================================================================
# Real-Time Developer Notifications (RTDN) — Google Play Pub/Sub push
# =============================================================================
# Google Play pushes JSON like:
#   {"message":{"data":"<base64>","messageId":"...","publishTime":"..."},"subscription":"..."}
# where data (b64-decoded) is:
#   {"version":"1.0","packageName":"com.speakmate.ai","eventTimeMillis":"...",
#    "subscriptionNotification":{"version":"1.0","notificationType":<int>,
#       "purchaseToken":"...","subscriptionId":"premium_monthly"}}
# or a `oneTimeProductNotification` for lifetime.
#
# Configure this endpoint in Play Console → Monetize setup → RTDN topic:
#     https://<backend>/api/system/rtdn
#
# Then in Google Cloud Console → Pub/Sub → subscription → Push endpoint URL
# same URL with `?token=<RTDN_PUSH_TOKEN>` (used as shared secret).
#
# Notification types (subscriptionNotificationType):
#   1  RECOVERED         2  RENEWED       3  CANCELED     4  PURCHASED
#   5  ON_HOLD           6  IN_GRACE      7  RESTARTED    8  PRICE_CHANGE_CONFIRMED
#   9  DEFERRED         10  PAUSED       11  PAUSE_SCHEDULE_CHANGED
#  12  REVOKED          13  EXPIRED
# One-time productNotificationType:
#   1  PURCHASED         2  CANCELED
# Anything that revokes access: 3, 10, 12, 13 (subs) / 2 (product)
RTDN_PUSH_TOKEN = os.environ.get("RTDN_PUSH_TOKEN", "").strip()

_REVOKE_SUB_TYPES = {3, 10, 12, 13}   # canceled, paused, revoked, expired
_REVOKE_PRODUCT_TYPES = {2}           # canceled
_RENEW_SUB_TYPES = {1, 2, 4, 7}       # recovered, renewed, purchased, restarted


@router.post("/rtdn")
async def rtdn_webhook(request: Request):
    """Google Play Real-Time Developer Notifications push endpoint.

    Handles subscription state transitions (refund, cancel, expire, pause,
    revoke, renew) atomically. Always returns 200 to prevent Pub/Sub retry
    storms — errors are logged, not surfaced.

    Auth: shared-secret via `?token=` matching env RTDN_PUSH_TOKEN.
    """
    await _ensure_indexes()

    if RTDN_PUSH_TOKEN:
        got = request.query_params.get("token", "")
        if got != RTDN_PUSH_TOKEN:
            logger.warning("[rtdn] rejected: bad token")
            raise HTTPException(status_code=401, detail="bad_rtdn_token")

    try:
        body = await request.json()
    except Exception:
        logger.warning("[rtdn] non-JSON body ignored")
        return {"ok": True}

    message = (body or {}).get("message") or {}
    message_id = message.get("messageId") or message.get("message_id") or ""
    data_b64 = message.get("data")
    if not data_b64:
        logger.info("[rtdn] test ping (no data)")
        return {"ok": True}

    try:
        payload = json.loads(base64.b64decode(data_b64))
    except Exception:
        logger.exception("[rtdn] base64/json decode failed")
        return {"ok": True}

    # Idempotency — dedupe on Pub/Sub messageId.
    if message_id:
        seen = await _db.rtdn_events.find_one({"event_id": message_id}, {"_id": 1})
        if seen:
            return {"ok": True, "reason": "duplicate"}

    pkg = payload.get("packageName")
    if pkg and pkg != pv.PACKAGE_NAME:
        logger.warning("[rtdn] wrong package: %s", pkg)
        return {"ok": True, "reason": "wrong_package"}

    sub_notif = payload.get("subscriptionNotification")
    prod_notif = payload.get("oneTimeProductNotification")

    if sub_notif:
        await _handle_sub_notification(sub_notif)
    elif prod_notif:
        await _handle_product_notification(prod_notif)
    else:
        # test-publish or unknown → just ack
        pass

    if message_id:
        await _db.rtdn_events.insert_one({
            "event_id": message_id,
            "payload": payload,
            "received_at": datetime.now(timezone.utc).isoformat(),
        })
    return {"ok": True}


async def _handle_sub_notification(notif: dict) -> None:
    token = notif.get("purchaseToken")
    ntype = int(notif.get("notificationType") or 0)
    sub_id = notif.get("subscriptionId")
    if not token:
        return

    if ntype in _REVOKE_SUB_TYPES:
        await _db.subscriptions.update_one(
            {"purchase_token": token},
            {"$set": {"active": False, "revoked_at": datetime.now(timezone.utc).isoformat(),
                      "revoke_reason": f"rtdn_type_{ntype}"}},
        )
        logger.info("[rtdn] revoked sub token=%s reason=%s", token[:12], ntype)
        return

    if ntype in _RENEW_SUB_TYPES:
        # Re-verify with Play so we get the fresh expiryTime.
        state = await ut.get_state()
        pricing = state.get("pricing", {})
        try:
            verified = pv.verify_purchase(sub_id, token, pricing)
        except Exception:
            logger.exception("[rtdn] re-verify failed for %s", token[:12])
            return
        if verified is None or not verified.entitled:
            return
        await _db.subscriptions.update_one(
            {"purchase_token": token},
            {"$set": {
                "active": True,
                "expires_at": verified.expiry_iso,
                "state": verified.state,
                "renewed_at": datetime.now(timezone.utc).isoformat(),
            }},
        )


async def _handle_product_notification(notif: dict) -> None:
    token = notif.get("purchaseToken")
    ntype = int(notif.get("notificationType") or 0)
    if not token:
        return
    if ntype in _REVOKE_PRODUCT_TYPES:
        await _db.subscriptions.update_one(
            {"purchase_token": token},
            {"$set": {"active": False, "revoked_at": datetime.now(timezone.utc).isoformat(),
                      "revoke_reason": f"rtdn_product_type_{ntype}"}},
        )


# =============================================================================
# Admin: pricing & endpoint quotas
# =============================================================================

class AdminPricingPayload(BaseModel):
    monthly_inr: Optional[int] = Field(default=None, ge=0, le=100000)
    yearly_inr: Optional[int] = Field(default=None, ge=0, le=100000)
    lifetime_inr: Optional[int] = Field(default=None, ge=0, le=100000)
    lifetime_enabled: Optional[bool] = None
    monthly_sku: Optional[str] = None
    yearly_sku: Optional[str] = None
    lifetime_sku: Optional[str] = None
    free_endpoint_limits: Optional[dict[str, int]] = None
    rewarded_bonus_per_ad: Optional[int] = Field(default=None, ge=0, le=100)
    rewarded_max_per_day: Optional[int] = Field(default=None, ge=0, le=1000)
    rewarded_cooldown_seconds: Optional[int] = Field(default=None, ge=0, le=3600)


@router.post("/admin-pricing")
async def admin_pricing(
    payload: AdminPricingPayload,
    x_admin_email: Optional[str] = Header(default=None),
):
    _require_admin(x_admin_email)
    state = await ut.get_state()
    pricing = dict(state.get("pricing", {}))
    rewarded = dict(state.get("rewarded", {}))
    endpoint_limits = dict(state.get("free_endpoint_limits", {}))

    d = payload.model_dump(exclude_none=True)
    # Pricing fields
    for k in ("monthly_inr", "yearly_inr", "lifetime_inr", "lifetime_enabled",
              "monthly_sku", "yearly_sku", "lifetime_sku"):
        if k in d:
            pricing[k] = d[k]
    # Rewarded fields
    if "rewarded_bonus_per_ad" in d:      rewarded["bonus_per_ad"]      = d["rewarded_bonus_per_ad"]
    if "rewarded_max_per_day" in d:       rewarded["max_bonus_per_day"] = d["rewarded_max_per_day"]
    if "rewarded_cooldown_seconds" in d:  rewarded["cooldown_seconds"]  = d["rewarded_cooldown_seconds"]
    # Endpoint limits
    if "free_endpoint_limits" in d:
        endpoint_limits.update({k: int(v) for k, v in d["free_endpoint_limits"].items()})

    await ut.update_state({
        "pricing": pricing,
        "rewarded": rewarded,
        "free_endpoint_limits": endpoint_limits,
    })
    return {
        "ok": True,
        "pricing": pricing,
        "rewarded": rewarded,
        "free_endpoint_limits": endpoint_limits,
    }
