/* Email sign-up and analytics (PostHog), shared by every page that has a "Join the beta" button:
   the main page, Devlog, Press kit and Privacy (loaded after site.js) and the Bokidex (loaded with data-lazy, after topbar.js).
   Moved here unchanged from site.js so the Bokidex signs up exactly the way the site does: same form, same PostHog events
   (email_signup, click_beta, invite_visit, email_verified, invite_share), same ref / verify-token / consent handling. */
(function () {
const calm = matchMedia("(prefers-reduced-motion: reduce)").matches;
const lazy = !!(document.currentScript && document.currentScript.hasAttribute("data-lazy"));

// The pop-out is plain markup in the inner pages' headers. A page whose bar is built by script (the Bokidex's, topbar.js)
// gets the same markup added under its #nav-join button, plus the few rules it needs (that page has no style.css).
const DEX_CSS = [
  ".tb-cta{position:relative}",
  ".tb-cta .nav-su{position:absolute;top:calc(100% + 12px);right:0;width:380px;margin:0;padding:16px;border-radius:20px;border:1px solid rgba(255,255,255,.12);background:rgba(10,15,28,.92);backdrop-filter:blur(18px);-webkit-backdrop-filter:blur(18px);box-shadow:0 24px 60px -20px rgba(0,0,0,.9);text-align:left;opacity:0;transform:translateY(-6px);transition:opacity .2s ease,transform .25s cubic-bezier(.2,.8,.2,1);font:500 19px/1.5 Rubik,system-ui,sans-serif;color:#fff;-webkit-font-smoothing:antialiased;z-index:5}",
  ".tb-cta .nav-su[hidden]{display:none}",
  ".tb-cta .nav-su.show{opacity:1;transform:none}",
  ".tb-cta .nav-su *{box-sizing:border-box}",
  ".tb-cta .nav-su .sr{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}",
  ".tb-cta .nav-su-t{margin:0 0 10px 4px;font-size:15px;font-weight:700;color:#d6deeb}",
  ".tb-cta .nav-su .rare{color:#ffd24a;font-weight:inherit}",
  ".tb-cta .nav-su .su-row{display:flex;gap:8px;padding:6px;border-radius:16px;border:1px solid rgba(255,255,255,.2);background:rgba(8,13,24,.5);backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px);transition:border-color .3s ease,background .3s ease}",
  ".tb-cta .nav-su .su-row[hidden]{display:none}",
  ".tb-cta .nav-su .su-row:focus-within{border-color:rgba(255,255,255,.55);background:rgba(8,13,24,.7)}",
  ".tb-cta .nav-su .su-row input{flex:1;min-width:0;border:0;background:none;color:#fff;font:inherit;font-size:16px;padding:0 14px;outline:none}",
  ".tb-cta .nav-su .su-row input::placeholder{color:rgba(255,255,255,.45)}",
  ".tb-cta .nav-su .btn{display:inline-flex;align-items:center;justify-content:center;gap:10px;height:42px;padding:0 20px;border:0;border-radius:11px;background:#fff;color:#0a1222;box-shadow:0 10px 26px -16px rgba(0,0,0,.7);font:400 18px/1 Lilita,system-ui,sans-serif;letter-spacing:.02em;white-space:nowrap;cursor:pointer;transition:transform .15s ease,box-shadow .2s ease,background .2s ease,color .2s ease}",
  ".tb-cta .nav-su .btn:active{transform:scale(.97)}",
  "@media (hover:hover){.tb-cta .nav-su .btn:hover{background:#7d5ff5;color:#fff}}",
  ".tb-cta .nav-su .btn:focus-visible{outline:2px solid #fff;outline-offset:3px}",
  ".tb-cta .nav-su .su-done{margin:0;padding:4px 0 0;color:#fff;font-weight:700;text-align:center}",
  ".tb-cta .nav-su .su-done[hidden]{display:none}",
  ".tb-cta .nav-su .sd-t{margin:0;font-size:20px;font-weight:800;line-height:1.2;color:#fff}",
  ".tb-cta .nav-su .sd-s{margin:10px 0 14px;font-size:16px;font-weight:700;color:rgba(255,255,255,.82)}",
  ".tb-cta .nav-su .sd-s .egg2{vertical-align:middle;margin-right:8px}",
  ".tb-cta .nav-su .sd-row input{font-size:15px;text-overflow:ellipsis;cursor:text;padding:0 6px 0 14px}",
  ".tb-cta .nav-su .sd-row .btn{min-width:104px}",
  ".tb-cta .nav-su .su-load{position:relative;display:flex;align-items:center;justify-content:center;gap:12px;height:48px;border-radius:16px;border:1px solid rgba(255,210,74,.55);background:rgba(8,13,24,.62);overflow:hidden;font:400 18px/1 Lilita,system-ui,sans-serif;color:#ffd24a;white-space:nowrap}",
  ".tb-cta .nav-su .su-load span::after{content:\"\";display:inline-block;width:1.1em;text-align:left;animation:su-dots 1.2s steps(1) infinite}",
  ".tb-cta .nav-su .su-bar{position:absolute;left:0;right:0;bottom:0;height:3px;background:#ffd24a;transform:scaleX(0);transform-origin:left center;animation:su-fill 1.6s cubic-bezier(.35,.1,.25,1) forwards}",
  "@keyframes su-fill{to{transform:scaleX(1)}}",
  "@keyframes su-dots{0%{content:\"\"}25%{content:\".\"}50%{content:\"..\"}75%{content:\"...\"}}",
  "@media (max-width:720px){.tb-cta .nav-su{position:fixed;top:72px;left:12px;right:12px;width:auto}.tb-cta .nav-su .su-load{height:56px;font-size:19px}}",
  "@media (max-width:420px){.tb-cta .nav-su .su-row .btn{font-size:16px;padding:0 12px}}",
  "@media (max-width:600px){.tb-cta .nav-su .sd-row{flex-direction:column;gap:4px;padding:8px}.tb-cta .nav-su .sd-row input{width:100%;height:40px;padding:0 8px;text-align:center;flex:none}.tb-cta .nav-su .sd-row .btn{width:100%;height:46px}}",
  "@media (prefers-reduced-motion:reduce){.tb-cta .nav-su,.tb-cta .nav-su .su-bar{transition:none;animation:none}}",
].join("\n");
const mountPopout = () => {
  const nj = document.getElementById("nav-join");
  if (!nj || document.getElementById("nav-su")) return;
  nj.setAttribute("aria-controls", "nav-su"); nj.setAttribute("aria-expanded", "false");
  const f = document.createElement("form"); f.className = "signup nav-su"; f.id = "nav-su"; f.hidden = true;
  f.innerHTML = '<label class="sr" for="nav-email">Email for beta invites</label>' +
    '<p class="nav-su-t">Get a beta invite and a <b class="rare">rare egg</b>.</p>' +
    '<div class="su-row"><input id="nav-email" name="email" type="email" required autocomplete="email" placeholder="you@email.com">' +
    '<button class="btn btn-solid btn-sm" type="submit">Join the beta</button></div>' +
    '<div class="su-done" role="status" hidden></div>';
  nj.parentNode.appendChild(f);
  const st = document.createElement("style"); st.id = "su-popout-css"; st.textContent = DEX_CSS; document.head.appendChild(st);
};

/* ---------- Analytics (PostHog) and email signup ---------- */
// Paste the Project Boki PostHog project's public token here to switch on analytics and the email signup.
// It's a separate PostHog organization from General Creative, so the data never mixes.
const POSTHOG_KEY = "phc_CQft5Eunm8Sp3ZSXZbDVFeB7P2kSDLzB8cZipnvEquM5";
const POSTHOG_HOST = "https://e.projectboki.com"; // PostHog managed reverse proxy (CNAME at Namecheap), so ad blockers do not drop sign-ups. Direct host: https://us.i.posthog.com
if (POSTHOG_KEY) {
  !function(t,e){var o,n,p,r;e.__SV||(window.posthog=e,e._i=[],e.init=function(i,s,a){function g(t,e){var o=e.split(".");2==o.length&&(t=t[o[0]],e=o[1]),t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}}(p=t.createElement("script")).type="text/javascript",p.crossOrigin="anonymous",p.async=!0,p.src=s.api_host.replace(".i.posthog.com","-assets.i.posthog.com")+"/static/array.js",(r=t.getElementsByTagName("script")[0]).parentNode.insertBefore(p,r);var u=e;for(void 0!==a?u=e[a]=[]:a="posthog",u.people=u.people||[],u.toString=function(t){var e="posthog";return"posthog"!==a&&(e+="."+a),t||(e+=" (stub)"),e},u.people.toString=function(){return u.toString(1)+".people (stub)"},o="capture identify alias people.set people.set_once set_config register register_once unregister opt_out_capturing has_opted_out_capturing opt_in_capturing reset isFeatureEnabled onFeatureFlags getFeatureFlag getFeatureFlagPayload reloadFeatureFlags group updateEarlyAccessFeatureEnrollment getEarlyAccessFeatures getActiveMatchingSurveys getSurveys onSessionId".split(" "),n=0;n<o.length;n++)g(u,o[n]);e._i.push([i,s,a])},e.__SV=1)}(document,window.posthog||[]);
  // Cookieless until the visitor accepts; then PostHog may remember them so return visits link up.
  const foot = document.querySelector(".foot");
  if (foot) { const fh = () => document.documentElement.style.setProperty("--fh", foot.offsetHeight + "px"); fh(); new ResizeObserver(fh).observe(foot, { box: "border-box" }); }
  let consent = null;
  try { consent = localStorage.getItem("boki-consent"); } catch (e) {}
  // Site pages start PostHog now. The Bokidex (data-lazy) has no analytics of its own, so there PostHog only starts when
  // the visitor opens the "Join the beta" pop-out or sends the form: no page views or click tracking from the dex.
  let phOn = false;
  const startPH = () => {
    if (phOn) return; phOn = true;
    posthog.init(POSTHOG_KEY, { api_host: POSTHOG_HOST, ui_host: "https://us.posthog.com", persistence: consent === "yes" ? "localStorage+cookie" : "memory", person_profiles: "identified_only" });
  };
  if (!lazy) startPH();
  const bar = document.getElementById("consent");
  const choose = (v) => {
    try { localStorage.setItem("boki-consent", v); } catch (e) {}
    if (v === "yes") { posthog.set_config({ persistence: "localStorage+cookie" }); try { if (window.__bokiRefBy) localStorage.setItem("boki-ref-by", window.__bokiRefBy); } catch (e) {} }
    else { posthog.set_config({ persistence: "memory" }); try { posthog.persistence && posthog.persistence.clear(); } catch (e) {} }
    bar.classList.remove("show"); setTimeout(() => { bar.hidden = true; }, 300);
    document.documentElement.style.removeProperty("--ch");
  };
  // While the cookie bar is up, the footer gets room beneath it so nothing at the bottom is covered
  const open = () => { bar.hidden = false; requestAnimationFrame(() => { bar.classList.add("show"); document.documentElement.style.setProperty("--ch", bar.offsetHeight + 36 + "px"); }); };
  if (bar) {
    bar.querySelector("[data-yes]").addEventListener("click", () => choose("yes"));
    bar.querySelector("[data-no]").addEventListener("click", () => choose("no"));
    if (!consent) {
      // Phones: the bar would sit on top of the hero's email box and Discord button, so it waits until the visitor has
      // scrolled past the hero (or 15s). Nothing is stored before they answer either way.
      if (innerWidth <= 600) {
        let shown = false;
        const go = () => { if (shown) return; shown = true; removeEventListener("scroll", chk); open(); };
        const chk = () => { if (scrollY > innerHeight * 0.6) go(); };
        addEventListener("scroll", chk, { passive: true }); setTimeout(go, 15000);
      } else setTimeout(open, 1200);
    }
    document.querySelectorAll(".js-cookies").forEach((a) => { a.hidden = false; a.addEventListener("click", (e) => { e.preventDefault(); open(); }); });
  }
  if (!lazy) document.addEventListener("click", (e) => {
    const a = e.target.closest("a[href]"); if (!a) return;
    const h = a.href;
    const where = a.closest("section, header, footer")?.id || a.closest("section, header, footer")?.className || "page";
    if (h.includes("discord")) posthog.capture("click_discord", { where });
    else if (h.includes("itch.io")) posthog.capture("click_play", { where });
    else if (h.endsWith("#join")) posthog.capture("click_beta", { where });
  });
  // Every email form (hero, nav pop-out, end of page) signs up the same way; once you're on the list, they all say so.
  mountPopout();
  const forms = [...document.querySelectorAll("form.signup")];
  let signed = false; try { signed = localStorage.getItem("boki-signed") === "1"; } catch (e) {}
  // Invite links. Everyone who signs up gets projectboki.com/?r=CODE; a signup that arrives through one carries
  // referred_by, so "3 friends signed up" is a count of email_signup events per code. The code is random, never
  // built from the email. Who sent a visitor is only remembered on the device once they accept cookies.
  let myRef = "", refBy = "";
  try { myRef = localStorage.getItem("boki-ref") || ""; refBy = localStorage.getItem("boki-ref-by") || ""; } catch (e) {}
  { const r = (new URLSearchParams(location.search).get("r") || "").toLowerCase();
    if (/^[a-z0-9]{6,10}$/.test(r) && r !== myRef && !refBy) {
      refBy = window.__bokiRefBy = r; posthog.capture("invite_visit", { referred_by: r });
      if (consent === "yes") try { localStorage.setItem("boki-ref-by", r); } catch (e) {}
    } }
  const mkRef = () => { const a = "abcdefghjkmnpqrstuvwxyz23456789", b = new Uint8Array(7); crypto.getRandomValues(b); return [...b].map((n) => a[n % a.length]).join(""); };
  const canShare = !!navigator.share && matchMedia("(pointer: coarse)").matches;
  // Claiming the egg. A sign-up carries a random verify_token; the welcome email's "Claim my egg" button comes back
  // as projectboki.com/?claim=TOKEN&me=CODE and fires email_verified with that token, which is how a sign-up counts
  // as confirmed (PostHog matches the two). Until then the form says "Check your email". Sign-ups from before this
  // existed have no token and are treated as claimed.
  const mkTok = () => { const a = "abcdefghjkmnpqrstuvwxyz23456789", b = new Uint8Array(16); crypto.getRandomValues(b); return [...b].map((n) => a[n % a.length]).join(""); };
  let vt = "", claimed = false;
  try { vt = localStorage.getItem("boki-vt") || ""; claimed = localStorage.getItem("boki-claimed") === "1"; } catch (e) {}
  let justClaimed = false;
  { const q = new URLSearchParams(location.search), c = (q.get("claim") || "").toLowerCase(), me = (q.get("me") || "").toLowerCase();
    if (/^[a-z0-9]{12,24}$/.test(c)) {
      const mine = /^[a-z0-9]{6,10}$/.test(me) ? me : "";
      posthog.capture("email_verified", mine ? { verify_token: c, ref_code: mine } : { verify_token: c });
      if (mine) myRef = mine;
      signed = claimed = justClaimed = true;
      try { localStorage.setItem("boki-signed", "1"); localStorage.setItem("boki-claimed", "1"); if (mine) localStorage.setItem("boki-ref", mine); } catch (e) {}
      q.delete("claim"); q.delete("me"); const rest = q.toString();
      history.replaceState(null, "", location.pathname + (rest ? "?" + rest : "") + location.hash);
    } }
  const waiting = () => signed && !!vt && !claimed;
  const done = () => {
    document.documentElement.classList.add("su-signed");
    if (waiting()) {
      forms.forEach((f) => {
        f.querySelector(".su-row").hidden = true; const t = f.querySelector(".nav-su-t"); if (t) t.hidden = true;
        const d = f.querySelector(".su-done");
        d.innerHTML = '<div class="sd-h">' + ((document.querySelector(".su-perk .rare-egg") || {}).outerHTML || "") + '<p class="sd-t">Check your email<br>to claim your <b class="rare">rare egg</b>.</p></div><p class="sd-s">Not there? Look in your spam folder.</p>';
        d.hidden = false;
      });
      return;
    }
    forms.forEach((f) => {
      f.querySelector(".su-row").hidden = true; const t = f.querySelector(".nav-su-t"); if (t) t.hidden = true;
      const d = f.querySelector(".su-done");
      d.innerHTML = '<div class="sd-h">' + ((document.querySelector(".su-perk .rare-egg") || {}).outerHTML || "") + '<p class="sd-t">You\'re in.<br>Your <b class="rare">rare egg</b> is saved.</p></div>' + (myRef
        ? '<p class="sd-s"><img class="egg2" src="/assets/img/egg-teal-128.webp" width="28" height="28" alt="">Invite 3 friends for a second egg.</p><div class="su-row sd-row"><input readonly aria-label="Your invite link" value="projectboki.com/?r=' + myRef + '"><button class="btn btn-solid btn-sm" type="button">' + (canShare ? "Share" : "Copy link") + "</button></div>" : "");
      d.hidden = false;
    });
  };
  // A short "saving" moment after the button is pressed: the form becomes the rare egg, shaking, while a gold line
  // fills under it; then the egg pops and the confirmation shows. Reduced motion: straight to the confirmation.
  const SAVE_MS = 1600;
  const saving = (form) => {
    if (calm) { done(); return; }
    const row = form.querySelector(".su-row"), egg = document.querySelector(".su-perk .rare-egg");
    const l = document.createElement("div"); l.className = "su-load"; l.setAttribute("role", "status");
    l.innerHTML = (egg ? egg.outerHTML : "") + '<span>Saving your rare egg</span><i class="su-bar"></i>';
    row.hidden = true; row.after(l);
    setTimeout(() => { l.remove(); done(); const e2 = form.querySelector(".sd-h .rare-egg"); if (e2) e2.classList.add("pop"); }, SAVE_MS);
  };
  document.addEventListener("click", (e) => {
    const i = e.target.closest(".sd-row input"); if (i) { i.select(); return; }
    const b = e.target.closest(".sd-row button"); if (!b) return;
    const url = "https://projectboki.com/?r=" + myRef;
    posthog.capture("invite_share", { how: canShare ? "share" : "copy" });
    if (canShare) { navigator.share({ title: "Project Boki", text: "Join the Project Boki beta with me.", url }).catch(() => {}); return; }
    const ok = () => { b.textContent = "Copied"; setTimeout(() => { b.textContent = "Copy link"; }, 1600); };
    (navigator.clipboard ? navigator.clipboard.writeText(url) : Promise.reject()).then(ok).catch(() => {
      const f = b.previousElementSibling; f.value = url; f.select();
      try { if (document.execCommand("copy")) ok(); } catch (e) {}
      f.value = url.replace("https://", "");
    });
  });
  forms.forEach((form) => {
    if (form.id !== "nav-su") form.hidden = false;
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const email = form.email.value.trim(); if (!email) return;
      startPH();
      if (!myRef) { myRef = mkRef(); try { localStorage.setItem("boki-ref", myRef); } catch (e) {} }
      const who = { email, ref_code: myRef }; if (refBy) who.referred_by = refBy;
      vt = mkTok(); claimed = false; signed = true;
      posthog.identify(email, who);
      posthog.capture("email_signup", { ...who, where: form.id, verify_token: vt });
      try { localStorage.setItem("boki-signed", "1"); localStorage.setItem("boki-vt", vt); localStorage.removeItem("boki-claimed"); } catch (e) {}
      saving(form);
    });
  });
  if (signed) done();
  if (justClaimed) { const h = document.getElementById("hero"); if (h && !location.hash) scrollTo(0, 0); setTimeout(() => { const e2 = document.querySelector(".hero-su .sd-h .rare-egg"); if (e2) e2.classList.add("pop"); }, 900); }
  // The email was opened in another tab of this browser: this one catches up
  addEventListener("storage", (e) => { if (e.key === "boki-claimed" && e.newValue === "1" && !claimed) { claimed = true; try { myRef = localStorage.getItem("boki-ref") || myRef; } catch (x) {} done(); } });
  // Coming from another page's "Join the beta": land on the hero and put the cursor in the email field.
  if (location.hash === "#beta") { history.replaceState(null, "", location.pathname + location.search); const i = document.getElementById("hero-email"); if (i && !i.closest(".su-row").hidden && matchMedia("(pointer: fine)").matches) setTimeout(() => i.focus({ preventScroll: true }), 400); }
  document.querySelectorAll(".su-fallback").forEach((a) => a.remove());
  // The nav's "Join the beta" opens a small email field under it instead of jumping to the bottom of the page.
  const nj = document.getElementById("nav-join"), ns = document.getElementById("nav-su");
  if (nj && ns) {
    const set = (on) => {
      ns.hidden = !on; nj.setAttribute("aria-expanded", on);
      if (on) requestAnimationFrame(() => { ns.classList.add("show"); const i = ns.querySelector("input"); if (i && !ns.querySelector(".su-row").hidden) i.focus({ preventScroll: true }); });
      else ns.classList.remove("show");
    };
    nj.addEventListener("click", (e) => {
      e.preventDefault();
      const hero = document.getElementById("hero-su");
      if (hero && !hero.hidden && hero.getBoundingClientRect().bottom > 0 && hero.getBoundingClientRect().top < innerHeight && scrollY < innerHeight * 0.5) { hero.querySelector(".su-row").hidden ? 0 : hero.querySelector("input").focus(); return; }
      startPH(); set(ns.hidden);
      posthog.capture("click_beta", { where: "nav" });
    });
    document.addEventListener("pointerdown", (e) => { if (!ns.hidden && !ns.contains(e.target) && e.target !== nj) set(false); });
    document.addEventListener("keydown", (e) => { if (e.key === "Escape" && !ns.hidden) { set(false); nj.focus(); } });
    ns.addEventListener("focusout", (e) => { if (e.relatedTarget && !ns.contains(e.relatedTarget) && e.relatedTarget !== nj) set(false); });
    addEventListener("scroll", () => { if (!ns.hidden && document.activeElement !== ns.querySelector("input")) set(false); }, { passive: true });
    // Other "Join the beta" / "Sign up" links on the inner pages open the same pop-out instead of leaving the page.
    document.querySelectorAll('main a[href="/#beta"]').forEach((a) => a.addEventListener("click", (e) => { e.preventDefault(); nj.click(); }));
  }
}
})();
