"""
Generate 3 Play Store smartphone screenshots for SpeakMate AI.
Output: /app/SpeakMateAI/playstore-assets/screenshot_{1,2,3}.png
Format: 1080x1920 portrait (Play Store standard)
"""
import asyncio
import os
import base64
import sys
from dotenv import load_dotenv
from emergentintegrations.llm.chat import LlmChat, UserMessage

load_dotenv("/app/backend/.env")
API_KEY = os.getenv("EMERGENT_LLM_KEY")

OUTPUT_DIR = "/app/SpeakMateAI/playstore-assets"
os.makedirs(OUTPUT_DIR, exist_ok=True)

SCREENSHOTS = [
    {
        "name": "screenshot_1_ai_speaking",
        "prompt": (
            "Create a Google Play Store smartphone screenshot graphic, vertical 9:16 portrait, "
            "1080x1920 pixels. Center: a modern smartphone (Android, edge-to-edge display) "
            "showing a mobile app UI for an English learning app called 'SpeakMate AI'. "
            "The phone screen shows: top header with diamond logo and 'SpeakMate AI' brand name. "
            "Below: a circular AI avatar with sound waves animation in PURPLE-PINK GRADIENT, "
            "a microphone button at the bottom in vibrant pink. "
            "Above the phone: bold white headline text 'Practice Speaking with AI Coach' "
            "and smaller subtext 'Get instant feedback on pronunciation, fluency & grammar'. "
            "Background: dark navy-to-purple gradient with subtle glowing particles. "
            "Bottom: 3 small icon badges - microphone, brain, chart. "
            "Style: premium, modern, app-store optimized, conversion-focused. "
            "Brand colors: deep purple #6B46C1, hot pink #EC4899, dark navy #0F0A1E. "
            "Typography: bold sans-serif, very legible at thumbnail size. "
            "No clutter, lots of breathing space."
        ),
    },
    {
        "name": "screenshot_2_resume_interview",
        "prompt": (
            "Create a Google Play Store smartphone screenshot graphic, vertical 9:16 portrait, "
            "1080x1920 pixels. Center: a modern smartphone showing an app UI with: "
            "a resume document icon at top, a purple-pink gradient card saying 'Custom Interview Ready' "
            "with mock interview questions like 'Tell me about your project experience' visible in a chat-bubble UI. "
            "A briefcase icon and a play button visible. "
            "Above the phone: bold white headline 'Ace Your Job Interview' "
            "and subtext 'Upload resume → AI generates personalised interview questions'. "
            "Background: dark navy-to-purple gradient with subtle tech grid pattern. "
            "Bottom: 3 icon badges - resume, briefcase, checkmark. "
            "Style: premium, modern, professional, job-readiness focused. "
            "Brand colors: deep purple #6B46C1, hot pink #EC4899, dark navy #0F0A1E. "
            "Typography: bold sans-serif, large readable text. "
            "Clean layout with focal point on the phone."
        ),
    },
    {
        "name": "screenshot_3_progress_roadmap",
        "prompt": (
            "Create a Google Play Store smartphone screenshot graphic, vertical 9:16 portrait, "
            "1080x1920 pixels. Center: a modern smartphone showing an app UI with: "
            "a 30-day calendar grid where some days are highlighted in pink-purple gradient "
            "(showing a streak), a fluency score progress ring at top showing '78%' in big numbers, "
            "small bar chart showing weekly improvement, a flame emoji indicating streak. "
            "Above the phone: bold white headline 'Track Your 30-Day Progress' "
            "and subtext 'Daily challenges, streaks & visual growth metrics'. "
            "Background: dark navy-to-purple gradient with subtle confetti-like sparkles. "
            "Bottom: 3 icon badges - calendar, chart, trophy. "
            "Style: motivational, gamified, premium, sticky. "
            "Brand colors: deep purple #6B46C1, hot pink #EC4899, dark navy #0F0A1E, accent gold #F59E0B. "
            "Typography: bold sans-serif. "
            "Layout: phone centered, headline at top, badges at bottom — Play Store screenshot template."
        ),
    },
]


async def generate_one(screenshot):
    name = screenshot["name"]
    prompt = screenshot["prompt"]
    print(f"\n[+] Generating: {name}")
    chat = LlmChat(
        api_key=API_KEY,
        session_id=f"speakmate-{name}",
        system_message="You are a senior mobile-app marketing designer creating Play Store screenshots.",
    )
    chat.with_model("gemini", "gemini-3.1-flash-image-preview").with_params(
        modalities=["image", "text"]
    )
    msg = UserMessage(text=prompt)
    try:
        text, images = await chat.send_message_multimodal_response(msg)
        if not images:
            print(f"  [!] No image returned for {name}. Text response: {text[:200] if text else 'empty'}")
            return False
        img = images[0]
        image_bytes = base64.b64decode(img["data"])
        out_path = os.path.join(OUTPUT_DIR, f"{name}.png")
        with open(out_path, "wb") as f:
            f.write(image_bytes)
        print(f"  [✓] Saved: {out_path} ({len(image_bytes) // 1024} KB)")
        return True
    except Exception as e:
        print(f"  [✗] Error generating {name}: {e}")
        return False


async def main():
    print("=" * 60)
    print("SpeakMate AI — Play Store Screenshot Generator")
    print("=" * 60)
    results = []
    for s in SCREENSHOTS:
        ok = await generate_one(s)
        results.append(ok)
    print("\n" + "=" * 60)
    print(f"Done. {sum(results)}/{len(results)} successful.")
    print(f"Output folder: {OUTPUT_DIR}")
    print("=" * 60)


if __name__ == "__main__":
    asyncio.run(main())
