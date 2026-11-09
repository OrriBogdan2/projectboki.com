// Renders tools/og/og.html to assets/img/og.jpg (the link preview). Serve the site on :8765 first.
const { chromium } = require("playwright");
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1200, height: 630 } });
  await p.goto("http://localhost:8765/tools/og/og.html", { waitUntil: "networkidle" }); await p.waitForTimeout(500);
  await p.screenshot({ path: process.argv[2] || "assets/img/og.png", clip: { x: 0, y: 0, width: 1200, height: 630 } });
  await b.close();
})();
