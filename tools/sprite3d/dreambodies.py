"""37차: 서큐버스(지옥 휴식 마을의 장사꾼)와 아큐버스(천국 1층에 사는 이) — 사용자 컨셉 그림 두 장.
서큐버스: 보랏빛 도는 검은 긴 머리, 뒤로 휘어 감기는 뿔, 붉은 눈, 검은 레이스 코르셋과 어깨를 드러낸 깃,
          나팔 소매, 바닥까지 끌리는 진홍 치마 위로 앞이 트인 검은 레이스 겉치마, 허리에 늘어진 은사슬, 초커와 붉은 보석.
          (박쥐 날개 · 스페이드 꼬리는 게임이 따로 붙여 퍼덕이고 살랑이게 한다)
아큐버스: 은빛 긴 머리, 머리 위에 뜬 금빛 고리, 흰 드레스에 금실 무늬(목선 · 허리 · 밑단 · 앞섶의 덩굴), 가슴의 별 브로치.
          남자는 발목까지 오는 흰 긴 옷에 금 띠 · 어깨에서 가슴으로 걸친 금빛 영대. (흰 깃털 날개는 게임이 붙인다)
색은 게임이 입힌다 — 살 1 · 머리 2 · 윗옷 3 · 치마 4 · 신 5 · 눈 6 · 안감 9 · 뿔 13 · 금속 14 · 빛 12 · 레이스 15"""
import math
from mathutils import Vector
from rig import Part, loft, limb, blob, finish, bind, smooth, rigid, autow


def rmat(*a, **k):
    import body
    return body.rmat(*a, **k)


def _spine_w(s):
    return lambda co: {'spine': smooth(co.z, .98 * s, 1.12 * s), 'hips': 1 - smooth(co.z, .98 * s, 1.12 * s)}


def arcloft(P, rings, m, a0, a1, segs=14):
    """앞이 트인 천처럼 둘레의 일부(a0→a1, 라디안)만 잇는다. rings: [(center, r_side, r_fwd)]"""
    bm = P.bm; loops = []
    for c, rs, rf in rings:
        row = []
        for i in range(segs + 1):
            t = a0 + (a1 - a0) * i / segs
            row.append(bm.verts.new(c + Vector((rs * math.cos(t), -rf * math.sin(t), 0))))
        loops.append(row)
    mi = P.mat_index(m)
    for r0, r1 in zip(loops, loops[1:]):
        for i in range(segs):
            f = bm.faces.new([r0[i], r0[i + 1], r1[i + 1], r1[i]]); f.material_index = mi


def _interp(table, z):
    """(z, rx, ry) 표에서 z 높이의 반지름 (위에서 아래로 정렬)"""
    for (z0, a0, b0), (z1, a1, b1) in zip(table, table[1:]):
        if z1 <= z <= z0:
            t = (z0 - z) / (z0 - z1)
            return a0 + (a1 - a0) * t, b0 + (b1 - b0) * t
    return table[-1][1], table[-1][2]


def gown_w(self):
    """치맛자락은 아래로 갈수록 다리를 따라간다 (왼쪽 자락은 왼다리, 오른쪽은 오른다리) — 걸을 때 다리가 천을 밀어낸다"""
    s = self.s
    def f(co):
        h = (1 - smooth(co.z, .3 * s, .98 * s)) * .65
        wl = smooth(co.x, -.07 * s, .07 * s)
        return {'hips': 1 - h, 'thigh.L': h * wl, 'thigh.R': h * (1 - wl)}
    return f


def _skirt(self, g, table, m, trim=None, trim_z=None, bind_w=None, cy=.01):
    """허리에서 바닥까지 끌리는 치마 (엉덩이를 따라 흔들린다)"""
    s, V = self.s, self.V
    P = Part(g + '.skirt')
    rings = [(V(0, cy, z), Vector((0, -1, 0)), Vector((1, 0, 0)), rx * s, ry * s) for z, rx, ry in table]
    loft(P, rings, m, None, segs=20, caps=(False, False))
    if trim is not None:   # 밑단 띠
        z0 = trim_z
        a0, b0 = _interp(table, z0); a1, b1 = _interp(table, table[-1][0])
        loft(P, [(V(0, cy, z0), Vector((0, -1, 0)), Vector((1, 0, 0)), a0 * s + .006, b0 * s + .006),
                 (V(0, cy, table[-1][0] - .005), Vector((0, -1, 0)), Vector((1, 0, 0)), a1 * s + .008, b1 * s + .008)], trim, None, segs=20, caps=(False, False))
    ob = finish(P); bind(ob, self.arm, bind_w or gown_w(self)); self.add(g, ob)
    return table


def _head_tools(self):
    """머리에 붙는 것들은 머리 크기(hk)만큼 키운 자리에"""
    s = self.s
    hc = self.V(0, -.005, 1.615)
    hc2 = hc + Vector((0, 0, (self.hk - 1) * .10 * s))
    return hc, (lambda p: hc2 + (p - hc) * self.hk)


def _long_hair(self, g, hm, length_z, front=True, width=1.0):
    """정수리부터 허리(또는 엉덩이)까지 내려오는 긴 머리: 머리 덮개 + 등판 두 갈래 + 앞으로 넘긴 두 가닥"""
    s, V = self.s, self.V
    hc0, hs = _head_tools(self)
    R = (.101 * s, .114 * s, .128 * s)
    P = Part(g + '.haircap')
    blob(P, V(0, .006, 1.632), (R[0] * 1.05, R[1] * 1.03, R[2] * 1.02), hm, None, segs=16, rings=12,
         cut=lambda co: (co.y < -.03 * s and co.z < 1.668 * s and abs(co.x) < .076 * s) or co.z < 1.49 * s or (co.y < -.06 * s and co.z < 1.585 * s))
    blob(P, V(-.03, -.07, 1.705), (.06 * s, .05 * s, .03 * s), hm, None, segs=10, rings=7)   # 이마로 비스듬히 넘긴 앞머리
    limb(P, V(0, .05, 1.64), V(0, .075, 1.40), [(0, .104 * s * width, .078 * s), (.6, .108 * s * width, .06 * s), (1, .104 * s * width, .05 * s)], hm, None, segs=12)
    ob = finish(P); self.scale_head(ob); bind(ob, self.arm, lambda co: {'head': 1.0}); self.add(g, ob)
    # 등으로 흘러내린 머리 (몸통을 따라 돈다): 끝이 갈라져 두 갈래, 길이가 조금 다르다
    P = Part(g + '.hairback')
    top = hs(V(0, .075, 1.42))
    for sx, dz in ((1, 0.0), (-1, .05)):
        limb(P, top + Vector((sx * .035 * s, 0, 0)), V(sx * .05, .13, length_z + dz),
             [(0, .07 * s * width, .045 * s), (.35, .075 * s * width, .038 * s), (.8, .062 * s * width, .028 * s), (1, .03 * s, .014 * s)], hm, None, segs=10)
    ob = finish(P); bind(ob, self.arm, lambda co: {'head': smooth(co.z, 1.36 * s, 1.46 * s), 'spine': 1 - smooth(co.z, 1.36 * s, 1.46 * s)}); self.add(g, ob)
    if front:   # 관자놀이에서 어깨 앞으로 넘어온 두 가닥 (가슴께까지)
        P = Part(g + '.hairfront')
        for sx in (1, -1):
            a = hs(V(sx * .082, -.035, 1.61))
            b = V(sx * .108, -.07, 1.36)
            c = V(sx * .118, -.1, 1.18)
            limb(P, a, b, [(0, .026 * s, .022 * s), (1, .03 * s, .02 * s)], hm, None, segs=8)
            limb(P, b, c, [(0, .03 * s, .02 * s), (1, .012 * s, .01 * s)], hm, None, segs=8)
        ob = finish(P); bind(ob, self.arm, lambda co: {'head': smooth(co.z, 1.42 * s, 1.52 * s), 'spine': 1 - smooth(co.z, 1.42 * s, 1.52 * s)}); self.add(g, ob)


def _sleeves(self, g, m, cuff_m, bell=1.0, start=.28, cuff_r=.085):
    """어깨를 드러낸 깃 아래로 시작하는 소매 — 손목에서 나팔처럼 벌어지고, 끝동은 안감 색"""
    am = self.p['arm'] * self.bw
    for k in 'LR':
        b = self.bones
        sh, el = b[f'upper_arm.{k}'][0], b[f'upper_arm.{k}'][1]
        wr = b[f'forearm.{k}'][1]
        P = Part(f'{g}.sleeve.{k}')
        limb(P, sh + (el - sh) * start, el, [(0, .064 * am, .066 * am), (1, .056 * am, .058 * am)], m, None, segs=10)
        if start <= .05: blob(P, sh + Vector((0, 0, .005)), (.07 * am, .066 * am, .066 * am), m, None, segs=10, rings=7)   # 어깨까지 덮는 소매
        blob(P, el, (.057 * am, .058 * am, .056 * am), m, None, segs=10, rings=7)
        limb(P, el, wr, [(0, .055 * am, .057 * am), (.55, .058 * am * bell, .06 * am * bell), (1, cuff_r * am * bell, cuff_r * am * bell)], m, None, segs=12, caps=(True, False))
        if cuff_m is not None:
            d = (wr - el)
            limb(P, wr - d * .06, wr + d * .1, [(0, cuff_r * am * bell + .004, cuff_r * am * bell + .004), (1, (cuff_r + .014) * am * bell, (cuff_r + .014) * am * bell)], cuff_m, None, segs=12, caps=(False, False))
        ob = finish(P); bind(ob, self.arm, autow(self.bones, ['spine', f'upper_arm.{k}', f'forearm.{k}'], power=5)); self.add(g, ob)


def _halo(self, g, gold):
    """머리 위에 뜬 금빛 고리 (조금 뒤로 기울었다)"""
    s = self.s
    hc0, hs = _head_tools(self)
    c = hs(self.V(0, .02, 1.79))
    P = Part(g + '.halo')
    n = 20; R = .088 * s; tilt = math.radians(18)
    pts = []
    for i in range(n + 1):
        a = 2 * math.pi * i / n
        x, y = math.cos(a) * R, math.sin(a) * R
        pts.append(c + Vector((x, y * math.cos(tilt), y * math.sin(tilt))))
    for p0, p1 in zip(pts, pts[1:]):
        limb(P, p0, p1, [(0, .011 * s, .011 * s), (1, .011 * s, .011 * s)], gold, None, segs=6)
    ob = finish(P); bind(ob, self.arm, lambda co: {'head': 1.0}, subsurf=0); self.add(g, ob)


def _star(P, c, r, m, core):
    """다섯 갈래 별 브로치 (가운데 빛나는 알)"""
    for i in range(5):
        a = math.pi / 2 + 2 * math.pi * i / 5
        tip = c + Vector((math.cos(a) * r, -.004, math.sin(a) * r))
        limb(P, c, tip, [(0, r * .34, .006), (1, r * .06, .004)], m, None, segs=5)
    blob(P, c + Vector((0, -.006, 0)), (r * .32, .006, r * .32), core, None, segs=8, rings=5)


# ─────────────────────────── 서큐버스 ───────────────────────────
def succubus(self, g):
    s, V = self.s, self.V
    bodice = rmat('top', .55, .4)       # 검은 비단 코르셋
    skirt = rmat('bottom', .65, .3)     # 진홍 치마
    lining = rmat('gown', .8, .15)      # 검붉은 안감 · 끝동
    lace = rmat('dark', .9, .06)        # 검은 레이스
    chain = rmat('metal', .25, .7, .85)  # 은사슬
    gem = rmat('crest', .2, .85)        # 붉은 보석
    horn = rmat('wood', .3, .6)         # 뿔
    hm = rmat('hair', .45, .5)
    skin = rmat('skin', .55, .35)
    sw = _spine_w(s)
    self.legs(g, lace, rmat('shoe', .35, .6), foot=.82)
    # 코르셋: 허리를 조이고, 가슴 위로는 살갗 (어깨를 드러낸 깃)
    def corset(rings):
        out = []
        for c, u, v, rs, rf in rings:
            z = c.z / s
            k = .88 if 1.0 < z < 1.2 else 1.0
            out.append((c, u, v, rs * k + .003, rf * k + .005))
        return out
    self.torso(g, skin, bodice, hem=1.315, extra=corset)
    self.head(g)
    self.arms(g, None); self.hands(g)
    _sleeves(self, g, lace, lining, bell=1.15)
    # 어깨를 두른 레이스 깃 (가슴 위 · 위팔을 감싸는 띠) + 가장자리 물결
    P = Part(g + '.collar')
    bw = self.bw
    for z0, z1, gr in ((1.30, 1.335, 1.0),):
        loft(P, [(V(0, -.012, z0), Vector((0, -1, 0)), Vector((1, 0, 0)), .19 * s * bw + .012, .118 * s + .01),
                 (V(0, -.01, z1), Vector((0, -1, 0)), Vector((1, 0, 0)), .2 * s * bw + .014, .112 * s + .01)], lace, None, segs=20, caps=(False, False))
    for i in range(16):   # 깃 아래 물결 (작은 레이스 송이)
        a = 2 * math.pi * i / 16
        blob(P, V(0, -.012, 1.296) + Vector((math.cos(a) * (.19 * s * bw + .014), -math.sin(a) * (.12 * s + .012), 0)), (.016 * s, .012 * s, .012 * s), lace, None, segs=6, rings=4)
    # 코르셋 앞의 진홍 끈 (엇갈려 묶은)
    for n in range(4):
        z = 1.08 + n * .05
        limb(P, V(-.03, -.1, z), V(.03, -.1, z + .04), [(0, .005, .004), (1, .005, .004)], skirt, None, segs=4)
        limb(P, V(.03, -.1, z), V(-.03, -.1, z + .04), [(0, .005, .004), (1, .005, .004)], skirt, None, segs=4)
    ob = finish(P); bind(ob, self.arm, sw); self.add(g, ob)
    # 초커 + 붉은 보석 + 늘어진 짧은 사슬
    P = Part(g + '.choker')
    limb(P, V(0, .005, 1.455), V(0, .005, 1.485), [(0, .055 * s, .053 * s), (1, .055 * s, .053 * s)], lace, None, segs=14, caps=(False, False))
    blob(P, V(0, -.052, 1.465), (.014 * s, .008 * s, .017 * s), gem, None, segs=8, rings=5)
    for n in range(4):
        blob(P, V(0, -.055 - n * .004, 1.44 - n * .028), (.007, .005, .01), chain, None, segs=6, rings=4)
    blob(P, V(0, -.07, 1.33), (.01 * s, .006 * s, .013 * s), gem, None, segs=6, rings=4)
    ob = finish(P); bind(ob, self.arm, lambda co: {'neck': smooth(co.z, 1.40 * s, 1.45 * s), 'spine': 1 - smooth(co.z, 1.40 * s, 1.45 * s)}); self.add(g, ob)
    # 치마: 진홍, 바닥까지 넓게 (밑단은 검은 레이스 띠)
    table = [(1.05, .118, .09), (.96, .162, .122), (.82, .19, .148), (.62, .218, .172), (.42, .243, .195), (.22, .268, .215), (.05, .3, .24)]
    _skirt(self, g, table, skirt, trim=lining, trim_z=.085)
    P = Part(g + '.hem')   # 밑단의 검은 레이스 물결
    for i in range(26):
        a = 2 * math.pi * i / 26
        blob(P, V(0, .01, .075) + Vector((math.cos(a) * (.296 * s + .01), -math.sin(a) * (.237 * s + .01), 0)), (.02 * s, .016 * s, .018 * s), lace, None, segs=6, rings=4)
    ob = finish(P); bind(ob, self.arm, gown_w(self), subsurf=0); self.add(g, ob)
    # 앞이 트인 검은 레이스 겉치마 (뒤와 옆을 덮고 뒤로 갈수록 길다) + 물결 밑단
    P = Part(g + '.overskirt')
    rings = []
    for z, rx, ry in table[:-1]:
        rings.append((V(0, .01, z), rx * s + .012, ry * s + .012))
    arcloft(P, rings, lace, math.radians(130), math.radians(410), segs=18)
    for i in range(19):
        t = math.radians(130) + math.radians(280) * i / 18
        rx, ry = _interp(table, .22)
        blob(P, V(0, .01, .21) + Vector((math.cos(t) * (rx * s + .014), -math.sin(t) * (ry * s + .014), 0)), (.024 * s, .018 * s, .02 * s), lace, None, segs=6, rings=4)
    # 트인 앞자락 가장자리의 진홍 장식 줄
    for sgn in (1, -1):
        t0 = math.radians(130 if sgn > 0 else 50)
        pts = [V(0, .01, z) + Vector((math.cos(t0) * (rx * s + .016), -math.sin(t0) * (ry * s + .016), 0)) for z, rx, ry in table[1:-1]]
        for p0, p1 in zip(pts, pts[1:]):
            limb(P, p0, p1, [(0, .006, .006), (1, .006, .006)], lining, None, segs=5)
    ob = finish(P); bind(ob, self.arm, gown_w(self)); self.add(g, ob)
    # 허리에 늘어진 은사슬 둘 (치마 앞으로 처진다) + 허리 고리
    P = Part(g + '.chains')
    for x0, sag, n in ((.16, .13, 15), (.2, .28, 19)):
        for k in range(n + 1):
            t = k / n * 2 - 1
            z = .97 - sag * (1 - t * t)
            rx, ry = _interp(table, z)
            ang = math.acos(max(-1, min(1, (t * x0) / (rx * s + .02))))
            p = V(0, .01, z) + Vector((math.cos(ang) * (rx * s + .018), -math.sin(ang) * (ry * s + .018), 0))
            blob(P, p, (.009, .007, .009), chain, None, segs=6, rings=4)
    for sx in (1, -1):
        blob(P, V(sx * .16, -.09, .97), (.016 * s, .01 * s, .016 * s), chain, None, segs=8, rings=5)
    ob = finish(P); bind(ob, self.arm, gown_w(self), subsurf=0); self.add(g, ob)
    # 머리: 보랏빛 검은 긴 머리 (엉덩이께까지)
    _long_hair(self, g, hm, .86)
    # 뿔: 정수리 양옆에서 위로 솟아 뒤로 휘고, 바깥으로 감겨 내려오다 끝이 앞으로 말린다
    hc0, hs = _head_tools(self)
    P = Part(g + '.horns')
    path = [(.05, -.035, 1.72), (.068, -.025, 1.775), (.088, .005, 1.815), (.112, .05, 1.835), (.138, .095, 1.82), (.158, .13, 1.785), (.168, .145, 1.74), (.165, .135, 1.7), (.152, .105, 1.685), (.14, .08, 1.7)]
    for sx in (1, -1):
        pts = [hs(V(sx * x, y, z)) for x, y, z in path]
        n = len(pts) - 1
        for k in range(n):
            r0 = (.026 - .019 * k / n) * s; r1 = (.026 - .019 * (k + 1) / n) * s
            limb(P, pts[k], pts[k + 1], [(0, r0, r0), (1, r1, r1)], horn, None, segs=8)
            if k: blob(P, pts[k], (r0, r0, r0), horn, None, segs=8, rings=5)
        for k in (2, 4, 6):   # 뿔의 마디 (가는 고리 무늬)
            blob(P, pts[k], ((.026 - .019 * k / n) * s * 1.18,) * 3, horn, None, segs=8, rings=5)
    ob = finish(P); bind(ob, self.arm, lambda co: {'head': 1.0}); self.add(g, ob)


# ─────────────────────────── 아큐버스 ───────────────────────────
def accubus(self, g):
    s, V = self.s, self.V
    f = self.sex == 'f'
    gown = rmat('top', .6, .3)          # 흰 비단
    skirt = rmat('bottom', .7, .25)     # 흰 치마 (조금 다른 흰색)
    gold = rmat('metal', .25, .7, .9)    # 금실
    halo = rmat('crest', .2, .9)        # 빛나는 고리 · 별의 알
    hm = rmat('hair', .4, .55)
    skin = rmat('skin', .55, .35)
    sw = _spine_w(s)
    bw = self.bw
    self.legs(g, skirt, rmat('shoe', .4, .5), foot=.85)   # 흰 속바지 (걸을 때 옷자락 사이로 비쳐도 흰 천)
    if f:
        def bod(rings):
            return [(c, u, v, rs + .003, rf + .004) for c, u, v, rs, rf in rings]
        self.torso(g, skin, gown, hem=1.33, extra=bod)
    else:
        def robe(rings):
            return [(c, u, v, rs * 1.06 + .008, rf * 1.1 + .01) for c, u, v, rs, rf in rings]
        self.torso(g, gown, gown, hem=0, extra=robe)
    self.head(g)
    self.arms(g, None); self.hands(g)
    if f: _sleeves(self, g, gown, gold, bell=1.25, start=.3, cuff_r=.08)
    else: _sleeves(self, g, gown, gold, bell=1.2, start=0.0, cuff_r=.075)
    # 금실 장식: 목선 · 허리띠 · 앞섶의 덩굴 · 별 브로치
    P = Part(g + '.trim')
    if f:   # 어깨를 드러낸 목선을 따라 금실
        loft(P, [(V(0, -.012, 1.315), Vector((0, -1, 0)), Vector((1, 0, 0)), .19 * s * bw + .01, .118 * s + .009),
                 (V(0, -.01, 1.338), Vector((0, -1, 0)), Vector((1, 0, 0)), .195 * s * bw + .011, .114 * s + .009)], gold, None, segs=20, caps=(False, False))
        for i in range(16):   # 목선 아래로 늘어진 흰 주름 (어깨를 감싼 얇은 천)
            a = 2 * math.pi * i / 16
            blob(P, V(0, -.012, 1.3) + Vector((math.cos(a) * (.19 * s * bw + .012), -math.sin(a) * (.12 * s + .01), 0)), (.018 * s, .013 * s, .014 * s), gown, None, segs=6, rings=4)
    else:   # 남자: 둥근 깃의 금테 + 어깨에서 반대쪽 허리로 걸친 금빛 영대
        limb(P, V(0, .0, 1.425), V(0, .0, 1.455), [(0, .085 * s, .075 * s), (1, .07 * s, .062 * s)], gold, None, segs=14, caps=(False, False))
        pts = [V(.15, -.08, 1.40), V(.06, -.14, 1.27), V(-.04, -.15, 1.13), V(-.13, -.12, 1.0)]
        for p0, p1 in zip(pts, pts[1:]):
            limb(P, p0, p1, [(0, .03, .008), (1, .03, .008)], gold, None, segs=5)
    # 허리띠
    zb = 1.08 if f else 1.0
    loft(P, [(V(0, .0, zb - .018), Vector((0, -1, 0)), Vector((1, 0, 0)), (.13 if f else .165) * s * bw + .01, (.095 if f else .12) * s + .012),
             (V(0, .0, zb + .018), Vector((0, -1, 0)), Vector((1, 0, 0)), (.128 if f else .165) * s * bw + .01, (.094 if f else .12) * s + .012)], gold, None, segs=18, caps=(False, False))
    # 가슴의 별 브로치
    _star(P, V(0, -.135 if f else -.15, 1.25 if f else 1.3), .032, gold, halo)
    ob = finish(P); bind(ob, self.arm, sw); self.add(g, ob)
    # 치마 / 긴 옷자락
    if f: table = [(1.07, .12, .092), (.98, .158, .12), (.84, .185, .145), (.62, .215, .17), (.4, .245, .195), (.2, .275, .22), (.05, .3, .24)]
    else: table = [(1.02, .175, .13), (.9, .19, .14), (.7, .2, .15), (.45, .21, .16), (.2, .225, .17), (.08, .235, .175)]
    _skirt(self, g, table, skirt, trim=gold, trim_z=.12 if f else .14)
    # 앞자락의 금실 덩굴 (허리에서 밑단으로 두 줄, 군데군데 잎)
    P = Part(g + '.vine')
    for sgn in (1, -1):
        t0 = math.radians(90 + sgn * 22)
        pts = []
        for k, (z, rx, ry) in enumerate(table[:-1]):
            wob = math.radians(6) * math.sin(k * 1.9) * sgn
            pts.append(V(0, .01, z) + Vector((math.cos(t0 + wob) * (rx * s + .006), -math.sin(t0 + wob) * (ry * s + .006), 0)))
        for k, (p0, p1) in enumerate(zip(pts, pts[1:])):
            limb(P, p0, p1, [(0, .005, .004), (1, .005, .004)], gold, None, segs=4)
            mid = (p0 + p1) / 2
            blob(P, mid + Vector((sgn * .014, -.004, 0)), (.011, .005, .007), gold, None, segs=6, rings=4)
    ob = finish(P); bind(ob, self.arm, gown_w(self), subsurf=0); self.add(g, ob)
    # 머리: 은빛 — 여자는 허리까지, 남자는 목덜미를 덮는 길이
    if f: _long_hair(self, g, hm, 1.0)
    else:
        P = Part(g + '.haircap')
        R = (.101 * s, .114 * s, .128 * s)
        blob(P, V(0, .006, 1.632), (R[0] * 1.04, R[1] * 1.03, R[2] * 1.02), hm, None, segs=16, rings=12,
             cut=lambda co: (co.y < -.028 * s and co.z < 1.672 * s) or co.z < 1.52 * s or (co.z < 1.585 * s and co.y < .02 * s))
        blob(P, V(.02, -.07, 1.71), (.07 * s, .05 * s, .032 * s), hm, None, segs=10, rings=7)   # 옆으로 쓸어 넘긴 앞머리
        limb(P, V(0, .06, 1.62), V(0, .085, 1.47), [(0, .1 * s, .07 * s), (1, .085 * s, .04 * s)], hm, None, segs=12)   # 목덜미
        ob = finish(P); self.scale_head(ob); bind(ob, self.arm, lambda co: {'head': 1.0}); self.add(g, ob)
    _halo(self, g, halo)


NEW = {'succubus': succubus, 'accubus': accubus}


# ─────────────────────────── 39차: 미스 황 (우주새 점원) ───────────────────────────
def misshwang(self, g):
    """웨이브 진 긴 머리와 옆으로 넘긴 앞머리에 노란 깃털 핀, 흰 블라우스(팔꿈치까지 걷은 소매 · 둥근 깃 · 목 리본),
    가슴까지 오는 짙은 앞치마(주머니 · 노란 볏의 유황앵무 자수 · 이름표), 종아리까지 오는 치마, 발목 부츠.
    구역: 블라우스 3 · 치마 4 · 부츠 5 · 앞치마 7 · 리본·핀·자수 12 · 이름표 14 · 머리 2 (황혼·황색날개는 같은 몸에 색만 바꾼다)"""
    s, V = self.s, self.V
    blouse = rmat('top', .8, .2); skirt = rmat('bottom', .8, .15); apron = rmat('apron', .85, .1)
    crest = rmat('crest', .4, .5); badge = rmat('metal', .3, .6, .7); hm = rmat('hair', .45, .5)
    sw = _spine_w(s)
    self.legs(g, rmat('dark', .6, .3), rmat('shoe', .4, .5), foot=.85, boot=True)
    self.torso(g, blouse, blouse, hem=0)
    self.head(g)
    self.arms(g, blouse, 1.05, cuff=True)   # 팔꿈치 조금 아래까지 걷은 소매
    self.hands(g)
    # 둥근 깃 + 목 리본
    P = Part(g + '.collar')
    for sx in (1, -1):
        blob(P, V(sx * .045, -.075, 1.43), (.05 * s, .03 * s, .02 * s), blouse, None, segs=8, rings=5)
    blob(P, V(0, -.1, 1.41), (.022 * s, .012 * s, .016 * s), crest, None, segs=8, rings=5)
    for sx in (1, -1):
        limb(P, V(sx * .006, -.1, 1.405), V(sx * .03, -.11, 1.36), [(0, .012, .005), (1, .016, .004)], crest, None, segs=4)
    ob = finish(P); bind(ob, self.arm, sw); self.add(g, ob)
    # 치마: 종아리까지 (걸으면 다리를 따라 밀린다)
    table = [(1.02, .13, .1), (.9, .17, .13), (.7, .195, .15), (.5, .215, .165), (.32, .23, .175)]
    _skirt(self, g, table, skirt)
    # 앞치마: 가슴받이 + 허리 아래 넓은 자락 + 주머니 + 어깨끈 + 허리끈 매듭(뒤)
    P = Part(g + '.apron')
    bib = [(1.36, .1, .118), (1.24, .108, .135), (1.1, .1, .104), (1.03, .1, .1)]
    for (z0, w0, y0), (z1, w1, y1) in zip(bib, bib[1:]):
        poly4 = [V(-w0, -y0 - .006, z0), V(w0, -y0 - .006, z0), V(w1, -y1 - .006, z1), V(-w1, -y1 - .006, z1)]
        limb(P, (poly4[0] + poly4[1]) / 2, (poly4[2] + poly4[3]) / 2, [(0, w0 * s, .004), (1, w1 * s, .004)], apron, None, segs=4)
    front = [(1.02, .135, .104), (.9, .175, .134), (.7, .2, .154), (.5, .215, .168), (.36, .222, .174)]
    pts = [(V(0, .01, z), rx * s + .01, ry * s + .012) for z, rx, ry in front]
    arcloft(P, pts, apron, math.radians(25), math.radians(155), segs=10)
    blob(P, V(.06, -.19, .78), (.05 * s, .01 * s, .045 * s), apron, None, segs=8, rings=5)          # 주머니
    blob(P, V(-.02, -.123, 1.27), (.026 * s, .006 * s, .02 * s), crest, None, segs=8, rings=5)      # 볏 자수 (노란 깃)
    for k in range(3):
        limb(P, V(-.03 + k * .008, -.124, 1.285), V(-.045 + k * .012, -.124, 1.32), [(0, .004, .002), (1, .002, .002)], crest, None, segs=3)
    blob(P, V(.06, -.13, 1.25), (.016 * s, .006 * s, .01 * s), badge, None, segs=6, rings=4)        # 이름표
    for sx in (1, -1):
        limb(P, V(sx * .1, -.118, 1.36), V(sx * .11, .06, 1.43), [(0, .012, .004), (1, .012, .004)], apron, None, segs=4)   # 어깨끈
    limb(P, V(-.15, .0, 1.03), V(.15, .0, 1.03), [(0, .012, .012), (1, .012, .012)], apron, None, segs=4)
    blob(P, V(0, .12, 1.03), (.04 * s, .02 * s, .025 * s), apron, None, segs=8, rings=5)            # 뒤 매듭
    ob = finish(P); bind(ob, self.arm, lambda co: gown_w(self)(co) if co.z < 1.02 * s else sw(co)); self.add(g, ob)
    # 머리: 웨이브 진 긴 머리 (어깨 아래 등까지) · 옆으로 넘긴 앞머리 · 노란 깃털 핀
    _long_hair(self, g, hm, 1.08, front=True, width=1.06)
    hc0, hs = _head_tools(self)
    P = Part(g + '.wave')
    for sx in (1, -1):   # 귀밑의 웨이브 덩이
        for k, z in enumerate((1.5, 1.42, 1.34)):
            blob(P, hs(V(sx * (.1 + k * .008), .02, z)) if z > 1.45 else V(sx * (.11 + k * .006), .03, z), (.032 * s, .03 * s, .04 * s), hm, None, segs=8, rings=5)
    ob = finish(P); bind(ob, self.arm, lambda co: {'head': smooth(co.z, 1.4 * s, 1.5 * s), 'spine': 1 - smooth(co.z, 1.4 * s, 1.5 * s)}); self.add(g, ob)
    P = Part(g + '.pin')
    base = hs(V(.07, -.04, 1.72))
    for k in range(3):
        limb(P, base, base + Vector(((.03 + k * .012) * s, (.02 - k * .02) * s, (.05 + k * .01) * s)), [(0, .01 * s, .006 * s), (1, .003 * s, .002 * s)], crest, None, segs=5)
    ob = finish(P); bind(ob, self.arm, lambda co: {'head': 1.0}); self.add(g, ob)


# ─────────────────────────── 39차: 천사 (지옥문을 지키는 전사) ───────────────────────────
def angelk(self, g):
    """무릎까지 오는 흰 튜닉(금 밑단) · 금빛 가슴받이와 어깨 갑 · 금 허리띠 · 팔목 보호대 · 끈 샌들.
    남자는 짧게 쓸어 넘긴 금발, 여자는 높이 묶은 금발 말총머리. 날개는 게임이 붙인다 (구역: 튜닉 3 · 속옷 4 · 금 14 · 머리 2)"""
    s, V = self.s, self.V
    f = self.sex == 'f'
    tunic = rmat('top', .75, .2); under = rmat('bottom', .75, .2); gold = rmat('metal', .22, .75, .9); hm = rmat('hair', .4, .55)
    skin = rmat('skin', .55, .35)
    sw = _spine_w(s)
    self.legs(g, skin, rmat('shoe', .5, .3), foot=.85)
    self.torso(g, tunic, tunic, hem=0, extra=lambda rings: [(c, u, v, rs * 1.04 + .006, rf * 1.06 + .008) for c, u, v, rs, rf in rings])
    self.head(g)
    self.arms(g, tunic, .5, wide=1.1); self.hands(g)
    # 튜닉 자락: 무릎까지 (금 밑단) · 다리를 따라 밀린다
    table = [(1.0, .18, .132), (.85, .205, .152), (.68, .222, .164), (.5, .232, .172)]
    _skirt(self, g, table, tunic, trim=gold, trim_z=.54)
    P = Part(g + '.armor')
    # 가슴받이 (앞·뒤 판) · 어깨 갑 · 허리띠 · 가운데 보석
    bw = self.bw
    loft(P, [(V(0, -.008, 1.08), Vector((0, -1, 0)), Vector((1, 0, 0)), .14 * s * bw + .014, .1 * s + .016),
             (V(0, -.012, 1.24), Vector((0, -1, 0)), Vector((1, 0, 0)), (.162 if f else .172) * s * bw + .016, .125 * s + .018),
             (V(0, -.01, 1.38), Vector((0, -1, 0)), Vector((1, 0, 0)), .15 * s * bw + .014, .1 * s + .014)], gold, None, segs=18, caps=(False, False))
    for sx in (1, -1):
        sh = self.bones['upper_arm.' + ('L' if sx > 0 else 'R')][0]
        blob(P, sh + Vector((sx * .015, 0, .02)), (.075 * s, .07 * s, .045 * s), gold, None, segs=10, rings=6, cut=lambda co: co.z < sh.z - .005)
    loft(P, [(V(0, .0, .99), Vector((0, -1, 0)), Vector((1, 0, 0)), .165 * s * bw + .016, .125 * s + .016), (V(0, .0, 1.03), Vector((0, -1, 0)), Vector((1, 0, 0)), .16 * s * bw + .016, .12 * s + .016)], gold, None, segs=18, caps=(False, False))
    blob(P, V(0, -.15, 1.25), (.018 * s, .008 * s, .022 * s), rmat('crest', .2, .85), None, segs=8, rings=5)
    ob = finish(P); bind(ob, self.arm, sw); self.add(g, ob)
    for k in 'LR':   # 팔목 보호대
        el, wr = self.bones[f'forearm.{k}'][0], self.bones[f'forearm.{k}'][1]
        P = Part(f'{g}.bracer.{k}')
        am = self.p['arm'] * self.bw
        limb(P, el + (wr - el) * .45, el + (wr - el) * .92, [(0, .05 * am, .05 * am), (1, .046 * am, .046 * am)], gold, None, segs=10)
        ob = finish(P); bind(ob, self.arm, rigid(f'forearm.{k}')); self.add(g, ob)
    # 머리
    R = (.101 * s, .114 * s, .128 * s)
    P = Part(g + '.hair')
    if f:
        blob(P, V(0, .006, 1.632), (R[0] * 1.03, R[1] * 1.02, R[2] * 1.01), hm, None, segs=16, rings=12,
             cut=lambda co: (co.y < -.025 * s and co.z < 1.675 * s) or co.z < 1.55 * s or (co.z < 1.61 * s and co.y < .02 * s))
        blob(P, V(0, .1, 1.7), (.04 * s, .035 * s, .04 * s), hm, None, segs=8, rings=6)
        limb(P, V(0, .12, 1.7), V(0, .17, 1.4), [(0, .045 * s, .04 * s), (.4, .055 * s, .045 * s), (1, .018 * s, .016 * s)], hm, None, segs=10)
    else:
        blob(P, V(0, .006, 1.632), (R[0] * 1.03, R[1] * 1.02, R[2] * 1.01), hm, None, segs=16, rings=12,
             cut=lambda co: (co.y < -.028 * s and co.z < 1.665 * s) or co.z < 1.53 * s or (co.z < 1.59 * s and co.y < .03 * s))
        blob(P, V(.02, -.06, 1.72), (.07 * s, .05 * s, .035 * s), hm, None, segs=10, rings=7)
    ob = finish(P); self.scale_head(ob); bind(ob, self.arm, lambda co: {'head': 1.0}); self.add(g, ob)


NEW.update({'misshwang': misshwang, 'angelk': angelk})


# ─────────────────────────── 42차: 지옥으로 데려가는 이들 ───────────────────────────
def _spikes(self, g, hm, n=46, length=.085, cap=True):
    """성게머리: 머리 덮개 위로 사방으로 뻗은 뾰족한 가시 머리카락 (정수리·뒤통수·옆머리, 얼굴 쪽은 짧게)"""
    s, V = self.s, self.V
    hc0, hs = _head_tools(self)
    R = (.101 * s, .114 * s, .128 * s)
    P = Part(g + '.spikes')
    if cap:
        blob(P, V(0, .006, 1.632), (R[0] * 1.04, R[1] * 1.03, R[2] * 1.02), hm, None, segs=16, rings=12,
             cut=lambda co: (co.y < -.03 * s and co.z < 1.672 * s) or co.z < 1.53 * s or (co.z < 1.585 * s and co.y < .02 * s))
    c = V(0, .01, 1.64)
    gold = (1 + 5 ** .5) / 2
    for i in range(n):
        # 위 반구에 고르게 (피보나치 구) — 앞 아래(얼굴)는 건너뛴다
        z = 1 - (i + .5) / n * 1.15
        r = max(0.0, 1 - z * z) ** .5
        a = 2 * math.pi * i / gold
        d = Vector((r * math.cos(a), r * math.sin(a), z))
        if z < -.1: continue
        if d.y < -.35 and d.z < .55: continue   # 이마 · 얼굴 앞
        base = c + Vector((d.x * R[0] * .92, d.y * R[1] * .92, d.z * R[2] * .9))
        ln = length * s * (.75 + .5 * ((i * 7) % 5) / 4) * (.6 if d.y < -.2 else 1.0)
        tip = base + d.normalized() * ln + Vector((0, .012 * s, .01 * s))
        limb(P, base, tip, [(0, .021 * s, .021 * s), (1, .002 * s, .002 * s)], hm, None, segs=6)
    ob = finish(P); self.scale_head(ob); bind(ob, self.arm, lambda co: {'head': 1.0}, subsurf=0); self.add(g, ob)


def ponchod(self, g):
    """검은 판초를 발목까지 길게 뒤집어쓴 악마: 잿빛 살갗, 붉게 타는 눈, 사방으로 뻗친 성게머리.
    팔은 판초 안에 감추고(바닥에 끌리는 자락만 흔들린다), 목 뒤로 젖힌 두건이 덩어리로 얹혀 있다.
    구역: 판초 3 · 안감·밑단 9 · 바지 15 · 신 5 · 살 1 · 눈 6 · 머리 2"""
    s, V = self.s, self.V
    pon = rmat('top', .55, .35)        # 기름 먹은 검은 천 (살짝 번들거린다)
    lin = rmat('gown', .85, .1)        # 안감 · 해진 밑단
    hm = rmat('hair', .5, .45)
    sw = _spine_w(s)
    self.legs(g, rmat('dark', .85, .08), rmat('shoe', .45, .5), foot=.9, boot=True)
    self.head(g)
    # 어깨에서 내려오는 판초: 목둘레가 좁고 어깨에서 넓게 퍼진다 (팔은 안에)
    bw = self.bw
    P = Part(g + '.cape')
    top = [(1.47, .062, .058, .0), (1.43, .13, .105, .0), (1.38, .228, .158, .005), (1.28, .272, .196, .01), (1.14, .29, .212, .012), (1.0, .305, .222, .012)]
    loft(P, [(V(0, cy, z), Vector((0, -1, 0)), Vector((1, 0, 0)), rx * s * bw, ry * s) for z, rx, ry, cy in top], pon, None, segs=22, caps=(False, False))
    ob = finish(P); bind(ob, self.arm, lambda co: {'neck': smooth(co.z, 1.43 * s, 1.47 * s), 'spine': 1 - smooth(co.z, 1.43 * s, 1.47 * s)}); self.add(g, ob)
    # 허리 아래 자락 (발목까지 · 다리를 따라 밀린다)
    table = [(1.02, .305, .222), (.82, .322, .232), (.62, .338, .242), (.42, .352, .252), (.24, .366, .262), (.12, .374, .268)]
    _skirt(self, g, [(z, rx * bw, ry) for z, rx, ry in table], pon, trim=lin, trim_z=.15, cy=.012)
    # 해진 밑단 (들쭉날쭉한 천 조각)
    P = Part(g + '.tatter')
    for i in range(22):
        a = 2 * math.pi * i / 22
        rx, ry = .374 * s * bw + .004, .268 * s + .004
        ln = (.05 + .04 * ((i * 5) % 3)) * s
        p0 = V(0, .012, .14) + Vector((math.cos(a) * rx, -math.sin(a) * ry, 0))
        limb(P, p0, p0 + Vector((math.cos(a) * .01, -math.sin(a) * .01, -ln)), [(0, .028 * s, .006 * s), (1, .006 * s, .003 * s)], lin, None, segs=4)
    ob = finish(P); bind(ob, self.arm, gown_w(self), subsurf=0); self.add(g, ob)
    # 목 뒤로 젖힌 두건 (등에 얹힌 덩어리) + 목을 두른 깃
    P = Part(g + '.hood')
    blob(P, V(0, .11, 1.42), (.13 * s, .07 * s, .08 * s), pon, None, segs=12, rings=8)
    limb(P, V(0, .0, 1.44), V(0, .0, 1.49), [(0, .078 * s, .072 * s), (1, .07 * s, .066 * s)], pon, None, segs=14, caps=(False, False))
    ob = finish(P); bind(ob, self.arm, lambda co: {'neck': smooth(co.z, 1.42 * s, 1.47 * s), 'spine': 1 - smooth(co.z, 1.42 * s, 1.47 * s)}); self.add(g, ob)
    # 판초 앞섶 사이로 나온 손 (손가락이 긴 잿빛 손 — 어깨에서 내려 앞에서 맞잡은 듯)
    P = Part(g + '.hands')
    for sx in (1, -1):
        blob(P, V(sx * .05, -.235, .98), (.03 * s, .028 * s, .05 * s), rmat('skin', .7, .2), None, segs=8, rings=6)
        for k in range(3):
            limb(P, V(sx * (.035 + k * .012), -.245, .95), V(sx * (.032 + k * .014), -.25, .89), [(0, .007 * s, .007 * s), (1, .003 * s, .003 * s)], rmat('skin', .7, .2), None, segs=4)
    ob = finish(P); bind(ob, self.arm, sw); self.add(g, ob)
    _spikes(self, g, hm)


def reaper(self, g):
    """저승사자: 검은 도포(발목까지, 넓은 소매) · 흰 동정 · 가슴께 붉은 세조대 · 넓은 챙의 갓과 갓끈 · 핏기 없는 흰 얼굴.
    구역: 도포 3 · 동정 9 · 세조대·갓끈 12 · 갓 15 · 바지 4 · 신 5 · 살 1 · 머리 2"""
    s, V = self.s, self.V
    robe = rmat('top', .8, .12); collar = rmat('gown', .85, .08); cord = rmat('crest', .6, .25)
    hat = rmat('dark', .92, .08); hm = rmat('hair', .55, .4)
    self.legs(g, rmat('bottom', .85, .1), rmat('shoe', .45, .45), foot=.88)
    skirt_w, rad = self.long_body(g, robe, hem=.1, flare=.75, grow=1.1, sleeve_w=1.12)
    self.head(g)
    # 손은 넓은 소매 끝에서 조금만 (흰 손)
    self.hands(g)
    # 소매 끝을 넓게 (도포의 넓은 소매가 손목 아래로 처진다)
    for k in 'LR':
        el, wr = self.bones[f'upper_arm.{k}'][1], self.bones[f'forearm.{k}'][1]
        am = self.p['arm'] * self.bw
        P = Part(f'{g}.wide.{k}')
        d = wr - el
        limb(P, el + d * .35, wr - d * .02, [(0, .068 * am, .072 * am), (.6, .078 * am, .1 * am), (1, .084 * am, .118 * am)], robe, None, segs=12, caps=(False, True))
        ob = finish(P); bind(ob, self.arm, autow(self.bones, [f'upper_arm.{k}', f'forearm.{k}'], power=5)); self.add(g, ob)
    # 동정: 왼쪽 깃이 오른쪽 위로 여며진 흰 띠 (목에서 가슴 오른쪽으로)
    P = Part(g + '.collar')
    bw = self.bw
    pts = [V(.055, -.07, 1.455), V(.0, -.125, 1.36), V(-.06, -.15, 1.27), V(-.11, -.155, 1.2)]
    for p0, p1 in zip(pts, pts[1:]):
        limb(P, p0, p1, [(0, .022 * s, .007 * s), (1, .022 * s, .007 * s)], collar, None, segs=4)
    limb(P, V(0, .0, 1.44), V(0, .0, 1.475), [(0, .072 * s, .066 * s), (1, .066 * s, .06 * s)], collar, None, segs=14, caps=(False, False))
    # 세조대: 가슴께를 두른 가는 붉은 끈 + 늘어진 두 가닥
    self.torso_band(P, 1.2, cord, grow=1.12, h=.016, add=.012)
    for sx, ln in ((1, .42), (-1, .36)):
        limb(P, V(sx * .03, -.16, 1.19), V(sx * .05, -.18, 1.19 - ln), [(0, .008 * s, .006 * s), (1, .007 * s, .005 * s)], cord, None, segs=4)
        blob(P, V(sx * .05, -.18, 1.17 - ln), (.014 * s, .01 * s, .02 * s), cord, None, segs=6, rings=4)
    ob = finish(P); bind(ob, self.arm, _spine_w(s)); self.add(g, ob)
    # 상투 대신 짧게 넘긴 검은 머리 (갓 아래로 보이는 뒷머리·옆머리)
    R = (.101 * s, .114 * s, .128 * s)
    P = Part(g + '.hair')
    blob(P, V(0, .006, 1.632), (R[0] * 1.03, R[1] * 1.02, R[2] * 1.01), hm, None, segs=16, rings=12,
         cut=lambda co: (co.y < -.03 * s and co.z < 1.67 * s) or co.z < 1.54 * s or (co.z < 1.6 * s and co.y < .02 * s))
    ob = finish(P); self.scale_head(ob); bind(ob, self.arm, lambda co: {'head': 1.0}); self.add(g, ob)
    # 갓: 넓고 얇은 챙(가장자리가 살짝 처짐) + 위가 좁아지는 높은 대우 + 갓끈
    hc0, hs = _head_tools(self)
    P = Part(g + '.gat')
    c = hs(V(0, -.002, 1.715))
    n = 28
    R0, R1 = .215 * s, .07 * s
    rings = []
    for k, (rr, dz) in enumerate(((R1, .0), (.14 * s, -.002 * s), (R0, -.007 * s))):
        rings.append((c + Vector((0, 0, dz)), Vector((0, -1, 0)), Vector((1, 0, 0)), rr, rr * .96))
    loft(P, rings, hat, None, segs=n, caps=(False, False))
    loft(P, [(c + Vector((0, 0, .004 * s)), Vector((0, -1, 0)), Vector((1, 0, 0)), R1, R1 * .96),
             (c + Vector((0, 0, .02 * s)), Vector((0, -1, 0)), Vector((1, 0, 0)), .074 * s, .071 * s),
             (c + Vector((0, 0, .17 * s)), Vector((0, -1, 0)), Vector((1, 0, 0)), .06 * s, .058 * s)], hat, None, segs=18, caps=(False, True))
    for sx in (1, -1):   # 갓끈: 챙 안쪽에서 턱 아래로
        a = c + Vector((sx * .085 * s, -.01 * s, -.008 * s))
        b = hs(V(sx * .05, -.06, 1.5))
        limb(P, a, b, [(0, .005 * s, .005 * s), (1, .005 * s, .005 * s)], cord, None, segs=4)
    for k in range(5):   # 가슴까지 늘어진 갓끈 구슬
        blob(P, hs(V(0, -.075, 1.49)) + Vector((0, -.004 * k * s, -.03 * k * s)), (.008 * s, .008 * s, .009 * s), cord, None, segs=6, rings=4)
    ob = finish(P); bind(ob, self.arm, lambda co: {'head': 1.0}, subsurf=0); self.add(g, ob)


# ─────────────────────────── 42차: 유내 (10대 · 20대 · 30대 후반) ───────────────────────────
def _bangs(self, P, hm, side=.0, depth=1.0):
    s, V = self.s, self.V
    blob(P, V(side, -.072, 1.705), (.075 * s, .045 * s * depth, .03 * s), hm, None, segs=10, rings=7)


def yunae1(self, g):
    """10대 유내: 높이 질끈 묶은 말총머리와 일자 앞머리, 노란 반팔 티, 남색 반바지, 흰 양말과 운동화. 키가 작다.
    구역: 티 3 · 반바지 4 · 운동화 5 · 양말 10 · 머리끈 12 · 머리 2"""
    s, V = self.s, self.V
    tee = rmat('top', .85, .12); shorts = rmat('bottom', .8, .12); shoe = rmat('shoe', .6, .3); sock = rmat('bandage', .9, .05)
    hm = rmat('hair', .45, .5); tie = rmat('crest', .5, .3)
    skin = rmat('skin', .55, .35)
    self.torso(g, tee, shorts, hem=.99)
    self.head(g)
    self.arms(g, tee, .42); self.hands(g)
    self.legs(g, shorts, shoe, bare_below=skin, foot=.92)
    # 무릎 위까지 오는 반바지 자락 + 흰 양말 목
    P = Part(g + '.shorts')
    for k in 'LR':
        hp, kn = self.bones[f'thigh.{k}'][0], self.bones[f'thigh.{k}'][1]
        lg = self.p['leg'] * self.bw * self.p.get('legmass', 1.0)
        limb(P, hp + Vector((0, 0, .02)), hp + (kn - hp) * .72, [(0, .095 * lg, .097 * lg), (1, .084 * lg, .086 * lg)], shorts, None, segs=12, caps=(False, False))
    ob = finish(P); bind(ob, self.arm, autow(self.bones, ['hips', 'thigh.L', 'thigh.R'], power=6)); self.add(g, ob)
    P = Part(g + '.socks')
    for k in 'LR':
        an = self.bones[f'shin.{k}'][1]
        lg = self.p['leg'] * self.bw
        limb(P, an + Vector((0, 0, .01)), an + Vector((0, 0, .075 * s)), [(0, .047 * lg, .05 * lg), (1, .045 * lg, .048 * lg)], sock, None, segs=10, caps=(False, False))
    ob = finish(P); bind(ob, self.arm, autow(self.bones, ['shin.L', 'shin.R'], power=8)); self.add(g, ob)
    # 머리: 정수리 높이 묶은 말총 (끝이 어깨뼈까지) · 일자 앞머리 · 머리끈
    R = (.101 * s, .114 * s, .128 * s)
    P = Part(g + '.hair')
    blob(P, V(0, .006, 1.632), (R[0] * 1.03, R[1] * 1.02, R[2] * 1.01), hm, None, segs=16, rings=12,
         cut=lambda co: (co.y < -.03 * s and co.z < 1.672 * s) or co.z < 1.55 * s or (co.z < 1.6 * s and co.y < .02 * s))
    _bangs(self, P, hm)
    blob(P, V(0, .095, 1.715), (.038 * s, .034 * s, .036 * s), hm, None, segs=8, rings=6)
    limb(P, V(0, .12, 1.72), V(0, .2, 1.43), [(0, .043 * s, .038 * s), (.35, .052 * s, .044 * s), (.8, .03 * s, .026 * s), (1, .012 * s, .01 * s)], hm, None, segs=10)
    ob = finish(P); self.scale_head(ob); bind(ob, self.arm, lambda co: {'head': 1.0}); self.add(g, ob)
    P = Part(g + '.tie')
    hc0, hs = _head_tools(self)
    limb(P, hs(V(0, .1, 1.705)), hs(V(0, .12, 1.735)), [(0, .036 * s, .032 * s), (1, .036 * s, .032 * s)], tie, None, segs=10, caps=(False, False))
    ob = finish(P); bind(ob, self.arm, lambda co: {'head': 1.0}, subsurf=0); self.add(g, ob)


def yunae2(self, g):
    """20대 유내 (동네 미용실): 갈색으로 물들인 긴 머리, 팔꿈치까지 걷은 검은 셔츠, 허리 앞치마(주머니에 빗과 가위), 베이지 바지, 붉은 단화.
    구역: 셔츠 3 · 바지 4 · 신 5 · 앞치마 7 · 빗·가위 14 · 머리 2"""
    s, V = self.s, self.V
    shirt = rmat('top', .8, .15); pants = rmat('bottom', .8, .12); apron = rmat('apron', .85, .1); tool = rmat('metal', .3, .6, .8)
    hm = rmat('hair', .45, .5)
    sw = _spine_w(s)
    self.torso(g, shirt, pants, hem=1.0)
    self.head(g)
    self.arms(g, shirt, 1.05, cuff=True); self.hands(g)
    self.legs(g, pants, rmat('shoe', .4, .5), foot=.86)
    # 허리 앞치마: 허리에서 허벅지 중간까지, 앞과 옆을 감싼다 · 큰 주머니 둘 · 빗과 가위 손잡이
    P = Part(g + '.apron')
    front = [(1.0, .148, .108), (.9, .175, .13), (.76, .188, .142), (.64, .194, .148)]
    arcloft(P, [(V(0, .01, z), rx * s + .012, ry * s + .014) for z, rx, ry in front], apron, math.radians(20), math.radians(160), segs=12)
    limb(P, V(-.16, .0, 1.0), V(.16, .0, 1.0), [(0, .014, .014), (1, .014, .014)], apron, None, segs=4)
    for sx in (1, -1):
        blob(P, V(sx * .07, -.16, .8), (.05 * s, .012 * s, .045 * s), apron, None, segs=8, rings=5)
    limb(P, V(.05, -.17, .82), V(.06, -.172, .9), [(0, .01 * s, .004 * s), (1, .01 * s, .004 * s)], tool, None, segs=4)       # 빗
    for k in (-1, 1):
        blob(P, V(-.08 + k * .012, -.172, .86), (.011 * s, .006 * s, .011 * s), tool, None, segs=6, rings=4)   # 가위 손잡이 고리
    ob = finish(P); bind(ob, self.arm, lambda co: gown_w(self)(co) if co.z < .99 * s else sw(co)); self.add(g, ob)
    # 머리: 갈색 긴 머리 (등 가운데까지) · 옆으로 넘긴 앞머리
    _long_hair(self, g, hm, 1.06, front=True, width=1.04)


def yunae3(self, g):
    """30대 후반 유내: 짧게 자른 머리(턱선), 보풀 인 카디건(긴소매, 앞이 열려 블라우스가 보인다) · 종아리까지 오는 짙은 치마 · 낮은 회색 단화.
    구역: 카디건 3 · 치마 4 · 신 5 · 블라우스 9 · 단추 14 · 머리 2"""
    s, V = self.s, self.V
    card = rmat('top', .95, .05); skirt = rmat('bottom', .85, .1); blouse = rmat('gown', .8, .12); btn = rmat('metal', .4, .5, .5)
    hm = rmat('hair', .45, .5)
    sw = _spine_w(s)
    self.legs(g, skirt, rmat('shoe', .5, .35), bare_below=rmat('skin', .55, .35), foot=.84)
    self.torso(g, blouse, blouse, hem=0)
    self.head(g)
    self.arms(g, card, 1.95, wide=1.05); self.hands(g)
    # 카디건 몸판: 앞이 열려 가운데 블라우스가 보인다 (허리 아래까지)
    P = Part(g + '.cardigan')
    T = []
    for z in (1.43, 1.36, 1.28, 1.18, 1.08, .98, .9):
        rx, ry, cy = self.torso_r(z, 1.04, .006)
        T.append((Vector((0, cy, z * s)), rx, ry))
    arcloft(P, T, card, math.radians(108), math.radians(432), segs=20)
    for k in range(4):   # 단추
        blob(P, V(.045, -.135 + k * .004, 1.26 - k * .09), (.009 * s, .005 * s, .009 * s), btn, None, segs=6, rings=4)
    ob = finish(P); bind(ob, self.arm, lambda co: gown_w(self)(co) if co.z < .98 * s else sw(co)); self.add(g, ob)
    # 치마: 종아리까지
    table = [(1.0, .14, .105), (.86, .172, .13), (.66, .19, .145), (.46, .205, .158), (.3, .214, .165)]
    _skirt(self, g, table, skirt)
    # 짧은 머리: 턱선까지 내려오는 단발 (옆으로 가른 앞머리)
    R = (.101 * s, .114 * s, .128 * s)
    P = Part(g + '.hair')
    blob(P, V(0, .012, 1.625), (R[0] * 1.1, R[1] * 1.08, R[2] * 1.04), hm, None, segs=16, rings=12,
         cut=lambda co: (co.y < -.04 * s and co.z < 1.672 * s and abs(co.x) < .08 * s) or co.z < 1.5 * s)
    blob(P, V(-.035, -.07, 1.705), (.07 * s, .045 * s, .03 * s), hm, None, segs=10, rings=7)
    for sx in (1, -1):
        blob(P, V(sx * .095, -.01, 1.56), (.032 * s, .07 * s, .07 * s), hm, None, segs=8, rings=6)
    ob = finish(P); self.scale_head(ob); bind(ob, self.arm, lambda co: {'head': 1.0}); self.add(g, ob)


NEW.update({'ponchod': ponchod, 'reaper': reaper, 'yunae1': yunae1, 'yunae2': yunae2, 'yunae3': yunae3})


# ─────────────────────────── 42차: 주요 인물 전용 몸 ───────────────────────────
def _book(self, g, k, cover, page):
    """왼손에 든 낡은 장부 (두꺼운 가죽 표지 · 종이 단면)"""
    s = self.s
    wr, hd = self.bones[f'forearm.{k}'][1], self.bones[f'hand.{k}'][1]
    c = (wr + hd) / 2 + Vector((0, -.03 * s, -.02 * s))
    P = Part(f'{g}.book')
    limb(P, c + Vector((0, 0, -.07 * s)), c + Vector((0, 0, .07 * s)), [(0, .016 * s, .055 * s), (1, .016 * s, .055 * s)], cover, None, segs=4)
    limb(P, c + Vector((.004, -.004, -.064 * s)), c + Vector((.004, -.004, .064 * s)), [(0, .012 * s, .05 * s), (1, .012 * s, .05 * s)], page, None, segs=4)
    ob = finish(P); bind(ob, self.arm, rigid(f'hand.{k}'), subsurf=0); self.add(g, ob)


def pashar(self, g):
    """지옥 로비의 환생관 파샤르: 잿빛으로 쓸어 넘긴 머리, 정강이까지 오는 검은 망토 코트(선 깃 · 은 단추 · 가슴의 은사슬),
    왼손에 낡은 장부, 오른손에 깃펜. 구역: 코트 3 · 바지 4 · 신 5 · 은 14 · 장부 13 · 종이·깃펜 10 · 머리 2"""
    s, V = self.s, self.V
    coat = rmat('top', .7, .25); silver = rmat('metal', .25, .7, .85); hm = rmat('hair', .5, .45)
    self.legs(g, rmat('bottom', .85, .1), rmat('shoe', .4, .5), foot=.88, boot=True)
    skirt_w, rad = self.long_body(g, coat, hem=.3, flare=1.15, grow=1.08)
    self.head(g)
    self.hands(g)
    P = Part(g + '.trim')
    # 선 깃 (목을 감싸고 귀밑까지)
    limb(P, V(0, .0, 1.4), V(0, .01, 1.53), [(0, .095 * s, .085 * s), (1, .1 * s, .09 * s)], coat, None, segs=16, caps=(False, False))
    # 앞섶의 은 단추 다섯 · 가슴을 가로지르는 은사슬
    for n in range(5):
        blob(P, V(.0, -.15 + n * .002, 1.32 - n * .1), (.011 * s, .006 * s, .011 * s), silver, None, segs=6, rings=4)
    pts = [V(-.1, -.14, 1.3), V(-.04, -.16, 1.25), V(.04, -.16, 1.25), V(.1, -.14, 1.3)]
    for p0, p1 in zip(pts, pts[1:]):
        limb(P, p0, p1, [(0, .006 * s, .006 * s), (1, .006 * s, .006 * s)], silver, None, segs=4)
    ob = finish(P); bind(ob, self.arm, _spine_w(s)); self.add(g, ob)
    _book(self, g, 'L', rmat('wood', .6, .3), rmat('bandage', .9, .05))
    # 오른손의 깃펜
    wr, hd = self.bones['forearm.R'][1], self.bones['hand.R'][1]
    P = Part(g + '.quill')
    c = (wr + hd) / 2
    limb(P, c + Vector((0, -.02 * s, -.02 * s)), c + Vector((.02 * s, -.05 * s, .16 * s)), [(0, .004 * s, .004 * s), (.5, .018 * s, .006 * s), (1, .004 * s, .003 * s)], rmat('bandage', .9, .05), None, segs=5)
    ob = finish(P); bind(ob, self.arm, rigid('hand.R'), subsurf=0); self.add(g, ob)
    # 잿빛 머리: 이마에서 뒤로 쓸어 넘기고 목덜미를 덮는다
    R = (.101 * s, .114 * s, .128 * s)
    P = Part(g + '.hair')
    blob(P, V(0, .01, 1.638), (R[0] * 1.05, R[1] * 1.04, R[2] * 1.03), hm, None, segs=16, rings=12,
         cut=lambda co: (co.y < -.05 * s and co.z < 1.69 * s) or co.z < 1.5 * s or (co.z < 1.58 * s and co.y < .01 * s))
    for k in range(5):   # 뒤로 넘긴 머리 결
        limb(P, V(-.04 + k * .02, -.07, 1.72), V(-.05 + k * .025, .08, 1.6), [(0, .012 * s, .008 * s), (1, .01 * s, .006 * s)], hm, None, segs=5)
    limb(P, V(0, .07, 1.6), V(0, .09, 1.47), [(0, .09 * s, .05 * s), (1, .07 * s, .03 * s)], hm, None, segs=10)
    ob = finish(P); self.scale_head(ob); bind(ob, self.arm, lambda co: {'head': 1.0}); self.add(g, ob)


def luen(self, g):
    """천국의 환생관 루엔: 발목 아래까지 끌리는 흰 법의 · 넓은 소매 · 허리와 어깨에 걸친 옅은 푸른 띠 · 허리까지 오는 흰 머리 · 왼손에 등불.
    (흰 날개는 게임이 붙인다) 구역: 법의 3 · 치마 4 · 띠 9 · 등불 테 14 · 등불 빛 12 · 머리 2"""
    s, V = self.s, self.V
    robe = rmat('top', .75, .2); skirt = rmat('bottom', .75, .2); sash = rmat('gown', .7, .25)
    metal = rmat('metal', .3, .6, .7); glow = rmat('crest', .2, .9); hm = rmat('hair', .4, .55)
    sw = _spine_w(s)
    self.legs(g, skirt, rmat('shoe', .5, .3), foot=.84)
    self.torso(g, robe, robe, hem=0, extra=lambda rings: [(c, u, v, rs * 1.04 + .006, rf * 1.06 + .008) for c, u, v, rs, rf in rings])
    self.head(g)
    self.arms(g, None); self.hands(g)
    _sleeves(self, g, robe, sash, bell=1.3, start=0.0, cuff_r=.08)
    table = [(1.05, .14, .1), (.9, .18, .135), (.7, .21, .16), (.45, .24, .185), (.22, .27, .21), (.04, .3, .235)]
    _skirt(self, g, table, skirt, trim=sash, trim_z=.08)
    # 허리띠와 어깨에서 비스듬히 내려오는 띠 (끝이 허리 앞에 늘어진다)
    P = Part(g + '.sash')
    bw = self.bw
    loft(P, [(V(0, .0, 1.04), Vector((0, -1, 0)), Vector((1, 0, 0)), .14 * s * bw + .014, .105 * s + .014), (V(0, .0, 1.09), Vector((0, -1, 0)), Vector((1, 0, 0)), .135 * s * bw + .014, .1 * s + .014)], sash, None, segs=18, caps=(False, False))
    pts = [V(.13, -.07, 1.4), V(.05, -.13, 1.27), V(-.05, -.14, 1.15), V(-.1, -.12, 1.07)]
    for p0, p1 in zip(pts, pts[1:]):
        limb(P, p0, p1, [(0, .028, .007), (1, .028, .007)], sash, None, segs=4)
    for sx, ln in ((1, .3), (-1, .25)):
        limb(P, V(sx * .03, -.13, 1.05), V(sx * .05, -.15, 1.05 - ln), [(0, .022, .006), (1, .018, .005)], sash, None, segs=4)
    ob = finish(P); bind(ob, self.arm, sw); self.add(g, ob)
    # 등불: 왼손에서 늘어진 고리 · 육각 테 · 안의 빛
    wr, hd = self.bones['forearm.L'][1], self.bones['hand.L'][1]
    c = (wr + hd) / 2 + Vector((0, -.01 * s, -.12 * s))
    P = Part(g + '.lantern')
    limb(P, (wr + hd) / 2, c + Vector((0, 0, .06 * s)), [(0, .004 * s, .004 * s), (1, .004 * s, .004 * s)], metal, None, segs=4)
    blob(P, c, (.035 * s, .035 * s, .05 * s), glow, None, segs=10, rings=7)
    for k in range(6):
        a = k * math.pi / 3
        limb(P, c + Vector((math.cos(a) * .036 * s, math.sin(a) * .036 * s, .05 * s)), c + Vector((math.cos(a) * .036 * s, math.sin(a) * .036 * s, -.05 * s)), [(0, .004 * s, .004 * s), (1, .004 * s, .004 * s)], metal, None, segs=4)
    limb(P, c + Vector((0, 0, .05 * s)), c + Vector((0, 0, .07 * s)), [(0, .04 * s, .04 * s), (1, .01 * s, .01 * s)], metal, None, segs=8)
    limb(P, c + Vector((0, 0, -.05 * s)), c + Vector((0, 0, -.06 * s)), [(0, .04 * s, .04 * s), (1, .04 * s, .04 * s)], metal, None, segs=8)
    ob = finish(P); bind(ob, self.arm, rigid('hand.L'), subsurf=0); self.add(g, ob)
    _long_hair(self, g, hm, .98, front=True, width=1.02)


def grandpa(self, g):
    """환생관 할아버지: 마르고 조금 구부정한 아주 늙은 사람 · 무릎까지 오는 헐렁한 겉옷(천국은 흰 옷, 지옥은 잿빛 외투 — 색만 다르다) ·
    정수리가 빈 흰머리(옆과 뒤만) · 짧은 흰 수염 · 헝겊신. (안경은 게임이 붙인다) 구역: 겉옷 3 · 바지 4 · 신 5 · 단추 14 · 머리·수염 2"""
    s, V = self.s, self.V
    coat = rmat('top', .9, .08); hm = rmat('hair', .6, .3)
    self.legs(g, rmat('bottom', .9, .06), rmat('shoe', .8, .1), foot=.82)
    self.long_body(g, coat, hem=.56, flare=.8, grow=1.06, sleeve_w=1.05)
    # 조금 구부정한 등 (목 뒤가 둥글다)
    P = Part(g + '.hunch')
    blob(P, V(0, .07, 1.38), (.13 * s, .07 * s, .08 * s), coat, None, segs=12, rings=8)
    for n in range(4):
        blob(P, V(0, -.135 + n * .003, 1.3 - n * .1), (.009 * s, .005 * s, .009 * s), rmat('metal', .4, .5, .4), None, segs=6, rings=4)
    ob = finish(P); bind(ob, self.arm, _spine_w(s)); self.add(g, ob)
    self.head(g)
    self.hands(g)
    R = (.101 * s, .114 * s, .128 * s)
    P = Part(g + '.hair')
    # 옆과 뒤에만 남은 흰머리 (정수리는 비었다)
    blob(P, V(0, .02, 1.6), (R[0] * 1.05, R[1] * 1.04, R[2] * .9), hm, None, segs=16, rings=10,
         cut=lambda co: co.z > 1.66 * s or co.z < 1.52 * s or (co.y < .0 * s and abs(co.x) < .08 * s))
    # 짧은 흰 수염 (턱을 따라)
    blob(P, V(0, -.07, 1.53), (.06 * s, .04 * s, .04 * s), hm, None, segs=10, rings=6, cut=lambda co: co.y > -.03 * s)
    ob = finish(P); self.scale_head(ob); bind(ob, self.arm, lambda co: {'head': 1.0}); self.add(g, ob)


def bulda(self, g):
    """경계의 해변의 어부이자 랩퍼 불다: 건장한 몸 · 머리를 따라 땋은 콘로우(뒤로 짧은 꽁지) · 앞이 열린 노란 어부 비옷 ·
    걷어 올린 짙은 바지 · 고무 장화 · 목에 굵은 금사슬. 구역: 비옷 3 · 안 셔츠 9 · 바지 4 · 장화 5 · 금 14 · 머리 2"""
    s, V = self.s, self.V
    rain = rmat('top', .35, .55); shirt = rmat('gown', .85, .1); gold = rmat('metal', .2, .8, .9); hm = rmat('hair', .5, .45)
    sw = _spine_w(s)
    self.legs(g, rmat('bottom', .85, .1), rmat('shoe', .3, .6), foot=.95, boot=True)
    self.torso(g, shirt, rmat('bottom', .85, .1), hem=1.0)
    self.head(g)
    self.arms(g, rain, 1.7, wide=1.2); self.hands(g)
    # 앞이 열린 비옷 몸판 (엉덩이 아래까지)
    P = Part(g + '.raincoat')
    T = []
    for z in (1.43, 1.36, 1.26, 1.14, 1.02, .92, .84):
        rx, ry, cy = self.torso_r(z, 1.1, .012)
        T.append((Vector((0, cy, z * s)), rx, ry))
    arcloft(P, T, rain, math.radians(112), math.radians(428), segs=20)
    ob = finish(P); bind(ob, self.arm, lambda co: gown_w(self)(co) if co.z < .98 * s else sw(co)); self.add(g, ob)
    # 굵은 금사슬
    P = Part(g + '.chain')
    for n in range(14):
        a = math.pi * (.15 + .7 * n / 13)
        blob(P, V(math.cos(a) * .08, -.05 - math.sin(a) * .07, 1.4 - math.sin(a) * .08), (.012 * s, .009 * s, .012 * s), gold, None, segs=6, rings=4)
    ob = finish(P); bind(ob, self.arm, sw, subsurf=0); self.add(g, ob)
    # 콘로우: 이마에서 뒤통수로 여섯 줄 · 목덜미 아래로 짧은 꽁지
    hc0, hs = _head_tools(self)
    P = Part(g + '.cornrows')
    R = (.101 * s, .114 * s, .128 * s)
    blob(P, V(0, .006, 1.632), (R[0] * 1.0, R[1] * 1.0, R[2] * 1.0), hm, None, segs=16, rings=12,
         cut=lambda co: (co.y < -.04 * s and co.z < 1.69 * s) or co.z < 1.56 * s or (co.z < 1.6 * s and co.y < .02 * s))
    c = V(0, .01, 1.64)
    for k in range(6):
        x = (-.06 + k * .024)
        pts = []
        for t in range(9):
            a = -1.1 + t * .3
            y, z = math.sin(a) * .118, math.cos(a) * .132
            pts.append(c + Vector((x * s * (1 - .15 * abs(math.sin(a))), y * s, z * s)))
        for p0, p1 in zip(pts, pts[1:]):
            limb(P, p0, p1, [(0, .011 * s, .011 * s), (1, .011 * s, .011 * s)], hm, None, segs=5)
        tail = pts[-1]
        limb(P, tail, tail + Vector((0, .02 * s, -.07 * s)), [(0, .01 * s, .01 * s), (1, .005 * s, .005 * s)], hm, None, segs=4)
    ob = finish(P); self.scale_head(ob); bind(ob, self.arm, lambda co: {'head': 1.0}); self.add(g, ob)


NEW.update({'pashar': pashar, 'luen': luen, 'grandpa': grandpa, 'bulda': bulda})


# 43차: 황색날개 · 마스크 소녀 · 칼드렉 · 오볼로 · 노을 · 마리 · 5층 가면의 도시 · 유내 다시 (bodies43.py)
from bodies43 import NEW43  # noqa: E402
NEW.update(NEW43)
from bodies44 import NEW44   # 44차: 4층 쇠모루지기 · 5층 가면파수꾼
NEW.update(NEW44)
from bodies48 import NEW48   # 48차: 필드 보스 넷 · 걷는 염소대왕
NEW.update(NEW48)
from bodies49 import NEW49   # 49차: 수쿰빗 필드 보스 둘
NEW.update(NEW49)
from bodies55 import NEW55   # 55차: 오르멧
NEW.update(NEW55)
