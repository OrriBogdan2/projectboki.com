#!/bin/sh
# Minify build (site-perf-1115). The readable files stay the source of truth: edit assets/site.js, assets/signup.js or
# assets/style.css, then run this. It writes assets/*.min.* and points every page at them with a content-hash ?v=,
# so a changed file always busts the cache and an unchanged one keeps it. `./run.sh --check` only reports staleness.
set -e
cd "$(dirname "$0")"
command -v node >/dev/null 2>&1 || PATH=/home/boki/tools/node-v24.22.3-linux-x64/bin:$PATH
[ -d node_modules/esbuild ] && [ -d node_modules/lightningcss ] || npm install --silent --no-audit --no-fund >/dev/null
exec node minify.mjs "$@"
