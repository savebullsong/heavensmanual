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

export type LandmarkKind = 'neonGate' | 'billboard' | 'helix' | 'fountain' | 'parkSign';
export interface Landmark { key: string; kind: LandmarkKind; i: number; j: number; text?: string; sub?: string }
export const LANDMARKS: Landmark[] = [
  { key: 'nanaPlaza', kind: 'neonGate', i: 237, j: 501, text: 'NANA PLAZA', sub: 'ENTERTAINMENT' },
  { key: 'cowboy', kind: 'neonGate', i: 581, j: 451, text: 'SOI COWBOY', sub: 'ซอยคาวบอย' },
  { key: 't21', kind: 'billboard', i: 573, j: 470, text: 'TERMINAL 21', sub: 'DEPARTURE · ASOK' },
  { key: 'emquartier', kind: 'helix', i: 948, j: 490 },
  { key: 'emporium', kind: 'billboard', i: 905, j: 506, text: 'EMPORIUM', sub: 'PHROM PHONG' },
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
export type LandmarkBuild = 't21' | 'emporium' | 'emquartier';
export function landmarkBuildingCanvas(b: { i0: number; j0: number; w: number; d: number; h: number }, key: LandmarkBuild, night: boolean): { canvas: HTMLCanvasElement; x: number; y: number } {
  const { i0, j0, w, d } = b, i1 = i0 + w, j1 = j0 + d;
  const H = Math.max(b.h, key === 't21' ? 190 : key === 'emporium' ? 150 : 120);
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
  } else if (key === 'emporium') {
    box(i0, i1, j0, j1, 0, 22, '#e6dccb', '#d8ccb6', '#c4b8a2');
    box(i0 + 0.15, i1 - 0.15, j0 + 0.15, j1 - 0.15, 22, H - 18, '#efe6d6', '#e2d6c0', '#cfc2aa');
    for (let a = i0 + 0.5; a < i1 - 0.2; a += 0.7) { lineS(a, 22, H - 18, '#c9a23e', 2); }
    for (let a = j0 + 0.5; a < j1 - 0.2; a += 0.7) { lineE(a, 22, H - 18, '#a8822e', 2); }
    for (let z = 34; z < H - 24; z += 16) { bandS(z, z + 7, night ? 'rgba(255,233,168,0.55)' : 'rgba(150,180,200,0.45)'); bandE(z, z + 7, night ? 'rgba(255,220,150,0.45)' : 'rgba(120,150,170,0.45)'); }
    box(i0, i1, j0, j1, H - 18, H, '#f6f0e4', '#c9a23e', '#a8822e');
    text('EMPORIUM', i0 + w / 2, H - 9, Math.min(16, w * 1.9), '#fffbf0', 'S');
    // 유리 아트리움 입구 · 화분
    poly([P(i0 + w * 0.3, j1, 0), P(i0 + w * 0.7, j1, 0), P(i0 + w * 0.7, j1, 34), P(i0 + w * 0.5, j1, 44), P(i0 + w * 0.3, j1, 34)], night ? '#ffe9a8' : '#b8d4e6');
    for (let a = i0 + w * 0.34; a < i0 + w * 0.68; a += 0.35) lineS(a, 0, 34, '#8a9aa6');
    for (const a of [i0 + w * 0.22, i0 + w * 0.78]) { const [x, y] = P(a, j1 + 0.4, 0); g.fillStyle = '#6a5a4a'; g.fillRect(x - 4, y - 8, 8, 8); g.fillStyle = '#3a7a3a'; g.beginPath(); g.ellipse(x, y - 14, 8, 8, 0, 0, Math.PI * 2); g.fill(); }
  } else {
    // 엠쿼티어: 유리 상자 위로 나선처럼 감긴 녹색 테라스 (헬릭스)
    box(i0, i1, j0, j1, 0, H - 10, '#b8d0dc', '#7a9aae', '#6a8a9e');
    for (let z = 12; z < H - 14; z += 10) { bandS(z, z + 1.2, '#4a6a7e'); bandE(z, z + 1.2, '#3e5e72'); }
    for (let n = 0; n < 7; n++) {
      const z = 16 + n * ((H - 30) / 7), s0 = (n / 7) % 1;
      bandS(z, z + 4, '#4a8a3a', i0 + w * s0 * 0.6, i0 + w * (0.4 + s0 * 0.6)); bandS(z + 4, z + 6, '#6aaa4a', i0 + w * s0 * 0.6, i0 + w * (0.4 + s0 * 0.6));
      bandE(z + 5, z + 9, '#3e7a32', j0 + d * (1 - s0) * 0.5, j0 + d * (0.5 + (1 - s0) * 0.5));
    }
    box(i0, i1, j0, j1, H - 10, H, '#e8eef2', '#d0d8de', '#b8c2ca');
    text('EmQuartier', i0 + w / 2, H - 22, Math.min(14, w * 1.6), '#ffffff', 'S');
    if (night) for (let k = 0; k < 18; k++) { const a = i0 + 0.4 + ((k * 31) % 23) / 23 * (w - 0.8), z = 14 + ((k * 17) % 29) / 29 * (H - 40); bandS(z, z + 5, 'rgba(255,233,168,0.6)', a, a + 0.4); }
  }
  void glow;
  return { canvas: c, x: minX, y: minY };
}
