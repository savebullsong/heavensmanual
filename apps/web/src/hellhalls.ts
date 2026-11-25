// 지옥 마을의 공공 건물 (1배 점 그림)
// · 지옥 은행: 두꺼운 돌 금고 건물, 돌 아치 문틀 속 쇠띠 두 짝 나무문(17차), 문 위의 큰 노전 문장, 창살 창, 문 옆 돌화로
// · 속죄의 회당: 좁고 높은 돌 회당, 종탑 박공의 종, 금 간 후광 표시, 문 앞 촛불과 무릎 돌
// · 환생 로비 입구(1층 불탄 도시 골목 끝): 폐허 사이에 홀로 멀쩡한 현대식 건물, 흰 빛이 새는 유리문
// 층마다 돌 색이 다르다 (1층 그을린 회색 · 2층 이끼 낀 녹회색 · 3층 붉은 갈색) — 깊을수록 금 가고 지저분하다
import { TW, TH } from './gfx.ts';
import type { Building } from './zone.ts';

type Pt = [number, number];
const hash = (a: number, b: number, c = 0) => { let h = (a * 374761393 + b * 668265263 + c * 1274126177) | 0; h = (h ^ (h >>> 13)) * 1274126177; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
function shade(hex: string, k: number) {
  const n = parseInt(hex.slice(1), 16);
  const f = (v: number) => Math.max(0, Math.min(255, Math.round(v * k))).toString(16).padStart(2, '0');
  return `#${f(n >> 16)}${f((n >> 8) & 255)}${f(n & 255)}`;
}
const STONE: Record<number, string> = { 1: '#5a5652', 2: '#4a5244', 3: '#5a3e36', 4: '#3e3a38' }; // 24차 4층: 그을린 쇳빛 돌

function cv(b: Building, top: number, pad = 12) {
  const { i0, j0, w, d } = b;
  const minX = (i0 - (j0 + d)) * (TW / 2) - pad, minY = (i0 + j0) * (TH / 2) - top - pad;
  const W = (w + d) * (TW / 2) + pad * 2, H = (w + d) * (TH / 2) + top + pad * 2;
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const g = c.getContext('2d')!;
  const P = (x: number, y: number, z: number): Pt => [(x - y) * (TW / 2) - minX, (x + y) * (TH / 2) - z - minY];
  const poly = (pts: Pt[], fill: string, a = 1) => { g.globalAlpha = a; g.beginPath(); g.moveTo(pts[0][0], pts[0][1]); for (const p of pts.slice(1)) g.lineTo(p[0], p[1]); g.closePath(); g.fillStyle = fill; g.fill(); g.globalAlpha = 1; };
  const R = (x: number, y: number, w2: number, h2: number, col: string, a = 1) => { g.globalAlpha = a; g.fillStyle = col; g.fillRect(Math.round(x), Math.round(y), Math.max(1, Math.round(w2)), Math.max(1, Math.round(h2))); g.globalAlpha = 1; };
  const line = (a: Pt, bb: Pt, wd: number, col: string) => { g.strokeStyle = col; g.lineWidth = wd; g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(bb[0], bb[1]); g.stroke(); };
  const i1 = i0 + w, j1 = j0 + d;
  const qL = (a: number, bb: number, z0: number, z1: number, col: string, al = 1, dd = 0) => poly([P(a, j1 + dd, z0), P(bb, j1 + dd, z0), P(bb, j1 + dd, z1), P(a, j1 + dd, z1)], col, al);
  const qR = (a: number, bb: number, z0: number, z1: number, col: string, al = 1, dd = 0) => poly([P(i1 + dd, a, z0), P(i1 + dd, bb, z0), P(i1 + dd, bb, z1), P(i1 + dd, a, z1)], col, al);
  /** 벽 두 면을 점마다 칠한다 (돌·얼룩) */
  const walls = (Hw: number, col: (face: number, u: number, z: number) => string) => {
    for (let k = 0; k < w * (TW / 2); k++) { const [sx, sy] = P(i0 + k / (TW / 2), j1, 0); for (let z = 0; z < Hw; z++) R(sx, sy - z - 1, 1, 1, col(0, k, z)); }
    for (let k = 0; k < d * (TW / 2); k++) { const [sx, sy] = P(i1, j1 - k / (TW / 2), 0); for (let z = 0; z < Hw; z++) R(sx, sy - z - 1, 1, 1, col(1, k, z)); }
  };
  const finish = () => {
    const im = g.getImageData(0, 0, W, H), D = im.data;
    for (let k = 3; k < D.length; k += 4) D[k] = D[k] < 120 ? 0 : 255;
    g.putImageData(im, 0, 0);
    return { canvas: c, x: minX, y: minY };
  };
  return { c, g, P, poly, R, line, qL, qR, walls, finish, i0, j0, i1, j1, w, d };
}

/** 돌 벽돌 무늬 + 층 색 + 얼룩 */
function stoneWall(floor: number, seed: number, Hw: number) {
  const base = STONE[floor] ?? STONE[1];
  return (face: number, u: number, z: number) => {
    const row = Math.floor(z / 7), off = (row % 2) * 7;
    const brick = Math.floor((u + off) / 14), mortar = z % 7 === 0 || (u + off) % 14 === 0;
    const n = hash(brick, row, seed + face);
    let c = mortar ? '#18140f' : shade(base, (face ? 0.66 : 1) * (0.84 + n * 0.28));
    if (floor === 1 && z > Hw - 12 && hash(u >> 1, z >> 1, seed) < 0.5) c = '#22201e'; // 그을음
    if (floor === 2 && z < 12 && hash(u >> 1, z >> 1, seed) < 0.5) c = face ? '#2e3a1c' : '#3e4a26'; // 이끼
    if (floor === 3 && hash(u >> 2, z >> 2, seed + 9) < 0.06) c = '#5a0e0a'; // 핏자국
    if (floor >= 2 && hash(u, z, seed + 3) < 0.012 * floor) c = '#0c0a08'; // 금
    return c;
  };
}

/** 지옥 은행 */
export function drawHellBank(b: Building, floor: number) {
  const Hw = b.h;
  const k = cv(b, Hw + 22);
  const { g, P, poly, R, line, qL, qR, walls, finish, i0, j0, i1, j1, w, d } = k;
  const seed = i0 * 31 + j0 * 17;
  walls(Hw, stoneWall(floor, seed, Hw));
  // 아래 굽돌 (두껍게)
  qL(i0, i1, 0, 6, shade(STONE[floor], 0.55)); qR(j0, j1, 0, 6, shade(STONE[floor], 0.42));
  // 모서리 기둥 둘 (앞면 양 끝)
  for (const x of [i0 + 0.08, i1 - 0.22]) { qL(x, x + 0.14, 0, Hw, shade(STONE[floor], 1.15)); qL(x + 0.1, x + 0.14, 0, Hw, shade(STONE[floor], 0.7)); }
  // 17차 새 문: 두꺼운 돌 아치 문틀(쐐기돌) 안에 쇠띠를 두른 두 짝 나무문. 가운데 틈으로 등불 빛이 새고,
  // 문짝마다 큰 쇠고리, 아치 안쪽 위에는 반쯤 올린 쇠살문의 이빨이 걸려 있다
  const m = i0 + w / 2;
  const stoneL = shade(STONE[floor], 1.5), stoneD = shade(STONE[floor], 0.55);
  const arch = (half: number, z0: number, rise: number, dd: number): Pt[] => {
    const pts: Pt[] = [];
    for (let a = 0; a <= 14; a++) { const t = a / 14; pts.push(P(m - half + t * half * 2, j1 + dd, z0 + Math.sin(t * Math.PI) * rise)); }
    return pts;
  };
  // 문틀: 바깥 돌 테 (벽에서 살짝 튀어나온다) → 그늘 → 어두운 문 구멍
  poly([P(m + 0.72, j1 + 0.07, 0), P(m - 0.72, j1 + 0.07, 0), ...arch(0.72, 34, 13, 0.07)], '#100c0a'); // 문틀 그림자 테
  poly([P(m + 0.66, j1 + 0.06, 0), P(m - 0.66, j1 + 0.06, 0), ...arch(0.66, 33, 12, 0.06)], stoneL);
  for (let t = 0; t < 8; t++) { const z = 4 + t * 4; qL(m - 0.66, m - 0.5, z, z + 1, stoneD, 1, 0.06); qL(m + 0.5, m + 0.66, z, z + 1, stoneD, 1, 0.06); } // 돌 이음매
  for (let a = 1; a < 7; a++) { const t = a / 7; line(P(m - 0.66 + t * 1.32, j1 + 0.065, 33 + Math.sin(t * Math.PI) * 12), P(m - 0.5 + t * 1.0, j1 + 0.065, 31 + Math.sin(t * Math.PI) * 10), 1, stoneD); } // 아치 돌 이음
  poly([P(m + 0.5, j1 + 0.04, 0), P(m - 0.5, j1 + 0.04, 0), ...arch(0.5, 31, 10, 0.04)], '#0c0806');
  // 쐐기돌 (아치 꼭대기)
  { const [kx, ky] = P(m, j1 + 0.07, 42); poly([[kx - 4, ky - 1], [kx + 4, ky - 1], [kx + 3, ky + 6], [kx - 3, ky + 6]], shade(STONE[floor], 1.35)); R(kx - 1, ky + 1, 2, 3, '#c9a23e'); }
  // 두 짝 나무문 (판자 결 · 쇠띠 · 징)
  const wood = floor === 2 ? '#3a3424' : floor === 3 ? '#4a1e16' : '#3a2a1e';
  for (const [a0, a1] of [[m - 0.46, m - 0.02], [m + 0.02, m + 0.46]] as [number, number][]) {
    poly([P(a1, j1 + 0.03, 0), P(a0, j1 + 0.03, 0), ...arch(0.46, 29, 9, 0.03).filter(([x]) => { const [xa] = P(a0, j1 + 0.03, 0), [xb] = P(a1, j1 + 0.03, 0); return x >= Math.min(xa, xb) - 0.5 && x <= Math.max(xa, xb) + 0.5; })], wood);
    for (let t = 1; t < 4; t++) { const x = a0 + ((a1 - a0) * t) / 4; qL(x, x + 0.012, 0, 28, shade(wood, 0.6), 1, 0.03); }
    for (const z of [6, 17, 26]) { qL(a0, a1, z, z + 2, '#2a2826', 1, 0.035); for (let t = 0; t < 4; t++) { const [sx, sy] = P(a0 + 0.05 + t * ((a1 - a0 - 0.1) / 3), j1 + 0.04, z + 1); R(sx, sy - 1, 1, 1, '#9a968e'); } }
  }
  qL(m - 0.02, m + 0.02, 0, 30, '#ffb04a', 0.9, 0.03); // 가운데 틈의 빛
  for (const x of [m - 0.16, m + 0.16]) { const [rx, ry] = P(x, j1 + 0.05, 15); g.strokeStyle = '#b08a3a'; g.lineWidth = 1.2; g.beginPath(); g.ellipse(rx, ry + 2, 2.2, 2.8, 0, 0, Math.PI * 2); g.stroke(); R(rx - 1, ry - 2, 2, 2, '#5a4a2a'); } // 쇠고리
  // 반쯤 올린 쇠살문의 이빨
  for (let t = 0; t < 9; t++) { const x = m - 0.42 + t * 0.105; qL(x, x + 0.025, 29 + Math.sin((t / 8) * Math.PI) * 6, 34 + Math.sin((t / 8) * Math.PI) * 8, '#3a3836', 1, 0.045); }
  // 문 양옆 돌화로 (층마다 불빛이 다르다)
  for (const x of [m - 0.78, m + 0.68]) {
    poly([P(x, j1 + 0.25, 10), P(x + 0.12, j1 + 0.25, 10), P(x + 0.12, j1 + 0.25, 0), P(x, j1 + 0.25, 0)], stoneD);
    const [fx, fy] = P(x + 0.06, j1 + 0.25, 10);
    R(fx - 3, fy - 2, 7, 2, shade(STONE[floor], 0.9));
    R(fx - 2, fy - 5, 5, 3, floor === 2 ? '#8ad06a' : floor === 3 ? '#ff4a2a' : '#ff9a3a'); R(fx - 1, fy - 7, 3, 2, floor === 2 ? '#c8f08a' : '#ffd27a');
  }
  // 문 위 큰 노전 문장 (가운데 네모 구멍)
  { const [ex, ey] = P(m, j1 + 0.01, Hw - 10);
    g.fillStyle = '#8a6a2a'; g.beginPath(); g.ellipse(ex, ey, 9, 7, 0, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#d9a83a'; g.beginPath(); g.ellipse(ex, ey - 0.5, 7.5, 5.8, 0, 0, Math.PI * 2); g.fill();
    R(ex - 2, ey - 2, 4, 3, '#2a1a0c'); R(ex - 6, ey - 4, 2, 1, '#f2d27a'); }
  // 창살 창: 앞면 양옆 · 오른쪽 면 둘
  const barWin = (face: 'L' | 'R', a: number) => {
    const q = face === 'L' ? qL : qR;
    q(a, a + 0.36, 26, 38, '#14100c'); q(a + 0.03, a + 0.33, 27, 37, floor === 3 ? '#5a2010' : '#e8a24a', 0.8);
    for (let t = 0; t <= 3; t++) q(a + t * 0.11, a + t * 0.11 + 0.03, 26, 38, '#6a6660');
  };
  barWin('L', i0 + 0.35); barWin('L', i1 - 0.7);
  for (let t = 0; t < Math.max(1, Math.floor(d)); t++) barWin('R', j0 + 0.3 + t * (d / Math.max(1, Math.floor(d))));
  // 평평한 지붕 + 톱니 난간
  poly([P(i0, j0, Hw), P(i1, j0, Hw), P(i1, j1, Hw), P(i0, j1, Hw)], shade(STONE[floor], 0.5));
  for (let t = 0; t < w * 4; t += 2) qL(i0 + t / 4, i0 + (t + 1) / 4, Hw, Hw + 6, shade(STONE[floor], 0.9));
  for (let t = 0; t < d * 4; t += 2) qR(j1 - (t + 1) / 4, j1 - t / 4, Hw, Hw + 6, shade(STONE[floor], 0.65));
  // 문 옆 등불
  { const [lx, ly] = P(i1 - 0.35, j1 + 0.05, 30); R(lx - 1, ly, 2, 6, '#2a1a10'); R(lx - 2, ly - 5, 5, 5, '#2a2018'); R(lx - 1, ly - 4, 3, 3, '#ffb04a'); }
  // 깊은 층: 금 간 벽과 기운 간판 대신 덧댄 판자
  if (floor >= 2) for (let t = 0; t < 3; t++) { const [sx, sy] = P(i0 + 0.2 + hash(t, 1, seed) * (w - 0.4), j1, 10 + hash(t, 2, seed) * (Hw - 20)); let p: Pt = [sx, sy]; for (let s2 = 0; s2 < 5; s2++) { const q2: Pt = [p[0] + (hash(t, s2, seed) - 0.5) * 5, p[1] + 3]; line(p, q2, 1, '#0c0806'); p = q2; } }
  if (floor === 3) { qL(i0 + 0.3, i0 + 1.1, 44, 48, '#4a3424'); qL(i0 + 0.2, i0 + 1.0, 40, 44, '#3a2818'); }
  return finish();
}

/** 속죄의 회당 */
export function drawAtone(b: Building, floor: number) {
  const Hw = b.h;
  const rise = 26;
  const k = cv(b, Hw + rise + 26);
  const { g, P, poly, R, line, qL, qR, walls, finish, i0, j0, i1, j1, w, d } = k;
  const seed = i0 * 41 + j0 * 23;
  walls(Hw, stoneWall(floor, seed + 5, Hw));
  qL(i0, i1, 0, 5, shade(STONE[floor], 0.5)); qR(j0, j1, 0, 5, shade(STONE[floor], 0.4));
  // 버팀 기둥 (오른쪽 면)
  for (let t = 0; t <= d; t++) { const y = j0 + t * (d / Math.max(1, d)); qR(Math.max(j0, y - 0.08), Math.min(j1, y + 0.08), 0, Hw - 6, shade(STONE[floor], 0.85), 1, 0.06); }
  // 뾰족 아치 문 (앞면 가운데): 안에서 새는 창백한 빛
  const m = i0 + w / 2;
  const door: Pt[] = [];
  for (let a = 0; a <= 16; a++) { const t = a / 16; const x = m - 0.42 + t * 0.84; const z = t < 0.5 ? 30 + Math.sin(t * Math.PI) * 14 : 30 + Math.sin(t * Math.PI) * 14; door.push(P(x, j1, Math.min(44, z + (0.5 - Math.abs(t - 0.5)) * 10))); }
  poly([P(m + 0.42, j1, 0), P(m - 0.42, j1, 0), ...door], '#14100c');
  const inner = door.map(([x, y], n) => [x + (n < 8 ? 1.5 : -1.5), y + 2] as Pt);
  poly([P(m + 0.34, j1, 0), P(m - 0.34, j1, 0), ...inner], floor === 3 ? '#c8a898' : '#e8e0cc');
  qL(m - 0.06, m + 0.06, 0, 38, '#3a2a20'); // 문 가운데 기둥
  // 금 간 후광 (문 위 둥근 고리, 한쪽이 깨져 있다)
  { const [hx, hy] = P(m, j1 + 0.01, Hw - 4);
    g.strokeStyle = '#c9a23e'; g.lineWidth = 2; g.beginPath(); g.ellipse(hx, hy, 9, 6, 0, 0.5, Math.PI * 2 - 0.2); g.stroke();
    g.strokeStyle = '#0c0806'; g.lineWidth = 1; g.beginPath(); g.moveTo(hx + 7, hy - 5); g.lineTo(hx + 4, hy - 1); g.lineTo(hx + 6, hy + 2); g.stroke(); }
  // 좁고 긴 창 (오른쪽 면)
  for (let t = 0; t < d; t++) { const y = j0 + 0.35 + t; qR(y, y + 0.3, 20, 48, '#14100c'); qR(y + 0.04, y + 0.26, 22, 46, floor === 2 ? '#6a8a6a' : '#b8b0d8', 0.7); }
  // 박공 지붕 (i 방향 용마루) + 종탑
  const jm = (j0 + j1) / 2, ov = 0.12, rz = Hw + rise;
  const roofC = floor === 2 ? '#2e3624' : floor === 3 ? '#3a1a14' : '#2a2624';
  poly([P(i0 - ov, j0 - ov, Hw), P(i1 + ov, j0 - ov, Hw), P(i1 + ov, jm, rz), P(i0 - ov, jm, rz)], shade(roofC, 0.8));
  poly([P(i1, j0, Hw), P(i1, j1, Hw), P(i1, jm, rz - 2)], shade(STONE[floor], 0.6));
  poly([P(i0 - ov, jm, rz), P(i1 + ov, jm, rz), P(i1 + ov, j1 + ov, Hw - 2), P(i0 - ov, j1 + ov, Hw - 2)], roofC);
  for (let t = 1; t < w * 3; t++) { const x = i0 - ov + t / 3; line(P(x, jm, rz), P(x, j1 + ov, Hw - 2), 1, shade(roofC, 0.7)); }
  // 깊은 층: 지붕 구멍
  if (floor >= 2) for (let t = 0; t < floor - 1; t++) { const [hx, hy] = P(i0 + 0.5 + t * 0.9, jm + 0.4, rz - 10); g.fillStyle = '#0a0806'; g.beginPath(); g.ellipse(hx, hy, 4, 2.5, 0.4, 0, Math.PI * 2); g.fill(); }
  // 종탑: 용마루 끝 작은 아치와 종
  { const [bx, by] = P(i0 + 0.3, jm, rz); R(bx - 6, by - 18, 12, 18, shade(STONE[floor], 0.9)); R(bx - 4, by - 15, 8, 11, '#0c0806'); R(bx - 2, by - 13, 5, 6, '#8a6a2a'); R(bx - 3, by - 8, 7, 2, '#a8823a'); R(bx - 7, by - 20, 14, 3, shade(STONE[floor], 0.7)); }
  // 문 앞: 무릎 꿇는 돌 둘, 촛불, 늘어진 사슬
  for (const x of [m - 0.7, m + 0.45]) { poly([P(x, j1 + 0.15, 3), P(x + 0.25, j1 + 0.15, 3), P(x + 0.25, j1 + 0.4, 0), P(x, j1 + 0.4, 0)], shade(STONE[floor], 0.7)); }
  for (let t = 0; t < 5; t++) { const [x, y] = P(i0 + 0.15 + t * 0.12, j1 + 0.15, 0); R(x, y - 5, 1, 5, '#efe6d0'); R(x, y - 7, 1, 2, '#ffc04a'); }
  for (const x of [i0 + 0.12, i1 - 0.15]) { const [sx, sy] = P(x, j1 + 0.02, Hw - 8); for (let t = 0; t < 7; t++) R(sx + (t % 2), sy + t * 3, 2, 2, '#5a5650'); }
  void R;
  return finish();
}

/** 환생 로비 입구: 불탄 도시에서 홀로 멀쩡한 현대식 건물 (밝은 콘크리트, 세로 유리창, 흰 빛의 유리문, 둥근 화살 표시) */
export function drawRebirthGate(b: Building) {
  const Hw = b.h;
  const k = cv(b, Hw + 10, 18);
  const { g, P, poly, R, qL, qR, walls, finish, i0, j0, i1, j1, w, d } = k;
  const seed = i0 * 13 + j0 * 7;
  walls(Hw, (face, u, z) => {
    const panel = z % 24 === 0 || u % 24 === 0;
    let c = panel ? (face ? '#8a8c90' : '#a8aab0') : face ? '#9a9ca2' : '#c4c6cc';
    if (z < 14 && hash(u >> 2, z >> 2, seed) < 0.22) c = '#5a5856'; // 아래쪽 재와 그을음
    return c;
  });
  // 세로 띠 유리창 (위층마다 흰 빛)
  for (let t = 0; t < w * 2; t++) { const a = i0 + 0.2 + t * 0.5; if (Math.abs(a + 0.15 - (i0 + w / 2)) < 0.9) continue; qL(a, a + 0.3, 30, Hw - 8, '#20262e'); qL(a + 0.03, a + 0.27, 32, Hw - 10, '#d8e8f2', 0.85); }
  for (let t = 0; t < d * 2; t++) { const a = j0 + 0.2 + t * 0.5; qR(a, a + 0.3, 30, Hw - 8, '#1a1e24'); qR(a + 0.03, a + 0.27, 32, Hw - 10, '#a8c0d0', 0.75); }
  // 차양 (얇은 콘크리트 판이 앞으로 튀어나옴)
  const m = i0 + w / 2;
  poly([P(m - 1.3, j1, 30), P(m + 1.3, j1, 30), P(m + 1.3, j1 + 0.5, 30), P(m - 1.3, j1 + 0.5, 30)], '#dcdee2');
  poly([P(m - 1.3, j1 + 0.5, 30), P(m + 1.3, j1 + 0.5, 30), P(m + 1.3, j1 + 0.5, 27), P(m - 1.3, j1 + 0.5, 27)], '#8a8c90');
  // 유리문: 안에서 쏟아지는 흰 빛
  qL(m - 0.9, m + 0.9, 0, 27, '#2a3038');
  qL(m - 0.82, m + 0.82, 0, 25, '#f6f8fa');
  for (const x of [m - 0.42, m, m + 0.42]) qL(x - 0.02, x + 0.02, 0, 25, '#9aa4ae');
  // 바닥에 번진 빛
  g.globalAlpha = 0.35; g.fillStyle = '#f2f6ff'; { const [x, y] = P(m, j1 + 0.6, 0); g.beginPath(); g.ellipse(x, y, 34, 10, 0, 0, Math.PI * 2); g.fill(); } g.globalAlpha = 1;
  // 둥근 화살 표시 (돌고 돌아 다시 태어남) — 문 위 흰 원판
  { const [sx, sy] = P(m, j1 + 0.01, Hw - 18);
    g.fillStyle = '#f4f6f8'; g.beginPath(); g.ellipse(sx, sy, 10, 8, 0, 0, Math.PI * 2); g.fill();
    g.strokeStyle = '#3a4a5a'; g.lineWidth = 2; g.beginPath(); g.ellipse(sx, sy, 6, 4.6, 0, 0.6, Math.PI * 2 - 0.3); g.stroke();
    R(sx + 4, sy - 5, 3, 2, '#3a4a5a'); R(sx + 5, sy - 3, 2, 2, '#3a4a5a'); }
  // 옥상 가장자리
  poly([P(i0, j0, Hw), P(i1, j0, Hw), P(i1, j1, Hw), P(i0, j1, Hw)], '#7a7c80');
  qL(i0, i1, Hw, Hw + 4, '#d0d2d6'); qR(j0, j1, Hw, Hw + 4, '#9a9ca0');
  return finish();
}
