// Paste the Discord invite here (e.g. "https://discord.gg/abc123").
// Every Discord button then shows up, and the nav button switches from GitHub to the playtest.
const DISCORD_URL = "https://discord.gg/nbeBaU7xt";

if (DISCORD_URL) {
  document.querySelectorAll(".js-discord").forEach((a) => { a.href = DISCORD_URL; a.hidden = false; });
  document.querySelectorAll(".js-nodiscord").forEach((a) => { a.hidden = true; });
}

const nav = document.getElementById("nav");
if (nav && !nav.classList.contains("scrolled")) {
  const onScroll = () => nav.classList.toggle("scrolled", window.scrollY > 40);
  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });
}

// No autoplaying video for people who asked for less motion.
if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
  document.querySelectorAll("video[autoplay]").forEach((v) => { v.removeAttribute("autoplay"); v.pause(); });
}

/* ---------- Wardens character select ---------- */
const WARDENS = [
  ["vex", "Vex", "Hired Gun", "Medium", "Quill rifle", "Bounces a spiked charge off the wall and slides around still shooting."],
  ["zedran", "Zedran", "Arena King", "Heavy", "Greatsword", "The wrecking ball. Burns hotter with every hit, chains you in and finishes it."],
  ["pin", "Pin", "Dark Archer", "Light", "Longbow", "Climbs to the high ground, reads the field and pins people to walls."],
  ["cinder", "Cinder", "Mad Pyromancer", "Heavy", "Flamethrower", "Hoses foes down until they blaze, then rams them head first."],
  ["sable", "Sable", "Silver Thief", "Light", "Arc bolts", "The duelist. Sticks to one mark, cartwheels past them and never lets go."],
  ["vireo", "Vireo", "Storm Slayer", "Light", "Coilcaster", "Charges a foe with lightning, then runs straight through them as a bolt."],
  ["bjorn", "Bjorn", "Frozen Bulwark", "Heavy", "Tower shield", "The squad's shield. Holds the line and heals the ground he plants on."],
  ["dredge", "Dredge", "Broken Abomination", "Heavy", "Shotgun", "Reels you in on a rope, drops an anchor on you and grows with every knock."],
  ["moosh", "Moosh Moosh", "Fox Cub", "Medium", "Lantern crook", "The squad's courier and medic. Carries the fallen out by lantern light."],
  ["claire", "Claire", "Icy Dancer", "Light", "Hoar fan", "Runs the fight on the ice with freezing spears and a sliding wall of frost."],
  ["tarek", "Tarek", "Rock Elementalist", "Medium", "Rubble fists", "Raises stone out of the ground, climbs it, then punches it into you."],
  ["ostra", "Ostra", "Void Jester", "Medium", "Tether lantern", "The lamplighter who floats. Pulls the fight to her, then lets it fall in."],
];
const wPick = document.getElementById("w-pick");
if (wPick) {
  const img = document.getElementById("w-splash");
  const show = (i, focus) => {
    const [id, name, title, cls, weapon, desc] = WARDENS[i];
    img.classList.add("fade");
    const next = new Image();
    next.src = `assets/img/wardens/${id}-splash-1920.webp`;
    const swap = () => {
      img.srcset = `assets/img/wardens/${id}-splash-960.webp 960w, assets/img/wardens/${id}-splash-1920.webp 1920w`;
      img.src = next.src; img.alt = `${name}, the ${title}`;
      requestAnimationFrame(() => img.classList.remove("fade"));
    };
    next.complete ? swap() : (next.onload = swap, next.onerror = swap);
    document.getElementById("w-name").textContent = name;
    document.getElementById("w-title").textContent = title;
    document.getElementById("w-meta").innerHTML = `<span>${cls}</span><span>${weapon}</span>`;
    document.getElementById("w-desc").textContent = desc;
    wPick.querySelectorAll("button").forEach((b, j) => b.setAttribute("aria-pressed", String(j === i)));
    if (focus) wPick.children[i].focus();
  };
  WARDENS.forEach(([id, name, title], i) => {
    const b = document.createElement("button");
    b.type = "button";
    b.setAttribute("aria-label", `${name}, ${title}`);
    b.setAttribute("aria-pressed", String(i === 0));
    b.innerHTML = `<img src="assets/img/wardens/${id}-portrait.webp" alt="" loading="lazy">`;
    b.addEventListener("click", () => show(i));
    b.addEventListener("keydown", (e) => {
      if (e.key === "ArrowRight") { e.preventDefault(); show((i + 1) % WARDENS.length, true); }
      if (e.key === "ArrowLeft") { e.preventDefault(); show((i + WARDENS.length - 1) % WARDENS.length, true); }
    });
    wPick.appendChild(b);
  });
}
