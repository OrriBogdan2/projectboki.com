#!/usr/bin/env python3
"""Build the homepage Boki data (assets/boki.json) and the front-view card art (assets/img/boki-front/).

    python3 -I tools/boki/build.py --game ../project-boki --ref origin/ext/roster-109

Reads every species file (content/kin_v2/*.json) at that ref of the game repo, matches it to the 2D art
uploaded through /2d (assets/boki2d.json), crops the front view out of each turnaround sheet with
front.py, and writes:
  - revealed: Boki with clean 2D art (name, types, line, and the description if the species is live)
  - hidden:   everyone else, as silhouettes (from a 3D render when there is one) or eggs
Pose-grid sheets (not turnarounds) count as hidden until they have a turnaround.
"""
import argparse, json, os, subprocess, sys
sys.path.insert(0, os.path.dirname(__file__))
from front import front
from PIL import Image

SITE = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
GRIDS = {"glintmole", "gloamshell", "glomwort", "rimeshrew", "selenfin"}  # pose grids, not turnarounds

ap = argparse.ArgumentParser()
ap.add_argument("--game", required=True); ap.add_argument("--ref", default="origin/main")
a = ap.parse_args()
git = lambda *x: subprocess.run(["git", "-C", a.game, *x], check=True, capture_output=True, text=True).stdout
files = [f for f in git("ls-tree", "--name-only", a.ref, "content/kin_v2/").split() if f.endswith(".json")]
rows = [json.loads(git("show", f"{a.ref}:{f}")) for f in files]
art = json.load(open(f"{SITE}/assets/boki2d.json"))
renders = {os.path.basename(f)[:-9] for f in os.listdir(f"{SITE}/assets/img/boki") if f.endswith("-480.webp")}
by_id = {d["id"]: d for d in rows}

def art_key(d):
    n = d["name"].lower()
    return n if n in art else (d["id"] if d["id"] in art else None)

os.makedirs(f"{SITE}/assets/img/boki-front", exist_ok=True)
revealed, hidden = [], []
shown = {d["id"] for d in rows if art_key(d) and art_key(d) not in GRIDS}
name_of = lambda i: (by_id[i]["name"] if i in shown else None) if i in by_id else None
for d in sorted(rows, key=lambda d: d["name"]):
    r = d.get("roster", {}); key = art_key(d); slug = d["name"].lower()
    types = [t for t in (d.get("theme"), d.get("type2")) if t]
    if d["id"] in shown:
        img = front(key)
        for w in (480, 960):
            img.resize((w, w), Image.LANCZOS).save(f"{SITE}/assets/img/boki-front/{slug}-{w}.webp", "WEBP", quality=84, method=6, alpha_quality=90)
        kids = sorted(k["id"] for k in rows if k.get("roster", {}).get("from") == d["id"])
        revealed.append({
            "id": slug, "name": d["name"], "types": types, "stage": r.get("stage", 1),
            "from": name_of(r["from"]) if r.get("from") else None, "fromHidden": bool(r.get("from")) and name_of(r["from"]) is None,
            "into": [name_of(k) for k in kids],  # None = still hidden
            "desc": None if d.get("data_only") else d.get("flavor"),
            "v": art[key].get("v", ""),
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
json.dump({"total": len(rows), "revealed": revealed, "hidden": mixed, "all": sorted(d["name"] for d in rows)}, open(f"{SITE}/assets/boki.json", "w"), indent=1)
print(f"{len(rows)} Boki: {len(revealed)} revealed, {len(mixed)} hidden ({sum(1 for h in mixed if h['sil'])} silhouettes)")
