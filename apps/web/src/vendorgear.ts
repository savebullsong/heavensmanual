// 31차: 지옥 휴식 마을 장사꾼을 한눈에 알아보게 — 몸(구운 그림) 앞뒤에 그 장사의 차림을 겹쳐 그린다.
// 고깃간(피 묻은 흰 앞치마 · 머리띠) · 물장수(어깨 멜대와 물통 둘 · 삿갓) · 넝마주이(등에 큰 자루) · 약장수(등짐 약궤 · 흰 두건 · 호리병) ·
// 장사꾼(물건을 잔뜩 실은 지게 · 챙 넓은 모자) · 무기상(화살통 · 탄띠) · 호텔 지배인(붉은 모자 · 나비넥타이 · 열쇠 꾸러미) · 대장장이(가죽 앞치마 · 고글)
// 장사꾼은 왼쪽 아래(sw)나 오른쪽 아래(se)만 본다. 2배 밀도 캔버스(80×112), 발 자리 = (40, 104)
import { Texture } from 'pixi.js';
import type { HellVendor } from './zone.ts';

const W = 80, H = 112;
export const VGEAR_FOOT: [number, number] = [40 / W, 104 / H];
type Px = (x: number, y: number, w: number, h: number, c: string) => void;

function canvas(draw: (px: Px, g: CanvasRenderingContext2D) => void) {
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const g = c.getContext('2d')!;
  draw((x, y, w, h, col) => { g.fillStyle = col; g.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); }, g);
  return c;
}
function ell(px: Px, cx: number, cy: number, rx: number, ry: number, col: string) {
  for (let y = Math.floor(cy - ry); y <= cy + ry; y++) for (let x = Math.floor(cx - rx); x <= cx + rx; x++) {
    const dx = (x + 0.5 - cx) / rx, dy = (y + 0.5 - cy) / ry;
    if (dx * dx + dy * dy <= 1) px(x, y, 1, 1, col);
  }
}
function line(px: Px, x0: number, y0: number, x1: number, y1: number, t: number, col: string) {
  const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0));
  for (let k = 0; k <= n; k++) px(x0 + ((x1 - x0) * k) / n - t / 2, y0 + ((y1 - y0) * k) / n - t / 2, t, t, col);
}
/** 앞치마 (가슴받이 → 무릎) */
function apron(px: Px, base: string, shade: string, strap: string) {
  line(px, 34, 46, 37, 35, 1.5, strap); line(px, 46, 46, 43, 35, 1.5, strap);
  for (let y = 46; y <= 86; y++) { const k = (y - 46) / 40, hw = 6 + k * 4 + (y > 58 ? 1 : 0); px(40 - hw, y, hw * 2, 1, y % 7 === 0 ? shade : base); }
  px(30, 58, 20, 1, strap); // 허리끈
  px(29, 85, 22, 2, shade);
}

const DRAW: Partial<Record<HellVendor, { under?: (px: Px, g: CanvasRenderingContext2D) => void; over?: (px: Px, g: CanvasRenderingContext2D) => void }>> = {
  butcher: {
    over: (px) => {
      apron(px, '#e6dfd2', '#c6bdae', '#8a7e6a');
      for (const [x, y, r] of [[37, 64, 3], [44, 70, 2], [36, 76, 2.5], [45, 58, 1.5], [41, 81, 2]] as const) { ell(px, x, y, r, r * 0.8, '#8a1a14'); ell(px, x - 0.5, y - 0.5, r * 0.5, r * 0.4, '#b02a1e'); }
      px(33, 24, 14, 3, '#f0ece2'); px(46, 25, 3, 6, '#e6dfd2'); px(48, 29, 2, 4, '#c6bdae'); // 머리띠와 매듭
    },
  },
  water: {
    under: (px) => { px(12, 39, 56, 3, '#6a4a2a'); px(12, 39, 56, 1, '#8a6a42'); }, // 어깨 멜대
    over: (px) => {
      for (const bx of [8, 58]) {
        line(px, bx + 7, 42, bx + 3, 64, 1, '#3a2a1a'); line(px, bx + 7, 42, bx + 11, 64, 1, '#3a2a1a');
        px(bx, 64, 14, 15, '#7a5232'); px(bx, 64, 2, 15, '#5a3a22'); px(bx + 12, 64, 2, 15, '#5a3a22');
        px(bx - 1, 67, 16, 2, '#3a3a40'); px(bx - 1, 75, 16, 2, '#3a3a40'); // 쇠테
        px(bx + 1, 63, 12, 2, '#3a6a8a'); px(bx + 3, 63, 5, 1, '#8ac0d8'); // 물
        px(bx + 4, 80, 1, 2, '#5a8aa8'); px(bx + 9, 82, 1, 1, '#5a8aa8'); // 물방울
      }
      for (let y = 8; y <= 25; y++) { const hw = Math.max(1, (y - 8) * 0.95); px(40 - hw, y, hw * 2, 1, y % 4 === 0 ? '#9a7e42' : '#c8a860'); } // 삿갓
      px(23, 25, 34, 2, '#8a6e38');
    },
  },
  junk: {
    under: (px) => {
      ell(px, 45, 44, 19, 23, '#7a6a48'); ell(px, 43, 41, 16, 19, '#9a8a62'); ell(px, 40, 36, 8, 9, '#b0a074'); // 누런 삼베 자루
      px(33, 30, 7, 6, '#7a5a3a'); px(50, 50, 8, 7, '#4a5a4a'); px(36, 56, 6, 5, '#7a3a2a'); // 기운 조각
      for (let k = 0; k < 6; k++) px(34 + k * 3, 30 + (k % 2) * 2, 1, 1, '#2a2620'); // 바늘땀
      px(42, 19, 6, 5, '#4a4438'); px(41, 21, 8, 2, '#8a7a4a'); // 묶은 주둥이
      px(22, 58, 3, 6, '#3a3a40'); px(20, 63, 7, 3, '#5a5a62'); // 매단 깡통
    },
    over: (px) => { line(px, 34, 40, 46, 60, 2, '#6a5a3a'); },
  },
  medic: {
    under: (px) => {
      px(25, 26, 30, 40, '#6a4a2e'); px(25, 26, 30, 2, '#8a6a42'); px(25, 26, 2, 40, '#4a3220'); px(53, 26, 2, 40, '#4a3220');
      for (let r = 0; r < 4; r++) { px(26, 32 + r * 8, 28, 1, '#3a2614'); for (const x of [31, 48]) px(x, 35 + r * 8, 2, 2, '#c9a23e'); } // 서랍 · 고리
      px(37, 18, 6, 9, '#f0ece2'); px(34, 21, 12, 3, '#f0ece2'); px(38, 19, 4, 7, '#c8281e'); px(35, 22, 10, 1, '#c8281e'); // 붉은 십자 깃
    },
    over: (px) => {
      px(33, 18, 14, 6, '#ece6d8'); px(33, 23, 14, 1, '#c8c0b0'); px(31, 22, 3, 9, '#e6e0d2'); // 흰 두건
      ell(px, 49, 62, 3, 3.5, '#b89a52'); ell(px, 49, 57, 2, 2.2, '#c8aa62'); px(48, 53, 2, 2, '#6a4a2a'); // 허리의 호리병
    },
  },
  trader: {
    under: (px) => {
      px(28, 6, 2, 58, '#5a3a22'); px(50, 6, 2, 58, '#5a3a22'); // 지게 다리
      px(29, 8, 22, 10, '#8a5a3a'); px(29, 8, 22, 2, '#a87a4e'); // 상자
      px(30, 18, 20, 9, '#4a6a5a'); px(30, 18, 20, 1, '#6a8a7a'); // 둘둘 만 천
      px(31, 27, 18, 8, '#9a7a3a'); for (let k = 0; k < 4; k++) px(32 + k * 4, 28, 2, 6, '#7a5a2a'); // 짚 꾸러미
      ell(px, 25, 46, 4, 4, '#3a3a40'); px(24, 41, 2, 2, '#2a2a2e'); ell(px, 56, 50, 3.5, 4, '#7a4a2a'); // 매단 냄비 · 항아리
      line(px, 30, 6, 50, 6, 1, '#3a2614');
    },
    over: (px) => {
      ell(px, 40, 24, 15, 3.5, '#a88a4a'); ell(px, 40, 23, 14, 2.5, '#c8a860'); px(34, 15, 12, 8, '#b8984e'); px(34, 20, 12, 2, '#7a2a1e'); // 챙 넓은 모자
      line(px, 33, 40, 34, 62, 2, '#6a4a2a'); line(px, 47, 40, 46, 62, 2, '#6a4a2a'); // 멜빵
    },
  },
  arms: {
    under: (px) => {
      line(px, 49, 28, 35, 68, 6, '#5a3a22'); line(px, 49, 28, 35, 68, 2, '#7a5232'); // 화살통
      for (let k = 0; k < 4; k++) { px(47 + k * 2, 20 + (k % 2), 1, 9, '#c8b48a'); px(46 + k * 2, 18 + (k % 2), 3, 3, k % 2 ? '#c8281e' : '#e8e0d0'); } // 깃
    },
    over: (px) => {
      line(px, 33, 40, 47, 63, 3, '#3a2a1c');
      for (let k = 0; k < 6; k++) px(34.5 + k * 2.3, 42 + k * 3.4, 2, 2, '#d9b44a'); // 탄띠의 탄
      px(34, 18, 12, 5, '#4a3424'); px(32, 22, 16, 2, '#3a2618'); // 가죽 모자
    },
  },
  hotel: {
    over: (px) => {
      px(35, 15, 10, 7, '#9a1a1a'); px(35, 15, 10, 2, '#c8302a'); px(35, 20, 10, 2, '#d9b44a'); px(39, 13, 2, 2, '#d9b44a'); // 붉은 모자
      px(37, 38, 2, 3, '#121010'); px(41, 38, 2, 3, '#121010'); px(39, 39, 2, 1, '#2a2222'); // 나비넥타이
      ell(px, 48, 61, 3, 3, '#d9b44a'); ell(px, 48, 61, 1.8, 1.8, '#3a2418'); px(49, 63, 1, 5, '#c9a23e'); px(50, 66, 2, 1, '#c9a23e'); px(47, 63, 1, 4, '#a8822e'); // 열쇠 꾸러미
    },
  },
  smith: {
    over: (px) => {
      apron(px, '#4a2e1c', '#3a2214', '#2a1a10');
      for (const [x, y] of [[38, 62], [44, 72], [36, 78]] as const) px(x, y, 3, 2, '#1e120a'); // 불똥 자국
      ell(px, 37, 22, 2.6, 2.4, '#3a3a3e'); ell(px, 43, 22, 2.6, 2.4, '#3a3a3e'); ell(px, 37, 22, 1.6, 1.4, '#6aa0a0'); ell(px, 43, 22, 1.6, 1.4, '#6aa0a0'); px(32, 21, 16, 1, '#2a1a10'); // 이마의 고글
    },
  },
};

const cache = new Map<string, Texture | null>();
/** 장사꾼 차림의 뒤(몸 뒤) · 앞(몸 앞) 그림 (없으면 null) */
export function vendorGear(kind: HellVendor, layer: 'under' | 'over'): Texture | null {
  const k = kind + layer;
  if (cache.has(k)) return cache.get(k)!;
  const f = DRAW[kind]?.[layer];
  let t: Texture | null = null;
  if (f) { t = Texture.from(canvas(f)); t.source.scaleMode = 'nearest'; }
  cache.set(k, t);
  return t;
}
export const hasVendorGear = (kind: string) => kind in DRAW;
