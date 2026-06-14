"""System / Admin routes — kill switch, config, usage stats.

Public:
- GET  /api/system/config — current kill-switch flags (used by frontend bootstrap)
- GET  /api/system/usage  — today's usage summary (open to logged-in users)

Admin-only (header X-Admin-Email must match env var ADMIN_EMAILS):
- POST /api/system/admin-toggle — flip flags / change budget / set maintenance msg
"""
from __future__ import annotations

import os
from typing import Optional
from fastapi import APIRouter, Header, HTTPException
from pydantic import BaseModel, Field

import usage_tracker as ut

router = APIRouter(prefix="/system")

ADMIN_EMAILS = {e.strip().lower() for e in os.environ.get("ADMIN_EMAILS", "").split(",") if e.strip()}


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
