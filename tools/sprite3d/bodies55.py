"""55차 전용 몸: 오르멧 — 땅 위를 떠서 스쳐 가는 검은 날개의 검사.
날개는 게임이 붙인다(검은 날개). 칼은 따로 굽는 양손 대검(w-om-greatsword)을 검게 칠한다."""
import math
from mathutils import Vector
from rig import Part, limb, blob, finish, bind, rigid
from dreambodies import rmat, _spine_w, _head_tools


def oremet(self, g):
    """오르멧: 큰 키, 넓은 어깨. 발목까지 내려오는 검은 긴 코트(안감은 짙은 보랏빛, 밑단이 둘로 갈라진다)와 높은 깃,
    가슴을 가로지르는 은 버클 띠 셋 · 검은 쇠 어깨받이 · 검은 장갑 · 뒤로 넘긴 검은 머리와 흘러내린 몇 가닥 · 붉은 눈.
    구역: 살 1 · 머리 2 · 코트 3 · 바지 4 · 신 5 · 안감 9 · 붉은 눈 12 · 어깨받이 13 · 은 14 · 장갑 15"""
    s, V = self.s, self.V
    coat = rmat('top', .55, .25); lin = rmat('gown', .7, .15); silver = rmat('metal', .2, .8, .95)
    steel = rmat('wood', .3, .7, .6); glove = rmat('dark', .5, .3); eye = rmat('crest', .1, .2); hm = rmat('hair', .35, .55)
    self.legs(g, rmat('bottom', .7, .2), rmat('shoe', .3, .6), foot=.95)
    skirt_w, rad = self.long_body(g, coat, hem=.06, flare=.9, grow=1.06, cuff=lin, sleeve_w=1.04)
    self.head(g)
    self.hands(g, glove)
    sw = _spine_w(s)
    P = Part(g + '.trim')
    # 높은 깃 (목을 감싸고 뒤가 더 높다)
    limb(P, V(0, .01, 1.43), V(0, .02, 1.53), [(0, .085 * s, .078 * s), (1, .078 * s, .074 * s)], coat, None, segs=16, caps=(False, False))
    limb(P, V(0, .025, 1.44), V(0, .035, 1.56), [(0, .08 * s, .07 * s), (1, .075 * s, .066 * s)], lin, None, segs=16, caps=(False, False))
    # 가슴의 은 버클 띠 셋
    for z in (1.2, 1.28, 1.36):
        self.torso_band(P, z, silver, grow=1.08, h=.012, add=.014)
        blob(P, V(0, -.155 + (z - 1.28) * .1, z), (.02 * s, .008 * s, .016 * s), silver, None, segs=8, rings=5)
    # 앞섶 (목에서 밑단까지 가는 은선)
    pts = [V(.0, -.1, 1.42), V(.01, -.16, 1.2), V(.015, -.17, 1.0)] + [V(.02, -.18 - (1.0 - z) * .05, z) for z in (.8, .55, .3, .1)]
    for p0, p1 in zip(pts, pts[1:]):
        limb(P, p0, p1, [(0, .007 * s, .004 * s), (1, .007 * s, .004 * s)], silver, None, segs=4)
    self.torso_band(P, 1.0, steel, grow=1.1, h=.04, add=.016)   # 허리띠
    ob = finish(P); bind(ob, self.arm, lambda co: skirt_w(co) if co.z < 1.0 * s else sw(co), subsurf=0); self.add(g, ob)
    # 검은 쇠 어깨받이 (겹친 판 셋)
    for k, sx in (('L', 1), ('R', -1)):
        sh = self.bones['upper_arm.' + k][0]
        P = Part(f'{g}.pauldron.{k}')
        for n in range(3):
            blob(P, sh + Vector((sx * (.01 + n * .012) * s, 0, (.035 - n * .03) * s)), ((.085 - n * .008) * s, .08 * s, .04 * s), steel, None,
                 segs=12, rings=6, cut=lambda co, z0=sh.z - (.02 + n * .03) * s: co.z < z0)
        blob(P, sh + Vector((sx * .02 * s, -.06 * s, .03 * s)), (.012 * s, .006 * s, .012 * s), silver, None, segs=6, rings=4)
        ob = finish(P); bind(ob, self.arm, lambda co, k=k: {'upper_arm.' + k: .6, 'spine': .4}, subsurf=0); self.add(g, ob)
    # 머리: 뒤로 넘긴 검은 머리, 이마에 흘러내린 몇 가닥 · 붉은 눈
    hc0, hs = _head_tools(self)
    R = (.101 * s, .114 * s, .128 * s)
    P = Part(g + '.hair')
    blob(P, V(0, .012, 1.636), (R[0] * 1.05, R[1] * 1.05, R[2] * 1.03), hm, None, segs=16, rings=12,
         cut=lambda co: (co.y < -.03 * s and co.z < 1.69 * s) or co.z < 1.52 * s or (co.z < 1.6 * s and co.y < .03 * s))
    blob(P, V(0, .09, 1.6), (.075 * s, .05 * s, .07 * s), hm, None, segs=12, rings=8)   # 뒷머리가 목덜미로
    for sx, ln in ((1, .1), (-1, .075), (.4, .085)):
        limb(P, V(sx * .04, -.1, 1.7), V(sx * .06, -.12, 1.7 - ln), [(0, .01 * s, .006 * s), (1, .003 * s, .003 * s)], hm, None, segs=5)
    ob = finish(P); self.scale_head(ob); bind(ob, self.arm, lambda co: {'head': 1.0}); self.add(g, ob)
    P = Part(g + '.eyes')
    for sx in (1, -1):
        blob(P, hs(V(sx * .034, -.108, 1.628)), (.011 * s, .005 * s, .007 * s), eye, None, segs=8, rings=5)
    ob = finish(P); bind(ob, self.arm, lambda co: {'head': 1.0}, subsurf=0); self.add(g, ob)


NEW55 = {'oremet': oremet}
