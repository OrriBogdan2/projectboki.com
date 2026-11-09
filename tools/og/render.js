// Renders a share image from tools/og/ (og.html by default) to a PNG. Serve the site on :8765 first.
// node tools/og/render.js out.png [page.html]
const { chromium } = require("playwright");
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1200, height: 630 } });
  await p.goto("http://localhost:8765/tools/og/" + (process.argv[3] || "og.html"), { waitUntil: "networkidle" }); await p.evaluate(() => document.fonts.ready); await p.waitForTimeout(500);
  await p.screenshot({ path: process.argv[2] || "assets/img/og.png", clip: { x: 0, y: 0, width: 1200, height: 630 } });
  await b.close();
})();
