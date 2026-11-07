"""Pack Godot turntable frames (dir/<id>/NN.png, 720x900) into the site's 6x4 sheets at 480x600 per frame,
with the stand's base shifted to sit on the frame floor. Usage: pack.py SRC_DIR DEST_DIR id [id ...]"""
import sys, numpy as np
from PIL import Image
src, dst, ids = sys.argv[1], sys.argv[2], sys.argv[3:]
for h in ids:
    fr = [Image.open(f"{src}/{h}/{i:02d}.png").convert("RGBA") for i in range(24)]
    bottom = max(np.where(np.asarray(f)[:, :, 3].max(1) > 20)[0].max() for f in fr)
    dy = (900 - 8) - bottom
    sheet = Image.new("RGBA", (480 * 6, 600 * 4))
    for i, f in enumerate(fr):
        g = Image.new("RGBA", f.size); g.paste(f, (0, dy))
        g = g.resize((480, 600), Image.LANCZOS)
        sheet.paste(g, ((i % 6) * 480, (i // 6) * 600))
        if i == 0: g.save(f"{dst}/{h}.webp", "WEBP", quality=85, method=6)
    sheet.save(f"{dst}/{h}-spin.webp", "WEBP", quality=80, method=6)
    print(h, "shift", dy)
