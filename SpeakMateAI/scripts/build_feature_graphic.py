"""
Generate Play Store Feature Graphic (1024x500 — EXACT required size).
Composition: brand logo + tagline (left) + 3 phone mockups arranged at angle (right).
"""
import os
import urllib.request
from PIL import Image, ImageDraw, ImageFont, ImageFilter

OUT = "/app/SpeakMateAI/playstore-assets/feature-graphic.png"
W, H = 1024, 500

# Pick 3 hero screenshots
PHONES = [
    "https://customer-assets.emergentagent.com/job_gift-hub-sync/artifacts/5fub8ghx_IMG-20260628-WA0003.jpg",  # Login
    "https://customer-assets.emergentagent.com/job_gift-hub-sync/artifacts/8r4jyhvm_IMG-20260628-WA0001.jpg",  # Home
    "https://customer-assets.emergentagent.com/job_gift-hub-sync/artifacts/djxewvwd_IMG-20260628-WA0006.jpg",  # Interview
]


def get_font(size, bold=True):
    p = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf" if bold else "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"
    return ImageFont.truetype(p, size)


def gradient_bg():
    bg = Image.new("RGB", (W, H), "#0F0A1E")
    px = bg.load()
    # Diagonal gradient: deep purple top-left -> hot pink bottom-right
    c1 = (37, 21, 73)   # deep purple
    c2 = (88, 28, 135)  # mid purple
    c3 = (190, 24, 93)  # rose
    for y in range(H):
        for x in range(W):
            t = (x / W + y / H) / 2
            if t < 0.5:
                k = t * 2
                r = int(c1[0] * (1-k) + c2[0] * k)
                g = int(c1[1] * (1-k) + c2[1] * k)
                b = int(c1[2] * (1-k) + c2[2] * k)
            else:
                k = (t - 0.5) * 2
                r = int(c2[0] * (1-k) + c3[0] * k)
                g = int(c2[1] * (1-k) + c3[1] * k)
                b = int(c2[2] * (1-k) + c3[2] * k)
            px[x, y] = (r, g, b)
    # Add glow blobs
    overlay = Image.new("RGB", (W, H), "#0F0A1E")
    od = ImageDraw.Draw(overlay)
    od.ellipse([-100, -200, 400, 300], fill="#7C3AED")
    od.ellipse([700, 250, 1200, 700], fill="#EC4899")
    overlay = overlay.filter(ImageFilter.GaussianBlur(80))
    return Image.blend(bg, overlay, 0.35)


def load_phone(url, target_h=420):
    tmp = f"/tmp/feature_phone_{hash(url) & 0xffff}.jpg"
    urllib.request.urlretrieve(url, tmp)
    img = Image.open(tmp).convert("RGB")
    # Crop to 9:19.5 portrait
    sw, sh = img.size
    target_ratio = 9 / 19.5
    cur = sw / sh
    if cur > target_ratio:
        nw = int(sh * target_ratio)
        x = (sw - nw) // 2
        img = img.crop((x, 0, x + nw, sh))
    # Scale to target height
    sw, sh = img.size
    scale = target_h / sh
    img = img.resize((int(sw * scale), target_h), Image.LANCZOS)
    return img


def rounded(img, radius=18):
    w, h = img.size
    mask = Image.new("L", (w, h), 0)
    ImageDraw.Draw(mask).rounded_rectangle((0, 0, w, h), radius=radius, fill=255)
    out = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    out.paste(img, (0, 0), mask)
    return out


def add_shadow(phone_rgba, shadow_offset=8, blur=14, opacity=180):
    w, h = phone_rgba.size
    pad = blur * 2
    sh = Image.new("RGBA", (w + pad, h + pad), (0, 0, 0, 0))
    silhouette = Image.new("RGBA", (w, h), (0, 0, 0, opacity))
    silhouette.putalpha(Image.eval(phone_rgba.split()[3], lambda a: opacity if a > 0 else 0))
    sh.paste(silhouette, (pad // 2 + shadow_offset, pad // 2 + shadow_offset), silhouette)
    return sh.filter(ImageFilter.GaussianBlur(blur))


def main():
    canvas = gradient_bg().convert("RGBA")
    draw = ImageDraw.Draw(canvas)

    # ===== LEFT SIDE: branding text =====
    # Small brand tag
    tag_font = get_font(22, bold=True)
    draw.text((54, 70), "SPEAKMATE AI", font=tag_font, fill=(236, 72, 153, 255))

    # Main headline
    h_font = get_font(52, bold=True)
    h2_font = get_font(52, bold=True)
    draw.text((54, 110), "Speak Better.", font=h_font, fill="#FFFFFF")
    draw.text((54, 170), "Get Hired Faster.", font=h2_font, fill="#FFFFFF")

    # Sub-line
    sub_font = get_font(22, bold=False)
    draw.text((54, 248), "AI English Coach + Interview Practice", font=sub_font, fill=(255, 255, 255, 230))
    draw.text((54, 278), "30-Day Roadmap to Job-Ready Communication", font=sub_font, fill=(255, 255, 255, 200))

    # CTA pill button
    cta_x, cta_y = 54, 340
    cta_w, cta_h = 240, 56
    btn = Image.new("RGBA", (cta_w, cta_h), (0, 0, 0, 0))
    bd = ImageDraw.Draw(btn)
    # Pink gradient pill
    for i in range(cta_w):
        t = i / cta_w
        r = int(167 * (1-t) + 236 * t)
        g = int(70 * (1-t) + 72 * t)
        b = int(229 * (1-t) + 153 * t)
        bd.line([(i, 0), (i, cta_h)], fill=(r, g, b, 255))
    btn_mask = Image.new("L", (cta_w, cta_h), 0)
    ImageDraw.Draw(btn_mask).rounded_rectangle((0, 0, cta_w, cta_h), radius=cta_h // 2, fill=255)
    canvas.paste(btn, (cta_x, cta_y), btn_mask)
    cta_font = get_font(22, bold=True)
    txt = "INSTALL FREE"
    tw = draw.textlength(txt, font=cta_font)
    draw.text((cta_x + (cta_w - tw) // 2, cta_y + 16), txt, font=cta_font, fill="#FFFFFF")

    # Tiny rating badge
    star_font = get_font(20, bold=True)
    draw.text((310, cta_y + 18), "★ 4.8  |  50K+ Convos", font=star_font, fill=(255, 215, 0, 240))

    # ===== RIGHT SIDE: 3 angled phone screenshots =====
    phones = [load_phone(u, target_h=380) for u in PHONES]
    # Positions: phone 1 (back-left, rotated -8deg), phone 2 (center, no rotate), phone 3 (back-right, rotated +8deg)
    rotations = [-10, 0, 10]
    base_x = 660   # right portion starts here
    base_y = 60
    offsets = [(-40, 30), (50, 0), (140, 30)]

    for i, (phone, rot, (dx, dy)) in enumerate(zip(phones, rotations, offsets)):
        rounded_phone = rounded(phone, radius=22)
        # Add pink border
        bordered = Image.new("RGBA", rounded_phone.size, (0, 0, 0, 0))
        bd = ImageDraw.Draw(bordered)
        bd.rounded_rectangle((0, 0, phone.width, phone.height), radius=22, outline=(236, 72, 153, 230), width=3)
        rounded_phone.paste(bordered, (0, 0), bordered)
        # Rotate
        rotated = rounded_phone.rotate(rot, expand=True, resample=Image.BICUBIC)
        # Add shadow
        shadow = add_shadow(rotated)
        x = base_x + dx
        y = base_y + dy
        canvas.paste(shadow, (x - 14, y - 14), shadow)
        canvas.paste(rotated, (x, y), rotated)

    canvas.convert("RGB").save(OUT, "PNG", optimize=True)
    print(f"Saved: {OUT}")
    print(f"Size: {os.path.getsize(OUT) // 1024} KB")


if __name__ == "__main__":
    main()
