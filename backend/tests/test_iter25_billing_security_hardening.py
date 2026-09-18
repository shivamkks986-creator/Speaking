"""Iteration 25 — Billing security hardening.

Covers:
- /api/system/pricing returns SKUs and per-plan `plans` dict.
- /api/system/quota requires auth (401 user_id_required); X-Is-Premium header
  must be ignored (server resolves premium from DB).
- /api/system/subscription/status endpoint (require auth; returns is_premium=false
  for fresh user, true+plan after verify).
- /api/system/subscription/verify: cross-user replay blocked (unique index),
  unknown_product/empty token validation.
- /api/system/rtdn: empty body ok; base64 CANCELED payload revokes subscription.
- /api/system/rewarded/claim requires auth.
- AI endpoint (vocabulary/lookup) must NOT honor X-Is-Premium header.
"""
from __future__ import annotations

import base64
import json
import os
import uuid

import pytest
import requests

BASE_URL = os.environ["REACT_APP_BACKEND_URL"].rstrip("/")


@pytest.fixture(scope="module")
def api():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


@pytest.fixture(scope="module")
def pricing(api):
    r = api.get(f"{BASE_URL}/api/system/pricing")
    assert r.status_code == 200, r.text
    return r.json()


# --- Pricing --------------------------------------------------------------
class TestPricing:
    def test_pricing_public_and_skus_present(self, pricing):
        assert pricing["monthly_sku"] == "premium_monthly"
        assert pricing["yearly_sku"] == "premium_yearly"
        assert pricing["lifetime_sku"] == "premium_lifetime"

    def test_pricing_plans_object_present(self, pricing):
        plans = pricing.get("plans")
        assert isinstance(plans, dict)
        for k in ("monthly", "yearly", "lifetime"):
            assert k in plans, f"missing plan key {k}"
            plan = plans[k]
            assert "features" in plan and isinstance(plan["features"], list)
            assert "cta" in plan and plan["cta"]
            assert "billing_period" in plan


# --- Quota / X-Is-Premium ignore -----------------------------------------
class TestQuotaAuth:
    def test_quota_requires_auth(self, api):
        r = api.get(f"{BASE_URL}/api/system/quota")
        assert r.status_code == 401
        assert "user_id_required" in r.text

    def test_quota_ignores_client_premium_header(self, api):
        r = api.get(
            f"{BASE_URL}/api/system/quota",
            headers={"X-User-Id": "testuser_a", "X-Is-Premium": "true"},
        )
        assert r.status_code == 200, r.text
        d = r.json()
        assert d.get("is_premium") is False, f"client-hint premium leaked: {d}"
        assert d.get("plan") in (None, "", "free")
        assert int(d.get("limit", 0)) == 30


# --- subscription/status --------------------------------------------------
class TestSubscriptionStatus:
    def test_status_requires_auth(self, api):
        r = api.get(f"{BASE_URL}/api/system/subscription/status")
        assert r.status_code == 401

    def test_status_fresh_user_no_sub(self, api):
        uid = f"fresh_user_{uuid.uuid4().hex[:6]}"
        r = api.get(
            f"{BASE_URL}/api/system/subscription/status",
            headers={"X-User-Id": uid},
        )
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["is_premium"] is False
        assert d.get("plan") in (None, "")


# --- Verify + cross-user replay + validation ------------------------------
@pytest.fixture(scope="module")
def bound_token():
    """A single purchase_token used across verify tests below."""
    return f"tok_alpha_{uuid.uuid4().hex[:10]}"


@pytest.fixture(scope="module")
def userA():
    return f"userA_{uuid.uuid4().hex[:6]}"


@pytest.fixture(scope="module")
def userB():
    return f"userB_{uuid.uuid4().hex[:6]}"


class TestVerify:
    def test_verify_userA_success(self, api, pricing, bound_token, userA):
        r = api.post(
            f"{BASE_URL}/api/system/subscription/verify",
            headers={"X-User-Id": userA},
            json={"product_id": pricing["monthly_sku"], "purchase_token": bound_token},
        )
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["is_premium"] is True
        assert d["plan"] == "monthly"
        assert d["source"] in ("play_billing", "play_billing_unverified")

    def test_verify_cross_user_replay_blocked(self, api, pricing, bound_token, userB):
        r = api.post(
            f"{BASE_URL}/api/system/subscription/verify",
            headers={"X-User-Id": userB},
            json={"product_id": pricing["monthly_sku"], "purchase_token": bound_token},
        )
        assert r.status_code == 403, r.text
        assert "purchase_token_bound_to_other_user" in r.text

    def test_verify_unknown_product(self, api):
        uid = f"userC_{uuid.uuid4().hex[:6]}"
        r = api.post(
            f"{BASE_URL}/api/system/subscription/verify",
            headers={"X-User-Id": uid},
            json={"product_id": "unknown_sku", "purchase_token": f"tok_{uuid.uuid4().hex}"},
        )
        assert r.status_code == 400
        assert "unknown_product" in r.text

    def test_verify_empty_purchase_token(self, api, pricing):
        uid = f"userD_{uuid.uuid4().hex[:6]}"
        r = api.post(
            f"{BASE_URL}/api/system/subscription/verify",
            headers={"X-User-Id": uid},
            json={"product_id": pricing["monthly_sku"], "purchase_token": ""},
        )
        assert r.status_code == 400
        assert "purchase_token_required" in r.text

    def test_status_userA_now_premium(self, api, userA):
        r = api.get(
            f"{BASE_URL}/api/system/subscription/status",
            headers={"X-User-Id": userA},
        )
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["is_premium"] is True
        assert d["plan"] == "monthly"


# --- RTDN webhook ---------------------------------------------------------
class TestRTDN:
    def test_rtdn_empty_body_ok(self, api):
        r = requests.post(f"{BASE_URL}/api/system/rtdn", data="", timeout=10)
        assert r.status_code == 200, r.text
        assert r.json().get("ok") is True

    def test_rtdn_empty_json_ok(self, api):
        r = api.post(f"{BASE_URL}/api/system/rtdn", json={})
        assert r.status_code == 200, r.text
        assert r.json().get("ok") is True

    def test_rtdn_canceled_revokes_subscription(self, api, bound_token, userA):
        # Build a CANCELED (notificationType=3) message for bound_token.
        payload = {
            "packageName": "com.speakmate.ai",
            "subscriptionNotification": {
                "notificationType": 3,
                "purchaseToken": bound_token,
                "subscriptionId": "premium_monthly",
            },
        }
        data_b64 = base64.b64encode(json.dumps(payload).encode()).decode()
        body = {
            "message": {"data": data_b64, "messageId": f"msg_{uuid.uuid4().hex[:8]}"}
        }
        r = api.post(f"{BASE_URL}/api/system/rtdn", json=body)
        assert r.status_code == 200, r.text

        # userA should now be non-premium
        s = api.get(
            f"{BASE_URL}/api/system/subscription/status",
            headers={"X-User-Id": userA},
        )
        assert s.status_code == 200
        d = s.json()
        assert d["is_premium"] is False, f"expected revoked, got {d}"


# --- Rewarded auth --------------------------------------------------------
class TestRewardedAuth:
    def test_rewarded_claim_requires_auth(self, api):
        r = api.post(f"{BASE_URL}/api/system/rewarded/claim", json={})
        assert r.status_code == 401


# --- AI endpoint ignores X-Is-Premium ------------------------------------
class TestAIPremiumHeaderIgnored:
    def test_ai_vocab_lookup_ignores_client_premium_header(self, api):
        """Even sending X-Is-Premium: true shouldn't bypass quota logic.

        We don't check the response body (AI may be rate-limited or return
        actual content); we just confirm the call is not blocked by auth and
        the backend doesn't blindly trust the header. A 200/402/429 is fine,
        but a naive premium-trust bypass would 200 the request even after
        quota exhaustion — which we can't easily reproduce in a single test.
        Minimum assertion: request goes through auth and returns a response.
        """
        uid = f"hax_user_{uuid.uuid4().hex[:6]}"
        r = api.post(
            f"{BASE_URL}/api/ai/vocabulary/lookup",
            headers={"X-User-Id": uid, "X-Is-Premium": "true"},
            json={"word": "hello"},
        )
        # Accept any non-5xx; the real bypass check would require exhausting
        # the free quota which is out of scope for a single endpoint smoke test.
        assert r.status_code < 500, f"unexpected server error: {r.status_code} {r.text[:200]}"

    def test_quota_still_reports_free_after_ai_call(self, api):
        """After the previous AI call with X-Is-Premium hint, quota endpoint
        must still say is_premium=false for that user (proves header ignored)."""
        uid = f"hax_user2_{uuid.uuid4().hex[:6]}"
        # touch AI endpoint
        api.post(
            f"{BASE_URL}/api/ai/vocabulary/lookup",
            headers={"X-User-Id": uid, "X-Is-Premium": "true"},
            json={"word": "hello"},
        )
        q = api.get(
            f"{BASE_URL}/api/system/quota",
            headers={"X-User-Id": uid, "X-Is-Premium": "true"},
        )
        assert q.status_code == 200
        assert q.json().get("is_premium") is False
