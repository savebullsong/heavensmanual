// 미리 구운 캐릭터 그림 (3D 인형 → 도트). tools/sprite3d 가 만든 층을 합치고 색을 입힌다.
// 층: 몸(체형·차림·동작 묶음) + 머리카락 + 무기. 한 픽셀 = 구역 번호 × 16 + 음영 단계, 알파는 0 또는 255.
import { Rectangle, Sprite, Texture } from 'pixi.js';
import { SKIN_COLORS, HAIR_COLORS, TOP_COLORS, BOTTOM_COLORS, HAIR_STYLES, AURA_PAD, auraFromMask, type Look } from './character.ts';

export type Dir = 'se' | 'sw' | 'ne' | 'nw';
export type Anim = 'idle' | 'walk' | 'hit' | 'fall' | 'punch' | 'swing' | 'shoot';
export type Mode = 'u' | 'm' | 'g' | 'w';
export const DIRS: Dir[] = ['se', 'sw', 'ne', 'nw'];
/** 발 기준점이 칸 안에서 있는 곳 (굽기 도구와 같아야 한다) */
export const FOOT = { x: 48, y: 82 };
/** 사람 머리 꼭대기까지 대략의 높이 (이름표·체력 막대 자리) */
export const HEAD_H = 50;

export interface Frame { tex: Texture; ax: number; ay: number; w: number; h: number }
export interface CharSet {
  mode: Mode;
  attack: Anim | null;
  frames: Map<string, Frame>;
  counts: Partial<Record<Anim, number>>;
  /** 광채용: 서 있는 장면의 실루엣 (방향별) */
  masks: Map<Dir, { w: number; h: number; ox: number; oy: number; solid: Uint8Array }>;
}

export const MELEE = ['pipe', 'hammer', 'knife', 'shovel', 'bat', 'hatchet', 'dagger', 'sword'];
const COSTUMES = new Set(['raincoat', 'patient', 'parrot']);

/** 동작 속도 (초당 장면 수)와 맞히는 장면 */
export const ANIM_FPS: Record<Anim, number> = { idle: 1, walk: 9, hit: 11, fall: 10, punch: 15, swing: 14, shoot: 12 };
export const IMPACT: Partial<Record<Anim, number>> = { punch: 2, swing: 3, shoot: 1 };

/** 화면에서 움직이는 방향 → 바라보는 쪽 */
export function dirFromScreen(sdx: number, sdy: number, prev: Dir): Dir {
  if (Math.abs(sdx) < 0.01 && Math.abs(sdy) < 0.01) return prev;
  const south = Math.abs(sdy) < 0.01 ? prev[0] === 's' : sdy > 0;
  const east = Math.abs(sdx) < 0.01 ? prev[1] === 'e' : sdx > 0;
  return ((south ? 's' : 'n') + (east ? 'e' : 'w')) as Dir;
}

// ───────────────────────── 층 읽기 ─────────────────────────
interface Layer { w: number; px: Uint8ClampedArray; meta: Record<string, number[] | null> }
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
        const c = document.createElement('canvas');
        c.width = img.width; c.height = img.height;
        const g = c.getContext('2d', { willReadFrequently: true })!;
        g.drawImage(img, 0, 0);
        return { w: img.width, px: g.getImageData(0, 0, img.width, img.height).data, meta };
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
  };
  const pal: Uint8ClampedArray[] = [];
  for (let k = 0; k < 16; k++) pal.push(ramp(cols[k] ?? '#ff00ff'));
  return pal;
}

// ───────────────────────── 어떤 층을 쓰나 ─────────────────────────
export function layerKeys(look: Look, weapon: string | null) {
  const o = look.outfit ?? 'casual';
  const child = !!look.child;
  const w = child ? null : weapon && (MELEE.includes(weapon) || weapon === 'pistol') ? weapon : null;
  let mode: Mode = w === 'pistol' ? 'g' : w ? 'm' : 'u';
  const sex = look.sex;
  const build = Math.max(0, Math.min(2, look.build ?? 1));
  let base: string;
  if (child) { base = 'b-c-casual-w'; mode = 'w'; }
  else if (o === 'apron' && sex === 'f' && !w) { base = 'b-f1-apron-w'; mode = 'w'; }
  else if (COSTUMES.has(o)) base = `b-${sex}1-${o}-${mode}`;
  else base = `b-${sex}${build}-casual-${mode}`;
  const style = HAIR_STYLES[look.hair] ?? 'short';
  const hair = COSTUMES.has(o) ? null : child ? `h-c-${style}` : `h-${sex}-${style}`;
  return { base, hair, weapon: w ? `w-${sex}-${w}` : null, mode };
}

// ───────────────────────── 합치기 ─────────────────────────
const sets = new Map<string, Promise<CharSet>>();
export function charSet(look: Look, weapon: string | null = null): Promise<CharSet> {
  const keys = layerKeys(look, weapon);
  const id = JSON.stringify([keys, look.skin, look.hairColor, look.top, look.bottom, look.outfit ?? 'casual']);
  let p = sets.get(id);
  if (!p) {
    p = build(look, keys);
    sets.set(id, p);
  }
  return p;
}

async function build(look: Look, keys: ReturnType<typeof layerKeys>): Promise<CharSet> {
  const [base, hair, weap] = await Promise.all([loadLayer(keys.base), keys.hair ? loadLayer(keys.hair) : null, keys.weapon ? loadLayer(keys.weapon) : null]);
  const pal = palette(look);
  const names = base ? Object.keys(base.meta) : [];
  // 장면마다 겹친 테두리 상자 (발 기준)
  type Box = { name: string; x0: number; y0: number; x1: number; y1: number };
  const boxes: Box[] = [];
  for (const name of names) {
    let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
    for (const L of [base, hair, weap]) {
      const r = L?.meta[name];
      if (!r) continue;
      x0 = Math.min(x0, r[4]); y0 = Math.min(y0, r[5]); x1 = Math.max(x1, r[4] + r[2]); y1 = Math.max(y1, r[5] + r[3]);
    }
    if (x1 < x0) continue;
    boxes.push({ name, x0: x0 - 1, y0: y0 - 1, x1: x1 + 1, y1: y1 + 1 }); // 외곽선 자리 1px
  }
  // 선반 쌓기
  const AW = 512;
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
    for (const L of [base, hair, weap]) {
      const r = L?.meta[b.name];
      if (!L || !r) continue;
      const [sx, sy, sw, sh, ox, oy] = r;
      const dx = px + ox - b.x0, dy = py + oy - b.y0;
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
    }
    // 선택적 외곽선: 바깥 빈칸에 가장 어두운 이웃 색을 더 어둡게
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
    // 광채용 실루엣 (서 있는 장면)
    const m = /^idle-(se|sw|ne|nw)-0$/.exec(b.name);
    if (m) {
      const solid = new Uint8Array(w * h);
      for (let yy = 0; yy < h; yy++) for (let xx = 0; xx < w; xx++) solid[yy * w + xx] = d[((py + yy) * AW + px + xx) * 4 + 3] ? 1 : 0;
      masks.set(m[1] as Dir, { w, h, ox: b.x0, oy: b.y0, solid });
    }
  }
  g.putImageData(img, 0, 0);
  const src = Texture.from(canvas).source;
  src.scaleMode = 'nearest';
  const frames = new Map<string, Frame>();
  const counts: CharSet['counts'] = {};
  for (const b of boxes) {
    const [px, py] = place.get(b.name)!;
    const w = b.x1 - b.x0, h = b.y1 - b.y0;
    const tex = new Texture({ source: src, frame: new Rectangle(px, py, w, h) });
    frames.set(b.name, { tex, ax: -b.x0 / w, ay: -b.y0 / h, w, h });
    const [an, , idx] = b.name.split('-');
    const n = Number(idx) + 1;
    if ((counts[an as Anim] ?? 0) < n) counts[an as Anim] = n;
  }
  const attack: Anim | null = keys.mode === 'u' ? 'punch' : keys.mode === 'm' ? 'swing' : keys.mode === 'g' ? 'shoot' : null;
  return { mode: keys.mode, attack, frames, counts, masks };
}

/** 장면 하나 (없으면 서 있는 장면) */
export function frameOf(cs: CharSet, anim: Anim, dir: Dir, i: number): Frame | undefined {
  const n = cs.counts[anim];
  if (!n) return cs.frames.get(`idle-${dir}-0`);
  return cs.frames.get(`${anim}-${dir}-${Math.max(0, Math.min(n - 1, i))}`);
}

/** 스프라이트에 장면을 건다 (장면마다 발 위치가 달라 기준점도 바꾼다) */
export function applyFrame(s: { texture: Texture; anchor: { set(x: number, y: number): void } }, f: Frame | undefined) {
  if (!f) return;
  if (s.texture !== f.tex) s.texture = f.tex;
  s.anchor.set(f.ax, f.ay);
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
      return { tex, ax: (-m.ox + AURA_PAD) / W, ay: (-m.oy + AURA_PAD) / H, w: W, h: H };
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
