"""Finishes the rendered art kit: trims the transparent logo to its content at 1200 px wide, and writes the
icon as png and the cover, hero and alt as jpg (OGS art kit sizes)."""
import sys
from PIL import Image

out = sys.argv[1]
logo = Image.open(f"{out}/logo.raw.png").convert("RGBA")
# Trim only fully transparent pixels: a higher threshold cuts the glow off at a hard edge.
logo = logo.crop(logo.getchannel("A").point(lambda a: 255 if a > 2 else 0).getbbox())
logo.resize((1200, round(logo.height * 1200 / logo.width)), Image.LANCZOS).save(f"{out}/logo.png")
Image.open(f"{out}/icon.raw.png").convert("RGB").save(f"{out}/icon.png")
for name in ("cover", "hero-clean", "alt"):
    Image.open(f"{out}/{name}.raw.png").convert("RGB").save(f"{out}/{name}.jpg", quality=88)
