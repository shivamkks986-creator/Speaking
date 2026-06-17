"""
Backend tests for SpeakMate AI Phase-1 endpoints:
- /api/ai/tmay/evaluate (new)
- /api/ai/roadmap/generate (new)
- /api/ai/speaking/score (5-axis upgrade)
- /api/system/config (regression)
- /api/ai/tutor/chat (regression)
- TMAY quota guard (429 with user_quota_exceeded)
"""
import os
import time
import uuid
import pytest
import requests
from pymongo import MongoClient
from datetime import datetime, timezone

BASE_URL = "http://localhost:8001"
API = f"{BASE_URL}/api"

MONGO_URL = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
DB_NAME = os.environ.get("DB_NAME", "test_database")


@pytest.fixture(scope="session")
def mongo_db():
    client = MongoClient(MONGO_URL)
    return client[DB_NAME]


@pytest.fixture(scope="session")
def session():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


# ---------------- Regression: system config ----------------

def test_system_config(session):
    r = session.get(f"{API}/system/config", timeout=15)
    assert r.status_code == 200, r.text
    data = r.json()
    assert "global_ai_enabled" in data
    assert "daily_budget_inr" in data
    assert "user_daily_free_limit" in data
    assert isinstance(data["global_ai_enabled"], bool)
    assert isinstance(data["daily_budget_inr"], (int, float))
    assert isinstance(data["user_daily_free_limit"], int)


# ---------------- Regression: tutor chat ----------------

def test_tutor_chat_basic(session):
    uid = f"qa-tutor-{uuid.uuid4().hex[:8]}"
    r = session.post(
        f"{API}/ai/tutor/chat",
        json={"message": "Hello, please give me one tip to improve fluency."},
        headers={"X-User-Id": uid, "X-Is-Premium": "true"},
        timeout=90,
    )
    assert r.status_code == 200, r.text
    data = r.json()
    assert "reply" in data and isinstance(data["reply"], str) and data["reply"].strip()
    assert "session_id" in data and isinstance(data["session_id"], str) and data["session_id"]


# ---------------- TMAY evaluate ----------------

TMAY_TRANSCRIPT = (
    "Hello, my name is Rohan Sharma and I am a final-year B.Tech computer science student from Pune. "
    "Over the last two years I built three full-stack projects and interned at a fintech startup where "
    "I shipped a payment dashboard used by 500 customers. I love solving real user problems and now I "
    "want to start my career as a software engineer at a fast-growing product company where I can grow "
    "into a senior role in three years."
)


def test_tmay_evaluate_full_shape(session):
    uid = f"qa-tmay-shape-{uuid.uuid4().hex[:8]}"
    r = session.post(
        f"{API}/ai/tmay/evaluate",
        json={
            "transcript": TMAY_TRANSCRIPT,
            "duration_sec": 55,
            "role_target": "Software Engineer Fresher",
            "experience_level": "fresher",
        },
        headers={"X-User-Id": uid, "X-Is-Premium": "true"},
        timeout=120,
    )
    assert r.status_code == 200, r.text
    d = r.json()
    # int score axes 0..100
    for k in ("overall", "structure", "clarity", "confidence", "relevance", "impact"):
        assert k in d, f"missing {k}"
        assert isinstance(d[k], int), f"{k} not int: {d[k]!r}"
        assert 0 <= d[k] <= 100, f"{k} out of range: {d[k]}"
    # bools
    for k in ("has_hook", "has_past", "has_present", "has_future"):
        assert isinstance(d[k], bool), f"{k} not bool: {d[k]!r}"
    # arrays
    for k in ("filler_words", "strengths", "weaknesses", "missing_elements"):
        assert isinstance(d[k], list), f"{k} not list"
    # non-empty strings
    assert isinstance(d["polished_version"], str) and d["polished_version"].strip(), "polished_version empty"
    assert isinstance(d["next_goal"], str) and d["next_goal"].strip(), "next_goal empty"
    assert isinstance(d["feedback"], str) and d["feedback"].strip(), "feedback empty"
    # Realism check — not all zeros
    score_sum = sum(d[k] for k in ("overall", "structure", "clarity", "confidence", "relevance", "impact"))
    assert score_sum > 0, f"All scores zero, model likely failed: {d}"


# ---------------- TMAY quota guard ----------------

def test_tmay_quota_guard_returns_429(session, mongo_db):
    """The guard checks user_usage count vs user_daily_free_limit BEFORE making LLM call.
    Instead of firing 31 real LLM calls (~5+ min), we pre-seed today's user_usage doc to
    the limit and verify the 31st request gets a clean 429 with detail.code==user_quota_exceeded.
    """
    uid = f"qa-tmay-quota-{uuid.uuid4().hex[:8]}"
    # discover limit from /api/system/config
    cfg = session.get(f"{API}/system/config", timeout=10).json()
    limit = int(cfg["user_daily_free_limit"])
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    # seed user_usage to exactly the limit so next call must exceed it
    mongo_db.user_usage.update_one(
        {"uid": uid, "date": today},
        {"$set": {"uid": uid, "date": today, "calls": limit}},
        upsert=True,
    )
    try:
        r = session.post(
            f"{API}/ai/tmay/evaluate",
            json={
                "transcript": TMAY_TRANSCRIPT,
                "duration_sec": 50,
                "role_target": "Sales Executive",
                "experience_level": "fresher",
            },
            headers={"X-User-Id": uid},  # no premium header
            timeout=30,
        )
        assert r.status_code == 429, f"expected 429, got {r.status_code}: {r.text}"
        body = r.json()
        detail = body.get("detail") or {}
        assert isinstance(detail, dict), f"detail not a dict: {detail!r}"
        assert detail.get("code") == "user_quota_exceeded", f"unexpected detail: {detail}"
    finally:
        mongo_db.user_usage.delete_one({"uid": uid, "date": today})


# ---------------- Roadmap generate ----------------

def test_roadmap_generate_30_days(session):
    uid = f"qa-roadmap-{uuid.uuid4().hex[:8]}"
    r = session.post(
        f"{API}/ai/roadmap/generate",
        json={
            "user_name": "QA Tester",
            "role_target": "Sales Executive",
            "current_level": "beginner",
            "weak_areas": ["confidence", "tmay"],
            "daily_minutes": 10,
        },
        headers={"X-User-Id": uid, "X-Is-Premium": "true"},
        timeout=180,
    )
    assert r.status_code == 200, r.text
    d = r.json()
    assert isinstance(d.get("summary"), str) and d["summary"].strip(), "summary empty"
    assert isinstance(d.get("goal_title"), str) and d["goal_title"].strip(), "goal_title empty"
    days = d.get("days")
    assert isinstance(days, list), "days not list"
    assert len(days) == 30, f"expected 30 days, got {len(days)}"
    seen_days = set()
    for i, day in enumerate(days):
        assert isinstance(day["day"], int) and 1 <= day["day"] <= 30, f"bad day#: {day}"
        seen_days.add(day["day"])
        assert isinstance(day["title"], str) and day["title"].strip(), f"day {i} title empty"
        assert isinstance(day["focus"], str), f"day {i} focus not str"
        assert isinstance(day["tasks"], list) and len(day["tasks"]) > 0, f"day {i} tasks empty"
        assert isinstance(day["tip"], str), f"day {i} tip not str"
    assert len(seen_days) == 30, f"duplicate day numbers: only {len(seen_days)} unique"
    # focus rotation — no 5 consecutive same focus
    focuses = [day["focus"] for day in days]
    for i in range(len(focuses) - 4):
        window = focuses[i : i + 5]
        assert len(set(window)) > 1, f"focus repeats 5 times at idx {i}: {window}"


# ---------------- Speaking score 5-axis ----------------

def test_speaking_score_unified_5axis(session):
    uid = f"qa-spk-{uuid.uuid4().hex[:8]}"
    r = session.post(
        f"{API}/ai/speaking/score",
        json={
            "transcript": "I usually spend my weekends with friends watching movies and going to cafes. Sometimes we travel to nearby hill stations on long weekends.",
            "duration_sec": 18,
            "prompt": "Describe your weekend",
        },
        headers={"X-User-Id": uid, "X-Is-Premium": "true"},
        timeout=120,
    )
    assert r.status_code == 200, r.text
    d = r.json()
    # existing axes
    for k in ("overall", "pronunciation", "fluency", "grammar", "vocabulary"):
        assert isinstance(d[k], int), f"{k} not int"
    # new 5-axis fields
    assert isinstance(d["confidence"], int), f"confidence not int: {d['confidence']!r}"
    assert isinstance(d["strengths"], list), "strengths not list"
    assert all(isinstance(s, str) for s in d["strengths"]), "strengths must be strings"
    assert isinstance(d["weaknesses"], list), "weaknesses not list"
    assert all(isinstance(s, str) for s in d["weaknesses"]), "weaknesses must be strings"
    assert isinstance(d["next_goal"], str), "next_goal not str"
    assert isinstance(d["action_plan"], list), "action_plan not list"
    assert all(isinstance(s, str) for s in d["action_plan"]), "action_plan must be strings"
    # legacy fields still present
    assert isinstance(d["mistakes"], list)
    assert isinstance(d["corrected"], str)
    assert isinstance(d["suggested"], str)
    assert isinstance(d["feedback"], str) and d["feedback"].strip()
