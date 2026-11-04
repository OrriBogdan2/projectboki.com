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

// Hero: slow crossfade through Hunter key art.
// [id, name, title, focal x on narrow screens]
const HERO = [
  ["vex", "Vex", "Hired Gun", "38%"],
  ["kael", "Kael", "The Unbroken", "42%"],
  ["ryzz", "Ryzz", "Storm Chaser", "52%"],
  ["claire", "Claire", "Frost Siren", "42%"],
  ["ostra", "Ostra", "Void Jester", "52%"],
  ["cinder", "Cinder", "Mad Pyromancer", "40%"],
];
const media = document.getElementById("hero-media");
const now = document.getElementById("hero-now");
if (media && now) {
  const DUR = 7000;
  now.style.setProperty("--dur", DUR + "ms");
  const set = (id) => `assets/img/hunters/${id}-960.webp 960w, assets/img/hunters/${id}-1600.webp 1600w, assets/img/hunters/${id}-2000.webp 2000w`;
  const slides = [media.querySelector(".slide")];
  let i = 0, timer = null, built = false;

  const build = () => {
    if (built) return; built = true;
    HERO.slice(1).forEach(([id, , , x]) => {
      const im = document.createElement("img");
      im.className = "slide"; im.alt = ""; im.decoding = "async";
      im.sizes = "100vw"; im.srcset = set(id); im.src = `assets/img/hunters/${id}-1600.webp`;
      im.style.setProperty("--x", x);
      media.appendChild(im); slides.push(im);
    });
  };
  const restartBar = () => { now.classList.remove("run"); void now.offsetWidth; now.classList.add("run"); };
  const step = () => {
    const n = (i + 1) % slides.length;
    const go = () => {
      slides[i].classList.remove("on");
      slides[n].classList.add("on");
      now.classList.add("swap");
      setTimeout(() => {
        document.getElementById("hero-name").textContent = HERO[n][1];
        document.getElementById("hero-title").textContent = HERO[n][2];
        now.classList.remove("swap");
      }, 400);
      i = n; restartBar();
    };
    const im = slides[n];
    im.complete ? go() : (im.decode ? im.decode().then(go, go) : go());
  };
  const play = () => { if (!timer) { restartBar(); timer = setInterval(step, DUR); } };
  const stop = () => { clearInterval(timer); timer = null; now.classList.remove("run"); };

  if (!calm) {
    const first = slides[0];
    const start = () => { build(); play(); };
    first.complete ? setTimeout(start, 600) : first.addEventListener("load", () => setTimeout(start, 600), { once: true });
    document.addEventListener("visibilitychange", () => (document.hidden ? stop() : built && play()));
    new IntersectionObserver(([e]) => (e.isIntersecting ? built && play() : stop())).observe(media);
  }
}

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

/* ---------- Hunters: pick a Mask ---------- */
// [id, name, title, mask (relic), one line]
const HUNTERS = [
  ["vex", "Vex", "Hired Gun", "Brass cyber-eye", "Foundry kid who bolted a siege cannon to her arm."],
  ["kael", "Kael", "The Unbroken", "Broken champion's collar", "Undefeated arena slave. A demon lives in his blade."],
  ["hem", "Hem", "Red Stitch", "Stitched porcelain mask", "The Tyrant's mask-stitcher, turned deserter."],
  ["breaker", "Breaker", "Frozen Bulwark", "Ship's compass", "Went down with his ship so the refugees could live."],
  ["ryzz", "Ryzz", "Storm Chaser", "Her first lightning rod", "Struck by the Wyrm's storm. Throws it back in pink."],
  ["cinder", "Cinder", "Mad Pyromancer", "Cracked goggles", "Drank the Wyrm's blood. Fireproof, and a little mad."],
  ["dredge", "Dredge", "Brass Abomination", "Cracked porthole eye", "A diving machine haunted by whatever drowned inside."],
  ["pip", "Pip", "Little Lantern", "Hearth lantern", "Carries a shelter's fire. It heals."],
  ["claire", "Claire", "Frost Siren", "Ice skates", "Skated the crowd to safety. The frost took her."],
  ["tarek", "Tarek", "Cliff Runner", "A seeing-stone", "Blind. Sees through three floating stones."],
  ["ostra", "Ostra", "Void Jester", "Grinning jester mask", "Sealed in his own mask. Steals your laughter."],
  ["sable", "Sable", "Silver Thief", "Silver domino mask", "The thief who woke the Wyrm."],
];

const pick = document.getElementById("h-pick");
if (pick) {
  const art = document.getElementById("h-art");
  const $ = (id) => document.getElementById(id);
  const src = (id, w) => `assets/img/hunters/${id}-${w}.webp`;
  const set = (id) => `${src(id, 960)} 960w, ${src(id, 1600)} 1600w, ${src(id, 2000)} 2000w`;
  let current = 0;

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
    if (i === current) return;
    current = i;
    const [id, name, title, relic, line] = HUNTERS[i];
    pick.querySelectorAll("button").forEach((b, j) => b.setAttribute("aria-pressed", j === i ? "true" : "false"));
    pick.children[i].scrollIntoView({ block: "nearest", inline: "nearest", behavior: "smooth" });
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
      $("h-relic").textContent = relic;
      $("h-line").textContent = line;
      art.classList.remove("out");
    };
    next.decode ? next.decode().then(swap, swap) : (next.onload = swap);
  }

  pick.addEventListener("keydown", (e) => {
    const d = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
    if (!d) return;
    e.preventDefault();
    const n = (current + d + HUNTERS.length) % HUNTERS.length;
    show(n);
    pick.children[n].focus();
  });
}

/* ---------- Boki browser ---------- */
// [id, name, mix, size, found, glow, body, flavor, [bravery, loyalty, temper, curiosity]]
const BOKI = [
  ["vespyx", "Vespyx", "Fox + Scorpion", "Small", "Starter egg", "#a6ff3a", "#4a2f5c", "A sly fox with a scorpion's curled tail. Its sting drips venom that keeps eating at foes after the hit.", [0.75, 0.5, 0.7, 0.5]],
  ["prismander", "Prismander", "Axolotl + Crystal", "Small", "Starter egg", "#7ff3ff", "#f0a6d6", "An axolotl whose frills grew into living crystal. It bends light into shields and dazzling beams.", [0.45, 0.85, 0.2, 0.6]],
  ["mycroll", "Mycroll", "Hedgehog + Toadstool", "Small", "Starter egg", "#3fe0c0", "#6b4a3c", "A hedgehog whose quills are glowing toadstools. It puffs spore clouds that root foes where they stand.", [0.55, 0.6, 0.4, 0.8]],
  ["echolop", "Echolop", "Hare + Bat", "Small", "Wild nests", "#7fe8ff", "#4a5aa8", "A long-eared hare with bat wings. It hears everything coming and fires ringing pulses of sound.", [0.65, 0.4, 0.6, 0.9]],
  ["lunowl", "Lunowl", "Owl + Luna moth", "Small", "Wild nests", "#fff0a0", "#9fe6b4", "A moonlit owl with soft moth wings. It flits on moondust and dazzles foes with silver light.", [0.35, 0.55, 0.5, 0.7]],
  ["gravadillo", "Gravadillo", "Armadillo + Rhino beetle", "Large", "Wild nests", "#b48cff", "#3c4058", "An armadillo with a rhino beetle's horn. It rolls up in heavy plates and bends gravity to slam foes down.", [0.9, 0.7, 0.3, 0.2]],
  ["cairnback", "Cairnback", "Tortoise + Ibex", "Large", "The Stone Colossus's egg", "#ffd36a", "#6a6f7a", "A tortoise with an ibex's sweeping horns, carrying a little rune-carved cairn on its shell.", [0.85, 0.8, 0.25, 0.35]],
  ["hivara", "Hivara", "Honeybee + Praying mantis", "Small", "The Brood Mother's egg", "#ffe680", "#d9a42a", "A honeybee with a praying mantis's folded blades, wearing a crown of wax. A swarm of tiny bees follows it everywhere.", [0.7, 0.75, 0.55, 0.6]],
  ["zephyrak", "Zephyrak", "Moray eel + Swift", "Small", "Stormcoil's egg", "#9ff4ff", "#2f6f9a", "A little sky serpent: a moray eel's long body with a swift's swept wings, crackling with static.", [0.8, 0.45, 0.65, 0.85]],
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
  $("bk-next").addEventListener("click", () => show(at + 1, 1));
  bkPick.addEventListener("keydown", (e) => {
    const d = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
    if (!d) return;
    e.preventDefault(); show(at + d, d); bkPick.children[at].focus();
  });

  // Swipe the stage on touch screens.
  let x0 = null;
  stage.addEventListener("pointerdown", (e) => { if (e.pointerType !== "mouse") x0 = e.clientX; });
  stage.addEventListener("pointerup", (e) => {
    if (x0 === null) return;
    const dx = e.clientX - x0; x0 = null;
    if (Math.abs(dx) > 40) show(at + (dx < 0 ? 1 : -1), dx < 0 ? 1 : -1);
  });
  stage.addEventListener("pointercancel", () => { x0 = null; });

  show(0);
}
