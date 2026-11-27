"""동작 정의. 각 장면 = {뼈: [(축, 각도)]}, 축은 처음 자세 기준 세계축 (앞 = -Y, 왼쪽 = +X).
X 음수 = 앞으로 듦, Z 양수 = 왼쪽으로 돎. 'pitch' = 몸 전체를 뒤로 눕히는 각도 (쓰러짐)."""
import math

def walk(t, mode='u'):
    s, c = math.sin(2 * math.pi * t), math.cos(2 * math.pi * t)
    kl = 8 + 44 * max(0, c) ** 1.5; kr = 8 + 44 * max(0, -c) ** 1.5
    tl, tr = -28 * s, 28 * s
    P = {
        'thigh.L': [('X', tl)], 'thigh.R': [('X', tr)],
        'shin.L': [('X', kl)], 'shin.R': [('X', kr)],
        'foot.L': [('X', -(tl + kl) * .8)], 'foot.R': [('X', -(tr + kr) * .8)],
        'hips': [('Z', -4 * s)], 'spine': [('X', -4), ('Z', 7 * s)], 'head': [('Z', -5 * s)],
        'upper_arm.L': [('X', 22 * s), ('Y', -6)], 'upper_arm.R': [('X', -22 * s), ('Y', 6)],
        'forearm.L': [('X', -(10 + 16 * max(0, -s)))], 'forearm.R': [('X', -(10 + 16 * max(0, s)))],
    }
    if mode == 'm':
        P['upper_arm.R'] = [('X', -8 * s - 8), ('Y', 8)]; P['forearm.R'] = [('X', -38)]
    elif mode == 'g':
        P['upper_arm.R'] = [('X', -6 * s - 10), ('Y', 8)]; P['forearm.R'] = [('X', -30)]
    return P

def idle(mode='u'):
    P = walk(0, mode)
    P.update({'thigh.L': [('X', 0)], 'thigh.R': [('X', 0)], 'shin.L': [('X', 4)], 'shin.R': [('X', 4)],
              'foot.L': [('X', -4)], 'foot.R': [('X', -4)], 'spine': [('X', -2)], 'hips': [], 'head': []})
    P['upper_arm.L'] = [('X', 2), ('Y', -6)]; P['forearm.L'] = [('X', -12)]
    if mode == 'u': P['upper_arm.R'] = [('X', 2), ('Y', 6)]; P['forearm.R'] = [('X', -12)]
    return P

STANCE = {'thigh.L': [('X', -16)], 'shin.L': [('X', 14)], 'thigh.R': [('X', 10)], 'shin.R': [('X', 12)], 'foot.L': [('X', 2)], 'foot.R': [('X', -20)]}

def _st(**kw):
    P = dict(STANCE); P.update({k.replace('__', '.'): v for k, v in kw.items()}); return P

# 39차: 한손 무기 — 더 크게 들어 올려 몸을 비틀며 아래 끝까지 베어 내린다 (반경이 넓고 무게가 실린다).
# 왼팔은 방패를 든 채 함께 휘두르지 않는다: 가슴 앞에서 막고 있다가, 베고 난 뒤 앞으로 밀어낸다
SWING = [  # 겨눔 · 크게 치켜듦 · 내리기 시작 · 베어 내림(맞힘) · 아래 끝까지 · 방패 밀며 돌아옴
    # 40차: 치켜들 때 허리를 뒤로 젖히던 것(맞고 고개가 넘어가는 것처럼 보였다)을 앞으로 숙인 채 어깨만 틀어 올리게.
    # 몸을 틀고 숙여도 고개는 늘 상대를 본다 (머리를 몸과 반대로 돌리고, 숙인 만큼 턱을 든다)
    _st(spine=[('X', -6), ('Z', -16)], hips=[('Z', -6)], head=[('Z', 10)], upper_arm__R=[('X', -62), ('Y', 22)], forearm__R=[('X', -72)], hand__R=[('X', -10)],
        upper_arm__L=[('X', -58), ('Y', 12)], forearm__L=[('X', -78)]),
    _st(spine=[('X', -5), ('Z', -36)], hips=[('Z', -14)], head=[('X', -6), ('Z', 26)], thigh__L=[('X', -8)], shin__L=[('X', 8)], thigh__R=[('X', 16)], shin__R=[('X', 16)],
        upper_arm__R=[('X', -176), ('Y', 40)], forearm__R=[('X', -100)], hand__R=[('X', -18)], upper_arm__L=[('X', -66), ('Y', 14)], forearm__L=[('X', -62)]),
    _st(spine=[('X', -10), ('Z', -24)], hips=[('Z', -10)], head=[('X', -2), ('Z', 18)], thigh__L=[('X', -30)], shin__L=[('X', 18)], thigh__R=[('X', 20)], shin__R=[('X', 14)],
        upper_arm__R=[('X', -168), ('Y', 18)], forearm__R=[('X', -38)], hand__R=[('X', 24)], upper_arm__L=[('X', -66), ('Y', 12)], forearm__L=[('X', -62)]),
    _st(spine=[('X', -26), ('Z', 14)], hips=[('Z', 8)], head=[('X', 12), ('Z', -8)], thigh__L=[('X', -44)], shin__L=[('X', 28)], thigh__R=[('X', 28)], shin__R=[('X', 18)],
        upper_arm__R=[('X', -96), ('Y', -6)], forearm__R=[('X', -4)], hand__R=[('X', 58)], upper_arm__L=[('X', -38), ('Y', 26)], forearm__L=[('X', -84)]),
    _st(spine=[('X', -34), ('Z', 36)], hips=[('Z', 16)], head=[('X', 16), ('Z', -20)], thigh__L=[('X', -46)], shin__L=[('X', 30)], thigh__R=[('X', 30)], shin__R=[('X', 18)],
        upper_arm__R=[('X', -14), ('Y', -34)], forearm__R=[('X', -8)], hand__R=[('X', 72)], upper_arm__L=[('X', -70), ('Y', 10)], forearm__L=[('X', -14)]),
    _st(spine=[('X', -14), ('Z', 10)], hips=[('Z', 4)], head=[('X', 6), ('Z', -6)], thigh__L=[('X', -24)], shin__L=[('X', 16)], thigh__R=[('X', 14)], shin__R=[('X', 12)],
        upper_arm__R=[('X', -40), ('Y', 12)], forearm__R=[('X', -58)], hand__R=[('X', 6)], upper_arm__L=[('X', -78), ('Y', 10)], forearm__L=[('X', -40)]),
]
# 39차: 단검·식칼·레이피어는 찌른다 — 허리춤으로 당겼다가 앞발을 내디디며 곧게 뻗는다 (왼팔은 뒤로 빼 균형)
STAB = [  # 겨눔 · 당김 · 찌름(맞힘) · 끝까지 · 돌아옴  (손목 각도 45° = 칼끝이 앞으로 곧게)
    _st(spine=[('X', -6), ('Z', -18)], hips=[('Z', -6)], upper_arm__R=[('X', -34), ('Y', -6)], forearm__R=[('X', -96)], hand__R=[('X', 20)],
        upper_arm__L=[('X', -60), ('Y', 18)], forearm__L=[('X', -60)]),
    _st(spine=[('X', 0), ('Z', -34)], hips=[('Z', -12)], thigh__R=[('X', 16)], shin__R=[('X', 16)],
        upper_arm__R=[('X', -8), ('Y', -12)], forearm__R=[('X', -120)], hand__R=[('X', 34)], upper_arm__L=[('X', -76), ('Y', 16)], forearm__L=[('X', -36)]),
    _st(spine=[('X', -20), ('Z', 22)], hips=[('Z', 10)], thigh__L=[('X', -46)], shin__L=[('X', 28)], thigh__R=[('X', 30)], shin__R=[('X', 18)],
        upper_arm__R=[('X', -92), ('Y', 2)], forearm__R=[('X', -2)], hand__R=[('X', 46)], upper_arm__L=[('X', -12), ('Y', 30)], forearm__L=[('X', -60)]),
    _st(spine=[('X', -26), ('Z', 26)], hips=[('Z', 12)], thigh__L=[('X', -48)], shin__L=[('X', 30)], thigh__R=[('X', 30)], shin__R=[('X', 18)],
        upper_arm__R=[('X', -96), ('Y', 0)], forearm__R=[('X', 0)], hand__R=[('X', 48)], upper_arm__L=[('X', -6), ('Y', 32)], forearm__L=[('X', -56)]),
    _st(spine=[('X', -10), ('Z', -6)], hips=[('Z', -2)], thigh__L=[('X', -20)], shin__L=[('X', 14)],
        upper_arm__R=[('X', -40), ('Y', -6)], forearm__R=[('X', -88)], hand__R=[('X', 28)], upper_arm__L=[('X', -56), ('Y', 18)], forearm__L=[('X', -60)]),
]
PUNCH = [  # 막기 · 당김 · 뻗음 · 돌아옴
    _st(spine=[('X', -6), ('Z', -10)], upper_arm__L=[('X', -45), ('Y', 14)], forearm__L=[('X', -110)], upper_arm__R=[('X', -38), ('Y', -6)], forearm__R=[('X', -118)]),
    _st(spine=[('X', -4), ('Z', -26)], hips=[('Z', -8)], upper_arm__L=[('X', -50), ('Y', 14)], forearm__L=[('X', -108)], upper_arm__R=[('X', -18), ('Y', -4)], forearm__R=[('X', -125)]),
    _st(spine=[('X', -12), ('Z', 22)], hips=[('Z', 8)], thigh__L=[('X', -24)], shin__L=[('X', 18)], upper_arm__L=[('X', -40), ('Y', 16)], forearm__L=[('X', -105)],
        upper_arm__R=[('X', -88), ('Y', 4)], forearm__R=[('X', -6)]),
    _st(spine=[('X', -6), ('Z', 0)], upper_arm__L=[('X', -42), ('Y', 14)], forearm__L=[('X', -100)], upper_arm__R=[('X', -40), ('Y', -4)], forearm__R=[('X', -100)]),
]
SHOOT = [  # 겨눔 · 쏨(반동) · 내림
    _st(spine=[('X', -4), ('Z', -8)], upper_arm__R=[('X', -84), ('Y', 2)], forearm__R=[('X', -4)], upper_arm__L=[('X', -72), ('Y', 26)], forearm__L=[('X', -36)]),
    _st(spine=[('X', 4), ('Z', -8)], upper_arm__R=[('X', -96), ('Y', 2)], forearm__R=[('X', -10)], upper_arm__L=[('X', -80), ('Y', 26)], forearm__L=[('X', -40)], head=[('X', 6)]),
    _st(spine=[('X', -2), ('Z', -4)], upper_arm__R=[('X', -62), ('Y', 4)], forearm__R=[('X', -20)], upper_arm__L=[('X', -45), ('Y', 18)], forearm__L=[('X', -40)]),
]

def _mod(base, **kw):
    P = {k: list(v) for k, v in base.items()}
    for k, v in kw.items():
        k = k.replace('__', '.'); P[k] = P.get(k, []) + v
    return P

def hit(mode='u'):
    b = idle(mode)
    return [_mod(b, spine=[('X', 14)], head=[('X', 16)], upper_arm__L=[('Y', -16)], upper_arm__R=[('Y', 16)], shin__L=[('X', 10)], shin__R=[('X', 10)]),
            _mod(b, spine=[('X', 6)], head=[('X', 6)], shin__L=[('X', 5)], shin__R=[('X', 5)])]

def fall(mode='u'):
    b = idle(mode)
    out = []
    for k, (pitch, kn, arm) in enumerate(((-18, 26, 30), (-48, 32, 45), (-76, 16, 55), (-90, 6, 62))):
        P = _mod(b, shin__L=[('X', kn)], shin__R=[('X', kn + 6)], thigh__L=[('X', -kn * .5)], thigh__R=[('X', -kn * .3)],
                 upper_arm__L=[('Y', -arm), ('X', -arm * .4)], upper_arm__R=[('Y', arm), ('X', -arm * .3)], head=[('X', 10 if pitch < -70 else 4)])
        if mode != 'u':   # 무기를 쥔 손은 옆으로 떨어뜨려 무기가 땅에 눕게
            P['upper_arm.R'] = [('Y', 40 + k * 14)]; P['forearm.R'] = [('X', -5)]; P['hand.R'] = [('X', 20 + k * 15)]
        P['pitch'] = pitch
        out.append(P)
    return out

# 16차: 양손 무기 내려찍기 (휘두름보다 크게 들어 올려 땅까지 내려친다) · 앉아 쉬는 자세
HEAVY = [  # 어깨에 멤 · 머리 위로 · 정점 · 내려찍음(맞힘) · 땅에 박힘 · 돌아옴
    _st(spine=[('X', 4), ('Z', -30)], hips=[('Z', -10)], upper_arm__R=[('X', -120), ('Y', 20)], forearm__R=[('X', -110)], upper_arm__L=[('X', -100), ('Y', 40)], forearm__L=[('X', -100)]),
    _st(spine=[('X', 12), ('Z', -14)], hips=[('Z', -4)], thigh__L=[('X', -8)], shin__L=[('X', 8)], thigh__R=[('X', 14)], shin__R=[('X', 14)],
        upper_arm__R=[('X', -172), ('Y', 12)], forearm__R=[('X', -75)], upper_arm__L=[('X', -168), ('Y', 26)], forearm__L=[('X', -75)]),
    _st(spine=[('X', -2), ('Z', -6)], thigh__L=[('X', -24)], shin__L=[('X', 14)], thigh__R=[('X', 18)], shin__R=[('X', 12)],
        upper_arm__R=[('X', -158), ('Y', 6)], forearm__R=[('X', -30)], hand__R=[('X', 20)], upper_arm__L=[('X', -152), ('Y', 24)], forearm__L=[('X', -32)]),
    _st(spine=[('X', -32), ('Z', 4)], hips=[('Z', 2)], thigh__L=[('X', -42)], shin__L=[('X', 28)], thigh__R=[('X', 26)], shin__R=[('X', 18)],
        upper_arm__R=[('X', -64), ('Y', -6)], forearm__R=[('X', -4)], hand__R=[('X', 66)], upper_arm__L=[('X', -62), ('Y', 30)], forearm__L=[('X', -10)]),
    _st(spine=[('X', -38), ('Z', 6)], hips=[('Z', 2)], thigh__L=[('X', -42)], shin__L=[('X', 30)], thigh__R=[('X', 26)], shin__R=[('X', 18)],
        upper_arm__R=[('X', -58), ('Y', -4)], forearm__R=[('X', -2)], hand__R=[('X', 72)], upper_arm__L=[('X', -56), ('Y', 30)], forearm__L=[('X', -6)]),
    _st(spine=[('X', -14), ('Z', -4)], thigh__L=[('X', -22)], shin__L=[('X', 16)], thigh__R=[('X', 14)], shin__R=[('X', 12)],
        upper_arm__R=[('X', -46), ('Y', 8)], forearm__R=[('X', -50)], upper_arm__L=[('X', -50), ('Y', 30)], forearm__L=[('X', -60)]),
]

def sit():
    """24차: 땅바닥에 무릎을 세우고 앉아 두 팔로 무릎을 감싸 안고 고개를 떨군 자세 (모닥불 앞의 지친 영혼).
    예전에는 두 팔을 앞으로 내밀어 좀비처럼 보였다"""
    return {'thigh.L': [('X', -108), ('Y', -6)], 'shin.L': [('X', 124)], 'foot.L': [('X', -20)],
            'thigh.R': [('X', -102), ('Y', 6)], 'shin.R': [('X', 118)], 'foot.R': [('X', -18)],
            'hips': [], 'spine': [('X', 24)], 'head': [('X', 22)],
            'upper_arm.L': [('X', -62), ('Y', 16)], 'forearm.L': [('X', -34)], 'hand.L': [('X', 10)],
            'upper_arm.R': [('X', -60), ('Y', -16)], 'forearm.R': [('X', -36)], 'hand.R': [('X', 10)]}

def lotus():
    """24차: 가부좌 — 두 무릎을 옆으로 벌려 바닥에 눕히고 정강이를 앞에서 엇걸어, 허리를 곧게 세우고 손을 무릎 위에 (경계의 세계의 완성자들)"""
    return {'thigh.L': [('X', -84), ('Z', -48)], 'shin.L': [('X', 150), ('Z', 26)], 'foot.L': [('X', -30)],
            'thigh.R': [('X', -84), ('Z', 48)], 'shin.R': [('X', 150), ('Z', -26)], 'foot.R': [('X', -30)],
            'hips': [], 'spine': [('X', 2)], 'head': [('X', 6)],
            'upper_arm.L': [('X', -16), ('Y', 14), ('Z', -10)], 'forearm.L': [('X', -48)], 'hand.L': [('X', 20)],
            'upper_arm.R': [('X', -16), ('Y', -14), ('Z', 10)], 'forearm.R': [('X', -48)], 'hand.R': [('X', 20)]}

# 19차: 양손 무기를 싸우지 않을 때도 두 손으로 든다 — 오른손이 아래, 왼손이 위를 잡고 칼끝은 앞 위로 비스듬히 (중단 겨눔)
HOLD2 = {'upper_arm.R': [('X', -28), ('Y', -14)], 'forearm.R': [('X', -62)], 'hand.R': [('X', -26)],
         'upper_arm.L': [('X', -36), ('Y', 24)], 'forearm.L': [('X', -70)]}

def idle2():
    P = idle('m'); P.update({k: list(v) for k, v in HOLD2.items()}); return P

def walk2(t):
    P = walk(t, 'm'); s = math.sin(2 * math.pi * t)
    P.update({k: list(v) for k, v in HOLD2.items()})
    P['upper_arm.R'] = [('X', -28 - 3 * s), ('Y', -14)]; P['upper_arm.L'] = [('X', -36 - 3 * s), ('Y', 24)]
    return P

# ── 42차: 주요 인물의 고유 동작 (gest) — 서 있다가 가끔 한 번 ──
def _g(**kw):
    P = idle('u'); P.update({k.replace('__', '.'): v for k, v in kw.items()}); return P
GEST = {
    # 파샤르: 왼팔에 든 장부를 가슴께로 들어 깃펜으로 적는다 (펜 끝이 짧게 오간다)
    'write': [_g(upper_arm__L=[('X', -38), ('Y', 14)], forearm__L=[('X', -84)], upper_arm__R=[('X', -30 - 4 * (k % 2)), ('Y', -10), ('Z', 6 * ((k % 3) - 1))], forearm__R=[('X', -92 + 6 * (k % 2))], hand__R=[('X', 10 * ((k + 1) % 2))], head=[('X', 14)])
              for k in range(6)],
    # 루엔: 등불을 천천히 들어 앞을 비춘다 (들었다가 내린다)
    'lantern': [_g(upper_arm__L=[('X', -a), ('Y', 8)], forearm__L=[('X', -20 - a * 0.3)], head=[('X', -a * 0.08)]) for a in (20, 50, 80, 95, 80, 40)],
    # 할아버지: 오른손으로 안경을 고쳐 쓴다 (고개를 살짝 숙였다 든다)
    'glasses': [_g(upper_arm__R=[('X', -a), ('Y', -12)], forearm__R=[('X', -a * 1.45)], hand__R=[('X', -10)], head=[('X', 8 - a * 0.1)], spine=[('X', 6)]) for a in (20, 45, 62, 66, 60, 30)],
    # 불다: 랩 한 소절 — 오른팔을 내리찍듯 박자를 타고 고개를 끄덕인다
    'rap': [_g(upper_arm__R=[('X', -60 + 30 * (k % 2)), ('Y', -20)], forearm__R=[('X', -70 + 40 * (k % 2))], hand__R=[('X', 20 * (k % 2))],
               upper_arm__L=[('X', -20), ('Y', 14)], forearm__L=[('X', -40)], head=[('X', 10 * (k % 2))], spine=[('Z', 6 * (1 if k % 4 < 2 else -1))])
            for k in range(6)],
    # 43차 황색날개: 두 손을 가슴에 모았다가 천천히 펼쳐 맞이한다
    'welcome': [_g(upper_arm__L=[('X', -a), ('Y', b)], upper_arm__R=[('X', -a), ('Y', -b)], forearm__L=[('X', -c)], forearm__R=[('X', -c)], head=[('X', -4)])
                for a, b, c in ((20, -4, 60), (34, -10, 96), (36, -10, 100), (40, 30, 50), (36, 52, 26), (20, 18, 20))],
    # 마스크 소녀: 바구니를 앞으로 들어 보인다 (고개를 갸웃)
    'offer': [_g(upper_arm__L=[('X', -a), ('Y', 6)], forearm__L=[('X', -30 - a * .4)], head=[('Z', b), ('X', 6)]) for a, b in ((10, 0), (34, 6), (52, 10), (56, 10), (44, 6), (18, 0))],
    # 칼드렉: 망치를 높이 들었다가 모루 위로 내려친다 (내려칠 때 허리가 굽는다)
    'hammer': [_g(upper_arm__R=[('X', -a), ('Y', -14)], forearm__R=[('X', -b)], spine=[('X', c)], head=[('X', c * .5)])
               for a, b, c in ((40, 60, 0), (110, 70, -6), (150, 40, -8), (70, 20, 14), (40, 30, 18), (30, 50, 6))],
    # 오볼로: 두 손을 앞에 모으고 동전을 세듯 오른손 끝을 튕긴다 (고개를 숙여 본다)
    'count': [_g(upper_arm__L=[('X', -26), ('Y', 8)], forearm__L=[('X', -78)], upper_arm__R=[('X', -28), ('Y', -8)], forearm__R=[('X', -84 + 8 * (k % 2))], hand__R=[('X', 22 * (k % 2))], head=[('X', 16)])
              for k in range(6)],
    # 노을: 장검을 얼굴 앞에 세워 경례하고 내린다
    'blade': [_g(upper_arm__R=[('X', -a), ('Y', -6)], forearm__R=[('X', -b)], hand__R=[('X', c)], head=[('X', -2)])
              for a, b, c in ((14, 20, 0), (40, 80, -40), (56, 112, -70), (58, 116, -74), (40, 70, -30), (16, 22, 0))],
    # 마리: 두 손을 들어 실을 당긴다 — 손가락 끝이 번갈아 까딱인다
    'strings': [_g(upper_arm__L=[('X', -48), ('Y', 10)], forearm__L=[('X', -40)], hand__L=[('X', 24 * (k % 2))],
                   upper_arm__R=[('X', -52), ('Y', -10)], forearm__R=[('X', -36)], hand__R=[('X', 24 * ((k + 1) % 2))], head=[('Z', 8 * ((k % 3) - 1))])
                for k in range(6)],
}
EXTRA = {'stab': STAB, 'heavy': HEAVY, 'sit': [sit()], 'lotus': [lotus()], 'idle2': [idle2()], 'walk2': [walk2(f / 8) for f in range(8)]}

def anims(mode):
    A = {'idle': [idle(mode)], 'walk': [walk(f / 8, mode) for f in range(8)], 'hit': hit(mode), 'fall': fall(mode)}
    if mode == 'u': A['punch'] = PUNCH
    if mode == 'm': A['swing'] = SWING
    if mode == 'g': A['shoot'] = SHOOT
    return A
