"""한 사람의 모든 부품을 만든다: 몸(체형 3가지), 차림 5가지, 머리 모양 6가지, 무기 9가지.
부품마다 '구역 번호'가 있는 재질을 쓴다. 렌더 1번은 흰 재질로 음영만, 렌더 2번은 구역 번호 색으로."""
from rig import *
import math
import hellbodies

REG = {'void': 0, 'skin': 1, 'hair': 2, 'top': 3, 'bottom': 4, 'shoe': 5, 'eye': 6, 'apron': 7, 'raincoat': 8,
       'gown': 9, 'bandage': 10, 'parrot': 11, 'crest': 12, 'wood': 13, 'metal': 14, 'dark': 15}
HAIRS = ['short', 'swept', 'bob', 'long', 'ponytail', 'buzz']
OUTFITS = ['casual', 'apron', 'raincoat', 'patient', 'parrot']
MELEE = ['pipe', 'hammer', 'knife', 'shovel', 'bat', 'hatchet', 'dagger', 'sword', 'needle', 'arming', 'umbrella', 'sickle', 'crowbar', 'wrench', 'machete', 'metalbat', 'saber', 'rapier', 'katana', 'whip']   # 35차 채찍 · 20차: arming = 한손검 · 26차 현실 무기
TWO = ['sledge', 'fireaxe', 'greatsword', 'maul', 'boltcutter', 'spear']   # 35차 장창   # 16차 양손 무기 (heavy 동작) · 26차 볼트 커터
ARMOR = ['helmet', 'cap', 'visor', 'ngob', 'greathelm', 'hornhelm', 'skullhelm', 'maskhelm', 'jacket', 'vest', 'gloves', 'workpants', 'shinguard', 'boots', 'shield', 'mask', 'trench', 'firesuit', 'combatcoat', 'hauberk', 'platecoat']   # 40차: 긴 겉옷(무릎까지 덮는 큰 갑옷)   # 25차: 검은 마스크 (헬멧 자리)   # 20차: 왼팔의 둥근 방패
WEAPONS = MELEE + ['pistol']
RANGED_G = ['pistol', 'shotgun', 'bow', 'flamer', 'rifle']   # 25차: 화염방사기   # 쏘는 자세(g)로 드는 것

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
        'm': dict(h=1.0, shoulder=.19, hipw=.095, arm=1.15, leg=1.0, stance=.05, legmass=1.3),
        'f': dict(h=.94, shoulder=.165, hipw=.092, arm=1.0, leg=.94, stance=.04, legmass=1.2),
        'c': dict(h=.68, shoulder=.17, hipw=.09, arm=1.05, leg=1.0),
        # 지옥 괴물 (2단계): 망자 · 프렛 · 야크
        'a': dict(h=.97, shoulder=.175, hipw=.088, arm=.9, leg=.88),
        'p': dict(h=1.36, shoulder=.15, hipw=.08, arm=1.05, leg=.9, neck=.13),
        'y': dict(h=1.26, shoulder=.25, hipw=.12, arm=1.55, leg=1.3),
        # 해골 · 대부업자 베스크
        's': dict(h=1.0, shoulder=.17, hipw=.09, arm=.9, leg=.9),
        'k': dict(h=1.04, shoulder=.23, hipw=.15, arm=1.35, leg=1.35),
        # 유황새의 앵무새: 사람 키로 자라 두 발로 걷는 유황앵무
        'b': dict(h=.96, shoulder=.17, hipw=.085, arm=1.0, leg=.8),
        # 지옥 휴식 마을의 경비병 (경비병 설정집 B01~B03): 재문지기 · 빈그릇귀 · 봉랍귀
        'g': dict(h=1.06, shoulder=.18, hipw=.09, arm=.95, leg=.95),
        'o': dict(h=1.14, shoulder=.22, hipw=.1, arm=1.35, leg=1.15),
        'w': dict(h=1.08, shoulder=.19, hipw=.095, arm=1.1, leg=1.05),
        # 지옥 2층 들판의 노름꾼 탈루스 (뼈주사위·산탄총)
        't': dict(h=1.1, shoulder=.19, hipw=.092, arm=1.05, leg=1.04),
        # 3층 층주 세라네: 피의 시장 끝에 도사린 거대한 살덩이 애벌레 (이빨 가득한 아가리)
        'r': dict(h=1.25, shoulder=.3, hipw=.16, arm=1.25, leg=.7),
        # 16차: 층마다 다른 괴물과 층주 (hellbodies.py)
        'h': dict(h=1.22, shoulder=.28, hipw=.13, arm=1.7, leg=1.45),           # 1층 층주 아쉬갈: 숯이 된 바위 거인
        'z': dict(h=1.24, shoulder=.27, hipw=.12, arm=1.5, leg=1.35),           # 24차 4층 층주 도르칸: 가시 갑옷 기사
        'u': dict(h=1.3, shoulder=.15, hipw=.085, arm=1.0, leg=.8, neck=.2),    # 2층 층주 구르마: 산 같은 배, 바늘 목
        'n': dict(h=.97, shoulder=.17, hipw=.088, arm=.9, leg=.88),             # 1층 불씨 망자
        'l': dict(h=1.0, shoulder=.19, hipw=.1, arm=1.15, leg=1.05),            # 2층 늪 망자 (불어 터질 듯한 시체)
        'e': dict(h=1.14, shoulder=.24, hipw=.13, arm=1.45, leg=1.25),          # 2층 탐식귀 (두꺼비 거구)
        'v': dict(h=1.12, shoulder=.17, hipw=.088, arm=1.0, leg=1.05, neck=.05), # 3층 흥정꾼 (가면 상인)
        'd': dict(h=1.0, shoulder=.17, hipw=.09, arm=.9, leg=.9),               # 3층 빚쟁이 해골 (멍에·족쇄)
        # 37차: 서큐버스(q) · 아큐버스 여자(j) · 남자(i) — 사람과 같은 뼈, 옷과 머리·뿔·고리를 몸에 함께 굽는다
        'q': dict(h=.95, shoulder=.16, hipw=.09, arm=.98, leg=.95, stance=.03, legmass=1.15),
        'j': dict(h=.95, shoulder=.16, hipw=.09, arm=.98, leg=.95, stance=.03, legmass=1.15),
        'i': dict(h=1.0, shoulder=.19, hipw=.095, arm=1.15, leg=1.0, stance=.05, legmass=1.3),
        # 39차: 미스 황(hw) · 천사 남(an) · 여(af) — 사람과 같은 뼈, 옷·머리를 몸에 함께
        'hw': dict(h=.94, shoulder=.165, hipw=.092, arm=1.0, leg=.94, stance=.04, legmass=1.15),
        'an': dict(h=1.04, shoulder=.2, hipw=.095, arm=1.15, leg=1.02, stance=.05, legmass=1.25),
        'af': dict(h=.97, shoulder=.17, hipw=.092, arm=1.02, leg=.96, stance=.04, legmass=1.15),
        # 42차: 판초 악마(pd) · 저승사자(jr) · 유내 10대(y1) · 20대(y2) · 30대 후반(y3)
        'pd': dict(h=1.07, shoulder=.18, hipw=.09, arm=1.1, leg=1.04, stance=.05, legmass=1.0),
        'jr': dict(h=1.05, shoulder=.19, hipw=.094, arm=1.12, leg=1.02, stance=.05, legmass=1.15),
        'y1': dict(h=.9, shoulder=.15, hipw=.085, arm=.97, leg=.96, stance=.035, legmass=1.0),
        'y2': dict(h=.96, shoulder=.163, hipw=.09, arm=.99, leg=.97, stance=.04, legmass=1.0),
        'y3': dict(h=.95, shoulder=.165, hipw=.094, arm=1.0, leg=.95, stance=.04, legmass=1.05),
        # 42차 주요 인물: 파샤르(ps) · 루엔(lu) · 환생관 할아버지(gp) · 불다(bd)
        'ps': dict(h=1.06, shoulder=.18, hipw=.09, arm=1.1, leg=1.04, stance=.05, legmass=1.05),
        'lu': dict(h=.98, shoulder=.165, hipw=.09, arm=1.0, leg=.96, stance=.035, legmass=1.1),
        'gp': dict(h=.93, shoulder=.17, hipw=.088, arm=1.0, leg=.92, stance=.05, legmass=.95),
        'bd': dict(h=1.05, shoulder=.21, hipw=.1, arm=1.2, leg=1.02, stance=.06, legmass=1.3),
        # 43차: 황색날개(yw) · 마스크 소녀(mg) · 칼드렉(kd) · 오볼로(ob) · 노을(no) · 마리(mr) / 5층 가면귀(gm) · 속삭임꾼(ws) · 인형병사(ip) · 마르시온(mc) · 마네트(mn)
        'yw': dict(h=.95, shoulder=.165, hipw=.092, arm=1.0, leg=.95, stance=.04, legmass=1.15),
        'mg': dict(h=.8, shoulder=.14, hipw=.08, arm=.92, leg=.9, stance=.035, legmass=1.0),
        'kd': dict(h=1.3, shoulder=.3, hipw=.14, arm=1.7, leg=1.4, stance=.08, legmass=1.4),
        'ob': dict(h=.92, shoulder=.16, hipw=.088, arm=1.0, leg=.92, stance=.04, legmass=1.0),
        'no': dict(h=.98, shoulder=.17, hipw=.092, arm=1.02, leg=.96, stance=.04, legmass=1.15),
        'mr': dict(h=1.02, shoulder=.155, hipw=.085, arm=1.05, leg=1.0, stance=.03, legmass=.9),
        'gm': dict(h=1.1, shoulder=.17, hipw=.088, arm=1.1, leg=1.08, stance=.05, legmass=.9),
        'ws': dict(h=1.02, shoulder=.18, hipw=.09, arm=1.35, leg=.95, stance=.07, legmass=.9),
        'ip': dict(h=1.0, shoulder=.19, hipw=.09, arm=1.0, leg=1.0, stance=.05),
        'mc': dict(h=1.28, shoulder=.26, hipw=.12, arm=1.5, leg=1.35, stance=.07, legmass=1.1),
        'om': dict(h=1.16, shoulder=.24, hipw=.1, arm=1.3, leg=1.12, stance=.06, legmass=1.05),   # 55차 오르멧: 큰 키, 넓은 어깨
        'mn': dict(h=1.35, shoulder=.28, hipw=.13, arm=1.6, leg=1.4, stance=.08),
        # 44차 경비병: 4층 쇠모루지기(w4) · 5층 가면파수꾼(w5)
        'w4': dict(h=1.12, shoulder=.27, hipw=.12, arm=1.5, leg=1.25, stance=.08, legmass=1.3),
        'w5': dict(h=1.15, shoulder=.17, hipw=.086, arm=1.05, leg=1.12, stance=.04, legmass=.9),
        # 48차 필드 보스 전용 몸: 로크(rk) · 굴론(gn) · 메르크(mq) · 페론(fr) / 걷는 염소대왕(gw)
        'rk': dict(h=1.25, shoulder=.3, hipw=.15, arm=1.75, leg=1.15, stance=.1, legmass=1.6),
        'gn': dict(h=1.05, shoulder=.26, hipw=.17, arm=1.1, leg=.8, stance=.12, legmass=1.8),
        'mq': dict(h=1.15, shoulder=.24, hipw=.14, arm=1.1, leg=1.0, stance=.09, legmass=1.3),
        'fr': dict(h=1.35, shoulder=.32, hipw=.15, arm=1.8, leg=1.4, stance=.1, legmass=1.6),
        'gw': dict(h=1.2, shoulder=.22, hipw=.1, arm=1.25, leg=1.15, stance=.05, legmass=1.1),
        # 49차 수쿰빗 필드 보스: 마피아 두목(mb) · 방콕의 대식자(be)
        'mb': dict(h=1.08, shoulder=.24, hipw=.13, arm=1.18, leg=1.0, stance=.07, legmass=1.45),
        'be': dict(h=1.3, shoulder=.3, hipw=.14, arm=1.9, leg=1.2, stance=.1, legmass=1.4)}
MONSTER_BW = {'x': None, 'a': .8, 'p': .68, 'y': 1.32, 's': .42, 'k': 1.7, 'b': 1.0, 'g': .42, 'o': 1.08, 'w': .95, 't': .5, 'r': 1.0,
              'h': 1.45, 'u': .62, 'n': .8, 'l': 1.05, 'e': 1.3, 'v': .85, 'd': .42, 'z': 1.25, 'q': .9, 'j': .9, 'i': 1.0, 'hw': .95, 'an': 1.05, 'af': .95, 'pd': .82, 'jr': .95, 'y1': .86, 'y2': .92, 'y3': 1.0, 'ps': .88, 'lu': .9, 'gp': .85, 'bd': 1.18, 'yw': .95, 'mg': .82, 'kd': 1.5, 'ob': .9, 'no': .95, 'mr': .78, 'gm': .82, 'ws': .8, 'ip': 1.0, 'mc': 1.3, 'mn': 1.45, 'w4': 1.35, 'w5': .82, 'rk': 1.7, 'gn': 1.8, 'mq': 1.6, 'fr': 1.6, 'gw': 1.15, 'mb': 1.4, 'be': 1.45, 'om': 1.22}
MONSTER_HK = {'x': 1.0, 'a': 1.05, 'p': .86, 'y': 1.12, 's': 1.0, 'k': 1.2, 'b': 1.0, 'g': 1.0, 'o': .9, 'w': 1.0, 't': 1.0, 'r': 1.0,
              'h': 1.2, 'u': .9, 'n': 1.05, 'l': 1.0, 'e': 1.0, 'v': 1.0, 'd': 1.0, 'z': 1.1, 'q': 1.12, 'j': 1.12, 'i': 1.12, 'hw': 1.12, 'an': 1.1, 'af': 1.12, 'pd': 1.06, 'jr': 1.08, 'y1': 1.08, 'y2': 1.05, 'y3': 1.05, 'ps': 1.08, 'lu': 1.1, 'gp': 1.1, 'bd': 1.08, 'yw': 1.12, 'mg': 1.22, 'kd': .95, 'ob': 1.18, 'no': 1.12, 'mr': 1.08, 'gm': 1.0, 'ws': 1.0, 'ip': 1.05, 'mc': 1.05, 'mn': 1.1, 'w4': 1.0, 'w5': 1.0, 'rk': 1.15, 'gn': 1.0, 'mq': 1.0, 'fr': 1.05, 'gw': 1.15, 'mb': 1.05, 'be': 1.1, 'om': 1.08}
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
        # 42차: 사람(과 전용 몸)의 얼굴을 서큐버스 수준으로 — 눈을 조금 크게, 눈썹 · 입 · 턱선 (지옥 괴물은 그대로)
        detail = face and (self.mkey is None or len(self.mkey) == 2)
        if face:
            for sx in (1, -1):
                blob(P, V(sx * .034, -.093, 1.625), ((.016 if detail else .014) * s, .009 * s, (.013 if detail else .011) * s), eye, None, segs=8, rings=5)
                blob(P, V(sx * .092, .0, 1.61), (.013 * s, .022 * s, .028 * s), skin, None, segs=8, rings=5)
            blob(P, V(0, -.106, 1.595), (.012 * s, .012 * s, .02 * s), skin, None, segs=8, rings=5)
        if detail:
            blob(P, V(0, -.052, 1.548), (.056 * s, .056 * s, .046 * s), skin, None, segs=10, rings=7)       # 턱선
            for sx in (1, -1):
                limb(P, V(sx * .02, -.099, 1.65), V(sx * .052, -.091, 1.653), [(0, .006 * s, .005 * s), (1, .005 * s, .004 * s)], rmat('hair', .45, .5), None, segs=4)   # 눈썹
            blob(P, V(0, -.1, 1.566), (.015 * s, .004 * s, .0035 * s), rmat('dark', .6, .2), None, segs=6, rings=3)   # 입
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
                blob(P, sh + Vector((-sx * .015, 0, .0)), (.062 * am * wide, .058 * am * wide, .058 * am * wide), sleeve_mat, None, segs=10, rings=7)   # 42차: 어깨가 풍선처럼 부풀던 것 줄임
            ob = finish(P); bind(ob, self.arm, autow(self.bones, ['spine', f'upper_arm.{k}', f'forearm.{k}'], power=5)); self.add(group, ob)

    def hands(self, group, mat=None):
        skin = mat or rmat('skin', .6, .3); am = self.p['arm'] * self.bw
        for k in 'LR':
            wr, hd = self.bones[f'forearm.{k}'][1], self.bones[f'hand.{k}'][1]
            P = Part(f'{group}.hand.{k}')
            blob(P, (wr + hd) / 2 + Vector((0, -.008, .01)), (.026 * am, .032 * am, .05 * am), skin, None, segs=10, rings=7)
            if self.mkey is None or len(self.mkey) == 2:   # 42차: 엄지 (손이 덩어리로 보이지 않게)
                sx = 1 if k == 'L' else -1
                c = (wr + hd) / 2
                limb(P, c + Vector((-sx * .012, -.02, .02)), c + Vector((-sx * .02, -.04, -.01)), [(0, .012 * am, .012 * am), (1, .008 * am, .008 * am)], skin, None, segs=6)
            ob = finish(P); bind(ob, self.arm, rigid(f'hand.{k}')); self.add(group, ob)

    def legs(self, group, mat, shoe_mat, bare_below=None, boot=False, foot=1.0, sole=True):
        # 사람 몸은 허벅지·종아리에 살집(legmass)이 있고, 신발은 두툼한 밑창의 큰 신 (하체가 단단해 보이게)
        lm = self.p.get('legmass', 1.0)
        lg = self.p['leg'] * self.bw * lm; s = self.s
        fm = 1.12 if lm > 1 else 1.0
        for k in 'LR':
            b = self.bones
            hp, kn = b[f'thigh.{k}'][0], b[f'thigh.{k}'][1]
            an = b[f'shin.{k}'][1]
            P = Part(f'{group}.leg.{k}')
            limb(P, hp + Vector((0, 0, .03)), kn, [(0, .085 * lg, .088 * lg), (.3, .082 * lg, .086 * lg), (.6, .07 * lg, .074 * lg), (1, .056 * lg, .059 * lg)], mat, None)
            shin_mat = bare_below or mat
            limb(P, kn, an + Vector((0, 0, .02)), [(0, .056 * lg, .059 * lg), (.3, .056 * lg, .066 * lg), (.6, .05 * lg, .056 * lg), (1, .042 * lg, .045 * lg)], shin_mat, None)
            blob(P, kn, (.058 * lg, .06 * lg, .058 * lg), shin_mat, None, segs=10, rings=7)
            ob = finish(P); bind(ob, self.arm, autow(self.bones, ['hips', f'thigh.{k}', f'shin.{k}'], power=5)); self.add(group, ob)
            P = Part(f'{group}.shoe.{k}')
            c = Vector((an.x, -.035 * s, .045 * s))
            blob(P, c, (.05 * s * (1.1 if boot else 1) * foot * fm, .122 * s * foot * fm, .052 * s * (1.25 if boot else 1) * foot * fm), shoe_mat, None, segs=12, rings=8, cut=lambda co: co.z < .0)
            if lm > 1 and sole:   # 두툼한 밑창 (어두운 판) — 맨발(수영복)은 없다
                limb(P, c + Vector((0, .1 * s * fm, .012 * s)), c + Vector((0, -.13 * s * fm, .012 * s)), [(0, .056 * s * fm, .018 * s), (1, .05 * s * fm, .016 * s)], rmat('dark', .8, .1), None, segs=8)
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
        elif name == 'swim':
            # 53차 천국 수영장: 여자는 비키니(가슴 띠 · 목 끈 · 아랫도리), 남자는 무릎 위 수영 반바지. 맨발.
            #   수영복 = 구역 3(위) · 4(아래) — 게임이 밝은 색을 입힌다
            skin = rmat('skin', .6, .3); top = rmat('top', .45, .4); bot = rmat('bottom', .5, .35)
            s = self.s; w = self.bw; f = self.torso_key == 'f'
            T = list(TORSO[self.torso_key])
            if f:   # 비키니 띠의 아래 선을 또렷하게: 1.16 ~ 1.24 사이에 고리 하나 더
                a, b = T[4], T[5]
                T.insert(5, tuple((a[k] + b[k]) / 2 for k in range(4)))
            rings = [(self.V(0, cy, z), Vector((0, -1, 0)), Vector((1, 0, 0)), rx * s * w, ry * s * (w * .5 + .5)) for z, rx, ry, cy in T]
            P = Part(g)
            if f: mf = lambda z: bot if z < .955 * s else (top if 1.195 * s < z < 1.335 * s else skin)
            else: mf = lambda z: bot if z < 1.0 * s else skin
            loft(P, rings, skin, None, segs=14, matfn=mf)
            ob = finish(P); bind(ob, self.arm, lambda co: {'spine': smooth(co.z, .98 * s, 1.12 * s), 'hips': 1 - smooth(co.z, .98 * s, 1.12 * s)}); self.add(g, ob)
            self.head(g); self.arms(g, None); self.hands(g)
            if f:
                self.legs(g, skin, skin, foot=.8, sole=False)
                P = Part(g + '.strap')   # 목 뒤로 묶는 끈 둘
                for sx in (1, -1):
                    limb(P, self.V(sx * .055, -.1, 1.3), self.V(sx * .03, .01, 1.45), [(0, .009 * s, .006 * s), (1, .007 * s, .005 * s)], top, None, segs=5)
                ob = finish(P); bind(ob, self.arm, lambda co: {'spine': 1.0}); self.add(g, ob)
            else:
                self.legs(g, bot, skin, bare_below=skin, foot=.85, sole=False)
        elif name == 'casualL':
            # 39차 서울 봄·가을: 긴소매 윗옷(손목까지) · 긴 바지 · 운동화
            top = rmat('top', .85, .15); bot = rmat('bottom', .8, .15); shoe = rmat('shoe', .5, .4)
            self.torso(g, top, bot, hem=1.0)
            self.head(g); self.arms(g, top, 1.93); self.hands(g); self.legs(g, bot, shoe)
            # 목둘레 깃 (긴소매 티 · 셔츠 깃)
            P = Part(g + '.collar')
            limb(P, self.V(0, .0, 1.405), self.V(0, .0, 1.445), [(0, .07 * self.s * self.bw, .062 * self.s), (1, .062 * self.s * self.bw, .056 * self.s)], top, None, segs=14, caps=(False, False))
            ob = finish(P); bind(ob, self.arm, lambda co: {'spine': 1.0}); self.add(g, ob)
        elif name == 'padding':
            # 39차 서울 겨울: 무릎까지 오는 롱패딩 — 가로로 누빈 줄(안감 색 9), 세운 깃, 두툼한 긴 소매, 겨울 신발. 모자는 없다 (머리가 보인다)
            coat = rmat('top', .7, .2); seam = rmat('gown', .85, .1); bot = rmat('bottom', .8, .15); shoe = rmat('shoe', .5, .4)
            s = self.s
            def puff(rings):
                return [(c, u, v, rs * 1.2 + .022, rf * 1.24 + .026) for c, u, v, rs, rf in rings]
            self.torso(g, coat, coat, hem=0, extra=puff)
            self.head(g); self.arms(g, coat, 1.96, cuff=True, wide=1.38); self.hands(g); self.legs(g, bot, shoe, boot=True)
            # 엉덩이에서 무릎까지의 자락 (걸을 때 다리를 따라 밀린다)
            def skirt_w(co):
                h = (1 - smooth(co.z, .55 * s, 1.0 * s)) * .55
                wl = smooth(co.x, -.07 * s, .07 * s)
                return {'hips': 1 - h, 'thigh.L': h * wl, 'thigh.R': h * (1 - wl)}
            P = Part(g + '.skirt')
            tab = [(1.0, .19, .15), (.86, .205, .16), (.7, .215, .168), (.52, .222, .172)]
            rings = [(self.V(0, .005, z), Vector((0, -1, 0)), Vector((1, 0, 0)), rx * s * self.bw + .02, ry * s + .024) for z, rx, ry in tab]
            loft(P, rings, coat, None, segs=18, caps=(False, False))
            for z, rx, ry in ((.88, .207, .162), (.72, .216, .169), (.56, .222, .172)):   # 자락의 누빈 줄
                loft(P, [(self.V(0, .005, z), Vector((0, -1, 0)), Vector((1, 0, 0)), rx * s * self.bw + .024, ry * s + .028), (self.V(0, .005, z + .012), Vector((0, -1, 0)), Vector((1, 0, 0)), rx * s * self.bw + .024, ry * s + .028)], seam, None, segs=18, caps=(False, False))
            ob = finish(P); bind(ob, self.arm, skirt_w); self.add(g, ob)
            # 몸통의 누빈 줄 · 앞 지퍼 · 세운 깃
            P = Part(g + '.quilt')
            for z, k in ((1.08, 1.0), (1.2, 1.04), (1.32, 1.06)):
                loft(P, [(self.V(0, -.003, z), Vector((0, -1, 0)), Vector((1, 0, 0)), .17 * s * self.bw * k * 1.2 + .026, .112 * s * 1.24 + .03), (self.V(0, -.003, z + .012), Vector((0, -1, 0)), Vector((1, 0, 0)), .17 * s * self.bw * k * 1.2 + .026, .112 * s * 1.24 + .03)], seam, None, segs=18, caps=(False, False))
            limb(P, self.V(0, -.17, 1.4), self.V(0, -.19, .55), [(0, .006, .004), (1, .006, .004)], seam, None, segs=4)
            limb(P, self.V(0, .0, 1.4), self.V(0, .0, 1.5), [(0, .09 * s * self.bw, .085 * s), (1, .078 * s * self.bw, .074 * s)], coat, None, segs=14, caps=(False, False))
            ob = finish(P); bind(ob, self.arm, lambda co: {'neck': smooth(co.z, 1.42 * s, 1.48 * s), 'spine': 1 - smooth(co.z, 1.42 * s, 1.48 * s)} if co.z > 1.0 * s else {'hips': 1.0}); self.add(g, ob)
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
        elif name == 'robber':
            # 17차 강도: 후드를 뒤집어쓴 후드티, 눈만 뚫린 검은 복면, 장갑, 카고 바지, 등에 멘 불룩한 더플백
            hood = rmat('top', .9, .08); mask = rmat('raincoat', .95, .05); bot = rmat('bottom', .85, .1); shoe = rmat('shoe', .6, .3)
            glove = rmat('dark', .8, .1); bag = rmat('apron', .85, .1); skin = rmat('skin', .6, .3); eye = rmat('eye', .3, .6)
            s = self.s
            def hoodie(rings):
                out = []
                for c, u, v, rs, rf in rings:
                    z = c.z / s
                    out.append((c, u, v, rs * (1.12 if z > 1.0 else 1.18) + .012, rf * 1.16 + .014))
                return out
            self.torso(g, hood, bot, hem=.9, extra=hoodie)
            self.arms(g, hood, 1.9, cuff=True, wide=1.12); self.hands(g, glove); self.legs(g, bot, shoe)
            P = Part(g + '.mask')
            hc = self.V(0, -.005, 1.615)
            blob(P, hc, (.093 * s, .103 * s, .118 * s), mask, None, segs=16, rings=12)                     # 복면 (머리 전체)
            limb(P, hc + Vector((-.05 * s, -.093 * s, .016 * s)), hc + Vector((.05 * s, -.093 * s, .016 * s)), [(0, .012 * s, .009 * s), (1, .012 * s, .009 * s)], skin, None, segs=6)   # 눈 구멍 (살갗)
            for sx in (1, -1):
                blob(P, hc + Vector((sx * .03 * s, -.1 * s, .016 * s)), (.009 * s, .004 * s, .007 * s), eye, None, segs=6, rings=4)
            # 뒤집어쓴 후드 (복면 위로, 얼굴 쪽은 트였다)
            blob(P, hc + Vector((0, .02 * s, .012 * s)), (.11 * s, .118 * s, .132 * s), hood, None, segs=16, rings=12, cut=lambda co: co.y < -.05 * s and abs(co.x) < .075 * s and 1.52 * s < co.z < 1.72 * s)
            limb(P, self.V(0, .0, 1.40), self.V(0, .0, 1.53), [(0, .09 * s, .085 * s), (1, .075 * s, .07 * s)], hood, None)
            ob = finish(P); self.scale_head(ob); bind(ob, self.arm, lambda co: {'head': smooth(co.z, 1.46 * s, 1.52 * s), 'neck': 1 - smooth(co.z, 1.46 * s, 1.52 * s)}); self.add(g, ob)
            P = Part(g + '.bag')   # 등에 멘 불룩한 더플백 + 끈
            blob(P, self.V(0, .17, 1.18), (.13 * s, .08 * s, .14 * s), bag, None, segs=12, rings=8)
            for sx in (1, -1):
                limb(P, self.V(sx * .1, -.12, 1.38), self.V(sx * .11, .12, 1.3), [(0, .012, .006), (1, .012, .006)], glove, None, segs=4)
            limb(P, self.V(-.12, .2, 1.27), self.V(.12, .2, 1.27), [(0, .01, .01), (1, .01, .01)], glove, None, segs=4)   # 지퍼
            ob = finish(P); bind(ob, self.arm, lambda co: {'spine': 1.0}); self.add(g, ob)
        elif name == 'mafia':
            # 17차 마피아: 엉덩이까지 오는 짙은 정장 재킷, 흰 셔츠 깃과 붉은 넥타이, 금 목걸이, 검은 선글라스, 반짝이는 구두
            suit = rmat('top', .55, .3); bot = rmat('bottom', .6, .25); shoe = rmat('shoe', .25, .7)
            shirt = rmat('bandage', .6, .2); tie = rmat('crest', .5, .3); gold = rmat('metal', .25, .7, .9); dark = rmat('dark', .2, .8)
            s = self.s
            def jacket(rings):
                out = []
                for c, u, v, rs, rf in rings:
                    z = c.z / s
                    out.append((c, u, v, rs * (1.1 if z > 1.0 else 1.16) + .01, rf * 1.12 + .012))
                c0, u, v, rs, rf = out[0]
                out.insert(0, (self.V(0, .005, .8), u, v, rs * 1.1, rf * 1.12))
                return out
            self.torso(g, suit, bot, hem=.86, extra=jacket)
            self.head(g); self.arms(g, suit, 1.9, cuff=True, wide=1.05); self.hands(g); self.legs(g, bot, shoe)
            P = Part(g + '.dress')
            # 셔츠 앞섶(V자) · 넥타이 · 깃 · 금 목걸이
            for sx in (1, -1):
                limb(P, self.V(sx * .055, -.13, 1.44), self.V(sx * .012, -.17, 1.18), [(0, .03, .006), (1, .012, .006)], shirt, None, segs=4)
                limb(P, self.V(sx * .06, -.12, 1.45), self.V(sx * .1, -.15, 1.3), [(0, .028, .006), (1, .014, .006)], suit, None, segs=4)   # 재킷 깃
            limb(P, self.V(0, -.165, 1.42), self.V(0, -.18, 1.12), [(0, .016, .006), (.85, .022, .006), (1, .006, .004)], tie, None, segs=4)
            for n in range(9):
                t = n / 8 * 2 - 1
                blob(P, self.V(t * .07, -.13 - (1 - t * t) * .02, 1.45 - (1 - t * t) * .05), (.009, .006, .009), gold, None, segs=6, rings=4)
            for z in (1.06, .98):   # 단추
                blob(P, self.V(0, -.2, z), (.01, .006, .01), dark, None, segs=6, rings=4)
            ob = finish(P); bind(ob, self.arm, lambda co: {'spine': smooth(co.z, .98 * s, 1.12 * s), 'hips': 1 - smooth(co.z, .98 * s, 1.12 * s)}); self.add(g, ob)
            P = Part(g + '.shades')   # 선글라스
            hc = self.V(0, -.005, 1.615)
            for sx in (1, -1):
                blob(P, hc + Vector((sx * .034 * s, -.098 * s, .014 * s)), (.026 * s, .008 * s, .017 * s), dark, None, segs=10, rings=6)
            limb(P, hc + Vector((-.01 * s, -.1 * s, .02 * s)), hc + Vector((.01 * s, -.1 * s, .02 * s)), [(0, .004, .004), (1, .004, .004)], gold, None, segs=4)
            for sx in (1, -1):
                limb(P, hc + Vector((sx * .058 * s, -.09 * s, .016 * s)), hc + Vector((sx * .086 * s, -.02 * s, .02 * s)), [(0, .004, .004), (1, .004, .004)], dark, None, segs=4)
            ob = finish(P); self.scale_head(ob); bind(ob, self.arm, lambda co: {'head': 1.0}); self.add(g, ob)
            for k in 'LR':   # 반지
                hd = self.bones[f'hand.{k}'][0]
                P = Part(f'{g}.ring.{k}')
                blob(P, hd + Vector((0, -.012, -.03)), (.012, .012, .008), gold, None, segs=6, rings=4)
                ob = finish(P); bind(ob, self.arm, rigid(f'hand.{k}')); self.add(g, ob)
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
        elif name in ('ash', 'pret', 'yak', 'bones', 'besk', 'cockatoo', 'warden1', 'warden2', 'warden3', 'talus', 'serane', 'debtor') or name in hellbodies.NEW:
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
        if name == 'bones':
            self.bones_body(g); return
        if name == 'besk':
            self.besk_body(g); return
        if name == 'cockatoo':
            self.cockatoo_body(g); return
        if name == 'warden1':   # 16차: 재의 문지기 (얼굴 없는 두건 · 재 망토 · 불씨)
            hellbodies.ashwraith(self, g); return
        if name in hellbodies.NEW:
            hellbodies.NEW[name](self, g); return
        if name == 'debtor':
            hellbodies.debtor(self, g); return
        if name in ('warden1', 'warden2', 'warden3'):
            self.warden_body(g, name); return
        if name == 'talus':
            self.talus_body(g); return
        if name == 'serane':
            self.serane_body(g); return
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

    # ── 해골: 척추·갈비·골반, 가는 뼈 팔다리, 해골 (몸통 없이) ──
    def bones_body(self, g):
        s = self.s; V = self.V
        bone = rmat('skin', .7, .15); dark = rmat('dark', .85, .08)
        P = Part(g + '.spine')
        limb(P, V(0, .02, .95), V(0, .03, 1.42), [(0, .022, .022), (1, .02, .02)], bone, None, segs=6)
        for k in range(6):   # 갈비뼈: 앞으로 휘는 고리
            z = 1.36 - k * .05
            r = .1 - abs(k - 2) * .008
            for sx in (1, -1):
                limb(P, V(sx * .01, .03, z), V(sx * r, -.02, z - .02), [(0, .011, .011), (1, .01, .01)], bone, None, segs=4)
                limb(P, V(sx * r, -.02, z - .02), V(sx * .035, -.085, z - .05), [(0, .01, .01), (1, .008, .008)], bone, None, segs=4)
        blob(P, V(0, 0, .98), (.1 * s, .06 * s, .055 * s), bone, None, segs=10, rings=6)   # 골반
        limb(P, V(-.13, 0, 1.43), V(.13, 0, 1.43), [(0, .012, .012), (1, .012, .012)], bone, None, segs=5)   # 쇄골
        ob = finish(P); bind(ob, self.arm, lambda co: {'spine': smooth(co.z, .98 * s, 1.12 * s), 'hips': 1 - smooth(co.z, .98 * s, 1.12 * s)}); self.add(g, ob)
        self.arms(g, None); self.hands(g); self.legs(g, rmat('skin', .7, .15), rmat('skin', .7, .15), foot=.7)
        hc = V(0, -.005, 1.615)
        P = Part(g + '.skull')
        limb(P, V(0, .01, 1.42), V(0, 0, 1.53), [(0, .018, .018), (1, .018, .018)], bone, None, segs=5)
        blob(P, hc + Vector((0, 0, .012 * s)), (.082 * s, .095 * s, .1 * s), bone, None, segs=14, rings=10)
        blob(P, hc + Vector((0, -.05 * s, -.075 * s)), (.055 * s, .05 * s, .03 * s), bone, None, segs=10, rings=6)   # 턱
        for sx in (1, -1):
            blob(P, hc + Vector((sx * .032 * s, -.082 * s, .012 * s)), (.024 * s, .014 * s, .022 * s), dark, None, segs=8, rings=5)
        blob(P, hc + Vector((0, -.093 * s, -.025 * s)), (.01 * s, .008 * s, .014 * s), dark, None, segs=6, rings=4)   # 코 구멍
        for k in range(6):
            x = (k - 2.5) * .011
            blob(P, hc + Vector((x * s, -.098 * s, -.058 * s)), (.005 * s, .004 * s, .007 * s), dark, None, segs=4, rings=3)
        ob = finish(P); bind(ob, self.arm, lambda co: {'head': 1.0}); self.add(g, ob)

    # ── 세라네: 3층 피의 시장의 층주. 젖어 번들거리는 마디진 살덩이가 일어선 거대한 애벌레, 세로로 찢어진 아가리에 이빨이 겹겹이 ──
    def serane_body(self, g):
        s = self.s; V = self.V
        flesh = rmat('skin', .28, .5); flesh2 = rmat('top', .3, .45); dark = rmat('dark', .6, .2)
        tooth = rmat('parrot', .35, .4); blood = rmat('crest', .25, .6); eye = rmat('eye', .2, .7)
        spine_w = lambda co: {'spine': smooth(co.z, .55 * s, 1.0 * s), 'hips': 1 - smooth(co.z, .55 * s, 1.0 * s)}
        # 꼬리: 뒤(+y)로 누운 마디 여섯 (마디 사이는 어두운 주름)
        P = Part(g + '.tail')
        for k in range(7):
            y, z = .14 + k * .12, .24 - k * .02
            rx, ry, rz = .33 - k * .035, .09, .22 - k * .022
            blob(P, V(0, y, z), (rx * s, ry * s, rz * s), flesh, None, segs=16, rings=10)
            blob(P, V(0, y + .06, z - .005), (rx * .92 * s, .025 * s, rz * .92 * s), flesh2, None, segs=14, rings=6)
        ob = finish(P); bind(ob, self.arm, lambda co: {'hips': 1.0}); self.add(g, ob)
        # 일어선 앞몸: 바닥에서 머리 밑까지 굵은 마디, 위로 갈수록 앞으로 숙인다 (배 쪽에 주름 띠, 온몸에 혹)
        P = Part(g + '.body')
        rings = []
        for z, rx, ry, cy in ((.08, .36, .32, .06), (.3, .38, .33, .03), (.55, .36, .31, -.01), (.8, .33, .29, -.05), (1.0, .3, .27, -.09), (1.16, .28, .25, -.12)):
            rings.append((V(0, cy, z), Vector((0, -1, 0)), Vector((1, 0, 0)), rx * s, ry * s))
        loft(P, rings, flesh, None, segs=18, caps=(True, False), matfn=None)
        for z, cy in ((.2, .045), (.36, .025), (.52, 0), (.68, -.025), (.84, -.055), (.98, -.085)):
            r = .38 - abs(z - .4) * .12
            limb(P, V(0, cy, z - .014), V(0, cy, z + .014), [(0, (r + .008) * s, (r * .86 + .008) * s), (1, (r + .008) * s, (r * .86 + .008) * s)], flesh2, None, segs=18)
        import random
        rnd = random.Random(7)
        for k in range(34):   # 혹과 물집 (온몸에 고르지 않게)
            a = rnd.uniform(0, math.tau); z = rnd.uniform(.15, 1.1); r = .35 - abs(z - .45) * .12
            c = V(math.cos(a) * r * .98, -.03 * z + math.sin(a) * r * .86, z)
            rr = rnd.uniform(.018, .05)
            blob(P, c, (rr * s, rr * .7 * s, rr * s), flesh if k % 3 else flesh2, None, segs=8, rings=6)
        ob = finish(P); bind(ob, self.arm, spine_w); self.add(g, ob)
        # 머리: 앞으로 숙인 커다란 머리. 아가리가 얼굴을 다 차지하고 목 아래까지 세로로 찢어졌다 (안은 어둠, 입술은 검붉게)
        hc = V(0, -.14, 1.36)
        P = Part(g + '.head')
        a, b = .19 * s, .3 * s
        mc = hc + Vector((0, -.25 * s, -.1 * s))
        blob(P, hc, (.33 * s, .3 * s, .34 * s), flesh, None, segs=22, rings=16, cut=lambda co: co.y < mc.y + .09 * s and ((co.x / (a * 1.05)) ** 2 + ((co.z - mc.z) / (b * 1.05)) ** 2) < 1)
        blob(P, hc + Vector((0, .04 * s, .2 * s)), (.24 * s, .2 * s, .12 * s), flesh, None, segs=16, rings=10)   # 정수리 혹
        for k in range(6):   # 목 주름
            limb(P, V(0, -.1 - k * .006, 1.08 + k * .03), V(0, -.1 - k * .006, 1.095 + k * .03), [(0, (.3 - k * .005) * s, (.27 - k * .005) * s), (1, (.3 - k * .005) * s, (.27 - k * .005) * s)], flesh2, None, segs=18)
        blob(P, mc + Vector((0, .08 * s, 0)), (a * 1.02, .13 * s, b * 1.02), dark, None, segs=18, rings=14)   # 목구멍
        for k in range(32):   # 두툼한 입술 테
            t0, t1 = k / 32 * math.tau, (k + 1) / 32 * math.tau
            p0 = mc + Vector((math.sin(t0) * a, 0, math.cos(t0) * b)); p1 = mc + Vector((math.sin(t1) * a, 0, math.cos(t1) * b))
            limb(P, p0, p1, [(0, .04 * s, .04 * s), (1, .04 * s, .04 * s)], flesh2, None, segs=6)
        # 이빨 세 줄: 바깥은 길고 굽은 송곳니, 안쪽으로 갈수록 짧고 촘촘
        for row, (ln, inset, n, shrink) in enumerate(((.17, 0, 24, 0), (.1, .05, 20, .14), (.06, .1, 16, .28))):
            for k in range(n):
                t = (k + .5 + row * .3) / n * math.tau
                base = mc + Vector((math.sin(t) * a * (1 - shrink), inset * s, math.cos(t) * b * (1 - shrink)))
                L = ln * (1.15 if abs(math.cos(t)) > .7 else .9)
                tip = base + Vector((-math.sin(t) * L * .5 * s, (-.05 + row * .02) * s, -math.cos(t) * L * s))
                limb(P, base, tip, [(0, .024 * s, .024 * s), (.6, .014 * s, .014 * s), (1, .002 * s, .002 * s)], tooth, None, segs=6)
        # 깊이 박힌 작은 눈 둘 + 눈두덩 (아가리 위)
        for sx in (1, -1):
            blob(P, hc + Vector((sx * .12 * s, -.24 * s, .2 * s)), (.032 * s, .02 * s, .028 * s), eye, None, segs=8, rings=6)
            blob(P, hc + Vector((sx * .12 * s, -.23 * s, .245 * s)), (.07 * s, .04 * s, .03 * s), flesh2, None, segs=10, rings=6)
        # 입에서 가슴으로 흘러내리는 피 줄기
        for k in range(9):
            x = (k - 4) * .04 * s
            top = mc + Vector((x, -.03 * s, -b * (.92 - abs(k - 4) * .07)))
            limb(P, top, top + Vector((0, -.02 * s, -(.2 + (k % 3) * .14) * s)), [(0, .018 * s, .018 * s), (.8, .011 * s, .011 * s), (1, .016 * s, .016 * s)], blood, None, segs=5)
        ob = finish(P); bind(ob, self.arm, lambda co: {'head': smooth(co.z, 1.0 * s, 1.25 * s), 'spine': 1 - smooth(co.z, 1.0 * s, 1.25 * s)}); self.add(g, ob)
        # 짧고 굵은 팔 둘 (발톱) — 휘두르는 팔
        am = self.p['arm']
        for k in 'LR':
            sh, el, wr, hd = self.bones[f'upper_arm.{k}'][0], self.bones[f'upper_arm.{k}'][1], self.bones[f'forearm.{k}'][1], self.bones[f'hand.{k}'][1]
            P = Part(f'{g}.arm.{k}')
            limb(P, sh + Vector((0, 0, -.06)), el, [(0, .1 * am, .1 * am), (1, .085 * am, .085 * am)], flesh, None, segs=12)
            limb(P, el, wr, [(0, .085 * am, .085 * am), (1, .07 * am, .07 * am)], flesh, None, segs=12)
            blob(P, el, (.088 * am, .088 * am, .088 * am), flesh, None, segs=10, rings=7)
            blob(P, (wr + hd) / 2, (.07 * am, .075 * am, .06 * am), flesh2, None, segs=10, rings=7)
            for f in range(3):
                c = hd + Vector(((f - 1) * .03, -.03, -.02))
                limb(P, c, c + Vector(((f - 1) * .015, -.06, -.07)), [(0, .016, .016), (1, .002, .002)], tooth, None, segs=5)
            ob = finish(P); bind(ob, self.arm, autow(self.bones, ['spine', f'upper_arm.{k}', f'forearm.{k}', f'hand.{k}'], power=5)); self.add(g, ob)
        # 배 밑의 뭉툭한 다리 둘 (걸을 때 꿈틀)
        for k in 'LR':
            an = self.bones[f'shin.{k}'][1]
            P = Part(f'{g}.stub.{k}')
            top = Vector((an.x * 1.3, -.05 * s, .32 * s))
            limb(P, top, Vector((an.x * 1.4, -.08 * s, .05 * s)), [(0, .1 * s, .1 * s), (1, .085 * s, .08 * s)], flesh, None, segs=10)
            for f in range(3):
                c = Vector((an.x * 1.4 + (f - 1) * .04 * s, -.15 * s, .03 * s))
                limb(P, c + Vector((0, .04 * s, 0)), c, [(0, .02 * s, .02 * s), (1, .004 * s, .004 * s)], tooth, None, segs=5)
            ob = finish(P); bind(ob, self.arm, autow(self.bones, [f'thigh.{k}', f'shin.{k}', f'foot.{k}'], power=6)); self.add(g, ob)

    # ── 탈루스: 지옥 2층 들판의 노름꾼. 해골 위에 기운 긴 가죽 외투, 챙 넓은 모자, 붉은 목수건, 산탄 띠, 허리의 주사위 주머니 ──
    def talus_body(self, g):
        s = self.s; V = self.V
        coat = rmat('top', .85, .1); coat2 = rmat('bottom', .9, .08); dark = rmat('dark', .85, .08)
        scarf = rmat('crest', .8, .1); brass = rmat('metal', .35, .6, .7); bone = rmat('bandage', .7, .15); hat = rmat('wood', .8, .1)
        spine_w = lambda co: {'spine': smooth(co.z, .98 * s, 1.12 * s), 'hips': 1 - smooth(co.z, .98 * s, 1.12 * s)}
        self.bones_body(g)
        P = Part(g + '.coat')
        rings = []
        for z, rx, ry in ((1.47, .16, .1), (1.4, .205, .13), (1.25, .2, .135), (1.05, .19, .14), (.85, .215, .16), (.62, .24, .175), (.42, .255, .185)):
            rings.append((V(0, .02, z), Vector((0, -1, 0)), Vector((1, 0, 0)), rx * s, ry * s))
        loft(P, rings, coat, None, segs=16, caps=(False, False), matfn=None)
        # 앞섶이 벌어진 틈 (안쪽 어둠) · 깃 · 기운 자국
        limb(P, V(0, -.16, 1.36), V(0, -.2, .44), [(0, .03, .012), (.5, .05, .012), (1, .07, .012)], dark, None, segs=4)
        for sx in (1, -1):
            limb(P, V(sx * .06, -.11, 1.45), V(sx * .13, -.13, 1.3), [(0, .03, .012), (1, .045, .012)], coat2, None, segs=4)
        for (x, y, z, r) in ((.15, -.08, 1.1, .045), (-.17, .04, .75, .05), (.12, .1, .6, .04)):
            blob(P, V(x, y, z), (r * s, r * .5 * s, r * s), coat2, None, segs=8, rings=5)
        # 산탄 띠: 왼어깨에서 오른허리로, 놋쇠 탄피가 줄지어
        a, b = V(-.13, -.11, 1.42), V(.15, -.15, .98)
        limb(P, a, b, [(0, .022, .01), (1, .022, .01)], dark, None, segs=4)
        for k in range(7):
            t = (k + .5) / 7; c = a + (b - a) * t + Vector((0, -.012 * s, 0))
            limb(P, c - Vector((0, 0, .014 * s)), c + Vector((0, 0, .014 * s)), [(0, .011, .011), (1, .011, .011)], brass, None, segs=5)
        # 허리띠와 뼈주사위 주머니
        limb(P, V(0, 0, .99), V(0, 0, .94), [(0, .2 * s, .15 * s), (1, .2 * s, .15 * s)], dark, None, segs=14)
        blob(P, V(-.17, -.08, .9), (.04 * s, .03 * s, .05 * s), coat2, None, segs=8, rings=6)
        for k in range(2):
            blob(P, V(-.17 + k * .03, -.12, .86), (.014 * s, .014 * s, .014 * s), bone, None, segs=6, rings=4)
        ob = finish(P); bind(ob, self.arm, spine_w); self.add(g, ob)
        # 챙 넓은 모자 + 붉은 목수건 (머리에 붙는다)
        hc = V(0, -.005, 1.615)
        P = Part(g + '.hat')
        limb(P, hc + Vector((0, 0, .085 * s)), hc + Vector((0, 0, .1 * s)), [(0, .2 * s, .19 * s), (1, .19 * s, .18 * s)], hat, None, segs=20)   # 챙
        limb(P, hc + Vector((0, .005 * s, .095 * s)), hc + Vector((0, .01 * s, .2 * s)), [(0, .095 * s, .1 * s), (.7, .09 * s, .095 * s), (1, .07 * s, .075 * s)], hat, None, segs=16)   # 머리통
        limb(P, hc + Vector((0, .005 * s, .11 * s)), hc + Vector((0, .006 * s, .13 * s)), [(0, .098 * s, .103 * s), (1, .097 * s, .102 * s)], scarf, None, segs=16)   # 모자 띠
        blob(P, hc + Vector((.06 * s, -.07 * s, .12 * s)), (.012 * s, .006 * s, .012 * s), bone, None, segs=6, rings=4)   # 띠에 꽂은 작은 주사위
        limb(P, hc + Vector((0, -.01 * s, -.1 * s)), hc + Vector((0, .01 * s, -.14 * s)), [(0, .075 * s, .07 * s), (1, .085 * s, .08 * s)], scarf, None, segs=14)   # 목수건
        limb(P, hc + Vector((.02 * s, .07 * s, -.12 * s)), hc + Vector((.05 * s, .12 * s, -.24 * s)), [(0, .03 * s, .01 * s), (1, .02 * s, .008 * s)], scarf, None, segs=4)   # 늘어진 끝
        ob = finish(P); bind(ob, self.arm, lambda co: {'head': 1.0}); self.add(g, ob)

    # ── 경비병 (지옥 휴식 마을의 중립 NPC) ──
    def warden_body(self, g, name):
        s = self.s; V = self.V
        flesh = rmat('skin', .7, .2); cloth = rmat('top', .9, .08); cloth2 = rmat('bottom', .9, .08); dark = rmat('dark', .85, .08)
        glow = rmat('crest', .3, .7); metal = rmat('metal', .35, .6, .7); bone = rmat('bandage', .7, .15); wood = rmat('wood', .6, .2)
        spine_w = lambda co: {'spine': smooth(co.z, .98 * s, 1.12 * s), 'hips': 1 - smooth(co.z, .98 * s, 1.12 * s)}
        hc = V(0, -.005, 1.615)
        if name == 'warden1':
            # B01 재문지기: 재가 묻은 해골 + 낡은 회색 망토(어깨에서 무릎 아래까지, 앞이 갈라짐) + 허리의 작은 돌문 열쇠
            self.bones_body(g)
            P = Part(g + '.cloak')
            rings = []
            for z, rx, ry in ((1.47, .15, .1), (1.4, .2, .13), (1.25, .215, .145), (1.05, .225, .155), (.85, .24, .17), (.62, .26, .185), (.5, .265, .19)):
                rings.append((V(0, .02, z), Vector((0, -1, 0)), Vector((1, 0, 0)), rx * s, ry * s))
            loft(P, rings, cloth, None, segs=16, caps=(False, False), matfn=None)
            # 해진 밑단 자락
            for k in range(9):
                a = (k / 9) * math.tau
                top = V(math.cos(a) * .25, .02 + math.sin(a) * .18, .52)
                limb(P, top, top + Vector((0, 0, -(.06 + (k % 3) * .04) * s)), [(0, .04, .015), (1, .025, .008)], cloth, None, segs=4)
            # 어깨에 내려앉은 두건
            limb(P, V(0, .07, 1.48), V(0, .1, 1.38), [(0, .11 * s, .07 * s), (1, .14 * s, .08 * s)], cloth2, None, segs=12)
            # 허리끈과 작은 돌문 열쇠
            limb(P, V(0, 0, .98), V(0, 0, .93), [(0, .2 * s, .14 * s), (1, .2 * s, .14 * s)], dark, None, segs=14)
            limb(P, V(.12, -.12, .95), V(.13, -.13, .82), [(0, .012, .012), (1, .012, .012)], metal, None, segs=5)
            blob(P, V(.13, -.13, .8), (.03 * s, .012 * s, .03 * s), metal, None, segs=8, rings=5)
            ob = finish(P); bind(ob, self.arm, spine_w); self.add(g, ob)
        elif name == 'warden2':
            # B02 빈그릇귀: 늪빛 피부의 덩치 큰 악마. 배가 텅 빈 그릇처럼 패였고 휜 갈비뼈가 그 둘레를 감싼다. 왼팔엔 진흙 사발
            def bulk(rings):
                out = []
                for c, u, v, rs, rf in rings:
                    z = c.z / s
                    k = 1.18 if 1.0 < z < 1.4 else 1.05
                    out.append((c, u, v, rs * k + .01, rf * k * 1.1 + .01))
                return out
            self.torso(g, flesh, cloth, hem=.96, extra=bulk)
            self.arms(g, None); self.hands(g); self.legs(g, flesh, dark, foot=1.1)
            P = Part(g + '.hollow')
            blob(P, V(0, -.155, 1.1), (.105 * s, .035 * s, .13 * s), dark, None, segs=14, rings=10)   # 텅 빈 배 (패인 그릇)
            for k in range(5):   # 그릇 둘레로 휜 갈비뼈
                z = 1.3 - k * .055
                for sx in (1, -1):
                    limb(P, V(sx * .02, -.13, z + .02), V(sx * .13, -.13, z - .03), [(0, .014, .014), (.5, .016, .016), (1, .012, .012)], bone, None, segs=5)
            limb(P, V(0, 0, .97), V(0, 0, .86), [(0, .16 * s, .12 * s), (1, .17 * s, .13 * s)], cloth, None, segs=12)   # 허리천
            limb(P, V(0, -.13, .9), V(0, -.14, .64), [(0, .07, .014), (1, .06, .01)], cloth, None, segs=5)
            ob = finish(P); bind(ob, self.arm, spine_w); self.add(g, ob)
            # 왼팔 진흙 사발: 팔뚝에 동여맨 큰 사발, 안쪽은 비어 있다
            el, wr = self.bones['forearm.L'][0], self.bones['forearm.L'][1]
            c = el + (wr - el) * .5 + Vector((.075, -.01, 0))
            P = Part(g + '.bowl')
            blob(P, c, (.06 * s, .17 * s, .17 * s), wood, None, segs=16, rings=10)
            blob(P, c + Vector((.035, 0, 0)), (.035 * s, .14 * s, .14 * s), dark, None, segs=14, rings=9)
            limb(P, c + Vector((.04, 0, .16 * s)), c + Vector((.04, 0, -.16 * s)), [(0, .012, .012), (1, .012, .012)], bone, None, segs=4)   # 사발 테 금
            for t in (.3, .7):
                limb(P, el + (wr - el) * t + Vector((-.03, 0, 0)), el + (wr - el) * t + Vector((.08, 0, 0)), [(0, .05, .05), (1, .05, .05)], cloth, None, segs=10)   # 동여맨 끈
            ob = finish(P); bind(ob, self.arm, rigid('forearm.L')); self.add(g, ob)
            P = Part(g + '.head')
            hh = hc + Vector((0, -.03 * s, -.03 * s))
            blob(P, hh, (.085 * s, .095 * s, .1 * s), flesh, None, segs=14, rings=10)
            for sx in (1, -1):
                blob(P, hh + Vector((sx * .035 * s, -.085 * s, .015 * s)), (.022 * s, .012 * s, .014 * s), glow, None, segs=8, rings=5)
            blob(P, hh + Vector((0, -.09 * s, -.045 * s)), (.045 * s, .012 * s, .018 * s), dark, None, segs=8, rings=5)   # 넓은 입
            ob = finish(P); self.scale_head(ob); bind(ob, self.arm, lambda co: {'head': 1.0}); self.add(g, ob)
        else:
            # B03 봉랍귀: 붉은 봉랍처럼 굳은 얼굴, 검은 상인복(발목까지), 금 허리띠, 붉은 밀랍 인장 지팡이(무기)
            self.torso(g, cloth, cloth, hem=1.0)
            self.arms(g, cloth, 1.85, cuff=True); self.hands(g); self.legs(g, cloth2, dark)
            P = Part(g + '.robe')
            rings = []
            for z, rx, ry in ((1.0, .16, .115), (.8, .18, .13), (.55, .2, .145), (.3, .215, .155), (.12, .225, .16)):
                rings.append((V(0, .005, z), Vector((0, -1, 0)), Vector((1, 0, 0)), rx * s, ry * s))
            loft(P, rings, cloth, None, segs=16, caps=(False, False), matfn=None)
            limb(P, V(0, 0, 1.0), V(0, 0, .95), [(0, .165 * s, .12 * s), (1, .165 * s, .12 * s)], metal, None, segs=14)   # 금 허리띠
            limb(P, V(0, -.02, 1.44), V(0, -.02, 1.38), [(0, .1 * s, .08 * s), (1, .13 * s, .1 * s)], cloth2, None, segs=12)   # 높은 깃
            for k in range(4): blob(P, V(0, -.125, 1.3 - k * .08), (.012 * s, .008 * s, .012 * s), metal, None, segs=6, rings=4)   # 금단추
            ob = finish(P); bind(ob, self.arm, lambda co: {'spine': smooth(co.z, .98 * s, 1.12 * s), 'hips': 1 - smooth(co.z, .98 * s, 1.12 * s)}); self.add(g, ob)
            P = Part(g + '.neck')
            limb(P, V(0, .005, 1.4), V(0, .005, 1.53), [(0, .05 * s, .048 * s), (1, .045 * s, .044 * s)], flesh, None)
            ob = finish(P); bind(ob, self.arm, lambda co: {'neck': 1.0}); self.add(g, ob)
            P = Part(g + '.head')
            blob(P, hc, (.09 * s, .1 * s, .118 * s), flesh, None, segs=14, rings=10)
            for sx in (1, -1):
                limb(P, hc + Vector((sx * .015 * s, -.094 * s, .015 * s)), hc + Vector((sx * .055 * s, -.085 * s, .02 * s)), [(0, .008, .006), (1, .007, .005)], dark, None, segs=4)   # 가는 눈 틈
                blob(P, hc + Vector((sx * .035 * s, -.1 * s, .018 * s)), (.007 * s, .004 * s, .005 * s), glow, None, segs=6, rings=4)
            for k in range(6):   # 녹아 흘러내린 밀랍
                a = (k / 6) * math.tau
                root = hc + Vector((math.cos(a) * .08 * s, math.sin(a) * .08 * s, -.02 * s))
                limb(P, root, root + Vector((0, 0, -(.05 + (k % 3) * .03) * s)), [(0, .014, .014), (1, .009, .009)], flesh, None, segs=5)
            limb(P, hc + Vector((-.03 * s, -.1 * s, -.05 * s)), hc + Vector((.03 * s, -.1 * s, -.05 * s)), [(0, .006, .006), (1, .006, .006)], dark, None, segs=4)
            ob = finish(P); self.scale_head(ob); bind(ob, self.arm, lambda co: {'head': 1.0}); self.add(g, ob)

    # ── 유황새의 앵무새: 사람만 한 유황앵무가 두 발로 선다. 흰 깃털 몸, 접은 날개, 노란 볏, 검은 부리, 회색 비늘 다리 ──
    def cockatoo_body(self, g):
        s = self.s; V = self.V
        fw = rmat('parrot', .85, .15); crest = rmat('crest', .7, .25); beak = rmat('dark', .45, .45); leg = rmat('shoe', .75, .2); eye = rmat('eye', .25, .7)
        wt = lambda co: {'spine': smooth(co.z, .98 * s, 1.12 * s), 'hips': 1 - smooth(co.z, .98 * s, 1.12 * s)}
        P = Part(g + '.body')
        blob(P, V(0, -.03, 1.13), (.19 * s, .19 * s, .3 * s), fw, None, segs=18, rings=12)   # 가슴이 불룩한 몸
        blob(P, V(0, .01, .93), (.16 * s, .16 * s, .15 * s), fw, None, segs=16, rings=10)    # 배
        for k in range(5):   # 가슴 깃 겹 (아래로 갈수록 작게)
            blob(P, V(0, -.16 + k * .012, 1.28 - k * .07), (.13 * s - k * .008, .04 * s, .05 * s), fw, None, segs=10, rings=6)
        # 꼬리: 엉덩이에서 뒤아래로 넓게 펴진 깃
        for sx in (-1, 0, 1):
            limb(P, V(sx * .03, .12, .98), V(sx * .07, .34, .58), [(0, .06 * s, .03 * s), (.6, .07 * s, .02 * s), (1, .045 * s, .012 * s)], fw, None, segs=8)
        ob = finish(P); bind(ob, self.arm, wt); self.add(g, ob)
        # 날개: 어깨에서 접혀 몸 옆을 덮고, 끝깃이 엉덩이 아래까지
        for k, sx in (('L', 1), ('R', -1)):
            b = self.bones
            sh, el = b[f'upper_arm.{k}'][0], b[f'upper_arm.{k}'][1]
            wr, hd = b[f'forearm.{k}'][1], b[f'hand.{k}'][1]
            P = Part(f'{g}.wing.{k}')
            limb(P, sh + Vector((0, .02, .02)), el, [(0, .07 * s, .09 * s), (1, .055 * s, .1 * s)], fw, None, segs=10)
            limb(P, el, wr, [(0, .055 * s, .1 * s), (1, .04 * s, .08 * s)], fw, None, segs=10)
            limb(P, wr, hd + (hd - wr) * 1.6, [(0, .04 * s, .07 * s), (1, .012 * s, .03 * s)], fw, None, segs=8)   # 끝깃
            for t in (.3, .6):   # 깃 끝선 (아래쪽 노란 기운)
                limb(P, el + (wr - el) * t + Vector((sx * .03, .03, -.02)), el + (wr - el) * t + Vector((sx * .035, .06, -.12)), [(0, .016, .016), (1, .006, .006)], crest, None, segs=5)
            ob = finish(P); bind(ob, self.arm, autow(self.bones, ['spine', f'upper_arm.{k}', f'forearm.{k}', f'hand.{k}'], power=5)); self.add(g, ob)
        # 다리: 허벅지는 깃털 바지, 정강이부터 회색 비늘, 발가락은 앞 둘 · 뒤 둘
        for k in 'LR':
            b = self.bones
            hp, kn = b[f'thigh.{k}'][0], b[f'thigh.{k}'][1]
            an = b[f'shin.{k}'][1]
            P = Part(f'{g}.leg.{k}')
            limb(P, hp + Vector((0, 0, .04)), kn + Vector((0, 0, .04)), [(0, .1 * s, .1 * s), (.6, .085 * s, .085 * s), (1, .05 * s, .05 * s)], fw, None, segs=12)
            limb(P, kn, an + Vector((0, 0, .02)), [(0, .03 * s, .03 * s), (1, .024 * s, .024 * s)], leg, None, segs=8)
            for r in range(5): limb(P, kn + (an - kn) * (r / 5 + .08), kn + (an - kn) * (r / 5 + .12), [(0, .033 * s, .033 * s), (1, .031 * s, .031 * s)], leg, None, segs=8)
            ob = finish(P); bind(ob, self.arm, autow(self.bones, ['hips', f'thigh.{k}', f'shin.{k}'], power=5)); self.add(g, ob)
            P = Part(f'{g}.toes.{k}')
            base = Vector((an.x, an.y, .03 * s))
            for dx, dy in ((-.035, -.11), (.035, -.11), (-.03, .08), (.03, .08)):
                tip = base + Vector((dx * s, dy * s, -.015 * s))
                limb(P, base, tip, [(0, .018 * s, .018 * s), (1, .01 * s, .01 * s)], leg, None, segs=6)
                blob(P, tip + Vector((0, (-.012 if dy < 0 else .012) * s, -.006 * s)), (.008 * s, .014 * s, .008 * s), beak, None, segs=6, rings=4)   # 발톱
            ob = finish(P); bind(ob, self.arm, autow(self.bones, [f'shin.{k}', f'foot.{k}'], power=8)); self.add(g, ob)
        # 목과 머리: 둥근 흰 머리, 갈고리 부리, 검은 눈, 뒤로 솟은 노란 볏
        P = Part(g + '.neck')
        limb(P, V(0, -.01, 1.36), V(0, -.02, 1.56), [(0, .11 * s, .11 * s), (1, .085 * s, .085 * s)], fw, None, segs=12)
        ob = finish(P); bind(ob, self.arm, lambda co: {'neck': 1.0}); self.add(g, ob)
        hc = V(0, -.03, 1.63)
        P = Part(g + '.head')
        blob(P, hc, (.105 * s, .115 * s, .11 * s), fw, None, segs=16, rings=11)
        blob(P, hc + Vector((0, -.1 * s, -.025 * s)), (.045 * s, .05 * s, .055 * s), beak, None, segs=10, rings=7)   # 윗부리
        limb(P, hc + Vector((0, -.13 * s, -.03 * s)), hc + Vector((0, -.15 * s, -.085 * s)), [(0, .025 * s, .025 * s), (1, .006 * s, .006 * s)], beak, None, segs=6)   # 갈고리
        blob(P, hc + Vector((0, -.09 * s, -.07 * s)), (.032 * s, .035 * s, .02 * s), beak, None, segs=8, rings=5)   # 아랫부리
        for sx in (1, -1):
            blob(P, hc + Vector((sx * .062 * s, -.055 * s, .02 * s)), (.016 * s, .014 * s, .017 * s), eye, None, segs=8, rings=5)
        for k in range(7):   # 볏: 머리 위에서 뒤로 휘어 솟는 노란 깃
            a = (k - 3) * .022
            base = hc + Vector((a * s, .0 + k * .006, .09 * s))
            tip = base + Vector((a * 1.6 * s, (.1 + abs(k - 3) * .012) * s, (.17 - abs(k - 3) * .02) * s))
            limb(P, base, tip, [(0, .02 * s, .012 * s), (1, .004 * s, .004 * s)], crest, None, segs=5)
        ob = finish(P); bind(ob, self.arm, lambda co: {'head': 1.0}); self.add(g, ob)

    # ── 대부업자 베스크: 붉은 피부, 대머리, 아주 뚱뚱한 몸, 금 장신구 가득, 손에 장부 ──
    def besk_body(self, g):
        s = self.s; V = self.V
        flesh = rmat('skin', .7, .2); cloth = rmat('top', .9, .08); gold = rmat('metal', .25, .7, .7); dark = rmat('dark', .85, .08)
        def fat(rings):
            out = []
            for c, u, v, rs, rf in rings:
                z = c.z / s
                k = 1.0 + max(0, 1 - abs(z - 1.1) / .3) * .55
                out.append((c, u, v, rs * k + .02, rf * k * 1.15 + .03))
            return out
        self.torso(g, flesh, cloth, hem=1.0, extra=fat)
        self.arms(g, None); self.hands(g); self.legs(g, cloth, dark, bare_below=None)
        P = Part(g + '.gold')
        blob(P, V(0, -.12, 1.08), (.2 * s, .17 * s, .2 * s), flesh, None, segs=16, rings=12)   # 배
        limb(P, V(0, 0, 1.0), V(0, 0, .92), [(0, .3 * s, .29 * s), (1, .3 * s, .29 * s)], gold, None, segs=18)   # 금 허리띠
        # 겹겹 금목걸이: 가슴 앞 표면을 따라 늘어진 구슬 세 줄 + 큰 메달
        for k in range(3):
            sag, z0 = .1 + k * .045, 1.42 - k * .015
            for n in range(11):
                t = n / 5 - 1
                x = t * (.13 + k * .02)
                z = z0 - (1 - t * t) * sag
                y = -.2 - (1 - t * t) * (.05 + k * .015)
                blob(P, V(x, y, z), (.02, .016, .02), gold, None, segs=6, rings=4)
        blob(P, V(0, -.29, 1.19), (.05, .02, .055), gold, None, segs=10, rings=6)
        ob = finish(P); bind(ob, self.arm, lambda co: {'spine': smooth(co.z, .98 * s, 1.12 * s), 'hips': 1 - smooth(co.z, .98 * s, 1.12 * s)}); self.add(g, ob)
        for k in 'LR':
            el, wr = self.bones[f'forearm.{k}'][0], self.bones[f'forearm.{k}'][1]
            P = Part(f'{g}.bangle.{k}')
            for t in (.55, .7, .84):
                limb(P, el + (wr - el) * t, el + (wr - el) * (t + .07), [(0, .085, .085), (1, .083, .083)], gold, None, segs=12)
            ob = finish(P); bind(ob, self.arm, rigid(f'forearm.{k}')); self.add(g, ob)
        hc = V(0, -.005, 1.615)
        P = Part(g + '.head')
        blob(P, hc, (.1 * s, .105 * s, .11 * s), flesh, None, segs=14, rings=10)   # 대머리
        blob(P, hc + Vector((0, -.04 * s, -.085 * s)), (.085 * s, .07 * s, .045 * s), flesh, None, segs=12, rings=8)   # 겹턱
        for sx in (1, -1):
            blob(P, hc + Vector((sx * .036 * s, -.092 * s, .015 * s)), (.014 * s, .008 * s, .008 * s), dark, None, segs=6, rings=4)
            blob(P, hc + Vector((sx * .102 * s, 0, -.03 * s)), (.012 * s, .012 * s, .012 * s), gold, None, segs=6, rings=4)   # 금 귀걸이
        limb(P, hc + Vector((-.035 * s, -.1 * s, -.045 * s)), hc + Vector((.035 * s, -.1 * s, -.045 * s)), [(0, .006, .006), (1, .006, .006)], dark, None, segs=4)   # 입
        ob = finish(P); bind(ob, self.arm, lambda co: {'head': 1.0}); self.add(g, ob)

    # ── 40차: 긴 겉옷 — 바지를 무엇을 입든 위옷이 보인다 (작은 사람이라 위옷의 실루엣이 곧 차림) ──
    def long_body(self, g, main, hem=.5, flare=1.0, grow=1.13, cuff=None, sleeve_w=1.0):
        """넉넉한 몸통 · 손목까지 오는 소매 · 엉덩이부터 hem 높이까지 내려오는 자락(걸으면 허벅지를 따라 밀린다)"""
        s, bw, V = self.s, self.bw, self.V
        def fit(rings):
            return [(c, u, v, rs * grow + .014, rf * (grow + .06) + .016) for c, u, v, rs, rf in rings if c.z / s >= .9]
        self.torso(g, main, main, hem=0, extra=fit)
        am = self.p['arm'] * bw * sleeve_w
        for k in 'LR':
            sh, el = self.bones[f'upper_arm.{k}'][0], self.bones[f'upper_arm.{k}'][1]
            wr = self.bones[f'forearm.{k}'][1]
            P = Part(f'{g}.sleeve.{k}')
            limb(P, sh + Vector((0, 0, .02)), el, [(0, .077 * am, .077 * am), (1, .063 * am, .063 * am)], main, None)
            limb(P, el, wr - (wr - el) * .05, [(0, .061 * am, .061 * am), (1, .057 * am, .057 * am)], main, None)
            blob(P, el, (.063 * am, .063 * am, .063 * am), main, None, segs=10, rings=7)
            blob(P, sh + Vector((0, 0, .02)), (.086 * am, .08 * am, .072 * am), main, None, segs=12, rings=8)
            if cuff is not None:
                limb(P, wr - (wr - el) * .17, wr - (wr - el) * .05, [(0, .063 * am, .063 * am), (1, .063 * am, .063 * am)], cuff, None, segs=10)
            ob = finish(P); bind(ob, self.arm, autow(self.bones, ['spine', f'upper_arm.{k}', f'forearm.{k}'], power=5)); self.add(g, ob)
        def skirt_w(co):
            h = (1 - smooth(co.z, .5 * s, 1.0 * s)) * .58
            wl = smooth(co.x, -.07 * s, .07 * s)
            return {'hips': 1 - h, 'thigh.L': h * wl, 'thigh.R': h * (1 - wl)}
        zs = [1.02, .92, .82, .72, .62, .52, .44, .36]
        zs = [z for z in zs if z > hem + .02] + [hem]
        def rad(z):
            t = 1.02 - z
            return .19 + t * .07 * flare, .15 + t * .05 * flare
        rings = []
        for z in zs:
            rx, ry = rad(z)
            rings.append((V(0, .005, z), Vector((0, -1, 0)), Vector((1, 0, 0)), rx * s * bw + .022, ry * s + .026))
        P = Part(g + '.skirt')
        loft(P, rings, main, None, segs=18, caps=(False, False))
        ob = finish(P); bind(ob, self.arm, skirt_w); self.add(g, ob)
        return skirt_w, rad

    def torso_r(self, z, grow=1.13, add=0.0):
        """몸통 표 사이를 이어 z 높이의 (옆 반지름, 앞 반지름, 앞뒤 중심) — long_body 몸통과 같은 부풀림"""
        T = TORSO[self.torso_key]; s, bw = self.s, self.bw
        for (z0, rx0, ry0, c0), (z1, rx1, ry1, c1) in zip(T, T[1:]):
            if z0 <= z <= z1:
                t = (z - z0) / (z1 - z0); rx, ry, cy = rx0 + (rx1 - rx0) * t, ry0 + (ry1 - ry0) * t, c0 + (c1 - c0) * t
                break
        else:
            z0, rx, ry, cy = T[-1] if z > T[-1][0] else T[0]
        return rx * s * bw * grow + .014 + add, ry * s * (bw * .5 + .5) * (grow + .06) + .016 + add, cy * s

    def torso_band(self, P, z, mat, grow=1.13, h=.03, add=.008):
        rx, ry, cy = self.torso_r(z, grow, add)
        V = self.V
        loft(P, [(Vector((0, cy, (z - h / 2) * self.s)), Vector((0, -1, 0)), Vector((1, 0, 0)), rx, ry), (Vector((0, cy, (z + h / 2) * self.s)), Vector((0, -1, 0)), Vector((1, 0, 0)), rx, ry)], mat, None, segs=18, caps=(False, False))

    def ring_band(self, P, z, mat, rad, h=.018, out=.004):
        """자락·몸통을 두르는 띠 (z 높이, rad(z) → (rx, ry))"""
        s, bw, V = self.s, self.bw, self.V
        rx, ry = rad(z)
        a = rx * s * bw + .022 + out; b = ry * s + .026 + out
        loft(P, [(V(0, .005, z - h / 2), Vector((0, -1, 0)), Vector((1, 0, 0)), a, b), (V(0, .005, z + h / 2), Vector((0, -1, 0)), Vector((1, 0, 0)), a, b)], mat, None, segs=18, caps=(False, False))

    def long_armor(self, g, piece, main, dark, metal):
        s, bw, V = self.s, self.bw, self.V
        fy = -(.152 if self.sex == 'm' else .17) * bw   # 가슴 앞면
        upper = lambda co: ({'neck': smooth(co.z, 1.42 * s, 1.48 * s), 'spine': 1 - smooth(co.z, 1.42 * s, 1.48 * s)} if co.z > 1.08 * s else {'spine': smooth(co.z, .98 * s, 1.12 * s), 'hips': 1 - smooth(co.z, .98 * s, 1.12 * s)})
        def collar(P, mat, hi=1.49, r0=.096, r1=.086):
            limb(P, V(0, 0, 1.4), V(0, 0, hi), [(0, r0 * s * bw, r0 * .92 * s), (1, r1 * s * bw, r1 * .92 * s)], mat, None, segs=14, caps=(False, False))
        if piece == 'trench':
            # 롱 코트: 무릎 아래까지, 허리띠와 버클, 넓은 깃(라펠), 두 줄 단추, 어깨 견장, 소매 끈
            skw, rad = self.long_body(g, main, hem=.42, flare=1.15, grow=1.12, cuff=dark)
            P = Part(g + '.belt')
            self.ring_band(P, 1.0, dark, lambda z: (.205, .158), h=.04, out=.008)
            blob(P, V(0, -.19 * bw, 1.0), (.028 * s, .014 * s, .026 * s), metal, None, segs=8, rings=5)   # 버클
            ob = finish(P); bind(ob, self.arm, lambda co: {'spine': .3, 'hips': .7}); self.add(g, ob)
            P = Part(g + '.front')
            collar(P, main, 1.5, .104, .094)
            for sx in (1, -1):
                limb(P, V(sx * .04 * bw, fy - .006, 1.39), V(sx * .1 * bw, fy - .004, 1.2), [(0, .05 * s, .01 * s), (1, .018 * s, .008 * s)], main, None, segs=6)   # 라펠
                for z in (1.27, 1.17, 1.08):
                    blob(P, V(sx * .058 * bw, fy - .01, z), (.011 * s, .008 * s, .011 * s), dark, None, segs=6, rings=4)   # 두 줄 단추
                limb(P, V(sx * .1 * bw, 0, 1.43), V(sx * .19 * bw, 0, 1.42), [(0, .022 * s, .012 * s), (1, .022 * s, .012 * s)], dark, None, segs=6)   # 견장
            ob = finish(P); bind(ob, self.arm, upper); self.add(g, ob)
            return
        if piece == 'firesuit':
            # 방화복: 허벅지 중간까지, 가슴·허리·자락 끝·소매에 두른 반사띠(빛나는 노랑), 높이 세운 깃과 덮개, 앞을 덮는 어두운 여밈판
            refl = rmat('bandage', .25, .7, tag='armor')   # 은빛 반사띠
            skw, rad = self.long_body(g, main, hem=.72, flare=.9, grow=1.2, sleeve_w=1.12)
            P = Part(g + '.bands')
            self.ring_band(P, .78, refl, rad, h=.032)
            self.ring_band(P, .86, refl, rad, h=.014)
            ob = finish(P); bind(ob, self.arm, skw); self.add(g, ob)
            P = Part(g + '.chest')
            for z in (1.25, 1.07):
                self.torso_band(P, z, refl, grow=1.2, h=.032)
            collar(P, dark, 1.53, .108, .1)
            limb(P, V(0, fy - .02, 1.42), V(0, fy - .03, .74), [(0, .036 * s, .01 * s), (1, .036 * s, .01 * s)], dark, None, segs=6)   # 여밈판
            ob = finish(P); bind(ob, self.arm, lambda co: upper(co) if co.z > 1.0 * s else skw(co)); self.add(g, ob)
            am = self.p['arm'] * bw * 1.12
            for k in 'LR':
                el, wr = self.bones[f'forearm.{k}'][0], self.bones[f'forearm.{k}'][1]
                P = Part(f'{g}.cuffband.{k}')
                for t in (.55, .72):
                    c = el + (wr - el) * t
                    limb(P, c - (wr - el) * .04, c + (wr - el) * .04, [(0, .066 * am, .066 * am), (1, .066 * am, .066 * am)], refl, None, segs=10)
                ob = finish(P); bind(ob, self.arm, rigid(f'forearm.{k}')); self.add(g, ob)
            return
        if piece == 'combatcoat':
            # 방탄 전투복: 허벅지 중간까지 오는 전투 상의 + 앞뒤 방탄판을 넣은 조끼 · 어깨 보호대 · 허리 띠와 주머니 · 세운 깃
            skw, rad = self.long_body(g, main, hem=.76, flare=.85, grow=1.15, cuff=dark)
            P = Part(g + '.carrier')
            limb(P, V(0, fy - .02, 1.37), V(0, fy - .028, 1.06), [(0, .15 * bw * s, .03 * s), (1, .145 * bw * s, .032 * s)], dark, None, segs=6)   # 앞판
            limb(P, V(0, .118 * bw, 1.37), V(0, .12 * bw, 1.08), [(0, .15 * bw * s, .028 * s), (1, .145 * bw * s, .028 * s)], dark, None, segs=6)   # 뒤판
            for sx in (1, -1):
                limb(P, V(sx * .09, -.1, 1.41), V(sx * .09, .1, 1.41), [(0, .034 * s, .014 * s), (1, .034 * s, .014 * s)], dark, None, segs=5)   # 어깨끈
            for k2 in range(3):
                x = (k2 - 1) * .09 * bw
                limb(P, V(x, fy - .04, 1.1), V(x, fy - .04, 1.22), [(0, .038 * bw * s, .024 * s), (1, .038 * bw * s, .024 * s)], main, None, segs=6)   # 탄창 주머니
                limb(P, V(x, fy - .046, 1.21), V(x, fy - .046, 1.235), [(0, .04 * bw * s, .026 * s), (1, .04 * bw * s, .026 * s)], dark, None, segs=6)
            collar(P, main, 1.5)
            ob = finish(P); bind(ob, self.arm, upper); self.add(g, ob)
            P = Part(g + '.belt')
            self.ring_band(P, 1.0, dark, lambda z: (.2, .155), h=.045, out=.01)
            for sx in (1, -1):
                blob(P, V(sx * .16 * bw, -.08, .98), (.04 * s, .03 * s, .045 * s), dark, None, segs=8, rings=6)   # 허리 주머니
            ob = finish(P); bind(ob, self.arm, lambda co: {'spine': .3, 'hips': .7}); self.add(g, ob)
            am = self.p['arm'] * bw
            for k in 'LR':
                sh = self.bones[f'upper_arm.{k}'][0]
                P = Part(f'{g}.pad.{k}')
                blob(P, sh + Vector((0, 0, .03)), (.096 * am, .09 * am, .072 * am), dark, None, segs=12, rings=8, cut=lambda co, z0=sh.z: co.z < z0 - .035)   # 어깨 보호대
                ob = finish(P); bind(ob, self.arm, autow(self.bones, ['spine', f'upper_arm.{k}'], power=5)); self.add(g, ob)
            return
        if piece == 'hauberk':
            # 사슬 장포: 무릎까지 오는 쇠사슬 옷(쇠 빛) 위에 앞뒤로 늘어뜨린 천 겉옷(층마다 색) · 허리띠 · 사슬 두건 깃
            mail = rmat('metal', .45, .45, .6, tag='armor')
            skw, rad = self.long_body(g, mail, hem=.5, flare=1.0, grow=1.12)
            P = Part(g + '.tabard')
            F, Sd = Vector((0, -1, 0)), Vector((1, 0, 0))
            for side in (-1, 1):   # 앞 · 뒤 천: 사슬 옷 겉면에 바짝 붙어 늘어진다
                rings = []
                for z in (1.38, 1.2, 1.02, .9, .72, .53):
                    if z >= 1.0:
                        rx, ry, cy = self.torso_r(z, 1.12, .006)
                        y = cy + side * ry
                    else:
                        rx, ry = rad(z)
                        y = .005 * s + side * (ry * s + .026 + .006)
                    rings.append((Vector((0, y, z * s)), F, Sd, (.12 if z > 1.25 else .14) * bw * s, .007 * s))
                loft(P, rings, main, None, segs=8)
            ob = finish(P); bind(ob, self.arm, lambda co: upper(co) if co.z > 1.0 * s else {'hips': 1.0}); self.add(g, ob)
            P = Part(g + '.belt')
            self.ring_band(P, 1.0, dark, lambda z: (.205, .16), h=.04, out=.012)
            blob(P, V(0, -.2 * bw, 1.0), (.03 * s, .014 * s, .03 * s), metal, None, segs=8, rings=5)
            ob = finish(P); bind(ob, self.arm, lambda co: {'spine': .3, 'hips': .7}); self.add(g, ob)
            P = Part(g + '.coif')
            limb(P, V(0, .005, 1.39), V(0, .005, 1.5), [(0, .13 * s * bw, .12 * s), (.6, .1 * s * bw, .095 * s), (1, .088 * s * bw, .085 * s)], mail, None, segs=14, caps=(False, False))   # 사슬 깃
            ob = finish(P); bind(ob, self.arm, upper); self.add(g, ob)
            return
        # platecoat — 판금 장갑: 가슴판 · 둥근 어깨 갑 · 목 가리개 · 엉덩이부터 허벅지를 덮는 쇠 비늘판(태싯) · 그 아래로 무릎까지 늘어진 장의(층마다 색)
        plate = rmat('metal', .3, .6, .75, tag='armor')
        skw, rad = self.long_body(g, main, hem=.4, flare=1.25, grow=1.12, cuff=plate)
        P = Part(g + '.cuirass')
        cr = []
        for z in (1.0, 1.1, 1.2, 1.3, 1.38, 1.43):
            rx, ry, cy = self.torso_r(z, 1.12, .022 if z < 1.42 else .012)
            cr.append((Vector((0, cy, z * s)), Vector((0, -1, 0)), Vector((1, 0, 0)), rx, ry))
        loft(P, cr, plate, None, segs=18, caps=(False, False))
        limb(P, V(0, .0, 1.41), V(0, .0, 1.5), [(0, .11 * s * bw, .1 * s), (1, .095 * s * bw, .088 * s)], plate, None, segs=14, caps=(False, False))   # 목 가리개
        limb(P, V(0, fy - .03, 1.36), V(0, fy - .036, 1.06), [(0, .012 * s, .008 * s), (1, .012 * s, .008 * s)], dark, None, segs=5)   # 가슴 가운데 능선
        ob = finish(P); bind(ob, self.arm, upper); self.add(g, ob)
        P = Part(g + '.tassets')
        for row, (z0, z1) in enumerate(((1.0, .86), (.88, .74), (.76, .62))):   # 겹친 쇠 비늘판 세 줄 (앞 · 옆 · 뒤)
            for ang in range(-3, 4):
                a = ang * .42
                for back in (0, 1):
                    th = a + (math.pi if back else 0)
                    rx, ry = rad((z0 + z1) / 2)
                    R0x = (rx * s * bw + .03 + row * .006); R0y = (ry * s + .034 + row * .006)
                    c0 = V(0, .005, z0) + Vector((math.sin(th) * R0x, -math.cos(th) * R0y, 0))
                    c1 = V(0, .005, z1) + Vector((math.sin(th) * (R0x + .012), -math.cos(th) * (R0y + .012), 0))
                    limb(P, c0, c1, [(0, .046 * s, .008 * s), (1, .05 * s, .008 * s)], plate if (ang + row) % 2 == 0 else dark, None, segs=4)
        ob = finish(P); bind(ob, self.arm, skw); self.add(g, ob)
        am = self.p['arm'] * bw
        for k in 'LR':
            sh, el = self.bones[f'upper_arm.{k}'][0], self.bones[f'upper_arm.{k}'][1]
            P = Part(f'{g}.pauldron.{k}')
            blob(P, sh + Vector((0, 0, .035)), (.112 * am, .102 * am, .082 * am), plate, None, segs=14, rings=9, cut=lambda co, z0=sh.z: co.z < z0 - .05)
            blob(P, sh + Vector((0, 0, -.015)), (.106 * am, .098 * am, .03 * am), dark, None, segs=14, rings=6)
            blob(P, el, (.07 * am, .07 * am, .066 * am), plate, None, segs=10, rings=7)   # 팔꿈치 덮개
            ob = finish(P); bind(ob, self.arm, autow(self.bones, ['spine', f'upper_arm.{k}', f'forearm.{k}'], power=6)); self.add(g, ob)

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
        if piece in ('greathelm', 'hornhelm', 'skullhelm', 'maskhelm'):   # 44차: 멋있는 투구 넷 — 통투구 · 뿔투구 · 해골 투구 · 5층 도자기 얼굴 투구
            P = Part(g)
            hc = V(0, -.005, 1.615)
            up, fw = Vector((0, -1, 0)), Vector((1, 0, 0))
            if piece == 'greathelm':
                # 위가 납작한 통투구: 머리를 통째로 덮고, 얼굴엔 십자 눈 틈 · 숨구멍, 정수리에 높은 깃털 장식(물든 색)
                loft(P, [(hc + Vector((0, .0, -.105 * s)), up, fw, .118 * s, .128 * s), (hc + Vector((0, .0, .0)), up, fw, .126 * s, .136 * s),
                         (hc + Vector((0, .0, .1 * s)), up, fw, .12 * s, .13 * s), (hc + Vector((0, .0, .13 * s)), up, fw, .1 * s, .11 * s)], metal, None, segs=18, caps=(False, True))
                limb(P, hc + Vector((-.085 * s, -.132 * s, .03 * s)), hc + Vector((.085 * s, -.132 * s, .03 * s)), [(0, .011 * s, .006 * s), (1, .011 * s, .006 * s)], dark, None, segs=4)
                limb(P, hc + Vector((0, -.135 * s, .07 * s)), hc + Vector((0, -.135 * s, -.07 * s)), [(0, .009 * s, .006 * s), (1, .009 * s, .006 * s)], dark, None, segs=4)
                for k in range(6):
                    for sx in (1, -1):
                        blob(P, hc + Vector((sx * (.03 + (k % 3) * .02) * s, -.13 * s, (-.04 - (k // 3) * .025) * s)), (.005 * s, .004 * s, .005 * s), dark, None, segs=5, rings=3)
                limb(P, hc + Vector((0, .0, .1 * s)), hc + Vector((0, .0, .145 * s)), [(0, .1 * s, .11 * s), (1, .1 * s, .11 * s)], dark, None, segs=16, caps=(False, False))   # 이마 띠
                for k in range(7):   # 깃털 장식: 정수리에서 뒤로 흘러내린다
                    t = k / 6
                    blob(P, hc + Vector((0, (.02 + t * .2) * s, (.24 - t * t * .17) * s)), ((.034 - t * .012) * s, .06 * s, (.06 - t * .02) * s), main, None, segs=8, rings=5)
            elif piece == 'hornhelm':
                # 뿔투구: 둥근 쇠 머리덮개 · 코가리개 · 볼가리개, 양옆으로 휘어 올라간 큰 뿔 (물든 색)
                blob(P, hc + Vector((0, .005, .03 * s)), (.122 * s, .134 * s, .12 * s), metal, None, segs=16, rings=12, cut=lambda co: co.z < 1.56 * s)
                limb(P, hc + Vector((0, .0, .0)), hc + Vector((0, .0, .025 * s)), [(0, .123 * s, .135 * s), (1, .123 * s, .135 * s)], dark, None, segs=16, caps=(False, False))   # 테
                limb(P, hc + Vector((0, -.13 * s, .02 * s)), hc + Vector((0, -.14 * s, -.06 * s)), [(0, .016 * s, .008 * s), (1, .012 * s, .006 * s)], metal, None, segs=5)   # 코가리개
                for sx in (1, -1):
                    blob(P, hc + Vector((sx * .1 * s, -.06 * s, -.06 * s)), (.03 * s, .05 * s, .06 * s), metal, None, segs=8, rings=6)   # 볼가리개
                    pts = [hc + Vector((sx * (.11 + n * .03) * s, (.0 - n * .008) * s, (.05 + n * .012 + (n / 6) ** 2 * .1) * s)) for n in range(8)]
                    for n in range(7):
                        w0 = (.035 - n * .0045) * s
                        limb(P, pts[n], pts[n + 1], [(0, w0, w0), (1, max(.003 * s, w0 * .85), max(.003 * s, w0 * .85))], main, None, segs=7)
                for k in range(8):   # 징
                    a = -math.pi * .9 + k * math.pi * .25
                    blob(P, hc + Vector((math.cos(a) * .123 * s, math.sin(a) * .135 * s, .012 * s)), (.007 * s,) * 3, dark, None, segs=5, rings=3)
            elif piece == 'skullhelm':
                # 해골 투구: 커다란 짐승 해골을 머리에 뒤집어썼다 — 깊은 눈구멍 · 윗니 줄이 이마 아래로 · 작은 뿔 둘
                blob(P, hc + Vector((0, -.01 * s, .03 * s)), (.13 * s, .145 * s, .13 * s), main, None, segs=16, rings=12, cut=lambda co: co.z < 1.53 * s)
                blob(P, hc + Vector((0, -.12 * s, .0)), (.08 * s, .05 * s, .06 * s), main, None, segs=12, rings=8)   # 콧등
                for sx in (1, -1):
                    blob(P, hc + Vector((sx * .045 * s, -.135 * s, .035 * s)), (.026 * s, .014 * s, .022 * s), dark, None, segs=8, rings=5)   # 눈구멍
                    pts = [hc + Vector((sx * (.08 + n * .02) * s, (.03 + n * .01) * s, (.1 + n * .03) * s)) for n in range(5)]
                    for n in range(4):
                        limb(P, pts[n], pts[n + 1], [(0, (.022 - n * .004) * s, (.022 - n * .004) * s), (1, (.018 - n * .004) * s, (.018 - n * .004) * s)], dark, None, segs=6)
                for k in range(7):   # 윗니
                    blob(P, hc + Vector(((k - 3) * .02 * s, -.155 * s, -.055 * s)), (.008 * s, .006 * s, .016 * s), main if k % 2 else dark, None, segs=5, rings=3)
                blob(P, hc + Vector((0, -.15 * s, -.02 * s)), (.012 * s, .008 * s, .014 * s), dark, None, segs=6, rings=4)   # 콧구멍
            else:
                # 5층 도자기 얼굴 투구: 쇠 머리덮개 앞에 웃지도 울지도 않는 흰 얼굴판(물든 색 = 흰빛), 검은 눈 틈과 그린 입, 정수리의 칼날 볏 셋
                blob(P, hc + Vector((0, .02 * s, .03 * s)), (.122 * s, .128 * s, .124 * s), metal, None, segs=16, rings=12, cut=lambda co: co.z < 1.52 * s)
                blob(P, hc + Vector((0, -.1 * s, -.005 * s)), (.096 * s, .045 * s, .118 * s), main, None, segs=16, rings=12)   # 얼굴판
                for sx in (1, -1):
                    limb(P, hc + Vector((sx * .02 * s, -.142 * s, .03 * s)), hc + Vector((sx * .06 * s, -.135 * s, .036 * s)), [(0, .007 * s, .005 * s), (1, .006 * s, .004 * s)], dark, None, segs=4)
                limb(P, hc + Vector((-.03 * s, -.142 * s, -.055 * s)), hc + Vector((.03 * s, -.142 * s, -.055 * s)), [(0, .004 * s, .003 * s), (1, .004 * s, .003 * s)], dark, None, segs=4)
                limb(P, hc + Vector((0, -.12 * s, .12 * s)), hc + Vector((0, -.15 * s, -.1 * s)), [(0, .006 * s, .006 * s), (1, .006 * s, .006 * s)], dark, None, segs=4)   # 얼굴판 가운데 금
                for k, dz in ((-1, .16), (0, .2), (1, .16)):
                    limb(P, hc + Vector((k * .04 * s, .02 * s, .13 * s)), hc + Vector((k * .055 * s, .05 * s, dz * s + .05 * s)), [(0, .012 * s, .03 * s), (1, .002 * s, .004 * s)], metal, None, segs=5)
            ob = finish(P); self.scale_head(ob); bind(ob, self.arm, lambda co: {'head': 1.0}, subsurf=0); self.add(g, ob)
            return
        if piece in ('cap', 'visor', 'ngob'):   # 43차: 서울·방콕 시민을 가르는 모자 — 야구 모자 · 선캡 · 응옵(밀짚 삿갓)
            P = Part(g)
            hc = V(0, -.005, 1.615)
            if piece == 'cap':
                blob(P, hc + Vector((0, .004, .03 * s)), (.106 * s, .118 * s, .1 * s), main, None, segs=16, rings=12, cut=lambda co: co.z < 1.6 * s)
                blob(P, hc + Vector((0, -.125 * s, .035 * s)), (.078 * s, .065 * s, .01 * s), main, None, segs=12, rings=6)
                blob(P, hc + Vector((0, .0, .13 * s)), (.012 * s, .012 * s, .008 * s), dark, None, segs=6, rings=4)
            elif piece == 'visor':
                loft(P, [(hc + Vector((0, .0, .045 * s)), Vector((0, -1, 0)), Vector((1, 0, 0)), .102 * s, .116 * s),
                         (hc + Vector((0, .0, .075 * s)), Vector((0, -1, 0)), Vector((1, 0, 0)), .1 * s, .114 * s)], dark, None, segs=18, caps=(False, False))
                blob(P, hc + Vector((0, -.15 * s, .06 * s)), (.1 * s, .085 * s, .01 * s), main, None, segs=14, rings=6)
            else:
                c = hc + Vector((0, .0, .085 * s))
                loft(P, [(c, Vector((0, -1, 0)), Vector((1, 0, 0)), .24 * s, .24 * s), (c + Vector((0, 0, .04 * s)), Vector((0, -1, 0)), Vector((1, 0, 0)), .16 * s, .16 * s),
                         (c + Vector((0, 0, .1 * s)), Vector((0, -1, 0)), Vector((1, 0, 0)), .06 * s, .06 * s), (c + Vector((0, 0, .13 * s)), Vector((0, -1, 0)), Vector((1, 0, 0)), .012 * s, .012 * s)], main, None, segs=20, caps=(False, True))
                loft(P, [(c + Vector((0, 0, -.012 * s)), Vector((0, -1, 0)), Vector((1, 0, 0)), .1 * s, .11 * s), (c, Vector((0, -1, 0)), Vector((1, 0, 0)), .1 * s, .11 * s)], dark, None, segs=16, caps=(False, False))
            ob = finish(P); self.scale_head(ob); bind(ob, self.arm, lambda co: {'head': 1.0}, subsurf=0); self.add(g, ob)
            return
        if piece == 'mask':   # 25차 마스크 팔이 소녀의 검은 마스크: 코와 입을 덮는 천, 귀에 거는 끈
            P = Part(g)
            hc = V(0, -.005, 1.615)
            black = rmat('dark', .85, .1, tag='armor')
            blob(P, hc + Vector((0, -.055, -.042)), (.094 * s, .068 * s, .064 * s), black, None, segs=16, rings=10, cut=lambda co: co.y > hc.y - .045 * s)
            for sx in (1, -1):
                limb(P, hc + Vector((sx * .088 * s, -.06 * s, -.02 * s)), hc + Vector((sx * .104 * s, .0, .012 * s)), [(0, .007, .007), (1, .006, .006)], black, None, segs=4)
            ob = finish(P); self.scale_head(ob); bind(ob, self.arm, lambda co: {'head': 1.0}); self.add(g, ob)
            return
        if piece in ('trench', 'firesuit', 'combatcoat', 'hauberk', 'platecoat'):
            self.long_armor(g, piece, main, dark, metal)
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
            bw = self.bw
            if piece == 'jacket':
                # 두툼한 작업 재킷: 어깨 덧댐(둥근 판), 세운 깃, 앞 지퍼, 가슴 주머니 둘, 팔꿈치 패드
                am = self.p['arm'] * self.bw
                for k, sx in (('L', 1), ('R', -1)):
                    sh, el = self.bones[f'upper_arm.{k}'][0], self.bones[f'upper_arm.{k}'][1]
                    wr = self.bones[f'forearm.{k}'][1]
                    P = Part(f'{g}.sleeve.{k}')
                    limb(P, sh + Vector((0, 0, .02)), el, [(0, .074 * am, .074 * am), (1, .06 * am, .06 * am)], main, None)
                    limb(P, el, wr - (wr - el) * .08, [(0, .058 * am, .058 * am), (.85, .05 * am, .05 * am), (1, .054 * am, .054 * am)], main, None)
                    blob(P, el, (.062 * am, .062 * am, .062 * am), dark, None, segs=10, rings=7)   # 팔꿈치 패드
                    blob(P, sh + Vector((-sx * .01, 0, .02)), (.092 * am, .085 * am, .07 * am), metal, None, segs=12, rings=8, cut=lambda co, z0=sh.z: co.z < z0 - .03)   # 어깨 덧댐
                    blob(P, sh + Vector((-sx * .01, 0, .0)), (.086 * am, .08 * am, .03 * am), dark, None, segs=12, rings=6)   # 덧댐 테
                    ob = finish(P); bind(ob, self.arm, autow(self.bones, ['spine', f'upper_arm.{k}', f'forearm.{k}'], power=5)); self.add(g, ob)
                P = Part(g + '.front')
                limb(P, V(0, .0, 1.4), V(0, .0, 1.5), [(0, .095 * bw, .085), (1, .085 * bw, .08)], main, None, segs=14)   # 세운 깃
                limb(P, V(0, -.14 * bw, 1.36), V(0, -.15 * bw, .98), [(0, .008, .006), (1, .008, .006)], dark, None, segs=5)   # 지퍼
                for sx in (1, -1):
                    blob(P, V(sx * .075 * bw, -.14 * bw, 1.26), (.04 * bw, .012, .035), dark, None, segs=8, rings=5)   # 가슴 주머니
                ob = finish(P); bind(ob, self.arm, lambda co: {'spine': 1.0} if co.z < 1.45 * s else {'neck': 1.0}); self.add(g, ob)
            else:
                # 방탄 조끼: 앞뒤 두꺼운 판, 어깨끈, 허리를 두른 띠와 주머니 셋
                P = Part(g + '.plates')
                limb(P, V(0, -.118 * bw, 1.36), V(0, -.13 * bw, 1.08), [(0, .14 * bw, .028), (1, .135 * bw, .03)], metal, None, segs=6)   # 앞판
                limb(P, V(0, .1 * bw, 1.36), V(0, .1 * bw, 1.1), [(0, .14 * bw, .026), (1, .135 * bw, .026)], metal, None, segs=6)   # 뒤판
                for sx in (1, -1):
                    limb(P, V(sx * .085, -.1, 1.4), V(sx * .085, .09, 1.4), [(0, .03, .012), (1, .03, .012)], dark, None, segs=5)   # 어깨끈
                limb(P, V(0, 0, 1.03), V(0, 0, 1.1), [(0, .2 * bw, .155 * bw), (1, .2 * bw, .15 * bw)], dark, None, segs=16)   # 허리 띠
                for k2 in range(3):
                    x = (k2 - 1) * .085 * bw
                    limb(P, V(x, -.16 * bw, 1.0), V(x, -.16 * bw, 1.11), [(0, .036 * bw, .022), (1, .036 * bw, .022)], main, None, segs=6)   # 주머니
                    limb(P, V(x, -.168 * bw, 1.1), V(x, -.168 * bw, 1.12), [(0, .038 * bw, .024), (1, .038 * bw, .024)], dark, None, segs=6)   # 주머니 덮개
                ob = finish(P); bind(ob, self.arm, lambda co: {'spine': smooth(co.z, .98 * s, 1.12 * s), 'hips': 1 - smooth(co.z, .98 * s, 1.12 * s)}); self.add(g, ob)
            return
        if piece == 'shield':
            # 20차: 왼팔 바깥쪽에 끼운 둥근 방패 — 칠한 나무 판(구역 top = 방패 색), 쇠 테두리, 가운데 쇠 돌기, 판자 이음새
            wood = rmat('top', .6, .25, tag='armor')
            el, wr = self.bones['forearm.L'][0], self.bones['forearm.L'][1]
            c = el + (wr - el) * .55 + Vector((.075, -.02, 0))
            P = Part(g)
            blob(P, c, (.02, .245, .245), metal, None, segs=24, rings=10)                       # 쇠 테두리 (뒤판)
            blob(P, c + Vector((.012, 0, 0)), (.02, .222, .222), wood, None, segs=24, rings=10)   # 칠한 나무 판
            for dz in (-.11, 0, .11):
                blob(P, c + Vector((.03, 0, dz)), (.004, .2 * (1 - abs(dz) * 2.4), .006), dark, None, segs=8, rings=4)   # 판자 이음새
            blob(P, c + Vector((.034, 0, 0)), (.03, .055, .055), metal, None, segs=14, rings=8)   # 가운데 돌기
            ob = finish(P); bind(ob, self.arm, rigid('forearm.L')); self.add(g, ob)
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
        lm = self.p.get('legmass', 1.0)
        lg = self.p['leg'] * self.bw * lm
        fm = 1.12 if lm > 1 else 1.0
        for k in 'LR':
            b = self.bones
            hp, kn = b[f'thigh.{k}'][0], b[f'thigh.{k}'][1]
            an = b[f'shin.{k}'][1]
            sx = 1 if k == 'L' else -1
            P = Part(f'{g}.{k}')
            if piece == 'workpants':
                # 두꺼운 작업 바지: 허벅지 옆 주머니, 무릎에 덧댄 패드, 발목을 조인 단
                limb(P, hp + Vector((0, 0, .04)), kn, [(0, .096 * lg, .099 * lg), (.3, .092 * lg, .096 * lg), (.6, .08 * lg, .084 * lg), (1, .066 * lg, .069 * lg)], main, None)
                limb(P, kn, an + Vector((0, 0, .03)), [(0, .066 * lg, .069 * lg), (.35, .064 * lg, .072 * lg), (1, .056 * lg, .058 * lg)], main, None)
                blob(P, kn, (.067 * lg, .07 * lg, .067 * lg), main, None, segs=10, rings=7)
                blob(P, (hp + kn) / 2 + Vector((sx * .085 * lm, -.015, -.02)), (.032 * lm, .055, .065), dark, None, segs=8, rings=6)   # 옆 주머니
                blob(P, kn + Vector((0, -.06 * lm, .005)), (.055 * lg, .03 * lg, .06 * lg), dark, None, segs=10, rings=7)   # 무릎 패드
                limb(P, an + Vector((0, 0, .03)), an + Vector((0, 0, .07)), [(0, .06 * lg, .062 * lg), (1, .06 * lg, .062 * lg)], dark, None, segs=10)   # 발목 단
                ob = finish(P); bind(ob, self.arm, autow(self.bones, ['hips', f'thigh.{k}', f'shin.{k}'], power=5)); self.add(g, ob)
            elif piece == 'shinguard':
                # 정강이 보호대: 무릎을 감싼 둥근 덮개 + 정강이를 덮는 두툼한 판 + 띠 둘
                limb(P, kn + Vector((0, -.055, -.03)), an + Vector((0, -.045, .07)), [(0, .062 * lg, .036 * lg), (.5, .066 * lg, .04 * lg), (1, .056 * lg, .034 * lg)], main, None, segs=8)
                blob(P, kn + Vector((0, -.062, .01)), (.064 * lg, .045 * lg, .066 * lg), metal, None, segs=10, rings=7)
                for t in (.3, .75):
                    c = kn + (an - kn) * t
                    limb(P, c + Vector((0, 0, -.01)), c + Vector((0, 0, .01)), [(0, .07 * lg, .073 * lg), (1, .07 * lg, .073 * lg)], dark, None, segs=12)
                ob = finish(P); bind(ob, self.arm, autow(self.bones, [f'thigh.{k}', f'shin.{k}'], power=8)); self.add(g, ob)
            elif piece == 'boots':
                # 전투화: 두꺼운 밑창, 앞코 덮개, 종아리 중간까지 오는 목, 끈
                c = Vector((an.x, -.035 * s, .05 * s))
                blob(P, c, (.064 * s * fm, .138 * s * fm, .066 * s), bootm, None, segs=12, rings=8, cut=lambda co: co.z < .0)
                limb(P, c + Vector((0, .1 * s, .014 * s)), c + Vector((0, -.145 * s * fm, .014 * s)), [(0, .066 * s * fm, .022 * s), (1, .06 * s * fm, .02 * s)], dark, None, segs=8)   # 밑창
                blob(P, c + Vector((0, -.1 * s * fm, .035 * s)), (.05 * s, .045 * s, .035 * s), dark, None, segs=10, rings=6)   # 앞코
                limb(P, an + Vector((0, 0, -.06)), an + Vector((0, 0, .24 * s)), [(0, .068 * s * lm, .07 * s * lm), (1, .064 * s * lm, .066 * s * lm)], bootm, None)
                limb(P, an + Vector((0, 0, .22 * s)), an + Vector((0, 0, .26 * s)), [(0, .07 * s * lm, .072 * s * lm), (1, .07 * s * lm, .072 * s * lm)], dark, None, segs=12)   # 목 테
                for t in range(4):
                    z = .04 + t * .045
                    blob(P, an + Vector((0, -.058 * s * lm, z * s)), (.03 * s, .008 * s, .008 * s), dark, None, segs=6, rings=4)   # 끈
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
            # 42차: 정수리의 결 (짧은 머리털 다발) · 구레나룻 · 이마에 조금 내려온 앞머리
            for k in range(7):
                a = -1.2 + k * .4
                blob(P, V(math.sin(a) * .06, -.02 + math.cos(a) * .03, 1.735), (.028 * s, .026 * s, .022 * s), hm, None, segs=8, rings=5)
            for sx in (1, -1):
                blob(P, V(sx * .088, -.03, 1.6), (.012 * s, .02 * s, .03 * s), hm, None, segs=6, rings=4)
            blob(P, V(.015, -.085, 1.695), (.05 * s, .025 * s, .022 * s), hm, None, segs=8, rings=5)
        elif style == 'swept':
            blob(P, hc, R, hm, None, segs=16, rings=12, cut=lambda co: (co.y < -.025 * s and co.z < 1.665 * s) or co.z < 1.53 * s or (co.z < 1.59 * s and co.y < .03 * s))
            blob(P, V(-.02, -.06, 1.72), (.075 * s, .06 * s, .04 * s), hm, None, segs=12, rings=8)          # 앞으로 넘긴 앞머리
            blob(P, V(.045, -.075, 1.69), (.05 * s, .04 * s, .035 * s), hm, None, segs=10, rings=7)
        elif style == 'bob':
            blob(P, hc + Vector((0, 0, -.01)), (R[0] * 1.08, R[1] * 1.06, R[2] * 1.02), hm, None, segs=16, rings=12,
                 cut=lambda co: (co.y < -.03 * s and co.z < 1.655 * s and abs(co.x) < .075 * s) or co.z < 1.53 * s)
            # 42차: 턱선까지 내려오는 옆머리 · 일자 앞머리 · 뒤통수의 둥근 부피
            for sx in (1, -1):
                blob(P, V(sx * .094, -.008, 1.56), (.034 * s, .072 * s, .066 * s), hm, None, segs=8, rings=6)
            blob(P, V(0, -.074, 1.7), (.078 * s, .034 * s, .03 * s), hm, None, segs=10, rings=6)
            blob(P, V(0, .06, 1.6), (.09 * s, .06 * s, .08 * s), hm, None, segs=10, rings=7)
        elif style == 'long':
            blob(P, hc + Vector((0, -.002, 0)), (R[0] * 1.02, R[1], R[2]), hm, None, segs=16, rings=12,
                 cut=lambda co: (co.y < -.03 * s and co.z < 1.665 * s and abs(co.x) < .078 * s) or co.z < 1.50 * s or (co.y < -.06 * s and co.z < 1.58 * s))
            # 42차: 등판을 두 갈래로 (끝이 갈라져 길이가 조금 다르다) · 어깨 앞으로 넘어온 가닥 · 비스듬한 앞머리
            for sx, dz in ((1, 0.0), (-1, .04)):
                limb(P, V(sx * .035, .05, 1.64), V(sx * .05, .085, 1.25 + dz), [(0, .07 * s, .07 * s), (.35, .072 * s, .055 * s), (.8, .06 * s, .036 * s), (1, .03 * s, .016 * s)], hm, None, segs=10)
            for sx in (1, -1):
                limb(P, V(sx * .085, -.03, 1.6), V(sx * .1, -.06, 1.4), [(0, .024 * s, .02 * s), (1, .02 * s, .014 * s)], hm, None, segs=6)
            blob(P, V(-.03, -.07, 1.705), (.06 * s, .05 * s, .03 * s), hm, None, segs=10, rings=7)
        elif style == 'ponytail':
            blob(P, hc + Vector((0, .004, -.004)), (R[0] * .99, R[1] * .99, R[2] * .99), hm, None, segs=16, rings=12,
                 cut=lambda co: (co.y < -.025 * s and co.z < 1.675 * s) or co.z < 1.55 * s or (co.z < 1.61 * s and co.y < .02 * s))
            blob(P, V(0, .115, 1.66), (.035 * s, .03 * s, .035 * s), hm, None, segs=8, rings=6)
            limb(P, V(0, .13, 1.66), V(0, .16, 1.38), [(0, .04 * s, .035 * s), (.3, .05 * s, .04 * s), (1, .015 * s, .015 * s)], hm, None, segs=10)
            # 42차: 앞머리 · 귀 옆으로 흘러내린 잔머리
            blob(P, V(.01, -.074, 1.7), (.07 * s, .032 * s, .028 * s), hm, None, segs=10, rings=6)
            for sx in (1, -1):
                limb(P, V(sx * .085, -.04, 1.63), V(sx * .09, -.05, 1.53), [(0, .01 * s, .01 * s), (1, .005 * s, .005 * s)], hm, None, segs=4)
        ob = finish(P); self.scale_head(ob); bind(ob, self.arm, lambda co: {'head': 1.0})
        return self.add(g, ob)

    # ── 무기 (오른손) ──
    def weapon(self, name):
        g = 'w.' + name
        wr, hd = self.bones['forearm.R'][1], self.bones['hand.R'][1]
        grip = (wr + hd) / 2 + Vector((0, -.008, 0))
        d = Vector((0, -.55, -.83)).normalized()        # 손에서 앞-아래로 뻗는 방향
        side = Vector((1, 0, 0)); up = d.cross(side).normalized()
        G = lambda x, y, z: Vector((x, -z, y))   # 45차 총: 예전 (옆, 뒤, 위) 좌표 → 쏘는 자세의 손 축 (위 = 손 앞쪽 -Y, 뒤 = 손 위쪽 +Z)
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
        elif name == 'arming':
            # 20차 한손검: 장검보다 짧고 넓은 날, 곧은 십자 날밑, 둥근 자루 끝
            limb(P, grip - d * .09, grip + d * .06, [(0, .017, .017), (1, .017, .017)], dark, None, segs=8)
            blob(P, grip - d * .1, (.026, .026, .026), metal, None, segs=8, rings=6)
            limb(P, grip + d * .06 - side * .11, grip + d * .06 + side * .11, [(0, .015, .015), (1, .015, .015)], metal, None, segs=6)
            limb(P, grip + d * .07, grip + d * .72, [(0, .006, .036), (.8, .005, .03), (1, .001, .004)], metal, None, segs=6)
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
        elif name == 'knocker':
            # 재문지기의 뼈 곤봉: 굵은 넓적다리뼈 끝에 문고리(둥근 고리)가 달렸다
            bone = rmat('bandage', .7, .15, tag='wpn')
            limb(P, grip - d * .12, grip + d * .82, [(0, .034, .034), (.5, .028, .028), (1, .04, .04)], bone, None, segs=8)
            blob(P, grip + d * .84, (.06, .06, .06), bone, None, segs=10, rings=7)
            blob(P, grip - d * .13, (.05, .05, .05), bone, None, segs=10, rings=7)
            ring_c = grip + d * .98
            for k in range(12):
                a0, a1 = k / 12 * math.tau, (k + 1) / 12 * math.tau
                p0 = ring_c + side * math.cos(a0) * .11 + d * math.sin(a0) * .11
                p1 = ring_c + side * math.cos(a1) * .11 + d * math.sin(a1) * .11
                limb(P, p0, p1, [(0, .026, .026), (1, .026, .026)], metal, None, segs=6)
        elif name == 'sealstaff':
            # 봉랍귀의 긴 지팡이: 위로 길게 선 검은 나무 자루 + 꼭대기의 붉은 밀랍 인장 원판(금 테)
            seal = rmat('crest', .5, .3)
            top_dir = Vector((0, -.06, 1)).normalized()
            limb(P, grip - top_dir * .78, grip + top_dir * .92, [(0, .02, .02), (1, .018, .018)], wood, None, segs=8)
            c0 = grip + top_dir * 1.02
            fwd = Vector((0, -1, 0))
            limb(P, c0 - fwd * .012, c0 + fwd * .012, [(0, .1, .1), (1, .1, .1)], metal, None, segs=16)   # 금 테
            limb(P, c0 - fwd * .032, c0 + fwd * .032, [(0, .082, .082), (1, .082, .082)], seal, None, segs=16)   # 붉은 밀랍 인장 (테보다 두껍게 앞뒤로 나온다)
            blob(P, c0 + fwd * .036, (.03, .01, .03), rmat('dark', .7, .2), None, segs=8, rings=5)   # 찍힌 문양
        elif name == 'ledger':
            # 두꺼운 장부: 가죽 표지 + 금 모서리 + 종이 단면
            c0 = grip + d * .14
            limb(P, c0 - d * .17, c0 + d * .17, [(0, .13, .06), (1, .13, .06)], wood, None, segs=4)
            limb(P, c0 - d * .155, c0 + d * .155, [(0, .12, .07), (1, .12, .07)], rmat('bandage', .6, .2, tag='wpn'), None, segs=4)   # 종이 단면
            for t in (-.16, .16):
                limb(P, c0 + d * (t - .015), c0 + d * (t + .015), [(0, .14, .065), (1, .14, .065)], metal, None, segs=4)   # 금 모서리
        # ── 지옥 괴물의 무기 (층마다·괴물마다 다르게) ──
        elif name == 'pickaxe':   # 잿빛 망자: 재 광산의 곡괭이
            limb(P, grip - d * .1, grip + d * .72, [(0, .018, .018), (1, .016, .016)], wood, None, segs=8)
            h = grip + d * .72
            for sg in (1, -1):
                limb(P, h, h + up * sg * .17 - d * .05, [(0, .026, .026), (.6, .016, .016), (1, .004, .004)], metal, None, segs=8)
        elif name == 'brand':   # 불씨 망자: 끝이 달아오른 낙인 쇠
            glowm = rmat('crest', .3, .7)
            limb(P, grip - d * .08, grip + d * .12, [(0, .02, .02), (1, .02, .02)], wood, None, segs=8)
            limb(P, grip + d * .12, grip + d * .86, [(0, .01, .01), (1, .01, .01)], metal, None, segs=6)
            c0 = grip + d * .9
            for a0, a1 in ((up * .045 + side * .045, up * .045 - side * .045), (up * .045 - side * .045, -up * .045 - side * .045), (-up * .045 - side * .045, -up * .045 + side * .045), (-up * .045 + side * .045, up * .045 + side * .045), (up * .045, -up * .045)):
                limb(P, c0 + a0, c0 + a1, [(0, .012, .012), (1, .012, .012)], glowm, None, segs=5)
        elif name == 'boathook':   # 늪 망자: 긴 장대 끝의 쇠갈고리
            limb(P, grip - d * .35, grip + d * 1.0, [(0, .016, .016), (1, .015, .015)], wood, None, segs=8)
            limb(P, grip + d * .98, grip + d * 1.14, [(0, .012, .012), (1, .002, .002)], metal, None, segs=6)
            limb(P, grip + d * .98, grip + d * 1.0 + up * .07, [(0, .011, .011), (1, .01, .01)], metal, None, segs=6)
            limb(P, grip + d * 1.0 + up * .07, grip + d * .93 + up * .08, [(0, .01, .01), (1, .002, .002)], metal, None, segs=6)
        elif name == 'cleaver':   # 흥정꾼 망자: 넓적한 고기 칼
            limb(P, grip - d * .06, grip + d * .1, [(0, .017, .02), (1, .017, .02)], dark, None, segs=8)
            limb(P, grip + d * .1 + up * .03, grip + d * .4 + up * .035, [(0, .005, .062), (.85, .005, .07), (1, .004, .05)], metal, None, segs=6)
        elif name == 'ladle':   # 프렛: 바닥이 뚫린 커다란 국자 (굶주림)
            limb(P, grip - d * .08, grip + d * .74, [(0, .014, .014), (1, .013, .013)], wood, None, segs=8)
            c0 = grip + d * .8 + up * .03
            blob(P, c0, (.065, .065, .04), metal, None, segs=12, rings=7)
            blob(P, c0 + up * .02, (.05, .05, .02), dark, None, segs=10, rings=5)
        elif name == 'skewer':   # 피 프렛: 살덩이 꿴 쇠꼬챙이
            limb(P, grip - d * .08, grip + d * 1.0, [(0, .009, .009), (.92, .008, .008), (1, .001, .001)], metal, None, segs=6)
            for t, r in ((.48, .042), (.64, .036), (.8, .03)):
                blob(P, grip + d * t, (r, r * .9, r * 1.1), rmat('bandage', .7, .15, tag='wpn'), None, segs=9, rings=6)
        elif name == 'femur':   # 걷는 해골: 거인의 넓적다리뼈
            bonem = rmat('bandage', .7, .15, tag='wpn')
            limb(P, grip - d * .1, grip + d * .78, [(0, .028, .028), (.5, .022, .022), (1, .03, .03)], bonem, None, segs=8)
            for sg in (1, -1):
                blob(P, grip + d * .82 + side * sg * .03, (.04, .04, .045), bonem, None, segs=10, rings=7)
            blob(P, grip - d * .12, (.045, .045, .045), bonem, None, segs=10, rings=7)
        elif name == 'hook':   # 빚진 해골: 빚 받는 갈고리
            limb(P, grip - d * .06, grip + d * .12, [(0, .018, .018), (1, .018, .018)], dark, None, segs=8)
            limb(P, grip + d * .12, grip + d * .42, [(0, .012, .012), (1, .012, .012)], metal, None, segs=6)
            c0 = grip + d * .42 + up * .08
            pts = [c0 + (-up * math.cos(a) + d * math.sin(a)) * .08 for a in [k * math.pi / 6 for k in range(0, 9)]]
            for k in range(len(pts) - 1):
                limb(P, pts[k], pts[k + 1], [(0, .012 - k * .001, .012 - k * .001), (1, .011 - k * .001, .011 - k * .001)], metal, None, segs=6)
        elif name == 'flamer':   # 25차 화염방사기: 손잡이 아래 연료통, 앞으로 긴 분사관, 끝이 벌어진 노즐
            fwd = G(0, -1, 0)   # 45차: 쏘는 자세에서 손의 아래쪽(-Z)이 앞 — 예전엔 총구가 하늘을 향했다
            tank = rmat('raincoat', .55, .3, tag='wpn')
            limb(P, grip + G(0, .01, .04), grip + G(0, -.01, -.06), [(0, .016, .024), (1, .016, .024)], dark, None, segs=6)   # 손잡이
            limb(P, grip + G(0, .1, .07), grip + G(0, .1, .07) + fwd * .5, [(0, .017, .017), (1, .015, .015)], metal, None, segs=6)   # 분사관
            limb(P, grip + G(0, -.4, .07), grip + G(0, -.47, .07), [(0, .02, .02), (1, .03, .03)], dark, None, segs=8)   # 노즐
            limb(P, grip + G(0, .08, -.03), grip + G(0, -.16, -.03), [(0, .042, .042), (.1, .05, .05), (.9, .05, .05), (1, .042, .042)], tank, None, segs=10)   # 연료통
            limb(P, grip + G(0, -.18, .07), grip + G(0, -.26, -.01), [(0, .014, .018), (1, .014, .018)], dark, None, segs=6)   # 앞 손잡이
            blob(P, grip + G(0, -.445, .1), (.012, .012, .012), rmat('crest', .25, .85), None, segs=6, rings=4)   # 불씨
        elif name == 'shotgun':   # 탈루스: 개머리판 달린 쌍대 산탄총
            fwd = G(0, -1, 0)   # 45차: 쏘는 자세에서 손의 아래쪽(-Z)이 앞 — 예전엔 총구가 하늘을 향했다
            limb(P, grip + G(0, .025, .035), grip + G(0, .21, -.05), [(0, .02, .03), (1, .03, .048)], wood, None, segs=6)   # 개머리판
            limb(P, grip + G(0, .02, .05), grip + G(0, -.1, .06), [(0, .024, .03), (1, .024, .03)], metal, None, segs=6)   # 기관부
            for sx in (-.012, .012):
                limb(P, grip + Vector((sx, -.1, .07)), grip + Vector((sx, -.1, .07)) + fwd * .44, [(0, .011, .011), (1, .011, .011)], dark, None, segs=6)
            limb(P, grip + G(0, -.13, .05), grip + G(0, -.29, .055), [(0, .016, .022), (1, .016, .022)], wood, None, segs=6)   # 앞 손잡이
        elif name == 'bow':   # 17차 활: 위아래로 휜 나무 활대, 팽팽한 시위, 메긴 화살 (쏘는 자세에서 세로로 선다)
            # 쏘는 자세에서 손의 아래쪽(-Z)이 앞을, 앞쪽(-Y)이 위를 향한다 → 활대는 Y 축, 화살은 -Z 축
            fwd = Vector((0, 0, -1)); zz = Vector((0, -1, 0))
            string = rmat('bandage', .6, .2, tag='wpn')
            limb(P, grip - zz * .08, grip + zz * .08, [(0, .02, .02), (1, .02, .02)], dark, None, segs=6)   # 손잡이
            for sg in (1, -1):
                pts = [grip + zz * sg * .07, grip + zz * sg * .22 + fwd * .045, grip + zz * sg * .37 + fwd * .035, grip + zz * sg * .46 - fwd * .015]
                for a, b in zip(pts, pts[1:]):
                    limb(P, a, b, [(0, .016, .016), (1, .012, .012)], wood, None, segs=6)
            tipU, tipD = grip + zz * .46 - fwd * .015, grip - zz * .46 - fwd * .015
            nock = grip - fwd * .16
            limb(P, tipU, nock, [(0, .004, .004), (1, .004, .004)], string, None, segs=4)
            limb(P, nock, tipD, [(0, .004, .004), (1, .004, .004)], string, None, segs=4)
            limb(P, nock, grip + fwd * .3, [(0, .006, .006), (1, .006, .006)], wood, None, segs=4)   # 화살대
            limb(P, grip + fwd * .3, grip + fwd * .37, [(0, .012, .012), (1, .001, .001)], metal, None, segs=4)   # 화살촉
            for sg in (1, -1):
                limb(P, nock - fwd * .0 + zz * sg * .004, nock + fwd * .08 + zz * sg * .03, [(0, .004, .004), (1, .002, .002)], rmat('crest', .7, .1), None, segs=3)   # 깃
        elif name == 'pistol':
            fwd = G(0, -1, 0)   # 45차: 쏘는 자세에서 손의 아래쪽(-Z)이 앞 — 예전엔 총구가 하늘을 향했다
            limb(P, grip + G(0, .01, .04), grip + G(0, -.01, -.06), [(0, .016, .026), (1, .016, .026)], dark, None, segs=6)
            limb(P, grip + G(0, .03, .07), grip + G(0, .03, .07) + fwd * .19, [(0, .015, .022), (1, .015, .022)], dark, None, segs=6)
        # ── 16차: 양손 무기 (현실 오함마·소방 도끼 · 지옥 대검·철퇴) — 손잡이가 손 뒤로도 길게 뻗어 왼손이 함께 쥔다 ──
        elif name == 'sledge':   # 오함마: 긴 나무 자루 + 네모난 쇠머리
            limb(P, grip - d * .32, grip + d * .8, [(0, .02, .02), (1, .018, .018)], wood, None, segs=8)
            h = grip + d * .84
            limb(P, h - up * .1, h + up * .1, [(0, .055, .055), (.15, .06, .06), (.85, .06, .06), (1, .055, .055)], metal, None, segs=4)
        elif name == 'fireaxe':   # 소방 도끼: 붉은 쇠날 + 뒤쪽 뾰족한 갈고리
            red = rmat('crest', .45, .4)
            limb(P, grip - d * .3, grip + d * .82, [(0, .019, .019), (1, .017, .017)], wood, None, segs=8)
            h = grip + d * .78
            limb(P, h - up * .02, h + up * .17, [(0, .01, .06), (.7, .008, .085), (1, .005, .1)], red, None, segs=6)
            limb(P, h + up * .15, h + up * .18, [(0, .006, .1), (1, .003, .1)], metal, None, segs=4)   # 벼린 날
            limb(P, h - up * .02, h - up * .16 + d * .03, [(0, .02, .03), (1, .003, .004)], red, None, segs=6)
        elif name == 'greatsword':   # 지옥 흑철 대검: 넓은 날, 긴 손잡이, 뿔 같은 코등이
            limb(P, grip - d * .3, grip + d * .08, [(0, .02, .02), (1, .019, .019)], dark, None, segs=8)
            blob(P, grip - d * .32, (.032, .032, .032), metal, None, segs=8, rings=5)
            for sg in (1, -1):
                limb(P, grip + d * .08, grip + d * .03 + side * sg * .16, [(0, .022, .022), (1, .006, .006)], metal, None, segs=6)
            limb(P, grip + d * .09, grip + d * 1.18, [(0, .009, .05), (.85, .008, .044), (1, .002, .004)], metal, None, segs=6)
            limb(P, grip + d * .12, grip + d * .9, [(0, .011, .008), (1, .01, .006)], dark, None, segs=4)   # 피 홈
        elif name == 'maul':   # 지옥 철퇴: 긴 쇠자루 끝에 가시 박힌 쇠공
            limb(P, grip - d * .3, grip + d * .78, [(0, .018, .018), (1, .017, .017)], dark, None, segs=8)
            c0 = grip + d * .88
            blob(P, c0, (.085, .085, .085), metal, None, segs=12, rings=8)
            for k in range(14):
                a = k * 2.39996; zz = 1 - 2 * (k + .5) / 14; r = math.sqrt(1 - zz * zz)
                n = side * math.cos(a) * r + up * math.sin(a) * r + d * zz
                limb(P, c0 + n * .07, c0 + n * .14, [(0, .018, .018), (1, .002, .002)], metal, None, segs=5)
        elif name == 'chainmace':   # 24차 도르칸: 사람 키를 넘는 쇠 자루, 끝에 가시 왕관과 달아오른 구슬, 늘어진 쇠사슬
            glowm = rmat('crest', .25, .85)
            top_dir = Vector((0, -.08, 1)).normalized()
            limb(P, grip - top_dir * .7, grip + top_dir * 1.0, [(0, .026, .026), (1, .024, .024)], dark, None, segs=8)
            for t0 in (.2, .55, .85):
                c = grip + top_dir * t0
                limb(P, c - top_dir * .025, c + top_dir * .025, [(0, .036, .036), (1, .036, .036)], metal, None, segs=8)
            h = grip + top_dir * 1.12
            blob(P, h, (.07, .07, .07), glowm, None, segs=12, rings=8)
            for k in range(7):
                a = k / 7 * math.pi * 2
                b0 = h + Vector((math.cos(a) * .06, math.sin(a) * .06, -.02))
                limb(P, b0, b0 + Vector((math.cos(a) * .1, math.sin(a) * .1, .12)), [(0, .022, .022), (1, .002, .002)], metal, None, segs=5)
            for sg in (1, -1):
                for n in range(9):
                    c = h + Vector((sg * (.06 + n * .008), -.01, -.05 - n * .055))
                    blob(P, c, (.016, .01, .022), metal, None, segs=6, rings=4)
        # ── 26차: 현실 무기 더 (가게마다 나눠 판다) ──
        elif name == 'umbrella':   # 접은 장우산: 검은 천이 감긴 긴 대, 뒤로 굽은 손잡이
            black = rmat('dark', .8, .1)
            limb(P, grip - d * .05, grip + d * .8, [(0, .008, .008), (1, .006, .006)], metal, None, segs=6)
            limb(P, grip + d * .12, grip + d * .74, [(0, .012, .012), (.2, .03, .03), (.8, .02, .02), (1, .006, .006)], black, None, segs=8)
            pts = [grip - d * .05 - d * (.04 * math.sin(a0)) + up * (.04 * (1 - math.cos(a0))) for a0 in [k / 6 * math.pi for k in range(7)]]
            for p0, p1 in zip(pts, pts[1:]):
                limb(P, p0, p1, [(0, .011, .011), (1, .011, .011)], wood, None, segs=5)   # 뒤로 굽은 손잡이
        elif name == 'sickle':   # 낫: 짧은 나무 자루 끝에 초승달처럼 휜 날
            limb(P, grip - d * .08, grip + d * .2, [(0, .015, .015), (1, .014, .014)], wood, None, segs=8)
            pts = [grip + d * .2 + up * .0, grip + d * .27 + up * .06, grip + d * .27 + up * .14, grip + d * .2 + up * .2, grip + d * .1 + up * .22]
            for a, b in zip(pts, pts[1:]):
                limb(P, a, b, [(0, .004, .016), (1, .003, .013)], metal, None, segs=5)
        elif name == 'crowbar':   # 쇠지렛대: 붉은 쇠막대, 끝이 갈고리처럼 굽고 납작하다
            red = rmat('crest', .45, .4)
            limb(P, grip - d * .12, grip + d * .55, [(0, .013, .013), (1, .013, .013)], red, None, segs=6)
            limb(P, grip + d * .55, grip + d * .6 + up * .06, [(0, .013, .013), (1, .01, .01)], red, None, segs=6)
            limb(P, grip + d * .6 + up * .06, grip + d * .56 + up * .1, [(0, .01, .016), (1, .004, .016)], metal, None, segs=5)
            limb(P, grip - d * .12, grip - d * .16 - up * .02, [(0, .012, .016), (1, .004, .016)], metal, None, segs=5)
        elif name == 'wrench':   # 파이프 렌치: 붉은 자루, 끝에 톱니 물린 쇠 턱
            red = rmat('crest', .45, .4)
            limb(P, grip - d * .08, grip + d * .32, [(0, .017, .022), (1, .017, .022)], red, None, segs=6)
            h = grip + d * .36
            limb(P, h - up * .02, h + up * .085, [(0, .026, .03), (1, .022, .028)], metal, None, segs=6)
            limb(P, h + up * .075, h + up * .085 + d * .07, [(0, .018, .022), (1, .016, .02)], metal, None, segs=5)
            limb(P, h - up * .015, h - up * .015 + d * .06, [(0, .016, .02), (1, .014, .018)], metal, None, segs=5)
        elif name == 'machete':   # 마체테: 검은 손잡이, 넓고 긴 외날 (끝이 조금 휘었다)
            limb(P, grip - d * .08, grip + d * .07, [(0, .018, .018), (1, .018, .018)], dark, None, segs=8)
            limb(P, grip + d * .07, grip + d * .5, [(0, .004, .035), (.7, .004, .045), (1, .002, .02)], metal, None, segs=6)
            limb(P, grip + d * .5, grip + d * .58 + up * .02, [(0, .003, .03), (1, .001, .004)], metal, None, segs=5)
        elif name == 'metalbat':   # 금속 야구방망이: 은빛 쇠, 검은 손잡이 테이프
            limb(P, grip - d * .07, grip + d * .10, [(0, .021, .021), (1, .017, .017)], dark, None, segs=8)
            limb(P, grip + d * .10, grip + d * .78, [(0, .017, .017), (.4, .021, .021), (.85, .03, .03), (1, .029, .029)], metal, None, segs=8)
            blob(P, grip + d * .79, (.029, .029, .01), dark, None, segs=8, rings=4)
        elif name == 'saber':   # 세이버·해적검: 휜 외날, 손을 감싸는 금빛 손잡이 고리
            gold = rmat('crest', .3, .7)
            limb(P, grip - d * .08, grip + d * .06, [(0, .016, .016), (1, .016, .016)], dark, None, segs=8)
            limb(P, grip + d * .06 - side * .05, grip + d * .06 + side * .05, [(0, .012, .012), (1, .012, .012)], gold, None, segs=6)
            limb(P, grip + d * .06 - up * .045, grip - d * .09 - up * .03, [(0, .006, .006), (1, .006, .006)], gold, None, segs=5)
            pts = [grip + d * (.07 + k * .14) + up * (.012 * k * k) for k in range(7)]
            for k, (a, b) in enumerate(zip(pts, pts[1:])):
                limb(P, a, b, [(0, .004, .024 - k * .002), (1, .003, .022 - k * .002)], metal, None, segs=5)
        elif name == 'rapier':   # 레이피어: 가늘고 긴 찌르는 날, 둥근 고리 손잡이
            gold = rmat('crest', .3, .7)
            limb(P, grip - d * .09, grip + d * .05, [(0, .014, .014), (1, .014, .014)], dark, None, segs=8)
            blob(P, grip - d * .1, (.022, .022, .022), gold, None, segs=8, rings=6)
            blob(P, grip + d * .07, (.05, .05, .012), gold, None, segs=12, rings=4)
            limb(P, grip + d * .06 - side * .07, grip + d * .06 + side * .07, [(0, .008, .008), (1, .008, .008)], gold, None, segs=6)
            limb(P, grip + d * .08, grip + d * 1.0, [(0, .003, .012), (.9, .002, .008), (1, .001, .002)], metal, None, segs=5)
        elif name == 'katana':   # 일본도: 끈 감은 긴 자루, 둥근 코등이, 살짝 휜 외날
            limb(P, grip - d * .2, grip + d * .07, [(0, .017, .017), (1, .017, .017)], dark, None, segs=8)
            for t in (-.15, -.08, -.01, .05):
                blob(P, grip + d * t, (.019, .019, .008), rmat('bandage', .7, .2), None, segs=6, rings=3)
            blob(P, grip + d * .085, (.045, .045, .01), rmat('crest', .3, .7), None, segs=10, rings=4)
            pts = [grip + d * (.1 + k * .16) + up * (.008 * k * k) for k in range(7)]
            for k, (a, b) in enumerate(zip(pts, pts[1:])):
                limb(P, a, b, [(0, .004, .02), (1, .003, .019 - (k == 5) * .016)], metal, None, segs=5)
        elif name == 'boltcutter':   # 대형 볼트 커터: 붉은 고무 손잡이 둘이 길게, 끝에 짧은 쇠 턱
            red = rmat('crest', .45, .4)
            for sg in (1, -1):
                limb(P, grip - d * .3 + side * sg * .03, grip + d * .1 + side * sg * .03, [(0, .02, .02), (1, .02, .02)], red, None, segs=6)
                limb(P, grip + d * .1 + side * sg * .03, grip + d * .62 + side * sg * .012, [(0, .013, .013), (1, .012, .012)], metal, None, segs=6)
                limb(P, grip + d * .62 + side * sg * .012, grip + d * .76, [(0, .02, .012), (1, .006, .004)], metal, None, segs=5)
            blob(P, grip + d * .62, (.03, .03, .03), dark, None, segs=8, rings=5)
        elif name == 'rifle':   # 26차 저격총: 긴 총열, 나무 개머리판, 위에 망원 조준경
            fwd = G(0, -1, 0)   # 45차: 쏘는 자세에서 손의 아래쪽(-Z)이 앞 — 예전엔 총구가 하늘을 향했다
            limb(P, grip + G(0, .025, .035), grip + G(0, .27, -.06), [(0, .02, .03), (1, .032, .05)], wood, None, segs=6)   # 개머리판
            limb(P, grip + G(0, .02, .05), grip + G(0, -.16, .06), [(0, .024, .028), (1, .024, .028)], dark, None, segs=6)   # 기관부
            limb(P, grip + G(0, -.16, .065), grip + G(0, -.16, .065) + fwd * .5, [(0, .011, .011), (1, .009, .009)], dark, None, segs=6)   # 총열
            limb(P, grip + G(0, -.02, .11), grip + G(0, -.2, .11), [(0, .02, .02), (.15, .016, .016), (.85, .016, .016), (1, .022, .022)], dark, None, segs=8)   # 조준경
            limb(P, grip + G(0, -.1, .06), grip + G(0, -.12, -.01), [(0, .01, .016), (1, .01, .016)], dark, None, segs=5)   # 탄창
        # ── 35차: 멀리서부터 때리는 근접 무기 ──
        elif name == 'whip':   # 가죽 채찍: 짧은 손잡이, 앞으로 뻗었다 아래로 늘어지며 가늘어지는 끈
            leather = rmat('wood', .82, .05)
            limb(P, grip - d * .09, grip + d * .13, [(0, .019, .019), (.8, .017, .017), (1, .022, .022)], dark, None, segs=8)
            blob(P, grip - d * .1, (.022, .022, .022), metal, None, segs=8, rings=5)
            pts = [grip + d * .13]
            dv, n = d.copy(), 12
            for k in range(n):
                dv = (dv - up * .16 + side * .05).normalized()
                pts.append(pts[-1] + dv * .085)
            for k, (a, b) in enumerate(zip(pts, pts[1:])):
                r0, r1 = .016 * (1 - k / n) + .003, .016 * (1 - (k + 1) / n) + .003
                limb(P, a, b, [(0, r0, r0), (1, r1, r1)], leather, None, segs=5)
            blob(P, pts[-1], (.008, .008, .02), rmat('bandage', .7, .2), None, segs=5, rings=3)   # 끝 술
        elif name == 'spear':   # 장창: 사람 키를 넘는 나무 자루, 잎 모양 쇠 창날, 붉은 술
            red = rmat('crest', .45, .4)
            limb(P, grip - d * .55, grip + d * 1.2, [(0, .017, .017), (1, .015, .015)], wood, None, segs=8)
            limb(P, grip + d * 1.18, grip + d * 1.24, [(0, .02, .02), (1, .019, .019)], metal, None, segs=8)   # 물미
            limb(P, grip + d * 1.24, grip + d * 1.52, [(0, .01, .03), (.35, .009, .042), (1, .002, .003)], metal, None, segs=6)
            for k in range(6):
                a = k / 6 * math.pi * 2
                o = side * math.cos(a) * .022 + up * math.sin(a) * .022
                limb(P, grip + d * 1.2 + o, grip + d * 1.08 + o * 1.6 - up * .03, [(0, .008, .008), (1, .003, .003)], red, None, segs=4)
            blob(P, grip - d * .56, (.02, .02, .02), metal, None, segs=8, rings=4)
        elif name == 'gatebar':   # 아쉬갈: 불탄 성문에서 뽑은 쇠 빗장 (사슬이 감기고 끝이 달아올랐다)
            glowm = rmat('crest', .3, .75)
            limb(P, grip - d * .2, grip + d * 1.15, [(0, .04, .04), (.5, .045, .045), (1, .05, .05)], metal, None, segs=6)
            limb(P, grip + d * 1.15, grip + d * 1.3, [(0, .05, .05), (1, .045, .045)], glowm, None, segs=6)
            for t in (.25, .55, .85):   # 박힌 큰 징
                for sg in (1, -1):
                    blob(P, grip + d * t + up * sg * .05, (.025, .025, .025), dark, None, segs=6, rings=4)
            for k in range(9):   # 감긴 사슬
                t = .35 + k * .07
                blob(P, grip + d * t + side * (.055 if k % 2 else -.055), (.02, .015, .028), metal, None, segs=6, rings=4)
        ob = finish(P)
        # 16차: 작은 현실 무기는 화면에서 잘 보이게 키운다 (손 쥔 자리를 기준으로)
        k = {'knife': 1.45, 'dagger': 1.45, 'hammer': 1.45, 'hatchet': 1.45, 'pipe': 1.15, 'bat': 1.15, 'sword': 1.15, 'arming': 1.2, 'sickle': 1.45, 'wrench': 1.4, 'crowbar': 1.2, 'machete': 1.25, 'metalbat': 1.15, 'umbrella': 1.15, 'saber': 1.15, 'rapier': 1.1, 'katana': 1.1, 'spear': 1.4, 'whip': 1.3}.get(name, 1.0)
        if k != 1.0:
            for v in ob.data.vertices: v.co = grip + (v.co - grip) * k
        bind(ob, self.arm, rigid('hand.R'), subsurf=0)
        return self.add(g, ob)
