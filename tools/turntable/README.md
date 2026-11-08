# Hunter turntables for the site

Renders each Hunter's in-game model (with its idle animation) on a stand as a 24-frame turntable, then packs it into `assets/img/hunters/3d/{id}-spin.webp` (6x4 sheet, 480x600 per frame) plus `{id}.webp` (first frame).

1. In the game repo (`OrriBogdan2/project-boki`, branch `main`): copy `hunters.gd` and `hunters.tscn` to `tools/web/` (local only, don't commit), then run `godot --headless --path . --import`.
2. Render (Godot 4.6.2, needs xvfb):
   `xvfb-run -a -s "-screen 0 1600x1600x24" godot --path . --rendering-method gl_compatibility --resolution 800x800 res://tools/web/hunters.tscn -- --ids=gunslinger,juggernaut,archer,bulwark,mage,ashwick,dredge,tender,rimewright,dolm,ostra,thief --zoom=tender:0.46,bulwark:1.2 --frames=24 --out=/tmp/h3d`
3. Pack from this repo's root: `python3 tools/turntable/pack.py /tmp/h3d assets/img/hunters/3d vex breaker ryzz claire grimble pip cinder tarek motley sable`
4. Look at every still next to its portrait (`assets/img/hunters/{id}-face-640.webp`). Every Hunter shows a model (4th field of each entry in `HUNTERS` in `assets/site.js` stays true) unless it's really broken; a rough base skin is fine. Bump `site.js?v=` in `index.html` if you change that array.

Newest models live on branches until they're merged. Render each Hunter from its branch (as of Nov 8 2026):
vex gunslinger: ext/vex-v2-model | kael juggernaut: ext/kael-v2-model (--zoom=juggernaut:0.85) | lisette archer: ext/ravel-v2-model | breaker bulwark: ext/breaker-v2-model (--zoom=bulwark:1.2) | ryzz mage: ext/ryzz-v2-model | cinder ashwick: ext/cinder-v2-palms | grimble dredge: ext/grimble-v2-model | claire rimewright: ext/claire-v2-model | tarek dolm: ext/tarek-v2-model | motley ostra: ext/ostra-v2-model | sable thief: ext/sable-v2-model | pip tender: main (--zoom=tender:0.46).
Check `git ls-remote --heads origin` for newer *-v2-model branches, and use main once a Hunter's v2 is merged there. /home-style helper: tools/turntable/render_v2.sh does the whole list. After repacking, bump MODEL_V in assets/site.js.

Game ids to site ids: gunslinger=vex, juggernaut=kael, archer=lisette (Lace), bulwark=breaker (Albert), mage=ryzz (Sparkle), ashwick=cinder, dredge=grimble, tender=pip (Meeko), rimewright=claire (Neve), dolm=tarek (Tenzo), ostra=motley, thief=sable.
