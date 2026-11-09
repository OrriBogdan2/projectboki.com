/* Bokidex owner panel (self-contained; injected by bokidex-site-export). Reads only window.BKX (set by the export's gate:
   BKX.data() = decrypted bundle, BKX.blob(path) = decrypted image URL) and talks to the rating API. Without the owner
   code nothing appears except the small "Owner" button. */
(function () {
  "use strict";
  var API = "https://87-99-130-182.sslip.io";           // rating API (Caddy -> bokidex-api on the Hetzner box)
  var LSK = "bokidex-owner", code = "", ratings = {}, filter = "todo", panel = null, BAR = 8.5, drafts = {}, unlocked = {}, kindF = "all", sortF = "name", qF = "", shown = 40, keyfn = null, lb = null, lbList = [], lbI = 0, bar = null;
  var css = ".bxo-btn{position:fixed;right:12px;bottom:calc(12px + env(safe-area-inset-bottom));z-index:1000;font:700 14px system-ui,sans-serif;" +
    "padding:10px 18px;border-radius:999px;border:0;background:#e8562a;color:#fff;box-shadow:0 4px 14px rgba(0,0,0,.35);opacity:1;cursor:pointer}" +
    ".bxo-btn:hover{opacity:1}.bxo-ov{position:fixed;inset:0;z-index:80;background:var(--bg,#fafafa);color:var(--ink,#111);overflow:auto;-webkit-overflow-scrolling:touch;font:15px/1.4 system-ui,sans-serif}" +
    ".bxo-top{position:sticky;top:0;z-index:2;display:flex;gap:10px;align-items:center;flex-wrap:wrap;padding:10px 14px;background:var(--panel,#fff);border-bottom:1px solid var(--line,#ddd)}" +
    ".bxo-top h2{margin:0;font-size:1.05rem;flex:1;min-width:120px}.bxo-top select,.bxo-top button{font:inherit;padding:6px 10px;border-radius:8px;border:1px solid var(--line,#ccc);background:var(--bg,#fff);color:inherit}" +
    ".bxo-top a{color:var(--mute,#666);cursor:pointer;text-decoration:underline;font-size:.85rem}" +
    ".bxo-body{max-width:900px;margin:0 auto;padding:10px 14px 60px}.bxo-sp{margin:18px 0 6px;font-size:1.05rem;font-weight:800}" +
    ".bxo-card{border:1px solid var(--line,#ddd);background:var(--panel,#fff);border-radius:14px;padding:12px;margin:0 0 12px;display:grid;gap:8px}" +
    ".bxo-imgs{display:flex;gap:8px;overflow-x:auto}.bxo-imgs img{height:min(46vh,340px);max-width:100%;object-fit:contain;border-radius:10px;background:rgba(127,127,127,.12);flex:none;cursor:zoom-in}" +
    ".bxo-meta{font-size:.82rem;color:var(--mute,#666)}" +
    ".bxo-row{display:flex;gap:10px;align-items:center}.bxo-row input[type=range]{flex:1;min-width:0;height:32px}.bxo-sc{font-weight:800;min-width:2.6em;text-align:right}" +
    ".bxo-card textarea{width:100%;box-sizing:border-box;min-height:54px;border-radius:10px;border:1px solid var(--line,#ccc);background:var(--bg,#fff);color:inherit;padding:8px;font:inherit}" +
    ".bxo-act{display:flex;gap:8px;flex-wrap:wrap}.bxo-act button{flex:1;min-width:84px;height:44px;border-radius:10px;border:1px solid var(--line,#ccc);background:var(--bg,#fff);color:inherit;font:700 .95rem system-ui,sans-serif;cursor:pointer}" +
    ".bxo-act .a{border-color:#2e9e5b;color:#2e9e5b}.bxo-act .r{border-color:#d98a1c;color:#d98a1c}.bxo-act .x{border-color:#cf4444;color:#cf4444}.bxo-act button:disabled{opacity:.5}" +
    ".bxo-st{font-size:.85rem;font-weight:700;min-height:1.2em}.bxo-st.ok{color:#2e9e5b}.bxo-st.er{color:#cf4444}.bxo-empty{padding:40px 0;text-align:center;color:var(--mute,#666)}" +
    ".bxo-modal{position:fixed;inset:0;z-index:90;background:rgba(0,0,0,.5);display:grid;place-items:center;padding:20px}" +
    ".bxo-modal form{background:var(--panel,#fff);color:var(--ink,#111);border-radius:16px;padding:20px;width:min(340px,100%);display:grid;gap:10px;font:15px system-ui,sans-serif}" +
    ".bxo-ctx{display:grid;gap:6px;border-top:1px solid var(--line,#ddd);padding-top:8px}.bxo-cmp{display:flex;gap:8px;overflow-x:auto}" +
    ".bxo-fig{margin:0;flex:0 0 auto;width:96px;text-align:center;font-size:12px;color:var(--muted,#777)}.bxo-fig img{width:96px;height:96px;object-fit:contain;border-radius:10px;border:3px solid transparent;background:var(--bg,#f3f3f3)}" +
    ".s-cur img{border-color:#2e6fdb}.s-ap img{border-color:#2e9d4f}.s-redo img{border-color:#d89a1c}.s-rej img{border-color:#c33}" +
    ".bxo-bar{display:grid;gap:8px;padding:10px 14px 0;max-width:900px;margin:0 auto}.bxo-tabs,.bxo-ctl{display:flex;gap:6px;flex-wrap:wrap;align-items:center}" +
    ".bxo-tabs button{flex:1;min-width:60px;padding:0 4px;height:40px;border-radius:10px;border:1px solid var(--line,#ccc);background:var(--bg,#fff);color:inherit;font:700 .76rem system-ui,sans-serif;cursor:pointer}.bxo-tabs button[aria-pressed=true]{background:#2e6fdb;border-color:#2e6fdb;color:#fff}" +
    ".bxo-ctl select,.bxo-ctl input{font:inherit;height:36px;padding:0 8px;border-radius:8px;border:1px solid var(--line,#ccc);background:var(--bg,#fff);color:inherit;min-width:0;flex:1 1 110px}.bxo-cnt{display:flex;gap:6px 14px;flex-wrap:wrap;font-size:.8rem;color:var(--mute,#666)}.bxo-cnt b{color:var(--ink,#111)}" +
    ".bxo-card{scroll-margin-top:56px}.bxo-card:focus{outline:2px solid #2e6fdb;outline-offset:2px}.bxo-hd{display:flex;gap:8px;align-items:center;justify-content:space-between}.bxo-hd b{font-size:1rem}" +
    ".bxo-pill{font-size:.75rem;font-weight:800;padding:3px 9px;border-radius:999px;border:1px solid currentColor;white-space:nowrap}.bxo-pill.ok{color:#2e9e5b}.bxo-pill.rd{color:#d98a1c}.bxo-pill.rj{color:#cf4444}.bxo-pill.wt{color:var(--mute,#666)}" +
    ".bxo-auto{border-top:1px solid var(--line,#ddd);padding-top:8px;font-size:.88rem}.bxo-auto p{margin:4px 0}.bxo-auto ul{margin:4px 0;padding-left:18px}.bxo-sco{font-weight:800}.bxo-sco.hi{color:#2e9e5b}.bxo-sco.lo{color:#cf4444}" +
    ".bxo-num{width:70px;height:36px;border-radius:8px;border:1px solid var(--line,#ccc);background:var(--bg,#fff);color:inherit;font:inherit;text-align:center}" +
    ".bxo-act .on{color:#fff}.bxo-act .a.on{background:#2e9e5b}.bxo-act .r.on{background:#d98a1c}.bxo-act .x.on{background:#cf4444}.bxo-card.lk .bxo-row,.bxo-card.lk textarea{opacity:.45}.bxo-ctx details{font-size:.8rem;color:var(--mute,#666)}.bxo-ctx summary{cursor:pointer}" +
    ".bxo-more{height:44px;border-radius:10px;border:1px solid var(--line,#ccc);background:var(--bg,#fff);color:inherit;font:700 .95rem system-ui,sans-serif;width:100%;cursor:pointer}.bxo-dl{color:#2e6fdb;cursor:pointer;text-decoration:underline}" +
    ".bxo-lb{position:fixed;inset:0;z-index:100;background:rgba(0,0,0,.88);display:flex;align-items:center;justify-content:center}.bxo-lb img{max-width:96vw;max-height:92vh;object-fit:contain}" +
    ".bxo-lb button{position:absolute;top:50%;width:48px;height:64px;margin-top:-32px;border:0;border-radius:10px;background:rgba(255,255,255,.2);color:#fff;font:700 28px system-ui;cursor:pointer}.bxo-lb .p{left:6px}.bxo-lb .n{right:6px}" +
    ".bxo-modal input{height:44px;border-radius:10px;border:1px solid var(--line,#ccc);padding:0 12px;font:inherit;background:var(--bg,#fff);color:inherit}.bxo-modal button{height:42px;border-radius:10px;border:0;background:#2e6fdb;color:#fff;font:700 1rem system-ui}";
  function h(tag, props, kids) {
    var e = document.createElement(tag), k;
    for (k in (props || {})) { if (k === "text") e.textContent = props[k]; else if (k === "class") e.className = props[k]; else e[k] = props[k]; }
    (kids || []).forEach(function (c) { if (c) e.appendChild(c); });
    return e;
  }
  function store(v) { try { if (v == null) localStorage.removeItem(LSK); else localStorage.setItem(LSK, v); } catch (e) {} }
  function load() { try { return localStorage.getItem(LSK) || ""; } catch (e) { return ""; } }
  function api(path, opts) {
    opts = opts || {}; opts.headers = Object.assign({ "X-Owner-Code": code }, opts.headers || {});
    return fetch(API + path, opts).then(function (r) { return r.json().catch(function () { return {}; }).then(function (j) { j._status = r.status; return j; }); });
  }
  function style() { if (!document.getElementById("bxo-css")) { var s = h("style", { id: "bxo-css" }); s.textContent = css; document.head.appendChild(s); } }

  function ask(msg) {
    return new Promise(function (res) {
      var inp = h("input", { type: "password", autocomplete: "off", placeholder: "Owner code" }), err = h("div", { class: "bxo-st er", text: msg || "" });
      var m = h("div", { class: "bxo-modal" }, [h("form", {}, [h("b", { text: "Owner code" }), inp, err, h("button", { type: "submit", text: "Unlock" }),
        h("a", { text: "Cancel", style: "text-align:center;cursor:pointer;color:#888" })])]);
      var f = m.firstChild; f.lastChild.onclick = function () { m.remove(); res(null); };
      f.onsubmit = function (e) { e.preventDefault(); m.remove(); res(inp.value); };
      document.body.appendChild(m); inp.focus();
    });
  }
  function signin(tryStored) {
    var c = tryStored ? load() : "", msg = "";
    var step = c ? Promise.resolve(c) : ask("");
    return step.then(function (v) {
      if (!v) return false; code = v;
      return api("/whoami").then(function (j) {
        if (j.ok) { store(code); return true; }
        store(null); code = "";
        if (j._status === 429) return ask("Too many tries, wait a minute.").then(function () { return false; });
        return ask("Wrong code.").then(function (v2) { if (!v2) return false; code = v2; return api("/whoami").then(function (j2) { if (j2.ok) { store(code); return true; } code = ""; return false; }); });
      }, function () { code = ""; alert("Could not reach the rating service."); return false; });
    });
  }

  function gensAll() {
    var D = window.BKX && window.BKX.data(); if (!D) return [];
    var pend = (D.pending || []).map(function (g) { return Object.assign({ _p: 1 }, g); });
    var appr = (D.gens || []).map(function (g) { return Object.assign({ _p: 0, status: "approved" }, g); });
    return pend.concat(appr);
  }
  function isNum(n) { return typeof n === "number" && !isNaN(n); }
  function fmt(n) { return isNum(+n) && n != null && n !== "" ? (+n).toFixed(1) : "-"; }
  function label(r) { return (r.decision === "approve" ? "Approved" : r.decision === "reject" ? "Rejected" : r.decision === "redo" ? "Redo" : "Rated") + " " + (+r.score).toFixed(1); }
  function toEST(t) { return t ? new Date(t * 1000).toLocaleString("en-US", { timeZone: "America/New_York", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }) + " EST" : ""; }
  function ago(ms) { var m = Math.round((Date.now() - ms) / 60000); return m < 1 ? "just now" : m < 60 ? m + " min ago" : m < 1440 ? Math.round(m / 60) + " h ago" : Math.round(m / 1440) + " d ago"; }
  /* current decision: the owner's saved rating wins, else the auto decision. Same buckets as the claude.ai Edit Room tabs. */
  function curDec(g) {
    var r = ratings[g.id]; if (r) return r.decision || (+r.score >= BAR ? "approve" : "redo");
    return g.status === "approved" || g.status === "to2d" ? "approve" : g.status === "rejected" ? "reject" : g.status === "redo" ? "redo" : null;
  }
  function bucket(g) { var d = curDec(g); return d === "approve" ? "ok" : d === "redo" || d === "reject" ? "redo" : "todo"; }
  function scoreOf(g) { var r = ratings[g.id]; return r ? +r.score : isNum(+g.cpu_score) && g.cpu_score != null ? +g.cpu_score : -1; }
  /* owner 11-09: same context as the claude.ai Edit Room: current dex art, other versions of this name, evo line */
  function slugOf(n) { return String(n || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, ""); }
  function dexEntry(name) {
    var D = window.BKX && window.BKX.data(), j = D && D.dex; if (!j) return null;
    var es = Array.isArray(j) ? j : (j.entries || []), al = j.aliases || {}, k = String(name || "").toLowerCase().trim();
    var id = al[k] || al[slugOf(k)] || al[slugOf(k).replace(/-/g, "")]; if (!id) return null;
    var by = {}; es.forEach(function (e) { by[e.id] = e; }); return { e: by[id], by: by };
  }
  /* lightbox over the review panel: tap to close, arrows (keys or buttons) cycle through the card's images */
  function zoomShow() { lb.firstChild.src = lbList[lbI].src; }
  function zoomStep(d) { if (lbList.length > 1) { lbI = (lbI + d + lbList.length) % lbList.length; zoomShow(); } }
  function zoomClose() { if (lb) { lb.remove(); lb = null; } }
  function zoom(els, i) {
    els = els.filter(function (e) { return e.src; }); i = els.indexOf(els[i]) < 0 ? 0 : i; if (!els.length) return;
    lbList = els; lbI = i; zoomClose();
    var p = h("button", { class: "p", text: "<", type: "button" }), n = h("button", { class: "n", text: ">", type: "button" });
    p.onclick = function (e) { e.stopPropagation(); zoomStep(-1); }; n.onclick = function (e) { e.stopPropagation(); zoomStep(1); };
    lb = h("div", { class: "bxo-lb" }, [h("img", { alt: "" })].concat(els.length > 1 ? [p, n] : [])); lb.onclick = zoomClose;
    document.body.appendChild(lb); zoomShow();
  }
  function fig(src, cls, cap) {
    var im = h("img", { alt: cap, loading: "lazy" }), f = h("figure", { class: "bxo-fig " + (cls || "") }, [im, h("figcaption", { text: cap })]);
    if (src) window.BKX.blob(src).then(function (u) { im.src = u; }).catch(function () {}); im.onclick = function () { zoom([im], 0); };
    return f;
  }
  function roleOf(g) {
    if (g.kind === "portrait") return ["Portrait", "A close-up for menus and cards. It never replaces the Bokidex art."];
    if (g.form === "f") return ["Female look", "An alternate female look, kept alongside the main art. It never replaces it."];
    if (g.kind === "boki3d") return ["3D model", "Built from the approved 2D sheet. Judge it against that sheet."];
    if ((g.attempt || 1) > 1) return ["Redo, attempt " + g.attempt, "A new attempt after an earlier one was sent back."];
    return ["Main design", "The first design for this Boki from its brief."];
  }
  function effect(g, e) {
    if (g.kind === "portrait" || g.form === "f") return "Approving keeps it as an extra; the Bokidex art stays.";
    if (g.kind === "boki3d") return "Approving marks the 3D model ready; the 2D art stays the Bokidex picture.";
    if (!(e && e.hero)) return "Nothing approved for this Boki yet: approving this makes it the Bokidex art.";
    return "Approving makes this the Bokidex art (the newest approved 2D wins), replacing the one in the Bokidex now.";
  }
  function stName(st) { return st === "approve" || st === "approved" || st === "to2d" ? "approved" : st === "redo" ? "sent back" : st === "reject" || st === "rejected" ? "rejected" : "not decided"; }
  function ctx(g) {
    var box = h("div", { class: "bxo-ctx" }), x = dexEntry(g.name), e = x && x.e, ro = roleOf(g);
    var sib = gensAll().filter(function (o) { return o.id !== g.id && (o.name || "") === (g.name || "") && (o.kind || "") === (g.kind || ""); });
    var apN = sib.filter(function (o) { return curDec(o) === "approve"; }).length;
    box.appendChild(h("div", { class: "bxo-meta", text: ro[0] + ". " + ro[1] }));
    if (curDec(g) !== "approve" || ratings[g.id]) box.appendChild(h("div", { class: "bxo-meta", text: effect(g, e) }));
    if (apN) box.appendChild(h("div", { class: "bxo-st er", text: "Already approved for " + (g.name || "this Boki") + ": " + apN + " other version" + (apN > 1 ? "s" : "") + " of this kind (green below). Approve this too only if you want both kept; otherwise Reject." }));
    else if (curDec(g) !== "approve") box.appendChild(h("div", { class: "bxo-st ok", text: "Nothing of this kind approved for " + (g.name || "this Boki") + " yet." }));
    if (e && e.hero) { box.appendChild(h("div", { class: "bxo-meta", text: "In the Bokidex now" })); box.appendChild(h("div", { class: "bxo-cmp" }, [fig(e.hero, "s-cur", e.name || e.id)])); }
    if (sib.length) {
      box.appendChild(h("div", { class: "bxo-meta", text: "Other versions" }));
      box.appendChild(h("div", { class: "bxo-cmp" }, sib.slice(0, 8).map(function (o) {
        var st = curDec(o), cls = st === "approve" ? "s-ap" : st === "redo" ? "s-redo" : st === "reject" ? "s-rej" : "";
        return fig((o.images || [])[0], cls, (o.attempt ? "#" + o.attempt + " " : "") + stName(st) + (scoreOf(o) >= 0 ? " " + fmt(scoreOf(o)) : ""));
      })));
      var all = sib.concat([g]).sort(function (a, b) { return (a.created || 0) - (b.created || 0) || (a.attempt || 1) - (b.attempt || 1); });
      var det = h("details", {}, [h("summary", { text: "History, " + all.length + " attempts" })]);
      all.forEach(function (o) {
        var rr = ratings[o.id], t = [o.id === g.id ? "(this)" : "", "#" + (o.attempt || 1), toEST(o.created), stName(curDec(o)),
          o.cpu_score != null ? "judge " + fmt(o.cpu_score) : "", rr ? "you " + fmt(rr.score) : "", rr && rr.note ? "note: " + rr.note : ""].filter(Boolean).join(" · ");
        det.appendChild(h("div", { text: t }));
      });
      box.appendChild(det);
    }
    if (e && e.chain && e.chain.length > 1) {
      box.appendChild(h("div", { class: "bxo-meta", text: "Evolution line" }));
      box.appendChild(h("div", { class: "bxo-cmp" }, e.chain.map(function (i) { var c = x.by[i]; return c ? fig(c.hero, c.id === e.id ? "s-cur" : "", (c.name || c.id) + (c.id === e.id ? " (this)" : "")) : null; })));
    }
    return box;
  }
  function swap(g, root) { var n = card(g); if (root.parentNode) { var f = document.activeElement === root; root.parentNode.replaceChild(n, root); if (f) n.focus({ preventScroll: true }); } updBar(); }
  function card(g) {
    var r = ratings[g.id], d = drafts[g.id], dec = curDec(g), locked = !!dec && !unlocked[g.id], imgs = h("div", { class: "bxo-imgs" }), st = h("div", { class: "bxo-st" });
    var root = h("div", { class: "bxo-card" + (locked ? " lk" : ""), tabIndex: -1 }); root.setAttribute("data-id", g.id);
    var els = [];
    (g.images || []).concat(g.sheet ? [g.sheet] : []).forEach(function (p, i) {
      var im = h("img", { alt: g.name || g.id, loading: "lazy" }); els.push(im); im.onclick = function () { zoom(els, i); };
      window.BKX.blob(p).then(function (u) { im.src = u; }).catch(function () {}); imgs.appendChild(im);
    });
    var def = d ? d.score : r ? +r.score : (g.cpu_score != null ? +g.cpu_score : BAR); if (!isNum(def)) def = BAR;
    var rg = h("input", { type: "range", min: 0, max: 10, step: 0.1, value: def, disabled: locked, "aria-label": "Rating" });
    var num = h("input", { type: "number", min: 0, max: 10, step: 0.1, value: (+def).toFixed(1), disabled: locked, class: "bxo-num", "aria-label": "Rating out of 10" });
    var note = h("textarea", { placeholder: "Note (what to fix, or why)", value: d ? d.note : (r && r.note || ""), disabled: locked });
    function keep() { drafts[g.id] = { score: parseFloat(num.value), note: note.value }; }
    rg.oninput = function () { num.value = (+rg.value).toFixed(1); keep(); };
    num.oninput = function () { if (num.value !== "") rg.value = num.value; keep(); };
    note.oninput = keep;
    var pill = dec === "approve" ? ["ok", "Approved"] : dec === "redo" ? ["rd", "Redo queued"] : dec === "reject" ? ["rj", "Rejected"] : ["wt", "Needs your rating"];
    var de = dexEntry(g.name), dl = null;
    if (de && de.e) { dl = h("a", { class: "bxo-dl", text: "In Bokidex as #" + de.e.num }); dl.onclick = function () { close(); try { location.hash = "#boki-" + de.e.id; } catch (er) {} }; }
    var meta = h("div", { class: "bxo-meta" }, [h("span", { text: [g.kind, g.form, "attempt " + (g.attempt || 1), toEST(g.created)].filter(Boolean).join(" · ") + (dl ? " · " : "") })]);
    if (dl) meta.appendChild(dl);
    var kids = [h("div", { class: "bxo-hd" }, [h("b", { text: g.name || g.id }), h("span", { class: "bxo-pill " + pill[0], text: pill[1] })]), meta, imgs, ctx(g)];
    var cs = g.cpu_score != null ? +g.cpu_score : null;
    if (cs != null || g.cpu_reason || (g.cpu_fixes && g.cpu_fixes.length)) {
      var au = h("div", { class: "bxo-auto" }, [h("div", {}, [h("b", { text: "Auto judge " }), h("span", { class: "bxo-sco " + (cs == null ? "" : cs >= BAR ? "hi" : "lo"), text: fmt(cs) + " / 10 (ship bar " + BAR + ")" })])]);
      if (g.cpu_reason) au.appendChild(h("p", { text: String(g.cpu_reason).slice(0, 400) }));
      if (g.cpu_fixes && g.cpu_fixes.length) au.appendChild(h("ul", {}, g.cpu_fixes.map(function (f) { return h("li", { text: String(f) }); })));
      kids.push(au);
    }
    function verdict() {
      var rr = ratings[g.id];
      if (rr) return "Your " + fmt(rr.score) + " overrides the judge (saved " + ago(rr.at) + "). It applies at the next sync, within 10 minutes.";
      if (g.status && g.status !== "approved") return "Auto-decided: " + g.status + ". Rate it to override.";
      if (g.status === "approved") return "Approved.";
      var left = g.created ? g.created + 1800 - Date.now() / 1000 : 1;
      return left > 0 ? "If you don't rate it, the judge's " + fmt(cs) + " decides about 30 minutes after it was posted." : "Not rated; the judge's " + fmt(cs) + " decides at the next sync.";
    }
    var btns = [["a", "Approve", "approve"], ["r", "Redo", "redo"], ["x", "Reject", "reject"]].map(function (b) {
      var lit = dec === b[2], bt = h("button", { class: b[0] + (lit ? " on" : ""), text: b[1], type: "button", disabled: locked && !lit }); bt.setAttribute("aria-pressed", lit ? "true" : "false");
      bt.onclick = function () {
        if (locked) { unlocked[g.id] = 1; swap(g, root); return; }
        var v = parseFloat(num.value), base = isNaN(v) ? BAR : Math.min(10, Math.max(0, v));
        var score = Math.round((b[2] === "approve" ? Math.max(base, BAR) : Math.min(base, BAR - 0.1)) * 10) / 10;
        btns.forEach(function (x) { x.disabled = true; }); st.className = "bxo-st"; st.textContent = "Saving...";
        api("/rate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ gen: g.id, score: score, note: note.value, decision: b[2] }) })
          .then(function (j) {
            if (j.ok) { ratings[g.id] = j.saved; delete drafts[g.id]; delete unlocked[g.id]; swap(g, root); return; }
            btns.forEach(function (x) { x.disabled = false; }); st.className = "bxo-st er"; st.textContent = j._status === 401 ? "Code no longer valid, sign in again." : "Not saved: " + (j.error || j._status);
          }, function () { btns.forEach(function (x) { x.disabled = false; }); st.className = "bxo-st er"; st.textContent = "Not saved: no connection."; });
      }; return bt;
    });
    kids.push(h("div", { class: "bxo-row" }, [rg, num]), note, h("div", { class: "bxo-act" }, btns), st);
    if (r) { st.className = "bxo-st ok"; st.textContent = "Saved: " + label(r) + " " + ago(r.at) + (locked ? ". Locked: press the lit box to change it." : ""); }
    else if (locked) { st.className = "bxo-st"; st.textContent = "Locked: press the lit box to change it."; }
    kids.push(h("div", { class: "bxo-meta", text: verdict() }));
    kids.forEach(function (k) { if (k) root.appendChild(k); });
    return root;
  }
  function visible() {
    var ql = qF.toLowerCase();
    return gensAll().filter(function (g) {
      if (filter !== "all" && bucket(g) !== filter) return false;
      if (kindF !== "all" && (g.kind || "") !== kindF) return false;
      return !ql || String(g.name || g.id).toLowerCase().indexOf(ql) >= 0;
    });
  }
  function updBar() {
    if (!panel || !bar) return;
    var all = gensAll(), c = { todo: 0, ok: 0, redo: 0 }, att = 0, an = 0;
    all.forEach(function (g) { c[bucket(g)]++; if (bucket(g) === "ok") { att += g.attempt || 1; an++; } });
    var names = { todo: "To rate", redo: "Redo queued", ok: "Approved", all: "All" }, cn = { todo: c.todo, redo: c.redo, ok: c.ok, all: all.length };
    bar.tabs.forEach(function (b) { b.textContent = names[b.k] + " (" + cn[b.k] + ")"; b.setAttribute("aria-pressed", b.k === filter ? "true" : "false"); });
    bar.cnt.textContent = ""; [["Total", all.length], ["Approved", c.ok], ["Redo", c.redo], ["To rate", c.todo], ["Avg attempts to approval", an ? (att / an).toFixed(1) : "-"]].forEach(function (p) {
      bar.cnt.appendChild(h("span", {}, [h("b", { text: p[1] }), document.createTextNode(" " + p[0])]));
    });
  }
  function render() {
    var body = panel.querySelector(".bxo-body"), top = panel.scrollTop; body.textContent = "";
    var list = visible(), by = {}, order = [], more = 0;
    var cmp = { name: function (a, b) { return String(a.name || a.id).localeCompare(String(b.name || b.id)) || (a.attempt || 1) - (b.attempt || 1) || (a.created || 0) - (b.created || 0); },
      new: function (a, b) { return (b.created || 0) - (a.created || 0); }, old: function (a, b) { return (a.created || 0) - (b.created || 0); },
      hi: function (a, b) { return scoreOf(b) - scoreOf(a); }, lo: function (a, b) { return scoreOf(a) - scoreOf(b); } }[sortF];
    list.sort(cmp); var total = list.length; if (list.length > shown) { more = list.length - shown; list = list.slice(0, shown); }
    updBar();
    if (!list.length) body.appendChild(h("div", { class: "bxo-empty", text: filter === "todo" ? "Nothing left to rate." : "No gens in this view." }));
    if (sortF === "name") {
      list.forEach(function (g) { var k = g.name || g.id; if (!by[k]) { by[k] = []; order.push(k); } by[k].push(g); });
      order.forEach(function (k) { body.appendChild(h("div", { class: "bxo-sp", text: k + (by[k].length > 1 ? " (" + by[k].length + ")" : "") })); by[k].forEach(function (g) { body.appendChild(card(g)); }); });
    } else list.forEach(function (g) { body.appendChild(card(g)); });
    if (more) { var mb = h("button", { class: "bxo-more", type: "button", text: "Show more (" + more + " left)" }); mb.onclick = function () { shown += 40; render(); }; body.appendChild(mb); }
    panel.querySelector("h2").textContent = "Owner audit (" + total + ")"; panel.scrollTop = top;
  }
  function moveCard(d) {
    var cs = [].slice.call(panel.querySelectorAll(".bxo-card")); if (!cs.length) return;
    var a = document.activeElement, cur = a && a.closest ? a.closest(".bxo-card") : null, i = cs.indexOf(cur);
    if (i < 0) { i = 0; for (var k = 0; k < cs.length; k++) if (cs[k].getBoundingClientRect().bottom > 60) { i = k; break; } if (d < 0 && i > 0) i--; }
    else i = Math.max(0, Math.min(cs.length - 1, i + d));
    cs[i].focus({ preventScroll: true }); cs[i].scrollIntoView({ block: "start" });
  }
  function keys(e) {
    if (!panel || e.ctrlKey || e.metaKey || e.altKey) return;
    var el = document.activeElement, typing = !!el && (/^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName) || el.isContentEditable), k = e.key;
    if (document.querySelector(".bxo-modal")) return;
    if (lb) { if (k === "Escape") zoomClose(); else if (k === "ArrowRight") zoomStep(1); else if (k === "ArrowLeft") zoomStep(-1); else return; e.preventDefault(); return; }
    if (k === "Escape") { if (typing) el.blur(); else close(); e.preventDefault(); return; }
    if (typing) return;
    if (k === "ArrowDown" || k === "j") { e.preventDefault(); moveCard(1); }
    else if (k === "ArrowUp" || k === "k") { e.preventDefault(); moveCard(-1); }
    else if (k === "/") { e.preventDefault(); bar.q.focus(); }
  }
  function open() {
    style(); panel = h("div", { class: "bxo-ov" }); shown = 40;
    var out = h("a", { text: "Sign out" }); out.onclick = function () { store(null); code = ""; ratings = {}; drafts = {}; unlocked = {}; close(); };
    var x = h("button", { text: "Close", type: "button" }); x.onclick = close;
    panel.appendChild(h("div", { class: "bxo-top" }, [h("h2", { text: "Owner audit" }), out, x]));
    var tabs = [["todo", "To rate"], ["redo", "Redo queued"], ["ok", "Approved"], ["all", "All"]].map(function (t) {
      var b = h("button", { type: "button", text: t[1] }); b.k = t[0]; b.onclick = function () { filter = t[0]; shown = 40; render(); }; return b;
    });
    var kinds = []; gensAll().forEach(function (g) { if (g.kind && kinds.indexOf(g.kind) < 0) kinds.push(g.kind); }); kinds.sort();
    var ks = h("select", { "aria-label": "Kind" }, [h("option", { value: "all", text: "All kinds" })].concat(kinds.map(function (k) { return h("option", { value: k, text: k }); })));
    ks.value = kindF; ks.onchange = function () { kindF = ks.value; shown = 40; render(); };
    var ss = h("select", { "aria-label": "Sort" }, [["name", "Name, grouped"], ["new", "Newest first"], ["old", "Oldest first"], ["hi", "Score high to low"], ["lo", "Score low to high"]].map(function (o) { return h("option", { value: o[0], text: o[1] }); }));
    ss.value = sortF; ss.onchange = function () { sortF = ss.value; shown = 40; render(); };
    var qi = h("input", { type: "search", placeholder: "Search name ( / )", value: qF, "aria-label": "Search name" }); qi.oninput = function () { qF = qi.value; shown = 40; render(); };
    bar = { tabs: tabs, cnt: h("div", { class: "bxo-cnt" }), q: qi };
    bar.root = h("div", { class: "bxo-bar" }, [h("div", { class: "bxo-tabs" }, tabs), h("div", { class: "bxo-ctl" }, [ks, ss, qi]), bar.cnt]);
    panel.appendChild(bar.root); panel.appendChild(h("div", { class: "bxo-body" })); document.body.appendChild(panel); document.body.style.overflow = "hidden";
    keyfn = keys; document.addEventListener("keydown", keyfn);
    api("/ratings").then(function (j) { if (j.ok) ratings = j.ratings || {}; render(); }, function () { render(); });
  }
  function close() { zoomClose(); if (keyfn) { document.removeEventListener("keydown", keyfn); keyfn = null; } if (panel) panel.remove(); panel = null; bar = null; document.body.style.overflow = ""; }
  function init() {
    if (document.getElementById("bxo-btn")) return; style();
    var b = h("button", { id: "bxo-btn", class: "bxo-btn", text: "Owner", type: "button", title: "Owner audit" }); b.onclick = function () {
      if (!(window.BKX && window.BKX.data())) { alert("Open the Bokidex first."); return; }
      signin(true).then(function (ok) {
        if (!ok) return;
        api("/key").then(function (j) { return j.ok && j.key ? window.BKX.ownerUnlock(j.key) : null; })
          .catch(function () {}).then(open);   // pending art stays hidden if the key or bundle fails; ratings still work
      });
    };
    document.body.appendChild(b);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();
})();
