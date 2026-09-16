"""System / Admin routes — kill switch, config, usage stats, subscription & rewarded ads.

Public:
- GET  /api/system/config     — kill-switch flags (used by frontend bootstrap)
- GET  /api/system/pricing    — subscription plan prices + SKUs (used by PremiumScreen)
- GET  /api/system/usage      — today's usage summary
- GET  /api/system/quota      — per-user quota status
- POST /api/system/subscription/verify — verify Play Store receipt & activate premium (stub)
- POST /api/system/subscription/restore — restore purchase (looks up premium from DB)
- POST /api/system/rewarded/claim — grant rewarded-ad bonus quota

Admin-only (header X-Admin-Email must match env var ADMIN_EMAILS):
- POST /api/system/admin-toggle — flip flags / change budget / set maintenance msg
- POST /api/system/admin-pricing — configure subscription prices, SKUs, quotas
"""
from __future__ import annotations

import os
from datetime import datetime, timezone
from typing import Any, Optional
from fastapi import APIRouter, Header, HTTPException
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field

import usage_tracker as ut

router = APIRouter(prefix="/system")

ADMIN_EMAILS = {e.strip().lower() for e in os.environ.get("ADMIN_EMAILS", "").split(",") if e.strip()}
_db = AsyncIOMotorClient(os.environ["MONGO_URL"])[os.environ["DB_NAME"]]


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
async def user_quota(
    x_user_id: Optional[str] = Header(default=None),
    x_is_premium: Optional[str] = Header(default=None),
):
    """Returns the calling user's daily quota status (used/limit/remaining)."""
    is_premium = (x_is_premium or "").lower() in {"1", "true", "yes"}
    return await ut.get_user_quota_status(x_user_id, is_premium)


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

class PricingResponse(BaseModel):
    monthly_inr: int
    yearly_inr: int
    lifetime_inr: int
    lifetime_enabled: bool
    monthly_sku: str
    yearly_sku: str
    lifetime_sku: str


@router.get("/pricing", response_model=PricingResponse)
async def pricing():
    """Public: subscription prices + SKUs. Frontend PremiumScreen calls this."""
    state = await ut.get_state()
    p = state.get("pricing", {})
    return PricingResponse(
        monthly_inr=int(p.get("monthly_inr", 149)),
        yearly_inr=int(p.get("yearly_inr", 799)),
        lifetime_inr=int(p.get("lifetime_inr", 1499)),
        lifetime_enabled=bool(p.get("lifetime_enabled", True)),
        monthly_sku=str(p.get("monthly_sku", "speakmate_monthly_149")),
        yearly_sku=str(p.get("yearly_sku", "speakmate_yearly_799")),
        lifetime_sku=str(p.get("lifetime_sku", "speakmate_lifetime_1499")),
    )


class SubscriptionVerifyPayload(BaseModel):
    """Payload sent by app after a successful Google Play purchase."""
    product_id: str      # e.g. "speakmate_monthly_149"
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
    x_user_id: Optional[str] = Header(default=None),
):
    """Verify a Play Store receipt server-side and mark user as premium.

    IMPORTANT: This is currently a STUB that trusts the client-supplied token.
    Before production launch, integrate Google Play Developer API v3 (see
    https://developers.google.com/android-publisher/api-ref/rest/v3/purchases.subscriptions/get)
    and validate `purchase_token` against the `product_id`. Reject expired,
    revoked, or fraudulent tokens.
    """
    if not x_user_id:
        raise HTTPException(status_code=401, detail="user_id_required")
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

    from datetime import timedelta
    now = datetime.now(timezone.utc)
    expires = (now + timedelta(days=days)).isoformat()

    doc = {
        "uid": x_user_id,
        "product_id": payload.product_id,
        "purchase_token": payload.purchase_token,
        "order_id": payload.order_id,
        "plan": plan,
        "granted_at": now.isoformat(),
        "expires_at": expires,
        "source": "play_billing",
        "active": True,
    }
    await _db.subscriptions.update_one(
        {"uid": x_user_id, "purchase_token": payload.purchase_token},
        {"$set": doc},
        upsert=True,
    )
    return SubscriptionStatus(is_premium=True, plan=plan, expires_at=expires, source="play_billing")


@router.post("/subscription/restore", response_model=SubscriptionStatus)
async def subscription_restore(x_user_id: Optional[str] = Header(default=None)):
    """Look up user's most recent active subscription (used by 'Restore Purchases')."""
    if not x_user_id:
        raise HTTPException(status_code=401, detail="user_id_required")
    now = datetime.now(timezone.utc).isoformat()
    sub = await _db.subscriptions.find_one(
        {"uid": x_user_id, "active": True, "expires_at": {"$gte": now}},
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
    x_user_id: Optional[str] = Header(default=None),
    x_is_premium: Optional[str] = Header(default=None),
):
    """Called by app after a rewarded ad completes.

    IMPORTANT: This trusts the client for now. Before launch, verify SSV
    (Server-Side Verification) signature from AdMob via
    https://developers.google.com/admob/android/rewarded-ssv.
    Premium users get no bonus (they're already unlimited).
    """
    if not x_user_id:
        raise HTTPException(status_code=401, detail="user_id_required")
    is_premium = (x_is_premium or "").lower() in {"1", "true", "yes"}
    if is_premium:
        return RewardedResponse(ok=False, reason="premium_no_bonus_needed")
    result = await ut.grant_rewarded_bonus(x_user_id, endpoint=payload.endpoint)
    return RewardedResponse(**result)


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
