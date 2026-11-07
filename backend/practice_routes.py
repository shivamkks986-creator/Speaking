"""Roadmap progress + Accent Improvement routes (Bearer-auth, Mongo-backed)."""
from __future__ import annotations

import difflib
import logging
import os
import re
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from emergentintegrations.llm.chat import UserMessage
from fastapi import APIRouter, Depends, HTTPException
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field

import usage_tracker as ut
from ai_routes import _extract_json, _new_chat
from auth_deps import require_uid

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/practice")
_db = AsyncIOMotorClient(os.environ["MONGO_URL"])[os.environ["DB_NAME"]]

TOTAL_DAYS = 30
ACCENT_FREE_DAILY = 5
ACCENT_ENDPOINT = "accent_evaluate"


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


# ==================== ROADMAP PROGRESS ====================

class RoadmapProgress(BaseModel):
    plan: Optional[Dict[str, Any]] = None
    completed_days: List[int] = Field(default_factory=list)
    scores: Dict[str, int] = Field(default_factory=dict)
    updated_at: Optional[str] = None


class SavePlanRequest(BaseModel):
    plan: Dict[str, Any]


class CompleteDayRequest(BaseModel):
    day: int = Field(ge=1, le=TOTAL_DAYS)
    score: Optional[int] = Field(default=None, ge=0, le=100)


class ResetRequest(BaseModel):
    confirm: str


def _to_progress(doc: Optional[dict]) -> RoadmapProgress:
    if not doc:
        return RoadmapProgress()
    return RoadmapProgress(
        plan=doc.get("plan"),
        completed_days=sorted(set(int(d) for d in doc.get("completed_days", []))),
        scores={str(k): int(v) for k, v in (doc.get("scores") or {}).items()},
        updated_at=doc.get("updated_at"),
    )


@router.get("/roadmap", response_model=RoadmapProgress)
async def get_roadmap(uid: str = Depends(require_uid)) -> RoadmapProgress:
    return _to_progress(await _db.roadmap_progress.find_one({"uid": uid}))


@router.put("/roadmap/plan", response_model=RoadmapProgress)
async def save_plan(req: SavePlanRequest, uid: str = Depends(require_uid)) -> RoadmapProgress:
    # Saving a plan never touches completed days/scores.
    days = req.plan.get("days")
    if not isinstance(days, list) or len(days) == 0:
        raise HTTPException(status_code=400, detail="invalid_plan")
    await _db.roadmap_progress.update_one(
        {"uid": uid},
        {"$set": {"plan": req.plan, "updated_at": _now()},
         "$setOnInsert": {"uid": uid, "completed_days": [], "scores": {}}},
        upsert=True,
    )
    return _to_progress(await _db.roadmap_progress.find_one({"uid": uid}))


@router.post("/roadmap/complete", response_model=RoadmapProgress)
async def complete_day(req: CompleteDayRequest, uid: str = Depends(require_uid)) -> RoadmapProgress:
    doc = await _db.roadmap_progress.find_one({"uid": uid}) or {}
    done = set(int(d) for d in doc.get("completed_days", []))
    if req.day not in done and req.day > len(done) + 1:
        raise HTTPException(status_code=409, detail="day_locked")
    update: Dict[str, Any] = {
        "$addToSet": {"completed_days": req.day},
        "$set": {"updated_at": _now()},
        "$setOnInsert": {"uid": uid},
    }
    if req.score is not None:
        prev = int((doc.get("scores") or {}).get(str(req.day), -1))
        if req.score > prev:
            update["$set"][f"scores.{req.day}"] = req.score
    await _db.roadmap_progress.update_one({"uid": uid}, update, upsert=True)
    return _to_progress(await _db.roadmap_progress.find_one({"uid": uid}))


@router.post("/roadmap/reset", response_model=RoadmapProgress)
async def reset_roadmap(req: ResetRequest, uid: str = Depends(require_uid)) -> RoadmapProgress:
    if req.confirm != "RESET":
        raise HTTPException(status_code=400, detail="confirmation_required")
    await _db.roadmap_progress.update_one(
        {"uid": uid},
        {"$set": {"plan": None, "completed_days": [], "scores": {}, "updated_at": _now()}},
    )
    return _to_progress(await _db.roadmap_progress.find_one({"uid": uid}))


# ==================== ACCENT IMPROVEMENT ====================

ACCENT_LABELS = {
    "indian": "neutral Indian English",
    "american": "General American English",
    "british": "British English (Received Pronunciation)",
}

ACCENT_SYSTEM = (
    "You are an English pronunciation coach. You receive a TARGET sentence the learner tried to read aloud, "
    "and the TRANSCRIPT that a speech recogniser produced from their recording, plus speaking duration. "
    "You CANNOT hear audio — reason only from transcript differences (misrecognised / missing / extra words usually "
    "signal unclear pronunciation) and from speaking pace. Never claim phoneme-level acoustic analysis. "
    "Give coaching for the requested accent style. "
    "Return ONLY JSON: "
    '{"clarity": int(0-100), "fluency": int(0-100), "intonation": int(0-100), '
    '"mistakes": [{"heard": "word or phrase recogniser heard (or \\"(missing)\\")", "expected": "target word", '
    '"tip": "short how-to-say-it tip for this accent, e.g. stress or mouth position"}], '
    '"corrected_examples": ["2 short practice sentences reusing the problem words"], '
    '"intonation_tip": "one tip on stress/rhythm for this sentence in the chosen accent", '
    '"feedback": "1-2 sentence encouraging summary"}'
)


class AccentEvalRequest(BaseModel):
    accent: str
    target: str = Field(min_length=3, max_length=300)
    transcript: str = Field(default="", max_length=600)
    duration_sec: float = Field(default=0, ge=0, le=120)


class AccentMistake(BaseModel):
    heard: str
    expected: str
    tip: str = ""


class AccentEvalResponse(BaseModel):
    id: str
    accent: str
    target: str
    transcript: str
    score: int
    word_match: int
    clarity: int
    fluency: int
    intonation: int
    words_per_minute: int
    mistakes: List[AccentMistake] = Field(default_factory=list)
    corrected_examples: List[str] = Field(default_factory=list)
    intonation_tip: str = ""
    feedback: str = ""
    method_note: str
    created_at: str
    remaining_today: int = -1


def _words(s: str) -> List[str]:
    return re.findall(r"[a-z0-9']+", s.lower())


def _clamp(v: Any) -> int:
    try:
        return max(0, min(100, int(v)))
    except (TypeError, ValueError):
        return 0


@router.post("/accent/evaluate", response_model=AccentEvalResponse)
async def accent_evaluate(req: AccentEvalRequest, uid: str = Depends(require_uid)) -> AccentEvalResponse:
    accent = req.accent.lower()
    if accent not in ACCENT_LABELS:
        raise HTTPException(status_code=400, detail="invalid_accent")

    reason = await ut.check_budget(ACCENT_ENDPOINT)
    if reason:
        raise HTTPException(status_code=503, detail={"code": "service_disabled", "reason": reason})
    is_premium = (await ut.get_user_active_plan(uid)) is not None
    used = await ut.get_user_endpoint_today(uid, ACCENT_ENDPOINT)
    if not is_premium and used >= ACCENT_FREE_DAILY:
        raise HTTPException(
            status_code=429,
            detail={"code": "user_quota_exceeded", "reason": f"accent:{used}/{ACCENT_FREE_DAILY}", "upgrade": True},
        )

    target_w, heard_w = _words(req.target), _words(req.transcript)
    if not heard_w:
        raise HTTPException(status_code=422, detail="no_speech_detected")
    word_match = round(difflib.SequenceMatcher(None, target_w, heard_w).ratio() * 100)
    wpm = round(len(heard_w) / (req.duration_sec / 60)) if req.duration_sec > 0 else 0

    chat = _new_chat(str(uuid.uuid4()), ACCENT_SYSTEM, "gemini", "gemini-3-flash-preview")
    prompt = (
        f"Accent style: {ACCENT_LABELS[accent]}\nTARGET: \"{req.target}\"\nTRANSCRIPT: \"{req.transcript}\"\n"
        f"Duration: {req.duration_sec:.1f}s, words per minute: {wpm}, word match: {word_match}%.\nReturn the JSON now."
    )
    try:
        data = _extract_json(await chat.send_message(UserMessage(text=prompt)))
    except HTTPException:
        raise
    except Exception as e:  # noqa: BLE001
        logger.exception("[accent] LLM error")
        raise HTTPException(status_code=502, detail="ai_service_unavailable") from e

    clarity, fluency, intonation = _clamp(data.get("clarity")), _clamp(data.get("fluency")), _clamp(data.get("intonation"))
    score = round(word_match * 0.5 + clarity * 0.2 + fluency * 0.2 + intonation * 0.1)
    mistakes = [
        AccentMistake(heard=str(m.get("heard", "")), expected=str(m.get("expected", "")), tip=str(m.get("tip", "")))
        for m in (data.get("mistakes") or []) if isinstance(m, dict) and m.get("expected")
    ][:6]
    examples = [str(x) for x in (data.get("corrected_examples") or []) if isinstance(x, str)][:3]

    await ut.record_call(ACCENT_ENDPOINT)
    # Own per-endpoint counter only, so accent practice doesn't eat other features' free quota.
    await _db.user_endpoint_usage.update_one(
        {"uid": uid, "date": ut._today_key(), "endpoint": ACCENT_ENDPOINT}, {"$inc": {"calls": 1}}, upsert=True,
    )

    res = AccentEvalResponse(
        id=str(uuid.uuid4()), accent=accent, target=req.target, transcript=req.transcript,
        score=score, word_match=word_match, clarity=clarity, fluency=fluency, intonation=intonation,
        words_per_minute=wpm, mistakes=mistakes, corrected_examples=examples,
        intonation_tip=str(data.get("intonation_tip", "")), feedback=str(data.get("feedback", "")),
        method_note="Score is based on what the speech recogniser understood (word match) plus AI review of your transcript and pace. It is not a phoneme-level audio analysis.",
        created_at=_now(),
        remaining_today=-1 if is_premium else max(0, ACCENT_FREE_DAILY - used - 1),
    )
    await _db.accent_history.insert_one({"uid": uid, **res.model_dump(exclude={"remaining_today"})})
    return res


class AccentHistoryItem(BaseModel):
    id: str
    accent: str
    target: str
    score: int
    created_at: str


class AccentHistoryResponse(BaseModel):
    items: List[AccentHistoryItem]
    attempts: int
    average: Dict[str, int]
    best: Dict[str, int]


@router.get("/accent/history", response_model=AccentHistoryResponse)
async def accent_history(uid: str = Depends(require_uid)) -> AccentHistoryResponse:
    docs = await _db.accent_history.find({"uid": uid}, {"_id": 0}).sort("created_at", -1).to_list(200)
    avg: Dict[str, int] = {}
    best: Dict[str, int] = {}
    for a in ACCENT_LABELS:
        s = [int(d["score"]) for d in docs if d.get("accent") == a]
        if s:
            avg[a] = round(sum(s) / len(s))
            best[a] = max(s)
    items = [AccentHistoryItem(**{k: d[k] for k in AccentHistoryItem.model_fields}) for d in docs[:30]]
    return AccentHistoryResponse(items=items, attempts=len(docs), average=avg, best=best)
