import json, sys
from PIL import Image

d = json.load(open(sys.argv[1]))
W, H, rows = d["W"], d["H"], d["rows"]
s = int(sys.argv[3]) if len(sys.argv) > 3 else 3
gap = 6
cols = max(len(r) for r in rows)
img = Image.new("RGB", (cols * (W * s + gap) + 120, len(rows) * (H * s + gap)), (58, 64, 50))


def paste(px, w, h, ox, oy):
    for i, c in enumerate(px):
        if c is None:
            continue
        x, y = i % w, i // w
        rgb = tuple(int(c[j:j + 2], 16) for j in (1, 3, 5))
        for dy in range(s):
            for dx in range(s):
                img.putpixel((ox + x * s + dx, oy + y * s + dy), rgb)


for ri, row in enumerate(rows):
    for ci, px in enumerate(row):
        paste(px, W, H, ci * (W * s + gap), ri * (H * s + gap))
for pi, px in enumerate(d["parrot"]):
    paste(px, 32, 40, cols * (W * s + gap) + 10, pi * 130 + 10)
img.save(sys.argv[2])
