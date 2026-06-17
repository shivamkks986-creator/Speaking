"""AI routes for SpeakMate AI mobile app.

Multi-agent setup:
- AI Tutor (chat): GPT-5.2
- Speaking score: Claude Sonnet 4.6
- Interview (evaluate/followup/score-session): GPT-5.2
- Vocabulary lookup: Gemini 3 Flash
- Daily challenge evaluation: Claude Sonnet 4.6
- TTS (premium voices): OpenAI tts-1
- STT (Whisper): whisper-1
"""
from __future__ import annotations

import base64
import json
import os
import re
import tempfile
import uuid
from typing import List, Optional

from emergentintegrations.llm.chat import LlmChat, UserMessage
from emergentintegrations.llm.openai import OpenAITextToSpeech, OpenAISpeechToText
from fastapi import APIRouter, File, HTTPException, UploadFile, Form, Header
from pydantic import BaseModel, Field
from pypdf import PdfReader

import usage_tracker as ut

EMERGENT_LLM_KEY = os.environ["EMERGENT_LLM_KEY"]

router = APIRouter(prefix="/ai")

_tts = OpenAITextToSpeech(api_key=EMERGENT_LLM_KEY)
_stt = OpenAISpeechToText(api_key=EMERGENT_LLM_KEY)


# ---------------------- budget kill switch ----------------------

async def _guard(endpoint: str, uid: Optional[str] = None, is_premium: bool = False) -> None:
    """Two-layer kill switch:
    1. Global budget/maintenance (affects everyone).
    2. Per-user free-tier daily quota (premium users bypass).
    Raises 503 for global outages, 429 for personal quota exceeded.
    """
    reason = await ut.check_budget(endpoint)
    if reason:
        raise HTTPException(
            status_code=503,
            detail={"code": "service_disabled", "reason": reason},
        )
    user_reason = await ut.check_user_quota(uid, is_premium)
    if user_reason:
        raise HTTPException(
            status_code=429,
            detail={"code": "user_quota_exceeded", "reason": user_reason, "upgrade": True},
        )


async def _record(endpoint: str, uid: Optional[str] = None) -> None:
    """Records both the global endpoint usage and the per-user counter."""
    try:
        await ut.record_call(endpoint)
        await ut.record_user_call(uid)
    except Exception:
        # Never let usage tracking failure break a user-facing call.
        pass


def _is_premium_hdr(val: Optional[str]) -> bool:
    return (val or "").strip().lower() in {"1", "true", "yes"}


# ---------------------- helpers ----------------------

def _new_chat(session_id: str, system_message: str, provider: str, model: str) -> LlmChat:
    return LlmChat(
        api_key=EMERGENT_LLM_KEY,
        session_id=session_id,
        system_message=system_message,
    ).with_model(provider, model)


# Hybrid model routing: premium users get the most capable model,
# free users get a faster/cheaper one, with automatic fallback on failure.
PRIMARY_CHAIN = [
    ("openai", "gpt-5.2"),
    ("anthropic", "claude-sonnet-4-5-20250929"),
    ("gemini", "gemini-3-flash-preview"),
]

FREE_CHAIN = [
    ("gemini", "gemini-3-flash-preview"),
    ("anthropic", "claude-sonnet-4-5-20250929"),
    ("openai", "gpt-5.2"),
]


async def _send_with_fallback(
    session_id: str,
    system_message: str,
    user_msg: UserMessage,
    is_premium: bool = True,
) -> str:
    """Send message trying each model in the chain; falls back on errors."""
    chain = PRIMARY_CHAIN if is_premium else FREE_CHAIN
    last_err: Exception | None = None
    for provider, model in chain:
        try:
            chat = _new_chat(session_id, system_message, provider, model)
            return await chat.send_message(user_msg)
        except Exception as exc:  # noqa: BLE001
            last_err = exc
            continue
    raise RuntimeError(f"All AI providers failed: {last_err}")


def _extract_json(text: str) -> dict:
    """Strip code fences and parse first JSON object from model output."""
    cleaned = text.strip()
    cleaned = re.sub(r"^```(?:json)?", "", cleaned, flags=re.IGNORECASE).strip()
    cleaned = re.sub(r"```$", "", cleaned).strip()
    # Find first { ... } block if extra prose is present
    match = re.search(r"\{[\s\S]*\}", cleaned)
    if match:
        cleaned = match.group(0)
    try:
        return json.loads(cleaned)
    except json.JSONDecodeError as exc:
        raise HTTPException(status_code=502, detail=f"AI returned invalid JSON: {exc}") from exc


# ==================== AI TUTOR (GPT-5.2) ====================

TUTOR_SYSTEM = (
    "You are SpeakMate, a world-class English coach for Indian learners (Hindi/Hinglish/English). "
    "You have ONE job per turn: directly answer what the user wants AND help them improve.\n\n"
    "ABSOLUTE RULES — NEVER VIOLATE:\n"
    "1. NEVER use empty filler phrases like: 'Great question', 'Nice try', 'Excellent', "
    "'I understand what you mean', 'That's a great point', 'Your English is improving'. "
    "These add zero value and make you sound robotic.\n"
    "2. NEVER ignore the user's actual request. If they ask 'what does X mean?' — give the meaning. "
    "If they ask for translation — translate. If they ask for an interview question — ask one.\n"
    "3. NEVER repeat the same opening across messages. Vary openers naturally.\n"
    "4. ALWAYS do ONE of these four things in `reply`: (a) TEACH a new concept, "
    "(b) CORRECT a specific mistake, (c) EXPLAIN why something is right/wrong, (d) CHALLENGE with a follow-up question.\n\n"
    "OUTPUT FORMAT — ONLY return a single JSON object (no prose, no fences):\n"
    "{\n"
    '  "reply": "1-3 sentence response that DIRECTLY addresses the user AND teaches/challenges",\n'
    '  "correction": "if user had a grammar/spelling mistake: original → corrected version with brief why. Else null",\n'
    '  "suggestion": "a more natural/native phrasing of what they tried to say. Else null",\n'
    '  "vocab": {"word": "...", "meaning": "...", "hindi": "..."} or null,\n'
    '  "followup": "a short follow-up question to keep the conversation alive (5-12 words)" or null\n'
    "}\n"
    "Always include `followup` unless the user explicitly says goodbye."
)

# Specialized "single-task" agents — used when user picks a quick action from the tutor screen.
# Each prompt enforces a tight scope so the AI never wanders or gives generic responses.
AGENT_PROMPTS = {
    "fix_grammar": (
        "You are a strict English grammar editor. The user will send a sentence (in English, Hindi or Hinglish). "
        "Fix ALL grammar, spelling, capitalization and punctuation errors. "
        "Return ONLY this JSON: "
        '{"reply": "Here is the corrected version.", "correction": "Original → Corrected. Brief reason.", '
        '"suggestion": "More natural alternative" or null, "vocab": null, "followup": "Want me to explain any rule?"}'
    ),
    "improve_sentence": (
        "You are a native English writer. The user gives a sentence that is grammatically OK but sounds basic. "
        "Rewrite it in 2 more natural/advanced ways: a casual version and a formal version. "
        "Return ONLY this JSON: "
        '{"reply": "Casual: <text>\\nFormal: <text>", "correction": null, "suggestion": "The most idiomatic version", '
        '"vocab": {"word": "<a useful word from your rewrite>", "meaning": "<meaning>", "hindi": "<Hindi>"} or null, '
        '"followup": "Want to try a different tone?"}'
    ),
    "translate": (
        "You are a precise English↔Hindi translator for Indian English learners. "
        "Auto-detect the input language. If it is Hindi/Hinglish, translate to natural English. "
        "If it is English, translate to natural Hindi (in Devanagari + Hinglish in brackets). "
        "Return ONLY this JSON: "
        '{"reply": "Translation: <text>", "correction": null, "suggestion": "More natural way to say it", '
        '"vocab": {"word": "<key word>", "meaning": "<meaning>", "hindi": "<Hindi>"} or null, '
        '"followup": "Want another example with this phrase?"}'
    ),
    "explain_meaning": (
        "You are an English dictionary teacher for Indian learners. The user sends a word or phrase. "
        "Explain its meaning clearly: part of speech, definition, Hindi meaning, 2 example sentences, "
        "synonyms and antonyms. "
        "Return ONLY this JSON: "
        '{"reply": "<part of speech>: <definition>. Hindi: <hindi>. Examples: 1) ... 2) ... Synonyms: a, b. Antonyms: x, y.", '
        '"correction": null, "suggestion": null, '
        '"vocab": {"word": "<the word>", "meaning": "<definition>", "hindi": "<hindi>"}, '
        '"followup": "Want a quick quiz on this word?"}'
    ),
    "interview_practice": (
        "You are a senior interviewer running a mock interview. Ask ONE clear, role-appropriate interview question "
        "(HR/tech/behavioural/sales). If the user has already answered, give a 0-100 score in `correction` plus "
        "tips, then ask the next question. "
        "Return ONLY this JSON: "
        '{"reply": "<interview question OR feedback + next question>", '
        '"correction": "<if scoring last answer: \\"Score X/100. Tip: ...\\"> or null", '
        '"suggestion": "<a model answer in 2 sentences> or null", "vocab": null, '
        '"followup": "Ready for the next question?"}'
    ),
    "daily_conversation": (
        "You are a friendly English-speaking partner helping an Indian learner practise daily conversation. "
        "Start a natural casual chat or continue it. Use simple, everyday English. Keep it short and warm. "
        "Return ONLY this JSON: "
        '{"reply": "<1-2 friendly sentences>", "correction": "<if user made an error: brief fix> or null", '
        '"suggestion": "<a more natural way> or null", "vocab": null, '
        '"followup": "<a casual question to keep the chat going>"}'
    ),
}


class TutorChatHistoryItem(BaseModel):
    role: str  # "user" | "assistant"
    text: str


class TutorChatRequest(BaseModel):
    message: str
    session_id: Optional[str] = None
    companion_id: Optional[str] = None
    system_prompt: Optional[str] = None
    agent: Optional[str] = None  # "fix_grammar" | "improve_sentence" | "translate" | "explain_meaning" | "interview_practice" | "daily_conversation"
    history: List[TutorChatHistoryItem] = Field(default_factory=list)


class TutorVocab(BaseModel):
    word: str
    meaning: str
    hindi: Optional[str] = None


class TutorChatResponse(BaseModel):
    id: str
    session_id: str
    reply: str
    correction: Optional[str] = None
    suggestion: Optional[str] = None
    vocab: Optional[TutorVocab] = None
    followup: Optional[str] = None


@router.post("/tutor/chat", response_model=TutorChatResponse)
async def tutor_chat(
    req: TutorChatRequest,
    x_user_id: Optional[str] = Header(default=None),
    x_is_premium: Optional[str] = Header(default=None),
) -> TutorChatResponse:
    is_premium = _is_premium_hdr(x_is_premium)
    await _guard("tutor_chat", uid=x_user_id, is_premium=is_premium)
    session_id = req.session_id or str(uuid.uuid4())
    # Priority: explicit system_prompt > specialized agent > default tutor
    if req.system_prompt:
        system_msg = req.system_prompt.strip()
    elif req.agent and req.agent in AGENT_PROMPTS:
        system_msg = AGENT_PROMPTS[req.agent]
    else:
        system_msg = TUTOR_SYSTEM

    # Inject conversation memory (last 6 turns) so the AI never forgets context.
    history_block = ""
    if req.history:
        recent = req.history[-6:]
        lines = [f"{('User' if h.role == 'user' else 'Tutor')}: {h.text}" for h in recent]
        history_block = "Recent conversation (for context, do NOT repeat):\n" + "\n".join(lines) + "\n\n"
    user_text = f"{history_block}User's new message: {req.message}"

    raw = await _send_with_fallback(
        session_id=session_id,
        system_message=system_msg,
        user_msg=UserMessage(text=user_text),
        is_premium=True,
    )
    await _record("tutor_chat", uid=x_user_id)
    data = _extract_json(raw)
    vocab_raw = data.get("vocab")
    vocab_model: Optional[TutorVocab] = None
    if isinstance(vocab_raw, dict) and vocab_raw.get("word"):
        vocab_model = TutorVocab(
            word=str(vocab_raw.get("word", "")),
            meaning=str(vocab_raw.get("meaning", "")),
            hindi=str(vocab_raw.get("hindi") or "") or None,
        )
    return TutorChatResponse(
        id=str(uuid.uuid4()),
        session_id=session_id,
        reply=data.get("reply", "").strip() or "Let's continue — tell me what you want to practise.",
        correction=(data.get("correction") or None),
        suggestion=(data.get("suggestion") or None),
        vocab=vocab_model,
        followup=(str(data.get("followup") or "").strip() or None),
    )


# ==================== SPEAKING SCORE (Claude Sonnet 4.6) ====================

SPEAKING_SYSTEM = (
    "You are an expert English speaking + communication coach evaluating a learner's spoken response. "
    "Given a transcript and duration, score the speech on FIVE axes and give actionable, specific feedback. "
    "Be honest — vary scores realistically. Penalise short or off-topic answers. "
    "Return ONLY a JSON object — no prose, no code fences — in this exact shape: "
    '{"overall": int(0-100), "pronunciation": int(0-100), "fluency": int(0-100), '
    '"grammar": int(0-100), "vocabulary": int(0-100), "confidence": int(0-100), '
    '"mistakes": ["specific mistake 1", "specific mistake 2"], '
    '"corrected": "the user transcript rewritten with all errors fixed", '
    '"suggested": "a native-speaker-quality answer (2-3 sentences) to the same prompt", '
    '"strengths": ["specific strength 1", "specific strength 2"], '
    '"weaknesses": ["specific weakness 1", "specific weakness 2"], '
    '"next_goal": "one focused practice target for tomorrow", '
    '"action_plan": ["step 1", "step 2", "step 3"], '
    '"feedback": "1-2 sentence coaching summary"}'
)


class SpeakingScoreRequest(BaseModel):
    transcript: str
    duration_sec: float = Field(ge=0)
    prompt: Optional[str] = None  # the question the user was answering


class SpeakingScoreResponse(BaseModel):
    overall: int
    pronunciation: int
    fluency: int
    grammar: int
    vocabulary: int
    confidence: int = 0
    mistakes: List[str] = Field(default_factory=list)
    corrected: str = ""
    suggested: str = ""
    strengths: List[str] = Field(default_factory=list)
    weaknesses: List[str] = Field(default_factory=list)
    next_goal: str = ""
    action_plan: List[str] = Field(default_factory=list)
    feedback: str


@router.post("/speaking/score", response_model=SpeakingScoreResponse)
async def speaking_score(
    req: SpeakingScoreRequest,
    x_user_id: Optional[str] = Header(default=None),
    x_is_premium: Optional[str] = Header(default=None),
) -> SpeakingScoreResponse:
    is_premium = _is_premium_hdr(x_is_premium)
    await _guard("speaking_score", uid=x_user_id, is_premium=is_premium)
    chat = _new_chat(str(uuid.uuid4()), SPEAKING_SYSTEM, "anthropic", "claude-sonnet-4-6")
    prompt = (
        f"Prompt the user was answering: \"{req.prompt or 'general speaking practice'}\"\n"
        f"Transcript: \"{req.transcript}\"\n"
        f"Duration: {req.duration_sec:.1f} seconds\n"
        f"Word count: {len(req.transcript.split())}\n"
        "Now return the JSON evaluation."
    )
    raw = await chat.send_message(UserMessage(text=prompt))
    await _record("speaking_score", uid=x_user_id)
    data = _extract_json(raw)
    mistakes_raw = data.get("mistakes") or []
    if not isinstance(mistakes_raw, list):
        mistakes_raw = []
    strengths_raw = data.get("strengths") or []
    weaknesses_raw = data.get("weaknesses") or []
    action_raw = data.get("action_plan") or []
    return SpeakingScoreResponse(
        overall=int(data.get("overall", 0)),
        pronunciation=int(data.get("pronunciation", 0)),
        fluency=int(data.get("fluency", 0)),
        grammar=int(data.get("grammar", 0)),
        vocabulary=int(data.get("vocabulary", 0)),
        confidence=int(data.get("confidence", 0)),
        mistakes=[str(m) for m in mistakes_raw][:5],
        corrected=str(data.get("corrected", "")),
        suggested=str(data.get("suggested", "")),
        strengths=[str(s) for s in strengths_raw][:4] if isinstance(strengths_raw, list) else [],
        weaknesses=[str(w) for w in weaknesses_raw][:4] if isinstance(weaknesses_raw, list) else [],
        next_goal=str(data.get("next_goal", "")),
        action_plan=[str(a) for a in action_raw][:5] if isinstance(action_raw, list) else [],
        feedback=str(data.get("feedback", "Keep practising!")),
    )


# ==================== TMAY TRAINER (Tell Me About Yourself — Claude Sonnet 4.6) ====================

TMAY_SYSTEM = (
    "You are an elite communication & interview coach grading a candidate's "
    "\"Tell Me About Yourself\" (TMAY) self-introduction. The candidate is an Indian "
    "job-seeker/student. Evaluate using the **PPF framework** (Past → Present → Future) "
    "and the STAR principle where applicable. Score honestly — vary scores realistically; "
    "penalise vague intros, missing structure, no hook, and weak closing. "
    "Return ONLY a JSON object — no prose, no code fences — in this exact shape: "
    '{"overall": int(0-100), "structure": int(0-100), "clarity": int(0-100), '
    '"confidence": int(0-100), "relevance": int(0-100), "impact": int(0-100), '
    '"has_hook": bool, "has_past": bool, "has_present": bool, "has_future": bool, '
    '"filler_words": ["um", "uh", "like"], '
    '"strengths": ["specific strength 1", "specific strength 2"], '
    '"weaknesses": ["specific weakness 1", "specific weakness 2"], '
    '"missing_elements": ["e.g. no clear career goal", "no signature achievement"], '
    '"polished_version": "a 60-second rewritten TMAY in natural, confident English (3-5 sentences, PPF structure)", '
    '"next_goal": "one focused practice target for the next attempt", '
    '"feedback": "2-3 sentence coaching summary"}'
)


class TmayEvaluateRequest(BaseModel):
    transcript: str = Field(min_length=3)
    duration_sec: float = Field(default=0, ge=0)
    role_target: Optional[str] = None    # e.g. "software engineer fresher", "sales executive"
    experience_level: Optional[str] = "fresher"  # "fresher" | "experienced"


class TmayEvaluateResponse(BaseModel):
    overall: int
    structure: int
    clarity: int
    confidence: int
    relevance: int
    impact: int
    has_hook: bool = False
    has_past: bool = False
    has_present: bool = False
    has_future: bool = False
    filler_words: List[str] = Field(default_factory=list)
    strengths: List[str] = Field(default_factory=list)
    weaknesses: List[str] = Field(default_factory=list)
    missing_elements: List[str] = Field(default_factory=list)
    polished_version: str = ""
    next_goal: str = ""
    feedback: str = ""


@router.post("/tmay/evaluate", response_model=TmayEvaluateResponse)
async def tmay_evaluate(
    req: TmayEvaluateRequest,
    x_user_id: Optional[str] = Header(default=None),
    x_is_premium: Optional[str] = Header(default=None),
) -> TmayEvaluateResponse:
    is_premium = _is_premium_hdr(x_is_premium)
    await _guard("tmay_evaluate", uid=x_user_id, is_premium=is_premium)
    chat = _new_chat(str(uuid.uuid4()), TMAY_SYSTEM, "anthropic", "claude-sonnet-4-6")
    prompt = (
        f"Target role: {req.role_target or 'general entry-level role in India'}\n"
        f"Experience level: {req.experience_level or 'fresher'}\n"
        f"Duration: {req.duration_sec:.1f} seconds · "
        f"Word count: {len(req.transcript.split())}\n"
        f"Candidate's TMAY transcript:\n\"\"\"\n{req.transcript}\n\"\"\"\n\n"
        "Now return the JSON evaluation."
    )
    raw = await chat.send_message(UserMessage(text=prompt))
    await _record("tmay_evaluate", uid=x_user_id)
    data = _extract_json(raw)

    def _list(key: str, limit: int = 5) -> List[str]:
        v = data.get(key) or []
        if not isinstance(v, list):
            return []
        return [str(x) for x in v][:limit]

    return TmayEvaluateResponse(
        overall=int(data.get("overall", 0)),
        structure=int(data.get("structure", 0)),
        clarity=int(data.get("clarity", 0)),
        confidence=int(data.get("confidence", 0)),
        relevance=int(data.get("relevance", 0)),
        impact=int(data.get("impact", 0)),
        has_hook=bool(data.get("has_hook", False)),
        has_past=bool(data.get("has_past", False)),
        has_present=bool(data.get("has_present", False)),
        has_future=bool(data.get("has_future", False)),
        filler_words=_list("filler_words", 8),
        strengths=_list("strengths", 4),
        weaknesses=_list("weaknesses", 4),
        missing_elements=_list("missing_elements", 4),
        polished_version=str(data.get("polished_version", "")),
        next_goal=str(data.get("next_goal", "")),
        feedback=str(data.get("feedback", "Keep practising — structure your intro as Past → Present → Future.")),
    )


# ==================== 30-DAY JOB-READY ROADMAP (GPT-5.2) ====================

ROADMAP_SYSTEM = (
    "You are a senior career coach designing a **30-day job-readiness roadmap** for an "
    "Indian English learner. The plan must blend: communication skills, interview prep, "
    "vocabulary, confidence-building, TMAY, mock interviews, soft skills, resume/LinkedIn polish. "
    "Each day must have ONE focus theme + 3 short actionable tasks (≤15 min total) + a daily quote/tip. "
    "Vary themes day-to-day (no two consecutive days same focus). Days 1-10 = fundamentals, "
    "11-20 = applied practice, 21-30 = mock & polish. "
    "Return ONLY a JSON object — no prose, no code fences — in this exact shape: "
    '{"summary": "2-3 sentence overview of the plan", '
    '"goal_title": "personalised goal headline", '
    '"days": [ '
    '  {"day": 1, "title": "Day title", "focus": "speaking|vocabulary|tmay|interview|resume|grammar|confidence|listening", '
    '   "tasks": ["task1 (5 min)", "task2 (5 min)", "task3 (5 min)"], '
    '   "tip": "motivational tip or quote"}, '
    '  ... 30 entries total ... '
    ']}'
)


class RoadmapGenerateRequest(BaseModel):
    user_name: Optional[str] = None
    role_target: Optional[str] = None          # e.g. "software engineer fresher"
    current_level: Optional[str] = "beginner"  # "beginner" | "intermediate" | "advanced"
    weak_areas: List[str] = Field(default_factory=list)  # ["grammar", "confidence", ...]
    daily_minutes: int = Field(default=15, ge=5, le=120)


class RoadmapDay(BaseModel):
    day: int
    title: str
    focus: str
    tasks: List[str]
    tip: str = ""


class RoadmapGenerateResponse(BaseModel):
    summary: str
    goal_title: str
    days: List[RoadmapDay]


@router.post("/roadmap/generate", response_model=RoadmapGenerateResponse)
async def roadmap_generate(
    req: RoadmapGenerateRequest,
    x_user_id: Optional[str] = Header(default=None),
    x_is_premium: Optional[str] = Header(default=None),
) -> RoadmapGenerateResponse:
    is_premium = _is_premium_hdr(x_is_premium)
    await _guard("roadmap_generate", uid=x_user_id, is_premium=is_premium)
    chat = _new_chat(str(uuid.uuid4()), ROADMAP_SYSTEM, "openai", "gpt-5.2")
    weak_str = ", ".join(req.weak_areas) if req.weak_areas else "none specified"
    prompt = (
        f"Learner name: {req.user_name or 'Learner'}\n"
        f"Target role: {req.role_target or 'general fresher job in India'}\n"
        f"Current level: {req.current_level or 'beginner'}\n"
        f"Daily commitment: {req.daily_minutes} minutes\n"
        f"Self-reported weak areas: {weak_str}\n\n"
        "Generate a personalised 30-day roadmap. Return JSON with exactly 30 day entries."
    )
    raw = await chat.send_message(UserMessage(text=prompt))
    await _record("roadmap_generate", uid=x_user_id)
    data = _extract_json(raw)
    raw_days = data.get("days") or []
    days: List[RoadmapDay] = []
    for i, d in enumerate(raw_days[:30]):
        if not isinstance(d, dict):
            continue
        tasks_raw = d.get("tasks") or []
        if not isinstance(tasks_raw, list):
            tasks_raw = []
        days.append(RoadmapDay(
            day=int(d.get("day", i + 1)),
            title=str(d.get("title", f"Day {i + 1}"))[:80],
            focus=str(d.get("focus", "speaking")).lower(),
            tasks=[str(t) for t in tasks_raw][:5],
            tip=str(d.get("tip", "")),
        ))
    # Backfill if AI returned fewer than 30 days
    while len(days) < 30:
        idx = len(days) + 1
        days.append(RoadmapDay(
            day=idx,
            title=f"Day {idx}: Keep building momentum",
            focus="speaking",
            tasks=["Practise speaking for 5 minutes", "Learn 3 new words", "Reflect on today's win"],
            tip="Small wins compound — show up daily.",
        ))
    return RoadmapGenerateResponse(
        summary=str(data.get("summary", "Your 30-day job-ready roadmap.")),
        goal_title=str(data.get("goal_title", "30-Day Job Ready Plan")),
        days=days,
    )


# ==================== INTERVIEW (GPT-5.2) ====================

INTERVIEW_EVAL_SYSTEM = (
    "You are a senior interviewer evaluating an interview answer. "
    "Score on a 0-100 scale considering structure (STAR), clarity, content depth, and English fluency. "
    "Return ONLY a JSON object — no prose, no code fences — in this shape: "
    '{"score": int(0-100), "feedback": "1-2 sentence actionable feedback"}'
)


class InterviewEvalRequest(BaseModel):
    question: str
    answer: str
    track: Optional[str] = None  # "hr" | "tech" | "fresher"


class InterviewEvalResponse(BaseModel):
    score: int
    feedback: str


@router.post("/interview/evaluate", response_model=InterviewEvalResponse)
async def interview_evaluate(req: InterviewEvalRequest) -> InterviewEvalResponse:
    chat = _new_chat(str(uuid.uuid4()), INTERVIEW_EVAL_SYSTEM, "openai", "gpt-5.2")
    prompt = (
        f"Track: {req.track or 'general'}\n"
        f"Question: {req.question}\n"
        f"Candidate's Answer: {req.answer}\n"
        "Return the JSON evaluation now."
    )
    raw = await chat.send_message(UserMessage(text=prompt))
    data = _extract_json(raw)
    return InterviewEvalResponse(
        score=int(data.get("score", 0)),
        feedback=str(data.get("feedback", "Try to add more detail.")),
    )


INTERVIEW_FOLLOWUP_SYSTEM = (
    "You are an interviewer asking a single thoughtful follow-up question based on the candidate's "
    "previous answer. Keep it under 25 words. Return ONLY the question text, no quotes, no JSON."
)


class InterviewFollowUpRequest(BaseModel):
    previous_answer: str
    track: Optional[str] = None


class InterviewFollowUpResponse(BaseModel):
    question: str


@router.post("/interview/followup", response_model=InterviewFollowUpResponse)
async def interview_followup(req: InterviewFollowUpRequest) -> InterviewFollowUpResponse:
    chat = _new_chat(str(uuid.uuid4()), INTERVIEW_FOLLOWUP_SYSTEM, "openai", "gpt-5.2")
    prompt = f"Track: {req.track or 'general'}\nCandidate said: \"{req.previous_answer}\"\nAsk your follow-up."
    raw = await chat.send_message(UserMessage(text=prompt))
    question = raw.strip().strip('"').strip()
    return InterviewFollowUpResponse(question=question or "Tell me more about that.")


INTERVIEW_SESSION_SYSTEM = (
    "You are evaluating a full mock interview session. Given all Q&A pairs, produce a complete report. "
    "Return ONLY a JSON object — no prose, no code fences — in this shape: "
    '{"overallScore": int, "communicationScore": int, "confidenceScore": int, "contentScore": int, '
    '"strengths": [string, ...], "suggestions": [string, ...]}'
)


class InterviewAnswerItem(BaseModel):
    question: str
    answer: str
    score: int


class InterviewSessionRequest(BaseModel):
    track: str
    answers: List[InterviewAnswerItem]


class InterviewSessionResponse(BaseModel):
    overallScore: int
    communicationScore: int
    confidenceScore: int
    contentScore: int
    strengths: List[str]
    suggestions: List[str]


@router.post("/interview/score-session", response_model=InterviewSessionResponse)
async def interview_score_session(req: InterviewSessionRequest) -> InterviewSessionResponse:
    chat = _new_chat(str(uuid.uuid4()), INTERVIEW_SESSION_SYSTEM, "openai", "gpt-5.2")
    qa_text = "\n\n".join(
        f"Q{i+1}: {a.question}\nA{i+1}: {a.answer}\n(Score so far: {a.score})"
        for i, a in enumerate(req.answers)
    )
    prompt = f"Track: {req.track}\n\n{qa_text}\n\nNow produce the JSON report (max 4 strengths, max 4 suggestions)."
    raw = await chat.send_message(UserMessage(text=prompt))
    data = _extract_json(raw)
    return InterviewSessionResponse(
        overallScore=int(data.get("overallScore", 0)),
        communicationScore=int(data.get("communicationScore", 0)),
        confidenceScore=int(data.get("confidenceScore", 0)),
        contentScore=int(data.get("contentScore", 0)),
        strengths=[str(s) for s in (data.get("strengths") or [])][:4] or ["You completed the session — great start!"],
        suggestions=[str(s) for s in (data.get("suggestions") or [])][:4] or ["Practice using the STAR framework."],
    )


# ==================== VOCABULARY (Gemini 3 Flash) ====================

VOCAB_SYSTEM = (
    "You are an English-Hindi vocabulary helper for Indian learners. "
    "Given an English word, provide: part of speech, simple English definition, "
    "Hindi meaning (in Devanagari), and one short example sentence. "
    "Return ONLY a JSON object — no prose, no code fences — in this shape: "
    '{"word": "...", "partOfSpeech": "noun|verb|adjective|adverb|...", '
    '"definition": "...", "hindi": "...", "example": "..."}'
)


class VocabRequest(BaseModel):
    word: str


class VocabResponse(BaseModel):
    word: str
    partOfSpeech: str
    definition: str
    hindi: str
    example: str


@router.post("/vocabulary/lookup", response_model=VocabResponse)
async def vocabulary_lookup(req: VocabRequest) -> VocabResponse:
    chat = _new_chat(str(uuid.uuid4()), VOCAB_SYSTEM, "gemini", "gemini-3-flash-preview")
    raw = await chat.send_message(UserMessage(text=f"Word: {req.word}"))
    data = _extract_json(raw)
    return VocabResponse(
        word=str(data.get("word", req.word)),
        partOfSpeech=str(data.get("partOfSpeech", "")),
        definition=str(data.get("definition", "")),
        hindi=str(data.get("hindi", "")),
        example=str(data.get("example", "")),
    )


# ==================== DAILY CHALLENGE (Claude Sonnet 4.6) ====================

CHALLENGE_SYSTEM = (
    "You are an English writing coach. The learner has responded to a daily writing prompt. "
    "Evaluate their response on creativity, grammar, vocabulary, and clarity. "
    "Return ONLY a JSON object — no prose, no code fences — in this shape: "
    '{"score": int(0-100), "feedback": "2-3 sentence encouraging coaching note", '
    '"betterVersion": "improved 1-2 sentence rewrite of their response"}'
)


class ChallengeRequest(BaseModel):
    prompt: str
    response: str


class ChallengeResponse(BaseModel):
    score: int
    feedback: str
    betterVersion: str


@router.post("/daily-challenge/evaluate", response_model=ChallengeResponse)
async def daily_challenge_evaluate(req: ChallengeRequest) -> ChallengeResponse:
    chat = _new_chat(str(uuid.uuid4()), CHALLENGE_SYSTEM, "anthropic", "claude-sonnet-4-6")
    prompt = f"Prompt: {req.prompt}\nLearner's response: {req.response}\nReturn JSON now."
    raw = await chat.send_message(UserMessage(text=prompt))
    data = _extract_json(raw)
    return ChallengeResponse(
        score=int(data.get("score", 0)),
        feedback=str(data.get("feedback", "Good attempt!")),
        betterVersion=str(data.get("betterVersion", req.response)),
    )


# ==================== TEXT-TO-SPEECH (OpenAI tts-1) ====================

# Map our companion ids/preferences to OpenAI voices.
COMPANION_VOICE = {
    "alex": "echo",       # calm friendly male
    "emma": "shimmer",    # cheerful female
    "sophia": "nova",     # energetic female (interview coach)
    "ryan": "onyx",       # deep male (business)
    "maya": "coral",      # warm female (motivator)
}


class TTSRequest(BaseModel):
    text: str = Field(min_length=1, max_length=4000)
    companion_id: Optional[str] = None
    voice: Optional[str] = None          # explicit override (alloy/echo/nova/shimmer/onyx/coral/ash/fable/sage)
    speed: float = Field(default=1.0, ge=0.5, le=2.0)
    model: str = "tts-1"


class TTSResponse(BaseModel):
    audio_base64: str
    mime: str = "audio/mpeg"


@router.post("/tts", response_model=TTSResponse)
async def tts(req: TTSRequest) -> TTSResponse:
    voice = req.voice or COMPANION_VOICE.get(req.companion_id or "", "alloy")
    try:
        audio_b64 = await _tts.generate_speech_base64(
            text=req.text,
            model=req.model,
            voice=voice,
            speed=req.speed,
        )
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=502, detail=f"TTS failed: {exc}") from exc
    return TTSResponse(audio_base64=audio_b64)


# ==================== SPEECH-TO-TEXT (Whisper) ====================

class STTResponse(BaseModel):
    text: str
    duration_sec: Optional[float] = None


@router.post("/stt", response_model=STTResponse)
async def stt(file: UploadFile = File(...), language: str = Form("en")) -> STTResponse:
    if not file.filename:
        raise HTTPException(status_code=400, detail="No file uploaded")
    suffix = os.path.splitext(file.filename)[1].lower() or ".m4a"
    if suffix not in {".mp3", ".mp4", ".mpeg", ".mpga", ".m4a", ".wav", ".webm"}:
        suffix = ".m4a"
    contents = await file.read()
    if len(contents) > 25 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="Audio exceeds 25 MB limit")
    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
        tmp.write(contents)
        tmp_path = tmp.name
    try:
        with open(tmp_path, "rb") as audio_file:
            response = await _stt.transcribe(
                file=audio_file,
                model="whisper-1",
                response_format="verbose_json",
                language=language or "en",
            )
        return STTResponse(
            text=str(getattr(response, "text", "")).strip(),
            duration_sec=getattr(response, "duration", None),
        )
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=502, detail=f"STT failed: {exc}") from exc
    finally:
        try:
            os.unlink(tmp_path)
        except OSError:
            pass


# ==================== LIVE INTERVIEW (GPT-5.2) ====================

LIVE_INTERVIEW_SYSTEM = (
    "You are an expert {track} interviewer evaluating a candidate in real time. "
    "Your job is twofold: (1) score the candidate's last answer on a 0-100 scale across 6 axes, "
    "(2) ask the NEXT thoughtful interview question (or follow-up). "
    "Always respond with ONLY a JSON object — no prose, no code fences — in this exact shape: "
    '{"scores": {"communication": int, "fluency": int, "confidence": int, "grammar": int, "relevance": int, "professionalism": int}, '
    '"feedback": "1-2 sentence actionable feedback on the last answer", '
    '"filler_words": [string list of detected filler words like um/uh/like], '
    '"weak_points": [list of 1-3 short bullets pointing what was weak], '
    '"better_version": "a 1-2 sentence improved version of their answer", '
    '"next_question": "the next interview question", '
    '"should_end": boolean}'
)


class LiveAnswerItem(BaseModel):
    question: str
    answer: str


class LiveInterviewRequest(BaseModel):
    track: str
    history: List[LiveAnswerItem] = Field(default_factory=list)
    last_answer: Optional[str] = None   # if None and history empty → just get first question
    last_question: Optional[str] = None
    target_questions: int = Field(default=5, ge=1, le=15)
    difficulty: Optional[str] = "intermediate"  # "beginner" | "intermediate" | "advanced"


class LiveScores(BaseModel):
    communication: int
    fluency: int
    confidence: int
    grammar: int
    relevance: int
    professionalism: int


class LiveInterviewResponse(BaseModel):
    scores: Optional[LiveScores] = None
    feedback: Optional[str] = None
    filler_words: List[str] = Field(default_factory=list)
    weak_points: List[str] = Field(default_factory=list)
    better_version: Optional[str] = None
    next_question: str
    should_end: bool = False
    question_number: int


@router.post("/interview/live", response_model=LiveInterviewResponse)
async def interview_live(
    req: LiveInterviewRequest,
    x_user_id: Optional[str] = Header(default=None),
    x_is_premium: Optional[str] = Header(default=None),
) -> LiveInterviewResponse:
    is_premium = _is_premium_hdr(x_is_premium)
    await _guard("interview_live", uid=x_user_id, is_premium=is_premium)
    sys_msg = LIVE_INTERVIEW_SYSTEM.replace("{track}", req.track.replace("_", " "))
    # Inject difficulty cue so the AI tunes question depth + grading strictness.
    difficulty_note = {
        "beginner": "Difficulty: BEGINNER. Ask simple, common questions. Be generous with scores (typically 60-80). Give encouraging feedback.",
        "intermediate": "Difficulty: INTERMEDIATE. Ask realistic interview questions. Score honestly (typically 50-85).",
        "advanced": "Difficulty: ADVANCED. Ask tough, probing questions including unexpected follow-ups. Be strict with scores (typically 40-80). Demand specificity.",
    }.get((req.difficulty or "intermediate").lower(), "")
    sys_msg = f"{sys_msg}\n\n{difficulty_note}"
    chat = _new_chat(str(uuid.uuid4()), sys_msg, "openai", "gpt-5.2")

    # Build prompt with full conversation context
    qa_log = "\n".join(
        f"Q{i+1}: {h.question}\nA{i+1}: {h.answer}" for i, h in enumerate(req.history)
    )
    asked_count = len(req.history) + (1 if req.last_answer else 0)
    should_end_hint = "true" if asked_count >= req.target_questions else "false"

    if req.last_answer and req.last_question:
        prompt = (
            f"Conversation so far:\n{qa_log}\n\n"
            f"Last question I asked: {req.last_question}\n"
            f"Candidate's last answer: {req.last_answer}\n\n"
            f"Target questions: {req.target_questions} · Asked so far: {asked_count}\n"
            f"If asked_count >= target_questions then should_end=true and next_question can be a closing remark. "
            f"Otherwise should_end={should_end_hint} and ask the next question.\n"
            "Return the full JSON now."
        )
    else:
        prompt = (
            f"Start the interview. Ask the very first question. Set scores to null-equivalent (all zeros) "
            f"and feedback to a brief warm welcome. Target questions: {req.target_questions}. "
            "Return JSON now."
        )

    raw = await chat.send_message(UserMessage(text=prompt))
    await _record("interview_live", uid=x_user_id)
    data = _extract_json(raw)
    raw_scores = data.get("scores") or {}
    scores_model: Optional[LiveScores] = None
    if req.last_answer:
        scores_model = LiveScores(
            communication=int(raw_scores.get("communication", 0)),
            fluency=int(raw_scores.get("fluency", 0)),
            confidence=int(raw_scores.get("confidence", 0)),
            grammar=int(raw_scores.get("grammar", 0)),
            relevance=int(raw_scores.get("relevance", 0)),
            professionalism=int(raw_scores.get("professionalism", 0)),
        )
    return LiveInterviewResponse(
        scores=scores_model,
        feedback=str(data.get("feedback") or "").strip() or None,
        filler_words=[str(w) for w in (data.get("filler_words") or [])][:6],
        weak_points=[str(w) for w in (data.get("weak_points") or [])][:3],
        better_version=str(data.get("better_version") or "").strip() or None,
        next_question=str(data.get("next_question") or "Tell me about yourself.").strip(),
        should_end=bool(data.get("should_end", False)) or asked_count >= req.target_questions,
        question_number=asked_count + 1,
    )


# ==================== SALES / COUNSELLING TRAINER (GPT-5.2) ====================
# Roleplay where the AI plays a tough Indian customer/parent/prospect and the
# user practises pitching/closing. Uses sales-specific scoring rubric.

SALES_SCENARIOS = [
    {"id": "edtech_parent",   "industry": "EdTech",                "title": "Selling an online coding bootcamp to a hesitant parent",                  "customer": "A working-class parent in a Tier-2 city worried about ₹40k fee and 'will my kid get a job?'",     "goal": "Convince the parent to enrol their child for the next batch"},
    {"id": "edtech_student",  "industry": "EdTech",                "title": "Counselling a final-year student on a data science course",                 "customer": "A confused B.Com final year student exploring career switches, mostly silent and indecisive",     "goal": "Help them commit to a 6-month data science track"},
    {"id": "insurance_term",  "industry": "Insurance",             "title": "Pitching a term life policy to a 26-year-old IT fresher",                   "customer": "A 26-yr-old fresher who 'doesn't have dependents, why do I need this?' attitude",                  "goal": "Close a ₹500/month term plan"},
    {"id": "realestate_flat", "industry": "Real Estate",           "title": "Selling a 2BHK flat in suburban Pune",                                       "customer": "A couple comparing 4 builders; price-sensitive, asking about RERA + loan approvals",              "goal": "Get them to book a site visit this weekend"},
    {"id": "saas_demo",       "industry": "B2B SaaS",              "title": "Cold call to book a product demo with a startup CTO",                       "customer": "A busy CTO who picks up by mistake and says 'I have 60 seconds'",                                  "goal": "Book a 30-min demo for next week"},
    {"id": "college_counsel", "industry": "College Admission",     "title": "Counselling a student + parent for engineering admission",                  "customer": "A parent + student duo; parent wants 'placement guarantee', student wants AI/ML branch",          "goal": "Get them to pay the ₹25k seat-blocking fee today"},
]


class SalesScenario(BaseModel):
    id: str
    industry: str
    title: str
    customer: str
    goal: str


class SalesScenarioListResponse(BaseModel):
    scenarios: List[SalesScenario]


@router.get("/sales/scenarios", response_model=SalesScenarioListResponse)
async def sales_scenarios() -> SalesScenarioListResponse:
    return SalesScenarioListResponse(scenarios=[SalesScenario(**s) for s in SALES_SCENARIOS])


SALES_ROLEPLAY_SYSTEM = (
    "You are an extremely realistic Indian {industry} customer/prospect in a SALES ROLEPLAY. "
    "Scenario: {title}. Customer profile: {customer}. The user (salesperson) is trying to: {goal}. "
    "Speak like a real Indian customer would — mix English with Hindi/Hinglish (1-2 Hindi words per turn is realistic). "
    "Raise common Indian objections like price ('mehnga hai', 'discount do'), trust ('aap company ka kya proof?'), "
    "family/decision ('ghar mein discuss karna padega'), comparison ('competitor sasta de raha hai'), urgency ('abhi nahi, baad mein dekh lenge'). "
    "Do NOT make it too easy. Push back, stay sceptical, ask sharp questions. "
    "After {target_turns} turns of conversation, you can choose to convert (`should_end=true, converted=true`) "
    "or politely refuse (`should_end=true, converted=false`) based on how persuasive the salesperson was. "
    "Always respond with ONLY a JSON object — no prose, no code fences — in this exact shape: "
    '{"customer_reply": "your in-character reply in Hinglish (1-3 sentences)", '
    '"scores": {"empathy": int(0-100), "persuasion": int(0-100), "objection_handling": int(0-100), "product_knowledge": int(0-100), "closing": int(0-100)}, '
    '"feedback": "1 short coaching note for the salesperson on their LAST message (or empty for opening turn)", '
    '"objection_raised": "name of objection if any (price/trust/family/comparison/urgency/timing) else null", '
    '"should_end": boolean, '
    '"converted": boolean}'
)


class SalesTurnHistoryItem(BaseModel):
    role: str   # "user" (salesperson) | "customer"
    text: str


class SalesTurnRequest(BaseModel):
    scenario_id: str
    history: List[SalesTurnHistoryItem] = Field(default_factory=list)
    user_message: Optional[str] = None   # if None and history empty → opening line from customer
    target_turns: int = Field(default=6, ge=3, le=12)


class SalesScores(BaseModel):
    empathy: int
    persuasion: int
    objection_handling: int
    product_knowledge: int
    closing: int


class SalesTurnResponse(BaseModel):
    customer_reply: str
    scores: Optional[SalesScores] = None
    feedback: Optional[str] = None
    objection_raised: Optional[str] = None
    should_end: bool = False
    converted: bool = False
    turn_number: int


def _find_scenario(scenario_id: str) -> dict:
    for s in SALES_SCENARIOS:
        if s["id"] == scenario_id:
            return s
    raise HTTPException(status_code=404, detail="Unknown scenario_id")


@router.post("/sales/turn", response_model=SalesTurnResponse)
async def sales_turn(
    req: SalesTurnRequest,
    x_user_id: Optional[str] = Header(default=None),
    x_is_premium: Optional[str] = Header(default=None),
) -> SalesTurnResponse:
    is_premium = _is_premium_hdr(x_is_premium)
    await _guard("sales_turn", uid=x_user_id, is_premium=is_premium)
    s = _find_scenario(req.scenario_id)
    sys_msg = (
        SALES_ROLEPLAY_SYSTEM
        .replace("{industry}", s["industry"])
        .replace("{title}", s["title"])
        .replace("{customer}", s["customer"])
        .replace("{goal}", s["goal"])
        .replace("{target_turns}", str(req.target_turns))
    )
    chat = _new_chat(str(uuid.uuid4()), sys_msg, "openai", "gpt-5.2")

    convo = "\n".join(
        f"{'Salesperson' if h.role == 'user' else 'Customer'}: {h.text}" for h in req.history
    )
    user_turns = sum(1 for h in req.history if h.role == "user") + (1 if req.user_message else 0)
    should_end_hint = "true" if user_turns >= req.target_turns else "false"

    if req.user_message:
        prompt = (
            f"Conversation so far:\n{convo}\n\n"
            f"Salesperson's latest message: {req.user_message}\n\n"
            f"Target turns: {req.target_turns} · Salesperson has spoken {user_turns} time(s). "
            f"If salesperson_turns >= target_turns then should_end=true and decide converted based on overall persuasion. "
            f"Else should_end={should_end_hint}. Now respond as the customer in JSON."
        )
    else:
        prompt = (
            "This is the OPENING turn. You (customer) speak first — set the scene with a tough, realistic opener. "
            "scores must all be 0 (no salesperson message yet), feedback can be empty, objection_raised can be null. "
            "Now respond in JSON."
        )

    raw = await chat.send_message(UserMessage(text=prompt))
    await _record("sales_turn", uid=x_user_id)
    data = _extract_json(raw)
    raw_scores = data.get("scores") or {}
    scores_model: Optional[SalesScores] = None
    if req.user_message:
        scores_model = SalesScores(
            empathy=int(raw_scores.get("empathy", 0)),
            persuasion=int(raw_scores.get("persuasion", 0)),
            objection_handling=int(raw_scores.get("objection_handling", 0)),
            product_knowledge=int(raw_scores.get("product_knowledge", 0)),
            closing=int(raw_scores.get("closing", 0)),
        )
    return SalesTurnResponse(
        customer_reply=str(data.get("customer_reply") or "Hmm, batao kya offer hai?").strip(),
        scores=scores_model,
        feedback=str(data.get("feedback") or "").strip() or None,
        objection_raised=(str(data.get("objection_raised") or "").strip() or None),
        should_end=bool(data.get("should_end", False)) or user_turns >= req.target_turns,
        converted=bool(data.get("converted", False)),
        turn_number=user_turns + (0 if req.user_message else 1),
    )


SALES_SESSION_SYSTEM = (
    "You are a senior sales-training coach reviewing a completed sales roleplay session. "
    "Given the scenario goal and the full conversation, produce a coaching report. "
    "Return ONLY a JSON object — no prose, no code fences — in this shape: "
    '{"overallScore": int(0-100), "empathyScore": int, "persuasionScore": int, "objectionScore": int, "productScore": int, "closingScore": int, '
    '"converted": bool, "outcome_summary": "1-2 sentence outcome", '
    '"strengths": [string list, max 4], "improvements": [string list, max 4], '
    '"key_objections_handled": [string list of objections salesperson addressed well], '
    '"missed_opportunities": [string list of moments salesperson should have pushed harder or empathised more], '
    '"sample_winning_pitch": "a 2-3 sentence example of how an expert would have closed"}'
)


class SalesSessionTurn(BaseModel):
    role: str
    text: str


class SalesSessionScoreRequest(BaseModel):
    scenario_id: str
    history: List[SalesSessionTurn]
    converted: bool = False


class SalesSessionScoreResponse(BaseModel):
    overallScore: int
    empathyScore: int
    persuasionScore: int
    objectionScore: int
    productScore: int
    closingScore: int
    converted: bool
    outcome_summary: str
    strengths: List[str]
    improvements: List[str]
    key_objections_handled: List[str]
    missed_opportunities: List[str]
    sample_winning_pitch: str


@router.post("/sales/score-session", response_model=SalesSessionScoreResponse)
async def sales_score_session(
    req: SalesSessionScoreRequest,
    x_user_id: Optional[str] = Header(default=None),
    x_is_premium: Optional[str] = Header(default=None),
) -> SalesSessionScoreResponse:
    is_premium = _is_premium_hdr(x_is_premium)
    await _guard("sales_score_session", uid=x_user_id, is_premium=is_premium)
    s = _find_scenario(req.scenario_id)
    chat = _new_chat(str(uuid.uuid4()), SALES_SESSION_SYSTEM, "openai", "gpt-5.2")
    convo = "\n".join(f"{'Salesperson' if h.role == 'user' else 'Customer'}: {h.text}" for h in req.history)
    prompt = (
        f"Scenario: {s['title']} · Industry: {s['industry']}\n"
        f"Sales goal: {s['goal']}\n"
        f"Outcome flag: {'converted' if req.converted else 'not converted'}\n\n"
        f"Full conversation:\n{convo}\n\nReturn the JSON report now."
    )
    raw = await chat.send_message(UserMessage(text=prompt))
    await _record("sales_score_session", uid=x_user_id)
    data = _extract_json(raw)

    def _list(key: str, limit: int = 4) -> List[str]:
        v = data.get(key) or []
        if not isinstance(v, list):
            return []
        return [str(x) for x in v][:limit]

    return SalesSessionScoreResponse(
        overallScore=int(data.get("overallScore", 0)),
        empathyScore=int(data.get("empathyScore", 0)),
        persuasionScore=int(data.get("persuasionScore", 0)),
        objectionScore=int(data.get("objectionScore", 0)),
        productScore=int(data.get("productScore", 0)),
        closingScore=int(data.get("closingScore", 0)),
        converted=bool(data.get("converted", req.converted)),
        outcome_summary=str(data.get("outcome_summary", "")),
        strengths=_list("strengths", 4) or ["You completed the session — that's already practice."],
        improvements=_list("improvements", 4) or ["Listen 70%, talk 30% — uncover the real objection."],
        key_objections_handled=_list("key_objections_handled", 5),
        missed_opportunities=_list("missed_opportunities", 5),
        sample_winning_pitch=str(data.get("sample_winning_pitch", "")),
    )


# ==================== RESUME PARSE + INTERVIEW Q GENERATION (Claude Sonnet 4.6) ====================

RESUME_MAX_BYTES = 5 * 1024 * 1024  # 5 MB

RESUME_PARSE_SYSTEM = (
    "You are an expert resume parser for Indian candidates. Given the RAW EXTRACTED TEXT of a resume "
    "(may contain layout noise, page numbers, header/footer junk), produce a clean structured JSON. "
    "Extract: name, headline/target role, professional summary (2-3 sentences), skills (technical + soft), "
    "experience (list), education (list), projects (list), certifications (list). "
    "If a section is missing, return an empty array or empty string. Do not invent facts. "
    "Return ONLY a JSON object — no prose, no code fences — in this exact shape: "
    '{"name": "...", "role_target": "...", "summary": "...", '
    '"skills": ["Python", "SQL", "Communication", ...], '
    '"experience": [{"company": "...", "title": "...", "duration": "...", "highlights": ["...", "..."]}], '
    '"education": [{"institution": "...", "degree": "...", "year": "..."}], '
    '"projects": [{"name": "...", "description": "...", "tech": ["...", "..."]}], '
    '"certifications": ["..."], '
    '"years_of_experience": int }'
)


class ResumeExperience(BaseModel):
    company: str = ""
    title: str = ""
    duration: str = ""
    highlights: List[str] = Field(default_factory=list)


class ResumeEducation(BaseModel):
    institution: str = ""
    degree: str = ""
    year: str = ""


class ResumeProject(BaseModel):
    name: str = ""
    description: str = ""
    tech: List[str] = Field(default_factory=list)


class ResumeParseResponse(BaseModel):
    name: str = ""
    role_target: str = ""
    summary: str = ""
    skills: List[str] = Field(default_factory=list)
    experience: List[ResumeExperience] = Field(default_factory=list)
    education: List[ResumeEducation] = Field(default_factory=list)
    projects: List[ResumeProject] = Field(default_factory=list)
    certifications: List[str] = Field(default_factory=list)
    years_of_experience: int = 0
    raw_text_excerpt: str = ""   # first 500 chars for transparency


def _extract_pdf_text(file_bytes: bytes) -> str:
    """Extract text from a PDF using pypdf. Returns empty string on failure."""
    import io
    try:
        reader = PdfReader(io.BytesIO(file_bytes))
        pages: List[str] = []
        for page in reader.pages:
            try:
                pages.append(page.extract_text() or "")
            except Exception:  # noqa: BLE001
                continue
        return "\n".join(pages).strip()
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=400, detail=f"Could not read PDF: {exc}") from exc


@router.post("/resume/parse", response_model=ResumeParseResponse)
async def resume_parse(
    file: UploadFile = File(...),
    x_user_id: Optional[str] = Header(default=None),
    x_is_premium: Optional[str] = Header(default=None),
) -> ResumeParseResponse:
    is_premium = _is_premium_hdr(x_is_premium)
    await _guard("resume_parse", uid=x_user_id, is_premium=is_premium)
    if not file.filename or not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only .pdf files are supported")
    contents = await file.read()
    if len(contents) > RESUME_MAX_BYTES:
        raise HTTPException(status_code=413, detail=f"Resume exceeds {RESUME_MAX_BYTES // (1024*1024)} MB limit")
    raw_text = _extract_pdf_text(contents)
    if len(raw_text) < 40:
        raise HTTPException(status_code=422, detail="Could not extract enough text from this PDF. Try a text-based (not scanned) resume.")

    # Truncate for LLM — most resumes fit easily under 12k chars
    snippet = raw_text[:12000]
    chat = _new_chat(str(uuid.uuid4()), RESUME_PARSE_SYSTEM, "anthropic", "claude-sonnet-4-6")
    prompt = f"Raw resume text:\n\"\"\"\n{snippet}\n\"\"\"\n\nNow return the structured JSON."
    raw = await chat.send_message(UserMessage(text=prompt))
    await _record("resume_parse", uid=x_user_id)
    data = _extract_json(raw)

    def _exps(key: str) -> List[ResumeExperience]:
        out: List[ResumeExperience] = []
        for e in (data.get(key) or [])[:8]:
            if not isinstance(e, dict):
                continue
            hl = e.get("highlights") or []
            if not isinstance(hl, list):
                hl = []
            out.append(ResumeExperience(
                company=str(e.get("company", "")), title=str(e.get("title", "")),
                duration=str(e.get("duration", "")),
                highlights=[str(h) for h in hl][:5],
            ))
        return out

    def _edus() -> List[ResumeEducation]:
        out: List[ResumeEducation] = []
        for e in (data.get("education") or [])[:6]:
            if not isinstance(e, dict):
                continue
            out.append(ResumeEducation(
                institution=str(e.get("institution", "")),
                degree=str(e.get("degree", "")),
                year=str(e.get("year", "")),
            ))
        return out

    def _projs() -> List[ResumeProject]:
        out: List[ResumeProject] = []
        for e in (data.get("projects") or [])[:6]:
            if not isinstance(e, dict):
                continue
            tech = e.get("tech") or []
            if not isinstance(tech, list):
                tech = []
            out.append(ResumeProject(
                name=str(e.get("name", "")),
                description=str(e.get("description", "")),
                tech=[str(t) for t in tech][:8],
            ))
        return out

    skills_raw = data.get("skills") or []
    if not isinstance(skills_raw, list):
        skills_raw = []
    certs_raw = data.get("certifications") or []
    if not isinstance(certs_raw, list):
        certs_raw = []

    return ResumeParseResponse(
        name=str(data.get("name", "")),
        role_target=str(data.get("role_target", "")),
        summary=str(data.get("summary", "")),
        skills=[str(s) for s in skills_raw][:30],
        experience=_exps("experience"),
        education=_edus(),
        projects=_projs(),
        certifications=[str(c) for c in certs_raw][:10],
        years_of_experience=int(data.get("years_of_experience", 0) or 0),
        raw_text_excerpt=raw_text[:500],
    )


RESUME_QUESTIONS_SYSTEM = (
    "You are a senior interviewer building a custom interview question set for a candidate. "
    "Use the parsed resume + target role to generate 8-10 PERSONALISED interview questions. "
    "Mix categories: 2-3 about specific projects/experience on the resume, 2-3 role-relevant technical/situational, "
    "1-2 HR/behavioural (motivation, weakness, teamwork), 1 about a skill gap or 'why this role'. "
    "Each question must be directly tied to something in the resume — never generic. "
    "Return ONLY a JSON object — no prose, no code fences — in this exact shape: "
    '{"questions": [{"question": "...", "category": "project|technical|hr|situational|gap", '
    '"difficulty": "easy|medium|hard", "rationale": "1-line why this question for this resume"}], '
    '"focus_areas": [list of 2-4 areas the candidate should brush up before the interview]}'
)


class ResumeQuestionsRequest(BaseModel):
    resume: ResumeParseResponse
    role_target: Optional[str] = None
    difficulty: Optional[str] = "intermediate"


class ResumeQuestion(BaseModel):
    question: str
    category: str = "general"
    difficulty: str = "medium"
    rationale: str = ""


class ResumeQuestionsResponse(BaseModel):
    questions: List[ResumeQuestion]
    focus_areas: List[str]
    target_role: str


@router.post("/resume/interview-questions", response_model=ResumeQuestionsResponse)
async def resume_interview_questions(
    req: ResumeQuestionsRequest,
    x_user_id: Optional[str] = Header(default=None),
    x_is_premium: Optional[str] = Header(default=None),
) -> ResumeQuestionsResponse:
    is_premium = _is_premium_hdr(x_is_premium)
    await _guard("resume_interview_questions", uid=x_user_id, is_premium=is_premium)
    target = req.role_target or req.resume.role_target or "general fresher role"
    chat = _new_chat(str(uuid.uuid4()), RESUME_QUESTIONS_SYSTEM, "anthropic", "claude-sonnet-4-6")
    resume_json = req.resume.model_dump_json(exclude={"raw_text_excerpt"})
    prompt = (
        f"Target role: {target}\nDifficulty: {req.difficulty or 'intermediate'}\n\n"
        f"Parsed resume:\n{resume_json}\n\n"
        "Now return the JSON with personalised questions."
    )
    raw = await chat.send_message(UserMessage(text=prompt))
    await _record("resume_interview_questions", uid=x_user_id)
    data = _extract_json(raw)
    qs_raw = data.get("questions") or []
    qs: List[ResumeQuestion] = []
    for q in qs_raw[:10]:
        if not isinstance(q, dict) or not q.get("question"):
            continue
        qs.append(ResumeQuestion(
            question=str(q["question"]).strip(),
            category=str(q.get("category", "general")).lower(),
            difficulty=str(q.get("difficulty", "medium")).lower(),
            rationale=str(q.get("rationale", "")),
        ))
    focus_raw = data.get("focus_areas") or []
    if not isinstance(focus_raw, list):
        focus_raw = []
    return ResumeQuestionsResponse(
        questions=qs,
        focus_areas=[str(f) for f in focus_raw][:6],
        target_role=target,
    )
