"""Pack Godot frames into the site's figure sheets.
Usage: pack.py SRC_DIR DEST_DIR id[:clip+clip...] [id[:clips] ...]
  e.g. pack.py /tmp/h3d assets/img/hunters/3d sable:emote+encore_dance vex

SRC_DIR/<id>/NN.png              24 turntable frames, 720x900 -> <id>-spin.webp (6x4 sheet, 600x600 a frame)
SRC_DIR/<id>/pose.txt            "<clip> <frames>" per rendered emote, then "idle <frames>" (from hunters.gd)
SRC_DIR/<id>/pose/<clip>/NN.png  the front pose, 80 ms a frame
Outputs, 10 columns at 450x450 a frame:
  <id>-pose.webp    the first emote, then the idle loop (what plays when a Hunter is picked)
  <id>-e2.webp ...  each further emote on its own sheet (the site loads them only while that Hunter is shown)
  <id>.webp         the first pose frame (600x600), shown while the sheets load
Without :clips, only the first rendered clip (the Hunter's emote) is used.
Every frame is shifted by the same amount so the stand's base sits on the frame floor.
Relative size: SRC_DIR/<id>.fit holds the render's camera distance, so a Hunter's in-game height is its pixel height
times that distance. Each is scaled (about its feet) so the tallest fills the frame and the rest follow height^0.6:
the true order, with the range eased so the small ones stay readable. Pack all twelve together.
Prints the POSE table for assets/site.js: id -> [[frames of each emote], idle frames]."""
import sys, os, json, numpy as np
from PIL import Image
src, dst, args = sys.argv[1], sys.argv[2], sys.argv[3:]
PC, W, H = 10, 450, 450   # square frames: room for wide Hunters (Albert's hammer and shield)
CW = 900                  # the 720x900 renders are centred on a 900x900 canvas
table = {}
fit = {}
for arg in args:
    h = arg.partition(":")[0]
    try: fit[h] = float(open(f"{src}/{h}.fit").read().split()[0])
    except FileNotFoundError: print(h, "has no .fit: not rescaled", file=sys.stderr)
EASE, FILL = 0.6, 840   # size follows height^EASE; the tallest stands FILL px of the 900 frame
def px_h(h):
    a = np.asarray(Image.open(f"{src}/{h}/pose/idle/00.png"))[:, :, 3]
    ys = np.where(a.max(1) > 20)[0]; return ys.max() - ys.min()
px = {h: px_h(h) for h in fit}
world = {h: px[h] * fit[h] for h in fit}
TALL = max(world.values()) if world else 1.0
for arg in args:
    h, _, want = arg.partition(":")
    lines = [l.split() for l in open(f"{src}/{h}/pose.txt").read().splitlines() if l.strip()]
    segs = dict(lines)
    order = [nm for nm, _ in lines if nm != "idle"]
    picks = want.split("+") if want else order[:1]
    for p in picks:
        assert p in segs, f"{h}: no rendered clip {p} (have {order})"
    load = lambda d, n: [Image.open(f"{src}/{h}/pose/{d}/{i:02d}.png").convert("RGBA") for i in range(n)]
    emotes = [load(p, int(segs[p])) for p in picks]
    idle = load("idle", int(segs["idle"]))
    spin = [Image.open(f"{src}/{h}/{i:02d}.png").convert("RGBA") for i in range(24)]
    bottom = max(np.where(np.asarray(f)[:, :, 3].max(1) > 20)[0].max() for f in spin + idle)   # the stand; a swing may dip below it
    dy = (900 - 8) - bottom
    k = FILL * (world[h] / TALL) ** EASE / px[h] if h in world else 1.0
    top = min(np.where(np.asarray(f)[:, :, 3].max(1) > 20)[0].min() for f in spin + idle + [f for e in emotes for f in e]) + dy
    k = min(k, 884 / max(1, 892 - top))   # nothing pokes out of the top of the frame
    def half(f):
        xs = np.where(np.asarray(f)[:, :, 3].max(0) > 20)[0]; return max(360 - xs.min(), xs.max() - 360)
    k = min(k, (CW / 2 - 6) / max(1, max(half(f) for f in spin + idle)))   # or out of the sides while he stands or turns
    def shift(f):
        g = Image.new("RGBA", (CW, 900)); g.paste(f, ((CW - 720) // 2, dy))
        if abs(k - 1) > 0.001:
            sc = g.resize((round(CW * k), round(900 * k)), Image.LANCZOS)
            g = Image.new("RGBA", (CW, 900)); g.paste(sc, (round(CW / 2 - CW / 2 * k), round(892 - 892 * k)))
        return g
    sheet = Image.new("RGBA", (600 * 6, 600 * 4))
    for i, f in enumerate(spin):
        sheet.paste(shift(f).resize((600, 600), Image.LANCZOS), ((i % 6) * 600, (i // 6) * 600))
    sheet.save(f"{dst}/{h}-spin.webp", "WEBP", quality=80, method=6)
    shift(emotes[0][0]).resize((600, 600), Image.LANCZOS).save(f"{dst}/{h}.webp", "WEBP", quality=85, method=6)
    def pack(frames, out):
        rows = -(-len(frames) // PC)
        ps = Image.new("RGBA", (W * PC, H * rows))
        for i, f in enumerate(frames):
            ps.paste(shift(f).resize((W, H), Image.LANCZOS), ((i % PC) * W, (i // PC) * H))
        ps.save(out, "WEBP", quality=76, alpha_quality=60, method=6)
        return os.path.getsize(out) // 1024
    sizes = [pack(emotes[0] + idle, f"{dst}/{h}-pose.webp")]
    for n, e in enumerate(emotes[1:], 2):
        sizes.append(pack(e, f"{dst}/{h}-e{n}.webp"))
    for n in range(len(emotes) + 1, 9):  # drop sheets left from an earlier pick
        if os.path.exists(f"{dst}/{h}-e{n}.webp"): os.remove(f"{dst}/{h}-e{n}.webp")
    table[h] = [[len(e) for e in emotes], len(idle)]
    print(h, "shift", dy, "scale", round(k, 3), "clips", "+".join(picks), "KB", sizes, file=sys.stderr)
print("const POSE = " + json.dumps(table, separators=(", ", ": ")) + ";")
