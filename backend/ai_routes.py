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
from fastapi import APIRouter, File, HTTPException, UploadFile, Form
from pydantic import BaseModel, Field

import usage_tracker as ut

EMERGENT_LLM_KEY = os.environ["EMERGENT_LLM_KEY"]

router = APIRouter(prefix="/ai")

_tts = OpenAITextToSpeech(api_key=EMERGENT_LLM_KEY)
_stt = OpenAISpeechToText(api_key=EMERGENT_LLM_KEY)


# ---------------------- budget kill switch ----------------------

async def _guard(endpoint: str) -> None:
    """Raises 503 if the daily budget is exhausted or AI is globally disabled.
    Call BEFORE each LLM round-trip in every public endpoint."""
    reason = await ut.check_budget(endpoint)
    if reason:
        raise HTTPException(
            status_code=503,
            detail={"code": "service_disabled", "reason": reason},
        )


async def _record(endpoint: str) -> None:
    try:
        await ut.record_call(endpoint)
    except Exception:
        # Never let usage tracking failure break a user-facing call.
        pass


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
async def tutor_chat(req: TutorChatRequest) -> TutorChatResponse:
    await _guard("tutor_chat")
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
    await _record("tutor_chat")
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
    "You are an expert English speaking coach evaluating a learner's spoken response. "
    "Given a transcript and duration, score the speech on FOUR axes and give actionable, specific feedback. "
    "Be honest — vary scores realistically (don't always give 70-80). Penalise short or off-topic answers. "
    "Return ONLY a JSON object — no prose, no code fences — in this exact shape: "
    '{"overall": int(0-100), "pronunciation": int(0-100), "fluency": int(0-100), '
    '"grammar": int(0-100), "vocabulary": int(0-100), '
    '"mistakes": ["specific mistake 1", "specific mistake 2"], '
    '"corrected": "the user transcript rewritten with all errors fixed", '
    '"suggested": "a native-speaker-quality answer (2-3 sentences) to the same prompt", '
    '"feedback": "1-2 sentence coaching focus area"}'
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
    mistakes: List[str] = Field(default_factory=list)
    corrected: str = ""
    suggested: str = ""
    feedback: str


@router.post("/speaking/score", response_model=SpeakingScoreResponse)
async def speaking_score(req: SpeakingScoreRequest) -> SpeakingScoreResponse:
    await _guard("speaking_score")
    chat = _new_chat(str(uuid.uuid4()), SPEAKING_SYSTEM, "anthropic", "claude-sonnet-4-6")
    prompt = (
        f"Prompt the user was answering: \"{req.prompt or 'general speaking practice'}\"\n"
        f"Transcript: \"{req.transcript}\"\n"
        f"Duration: {req.duration_sec:.1f} seconds\n"
        f"Word count: {len(req.transcript.split())}\n"
        "Now return the JSON evaluation."
    )
    raw = await chat.send_message(UserMessage(text=prompt))
    await _record("speaking_score")
    data = _extract_json(raw)
    mistakes_raw = data.get("mistakes") or []
    if not isinstance(mistakes_raw, list):
        mistakes_raw = []
    return SpeakingScoreResponse(
        overall=int(data.get("overall", 0)),
        pronunciation=int(data.get("pronunciation", 0)),
        fluency=int(data.get("fluency", 0)),
        grammar=int(data.get("grammar", 0)),
        vocabulary=int(data.get("vocabulary", 0)),
        mistakes=[str(m) for m in mistakes_raw][:5],
        corrected=str(data.get("corrected", "")),
        suggested=str(data.get("suggested", "")),
        feedback=str(data.get("feedback", "Keep practising!")),
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
async def interview_live(req: LiveInterviewRequest) -> LiveInterviewResponse:
    await _guard("interview_live")
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
    await _record("interview_live")
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
