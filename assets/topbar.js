/* Project Boki shared top bar. One self-contained file: it injects its own CSS and builds everything else.
   - Site pages (index, devlog, presskit, privacy): upgrades the existing <header id="nav"> (extra links, Sign in, hamburger).
   - Bokidex: builds its own fixed bar that takes colours and fonts from the page (light and dark).
   Sign in = Google, the same admin auth as /admin/ against the auth API; the session token is the same localStorage key,
   so signing in here signs in there. "Admin" comes from GET /api/me (role owner|admin).
   Other scripts: dispatch a `boki-signin` event on document (or call window.BokiTopbar.signIn()) to open the sign-in modal;
   listen for `boki-auth` on document (detail {user}, null when signed out) after every sign-in, sign-out or session load.
   On Bokidex the admin panel (bokidex/owner.js) uses that session token as its credential (window.BKXOwner). */
(function () {
  "use strict";
  if (window.__bokiTopbar) return; window.__bokiTopbar = 1;

  var API = "https://87-99-130-182.sslip.io/api", TOKEN_KEY = "boki_admin_token";
  try {   /* ?api= override for local testing only, same rule as /admin/ */
    var qa = new URLSearchParams(location.search).get("api");
    if (qa && /^https?:\/\/(127\.0\.0\.1|localhost)[:/]/.test(location.href) && /\/api$/.test(qa)) API = qa;
  } catch (e) {}

  var LINKS = [["Boki", "/#boki"], ["Hunters", "/#hunters"], ["FAQ", "/#faq"], ["Bokidex", "/bokidex/"], ["Devlog", "/devlog.html"], ["Press", "/presskit.html"]];
  var DEX_LINKS = LINKS; /* the same six on every page; the logo is the way home */

  var isDex = /\/bokidex(\/|$)/.test(location.pathname) && !!document.getElementById("app");
  var user = null, cfgP = null, doc = document, root = doc.documentElement;

  /* ---------- tiny helpers ---------- */
  function h(tag, props, kids) {
    var e = doc.createElement(tag); props = props || {};
    for (var k in props) { if (k === "text") e.textContent = props[k]; else if (k === "html") e.innerHTML = props[k]; else e.setAttribute(k, props[k]); }
    (kids || []).forEach(function (c) { if (c) e.appendChild(c); });
    return e;
  }
  function tok(v) { try { if (v === undefined) return localStorage.getItem(TOKEN_KEY) || ""; if (v) localStorage.setItem(TOKEN_KEY, v); else localStorage.removeItem(TOKEN_KEY); } catch (e) {} return ""; }
  function api(path, opts) {
    opts = opts || {}; var hd = { "Content-Type": "application/json" }, t = tok(); if (t) hd.Authorization = "Bearer " + t;
    return fetch(API + path, { method: opts.method || "GET", headers: hd, body: opts.body ? JSON.stringify(opts.body) : undefined })
      .then(function (r) { return r.json().catch(function () { return {}; }).then(function (j) { j._status = r.status; return j; }); });
  }
  function isAdminRole(u) { return !!u && (u.role === "owner" || u.role === "admin"); }
  function initial(u) { var n = (u && (u.display || u.email) || "?").trim(); return (n.charAt(0) || "?").toUpperCase(); }

  /* ---------- CSS ---------- */
  var CSS = [
    /* palette: site pages = the main page's dark palette; Bokidex = the page's own variables */
    ".tb-scope{--tb-bg:#0b1224;--tb-ink:#f3f6fb;--tb-mute:#aab6cc;--tb-line:rgba(255,255,255,.14);--tb-acc:#fff;--tb-acc-ink:#0a1222;--tb-fill:linear-gradient(180deg,#fff 0%,#e9eef6 100%);--tb-fill-ink:#0a1222;--tb-hover:rgba(255,255,255,.09);--tb-sh:rgba(0,0,0,.6);--tb-disp:\"Lilita\",\"Lilita One\",system-ui,sans-serif;--tb-body:\"Rubik\",system-ui,sans-serif}",
    "html.tb-dex .tb-scope{--tb-bg:var(--panel);--tb-ink:var(--ink);--tb-mute:var(--mute);--tb-line:var(--line);--tb-acc:var(--accent);--tb-acc-ink:var(--bg);--tb-fill:var(--accent);--tb-fill-ink:var(--bg);--tb-hover:color-mix(in srgb,var(--ink) 8%,transparent);--tb-sh:var(--shadow,rgba(0,0,0,.35));--tb-disp:var(--display,\"Lilita One\"),system-ui,sans-serif;--tb-body:var(--body,\"Inter\"),system-ui,sans-serif}",
    ".tb-scope *{box-sizing:border-box}",
    ".tb-bar a,.tb-panel a{text-decoration:none}",

    /* Bokidex bar (built here) */
    ".tb-bar{position:fixed;inset:0 0 auto;z-index:35;height:calc(var(--tbh) + env(safe-area-inset-top,0px));padding:env(safe-area-inset-top,0px) clamp(12px,3vw,28px) 0;display:flex;align-items:center;gap:18px;background:color-mix(in srgb,var(--tb-bg) 90%,transparent);backdrop-filter:blur(14px) saturate(1.2);-webkit-backdrop-filter:blur(14px) saturate(1.2);border-bottom:1px solid var(--tb-line);color:var(--tb-ink);font-family:var(--tb-body);transition:transform .28s cubic-bezier(.2,.8,.2,1)}",
    "html.tb-dex{--tbh:52px;--tbo:var(--tbh)}",
    "html.tb-dex.tb-hide{--tbo:0px}",
    "html.tb-dex body{padding-top:calc(var(--tbh) + env(safe-area-inset-top,0px))}",
    "html.tb-dex header:not(.tb-bar),html.tb-dex .dbar{top:calc(env(safe-area-inset-top,0px) + var(--tbo))!important;transition:top .28s cubic-bezier(.2,.8,.2,1)}",
    "html.tb-dex .tb-bar.tb-hidden{transform:translateY(-100%)}",
    ".tb-brand{display:flex;align-items:center;gap:9px;font-family:var(--tb-disp);font-size:21px;letter-spacing:.01em;color:var(--tb-ink);white-space:nowrap}",
    ".tb-brand img{width:30px;height:30px;border-radius:8px;display:block}",

    /* links */
    ".tb-links{display:flex;align-items:center;gap:clamp(2px,1vw,10px);margin:0 auto 0 8px}",
    ".tb-links a{display:inline-flex;align-items:center;height:36px;padding:0 12px;border-radius:999px;font-weight:600;font-size:14.5px;color:var(--tb-mute);transition:background .15s,color .15s}",
    ".tb-links a:hover,.tb-links a:focus-visible{background:var(--tb-hover);color:var(--tb-ink);outline:none}",
    ".tb-links a[aria-current]{color:var(--tb-ink);box-shadow:inset 0 -2px 0 var(--tb-acc);border-radius:0;padding:0 10px}",

    /* site pages: our extras inside the existing header */
    "header.nav.tb-site .links{gap:clamp(12px,2.1vw,32px)}",
    "header.nav.tb-site{transition:background .25s,border-color .25s,transform .28s cubic-bezier(.2,.8,.2,1)}",
    "header.nav.tb-site.tb-hidden{transform:translateY(-100%)}",
    "header.nav.tb-site.tb-open{background:rgba(8,13,24,.96);border-color:var(--line)}",

    /* account control */
    ".tb-acct{position:relative;display:flex;align-items:center;margin-left:auto}",
    "header.nav .tb-acct{margin-left:0}",
    ".tb-sign,.tb-user,.tb-burger{font:700 15px/1 var(--tb-body);color:var(--tb-ink);cursor:pointer;-webkit-tap-highlight-color:transparent}",
    ".tb-sign{white-space:nowrap;height:40px;padding:0 18px;border-radius:11px;border:1px solid color-mix(in srgb,var(--tb-ink) 30%,transparent);background:var(--tb-hover);transition:border-color .15s,background .15s}",
    ".tb-sign:hover,.tb-sign:focus-visible{border-color:var(--tb-ink);outline:none}",
    "html.tb-dex .tb-sign{background:var(--tb-fill);color:var(--tb-fill-ink);border-color:transparent}",
    "html.tb-dex .tb-sign:hover{filter:brightness(1.08)}",
    ".tb-user{position:relative;display:flex;align-items:center;gap:9px;height:40px;padding:0 12px 0 5px;border-radius:999px;border:1px solid var(--tb-line);background:var(--tb-hover)}",
    ".tb-user:hover,.tb-user[aria-expanded=true]{border-color:var(--tb-ink)}",
    ".tb-av{display:grid;place-items:center;width:30px;height:30px;border-radius:50%;background:var(--tb-acc);color:var(--tb-acc-ink);font:400 16px/1 var(--tb-disp)}",
    ".tb-nm{max-width:11ch;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:14px}",
    ".tb-badge{font:800 10.5px/1 var(--tb-body);letter-spacing:.09em;text-transform:uppercase;padding:4px 7px;border-radius:999px;background:var(--tb-acc);color:var(--tb-acc-ink)}",
    ".tb-menu{position:absolute;top:calc(100% + 10px);right:0;min-width:240px;padding:8px;border-radius:16px;background:var(--tb-bg);border:1px solid var(--tb-line);box-shadow:0 24px 60px -20px var(--tb-sh);color:var(--tb-ink);font-family:var(--tb-body);opacity:0;transform:translateY(-6px);pointer-events:none;transition:opacity .18s,transform .22s cubic-bezier(.2,.8,.2,1);z-index:5}",
    ".tb-menu.show{opacity:1;transform:none;pointer-events:auto}",
    ".tb-who{padding:10px 12px 12px;border-bottom:1px solid var(--tb-line);margin-bottom:6px}",
    ".tb-who b{display:block;font-size:15px}.tb-who span{font-size:12.5px;color:var(--tb-mute)}",
    ".tb-menu a,.tb-menu button{display:flex;width:100%;align-items:center;min-height:42px;padding:0 12px;border:0;border-radius:10px;background:none;color:var(--tb-ink);font:600 14.5px var(--tb-body);text-align:left;cursor:pointer}",
    ".tb-menu a:hover,.tb-menu button:hover,.tb-menu a:focus-visible,.tb-menu button:focus-visible{background:var(--tb-hover);outline:none}",
    ".tb-menu .tb-out{color:var(--tb-mute)}",

    /* hamburger + slide-down panel */
    ".tb-burger{display:none;width:42px;height:40px;padding:0;border-radius:11px;border:1px solid var(--tb-line);background:var(--tb-hover);position:relative}",
    ".tb-burger i{position:absolute;left:11px;right:11px;height:2px;border-radius:2px;background:var(--tb-ink);transition:transform .25s,opacity .2s,top .25s}",
    ".tb-burger i:nth-child(1){top:13px}.tb-burger i:nth-child(2){top:19px}.tb-burger i:nth-child(3){top:25px}",
    ".tb-burger[aria-expanded=true] i:nth-child(1){top:19px;transform:rotate(45deg)}",
    ".tb-burger[aria-expanded=true] i:nth-child(2){opacity:0}",
    ".tb-burger[aria-expanded=true] i:nth-child(3){top:19px;transform:rotate(-45deg)}",
    ".tb-panel{position:absolute;top:100%;left:0;right:0;display:none;flex-direction:column;padding:8px clamp(12px,4vw,24px) 16px;background:var(--tb-bg);border-bottom:1px solid var(--tb-line);box-shadow:0 30px 50px -30px var(--tb-sh);color:var(--tb-ink);font-family:var(--tb-body);transform:translateY(-10px);opacity:0;pointer-events:none;transition:transform .26s cubic-bezier(.2,.8,.2,1),opacity .2s}",
    ".tb-panel.show{transform:none;opacity:1;pointer-events:auto}",
    ".tb-panel a{display:flex;align-items:center;justify-content:space-between;min-height:52px;padding:0 4px;border-bottom:1px solid var(--tb-line);font:600 18px var(--tb-body);color:var(--tb-ink)}",
    ".tb-panel a:last-child{border-bottom:0}",
    ".tb-panel a::after{content:\"\\203A\";color:var(--tb-mute);font-size:22px}",
    ".tb-panel a[aria-current]{color:var(--tb-acc)}",
    "@media (max-width:1000px){header.nav.tb-site .tb-burger{display:block}header.nav.tb-site .tb-panel{display:flex}header.nav.tb-site .links{display:none!important}}",
    "@media (max-width:759px){.tb-bar .tb-burger{display:block}.tb-bar .tb-panel{display:flex}.tb-bar .tb-links{display:none!important}.tb-brand span{font-size:19px}.tb-nm,.tb-user .tb-badge{display:none}.tb-user{padding:0 5px;gap:0;width:40px;justify-content:center}.tb-user.adm::after{content:\"\";position:absolute;top:-2px;right:-2px;width:11px;height:11px;border-radius:50%;background:var(--tb-acc);border:2px solid var(--tb-bg)}header.nav.tb-site .nav-cta{gap:8px}header.nav.tb-site .nav-cta .btn-sm{padding:0 14px}.tb-bar{gap:10px}.tb-bar .tb-acct{margin-left:auto}}",
    "@media (max-width:520px){header.nav.tb-site .nav-cta .js-discord{display:none!important}}",
    "@media (max-width:420px){header.nav.tb-site .nav-cta .btn-sm{font-size:16px;padding:0 12px}.tb-sign{padding:0 13px}}",
    "html.tb-site-on .nav-su{z-index:2}",

    /* sign-in modal */
    ".tb-ov{position:fixed;inset:0;z-index:1500;display:grid;place-items:center;padding:16px;background:rgba(5,8,16,.6);backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px);opacity:0;transition:opacity .2s;font-family:var(--tb-body)}",
    ".tb-ov.show{opacity:1}",
    ".tb-card{position:relative;width:min(400px,100%);max-height:calc(100vh - 32px);overflow:auto;padding:26px 24px 22px;border-radius:22px;background:var(--tb-bg);color:var(--tb-ink);border:1px solid var(--tb-line);box-shadow:0 40px 90px -30px rgba(0,0,0,.8);transform:translateY(10px) scale(.98);transition:transform .25s cubic-bezier(.2,.8,.2,1)}",
    ".tb-ov.show .tb-card{transform:none}",
    ".tb-card h2{margin:0 0 4px;font:400 28px/1.1 var(--tb-disp);letter-spacing:.01em}",
    ".tb-card p{margin:0 0 16px;color:var(--tb-mute);font-size:14px;line-height:1.45}",
    ".tb-x{position:absolute;top:12px;right:12px;width:34px;height:34px;border-radius:50%;border:0;background:var(--tb-hover);color:var(--tb-ink);font-size:20px;line-height:1;cursor:pointer}",
    ".tb-gsi{display:flex;justify-content:center;min-height:44px;margin:4px 0}",
    ".tb-card label{display:block;font-weight:700;font-size:13px;margin:0 0 6px}",
    ".tb-card input{width:100%;height:46px;padding:0 14px;border-radius:12px;border:1px solid var(--tb-line);background:color-mix(in srgb,var(--tb-ink) 6%,transparent);color:var(--tb-ink);font:16px var(--tb-body)}",
    ".tb-card input:focus{outline:2px solid var(--tb-acc);outline-offset:1px}",
    ".tb-err{min-height:20px;margin:10px 0 0;color:#ff8f8f;font-size:13.5px}",
    "html.tb-dex .tb-err{color:#c0392b}",
    "@media (prefers-color-scheme:dark){html.tb-dex:not([data-theme=light]) .tb-err{color:#ff8f8f}}",
    "html.tb-dex[data-theme=dark] .tb-err{color:#ff8f8f}",
    ".tb-foot{margin:14px 0 0;font-size:12.5px;color:var(--tb-mute);text-align:center}",
    ".tb-foot a{color:var(--tb-ink);text-decoration:underline;text-underline-offset:3px}",
    "@media (prefers-reduced-motion:reduce){.tb-bar,.tb-menu,.tb-panel,.tb-ov,.tb-card,header.nav.tb-site,html.tb-dex header,html.tb-dex .dbar{transition:none!important}}"
  ].join("\n");

  function addCss() { var s = h("style", { id: "tb-css" }); s.textContent = CSS; doc.head.appendChild(s); }

  /* ---------- state + rendering of the account control ---------- */
  var acct, menu, burger, panel, bar, panelOpen = false, menuOpen = false;

  function setMenu(on) {
    menuOpen = !!on; if (!menu) return; menu.classList.toggle("show", menuOpen);
    var b = acct.querySelector(".tb-user"); if (b) b.setAttribute("aria-expanded", menuOpen ? "true" : "false");
    if (menuOpen) setPanel(false); sync();
  }
  function setPanel(on) {
    panelOpen = !!on; if (!panel) return; panel.classList.toggle("show", panelOpen);
    burger.setAttribute("aria-expanded", panelOpen ? "true" : "false"); bar.classList.toggle("tb-open", panelOpen);
    if (panelOpen) { setMenu(false); show(); } sync();
  }
  function sync() { /* keep the bar up while something it owns is open */ if (panelOpen || menuOpen) show(); }

  function render() {
    acct.textContent = ""; menu = null;
    var admin = isAdminRole(user);
    if (!user) { var b = h("button", { class: "tb-sign", type: "button", text: "Sign in", "aria-haspopup": "dialog" }); b.onclick = function () { openModal(); }; acct.appendChild(b); return; }
    var name = user.display || user.email || "Signed in";
    var ub = h("button", { class: "tb-user" + (admin ? " adm" : ""), type: "button", "aria-haspopup": "menu", "aria-expanded": "false", "aria-label": "Account: " + name + (admin ? ", admin" : "") },
      [h("span", { class: "tb-av", text: initial(user) }), h("span", { class: "tb-nm", text: name }), admin ? h("span", { class: "tb-badge", text: "Admin" }) : null]);
    ub.onclick = function (e) { e.stopPropagation(); setMenu(!menuOpen); };
    menu = h("div", { class: "tb-menu", role: "menu" });
    menu.appendChild(h("div", { class: "tb-who" }, [h("b", { text: name }), h("span", { text: admin ? (user.role === "owner" ? "Owner" : "Admin") + (isDex ? " \u00b7 admin tools unlock here" : "") : "Signed in" })]));
    if (admin) menu.appendChild(h("a", { href: "/admin/", role: "menuitem", text: "Admin console" }));
    if (admin && isDex && window.BKXOwner) {
      var bt = h("button", { type: "button", role: "menuitem", text: "Bokidex admin tools" });
      bt.onclick = function () { setMenu(false); window.BKXOwner.open(); }; menu.appendChild(bt);
    }
    var so = h("button", { type: "button", class: "tb-out", role: "menuitem", text: "Sign out" }); so.onclick = signOut; menu.appendChild(so);
    acct.appendChild(ub); acct.appendChild(menu);
  }

  function signOut() {
    setMenu(false);
    api("/signout", { method: "POST" }).catch(function () {}); tok("");
    if (window.BKXOwner) { try { window.BKXOwner.signOut(); } catch (e) {} }
    user = null; render(); announce();
  }
  function announce() { try { doc.dispatchEvent(new CustomEvent("boki-auth", { detail: { user: user } })); } catch (e) {} }

  function loadMe() {
    if (!tok()) { render(); announce(); return Promise.resolve(); }
    return api("/me").then(function (j) {
      if (j.ok && j.user) user = j.user; else { if (j._status === 401) tok(""); user = null; }
      render(); announce();
    }, function () { render(); });
  }

  /* other scripts (the Bokidex admin panel) ask for the sign-in modal this way */
  doc.addEventListener("boki-signin", function () { if (!user) openModal(); });
  doc.addEventListener("boki-signout", function () { if (user) signOut(); });
  window.BokiTopbar = { signIn: function () { if (!user) openModal(); }, user: function () { return user; } };

  /* ---------- sign-in modal ---------- */
  var ov = null;
  function openModal() {
    if (ov) return; setMenu(false); setPanel(false);
    var gsi = h("div", { class: "tb-gsi" }), err = h("div", { class: "tb-err", role: "alert" });
    var x = h("button", { class: "tb-x", type: "button", "aria-label": "Close", html: "&times;" });
    var card = h("div", { class: "tb-card", role: "dialog", "aria-modal": "true", "aria-labelledby": "tb-t" }, [x,
      h("h2", { id: "tb-t", text: "Sign in" }),
      h("p", { text: "Sign in with Google. Admins get the admin console and, on the Bokidex, the review tools." }),
      gsi, err,
      h("p", { class: "tb-foot", html: "Full console: <a href=\"/admin/\">projectboki.com/admin</a>" })]);
    ov = h("div", { class: "tb-ov tb-scope" }, [card]); doc.body.appendChild(ov);
    requestAnimationFrame(function () { ov.classList.add("show"); });
    var prevFocus = doc.activeElement;
    function close() { if (!ov) return; doc.removeEventListener("keydown", onKey, true); var o = ov; ov = null; o.classList.remove("show"); setTimeout(function () { o.remove(); }, 200); if (prevFocus && prevFocus.focus) prevFocus.focus(); }
    function onKey(e) {
      if (e.key === "Escape") { e.stopPropagation(); close(); return; }
      if (e.key === "Tab") { var f = card.querySelectorAll("button,input,a[href],[tabindex]"); if (!f.length) return; var a = f[0], z = f[f.length - 1];
        if (e.shiftKey && doc.activeElement === a) { z.focus(); e.preventDefault(); } else if (!e.shiftKey && doc.activeElement === z) { a.focus(); e.preventDefault(); } }
    }
    doc.addEventListener("keydown", onKey, true);
    x.onclick = close; ov.addEventListener("mousedown", function (e) { if (e.target === ov) close(); });

    function done(r) { tok(r.token); user = r.user; render(); close(); announce(); }
    (cfgP = cfgP || api("/config").catch(function () { return {}; })).then(function (cfg) {
      if (!ov) return;
      if (!cfg || !cfg.google_client_id) { gsi.textContent = "Sign-in is not available right now."; return; }
      function draw() {
        if (!ov || !window.google || !google.accounts) return;
        google.accounts.id.initialize({ client_id: cfg.google_client_id, ux_mode: "popup", callback: function (resp) {
          err.textContent = ""; api("/signin/google", { method: "POST", body: { credential: resp.credential } }).then(function (r) {
            if (r.ok && r.token) { done(r); } else err.textContent = "Google sign-in was not accepted.";
          }, function () { err.textContent = "Could not reach the sign-in service."; });
        } });
        var dark = isDex ? matchMedia("(prefers-color-scheme: dark)").matches && root.getAttribute("data-theme") !== "light" || root.getAttribute("data-theme") === "dark" : true;
        google.accounts.id.renderButton(gsi, { theme: dark ? "filled_black" : "outline", size: "large", shape: "pill", width: 280, text: "signin_with" });
      }
      if (window.google && google.accounts) draw();
      else { var s = h("script", { src: "https://accounts.google.com/gsi/client", async: "", defer: "" }); s.onload = draw; s.onerror = function () { if (gsi.parentNode) gsi.textContent = "Google sign-in did not load."; }; doc.head.appendChild(s); }
    });
  }

  /* ---------- hide on scroll down, show on scroll up / at top ---------- */
  var lastY = 0, ticking = false, hidden = false;
  function show() { if (!hidden) return; hidden = false; bar.classList.remove("tb-hidden"); root.classList.remove("tb-hide"); }
  function hide() { if (hidden || panelOpen || menuOpen || ov) return; if (bar.querySelector("#nav-su:not([hidden])") || bar.contains(doc.activeElement) && /INPUT|TEXTAREA/.test(doc.activeElement.tagName)) return; hidden = true; bar.classList.add("tb-hidden"); root.classList.add("tb-hide"); }
  function onScroll() {
    if (ticking) return; ticking = true;
    requestAnimationFrame(function () {
      ticking = false; var y = Math.max(0, window.pageYOffset || root.scrollTop || 0), d = y - lastY;
      if (y <= 8) show();
      else if (d > 6 && y > 80) hide();
      else if (d < -4) show();
      lastY = y;
    });
  }

  /* ---------- assemble ---------- */
  function linkEls(list, cur) {
    return list.map(function (l) { var a = h("a", { href: l[1], text: l[0] }); if (cur === l[1]) a.setAttribute("aria-current", "page"); return a; });
  }
  function currentHref() {
    var p = location.pathname.replace(/index\.html$/, "");
    if (/^\/bokidex\/?$/.test(p)) return "/bokidex/";
    if (/devlog/.test(p)) return "/devlog.html"; if (/presskit/.test(p)) return "/presskit.html"; return null;
  }

  function buildBurger(list, cur) {
    burger = h("button", { class: "tb-burger", type: "button", "aria-label": "Menu", "aria-expanded": "false", "aria-controls": "tb-panel" }, [h("i"), h("i"), h("i")]);
    burger.onclick = function (e) { e.stopPropagation(); setPanel(!panelOpen); };
    panel = h("nav", { class: "tb-panel tb-scope", id: "tb-panel", "aria-label": "Menu" }, linkEls(list, cur));
    panel.addEventListener("click", function (e) { if (e.target.closest("a")) setPanel(false); });
  }

  function init() {
    addCss(); var cur = currentHref();
    acct = h("div", { class: "tb-acct" });
    if (isDex) {
      root.classList.add("tb-dex");
      bar = h("div", { class: "tb tb-bar tb-scope", id: "tb-root", role: "banner" });
      bar.appendChild(h("a", { class: "tb-brand", href: "/", "aria-label": "Project Boki home" }, [h("img", { src: "/assets/img/brand-96.webp?v=2", alt: "", width: "30", height: "30" }), h("span", { text: "Project Boki" })]));
      bar.appendChild(h("nav", { class: "tb-links", "aria-label": "Site" }, linkEls(DEX_LINKS, cur)));
      buildBurger(DEX_LINKS, cur); bar.appendChild(acct); bar.appendChild(burger); bar.appendChild(panel);
      doc.body.insertBefore(bar, doc.body.firstChild);
    } else {
      bar = doc.getElementById("nav"); if (!bar) return;
      root.classList.add("tb-site-on"); bar.classList.add("tb", "tb-site", "tb-scope");
      var links = bar.querySelector(".links"), cta = bar.querySelector(".nav-cta");
      if (links) {
        /* keep the page's own anchors, but make them work from any page and add the rest */
        links.textContent = ""; linkEls(LINKS, cur).forEach(function (a) { links.appendChild(a); });
      }
      buildBurger(LINKS, cur);
      if (cta) { cta.appendChild(acct); cta.appendChild(burger); } else bar.appendChild(acct);
      bar.appendChild(panel);
      /* the beta popup is positioned against .nav-cta: keep it on top of our menu */
    }
    render(); loadMe();
    doc.addEventListener("click", function (e) { if (menuOpen && !acct.contains(e.target)) setMenu(false); if (panelOpen && !bar.contains(e.target)) setPanel(false); });
    doc.addEventListener("keydown", function (e) { if (e.key === "Escape") { if (menuOpen) setMenu(false); if (panelOpen) { setPanel(false); burger.focus(); } } });
    (function (mq) { mq.addEventListener && mq.addEventListener("change", function (m) { if (m.matches) setPanel(false); }); })(matchMedia(isDex ? "(min-width:760px)" : "(min-width:1001px)"));
    lastY = window.pageYOffset || 0; addEventListener("scroll", onScroll, { passive: true });
    var join = doc.getElementById("nav-join"); if (join) join.addEventListener("click", function () { show(); });
  }

  if (doc.readyState === "loading") doc.addEventListener("DOMContentLoaded", init); else init();
})();
