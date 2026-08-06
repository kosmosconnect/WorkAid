"""
Generates the placeholder photography used across the WORKAID site.

Every file it writes is a drop-in slot: replace assets/img/<name>.jpg with a real
photo of the same aspect ratio and nothing in the HTML/CSS needs to change.

Run:  python tools/make_placeholders.py
"""

import math
import os
import random

from PIL import Image, ImageDraw, ImageFilter, ImageFont

OUT = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "assets", "img")

# Deliberately saturated palettes so the grayscale -> colour hover effect is obvious.
PALETTES = [
    ((28, 32, 46), (196, 84, 30), (252, 203, 38)),    # sparks / welding
    ((18, 34, 40), (24, 122, 126), (238, 226, 196)),  # cool interior
    ((40, 26, 22), (168, 92, 52), (240, 214, 168)),   # warm timber
    ((22, 26, 38), (66, 88, 150), (198, 214, 240)),   # commercial glass
    ((30, 34, 26), (96, 122, 58), (216, 228, 176)),   # landscape / civil
    ((36, 22, 32), (140, 62, 108), (236, 200, 224)),  # hospitality
    ((20, 30, 34), (44, 108, 96), (206, 232, 218)),   # healthcare
    ((34, 30, 20), (176, 138, 44), (250, 234, 170)),  # brand yellow
]


def font(size):
    for name in ("segoeuib.ttf", "arialbd.ttf", "DejaVuSans-Bold.ttf"):
        try:
            return ImageFont.truetype(name, size)
        except OSError:
            continue
    return ImageFont.load_default()


def gradient(size, top, bottom):
    w, h = size
    base = Image.new("RGB", (1, h))
    px = base.load()
    for y in range(h):
        t = y / max(h - 1, 1)
        px[0, y] = tuple(int(top[i] + (bottom[i] - top[i]) * t) for i in range(3))
    return base.resize((w, h), Image.BILINEAR)


def make(name, size, label, seed, palette=None):
    rnd = random.Random(seed)
    dark, mid, light = palette or PALETTES[seed % len(PALETTES)]
    w, h = size

    img = gradient(size, dark, tuple(int(c * 0.55 + m * 0.45) for c, m in zip(dark, mid)))
    draw = ImageDraw.Draw(img, "RGBA")

    # Architectural diagonals — reads as structure/scaffolding behind the subject.
    for i in range(14):
        x = rnd.randint(-h, w)
        width = rnd.randint(2, 26)
        alpha = rnd.randint(10, 46)
        draw.polygon(
            [(x, h), (x + width, h), (x + width + h, 0), (x + h, 0)],
            fill=(light[0], light[1], light[2], alpha),
        )

    # Soft light pools.
    glow = Image.new("RGB", size, (0, 0, 0))
    gd = ImageDraw.Draw(glow)
    for i in range(3):
        cx, cy = rnd.randint(0, w), rnd.randint(0, h)
        r = rnd.randint(int(min(w, h) * 0.25), int(min(w, h) * 0.7))
        colour = mid if i % 2 == 0 else light
        gd.ellipse([cx - r, cy - r, cx + r, cy + r], fill=tuple(int(c * 0.8) for c in colour))
    glow = glow.filter(ImageFilter.GaussianBlur(min(w, h) // 6))
    img = Image.blend(img, glow, 0.45)

    draw = ImageDraw.Draw(img, "RGBA")

    # Accent bar + horizon line, keeps the composition from feeling like pure noise.
    draw.rectangle([0, int(h * 0.72), w, int(h * 0.72) + max(2, h // 300)], fill=(252, 203, 38, 140))
    for i in range(6):
        r = int(min(w, h) * (0.18 + i * 0.11))
        cx, cy = int(w * 0.72), int(h * 0.34)
        draw.ellipse([cx - r, cy - r, cx + r, cy + r], outline=(252, 234, 80, 26), width=max(1, h // 400))

    # Vignette so overlaid white text always has contrast.
    vign = Image.new("L", size, 0)
    ImageDraw.Draw(vign).ellipse(
        [-w * 0.25, -h * 0.35, w * 1.25, h * 1.35], fill=255
    )
    vign = vign.filter(ImageFilter.GaussianBlur(min(w, h) // 5))
    img = Image.composite(img, Image.new("RGB", size, (12, 12, 12)), vign)

    # Label — makes it unmistakable that this is a placeholder awaiting real photography.
    draw = ImageDraw.Draw(img, "RGBA")
    f = font(max(15, int(min(w, h) * 0.062)))
    fs = font(max(11, int(min(w, h) * 0.032)))
    tw = draw.textlength(label.upper(), font=f)
    x, y = int(w * 0.5 - tw / 2), int(h * 0.44)
    draw.text((x, y), label.upper(), font=f, fill=(255, 255, 255, 232))
    draw.rectangle([x, y - int(h * 0.03), x + 54, y - int(h * 0.03) + 5], fill=(252, 203, 38, 255))
    sub = "WORKAID  ·  PLACEHOLDER"
    sw = draw.textlength(sub, font=fs)
    draw.text((int(w * 0.5 - sw / 2), y + int(min(w, h) * 0.085)), sub, font=fs, fill=(255, 255, 255, 120))

    img.save(os.path.join(OUT, name + ".jpg"), quality=86, optimize=True)
    print("wrote", name + ".jpg", size)


IMAGES = [
    # name, size, label
    ("hero", (1600, 1000), "Precision at work"),
    ("about-hero", (1400, 900), "Our team on site"),
    ("about-story", (1000, 800), "Since 2010"),
    ("why-choose", (1000, 800), "Delivered on time"),
    ("testimonial", (900, 700), "Handover day"),
    ("cta-texture", (1600, 500), "Let's build"),
    ("contact-office", (1000, 700), "Bhubaneswar office"),
    # Industries
    ("industry-residential", (700, 900), "Residential"),
    ("industry-commercial", (700, 900), "Commercial"),
    ("industry-industrial", (700, 900), "Industrial"),
    ("industry-hospitality", (700, 900), "Hospitality"),
    ("industry-healthcare", (700, 900), "Healthcare"),
    ("industry-retail", (700, 900), "Retail"),
    # Projects / case studies
    ("project-1", (900, 700), "Luxury villa"),
    ("project-2", (900, 700), "Corporate office"),
    ("project-3", (900, 700), "Fine dine"),
    ("project-4", (900, 700), "Industrial plant"),
    ("project-5", (900, 700), "Terrace waterproofing"),
    ("project-6", (900, 700), "MSME onboarding"),
    ("project-7", (900, 700), "Retail fit-out"),
    ("project-8", (900, 700), "Facility upkeep"),
    # Learning resources
    ("resource-1", (900, 600), "Waterproofing guide"),
    ("resource-2", (900, 600), "MSME checklist"),
    ("resource-3", (900, 600), "Seepage diagnosis"),
    ("resource-4", (900, 600), "Interior handbook"),
    ("resource-5", (900, 600), "Process mapping"),
    ("resource-6", (900, 600), "AMC explained"),
    # Services
    ("service-home", (1000, 700), "Home & residence"),
    ("service-industry", (1000, 700), "Industry"),
]

if __name__ == "__main__":
    os.makedirs(OUT, exist_ok=True)
    for i, (name, size, label) in enumerate(IMAGES):
        make(name, size, label, seed=i * 7 + 3)
