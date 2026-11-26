// 31차: 지옥 1층 마스크 팔이 소녀의 짐 — 등에 멘 화염방사기(올리브색 연료통 둘 · 쇠틀 · 검은 호스 · 어깨에 걸친 총열)와
// 손에 든 고리버들 바구니(검은 마스크가 수북). 사용자 컨셉 그림을 따라 그린다. 몸(구운 아이 그림)은 그대로 두고 앞뒤에 겹쳐 그린다.
// 2배 밀도 캔버스(72×96)에 점으로 찍고 반으로 줄여 보인다. 발 자리 = (36, 88)
import { Texture } from 'pixi.js';
import type { Dir } from './sprites.ts';

const W = 72, H = 96;
export const PACK_FOOT: [number, number] = [36 / W, 88 / H];
type View = 'front' | 'back' | 'side';
type Layer = 'under' | 'over';

const TANK = '#6b7a3a', TANK_D = '#4a5628', TANK_L = '#93a25a', CAP = '#343c20';
const BAR = '#8c9096', BAR_D = '#55595e', CANVAS = '#8a7a4a', CANVAS_D = '#5e5230';
const HOSE = '#1c1c20', STEEL = '#a4aab2', STEEL_D = '#5c6268', TEAL = '#2a8a86', TEAL_D = '#1a5a58';
const WICKER = '#b08850', WICKER_D = '#7a5a30', WICKER_L = '#d4ac6a', MASK = '#121216', MASK_L = '#2c2c34';

function canvas(draw: (px: (x: number, y: number, w: number, h: number, c: string) => void) => void): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const g = c.getContext('2d')!;
  draw((x, y, w, h, col) => { g.fillStyle = col; g.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); });
  return c;
}
/** 세운 연료통 하나 (둥근 어깨 · 마개 · 왼쪽 그늘 · 오른쪽 빛) */
function tank(px: (x: number, y: number, w: number, h: number, c: string) => void, x: number, y: number, w: number, h: number) {
  px(x + 2, y, w - 4, 2, TANK); px(x + 1, y + 1, w - 2, 2, TANK);
  px(x, y + 3, w, h - 3, TANK);
  px(x, y + 3, 2, h - 3, TANK_D); px(x + w - 3, y + 3, 2, h - 6, TANK_L);
  px(x + 1, y + h - 2, w - 2, 2, TANK_D);
  px(x + w / 2 - 2, y - 3, 4, 3, CAP); px(x + w / 2 - 1, y - 4, 2, 1, BAR_D);
  px(x, y + Math.round(h * 0.55), w, 1, TANK_D); // 띠
}
function basket(px: (x: number, y: number, w: number, h: number, c: string) => void, x: number, y: number) {
  // 손잡이 (반원)
  for (let k = 0; k <= 10; k++) { const a = Math.PI * (k / 10); px(x + 8 - Math.cos(a) * 7, y - Math.sin(a) * 8, 2, 2, k % 3 ? WICKER : WICKER_D); }
  // 마스크 더미 (검은 천 · 귀걸이 끈)
  px(x + 2, y - 2, 13, 3, MASK); px(x + 4, y - 3, 5, 1, MASK_L); px(x + 10, y - 3, 4, 2, MASK); px(x + 12, y - 4, 2, 1, '#3a3a44');
  // 몸통 (엮은 결)
  px(x, y, 17, 2, WICKER_L);
  px(x + 1, y + 2, 15, 8, WICKER);
  for (let r = 0; r < 4; r++) for (let q = 0; q < 8; q++) if ((q + r) % 2) px(x + 1 + q * 2, y + 2 + r * 2, 1, 1, WICKER_D);
  px(x + 2, y + 10, 13, 1, WICKER_D);
}

function draw(view: View, layer: Layer): HTMLCanvasElement {
  return canvas((px) => {
    if (view === 'front') {
      if (layer === 'under') {
        // 몸 뒤: 두 연료통이 어깨 양옆과 머리 위로 비죽, 쇠틀 다리가 땅까지, 호스가 오른쪽으로 돌아 총으로
        px(17, 34, 2, 50, BAR_D); px(53, 34, 2, 50, BAR_D); px(17, 64, 38, 2, BAR); px(16, 82, 4, 2, BAR_D); px(52, 82, 4, 2, BAR_D);
        tank(px, 19, 28, 13, 40); tank(px, 40, 28, 13, 40);
        for (let k = 0; k < 9; k++) px(51 + Math.sin(k / 3) * 5, 66 + k * 1.6, 3, 2, HOSE); // 호스
        // 오른쪽 어깨 너머로 솟은 총열 (뒤로 비스듬히)
        for (let k = 0; k < 16; k++) px(44 + k * 1.05, 44 - k * 1.25, 4, 3, k > 12 ? STEEL_D : STEEL);
        px(60, 22, 5, 4, STEEL_D); px(61, 21, 3, 1, '#2a2a2e'); // 노즐
      } else {
        // 몸 앞: 가슴을 가로지르는 멜빵 · 왼손(화면 오른쪽)의 바구니
        for (let k = 0; k < 12; k++) px(28 + k * 1.3, 46 + k * 1.3, 2, 2, CANVAS_D);
        px(46, 52, 4, 3, TEAL); px(47, 51, 2, 1, TEAL_D); // 어깨 앞으로 내려온 손잡이
        basket(px, 42, 60);
      }
    } else if (view === 'back') {
      if (layer === 'under') {
        basket(px, 13, 61); // 등 뒤로 돌면 바구니는 몸 너머 (조금만 보인다)
      } else {
        // 등: 국방색 천 지게틀 · 연료통 둘 · 쇠틀 · 호스 · 비스듬히 걸친 화염방사기
        px(21, 32, 2, 52, BAR_D); px(49, 32, 2, 52, BAR_D); px(20, 82, 4, 2, BAR_D); px(48, 82, 4, 2, BAR_D);
        px(23, 40, 26, 32, CANVAS); px(23, 40, 26, 2, CANVAS_D); px(23, 70, 26, 2, CANVAS_D);
        for (let k = 0; k < 6; k++) px(23, 44 + k * 4, 2, 1, BAR); // 끈 고리
        tank(px, 23, 30, 12, 40); tank(px, 37, 30, 12, 40);
        px(21, 62, 30, 2, BAR);
        for (let k = 0; k < 12; k++) px(25 + Math.sin(k / 2.5) * 4 - k * 0.6, 70 + k * 1.1, 3, 2, HOSE);
        for (let k = 0; k < 22; k++) px(24 + k * 1.3, 70 - k * 1.75, 4, 3, k > 18 ? STEEL_D : STEEL); // 총열 (등을 가로질러)
        px(30, 60, 5, 4, TEAL); px(31, 64, 3, 3, TEAL_D);
        px(51, 29, 5, 4, STEEL_D);
      }
    } else {
      // 옆모습 (오른쪽을 본다): 짐은 등 쪽(왼쪽)에, 총은 어깨에서 앞으로, 바구니는 앞쪽 손에
      if (layer === 'under') {
        px(18, 34, 2, 50, BAR_D); px(17, 82, 4, 2, BAR_D); px(18, 64, 14, 2, BAR);
        tank(px, 19, 28, 14, 40);
        for (let k = 0; k < 8; k++) px(22 + k * 0.8, 68 + k * 1.8, 3, 2, HOSE);
      } else {
        px(30, 46, 3, 14, CANVAS_D); // 멜빵
        for (let k = 0; k < 18; k++) px(32 + k * 1.3, 46 - k * 0.55, 4, 3, k > 14 ? STEEL_D : STEEL);
        px(54, 34, 5, 4, STEEL_D); px(38, 46, 4, 4, TEAL); px(39, 50, 2, 3, TEAL_D);
        basket(px, 40, 60);
      }
    }
  });
}

const tex = new Map<string, Texture>();
function texOf(view: View, layer: Layer) {
  const k = view + layer;
  let t = tex.get(k);
  if (!t) { t = Texture.from(draw(view, layer)); t.source.scaleMode = 'nearest'; tex.set(k, t); }
  return t;
}
/** 바라보는 쪽 → 그림(앞·뒤·옆)과 좌우 뒤집기 */
export function packFor(dir: Dir): { under: Texture; over: Texture; flip: boolean } {
  const view: View = dir === 'n' || dir === 'ne' || dir === 'nw' ? 'back' : dir === 'e' || dir === 'w' ? 'side' : 'front';
  const flip = dir === 'w' || dir === 'sw' || dir === 'nw';
  return { under: texOf(view, 'under'), over: texOf(view, 'over'), flip };
}
