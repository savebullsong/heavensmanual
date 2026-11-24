"""우주새 상점 안을 굽는다: 방 배경(낮·밤), 카운터, 매달린 등, 유황앵무(볏 내림·세움).
게임의 방 좌표(타일 i, j, 높이 px)와 똑같이 놓는다. 원점(0,0,0) = 방 뒤 구석.
사용법: python3 shop.py <출력폴더>"""
import sys, os, json, math, random
import bpy, bmesh, addon_utils
import numpy as np
from mathutils import Vector, Matrix
from PIL import Image
addon_utils.enable('cycles', default_set=True)
bpy.ops.wm.read_factory_settings(use_empty=True)
OUT = sys.argv[1]; os.makedirs(OUT, exist_ok=True)
TMP = f'/tmp/shop_{os.getpid()}'; os.makedirs(TMP, exist_ok=True)
MPP = .034; SS = 2
T = 32 * MPP / math.sqrt(.5); ZP = .866 / MPP
RW, RD, WH = 9, 8, 80
sc = bpy.context.scene; col = sc.collection
sc.render.film_transparent = True; sc.view_settings.view_transform = 'Standard'; sc.render.dither_intensity = 0
sc.render.image_settings.file_format = 'PNG'; sc.render.image_settings.color_mode = 'RGBA'
sc.render.engine = 'CYCLES'; sc.cycles.device = 'CPU'; sc.cycles.samples = 64; sc.cycles.use_denoising = False
sc.cycles.max_bounces = 4; sc.cycles.filter_width = 1.5
world = bpy.data.worlds.new('w'); sc.world = world
bgn = world.node_tree.nodes['Background']; bgn.inputs[0].default_value = (.45, .42, .4, 1); bgn.inputs[1].default_value = .35
cam_d = bpy.data.cameras.new('cam'); cam_d.type = 'ORTHO'
cam = bpy.data.objects.new('cam', cam_d); col.objects.link(cam); sc.camera = cam
ROT = Matrix.Rotation(math.radians(45), 3, 'Z') @ Matrix.Rotation(math.radians(60), 3, 'X')
UP = ROT @ Vector((0, 1, 0)); FWD = ROT @ Vector((0, 0, -1)); RIGHT = ROT @ Vector((1, 0, 0))
def frame(W, H, ax, ay):
    sc.render.resolution_x = W * SS; sc.render.resolution_y = H * SS
    cam_d.ortho_scale = max(W, H) * MPP
    off = UP * ((ay - H / 2) * MPP) - RIGHT * ((ax - W / 2) * MPP)
    cam.matrix_world = Matrix.Translation(off - FWD * 60) @ ROT.to_4x4()
def G(i, j, zpx=0.0): return Vector((i * T, -j * T, zpx / ZP))

def lin(h): return tuple((((int(h[k:k + 2], 16) / 255) + .055) / 1.055) ** 2.4 for k in (1, 3, 5))
_m = {}
def mat(name, hexcol, rough=.7, metal=0., emit=0., tex=None, scale=6., glass=False):
    key = (name, hexcol, rough, metal, emit, tex, scale)
    if key in _m: return _m[key]
    m = bpy.data.materials.new(name)
    try: m.use_nodes = True
    except Exception: pass
    N, L = m.node_tree.nodes, m.node_tree.links; b = N['Principled BSDF']
    c = lin(hexcol)
    b.inputs['Base Color'].default_value = (*c, 1); b.inputs['Roughness'].default_value = rough; b.inputs['Metallic'].default_value = metal
    if glass:
        b.inputs['Transmission Weight'].default_value = .9; b.inputs['Roughness'].default_value = .05
    if emit:
        b.inputs['Emission Color'].default_value = (*c, 1); b.inputs['Emission Strength'].default_value = emit
    if tex:
        tc = N.new('ShaderNodeTexCoord')
        if tex == 'planks':
            br = N.new('ShaderNodeTexBrick'); br.inputs['Scale'].default_value = scale; br.inputs['Mortar Size'].default_value = .008
            br.offset = .37; br.squash = 3.5; br.squash_frequency = 1
            br.inputs['Color1'].default_value = (*c, 1); br.inputs['Color2'].default_value = (*[x * .78 for x in c], 1); br.inputs['Mortar'].default_value = (*[x * .45 for x in c], 1)
            br.inputs['Brick Width'].default_value = 1.6; br.inputs['Row Height'].default_value = .2
            L.new(tc.outputs['Object'], br.inputs['Vector']); L.new(br.outputs['Color'], b.inputs['Base Color'])
        else:
            nz = N.new('ShaderNodeTexNoise'); nz.inputs['Scale'].default_value = scale; nz.inputs['Detail'].default_value = 8
            L.new(tc.outputs['Object'], nz.inputs['Vector'])
            rp = N.new('ShaderNodeValToRGB')
            k = .3 if tex == 'damask' else .14
            rp.color_ramp.elements[0].color = (*[x * (1 - k) for x in c], 1); rp.color_ramp.elements[1].color = (*[min(1, x * (1 + k)) for x in c], 1)
            L.new(nz.outputs['Fac'], rp.inputs['Fac']); L.new(rp.outputs['Color'], b.inputs['Base Color'])
    _m[key] = m
    return m
def imgmat(path, strength=1.0):
    m = bpy.data.materials.new('img')
    try: m.use_nodes = True
    except Exception: pass
    N, L = m.node_tree.nodes, m.node_tree.links
    for n in list(N):
        if n.type != 'OUTPUT_MATERIAL': N.remove(n)
    it = N.new('ShaderNodeTexImage'); it.image = bpy.data.images.load(path); it.interpolation = 'Closest'
    em = N.new('ShaderNodeEmission'); em.inputs['Strength'].default_value = strength
    L.new(it.outputs['Color'], em.inputs['Color']); L.new(em.outputs['Emission'], N['Material Output'].inputs['Surface'])
    return m

def gbox(i0, i1, j0, j1, z0, z1, m, bevel=.008):
    a, b = G(i0, j1, z0), G(i1, j0, z1)
    me = bpy.data.meshes.new('b'); bm = bmesh.new(); bmesh.ops.create_cube(bm, size=1)
    for v in bm.verts: v.co = Vector(((a.x + b.x) / 2 + v.co.x * abs(b.x - a.x), (a.y + b.y) / 2 + v.co.y * abs(b.y - a.y), (a.z + b.z) / 2 + v.co.z * abs(b.z - a.z)))
    bm.to_mesh(me); bm.free(); me.materials.append(m)
    o = bpy.data.objects.new('b', me); col.objects.link(o)
    if bevel: bv = o.modifiers.new('bv', 'BEVEL'); bv.width = bevel; bv.segments = 1
    return o
def cylw(p, axis, length, r, m, seg=14):
    me = bpy.data.meshes.new('c'); bm = bmesh.new()
    bmesh.ops.create_cone(bm, cap_ends=True, segments=seg, radius1=r, radius2=r, depth=length)
    bm.to_mesh(me); bm.free(); me.materials.append(m)
    o = bpy.data.objects.new('c', me); col.objects.link(o); o.location = p
    if axis == 'X': o.rotation_euler = (0, math.pi / 2, 0)
    if axis == 'Y': o.rotation_euler = (math.pi / 2, 0, 0)
    for f in me.polygons: f.use_smooth = True
    return o
def rod(a, b, r, m, seg=8):
    d = b - a; o = cylw((a + b) / 2, 'Z', d.length, r, m, seg)
    o.rotation_mode = 'QUATERNION'; o.rotation_quaternion = d.normalized().to_track_quat('Z', 'Y')
    return o
def ball(p, r, m, s=(1, 1, 1)):
    me = bpy.data.meshes.new('s'); bm = bmesh.new(); bmesh.ops.create_uvsphere(bm, u_segments=16, v_segments=10, radius=r)
    bm.to_mesh(me); bm.free(); me.materials.append(m)
    o = bpy.data.objects.new('s', me); col.objects.link(o); o.location = p; o.scale = s
    for f in me.polygons: f.use_smooth = True
    return o
def torus(p, R, r, m):
    me = bpy.data.meshes.new('t'); bm = bmesh.new()
    seg, sides = 18, 8
    verts = []
    for i in range(seg):
        a = 2 * math.pi * i / seg; ring = []
        for k in range(sides):
            b = 2 * math.pi * k / sides
            ring.append(bm.verts.new(((R + r * math.cos(b)) * math.cos(a), (R + r * math.cos(b)) * math.sin(a), r * math.sin(b))))
        verts.append(ring)
    for i in range(seg):
        for k in range(sides):
            bm.faces.new([verts[i][k], verts[(i + 1) % seg][k], verts[(i + 1) % seg][(k + 1) % sides], verts[i][(k + 1) % sides]])
    bm.to_mesh(me); bm.free(); me.materials.append(m)
    o = bpy.data.objects.new('t', me); col.objects.link(o); o.location = p
    for f in me.polygons: f.use_smooth = True
    return o
def tag(objs, layer):
    for o in objs: o['layer'] = layer
def new_objs(fn):
    before = set(col.objects); fn(); return [o for o in col.objects if o not in before]

# ───────── 창밖 풍경 (낮·밤) ─────────
def sky_png(night):
    W, H = 160, 64; rng = random.Random(9)
    a = np.zeros((H, W, 3))
    top, low = (np.array([15, 20, 40]), np.array([29, 36, 64])) if night else (np.array([127, 176, 220]), np.array([200, 222, 236]))
    for y in range(H): a[y] = top + (low - top) * (y / H)
    x = 0
    while x < W:
        bw = rng.randint(7, 16); bh = rng.randint(14, 54)
        colb = np.array([26, 32, 54]) if night else np.array([110, 118, 134])
        a[H - bh:, x:x + bw] = colb
        if night:
            for _ in range(bh // 3):
                if rng.random() < .5: a[H - bh + rng.randint(2, max(3, bh - 3)), min(W - 1, x + rng.randint(1, max(2, bw - 2)))] = (242, 213, 138)
        x += bw + rng.randint(1, 3)
    p = f'{TMP}/sky_{int(night)}.png'; Image.fromarray(a.astype(np.uint8)).save(p); return p

# ───────── 방 ─────────
def room(night):
    floor = mat('floor', '#5e3e29', .55, tex='planks', scale=2.2)
    dark = mat('dark', '#2a1a10', .7); wood = mat('wood', '#4b3120', .55, tex='noise', scale=14); woodl = mat('woodl', '#7a5434', .5, tex='noise', scale=14)
    paper = mat('paper', '#2f4036', .9, tex='damask', scale=30); brass = mat('brass', '#c9a23e', .3, .9)
    rug = mat('rug', '#7a2a26', .95, tex='noise', scale=20); rugb = mat('rugb', '#c9a23e', .9); rugd = mat('rugd', '#5a1a1c', .95)
    # 바닥 (앞쪽 가장자리 두께 10px)
    gbox(0, RW, 0, RD, -10, 0, floor, bevel=0)
    gbox(2.2, 7.4, 3.7, 6.8, 0, .6, rugb, bevel=0); gbox(2.3, 7.3, 3.8, 6.7, .6, 1.0, rug, bevel=0); gbox(3.2, 6.4, 4.5, 6.0, 1.0, 1.2, rugd, bevel=0)
    # 오른쪽 뒤 벽 (j = 0 면) · 왼쪽 뒤 벽 (i = 0 면)
    for horiz in (True, False):
        if horiz:
            gbox(-.25, RW, -.25, 0, 0, WH, paper, bevel=0)
            gbox(0, RW, -.05, .02, 0, 24, wood, bevel=0); gbox(0, RW, -.05, .05, 24, 27, woodl); gbox(0, RW, -.05, .06, WH - 5, WH, wood)
        else:
            gbox(-.25, 0, -.25, RD, 0, WH, paper, bevel=0)
            gbox(-.05, .02, 0, RD, 0, 24, wood, bevel=0); gbox(-.05, .05, 0, RD, 24, 27, woodl); gbox(-.05, .06, 0, RD, WH - 5, WH, wood)
    for k in range(int(RW / .75)):   # 아래 나무판 무늬
        gbox(.1 + k * .75, .7 + k * .75, .02, .05, 4, 20, dark, bevel=.004)
    for k in range(int(RD / .75)):
        gbox(.02, .05, .1 + k * .75, .7 + k * .75, 4, 20, dark, bevel=.004)
    # 창 (j 3.9~5.35, 높이 30~62)
    sky = imgmat(sky_png(night), 1.0 if not night else .9)
    gbox(-.3, -.26, 3.9, 5.35, 30, 62, sky, bevel=0)
    gbox(-.26, .0, 3.9, 5.35, 30, 62, mat('hole', '#000000', .9), bevel=0).hide_render = True
    # 창틀: 구멍 대신 테두리와 가운데 살을 벽 앞에 둔다
    for (a, b, c, d) in ((3.82, 3.9, 28, 64), (5.35, 5.43, 28, 64), (3.82, 5.43, 62, 64.5), (3.82, 5.43, 27, 30)):
        gbox(-.02, .06, a, b, c, d, dark)
    gbox(-.02, .04, 4.6, 4.65, 30, 62, dark); gbox(-.02, .04, 3.9, 5.35, 50, 51.5, dark)
    gbox(.0, .12, 3.78, 5.47, 28, 30, woodl)
    # 창 유리 자리는 벽을 비워야 한다 → 벽지 앞에 하늘 판을 붙인다 (밖이 보이는 것처럼)
    gbox(.0, .01, 3.9, 5.35, 30, 62, sky, bevel=0)
    # 문 (j 5.9~7.1, 높이 56)
    gbox(-.02, .05, 5.84, 7.16, 0, 58, dark)
    door = mat('door', '#6b4429', .55, tex='noise', scale=16)
    gbox(.05, .08, 5.9, 7.1, 0, 56, door)
    gbox(.08, .1, 6.0, 7.0, 40, 52, sky, bevel=0)
    gbox(.08, .1, 6.48, 6.52, 40, 52, dark, bevel=0)
    for z0 in (8, 24):
        gbox(.08, .1, 6.02, 6.48, z0, z0 + 12, mat('doorp', '#5a3822', .6)); gbox(.08, .1, 6.52, 6.98, z0, z0 + 12, mat('doorp', '#5a3822', .6))
    ball(G(.12, 6.0, 30) + Vector((0, 0, 0)), .035, brass)
    ball(G(.08, 6.5, 60), .05, brass)   # 문 위 종
    # 벽시계 (바늘은 게임에서 그린다)
    cylw(G(.04, 3.55, 68), 'X', .03, .16, brass); cylw(G(.06, 3.55, 68), 'X', .02, .13, mat('face', '#e8dcc0', .6))
    # 무기 걸이판 (j 0.7~3.1, 높이 28~76)
    board = mat('board', '#6e5236', .8, tex='noise', scale=30)
    gbox(.0, .05, .7, 3.1, 28, 76, board); gbox(-.01, .06, .66, 3.14, 27, 28.5, dark); gbox(-.01, .06, .66, 3.14, 75.5, 77, dark)
    weapons_on_board()
    # 진열장
    shelves()
    # 마네킹 (헬멧 + 방호 조끼)
    stand = mat('stand', '#5a3d26', .6); vest = mat('vest', '#3a3f46', .7); helm = mat('helm', '#2b2f36', .3, .2); visor = mat('visor', '#7fa6c2', .1, .3)
    c = G(1.0, 1.15, 0)
    cylw(c + Vector((0, 0, .02)), 'Z', .04, .2, dark); cylw(c + Vector((0, 0, .45)), 'Z', .9, .025, stand)
    ball(c + Vector((0, 0, 1.2)), .2, vest, (1.05, .8, 1.5))
    ball(c + Vector((0, 0, 1.62)), .1, mat('mq', '#c9b48a', .5), (1, 1, 1.2))
    ball(c + Vector((0, 0, 1.7)), .13, helm, (1, 1, .85)); gbox(.94, 1.06, 1.17, 1.24, 41, 43.5, visor, bevel=0)
    # 손님 쪽: 창 아래 긴 의자, 우산꽂이, 화분
    gbox(.05, .55, 4.0, 5.3, 9, 12, woodl); gbox(.08, .52, 4.05, 4.15, 0, 9, wood); gbox(.08, .52, 5.15, 5.25, 0, 9, wood)
    um = G(.45, 7.45, 0)
    cylw(um + Vector((0, 0, .25)), 'Z', .5, .13, mat('umb', '#3a3f46', .4, .5))
    rod(um + Vector((-.03, 0, .3)), um + Vector((-.08, .02, .95)), .02, mat('uh', '#14100c', .5)); rod(um + Vector((.04, 0, .3)), um + Vector((.07, -.03, .9)), .025, mat('ur', '#5a1a1c', .6))
    pt = G(8.5, 4.5, 0)
    cylw(pt + Vector((0, 0, .2)), 'Z', .4, .2, mat('pot', '#8a4a2e', .8))
    rnd = random.Random(3); leaf = mat('leaf', '#3f6a34', .7); leaf2 = mat('leaf2', '#5a8a44', .7)
    for k in range(16):
        a = rnd.random() * 6.28; d = .05 + rnd.random() * .28
        ball(pt + Vector((math.cos(a) * d, math.sin(a) * d, .55 + rnd.random() * .6)), .12 + rnd.random() * .06, leaf if k % 3 else leaf2, (1, 1, .6))

def weapons_on_board():
    wood = mat('wbat', '#c49a66', .45); metal = mat('steel', '#9aa3ad', .25, .9); dark = mat('wdk', '#2a2420', .6); handle = mat('handle', '#8a6238', .5)
    x = .07
    P = lambda j, z: G(x, j, z)
    rod(P(.95, 34), P(1.05, 72), .03, wood); rod(P(.95, 34), P(.97, 40), .022, dark)              # 배트
    rod(P(1.3, 33), P(1.3, 73), .022, metal)                                                         # 쇠파이프
    rod(P(1.62, 40), P(1.62, 66), .018, handle); gbox(x - .02, x + .02, 1.52, 1.78, 63, 69, metal)  # 손도끼
    rod(P(1.95, 36), P(1.95, 64), .018, handle); gbox(x - .02, x + .02, 1.85, 2.05, 64, 74, metal)  # 삽
    rod(P(2.3, 34), P(2.3, 70), .012, metal); gbox(x - .02, x + .02, 2.2, 2.4, 40, 41.5, mat('gold', '#c9a23e', .3, .8)); rod(P(2.3, 34), P(2.3, 40), .018, dark)  # 장검
    rod(P(2.62, 52), P(2.62, 66), .01, metal); rod(P(2.62, 46), P(2.62, 52), .016, dark)             # 단검
    rod(P(2.85, 54), P(2.85, 66), .012, metal); rod(P(2.85, 48), P(2.85, 54), .016, dark)            # 식칼
    rod(P(2.7, 32), P(2.7, 42), .014, handle); gbox(x - .02, x + .02, 2.62, 2.8, 41, 44, metal)    # 장도리
    gbox(x - .02, x + .03, 2.88, 3.05, 34, 37, mat('gun', '#1e2024', .4, .5)); gbox(x - .02, x + .03, 2.88, 2.94, 30, 34, mat('gun', '#1e2024', .4, .5))  # 권총
    for j in (1.0, 1.3, 1.62, 1.95, 2.3, 2.62, 2.85, 2.97):
        ball(P(j, 72), .015, mat('peg', '#2a1a10', .6))

def shelves():
    S = dict(x0=.3, x1=8.8, d=.55, h=66, levels=[4, 18, 32, 46, 60])
    dark = mat('sd', '#24170f', .7); board = mat('sb', '#5a3d26', .55, tex='noise', scale=20); edge = mat('se', '#7a5434', .5)
    gbox(S['x0'], S['x1'], 0, .04, 0, S['h'], dark, bevel=0)
    for z in S['levels']:
        gbox(S['x0'], S['x1'], 0, S['d'], z - 2, z, board); gbox(S['x0'], S['x1'], S['d'] - .03, S['d'], z - 3, z, edge)
    bays = [S['x0'], 2.4, 4.5, 6.6, S['x1']]
    for xb in bays: gbox(xb - .05, xb + .05, 0, S['d'] + .02, 0, S['h'] + 2, mat('post', '#4a301e', .6))
    gbox(S['x0'] - .08, S['x1'] + .08, 0, S['d'] + .05, S['h'] + 2, S['h'] + 7, board)
    # 값표
    for z in S['levels']:
        x = S['x0'] + .4
        while x < S['x1']:
            gbox(x, x + .08, S['d'] + .005, S['d'] + .01, z - 2.6, z - 1, mat('tag', '#e8e2d0', .8), bevel=0); x += .7
    def row(bay, level, maker, step):
        a, b = bays[bay] + .2, bays[bay + 1] - .15
        x = a + step / 2; k = 0
        while x < b - step / 4:
            maker(G(x, .28, S['levels'][level]), k); x += step; k += 1
    chips = mat('chips', '#d99a2b', .5); choco = mat('choco', '#6a2a1c', .6); cola = mat('cola', '#b0302a', .3, .3); water = mat('water', '#9fcbe4', .15)
    cap = mat('cap', '#2f6fb8', .5); white = mat('white', '#ece8de', .6); blue = mat('blueband', '#3a7fb8', .6); rope = mat('rope', '#c9a86a', .9)
    crate = mat('crate', '#8a7048', .8, tex='noise', scale=12); helm = mat('helm2', '#2b2f36', .3, .2); olive = mat('olive', '#4a5236', .9); gray = mat('gray', '#3a3f46', .9)
    navy = mat('navy', '#2f3c55', .9); boot = mat('boot', '#5a3a22', .6); candle = mat('candle', '#efe6d0', .7); jar = mat('jar', '#9fb8c0', .2); green = mat('greenbox', '#4a5a3a', .7); blk = mat('blk', '#2a2420', .6)
    gold = mat('gold2', '#c9a23e', .4, .6)
    # 0번 칸: 먹을 것
    row(0, 4, lambda p, k: ball(p + Vector((0, 0, .14)), .1, chips, (1, .55, 1.3)), .3)
    row(0, 3, lambda p, k: gbox_at(p, .12, .08, .07, choco, gold), .34)
    row(0, 2, lambda p, k: cylw(p + Vector((0, 0, .07)), 'Z', .14, .035, cola), .13)
    row(0, 1, lambda p, k: (cylw(p + Vector((0, 0, .13)), 'Z', .26, .045, water), cylw(p + Vector((0, 0, .28)), 'Z', .04, .022, cap)), .17)
    row(0, 0, lambda p, k: gbox_at(p, .4, .3, .3, crate), .55)
    # 1번 칸: 생활용품
    row(1, 4, lambda p, k: gbox_at(p, .2, .12, .14, white, blue), .3)
    row(1, 3, lambda p, k: cylw(p + Vector((0, 0, .05)), 'Z', .1, .08, white), .24)
    row(1, 2, lambda p, k: torus(p + Vector((0, 0, .06)), .13, .045, rope), .42)
    row(1, 1, lambda p, k: gbox_at(p, .18, .12, .06, mat('match', '#d1a83a', .6)), .32)
    row(1, 0, lambda p, k: gbox_at(p, .45, .3, .34, mat('crate2', '#5a3d26', .8)), .62)
    # 2번 칸: 방어구
    row(2, 4, lambda p, k: (ball(p + Vector((0, 0, .02)), .14, helm, (1, 1, .8)),), .38)
    row(2, 3, lambda p, k: [gbox_at(p + Vector((0, 0, n * .05)), .3, .22, .05, olive) for n in range(3)], .42)
    row(2, 2, lambda p, k: [gbox_at(p + Vector((0, 0, n * .05)), .3, .22, .05, gray) for n in range(4)], .42)
    row(2, 1, lambda p, k: [gbox_at(p + Vector((0, 0, n * .05)), .3, .22, .05, navy) for n in range(3)], .42)
    row(2, 0, lambda p, k: (gbox_at(p + Vector((-.06, 0, 0)), .1, .26, .2, boot), gbox_at(p + Vector((.06, 0, 0)), .1, .26, .2, boot)), .36)
    # 3번 칸: 잡화
    row(3, 4, lambda p, k: cylw(p + Vector((0, 0, .1)), 'Z', .2, .03, candle), .22)
    row(3, 3, lambda p, k: (cylw(p + Vector((0, 0, .09)), 'Z', .18, .06, jar), cylw(p + Vector((0, 0, .19)), 'Z', .03, .055, mat('lid', '#6b4a30', .6))), .3)
    row(3, 2, lambda p, k: gbox_at(p, .2, .14, .12, green, white), .28)
    row(3, 1, lambda p, k: gbox_at(p, .22, .14, .14, blk, gold), .34)
    row(3, 0, lambda p, k: gbox_at(p, .42, .3, .36, mat('crate3', '#6a5a40', .8)), .6)

def gbox_at(p, sx, sy, sz, m, band=None):
    me = bpy.data.meshes.new('i'); bm = bmesh.new(); bmesh.ops.create_cube(bm, size=1)
    for v in bm.verts: v.co = Vector((p.x + v.co.x * sx, p.y + v.co.y * sy, p.z + sz / 2 + v.co.z * sz))
    bm.to_mesh(me); bm.free(); me.materials.append(m)
    o = bpy.data.objects.new('i', me); col.objects.link(o)
    bv = o.modifiers.new('bv', 'BEVEL'); bv.width = .008; bv.segments = 1
    if band:
        b = gbox_at(p + Vector((0, -.002, sz * .35)), sx * 1.01, sy * 1.01, sz * .18, band)
    return o

def counter():
    wood = mat('cw', '#3f2819', .55, tex='noise', scale=12); top = mat('ct', '#7a5434', .4, tex='planks', scale=4); dark = mat('cd', '#22160e', .7); panel = mat('cp', '#4b3120', .55)
    C = dict(x0=.05, x1=9, y0=2.2, y1=2.72, h=24)
    gbox(C['x0'], C['x1'], C['y0'], C['y1'], 0, C['h'] - 2, wood)
    gbox(C['x0'] - .04, C['x1'], C['y0'] - .03, C['y1'] + .06, C['h'] - 2.5, C['h'], top)
    gbox(C['x0'], C['x1'], C['y1'] - .01, C['y1'] + .02, 0, 3, dark, bevel=0)
    x = C['x0'] + .15
    while x < C['x1'] - .6:
        gbox(x, x + .65, C['y1'], C['y1'] + .03, 6, 19, panel); x += .75
    brass = mat('cbrass', '#c9a23e', .3, .9)
    at = lambda i, j=C['y0'] + .25: G(i, j, C['h'])
    gbox_at(at(1.6), .3, .2, .05, mat('ledger', '#2a1a12', .6)); gbox_at(at(1.6) + Vector((0, 0, .05)), .26, .17, .01, mat('pages', '#e8dcc0', .8))
    ball(at(3.5) + Vector((0, 0, .06)), .07, brass, (1, 1, .9)); cylw(at(3.5) + Vector((0, 0, .015)), 'Z', .03, .09, mat('bellbase', '#5a3d26', .6))
    cylw(at(6.4) + Vector((0, 0, .1)), 'Z', .2, .08, mat('jar2', '#9fb8c0', .15)); cylw(at(6.4) + Vector((0, 0, .21)), 'Z', .03, .075, mat('lid2', '#6b4a30', .6))
    for k in range(6): ball(at(6.4) + Vector((math.cos(k) * .04, math.sin(k) * .04, .05 + (k % 3) * .04)), .022, mat(f'candy{k%3}', ['#c94a5a', '#e0b437', '#5a9a6a'][k % 3], .3))
    gbox_at(at(7.2), .26, .18, .12, mat('cash', '#2f3d32', .5), mat('cashband', '#c9a23e', .4, .6))
    # 앵무새 횃대 (8.35, y0 + 0.25)
    p = at(8.35)
    cylw(p + Vector((0, 0, .02)), 'Z', .04, .12, dark); rod(p, p + Vector((0, 0, .35)), .02, mat('perch', '#5a3d26', .6))
    rod(p + Vector((-.15, .1, .35)), p + Vector((.15, -.1, .35)), .022, mat('perch2', '#6b4a30', .6))

PERCH = (8.35, 2.45, 24 + 9)
def parrot(crest_up):
    white = mat('pw', '#ece9e0', .85); yellow = mat('py', '#e8c23a', .7); beak = mat('pb', '#2a2522', .4); foot = mat('pf', '#7a6a5e', .7); eye = mat('pe', '#151210', .2)
    p = G(*PERCH)
    face = Vector((-.7, -.7, 0)).normalized()   # 손님 쪽 (j 증가 = 화면 왼쪽 아래)
    face = Vector((0, -1, 0))
    face = (G(0, 1, 0) - G(0, 0, 0)).normalized() * .6 + (G(-1, 0, 0) - G(0, 0, 0)).normalized() * .4
    face.normalize()
    body = ball(p + Vector((0, 0, .17)), .1, white, (1, 1, 1.45))
    head = p + Vector((0, 0, .33)) + face * .03
    ball(head, .075, white)
    ball(head + face * .07 + Vector((0, 0, -.015)), .03, beak, (1, 1, 1.2))
    for s in (-1, 1):
        side = Vector((-face.y, face.x, 0)) * s
        ball(head + face * .04 + side * .055 + Vector((0, 0, .01)), .012, eye)
        ball(p + Vector((0, 0, .02)) + side * .035, .02, foot)
    rod(p + Vector((0, 0, .1)) - face * .06, p + Vector((0, 0, -.08)) - face * .16, .04, white)   # 꼬리
    for k in range(6):
        a = -.5 + k * .2
        base = head + Vector((0, 0, .05)) - face * (.01 * k)
        if crest_up:
            tip = base + Vector((0, 0, .16 - abs(a) * .05)) - face * (.02 + k * .015) + Vector((-face.y, face.x, 0)) * a * .1
        else:
            tip = base - face * (.12 + k * .012) + Vector((0, 0, .03)) + Vector((-face.y, face.x, 0)) * a * .06
        rod(base, tip, .014, yellow, 6)

def lamp():
    cord = mat('cord', '#14100c', .8); shade = mat('shade', '#7a5432', .6); trim = mat('ltrim', '#9a7048', .5, .3); bulb = mat('bulb', '#fff0c0', .2, emit=8)
    p = G(0, 0, 0)
    rod(p + Vector((0, 0, 60 / ZP)), p + Vector((0, 0, 140 / ZP)), .01, cord)
    me = bpy.data.meshes.new('shade'); bm = bmesh.new()
    bmesh.ops.create_cone(bm, cap_ends=False, segments=18, radius1=.26, radius2=.08, depth=.2)
    bm.to_mesh(me); bm.free(); me.materials.append(shade)
    o = bpy.data.objects.new('shade', me); col.objects.link(o); o.location = p + Vector((0, 0, 56 / ZP))
    s = o.modifiers.new('s', 'SOLIDIFY'); s.thickness = .012
    for f in me.polygons: f.use_smooth = True
    ball(p + Vector((0, 0, 52.5 / ZP)), .07, bulb)
    cylw(p + Vector((0, 0, 60.5 / ZP)), 'Z', .03, .08, trim)

# ───────── 굽기 ─────────
def color_decode(png):
    a = np.asarray(Image.open(png).convert('RGBA'), dtype=np.float32)
    H, W = a.shape[0] // SS, a.shape[1] // SS
    pre = a.copy(); pre[..., :3] *= a[..., 3:4] / 255
    blk = pre.reshape(H, SS, W, SS, 4).mean((1, 3)); al = blk[..., 3]
    rgb = np.where(al[..., None] > 0, blk[..., :3] / np.maximum(al[..., None], 1e-3) * 255, 0)
    out = np.zeros((H, W, 4), np.uint8); out[..., :3] = np.clip(rgb, 0, 255); out[..., 3] = np.where(al >= 128, 255, 0)
    return out
def lights(night):
    for o in [o for o in col.objects if o.type == 'LIGHT']: bpy.data.objects.remove(o, do_unlink=True)
    def add(kind, loc, energy, color, size=1.0, rot=None):
        d = bpy.data.lights.new('l', kind); d.energy = energy; d.color = color
        if kind == 'AREA': d.size = size
        if kind == 'POINT': d.shadow_soft_size = size
        o = bpy.data.objects.new('l', d); col.objects.link(o); o.location = loc
        if rot: o.rotation_euler = rot
    # 천장 쪽 부드러운 빛 (방 전체), 등 두 개, 창빛
    add('AREA', G(RW / 2, RD / 2, 150) + Vector((0, 0, 1.5)), 720 if not night else 380, (1, .92, .8), 9)
    for (i, j) in ((2.4, 2.0), (6.6, 2.0)): add('POINT', G(i, j, 50), 300, (1, .82, .55), .1)
    add('AREA', G(4.5, 3.2, 72), 260, (1, .9, .75), 3, (math.radians(60), 0, math.radians(225)))
    if not night: add('AREA', G(-1.5, 4.6, 46), 420, (.85, .92, 1), 1.4, (0, -math.pi / 2, 0))
    add('POINT', G(4.5, 6.5, 70), 60 if not night else 30, (1, .85, .65), .5)
    # 진열장을 비추는 빛 (물건이 잘 보이게)
    add('AREA', G(4.6, 2.0, 46), 520 if not night else 420, (1, .93, .82), 6, (math.radians(90), 0, 0))
    bgn.inputs[1].default_value = .55 if not night else .3

def render(path, W=576, H=400, ax=272, ay=110):
    frame(W, H, ax, ay); sc.render.filepath = path; bpy.ops.render.render(write_still=True)
    return color_decode(path)

meta = {}
def save(name, arr, ax, ay):
    A = arr[..., 3]; ys, xs = np.nonzero(A)
    x0, x1, y0, y1 = xs.min(), xs.max() + 1, ys.min(), ys.max() + 1
    Image.fromarray(arr[y0:y1, x0:x1], 'RGBA').save(f'{OUT}/{name}.png', optimize=True)
    meta[name] = [int(x0 - ax), int(y0 - ay), int(x1 - x0), int(y1 - y0)]

ONLY_PARROT = '--parrot' in sys.argv
if '--bigparrot' in sys.argv:
    # 유황새의 앵무새: 사람 키만큼 커져 카운터 오른쪽 바닥(7.6, 3.55)에 선다. 2배 밀도로 굽는다
    meta.update(json.load(open(f'{OUT}/shop.json')))
    lights(False)
    BX, BY, K = 7.6, 3.55, 4.4
    sx, sy = (BX - BY) * 32, (BX + BY) * 16
    W, H = 110, 150; ax, ay = W / 2 - sx, H - 14 - sy
    for up in (False, True):
        objs = new_objs(lambda: parrot(up))
        pc = G(*PERCH); dst = G(BX, BY, 0) + Vector((0, 0, .1 * K))
        bpy.context.view_layer.update()
        for o in objs: o.matrix_world = Matrix.Translation(dst) @ Matrix.Scale(K, 4) @ Matrix.Translation(-pc) @ o.matrix_world
        frame(W, H, ax, ay)
        sc.render.resolution_x = W * 2 * SS; sc.render.resolution_y = H * 2 * SS
        sc.render.filepath = f'{TMP}/big{int(up)}.png'; bpy.ops.render.render(write_still=True)
        save(f'shop-bigparrot-{int(up)}', color_decode(f'{TMP}/big{int(up)}.png'), ax * 2, ay * 2)
        for o in objs: bpy.data.objects.remove(o, do_unlink=True)
    json.dump(meta, open(f'{OUT}/shop.json', 'w'))
    print('[shop] bigparrot', {k: v for k, v in meta.items() if 'big' in k}, flush=True)
    sys.exit(0)
room_objs = [] if ONLY_PARROT else new_objs(lambda: room(False))
for night in (() if ONLY_PARROT else (False, True)):
    if night:
        for o in room_objs: bpy.data.objects.remove(o, do_unlink=True)
        room_objs = new_objs(lambda: room(True))
    lights(night)
    save(f'shop-room-{"night" if night else "day"}', render(f'{TMP}/room{int(night)}.png'), 272, 110)
# 카운터 (방을 가림막 없이 따로)
for o in room_objs: o.hide_render = True
lights(False)
if ONLY_PARROT:
    meta.update(json.load(open(f'{OUT}/shop.json')))
else:
    c_objs = new_objs(counter)
    save('shop-counter', render(f'{TMP}/counter.png'), 272, 110)
    for o in c_objs: o.hide_render = True
for up in (False, True):
    objs = new_objs(lambda: parrot(up))
    pc = G(*PERCH)
    bpy.context.view_layer.update()
    for o in objs: o.matrix_world = Matrix.Translation(pc) @ Matrix.Scale(1.7, 4) @ Matrix.Translation(-pc) @ o.matrix_world
    save(f'shop-parrot-{int(up)}', render(f'{TMP}/parrot{int(up)}.png'), 272, 110)
    for o in objs: bpy.data.objects.remove(o, do_unlink=True)
objs = new_objs(lamp)
frame(32, 128, 16, 120); sc.render.filepath = f'{TMP}/lamp.png'; bpy.ops.render.render(write_still=True)
save('shop-lamp', color_decode(f'{TMP}/lamp.png'), 16, 120)
json.dump(meta, open(f'{OUT}/shop.json', 'w'))
print('[shop] done', meta, flush=True)
