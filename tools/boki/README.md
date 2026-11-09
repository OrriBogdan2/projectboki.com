# Homepage Boki wall

`build.py` builds `assets/boki.json` and the wall's art from the public Bokidex export (`bokidex/d/data.json`),
so names, types, descriptions and evolution lines always match the dex.

    python3 -I tools/boki/build.py            # 50 revealed (default)
    python3 -I tools/boki/build.py --reveal 60

- **Revealed:** every Boki with an approved front-page portrait shot in the Bokidex, then the rest picked for variety
  (final evolutions first, round robin across types). Shots are cut out with rembg (`pip install "rembg[cpu]"`).
- **Hidden:** everyone else, as silhouettes baked black (`assets/img/boki-sil/`) or eggs. Card art for hidden Boki
  is deleted, so they can't be found by guessing a file name. The page shows three rows of the mystery.
- Run it again whenever new art lands in the Bokidex, then commit the changes.

`front.py` is the old /2d front-view crop, kept for reference.
