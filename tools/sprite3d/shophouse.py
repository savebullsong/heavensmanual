"""방콕 숍하우스(4층 상가주택) 한 줄을 같은 카메라로 렌더링하는 시안.
사용법: python3 shophouse.py <출력.png> [배율=2]"""
import sys, os, math, random
import bpy, bmesh, addon_utils
from mathutils import Vector, Matrix
addon_utils.enable('cycles', default_set=True)
bpy.ops.wm.read_factory_settings(use_empty=True)
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from rig import lin
random.seed(4)
OUT = sys.argv[1]; SS = int(sys.argv[2]) if len(sys.argv) > 2 else 2
MPP = .034
sc = bpy.context.scene; col = sc.collection

# ───────── 재질 ─────────
def nodes_mat(name):
    m = bpy.data.materials.new(name)
    try: m.use_nodes = True
    except Exception: pass
    nt = m.node_tree; return m, nt, nt.nodes['Principled BSDF']

def plaster(name, hexcol, dirt=.10, scale=1.2, rough=.9):
    m, nt, b = nodes_mat(name); N = nt.nodes; L = nt.links
    tc = N.new('ShaderNodeTexCoord'); nz = N.new('ShaderNodeTexNoise')
    nz.inputs['Scale'].default_value = scale; nz.inputs['Detail'].default_value = 8
    L.new(tc.outputs['Object'], nz.inputs['Vector'])
    ramp = N.new('ShaderNodeValToRGB'); ramp.color_ramp.elements[0].position = .35; ramp.color_ramp.elements[1].position = .75
    L.new(nz.outputs['Fac'], ramp.inputs['Fac'])
    mix = N.new('ShaderNodeMix'); mix.data_type = 'RGBA'
    c = lin(hexcol); dk = tuple(x * (1 - dirt) * .8 for x in c)
    mix.inputs[6].default_value = (*dk, 1); mix.inputs[7].default_value = (*c, 1)
    L.new(ramp.outputs['Color'], mix.inputs[0])
    L.new(mix.outputs[2], b.inputs['Base Color'])
    b.inputs['Roughness'].default_value = rough
    bump = N.new('ShaderNodeBump'); bump.inputs['Strength'].default_value = .15
    L.new(nz.outputs['Fac'], bump.inputs['Height']); L.new(bump.outputs['Normal'], b.inputs['Normal'])
    return m

def stripes(name, c1, c2, axis='X', width=.35):
    m, nt, b = nodes_mat(name); N = nt.nodes; L = nt.links
    tc = N.new('ShaderNodeTexCoord'); sep = N.new('ShaderNodeSeparateXYZ')
    L.new(tc.outputs['Object'], sep.inputs[0])
    mth = N.new('ShaderNodeMath'); mth.operation = 'PINGPONG'; mth.inputs[1].default_value = width
    L.new(sep.outputs[axis], mth.inputs[0])
    gt = N.new('ShaderNodeMath'); gt.operation = 'GREATER_THAN'; gt.inputs[1].default_value = width / 2
    L.new(mth.outputs[0], gt.inputs[0])
    mix = N.new('ShaderNodeMix'); mix.data_type = 'RGBA'
    mix.inputs[6].default_value = (*lin(c1), 1); mix.inputs[7].default_value = (*lin(c2), 1)
    L.new(gt.outputs[0], mix.inputs[0]); L.new(mix.outputs[2], b.inputs['Base Color'])
    b.inputs['Roughness'].default_value = .85
    return m

def shutter(name, hexcol):
    m, nt, b = nodes_mat(name); N = nt.nodes; L = nt.links
    tc = N.new('ShaderNodeTexCoord'); w = N.new('ShaderNodeTexWave'); w.wave_type = 'BANDS'; w.bands_direction = 'Z'
    w.inputs['Scale'].default_value = 3.2
    L.new(tc.outputs['Object'], w.inputs['Vector'])
    bump = N.new('ShaderNodeBump'); bump.inputs['Strength'].default_value = .6
    L.new(w.outputs['Fac'], bump.inputs['Height']); L.new(bump.outputs['Normal'], b.inputs['Normal'])
    b.inputs['Base Color'].default_value = (*lin(hexcol), 1); b.inputs['Metallic'].default_value = .6; b.inputs['Roughness'].default_value = .45
    return m

def solid(name, hexcol, rough=.6, metal=0., emit=0.):
    m, nt, b = nodes_mat(name)
    b.inputs['Base Color'].default_value = (*lin(hexcol), 1); b.inputs['Roughness'].default_value = rough; b.inputs['Metallic'].default_value = metal
    if emit:
        b.inputs['Emission Color'].default_value = (*lin(hexcol), 1); b.inputs['Emission Strength'].default_value = emit
    return m

def paving(name):
    m, nt, b = nodes_mat(name); N = nt.nodes; L = nt.links
    tc = N.new('ShaderNodeTexCoord'); br = N.new('ShaderNodeTexBrick')
    br.inputs['Scale'].default_value = 1.6; br.inputs['Mortar Size'].default_value = .012
    br.inputs['Color1'].default_value = (*lin('#b9ab98'), 1); br.inputs['Color2'].default_value = (*lin('#a39684'), 1)
    br.inputs['Mortar'].default_value = (*lin('#6e665c'), 1)
    L.new(tc.outputs['Object'], br.inputs['Vector']); L.new(br.outputs['Color'], b.inputs['Base Color'])
    b.inputs['Roughness'].default_value = .9
    return m

def asphalt(name):
    return plaster(name, '#4a4a50', dirt=.25, scale=18, rough=.95)

# ───────── 도형 ─────────
def box(x0, y0, z0, x1, y1, z1, m, bevel=.015):
    me = bpy.data.meshes.new('b'); bm = bmesh.new()
    bmesh.ops.create_cube(bm, size=1)
    for v in bm.verts: v.co = Vector(((x0 + x1) / 2 + v.co.x * (x1 - x0), (y0 + y1) / 2 + v.co.y * (y1 - y0), (z0 + z1) / 2 + v.co.z * (z1 - z0)))
    bm.to_mesh(me); bm.free(); me.materials.append(m)
    o = bpy.data.objects.new('b', me); col.objects.link(o)
    if bevel:
        bv = o.modifiers.new('bv', 'BEVEL'); bv.width = bevel; bv.segments = 2
    return o

def cyl(x, y, z0, z1, r, m, axis='Z', seg=16):
    me = bpy.data.meshes.new('c'); bm = bmesh.new()
    bmesh.ops.create_cone(bm, cap_ends=True, segments=seg, radius1=r, radius2=r, depth=1)
    bm.to_mesh(me); bm.free(); me.materials.append(m)
    o = bpy.data.objects.new('c', me); col.objects.link(o)
    L = z1 - z0
    if axis == 'Z': o.location = (x, y, (z0 + z1) / 2); o.scale = (1, 1, L)
    elif axis == 'X': o.location = ((z0 + z1) / 2, y, x); o.rotation_euler = (0, math.pi / 2, 0); o.scale = (1, 1, L)
    elif axis == 'Y': o.location = (x, (z0 + z1) / 2, y); o.rotation_euler = (math.pi / 2, 0, 0); o.scale = (1, 1, L)
    for p in me.polygons: p.use_smooth = True
    return o

def slab(pts, m):
    me = bpy.data.meshes.new('s'); me.from_pydata([Vector(p) for p in pts], [], [list(range(len(pts)))]); me.materials.append(m)
    o = bpy.data.objects.new('s', me); col.objects.link(o)
    sol = o.modifiers.new('sol', 'SOLIDIFY'); sol.thickness = .03
    return o

# ───────── 숍하우스 ─────────
W = 4.2; N = 3; D = 9.0; G = 3.8; F = 3.2; FL = 4
H = G + F * (FL - 1)
concrete = plaster('concrete', '#9c968c', .14, 2.5)
trim = plaster('trim', '#d8d2c4', .08, 3)
glass = solid('glass', '#26313c', rough=.08)
frame = solid('alu', '#c9ccce', rough=.35, metal=.7)
grille = solid('grille', '#3b3f44', rough=.5, metal=.6)
dark = solid('inside', '#1c1612')
warm = solid('lamp', '#ffd9a0', emit=2.5)
acm = solid('ac', '#e4e0d6', rough=.5)
fan = solid('fan', '#2b2b2b', rough=.6)
walls = [plaster('w0', '#e8d9b0'), plaster('w1', '#c9d6cf'), plaster('w2', '#e6c3a8')]
awn = [stripes('aw0', '#2f7a4a', '#e9e4d6'), stripes('aw1', '#2c5a8c', '#e9e4d6'), stripes('aw2', '#a33a2c', '#efe2c6')]
signs = [solid('s0', '#c8302a', rough=.4), solid('s1', '#e8b830', rough=.4), solid('s2', '#1f5aa0', rough=.4)]
txt = solid('txt', '#fbf6e8', rough=.4)
shut = shutter('shutter', '#8d98a3')
plant = solid('plant', '#3f7a3a', rough=.8)
pot = solid('pot', '#a2573a', rough=.8)
tank = solid('tank', '#2f6fae', rough=.35, metal=.2)

for i in range(N):
    x0 = i * W; x1 = x0 + W; wm = walls[i]
    # 몸체 (앞면 y=0, 뒤로 D)
    box(x0, 0, 0, x1, D, H, wm, bevel=0)
    # 1층 가게 입구: 어두운 실내 + 반쯤 열린 셔터
    box(x0 + .3, -.02, 0, x1 - .3, .4, G - .25, dark, bevel=0)
    box(x0 + .3, -.06, G - 1.35, x1 - .3, -.02, G - .25, shut, bevel=0)
    box(x0 + .25, -.25, G - .35, x1 - .25, .0, G - .05, trim)
    for k in range(3):  # 안쪽 형광등과 물건
        box(x0 + .8 + k * 1.1, .25, G - .5, x0 + 1.4 + k * 1.1, .35, G - .45, warm, bevel=0)
        box(x0 + .6 + k * 1.1, .3, 0, x0 + 1.3 + k * 1.1, .38, .4 + random.random() * .9, solid(f'goods{i}{k}', random.choice(['#c9a24a', '#7aa0c0', '#c06050', '#e0d0b0']), rough=.7))
    # 차양 (기울어진 천)
    slab([(x0 + .15, 0, G + .05), (x1 - .15, 0, G + .05), (x1 - .15, -1.35, G - .55), (x0 + .15, -1.35, G - .55)], awn[i])
    # 가게 안 불빛
    ld = bpy.data.lights.new('in', 'AREA'); ld.energy = 260; ld.size = 3; ld.color = (1, .9, .75)
    lo = bpy.data.objects.new('in', ld); col.objects.link(lo); lo.location = (x0 + W / 2, .2, G - .5); lo.rotation_euler = (math.radians(-20), 0, 0)
    # 간판 (가짜 글자 막대)
    box(x0 + .1, -.18, G + .3, x1 - .1, -.02, G + 1.25, signs[i])
    rng = random.Random(i)
    xs = x0 + .5
    while xs < x1 - .7:
        w = .18 + rng.random() * .35
        box(xs, -.2, G + .55 + rng.random() * .1, xs + w, -.17, G + .95 + rng.random() * .1, txt, bevel=.005); xs += w + .12
    # 위층
    for f in range(1, FL):
        z = G + (f - 1) * F
        box(x0, -.1, z - .05, x1, .0, z + .12, trim, bevel=.01)              # 층 띠
        for j, (wx0, wx1) in enumerate(((x0 + .5, x0 + 1.9), (x0 + 2.3, x1 - .5))):
            box(wx0 - .08, -.05, z + 1.0, wx1 + .08, .02, z + 2.55, frame, bevel=.005)
            box(wx0, -.07, z + 1.08, wx1, .0, z + 2.47, glass, bevel=0)
            box((wx0 + wx1) / 2 - .02, -.09, z + 1.08, (wx0 + wx1) / 2 + .02, -.06, z + 2.47, frame, bevel=0)
            for b in range(int((wx1 - wx0) / .14) + 1):  # 방범 창살
                bx = wx0 + b * .14
                box(bx - .012, -.2, z + 1.0, bx + .012, -.18, z + 2.55, grille, bevel=0)
            box(wx0 - .1, -.22, z + .98, wx1 + .1, -.18, z + 1.02, grille, bevel=0)
            box(wx0 - .1, -.22, z + 2.53, wx1 + .1, -.18, z + 2.57, grille, bevel=0)
            box(wx0 - .12, -.12, z + .9, wx1 + .12, .0, z + 1.0, trim, bevel=.01)   # 창턱
        # 에어컨 실외기
        if (i + f) % 2 == 0:
            ax = x0 + (1.95 if f % 2 else 2.05) - .4
            box(ax, -.45, z + .25, ax + .8, -.05, z + .8, acm)
            cyl(ax + .5, -.46, -.47, -.44, .2, fan, axis='Y')
            box(ax + .05, -.4, z + .18, ax + .75, -.05, z + .22, grille, bevel=0)
    # 2층 발코니와 화분
    if i == 1:
        z = G
        box(x0 + .2, -.9, z + .1, x1 - .2, 0, z + .22, concrete)
        for b in range(int((W - .4) / .12) + 1):
            bx = x0 + .2 + b * .12
            box(bx - .01, -.88, z + .22, bx + .01, -.86, z + 1.15, grille, bevel=0)
        box(x0 + .2, -.9, z + 1.13, x1 - .2, -.84, z + 1.18, grille, bevel=0)
        for k in range(4):
            px = x0 + .6 + k * .9
            cyl(px, -.55, z + .22, z + .55, .14, pot)
            bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=2, radius=.28 + rng.random() * .08, location=(px, -.55, z + .75))
            o = bpy.context.object; o.data.materials.append(plant); o.scale = (1, 1, .85)
    # 옥상 난간과 물탱크
    box(x0, -.1, H, x1, .12, H + .9, wm)
    box(x0, D - .12, H, x1, D, H + .9, wm)
    box(x0, 0, H - .02, x1, D, H + .02, concrete, bevel=0)
    if i == 0:
        cyl(x0 + 2.0, 5.5, H, H + 1.9, .7, tank)
        cyl(x0 + 2.0, 5.5, H + 1.9, H + 2.0, .55, tank)
    if i == 2:
        box(x0 + .8, 3.0, H, x0 + 1.7, 3.7, H + .75, acm); cyl(x0 + 1.25, 2.98, 2.97, 3.0, .28, fan, axis='Y')
        box(x0 + 2.2, 3.0, H, x0 + 3.1, 3.7, H + .75, acm); cyl(x0 + 2.65, 2.98, 2.97, 3.0, .28, fan, axis='Y')
    # 기둥
    box(x0 - .12, -.14, 0, x0 + .12, .0, H + .9, trim, bevel=.01)
box(N * W - .12, -.14, 0, N * W + .12, .0, H + .9, trim, bevel=.01)
box(N * W, 0, 0, N * W + .02, D, H + .9, walls[2], bevel=0)   # 옆벽
for f in range(1, FL):  # 옆벽 작은 창
    z = G + (f - 1) * F
    for yy in (2.2, 5.6):
        box(N * W - .02, yy, z + 1.2, N * W + .06, yy + .9, z + 2.3, frame, bevel=.005)
        box(N * W, yy + .06, z + 1.26, N * W + .08, yy + .84, z + 2.24, glass, bevel=0)
box(N * W, 3.2, G + .3, N * W + .05, 7.4, G + 1.7, signs[1], bevel=.01)   # 옆벽 광고판
for k in range(5):
    box(N * W + .05, 3.5 + k * .75, G + .7, N * W + .08, 3.5 + k * .75 + .5, G + 1.3, txt, bevel=.003)
for k in range(3):  # 옆벽 배관
    cyl(N * W + .08, .8 + k * .25, 0, H + .5, .045, grille)

# 보도와 차도
box(-2, -4.0, -.15, N * W + 3, 0, .0, paving('pave'), bevel=0)
box(-2, -4.15, -.15, N * W + 3, -3.95, .03, concrete, bevel=.01)            # 연석
box(-2, -12, -.2, N * W + 3, -4.0, -.12, asphalt('road'), bevel=0)
for k in range(6): box(-1.5 + k * 3.2, -8.1, -.12, -.3 + k * 3.2, -7.95, -.11, txt, bevel=0)  # 차선

# ───────── 카메라·빛 (캐릭터와 같은 설정) ─────────
sc.render.engine = 'CYCLES'; sc.cycles.device = 'CPU'; sc.cycles.samples = 40; sc.cycles.use_denoising = False
sc.cycles.max_bounces = 4; sc.cycles.filter_width = 1.5
sc.render.film_transparent = True; sc.view_settings.view_transform = 'Standard'
world = bpy.data.worlds.new('w'); sc.world = world
bg = world.node_tree.nodes['Background']; bg.inputs[0].default_value = (.55, .62, .75, 1); bg.inputs[1].default_value = .7
rot = Matrix.Rotation(math.radians(45), 3, 'Z') @ Matrix.Rotation(math.radians(60), 3, 'X')
up = rot @ Vector((0, 1, 0)); fwd = rot @ Vector((0, 0, -1)); right = rot @ Vector((1, 0, 0))
RW, RH = 640, 700
cam_d = bpy.data.cameras.new('cam'); cam_d.type = 'ORTHO'; cam_d.ortho_scale = max(RW, RH) * MPP
cam = bpy.data.objects.new('cam', cam_d); col.objects.link(cam); sc.camera = cam
center = Vector((N * W / 2 + 1.2, -2.0, 7.4))
cam.matrix_world = Matrix.Translation(center - fwd * 60) @ rot.to_4x4()
sc.render.resolution_x = RW * SS; sc.render.resolution_y = RH * SS
def sun(direction, energy, color, angle):
    d = bpy.data.lights.new('sun', 'SUN'); d.energy = energy; d.color = color; d.angle = math.radians(angle)
    o = bpy.data.objects.new('sun', d); col.objects.link(o)
    o.rotation_euler = Vector(direction).normalized().to_track_quat('-Z', 'Y').to_euler()
key_from = (-right * .75 + (-fwd) * .55 + Vector((0, 0, 1.1)))
sun(-key_from, 3.6, (1, .96, .9), 3)
sc.render.filepath = OUT; bpy.ops.render.render(write_still=True); print('done', OUT)
