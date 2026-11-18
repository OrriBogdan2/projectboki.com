#!/usr/bin/env python3
"""Build assets/hunters.json: each Hunter's kit for the expanded splash view on the homepage.

    python3 -I tools/hunters/build.py --game ../project-boki [--ref origin/main]

Reads content/archetypes/*.json at that ref of the game repo (read only). Per ability it uses our line in
tools/hunters/lines.json first (website copy leads, owner 11-18), then the game's short clip line (clip.lines), then the first clause of the card text.
NOTE: ability names here come from the game; the site's names (owner renames 11-16) are ahead of main until rename/hunter-names-1116 merges,
so a rebuild before then would put the old names back. Hunters are matched to the site by their base name (Vex, Albert, ...).
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
    line = lambda k, name=None: mine.get(k) or lines.get(k) or short(card.get(k) or (card.get("weapons", {}).get(weap, "") if k == "lmb" else ""), name)
    kit = [
        {"key": "LMB", "kind": "Weapon", "name": wname, "line": line("lmb")},
        {"key": "", "kind": "Passive", "name": d["passive"]["name"], "line": line("passive", d["passive"]["name"])},
        {"key": "Shift", "kind": "Dash", "name": d["dash"]["name"], "line": line("dash", d["dash"]["name"])},
        {"key": "RMB", "kind": "Ability", "name": d["rmb"]["name"], "line": line("rmb", d["rmb"]["name"])},
        {"key": "E", "kind": "Ability", "name": d["e"]["name"], "line": line("e", d["e"]["name"])},
        {"key": "R", "kind": "Ultimate", "name": d["x"]["name"], "line": line("x", d["x"]["name"])},
    ]
    loop = card.get("loop", "")
    out[sid] = {"color": d.get("color", "#9a7dff"), "style": mine.get("style") or (short(loop.split(":", 1)[1]) if ":" in loop else loop), "kit": kit}
# Hunters on the site that aren't in the game yet: their proposed kits, kept until the game has them.
EXTRA = {"gill": {"color": "#3f8fe0", "style": "Fence up close and throw vials to stun enemies.", "kit": [{"key": "LMB", "kind": "Weapon", "name": "Swordfish", "line": "Thrust twice, then lunge. The lunge slows."}, {"key": "", "kind": "Passive", "name": "Fish Out of Water", "line": "Hit an enemy with 3 different vial effects in 5s to stun them."}, {"key": "Shift", "kind": "Dash", "name": "Deep End", "line": "Swim 6m underground. Surface near enemies to knock them up."}, {"key": "RMB", "kind": "Ability", "name": "Grab Bag", "line": "Throw the next vial from your bag. Each vial has a different effect."}, {"key": "E", "kind": "Ability", "name": "Spin Cycle", "line": "Spin to hit nearby enemies, then send a waterspout that knocks them up."}, {"key": "R", "kind": "Ultimate", "name": "Surf's Up", "line": "Surf a wave 14m. It knocks up and slows enemies it hits."}]}}
for k, v in EXTRA.items(): out.setdefault(k, v)
json.dump(out, open(f"{SITE}/assets/hunters.json", "w"), indent=1, ensure_ascii=False)
print(f"{a.ref}: {len(out)} Hunters")
