// Minify build (site-perf-1115): readable sources in, .min files out, page references rewritten to a content hash.
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { createHash } from "node:crypto";
import { transformSync } from "esbuild";
import { transform as cssTransform } from "lightningcss";

const ROOT = new URL("../../", import.meta.url).pathname;
const FILES = [ // [source, output] - topbar.js stays as is (the Bokidex export patches it)
  ["assets/site.js", "assets/site.min.js"],
  ["assets/signup.js", "assets/signup.min.js"],
  ["assets/style.css", "assets/style.min.css"],
];
const PAGES = ["index.html", "devlog.html", "presskit.html", "privacy.html", "404.html", "2d/old.html"];
const check = process.argv.includes("--check");
const banner = (src) => `/* built from ${src.split("/").pop()} by tools/minify/run.sh: edit the source, not this file */\n`;

let stale = 0;
const refs = [];
for (const [src, out] of FILES) {
  const code = readFileSync(ROOT + src, "utf8");
  let min;
  if (src.endsWith(".js")) min = transformSync(code, { loader: "js", minify: true, target: "es2020", legalComments: "none" }).code;
  else min = cssTransform({ filename: src, code: Buffer.from(code), minify: true }).code.toString();
  min = banner(src) + min;
  const hash = createHash("sha256").update(min).digest("hex").slice(0, 10);
  const had = existsSync(ROOT + out) ? readFileSync(ROOT + out, "utf8") : "";
  if (had !== min) { stale++; if (!check) writeFileSync(ROOT + out, min); }
  const base = src.split("/").pop(), [name, ext] = base.split(".");
  refs.push([new RegExp(`assets/${name}(?:\\.min)?\\.${ext}(?:\\?v=[\\w.-]*)?(?=["'])`, "g"), `assets/${name}.min.${ext}?v=${hash}`]);
  console.log(`${out}  ${(code.length / 1024).toFixed(1)} KB -> ${(min.length / 1024).toFixed(1)} KB  v=${hash}`);
}
for (const p of PAGES) {
  if (!existsSync(ROOT + p)) continue;
  const html = readFileSync(ROOT + p, "utf8");
  let next = html;
  for (const [re, to] of refs) next = next.replace(re, to);
  if (next !== html) { stale++; if (!check) writeFileSync(ROOT + p, next); console.log(`${check ? "stale" : "updated"}: ${p}`); }
}
if (check && stale) { console.error(`minify: ${stale} file(s) out of date - run tools/minify/run.sh`); process.exit(1); }
