#!/usr/bin/env python3
"""Build assets/hunters.json: each Hunter's kit for the expanded splash view on the homepage.

    python3 -I tools/hunters/build.py --game ../project-boki [--ref origin/main]

Reads content/archetypes/*.json at that ref of the game repo (read only). Per ability it uses the game's short
clip line when there is one (clip.lines), then our line in tools/hunters/lines.json, then the first clause of the card text, so the site stays in step
with the game. Hunters are matched to the site by their base name (Vex, Albert, ...).
"""
import argparse, json, os, re, subprocess

SITE = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
SITE_ID = {"Vex": "vex", "Albert": "breaker", "Neve": "claire", "Kael": "kael", "Cinder": "cinder", "Tenzo": "tarek",
           "Sparkle": "ryzz", "Grimble": "grimble", "Meeko": "pip", "Sable": "sable", "Lace": "lisette", "Motley": "motley"}
ap = argparse.ArgumentParser(); ap.add_argument("--game", required=True); ap.add_argument("--ref", default="origin/main")
a = ap.parse_args()
git = lambda *x: subprocess.run(["git", "-C", a.game, *x], check=True, capture_output=True, text=True).stdout

def short(text, name=None):
    t = text.strip()
    if name and t.lower().startswith(name.lower() + ":"): t = t[len(name) + 1:].strip()
    t = re.sub(r"^\(?(hunter )?ultimate[^:)]*\)?:?\s*", "", t, flags=re.I)
    t = re.sub(r"\s*\((hunter ultimate, |ultimate, )?level 6\)", "", t)
    t = re.sub(r"^(from level 6|at level 6),\s*", "", t, flags=re.I)
    t = re.split(r"(?<=[.;:])\s", t)[0].rstrip(";:,")
    if not t.endswith("."): t += "."
    return t[0].upper() + t[1:]

OURS = json.load(open(os.path.join(os.path.dirname(__file__), "lines.json")))  # our short lines where the game has none yet
out = {}
for f in git("ls-tree", "--name-only", a.ref, "content/archetypes/").split():
    if not f.endswith(".json"): continue
    d = json.loads(git("show", f"{a.ref}:{f}")); sid = SITE_ID.get(d.get("base_name"))
    if not sid: continue
    card, lines = d.get("card", {}), d.get("clip", {}).get("lines", {})
    weap = d.get("signature", ""); mine = OURS.get(sid, {})
    try: wname = json.loads(git("show", f"{a.ref}:content/weapons/{weap}.json")).get("name")
    except subprocess.CalledProcessError: wname = None
    wname = wname or weap.replace("_", " ").title()
    line = lambda k, name=None: lines.get(k) or mine.get(k) or short(card.get(k) or (card.get("weapons", {}).get(weap, "") if k == "lmb" else ""), name)
    kit = [
        {"key": "LMB", "kind": "Weapon", "name": wname, "line": line("lmb")},
        {"key": "", "kind": "Passive", "name": d["passive"]["name"], "line": line("passive", d["passive"]["name"])},
        {"key": "Shift", "kind": "Dash", "name": d["dash"]["name"], "line": line("dash", d["dash"]["name"])},
        {"key": "RMB", "kind": "Ability", "name": d["rmb"]["name"], "line": line("rmb", d["rmb"]["name"])},
        {"key": "E", "kind": "Ability", "name": d["e"]["name"], "line": line("e", d["e"]["name"])},
        {"key": "X", "kind": "Ultimate", "name": d["x"]["name"], "line": line("x", d["x"]["name"])},
    ]
    loop = card.get("loop", "")
    out[sid] = {"color": d.get("color", "#9a7dff"), "style": mine.get("style") or (short(loop.split(":", 1)[1]) if ":" in loop else loop), "kit": kit}
json.dump(out, open(f"{SITE}/assets/hunters.json", "w"), indent=1, ensure_ascii=False)
print(f"{a.ref}: {len(out)} Hunters")
