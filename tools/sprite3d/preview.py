"""구운 층을 게임처럼 합쳐 본다 (색 입히기 + 외곽선). 런타임(sprites.ts)과 같은 규칙.
사용법: python3 preview.py <폴더> <출력.png> base hair weapon [anim...]"""
import sys, json
import numpy as np
from PIL import Image
D = sys.argv[1]; OUT = sys.argv[2]
FOOT = (48, 82)
def load(key):
    if key in ('', '-'): return None
    im = np.asarray(Image.open(f'{D}/{key}.png').convert('LA')); meta = json.load(open(f'{D}/{key}.json'))
    return im, meta
def hexc(h): return np.array([int(h[i:i + 2], 16) for i in (1, 3, 5)], np.float32) / 255
COL = {1: '#d29f72', 2: '#2a1f1a', 3: '#8a3030', 4: '#34455f', 5: '#3a332e', 6: '#1a1210', 7: '#b49c74', 8: '#c9a53c', 9: '#a3b7c6', 10: '#eeebe2', 11: '#efede4', 12: '#efc63a', 13: '#c49a66', 14: '#9aa3ad', 15: '#2a2624'}
def ramp(c, lv):
    f = lv / 11.0
    c = hexc(c)
    if f <= 1:
        f = f ** 1.6
        out = c * f
        cool = np.array([.82, .86, 1.1]); out = out * (1 - (1 - f) * .5) + out * cool * (1 - f) * .5
    else:
        out = c + (1 - c) * (f - 1) * 1.4
    return np.clip(out, 0, 1)
LUT = {rid: np.stack([ramp(COL[rid], lv) for lv in range(16)]) for rid in COL}
def compose(layers, name):
    cell = np.zeros((100, 96, 4), np.float32)
    for lay in layers:
        if lay is None: continue
        im, meta = lay
        r = meta.get(name)
        if not r: continue
        x, y, w, h, ox, oy = r
        sub = im[y:y + h, x:x + w]
        L = sub[..., 0].astype(int); A = sub[..., 1] > 0
        rid = L >> 4; lv = L & 15
        rgb = np.zeros((h, w, 3), np.float32)
        for k in np.unique(rid[A]):
            m = A & (rid == k); rgb[m] = LUT[int(k)][lv[m]]
        X, Y = FOOT[0] + ox, FOOT[1] + oy
        dst = cell[Y:Y + h, X:X + w]
        dst[A, :3] = rgb[A]; dst[A, 3] = 1
    # 선택적 외곽선
    a = cell[..., 3] > 0
    out = cell.copy()
    for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
        nb = np.roll(np.roll(a, dy, 0), dx, 1)
        nbc = np.roll(np.roll(cell, dy, 0), dx, 1)
        m = ~a & nb & (out[..., 3] == 0)
        out[m, :3] = nbc[m, :3] * .3 + .03; out[m, 3] = 1
    return (out * 255).astype(np.uint8)
layers = [load(k) for k in sys.argv[3:6]]
anims = sys.argv[6:] or ['idle-se-0']
frames = []
names = list(layers[0][1].keys())
for pat in anims:
    frames += [n for n in names if n.startswith(pat)]
cols = 8; rows = (len(frames) + cols - 1) // cols
sheet = Image.new('RGBA', (96 * cols, 100 * rows), (64, 66, 72, 255))
for i, n in enumerate(frames):
    sheet.alpha_composite(Image.fromarray(compose(layers, n), 'RGBA'), ((i % cols) * 96, (i // cols) * 100))
sheet = sheet.resize((sheet.width * 2, sheet.height * 2), Image.NEAREST)
sheet.save(OUT); print(len(frames), 'frames', sheet.size)
