"""Iteration 21 — hardening of /api/system/subscription/verify with play_verifier.

Covers:
- Fallback trust mode when GOOGLE_SERVICE_ACCOUNT_* env vars are absent
  (source='play_billing_unverified').
- Validation errors: unknown_product, purchase_token_required, user_id_required.
- MongoDB persistence + restore returns same source.
- Malformed GOOGLE_SERVICE_ACCOUNT_JSON => graceful fallback (unit test on module).
- play_verifier module import & _build_client() returns None with warning when no env.
- Configured-mode simulation: monkeypatch _build_client -> fake client to prove
  verify_purchase() routes to Play API path (subscriptions v2 + products).
- Regression: pricing, quota, rewarded/claim, legal endpoints still work.
"""
from __future__ import annotations

import importlib
import os
import sys
import uuid
import logging
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "http://localhost:8001").rstrip("/")
# Also expose backend module path for direct-import unit tests
sys.path.insert(0, "/app/backend")


# ------------------------------------------------------------------ fixtures
@pytest.fixture
def api():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


@pytest.fixture
def pricing(api):
    r = api.get(f"{BASE_URL}/api/system/pricing")
    assert r.status_code == 200, r.text
    return r.json()


# ==================================================================
# Fallback trust-mode behaviour (no GOOGLE_SERVICE_ACCOUNT_* in env)
# ==================================================================
class TestFallbackTrustMode:
    def test_env_not_configured(self):
        assert "GOOGLE_SERVICE_ACCOUNT_JSON" not in os.environ
        assert "GOOGLE_SERVICE_ACCOUNT_PATH" not in os.environ

    def test_verify_returns_unverified_source_monthly(self, api, pricing):
        uid = f"qa-verify-fallback-{uuid.uuid4().hex[:8]}"
        r = api.post(
            f"{BASE_URL}/api/system/subscription/verify",
            headers={"X-User-Id": uid},
            json={
                "product_id": pricing["monthly_sku"],
                "purchase_token": f"tok-{uuid.uuid4().hex}",
                "order_id": "GPA.1234-5678",
            },
        )
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["is_premium"] is True
        assert data["plan"] == "monthly"
        assert data["source"] == "play_billing_unverified"
        assert data["expires_at"]

    def test_verify_yearly_and_lifetime_source(self, api, pricing):
        for sku, plan in ((pricing["yearly_sku"], "yearly"),
                          (pricing["lifetime_sku"], "lifetime")):
            uid = f"qa-verify-fallback-{plan}-{uuid.uuid4().hex[:8]}"
            r = api.post(
                f"{BASE_URL}/api/system/subscription/verify",
                headers={"X-User-Id": uid},
                json={"product_id": sku, "purchase_token": f"tok-{uuid.uuid4().hex}"},
            )
            assert r.status_code == 200, r.text
            d = r.json()
            assert d["plan"] == plan
            assert d["source"] == "play_billing_unverified"

    def test_restore_returns_same_source(self, api, pricing):
        uid = f"qa-verify-restore-{uuid.uuid4().hex[:8]}"
        vr = api.post(
            f"{BASE_URL}/api/system/subscription/verify",
            headers={"X-User-Id": uid},
            json={"product_id": pricing["monthly_sku"],
                  "purchase_token": f"tok-{uuid.uuid4().hex}"},
        )
        assert vr.status_code == 200
        rr = api.post(f"{BASE_URL}/api/system/subscription/restore",
                      headers={"X-User-Id": uid})
        assert rr.status_code == 200, rr.text
        d = rr.json()
        assert d["is_premium"] is True
        assert d["plan"] == "monthly"
        assert d["source"] == "play_billing_unverified", \
            f"restore should propagate source, got {d}"


# ==================================================================
# Validation errors
# ==================================================================
class TestValidation:
    def test_missing_user_id(self, api, pricing):
        r = api.post(
            f"{BASE_URL}/api/system/subscription/verify",
            json={"product_id": pricing["monthly_sku"],
                  "purchase_token": "tok-x"},
        )
        assert r.status_code == 401
        assert "user_id_required" in r.text

    def test_empty_purchase_token(self, api, pricing):
        r = api.post(
            f"{BASE_URL}/api/system/subscription/verify",
            headers={"X-User-Id": f"qa-{uuid.uuid4().hex[:8]}"},
            json={"product_id": pricing["monthly_sku"], "purchase_token": ""},
        )
        assert r.status_code == 400
        assert "purchase_token_required" in r.text

    def test_unknown_product(self, api):
        r = api.post(
            f"{BASE_URL}/api/system/subscription/verify",
            headers={"X-User-Id": f"qa-{uuid.uuid4().hex[:8]}"},
            json={"product_id": "not_a_real_sku",
                  "purchase_token": f"tok-{uuid.uuid4().hex}"},
        )
        assert r.status_code == 400
        assert "unknown_product" in r.text


# ==================================================================
# Direct unit tests on play_verifier module
# ==================================================================
class TestPlayVerifierModule:
    def _fresh(self):
        # reload to reset lazy-cached _play_client / _client_error
        import play_verifier
        importlib.reload(play_verifier)
        return play_verifier

    def test_import_and_build_client_none_without_env(self, monkeypatch, caplog):
        monkeypatch.delenv("GOOGLE_SERVICE_ACCOUNT_JSON", raising=False)
        monkeypatch.delenv("GOOGLE_SERVICE_ACCOUNT_PATH", raising=False)
        pv = self._fresh()
        with caplog.at_level(logging.WARNING, logger="play_verifier"):
            client = pv._build_client()
        assert client is None
        # warning was logged
        msgs = " ".join(rec.message for rec in caplog.records)
        assert "GOOGLE_SERVICE_ACCOUNT_JSON" in msgs or "not set" in msgs

    def test_verify_purchase_returns_none_without_env(self, monkeypatch):
        monkeypatch.delenv("GOOGLE_SERVICE_ACCOUNT_JSON", raising=False)
        monkeypatch.delenv("GOOGLE_SERVICE_ACCOUNT_PATH", raising=False)
        pv = self._fresh()
        result = pv.verify_purchase(
            "speakmate_monthly_149", "tok-abc",
            {"monthly_sku": "speakmate_monthly_149",
             "yearly_sku": "speakmate_yearly_799",
             "lifetime_sku": "speakmate_lifetime_1499"},
        )
        assert result is None

    def test_malformed_json_env_falls_back(self, monkeypatch, caplog):
        """Malformed GOOGLE_SERVICE_ACCOUNT_JSON => _build_client None, no crash."""
        monkeypatch.setenv("GOOGLE_SERVICE_ACCOUNT_JSON", "{not-valid-json")
        monkeypatch.delenv("GOOGLE_SERVICE_ACCOUNT_PATH", raising=False)
        pv = self._fresh()
        with caplog.at_level(logging.ERROR, logger="play_verifier"):
            client = pv._build_client()
        assert client is None
        # Second call should also return None (cached error) — no crash
        assert pv._build_client() is None
        # verify_purchase should return None (fallback) since client is None
        pricing = {"monthly_sku": "speakmate_monthly_149",
                   "yearly_sku": "speakmate_yearly_799",
                   "lifetime_sku": "speakmate_lifetime_1499"}
        assert pv.verify_purchase("speakmate_monthly_149", "tok", pricing) is None

    def test_verify_purchase_uses_fake_client_subscription(self, monkeypatch):
        """Simulate configured mode by monkeypatching _build_client -> fake."""
        pv = self._fresh()

        class _Exec:
            def __init__(self, payload): self._p = payload
            def execute(self): return self._p

        class _Subs:
            def get(self, packageName, token):
                assert token == "tok-sub-ok"
                return _Exec({
                    "subscriptionState": "SUBSCRIPTION_STATE_ACTIVE",
                    "lineItems": [{"expiryTime": "2099-01-01T00:00:00Z"}],
                    "acknowledgementState": "ACKNOWLEDGEMENT_STATE_ACKNOWLEDGED",
                    "latestOrderId": "GPA.FAKE-1",
                })

        class _Purchases:
            def subscriptionsv2(self): return _Subs()
            def subscriptions(self): raise AssertionError("ack shouldn't run when already acknowledged")
            def products(self): raise AssertionError("wrong path")

        class _FakeClient:
            def purchases(self): return _Purchases()

        monkeypatch.setattr(pv, "_build_client", lambda: _FakeClient())
        pricing = {"monthly_sku": "speakmate_monthly_149",
                   "yearly_sku": "speakmate_yearly_799",
                   "lifetime_sku": "speakmate_lifetime_1499"}
        r = pv.verify_purchase("speakmate_monthly_149", "tok-sub-ok", pricing)
        assert r is not None
        assert r.entitled is True
        assert r.state == "SUBSCRIPTION_STATE_ACTIVE"
        assert r.acknowledged is True
        assert r.order_id == "GPA.FAKE-1"
        assert r.expiry_iso == "2099-01-01T00:00:00Z"

    def test_verify_purchase_uses_fake_client_product(self, monkeypatch):
        pv = self._fresh()

        class _Exec:
            def __init__(self, payload): self._p = payload
            def execute(self): return self._p

        ack_called = {"n": 0}

        class _Products:
            def get(self, packageName, productId, token):
                return _Exec({"purchaseState": 0, "acknowledgementState": 0,
                              "orderId": "GPA.LIFETIME"})

            def acknowledge(self, packageName, productId, token, body):
                ack_called["n"] += 1
                return _Exec({})

        class _Purchases:
            def products(self): return _Products()
            def subscriptionsv2(self): raise AssertionError("wrong path")

        class _FakeClient:
            def purchases(self): return _Purchases()

        monkeypatch.setattr(pv, "_build_client", lambda: _FakeClient())
        pricing = {"monthly_sku": "speakmate_monthly_149",
                   "yearly_sku": "speakmate_yearly_799",
                   "lifetime_sku": "speakmate_lifetime_1499"}
        r = pv.verify_purchase("speakmate_lifetime_1499", "tok-life", pricing)
        assert r is not None and r.entitled is True
        assert r.state == "PURCHASED"
        assert r.acknowledged is True
        assert r.order_id == "GPA.LIFETIME"
        assert ack_called["n"] == 1, "should auto-acknowledge on first verify"

    def test_verify_purchase_httperror_raises_valueerror(self, monkeypatch):
        pv = self._fresh()
        from googleapiclient.errors import HttpError

        class _FakeResp:
            status = 400
            reason = "Bad Request"

        class _Subs:
            def get(self, packageName, token):
                raise HttpError(_FakeResp(), b'{"error":"bad"}')

        class _Purchases:
            def subscriptionsv2(self): return _Subs()

        class _FakeClient:
            def purchases(self): return _Purchases()

        monkeypatch.setattr(pv, "_build_client", lambda: _FakeClient())
        pricing = {"monthly_sku": "speakmate_monthly_149",
                   "yearly_sku": "speakmate_yearly_799",
                   "lifetime_sku": "speakmate_lifetime_1499"}
        with pytest.raises(ValueError) as ei:
            pv.verify_purchase("speakmate_monthly_149", "tok-bad", pricing)
        assert "play_api_error" in str(ei.value)


# ==================================================================
# Regression on other endpoints
# ==================================================================
class TestRegression:
    def test_pricing(self, api):
        r = api.get(f"{BASE_URL}/api/system/pricing")
        assert r.status_code == 200
        d = r.json()
        for k in ("monthly_inr", "yearly_inr", "lifetime_inr",
                  "monthly_sku", "yearly_sku", "lifetime_sku"):
            assert k in d

    def test_quota_free_user(self, api):
        uid = f"qa-quota-{uuid.uuid4().hex[:8]}"
        r = api.get(f"{BASE_URL}/api/system/quota", headers={"X-User-Id": uid})
        assert r.status_code == 200
        d = r.json()
        assert "used" in d or "remaining" in d or "limit" in d

    def test_rewarded_claim_grants(self, api):
        uid = f"qa-rw-{uuid.uuid4().hex[:8]}"
        r = api.post(f"{BASE_URL}/api/system/rewarded/claim",
                     headers={"X-User-Id": uid}, json={})
        assert r.status_code == 200
        assert "ok" in r.json()

    def test_rewarded_claim_premium(self, api):
        uid = f"qa-rw-prem-{uuid.uuid4().hex[:8]}"
        r = api.post(
            f"{BASE_URL}/api/system/rewarded/claim",
            headers={"X-User-Id": uid, "X-Is-Premium": "true"},
            json={},
        )
        assert r.status_code == 200
        d = r.json()
        assert d["ok"] is False and d.get("reason") == "premium_no_bonus_needed"

    def test_legal_privacy(self, api):
        r = api.get(f"{BASE_URL}/api/legal/privacy")
        assert r.status_code == 200
        assert "Privacy" in r.text

    def test_legal_data_deletion(self, api):
        r = api.get(f"{BASE_URL}/api/legal/data-deletion")
        assert r.status_code == 200
        assert "Data Deletion" in r.text or "Deletion" in r.text
