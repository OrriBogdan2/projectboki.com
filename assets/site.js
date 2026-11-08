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
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } });
  }, { rootMargin: "0px 0px -12% 0px", threshold: 0.08 });
  revealed.forEach((el) => io.observe(el));
} else {
  revealed.forEach((el) => el.classList.add("in"));
}

const media = document.getElementById("hero-media");

// Hero content drifts back and fades as you scroll past it.
const heroIn = document.getElementById("hero-in");
if (heroIn && !calm) {
  let ticking = false;
  const draw = () => {
    ticking = false;
    const h = window.innerHeight, y = Math.min(window.scrollY, h);
    const t = y / h;
    heroIn.style.transform = `translate3d(0, ${y * 0.3}px, 0)`;
    heroIn.style.opacity = String(Math.max(0, 1 - t * 1.5));
    if (media) media.style.transform = `translate3d(0, ${y * 0.25}px, 0)`;
  };
  window.addEventListener("scroll", () => { if (!ticking) { ticking = true; requestAnimationFrame(draw); } }, { passive: true });
  draw();
}

/* ---------- Hunter figure: 24-frame turntable, drag to turn ---------- */
function spinner(box, el) {
  const FRAMES = 24, COLS = 6, ROWS = 4;
  let f = 0, id = "", timer = null, drag = null, idle = null, ready = false, seen = false;
  const pos = () => {
    const c = f % COLS, r = Math.floor(f / COLS);
    el.style.backgroundPosition = `${(c / (COLS - 1)) * 100}% ${(r / (ROWS - 1)) * 100}%`;
  };
  const tick = () => { f = (f + 1) % FRAMES; pos(); };
  const play = () => { if (!timer && ready && seen && !calm) timer = setInterval(tick, 140); };
  const stop = () => { clearInterval(timer); timer = null; };
  const io = new IntersectionObserver(([e]) => { seen = e.isIntersecting; seen ? play() : stop(); });
  io.observe(box);
  box.addEventListener("pointerdown", (e) => {
    if (!ready) return;
    drag = { x: e.clientX, f }; stop(); clearTimeout(idle);
    box.setPointerCapture(e.pointerId); box.classList.add("grab");
  });
  box.addEventListener("pointermove", (e) => {
    if (!drag) return;
    const step = Math.round((e.clientX - drag.x) / 14);
    f = (((drag.f - step) % FRAMES) + FRAMES) % FRAMES; pos();
  });
  const end = () => {
    if (!drag) return;
    drag = null; box.classList.remove("grab");
    idle = setTimeout(play, 2500);
  };
  box.addEventListener("pointerup", end);
  box.addEventListener("pointercancel", end);
  return {
    load(next, name) {
      if (next === id) return;
      id = next; ready = false; stop(); f = 0;
      box.hidden = !next;
      if (!next) return;
      el.setAttribute("aria-label", `${name}'s in-game model on a stand`);
      box.classList.add("swap");
      const still = `assets/img/hunters/3d/${next}.webp`, sheet = `assets/img/hunters/3d/${next}-spin.webp`;
      const im = new Image();
      im.onload = () => {
        if (id !== next) return;
        el.style.backgroundImage = `url(${still})`; el.style.backgroundSize = "100% 100%"; el.style.backgroundPosition = "0 0";
        box.classList.remove("swap");
        const sp = new Image();
        sp.onload = () => {
          if (id !== next) return;
          el.style.backgroundImage = `url(${sheet})`; el.style.backgroundSize = `${COLS * 100}% ${ROWS * 100}%`;
          pos(); ready = true; play();
        };
        sp.src = sheet;
      };
      setTimeout(() => { im.src = still; }, 180);
    },
  };
}

/* ---------- Hunters: pick a Mask ---------- */
// [id, name, title, has an up-to-date in-game model, role (from the kit's role line in the game)]
const HUNTERS = [
  ["vex", "Vex", "The Hired Gun", true, "Gunslinger"],
  ["kael", "Kael", "The Unbroken", true, "Bruiser"],
  ["cinder", "Cinder", "The Ashen Kiss", true, "Pyro"],
  ["pip", "Meeko", "The Dawnfox", true, "Support"],
  ["tarek", "Tenzo", "The Stone Seer", true, "Brawler"],
  ["lisette", "Lace", "The Red Stitch", true, "Marksman"],
  ["grimble", "Grimble", "The Scrap King", true, "Initiator"],
  ["claire", "Neve", "The Snowglide", true, "Controller"],
  ["ryzz", "Sparkle", "The Storm Chaser", true, "Skirmisher"],
  ["breaker", "Albert", "The Barnacle Knight", true, "Tank"],
  ["sable", "Sable", "The Silver Thief", true, "Duelist"],
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

  function show(i) {
    i = (i + HUNTERS.length) % HUNTERS.length;
    if (i === current) return;
    current = i;
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
  function alignTitle() {
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
