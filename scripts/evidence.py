"""Critic sheets for one round, from recordings/raw (written by e2e/record-session.ts):
tv-contact-sheet.png (every TV shot, labeled), phones-sheet.png (host phone + kid iPad per phase, CSS scale),
session-tiles.png, metrics.json (TV luma per shot, perf, audio presence), tv-audio-spectrogram.png when there is audio.

  python3 scripts/evidence.py critic/rounds/NN
"""
import glob, json, os, re, shutil, subprocess, sys
from PIL import Image, ImageDraw, ImageFont, ImageStat

out = sys.argv[1]
raw = "recordings/raw"
os.makedirs(f"{out}/shots", exist_ok=True)
for p in glob.glob(f"{raw}/shots/*.png"):
    shutil.copy(p, f"{out}/shots/")

try:
    font = ImageFont.truetype("/System/Library/Fonts/Supplemental/Arial Rounded Bold.ttf", 26)
except OSError:
    font = ImageFont.load_default()
BG, FG = (17, 17, 17), (238, 238, 238)


def sheet(paths, tile_h, cols, dest):
    tiles = []
    for p in paths:
        im = Image.open(p).convert("RGB")
        im = im.resize((round(im.width * tile_h / im.height), tile_h))
        tiles.append((os.path.basename(p)[:-4], im))
    if not tiles:
        return
    rows = [tiles[i:i + cols] for i in range(0, len(tiles), cols)]
    w = max(sum(im.width for _, im in r) + 20 * (len(r) + 1) for r in rows)
    canvas = Image.new("RGB", (w, (tile_h + 50) * len(rows) + 20), BG)
    d = ImageDraw.Draw(canvas)
    y = 20
    for r in rows:
        x = 20
        for name, im in r:
            canvas.paste(im, (x, y + 40))
            d.text((x, y + 6), name, fill=FG, font=font)
            x += im.width + 20
        y += tile_h + 50
    canvas.save(dest)


tv = sorted(glob.glob(f"{raw}/shots/*-tv.png"))
sheet(tv, 360, 4, f"{out}/tv-contact-sheet.png")
# Phones: one row per phase, host phone then kid iPad, at the same height (CSS pixels differ: see labels).
phones = sorted(glob.glob(f"{raw}/shots/*-host.png") + glob.glob(f"{raw}/shots/*-kid.png"))
sheet(phones, 480, 6, f"{out}/phones-sheet.png")

marks = json.load(open(f"{raw}/marks.json"))
shutil.copy(f"{raw}/marks.json", out)
shutil.copy(f"{raw}/perf.json", out)
session = f"{out}/session.mp4"
if os.path.exists(session):
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", session, "-vf", "fps=1/4,scale=720:-1,tile=4x8", "-frames:v", "1", f"{out}/session-tiles.png"])

luma = {os.path.basename(p)[:-4]: round(ImageStat.Stat(Image.open(p).convert("L")).mean[0], 1) for p in tv}
audio = {"hasAudio": bool(marks.get("hasAudio"))}
if audio["hasAudio"] and os.path.getsize(marks["audio"]) > 0:
    loud = subprocess.run(["ffmpeg", "-i", marks["audio"], "-af", "ebur128", "-f", "null", "-"], capture_output=True, text=True).stderr
    audio["ebur128"] = [l.strip() for l in loud.splitlines() if re.match(r"\s*(I:|LRA:)", l)][-2:]
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", marks["audio"], "-lavfi", "showspectrumpic=s=1600x500:legend=1:fscale=log:color=intensity", f"{out}/tv-audio-spectrogram.png"])
metrics = {"tvMeanLumaPerShot(0-255)": luma, "audio": audio, "perf": json.load(open(f"{raw}/perf.json")), "marks": marks["marks"]}
json.dump(metrics, open(f"{out}/metrics.json", "w"), indent=2)
print(json.dumps({k: v for k, v in metrics.items() if k != "marks"})[:800])
