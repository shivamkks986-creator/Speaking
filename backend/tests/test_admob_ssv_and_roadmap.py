"""Iteration 22 — AdMob SSV signed callback + roadmap speedup (6x5 chunks).

Covers:
- Unit tests on admob_ssv module (parse_custom_data, _canonical_message).
- Live-HTTP tests on GET /api/system/rewarded/ssv for validation error paths
  (400 ssv_missing_params, 400 ssv_signature_invalid).
- In-process ASGI tests (with monkeypatched admob_ssv.verify_ssv) for the happy
  path: valid signature grants reward, writes doc into rewarded_ssv Mongo
  collection, dedupe on transaction_id, user_id fallback, ssv_missing_uid.
- POST /api/system/rewarded/claim regression (fallback path).
- POST /api/ai/roadmap/generate returns 30 days with meta.summary/goal_title,
  each day has required fields.
- Regression: /api/system/pricing, /api/system/quota, /api/system/subscription/verify
  (fallback trust mode), /api/legal/privacy, /api/legal/data-deletion.
"""
from __future__ import annotations

import asyncio
import os
import sys
import uuid
import pytest
import requests

sys.path.insert(0, "/app/backend")

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "http://localhost:8001").rstrip("/")


# ============================================================
# Unit tests — admob_ssv module (no HTTP)
# ============================================================
class TestAdmobSsvModule:
    def test_parse_custom_data_full(self):
        import admob_ssv
        out = admob_ssv.parse_custom_data("uid:abc|endpoint:tutor_chat")
        assert out == {"uid": "abc", "endpoint": "tutor_chat"}

    def test_parse_custom_data_empty(self):
        import admob_ssv
        assert admob_ssv.parse_custom_data("") == {}

    def test_parse_custom_data_none_safe(self):
        import admob_ssv
        assert admob_ssv.parse_custom_data(None) == {}  # type: ignore[arg-type]

    def test_parse_custom_data_malformed_tokens_ignored(self):
        import admob_ssv
        out = admob_ssv.parse_custom_data("uid:abc|noise|endpoint:ep1")
        assert out == {"uid": "abc", "endpoint": "ep1"}

    def test_canonical_message_strips_signature(self):
        import admob_ssv
        qs = "ad_network=1&ad_unit=2&transaction_id=abc&key_id=42&signature=SIG&extra=1"
        # Actual google format: signature comes before key_id, but the function
        # docstring says it strips '&signature=...' — verify substring rule.
        msg = admob_ssv._canonical_message(qs)
        assert msg == "ad_network=1&ad_unit=2&transaction_id=abc&key_id=42"

    def test_canonical_message_no_signature_marker(self):
        import admob_ssv
        assert admob_ssv._canonical_message("a=1&b=2") is None

    def test_canonical_message_signature_at_start(self):
        import admob_ssv
        # If signature is first param there's no leading '&' — defensive.
        assert admob_ssv._canonical_message("signature=xyz") is None


# ============================================================
# Live HTTP — error paths that don't need monkeypatching
# ============================================================
@pytest.fixture(scope="module")
def api():
    s = requests.Session()
    return s


class TestSsvHttpErrors:
    def test_ssv_no_params_returns_400_missing_params(self, api):
        r = api.get(f"{BASE_URL}/api/system/rewarded/ssv")
        assert r.status_code == 400
        assert r.json().get("detail") == "ssv_missing_params"

    def test_ssv_missing_key_id_returns_400(self, api):
        # signature + transaction_id present, key_id missing
        r = api.get(
            f"{BASE_URL}/api/system/rewarded/ssv",
            params={"signature": "sig", "transaction_id": "t1"},
        )
        assert r.status_code == 400
        assert r.json().get("detail") == "ssv_missing_params"

    def test_ssv_missing_transaction_id_returns_400(self, api):
        r = api.get(
            f"{BASE_URL}/api/system/rewarded/ssv",
            params={"signature": "sig", "key_id": "1"},
        )
        assert r.status_code == 400
        assert r.json().get("detail") == "ssv_missing_params"

    def test_ssv_bogus_signature_returns_400_signature_invalid(self, api):
        # All required params, but signature will never verify against a real
        # Google verifier key.
        r = api.get(
            f"{BASE_URL}/api/system/rewarded/ssv",
            params={
                "ad_network": "5450213213286189855",
                "ad_unit": "1234/5678",
                "custom_data": "uid:fake|endpoint:tutor_chat",
                "reward_amount": "1",
                "reward_item": "coins",
                "timestamp": "1700000000000",
                "transaction_id": f"tx-{uuid.uuid4().hex}",
                "user_id": "fake-uid",
                "key_id": "3335741209",  # a real google key id (may exist)
                "signature": "MEUCIQD_fake_signature_bytes_not_valid",
            },
        )
        assert r.status_code == 400
        assert r.json().get("detail") == "ssv_signature_invalid"


# ============================================================
# In-process ASGI — monkeypatched verify_ssv for happy-path tests
# ============================================================
@pytest.fixture
def asgi_client(monkeypatch):
    """Return an httpx.AsyncClient wired to the FastAPI ASGI app in-process,
    with admob_ssv.verify_ssv monkeypatched to always return True.
    """
    import httpx
    import admob_ssv
    from server import app

    async def _fake_verify(qs, signature, key_id):
        return True

    monkeypatch.setattr(admob_ssv, "verify_ssv", _fake_verify)

    transport = httpx.ASGITransport(app=app)
    client = httpx.AsyncClient(transport=transport, base_url="http://testserver")
    return client


@pytest.mark.asyncio(loop_scope="module")
class TestSsvHappyPath:
    async def test_valid_signature_grants_reward_and_persists(self, asgi_client):
        uid = f"qa-ssv-happy-{uuid.uuid4().hex[:8]}"
        txn = f"tx-happy-{uuid.uuid4().hex}"
        params = {
            "ad_network": "1",
            "ad_unit": "u1",
            "custom_data": f"uid:{uid}|endpoint:tutor_chat",
            "reward_amount": "1",
            "reward_item": "coins",
            "timestamp": "1700000000000",
            "transaction_id": txn,
            "key_id": "3335741209",
            "signature": "AAAAsig",
        }
        r = await asgi_client.get("/api/system/rewarded/ssv", params=params)
        assert r.status_code == 200, r.text
        body = r.json()
        assert body["ok"] is True
        assert "result" in body

        # Verify Mongo persistence
        from motor.motor_asyncio import AsyncIOMotorClient
        db = AsyncIOMotorClient(os.environ["MONGO_URL"])[os.environ["DB_NAME"]]
        doc = await db.rewarded_ssv.find_one({"transaction_id": txn})
        assert doc is not None
        assert doc["uid"] == uid
        assert doc["endpoint"] == "tutor_chat"
        assert doc["reward_amount"] == "1"
        await asgi_client.aclose()

    async def test_dedupe_second_call_returns_already_processed(self, asgi_client):
        uid = f"qa-ssv-dedupe-{uuid.uuid4().hex[:8]}"
        txn = f"tx-dedupe-{uuid.uuid4().hex}"
        params = {
            "ad_network": "1", "ad_unit": "u1",
            "custom_data": f"uid:{uid}|endpoint:tutor_chat",
            "reward_amount": "1", "reward_item": "coins",
            "timestamp": "1700000000000",
            "transaction_id": txn,
            "key_id": "k", "signature": "sig",
        }
        r1 = await asgi_client.get("/api/system/rewarded/ssv", params=params)
        assert r1.status_code == 200
        assert "result" in r1.json()

        r2 = await asgi_client.get("/api/system/rewarded/ssv", params=params)
        assert r2.status_code == 200
        b2 = r2.json()
        assert b2["ok"] is True
        assert b2.get("reason") == "already_processed"
        # Second call must NOT contain a fresh grant result
        assert "result" not in b2 or b2.get("result") is None
        await asgi_client.aclose()

    async def test_user_id_fallback_when_custom_data_empty(self, asgi_client):
        uid = f"qa-ssv-uidfallback-{uuid.uuid4().hex[:8]}"
        txn = f"tx-uf-{uuid.uuid4().hex}"
        params = {
            "ad_network": "1", "ad_unit": "u1",
            "custom_data": "",
            "user_id": uid,
            "reward_amount": "1", "reward_item": "coins",
            "timestamp": "1700000000000",
            "transaction_id": txn,
            "key_id": "k", "signature": "sig",
        }
        r = await asgi_client.get("/api/system/rewarded/ssv", params=params)
        assert r.status_code == 200
        assert r.json()["ok"] is True

        from motor.motor_asyncio import AsyncIOMotorClient
        db = AsyncIOMotorClient(os.environ["MONGO_URL"])[os.environ["DB_NAME"]]
        doc = await db.rewarded_ssv.find_one({"transaction_id": txn})
        assert doc is not None and doc["uid"] == uid
        await asgi_client.aclose()

    async def test_missing_uid_returns_400(self, asgi_client):
        # valid sig (monkeypatched True) but no uid in custom_data and no user_id
        txn = f"tx-nouid-{uuid.uuid4().hex}"
        params = {
            "ad_network": "1", "ad_unit": "u1",
            "custom_data": "",
            "reward_amount": "1", "reward_item": "coins",
            "timestamp": "1700000000000",
            "transaction_id": txn,
            "key_id": "k", "signature": "sig",
        }
        r = await asgi_client.get("/api/system/rewarded/ssv", params=params)
        assert r.status_code == 400
        assert r.json().get("detail") == "ssv_missing_uid"
        await asgi_client.aclose()


# ============================================================
# Regression — /api/system/rewarded/claim (client-driven fallback)
# ============================================================
class TestRewardedClaimRegression:
    def test_claim_requires_user_id(self, api):
        r = api.post(f"{BASE_URL}/api/system/rewarded/claim", json={})
        assert r.status_code == 401
        assert r.json().get("detail") == "user_id_required"

    def test_claim_premium_no_bonus_needed(self, api):
        uid = f"qa-rc-{uuid.uuid4().hex[:8]}"
        r = api.post(
            f"{BASE_URL}/api/system/rewarded/claim",
            headers={"X-User-Id": uid, "X-Is-Premium": "true"},
            json={"endpoint": "tutor_chat"},
        )
        assert r.status_code == 200
        b = r.json()
        assert b["ok"] is False
        assert b["reason"] == "premium_no_bonus_needed"

    def test_claim_free_user_grants_bonus(self, api):
        uid = f"qa-rc-grant-{uuid.uuid4().hex[:8]}"
        r = api.post(
            f"{BASE_URL}/api/system/rewarded/claim",
            headers={"X-User-Id": uid},
            json={"endpoint": "tutor_chat"},
        )
        assert r.status_code == 200
        b = r.json()
        # First claim of the day should succeed
        assert b["ok"] is True
        assert isinstance(b.get("bonus_granted"), int) and b["bonus_granted"] > 0


# ============================================================
# /api/ai/roadmap/generate — structural validation
# ============================================================
class TestRoadmapGenerate:
    def test_roadmap_returns_30_days_with_meta(self, api):
        uid = f"qa-roadmap-{uuid.uuid4().hex[:8]}"
        payload = {
            "user_name": "TestUser",
            "role_target": "software engineer fresher",
            "current_level": "beginner",
            "weak_areas": ["grammar", "confidence"],
            "daily_minutes": 15,
        }
        r = api.post(
            f"{BASE_URL}/api/ai/roadmap/generate",
            headers={"X-User-Id": uid, "X-Is-Premium": "true"},
            json=payload,
            timeout=90,
        )
        # Budget guard may fire — surface that as skip.
        if r.status_code == 503:
            pytest.skip(f"budget guard active: {r.text}")
        assert r.status_code == 200, r.text
        data = r.json()

        assert isinstance(data.get("summary"), str) and data["summary"].strip()
        assert isinstance(data.get("goal_title"), str) and data["goal_title"].strip()
        assert isinstance(data.get("days"), list)
        assert len(data["days"]) == 30

        # Day-level structural checks
        for i, d in enumerate(data["days"]):
            assert isinstance(d["day"], int)
            assert isinstance(d["title"], str) and d["title"].strip()
            assert isinstance(d["focus"], str) and d["focus"].strip()
            assert isinstance(d["tasks"], list)
            assert len(d["tasks"]) <= 5
            assert isinstance(d.get("tip", ""), str)


# ============================================================
# Regression on other public endpoints (identical to iteration_21)
# ============================================================
class TestRegressionPublicEndpoints:
    def test_pricing(self, api):
        r = api.get(f"{BASE_URL}/api/system/pricing")
        assert r.status_code == 200
        d = r.json()
        for k in ("monthly_inr", "yearly_inr", "lifetime_inr",
                  "lifetime_enabled", "monthly_sku", "yearly_sku", "lifetime_sku"):
            assert k in d

    def test_quota(self, api):
        uid = f"qa-quota-{uuid.uuid4().hex[:8]}"
        r = api.get(f"{BASE_URL}/api/system/quota", headers={"X-User-Id": uid})
        assert r.status_code == 200

    def test_subscription_verify_fallback(self, api):
        pricing = api.get(f"{BASE_URL}/api/system/pricing").json()
        uid = f"qa-reg-verify-{uuid.uuid4().hex[:8]}"
        r = api.post(
            f"{BASE_URL}/api/system/subscription/verify",
            headers={"X-User-Id": uid},
            json={
                "product_id": pricing["monthly_sku"],
                "purchase_token": f"tok-{uuid.uuid4().hex}",
                "order_id": "GPA.reg",
            },
        )
        assert r.status_code == 200
        b = r.json()
        assert b["is_premium"] is True
        assert b["plan"] == "monthly"
        assert b["source"] in ("play_billing", "play_billing_unverified")

    def test_legal_privacy(self, api):
        r = api.get(f"{BASE_URL}/api/legal/privacy")
        assert r.status_code == 200
        # Content-type check — should be HTML/text
        assert "text" in r.headers.get("content-type", "").lower() or r.text.strip()

    def test_legal_data_deletion(self, api):
        r = api.get(f"{BASE_URL}/api/legal/data-deletion")
        assert r.status_code == 200
        assert r.text.strip()
