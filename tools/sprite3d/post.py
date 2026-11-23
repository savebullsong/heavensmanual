"""렌더 결과를 게임용 도트로: 축소 → 투명도 자르기 → 공용 팔레트 → 선택적 외곽선
사용법: python3 post.py <렌더폴더> <출력폴더> [배율=4] [색수=40]"""
import sys, os, glob
from PIL import Image

src, dst = sys.argv[1], sys.argv[2]
ss = int(sys.argv[3]) if len(sys.argv) > 3 else 4
ncol = int(sys.argv[4]) if len(sys.argv) > 4 else 40
os.makedirs(dst, exist_ok=True)
files = sorted(glob.glob(f'{src}/*.png'))

def shrink(im):
    if ss == 1: return im
    return im.convert('RGBa').resize((im.width // ss, im.height // ss), Image.BOX).convert('RGBA')

def cut_alpha(im):
    px = im.load()
    for y in range(im.height):
        for x in range(im.width):
            r, g, b, a = px[x, y]
            px[x, y] = (r, g, b, 255) if a >= 110 else (0, 0, 0, 0)
    return im

frames = {f: cut_alpha(shrink(Image.open(f).convert('RGBA'))) for f in files}
# 모든 장면이 같은 팔레트를 쓰도록 (장면마다 색이 흔들리지 않게)
W, H = next(iter(frames.values())).size
cols = 8; rows = (len(frames) + cols - 1) // cols
big = Image.new('RGB', (W * cols, H * rows), (0, 0, 0))
mask = Image.new('L', big.size, 0)
for i, im in enumerate(frames.values()):
    big.paste(im.convert('RGB'), ((i % cols) * W, (i // cols) * H)); mask.paste(im.getchannel('A'), ((i % cols) * W, (i // cols) * H))
opaque = [big.getpixel((x, y)) for y in range(big.height) for x in range(big.width) if mask.getpixel((x, y))]
sample = Image.new('RGB', (len(opaque), 1)); sample.putdata(opaque)
pal = sample.quantize(colors=ncol, method=Image.Quantize.MEDIANCUT)

def outline(im):
    px = im.load(); w, h = im.size; add = []
    for y in range(h):
        for x in range(w):
            if px[x, y][3]: continue
            nb = [px[x + dx, y + dy] for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)) if 0 <= x + dx < w and 0 <= y + dy < h and px[x + dx, y + dy][3]]
            if nb:
                r, g, b, _ = min(nb, key=lambda c: c[0] + c[1] + c[2])
                add.append((x, y, (int(r * .32) + 8, int(g * .30) + 6, int(b * .30) + 6, 255)))
    for x, y, c in add: px[x, y] = c
    return im

for f, im in frames.items():
    a = im.getchannel('A')
    q = im.convert('RGB').quantize(palette=pal, dither=Image.Dither.NONE).convert('RGB').convert('RGBA')
    q.putalpha(a)
    outline(q).save(os.path.join(dst, os.path.basename(f)))
print('ok', len(frames), 'frames', W, 'x', H)
