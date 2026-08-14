#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Regenerate the PLACEHOLDER disc covers (cover_03..42) as tomatoes.

cover_01 (408 screenshot) and cover_02 (open-source screenshot) are REAL note
covers and are left untouched. Every placeholder becomes the SAME tomato shape
with a GREEN calyx of leaves; only the tomato BODY colour varies per cover, so
the 40 discs read as "the same tomato in different colours".

Output: 512x512 JPEG, drawn at 2x then downscaled for crisp edges.
"""
import math
import os

from PIL import Image, ImageDraw

OUT_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "assets", "stilllife")
SRC = 1024  # draw at 2x
DST = 512

# uniform light background — same for every cover so they "look the same"
BG = (243, 240, 232)

# tomato body palette (curated, tomato-like hues). Cycled across 40 covers.
PALETTE = [
    (226, 47, 40),    # red
    (240, 110, 30),   # orange
    (242, 150, 30),   # amber
    (233, 175, 55),   # golden
    (240, 200, 50),   # yellow
    (205, 210, 70),   # yellow-green
    (120, 180, 60),   # green
    (70, 160, 95),    # deep green
    (235, 110, 150),  # pink
    (200, 80, 120),   # rose
    (200, 60, 130),   # magenta
    (150, 75, 180),   # purple
    (110, 75, 160),   # violet
    (175, 55, 70),    # maroon
    (225, 110, 45),   # tangerine
    (235, 140, 95),   # peach
]

# green leaves — identical for all covers
LEAF = (63, 163, 78)
LEAF_DARK = (40, 120, 55)
STEM = (70, 140, 60)


def shade(c, f):
    return tuple(max(0, min(255, int(round(v * f)))) for v in c)


def blob(im, box, color, alpha):
    """Composite an RGBA ellipse onto an RGB image."""
    layer = Image.new("RGBA", im.size, (0, 0, 0, 0))
    ImageDraw.Draw(layer).ellipse(box, fill=color + (alpha,))
    return Image.alpha_composite(im.convert("RGBA"), layer).convert("RGB")


def leaf_polygon(sx, sy, ang_deg, length, width):
    a = math.radians(ang_deg)
    dx, dy = math.sin(a), -math.cos(a)        # growth direction (up = -y)
    px, py = math.cos(a), math.sin(a)         # perpendicular
    tip = (sx + dx * length, sy + dy * length)
    m_l = (sx + dx * length * 0.5 + px * width * 0.5, sy + dy * length * 0.5 + py * width * 0.5)
    b_ll = (sx + dx * length * 0.5 + px * width * 0.78, sy + dy * length * 0.5 + py * width * 0.78)
    b_rr = (sx + dx * length * 0.5 - px * width * 0.78, sy + dy * length * 0.5 - py * width * 0.78)
    m_r = (sx + dx * length * 0.5 - px * width * 0.5, sy + dy * length * 0.5 - py * width * 0.5)
    return [(sx, sy), m_l, b_ll, tip, b_rr, m_r]


def make_tomato(idx):
    body = PALETTE[idx % len(PALETTE)]
    body_light = shade(body, 1.20)
    body_dark = shade(body, 0.78)

    im = Image.new("RGB", (SRC, SRC), BG)
    cx, cy = SRC // 2, 600
    rx, ry = 320, 300

    # ground shadow
    im = blob(im, [cx - 330, cy + 250, cx + 330, cy + 344], (0, 0, 0), 50)

    d = ImageDraw.Draw(im)
    # dark halo rim (slight outline for definition)
    d.ellipse([cx - rx - 6, cy - ry - 6, cx + rx + 6, cy + ry + 6], fill=body_dark)
    # main body
    d.ellipse([cx - rx, cy - ry, cx + rx, cy + ry], fill=body)

    # shading + highlight via alpha blobs
    im = blob(im, [cx - int(rx * 0.7), cy - int(ry * 0.85), cx + int(rx * 0.15), cy - int(ry * 0.1)],
              body_light, 125)
    im = blob(im, [cx - int(rx * 0.6), cy + int(ry * 0.3), cx + int(rx * 0.75), cy + int(ry * 1.08)],
              body_dark, 120)
    # glossy specular
    im = blob(im, [cx - int(rx * 0.58), cy - int(ry * 0.72), cx - int(rx * 0.18), cy - int(ry * 0.34)],
              (255, 255, 255), 95)
    # top dimple where stem attaches
    im = blob(im, [cx - 95, cy - ry - 12, cx + 95, cy - ry + 95], shade(body, 0.66), 115)

    # ---- green calyx (leaves) ----
    sx, sy = cx, cy - int(ry * 0.5)
    angles = [-58, -35, -12, 12, 35, 58]
    for ang in angles:
        poly = leaf_polygon(sx, sy, ang, 255, 122)
        ImageDraw.Draw(im).polygon(poly, fill=LEAF)
        # central vein (slightly darker, thinner)
        vein = leaf_polygon(sx, sy, ang, 250, 34)
        ImageDraw.Draw(im).polygon(vein, fill=LEAF_DARK)
    # stem nub
    ImageDraw.Draw(im).rectangle([cx - 15, sy - 36, cx + 15, sy + 10], fill=STEM)
    ImageDraw.Draw(im).rectangle([cx - 15, sy - 36, cx + 15, sy - 20], fill=shade(STEM, 1.2))

    im = im.resize((DST, DST), Image.LANCZOS)
    out = os.path.join(OUT_DIR, "cover_%02d.jpg" % (idx + 1))
    im.save(out, "JPEG", quality=90)
    return out


def main():
    os.makedirs(OUT_DIR, exist_ok=True)
    outs = []
    for idx in range(2, 42):          # cover_03 .. cover_42 (placeholders only)
        outs.append(make_tomato(idx))
    print("generated %d tomato covers (cover_03..42) -> %s" % (len(outs), OUT_DIR))


if __name__ == "__main__":
    main()
