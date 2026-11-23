// 우주새 (Cosmic Bird) — 전 지구·전 우주 어디서나 같은 모양의 작은 2층 가게 (바닥 2×2칸)
// 간판은 없다. 남색 회벽, 유황앵무 볏 색의 둥근 창, 녹청 지붕, 지붕 위 앵무새 풍향계가 알아보는 표시.
// 현실·지옥 모두 이 그림을 쓰고, 세계의 빛(지옥은 붉은 어둠)만 바뀐다.
import { TW, TH } from './gfx.ts';
import type { Building } from './zone.ts';

export const COSMIC_TOP = 128; // 땅에서 풍향계 끝까지 (px)
const G = 60, U = 34; // 1층 · 2층 높이

type Pt = [number, number];

export function drawCosmicBird(b: Building, night: boolean): { canvas: HTMLCanvasElement; x: number; y: number } {
  const { i0, j0, w, d } = b;
  const i1 = i0 + w, j1 = j0 + d;
  const MX = 8, MT = 20;
  const minX = (i0 - j1) * (TW / 2) - MX;
  const minY = (i0 + j0) * (TH / 2) - COSMIC_TOP - MT;
  const W = (w + d) * (TW / 2) + MX * 2, H = (w + d) * (TH / 2) + COSMIC_TOP + MT + 6;
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const g = c.getContext('2d')!;
  const P = (x: number, y: number, z: number): Pt => [(x - y) * (TW / 2) - minX, (x + y) * (TH / 2) - z - minY];
  const poly = (pts: Pt[], fill: string) => {
    g.beginPath();
    g.moveTo(pts[0][0], pts[0][1]);
    for (const p of pts.slice(1)) g.lineTo(p[0], p[1]);
    g.closePath();
    g.fillStyle = fill;
    g.fill();
  };
  // 왼쪽 면(y = j1, 간판 면 = 문) 위의 사각형: x 구간 a..b, 높이 z0..z1
  const quadL = (a: number, bb: number, z0: number, z1: number, fill: string) => poly([P(a, j1, z0), P(bb, j1, z0), P(bb, j1, z1), P(a, j1, z1)], fill);
  // 오른쪽 면(x = i1)
  const quadR = (a: number, bb: number, z0: number, z1: number, fill: string) => poly([P(i1, a, z0), P(i1, bb, z0), P(i1, bb, z1), P(i1, a, z1)], fill);

  const wallL = '#34495a', wallR = '#26364a', band = '#1c2733', trim = '#5a3a26', trimD = '#3e2718';
  const lit = night ? '#ffd98a' : '#9fb9c6', litR = night ? '#f2c46a' : '#7f98a8';
  const crest = '#f2cf3a', roofA = '#4f8a78', roofB = '#3a6c5e', roofC = '#2c5448';
  const top = G + U;

  // 그림자
  g.globalAlpha = 0.28;
  poly([P(i0 + 0.1, j1 + 0.25, 0), P(i1 + 0.25, j1 + 0.25, 0), P(i1 + 0.25, j0 + 0.1, 0), P(i1, j0, 0), P(i0, j1, 0)], '#000');
  g.globalAlpha = 1;

  // 벽 (오른쪽 면 → 왼쪽 면)
  quadR(j0, j1, 0, top, wallR);
  quadL(i0, i1, 0, top, wallL);
  // 아래 띠와 층 사이 나무 띠
  quadR(j0, j1, 0, 8, band); quadL(i0, i1, 0, 8, band);
  quadR(j0, j1, G - 4, G + 1, trimD); quadL(i0, i1, G - 4, G + 1, trim);
  quadR(j0, j1, top - 3, top, trimD); quadL(i0, i1, top - 3, top, trim);
  // 모서리 기둥
  poly([P(i1 - 0.06, j1, 0), P(i1, j1, 0), P(i1, j1, top), P(i1 - 0.06, j1, top)], trim);
  poly([P(i1, j1, 0), P(i1, j1 - 0.06, 0), P(i1, j1 - 0.06, top), P(i1, j1, top)], trimD);

  // 1층 왼쪽 면: 진열창 + 둥근 문
  const mid = i0 + w / 2;
  quadL(i0 + 0.15, mid - 0.25, 14, G - 12, trimD);
  quadL(i0 + 0.2, mid - 0.3, 16, G - 14, lit);
  for (const z of [26, 36]) quadL(i0 + 0.2, mid - 0.3, z, z + 1.5, trimD); // 진열 선반
  if (night) for (let k = 0; k < 6; k++) { const x = i0 + 0.3 + k * 0.1; quadL(x, x + 0.05, 27.5, 31 + (k % 3), '#c0603a'); }
  // 문: 나무 문 + 반원 머리 + 작은 창
  const dA = mid - 0.05, dB = mid + 0.55;
  quadL(dA - 0.05, dB + 0.05, 0, 40, trimD);
  quadL(dA, dB, 0, 38, '#6b4429');
  for (let k = 0; k <= 8; k++) {
    // 반원 머리 (조각으로)
    const t0 = (k / 8) * Math.PI, t1 = ((k + 1) / 8) * Math.PI;
    if (k === 8) break;
    const cxm = (dA + dB) / 2, r = (dB - dA) / 2;
    poly([P(cxm, j1, 38), P(cxm - Math.cos(t0) * r, j1, 38 + Math.sin(t0) * 9), P(cxm - Math.cos(t1) * r, j1, 38 + Math.sin(t1) * 9)], '#6b4429');
  }
  quadL(dA + 0.15, dB - 0.15, 24, 34, lit);
  quadL(dB - 0.14, dB - 0.1, 16, 19, crest); // 손잡이
  // 문 위 작은 등
  const [lx, ly] = P(dB + 0.12, j1, 44);
  g.fillStyle = night ? '#ffe7a8' : '#d9c48a';
  g.fillRect(Math.round(lx) - 2, Math.round(ly) - 3, 4, 5);
  if (night) { g.globalAlpha = 0.25; g.fillStyle = '#ffd98a'; g.beginPath(); g.arc(lx, ly, 9, 0, Math.PI * 2); g.fill(); g.globalAlpha = 1; }
  // 1층 오른쪽 면: 덧문 달린 작은 창
  quadR(j0 + 0.6, j0 + 1.3, 22, G - 14, trimD);
  quadR(j0 + 0.65, j0 + 1.25, 24, G - 16, litR);
  quadR(j0 + 0.45, j0 + 0.62, 22, G - 14, '#3f5a4a'); quadR(j0 + 1.33, j0 + 1.5, 22, G - 14, '#3f5a4a');

  // 2층 왼쪽 면: 볏 색 테의 둥근 창 (이 가게를 알아보는 표시)
  const [ox, oy] = P(mid, j1, G + U / 2);
  g.fillStyle = crest; g.beginPath(); g.ellipse(ox, oy, 9, 9, 0, 0, Math.PI * 2); g.fill();
  g.fillStyle = trimD; g.beginPath(); g.ellipse(ox, oy, 7, 7, 0, 0, Math.PI * 2); g.fill();
  g.fillStyle = lit; g.beginPath(); g.ellipse(ox, oy, 6, 6, 0, 0, Math.PI * 2); g.fill();
  g.fillStyle = trimD; g.fillRect(Math.round(ox) - 6, Math.round(oy), 12, 1); g.fillRect(Math.round(ox), Math.round(oy) - 6, 1, 12);
  // 2층 오른쪽 면: 좁은 창
  quadR(j0 + 0.75, j0 + 1.2, G + 8, top - 8, trimD);
  quadR(j0 + 0.8, j0 + 1.15, G + 10, top - 10, litR);

  // 지붕: i 방향 용마루의 박공 지붕 (녹청)
  const ov = 0.12, rz = top + 26;
  const jm = (j0 + j1) / 2;
  // 뒤쪽 경사 (j0 쪽) — 일부만 보인다
  poly([P(i0 - ov, j0 - ov, top), P(i1 + ov, j0 - ov, top), P(i1 + ov, jm, rz), P(i0 - ov, jm, rz)], roofC);
  // 박공 벽 (오른쪽 면 위 삼각형)
  poly([P(i1, j0, top), P(i1, j1, top), P(i1, jm, rz - 2)], wallR);
  const [gx, gy] = P(i1, jm, top + 9);
  g.fillStyle = crest; g.fillRect(Math.round(gx) - 1, Math.round(gy) - 1, 3, 3);
  // 앞쪽 경사 (j1 쪽)
  poly([P(i0 - ov, jm, rz), P(i1 + ov, jm, rz), P(i1 + ov, j1 + ov, top - 2), P(i0 - ov, j1 + ov, top - 2)], roofA);
  for (let k = 1; k < 6; k++) { const x = i0 - ov + ((i1 - i0 + 2 * ov) * k) / 6; poly([P(x - 0.02, jm, rz), P(x + 0.02, jm, rz), P(x + 0.02, j1 + ov, top - 2), P(x - 0.02, j1 + ov, top - 2)], roofB); }
  poly([P(i0 - ov, j1 + ov - 0.05, top - 1), P(i1 + ov, j1 + ov - 0.05, top - 1), P(i1 + ov, j1 + ov, top - 4), P(i0 - ov, j1 + ov, top - 4)], roofC);
  // 용마루
  poly([P(i0 - ov, jm - 0.04, rz + 1), P(i1 + ov, jm - 0.04, rz + 1), P(i1 + ov, jm + 0.04, rz - 1), P(i0 - ov, jm + 0.04, rz - 1)], '#6fa896');

  // 풍향계: 막대 위의 유황앵무 (흰 몸 · 노란 볏)
  const [vx, vy] = P(i0 + w * 0.7, jm, rz);
  g.fillStyle = '#2a2420'; g.fillRect(Math.round(vx), Math.round(vy) - 20, 1, 20);
  g.fillRect(Math.round(vx) - 4, Math.round(vy) - 12, 9, 1);
  const bx = Math.round(vx) - 3, by = Math.round(vy) - 27;
  g.fillStyle = '#f4f1e8';
  g.fillRect(bx + 1, by + 2, 6, 4); g.fillRect(bx + 2, by + 1, 3, 1); g.fillRect(bx + 5, by + 6, 3, 2); g.fillRect(bx, by + 3, 1, 2);
  g.fillStyle = '#2a2420'; g.fillRect(bx, by + 2, 1, 1); g.fillRect(bx + 2, by + 2, 1, 1);
  g.fillStyle = crest; g.fillRect(bx + 3, by - 2, 2, 3); g.fillRect(bx + 4, by - 3, 2, 2);

  // 문 옆 화분
  const [px, py] = P(i1 - 0.15, j1 + 0.15, 0);
  g.fillStyle = '#8a4a2a'; g.fillRect(Math.round(px) - 3, Math.round(py) - 6, 6, 6);
  g.fillStyle = '#4f7a3a'; g.beginPath(); g.ellipse(px, py - 10, 5, 5, 0, 0, Math.PI * 2); g.fill();
  g.fillStyle = '#6b9a4a'; g.fillRect(Math.round(px) - 2, Math.round(py) - 14, 2, 3);

  // 가장자리를 또렷하게 (반투명 섞임 없이)
  const im = g.getImageData(0, 0, W, H);
  const D = im.data;
  for (let k = 3; k < D.length; k += 4) D[k] = D[k] < 110 && D[k] > 80 ? 255 * 0.28 : D[k] < 128 ? (D[k] > 60 ? D[k] : 0) : 255;
  g.putImageData(im, 0, 0);
  return { canvas: c, x: minX, y: minY };
}
