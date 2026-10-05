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
# ---- Automatic checks (frozen thresholds; each was shown to fail on a forced fault, see critic/rig-proof.md) ----
layout = json.load(open(f"{raw}/layout.json")) if os.path.exists(f"{raw}/layout.json") else {}
checks = []
def check(name, ok, detail=""):
    checks.append(f"{'PASS' if ok else 'FAIL'}  {name}  {detail}".rstrip())
dark = [k for k, v in luma.items() if v < 20]
blown = [k for k, v in luma.items() if v > 245]
check("tv-not-black (mean luma >= 20)", not dark, ", ".join(dark[:4]))
check("tv-not-blown (mean luma <= 245)", not blown, ", ".join(blown[:4]))
tv_small = {k: v for k, v in layout.items() if k.endswith("-tv") and v["minFontPx"] < 28}
check("tv-text-readable (min font >= 28px on every TV shot)", not tv_small, "; ".join(f"{k}: {v['smallTextSamples'][:2]}" for k, v in list(tv_small.items())[:3]))
ph_small = {k: v for k, v in layout.items() if not k.endswith("-tv") and v["minFontPx"] < 14}
check("phone-text-readable (min font >= 14px)", not ph_small, "; ".join(f"{k}: {v['smallTextSamples'][:2]}" for k, v in list(ph_small.items())[:3]))
clipped = {k: v["clipped"] for k, v in layout.items() if v["clipped"]}
check("nothing-clipped (no text cut off by a screen edge)", not clipped, "; ".join(f"{k}: {v[:2]}" for k, v in list(clipped.items())[:3]))
lufs = None
for l in audio.get("ebur128", []):
    m = re.match(r"I:\s*(-?[\d.]+)", l)
    if m: lufs = float(m.group(1))
audio["integratedLufs"] = lufs
check("tv-audio-present (integrated loudness > -40 LUFS)", lufs is not None and lufs > -40, f"hasAudio={audio['hasAudio']} lufs={lufs}")
# Clipping and dead air, measured on the captured TV mix (16 kHz mono float; 0.1 s blocks).
def audio_faults(path):
    pcm = subprocess.run(["ffmpeg", "-v", "error", "-i", path, "-ac", "1", "-ar", "16000", "-f", "f32le", "-"], capture_output=True).stdout
    import array
    x = array.array("f"); x.frombytes(pcm[: len(pcm) // 4 * 4])
    if not x: return None, None
    peak = max(abs(v) for v in x)
    B = 1600; silent_run = longest = 0.0
    for i in range(0, len(x) - B, B):
        blk = x[i:i + B]; rms = (sum(v * v for v in blk) / B) ** 0.5
        silent_run = silent_run + 0.1 if rms < 0.00316 else 0.0  # -50 dBFS
        longest = max(longest, silent_run)
    import math
    return round(20 * math.log10(peak + 1e-9), 2), round(longest, 1)
peak_db, dead = audio_faults(marks["audio"]) if audio["hasAudio"] else (None, None)
audio["peakDbfs"] = peak_db; audio["longestSilenceS"] = dead
check("tv-audio-no-clipping (sample peak <= -0.5 dBFS)", peak_db is not None and peak_db <= -0.5, f"peak={peak_db} dBFS")
check("tv-audio-no-dead-air (no silence > 4 s under -50 dBFS)", dead is not None and dead <= 4, f"longest={dead} s")
perf = json.load(open(f"{raw}/perf.json"))
check("tv-frame-time (p95 <= 20 ms)", perf.get("p95", 99) <= 20, f"p95={perf.get('p95')} max={perf.get('max')}")
open(f"{out}/checks.log", "w").write("\n".join(checks) + "\n")
print("\n".join(checks))
if os.path.exists(f"{raw}/layout.json"): shutil.copy(f"{raw}/layout.json", out)

metrics = {"checks": checks, "tvMeanLumaPerShot(0-255)": luma, "audio": audio, "perf": json.load(open(f"{raw}/perf.json")), "marks": marks["marks"]}
json.dump(metrics, open(f"{out}/metrics.json", "w"), indent=2)
print(json.dumps({k: v for k, v in metrics.items() if k != "marks"})[:800])
