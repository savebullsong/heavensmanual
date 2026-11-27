"""49차 전용 몸: 수쿰빗 필드 보스 둘 — 마피아 두목 · 방콕의 대식자.
사람 뼈대 그대로 움직이되, 두목은 배 나온 거구의 흰 정장 · 어깨에 걸친 털 코트, 대식자는 등이 굽은 거인의 꿰맨 큰 입."""
import math, random
from mathutils import Vector
from rig import Part, limb, blob, finish, bind, smooth, rigid
from dreambodies import rmat, _spine_w, arcloft


def mafiaboss(self, g):
    """마피아 두목: 배가 불룩한 거구, 흰 정장(재킷 · 바지), 검은 셔츠에 금빛 넥타이, 굵은 금 목걸이 두 줄,
    어깨에 걸친 검은 털 코트(소매는 비어 흔들린다), 흰 중절모의 검은 띠, 검은 선글라스, 입에 문 시가, 넘긴 머리, 금반지.
    구역: 살 1 · 머리 2 · 정장 3 · 바지 4 · 구두 5 · 털 코트 9 · 셔츠 10 · 넥타이 12 · 모자 13 · 금 14 · 검정 15"""
    s, V = self.s, self.V
    suit = rmat('top', .5, .32); bot = rmat('bottom', .55, .28); shoe = rmat('shoe', .25, .7)
    shirt = rmat('bandage', .6, .2); tie = rmat('crest', .35, .55, .3); gold = rmat('metal', .22, .75, .9)
    dark = rmat('dark', .2, .8); fur = rmat('gown', .95, .03); hat = rmat('wood', .55, .3); hair = rmat('hair', .4, .5)
    skin = rmat('skin', .6, .3)

    def belly(rings):
        out = []
        for c, u, v, rs, rf in rings:
            z = c.z / s
            b = math.exp(-((z - 1.08) / .17) ** 2)   # 배꼽 높이에서 가장 불룩
            out.append((c + Vector((0, -.05 * s * b, 0)), u, v, rs * (1.1 + .12 * b) + .01, rf * (1.12 + .5 * b) + .012))
        c0, u, v, rs, rf = out[0]
        out.insert(0, (V(0, .0, .8), u, v, rs * 1.08, rf * 1.12))   # 재킷 자락은 엉덩이까지
        return out
    self.torso(g, suit, bot, hem=.84, extra=belly)
    self.head(g); self.arms(g, suit, 1.9, cuff=True, wide=1.12); self.hands(g); self.legs(g, bot, shoe, foot=1.08)

    P = Part(g + '.dress')
    for sx in (1, -1):   # 검은 셔츠 앞섶(V자) · 넓은 재킷 깃
        limb(P, V(sx * .06, -.135, 1.45), V(sx * .012, -.2, 1.17), [(0, .034 * s, .006 * s), (1, .012 * s, .006 * s)], shirt, None, segs=4)
        limb(P, V(sx * .065, -.125, 1.46), V(sx * .12, -.19, 1.24), [(0, .034 * s, .007 * s), (1, .016 * s, .007 * s)], suit, None, segs=4)
    limb(P, V(0, -.172, 1.43), V(0, -.215, 1.1), [(0, .017 * s, .006 * s), (.85, .026 * s, .006 * s), (1, .006 * s, .004 * s)], tie, None, segs=5)
    for row, (dz, sag, r) in enumerate(((0, .02, .011), (.05, .06, .013))):   # 굵은 금 목걸이 두 줄
        for n in range(11):
            t = n / 10 * 2 - 1
            blob(P, V(t * .075, -.14 - (1 - t * t) * (.03 + sag * .5), 1.455 - dz - (1 - t * t) * sag), (r * s, .007 * s, r * s), gold, None, segs=6, rings=4)
    for z in (1.02, .93):   # 단추 · 가슴 주머니의 검은 손수건
        blob(P, V(0, -.245, z), (.011 * s, .006 * s, .011 * s), dark, None, segs=6, rings=4)
    blob(P, V(.1, -.19, 1.33), (.022 * s, .006 * s, .014 * s), dark, None, segs=6, rings=4)
    ob = finish(P); bind(ob, self.arm, lambda co: {'spine': smooth(co.z, .98 * s, 1.12 * s), 'hips': 1 - smooth(co.z, .98 * s, 1.12 * s)}); self.add(g, ob)

    # 어깨에 걸친 털 코트: 어깨에서 무릎 아래까지, 등과 양옆만 덮고 앞은 트였다 · 깃은 두툼한 털
    P = Part(g + '.furcoat')
    table = [(1.47, .2, .15), (1.38, .27, .2), (1.2, .3, .25), (1.0, .32, .27), (.8, .34, .28), (.6, .36, .3), (.45, .38, .31)]
    rings = [(V(0, .03, z), rx * s * self.bw, ry * s) for z, rx, ry in table]
    arcloft(P, rings, fur, math.pi - .55, 2 * math.pi + .55, segs=18)
    for i in range(22):   # 털 깃
        a = math.pi - .6 + (math.pi + 1.2) * i / 21
        c = V(0, .03, 1.47) + Vector((math.cos(a) * .2 * s * self.bw, -math.sin(a) * .15 * s, .01 * s))
        blob(P, c, (.04 * s, .035 * s, .035 * s), fur, None, segs=7, rings=4)
    for sx in (1, -1):   # 빈 소매 (팔을 꿰지 않고 늘어뜨림)
        limb(P, V(sx * .3, .06, 1.38), V(sx * .33, .1, .92), [(0, .06 * s, .06 * s), (1, .07 * s, .07 * s)], fur, None, segs=8)
    ob = finish(P)
    bind(ob, self.arm, lambda co: {'spine': smooth(co.z, .9 * s, 1.15 * s), 'hips': 1 - smooth(co.z, .9 * s, 1.15 * s)}, subsurf=0); self.add(g, ob)

    # 머리: 넘긴 머리 · 흰 중절모(검은 띠) · 선글라스 · 시가
    hc = V(0, -.005, 1.615)
    P = Part(g + '.top')
    blob(P, hc + Vector((0, .02 * s, .04 * s)), (.096 * s, .1 * s, .09 * s), hair, None, segs=14, rings=9, cut=lambda co: co.y < -.06 * s or co.z < hc.z - .02 * s)
    limb(P, hc + Vector((0, 0, .075 * s)), hc + Vector((0, 0, .16 * s)), [(0, .1 * s, .105 * s), (.6, .095 * s, .1 * s), (1, .085 * s, .09 * s)], hat, None, segs=14)
    blob(P, hc + Vector((0, -.005 * s, .16 * s)), (.085 * s, .09 * s, .018 * s), hat, None, segs=12, rings=5)
    limb(P, hc + Vector((0, 0, .085 * s)), hc + Vector((0, 0, .105 * s)), [(0, .103 * s, .108 * s), (1, .101 * s, .106 * s)], dark, None, segs=14)   # 모자 띠
    blob(P, hc + Vector((0, -.01 * s, .075 * s)), (.175 * s, .17 * s, .012 * s), hat, None, segs=16, rings=5)   # 넓은 챙
    for sx in (1, -1):
        blob(P, hc + Vector((sx * .034 * s, -.098 * s, .014 * s)), (.028 * s, .008 * s, .017 * s), dark, None, segs=10, rings=6)
        limb(P, hc + Vector((sx * .06 * s, -.09 * s, .016 * s)), hc + Vector((sx * .088 * s, -.02 * s, .02 * s)), [(0, .004 * s, .004 * s), (1, .004 * s, .004 * s)], gold, None, segs=4)
    limb(P, hc + Vector((-.01 * s, -.1 * s, .02 * s)), hc + Vector((.01 * s, -.1 * s, .02 * s)), [(0, .004 * s, .004 * s), (1, .004 * s, .004 * s)], gold, None, segs=4)
    limb(P, hc + Vector((.02 * s, -.1 * s, -.045 * s)), hc + Vector((.07 * s, -.16 * s, -.05 * s)), [(0, .009 * s, .009 * s), (1, .01 * s, .01 * s)], hat, None, segs=6)   # 시가
    blob(P, hc + Vector((.072 * s, -.163 * s, -.05 * s)), (.009 * s, .009 * s, .009 * s), rmat('crest', .3, .8), None, segs=6, rings=4)   # 시가 불
    ob = finish(P); self.scale_head(ob); bind(ob, self.arm, lambda co: {'head': 1.0}); self.add(g, ob)
    for k in 'LR':   # 굵은 금반지 · 금시계
        bn = f'hand.{k}'
        a, b = self.bones[bn][0], self.bones[bn][1]
        P = Part(f'{g}.ring.{k}')
        blob(P, b + (b - a).normalized() * .01 * s + Vector((0, -.012 * s, 0)), (.015 * s, .015 * s, .011 * s), gold, None, segs=6, rings=4)
        if k == 'L': limb(P, a + Vector((0, 0, .01 * s)), a + Vector((0, 0, -.012 * s)), [(0, .03 * s, .03 * s), (1, .03 * s, .03 * s)], gold, None, segs=8)
        ob = finish(P); bind(ob, self.arm, rigid(bn)); self.add(g, ob)


def bkkeater(self, g):
    """방콕의 대식자 (수쿰빗 최후 보스): 등이 굽은 거인 — 무릎까지 늘어진 긴 팔과 갈고리 손가락, 해진 긴 코트,
    귀에서 귀까지 찢어져 꿰맨 큰 입(실 사이로 이빨), 흰 봉합 가면 위 챙 넓은 모자, 배를 가로지른 굵은 봉합선, 허리에 매단 큰 바늘 다발.
    구역: 살 1 · 코트 3 · 바지 4 · 장화 5 · 가면 10 · 실 15 · 이빨 11 · 피 12 · 모자 13 · 바늘 14"""
    s, V = self.s, self.V
    coat = rmat('top', .8, .12); bot = rmat('bottom', .85, .1); boot = rmat('shoe', .5, .4); mask = rmat('bandage', .45, .35)
    thread = rmat('dark', .8, .1); teeth = rmat('parrot', .35, .5); blood = rmat('crest', .4, .5); hat = rmat('wood', .85, .08)
    steel = rmat('metal', .3, .7, .9); skin = rmat('skin', .75, .15)
    rnd = random.Random(49)

    def hulk(rings):
        out = []
        for c, u, v, rs, rf in rings:
            z = c.z / s
            k = 1.3 if z > 1.0 else 1.42 + (1.0 - z) * .55
            out.append((c + Vector((0, .03 * s if z > 1.25 else 0, 0)), u, v, rs * k + .012, rf * (1.25 if z > 1.0 else 1.35) + .014))
        c0, u, v, rs, rf = out[0]
        out.insert(0, (V(0, .01, .42), u, v, rs * 1.25, rf * 1.3))   # 코트 자락은 정강이까지
        return out
    self.torso(g, coat, coat, hem=0, extra=hulk)
    self.head(g, face=False); self.arms(g, coat, 1.9, cuff=True, wide=1.3); self.hands(g, skin); self.legs(g, bot, boot, boot=True, foot=1.2)

    P = Part(g + '.coat')
    for i in range(16):   # 해진 자락 · 덧댄 천을 꿰맨 실
        a = rnd.uniform(math.pi * .1, math.pi * 1.9)
        z = rnd.uniform(.45, .55)
        r = .3 + (1.0 - z) * .2
        c = V(math.cos(a) * r, .01 - math.sin(a) * r * .9, z)
        limb(P, c, c + Vector((0, 0, -.08 * s)), [(0, .03 * s, .01 * s), (1, .012 * s, .006 * s)], coat, None, segs=4)
    for z in (1.18, 1.05, .92):   # 배를 가로지른 봉합선
        limb(P, V(-.2, -.28, z), V(.2, -.28, z - .03), [(0, .006 * s, .006 * s), (1, .006 * s, .006 * s)], thread, None, segs=6)
        for n in range(7):
            x = -.17 + n * .057
            limb(P, V(x, -.29, z - .03 * (x + .2) / .4 + .025), V(x + .01, -.29, z - .03 * (x + .2) / .4 - .025), [(0, .004 * s, .004 * s), (1, .004 * s, .004 * s)], thread, None, segs=4)
    for k in range(5):   # 허리에 매단 큰 바늘 다발
        a = -.4 + k * .2
        top = V(.24 + k * .015, -.1 + k * .03, 1.0)
        limb(P, top, top + Vector((math.sin(a) * .04 * s, 0, -.32 * s)), [(0, .01 * s, .01 * s), (.85, .008 * s, .008 * s), (1, .002 * s, .002 * s)], steel, None, segs=5)
    ob = finish(P); bind(ob, self.arm, _spine_w(s), subsurf=0); self.add(g, ob)

    # 머리: 봉합 가면 · 귀에서 귀까지 꿰맨 입 · 챙 넓은 모자
    hc = V(0, -.03, 1.6)
    P = Part(g + '.mask')
    blob(P, hc, (.1 * s, .105 * s, .13 * s), mask, None, segs=16, rings=12)
    for sx in (1, -1):   # 퀭한 눈구멍 · 그 안의 붉은 점
        blob(P, hc + Vector((sx * .038 * s, -.098 * s, .03 * s)), (.02 * s, .008 * s, .014 * s), thread, None, segs=8, rings=5)
        blob(P, hc + Vector((sx * .038 * s, -.104 * s, .03 * s)), (.006 * s, .004 * s, .006 * s), blood, None, segs=6, rings=4)
    mouth = []
    for n in range(13):   # 웃는 듯 휘어진 큰 입
        t = n / 12 * 2 - 1
        mouth.append(hc + Vector((t * .09 * s, (-.1 + abs(t) ** 2 * .06) * s, (-.04 + t * t * .035) * s)))
    for a, b in zip(mouth, mouth[1:]):
        limb(P, a, b, [(0, .012 * s, .006 * s), (1, .012 * s, .006 * s)], thread, None, segs=4)
    for n in range(1, 12):   # 실 사이로 드러난 이빨 · 가로지른 실밥
        c = mouth[n]
        blob(P, c + Vector((0, -.006 * s, .006 * s)), (.006 * s, .004 * s, .008 * s), teeth, None, segs=5, rings=3)
        limb(P, c + Vector((0, -.006 * s, .02 * s)), c + Vector((0, -.006 * s, -.02 * s)), [(0, .003 * s, .003 * s), (1, .003 * s, .003 * s)], thread, None, segs=3)
    limb(P, hc + Vector((0, .01 * s, .115 * s)), hc + Vector((0, .02 * s, .2 * s)), [(0, .085 * s, .09 * s), (1, .075 * s, .08 * s)], hat, None, segs=14)
    blob(P, hc + Vector((0, .03 * s, .115 * s)), (.15 * s, .14 * s, .012 * s), hat, None, segs=16, rings=5)   # 뒤로 젖혀 쓴 챙 (위에서도 가면과 입이 보이게)
    ob = finish(P); self.scale_head(ob); bind(ob, self.arm, lambda co: {'head': 1.0}); self.add(g, ob)
    for k in 'LR':   # 갈고리 손가락 넷
        bn = f'hand.{k}'
        a, b = self.bones[bn][0], self.bones[bn][1]
        d = (b - a).normalized()
        P = Part(f'{g}.claw.{k}')
        for f in range(4):
            side = (f - 1.5) * .014 * s
            base = b + Vector((side, -.01 * s, 0))
            mid = base + d * .06 * s + Vector((0, -.02 * s, 0))
            tip = mid + d * .03 * s + Vector((0, .02 * s, 0))
            limb(P, base, mid, [(0, .008 * s, .008 * s), (1, .006 * s, .006 * s)], skin, None, segs=5)
            limb(P, mid, tip, [(0, .006 * s, .006 * s), (1, .002 * s, .002 * s)], thread, None, segs=5)
        ob = finish(P); bind(ob, self.arm, rigid(bn)); self.add(g, ob)


NEW49 = {'mafiaboss': mafiaboss, 'bkkeater': bkkeater}
