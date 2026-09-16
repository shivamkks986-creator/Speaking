"""
Phase 2 backend tests: legal HTML pages + new FIX_FILES entries + Phase 1 regression smoke.
Focus: /api/legal/privacy, /api/legal/privacy-policy, /api/legal/data-deletion,
/api/fix-files (list + adsService.ts contents), and regression on pricing / quota /
subscription verify + error paths / restore / rewarded claim.
"""
import os
import uuid
import time
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "http://localhost:8001").rstrip("/")
API = f"{BASE_URL}/api"
T = 30


@pytest.fixture(scope="session")
def s():
    return requests.Session()


# ---------------- Legal pages ----------------

def test_legal_privacy_ok(s):
    r = s.get(f"{API}/legal/privacy", timeout=T)
    assert r.status_code == 200, r.text
    assert "text/html" in r.headers.get("content-type", "").lower()
    body = r.text
    assert "Privacy Policy" in body
    assert "SpeakMate AI" in body


def test_legal_privacy_policy_alias_ok(s):
    r = s.get(f"{API}/legal/privacy-policy", timeout=T)
    assert r.status_code == 200, r.text
    assert "text/html" in r.headers.get("content-type", "").lower()
    assert "Privacy Policy" in r.text
    assert "SpeakMate AI" in r.text


def test_legal_data_deletion_ok(s):
    r = s.get(f"{API}/legal/data-deletion", timeout=T)
    assert r.status_code == 200, r.text
    assert "text/html" in r.headers.get("content-type", "").lower()
    body = r.text
    assert "Data Deletion Request" in body
    # instructions present
    assert "Settings" in body and "Delete My Data" in body


# ---------------- FIX_FILES ----------------

def test_fix_files_list_includes_phase2(s):
    r = s.get(f"{API}/fix-files", timeout=T)
    assert r.status_code == 200, r.text
    files = r.json().get("files", [])
    for needed in ("package.json", "App.tsx", "adsService.ts"):
        assert needed in files, f"missing {needed} in fix-files list: {files}"


def test_fix_files_adsservice_contains_prod_ids(s):
    r = s.get(f"{API}/fix-files/adsService.ts", timeout=T)
    assert r.status_code == 200, r.text
    body = r.text
    for ad_id in ("9256241120", "4056332447", "9248949370"):
        assert ad_id in body, f"missing ad unit id {ad_id} in adsService.ts"


def test_fix_files_package_json_served(s):
    r = s.get(f"{API}/fix-files/package.json", timeout=T)
    assert r.status_code == 200, r.text
    # Should look like JSON
    assert '"name"' in r.text or '"dependencies"' in r.text


def test_fix_files_app_tsx_served(s):
    r = s.get(f"{API}/fix-files/App.tsx", timeout=T)
    assert r.status_code == 200, r.text
    assert len(r.text) > 0


# ---------------- Phase 1 regression (pricing / quota / subs / rewarded) ----------------

def test_pricing_regression(s):
    r = s.get(f"{API}/system/pricing", timeout=T)
    assert r.status_code == 200, r.text
    d = r.json()
    assert d.get("monthly_inr") == 149
    assert d.get("yearly_inr") == 799
    assert d.get("lifetime_inr") == 1499
    # SKUs may be flat (monthly_sku) or nested (skus.monthly)
    skus = d.get("skus") or {}
    monthly_sku = skus.get("monthly") or d.get("monthly_sku")
    yearly_sku = skus.get("yearly") or d.get("yearly_sku")
    lifetime_sku = skus.get("lifetime") or d.get("lifetime_sku")
    assert monthly_sku == "speakmate_monthly_149"
    assert yearly_sku == "speakmate_yearly_799"
    assert lifetime_sku == "speakmate_lifetime_1499"


def test_quota_free_and_premium(s):
    uid = f"qa-quota-{uuid.uuid4().hex[:8]}"
    r = s.get(f"{API}/system/quota", headers={"X-User-Id": uid}, timeout=T)
    assert r.status_code == 200, r.text
    d = r.json()
    assert d.get("used") == 0
    assert "per_endpoint" in d

    r2 = s.get(f"{API}/system/quota", headers={"X-User-Id": uid, "X-Is-Premium": "true"}, timeout=T)
    assert r2.status_code == 200, r2.text
    d2 = r2.json()
    # unlimited signalled via -1 somewhere in payload
    assert -1 in (d2.get("limit"), d2.get("daily_limit"), d2.get("remaining")) or d2.get("is_premium") is True, d2


@pytest.mark.parametrize("product_id,plan_expected", [
    ("speakmate_monthly_149", "monthly"),
    ("speakmate_yearly_799", "yearly"),
    ("speakmate_lifetime_1499", "lifetime"),
])
def test_subscription_verify_happy(s, product_id, plan_expected):
    uid = f"qa-verify-{uuid.uuid4().hex[:8]}"
    r = s.post(
        f"{API}/system/subscription/verify",
        json={"product_id": product_id, "purchase_token": f"tok-{uuid.uuid4().hex}"},
        headers={"X-User-Id": uid},
        timeout=T,
    )
    assert r.status_code == 200, r.text
    d = r.json()
    assert d.get("is_premium") is True
    assert d.get("plan") == plan_expected


def test_subscription_verify_missing_uid_401(s):
    r = s.post(
        f"{API}/system/subscription/verify",
        json={"product_id": "speakmate_monthly_149", "purchase_token": "tok-xyz"},
        timeout=T,
    )
    assert r.status_code == 401, r.text
    body = r.json()
    # detail may be dict or string
    detail = body.get("detail")
    text = str(detail)
    assert "user_id_required" in text


def test_subscription_verify_unknown_product_400(s):
    uid = f"qa-verify-bad-{uuid.uuid4().hex[:8]}"
    r = s.post(
        f"{API}/system/subscription/verify",
        json={"product_id": "not_a_real_sku", "purchase_token": "tok-xyz"},
        headers={"X-User-Id": uid},
        timeout=T,
    )
    assert r.status_code == 400, r.text
    assert "unknown_product" in str(r.json().get("detail"))


def test_subscription_restore(s):
    uid = f"qa-restore-{uuid.uuid4().hex[:8]}"
    # First verify to create a subscription
    v = s.post(
        f"{API}/system/subscription/verify",
        json={"product_id": "speakmate_yearly_799", "purchase_token": f"tok-{uuid.uuid4().hex}"},
        headers={"X-User-Id": uid},
        timeout=T,
    )
    assert v.status_code == 200
    r = s.post(f"{API}/system/subscription/restore", headers={"X-User-Id": uid}, timeout=T)
    assert r.status_code == 200, r.text
    d = r.json()
    assert d.get("is_premium") is True
    assert d.get("plan") == "yearly"

    # Fresh user -> no subscription
    uid2 = f"qa-restore-none-{uuid.uuid4().hex[:8]}"
    r2 = s.post(f"{API}/system/subscription/restore", headers={"X-User-Id": uid2}, timeout=T)
    assert r2.status_code == 200, r2.text
    assert r2.json().get("is_premium") is False


def test_rewarded_claim_free_and_cooldown_and_premium(s):
    uid = f"qa-rw-{uuid.uuid4().hex[:8]}"
    r1 = s.post(f"{API}/system/rewarded/claim", json={}, headers={"X-User-Id": uid}, timeout=T)
    assert r1.status_code == 200, r1.text
    d1 = r1.json()
    assert d1.get("bonus_granted", 0) > 0, d1

    # Rapid second call → cooldown
    r2 = s.post(f"{API}/system/rewarded/claim", json={}, headers={"X-User-Id": uid}, timeout=T)
    assert r2.status_code == 200, r2.text
    d2 = r2.json()
    assert d2.get("reason") == "cooldown", d2
    assert isinstance(d2.get("wait_seconds"), (int, float)) and d2["wait_seconds"] > 0

    # Premium user → premium_no_bonus_needed
    uid_p = f"qa-rw-prem-{uuid.uuid4().hex[:8]}"
    rp = s.post(
        f"{API}/system/rewarded/claim",
        json={},
        headers={"X-User-Id": uid_p, "X-Is-Premium": "true"},
        timeout=T,
    )
    assert rp.status_code == 200, rp.text
    assert rp.json().get("reason") == "premium_no_bonus_needed"
