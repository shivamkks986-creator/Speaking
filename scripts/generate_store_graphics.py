"""
Generate Google Play Store marketing graphics for SpeakMate AI.
Run once: python /app/scripts/generate_store_graphics.py

Outputs:
  /app/frontend/public/store-assets/app-icon-1024.png   (resized to 512 for Play Console)
  /app/frontend/public/store-assets/feature-graphic.png (resized to 1024x500)
"""
import asyncio
import os
import sys
import base64
from pathlib import Path
from dotenv import load_dotenv

# Load env from backend/.env
load_dotenv("/app/backend/.env")

from emergentintegrations.llm.chat import LlmChat, UserMessage  # noqa: E402

OUT_DIR = Path("/app/frontend/public/store-assets")
OUT_DIR.mkdir(parents=True, exist_ok=True)

MODEL = "gemini-3.1-flash-image-preview"
API_KEY = os.getenv("EMERGENT_LLM_KEY")
if not API_KEY:
    print("ERROR: EMERGENT_LLM_KEY missing in /app/backend/.env")
    sys.exit(1)


async def gen(session_id: str, prompt: str, out_file: Path):
    chat = LlmChat(
        api_key=API_KEY,
        session_id=session_id,
        system_message="You are a top-tier graphic designer creating Google Play Store assets.",
    )
    chat.with_model("gemini", MODEL).with_params(modalities=["image", "text"])

    msg = UserMessage(text=prompt)
    text, images = await chat.send_message_multimodal_response(msg)
    print(f"[{session_id}] text-len={len(text or '')} images={len(images or [])}")

    if not images:
        print(f"[{session_id}] FAILED — no images returned")
        return False

    image_bytes = base64.b64decode(images[0]["data"])
    out_file.write_bytes(image_bytes)
    print(f"[{session_id}] saved → {out_file} ({len(image_bytes)} bytes)")
    return True


ICON_PROMPT = """Design a Google Play Store app icon, exactly 1024x1024 pixels, square format.

Brand: "SpeakMate AI" — a communication skills and job interview coaching app.

Concept:
- A bold lowercase letter "s" or stylised speech-bubble mark centered on the icon
- Background: solid deep indigo to electric purple gradient, NO transparency
- Foreground glyph: pure white with a subtle inner glow
- Add a tiny minimalist sound-wave or microphone hint integrated into the letter
- Soft 18% rounded corner styling on the entire icon
- Premium fintech-style finish, flat with a single subtle highlight
- No text, no taglines, no extra elements
- Centre composition, generous padding (icon mark should occupy ~60% of canvas)

Style: modern, professional, mobile-first, high contrast, recognisable at 48x48 thumbnail size."""

FEATURE_PROMPT = """Design a Google Play Store FEATURE GRAPHIC banner, exactly 1024 pixels wide by 500 pixels tall (16:7.8 ratio).

Brand: "SpeakMate AI"

Layout:
- LEFT 60% of canvas: bold text composition
  - Main headline: "SpeakMate AI" in large modern sans-serif white
  - Tagline below in lighter weight: "Master Communication. Land Your Dream Job."
  - Small subtitle: "AI-powered interview & speaking coach"
- RIGHT 40%: stylised phone mockup or floating UI cards showing chat bubbles, a microphone icon, and a small AI feedback score gauge (5 dimensions)
- Background: rich indigo-to-purple gradient (#0A0418 → #5B3FE3 → #7C5CFF) with subtle abstract sound-wave lines
- Decorative elements: tiny stars or particles, soft purple glow accents
- NO transparency, fill the entire 1024x500 canvas

Style: premium SaaS marketing banner, high contrast, professional, modern Indian tech startup aesthetic. Sharp text rendering. No watermarks, no logos other than the SpeakMate AI wordmark."""


async def main():
    print("Generating SpeakMate AI Play Store assets via Gemini Nano Banana ...")
    icon_ok = await gen("spkmate-icon-v1", ICON_PROMPT, OUT_DIR / "app-icon-source.png")
    feat_ok = await gen("spkmate-feat-v1", FEATURE_PROMPT, OUT_DIR / "feature-graphic-source.png")
    print("\nDone.")
    print(f"  Icon ok:    {icon_ok}")
    print(f"  Feature ok: {feat_ok}")
    print(f"  Output dir: {OUT_DIR}")


if __name__ == "__main__":
    asyncio.run(main())
