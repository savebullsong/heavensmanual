"""사람 한 명 조립: 체형(남·여) + 머리 모양 + 옷 + 무기"""
from rig import *

TORSO = {
    'm': [(.83, .140, .100, .000), (.90, .165, .110, .005), (.98, .165, .105, .000), (1.06, .150, .098, .000),
          (1.15, .156, .100, -.005), (1.25, .174, .108, -.010), (1.34, .186, .108, -.005), (1.41, .172, .095, .005), (1.46, .090, .065, .010)],
    'f': [(.83, .145, .100, .000), (.90, .178, .115, .010), (.98, .172, .108, .000), (1.07, .128, .088, .000),
          (1.16, .140, .092, -.005), (1.24, .156, .118, -.026), (1.31, .158, .105, -.010), (1.39, .150, .090, .000), (1.45, .080, .060, .010)],
}
BODY = {
    'm': dict(h=1.0, shoulder=.19, hipw=.095, arm=1.0, leg=1.0),
    'f': dict(h=.94, shoulder=.165, hipw=.092, arm=.86, leg=.94),
}

def person(look):
    sex = look.get('sex', 'm'); p = BODY[sex]; s = p['h']
    bones = skeleton(p); arm = make_armature(bones)
    V = lambda x, y, z: Vector((x, y, z)) * s
    skin = mat('skin', look.get('skin', '#d9a57f'), rough=.6, spec=.3)
    top = mat('top', look.get('top', '#7a2e2e'), rough=.85, spec=.15)
    bot = mat('bottom', look.get('bottom', '#2f3d5a'), rough=.8, spec=.15)
    shoe = mat('shoe', look.get('shoe', '#1e1b18'), rough=.5, spec=.4)
    hair = mat('hair', look.get('hair', '#1a1512'), rough=.45, spec=.5)
    dark = mat('eye', '#140e0c', rough=.3, spec=.6)

    # 몸통
    P = Part('torso')
    rings = [(V(0, cy, z), Vector((0, -1, 0)), Vector((1, 0, 0)), rx * s, ry * s) for z, rx, ry, cy in TORSO[sex]]
    hem = look.get('hem', 1.0) * s
    loft(P, rings, top, None, segs=14, matfn=lambda z: bot if z < hem else top)
    ob = finish(P); bind(ob, arm, lambda co: {'spine': smooth(co.z, .98 * s, 1.12 * s), 'hips': 1 - smooth(co.z, .98 * s, 1.12 * s)})

    # 목·머리·얼굴
    P = Part('neck')
    limb(P, V(0, .005, 1.40), V(0, .005, 1.53), [(0, .052 * s, .05 * s), (1, .047 * s, .046 * s)], skin, None)
    ob = finish(P); bind(ob, arm, lambda co: {'neck': 1.0})
    P = Part('head')
    hc = V(0, -.005, 1.615)
    blob(P, hc, (.092 * s, .104 * s, .122 * s), skin, None)
    for sx in (1, -1):
        blob(P, V(sx * .034, -.093, 1.625), (.014 * s, .008 * s, .011 * s), dark, None, segs=8, rings=5)
        blob(P, V(sx * .092, .0, 1.61), (.013 * s, .022 * s, .028 * s), skin, None, segs=8, rings=5)
    blob(P, V(0, -.106, 1.595), (.012 * s, .012 * s, .02 * s), skin, None, segs=8, rings=5)
    style = look.get('hairStyle', 'short')
    if style != 'none':
        if style == 'short':
            cut = lambda co: (co.y < -.025 * s and co.z < 1.672 * s) or co.z < 1.545 * s or (co.z < 1.60 * s and co.y < .03 * s)
            blob(P, V(0, .008, 1.632), (.101 * s, .114 * s, .128 * s), hair, None, segs=16, rings=12, cut=cut)
        else:  # long
            cut = lambda co: (co.y < -.03 * s and co.z < 1.665 * s and abs(co.x) < .078 * s) or co.z < 1.50 * s or (co.y < -.06 * s and co.z < 1.58 * s)
            blob(P, V(0, .006, 1.632), (.103 * s, .114 * s, .128 * s), hair, None, segs=16, rings=12, cut=cut)
            limb(P, V(0, .045, 1.64), V(0, .075, 1.27), [(0, .102 * s, .075 * s), (.4, .108 * s, .062 * s), (.8, .098 * s, .042 * s), (1, .085 * s, .03 * s)], hair, None, segs=12)
    ob = finish(P)
    hk = look.get('headScale', 1.12); hc2 = hc + Vector((0, 0, (hk - 1) * .10 * s))
    for v in ob.data.vertices: v.co = hc2 + (v.co - hc) * hk
    bind(ob, arm, lambda co: {'head': 1.0})

    # 팔
    am = p['arm'] * 1.15
    for k, sx in (('L', 1), ('R', -1)):
        sh, el = bones[f'upper_arm.{k}'][0], bones[f'upper_arm.{k}'][1]
        wr, hd = bones[f'forearm.{k}'][1], bones[f'hand.{k}'][1]
        P = Part(f'arm.{k}')
        limb(P, sh, el, [(0, .052 * am, .054 * am), (.5, .046 * am, .049 * am), (1, .038 * am, .040 * am)], skin, None)
        limb(P, el, wr, [(0, .038 * am, .040 * am), (.35, .037 * am, .041 * am), (1, .027 * am, .025 * am)], skin, None)
        blob(P, el, (.038 * am, .039 * am, .038 * am), skin, None, segs=10, rings=7)
        sl = look.get('sleeve', .45)
        if sl > 0:
            limb(P, sh + Vector((0, 0, .02)), sh + (el - sh) * sl, [(0, .064 * am, .064 * am), (1, .058 * am, .058 * am)], top, None)
        if sl > 1:
            limb(P, el, el + (wr - el) * (sl - 1), [(0, .046 * am, .046 * am), (1, .040 * am, .040 * am)], top, None)
        blob(P, sh + Vector((-sx * .015, 0, .0)), (.068 * am, .062 * am, .062 * am), top, None, segs=10, rings=7)
        ob = finish(P); bind(ob, arm, autow(bones, ['spine', f'upper_arm.{k}', f'forearm.{k}'], power=5))
        P = Part(f'hand.{k}')
        blob(P, (wr + hd) / 2 + Vector((0, -.008, .01)), (.026 * am, .032 * am, .05 * am), skin, None, segs=10, rings=7)
        ob = finish(P); bind(ob, arm, rigid(f'hand.{k}'))

    # 다리
    lg = p['leg']
    for k, sx in (('L', 1), ('R', -1)):
        hp, kn = bones[f'thigh.{k}'][0], bones[f'thigh.{k}'][1]
        an, toe = bones[f'shin.{k}'][1], bones[f'foot.{k}'][1]
        P = Part(f'leg.{k}')
        limb(P, hp + Vector((0, 0, .03)), kn, [(0, .085 * lg, .088 * lg), (.5, .071 * lg, .074 * lg), (1, .056 * lg, .059 * lg)], bot, None)
        limb(P, kn, an + Vector((0, 0, .02)), [(0, .056 * lg, .059 * lg), (.35, .053 * lg, .062 * lg), (1, .045 * lg, .047 * lg)], bot, None)
        blob(P, kn, (.057 * lg, .06 * lg, .057 * lg), bot, None, segs=10, rings=7)
        ob = finish(P); bind(ob, arm, autow(bones, ['hips', f'thigh.{k}', f'shin.{k}'], power=5))
        P = Part(f'shoe.{k}')
        c = Vector((an.x, -.035 * s, .045 * s))
        blob(P, c, (.05 * s, .122 * s, .052 * s), shoe, None, segs=12, rings=8, cut=lambda co: co.z < .0)
        ob = finish(P); bind(ob, arm, autow(bones, [f'shin.{k}', f'foot.{k}'], power=8))

    # 무기
    w = look.get('weapon')
    if w == 'bat':
        wood = mat('wood', '#c49a66', rough=.45, spec=.4)
        tape = mat('tape', '#2a2420', rough=.8)
        wr, hd = bones['forearm.R'][1], bones['hand.R'][1]
        g = (wr + hd) / 2 + Vector((0, -.008, 0))
        d = Vector((0, -.55, -.83)).normalized()
        P = Part('bat')
        limb(P, g - d * .07, g + d * .10, [(0, .021, .021), (1, .017, .017)], tape, None, segs=8)
        limb(P, g + d * .10, g + d * .78, [(0, .017, .017), (.4, .022, .022), (.85, .032, .032), (1, .031, .031)], wood, None, segs=8)
        ob = finish(P); bind(ob, arm, rigid('hand.R'), subsurf=0)
    return arm, bones
