// 지옥의 바닥과 구조물: 파일 없이 한 칸씩 점을 찍어 그린다 (재 · 용암 · 늪 · 핏물 · 돌 · 판자)
import { drawHellBuild } from './hellbuild.ts';
import { TW, TH, iso } from './gfx.ts';
import { tileAt, type Zone, type Building, type TileType } from './zone.ts';
import type { Theme } from './hell.ts';

const CHUNK = 24;
type RGB = [number, number, number];
const hex = (h: string): RGB => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const hash = (a: number, b: number, c = 0) => { let h = (a * 374761393 + b * 668265263 + c * 2147483647) | 0; h = (h ^ (h >>> 13)) * 1274126177; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
const mix = (a: RGB, b: RGB, t: number): RGB => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];

/** 바닥 무늬: (u, v) = 칸 안의 위치 0~1, n = 잡음 → 색 */
type Painter = (u: number, v: number, x: number, y: number, n: number, k: number) => RGB;
const P: Record<Theme, Partial<Record<TileType, Painter>>> = {
  ash: {
    lot: (_u, _v, x, y, n, k) => (hash(x, y, k) < 0.004 ? hex('#c9531a') : mix(hex('#47413d'), n > 0.6 ? hex('#5a524c') : hex('#38322f'), Math.abs(n - 0.5))),
    park: (_u, _v, x, y, n, k) => (hash(x >> 1, y, k + 3) < 0.07 ? hex('#6a5a3a') : mix(hex('#4a4438'), hex('#3a3430'), n)),
    walk: (u, v, _x, _y, n) => { const su = (u * 5) % 1, sv = (v * 5 + (Math.floor(u * 5) % 2) * 0.5) % 1; const edge = su < 0.12 || sv < 0.12; return edge ? hex('#1a1616') : mix(hex('#3a3434'), hex('#2a2626'), n); },
    soi: (_u, _v, _x, _y, n) => mix(hex('#332e2c'), hex('#262220'), n),
    water: (u, v, x, y, n, k) => { const vein = Math.abs(Math.sin(u * 9 + v * 5 + n * 3 + k)) < 0.12; return vein ? (hash(x, y) < 0.5 ? hex('#ffd26a') : hex('#ff8a2a')) : n > 0.72 ? hex('#5a1a10') : mix(hex('#c23a18'), hex('#8a2210'), n); },
    cross: (u, _v, _x, _y, n) => ((u * 8) % 1 < 0.14 ? hex('#140e0a') : mix(hex('#3a2a1e'), hex('#2a1e16'), n)),
    block: (_u, _v, _x, _y, n) => mix(hex('#24201e'), hex('#1a1716'), n),
  },
  swamp: {
    lot: (_u, _v, _x, _y, n) => mix(hex('#3e3a2a'), hex('#2e2c20'), n),
    park: (_u, _v, x, y, n, k) => (hash(x, y >> 1, k) < 0.1 ? hex('#5a6a3a') : mix(hex('#34402a'), hex('#283020'), n)),
    walk: (u, _v, _x, _y, n) => ((u * 7) % 1 < 0.13 ? hex('#2a1e14') : mix(hex('#5a4630'), hex('#46362a'), n)),
    soi: (_u, _v, _x, _y, n) => mix(hex('#3a3426'), hex('#2a261c'), n),
    water: (u, v, _x, _y, n, k) => (Math.abs(Math.sin(u * 14 + k + v * 3)) < 0.08 ? hex('#3a4a3a') : mix(hex('#22302a'), hex('#18221e'), n)),
    cross: (u, _v, _x, _y, n) => ((u * 7) % 1 < 0.13 ? hex('#1a140e') : mix(hex('#4e3e2a'), hex('#3e3022'), n)),
    block: (_u, _v, _x, _y, n) => mix(hex('#22241c'), hex('#181a14'), n),
  },
  market: {
    lot: (_u, _v, _x, _y, n) => mix(hex('#4a2a22'), hex('#3a201a'), n),
    park: (_u, _v, _x, _y, n) => mix(hex('#3a2a22'), hex('#2e201a'), n),
    walk: (u, v, _x, _y, n) => { const su = (u * 4) % 1, sv = (v * 4) % 1; return su < 0.08 || sv < 0.08 ? hex('#2a1210') : mix(hex('#6a3028'), hex('#56261e'), n); },
    soi: (u, v, _x, _y, n) => { const su = (u * 6) % 1, sv = (v * 6 + (Math.floor(u * 6) % 2) * 0.5) % 1; return su < 0.12 || sv < 0.12 ? hex('#22140f') : mix(hex('#4a3430'), hex('#3a2824'), n); },
    water: (u, v, _x, _y, n, k) => (Math.abs(Math.sin(u * 11 + v * 4 + k)) < 0.09 ? hex('#b02a1a') : mix(hex('#6a0a0a'), hex('#4a0606'), n)),
    cross: (u, v) => ((u * 6) % 1 < 0.2 || (v * 6) % 1 < 0.2 ? hex('#4a4a4a') : hex('#151212')),
    block: (_u, _v, _x, _y, n) => mix(hex('#2a1a18'), hex('#1e1412'), n),
  },
};

const tileCache = new Map<string, HTMLCanvasElement>();
function tileCanvas(theme: Theme, t: TileType, k: number): HTMLCanvasElement | null {
  const key = `${theme}-${t}-${k}`;
  let c = tileCache.get(key);
  if (c) return c;
  const pt = P[theme][t] ?? P[theme][t === 'road' || t === 'median' ? 'soi' : 'lot'];
  if (!pt) return null;
  c = document.createElement('canvas');
  c.width = TW; c.height = TH;
  const g = c.getContext('2d')!;
  const im = g.createImageData(TW, TH);
  for (let y = 0; y < TH; y++)
    for (let x = 0; x < TW; x++) {
      // 마름모 안쪽만
      const dx = Math.abs(x + 0.5 - TW / 2) / (TW / 2), dy = Math.abs(y + 0.5 - TH / 2) / (TH / 2);
      if (dx + dy > 1.02) continue;
      // 칸 좌표 (u: +i 방향, v: +j 방향)
      const sx = (x + 0.5 - TW / 2) / (TW / 2), sy = (y + 0.5) / (TH / 2);
      const u = (sy + sx) / 2, v = (sy - sx) / 2;
      const n = (hash(x >> 1, y >> 1, k * 31) * 0.6 + hash(x >> 2, y >> 2, k * 17 + 5) * 0.4);
      const [r, gg, b] = pt(Math.max(0, Math.min(0.999, u)), Math.max(0, Math.min(0.999, v)), x, y, n, k);
      const o = (y * TW + x) * 4;
      im.data[o] = r; im.data[o + 1] = gg; im.data[o + 2] = b; im.data[o + 3] = 255;
    }
  g.putImageData(im, 0, 0);
  tileCache.set(key, c);
  return c;
}

/** 지옥 바닥 한 덩어리 */
export function drawHellGround(z: Zone, theme: Theme, i0: number, j0: number): { canvas: HTMLCanvasElement; x: number; y: number } | null {
  const i1 = Math.min(z.W, i0 + CHUNK), j1 = Math.min(z.H, j0 + CHUNK);
  const minX = (i0 - j1) * (TW / 2), minY = (i0 + j0) * (TH / 2);
  const c = document.createElement('canvas');
  c.width = (i1 - i0 + j1 - j0) * (TW / 2) + 2;
  c.height = (i1 - i0 + j1 - j0) * (TH / 2) + 2;
  const g = c.getContext('2d')!;
  g.imageSmoothingEnabled = false;
  for (let j = j0; j < j1; j++)
    for (let i = i0; i < i1; i++) {
      const t = tileAt(z, i, j);
      if (t === 'void') continue;
      const tc = tileCanvas(theme, t, Math.floor(hash(i, j) * 4));
      if (!tc) continue;
      const [x, y] = iso(i, j);
      g.drawImage(tc, x - minX - TW / 2, y - minY);
    }
  return { canvas: c, x: minX, y: minY };
}

/** 지옥 구조물: 재의 문턱 = 부서진 돌 폐허, 굶주림의 늪 = 판잣집, 피의 시장 = 붉은 천막 가게. 유황새는 검붉은 돌집 */
export function drawHellStructure(b: Building, theme: Theme, night: boolean): { canvas: HTMLCanvasElement; x: number; y: number } {
  if (b.hk) return drawHellBuild(b, b.hk, theme);
  if (b.hut) return drawHellBuild(b, 'thatch', theme);
  const { i0, j0, w, d } = b;
  const i1 = i0 + w, j1 = j0 + d;
  const shop = b.cat === 'ujusae';
  const H = b.h;
  const [ax, ay] = iso(i0, j0), [bx, by] = iso(i1, j0), [cx, cy] = iso(i1, j1), [dx, dy] = iso(i0, j1);
  const MT = 30;
  const minX = dx - 2, maxX = bx + 2, minY = ay - H - MT, maxY = cy + 2;
  const W = Math.ceil(maxX - minX), Ht = Math.ceil(maxY - minY);
  const c = document.createElement('canvas');
  c.width = W; c.height = Ht;
  const g = c.getContext('2d')!;
  const im = g.createImageData(W, Ht);
  const base = hex(b.color);
  const seed = i0 * 131 + j0 * 71;
  // 무너진 윗선: 폐허만 들쭉날쭉
  const broken = theme === 'ash' && !shop;
  const topAt = (t: number, face: number) => {
    if (!broken) return H;
    const k = Math.floor(t * 9);
    return H * (0.55 + 0.45 * hash(k, face, seed)) - (hash(k + 1, face, seed) < 0.25 ? 6 : 0);
  };
  const put = (x: number, y: number, col: RGB) => {
    const px = Math.round(x - minX), py = Math.round(y - minY);
    if (px < 0 || py < 0 || px >= W || py >= Ht) return;
    const o = (py * W + px) * 4;
    im.data[o] = col[0]; im.data[o + 1] = col[1]; im.data[o + 2] = col[2]; im.data[o + 3] = 255;
  };
  const wallColor = (face: number, t: number, z: number, len: number): RGB => {
    const shade = face === 0 ? 1.0 : 0.72;
    const u = t * len, n = hash(Math.floor(u / 2), Math.floor(z / 2), seed + face);
    let col: RGB;
    if (theme === 'swamp' && !shop) {
      // 판자 (세로)
      const plank = Math.floor(u / 7);
      col = (u % 7) < 1 ? hex('#1a140e') : mix(hex('#5a4630'), hex('#3e3022'), hash(plank, 1, seed));
    } else {
      // 돌벽돌
      const row = Math.floor(z / 7), off = (row % 2) * 6;
      const mortar = z % 7 < 1 || (u + off) % 12 < 1;
      col = mortar ? mix(base, [0, 0, 0], 0.55) : mix(base, mix(base, [255, 255, 255], 0.12), n);
      if (theme === 'ash' && hash(Math.floor(u), Math.floor(z), seed) < 0.01) col = hex('#ff7a2a');
    }
    return [col[0] * shade, col[1] * shade, col[2] * shade];
  };
  // 왼쪽 면(+j): D → C, 오른쪽 면(+i): C → B
  for (const [face, p0, p1] of [[0, [dx, dy], [cx, cy]], [1, [cx, cy], [bx, by]]] as const) {
    const len = Math.hypot(p1[0] - p0[0], p1[1] - p0[1]);
    const steps = Math.ceil(Math.abs(p1[0] - p0[0]));
    for (let s = 0; s <= steps; s++) {
      const t = s / steps;
      const x = p0[0] + (p1[0] - p0[0]) * t, y = p0[1] + (p1[1] - p0[1]) * t;
      const top = topAt(t, face);
      for (let z = 0; z <= top; z++) {
        let col = wallColor(face, t, z, len);
        // 문·창: 가게 = 빛나는 문, 시장 = 붉은 천막 아래 가판, 폐허 = 검은 구멍 (밤에는 불빛)
        const u = t * len;
        if (shop && face === 0 && Math.abs(t - 0.5) < 0.12 && z < 24) col = night ? hex('#ff9a4a') : hex('#c9602a');
        else if (theme === 'market' && !shop && z > 10 && z < 30 && (u % 26) < 16) col = z > 26 ? hex('#9a1a1a') : night ? hex('#e8a03a') : hex('#3a1a12');
        else if (theme === 'ash' && !shop && z > 14 && z < 26 && (u % 22) > 8 && (u % 22) < 16) col = night && hash(Math.floor(u / 22), face, seed) < 0.5 ? hex('#ff6a1a') : hex('#120c0a');
        else if (theme === 'swamp' && !shop && face === 0 && Math.abs(t - 0.5) < 0.1 && z < 20) col = hex('#120e0a');
        put(x, y - z, col);
      }
    }
  }
  // 지붕
  const roofCol = theme === 'swamp' && !shop ? hex('#5a4a2a') : theme === 'market' && !shop ? hex('#7a1a16') : mix(base, [0, 0, 0], 0.25);
  if (!broken) {
    const steps = 140;
    for (let a = 0; a <= steps; a++)
      for (let bb = 0; bb <= steps; bb++) {
        const fi = i0 + (w * a) / steps, fj = j0 + (d * bb) / steps;
        const [x, y] = iso(fi, fj);
        const n = hash(Math.floor(a / 6), Math.floor(bb / 6), seed + 9);
        put(x, y - H, mix(roofCol, [0, 0, 0], n * 0.25));
      }
  } else {
    // 무너진 폐허 위: 잔해 몇 덩이
    for (let k = 0; k < 4; k++) {
      const fi = i0 + w * (0.2 + 0.6 * hash(k, 3, seed)), fj = j0 + d * (0.2 + 0.6 * hash(k, 5, seed));
      const [x, y] = iso(fi, fj);
      for (let yy = -3; yy <= 3; yy++) for (let xx = -6; xx <= 6; xx++) if (Math.abs(xx) / 6 + Math.abs(yy) / 3 <= 1) put(x + xx, y + yy - 3, mix(base, [0, 0, 0], 0.4));
    }
  }
  g.putImageData(im, 0, 0);
  // 가게: 지붕 위 작은 앵무새 깃발 대신 붉은 등 두 개
  if (shop) {
    for (const t of [0.25, 0.75]) {
      const x = dx + (cx - dx) * t - minX, y = dy + (cy - dy) * t - H * 0.55 - minY;
      g.fillStyle = night ? '#ffb05a' : '#c9602a';
      g.fillRect(Math.round(x) - 2, Math.round(y) - 3, 4, 6);
    }
  }
  return { canvas: c, x: minX, y: minY };
}

/** 지옥 화면 위 붉은 어둠의 세기 (깊을수록 짙다) */
export function hellTint(floor: number) {
  return { color: [0x2a0a06, 0x12200c, 0x2a0408][Math.min(2, floor - 1)], alpha: 0.32 + floor * 0.04 };
}

// ───────────────────────── 지옥 소품: 마른 나무 · 화로 · 부러진 돌기둥 ─────────────────────────
// 현실 소품(가로수·가로등·BTS 기둥) 자리에 놓인다. 화로는 불빛(가로등 빛 자리)이 바닥 가까이에 있다.
const propCache = new Map<string, { canvas: HTMLCanvasElement; ax: number; ay: number; glow?: [number, number] }>();
export function hellProp(kind: string, theme: Theme, v: number) {
  const key = `${kind}-${theme}-${v}`;
  const hit = propCache.get(key);
  if (hit) return hit;
  const c = document.createElement('canvas');
  const g = c.getContext('2d')!;
  const R = (x: number, y: number, w: number, h: number, col: string) => { g.fillStyle = col; g.fillRect(x, y, w, h); };
  let out: { canvas: HTMLCanvasElement; ax: number; ay: number; glow?: [number, number] };
  if (kind === 'tree') {
    // 잎 하나 없이 갈라진 검은 나무 (늪은 이끼가 늘어진다)
    c.width = 64; c.height = 96;
    const bark = theme === 'swamp' ? '#1e2416' : '#1a1210', hi = theme === 'swamp' ? '#3a4228' : '#3a2a22';
    const seg = (x0: number, y0: number, x1: number, y1: number, w: number) => {
      const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0));
      for (let k = 0; k <= n; k++) {
        const t = k / n, x = x0 + (x1 - x0) * t, y = y0 + (y1 - y0) * t, ww = Math.max(1, Math.round(w * (1 - t * 0.6)));
        R(Math.round(x - ww / 2), Math.round(y), ww, 1, bark);
        R(Math.round(x - ww / 2), Math.round(y), 1, 1, hi);
      }
    };
    const r = (k: number) => hash(v, k, 77);
    seg(32, 94, 31 + (r(1) - 0.5) * 6, 50, 7);
    const tips: [number, number][] = [];
    for (let k = 0; k < 5; k++) {
      const y0 = 52 + k * 7 - 10, dir = k % 2 ? 1 : -1;
      const x1 = 32 + dir * (10 + r(k + 3) * 16), y1 = y0 - 14 - r(k + 9) * 18;
      seg(32, y0, x1, y1, 3);
      seg(x1, y1, x1 + dir * 5, y1 - 7, 1);
      tips.push([x1, y1]);
    }
    seg(31, 52, 30 + (r(2) - 0.5) * 8, 14, 3);
    if (theme === 'swamp') for (const [x, y] of tips) for (let k = 0; k < 9; k++) R(Math.round(x) + (k % 3) - 1, Math.round(y) + k, 1, 1, k % 2 ? '#4a5a2a' : '#5e6e34');
    g.globalAlpha = 0.35; R(18, 93, 28, 2, '#000'); g.globalAlpha = 1;
    out = { canvas: c, ax: 0.5, ay: 94 / 96 };
  } else if (kind === 'lamp') {
    // 화로: 쇠 다리 셋 위 불붙은 그릇
    c.width = 28; c.height = 48;
    for (const [x0, x1] of [[6, 10], [21, 17], [14, 14]]) for (let y = 24; y < 46; y++) R(Math.round(x0 + ((x1 - x0) * (y - 24)) / 22), y, 2, 1, '#241a16');
    R(3, 22, 22, 4, '#3a2a22'); R(4, 26, 20, 2, '#1a1210'); R(3, 22, 22, 1, '#5a4434');
    const fl = ['#ffe08a', '#ffb02a', '#f06a1a', '#b8321a'];
    for (let k = 0; k < 40; k++) {
      const x = 5 + hash(v, k, 3) * 18, h = 4 + hash(v, k, 5) * 14 * (1 - Math.abs(x - 14) / 12);
      R(Math.round(x), Math.round(22 - h), 2, Math.round(h), fl[Math.min(3, Math.floor(hash(k, v, 9) * 4))]);
    }
    R(12, 10, 4, 10, '#ffe08a');
    g.globalAlpha = 0.35; R(4, 45, 20, 2, '#000'); g.globalAlpha = 1;
    out = { canvas: c, ax: 0.5, ay: 46 / 48, glow: [0, -30] };
  } else {
    // 부러진 돌기둥 (피의 시장은 붉은 천이 감겨 있다)
    c.width = 34; c.height = 80;
    const top = 10 + Math.floor(hash(v, 1, 4) * 22);
    for (let y = top; y < 76; y++) { R(6, y, 22, 1, '#4a4440'); R(6, y, 6, 1, '#5e5852'); R(23, y, 5, 1, '#322e2a'); }
    for (let x = 6; x < 28; x++) { const d = Math.floor(hash(x, v, 8) * 7); g.clearRect(x, top, 1, d); }
    for (let k = 0; k < 6; k++) R(8 + Math.floor(hash(v, k, 2) * 16), top + 10 + k * 9, 3, 1, '#2a2622');
    if (theme === 'market') { R(6, top + 18, 22, 5, '#7a1414'); R(6, top + 18, 22, 1, '#a42020'); R(20, top + 23, 3, 10, '#7a1414'); }
    R(3, 74, 28, 4, '#3a3430');
    g.globalAlpha = 0.35; R(2, 78, 30, 2, '#000'); g.globalAlpha = 1;
    out = { canvas: c, ax: 0.5, ay: 78 / 80 };
  }
  propCache.set(key, out);
  return out;
}

