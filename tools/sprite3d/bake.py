"""인형 하나(성별·체형)를 만들고, 맡은 층(몸·머리·무기)을 모든 동작·4방향으로 굽는다.
사용법: python3 bake.py '<job json>' <출력폴더>
job = {"sex":"m","build":1,"child":false,"sets":[{"kind":"base","outfit":"casual","mode":"u"}, {"kind":"hair","style":"short"}, {"kind":"weapon","weapon":"bat"}]}
출력: <키>.png (L=구역×16+음영, A) 와 <키>.json (장면별 자리와 발 기준 위치)"""
import sys, os, json, math, time
import bpy, addon_utils
import numpy as np
from mathutils import Vector, Matrix, Quaternion
from PIL import Image
HERE = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, HERE)
addon_utils.enable('cycles', default_set=True)
bpy.ops.wm.read_factory_settings(use_empty=True)
import rig, body, poses

job = json.loads(sys.argv[1]); OUT = sys.argv[2]; os.makedirs(OUT, exist_ok=True)
TMP = f'/tmp/bake_{os.getpid()}'; os.makedirs(TMP, exist_ok=True)
# scale = 2 이면 같은 크기의 인물을 픽셀 두 배로 (더 섬세한 도트, 화면에서는 반으로 줄여 같은 크기)
SCALE = int(job.get('scale', 1))
CELL_W, CELL_H, FOOT = 96 * SCALE, 100 * SCALE, (48 * SCALE, 82 * SCALE)
MPP = .034 / SCALE; SS = 2; SAMPLES = int(job.get('samples', 10))
# 화면 기준 방향 → 인형이 도는 각도. 대각선 넷(se·sw·ne·nw)은 모든 동작, 상하좌우 넷(s·e·n·w)은 서기·걷기만
DIRS = {'se': 90, 'sw': 0, 'ne': 180, 'nw': 270, 's': 45, 'e': 135, 'n': 225, 'w': 315}
LREF = float(job.get('lref', .80))

sc = bpy.context.scene
sc.render.film_transparent = True
sc.view_settings.view_transform = 'Standard'
sc.render.dither_intensity = 0
sc.render.image_settings.file_format = 'PNG'; sc.render.image_settings.color_mode = 'RGBA'
sc.render.resolution_x = CELL_W * SS; sc.render.resolution_y = CELL_H * SS
world = bpy.data.worlds.new('w'); sc.world = world
bg = world.node_tree.nodes['Background']; bg.inputs[0].default_value = (.42, .45, .55, 1); bg.inputs[1].default_value = .55
cam_d = bpy.data.cameras.new('cam'); cam_d.type = 'ORTHO'
cam = bpy.data.objects.new('cam', cam_d); sc.collection.objects.link(cam); sc.camera = cam
rot = Matrix.Rotation(math.radians(45), 3, 'Z') @ Matrix.Rotation(math.radians(60), 3, 'X')
up = rot @ Vector((0, 1, 0)); fwd = rot @ Vector((0, 0, -1)); right = rot @ Vector((1, 0, 0))
cam_d.ortho_scale = max(CELL_W, CELL_H) * MPP
# 정사영 카메라는 긴 변 기준으로 맞춰진다 → 세로가 길면 세로 기준
off_y = (FOOT[1] - CELL_H / 2) * MPP; off_x = (FOOT[0] - CELL_W / 2) * MPP
cam.matrix_world = Matrix.Translation(up * off_y - right * off_x - fwd * 30) @ rot.to_4x4()
sc.render.pixel_aspect_x = sc.render.pixel_aspect_y = 1
def sun(direction, energy, color, angle):
    d = bpy.data.lights.new('sun', 'SUN'); d.energy = energy; d.color = color; d.angle = math.radians(angle)
    o = bpy.data.objects.new('sun', d); sc.collection.objects.link(o)
    o.rotation_euler = Vector(direction).normalized().to_track_quat('-Z', 'Y').to_euler()
sun(-(-right * .75 + (-fwd) * .55 + Vector((0, 0, 1.1))), 3.6, (1, .96, .9), 6)
sun(-(right * .6 + fwd * .9 + Vector((0, 0, .6))), 2.2, (.75, .85, 1), 10)

def engine(kind):
    if kind == 'cycles':
        sc.render.engine = 'CYCLES'; sc.cycles.device = 'CPU'; sc.cycles.samples = SAMPLES; sc.cycles.use_denoising = False
        sc.cycles.max_bounces = 3; sc.cycles.pixel_filter_type = 'BLACKMAN_HARRIS'; sc.cycles.filter_width = 1.5
        sc.render.use_persistent_data = True
    else:
        sc.render.engine = 'BLENDER_WORKBENCH'
        sh = sc.display.shading
        sh.light = 'FLAT'; sh.color_type = 'MATERIAL'
        sh.show_shadows = False; sh.show_cavity = False; sh.show_object_outline = False
        try: sh.show_specular_highlight = False
        except Exception: pass
        sc.display.render_aa = 'OFF'

# ── 인형 ──
D = body.Doll(job['sex'], job.get('build', 1), job.get('child', False), job.get('monster', False))
# 머리카락·무기를 구울 때 가림막이 되는 몸 (괴물은 제 몸으로 가린다)
OCC = 'o.' + job.get('occluder', 'casual')
need_outfits = {s['outfit'] for s in job['sets'] if s['kind'] == 'base'} | {OCC[2:]}
for o in need_outfits: D.outfit(o)
for s in job['sets']:
    if s['kind'] == 'hair': D.hair(s['style'])
    if s['kind'] == 'weapon': D.weapon(s['weapon'])
    if s['kind'] == 'armor' and ('a.' + s['piece']) not in D.groups: D.armor(s['piece'])
arm = D.arm; bones = D.bones
REST = {n: arm.data.bones[n].matrix_local.to_3x3().inverted() for n in bones}
AX = {'X': Vector((1, 0, 0)), 'Y': Vector((0, 1, 0)), 'Z': Vector((0, 0, 1))}
hk = D.hk; s = D.s
CONTACT = [('foot.L', 'tail', .03), ('foot.R', 'tail', .03), ('foot.L', 'head', .07 * s), ('foot.R', 'head', .07 * s),
           ('hips', 'head', .13 * s), ('spine', 'head', .12 * s), ('spine', 'tail', .12 * s), ('head', 'tail', .14 * s * hk), ('head', 'head', .1 * s),
           ('hand.L', 'tail', .04), ('hand.R', 'tail', .04), ('shin.L', 'head', .06), ('shin.R', 'head', .06), ('forearm.L', 'head', .04), ('forearm.R', 'head', .04)]

def pose(P, dirdeg):
    for pb in arm.pose.bones: pb.rotation_quaternion = (1, 0, 0, 0)
    for bn, rots in P.items():
        if bn == 'pitch': continue
        q = Quaternion()
        for ax, deg in rots: q = q @ Quaternion((REST[bn] @ AX[ax]).normalized(), math.radians(deg))
        arm.pose.bones[bn].rotation_quaternion = q
    arm.rotation_euler = (math.radians(P.get('pitch', 0)), 0, math.radians(dirdeg))
    arm.location = (0, 0, 0); bpy.context.view_layer.update()
    mw = arm.matrix_world; low = 9.0
    for bn, end, r in CONTACT:
        pb = arm.pose.bones[bn]
        z = (mw @ (pb.tail if end == 'tail' else pb.head)).z - r
        low = min(low, z)
    arm.location = (0, 0, -low); bpy.context.view_layer.update()

def show(groups):
    for g, obs in D.groups.items():
        for ob in obs: ob.hide_render = g not in groups

def idmode(keep):
    """keep: 그대로 둘 구역 이름들, 또는 'armor' (방어구 재질만). 나머지는 가림막 = 0"""
    for m in body.all_rmats():
        rid = int(m['rid'])
        region = [k for k, v in body.REG.items() if v == rid][0]
        if keep == 'armor': ok = m.get('tag', '') == 'armor'
        else: ok = keep is None or ((region in keep or ('wpn' in keep and m.get('tag', '') == 'wpn')) and m.get('tag', '') != 'armor')
        if keep is None and m.get('tag', '') == 'armor': ok = False
        m.diffuse_color = body.id_color(rid if ok else 0)

def frames_for(spec):
    A = _frames_for(spec)
    for k in spec.get('extra', []): A[k] = poses.GEST[job['gest']] if k == 'gest' else poses.EXTRA[k]   # 16차: heavy(양손 무기) · sit(앉기) · 42차 gest(주요 인물의 고유 동작)
    st = job.get('stride')   # 37차: 끌리는 치마를 입은 몸은 보폭을 줄인다 (다리가 치맛자락 밖으로 나오지 않게)
    if st and spec['kind'] == 'base':
        for an in ('walk', 'idle'):
            if an in A: A[an] = [{bn: ([(ax, d * st) for ax, d in r] if isinstance(r, list) and bn.split('.')[0] in ('thigh', 'shin', 'foot') else r) for bn, r in P.items()} for P in A[an]]
    return A

def _frames_for(spec):
    if spec['kind'] == 'base':
        A = poses.anims('u' if spec['mode'] == 'w' else spec['mode'])
        if spec['mode'] == 'w': A = {k: A[k] for k in ('idle', 'walk')}
        return A
    if spec['kind'] == 'hair':
        A = poses.anims('u')
        if D.child: return {k: A[k] for k in ('idle', 'walk')}
        A['swing'] = poses.SWING; A['shoot'] = poses.SHOOT
        return A
    if spec['kind'] == 'armor': return poses.anims(spec['mode'])
    w = spec['weapon']
    return poses.anims('g' if w in ('pistol', 'shotgun', 'bow', 'flamer', 'rifle') else 'm')

def key_for(spec):
    if D.monster: return f"b-{D.mkey}-{spec['outfit']}-{spec.get('mode', 'm')}" if spec['kind'] == 'base' else f"w-{D.mkey}-{spec['weapon']}"
    if spec['kind'] == 'armor': return f"a-{D.sex}{job.get('build', 1)}-{spec['piece']}-{spec['mode']}"
    who = 'c' if D.child else f"{D.sex}{job.get('build', 1)}" if spec['kind'] == 'base' else D.sex
    if spec['kind'] == 'base': return f"b-{who}-{spec['outfit']}-{spec['mode']}"
    if spec['kind'] == 'hair': return f"h-{'c' if D.child else D.sex}-{spec['style']}"
    return f"w-{D.sex}-{spec['weapon']}"

# 43차 crisp: 손으로 찍은 도트처럼 — 음영을 몇 단으로 끊고, 3D 눈 자리에 또렷한 눈 픽셀을 찍는다 (보이는 쪽 눈만, 살 위에만)
CRISP = bool(job.get('crisp'))
BANDS = np.array([2, 5, 8, 11, 13])
EYES = {}
def eye_points():
    """지금 자세에서 두 눈 앞쪽 끝의 화면 자리 (보이는 눈만) — 출력 해상도 픽셀"""
    from bpy_extras.object_utils import world_to_camera_view
    hcr = Vector((0, -.005, 1.615)) * s; hc2 = hcr + Vector((0, 0, (hk - 1) * .10 * s))
    pb = arm.pose.bones['head']; M = arm.matrix_world @ pb.matrix @ arm.data.bones['head'].matrix_local.inverted()
    out = []
    for sx in (1, -1):
        p = hc2 + (Vector((sx * .034, -.1, 1.625)) * s - hcr) * hk
        n = (M.to_3x3() @ (p - hc2)).normalized()
        if n.dot(-fwd) < .2: continue
        q = world_to_camera_view(sc, cam, M @ p)
        out.append((q.x * CELL_W, (1 - q.y) * CELL_H))
    return out

def decode(shade_png, id_png, eyes=()):
    a = np.asarray(Image.open(shade_png).convert('RGBA'), dtype=np.float32) / 255
    b = np.asarray(Image.open(id_png).convert('RGBA'))
    H, W = a.shape[0] // SS, a.shape[1] // SS
    lum = (a[..., 0] * .299 + a[..., 1] * .587 + a[..., 2] * .114)
    alpha = a[..., 3]
    rid = np.where(b[..., 3] > 127, np.clip(np.round((b[..., 0].astype(np.float32) - 8) / 16), 0, 15), -1).astype(np.int16)
    blk = lambda x: x.reshape(H, SS, W, SS).transpose(0, 2, 1, 3).reshape(H, W, SS * SS)
    L, A, R = blk(lum), blk(alpha), blk(rid)
    counts = np.stack([(R == k).sum(-1) for k in range(16)], -1)
    maj = counts.argmax(-1)
    has = counts.max(-1) > 0
    sel = (R == maj[..., None])
    shade = (L * sel).sum(-1) / np.maximum(1, sel.sum(-1))
    cover = A.mean(-1)
    opaque = has & (maj > 0) & (cover >= .45)
    lvl = np.clip(np.round(shade / LREF * 11), 0, 15).astype(np.uint8)
    if CRISP: lvl = BANDS[np.abs(lvl[..., None].astype(np.int16) - BANDS[None, None, :]).argmin(-1)].astype(np.uint8)
    val = (maj.astype(np.uint8) * 16 + lvl).astype(np.uint8)
    for ex, ey in eyes:
        x, y = int(ex), int(ey)
        for dy in range(2 if SCALE >= 3 else 1):
            if 0 <= y + dy < H and 0 <= x < W and opaque[y + dy, x] and maj[y + dy, x] == 1: val[y + dy, x] = 6 * 16 + 2
    return np.where(opaque, val, 0).astype(np.uint8), np.where(opaque, 255, 0).astype(np.uint8)

def pack(key, items, merge=False):
    """items: [(frame name, L, A)] → 잘라서 한 장에 모은다. merge면 이미 구운 장면에 덧붙인다"""
    rects = []
    if merge and os.path.exists(f'{OUT}/{key}.json'):
        old = json.load(open(f'{OUT}/{key}.json'))
        im = np.asarray(Image.open(f'{OUT}/{key}.png').convert('LA'))
        new = {n for n, _, _ in items}
        for name, m in old.items():
            if name in new or name.startswith('_'): continue
            if not m: rects.append((name, None)); continue
            px, py, w, h, ox, oy = m
            rects.append((name, (ox + FOOT[0], oy + FOOT[1], w, h, im[py:py + h, px:px + w, 0].copy(), im[py:py + h, px:px + w, 1].copy())))
    for name, L, A in items:
        ys, xs = np.nonzero(A)
        if len(xs) == 0: rects.append((name, None)); continue
        x0, x1, y0, y1 = xs.min(), xs.max() + 1, ys.min(), ys.max() + 1
        rects.append((name, (x0, y0, x1 - x0, y1 - y0, L[y0:y1, x0:x1], A[y0:y1, x0:x1])))
    W = 512; x = y = rowh = 0; place = {}
    for name, r in sorted(rects, key=lambda t: -(t[1][3] if t[1] else 0)):
        if not r: place[name] = None; continue
        w, h = r[2], r[3]
        if x + w > W: x = 0; y += rowh + 1; rowh = 0
        place[name] = (x, y); x += w + 1; rowh = max(rowh, h)
    Ht = y + rowh + 1
    img = np.zeros((Ht, W, 2), np.uint8)
    meta = {}
    for name, r in rects:
        if not r: meta[name] = None; continue
        px, py = place[name]; x0, y0, w, h, L, A = r
        img[py:py + h, px:px + w, 0] = L; img[py:py + h, px:px + w, 1] = A
        meta[name] = [int(px), int(py), int(w), int(h), int(x0 - FOOT[0]), int(y0 - FOOT[1])]
    if SCALE > 1: meta['_px'] = [SCALE]  # 이 층의 픽셀 밀도 (게임이 층마다 맞춰 합친다)
    Image.fromarray(img, 'LA').save(f'{OUT}/{key}.png', optimize=True)
    json.dump(meta, open(f'{OUT}/{key}.json', 'w'), separators=(',', ':'))

t0 = time.time(); total = 0
for spec in job['sets']:
    key = key_for(spec)
    if spec['kind'] == 'base':
        groups = {'o.' + spec['outfit']}; keep = None
    elif spec['kind'] == 'hair':
        groups = {'h.' + spec['style'], OCC}; keep = {'hair'}
    elif spec['kind'] == 'armor':
        groups = {'a.' + spec['piece'], OCC}; keep = 'armor'
    else:
        groups = {'w.' + spec['weapon'], OCC}; keep = {'wood', 'metal', 'dark', 'crest', 'wpn'}
    show(groups)
    A = frames_for(spec)
    if job.get('only'): A = {k: v for k, v in A.items() if k in job['only']}
    dirs = {k: v for k, v in DIRS.items() if k in job.get('dirs', list(DIRS))}
    jobs = [(f'{an}-{dn}-{i}', P, dd) for dn, dd in dirs.items() for an, lst in A.items() for i, P in enumerate(lst)]
    engine('cycles')
    for name, P, dd in jobs:
        pose(P, dd); sc.render.filepath = f'{TMP}/{name}_s.png'; bpy.ops.render.render(write_still=True)
        if CRISP and spec['kind'] == 'base': EYES[name] = eye_points()
    engine('workbench'); idmode(keep)
    for name, P, dd in jobs:
        pose(P, dd); sc.render.filepath = f'{TMP}/{name}_i.png'; bpy.ops.render.render(write_still=True)
    idmode(None)
    items = []
    for name, P, dd in jobs:
        L, Al = decode(f'{TMP}/{name}_s.png', f'{TMP}/{name}_i.png', EYES.get(name, ())); items.append((name, L, Al))
    pack(key, items, job.get('merge', False))
    total += len(jobs)
    print(f'[bake] {key} {len(jobs)} frames  {time.time() - t0:.0f}s', flush=True)
print(f'[bake] done {total} frames in {time.time() - t0:.0f}s', flush=True)
