"""48차 전용 몸: 지옥 필드 보스 넷(설정집) · 층을 거니는 염소대왕.
사람 뼈대 그대로 움직이되 몸을 그 존재답게 덧입힌다 (네발 짐승도 두 발로 서되 등을 굽힌 덩치로)."""
import math, random
from mathutils import Vector
from rig import Part, limb, blob, finish, bind, smooth, rigid
from dreambodies import rmat, _spine_w, _head_tools


def _surf(V, s, rnd, z0, z1, rad):
    z = rnd.uniform(z0, z1); a = rnd.uniform(0, math.tau)
    return V(math.cos(a) * rad, math.sin(a) * rad * .8, z), a, z


def _horn(P, base, side, s, m, turns=1.15, r0=.034, size=1.0):
    """감긴 숫양 뿔: 관자놀이에서 뒤로 넘어가 아래로 돌아 앞으로 감긴다"""
    pts = []
    for n in range(15):
        t = n / 14
        a = t * turns * math.tau
        rr = (.075 - .03 * t) * s * size
        pts.append(base + Vector((side * (.02 + .05 * t) * s * size, math.cos(a) * rr - rr * .2, math.sin(a) * rr + .02 * s * (1 - t))))
    for n in range(14):
        w0 = (r0 - n * r0 * .055) * s * size
        limb(P, pts[n], pts[n + 1], [(0, w0, w0), (1, max(.004 * s, w0 * .94), max(.004 * s, w0 * .94))], m, None, segs=7)
    return pts[-1]


def rokkb(self, g):
    """로크, 재등짐승 (1층 필드 보스): 재와 돌이 등에 굳어 붙은 거대한 짐승 — 굽은 등에 부서진 돌문 조각,
    재가 엉겨 굳은 거친 털, 낮게 내민 머리의 굵은 엄니와 짧은 뿔, 잿불 같은 눈. 구역: 살 1 · 털 2 · 돌 13 · 문 14 · 눈 12 · 검정 15"""
    s, V = self.s, self.V
    hide = rmat('skin', .9, .05); fur = rmat('hair', .95, .03); stone = rmat('wood', .9, .05); door = rmat('metal', .7, .2, .1)
    glow = rmat('crest', .25, .9); dark = rmat('dark', .9, .05); tusk = rmat('bandage', .4, .4)
    rnd = random.Random(48)
    def hulk(rings):
        out = []
        for c, u, v, rs, rf in rings:
            z = c.z / s
            k = 1.55 if 1.05 < z < 1.45 else 1.3
            out.append((c + Vector((0, .02 * s if z > 1.2 else 0, 0)), u, v, rs * k + .02, rf * k + .03))
        return out
    self.torso(g, hide, hide, hem=.95, extra=hulk)
    self.arms(g, None, wide=1.5); self.hands(g); self.legs(g, hide, dark, foot=1.35)
    P = Part(g + '.back')
    blob(P, V(0, .14, 1.36), (.24 * s, .17 * s, .2 * s), hide, None, segs=14, rings=10)   # 굽은 등 혹
    for k in range(11):   # 등에 굳은 돌덩이
        c = V(rnd.uniform(-.2, .2), .2 + rnd.uniform(0, .06), rnd.uniform(1.15, 1.55))
        r = rnd.uniform(.04, .08)
        blob(P, c, (r * s, r * .8 * s, r * 1.1 * s), stone, None, segs=6, rings=4)
    # 부서진 돌문 조각: 등에 비스듬히 박힌 판 · 녹슨 문고리
    limb(P, V(-.18, .28, 1.62), V(.12, .24, 1.12), [(0, .16 * s, .03 * s), (1, .14 * s, .03 * s)], stone, None, segs=4)
    blob(P, V(-.02, .31, 1.38), (.03 * s, .012 * s, .03 * s), door, None, segs=8, rings=5)
    for k in range(26):   # 재가 엉긴 털 다발
        c, a, z = _surf(V, s, rnd, 1.0, 1.5, .24)
        limb(P, c, c + Vector((math.cos(a) * .03, math.sin(a) * .03, -rnd.uniform(.06, .14))) * s, [(0, .02 * s, .012 * s), (1, .004 * s, .003 * s)], fur, None, segs=4)
    for k in range(10):   # 털 사이 잿불 금
        c, a, z = _surf(V, s, rnd, 1.0, 1.42, .25)
        limb(P, c, c + Vector((0, 0, -.05 * s)), [(0, .006 * s, .006 * s), (1, .003 * s, .003 * s)], glow, None, segs=4)
    ob = finish(P); bind(ob, self.arm, _spine_w(s), subsurf=0); self.add(g, ob)
    # 낮게 내민 머리: 넓적한 주둥이 · 위로 휜 엄니 · 짧은 뿔 · 잿불 눈
    hc = V(0, -.1, 1.5)
    P = Part(g + '.head')
    blob(P, hc, (.13 * s, .14 * s, .1 * s), hide, None, segs=14, rings=10)
    blob(P, hc + Vector((0, -.12 * s, -.03 * s)), (.09 * s, .08 * s, .06 * s), hide, None, segs=12, rings=8)
    blob(P, hc + Vector((0, -.19 * s, -.03 * s)), (.05 * s, .02 * s, .03 * s), dark, None, segs=8, rings=5)
    for sx in (1, -1):
        limb(P, hc + Vector((sx * .06 * s, -.15 * s, -.06 * s)), hc + Vector((sx * .09 * s, -.2 * s, .04 * s)), [(0, .018 * s, .018 * s), (1, .004 * s, .004 * s)], tusk, None, segs=6)
        limb(P, hc + Vector((sx * .08 * s, .02 * s, .07 * s)), hc + Vector((sx * .14 * s, .06 * s, .16 * s)), [(0, .026 * s, .026 * s), (1, .004 * s, .004 * s)], stone, None, segs=6)
        blob(P, hc + Vector((sx * .055 * s, -.12 * s, .04 * s)), (.016 * s, .01 * s, .012 * s), glow, None, segs=6, rings=4)
    ob = finish(P); bind(ob, self.arm, lambda co: {'head': smooth(co.z, 1.4 * s, 1.46 * s), 'spine': 1 - smooth(co.z, 1.4 * s, 1.46 * s)}); self.add(g, ob)


def gulonb(self, g):
    """굴론, 빈배의 포식자 (2층 필드 보스): 빈 항아리처럼 부푼 두꺼비 — 목 대신 항아리 주둥이 같은 테,
    배를 가로지른 균열과 입이 황록색으로 번들거린다, 짧고 굵은 다리, 머리 위로 튀어나온 눈.
    구역: 살 1 · 배 3 · 균열 12 · 테 13 · 검정 15 · 이빨 11"""
    s, V = self.s, self.V
    flesh = rmat('skin', .55, .3); belly = rmat('top', .6, .25); crack = rmat('crest', .25, .9); rim = rmat('wood', .6, .3)
    dark = rmat('dark', .85, .08); tooth = rmat('parrot', .4, .45)
    rnd = random.Random(49)
    def jar(rings):
        out = []
        for c, u, v, rs, rf in rings:
            z = c.z / s
            k = 1.9 if z < 1.3 else 1.45
            out.append((c + Vector((0, -.04 * s, 0)), u, v, rs * k + .04, rf * k * 1.15 + .04))
        return out
    self.torso(g, flesh, dark, hem=.92, extra=jar)
    self.arms(g, None, wide=1.2); self.hands(g); self.legs(g, flesh, dark, foot=1.5)
    P = Part(g + '.belly')
    blob(P, V(0, -.18, 1.06), (.3 * s, .2 * s, .27 * s), belly, None, segs=18, rings=14)   # 빈 항아리 배
    for k in range(7):   # 배를 가로지른 균열 (황록색)
        z = 1.0 + k * .035; x0 = rnd.uniform(-.2, -.05)
        limb(P, V(x0, -.36, z), V(x0 + rnd.uniform(.15, .3), -.36, z + rnd.uniform(-.05, .05)), [(0, .008 * s, .006 * s), (1, .004 * s, .003 * s)], crack, None, segs=4)
    limb(P, V(0, 0, 1.47), V(0, 0, 1.52), [(0, .14 * s, .12 * s), (1, .15 * s, .13 * s)], rim, None, segs=14)   # 항아리 주둥이 테
    for k in range(24):   # 사마귀
        c, a, z = _surf(V, s, rnd, .95, 1.45, .3)
        if math.sin(a) < -.5 and z < 1.3: continue
        rr = rnd.uniform(.012, .028)
        blob(P, c, (rr * s, rr * s, rr * s), flesh if k % 2 else dark, None, segs=6, rings=4)
    ob = finish(P); bind(ob, self.arm, _spine_w(s), subsurf=0); self.add(g, ob)
    hc = V(0, -.07, 1.56)
    P = Part(g + '.head')
    blob(P, hc, (.18 * s, .15 * s, .1 * s), flesh, None, segs=16, rings=12)
    blob(P, hc + Vector((0, -.13 * s, -.02 * s)), (.16 * s, .035 * s, .03 * s), crack, None, segs=14, rings=8)   # 번들거리는 아가리
    for row in (1, -1):
        for k in range(10):
            x = (k - 4.5) / 4.5 * .13
            base = hc + Vector((x * s, -.15 * s + abs(x) * .2 * s, (-.02 + row * .022) * s))
            limb(P, base, base + Vector((0, -.01 * s, -row * .028 * s)), [(0, .01 * s, .01 * s), (1, .002 * s, .002 * s)], tooth, None, segs=4)
    for sx in (1, -1):
        blob(P, hc + Vector((sx * .08 * s, -.03 * s, .1 * s)), (.045 * s, .045 * s, .045 * s), flesh, None, segs=10, rings=7)
        blob(P, hc + Vector((sx * .08 * s, -.07 * s, .11 * s)), (.024 * s, .012 * s, .024 * s), crack, None, segs=8, rings=5)
    ob = finish(P); bind(ob, self.arm, lambda co: {'head': smooth(co.z, 1.44 * s, 1.5 * s), 'spine': 1 - smooth(co.z, 1.44 * s, 1.5 * s)}); self.add(g, ob)


def merkb(self, g):
    """메르크, 계약포식자 (3층 필드 보스): 여섯 다리로 걷는 큰 쇠 금고 — 몸통이 곧 금고(둥근 다이얼 · 경첩 · 금 테),
    문틈으로 봉랍 찍힌 계약서들이 혀처럼 비어져 나온다. 두 다리 말고도 옆구리의 거미다리 넷.
    구역: 금고 14 · 금 테 13 · 종이 10 · 봉랍 12 · 검정 15 · 다리 1"""
    s, V = self.s, self.V
    steel = rmat('metal', .45, .5, .7); trim = rmat('wood', .35, .6, .6); paper = rmat('bandage', .6, .2); wax = rmat('crest', .4, .5)
    dark = rmat('dark', .85, .08); leg = rmat('skin', .6, .35, .3)
    def box(rings):
        out = []
        for c, u, v, rs, rf in rings:
            z = c.z / s
            k = 1.75 if .9 < z < 1.55 else 1.2
            out.append((c, u, v, rs * k + .03, rf * k * 1.25 + .03))
        return out
    self.torso(g, steel, steel, hem=.9, extra=box)
    self.arms(g, None, wide=.9); self.hands(g); self.legs(g, leg, dark, foot=1.15)
    P = Part(g + '.safe')
    for z in (.95, 1.25, 1.55):   # 금 테 띠
        limb(P, V(0, 0, z - .015), V(0, 0, z + .015), [(0, .3 * s, .27 * s), (1, .3 * s, .27 * s)], trim, None, segs=16)
    blob(P, V(0, -.31, 1.26), (.09 * s, .02 * s, .09 * s), trim, None, segs=14, rings=6)   # 다이얼
    blob(P, V(0, -.33, 1.26), (.05 * s, .012 * s, .05 * s), dark, None, segs=12, rings=5)
    for sx in (1, -1):   # 경첩
        for z in (1.05, 1.45):
            blob(P, V(sx * .26, -.24, z), (.025 * s, .02 * s, .04 * s), trim, None, segs=6, rings=4)
    for k in range(7):   # 문틈의 계약서 · 봉랍
        x = (k - 3) * .06
        top = V(x, -.3, 1.6); low = top + Vector((x * .3, -.06, -.14 - (k % 3) * .04)) * s
        limb(P, top, low, [(0, .03 * s, .004 * s), (1, .03 * s, .004 * s)], paper, None, segs=4)
        blob(P, low, (.018 * s, .01 * s, .018 * s), wax, None, segs=6, rings=4)
    # 옆구리의 거미다리 넷 (꺾인 채 땅을 짚는다)
    for sx in (1, -1):
        for n, (y, z) in enumerate(((-.12, 1.1), (.14, 1.05))):
            a = V(sx * .3, y, z); b = V(sx * .55, y * 1.6, z + .12); c = V(sx * .66, y * 2.0, .05)
            limb(P, a, b, [(0, .03 * s, .03 * s), (1, .025 * s, .025 * s)], leg, None, segs=6)
            limb(P, b, c, [(0, .025 * s, .025 * s), (1, .008 * s, .008 * s)], leg, None, segs=6)
    ob = finish(P); bind(ob, self.arm, _spine_w(s), subsurf=0); self.add(g, ob)
    # 머리 대신 금고 위의 작은 자물쇠 머리 (열쇠 구멍 눈)
    hc = V(0, -.02, 1.66)
    P = Part(g + '.head')
    blob(P, hc, (.1 * s, .09 * s, .08 * s), steel, None, segs=10, rings=7)
    limb(P, hc + Vector((-.06 * s, .0, .05 * s)), hc + Vector((.06 * s, 0, .05 * s)), [(0, .03 * s, .03 * s), (1, .03 * s, .03 * s)], trim, None, segs=8)
    blob(P, hc + Vector((0, -.09 * s, 0)), (.015 * s, .006 * s, .03 * s), wax, None, segs=6, rings=4)
    ob = finish(P); self.scale_head(ob); bind(ob, self.arm, lambda co: {'head': 1.0}); self.add(g, ob)


def ferronb(self, g):
    """페론, 용광로의 심장 (4층 필드 보스): 용광로가 살아 일어선 철제 거인 — 가슴의 붉은 화구(쇠창살 너머 불),
    어깨 뒤로 솟은 굴뚝 둘, 리벳 박힌 판갑 같은 몸, 굵은 쇠팔과 쇠주먹, 투구 같은 머리의 가는 불빛 틈.
    구역: 쇠 1 · 판 15 · 불 12 · 굴뚝 14 · 리벳 13"""
    s, V = self.s, self.V
    iron = rmat('skin', .55, .45, .7); plate = rmat('dark', .5, .5, .6); fire = rmat('crest', .2, .95); pipe = rmat('metal', .4, .55, .8); rivet = rmat('wood', .35, .6, .6)
    rnd = random.Random(50)
    def titan(rings):
        out = []
        for c, u, v, rs, rf in rings:
            z = c.z / s
            k = 1.55 if 1.12 < z < 1.48 else 1.22
            out.append((c, u, v, rs * k + .02, rf * k + .02))
        return out
    self.torso(g, iron, plate, hem=.98, extra=titan)
    self.arms(g, None, wide=1.6); self.hands(g); self.legs(g, iron, plate, foot=1.35)
    P = Part(g + '.forge')
    # 가슴의 화구: 쇠틀 · 쇠창살 · 그 너머 불
    blob(P, V(0, -.26, 1.3), (.15 * s, .03 * s, .12 * s), fire, None, segs=12, rings=6)
    limb(P, V(0, -.27, 1.3), V(0, -.25, 1.3), [(0, .19 * s, .15 * s), (1, .19 * s, .15 * s)], plate, None, segs=14, caps=(False, False))
    for k in range(5):
        x = (k - 2) * .055
        limb(P, V(x, -.29, 1.2), V(x, -.29, 1.4), [(0, .01 * s, .01 * s), (1, .01 * s, .01 * s)], pipe, None, segs=5)
    # 어깨 뒤 굴뚝 둘 · 끝의 불티
    for sx in (1, -1):
        limb(P, V(sx * .16, .14, 1.4), V(sx * .2, .18, 1.92), [(0, .05 * s, .05 * s), (1, .045 * s, .045 * s)], pipe, None, segs=10)
        limb(P, V(sx * .2, .18, 1.9), V(sx * .2, .18, 1.95), [(0, .065 * s, .065 * s), (1, .065 * s, .065 * s)], rivet, None, segs=10)
        blob(P, V(sx * .2, .18, 1.97), (.04 * s, .04 * s, .03 * s), fire, None, segs=8, rings=5)
        blob(P, V(sx * .28, 0, 1.45), (.14 * s, .13 * s, .09 * s), plate, None, segs=12, rings=8)   # 어깨 판
    for k in range(40):   # 리벳
        c, a, z = _surf(V, s, rnd, 1.0, 1.48, .29)
        blob(P, c, (.008 * s, .008 * s, .008 * s), rivet, None, segs=5, rings=3)
    for k in range(10):   # 판 이음새의 붉은 틈
        c, a, z = _surf(V, s, rnd, 1.0, 1.45, .3)
        limb(P, c, c + Vector((0, 0, -.06 * s)), [(0, .006 * s, .006 * s), (1, .003 * s, .003 * s)], fire, None, segs=4)
    ob = finish(P); bind(ob, self.arm, _spine_w(s), subsurf=0); self.add(g, ob)
    for k in 'LR':   # 쇠주먹 (손을 덮는 큰 건틀릿)
        bn = f'forearm.{k}'
        a, b = self.bones[bn][0], self.bones[bn][1]
        P = Part(f'{g}.fist.{k}')
        limb(P, a + (b - a) * .3, b, [(0, .07 * s, .07 * s), (1, .075 * s, .075 * s)], plate, None, segs=10)
        blob(P, b + (b - a).normalized() * .06 * s, (.08 * s, .08 * s, .08 * s), iron, None, segs=10, rings=7)
        ob = finish(P); bind(ob, self.arm, rigid(bn)); self.add(g, ob)
    hc = V(0, -.02, 1.6)
    P = Part(g + '.head')
    blob(P, hc, (.11 * s, .12 * s, .12 * s), plate, None, segs=12, rings=9)   # 투구 머리
    limb(P, hc + Vector((-.08 * s, -.11 * s, .0)), hc + Vector((.08 * s, -.11 * s, .0)), [(0, .012 * s, .008 * s), (1, .012 * s, .008 * s)], fire, None, segs=5)   # 불빛 틈
    limb(P, hc + Vector((0, -.02 * s, .1 * s)), hc + Vector((0, .1 * s, .14 * s)), [(0, .02 * s, .03 * s), (1, .01 * s, .01 * s)], pipe, None, segs=5)   # 볏
    ob = finish(P); self.scale_head(ob); bind(ob, self.arm, lambda co: {'head': 1.0}); self.add(g, ob)


def goatkingw(self, g):
    """48차 층을 거니는 염소대왕 (사용자 그림 두 장): 숫양 머리 — 금테 두른 감긴 뿔, 붉은 눈, 흰 턱수염,
    구슬 줄을 앞뒤로 드리운 판관 모자, 땅에 끌리는 검붉은 관복(금빛 구름무늬 · 가슴의 숫양 해골 버클), 금반지 낀 손.
    구역: 관복 3 · 안감 9 · 금 14 · 털 1 · 뿔 13 · 눈 12 · 검정 15 · 구슬 10 · 수염 2"""
    s, V = self.s, self.V
    robe = rmat('top', .85, .1); lin = rmat('gown', .8, .1); gold = rmat('metal', .25, .75, .9); fur = rmat('skin', .9, .05)
    horn = rmat('wood', .5, .3); eye = rmat('crest', .25, .9); dark = rmat('dark', .9, .05); bead = rmat('bandage', .3, .5); beard = rmat('hair', .9, .05)
    rnd = random.Random(142)
    self.legs(g, rmat('bottom', .85, .1), rmat('shoe', .5, .4), foot=1.05)
    skirt_w, rad = self.long_body(g, robe, hem=.04, flare=1.08, grow=1.14, cuff=lin, sleeve_w=1.25)
    self.head(g, face=False); self.hands(g)
    P = Part(g + '.robe')
    for i in range(54):   # 금빛 구름무늬
        z = rnd.uniform(.1, 1.4); a = rnd.uniform(math.radians(-40), math.radians(220))
        if z > .98:
            rx, ry, cy = self.torso_r(z, 1.14, .008)
        else:
            r0, r1 = rad(z); rx, ry, cy = r0 * s * self.bw + .02, r1 * s + .024, .005 * s
        c = Vector((math.cos(a) * rx, cy - math.sin(a) * ry, z * s))
        blob(P, c, (.03 * s, .01 * s, .016 * s), gold, None, segs=6, rings=4)
    limb(P, V(0, 0, 1.0), V(0, 0, 1.05), [(0, .2 * s, .16 * s), (1, .2 * s, .16 * s)], gold, None, segs=16)   # 금띠
    blob(P, V(0, -.18, 1.03), (.05 * s, .02 * s, .045 * s), fur, None, segs=8, rings=5)   # 숫양 해골 버클
    for sx in (1, -1):
        limb(P, V(sx * .02, -.19, 1.06), V(sx * .06, -.19, 1.02), [(0, .01 * s, .01 * s), (1, .004 * s, .004 * s)], gold, None, segs=4)
    for z in (1.42, 1.2):   # 가슴 앞섶의 금 테
        limb(P, V(-.02, -.17, z), V(.06, -.17, z - .18), [(0, .015 * s, .006 * s), (1, .015 * s, .006 * s)], gold, None, segs=4)
    ob = finish(P); bind(ob, self.arm, lambda co: skirt_w(co) if co.z < 1.0 * s else _spine_w(s)(co), subsurf=0); self.add(g, ob)
    hc0, hs = _head_tools(self)
    P = Part(g + '.goat')
    hc = hs(V(0, -.01, 1.62))
    blob(P, hc, (.1 * s, .11 * s, .11 * s), fur, None, segs=14, rings=10)
    blob(P, hc + Vector((0, -.11 * s, -.05 * s)), (.055 * s, .09 * s, .06 * s), fur, None, segs=12, rings=8)   # 길쭉한 주둥이
    blob(P, hc + Vector((0, -.19 * s, -.06 * s)), (.03 * s, .015 * s, .02 * s), dark, None, segs=8, rings=5)   # 코
    for sx in (1, -1):
        blob(P, hc + Vector((sx * .055 * s, -.08 * s, .03 * s)), (.016 * s, .01 * s, .012 * s), eye, None, segs=6, rings=4)   # 붉은 눈
        tip = _horn(P, hc + Vector((sx * .06 * s, .01 * s, .07 * s)), sx, s, horn, size=1.25)
        blob(P, hc + Vector((sx * .095 * s, .02 * s, .06 * s)), (.03 * s, .03 * s, .012 * s), gold, None, segs=8, rings=4)   # 뿔뿌리 금테
        limb(P, hc + Vector((sx * .09 * s, .0, .03 * s)), hc + Vector((sx * .15 * s, .02 * s, -.02 * s)), [(0, .025 * s, .012 * s), (1, .006 * s, .004 * s)], fur, None, segs=5)   # 늘어진 귀
    for k in range(5):   # 흰 턱수염
        x = (k - 2) * .012
        limb(P, hc + Vector((x * s, -.14 * s, -.1 * s)), hc + Vector((x * 1.4 * s, -.13 * s, -.24 * s - abs(x) * s)), [(0, .014 * s, .012 * s), (1, .004 * s, .004 * s)], beard, None, segs=5)
    # 판관 모자: 둥근 몸 위 넓적한 판, 앞뒤로 드리운 구슬 줄
    limb(P, hc + Vector((0, .0, .08 * s)), hc + Vector((0, .0, .16 * s)), [(0, .08 * s, .08 * s), (1, .075 * s, .075 * s)], dark, None, segs=12)
    blob(P, hc + Vector((0, .0, .17 * s)), (.17 * s, .12 * s, .012 * s), dark, None, segs=12, rings=4)
    limb(P, hc + Vector((-.16 * s, -.11 * s, .17 * s)), hc + Vector((.16 * s, -.11 * s, .17 * s)), [(0, .006 * s, .006 * s), (1, .006 * s, .006 * s)], gold, None, segs=5)
    for side in (-1, 1):
        for k in range(7):
            x = (k - 3) * .045
            top = hc + Vector((x * s, side * .11 * s, .165 * s))
            for n in range(4):
                blob(P, top + Vector((0, 0, -.028 * s * (n + 1))), (.008 * s, .008 * s, .008 * s), bead if n % 2 else gold, None, segs=5, rings=3)
    ob = finish(P); bind(ob, self.arm, lambda co: {'head': 1.0}); self.add(g, ob)
    for k in 'LR':   # 금반지
        bn = f'hand.{k}' if f'hand.{k}' in self.bones else f'forearm.{k}'
        a, b = self.bones[bn][0], self.bones[bn][1]
        P = Part(f'{g}.ring.{k}')
        blob(P, b + (b - a).normalized() * .03 * s, (.014 * s, .014 * s, .01 * s), gold, None, segs=6, rings=4)
        ob = finish(P); bind(ob, self.arm, rigid(bn)); self.add(g, ob)


NEW48 = {'rokkb': rokkb, 'gulonb': gulonb, 'merkb': merkb, 'ferronb': ferronb, 'goatkingw': goatkingw}
