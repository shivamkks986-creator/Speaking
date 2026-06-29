"""
Redesign SpeakMate AI app icon:
- Crop existing icon (remove "SpeakMateAI" text)
- Remove black background -> transparent
- Scale icon to 80% of canvas (was ~70%)
- Add subtle glow for premium feel
- Output: 1024x1024 transparent PNG
- Also export 512x512 (Play Store icon spec) and 432x432 (adaptive foreground)
"""
import os
from PIL import Image, ImageFilter, ImageChops

SRC = "/app/SpeakMateAI/assets/icon.png"
OUT_DIR = "/app/SpeakMateAI/assets"

# Open source icon
src = Image.open(SRC).convert("RGBA")
W, H = src.size  # 1024x1024
print(f"Source: {W}x{H}")

# Step 1: Crop top portion (icon only, remove text "SpeakMateAI" at bottom)
# Looking at typical layouts, icon + sparkles take top 70-75%, text bottom 25-30%
crop_box = (0, 0, W, int(H * 0.74))
icon_only = src.crop(crop_box)
print(f"Cropped: {icon_only.size}")

# Step 2: Remove black background -> make transparent
# Approach: for every pixel, if it's nearly black, set alpha=0
import numpy as np
arr = np.array(icon_only)  # H, W, 4 (RGBA)
rgb = arr[:, :, :3]
# Distance from pure black
brightness = rgb.mean(axis=2)
# Black bg threshold ~25 (very dark)
bg_mask = brightness < 30
# Set alpha to 0 where background
arr[:, :, 3] = np.where(bg_mask, 0, 255).astype(np.uint8)

# For semi-transparent edges, fade alpha gradually
# Calculate per-pixel alpha based on brightness curve (smooth fade for edges)
edge_brightness = np.clip((brightness - 20) / 30, 0, 1)
alpha_smooth = (edge_brightness * 255).astype(np.uint8)
# Combine: if originally 0 keep 0, else use smooth
arr[:, :, 3] = np.maximum(arr[:, :, 3], alpha_smooth)

# But for non-bg pixels, force full opacity if bright enough
content_mask = brightness > 60
arr[content_mask, 3] = 255

icon_rgba = Image.fromarray(arr, mode="RGBA")

# Step 3: Trim to actual content bounding box
def trim_alpha(img):
    bbox = img.getbbox()
    if bbox:
        return img.crop(bbox)
    return img

icon_rgba = trim_alpha(icon_rgba)
iw, ih = icon_rgba.size
print(f"Trimmed icon: {iw}x{ih}")


def build_icon(canvas_size, content_ratio=0.80, add_glow=True):
    """Place trimmed icon on transparent canvas at given content ratio."""
    canvas = Image.new("RGBA", (canvas_size, canvas_size), (0, 0, 0, 0))
    # Target size for content
    target_max = int(canvas_size * content_ratio)
    # Preserve aspect ratio while fitting target_max
    scale = min(target_max / iw, target_max / ih)
    new_w = int(iw * scale)
    new_h = int(ih * scale)
    scaled = icon_rgba.resize((new_w, new_h), Image.LANCZOS)
    # Center
    x = (canvas_size - new_w) // 2
    y = (canvas_size - new_h) // 2
    if add_glow:
        # Build a glow layer: dilate alpha + blur + tint with brand color
        glow_alpha = scaled.split()[3]
        glow_layer = Image.new("RGBA", scaled.size, (0, 0, 0, 0))
        glow_color = (155, 89, 255)  # purple-blue glow
        for off in [(0, 0)]:
            tint = Image.new("RGBA", scaled.size, glow_color + (220,))
            tint.putalpha(glow_alpha)
            glow_layer = Image.alpha_composite(glow_layer, tint)
        glow_layer = glow_layer.filter(ImageFilter.GaussianBlur(canvas_size // 30))
        # Slightly amplify glow
        glow_pad = canvas_size // 60
        glow_canvas = Image.new("RGBA", (canvas_size, canvas_size), (0, 0, 0, 0))
        glow_canvas.paste(glow_layer, (x - glow_pad, y - glow_pad), glow_layer)
        # Composite glow first, then icon on top
        canvas = Image.alpha_composite(canvas, glow_canvas)
    canvas.paste(scaled, (x, y), scaled)
    return canvas


# Generate variants
outputs = [
    ("icon-1024-transparent.png", 1024, 0.80, True),
    ("icon-512.png",              512,  0.80, True),
    ("adaptive-icon-foreground.png", 1024, 0.66, False),  # Play Store adaptive: content in 66% safe zone
]

for name, size, ratio, glow in outputs:
    img = build_icon(size, ratio, glow)
    out = os.path.join(OUT_DIR, name)
    img.save(out, "PNG", optimize=True)
    print(f"  -> {out} ({os.path.getsize(out) // 1024} KB)")

# Also overwrite icon.png with the new 1024 version (transparent bg)
new_icon = build_icon(1024, 0.80, True)
new_icon.save("/app/SpeakMateAI/assets/icon.png", "PNG", optimize=True)
print("Overwrote: /app/SpeakMateAI/assets/icon.png")

# Build a Play Store ready 512x512 with optional opaque white bg (some stores prefer)
ps_icon = build_icon(512, 0.80, True)
ps_icon.save("/app/SpeakMateAI/playstore-assets/app-icon-512.png", "PNG", optimize=True)
print("Saved: /app/SpeakMateAI/playstore-assets/app-icon-512.png")

print("\nDone.")
