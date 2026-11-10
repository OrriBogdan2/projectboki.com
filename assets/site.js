// Weak computers: watch the frame rate for the first ~90s. If the page keeps stalling, switch to a lighter look (no
// frosted-glass blurs, a still portrait wall, a still Bubblisk, fewer glows) and remember it for this visit.
// ?lite forces it on, ?full forces it off.
const LITE = (function () {
  const root = document.documentElement, q = location.search;
  let lite = false;
  try { lite = /[?&]lite\b/.test(q) || (!/[?&]full\b/.test(q) && sessionStorage.getItem("boki-lite") === "1"); } catch (e) {}
  const on = () => {
    if (root.classList.contains("lite")) return;
    root.classList.add("lite"); try { sessionStorage.setItem("boki-lite", "1"); } catch (e) {}
    document.dispatchEvent(new Event("boki-lite"));
  };
  if (lite) { root.classList.add("lite"); return { on: () => true }; }
  if (/[?&]full\b/.test(q) || matchMedia("(prefers-reduced-motion: reduce)").matches) return { on: () => false };
  // No real graphics card (hardware acceleration off, broken drivers): everything is drawn on the processor. Go light straight away.
  try {
    const gl = document.createElement("canvas").getContext("webgl");
    const ext = gl && gl.getExtension("WEBGL_debug_renderer_info");
    const gpu = gl ? String(gl.getParameter(ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER)) : "none";
    if (gl) { const lc = gl.getExtension("WEBGL_lose_context"); if (lc) lc.loseContext(); }
    if (gpu === "none" || /swiftshader|llvmpipe|softpipe|software|basic render/i.test(gpu)) { root.classList.add("lite"); try { sessionStorage.setItem("boki-lite", "1"); } catch (e) {} return { on: () => true }; }
  } catch (e) {}
  // Every second, measure how much of that time went to stalled frames (over 34ms). A third or more, twice running, is a struggling machine.
  let last = 0, w0 = 0, jank = 0, bad = 0; const t0 = performance.now();
  const step = (t) => {
    if (document.hidden) { last = 0; w0 = 0; jank = 0; } else {
      if (last) { const d = t - last; if (d > 34) jank += Math.min(d, 2000) - 17; }
      last = t;
      if (!w0) w0 = t;
      else if (t - w0 >= 1000) {
        const share = jank / (t - w0); w0 = t; jank = 0;
        if (t - t0 > 1200) { bad = share > 0.33 ? bad + 1 : 0; if (bad >= 2) { on(); return; } }
      }
    }
    if (t - t0 < 90000) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
  return { on: () => root.classList.contains("lite") };
})();

// Discord invite. Every .js-discord link shows up once this is set.
const DISCORD_URL = "https://discord.gg/nbeBaU7xt";

if (DISCORD_URL) {
  document.querySelectorAll(".js-discord").forEach((a) => { a.href = DISCORD_URL; a.hidden = false; });
}

const nav = document.getElementById("nav");
if (nav) {
  const onScroll = () => nav.classList.toggle("scrolled", window.scrollY > 40);
  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });
}

const calm = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// No autoplaying video for people who asked for less motion.
if (calm) {
  document.querySelectorAll("video[autoplay]").forEach((v) => { v.removeAttribute("autoplay"); v.pause(); });
}

// Reveal sections as they come into view.
const revealed = document.querySelectorAll("[data-r]");
if ("IntersectionObserver" in window && !calm) {
  // Rises into place on the way down; sinks back when you scroll up past it, so it rises again next time.
  // (Things that leave off the top stay put, so nothing flickers above you.)
  document.querySelectorAll('[data-r="stagger"]').forEach((g) => [...g.children].forEach((c, i) => c.style.setProperty("--i", i)));
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (e.isIntersecting) e.target.classList.add("in");
      else if (e.boundingClientRect.top > innerHeight * 0.5) e.target.classList.remove("in");
    });
  }, { rootMargin: "0px 0px -10% 0px", threshold: 0.06 });
  revealed.forEach((el) => io.observe(el));
} else {
  revealed.forEach((el) => el.classList.add("in"));
}

// No dragging images out of the page (Firefox ignores -webkit-user-drag)
document.addEventListener("dragstart", (e) => { if (e.target && e.target.closest && e.target.closest("img, svg, picture, video, canvas")) e.preventDefault(); });

const media = document.getElementById("hero-media");
// The portrait wall only drifts while it can be seen.
if (media && "IntersectionObserver" in window) {
  new IntersectionObserver(([e]) => media.classList.toggle("paused", !e.isIntersecting)).observe(document.querySelector(".hero-wrap") || media);
}
// Same for the moving grid behind "Join the closed beta": it repaints every frame, so only while it's on screen.
{ const jb = document.querySelector(".join-bg");
  if (jb && "IntersectionObserver" in window) new IntersectionObserver(([e]) => jb.classList.toggle("paused", !e.isIntersecting)).observe(jb); }

// Touch: everything tappable dips slightly the moment a finger lands, and springs back on release. Uses the separate
// "scale" property so it never fights an element's own transforms or transitions.
if (matchMedia("(hover: none)").matches && !matchMedia("(prefers-reduced-motion: reduce)").matches && Element.prototype.animate) {
  const SEL = ".bw-card, .pick button, .bk-pick button, .faq-ask, .h-skip, .h-expand, .pk-grid a, .pk-key, .dl-img, .bk-arrow, .bk-sil"; // .btn has its own CSS press
  let held = null;
  const up = () => { if (held) { held.animate([{ scale: getComputedStyle(held).scale === "none" ? 0.96 : getComputedStyle(held).scale }, { scale: 1 }], { duration: 260, easing: "cubic-bezier(.2,1.4,.4,1)" }); held.style.scale = ""; held = null; } };
  addEventListener("pointerdown", (e) => {
    if (e.pointerType !== "touch") return; const el = e.target.closest(SEL); if (!el) return;
    held = el; el.style.scale = el.matches(".h-expand, .bk-arrow") ? "0.9" : "0.96";
    el.animate([{ scale: 1 }, { scale: el.style.scale }], { duration: 70, easing: "ease-out" });
  }, { passive: true });
  ["pointerup", "pointercancel"].forEach((t) => addEventListener(t, up, { passive: true }));
  addEventListener("scroll", () => { if (held) up(); }, { passive: true }); // a scroll, not a tap: let go at once
}

// Phones: touch a portrait and it lights up the same way for a moment.
if (media && matchMedia("(pointer: coarse)").matches) {
  const hero = document.getElementById("hero"); let lit = null, off = 0;
  media.addEventListener("pointerdown", (e) => {
    const li = e.target.closest("li"); if (!li) return;
    const r = hero.getBoundingClientRect();
    hero.style.setProperty("--hx", `${(e.clientX - r.left).toFixed(0)}px`); hero.style.setProperty("--hy", `${(e.clientY - r.top).toFixed(0)}px`);
    if (lit && lit !== li) lit.classList.remove("tap");
    lit = li; li.classList.add("tap"); hero.classList.add("lit");
    clearTimeout(off); off = setTimeout(() => { li.classList.remove("tap"); hero.classList.remove("lit"); lit = null; }, 1600);
  });
}
// Hovering a portrait lights it up (CSS); the wash over the wall clears in a spotlight that follows the pointer.
if (media && matchMedia("(hover: hover) and (pointer: fine)").matches) {
  const hero = document.getElementById("hero");
  media.addEventListener("pointermove", (e) => {
    const r = hero.getBoundingClientRect();
    hero.style.setProperty("--hx", `${(e.clientX - r.left).toFixed(0)}px`); hero.style.setProperty("--hy", `${(e.clientY - r.top).toFixed(0)}px`);
    hero.classList.toggle("lit", !!e.target.closest("li"));
  });
  media.addEventListener("pointerleave", () => hero.classList.remove("lit"));
}

// The logo breaks as you scroll away from the hero: BOKI splits down the crack in its egg, both halves glowing
// ember at the break, and the PROJECT plaque pieces drift further apart. Scroll back up and it all comes together.
const wmBreak = (() => {
  const img = document.querySelector(".lockup .wordmark");
  if (!img || calm) return null;
  const crack = [[50, -6], [48.5, 18], [52, 36], [47.5, 58], [51, 78], [49, 106]];
  const P = (pts) => pts.map(([x, y]) => `${x}% ${y}%`).join(", ");
  const L = `polygon(-10% -10%, ${P(crack.map(([x, y]) => [x + 0.3, y]))}, -10% 110%)`;
  const R = `polygon(${P(crack)}, 110% 110%, 110% -10%)`;
  const band = (o) => crack.map(([x, y]) => `${x},${y}`).join(" ") + " " + crack.slice().reverse().map(([x, y]) => `${x + o},${y}`).join(" ");
  const wrap = document.createElement("span"); wrap.className = "wm-wrap";
  img.parentNode.insertBefore(wrap, img); wrap.appendChild(img);
  const half = (cls, clip, o) => {
    const s = document.createElement("span"); s.className = "wm-half " + cls; s.style.clipPath = s.style.webkitClipPath = clip;
    const c = img.cloneNode(); c.removeAttribute("fetchpriority"); c.alt = ""; c.className = "";
    s.appendChild(c);
    s.insertAdjacentHTML("beforeend", `<svg class="wm-edge" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><polygon points="${band(o)}"/></svg>`);
    const svg = s.querySelector("svg"), mask = () => { const u = `url("${c.currentSrc || c.src}")`; svg.style.webkitMaskImage = svg.style.maskImage = u; };
    c.complete ? mask() : c.addEventListener("load", mask, { once: true }); // the glow only shows on the logo itself
    wrap.appendChild(s); return s;
  };
  const l = half("wm-l", L, -1.6), r = half("wm-r", R, 1.6);
  wrap.classList.add("split");
  const pl = document.querySelector(".pj-l"), pr = document.querySelector(".pj-r"), chips = [...document.querySelectorAll(".pj-chip")];
  return (k) => {
    const e = k * k * (3 - 2 * k);
    l.style.transform = `translate(${(-8 * e).toFixed(2)}%, ${(3 * e).toFixed(2)}%) rotate(${(-8 * e).toFixed(2)}deg)`;
    r.style.transform = `translate(${(8 * e).toFixed(2)}%, ${(7 * e).toFixed(2)}%) rotate(${(9 * e).toFixed(2)}deg)`;
    wrap.style.setProperty("--k", e.toFixed(3));
    if (pl) pl.style.transform = `translate(${(-0.3 - 1.4 * e).toFixed(3)}em, ${(-0.12 - 0.3 * e).toFixed(3)}em) rotate(${(-5 - 9 * e).toFixed(2)}deg)`;
    if (pr) pr.style.transform = `translate(${(0.3 + 1.4 * e).toFixed(3)}em, ${(0.22 + 0.6 * e).toFixed(3)}em) rotate(${(4 + 10 * e).toFixed(2)}deg)`;
    chips.forEach((c, i) => { c.style.translate = `${((i - 1) * 0.6 * e).toFixed(2)}em ${(2.4 * e * (1 + i * 0.4)).toFixed(2)}em`; c.style.opacity = (1 - e * 0.8).toFixed(3); });
  };
})();

// Hero: pinned while the next section slides over it. The title lifts away, the wall pushes in and dims.
const heroIn = document.getElementById("hero-in"), heroDim = document.getElementById("hero-dim"), heroEl = document.getElementById("hero");
const hunIn = document.querySelector("#hunters > .wrap"); // trails the sheet a little as it slides up, then settles
if (heroIn && !calm) {
  let ticking = false;
  const ease = (v) => 1 - Math.pow(1 - v, 2);
  let done = false;
  const draw = () => {
    ticking = false;
    const h = heroEl.offsetHeight, t = Math.min(1, Math.max(0, window.scrollY / h)), e = ease(t);
    if (t === 1 && done) return; // covered: nothing changes
    done = t === 1;
    heroIn.style.transform = `translate3d(0, ${(-h * 0.14 * e).toFixed(1)}px, 0) scale(${(1 - 0.1 * e).toFixed(4)})`;
    heroIn.style.opacity = String(Math.min(1, Math.max(0, 1 - (t - 0.12) * 1.9)).toFixed(3));
    if (wmBreak) wmBreak(Math.min(1, t / 0.5));
    if (media) media.style.transform = `scale(${(1 + 0.12 * e).toFixed(4)})`;
    if (heroDim) heroDim.style.opacity = (0.75 * t).toFixed(3);
    if (hunIn) hunIn.style.transform = t < 1 ? `translate3d(0, ${(110 * (1 - e)).toFixed(1)}px, 0)` : "";
  };
  window.addEventListener("scroll", () => { if (!ticking) { ticking = true; requestAnimationFrame(draw); } }, { passive: true });
  window.addEventListener("resize", draw);
  draw();
}

/* ---------- Hunter figure: faces you, emotes when picked, idles, and now and then emotes again; drag to turn ---------- */
// Pose sheets are 10 columns, 80 ms a frame. POSE[id] = [[frames of each emote], idle frames]:
// <id>-pose.webp holds the first emote then the idle loop; <id>-e2.webp, -e3... hold the others.
// The spin sheet (6x4) is the 24-frame turntable for dragging; its first frame is the pose's angle.
function spinner(box, el) {
  const SPIN = 24, SC = 6, SR = 4, PC = 10;
  let id = "", mode = "", timer = null, drag = null, back = null, seen = false, sn = 0;
  let em = [], ni = 0, urls = [], ready = [], spin = null;
  let seg = 0, f = 0, wait = 0, played = 0;   // seg: the emote playing, or -1 for idle; f: frame within it
  const url = (k) => `assets/img/hunters/3d/${id}-${k ? `e${k + 1}` : "pose"}.webp?v=${MODEL_V}`;
  const rowsOf = (k) => Math.ceil((k ? em[k] : em[0] + ni) / PC);
  const draw = () => {
    const k = seg < 0 ? 0 : seg, n = seg < 0 ? em[0] + f : f, rows = rowsOf(k), key = "p" + k;
    if (mode !== key) { mode = key; el.style.backgroundImage = `url(${urls[k]})`; el.style.backgroundSize = `${PC * 100}% ${rows * 100}%`; }
    const c = n % PC, r = Math.floor(n / PC);
    el.style.backgroundPosition = `${(c / (PC - 1)) * 100}% ${rows > 1 ? (r / (rows - 1)) * 100 : 0}%`;
  };
  const showSpin = (n) => {
    sn = n;
    if (mode !== "spin") { mode = "spin"; el.style.backgroundImage = `url(${spin})`; el.style.backgroundSize = `${SC * 100}% ${SR * 100}%`; }
    el.style.backgroundPosition = `${((n % SC) / (SC - 1)) * 100}% ${(Math.floor(n / SC) / (SR - 1)) * 100}%`;
  };
  const idleFor = () => 70 + Math.floor(Math.random() * 40);   // frames of idle between emotes: about 5.5 to 9 s
  const tick = () => {
    if (seg >= 0) {
      if (++f < em[seg]) return draw();
      played++; seg = -1; f = 0; wait = idleFor(); fetchNext();
    } else {
      f = (f + 1) % ni;
      if (--wait <= 0 && f === 0) {           // start the next emote at the top of an idle loop
        const k = played % em.length;
        if (ready[k]) { seg = k; f = 0; }
      }
    }
    draw();
  };
  const stop = () => { clearInterval(timer); timer = null; };
  document.addEventListener("boki-lite", () => { if (!timer) return; stop(); seg = -1; f = 0; draw(); });
  const play = () => {
    if (timer || !ready[0] || !seen || drag || back) return;
    if (calm || LITE.on()) { seg = -1; f = 0; draw(); return; } // lite: hold the pose (still turns by drag)
    timer = setInterval(tick, 80);
  };
  // the other emotes load one at a time, only once the first has played and only while this Hunter is up
  const fetchNext = () => {
    const k = ready.indexOf(false); if (k < 0) return;
    const want = id, im = new Image();
    im.onload = () => { if (id === want) ready[k] = true; };
    im.src = urls[k];
  };
  new IntersectionObserver(([e]) => { seen = e.isIntersecting; seen ? play() : stop(); }).observe(box);
  // Nothing downloads until the figure is about a screen away, so the top of the page loads light.
  let near = false, pending = null;
  new IntersectionObserver(([e]) => { if (e.isIntersecting && !near) { near = true; if (pending) { const f = pending; pending = null; f(); } } }, { rootMargin: "25% 0px" }).observe(box);
  const whenNear = (f) => { if (near) f(); else pending = f; };
  const fetchSpin = () => {
    if (spin || !id) return;
    const want = id, u = `assets/img/hunters/3d/${id}-spin.webp?v=${MODEL_V}`, im = new Image();
    im.onload = () => { if (id === want) spin = u; };
    im.src = u;
  };
  box.addEventListener("pointerenter", fetchSpin);
  box.addEventListener("pointerdown", (e) => {
    fetchSpin();
    if (!ready[0]) return;
    stop(); clearInterval(back); clearTimeout(back); back = null;
    const n = mode === "spin" ? sn : 0;
    drag = { x: e.clientX, n, last: n };
    box.setPointerCapture(e.pointerId); box.classList.add("grab");
  });
  box.addEventListener("pointermove", (e) => {
    if (!drag || !spin) return;
    const step = Math.round((e.clientX - drag.x) / 14);
    drag.last = (((drag.n - step) % SPIN) + SPIN) % SPIN;
    showSpin(drag.last);
  });
  const end = () => {
    if (!drag) return;
    let n = drag.last; drag = null; box.classList.remove("grab");
    if (mode !== "spin") { play(); return; }
    // after a moment, turn back to face you the short way round, then pick the idle back up
    back = setTimeout(() => {
      back = setInterval(() => {
        if (n === 0) { clearInterval(back); back = null; seg = -1; f = 0; wait = idleFor(); draw(); play(); return; }
        n = n <= SPIN / 2 ? n - 1 : (n + 1) % SPIN; showSpin(n);
      }, calm ? 0 : 45);
    }, 1400);
  };
  box.addEventListener("pointerup", end);
  box.addEventListener("pointercancel", end);
  return {
    load(next, name) {
      if (next === id) return;
      id = next; stop(); clearInterval(back); clearTimeout(back); back = null; drag = null;
      spin = null; mode = ""; seg = 0; f = 0; played = 0;
      box.hidden = !next;
      if (!next) return;
      [em, ni] = POSE[next] || [[1], 1];
      urls = em.map((_, k) => url(k)); ready = em.map(() => false);
      el.setAttribute("aria-label", `${name}'s in-game model`);
      box.classList.add("swap");
      const still = `assets/img/hunters/3d/${next}.webp?v=${MODEL_V}`;
      const im = new Image();
      im.onload = () => {
        if (id !== next) return;
        el.style.backgroundImage = `url(${still})`; el.style.backgroundSize = "100% 100%"; el.style.backgroundPosition = "0 0";
        box.classList.remove("swap");
        const ps = new Image();
        ps.onload = () => { if (id !== next) return; ready[0] = true; draw(); play(); };
        ps.src = urls[0];
      };
      whenNear(() => setTimeout(() => { im.src = still; }, 180));
    },
  };
}

/* ---------- Hunters: pick a Mask ---------- */
// [id, name, title, has an up-to-date in-game model, role (from the kit's role line in the game)]
const MODEL_V = "2026-11-09";
const ART_V = "2026-11-09f"; // bump when a Hunter splash changes
const POSE = {"vex": [[43, 19], 40], "kael": [[43, 13, 13], 40], "cinder": [[43, 13], 45], "pip": [[38, 14, 13], 45], "tarek": [[33, 17, 15], 45], "lisette": [[43, 15], 45], "grimble": [[13, 43], 38], "claire": [[46, 13], 45], "ryzz": [[43, 23, 21], 45], "breaker": [[30, 13, 17], 40], "sable": [[46, 26], 45], "motley": [[13, 17, 17], 40]}; // filled by tools/turntable/pack.py // bump when the turntables are re-rendered so browsers fetch the new ones
const HUNTERS = [
  ["lisette", "Lace", "The Red Stitch", true, "Marksman"],
  ["kael", "Kael", "The Unbroken", true, "Bruiser"],
  ["vex", "Vex", "The Hired Gun", true, "Gunslinger"],
  ["breaker", "Albert", "The Barnacle Knight", true, "Tank"],
  ["claire", "Neve", "The Snowglide", true, "Controller"],
  ["cinder", "Cinder", "The Ashen Kiss", true, "Engage"],
  ["tarek", "Tenzo", "The Stone Seer", true, "Brawler"],
  ["ryzz", "Sparkle", "The Storm Chaser", true, "Skirmisher"],
  ["grimble", "Grimble", "The Scrap King", true, "Initiator"],
  ["pip", "Meeko", "The Dawnfox", true, "Support"],
  ["sable", "Sable", "The Silver Thief", true, "Duelist"],
  ["gill", "Gill", "The Novice Mage", false, "Mage"],
  ["motley", "Motley", "The Void Jester", true, "Controller"],
];

const pick = document.getElementById("h-pick");
if (pick) {
  const art = document.getElementById("h-art");
  const $ = (id) => document.getElementById(id);
  const src = (id, w) => `assets/img/hunters/${id}-${w}.webp?v=${ART_V}`;
  const set = (id) => `${src(id, 960)} 960w, ${src(id, 1600)} 1600w, ${src(id, 2400)} 2400w`;
  let current = 0;
  const fig = spinner(document.getElementById("h-fig"), document.getElementById("h-fig-img"));
  // load the first turntable only once the Hunters section is close to view
  new IntersectionObserver((es, o) => { if (es[0].isIntersecting) { o.disconnect(); fig.load(HUNTERS[current][3] ? HUNTERS[current][0] : "", HUNTERS[current][1]); } }, { rootMargin: "400px 0px" }).observe(document.getElementById("hunters"));

  HUNTERS.forEach(([id, name, title], i) => {
    const b = document.createElement("button");
    b.type = "button";
    b.setAttribute("aria-label", `${name}, ${title}`);
    b.setAttribute("aria-pressed", i === 0 ? "true" : "false");
    b.innerHTML = `<img src="${src(id, "face-192")}" alt="" loading="lazy"><span>${name}</span>`;
    b.addEventListener("click", () => show(i));
    b.addEventListener("pointerenter", () => { const im = new Image(); im.srcset = set(id); im.sizes = art.sizes; }, { once: true });
    pick.appendChild(b);
  });

  // Desktop: the stage holds under the nav and scrolling steps through every Hunter (scroll fast, go fast), then lets go.
  // Picking one by click, arrow or key moves the page to that Hunter's spot, so scrolling carries on from there.
  const track = $("h-track"), pinEl = track && track.querySelector(".h-pin"), sec = document.getElementById("hunters");
  const wide = matchMedia("(min-width: 1024px) and (min-height: 640px) and (hover: hover) and (pointer: fine)");
  let pin = null, fromScroll = false;
  const docTop = (el) => { let y = 0; for (let n = el; n; n = n.offsetParent) y += n.offsetTop; return y; };
  // The Hunters scene: the stage holds in place (sticky) for a stretch. "broken into pieces." arrives over it, breaks while
  // you scroll, then fades out as the stage fades in, so the heading turns into the Hunters instead of scrolling away.
  // On desktop the stage then keeps holding while the scroll steps through every Hunter.
  // Every bit of scroll here moves something: the heading breaks, then a glowing crack tears the Hunter's art open
  // across the stage, then the name and the picker rise in, then (desktop) each Hunter drifts while you step through.
  // The scene follows a smoothed copy of the scroll with a speed limit, so a hard flick still plays it through in about
  // a second and a half instead of skipping it, and slow scrolling is fully in your hands. No scroll-jacking on desktop.
  const stage = pinEl && pinEl.querySelector(".stage"), intro = $("h-intro"), shot = stage && stage.querySelector(".shot");
  const plab = pinEl && pinEl.querySelector(".pick-label");
  const ask = pinEl && pinEl.querySelector(".h-ask:not(.h-choose)"), askWords = ask ? [...ask.querySelectorAll("span:not(.sk)")] : [];
  const choose = pinEl && pinEl.querySelector(".h-choose"), chooseWords = choose ? [...choose.querySelectorAll("span")] : [];
  const late = stage ? [...stage.children].filter((el) => el !== shot).concat([...stage.querySelectorAll(".h-expand")]) : [];
  let cw = null;
  if (shot && art) { cw = document.createElement("div"); cw.className = "shot-c"; art.parentNode.insertBefore(cw, art); cw.appendChild(art); }
  const skip = plab && (() => { // jump straight to the next section
    const b = document.createElement("button"); b.type = "button"; b.className = "h-skip";
    b.innerHTML = 'Skip Hunters<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 9l6 6 6-6" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg>';
    b.addEventListener("click", () => { // the section after the Hunters
      let to = sec.nextElementSibling; while (to && to.tagName !== "SECTION") to = to.nextElementSibling;
      if (to) to.scrollIntoView({ behavior: "instant", block: "start" });
    });
    plab.appendChild(b); return b;
  })();
  const bar = plab && (() => { const s = document.createElement("span"); s.className = "h-bar"; s.setAttribute("aria-hidden", "true"); s.innerHTML = "<i></i>"; plab.insertBefore(s, plab.querySelector(".swipe")); return s.firstChild; })();
  const clamp = (v) => Math.min(1, Math.max(0, v)), sm = (v) => v * v * (3 - 2 * v);
  let sd = 11; const rnd = () => ((sd = (sd * 16807) % 2147483647) / 2147483647);
  const jag = []; { let x = 0; for (let i = 0; i <= 12; i++) { jag.push(x); x = Math.max(-7, Math.min(7, x + (rnd() - 0.5) * 9)); } } // the crack's path, the same every visit
  const crack = (r) => {
    const n = jag.length - 1, w = r * 66, bend = 1 - r * 0.5, L = [], R = [];
    jag.forEach((j, i) => { const y = (-2 + i * (104 / n)).toFixed(1), c = 50 + j * bend; L.push(`${(c - w).toFixed(2)}% ${y}%`); R.unshift(`${(c + w).toFixed(2)}% ${y}%`); });
    return `polygon(${L.join(", ")}, ${R.join(", ")})`;
  };
  // the rift: the glowing fault that runs out from the broken words, up and down the stage, along the line the art then splits on
  const rift = shot && (() => {
    const ns = "http://www.w3.org/2000/svg", svg = document.createElementNS(ns, "svg");
    svg.setAttribute("class", "h-rift"); svg.setAttribute("viewBox", "0 0 100 100"); svg.setAttribute("preserveAspectRatio", "none"); svg.setAttribute("aria-hidden", "true");
    const n = jag.length - 1, pt = (i) => `${(50 + jag[i]).toFixed(2)} ${(-2 + i * (104 / n)).toFixed(2)}`, mid = n / 2;
    const half = (to) => { const idx = []; for (let i = mid; to < mid ? i >= to : i <= to; i += to < mid ? -1 : 1) idx.push(i); return "M" + idx.map(pt).join(" L"); };
    const paths = [];
    ["glow", "core"].forEach((cls) => [half(0), half(n)].forEach((d) => {
      const p = document.createElementNS(ns, "path"); p.setAttribute("d", d); p.setAttribute("class", cls);
      p.setAttribute("vector-effect", "non-scaling-stroke"); svg.appendChild(p); paths.push(p);
    }));
    shot.appendChild(svg);
    return { svg, paths };
  })();
  const tidy = (els) => els.forEach((el) => { el.style.opacity = el.style.translate = el.style.transition = el.style.transform = ""; });
  let scn = null, sceneOn = false, lastQ = -1;
  const paintScene = (q) => {
    if (q === lastQ) return;
    lastQ = q;
    if (q >= 1) { // fully in: hand everything back to the stylesheet
      tidy([stage, plab, pick, ...late]); intro.style.opacity = "0"; intro.style.visibility = "hidden"; if (ask) ask.style.visibility = "hidden"; if (choose) choose.style.visibility = "hidden";
      if (cw) { cw.style.clipPath = cw.style.webkitClipPath = ""; cw.style.opacity = ""; } shot.style.filter = ""; if (rift) rift.svg.style.opacity = "0";
    } else {
      // 1) the broken heading lifts away
      const io = 1 - sm(clamp((q - 0.02) / 0.11));
      intro.style.opacity = io.toFixed(3); intro.style.visibility = io < 0.005 ? "hidden" : "";
      intro.style.transform = `translate3d(0, ${(-70 * (1 - io)).toFixed(1)}px, 0) scale(${(1 - 0.06 * (1 - io)).toFixed(4)})`;
      // 2) "Will you save the Skylands?" rises in word by word, holds, then lifts away as the fault opens
      if (ask) {
        const out = sm(clamp((q - 0.48) / 0.08)); // it holds from about 0.3 to 0.48: long enough to read it
        ask.style.visibility = q > 0.06 && out < 1 ? "visible" : "hidden";
        askWords.forEach((w, k) => {
          const a = sm(clamp((q - 0.1 - k * 0.03) / 0.1));
          w.style.opacity = (a * (1 - out)).toFixed(3);
          w.style.transform = `translate3d(0, ${(34 * (1 - a) - 30 * out).toFixed(1)}px, 0) scale(${(0.86 + 0.14 * a + 0.04 * out).toFixed(4)})`;
        });
      }
      // 3) then "Choose your Hunter." rises in the same place, holds while the stage surfaces, and lifts as it cracks open
      if (choose) {
        const out = sm(clamp((q - 0.76) / 0.08));
        choose.style.visibility = q > 0.54 && out < 1 ? "visible" : "hidden";
        chooseWords.forEach((w, k) => {
          const a = sm(clamp((q - 0.56 - k * 0.03) / 0.08));
          w.style.opacity = (a * (1 - out)).toFixed(3);
          w.style.transform = `translate3d(0, ${(34 * (1 - a) - 30 * out).toFixed(1)}px, 0) scale(${(0.86 + 0.14 * a + 0.04 * out).toFixed(4)})`;
        });
      }
      q = clamp((q - 0.66) / 0.34); // the rest plays out under it
      const f = sm(clamp(q / 0.2)); // the stage's dark frame surfaces under the fault
      stage.style.transition = "none"; stage.style.opacity = f.toFixed(3); stage.style.transform = `scale(${(0.975 + 0.025 * f).toFixed(4)})`;
      const draw = sm(clamp((q - 0.02) / 0.3));
      // 2) then it splits open along that line, glowing ember, cooling as it widens
      const r = sm(clamp((q - 0.3) / 0.46));
      if (rift) {
        rift.svg.style.opacity = (Math.min(1, draw * 1.6) * (1 - sm(clamp(r / 0.55)))).toFixed(3);
        const e = (50 - 52 * draw).toFixed(2); rift.svg.style.clipPath = `inset(${e}% -20% ${e}% -20%)`; // runs out from the middle
      }
      if (cw && LITE.on()) { cw.style.clipPath = cw.style.webkitClipPath = ""; cw.style.opacity = r.toFixed(3); } // lite: a plain fade, the jagged mask is costly
      else if (cw) { cw.style.opacity = ""; cw.style.clipPath = cw.style.webkitClipPath = r > 0 ? crack(r) : "polygon(50% 0, 50% 0, 50% 0)"; }
      shot.style.filter = r > 0 && r < 1 && !LITE.on() ? `drop-shadow(0 0 ${(4 + 14 * r).toFixed(1)}px rgba(255, 96, 48, ${(0.95 * (1 - r)).toFixed(3)}))` : "";
      shot.style.setProperty("--zr", (0.12 * (1 - r)).toFixed(4)); // and the art settles from close up
      const o = sm(clamp((q - 0.62) / 0.26)); // 3) then the name, the count and the arrows
      late.forEach((el) => { el.style.transition = "none"; el.style.opacity = o.toFixed(3); el.style.translate = `0 ${(16 * (1 - o)).toFixed(1)}px`; });
      [[plab, 0.7], [pick, 0.76]].forEach(([el, s]) => { if (!el) return; const p = sm(clamp((q - s) / 0.24)); // then the picker
        el.style.transition = "none"; el.style.opacity = p.toFixed(3); el.style.translate = `0 ${(22 * (1 - p)).toFixed(1)}px`; });
    }
    const on = q > 0.8;
    if (on !== sceneOn) { sceneOn = on; sec.classList.toggle("scene-on", on); }
  };
  const render = (y) => {
    if (!scn) return;
    const vh = innerHeight;
    if (window.bokiCrumble) window.bokiCrumble.set(clamp((y - (scn.s0 - vh * 0.3)) / (vh * 0.45)));
    paintScene(clamp((y - (scn.s0 + vh * 0.1)) / (scn.lead - vh * 0.1)));
    if (pin) {
      const k = (y - pin.start) / pin.step, i = Math.min(HUNTERS.length - 1, Math.max(0, Math.floor(k))), fr = clamp(k - i);
      if (i !== current) { fromScroll = true; show(i); fromScroll = false; }
      // each Hunter slowly pushes in while you're on it
      zsGoal = LITE.on() ? 0 : 0.018 * Math.sin(Math.PI * fr); // eased in tick(), so racing through Hunters doesn't make it throb (off in lite)
      if (bar) bar.style.transform = `scaleX(${clamp((k + 0.5) / HUNTERS.length).toFixed(4)})`;
    }
  };
  // the smoothed scroll: eases after the real one, never faster than the scene's speed limit
  let ys = null, raf = 0, lt = 0, zs = 0, zsGoal = 0;
  const touchy = matchMedia("(pointer: coarse)").matches;
  const tick = (now) => {
    raf = 0;
    const y = scrollY, vh = innerHeight, dt = lt ? Math.min(0.05, (now - lt) / 1000) : 1 / 60; lt = now;
    if (ys === null || !scn) ys = y;
    let d = y - ys;
    if (Math.abs(d) > vh * 2.2) { ys = y - Math.sign(d) * vh * 0.5; d = y - ys; } // a long jump (a link, End): only play the last bit
    const inScene = ys > scn.s0 - vh * 0.31 && ys < scn.s0 + scn.lead, breaking = ys < scn.s0 + vh * 0.15;
    const asking = ys < scn.s0 + vh * 0.1 + (scn.lead - vh * 0.1) * 0.8; // the question and "Choose your Hunter." get a slower pass too
    const cap = (inScene ? (breaking ? (touchy ? 0.28 : 0.55) : asking ? (touchy ? 0.42 : 0.6) : (touchy ? 0.5 : 0.8)) : 2.4) * vh * (d < 0 ? 1.8 : 1) * dt; // phones play it slower: a thumb flick covers the whole scene at once
    ys += Math.max(-cap, Math.min(cap, d * (1 - Math.exp(-dt * 14))));
    if (Math.abs(y - ys) < 0.5) ys = y;
    render(ys);
    zs += (zsGoal - zs) * (1 - Math.exp(-dt * 3)); if (Math.abs(zsGoal - zs) < 0.0002) zs = zsGoal;
    if (shot) shot.style.setProperty("--zs", zs.toFixed(4));
    if (ys !== y || zs !== zsGoal) raf = requestAnimationFrame(tick); else lt = 0;
  };
  const kick = () => { if (!raf && scn) raf = requestAnimationFrame(tick); };
  window.bokiSceneTick = () => { if (scn && ys !== null) { lastQ = -1; render(ys); } };
  const layoutPin = () => {
    if (!track) return;
    const on = (wide.matches || touchy) && !calm; // phones step through the Hunters too, one swipe per Hunter (below)
    sec.classList.toggle("pinned", on); sec.classList.toggle("scene", !calm);
    track.style.height = ""; pinEl.style.top = ""; pin = null; scn = null;
    if (calm) return;
    const vh = innerHeight, h = pinEl.offsetHeight, navH = (document.getElementById("nav") || {}).offsetHeight || 64;
    let top = on ? Math.max(80, Math.round((vh - h) / 2 + 34)) : Math.max(navH + 10, Math.round((vh - h) / 2 + navH / 2));
    if (top + h > vh - 8) top = Math.max(vh - h - 8, navH + 6 - Math.max(0, h - vh + navH + 14)); // taller than the screen: keep the bottom in view
    const lead = Math.round(vh * (on ? 2.3 : 2.15)), step = Math.max(240, Math.round(vh * 0.36));
    pinEl.style.top = top + "px";
    track.style.scrollMarginTop = top + "px";
    track.style.height = Math.round(h + lead + (on ? vh * 0.45 : vh * 0.12)) + "px"; // "Choose your Hunter." lands, the stage holds a beat, then the page scrolls on
    const s0 = docTop(track) - top;
    scn = { s0, lead };
    void step; // Hunters are browsed sideways now (arrows, the strip, a sideways swipe), so scrolling down leaves the section
    if (ys === null) ys = scrollY;
    lastQ = -1; render(ys); kick();
  };
  addEventListener("scroll", kick, { passive: true });
  let lw = innerWidth, lh = innerHeight;
  addEventListener("resize", () => { // phones resize as the toolbar hides on scroll: only re-measure on a real change
    if (innerWidth === lw && Math.abs(innerHeight - lh) < 160 && matchMedia("(pointer: coarse)").matches) return;
    lw = innerWidth; lh = innerHeight; layoutPin();
  });
  addEventListener("load", layoutPin);
  wide.addEventListener && wide.addEventListener("change", layoutPin);
  layoutPin();

  // Mouse and trackpad, the same both ways: a hard flick never flies past the Hunters. Coming in or going out it stops
  // on the first or last Hunter; inside, it moves at most two Hunters, and the rest of that flick is held back.
  // A new swipe, a click or a key starts fresh, and slow scrolling is never caught.
  if (!calm) {
    let lastW = 0, peak = 0, dec = 0, dir = 0, start = 0, caught = null, since = 0, spent = false, prevA = 0, steady = 0;
    // clearly heading somewhere (two flicks the same way, both caught): stop catching that way until they turn
    // around or pause, so getting to the top, or on to the Boki, is quick
    const run = { 1: 0, "-1": 0 }, lastRun = { 1: 0, "-1": 0 }, free = { 1: false, "-1": false };
    const spots = () => [Math.round(scn.s0 + scn.lead)].concat(pin ? HUNTERS.slice(1).map((_, i) => Math.round(pin.start + (i + 1.5) * pin.step)) : []);
    const stopFor = () => { // where this flick should come to rest
      const list = spots(), end = list[list.length - 1];
      const ahead = dir > 0 ? list.filter((s) => s > start + 12) : list.filter((s) => s < start - 12).reverse();
      return ahead.find((s, j) => j >= 1 || s === list[0] || s === end);
    };
    const crosses = (from, to, s) => s !== undefined && (dir > 0 ? from < s && to >= s : from > s && to <= s);
    const land = (s, now) => {
      caught = s; since = now; scrollTo({ top: s, behavior: "instant" });
      run[dir] = now - lastRun[dir] < 4000 ? run[dir] + 1 : 1; lastRun[dir] = now; if (run[dir] >= 2) free[dir] = true;
    }; // the stage is held in place, so nothing jumps
    ["mousedown", "keydown", "touchstart"].forEach((ev) => addEventListener(ev, () => { caught = null; spent = true; }, { passive: true }));
    addEventListener("wheel", (e) => {
      if (!scn || !e.deltaY) return;
      const now = performance.now(), dy = e.deltaY * (e.deltaMode === 1 ? 32 : e.deltaMode === 2 ? innerHeight : 1), a = Math.abs(dy), d = Math.sign(dy);
      // a new gesture, not the tail of the last one: a pause, a reversal, or (once a caught flick has had time to fade)
      // the wheel picking up hard again. A swipe ramps up as it starts, so that alone doesn't count.
      const fresh = now - lastW > 220 || d !== dir || (caught !== null && now - since > 300 && a > dec * 2 + 24);
      if (now - lastW > 5000) { free[1] = free[-1] = false; run[1] = run[-1] = 0; } // a pause: back to normal
      else if (fresh && d !== dir) { free[-d] = false; run[-d] = 0; }                  // turning around: that way is caught again
      lastW = now;
      // a flick's coasting tail only ever fades; fingers still on the trackpad hold steady or speed up
      steady = !fresh && a >= prevA * 0.97 && a > 3 ? steady + 1 : 0; prevA = a;
      if (fresh) { peak = dec = a; dir = d; start = scrollY; caught = null; spent = false; } else { peak = Math.max(peak, a); dec = Math.max(a, dec * 0.8); }
      if (caught !== null && steady >= 3) { caught = null; spent = true; } // still scrolling on purpose: let go at once, no stall
      if (caught !== null) { if (now - since < 1600) { e.preventDefault(); return; } caught = null; spent = true; } // the rest of this flick is held back
      if (spent || peak < 60 || free[dir] || steady >= 3) return; // slow or steady scrolling, or clearly heading somewhere
      const s = stopFor(), y = scrollY;
      if (crosses(y, y + dy, s) && Math.abs(s - y) < innerHeight * 1.6) { e.preventDefault(); land(s, now); }
    }, { passive: false });
    let prevY = scrollY, prevT = 0;
    addEventListener("scroll", () => {
      const y = scrollY, now = performance.now(), live = now - lastW < 220, fast = Math.abs(y - prevY) / Math.max(8, now - prevT) > 1.5;
      if (caught !== null) { if (now - since < 1600 && (dir > 0 ? y > caught : y < caught)) scrollTo({ top: caught, behavior: "instant" }); }
      else if (scn && live && !spent && !free[dir] && steady < 3 && (peak >= 60 || fast)) { // smooth-scrolling mice glide between wheel events: catch the glide too
        const s = stopFor();
        if (crosses(prevY, y, s)) land(s, now);
      }
      prevY = scrollY; prevT = now;
    }, { passive: true });
  }

  // Phones only: momentum can fling a thumb straight past the scene. Nothing is moved for you on the way in: the heading
  // follows your finger. If a fast flick carries the page past the first Hunter, it stops there (the stage is pinned, so
  // nothing on screen jumps) and stays put while the heading finishes breaking, then lets go.
  if (!calm) {
    const coarse = matchMedia("(pointer: coarse)"), root = document.documentElement;
    let held = false, jump = 0, prevY = scrollY, prevT = 0, target = 0;
    document.addEventListener("click", (e) => { if (e.target.closest('a[href*="#"]')) jump = performance.now(); }, true);
    addEventListener("hashchange", () => { jump = performance.now(); });
    const block = (e) => { if (held) e.preventDefault(); };
    const keys = (e) => { if (held && /^(ArrowDown|ArrowUp|PageDown|PageUp| |End|Home)$/.test(e.key)) e.preventDefault(); };
    const hold = (at) => {
      held = true; target = at;
      root.style.overflow = "hidden"; document.body.style.overflow = "visible"; // body stays visible so the sticky stage keeps working
      addEventListener("touchmove", block, { passive: false }); addEventListener("wheel", block, { passive: false }); addEventListener("keydown", keys);
      if (Math.abs(scrollY - at) > 2) scrollTo({ top: at, behavior: "instant" }); // inside the pinned stage: invisible
      kick();
      const t0 = performance.now();
      const wait = () => {
        if (ys !== scrollY && performance.now() - t0 < 2500) { setTimeout(wait, 60); return; }
        held = false; root.style.overflow = ""; document.body.style.overflow = "";
        removeEventListener("touchmove", block); removeEventListener("wheel", block); removeEventListener("keydown", keys);
      };
      setTimeout(wait, 150);
    };
    addEventListener("scroll", () => {
      const y = scrollY, now = performance.now();
      if (held) { if (Math.abs(y - target) > 2) scrollTo({ top: target, behavior: "instant" }); prevY = scrollY; prevT = now; return; } // leftover momentum can't move it
      if (scn && coarse.matches && now - jump > 1500) {
        const c = Math.round(scn.s0 + scn.lead) + 2, v = (y - prevY) / Math.max(8, now - prevT); // px per ms
        if (prevY < c && y >= c && v > 1.2 && y - prevY < innerHeight * 1.5) hold(c); // a fast pass down over the first Hunter: stop on it (not a jump)
      }
      prevY = y; prevT = now;
    }, { passive: true });

    // Phones: one swipe, one Hunter. Inside the Hunters a vertical swipe glides to the next (or previous) Hunter
    // instead of flinging past them all; at the first or last Hunter it scrolls on normally, and sideways swipes
    // still browse the strip. "Skip Hunters" jumps straight past.
    if (touchy) {
      let sy = 0, sx = 0, mode = -1, glide = 0;
      const last = () => HUNTERS.length - 1;
      const spot = (i) => Math.round(i === 0 ? pin.start + 2 : pin.start + (i + 0.5) * pin.step);
      const idx = () => Math.min(last(), Math.max(0, Math.floor((scrollY - pin.start) / pin.step)));
      const inTrack = () => pin && scrollY >= pin.start - 6 && scrollY <= spot(last()) + 6;
      const glideTo = (to) => {
        cancelAnimationFrame(glide);
        const from = scrollY, d = to - from, t0 = performance.now(), dur = 420;
        const f = (now) => { const k = Math.min(1, (now - t0) / dur), e = 1 - Math.pow(1 - k, 3); scrollTo({ top: Math.round(from + d * e), behavior: "instant" }); if (k < 1) glide = requestAnimationFrame(f); };
        glide = requestAnimationFrame(f);
      };
      addEventListener("touchstart", (e) => { const p = e.touches[0]; sy = p.clientY; sx = p.clientX; mode = !held && inTrack() ? 0 : -1; }, { passive: true });
      addEventListener("touchmove", (e) => {
        if (mode === -1) return;
        const p = e.touches[0], dy = sy - p.clientY, dx = sx - p.clientX;
        if (mode === 0) {
          if (Math.abs(dy) < 8 && Math.abs(dx) < 8) return;
          if (Math.abs(dx) > Math.abs(dy)) { mode = -1; return; }                              // sideways: the strip
          const i = idx();
          if ((dy < 0 && i === 0) || (dy > 0 && i === last() && scrollY >= spot(last()) - 6)) { mode = -1; return; } // leaving the Hunters
          mode = 1;
        }
        e.preventDefault();
      }, { passive: false });
      addEventListener("touchend", (e) => {
        if (mode !== 1) { mode = -1; return; }
        mode = -1;
        const dy = sy - e.changedTouches[0].clientY;
        const i = idx(), j = Math.abs(dy) < 30 ? i : Math.max(0, Math.min(last(), i + Math.sign(dy)));
        glideTo(spot(j));
      }, { passive: true });
    }
  }

  function show(i) {
    i = (i + HUNTERS.length) % HUNTERS.length;
    if (i === current) return;
    current = i;
    if (pin && !fromScroll && scrollY > pin.start - innerHeight * 0.6 && scrollY < pin.start + pin.step * HUNTERS.length)
      { scrollTo({ top: pin.start + (i + 0.5) * pin.step, behavior: "instant" }); ys = scrollY; } // the page follows the pick, without replaying the Hunters between
    $("h-n").textContent = String(i + 1).padStart(2, "0");
    if (bar) bar.style.transform = `scaleX(${((i + 1) / HUNTERS.length).toFixed(4)})`;
    const [id, name, title, model, role] = HUNTERS[i];
    pick.querySelectorAll("button").forEach((b, j) => b.setAttribute("aria-pressed", j === i ? "true" : "false"));
    { // keep the picked portrait in view by scrolling the strip only, never the page
      const btn = pick.children[i];
      if (pick.scrollWidth > pick.clientWidth) pick.scrollTo({ left: btn.offsetLeft - (pick.clientWidth - btn.clientWidth) / 2, behavior: "smooth" });
    }
    art.classList.add("out");
    const next = new Image();
    next.sizes = art.sizes;
    next.srcset = set(id);
    const swap = () => {
      if (current !== i) return;
      art.srcset = set(id);
      art.src = src(id, 1600);
      art.alt = `${name}, ${title}`;
      art.closest(".stage").dataset.h = id; // hook for per-Hunter CSS tweaks
      $("h-name").textContent = name;
      $("h-title").textContent = title;
      $("h-role").textContent = role;
      alignTitle();
      fig.load(model ? id : "", name);
      art.classList.remove("out");
    };
    next.decode ? next.decode().then(swap, swap) : (next.onload = swap);
  }

  // Big letters have a wider side bearing than small ones, so line the title up with the name's ink, not its box.
  const ink = (el, ch, mid) => { // px from the text origin to the first painted column of ch
    const cs = getComputedStyle(el), px = parseFloat(cs.fontSize), w = Math.ceil(px * 2), h = Math.ceil(px * 1.6);
    const cv = document.createElement("canvas"); cv.width = w; cv.height = h;
    const c = cv.getContext("2d", { willReadFrequently: true });
    c.font = `${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`; c.textBaseline = "top"; c.fillText(ch, px / 2, px / 4);
    const d = c.getImageData(0, 0, w, h).data, on = (x, y) => d[(y * w + x) * 4 + 3] > 96;
    let top = -1, bot = -1; // the glyph's rows, then the left edge of its middle band: V or A read by their body, not their tips
    for (let y = 0; y < h && top < 0; y++) for (let x = 0; x < w; x++) if (on(x, y)) { top = y; break; }
    for (let y = h - 1; y >= 0 && bot < 0; y--) for (let x = 0; x < w; x++) if (on(x, y)) { bot = y; break; }
    if (top < 0) return 0;
    const y0 = mid ? Math.round(top + (bot - top) * 0.3) : top, y1 = mid ? Math.round(top + (bot - top) * 0.7) : bot;
    let sum = 0, n = 0; // average left edge over the band, so round (C) and slanted (V) letters line up by eye
    for (let y = y0; y <= y1; y++) for (let x = 0; x < w; x++) if (on(x, y)) { sum += x; n++; break; }
    return n ? sum / n - px / 2 : 0;
  };
  // Phones: every name and title stays on one line, all sized to fit the longest, so the box keeps one height.
  const fitInfo = () => {
    const n = $("h-name"), t = $("h-title"), info = t.closest(".info");
    n.style.fontSize = t.style.fontSize = "";
    if (getComputedStyle(t).whiteSpace !== "nowrap") return;
    const cs = getComputedStyle(info), room = info.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight) - 4;
    const widest = (el, k) => {
      const c = getComputedStyle(el), sp = document.createElement("span");
      Object.assign(sp.style, { font: c.font, letterSpacing: c.letterSpacing, textTransform: c.textTransform, whiteSpace: "nowrap", position: "absolute", visibility: "hidden" });
      document.body.appendChild(sp);
      const w = Math.max(...HUNTERS.map((h) => { sp.textContent = h[k]; return sp.getBoundingClientRect().width; }));
      sp.remove(); return w;
    };
    [[n, 1], [t, 2]].forEach(([el, k]) => {
      const w = widest(el, k);
      if (w > room) el.style.fontSize = (Math.floor(parseFloat(getComputedStyle(el).fontSize) * room / w * 2) / 2) + "px";
    });
  };
  function alignTitle() {
    fitInfo();
    const n = $("h-name"), t = $("h-title");
    t.style.paddingLeft = Math.max(0, ink(n, n.textContent[0], true) - ink(t, t.textContent[0].toUpperCase()) + parseFloat(getComputedStyle(n).fontSize) * 0.07).toFixed(1) + "px"; // tucked in a touch so it never reads left of the name
    $("h-role").style.marginLeft = t.style.paddingLeft;
  }
  alignTitle();
  document.fonts && document.fonts.ready.then(alignTitle);
  addEventListener("resize", alignTitle);

  if (bar) bar.style.transform = `scaleX(${(1 / HUNTERS.length).toFixed(4)})`;
  // Sideways scrolling browses the Hunters: a trackpad swipe left or right, or Shift + wheel. One Hunter per swipe.
  // Up and down scrolling is left alone, so it carries on down the page.
  {
    let acc = 0, lastX = 0, used = false;
    sec.addEventListener("wheel", (e) => {
      const dx = e.deltaX || (e.shiftKey ? e.deltaY : 0);
      if (!dx || Math.abs(dx) < Math.abs(e.shiftKey ? 0 : e.deltaY)) return;
      if (!sceneOn && !calm) return; // only once the stage is up
      e.preventDefault(); // and not the browser's back/forward swipe
      const now = performance.now();
      if (now - lastX > 220) { acc = 0; used = false; } // a new swipe
      lastX = now; if (used) return;
      acc += dx * (e.deltaMode === 1 ? 32 : 1);
      if (Math.abs(acc) > 40) { used = true; show(current + Math.sign(acc)); }
    }, { passive: false });
  }
  $("h-prev").addEventListener("click", () => show(current - 1));
  arrowKeys(document.getElementById("hunters"), pick, (d) => show(current + d));
  $("h-next").addEventListener("click", () => show(current + 1));
  swipe(document.querySelector(".stage .shot"), (d) => show(current + d));
  nudge(pick);

  pick.addEventListener("keydown", (e) => {
    const d = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
    if (!d) return;
    e.preventDefault();
    const n = (current + d + HUNTERS.length) % HUNTERS.length;
    show(n);
    pick.children[n].focus({ preventScroll: true });
  });
}

/* ---------- Boki browser ---------- */
// [id, name, mix, size, found, glow, body, flavor, [bravery, loyalty, temper, curiosity]]
/* ---------- Boki: the revealed ones as a wall of cards in staggered columns that drift as you scroll past, then
   the rest of the roster as silhouettes. Built from assets/boki.json (tools/boki/build.py). Tap a card for a closer look. ---------- */
const TYPE = { fire: "#ff8a4c", electric: "#ffd84a", ice: "#9fe3ff", dark: "#a78bff", fairy: "#ff9df0", poison: "#a6ff3a", water: "#4fc3ff",
  grass: "#7dde6b", sound: "#ffb36b", spore: "#9ef0c0", rock: "#d2bf9f", psychic: "#e39bff", bug: "#ffcf5a", steel: "#c8d2e0",
  dragon: "#8fe8c8", flying: "#a8d4ff", crystal: "#b8f0ff", normal: "#f4e2c4" }; // the Bokidex's types (tools/boki/build.py)
const cap = (t) => t.charAt(0).toUpperCase() + t.slice(1);
const bw = document.getElementById("bw");
if (bw) fetch("assets/boki.json").then((r) => r.json()).then((data) => {
  const LIST = data.revealed;
  const FEATURED = innerWidth >= 1000 ? 12 : innerWidth >= 640 ? 8 : 6; // two or three tidy rows, the front-page shots first; the rest are one tap away
  const pic = (b, w) => `assets/img/boki-front/${b.id}-${w}.webp?v=${b.v}`;
  const cards = LIST.map((b, i) => {
    const c = document.createElement("button");
    c.type = "button"; c.className = "bw-card";
    c.style.setProperty("--g", TYPE[b.types[0]] || "#9a7dff");
    c.innerHTML = `<span class="bw-art"><img src="${pic(b, 480)}" alt="" loading="lazy" width="480" height="480"></span><span class="bw-txt"><b></b><i></i></span>`;
    c.querySelector("b").textContent = b.name; c.querySelector("i").textContent = b.types.map(cap).join(" · ");
    c.setAttribute("aria-label", `${b.name}, ${b.types.join(" and ")} type`);
    if (i >= FEATURED) c.hidden = true;
    c.addEventListener("click", () => openCard(i));
    return c;
  });
  let cols = [];
  const deal = () => {
    const n = innerWidth >= 1000 ? 6 : innerWidth >= 640 ? 4 : 2;
    if (cols.length === n) return;
    bw.innerHTML = ""; cols = [];
    for (let k = 0; k < n; k++) { const col = document.createElement("div"); col.className = "bw-col"; bw.appendChild(col); cols.push(col); }
    cards.forEach((c, i) => cols[i % n].appendChild(c));
    drift();
  };
  const more = document.getElementById("bw-more");
  if (LIST.length > FEATURED) {
    more.hidden = false; more.textContent = `See all ${LIST.length}`;
    more.addEventListener("click", () => {
      cards.forEach((c, i) => { if (c.hidden) { c.hidden = false; c.style.setProperty("--d", ((i - FEATURED) % 6) * 50 + "ms"); } });
      more.parentElement.hidden = true; drift();
    });
  } else more.parentElement.hidden = true;
  let tick = false;
  const drift = () => {
    if (calm || !cols.length) return;
    const r = bw.getBoundingClientRect(), vh = innerHeight;
    if (r.bottom < -200 || r.top > vh + 200) return;
    const p = (vh - r.top) / (vh + r.height) - 0.5;
    const amp = innerWidth >= 640 ? 22 : 10; // a gentle drift, not a race
    cols.forEach((col, k) => { col.style.transform = `translate3d(0, ${(-(k % 2 ? 1 : -0.4) * amp * p * 2).toFixed(1)}px, 0)`; });
  };
  addEventListener("scroll", () => { if (!tick) { tick = true; requestAnimationFrame(() => { tick = false; drift(); }); } }, { passive: true });
  addEventListener("resize", deal);
  deal();
  const seen = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add("in"); seen.unobserve(e.target); } }), { rootMargin: "0px 0px -6% 0px" });
  cards.forEach((c, i) => { c.style.setProperty("--d", (i % 6) * 60 + "ms"); seen.observe(c); });

  // The rest of the roster: silhouettes where we have a shape, eggs where we don't yet
  const dark = document.getElementById("bk-dark");
  if (dark) {
    dark.querySelector(".bk-dark-n").textContent = "Over 200 Boki to find.";
    dark.querySelector(".bk-dark-s").remove();
    const grid = dark.querySelector(".bk-sils");
    // three full rows of the mystery: silhouettes from the dex, eggs, and more eggs if the dex is short
    const types = Object.keys(TYPE), list = data.hidden.slice(0, 39);
    for (let i = 0; list.length < 39; i++) list.push({ t: types[(i * 7 + 3) % types.length], sil: null });
    list.forEach((h) => {
      const t = document.createElement("span");
      t.className = "bk-sil" + (h.sil ? "" : " egg"); t.style.setProperty("--g", TYPE[h.t] || "#9a7dff");
      t.innerHTML = h.sil ? `<img src="assets/img/boki-sil/${h.sil}-240.webp" alt="" loading="lazy">` : "<i>?</i>";
      grid.appendChild(t);
    });
    dark.hidden = false;
  }

  // A closer look: big art, types, its line, and its description. Arrows, swipes and keys browse; Esc closes.
  let box, at = 0, back = null;
  const build = () => {
    box = document.createElement("div");
    box.className = "bm"; box.hidden = true;
    box.setAttribute("role", "dialog"); box.setAttribute("aria-modal", "true"); box.setAttribute("aria-label", "Boki");
    box.innerHTML = `<div class="bm-card"><div class="bm-art"><img alt=""></div><div class="bm-txt"><div class="bm-mix"></div><h3></h3><p class="bm-desc"></p><p class="bm-line"></p></div>
      <button class="bk-arrow prev" type="button" aria-label="Previous Boki"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg></button>
      <button class="bk-arrow next" type="button" aria-label="Next Boki"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 5l7 7-7 7" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg></button>
      <button class="lb-x" type="button" aria-label="Close">&times;</button></div>`;
    document.body.appendChild(box);
    box.addEventListener("click", (e) => { if (e.target === box) closeCard(); });
    box.querySelector(".lb-x").addEventListener("click", closeCard);
    box.querySelector(".prev").addEventListener("click", () => fill(at - 1));
    box.querySelector(".next").addEventListener("click", () => fill(at + 1));
    swipe(box.querySelector(".bm-art"), (d) => fill(at + d));
    document.addEventListener("keydown", (e) => {
      if (box.hidden) return;
      if (e.key === "Escape") closeCard();
      else if (e.key === "ArrowRight") fill(at + 1);
      else if (e.key === "ArrowLeft") fill(at - 1);
    });
  };
  const list = (names) => {
    const known = names.filter(Boolean), unknown = names.length - known.length;
    const parts = [...known, ...(unknown ? [unknown === 1 ? "one we haven't shown yet" : `${unknown} we haven't shown yet`] : [])];
    return parts.length < 2 ? parts.join("") : parts.slice(0, -1).join(", ") + " and " + parts[parts.length - 1];
  };
  const fill = (i) => {
    at = (i + LIST.length) % LIST.length;
    const b = LIST[at];
    const card = box.querySelector(".bm-card");
    card.style.setProperty("--g", TYPE[b.types[0]] || "#9a7dff");
    const img = box.querySelector(".bm-art img");
    img.classList.remove("on"); img.src = pic(b, 960); img.alt = b.name;
    const on = () => img.classList.add("on");
    if (img.decode) img.decode().then(on, on); else on();
    box.querySelector(".bm-mix").textContent = b.types.map(cap).join(" · ");
    box.querySelector("h3").textContent = b.name;
    const desc = box.querySelector(".bm-desc"); desc.textContent = b.desc || ""; desc.hidden = !b.desc;
    const line = [];
    if (b.from) line.push(`Evolves from ${b.from}.`); else if (b.fromHidden) line.push("Evolves from a Boki we haven't shown yet.");
    if (b.into.length) line.push(`Evolves into ${list(b.into)}.`);
    const l = box.querySelector(".bm-line"); l.textContent = line.join(" "); l.hidden = !line.length;
  };
  function openCard(i) {
    if (!box) build();
    back = document.activeElement; fill(i);
    box.hidden = false; document.documentElement.classList.add("lb-open");
    requestAnimationFrame(() => box.classList.add("show"));
    box.querySelector(".lb-x").focus({ preventScroll: true });
  }
  function closeCard() {
    box.classList.remove("show"); document.documentElement.classList.remove("lb-open");
    setTimeout(() => { box.hidden = true; }, 220);
    if (back) back.focus({ preventScroll: true });
  }
}).catch(() => {});

/* ---------- shared: swipe to switch, and a one-time nudge so the strip reads as scrollable ---------- */
function swipe(el, go) {
  if (!el) return;
  let x0 = null, y0 = 0;
  el.addEventListener("pointerdown", (e) => { if (e.pointerType !== "mouse") { x0 = e.clientX; y0 = e.clientY; } });
  el.addEventListener("pointerup", (e) => {
    if (x0 === null) return;
    const dx = e.clientX - x0, dy = e.clientY - y0; x0 = null;
    if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)) { el._swiped = Date.now(); go(dx < 0 ? 1 : -1); }
  });
  el.addEventListener("pointercancel", () => { x0 = null; });
}
function nudge(strip) {
  if (calm || !("IntersectionObserver" in window)) return;
  const io = new IntersectionObserver(([e]) => {
    if (!e.isIntersecting || strip.scrollWidth <= strip.clientWidth + 4) return;
    io.disconnect();
    setTimeout(() => {
      strip.scrollTo({ left: 90, behavior: "smooth" });
      setTimeout(() => strip.scrollTo({ left: 0, behavior: "smooth" }), 650);
    }, 500);
  }, { threshold: 0.9 });
  io.observe(strip);
}

/* Left/right arrow keys switch Hunter or Boki while the mouse is over that section.
   (The picker strips handle their own keys when focused, so skip those.) */
function arrowKeys(section, strip, go) {
  if (!section) return;
  let over = false;
  section.addEventListener("pointerenter", () => { over = true; });
  section.addEventListener("pointerleave", () => { over = false; });
  document.addEventListener("keydown", (e) => {
    if (!over || e.altKey || e.ctrlKey || e.metaKey) return;
    if (strip && strip.contains(document.activeElement)) return;
    const t = document.activeElement && document.activeElement.tagName;
    if (t === "INPUT" || t === "TEXTAREA" || t === "SELECT") return;
    const d = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
    if (!d) return;
    e.preventDefault();
    go(d);
  });
}

/* ---------- Analytics (PostHog) and email signup ---------- */
// Paste the Project Boki PostHog project's public token here to switch on analytics and the email signup.
// It's a separate PostHog organization from General Creative, so the data never mixes.
const POSTHOG_KEY = "phc_CQft5Eunm8Sp3ZSXZbDVFeB7P2kSDLzB8cZipnvEquM5";
const POSTHOG_HOST = "https://us.i.posthog.com";
if (POSTHOG_KEY) {
  !function(t,e){var o,n,p,r;e.__SV||(window.posthog=e,e._i=[],e.init=function(i,s,a){function g(t,e){var o=e.split(".");2==o.length&&(t=t[o[0]],e=o[1]),t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}}(p=t.createElement("script")).type="text/javascript",p.crossOrigin="anonymous",p.async=!0,p.src=s.api_host.replace(".i.posthog.com","-assets.i.posthog.com")+"/static/array.js",(r=t.getElementsByTagName("script")[0]).parentNode.insertBefore(p,r);var u=e;for(void 0!==a?u=e[a]=[]:a="posthog",u.people=u.people||[],u.toString=function(t){var e="posthog";return"posthog"!==a&&(e+="."+a),t||(e+=" (stub)"),e},u.people.toString=function(){return u.toString(1)+".people (stub)"},o="capture identify alias people.set people.set_once set_config register register_once unregister opt_out_capturing has_opted_out_capturing opt_in_capturing reset isFeatureEnabled onFeatureFlags getFeatureFlag getFeatureFlagPayload reloadFeatureFlags group updateEarlyAccessFeatureEnrollment getEarlyAccessFeatures getActiveMatchingSurveys getSurveys onSessionId".split(" "),n=0;n<o.length;n++)g(u,o[n]);e._i.push([i,s,a])},e.__SV=1)}(document,window.posthog||[]);
  // Cookieless until the visitor accepts; then PostHog may remember them so return visits link up.
  const foot = document.querySelector(".foot");
  if (foot) { const fh = () => document.documentElement.style.setProperty("--fh", foot.offsetHeight + "px"); fh(); new ResizeObserver(fh).observe(foot, { box: "border-box" }); }
  let consent = null;
  try { consent = localStorage.getItem("boki-consent"); } catch (e) {}
  posthog.init(POSTHOG_KEY, { api_host: POSTHOG_HOST, persistence: consent === "yes" ? "localStorage+cookie" : "memory", person_profiles: "identified_only" });
  const bar = document.getElementById("consent");
  const choose = (v) => {
    try { localStorage.setItem("boki-consent", v); } catch (e) {}
    if (v === "yes") posthog.set_config({ persistence: "localStorage+cookie" });
    else { posthog.set_config({ persistence: "memory" }); try { posthog.persistence && posthog.persistence.clear(); } catch (e) {} }
    bar.classList.remove("show"); setTimeout(() => { bar.hidden = true; }, 300);
    document.documentElement.style.removeProperty("--ch");
  };
  // While the cookie bar is up, the footer gets room beneath it so nothing at the bottom is covered
  const open = () => { bar.hidden = false; requestAnimationFrame(() => { bar.classList.add("show"); document.documentElement.style.setProperty("--ch", bar.offsetHeight + 36 + "px"); }); };
  if (bar) {
    bar.querySelector("[data-yes]").addEventListener("click", () => choose("yes"));
    bar.querySelector("[data-no]").addEventListener("click", () => choose("no"));
    if (!consent) setTimeout(open, 1200);
    document.querySelectorAll(".js-cookies").forEach((a) => { a.hidden = false; a.addEventListener("click", (e) => { e.preventDefault(); open(); }); });
  }
  document.addEventListener("click", (e) => {
    const a = e.target.closest("a[href]"); if (!a) return;
    const h = a.href;
    const where = a.closest("section, header, footer")?.id || a.closest("section, header, footer")?.className || "page";
    if (h.includes("discord")) posthog.capture("click_discord", { where });
    else if (h.includes("itch.io")) posthog.capture("click_play", { where });
    else if (h.endsWith("#join")) posthog.capture("click_beta", { where });
  });
  // Every email form (hero, nav pop-out, end of page) signs up the same way; once you're on the list, they all say so.
  const forms = [...document.querySelectorAll("form.signup")];
  let signed = false; try { signed = localStorage.getItem("boki-signed") === "1"; } catch (e) {}
  const done = () => forms.forEach((f) => { f.querySelector(".su-row").hidden = true; const t = f.querySelector(".nav-su-t"); if (t) t.hidden = true; f.querySelector(".su-done").hidden = false; });
  forms.forEach((form) => {
    if (form.id !== "nav-su") form.hidden = false;
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const email = form.email.value.trim(); if (!email) return;
      posthog.identify(email, { email });
      posthog.capture("email_signup", { email, where: form.id });
      try { localStorage.setItem("boki-signed", "1"); } catch (e) {}
      done();
    });
  });
  if (signed) done();
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
      set(ns.hidden);
      posthog.capture("click_beta", { where: "nav" });
    });
    document.addEventListener("pointerdown", (e) => { if (!ns.hidden && !ns.contains(e.target) && e.target !== nj) set(false); });
    document.addEventListener("keydown", (e) => { if (e.key === "Escape" && !ns.hidden) { set(false); nj.focus(); } });
    ns.addEventListener("focusout", (e) => { if (e.relatedTarget && !ns.contains(e.relatedTarget) && e.relatedTarget !== nj) set(false); });
    addEventListener("scroll", () => { if (!ns.hidden && document.activeElement !== ns.querySelector("input")) set(false); }, { passive: true });
  }
}

/* ---------- Full-screen art viewer ---------- */
// Click any art (Hunter splash, How it works cards, press kit art) to see it full size.
(function () {
  const full = (el) => {
    if (el.matches("a[href$='.webp'], a[href$='.jpg'], a[href$='.png']")) return el.getAttribute("href");
    const img = el.matches("img") ? el : el.querySelector("img");
    if (!img) return null;
    return img.dataset.full || (img.currentSrc || img.src).replace(/-(960|1280|1600)\.webp/, (m, w) => w === "1280" ? "-2560.webp" : "-2400.webp");
  };
  let lb, pic, last;
  const build = () => {
    lb = document.createElement("div");
    lb.className = "lb"; lb.hidden = true;
    lb.setAttribute("role", "dialog"); lb.setAttribute("aria-modal", "true"); lb.setAttribute("aria-label", "Full-size art");
    lb.innerHTML = '<img alt=""><button class="lb-x" type="button" aria-label="Close">&times;</button>';
    pic = lb.querySelector("img");
    document.body.appendChild(lb);
    lb.addEventListener("click", close);
  };
  const open = (src, alt) => {
    if (!lb) build();
    last = document.activeElement;
    pic.src = src; pic.alt = alt || "";
    lb.hidden = false; document.documentElement.classList.add("lb-open");
    requestAnimationFrame(() => lb.classList.add("show"));
    lb.querySelector(".lb-x").focus({ preventScroll: true });
  };
  function close() {
    lb.classList.remove("show"); document.documentElement.classList.remove("lb-open");
    setTimeout(() => { lb.hidden = true; pic.removeAttribute("src"); }, 220);
    if (last) last.focus({ preventScroll: true });
  }
  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && lb && !lb.hidden) close(); });
  const targets = ".step-media, .pk-grid a, .pk-key, .hm-art"; // the Hunter splash opens from its expand button (the details view), then its art
  document.addEventListener("click", (e) => {
    const t = e.target.closest(targets);
    if (!t || e.target.closest("button, .fig")) return;
    if (t._swiped && Date.now() - t._swiped < 500) return;
    const src = full(t); if (!src) return;
    e.preventDefault();
    const img = t.matches("img") ? t : t.querySelector("img");
    open(src, img && img.alt);
  });
})();

/* ---------- Hunter details: the expand button opens the splash with the Hunter's kit beside it (from the game's
   archetype files, assets/hunters.json, tools/hunters/build.py). Arrows and keys browse; tap the art for full size. ---------- */
(function () {
  const ex = document.getElementById("h-expand"), stage = ex && ex.closest(".stage");
  if (!ex) return;
  let box, at = 0, back = null, KIT = null;
  const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
  const load = () => KIT || (KIT = fetch("assets/hunters.json?v=2").then((r) => r.json()).catch(() => ({})));
  const keyOf = (k) => k.key || "P";
  const build = () => {
    box = document.createElement("div");
    box.className = "hm"; box.hidden = true;
    box.setAttribute("role", "dialog"); box.setAttribute("aria-modal", "true"); box.setAttribute("aria-label", "Hunter details");
    box.innerHTML = `<div class="hm-card"><div class="hm-art" title="View full art"><img alt="">
      <button class="bk-arrow prev" type="button" aria-label="Previous Hunter"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg></button>
      <button class="bk-arrow next" type="button" aria-label="Next Hunter"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 5l7 7-7 7" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg></button></div>
      <div class="hm-txt"><div class="hm-role"></div><h3></h3><div class="hm-title"></div><p class="hm-style"></p><ul class="hm-kit"></ul></div>
      <button class="lb-x" type="button" aria-label="Close">&times;</button></div>`;
    document.body.appendChild(box);
    box.addEventListener("click", (e) => { if (e.target === box) close(); });
    box.querySelector(".lb-x").addEventListener("click", close);
    box.querySelector(".prev").addEventListener("click", () => fill(at - 1));
    box.querySelector(".next").addEventListener("click", () => fill(at + 1));
    document.addEventListener("keydown", (e) => {
      if (box.hidden || document.querySelector(".lb:not([hidden])")) return; // the full-size art closes first
      if (e.key === "Escape") close();
      else if (e.key === "ArrowRight") fill(at + 1);
      else if (e.key === "ArrowLeft") fill(at - 1);
    });
  };
  const fill = (i) => {
    at = (i + HUNTERS.length) % HUNTERS.length;
    const [id, name, title, , role] = HUNTERS[at], img = box.querySelector(".hm-art img");
    img.classList.remove("on");
    img.onload = () => img.classList.add("on");
    img.srcset = `assets/img/hunters/${id}-960.webp?v=${ART_V} 960w, assets/img/hunters/${id}-1600.webp?v=${ART_V} 1600w`;
    img.sizes = "(max-width: 1000px) 100vw, 760px";
    img.src = `assets/img/hunters/${id}-1600.webp?v=${ART_V}`; img.alt = `${name}, ${title}`;
    if (img.complete) img.classList.add("on");
    box.querySelector("h3").textContent = name;
    box.querySelector(".hm-title").textContent = title;
    box.querySelector(".hm-role").textContent = role;
    box.querySelector(".hm-style").textContent = "";
    box.querySelector(".hm-kit").innerHTML = "";
    box.querySelector(".hm-card").scrollTop = 0;
    load().then((all) => {
      const h = all[id]; if (!h || HUNTERS[at][0] !== id) return;
      box.style.setProperty("--g", h.color || "#9a7dff");
      box.querySelector(".hm-style").textContent = h.style;
      box.querySelector(".hm-kit").innerHTML = h.kit.map((k) =>
        `<li class="k-${k.kind.toLowerCase()}"><kbd>${esc(keyOf(k))}</kbd><div><b>${esc(k.name)}<small>${esc(k.kind)}</small></b><span>${esc(k.line)}</span></div></li>`).join("");
    });
  };
  const open = () => {
    if (!box) build();
    back = document.activeElement;
    const cur = (stage && stage.dataset.h) || HUNTERS[0][0];
    fill(Math.max(0, HUNTERS.findIndex((h) => h[0] === cur)));
    box.hidden = false; document.documentElement.classList.add("hm-open");
    requestAnimationFrame(() => box.classList.add("show"));
    box.querySelector(".lb-x").focus({ preventScroll: true });
    if (window.posthog && posthog.capture) posthog.capture("hunter_details", { hunter: HUNTERS[at][0] });
  };
  function close() {
    box.classList.remove("show"); document.documentElement.classList.remove("hm-open");
    setTimeout(() => { box.hidden = true; }, 220);
    if (back) back.focus({ preventScroll: true });
  }
  ex.setAttribute("aria-label", "Hunter details and full art");
  ex.addEventListener("click", (e) => { e.stopPropagation(); open(); });
  ex.addEventListener("pointerenter", load, { once: true });
})();

/* ---------- How it works: cards grow in and stack as you scroll ---------- */
(function () {
  const cards = [...document.querySelectorAll(".how .step-card")];
  if (!cards.length || calm) return;
  cards.forEach((c) => { const s = document.createElement("i"); s.className = "step-shade"; c.appendChild(s); });
  const clamp = (v) => Math.min(1, Math.max(0, v));
  let ticking = false, sticks = [];
  const measure = () => { sticks = cards.map((c) => parseFloat(getComputedStyle(c.parentElement).top) || 0); };
  measure();
  const frame = () => {
    ticking = false;
    const vh = innerHeight;
    const first = cards[0].parentElement.getBoundingClientRect(), lastR = cards[cards.length - 1].parentElement.getBoundingClientRect();
    if (first.top > vh * 1.2 || lastR.bottom < -vh) return; // the whole stack is off screen
    const prog = cards.map((c, i) => {
      const top = c.parentElement.getBoundingClientRect().top;
      const stick = sticks[i];
      return clamp((vh - top) / Math.max(1, vh - stick)); // 0 = just below the screen, 1 = pinned
    });
    cards.forEach((c, i) => {
      const grow = 0.86 + 0.14 * prog[i];                 // arrives small, settles full size
      const under = i + 1 < cards.length ? prog[i + 1] : 0; // how far the next card has covered it
      const sink = 1 - 0.07 * under;
      c.style.transform = `scale(${(grow * sink).toFixed(4)})`;
      c.querySelector(".step-shade").style.opacity = (0.55 * under).toFixed(3);
    });
  };
  const req = () => { if (!ticking) { ticking = true; requestAnimationFrame(frame); } };
  addEventListener("scroll", req, { passive: true });
  addEventListener("resize", () => { measure(); req(); });
  frame();
})();

/* ---------- "broken into pieces.": the kingdom cracks like land. Scroll down and a hairline crack glows ember-red through
   each letter, the letter splits into two shards along it, and the shards drop and tumble apart shedding chips, the red
   rising in them as they fall. Scroll up and it all runs backwards: chips back, shards rejoin, the crack seals and cools. ---------- */
(function () {
  const h = document.querySelector(".h-crumble");
  if (!h) return;
  const head = h.closest(".head") || h;
  const clamp = (v) => Math.min(1, Math.max(0, v));
  const ease = (v) => v * v * (3 - 2 * v);
  let seed = 7;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647); // the same cracks on every visit
  const pct = (x, y) => `${x.toFixed(1)}% ${y.toFixed(1)}%`;
  const ls = [...h.querySelectorAll(".crumble i[data-t]")].map((el) => {
    const ch = el.textContent;
    // a jagged crack from the top of the letter to the bottom
    const pts = [];
    let x = 42 + rnd() * 16;
    for (let i = 0; i <= 5; i++) { pts.push([x, -30 + i * 32]); x = Math.min(68, Math.max(32, x + (rnd() - 0.5) * 26)); }
    const left = `polygon(-40% -30%, ${pts.map(([x, y]) => pct(x + 1.2, y)).join(", ")}, -40% 130%)`; // overlaps the right shard a hair: no seam while whole
    const right = `polygon(140% -30%, ${pts.map(([x, y]) => pct(x, y)).join(", ")}, 140% 130%)`;
    const w = 3.2; // the seam: a thin band along the crack, where the glow shows
    const seam = `polygon(${pts.map(([x, y]) => pct(x - w, y)).join(", ")}, ${pts.slice().reverse().map(([x, y]) => pct(x + w, y)).join(", ")})`;
    el.textContent = "";
    el.classList.add("L");
    const mk = (cls, txt, clip) => { const b = document.createElement("b"); b.className = cls; if (txt) b.textContent = txt; if (clip) b.style.clipPath = b.style.webkitClipPath = clip; el.appendChild(b); return b; };
    mk("base", ch);
    const glow = mk("seam", ch, seam);
    const a = mk("sh", ch, left), z = mk("sh", ch, right);
    a.style.transformOrigin = `${pts[5][0] - 18}% 90%`; z.style.transformOrigin = `${pts[5][0] + 18}% 90%`;
    const chips = [0.3, 0.52, 0.74].map((fy, i) => {
      const c = mk("chip"); const p = pts[Math.min(5, Math.round(fy * 5))];
      c.style.left = `${p[0]}%`; c.style.top = `${fy * 100}%`;
      return { el: c, dx: (i % 2 ? 1 : -1) * (0.05 + rnd() * 0.08), spin: (rnd() - 0.5) * 540, fall: 0.6 + rnd() * 0.5 };
    });
    return { el, glow, a, z, chips, t: +el.dataset.t, x: +el.dataset.x, y: +el.dataset.y, r: +el.dataset.rot, tw: 4 + rnd() * 6 };
  });
  const paint = (p, still) => ls.forEach((l) => {
    const k = still ? 0.2 : clamp((p - (1 - l.t) * 0.5) / 0.5);  // the end of the word goes first
    const crack = ease(clamp(k / 0.2));                          // the crack opens and glows
    const f = clamp((k - 0.16) / 0.84), fe = ease(f);            // then it falls, faster and faster
    const big = Math.min(1, 0.6 + l.y / 0.35);                   // every letter falls; the end of the word goes hardest
    // like land along a fault: the halves shear (one side slips lower) and sink, the glowing crack between them.
    // Every letter stays in its own column, so the word still reads.
    const gap = 0.01 * crack + 0.012 * fe * big, drop = l.y * f * f * 0.85, drift = 0.24 * l.t * fe, tilt = l.r * 0.1 * fe; // the word spreads as it breaks
    const slip = (0.012 * crack + 0.07 * fe * big) * (l.tw > 7 ? 1 : -1);   // which side slips is the crack's own
    l.a.style.transform = `translate(${(drift - gap).toFixed(3)}em, ${(drop + Math.max(0, -slip)).toFixed(3)}em) rotate(${(tilt - (0.6 + l.tw * 0.12) * fe * big - crack).toFixed(2)}deg)`;
    l.z.style.transform = `translate(${(drift + gap).toFixed(3)}em, ${(drop * 1.06 + Math.max(0, slip)).toFixed(3)}em) rotate(${(tilt + (0.6 + l.tw * 0.15) * fe * big + crack).toFixed(2)}deg)`;
    l.glow.style.opacity = (crack * (0.45 + 0.55 * big) * (1 - 0.5 * fe)).toFixed(3);
    l.glow.style.transform = `translate(${drift.toFixed(3)}em, ${(drop * 1.04).toFixed(3)}em) rotate(${tilt.toFixed(2)}deg)`;
    l.el.style.setProperty("--f", (Math.max(crack * 0.15, fe) * (0.4 + 0.6 * Math.pow(l.t, 0.7))).toFixed(3)); // red rises in the falling shards
    l.chips.forEach((c) => {
      const cf = still ? 0 : clamp((k - 0.12) / 0.7);
      c.el.style.opacity = (cf > 0 ? Math.min(1, cf * 6) * (1 - cf * cf) * big : 0).toFixed(3);
      c.el.style.transform = `translate(${(c.dx * cf + drift).toFixed(3)}em, ${((l.y + 0.25) * c.fall * cf * cf * 1.6).toFixed(3)}em) rotate(${(c.spin * cf).toFixed(1)}deg)`;
    });
  });
  if (calm) { paint(0, true); return; } // reduced motion: cracked and glowing, nothing moves
  // Driven by the Hunters scene above (a smoothed, speed-limited copy of the scroll): scroll on and it breaks, scroll back and it mends.
  const inout = (k) => (k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2);
  let lastC = -1;
  window.bokiCrumble = { set: (c) => { if (c !== lastC) { lastC = c; paint(inout(c)); } } };
  paint(0);
  if (window.bokiSceneTick) window.bokiSceneTick();
})();

/* ---------- Press kit: the Boki already revealed on the homepage (assets/boki.json); the rest stay a mystery ---------- */
(function () {
  const grid = document.getElementById("pk-boki");
  if (!grid) return;
  fetch("assets/boki.json").then((r) => r.json()).then((data) => {
    const list = (data.revealed || []).slice().sort((a, b) => a.name.localeCompare(b.name));
    if (!list.length) return;
    list.forEach((b) => {
      const a = document.createElement("a"), src = (w) => `assets/img/boki-front/${b.id}-${w}.webp?v=${b.v}`;
      a.className = "pk-boki"; a.href = src(960); a.target = "_blank";
      a.innerHTML = `<img src="${src(480)}" alt="" loading="lazy"><span class="pk-cap"></span>`;
      a.querySelector("img").alt = b.name + " art"; a.querySelector(".pk-cap").textContent = b.name;
      grid.append(a);
    });
    grid.hidden = false; document.getElementById("pk-soon").hidden = true;
  }).catch(() => {});
})();

/* ---------- Bubblisk in the FAQ: he's alive. The painting is warped on a fine mesh (WebGL): his head leans after the
   pointer, his body breathes and stretches after it, his tail sways, and he gets excited when you come close. Tap his
   bubble and it pops into droplets; a moment later he blows a new one. Without WebGL (or with reduced motion) he's the
   still picture and the pop still works. ---------- */
(function () {
  const wrap = document.getElementById("bub"); if (!wrap) return;
  const btn = wrap.querySelector(".bub"), burst = wrap.querySelector(".bub-burst");
  const BC = [0.176, 0.566], BR = 0.129, MOUTH = [0.27, 0.52], HEAD = [0.33, 0.42];
  let bub = { s: 1, a: 1, o: BC }; // bubble scale, alpha, scale origin (texture space)
  let anim = null; // { t0, dur, from, to, origin, ease }
  const tween = (to, dur, origin, ease) => { anim = { t0: performance.now(), dur, from: { s: bub.s, a: bub.a }, to, origin, ease }; bub.o = origin; };
  let busy = false, gl = null;
  btn.addEventListener("click", () => {
    if (busy) return; busy = true;
    const r = wrap.offsetWidth * BR;
    let html = `<span class="ring" style="width:${(r * 1.6).toFixed(0)}px;height:${(r * 1.6).toFixed(0)}px;margin:${(-r * .8).toFixed(0)}px 0 0 ${(-r * .8).toFixed(0)}px"></span>`;
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2 + Math.random() * 0.4, d = r * (1.1 + Math.random() * 0.9), s = Math.max(4, r * (0.12 + Math.random() * 0.14));
      html += `<i style="--s:${s.toFixed(1)}px;--dx:${(Math.cos(a) * d).toFixed(1)}px;--dy:${(Math.sin(a) * d + r * 0.4).toFixed(1)}px;animation-delay:${(Math.random() * 60).toFixed(0)}ms"></i>`;
    }
    burst.innerHTML = html; setTimeout(() => { burst.innerHTML = ""; }, 900);
    if (gl) { // swell, then burst
      tween({ s: 1.14, a: 1 }, 110, BC, (k) => k);
      setTimeout(() => tween({ s: 1.4, a: 0 }, 150, BC, (k) => k), 110);
      setTimeout(() => { bub = { s: 0.05, a: 0.6, o: MOUTH }; tween({ s: 1, a: 1 }, 1000, MOUTH, (k) => 1 + 2.4 * Math.pow(k - 1, 3) + 1.4 * Math.pow(k - 1, 2)); }, 1500);
      setTimeout(() => { busy = false; }, 2600);
    } else {
      wrap.classList.remove("grow"); wrap.classList.add("pop");
      setTimeout(() => { wrap.classList.remove("pop"); wrap.classList.add("grow"); }, 1500);
      setTimeout(() => { wrap.classList.remove("grow"); busy = false; }, 2600);
    }
  });
  if (calm || LITE.on()) return; // reduced motion, or a computer that can't keep up: the still picture (the pop still works)

  // ---- the living version: every pixel is pulled through a warp (WebGL), so the painting itself moves
  const cv = document.createElement("canvas"); cv.className = "bub-gl";
  document.addEventListener("boki-lite", () => { // lite switched on mid-visit: back to the still picture
    ready = false; gl = null; cv.remove(); wrap.classList.remove("gl"); wrap.style.transform = ""; const hd = wrap.querySelector(".bub-grab"); if (hd) hd.remove();
    btn.style.translate = ""; burst.style.translate = "";
  });
  gl = cv.getContext("webgl", { premultipliedAlpha: true, alpha: true, antialias: false });
  if (!gl) return;
  const sh = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); return s; };
  const prog = (vs, fs) => { const p = gl.createProgram(); gl.attachShader(p, sh(gl.VERTEX_SHADER, vs)); gl.attachShader(p, sh(gl.FRAGMENT_SHADER, fs)); gl.linkProgram(p); return gl.getProgramParameter(p, gl.LINK_STATUS) ? p : null; };
  const E1 = [0.4365, 0.372, 0.0615, 0.0635], E2 = [0.228, 0.393, 0.021, 0.057]; // the big eye and the side eye (center, radii)
  // where each part of him moves to: head after the pointer (and turning), body breathing and hopping, tail swaying
  const MOVE = `
    uniform vec2 uOff; uniform float uT, uBreath, uLean, uTurn, uHop, uSquash, uSwim, uPh;
    vec2 move(vec2 p) {
      vec2 h = p - vec2(${HEAD[0]}, ${HEAD[1]});
      float wh = exp(-dot(h, h) / (2.0 * 0.19 * 0.19));
      vec2 d = uOff * wh;
      d.x += -uTurn * h.x * 0.45 * wh;                                         // the head narrows as it turns
      vec2 b = p - vec2(0.55, 0.48); float wb = exp(-dot(b, b) / (2.0 * 0.26 * 0.26));
      d.y += (p.y - 0.70) * uBreath * wb; d.x += (p.x - 0.55) * uBreath * 0.5 * wb;
      float wt = smoothstep(0.6, 0.86, p.y) * smoothstep(0.5, 0.78, p.x);
      d.x += sin(uPh + p.y * 6.0) * (0.016 + 0.03 * uSwim) * wt; d.y += cos(uPh * 0.8 + p.x * 5.0) * (0.008 + 0.016 * uSwim) * wt;
      float wsb = smoothstep(0.22, 0.4, p.x) * smoothstep(0.1, 0.35, p.y) * smoothstep(0.95, 0.8, p.y);   // swimming: a wave runs down his body
      d.y += sin(uPh * 1.4 - p.x * 9.0) * 0.016 * uSwim * wsb;
      d.x += uLean * (0.72 - p.y) * 0.4;
      d.y += (p.y - 0.70) * uSquash; d.x -= (p.x - 0.55) * uSquash * 0.6;     // squash and stretch
      d.y -= uHop;                                                               // and hop
      return d;
    }`;
  const quadV = `attribute vec2 a; varying vec2 v; void main() { v = a; gl_Position = vec4(a.x * 2.0 - 1.0, 1.0 - a.y * 2.0, 0.0, 1.0); }`;
  const baseP = prog(quadV, `
    #ifdef GL_FRAGMENT_PRECISION_HIGH
    precision highp float;
    #else
    precision mediump float;
    #endif
    varying vec2 v; uniform sampler2D tex; uniform vec2 uLook; uniform float uBlink, uWide;
    ${MOVE}
    vec2 eye(vec2 uv, vec4 e, float s) {                    // the iris slides toward the look, and widens when startled
      vec2 q = (uv - e.xy) / e.zw; float w = exp(-dot(q, q) / (2.0 * 0.5 * 0.5));
      uv -= uLook * e.zw * 0.42 * s * w;
      uv = e.xy + (uv - e.xy) * (1.0 - 0.2 * uWide * w);
      return uv;
    }
    vec4 lid(vec2 uv, vec4 e, vec2 skinAt, vec4 c) {         // the lids close: the upper one down, the lower one up a little
      vec2 q = (uv - e.xy) / e.zw; float r = dot(q, q);
      if (r > 0.98 || uBlink <= 0.0) return c;
      float shut = 0.32 + 0.22 * (1.0 - q.x * q.x);                 // where they meet: a curve just below the middle
      float up = mix(-1.05, shut, uBlink), lo = mix(1.05, shut, uBlink);
      float inUp = step(q.y, up), inLo = step(lo, q.y);
      if (inUp + inLo < 0.5) return c;
      vec4 skin = texture2D(tex, skinAt);
      float shade = inUp > 0.5 ? 1.02 - 0.16 * smoothstep(-1.0, up, q.y) : 0.9;   // rounded: lighter at the top, darker at the lash
      vec4 l = vec4(skin.rgb * shade, skin.a);
      float lash = inUp > 0.5 ? smoothstep(0.16, 0.0, up - q.y) : smoothstep(0.1, 0.0, q.y - lo) * 0.5;
      l = mix(l, vec4(0.27, 0.14, 0.35, 1.0) * skin.a, lash * 0.9);
      return mix(c, l, smoothstep(0.98, 0.84, r));
    }
    void main() {
      vec2 body = v - move(v);                                // where this pixel is on his body
      vec2 uv = eye(body, vec4(${E1.join(", ")}), 1.0);       // then the irises look around inside the eyes
      uv = eye(uv, vec4(${E2.join(", ")}), 0.6);
      vec4 c = texture2D(tex, uv);
      if (uv.x < 0.0 || uv.y < 0.0 || uv.x > 1.0 || uv.y > 1.0) c = vec4(0.0);
      c = lid(body, vec4(${E1.join(", ")}), vec2(${E1[0]}, ${(E1[1] - E1[3] * 1.35).toFixed(4)}), c);
      c = lid(body, vec4(${E2.join(", ")}), vec2(${(E2[0] + 0.03).toFixed(4)}, ${(E2[1] - E2[3] * 1.2).toFixed(4)}), c);
      gl_FragColor = c;
    }`);
  const bubP = prog(`attribute vec2 a; varying vec2 v; uniform mediump vec2 uC; uniform mediump float uR; uniform vec2 uO; uniform float uS; ${MOVE}
    void main() { vec2 c = uO + (uC - uO) * uS; vec2 m = move(vec2(${MOUTH[0]}, ${MOUTH[1]}));
      vec2 q = c + m + (a * 2.0 - 1.0) * uR * uS; v = uC + (a * 2.0 - 1.0) * uR;
      gl_Position = vec4(q.x * 2.0 - 1.0, 1.0 - q.y * 2.0, 0.0, 1.0); }`,
    `precision mediump float; varying vec2 v; uniform sampler2D tex; uniform mediump vec2 uC; uniform mediump float uR; uniform float uA;
     void main() { float d = length(v - uC) / uR; vec4 c = texture2D(tex, v); gl_FragColor = c * uA * (1.0 - smoothstep(0.96, 1.0, d)); }`);
  if (!baseP || !bubP) { gl = null; return; }
  const qb = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, qb); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([0, 0, 1, 0, 0, 1, 1, 1]), gl.STATIC_DRAW);
  const texOf = (img) => { const t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t); gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE); return t; };
  const load = (src) => new Promise((ok, no) => { const i = new Image(); i.onload = () => ok(i); i.onerror = no; i.src = src; });
  const baseImg = wrap.querySelector(".bub-base"), fullImg = btn.querySelector("img");
  let tBase, tFull, ready = false;
  const near = () => new Promise((ok) => new IntersectionObserver(([en], o) => { if (en.isIntersecting) { o.disconnect(); ok(); } }, { rootMargin: "800px 0px" }).observe(wrap));
  near().then(() => Promise.all([load(baseImg.currentSrc || baseImg.src), load(fullImg.currentSrc || fullImg.src)])).then(([b, f]) => {
    tBase = texOf(b); tFull = texOf(f); ready = true; wrap.insertBefore(cv, wrap.firstChild); wrap.classList.add("gl"); size(); loop();
  }).catch(() => { gl = null; });
  const size = () => { const w = wrap.offsetWidth, dpr = Math.min(2, devicePixelRatio || 1); cv.width = cv.height = Math.round(w * dpr); };
  addEventListener("resize", size);
  let px = null, py = null, lastMove = -1e9, finger = false, lastFlee = 0;
  const track = (e) => { if (e.pointerType === "touch") return; px = e.clientX; py = e.clientY; lastMove = performance.now(); };
  addEventListener("pointermove", track, { passive: true }); addEventListener("pointerdown", track, { passive: true });
  // phones: follow the finger itself, even while it scrolls the page, and forget it the moment it lifts
  const touch = (e) => {
    const p = e.touches[0]; if (!p || drag) return;
    if (e.type === "touchstart" && !btn.hidden) { // the mini-game: land right on the bubble and it pops before he can dodge
      const b = btn.getBoundingClientRect(), r = Math.max(b.width, b.height) / 2 + 10, cx = b.left + b.width / 2, cy = b.top + b.height / 2;
      if (Math.hypot(p.clientX - cx, p.clientY - cy) < r) { finger = false; px = py = null; btn.click(); return; }
    }
    px = p.clientX; py = p.clientY; lastMove = performance.now(); finger = true;
  };
  const lift = (e) => { if (!e.touches.length && !drag) { finger = false; px = py = null; } };
  addEventListener("touchstart", touch, { passive: true }); addEventListener("touchmove", touch, { passive: true });
  addEventListener("touchend", lift, { passive: true }); addEventListener("touchcancel", lift, { passive: true });
  // his little brain: where to look, when to blink, when to hop
  let ox = 0, oy = 0, lean = 0, turn = 0, lx = 0, ly = 0, ex = 0, vis = false, t = 0, last = 0;
  let blinkAt = 1.5, blinkK = -1, double = false, hopK = -1, nextHop = 0, wide = 0, glance = { x: 0, y: 0, until: 0 };
  // swimming: in the FAQ he leaves his spot and loops around the pointer, then swims home
  const fine = matchMedia("(hover: hover) and (pointer: fine)").matches, faqSec = document.getElementById("faq"), home = wrap.parentNode;
  let sx = 0, sy = 0, vx = 0, vy = 0, swim = 0, ph = 0, tilt = 0, fl = 1, flT = 1, flee = null, wT = Math.random() * 50, calmUntil = 0, dirHold = 0, lastDir = 0;
  btn.addEventListener("click", () => { wide = 1; hopK = 0; blinkK = -1; });
  // Catch him and you can drag him around and fling him. He trails your hand like he's underwater, keeps the throw,
  // bounces off the edges of the FAQ, wobbles upright and swims home.
  let drag = null, flungUntil = 0, spin = 0, spinV = 0, pvx = 0, pvy = 0;
  const grab = (x, y, id) => {
    drag = { id, x0: x, y0: y, sx0: sx, sy0: sy, x, y, t: performance.now() }; pvx = pvy = 0;
    flee = null; finger = false; px = x; py = y; lastMove = performance.now();
    wide = 1; blinkK = -1; wrap.classList.add("held"); loop();
  };
  const dragTo = (x, y) => {
    const now = performance.now(), dt = Math.max(1, now - drag.t) / 1000, a = 1 - Math.exp(-dt * 18);
    pvx += ((x - drag.x) / dt - pvx) * a; pvy += ((y - drag.y) / dt - pvy) * a; // the hand's speed, smoothed
    drag.x = x; drag.y = y; drag.t = now; px = x; py = y; lastMove = now;
  };
  const drop = () => {
    if (!drag) return;
    const fresh = performance.now() - drag.t < 80; // a hand that stopped before letting go doesn't throw
    const cap = 2600, kx = fresh ? Math.max(-cap, Math.min(cap, pvx)) : 0, ky = fresh ? Math.max(-cap, Math.min(cap, pvy)) : 0;
    vx = kx; vy = ky; spinV += kx * 0.25; flungUntil = performance.now() + 2200; calmUntil = flungUntil + 600;
    if (Math.hypot(kx, ky) > 600) hopK = 0;
    drag = null; wrap.classList.remove("held");
  };
  // an invisible round handle on his body (the rest of him lets clicks through to the FAQ). Mouse and finger alike.
  const handle = document.createElement("span"); handle.className = "bub-grab"; handle.setAttribute("aria-hidden", "true"); wrap.insertBefore(handle, btn);
  handle.addEventListener("pointerdown", (e) => {
    if (e.button !== 0 || !ready || drag) return;
    e.preventDefault(); try { handle.setPointerCapture(e.pointerId); } catch (er) {}
    grab(e.clientX, e.clientY, e.pointerId);
  });
  handle.addEventListener("pointermove", (e) => { if (drag && e.pointerId === drag.id) dragTo(e.clientX, e.clientY); });
  const up = (e) => { if (drag && e.pointerId === drag.id) { drop(); if (e.pointerType === "touch") px = py = null; } };
  handle.addEventListener("pointerup", up); handle.addEventListener("pointercancel", up); handle.addEventListener("lostpointercapture", up);
  new IntersectionObserver(([en]) => { vis = en.isIntersecting; if (vis && ready) loop(); }, { rootMargin: "100px" }).observe(wrap);
  const U = {}; const loc = (p, n) => (U[n + p.__id] ||= gl.getUniformLocation(p, n)); baseP.__id = "b"; bubP.__id = "u";
  let raf = 0;
  function loop() { if (!raf) raf = requestAnimationFrame(frame); }
  function frame(now) {
    raf = 0; if (!vis || !ready) return;
    const dt = last ? Math.min(0.05, (now - last) / 1000) : 1 / 60; last = now; t += dt;
    const r = wrap.getBoundingClientRect(), hx = r.left + r.width * HEAD[0], hy = r.top + r.height * HEAD[1];
    let tx, ty, near = 0, dirx, diry;
    if (px !== null && now - lastMove < 5000) {
      const dx = px - hx, dy = py - hy, d = Math.hypot(dx, dy) || 1, k = Math.min(1, d / 380);
      dirx = dx / d * k; diry = dy / d * k; near = Math.max(0, 1 - d / 300);
    } else { // idle: glances around now and then
      if (t > glance.until) glance = { x: Math.random() * 2 - 1, y: Math.random() * 1.4 - 0.7, until: t + 1.2 + Math.random() * 2 };
      dirx = glance.x * 0.7; diry = glance.y * 0.6;
    }
    // He floats gently in a small area around his spot. Bring the cursor close and he turns and darts to the far
    // side of that area, then settles and floats again. Kept small and slow so he never twitches.
    const hr = home.getBoundingClientRect(), AX = Math.min(80, hr.width * 0.3), AY = Math.min(46, hr.height * 0.17);
    wT += dt;
    let gx = (Math.sin(wT * 0.21) * 0.8 + Math.sin(wT * 0.47 + 1.7) * 0.2) * AX, gy = (Math.cos(wT * 0.29) * 0.75 + Math.sin(wT * 0.61) * 0.25) * AY;
    if (drag || now < flungUntil) { /* held or just thrown: no dodging */ }
    else if (finger && px !== null) { // phones: a wider sense of the finger, a bigger escape, and he keeps clear while it stays
      const vw = innerWidth, R = Math.max(95, hr.width * 0.85);
      const bx = hr.left + hr.width / 2 + sx, by = hr.top + hr.height / 2 + sy;
      const hx0 = hr.left + hr.width / 2, hy0 = hr.top + hr.height / 2;
      if (Math.hypot(bx - px, by - py) < R && now - lastFlee > 300) {
        // the open spot farthest from the finger that keeps him on screen
        const minX = Math.max(-Math.min(150, hr.left - 120), 10 - hr.left), maxX = vw - 10 - hr.right, minY = -46, maxY = 46;
        let best = null, bd = -1;
        for (const cx of [minX, (minX + maxX) / 2, maxX, minX * 0.5]) for (const cy of [minY, 0, maxY]) {
          const d = Math.hypot(hx0 + cx - px, hy0 + cy - py); if (d > bd) { bd = d; best = { x: cx, y: cy }; }
        }
        flee = { x: best.x, y: best.y, until: now + 1300 }; lastFlee = now;
        flT = best.x > sx ? -1 : 1; // face where he's going (his art faces left)
      } else if (flee && Math.hypot(hx0 + flee.x - px, hy0 + flee.y - py) > R) flee.until = Math.max(flee.until, now + 250); // finger still around: stay away
    } else if (px !== null && now - lastMove < 2000 && now > calmUntil && !flee) {
      const bx = hr.left + hr.width / 2 + sx, by = hr.top + hr.height / 2 + sy;
      const ddx = bx - px, ddy = by - py, dd = Math.hypot(ddx, ddy) || 1;
      if (dd < hr.width * 0.55) { // too close: dart to the far side of his area, away from the cursor
        const side = px < bx ? 1 : -1;
        flee = { x: side * AX * 1.35, y: Math.max(-AY, Math.min(AY, sy + (ddy > 0 ? 1 : -1) * AY * 0.8)), until: now + 1300 };
        flT = side > 0 ? -1 : 1; // turn to face where he's going (his art faces left)
      }
    }
    if (flee) { if (now > flee.until) { flee = null; calmUntil = now + 900; } else { gx = flee.x; gy = flee.y; } }
    if (drag) { // he trails the hand, a little behind, like he's underwater
      const txx = drag.sx0 + drag.x - drag.x0, tyy = drag.sy0 + drag.y - drag.y0;
      vx += ((txx - sx) * 70 - vx * 12) * dt; vy += ((tyy - sy) * 70 - vy * 12) * dt;
    } else {
      const thrown = now < flungUntil, k = flee ? 22 : thrown ? 1.6 : 3, c = flee ? 9 : thrown ? 1.1 : 3.4; // thrown: he carries the throw, then drifts home
      vx += ((gx - sx) * k - vx * c) * dt; vy += ((gy - sy) * k - vy * c) * dt;
    }
    sx += vx * dt; sy += vy * dt;
    if (!drag) { // bounce off the edges of the FAQ (it clips anything outside) and the screen
      const fr = faqSec.getBoundingClientRect(), cx0 = hr.left + hr.width / 2, cy0 = hr.top + hr.height / 2, mx = hr.width * 0.42, my = hr.height * 0.42;
      const L = Math.max(fr.left, 0) + mx - cx0, R = Math.min(fr.right, innerWidth) - mx - cx0, T = Math.max(fr.top, 0) + my - cy0, B = Math.min(fr.bottom, innerHeight) - my - cy0;
      if (L < R) { if (sx < L) { sx = L; vx = Math.abs(vx) * 0.55; spinV -= vy * 0.1; } else if (sx > R) { sx = R; vx = -Math.abs(vx) * 0.55; spinV += vy * 0.1; } }
      if (T < B) { if (sy < T) { sy = T; vy = Math.abs(vy) * 0.55; } else if (sy > B) { sy = B; vy = -Math.abs(vy) * 0.55; } }
    }
    // a wobble that settles him upright again
    spinV += (-spin * 14 - spinV * 2.6) * dt; spin += spinV * dt;
    const sp = Math.hypot(vx, vy);
    swim += (Math.min(1, 0.2 + sp / 300) - swim) * (1 - Math.exp(-dt * 4));
    ph += dt * (1.6 + swim * 5);
    if (drag || now < flungUntil) { const d = vx > 40 ? -1 : vx < -40 ? 1 : 0; if (d) flT = d; } // face the way he's moving
    else if (!flee) { // while floating, only turn once he's clearly been heading one way for a moment
      const d = vx > 6 ? -1 : vx < -6 ? 1 : 0;
      if (d && d === lastDir) dirHold += dt; else dirHold = 0;
      lastDir = d; if (d && dirHold > 0.7) flT = d;
    }
    fl += (flT - fl) * (1 - Math.exp(-dt * (flee ? 12 : 5)));
    tilt += ((Math.max(-1, Math.min(1, vy / 300)) * 10 * -fl + (drag ? Math.max(-22, Math.min(22, pvx / 45)) : 0)) - tilt) * (1 - Math.exp(-dt * (drag ? 10 : 4)));
    if (drag) { wide = Math.max(wide, 0.6); pvx *= Math.exp(-dt * 6); pvy *= Math.exp(-dt * 6); } // eyes wide while held; the hand's speed fades if it stops
    const edge = 1 - Math.abs(fl);
    wrap.style.transform = `translate3d(${sx.toFixed(1)}px, ${sy.toFixed(1)}px, 0) rotate(${(tilt + Math.max(-60, Math.min(60, spin))).toFixed(2)}deg) scale(${(fl * (1 - 0.06 * edge) || 0.001).toFixed(3)}, ${(1 + 0.08 * edge).toFixed(3)})`;
    if (fl < 0) dirx = -dirx; // look the right way while mirrored
    tx = dirx * 0.045; ty = diry * 0.035;
    const f = 1 - Math.exp(-dt * 7), fe = 1 - Math.exp(-dt * 16);
    ox += (tx - ox) * f; oy += (ty - oy) * f; lean += (dirx * 0.07 - lean) * f; turn += (dirx * 0.5 - turn) * f;
    lx += (dirx - lx) * fe; ly += (diry - ly) * fe;                 // the eyes get there first
    ex += (near - ex) * (1 - Math.exp(-dt * 3));
    // blink every few seconds, sometimes twice
    if (blinkK < 0 && t > blinkAt) { blinkK = 0; double = Math.random() < 0.25; }
    let blink = 0;
    if (blinkK >= 0) { blinkK += dt / 0.17; blink = Math.sin(Math.min(1, blinkK) * Math.PI);
      if (blinkK >= 1) { if (double) { double = false; blinkK = -0.6; } else { blinkK = -1; blinkAt = t + 2 + Math.random() * 3.5; } } }
    else if (blinkK > -1 && blinkK < 0) { blinkK += dt / 0.17; if (blinkK >= 0) blinkK = 0; }
    // excited hops when you're close

    let hop = 0, squash = 0;
    if (hopK >= 0) { hopK += dt / 0.5; const k = hopK;
      if (k < 0.18) squash = 0.05 * Math.sin(k / 0.18 * Math.PI);                 // crouch
      else if (k < 0.82) { const a = (k - 0.18) / 0.64; hop = 0.05 * Math.sin(a * Math.PI); squash = -0.03 * Math.sin(a * Math.PI); } // up, stretched
      else if (k < 1) squash = 0.04 * Math.sin((k - 0.82) / 0.18 * Math.PI);        // land
      if (hopK >= 1) { hopK = -1; nextHop = t + 0.35 + Math.random() * 0.9; } }
    wide *= Math.exp(-dt * 2.2);
    const breath = Math.sin(t * (2.2 + ex * 1.5)) * (0.010 + ex * 0.004);
    if (anim) { const k = Math.min(1, (now - anim.t0) / anim.dur), e = anim.ease(k);
      bub.s = anim.from.s + (anim.to.s - anim.from.s) * e; bub.a = anim.from.a + (anim.to.a - anim.from.a) * Math.min(1, k); if (k >= 1) anim = null; }
    gl.viewport(0, 0, cv.width, cv.height); gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
    gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    const set = (p) => { gl.uniform2f(loc(p, "uOff"), ox, oy); gl.uniform1f(loc(p, "uT"), t); gl.uniform1f(loc(p, "uBreath"), breath); gl.uniform1f(loc(p, "uLean"), lean);
      gl.uniform1f(loc(p, "uTurn"), turn * 0.12); gl.uniform1f(loc(p, "uHop"), hop); gl.uniform1f(loc(p, "uSquash"), squash);
      gl.uniform1f(loc(p, "uSwim"), swim); gl.uniform1f(loc(p, "uPh"), ph); };
    gl.bindBuffer(gl.ARRAY_BUFFER, qb);
    gl.useProgram(baseP); set(baseP);
    gl.uniform2f(loc(baseP, "uLook"), lx, ly); gl.uniform1f(loc(baseP, "uBlink"), blink); gl.uniform1f(loc(baseP, "uWide"), wide);
    let al = gl.getAttribLocation(baseP, "a"); gl.enableVertexAttribArray(al); gl.vertexAttribPointer(al, 2, gl.FLOAT, false, 0, 0);
    gl.bindTexture(gl.TEXTURE_2D, tBase); gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    if (bub.a > 0.01) {
      gl.useProgram(bubP); set(bubP);
      gl.uniform2f(loc(bubP, "uC"), BC[0], BC[1]); gl.uniform2f(loc(bubP, "uO"), bub.o[0], bub.o[1]); gl.uniform1f(loc(bubP, "uS"), bub.s); gl.uniform1f(loc(bubP, "uR"), BR); gl.uniform1f(loc(bubP, "uA"), bub.a);
      al = gl.getAttribLocation(bubP, "a"); gl.enableVertexAttribArray(al); gl.vertexAttribPointer(al, 2, gl.FLOAT, false, 0, 0);
      gl.bindTexture(gl.TEXTURE_2D, tFull); gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    }
    // the tap target and the burst ride along with his mouth
    const h = [MOUTH[0] - HEAD[0], MOUTH[1] - HEAD[1]], wh = Math.exp(-(h[0] ** 2 + h[1] ** 2) / (2 * 0.19 * 0.19));
    const mx = ox * wh - turn * 0.12 * h[0] * 0.45 * wh + lean * (0.72 - MOUTH[1]) * 0.4, my = oy * wh - hop;
    btn.style.translate = `${(mx * 100).toFixed(2)}% ${(my * 100).toFixed(2)}%`; burst.style.translate = `${(mx * r.width).toFixed(1)}px ${(my * r.height).toFixed(1)}px`;
    raf = requestAnimationFrame(frame);
  }
})();

