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
    s = s[:at] + '<script src="/assets/topbar.js?v=1" defer></script>\n' + s[at:]

if s != before:
    open(P, "w", encoding="utf-8").write(s); print("bokidex/index.html patched")
else:
    print("bokidex/index.html already up to date")
