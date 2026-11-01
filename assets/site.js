// Paste the Discord invite here (e.g. "https://discord.gg/abc123").
// Every Discord button then shows up, and the nav button switches from GitHub to the playtest.
const DISCORD_URL = "";

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
