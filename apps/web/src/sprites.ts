// 미리 구운 캐릭터 그림 (3D 인형 → 도트). tools/sprite3d 가 만든 층을 합치고 색을 입힌다.
// 층: 몸(체형·차림·동작 묶음) + 머리카락 + 무기. 한 픽셀 = 구역 번호 × 16 + 음영 단계, 알파는 0 또는 255.
import { Rectangle, Sprite, Texture } from 'pixi.js';
import { SKIN_COLORS, HAIR_COLORS, TOP_COLORS, BOTTOM_COLORS, HAIR_STYLES, AURA_PAD, auraFromMask, type Look } from './character.ts';

/** 화면 기준 8방향. 대각선 넷은 모든 동작, 상하좌우 넷(s·e·n·w)은 서기·걷기만 구워져 있다 */
export type Dir = 'se' | 'sw' | 'ne' | 'nw' | 's' | 'e' | 'n' | 'w';
export type Anim = 'idle' | 'walk' | 'hit' | 'fall' | 'punch' | 'swing' | 'shoot' | 'heavy' | 'sit';
export type Mode = 'u' | 'm' | 'g' | 'w';
export const DIRS: Dir[] = ['se', 'sw', 'ne', 'nw', 's', 'e', 'n', 'w'];
/** 상하좌우로 굽지 않은 동작(공격·맞음·쓰러짐)을 보여 줄 때 쓸 가까운 대각선 */
const DIAG: Record<string, Dir> = { s: 'sw', e: 'se', n: 'ne', w: 'nw' };
/** 발 기준점이 칸 안에서 있는 곳 (굽기 도구와 같아야 한다) */
export const FOOT = { x: 48, y: 82 };
/** 사람 머리 꼭대기까지 대략의 높이 (이름표·체력 막대 자리) */
export const HEAD_H = 50;

/** k = 화면 배율 (2배 해상도로 구운 그림은 0.5로 줄여 같은 크기로 보인다) */
export interface Frame { tex: Texture; ax: number; ay: number; w: number; h: number; k: number }

/** 구운 인물 그림의 픽셀 밀도 (sprites/scale.json · 없으면 1) */
export let PX = 1;
export const pxReady: Promise<number> = fetch('./sprites/scale.json').then((r) => (r.ok ? r.json() : { px: 1 })).then((j: { px?: number }) => (PX = Math.max(1, Math.min(4, j.px ?? 1)))).catch(() => 1);
export interface CharSet {
  mode: Mode;
  attack: Anim | null;
  frames: Map<string, Frame>;
  counts: Partial<Record<Anim, number>>;
  /** 공격·맞기·쓰러짐까지 상하좌우로 구워져 있으면 싸울 때도 8방향을 본다 */
  eight: boolean;
  /** 광채용: 서 있는 장면의 실루엣 (방향별) */
  masks: Map<Dir, { w: number; h: number; ox: number; oy: number; solid: Uint8Array }>;
}

/** 미스 황의 겉모습 (우주새 카운터 뒤, 관리자 페이지 도트 칸에서도 쓴다) */
export const MISS_HWANG: Look = { sex: 'f', build: 1, skin: 0, hair: 3, hairColor: 3, top: 0, bottom: 0, outfit: 'apron' };
/** 유황새(지옥)의 황혼: 미스 황과는 다른 사람이라고 스스로 믿는다. 검붉은 긴 머리, 핏빛 옷, 창백한 피부 */
export const HWANGHON: Look = { sex: 'f', build: 1, skin: 0, hair: 3, hairColor: 0, top: 0, bottom: 0, outfit: 'apron', cols: { 1: '#ead2c4', 2: '#3a0e12', 3: '#5a0e18', 4: '#2a0a10', 5: '#0c0808', 6: '#1a1210', 7: '#140a0c', 9: '#5a0e18', 10: '#ead2c4' } };

export const MELEE = ['pipe', 'hammer', 'knife', 'shovel', 'bat', 'hatchet', 'dagger', 'sword', 'needle'];
/** 양손 무기 (16차): 두 손으로 크게 들어 내려찍는다 (heavy 동작) — 느리지만 묵직하다 */
export const TWO = new Set(['sledge', 'fireaxe', 'greatsword', 'maul']);
/** 16차 괴물 몸: 차림 → [굽기 키, 자세] (무기를 들면 m) */
const MON16: Record<string, [string, string, Mode]> = { ashgal: ['h', 'ashgal', 'm'], gurma: ['u', 'gurma', 'u'], cinder: ['n', 'cinder', 'm'], bloat: ['l', 'bloat', 'm'], glutton: ['e', 'glutton', 'm'], hawker: ['v', 'hawker', 'm'], debtor: ['d', 'debtor', 'm'], broker: ['k', 'besk', 'm'] };
/** 방어구 겉모습: 그리는 순서와 색 (구역 3 = 본색, 구역 5 = 신발) */
const ARMOR_ORDER = ['workpants', 'shinguard', 'boots', 'jacket', 'vest', 'gloves'];
const ARMOR_COLOR: Record<string, string> = { helmet: '#b0302a', jacket: '#4a5236', vest: '#3a3f46', gloves: '#d8cfb4', workpants: '#4a4536', shinguard: '#2b2f36', boots: '#3a2a1a' };
const PER_BUILD = new Set(['jacket', 'vest', 'workpants']);
const COSTUMES = new Set(['raincoat', 'patient', 'parrot', 'robber']); // 강도: 복면이 머리를 덮는다

/** 동작 속도 (초당 장면 수)와 맞히는 장면 */
export const ANIM_FPS: Record<Anim, number> = { idle: 1, walk: 9, hit: 16, fall: 11, punch: 22, swing: 21, shoot: 16, heavy: 15, sit: 1 };
export const IMPACT: Partial<Record<Anim, number>> = { punch: 2, swing: 3, shoot: 1, heavy: 3 };

/** 칸 좌표로 움직이는 방향(di, dj) → 바라보는 쪽.
 *  +i = 화면 오른쪽 아래(se), +i+j = 아래(s), +j = 왼쪽 아래(sw), -i+j = 왼쪽(w) … (칸 각도 45°마다 한 방향)
 *  eight = false 이면 대각선 넷만 (공격처럼 대각선으로만 구운 동작)
 *  앞 방향과 크게 다르지 않으면 그대로 둬서 지그재그 길에서 몸이 떨리지 않게 한다 */
const D8: Dir[] = ['se', 's', 'sw', 'w', 'nw', 'n', 'ne', 'e'];
const D4: Dir[] = ['se', 'sw', 'nw', 'ne'];
export function dirFromTile(di: number, dj: number, prev: Dir, eight = true): Dir {
  if (Math.abs(di) < 1e-3 && Math.abs(dj) < 1e-3) return prev;
  const a = Math.atan2(dj, di);
  const list = eight ? D8 : D4, step = (Math.PI * 2) / list.length;
  const pi = list.indexOf(prev);
  if (pi >= 0) {
    const d = Math.abs(((a - pi * step) % (Math.PI * 2) + Math.PI * 3) % (Math.PI * 2) - Math.PI);
    if (d < step / 2 + 0.14) return prev;
  }
  return list[((Math.round(a / step) % list.length) + list.length) % list.length];
}

// ───────────────────────── 층 읽기 ─────────────────────────
interface Layer { w: number; px: Uint8ClampedArray; meta: Record<string, number[] | null>; /** 이 층의 픽셀 밀도 (_px, 없으면 1) */ lp: number }
const layers = new Map<string, Promise<Layer | null>>();
function loadLayer(key: string): Promise<Layer | null> {
  let p = layers.get(key);
  if (!p) {
    p = (async () => {
      try {
        const [meta, img] = await Promise.all([
          fetch(`./sprites/${key}.json`).then((r) => (r.ok ? r.json() : null)),
          new Promise<HTMLImageElement>((res, rej) => { const im = new Image(); im.onload = () => res(im); im.onerror = rej; im.src = `./sprites/${key}.png`; }),
        ]);
        if (!meta) return null;
        const lp = Math.max(1, (meta._px as number[] | undefined)?.[0] ?? 1);
        delete meta._px;
        const c = document.createElement('canvas');
        c.width = img.width; c.height = img.height;
        const g = c.getContext('2d', { willReadFrequently: true })!;
        g.drawImage(img, 0, 0);
        return { w: img.width, px: g.getImageData(0, 0, img.width, img.height).data, meta, lp };
      } catch {
        return null;
      }
    })();
    layers.set(key, p);
  }
  return p;
}

// ───────────────────────── 색 ─────────────────────────
const FIXED: Record<number, string> = { 6: '#1a1210', 7: '#b49c74', 8: '#c9a53c', 9: '#a3b7c6', 10: '#eeebe2', 11: '#efede4', 12: '#efc63a', 13: '#c49a66', 14: '#a9b2bb', 15: '#2a2624' };
function hex(h: string): [number, number, number] { return [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255) as [number, number, number]; }
/** 구역 색 하나 → 16단계 음영 (그늘은 살짝 푸르게, 밝은 곳은 희게) */
function ramp(h: string): Uint8ClampedArray {
  const c = hex(h);
  const out = new Uint8ClampedArray(16 * 3);
  const cool = [0.82, 0.86, 1.1];
  for (let lv = 0; lv < 16; lv++) {
    const f = lv / 11;
    for (let k = 0; k < 3; k++) {
      let v: number;
      if (f <= 1) {
        const g = Math.pow(f, 1.6);
        v = c[k] * g;
        v = v * (1 - (1 - g) * 0.5) + v * cool[k] * (1 - g) * 0.5;
      } else v = c[k] + (1 - c[k]) * (f - 1) * 1.4;
      out[lv * 3 + k] = Math.round(Math.max(0, Math.min(1, v)) * 255);
    }
  }
  return out;
}
function palette(look: Look): Uint8ClampedArray[] {
  const o = look.outfit ?? 'casual';
  const shoe = o === 'raincoat' ? '#2d342e' : o === 'patient' ? '#d6d2c8' : o === 'apron' ? '#3a2418' : o === 'parrot' ? '#8f7f70' : '#3a332e';
  const cols: Record<number, string> = {
    ...FIXED,
    1: SKIN_COLORS[look.skin] ?? SKIN_COLORS[0],
    2: HAIR_COLORS[look.hairColor] ?? HAIR_COLORS[0],
    3: o === 'apron' ? '#e6e1d6' : TOP_COLORS[look.top] ?? TOP_COLORS[0],
    4: o === 'apron' ? '#3a2f28' : BOTTOM_COLORS[look.bottom] ?? BOTTOM_COLORS[0],
    5: shoe,
    // 몇 구역만 정해 준 모습(취객의 붉은 얼굴, 천국의 흰 옷 등)은 나머지를 기본색으로 채운다
    ...(look.cols ?? {}),
  };
  const pal: Uint8ClampedArray[] = [];
  for (let k = 0; k < 16; k++) pal.push(ramp(cols[k] ?? '#ff00ff'));
  return pal;
}

// ───────────────────────── 어떤 층을 쓰나 ─────────────────────────
export function layerKeys(look: Look, weapon: string | null, armor: string[] = []): { base: string; hair: string | null; weapon: string | null; armor: { key: string; piece: string }[]; mode: Mode; two?: boolean } {
  const o = look.outfit ?? 'casual';
  // 대식자: 사람 모습 / 변신한 모습 (머리카락·방어구 없음, 늘 큰 바늘)
  if ((o as string) === 'suturer') return { base: 'b-m1-suturer-m', hair: null, weapon: 'w-m-needle', armor: [] as { key: string; piece: string }[], mode: 'm' as Mode };
  if ((o as string) === 'stitched') return { base: 'b-x-stitched-m', hair: null, weapon: 'w-x-needle', armor: [] as { key: string; piece: string }[], mode: 'm' as Mode };
  // 지옥 괴물: 망자(맨손) · 프렛(맨손) · 야크(몽둥이)
  // 무기를 든 괴물은 무기 자세(m)의 몸 + 그 몸에 맞춘 무기 층 (지옥 무기는 사람 무기와 따로)
  if (o === 'ash' || o === 'pret' || o === 'bones') {
    const mk = o === 'ash' ? 'a' : o === 'pret' ? 'p' : 's';
    return { base: `b-${mk}-${o}-${weapon ? 'm' : 'u'}`, hair: null, weapon: weapon ? `w-${mk}-${weapon}` : null, armor: [] as { key: string; piece: string }[], mode: (weapon ? 'm' : 'u') as Mode };
  }
  const m16 = MON16[o as string];
  if (m16) {
    const [mk, body, md] = m16;
    return { base: `b-${mk}-${body}-${md}`, hair: null, weapon: md === 'm' && weapon ? `w-${mk}-${weapon}` : null, armor: [] as { key: string; piece: string }[], mode: md, two: false };
  }
  if (o === 'serane') return { base: 'b-r-serane-u', hair: null, weapon: null, armor: [] as { key: string; piece: string }[], mode: 'u' as Mode };
  if (o === 'talus') return { base: 'b-t-talus-g', hair: null, weapon: 'w-t-shotgun', armor: [] as { key: string; piece: string }[], mode: 'g' as Mode };
  if (o === 'besk') return { base: 'b-k-besk-m', hair: null, weapon: 'w-k-ledger', armor: [] as { key: string; piece: string }[], mode: 'm' as Mode };
  if (o === 'cockatoo') return { base: 'b-b-cockatoo-u', hair: null, weapon: null, armor: [] as { key: string; piece: string }[], mode: 'u' as Mode };
  // 휴식 마을 경비병: 재문지기(뼈 곤봉) · 빈그릇귀(맨손·사발) · 봉랍귀(인장 지팡이)
  if (o === 'warden1') return { base: 'b-g-warden1-m', hair: null, weapon: 'w-g-knocker', armor: [] as { key: string; piece: string }[], mode: 'm' as Mode };
  if (o === 'warden2') return { base: 'b-o-warden2-u', hair: null, weapon: null, armor: [] as { key: string; piece: string }[], mode: 'u' as Mode };
  if (o === 'warden3') return { base: 'b-w-warden3-m', hair: null, weapon: 'w-w-sealstaff', armor: [] as { key: string; piece: string }[], mode: 'm' as Mode };
  if (o === 'yak') return { base: 'b-y-yak-m', hair: null, weapon: weapon === null ? null : 'w-y-club', armor: [] as { key: string; piece: string }[], mode: 'm' as Mode };
  const child = !!look.child;
  const w = child ? null : weapon && (MELEE.includes(weapon) || TWO.has(weapon) || weapon === 'pistol' || weapon === 'bow') ? weapon : null;
  let mode: Mode = w === 'pistol' || w === 'bow' ? 'g' : w ? 'm' : 'u'; // 권총·활은 쏘는 자세
  const sex = look.sex;
  const build = Math.max(0, Math.min(2, look.build ?? 1));
  // 우비·환자복·앵무새 옷 차림이라도 몸 방어구(재킷·조끼·작업 바지)를 입으면 그 옷 대신 방어구가 보인다
  const costume = COSTUMES.has(o) && !(!child && armor.some((p) => PER_BUILD.has(p)));
  let base: string;
  if (child) { base = 'b-c-casual-w'; mode = 'w'; }
  else if (o === 'apron' && sex === 'f' && !w) { base = 'b-f1-apron-w'; mode = 'w'; }
  else if (o === 'mafia') { if (mode === 'u') mode = 'm'; base = `b-${sex}1-mafia-${mode}`; } // 마피아 정장 (머리카락은 보인다)
  else if (costume) base = `b-${sex}1-${o}-${mode === 'u' ? 'm' : mode}`;
  else base = `b-${sex}${build}-casual-${mode}`;
  const style = HAIR_STYLES[look.hair] ?? 'short';
  const hair = costume ? null : child ? `h-c-${style}` : `h-${sex}-${style}`;
  const arm: { key: string; piece: string }[] = [];
  if (mode !== 'w') {
    const ab = costume ? 1 : build;
    for (const piece of [...ARMOR_ORDER, 'helmet']) {
      if (!armor.includes(piece)) continue;
      if (piece === 'helmet' && costume && o !== 'patient') continue; // 우비 모자·앵무새 머리 위에는 헬멧을 씌우지 않는다
      arm.push({ key: `a-${sex}${PER_BUILD.has(piece) ? ab : 1}-${piece}-${mode}`, piece });
    }
  }
  return { base, hair, weapon: w ? `w-${sex}-${w}` : null, armor: arm, mode, two: !!w && TWO.has(w) };
}

// ───────────────────────── 합치기 ─────────────────────────
/** 층을 합칠 때 키우는 배수: 화면 밀도(PX) ÷ 층 밀도 (2배 그림 사이에 1배 층이 섞여도 맞물린다) */
const up = (L: Layer) => Math.max(1, Math.round(PX / L.lp));
const sets = new Map<string, Promise<CharSet>>();
const MAX_SETS = 32; // 오래 안 쓴 것부터 놓아준다 (거리 사람은 계속 바뀐다 · 2배 그림은 한 벌에 약 3MB)
export function charSet(look: Look, weapon: string | null = null, armor: string[] = []): Promise<CharSet> {
  const keys = layerKeys(look, weapon, armor);
  const id = JSON.stringify([keys, look.skin, look.hairColor, look.top, look.bottom, look.outfit ?? 'casual', look.cols ?? null]);
  let p = sets.get(id);
  if (p) { sets.delete(id); sets.set(id, p); return p; }
  p = pxReady.then(async () => {
    const cs = await build(look, keys);
    // 괴물 몸을 아직 굽지 않았으면 실밥 터진 대식자 몸에 색만 입혀 쓴다
    if (!cs.frames.size && ['ash', 'pret', 'yak', 'ashgal', 'gurma', 'cinder', 'bloat', 'glutton', 'hawker', 'debtor', 'broker'].includes(look.outfit ?? '')) return build({ ...look, outfit: 'stitched' }, layerKeys({ ...look, outfit: 'stitched' }, 'needle'));
    return cs;
  });
  sets.set(id, p);
  while (sets.size > MAX_SETS) sets.delete(sets.keys().next().value as string);
  return p;
}

async function build(look: Look, keys: ReturnType<typeof layerKeys>): Promise<CharSet> {
  const [base, hair, weap, ...arms] = await Promise.all([loadLayer(keys.base), keys.hair ? loadLayer(keys.hair) : null, keys.weapon ? loadLayer(keys.weapon) : null, ...keys.armor.map((a) => loadLayer(a.key))]);
  const pal = palette(look);
  // 그리는 순서: 몸 → 옷 방어구 → 머리카락 → 헬멧 → 무기. 방어구는 자기 색을 쓴다
  type Lay = { L: Layer | null; pal: Uint8ClampedArray[] };
  const armorLay = (k: number): Lay => {
    const piece = keys.armor[k].piece, p2 = pal.slice();
    p2[3] = ramp(ARMOR_COLOR[piece]); p2[5] = ramp(ARMOR_COLOR[piece]);
    return { L: arms[k], pal: p2 };
  };
  const order: Lay[] = [{ L: base, pal }];
  keys.armor.forEach((a, k) => { if (a.piece !== 'helmet') order.push(armorLay(k)); });
  order.push({ L: hair, pal });
  keys.armor.forEach((a, k) => { if (a.piece === 'helmet') order.push(armorLay(k)); });
  order.push({ L: weap, pal });
  // 모든 층에 있는 장면만 (1배·2배가 섞여 어느 층에 상하좌우 공격 장면이 없으면 대각선 장면을 쓴다)
  const names = base ? Object.keys(base.meta).filter((n) => order.every(({ L }) => !L || n in L.meta)) : [];
  // 장면마다 겹친 테두리 상자 (발 기준)
  type Box = { name: string; x0: number; y0: number; x1: number; y1: number };
  const boxes: Box[] = [];
  for (const name of names) {
    let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
    for (const { L } of order) {
      const r = L?.meta[name];
      if (!r) continue;
      const k = up(L!);
      x0 = Math.min(x0, r[4] * k); y0 = Math.min(y0, r[5] * k); x1 = Math.max(x1, (r[4] + r[2]) * k); y1 = Math.max(y1, (r[5] + r[3]) * k);
    }
    if (x1 < x0) continue;
    // 외곽선 자리 (2배 그림은 2px). 2배면 상자를 짝수 칸에 맞춰 게임 속 크기·발 기준점이 정수로 떨어지게
    const al = (v: number, dn: boolean) => (dn ? Math.floor(v / PX) : Math.ceil(v / PX)) * PX;
    boxes.push({ name, x0: al(x0 - PX, true), y0: al(y0 - PX, true), x1: al(x1 + PX, false), y1: al(y1 + PX, false) });
  }
  // 선반 쌓기
  const AW = 512 * PX;
  let x = 0, y = 0, rowH = 0;
  const place = new Map<string, [number, number]>();
  for (const b of boxes.slice().sort((a, c) => c.y1 - c.y0 - (a.y1 - a.y0))) {
    const w = b.x1 - b.x0, h = b.y1 - b.y0;
    if (x + w > AW) { x = 0; y += rowH; rowH = 0; }
    place.set(b.name, [x, y]);
    x += w; rowH = Math.max(rowH, h);
  }
  const AH = Math.max(1, y + rowH);
  const canvas = document.createElement('canvas');
  canvas.width = AW; canvas.height = AH;
  const g = canvas.getContext('2d')!;
  const img = g.createImageData(AW, AH);
  const d = img.data;
  const masks: CharSet['masks'] = new Map();
  for (const b of boxes) {
    const [px, py] = place.get(b.name)!;
    const w = b.x1 - b.x0, h = b.y1 - b.y0;
    for (const { L, pal } of order) {
      const r = L?.meta[b.name];
      if (!L || !r) continue;
      const [sx, sy, sw, sh, ox, oy] = r;
      const k = up(L);
      const dx = px + ox * k - b.x0, dy = py + oy * k - b.y0;
      if (k === 1) {
        for (let yy = 0; yy < sh; yy++) {
          let si = ((sy + yy) * L.w + sx) * 4;
          let di = ((dy + yy) * AW + dx) * 4;
          for (let xx = 0; xx < sw; xx++, si += 4, di += 4) {
            if (L.px[si + 3] < 128) continue;
            const v = L.px[si];
            const rg = pal[v >> 4], lv = (v & 15) * 3;
            d[di] = rg[lv]; d[di + 1] = rg[lv + 1]; d[di + 2] = rg[lv + 2]; d[di + 3] = 255;
          }
        }
      } else {
        // 아직 1배로만 구운 층: 점 하나를 k×k로 키워 2배 그림에 맞춘다
        for (let yy = 0; yy < sh; yy++)
          for (let xx = 0; xx < sw; xx++) {
            const si = ((sy + yy) * L.w + sx + xx) * 4;
            if (L.px[si + 3] < 128) continue;
            const v = L.px[si];
            const rg = pal[v >> 4], lv = (v & 15) * 3;
            for (let a = 0; a < k; a++)
              for (let c = 0; c < k; c++) {
                const di = ((dy + yy * k + a) * AW + dx + xx * k + c) * 4;
                d[di] = rg[lv]; d[di + 1] = rg[lv + 1]; d[di + 2] = rg[lv + 2]; d[di + 3] = 255;
              }
          }
      }
    }
    // 선택적 외곽선: 바깥 빈칸에 가장 어두운 이웃 색을 더 어둡게 (2배 그림은 두 겹 = 같은 굵기로 보임)
    for (let pass = 0; pass < PX; pass++) {
    const add: number[] = [];
    for (let yy = 0; yy < h; yy++)
      for (let xx = 0; xx < w; xx++) {
        const i = ((py + yy) * AW + px + xx) * 4;
        if (d[i + 3]) continue;
        let best = -1, bl = 1e9;
        for (const [ex, ey] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const nx = xx + ex, ny = yy + ey;
          if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
          const j = ((py + ny) * AW + px + nx) * 4;
          if (!d[j + 3]) continue;
          const l = d[j] + d[j + 1] + d[j + 2];
          if (l < bl) { bl = l; best = j; }
        }
        if (best >= 0) add.push(i, Math.round(d[best] * 0.32 + 8), Math.round(d[best + 1] * 0.3 + 6), Math.round(d[best + 2] * 0.3 + 6));
      }
    for (let k = 0; k < add.length; k += 4) { const i = add[k]; d[i] = add[k + 1]; d[i + 1] = add[k + 2]; d[i + 2] = add[k + 3]; d[i + 3] = 255; }
    }
    // 광채용 실루엣 (서 있는 장면)
    const m = /^idle-(se|sw|ne|nw|s|e|n|w)-0$/.exec(b.name);
    if (m) {
      const solid = new Uint8Array(w * h);
      for (let yy = 0; yy < h; yy++) for (let xx = 0; xx < w; xx++) solid[yy * w + xx] = d[((py + yy) * AW + px + xx) * 4 + 3] ? 1 : 0;
      masks.set(m[1] as Dir, { w, h, ox: b.x0, oy: b.y0, solid });
    }
  }
  g.putImageData(img, 0, 0);
  const src = Texture.from(canvas).source;
  // 2배 그림을 보통 화면(픽셀 밀도 1)에서 반으로 줄이면 '가장 가까운 점'만 골라 깨진다 → 네 점을 섞어 줄인다
  src.scaleMode = Math.min(2, window.devicePixelRatio || 1) >= PX ? 'nearest' : 'linear';
  const frames = new Map<string, Frame>();
  const counts: CharSet['counts'] = {};
  for (const b of boxes) {
    const [px, py] = place.get(b.name)!;
    const w = b.x1 - b.x0, h = b.y1 - b.y0;
    const tex = new Texture({ source: src, frame: new Rectangle(px, py, w, h) });
    frames.set(b.name, { tex, ax: -b.x0 / w, ay: -b.y0 / h, w, h, k: 1 / PX });
    const [an, , idx] = b.name.split('-');
    const n = Number(idx) + 1;
    if ((counts[an as Anim] ?? 0) < n) counts[an as Anim] = n;
  }
  // 양손 무기는 내려찍기 (아직 굽지 않은 그림이면 휘두르기로)
  const attack: Anim | null = keys.two && counts.heavy ? 'heavy' : keys.mode === 'u' ? 'punch' : keys.mode === 'm' ? 'swing' : keys.mode === 'g' ? 'shoot' : null;
  return { mode: keys.mode, attack, frames, counts, masks, eight: frames.has('hit-s-0') };
}

/** 장면 하나 (없으면 서 있는 장면) */
export function frameOf(cs: CharSet, anim: Anim, dir: Dir, i: number): Frame | undefined {
  const n = cs.counts[anim];
  if (!n) return cs.frames.get(`idle-${dir}-0`) ?? cs.frames.get(`idle-${DIAG[dir] ?? dir}-0`);
  const k = Math.max(0, Math.min(n - 1, i));
  return cs.frames.get(`${anim}-${dir}-${k}`) ?? cs.frames.get(`${anim}-${DIAG[dir] ?? dir}-${k}`);
}
/** 반대로 돌아선 방향 (문을 나서며 뒤돌기 등): 위아래만 뒤집는다 */
export function turnedDir(d: Dir): Dir {
  if (d.length === 2) return ((d[0] === 's' ? 'n' : 's') + d[1]) as Dir;
  return d === 's' ? 'n' : d === 'n' ? 's' : d;
}

/** 스프라이트에 장면을 건다 (장면마다 발 위치가 달라 기준점도 바꾼다). size = 괴물·층주처럼 크게 그릴 때 */
export function applyFrame(s: { texture: Texture; anchor: { set(x: number, y: number): void }; scale: { set(x: number, y?: number): void } }, f: Frame | undefined, size = 1) {
  if (!f) return;
  if (s.texture !== f.tex) s.texture = f.tex;
  s.anchor.set(f.ax, f.ay);
  s.scale.set(f.k * size);
}

/** 미리 불러오기 (첫 장면이 비지 않도록) */
export function preload(keys: string[]) {
  return Promise.all(keys.map(loadLayer));
}

// ───────────────────────── 광채 ─────────────────────────
const auras = new WeakMap<CharSet, Map<Dir, Frame[]>>();
/** 서 있는 실루엣에서 방향별 광채 4장면을 만든다 (가산 혼합) */
export function auraFor(cs: CharSet): Map<Dir, Frame[]> {
  let a = auras.get(cs);
  if (a) return a;
  a = new Map();
  for (const [dir, m] of cs.masks) {
    const W = m.w + AURA_PAD * 2, H = m.h + AURA_PAD * 2;
    const list = auraFromMask(m.solid, m.w, m.h).map((c) => {
      const tex = Texture.from(c);
      tex.source.scaleMode = 'nearest';
      return { tex, ax: (-m.ox + AURA_PAD) / W, ay: (-m.oy + AURA_PAD) / H, w: W, h: H, k: 1 / PX };
    });
    a.set(dir, list);
  }
  auras.set(cs, a);
  return a;
}
export function makeAuraSprite(): Sprite {
  const s = new Sprite();
  s.blendMode = 'add';
  s.eventMode = 'none';
  return s;
}
