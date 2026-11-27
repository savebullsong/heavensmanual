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
# ── 24차: 4층 층주 도르칸 (가시 갑옷 기사 + 사슬 철퇴 지팡이)
jobs.append({'sex': 'm', 'build': 1, 'monster': 'z', 'occluder': 'forgeknight', 'sets': [{'kind': 'base', 'outfit': 'forgeknight', 'mode': 'm'}, {'kind': 'weapon', 'weapon': 'chainmace'}], 'tag': 'forge24'})
# ── 25차: 검은 마스크(헬멧 자리) · 화염방사기(쏘는 자세) · 4층 쇠망치병(야크 + 오함마) · 철갑마(가시 갑옷 + 대검)
for sex in 'mf':
    jobs.append({'sex': sex, 'build': 1, 'sets': [{'kind': 'weapon', 'weapon': 'flamer'}] + [{'kind': 'armor', 'piece': 'mask', 'mode': m, 'extra': ['heavy'] if m == 'm' else []} for m in MODES], 'tag': 'r25'})
    jobs.append({'sex': sex, 'build': 1, 'sets': [{'kind': 'armor', 'piece': 'mask', 'mode': 'm', 'extra': ['idle2', 'walk2']}], 'only': ['idle2', 'walk2'], 'merge': True, 'tag': 'r25'})
jobs.append({'sex': 'm', 'build': 1, 'monster': 'y', 'occluder': 'yak', 'sets': [{'kind': 'weapon', 'weapon': 'sledge'}], 'tag': 'r25'})
jobs.append({'sex': 'm', 'build': 1, 'monster': 'z', 'occluder': 'forgeknight', 'sets': [{'kind': 'weapon', 'weapon': 'greatsword'}], 'tag': 'r25'})
# ── 26차: 현실 무기 더 — 장우산·낫·쇠지렛대·파이프 렌치·마체테·금속 배트·세이버·레이피어·일본도 / 볼트 커터(양손) / 저격총(쏘는 자세)
for sex in 'mf':
    jobs.append({'sex': sex, 'build': 1, 'sets': [{'kind': 'weapon', 'weapon': w} for w in ('umbrella', 'sickle', 'crowbar', 'wrench', 'machete', 'metalbat', 'saber', 'rapier', 'katana', 'rifle')] + [{'kind': 'weapon', 'weapon': 'boltcutter', 'extra': ['heavy']}], 'tag': 'r26'})
    jobs.append({'sex': sex, 'build': 1, 'sets': [{'kind': 'weapon', 'weapon': 'boltcutter', 'extra': ['idle2', 'walk2']}], 'only': ['idle2', 'walk2'], 'merge': True, 'tag': 'r26'})
# ── 35차: 채찍(한손) · 장창(양손: 내려찍기 + 두 손으로 든 서기·걷기)
for sex in 'mf':
    jobs.append({'sex': sex, 'build': 1, 'sets': [{'kind': 'weapon', 'weapon': 'whip'}, {'kind': 'weapon', 'weapon': 'spear', 'extra': ['heavy']}], 'tag': 'r35'})
    jobs.append({'sex': sex, 'build': 1, 'sets': [{'kind': 'weapon', 'weapon': 'spear', 'extra': ['idle2', 'walk2']}], 'only': ['idle2', 'walk2'], 'merge': True, 'tag': 'r35'})
# ── 20차: 한손검 · 왼팔 방패 (맨손 u · 무기 m 자세, 보통 체형 하나로 모든 체형에) ──
for sex in 'mf':
    jobs.append({'sex': sex, 'build': 1, 'sets': [{'kind': 'weapon', 'weapon': 'arming'}] + [{'kind': 'armor', 'piece': 'shield', 'mode': m} for m in ('u', 'm')], 'tag': 'shield20'})
# ── 37차: 서큐버스(여) · 아큐버스(여·남) — 서기·걷기만, 8방향 (사용자 컨셉 그림 두 장) ──
for mk, sex, outfit in (('q', 'f', 'succubus'), ('j', 'f', 'accubus'), ('i', 'm', 'accubus')):
    jobs.append({'sex': sex, 'build': 1, 'monster': mk, 'occluder': outfit, 'sets': [{'kind': 'base', 'outfit': outfit, 'mode': 'w'}], 'stride': .55, 'tag': 'dream37'})
# ── 39차: 한손 무기 휘두르기를 새로(크게 · 아래 끝까지 · 방패는 따로) + 단검·식칼·레이피어 찌르기 — 사람의 무기 자세(m) 층에 덧붙인다
STABBERS = ('dagger', 'knife', 'rapier')
ONE_HAND = [w for w in WEAPONS if w not in ('needle', 'pistol') and w not in TWO] + ['cleaver', 'femur', 'pickaxe', 'hook']
for sex in 'mf':
    for b in (0, 1, 2):
        sets = [{'kind': 'base', 'outfit': 'casual', 'mode': 'm', 'extra': ['stab']}]
        sets += [{'kind': 'armor', 'piece': pc, 'mode': 'm', 'extra': ['stab']} for pc in (['jacket', 'vest', 'workpants'] + (['helmet', 'gloves', 'shinguard', 'boots', 'mask', 'shield'] if b == 1 else []))]
        if b == 1:
            sets += [{'kind': 'base', 'outfit': o, 'mode': 'm', 'extra': ['stab']} for o in ('raincoat', 'patient', 'parrot', 'robber', 'mafia')]
            sets += [{'kind': 'hair', 'style': h, 'extra': ['stab']} for h in HAIRS]
            sets += [{'kind': 'weapon', 'weapon': w, 'extra': ['stab'] if w in STABBERS else []} for w in ONE_HAND]
        jobs.append({'sex': sex, 'build': b, 'sets': sets, 'only': ['swing', 'stab'], 'merge': True, 'dirs': ['se', 'sw', 'ne', 'nw'], 'tag': 'swing39'})
# ── 39차: 서울 계절옷 — 봄·가을 긴소매(casualL) · 겨울 롱패딩(padding). 맨손·무기·총 자세, 대각선은 모든 동작 · 상하좌우는 서기·걷기
for sex in 'mf':
    for b in (0, 1, 2):
        for o in ('casualL', 'padding'):
            sets = [{'kind': 'base', 'outfit': o, 'mode': m, 'extra': ['stab'] if m == 'm' else []} for m in MODES]
            jobs.append({'sex': sex, 'build': b, 'sets': sets, 'dirs': ['se', 'sw', 'ne', 'nw'], 'tag': 'season39'})
            jobs.append({'sex': sex, 'build': b, 'sets': [{'kind': 'base', 'outfit': o, 'mode': m} for m in MODES], 'only': ['idle', 'walk'], 'merge': True, 'dirs': ['s', 'e', 'n', 'w'], 'tag': 'season39'})
# ── 39차: 주요 인물 전용 몸 — 미스 황(황혼 · 황색날개도 같은 몸에 색만) · 천사(지옥문을 지키는 전사, 남녀, 맨손·칼 자세 + 칼)
jobs.append({'sex': 'f', 'build': 1, 'monster': 'hw', 'occluder': 'misshwang', 'sets': [{'kind': 'base', 'outfit': 'misshwang', 'mode': 'w'}], 'stride': .8, 'tag': 'main39'})
for mk, sex in (('an', 'm'), ('af', 'f')):
    sets = [{'kind': 'base', 'outfit': 'angelk', 'mode': 'u'}, {'kind': 'base', 'outfit': 'angelk', 'mode': 'm'}, {'kind': 'weapon', 'weapon': 'sword'}]
    jobs.append({'sex': sex, 'build': 1, 'monster': mk, 'occluder': 'angelk', 'sets': sets, 'dirs': ['se', 'sw', 'ne', 'nw'], 'stride': .85, 'tag': 'main39'})
    jobs.append({'sex': sex, 'build': 1, 'monster': mk, 'occluder': 'angelk', 'sets': sets, 'only': ['idle', 'walk'], 'merge': True, 'dirs': ['s', 'e', 'n', 'w'], 'stride': .85, 'tag': 'main39'})
# ── 40차: 긴 겉옷(큰 갑옷) — 롱 코트 · 방화복 · 방탄 전투복 · 사슬 장포(지옥) · 판금 장갑(지옥). 체형마다, 맨손·무기·총 자세
LONG40 = ['trench', 'firesuit', 'combatcoat', 'hauberk', 'platecoat']
for sex in 'mf':
    for b in (0, 1, 2):
        sets = [{'kind': 'armor', 'piece': pc, 'mode': m, 'extra': ['stab', 'heavy', 'idle2', 'walk2'] if m == 'm' else []} for pc in LONG40 for m in MODES]
        jobs.append({'sex': sex, 'build': b, 'sets': sets, 'dirs': ['se', 'sw', 'ne', 'nw'], 'tag': 'coat40' + sex})
        jobs.append({'sex': sex, 'build': b, 'sets': [{'kind': 'armor', 'piece': pc, 'mode': m} for pc in LONG40 for m in MODES], 'only': ['idle', 'walk'], 'merge': True, 'dirs': ['s', 'e', 'n', 'w'], 'tag': 'coat40' + sex})
# ── 40차: 휘두르기 다시 (치켜들 때 허리를 젖히지 않고, 고개는 상대를 본다) — 사람의 무기 자세(m) 층 모두에 swing만 덮어쓴다
for sex in 'mf':
    for b in (0, 1, 2):
        sets = [{'kind': 'base', 'outfit': o, 'mode': 'm'} for o in ('casual', 'casualL', 'padding')]
        sets += [{'kind': 'armor', 'piece': pc, 'mode': 'm'} for pc in (['jacket', 'vest', 'workpants'] + LONG40 + (['helmet', 'gloves', 'shinguard', 'boots', 'mask', 'shield'] if b == 1 else []))]
        if b == 1:
            sets += [{'kind': 'base', 'outfit': o, 'mode': 'm'} for o in ('raincoat', 'patient', 'parrot', 'robber', 'mafia')]
            sets += [{'kind': 'hair', 'style': h} for h in HAIRS]
            sets += [{'kind': 'weapon', 'weapon': w} for w in ONE_HAND]
        jobs.append({'sex': sex, 'build': b, 'sets': sets, 'only': ['swing'], 'merge': True, 'dirs': ['se', 'sw', 'ne', 'nw'], 'tag': 'swing40' + sex})
for mk, sex in (('an', 'm'), ('af', 'f')):
    jobs.append({'sex': sex, 'build': 1, 'monster': mk, 'occluder': 'angelk', 'sets': [{'kind': 'base', 'outfit': 'angelk', 'mode': 'm'}, {'kind': 'weapon', 'weapon': 'sword'}], 'only': ['swing'], 'merge': True, 'dirs': ['se', 'sw', 'ne', 'nw'], 'stride': .85, 'tag': 'swing40' + sex})
# ── 42차: 지옥으로 데려가는 이들 — 판초 악마 · 저승사자 (서기·걷기, 8방향) / 유내 세 시절 (서기·걷기·앉기)
jobs.append({'sex': 'm', 'build': 1, 'monster': 'pd', 'occluder': 'ponchod', 'sets': [{'kind': 'base', 'outfit': 'ponchod', 'mode': 'w'}], 'stride': .6, 'tag': 'pass42'})
jobs.append({'sex': 'm', 'build': 1, 'monster': 'jr', 'occluder': 'reaper', 'sets': [{'kind': 'base', 'outfit': 'reaper', 'mode': 'w'}], 'stride': .6, 'tag': 'pass42'})
for mk, o, st in (('y1', 'yunae1', 1.0), ('y2', 'yunae2', .9), ('y3', 'yunae3', .72)):
    jobs.append({'sex': 'f', 'build': 1, 'monster': mk, 'occluder': o, 'sets': [{'kind': 'base', 'outfit': o, 'mode': 'w', 'extra': ['sit']}], 'stride': st, 'tag': 'yunae42'})
# ── 42차: 주요 인물 전용 몸 + 고유 동작(gest) — 파샤르(장부에 적기) · 루엔(등불 들기) · 할아버지(안경 고쳐 쓰기) · 불다(랩 한 소절)
for mk, sex, o, ge, st in (('ps', 'm', 'pashar', 'write', .8), ('lu', 'f', 'luen', 'lantern', .55), ('gp', 'm', 'grandpa', 'glasses', .85), ('bd', 'm', 'bulda', 'rap', 1.0)):
    jobs.append({'sex': sex, 'build': 1, 'monster': mk, 'occluder': o, 'gest': ge, 'sets': [{'kind': 'base', 'outfit': o, 'mode': 'w', 'extra': ['gest']}], 'stride': st, 'tag': 'main42'})
# ── 43차: 주요 인물 전용 몸 더 (서기·걷기 + 고유 동작) — 황색날개(맞이하기) · 마스크 소녀(바구니 내밀기) · 칼드렉(망치질) · 오볼로(동전 세기) · 노을(장검 경례) · 마리(실 당기기)
for mk, sex, o, ge, st in (('yw', 'f', 'yellowwing', 'welcome', .55), ('mg', 'f', 'maskgirl', 'offer', 1.0), ('kd', 'm', 'kaldrek', 'hammer', 1.0),
                           ('ob', 'm', 'obolo', 'count', .7), ('no', 'f', 'noeul', 'blade', .95), ('mr', 'f', 'mari', 'strings', .55)):
    jobs.append({'sex': sex, 'build': 1, 'monster': mk, 'occluder': o, 'gest': ge, 'sets': [{'kind': 'base', 'outfit': o, 'mode': 'w', 'extra': ['gest']}], 'stride': st, 'crisp': mk == 'no', 'tag': 'dream43'})
# 43차: 유내 세 시절을 사용자 도트에 맞춰 다시 (손으로 찍은 듯 음영을 끊고 눈을 또렷하게)
for mk, o in (('y1', 'yunae1'), ('y2', 'yunae2'), ('y3', 'yunae3')):
    jobs.append({'sex': 'f', 'build': 1, 'monster': mk, 'occluder': o, 'sets': [{'kind': 'base', 'outfit': o, 'mode': 'w', 'extra': ['sit']}], 'crisp': True, 'tag': 'yunae43'})
# 43차: 지옥 5층 가면의 도시 — 가면귀(레이피어 · 경비병은 세이버) · 속삭임꾼(맨손) · 인형병사(세이버 · 마리오네트도 같은 몸) · 층주 마르시온(인장 지팡이) · 필드 보스 마네트(맨손)
for mk, o, mode, weapons in (('gm', 'maskfiend', 'm', ['rapier', 'saber']), ('ws', 'whisperer', 'u', []), ('ip', 'puppet', 'm', ['saber']),
                             ('mc', 'marcion', 'm', ['sealstaff']), ('mn', 'manette', 'u', [])):
    jobs.append({'sex': 'm', 'build': 1, 'monster': mk, 'occluder': o, 'sets': [{'kind': 'base', 'outfit': o, 'mode': mode}] + [{'kind': 'weapon', 'weapon': w} for w in weapons], 'tag': 'hell43'})
# 44차: 층마다 다른 경비병 — 4층 쇠모루지기(쇠메) · 5층 가면파수꾼(장창)
for mk, o, weapons in (('w4', 'anvilward', ['sledge']), ('w5', 'maskward', ['spear'])):
    jobs.append({'sex': 'm', 'build': 1, 'monster': mk, 'occluder': o, 'sets': [{'kind': 'base', 'outfit': o, 'mode': 'm'}] + [{'kind': 'weapon', 'weapon': w} for w in weapons], 'tag': 'guard44'})
# 43차: 서울·방콕 시민 모자 (보통 체형 하나로 모든 체형에, 머리카락 위)
for sex in 'mf':
    jobs.append({'sex': sex, 'build': 1, 'sets': [{'kind': 'armor', 'piece': pc, 'mode': m, 'extra': ['stab'] if m == 'm' else []} for pc in ('cap', 'visor', 'ngob') for m in MODES], 'tag': 'hat43' + sex})
# 44차: 멋있는 투구 넷 (통투구 · 뿔투구 · 해골 투구 · 5층 도자기 얼굴 투구)
for sex in 'mf':
    jobs.append({'sex': sex, 'build': 1, 'sets': [{'kind': 'armor', 'piece': pc, 'mode': m, 'extra': ['stab'] if m == 'm' else []} for pc in ('greathelm', 'hornhelm', 'skullhelm', 'maskhelm') for m in MODES], 'tag': 'helm44' + sex})
# 45차: 노을이 지옥 정벌에서 함께 싸운다 — 몸에 붙은 장검으로 휘두르기 · 찌르기 (무기 자세 m)
jobs.append({'sex': 'f', 'build': 1, 'monster': 'no', 'occluder': 'noeul', 'sets': [{'kind': 'base', 'outfit': 'noeul', 'mode': 'm'}], 'stride': .95, 'crisp': True, 'tag': 'noeul45'})
# 45차: 총 넷의 방향 — 쏘는 자세에서 총구가 하늘을 향하던 것 (권총 · 저격총 · 화염방사기 · 탈루스 산탄총)
for sex in 'mf':
    jobs.append({'sex': sex, 'build': 1, 'sets': [{'kind': 'weapon', 'weapon': w} for w in ('pistol', 'rifle', 'flamer')], 'tag': 'gun45'})
jobs.append({'sex': 'm', 'build': 1, 'monster': 't', 'occluder': 'talus', 'sets': [{'kind': 'weapon', 'weapon': 'shotgun'}], 'tag': 'gun45'})
args = sys.argv[2:]
# --scale2: 같은 크기의 인물을 픽셀 두 배로 (게임에서는 반으로 줄여 같은 크기, 더 섬세)
if '--scale2' in args:
    args.remove('--scale2')
    for j in jobs: j['scale'] = 2
# --dirs8: 이미 구운 층에 상하좌우 4방향(서기·걷기)만 덧붙인다
if '--dirs8' in args:
    args.remove('--dirs8')
    for j in jobs: j.update({'dirs': ['s', 'e', 'n', 'w'], 'only': ['idle', 'walk'], 'merge': True})
# 45차 --atk8: 방어구 층에 상하좌우 4방향 공격 장면만 덧붙인다 (몸·무기는 8방향인데 방어구는 대각선뿐이라, 입으면 바로 아래 몹을 남동쪽으로 쳤다) · --sex=m|f
if '--atk8' in args:
    args.remove('--atk8')
    sx = next((a.split('=')[1] for a in args if a.startswith('--sex=')), None)
    args = [a for a in args if not a.startswith('--sex=')]
    COATS = ['trench', 'firesuit', 'combatcoat', 'hauberk', 'platecoat']
    jobs = []
    for sex in ([sx] if sx else ['m', 'f']):
        for b in (0, 1, 2):
            pieces = ['jacket', 'vest', 'workpants'] + COATS + (['helmet', 'gloves', 'shinguard', 'boots', 'mask', 'shield'] if b == 1 else [])
            sets = [{'kind': 'armor', 'piece': pc, 'mode': 'm', 'extra': ['heavy']} for pc in pieces]
            jobs.append({'sex': sex, 'build': b, 'sets': sets, 'dirs': ['s', 'e', 'n', 'w'], 'only': ['swing', 'heavy', 'hit', 'fall'], 'merge': True, 'scale': 2, 'tag': 'atk8'})
            jobs.append({'sex': sex, 'build': b, 'sets': [{'kind': 'armor', 'piece': pc, 'mode': 'u'} for pc in COATS], 'dirs': ['s', 'e', 'n', 'w'], 'only': ['punch', 'hit', 'fall'], 'merge': True, 'scale': 2, 'tag': 'atk8'})
            jobs.append({'sex': sex, 'build': b, 'sets': [{'kind': 'armor', 'piece': pc, 'mode': 'g'} for pc in COATS], 'dirs': ['s', 'e', 'n', 'w'], 'only': ['shoot', 'hit', 'fall'], 'merge': True, 'scale': 2, 'tag': 'atk8'})
    print(f'atk8: {len(jobs)} jobs, {sum(len(j["sets"]) for j in jobs)} sets', flush=True)
# 42차 --body42: 사람(주인공·행인) 몸과 머리카락 층만 모두 다시 굽는다 (얼굴 · 손 · 어깨 · 머리 모양을 고쳤다). 방어구·무기·괴물은 그대로
#   (장창 층은 2배가 아닌 채로 남아 있어 함께) · --sex=m / --sex=f 로 둘로 나눠 두 코어에서 따로 굽는다
if '--body42' in args:
    args.remove('--body42')
    sx = next((a.split('=')[1] for a in args if a.startswith('--sex=')), None)
    args = [a for a in args if not a.startswith('--sex=')]
    fr = int(next((a.split('=')[1] for a in args if a.startswith('--from=')), '0'))
    args = [a for a in args if not a.startswith('--from=')]
    keep = []
    for k, j in enumerate(jobs):
        if j.get('monster'): continue
        if sx and j['sex'] != sx: continue
        # 행인만 입는 옷(서울 계절옷 · 강도 · 마피아)은 그대로 두고, 40차 휘두르기 덮어쓰기는 이제 기본 굽기에 들어 있어 뺀다
        if j.get('tag') in ('season39', 'g17') or str(j.get('tag', '')).startswith('swing40'): continue
        sets = [x for x in j['sets'] if x['kind'] in ('base', 'hair') or (x['kind'] == 'weapon' and x['weapon'] == 'spear')]
        if not sets: continue
        jj = dict(j, sets=sets, tag='body42', idx=k)
        if j.get('tag') == 'swing39': jj['only'] = ['stab']   # 휘두르기는 기본 굽기에 이미 (찌르기만 덧붙인다)
        keep.append(jj)
    jobs = keep[fr:]
    print(f'body42: {len(jobs)} jobs, {sum(len(j["sets"]) for j in jobs)} sets', flush=True)
# 43차 --pass43: 행인만 입는 옷(서울 긴소매·패딩 · 강도 · 마피아)을 새 몸으로 다시 굽는다 (--sex=m|f)
if '--pass43' in args:
    args.remove('--pass43')
    sx = next((a.split('=')[1] for a in args if a.startswith('--sex=')), None)
    args = [a for a in args if not a.startswith('--sex=')]
    keep = []
    for j in jobs:
        if j.get('monster') or (sx and j['sex'] != sx): continue
        t = j.get('tag')
        if t == 'season39': keep.append(dict(j, tag='pass43')); continue
        sets = [x for x in j['sets'] if x['kind'] == 'base' and x['outfit'] in ('robber', 'mafia')]
        if not sets: continue
        if t == 'g17': keep.append(dict(j, sets=sets, tag='pass43'))
        elif t in ('hold19', 'swing39'): keep.append(dict(j, sets=sets, tag='pass43', only=['idle2', 'walk2'] if t == 'hold19' else ['stab']))
    # 먼저 통째로 굽는 것(g17), 그다음 덧붙이는 것
    jobs = sorted(keep, key=lambda j: 1 if j.get('merge') else 0)
    print(f'pass43: {len(jobs)} jobs, {sum(len(j["sets"]) for j in jobs)} sets', flush=True)
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
