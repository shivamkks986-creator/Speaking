"""Iteration 24 backend tests — 3-day trial banner + per-plan quota enforcement.

Covers:
- GET /api/system/pricing: monthly.trial_days, cta, badge, feature[0], yearly.trial_days
- usage_tracker.get_user_active_plan: fresh uid, after verify, expired sub
- GET /api/system/quota: free vs monthly/yearly/lifetime caps
- check_user_quota: cap enforcement, is_premium+no plan fallback, auto plan lookup
- Regression: free tier caps unchanged
"""
from __future__ import annotations

import os
import sys
import uuid
import asyncio
from datetime import datetime, timezone, timedelta
from pathlib import Path

import pytest
import requests

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

# Load backend/.env so usage_tracker can import
_backend_env = Path(__file__).resolve().parents[1] / ".env"
if _backend_env.exists():
    for _line in _backend_env.read_text().splitlines():
        if "=" in _line and not _line.strip().startswith("#"):
            _k, _v = _line.split("=", 1)
            os.environ.setdefault(_k.strip(), _v.strip().strip('"').strip("'"))

BASE_URL = os.environ["REACT_APP_BACKEND_URL"].rstrip("/") if os.environ.get("REACT_APP_BACKEND_URL") else "http://localhost:8001"
if not BASE_URL.startswith("http"):
    BASE_URL = "http://localhost:8001"

# Fallback: read from frontend/.env
if "REACT_APP_BACKEND_URL" not in os.environ:
    env_path = Path("/app/frontend/.env")
    if env_path.exists():
        for line in env_path.read_text().splitlines():
            if line.startswith("REACT_APP_BACKEND_URL="):
                BASE_URL = line.split("=", 1)[1].strip().rstrip("/")


API = f"{BASE_URL}/api/system"


@pytest.fixture(scope="module")
def s():
    return requests.Session()


# ---------------------------- /pricing tests ---------------------------

class TestPricing:
    def test_monthly_trial_days_and_cta(self, s):
        r = s.get(f"{API}/pricing", timeout=10)
        assert r.status_code == 200, r.text
        data = r.json()
        monthly = data["plans"]["monthly"]
        assert monthly["trial_days"] == 3
        assert monthly["cta"] == "Start 3-day free trial"
        assert monthly["badge"] == "3-Day Free Trial"

    def test_monthly_first_feature_trial(self, s):
        r = s.get(f"{API}/pricing", timeout=10)
        f0 = r.json()["plans"]["monthly"]["features"][0]
        assert f0["label"] == "3-day free trial"
        assert f0.get("note") == "New subscribers only"
        assert f0["included"] is True

    def test_yearly_trial_days_none(self, s):
        r = s.get(f"{API}/pricing", timeout=10)
        assert r.json()["plans"]["yearly"].get("trial_days") in (None,)
        assert r.json()["plans"]["lifetime"].get("trial_days") in (None,)


# ------------------- usage_tracker unit tests (async) -----------------

@pytest.fixture(scope="module")
def event_loop():
    loop = asyncio.new_event_loop()
    yield loop
    loop.close()


def _run(coro):
    return asyncio.get_event_loop().run_until_complete(coro)


class TestGetUserActivePlan:
    def test_fresh_uid_returns_none(self):
        import usage_tracker as ut
        uid = f"qa-iter24-fresh-{uuid.uuid4()}"
        assert _run(ut.get_user_active_plan(uid)) is None

    def test_after_verify_returns_plan(self, s):
        import usage_tracker as ut
        uid = f"qa-iter24-verify-{uuid.uuid4()}"
        r = s.post(
            f"{API}/subscription/verify",
            json={"product_id": "premium_monthly", "purchase_token": f"tok-{uuid.uuid4()}"},
            headers={"X-User-Id": uid},
            timeout=15,
        )
        assert r.status_code == 200, r.text
        assert _run(ut.get_user_active_plan(uid)) == "monthly"

    def test_expired_sub_returns_none(self):
        import usage_tracker as ut
        from motor.motor_asyncio import AsyncIOMotorClient
        uid = f"qa-iter24-expired-{uuid.uuid4()}"
        db = AsyncIOMotorClient(os.environ["MONGO_URL"])[os.environ["DB_NAME"]]
        past = (datetime.now(timezone.utc) - timedelta(days=1)).isoformat()

        async def seed():
            await db.subscriptions.insert_one({
                "uid": uid, "plan": "monthly", "active": True,
                "expires_at": past,
                "granted_at": past, "purchase_token": "expired-tok",
                "product_id": "premium_monthly", "source": "test",
            })
        _run(seed())
        assert _run(ut.get_user_active_plan(uid)) is None


# ---------------------------- /quota tests ----------------------------

class TestQuotaEndpoint:
    def test_free_user_tutor_chat_limit_10(self, s):
        uid = f"qa-iter24-free-{uuid.uuid4()}"
        r = s.get(f"{API}/quota", headers={"X-User-Id": uid}, timeout=10)
        assert r.status_code == 200, r.text
        d = r.json()
        assert d.get("is_premium") is False
        assert d["per_endpoint"]["tutor_chat"]["limit"] == 10
        assert d["per_endpoint"]["roadmap_generate"]["limit"] == 1
        assert d["per_endpoint"]["speaking_score"]["limit"] == 5

    def _verify(self, s, uid, sku):
        r = s.post(
            f"{API}/subscription/verify",
            json={"product_id": sku, "purchase_token": f"tok-{uuid.uuid4()}"},
            headers={"X-User-Id": uid},
            timeout=15,
        )
        assert r.status_code == 200, r.text

    def test_monthly_premium_caps(self, s):
        uid = f"qa-iter24-m-{uuid.uuid4()}"
        self._verify(s, uid, "premium_monthly")
        r = s.get(f"{API}/quota", headers={"X-User-Id": uid, "X-Is-Premium": "true"}, timeout=10)
        d = r.json()
        assert d["is_premium"] is True
        assert d["plan"] == "monthly"
        assert d["per_endpoint"]["tutor_chat"]["limit"] == 30
        assert d["per_endpoint"]["roadmap_generate"]["limit"] == 2

    def test_yearly_premium_caps(self, s):
        uid = f"qa-iter24-y-{uuid.uuid4()}"
        self._verify(s, uid, "premium_yearly")
        r = s.get(f"{API}/quota", headers={"X-User-Id": uid, "X-Is-Premium": "true"}, timeout=10)
        d = r.json()
        assert d["plan"] == "yearly"
        assert d["per_endpoint"]["tutor_chat"]["limit"] == 100
        assert d["per_endpoint"]["roadmap_generate"]["limit"] == 5

    def test_lifetime_premium_caps(self, s):
        uid = f"qa-iter24-l-{uuid.uuid4()}"
        self._verify(s, uid, "premium_lifetime")
        r = s.get(f"{API}/quota", headers={"X-User-Id": uid, "X-Is-Premium": "true"}, timeout=10)
        d = r.json()
        assert d["plan"] == "lifetime"
        assert d["per_endpoint"]["tutor_chat"]["limit"] == 100
        assert d["per_endpoint"]["roadmap_generate"]["limit"] == 5


# --------------------- check_user_quota logic tests ---------------------

class TestCheckUserQuota:
    def test_premium_monthly_31st_call_exceeds(self):
        import usage_tracker as ut
        uid = f"qa-iter24-cap-{uuid.uuid4()}"

        async def run():
            # Simulate 30 tutor_chat calls
            for _ in range(30):
                await ut.record_user_call(uid, endpoint="tutor_chat")
            # 30 calls used, cap 30 -> next should exceed
            r = await ut.check_user_quota(uid, is_premium=True, endpoint="tutor_chat", plan="monthly")
            return r
        result = _run(run())
        assert result is not None
        assert result.startswith("plan_quota_exceeded:monthly:tutor_chat:")

    def test_premium_monthly_within_cap(self):
        import usage_tracker as ut
        uid = f"qa-iter24-under-{uuid.uuid4()}"

        async def run():
            for _ in range(5):
                await ut.record_user_call(uid, endpoint="tutor_chat")
            return await ut.check_user_quota(uid, is_premium=True, endpoint="tutor_chat", plan="monthly")
        assert _run(run()) is None

    def test_premium_no_plan_unlimited_fallback(self):
        import usage_tracker as ut
        uid = f"qa-iter24-noplan-{uuid.uuid4()}"
        # No subscription doc → premium but plan=None → unlimited fallback
        result = _run(ut.check_user_quota(uid, is_premium=True, endpoint="tutor_chat", plan=None))
        assert result is None

    def test_auto_plan_lookup_from_db(self, s):
        import usage_tracker as ut
        uid = f"qa-iter24-auto-{uuid.uuid4()}"
        r = s.post(
            f"{API}/subscription/verify",
            json={"product_id": "premium_yearly", "purchase_token": f"tok-{uuid.uuid4()}"},
            headers={"X-User-Id": uid}, timeout=15,
        )
        assert r.status_code == 200

        async def run():
            # No plan passed → should look up from DB → yearly cap = 100
            for _ in range(50):
                await ut.record_user_call(uid, endpoint="tutor_chat")
            return await ut.check_user_quota(uid, is_premium=True, endpoint="tutor_chat")
        assert _run(run()) is None  # 50 < 100

    def test_free_tier_still_10(self):
        import usage_tracker as ut
        uid = f"qa-iter24-freecap-{uuid.uuid4()}"

        async def run():
            for _ in range(10):
                await ut.record_user_call(uid, endpoint="tutor_chat")
            return await ut.check_user_quota(uid, is_premium=False, endpoint="tutor_chat")
        result = _run(run())
        assert result is not None
        assert result.startswith("endpoint_quota_exceeded:tutor_chat:")


# ---------------------------- regression -----------------------------

class TestRegression:
    def test_pricing_skus_unchanged(self, s):
        d = s.get(f"{API}/pricing", timeout=10).json()
        assert d["monthly_sku"] == "premium_monthly"
        assert d["yearly_sku"] == "premium_yearly"
        assert d["lifetime_sku"] == "premium_lifetime"
        assert d["monthly_inr"] == 149
        assert d["yearly_inr"] == 799
        assert d["lifetime_inr"] == 1499

    def test_rewarded_premium_no_bonus(self, s):
        uid = f"qa-iter24-rew-{uuid.uuid4()}"
        r = s.post(
            f"{API}/rewarded/claim", json={"endpoint": "tutor_chat"},
            headers={"X-User-Id": uid, "X-Is-Premium": "true"}, timeout=10,
        )
        assert r.status_code == 200
        assert r.json()["ok"] is False
        assert r.json()["reason"] == "premium_no_bonus_needed"

    def test_rewarded_ssv_missing_params(self, s):
        r = s.get(f"{API}/rewarded/ssv", timeout=10)
        assert r.status_code == 400

    def test_verify_unknown_product(self, s):
        r = s.post(
            f"{API}/subscription/verify",
            json={"product_id": "bogus_sku", "purchase_token": "x"},
            headers={"X-User-Id": "qa-iter24-bogus"}, timeout=10,
        )
        assert r.status_code == 400
