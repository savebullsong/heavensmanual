// 우주새 (Cosmic Bird) — 전 지구·전 우주 어디서나 같은 모양의 작은 2층 애완동물 가게 (바닥 2×2칸)
// 글자 간판은 없다. 남색 회벽, 새장·어항·잠든 고양이가 보이는 진열창, 노랑·흰 줄무늬 천 차양, 어항 벽,
// 문 옆 사료 포대와 바깥 새장, 앵무새 그림 간판, 볏 색 둥근 창, 녹청 지붕, 앵무새 풍향계.
// 현실·지옥 모두 이 그림을 쓰고, 세계의 빛(지옥은 붉은 어둠)만 바뀐다.
import { TW, TH } from './gfx.ts';
import type { Building } from './zone.ts';

export const COSMIC_TOP = 128; // 땅에서 풍향계 끝까지 (px)
const G = 60, U = 34; // 1층 · 2층 높이

type Pt = [number, number];

export function drawCosmicBird(b: Building, night: boolean): { canvas: HTMLCanvasElement; x: number; y: number } {
  const { i0, j0, w, d } = b;
  const i1 = i0 + w, j1 = j0 + d;
  const MX = 18, MT = 20;
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

  // 1층 왼쪽 면: 애완동물 가게 진열창 (매단 새장 · 어항 · 잠든 고양이 · 유리의 발자국 무늬) + 유리문
  const mid = i0 + w / 2;
  const wA = i0 + 0.12, wB = mid - 0.08; // 진열창 구간
  const px = (x: number, z: number) => { const [a, b] = P(x, j1, z); return [Math.round(a), Math.round(b)] as const; };
  const dot = (x: number, y: number, ww: number, hh: number, col: string) => { g.fillStyle = col; g.fillRect(x, y, ww, hh); };
  quadL(wA - 0.04, wB + 0.04, 8, G - 7, trimD);
  quadL(wA, wB, 10, G - 9, night ? '#f2d79a' : '#b9cdd2');
  // 뒤 선반에 작은 우리들
  for (const z of [30, 40]) {
    quadL(wA + 0.02, wB - 0.02, z, z + 1.5, trimD);
    for (let k = 0; k < 4; k++) {
      const x0 = wA + 0.06 + k * 0.2;
      quadL(x0, x0 + 0.14, z + 1.5, z + 7, night ? '#8a6a3a' : '#7a8a8e');
      for (let m = 0; m < 4; m++) quadL(x0 + 0.02 + m * 0.035, x0 + 0.03 + m * 0.035, z + 1.5, z + 7, '#3a3430');
    }
  }
  // 아래: 푸른 어항 (물고기 · 거품)
  quadL(wA + 0.04, wA + 0.5, 11, 23, '#2a3a40');
  quadL(wA + 0.06, wA + 0.48, 12, 21, night ? '#3aa8d8' : '#5ab8d0');
  quadL(wA + 0.06, wA + 0.48, 19.5, 21, night ? '#8adaf2' : '#9ad8e8');
  for (const [fx, fz, fc] of [[0.14, 15, '#ff8a2a'], [0.3, 17, '#ffd23a'], [0.4, 14, '#ff5a3a']] as [number, number, string][]) { const [x, y] = px(wA + fx, fz); dot(x, y, 3, 2, fc); dot(x - 1, y, 1, 2, fc); }
  for (let k = 0; k < 4; k++) { const [x, y] = px(wA + 0.22 + (k % 2) * 0.03, 15 + k * 1.6); dot(x, y, 1, 1, '#e8f8ff'); }
  // 창턱에 잠든 고양이
  { const [x, y] = px(wB - 0.22, 11); dot(x - 4, y - 4, 9, 4, '#e08a3a'); dot(x - 5, y - 6, 4, 3, '#e08a3a'); dot(x - 5, y - 7, 1, 1, '#e08a3a'); dot(x - 3, y - 7, 1, 1, '#e08a3a'); dot(x + 4, y - 3, 3, 2, '#c06a2a'); dot(x - 2, y - 3, 4, 1, '#c06a2a'); }
  // 매단 새장 셋 (흰 유황앵무 · 초록 잉꼬 · 붉은 앵무)
  const cage = (x: number, z: number, body: string, head: string) => {
    const [cx, cy] = px(x, z);
    dot(cx, cy - 12, 1, 4, '#2a2420'); // 줄
    g.strokeStyle = '#d8b04a'; g.lineWidth = 1;
    g.beginPath(); g.moveTo(cx - 5, cy + 7); g.lineTo(cx - 5, cy - 1); g.quadraticCurveTo(cx, cy - 9, cx + 5, cy - 1); g.lineTo(cx + 5, cy + 7); g.stroke();
    for (const dx of [-2, 1]) dot(cx + dx, cy - 4, 1, 11, '#c09a3a');
    dot(cx - 6, cy + 7, 12, 2, '#a07a2a');
    dot(cx - 2, cy + 1, 4, 4, body); dot(cx - 1, cy - 1, 3, 2, head); dot(cx + 1, cy + 5, 2, 2, body);
    dot(cx + 2, cy, 1, 1, '#1a1210');
  };
  cage(wA + 0.18, G - 21, '#f2efe6', '#f2cf3a');
  cage(wA + 0.5, G - 17, '#5ac04a', '#e8e04a');
  cage(wA + 0.78, G - 22, '#d83a2a', '#3a7ad8');
  // 유리의 흰 발자국 무늬
  for (const [fx, fz] of [[0.6, 15], [0.66, 18], [0.72, 15.5]] as [number, number][]) { const [x, y] = px(wA + fx, fz); dot(x, y, 2, 2, '#f8f4ec'); dot(x - 1, y - 2, 1, 1, '#f8f4ec'); dot(x + 1, y - 2, 1, 1, '#f8f4ec'); dot(x + 2, y - 1, 1, 1, '#f8f4ec'); }
  // 진열창 위 줄무늬 천 차양 (노랑·흰)
  for (let k = 0; k < 8; k++) { const x0 = wA - 0.05 + k * ((wB - wA + 0.1) / 8); quadL(x0, x0 + (wB - wA + 0.1) / 8, G - 9, G - 3, k % 2 ? '#f4f0e4' : crest); }
  for (let k = 0; k < 8; k++) { const [x, y] = px(wA - 0.05 + (k + 0.5) * ((wB - wA + 0.1) / 8), G - 9); dot(x - 2, y, 4, 2, k % 2 ? '#f4f0e4' : crest); }
  // 유리문: 나무 틀 + 유리 + 방울 + 손잡이
  const dA = mid + 0.08, dB = mid + 0.62;
  quadL(dA - 0.05, dB + 0.05, 0, 42, trimD);
  quadL(dA, dB, 0, 40, '#6b4429');
  quadL(dA + 0.06, dB - 0.06, 6, 36, lit);
  quadL(dA + 0.06, dB - 0.06, 20, 21.5, '#6b4429');
  quadL(dB - 0.12, dB - 0.08, 16, 20, crest); // 손잡이
  { const [x, y] = px(dA + 0.1, 39); dot(x, y, 1, 3, '#2a2420'); dot(x - 1, y + 3, 3, 3, crest); } // 문 방울
  // 문 위 작은 등
  const [lx, ly] = P(dB + 0.14, j1, 46);
  g.fillStyle = night ? '#ffe7a8' : '#d9c48a';
  g.fillRect(Math.round(lx) - 2, Math.round(ly) - 3, 4, 5);
  if (night) { g.globalAlpha = 0.25; g.fillStyle = '#ffd98a'; g.beginPath(); g.arc(lx, ly, 9, 0, Math.PI * 2); g.fill(); g.globalAlpha = 1; }
  // 1층 오른쪽 면: 어항 벽 (층층이 푸른 수조, 밤엔 더 밝게)
  quadR(j0 + 0.28, j0 + 1.62, 10, G - 9, trimD);
  quadR(j0 + 0.32, j0 + 1.58, 12, G - 11, night ? '#2a8ac0' : '#4aa0c0');
  for (const z of [22, 34]) quadR(j0 + 0.32, j0 + 1.58, z, z + 2, trimD);
  for (let k = 0; k < 3; k++) quadR(j0 + 0.32 + k * 0.42, j0 + 0.34 + k * 0.42, 12, G - 11, trimD);
  for (let k = 0; k < 10; k++) {
    const yy = j0 + 0.4 + ((k * 37) % 11) / 9, zz = 14 + ((k * 13) % 3) * 12 + (k % 2) * 4;
    const [x, y] = P(i1, yy, zz);
    g.fillStyle = ['#ff8a2a', '#ffd23a', '#e8f0ff', '#ff4a8a'][k % 4]; g.fillRect(Math.round(x), Math.round(y), 2, 1);
  }
  // 문 옆: 쌓인 사료 포대와 바깥 새장 받침대
  const sack = (x: number, y: number, col: string) => { dot(x - 5, y - 8, 10, 8, col); dot(x - 4, y - 9, 8, 1, col); dot(x - 2, y - 6, 4, 3, '#f4f0e4'); dot(x - 1, y - 5, 2, 1, '#8a4a2a'); };
  { const [x, y] = P(i1 - 0.2, j1 + 0.18, 0); sack(Math.round(x), Math.round(y), '#c89a4a'); sack(Math.round(x) + 6, Math.round(y) - 2, '#5a8a4a'); sack(Math.round(x) + 3, Math.round(y) - 9, '#c86a3a'); }
  { const [x, y] = P(i0 + 0.05, j1 + 0.25, 0); const X = Math.round(x), Y = Math.round(y);
    dot(X, Y - 22, 1, 22, '#2a2420'); dot(X - 3, Y - 1, 7, 1, '#2a2420');
    g.strokeStyle = '#d8b04a'; g.beginPath(); g.moveTo(X - 5, Y - 22); g.lineTo(X - 5, Y - 29); g.quadraticCurveTo(X, Y - 37, X + 5, Y - 29); g.lineTo(X + 5, Y - 22); g.closePath(); g.stroke();
    dot(X - 2, Y - 29, 4, 4, '#5ac04a'); dot(X - 1, Y - 31, 3, 2, '#e8e04a'); }
  // 매달린 그림 간판: 둥근 판 위 앵무새와 발자국 (글자 없음)
  { const [x, y] = P(i0 + 0.02, j1, G + 6); const X = Math.round(x), Y = Math.round(y);
    dot(X - 12, Y, 13, 1, '#2a2420'); dot(X - 11, Y + 1, 1, 3, '#2a2420'); dot(X - 3, Y + 1, 1, 3, '#2a2420');
    g.fillStyle = trimD; g.beginPath(); g.arc(X - 7, Y + 10, 7, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#f2e6c8'; g.beginPath(); g.arc(X - 7, Y + 10, 5.5, 0, Math.PI * 2); g.fill();
    dot(X - 9, Y + 9, 4, 4, '#f4f1e8'); dot(X - 8, Y + 6, 2, 3, crest); dot(X - 6, Y + 10, 2, 1, '#2a2420'); dot(X - 10, Y + 13, 3, 2, '#c09a6a'); }

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

  // 가장자리를 또렷하게 (반투명 섞임 없이)
  const im = g.getImageData(0, 0, W, H);
  const D = im.data;
  for (let k = 3; k < D.length; k += 4) D[k] = D[k] < 110 && D[k] > 80 ? 255 * 0.28 : D[k] < 128 ? (D[k] > 60 ? D[k] : 0) : 255;
  g.putImageData(im, 0, 0);
  return { canvas: c, x: minX, y: minY };
}
