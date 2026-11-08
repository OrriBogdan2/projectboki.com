#!/bin/bash
# Render each Hunter's turntable from the branch holding its newest model.
G=/home/claude/godot/Godot_v4.6.2-stable_linux.x86_64
OUT=${OUT:-/home/claude/shots/h3d_v2}
ONLY=${ONLY:-}   # e.g. ONLY="gunslinger tender" to render just those
# FRAMES=1 EXTRA=--no-pose: just the fit (camera distance), written to $OUT/<id>.fit
mkdir -p $OUT
cd /home/claude/project-boki
while read br id zoom; do
  [ -n "$ONLY" ] && [[ " $ONLY " != *" $id "* ]] && continue
  echo "=== $br $id $(date +%T)"
  git fetch -q --depth 1 origin "$br" || { echo "FETCH FAIL $br"; continue; }
  git checkout -q -f FETCH_HEAD && git clean -fdq tools/web 2>/dev/null
  mkdir -p tools/web && cp /home/claude/webtools/hunters.gd /home/claude/webtools/hunters.tscn tools/web/
  ls content/archetypes/$id.json >/dev/null 2>&1 || echo "NO ARCHETYPE $id on $br"
  timeout 1500 $G --headless --path . --import > /tmp/imp_$id.log 2>&1
  Z=""; [ -n "$zoom" ] && Z="--zoom=$id:$zoom"
  timeout 900 xvfb-run -a -s "-screen 0 1600x1600x24" $G --path . --rendering-method gl_compatibility --resolution 800x800 res://tools/web/hunters.tscn -- --ids=$id $Z --frames=${FRAMES:-24} --out=$OUT $EXTRA > /tmp/r_$id.log 2>&1 &
  P=$!
  # Godot sometimes hangs after quitting under xvfb: once the script says it's done, stop it
  while kill -0 $P 2>/dev/null; do
    if grep -q "HUNTERS3D DONE" /tmp/r_$id.log; then sleep 3; pkill -f "res://tools/web/hunters.tscn" ; break; fi
    sleep 2
  done
  wait $P 2>/dev/null
  echo "rendered $id: $(grep -c HUNTER3D /tmp/r_$id.log) $(grep -m1 -E 'SCRIPT ERROR|Parse Error' /tmp/r_$id.log)"
done <<'LIST'
ext/vex-v2-model gunslinger
ext/kael-v2-model juggernaut 0.85
ext/ravel-v2-model archer
ext/breaker-v2-model bulwark 1.2
ext/ryzz-v2-model mage
ext/cinder-v2-palms ashwick
ext/grimble-v2-model dredge
ext/claire-v2-model rimewright
ext/tarek-v2-model dolm
ext/ostra-v2-model ostra
ext/sable-v2-model thief
main tender 0.46
LIST
echo ALLDONE
