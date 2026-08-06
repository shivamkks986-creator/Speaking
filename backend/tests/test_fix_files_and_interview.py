"""Tests for /api/fix-files/* endpoints and new enriched interview contracts."""
import os
import json
import pytest
import requests

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://gift-hub-sync.preview.emergentagent.com').rstrip('/')

EXPECTED_FILES = [
    "app.json", "withAndroidBuildFixes.js", "useScreenInsets.ts", "aiService.ts",
    "ScreenContainer.tsx", "HomeScreen.tsx", "AITutorScreen.tsx",
    "SpeakingPracticeScreen.tsx", "InterviewCoachScreen.tsx", "LiveInterviewScreen.tsx",
    "PremiumScreen.tsx", "ResumeUploadScreen.tsx", "ResumeInterviewScreen.tsx",
    "RoadmapScreen.tsx", "CompanionsScreen.tsx", "TmayTrainerScreen.tsx",
    "FlashcardsScreen.tsx", "sync-ui-fix.ps1",
]


# ----------------- fix-files listing -----------------
def test_list_fix_files():
    r = requests.get(f"{BASE_URL}/api/fix-files", timeout=30)
    assert r.status_code == 200, r.text
    data = r.json()
    assert "files" in data
    files = data["files"]
    assert isinstance(files, list)
    # Every expected file must be in the listing
    for f in EXPECTED_FILES:
        assert f in files, f"Missing expected file: {f}"


# ----------------- app.json content -----------------
def test_app_json_content():
    r = requests.get(f"{BASE_URL}/api/fix-files/app.json", timeout=30)
    assert r.status_code == 200
    body = json.loads(r.text)
    assert body["expo"]["version"] == "1.0.5", f"version={body['expo'].get('version')}"
    assert body["expo"]["android"]["versionCode"] == 6, f"versionCode={body['expo']['android'].get('versionCode')}"


# ----------------- ps1 UTF-8 BOM + ASCII body -----------------
def test_sync_ui_fix_ps1_bom_and_ascii():
    r = requests.get(f"{BASE_URL}/api/fix-files/sync-ui-fix.ps1", timeout=30)
    assert r.status_code == 200
    raw = r.content
    assert raw[:3] == b"\xef\xbb\xbf", f"Missing BOM, first bytes: {raw[:6]!r}"
    body = raw[3:]
    non_ascii = [b for b in body if b > 127]
    assert len(non_ascii) == 0, f"Found {len(non_ascii)} non-ASCII bytes in ps1 body"


# ----------------- withAndroidBuildFixes.js content -----------------
def test_withAndroidBuildFixes_plugin():
    r = requests.get(f"{BASE_URL}/api/fix-files/withAndroidBuildFixes.js", timeout=30)
    assert r.status_code == 200
    assert "windowLayoutInDisplayCutoutMode" in r.text


# ----------------- Whitelist enforcement -----------------
def test_unknown_file_returns_404():
    r = requests.get(f"{BASE_URL}/api/fix-files/DoesNotExist.txt", timeout=30)
    assert r.status_code == 404
    # JSON error detail
    data = r.json()
    assert "detail" in data


# ----------------- Every whitelisted file returns 200 with non-empty body -----------------
NON_EMPTY_FILES = [
    "useScreenInsets.ts", "aiService.ts", "ScreenContainer.tsx", "HomeScreen.tsx",
    "AITutorScreen.tsx", "SpeakingPracticeScreen.tsx", "InterviewCoachScreen.tsx",
    "LiveInterviewScreen.tsx", "PremiumScreen.tsx", "ResumeUploadScreen.tsx",
    "ResumeInterviewScreen.tsx", "RoadmapScreen.tsx", "CompanionsScreen.tsx",
    "TmayTrainerScreen.tsx", "FlashcardsScreen.tsx",
]

@pytest.mark.parametrize("name", NON_EMPTY_FILES)
def test_fix_file_reachable(name):
    r = requests.get(f"{BASE_URL}/api/fix-files/{name}", timeout=30)
    assert r.status_code == 200, f"{name} -> {r.status_code}"
    assert len(r.text) > 0, f"{name} empty body"


# ----------------- OpenAPI schema shape check for interview endpoints -----------------
def test_openapi_interview_eval_shape():
    r = requests.get(f"{BASE_URL}/api/openapi.json", timeout=30)
    assert r.status_code == 200
    spec = r.json()
    schemas = spec.get("components", {}).get("schemas", {})
    # Find InterviewEvalResponse
    eval_schema = schemas.get("InterviewEvalResponse")
    assert eval_schema is not None, "InterviewEvalResponse schema missing"
    props = eval_schema.get("properties", {})
    for field in ["score", "feedback", "strengths", "improvements", "example"]:
        assert field in props, f"InterviewEvalResponse missing field: {field}"


def test_openapi_interview_live_shape():
    r = requests.get(f"{BASE_URL}/api/openapi.json", timeout=30)
    assert r.status_code == 200
    spec = r.json()
    schemas = spec.get("components", {}).get("schemas", {})
    live_schema = schemas.get("LiveInterviewResponse")
    assert live_schema is not None, "LiveInterviewResponse schema missing"
    props = live_schema.get("properties", {})
    for field in ["scores", "feedback", "strong_points", "weak_points",
                  "better_version", "next_question", "should_end", "question_number"]:
        assert field in props, f"LiveInterviewResponse missing field: {field}"


# ----------------- Live LLM calls (best-effort, generous timeout) -----------------
def test_interview_evaluate_live():
    payload = {
        "question": "Tell me about a challenging situation.",
        "answer": "I handled a delayed payout issue for a merchant. Listened, escalated to finance, resolved in 24 hours.",
        "track": "hr",
    }
    try:
        r = requests.post(f"{BASE_URL}/api/ai/interview/evaluate", json=payload, timeout=90)
    except requests.exceptions.RequestException as e:
        pytest.skip(f"LLM call network issue: {e}")
    assert r.status_code == 200, f"{r.status_code}: {r.text[:400]}"
    data = r.json()
    assert isinstance(data.get("score"), int)
    assert isinstance(data.get("feedback"), str)
    assert isinstance(data.get("strengths"), list)
    assert isinstance(data.get("improvements"), list)
    assert isinstance(data.get("example"), str)


def test_interview_live_endpoint():
    payload = {
        "track": "hr",
        "history": [],
        "last_question": "Tell me about yourself.",
        "last_answer": "I am a sales professional with 4 years of experience in EdTech.",
        "target_questions": 5,
        "difficulty": "intermediate",
    }
    headers = {"X-User-Id": "test-user-1", "X-Is-Premium": "true"}
    try:
        r = requests.post(f"{BASE_URL}/api/ai/interview/live", json=payload, headers=headers, timeout=90)
    except requests.exceptions.RequestException as e:
        pytest.skip(f"LLM call network issue: {e}")
    assert r.status_code == 200, f"{r.status_code}: {r.text[:400]}"
    data = r.json()
    assert isinstance(data.get("scores"), dict)
    assert len(data["scores"]) >= 6, f"Expected 6-axis scores, got {list(data['scores'].keys())}"
    assert isinstance(data.get("feedback"), str)
    assert isinstance(data.get("strong_points"), list)
    assert isinstance(data.get("weak_points"), list)
    assert isinstance(data.get("better_version"), str)
    assert isinstance(data.get("next_question"), str)
    assert isinstance(data.get("should_end"), bool)
    assert isinstance(data.get("question_number"), int)
