"""Usage tracker + budget kill switch for SpeakMate AI backend.

Tracks daily API calls per endpoint AND per user in MongoDB. Auto-disables
the AI endpoints when:
  • daily INR budget is exhausted (global kill), OR
  • a single user exceeds their daily free quota (soft paywall — upsells to premium).

Admin can also force a shutdown via the `force_disabled` flag in `system_state`.

Schema:
- Collection `api_usage` (one doc per day per endpoint):
    { date: "YYYY-MM-DD", endpoint, calls, estimated_cost_inr }
- Collection `user_usage` (one doc per user per day):
    { uid, date, calls }
- Collection `system_state` (single doc, _id="config"):
    { global_ai_enabled, force_disabled, daily_budget_inr,
      user_daily_free_limit, maintenance_message, updated_at }
"""
from __future__ import annotations

import os
from datetime import datetime, timezone
from typing import Optional
from motor.motor_asyncio import AsyncIOMotorClient

# Re-use the same client instance as server.py (lazy connection via env vars).
_mongo_url = os.environ["MONGO_URL"]
_db_name = os.environ["DB_NAME"]
_client = AsyncIOMotorClient(_mongo_url)
_db = _client[_db_name]

# Default budget — admin can override via /api/system/admin-toggle.
DEFAULT_DAILY_BUDGET_INR = float(os.environ.get("DAILY_BUDGET_INR", "500"))
DEFAULT_USER_DAILY_LIMIT = int(os.environ.get("USER_DAILY_FREE_LIMIT", "30"))

# Rough INR cost estimates per call by endpoint.
# Tune these as you learn real usage. Conservative estimates below.
COST_TABLE = {
    "tutor_chat": 1.8,
    "speaking_score": 2.4,
    "interview_live": 3.0,
    "vocabulary_lookup": 0.5,
    "word_of_day": 0.3,
    "stt": 1.2,
    "tts": 0.4,
}


def _today_key() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%d")


async def _get_state() -> dict:
    """Load (or seed) the single `system_state.config` document. Also backfills
    newly-added fields onto existing docs so /pricing and /verify stay consistent."""
    doc = await _db.system_state.find_one({"_id": "config"}, {"_id": 0})
    defaults = {
        "global_ai_enabled": True,
        "force_disabled": False,
        "daily_budget_inr": DEFAULT_DAILY_BUDGET_INR,
        "user_daily_free_limit": DEFAULT_USER_DAILY_LIMIT,
        "maintenance_message": "We're temporarily upgrading our AI servers. Please try again in a few hours!",
        "pricing": {
            "monthly_inr": 149,
            "yearly_inr": 799,
            "lifetime_inr": 1499,
            "lifetime_enabled": True,
            "monthly_sku": "premium_monthly",
            "yearly_sku": "premium_yearly",
            "lifetime_sku": "premium_lifetime",
            "plans": {
                "monthly": {
                    "title": "Monthly Premium",
                    "cta": "Start 3-day free trial",
                    "billing_period": "Free 3 days, then \u20b9149/month. Cancel anytime.",
                    "badge": "3-Day Free Trial",
                    "trial_days": 3,
                    "features": [
                        {"label": "3-day free trial", "included": True, "note": "New subscribers only"},
                        {"label": "Ad-free experience", "included": True},
                        {"label": "AI speaking practice", "included": True, "note": "Limited"},
                        {"label": "AI companion access", "included": True, "note": "Expanded"},
                        {"label": "AI Mock Interview", "included": True},
                        {"label": "TMAY Trainer", "included": True},
                        {"label": "Sales & Counselling Roleplay", "included": True},
                        {"label": "Resume-based interviews", "included": True},
                        {"label": "30-Day Job Ready Roadmap", "included": False, "note": "Yearly & Lifetime only"},
                        {"label": "Advanced progress reports", "included": False},
                        {"label": "Priority access to new features", "included": False},
                    ],
                },
                "yearly": {
                    "title": "Yearly Premium",
                    "cta": "Subscribe for \u20b9799/year",
                    "billing_period": "Renews yearly \u00b7 save 55%",
                    "badge": "Best Value",
                    "features": [
                        {"label": "Ad-free experience", "included": True},
                        {"label": "AI speaking practice", "included": True, "note": "Higher limits"},
                        {"label": "AI companion access", "included": True, "note": "All companions"},
                        {"label": "AI Mock Interview", "included": True},
                        {"label": "TMAY Trainer", "included": True},
                        {"label": "Sales & Counselling Roleplay", "included": True},
                        {"label": "Resume-based interviews", "included": True},
                        {"label": "30-Day Job Ready Roadmap", "included": True},
                        {"label": "Advanced progress reports", "included": True},
                        {"label": "Priority access to new features", "included": True},
                    ],
                },
                "lifetime": {
                    "title": "Lifetime Premium",
                    "cta": "Get Lifetime Access for \u20b91499",
                    "billing_period": "One-time payment \u00b7 no renewals",
                    "badge": "Save Forever",
                    "features": [
                        {"label": "All Premium features", "included": True},
                        {"label": "Ad-free forever", "included": True},
                        {"label": "One-time payment", "included": True, "note": "No recurring charges"},
                        {"label": "Lifetime access to current features", "included": True},
                        {"label": "AI usage limits", "included": True, "note": "Same as Yearly"},
                        {"label": "Future features may be added", "included": True, "note": "Subject to change"},
                    ],
                },
            },
            "per_plan_daily_limits": {
                "monthly": {"tutor_chat": 30, "speaking_score": 15, "interview_live": 5, "interview_evaluate": 15, "tmay_evaluate": 10, "resume_parse": 3, "resume_interview_questions": 3, "sales_session": 5, "roadmap_generate": 2, "vocabulary_lookup": 100},
                "yearly": {"tutor_chat": 100, "speaking_score": 50, "interview_live": 20, "interview_evaluate": 50, "tmay_evaluate": 30, "resume_parse": 10, "resume_interview_questions": 10, "sales_session": 20, "roadmap_generate": 5, "vocabulary_lookup": 500},
                "lifetime": {"tutor_chat": 100, "speaking_score": 50, "interview_live": 20, "interview_evaluate": 50, "tmay_evaluate": 30, "resume_parse": 10, "resume_interview_questions": 10, "sales_session": 20, "roadmap_generate": 5, "vocabulary_lookup": 500},
            },
        },
        "free_endpoint_limits": {
            "tutor_chat": 10, "speaking_score": 5, "interview_live": 2,
            "interview_evaluate": 5, "tmay_evaluate": 3, "resume_parse": 1,
            "resume_interview_questions": 1, "sales_session": 2,
            "roadmap_generate": 1, "vocabulary_lookup": 20,
        },
        "rewarded": {
            "bonus_per_ad": 3,
            "max_bonus_per_day": 15,
            "cooldown_seconds": 60,
        },
    }
    if doc:
        # Backfill any missing keys onto legacy docs (idempotent).
        patch = {}
        for k, v in defaults.items():
            if doc.get(k) is None:
                patch[k] = v
        # Force-migrate pricing subkeys (legacy SKUs → premium_* + plans + per_plan_daily_limits)
        pricing = doc.get("pricing") or {}
        expected_skus = {
            "monthly_sku": defaults["pricing"]["monthly_sku"],
            "yearly_sku": defaults["pricing"]["yearly_sku"],
            "lifetime_sku": defaults["pricing"]["lifetime_sku"],
        }
        pricing_migrated = False
        for k, v in expected_skus.items():
            # Also treat None / empty as "needs migration" — guards against
            # corrupted docs where a SKU was explicitly nulled.
            if not pricing.get(k) or pricing.get(k) != v:
                pricing[k] = v
                pricing_migrated = True
        for k in ("plans", "per_plan_daily_limits"):
            if k not in pricing or not pricing[k]:
                pricing[k] = defaults["pricing"][k]
                pricing_migrated = True
        # Force-refresh the plans subconfig if any plan is missing new keys
        # (e.g. trial_days added later). Cheap way: check monthly.trial_days.
        expected_plans = defaults["pricing"]["plans"]
        current_plans = pricing.get("plans") or {}
        if (current_plans.get("monthly") or {}).get("trial_days") != expected_plans["monthly"].get("trial_days"):
            pricing["plans"] = expected_plans
            pricing_migrated = True
        if pricing_migrated:
            patch["pricing"] = pricing
        if patch:
            patch["updated_at"] = datetime.now(timezone.utc).isoformat()
            await _db.system_state.update_one({"_id": "config"}, {"$set": patch}, upsert=True)
            doc = {**doc, **patch}
        return doc
    seed = {**defaults, "updated_at": datetime.now(timezone.utc).isoformat()}
    await _db.system_state.update_one({"_id": "config"}, {"$set": seed}, upsert=True)
    return seed


async def get_state() -> dict:
    return await _get_state()


async def update_state(patch: dict) -> dict:
    """Admin endpoint helper — partial update with audit timestamp."""
    patch = {**patch, "updated_at": datetime.now(timezone.utc).isoformat()}
    await _db.system_state.update_one({"_id": "config"}, {"$set": patch}, upsert=True)
    return await _get_state()


async def get_today_usage() -> dict:
    """Returns {total_calls, total_cost_inr, per_endpoint: {...}} for today UTC."""
    cursor = _db.api_usage.find({"date": _today_key()}, {"_id": 0})
    rows = await cursor.to_list(length=200)
    per: dict[str, dict] = {}
    total_calls = 0
    total_cost = 0.0
    for r in rows:
        ep = r.get("endpoint", "unknown")
        per[ep] = {"calls": int(r.get("calls", 0)), "cost_inr": float(r.get("estimated_cost_inr", 0))}
        total_calls += per[ep]["calls"]
        total_cost += per[ep]["cost_inr"]
    return {"date": _today_key(), "total_calls": total_calls, "total_cost_inr": round(total_cost, 2), "per_endpoint": per}


async def check_budget(endpoint: str) -> Optional[str]:
    """Returns None if call is allowed, otherwise a human-readable reason string."""
    state = await _get_state()
    if state.get("force_disabled"):
        return "force_disabled"
    if not state.get("global_ai_enabled", True):
        return "global_disabled"
    usage = await get_today_usage()
    budget = float(state.get("daily_budget_inr", DEFAULT_DAILY_BUDGET_INR))
    if usage["total_cost_inr"] >= budget:
        return f"daily_budget_exceeded:{usage['total_cost_inr']:.2f}/{budget:.2f} INR"
    return None


async def record_call(endpoint: str, override_cost_inr: Optional[float] = None) -> None:
    """Atomically increment today's call count + cost for a given endpoint."""
    cost = override_cost_inr if override_cost_inr is not None else COST_TABLE.get(endpoint, 1.0)
    await _db.api_usage.update_one(
        {"date": _today_key(), "endpoint": endpoint},
        {"$inc": {"calls": 1, "estimated_cost_inr": cost}},
        upsert=True,
    )


# ---------------------- per-user quota ----------------------

async def get_user_today(uid: str) -> int:
    """Returns how many AI calls this user has made today (UTC)."""
    doc = await _db.user_usage.find_one({"uid": uid, "date": _today_key()}, {"_id": 0, "calls": 1})
    return int((doc or {}).get("calls", 0))


async def get_user_active_plan(uid: Optional[str]) -> Optional[str]:
    """Returns the user's active subscription plan ('monthly'|'yearly'|'lifetime')
    or None if no active subscription. Reads from the `subscriptions` collection
    written by /api/system/subscription/verify. Cheapest possible query: pk on uid,
    only fetches the `plan` and `expires_at` fields.
    """
    if not uid:
        return None
    now_iso = datetime.now(timezone.utc).isoformat()
    doc = await _db.subscriptions.find_one(
        {"uid": uid, "active": True, "expires_at": {"$gte": now_iso}},
        {"_id": 0, "plan": 1},
        sort=[("granted_at", -1)],
    )
    if not doc:
        return None
    plan = doc.get("plan")
    return plan if plan in {"monthly", "yearly", "lifetime"} else None


async def check_user_quota(
    uid: Optional[str],
    is_premium: bool,
    endpoint: Optional[str] = None,
    plan: Optional[str] = None,
) -> Optional[str]:
    """Returns None if user has quota left, else a reason string.

    - Free users: `free_endpoint_limits` per endpoint + `user_daily_free_limit` global.
    - Premium users: `per_plan_daily_limits[plan]` per endpoint. Global unlimited.
      If plan is not provided or is missing from the config, premium falls back to
      "unlimited" (backwards-compatible with prior behaviour).

    Rewarded-ad bonuses stack on top of any limit.
    """
    state = await _get_state()

    if is_premium:
        # Resolve plan if not explicitly passed by the caller.
        resolved_plan = plan or await get_user_active_plan(uid)
        if not resolved_plan or not endpoint:
            return None  # No plan lookup possible → unlimited (safe default).
        pricing = state.get("pricing", {})
        limits = (pricing.get("per_plan_daily_limits") or {}).get(resolved_plan) or {}
        cap = limits.get(endpoint)
        if cap is None:
            return None  # Endpoint not capped for this plan → unlimited.
        ep_used = await get_user_endpoint_today(uid or "anonymous", endpoint)
        bonus = await get_user_bonus_today(uid or "anonymous", endpoint)
        if ep_used >= (int(cap) + bonus):
            return f"plan_quota_exceeded:{resolved_plan}:{endpoint}:{ep_used}/{int(cap) + bonus}"
        return None

    # ----- Free tier (unchanged) -----
    global_limit = int(state.get("user_daily_free_limit", DEFAULT_USER_DAILY_LIMIT))

    # Per-endpoint quota (tighter than global; premium ignores)
    if endpoint:
        endpoint_limits = state.get("free_endpoint_limits", {})
        ep_limit = endpoint_limits.get(endpoint)
        if ep_limit is not None:
            ep_used = await get_user_endpoint_today(uid or "anonymous", endpoint)
            bonus = await get_user_bonus_today(uid or "anonymous", endpoint)
            if ep_used >= (int(ep_limit) + bonus):
                return f"endpoint_quota_exceeded:{endpoint}:{ep_used}/{int(ep_limit) + bonus}"

    # Global daily call limit (across all endpoints)
    used = await get_user_today(uid or "anonymous")
    total_bonus = await get_user_bonus_today(uid or "anonymous", None)
    if used >= (global_limit + total_bonus):
        return f"user_quota_exceeded:{used}/{global_limit + total_bonus}"
    return None


async def get_user_endpoint_today(uid: str, endpoint: str) -> int:
    """Returns per-endpoint call count for this user today."""
    doc = await _db.user_endpoint_usage.find_one(
        {"uid": uid, "date": _today_key(), "endpoint": endpoint},
        {"_id": 0, "calls": 1},
    )
    return int((doc or {}).get("calls", 0))


async def get_user_bonus_today(uid: str, endpoint: Optional[str]) -> int:
    """Returns rewarded-ad bonus quota granted to user today (per-endpoint or global)."""
    query = {"uid": uid, "date": _today_key()}
    if endpoint:
        query["endpoint"] = endpoint
    cursor = _db.user_bonus.find(query, {"_id": 0, "bonus": 1})
    total = 0
    async for d in cursor:
        total += int(d.get("bonus", 0))
    return total


async def grant_rewarded_bonus(uid: str, endpoint: Optional[str] = None) -> dict:
    """Grants rewarded-ad bonus. Enforces daily cap + cooldown.
    Returns {ok, bonus_granted, total_bonus_today, remaining_bonus_slots}.
    """
    state = await _get_state()
    rw = state.get("rewarded", {})
    bonus_per_ad = int(rw.get("bonus_per_ad", 3))
    max_per_day = int(rw.get("max_bonus_per_day", 15))
    cooldown = int(rw.get("cooldown_seconds", 60))

    # Cooldown check: last bonus record for this user
    last = await _db.user_bonus.find_one(
        {"uid": uid, "date": _today_key()},
        sort=[("granted_at", -1)],
    )
    if last:
        try:
            last_dt = datetime.fromisoformat(str(last.get("granted_at", "")).replace("Z", "+00:00"))
            elapsed = (datetime.now(timezone.utc) - last_dt).total_seconds()
            if elapsed < cooldown:
                return {"ok": False, "reason": "cooldown", "wait_seconds": int(cooldown - elapsed)}
        except Exception:
            pass

    total_today = await get_user_bonus_today(uid, None)
    if total_today >= max_per_day:
        return {"ok": False, "reason": "daily_cap_reached", "bonus_today": total_today, "cap": max_per_day}

    granted = min(bonus_per_ad, max_per_day - total_today)
    await _db.user_bonus.insert_one({
        "uid": uid,
        "date": _today_key(),
        "endpoint": endpoint,   # None = global bonus
        "bonus": granted,
        "granted_at": datetime.now(timezone.utc).isoformat(),
    })
    return {
        "ok": True,
        "bonus_granted": granted,
        "total_bonus_today": total_today + granted,
        "remaining_bonus_slots": max(0, max_per_day - total_today - granted),
    }


async def record_user_call(uid: Optional[str], endpoint: Optional[str] = None) -> int:
    """Increments this user's daily counter. Returns the NEW count.
    Also records per-endpoint sub-count if endpoint is given."""
    key = uid or "anonymous"
    res = await _db.user_usage.find_one_and_update(
        {"uid": key, "date": _today_key()},
        {"$inc": {"calls": 1}},
        upsert=True,
        return_document=True,
    )
    # Track per-endpoint sub-count for enforcement
    if endpoint:
        await _db.user_endpoint_usage.update_one(
            {"uid": key, "date": _today_key(), "endpoint": endpoint},
            {"$inc": {"calls": 1}},
            upsert=True,
        )
    return int((res or {}).get("calls", 1))


async def get_user_quota_status(uid: Optional[str], is_premium: bool) -> dict:
    """Public view of a user's quota for the frontend status bar.
    Premium users now surface their per-plan caps (was -1 unlimited before)."""
    state = await _get_state()
    global_limit = int(state.get("user_daily_free_limit", DEFAULT_USER_DAILY_LIMIT))
    used = await get_user_today(uid or "anonymous")
    # Defensive default so pre-migration DB docs still work
    endpoint_limits = state.get("free_endpoint_limits") or {
        "tutor_chat": 10, "speaking_score": 5, "interview_live": 2,
        "interview_evaluate": 5, "tmay_evaluate": 3, "resume_parse": 1,
        "resume_interview_questions": 1, "sales_session": 2,
        "roadmap_generate": 1, "vocabulary_lookup": 20,
    }

    # Premium users: look up their plan and swap free_limits with plan-specific caps
    plan_limits: dict = {}
    active_plan: Optional[str] = None
    if is_premium:
        active_plan = await get_user_active_plan(uid)
        if active_plan:
            plan_limits = (state.get("pricing", {}).get("per_plan_daily_limits") or {}).get(active_plan) or {}

    # Per-endpoint used + bonus
    key = uid or "anonymous"
    per_endpoint: dict = {}
    for ep, lim in endpoint_limits.items():
        ep_used = await get_user_endpoint_today(key, ep)
        ep_bonus = await get_user_bonus_today(key, ep)
        # Effective limit: premium uses plan cap (or unlimited if plan unknown), free uses free cap.
        if is_premium:
            effective = plan_limits.get(ep, -1)  # -1 = unlimited if not capped
        else:
            effective = int(lim)
        remaining = -1 if effective == -1 else max(0, effective + ep_bonus - ep_used)
        per_endpoint[ep] = {
            "used": ep_used,
            "limit": effective,
            "bonus": ep_bonus,
            "remaining": remaining,
        }
    total_bonus = await get_user_bonus_today(key, None)
    return {
        "uid": key,
        "is_premium": is_premium,
        "plan": active_plan,
        "used": used,
        "limit": -1 if is_premium else global_limit,
        "bonus": total_bonus,
        "remaining": -1 if is_premium else max(0, global_limit + total_bonus - used),
        "per_endpoint": per_endpoint,
    }
