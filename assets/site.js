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
