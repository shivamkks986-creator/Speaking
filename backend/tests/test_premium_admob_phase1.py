"""Phase 1 backend tests: Premium subscription + AdMob rewarded ads + fix-files.

Covers:
- GET /api/system/pricing
- GET /api/system/quota (free + premium)
- POST /api/system/subscription/verify (happy, unknown SKU, missing user, empty token)
- POST /api/system/subscription/restore (existing + nonexistent)
- POST /api/system/rewarded/claim (grant, cooldown, premium, missing user)
- Per-endpoint quota enforcement on /api/ai/tutor + rewarded bonus recovery
- GET /api/fix-files/{name} for phase1 files + app.json version=1.0.8/versionCode=9
"""
from __future__ import annotations

import os
import time
import json
import uuid
import pytest
import requests

def _load_backend_url():
    try:
        with open("/app/frontend/.env") as f:
            for line in f:
                if line.startswith("REACT_APP_BACKEND_URL="):
                    return line.split("=", 1)[1].strip()
    except Exception:
        pass
    return os.environ.get("REACT_APP_BACKEND_URL", "")


BASE_URL = (os.environ.get("REACT_APP_BACKEND_URL") or _load_backend_url()).rstrip("/")
assert BASE_URL, "REACT_APP_BACKEND_URL missing"
API = f"{BASE_URL}/api"


@pytest.fixture(scope="module")
def s():
    sess = requests.Session()
    sess.headers.update({"Content-Type": "application/json"})
    return sess


# ---------------------- Pricing ----------------------
def test_pricing(s):
    r = s.get(f"{API}/system/pricing", timeout=30)
    assert r.status_code == 200, r.text
    d = r.json()
    assert d["monthly_inr"] == 149
    assert d["yearly_inr"] == 799
    assert d["lifetime_inr"] == 1499
    assert d["lifetime_enabled"] is True
    assert d["monthly_sku"] == "speakmate_monthly_149"
    assert d["yearly_sku"] == "speakmate_yearly_799"
    assert d["lifetime_sku"] == "speakmate_lifetime_1499"


# ---------------------- Quota ----------------------
EXPECTED_EPS = {
    "tutor_chat", "speaking_score", "interview_live", "interview_evaluate",
    "tmay_evaluate", "resume_parse", "resume_interview_questions",
    "sales_session", "roadmap_generate", "vocabulary_lookup",
}


def test_quota_free_user(s):
    uid = f"test-user-A-{uuid.uuid4().hex[:6]}"
    r = s.get(f"{API}/system/quota", headers={"X-User-Id": uid, "X-Is-Premium": "false"}, timeout=30)
    assert r.status_code == 200, r.text
    d = r.json()
    per = d["per_endpoint"]
    for ep in EXPECTED_EPS:
        assert ep in per, f"missing {ep}"
        assert per[ep]["used"] == 0
        assert per[ep]["limit"] > 0
        assert per[ep]["bonus"] == 0
        assert per[ep]["remaining"] == per[ep]["limit"]


def test_quota_premium_user(s):
    uid = f"test-user-P-{uuid.uuid4().hex[:6]}"
    r = s.get(f"{API}/system/quota", headers={"X-User-Id": uid, "X-Is-Premium": "true"}, timeout=30)
    assert r.status_code == 200
    d = r.json()
    for ep in EXPECTED_EPS:
        assert d["per_endpoint"][ep]["limit"] == -1


# ---------------------- Subscription verify ----------------------
VERIFY_UID = f"verify-user-{uuid.uuid4().hex[:6]}"


def test_verify_happy_monthly(s):
    r = s.post(
        f"{API}/system/subscription/verify",
        headers={"X-User-Id": VERIFY_UID},
        json={"product_id": "speakmate_monthly_149", "purchase_token": "tok1"},
        timeout=30,
    )
    assert r.status_code == 200, r.text
    d = r.json()
    assert d["is_premium"] is True
    assert d["plan"] == "monthly"
    assert d["source"] == "play_billing"
    assert d["expires_at"]


def test_verify_unknown_sku(s):
    r = s.post(
        f"{API}/system/subscription/verify",
        headers={"X-User-Id": "u"},
        json={"product_id": "invalid_sku", "purchase_token": "tok"},
        timeout=30,
    )
    assert r.status_code == 400
    assert r.json()["detail"].startswith("unknown_product:")


def test_verify_missing_user_id(s):
    r = s.post(
        f"{API}/system/subscription/verify",
        json={"product_id": "speakmate_monthly_149", "purchase_token": "tok"},
        timeout=30,
    )
    assert r.status_code == 401
    assert r.json()["detail"] == "user_id_required"


def test_verify_empty_token(s):
    r = s.post(
        f"{API}/system/subscription/verify",
        headers={"X-User-Id": "u"},
        json={"product_id": "speakmate_monthly_149", "purchase_token": ""},
        timeout=30,
    )
    assert r.status_code == 400
    assert r.json()["detail"] == "purchase_token_required"


# ---------------------- Restore ----------------------
def test_restore_existing(s):
    # depends on test_verify_happy_monthly having run
    r = s.post(f"{API}/system/subscription/restore", headers={"X-User-Id": VERIFY_UID}, timeout=30)
    assert r.status_code == 200, r.text
    d = r.json()
    assert d["is_premium"] is True
    assert d["plan"] == "monthly"


def test_restore_nonexistent(s):
    uid = f"nonexistent-user-{uuid.uuid4().hex[:6]}"
    r = s.post(f"{API}/system/subscription/restore", headers={"X-User-Id": uid}, timeout=30)
    assert r.status_code == 200
    d = r.json()
    assert d["is_premium"] is False
    assert d.get("plan") is None


# ---------------------- Rewarded ----------------------
def test_rewarded_grant_and_cooldown(s):
    uid = f"rw-user-{uuid.uuid4().hex[:6]}"
    r = s.post(
        f"{API}/system/rewarded/claim",
        headers={"X-User-Id": uid, "X-Is-Premium": "false"},
        json={"endpoint": "interview_live"},
        timeout=30,
    )
    assert r.status_code == 200, r.text
    d = r.json()
    assert d["ok"] is True
    assert d["bonus_granted"] == 3
    assert d["total_bonus_today"] == 3
    assert d["remaining_bonus_slots"] == 12

    # Immediate 2nd call - cooldown
    r2 = s.post(
        f"{API}/system/rewarded/claim",
        headers={"X-User-Id": uid, "X-Is-Premium": "false"},
        json={"endpoint": "interview_live"},
        timeout=30,
    )
    assert r2.status_code == 200
    d2 = r2.json()
    assert d2["ok"] is False
    assert d2["reason"] == "cooldown"
    assert d2["wait_seconds"] > 0


def test_rewarded_premium_no_bonus(s):
    uid = f"rw-prem-{uuid.uuid4().hex[:6]}"
    r = s.post(
        f"{API}/system/rewarded/claim",
        headers={"X-User-Id": uid, "X-Is-Premium": "true"},
        json={"endpoint": "tutor_chat"},
        timeout=30,
    )
    assert r.status_code == 200
    d = r.json()
    assert d["ok"] is False
    assert d["reason"] == "premium_no_bonus_needed"


def test_rewarded_missing_user(s):
    r = s.post(f"{API}/system/rewarded/claim", json={"endpoint": "tutor_chat"}, timeout=30)
    assert r.status_code == 401


# ---------------------- Per-endpoint quota burn on /api/ai/tutor ----------------------
@pytest.mark.slow
def test_tutor_chat_endpoint_quota_and_bonus_recovery(s):
    """Burn 10 tutor_chat calls, expect 429 endpoint_quota_exceeded on 11th, then bonus recovers."""
    uid = f"quota-burn-{uuid.uuid4().hex[:6]}"
    headers = {"X-User-Id": uid, "X-Is-Premium": "false", "Content-Type": "application/json"}
    url = f"{API}/ai/tutor/chat"
    payload = {"message": "hi"}
    # First call
    r0 = s.post(url, headers=headers, json=payload, timeout=120)
    if r0.status_code >= 500:
        pytest.skip(f"tutor 5xx: {r0.status_code} {r0.text[:200]}")
    assert r0.status_code == 200, f"first call: {r0.status_code} {r0.text[:200]}"

    # 9 more (total 10)
    for i in range(9):
        r = s.post(url, headers=headers, json=payload, timeout=120)
        assert r.status_code == 200, f"iter {i}: {r.status_code} {r.text[:200]}"

    # 11th call should be blocked
    r11 = s.post(url, headers=headers, json=payload, timeout=90)
    assert r11.status_code == 429, f"expected 429, got {r11.status_code}: {r11.text[:300]}"
    detail = r11.json().get("detail", {})
    reason = detail.get("reason") if isinstance(detail, dict) else str(detail)
    assert isinstance(reason, str) and reason.startswith("endpoint_quota_exceeded:tutor_chat:"), reason

    # Claim rewarded bonus for this user + endpoint, then retry tutor
    rc = s.post(
        f"{API}/system/rewarded/claim",
        headers={"X-User-Id": uid, "X-Is-Premium": "false"},
        json={"endpoint": "tutor_chat"},
        timeout=30,
    )
    assert rc.status_code == 200 and rc.json()["ok"] is True, rc.text

    r12 = s.post(url, headers=headers, json=payload, timeout=90)
    assert r12.status_code == 200, f"after bonus expected 200 got {r12.status_code}: {r12.text[:200]}"


# ---------------------- Fix files ----------------------
FIX_FILES_PHASE1 = [
    "billingService.ts",
    "usageService.ts",
    "UsageIndicator.tsx",
    "AdBanner.tsx",
    "LimitReachedModal.tsx",
    "PremiumScreen.tsx",
    "app.json",
]


@pytest.mark.parametrize("name", FIX_FILES_PHASE1)
def test_fix_files_reachable(s, name):
    r = s.get(f"{API}/fix-files/{name}", timeout=30)
    assert r.status_code == 200, f"{name}: {r.status_code} {r.text[:200]}"
    assert r.text.strip(), f"{name} empty"


def test_app_json_version(s):
    r = s.get(f"{API}/fix-files/app.json", timeout=30)
    assert r.status_code == 200
    data = json.loads(r.text)
    expo = data.get("expo", data)
    assert expo.get("version") == "1.0.8", f"version={expo.get('version')}"
    android = expo.get("android", {})
    assert android.get("versionCode") == 9, f"versionCode={android.get('versionCode')}"
