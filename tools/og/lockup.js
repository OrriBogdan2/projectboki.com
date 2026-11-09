// Renders tools/og/lockup.html to transparent PNGs of the cracked lockup. Serve the site on :8765 first.
// node tools/og/lockup.js  -> /tmp/lockup-2000.png (then convert to webp sizes)
const { chromium } = require("playwright");
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 2400, height: 1400 } });
  await p.goto("http://localhost:8765/tools/og/lockup.html", { waitUntil: "networkidle" }); await p.waitForTimeout(500);
  await p.evaluate(() => document.fonts.ready);
  await p.locator("#lk").screenshot({ path: process.argv[2] || "/tmp/lockup-2000.png", omitBackground: true });
  await b.close();
})();
