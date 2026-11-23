"""모든 캐릭터 층을 굽는다 (인형마다 Blender 한 번). 출력: apps/web/public/sprites/"""
import json, subprocess, sys, os, time
HERE = os.path.dirname(os.path.abspath(__file__))
OUT = sys.argv[1] if len(sys.argv) > 1 else os.path.join(HERE, '../../apps/web/public/sprites')
from body import HAIRS, WEAPONS
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
jobs.append({'sex': 'm', 'build': 1, 'child': True, 'sets': [{'kind': 'base', 'outfit': 'casual', 'mode': 'w'}] + [{'kind': 'hair', 'style': h} for h in HAIRS]})
only = sys.argv[2:]  # 번호로 일부만
t0 = time.time()
for k, j in enumerate(jobs):
    if only and str(k) not in only: continue
    print(f'== job {k}: {j["sex"]}{j["build"]}{" child" if j.get("child") else ""} ({len(j["sets"])} sets)', flush=True)
    r = subprocess.run([sys.executable, os.path.join(HERE, 'bake.py'), json.dumps(j), OUT], capture_output=True, text=True)
    for line in r.stdout.splitlines():
        if line.startswith('[bake]'): print(line, flush=True)
    if r.returncode: print(r.stderr[-3000:], flush=True); sys.exit(1)
print(f'ALL DONE {time.time() - t0:.0f}s', flush=True)
