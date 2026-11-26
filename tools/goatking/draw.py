# 32차: 염소대왕 — 손으로 찍은 도트 (사진을 줄인 그림이 아니라 면·선·명암 몇 단으로)
# 12미터 거인이 흑요석 옥좌에 앉아 있다. 판관 관모 · 금테 두른 숫양 뿔 · 붉은 눈 · 검은 비단과 핏빛 관복 · 갈퀴 손
#   python3 tools/goatking/draw.py apps/web/public/npc/goat-king.png [미리보기.png] [--in] [--blink]
#   33차: --in = 숨을 들이쉰 그림(윗몸·머리가 2점 위로) · --blink = 눈을 감은 그림. 게임은 네 장을 번갈아 숨쉬고 깜빡인다
# 2배 밀도(게임 속 크기의 두 배)로 그린다: 440×580 → 게임 속 220×290
import sys, math
from PIL import Image, ImageDraw
import numpy as np

INHALE = '--in' in sys.argv
BLINK = '--blink' in sys.argv
sys.argv = [a for a in sys.argv if not a.startswith('--')]
LIFT = [0]  # 숨쉴 때 윗몸을 올리는 양 (점)

W, H = 440, 626
OY = 46  # 관모·뿔이 위로 커져서 전체를 아래로
CX = 220

C = {
    'ol': (14, 10, 11), 'ol2': (30, 18, 20),
    # 털
    'f0': (32, 22, 20), 'f1': (56, 40, 36), 'f2': (82, 60, 52), 'f3': (112, 86, 72), 'f4': (146, 116, 96),
    # 뿔
    'h0': (40, 24, 16), 'h1': (66, 42, 26), 'h2': (96, 64, 40), 'h3': (130, 92, 60), 'h4': (166, 124, 84),
    # 금
    'g0': (92, 60, 20), 'g1': (150, 104, 36), 'g2': (204, 156, 58), 'g3': (242, 206, 112),
    # 검은 비단
    'k0': (16, 12, 16), 'k1': (32, 24, 32), 'k2': (50, 38, 50), 'k3': (72, 58, 74),
    # 핏빛
    'r0': (60, 8, 14), 'r1': (104, 16, 24), 'r2': (148, 28, 34), 'r3': (190, 52, 52),
    # 눈 · 이빨 · 갈퀴
    'e0': (90, 6, 6), 'e1': (230, 36, 24), 'e2': (255, 150, 110), 'e3': (255, 236, 210),
    't0': (176, 162, 138), 't1': (232, 222, 200),
    'c0': (10, 8, 10), 'c1': (44, 38, 46), 'c2': (92, 84, 96),
    # 옥좌 흑요석 · 융단
    's0': (16, 14, 22), 's1': (32, 28, 42), 's2': (50, 44, 64), 's3': (74, 66, 92), 's4': (104, 96, 128),
    'v0': (60, 8, 14), 'v1': (96, 14, 22), 'v2': (128, 24, 32),
    # 귀 안쪽
    'p0': (70, 30, 36), 'p1': (104, 50, 54),
}
img = Image.new('RGBA', (W, H), (0, 0, 0, 0))
d = ImageDraw.Draw(img)


def col(k):
    return C[k] + (255,)


# 지금 그리는 무리의 좌표 변환 (머리 쪽은 크게)
XF = [None]


def tf(x, y):
    f = XF[0]
    x, y = f(x, y) if f else (x, y)
    return x, y + OY + LIFT[0]


def sc():
    return HK if XF[0] else 1.0


def poly(pts, k, ol=None, w=2):
    q = [tuple(round(v) for v in tf(x, y)) for x, y in pts]
    d.polygon(q, fill=col(k))
    if ol:
        d.line(q + [q[0]], fill=col(ol), width=w)


def rect(x0, y0, x1, y1, k):
    a, b = tf(x0, y0)
    c2, e = tf(x1, y1)
    d.rectangle([round(a), round(b), max(round(a), round(c2) - 1), max(round(b), round(e) - 1)], fill=col(k))


def line(pts, k, w=2):
    d.line([tuple(round(v) for v in tf(x, y)) for x, y in pts], fill=col(k), width=w)


def disc(x, y, r, k):
    x, y = tf(x, y)
    r *= sc()
    d.ellipse([round(x - r), round(y - r), round(x + r), round(y + r)], fill=col(k))


def px(x, y, k):
    x, y = tf(x, y)
    if 0 <= x < W and 0 <= y < H:
        img.putpixel((round(x), round(y)), col(k))


def mirror(pts):
    return [(2 * CX - x, y) for x, y in pts]


# 머리 쪽(머리·갈기·뿔·관모)은 크게: (CX, HY) 를 중심으로 HK 배
HY, HK = 172, 1.28
def head_xf(x, y):
    return (CX + (x - CX) * HK, HY + (y - HY) * HK)


def both(pts, k, ol=None, w=2):
    poly(pts, k, ol, w)
    poly(mirror(pts), k, ol, w)


def dither(x0, y0, x1, y1, k, phase=0, mask=None):
    """체크 무늬로 두 단 사이를 잇는다 (mask = 칠해도 되는 자리)"""
    for y in range(int(y0), int(y1)):
        for x in range(int(x0), int(x1)):
            if (x // 2 + y // 2 + phase) % 2:
                continue
            if mask is not None and not mask(x, y):
                continue
            img.putpixel((x, y + OY + LIFT[0]), col(k))


# ───────────────── 1) 옥좌 등받이 ─────────────────
back = [(92, 430), (92, 150), (118, 112), (150, 92), (182, 76), (220, 26), (258, 76), (290, 92), (322, 112), (348, 150), (348, 430)]
poly(back, 's1', 'ol', 3)
# 금테
inner = [(104, 430), (104, 156), (126, 124), (156, 106), (186, 92), (220, 50), (254, 92), (284, 106), (314, 124), (336, 156), (336, 430)]
poly(inner, 'g1')
inner2 = [(110, 430), (110, 160), (130, 130), (158, 113), (189, 99), (220, 62), (251, 99), (282, 113), (310, 130), (330, 160), (330, 430)]
poly(inner2, 's2')
# 붉은 융단 판 (단추로 눌러 박은 마름모 무늬)
vel = [(122, 430), (122, 168), (142, 142), (168, 128), (196, 116), (220, 90), (244, 116), (272, 128), (298, 142), (318, 168), (318, 430)]
poly(vel, 'v1')
vm = Image.new('L', (W, H), 0)
ImageDraw.Draw(vm).polygon(vel, fill=255)
vma = np.array(vm)
for y in range(90, 430):
    for x in range(122, 318):
        if not vma[y, x]:
            continue
        a, b = (x - CX + y) % 36, (CX - x + y) % 36
        if a < 2 or b < 2:
            px(x, y, 'v0')
        elif a < 4 or b < 4:
            pass
        elif (x // 2 + y // 2) % 2 == 0 and (a > 30 or b > 30):
            px(x, y, 'v2')
for y in range(108, 430, 36):
    for x in range(CX - 144, CX + 145, 36):
        for dx, dy in ((0, 0), (18, 18)):
            qx, qy = x + dx, y + dy
            if 0 <= qx < W and 0 <= qy < H and vma[qy, qx]:
                disc(qx, qy, 2, 'g2')
                px(qx - 1, qy - 1, 'g3')
# 왼쪽(빛) 테두리 밝게
line([(104, 430), (104, 156), (126, 124), (156, 106), (186, 92), (220, 50)], 'g2', 2)
# 기둥 끝 장식 (금 창끝)
for x in (92, 348):
    poly([(x - 10, 160), (x + 10, 160), (x + 6, 150), (x, 118), (x - 6, 150)], 'g1', 'ol', 2)
    line([(x - 4, 152), (x, 124)], 'g3', 2)
    disc(x, 166, 9, 'g1')
    disc(x - 2, 164, 4, 'g2')
# 꼭대기: 금빛 숫양 해골 문장
disc(CX, 46, 15, 'g1')
poly([(CX - 11, 36), (CX + 11, 36), (CX + 9, 56), (CX + 4, 64), (CX - 4, 64), (CX - 9, 56)], 'g2', 'ol', 2)
rect(CX - 8, 44, CX - 2, 50, 'ol'); rect(CX + 3, 44, CX + 9, 50, 'ol')
disc(CX - 5, 47, 1, 'e1'); disc(CX + 6, 47, 1, 'e1')
rect(CX - 2, 56, CX + 3, 60, 'g0')
for s in (-1, 1):
    pts = [(CX + s * (12 + 9 * math.cos(t)), 38 + 9 * math.sin(t) - 2) for t in np.linspace(-2.6, 1.6, 9)]
    line(pts, 'g2', 4)
    line(pts, 'g3', 1)

# ───────────────── 2) 앉는 자리 · 받침 ─────────────────
poly([(96, 420), (344, 420), (344, 540), (96, 540)], 's2', 'ol', 3)
rect(98, 422, 342, 428, 'g1'); rect(98, 422, 342, 424, 'g2')
for x in range(110, 336, 22):
    rect(x, 436, x + 14, 528, 's1')
    rect(x, 436, x + 2, 528, 's3')
# 받침 두 단
poly([(44, 540), (396, 540), (396, 556), (44, 556)], 's2', 'ol', 3)
rect(46, 541, 394, 545, 's4'); rect(46, 549, 394, 551, 'g1')
poly([(18, 556), (422, 556), (422, 578), (18, 578)], 's1', 'ol', 3)
rect(20, 557, 420, 561, 's3'); rect(20, 567, 420, 569, 'g0')
for x in range(40, 410, 46):
    rect(x, 562, x + 6, 576, 's0')

# ───────────────── 3) 팔걸이 ─────────────────
for s in (-1, 1):
    x0, x1 = (26, 106) if s < 0 else (334, 414)
    poly([(x0, 330), (x1, 330), (x1, 540), (x0, 540)], 's2', 'ol', 3)
    rect(x0 + 2, 332, x1 - 1, 346, 's4' if s < 0 else 's3')
    rect(x0 + 2, 346, x1 - 1, 350, 'g1')
    rect(x0 + 8, 360, x1 - 8, 530, 's1')
    rect(x0 + 8, 360, x0 + 11, 530, 's3' if s < 0 else 's2')
    # 앞머리: 금빛 숫양 머리 조각
    hx = x0 + 40 if s < 0 else x1 - 40
    hy = 462
    disc(hx, hy, 18, 'g1')
    disc(hx - 3, hy - 3, 11, 'g2')
    rect(hx - 7, hy - 2, hx - 3, hy + 2, 'ol'); rect(hx + 3, hy - 2, hx + 7, hy + 2, 'ol')
    line([(hx - 14, hy - 12), (hx - 24, hy - 4), (hx - 22, hy + 10), (hx - 14, hy + 12)], 'g2', 4)
    line([(hx + 14, hy - 12), (hx + 24, hy - 4), (hx + 22, hy + 10), (hx + 14, hy + 12)], 'g2', 4)
    line([(hx - 6, hy + 6), (hx, hy + 18), (hx + 6, hy + 6)], 'g0', 2)

# ───────────────── 4) 아랫도리: 무릎 · 정강이 · 굽 ─────────────────
lap = [(128, 330), (312, 330), (338, 408), (102, 408)]
poly(lap, 'k1', 'ol', 3)
# 무릎 위 앞섶: 금테 · 옆 핏빛 띠
for s2 in (-1, 1):
    poly([(CX + s2 * 92, 334), (CX + s2 * 74, 334), (CX + s2 * 84, 408), (CX + s2 * 104, 408)], 'r1', 'ol', 2)
    line([(CX + s2 * 74, 334), (CX + s2 * 84, 408)], 'g2', 2)
# 무릎 둘 (빛은 왼쪽 위)
for s, kx in ((-1, 160), (1, 280)):
    poly([(kx - 52, 356), (kx + 40, 356), (kx + 44, 408), (kx - 56, 408)] if s < 0 else [(kx - 40, 356), (kx + 52, 356), (kx + 56, 408), (kx - 44, 408)], 'k2')
    poly([(kx - 44, 362), (kx + 10, 362), (kx + 4, 372), (kx - 46, 372)] if s < 0 else [(kx - 16, 362), (kx + 34, 362), (kx + 36, 370), (kx - 18, 370)], 'k3')
rect(104, 404, 336, 410, 'g1'); rect(104, 404, 336, 406, 'g2')
for x in range(110, 334, 10):
    px(x, 407, 'g3')
# 정강이: 늘어진 옷자락
for s, kx in ((-1, 162), (1, 278)):
    sh = [(kx - 50, 404), (kx + 44, 404), (kx + 40, 512), (kx - 52, 512)] if s < 0 else [(kx - 44, 404), (kx + 50, 404), (kx + 52, 512), (kx - 40, 512)]
    poly(sh, 'k1', 'ol', 3)
    # 주름
    for k in range(4):
        fx = kx - 34 + k * 22
        line([(fx, 412), (fx + (2 if s < 0 else -2), 470), (fx + (4 if s < 0 else -4), 508)], 'k0', 2)
        line([(fx + 3, 414), (fx + 4, 460)], 'k2' if s < 0 else 'k1', 2)
    # 단 (금 수)
    rect(sh[3][0] + 2, 500, sh[2][0] - 1, 512, 'g1')
    for x in range(int(sh[3][0]) + 4, int(sh[2][0]) - 4, 8):
        rect(x, 503, x + 4, 509, 'g2')
        px(x + 1, 504, 'g3')
    rect(sh[3][0] + 2, 511, sh[2][0] - 1, 513, 'g0')
    # 굽 (갈라진 검은 발굽)
    hx = kx + (-4 if s < 0 else 4)
    # 털 발목 + 갈라진 검은 발굽 (옷자락 아래로 비죽)
    poly([(hx - 22, 508), (hx + 22, 508), (hx + 24, 520), (hx - 24, 520)], 'f1', 'ol', 2)
    for q in (-1, 1):
        poly([(hx + q * 2, 518), (hx + q * 30, 518), (hx + q * 34, 540), (hx + q * 2, 540)], 'c1', 'ol', 2)
        line([(hx + q * 8, 522), (hx + q * 26, 522)], 'c2', 2)
        line([(hx + q * 28, 524), (hx + q * 31, 536)], 'c2' if q < 0 else 'c1', 1)
# 앞자락 띠 (허리띠에서 무릎 사이로 늘어진 붉은 띠, 금 무늬 · 술)
poly([(CX - 20, 318), (CX + 20, 318), (CX + 24, 520), (CX - 24, 520)], 'r1', 'ol', 2)
rect(CX - 18, 320, CX - 12, 518, 'r2')
for y in range(334, 510, 26):
    poly([(CX, y), (CX + 9, y + 9), (CX, y + 18), (CX - 9, y + 9)], 'g1')
    disc(CX, y + 9, 3, 'r0')
    px(CX - 4, y + 5, 'g3')
for x in range(CX - 22, CX + 23, 6):
    line([(x, 520), (x, 532)], 'r2' if (x // 6) % 2 else 'r1', 3)
rect(CX - 24, 518, CX + 24, 522, 'g2')

# ───────────────── 5) 몸통: 관복 · 옷깃 · 허리띠 · 장식 ─────────────────
LIFT[0] = -2 if INHALE else 0
torso = [(122, 208), (318, 208), (312, 280), (300, 334), (140, 334), (128, 280)]
poly(torso, 'k1', 'ol', 3)
# 관복 옆판 (핏빛 · 금테) — 검은 비단과 핏빛이 겹친 판관복
for s2 in (-1, 1):
    pnl = [(CX + s2 * 98, 230), (CX + s2 * 80, 230), (CX + s2 * 76, 334), (CX + s2 * 94, 334)]
    poly(pnl, 'r2' if s2 < 0 else 'r1', 'ol', 2)
    line([(CX + s2 * 80, 230), (CX + s2 * 76, 334)], 'g2', 2)
    for y in range(240, 330, 12):
        px(CX + s2 * 88, y, 'g2'); px(CX + s2 * 88, y + 1, 'g1')
# 가운데 속옷(더 검게) + 가슴판
poly([(176, 208), (264, 208), (240, 300), (200, 300)], 'k0')
# 옷깃 (핏빛, 금테) — 왼쪽이 빛
for s in (-1, 1):
    a = [(CX + s * 70, 206), (CX + s * 48, 206), (CX + s * 12, 300), (CX + s * 30, 300)]
    poly(a, 'r2' if s < 0 else 'r1', 'ol', 2)
    line([(CX + s * 70, 206), (CX + s * 30, 300)], 'g2', 3)
    line([(CX + s * 48, 206), (CX + s * 12, 300)], 'g1', 2)
    for t in np.linspace(0.1, 0.9, 7):
        x = CX + s * (60 - 40 * t)
        y = 206 + 94 * t
        px(round(x), round(y), 'g3')
# 어깨 빛 · 그늘
poly([(126, 214), (150, 210), (146, 250), (130, 270)], 'k2')
dither(130, 214, 152, 270, 'k3', mask=lambda x, y: x < 150 - (y - 214) * 0.2)
poly([(312, 214), (296, 210), (300, 260), (310, 270)], 'k0')
# 허리띠: 금 · 가운데 숫양 해골 버클
rect(136, 300, 306, 322, 'g1')
rect(136, 300, 306, 304, 'g2')
rect(136, 318, 306, 322, 'g0')
for x in range(142, 302, 12):
    rect(x, 307, x + 6, 315, 'r1')
    px(x + 1, 308, 'r3')
disc(CX, 311, 16, 'g0')
disc(CX, 310, 14, 'g2')
poly([(CX - 8, 302), (CX + 8, 302), (CX + 7, 314), (CX + 3, 320), (CX - 3, 320), (CX - 7, 314)], 'g3', 'g0', 1)
rect(CX - 6, 307, CX - 1, 311, 'ol'); rect(CX + 2, 307, CX + 7, 311, 'ol')
line([(CX - 12, 304), (CX - 18, 300), (CX - 18, 312)], 'g3', 2)
line([(CX + 12, 304), (CX + 18, 300), (CX + 18, 312)], 'g3', 2)
# 가슴의 메달 둘 + 붉은 술
for mx in (172, 268):
    disc(mx, 246, 12, 'g0')
    disc(mx, 245, 10, 'g2')
    disc(mx, 245, 5, 'r1')
    px(mx - 3, 242, 'g3'); px(mx - 4, 243, 'g3')
    line([(mx, 257), (mx, 266)], 'g1', 2)
    poly([(mx - 5, 266), (mx + 5, 266), (mx + 6, 290), (mx - 6, 290)], 'r2', 'ol', 1)
    line([(mx - 2, 268), (mx - 2, 288)], 'r3', 1)
# 메달을 잇는 금 사슬
for t in np.linspace(0, 1, 15):
    x = 182 + 76 * t
    y = 250 + 12 * math.sin(math.pi * t)
    disc(x, y, 1.5, 'g1' if int(t * 14) % 2 else 'g2')

# ───────────────── 6) 갈기 · 머리 · 수염 ─────────────────
XF[0] = head_xf
mane = [(152, 118), (172, 104), (268, 104), (288, 118), (296, 150), (300, 178), (312, 200), (292, 196), (294, 218), (274, 204), (266, 226), (252, 208), (238, 232), (220, 212), (202, 232), (188, 208), (174, 226), (166, 204), (146, 218), (148, 196), (128, 200), (140, 178), (144, 150)]
poly(mane, 'f1', 'ol', 3)
# 갈기 결: 빛 받는 왼쪽은 밝은 털끝, 오른쪽은 그늘. 털 다발마다 세 단
for k in range(40):
    x = 148 + (k * 37) % 146
    y = 118 + (k * 53) % 96
    if (x - CX) ** 2 / 4900 + (y - 150) ** 2 / 2500 < 0.55:
        continue
    left = x < CX
    s2 = -1 if left else 1
    # 털 다발: 아래로 뾰족한 작은 세모 (빛 쪽은 밝은 등, 그늘 쪽은 어둡게)
    poly([(x - 4, y), (x + 4, y), (x + s2 * 3, y + 12)], 'f2' if left else ('f0' if k % 2 else 'f1'))
    line([(x - 3 * s2, y + 1), (x + s2 * 2, y + 9)], 'f3' if left else 'f1', 1)
# 털끝 (아래 가장자리 뾰족한 끝을 밝게)
for (x, y) in [(166, 204), (188, 208), (202, 232), (174, 226), (146, 218), (128, 200), (148, 196)]:
    line([(x, y - 10), (x, y - 2)], 'f3', 2)
# 귀 (옆으로 뻗은 염소 귀)

# 머리 (긴 주둥이)
head = [(192, 96), (248, 96), (258, 118), (254, 140), (244, 160), (238, 178), (230, 190), (210, 190), (202, 178), (196, 160), (186, 140), (182, 118)]
poly(head, 'f2', 'ol', 3)
# 명암: 이마·콧등 밝게(왼쪽 위 빛), 오른쪽 뺨 그늘
poly([(196, 100), (222, 100), (220, 150), (214, 176), (206, 172), (198, 150), (188, 126)], 'f3')
poly([(204, 104), (218, 104), (216, 140), (210, 156), (206, 140)], 'f4')
poly([(246, 112), (254, 120), (250, 142), (240, 162), (236, 150), (242, 128)], 'f1')
for k in range(6):
    line([(240 + k * 2, 112 + k * 6), (236 + k * 2, 160)], 'f0' if k % 2 else 'f1', 2)
# 성난 눈썹뼈 (V자)
poly([(186, 120), (206, 126), (214, 132), (212, 136), (204, 132), (188, 128)], 'f0')
poly(mirror([(186, 120), (206, 126), (214, 132), (212, 136), (204, 132), (188, 128)]), 'f0')
# 붉은 눈 (가로 동공, 빛이 번진다)
for s in (-1, 1):
    ex = CX + s * 16
    poly([(ex - 9, 132), (ex + 7, 134), (ex + 6, 140), (ex - 7, 139)] if s < 0 else [(ex - 7, 134), (ex + 9, 132), (ex + 7, 139), (ex - 6, 140)], 'e0')
    if BLINK:  # 감은 눈: 털 눈꺼풀과 붉은 실금 하나
        poly([(ex - 9, 132), (ex + 7, 134), (ex + 6, 140), (ex - 7, 139)] if s < 0 else [(ex - 7, 134), (ex + 9, 132), (ex + 7, 139), (ex - 6, 140)], 'f1')
        line([(ex - 7, 138), (ex + 6, 138)], 'e0', 1)
        continue
    rect(ex - 6, 134, ex + 6, 139, 'e1')
    rect(ex - 4, 136, ex + 4, 138, 'e2')
    rect(ex - 3, 136, ex + 3, 137, 'ol')  # 가로 동공
    px(ex - 5, 135, 'e3')
# 콧구멍 · 입 · 송곳니
rect(CX - 12, 180, CX - 6, 184, 'f0'); rect(CX + 6, 180, CX + 12, 184, 'f0')
line([(CX - 18, 170), (CX - 8, 174), (CX + 8, 174), (CX + 18, 170)], 'ol', 2)
poly([(CX - 13, 171), (CX - 9, 172), (CX - 11, 181)], 't1')
poly([(CX + 13, 171), (CX + 9, 172), (CX + 11, 181)], 't1')
px(CX + 11, 179, 't0')
# 수염 (땋아 내린 염소수염 · 금고리)
beard = [(206, 186), (234, 186), (232, 214), (228, 246), (222, 268), (218, 268), (212, 246), (208, 214)]
poly(beard, 'f1', 'ol', 2)
for k in range(5):
    y = 192 + k * 14
    line([(212, y), (226, y + 8)], 'f0', 2)
    line([(214, y + 2), (220, y + 5)], 'f3', 1)
rect(210, 232, 231, 241, 'g1'); rect(210, 232, 231, 234, 'g3'); rect(210, 239, 231, 241, 'g0')

# ───────────────── 7) 숫양 뿔 (금 고리 둘) ─────────────────
def horn(s):
    # 중심선: 머리 위에서 바깥 위로 → 둥글게 내려와 → 안쪽으로 말린다
    P = [(200, 88), (180, 72), (150, 62), (118, 66), (94, 84), (82, 110), (86, 136), (102, 152), (120, 154), (128, 142), (124, 130)]
    if s > 0:
        P = mirror(P)
    pts = []
    for a, b in zip(P, P[1:]):
        for t in np.linspace(0, 1, 9, endpoint=False):
            pts.append((a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t))
    pts.append(P[-1])
    n = len(pts)
    R = lambda k: (11 + 4 * min(1, k / (n * 0.15))) * (1 - 0.66 * k / n)  # 밑동은 왕관띠 뒤에서 굵어졌다가 끝으로 가늘게
    for k, (x, y) in enumerate(pts):  # 테두리
        disc(x, y, R(k) + 2, 'ol')
    for k, (x, y) in enumerate(pts):
        disc(x, y, R(k), 'h1')
    for k, (x, y) in enumerate(pts):  # 위쪽(빛) 밝게
        r = R(k)
        disc(x - 1, y - r * 0.35, r * 0.6, 'h2')
    for k, (x, y) in enumerate(pts):
        r = R(k)
        if k % 3 == 0:
            disc(x - 1, y - r * 0.5, max(1, r * 0.25), 'h3')
    # 마디 (가로 홈)
    for k in range(4, n - 2, 5):
        (x, y), (x2, y2) = pts[k], pts[k + 1]
        dx, dy = x2 - x, y2 - y
        L = math.hypot(dx, dy) or 1
        nx, ny = -dy / L, dx / L
        r = R(k)
        line([(x - nx * r, y - ny * r), (x + nx * r, y + ny * r)], 'h0', 2)
    # 금 고리 둘
    for frac in (0.3, 0.62):
        k = int(n * frac)
        x, y = pts[k]
        r = R(k)
        x2, y2 = pts[k + 2]
        dx, dy = x2 - x, y2 - y
        L = math.hypot(dx, dy) or 1
        nx, ny = -dy / L, dx / L
        for w2, kk in ((r + 3, 'ol'), (r + 1, 'g1')):
            poly([(x - nx * w2 - dx * 0.5, y - ny * w2 - dy * 0.5), (x + nx * w2 - dx * 0.5, y + ny * w2 - dy * 0.5), (x + nx * w2 + dx * 0.9, y + ny * w2 + dy * 0.9), (x - nx * w2 + dx * 0.9, y - ny * w2 + dy * 0.9)], kk)
        line([(x - nx * r, y - ny * r), (x + nx * r, y + ny * r)], 'g3', 2)


horn(-1)
horn(1)
# 귀: 뿔 아래로 옆으로 처진 염소 귀 (뿔 안쪽 고리 앞)
ear2 = [(190, 140), (166, 142), (142, 152), (130, 162), (150, 162), (176, 156), (192, 152)]
both(ear2, 'f2', 'ol', 2)
inn = [(184, 145), (164, 147), (146, 155), (160, 157), (184, 151)]
poly(inn, 'p0'); poly(mirror(inn), 'p0')
line([(180, 148), (156, 152)], 'p1', 1)
line([(168, 143), (140, 155)], 'f3', 1)

# ───────────────── 8) 판관 관모 · 앞술 · 옆 패 ─────────────────
# 관모 몸통 (검은 비단 · 붉은 앞판 · 금테)
poly([(194, 36), (246, 36), (252, 84), (188, 84)], 'k1', 'ol', 3)
poly([(206, 42), (234, 42), (236, 80), (204, 80)], 'r1')
rect(208, 44, 214, 78, 'r2')
for y in range(48, 78, 10):
    poly([(CX, y), (CX + 6, y + 4), (CX, y + 8), (CX - 6, y + 4)], 'g2')
# 위 판 (넓은 평천판)
poly([(174, 26), (266, 26), (262, 36), (178, 36)], 'k2', 'ol', 2)
rect(176, 27, 264, 29, 'g2')
# 금 관띠 · 보석
poly([(184, 80), (256, 80), (258, 98), (182, 98)], 'g1', 'ol', 2)
rect(185, 82, 255, 85, 'g3')
for x in range(190, 252, 12):
    disc(x, 91, 3, 'r2')
    px(x - 1, 90, 'r3')
disc(CX, 90, 6, 'g0'); disc(CX, 90, 4, 'e1'); px(CX - 1, 88, 'e3')
# 앞술: 평천판 앞에서 늘어진 붉은 구슬 줄 (이마 위까지)
for x in range(180, 262, 8):
    L = 10 + (x * 7) % 9
    for k in range(0, L, 4):
        y = 37 + k
        if 80 <= y <= 98 and 182 <= x <= 258:
            continue
        disc(x, y, 1.5, 'r2' if k % 8 else 'g2')
# 왼쪽 옆 패: 금 사슬 끝의 판 + 붉은 술
for y in range(96, 150, 5):
    disc(150 + (y - 96) * 0.06, y, 1.5, 'g1')
poly([(144, 148), (160, 148), (160, 170), (152, 176), (144, 170)], 'g1', 'ol', 2)
rect(147, 152, 157, 166, 'r1')
px(148, 153, 'r3')
for x in range(146, 160, 3):
    line([(x, 176), (x, 196)], 'r2', 2)

XF[0] = None

# ───────────────── 9) 소매 · 손 · 갈퀴 (팔걸이 위) ─────────────────
for s in (-1, 1):
    LIFT[0] = -2 if INHALE else 0
    sl = [(124, 206), (152, 222), (142, 270), (118, 318), (112, 336), (50, 336), (54, 300), (78, 250), (98, 220)]
    if s > 0:
        sl = mirror(sl)
    poly(sl, 'k2' if s < 0 else 'k1', 'ol', 3)
    # 소매 주름 · 빛
    if s < 0:
        line([(100, 226), (76, 290)], 'k3', 3)
        line([(116, 232), (98, 300)], 'k1', 2)
        dither(56, 250, 100, 330, 'k3', mask=lambda x, y: x < 70 + (y - 250) * -0.15 + 20 and x > 52)
    else:
        line([(340, 226), (364, 290)], 'k0', 3)
        line([(324, 232), (342, 300)], 'k0', 2)
    # 소맷부리: 금 수 + 붉은 안감
    cuff = [(52, 316), (114, 316), (112, 338), (50, 338)]
    if s > 0:
        cuff = mirror(cuff)
    poly(cuff, 'r1', 'ol', 2)
    xs = sorted(p[0] for p in cuff)
    rect(xs[0] + 2, 316, xs[-1] - 1, 322, 'g1')
    rect(xs[0] + 2, 316, xs[-1] - 1, 318, 'g3' if s < 0 else 'g2')
    for x in range(int(xs[0]) + 6, int(xs[-1]) - 4, 9):
        px(x, 320, 'g0')
    LIFT[0] = 0  # 손은 팔걸이에 그대로
    # 손: 팔걸이 위에 얹은 털 손 · 손가락이 앞으로 넘어와 갈퀴가 아래로
    hx = 68 if s < 0 else 372
    lit = s < 0
    poly([(hx - 38, 330), (hx + 38, 330), (hx + 40, 354), (hx - 40, 354)], 'f2' if lit else 'f1', 'ol', 2)
    line([(hx - 34, 334), (hx + 20, 334)], 'f3' if lit else 'f2', 2)
    for k in range(4):
        fx = hx - 30 + k * 20
        poly([(fx - 8, 350), (fx + 8, 350), (fx + 7, 380), (fx - 7, 380)], 'f2' if lit else 'f1', 'ol', 2)
        line([(fx - 4, 354), (fx - 4, 376)], 'f3' if lit else 'f2', 2)
        line([(fx - 7, 364), (fx + 7, 364)], 'f0', 1)  # 마디
        # 갈퀴 (길고 검게, 끝이 아래로 휜다)
        poly([(fx - 6, 379), (fx + 6, 379), (fx + 3, 400), (fx - 1, 412), (fx - 3, 400)], 'c0', 'ol', 1)
        line([(fx - 3, 382), (fx - 2, 402)], 'c2', 1)
        if k in (1, 2):
            rect(fx - 8, 357, fx + 8, 363, 'g1')
            rect(fx - 8, 357, fx + 8, 358, 'g3')
    # 엄지
    tx = hx + (40 if s < 0 else -40)
    poly([(tx - 8, 334), (tx + 8, 334), (tx + 6, 362), (tx - 6, 362)], 'f1', 'ol', 2)
    poly([(tx - 5, 361), (tx + 5, 361), (tx, 380)], 'c0', 'ol', 1)

# ───────────────── 10) 외곽 · 붉은 테두리빛 (화로) ─────────────────
a = np.array(img)
alpha = a[:, :, 3] > 0
# 바깥 외곽선 2px
grow = alpha.copy()
for dy in (-2, -1, 0, 1, 2):
    for dx in (-2, -1, 0, 1, 2):
        if abs(dx) + abs(dy) > 3:
            continue
        grow |= np.roll(np.roll(alpha, dy, 0), dx, 1)
edge = grow & ~alpha
a[edge] = C['ol'] + (255,)
# 오른쪽에서 비치는 화로 불빛: 오른쪽이 비어 있는 점을 붉게
rim = alpha & ~np.roll(alpha, -3, 1)
rim[:, :CX] = False
for y, x in zip(*np.nonzero(rim)):
    r, g, b, _ = a[y, x]
    if (int(r) + int(g) + int(b)) < 60:  # 외곽선은 그대로
        continue
    a[y, x] = (min(255, int(r * 0.6 + 120)), int(g * 0.55 + 10), int(b * 0.5 + 8), 255)
img = Image.fromarray(a)

out = sys.argv[1] if len(sys.argv) > 1 else '/tmp/goat-king.png'
img.save(out)
if len(sys.argv) > 2:
    bg = Image.new('RGBA', (W * 2 + 40, H * 2), (54, 28, 30, 255))
    big = img.resize((W * 2, H * 2), Image.NEAREST)
    bg.paste(big, (0, 0), big)
    small = img.resize((W // 2, H // 2), Image.NEAREST)
    bg.paste(small, (W * 2 - W // 2 + 30, H * 2 - H // 2 - 10), small)
    bg.save(sys.argv[2])
print('saved', out, img.size)
