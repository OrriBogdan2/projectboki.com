#!/usr/bin/env python3
"""Build the homepage Boki wall (assets/boki.json and its art) from the Bokidex.

    python3 -I tools/boki/build.py [--reveal 62]

Reads only the public Bokidex export in this repo (bokidex/d/data.json and its images), so the wall always matches
the dex: names, types, descriptions and evolution lines.

  - revealed (default 62): a hand-picked dozen first (FRONT below), then every Boki with a front-page
    portrait shot in the Bokidex (cut out with rembg,
    pip install "rembg[cpu]"), then the rest picked for variety: final evolutions first, spread across types.
    Card art goes to assets/img/boki-front/{id}-{480,960}.webp. Art for anything not revealed is deleted, so
    hidden Boki can't be found by guessing a file name.
  - hidden: everyone else, as black silhouettes (baked black, assets/img/boki-sil/{id}-240.webp) or eggs.
"""
import argparse, io, json, os, glob, re
# Some dex entries are still working notes ("Male locked, female redo out.", "art-lane design.", "Evolution of X.", "Pre-evolution of X.",
# which can also name a Boki that is not revealed yet). Those never reach the homepage; a few get a plain line instead.
NOTE = re.compile(r"art-lane|\blocked\b|\bredo\b|^(?:Pre-)?evolution of\b", re.I)
DESC = {"vespox": "A fox with a scorpion's pincers and sting tail."}
def public_desc(e):
    if e["id"] in DESC: return DESC[e["id"]]
    d = (e.get("entry") or "").strip()
    return None if not d or NOTE.search(d) else d
from PIL import Image

SITE = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
ap = argparse.ArgumentParser(); ap.add_argument("--reveal", type=int, default=62)
a = ap.parse_args()

data = json.load(open(f"{SITE}/bokidex/d/data.json"))
files, alias = data["files"], data["dex"]["aliases"]
blob = lambda key: open(f"{SITE}/bokidex/d/{files[key]}", "rb").read()
entries = [e for e in data["dex"]["entries"] if e.get("name") and e["name"] != "???" and not e.get("unknown")]
by_id = {e["id"]: e for e in entries}
mystery = [e for e in data["dex"]["entries"] if e not in entries]          # the dex's own ??? entries
hero = lambda e: e.get("hero") and f"dex/{e['hero']}" in files and f"dex/{e['hero']}"

# front-page portrait shots, newest per Boki (dropped below when the dex picture is newer than the shot)
ms = lambda t: (t * 1000 if t < 1e11 else t) if t else 0
shots = {}
for g in sorted(data["gens"], key=lambda g: g.get("created", 0)):
    if g.get("kind") != "portrait" or g.get("status") != "approved" or g.get("form") == "f" or not g.get("images") or g["images"][0] not in files: continue
    n = g["name"].lower(); i = alias.get(n, n)
    if i in by_id: shots[i] = g
has_shot = set(shots)   # these still lead the wall, whichever picture they use
shots = {i: g for i, g in shots.items() if not (hero(by_id[i]) and ms(by_id[i].get("heroAt")) > ms(g.get("created")))}

# ---- pick who is revealed
# The wall leads with a hand-picked dozen: small, cute Boki next to fully grown ones, one per evolution line, and
# none of the Boki already shown in the homepage pictures (those are in SEEN: still revealed, just further down).
FRONT = ["pinguin", "pyrraven", "dribbara", "selenwhale", "spanglin", "blastopuff",
         "lanterloris", "glaciatee", "fawngus", "forgebrock", "jerbit", "dreadmonite"]
SEEN = ["vespyx", "mycroll", "prismander", "kitlet", "kestrike", "lockatara"]
cands = [e for e in entries if hero(e) or e["id"] in shots]
assert all(i in by_id and by_id[i] in cands for i in FRONT + SEEN), [i for i in FRONT + SEEN if i not in by_id or by_id[i] not in cands]
front = [by_id[i] for i in FRONT]; seen = [by_id[i] for i in SEEN]
first = front + sorted((e for e in cands if e["id"] in has_shot and e not in front + seen), key=lambda e: e.get("num", 999)) + seen
front = front + seen
rest = sorted((e for e in cands if e["id"] not in has_shot and e not in front),
              key=lambda e: (e.get("stage", 1) != e.get("stages", 1), -e.get("stage", 1), e.get("num", 999)))
pools = {}
for e in rest: pools.setdefault(e["types"][0], []).append(e)
picked = list(first)
while len(picked) < a.reveal and any(pools.values()):   # round robin across types, best of each type first
    for t in sorted(pools, key=lambda t: -len(pools[t])):
        if pools[t] and len(picked) < a.reveal: picked.append(pools[t].pop(0))
shown = {e["id"] for e in picked}

# ---- art
_rembg = None
def cut(b):
    global _rembg
    from rembg import remove, new_session
    _rembg = _rembg or new_session("isnet-general-use")
    return remove(Image.open(io.BytesIO(b)).convert("RGB"), session=_rembg)
def square(o):
    bb = o.getchannel("A").point(lambda v: 255 if v > 40 else 0).getbbox(); w, h = o.size
    pad = int(max(bb[2] - bb[0], bb[3] - bb[1]) * 0.06)
    c = o.crop((max(0, bb[0] - pad), max(0, bb[1] - pad), min(w, bb[2] + pad), min(h, bb[3] + pad)))
    s = max(c.size); sq = Image.new("RGBA", (s, s), (0, 0, 0, 0)); sq.paste(c, ((s - c.width) // 2, s - c.height - int(s * 0.04)))
    return sq

os.makedirs(f"{SITE}/assets/img/boki-front", exist_ok=True); os.makedirs(f"{SITE}/assets/img/boki-sil", exist_ok=True)
name_of = lambda i: by_id[i]["name"] if i in shown else None
revealed = []
try: was = {r["id"]: r["v"] for r in json.load(open(f"{SITE}/assets/boki.json"))["revealed"]}
except Exception: was = {}
for e in picked:
    s = shots.get(e["id"]); v = f"s{s['created']}" if s else f"h{e.get('heroAt') or 0}"
    out = [f"{SITE}/assets/img/boki-front/{e['id']}-{w}.webp" for w in (480, 960)]
    if not (was.get(e["id"]) == v and all(os.path.exists(o) for o in out)):   # art is only rebuilt when its source changed
        img = square(cut(blob(s["images"][0]))) if s else square(Image.open(io.BytesIO(blob(hero(e)))).convert("RGBA"))
        for w, o in zip((480, 960), out):
            img.resize((w, w), Image.LANCZOS).save(o, "WEBP", quality=84, method=6, alpha_quality=90)
    prev, nxt = [p for p in e.get("prev") or [] if p in by_id], [n for n in e.get("next") or [] if n in by_id]
    revealed.append({
        "id": e["id"], "name": e["name"], "types": [t.lower() for t in e["types"]], "stage": e.get("stage", 1),
        "from": name_of(prev[0]) if prev else None, "fromHidden": bool(prev) and name_of(prev[0]) is None,
        "into": [name_of(n) for n in nxt],  # None = still hidden
        "desc": public_desc(e), "v": v, "shot": bool(s),
    })

# hidden: black silhouettes from the dex picture, or eggs
hidden = []
for e in entries + mystery:
    if e.get("id") in shown: continue
    h = hero(e); t = (e.get("types") or ["normal"])[0].lower()
    if h:
        im = square(Image.open(io.BytesIO(blob(h))).convert("RGBA")).resize((240, 240), Image.LANCZOS)
        a_ = im.getchannel("A"); black = Image.new("RGBA", im.size, (0, 0, 0, 255)); black.putalpha(a_)
        black.save(f"{SITE}/assets/img/boki-sil/{e['id']}-240.webp", "WEBP", quality=80, method=6, alpha_quality=80)
        hidden.append({"t": t, "sil": e["id"]})
    else: hidden.append({"t": t, "sil": None})
sils = [h for h in hidden if h["sil"]]; eggs = [h for h in hidden if not h["sil"]]
mixed = []
while sils or eggs:   # mostly silhouettes, an egg every third tile
    for _ in range(2):
        if sils: mixed.append(sils.pop(0))
    if eggs: mixed.append(eggs.pop(0))

# nothing hidden stays findable
keep = {f"{i}-{w}.webp" for i in shown for w in (480, 960)}
for f in glob.glob(f"{SITE}/assets/img/boki-front/*.webp"):
    if os.path.basename(f) not in keep: os.remove(f)
keep = {f"{h['sil']}-240.webp" for h in mixed if h["sil"]}
for f in glob.glob(f"{SITE}/assets/img/boki-sil/*.webp"):
    if os.path.basename(f) not in keep: os.remove(f)

json.dump({"total": len(data["dex"]["entries"]), "revealed": revealed, "hidden": mixed}, open(f"{SITE}/assets/boki.json", "w"), indent=1)
print(f"Bokidex: {len(entries)} named + {len(mystery)} unknown. Revealed {len(revealed)} ({sum(r['shot'] for r in revealed)} shots), hidden {len(mixed)} ({sum(1 for h in mixed if h['sil'])} silhouettes)")
