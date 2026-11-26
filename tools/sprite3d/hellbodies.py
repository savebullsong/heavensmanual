"""16차: 층마다 다른 지옥 괴물·층주·재의 문지기 몸.
색은 게임이 입힌다 (구역: 살 1 · 천 3 · 아래천 4 · 신 5 · 눈 6 · 뼈 10 · 빛 12 · 금속 14 · 어둠 15)."""
import math, random
from rig import *

def rmat(*a, **k):   # body.py 가 이 파일을 불러오므로 늦게 가져온다
    import body
    return body.rmat(*a, **k)

def _spine_w(s):
    return lambda co: {'spine': smooth(co.z, .98 * s, 1.12 * s), 'hips': 1 - smooth(co.z, .98 * s, 1.12 * s)}

def _surf(V, s, rnd, z0, z1, rad, front_bias=0.0):
    """몸통 겉면 위의 한 점 (z 범위, 반지름)"""
    a = rnd.uniform(0, math.tau) if not front_bias else rnd.uniform(-math.pi * .9, -math.pi * .1)
    z = rnd.uniform(z0, z1)
    return V(math.cos(a) * rad, math.sin(a) * rad * .8, z), a, z

# ───────── 재의 문지기 (1층 경비병, 사용자 영상): 얼굴 없는 깊은 두건, 재가 엉겨 붙은 누더기 망토가 땅까지,
# 천 사이사이 불씨가 박혀 빛나고, 어깨와 등에서 재 부스러기가 떨어져 나간다. 뼈만 남은 잿빛 손이 문고리 곤봉을 쥔다 ─────────
def ashwraith(self, g):
    s, V = self.s, self.V
    cloth = rmat('top', .97, .04); cloth2 = rmat('bottom', .97, .04); void = rmat('dark', 1.0, 0.0)
    ember = rmat('crest', .3, .75); bone = rmat('bandage', .75, .12)
    rnd = random.Random(11)
    sw = _spine_w(s)
    self.legs(g, cloth2, void, foot=.8)
    # 망토: 어깨에서 땅 가까이까지 넓게 퍼진다 (앞자락은 조금 갈라졌다)
    P = Part(g + '.cloak')
    rings = []
    for z, rx, ry in ((1.48, .15, .12), (1.41, .22, .155), (1.26, .24, .165), (1.06, .255, .175), (.82, .275, .19), (.56, .3, .21), (.32, .325, .225), (.14, .34, .235)):
        rings.append((V(0, .02, z), Vector((0, -1, 0)), Vector((1, 0, 0)), rx * s, ry * s))
    loft(P, rings, cloth, None, segs=18, caps=(False, False), matfn=None)
    # 세로 주름 (천이 무겁게 늘어진 결)
    for k in range(10):
        a = (k / 10) * math.tau + .2
        top, bot = V(math.cos(a) * .2, .02 + math.sin(a) * .14, 1.3), V(math.cos(a) * .335, .02 + math.sin(a) * .23, .2)
        limb(P, top, bot, [(0, .014, .014), (1, .02, .02)], cloth2 if k % 2 else cloth, None, segs=5)
    # 해진 밑단: 길이가 제각각인 너덜너덜한 자락
    for k in range(22):
        a = (k / 22) * math.tau + rnd.uniform(-.08, .08)
        top = V(math.cos(a) * .335, .02 + math.sin(a) * .232, .18)
        L = rnd.uniform(.06, .17)
        limb(P, top, top + Vector((math.cos(a) * .02, math.sin(a) * .02, -L * s)), [(0, rnd.uniform(.03, .05), .012), (1, .012, .005)], cloth if k % 3 else cloth2, None, segs=4)
    # 천에 박힌 불씨
    for k in range(46):
        z = rnd.uniform(.2, 1.42); r = .16 + (1.48 - z) * .14
        a = rnd.uniform(0, math.tau)
        c = V(math.cos(a) * r * 1.01, .02 + math.sin(a) * r * .71, z)
        rr = rnd.uniform(.006, .013)
        blob(P, c, (rr * s, rr * s, rr * s), ember, None, segs=6, rings=4)
    # 허리끈과 작은 돌문 열쇠
    limb(P, V(0, .02, .99), V(0, .02, .94), [(0, .265 * s, .182 * s), (1, .265 * s, .182 * s)], cloth2, None, segs=16)
    blob(P, V(.17, -.16, .9), (.028 * s, .012 * s, .034 * s), bone, None, segs=8, rings=5)
    ob = finish(P); bind(ob, self.arm, sw); self.add(g, ob)
    # 소매: 넓게 늘어진 누더기 소매 + 뼈만 남은 잿빛 손
    self.arms(g, cloth, 1.95, cuff=True, wide=3.4)
    self.hands(g, bone)
    for k in 'LR':
        el, wr = self.bones[f'forearm.{k}'][0], self.bones[f'forearm.{k}'][1]
        P = Part(f'{g}.rag.{k}')
        for n in range(4):
            c = el + (wr - el) * (.75 + n * .07) + Vector((rnd.uniform(-.03, .03), rnd.uniform(-.03, .03), 0))
            limb(P, c, c + Vector((0, .02, -rnd.uniform(.07, .14))), [(0, .022, .01), (1, .01, .004)], cloth, None, segs=4)
        ob = finish(P); bind(ob, self.arm, rigid(f'forearm.{k}')); self.add(g, ob)
    # 두건: 머리보다 훨씬 큰 깊은 두건 (꼭대기가 조금 뾰족하게 뒤로 처진다), 얼굴 자리는 빛 없는 어둠
    hc = V(0, -.005, 1.62)
    P = Part(g + '.hood')
    blob(P, hc + Vector((0, .03 * s, .015 * s)), (.15 * s, .165 * s, .17 * s), cloth, None, segs=18, rings=14,
         cut=lambda co: co.y < -.07 * s and abs(co.x) < .085 * s and 1.5 * s < co.z < 1.73 * s)
    blob(P, hc + Vector((0, -.01 * s, -.01 * s)), (.11 * s, .12 * s, .13 * s), void, None, segs=14, rings=10)
    limb(P, hc + Vector((0, .06 * s, .13 * s)), hc + Vector((0, .17 * s, .2 * s)), [(0, .07 * s, .07 * s), (1, .01 * s, .01 * s)], cloth, None, segs=10)   # 처진 두건 끝
    # 두건 테두리 (두껍게 말린 천)
    for k in range(20):
        t0, t1 = k / 20 * math.pi * 2, (k + 1) / 20 * math.pi * 2
        p0 = hc + Vector((math.sin(t0) * .092 * s, -.135 * s, math.cos(t0) * .115 * s + .005 * s))
        p1 = hc + Vector((math.sin(t1) * .092 * s, -.135 * s, math.cos(t1) * .115 * s + .005 * s))
        limb(P, p0, p1, [(0, .02 * s, .02 * s), (1, .02 * s, .02 * s)], cloth2, None, segs=5)
    # 어깨를 덮는 망토 깃 (두건에서 어깨로 흘러내림)
    limb(P, V(0, .03, 1.53), V(0, .03, 1.36), [(0, .13 * s, .12 * s), (1, .24 * s, .17 * s)], cloth, None, segs=16)
    for k in range(14):
        a = rnd.uniform(0, math.tau)
        c = hc + Vector((math.cos(a) * .14 * s, .02 * s + math.sin(a) * .15 * s, rnd.uniform(-.05, .14) * s))
        if c.y < -.1 * s and abs(c.x) < .09 * s: continue
        blob(P, c, (.008 * s, .008 * s, .008 * s), ember, None, segs=6, rings=4)
    ob = finish(P); self.scale_head(ob); bind(ob, self.arm, lambda co: {'head': smooth(co.z, 1.44 * s, 1.52 * s), 'neck': 1 - smooth(co.z, 1.44 * s, 1.52 * s)}); self.add(g, ob)
    # 떨어져 나가는 재 부스러기: 왼쪽 어깨와 등 뒤로 흩어지는 조각들 (몸에서 떨어져 떠 있다)
    P = Part(g + '.flakes')
    for k in range(26):
        t = rnd.random()
        c = V(.18 + t * .22 + rnd.uniform(-.04, .04), .05 + t * .18 + rnd.uniform(-.05, .05), 1.45 + t * .18 + rnd.uniform(-.12, .1))
        rr = rnd.uniform(.007, .018) * (1 - t * .5)
        blob(P, c, (rr * s, rr * .6 * s, rr * s), cloth if k % 4 else ember, None, segs=5, rings=3)
    ob = finish(P); bind(ob, self.arm, lambda co: {'spine': 1.0}); self.add(g, ob)

# ───────── 아쉬갈 (1층 층주): 숯이 된 바위 거인. 갈라진 몸 틈으로 용암이 흐르고, 말린 숫양 뿔, 쇠사슬을 감은 가슴, 바위 어깨받이 ─────────
def ashgal(self, g):
    s, V = self.s, self.V
    rock = rmat('skin', .9, .08); lava = rmat('crest', .25, .85); dark = rmat('dark', .9, .05)
    horn = rmat('wood', .6, .25); chain = rmat('metal', .4, .55, .6); cloth = rmat('top', .9, .08)
    rnd = random.Random(23)
    def bulk(rings):
        out = []
        for c, u, v, rs, rf in rings:
            z = c.z / s
            k = 1.42 if 1.18 < z < 1.44 else 1.2 if z > 1.0 else 1.1
            out.append((c + Vector((0, -.02 * s if z > 1.2 else 0, 0)), u, v, rs * k + .02, rf * k * 1.1 + .02))
        return out
    self.torso(g, rock, cloth, hem=.98, extra=bulk)
    self.arms(g, None); self.hands(g); self.legs(g, rock, dark, foot=1.25)
    P = Part(g + '.armor')
    # 바위 어깨받이와 가슴 바위판
    for sx in (1, -1):
        blob(P, V(sx * .27, .0, 1.42), (.13 * s, .12 * s, .09 * s), dark, None, segs=12, rings=8)
        blob(P, V(sx * .3, -.02, 1.46), (.08 * s, .07 * s, .05 * s), rock, None, segs=10, rings=6)
    blob(P, V(0, -.14, 1.3), (.2 * s, .06 * s, .12 * s), rock, None, segs=12, rings=8)
    # 가슴을 엇갈려 감은 쇠사슬
    for (a0, a1) in (((-.25, 1.44), (.2, 1.0)), ((.25, 1.44), (-.2, 1.0))):
        for n in range(11):
            t = n / 10
            x = a0[0] + (a1[0] - a0[0]) * t; z = a0[1] + (a1[1] - a0[1]) * t
            blob(P, V(x, -.2 + abs(x) * .25, z), (.022 * s, .012 * s, .03 * s), chain, None, segs=6, rings=4)
    # 허리: 사슬 띠 + 해진 가죽 앞자락
    limb(P, V(0, 0, 1.0), V(0, 0, .94), [(0, .2 * s, .17 * s), (1, .2 * s, .17 * s)], chain, None, segs=16)
    limb(P, V(0, -.17, .96), V(0, -.19, .62), [(0, .1, .02), (1, .085, .014)], cloth, None, segs=5)
    limb(P, V(0, .17, .96), V(0, .19, .66), [(0, .1, .02), (1, .085, .014)], cloth, None, segs=5)
    # 용암 틈: 몸 앞뒤로 갈라진 빛나는 금
    for k in range(26):
        c, a, z = _surf(V, s, rnd, .98, 1.42, .2)
        d = Vector((rnd.uniform(-.05, .05), 0, rnd.uniform(-.08, -.03)))
        limb(P, c, c + d * s, [(0, .008, .008), (1, .005, .005)], lava, None, segs=4)
    ob = finish(P); bind(ob, self.arm, _spine_w(s)); self.add(g, ob)
    for k in 'LR':   # 팔·다리의 용암 금
        for bn in (f'upper_arm.{k}', f'forearm.{k}', f'thigh.{k}', f'shin.{k}'):
            a, b = self.bones[bn][0], self.bones[bn][1]
            P = Part(f'{g}.crack.{bn}')
            for n in range(3):
                t = .2 + n * .25
                c = a + (b - a) * t + Vector((rnd.uniform(-.03, .03), -.045, 0))
                limb(P, c, c + (b - a) * .12, [(0, .007, .007), (1, .004, .004)], lava, None, segs=4)
            ob = finish(P); bind(ob, self.arm, rigid(bn)); self.add(g, ob)
    # 머리: 어깨 사이에 파묻힌 작은 머리, 툭 튀어나온 눈두덩, 빛나는 눈 틈, 용암이 끓는 입, 크게 말린 숫양 뿔 둘
    hc = V(0, -.04, 1.56)
    P = Part(g + '.head')
    blob(P, hc, (.095 * s, .1 * s, .1 * s), rock, None, segs=14, rings=10)
    blob(P, hc + Vector((0, -.07 * s, .035 * s)), (.09 * s, .04 * s, .025 * s), dark, None, segs=10, rings=6)   # 눈두덩
    for sx in (1, -1):
        limb(P, hc + Vector((sx * .02 * s, -.095 * s, .012 * s)), hc + Vector((sx * .06 * s, -.088 * s, .02 * s)), [(0, .009, .007), (1, .007, .005)], lava, None, segs=4)
    blob(P, hc + Vector((0, -.09 * s, -.045 * s)), (.05 * s, .02 * s, .022 * s), dark, None, segs=10, rings=6)
    blob(P, hc + Vector((0, -.098 * s, -.045 * s)), (.035 * s, .01 * s, .012 * s), lava, None, segs=8, rings=5)
    for sx in (1, -1):   # 숫양 뿔: 옆머리에서 뒤로 돌아 앞으로 말린다
        pts = []
        for n in range(13):
            a = n / 12 * math.pi * 1.55
            r = (.15 - n * .006) * s
            pts.append(hc + Vector((sx * (.09 * s + math.sin(a) * .1 * s), (.0 + math.cos(a) * -r + r) * .9 - .02 * s, .07 * s + math.sin(a * .9) * r * .9)))
        for n in range(12):
            w0 = (.055 - n * .004) * s
            limb(P, pts[n], pts[n + 1], [(0, w0, w0), (1, w0 * .93, w0 * .93)], horn, None, segs=7)
    for k in range(7):   # 정수리의 불씨 갈기
        c = hc + Vector(((k - 3) * .018 * s, .03 * s, .095 * s))
        limb(P, c, c + Vector((0, .03 * s, (.05 + (k % 3) * .025) * s)), [(0, .012, .012), (1, .002, .002)], lava, None, segs=4)
    ob = finish(P); bind(ob, self.arm, lambda co: {'head': smooth(co.z, 1.44 * s, 1.5 * s), 'spine': 1 - smooth(co.z, 1.44 * s, 1.5 * s)}); self.add(g, ob)

# ───────── 구르마 (2층 층주): 굶주린 프렛의 왕. 산처럼 부푼 배, 바늘처럼 가는 목, 바늘구멍 입, 막대 같은 팔다리 ─────────
def gurma(self, g):
    s, V = self.s, self.V
    flesh = rmat('skin', .55, .3); flesh2 = rmat('top', .6, .25); dark = rmat('dark', .85, .08); glow = rmat('crest', .3, .7); cloth = rmat('bottom', .9, .08)
    nk = self.p.get('neck', 0)
    def starved(rings):
        return [(c, u, v, rs * .82, rf * .72) for c, u, v, rs, rf in rings]
    self.torso(g, flesh, flesh, hem=0, extra=starved)
    self.arms(g, None); self.hands(g); self.legs(g, flesh, flesh, foot=.7)
    P = Part(g + '.belly')
    # 산 같은 배: 앞으로 쏟아질 듯 늘어졌다 (튼살·핏줄·배꼽)
    bc = V(0, -.15, .98)
    blob(P, bc + Vector((0, .02 * s, .12 * s)), (.24 * s, .22 * s, .2 * s), flesh, None, segs=20, rings=14)       # 갈비 아래에서 부풀기 시작
    blob(P, bc, (.34 * s, .3 * s, .28 * s), flesh, None, segs=24, rings=16)
    blob(P, bc + Vector((0, -.07 * s, -.2 * s)), (.33 * s, .3 * s, .2 * s), flesh, None, segs=24, rings=14)   # 앞으로 쏟아져 처진 아랫배
    limb(P, bc + Vector((-.3 * s, -.12 * s, -.3 * s)), bc + Vector((.3 * s, -.12 * s, -.3 * s)), [(0, .02, .02), (.5, .03, .03), (1, .02, .02)], dark, None, segs=6)   # 접힌 살 그늘
    blob(P, bc + Vector((0, -.3 * s, -.02 * s)), (.024 * s, .01 * s, .028 * s), dark, None, segs=8, rings=5)   # 배꼽
    rnd = random.Random(5)
    for k in range(18):   # 튼살과 핏줄 (배 겉면을 따라)
        a = rnd.uniform(-math.pi * .95, -math.pi * .05); z0 = rnd.uniform(-.15, .15)
        p0 = bc + Vector((math.cos(a) * .342 * s, math.sin(a) * .302 * s, z0 * s))
        p1 = bc + Vector((math.cos(a + .12) * .338 * s, math.sin(a + .12) * .3 * s, (z0 - .08) * s))
        limb(P, p0, p1, [(0, .006, .006), (1, .004, .004)], flesh2 if k % 3 else dark, None, segs=4)
    for z in (1.27, 1.31, 1.35, 1.39):   # 배 위로 드러난 갈비뼈
        limb(P, V(-.09, -.08, z), V(.09, -.08, z), [(0, .007, .007), (.5, .008, .008), (1, .007, .007)], dark, None, segs=4)
    limb(P, V(0, 0, .74), V(0, 0, .66), [(0, .14 * s, .12 * s), (1, .15 * s, .13 * s)], cloth, None, segs=12)   # 배 밑에 깔린 누더기
    ob = finish(P); bind(ob, self.arm, _spine_w(s)); self.add(g, ob)
    # 바늘처럼 가는 긴 목 + 작은 머리 (꺼진 눈 속 빛, 바늘구멍 입에서 흐르는 침)
    P = Part(g + '.neck')
    limb(P, V(0, .0, 1.38), V(0, -.03, 1.55 + nk), [(0, .03 * s, .03 * s), (.5, .018 * s, .018 * s), (1, .022 * s, .022 * s)], flesh, None, segs=10)
    ob = finish(P); bind(ob, self.arm, lambda co: {'neck': 1.0}); self.add(g, ob)
    hc = V(0, -.03, 1.62 + nk)
    P = Part(g + '.head')
    blob(P, hc, (.08 * s, .088 * s, .1 * s), flesh, None, segs=14, rings=10)
    for sx in (1, -1):
        blob(P, hc + Vector((sx * .03 * s, -.078 * s, .014 * s)), (.022 * s, .014 * s, .022 * s), dark, None, segs=8, rings=5)
        blob(P, hc + Vector((sx * .03 * s, -.088 * s, .014 * s)), (.008 * s, .005 * s, .008 * s), glow, None, segs=6, rings=4)
    blob(P, hc + Vector((0, -.09 * s, -.05 * s)), (.005 * s, .004 * s, .005 * s), dark, None, segs=6, rings=4)
    limb(P, hc + Vector((0, -.092 * s, -.055 * s)), hc + Vector((0, -.1 * s, -.15 * s)), [(0, .004, .004), (1, .006, .006)], glow, None, segs=4)   # 침
    for k in range(11):
        a = (k - 5) / 5
        root = hc + Vector((a * .06 * s, (.03 + abs(a) * .03) * s, .085 * s - abs(a) * .02 * s))
        limb(P, root, root + Vector((a * .05 * s, .07 * s, -(.25 + (k % 3) * .08) * s)), [(0, .007, .007), (1, .002, .002)], dark, None, segs=4)
    ob = finish(P); bind(ob, self.arm, lambda co: {'head': 1.0}); self.add(g, ob)
    for k in 'LR':   # 긴 손가락 (움켜쥐려는)
        wr, hd = self.bones[f'forearm.{k}'][1], self.bones[f'hand.{k}'][1]
        P = Part(f'{g}.fingers.{k}')
        for f in range(4):
            c = hd + Vector(((f - 1.5) * .014, -.01, 0))
            limb(P, c, c + Vector(((f - 1.5) * .01, -.03, -.09)), [(0, .006, .006), (1, .002, .002)], flesh, None, segs=4)
        ob = finish(P); bind(ob, self.arm, rigid(f'hand.{k}')); self.add(g, ob)

# ───────── 불씨 망자 (1층): 숯이 된 몸, 머리에서 타오르는 불길, 갈비 사이로 이글거리는 가슴 ─────────
def cinder(self, g):
    s, V = self.s, self.V
    char = rmat('skin', .9, .06); fire = rmat('crest', .25, .9); dark = rmat('dark', .9, .05); cloth = rmat('top', .9, .08)
    rnd = random.Random(31)
    def gaunt(rings):
        return [(c, u, v, rs * .86, rf * .78) for c, u, v, rs, rf in rings]
    self.torso(g, char, char, hem=0, extra=gaunt)
    self.arms(g, None); self.hands(g); self.legs(g, char, dark, foot=.8)
    P = Part(g + '.chest')
    blob(P, V(0, -.07, 1.24), (.08 * s, .03 * s, .09 * s), fire, None, segs=10, rings=7)   # 가슴 속 불덩이
    for z in (1.34, 1.29, 1.24, 1.19, 1.14):   # 그 앞을 가로지르는 숯 갈비
        limb(P, V(-.1, -.1, z), V(.1, -.1, z), [(0, .01, .01), (.5, .012, .012), (1, .01, .01)], char, None, segs=4)
    limb(P, V(0, 0, .96), V(0, 0, .86), [(0, .1 * s, .08 * s), (1, .11 * s, .085 * s)], cloth, None, segs=12)
    for k in range(18):   # 몸의 불씨 틈
        c, a, z = _surf(V, s, rnd, .9, 1.4, .13)
        limb(P, c, c + Vector((0, 0, -.05 * s)), [(0, .005, .005), (1, .003, .003)], fire, None, segs=4)
    ob = finish(P); bind(ob, self.arm, _spine_w(s)); self.add(g, ob)
    hc = V(0, -.005, 1.615)
    P = Part(g + '.head')
    blob(P, hc, (.088 * s, .098 * s, .112 * s), char, None, segs=14, rings=10)
    for sx in (1, -1):
        blob(P, hc + Vector((sx * .033 * s, -.09 * s, .01 * s)), (.016 * s, .008 * s, .014 * s), fire, None, segs=8, rings=5)
    blob(P, hc + Vector((0, -.095 * s, -.05 * s)), (.032 * s, .01 * s, .016 * s), fire, None, segs=8, rings=5)
    for k in range(11):   # 머리 위로 타오르는 불길 (혀처럼 갈라져 위로)
        a = (k / 11) * math.tau
        root = hc + Vector((math.cos(a) * .06 * s, math.sin(a) * .06 * s, .07 * s))
        L = (.12 + (k % 4) * .05) * s
        limb(P, root, root + Vector((math.cos(a) * .03 * s, math.sin(a) * .03 * s + .02 * s, L)), [(0, .03 * s, .03 * s), (.6, .015 * s, .015 * s), (1, .002 * s, .002 * s)], fire, None, segs=6)
    ob = finish(P); self.scale_head(ob); bind(ob, self.arm, lambda co: {'head': 1.0}); self.add(g, ob)
    for k in 'LR':   # 불붙은 손
        wr, hd = self.bones[f'forearm.{k}'][1], self.bones[f'hand.{k}'][1]
        P = Part(f'{g}.flame.{k}')
        for n in range(4):
            c = (wr + hd) / 2 + Vector(((n - 1.5) * .012, 0, .02))
            limb(P, c, c + Vector((0, .01, .06 + (n % 2) * .03)), [(0, .012, .012), (1, .002, .002)], fire, None, segs=4)
        ob = finish(P); bind(ob, self.arm, rigid(f'hand.{k}')); self.add(g, ob)

# ───────── 늪 망자 (2층): 물에 불어 터질 듯한 시체. 퉁퉁 부은 몸과 얼굴, 작은 눈, 벌린 입, 몸에 엉킨 늪 풀 ─────────
def bloat(self, g):
    s, V = self.s, self.V
    flesh = rmat('skin', .45, .35); weed = rmat('top', .9, .08); dark = rmat('dark', .85, .08); cloth = rmat('bottom', .9, .08); glow = rmat('crest', .3, .7)
    rnd = random.Random(41)
    def swell(rings):
        out = []
        for c, u, v, rs, rf in rings:
            z = c.z / s
            k = 1.45 if .95 < z < 1.3 else 1.25
            out.append((c + Vector((0, -.02 * s, 0)), u, v, rs * k + .02, rf * k * 1.15 + .02))
        return out
    self.torso(g, flesh, cloth, hem=.95, extra=swell)
    self.arms(g, None); self.hands(g); self.legs(g, cloth, flesh, bare_below=flesh, foot=1.05)
    P = Part(g + '.swell')
    blob(P, V(0, -.12, 1.08), (.2 * s, .14 * s, .18 * s), flesh, None, segs=16, rings=12)   # 부푼 배
    for k in range(20):   # 물집과 검푸른 반점
        c, a, z = _surf(V, s, rnd, .95, 1.38, .21)
        rr = rnd.uniform(.012, .03)
        blob(P, c, (rr * s, rr * .7 * s, rr * s), dark if k % 3 == 0 else flesh, None, segs=7, rings=5)
    for k in range(12):   # 어깨와 목에서 늘어진 늪 풀
        a = rnd.uniform(0, math.tau)
        top = V(math.cos(a) * .18, math.sin(a) * .13, 1.42)
        limb(P, top, top + Vector((math.cos(a) * .03, math.sin(a) * .03, -rnd.uniform(.2, .45) * s)), [(0, .014, .006), (1, .006, .003)], weed, None, segs=4)
    ob = finish(P); bind(ob, self.arm, _spine_w(s)); self.add(g, ob)
    hc = V(0, -.01, 1.6)
    P = Part(g + '.head')
    blob(P, hc, (.11 * s, .115 * s, .115 * s), flesh, None, segs=14, rings=10)   # 퉁퉁 부은 머리
    for sx in (1, -1):
        blob(P, hc + Vector((sx * .04 * s, -.1 * s, .02 * s)), (.016 * s, .008 * s, .01 * s), dark, None, segs=6, rings=4)
        blob(P, hc + Vector((sx * .04 * s, -.105 * s, .02 * s)), (.006 * s, .004 * s, .005 * s), glow, None, segs=5, rings=3)
        blob(P, hc + Vector((sx * .065 * s, -.085 * s, -.03 * s)), (.035 * s, .025 * s, .03 * s), flesh, None, segs=8, rings=5)   # 부은 볼
    blob(P, hc + Vector((0, -.1 * s, -.055 * s)), (.035 * s, .015 * s, .03 * s), dark, None, segs=8, rings=5)   # 벌린 입
    for k in range(8):   # 머리에 엉킨 풀
        a = (k / 8) * math.tau
        root = hc + Vector((math.cos(a) * .08 * s, math.sin(a) * .08 * s + .02 * s, .08 * s))
        limb(P, root, root + Vector((math.cos(a) * .05 * s, math.sin(a) * .04 * s + .04 * s, -rnd.uniform(.1, .25) * s)), [(0, .012, .005), (1, .005, .002)], weed, None, segs=4)
    ob = finish(P); self.scale_head(ob); bind(ob, self.arm, lambda co: {'head': 1.0}); self.add(g, ob)

# ───────── 탐식귀 (2층): 두꺼비 같은 거구. 머리를 가로지르는 거대한 아가리(이빨), 머리 꼭대기의 튀어나온 눈, 사마귀, 짧고 굵은 다리 ─────────
def glutton(self, g):
    s, V = self.s, self.V
    flesh = rmat('skin', .5, .3); belly = rmat('top', .6, .25); dark = rmat('dark', .85, .08); tooth = rmat('parrot', .4, .45); glow = rmat('crest', .3, .7); cloth = rmat('bottom', .9, .08)
    rnd = random.Random(51)
    def toad(rings):
        out = []
        for c, u, v, rs, rf in rings:
            z = c.z / s
            k = 1.5 if z < 1.25 else 1.3
            out.append((c + Vector((0, -.03 * s, 0)), u, v, rs * k + .03, rf * k * 1.2 + .03))
        return out
    self.torso(g, flesh, cloth, hem=.94, extra=toad)
    self.arms(g, None); self.hands(g); self.legs(g, flesh, dark, foot=1.35)
    P = Part(g + '.belly')
    blob(P, V(0, -.16, 1.05), (.24 * s, .16 * s, .22 * s), belly, None, segs=16, rings=12)
    for k in range(30):   # 사마귀
        c, a, z = _surf(V, s, rnd, .95, 1.45, .25)
        if math.sin(a) < -.6 and z < 1.25: continue
        rr = rnd.uniform(.01, .025)
        blob(P, c, (rr * s, rr * s, rr * s), flesh if k % 2 else dark, None, segs=6, rings=4)
    limb(P, V(0, 0, .97), V(0, 0, .88), [(0, .24 * s, .2 * s), (1, .25 * s, .21 * s)], cloth, None, segs=14)
    ob = finish(P); bind(ob, self.arm, _spine_w(s)); self.add(g, ob)
    # 어깨에 파묻힌 넓적한 머리: 귀까지 찢어진 아가리, 위아래 이빨, 꼭대기 눈 둘
    hc = V(0, -.06, 1.52)
    P = Part(g + '.head')
    blob(P, hc, (.17 * s, .15 * s, .11 * s), flesh, None, segs=16, rings=12)
    blob(P, hc + Vector((0, -.12 * s, -.02 * s)), (.15 * s, .04 * s, .03 * s), dark, None, segs=14, rings=8)
    for row in (1, -1):
        for k in range(12):
            x = (k - 5.5) / 5.5 * .13
            base = hc + Vector((x * s, -.14 * s + abs(x) * .2 * s, (-.02 + row * .022) * s))
            limb(P, base, base + Vector((0, -.01 * s, -row * .03 * s)), [(0, .01 * s, .01 * s), (1, .002 * s, .002 * s)], tooth, None, segs=4)
    for sx in (1, -1):
        blob(P, hc + Vector((sx * .07 * s, -.04 * s, .1 * s)), (.04 * s, .04 * s, .04 * s), flesh, None, segs=10, rings=7)
        blob(P, hc + Vector((sx * .07 * s, -.075 * s, .11 * s)), (.022 * s, .012 * s, .022 * s), glow, None, segs=8, rings=5)
    for k in range(4):   # 턱에서 흐르는 침
        x = (k - 1.5) * .05
        limb(P, hc + Vector((x * s, -.14 * s, -.045 * s)), hc + Vector((x * s, -.15 * s, -.15 * s)), [(0, .006, .006), (1, .009, .009)], belly, None, segs=4)
    ob = finish(P); bind(ob, self.arm, lambda co: {'head': smooth(co.z, 1.4 * s, 1.46 * s), 'spine': 1 - smooth(co.z, 1.4 * s, 1.46 * s)}); self.add(g, ob)

# ───────── 흥정꾼 (3층): 키 크고 마른 상인 망자. 발목까지 오는 검은 코트(금빛 안감), 웃는 얼굴이 그려진 하얀 가면, 높은 모자, 엽전 목걸이, 왼손에 주판 ─────────
def hawker(self, g):
    s, V = self.s, self.V
    coat = rmat('top', .8, .15); lining = rmat('metal', .35, .55, .5); mask = rmat('bandage', .35, .45); dark = rmat('dark', .85, .08)
    paint = rmat('crest', .5, .3); skin = rmat('skin', .7, .2); wood = rmat('wood', .6, .2)
    nk = self.p.get('neck', 0)
    def thin(rings):
        return [(c, u, v, rs * .9, rf * .85) for c, u, v, rs, rf in rings]
    self.torso(g, coat, coat, hem=0, extra=thin)
    self.arms(g, coat, 1.9, cuff=True, wide=1.05); self.hands(g, skin); self.legs(g, dark, dark)
    P = Part(g + '.coat')
    rings = []
    for z, rx, ry in ((1.0, .15, .11), (.75, .17, .125), (.5, .19, .14), (.25, .2, .15), (.1, .205, .155)):
        rings.append((V(0, .01, z), Vector((0, -1, 0)), Vector((1, 0, 0)), rx * s, ry * s))
    loft(P, rings, coat, None, segs=16, caps=(False, False), matfn=None)
    limb(P, V(-.02, -.15, 1.38), V(-.04, -.205, .1), [(0, .012, .012), (1, .016, .016)], lining, None, segs=5)   # 앞여밈의 금빛 안감
    limb(P, V(.02, -.15, 1.38), V(.04, -.205, .1), [(0, .012, .012), (1, .016, .016)], lining, None, segs=5)
    for n in range(13):   # 엽전 목걸이 (구멍 뚫린 동전)
        t = n / 12 * 2 - 1
        blob(P, V(t * .1, -.12 - (1 - t * t) * .03, 1.42 - (1 - t * t) * .1), (.014, .006, .014), lining, None, segs=8, rings=4)
    ob = finish(P); bind(ob, self.arm, _spine_w(s)); self.add(g, ob)
    P = Part(g + '.neck')
    limb(P, V(0, .005, 1.4), V(0, .005, 1.53 + nk), [(0, .04 * s, .04 * s), (1, .036 * s, .036 * s)], skin, None)
    ob = finish(P); bind(ob, self.arm, lambda co: {'neck': 1.0}); self.add(g, ob)
    hc = V(0, -.005, 1.615 + nk)
    P = Part(g + '.head')
    blob(P, hc, (.085 * s, .095 * s, .11 * s), skin, None, segs=14, rings=10)
    blob(P, hc + Vector((0, -.03 * s, 0)), (.09 * s, .085 * s, .115 * s), mask, None, segs=16, rings=12, cut=lambda co: co.y > -.02 * s)   # 하얀 가면 (얼굴 앞)
    for sx in (1, -1):   # 초승달 눈구멍 + 그려진 뺨
        limb(P, hc + Vector((sx * .015 * s, -.105 * s, .02 * s)), hc + Vector((sx * .055 * s, -.098 * s, .03 * s)), [(0, .006, .004), (1, .005, .003)], dark, None, segs=4)
        blob(P, hc + Vector((sx * .055 * s, -.1 * s, -.025 * s)), (.016 * s, .004 * s, .01 * s), paint, None, segs=6, rings=4)
    for n in range(9):   # 귀까지 올라간 웃는 입 (붉게 그린)
        t = n / 8 * 2 - 1
        a = hc + Vector((t * .055 * s, -.106 * s + abs(t) * .012 * s, (-.05 + t * t * .025) * s))
        blob(P, a, (.008 * s, .004 * s, .005 * s), paint, None, segs=5, rings=3)
    # 높은 모자: 챙 + 원통 + 엽전 띠
    limb(P, hc + Vector((0, 0, .08 * s)), hc + Vector((0, 0, .09 * s)), [(0, .17 * s, .17 * s), (1, .17 * s, .17 * s)], dark, None, segs=16)
    limb(P, hc + Vector((0, 0, .08 * s)), hc + Vector((0, 0, .3 * s)), [(0, .095 * s, .095 * s), (1, .09 * s, .09 * s)], dark, None, segs=14)
    limb(P, hc + Vector((0, 0, .11 * s)), hc + Vector((0, 0, .135 * s)), [(0, .098 * s, .098 * s), (1, .098 * s, .098 * s)], lining, None, segs=14)
    ob = finish(P); bind(ob, self.arm, lambda co: {'head': 1.0}); self.add(g, ob)
    # 왼손의 주판
    wr, hd = self.bones['forearm.L'][1], self.bones['hand.L'][1]
    c = (wr + hd) / 2 + Vector((.03, -.02, -.02))
    P = Part(g + '.abacus')
    for dz in (-.07, .07):
        limb(P, c + Vector((0, -.1, dz)), c + Vector((0, .06, dz)), [(0, .01, .01), (1, .01, .01)], wood, None, segs=4)
    for dy in (-.09, .05):
        limb(P, c + Vector((0, dy, -.07)), c + Vector((0, dy, .07)), [(0, .01, .01), (1, .01, .01)], wood, None, segs=4)
    for row in range(4):
        z = -.045 + row * .03
        limb(P, c + Vector((0, -.09, z)), c + Vector((0, .05, z)), [(0, .003, .003), (1, .003, .003)], dark, None, segs=3)
        for b in range(4):
            blob(P, c + Vector((0, -.07 + b * .03 + (row % 2) * .01, z)), (.012, .01, .009), lining if b % 2 else paint, None, segs=6, rings=4)
    ob = finish(P); bind(ob, self.arm, rigid('hand.L')); self.add(g, ob)

# ───────── 빚쟁이 해골 (3층): 어깨에 멘 쇠 멍에 양 끝에 엽전 자루, 목과 손목의 족쇄와 늘어진 사슬, 목에 건 빚 문서 ─────────
def debtor(self, g):
    s, V = self.s, self.V
    self.bones_body(g)
    metal = rmat('metal', .4, .55, .6); sack = rmat('top', .9, .08); paper = rmat('bandage', .6, .2); dark = rmat('dark', .85, .08)
    P = Part(g + '.yoke')
    limb(P, V(-.34, .03, 1.46), V(.34, .03, 1.46), [(0, .022 * s, .03 * s), (.5, .028 * s, .036 * s), (1, .022 * s, .03 * s)], metal, None, segs=6)
    for sx in (1, -1):
        limb(P, V(sx * .34, .03, 1.46), V(sx * .34, .03, 1.2), [(0, .006, .006), (1, .006, .006)], metal, None, segs=4)
        blob(P, V(sx * .34, .03, 1.12), (.075 * s, .07 * s, .09 * s), sack, None, segs=10, rings=8)
        blob(P, V(sx * .34, .03, 1.2), (.03 * s, .03 * s, .02 * s), dark, None, segs=8, rings=5)
    limb(P, V(0, .0, 1.47), V(0, .0, 1.44), [(0, .055 * s, .055 * s), (1, .055 * s, .055 * s)], metal, None, segs=10)   # 목의 족쇄
    for n in range(7):   # 목에서 가슴으로 늘어진 사슬과 빚 문서
        blob(P, V(0, -.06 - n * .004, 1.4 - n * .035), (.012, .008, .016), metal, None, segs=6, rings=4)
    blob(P, V(0, -.08, 1.12), (.05 * s, .008 * s, .065 * s), paper, None, segs=6, rings=4)
    for n in range(3): limb(P, V(-.03, -.09, 1.15 - n * .025), V(.03, -.09, 1.15 - n * .025), [(0, .003, .003), (1, .003, .003)], dark, None, segs=3)
    ob = finish(P); bind(ob, self.arm, _spine_w(s)); self.add(g, ob)
    for k in 'LR':
        el, wr = self.bones[f'forearm.{k}'][0], self.bones[f'forearm.{k}'][1]
        P = Part(f'{g}.shackle.{k}')
        limb(P, el + (wr - el) * .82, el + (wr - el) * .95, [(0, .035, .035), (1, .035, .035)], metal, None, segs=10)
        for n in range(5):
            blob(P, el + (wr - el) * .9 + Vector((0, .01, -.03 - n * .03)), (.01, .007, .014), metal, None, segs=6, rings=4)
        ob = finish(P); bind(ob, self.arm, rigid(f'forearm.{k}')); self.add(g, ob)


# ───────── 도르칸 (4층 층주, 24차): 용광로의 집행자 — 사용자 컨셉 그림. 뿔 달린 검은 가시 갑옷, 해골 얼굴에 붉은 눈,
#            어깨·팔뚝마다 굽은 가시, 갑옷 틈으로 달아오른 금, 해진 검붉은 망토 ─────────
def forgeknight(self, g):
    s, V = self.s, self.V
    iron = rmat('skin', .55, .45, .7); plate = rmat('dark', .5, .5, .6); glow = rmat('crest', .25, .85)
    spike = rmat('metal', .35, .6, .8); cape = rmat('top', .9, .05); bone = rmat('bandage', .45, .35); horn = rmat('wood', .5, .3)
    rnd = random.Random(41)
    def bulk(rings):
        out = []
        for c, u, v, rs, rf in rings:
            z = c.z / s
            k = 1.3 if 1.15 < z < 1.46 else 1.12
            out.append((c, u, v, rs * k + .015, rf * k + .015))
        return out
    self.torso(g, iron, plate, hem=.98, extra=bulk)
    self.arms(g, None); self.hands(g); self.legs(g, iron, plate, foot=1.2)
    P = Part(g + '.armor')
    # 어깨받이: 겹친 판 위로 뒤로 굽은 가시 셋씩
    for sx in (1, -1):
        blob(P, V(sx * .26, .0, 1.43), (.13 * s, .12 * s, .08 * s), plate, None, segs=12, rings=8)
        for k in range(3):
            b0 = V(sx * (.22 + k * .05), .02, 1.48 + k * .01)
            limb(P, b0, b0 + Vector((sx * .05, .04, .16 + k * .03)) * s, [(0, .028, .028), (1, .002, .002)], spike, None, segs=6)
    # 가슴판: 가운데 능선 + 비늘처럼 겹친 판 + 심장 자리의 달아오른 틈
    blob(P, V(0, -.15, 1.28), (.19 * s, .06 * s, .14 * s), plate, None, segs=12, rings=8)
    for k in range(5):
        limb(P, V(-.15, -.19, 1.36 - k * .07), V(.15, -.19, 1.36 - k * .07), [(0, .012, .01), (1, .012, .01)], spike, None, segs=5)
    limb(P, V(-.03, -.2, 1.34), V(.02, -.21, 1.18), [(0, .016, .012), (1, .008, .006)], glow, None, segs=5)
    # 허리의 가시 띠와 쇠사슬 고리, 무릎까지 내려오는 비늘 앞자락
    limb(P, V(0, 0, 1.0), V(0, 0, .93), [(0, .21 * s, .17 * s), (1, .21 * s, .17 * s)], plate, None, segs=16)
    for k in range(8):
        a = k / 8 * math.pi * 2
        c = V(math.cos(a) * .2, math.sin(a) * .16, .97)
        limb(P, c, c + Vector((math.cos(a) * .06, math.sin(a) * .05, .0)) * s, [(0, .016, .016), (1, .002, .002)], spike, None, segs=5)
    limb(P, V(0, -.17, .95), V(0, -.2, .58), [(0, .12, .02), (1, .1, .015)], plate, None, segs=5)
    # 해진 검붉은 망토: 어깨 뒤에서 땅 가까이까지, 끝이 찢겨 갈라진다
    for k in range(9):
        x0 = (k - 4) * .055
        top = V(x0 * 1.1, .14, 1.44)
        low = V(x0 * 1.6 + rnd.uniform(-.03, .03), .26 + abs(x0) * .3, .12 + rnd.uniform(0, .18))
        limb(P, top, low, [(0, .06, .012), (.7, .05, .01), (1, .02, .006)], cape, None, segs=4)
    # 갑옷 틈의 용암 금
    for k in range(18):
        c, a, z = _surf(V, s, rnd, .98, 1.42, .2)
        d = Vector((rnd.uniform(-.04, .04), 0, rnd.uniform(-.07, -.03)))
        limb(P, c, c + d * s, [(0, .006, .006), (1, .004, .004)], glow, None, segs=4)
    ob = finish(P); bind(ob, self.arm, _spine_w(s)); self.add(g, ob)
    for k in 'LR':   # 팔뚝·정강이의 굽은 가시
        for bn in (f'forearm.{k}', f'shin.{k}'):
            a, b = self.bones[bn][0], self.bones[bn][1]
            P = Part(f'{g}.spk.{bn}')
            for n in range(2):
                c = a + (b - a) * (.35 + n * .3) + Vector((0, .05, 0))
                limb(P, c, c + Vector((0, .08, .05)) * s, [(0, .02, .02), (1, .002, .002)], spike, None, segs=5)
            ob = finish(P); bind(ob, self.arm, rigid(bn)); self.add(g, ob)
    # 머리: 해골 얼굴(이빨) · 붉게 빛나는 눈구멍 · 왕관처럼 솟은 가시 · 크게 휜 뿔 둘
    hc = V(0, -.03, 1.58)
    P = Part(g + '.head')
    blob(P, hc, (.1 * s, .105 * s, .11 * s), plate, None, segs=14, rings=10)          # 투구
    blob(P, hc + Vector((0, -.075 * s, -.01 * s)), (.07 * s, .035 * s, .075 * s), bone, None, segs=10, rings=8)   # 해골 얼굴
    for sx in (1, -1):
        blob(P, hc + Vector((sx * .028 * s, -.105 * s, .015 * s)), (.016 * s, .008 * s, .012 * s), glow, None, segs=8, rings=5)
    for k in range(5):
        blob(P, hc + Vector(((k - 2) * .014 * s, -.108 * s, -.05 * s)), (.006 * s, .006 * s, .01 * s), bone, None, segs=6, rings=4)
    for k in range(5):   # 왕관 가시
        c = hc + Vector(((k - 2) * .03 * s, -.01 * s, .09 * s))
        limb(P, c, c + Vector((0, .01, .07 + (2 - abs(k - 2)) * .03)) * s, [(0, .016, .016), (1, .002, .002)], spike, None, segs=5)
    for sx in (1, -1):   # 큰 뿔: 옆머리에서 바깥 위로 솟았다 안으로 휜다
        pts = [hc + Vector((sx * (.09 + n * .022) * s, .01 * s, (.03 + n * .028 - (n / 9) ** 2 * .05) * s)) for n in range(10)]
        for n in range(9):
            w0 = (.04 - n * .004) * s
            limb(P, pts[n], pts[n + 1], [(0, w0, w0), (1, max(.003, w0 * .9), max(.003, w0 * .9))], horn, None, segs=7)
    ob = finish(P); bind(ob, self.arm, lambda co: {'head': smooth(co.z, 1.44 * s, 1.5 * s), 'spine': 1 - smooth(co.z, 1.44 * s, 1.5 * s)}); self.add(g, ob)

NEW = {'ashwraith': ashwraith, 'ashgal': ashgal, 'gurma': gurma, 'cinder': cinder, 'bloat': bloat, 'glutton': glutton, 'hawker': hawker, 'forgeknight': forgeknight}
import dreambodies   # 37차: 서큐버스 · 아큐버스
NEW.update(dreambodies.NEW)
