// 베스크 대부소 (Besk's Loan House) — 지옥 3층 피의 시장 마을 안, 대부업자 베스크의 가게 (바닥 3×2칸)
// 글자 간판은 없다. 검붉은 벽돌 벽과 돌 받침, 모서리 돌, 벽 속으로 들어간 쇠띠 두른 겹문과 금 징,
// 쇠창살 낀 촛불 창, 동전 더미와 장부 그림의 매단 판, 문 옆의 붉은 봉랍 독촉장, 검은 슬레이트 지붕과 용마루의 노전 장식,
// 처마에 사슬로 매단 동전 추.
import { TW, TH } from './gfx.ts';
import type { Building } from './zone.ts';

export const LOAN_TOP = 112; // 땅에서 노전 장식 끝까지 (px)
const G = 58; // 벽 높이

type Pt = [number, number];

export function drawLoanHouse(b: Building): { canvas: HTMLCanvasElement; x: number; y: number } {
  const { i0, j0, w, d } = b;
  const i1 = i0 + w, j1 = j0 + d;
  const MX = 22, MT = 16;
  const minX = (i0 - j1) * (TW / 2) - MX;
  const minY = (i0 + j0) * (TH / 2) - LOAN_TOP - MT;
  const W = (w + d) * (TW / 2) + MX * 2, H = (w + d) * (TH / 2) + LOAN_TOP + MT + 8;
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const g = c.getContext('2d')!;
  const P = (x: number, y: number, z: number): Pt => [(x - y) * (TW / 2) - minX, (x + y) * (TH / 2) - z - minY];
  const trace = (pts: Pt[]) => { g.moveTo(pts[0][0], pts[0][1]); for (const q of pts.slice(1)) g.lineTo(q[0], q[1]); g.closePath(); };
  const poly = (pts: Pt[], fill: string) => { g.beginPath(); trace(pts); g.fillStyle = fill; g.fill(); };
  const quadLy = (a: number, bb: number, z0: number, z1: number, dd: number, fill: string) => poly([P(a, j1 + dd, z0), P(bb, j1 + dd, z0), P(bb, j1 + dd, z1), P(a, j1 + dd, z1)], fill);
  const quadRx = (a: number, bb: number, z0: number, z1: number, dd: number, fill: string) => poly([P(i1 + dd, a, z0), P(i1 + dd, bb, z0), P(i1 + dd, bb, z1), P(i1 + dd, a, z1)], fill);
  const quadL = (a: number, bb: number, z0: number, z1: number, fill: string) => quadLy(a, bb, z0, z1, 0, fill);
  const quadR = (a: number, bb: number, z0: number, z1: number, fill: string) => quadRx(a, bb, z0, z1, 0, fill);
  const dot = (x: number, y: number, ww: number, hh: number, col: string) => { g.fillStyle = col; g.fillRect(Math.round(x), Math.round(y), ww, hh); };
  type Outline = (dd: number, grow: number) => Pt[];
  const rectL = (a: number, bb: number, z0: number, z1: number): Outline => (dd, gr) => { const gx = gr / (TW / 2); return [P(a - gx, j1 + dd, z0 - gr), P(bb + gx, j1 + dd, z0 - gr), P(bb + gx, j1 + dd, z1 + gr), P(a - gx, j1 + dd, z1 + gr)]; };
  const rectR = (a: number, bb: number, z0: number, z1: number): Outline => (dd, gr) => { const gy = gr / (TW / 2); return [P(i1 + dd, a - gy, z0 - gr), P(i1 + dd, bb + gy, z0 - gr), P(i1 + dd, bb + gy, z1 + gr), P(i1 + dd, a - gy, z1 + gr)]; };
  const shift = (face: 'L' | 'R', dd: number): Pt => (face === 'L' ? [-dd * (TW / 2), dd * (TH / 2)] : [dd * (TW / 2), dd * (TH / 2)]);
  /** 벽에 파인 구멍: 안쪽 벽 → 깊이만큼 들어간 안쪽(inner) → 위 그림자 → 벽 위 틀 그림자 → 두께 있게 튀어나온 돌 틀 */
  const recess = (face: 'L' | 'R', o: Outline, dep: number, fill: string, inner: () => void, frame: { w: number; out: number; face: string; side: string }) => {
    g.save();
    g.beginPath(); trace(o(0, 0)); g.clip();
    const n = Math.max(3, Math.ceil(dep * (TW / 2)));
    for (let k = 0; k <= n; k++) {
      const pts = o(-dep * (k / n), 0), ys = pts.map((q) => q[1]);
      const gr = g.createLinearGradient(0, Math.min(...ys), 0, Math.max(...ys));
      gr.addColorStop(0, '#0e0806'); gr.addColorStop(0.55, face === 'L' ? '#2e1410' : '#3a1c16'); gr.addColorStop(1, '#5a3a30');
      g.fillStyle = gr; g.beginPath(); trace(pts); g.fill();
    }
    const gl = o(-dep, 0);
    g.beginPath(); trace(gl); g.clip();
    g.fillStyle = fill; g.fillRect(0, 0, W, H);
    const [tx, ty] = shift(face, -dep);
    g.translate(tx, ty); inner(); g.setTransform(1, 0, 0, 1, 0, 0);
    g.globalAlpha = 0.45; g.fillStyle = '#040202';
    g.beginPath(); trace(gl); trace(gl.map(([x, y]) => [x + (face === 'L' ? 1.6 : -1.6), y + 4] as Pt)); g.fill('evenodd');
    g.globalAlpha = 1;
    g.restore();
    g.globalAlpha = 0.35; g.fillStyle = '#000';
    g.beginPath(); trace(o(0, frame.w).map(([x, y]) => [x + (face === 'L' ? 1 : 2), y + 2] as Pt)); trace(o(0, 0)); g.fill('evenodd');
    g.globalAlpha = 1;
    const m = Math.max(2, Math.ceil(frame.out * (TW / 2)));
    for (let k = 0; k <= m; k++) { g.fillStyle = k === m ? frame.face : frame.side; g.beginPath(); trace(o(frame.out * (k / m), frame.w)); trace(o(frame.out * (k / m), 0)); g.fill('evenodd'); }
  };
  const ledgeL = (a: number, bb: number, z: number, out: number, h: number, top: string, front: string, side: string) => {
    g.globalAlpha = 0.3; poly([P(a + 0.03, j1, z - h), P(bb + 0.05, j1, z - h), P(bb + 0.05, j1, z - h - 4), P(a + 0.03, j1, z - h - 4)], '#000'); g.globalAlpha = 1;
    poly([P(bb, j1, z), P(bb, j1 + out, z), P(bb, j1 + out, z - h), P(bb, j1, z - h)], side);
    quadLy(a, bb, z - h, z, out, front);
    poly([P(a, j1, z), P(bb, j1, z), P(bb, j1 + out, z), P(a, j1 + out, z)], top);
  };
  const ledgeR = (a: number, bb: number, z: number, out: number, h: number, top: string, front: string, side: string) => {
    g.globalAlpha = 0.3; poly([P(i1, a - 0.03, z - h), P(i1, bb - 0.03, z - h), P(i1, bb - 0.03, z - h - 4), P(i1, a - 0.03, z - h - 4)], '#000'); g.globalAlpha = 1;
    poly([P(i1, bb, z), P(i1 + out, bb, z), P(i1 + out, bb, z - h), P(i1, bb, z - h)], side);
    quadRx(a, bb, z - h, z, out, front);
    poly([P(i1, a, z), P(i1, bb, z), P(i1 + out, bb, z), P(i1 + out, a, z)], top);
  };

  const brickL = '#5a2620', brickR = '#401a16', mortar = '#2a100c', stone = '#6a625a', stoneD = '#4a443e', stoneT = '#857c72';
  const gold = '#c9a23e', goldL = '#e8c86a', iron = '#2a2622', candle = '#ffc070', candleD = '#d8823a';
  const slate = '#22201e', slateL = '#2e2c2a', slateD = '#161412';

  // 그림자
  g.globalAlpha = 0.3;
  poly([P(i0 + 0.1, j1 + 0.3, 0), P(i1 + 0.3, j1 + 0.3, 0), P(i1 + 0.3, j0 + 0.1, 0), P(i1, j0, 0), P(i0, j1, 0)], '#000');
  g.globalAlpha = 1;
  // 벽돌 벽 + 줄눈 (어긋난 세로 줄눈)
  quadR(j0, j1, 0, G, brickR); quadL(i0, i1, 0, G, brickL);
  for (let z = 12, row = 0; z < G - 4; z += 5, row++) {
    quadL(i0, i1, z, z + 1, mortar); quadR(j0, j1, z, z + 1, '#200c0a');
    for (let x = i0 + (row % 2 ? 0.12 : 0.24); x < i1; x += 0.24) quadL(x, x + 0.02, z + 1, z + 5, mortar);
    for (let y = j0 + (row % 2 ? 0.12 : 0.24); y < j1; y += 0.24) quadR(y, y + 0.02, z + 1, z + 5, '#200c0a');
  }
  // 돌 받침과 모서리 돌
  quadL(i0, i1, 0, 12, stoneD); quadR(j0, j1, 0, 12, '#3a3430'); quadL(i0, i1, 11, 12.5, stoneT); quadR(j0, j1, 11, 12.5, stone);
  for (let z = 12, k = 0; z < G - 6; z += 8, k++) { const ww = k % 2 ? 0.16 : 0.26; quadL(i1 - ww, i1, z, z + 7, stone); quadR(j1 - ww, j1, z, z + 7, stoneD); }
  // 처마 돌림띠 (두께 있게 튀어나옴)
  ledgeL(i0 - 0.04, i1 + 0.04, G + 1, 0.1, 4, stoneT, stone, stoneD);
  ledgeR(j0 - 0.04, j1 + 0.04, G + 1, 0.1, 4, stoneT, stoneD, stone);

  // 왼쪽 면 가운데: 벽 속으로 들어간 쇠띠 두른 겹문
  const mid = i0 + w / 2 + 0.15;
  const dA = mid - 0.46, dB = mid + 0.46;
  recess('L', rectL(dA, dB, 0, 40), 0.2, '#3a2418', () => {
    for (let x = dA + 0.08; x < dB; x += 0.12) quadL(x, x + 0.015, 0, 40, '#24160e');
    quadL(mid - 0.012, mid + 0.012, 0, 40, '#140a06');
    for (const z of [8, 22, 34]) { quadL(dA, dB, z, z + 2.5, iron); for (let x = dA + 0.06; x < dB; x += 0.14) { const [sx, sy] = P(x, j1, z + 1.2); dot(sx, sy - 1, 2, 2, gold); } }
    for (const x of [mid - 0.16, mid + 0.16]) { const [kx, ky] = P(x, j1, 20); g.strokeStyle = gold; g.lineWidth = 1.4; g.beginPath(); g.arc(kx, ky + 3, 3, 0, Math.PI * 2); g.stroke(); dot(kx - 1, ky - 1, 2, 2, goldL); }
    // 문 아래로 새는 촛불빛
    quadL(dA, dB, 0, 1.5, candleD);
  }, { w: 3.5, out: 0.08, face: stone, side: stoneD });
  // 문 위 쐐기돌
  { const pts = [P(mid - 0.08, j1 + 0.09, 47), P(mid + 0.08, j1 + 0.09, 47), P(mid + 0.06, j1 + 0.09, 43), P(mid - 0.06, j1 + 0.09, 43)]; poly(pts.map(([x, y]) => [x + 1.5, y - 1] as Pt), stoneD); poly(pts, stoneT); }
  ledgeL(dA - 0.16, dB + 0.16, 3, 0.26, 3, stoneT, stone, stoneD); // 돌계단
  // 문 오른쪽 벽의 독촉장 (종이 + 붉은 봉랍)
  for (const [x, z] of [[dB + 0.16, 30], [dB + 0.3, 24], [dB + 0.2, 17]] as [number, number][]) {
    quadL(x, x + 0.11, z, z + 8, '#e2d6b8'); quadL(x + 0.01, x + 0.1, z + 6, z + 7, '#b8a888');
    for (let n = 0; n < 3; n++) quadL(x + 0.015, x + 0.08 - n * 0.015, z + 2 + n * 1.4, z + 2.6 + n * 1.4, '#6a5a48');
    const [sx, sy] = P(x + 0.07, j1, z + 1.5); g.fillStyle = '#a8140e'; g.beginPath(); g.arc(sx, sy, 2.2, 0, Math.PI * 2); g.fill(); dot(sx - 1, sy - 1, 1, 1, '#e8402a');
  }
  // 창: 왼쪽 면 왼쪽 · 오른쪽 면 둘 — 벽 속 촛불빛 창 + 바깥 쇠창살 + 돌 창턱
  const winInner = (face: 'L' | 'R', a: number, bb: number) => () => {
    const q = face === 'L' ? quadL : quadR;
    q(a, bb, 34, 36, '#ffe0a0');
    // 창 너머: 장부 선반 그림자와 촛대
    q(a + (bb - a) * 0.1, bb - (bb - a) * 0.1, 26, 27.5, '#5a2a1a');
    for (let x = a + (bb - a) * 0.14; x < bb - (bb - a) * 0.12; x += (bb - a) * 0.09) q(x, x + (bb - a) * 0.06, 27.5, 33, ['#6a2a1a', '#8a3a22', '#5a1a14'][Math.floor(x * 37) % 3]);
    const cx = (a + bb) / 2;
    q(cx - 0.015, cx + 0.015, 18, 24, '#e8dcc0'); q(cx - 0.012, cx + 0.012, 24, 26.5, '#fff0b0');
  };
  const bars = (face: 'L' | 'R', a: number, bb: number, z0: number, z1: number) => {
    const q = face === 'L' ? (x0: number, x1: number, za: number, zb: number, col: string) => quadLy(x0, x1, za, zb, 0.05, col) : (y0: number, y1: number, za: number, zb: number, col: string) => quadRx(y0, y1, za, zb, 0.05, col);
    for (let k = 1; k < 5; k++) { const x = a + ((bb - a) * k) / 5; q(x - 0.012, x + 0.012, z0, z1, iron); q(x - 0.012, x - 0.004, z0, z1, '#5a5650'); }
    q(a, bb, (z0 + z1) / 2, (z0 + z1) / 2 + 1.5, iron);
  };
  recess('L', rectL(i0 + 0.22, i0 + 0.78, 18, 40), 0.15, candle, winInner('L', i0 + 0.22, i0 + 0.78), { w: 2.5, out: 0.06, face: stone, side: stoneD });
  bars('L', i0 + 0.22, i0 + 0.78, 18, 40);
  ledgeL(i0 + 0.16, i0 + 0.84, 17, 0.12, 3, stoneT, stone, stoneD);
  for (const [a, bb] of [[j0 + 0.28, j0 + 0.86], [j0 + 1.14, j0 + 1.72]] as [number, number][]) {
    recess('R', rectR(a, bb, 18, 40), 0.15, candleD, winInner('R', a, bb), { w: 2.5, out: 0.06, face: stoneD, side: '#34302c' });
    bars('R', a, bb, 18, 40);
    ledgeR(a - 0.06, bb + 0.06, 17, 0.12, 3, stoneT, stoneD, stone);
  }
  // 매단 그림 판: 쇠 팔 + 두께 있는 판 위 동전 더미와 장부 (글자 없음)
  {
    const [ax, ay] = P(i0 + 0.04, j1, G - 6), X = Math.round(ax), Y = Math.round(ay);
    dot(X - 15, Y, 16, 1.5, iron); dot(X - 15, Y - 2, 2, 2, iron);
    for (const dx of [-14, -4]) dot(X + dx, Y + 1, 1, 4, '#5a5650');
    dot(X - 17, Y + 5, 18, 15, '#140a08'); dot(X - 18, Y + 4, 18, 15, '#2a1612'); dot(X - 18, Y + 4, 18, 1, gold); dot(X - 18, Y + 18, 18, 1, gold); dot(X - 18, Y + 4, 1, 15, gold); dot(X - 1, Y + 4, 1, 15, gold);
    for (let k = 0; k < 4; k++) { dot(X - 15, Y + 15 - k * 2, 7, 2, k % 2 ? goldL : gold); } // 동전 더미
    dot(X - 7, Y + 8, 5, 8, '#8a1a14'); dot(X - 7, Y + 8, 1, 8, '#5a0e0a'); dot(X - 6, Y + 10, 3, 1, goldL); // 장부
  }
  // 처마 모서리에 사슬로 매단 동전 추
  for (const [x, y] of [P(i1 + 0.05, j1 + 0.08, G - 3), P(i0 + 0.15, j1 + 0.1, G - 3)]) {
    for (let k = 0; k < 6; k++) dot(x, y + k * 2.5, 1.5, 2, k % 2 ? '#7a7670' : '#5a5650');
    g.fillStyle = '#a8862a'; g.beginPath(); g.arc(x + 1, y + 18, 3.6, 0, Math.PI * 2); g.fill();
    g.fillStyle = goldL; g.beginPath(); g.arc(x + 0.4, y + 17.4, 2.4, 0, Math.PI * 2); g.fill(); dot(x, y + 17, 2, 2, '#5a4214');
  }

  // 지붕: i 방향 용마루의 검은 슬레이트 박공
  const top = G + 1, ov = 0.14, rz = top + 30, jm = (j0 + j1) / 2;
  poly([P(i0 - ov, j0 - ov, top), P(i1 + ov, j0 - ov, top), P(i1 + ov, jm, rz), P(i0 - ov, jm, rz)], slateD);
  poly([P(i1, j0, top), P(i1, j1, top), P(i1, jm, rz - 2)], brickR);
  for (let z = top + 4; z < rz - 4; z += 5) { const t = (z - top) / (rz - top), a = j0 + (jm - j0) * t, bb = j1 - (j1 - jm) * t; quadR(a, bb, z, z + 1, '#200c0a'); }
  { const [ox, oy] = P(i1, jm, top + 12); g.fillStyle = '#140a08'; g.beginPath(); g.arc(ox, oy, 3.5, 0, Math.PI * 2); g.fill(); g.fillStyle = candleD; g.beginPath(); g.arc(ox, oy, 2, 0, Math.PI * 2); g.fill(); }
  poly([P(i0 - ov, jm, rz), P(i1 + ov, jm, rz), P(i1 + ov, j1 + ov, top - 3), P(i0 - ov, j1 + ov, top - 3)], slate);
  // 비늘처럼 겹친 슬레이트 줄
  for (let k = 1; k < 7; k++) {
    const t = k / 7, y = jm + (j1 + ov - jm) * t, z = rz + (top - 3 - rz) * t;
    poly([P(i0 - ov, y - 0.02, z + 1), P(i1 + ov, y - 0.02, z + 1), P(i1 + ov, y + 0.02, z - 1), P(i0 - ov, y + 0.02, z - 1)], slateD);
    for (let x = i0 - ov + (k % 2 ? 0.1 : 0.2); x < i1 + ov; x += 0.2) poly([P(x, y - 0.11, z + 5), P(x + 0.015, y - 0.11, z + 5), P(x + 0.015, y, z), P(x, y, z)], slateD);
    poly([P(i0 - ov, y - 0.03, z + 2), P(i1 + ov, y - 0.03, z + 2), P(i1 + ov, y - 0.02, z + 1.5), P(i0 - ov, y - 0.02, z + 1.5)], slateL);
  }
  poly([P(i0 - ov, j1 + ov - 0.05, top - 2), P(i1 + ov, j1 + ov - 0.05, top - 2), P(i1 + ov, j1 + ov, top - 5), P(i0 - ov, j1 + ov, top - 5)], slateD);
  poly([P(i0 - ov, jm - 0.05, rz + 1.5), P(i1 + ov, jm - 0.05, rz + 1.5), P(i1 + ov, jm + 0.05, rz - 1.5), P(i0 - ov, jm + 0.05, rz - 1.5)], '#3a3634');
  // 굴뚝 (장부 태우는 연기 대신 희미한 붉은 빛)
  { const ci = i0 + 0.5; poly([P(ci, jm - 0.15, rz - 6), P(ci + 0.3, jm - 0.15, rz - 6), P(ci + 0.3, jm - 0.15, rz + 12), P(ci, jm - 0.15, rz + 12)], brickL);
    poly([P(ci + 0.3, jm - 0.15, rz - 8), P(ci + 0.3, jm - 0.45, rz - 8), P(ci + 0.3, jm - 0.45, rz + 12), P(ci + 0.3, jm - 0.15, rz + 12)], brickR);
    poly([P(ci, jm - 0.45, rz + 12), P(ci + 0.3, jm - 0.45, rz + 12), P(ci + 0.3, jm - 0.15, rz + 12), P(ci, jm - 0.15, rz + 12)], '#1a0a08');
    const [sx, sy] = P(ci + 0.15, jm - 0.3, rz + 12); dot(sx - 2, sy - 1, 4, 2, '#8a2a10'); }
  // 용마루 가운데: 가운데 네모 구멍 뚫린 금빛 노전 장식
  {
    const [cx, cy] = P(i0 + w * 0.6, jm, rz + 1);
    dot(cx - 1, cy - 8, 2, 8, iron);
    g.fillStyle = '#8a6a1a'; g.beginPath(); g.arc(cx + 1, cy - 16, 8, 0, Math.PI * 2); g.fill();
    g.fillStyle = gold; g.beginPath(); g.arc(cx, cy - 17, 8, 0, Math.PI * 2); g.fill();
    g.fillStyle = goldL; g.beginPath(); g.arc(cx - 2, cy - 19, 4, 0, Math.PI * 2); g.fill();
    g.strokeStyle = '#8a6a1a'; g.lineWidth = 1; g.beginPath(); g.arc(cx, cy - 17, 6, 0, Math.PI * 2); g.stroke();
    dot(cx - 2, cy - 19, 4, 4, '#140a08');
  }
  // 가장자리를 또렷하게
  const im = g.getImageData(0, 0, W, H);
  const D = im.data;
  for (let k = 3; k < D.length; k += 4) D[k] = D[k] < 110 && D[k] > 80 ? 255 * 0.3 : D[k] < 128 ? (D[k] > 60 ? D[k] : 0) : 255;
  g.putImageData(im, 0, 0);
  return { canvas: c, x: minX, y: minY };
}
