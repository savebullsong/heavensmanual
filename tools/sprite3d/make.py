"""사용법: python3 make.py <look.json> <출력폴더> [--debug]
걷기 8장·공격 6장·서 있기 1장을 대각선 4방향(SE·SW·NE·NW)으로 렌더링"""
import sys, json, math, os
import bpy, addon_utils
from mathutils import Vector, Quaternion, Matrix
addon_utils.enable('cycles', default_set=True)
bpy.ops.wm.read_factory_settings(use_empty=True)
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from person import person

look = json.load(open(sys.argv[1])); out = sys.argv[2]; os.makedirs(out, exist_ok=True)
DEBUG = '--debug' in sys.argv
SS = 4 if '--ss' in sys.argv else 1
FRAME = 96; MPP = .034; FOOT = (48, 80)   # 1배 기준 칸 크기, 픽셀당 m, 발 위치

sc = bpy.context.scene
sc.render.engine = 'CYCLES'
sc.cycles.device = 'CPU'; sc.cycles.samples = 48 if SS == 1 else 16; sc.cycles.use_denoising = False
sc.cycles.max_bounces = 4; sc.cycles.pixel_filter_type = 'BLACKMAN_HARRIS'
sc.cycles.filter_width = 1.0 if SS == 1 else 1.5
sc.render.film_transparent = True
sc.render.resolution_x = sc.render.resolution_y = FRAME * SS * (3 if DEBUG else 1)
sc.view_settings.view_transform = 'Standard'
sc.render.image_settings.file_format = 'PNG'; sc.render.image_settings.color_mode = 'RGBA'

world = bpy.data.worlds.new('w'); sc.world = world
try: world.use_nodes = True
except Exception: pass
bg = world.node_tree.nodes['Background']; bg.inputs[0].default_value = (.42, .45, .55, 1); bg.inputs[1].default_value = .55

cam_d = bpy.data.cameras.new('cam'); cam_d.type = 'ORTHO'; cam_d.ortho_scale = FRAME * MPP
cam = bpy.data.objects.new('cam', cam_d); sc.collection.objects.link(cam); sc.camera = cam
rot = Matrix.Rotation(math.radians(45), 3, 'Z') @ Matrix.Rotation(math.radians(60), 3, 'X')
up = rot @ Vector((0, 1, 0)); fwd = rot @ Vector((0, 0, -1)); right = rot @ Vector((1, 0, 0))
off_y = (FOOT[1] - FRAME / 2) * MPP; off_x = (FOOT[0] - FRAME / 2) * MPP
target = up * off_y - right * off_x
cam.matrix_world = Matrix.Translation(target - fwd * 30) @ rot.to_4x4()

def sun(direction, energy, color, angle=8):
    d = bpy.data.lights.new('sun', 'SUN'); d.energy = energy; d.color = color; d.angle = math.radians(angle)
    o = bpy.data.objects.new('sun', d); sc.collection.objects.link(o)
    o.rotation_euler = Vector(direction).normalized().to_track_quat('-Z', 'Y').to_euler()
# 화면 왼쪽 위 앞에서 오는 주광, 뒤 오른쪽 윤곽광 — 방향이 바뀌어도 빛은 카메라 기준으로 고정
key_from = (-right * .75 + (-fwd) * .55 + Vector((0, 0, 1.1)))
sun(-key_from, 3.6, (1, .96, .9), 6)
rim_from = (right * .6 + fwd * .9 + Vector((0, 0, .6)))
sun(-rim_from, 2.2, (.75, .85, 1), 10)

arm, bones = person(look)
REST = {n: arm.data.bones[n].matrix_local.to_3x3().inverted() for n in bones}
AX = {'X': Vector((1, 0, 0)), 'Y': Vector((0, 1, 0)), 'Z': Vector((0, 0, 1))}

def pose(spec):
    for pb in arm.pose.bones: pb.rotation_quaternion = (1, 0, 0, 0)
    for bn, rots in spec.items():
        q = Quaternion()
        for ax, deg in rots:
            q = q @ Quaternion((REST[bn] @ AX[ax]).normalized(), math.radians(deg))
        arm.pose.bones[bn].rotation_quaternion = q
    arm.location = (0, 0, 0); bpy.context.view_layer.update()
    # 낮은 쪽 발이 땅에 닿게
    low = 9
    for k in 'LR':
        pb = arm.pose.bones[f'foot.{k}']
        low = min(low, pb.head.z - .08 * bones['hips'][0].z / .93, pb.tail.z - .03)
    arm.location = (0, 0, -low); bpy.context.view_layer.update()

def walk(t, bat=False):
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
    if bat:
        P['upper_arm.R'] = [('X', -8 * s - 8), ('Y', 8)]; P['forearm.R'] = [('X', -38)]
    return P

ATTACK = [  # 준비 · 치켜듦 · 정점 · 내려침(맞힘) · 휘두름 끝 · 돌아옴
    dict(spine=[('X', -8), ('Z', -12)], hips=[('Z', -6)], **{'thigh.L': [('X', -16)], 'shin.L': [('X', 14)], 'thigh.R': [('X', 10)], 'shin.R': [('X', 12)],
         'upper_arm.R': [('X', -40), ('Y', 12)], 'forearm.R': [('X', -60)], 'hand.R': [('X', -20)], 'upper_arm.L': [('X', -42), ('Y', 18)], 'forearm.L': [('X', -72)]}),
    dict(spine=[('X', 6), ('Z', -40)], hips=[('Z', -16)], **{'thigh.L': [('X', -10)], 'shin.L': [('X', 10)], 'thigh.R': [('X', 16)], 'shin.R': [('X', 16)],
         'upper_arm.R': [('X', -165), ('Y', 25)], 'forearm.R': [('X', -95)], 'upper_arm.L': [('X', -135), ('Y', 22)], 'forearm.L': [('X', -90)]}),
    dict(spine=[('X', -6), ('Z', -18)], hips=[('Z', -4)], **{'thigh.L': [('X', -28)], 'shin.L': [('X', 16)], 'thigh.R': [('X', 18)], 'shin.R': [('X', 12)],
         'upper_arm.R': [('X', -150), ('Y', 8)], 'forearm.R': [('X', -40)], 'hand.R': [('X', 30)], 'upper_arm.L': [('X', -138), ('Y', 16)], 'forearm.L': [('X', -40)]}),
    dict(spine=[('X', -24), ('Z', 10)], hips=[('Z', 8)], **{'thigh.L': [('X', -36)], 'shin.L': [('X', 22)], 'thigh.R': [('X', 24)], 'shin.R': [('X', 16)],
         'upper_arm.R': [('X', -88), ('Y', -4)], 'forearm.R': [('X', -6)], 'hand.R': [('X', 62)], 'upper_arm.L': [('X', -84), ('Y', 20)], 'forearm.L': [('X', -12)]}),
    dict(spine=[('X', -26), ('Z', 26)], hips=[('Z', 14)], **{'thigh.L': [('X', -36)], 'shin.L': [('X', 22)], 'thigh.R': [('X', 24)], 'shin.R': [('X', 16)],
         'upper_arm.R': [('X', -40), ('Y', -18)], 'forearm.R': [('X', -10)], 'hand.R': [('X', 70)], 'upper_arm.L': [('X', -36), ('Y', 14)], 'forearm.L': [('X', -24)]}),
    dict(spine=[('X', -12), ('Z', 6)], hips=[('Z', 2)], **{'thigh.L': [('X', -22)], 'shin.L': [('X', 16)], 'thigh.R': [('X', 14)], 'shin.R': [('X', 12)],
         'upper_arm.R': [('X', -34), ('Y', 8)], 'forearm.R': [('X', -50)], 'hand.R': [('X', 10)], 'upper_arm.L': [('X', -36), ('Y', 14)], 'forearm.L': [('X', -60)]}),
]
DIRS = {'se': 90, 'sw': 0, 'ne': 180, 'nw': 270}

def render(path):
    sc.render.filepath = path; bpy.ops.render.render(write_still=True)

bat = look.get('weapon') == 'bat'
dirs = look.get('dirs', list(DIRS))
anims = look.get('anims', ['idle', 'walk', 'attack'] if bat else ['idle', 'walk'])
for dn in dirs:
    arm.rotation_euler = (0, 0, math.radians(DIRS[dn]))
    if 'idle' in anims:
        P = walk(0, bat); 
        for k in ('thigh.L', 'thigh.R'): P[k] = [('X', 0)]
        P.update({'shin.L': [('X', 4)], 'shin.R': [('X', 4)], 'foot.L': [('X', -4)], 'foot.R': [('X', -4)]})
        pose(P); render(f'{out}/idle_{dn}_0.png')
    if 'walk' in anims:
        for f in range(8): pose(walk(f / 8, bat)); render(f'{out}/walk_{dn}_{f}.png')
    if 'attack' in anims:
        for f, P in enumerate(ATTACK): pose(P); render(f'{out}/attack_{dn}_{f}.png')
print('done', out)
