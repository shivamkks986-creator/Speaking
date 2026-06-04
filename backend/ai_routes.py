"""AI routes for SpeakMate AI mobile app.

Multi-agent setup:
- AI Tutor (chat): GPT-5.2
- Speaking score: Claude Sonnet 4.6
- Interview (evaluate/followup/score-session): GPT-5.2
- Vocabulary lookup: Gemini 3 Flash
- Daily challenge evaluation: Claude Sonnet 4.6
"""
from __future__ import annotations

import json
import os
import re
import uuid
from typing import List, Optional

from emergentintegrations.llm.chat import LlmChat, UserMessage
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

EMERGENT_LLM_KEY = os.environ["EMERGENT_LLM_KEY"]

router = APIRouter(prefix="/ai")


# ---------------------- helpers ----------------------

def _new_chat(session_id: str, system_message: str, provider: str, model: str) -> LlmChat:
    return LlmChat(
        api_key=EMERGENT_LLM_KEY,
        session_id=session_id,
        system_message=system_message,
    ).with_model(provider, model)


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
    "You are SpeakMate, a warm, encouraging English tutor for Indian learners. "
    "The user may write in English, Hinglish, or Hindi. Your job: "
    "1) If their message has grammar mistakes, gently correct it. "
    "2) Suggest a more natural/native phrasing when possible. "
    "3) Reply conversationally (1-3 sentences) so the practice continues. "
    "4) If the user writes in Hindi, give the English translation. "
    "Always respond with ONLY a JSON object — no prose, no code fences — in this exact shape: "
    '{"reply": "...", "correction": "..." or null, "suggestion": "..." or null}'
)


class TutorChatRequest(BaseModel):
    message: str
    session_id: Optional[str] = None
    companion_id: Optional[str] = None
    system_prompt: Optional[str] = None


class TutorChatResponse(BaseModel):
    id: str
    session_id: str
    reply: str
    correction: Optional[str] = None
    suggestion: Optional[str] = None


@router.post("/tutor/chat", response_model=TutorChatResponse)
async def tutor_chat(req: TutorChatRequest) -> TutorChatResponse:
    session_id = req.session_id or str(uuid.uuid4())
    system_msg = (req.system_prompt or TUTOR_SYSTEM).strip()
    chat = _new_chat(session_id, system_msg, "openai", "gpt-5.2")
    raw = await chat.send_message(UserMessage(text=req.message))
    data = _extract_json(raw)
    return TutorChatResponse(
        id=str(uuid.uuid4()),
        session_id=session_id,
        reply=data.get("reply", "").strip() or "Let's keep practising!",
        correction=(data.get("correction") or None),
        suggestion=(data.get("suggestion") or None),
    )


# ==================== SPEAKING SCORE (Claude Sonnet 4.6) ====================

SPEAKING_SYSTEM = (
    "You are an expert English speaking coach evaluating a learner's spoken response. "
    "Given a transcript and duration, score the speech and give brief, actionable feedback. "
    "Return ONLY a JSON object — no prose, no code fences — in this exact shape: "
    '{"overall": int(0-100), "pronunciation": int(0-100), "fluency": int(0-100), '
    '"grammar": int(0-100), "feedback": "1-2 sentence coaching feedback"}'
)


class SpeakingScoreRequest(BaseModel):
    transcript: str
    duration_sec: float = Field(ge=0)


class SpeakingScoreResponse(BaseModel):
    overall: int
    pronunciation: int
    fluency: int
    grammar: int
    feedback: str


@router.post("/speaking/score", response_model=SpeakingScoreResponse)
async def speaking_score(req: SpeakingScoreRequest) -> SpeakingScoreResponse:
    chat = _new_chat(str(uuid.uuid4()), SPEAKING_SYSTEM, "anthropic", "claude-sonnet-4-6")
    prompt = (
        f"Transcript: \"{req.transcript}\"\n"
        f"Duration: {req.duration_sec:.1f} seconds\n"
        f"Word count: {len(req.transcript.split())}\n"
        "Now return the JSON evaluation."
    )
    raw = await chat.send_message(UserMessage(text=prompt))
    data = _extract_json(raw)
    return SpeakingScoreResponse(
        overall=int(data.get("overall", 0)),
        pronunciation=int(data.get("pronunciation", 0)),
        fluency=int(data.get("fluency", 0)),
        grammar=int(data.get("grammar", 0)),
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
