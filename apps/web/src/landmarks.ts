// 21차: 수쿰빗의 이정표 — 소이 번호 간판, BTS 역사(나나·아속·프롬퐁), 구역 명소(나나 플라자·소이 카우보이·터미널 21·엠쿼티어 헬릭스·엠포리움·벤짜시리 공원)
// 좌표는 전체 지도(bkk-sukhumvit-full) 기준 칸. 구역마다 origin 만큼 빼서 쓴다.
// 소이 번호는 지도 자료(OSM)의 골목 입구와 실제 순서(북쪽 홀수 · 남쪽 짝수, 서→동)를 맞춰 붙였다. 몇 곳은 한 골목씩 어긋날 수 있다.
import { TW, TH } from './gfx.ts';

/** [번호, 쪽(N 북·홀수 / S 남·짝수), 칸 i, 칸 j] · 'R' = 라차다피섹 대로 */
export const SOI_SIGNS: [string, 'N' | 'S', number, number][] = [["1", "N", 190, 480], ["3", "N", 215, 470], ["5", "N", 236, 471], ["7", "N", 264, 470], ["9", "N", 299, 471], ["11", "N", 356, 473], ["13", "N", 402, 475], ["15", "N", 446, 477], ["17", "N", 483, 478], ["19", "N", 530, 480], ["21", "N", 575, 475], ["23", "N", 642, 485], ["25", "N", 674, 486], ["27", "N", 690, 486], ["29", "N", 730, 488], ["31", "N", 752, 488], ["33", "N", 774, 489], ["33/1", "N", 795, 490], ["35", "N", 841, 492], ["37", "N", 868, 492], ["39", "N", 912, 494], ["2", "S", 185, 495], ["4", "S", 216, 487], ["6", "S", 278, 482], ["8", "S", 322, 484], ["10", "S", 425, 488], ["12", "S", 458, 490], ["14", "S", 542, 493], ["R", "S", 588, 504], ["16", "S", 638, 497], ["18", "S", 697, 498], ["20", "S", 792, 501], ["22", "S", 864, 504], ["24", "S", 919, 506]];
/** 이름이 따로 있는 소이 (간판 아랫줄) */
export const SOI_ALIAS: Record<string, [string, string]> = {
  '3': ['นานาเหนือ', 'Nana Nuea'],
  '4': ['นานาใต้', 'Nana Tai'],
  '21': ['อโศกมนตรี', 'Asok Montri'],
  R: ['รัชดาภิเษก', 'Ratchadaphisek'],
};

export interface Station { key: string; th: string; en: string; i: number; len: number }
export const BTS_STATIONS: Station[] = [
  { key: 'nana', th: 'นานา', en: 'Nana', i: 226, len: 34 },
  { key: 'asok', th: 'อโศก', en: 'Asok', i: 553, len: 38 },
  { key: 'phromphong', th: 'พร้อมพงษ์', en: 'Phrom Phong', i: 910, len: 36 },
];

export type LandmarkKind = 'neonGate' | 'billboard' | 'helix' | 'fountain' | 'parkSign' | 'spot';
export interface Landmark { key: string; kind: LandmarkKind; i: number; j: number; text?: string; sub?: string }
export const LANDMARKS: Landmark[] = [
  { key: 'nanaPlaza', kind: 'neonGate', i: 237, j: 501, text: 'NANA PLAZA', sub: 'ENTERTAINMENT' },
  { key: 'cowboy', kind: 'neonGate', i: 581, j: 451, text: 'SOI COWBOY', sub: 'ซอยคาวบอย' },
  { key: 't21', kind: 'billboard', i: 573, j: 470, text: 'TERMINAL 21', sub: 'DEPARTURE · ASOK' },
  { key: 'emquartier', kind: 'spot', i: 936, j: 495 }, // 48차: 프롬퐁 북쪽 — 건물 자체를 그린다 (예전 나선 탑·광고탑은 뺐다)
  { key: 'emporium', kind: 'spot', i: 938, j: 507 }, // 48차: 프롬퐁 남쪽 — 엠쿼티어 맞은편
  { key: 'benchasiri', kind: 'fountain', i: 889, j: 544 },
  { key: 'benchasiriSign', kind: 'parkSign', i: 879, j: 508, text: 'BENCHASIRI PARK', sub: 'สวนเบญจสิริ' },
];

type Pt = [number, number];
export interface Pic { canvas: HTMLCanvasElement; ax: number; ay: number }
const mk = (w: number, h: number) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
const THAI = '"Noto Sans Thai", "Leelawadee UI", Tahoma, sans-serif';

/** 소이 간판: 방콕 거리의 파란 표지판 (흰 테 · 위 태국어 · 아래 영어). 두 배로 그려 반으로 줄여 쓴다. 기준점 = 기둥 밑 */
export function soiSignCanvas(n: string): Pic {
  const K = 2;
  const c = mk(46 * K, 64 * K);
  const g = c.getContext('2d')!;
  g.scale(K, K);
  // 기둥
  g.fillStyle = '#6e7478'; g.fillRect(22, 18, 2, 46);
  g.fillStyle = '#a9b0b4'; g.fillRect(22, 18, 1, 46);
  g.fillStyle = '#3a3e42'; g.fillRect(20, 61, 6, 3);
  // 판
  const alias = SOI_ALIAS[n];
  const road = n === 'R';
  const ph = alias && !road ? 24 : 18;
  g.fillStyle = '#ffffff'; g.fillRect(2, 2, 42, ph + 2);
  g.fillStyle = '#1d4f9c'; g.fillRect(3, 3, 40, ph);
  g.fillStyle = '#ffffff';
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.font = `700 6.5px ${THAI}`;
  g.fillText(road ? 'ถ.' + alias![0] : 'ซ.สุขุมวิท ' + n, 23, 8);
  g.font = '700 6px system-ui, sans-serif';
  g.fillText(road ? alias![1] + ' Rd.' : 'Sukhumvit ' + n, 23, 15);
  if (alias && !road) {
    g.fillStyle = '#e8eef8'; g.fillRect(5, 19, 36, 0.6);
    g.fillStyle = '#ffffff'; g.font = '600 5.2px system-ui, sans-serif';
    g.fillText('(' + alias[1] + ')', 23, 23);
  }
  return { canvas: c, ax: 23 / 46, ay: 1 };
}

/** 등각 상자 그리기 도우미 (칸 좌표 → 그림 좌표) */
function isoPen(g: CanvasRenderingContext2D, minX: number, minY: number) {
  const P = (i: number, j: number, z: number): Pt => [(i - j) * (TW / 2) - minX, (i + j) * (TH / 2) - z - minY];
  const poly = (pts: Pt[], fill: string | CanvasGradient) => {
    g.beginPath(); g.moveTo(pts[0][0], pts[0][1]); for (const p of pts.slice(1)) g.lineTo(p[0], p[1]); g.closePath();
    g.fillStyle = fill; g.fill();
  };
  /** 상자: 남쪽(+j)면 · 동쪽(+i)면 · 윗면 */
  const box = (i0: number, i1: number, j0: number, j1: number, z0: number, z1: number, top: string, south: string, east: string) => {
    poly([P(i0, j1, z0), P(i1, j1, z0), P(i1, j1, z1), P(i0, j1, z1)], south);
    poly([P(i1, j0, z0), P(i1, j1, z0), P(i1, j1, z1), P(i1, j0, z1)], east);
    poly([P(i0, j0, z1), P(i1, j0, z1), P(i1, j1, z1), P(i0, j1, z1)], top);
  };
  return { P, poly, box };
}

export interface StationPic { canvas: HTMLCanvasElement; x: number; y: number; i0: number; j0: number; w: number; d: number }
/**
 * BTS 역사: 대로 위 고가 — 아래층 대합실(콘크리트 · 창 · 파란 역명판 · 연두 줄), 위층 승강장(양쪽 승강장 · 노란 선 · 연두 유리 난간),
 * 그 위로 은빛 아치 지붕(갈빗대). 대합실 양 끝에서 북·남 보도로 내려가는 계단.
 * 좌표는 역 가운데(선로 기둥 줄)를 (0, 0)으로 둔 칸. north·south = 계단이 닿는 보도까지 칸 수
 */
export function stationCanvas(st: Station, north: number, south: number, night: boolean): StationPic {
  const L = st.len, i0 = -L / 2, i1 = L / 2;
  const jA = -Math.max(7, north), jB = Math.max(7, south);
  const jc0 = -6.2, jc1 = 6.2; // 대합실 폭
  const jp0 = -3.6, jp1 = 3.6; // 승강장 폭
  const ZC0 = 100, ZC1 = 150, ZP = 186, ZR0 = 214, ZR1 = 252;
  const minX = (i0 - jB - 1) * (TW / 2) - 8, maxX = (i1 - jA + 1) * (TW / 2) + 8;
  const minY = (i0 + jA) * (TH / 2) - ZR1 - 12, maxY = (i1 + jB) * (TH / 2) + 8;
  const c = mk(Math.ceil(maxX - minX), Math.ceil(maxY - minY));
  const g = c.getContext('2d')!;
  const { P, poly, box } = isoPen(g, minX, minY);
  const glass = night ? '#f6dc94' : '#5f7b90', green = '#7ab648', blue = '#1d4f9c';
  const line = (a: Pt, b: Pt) => { g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.stroke(); };
  const stair = (ia: number, toSouth: boolean) => {
    const ja = toSouth ? jc1 : jc0, jb = toSouth ? jB : jA;
    const n = 12;
    for (let k = n - 1; k >= 0; k--) {
      const f0 = k / n, f1 = (k + 1) / n;
      const a = ja + (jb - ja) * f0, b = ja + (jb - ja) * f1;
      const z = ZC0 * (1 - (toSouth ? f1 : f0));
      box(ia, ia + 1.6, Math.min(a, b), Math.max(a, b), Math.max(0, z - 6), z + 4, k % 2 ? '#d8d4ca' : '#cdc9bf', '#a8a49b', '#97938a');
    }
    g.strokeStyle = '#5e7a3e'; g.lineWidth = 1.5;
    for (const ii of [ia, ia + 1.6]) line(P(ii, ja, ZC0 + 14), P(ii, jb, 14));
  };
  // 북쪽 계단 (대합실 뒤)
  stair(i0 + 3, false); stair(i1 - 5, false);
  // 대합실을 받치는 기둥
  for (const ii of [i0 + 4, 0, i1 - 4]) for (const jj of [jc0 + 0.6, jc1 - 1.4]) box(ii - 0.4, ii + 0.4, jj, jj + 0.8, 0, ZC0, '#bdb9af', '#a29e95', '#8f8b83');
  // 대합실
  box(i0 + 1, i1 - 1, jc0, jc1, ZC0, ZC1, '#d9d5cb', '#cfcbc1', '#9e9a91');
  for (let ii = i0 + 2; ii < i1 - 2; ii += 1.5) poly([P(ii, jc1, ZC0 + 14), P(ii + 1.1, jc1, ZC0 + 14), P(ii + 1.1, jc1, ZC0 + 34), P(ii, jc1, ZC0 + 34)], glass);
  poly([P(i0 + 1, jc1, ZC1 - 12), P(i1 - 1, jc1, ZC1 - 12), P(i1 - 1, jc1, ZC1 - 4), P(i0 + 1, jc1, ZC1 - 4)], green);
  poly([P(i0 + 1, jc1, ZC0 + 2), P(i1 - 1, jc1, ZC0 + 2), P(i1 - 1, jc1, ZC0 + 8), P(i0 + 1, jc1, ZC0 + 8)], '#b4b0a6');
  // 역명판 (남쪽 면 가운데) — 비스듬한 면의 기울기로 글자를 눕힌다
  const sw = 7;
  poly([P(-sw, jc1 + 0.05, ZC0 + 38), P(sw, jc1 + 0.05, ZC0 + 38), P(sw, jc1 + 0.05, ZC0 + 60), P(-sw, jc1 + 0.05, ZC0 + 60)], blue);
  {
    const a = P(-sw, jc1, ZC0 + 49), b = P(sw, jc1, ZC0 + 49);
    const ang = Math.atan2(b[1] - a[1], b[0] - a[0]), len = Math.hypot(b[0] - a[0], b[1] - a[1]);
    g.save(); g.translate((a[0] + b[0]) / 2, (a[1] + b[1]) / 2); g.rotate(ang);
    g.fillStyle = '#ffffff'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillStyle = green; g.fillRect(-len / 2 + 6, -7, 24, 14);
    g.fillStyle = '#ffffff'; g.font = '900 9px system-ui, sans-serif'; g.fillText('BTS', -len / 2 + 18, 0.5);
    g.font = `700 10px ${THAI}`; g.fillText(st.th, 14, -5);
    g.font = '700 8px system-ui, sans-serif'; g.fillText(st.en, 14, 6);
    g.restore();
  }
  // 승강장
  box(i0, i1, jp0, jp1, ZP - 8, ZP, '#bdb9b0', '#a7a39a', '#94918a');
  poly([P(i0, -1.4, ZP + 0.2), P(i1, -1.4, ZP + 0.2), P(i1, 1.4, ZP + 0.2), P(i0, 1.4, ZP + 0.2)], '#6a6660');
  g.lineWidth = 1;
  g.strokeStyle = '#d8d0c0'; for (const jj of [-1, -0.4, 0.4, 1]) line(P(i0, jj, ZP + 1), P(i1, jj, ZP + 1));
  g.strokeStyle = '#f0c63a'; for (const jj of [-1.6, 1.6]) line(P(i0, jj, ZP + 1), P(i1, jj, ZP + 1));
  for (let ii = i0 + 1; ii <= i1 - 1; ii += 4) for (const jj of [jp0 + 0.2, jp1 - 0.5]) box(ii, ii + 0.3, jj, jj + 0.3, ZP, ZR0, '#e6e8ea', '#c8cbce', '#b2b5b8');
  poly([P(i0, jp1, ZP), P(i1, jp1, ZP), P(i1, jp1, ZP + 16), P(i0, jp1, ZP + 16)], night ? 'rgba(170,220,120,0.55)' : 'rgba(130,190,90,0.45)');
  // 아치 지붕
  const arch = (f: number) => ZR0 + Math.sin(f * Math.PI) * (ZR1 - ZR0);
  const N2 = 14, ja0 = jp0 - 0.6, jspan = jp1 - jp0 + 1.2;
  for (let k = N2 - 1; k >= 0; k--) {
    const f0 = k / N2, f1 = (k + 1) / N2;
    const a = ja0 + jspan * f0, b = ja0 + jspan * f1;
    const sh = 222 + Math.round(Math.cos(f0 * Math.PI) * 18);
    poly([P(i0 - 0.5, a, arch(f0)), P(i1 + 0.5, a, arch(f0)), P(i1 + 0.5, b, arch(f1)), P(i0 - 0.5, b, arch(f1))], 'rgb(' + sh + ',' + (sh + 3) + ',' + (sh + 6) + ')');
  }
  g.strokeStyle = 'rgba(140,150,160,0.55)';
  for (let ii = i0; ii <= i1; ii += 2) { g.beginPath(); for (let k = 0; k <= N2; k++) { const p = P(ii, ja0 + jspan * (k / N2), arch(k / N2)); if (k) g.lineTo(p[0], p[1]); else g.moveTo(p[0], p[1]); } g.stroke(); }
  g.fillStyle = 'rgba(160,168,176,0.9)'; g.beginPath();
  for (let k = 0; k <= N2; k++) { const p = P(i1 + 0.5, ja0 + jspan * (k / N2), arch(k / N2)); if (k) g.lineTo(p[0], p[1]); else g.moveTo(p[0], p[1]); }
  g.closePath(); g.fill();
  // 남쪽 계단 (지붕보다 앞)
  stair(i0 + 3, true); stair(i1 - 5, true);
  return { canvas: c, x: minX, y: minY, i0, j0: jA, w: L, d: jB - jA };
}

/** 네온 문: 두 기둥 위로 큰 간판 (밤에는 빛난다). 기준점 = 가운데 바닥 */
export function neonGateCanvas(text: string, sub: string, night: boolean, hue: 'pink' | 'blue'): Pic {
  const K = 2;
  const c = mk(120 * K, 120 * K);
  const g = c.getContext('2d')!;
  g.scale(K, K);
  const main = hue === 'pink' ? '#ff4fa8' : '#3ad0ff', alt = hue === 'pink' ? '#7ad8ff' : '#ff5a8c';
  for (const x of [14, 100]) { g.fillStyle = '#2a2430'; g.fillRect(x, 40, 6, 80); g.fillStyle = '#4a4252'; g.fillRect(x, 40, 2, 80); }
  g.fillStyle = '#1a1420'; g.fillRect(6, 14, 108, 34);
  g.strokeStyle = night ? main : '#6a4a60'; g.lineWidth = 2; g.strokeRect(7, 15, 106, 32);
  for (let x = 10; x < 112; x += 5) for (const y of [11, 50]) { g.fillStyle = night ? ((x / 5) % 2 ? '#ffe680' : alt) : '#8a8070'; g.fillRect(x, y, 2, 2); }
  g.textAlign = 'center'; g.textBaseline = 'middle';
  if (night) { g.shadowColor = main; g.shadowBlur = 8; }
  g.fillStyle = night ? '#fff0fa' : main;
  g.font = '900 15px "Arial Black", Impact, system-ui, sans-serif';
  g.fillText(text, 60, 28);
  g.shadowBlur = night ? 6 : 0;
  if (night) g.shadowColor = alt;
  g.fillStyle = night ? alt : '#c8b8c0';
  g.font = `700 7px ${THAI}`;
  g.fillText(sub, 60, 41);
  return { canvas: c, ax: 0.5, ay: 1 };
}

/** 광고탑 (터미널 21 · 엠포리움): 기둥 위 넓은 판 */
export function billboardCanvas(text: string, sub: string, style: 't21' | 'emporium', night: boolean): Pic {
  const K = 2;
  const c = mk(96 * K, 110 * K);
  const g = c.getContext('2d')!;
  g.scale(K, K);
  g.fillStyle = '#5a5e62'; g.fillRect(44, 44, 8, 66);
  g.fillStyle = '#7a7e82'; g.fillRect(44, 44, 3, 66);
  const t21 = style === 't21';
  g.fillStyle = t21 ? '#f4f6f8' : '#161616'; g.fillRect(4, 6, 88, 40);
  g.strokeStyle = t21 ? '#c0c6cc' : '#8a7432'; g.lineWidth = 2; g.strokeRect(5, 7, 86, 38);
  g.textAlign = 'center'; g.textBaseline = 'middle';
  if (night) { g.shadowColor = t21 ? '#9ad0ff' : '#ffd77a'; g.shadowBlur = 6; }
  g.fillStyle = t21 ? '#1a2a44' : '#d8b65a';
  g.font = t21 ? '900 13px system-ui, sans-serif' : '600 13px Georgia, "Times New Roman", serif';
  g.fillText(text, 48, t21 ? 20 : 22);
  g.shadowBlur = 0;
  if (t21) {
    // 공항 출발 안내판처럼: 검은 띠에 노란 글씨
    g.fillStyle = '#1e2228'; g.fillRect(10, 31, 76, 10);
    g.fillStyle = '#ffcf3a'; g.font = '700 6px ui-monospace, monospace'; g.fillText(sub, 48, 36.5);
  } else { g.fillStyle = '#b89a48'; g.font = '500 6px Georgia, serif'; g.fillText(sub, 48, 36); }
  return { canvas: c, ax: 0.5, ay: 1 };
}

/** 엠쿼티어 '더 헬릭스': 나선으로 감아 오르는 초록 정원 탑 (유리 심 · 흘러내리는 물) */
export function helixCanvas(night: boolean): Pic {
  const K = 2;
  const c = mk(90 * K, 170 * K);
  const g = c.getContext('2d')!;
  g.scale(K, K);
  const gr = g.createLinearGradient(30, 0, 60, 0);
  gr.addColorStop(0, night ? '#ffe7a8' : '#7da6c0'); gr.addColorStop(1, night ? '#c8a860' : '#4c7088');
  g.fillStyle = gr; g.fillRect(32, 14, 26, 150);
  for (let k = 0; k < 26; k++) {
    const y = 160 - k * 5.8, a = k * 0.62;
    const x = 45 + Math.cos(a) * 22, front = Math.sin(a) > 0;
    g.fillStyle = front ? '#3f8a3a' : '#2c6a2c';
    g.beginPath(); g.ellipse(x, y, 16, 5, 0, 0, Math.PI * 2); g.fill();
    g.fillStyle = front ? '#6ab84a' : '#4a9a3a';
    g.beginPath(); g.ellipse(x, y - 2, 13, 3.5, 0, 0, Math.PI * 2); g.fill();
    if (k % 3 === 0) { g.fillStyle = '#f2d24a'; g.fillRect(x - 6, y - 4, 2, 2); g.fillStyle = '#f29ab8'; g.fillRect(x + 4, y - 3, 2, 2); }
  }
  g.fillStyle = 'rgba(200,235,250,0.6)'; g.fillRect(60, 30, 2, 130);
  g.fillStyle = 'rgba(160,140,120,0.5)'; g.beginPath(); g.ellipse(45, 166, 30, 5, 0, 0, Math.PI * 2); g.fill();
  return { canvas: c, ax: 0.5, ay: 166 / 170 };
}

/** 벤짜시리 공원 호수의 분수 */
export function fountainCanvas(): Pic {
  const K = 2;
  const c = mk(70 * K, 80 * K);
  const g = c.getContext('2d')!;
  g.scale(K, K);
  g.fillStyle = 'rgba(255,255,255,0.35)'; g.beginPath(); g.ellipse(35, 72, 30, 7, 0, 0, Math.PI * 2); g.fill();
  g.strokeStyle = 'rgba(255,255,255,0.7)'; g.lineWidth = 1; g.beginPath(); g.ellipse(35, 72, 22, 5, 0, 0, Math.PI * 2); g.stroke();
  for (let k = 0; k < 7; k++) {
    const a = -Math.PI / 2 + (k - 3) * 0.22;
    g.strokeStyle = 'rgba(235,248,255,' + (0.75 - Math.abs(k - 3) * 0.12) + ')'; g.lineWidth = k === 3 ? 3 : 1.5;
    g.beginPath(); g.moveTo(35, 72);
    g.quadraticCurveTo(35 + Math.cos(a) * 40, 72 + Math.sin(a) * 120, 35 + (k - 3) * 9, 70);
    g.stroke();
  }
  for (let k = 0; k < 24; k++) { g.fillStyle = 'rgba(255,255,255,0.8)'; g.fillRect(10 + ((k * 37) % 50), 50 + ((k * 13) % 22), 1, 1); }
  return { canvas: c, ax: 0.5, ay: 72 / 80 };
}

/** 공원 입구 표지 (초록 판 · 나무 기둥) */
export function parkSignCanvas(text: string, sub: string): Pic {
  const K = 2;
  const c = mk(80 * K, 50 * K);
  const g = c.getContext('2d')!;
  g.scale(K, K);
  g.fillStyle = '#6a4a2e'; g.fillRect(10, 20, 4, 30); g.fillRect(66, 20, 4, 30);
  g.fillStyle = '#2e6a3a'; g.fillRect(4, 4, 72, 22);
  g.strokeStyle = '#d8c48a'; g.lineWidth = 1; g.strokeRect(5.5, 5.5, 69, 19);
  g.fillStyle = '#f4ecd0'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.font = `700 6.5px ${THAI}`; g.fillText(sub, 40, 11);
  g.font = '800 7px system-ui, sans-serif'; g.fillText(text, 40, 19.5);
  return { canvas: c, ax: 0.5, ay: 1 };
}

// ───────────────────────── 47차 명소 리모델링: 건물 자체를 명소답게 ─────────────────────────
// 터미널 21(공항 터미널 콘셉트 — 유리 커튼월 · 출발 안내판 띠 · 비행기 · 'DEPARTURE' 차양) · 엠포리움(크림색 석재 · 금빛 세로 지느러미 · 유리 아트리움)
// · 엠쿼티어(유리 상자 · 나선형 녹색 테라스 '헬릭스'). 건물 칸(i0, j0, w, d)과 높이(h)는 지도 그대로 쓰고 겉만 바꾼다
export type LandmarkBuild = 't21' | 'emporium' | 'emquartier' | 'emqtower';
export function landmarkBuildingCanvas(b: { i0: number; j0: number; w: number; d: number; h: number }, key: LandmarkBuild, night: boolean): { canvas: HTMLCanvasElement; x: number; y: number } {
  const { i0, j0, w, d } = b, i1 = i0 + w, j1 = j0 + d;
  const H = landmarkTop(b.h, key);
  const minX = (i0 - j1) * (TW / 2) - 12, maxX = (i1 - j0) * (TW / 2) + 12;
  const minY = (i0 + j0) * (TH / 2) - H - 40, maxY = (i1 + j1) * (TH / 2) + 8;
  const c = document.createElement('canvas');
  c.width = Math.ceil(maxX - minX); c.height = Math.ceil(maxY - minY);
  const g = c.getContext('2d')!;
  const { P, poly, box } = isoPen(g, minX, minY);
  const lineS = (a: number, z0: number, z1: number, col: string, wd = 1) => { const p0 = P(a, j1, z0), p1 = P(a, j1, z1); g.strokeStyle = col; g.lineWidth = wd; g.beginPath(); g.moveTo(...p0); g.lineTo(...p1); g.stroke(); };
  const lineE = (a: number, z0: number, z1: number, col: string, wd = 1) => { const p0 = P(i1, a, z0), p1 = P(i1, a, z1); g.strokeStyle = col; g.lineWidth = wd; g.beginPath(); g.moveTo(...p0); g.lineTo(...p1); g.stroke(); };
  const bandS = (z0: number, z1: number, col: string, a0 = i0, a1 = i1) => poly([P(a0, j1, z0), P(a1, j1, z0), P(a1, j1, z1), P(a0, j1, z1)], col);
  const bandE = (z0: number, z1: number, col: string, a0 = j0, a1 = j1) => poly([P(i1, a0, z0), P(i1, a1, z0), P(i1, a1, z1), P(i1, a0, z1)], col);
  const glow = night ? '#ffe9a8' : '#cfe6f6';
  const text = (s: string, a: number, z: number, size: number, col: string, face: 'S' | 'E') => {
    // 면을 따라 비스듬히 (등각) 쓴 큰 글씨
    const [x, y] = face === 'S' ? P(a, j1, z) : P(i1, a, z);
    g.save(); g.translate(x, y); g.transform(1, face === 'S' ? 0.5 : -0.5, 0, 1, 0, 0);
    g.font = `900 ${size}px system-ui, sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillStyle = 'rgba(0,0,0,0.35)'; g.fillText(s, 1, 1); g.fillStyle = col; g.fillText(s, 0, 0); g.restore();
  };
  if (key === 't21') {
    // 기단(밝은 석재) · 유리 커튼월 몸통 · 위 띠에 TERMINAL 21 · 출발 안내판 띠 · 차양
    box(i0, i1, j0, j1, 0, 18, '#d8d4cc', '#c8c2b8', '#b0aaa0');
    box(i0 + 0.1, i1 - 0.1, j0 + 0.1, j1 - 0.1, 18, H - 26, '#9ab4c8', '#5a7a96', '#4a6a86');
    for (let z = 26; z < H - 30; z += 12) { bandS(z, z + 1.5, '#3a5068'); bandE(z, z + 1.5, '#2e4458'); }
    for (let a = i0 + 0.6; a < i1 - 0.2; a += 0.9) lineS(a, 18, H - 26, '#2e4458');
    for (let a = j0 + 0.6; a < j1 - 0.2; a += 0.9) lineE(a, 18, H - 26, '#24384a');
    for (let k = 0; k < 40; k++) { const a = i0 + 0.3 + ((k * 37) % 97) / 97 * (w - 0.6), z = 24 + ((k * 53) % 89) / 89 * (H - 60); bandS(z, z + 6, k % 3 ? 'rgba(207,230,246,0.25)' : (night ? 'rgba(255,233,168,0.7)' : 'rgba(255,255,255,0.35)'), a, a + 0.5); }
    box(i0, i1, j0, j1, H - 26, H, '#e8e4dc', '#f2efe8', '#d8d4cc');
    text('TERMINAL 21', i0 + w / 2, H - 13, Math.min(18, w * 2.2), '#d8262e', 'S');
    bandE(H - 22, H - 6, '#1a1e24', j0 + 0.4, j1 - 0.4); // 출발 안내판
    for (let n = 0; n < 3; n++) bandE(H - 19 + n * 4.5, H - 17.5 + n * 4.5, n === 1 ? '#7ad8a8' : '#f2c84a', j0 + 0.7, j1 - 0.7);
    // 커다란 비행기 그림 (남쪽 면)
    { const [x, y] = P(i0 + w * 0.7, j1, H * 0.55); g.save(); g.translate(x, y); g.transform(1, 0.5, 0, 1, 0, 0); g.fillStyle = '#f6f6f8';
      g.beginPath(); g.ellipse(0, 0, 26, 4, 0, 0, Math.PI * 2); g.fill(); g.beginPath(); g.moveTo(-4, -2); g.lineTo(8, -18); g.lineTo(13, -18); g.lineTo(6, -2); g.fill(); g.beginPath(); g.moveTo(-4, 2); g.lineTo(8, 16); g.lineTo(13, 16); g.lineTo(6, 2); g.fill(); g.beginPath(); g.moveTo(-22, -1); g.lineTo(-27, -10); g.lineTo(-23, -10); g.lineTo(-18, -2); g.fill(); g.fillStyle = '#d8262e'; g.fillRect(-27, -10, 4, 3); g.restore(); }
    // 입구 차양 DEPARTURE
    poly([P(i0 + w * 0.3, j1, 22), P(i0 + w * 0.7, j1, 22), P(i0 + w * 0.7, j1 + 0.8, 20), P(i0 + w * 0.3, j1 + 0.8, 20)], '#2a2e36');
    text('DEPARTURE', i0 + w / 2, 27, 7, '#f2c84a', 'S');
    bandS(2, 16, night ? '#fff0c0' : '#a8c8e0', i0 + w * 0.35, i0 + w * 0.65);
  } else {
    mallFacade(g, P, poly, text, { i0, i1, j0, j1, w, d, H }, key, night);
  }
  void glow;
  return { canvas: c, x: minX, y: minY };
}

/** 48차: 명소 건물 높이 (그림 위쪽 여백 계산에도 쓴다) */
export function landmarkTop(h: number, key: LandmarkBuild) {
  return key === 't21' ? Math.max(h, 190) : key === 'emporium' ? 118 : key === 'emquartier' ? 124 : key === 'emqtower' ? 176 : Math.max(h, 120);
}

type PFn = (i: number, j: number, z: number) => Pt;
type Foot = [number, number][];
/** 앞 모서리(남동)가 둥근 바닥: 북서 → 북동 → 동쪽 면 → 둥근 모서리 → 남쪽 면 */
function roundFoot(i0: number, i1: number, j0: number, j1: number, r: number, n = 7, corner: 'se' | 'ne' = 'se'): Foot {
  if (corner === 'ne') {
    const f: Foot = [[i0, j0], [i1 - r, j0]];
    for (let k = 1; k < n; k++) { const a = -Math.PI / 2 + (k / n) * (Math.PI / 2); f.push([i1 - r + Math.cos(a) * r, j0 + r + Math.sin(a) * r]); }
    f.push([i1, j0 + r], [i1, j1], [i0, j1]);
    return f;
  }
  const f: Foot = [[i0, j0], [i1, j0], [i1, j1 - r]];
  for (let k = 1; k < n; k++) { const a = (k / n) * (Math.PI / 2); f.push([i1 - r + Math.cos(a) * r, j1 - r + Math.sin(a) * r]); }
  f.push([i1 - r, j1], [i0, j1]);
  return f;
}
const hex = (c: string) => [parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16)];
const mix = (a: string, b: string, t: number) => { const x = hex(a), y = hex(b); return `rgb(${x.map((v, k) => Math.round(v + (y[k] - v) * t)).join(',')})`; };
/** 바닥 다각형을 z0~z1로 세운 보이는 면들 (보는 쪽 = +i+j). col(t): t = 0 동쪽 면 … 1 남쪽 면 */
function faces(foot: Foot) {
  const out: { a: [number, number]; b: [number, number]; t: number }[] = [];
  for (let k = 0; k < foot.length; k++) {
    const a = foot[k], b = foot[(k + 1) % foot.length];
    const nx = b[1] - a[1], ny = -(b[0] - a[0]);
    if (nx + ny <= 1e-6) continue;
    out.push({ a, b, t: Math.max(0, Math.min(1, ny / (Math.abs(nx) + Math.abs(ny)))) });
  }
  return out;
}
function prism(P: PFn, poly: (p: Pt[], f: string | CanvasGradient) => void, foot: Foot, z0: number, z1: number, south: string, east: string, top?: string) {
  for (const f of faces(foot)) poly([P(f.a[0], f.a[1], z0), P(f.b[0], f.b[1], z0), P(f.b[0], f.b[1], z1), P(f.a[0], f.a[1], z1)], mix(east, south, f.t));
  if (top) poly(foot.map(([i, j]) => P(i, j, z1)), top);
}
/** 보이는 면 위에 세로줄 (유리 칸) — 면 길이를 따라 step 칸마다 */
function mullions(g: CanvasRenderingContext2D, P: PFn, foot: Foot, z0: number, z1: number, step: number, col: string, wd = 1) {
  g.strokeStyle = col; g.lineWidth = wd;
  for (const f of faces(foot)) {
    const L = Math.hypot(f.b[0] - f.a[0], f.b[1] - f.a[1]);
    for (let u = step; u < L - 0.05; u += step) { const q = u / L, i = f.a[0] + (f.b[0] - f.a[0]) * q, j = f.a[1] + (f.b[1] - f.a[1]) * q; const p0 = P(i, j, z0), p1 = P(i, j, z1); g.beginPath(); g.moveTo(p0[0], p0[1]); g.lineTo(p1[0], p1[1]); g.stroke(); }
    const p0 = P(f.b[0], f.b[1], z0), p1 = P(f.b[0], f.b[1], z1); g.beginPath(); g.moveTo(p0[0], p0[1]); g.lineTo(p1[0], p1[1]); g.stroke();
  }
}
/** 보이는 면들을 한 덩어리 클립으로 (큰 화면 · 그림을 면에 입힐 때) */
function clipFaces(g: CanvasRenderingContext2D, P: PFn, foot: Foot, z0: number, z1: number) {
  g.beginPath();
  for (const f of faces(foot)) { const q = [P(f.a[0], f.a[1], z0), P(f.b[0], f.b[1], z0), P(f.b[0], f.b[1], z1), P(f.a[0], f.a[1], z1)]; g.moveTo(q[0][0], q[0][1]); for (const p of q.slice(1)) g.lineTo(p[0], p[1]); g.closePath(); }
  g.clip();
}

/**
 * 48차 프롬퐁의 두 쇼핑몰 (사용자 사진 기준)
 * · 엠포리움(남쪽): 흰 곡면 외벽에 가는 초록 줄, 금빛 E와 EMPORIUM, 아래 두 층은 불 켜진 유리 진열창, 모서리에 금빛 격자 상자, 옥상 수영장과 야자수
 * · 엠쿼티어(북쪽) 앞 동: 둥근 모서리를 감싸는 거대한 화면, 위 흰 띠에 동그란 e 표시와 EmQuartier
 * · 엠쿼티어 뒤 동: 유리 몸통, 동쪽 끝은 층층이 돌아 오르는 흰 테라스와 초록 화단 (헬릭스)
 */
function mallFacade(g: CanvasRenderingContext2D, P: PFn, poly: (p: Pt[], f: string | CanvasGradient) => void, text: (s: string, a: number, z: number, size: number, col: string, face: 'S' | 'E') => void, b: { i0: number; i1: number; j0: number; j1: number; w: number; d: number; H: number }, key: LandmarkBuild, night: boolean) {
  const { i0, i1, j0, j1, w, d, H } = b;
  const warm = night ? '#ffe3a0' : '#c9dbe4';
  if (key === 'emporium') {
    // 대로(북쪽)는 화면 뒤쪽이라 보이지 않는다 — 대로와 소이 24가 만나는 북동 모서리를 둥글게, 이름은 소이 쪽(동쪽) 면에 크게
    const r = Math.min(8, d * 0.4);
    const foot = roundFoot(i0, i1, j0, j1, r, 8, 'ne');
    const inner = roundFoot(i0 + 0.4, i1 - 0.4, j0 + 0.4, j1 - 0.4, r - 0.4, 8, 'ne');
    prism(P, poly, inner, 0, 30, night ? '#f4d892' : '#a9c3cf', night ? '#e2bc72' : '#9ab6c4');
    mullions(g, P, inner, 0, 30, 1.6, night ? 'rgba(120,90,40,0.6)' : 'rgba(70,90,100,0.6)');
    prism(P, poly, foot, 14, 16, '#f3efe6', '#e2ddd2');
    prism(P, poly, foot, 30, H - 8, '#f2efe8', '#faf8f3', '#ece8e0');
    for (const z of [44, 58, 74, 92]) prism(P, poly, foot, z, z + 1.6, '#3f7a52', '#3a7a4e');
    // 옥상: 나무 갑판 · 수영장 · 야자수 · 유리 난간
    poly(roundFoot(i0 + 1, i1 - 1, j0 + 1, j1 - 1, r - 1, 8, 'ne').map(([i, j]) => P(i, j, H - 7.9)), night ? '#9a8a6e' : '#c9b48e');
    poly([P(i0 + w * 0.3, j0 + d * 0.3, H - 7.6), P(i1 - r - 2, j0 + d * 0.3, H - 7.6), P(i1 - r - 2, j0 + d * 0.66, H - 7.6), P(i0 + w * 0.3, j0 + d * 0.66, H - 7.6)], night ? '#3ad0e8' : '#5ac8e0');
    g.strokeStyle = night ? 'rgba(70,55,35,0.35)' : 'rgba(120,95,60,0.35)'; g.lineWidth = 1;
    for (let a = i0 + 1.6; a < i1 - 1; a += 0.8) { const p0 = P(a, j0 + 1, H - 7.9), p1 = P(a, j1 - 1, H - 7.9); g.beginPath(); g.moveTo(p0[0], p0[1]); g.lineTo(p1[0], p1[1]); g.stroke(); }
    // 수영장 둘레 흰 선베드 · 파라솔
    for (let k = 0; k < 6; k++) { const a = i0 + w * 0.32 + k * ((w * 0.62 - r - 2) / 6); const [x, y] = P(a, j0 + d * 0.72, H - 7.6); g.fillStyle = '#f6f4ee'; g.fillRect(x - 4, y - 2, 8, 3); if (k % 2 === 0) { g.fillStyle = '#e8e0d0'; g.fillRect(x, y - 14, 1, 12); g.fillStyle = k % 4 ? '#f4f0e6' : '#3f7a52'; g.beginPath(); g.ellipse(x, y - 14, 8, 3, 0, 0, Math.PI * 2); g.fill(); } }
    for (let k = 0; k < 10; k++) {
      const edge = k < 6, a = edge ? i0 + 2 + k * ((w - r - 4) / 5) : i0 + 2 + (k - 6) * 0.2;
      const [x, y] = P(a, edge ? j1 - 2 - (k % 2) * 1.4 : j0 + 3 + (k - 6) * (d - 6) / 3, H - 8);
      g.strokeStyle = '#7a5a3a'; g.lineWidth = 3; g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + 3, y - 18, x + 2, y - 34); g.stroke();
      g.fillStyle = k % 2 ? '#3f8a3a' : '#2f7a36';
      for (let q = 0; q < 7; q++) { const ang = (q / 7) * Math.PI * 2; g.beginPath(); g.ellipse(x + 2 + Math.cos(ang) * 10, y - 34 + Math.sin(ang) * 4 + 3, 12, 3.2, ang, 0, Math.PI * 2); g.fill(); }
    }
    prism(P, poly, roundFoot(i0 + 0.2, i1 - 0.2, j0 + 0.2, j1 - 0.2, r - 0.2, 8, 'ne'), H - 8, H, 'rgba(200,230,236,0.8)', 'rgba(214,238,244,0.85)');
    // 금빛 E와 EMPORIUM (동쪽 면, 대로 가까이)
    { const [x, y] = P(i1, j0 + r + 3.2, 76);
      g.save(); g.translate(x, y); g.transform(1, -0.5, 0, 1, 0, 0);
      if (night) { g.shadowColor = '#ffd77a'; g.shadowBlur = 10; }
      g.fillStyle = '#c9a23e'; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.font = 'italic 700 40px Georgia, "Times New Roman", serif'; g.fillText('E', 0, -9);
      g.font = '600 11px Georgia, "Times New Roman", serif'; g.fillText('EMPORIUM', 0, 18);
      g.restore(); }
    // 모서리 곁 금빛 격자 상자 (밤엔 환하다)
    { const a0 = j0 + r + 9, a1 = j0 + r + 14;
      const box2: Foot = [[i1 - 0.4, a0], [i1 + 0.6, a0], [i1 + 0.6, a1], [i1 - 0.4, a1]];
      prism(P, poly, box2, 2, 32, night ? '#ffd76a' : '#e8c87a', night ? '#ffe08a' : '#f0d48e', night ? '#fff0b0' : '#f4e2a8');
      g.save(); clipFaces(g, P, box2, 2, 32);
      g.strokeStyle = night ? 'rgba(160,110,30,0.8)' : 'rgba(140,100,40,0.7)'; g.lineWidth = 1;
      const [xa, ya] = P(i1 + 0.6, a0, 32);
      for (let x = xa - 50; x < xa + 70; x += 5) { g.beginPath(); g.moveTo(x, ya - 30); g.lineTo(x + 40, ya + 70); g.stroke(); g.beginPath(); g.moveTo(x + 40, ya - 30); g.lineTo(x, ya + 70); g.stroke(); }
      g.restore(); }
    // 입구 차양 (동쪽 면)
    poly([P(i1, j0 + r + 1, 31), P(i1, j0 + r + 7, 31), P(i1 + 0.9, j0 + r + 7, 29), P(i1 + 0.9, j0 + r + 1, 29)], '#2a2a2a');
    return;
  }
  if (key === 'emquartier') {
    const r = Math.min(4.5, d * 0.45);
    const foot = roundFoot(i0, i1, j0, j1, r);
    prism(P, poly, roundFoot(i0 + 0.3, i1 - 0.3, j0 + 0.3, j1 - 0.3, r - 0.3), 0, 32, night ? '#f2dc9a' : '#a8c0cc', night ? '#d0b070' : '#88a0ae');
    mullions(g, P, roundFoot(i0 + 0.3, i1 - 0.3, j0 + 0.3, j1 - 0.3, r - 0.3), 0, 32, 1.4, 'rgba(60,70,80,0.55)');
    prism(P, poly, foot, 32, 36, '#e8eaec', '#c6cacd');
    // 둥근 모서리를 감싸는 큰 화면: 테두리 → 하늘빛 광고 (구름 사이 흰 날개 한 짝 — 천국은 생각보다 가깝다)
    const S0 = 38, S1 = H - 24;
    prism(P, poly, foot, S0 - 2, S1 + 2, '#17191d', '#101215');
    g.save(); clipFaces(g, P, foot, S0, S1);
    { const [xa, ya] = P(i0, j1, S1), [xb, yb] = P(i1, j0 + d * 0.2, S0);
      const gr = g.createLinearGradient(xa, ya, xb, yb);
      gr.addColorStop(0, night ? '#2a6ad8' : '#3a7ae0'); gr.addColorStop(0.55, night ? '#7ac0f8' : '#8ad0ff'); gr.addColorStop(1, '#f8e8b0');
      g.fillStyle = gr; g.fillRect(Math.min(xa, xb) - 20, Math.min(ya, yb) - 120, Math.abs(xb - xa) + 40, Math.abs(yb - ya) + 240);
      for (let k = 0; k < 9; k++) { const [cx, cy] = P(i0 + 1 + k * (w / 8), j1, S0 + 8 + (k % 3) * 9); g.fillStyle = 'rgba(255,255,255,0.75)'; g.beginPath(); g.ellipse(cx, cy, 14, 5, 0.46, 0, Math.PI * 2); g.fill(); }
      const [wx, wy] = P(i0 + w * 0.36, j1, (S0 + S1) / 2);
      g.translate(wx, wy); g.transform(1, 0.5, 0, 1, 0, 0);
      g.fillStyle = '#ffffff';
      for (let k = 0; k < 7; k++) { g.beginPath(); g.ellipse(-4 + k * 5, -2 + k * 2.4, 4, 17 - k * 1.3, -0.5 + k * 0.08, 0, Math.PI * 2); g.fill(); }
      g.fillStyle = 'rgba(255,240,200,0.9)'; g.font = '700 7px "Noto Sans Thai", Tahoma, sans-serif'; g.textAlign = 'left'; g.fillText('สวรรค์อยู่ใกล้กว่าที่คิด', 30, 10); }
    g.restore();
    // 위 흰 띠: 동그란 e 표시와 이름
    prism(P, poly, foot, S1 + 2, H, '#f2f3f4', '#cfd3d6', '#e6e8ea');
    { const [x, y] = P(i0 + (w - r) * 0.42, j1, S1 + 12);
      g.save(); g.translate(x, y); g.transform(1, 0.5, 0, 1, 0, 0);
      g.strokeStyle = '#8a8e92'; g.lineWidth = 1.4; g.beginPath(); g.arc(-26, 0, 7, 0, Math.PI * 2); g.stroke();
      g.fillStyle = '#5a5e62'; g.font = '700 9px Georgia, serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('e', -26, 0.5);
      g.font = '600 10px Georgia, serif'; g.textAlign = 'left'; g.fillText('EmQuartier', -14, 1);
      g.restore(); }
    return;
  }
  // 엠쿼티어 뒤 동 (헬릭스)
  const foot: Foot = [[i0, j0], [i1, j0], [i1, j1], [i0, j1]];
  prism(P, poly, foot, 0, H - 10, night ? '#6a84a0' : '#9ab4c6', night ? '#4a6480' : '#6a889c', '#dfe5ea');
  for (let z = 14; z < H - 14; z += 11) prism(P, poly, foot, z, z + 1.2, '#4a6478', '#3a5266');
  mullions(g, P, foot, 0, H - 10, 1.2, 'rgba(40,60,75,0.35)');
  if (night) for (let k = 0; k < 30; k++) { const a = i0 + 0.5 + ((k * 31) % 37) / 37 * (w * 0.55), z = 16 + ((k * 17) % 29) / 29 * (H - 50); poly([P(a, j1, z), P(a + 0.6, j1, z), P(a + 0.6, j1, z + 6), P(a, j1, z + 6)], 'rgba(255,233,168,0.6)'); }
  // 헬릭스: 동쪽 14칸 — 층마다 조금씩 돌아가며 내민 흰 테라스와 화단
  const hx0 = i1 - Math.min(16, w * 0.4);
  const N = Math.floor((H - 24) / 13);
  for (let n = 0; n < N; n++) {
    const z = 10 + n * 13, sh = (n % 4) / 4;
    const a0 = hx0 + (i1 - hx0) * sh * 0.5, b0 = j0 + d * (0.5 - sh * 0.4);
    const slab: Foot = [[a0, j0 + 0.5], [i1 + 0.9, j0 + 0.5], [i1 + 0.9, b0], [i1 - 0.2, j1 + 0.9], [a0, j1 + 0.9]];
    prism(P, poly, slab, z, z + 3, '#f4f4f0', '#d8d8d2', '#eeeeea');
    prism(P, poly, slab.map(([i, j]) => [i, j] as [number, number]), z + 3, z + 6, night ? '#3a7a3a' : '#4f9a42', night ? '#2a6a2e' : '#3e8436');
    for (let k = 0; k < 4; k++) { const [x, y] = P(a0 + 1 + k * ((i1 - a0) / 4), j1 + 0.9, z + 6); g.fillStyle = k % 2 ? '#f2b8c8' : '#f2d24a'; g.fillRect(x, y - 2, 2, 2); }
  }
  void text;
}
