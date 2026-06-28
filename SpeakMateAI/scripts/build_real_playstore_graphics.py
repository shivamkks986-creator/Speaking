"""
Convert 7 real app screenshots into branded Play Store graphics (1080x1920).
Each output: dark gradient bg + bold headline + the actual app screenshot.
"""
import os
import urllib.request
from PIL import Image, ImageDraw, ImageFont, ImageFilter

OUT_DIR = "/app/SpeakMateAI/playstore-assets/real"
os.makedirs(OUT_DIR, exist_ok=True)

# (filename, url, headline, subtext)
ASSETS = [
    # Verified mapping (analyzed each URL's actual screen content)
    ("01_login.png",
     "https://customer-assets.emergentagent.com/job_gift-hub-sync/artifacts/5fub8ghx_IMG-20260628-WA0003.jpg",
     "Speak English With Confidence",
     "AI Speaking Coach - Daily Practice - Job Ready"),
    ("02_home.png",
     "https://customer-assets.emergentagent.com/job_gift-hub-sync/artifacts/8r4jyhvm_IMG-20260628-WA0001.jpg",
     "Your Personal English Tutor",
     "Streaks - XP - Daily Challenges & Quick Start"),
    ("03_signup.png",
     "https://customer-assets.emergentagent.com/job_gift-hub-sync/artifacts/l305z1dn_IMG-20260628-WA0005.jpg",
     "Start Your Success Journey",
     "Free Sign-up - Google Login - Start in 30 seconds"),
    ("04_tmay.png",
     "https://customer-assets.emergentagent.com/job_gift-hub-sync/artifacts/y4xqwh79_IMG-20260628-WA0002.jpg",
     "Master 'Tell Me About Yourself'",
     "60-second Self-Intro - PPF Framework - Voice Practice"),
    ("05_roadmap.png",
     "https://customer-assets.emergentagent.com/job_gift-hub-sync/artifacts/zfd9d497_IMG-20260628-WA0000.jpg",
     "30-Day Job-Ready Roadmap",
     "AI-Personalised - 15 min/day - Visible Growth"),
    ("06_premium.png",
     "https://customer-assets.emergentagent.com/job_gift-hub-sync/artifacts/ucjbn1dx_IMG-20260628-WA0004.jpg",
     "SpeakMate Premium",
     "Just Rs.99/mo - 7-day Free Trial - Cancel Anytime"),
    ("07_interview.png",
     "https://customer-assets.emergentagent.com/job_gift-hub-sync/artifacts/djxewvwd_IMG-20260628-WA0006.jpg",
     "Crack Any Job Interview",
     "HR - Fresher - Technical - Live Voice Mock"),
]

W, H = 1080, 1920
HEADLINE_AREA_H = 380
PHONE_FRAME_PAD = 30

def gradient_bg(w, h):
    bg = Image.new("RGB", (w, h), "#0F0A1E")
    px = bg.load()
    top = (37, 21, 73)   # deep purple
    bot = (15, 10, 30)   # near black
    for y in range(h):
        t = y / h
        r = int(top[0] * (1-t) + bot[0] * t)
        g = int(top[1] * (1-t) + bot[1] * t)
        b = int(top[2] * (1-t) + bot[2] * t)
        for x in range(w):
            px[x, y] = (r, g, b)
    # Add pink-purple glow blob top-right
    glow = Image.new("RGB", (w, h), "#0F0A1E")
    gd = ImageDraw.Draw(glow)
    gd.ellipse([w*0.55, -200, w+200, h*0.35], fill="#5B2C91")
    glow = glow.filter(ImageFilter.GaussianBlur(120))
    bg = Image.blend(bg, glow, 0.45)
    return bg

def get_font(size, bold=True):
    candidates = [
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf" if bold else "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
        "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf" if bold else "/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf",
    ]
    for c in candidates:
        if os.path.exists(c):
            return ImageFont.truetype(c, size)
    return ImageFont.load_default()

def wrap_text(text, font, max_w, draw):
    words = text.split()
    lines = []
    cur = ""
    for w in words:
        test = (cur + " " + w).strip()
        if draw.textlength(test, font=font) <= max_w:
            cur = test
        else:
            if cur:
                lines.append(cur)
            cur = w
    if cur:
        lines.append(cur)
    return lines

def render(filename, url, headline, subtext):
    print(f"[+] {filename}")
    tmp = f"/tmp/{filename}.src.jpg"
    urllib.request.urlretrieve(url, tmp)
    src = Image.open(tmp).convert("RGB")

    # Crop to phone-screen aspect (assume vertical)
    sw, sh = src.size
    target_ratio = 9 / 19.5
    cur_ratio = sw / sh
    if cur_ratio > target_ratio:
        new_w = int(sh * target_ratio)
        x = (sw - new_w) // 2
        src = src.crop((x, 0, x + new_w, sh))

    canvas = gradient_bg(W, H)
    draw = ImageDraw.Draw(canvas)

    # Headline
    h_font = get_font(74, bold=True)
    s_font = get_font(38, bold=False)
    lines = wrap_text(headline, h_font, W - 100, draw)
    y = 90
    for ln in lines:
        tw = draw.textlength(ln, font=h_font)
        # shadow
        draw.text(((W - tw) // 2 + 3, y + 3), ln, font=h_font, fill="#000000")
        draw.text(((W - tw) // 2, y), ln, font=h_font, fill="#FFFFFF")
        y += 90
    # Subtext
    sub_lines = wrap_text(subtext, s_font, W - 140, draw)
    for ln in sub_lines:
        tw = draw.textlength(ln, font=s_font)
        draw.text(((W - tw) // 2, y + 10), ln, font=s_font, fill="#EC4899")
        y += 50

    # Place phone screenshot below headline
    avail_h = H - HEADLINE_AREA_H - 80
    avail_w = W - 160
    sw, sh = src.size
    scale = min(avail_w / sw, avail_h / sh)
    new_w = int(sw * scale)
    new_h = int(sh * scale)
    src_resized = src.resize((new_w, new_h), Image.LANCZOS)

    # Add rounded corners to phone screenshot
    mask = Image.new("L", (new_w, new_h), 0)
    md = ImageDraw.Draw(mask)
    md.rounded_rectangle((0, 0, new_w, new_h), radius=40, fill=255)

    # Add subtle shadow
    shadow = Image.new("RGBA", (new_w + 60, new_h + 60), (0, 0, 0, 0))
    sd = ImageDraw.Draw(shadow)
    sd.rounded_rectangle((30, 30, new_w + 30, new_h + 30), radius=40, fill=(0, 0, 0, 180))
    shadow = shadow.filter(ImageFilter.GaussianBlur(25))

    phone_x = (W - new_w) // 2
    phone_y = HEADLINE_AREA_H + 20

    canvas_rgba = canvas.convert("RGBA")
    canvas_rgba.paste(shadow, (phone_x - 30, phone_y - 30), shadow)
    canvas_rgba.paste(src_resized, (phone_x, phone_y), mask)

    # Subtle gradient border around phone
    bd = ImageDraw.Draw(canvas_rgba)
    bd.rounded_rectangle(
        (phone_x - 4, phone_y - 4, phone_x + new_w + 4, phone_y + new_h + 4),
        radius=44, outline=(236, 72, 153, 200), width=3
    )

    out = os.path.join(OUT_DIR, filename)
    canvas_rgba.convert("RGB").save(out, "PNG", optimize=True)
    print(f"    -> {out}")
    os.remove(tmp)

if __name__ == "__main__":
    for f, u, h, s in ASSETS:
        try:
            render(f, u, h, s)
        except Exception as e:
            print(f"    !! {f} failed: {e}")
    print(f"\nDone. Output: {OUT_DIR}")
