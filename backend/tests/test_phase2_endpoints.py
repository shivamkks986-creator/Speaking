"""
Backend tests for SpeakMate AI Phase-2 (Career Launchpad Phase 1.5) endpoints:
- GET  /api/ai/sales/scenarios
- POST /api/ai/sales/turn (open + follow-up + auto-end + invalid scenario)
- POST /api/ai/sales/score-session
- POST /api/ai/resume/parse (happy + non-pdf + too-large + empty)
- POST /api/ai/resume/interview-questions
- Regression smoke: tmay/evaluate, roadmap/generate, speaking/score
- Quota guard 429 on all new endpoints
"""
import io
import os
import uuid

import pytest
import requests
from pymongo import MongoClient
from datetime import datetime, timezone
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import letter

BASE_URL = "http://localhost:8001"
API = f"{BASE_URL}/api"

MONGO_URL = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
DB_NAME = os.environ.get("DB_NAME", "test_database")

# Long timeout — gpt-5.2 / claude calls can take 15-25s
T = 60


# ---------------- fixtures ----------------

@pytest.fixture(scope="session")
def mongo_db():
    client = MongoClient(MONGO_URL)
    return client[DB_NAME]


@pytest.fixture(scope="session")
def session():
    s = requests.Session()
    return s


def _today() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%d")


def _build_resume_pdf() -> bytes:
    """Build a small multi-section text PDF in-memory."""
    buf = io.BytesIO()
    c = canvas.Canvas(buf, pagesize=letter)
    y = 750
    lines = [
        "Rahul Sharma",
        "Email: rahul.sharma@example.com | Phone: +91 9876543210",
        "Target Role: Backend Engineer",
        "",
        "SUMMARY",
        "Backend engineer with 3 years of experience building Python FastAPI microservices",
        "and scalable systems on AWS. Strong in distributed systems and SQL.",
        "",
        "SKILLS",
        "Python, FastAPI, Django, PostgreSQL, MongoDB, Redis, Docker, Kubernetes, AWS, Git",
        "",
        "EXPERIENCE",
        "Acme Corp - Backend Engineer (Jan 2022 - Present)",
        "- Built order-service handling 5M requests/day using FastAPI + Postgres",
        "- Reduced API p99 latency by 40% via Redis caching",
        "- Mentored 2 junior engineers",
        "",
        "Zeta Tech - Software Engineer Intern (Jun 2021 - Dec 2021)",
        "- Migrated legacy PHP monolith endpoints to Django REST",
        "",
        "EDUCATION",
        "B.Tech in Computer Science, IIT Delhi, 2021",
    ]
    for ln in lines:
        c.drawString(50, y, ln)
        y -= 16
    c.showPage()
    # Page 2
    y = 750
    page2 = [
        "PROJECTS",
        "OrderFlow - Open-source order-management toolkit",
        "- Built with FastAPI, Postgres, and Celery; 800+ GitHub stars",
        "- Implemented distributed locking via Redis",
        "",
        "ChatBuddy - Real-time chat app",
        "- React Native + Socket.io backend; supports 10k concurrent users",
        "",
        "CERTIFICATIONS",
        "AWS Certified Developer Associate (2023)",
        "MongoDB Certified Developer (2022)",
    ]
    for ln in page2:
        c.drawString(50, y, ln)
        y -= 16
    c.save()
    return buf.getvalue()


@pytest.fixture(scope="session")
def resume_pdf_bytes():
    return _build_resume_pdf()


# ================== /api/ai/sales/scenarios ==================

def test_sales_scenarios_shape(session):
    r = session.get(f"{API}/ai/sales/scenarios", timeout=T)
    assert r.status_code == 200, r.text
    data = r.json()
    assert "scenarios" in data
    scenarios = data["scenarios"]
    assert len(scenarios) == 6, f"Expected 6, got {len(scenarios)}"
    industries = {s["industry"] for s in scenarios}
    for need in ["EdTech", "Insurance", "Real Estate", "B2B SaaS", "College Admission"]:
        assert need in industries, f"Missing industry {need}; got {industries}"
    for s in scenarios:
        for k in ("id", "industry", "title", "customer", "goal"):
            assert k in s and s[k], f"Scenario missing field {k}: {s}"


# ================== /api/ai/sales/turn ==================

def test_sales_turn_opening_then_follow_up(session):
    uid = f"qa-sales-{uuid.uuid4().hex[:8]}"
    headers = {"X-User-Id": uid, "X-Is-Premium": "true"}  # premium bypass quota
    # Opening turn
    r1 = session.post(
        f"{API}/ai/sales/turn",
        json={"scenario_id": "edtech_parent", "history": [], "user_message": None, "target_turns": 4},
        headers=headers, timeout=T,
    )
    assert r1.status_code == 200, r1.text
    d1 = r1.json()
    assert d1.get("customer_reply"), "customer_reply empty on opener"
    assert d1.get("scores") is None, f"opener should not have scores, got {d1.get('scores')}"
    assert d1.get("turn_number") == 1
    assert d1.get("should_end") is False

    # follow-up user turn
    history = [{"role": "customer", "text": d1["customer_reply"]}]
    r2 = session.post(
        f"{API}/ai/sales/turn",
        json={
            "scenario_id": "edtech_parent",
            "history": history,
            "user_message": "Sir, hamara coding bootcamp 6 months ka hai aur 95% placement guarantee deta hai.",
            "target_turns": 4,
        },
        headers=headers, timeout=T,
    )
    assert r2.status_code == 200, r2.text
    d2 = r2.json()
    sc = d2.get("scores")
    assert isinstance(sc, dict), f"scores missing after user_message: {d2}"
    for k in ("empathy", "persuasion", "objection_handling", "product_knowledge", "closing"):
        assert k in sc and isinstance(sc[k], int), f"scores.{k} missing/not int: {sc}"
    assert d2.get("turn_number") in (1, 2), f"unexpected turn_number {d2.get('turn_number')}"


def test_sales_turn_auto_end_after_target(session):
    """Send 4 user turns with target_turns=4; verify 4th has should_end=true."""
    uid = f"qa-sales-end-{uuid.uuid4().hex[:8]}"
    headers = {"X-User-Id": uid, "X-Is-Premium": "true"}
    history: list[dict] = []
    last_resp = None
    user_msgs = [
        "Namaste sir, main aapko hamare term plan ke baare mein batana chahta hoon — sirf ₹500/month mein 1 crore cover.",
        "Sir, abhi shaadi nahi hui to bhi 26 saal mein premium sabse kam aata hai — lock-in ho jaata hai aaj lagao to.",
        "Sir, IRDAI approved policy hai, claim ratio 98% — main aapko proof bhi bhej deta hoon WhatsApp pe.",
        "Sir bas 5 minute aur — paperwork zero hai, online sign karke aaj hi policy issue ho jaayegi. Chalein shuru karein?",
    ]
    for i, msg in enumerate(user_msgs, start=1):
        r = session.post(
            f"{API}/ai/sales/turn",
            json={"scenario_id": "insurance_term", "history": history, "user_message": msg, "target_turns": 4},
            headers=headers, timeout=T,
        )
        assert r.status_code == 200, f"turn {i}: {r.text}"
        last_resp = r.json()
        history.append({"role": "user", "text": msg})
        history.append({"role": "customer", "text": last_resp.get("customer_reply", "")})
    assert last_resp is not None
    assert last_resp.get("should_end") is True, f"4th turn should auto-end, got {last_resp}"


def test_sales_turn_invalid_scenario_404(session):
    uid = f"qa-sales-404-{uuid.uuid4().hex[:8]}"
    headers = {"X-User-Id": uid, "X-Is-Premium": "true"}
    r = session.post(
        f"{API}/ai/sales/turn",
        json={"scenario_id": "does_not_exist_xyz", "history": [], "user_message": None},
        headers=headers, timeout=T,
    )
    assert r.status_code == 404, r.text


# ================== /api/ai/sales/score-session ==================

def test_sales_score_session_full_report(session):
    uid = f"qa-sales-score-{uuid.uuid4().hex[:8]}"
    headers = {"X-User-Id": uid, "X-Is-Premium": "true"}
    history = [
        {"role": "customer", "text": "Bhai mujhe insurance nahi chahiye, abhi koi dependent nahi hai."},
        {"role": "user",     "text": "Sir samajhta hoon, par 26 saal mein premium lifetime lock hota hai — sirf ₹500/month."},
        {"role": "customer", "text": "₹500 mehnga lagta hai, koi discount?"},
        {"role": "user",     "text": "Sir, agar aaj sign karein to hum first month free de sakte hain — IRDAI approved hai."},
        {"role": "customer", "text": "Theek hai, papers bhejo. Sign kar dunga."},
        {"role": "user",     "text": "Bahut khushi hui sir — main abhi link bhejta hoon WhatsApp pe."},
    ]
    r = session.post(
        f"{API}/ai/sales/score-session",
        json={"scenario_id": "insurance_term", "history": history, "converted": True},
        headers=headers, timeout=T,
    )
    assert r.status_code == 200, r.text
    d = r.json()
    assert isinstance(d.get("overallScore"), int) and 0 <= d["overallScore"] <= 100
    for k in ("empathyScore", "persuasionScore", "objectionScore", "productScore", "closingScore"):
        assert isinstance(d.get(k), int), f"{k} missing/not int"
    assert isinstance(d.get("strengths"), list) and len(d["strengths"]) >= 1
    assert isinstance(d.get("improvements"), list) and len(d["improvements"]) >= 1
    assert d.get("outcome_summary"), "outcome_summary empty"
    assert d.get("sample_winning_pitch"), "sample_winning_pitch empty"


# ================== /api/ai/resume/parse ==================

def test_resume_parse_happy_path(session, resume_pdf_bytes):
    uid = f"qa-resume-{uuid.uuid4().hex[:8]}"
    headers = {"X-User-Id": uid, "X-Is-Premium": "true"}
    files = {"file": ("rahul_resume.pdf", resume_pdf_bytes, "application/pdf")}
    r = session.post(f"{API}/ai/resume/parse", files=files, headers=headers, timeout=T)
    assert r.status_code == 200, r.text
    d = r.json()
    assert d.get("name"), f"name empty: {d}"
    assert d.get("role_target"), "role_target empty"
    assert d.get("summary"), "summary empty"
    assert isinstance(d.get("skills"), list) and len(d["skills"]) >= 3, f"skills too few: {d.get('skills')}"
    assert isinstance(d.get("experience"), list) and len(d["experience"]) >= 1
    exp0 = d["experience"][0]
    assert exp0.get("company"), "experience[0].company empty"
    assert exp0.get("title"), "experience[0].title empty"
    assert isinstance(exp0.get("highlights"), list), "experience[0].highlights not list"
    assert isinstance(d.get("education"), list) and len(d["education"]) >= 1
    assert isinstance(d.get("projects"), list) and len(d["projects"]) >= 1
    assert isinstance(d.get("years_of_experience"), int)
    assert isinstance(d.get("raw_text_excerpt"), str) and len(d["raw_text_excerpt"]) <= 500


def test_resume_parse_non_pdf_returns_400(session):
    headers = {"X-User-Id": f"qa-r400-{uuid.uuid4().hex[:8]}", "X-Is-Premium": "true"}
    files = {"file": ("notes.txt", b"Just a text file, not a PDF.", "text/plain")}
    r = session.post(f"{API}/ai/resume/parse", files=files, headers=headers, timeout=T)
    assert r.status_code == 400, f"expected 400 for non-pdf, got {r.status_code}: {r.text}"


def test_resume_parse_too_large_returns_413(session):
    """Build a >5 MB PDF and verify 413."""
    headers = {"X-User-Id": f"qa-r413-{uuid.uuid4().hex[:8]}", "X-Is-Premium": "true"}
    # Build a valid pdf header + 6 MB padding (server checks size before parsing).
    buf = io.BytesIO()
    c = canvas.Canvas(buf, pagesize=letter)
    c.drawString(100, 750, "padding")
    c.save()
    small = buf.getvalue()
    # Pad with bytes (server only checks len(contents) > 5MB; pypdf would fail but size check is first)
    big = small + (b"%" + b"a" * (6 * 1024 * 1024))
    files = {"file": ("big.pdf", big, "application/pdf")}
    r = session.post(f"{API}/ai/resume/parse", files=files, headers=headers, timeout=T)
    assert r.status_code == 413, f"expected 413, got {r.status_code}: {r.text[:200]}"


def test_resume_parse_empty_pdf_returns_422(session):
    """A PDF with no extractable text should return 422."""
    headers = {"X-User-Id": f"qa-r422-{uuid.uuid4().hex[:8]}", "X-Is-Premium": "true"}
    buf = io.BytesIO()
    c = canvas.Canvas(buf, pagesize=letter)
    # No drawString → blank page
    c.showPage()
    c.save()
    files = {"file": ("blank.pdf", buf.getvalue(), "application/pdf")}
    r = session.post(f"{API}/ai/resume/parse", files=files, headers=headers, timeout=T)
    assert r.status_code == 422, f"expected 422, got {r.status_code}: {r.text[:200]}"


# ================== /api/ai/resume/interview-questions ==================

def test_resume_interview_questions(session):
    uid = f"qa-rq-{uuid.uuid4().hex[:8]}"
    headers = {"X-User-Id": uid, "X-Is-Premium": "true"}
    resume = {
        "name": "Rahul Sharma",
        "role_target": "Backend Engineer",
        "summary": "Backend engineer with 3 years of FastAPI experience.",
        "skills": ["Python", "FastAPI", "PostgreSQL", "Redis", "Docker"],
        "experience": [
            {
                "company": "Acme Corp",
                "title": "Backend Engineer",
                "duration": "Jan 2022 - Present",
                "highlights": [
                    "Built order-service handling 5M req/day with FastAPI",
                    "Cut p99 latency 40% via Redis caching",
                ],
            }
        ],
        "education": [{"institution": "IIT Delhi", "degree": "B.Tech CS", "year": "2021"}],
        "projects": [
            {"name": "OrderFlow", "description": "Order management toolkit", "tech": ["FastAPI", "Postgres", "Celery"]}
        ],
        "certifications": ["AWS Certified Developer"],
        "years_of_experience": 3,
        "raw_text_excerpt": "",
    }
    r = session.post(
        f"{API}/ai/resume/interview-questions",
        json={"resume": resume, "role_target": "Backend Engineer", "difficulty": "intermediate"},
        headers=headers, timeout=T,
    )
    assert r.status_code == 200, r.text
    d = r.json()
    qs = d.get("questions") or []
    assert 8 <= len(qs) <= 10, f"expected 8-10 questions, got {len(qs)}"
    for q in qs:
        assert q.get("question"), f"empty question text in {q}"
        assert q.get("category"), f"missing category in {q}"
        assert q.get("difficulty"), f"missing difficulty in {q}"
    fa = d.get("focus_areas") or []
    assert 2 <= len(fa) <= 4, f"focus_areas expected 2-4, got {len(fa)}"
    assert d.get("target_role") == "Backend Engineer"
    # At least one question references something from the resume
    blob = " ".join(q["question"].lower() for q in qs)
    referenced_terms = ["acme", "orderflow", "fastapi", "redis", "postgres", "iit", "5m", "p99", "caching", "order"]
    assert any(t in blob for t in referenced_terms), f"no question references resume content; blob={blob[:300]}"


# ================== Regression smokes ==================

def test_regression_tmay_evaluate(session):
    uid = f"qa-reg-tmay-{uuid.uuid4().hex[:8]}"
    headers = {"X-User-Id": uid, "X-Is-Premium": "true"}
    r = session.post(
        f"{API}/ai/tmay/evaluate",
        json={
            "transcript": "Hi, I am Rahul. I graduated from IIT Delhi in 2021 with a CS degree. "
                          "Currently I work at Acme Corp as a backend engineer building FastAPI services. "
                          "In future I want to lead a backend platform team.",
            "duration_sec": 30.0,
            "role_target": "Backend Engineer",
            "experience_level": "experienced",
        },
        headers=headers, timeout=T,
    )
    assert r.status_code == 200, r.text
    d = r.json()
    for k in ("overall", "structure", "clarity", "confidence", "relevance", "impact"):
        assert isinstance(d.get(k), int)
    assert "polished_version" in d


def test_regression_roadmap_generate(session):
    uid = f"qa-reg-rmp-{uuid.uuid4().hex[:8]}"
    headers = {"X-User-Id": uid, "X-Is-Premium": "true"}
    r = session.post(
        f"{API}/ai/roadmap/generate",
        json={
            "user_name": "Rahul",
            "role_target": "Backend Engineer",
            "current_level": "intermediate",
            "weak_areas": ["confidence"],
            "daily_minutes": 15,
        },
        headers=headers, timeout=T + 30,
    )
    assert r.status_code == 200, r.text
    d = r.json()
    assert isinstance(d.get("days"), list) and len(d["days"]) == 30


def test_regression_speaking_score_5_axis(session):
    uid = f"qa-reg-sp-{uuid.uuid4().hex[:8]}"
    headers = {"X-User-Id": uid, "X-Is-Premium": "true"}
    r = session.post(
        f"{API}/ai/speaking/score",
        json={
            "transcript": "I am preparing for backend engineering interviews and practising daily.",
            "duration_sec": 8.0,
            "prompt": "Tell me about your preparation",
        },
        headers=headers, timeout=T,
    )
    assert r.status_code == 200, r.text
    d = r.json()
    for k in ("overall", "pronunciation", "fluency", "grammar", "vocabulary"):
        assert isinstance(d.get(k), int), f"{k} not int"


# ================== Quota guard 429 ==================

QUOTA_ENDPOINTS = [
    # (path, method, json/files builder)
    ("/ai/sales/turn", "json", {"scenario_id": "edtech_parent", "history": [], "user_message": None}),
    ("/ai/sales/score-session", "json", {
        "scenario_id": "insurance_term",
        "history": [
            {"role": "customer", "text": "Mujhe nahi chahiye"},
            {"role": "user", "text": "Sir please ek baar suniye"},
        ],
        "converted": False,
    }),
    ("/ai/resume/parse", "file", None),  # special-cased
    ("/ai/resume/interview-questions", "json", {
        "resume": {
            "name": "Test", "role_target": "Engineer", "summary": "x", "skills": ["a", "b", "c"],
            "experience": [], "education": [], "projects": [], "certifications": [],
            "years_of_experience": 0, "raw_text_excerpt": ""
        },
        "role_target": "Engineer",
    }),
]


@pytest.mark.parametrize("path,kind,payload", QUOTA_ENDPOINTS)
def test_quota_429_when_user_at_limit(session, mongo_db, resume_pdf_bytes, path, kind, payload):
    """Seed user_usage at limit, call endpoint, expect 429 with detail.code='user_quota_exceeded'."""
    uid = f"qa-quota-{uuid.uuid4().hex[:8]}"
    today = _today()
    # Read limit dynamically
    state = mongo_db.system_state.find_one({"_id": "config"})
    limit = int((state or {}).get("user_daily_free_limit", 30))
    mongo_db.user_usage.update_one(
        {"uid": uid, "date": today},
        {"$set": {"calls": limit}},
        upsert=True,
    )
    try:
        headers = {"X-User-Id": uid, "X-Is-Premium": "false"}
        if kind == "json":
            r = session.post(f"{API}{path}", json=payload, headers=headers, timeout=T)
        else:  # file
            files = {"file": ("r.pdf", resume_pdf_bytes, "application/pdf")}
            r = session.post(f"{API}{path}", files=files, headers=headers, timeout=T)
        assert r.status_code == 429, f"{path}: expected 429 got {r.status_code}: {r.text[:200]}"
        body = r.json()
        detail = body.get("detail") or {}
        assert isinstance(detail, dict), f"{path}: detail not dict: {body}"
        assert detail.get("code") == "user_quota_exceeded", f"{path}: wrong code {detail}"
    finally:
        mongo_db.user_usage.delete_one({"uid": uid, "date": today})
