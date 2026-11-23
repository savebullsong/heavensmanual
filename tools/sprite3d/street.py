"""거리 조각들을 굽는다: 건물 면 조각(1층·위층·옥상 난간, 왼쪽/오른쪽 면), 바닥 타일, 차, 소품.
건물 조각은 캐릭터처럼 '구역 번호 × 16 + 음영'으로 구워 게임에서 건물마다 색을 입힌다.
사용법: python3 street.py <출력폴더> [bld|ground|cars|props ...]"""
import sys, os, json, math, random, time
import bpy, bmesh, addon_utils
import numpy as np
from mathutils import Vector, Matrix
from PIL import Image
HERE = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, HERE)
addon_utils.enable('cycles', default_set=True)
bpy.ops.wm.read_factory_settings(use_empty=True)
OUT = sys.argv[1]; os.makedirs(OUT, exist_ok=True)
WHAT = sys.argv[2:] or ['bld', 'ground', 'cars', 'props']
TMP = f'/tmp/street_{os.getpid()}'; os.makedirs(TMP, exist_ok=True)
MPP = .034; SS = 2
T = 32 * MPP / math.sqrt(.5)          # 타일 한 변 (캐릭터 축척 m) ≈ 1.539
ZP = .866 / MPP                         # 높이 1m 당 화면 px
GPX, UPX, PPX = 100, 52, 20             # 1층 · 위층 · 난간 높이 (px)
G, U, PH = GPX / ZP, UPX / ZP, PPX / ZP
sc = bpy.context.scene; col = sc.collection
sc.render.film_transparent = True; sc.view_settings.view_transform = 'Standard'; sc.render.dither_intensity = 0
sc.render.image_settings.file_format = 'PNG'; sc.render.image_settings.color_mode = 'RGBA'
world = bpy.data.worlds.new('w'); sc.world = world
bgn = world.node_tree.nodes['Background']; bgn.inputs[0].default_value = (.5, .56, .68, 1); bgn.inputs[1].default_value = .65
cam_d = bpy.data.cameras.new('cam'); cam_d.type = 'ORTHO'
cam = bpy.data.objects.new('cam', cam_d); col.objects.link(cam); sc.camera = cam
ROT = Matrix.Rotation(math.radians(45), 3, 'Z') @ Matrix.Rotation(math.radians(60), 3, 'X')
UP = ROT @ Vector((0, 1, 0)); FWD = ROT @ Vector((0, 0, -1)); RIGHT = ROT @ Vector((1, 0, 0))
def frame(W, H, ax, ay, anchor=Vector((0, 0, 0))):
    """W×H 그림에서 anchor(세계 좌표)가 (ax, ay) 픽셀에 오도록 카메라를 둔다"""
    sc.render.resolution_x = W * SS; sc.render.resolution_y = H * SS
    cam_d.ortho_scale = max(W, H) * MPP
    off = UP * ((ay - H / 2) * MPP) - RIGHT * ((ax - W / 2) * MPP)
    cam.matrix_world = Matrix.Translation(anchor + off - FWD * 60) @ ROT.to_4x4()
def sun(direction, energy, color, angle):
    d = bpy.data.lights.new('sun', 'SUN'); d.energy = energy; d.color = color; d.angle = math.radians(angle)
    o = bpy.data.objects.new('sun', d); col.objects.link(o)
    o.rotation_euler = Vector(direction).normalized().to_track_quat('-Z', 'Y').to_euler()
sun(-(-RIGHT * .75 + (-FWD) * .55 + Vector((0, 0, 1.1))), 3.4, (1, .96, .9), 4)
sun(-(RIGHT * .6 + FWD * .9 + Vector((0, 0, .6))), .9, (.75, .85, 1), 10)

def engine(kind, samples=12):
    if kind == 'cycles':
        sc.render.engine = 'CYCLES'; sc.cycles.device = 'CPU'; sc.cycles.samples = samples; sc.cycles.use_denoising = False
        sc.cycles.max_bounces = 3; sc.cycles.filter_width = 1.5
    else:
        sc.render.engine = 'BLENDER_WORKBENCH'; sh = sc.display.shading
        sh.light = 'FLAT'; sh.color_type = 'MATERIAL'; sh.show_shadows = False; sh.show_cavity = False; sh.show_object_outline = False
        sc.display.render_aa = 'OFF'

def srgb2lin(v): return ((v + .055) / 1.055) ** 2.4 if v > .04045 else v / 12.92
def hexlin(h): return tuple(srgb2lin(int(h[i:i + 2], 16) / 255) for i in (1, 3, 5))

# ───────── 재질 ─────────
BREG = {'void': 0, 'wall': 1, 'trim': 2, 'glass': 3, 'frame': 4, 'metal': 5, 'dark': 6, 'inside': 7, 'shutter': 8,
        'awnA': 9, 'awnB': 10, 'ac': 11, 'wood': 12, 'roof': 13, 'plant': 14, 'accent': 15}
_m = {}
def node_mat(name):
    m = bpy.data.materials.new(name)
    try: m.use_nodes = True
    except Exception: pass
    return m, m.node_tree.nodes, m.node_tree.links, m.node_tree.nodes['Principled BSDF']
def rmat(region, rough=.8, metal=0., bump=None, albedo=.8, glossy=False):
    """구역 재질: 흰 바탕 + (선택) 결 무늬. 색은 게임에서 입힌다"""
    key = (region, rough, metal, bump, albedo)
    if key in _m: return _m[key]
    m, N, L, b = node_mat(region)
    b.inputs['Base Color'].default_value = (albedo, albedo, albedo, 1)
    b.inputs['Roughness'].default_value = rough; b.inputs['Metallic'].default_value = metal
    if bump:
        tc = N.new('ShaderNodeTexCoord')
        if bump == 'plaster':
            nz = N.new('ShaderNodeTexNoise'); nz.inputs['Scale'].default_value = 6; nz.inputs['Detail'].default_value = 6
            L.new(tc.outputs['Object'], nz.inputs['Vector'])
            mix = N.new('ShaderNodeMix'); mix.data_type = 'RGBA'
            mix.inputs[6].default_value = (albedo * .82, albedo * .82, albedo * .82, 1); mix.inputs[7].default_value = (albedo, albedo, albedo, 1)
            L.new(nz.outputs['Fac'], mix.inputs[0]); L.new(mix.outputs[2], b.inputs['Base Color'])
            bp = N.new('ShaderNodeBump'); bp.inputs['Strength'].default_value = .2
            L.new(nz.outputs['Fac'], bp.inputs['Height']); L.new(bp.outputs['Normal'], b.inputs['Normal'])
        elif bump in ('ribs', 'ribsY'):
            w = N.new('ShaderNodeTexWave'); w.wave_type = 'BANDS'; w.bands_direction = 'Z'; w.inputs['Scale'].default_value = 7
            L.new(tc.outputs['Object'], w.inputs['Vector'])
            bp = N.new('ShaderNodeBump'); bp.inputs['Strength'].default_value = .7
            L.new(w.outputs['Fac'], bp.inputs['Height']); L.new(bp.outputs['Normal'], b.inputs['Normal'])
        elif bump == 'stripes':
            sep = N.new('ShaderNodeSeparateXYZ'); L.new(tc.outputs['Object'], sep.inputs[0])
            add = N.new('ShaderNodeMath'); add.operation = 'ADD'
            L.new(sep.outputs['X'], add.inputs[0]); L.new(sep.outputs['Y'], add.inputs[1])
            pp = N.new('ShaderNodeMath'); pp.operation = 'PINGPONG'; pp.inputs[1].default_value = .26
            L.new(add.outputs[0], pp.inputs[0])
            gt = N.new('ShaderNodeMath'); gt.operation = 'GREATER_THAN'; gt.inputs[1].default_value = .13
            L.new(pp.outputs[0], gt.inputs[0])
            m['stripe_node'] = True
            m.node_tree.nodes['Principled BSDF']['stripe'] = 1
            # 줄무늬 구역은 id 패스에서 따로 칠한다 (아래 stripe_id)
            m['stripes'] = 1
    m['rid'] = BREG[region]
    _m[key] = m
    return m

def idc(v):
    v = srgb2lin(v / 255); return (v, v, v, 1)
def set_ids():
    for m in _m.values():
        m.diffuse_color = idc(int(m['rid']) * 16 + 8)

# ───────── 도형 ─────────
def box(x0, y0, z0, x1, y1, z1, m, bevel=.012, name='b'):
    me = bpy.data.meshes.new(name); bm = bmesh.new(); bmesh.ops.create_cube(bm, size=1)
    for v in bm.verts: v.co = Vector(((x0 + x1) / 2 + v.co.x * abs(x1 - x0), (y0 + y1) / 2 + v.co.y * abs(y1 - y0), (z0 + z1) / 2 + v.co.z * abs(z1 - z0)))
    bm.to_mesh(me); bm.free(); me.materials.append(m)
    o = bpy.data.objects.new(name, me); col.objects.link(o)
    if bevel: bv = o.modifiers.new('bv', 'BEVEL'); bv.width = bevel; bv.segments = 1
    return o
def cyl(c, axis, length, r, m, seg=12):
    me = bpy.data.meshes.new('c'); bm = bmesh.new()
    bmesh.ops.create_cone(bm, cap_ends=True, segments=seg, radius1=r, radius2=r, depth=length)
    bm.to_mesh(me); bm.free(); me.materials.append(m)
    o = bpy.data.objects.new('c', me); col.objects.link(o); o.location = c
    if axis == 'X': o.rotation_euler = (0, math.pi / 2, 0)
    if axis == 'Y': o.rotation_euler = (math.pi / 2, 0, 0)
    for p in me.polygons: p.use_smooth = True
    return o
def sphere(c, r, m, sz=1.0):
    me = bpy.data.meshes.new('s'); bm = bmesh.new()
    bmesh.ops.create_icosphere(bm, subdivisions=2, radius=r)
    bm.to_mesh(me); bm.free(); me.materials.append(m)
    o = bpy.data.objects.new('s', me); col.objects.link(o); o.location = c; o.scale = (1, 1, sz)
    for p in me.polygons: p.use_smooth = True
    return o
def slab(pts, m, thick=.03):
    me = bpy.data.meshes.new('s'); me.from_pydata([Vector(p) for p in pts], [], [list(range(len(pts)))]); me.materials.append(m)
    o = bpy.data.objects.new('s', me); col.objects.link(o)
    s = o.modifiers.new('so', 'SOLIDIFY'); s.thickness = thick
    return o
def clear():
    for o in list(col.objects):
        if o.type == 'MESH': bpy.data.objects.remove(o, do_unlink=True)

M = lambda: dict(
    wall=rmat('wall', .9, bump='plaster'), trim=rmat('trim', .85, bump='plaster'), glass=rmat('glass', .08, albedo=.5), frame=rmat('frame', .35, .6),
    metal=rmat('metal', .45, .6, albedo=.6), dark=rmat('dark', .9, albedo=.5), inside=rmat('inside', .8), shutter=rmat('shutter', .4, .5, bump='ribs'),
    awnA=rmat('awnA', .85), awnB=rmat('awnB', .85), ac=rmat('ac', .5), wood=rmat('wood', .7, bump='ribs'), roof=rmat('roof', .95, bump='plaster'),
    plant=rmat('plant', .8), accent=rmat('accent', .8))

# ───────── 면 조각: 정면 = -Y, 칸 = X 0..T, 높이 0..H ─────────
def bay_wall(m, H, t=.25):
    box(0, 0, 0, T, t, H, m['wall'], bevel=0)
def window(m, x0, x1, z0, z1, grille=False, sill=True, recess=.06):
    box(x0 - .05, -.025, z0 - .05, x1 + .05, .01, z1 + .05, m['frame'], bevel=.004)
    box(x0, -.035 + recess, z0, x1, recess, z1, m['glass'], bevel=0)
    box((x0 + x1) / 2 - .015, -.045, z0, (x0 + x1) / 2 + .015, -.02, z1, m['frame'], bevel=0)
    if sill: box(x0 - .08, -.1, z0 - .09, x1 + .08, .0, z0 - .03, m['trim'])
    if grille:
        n = int((x1 - x0) / .11)
        for k in range(n + 1):
            bx = x0 + (x1 - x0) * k / n
            box(bx - .01, -.15, z0 - .04, bx + .01, -.13, z1 + .04, m['metal'], bevel=0)
        for z in (z0 - .04, (z0 + z1) / 2, z1 + .04):
            box(x0 - .03, -.16, z - .012, x1 + .03, -.12, z + .012, m['metal'], bevel=0)

def mod_upper(kind, m):
    H = U
    bay_wall(m, H)
    box(0, -.06, H - .1, T, .0, H, m['trim'], bevel=.005)          # 층 띠
    if kind == 'grille': window(m, .28, T - .28, .55, 1.55, grille=True)
    elif kind == 'ac':
        window(m, .55, T - .2, .6, 1.55)
        box(.06, -.42, .12, .78, -.06, .58, m['ac']); cyl(Vector((.42, -.43, .35)), 'Y', .02, .17, m['dark'])
        box(.1, -.4, .08, .74, -.06, .12, m['metal'], bevel=0)
    elif kind == 'plain': window(m, .3, T - .3, .5, 1.6)
    elif kind == 'balcony':
        box(.12, -.02, .1, T - .12, .04, 1.85, m['glass'], bevel=0)
        box(.05, -.04, .05, .14, .02, 1.9, m['frame'], bevel=0); box(T - .14, -.04, .05, T - .05, .02, 1.9, m['frame'], bevel=0)
        box(0, -.85, -.02, T, 0, .1, m['trim'])
        for k in range(12):
            x = .05 + k * (T - .1) / 11
            box(x - .01, -.83, .1, x + .01, -.81, .95, m['metal'], bevel=0)
        box(0, -.86, .93, T, -.8, .98, m['metal'], bevel=0)
        cyl(Vector((.35, -.55, .27)), 'Z', .34, .12, m['accent']); sphere(Vector((.35, -.55, .6)), .22, m['plant'], .9)
        if random.random() < .5: box(T - .5, -.6, .1, T - .2, -.3, .55, m['accent'])
    elif kind == 'curtain':
        box(0, -.03, 0, T, .0, H, m['glass'], bevel=0)
        for x in (0.0, T / 2, T):
            box(x - .025, -.07, 0, x + .025, -.02, H, m['frame'], bevel=0)
        box(0, -.07, H - .12, T, -.02, H - .04, m['frame'], bevel=0); box(0, -.07, .9, T, -.04, .95, m['frame'], bevel=0)
    elif kind == 'wall':
        box(.6, -.02, 1.0, .95, .0, 1.25, m['metal'], bevel=0)
    return H

def mod_ground(kind, m):
    H = G
    bay_wall(m, H)
    fas = (H - .75, H - .1)
    box(0, -.12, H - .12, T, 0, H, m['trim'], bevel=.006)
    if kind == 'shop':
        box(0, -.12, 0, .16, 0, H - .1, m['trim'], bevel=.006)              # 기둥
        box(.16, -.01, 0, T, .5, H - .8, m['inside'], bevel=0)
        box(.16, -.06, H - 1.9, T, -.01, H - .8, m['shutter'], bevel=0)
        box(.16, -.18, H - .92, T, .0, H - .78, m['trim'])
        for k in range(2):
            x = .4 + k * .6
            box(x, .2, 0, x + .45, .45, .5 + random.random() * .9, m['accent'])
            box(x + .05, .3, H - 1.15, x + .35, .36, H - 1.1, m['awnB'], bevel=0)
        # 차양 (줄무늬)
        slab([(0, 0, H - .78), (T, 0, H - .78), (T, -1.0, H - 1.18), (0, -1.0, H - 1.18)], m['awnA'])
        for k in range(5):
            x = k * T / 5 + T / 10
            slab([(x - .07, -.001, H - .779), (x + .07, -.001, H - .779), (x + .07, -1.001, H - 1.179), (x - .07, -1.001, H - 1.179)], m['awnB'], thick=.031)
        box(0, -1.02, H - 1.32, T, -.98, H - 1.16, m['awnA'], bevel=0)
    elif kind == 'glass':
        box(0, -.12, 0, .12, 0, H - .1, m['trim'], bevel=.006)
        box(.12, -.01, 0, T, .5, H - .8, m['inside'], bevel=0)
        box(.12, -.04, .05, T, .0, H - .8, m['glass'], bevel=0)
        for x in (.12, T / 2 + .06, T):
            box(x - .03, -.08, 0, x + .03, -.03, H - .78, m['frame'], bevel=0)
        box(.12, -.08, H - .86, T, -.03, H - .78, m['frame'], bevel=0); box(.12, -.08, 0, T, -.03, .08, m['frame'], bevel=0)
        box(0, -.5, H - .78, T, 0, H - .7, m['trim'])
    elif kind == 'closed':
        box(0, -.12, 0, .16, 0, H - .1, m['trim'], bevel=.006)
        box(.16, -.06, 0, T, -.01, H - .8, m['shutter'], bevel=0)
        box(.16, -.18, H - .92, T, .0, H - .78, m['trim'])
    elif kind == 'wall':
        window(m, .35, T - .35, 1.1, 2.3, grille=True)
        box(0, -.05, 0, T, 0, .35, m['trim'], bevel=0)
    elif kind == 'lobby':
        box(0, -.01, 0, T, .6, H - .4, m['inside'], bevel=0)
        box(0, -.04, .05, T, 0, H - .4, m['glass'], bevel=0)
        for x in (0.0, T / 2, T):
            box(x - .03, -.08, 0, x + .03, -.03, H - .38, m['frame'], bevel=0)
        box(0, -1.3, H - .5, T, 0, H - .32, m['trim'])
    elif kind in ('wood', 'wooddoor'):
        box(0, -.03, 0, T, 0, H - .1, m['wood'], bevel=0)
        for x in (0.0, T):
            box(x - .06, -.1, 0, x + .06, 0, H - .1, m['dark'])
        box(0, -.14, H - .55, T, 0, H - .1, m['dark'])
        if kind == 'wooddoor':
            box(.35, -.06, 0, T - .35, -.02, 2.4, m['dark'], bevel=0)
            box(.42, -.08, .05, T - .42, -.05, 2.3, m['wood'], bevel=0)
            box(.55, -.1, 1.35, T - .55, -.07, 2.0, m['inside'], bevel=0)
            box(T - .55, -.14, 1.1, T - .48, -.08, 1.2, m['frame'], bevel=0)
        else:
            box(.3, -.05, 1.0, T - .3, -.01, 2.3, m['dark'], bevel=0)
            box(.36, -.07, 1.06, T - .36, -.04, 2.24, m['inside'], bevel=0)
            for x in (.36 + (T - .72) / 3, .36 + 2 * (T - .72) / 3):
                box(x - .015, -.09, 1.06, x + .015, -.05, 2.24, m['dark'], bevel=0)
    return H

def mod_top(kind, m):
    H = PH
    if kind == 'curtain':
        box(0, -.03, 0, T, .3, H, m['frame'], bevel=.005)
        box(0, -.05, H - .08, T, .3, H + .02, m['trim'], bevel=.005)
    else:
        box(0, -.03, 0, T, .25, H - .1, m['wall'], bevel=0)
        box(0, -.08, H - .1, T, .3, H, m['trim'], bevel=.008)
    return H

# ───────── 굽기 ─────────
def decode_ids(shade_png, id_png, lref=.8):
    a = np.asarray(Image.open(shade_png).convert('RGBA'), dtype=np.float32) / 255
    b = np.asarray(Image.open(id_png).convert('RGBA'))
    H, W = a.shape[0] // SS, a.shape[1] // SS
    lum = a[..., 0] * .299 + a[..., 1] * .587 + a[..., 2] * .114
    rid = np.where(b[..., 3] > 127, np.clip(np.round((b[..., 0].astype(np.float32) - 8) / 16), 0, 15), -1).astype(np.int16)
    blk = lambda x: x.reshape(H, SS, W, SS).transpose(0, 2, 1, 3).reshape(H, W, SS * SS)
    L, A, R = blk(lum), blk(a[..., 3]), blk(rid)
    counts = np.stack([(R == k).sum(-1) for k in range(16)], -1)
    maj = counts.argmax(-1); has = counts.max(-1) > 0
    sel = R == maj[..., None]
    shade = (L * sel).sum(-1) / np.maximum(1, sel.sum(-1))
    opaque = has & (maj > 0) & (A.mean(-1) >= .5)
    lvl = np.clip(np.round(shade / lref * 11), 0, 15).astype(np.uint8)
    return np.where(opaque, maj.astype(np.uint8) * 16 + lvl, 0).astype(np.uint8), np.where(opaque, 255, 0).astype(np.uint8)

def color_decode(png):
    a = np.asarray(Image.open(png).convert('RGBA'), dtype=np.float32)
    H, W = a.shape[0] // SS, a.shape[1] // SS
    pre = a.copy(); pre[..., :3] *= a[..., 3:4] / 255
    blk = pre.reshape(H, SS, W, SS, 4).mean((1, 3))
    al = blk[..., 3]
    rgb = np.where(al[..., None] > 0, blk[..., :3] / np.maximum(al[..., None], 1e-3) * 255, 0)
    out = np.zeros((H, W, 4), np.uint8); out[..., :3] = np.clip(rgb, 0, 255); out[..., 3] = np.where(al >= 128, 255, 0)
    return out

def pack(name, items, mode):
    """items: [(key, arr, anchor_x, anchor_y)] arr = (H,W,2) LA 또는 (H,W,4) RGBA"""
    rects = []
    for key, arr, ax, ay in items:
        A = arr[..., -1]; ys, xs = np.nonzero(A)
        if not len(xs): continue
        x0, x1, y0, y1 = xs.min(), xs.max() + 1, ys.min(), ys.max() + 1
        rects.append((key, arr[y0:y1, x0:x1], int(x0 - ax), int(y0 - ay)))
    AW = 1024 if mode == 'RGBA' else 512
    x = y = rh = 0; pos = {}
    for key, a, ox, oy in sorted(rects, key=lambda r: -r[1].shape[0]):
        h, w = a.shape[:2]
        if x + w > AW: x = 0; y += rh + 1; rh = 0
        pos[key] = (x, y); x += w + 1; rh = max(rh, h)
    img = np.zeros((y + rh + 1, AW, 2 if mode == 'LA' else 4), np.uint8); meta = {}
    for key, a, ox, oy in rects:
        px, py = pos[key]; h, w = a.shape[:2]
        img[py:py + h, px:px + w] = a
        meta[key] = [px, py, w, h, ox, oy]
    Image.fromarray(img, mode).save(f'{OUT}/{name}.png', optimize=True)
    json.dump(meta, open(f'{OUT}/{name}.json', 'w'), separators=(',', ':'))
    print(f'[street] {name}: {len(rects)} pieces, {img.shape[1]}x{img.shape[0]}', flush=True)

def bake_modules():
    random.seed(3)
    jobs = []
    for kind in ('shop', 'glass', 'closed', 'wall', 'lobby', 'wood', 'wooddoor'): jobs.append(('g-' + kind, mod_ground, kind, GPX))
    for kind in ('grille', 'ac', 'plain', 'balcony', 'curtain', 'wall'): jobs.append(('u-' + kind, mod_upper, kind, UPX))
    for kind in ('parapet', 'curtain'): jobs.append(('p-' + kind, mod_top, kind, PPX))
    items = []
    for key, fn, kind, hpx in jobs:
        for face in ('L', 'R'):
            clear(); m = M()
            random.seed(hash(key) % 1000)
            fn(kind, m)
            if face == 'R':
                bpy.context.view_layer.update()  # 새로 만든 물체의 위치·회전을 matrix_world에 반영 (안 하면 원점으로 돌아간다)
                for o in col.objects:
                    if o.type == 'MESH':
                        o.matrix_world = Matrix.Rotation(math.radians(90), 4, 'Z') @ o.matrix_world
            W, H = 112, hpx + 64
            ax = 56 if face == 'L' else 40; ay = hpx + 20
            frame(W, H, ax, ay)
            engine('cycles'); sc.render.filepath = f'{TMP}/{key}-{face}_s.png'; bpy.ops.render.render(write_still=True)
            engine('workbench'); set_ids(); sc.render.filepath = f'{TMP}/{key}-{face}_i.png'; bpy.ops.render.render(write_still=True)
            L, A = decode_ids(f'{TMP}/{key}-{face}_s.png', f'{TMP}/{key}-{face}_i.png')
            items.append((f'{key}-{face}', np.stack([L, A], -1), ax, ay))
    # 지붕 타일 (구역 = roof)
    for v in range(3):
        clear(); m = M()
        box(-T, -T * 2, -.2, T * 2, T, 0, m['roof'], bevel=0)
        for o in col.objects: o.location.x += v * 3.7
        frame(64, 32, 32, 0, Vector((v * 3.7, 0, 0)) + Vector((0, 0, 0)))
        # 타일 한 칸 = X 0..T, Y -T..0 → 화면 마름모 (위 꼭짓점 = (0,0,0))
        engine('cycles'); sc.render.filepath = f'{TMP}/roof{v}_s.png'; bpy.ops.render.render(write_still=True)
        engine('workbench'); set_ids(); sc.render.filepath = f'{TMP}/roof{v}_i.png'; bpy.ops.render.render(write_still=True)
        L, A = decode_ids(f'{TMP}/roof{v}_s.png', f'{TMP}/roof{v}_i.png')
        mask = diamond_mask()
        items.append((f'roof-{v}', np.stack([np.where(mask, L, 0), np.where(mask, 255, 0)], -1).astype(np.uint8), 32, 0))
    pack('bld', items, 'LA')

def diamond_mask(W=64, H=32):
    yy, xx = np.mgrid[0:H, 0:W] + .5
    return (np.abs(xx - W / 2) / (W / 2) + np.abs(yy - H / 2) / (H / 2)) <= 1.0

# ───────── 바닥 타일 (색 그대로) ─────────
def color_mat(name, base, kind='noise', scale=8, contrast=.15, rough=.9, extra=None):
    m, N, L, b = node_mat(name)
    tc = N.new('ShaderNodeTexCoord')
    c0 = hexlin(base)
    if kind == 'brick':
        br = N.new('ShaderNodeTexBrick'); br.inputs['Scale'].default_value = scale; br.inputs['Mortar Size'].default_value = .02
        br.inputs['Color1'].default_value = (*c0, 1); br.inputs['Color2'].default_value = (*[x * .86 for x in c0], 1)
        br.inputs['Mortar'].default_value = (*[x * .55 for x in c0], 1); br.inputs['Bias'].default_value = 0
        L.new(tc.outputs['Object'], br.inputs['Vector'])
        nz = N.new('ShaderNodeTexNoise'); nz.inputs['Scale'].default_value = 30
        L.new(tc.outputs['Object'], nz.inputs['Vector'])
        mx = N.new('ShaderNodeMix'); mx.data_type = 'RGBA'; mx.blend_type = 'MULTIPLY'; mx.inputs[0].default_value = .25
        L.new(br.outputs['Color'], mx.inputs[6]); L.new(nz.outputs['Color'], mx.inputs[7]); L.new(mx.outputs[2], b.inputs['Base Color'])
        bp = N.new('ShaderNodeBump'); bp.inputs['Strength'].default_value = .4
        L.new(br.outputs['Fac'], bp.inputs['Height']); L.new(bp.outputs['Normal'], b.inputs['Normal'])
    else:
        nz = N.new('ShaderNodeTexNoise'); nz.inputs['Scale'].default_value = scale; nz.inputs['Detail'].default_value = 10
        L.new(tc.outputs['Object'], nz.inputs['Vector'])
        rp = N.new('ShaderNodeValToRGB')
        rp.color_ramp.elements[0].color = (*[x * (1 - contrast) for x in c0], 1); rp.color_ramp.elements[1].color = (*[min(1, x * (1 + contrast)) for x in c0], 1)
        L.new(nz.outputs['Fac'], rp.inputs['Fac']); L.new(rp.outputs['Color'], b.inputs['Base Color'])
        bp = N.new('ShaderNodeBump'); bp.inputs['Strength'].default_value = .25
        L.new(nz.outputs['Fac'], bp.inputs['Height']); L.new(bp.outputs['Normal'], b.inputs['Normal'])
    b.inputs['Roughness'].default_value = rough
    if kind == 'water': b.inputs['Roughness'].default_value = .1
    return m

def bake_ground():
    engine('cycles', 24)
    defs = {
        'walk': ('#b4a896', 'brick', 3.2, .1), 'road': ('#55565b', 'noise', 14, .12), 'cross': ('#55565b', 'noise', 14, .12),
        'soi': ('#64625f', 'noise', 9, .16), 'median': ('#8c897f', 'noise', 10, .12), 'park': ('#587a3e', 'noise', 22, .25),
        'lot': ('#7d776d', 'noise', 6, .1), 'water': ('#3d6a7a', 'water', 4, .12), 'block': ('#4a453f', 'noise', 8, .15),
    }
    items = []
    for t, (base, kind, scale, ct) in defs.items():
        clear()
        m = color_mat(t, base, 'brick' if kind == 'brick' else 'noise', scale, ct)
        for v in range(4):
            ox = v * 7.3
            box(ox - T * 2, -T * 3, -.3, ox + T * 3, T * 2, 0, m, bevel=0)
            frame(64, 32, 32, 0, Vector((ox, 0, 0)))
            sc.render.filepath = f'{TMP}/g-{t}{v}.png'; bpy.ops.render.render(write_still=True)
            rgba = color_decode(f'{TMP}/g-{t}{v}.png')
            mask = diamond_mask(); rgba[..., 3] = np.where(mask, 255, 0)
            items.append((f'{t}-{v}', rgba, 32, 0))
            clear()
    pack('ground', items, 'RGBA')

# ───────── 차 (두 방향: +i 쪽 = se, -i 쪽 = nw) ─────────
def paint(name, hexcol, rough=.35, metal=.3, emit=0):
    m, N, L, b = node_mat(name)
    b.inputs['Base Color'].default_value = (*hexlin(hexcol), 1); b.inputs['Roughness'].default_value = rough; b.inputs['Metallic'].default_value = metal
    for k in ('Coat Weight',):
        if k in b.inputs and metal: b.inputs[k].default_value = .4
    if emit: b.inputs['Emission Color'].default_value = (*hexlin(hexcol), 1); b.inputs['Emission Strength'].default_value = emit
    return m

def car_body(Lc, Wc, Hb, body, cab_from, cab_to, cab_h, glass, roofm=None, taxi_sign=None):
    """차 길이 방향 = +X, 바닥 중심 = 원점"""
    tire, rim, dark, light, red = paint('tire', '#151515', .9, 0), paint('rim', '#9a9da2', .3, .8), paint('dk', '#1d1f22', .6, 0), paint('hl', '#fff4d0', .2, 0, 2), paint('tl', '#d0302a', .3, 0, 1)
    box(-Lc / 2, -Wc / 2, .22, Lc / 2, Wc / 2, Hb, body, bevel=.06)
    box(-Lc / 2 + .05, -Wc / 2 + .02, .14, Lc / 2 - .05, Wc / 2 - .02, .3, dark, bevel=.03)
    x0, x1 = -Lc / 2 + cab_from, -Lc / 2 + cab_to
    me = bpy.data.meshes.new('cab')
    ins = .1
    v = [(x0, -Wc / 2 + .04, Hb), (x1, -Wc / 2 + .04, Hb), (x1, Wc / 2 - .04, Hb), (x0, Wc / 2 - .04, Hb),
         (x0 + .35, -Wc / 2 + ins, Hb + cab_h), (x1 - .25, -Wc / 2 + ins, Hb + cab_h), (x1 - .25, Wc / 2 - ins, Hb + cab_h), (x0 + .35, Wc / 2 - ins, Hb + cab_h)]
    f = [(0, 1, 2, 3), (4, 7, 6, 5), (0, 4, 5, 1), (1, 5, 6, 2), (2, 6, 7, 3), (3, 7, 4, 0)]
    me.from_pydata(v, [], f); me.materials.append(glass); me.materials.append(roofm or body)
    o = bpy.data.objects.new('cab', me); col.objects.link(o)
    me.polygons[1].material_index = 1
    for k in (2, 4): pass
    for wx in (-Lc / 2 + .62, Lc / 2 - .62):
        for wy in (-Wc / 2 + .02, Wc / 2 - .02):
            cyl(Vector((wx, wy, .3)), 'Y', .2, .3, tire); cyl(Vector((wx, wy + (-.01 if wy < 0 else .01), .3)), 'Y', .21, .17, rim)
    for wy in (-Wc / 2 + .22, Wc / 2 - .22):
        box(Lc / 2 - .02, wy - .14, .5, Lc / 2 + .02, wy + .14, .62, light, bevel=0)
        box(-Lc / 2 - .02, wy - .14, .52, -Lc / 2 + .02, wy + .14, .62, red, bevel=0)
    if taxi_sign: box(-.2, -.25, Hb + cab_h, .2, .25, Hb + cab_h + .14, taxi_sign)

def vehicle(model):
    glass = paint('glass', '#2c3a48', .05, .1)
    if model.startswith('sedan') or model.startswith('taxi'):
        col_ = {'sedan-white': '#e9e7e2', 'sedan-black': '#202327', 'sedan-silver': '#a9adb2', 'sedan-red': '#a8302c', 'sedan-blue': '#2f4f7a',
                'taxi-pink': '#e0569c', 'taxi-green': '#7fbf3f'}[model]
        body = paint('body', col_)
        top = paint('top', '#e8d23a') if model == 'taxi-green' else None
        sign = paint('sign', '#f4ecc8', .4, 0, .6) if model.startswith('taxi') else None
        car_body(3.5, 1.5, .82, body, .95, 2.75, .5, glass, top, sign)
    elif model == 'pickup':
        body = paint('body', '#c9c6be')
        car_body(3.8, 1.55, .85, body, 1.55, 2.85, .55, glass)
        box(-1.9, -.75, .85, -.25, -.7, 1.1, body); box(-1.9, .7, .85, -.25, .75, 1.1, body); box(-1.9, -.75, .85, -1.85, .75, 1.1, body)
    elif model == 'tuktuk':
        body = paint('body', '#2b62b0'); trim = paint('trim', '#e8c43a', .4, .3); seat = paint('seat', '#7a2a26', .7, 0); dark = paint('dk', '#1d1f22', .6, 0)
        tire = paint('tire', '#151515', .9, 0)
        box(-1.0, -.65, .3, .75, .65, .62, body, bevel=.05)
        box(.75, -.3, .3, 1.35, .3, .75, body, bevel=.06)
        box(-.95, -.55, .62, -.25, .55, .95, seat)
        for x in (-.98, .62):
            for y in (-.62, .62): box(x - .03, y - .03, .62, x + .03, y + .03, 1.75, dark, bevel=0)
        box(-1.1, -.72, 1.72, .82, .72, 1.85, body, bevel=.04); box(-1.1, -.73, 1.68, .82, .73, 1.72, trim, bevel=0)
        box(.6, -.6, .95, .66, .6, 1.68, glass, bevel=0)
        for (x, y) in ((-.7, -.62), (-.7, .62), (1.15, 0)): cyl(Vector((x, y, .25)), 'Y', .14, .25, tire)
    elif model == 'moto':
        # 오토바이 택시: 바퀴 두 개, 가는 차체, 주황 조끼 기사
        body = paint('body', '#a12a2a'); dark = paint('dk', '#1d1f22', .6, 0); tire = paint('tire', '#151515', .9, 0); chrome = paint('chr', '#b8bcc2', .25, .9)
        vest = paint('vest', '#e8732a', .8, 0); skin = paint('skin', '#b88462', .6, 0); pants = paint('pants', '#2a2e38', .8, 0); helm = paint('helm', '#e9e7e2', .3, .1); shirt = paint('shirt', '#3a4a6a', .8, 0)
        for x in (.72, -.72):
            cyl(Vector((x, 0, .3)), 'Y', .09, .3, tire); cyl(Vector((x, 0, .3)), 'Y', .1, .13, chrome)
        box(-.55, -.11, .42, .5, .11, .62, body, bevel=.05)            # 차체
        box(-.75, -.12, .62, .1, .12, .7, dark, bevel=.04)              # 안장
        box(-.95, -.08, .45, -.6, .08, .55, dark, bevel=.02)            # 뒤 짐받이
        box(.55, -.05, .3, .62, .05, .95, chrome, bevel=0)              # 앞 포크
        box(.52, -.34, .95, .6, .34, 1.0, dark, bevel=0)                # 핸들
        box(.5, -.1, .72, .66, .1, .9, body, bevel=.03)                 # 앞 덮개
        box(.66, -.06, .78, .7, .06, .86, paint('hl', '#fff4d0', .2, 0, 2), bevel=0)
        # 기사: 앉은 자세
        box(-.42, -.2, .72, .05, .2, 1.32, vest, bevel=.07)
        box(-.38, -.18, 1.0, .02, .18, 1.3, shirt, bevel=.05)
        box(-.4, -.21, .9, .04, .21, 1.25, vest, bevel=.06)
        sphere(Vector((-.15, 0, 1.5)), .15, helm); sphere(Vector((-.12, 0, 1.45)), .1, skin)
        for y in (-.15, .15):
            box(-.3, y - .07, .66, .25, y + .07, .8, pants, bevel=.03)      # 허벅지
            box(.15, y - .06, .3, .27, y + .06, .76, pants, bevel=.03)      # 정강이
            box(-.05, y * 1.4 - .045, 1.12, .56, y * 1.4 + .045, 1.2, vest, bevel=.02)   # 팔
            sphere(Vector((.56, y * 2.2, .98)), .045, skin)
    elif model == 'bus':
        body = paint('body', '#d8d2c2'); stripe = paint('st', '#b8342c', .4, .2)
        box(-3.6, -.95, .35, 3.6, .95, 2.6, body, bevel=.08)
        box(-3.62, -.97, .9, 3.62, .97, 1.15, stripe, bevel=0)
        for x in range(7):
            box(-3.2 + x * .95, -.98, 1.4, -2.5 + x * .95, .98, 2.25, glass, bevel=0)
        box(3.55, -.85, 1.2, 3.63, .85, 2.35, glass, bevel=0)
        tire = paint('tire', '#151515', .9, 0)
        for x in (-2.4, 2.4):
            for y in (-.9, .9): cyl(Vector((x, y, .42)), 'Y', .25, .42, tire)

def bake_cars():
    engine('cycles', 24)
    models = ['sedan-white', 'sedan-black', 'sedan-silver', 'sedan-red', 'sedan-blue', 'taxi-pink', 'taxi-green', 'pickup', 'tuktuk', 'moto', 'bus']
    items = []
    for mdl in models:
        for d, ang in (('se', 0), ('nw', 180)):
            clear(); vehicle(mdl)
            bpy.context.view_layer.update()  # 바퀴(원기둥) 회전·머리(구) 위치가 사라지지 않게
            for o in col.objects:
                if o.type == 'MESH': o.matrix_world = Matrix.Rotation(math.radians(ang), 4, 'Z') @ o.matrix_world
            frame(208, 150, 104, 100)
            sc.render.filepath = f'{TMP}/{mdl}-{d}.png'; bpy.ops.render.render(write_still=True)
            items.append((f'{mdl}-{d}', color_decode(f'{TMP}/{mdl}-{d}.png'), 104, 100))
    pack('cars', items, 'RGBA')

# ───────── 소품 ─────────
def bake_props():
    engine('cycles', 24)
    items = []
    # 나무 (비 오는 나라의 넓은 잎 나무)
    for v in range(3):
        clear(); random.seed(10 + v)
        bark, leaf, leaf2 = paint('bark', '#5d4532', .9, 0), paint('leaf', '#3f6e34', .8, 0), paint('leaf2', '#557f3c', .8, 0)
        cyl(Vector((0, 0, 1.3)), 'Z', 2.6, .13, bark)
        for k in range(3):
            a = k * 2.1 + v
            o = cyl(Vector((math.cos(a) * .35, math.sin(a) * .35, 2.5)), 'Z', 1.1, .06, bark); o.rotation_euler = (math.cos(a) * .5, math.sin(a) * .5, 0)
        for k in range(14):
            a = random.random() * 6.28; r = random.random() * 1.2
            sphere(Vector((math.cos(a) * r, math.sin(a) * r, 3.0 + random.random() * 1.1)), .55 + random.random() * .35, leaf if k % 3 else leaf2, .7)
        frame(144, 200, 72, 180); sc.render.filepath = f'{TMP}/tree{v}.png'; bpy.ops.render.render(write_still=True)
        items.append((f'tree-{v}', color_decode(f'{TMP}/tree{v}.png'), 72, 180))
    # 가로등
    clear(); pole, lampm = paint('pole', '#4a4e54', .5, .6), paint('lamp', '#fff3d0', .2, 0, 3)
    cyl(Vector((0, 0, 2.6)), 'Z', 5.2, .06, pole); box(-.05, -.05, 5.1, .05, .9, 5.18, pole, bevel=0)
    box(-.12, .75, 4.98, .12, 1.15, 5.12, pole); box(-.1, .8, 4.95, .1, 1.1, 4.99, lampm, bevel=0)
    frame(96, 200, 48, 186); sc.render.filepath = f'{TMP}/lamp.png'; bpy.ops.render.render(write_still=True)
    items.append(('lamp-0', color_decode(f'{TMP}/lamp.png'), 48, 186))
    # BTS 기둥 (윗부분 받침까지)
    clear(); conc = color_mat('conc', '#a39f96', 'noise', 4, .08)
    box(-.55, -.55, 0, .55, .55, 6.5, conc, bevel=.04)
    box(-1.6, -.75, 6.5, 1.6, .75, 7.4, conc, bevel=.05)
    box(-.75, -.75, 0, .75, .75, .25, conc, bevel=.02)
    frame(160, 280, 80, 250); sc.render.filepath = f'{TMP}/pillar.png'; bpy.ops.render.render(write_still=True)
    items.append(('pillar-0', color_decode(f'{TMP}/pillar.png'), 80, 250))
    # BTS 고가 상판 한 칸 (+i 방향, 기둥 머리 위)
    clear(); conc3 = color_mat('deck', '#a7a39a', 'noise', 3, .08); dark3 = paint('rail', '#4a4d52', .5, .6); under = color_mat('under', '#7e7a72', 'noise', 3, .08)
    box(0, -1.35, 7.35, T, 1.35, 8.05, conc3, bevel=0)
    box(0, -1.2, 7.2, T, 1.2, 7.35, under, bevel=0)
    box(0, -1.35, 8.05, T, -1.2, 8.55, conc3, bevel=0); box(0, 1.2, 8.05, T, 1.35, 8.55, conc3, bevel=0)
    for y in (-.75, -.35, .35, .75): box(0, y - .03, 8.05, T, y + .03, 8.13, dark3, bevel=0)
    frame(112, 280, 40, 260); sc.render.filepath = f'{TMP}/deck.png'; bpy.ops.render.render(write_still=True)
    items.append(('deck-0', color_decode(f'{TMP}/deck.png'), 40, 260))
    # 노점 수레 (파라솔)
    clear(); cartm, um, um2, food, dark = paint('cart', '#8c8f94', .4, .6), paint('umb', '#c8402e', .8, 0), paint('umb2', '#efe6d0', .8, 0), paint('food', '#d9913a', .7, 0), paint('dk', '#2a2724', .7, 0)
    box(-.7, -.4, .5, .7, .4, 1.0, cartm); box(-.65, -.35, 1.0, .65, .35, 1.08, um2, bevel=0)
    for x in (-.4, -.05, .3): box(x, -.2, 1.08, x + .25, .2, 1.18, food)
    for x in (-.6, .6):
        cyl(Vector((x, .38, .25)), 'Y', .06, .25, dark)
    cyl(Vector((.0, .0, 1.6)), 'Z', 1.2, .025, dark)
    for k in range(8):
        a0, a1 = k * math.pi / 4, (k + 1) * math.pi / 4
        slab([(0, 0, 2.35), (math.cos(a0) * 1.15, math.sin(a0) * 1.15, 1.95), (math.cos(a1) * 1.15, math.sin(a1) * 1.15, 1.95)], um if k % 2 else um2, .02)
    frame(112, 112, 56, 86); sc.render.filepath = f'{TMP}/cart.png'; bpy.ops.render.render(write_still=True)
    items.append(('cart-0', color_decode(f'{TMP}/cart.png'), 56, 86))
    # 옥상 설비 (물탱크·실외기·계단실)
    clear(); tank, acm, fan, conc2 = paint('tank', '#3b77b3', .35, .2), paint('ac', '#e6e2d8', .5, 0), paint('fan', '#2b2b2b', .6, 0), color_mat('c2', '#9a958c', 'noise', 4, .1)
    cyl(Vector((0, 0, .9)), 'Z', 1.5, .55, tank); cyl(Vector((0, 0, 1.68)), 'Z', .08, .45, tank)
    for (x, y) in ((-.4, -.4), (.4, -.4), (-.4, .4), (.4, .4)): box(x - .04, y - .04, 0, x + .04, y + .04, .2, paint('leg', '#555555', .5, .5), bevel=0)
    frame(80, 96, 40, 80); sc.render.filepath = f'{TMP}/tank.png'; bpy.ops.render.render(write_still=True)
    items.append(('tank-0', color_decode(f'{TMP}/tank.png'), 40, 80))
    clear(); box(-.45, -.3, 0, .45, .3, .65, acm); cyl(Vector((0, -.31, .33)), 'Y', .02, .22, fan)
    frame(64, 64, 32, 48); sc.render.filepath = f'{TMP}/acbox.png'; bpy.ops.render.render(write_still=True)
    items.append(('acbox-0', color_decode(f'{TMP}/acbox.png'), 32, 48))
    clear(); box(-.9, -.9, 0, .9, .9, 2.1, conc2); box(-.95, -.95, 2.1, .95, .95, 2.2, conc2); box(-.35, -.92, 0, .35, -.88, 1.9, paint('door', '#5a4a3a', .7, 0), bevel=0)
    frame(112, 128, 56, 100); sc.render.filepath = f'{TMP}/stair.png'; bpy.ops.render.render(write_still=True)
    items.append(('stair-0', color_decode(f'{TMP}/stair.png'), 56, 100))
    pack('props', items, 'RGBA')

t0 = time.time()
if 'bld' in WHAT: bake_modules()
if 'ground' in WHAT: bake_ground()
if 'cars' in WHAT: bake_cars()
if 'props' in WHAT: bake_props()
print(f'[street] done {time.time() - t0:.0f}s', flush=True)
