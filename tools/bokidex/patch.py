#!/usr/bin/env python3
"""Site-side additions to the Bokidex page. The Bokidex export (Model Room) rewrites bokidex/index.html, so run this
after every export, before committing:

    python3 tools/bokidex/patch.py

It is safe to run more than once. It adds:
  1. share tags (link preview image assets/img/og-bokidex.jpg, made from tools/og/bokidex.html)
  2. the Project Boki icon in the header instead of the spinning radar (the radar spun off-centre on iOS Safari)
  3. swipe left / right between entries, and between pictures when one is zoomed
  4. the shared top bar (assets/topbar.js: wordmark, links, Sign in / admin state, hamburger on phones) plus the
     layout reserve for it, so the sticky header and filter bar sit under it
  5. UI fixes (11-11): the male/female badge drawn as SVG in the same pill as "N FORMS" (iOS drew the glyphs from a
     taller fallback font and clipped the pill), tapping the badge opens the female look / the other form, an opaque
     sticky filter bar (cards no longer show through it), room for focus rings in the type-chip row, card labels for
     screen readers, contrast on the card number and entry kicker, bottom room for the Safari address pill, font
     preconnect
  6. removes the "Project Boki creature dex" line under the title
  7. removes the second logo beside the "Bokidex" title (the top bar has it)
  7. the 3D viewer opens on a front three-quarter view: camera-orbit 28deg 75deg (28 deg off the front toward +X,
     15 deg above). Every Bokidex GLB faces +Z (the glTF front; audit 11-11: /home/boki/meshy/facing/), so theta 0
     is the face. The export wrote 215deg, which is the back.
  8. cleanup (11-12, tools/bokidex/patch.py step 8): old-concept leftovers out of the page. See CLEANUP_8 below.
"""
import os, re, sys
P = os.path.join(os.path.dirname(__file__), "..", "..", "bokidex", "index.html")
s = open(P, encoding="utf-8").read(); before = s

TAGS = """<!-- Share preview (site repo: tools/bokidex/patch.py). -->
<meta name="description" content="Meet the Boki: every creature in Project Boki, with types, evolutions and lore.">
<meta property="og:type" content="website">
<meta property="og:site_name" content="Project Boki">
<meta property="og:url" content="https://projectboki.com/bokidex/">
<meta property="og:title" content="Bokidex · Project Boki">
<meta property="og:description" content="Meet the Boki.">
<meta property="og:image" content="https://projectboki.com/assets/img/og-bokidex.jpg?v=7">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:image" content="https://projectboki.com/assets/img/og-bokidex.jpg?v=7">
"""
SWIPE = '<script>\n/* Swipe left / right on an open entry to go to the next / previous Boki (and between pictures when one is zoomed).\n   Added from the projectboki.com site repo: keep this block in exports. Horizontal scrollers, the 3D viewer and form\n   fields keep their own swipes. */\n(function(){\n  let x0=0,y0=0,t0=0,ok=false;\n  const scroller=el=>{for(let n=el;n&&n!==document.body;n=n.parentElement){if(n.scrollWidth>n.clientWidth+4){const o=getComputedStyle(n).overflowX;if(o==="auto"||o==="scroll")return true}}return false};\n  addEventListener("touchstart",e=>{\n    if(e.touches.length!==1){ok=false;return}\n    const t=e.touches[0];x0=t.clientX;y0=t.clientY;t0=Date.now();\n    const zoom=!$("#zoom").hidden, el=e.target;\n    ok=zoom||(view==="dex"&&!!sel&&!viewerOpen()&&!!el.closest("#detail")&&!scroller(el)&&!el.closest("input,textarea,select,canvas,model-viewer,[data-noswipe]"));\n  },{passive:true});\n  addEventListener("touchend",e=>{\n    if(!ok)return; ok=false;\n    const t=e.changedTouches[0],dx=t.clientX-x0,dy=t.clientY-y0;\n    if(Date.now()-t0>800||Math.abs(dx)<55||Math.abs(dx)<Math.abs(dy)*1.6)return;\n    const d=dx<0?1:-1;\n    if(!$("#zoom").hidden){if(zoomList.length>1){zoomI=(zoomI+d+zoomList.length)%zoomList.length;$("#zoom-img").src=zoomList[zoomI]}return}\n    const det=$("#detail"), was=sel;\n    moveSel(d);\n    if(sel===was||!det||matchMedia("(prefers-reduced-motion: reduce)").matches)return;\n    det.animate([{transform:`translateX(${d*42}px)`,opacity:.35},{transform:"none",opacity:1}],{duration:260,easing:"cubic-bezier(.2,.8,.2,1)"});\n  },{passive:true});\n})();\n</script>\n'

# 1. share tags, right after the title
if "og-bokidex.jpg" not in s:
    s = re.sub(r"(<title>[^<]*</title>\n)", lambda m: m.group(1) + TAGS, s, count=1)

# 2. the icon instead of the radar
s = re.sub(r'<span class="lens" aria-hidden="true"><svg viewBox="0 0 64 64".*?</svg></span>',
           '<a class="lens" href="/" aria-label="Project Boki home"><img src="/assets/img/brand-96.webp?v=2" alt="" width="96" height="96"></a>', s, count=1, flags=re.S)
s = s.replace(".lens svg{width:100%;height:100%;overflow:visible;display:block}", ".lens img{width:100%;height:100%;display:block;border-radius:22%}")
s = re.sub(r"@media \(prefers-reduced-motion:no-preference\)\{\.lens \.sw\{animation:sweep[^}]*\}\}", "", s)
s = s.replace(".lens{--s:28px}", ".lens{--s:32px}")

# 3. swipe, before the owner script (or before </body>)
if "Swipe left / right on an open entry" not in s:
    at = s.find('<script src="owner.js')
    if at < 0: at = s.rfind("</body>")
    s = s[:at] + SWIPE + s[at:]

# 4. shared top bar: a head-side layout reserve (no jump while the script loads) and the script itself
TB_HEAD = '<!-- Shared top bar (site repo: tools/bokidex/patch.py + assets/topbar.js). -->\n<script>document.documentElement.classList.add("tb-dex")</script>\n<style>html.tb-dex{--tbh:52px;--tbo:var(--tbh)}html.tb-dex.tb-hide{--tbo:0px}html.tb-dex body{padding-top:calc(var(--tbh) + env(safe-area-inset-top,0px))}</style>\n'
if "tb-dex" not in s:
    s = s.replace("</head>", TB_HEAD + "</head>", 1)
if "<script src=\"/assets/topbar.js" not in s:
    at = s.find('<script src="owner.js')
    if at < 0: at = s.rfind("</body>")
    s = s[:at] + '<script src="/assets/topbar.js?v=4" defer></script>\n' + s[at:]

# 5. UI fixes (11-11). Markers: "bx-fix-1111" (css + click script), "site fix 11-11" (badge + card label + sex toggle).
SVG_M = '<svg class="sxg" viewBox="0 0 24 24" aria-hidden="true"><circle cx="10" cy="14" r="5.5"/><path d="M14 10l6-6M15 4h5v5"/></svg>'
SVG_F = '<svg class="sxg" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="9" r="5.5"/><path d="M12 14.5V22M8.5 18.5h7"/></svg>'
FBADGE = ('function fbadgeHTML(e){ // owner 11-10, site fix 11-11 (tools/bokidex/patch.py): one pill for "N forms" and/or the male/female mark.\n'
  '  // The symbols are SVG, not the \\u2642\\u2640 glyphs: iOS drew those from a taller fallback font and the pill clipped. A tap on it opens the female look / the other form.\n'
  '  const sx=!e.unknown&&e.sex_forms, n=e.forms?e.forms.length:0;\n'
  '  if(!sx&&!n)return"";\n'
  '  const tap=sx&&femReady(e)?"f":n>1?"form":"";\n'
  '  const tip=[n?n+" forms":"",sx?"male and female looks":""].filter(Boolean).join(", ")+(tap==="f"?" (tap: female look)":tap?" (tap: the other form)":"");\n'
  '  return`<span class="fbadge"${tap?` data-alt="${tap}"`:""} title="${esc(cap1(tip))}">${n?`<span class="fn">${n} forms</span>`:""}${n&&sx?\'<i class="fsep"></i>\':""}${sx?`<span class="fsx">' + SVG_M + SVG_F + '</span>`:""}</span>`;\n'
  '}\n'
  'function cardLabel(e){ // site fix 11-11: one clean spoken label per card (number, name, types, forms) instead of name twice\n'
  '  if(e.unknown)return`#${pad(e.num)}, not yet discovered`;\n'
  '  const n=e.forms?e.forms.length:0;\n'
  '  return[`#${pad(e.num)} ${e.name}`,typesOf(e).join(" and "),n?n+" forms":"",e.sex_forms?"male and female looks":""].filter(Boolean).join(", ");\n'
  '}\n')
FBADGE = FBADGE
if "site fix 11-11" not in s:
    s = re.sub(r'function fbadgeHTML\(e\)\{.*?\n\}\n', lambda m: FBADGE, s, count=1, flags=re.S)
    s = s.replace('<a class="dcard${un?" unk dim":dim}" role="listitem"', '<a class="dcard${un?" unk dim":dim}" role="listitem" aria-label="${esc(cardLabel(e))}"', 1)
    s = s.replace('<span aria-hidden="true">\\u2642</span> Male', '<span class="sxi" aria-hidden="true">' + SVG_M + '</span> Male', 1)
    s = s.replace('<span aria-hidden="true">\\u2640</span> Female', '<span class="sxi" aria-hidden="true">' + SVG_F + '</span> Female', 1)
FIX_CSS = """<!-- UI fixes 11-11 (site repo: tools/bokidex/patch.py) bx-fix-1111 -->
<style>
/* card badge: one fixed-height pill for every variant (N forms, male/female, both) */
.dcard .fbadge{display:inline-flex;align-items:center;justify-content:center;gap:5px;height:20px;padding:0 8px;box-sizing:border-box;font:700 .62rem/1 var(--mono);letter-spacing:.06em;white-space:nowrap;overflow:visible}
.dcard .fbadge .fn{display:block;line-height:1;transform:translateY(.02em)}
.dcard .fbadge .fsx{display:inline-flex;align-items:center;gap:1px;font:inherit;letter-spacing:0}
.dcard .fbadge .fsep{display:block;width:1px;height:10px;background:currentColor;opacity:.4}
.sxg{display:block;width:12px;height:12px;fill:none;stroke:currentColor;stroke-width:2.4;stroke-linecap:round;stroke-linejoin:round}
.sxi{display:inline-flex;vertical-align:-2px}.sxi .sxg{width:13px;height:13px}
.dcard .fbadge[data-alt]{cursor:pointer}
.dcard .fbadge[data-alt]::after{content:"";position:absolute;inset:-12px -10px}
@media (hover:hover) and (pointer:fine){.dcard .fbadge[data-alt]{transition:box-shadow .15s}.dcard .fbadge[data-alt]:hover{box-shadow:0 0 0 2px var(--ty)}}
/* sticky filter bar: opaque (cards no longer show through), a little air top and bottom, a soft edge over the grid */
.dbar{background:var(--bg);margin-top:0;padding:8px 0 6px}
.dbar::before{content:"";position:absolute;inset:0 -16px;background:var(--bg);z-index:-1}
.dbar.stuck::before{top:calc(-1 * (var(--tbo,0px) + env(safe-area-inset-top,0px)))}
.dbar::after{content:"";position:absolute;left:-16px;right:-16px;top:100%;height:12px;background:linear-gradient(var(--bg),color-mix(in srgb,var(--bg) 0%,transparent));pointer-events:none}
#dgrid{margin-top:14px}
/* type chips: room for the focus ring and chip edges inside the scroller */
.tf{margin-top:6px;padding:4px 3px 5px;scroll-padding-inline:3px}
@media (max-width:759px){.dbar{margin-top:0;padding-top:6px}.tf{margin-top:4px}}
/* card type line: tighter tracking on phones so two types fit on one line */
@media (max-width:759px){.tl{letter-spacing:.1em}.tl+.tl::before{margin:0 .35em 0 .3em}}
/* contrast (WCAG AA): card number on the light art panel, entry kicker in light theme */
:root[data-theme="light"] .dn{color:#5a5e6b}
:root[data-theme="light"] .mkick{color:#7f5c2a}
/* room at the end for the Safari address pill on phones */
.wrap{padding-bottom:calc(64px + env(safe-area-inset-bottom,0px))}
@media (max-width:759px){.wrap{padding-bottom:calc(96px + env(safe-area-inset-bottom,0px))}}
</style>
"""
FIX_JS = """<script>
/* bx-fix-1111 (site repo: tools/bokidex/patch.py): a tap on a card's badge opens the female look, or the other form. */
document.addEventListener("click",ev=>{
  const b=ev.target.closest&&ev.target.closest(".dcard .fbadge[data-alt]");
  if(!b||ev.metaKey||ev.ctrlKey||ev.shiftKey||typeof byId==="undefined")return;
  const e=byId[b.closest(".dcard").dataset.id];if(!e)return;
  if(b.dataset.alt==="f"){sx="f";sxFor=e.id;return} /* the card's own click then opens the entry, on the female look */
  if(e.forms&&e.forms[1]){ev.preventDefault();ev.stopPropagation();go(L_(e.forms[1].id))}
},true);
/* bx-fix-1111: while the filter bar is pinned, its opaque backing also fills the strip behind the (translucent) top bar */
(function(){let bar=null,raf=0;const tick=()=>{raf=0;bar=bar||document.querySelector(".dbar");if(!bar)return;
  const top=parseFloat(getComputedStyle(bar).top)||0;bar.classList.toggle("stuck",bar.getBoundingClientRect().top<=top+1&&scrollY>0)};
  addEventListener("scroll",()=>{if(!raf)raf=requestAnimationFrame(tick)},{passive:true});addEventListener("resize",tick);})();
</script>
"""
if "bx-fix-1111" not in s:
    s = s.replace("</head>", FIX_CSS + "</head>", 1)
    at = s.find('<script src="owner.js')
    if at < 0: at = s.rfind("</body>")
    s = s[:at] + FIX_JS + s[at:]
if "fonts.gstatic.com" not in s:
    s = s.replace('<link rel="stylesheet" href="https://fonts.googleapis.com', '<link rel="preconnect" href="https://fonts.googleapis.com">\n<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>\n<link rel="stylesheet" href="https://fonts.googleapis.com', 1)

# The "Project Boki creature dex" line under the title is not needed (the top bar already says where you are).
s = s.replace('<div class="sub">Project Boki creature dex</div>', "")

# The shared top bar already carries the Project Boki logo, so the page's own header keeps just its "Bokidex" title
# (otherwise the same logo sits twice, one under the other).
s = re.sub(r'(<div class="brand">)<a class="lens"[^>]*>\s*<img[^>]*>\s*</a>', r'\1', s, count=1)

# 7. 3D viewer opening angle: front three-quarter (the GLBs face +Z, the glTF front).
s = re.sub(r'(<model-viewer [^>]*?)camera-orbit="[^"]*"', r'\1camera-orbit="28deg 75deg auto"', s)

# 8. Cleanup 11-12 (dex-cleanup-1111). The export still writes the old affinity idea (d.aff, d.via = Fierce / Steadfast / ...),
#    design-lane placeholder lines and recipe-style categories into data.json and the page script. Each rule is a literal
#    replace (or a small regex) and is skipped when already applied, so the step is safe to run after every export.
def _sub(old, new, label, rx=False):
    global s
    if new and new in s:
        return
    t = re.sub(old, new, s, count=1, flags=re.S) if rx else s.replace(old, new, 1)
    if t == s and new:  # a removal that matches nothing is already done
        print("  patch: no match for", label, "(export changed?)")
    s = t

# 8a. evolution edges name only a real requirement (an Ink). The four raise-affinity words are not shown any more.
_sub('const viaOf=x=>[...new Set((x.forms||[x]).map(f=>f.d?.via).filter(Boolean))].join(" / ");',
     'const viaOf=x=>[...new Set((x.forms||[x]).map(f=>f.d?.via).filter(v=>v&&!/^(fierce|steadfast|curious|swift)$/i.test(v)))].join(" / "); /* cleanup 11-12 */',
     "viaOf")
# 8b. the "Raised forms" block was the same four cards on 49 entries: gone. The chain stands on its own.
_sub(r'\n  if\(aff\.length\)body\+=`<span class="lbl"[^\n]*?sidegrade[^\n]*?\.join\(""\)\}</div>`;',
     "", "raised-forms block", rx=True)
# 8b2. the card styles that block used
_sub(".affs>div{font-size:.76rem}", "", "affs css 1")
s = re.sub(r"\.affs\{display:grid[^\n]*\n\.affs>div\{[^\n]*\n\.affs p\{[^\n]*\n\.affs b\{[^\n]*\n", "", s, count=1)
# 8c. the Evolution tab exists only when there is a chain (it used to show for every Boki, for the affinity list).
_sub('k==="evolve"?!!(v.chain?.length>1||v.d?.aff?.length)', 'k==="evolve"?!!(v.chain?.length>1)', "evolve tab")
# 8d. kicker: "Stage 1 of 1" is noise; a category that is a design recipe ("Fox + Scorpion") or a type guess that
#     disagrees with the types ("Fire Boki" on a Fairy/Psychic) is not shown. Meta categories ("The Barbtail Boki") are.
_sub('const cat=un?"":(m?.category||v.category||"");',
     'const _vc=String(v.category||""), cat=un?"":(m?.category||(/^[A-Za-z]+ Boki$/.test(_vc)&&typesOf(v).some(t=>_vc.startsWith(t+" "))?_vc:"")); /* cleanup 11-12 */',
     "category")
_sub('${e.stages?`<span>Stage ${e.stage} of ${e.stages}</span>`:""}', '${e.stages>1?`<span>Stage ${e.stage} of ${e.stages}</span>`:""}', "stage 1 of 1")
# 8e. About: production placeholders ("X, art-lane design.", "Pre-evolution of Y.") are not lore. Say so plainly instead.
_sub('const DEVNOTE=/\\b(locked|redo|approved|pending|wip|todo|placeholder|in review|re-?do)\\b/i;',
     'const DEVNOTE=/\\b(locked|redo|approved|pending|wip|todo|placeholder|in review|re-?do|art-lane)\\b/i;\nconst STUB=/^(pre-evolution of|evolution of) [^.]*\\.?$|art-lane design\\.?$/i; /* cleanup 11-12 */',
     "DEVNOTE")
_sub('const lore=publicText(v.lore||d.lore||v.entry,v);',
     'const lore0=publicText(v.lore||d.lore||v.entry,v), lore=STUB.test(lore0.trim())?"":lore0;',
     "lore stub")
if "function blurbHTML" not in s:  # step 9b rewrites this line
    _sub('return`${lore?`<p class="blurb">${esc(lore)}</p>`:""}${factsHTML(v,e)}',
         'return`${lore?`<p class="blurb">${esc(lore)}</p>`:`<p class="blurb mut">No field notes yet.</p>`}${factsHTML(v,e)}',
         "empty about")
# 8f. "Surprise me" was a bare "?" (it read as help): a shuffle mark instead.
_sub('<span class="qm" aria-hidden="true">?</span>',
     '<span class="qm" aria-hidden="true"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 7h3.5c2 0 3.2 1 4.3 2.7l2.4 3.6c1.1 1.7 2.3 2.7 4.3 2.7H21M3 17h3.5c2 0 3.2-1 4.3-2.7M13.2 9.5c1.1-1.7 2.3-2.5 4.3-2.5H21M18 4l3 3-3 3M18 14l3 3-3 3"/></svg></span>',
     "surprise icon")
# 8g. phones: no orphan "·" at the start of a wrapped kicker line.
CLEAN_CSS = """<style>/* cleanup-1112 (tools/bokidex/patch.py step 8) */
#surprise .qm{display:flex;align-items:center;justify-content:center}
.blurb.mut{color:var(--mute)}
@media (max-width:759px){.mkick{gap:4px 14px}.mkick span::before{display:none}}
</style>
"""
if "cleanup-1112" not in s:
    s = s.replace("</head>", CLEAN_CSS + "</head>", 1)

# 9. Detail polish 11-12 (dex-detail-1111): a short About with More, a big 3D button, a larger viewer, no generated-looking
#    decoration. Same rules as step 8: literal replaces, skipped when already applied.
# 9a. About summary: data.json gets "short" (the first sentence of the lore) on every entry and form whose lore has more
#     than one sentence. The page shows it with a "More" toggle; the full lore stays the text behind More. No new words.
import json
DP = os.path.join(os.path.dirname(P), "d", "data.json")
if os.path.exists(DP):
    raw = open(DP, encoding="utf-8").read(); D = json.loads(raw)
    def _short(lore):
        parts = re.split(r'(?<=[.!?])\s+(?=[A-Z"“])', (lore or "").strip(), maxsplit=1)
        return parts[0] if len(parts) == 2 else ""
    for e in D["dex"]["entries"]:
        for x in [e] + list(e.get("forms") or []):
            sh = _short(x.get("lore"))
            if sh: x["short"] = sh
            else: x.pop("short", None)
    out = json.dumps(D, separators=(",", ":"), ensure_ascii=False)
    if out != raw:
        open(DP, "w", encoding="utf-8").write(out); print("bokidex/d/data.json: About summaries written")
# 9b. About: summary + inline More / Less (instead of the whole lore as one block)
_sub('function tabBody(v,e,d){',
     'function blurbHTML(lore,sh){ /* detail 11-12: the short line, the rest behind More */\n'
     '  if(!lore)return`<p class="blurb mut">No field notes yet.</p>`;\n'
     '  if(!sh||!lore.startsWith(sh)||lore.length<sh.length+8)return`<p class="blurb">${esc(lore)}</p>`;\n'
     '  return`<p class="blurb">${esc(sh)}<span class="bl-rest" id="blrest" hidden> ${esc(lore.slice(sh.length).trim())}</span> <button type="button" class="rm" data-rm aria-expanded="false" aria-controls="blrest">More</button></p>`}\n'
     'function tabBody(v,e,d){', "blurbHTML")
_sub('return`${lore?`<p class="blurb">${esc(lore)}</p>`:`<p class="blurb mut">No field notes yet.</p>`}${factsHTML(v,e)}',
     'return`${blurbHTML(lore,v.short)}${factsHTML(v,e)}', "about body")
# the old "read more" remnants (clamped blurb + [data-more] click) are replaced by the toggle above
s = re.sub(r'\ndocument\.addEventListener\("click",ev=>\{const b=ev\.target\.closest\("\[data-more\]"\)[^\n]*', '\ndocument.addEventListener("click",ev=>{const b=ev.target.closest("[data-rm]");if(!b)return;const r=$("#blrest"),on=r.hidden;r.hidden=!on;b.textContent=on?"Less":"More";b.setAttribute("aria-expanded",String(on));fitDetail()}); /* detail 11-12 */', s, count=1)
s = s.replace(".blurb.clamp{display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden}\n", "")
s = re.sub(r"\.readmore\{[^\n]*\n\.readmore:hover\{[^\n]*\n", "", s, count=1)
# 9c. a real 3D button under the picture (was a tiny "3D" pill on the picture); the picture itself stays tappable
_sub('${vt.length?`<span class="go">${vt.map(x=>x.label).join(" \u00b7 ")}</span>`:""}</button>${sxb}',
     '</button>${vt.length?`<button class="v3d" type="button" data-v3d="${(vt.find(x=>x.k==="3d")||vt[0]).k}"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.5 3.5 7v10l8.5 4.5 8.5-4.5V7zM3.5 7l8.5 4.5L20.5 7M12 11.5v10"/></svg>${vt.some(x=>x.k==="3d")?"View in 3D":"Turnaround"}</button>`:""}${sxb}', "3d button")
_sub('<button class="herobtn" type="button" id="herobtn" ${vt.length?"":"disabled"}', '<button class="herobtn" type="button" id="herobtn" ${vt.length?\'tabindex="-1"\':"disabled"}', "herobtn tabindex")
_sub('if(t.closest?.("#herobtn")&&!t.closest("#herobtn").disabled){openViewer();return}',
     'if(t.closest?.("[data-v3d]")){openViewer(t.closest("[data-v3d]").dataset.v3d);return}\n  if(t.closest?.("#herobtn")&&!t.closest("#herobtn").disabled){openViewer();return}', "3d click")
s = re.sub(r"\.herobtn \.go\{[^\n]*\n", "", s)
s = re.sub(r"  \.herobtn \.go\{[^\n]*\n", "", s)
_sub('($("#herobtn")||document.body).focus?.({preventScroll:true})}', '($("[data-v3d]")||$("#herobtn")||document.body).focus?.({preventScroll:true})}', "viewer focus return")
# 9d. viewer: no lone "3D" tab (the button already said it), a spinner while it loads
_sub('$("#vtabs").innerHTML=v.map(', '$("#vtabs").innerHTML=v.length<2?"":v.map(', "single tab")
_sub('<div class="vmsg">Loading the 3D model\u2026</div>', '<div class="vmsg load">Loading the 3D model</div>', "loading")
DETAIL_CSS = """<style>/* detail-1112 (tools/bokidex/patch.py step 9) */
/* 3D button: large, filled, under the picture */
.v3d{display:inline-flex;align-items:center;justify-content:center;gap:10px;align-self:center;min-width:188px;min-height:48px;padding:0 24px 0 20px;border:0;border-radius:999px;background:var(--accent);color:var(--bg);font:700 1rem/1 var(--body);cursor:pointer;box-shadow:0 8px 18px -10px rgba(0,0,0,.5);transition:filter .15s,transform .15s}
.v3d svg{width:22px;height:22px;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linejoin:round;stroke-linecap:round;flex:none}
.v3d:hover{filter:brightness(1.08)}.v3d:active{transform:scale(.97)}
.v3d:focus-visible{outline:2px solid var(--ink);outline-offset:3px}
/* About: short line, More toggle */
.blurb .rm{background:none;border:0;padding:6px 4px;margin:-6px 0;font:700 .92rem var(--body);color:var(--accent);cursor:pointer;white-space:nowrap}
.blurb .rm:hover{text-decoration:underline}.blurb .rm:focus-visible{outline:2px solid var(--accent);outline-offset:1px;border-radius:4px}
/* plain title, no gradient text, no glow, no ring */
.mh{background:none;-webkit-background-clip:border-box;background-clip:border-box;color:var(--ink);padding-bottom:0;margin-bottom:0}
.mhead .chip{box-shadow:none}
.mline,.aura .ring{display:none}
.mart .herobtn .hero.cut img{filter:var(--hshadow)}
/* viewer: bigger on desktop, edge to edge on phones, the drag belongs to the model */
.vbox{width:min(1240px,100%);height:100%}
.vhead .t{word-spacing:.3em}
.vtabs button{min-height:36px;padding:6px 16px}
#vbody,#vbody model-viewer{touch-action:none;overscroll-behavior:contain}
.vmsg.load{align-content:center;justify-items:center;row-gap:14px}
.vmsg.load::before{content:"";width:30px;height:30px;border-radius:50%;border:3px solid var(--line);border-top-color:var(--accent);animation:spin .8s linear infinite}
@media (max-width:759px){
  #viewer{padding:0}.vbox{border:0;border-radius:0}
  .vhead{padding:max(10px,env(safe-area-inset-top,0px)) 12px 10px}
  .v3d{min-width:0;width:min(100%,220px);min-height:46px}
  .mart{gap:10px}
  /* prev / next sit beside the picture, not over the text */
  .mnav{top:calc(max(14px,env(safe-area-inset-top,0px)) + 62px);bottom:auto;width:40px;height:40px}
  .mnav.pv{left:10px}.mnav.nx{right:10px}
  .minfo{padding-bottom:calc(28px + env(safe-area-inset-bottom,0px))}
}
</style>
"""
if "detail-1112" not in s:
    s = s.replace("</head>", DETAIL_CSS + "</head>", 1)

if s != before:
    open(P, "w", encoding="utf-8").write(s); print("bokidex/index.html patched")
else:
    print("bokidex/index.html already up to date")
