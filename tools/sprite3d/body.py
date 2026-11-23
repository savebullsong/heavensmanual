"""한 사람의 모든 부품을 만든다: 몸(체형 3가지), 차림 5가지, 머리 모양 6가지, 무기 9가지.
부품마다 '구역 번호'가 있는 재질을 쓴다. 렌더 1번은 흰 재질로 음영만, 렌더 2번은 구역 번호 색으로."""
from rig import *

REG = {'void': 0, 'skin': 1, 'hair': 2, 'top': 3, 'bottom': 4, 'shoe': 5, 'eye': 6, 'apron': 7, 'raincoat': 8,
       'gown': 9, 'bandage': 10, 'parrot': 11, 'crest': 12, 'wood': 13, 'metal': 14, 'dark': 15}
HAIRS = ['short', 'swept', 'bob', 'long', 'ponytail', 'buzz']
OUTFITS = ['casual', 'apron', 'raincoat', 'patient', 'parrot']
MELEE = ['pipe', 'hammer', 'knife', 'shovel', 'bat', 'hatchet', 'dagger', 'sword', 'needle']
ARMOR = ['helmet', 'jacket', 'vest', 'gloves', 'workpants', 'shinguard', 'boots']
WEAPONS = MELEE + ['pistol']

def id_color(rid):
    v = (rid * 16 + 8) / 255
    v = ((v + 0.055) / 1.055) ** 2.4 if v > 0.04045 else v / 12.92
    return (v, v, v, 1)

_rm = {}
def rmat(region, rough=.7, spec=.25, metal=0.0, albedo=.8, tag=''):
    key = (region, rough, spec, metal, albedo, tag)
    if key in _rm: return _rm[key]
    m = bpy.data.materials.new(f'{region}')
    try: m.use_nodes = True
    except Exception: pass
    b = m.node_tree.nodes.get('Principled BSDF')
    b.inputs['Base Color'].default_value = (albedo, albedo, albedo, 1)
    b.inputs['Roughness'].default_value = rough
    for k in ('Specular IOR Level', 'Specular'):
        if k in b.inputs: b.inputs[k].default_value = spec; break
    b.inputs['Metallic'].default_value = metal
    m['rid'] = REG[region]
    m['tag'] = tag
    m.diffuse_color = id_color(REG[region])
    _rm[key] = m
    return m

def all_rmats(): return list(_rm.values())

TORSO = {
    'm': [(.83, .140, .100, .000), (.90, .165, .110, .005), (.98, .165, .105, .000), (1.06, .150, .098, .000),
          (1.15, .156, .100, -.005), (1.25, .174, .108, -.010), (1.34, .186, .108, -.005), (1.41, .172, .095, .005), (1.46, .090, .065, .010)],
    'f': [(.83, .145, .100, .000), (.90, .178, .115, .010), (.98, .172, .108, .000), (1.07, .128, .088, .000),
          (1.16, .140, .092, -.005), (1.24, .156, .118, -.026), (1.31, .158, .105, -.010), (1.39, .150, .090, .000), (1.45, .080, .060, .010)],
}
BODY = {'x': dict(h=1.28, shoulder=.22, hipw=.105, arm=1.4, leg=1.12),   # 변신한 봉합자 (몸집이 크다)
        'm': dict(h=1.0, shoulder=.19, hipw=.095, arm=1.15, leg=1.0),
        'f': dict(h=.94, shoulder=.165, hipw=.092, arm=1.0, leg=.94),
        'c': dict(h=.68, shoulder=.17, hipw=.09, arm=1.05, leg=1.0),
        # 지옥 괴물 (2단계): 망자 · 프렛 · 야크
        'a': dict(h=.97, shoulder=.175, hipw=.088, arm=.9, leg=.88),
        'p': dict(h=1.36, shoulder=.15, hipw=.08, arm=1.05, leg=.9, neck=.13),
        'y': dict(h=1.26, shoulder=.25, hipw=.12, arm=1.55, leg=1.3)}
MONSTER_BW = {'x': None, 'a': .8, 'p': .68, 'y': 1.32}
MONSTER_HK = {'x': 1.0, 'a': 1.05, 'p': .86, 'y': 1.12}
BUILD = [.9, 1.0, 1.14]   # 마름 · 보통 · 건장 (뼈 위치는 같고 굵기만 다르다 → 머리·무기 층을 함께 쓴다)

class Doll:
    def __init__(self, sex, build=1, child=False, monster=False):
        self.mkey = (monster if isinstance(monster, str) else 'x') if monster else None
        key = self.mkey or ('c' if child else sex)
        self.sex = sex; self.child = child; self.p = p = BODY[key]; self.s = s = p['h']
        self.bw = MONSTER_BW.get(self.mkey) or BUILD[build]
        self.bones = skeleton(p)
        self.arm = make_armature(self.bones)
        self.groups = {}   # 이름 → [객체]
        self.torso_key = 'f' if (sex == 'f' and not child) else 'm'
        self.hk = 1.30 if child else MONSTER_HK[self.mkey] if monster else 1.12   # 머리 크기 (아이는 더 크게)
        self.monster = monster

    def V(self, x, y, z): return Vector((x, y, z)) * self.s
    def add(self, group, ob):
        self.groups.setdefault(group, []).append(ob); ob.hide_render = True
        return ob

    # ── 공통 부품 ──
    def torso(self, group, m_top, m_bot, hem=1.0, grow=1.0, extra=None):
        s = self.s; w = self.bw * grow
        rings = [(self.V(0, cy, z), Vector((0, -1, 0)), Vector((1, 0, 0)), rx * s * w, ry * s * (w * .5 + .5)) for z, rx, ry, cy in TORSO[self.torso_key]]
        if extra: rings = extra(rings)
        P = Part(group)
        loft(P, rings, m_top, None, segs=14, matfn=lambda z: m_bot if z < hem * s else m_top)
        ob = finish(P); bind(ob, self.arm, lambda co: {'spine': smooth(co.z, .98 * s, 1.12 * s), 'hips': 1 - smooth(co.z, .98 * s, 1.12 * s)})
        return self.add(group, ob)

    def head(self, group, face=True):
        s, V = self.s, self.V
        skin, eye = rmat('skin', .6, .3), rmat('eye', .3, .6)
        P = Part(group + '.neck')
        limb(P, V(0, .005, 1.40), V(0, .005, 1.53), [(0, .052 * s * self.bw, .05 * s), (1, .047 * s * self.bw, .046 * s)], skin, None)
        ob = finish(P); bind(ob, self.arm, lambda co: {'neck': 1.0}); self.add(group, ob)
        P = Part(group + '.head')
        hc = V(0, -.005, 1.615)
        blob(P, hc, (.092 * s, .104 * s, .122 * s), skin, None)
        if face:
            for sx in (1, -1):
                blob(P, V(sx * .034, -.093, 1.625), (.014 * s, .008 * s, .011 * s), eye, None, segs=8, rings=5)
                blob(P, V(sx * .092, .0, 1.61), (.013 * s, .022 * s, .028 * s), skin, None, segs=8, rings=5)
            blob(P, V(0, -.106, 1.595), (.012 * s, .012 * s, .02 * s), skin, None, segs=8, rings=5)
        ob = finish(P); self.scale_head(ob); bind(ob, self.arm, lambda co: {'head': 1.0})
        return self.add(group, ob)

    def scale_head(self, ob):
        hc = self.V(0, -.005, 1.615); hc2 = hc + Vector((0, 0, (self.hk - 1) * .10 * self.s))
        for v in ob.data.vertices: v.co = hc2 + (v.co - hc) * self.hk

    def arms(self, group, sleeve_mat=None, sleeve=.45, cuff=None, wide=1.0):
        skin = rmat('skin', .6, .3); am = self.p['arm'] * self.bw
        for k, sx in (('L', 1), ('R', -1)):
            b = self.bones
            sh, el = b[f'upper_arm.{k}'][0], b[f'upper_arm.{k}'][1]
            wr = b[f'forearm.{k}'][1]
            P = Part(f'{group}.arm.{k}')
            limb(P, sh, el, [(0, .052 * am, .054 * am), (.5, .046 * am, .049 * am), (1, .038 * am, .040 * am)], skin, None)
            limb(P, el, wr, [(0, .038 * am, .040 * am), (.35, .037 * am, .041 * am), (1, .027 * am, .025 * am)], skin, None)
            blob(P, el, (.038 * am, .039 * am, .038 * am), skin, None, segs=10, rings=7)
            if sleeve_mat is not None:
                r0 = .064 * am * wide
                if sleeve > 0:
                    end = sh + (el - sh) * min(1, sleeve)
                    limb(P, sh + Vector((0, 0, .02)), end, [(0, r0, r0), (1, r0 * .92 * (1.15 if wide > 1 else 1), r0 * .92 * (1.15 if wide > 1 else 1))], sleeve_mat, None)
                if sleeve > 1:
                    limb(P, el, el + (wr - el) * (sleeve - 1), [(0, .048 * am * wide, .048 * am * wide), (1, .042 * am * wide * (1.2 if cuff else 1), .042 * am * wide * (1.2 if cuff else 1))], sleeve_mat, None)
                blob(P, sh + Vector((-sx * .015, 0, .0)), (.068 * am * wide, .062 * am * wide, .062 * am * wide), sleeve_mat, None, segs=10, rings=7)
            ob = finish(P); bind(ob, self.arm, autow(self.bones, ['spine', f'upper_arm.{k}', f'forearm.{k}'], power=5)); self.add(group, ob)

    def hands(self, group, mat=None):
        skin = mat or rmat('skin', .6, .3); am = self.p['arm'] * self.bw
        for k in 'LR':
            wr, hd = self.bones[f'forearm.{k}'][1], self.bones[f'hand.{k}'][1]
            P = Part(f'{group}.hand.{k}')
            blob(P, (wr + hd) / 2 + Vector((0, -.008, .01)), (.026 * am, .032 * am, .05 * am), skin, None, segs=10, rings=7)
            ob = finish(P); bind(ob, self.arm, rigid(f'hand.{k}')); self.add(group, ob)

    def legs(self, group, mat, shoe_mat, bare_below=None, boot=False, foot=1.0):
        lg = self.p['leg'] * self.bw; s = self.s
        for k in 'LR':
            b = self.bones
            hp, kn = b[f'thigh.{k}'][0], b[f'thigh.{k}'][1]
            an = b[f'shin.{k}'][1]
            P = Part(f'{group}.leg.{k}')
            limb(P, hp + Vector((0, 0, .03)), kn, [(0, .085 * lg, .088 * lg), (.5, .071 * lg, .074 * lg), (1, .056 * lg, .059 * lg)], mat, None)
            shin_mat = bare_below or mat
            limb(P, kn, an + Vector((0, 0, .02)), [(0, .056 * lg, .059 * lg), (.35, .053 * lg, .062 * lg), (1, .045 * lg, .047 * lg)], shin_mat, None)
            blob(P, kn, (.057 * lg, .06 * lg, .057 * lg), shin_mat, None, segs=10, rings=7)
            ob = finish(P); bind(ob, self.arm, autow(self.bones, ['hips', f'thigh.{k}', f'shin.{k}'], power=5)); self.add(group, ob)
            P = Part(f'{group}.shoe.{k}')
            c = Vector((an.x, -.035 * s, .045 * s))
            blob(P, c, (.05 * s * (1.1 if boot else 1) * foot, .122 * s * foot, .052 * s * (1.25 if boot else 1) * foot), shoe_mat, None, segs=12, rings=8, cut=lambda co: co.z < .0)
            if boot:
                limb(P, an + Vector((0, 0, -.06)), an + Vector((0, 0, .16 * s)), [(0, .058 * s, .06 * s), (1, .055 * s, .057 * s)], shoe_mat, None)
            ob = finish(P); bind(ob, self.arm, autow(self.bones, [f'shin.{k}', f'foot.{k}'], power=8)); self.add(group, ob)

    # ── 차림 ──
    def outfit(self, name):
        g = 'o.' + name
        if name in ('casual', 'apron'):
            top = rmat('top', .85, .15); bot = rmat('bottom', .8, .15); shoe = rmat('shoe', .5, .4)
            self.torso(g, top, bot, hem=1.0)
            self.head(g); self.arms(g, top, .45); self.hands(g); self.legs(g, bot, shoe)
            if name == 'apron':
                ap = rmat('apron', .85, .1); s = self.s
                P = Part(g + '.apron')
                def ring(z, rx, ry, cy):
                    return (self.V(0, cy, z), Vector((0, -1, 0)), Vector((1, 0, 0)), rx * s * self.bw, ry * s)
                # 앞치마: 몸통 앞을 덮는 납작한 판 (허리부터 무릎 위까지) + 가슴판
                rings = [ring(1.30, .12, .03, -.118), ring(1.16, .128, .03, -.11), ring(1.06, .16, .035, -.112), ring(.90, .19, .04, -.125), ring(.62, .2, .04, -.13)]
                loft(P, rings, ap, None, segs=12)
                ob = finish(P); bind(ob, self.arm, lambda co: {'spine': smooth(co.z, .98 * s, 1.12 * s), 'hips': 1 - smooth(co.z, .98 * s, 1.12 * s)}); self.add(g, ob)
        elif name == 'raincoat':
            rc = rmat('raincoat', .35, .55); dark = rmat('dark', .9, .05); bot = rmat('bottom', .8, .15); boot = rmat('shoe', .4, .5)
            s = self.s
            def coat(rings):
                out = []
                for c, u, v, rs, rf in rings:
                    z = c.z / s
                    grow = 1.18 if z > 1.0 else 1.25 + (1.0 - z) * .6
                    out.append((c, u, v, rs * grow + .01, rf * grow + .012))
                # 무릎까지 내려오는 자락
                c0, u, v, rs, rf = out[0]
                out.insert(0, (self.V(0, .005, .70), u, v, rs * 1.15, rf * 1.2))
                out.insert(0, (self.V(0, .005, .56), u, v, rs * 1.2, rf * 1.25))
                return out
            self.torso(g, rc, rc, hem=0, extra=coat)
            self.arms(g, rc, 1.9, cuff=True, wide=1.15); self.hands(g); self.legs(g, bot, boot, boot=True)
            # 모자(후드): 얼굴은 어둠 속에 가려진다
            P = Part(g + '.hood')
            hc = self.V(0, -.005, 1.615)
            blob(P, hc + Vector((0, .01, .01)), (.112 * s, .125 * s, .14 * s), rc, None, segs=16, rings=12, cut=lambda co: co.y < -.06 * s and abs(co.x) < .07 * s and co.z < 1.70 * s and co.z > 1.52 * s)
            blob(P, hc + Vector((0, -.02, -.005)), (.085 * s, .095 * s, .11 * s), dark, None, segs=12, rings=8)
            limb(P, self.V(0, .0, 1.40), self.V(0, .0, 1.55), [(0, .09 * s, .085 * s), (1, .075 * s, .07 * s)], rc, None)
            ob = finish(P); self.scale_head(ob); bind(ob, self.arm, lambda co: {'head': smooth(co.z, 1.46 * s, 1.52 * s), 'neck': 1 - smooth(co.z, 1.46 * s, 1.52 * s)}); self.add(g, ob)
        elif name == 'patient':
            gw = rmat('gown', .9, .1); skin = rmat('skin', .6, .3); sl = rmat('shoe', .8, .1); bd = rmat('bandage', .95, .05)
            s = self.s
            def gown(rings):
                out = []
                for c, u, v, rs, rf in rings:
                    z = c.z / s
                    out.append((c, u, v, rs * (1.12 if z > 1.1 else 1.3) + .015, rf * 1.18 + .02))
                c0, u, v, rs, rf = out[0]
                out.insert(0, (self.V(0, .005, .62), u, v, rs * 1.2, rf * 1.2))
                return out
            self.torso(g, gw, gw, hem=0, extra=gown)
            self.head(g); self.arms(g, gw, .6, wide=1.3); self.hands(g); self.legs(g, skin, sl, bare_below=skin)
            # 머리 붕대: 이마부터 정수리까지 감는다
            P = Part(g + '.bandage')
            hc = self.V(0, -.005, 1.615)
            blob(P, hc + Vector((0, .006, .012)), (.1 * s, .112 * s, .128 * s), bd, None, segs=16, rings=12, cut=lambda co: co.z < 1.62 * s or (co.y < -.04 * s and co.z < 1.655 * s))
            limb(P, hc + Vector((-.075 * s, .06 * s, .02 * s)), hc + Vector((-.11 * s, .13 * s, -.06 * s)), [(0, .02 * s, .008 * s), (1, .016 * s, .006 * s)], bd, None, segs=6)
            ob = finish(P); self.scale_head(ob); bind(ob, self.arm, lambda co: {'head': 1.0}); self.add(g, ob)
        elif name == 'suturer':
            # 봉합자: 짙은 긴 코트, 꿰맨 자국이 있는 흰 가면, 챙 넓은 모자, 흰 장갑
            coat = rmat('top', .7, .2); mask = rmat('bandage', .4, .4); dark = rmat('dark', .8, .1); bot = rmat('bottom', .8, .15); boot = rmat('shoe', .4, .5)
            s = self.s
            def coat_f(rings):
                out = []
                for c, u, v, rs, rf in rings:
                    z = c.z / s
                    out.append((c, u, v, rs * (1.1 if z > 1.0 else 1.25 + (1.0 - z) * .5) + .01, rf * 1.15 + .012))
                c0, u, v, rs, rf = out[0]
                out.insert(0, (self.V(0, .005, .5), u, v, rs * 1.2, rf * 1.25))
                return out
            self.torso(g, coat, coat, hem=0, extra=coat_f)
            self.head(g, face=False); self.arms(g, coat, 1.9, cuff=True, wide=1.1); self.hands(g, mask); self.legs(g, bot, boot, boot=True)
            P = Part(g + '.mask')
            hc = self.V(0, -.005, 1.615)
            blob(P, hc + Vector((0, -.012, 0)), (.096 * s, .1 * s, .126 * s), mask, None, segs=16, rings=12, cut=lambda co: co.y > .02 * s)
            for sx in (1, -1):
                blob(P, hc + Vector((sx * .036 * s, -.1 * s, .012 * s)), (.016 * s, .006 * s, .01 * s), dark, None, segs=8, rings=5)
            limb(P, hc + Vector((-.045 * s, -.105 * s, -.05 * s)), hc + Vector((.045 * s, -.105 * s, -.05 * s)), [(0, .004, .004), (1, .004, .004)], dark, None, segs=6)
            for k in range(5):
                x = (-.04 + k * .02) * s
                limb(P, hc + Vector((x, -.106 * s, -.035 * s)), hc + Vector((x, -.106 * s, -.065 * s)), [(0, .003, .003), (1, .003, .003)], dark, None, segs=4)
            # 모자: 챙 + 몸통
            limb(P, hc + Vector((0, 0, .09 * s)), hc + Vector((0, 0, .1 * s)), [(0, .2 * s, .2 * s), (1, .2 * s, .2 * s)], dark, None, segs=16)
            limb(P, hc + Vector((0, 0, .09 * s)), hc + Vector((0, 0, .2 * s)), [(0, .1 * s, .1 * s), (1, .095 * s, .095 * s)], dark, None, segs=14)
            ob = finish(P); self.scale_head(ob); bind(ob, self.arm, lambda co: {'head': 1.0}); self.add(g, ob)
        elif name == 'stitched':
            # 변신한 봉합자: 잿빛 살을 기워 붙인 거구, 빛나는 눈
            flesh = rmat('skin', .7, .2); dark = rmat('dark', .8, .1); glow = rmat('crest', .3, .6)
            s = self.s
            def bulk(rings):
                return [(c, u, v, rs * 1.18 + .02, rf * 1.25 + .03) for c, u, v, rs, rf in rings]
            self.torso(g, flesh, flesh, hem=0, extra=bulk)
            self.head(g, face=False); self.arms(g, flesh, 1.95, wide=1.35); self.hands(g, flesh); self.legs(g, flesh, dark, boot=True)
            P = Part(g + '.face')
            hc = self.V(0, -.005, 1.615)
            for sx in (1, -1):
                blob(P, hc + Vector((sx * .038 * s, -.1 * s, .012 * s)), (.028 * s, .012 * s, .02 * s), glow, None, segs=8, rings=5)
            # 꿰맨 자국: 몸 앞뒤로 가로지르는 굵은 실
            for z, rx in ((1.62, .1), (1.3, .2), (1.1, .17), (.85, .19)):
                limb(P, self.V(-rx, -.13 if z < 1.5 else -.1, z), self.V(rx, -.13 if z < 1.5 else -.1, z - .06), [(0, .016, .016), (1, .016, .016)], dark, None, segs=5)
            patch = rmat('gown', .8, .1)
            for (x, y, z, r) in ((.08, -.12, 1.22, .07), (-.1, -.11, 1.0, .06), (.12, .08, 1.3, .07), (-.06, .1, .95, .06)):
                blob(P, self.V(x, y, z), (r * s, r * .6 * s, r * s), patch, None, segs=8, rings=5)
            ob = finish(P); bind(ob, self.arm, lambda co: {'head': 1.0} if co.z > 1.5 * s else {'spine': 1.0}); self.add(g, ob)
        elif name in ('ash', 'pret', 'yak'):
            self.hell_body(name)
        elif name == 'parrot':
            pw = rmat('parrot', .95, .05); cr = rmat('crest', .8, .1); dk = rmat('dark', .5, .3); ft = rmat('shoe', .8, .1)
            s = self.s
            def suit(rings):
                return [(c, u, v, rs * 1.22 + .02, rf * 1.3 + .025) for c, u, v, rs, rf in rings]
            self.torso(g, pw, pw, hem=0, extra=suit)
            self.head(g); self.arms(g, pw, 1.95, wide=1.25); self.hands(g, pw); self.legs(g, pw, ft, boot=True)
            for k, sx in (('L', 1), ('R', -1)):   # 날개 자락
                sh, el = self.bones[f'upper_arm.{k}'][0], self.bones[f'upper_arm.{k}'][1]
                wr = self.bones[f'forearm.{k}'][1]
                P = Part(f'{g}.wing.{k}')
                limb(P, sh + Vector((sx * .03, .03, 0)), wr + Vector((sx * .05, .05, .05)), [(0, .03, .07), (.6, .035, .09), (1, .02, .05)], pw, None, segs=8)
                ob = finish(P); bind(ob, self.arm, autow(self.bones, [f'upper_arm.{k}', f'forearm.{k}'], power=5)); self.add(g, ob)
            # 인형 머리: 얼굴 구멍, 이마 위 부리, 노란 볏
            P = Part(g + '.hood')
            hc = self.V(0, -.005, 1.615)
            blob(P, hc + Vector((0, .015, .03)), (.125 * s, .135 * s, .155 * s), pw, None, segs=16, rings=12,
                 cut=lambda co: co.y < -.05 * s and abs(co.x) < .075 * s and 1.55 * s < co.z < 1.69 * s)
            blob(P, hc + Vector((0, -.12 * s, .1 * s)), (.035 * s, .06 * s, .04 * s), dk, None, segs=10, rings=7)
            for k in range(5):
                a = -.5 + k * .25
                base = hc + Vector((0, (.02 - k * .01) * s, .15 * s))
                tip = base + Vector((0, (.04 + k * .035) * s, (.16 - abs(a) * .1) * s))
                limb(P, base, tip, [(0, .018 * s, .03 * s), (1, .004 * s, .006 * s)], cr, None, segs=6)
            ob = finish(P); self.scale_head(ob); bind(ob, self.arm, lambda co: {'head': 1.0}); self.add(g, ob)

    # ── 지옥 괴물 (색은 게임이 괴물마다 입힌다: 살 1 · 천 3 · 빛 12 · 금 14 · 어둠 15) ──
    def hell_body(self, name):
        g = 'o.' + name; s = self.s; V = self.V
        flesh = rmat('skin', .75, .15); cloth = rmat('top', .9, .08); dark = rmat('dark', .85, .08)
        glow = rmat('crest', .3, .7); gold = rmat('metal', .3, .6, .6); fang = rmat('parrot', .4, .5)
        nk = self.p.get('neck', 0)
        hc = V(0, -.005, 1.615 + nk)
        if name == 'ash':
            # 잿빛 망자: 마르고 그을린 몸, 갈라진 틈으로 불씨가 비치고, 허리에 해진 천
            def gaunt(rings):
                out = []
                for c, u, v, rs, rf in rings:
                    z = c.z / s
                    out.append((c, u, v, rs * (.92 if z > 1.0 else .95), rf * (.8 if 1.0 < z < 1.3 else .95)))
                return out
            self.torso(g, flesh, flesh, hem=0, extra=gaunt)
            self.arms(g, None); self.hands(g); self.legs(g, flesh, dark, foot=.85)
            P = Part(g + '.face')
            blob(P, hc, (.09 * s, .1 * s, .118 * s), flesh, None, segs=14, rings=10)
            for sx in (1, -1):
                blob(P, hc + Vector((sx * .034 * s, -.092 * s, .01 * s)), (.022 * s, .01 * s, .018 * s), dark, None, segs=8, rings=5)
                blob(P, hc + Vector((sx * .034 * s, -.1 * s, .01 * s)), (.011 * s, .006 * s, .009 * s), glow, None, segs=6, rings=4)
            blob(P, hc + Vector((0, -.1 * s, -.05 * s)), (.03 * s, .01 * s, .014 * s), dark, None, segs=8, rings=5)
            for k in range(5):   # 정수리에 남은 몇 가닥
                a = (k - 2) * .025
                limb(P, hc + Vector((a * s, .02 * s, .1 * s)), hc + Vector((a * 1.6 * s, .1 * s, -.02 * s)), [(0, .006, .006), (1, .002, .002)], dark, None, segs=4)
            ob = finish(P); self.scale_head(ob); bind(ob, self.arm, lambda co: {'head': 1.0}); self.add(g, ob)
            P = Part(g + '.rags')
            # 허리천: 앞뒤로 늘어진 해진 자락
            limb(P, V(0, 0, .99), V(0, 0, .84), [(0, .118 * s * self.bw, .09 * s), (1, .128 * s * self.bw, .1 * s)], cloth, None, segs=12)
            for k in range(6):
                a = k / 6 * math.tau
                top = V(math.cos(a) * .1 * self.bw, math.sin(a) * .08, .86)
                limb(P, top, top + Vector((math.cos(a) * .02, math.sin(a) * .02, -(.16 + (k % 3) * .06) * s)), [(0, .035, .012), (1, .02, .006)], cloth, None, segs=5)
            # 불씨가 비치는 갈라진 틈
            for (x0, z0, x1, z1, y) in ((-.06, 1.32, .04, 1.18, -.105), (.07, 1.12, .01, 1.02, -.1), (-.03, 1.24, -.08, 1.1, .095), (.05, 1.3, .1, 1.16, .09)):
                limb(P, V(x0, y, z0), V(x1, y * 1.02, z1), [(0, .007, .007), (1, .005, .005)], glow, None, segs=4)
            ob = finish(P); bind(ob, self.arm, lambda co: {'spine': smooth(co.z, .98 * s, 1.12 * s), 'hips': 1 - smooth(co.z, .98 * s, 1.12 * s)}); self.add(g, ob)
            for k in 'LR':   # 팔뚝의 불씨 틈
                sh, el = self.bones[f'upper_arm.{k}'][0], self.bones[f'upper_arm.{k}'][1]
                wr = self.bones[f'forearm.{k}'][1]
                P = Part(f'{g}.crack.{k}')
                limb(P, el + (wr - el) * .2 + Vector((0, -.032, 0)), el + (wr - el) * .7 + Vector((0, -.028, 0)), [(0, .006, .006), (1, .004, .004)], glow, None, segs=4)
                ob = finish(P); bind(ob, self.arm, rigid(f'forearm.{k}')); self.add(g, ob)
        elif name == 'pret':
            # 프렛: 야자나무처럼 큰 키, 막대 같은 팔다리, 부푼 배, 긴 목, 바늘구멍만 한 입, 늘어진 머리카락
            def starved(rings):
                out = []
                for c, u, v, rs, rf in rings:
                    z = c.z / s
                    out.append((c, u, v, rs * (.9 if z > 1.15 else 1.0), rf * (.78 if z > 1.15 else 1.0)))
                return out
            self.torso(g, flesh, flesh, hem=0, extra=starved)
            self.arms(g, None); self.hands(g); self.legs(g, flesh, flesh, foot=.62)
            P = Part(g + '.belly')
            blob(P, V(0, -.06, 1.06), (.13 * s, .13 * s, .13 * s), flesh, None, segs=14, rings=10)
            for z in (1.26, 1.3, 1.34):   # 갈비뼈
                limb(P, V(-.1, -.085, z), V(.1, -.085, z), [(0, .006, .006), (.5, .007, .007), (1, .006, .006)], dark, None, segs=4)
            limb(P, V(0, 0, .96), V(0, 0, .86), [(0, .1 * s * self.bw, .085 * s), (1, .11 * s * self.bw, .09 * s)], cloth, None, segs=12)
            limb(P, V(0, -.08, .9), V(0, -.09, .66), [(0, .05, .012), (1, .04, .008)], cloth, None, segs=5)
            ob = finish(P); bind(ob, self.arm, lambda co: {'spine': smooth(co.z, .98 * s, 1.12 * s), 'hips': 1 - smooth(co.z, .98 * s, 1.12 * s)}); self.add(g, ob)
            P = Part(g + '.neck')
            limb(P, V(0, .005, 1.38), V(0, -.005, 1.55 + nk), [(0, .04 * s, .038 * s), (1, .03 * s, .03 * s)], flesh, None, segs=10)
            ob = finish(P); bind(ob, self.arm, lambda co: {'neck': 1.0}); self.add(g, ob)
            P = Part(g + '.head')
            blob(P, hc, (.085 * s, .095 * s, .11 * s), flesh, None, segs=14, rings=10)
            for sx in (1, -1):
                blob(P, hc + Vector((sx * .032 * s, -.085 * s, .012 * s)), (.02 * s, .012 * s, .02 * s), dark, None, segs=8, rings=5)
                blob(P, hc + Vector((sx * .032 * s, -.094 * s, .012 * s)), (.008 * s, .005 * s, .008 * s), glow, None, segs=6, rings=4)
            blob(P, hc + Vector((0, -.098 * s, -.05 * s)), (.005 * s, .004 * s, .005 * s), dark, None, segs=6, rings=4)   # 바늘구멍 입
            for k in range(9):   # 성긴 긴 머리카락
                a = (k - 4) / 4
                root = hc + Vector((a * .07 * s, (.03 + abs(a) * .03) * s, .095 * s - abs(a) * .02 * s))
                limb(P, root, root + Vector((a * .05 * s, .06 * s, -(.22 + (k % 3) * .07) * s)), [(0, .008, .008), (1, .003, .003)], dark, None, segs=4)
            ob = finish(P); bind(ob, self.arm, lambda co: {'head': 1.0}); self.add(g, ob)
        elif name == 'yak':
            # 야크(약샤): 우람한 몸, 금 허리띠·팔찌·목걸이, 첨탑 모양 관(차다), 송곳니와 빛나는 눈
            def bulk(rings):
                out = []
                for c, u, v, rs, rf in rings:
                    z = c.z / s
                    k = 1.2 if 1.15 < z < 1.42 else 1.06
                    out.append((c, u, v, rs * k + .01, rf * k * 1.08 + .012))
                return out
            self.torso(g, flesh, cloth, hem=1.0, extra=bulk)
            self.arms(g, None); self.hands(g); self.legs(g, cloth, dark, bare_below=flesh)
            P = Part(g + '.gear')
            limb(P, V(0, 0, 1.02), V(0, 0, .95), [(0, .15 * s * self.bw, .12 * s), (1, .15 * s * self.bw, .12 * s)], gold, None, segs=14)   # 금 허리띠
            limb(P, V(0, -.13, .97), V(0, -.15, .62), [(0, .07, .014), (1, .06, .01)], cloth, None, segs=5)                              # 앞자락
            limb(P, V(0, -.02, 1.43), V(0, -.06, 1.36), [(0, .13 * s, .11 * s), (1, .15 * s, .13 * s)], gold, None, segs=14)            # 목걸이
            ob = finish(P); bind(ob, self.arm, lambda co: {'spine': smooth(co.z, .98 * s, 1.12 * s), 'hips': 1 - smooth(co.z, .98 * s, 1.12 * s)}); self.add(g, ob)
            for k in 'LR':   # 팔찌
                el, wr = self.bones[f'forearm.{k}'][0], self.bones[f'forearm.{k}'][1]
                P = Part(f'{g}.band.{k}')
                limb(P, el + (wr - el) * .72, el + (wr - el) * .86, [(0, .048, .048), (1, .046, .046)], gold, None, segs=10)
                ob = finish(P); bind(ob, self.arm, rigid(f'forearm.{k}')); self.add(g, ob)
            P = Part(g + '.head')
            blob(P, hc, (.1 * s, .108 * s, .12 * s), flesh, None, segs=14, rings=10)
            for sx in (1, -1):
                blob(P, hc + Vector((sx * .038 * s, -.095 * s, .022 * s)), (.022 * s, .012 * s, .016 * s), glow, None, segs=8, rings=5)
                limb(P, hc + Vector((sx * .03 * s, -.1 * s, -.05 * s)), hc + Vector((sx * .036 * s, -.11 * s, -.095 * s)), [(0, .012, .01), (1, .002, .002)], fang, None, segs=5)
            blob(P, hc + Vector((0, -.106 * s, -.05 * s)), (.045 * s, .01 * s, .014 * s), dark, None, segs=8, rings=5)
            # 관: 머리띠 + 겹겹이 좁아지는 첨탑
            limb(P, hc + Vector((0, 0, .05 * s)), hc + Vector((0, 0, .09 * s)), [(0, .11 * s, .12 * s), (1, .108 * s, .118 * s)], gold, None, segs=14)
            for k in range(5):
                z0 = (.09 + k * .055) * s
                r = (.085 - k * .016) * s
                limb(P, hc + Vector((0, .005, z0)), hc + Vector((0, .005, z0 + .05 * s)), [(0, r, r), (.6, r * .8, r * .8), (1, r * .9, r * .9)], gold, None, segs=12)
            limb(P, hc + Vector((0, .005, .36 * s)), hc + Vector((0, .005, .46 * s)), [(0, .014, .014), (1, .002, .002)], gold, None, segs=6)
            blob(P, hc + Vector((0, -.11 * s, .07 * s)), (.016 * s, .008 * s, .016 * s), glow, None, segs=6, rings=4)
            for sx in (1, -1):   # 귀 장식
                limb(P, hc + Vector((sx * .1 * s, 0, .02 * s)), hc + Vector((sx * .13 * s, .02 * s, .12 * s)), [(0, .018, .008), (1, .004, .004)], gold, None, segs=5)
            ob = finish(P); self.scale_head(ob); bind(ob, self.arm, lambda co: {'head': 1.0}); self.add(g, ob)

    # ── 방어구 (평상복 몸 위에 겹친다) ──
    def armor(self, piece):
        g = 'a.' + piece; s = self.s; V = self.V
        main = rmat('top', .55, .3, tag='armor'); dark = rmat('dark', .6, .2, tag='armor'); metal = rmat('metal', .25, .6, .7, tag='armor'); bootm = rmat('shoe', .45, .4, tag='armor')
        if piece == 'helmet':
            P = Part(g)
            hc = V(0, -.005, 1.615)
            blob(P, hc + Vector((0, .005, .02)), (.118 * s, .13 * s, .13 * s), main, None, segs=16, rings=12, cut=lambda co: co.z < 1.53 * s or (co.y < -.03 * s and co.z < 1.64 * s))
            blob(P, hc + Vector((0, -.1, .025)), (.085 * s, .03 * s, .045 * s), metal, None, segs=10, rings=6)
            ob = finish(P); self.scale_head(ob); bind(ob, self.arm, lambda co: {'head': 1.0}); self.add(g, ob)
            return
        if piece in ('jacket', 'vest'):
            grow = 1.12 if piece == 'jacket' else 1.18
            def fit(rings):
                out = []
                for c, u, v, rs, rf in rings:
                    z = c.z / s
                    if z < (.9 if piece == 'jacket' else .96): continue
                    out.append((c, u, v, rs * grow + .012, rf * (grow + .06) + .014))
                return out
            self.torso(g, main, main, hem=0, extra=fit)
            if piece == 'jacket':
                am = self.p['arm'] * self.bw
                for k, sx in (('L', 1), ('R', -1)):
                    sh, el = self.bones[f'upper_arm.{k}'][0], self.bones[f'upper_arm.{k}'][1]
                    wr = self.bones[f'forearm.{k}'][1]
                    P = Part(f'{g}.sleeve.{k}')
                    limb(P, sh + Vector((0, 0, .02)), el, [(0, .07 * am, .07 * am), (1, .058 * am, .058 * am)], main, None)
                    limb(P, el, wr - (wr - el) * .08, [(0, .056 * am, .056 * am), (1, .046 * am, .046 * am)], main, None)
                    blob(P, el, (.058 * am, .058 * am, .058 * am), main, None, segs=10, rings=7)
                    blob(P, sh + Vector((-sx * .015, 0, 0)), (.074 * am, .068 * am, .068 * am), main, None, segs=10, rings=7)
                    ob = finish(P); bind(ob, self.arm, autow(self.bones, ['spine', f'upper_arm.{k}', f'forearm.{k}'], power=5)); self.add(g, ob)
            else:
                P = Part(g + '.plates')
                for z in (1.32, 1.18):
                    limb(P, V(-.11, -.125, z), V(.11, -.125, z), [(0, .012, .055), (1, .012, .055)], dark, None, segs=6)
                ob = finish(P); bind(ob, self.arm, lambda co: {'spine': 1.0}); self.add(g, ob)
            return
        if piece == 'gloves':
            am = self.p['arm'] * self.bw
            for k in 'LR':
                wr, hd = self.bones[f'forearm.{k}'][1], self.bones[f'hand.{k}'][1]
                P = Part(f'{g}.{k}')
                blob(P, (wr + hd) / 2 + Vector((0, -.008, .01)), (.031 * am, .037 * am, .056 * am), main, None, segs=10, rings=7)
                limb(P, wr + (wr - hd) * .3, wr - (wr - hd) * .2, [(0, .034 * am, .034 * am), (1, .03 * am, .03 * am)], main, None, segs=8)
                ob = finish(P); bind(ob, self.arm, autow(self.bones, [f'forearm.{k}', f'hand.{k}'], power=8)); self.add(g, ob)
            return
        lg = self.p['leg'] * self.bw
        for k in 'LR':
            b = self.bones
            hp, kn = b[f'thigh.{k}'][0], b[f'thigh.{k}'][1]
            an = b[f'shin.{k}'][1]
            P = Part(f'{g}.{k}')
            if piece == 'workpants':
                limb(P, hp + Vector((0, 0, .04)), kn, [(0, .094 * lg, .097 * lg), (.5, .08 * lg, .083 * lg), (1, .065 * lg, .068 * lg)], main, None)
                limb(P, kn, an + Vector((0, 0, .03)), [(0, .065 * lg, .068 * lg), (.4, .061 * lg, .068 * lg), (1, .054 * lg, .056 * lg)], main, None)
                blob(P, kn, (.066 * lg, .069 * lg, .066 * lg), main, None, segs=10, rings=7)
                blob(P, (hp + kn) / 2 + Vector((0, -.02, 0)) + Vector(((1 if k == 'L' else -1) * .07, 0, 0)), (.03, .05, .06), dark, None, segs=8, rings=6)
                ob = finish(P); bind(ob, self.arm, autow(self.bones, ['hips', f'thigh.{k}', f'shin.{k}'], power=5)); self.add(g, ob)
            elif piece == 'shinguard':
                limb(P, kn + Vector((0, -.05, -.02)), an + Vector((0, -.04, .08)), [(0, .05 * lg, .03 * lg), (1, .045 * lg, .028 * lg)], main, None, segs=8)
                blob(P, kn + Vector((0, -.055, 0)), (.05 * lg, .035 * lg, .05 * lg), dark, None, segs=8, rings=6)
                ob = finish(P); bind(ob, self.arm, autow(self.bones, [f'thigh.{k}', f'shin.{k}'], power=8)); self.add(g, ob)
            elif piece == 'boots':
                c = Vector((an.x, -.035 * s, .05 * s))
                blob(P, c, (.058 * s, .13 * s, .06 * s), bootm, None, segs=12, rings=8, cut=lambda co: co.z < .0)
                limb(P, an + Vector((0, 0, -.06)), an + Vector((0, 0, .2 * s)), [(0, .062 * s, .064 * s), (1, .058 * s, .06 * s)], bootm, None)
                ob = finish(P); bind(ob, self.arm, autow(self.bones, [f'shin.{k}', f'foot.{k}'], power=8)); self.add(g, ob)

    # ── 머리카락 ──
    def hair(self, style):
        g = 'h.' + style; s = self.s; hm = rmat('hair', .45, .5); V = self.V
        P = Part(g)
        hc = V(0, .008, 1.632)
        R = (.101 * s, .114 * s, .128 * s)
        if style == 'buzz':
            blob(P, V(0, .002, 1.62), (.095 * s, .108 * s, .124 * s), hm, None, segs=16, rings=12,
                 cut=lambda co: (co.y < -.02 * s and co.z < 1.685 * s) or co.z < 1.555 * s or (co.z < 1.61 * s and co.y < .03 * s))
        elif style == 'short':
            blob(P, hc, R, hm, None, segs=16, rings=12, cut=lambda co: (co.y < -.025 * s and co.z < 1.672 * s) or co.z < 1.545 * s or (co.z < 1.60 * s and co.y < .03 * s))
        elif style == 'swept':
            blob(P, hc, R, hm, None, segs=16, rings=12, cut=lambda co: (co.y < -.025 * s and co.z < 1.665 * s) or co.z < 1.53 * s or (co.z < 1.59 * s and co.y < .03 * s))
            blob(P, V(-.02, -.06, 1.72), (.075 * s, .06 * s, .04 * s), hm, None, segs=12, rings=8)          # 앞으로 넘긴 앞머리
            blob(P, V(.045, -.075, 1.69), (.05 * s, .04 * s, .035 * s), hm, None, segs=10, rings=7)
        elif style == 'bob':
            blob(P, hc + Vector((0, 0, -.01)), (R[0] * 1.08, R[1] * 1.06, R[2] * 1.02), hm, None, segs=16, rings=12,
                 cut=lambda co: (co.y < -.03 * s and co.z < 1.655 * s and abs(co.x) < .075 * s) or co.z < 1.53 * s)
        elif style == 'long':
            blob(P, hc + Vector((0, -.002, 0)), (R[0] * 1.02, R[1], R[2]), hm, None, segs=16, rings=12,
                 cut=lambda co: (co.y < -.03 * s and co.z < 1.665 * s and abs(co.x) < .078 * s) or co.z < 1.50 * s or (co.y < -.06 * s and co.z < 1.58 * s))
            limb(P, V(0, .045, 1.64), V(0, .075, 1.27), [(0, .102 * s, .075 * s), (.4, .108 * s, .062 * s), (.8, .098 * s, .042 * s), (1, .085 * s, .03 * s)], hm, None, segs=12)
        elif style == 'ponytail':
            blob(P, hc + Vector((0, .004, -.004)), (R[0] * .99, R[1] * .99, R[2] * .99), hm, None, segs=16, rings=12,
                 cut=lambda co: (co.y < -.025 * s and co.z < 1.675 * s) or co.z < 1.55 * s or (co.z < 1.61 * s and co.y < .02 * s))
            blob(P, V(0, .115, 1.66), (.035 * s, .03 * s, .035 * s), hm, None, segs=8, rings=6)
            limb(P, V(0, .13, 1.66), V(0, .16, 1.38), [(0, .04 * s, .035 * s), (.3, .05 * s, .04 * s), (1, .015 * s, .015 * s)], hm, None, segs=10)
        ob = finish(P); self.scale_head(ob); bind(ob, self.arm, lambda co: {'head': 1.0})
        return self.add(g, ob)

    # ── 무기 (오른손) ──
    def weapon(self, name):
        g = 'w.' + name
        wr, hd = self.bones['forearm.R'][1], self.bones['hand.R'][1]
        grip = (wr + hd) / 2 + Vector((0, -.008, 0))
        d = Vector((0, -.55, -.83)).normalized()        # 손에서 앞-아래로 뻗는 방향
        side = Vector((1, 0, 0)); up = d.cross(side).normalized()
        wood, metal, dark = rmat('wood', .45, .4), rmat('metal', .3, .6, .9), rmat('dark', .7, .2)
        P = Part(g)
        if name == 'bat':
            limb(P, grip - d * .07, grip + d * .10, [(0, .021, .021), (1, .017, .017)], dark, None, segs=8)
            limb(P, grip + d * .10, grip + d * .78, [(0, .017, .017), (.4, .022, .022), (.85, .032, .032), (1, .031, .031)], wood, None, segs=8)
        elif name == 'pipe':
            limb(P, grip - d * .08, grip + d * .82, [(0, .02, .02), (1, .02, .02)], metal, None, segs=8)
        elif name == 'hammer':
            limb(P, grip - d * .06, grip + d * .26, [(0, .016, .016), (1, .014, .014)], dark, None, segs=8)
            h = grip + d * .27
            limb(P, h - up * .06, h + up * .055, [(0, .022, .022), (1, .02, .02)], metal, None, segs=8)
            limb(P, h + up * .05, h + up * .09 - d * .04, [(0, .015, .006), (1, .005, .003)], metal, None, segs=6)
        elif name == 'knife':
            limb(P, grip - d * .05, grip + d * .07, [(0, .016, .02), (1, .016, .02)], dark, None, segs=8)
            limb(P, grip + d * .07, grip + d * .27, [(0, .004, .028), (.7, .004, .024), (1, .002, .004)], metal, None, segs=6)
        elif name == 'dagger':
            limb(P, grip - d * .05, grip + d * .06, [(0, .014, .014), (1, .014, .014)], dark, None, segs=8)
            limb(P, grip + d * .06 - side * .05, grip + d * .06 + side * .05, [(0, .01, .01), (1, .01, .01)], metal, None, segs=6)
            limb(P, grip + d * .065, grip + d * .3, [(0, .004, .02), (.8, .003, .014), (1, .001, .002)], metal, None, segs=6)
        elif name == 'sword':
            limb(P, grip - d * .12, grip + d * .07, [(0, .016, .016), (1, .016, .016)], dark, None, segs=8)
            limb(P, grip + d * .07 - side * .09, grip + d * .07 + side * .09, [(0, .013, .013), (1, .013, .013)], metal, None, segs=6)
            limb(P, grip + d * .08, grip + d * .95, [(0, .005, .026), (.85, .004, .02), (1, .001, .003)], metal, None, segs=6)
        elif name == 'hatchet':
            limb(P, grip - d * .06, grip + d * .36, [(0, .017, .017), (1, .015, .015)], wood, None, segs=8)
            h = grip + d * .33
            limb(P, h - up * .02, h + up * .12, [(0, .008, .05), (1, .006, .065)], metal, None, segs=6)
        elif name == 'shovel':
            limb(P, grip - d * .3, grip + d * .78, [(0, .018, .018), (1, .018, .018)], wood, None, segs=8)
            limb(P, grip + d * .78, grip + d * 1.05, [(0, .006, .09), (.7, .006, .1), (1, .004, .05)], metal, None, segs=6)
        elif name == 'needle':
            gold = rmat('crest', .4, .5)
            limb(P, grip - d * .12, grip + d * 1.05, [(0, .022, .022), (.15, .016, .016), (.9, .012, .012), (1, .002, .002)], metal, None, segs=8)
            limb(P, grip - d * .16, grip - d * .12, [(0, .03, .012), (1, .03, .012)], metal, None, segs=6)
            for k in range(6):   # 바늘귀에서 늘어진 금실
                a = grip - d * (.14 + k * .02) + Vector((0, .02 * k, -.07 * k))
                limb(P, a, a + Vector((0, .02, -.07)), [(0, .006, .006), (1, .006, .006)], gold, None, segs=4)
        elif name == 'club':
            limb(P, grip - d * .12, grip + d * .1, [(0, .026, .026), (1, .024, .024)], dark, None, segs=8)
            limb(P, grip + d * .1, grip + d * .95, [(0, .026, .026), (.5, .04, .04), (1, .062, .062)], wood, None, segs=10)
            for t in (.42, .66, .9):
                limb(P, grip + d * (t - .02), grip + d * (t + .03), [(0, .03 + t * .04, .03 + t * .04), (1, .03 + t * .04, .03 + t * .04)], metal, None, segs=10)
            limb(P, grip + d * .95, grip + d * 1.02, [(0, .05, .05), (1, .018, .018)], metal, None, segs=8)
        elif name == 'pistol':
            fwd = Vector((0, -1, 0))
            limb(P, grip + Vector((0, .01, .04)), grip + Vector((0, -.01, -.06)), [(0, .016, .026), (1, .016, .026)], dark, None, segs=6)
            limb(P, grip + Vector((0, .03, .07)), grip + Vector((0, .03, .07)) + fwd * .19, [(0, .015, .022), (1, .015, .022)], dark, None, segs=6)
        ob = finish(P); bind(ob, self.arm, rigid('hand.R'), subsurf=0)
        return self.add(g, ob)
