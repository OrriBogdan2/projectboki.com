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

const media = document.getElementById("hero-media");
// The portrait wall only drifts while it can be seen.
if (media && "IntersectionObserver" in window) {
  new IntersectionObserver(([e]) => media.classList.toggle("paused", !e.isIntersecting)).observe(document.querySelector(".hero-wrap") || media);
}

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
    heroIn.style.opacity = String(Math.max(0, 1 - t * 1.6).toFixed(3));
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
  const play = () => {
    if (timer || !ready[0] || !seen || drag || back) return;
    if (calm) { seg = -1; f = 0; draw(); return; }
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
const MODEL_V = "2026-11-08e";
const POSE = {"vex": [[43, 19], 40], "kael": [[43, 13, 13], 40], "cinder": [[43, 13], 45], "pip": [[38, 14, 13], 45], "tarek": [[33, 17, 15], 45], "lisette": [[43, 15], 45], "grimble": [[13, 43], 38], "claire": [[46, 13], 45], "ryzz": [[43, 23, 21], 45], "breaker": [[30, 13, 17], 40], "sable": [[46, 26], 45], "motley": [[13, 17, 17], 40]}; // filled by tools/turntable/pack.py // bump when the turntables are re-rendered so browsers fetch the new ones
const HUNTERS = [
  ["vex", "Vex", "The Hired Gun", true, "Gunslinger"],
  ["breaker", "Albert", "The Barnacle Knight", true, "Tank"],
  ["claire", "Neve", "The Snowglide", true, "Controller"],
  ["kael", "Kael", "The Unbroken", true, "Bruiser"],
  ["cinder", "Cinder", "The Ashen Kiss", true, "Engage"],
  ["tarek", "Tenzo", "The Stone Seer", true, "Brawler"],
  ["ryzz", "Sparkle", "The Storm Chaser", true, "Skirmisher"],
  ["grimble", "Grimble", "The Scrap King", true, "Initiator"],
  ["pip", "Meeko", "The Dawnfox", true, "Support"],
  ["sable", "Sable", "The Silver Thief", true, "Duelist"],
  ["lisette", "Lace", "The Red Stitch", true, "Marksman"],
  ["motley", "Motley", "The Void Jester", true, "Controller"],
];

const pick = document.getElementById("h-pick");
if (pick) {
  const art = document.getElementById("h-art");
  const $ = (id) => document.getElementById(id);
  const src = (id, w) => `assets/img/hunters/${id}-${w}.webp`;
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
  const layoutPin = () => {
    if (!track) return;
    const on = wide.matches && !calm;
    sec.classList.toggle("pinned", on);
    if (!on) { track.style.height = ""; pinEl.style.top = ""; pin = null; return; }
    track.style.height = "";
    const vh = innerHeight, h = pinEl.offsetHeight, top = Math.max(80, Math.round((vh - h) / 2 + 34));
    const step = Math.max(220, Math.round(vh * 0.3));
    pinEl.style.top = top + "px";
    track.style.height = Math.round(h + step * (HUNTERS.length - 0.3)) + "px"; // the last Hunter gets its beat too, then it lets go
    pin = { start: docTop(track) - top, step };
  };
  const pinScroll = () => {
    if (!pin) return;
    const i = Math.min(HUNTERS.length - 1, Math.max(0, Math.floor((scrollY - pin.start) / pin.step)));
    if (i !== current) { fromScroll = true; show(i); fromScroll = false; }
  };
  let pinTick = false;
  addEventListener("scroll", () => { if (pin && !pinTick) { pinTick = true; requestAnimationFrame(() => { pinTick = false; pinScroll(); }); } }, { passive: true });
  addEventListener("resize", layoutPin);
  addEventListener("load", layoutPin);
  wide.addEventListener && wide.addEventListener("change", layoutPin);
  layoutPin();

  function show(i) {
    i = (i + HUNTERS.length) % HUNTERS.length;
    if (i === current) return;
    current = i;
    if (pin && !fromScroll && scrollY > pin.start - innerHeight * 0.6 && scrollY < pin.start + pin.step * HUNTERS.length)
      scrollTo({ top: pin.start + (i + 0.5) * pin.step, behavior: "instant" }); // the page follows the pick
    $("h-n").textContent = String(i + 1).padStart(2, "0");
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
const BOKI = [
  ["vespyx", "Vespyx", "Fox + Scorpion", "Small", "Starter egg", "#a6ff3a", "#4a2f5c", "A sly fox with a scorpion's curled tail. Its sting drips venom that keeps eating at foes after the hit.", [0.75, 0.5, 0.7, 0.5]],
  ["mycroll", "Mycroll", "Hedgehog + Toadstool", "Small", "Starter egg", "#3fe0c0", "#6b4a3c", "A hedgehog whose quills are glowing toadstools. It puffs spore clouds that root foes where they stand.", [0.55, 0.6, 0.4, 0.8]],
  ["prismander", "Prismander", "Axolotl + Crystal", "Small", "Starter egg", "#7ff3ff", "#f0a6d6", "An axolotl whose frills grew into living crystal. It bends light into shields and dazzling beams.", [0.45, 0.85, 0.2, 0.6]],
  ["gloamshell", "Gloamshell", "Garden snail + Smoked obsidian", "Small", "Wild in Gloomheart", "#8a6aff", "#3a3448", "A snail whose shell is smoked obsidian glass. It drinks the light around it and leaves a trail of dusk behind.", [0.3, 0.6, 0.35, 0.55]],
  ["rimeshrew", "Rimeshrew", "Shrew + Hoarfrost", "Small", "Wild in Frostreach", "#bff4ff", "#9fb6c8", "A tiny shrew with a frost-feathered coat that never melts. It has to eat every hour, so it never stops moving.", [0.9, 0.5, 0.65, 0.75]],
  ["selenfin", "Selenfin", "Hatchetfish + Moonstone", "Small", "Wild in Gloomheart", "#fff0a0", "#c8d0e0", "A silver hatchetfish that swims through the air, a moonstone glowing in its keel. Where it floats, wounds close.", [0.4, 0.8, 0.15, 0.5]],
  ["glintmole", "Glintmole", "Star-nosed mole + Quartz geode", "Small", "Wild in Greenreach", "#c9a8ff", "#5b4a5e", "A star-nosed mole whose back is a split geode full of quartz. It feels the ground shake long before you do.", [0.35, 0.75, 0.3, 0.7]],
  ["glomwort", "Glomwort", "Slime mold + Puffball", "Small", "Wild in Bloomwild", "#3fe0c0", "#e0c03a", "A yellow slime mold that creeps like a net and fruits little puffballs. Step on one and the spores hold you fast.", [0.5, 0.6, 0.25, 0.95]],
  ["mossgrade", "Mossgrade", "Tardigrade + Cushion moss", "Small", "Wild in Bloomwild", "#b8ff7a", "#7a9a5a", "A plump water bear wearing a cushion of moss. Dry it out and it curls into a pebble; one drop of water and it's back.", [0.5, 0.85, 0.1, 0.4]],
  ["kindlewren", "Kindlewren", "Wren + Ember coal", "Small", "Wild in Emberfall", "#ff8a2a", "#7a4a32", "A cocky little wren that carries a live coal in its cocked-up tail. It darts in, scorches, and is gone.", [0.85, 0.5, 0.7, 0.6]],
  ["kestrike", "Kestrike", "Kestrel + Copper lightning rod", "Small", "Wild in Stormcrest", "#ffe86a", "#b5653a", "A kestrel with a copper crest that draws lightning. It hangs still in the wind, then strikes like the bolt it caught.", [0.8, 0.6, 0.5, 0.45]],
  ["lodestick", "Lodestick", "Stick insect + Lodestone", "Small", "Wild in Gloomheart", "#b48cff", "#3c3a50", "A stick insect made of dark lodestone twigs. Things drift toward it, and it drifts toward nothing.", [0.45, 0.55, 0.2, 0.6]],
  ["marchleaf", "Marchleaf", "Leafcutter ant + Leaf", "Small", "Wild in Bloomwild", "#9aff6a", "#8a3a2a", "A leafcutter ant hauling a leaf ten times its size, with a column of tiny workers marching behind. It never stops working.", [0.75, 0.7, 0.5, 0.35]],
  ["nettlynx", "Nettlynx", "Lynx kitten + Stinging nettle", "Small", "Wild in Bloomwild", "#d0ff4a", "#8a9a4a", "A lynx kitten whose ear tufts and tail are stinging nettle. Pet it the wrong way and you'll know.", [0.8, 0.5, 0.75, 0.5]],
  ["thrumbird", "Thrumbird", "Hummingbird + Tuning fork", "Small", "Wild in Greenreach", "#7fe8ff", "#3aa88a", "A hummingbird whose forked tail rings like a tuning fork. Its hum steadies your aim and rattles your foes.", [0.55, 0.8, 0.3, 0.85]],
  ["echolop", "Echolop", "Hare + Bat", "Small", "Wild nests", "#7fe8ff", "#4a5aa8", "A long-eared hare with bat wings. It hears everything coming and fires ringing pulses of sound.", [0.65, 0.4, 0.6, 0.9]],
  ["lunowl", "Lunowl", "Owl + Luna moth", "Small", "Wild nests", "#fff0a0", "#9fe6b4", "A moonlit owl with soft moth wings. It flits on moondust and dazzles foes with silver light.", [0.35, 0.55, 0.5, 0.7]],
  ["gravadillo", "Gravadillo", "Armadillo + Rhino beetle", "Large", "Wild nests", "#b48cff", "#3c4058", "An armadillo with a rhino beetle's horn. It rolls up in heavy plates and bends gravity to slam foes down.", [0.9, 0.7, 0.3, 0.2]],
  ["hivara", "Hivara", "Honeybee + Praying mantis", "Small", "The Brood Mother's egg", "#ffe680", "#d9a42a", "A honeybee with a praying mantis's folded blades, wearing a crown of wax. A swarm of tiny bees follows it everywhere.", [0.7, 0.75, 0.55, 0.6]],
  ["zephyrak", "Zephyrak", "Moray eel + Swift", "Small", "Stormcoil's egg", "#9ff4ff", "#2f6f9a", "A little sky serpent: a moray eel's long body with a swift's swept wings, crackling with static.", [0.8, 0.45, 0.65, 0.85]],
  ["cairnback", "Cairnback", "Tortoise + Ibex", "Large", "The Stone Colossus's egg", "#ffd36a", "#6a6f7a", "A tortoise with an ibex's sweeping horns, carrying a little rune-carved cairn on its shell.", [0.85, 0.8, 0.25, 0.35]],
];
const TRAITS = ["Bravery", "Loyalty", "Temper", "Curiosity"];

const bkPick = document.getElementById("bk-pick");
if (bkPick) {
  const $ = (id) => document.getElementById(id);
  const stage = $("bk-stage"), img = $("bk-img");
  const pic = (id, w) => `assets/img/boki/${id}-${w}.webp`;
  let at = -1;
  $("bk-total").textContent = String(BOKI.length).padStart(2, "0");

  BOKI.forEach(([id, name], i) => {
    const b = document.createElement("button");
    b.type = "button";
    b.setAttribute("aria-label", name);
    b.style.setProperty("--g", BOKI[i][5]);
    b.innerHTML = `<img src="${pic(id, 240)}" alt="" loading="lazy" width="240" height="240"><span>${name}</span>`;
    b.addEventListener("click", () => show(i));
    bkPick.appendChild(b);
  });

  const traits = $("bk-traits");
  traits.innerHTML = TRAITS.map((t) => `<div><dt>${t}</dt><dd><i></i></dd></div>`).join("");
  const bars = traits.querySelectorAll("i");

  function fill(i) {
    const [id, name, mix, size, found, glow, body, flavor, p] = BOKI[i];
    stage.style.setProperty("--g", glow);
    stage.style.setProperty("--b", body);
    traits.style.setProperty("--g", glow);
    img.src = pic(id, 900);
    img.alt = `${name}, ${mix.toLowerCase().replace(" + ", " and ")}`;
    $("bk-name").textContent = name;
    $("bk-mix").textContent = mix;
    $("bk-flavor").textContent = flavor;
    $("bk-size").textContent = size;
    $("bk-found").textContent = found;
    $("bk-n").textContent = String(i + 1).padStart(2, "0");
    bars.forEach((bar, k) => { bar.style.transform = `scaleX(${p[k]})`; });
  }

  function show(i, dir = 1) {
    i = (i + BOKI.length) % BOKI.length;
    if (i === at) return;
    const first = at < 0;
    dir = first ? 0 : dir;
    at = i;
    bkPick.querySelectorAll("button").forEach((b, j) => b.setAttribute("aria-pressed", j === i ? "true" : "false"));
    const btn = bkPick.children[i];
    if (!first) bkPick.scrollTo({ left: btn.offsetLeft - (bkPick.clientWidth - btn.clientWidth) / 2, behavior: "smooth" });
    if (first) { fill(i); return; }
    stage.style.setProperty("--dir", dir);
    stage.classList.add("out");
    const next = new Image();
    next.src = pic(BOKI[i][0], 900);
    const swap = () => {
      if (at !== i) return;
      fill(i);
      stage.classList.remove("out");
      stage.classList.add("in");
      requestAnimationFrame(() => requestAnimationFrame(() => stage.classList.remove("in")));
    };
    setTimeout(() => (next.decode ? next.decode().then(swap, swap) : swap()), 180);
  }

  $("bk-prev").addEventListener("click", () => show(at - 1, -1));
  arrowKeys(document.getElementById("boki"), bkPick, (d) => show(at + d, d));
  $("bk-next").addEventListener("click", () => show(at + 1, 1));
  bkPick.addEventListener("keydown", (e) => {
    const d = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
    if (!d) return;
    e.preventDefault(); show(at + d, d); bkPick.children[at].focus({ preventScroll: true });
  });

  swipe(stage, (d) => show(at + d, d));
  nudge(bkPick);

  show(0);
}

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
  let consent = null;
  try { consent = localStorage.getItem("boki-consent"); } catch (e) {}
  posthog.init(POSTHOG_KEY, { api_host: POSTHOG_HOST, persistence: consent === "yes" ? "localStorage+cookie" : "memory", person_profiles: "identified_only" });
  const bar = document.getElementById("consent");
  const choose = (v) => {
    try { localStorage.setItem("boki-consent", v); } catch (e) {}
    if (v === "yes") posthog.set_config({ persistence: "localStorage+cookie" });
    else { posthog.set_config({ persistence: "memory" }); try { posthog.persistence && posthog.persistence.clear(); } catch (e) {} }
    bar.classList.remove("show"); setTimeout(() => { bar.hidden = true; }, 300);
  };
  const open = () => { bar.hidden = false; requestAnimationFrame(() => bar.classList.add("show")); };
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
  const form = document.getElementById("signup");
  if (form) {
    form.hidden = false;
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const email = form.email.value.trim(); if (!email) return;
      posthog.identify(email, { email });
      posthog.capture("email_signup", { email });
      form.querySelector(".su-row").hidden = true; form.querySelector("label").hidden = true;
      form.querySelector(".su-done").hidden = false;
    });
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
  const targets = ".shot, .step-media, .pk-grid a, .pk-key";
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

/* ---------- Guided, not controlled: when you stop scrolling close to a resting point (a section's heading, then its
   stage), the page eases the last bit into place. Far from one, it leaves you exactly where you stopped; any new
   scroll, touch or key cancels it. (CSS scroll-snap was tried: browsers pull far too hard.) ---------- */
(function () {
  if (calm) return;
  const phone = matchMedia("(max-width: 720px)");
  const els = () => [...document.querySelectorAll(phone.matches ? "#hunters .head, #boki .head, #faq .head"
    : document.querySelector("#hunters.pinned") ? "#hunters .head, #boki .head, #boki .bk, #faq .head"
    : "#hunters .head, #hunters .stage, #boki .head, #boki .bk, #faq .head")];
  const docTop = (el) => { let y = 0; for (let n = el; n; n = n.offsetParent) y += n.offsetTop; return y; }; // layout position, ignoring scroll-linked transforms
  let idle = 0, touching = false, settling = false;
  const settle = () => {
    if (touching) return;
    const vh = innerHeight, y = scrollY;
    let best = null;
    els().forEach((el) => {
      const to = docTop(el) - (parseFloat(getComputedStyle(el).scrollMarginTop) || 0);
      if (!best || Math.abs(to - y) < Math.abs(best - y)) best = to;
    });
    if (best === null || Math.abs(best - y) < 3 || Math.abs(best - y) > vh * 0.2) return; // close: ease in; far: leave it
    settling = true;
    scrollTo({ top: best, behavior: "smooth" });
  };
  addEventListener("scroll", () => { clearTimeout(idle); idle = setTimeout(() => { if (settling) { settling = false; return; } settle(); }, 180); }, { passive: true });
  addEventListener("touchstart", () => { touching = true; settling = false; }, { passive: true });
  addEventListener("touchend", () => { touching = false; }, { passive: true });
  ["wheel", "keydown", "mousedown"].forEach((ev) => addEventListener(ev, () => { settling = false; }, { passive: true }));
  addEventListener("hashchange", () => { settling = true; });
})();

/* ---------- "broken apart.": the kingdom cracks like land. Scroll down and a hairline crack glows ember-red through
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
    const big = Math.min(1, l.y / 0.2);                          // the first letters only crack; the end of the word really goes
    // like land along a fault: the halves shear (one side slips lower) and sink, the glowing crack between them.
    // Every letter stays in its own column, so the word still reads.
    const gap = 0.01 * crack + 0.012 * fe * big, drop = l.y * f * f * 0.85, drift = 0.24 * l.t * fe, tilt = l.r * 0.1 * fe; // the word spreads as it breaks
    const slip = (0.012 * crack + 0.07 * fe * big) * (l.tw > 7 ? 1 : -1);   // which side slips is the crack's own
    l.a.style.transform = `translate(${(drift - gap).toFixed(3)}em, ${(drop + Math.max(0, -slip)).toFixed(3)}em) rotate(${(tilt - (0.6 + l.tw * 0.12) * fe * big - crack).toFixed(2)}deg)`;
    l.z.style.transform = `translate(${(drift + gap).toFixed(3)}em, ${(drop * 1.06 + Math.max(0, slip)).toFixed(3)}em) rotate(${(tilt + (0.6 + l.tw * 0.15) * fe * big + crack).toFixed(2)}deg)`;
    l.glow.style.opacity = (crack * (0.45 + 0.55 * big) * (1 - 0.5 * fe)).toFixed(3);
    l.glow.style.transform = `translate(${drift.toFixed(3)}em, ${(drop * 1.04).toFixed(3)}em) rotate(${tilt.toFixed(2)}deg)`;
    l.el.style.setProperty("--f", (Math.max(crack * 0.15, fe) * Math.pow(l.t, 0.7)).toFixed(3)); // red rises in the falling shards
    l.chips.forEach((c) => {
      const cf = still ? 0 : clamp((k - 0.12) / 0.7);
      c.el.style.opacity = (cf > 0 ? Math.min(1, cf * 6) * (1 - cf * cf) * big : 0).toFixed(3);
      c.el.style.transform = `translate(${(c.dx * cf + drift).toFixed(3)}em, ${((l.y + 0.25) * c.fall * cf * cf * 1.6).toFixed(3)}em) rotate(${(c.spin * cf).toFixed(1)}deg)`;
    });
  });
  if (calm) { paint(0, true); return; } // reduced motion: cracked and glowing, nothing moves
  // The scroll sets where the letters should be; they ease there (falling with some weight, mending quicker),
  // so a fast flick doesn't snap them apart in one frame.
  let cur = -1, raf = 0, last = 0;
  const target = () => {
    const r = h.getBoundingClientRect(), vh = innerHeight;
    if (r.bottom < -vh * 0.5 || r.top > vh * 1.5) return null; // far off screen: leave it
    // whole until the heading is 80% down the screen; fully broken exactly where the scroll comes to rest on it
    // (the heading's snap point, its scroll-margin-top), so the break finishes as you arrive and you get a beat to read it
    const rest = parseFloat(getComputedStyle(head).scrollMarginTop) || vh * 0.16, start = vh * 0.8;
    return clamp((start - head.getBoundingClientRect().top) / Math.max(1, start - rest));
  };
  const frame = (now) => {
    raf = 0;
    const want = target();
    if (want === null) { last = 0; return; }
    const dt = last ? Math.min(0.05, (now - last) / 1000) : 1 / 60; last = now;
    if (cur < 0) cur = want;
    cur += (want - cur) * (1 - Math.exp(-dt / (want > cur ? 0.2 : 0.11)));
    if (Math.abs(want - cur) < 0.002) cur = want;
    paint(cur);
    if (cur !== want) raf = requestAnimationFrame(frame); else last = 0;
  };
  const req = () => { if (!raf) raf = requestAnimationFrame(frame); };
  addEventListener("scroll", req, { passive: true });
  addEventListener("resize", req);
  req();
})();
