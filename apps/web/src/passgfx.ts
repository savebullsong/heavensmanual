// 42차: 지옥으로 끌려가는 장면의 그림 — 땅에서 솟는 거대한 검은 짐승의 손 (편 손 · 움켜쥔 주먹), 저승사자의 검은 문.
// 2배 밀도 캔버스에 점으로 찍고 반으로 줄여 보인다 (인물과 같은 밀도). 회색으로 바래는 세상에 나오므로 색은 검정·잿빛뿐.
import { Texture } from 'pixi.js';

const C = { o: '#050404', d: '#0e0c0c', m: '#1c1818', l: '#2e2828', h: '#4a4240', claw: '#8e877c', claw2: '#5c564e' };

function canvas(w: number, h: number) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  return [c, c.getContext('2d')!] as const;
}
/** 점으로 채운 타원 (가장자리가 계단처럼) */
function ell(g: CanvasRenderingContext2D, cx: number, cy: number, rx: number, ry: number, col: string) {
  g.fillStyle = col;
  for (let y = Math.floor(cy - ry); y <= cy + ry; y++) for (let x = Math.floor(cx - rx); x <= cx + rx; x++) {
    const dx = (x + 0.5 - cx) / rx, dy = (y + 0.5 - cy) / ry;
    if (dx * dx + dy * dy <= 1) g.fillRect(x, y, 1, 1);
  }
}
/** 굵기가 변하는 마디 (손가락 · 팔뚝) */
function seg(g: CanvasRenderingContext2D, x0: number, y0: number, x1: number, y1: number, r0: number, r1: number, col: string) {
  const n = Math.ceil(Math.hypot(x1 - x0, y1 - y0));
  for (let k = 0; k <= n; k++) { const t = k / Math.max(1, n); ell(g, x0 + (x1 - x0) * t, y0 + (y1 - y0) * t, r0 + (r1 - r0) * t, r0 + (r1 - r0) * t, col); }
}
/** 테두리: 그림 둘레를 가장 어두운 색으로 한 점 두른다 */
function outline(c: HTMLCanvasElement) {
  const g = c.getContext('2d')!;
  const im = g.getImageData(0, 0, c.width, c.height), d = im.data, W = c.width, H = c.height;
  const solid = (x: number, y: number) => x >= 0 && y >= 0 && x < W && y < H && d[(y * W + x) * 4 + 3] > 0;
  const add: number[] = [];
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (!solid(x, y) && (solid(x - 1, y) || solid(x + 1, y) || solid(x, y - 1) || solid(x, y + 1))) add.push(x, y);
  g.fillStyle = C.o;
  for (let k = 0; k < add.length; k += 2) g.fillRect(add[k], add[k + 1], 1, 1);
}

/** 손가락 하나: 뿌리 → 첫 마디 → 둘째 마디 → 갈고리 발톱 (bend: 안으로 굽는 정도, 0 = 곧게 · 1 = 움켜쥠) */
function finger(g: CanvasRenderingContext2D, x: number, y: number, ang: number, len: number, w: number, bend: number) {
  let a = ang, px = x, py = y;
  const parts = [len * 0.42, len * 0.34, len * 0.24];
  for (let k = 0; k < 3; k++) {
    const nx = px + Math.cos(a) * parts[k], ny = py + Math.sin(a) * parts[k];
    seg(g, px, py, nx, ny, w * (1 - k * 0.16), w * (1 - (k + 1) * 0.16), k === 1 ? C.m : C.d);
    seg(g, px - 1, py - 1, nx - 1, ny - 1, Math.max(1, w * 0.35 * (1 - k * 0.2)), Math.max(1, w * 0.3 * (1 - k * 0.2)), C.l); // 윗면에 비친 빛
    ell(g, nx, ny, w * (0.9 - k * 0.14), w * (0.9 - k * 0.14), C.m); // 마디
    px = nx; py = ny;
    a += bend * 0.55 * (ang < -Math.PI / 2 ? 1 : -1);
  }
  // 갈고리 발톱: 끝에서 안쪽으로 휜다
  const cl = len * 0.3, ca = a + bend * 0.9 * (ang < -Math.PI / 2 ? 1 : -1) + (ang < -Math.PI / 2 ? 0.5 : -0.5);
  seg(g, px, py, px + Math.cos(a) * cl * 0.5, py + Math.sin(a) * cl * 0.5, w * 0.55, w * 0.42, C.claw2);
  seg(g, px + Math.cos(a) * cl * 0.5, py + Math.sin(a) * cl * 0.5, px + Math.cos(ca) * cl, py + Math.sin(ca) * cl, w * 0.42, 0.6, C.claw);
}

let cache: { open: Texture; fist: Texture } | null = null;
/** 짐승의 손: 편 손(손가락이 하늘을 향해 벌어진다) · 움켜쥔 주먹. 아래쪽 가운데가 땅에서 솟는 자리 */
export function beastHand(): { open: Texture; fist: Texture } {
  if (cache) return cache;
  const W = 200, H = 300;
  // 편 손
  const [c1, g1] = canvas(W, H);
  seg(g1, 100, 300, 100, 190, 34, 38, C.d);         // 팔뚝 (땅 속에서)
  for (let k = 0; k < 7; k++) seg(g1, 78 + k * 7, 296, 76 + k * 8, 200, 2, 2, k % 2 ? C.m : C.l); // 힘줄·털
  ell(g1, 100, 172, 58, 46, C.d);                     // 손바닥
  ell(g1, 96, 164, 40, 28, C.m);
  ell(g1, 90, 158, 18, 11, C.l);
  for (const [x, ang, len, w] of [[50, -2.6, 96, 15], [72, -2.08, 120, 16], [100, -1.6, 130, 16], [128, -1.12, 118, 15], [150, -0.6, 88, 15]] as const) finger(g1, x, 152, ang, len, w, 0.22);
  outline(c1);
  // 움켜쥔 주먹: 손가락이 안으로 말려 들어간 덩어리 + 아래로 향한 발톱
  const [c2, g2] = canvas(W, H);
  seg(g2, 100, 300, 100, 200, 34, 40, C.d);
  for (let k = 0; k < 7; k++) seg(g2, 78 + k * 7, 296, 76 + k * 8, 210, 2, 2, k % 2 ? C.m : C.l);
  ell(g2, 100, 168, 62, 56, C.d);
  ell(g2, 94, 156, 46, 38, C.m);
  for (let k = 0; k < 4; k++) {   // 말아 쥔 손가락 마디 넷 (가로 띠)
    const y = 128 + k * 20;
    ell(g2, 104, y, 52 - k * 4, 10, k % 2 ? C.m : C.l);
    seg(g2, 58 + k * 4, y + 4, 150 - k * 4, y + 4, 2, 2, C.o);
    // 손가락 끝의 발톱이 아래로 비어져 나온다
    for (const x of [74, 98, 122]) seg(g2, x + k * 2, y + 6, x + k * 2 - 4, y + 18, 3, 1, C.claw);
  }
  finger(g2, 50, 190, -2.2, 52, 12, 1);   // 엄지가 감싼다
  outline(c2);
  const mk = (c: HTMLCanvasElement) => { const t = Texture.from(c); t.source.scaleMode = 'nearest'; return t; };
  cache = { open: mk(c1), fist: mk(c2) };
  return cache;
}
