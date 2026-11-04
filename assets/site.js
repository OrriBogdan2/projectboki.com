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

// No autoplaying video for people who asked for less motion.
if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
  document.querySelectorAll("video[autoplay]").forEach((v) => { v.removeAttribute("autoplay"); v.pause(); });
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
