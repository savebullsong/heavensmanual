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

SWING = [  # 준비 · 치켜듦 · 정점 · 내려침(맞힘) · 휘두름 끝 · 돌아옴
    _st(spine=[('X', -8), ('Z', -12)], hips=[('Z', -6)], upper_arm__R=[('X', -40), ('Y', 12)], forearm__R=[('X', -60)], hand__R=[('X', -20)], upper_arm__L=[('X', -42), ('Y', 18)], forearm__L=[('X', -72)]),
    _st(spine=[('X', 6), ('Z', -40)], hips=[('Z', -16)], thigh__L=[('X', -10)], shin__L=[('X', 10)], thigh__R=[('X', 16)], shin__R=[('X', 16)],
        upper_arm__R=[('X', -165), ('Y', 25)], forearm__R=[('X', -95)], upper_arm__L=[('X', -135), ('Y', 22)], forearm__L=[('X', -90)]),
    _st(spine=[('X', -6), ('Z', -18)], hips=[('Z', -4)], thigh__L=[('X', -28)], shin__L=[('X', 16)], thigh__R=[('X', 18)], shin__R=[('X', 12)],
        upper_arm__R=[('X', -150), ('Y', 8)], forearm__R=[('X', -40)], hand__R=[('X', 30)], upper_arm__L=[('X', -138), ('Y', 16)], forearm__L=[('X', -40)]),
    _st(spine=[('X', -24), ('Z', 10)], hips=[('Z', 8)], thigh__L=[('X', -36)], shin__L=[('X', 22)], thigh__R=[('X', 24)], shin__R=[('X', 16)],
        upper_arm__R=[('X', -88), ('Y', -4)], forearm__R=[('X', -6)], hand__R=[('X', 62)], upper_arm__L=[('X', -84), ('Y', 20)], forearm__L=[('X', -12)]),
    _st(spine=[('X', -26), ('Z', 26)], hips=[('Z', 14)], thigh__L=[('X', -36)], shin__L=[('X', 22)], thigh__R=[('X', 24)], shin__R=[('X', 16)],
        upper_arm__R=[('X', -40), ('Y', -18)], forearm__R=[('X', -10)], hand__R=[('X', 70)], upper_arm__L=[('X', -36), ('Y', 14)], forearm__L=[('X', -24)]),
    _st(spine=[('X', -12), ('Z', 6)], hips=[('Z', 2)], thigh__L=[('X', -22)], shin__L=[('X', 16)], thigh__R=[('X', 14)], shin__R=[('X', 12)],
        upper_arm__R=[('X', -34), ('Y', 8)], forearm__R=[('X', -50)], hand__R=[('X', 10)], upper_arm__L=[('X', -36), ('Y', 14)], forearm__L=[('X', -60)]),
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
    """땅바닥에 무릎을 세우고 앉아 고개를 떨군 자세 (지친 영혼)"""
    return {'thigh.L': [('X', -112), ('Y', -8)], 'shin.L': [('X', 122)], 'foot.L': [('X', -20)],
            'thigh.R': [('X', -106), ('Y', 8)], 'shin.R': [('X', 116)], 'foot.R': [('X', -18)],
            'hips': [], 'spine': [('X', -20)], 'head': [('X', 16)],
            'upper_arm.L': [('X', -58), ('Y', 4)], 'forearm.L': [('X', -42)],
            'upper_arm.R': [('X', -54), ('Y', -4)], 'forearm.R': [('X', -46)]}

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

EXTRA = {'heavy': HEAVY, 'sit': [sit()], 'idle2': [idle2()], 'walk2': [walk2(f / 8) for f in range(8)]}

def anims(mode):
    A = {'idle': [idle(mode)], 'walk': [walk(f / 8, mode) for f in range(8)], 'hit': hit(mode), 'fall': fall(mode)}
    if mode == 'u': A['punch'] = PUNCH
    if mode == 'm': A['swing'] = SWING
    if mode == 'g': A['shoot'] = SHOOT
    return A
