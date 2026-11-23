// 우주새 상점 내부 그래픽 — 거리와 같은 등각 축척(타일 64×32, 사람 72×144)
// 벽·바닥·가구 앞면을 평면 도트로 그린 뒤 등각 면에 비스듬히 붙인다
import { bangkokClock, nightFactor } from './clock.ts';

export const RW = 9; // 방 가로 (i)
export const RD = 7; // 방 세로 (j)
export const WH = 184; // 벽 높이 px
export const COUNTER = { x0: 4.15, x1: 9, y0: 3.1, y1: 3.9, h: 60 };
export const SHELF = { x0: 0.35, x1: 4.5, y0: 0, y1: 0.8, h: 150 };
export const DOOR = { y0: 5.0, y1: 6.3, h: 150 };

type Ctx = CanvasRenderingContext2D;

function cv(w: number, h: number): [HTMLCanvasElement, Ctx] {
  const c = document.createElement('canvas');
  c.width = Math.ceil(w);
  c.height = Math.ceil(h);
  const g = c.getContext('2d')!;
  g.imageSmoothingEnabled = false;
  return [c, g];
}
const R = (g: Ctx, x: number, y: number, w: number, h: number, col: string) => {
  g.fillStyle = col;
  g.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
};
function rnd(seed: number) {
  let s = seed;
  return () => (s = (s * 16807) % 2147483647) / 2147483647;
}
/** 도트 선 (정사각 점을 이어 찍는다) */
function line(g: Ctx, x0: number, y0: number, x1: number, y1: number, w: number, col: string) {
  g.fillStyle = col;
  const n = Math.max(1, Math.ceil(Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0))));
  for (let k = 0; k <= n; k++) {
    const x = x0 + ((x1 - x0) * k) / n, y = y0 + ((y1 - y0) * k) / n;
    g.fillRect(Math.round(x - w / 2), Math.round(y - w / 2), w, w);
  }
}
function ellipse(g: Ctx, cx: number, cy: number, rx: number, ry: number, col: string) {
  g.fillStyle = col;
  for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++)
    for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++)
      if (((x + 0.5 - cx) / rx) ** 2 + ((y + 0.5 - cy) / ry) ** 2 <= 1) g.fillRect(x, y, 1, 1);
}
function quad(g: Ctx, pts: [number, number][], col: string) {
  g.fillStyle = col;
  g.beginPath();
  g.moveTo(pts[0][0], pts[0][1]);
  for (const p of pts.slice(1)) g.lineTo(p[0], p[1]);
  g.closePath();
  g.fill();
}

// 평면 그림을 등각 면에 붙이는 변환
/** y = 일정한 면 (오른쪽 벽 방향): 평면 u → 화면 오른쪽 아래 */
function onPlaneY(g: Ctx, flat: HTMLCanvasElement, ox: number, oy: number, sx = 0, sw = flat.width) {
  g.save(); g.setTransform(1, 0.5, 0, 1, ox, oy); g.imageSmoothingEnabled = false;
  g.drawImage(flat, sx, 0, sw, flat.height, 0, 0, sw, flat.height); g.restore();
}
/** x = 일정한 면 (왼쪽 벽 방향): 평면 u → 화면 오른쪽 위 */
function onPlaneX(g: Ctx, flat: HTMLCanvasElement, ox: number, oy: number) {
  g.save(); g.setTransform(1, -0.5, 0, 1, ox, oy); g.imageSmoothingEnabled = false; g.drawImage(flat, 0, 0); g.restore();
}
/** 수평면 (바닥·윗면): 평면 (u, v) = (x·32, y·32) */
function onFloor(g: Ctx, flat: HTMLCanvasElement, ox: number, oy: number, sx = 0, sw = flat.width) {
  g.save(); g.setTransform(1, 0.5, -1, 0.5, ox, oy); g.imageSmoothingEnabled = false;
  g.drawImage(flat, sx, 0, sw, flat.height, 0, 0, sw, flat.height); g.restore();
}

// ───────────────────────── 평면 텍스처 ─────────────────────────
function floorFlat(): HTMLCanvasElement {
  const [c, g] = cv(RW * 32, RD * 32);
  const r = rnd(41);
  const woods = ['#5e3e29', '#664430', '#583a26', '#6b4832'];
  for (let v = 0; v < RD * 32; v += 8) {
    let u = -Math.floor(r() * 40);
    while (u < RW * 32) {
      const len = 40 + Math.floor(r() * 48);
      R(g, u, v, len, 8, woods[Math.floor(r() * woods.length)]);
      R(g, u, v, 1, 8, '#3a2618');
      u += len;
    }
    R(g, 0, v + 7, RW * 32, 1, '#3f2a1c');
  }
  for (let n = 0; n < 900; n++) R(g, r() * RW * 32, r() * RD * 32, 2 + r() * 3, 1, r() < 0.5 ? '#4f3322' : '#76523a');
  // 벽 쪽 그늘
  for (let k = 0; k < 10; k++) {
    g.fillStyle = `rgba(10,6,4,${0.05 * (10 - k) / 10 * 3})`;
    g.fillRect(0, k, RW * 32, 1);
    g.fillRect(k, 0, 1, RD * 32);
  }
  // 카운터 앞 양탄자
  const ru = 4.7 * 32, rv = 4.35 * 32, rw = 3.9 * 32, rh = 2.1 * 32;
  R(g, ru, rv, rw, rh, '#6e2222'); R(g, ru + 3, rv + 3, rw - 6, rh - 6, '#c9a23e'); R(g, ru + 5, rv + 5, rw - 10, rh - 10, '#5a1a1c');
  R(g, ru + 9, rv + 9, rw - 18, rh - 18, '#7a2a26');
  const cx = ru + rw / 2, cy = rv + rh / 2;
  for (let k = 0; k < 14; k++) { R(g, cx - k * 2, cy - 14 + k, k * 4, 1, '#a8462e'); R(g, cx - k * 2, cy + 14 - k, k * 4, 1, '#a8462e'); }
  for (let k = 0; k < 6; k++) { R(g, cx - k, cy - 5 + k, k * 2, 1, '#c9a23e'); R(g, cx - k, cy + 5 - k, k * 2, 1, '#c9a23e'); }
  for (let u = ru + 12; u < ru + rw - 12; u += 10) { R(g, u, rv + 7, 4, 1, '#e0b437'); R(g, u, rv + rh - 8, 4, 1, '#e0b437'); }
  // 문 앞 발판
  R(g, 0, 5.05 * 32, 0.85 * 32, 1.2 * 32, '#2f2721'); R(g, 2, 5.05 * 32 + 2, 0.85 * 32 - 4, 1.2 * 32 - 4, '#3d332b');
  for (let v = 5.05 * 32 + 4; v < 6.2 * 32; v += 3) R(g, 3, v, 0.85 * 32 - 7, 1, '#2a231e');
  return c;
}

/** 벽 공통: 몰딩 · 벽지 · 걸레받이 아래 나무 판 */
function wallBase(w: number, seed: number): [HTMLCanvasElement, Ctx] {
  const [c, g] = cv(w, WH);
  R(g, 0, 0, w, WH, '#2c3a33');
  // 벽지: 금빛이 바랜 마름모 무늬
  for (let v = 12; v < 118; v += 14)
    for (let u = ((v / 14) % 2) * 8; u < w; u += 16) {
      R(g, u + 3, v, 2, 1, '#3e4d42'); R(g, u + 2, v + 1, 4, 1, '#3e4d42'); R(g, u + 3, v + 2, 2, 1, '#3e4d42');
      R(g, u + 3, v + 1, 2, 1, '#5d5a3c');
    }
  const r = rnd(seed);
  for (let n = 0; n < w * 2; n++) R(g, r() * w, 8 + r() * 108, 1, 1, r() < 0.5 ? '#26322c' : '#33423a');
  R(g, 0, 0, w, 7, '#22160e'); R(g, 0, 7, w, 2, '#5a3d26'); R(g, 0, 9, w, 2, '#1a120c');
  R(g, 0, 117, w, 7, '#5a3d26'); R(g, 0, 117, w, 1, '#7a5636'); R(g, 0, 123, w, 1, '#2a1a10');
  R(g, 0, 124, w, WH - 124, '#3f2819');
  for (let u = 4; u < w - 8; u += 36) {
    R(g, u, 130, 30, 42, '#2a1a10'); R(g, u + 1, 131, 28, 40, '#4b3120'); R(g, u + 3, 133, 24, 36, '#3f2819');
    R(g, u + 1, 131, 28, 1, '#5e3e29');
  }
  R(g, 0, WH - 8, w, 8, '#22160e'); R(g, 0, WH - 8, w, 1, '#3a2416');
  return [c, g];
}

function skyFlat(g: Ctx, u0: number, v0: number, w: number, h: number) {
  const { h: hh, m } = bangkokClock();
  const nf = nightFactor(hh, m);
  const dusk = nf > 0.2 && nf < 0.75;
  const top = nf > 0.75 ? '#0f1428' : dusk ? '#4a3a5e' : '#7fb0dc';
  const low = nf > 0.75 ? '#1d2440' : dusk ? '#d07a4a' : '#bcd8ec';
  for (let k = 0; k < h; k++) {
    const t = k / h;
    g.fillStyle = t < 0.5 ? top : low;
    g.fillRect(u0, v0 + k, w, 1);
  }
  const r = rnd(9);
  if (nf > 0.75) for (let n = 0; n < 10; n++) R(g, u0 + r() * w, v0 + r() * h * 0.4, 1, 1, '#cfd6f0');
  const bld = nf > 0.75 ? '#1a2036' : dusk ? '#3a3348' : '#6d7686';
  const lit = '#f2d58a';
  let u = u0;
  while (u < u0 + w) {
    const bw = 8 + Math.floor(r() * 10), bh = 14 + Math.floor(r() * (h - 24));
    R(g, u, v0 + h - bh, Math.min(bw, u0 + w - u), bh, bld);
    if (nf > 0.5) for (let n = 0; n < bh / 5; n++) if (r() < 0.45) R(g, u + 2 + Math.floor(r() * (bw - 4)), v0 + h - bh + 3 + Math.floor(r() * (bh - 6)), 1, 1, lit);
    u += bw + 1;
  }
  // BTS 고가 선로
  R(g, u0, v0 + h - 16, w, 4, nf > 0.75 ? '#2a2f40' : '#8a8a84');
  for (let x = u0 + 6; x < u0 + w; x += 24) R(g, x, v0 + h - 12, 3, 12, nf > 0.75 ? '#252a3a' : '#7a7a74');
  return nf;
}

function rightWallFlat(): HTMLCanvasElement {
  const w = RW * 32;
  const [c, g] = wallBase(w, 77);
  // 창문: 방콕의 지금 하늘
  const u0 = 176, v0 = 30, ww = 90, wh = 84;
  R(g, u0 - 5, v0 - 5, ww + 10, wh + 10, '#22160e');
  R(g, u0 - 4, v0 - 4, ww + 8, 2, '#4b3120');
  skyFlat(g, u0, v0, ww, wh);
  R(g, u0 + ww / 2 - 2, v0, 4, wh, '#22160e'); R(g, u0, v0 + 34, ww, 3, '#22160e');
  R(g, u0, v0, ww, 1, 'rgba(255,255,255,0.18)');
  R(g, u0 - 7, v0 + wh + 3, ww + 14, 6, '#5a3d26'); R(g, u0 - 7, v0 + wh + 3, ww + 14, 1, '#7a5636'); R(g, u0 - 7, v0 + wh + 9, ww + 14, 2, '#22160e');
  // 벽시계: 방콕 시각
  const { h, m } = bangkokClock();
  const cx = 148, cy = 44;
  ellipse(g, cx, cy, 12, 12, '#22160e'); ellipse(g, cx, cy, 11, 11, '#a8862e'); ellipse(g, cx, cy, 9, 9, '#e8dcc0');
  for (let k = 0; k < 12; k++) { const a = (k / 12) * Math.PI * 2; R(g, cx + Math.round(Math.sin(a) * 7.5) - 0.5, cy - Math.round(Math.cos(a) * 7.5) - 0.5, 1, 1, '#5a4a3a'); }
  const ha = (((h % 12) + m / 60) / 12) * Math.PI * 2, ma = (m / 60) * Math.PI * 2;
  line(g, cx, cy, cx + Math.sin(ha) * 4.5, cy - Math.cos(ha) * 4.5, 1, '#1a120c');
  line(g, cx, cy, cx + Math.sin(ma) * 7, cy - Math.cos(ma) * 7, 1, '#1a120c');
  R(g, cx, cy, 1, 1, '#8a2a1a');
  return c;
}

function leftWallFlat(): HTMLCanvasElement {
  const w = RD * 32;
  const [c, g] = wallBase(w, 31);
  // 문 (u는 화면 왼쪽 = 방 앞쪽에서 시작)
  const d0 = (RD - DOOR.y1) * 32, d1 = (RD - DOOR.y0) * 32, dv = WH - DOOR.h;
  R(g, d0 - 3, dv - 4, d1 - d0 + 6, WH - dv + 4, '#22160e');
  R(g, d0, dv, d1 - d0, WH - dv, '#6b4429');
  R(g, d0 + 3, dv + 6, d1 - d0 - 6, 34, '#2a1a12'); R(g, d0 + 5, dv + 8, d1 - d0 - 10, 30, '#e8c97a'); // 문의 작은 창 (바깥 불빛)
  R(g, d0 + 5, dv + 8, d1 - d0 - 10, 2, '#f6e2a8'); R(g, d0 + (d1 - d0) / 2 - 1, dv + 8, 2, 30, '#2a1a12');
  R(g, d0 + 4, dv + 50, d1 - d0 - 8, 40, '#5a3822'); R(g, d0 + 6, dv + 52, d1 - d0 - 12, 36, '#734a2e');
  R(g, d0 + 4, dv + 98, d1 - d0 - 8, 44, '#5a3822'); R(g, d0 + 6, dv + 100, d1 - d0 - 12, 40, '#734a2e');
  ellipse(g, d1 - 7, dv + 94, 2.2, 2.2, '#e0b437');
  R(g, d0, dv, 2, WH - dv, '#83573a');
  // 문 위 작은 종
  ellipse(g, (d0 + d1) / 2, dv - 10, 4, 3.5, '#c9a23e'); R(g, (d0 + d1) / 2 - 4, dv - 8, 8, 2, '#c9a23e'); R(g, (d0 + d1) / 2, dv - 15, 1, 3, '#22160e');
  // 방어구 걸이
  const a0 = 70;
  R(g, a0, 40, 44, 4, '#4b3120'); R(g, a0, 40, 44, 1, '#6b4a30');
  for (const u of [a0 + 8, a0 + 28]) R(g, u, 44, 2, 4, '#a8862e');
  ellipse(g, a0 + 9, 56, 8, 7, '#2b2f36'); R(g, a0 + 1, 57, 16, 6, '#2b2f36'); R(g, a0 + 3, 54, 13, 4, '#5c7f9a'); R(g, a0 + 4, 54, 6, 1, '#a9c7da'); R(g, a0 + 1, 62, 16, 2, '#1a1c20');
  // 방호 조끼
  const vu = a0 + 20;
  R(g, vu, 48, 22, 40, '#3a3f46'); R(g, vu + 7, 48, 8, 6, '#2c3a33'); R(g, vu + 2, 58, 8, 12, '#4f5660'); R(g, vu + 12, 58, 8, 12, '#4f5660');
  R(g, vu, 78, 22, 4, '#2a2e33'); R(g, vu + 3, 79, 2, 1, '#9aa3ad'); R(g, vu + 17, 79, 2, 1, '#9aa3ad');
  // 장갑 한 켤레
  R(g, a0 + 2, 70, 7, 10, '#d1a83a'); R(g, a0 + 10, 72, 7, 10, '#e0b84a'); R(g, a0 + 2, 80, 7, 3, '#8a6a2a'); R(g, a0 + 10, 82, 7, 3, '#9a7a32');
  // 무기 걸이판
  const b0 = 118, b1 = 196, bv0 = 20, bv1 = 128;
  R(g, b0 - 3, bv0 - 3, b1 - b0 + 6, bv1 - bv0 + 6, '#2a1a10');
  R(g, b0, bv0, b1 - b0, bv1 - bv0, '#7a5a3a');
  for (let v = bv0 + 4; v < bv1; v += 7) for (let u = b0 + 4; u < b1; u += 7) R(g, u, v, 1, 1, '#4f3826');
  line(g, b0 + 10, bv0 + 100, b0 + 16, bv0 + 14, 5, '#c49a5e'); line(g, b0 + 10, bv0 + 100, b0 + 12, bv0 + 80, 3, '#8a6238'); // 야구 배트
  line(g, b0 + 24, bv0 + 10, b0 + 24, bv0 + 100, 4, '#7c8492'); line(g, b0 + 23, bv0 + 10, b0 + 23, bv0 + 100, 1, '#b9bec6'); // 쇠파이프
  line(g, b0 + 34, bv0 + 70, b0 + 34, bv0 + 30, 3, '#8a6238'); quadFlat(g, [[b0 + 30, bv0 + 26], [b0 + 44, bv0 + 22], [b0 + 46, bv0 + 36], [b0 + 34, bv0 + 34]], '#7c8492'); // 손도끼
  line(g, b0 + 52, bv0 + 6, b0 + 52, bv0 + 76, 2, '#8a6238'); quadFlat(g, [[b0 + 46, bv0 + 76], [b0 + 58, bv0 + 76], [b0 + 57, bv0 + 98], [b0 + 52, bv0 + 102], [b0 + 47, bv0 + 98]], '#7c8492'); // 삽
  line(g, b0 + 66, bv0 + 100, b0 + 66, bv0 + 18, 3, '#dfe4ea'); line(g, b0 + 61, bv0 + 84, b0 + 71, bv0 + 84, 2, '#a07c3a'); line(g, b0 + 66, bv0 + 86, b0 + 66, bv0 + 100, 3, '#3a2418'); // 장검
  line(g, b0 + 40, bv0 + 56, b0 + 40, bv0 + 76, 3, '#dfe4ea'); line(g, b0 + 37, bv0 + 76, b0 + 43, bv0 + 76, 2, '#a07c3a'); line(g, b0 + 40, bv0 + 78, b0 + 40, bv0 + 88, 3, '#3a2418'); // 단검
  line(g, b0 + 30, bv0 + 84, b0 + 30, bv0 + 100, 3, '#dfe4ea'); line(g, b0 + 30, bv0 + 74, b0 + 30, bv0 + 84, 3, '#3a2418'); // 식칼
  line(g, b0 + 44, bv0 + 92, b0 + 44, bv0 + 106, 2, '#7a5232'); R(g, b0 + 39, bv0 + 89, 11, 4, '#5d6470'); // 장도리
  // 왼쪽 벽은 빛을 덜 받는다
  g.fillStyle = 'rgba(8,5,3,0.2)';
  g.fillRect(0, 0, w, WH);
  return c;
}
function quadFlat(g: Ctx, pts: [number, number][], col: string) {
  quad(g, pts, col);
}

function shelfFrontFlat(): HTMLCanvasElement {
  const w = (SHELF.x1 - SHELF.x0) * 32, h = SHELF.h;
  const [c, g] = cv(w, h);
  R(g, 0, 0, w, h, '#22160e');
  R(g, 4, 4, w - 8, h - 12, '#2e2017');
  const r = rnd(5);
  const boards = [36, 72, 108, h - 10];
  for (const b of boards) { R(g, 4, b, w - 8, 3, '#6b4a30'); R(g, 4, b, w - 8, 1, '#8a6440'); R(g, 4, b + 3, w - 8, 1, '#1a120c'); }
  R(g, 0, h - 8, w, 8, '#1c130d');
  // 1단: 감자칩 봉지와 초콜릿
  let u = 8;
  while (u < w - 40) {
    R(g, u, 21, 11, 15, '#d99a2b'); R(g, u, 21, 11, 2, '#e8e2d0'); R(g, u + 1, 26, 3, 9, '#f2c25a'); R(g, u + 3, 27, 6, 3, '#8a2e1e');
    u += 13;
  }
  for (let k = 0; k < 4; k++) { R(g, w - 36, 34 - k * 4, 26, 3, k % 2 ? '#7a1e2a' : '#4a2a18'); R(g, w - 36, 34 - k * 4, 26, 1, '#9a5a3a'); }
  // 2단: 콜라 캔과 물병
  u = 8;
  for (let k = 0; k < 7; k++, u += 7) { R(g, u, 61, 6, 11, '#8e1f1c'); R(g, u, 61, 6, 1, '#b9b9b4'); R(g, u + 1, 65, 4, 2, '#2a1210'); }
  u += 4;
  while (u < w - 10) { R(g, u + 1, 52, 3, 2, '#2f6fb8'); R(g, u, 54, 5, 18, '#b9dcef'); R(g, u, 60, 5, 4, '#3f8fd0'); R(g, u, 54, 1, 18, '#e6f4fb'); u += 7; }
  // 3단: 붕대와 약상자
  u = 8;
  while (u < w - 12) {
    const tall = r() < 0.5;
    R(g, u, tall ? 94 : 98, 12, tall ? 14 : 10, '#ece8de'); R(g, u, tall ? 94 : 98, 12, 1, '#fbfaf4');
    if (r() < 0.6) R(g, u + 2, tall ? 99 : 101, 8, 2, '#3a7fb8');
    u += 14;
  }
  // 4단: 밧줄 타래와 장갑
  u = 10;
  while (u < w - 20) {
    ellipse(g, u + 8, h - 18, 8, 7, '#b08a52'); ellipse(g, u + 8, h - 18, 5, 4, '#8a6838'); ellipse(g, u + 8, h - 18, 2, 1.5, '#2b2014');
    u += 19;
  }
  // 위 판 그림자
  R(g, 4, 4, w - 8, 3, '#1a120c');
  return c;
}

function counterFlats() {
  const len = (COUNTER.x1 - COUNTER.x0) * 32, dep = (COUNTER.y1 - COUNTER.y0) * 32, h = COUNTER.h;
  const [top, gt] = cv(len, dep);
  const r = rnd(13);
  R(gt, 0, 0, len, dep, '#7a5434');
  for (let v = 0; v < dep; v += 6) R(gt, 0, v, len, 1, '#6a472b');
  for (let n = 0; n < 160; n++) R(gt, r() * len, r() * dep, 3 + r() * 6, 1, r() < 0.5 ? '#8a6440' : '#674528');
  R(gt, 0, dep - 2, len, 2, '#5a3d26'); R(gt, 0, 0, len, 1, '#4a301e');
  const [front, gf] = cv(len, h);
  R(gf, 0, 0, len, h, '#3f2819'); R(gf, 0, 0, len, 4, '#8a6440'); R(gf, 0, 4, len, 1, '#22160e');
  for (let u = 3; u < len - 10; u += 31) {
    R(gf, u, 9, 27, 38, '#2a1a10'); R(gf, u + 1, 10, 25, 36, '#4b3120'); R(gf, u + 3, 12, 21, 32, '#45301f');
    R(gf, u + 1, 10, 25, 1, '#5e3e29');
  }
  R(gf, 0, h - 7, len, 7, '#22160e');
  const [end, ge] = cv(dep, h);
  R(ge, 0, 0, dep, h, '#33200f'); R(ge, 0, 0, dep, 4, '#6a4a30'); R(ge, 0, h - 7, dep, 7, '#1a1008'); R(ge, 3, 10, dep - 6, h - 22, '#2a1a10');
  return { top, front, end };
}

// ───────────────────────── 조립 ─────────────────────────
export const ROOM_BOUNDS = { x0: -236, x1: 300, y0: -WH - 12, y1: RW * 16 + RD * 16 + 14 };

const P = (x: number, y: number, z: number, minX: number, minY: number): [number, number] => [(x - y) * 32 - minX, (x + y) * 16 - z - minY];

/** 움직이지 않는 배경: 바닥 · 두 벽 · 문 · 창 · 진열대 */
export function drawRoomBackground(): { canvas: HTMLCanvasElement; x: number; y: number } {
  const minX = ROOM_BOUNDS.x0, minY = ROOM_BOUNDS.y0;
  const [c, g] = cv(ROOM_BOUNDS.x1 - minX, ROOM_BOUNDS.y1 - minY);
  const p = (x: number, y: number, z: number) => P(x, y, z, minX, minY);
  const T = 0.28; // 벽 두께
  // 바닥 단면
  quad(g, [p(0, RD, 0), p(RW, RD, 0), p(RW, RD, -12), p(0, RD, -12)], '#24170e');
  quad(g, [p(RW, 0, 0), p(RW, RD, 0), p(RW, RD, -12), p(RW, 0, -12)], '#1a1009');
  // 바닥
  const [fx, fy] = p(0, 0, 0);
  onFloor(g, floorFlat(), fx, fy);
  // 벽 윗면과 단면
  quad(g, [p(-T, -T, WH), p(RW, -T, WH), p(RW, 0, WH), p(0, 0, WH), p(0, RD, WH), p(-T, RD, WH)], '#1a120c');
  quad(g, [p(-T, RD, WH), p(0, RD, WH), p(0, RD, -12), p(-T, RD, -12)], '#2a1a10');
  quad(g, [p(RW, -T, WH), p(RW, 0, WH), p(RW, 0, -12), p(RW, -T, -12)], '#22160e');
  // 오른쪽 벽 (y = 0)
  const [rx, ry] = p(0, 0, WH);
  onPlaneY(g, rightWallFlat(), rx, ry);
  // 왼쪽 벽 (x = 0), 평면의 u = 0 은 방 앞쪽 끝 (y = RD)
  const [lx, ly] = p(0, RD, WH);
  onPlaneX(g, leftWallFlat(), lx, ly);
  // 진열대 (오른쪽 벽에 붙음)
  const S = SHELF;
  quad(g, [p(S.x0, S.y0, S.h), p(S.x1, S.y0, S.h), p(S.x1, S.y1, S.h), p(S.x0, S.y1, S.h)], '#4a301e');
  quad(g, [p(S.x1, S.y0, S.h), p(S.x1, S.y1, S.h), p(S.x1, S.y1, 0), p(S.x1, S.y0, 0)], '#2a1a10');
  const [sx, sy] = p(S.x0, S.y1, S.h);
  onPlaneY(g, shelfFrontFlat(), sx, sy);
  // 진열대 위 상자 몇 개
  const box = (x: number, y: number, s: number, hh: number, col: string, col2: string, col3: string) => {
    quad(g, [p(x, y + s, S.h + hh), p(x + s, y + s, S.h + hh), p(x + s, y + s, S.h), p(x, y + s, S.h)], col2);
    quad(g, [p(x + s, y, S.h + hh), p(x + s, y + s, S.h + hh), p(x + s, y + s, S.h), p(x + s, y, S.h)], col3);
    quad(g, [p(x, y, S.h + hh), p(x + s, y, S.h + hh), p(x + s, y + s, S.h + hh), p(x, y + s, S.h + hh)], col);
  };
  box(0.7, 0.15, 0.5, 14, '#b89a6a', '#8a7048', '#6a5636');
  box(1.4, 0.2, 0.4, 10, '#a8865a', '#806040', '#5e4630');
  box(3.3, 0.1, 0.55, 18, '#b89a6a', '#8a7048', '#6a5636');
  return { canvas: c, x: minX, y: minY };
}

/** 카운터를 타일 하나 너비씩 조각낸다 (사람과 앞뒤를 맞추기 위해) */
export function drawCounterPieces(): { canvas: HTMLCanvasElement; x: number; y: number; i: number }[] {
  const C = COUNTER;
  const { top, front, end } = counterFlats();
  const out: { canvas: HTMLCanvasElement; x: number; y: number; i: number }[] = [];
  for (let i = Math.floor(C.x0); i < C.x1; i++) {
    const a = Math.max(C.x0, i), b = Math.min(C.x1, i + 1);
    const minX = (a - C.y1) * 32 - 2, maxX = (b - C.y0) * 32 + 2;
    const minY = (a + C.y0) * 16 - C.h - 26, maxY = (b + C.y1) * 16 + 2;
    const [c, g] = cv(maxX - minX, maxY - minY);
    const p = (x: number, y: number, z: number) => P(x, y, z, minX, minY);
    const su = (a - C.x0) * 32, sw = (b - a) * 32;
    // 앞면 (y = y1)
    const [fx, fy] = p(a, C.y1, C.h);
    onPlaneY(g, front, fx, fy, su, sw);
    if (b >= C.x1) { const [ex, ey] = p(C.x1, C.y1, C.h); onPlaneX(g, end, ex, ey); }
    // 윗면
    const [tx, ty] = p(a, C.y0, C.h);
    onFloor(g, top, tx, ty, su, sw);
    // 카운터 위 물건 (화면을 바로 보는 작은 도트)
    const at = (x: number, y: number) => p(x, y, C.h);
    if (i === 4) { const [x, y] = at(4.7, 3.45); ellipse(g, x, y - 4, 5, 4, '#c9a23e'); R(g, x - 6, y - 1, 12, 2, '#a8862e'); R(g, x - 1, y - 9, 2, 2, '#e0b437'); R(g, x - 3, y - 6, 2, 1, '#f2d27a'); }
    if (i === 5) { const [x, y] = at(5.5, 3.5); quad(g, [[x - 10, y - 2], [x, y - 6], [x + 10, y - 2], [x, y + 2]], '#2a1a12'); quad(g, [[x - 8, y - 2], [x - 1, y - 5], [x - 1, y + 0], [x - 8, y - 1]], '#e8dcc0'); quad(g, [[x + 1, y - 5], [x + 8, y - 2], [x + 8, y - 1], [x + 1, y]], '#d8ccb0'); }
    if (i === 6) { const [x, y] = at(6.6, 3.4); R(g, x - 4, y - 13, 8, 12, '#9fb8c0'); R(g, x - 3, y - 11, 6, 9, '#c94a5a'); R(g, x - 2, y - 9, 2, 2, '#e8c26a'); R(g, x + 1, y - 7, 2, 2, '#5aa86a'); R(g, x - 4, y - 15, 8, 2, '#6b4a30'); R(g, x - 4, y - 13, 1, 12, '#d8ecf0'); }
    if (i === 7) { const [x, y] = at(7.6, 3.45); R(g, x - 8, y - 8, 16, 8, '#2f3d32'); R(g, x - 8, y - 9, 16, 2, '#3f5242'); R(g, x - 1, y - 6, 2, 2, '#c9a23e'); }
    if (i === 8) { const [x, y] = at(8.55, 3.5); R(g, x - 3, y - 2, 6, 2, '#6b4a30'); R(g, x - 1, y - 12, 3, 10, '#e8dcc0'); R(g, x, y - 15, 1, 3, '#f2b84a'); R(g, x, y - 14, 1, 1, '#fff2c0'); }
    out.push({ canvas: c, x: minX, y: minY, i });
  }
  return out;
}

/** 앵무새 횃대 (발 위치 = 캔버스 아래 가운데) */
export function drawPerch(): HTMLCanvasElement {
  const [c, g] = cv(40, 112);
  ellipse(g, 20, 106, 14, 4, 'rgba(0,0,0,0.3)');
  R(g, 8, 102, 24, 4, '#3a2416'); R(g, 8, 102, 24, 1, '#5a3d26');
  R(g, 18, 16, 4, 88, '#5a3d26'); R(g, 18, 16, 1, 88, '#7a5636');
  R(g, 4, 14, 32, 4, '#6b4a30'); R(g, 4, 14, 32, 1, '#8a6440');
  R(g, 2, 18, 6, 5, '#c9b48a'); // 먹이 그릇
  return c;
}

/** 천장에 매달린 등 */
export function drawLamp(): HTMLCanvasElement {
  const [c, g] = cv(28, 120);
  R(g, 13, 0, 2, 96, '#14100c');
  quad(g, [[6, 96], [22, 96], [26, 108], [2, 108]], '#6b4a2c');
  R(g, 2, 106, 24, 2, '#3a2416');
  R(g, 8, 108, 12, 5, '#f2d27a'); R(g, 10, 113, 8, 2, '#fff0c0');
  return c;
}

export { nightFactor };
