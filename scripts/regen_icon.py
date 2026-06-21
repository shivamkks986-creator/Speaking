"""Regenerate app icon to match SpeakMate AI's existing brand (mic + speech bubble)."""
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

ICON_PROMPT = """Design a Google Play Store app icon, exactly 1024x1024 pixels, square format.

Brand: "SpeakMate AI" — AI-powered communication coaching app.

EXACT CONCEPT (this MUST match the existing brand):
- Central element: A glossy 3D microphone INSIDE a rounded speech bubble (the speech bubble shape forms the body, microphone is the focal point inside it)
- Speech bubble has a small tail/pointer on the bottom-left
- Color of microphone + bubble: vibrant gradient from cyan-blue (#00C2FF) at top through electric blue (#3B82F6) middle to vivid purple (#8B5CF6) at bottom
- Microphone style: rounded modern shape with horizontal grille lines, smooth white highlights, polished glossy 3D finish
- Two small sparkle stars (one teal-cyan, one warm yellow-gold) in the upper-right area near the bubble — these represent "AI"
- Background: pure solid jet black (#000000) — fills entire canvas, NO transparency, NO gradient on background
- NO TEXT anywhere in the icon (no letters, no words, no "SpeakMate AI" label)
- Bubble + mic should occupy ~70% of the canvas, centered with slight upward bias
- Cinematic soft glow around the bubble (subtle blue/purple bloom)
- Premium app store quality, hyperreal 3D, vibrant saturation
- Recognisable instantly at 48x48 thumbnail size

Style reference: similar to top language-learning apps like Duolingo / Elsa Speak but with a darker premium feel. Solid black background, vivid gradient mic-in-bubble, sparkle accents. No text."""


async def main():
    chat = LlmChat(
        api_key=API_KEY,
        session_id="spkmate-icon-v2-brand",
        system_message="You are a top-tier mobile app icon designer.",
    )
    chat.with_model("gemini", MODEL).with_params(modalities=["image", "text"])
    _, images = await chat.send_message_multimodal_response(UserMessage(text=ICON_PROMPT))
    if images:
        out = OUT_DIR / "app-icon-v2-source.png"
        out.write_bytes(base64.b64decode(images[0]["data"]))
        print(f"Saved {out} ({out.stat().st_size} bytes)")
    else:
        print("FAILED")


if __name__ == "__main__":
    asyncio.run(main())
