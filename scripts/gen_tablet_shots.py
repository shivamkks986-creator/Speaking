"""Generate 2 tablet screenshot mockups for SpeakMate AI (works for both 7" and 10")."""
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

# Tablet landscape mockup — Dashboard / Roadmap view
LANDSCAPE_PROMPT = """Design a Google Play Store TABLET screenshot mockup, landscape orientation, exactly 2560 pixels wide by 1600 pixels tall.

App: SpeakMate AI — AI-powered communication & job interview coaching app.

LAYOUT:
- Show a realistic Android tablet device frame (silver bezel, rounded corners) centered, occupying about 75% of the canvas
- The tablet screen shows the SpeakMate AI dashboard with:
  - Top header: "SpeakMate AI" wordmark in white + small mic-bubble icon (cyan-to-purple gradient)
  - Greeting: "Hi, Shivam 👋"
  - Sub-text: "Day 7 of your 30-Day Job-Ready Roadmap"
  - 30-Day progress bar (filled ~25% in purple gradient)
  - Grid of 4 module cards side-by-side: "Tell Me About Yourself", "Sales Roleplay", "Resume Mock Interview", "Counselling Practice" — each card with a small icon, title, and "Practice now" button
  - Bottom navigation bar with 4 icons: Home, Practice, Progress, Profile
- App UI background: dark indigo (#0A0418) with subtle purple glow
- Card backgrounds: dark glass-morphism with thin purple border, white text
- All text crisp and readable

CANVAS BACKGROUND:
- Solid jet black (#000000) outside the tablet, fading subtly to deep purple at edges
- A few small sparkle particles (cyan + gold) decoratively placed
- Bottom: in white text, a marketing caption: "Your 30-Day Roadmap to Job-Ready Communication"

STYLE:
- Premium app store mockup, high contrast, sharp text
- Tablet device looks realistic but minimalist
- The mic-in-speech-bubble icon in the top header MUST match the existing app icon brand
- NO watermarks, NO logos other than SpeakMate AI"""


# Tablet portrait mockup — TMAY trainer in action
PORTRAIT_PROMPT = """Design a Google Play Store TABLET screenshot mockup, portrait orientation, exactly 1600 pixels wide by 2560 pixels tall.

App: SpeakMate AI — AI-powered communication & job interview coaching app.

LAYOUT:
- Show a realistic Android tablet device frame (silver bezel, rounded corners) centered, occupying about 78% of canvas
- The tablet screen shows the "TMAY Trainer" (Tell Me About Yourself) screen in action:
  - Top header: back arrow + title "TMAY Trainer" + small mic-bubble brand icon (cyan-purple gradient)
  - A large chat thread with 3 messages:
    - User bubble (right, purple): "I'm a fresh graduate with a degree in Commerce. Passionate about communication and learning..."
    - AI coach bubble (left, dark glass): "Great start! Try to be more specific about your achievements. Mention a project or result."
    - User bubble (right, purple): "Sure! I led a 15-member college fest team and raised ₹2L in sponsorships."
  - Below chat: a "Tap to speak 🎤" big purple gradient button with sound-wave animation around it
  - Right side panel (floating card): "AI Feedback Score" with 5 progress bars (Confidence 85, Fluency 78, Clarity 90, Vocabulary 72, Pace 80)
  - Bottom navigation bar with 4 icons
- App UI background: dark indigo (#0A0418), purple accents
- All text crisp and readable

CANVAS BACKGROUND:
- Solid jet black (#000000) outside the tablet
- A few sparkle particles
- Top: large white text caption "Get Real-Time AI Feedback on Every Practice"
- Bottom: smaller white caption "5-Dimension Scoring · Voice & Text"

STYLE:
- Premium app store mockup, high contrast
- Mic-bubble brand icon matches the app icon design EXACTLY
- NO watermarks, professional"""


async def gen(session_id: str, prompt: str, out_file: Path):
    chat = LlmChat(
        api_key=API_KEY,
        session_id=session_id,
        system_message="You are a senior mobile app marketing designer.",
    )
    chat.with_model("gemini", MODEL).with_params(modalities=["image", "text"])
    _, images = await chat.send_message_multimodal_response(UserMessage(text=prompt))
    if images:
        out_file.write_bytes(base64.b64decode(images[0]["data"]))
        print(f"Saved {out_file} ({out_file.stat().st_size} bytes)")
        return True
    print(f"FAILED {session_id}")
    return False


async def main():
    await gen("tab-landscape-v1", LANDSCAPE_PROMPT, OUT_DIR / "tablet-landscape-source.png")
    await gen("tab-portrait-v1", PORTRAIT_PROMPT, OUT_DIR / "tablet-portrait-source.png")


if __name__ == "__main__":
    asyncio.run(main())
