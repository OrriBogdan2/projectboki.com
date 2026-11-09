# Homepage Boki

`build.py` makes the homepage Boki section's data (`assets/boki.json`) and card art (`assets/img/boki-front/`):

    python3 -I tools/boki/build.py --game ../project-boki   # --ref auto: whichever of main / ext/roster-109 has the most species

- Roster: every `content/kin_v2/*.json` at that ref of the game repo (names, types, evolution line, description).
- Revealed: species with a clean 2D turnaround in `assets/boki2d.json` (uploaded through /2d). `front.py` crops the
  front view out of the sheet and removes the backdrop. Descriptions show only for live species (data-only ones carry design notes).
- Hidden: everyone else, as a silhouette of their 3D render when there is one, otherwise an egg.
- Pose-grid sheets (tall sheets on a light backdrop) are detected and stay hidden until they have a turnaround.

Rerun it after new art lands in /2d or the roster changes, then commit the output.

## The Bokidex is the art source now

`/bokidex` (password-gated, same key as `/3d`) holds the approved art. The build reads it directly:

    pip install --break-system-packages "rembg[cpu]" cryptography
    BOKIDEX_PW=<the /3d password> python3 -I tools/boki/build.py --game ../project-boki

Per species, the card art is (best first): its newest approved **portrait** shot (the 3/4 shots made for the
front page), else its newest approved **2D sheet** (first figure), else the old `/2d` upload. Both Bokidex kinds
are cut out with rembg (`isnet-general-use`). Female forms are skipped. The password is only read from the
environment and never written anywhere. The wall shows the portrait shots first, 12 cards on desktop.

