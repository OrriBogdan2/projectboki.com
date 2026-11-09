/* Bokidex owner panel (self-contained; injected by bokidex-site-export). Reads only window.BKX (set by the export's gate:
   BKX.data() = decrypted bundle, BKX.blob(path) = decrypted image URL) and talks to the rating API. Without the owner
   code nothing appears except the small "Owner" button. */
(function () {
  "use strict";
  var API = "https://87-99-130-182.sslip.io";           // rating API (Caddy -> bokidex-api on the Hetzner box)
  var LSK = "bokidex-owner", code = "", ratings = {}, filter = "pending", panel = null;
  var css = ".bxo-btn{position:fixed;right:12px;bottom:calc(12px + env(safe-area-inset-bottom));z-index:60;font:600 12px system-ui,sans-serif;" +
    "padding:7px 12px;border-radius:999px;border:1px solid var(--line,#ccc);background:var(--panel,#fff);color:var(--mute,#666);opacity:.75;cursor:pointer}" +
    ".bxo-btn:hover{opacity:1}.bxo-ov{position:fixed;inset:0;z-index:80;background:var(--bg,#fafafa);color:var(--ink,#111);overflow:auto;-webkit-overflow-scrolling:touch;font:15px/1.4 system-ui,sans-serif}" +
    ".bxo-top{position:sticky;top:0;z-index:2;display:flex;gap:10px;align-items:center;flex-wrap:wrap;padding:10px 14px;background:var(--panel,#fff);border-bottom:1px solid var(--line,#ddd)}" +
    ".bxo-top h2{margin:0;font-size:1.05rem;flex:1;min-width:120px}.bxo-top select,.bxo-top button{font:inherit;padding:6px 10px;border-radius:8px;border:1px solid var(--line,#ccc);background:var(--bg,#fff);color:inherit}" +
    ".bxo-top a{color:var(--mute,#666);cursor:pointer;text-decoration:underline;font-size:.85rem}" +
    ".bxo-body{max-width:900px;margin:0 auto;padding:10px 14px 60px}.bxo-sp{margin:18px 0 6px;font-size:1.05rem;font-weight:800}" +
    ".bxo-card{border:1px solid var(--line,#ddd);background:var(--panel,#fff);border-radius:14px;padding:12px;margin:0 0 12px;display:grid;gap:8px}" +
    ".bxo-imgs{display:flex;gap:8px;overflow-x:auto}.bxo-imgs img{height:min(46vh,340px);max-width:100%;object-fit:contain;border-radius:10px;background:rgba(127,127,127,.12);flex:none;cursor:zoom-in}" +
    ".bxo-imgs img.z{height:auto;width:100%;max-height:none;cursor:zoom-out}.bxo-meta{font-size:.82rem;color:var(--mute,#666)}" +
    ".bxo-row{display:flex;gap:10px;align-items:center}.bxo-row input[type=range]{flex:1;min-width:0;height:32px}.bxo-sc{font-weight:800;min-width:2.6em;text-align:right}" +
    ".bxo-card textarea{width:100%;box-sizing:border-box;min-height:54px;border-radius:10px;border:1px solid var(--line,#ccc);background:var(--bg,#fff);color:inherit;padding:8px;font:inherit}" +
    ".bxo-act{display:flex;gap:8px;flex-wrap:wrap}.bxo-act button{flex:1;min-width:84px;height:44px;border-radius:10px;border:1px solid var(--line,#ccc);background:var(--bg,#fff);color:inherit;font:700 .95rem system-ui,sans-serif;cursor:pointer}" +
    ".bxo-act .a{border-color:#2e9e5b;color:#2e9e5b}.bxo-act .r{border-color:#d98a1c;color:#d98a1c}.bxo-act .x{border-color:#cf4444;color:#cf4444}.bxo-act button:disabled{opacity:.5}" +
    ".bxo-st{font-size:.85rem;font-weight:700;min-height:1.2em}.bxo-st.ok{color:#2e9e5b}.bxo-st.er{color:#cf4444}.bxo-empty{padding:40px 0;text-align:center;color:var(--mute,#666)}" +
    ".bxo-modal{position:fixed;inset:0;z-index:90;background:rgba(0,0,0,.5);display:grid;place-items:center;padding:20px}" +
    ".bxo-modal form{background:var(--panel,#fff);color:var(--ink,#111);border-radius:16px;padding:20px;width:min(340px,100%);display:grid;gap:10px;font:15px system-ui,sans-serif}" +
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
  function label(r) { return (r.decision === "approve" ? "Approved" : r.decision === "reject" ? "Rejected" : r.decision === "redo" ? "Redo" : "Rated") + " " + (+r.score).toFixed(1); }
  function card(g) {
    var r = ratings[g.id], imgs = h("div", { class: "bxo-imgs" }), sc = h("span", { class: "bxo-sc" }), st = h("div", { class: "bxo-st" });
    (g.images || []).concat(g.sheet ? [g.sheet] : []).forEach(function (p) {
      var im = h("img", { alt: g.name || g.id, loading: "lazy" }); im.onclick = function () { im.classList.toggle("z"); };
      window.BKX.blob(p).then(function (u) { im.src = u; }).catch(function () {}); imgs.appendChild(im);
    });
    var def = r ? +r.score : (g.cpu_score != null ? +g.cpu_score : 7);
    var rg = h("input", { type: "range", min: 0, max: 10, step: 0.1, value: def }), note = h("textarea", { placeholder: "Note (what to fix, or why)", value: r && r.note || "" });
    function upd() { sc.textContent = (+rg.value).toFixed(1); } rg.oninput = upd; upd();
    function show(rr) { st.className = "bxo-st ok"; st.textContent = "Saved: " + label(rr); }
    if (r) show(r);
    var meta = [g.kind, g.form, g.attempt ? "attempt " + g.attempt : "", g._p && g.status && g.status !== "approved" ? "auto: " + g.status : g.status === "approved" ? "approved" : "undecided",
      g.cpu_score != null ? "auto score " + g.cpu_score : ""].filter(Boolean).join(" · ");
    var btns = [["a", "Approve", "approve"], ["r", "Redo", "redo"], ["x", "Reject", "reject"]].map(function (b) {
      var bt = h("button", { class: b[0], text: b[1], type: "button" });
      bt.onclick = function () {
        var all = btns.map(function (x) { return x; }); all.forEach(function (x) { x.disabled = true; }); st.className = "bxo-st"; st.textContent = "Saving...";
        api("/rate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ gen: g.id, score: +rg.value, note: note.value, decision: b[2] }) })
          .then(function (j) {
            all.forEach(function (x) { x.disabled = false; });
            if (j.ok) { ratings[g.id] = j.saved; rg.value = j.saved.score; upd(); show(j.saved); }
            else { st.className = "bxo-st er"; st.textContent = j._status === 401 ? "Code no longer valid, sign in again." : "Not saved: " + (j.error || j._status); }
          }, function () { all.forEach(function (x) { x.disabled = false; }); st.className = "bxo-st er"; st.textContent = "Not saved: no connection."; });
      }; return bt;
    });
    var kids = [h("div", { class: "bxo-meta", text: meta }), imgs];
    if (g.cpu_reason) kids.push(h("div", { class: "bxo-meta", text: String(g.cpu_reason).slice(0, 400) }));
    kids.push(h("div", { class: "bxo-row" }, [rg, sc]), note, h("div", { class: "bxo-act" }, btns), st);
    return h("div", { class: "bxo-card" }, kids);
  }
  function render() {
    var body = panel.querySelector(".bxo-body"); body.textContent = "";
    var list = gensAll().filter(function (g) { return filter === "all" || (g._p && !ratings[g.id]); }), by = {}, order = [];
    list.forEach(function (g) { var k = g.name || g.id; if (!by[k]) { by[k] = []; order.push(k); } by[k].push(g); });
    order.sort(function (a, b) { return a.localeCompare(b); });
    if (!order.length) body.appendChild(h("div", { class: "bxo-empty", text: filter === "pending" ? "Nothing left to audit." : "No gens." }));
    order.forEach(function (k) { body.appendChild(h("div", { class: "bxo-sp", text: k })); by[k].forEach(function (g) { body.appendChild(card(g)); }); });
    panel.querySelector("h2").textContent = "Owner audit (" + list.length + ")";
  }
  function open() {
    style(); panel = h("div", { class: "bxo-ov" });
    var sel = h("select", {}, [h("option", { value: "pending", text: "Pending" }), h("option", { value: "all", text: "All" })]); sel.value = filter;
    sel.onchange = function () { filter = sel.value; render(); };
    var out = h("a", { text: "Sign out" }); out.onclick = function () { store(null); code = ""; ratings = {}; close(); };
    var x = h("button", { text: "Close", type: "button" }); x.onclick = close;
    panel.appendChild(h("div", { class: "bxo-top" }, [h("h2", { text: "Owner audit" }), sel, out, x]));
    panel.appendChild(h("div", { class: "bxo-body" })); document.body.appendChild(panel); document.body.style.overflow = "hidden";
    api("/ratings").then(function (j) { if (j.ok) ratings = j.ratings || {}; render(); }, function () { render(); });
  }
  function close() { if (panel) panel.remove(); panel = null; document.body.style.overflow = ""; }
  function init() {
    if (document.getElementById("bxo-btn")) return; style();
    var b = h("button", { id: "bxo-btn", class: "bxo-btn", text: "Owner", type: "button", title: "Owner audit" }); b.onclick = function () {
      if (!(window.BKX && window.BKX.data())) { alert("Open the Bokidex first."); return; }
      signin(true).then(function (ok) { if (ok) open(); });
    };
    document.body.appendChild(b);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();
})();
