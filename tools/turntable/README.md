# Hunter turntables for the site

Renders each Hunter's in-game model (with its idle animation) on a stand as a 24-frame turntable, then packs it into `assets/img/hunters/3d/{id}-spin.webp` (6x4 sheet, 480x600 per frame) plus `{id}.webp` (first frame).

1. In the game repo (`OrriBogdan2/project-boki`, branch `main`): copy `hunters.gd` and `hunters.tscn` to `tools/web/` (local only, don't commit), then run `godot --headless --path . --import`.
2. Render (Godot 4.6.2, needs xvfb):
   `xvfb-run -a -s "-screen 0 1600x1600x24" godot --path . --rendering-method gl_compatibility --resolution 800x800 res://tools/web/hunters.tscn -- --ids=gunslinger,juggernaut,archer,bulwark,mage,ashwick,dredge,tender,rimewright,dolm,ostra,thief --zoom=tender:0.46,bulwark:1.2 --frames=24 --out=/tmp/h3d`
3. Pack from this repo's root: `python3 tools/turntable/pack.py /tmp/h3d assets/img/hunters/3d vex breaker ryzz claire grimble pip cinder tarek motley sable`
4. Look at every still next to its portrait (`assets/img/hunters/{id}-face-640.webp`). Only show a model that matches the current art: the 4th field of each entry in `HUNTERS` in `assets/site.js`. Hidden now: kael, lisette (old designs). Bump `site.js?v=` in `index.html` if you change that array.

Game ids to site ids: gunslinger=vex, juggernaut=kael, archer=lisette (Ravyl), bulwark=breaker (Mossy), mage=ryzz, ashwick=cinder, dredge=grimble, tender=pip (Lumi), rimewright=claire (Nivi), dolm=tarek (Kibo), ostra=motley, thief=sable.
