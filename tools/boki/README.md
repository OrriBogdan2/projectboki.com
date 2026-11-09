# Homepage Boki

`build.py` makes the homepage Boki section's data (`assets/boki.json`) and card art (`assets/img/boki-front/`):

    python3 -I tools/boki/build.py --game ../project-boki   # --ref auto: whichever of main / ext/roster-109 has the most species

- Roster: every `content/kin_v2/*.json` at that ref of the game repo (names, types, evolution line, description).
- Revealed: species with a clean 2D turnaround in `assets/boki2d.json` (uploaded through /2d). `front.py` crops the
  front view out of the sheet and removes the backdrop. Descriptions show only for live species (data-only ones carry design notes).
- Hidden: everyone else, as a silhouette of their 3D render when there is one, otherwise an egg.
- Pose-grid sheets (tall sheets on a light backdrop) are detected and stay hidden until they have a turnaround.

Rerun it after new art lands in /2d or the roster changes, then commit the output.
