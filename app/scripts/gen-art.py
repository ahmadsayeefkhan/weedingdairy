"""Generates synthetic, photo-like abstract artwork for demo data (no real people).
Run: python scripts/gen-art.py  -> public/seed/*.jpg"""
import math, os, random
from PIL import Image, ImageDraw, ImageFilter

OUT = os.path.join(os.path.dirname(__file__), "..", "public", "seed")
os.makedirs(OUT, exist_ok=True)

PALETTES = {
    "holud": [(250, 196, 60), (232, 140, 20), (255, 230, 150), (200, 90, 30), (120, 60, 20)],
    "mehendi": [(95, 127, 58), (160, 110, 60), (230, 210, 170), (60, 80, 40), (190, 150, 90)],
    "wedding": [(217, 117, 102), (160, 30, 45), (255, 200, 170), (250, 225, 190), (90, 20, 30)],
    "reception": [(122, 92, 142), (40, 30, 60), (230, 200, 240), (250, 220, 170), (80, 60, 110)],
    "venue": [(60, 40, 50), (240, 200, 150), (217, 117, 102), (255, 240, 220), (30, 25, 35)],
    "food": [(170, 90, 30), (240, 200, 120), (120, 40, 20), (250, 240, 220), (200, 140, 60)],
    "decor": [(255, 180, 70), (217, 117, 102), (255, 240, 230), (80, 120, 60), (240, 90, 90)],
    "makeup": [(230, 160, 150), (190, 90, 90), (255, 230, 220), (120, 60, 70), (250, 200, 190)],
    "music": [(30, 20, 60), (217, 117, 102), (80, 200, 255), (255, 80, 180), (20, 15, 30)],
    "car": [(20, 20, 25), (240, 240, 240), (217, 117, 102), (180, 180, 190), (255, 255, 255)],
}


def grad(w, h, top, bottom):
    im = Image.new("RGB", (w, h))
    d = ImageDraw.Draw(im)
    for y in range(h):
        t = y / h
        d.line([(0, y), (w, y)], fill=tuple(int(top[i] * (1 - t) + bottom[i] * t) for i in range(3)))
    return im


def bokeh(im, pal, n, rmin, rmax, alpha=90):
    layer = Image.new("RGBA", im.size, (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    for _ in range(n):
        r = random.randint(rmin, rmax)
        x, y = random.randint(-r, im.width + r), random.randint(-r, im.height + r)
        c = random.choice(pal)
        d.ellipse([x - r, y - r, x + r, y + r], fill=c + (random.randint(alpha // 3, alpha),))
    layer = layer.filter(ImageFilter.GaussianBlur(random.uniform(2, 6)))
    return Image.alpha_composite(im.convert("RGBA"), layer)


def garland(im, color, count=6):
    d = ImageDraw.Draw(im)
    for g in range(count):
        x0 = int(im.width * (g + 0.5) / count) + random.randint(-20, 20)
        for k in range(0, im.height // 2 + random.randint(0, im.height // 3), 16):
            r = 9
            col = tuple(min(255, max(0, c + random.randint(-25, 25))) for c in color)
            d.ellipse([x0 - r, k - r, x0 + r, k + r], fill=col + (255,))
    return im


def mandala(im, color, cx, cy, R):
    d = ImageDraw.Draw(im)
    for ring in range(6):
        rr = R * (ring + 1) / 6
        petals = 8 + ring * 4
        for p in range(petals):
            a = 2 * math.pi * p / petals
            x, y = cx + rr * math.cos(a), cy + rr * math.sin(a)
            s = 3 + ring * 1.5
            d.ellipse([x - s, y - s, x + s, y + s], outline=color + (220,), width=2)
        d.ellipse([cx - rr, cy - rr, cx + rr, cy + rr], outline=color + (120,), width=1)
    return im


def lights(im, n=80):
    layer = Image.new("RGBA", im.size, (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    for i in range(n):
        x = int(im.width * i / n)
        y = int(40 + 30 * math.sin(i / 5) + random.randint(-4, 4))
        d.ellipse([x - 4, y - 4, x + 4, y + 4], fill=(255, 230, 160, 255))
    glow = layer.filter(ImageFilter.GaussianBlur(6))
    return Image.alpha_composite(Image.alpha_composite(im, glow), layer)


def make(name, kind, seed, w=900, h=675, motif=None):
    random.seed(seed)
    pal = PALETTES[kind]
    im = grad(w, h, pal[0], pal[1]).convert("RGBA")
    im = bokeh(im, pal, 40, 30, 140, 110)
    im = bokeh(im, pal, 60, 6, 30, 200)
    if motif == "garland":
        im = garland(im, (250, 170, 30), random.randint(5, 8))
    elif motif == "mandala":
        im = mandala(im, (70, 35, 15), w // 2 + random.randint(-120, 120), h // 2 + random.randint(-60, 60), random.randint(140, 240))
    elif motif == "lights":
        im = lights(im)
    elif motif == "stage":
        d = ImageDraw.Draw(im)
        d.rectangle([w * 0.15, h * 0.62, w * 0.85, h * 0.72], fill=pal[4] + (220,))
        d.pieslice([w * 0.25, h * 0.15, w * 0.75, h * 1.0], 180, 360, outline=pal[3] + (255,), width=10)
        im = garland(im, pal[2], 4)
    # soft vignette
    v = Image.new("L", (w, h), 0)
    ImageDraw.Draw(v).ellipse([-w * 0.2, -h * 0.2, w * 1.2, h * 1.2], fill=255)
    v = v.filter(ImageFilter.GaussianBlur(120))
    dark = Image.new("RGBA", (w, h), (20, 10, 15, 255))
    im = Image.composite(im, dark, v)
    im.convert("RGB").save(os.path.join(OUT, name + ".jpg"), quality=82)


motifs = {"holud": ["garland", "stage", None, "garland", "lights", None],
          "mehendi": ["mandala", "mandala", None, "lights", "mandala", None],
          "wedding": ["stage", "lights", None, "stage", None, "lights"],
          "reception": ["lights", None, "stage", "lights", None, "lights"]}
for ev, ms in motifs.items():
    for i, m in enumerate(ms):
        make(f"{ev}-{i + 1}", ev, hash(ev) % 1000 + i, motif=m)

covers = {"photography": ("wedding", "lights"), "cinematography": ("reception", "lights"), "venue": ("venue", "stage"),
          "catering": ("food", None), "decor": ("decor", "garland"), "makeup": ("makeup", None), "mehendi": ("mehendi", "mandala"),
          "music": ("music", "lights"), "transport": ("car", None)}
for i, (k, (pal, m)) in enumerate(covers.items()):
    for j in range(3):
        make(f"cover-{k}-{j + 1}", pal, 500 + i * 10 + j, 1200, 700, m)
print("done", len(os.listdir(OUT)))
