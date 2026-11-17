#!/usr/bin/env python3
"""Content-hash file names for the Hunter art (cache fix, 11-17).

Why: GitHub Pages' CDN ignores the query string. `sable-960.webp?v=anything` is ONE cached object, so a `?v=` key
cannot stop a browser or edge from keeping old bytes (owner 11-14 and 11-17: "shows the old Sable"). A file NAME that
contains the hash of its bytes can never point at old art.

What it does (run by tools/minify/run.sh before the minify step, so site-push always runs it):
  1. For every splash size (960/1600/2400) and face-192 in assets/img/hunters/, copies the file to
     assets/img/hunters/h/<stem>.<md5-10>.webp (the canonical name stays the source of truth for art tools).
  2. Rewrites the ART_H table in assets/site.js (the JS builds URLs from it).
  3. Rewrites every static reference in the pages to the hashed name (drops the old ?v=).
  4. Deletes hashed copies that are no longer current AND are older than 3 days (a page cached up to 10 min, or a
     tab left open a few days, still finds the files it points to).
Usage: tools/hunters/hashart.py [--check]   (--check only reports; exit 1 if anything is stale)
"""
import hashlib, json, os, re, sys, time
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
D = os.path.join(ROOT, "assets/img/hunters")
H = os.path.join(D, "h")
check = "--check" in sys.argv
WANT = re.compile(r"^[a-z0-9]+(-face-192|-960|-1600|-2400)\.webp$")
PAGES = ["index.html", "devlog.html", "presskit.html", "privacy.html", "404.html", "2d/old.html"]
stale = 0

table = {}
for f in sorted(os.listdir(D)):
    if not WANT.match(f): continue
    data = open(os.path.join(D, f), "rb").read()
    table[f[:-5]] = hashlib.md5(data).hexdigest()[:10]
    out = os.path.join(H, f"{f[:-5]}.{table[f[:-5]]}.webp")
    if not os.path.exists(out):
        stale += 1
        if not check:
            os.makedirs(H, exist_ok=True)
            open(out, "wb").write(data)

# prune: not current, older than 3 days
cur = {f"{k}.{v}.webp" for k, v in table.items()}
if os.path.isdir(H):
    for f in os.listdir(H):
        p = os.path.join(H, f)
        if f not in cur and time.time() - os.path.getmtime(p) > 3 * 86400:
            print("prune", f)
            if not check: os.remove(p)

# site.js table
js_path = os.path.join(ROOT, "assets/site.js")
js = open(js_path).read()
line = "const ART_H = " + json.dumps(table, separators=(",", ":"), sort_keys=True) + ";"
new = re.sub(r"// ART_H:begin[^\n]*\n.*?\n// ART_H:end", lambda m: m.group(0).split("\n")[0] + "\n" + line + "\n// ART_H:end", js, flags=re.S)
if new != js:
    stale += 1
    if not check: open(js_path, "w").write(new)

# static page references
ref = re.compile(r"assets/img/hunters/(?:h/)?([a-z0-9]+(?:-face)?-\d+)(?:\.[0-9a-f]{10})?\.webp(?:\?v=[A-Za-z0-9-]+)?")
def sub(m):
    k = m.group(1)
    return f"assets/img/hunters/h/{k}.{table[k]}.webp" if k in table else m.group(0)
for p in PAGES:
    path = os.path.join(ROOT, p)
    if not os.path.exists(path): continue
    html = open(path).read()
    nxt = ref.sub(sub, html)
    if nxt != html:
        stale += 1; print("pages:", p)
        if not check: open(path, "w").write(nxt)
if check and stale:
    print(f"hashart: {stale} item(s) out of date - run tools/hunters/hashart.py"); sys.exit(1)
