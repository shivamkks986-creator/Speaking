"""
Iteration 26 backend tests — billing security hardening + app-ads.txt.
Verifies /app-ads.txt at domain root, pricing SKUs, subscription verify flow,
purchase_token replay protection, RTDN webhook, and status flip after CANCELED.
"""
import base64
import json
import os
import uuid
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://gift-hub-sync.preview.emergentagent.com").rstrip("/")
PROD_DOMAIN = "https://gift-hub-sync.emergent.host"


@pytest.fixture(scope="module")
def s():
    sess = requests.Session()
    sess.headers.update({"Content-Type": "application/json"})
    return sess


# --- app-ads.txt at domain root ---
class TestAppAdsTxt:
    EXPECTED = "google.com, pub-3735972538807236, DIRECT, f08c47fec0942fa0"

    def test_app_ads_preview(self, s):
        r = s.get(f"{BASE_URL}/app-ads.txt")
        assert r.status_code == 200, r.text
        assert "text/plain" in r.headers.get("content-type", "")
        assert self.EXPECTED in r.text.strip()

    def test_app_ads_prod_domain(self, s):
        try:
            r = s.get(f"{PROD_DOMAIN}/app-ads.txt", timeout=15)
        except Exception as e:
            pytest.skip(f"prod domain not reachable from preview env: {e}")
        assert r.status_code == 200
        assert self.EXPECTED in r.text.strip()


# --- Pricing SKUs & plans ---
class TestPricing:
    def test_pricing(self, s):
        r = s.get(f"{BASE_URL}/api/system/pricing")
        assert r.status_code == 200
        data = r.json()
        skus = data.get("skus") or data.get("products") or data
        # look for the sku ids anywhere in the payload
        blob = json.dumps(data)
        for sku in ["premium_monthly", "premium_yearly", "premium_lifetime"]:
            assert sku in blob, f"missing sku {sku}"
        plans = data.get("plans")
        assert isinstance(plans, dict), f"plans missing/invalid: {data}"
        for k in ["monthly", "yearly", "lifetime"]:
            assert k in plans, f"plans.{k} missing"
            plan = plans[k]
            assert isinstance(plan.get("features"), list) and plan["features"], f"{k}.features missing"
            assert plan.get("cta"), f"{k}.cta missing"
            assert plan.get("billing_period"), f"{k}.billing_period missing"


# --- Auth guards ---
class TestAuthGuards:
    def test_quota_no_auth(self, s):
        r = requests.get(f"{BASE_URL}/api/system/quota")
        assert r.status_code == 401
        assert "user_id_required" in r.text

    def test_quota_fresh_user_ignores_premium_header(self, s):
        r = requests.get(
            f"{BASE_URL}/api/system/quota",
            headers={"X-User-Id": "freshuser_quota", "X-Is-Premium": "true"},
        )
        assert r.status_code == 200
        d = r.json()
        assert d.get("is_premium") is False, d
        assert d.get("plan") in (None, "null"), d

    def test_verify_no_auth(self, s):
        r = requests.post(f"{BASE_URL}/api/system/subscription/verify", json={
            "product_id": "premium_monthly", "purchase_token": "x"
        })
        assert r.status_code == 401
        assert "user_id_required" in r.text

    def test_status_no_auth(self, s):
        r = requests.get(f"{BASE_URL}/api/system/subscription/status")
        assert r.status_code == 401

    def test_rewarded_claim_no_auth(self, s):
        r = requests.post(f"{BASE_URL}/api/system/rewarded/claim", json={})
        assert r.status_code == 401


# --- Verify flow (uses audit uids) ---
class TestVerifyFlow:
    def test_verify_success_user1(self, s):
        r = requests.post(
            f"{BASE_URL}/api/system/subscription/verify",
            headers={"X-User-Id": "user_audit_1"},
            json={"product_id": "premium_monthly", "purchase_token": "audit_token_alpha"},
        )
        assert r.status_code == 200, r.text
        d = r.json()
        assert d.get("is_premium") is True
        assert d.get("plan") == "monthly"
        assert d.get("source") == "play_billing_unverified"

    def test_verify_crossuser_replay_blocked(self, s):
        r = requests.post(
            f"{BASE_URL}/api/system/subscription/verify",
            headers={"X-User-Id": "user_audit_2"},
            json={"product_id": "premium_monthly", "purchase_token": "audit_token_alpha"},
        )
        assert r.status_code == 403, r.text
        assert "purchase_token_bound_to_other_user" in r.text

    def test_verify_unknown_product(self, s):
        r = requests.post(
            f"{BASE_URL}/api/system/subscription/verify",
            headers={"X-User-Id": "user_audit_3"},
            json={"product_id": "unknown_bogus_sku", "purchase_token": "tok_bogus"},
        )
        assert r.status_code == 400
        assert "unknown_product" in r.text

    def test_verify_empty_token(self, s):
        r = requests.post(
            f"{BASE_URL}/api/system/subscription/verify",
            headers={"X-User-Id": "user_audit_4"},
            json={"product_id": "premium_monthly", "purchase_token": ""},
        )
        assert r.status_code == 400
        assert "purchase_token_required" in r.text

    def test_status_user1_premium(self, s):
        r = requests.get(
            f"{BASE_URL}/api/system/subscription/status",
            headers={"X-User-Id": "user_audit_1"},
        )
        assert r.status_code == 200
        d = r.json()
        assert d.get("is_premium") is True
        assert d.get("plan") == "monthly"


# --- RTDN webhook ---
class TestRTDN:
    def test_rtdn_empty_body(self, s):
        r = requests.post(f"{BASE_URL}/api/system/rtdn", json={})
        assert r.status_code == 200
        assert r.json().get("status") == "ok" or "ok" in r.text.lower()

    def test_rtdn_canceled_flips_status(self, s):
        payload = {
            "packageName": "com.speakmate.ai",
            "subscriptionNotification": {
                "notificationType": 3,
                "purchaseToken": "audit_token_alpha",
                "subscriptionId": "premium_monthly",
            },
        }
        b64 = base64.b64encode(json.dumps(payload).encode()).decode()
        body = {"message": {"data": b64, "messageId": f"audit_msg_{uuid.uuid4().hex[:8]}"}}
        r = requests.post(f"{BASE_URL}/api/system/rtdn", json=body)
        assert r.status_code == 200, r.text

        r2 = requests.get(
            f"{BASE_URL}/api/system/subscription/status",
            headers={"X-User-Id": "user_audit_1"},
        )
        assert r2.status_code == 200
        d = r2.json()
        assert d.get("is_premium") is False, f"expected revoked, got {d}"
