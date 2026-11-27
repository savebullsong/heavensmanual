"""44차: 층마다 다른 경비병 — 4층 쇠모루지기(w4) · 5층 가면파수꾼(w5)
1층 재문지기(warden1 해골·두건) · 2층 빈그릇귀(warden2 늪빛 덩치) · 3층 봉랍귀(warden3 상인복)와 겹치지 않게
색은 게임이 입힌다 — 살 1 · 윗옷 3 · 아래 4 · 신 5 · 앞치마 7 · 안감 9 · 흰 천 10 · 빛 12 · 나무 13 · 금속 14 · 검정 15"""
import math
from mathutils import Vector
from rig import Part, loft, limb, blob, finish, bind, smooth, rigid
from dreambodies import rmat, _spine_w, arcloft, _head_tools
from bodies43 import _hold, _mask_face


def anvilward(self, g):
    """4층 쇠모루지기: 어깨가 모루처럼 넓은 덩치. 얼굴은 눈구멍 한 줄만 뚫린 통 쇠투구(틈으로 쇳물빛),
    무릎까지 오는 두꺼운 가죽 외투 위로 가슴을 가로지른 굵은 쇠사슬, 어깨에 모루 모양 쇠 견갑, 큰 쇠 장갑, 두 손으로 드는 큰 쇠메.
    구역: 외투 3 · 바지 4 · 신 5 · 금속 14 · 빛 12 · 장갑 9 · 사슬 15"""
    s, V = self.s, self.V
    coat = rmat('top', .9, .08); iron = rmat('metal', .45, .6, .7); glow = rmat('crest', .25, .9)
    glove = rmat('gown', .6, .3); chain = rmat('dark', .5, .5)
    self.legs(g, rmat('bottom', .85, .1), rmat('shoe', .5, .4), boot=True, foot=1.15)
    skirt_w, rad = self.long_body(g, coat, hem=.5, flare=.8, grow=1.2, sleeve_w=1.15)
    self.head(g, face=False)
    self.hands(g, glove)
    P = Part(g + '.gear')
    # 가슴을 가로지른 쇠사슬 (왼어깨 → 오른허리)
    for k in range(12):
        t = k / 11
        c = V(.17 - t * .34, -.165 - math.sin(t * math.pi) * .02, 1.42 - t * .38)
        blob(P, c, (.024 * s, .014 * s, .02 * s) if k % 2 else (.014 * s, .024 * s, .02 * s), chain, None, segs=6, rings=4)
    # 넓은 쇠 허리띠와 고리
    self.torso_band(P, 1.0, iron, grow=1.22, h=.05, add=.02)
    blob(P, V(0, -.17, 1.0), (.04 * s, .015 * s, .035 * s), iron, None, segs=8, rings=5)
    ob = finish(P); bind(ob, self.arm, _spine_w(s), subsurf=0); self.add(g, ob)
    # 어깨의 모루 견갑
    for k in 'LR':
        a = self.bones[f'upper_arm.{k}'][0]
        P = Part(f'{g}.pauldron.{k}')
        sx = 1 if k == 'L' else -1
        blob(P, a + Vector((sx * .02, 0, .04)) * s, (.1 * s, .09 * s, .05 * s), iron, None, segs=10, rings=6)
        limb(P, a + Vector((sx * .09, 0, .03)) * s, a + Vector((sx * .15, 0, .015)) * s, [(0, .04 * s, .03 * s), (1, .015 * s, .012 * s)], iron, None, segs=6)   # 모루 뿔
        ob = finish(P); bind(ob, self.arm, rigid(f'upper_arm.{k}'), subsurf=0); self.add(g, ob)
        # 쇠 장갑 팔목
        el, wr = self.bones[f'forearm.{k}'][0], self.bones[f'forearm.{k}'][1]
        P = Part(f'{g}.cuff.{k}')
        limb(P, el + (wr - el) * .55, wr, [(0, .055 * s, .055 * s), (1, .062 * s, .062 * s)], iron, None, segs=10, caps=(False, True))
        ob = finish(P); bind(ob, self.arm, rigid(f'forearm.{k}'), subsurf=0); self.add(g, ob)
    # 통 쇠투구: 머리 전체를 덮는 원통, 눈높이에 가로 틈 하나 (쇳물빛), 정수리 리벳
    hc0, hs = _head_tools(self)
    hk = self.hk
    P = Part(g + '.helm')
    c0 = hs(V(0, .0, 1.53)); c1 = hs(V(0, .0, 1.75))
    loft(P, [(c0, Vector((0, -1, 0)), Vector((1, 0, 0)), .118 * s * hk, .125 * s * hk),
             (c0 + (c1 - c0) * .6, Vector((0, -1, 0)), Vector((1, 0, 0)), .112 * s * hk, .12 * s * hk),
             (c1, Vector((0, -1, 0)), Vector((1, 0, 0)), .095 * s * hk, .1 * s * hk)], iron, None, segs=16, caps=(False, True))
    limb(P, hs(V(-.07, -.125, 1.635)), hs(V(.07, -.125, 1.635)), [(0, .01 * s, .006 * s), (1, .01 * s, .006 * s)], glow, None, segs=4)   # 눈 틈
    for k in range(5):
        blob(P, hs(V((k - 2) * .035, -.122, 1.575)), (.007 * s, .004 * s, .007 * s), chain, None, segs=5, rings=3)   # 숨구멍
    blob(P, c1 + Vector((0, 0, .01 * s)), (.03 * s, .03 * s, .015 * s), chain, None, segs=8, rings=4)
    ob = finish(P); bind(ob, self.arm, lambda co: {'head': 1.0}, subsurf=0); self.add(g, ob)


def maskward(self, g):
    """5층 가면파수꾼: 키 크고 마른 몸, 발목까지 오는 흰 연미 외투와 겹겹의 흰 주름 깃(러프), 금 견장,
    얼굴은 금이 간 무표정 도자기 가면. 어깨와 정수리에서 실이 등 뒤 높이 떠 있는 나무 십자 막대로 이어진다 — 마을을 지키는 것도 누가 조종하는 것.
    구역: 외투 3 · 바지 4 · 신 5 · 깃 9 · 가면 10 · 금 14 · 나무 13 · 실 7 · 검정 15"""
    s, V = self.s, self.V
    coat = rmat('top', .7, .2); ruff = rmat('gown', .7, .15); white = rmat('bandage', .25, .55); dark = rmat('dark', .9, .05)
    gold = rmat('metal', .25, .75, .9); wood = rmat('wood', .55, .3); string = rmat('apron', .5, .3)
    self.legs(g, rmat('bottom', .85, .1), rmat('shoe', .4, .5), foot=.95)
    skirt_w, rad = self.long_body(g, coat, hem=.1, flare=.75, grow=1.04, sleeve_w=.95)
    self.head(g, face=False); self.hands(g, rmat('gown', .7, .15))
    P = Part(g + '.ruff')
    for k in range(3):   # 겹겹의 주름 깃
        z = 1.47 - k * .025
        for i in range(18):
            a = (i / 18) * math.tau
            r = (.13 + k * .025) * s
            blob(P, V(math.cos(a) * r / s, .01 - math.sin(a) * r * .85 / s, z), (.03 * s, .03 * s, .018 * s), ruff, None, segs=6, rings=4)
    for sx in (1, -1):   # 금 견장
        blob(P, V(sx * .19, .0, 1.43), (.06 * s, .05 * s, .018 * s), gold, None, segs=8, rings=5)
        for f in range(4):
            limb(P, V(sx * (.16 + f * .018), -.02, 1.42), V(sx * (.16 + f * .018), -.025, 1.36), [(0, .005 * s, .005 * s), (1, .004 * s, .004 * s)], gold, None, segs=3)
    for k in range(5):   # 앞섶 금단추
        blob(P, V(0, -.135, 1.36 - k * .09), (.011 * s, .006 * s, .011 * s), gold, None, segs=6, rings=4)
    # 등 뒤 높이 떠 있는 십자 막대와 내려오는 실 셋 (정수리 · 두 어깨)
    top = V(0, .14, 2.12)
    limb(P, top + Vector((-.22, 0, 0)) * s, top + Vector((.22, 0, 0)) * s, [(0, .016 * s, .016 * s), (1, .016 * s, .016 * s)], wood, None, segs=6)
    limb(P, top + Vector((0, -.12, 0)) * s, top + Vector((0, .12, 0)) * s, [(0, .016 * s, .016 * s), (1, .016 * s, .016 * s)], wood, None, segs=6)
    for p in (V(.19, .02, 1.44), V(-.19, .02, 1.44), V(0, .06, 1.8)):
        q = top + Vector((p.x / s * .9, 0, 0)) * s
        limb(P, p, q, [(0, .004 * s, .004 * s), (1, .004 * s, .004 * s)], string, None, segs=3)
    ob = finish(P); bind(ob, self.arm, _spine_w(s), subsurf=0); self.add(g, ob)
    # 얼굴: 금 간 무표정 도자기 가면 + 뒤로 넘긴 검은 머리
    P = Part(g + '.mask')
    _mask_face(self, P, white, dark, white, smile=False, crack=dark)
    hc0, hs = _head_tools(self)
    hk = self.hk
    R = (.101 * s, .114 * s, .128 * s)
    blob(P, hs(V(0, .02, 1.63)), (R[0] * 1.02 * hk, R[1] * .96 * hk, R[2] * hk), dark, None, segs=14, rings=10, cut=lambda co: co.y < -.04 * s * hk)
    ob = finish(P); bind(ob, self.arm, lambda co: {'head': 1.0}, subsurf=0); self.add(g, ob)


NEW44 = {'anvilward': anvilward, 'maskward': maskward}
