// 우주새 상점 내부 그래픽 — 거리와 같은 등각 축척 (타일 64×32, 사람 키 약 40px)
// 물건은 카운터 뒤, 점원 뒤쪽 선반에 진열한다. 작은 물건도 윗면·옆면·그림자를 따로 칠해 입체로 보이게 한다
import { bangkokClock, nightFactor } from './clock.ts';

export const RW = 9; // 방 가로 (i)
export const RD = 8; // 방 세로 (j)
export const WH = 80; // 벽 높이 px (사람 키의 약 2배)
export const COUNTER = { x0: 0.05, x1: 9, y0: 2.2, y1: 2.72, h: 24 };
export const SHELF = { x0: 0.3, x1: 8.8, d: 0.55, h: 66, levels: [4, 18, 32, 46, 60] };
export const DOOR = { y0: 5.9, y1: 7.1, h: 56 };
export const WINDOW = { y0: 3.9, y1: 5.35, z0: 30, z1: 62 };

type Ctx = CanvasRenderingContext2D;
type Pt = [number, number];

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
function quad(g: Ctx, pts: Pt[], col: string) {
  g.fillStyle = col;
  g.beginPath();
  g.moveTo(Math.round(pts[0][0]), Math.round(pts[0][1]));
  for (const p of pts.slice(1)) g.lineTo(Math.round(p[0]), Math.round(p[1]));
  g.closePath();
  g.fill();
}
/** 같은 색의 단계 (밝음 · 보통 · 어둠 · 아주 어둠) */
function tones(hex: string): [string, string, string, string] {
  const n = parseInt(hex.slice(1), 16);
  const c = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  const f = (k: number) => '#' + c.map((v) => Math.max(0, Math.min(255, Math.round(k > 1 ? v + (255 - v) * (k - 1) : v * k))).toString(16).padStart(2, '0')).join('');
  return [f(1.3), hex, f(0.7), f(0.45)];
}

// 평면 그림을 등각 면에 붙이는 변환
function onPlaneX(g: Ctx, flat: HTMLCanvasElement, ox: number, oy: number) {
  g.save(); g.setTransform(1, -0.5, 0, 1, ox, oy); g.imageSmoothingEnabled = false; g.drawImage(flat, 0, 0); g.restore();
}
function onPlaneY(g: Ctx, flat: HTMLCanvasElement, ox: number, oy: number, sx = 0, sw = flat.width) {
  g.save(); g.setTransform(1, 0.5, 0, 1, ox, oy); g.imageSmoothingEnabled = false;
  g.drawImage(flat, sx, 0, sw, flat.height, 0, 0, sw, flat.height); g.restore();
}
function onFloor(g: Ctx, flat: HTMLCanvasElement, ox: number, oy: number, sx = 0, sw = flat.width) {
  g.save(); g.setTransform(1, 0.5, -1, 0.5, ox, oy); g.imageSmoothingEnabled = false;
  g.drawImage(flat, sx, 0, sw, flat.height, 0, 0, sw, flat.height); g.restore();
}

// ───────────────────────── 작은 입체 물건 ─────────────────────────
// (x, y) = 화면에서 물건 바닥 가운데. 빛은 왼쪽 위에서 온다
type Draw = (g: Ctx, x: number, y: number) => void;

/** 등각 상자: 앞면 a px, 옆면 깊이 b px, 높이 h px */
function box(col: string, a: number, b: number, h: number, mark?: string): Draw {
  const [hi, mid, lo, dk] = tones(col);
  return (g, x, y) => {
    const fl = x - a / 2, fr = x + a / 2, sr = fr + b / 2;
    quad(g, [[fl - 1, y + 1], [fr + 1, y + 1], [sr + 1, y - b / 4], [fl + b / 2, y - b / 4]], 'rgba(0,0,0,0.38)');
    quad(g, [[fl, y - h], [fr, y - h], [fr, y], [fl, y]], mid); // 앞면
    quad(g, [[fr, y - h], [sr, y - h - b / 4], [sr, y - b / 4], [fr, y]], lo); // 옆면
    quad(g, [[fl, y - h], [fl + b / 2, y - h - b / 4], [sr, y - h - b / 4], [fr, y - h]], hi); // 윗면
    R(g, fl, y - h, 1, h, hi);
    R(g, fl, y - 1, a, 1, dk);
    if (mark && h >= 3) R(g, fl + 1, y - Math.ceil(h * 0.65), Math.max(1, a - 3), Math.max(1, Math.round(h * 0.25)), mark);
  };
}
/** 원통 (캔 · 병 · 통) */
function can(col: string, w: number, h: number, cap?: string, band?: string): Draw {
  const [hi, mid, lo, dk] = tones(col);
  return (g, x, y) => {
    R(g, x - w / 2, y - 1, w + 2, 2, 'rgba(0,0,0,0.38)');
    R(g, x - w / 2, y - h, w, h, mid);
    R(g, x - w / 2, y - h, 1, h, hi);
    if (w >= 3) R(g, x + w / 2 - 1, y - h, 1, h, lo);
    if (band) R(g, x - w / 2, y - Math.round(h * 0.62), w, Math.max(1, Math.round(h * 0.25)), band);
    R(g, x - w / 2, y - h, w, 1, cap ?? hi);
    R(g, x - w / 2, y - 1, w, 1, dk);
  };
}
/** 과자 봉지 */
function bag(col: string, w: number, h: number): Draw {
  const [hi, mid, lo, dk] = tones(col);
  return (g, x, y) => {
    R(g, x - w / 2, y - 1, w + 2, 2, 'rgba(0,0,0,0.38)');
    R(g, x - w / 2 + 1, y - h, w - 2, h, mid);
    R(g, x - w / 2, y - h + 1, w, h - 2, mid);
    R(g, x - w / 2, y - h + 1, 1, h - 3, hi);
    R(g, x - w / 2 + 1, y - h + 1, 2, 2, '#fff2c8');
    R(g, x + w / 2 - 1, y - h + 2, 1, h - 3, lo);
    R(g, x - w / 2 + 1, y - h, w - 2, 1, '#e8e2d0');
    R(g, x - w / 2 + 1, y - 1, w - 2, 1, dk);
    R(g, x - 1, y - Math.round(h * 0.55), 2, 2, '#8a2e1e');
  };
}
/** 밧줄 타래 */
function coil(): Draw {
  return (g, x, y) => {
    ellipse(g, x + 0.5, y - 2.2, 5.4, 3, 'rgba(0,0,0,0.38)');
    ellipse(g, x, y - 3.4, 5, 3.4, '#6e5434');
    ellipse(g, x, y - 4, 4.6, 2.8, '#b08a52');
    ellipse(g, x - 1, y - 4.8, 2.6, 1.4, '#d6b07a');
    ellipse(g, x + 0.4, y - 3.8, 1.6, 0.9, '#3a2a18');
  };
}
/** 헬멧 */
function helmet(col: string): Draw {
  const [hi, mid, lo] = tones(col);
  return (g, x, y) => {
    R(g, x - 4, y - 1, 10, 2, 'rgba(0,0,0,0.38)');
    ellipse(g, x, y - 3.4, 4.4, 3.8, lo);
    ellipse(g, x - 0.5, y - 4, 3.6, 3, mid);
    R(g, x - 2, y - 6, 2, 1, hi);
    R(g, x + 1, y - 3, 3, 2, '#7fa6c2');
    R(g, x - 4, y - 1, 8, 1, '#141518');
  };
}
/** 신발 한 켤레 */
function boots(col: string): Draw {
  const [hi, mid, lo] = tones(col);
  return (g, x, y) => {
    R(g, x - 4, y - 1, 11, 2, 'rgba(0,0,0,0.38)');
    for (const dx of [-3, 1]) {
      R(g, x + dx, y - 7, 3, 7, mid);
      R(g, x + dx, y - 7, 1, 7, hi);
      R(g, x + dx + 2, y - 3, 2, 3, mid);
      R(g, x + dx + 3, y - 3, 1, 3, lo);
      R(g, x + dx, y - 1, 4, 1, '#14100c');
    }
  };
}
/** 개어 쌓은 옷 */
function folded(col: string, n = 3): Draw {
  const [hi, mid, lo] = tones(col);
  return (g, x, y) => {
    R(g, x - 5, y - 1, 12, 2, 'rgba(0,0,0,0.38)');
    for (let k = 0; k < n; k++) {
      const yy = y - 2 - k * 2;
      R(g, x - 5, yy, 10, 2, k % 2 ? mid : lo);
      R(g, x - 5, yy, 10, 1, hi);
      R(g, x + 4, yy, 1, 2, lo);
    }
  };
}
/** 촛불 */
function candle(): Draw {
  return (g, x, y) => {
    R(g, x - 1, y - 1, 4, 2, 'rgba(0,0,0,0.38)');
    R(g, x - 1, y - 6, 2, 6, '#ece4cc'); R(g, x - 1, y - 6, 1, 6, '#fffaf0');
    R(g, x, y - 8, 1, 2, '#f2b84a'); R(g, x, y - 8, 1, 1, '#fff2c0');
  };
}

// ───────────────────────── 평면 텍스처 ─────────────────────────
function floorFlat(): HTMLCanvasElement {
  const [c, g] = cv(RW * 32, RD * 32);
  const r = rnd(41);
  const woods = ['#5e3e29', '#664430', '#583a26', '#6b4832'];
  for (let v = 0; v < RD * 32; v += 6) {
    let u = -Math.floor(r() * 30);
    while (u < RW * 32) {
      const len = 30 + Math.floor(r() * 40);
      R(g, u, v, len, 6, woods[Math.floor(r() * woods.length)]);
      R(g, u, v, 1, 6, '#3a2618');
      u += len;
    }
    R(g, 0, v + 5, RW * 32, 1, '#3f2a1c');
  }
  for (let n = 0; n < 700; n++) R(g, r() * RW * 32, r() * RD * 32, 2 + r() * 2, 1, r() < 0.5 ? '#4f3322' : '#76523a');
  for (let k = 0; k < 8; k++) {
    g.fillStyle = `rgba(10,6,4,${(0.14 * (8 - k)) / 8})`;
    g.fillRect(0, k, RW * 32, 1);
    g.fillRect(k, 0, 1, RD * 32);
  }
  g.fillStyle = 'rgba(10,6,4,0.28)';
  g.fillRect(0, COUNTER.y1 * 32, RW * 32, 4);
  // 손님 쪽 양탄자
  const ru = 2.2 * 32, rv = 3.7 * 32, rw = 5.2 * 32, rh = 3.1 * 32;
  R(g, ru, rv, rw, rh, '#6e2222'); R(g, ru + 3, rv + 3, rw - 6, rh - 6, '#c9a23e'); R(g, ru + 5, rv + 5, rw - 10, rh - 10, '#5a1a1c');
  R(g, ru + 9, rv + 9, rw - 18, rh - 18, '#7a2a26');
  const cx = ru + rw / 2, cy = rv + rh / 2;
  for (let k = 0; k < 18; k++) { R(g, cx - k * 2, cy - 18 + k, k * 4, 1, '#a8462e'); R(g, cx - k * 2, cy + 18 - k, k * 4, 1, '#a8462e'); }
  for (let k = 0; k < 7; k++) { R(g, cx - k, cy - 6 + k, k * 2, 1, '#c9a23e'); R(g, cx - k, cy + 6 - k, k * 2, 1, '#c9a23e'); }
  for (let u = ru + 12; u < ru + rw - 12; u += 10) { R(g, u, rv + 7, 4, 1, '#e0b437'); R(g, u, rv + rh - 8, 4, 1, '#e0b437'); }
  // 문 앞 발판
  R(g, 0, DOOR.y0 * 32 + 2, 0.8 * 32, (DOOR.y1 - DOOR.y0) * 32 - 4, '#2f2721');
  for (let v = DOOR.y0 * 32 + 4; v < DOOR.y1 * 32 - 3; v += 3) R(g, 2, v, 0.8 * 32 - 5, 1, '#3d332b');
  return c;
}

/** 벽: 몰딩 · 바랜 벽지 · 아래쪽 나무 판 */
function wallBase(w: number, seed: number): [HTMLCanvasElement, Ctx] {
  const [c, g] = cv(w, WH);
  R(g, 0, 0, w, WH, '#2c3a33');
  for (let v = 9; v < 52; v += 9)
    for (let u = ((v / 9) % 2) * 6; u < w; u += 12) { R(g, u + 2, v, 1, 1, '#4a5a48'); R(g, u + 1, v + 1, 3, 1, '#3e4d42'); R(g, u + 2, v + 2, 1, 1, '#4a5a48'); }
  const r = rnd(seed);
  for (let n = 0; n < w * 1.5; n++) R(g, r() * w, 6 + r() * 46, 1, 1, r() < 0.5 ? '#26322c' : '#33423a');
  R(g, 0, 0, w, 5, '#22160e'); R(g, 0, 5, w, 1, '#5a3d26');
  R(g, 0, 52, w, 4, '#5a3d26'); R(g, 0, 52, w, 1, '#7a5636'); R(g, 0, 55, w, 1, '#2a1a10');
  R(g, 0, 56, w, WH - 56, '#3f2819');
  for (let u = 3; u < w - 6; u += 24) { R(g, u, 59, 21, 15, '#2a1a10'); R(g, u + 1, 60, 19, 13, '#4b3120'); R(g, u + 1, 60, 19, 1, '#5e3e29'); }
  R(g, 0, WH - 5, w, 5, '#22160e');
  return [c, g];
}

function skyFlat(g: Ctx, u0: number, v0: number, w: number, h: number) {
  const { h: hh, m } = bangkokClock();
  const nf = nightFactor(hh, m);
  const dusk = nf > 0.2 && nf < 0.75;
  const top = nf > 0.75 ? '#0f1428' : dusk ? '#4a3a5e' : '#7fb0dc';
  const low = nf > 0.75 ? '#1d2440' : dusk ? '#d07a4a' : '#bcd8ec';
  for (let k = 0; k < h; k++) { g.fillStyle = k < h / 2 ? top : low; g.fillRect(u0, v0 + k, w, 1); }
  const r = rnd(9);
  if (nf > 0.75) for (let n = 0; n < 6; n++) R(g, u0 + r() * w, v0 + r() * h * 0.4, 1, 1, '#cfd6f0');
  const bld = nf > 0.75 ? '#1a2036' : dusk ? '#3a3348' : '#6d7686';
  let u = u0;
  while (u < u0 + w) {
    const bw = 5 + Math.floor(r() * 7), bh = 8 + Math.floor(r() * (h - 14));
    R(g, u, v0 + h - bh, Math.min(bw, u0 + w - u), bh, bld);
    if (nf > 0.5) for (let n = 0; n < bh / 4; n++) if (r() < 0.45) R(g, u + 1 + Math.floor(r() * (bw - 2)), v0 + h - bh + 2 + Math.floor(r() * (bh - 4)), 1, 1, '#f2d58a');
    u += bw + 1;
  }
  R(g, u0, v0 + h - 9, w, 2, nf > 0.75 ? '#2a2f40' : '#8a8a84');
  for (let x = u0 + 4; x < u0 + w; x += 16) R(g, x, v0 + h - 7, 2, 7, nf > 0.75 ? '#252a3a' : '#7a7a74');
}

function leftWallFlat(): HTMLCanvasElement {
  const w = RD * 32;
  const [c, g] = wallBase(w, 31);
  const U = (y: number) => (RD - y) * 32; // 벽 위 가로 위치 (방 앞쪽 = 0)
  const V = (z: number) => WH - z;
  // 창문 (방콕의 지금 하늘)
  const wu0 = U(WINDOW.y1), wu1 = U(WINDOW.y0), wv0 = V(WINDOW.z1), wv1 = V(WINDOW.z0);
  R(g, wu0 - 3, wv0 - 3, wu1 - wu0 + 6, wv1 - wv0 + 6, '#22160e');
  skyFlat(g, wu0, wv0, wu1 - wu0, wv1 - wv0);
  R(g, (wu0 + wu1) / 2 - 1, wv0, 2, wv1 - wv0, '#22160e'); R(g, wu0, wv0 + 12, wu1 - wu0, 2, '#22160e');
  R(g, wu0 - 4, wv1 + 2, wu1 - wu0 + 8, 3, '#5a3d26'); R(g, wu0 - 4, wv1 + 2, wu1 - wu0 + 8, 1, '#7a5636');
  // 문
  const d0 = U(DOOR.y1), d1 = U(DOOR.y0), dv = V(DOOR.h);
  R(g, d0 - 2, dv - 3, d1 - d0 + 4, WH - dv + 3, '#22160e');
  R(g, d0, dv, d1 - d0, WH - dv, '#6b4429');
  R(g, d0 + 3, dv + 4, d1 - d0 - 6, 14, '#2a1a12'); R(g, d0 + 4, dv + 5, d1 - d0 - 8, 12, '#e8c97a'); R(g, d0 + 4, dv + 5, d1 - d0 - 8, 1, '#f6e2a8');
  R(g, d0 + (d1 - d0) / 2, dv + 5, 1, 12, '#2a1a12');
  R(g, d0 + 3, dv + 22, d1 - d0 - 6, 14, '#5a3822'); R(g, d0 + 4, dv + 23, d1 - d0 - 8, 12, '#734a2e');
  R(g, d0 + 3, dv + 39, d1 - d0 - 6, 14, '#5a3822'); R(g, d0 + 4, dv + 40, d1 - d0 - 8, 12, '#734a2e');
  R(g, d1 - 5, dv + 34, 2, 2, '#e0b437'); R(g, d0, dv, 1, WH - dv, '#83573a');
  ellipse(g, (d0 + d1) / 2, dv - 6, 2.4, 2, '#c9a23e'); R(g, (d0 + d1) / 2, dv - 10, 1, 2, '#22160e');
  // 벽시계 (방콕 시각)
  const { h, m } = bangkokClock();
  const cx = U(3.55), cy = V(68);
  ellipse(g, cx, cy, 6, 6, '#22160e'); ellipse(g, cx, cy, 5, 5, '#a8862e'); ellipse(g, cx, cy, 4, 4, '#e8dcc0');
  const ha = (((h % 12) + m / 60) / 12) * Math.PI * 2, ma = (m / 60) * Math.PI * 2;
  line(g, cx, cy, cx + Math.sin(ha) * 2.2, cy - Math.cos(ha) * 2.2, 1, '#1a120c');
  line(g, cx, cy, cx + Math.sin(ma) * 3.4, cy - Math.cos(ma) * 3.4, 1, '#1a120c');
  // 카운터 뒤 무기 걸이판
  const b0 = U(3.1), b1 = U(0.7), bv0 = V(76), bv1 = V(28);
  R(g, b0 - 2, bv0 - 2, b1 - b0 + 4, bv1 - bv0 + 4, '#2a1a10');
  R(g, b0, bv0, b1 - b0, bv1 - bv0, '#6e5236');
  for (let v = bv0 + 3; v < bv1; v += 5) for (let u = b0 + 3; u < b1; u += 5) R(g, u, v, 1, 1, '#4f3826');
  // 걸린 무기: 밝은 줄 · 기본 · 어두운 줄로 두께를 준다
  const W3 = (x0: number, y0: number, x1: number, y1: number, wdt: number, col: string) => {
    const [hi, mid, lo] = tones(col);
    line(g, x0 + 1, y0 + 1, x1 + 1, y1 + 1, wdt, lo);
    line(g, x0, y0, x1, y1, wdt, mid);
    line(g, x0 - 0.5, y0 - 0.5, x1 - 0.5, y1 - 0.5, 1, hi);
  };
  const by = bv0 + 4;
  W3(b0 + 6, by + 38, b0 + 9, by + 2, 3, '#c49a5e'); W3(b0 + 6, by + 38, b0 + 7, by + 30, 2, '#7a5232'); // 야구 배트
  W3(b0 + 15, by + 2, b0 + 15, by + 40, 2, '#8a929c'); // 쇠파이프
  W3(b0 + 24, by + 26, b0 + 24, by + 8, 2, '#8a6238'); quad(g, [[b0 + 21, by + 6], [b0 + 30, by + 4], [b0 + 31, by + 12], [b0 + 24, by + 11]], '#8a929c'); R(g, b0 + 29, by + 5, 1, 7, '#c9ced6'); // 손도끼
  W3(b0 + 36, by + 1, b0 + 36, by + 28, 2, '#8a6238'); quad(g, [[b0 + 32, by + 28], [b0 + 40, by + 28], [b0 + 39, by + 38], [b0 + 36, by + 41], [b0 + 33, by + 38]], '#8a929c'); R(g, b0 + 33, by + 29, 1, 8, '#b9bec6'); // 삽
  W3(b0 + 48, by + 40, b0 + 48, by + 4, 2, '#dfe4ea'); line(g, b0 + 45, by + 32, b0 + 51, by + 32, 1, '#c9a23e'); W3(b0 + 48, by + 33, b0 + 48, by + 40, 2, '#3a2418'); // 장검
  W3(b0 + 57, by + 6, b0 + 57, by + 18, 2, '#dfe4ea'); line(g, b0 + 55, by + 18, b0 + 59, by + 18, 1, '#c9a23e'); W3(b0 + 57, by + 19, b0 + 57, by + 24, 2, '#3a2418'); // 단검
  W3(b0 + 64, by + 6, b0 + 64, by + 16, 2, '#dfe4ea'); W3(b0 + 64, by + 17, b0 + 64, by + 23, 2, '#2a1a12'); // 식칼
  W3(b0 + 59, by + 30, b0 + 59, by + 40, 1, '#7a5232'); R(g, b0 + 56, by + 28, 7, 3, '#5d6470'); R(g, b0 + 56, by + 28, 7, 1, '#8a929c'); // 장도리
  quad(g, [[b0 + 66, by + 30], [b0 + 74, by + 30], [b0 + 74, by + 33], [b0 + 70, by + 33], [b0 + 69, by + 38], [b0 + 66, by + 38]], '#1e2024'); R(g, b0 + 66, by + 30, 8, 1, '#4a4e55'); // 권총
  g.fillStyle = 'rgba(8,5,3,0.18)'; // 왼쪽 벽은 빛을 덜 받는다
  g.fillRect(0, 0, w, WH);
  return c;
}

function counterFlats() {
  const len = (COUNTER.x1 - COUNTER.x0) * 32, dep = (COUNTER.y1 - COUNTER.y0) * 32, h = COUNTER.h;
  const [top, gt] = cv(len, dep);
  const r = rnd(13);
  R(gt, 0, 0, len, dep, '#7a5434');
  for (let v = 0; v < dep; v += 4) R(gt, 0, v, len, 1, '#6a472b');
  for (let n = 0; n < 160; n++) R(gt, r() * len, r() * dep, 3 + r() * 5, 1, r() < 0.5 ? '#8a6440' : '#674528');
  R(gt, 0, dep - 2, len, 2, '#9a7048'); R(gt, 0, 0, len, 1, '#4a301e');
  const [front, gf] = cv(len, h);
  R(gf, 0, 0, len, h, '#3f2819'); R(gf, 0, 0, len, 3, '#8a6440'); R(gf, 0, 3, len, 1, '#22160e');
  for (let u = 3; u < len - 8; u += 24) { R(gf, u, 6, 21, 13, '#2a1a10'); R(gf, u + 1, 7, 19, 11, '#4b3120'); R(gf, u + 1, 7, 19, 1, '#5e3e29'); }
  R(gf, 0, h - 4, len, 4, '#22160e');
  const [end, ge] = cv(dep, h);
  R(ge, 0, 0, dep, h, '#33200f'); R(ge, 0, 0, dep, 3, '#6a4a30'); R(ge, 0, h - 4, dep, 4, '#1a1008');
  return { top, front, end };
}

// ───────────────────────── 조립 ─────────────────────────
export const ROOM_BOUNDS = { x0: -272, x1: 302, y0: -WH - 14, y1: (RW + RD) * 16 + 16 };
const P = (x: number, y: number, z: number, minX: number, minY: number): Pt => [(x - y) * 32 - minX, (x + y) * 16 - z - minY];

/** 움직이지 않는 배경: 바닥 · 두 벽 · 창 · 문 · 뒤쪽 진열장 · 마네킹 · 손님 쪽 소품 */
export function drawRoomBackground(): { canvas: HTMLCanvasElement; x: number; y: number } {
  const minX = ROOM_BOUNDS.x0, minY = ROOM_BOUNDS.y0;
  const [c, g] = cv(ROOM_BOUNDS.x1 - minX, ROOM_BOUNDS.y1 - minY);
  const p = (x: number, y: number, z: number) => P(x, y, z, minX, minY);
  const T = 0.25;
  quad(g, [p(0, RD, 0), p(RW, RD, 0), p(RW, RD, -10), p(0, RD, -10)], '#24170e');
  quad(g, [p(RW, 0, 0), p(RW, RD, 0), p(RW, RD, -10), p(RW, 0, -10)], '#1a1009');
  const [fx, fy] = p(0, 0, 0);
  onFloor(g, floorFlat(), fx, fy);
  quad(g, [p(-T, -T, WH), p(RW, -T, WH), p(RW, 0, WH), p(0, 0, WH), p(0, RD, WH), p(-T, RD, WH)], '#1a120c');
  quad(g, [p(-T, RD, WH), p(0, RD, WH), p(0, RD, -10), p(-T, RD, -10)], '#2a1a10');
  quad(g, [p(RW, -T, WH), p(RW, 0, WH), p(RW, 0, -10), p(RW, -T, -10)], '#22160e');
  const [rx, ry] = p(0, 0, WH);
  onPlaneY(g, wallBase(RW * 32, 77)[0], rx, ry);
  const [lx, ly] = p(0, RD, WH);
  onPlaneX(g, leftWallFlat(), lx, ly);
  drawShelfUnit(g, p);
  drawMannequin(g, p);
  // 손님 쪽: 창 아래 긴 의자, 문 옆 우산꽂이, 구석 화분
  const bench = (x0: number, x1: number, y0: number, y1: number, h: number) => {
    quad(g, [p(x1, y0, h), p(x1, y1, h), p(x1, y1, 0), p(x1, y0, 0)], '#3a2416');
    quad(g, [p(x0, y1, h), p(x1, y1, h), p(x1, y1, 0), p(x0, y1, 0)], '#4f3322');
    quad(g, [p(x0, y0, h), p(x1, y0, h), p(x1, y1, h), p(x0, y1, h)], '#7a5434');
  };
  bench(0.05, 0.55, 4.0, 5.3, 12);
  const [ux, uy] = p(0.45, 7.45, 0);
  ellipse(g, ux, uy, 6, 2.6, 'rgba(0,0,0,0.35)');
  R(g, ux - 4, uy - 12, 8, 12, '#3a3f46'); R(g, ux - 4, uy - 12, 2, 12, '#5a616b'); R(g, ux - 4, uy - 13, 8, 2, '#22252a');
  line(g, ux - 1, uy - 12, ux - 3, uy - 26, 1, '#14100c'); line(g, ux + 2, uy - 12, ux + 3, uy - 24, 1, '#5a1a1c');
  R(g, ux - 4, uy - 29, 2, 3, '#14100c'); R(g, ux + 2, uy - 27, 2, 3, '#7a2a26');
  const [px2, py2] = p(8.5, 3.5, 0); // 35차: 화분은 카운터 끝 앞으로 (보관 우리는 앞 오른쪽 바닥)
  ellipse(g, px2, py2, 8, 3.4, 'rgba(0,0,0,0.35)');
  R(g, px2 - 5, py2 - 9, 10, 9, '#8a4a2e'); R(g, px2 - 5, py2 - 9, 2, 9, '#a8603e'); R(g, px2 - 6, py2 - 10, 12, 2, '#6e3a24');
  const rr = rnd(3);
  for (let k = 0; k < 26; k++) {
    const a = rr() * Math.PI * 2, d = 3 + rr() * 9;
    ellipse(g, px2 + Math.cos(a) * d * 0.9, py2 - 18 - Math.sin(a) * d * 0.8 - rr() * 6, 2.6, 1.6, k % 3 ? '#3f6a34' : '#5a8a44');
  }
  return { canvas: c, x: minX, y: minY };
}

/** 카운터 뒤 진열장: 칸마다 물건을 입체로 놓는다 */
function drawShelfUnit(g: Ctx, p: (x: number, y: number, z: number) => Pt) {
  const S = SHELF;
  const d = S.d;
  quad(g, [p(S.x0, 0, S.h), p(S.x1, 0, S.h), p(S.x1, 0, 0), p(S.x0, 0, 0)], '#24170f');
  for (const z of S.levels) quad(g, [p(S.x0, 0, z + 3), p(S.x1, 0, z + 3), p(S.x1, 0, z - 2), p(S.x0, 0, z - 2)], '#170f09');
  const bays = [S.x0, 2.4, 4.5, 6.6, S.x1];
  const shelfItems: { bay: number; level: number; draw: Draw; step: number }[] = [
    { bay: 0, level: 4, draw: bag('#d99a2b', 7, 9), step: 0.3 },
    { bay: 0, level: 3, draw: box('#6a2a1c', 9, 5, 3, '#c9a23e'), step: 0.34 },
    { bay: 0, level: 2, draw: can('#a32a24', 3, 6, '#c9c9c4', '#2a1210'), step: 0.13 },
    { bay: 0, level: 1, draw: can('#9fcbe4', 4, 10, '#2f6fb8', '#e8f2f6'), step: 0.17 },
    { bay: 0, level: 0, draw: box('#8a7048', 12, 8, 9, '#a32a24'), step: 0.55 },
    { bay: 1, level: 4, draw: box('#e8e4da', 8, 5, 6, '#3a7fb8'), step: 0.3 },
    { bay: 1, level: 3, draw: can('#ece8de', 6, 5, '#fbfaf4'), step: 0.24 },
    { bay: 1, level: 2, draw: coil(), step: 0.42 },
    { bay: 1, level: 1, draw: box('#d1a83a', 8, 5, 3), step: 0.32 },
    { bay: 1, level: 0, draw: box('#5a3d26', 14, 9, 10), step: 0.62 },
    { bay: 2, level: 4, draw: helmet('#2b2f36'), step: 0.38 },
    { bay: 2, level: 3, draw: folded('#4a5236'), step: 0.42 },
    { bay: 2, level: 2, draw: folded('#3a3f46', 4), step: 0.42 },
    { bay: 2, level: 1, draw: folded('#2f3c55'), step: 0.42 },
    { bay: 2, level: 0, draw: boots('#5a3a22'), step: 0.36 },
    { bay: 3, level: 4, draw: candle(), step: 0.22 },
    { bay: 3, level: 3, draw: can('#9fb8c0', 5, 7, '#6b4a30', '#c94a5a'), step: 0.3 },
    { bay: 3, level: 2, draw: box('#4a5a3a', 7, 5, 4, '#d8d2c4'), step: 0.28 },
    { bay: 3, level: 1, draw: box('#2a2420', 8, 5, 5, '#c9a23e'), step: 0.34 },
    { bay: 3, level: 0, draw: box('#6a5a40', 13, 8, 11), step: 0.6 },
  ];
  // 위 칸부터 그려야 아래 칸 물건이 위 판에 가려지지 않는다
  for (let level = S.levels.length - 1; level >= 0; level--) {
    const z = S.levels[level];
    quad(g, [p(S.x0, 0, z), p(S.x1, 0, z), p(S.x1, d, z), p(S.x0, d, z)], '#5a3d26');
    quad(g, [p(S.x0, d, z), p(S.x1, d, z), p(S.x1, d, z - 2), p(S.x0, d, z - 2)], '#7a5434');
    quad(g, [p(S.x0, d, z), p(S.x1, d, z), p(S.x1, d, z - 0.6), p(S.x0, d, z - 0.6)], '#9a7048');
    for (const it of shelfItems.filter((s) => s.level === level)) {
      const a = bays[it.bay] + 0.18, b = bays[it.bay + 1] - 0.12;
      for (let x = a + it.step / 2; x < b - it.step / 4; x += it.step) {
        const [sx, sy] = p(x, 0.28, z);
        it.draw(g, Math.round(sx), Math.round(sy));
      }
    }
  }
  // 칸막이 기둥 (앞면 · 옆면)
  for (const x of bays) {
    quad(g, [p(x - 0.05, d, S.h + 2), p(x + 0.05, d, S.h + 2), p(x + 0.05, d, 0), p(x - 0.05, d, 0)], '#4a301e');
    quad(g, [p(x + 0.05, 0, S.h + 2), p(x + 0.05, d, S.h + 2), p(x + 0.05, d, 0), p(x + 0.05, 0, 0)], '#2f1f14');
  }
  // 위 장식판
  quad(g, [p(S.x0 - 0.05, d, S.h + 6), p(S.x1 + 0.05, d, S.h + 6), p(S.x1 + 0.05, d, S.h + 2), p(S.x0 - 0.05, d, S.h + 2)], '#5a3d26');
  quad(g, [p(S.x0 - 0.05, 0, S.h + 6), p(S.x1 + 0.05, 0, S.h + 6), p(S.x1 + 0.05, d, S.h + 6), p(S.x0 - 0.05, d, S.h + 6)], '#6b4a30');
  // 값표
  for (const z of S.levels) for (let x = S.x0 + 0.4; x < S.x1; x += 0.7) { const [tx, ty] = p(x, d, z - 1); R(g, tx, ty, 2, 1, '#e8e2d0'); }
}

/** 카운터 뒤 마네킹 (헬멧과 방호 조끼) */
function drawMannequin(g: Ctx, p: (x: number, y: number, z: number) => Pt) {
  const [x, y] = p(1.0, 1.15, 0).map(Math.round) as Pt;
  ellipse(g, x, y, 6, 2.6, 'rgba(0,0,0,0.35)');
  R(g, x - 4, y - 1, 8, 2, '#2a1a10');
  R(g, x - 1, y - 14, 2, 13, '#5a3d26');
  R(g, x - 6, y - 34, 12, 20, '#3a3f46'); R(g, x - 6, y - 34, 2, 20, '#4f5660'); R(g, x + 4, y - 34, 2, 20, '#2a2e33');
  R(g, x - 4, y - 30, 3, 6, '#4f5660'); R(g, x + 1, y - 30, 3, 6, '#4f5660'); R(g, x - 6, y - 19, 12, 2, '#2a2e33');
  R(g, x - 2, y - 37, 4, 3, '#c9b48a');
  ellipse(g, x, y - 41, 4.2, 4, '#2b2f36'); R(g, x - 2, y - 44, 2, 1, '#5a616b'); R(g, x, y - 41, 4, 2, '#7fa6c2');
}

/** 카운터를 타일 하나 너비씩 조각낸다 (사람과 앞뒤를 맞추기 위해) */
export function drawCounterPieces(): { canvas: HTMLCanvasElement; x: number; y: number; i: number }[] {
  const C = COUNTER;
  const { top, front, end } = counterFlats();
  const out: { canvas: HTMLCanvasElement; x: number; y: number; i: number }[] = [];
  for (let i = Math.floor(C.x0); i < C.x1; i++) {
    const a = Math.max(C.x0, i), b = Math.min(C.x1, i + 1);
    const minX = (a - C.y1) * 32 - 2, maxX = (b - C.y0) * 32 + 8;
    const minY = (a + C.y0) * 16 - C.h - 18, maxY = (b + C.y1) * 16 + 3;
    const [c, g] = cv(maxX - minX, maxY - minY);
    const p = (x: number, y: number, z: number) => P(x, y, z, minX, minY);
    const su = (a - C.x0) * 32, sw = (b - a) * 32;
    const [fx, fy] = p(a, C.y1, C.h);
    onPlaneY(g, front, fx, fy, su, sw);
    if (b >= C.x1) { const [ex, ey] = p(C.x1, C.y1, C.h); onPlaneX(g, end, ex, ey); }
    const [tx, ty] = p(a, C.y0, C.h);
    onFloor(g, top, tx, ty, su, sw);
    const at = (x: number, y: number) => p(x, y, C.h).map(Math.round) as Pt;
    if (i === 1) { const [x, y] = at(1.6, C.y0 + 0.25); box('#2a1a12', 12, 6, 2)(g, x, y); R(g, x - 5, y - 3, 5, 1, '#e8dcc0'); R(g, x, y - 3, 4, 1, '#d8ccb0'); } // 장부
    if (i === 3) { const [x, y] = at(3.5, C.y0 + 0.25); ellipse(g, x, y - 3, 3.2, 2.6, '#c9a23e'); R(g, x - 1, y - 5, 1, 1, '#f2d27a'); R(g, x - 4, y - 1, 8, 1, '#8a6a2a'); R(g, x, y - 7, 1, 2, '#e0b437'); } // 종
    if (i === 6) { const [x, y] = at(6.4, C.y0 + 0.25); can('#9fb8c0', 5, 8, '#6b4a30', '#c94a5a')(g, x, y); } // 사탕 병
    if (i === 7) { const [x, y] = at(7.2, C.y0 + 0.25); box('#2f3d32', 10, 6, 5, '#c9a23e')(g, x, y); } // 돈 상자
    if (i === 8) { const [x, y] = at(PARROT_PERCH.x, PARROT_PERCH.y); R(g, x - 5, y - 1, 10, 1, '#3a2416'); R(g, x - 1, y - 9, 2, 9, '#5a3d26'); R(g, x - 4, y - 10, 9, 2, '#6b4a30'); } // 앵무새 횃대
    out.push({ canvas: c, x: minX, y: minY, i });
  }
  return out;
}

/** 앵무새가 앉는 곳 (카운터 위 횃대 가로대) */
export const PARROT_PERCH = { x: 8.35, y: COUNTER.y0 + 0.25, z: COUNTER.h + 9 };

/**
 * 29차: 보관 우리 (큰 짐승을 가두던 쇠창살 우리). 안에 잡동사니와 무기가 보이고, 맡겨 둔 물건 몇 개가 바닥에 놓인다.
 * 35차 다시: 카운터에 붙어 끼어 있던 것을 오른쪽 바닥 한가운데로 — 낮고 넓게(짐승 우리답게), 검은 쇠 바닥 테와 짙은 그림자로 바닥에 딛게,
 * 안의 물건은 모두 바닥에 눕혀 (세워 그린 물건 그림이 사람처럼 보이던 것)
 */
export const CAGE = { x0: 6.5, x1: 8.75, y0: 5.0, y1: 6.6, h: 34 };
export function drawCage(items: HTMLCanvasElement[], hell: boolean): { canvas: HTMLCanvasElement; x: number; y: number } {
  const { x0, x1, y0, y1, h } = CAGE;
  const pts: Pt[] = [];
  const raw = (x: number, y: number, z: number): Pt => [(x - y) * 32, (x + y) * 16 - z];
  for (const x of [x0 - 0.1, x1 + 0.15]) for (const y of [y0 - 0.1, y1 + 0.2]) for (const z of [0, h + 2]) pts.push(raw(x, y, z));
  const minX = Math.floor(Math.min(...pts.map((p) => p[0]))) - 6, minY = Math.floor(Math.min(...pts.map((p) => p[1]))) - 6;
  const maxX = Math.ceil(Math.max(...pts.map((p) => p[0]))) + 6, maxY = Math.ceil(Math.max(...pts.map((p) => p[1]))) + 6;
  const [c, g] = cv(maxX - minX, maxY - minY);
  const at = (x: number, y: number, z: number): Pt => { const [a, b] = raw(x, y, z); return [a - minX, b - minY]; };
  const [ironL, iron, ironD, ironK] = hell ? ['#8a3a26', '#5a2418', '#3a160e', '#1a0806'] : ['#8a8680', '#5c5a56', '#3a3836', '#1a1816'];
  const wood = hell ? tones('#3a2018') : tones('#6a4a2e');
  const straw = hell ? ['#5a3a22', '#4a2c18', '#6a4a2a'] : ['#b89a5a', '#9a7e44', '#cfb06a'];
  // 짙은 바닥 그림자 (오른쪽 아래로 번진다) · 검은 쇠 바닥판 · 짚
  quad(g, [at(x0 - 0.06, y0 - 0.04, 0), at(x1 + 0.14, y0 - 0.04, 0), at(x1 + 0.14, y1 + 0.18, 0), at(x0 - 0.06, y1 + 0.18, 0)], 'rgba(0,0,0,0.34)');
  quad(g, [at(x0, y0, 0), at(x1, y0, 0), at(x1, y1, 0), at(x0, y1, 0)], hell ? '#2a120c' : '#2e2a26');
  quad(g, [at(x0 + 0.05, y0 + 0.05, 1), at(x1 - 0.05, y0 + 0.05, 1), at(x1 - 0.05, y1 - 0.05, 1), at(x0 + 0.05, y1 - 0.05, 1)], hell ? '#3a1c12' : '#4a443c');
  const rr = rnd(29);
  for (let k = 0; k < 110; k++) {
    const [sx0, sy0] = at(x0 + 0.08 + rr() * (x1 - x0 - 0.16), y0 + 0.08 + rr() * (y1 - y0 - 0.16), 1);
    line(g, Math.round(sx0), Math.round(sy0), Math.round(sx0 + (rr() - 0.5) * 6), Math.round(sy0 + (rr() - 0.5) * 2), 1, straw[k % 3]);
  }
  const bars = (ax: number, ay: number, bx: number, by: number, n: number, col: string, skip?: (k: number) => boolean) => {
    for (let k = 0; k <= n; k++) {
      if (skip?.(k)) continue;
      const t = k / n;
      const [px, py] = at(ax + (bx - ax) * t, ay + (by - ay) * t, 0);
      R(g, px, py - h, 1, h, col);
    }
  };
  const rail = (ax: number, ay: number, bx: number, by: number, z: number, w: number, col: string) => line(g, ...at(ax, ay, z), ...at(bx, by, z), w, col);
  const post = (x: number, y: number, col: string, hi: string) => { const [px, py] = at(x, y, 0); R(g, px - 1, py - h - 1, 3, h + 2, col); R(g, px - 1, py - h - 1, 1, h + 2, hi); };
  // 1) 뒤쪽 두 면 (어둡게)
  bars(x0, y0, x1, y0, 18, ironD);
  bars(x0, y0, x0, y1, 10, ironD);
  rail(x0, y0, x1, y0, 2, 2, ironK); rail(x0, y0, x0, y1, 2, 2, ironK);
  rail(x0, y0, x1, y0, h * 0.5, 1, ironD); rail(x0, y0, x0, y1, h * 0.5, 1, ironD);
  post(x0, y0, ironK, ironD);
  // 2) 안: 모두 바닥에 — 뒤 왼쪽 나무 궤짝 · 쌀자루 · 누운 배트와 칼 · 엎어진 헬멧
  { const [cx, cy] = at(x0 + 0.4, y0 + 0.35, 1); R(g, cx - 8, cy - 12, 16, 11, wood[1]); R(g, cx - 8, cy - 12, 16, 2, wood[0]); R(g, cx - 1, cy - 12, 1, 11, wood[2]); R(g, cx - 8, cy - 7, 16, 1, wood[2]); R(g, cx + 7, cy - 11, 1, 10, wood[3]); }
  { const [sx, sy] = at(x0 + 1.05, y0 + 0.4, 1); ellipse(g, sx, sy - 4, 8, 5, hell ? '#6a4a3a' : '#8a7a5a'); R(g, sx - 3, sy - 9, 5, 2, hell ? '#5a3a2a' : '#6e6046'); }
  { const [bx, by] = at(x1 - 0.75, y0 + 0.75, 1); line(g, bx - 10, by - 1, bx + 10, by - 5, 2, hell ? '#8a5a32' : '#b88a52'); R(g, bx + 8, by - 7, 4, 3, hell ? '#9a6a3a' : '#c89a62'); line(g, bx - 8, by + 4, bx + 12, by + 1, 1, '#d8dce0'); R(g, bx - 10, by + 3, 4, 2, '#6a4a2a'); }
  { const [hx, hy] = at(x0 + 1.65, y0 + 0.5, 1); ellipse(g, hx, hy - 3, 6, 3.5, hell ? '#4a1a12' : '#4e5a4a'); R(g, hx - 6, hy - 1, 12, 1, hell ? '#2a0e0a' : '#2e362c'); }
  // 3) 맡겨 둔 물건: 앞쪽 바닥에 눕혀 (납작하게 줄여 그린다)
  items.slice(0, 4).forEach((ic, k) => {
    const [ix, iy] = at(x0 + 0.45 + k * 0.45, y1 - 0.35, 1);
    ellipse(g, ix, iy + 1, 7, 2, 'rgba(0,0,0,0.3)');
    g.drawImage(ic, Math.round(ix - 7), Math.round(iy - 6), 14, 8);
  });
  // 4) 앞쪽 두 면 · 앞면 가운데 쪽문
  const doorA = 0.38, doorB = 0.62;
  bars(x1, y0, x1, y1, 10, iron);
  bars(x0, y1, x1, y1, 18, ironL, (k) => k / 18 > doorA + 0.02 && k / 18 < doorB - 0.02);
  const dx0 = x0 + (x1 - x0) * doorA, dx1 = x0 + (x1 - x0) * doorB;
  for (let k = 0; k <= 5; k++) { const [px, py] = at(dx0 + (dx1 - dx0) * (k / 5), y1 + 0.02, 0); R(g, px, py - h + 4, 1, h - 6, ironL); }
  rail(dx0, y1 + 0.02, dx1, y1 + 0.02, 3, 2, iron); rail(dx0, y1 + 0.02, dx1, y1 + 0.02, h - 3, 2, iron); rail(dx0, y1 + 0.02, dx1, y1 + 0.02, h * 0.5, 1, ironL);
  { const [p1x, p1y] = at(dx0, y1 + 0.02, 0); R(g, p1x - 1, p1y - h + 2, 2, h - 2, ironD); R(g, p1x - 2, p1y - 9, 3, 3, ironK); R(g, p1x - 2, p1y - h + 7, 3, 3, ironK); }
  { const [p2x, p2y] = at(dx1, y1 + 0.02, 0); R(g, p2x - 1, p2y - h + 2, 2, h - 2, ironD); }
  // 5) 바닥 쇠테 · 모서리 기둥 · 가운데 가로대 · 지붕 창살과 테
  rail(x0, y1, x1, y1, 1, 3, ironK); rail(x1, y0, x1, y1, 1, 3, ironK);
  rail(x0, y1, x1, y1, h * 0.5, 1, ironL); rail(x1, y0, x1, y1, h * 0.5, 1, iron);
  post(x1, y0, ironD, iron); post(x0, y1, iron, ironL); post(x1, y1, iron, ironL);
  for (let k = 1; k < 10; k++) { const t = k / 10; rail(x0 + (x1 - x0) * t, y0, x0 + (x1 - x0) * t, y1, h, 1, ironD); }
  rail(x0, y0, x1, y0, h, 2, ironD); rail(x0, y0, x0, y1, h, 2, ironD);
  rail(x0, y1, x1, y1, h, 2, iron); rail(x1, y0, x1, y1, h, 2, iron);
  rail(x0, y1, x1, y1, h + 1, 1, ironL);
  // 자물쇠
  { const [lx, ly] = at(dx1, y1 + 0.03, h * 0.5); R(g, lx - 3, ly - 1, 6, 6, '#c8a040'); R(g, lx - 2, ly - 4, 4, 3, '#8a6a20'); R(g, lx - 1, ly - 3, 2, 1, '#2a1c08'); R(g, lx - 1, ly + 1, 1, 2, '#3a2810'); R(g, lx - 3, ly - 1, 1, 6, '#e8c860'); }
  return { canvas: c, x: minX, y: minY };
}

/** 천장에 매달린 등 */
export function drawLamp(): HTMLCanvasElement {
  const [c, g] = cv(16, 64);
  R(g, 7, 0, 1, 52, 'rgba(20,16,12,0.85)');
  quad(g, [[5, 52], [11, 52], [15, 59], [1, 59]], '#7a5432');
  R(g, 2, 58, 12, 1, '#3a2416'); R(g, 5, 52, 6, 1, '#9a7048');
  R(g, 5, 59, 6, 3, '#f2d27a'); R(g, 6, 62, 4, 1, '#fff0c0');
  return c;
}

export { nightFactor };
