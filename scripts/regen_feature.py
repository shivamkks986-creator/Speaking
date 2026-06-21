"""Regenerate feature graphic to match the new mic+speech bubble brand theme."""
import asyncio
import os
import base64
from pathlib import Path
from dotenv import load_dotenv

load_dotenv("/app/backend/.env")
from emergentintegrations.llm.chat import LlmChat, UserMessage

OUT_DIR = Path("/app/frontend/public/store-assets")
MODEL = "gemini-3.1-flash-image-preview"
API_KEY = os.getenv("EMERGENT_LLM_KEY")

FEATURE_PROMPT = """Design a Google Play Store FEATURE GRAPHIC, exactly 1024 pixels wide by 500 pixels tall.

Brand: "SpeakMate AI" — AI-powered communication & job interview coaching app.

LAYOUT (left-aligned text composition with hero visual on the right):

LEFT 55% of canvas (text block, left-aligned):
- Main headline: "SpeakMate AI" in extra-large bold modern sans-serif, pure white
- Tagline below in medium weight, slightly transparent white: "Master Communication."
- Second tagline on next line, same style: "Land Your Dream Job."
- Small subtitle at the bottom of the text block: "AI-powered interview & speaking coach"
- All text crisp and sharp, no blur

RIGHT 45% of canvas (hero visual):
- Large glossy 3D microphone INSIDE a rounded speech bubble (same brand element as the app icon)
- Microphone + bubble in vibrant cyan-to-purple gradient (#00C2FF → #3B82F6 → #8B5CF6)
- Two sparkle stars (one cyan-teal, one warm gold-yellow) floating near the bubble
- Subtle abstract sound-wave lines emanating to the right
- Floating mini chat-bubble UI element with a small "AI feedback ✓" tag nearby

BACKGROUND:
- Solid jet black (#000000) on the left half blending to a deep midnight indigo (#0A0418) on the right half
- Subtle dark purple glow behind the mic-bubble
- A few tiny decorative star particles scattered

STYLE:
- Premium SaaS marketing banner, top-tier mobile app store aesthetic
- High contrast, sharp text rendering, vibrant saturation on the hero visual
- NO watermarks, NO emergent badge, NO logos other than the SpeakMate AI wordmark
- NO transparency — fill the entire 1024x500 canvas
- The mic-in-bubble element should match the app icon design EXACTLY for brand consistency."""


async def main():
    chat = LlmChat(
        api_key=API_KEY,
        session_id="spkmate-feat-v2-brand",
        system_message="You are a premium SaaS brand designer.",
    )
    chat.with_model("gemini", MODEL).with_params(modalities=["image", "text"])
    _, images = await chat.send_message_multimodal_response(UserMessage(text=FEATURE_PROMPT))
    if images:
        out = OUT_DIR / "feature-graphic-v2-source.png"
        out.write_bytes(base64.b64decode(images[0]["data"]))
        print(f"Saved {out} ({out.stat().st_size} bytes)")
    else:
        print("FAILED")


if __name__ == "__main__":
    asyncio.run(main())
