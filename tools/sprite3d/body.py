"""한 사람의 모든 부품을 만든다: 몸(체형 3가지), 차림 5가지, 머리 모양 6가지, 무기 9가지.
부품마다 '구역 번호'가 있는 재질을 쓴다. 렌더 1번은 흰 재질로 음영만, 렌더 2번은 구역 번호 색으로."""
from rig import *

REG = {'void': 0, 'skin': 1, 'hair': 2, 'top': 3, 'bottom': 4, 'shoe': 5, 'eye': 6, 'apron': 7, 'raincoat': 8,
       'gown': 9, 'bandage': 10, 'parrot': 11, 'crest': 12, 'wood': 13, 'metal': 14, 'dark': 15}
HAIRS = ['short', 'swept', 'bob', 'long', 'ponytail', 'buzz']
OUTFITS = ['casual', 'apron', 'raincoat', 'patient', 'parrot']
MELEE = ['pipe', 'hammer', 'knife', 'shovel', 'bat', 'hatchet', 'dagger', 'sword']
WEAPONS = MELEE + ['pistol']

def id_color(rid):
    v = (rid * 16 + 8) / 255
    v = ((v + 0.055) / 1.055) ** 2.4 if v > 0.04045 else v / 12.92
    return (v, v, v, 1)

_rm = {}
def rmat(region, rough=.7, spec=.25, metal=0.0, albedo=.8):
    key = (region, rough, spec, metal, albedo)
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
BODY = {'m': dict(h=1.0, shoulder=.19, hipw=.095, arm=1.15, leg=1.0),
        'f': dict(h=.94, shoulder=.165, hipw=.092, arm=1.0, leg=.94),
        'c': dict(h=.68, shoulder=.17, hipw=.09, arm=1.05, leg=1.0)}
BUILD = [.9, 1.0, 1.14]   # 마름 · 보통 · 건장 (뼈 위치는 같고 굵기만 다르다 → 머리·무기 층을 함께 쓴다)

class Doll:
    def __init__(self, sex, build=1, child=False):
        key = 'c' if child else sex
        self.sex = sex; self.child = child; self.p = p = BODY[key]; self.s = s = p['h']
        self.bw = BUILD[build]
        self.bones = skeleton(p)
        self.arm = make_armature(self.bones)
        self.groups = {}   # 이름 → [객체]
        self.torso_key = 'f' if (sex == 'f' and not child) else 'm'
        self.hk = 1.30 if child else 1.12   # 머리 크기 (아이는 더 크게)

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

    def legs(self, group, mat, shoe_mat, bare_below=None, boot=False):
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
            blob(P, c, (.05 * s * (1.1 if boot else 1), .122 * s, .052 * s * (1.25 if boot else 1)), shoe_mat, None, segs=12, rings=8, cut=lambda co: co.z < .0)
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
        elif name == 'pistol':
            fwd = Vector((0, -1, 0))
            limb(P, grip + Vector((0, .01, .04)), grip + Vector((0, -.01, -.06)), [(0, .016, .026), (1, .016, .026)], dark, None, segs=6)
            limb(P, grip + Vector((0, .03, .07)), grip + Vector((0, .03, .07)) + fwd * .19, [(0, .015, .022), (1, .015, .022)], dark, None, segs=6)
        ob = finish(P); bind(ob, self.arm, rigid('hand.R'), subsurf=0)
        return self.add(g, ob)
