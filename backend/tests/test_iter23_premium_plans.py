"""Iteration 23 — SpeakMateAI Premium Plan Differentiation backend tests.

Covers:
- GET /api/system/pricing: new SKUs, plans config (monthly/yearly/lifetime),
  features, badges, CTAs.
- POST /api/system/subscription/verify: new SKUs return correct plan, old SKUs
  return 400 unknown_product.
- Legacy DB migration: /pricing forces new SKUs even if DB has stale ones.
- Regression: /api/system/quota, /api/system/rewarded/claim,
  /api/system/rewarded/ssv, /api/legal/privacy, /api/legal/data-deletion.
"""
from __future__ import annotations

import os
import uuid
from datetime import datetime, timedelta, timezone

import pytest
import requests
from pymongo import MongoClient

BASE_URL = os.environ["REACT_APP_BACKEND_URL"].rstrip("/")
MONGO_URL = os.environ["MONGO_URL"]
DB_NAME = os.environ["DB_NAME"]


@pytest.fixture(scope="module")
def api():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


@pytest.fixture(scope="module")
def db():
    return MongoClient(MONGO_URL)[DB_NAME]


# =============================================================================
# /api/system/pricing — SKUs, plans, features, badges, CTAs
# =============================================================================
class TestPricing:
    def test_pricing_returns_200_with_new_skus(self, api):
        r = api.get(f"{BASE_URL}/api/system/pricing")
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["monthly_sku"] == "premium_monthly"
        assert d["yearly_sku"] == "premium_yearly"
        assert d["lifetime_sku"] == "premium_lifetime"

    def test_pricing_plans_structure(self, api):
        d = api.get(f"{BASE_URL}/api/system/pricing").json()
        plans = d["plans"]
        assert set(plans.keys()) == {"monthly", "yearly", "lifetime"}
        for key, plan in plans.items():
            for f in ("title", "cta", "billing_period", "badge", "features"):
                assert f in plan, f"plan {key} missing {f}"
            assert isinstance(plan["features"], list)

    def test_monthly_has_3_locked_features(self, api):
        d = api.get(f"{BASE_URL}/api/system/pricing").json()
        locked = [f for f in d["plans"]["monthly"]["features"] if not f["included"]]
        assert len(locked) == 3, f"expected 3 locked, got {len(locked)}: {locked}"
        labels = {f["label"] for f in locked}
        assert "30-Day Job Ready Roadmap" in labels or any("Roadmap" in l for l in labels)
        assert any("progress reports" in l.lower() for l in labels)
        assert any("priority access" in l.lower() for l in labels)

    def test_yearly_all_included(self, api):
        d = api.get(f"{BASE_URL}/api/system/pricing").json()
        locked = [f for f in d["plans"]["yearly"]["features"] if not f["included"]]
        assert len(locked) == 0
        assert len(d["plans"]["yearly"]["features"]) == 10

    def test_yearly_badge_best_value(self, api):
        d = api.get(f"{BASE_URL}/api/system/pricing").json()
        assert d["plans"]["yearly"]["badge"] == "Best Value"

    def test_lifetime_badge_save_forever(self, api):
        d = api.get(f"{BASE_URL}/api/system/pricing").json()
        assert d["plans"]["lifetime"]["badge"] == "Save Forever"

    def test_cta_strings_exact(self, api):
        d = api.get(f"{BASE_URL}/api/system/pricing").json()
        assert d["plans"]["monthly"]["cta"] == "Subscribe for \u20b9149/month"
        assert d["plans"]["yearly"]["cta"] == "Subscribe for \u20b9799/year"
        assert d["plans"]["lifetime"]["cta"] == "Get Lifetime Access for \u20b91499"


# =============================================================================
# /api/system/subscription/verify — new SKUs → plan mapping; old SKUs rejected
# =============================================================================
class TestSubscriptionVerify:
    def _post(self, api, product_id, uid=None):
        headers = {"X-User-Id": uid or f"qa-iter23-{uuid.uuid4().hex[:8]}"}
        return api.post(
            f"{BASE_URL}/api/system/subscription/verify",
            json={"product_id": product_id, "purchase_token": f"tok-{uuid.uuid4().hex}"},
            headers=headers,
        )

    def test_premium_monthly_returns_plan_monthly(self, api):
        r = self._post(api, "premium_monthly")
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["plan"] == "monthly"
        assert d["is_premium"] is True

    def test_premium_yearly_returns_plan_yearly(self, api):
        r = self._post(api, "premium_yearly")
        assert r.status_code == 200, r.text
        assert r.json()["plan"] == "yearly"

    def test_premium_lifetime_returns_plan_lifetime_far_future(self, api):
        r = self._post(api, "premium_lifetime")
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["plan"] == "lifetime"
        exp = datetime.fromisoformat(d["expires_at"].replace("Z", "+00:00"))
        # far-future = > 50 years from now
        assert exp - datetime.now(timezone.utc) > timedelta(days=365 * 50)

    def test_old_sku_rejected(self, api):
        r = self._post(api, "speakmate_monthly_149")
        assert r.status_code == 400
        assert "unknown_product" in r.text


# =============================================================================
# Legacy DB migration — force-migrate stale SKUs on /pricing call
# =============================================================================
class TestLegacyMigration:
    def test_stale_skus_are_migrated(self, api, db):
        # Corrupt the pricing subdoc with legacy SKUs and remove plans/per_plan
        db.system_state.update_one(
            {"_id": "config"},
            {"$set": {
                "pricing.monthly_sku": "speakmate_monthly_149",
                "pricing.yearly_sku": "speakmate_yearly_799",
                "pricing.lifetime_sku": "speakmate_lifetime_1499",
            }, "$unset": {"pricing.plans": "", "pricing.per_plan_daily_limits": ""}},
            upsert=True,
        )
        # Sanity: DB has legacy state
        cur = db.system_state.find_one({"_id": "config"})
        assert cur["pricing"]["monthly_sku"] == "speakmate_monthly_149"
        assert "plans" not in cur["pricing"]

        # Hit /pricing → migration should occur
        r = api.get(f"{BASE_URL}/api/system/pricing")
        assert r.status_code == 200
        d = r.json()
        assert d["monthly_sku"] == "premium_monthly"
        assert d["yearly_sku"] == "premium_yearly"
        assert d["lifetime_sku"] == "premium_lifetime"

        # Verify persisted migration in DB
        cur = db.system_state.find_one({"_id": "config"})
        assert cur["pricing"]["monthly_sku"] == "premium_monthly"
        assert "plans" in cur["pricing"]
        assert "per_plan_daily_limits" in cur["pricing"]


# =============================================================================
# Regression — quota, rewarded, legal, AI endpoints
# =============================================================================
class TestRegression:
    def test_quota(self, api):
        uid = f"qa-iter23-quota-{uuid.uuid4().hex[:8]}"
        r = api.get(f"{BASE_URL}/api/system/quota", headers={"X-User-Id": uid})
        assert r.status_code == 200
        d = r.json()
        assert d["uid"] == uid
        assert d["is_premium"] is False
        assert "per_endpoint" in d

    def test_rewarded_claim_no_user(self, api):
        r = api.post(f"{BASE_URL}/api/system/rewarded/claim", json={})
        assert r.status_code == 401

    def test_rewarded_claim_premium_no_bonus(self, api):
        uid = f"qa-iter23-rc-{uuid.uuid4().hex[:8]}"
        r = api.post(
            f"{BASE_URL}/api/system/rewarded/claim",
            json={},
            headers={"X-User-Id": uid, "X-Is-Premium": "true"},
        )
        assert r.status_code == 200
        assert r.json()["reason"] == "premium_no_bonus_needed"

    def test_rewarded_ssv_missing_params(self, api):
        r = api.get(f"{BASE_URL}/api/system/rewarded/ssv")
        assert r.status_code == 400

    def test_legal_privacy(self, api):
        r = api.get(f"{BASE_URL}/api/legal/privacy")
        assert r.status_code == 200
        # Content check
        ct = r.headers.get("content-type", "")
        assert "html" in ct.lower() or "text" in ct.lower() or "json" in ct.lower()

    def test_legal_data_deletion(self, api):
        r = api.get(f"{BASE_URL}/api/legal/data-deletion")
        assert r.status_code == 200

    def test_tutor_chat_smoke(self, api):
        uid = f"qa-iter23-tc-{uuid.uuid4().hex[:8]}"
        r = api.post(
            f"{BASE_URL}/api/ai/tutor/chat",
            json={"message": "Say hi in one word.", "session_id": f"s-{uuid.uuid4().hex[:6]}"},
            headers={"X-User-Id": uid},
            timeout=60,
        )
        # Accept 200 or 503 (budget) — must not 5xx crash
        assert r.status_code in (200, 429, 503), r.text
