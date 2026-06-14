"""Usage tracker + budget kill switch for SpeakMate AI backend.

Tracks daily API calls per endpoint in MongoDB and auto-disables the AI
endpoints when the daily INR budget is exceeded. Admin can also force a
shutdown via the `force_disabled` flag in `system_state` collection.

Schema:
- Collection `api_usage` (one doc per day per endpoint):
    { date: "YYYY-MM-DD", endpoint: "tutor|speaking|interview|...",
      calls: int, estimated_cost_inr: float }
- Collection `system_state` (single doc, _id="config"):
    { global_ai_enabled: bool, force_disabled: bool, daily_budget_inr: float,
      maintenance_message: str, updated_at: ISO string }
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
    """Load (or seed) the single `system_state.config` document."""
    doc = await _db.system_state.find_one({"_id": "config"}, {"_id": 0})
    if doc:
        return doc
    seed = {
        "global_ai_enabled": True,
        "force_disabled": False,
        "daily_budget_inr": DEFAULT_DAILY_BUDGET_INR,
        "maintenance_message": "We're temporarily upgrading our AI servers. Please try again in a few hours!",
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }
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
