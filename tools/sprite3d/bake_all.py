"""모든 캐릭터 층을 굽는다 (인형마다 Blender 한 번). 출력: apps/web/public/sprites/"""
import json, subprocess, sys, os, time
HERE = os.path.dirname(os.path.abspath(__file__))
OUT = sys.argv[1] if len(sys.argv) > 1 else os.path.join(HERE, '../../apps/web/public/sprites')
from body import HAIRS, WEAPONS, ARMOR
MODES = ['u', 'm', 'g']
jobs = []
for sex in 'mf':
    sets = [{'kind': 'base', 'outfit': o, 'mode': m} for o in ('casual', 'raincoat', 'patient', 'parrot') for m in MODES]
    if sex == 'f': sets.append({'kind': 'base', 'outfit': 'apron', 'mode': 'w'})
    sets += [{'kind': 'hair', 'style': h} for h in HAIRS]
    sets += [{'kind': 'weapon', 'weapon': w} for w in WEAPONS]
    jobs.append({'sex': sex, 'build': 1, 'sets': sets})
for sex in 'mf':
    for b in (0, 2):
        jobs.append({'sex': sex, 'build': b, 'sets': [{'kind': 'base', 'outfit': 'casual', 'mode': m} for m in MODES]})
# 방어구 (2차): 몸통·바지는 체형마다, 나머지는 보통 체형만
for sex in 'mf':
    for b in (0, 1, 2):
        sets = [{'kind': 'armor', 'piece': p, 'mode': m} for p in (['jacket', 'vest', 'workpants'] + (['helmet', 'gloves', 'shinguard', 'boots'] if b == 1 else [])) for m in MODES]
        jobs.append({'sex': sex, 'build': b, 'sets': sets, 'tag': 'armor'})
# 봉합자 (사람 모습 + 변신)
jobs.append({'sex': 'm', 'build': 1, 'sets': [{'kind': 'base', 'outfit': 'suturer', 'mode': 'm'}, {'kind': 'weapon', 'weapon': 'needle'}], 'tag': 'suturer'})
jobs.append({'sex': 'm', 'build': 1, 'monster': True, 'sets': [{'kind': 'base', 'outfit': 'stitched', 'mode': 'm'}, {'kind': 'weapon', 'weapon': 'needle'}], 'tag': 'suturer'})
jobs.append({'sex': 'm', 'build': 1, 'child': True, 'sets': [{'kind': 'base', 'outfit': 'casual', 'mode': 'w'}] + [{'kind': 'hair', 'style': h} for h in HAIRS]})
# 지옥 괴물 (2단계): 망자·프렛은 맨손, 야크는 몽둥이. 제 몸을 가림막으로
for mk, outfit, mode, weapon in (('a', 'ash', 'u', None), ('p', 'pret', 'u', None), ('y', 'yak', 'm', 'club')):
    sets = [{'kind': 'base', 'outfit': outfit, 'mode': mode}] + ([{'kind': 'weapon', 'weapon': weapon}] if weapon else [])
    jobs.append({'sex': 'm', 'build': 1, 'monster': mk, 'occluder': outfit, 'sets': sets, 'tag': 'hell'})
# 해골(맨손, 모든 동작) · 대부업자 베스크(장부, 서 있기만)
jobs.append({'sex': 'm', 'build': 1, 'monster': 's', 'occluder': 'bones', 'sets': [{'kind': 'base', 'outfit': 'bones', 'mode': 'u'}], 'tag': 'hell2'})
jobs.append({'sex': 'm', 'build': 1, 'monster': 'k', 'occluder': 'besk', 'sets': [{'kind': 'base', 'outfit': 'besk', 'mode': 'm'}, {'kind': 'weapon', 'weapon': 'ledger'}], 'only': ['idle'], 'tag': 'hell2'})
# 유황새의 앵무새: 사람 키, 두 발로 서고 걷기만
jobs.append({'sex': 'm', 'build': 1, 'monster': 'b', 'occluder': 'cockatoo', 'sets': [{'kind': 'base', 'outfit': 'cockatoo', 'mode': 'u'}], 'only': ['idle', 'walk'], 'tag': 'bird'})
# 지옥 휴식 마을의 경비병 (설정집 B01~B03)
jobs.append({'sex': 'm', 'build': 1, 'monster': 'g', 'occluder': 'warden1', 'sets': [{'kind': 'base', 'outfit': 'warden1', 'mode': 'm'}, {'kind': 'weapon', 'weapon': 'knocker'}], 'tag': 'guard'})
jobs.append({'sex': 'm', 'build': 1, 'monster': 'o', 'occluder': 'warden2', 'sets': [{'kind': 'base', 'outfit': 'warden2', 'mode': 'u'}], 'tag': 'guard'})
jobs.append({'sex': 'm', 'build': 1, 'monster': 'w', 'occluder': 'warden3', 'sets': [{'kind': 'base', 'outfit': 'warden3', 'mode': 'm'}, {'kind': 'weapon', 'weapon': 'sealstaff'}], 'tag': 'guard'})
# 지옥 괴물에게 무기 (거대한 층주는 그대로): 망자 몸 · 프렛 몸 · 해골 몸을 무기 든 자세(m)로 다시
jobs.append({'sex': 'm', 'build': 1, 'monster': 'a', 'occluder': 'ash', 'sets': [{'kind': 'base', 'outfit': 'ash', 'mode': 'm'}] + [{'kind': 'weapon', 'weapon': w} for w in ('pickaxe', 'brand', 'boathook', 'cleaver')], 'tag': 'armed'})
jobs.append({'sex': 'm', 'build': 1, 'monster': 'p', 'occluder': 'pret', 'sets': [{'kind': 'base', 'outfit': 'pret', 'mode': 'm'}] + [{'kind': 'weapon', 'weapon': w} for w in ('ladle', 'skewer')], 'tag': 'armed'})
jobs.append({'sex': 'm', 'build': 1, 'monster': 's', 'occluder': 'bones', 'sets': [{'kind': 'base', 'outfit': 'bones', 'mode': 'm'}] + [{'kind': 'weapon', 'weapon': w} for w in ('femur', 'hook')], 'tag': 'armed'})
# 지옥 2층 노름꾼 탈루스: 산탄총 든 자세(g)만
jobs.append({'sex': 'm', 'build': 1, 'monster': 't', 'occluder': 'talus', 'sets': [{'kind': 'base', 'outfit': 'talus', 'mode': 'g'}, {'kind': 'weapon', 'weapon': 'shotgun'}], 'tag': 'talus'})
# 3층 층주 세라네: 거대한 살덩이 애벌레 (맨손 = 발톱 팔)
jobs.append({'sex': 'm', 'build': 1, 'monster': 'r', 'occluder': 'serane', 'sets': [{'kind': 'base', 'outfit': 'serane', 'mode': 'u'}], 'tag': 'serane'})
# ── 16차 ──
# 층마다 다른 괴물 · 새 층주 · 재의 문지기 (hellbodies.py)
for mk, outfit, mode, weapons in (('g', 'warden1', 'm', ['knocker']), ('h', 'ashgal', 'm', ['gatebar']), ('u', 'gurma', 'u', []),
                                  ('n', 'cinder', 'm', ['brand']), ('l', 'bloat', 'm', ['boathook']), ('e', 'glutton', 'm', ['club']),
                                  ('v', 'hawker', 'm', ['cleaver']), ('d', 'debtor', 'm', ['hook']), ('k', 'besk', 'm', ['cleaver', 'club'])):
    jobs.append({'sex': 'm', 'build': 1, 'monster': mk, 'occluder': outfit, 'sets': [{'kind': 'base', 'outfit': outfit, 'mode': mode}] + [{'kind': 'weapon', 'weapon': w} for w in weapons], 'tag': 'hell16'})
# 작은 현실 무기를 크게 · 양손 무기 (heavy 동작 포함)
from body import TWO
for sex in 'mf':
    jobs.append({'sex': sex, 'build': 1, 'sets': [{'kind': 'weapon', 'weapon': w} for w in ('knife', 'dagger', 'hammer', 'hatchet', 'pipe', 'bat', 'sword')] + [{'kind': 'weapon', 'weapon': w, 'extra': ['heavy']} for w in TWO], 'tag': 'wpn16'})
# 무기 든 몸·머리카락·방어구에 heavy 동작만 덧붙인다
for sex in 'mf':
    for b in (0, 1, 2):
        sets = [{'kind': 'base', 'outfit': 'casual', 'mode': 'm', 'extra': ['heavy']}]
        if b == 1: sets += [{'kind': 'base', 'outfit': o, 'mode': 'm', 'extra': ['heavy']} for o in ('raincoat', 'patient', 'parrot')] + [{'kind': 'hair', 'style': h, 'extra': ['heavy']} for h in HAIRS]
        sets += [{'kind': 'armor', 'piece': pc, 'mode': 'm', 'extra': ['heavy']} for pc in (['jacket', 'vest', 'workpants'] + (['helmet', 'gloves', 'shinguard', 'boots'] if b == 1 else []))]
        jobs.append({'sex': sex, 'build': b, 'sets': sets, 'only': ['heavy'], 'merge': True, 'tag': 'heavy16'})
# 맨몸(u) 몸·머리카락에 앉기 동작만 덧붙인다 (지옥 마을의 지친 영혼)
for sex in 'mf':
    for b in (0, 1, 2):
        sets = [{'kind': 'base', 'outfit': 'casual', 'mode': 'u', 'extra': ['sit', 'lotus']}]
        if b == 1: sets += [{'kind': 'base', 'outfit': o, 'mode': 'u', 'extra': ['sit', 'lotus']} for o in ('raincoat', 'patient')] + [{'kind': 'hair', 'style': h, 'extra': ['sit', 'lotus']} for h in HAIRS]
        jobs.append({'sex': sex, 'build': b, 'sets': sets, 'only': ['sit', 'lotus'], 'merge': True, 'tag': 'sit16'})  # 24차: 무릎 감싸 앉기 · 가부좌
# ── 17차: 강도·마피아(남녀) · 활 · 지옥 장사꾼의 무기(고기 칼·넓적다리뼈·곡괭이·빚 갈고리)를 사람 손에 ──
for sex in 'mf':
    jobs.append({'sex': sex, 'build': 1, 'sets': [{'kind': 'base', 'outfit': 'robber', 'mode': 'm'}, {'kind': 'base', 'outfit': 'mafia', 'mode': 'm'}, {'kind': 'base', 'outfit': 'mafia', 'mode': 'g'}]
                 + [{'kind': 'weapon', 'weapon': w} for w in ('bow', 'cleaver', 'femur', 'pickaxe', 'hook')], 'tag': 'g17'})
# ── 19차: 양손 무기를 싸우지 않을 때도 두 손으로 (idle2 · walk2) — 무기 든 몸·머리카락·방어구·양손 무기에 덧붙인다 ──
for sex in 'mf':
    for b in (0, 1, 2):
        sets = [{'kind': 'base', 'outfit': 'casual', 'mode': 'm', 'extra': ['idle2', 'walk2']}]
        if b == 1: sets += [{'kind': 'base', 'outfit': o, 'mode': 'm', 'extra': ['idle2', 'walk2']} for o in ('raincoat', 'patient', 'parrot', 'robber', 'mafia')] + [{'kind': 'hair', 'style': h, 'extra': ['idle2', 'walk2']} for h in HAIRS]
        sets += [{'kind': 'armor', 'piece': pc, 'mode': 'm', 'extra': ['idle2', 'walk2']} for pc in (['jacket', 'vest', 'workpants'] + (['helmet', 'gloves', 'shinguard', 'boots'] if b == 1 else []))]
        if b == 1: sets += [{'kind': 'weapon', 'weapon': w, 'extra': ['idle2', 'walk2']} for w in TWO]
        jobs.append({'sex': sex, 'build': b, 'sets': sets, 'only': ['idle2', 'walk2'], 'merge': True, 'tag': 'hold19'})
# ── 20차: 한손검 · 왼팔 방패 (맨손 u · 무기 m 자세, 보통 체형 하나로 모든 체형에) ──
for sex in 'mf':
    jobs.append({'sex': sex, 'build': 1, 'sets': [{'kind': 'weapon', 'weapon': 'arming'}] + [{'kind': 'armor', 'piece': 'shield', 'mode': m} for m in ('u', 'm')], 'tag': 'shield20'})
args = sys.argv[2:]
# --scale2: 같은 크기의 인물을 픽셀 두 배로 (게임에서는 반으로 줄여 같은 크기, 더 섬세)
if '--scale2' in args:
    args.remove('--scale2')
    for j in jobs: j['scale'] = 2
# --dirs8: 이미 구운 층에 상하좌우 4방향(서기·걷기)만 덧붙인다
if '--dirs8' in args:
    args.remove('--dirs8')
    for j in jobs: j.update({'dirs': ['s', 'e', 'n', 'w'], 'only': ['idle', 'walk'], 'merge': True})
only = args  # 번호나 태그로 일부만
t0 = time.time()
for k, j in enumerate(jobs):
    if only and str(k) not in only and j.get('tag') not in only: continue
    print(f'== job {k}: {j["sex"]}{j["build"]}{" child" if j.get("child") else ""} ({len(j["sets"])} sets)', flush=True)
    r = subprocess.run([sys.executable, os.path.join(HERE, 'bake.py'), json.dumps(j), OUT], capture_output=True, text=True)
    for line in r.stdout.splitlines():
        if line.startswith('[bake]'): print(line, flush=True)
    if r.returncode: print(r.stderr[-3000:], flush=True); sys.exit(1)
print(f'ALL DONE {time.time() - t0:.0f}s', flush=True)
