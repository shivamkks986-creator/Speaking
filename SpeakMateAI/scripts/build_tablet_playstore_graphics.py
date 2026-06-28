"""
Generate same 7 Play Store graphics at TABLET sizes:
- 7-inch:  1200x1920 portrait
- 10-inch: 1600x2560 portrait
Reuses the same headlines + real app screenshots but bigger canvas.
"""
import os
import urllib.request
from PIL import Image, ImageDraw, ImageFont, ImageFilter

ASSETS = [
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

VARIANTS = [
    ("tablet7",  1200, 1920, 110, 54, 480),
    ("tablet10", 1600, 2560, 150, 72, 640),
]


def gradient_bg(w, h):
    bg = Image.new("RGB", (w, h), "#0F0A1E")
    px = bg.load()
    top = (37, 21, 73)
    bot = (15, 10, 30)
    for y in range(h):
        t = y / h
        r = int(top[0] * (1 - t) + bot[0] * t)
        g = int(top[1] * (1 - t) + bot[1] * t)
        b = int(top[2] * (1 - t) + bot[2] * t)
        for x in range(w):
            px[x, y] = (r, g, b)
    glow = Image.new("RGB", (w, h), "#0F0A1E")
    gd = ImageDraw.Draw(glow)
    gd.ellipse([w * 0.55, -200, w + 200, h * 0.35], fill="#5B2C91")
    glow = glow.filter(ImageFilter.GaussianBlur(150))
    return Image.blend(bg, glow, 0.45)


def get_font(size, bold=True):
    p = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf" if bold else "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"
    if os.path.exists(p):
        return ImageFont.truetype(p, size)
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


def render(filename, url, headline, subtext, W, H, h_size, s_size, head_area, out_dir):
    tmp = f"/tmp/tablet_{filename}.src.jpg"
    if not os.path.exists(tmp):
        urllib.request.urlretrieve(url, tmp)
    src = Image.open(tmp).convert("RGB")

    sw, sh = src.size
    target_ratio = 9 / 19.5
    cur_ratio = sw / sh
    if cur_ratio > target_ratio:
        new_w = int(sh * target_ratio)
        x = (sw - new_w) // 2
        src = src.crop((x, 0, x + new_w, sh))

    canvas = gradient_bg(W, H)
    draw = ImageDraw.Draw(canvas)

    h_font = get_font(h_size, bold=True)
    s_font = get_font(s_size, bold=False)
    lines = wrap_text(headline, h_font, W - 140, draw)
    y = int(H * 0.05)
    line_h = int(h_size * 1.2)
    for ln in lines:
        tw = draw.textlength(ln, font=h_font)
        draw.text(((W - tw) // 2 + 3, y + 3), ln, font=h_font, fill="#000000")
        draw.text(((W - tw) // 2, y), ln, font=h_font, fill="#FFFFFF")
        y += line_h
    sub_lines = wrap_text(subtext, s_font, W - 180, draw)
    for ln in sub_lines:
        tw = draw.textlength(ln, font=s_font)
        draw.text(((W - tw) // 2, y + 12), ln, font=s_font, fill="#EC4899")
        y += int(s_size * 1.4)

    avail_h = H - head_area - int(H * 0.08)
    avail_w = W - int(W * 0.2)
    sw, sh = src.size
    scale = min(avail_w / sw, avail_h / sh)
    new_w = int(sw * scale)
    new_h = int(sh * scale)
    src_resized = src.resize((new_w, new_h), Image.LANCZOS)

    radius = max(40, int(new_w * 0.06))
    mask = Image.new("L", (new_w, new_h), 0)
    md = ImageDraw.Draw(mask)
    md.rounded_rectangle((0, 0, new_w, new_h), radius=radius, fill=255)

    shadow = Image.new("RGBA", (new_w + 80, new_h + 80), (0, 0, 0, 0))
    sd = ImageDraw.Draw(shadow)
    sd.rounded_rectangle((40, 40, new_w + 40, new_h + 40), radius=radius, fill=(0, 0, 0, 180))
    shadow = shadow.filter(ImageFilter.GaussianBlur(35))

    phone_x = (W - new_w) // 2
    phone_y = head_area + int(H * 0.015)

    canvas_rgba = canvas.convert("RGBA")
    canvas_rgba.paste(shadow, (phone_x - 40, phone_y - 40), shadow)
    canvas_rgba.paste(src_resized, (phone_x, phone_y), mask)

    bd = ImageDraw.Draw(canvas_rgba)
    bd.rounded_rectangle(
        (phone_x - 5, phone_y - 5, phone_x + new_w + 5, phone_y + new_h + 5),
        radius=radius + 4, outline=(236, 72, 153, 220), width=4
    )

    out = os.path.join(out_dir, filename)
    canvas_rgba.convert("RGB").save(out, "PNG", optimize=True)
    print(f"  [{W}x{H}] -> {out}")


if __name__ == "__main__":
    for tag, W, H, h_size, s_size, head_area in VARIANTS:
        out_dir = f"/app/SpeakMateAI/playstore-assets/{tag}"
        os.makedirs(out_dir, exist_ok=True)
        print(f"\n=== {tag.upper()} ({W}x{H}) ===")
        for f, u, h, s in ASSETS:
            try:
                render(f, u, h, s, W, H, h_size, s_size, head_area, out_dir)
            except Exception as e:
                print(f"  !! {f}: {e}")
    print("\nDone.")
