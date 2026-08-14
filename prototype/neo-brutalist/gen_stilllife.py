#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Generate a pool of distinct, BRIGHT text-free still-life magazine covers.

Each cover is a 512x512 square JPEG with a bold duotone background, a large
color motif, and a simple still-life composition. NO masthead / issue line /
footer / caption text is rendered, so the discs stay clean when used as menu
items. 42 covers are produced — one per InfiniteMenu disc instance.
"""
import math
import os
import random

from PIL import Image, ImageDraw, ImageFilter

OUT_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "assets", "stilllife")
COUNT = 42
SRC = 1024  # draw at 2x then downscale for crisp edges
DST = 512


def rnd(a, b):
    return random.uniform(a, b)


def hsl_to_rgb(h, s, l):
    h = h % 360.0
    c = (1 - abs(2 * l - 1)) * s
    x = c * (1 - abs((h / 60.0) % 2 - 1))
    m = l - c / 2.0
    if h < 60:
        r, g, b = c, x, 0
    elif h < 120:
        r, g, b = x, c, 0
    elif h < 180:
        r, g, b = 0, c, x
    elif h < 240:
        r, g, b = 0, x, c
    elif h < 300:
        r, g, b = x, 0, c
    else:
        r, g, b = c, 0, x
    return tuple(int(round((v + m) * 255)) for v, m in zip((r, g, b), (m, m, m)))


def shade(c, f):
    return tuple(max(0, min(255, int(round(v * f)))) for v in c)


def lerp(c1, c2, t):
    return tuple(int(round(c1[i] + (c2[i] - c1[i]) * t)) for i in range(3))


def soft_shadow(d, cx, cy, rx, ry, color):
    d.ellipse([cx - rx, cy - ry, cx + rx, cy + ry], fill=color)


# ---- composition generators (draw on 1024 canvas, center region) ----------
def vase_branch(d, cx, cy, col, acc, dark):
    soft_shadow(d, cx, cy + 250, 230, 46, dark)
    w_top, w_bot = 150, 210
    top, bot = cy - 40, cy + 250
    d.polygon([(cx - w_top, top), (cx + w_top, top), (cx + w_bot, bot), (cx - w_bot, bot)], fill=col)
    d.rectangle([cx - 60, top - 70, cx + 60, top + 10], fill=col)
    d.polygon([(cx - w_top + 30, top + 10), (cx - w_bot + 50, bot - 20),
               (cx - w_bot + 110, bot - 20), (cx - w_top + 90, top + 10)], fill=shade(col, 1.18))
    bx, by = cx, top - 70
    for i in range(7):
        ang = math.radians(-90 + (i - 3) * 16)
        ex = bx + math.cos(ang) * (260 - i * 14)
        ey = by + math.sin(ang) * (260 - i * 14) * -1 - i * 4
        d.line([bx, by, ex, ey], fill=acc, width=12)
        lr = rnd(30, 44)
        d.ellipse([ex - lr, ey - lr, ex + lr, ey + lr], fill=shade(col, 1.25) if i % 2 else acc)
        d.ellipse([ex - lr * 0.5, ey - lr * 0.5, ex + lr * 0.5, ey + lr * 0.5], fill=shade(acc, 1.4))


def fruit_bowl(d, cx, cy, col, acc, dark):
    soft_shadow(d, cx, cy + 230, 260, 50, dark)
    bw = 300
    d.ellipse([cx - bw, cy - 40, cx + bw, cy + 230], fill=col)
    d.rectangle([cx - bw, cy + 20, cx + bw, cy + 95], fill=col)
    d.ellipse([cx - bw, cy - 10, cx + bw, cy + 120], fill=shade(col, 1.15))
    fruit_cols = [acc, shade(col, 1.3), shade(acc, 0.85), shade(acc, 1.2)]
    spots = [(-150, -10), (0, -60), (150, -10), (-70, -70), (80, -55)]
    for i, (ox, oy) in enumerate(spots):
        fr = rnd(72, 96)
        fx, fy = cx + ox, cy + oy
        fc = fruit_cols[i % len(fruit_cols)]
        d.ellipse([fx - fr, fy - fr, fx + fr, fy + fr], fill=fc)
        d.ellipse([fx - fr * 0.35, fy - fr * 0.45, fx + fr * 0.1, fy - fr * 0.05], fill=shade(fc, 1.35))


def bottle_glass(d, cx, cy, col, acc, dark):
    soft_shadow(d, cx, cy + 250, 240, 46, dark)
    bx = cx - 120
    d.rectangle([bx - 55, cy - 180, bx + 55, cy + 200], fill=col)
    d.rectangle([bx - 22, cy - 280, bx + 22, cy - 180], fill=col)
    d.ellipse([bx - 55, cy + 150, bx + 55, cy + 250], fill=shade(col, 0.85))
    gx = cx + 130
    d.polygon([(gx - 70, cy - 30), (gx + 70, cy - 30), (gx + 48, cy + 180), (gx - 48, cy + 180)],
              fill=shade(acc, 1.2))
    d.ellipse([gx - 70, cy - 40, gx + 70, cy + 30], fill=shade(acc, 1.5))
    d.ellipse([cx + 250, cy + 120, cx + 340, cy + 210], fill=acc)


def book_cup(d, cx, cy, col, acc, dark):
    soft_shadow(d, cx, cy + 250, 300, 46, dark)
    by, bw = cy + 200, 360
    for i in range(3):
        bh = 58
        bcol = [col, shade(col, 1.2), acc][i % 3]
        off = (i % 2) * 30 - 15
        d.rectangle([cx - bw // 2 + off, by - i * 62, cx + bw // 2 + off, by - i * 62 + bh], fill=bcol)
        d.rectangle([cx - bw // 2 + off, by - i * 62, cx - bw // 2 + off + 16, by - i * 62 + bh], fill=shade(bcol, 0.7))
    ux, uy = cx, cy - 60
    d.polygon([(ux - 90, uy), (ux + 90, uy), (ux + 64, uy + 150), (ux - 64, uy + 150)], fill=shade(acc, 1.15))
    d.ellipse([ux - 90, uy - 26, ux + 90, uy + 40], fill=shade(acc, 1.4))
    for s in range(3):
        sx = ux - 40 + s * 40
        d.line([(sx, uy - 40), (sx + 20, uy - 110), (sx - 10, uy - 180)], fill=shade(acc, 1.5), width=8)


def cup_saucer(d, cx, cy, col, acc, dark):
    soft_shadow(d, cx, cy + 200, 250, 40, dark)
    d.ellipse([cx - 240, cy + 120, cx + 240, cy + 230], fill=shade(col, 0.9))
    d.ellipse([cx - 160, cy + 130, cx + 160, cy + 210], fill=shade(col, 1.1))
    d.polygon([(cx - 120, cy - 40), (cx + 120, cy - 40), (cx + 92, cy + 150), (cx - 92, cy + 150)], fill=col)
    d.ellipse([cx - 120, cy - 70, cx + 120, cy + 20], fill=shade(col, 1.2))
    d.ellipse([cx - 95, cy - 55, cx + 95, cy + 5], fill=shade(col, 0.7))
    d.line([(cx + 150, cy - 90), (cx + 200, cy + 80)], fill=acc, width=14)


def single_fruit(d, cx, cy, col, acc, dark):
    soft_shadow(d, cx, cy + 220, 220, 44, dark)
    r = 240
    d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=col)
    d.ellipse([cx - r * 0.5, cy - r * 0.55, cx + r * 0.1, cy - r * 0.15], fill=shade(col, 1.32))
    s = 120
    d.rectangle([cx + 150, cy + 60, cx + 150 + s, cy + 60 + s], fill=acc)
    d.rectangle([cx + 150, cy + 60, cx + 150 + s, cy + 60 + 24], fill=shade(acc, 1.2))


def flowers(d, cx, cy, col, acc, dark):
    soft_shadow(d, cx, cy + 240, 210, 44, dark)
    d.polygon([(cx - 130, cy - 20), (cx + 130, cy - 20), (cx + 95, cy + 240), (cx - 95, cy + 240)], fill=col)
    d.ellipse([cx - 130, cy - 40, cx + 130, cy + 40], fill=shade(col, 1.1))
    for i in range(5):
        ang = math.radians(-90 + (i - 2) * 22)
        ex = cx + math.cos(ang) * 250
        ey = cy - 20 + math.sin(ang) * 250
        d.line([(cx, cy), (ex, ey)], fill=shade(col, 0.75), width=12)
        br = rnd(48, 66)
        petal_col = [acc, shade(acc, 1.3), shade(col, 1.3)][i % 3]
        for p in range(6):
            pa = math.radians(p * 60)
            px = ex + math.cos(pa) * br
            py = ey + math.sin(pa) * br
            d.ellipse([px - br * 0.5, py - br * 0.5, px + br * 0.5, py + br * 0.5], fill=petal_col)
        d.ellipse([ex - br * 0.4, ey - br * 0.4, ex + br * 0.4, ey + br * 0.4], fill=shade(petal_col, 1.35))


def study_desk(d, cx, cy, col, acc, dark):
    """第 1 张封面：408 / 学习主题，无文字。"""
    # desk surface shadow
    soft_shadow(d, cx, cy + 300, 380, 60, dark)
    # laptop base
    d.rectangle([cx - 220, cy + 60, cx + 220, cy + 180], fill=col)
    d.rectangle([cx - 230, cy + 180, cx + 230, cy + 200], fill=shade(col, 0.8))
    # screen
    d.rectangle([cx - 190, cy - 160, cx + 190, cy + 60], fill=shade(col, 1.25))
    # screen glow / code bars
    bar_col = shade(acc, 1.3)
    for i in range(6):
        y = cy - 140 + i * 32
        w = 300 - i * 18 + rnd(-10, 10)
        d.rectangle([cx - 160, y, cx - 160 + w, y + 18], fill=bar_col)
    # small cursor dot
    d.ellipse([cx + 120, cy + 20, cx + 140, cy + 40], fill=acc)
    # book stack to the left
    bx, by = cx - 320, cy + 80
    for i in range(3):
        bw = 160 - i * 8
        bh = 46
        bcol = [acc, shade(acc, 1.25), shade(col, 1.1)][i % 3]
        d.rectangle([bx - bw // 2, by - i * 55, bx + bw // 2, by - i * 55 + bh], fill=bcol)
        d.rectangle([bx - bw // 2, by - i * 55, bx - bw // 2 + 16, by - i * 55 + bh], fill=shade(bcol, 0.72))
    # coffee cup to the right
    ux, uy = cx + 310, cy + 70
    d.polygon([(ux - 55, uy), (ux + 55, uy), (ux + 40, uy + 110), (ux - 40, uy + 110)], fill=acc)
    d.ellipse([ux - 55, uy - 18, ux + 55, uy + 24], fill=shade(acc, 1.3))
    d.ellipse([ux - 42, uy - 8, ux + 42, uy + 12], fill=shade(acc, 0.7))
    # small potted plant behind laptop
    px, py = cx + 170, cy - 220
    d.rectangle([px - 40, py, px + 40, py + 100], fill=col)
    d.ellipse([px - 50, py - 20, px + 50, py + 30], fill=shade(acc, 0.85))
    for i in range(5):
        ang = math.radians(-90 + (i - 2) * 24)
        lx = px + math.cos(ang) * 80
        ly = py - 20 + math.sin(ang) * 80
        d.line([(px, py - 20), (lx, ly)], fill=shade(acc, 1.2), width=10)
        d.ellipse([lx - 22, ly - 22, lx + 22, ly + 22], fill=shade(col, 1.15) if i % 2 else acc)


COMPOSERS = [vase_branch, fruit_bowl, bottle_glass, book_cup, cup_saucer, single_fruit, flowers]


def make_cover(idx):
    random.seed(7000 + idx)

    # first cover: cool study/408 palette, otherwise spread hues
    if idx == 0:
        hue = 195  # cyan-teal
    else:
        hue = (idx * 360.0 / COUNT + 12) % 360.0

    bg = hsl_to_rgb(hue, 0.66, 0.52)
    bg2 = hsl_to_rgb((hue + 28) % 360, 0.72, 0.40)
    accent = hsl_to_rgb((hue + 150) % 360, 0.88, 0.60)
    obj = hsl_to_rgb((hue + 180) % 360, 0.80, 0.50)
    obj2 = hsl_to_rgb((hue + 200) % 360, 0.82, 0.42)
    dark = hsl_to_rgb(hue, 0.45, 0.16)

    im = Image.new("RGB", (SRC, SRC), bg)
    d = ImageDraw.Draw(im)

    # diagonal split background
    d.polygon([(0, 0), (SRC, 0), (SRC, SRC), (0, 0)], fill=bg)
    d.polygon([(SRC, 0), (SRC, SRC), (0, SRC)], fill=bg2)

    # large accent circles (visual balance where masthead used to be)
    d.ellipse([SRC // 2 - 380, 280, SRC // 2 + 380, 280 + 760], fill=accent)
    d.ellipse([SRC // 2 - 280, 400, SRC // 2 + 280, 400 + 560], fill=shade(accent, 1.12))

    # decorative top color bands (no text)
    d.rectangle([0, 0, SRC, 80], fill=shade(bg, 1.08))
    d.rectangle([0, 82, SRC, 95], fill=shade(bg, 0.92))

    # still-life composition, centered higher now that text is gone
    if idx == 0:
        study_desk(d, SRC // 2, 500, obj, obj2, dark)
    else:
        composer = COMPOSERS[(idx - 1) % len(COMPOSERS)]
        composer(d, SRC // 2, 500, obj, obj2, dark)

    # bottom colour band (footer area, no text)
    d.rectangle([0, SRC - 90, SRC, SRC], fill=shade(bg2, 0.95))

    im = im.filter(ImageFilter.GaussianBlur(0.4))
    im = im.resize((DST, DST), Image.LANCZOS)

    out = os.path.join(OUT_DIR, "cover_%02d.jpg" % (idx + 1))
    im.save(out, "JPEG", quality=90)
    return out


def main():
    os.makedirs(OUT_DIR, exist_ok=True)
    out = [make_cover(i) for i in range(COUNT)]
    print("generated %d covers -> %s" % (len(out), OUT_DIR))


if __name__ == "__main__":
    main()
