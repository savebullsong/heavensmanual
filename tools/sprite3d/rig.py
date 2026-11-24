"""Heaven's Manual — 3D 인형을 만들어 도트로 렌더링하는 도구 (Blender 5, bpy 모듈)
사람 한 명 = 뼈대(armature) + 몸 조각들. 조각마다 어느 뼈를 따라 움직일지(무게)와 재질을 정한다."""
import bpy, bmesh, math
from mathutils import Vector, Matrix, Quaternion

def lin(h):
    h = h.lstrip('#'); c = [int(h[i:i+2], 16) / 255 for i in (0, 2, 4)]
    return tuple(((x + 0.055) / 1.055) ** 2.4 if x > 0.04045 else x / 12.92 for x in c)

_mats = {}
def mat(name, hexcol, rough=0.7, spec=0.25, metal=0.0, emit=None):
    key = (name, hexcol)
    if key in _mats: return _mats[key]
    m = bpy.data.materials.new(name)
    try: m.use_nodes = True
    except Exception: pass
    b = m.node_tree.nodes.get('Principled BSDF')
    b.inputs['Base Color'].default_value = (*lin(hexcol), 1)
    b.inputs['Roughness'].default_value = rough
    for k in ('Specular IOR Level', 'Specular'):
        if k in b.inputs: b.inputs[k].default_value = spec; break
    b.inputs['Metallic'].default_value = metal
    if emit:
        b.inputs['Emission Color'].default_value = (*lin(emit[0]), 1)
        b.inputs['Emission Strength'].default_value = emit[1]
    _mats[key] = m
    return m

# ───────── 뼈대 ─────────
def skeleton(p):
    """p: 체형 값. 남자 기준 키 1.75m. 왼쪽 = +X, 앞 = -Y"""
    s = p['h']; sw = p['shoulder']; hw = p['hipw']
    nk = p.get('neck', 0)   # 목이 긴 괴물(프렛)은 머리를 그만큼 위로
    B = {
        'hips': ((0, 0, .93), (0, 0, 1.03), None),
        'spine': ((0, 0, 1.03), (0, 0, 1.42), 'hips'),
        'neck': ((0, 0, 1.42), (0, 0, 1.50 + nk), 'spine'),
        'head': ((0, 0, 1.50 + nk), (0, 0, 1.74 + nk), 'neck'),
    }
    for side, k in ((1, 'L'), (-1, 'R')):
        B[f'upper_arm.{k}'] = ((side * sw, 0, 1.40), (side * (sw + .03), .01, 1.12), 'spine')
        B[f'forearm.{k}'] = ((side * (sw + .03), .01, 1.12), (side * (sw + .045), -.02, .88), f'upper_arm.{k}')
        B[f'hand.{k}'] = ((side * (sw + .045), -.02, .88), (side * (sw + .05), -.03, .79), f'forearm.{k}')
        # 다리: 무릎과 발을 조금 벌려 단단히 버티고 선 자세 (사람 몸만 — 괴물 몸은 예전 그대로)
        sp = p.get('stance', 0)
        B[f'thigh.{k}'] = ((side * hw, 0, .93), (side * (hw + .005 + sp * .55), 0, .50), 'hips')
        B[f'shin.{k}'] = ((side * (hw + .005 + sp * .55), 0, .50), (side * (hw + .005 + sp), .02, .08), f'thigh.{k}')
        B[f'foot.{k}'] = ((side * (hw + .005 + sp), .02, .08), (side * (hw + .005 + sp), -.11, .03), f'shin.{k}')
    out = {}
    for n, (a, b, par) in B.items():
        out[n] = (Vector(a) * s, Vector(b) * s, par)
    return out

def make_armature(bones):
    ad = bpy.data.armatures.new('rig')
    arm = bpy.data.objects.new('rig', ad)
    bpy.context.scene.collection.objects.link(arm)
    bpy.context.view_layer.objects.active = arm
    bpy.ops.object.mode_set(mode='EDIT')
    for n, (a, b, par) in bones.items():
        e = ad.edit_bones.new(n); e.head = a; e.tail = b; e.roll = 0
    for n, (a, b, par) in bones.items():
        if par: ad.edit_bones[n].parent = ad.edit_bones[par]; ad.edit_bones[n].use_connect = False
    bpy.ops.object.mode_set(mode='OBJECT')
    for pb in arm.pose.bones: pb.rotation_mode = 'QUATERNION'
    return arm

# ───────── 몸 조각 ─────────
class Part:
    def __init__(self, name):
        self.bm = bmesh.new(); self.name = name
        self.mats = []; self.weights = []  # per vert: {bone: w}
    def mat_index(self, m):
        if m not in self.mats: self.mats.append(m)
        return self.mats.index(m)

def _frame(a):
    ref = Vector((0, -1, 0))
    if abs(a.dot(ref)) > .9: ref = Vector((0, 0, 1))
    u = (ref - a * a.dot(ref)).normalized()   # 앞쪽
    v = a.cross(u).normalized()               # 옆쪽
    return u, v

def loft(P, rings, m, weight, segs=12, caps=(True, True), matfn=None):
    """rings: [(center Vector, u, v, r_side, r_fwd)] — weight(center)->{bone:w}"""
    bm = P.bm; loops = []
    for c, u, v, rs, rf in rings:
        ring = []
        for i in range(segs):
            t = 2 * math.pi * i / segs
            co = c + v * (rs * math.cos(t)) + u * (rf * math.sin(t))
            vert = bm.verts.new(co); ring.append(vert)
        loops.append(ring)
    def face(vs, center_z):
        f = bm.faces.new(vs)
        mm = matfn(center_z) if matfn else m
        f.material_index = P.mat_index(mm)
    for r0, r1 in zip(loops, loops[1:]):
        for i in range(segs):
            j = (i + 1) % segs
            face([r0[i], r0[j], r1[j], r1[i]], (r0[i].co.z + r1[i].co.z) / 2)
    for k, (idx, flip) in enumerate(((0, True), (-1, False))):
        if not caps[k]: continue
        c, u, v, rs, rf = rings[idx]
        a = (rings[-1][0] - rings[0][0]).normalized() * (-1 if flip else 1)
        cv = bm.verts.new(c + a * min(rs, rf) * .35)
        ring = loops[idx]
        for i in range(segs):
            j = (i + 1) % segs
            vs = [ring[i], ring[j], cv] if not flip else [ring[j], ring[i], cv]
            face(vs, c.z)

def limb(P, p0, p1, prof, m, weight, segs=10, caps=(True, True), matfn=None):
    a = (p1 - p0).normalized(); u, v = _frame(a)
    rings = [(p0 + (p1 - p0) * t, u, v, rs, rf) for t, rs, rf in prof]
    loft(P, rings, m, weight, segs, caps, matfn)

def blob(P, c, r, m, weight, segs=12, rings=9, cut=None):
    """타원체. cut(co)->True 면 그 꼭짓점 삭제 (머리카락 얼굴 부분 등)"""
    bm = P.bm; grid = []
    for i in range(rings + 1):
        ph = math.pi * i / rings; row = []
        for j in range(segs):
            th = 2 * math.pi * j / segs
            co = Vector((c[0] + r[0] * math.sin(ph) * math.cos(th), c[1] + r[1] * math.sin(ph) * math.sin(th), c[2] + r[2] * math.cos(ph)))
            if cut and cut(co): row.append(None); continue
            vert = bm.verts.new(co); row.append(vert)
        grid.append(row)
    mi = P.mat_index(m)
    for i in range(rings):
        for j in range(segs):
            k = (j + 1) % segs
            vs = [grid[i][j], grid[i][k], grid[i + 1][k], grid[i + 1][j]]
            if any(x is None for x in vs): continue
            # 극점에서 겹치는 꼭짓점 정리
            uniq = []
            for x in vs:
                if all((x.co - y.co).length > 1e-6 for y in uniq): uniq.append(x)
            if len(uniq) < 3: continue
            try:
                f = bm.faces.new(uniq); f.material_index = mi
            except ValueError: pass

def finish(P):
    me = bpy.data.meshes.new(P.name)
    bmesh.ops.remove_doubles(P.bm, verts=P.bm.verts, dist=1e-5)
    P.bm.to_mesh(me); P.bm.free()
    ob = bpy.data.objects.new(P.name, me)
    bpy.context.scene.collection.objects.link(ob)
    for m in P.mats: me.materials.append(m)
    for poly in me.polygons: poly.use_smooth = True
    return ob

def bind(ob, arm, weightfn, subsurf=1):
    groups = {}
    for v in ob.data.vertices:
        for bn, w in weightfn(v.co).items():
            if w <= 0: continue
            g = groups.get(bn) or ob.vertex_groups.new(name=bn); groups[bn] = g
            g.add([v.index], w, 'REPLACE')
    if subsurf:
        sm = ob.modifiers.new('sub', 'SUBSURF'); sm.levels = subsurf; sm.render_levels = subsurf
    am = ob.modifiers.new('arm', 'ARMATURE'); am.object = arm
    ob.parent = arm

def smooth(x, a, b):
    t = max(0.0, min(1.0, (x - a) / (b - a))); return t * t * (3 - 2 * t)

def seg_dist(p, a, b):
    ab = b - a; t = max(0.0, min(1.0, (p - a).dot(ab) / ab.length_squared))
    return (p - (a + ab * t)).length

def autow(bones, names, power=6):
    """가까운 뼈 두 개에 거리 반비례로 무게를 나눈다 (팔꿈치·무릎이 부드럽게 접힘)"""
    def f(co):
        ds = sorted(((seg_dist(co, bones[n][0], bones[n][1]) + 1e-4, n) for n in names))[:2]
        ws = [(1 / d ** power, n) for d, n in ds]; tot = sum(w for w, _ in ws)
        return {n: w / tot for w, n in ws}
    return f

def rigid(name):
    return lambda co: {name: 1.0}
