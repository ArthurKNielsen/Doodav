from PIL import Image, ImageDraw
import os

OUT = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "public", "icons")
os.makedirs(OUT, exist_ok=True)

BG = (11, 13, 16, 255)
ACCENT = (52, 211, 153, 255)


def draw(size: int) -> Image.Image:
    s = size * 4
    img = Image.new("RGBA", (s, s), BG)
    d = ImageDraw.Draw(img)
    cx, cy, r = s * 0.44, s * 0.44, s * 0.25
    w = int(s * 0.07)
    d.ellipse([cx - r, cy - r, cx + r, cy + r], outline=ACCENT, width=w)
    hx0, hy0 = cx + r * 0.7, cy + r * 0.7
    hx1, hy1 = s * 0.80, s * 0.80
    d.line([hx0, hy0, hx1, hy1], fill=ACCENT, width=int(s * 0.10))
    d.ellipse([hx1 - w, hy1 - w, hx1 + w, hy1 + w], fill=ACCENT)
    return img.resize((size, size), Image.LANCZOS).convert("RGB")


draw(192).save(os.path.join(OUT, "icon-192.png"))
draw(512).save(os.path.join(OUT, "icon-512.png"))
draw(180).save(os.path.join(OUT, "apple-touch-icon.png"))
print("icons written to", OUT)
