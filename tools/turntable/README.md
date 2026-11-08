# Hunter turntables for the site

Renders each Hunter's in-game model on a stand, two ways, and packs them into `assets/img/hunters/3d/`:
- `{id}-pose.webp`: facing you (three-quarter), the Hunter's emote once, then an idle loop. 80 ms a frame, 10 columns, 450x450 a frame. The site plays this when a Hunter is picked.
- `{id}-spin.webp`: a 24-frame turntable (6x4 sheet, 600x600 a frame) for dragging. Its first frame matches the pose angle.
- `{id}.webp`: the first pose frame, shown while the sheets load.

1. In the game repo (`OrriBogdan2/project-boki`, branch `main`): copy `hunters.gd` and `hunters.tscn` to `tools/web/` (local only, don't commit), then run `godot --headless --path . --import`.
2. Render (Godot 4.6.2, needs xvfb):
   `xvfb-run -a -s "-screen 0 1600x1600x24" godot --path . --rendering-method gl_compatibility --resolution 800x800 res://tools/web/hunters.tscn -- --ids=gunslinger,juggernaut,archer,bulwark,mage,ashwick,dredge,tender,rimewright,dolm,ostra,thief --zoom=tender:0.46,bulwark:1.2 --frames=24 --out=/tmp/h3d`
   Render with `EXTRA=--no-stand` (the stand is drawn by pack.py, identical for every Hunter, so it no longer scales with each model's bounds). The pose pass is on by default (`--no-pose` skips it). It writes `<id>/pose/NN.png` and `<id>/pose.txt`.
3. Pack from this repo's root, all twelve at once (sizing is relative across them), with each Hunter's emote picks:
   `python3 tools/turntable/pack.py /tmp/h3d assets/img/hunters/3d --stand vex:emote+e kael:emote+spin+riposte cinder:emote+stoke pip:emote+hearth+toss tarek:emote_toss+e_row+sense lisette:emote+deadeye grimble:flex+emote claire:emote+rime ryzz:emote+sky+gum breaker:emote+x_wind+e_mend sable:emote+encore_dance motley:arrive+empower+flurry`
   The render makes every candidate clip in `CANDS` (hunters.gd); the picks above are the ones that read well (checked by eye on a contact sheet, Nov 8 2026). If a pick is missing after a model update, drop it from the list. The first pick plays when the Hunter is chosen; the rest cycle every 6 to 9 s.
   It prints a `const POSE = {...};` line: replace the `const POSE` line in `assets/site.js` with it (every Hunter needs an entry, or its figure stays a still).
   Sizes: each render writes `<id>.fit` (camera distance). In-game height = pixel height x distance; pack.py scales each Hunter so the tallest fills the frame and the rest follow height^0.6 (true order, eased so the small ones stay readable), capped so nobody leaves the frame. Frames are square (the 720x900 renders sit on a 900x900 canvas) so wide Hunters like Albert have room to stand at full size.
4. Look at every still next to its portrait (`assets/img/hunters/{id}-face-640.webp`). Every Hunter shows a model (4th field of each entry in `HUNTERS` in `assets/site.js` stays true) unless it's really broken; a rough base skin is fine. Bump `site.js?v=` in `index.html` if you change that array.

Newest models live on branches until they're merged. Render each Hunter from its branch (as of Nov 8 2026):
vex gunslinger: ext/vex-v2-model | kael juggernaut: ext/kael-v2-model (--zoom=juggernaut:0.85) | lisette archer: ext/ravel-v2-model | breaker bulwark: ext/breaker-v2-model (--zoom=bulwark:1.2) | ryzz mage: ext/ryzz-v2-model | cinder ashwick: ext/cinder-v2-palms | grimble dredge: ext/grimble-v2-model | claire rimewright: ext/claire-v2-model | tarek dolm: ext/tarek-v2-model | motley ostra: ext/ostra-v2-model | sable thief: ext/sable-v2-model | pip tender: main (--zoom=tender:0.46).
Check `git ls-remote --heads origin` for newer *-v2-model branches, and use main once a Hunter's v2 is merged there. Helper: tools/turntable/render_v2.sh does the whole list (`ONLY="gunslinger tender"` limits it, `OUT=` sets the output folder); it expects hunters.gd and hunters.tscn in /home/claude/webtools, so copy them there from this folder first. After repacking, bump MODEL_V in assets/site.js.

Game ids to site ids: gunslinger=vex, juggernaut=kael, archer=lisette (Lace), bulwark=breaker (Albert), mage=ryzz (Sparkle), ashwick=cinder, dredge=grimble, tender=pip (Meeko), rimewright=claire (Neve), dolm=tarek (Tenzo), ostra=motley, thief=sable.
