"""Pack Godot frames into the site's figure sheets. Usage: pack.py SRC_DIR DEST_DIR id [id ...]

SRC_DIR/<id>/NN.png        24 turntable frames, 720x900 -> <id>-spin.webp (6x4 sheet, 480x600 a frame)
SRC_DIR/<id>/pose/NN.png   the front pose: emote frames, then an idle loop -> <id>-pose.webp (10 columns, 360x450 a frame)
SRC_DIR/<id>/pose.txt      "<emote frames> <idle frames> ..." from hunters.gd
<id>.webp is the first pose frame (480x600), shown while the sheets load.
Every frame is shifted by the same amount so the stand's base sits on the frame floor.
Prints the POSE table for assets/site.js."""
import sys, os, json, numpy as np
from PIL import Image
src, dst, ids = sys.argv[1], sys.argv[2], sys.argv[3:]
PC = 10
table = {}
for h in ids:
    spin = [Image.open(f"{src}/{h}/{i:02d}.png").convert("RGBA") for i in range(24)]
    ne, ni = (int(x) for x in open(f"{src}/{h}/pose.txt").read().split()[:2])
    pose = [Image.open(f"{src}/{h}/pose/{i:02d}.png").convert("RGBA") for i in range(ne + ni)]
    bottom = max(np.where(np.asarray(f)[:, :, 3].max(1) > 20)[0].max() for f in spin + pose)
    dy = (900 - 8) - bottom
    def shift(f):
        g = Image.new("RGBA", f.size); g.paste(f, (0, dy)); return g
    sheet = Image.new("RGBA", (480 * 6, 600 * 4))
    for i, f in enumerate(spin):
        sheet.paste(shift(f).resize((480, 600), Image.LANCZOS), ((i % 6) * 480, (i // 6) * 600))
    sheet.save(f"{dst}/{h}-spin.webp", "WEBP", quality=80, method=6)
    shift(pose[0]).resize((480, 600), Image.LANCZOS).save(f"{dst}/{h}.webp", "WEBP", quality=85, method=6)
    rows = -(-len(pose) // PC)
    ps = Image.new("RGBA", (360 * PC, 450 * rows))
    for i, f in enumerate(pose):
        ps.paste(shift(f).resize((360, 450), Image.LANCZOS), ((i % PC) * 360, (i // PC) * 450))
    ps.save(f"{dst}/{h}-pose.webp", "WEBP", quality=76, alpha_quality=60, method=6)
    table[h] = [ne, ni]
    print(h, "shift", dy, "pose", ne, ni, os.path.getsize(f"{dst}/{h}-pose.webp") // 1024, "KB", file=sys.stderr)
print("const POSE = " + json.dumps(table, separators=(", ", ": ")) + ";")
