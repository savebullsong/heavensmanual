"""43차: 주요 인물 전용 몸 더 — 황색날개(yw) · 마스크 팔이 소녀(mg) · 대장장이 칼드렉(kd) · 환전상 오볼로(ob) · 천사 노을(no) · 인형술사 마리(mr)
그리고 지옥 5층 가면의 도시 — 가면귀(gm) · 속삭임꾼(ws) · 인형병사(ip) · 층주 마르시온(mc) · 필드 보스 마네트(mn)
유내 세 시절은 사용자가 올린 도트 세 장에 맞춰 다시 (10대 긴 생머리·앞머리 · 짙은 갈색 맨투맨 · 청바지 / 20대 올림머리 · 검은 반팔 · 주머니에 손 / 30대 후반 낮게 묶은 머리 · 갈색 긴소매 · 연청바지)
색은 게임이 입힌다 — 살 1 · 머리 2 · 윗옷 3 · 아래 4 · 신 5 · 눈 6 · 앞치마 7 · 안감 9 · 흰 천 10 · 빛 12 · 나무 13 · 금속 14 · 검정 15"""
import math, random
from mathutils import Vector
from rig import Part, loft, limb, blob, finish, bind, smooth, rigid, autow
from dreambodies import rmat, _spine_w, arcloft, gown_w, _skirt, _head_tools, _long_hair, _sleeves, _halo, _bangs


def _hold(self, g, k, name, build):
    """손에 단단히 붙은 물건 (손뼈를 따라 움직인다)"""
    P = Part(f'{g}.{name}')
    wr, hd = self.bones[f'forearm.{k}'][1], self.bones[f'hand.{k}'][1]
    build(P, (wr + hd) / 2, hd - wr)
    ob = finish(P); bind(ob, self.arm, rigid(f'hand.{k}'), subsurf=0); self.add(g, ob)


def _mask_face(self, P, white, dark, paint, smile=True, crack=None):
    """얼굴을 덮는 흰 가면 (눈구멍 · 그린 웃음)"""
    hc0, hs = _head_tools(self)
    s, V = self.s, self.V
    blob(P, hs(V(0, -.098, 1.615)), (.084 * s, .03 * s, .1 * s), white, None, segs=14, rings=10)
    for sx in (1, -1):
        blob(P, hs(V(sx * .034, -.124, 1.638)), (.016 * s, .006 * s, .009 * s), dark, None, segs=8, rings=4)
        blob(P, hs(V(sx * .046, -.118, 1.596)), (.012 * s, .005 * s, .008 * s), paint, None, segs=6, rings=4)   # 볼연지
    if smile:
        for k in range(7):   # 귀까지 찢어진 웃음
            t = (k - 3) / 3
            blob(P, hs(V(t * .042, -.123 + abs(t) * .01, 1.565 + t * t * .018)), (.008 * s, .005 * s, .004 * s), dark, None, segs=6, rings=3)
    if crack is not None:
        for p0, p1 in ((V(.02, -.127, 1.69), V(.035, -.128, 1.63)), (V(.035, -.128, 1.63), V(.02, -.127, 1.58))):
            limb(P, hs(p0), hs(p1), [(0, .003 * s, .002 * s), (1, .003 * s, .002 * s)], crack, None, segs=3)


# ─────────────────────────── 황색날개: 천국의 안내 천사 ───────────────────────────
def yellowwing(self, g):
    """허리까지 내려오는 웨이브 진 금발, 어깨를 덮는 흰 드레이프 드레스(바닥까지, 금 밑단), 금빛 허리띠와 가슴 브로치,
    손목에서 넓어지는 소매(금 끝동). 노란 깃털 날개는 게임이 붙인다. 구역: 드레스 3 · 치마 4 · 신 5 · 금 14 · 볏빛 12 · 머리 2"""
    s, V = self.s, self.V
    dress = rmat('top', .7, .2); skirt = rmat('bottom', .7, .2); gold = rmat('metal', .22, .75, .9); glow = rmat('crest', .3, .6)
    hm = rmat('hair', .4, .55)
    sw = _spine_w(s)
    self.legs(g, rmat('skin', .55, .35), rmat('shoe', .5, .3), foot=.8)
    self.torso(g, dress, dress, hem=0, extra=lambda rings: [(c, u, v, rs * 1.02 + .004, rf * 1.04 + .006) for c, u, v, rs, rf in rings])
    self.head(g)
    self.arms(g, None); self.hands(g)
    _sleeves(self, g, dress, gold, bell=1.25, start=.02, cuff_r=.09)
    table = [(1.02, .14, .11), (.86, .19, .15), (.62, .23, .18), (.38, .262, .2), (.14, .29, .22), (.06, .3, .225)]
    _skirt(self, g, table, skirt, trim=gold, trim_z=.1)
    P = Part(g + '.drape')
    # 어깨에서 가슴으로 흘러내린 천 주름 · 금 허리띠 · 가슴 브로치(노란 보석)
    for sx in (1, -1):
        limb(P, V(sx * .11, -.05, 1.45), V(-sx * .02, -.15, 1.16), [(0, .03 * s, .008 * s), (1, .02 * s, .006 * s)], dress, None, segs=5)
    self.torso_band(P, 1.03, gold, grow=1.0, h=.03, add=.012)
    blob(P, V(0, -.135, 1.36), (.022 * s, .008 * s, .022 * s), gold, None, segs=8, rings=5)
    blob(P, V(0, -.144, 1.36), (.012 * s, .006 * s, .012 * s), glow, None, segs=6, rings=4)
    ob = finish(P); bind(ob, self.arm, sw); self.add(g, ob)
    _long_hair(self, g, hm, .98, front=True, width=1.12)
    hc0, hs = _head_tools(self)
    P = Part(g + '.curl')
    for sx in (1, -1):   # 굵은 웨이브 덩이 (귀밑 · 어깨 · 등)
        for k, (x, y, z) in enumerate(((.105, .02, 1.5), (.13, .04, 1.38), (.12, .07, 1.24), (.1, .1, 1.1))):
            c = hs(V(sx * x, y, z)) if z > 1.45 else V(sx * x, y, z)
            blob(P, c, (.036 * s, .034 * s, .046 * s), hm, None, segs=8, rings=6)
    ob = finish(P); bind(ob, self.arm, lambda co: {'head': smooth(co.z, 1.4 * s, 1.5 * s), 'spine': 1 - smooth(co.z, 1.4 * s, 1.5 * s)}); self.add(g, ob)
    P = Part(g + '.circlet')   # 이마의 가는 금관
    c = hs(V(0, -.01, 1.69))
    pts = [c + Vector((math.cos(a) * .104 * s * self.hk, -math.sin(a) * .118 * s * self.hk, 0)) for a in [math.radians(20 + 14 * i) for i in range(11)]]
    for p0, p1 in zip(pts, pts[1:]):
        limb(P, p0, p1, [(0, .006 * s, .006 * s), (1, .006 * s, .006 * s)], gold, None, segs=4)
    blob(P, hs(V(0, -.122, 1.69)), (.01 * s, .006 * s, .01 * s), glow, None, segs=6, rings=4)
    ob = finish(P); bind(ob, self.arm, lambda co: {'head': 1.0}, subsurf=0); self.add(g, ob)


# ─────────────────────────── 마스크 팔이 소녀 (지옥 1층 외곽) ───────────────────────────
def maskgirl(self, g):
    """헝클어진 갈색 단발, 어깨를 감싼 해진 갈색 숄, 무릎 아래 검붉은 원피스, 맨다리에 낡은 끈 신,
    왼팔에 검은 마스크가 수북한 고리버들 바구니, 등에는 화염방사기(연료통 둘 · 호스 · 옆구리의 분사구).
    구역: 숄 3 · 원피스 4 · 신 5 · 바구니 13 · 마스크 15 · 연료통 14 · 경고 띠 12 · 머리 2"""
    s, V = self.s, self.V
    shawl = rmat('top', .95, .05); dress = rmat('bottom', .85, .1); wick = rmat('wood', .8, .1); maskm = rmat('dark', .5, .3)
    tank = rmat('metal', .4, .55, .6); band = rmat('crest', .6, .25); hm = rmat('hair', .7, .25); skin = rmat('skin', .6, .3)
    sw = _spine_w(s)
    self.legs(g, skin, rmat('shoe', .8, .1), foot=.82)
    self.torso(g, dress, dress, hem=0)
    self.head(g)
    self.arms(g, dress, .3); self.hands(g)
    table = [(1.0, .13, .1), (.86, .16, .125), (.7, .18, .14), (.52, .19, .148)]
    _skirt(self, g, table, dress)
    # 숄: 어깨와 팔 위까지 덮고 앞에서 엇갈린다 (끝이 해져 들쭉날쭉)
    P = Part(g + '.shawl')
    T = []
    for z in (1.47, 1.42, 1.35, 1.27, 1.19):
        rx, ry, cy = self.torso_r(z, 1.18, .012 + (1.47 - z) * .12)
        T.append((Vector((0, cy, z * s)), rx, ry))
    arcloft(P, T, shawl, math.radians(150), math.radians(390), segs=18)   # 등과 어깨를 덮고 앞에서 조금 여민다
    for i in range(9):
        a = math.radians(160 + i * 27)
        rx, ry, cy = self.torso_r(1.19, 1.18, .07)
        p0 = Vector((math.cos(a) * rx, cy - math.sin(a) * ry, 1.19 * s))
        limb(P, p0, p0 + Vector((0, 0, -(.04 + (i % 3) * .025) * s)), [(0, .03 * s, .006 * s), (1, .008 * s, .003 * s)], shawl, None, segs=4)
    ob = finish(P); bind(ob, self.arm, sw, subsurf=0); self.add(g, ob)
    # 등의 화염방사기: 연료통 둘 + 어깨끈 + 호스(옆구리로) + 분사구
    P = Part(g + '.flamer')
    for sx in (1, -1):
        limb(P, V(sx * .055, .16, 1.0), V(sx * .055, .16, 1.38), [(0, .048 * s, .048 * s), (1, .048 * s, .048 * s)], tank, None, segs=12)
        blob(P, V(sx * .055, .16, 1.39), (.046 * s, .046 * s, .02 * s), tank, None, segs=10, rings=5)
        limb(P, V(sx * .055, .16, 1.2), V(sx * .055, .16, 1.24), [(0, .05 * s, .05 * s), (1, .05 * s, .05 * s)], band, None, segs=12, caps=(False, False))
        limb(P, V(sx * .08, .1, 1.42), V(sx * .1, -.12, 1.3), [(0, .012 * s, .008 * s), (1, .012 * s, .008 * s)], rmat('dark', .8, .1), None, segs=4)
    pts = [V(-.05, .2, 1.02), V(-.12, .16, .95), V(-.19, .05, .96), V(-.2, -.06, 1.02)]
    for p0, p1 in zip(pts, pts[1:]):
        limb(P, p0, p1, [(0, .014 * s, .014 * s), (1, .014 * s, .014 * s)], rmat('dark', .7, .2), None, segs=6)
    limb(P, V(-.2, -.06, 1.02), V(-.21, -.2, 1.06), [(0, .022 * s, .022 * s), (.7, .02 * s, .02 * s), (1, .026 * s, .026 * s)], tank, None, segs=8)
    ob = finish(P); bind(ob, self.arm, sw, subsurf=0); self.add(g, ob)
    # 왼팔의 바구니 (팔뚝에 걸쳤다) + 수북한 검은 마스크
    def basket(P, c, d):
        c = c + Vector((.03 * s, -.03 * s, -.15 * s))
        loft(P, [(c + Vector((0, 0, -.07 * s)), Vector((0, -1, 0)), Vector((1, 0, 0)), .08 * s, .065 * s),
                 (c + Vector((0, 0, .05 * s)), Vector((0, -1, 0)), Vector((1, 0, 0)), .11 * s, .088 * s)], wick, None, segs=14, caps=(True, False))
        for k in range(5):
            a = k / 5 * math.tau
            blob(P, c + Vector((math.cos(a) * .05 * s, math.sin(a) * .04 * s, .065 * s + (k % 2) * .016 * s)), (.038 * s, .032 * s, .028 * s), maskm, None, segs=8, rings=5)
        pts = [c + Vector((math.cos(a) * .1 * s, 0, .05 * s + math.sin(a) * .13 * s)) for a in [math.pi * i / 8 for i in range(9)]]
        for p0, p1 in zip(pts, pts[1:]):
            limb(P, p0, p1, [(0, .007 * s, .007 * s), (1, .007 * s, .007 * s)], wick, None, segs=4)
    _hold(self, g, 'L', 'basket', basket)
    # 머리: 헝클어진 단발 (끝이 뻗친다)
    R = (.101 * s, .114 * s, .128 * s)
    P = Part(g + '.hair')
    blob(P, V(0, .014, 1.625), (R[0] * 1.12, R[1] * 1.1, R[2] * 1.05), hm, None, segs=16, rings=12,
         cut=lambda co: (co.y < -.045 * s and co.z < 1.67 * s and abs(co.x) < .075 * s) or co.z < 1.49 * s)
    _bangs(self, P, hm, side=.01, depth=1.1)
    rnd = random.Random(7)
    for k in range(12):
        a = math.radians(-60 + k * 25)
        p0 = V(math.cos(a) * .1, .02 + math.sin(a) * .08, 1.53)
        limb(P, p0, p0 + Vector((math.cos(a) * .03, math.sin(a) * .025, -.05 - rnd.random() * .03)) * s, [(0, .022 * s, .018 * s), (1, .004 * s, .004 * s)], hm, None, segs=5)
    ob = finish(P); self.scale_head(ob); bind(ob, self.arm, lambda co: {'head': 1.0}); self.add(g, ob)


# ─────────────────────────── 지옥 4층 대장장이 칼드렉 ───────────────────────────
def kaldrek(self, g):
    """검게 그을린 거대한 악마 — 팔이 넷(위의 두 팔로 망치를, 갈비 아래서 나온 두 팔로 집게에 쥔 달군 쇠를),
    살갗의 붉은 금, 짧게 휜 굵은 뿔, 숯 같은 수염, 무릎까지 오는 두꺼운 가죽 앞치마, 맨발에 쇠 발목고리.
    구역: 살 1 · 앞치마 7 · 바지 4 · 금속 14 · 빛 12 · 뿔 13 · 수염 2"""
    s, V = self.s, self.V
    char = rmat('skin', .85, .1); glow = rmat('crest', .25, .9); apron = rmat('apron', .9, .1); iron = rmat('metal', .45, .6, .7)
    horn = rmat('wood', .55, .3); beard = rmat('hair', .9, .05)
    rnd = random.Random(43)
    def bulk(rings):
        return [(c, u, v, rs * (1.18 if 1.1 < c.z / s < 1.46 else 1.06) + .01, rf * (1.18 if 1.1 < c.z / s < 1.46 else 1.06) + .01) for c, u, v, rs, rf in rings]
    self.torso(g, char, rmat('bottom', .85, .1), hem=.98, extra=bulk)
    self.arms(g, None); self.hands(g); self.legs(g, rmat('bottom', .85, .1), char, foot=1.1)
    self.head(g)
    P = Part(g + '.body')
    # 가죽 앞치마: 가슴부터 무릎까지 · 목끈 · 그을린 자국
    front = [(1.36, .14, .15), (1.2, .2, .2), (1.02, .21, .19), (.8, .22, .2), (.6, .22, .2)]
    arcloft(P, [(V(0, .0, z), rx * s * self.bw + .02, ry * s + .02) for z, rx, ry in front], apron, math.radians(25), math.radians(155), segs=12)
    for sx in (1, -1):
        limb(P, V(sx * .12, -.17, 1.36), V(sx * .06, .02, 1.48), [(0, .014, .006), (1, .014, .006)], apron, None, segs=4)
    # 몸의 붉은 금 (어깨 · 팔뚝 · 등)
    for k in range(26):
        z = rnd.uniform(1.05, 1.45); a = rnd.uniform(0, math.tau)
        rx, ry, cy = self.torso_r(z, 1.22, .004)
        c = Vector((math.cos(a) * rx, cy - math.sin(a) * ry, z * s))
        limb(P, c, c + Vector((rnd.uniform(-.03, .03), 0, -rnd.uniform(.03, .07))) * s, [(0, .006 * s, .006 * s), (1, .003 * s, .003 * s)], glow, None, segs=4)
    # 갈비 아래에서 나온 두 번째 팔 둘 (팔꿈치를 굽혀 앞으로 — 집게와 달군 쇳덩이)
    for sx in (1, -1):
        sh = V(sx * .2, -.02, 1.2); el = V(sx * .27, -.14, 1.04); wr = V(sx * .12, -.3, 1.08)
        limb(P, sh, el, [(0, .06 * s, .06 * s), (1, .05 * s, .05 * s)], char, None, segs=10)
        blob(P, el, (.05 * s, .05 * s, .05 * s), char, None, segs=8, rings=6)
        limb(P, el, wr, [(0, .05 * s, .05 * s), (1, .04 * s, .04 * s)], char, None, segs=10)
        blob(P, wr + Vector((0, -.02, 0)) * s, (.04 * s, .045 * s, .04 * s), char, None, segs=8, rings=6)
    tip = V(0, -.42, 1.1)
    for sx in (1, -1):   # 집게 두 가닥이 가운데의 달군 쇠를 문다
        limb(P, V(sx * .12, -.32, 1.08), tip + Vector((sx * .02, 0, 0)) * s, [(0, .012 * s, .012 * s), (1, .01 * s, .01 * s)], iron, None, segs=5)
    blob(P, tip + Vector((0, -.03, .0)) * s, (.05 * s, .03 * s, .022 * s), glow, None, segs=8, rings=5)
    ob = finish(P); bind(ob, self.arm, _spine_w(s), subsurf=0); self.add(g, ob)
    # 오른손의 큰 망치
    def hammer(P, c, d):
        n = d.normalized()
        a, b = c - n * .05 * s, c + n * .42 * s
        limb(P, a, b, [(0, .02 * s, .02 * s), (1, .018 * s, .018 * s)], horn, None, segs=8)
        side = n.cross(Vector((0, 0, 1))).normalized() if abs(n.z) < .9 else Vector((1, 0, 0))
        limb(P, b - side * .1 * s, b + side * .08 * s, [(0, .055 * s, .055 * s), (1, .05 * s, .05 * s)], iron, None, segs=10)
    _hold(self, g, 'R', 'hammer', hammer)
    for k in 'LR':   # 쇠 발목고리 · 팔목 쇠띠
        for bn, t in ((f'shin.{k}', .85), (f'forearm.{k}', .8)):
            a, b = self.bones[bn][0], self.bones[bn][1]
            P = Part(f'{g}.ring.{bn}')
            c = a + (b - a) * t
            limb(P, c - (b - a) * .06, c + (b - a) * .06, [(0, .07 * s, .07 * s), (1, .07 * s, .07 * s)], iron, None, segs=10, caps=(False, False))
            ob = finish(P); bind(ob, self.arm, rigid(bn), subsurf=0); self.add(g, ob)
    # 머리: 굵게 휜 짧은 뿔 · 붉게 타는 눈 · 숯 수염 (턱 아래로 덥수룩)
    hc0, hs = _head_tools(self)
    P = Part(g + '.horn')
    for sx in (1, -1):
        pts = [hs(V(sx * (.07 + n * .028), .0, 1.69 + n * .03 - (n / 5) ** 2 * .05)) for n in range(6)]
        for n in range(5):
            w0 = (.032 - n * .005) * s
            limb(P, pts[n], pts[n + 1], [(0, w0, w0), (1, max(.004, w0 * .8), max(.004, w0 * .8))], horn, None, segs=7)
        blob(P, hs(V(sx * .034, -.1, 1.63)), (.016 * s, .006 * s, .008 * s), glow, None, segs=6, rings=4)
    blob(P, hs(V(0, -.07, 1.52)), (.075 * s, .05 * s, .07 * s), beard, None, segs=10, rings=7)
    for k in range(7):
        p0 = hs(V((k - 3) * .02, -.08, 1.49))
        limb(P, p0, p0 + Vector(((k - 3) * .004, -.01, -.06 - (k % 2) * .02)) * s, [(0, .016 * s, .014 * s), (1, .004 * s, .004 * s)], beard, None, segs=4)
    ob = finish(P); bind(ob, self.arm, lambda co: {'head': 1.0}, subsurf=0); self.add(g, ob)


# ─────────────────────────── 환전상 오볼로 (염소대왕의 방) ───────────────────────────
def obolo(self, g):
    """붉은 살갗의 작은 악마 환전상: 짧게 휜 검은 뿔 둘, 뾰족한 귀, 금테 외알 안경, 발목까지 오는 검은 로브(금 테두리 · 넓은 소매),
    허리의 묵직한 동전 주머니, 등의 작은 박쥐 날개(접혔다), 땅에 끌리는 가는 꼬리(끝이 화살촉).
    구역: 살 1 · 로브 3 · 안감 9 · 금 14 · 뿔·날개 13 · 주머니 7 · 바지 4"""
    s, V = self.s, self.V
    robe = rmat('top', .8, .12); lin = rmat('gown', .7, .2); gold = rmat('metal', .25, .75, .9); horn = rmat('wood', .5, .35)
    skin = rmat('skin', .6, .3); pouch = rmat('apron', .8, .1)
    self.legs(g, rmat('bottom', .85, .1), rmat('shoe', .45, .45), foot=.86)
    skirt_w, rad = self.long_body(g, robe, hem=.1, flare=.8, grow=1.08, cuff=gold, sleeve_w=1.1)
    self.head(g); self.hands(g)
    P = Part(g + '.trim')
    # 앞섶의 금 테두리 (목에서 밑단까지 두 줄) · 허리띠 · 동전 주머니
    for sx in (1, -1):
        pts = [V(sx * .03, -.08, 1.45), V(sx * .05, -.15, 1.25), V(sx * .06, -.17, 1.02)] + [V(sx * .07, -.2 - (1.02 - z) * .05, z) for z in (.8, .55, .3, .12)]
        for p0, p1 in zip(pts, pts[1:]):
            limb(P, p0, p1, [(0, .012 * s, .006 * s), (1, .012 * s, .006 * s)], gold, None, segs=4)
    self.torso_band(P, 1.02, gold, grow=1.08, h=.03, add=.012)
    blob(P, V(.15, -.12, .93), (.05 * s, .04 * s, .06 * s), pouch, None, segs=10, rings=7)
    limb(P, V(.15, -.12, .99), V(.15, -.12, 1.02), [(0, .02 * s, .02 * s), (1, .03 * s, .03 * s)], gold, None, segs=8)
    ob = finish(P); bind(ob, self.arm, lambda co: skirt_w(co) if co.z < 1.0 * s else _spine_w(s)(co), subsurf=0); self.add(g, ob)
    # 등의 접힌 박쥐 날개 · 꼬리
    P = Part(g + '.wings')
    for sx in (1, -1):
        root = V(sx * .07, .14, 1.38)
        top = V(sx * .2, .22, 1.62)
        limb(P, root, top, [(0, .02 * s, .02 * s), (1, .008 * s, .008 * s)], horn, None, segs=6)
        for k, low in enumerate((V(sx * .17, .24, 1.12), V(sx * .22, .26, 1.24), V(sx * .25, .24, 1.4))):
            limb(P, top, low, [(0, .007 * s, .006 * s), (1, .004 * s, .004 * s)], horn, None, segs=4)
            mid = (top + low) / 2 + Vector((-sx * .03 * s, .02 * s, 0))
            blob(P, mid, (.04 * s, .008 * s, (.1 + k * .02) * s), horn, None, segs=8, rings=5)
    pts = [V(0, .16, .95), V(0, .3, .6), V(.05, .4, .3), V(.12, .42, .1), V(.2, .38, .04)]
    for p0, p1 in zip(pts, pts[1:]):
        limb(P, p0, p1, [(0, .016 * s, .016 * s), (1, .012 * s, .012 * s)], skin, None, segs=6)
    tip = pts[-1]
    limb(P, tip, tip + Vector((.05, -.02, .02)) * s, [(0, .04 * s, .012 * s), (1, .002 * s, .002 * s)], skin, None, segs=4)
    ob = finish(P); bind(ob, self.arm, lambda co: {'spine': 1.0} if co.z > 1.0 * s else {'hips': 1.0}, subsurf=0); self.add(g, ob)
    # 머리: 대머리 · 뾰족한 귀 · 뿔 둘 · 외알 안경 · 가는 콧수염
    hc0, hs = _head_tools(self)
    P = Part(g + '.head2')
    for sx in (1, -1):
        limb(P, hs(V(sx * .095, .0, 1.62)), hs(V(sx * .15, .03, 1.68)), [(0, .022 * s, .012 * s), (1, .002 * s, .002 * s)], skin, None, segs=5)
        pts = [hs(V(sx * (.045 + n * .016), -.01 + n * .01, 1.71 + n * .03 - n * n * .004)) for n in range(5)]
        for n in range(4):
            limb(P, pts[n], pts[n + 1], [(0, (.02 - n * .004) * s, (.02 - n * .004) * s), (1, (.017 - n * .004) * s, (.017 - n * .004) * s)], horn, None, segs=6)
        limb(P, hs(V(sx * .005, -.108, 1.585)), hs(V(sx * .05, -.1, 1.57)), [(0, .006 * s, .004 * s), (1, .002 * s, .002 * s)], horn, None, segs=4)
    c = hs(V(.034, -.112, 1.625))
    pts = [c + Vector((math.cos(a) * .022 * s, 0, math.sin(a) * .022 * s)) for a in [math.tau * i / 10 for i in range(11)]]
    for p0, p1 in zip(pts, pts[1:]):
        limb(P, p0, p1, [(0, .004 * s, .004 * s), (1, .004 * s, .004 * s)], gold, None, segs=3)
    limb(P, c + Vector((.02 * s, 0, -.012 * s)), V(.09, -.06, 1.42), [(0, .002 * s, .002 * s), (1, .002 * s, .002 * s)], gold, None, segs=3)
    ob = finish(P); bind(ob, self.arm, lambda co: {'head': 1.0} if co.z > 1.48 * s else {'spine': 1.0}, subsurf=0); self.add(g, ob)


# ─────────────────────────── 천국의 신앙 감시자 노을 ───────────────────────────
def noeul(self, g):
    """유내와 똑같이 생긴 천사: 짙은 밤색 머리를 뒤로 높이 틀어 올리고 옆머리 두 가닥, 무릎까지 오는 흰 튜닉(노을빛 밑단),
    은빛 가슴받이와 어깨 갑, 허리의 붉은 띠, 정강이 보호대. 오른손에 늘 긴 장검(칼끝을 아래로). 날개는 게임이 붙인다.
    구역: 튜닉 3 · 속옷 4 · 신 5 · 은 14 · 노을빛 12 · 칼날 10 · 손잡이 13 · 머리 2"""
    s, V = self.s, self.V
    tunic = rmat('top', .75, .2); under = rmat('bottom', .75, .2); silver = rmat('metal', .25, .7, .9); dusk = rmat('crest', .45, .4)
    blade = rmat('bandage', .2, .8, .9); grip = rmat('wood', .5, .3); hm = rmat('hair', .45, .5)
    sw = _spine_w(s)
    self.legs(g, under, rmat('shoe', .5, .3), foot=.86, boot=True)
    self.torso(g, tunic, tunic, hem=0, extra=lambda rings: [(c, u, v, rs * 1.03 + .006, rf * 1.05 + .008) for c, u, v, rs, rf in rings])
    self.head(g)
    self.arms(g, tunic, 1.9, wide=1.0); self.hands(g)
    table = [(1.0, .17, .13), (.84, .2, .15), (.66, .218, .162), (.52, .226, .168)]
    _skirt(self, g, table, tunic, trim=dusk, trim_z=.56)
    P = Part(g + '.armor')
    bw = self.bw
    loft(P, [(V(0, -.008, 1.1), Vector((0, -1, 0)), Vector((1, 0, 0)), .14 * s * bw + .014, .1 * s + .016),
             (V(0, -.012, 1.24), Vector((0, -1, 0)), Vector((1, 0, 0)), .16 * s * bw + .016, .125 * s + .018),
             (V(0, -.01, 1.38), Vector((0, -1, 0)), Vector((1, 0, 0)), .15 * s * bw + .014, .1 * s + .014)], silver, None, segs=18, caps=(False, False))
    for sx in (1, -1):
        sh = self.bones['upper_arm.' + ('L' if sx > 0 else 'R')][0]
        blob(P, sh + Vector((sx * .015, 0, .02)), (.072 * s, .066 * s, .042 * s), silver, None, segs=10, rings=6, cut=lambda co: co.z < sh.z - .005)
    self.torso_band(P, 1.02, dusk, grow=1.05, h=.04, add=.014)
    limb(P, V(.1, -.12, 1.0), V(.13, -.15, .7), [(0, .03 * s, .006 * s), (1, .026 * s, .005 * s)], dusk, None, segs=4)
    ob = finish(P); bind(ob, self.arm, sw, subsurf=0); self.add(g, ob)
    for k in 'LR':   # 정강이 보호대
        a, b = self.bones[f'shin.{k}'][0], self.bones[f'shin.{k}'][1]
        P = Part(f'{g}.greave.{k}')
        limb(P, a + (b - a) * .15, a + (b - a) * .7, [(0, .064 * s, .066 * s), (1, .058 * s, .06 * s)], silver, None, segs=10)
        ob = finish(P); bind(ob, self.arm, rigid(f'shin.{k}'), subsurf=0); self.add(g, ob)
    # 오른손의 긴 장검 (칼끝이 아래로 — 손목을 따라 움직인다)
    def sword(P, c, d):
        n = d.normalized()
        tip = c + n * .95 * s
        limb(P, c - n * .14 * s, c + n * .02 * s, [(0, .016 * s, .016 * s), (1, .016 * s, .016 * s)], grip, None, segs=6)
        blob(P, c - n * .15 * s, (.022 * s, .022 * s, .022 * s), silver, None, segs=6, rings=4)
        side = n.cross(Vector((1, 0, 0)))
        side = side.normalized() if side.length > .1 else Vector((0, 1, 0))
        limb(P, c + n * .03 * s - side * .07 * s, c + n * .03 * s + side * .07 * s, [(0, .012 * s, .012 * s), (1, .012 * s, .012 * s)], silver, None, segs=5)
        limb(P, c + n * .05 * s, tip, [(0, .02 * s, .006 * s), (.85, .017 * s, .005 * s), (1, .002 * s, .002 * s)], blade, None, segs=5)
    _hold(self, g, 'R', 'sword', sword)
    # 머리: 뒤로 높이 틀어 올린 밤색 머리 + 옆으로 흘러내린 두 가닥 (유내 20대와 같은 얼굴)
    R = (.101 * s, .114 * s, .128 * s)
    P = Part(g + '.hair')
    blob(P, V(0, .008, 1.632), (R[0] * 1.04, R[1] * 1.03, R[2] * 1.01), hm, None, segs=16, rings=12,
         cut=lambda co: (co.y < -.03 * s and co.z < 1.672 * s) or co.z < 1.54 * s or (co.z < 1.6 * s and co.y < .02 * s))
    _bangs(self, P, hm, side=-.02, depth=.8)
    blob(P, V(0, .11, 1.69), (.055 * s, .045 * s, .05 * s), hm, None, segs=10, rings=7)
    for sx in (1, -1):
        limb(P, V(sx * .088, -.04, 1.62), V(sx * .1, -.06, 1.45), [(0, .016 * s, .012 * s), (1, .006 * s, .005 * s)], hm, None, segs=5)
    ob = finish(P); self.scale_head(ob); bind(ob, self.arm, lambda co: {'head': 1.0}); self.add(g, ob)


# ─────────────────────────── 5층 인형술사 마리 ───────────────────────────
def mari(self, g):
    """나이를 알 수 없는 마른 여자: 잿빛 섞인 검은 머리를 정수리에 단단히 틀어 묶고, 목까지 올라온 깃의 검은 드레스(바닥까지),
    가늘고 긴 손가락마다 감긴 흰 실 — 위로 뻗어 오른손 아래 매달린 작은 목각 인형으로 이어진다.
    구역: 드레스 3 · 치마 4 · 신 5 · 깃·소맷부리 9 · 실 10 · 인형 13 · 인형 옷 12 · 머리 2"""
    s, V = self.s, self.V
    dress = rmat('top', .8, .12); skirt = rmat('bottom', .8, .12); lace = rmat('gown', .85, .08); thread = rmat('bandage', .6, .2)
    wood = rmat('wood', .6, .25); cloth = rmat('crest', .7, .15); hm = rmat('hair', .55, .4)
    sw = _spine_w(s)
    self.legs(g, rmat('dark', .8, .1), rmat('shoe', .45, .45), foot=.82)
    self.torso(g, dress, dress, hem=0)
    self.head(g)
    self.arms(g, dress, 1.92, cuff=True, wide=.9); self.hands(g)
    table = [(1.0, .13, .1), (.8, .165, .125), (.55, .2, .15), (.3, .226, .17), (.08, .245, .185)]
    _skirt(self, g, table, skirt)
    P = Part(g + '.collar')
    limb(P, V(0, .0, 1.43), V(0, .0, 1.52), [(0, .07 * s, .066 * s), (1, .062 * s, .058 * s)], lace, None, segs=14, caps=(False, False))
    for k in range(6):
        blob(P, V(0, -.14 + k * .003, 1.38 - k * .065), (.008 * s, .005 * s, .008 * s), lace, None, segs=6, rings=4)
    ob = finish(P); bind(ob, self.arm, lambda co: {'neck': smooth(co.z, 1.44 * s, 1.5 * s), 'spine': 1 - smooth(co.z, 1.44 * s, 1.5 * s)}); self.add(g, ob)
    # 손가락마다 실 (위로) — 오른손 실 끝에 작은 인형이 매달렸다 (손 아래로)
    for k in 'LR':
        def strings(P, c, d, k=k):
            n = d.normalized()
            for f in range(4):
                base = c + n * .05 * s + Vector(((f - 1.5) * .012 * s, -.01 * s, 0))
                limb(P, base, base + Vector(((f - 1.5) * .02, -.02, .34)) * s, [(0, .006 * s, .006 * s), (1, .005 * s, .005 * s)], thread, None, segs=3)
                limb(P, c + Vector(((f - 1.5) * .014 * s, -.01 * s, 0)), base, [(0, .008 * s, .008 * s), (1, .006 * s, .006 * s)], rmat('skin', .6, .3), None, segs=4)
            if k == 'R':   # 실에 매달린 작은 인형 (머리 · 몸 · 팔다리)
                d0 = c + Vector((0, -.06, -.12)) * s
                for f in range(3):
                    limb(P, c + Vector(((f - 1) * .012 * s, -.02 * s, 0)), d0 + Vector(((f - 1) * .02 * s, 0, .05 * s)), [(0, .0025 * s, .0025 * s), (1, .0025 * s, .0025 * s)], thread, None, segs=3)
                blob(P, d0 + Vector((0, 0, .04 * s)), (.022 * s, .02 * s, .022 * s), wood, None, segs=8, rings=5)
                limb(P, d0 + Vector((0, 0, .02 * s)), d0 + Vector((0, 0, -.05 * s)), [(0, .02 * s, .016 * s), (1, .026 * s, .02 * s)], cloth, None, segs=8)
                for sx in (1, -1):
                    limb(P, d0 + Vector((sx * .01 * s, 0, -.05 * s)), d0 + Vector((sx * .016 * s, 0, -.1 * s)), [(0, .006 * s, .006 * s), (1, .005 * s, .005 * s)], wood, None, segs=4)
                    limb(P, d0 + Vector((sx * .02 * s, 0, .015 * s)), d0 + Vector((sx * .045 * s, 0, -.02 * s)), [(0, .005 * s, .005 * s), (1, .004 * s, .004 * s)], wood, None, segs=4)
        _hold(self, g, k, 'strings', strings)
    # 머리: 정수리의 단단한 쪽 + 이마를 드러낸 잿빛 섞인 머리
    R = (.101 * s, .114 * s, .128 * s)
    P = Part(g + '.hair')
    blob(P, V(0, .008, 1.632), (R[0] * 1.03, R[1] * 1.02, R[2] * 1.01), hm, None, segs=16, rings=12,
         cut=lambda co: (co.y < -.035 * s and co.z < 1.69 * s) or co.z < 1.55 * s or (co.z < 1.6 * s and co.y < .02 * s))
    blob(P, V(0, .03, 1.76), (.05 * s, .045 * s, .042 * s), hm, None, segs=10, rings=7)
    ob = finish(P); self.scale_head(ob); bind(ob, self.arm, lambda co: {'head': 1.0}); self.add(g, ob)


# ─────────────────────────── 지옥 5층: 가면의 도시 ───────────────────────────
def maskfiend(self, g):
    """가면귀: 선량한 얼굴로 다가오는 악마 — 하얗게 웃는 가면, 단정한 잿빛 긴 외투(목까지 채운 단추), 검은 장갑,
    외투 자락 밑으로 보이는 가늘고 검은 다리와 갈퀴 발톱. 가면 뒤통수엔 뒤로 묶은 검은 끈.
    구역: 외투 3 · 바지 4 · 신 5 · 가면 10 · 그린 웃음·눈구멍 15 · 볼연지 12 · 장갑 9 · 단추 14"""
    s, V = self.s, self.V
    coat = rmat('top', .8, .12); white = rmat('bandage', .25, .55); dark = rmat('dark', .9, .05); paint = rmat('crest', .6, .3)
    glove = rmat('gown', .7, .2); btn = rmat('metal', .35, .6, .7)
    self.legs(g, rmat('bottom', .85, .1), rmat('shoe', .5, .4), foot=.95)
    skirt_w, rad = self.long_body(g, coat, hem=.42, flare=.6, grow=1.05, sleeve_w=.95)
    self.head(g, face=False); self.hands(g, glove)
    P = Part(g + '.btn')
    for k in range(6):
        blob(P, V(0, -.155 + k * .002, 1.4 - k * .08), (.01 * s, .005 * s, .01 * s), btn, None, segs=6, rings=4)
    ob = finish(P); bind(ob, self.arm, lambda co: skirt_w(co) if co.z < 1.0 * s else _spine_w(s)(co), subsurf=0); self.add(g, ob)
    for k in 'LR':   # 장갑 끝의 갈퀴 손톱 (넷)
        def claws(P, c, d):
            n = d.normalized()
            for f in range(4):
                b0 = c + n * .04 * s + Vector(((f - 1.5) * .01 * s, -.01 * s, 0))
                limb(P, b0, b0 + n * .07 * s, [(0, .005 * s, .005 * s), (1, .001 * s, .001 * s)], dark, None, segs=4)
        _hold(self, g, k, 'claw', claws)
    P = Part(g + '.mask')
    _mask_face(self, P, white, dark, paint)
    R = (.101 * s, .114 * s, .128 * s)
    hc0, hs = _head_tools(self); hk = self.hk
    blob(P, hs(V(0, .02, 1.63)), (R[0] * 1.02 * hk, R[1] * .95 * hk, R[2] * hk), dark, None, segs=14, rings=10, cut=lambda co: co.y < -.04 * s * hk)
    limb(P, hs(V(0, .12, 1.64)), hs(V(.02, .2, 1.5)), [(0, .01 * s, .004 * s), (1, .006 * s, .003 * s)], dark, None, segs=4)
    ob = finish(P); bind(ob, self.arm, lambda co: {'head': 1.0}, subsurf=0); self.add(g, ob)


def whisperer(self, g):
    """속삭임꾼: 거짓 소문을 퍼뜨리는 악마 — 앞으로 굽은 등에 두건 달린 이끼빛 누더기, 두건 속은 얼굴 대신 커다란 입 하나와 이빨,
    머리 옆으로 크게 벌어진 귀, 무릎까지 닿는 긴 팔과 가느다란 손가락. 허리에 작은 가면들을 꿰어 찼다.
    구역: 누더기 3 · 안감 9 · 살 1 · 입 15 · 이빨 10 · 가면 12 · 바지 4"""
    s, V = self.s, self.V
    rag = rmat('top', .95, .05); lin = rmat('gown', .9, .05); skin = rmat('skin', .7, .2); maw = rmat('dark', .9, .05)
    teeth = rmat('bandage', .4, .4); masks = rmat('crest', .5, .35)
    rnd = random.Random(53)
    self.legs(g, rmat('bottom', .9, .05), skin, foot=1.05)
    skirt_w, rad = self.long_body(g, rag, hem=.3, flare=1.1, grow=1.02, sleeve_w=.85)
    self.head(g, face=False); self.hands(g)
    # 굽은 등의 혹 + 두건 (얼굴을 덮어 앞으로 튀어나왔다)
    P = Part(g + '.hood')
    blob(P, V(0, .12, 1.4), (.17 * s, .12 * s, .12 * s), rag, None, segs=12, rings=8)
    hc0, hs = _head_tools(self)
    blob(P, hs(V(0, .0, 1.63)), (.125 * s, .14 * s, .14 * s), rag, None, segs=14, rings=10, cut=lambda co: co.y < -.06 * s and co.z < 1.72 * s and abs(co.x) < .07 * s)
    blob(P, hs(V(0, -.06, 1.6)), (.07 * s, .04 * s, .08 * s), maw, None, segs=10, rings=7)
    for k in range(9):   # 위아래 이빨
        x = (k - 4) * .014
        blob(P, hs(V(x, -.095, 1.64 - abs(k - 4) * .004)), (.005 * s, .005 * s, .012 * s), teeth, None, segs=5, rings=3)
        blob(P, hs(V(x, -.095, 1.56 + abs(k - 4) * .004)), (.005 * s, .005 * s, .012 * s), teeth, None, segs=5, rings=3)
    for sx in (1, -1):   # 크게 벌어진 귀
        limb(P, hs(V(sx * .1, .0, 1.66)), hs(V(sx * .22, .04, 1.74)), [(0, .04 * s, .012 * s), (.5, .05 * s, .01 * s), (1, .004 * s, .004 * s)], skin, None, segs=6)
    ob = finish(P); bind(ob, self.arm, lambda co: {'head': smooth(co.z, 1.46 * s, 1.52 * s), 'spine': 1 - smooth(co.z, 1.46 * s, 1.52 * s)}, subsurf=0); self.add(g, ob)
    for k in 'LR':   # 긴 손가락
        def fingers(P, c, d):
            n = d.normalized()
            for f in range(4):
                b0 = c + n * .03 * s + Vector(((f - 1.5) * .011 * s, -.006 * s, 0))
                limb(P, b0, b0 + n * .11 * s + Vector(((f - 1.5) * .008, 0, 0)) * s, [(0, .006 * s, .006 * s), (1, .002 * s, .002 * s)], skin, None, segs=4)
        _hold(self, g, k, 'finger', fingers)
    # 허리에 꿴 작은 가면들 · 해진 자락
    P = Part(g + '.belt')
    self.torso_band(P, 1.0, lin, grow=1.04, h=.025, add=.014)
    for i in range(7):
        a = math.radians(200 + i * 22)
        rx, ry, cy = self.torso_r(.98, 1.04, .03)
        c = Vector((math.cos(a) * rx, cy - math.sin(a) * ry, .93 * s))
        blob(P, c, (.03 * s, .012 * s, .036 * s), masks if i % 2 else teeth, None, segs=8, rings=5)
    for i in range(14):
        a = 2 * math.pi * i / 14
        rx, ry = rad(.3)
        p0 = Vector((math.cos(a) * (rx * s * self.bw + .022), .005 * s - math.sin(a) * (ry * s + .026), .3 * s))
        limb(P, p0, p0 + Vector((0, 0, -(.05 + rnd.random() * .07) * s)), [(0, .03 * s, .006 * s), (1, .006 * s, .003 * s)], rag, None, segs=4)
    ob = finish(P); bind(ob, self.arm, lambda co: skirt_w(co) if co.z < 1.0 * s else _spine_w(s)(co), subsurf=0); self.add(g, ob)


def _puppet(self, g, wood, joint, coat, face, paint, string, hat, scale_head=True, crack=None):
    """목각 인형 몸 (인형병사 · 마네트 · 마리오네트): 통나무 같은 몸통, 공 관절, 그린 얼굴, 머리와 손목에서 위로 뻗은 실"""
    s, V = self.s, self.V
    bw = self.bw
    P = Part(g + '.trunk')
    loft(P, [(V(0, .0, .92), Vector((0, -1, 0)), Vector((1, 0, 0)), .13 * s * bw, .1 * s * bw),
             (V(0, .0, 1.05), Vector((0, -1, 0)), Vector((1, 0, 0)), .15 * s * bw, .11 * s * bw),
             (V(0, .0, 1.3), Vector((0, -1, 0)), Vector((1, 0, 0)), .17 * s * bw, .12 * s * bw),
             (V(0, .0, 1.44), Vector((0, -1, 0)), Vector((1, 0, 0)), .14 * s * bw, .1 * s * bw)], coat, None, segs=14)
    for z in (1.33, 1.24, 1.15):   # 앞섶의 금 단추 줄 (장난감 병정)
        for sx in (1, -1):
            blob(P, V(sx * .05, -.12 * bw, z), (.012 * s, .006 * s, .012 * s), paint, None, segs=6, rings=4)
    self.torso_band(P, 1.02, joint, grow=1.0, h=.04, add=.02)
    ob = finish(P); bind(ob, self.arm, _spine_w(s), subsurf=0); self.add(g, ob)
    # 팔다리: 가는 나무 막대 + 공 관절
    for k in 'LR':
        for seg, r in (('upper_arm', .036), ('forearm', .03), ('thigh', .048), ('shin', .04)):
            a, b = self.bones[f'{seg}.{k}'][0], self.bones[f'{seg}.{k}'][1]
            P = Part(f'{g}.{seg}.{k}')
            limb(P, a + (b - a) * .08, b - (b - a) * .08, [(0, r * s * bw, r * s * bw), (1, r * .85 * s * bw, r * .85 * s * bw)], wood, None, segs=8)
            blob(P, a, (r * 1.2 * s * bw,) * 3, joint, None, segs=8, rings=6)
            ob = finish(P); bind(ob, self.arm, rigid(f'{seg}.{k}'), subsurf=0); self.add(g, ob)
        P = Part(f'{g}.foot.{k}')
        an = self.bones[f'shin.{k}'][1]
        blob(P, Vector((an.x, -.03 * s, .04 * s)), (.05 * s, .1 * s, .045 * s), hat, None, segs=10, rings=6, cut=lambda co: co.z < 0)
        ob = finish(P); bind(ob, self.arm, autow(self.bones, [f'shin.{k}', f'foot.{k}'], power=8), subsurf=0); self.add(g, ob)
        P = Part(f'{g}.hand.{k}')
        wr, hd = self.bones[f'forearm.{k}'][1], self.bones[f'hand.{k}'][1]
        blob(P, (wr + hd) / 2, (.03 * s * bw, .032 * s * bw, .045 * s * bw), joint, None, segs=8, rings=6)
        limb(P, wr, wr + Vector((0, 0, .45 * s)), [(0, .006 * s, .006 * s), (1, .005 * s, .005 * s)], string, None, segs=3)   # 손목의 실
        ob = finish(P); bind(ob, self.arm, rigid(f'hand.{k}'), subsurf=0); self.add(g, ob)
    # 머리: 둥근 나무 머리 + 흰 얼굴판(그린 눈 · 붉은 볼) + 정수리의 실
    hc0, hs = _head_tools(self)
    P = Part(g + '.head')
    limb(P, V(0, 0, 1.43), V(0, 0, 1.52), [(0, .03 * s, .03 * s), (1, .03 * s, .03 * s)], wood, None, segs=8)
    blob(P, hs(V(0, .0, 1.62)), (.092 * s * self.hk, .1 * s * self.hk, .112 * s * self.hk), wood, None, segs=14, rings=10)
    _mask_face(self, P, face, rmat('dark', .8, .1), paint, smile=False, crack=crack)
    limb(P, hs(V(0, .0, 1.73)), hs(V(0, .0, 1.73)) + Vector((0, 0, .4 * s)), [(0, .006 * s, .006 * s), (1, .005 * s, .005 * s)], string, None, segs=3)
    ob = finish(P); bind(ob, self.arm, lambda co: {'head': smooth(co.z, 1.46 * s, 1.52 * s), 'spine': 1 - smooth(co.z, 1.46 * s, 1.52 * s)}, subsurf=0); self.add(g, ob)
    return hs


def puppet(self, g):
    """인형병사: 보이지 않는 실에 조종당하는 전사 — 붉은 칠 장난감 병정 외투 · 키 큰 검은 모자(금 휘장) · 나무 팔다리와 공 관절 ·
    흰 얼굴판에 그린 눈과 붉은 볼 · 손목과 정수리에서 위로 뻗은 실. 구역: 외투 3 · 나무 13 · 관절 4 · 얼굴 10 · 칠 12 · 모자 15 · 휘장 14 · 실 9"""
    s, V = self.s, self.V
    wood = rmat('wood', .55, .3); joint = rmat('bottom', .5, .35); coat = rmat('top', .5, .35); face = rmat('bandage', .3, .5)
    paint = rmat('crest', .5, .35); string = rmat('gown', .5, .3); hat = rmat('dark', .6, .3); badge = rmat('metal', .3, .7, .8)
    hs = _puppet(self, g, wood, joint, coat, face, paint, string, hat)
    P = Part(g + '.shako')
    c = hs(V(0, .0, 1.7))
    loft(P, [(c, Vector((0, -1, 0)), Vector((1, 0, 0)), .085 * s, .09 * s), (c + Vector((0, 0, .17 * s)), Vector((0, -1, 0)), Vector((1, 0, 0)), .095 * s, .1 * s)], hat, None, segs=14, caps=(False, True))
    blob(P, c + Vector((0, -.095 * s, .08 * s)), (.03 * s, .008 * s, .035 * s), badge, None, segs=8, rings=5)
    limb(P, c + Vector((0, -.07 * s, .0)), c + Vector((0, -.13 * s, -.005 * s)), [(0, .07 * s, .01 * s), (1, .06 * s, .008 * s)], hat, None, segs=5)   # 챙
    blob(P, c + Vector((0, .0, .19 * s)), (.02 * s, .02 * s, .03 * s), paint, None, segs=6, rings=4)   # 꼭대기 술
    ob = finish(P); bind(ob, self.arm, lambda co: {'head': 1.0}, subsurf=0); self.add(g, ob)


def manette(self, g):
    """필드 보스 마네트, 실의 어미: 도자기 가면(금 간 데가 있다)을 쓴 거대한 목각 인형 — 주름 깃과 바랜 무대 드레스,
    열 손가락 끝에서 늘어진 검은 실 끝마다 작은 인형이 매달려 땅 가까이 흔들린다. 구역: 드레스 3 · 나무 13 · 관절 4 · 가면 10 · 칠 12 · 실 15 · 주름 깃 9"""
    s, V = self.s, self.V
    wood = rmat('wood', .55, .3); joint = rmat('bottom', .5, .35); dress = rmat('top', .8, .12); face = rmat('bandage', .2, .6)
    paint = rmat('crest', .5, .35); string = rmat('dark', .6, .3); ruff = rmat('gown', .85, .08)
    hs = _puppet(self, g, wood, joint, dress, face, paint, string, rmat('dark', .6, .3), crack=rmat('dark', .6, .3))
    table = [(1.0, .19, .15), (.8, .25, .2), (.6, .3, .24), (.4, .33, .26)]
    _skirt(self, g, [(z, rx * self.bw, ry * self.bw) for z, rx, ry in table], dress, trim=ruff, trim_z=.44)
    P = Part(g + '.ruff')
    for i in range(16):   # 목의 주름 깃 (꽃잎처럼)
        a = 2 * math.pi * i / 16
        c = V(0, 0, 1.46) + Vector((math.cos(a) * .1 * s, math.sin(a) * .09 * s, 0))
        blob(P, c, (.045 * s, .045 * s, .02 * s), ruff, None, segs=8, rings=4)
    ob = finish(P); bind(ob, self.arm, _spine_w(s), subsurf=0); self.add(g, ob)
    for k in 'LR':   # 손가락 끝의 검은 실과 작은 인형들
        def dolls(P, c, d, k=k):
            for f in range(3):
                x = (f - 1) * .05 * s
                end = c + Vector((x, -.05 * s, -.55 * s - f * .06 * s))
                limb(P, c + Vector((x * .3, 0, 0)), end, [(0, .004 * s, .004 * s), (1, .004 * s, .004 * s)], string, None, segs=3)
                blob(P, end + Vector((0, 0, -.03 * s)), (.022 * s, .018 * s, .024 * s), face, None, segs=6, rings=4)
                limb(P, end + Vector((0, 0, -.05 * s)), end + Vector((0, 0, -.12 * s)), [(0, .02 * s, .016 * s), (1, .026 * s, .02 * s)], paint, None, segs=6)
        _hold(self, g, k, 'dolls', dolls)


def marcion(self, g):
    """층주 마르시온, 천 개의 가면을 가진 자: 큰 키, 발까지 끌리는 검은 로브는 온통 꿰매 붙인 가면들 — 웃는 것 · 우는 것 · 금빛 · 붉은 것.
    얼굴은 아무 표정 없는 흰 가면, 머리 뒤로 후광처럼 둘러선 가면 아홉. 구역: 로브 3 · 안감 9 · 가면 10 · 금 14 · 붉은 칠 12 · 검정 15 · 손 1"""
    s, V = self.s, self.V
    robe = rmat('top', .85, .1); lin = rmat('gown', .8, .1); white = rmat('bandage', .25, .55); gold = rmat('metal', .25, .75, .9)
    red = rmat('crest', .5, .35); dark = rmat('dark', .9, .05)
    rnd = random.Random(61)
    self.legs(g, rmat('bottom', .85, .1), rmat('shoe', .5, .4), foot=1.0)
    skirt_w, rad = self.long_body(g, robe, hem=.06, flare=1.0, grow=1.1, cuff=lin, sleeve_w=1.15)
    self.head(g, face=False); self.hands(g)
    mats = [white, gold, red, white, lin]
    P = Part(g + '.masks')
    for i in range(46):   # 로브에 꿰맨 가면들
        z = rnd.uniform(.12, 1.42); a = rnd.uniform(math.radians(-40), math.radians(220))
        if z > .98:
            rx, ry, cy = self.torso_r(z, 1.1, .008)
        else:
            r0, r1 = rad(z); rx, ry, cy = r0 * s * self.bw + .024, r1 * s + .028, .005 * s
        c = Vector((math.cos(a) * rx, cy - math.sin(a) * ry, z * s))
        nrm = Vector((math.cos(a), -math.sin(a), 0))
        m = mats[i % len(mats)]
        blob(P, c, (.042 * s, .036 * s, .052 * s), m, None, segs=8, rings=5)
        for sx in (1, -1):
            blob(P, c + nrm * .02 * s + Vector((sx * .012 * s * nrm.y, -sx * .012 * s * nrm.x, .01 * s)), (.006 * s, .004 * s, .005 * s), dark, None, segs=4, rings=3)
    ob = finish(P); bind(ob, self.arm, lambda co: skirt_w(co) if co.z < 1.0 * s else _spine_w(s)(co), subsurf=0); self.add(g, ob)
    P = Part(g + '.face')
    _mask_face(self, P, white, dark, white, smile=False)
    hc0, hs = _head_tools(self)
    R = (.101 * s, .114 * s, .128 * s)
    hk = self.hk
    blob(P, hs(V(0, .02, 1.63)), (R[0] * 1.06 * hk, R[1] * .98 * hk, R[2] * 1.04 * hk), dark, None, segs=14, rings=10, cut=lambda co: co.y < -.045 * s * hk)
    for i in range(9):   # 머리 뒤 후광처럼 둘러선 가면들
        a = math.radians(-80 + i * 20)
        c = hs(V(0, .08, 1.64)) + Vector((math.sin(a) * .2 * s, .02 * s, math.cos(a) * .2 * s))
        blob(P, c, (.04 * s, .012 * s, .05 * s), mats[i % 3], None, segs=8, rings=5)
        for sx in (1, -1):
            blob(P, c + Vector((sx * .015 * s, -.012 * s, .012 * s)), (.007 * s, .004 * s, .006 * s), dark, None, segs=4, rings=3)
    ob = finish(P); bind(ob, self.arm, lambda co: {'head': 1.0}, subsurf=0); self.add(g, ob)


# ─────────────────────────── 유내 세 시절 (사용자 도트에 맞춰 다시) ───────────────────────────
def _sweat(self, g, m, cuff, loose=1.08):
    """넉넉한 긴소매 맨투맨 (밑단이 엉덩이를 덮고, 소맷부리가 손등에 걸린다)"""
    s = self.s
    self.torso(g, m, m, hem=0, extra=lambda rings: [(c, u, v, rs * loose + .006, rf * loose + .008) for c, u, v, rs, rf in rings if c.z / s >= .9])
    self.arms(g, m, 1.97, cuff=cuff, wide=1.12)
    P = Part(g + '.hem')
    self.torso_band(P, .93, m, grow=loose * 1.02, h=.06, add=.012)
    ob = finish(P); bind(ob, self.arm, lambda co: {'hips': 1.0}, subsurf=0); self.add(g, ob)


def yunae1b(self, g):
    """10대 유내 (사용자 도트): 어깨 아래까지 내려오는 짙은 갈색 생머리와 일자 앞머리, 짙은 갈색 맨투맨(넉넉한 긴소매), 회청색 청바지, 짙은 신.
    구역: 맨투맨 3 · 청바지 4 · 신 5 · 머리 2"""
    s, V = self.s, self.V
    top = rmat('top', .9, .08); jeans = rmat('bottom', .8, .12); hm = rmat('hair', .45, .5)
    self.legs(g, jeans, rmat('shoe', .6, .3), foot=.9)
    _sweat(self, g, top, top, loose=1.1)
    self.head(g); self.hands(g)
    _long_hair(self, g, hm, 1.2, front=True, width=1.02)
    P = Part(g + '.bangs')
    _bangs(self, P, hm, depth=.7)
    ob = finish(P); self.scale_head(ob); bind(ob, self.arm, lambda co: {'head': 1.0}); self.add(g, ob)


def yunae2b(self, g):
    """20대 유내 (사용자 도트): 정수리 뒤로 틀어 올린 머리와 흘러내린 잔머리, 몸에 붙는 검은 반팔 티, 짙은 남색 청바지(오른손은 주머니에), 짙은 신.
    구역: 티 3 · 청바지 4 · 신 5 · 머리 2"""
    s, V = self.s, self.V
    tee = rmat('top', .85, .1); jeans = rmat('bottom', .8, .12); hm = rmat('hair', .45, .5)
    self.legs(g, jeans, rmat('shoe', .6, .3), foot=.88)
    self.torso(g, tee, jeans, hem=.99)
    self.head(g)
    self.arms(g, tee, .5); self.hands(g)
    R = (.101 * s, .114 * s, .128 * s)
    P = Part(g + '.hair')
    blob(P, V(0, .008, 1.632), (R[0] * 1.04, R[1] * 1.03, R[2] * 1.01), hm, None, segs=16, rings=12,
         cut=lambda co: (co.y < -.03 * s and co.z < 1.672 * s) or co.z < 1.54 * s or (co.z < 1.6 * s and co.y < .02 * s))
    _bangs(self, P, hm, side=.015, depth=.85)
    blob(P, V(0, .09, 1.74), (.06 * s, .05 * s, .05 * s), hm, None, segs=10, rings=7)          # 틀어 올린 머리
    blob(P, V(.02, .07, 1.79), (.04 * s, .035 * s, .03 * s), hm, None, segs=8, rings=6)
    for sx, ln in ((1, .16), (-1, .12)):   # 흘러내린 잔머리
        limb(P, V(sx * .086, -.045, 1.64), V(sx * .1, -.06, 1.64 - ln), [(0, .012 * s, .01 * s), (1, .004 * s, .004 * s)], hm, None, segs=5)
    ob = finish(P); self.scale_head(ob); bind(ob, self.arm, lambda co: {'head': 1.0}); self.add(g, ob)


def yunae3b(self, g):
    """30대 후반 유내 (사용자 도트): 낮게 묶은 머리(옆으로 넘긴 앞머리), 몸에 붙는 갈색 긴소매, 연한 청바지, 짙은 신.
    구역: 윗옷 3 · 청바지 4 · 신 5 · 머리 2"""
    s, V = self.s, self.V
    top = rmat('top', .85, .1); jeans = rmat('bottom', .8, .12); hm = rmat('hair', .45, .5)
    self.legs(g, jeans, rmat('shoe', .6, .3), foot=.88)
    self.torso(g, top, jeans, hem=.99)
    self.head(g)
    self.arms(g, top, 1.95, cuff=True); self.hands(g)
    R = (.101 * s, .114 * s, .128 * s)
    P = Part(g + '.hair')
    blob(P, V(0, .01, 1.63), (R[0] * 1.05, R[1] * 1.04, R[2] * 1.02), hm, None, segs=16, rings=12,
         cut=lambda co: (co.y < -.035 * s and co.z < 1.672 * s and abs(co.x) < .085 * s) or co.z < 1.52 * s or (co.z < 1.58 * s and co.y < .0 * s))
    blob(P, V(-.03, -.075, 1.7), (.07 * s, .042 * s, .03 * s), hm, None, segs=10, rings=7)
    blob(P, V(0, .12, 1.56), (.04 * s, .035 * s, .04 * s), hm, None, segs=8, rings=6)
    limb(P, V(0, .13, 1.55), V(0, .16, 1.36), [(0, .038 * s, .032 * s), (.5, .04 * s, .03 * s), (1, .014 * s, .012 * s)], hm, None, segs=8)
    for sx in (1, -1):
        limb(P, V(sx * .09, -.03, 1.6), V(sx * .1, -.04, 1.48), [(0, .014 * s, .012 * s), (1, .005 * s, .005 * s)], hm, None, segs=5)
    ob = finish(P); self.scale_head(ob); bind(ob, self.arm, lambda co: {'head': 1.0}); self.add(g, ob)


NEW43 = {'yellowwing': yellowwing, 'maskgirl': maskgirl, 'kaldrek': kaldrek, 'obolo': obolo, 'noeul': noeul, 'mari': mari,
         'maskfiend': maskfiend, 'whisperer': whisperer, 'puppet': puppet, 'manette': manette, 'marcion': marcion,
         'yunae1': yunae1b, 'yunae2': yunae2b, 'yunae3': yunae3b}
