#!/usr/bin/env python3
"""Build the homepage Boki data (assets/boki.json) and the front-view card art (assets/img/boki-front/).

    BOKIDEX_PW=... python3 -I tools/boki/build.py --game ../project-boki --ref origin/ext/roster-109

Reads every species file (content/kin_v2/*.json) at that ref of the game repo and picks each one's card art,
best first:
  1. its newest approved portrait shot in the Bokidex (/bokidex): the 3/4 hero shots made for the front page,
     cut out with rembg (pip install "rembg[cpu]"); needs BOKIDEX_PW, the /3d password, which is never stored
  2. its newest approved 2D sheet in the Bokidex, first figure (the front view) cut out the same way
  3. its 2D art from the old /2d upload room (assets/boki2d.json), same crop
and writes:
  - revealed: Boki with clean 2D art (name, types, line, and the description if the species is live)
  - hidden:   everyone else, as silhouettes (from a 3D render when there is one) or eggs
Pose-grid sheets (not turnarounds) count as hidden until they have a turnaround.
"""
import argparse, base64, hashlib, io, json, os, subprocess, sys
sys.path.insert(0, os.path.dirname(__file__))
from front import front
from PIL import Image

SITE = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))

ap = argparse.ArgumentParser()
ap.add_argument("--game", required=True); ap.add_argument("--ref", default="auto")
a = ap.parse_args()
git = lambda *x: subprocess.run(["git", "-C", a.game, *x], check=True, capture_output=True, text=True).stdout
def species(ref):
    try: return [f for f in git("ls-tree", "--name-only", ref, "content/kin_v2/").split() if f.endswith(".json")]
    except subprocess.CalledProcessError: return []
if a.ref == "auto":  # the roster lives on whichever branch has the most species (ext/roster-109 until it merges)
    a.ref = max(["origin/main", "origin/ext/roster-109"], key=lambda r: len(species(r)))
files = species(a.ref)
rows = [json.loads(git("show", f"{a.ref}:{f}")) for f in files]
art = json.load(open(f"{SITE}/assets/boki2d.json"))
renders = {os.path.basename(f)[:-9] for f in os.listdir(f"{SITE}/assets/img/boki") if f.endswith("-480.webp")}
by_id = {d["id"]: d for d in rows}

# ---- the Bokidex (encrypted with the /3d key; decrypted here only, in memory) ----
DEX = {"portrait": {}, "2d": {}}
pw = os.environ.get("BOKIDEX_PW")
if pw:
    from cryptography.hazmat.primitives.ciphers.aead import AESGCM
    k = json.load(open(f"{SITE}/3d/d/key.json"))
    dk = hashlib.pbkdf2_hmac("sha256", pw.encode(), base64.b64decode(k["salt"]), k["iter"], 64)
    if hashlib.sha256(dk[32:]).hexdigest() != k["check"]: sys.exit("BOKIDEX_PW is wrong")
    aes = AESGCM(bytes(x ^ y for x, y in zip(base64.b64decode(k["wrapped"]), dk)))
    def dec(name):
        b = open(f"{SITE}/bokidex/d/{name}", "rb").read(); return aes.decrypt(b[:12], b[12:], None)
    data = json.loads(dec("data.bin")); alias = data["dex"]["aliases"]
    for g in sorted(data["gens"], key=lambda g: g.get("created", 0)):  # newest wins
        if g.get("status") != "approved" or g.get("form") == "f" or not g.get("images"): continue
        kind = "portrait" if g["kind"] == "portrait" else "2d" if g["kind"] == "2d" and not g.get("sheet") else None
        if not kind: continue
        n = g["name"].lower(); DEX[kind][alias.get(n, n)] = (g["images"][0], g.get("created", 0), dec(data["files"][g["images"][0]]))
    print(f"Bokidex: {len(DEX['portrait'])} portrait shots, {len(DEX['2d'])} 2D sheets")
else:
    print("BOKIDEX_PW not set: using the /2d art only")
def dex_of(kind, d):
    n = d["name"].lower(); return DEX[kind].get(n) or DEX[kind].get(d["id"])
_rembg = None
def cut_portrait(blob, first=False):
    """Cut the Boki off its backdrop. first=True (a turnaround or pose sheet): keep only the first figure, top left."""
    global _rembg
    from rembg import remove, new_session
    import numpy as np
    from scipy import ndimage
    _rembg = _rembg or new_session("isnet-general-use")
    o = remove(Image.open(io.BytesIO(blob)).convert("RGB"), session=_rembg); w, h = o.size
    if first:
        a = np.asarray(o).copy(); m = a[..., 3] > 40
        lab, n = ndimage.label(ndimage.binary_dilation(m, iterations=2))
        if n > 1:
            boxes = ndimage.find_objects(lab); sizes = ndimage.sum(m, lab, range(1, n + 1)); big = sizes.max()
            figs = [i for i in range(n) if sizes[i] > big * 0.15]
            pick = min(figs, key=lambda i: (boxes[i][0].start // (h * 0.4), boxes[i][1].start))  # reading order: rows, then left to right
            ys, xs = boxes[pick]; py, px = (ys.stop - ys.start) * 0.08, (xs.stop - xs.start) * 0.08
            keep = [i for i in range(n) if i == pick or (sizes[i] < big * 0.15 and  # loose bits of that figure: horns, sparks, smoke
                    ys.start - py <= (boxes[i][0].start + boxes[i][0].stop) / 2 <= ys.stop + py and xs.start - px <= (boxes[i][1].start + boxes[i][1].stop) / 2 <= xs.stop + px)]
            a[..., 3] = np.where(np.isin(lab, [i + 1 for i in keep]), a[..., 3], 0)
            # two figures touching: cut at the emptiest column a little past where a single figure would end
            cs = (a[..., 3] > 40).sum(0); x0, x1 = xs.start, xs.stop; hh = ys.stop - ys.start
            if x1 - x0 > hh * 1.45:
                lo, hi = x0 + int(hh * 0.45), min(x1 - 1, x0 + int(hh * 1.3))
                cut = lo + int(np.argmin(cs[lo:hi])) if hi > lo else None
                if cut is not None and cs[cut] < cs[x0:x1].max() * 0.08: a[:, cut:, 3] = 0  # only a real gap, not a wide wingspan
            o = Image.fromarray(a, "RGBA")
    bb = o.getchannel("A").point(lambda v: 255 if v > 40 else 0).getbbox()
    pad = int(max(bb[2] - bb[0], bb[3] - bb[1]) * 0.06)
    c = o.crop((max(0, bb[0] - pad), max(0, bb[1] - pad), min(w, bb[2] + pad), min(h, bb[3] + pad)))
    s = max(c.size); sq = Image.new("RGBA", (s, s), (0, 0, 0, 0)); sq.paste(c, ((s - c.width) // 2, s - c.height - int(s * 0.04)))
    return sq

def is_grid(key):  # a pose grid (tall sheet on a light backdrop), not a turnaround: stays hidden until it has one
    im = Image.open(f"{SITE}/assets/img/boki2d/{key}-480.webp").convert("RGB"); w, h = im.size
    edge = [im.getpixel((x, 0)) for x in range(0, w, 8)] + [im.getpixel((0, y)) for y in range(0, h, 8)]
    light = sum(sum(p) for p in edge) / len(edge) > 400   # the lone portrait (Vespyx) sits on a dark backdrop
    return w / h < 1.3 and light
GRIDS = {k for k in art if is_grid(k)}

def art_key(d):
    n = d["name"].lower()
    return n if n in art else (d["id"] if d["id"] in art else None)

os.makedirs(f"{SITE}/assets/img/boki-front", exist_ok=True)
revealed, hidden = [], []
shown = {d["id"] for d in rows if dex_of("portrait", d) or dex_of("2d", d) or (art_key(d) and art_key(d) not in GRIDS)}
name_of = lambda i: (by_id[i]["name"] if i in shown else None) if i in by_id else None
for d in sorted(rows, key=lambda d: d["name"]):
    r = d.get("roster", {}); key = art_key(d); slug = d["name"].lower()
    types = [t for t in (d.get("theme"), d.get("type2")) if t]
    if d["id"] in shown:
        shot, sheet = dex_of("portrait", d), dex_of("2d", d)
        if shot: img, v = cut_portrait(shot[2]), f"s{shot[1]}"
        elif sheet: img, v = cut_portrait(sheet[2], first=True), f"d{sheet[1]}"
        else: img, v = front(key), art[key].get("v", "")
        for w in (480, 960):
            img.resize((w, w), Image.LANCZOS).save(f"{SITE}/assets/img/boki-front/{slug}-{w}.webp", "WEBP", quality=84, method=6, alpha_quality=90)
        kids = sorted(k["id"] for k in rows if k.get("roster", {}).get("from") == d["id"])
        revealed.append({
            "id": slug, "name": d["name"], "types": types, "stage": r.get("stage", 1),
            "from": name_of(r["from"]) if r.get("from") else None, "fromHidden": bool(r.get("from")) and name_of(r["from"]) is None,
            "into": [name_of(k) for k in kids],  # None = still hidden
            "desc": None if d.get("data_only") else d.get("flavor"),
            "v": v, "shot": bool(shot),
        })
    else:
        sil = slug if slug in renders else (d["id"] if d["id"] in renders else None)
        hidden.append({"t": types[0], "sil": sil})
# real silhouettes spread through the first rows, eggs around them
sils = [h for h in hidden if h["sil"]]; eggs = [h for h in hidden if not h["sil"]]
mixed = []
while sils or eggs:
    if sils: mixed.append(sils.pop(0))
    for _ in range(2):
        if eggs: mixed.append(eggs.pop(0))
revealed.sort(key=lambda b: not b["shot"])  # the front-page shots lead the wall
json.dump({"total": len(rows), "revealed": revealed, "hidden": mixed, "all": sorted(d["name"] for d in rows), "grids": sorted(GRIDS), "roster": a.ref}, open(f"{SITE}/assets/boki.json", "w"), indent=1)
print(f"{a.ref}: {len(rows)} Boki: {len(revealed)} revealed, {len(mixed)} hidden ({sum(1 for h in mixed if h['sil'])} silhouettes)")
