// 24차: 경계의 해변 — 천국도 지옥도 거부한 자들이 머무는 곳. 귀신(잿빛 거리)을 없애고 이곳으로 바꿨다.
// 카르마가 0(선악이 꼭 같음)이면, 또는 환생할 때 드물게(태어나자마자 · 배 속에서 숨이 멎어) 이리로 떠밀려 온다.
// 저녁 어스름에 안개 낀 해변. 바다에 가끔 익사체가 떠오르고, 물가엔 떠밀려 온 잡동사니, 마른 모래 위엔 가부좌한 대머리들.
// 나무 잔교 들머리에서 콘로 머리의 어부 '불다'가 기다린다 (붓다 아님). 깨달음 없는 자는 잠깐만 머물 수 있다.
import { TW, TH } from './gfx.ts';
import { TYPES, finalize, type Zone, type Furn, type InteriorInfo } from './zone.ts';
import type { Look } from './character.ts';

const TI = Object.fromEntries(TYPES.map((t, k) => [t, k])) as Record<(typeof TYPES)[number], number>;
export const SHORE_W = 30, SHORE_H = 26;
/** 물가 선: 이 줄(j)보다 위(작은 j)는 바다 */
export function shoreF(i: number) {
  return 8 + Math.sin(i * 0.37) * 0.9 + Math.sin(i * 0.11 + 1.3) * 0.8;
}
export function shoreLine(i: number) {
  return Math.round(shoreF(i));
}
/** 잔교: 물가에서 바다로 6칸 뻗은 나무 다리 (두 칸 너비) */
export const PIER = { i0: 9, i1: 11, j0: 1 };

/** 불다: 노란 고무 작업복(어부 기름옷)과 장화, 바짝 땋아 붙인 검은 콘로 머리 */
export const BULDA_LOOK: Look = { sex: 'm', build: 2, skin: 2, hair: 5, hairColor: 0, top: 0, bottom: 0, cols: { 1: '#6a4228', 10: '#6a4228', 2: '#141010', 3: '#d8a41e', 9: '#d8a41e', 4: '#2a3430', 5: '#1a1e1c', 6: '#141010' } };
/** 가부좌한 완성자: 민머리(머리칼을 살빛으로), 잿빛·먹빛 승복 */
export function monkLook(k: number): Look {
  const skin = [0, 1, 2, 1, 2][k % 5];
  const tone = ['#e2b892', '#c99a72', '#a8774e', '#c99a72', '#7a5236'][k % 5];
  const robe = ['#6a6660', '#4a4844', '#8a7a5e', '#5a5650', '#7a6a50'][k % 5];
  return { sex: 'm', build: k % 3 === 0 ? 0 : 1, skin, hair: 5, hairColor: 0, top: 0, bottom: 0, cols: { 1: tone, 10: tone, 2: tone, 3: robe, 9: robe, 4: robe, 5: '#2a2622' } };
}

export function borderZone(name: string): Zone {
  const W = SHORE_W, H = SHORE_H;
  const tiles = new Uint8Array(W * H);
  for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) {
    const sea = j < shoreLine(i);
    tiles[j * W + i] = i === 0 || j === 0 ? TI.block : i === W - 1 || j === H - 1 ? TI.void : sea ? TI.water : TI.walk;
  }
  // 잔교 (바다 위를 걸을 수 있다)
  for (let j = PIER.j0; j < shoreLine(PIER.i0) + 1; j++) for (let i = PIER.i0; i < PIER.i1; i++) tiles[j * W + i] = TI.walk;
  const furn: Furn[] = [];
  const F = (i: number, j: number, w: number, d: number, h: number, kind: string, v = 0) => furn.push({ i, j, w, d, h, kind, v });
  const s0 = shoreLine(13);
  F(13, s0 + 1, 3, 1, 14, 'boat');                 // 엎어 놓은 고깃배 (불다의 배)
  F(17, s0 + 1, 1, 1, 34, 'netpole', 0); F(19, s0 + 2, 1, 1, 34, 'netpole', 1); // 그물 너는 장대
  // 떠밀려 온 잡동사니: 물가 젖은 모래를 따라
  for (const [i, v] of [[3, 0], [6, 1], [22, 2], [25, 3], [27, 4], [15, 5], [20, 6]] as const) F(i, shoreLine(i) + (i % 3 === 0 ? 1 : 0), 1, 1, 10, 'flot', v);
  F(4, shoreLine(4) + 3, 2, 1, 6, 'drift', 0); F(23, shoreLine(23) + 4, 2, 1, 6, 'drift', 1); // 떠밀려 온 통나무
  for (const f of furn) if (f.h > 6) for (let j = f.j; j < f.j + f.d; j++) for (let i = f.i; i < f.i + f.w; i++) tiles[j * W + i] = TI.block;
  const clerk = { i: PIER.i0 + 1, j: shoreLine(PIER.i0) + 1 };
  const counter = { i: PIER.i0 + 1, j: clerk.j + 2 };
  // 가부좌한 완성자들의 자리: 마른 모래 위, 바다를 바라보고
  const seats: [number, number][] = [[5, 15], [8, 19], [14, 17], [20, 14], [24, 19], [17, 22]];
  const info: InteriorInfo = {
    kind: 'shore', rest: true, name, floor: 'sand', wall: '#8a8296', trim: '#c8b89a',
    exit: { i: -9, j: -9 }, clerk, counter, furn, from: { b: -9, out: { i: 0, j: 0 } }, seats,
  };
  return finalize({ id: 'border-shore', W, H, tiles, buildings: [], props: [], lanes: [], door: { i: 15, j: H - 4 }, spawn: { i: 15, j: H - 4 }, interior: info });
}

type Pt = [number, number];
function painter(minX: number, minY: number, W: number, H: number) {
  const c = document.createElement('canvas');
  c.width = Math.ceil(W); c.height = Math.ceil(H);
  const g = c.getContext('2d')!;
  const P = (x: number, y: number, z: number): Pt => [(x - y) * (TW / 2) - minX, (x + y) * (TH / 2) - z - minY];
  const poly = (pts: Pt[], fill: string, alpha = 1) => {
    g.globalAlpha = alpha;
    g.beginPath(); g.moveTo(pts[0][0], pts[0][1]);
    for (const p of pts.slice(1)) g.lineTo(p[0], p[1]);
    g.closePath(); g.fillStyle = fill; g.fill();
    g.globalAlpha = 1;
  };
  return { c, g, P, poly };
}
const hsh = (a: number, b: number) => { const s = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return s - Math.floor(s); };

/** 저녁 하늘(화면 뒤): 위는 멍든 보라, 수평선 쪽은 꺼져 가는 살굿빛, 아래는 안개 낀 잿빛 */
export function shoreSkyCanvas(): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = 4; c.height = 256;
  const g = c.getContext('2d')!;
  const gr = g.createLinearGradient(0, 0, 0, 256);
  gr.addColorStop(0, '#2e2a3c'); gr.addColorStop(0.32, '#5a4c5e'); gr.addColorStop(0.5, '#a87a6a'); gr.addColorStop(0.58, '#7a6a72'); gr.addColorStop(1, '#3a3e46');
  g.fillStyle = gr; g.fillRect(0, 0, 4, 256);
  return c;
}

/** 해변 전체 (방 한 장): 수평선까지 이어진 바다 · 물가의 흰 거품과 젖은 모래 · 마른 모래 · 잔교 */
export function drawShore(z: Zone): { canvas: HTMLCanvasElement; x: number; y: number } {
  const W = z.W, H = z.H;
  const I0 = -14, I1 = W + 12, J0 = -14, J1 = H + 12;
  const minX = (I0 - J1) * (TW / 2), maxX = (I1 - J0) * (TW / 2);
  const minY = (I0 + J0) * (TH / 2) - 40, maxY = (I1 + J1) * (TH / 2);
  const { c, g, P, poly } = painter(minX, minY, maxX - minX, maxY - minY);
  const sl = (i: number) => shoreF(i);
  // 1) 바다: 한 빛깔로 깔고, 물가와 나란한 잔물결을 짧게 끊어서
  g.fillStyle = '#4a5a60'; g.fillRect(0, 0, c.width, c.height);
  g.lineWidth = 1;
  for (let k = 1; k < 18; k++) for (let i = I0; i < I1; i += 1.2) {
    if (hsh(i * 3, k) < 0.45) continue;
    const L = 0.4 + hsh(k, i) * 0.9;
    const jj = sl(i) - k * 1.1 + Math.sin(i + k) * 0.2;
    const [x0, y0] = P(i, jj, 0), [x1, y1] = P(i + L, jj, 0);
    g.strokeStyle = `rgba(196,204,210,${Math.max(0.03, 0.2 - k * 0.01)})`;
    g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke();
  }
  // 2) 모래: 물가를 따라 한 덩어리로 (칸 무늬 없이) → 큰 얼룩 · 고운 모래알 · 젖은 띠
  const shore: Pt[] = [];
  for (let i = I0; i <= I1; i += 0.25) shore.push(P(i, sl(i), 0));
  const beach = () => { g.beginPath(); g.moveTo(shore[0][0], shore[0][1]); for (const q of shore) g.lineTo(q[0], q[1]); const e = P(I1, J1, 0), f = P(I0, J1, 0); g.lineTo(e[0], e[1]); g.lineTo(f[0], f[1]); g.closePath(); };
  beach(); g.fillStyle = '#8c8272'; g.fill();
  g.save(); beach(); g.clip();
  for (let k = 0; k < 520; k++) {
    const i = I0 + hsh(k, 1) * (I1 - I0), j = sl(i) + 1 + hsh(k, 2) * (J1 - sl(i));
    const [x, y] = P(i, j, 0);
    g.globalAlpha = 0.05 + hsh(k, 3) * 0.05; g.fillStyle = hsh(k, 4) < 0.5 ? '#a89a84' : '#6e6658';
    g.beginPath(); g.ellipse(x, y, 18 + hsh(k, 5) * 50, 8 + hsh(k, 6) * 20, 0, 0, Math.PI * 2); g.fill();
  }
  g.globalAlpha = 1;
  for (let k = 0; k < 9000; k++) { const x = hsh(k, 7) * c.width, y = hsh(k, 8) * c.height; g.fillStyle = hsh(k, 9) < 0.5 ? 'rgba(60,52,44,0.35)' : 'rgba(200,190,170,0.3)'; g.fillRect(Math.round(x), Math.round(y), 1, 1); }
  // 젖은 띠: 물가에서 모래 쪽으로 번진다
  for (const [off, wdt, col] of [[0.9, 26, 'rgba(84,76,68,0.45)'], [0.45, 14, 'rgba(70,64,58,0.55)']] as const) {
    g.strokeStyle = col; g.lineWidth = wdt; g.lineJoin = 'round';
    g.beginPath(); for (let i = I0; i <= I1; i += 0.25) { const [x, y] = P(i, sl(i) + off, 0); if (i === I0) g.moveTo(x, y); else g.lineTo(x, y); } g.stroke();
  }
  for (let j = J0; j < J1; j++) for (let i = I0; i < I1; i++) {
    const d = j - sl(i);
    if (d < 0) continue;
    const n = hsh(i, j);
    if (d > 2 && n > 0.72) poly([P(i + 0.2, j + 0.4, 0), P(i + 0.8, j + 0.3, 0), P(i + 0.82, j + 0.35, 0), P(i + 0.22, j + 0.45, 0)], '#776c5c', 0.35); // 바람 자국
    if (d > 2 && n < 0.05) { const [x, y] = P(i + 0.5, j + 0.5, 0); g.fillStyle = '#d8ccb8'; g.fillRect(Math.round(x), Math.round(y), 2, 1); } // 조개
    if (d < 1.6 && n > 0.82) { const [x, y] = P(i + 0.4, j + 0.3, 0); g.fillStyle = '#2e3a26'; g.fillRect(Math.round(x) - 3, Math.round(y), 6, 2); g.fillRect(Math.round(x) - 1, Math.round(y) - 1, 3, 1); } // 해초
  }
  g.restore();
  // 물가의 흰 거품 (두 겹)
  for (const [off, a] of [[0.05, 0.85], [-0.45, 0.35]] as const) {
    g.strokeStyle = `rgba(226,228,230,${a})`; g.lineWidth = off === 0.05 ? 2 : 1;
    g.beginPath();
    for (let i = I0; i <= I1; i += 0.25) { const [x, y] = P(i, sl(i) + off + Math.sin(i * 2.3) * 0.08, 0); if (i === I0) g.moveTo(x, y); else g.lineTo(x, y); }
    g.stroke();
  }
  // 마른 모래 위 발자국 한 줄 (누군가 바다로 걸어 들어간)
  for (let k = 0; k < 9; k++) { const [x, y] = P(21 + k * 0.15 + (k % 2) * 0.3, 21 - k * 1.3, 0); g.fillStyle = 'rgba(80,70,60,0.55)'; g.fillRect(Math.round(x), Math.round(y), 3, 2); }
  // 3) 잔교: 바다 위 나무 널빤지와 말뚝
  const pj1 = shoreLine(PIER.i0) + 1;
  for (let j = PIER.j0; j < pj1; j++) for (let i = PIER.i0; i < PIER.i1; i++) {
    for (let s = 0; s < 3; s++) poly([P(i, j + s / 3, 4), P(i + 1, j + s / 3, 4), P(i + 1, j + (s + 0.9) / 3, 4), P(i, j + (s + 0.9) / 3, 4)], hsh(i * 3 + s, j) < 0.5 ? '#6a5442' : '#5e4a3a');
  }
  for (let j = PIER.j0; j < pj1; j += 2) for (const i of [PIER.i0, PIER.i1]) { const [x, y] = P(i, j, 4); g.fillStyle = '#3a2e24'; g.fillRect(Math.round(x) - 1, Math.round(y), 3, 12); }
  poly([P(PIER.i0, pj1, 4), P(PIER.i1, pj1, 4), P(PIER.i1, pj1, 0), P(PIER.i0, pj1, 0)], '#4a3a2e');
  // 4) 수평선 안개 (위로 갈수록 하늘에 녹는다)
  const fy = P(I0, J0, 0)[1];
  const gr = g.createLinearGradient(0, 0, 0, fy + 260);
  gr.addColorStop(0, 'rgba(110,98,112,1)'); gr.addColorStop(0.6, 'rgba(110,98,112,0.55)'); gr.addColorStop(1, 'rgba(110,98,112,0)');
  g.fillStyle = gr; g.fillRect(0, 0, c.width, fy + 260);
  return { canvas: c, x: minX, y: minY };
}

/** 해변의 물건: 엎은 고깃배 · 그물 장대 · 떠밀려 온 잡동사니 · 통나무 */
export function drawShoreFurn(f: Furn): { canvas: HTMLCanvasElement; x: number; y: number } {
  const { i, j, w, d, h } = f;
  const i1 = i + w, j1 = j + d;
  const extra = f.kind === 'netpole' ? 8 : 12;
  const minX = (i - j1) * (TW / 2) - 6, maxX = (i1 - j) * (TW / 2) + 6;
  const minY = (i + j) * (TH / 2) - h - extra, maxY = (i1 + j1) * (TH / 2) + 4;
  const { c, g, P, poly } = painter(minX, minY, maxX - minX, maxY - minY);
  const v = f.v ?? 0;
  if (f.kind === 'boat') {
    // 엎어 놓은 나무배: 둥근 바닥이 하늘을 본다. 벗겨진 푸른 칠, 따개비
    poly([P(i + 0.1, j + 0.15, 0), P(i1 - 0.1, j + 0.15, 0), P(i1 - 0.1, j1 - 0.15, 0), P(i + 0.1, j1 - 0.15, 0)], 'rgba(30,24,20,0.35)');
    for (let k = 0; k < 6; k++) {
      const t0 = k / 6, t1 = (k + 1) / 6;
      const zz = (t: number) => Math.sin(t * Math.PI) * h;
      const yy = (t: number) => j + 0.15 + t * (d - 0.3);
      poly([P(i + 0.2, yy(t0), zz(t0)), P(i1 - 0.2, yy(t0), zz(t0)), P(i1 - 0.2, yy(t1), zz(t1)), P(i + 0.2, yy(t1), zz(t1))], k % 2 ? '#3e5a66' : '#466670');
    }
    poly([P(i1 - 0.2, j + 0.15, 0), P(i1 - 0.2, j1 - 0.15, 0), P(i1, j1 - 0.3, h * 0.6), P(i1, j + 0.3, h * 0.6)], '#5a4a3c'); // 고물
    for (let k = 0; k < 14; k++) { const [x, y] = P(i + 0.4 + hsh(k, 1) * (w - 0.8), j + 0.3 + hsh(k, 2) * 0.4, h * 0.7); g.fillStyle = k % 3 ? '#8a7e6a' : '#c8bca8'; g.fillRect(Math.round(x), Math.round(y), 2, 1); }
    const [px, py] = P(i + 0.5, j1 - 0.1, 0); g.fillStyle = '#7a6a54'; g.fillRect(Math.round(px), Math.round(py) - 2, 18, 2); // 노
  } else if (f.kind === 'netpole') {
    const [x, y] = P(i + 0.5, j + 0.5, 0);
    g.fillStyle = '#4a3a2c'; g.fillRect(Math.round(x) - 1, Math.round(y) - h, 3, h);
    g.strokeStyle = 'rgba(120,128,110,0.8)'; g.lineWidth = 1;
    for (let k = 0; k < 7; k++) { g.beginPath(); g.moveTo(x + 1, y - h + 4 + k * 3); g.quadraticCurveTo(x + (v ? -16 : 16), y - h + 10 + k * 3, x + (v ? -30 : 30), y - h + 6 + k * 3); g.stroke(); }
    for (let k = 0; k < 6; k++) { g.beginPath(); g.moveTo(x + (v ? -k * 5 : k * 5), y - h + 4); g.lineTo(x + (v ? -k * 5 : k * 5) + (v ? -2 : 2), y - h + 24); g.stroke(); }
    g.fillStyle = '#c8402a'; g.fillRect(Math.round(x) + (v ? -24 : 20), Math.round(y) - h + 22, 4, 4); // 부표
  } else if (f.kind === 'drift') {
    const [ax, ay] = P(i + 0.1, j + 0.5, 3), [bx, by] = P(i1 - 0.1, j + 0.5, 3);
    g.strokeStyle = '#6e6252'; g.lineWidth = 6; g.lineCap = 'round'; g.beginPath(); g.moveTo(ax, ay); g.lineTo(bx, by); g.stroke();
    g.strokeStyle = '#8e8270'; g.lineWidth = 2; g.beginPath(); g.moveTo(ax, ay - 2); g.lineTo(bx, by - 2); g.stroke();
    g.strokeStyle = '#5a4e40'; g.lineWidth = 2; g.beginPath(); g.moveTo(ax + 8, ay); g.lineTo(ax + 2, ay - 9); g.stroke();
  } else {
    // flot: 떠밀려 온 잡동사니 — 타이어 · 깨진 플라스틱 의자 · 나무 상자 · 병 무더기 · 그물 뭉치 · 뒤집힌 텔레비전 · 슬리퍼 한 짝
    const [x, y] = P(i + 0.5, j + 0.5, 0);
    const X = Math.round(x), Y = Math.round(y);
    g.fillStyle = 'rgba(30,24,20,0.3)'; g.beginPath(); g.ellipse(X, Y + 1, 12, 4, 0, 0, Math.PI * 2); g.fill();
    if (v === 0) { g.fillStyle = '#1e1c1c'; g.beginPath(); g.ellipse(X, Y - 3, 10, 6, 0, 0, Math.PI * 2); g.fill(); g.fillStyle = '#5e5a52'; g.beginPath(); g.ellipse(X, Y - 4, 4, 2.4, 0, 0, Math.PI * 2); g.fill(); g.fillStyle = '#34302e'; g.fillRect(X - 9, Y - 4, 3, 1); }
    else if (v === 1) { g.fillStyle = '#b8b2a4'; g.fillRect(X - 7, Y - 10, 12, 3); g.fillRect(X - 7, Y - 10, 2, 10); g.fillRect(X + 3, Y - 8, 2, 8); g.fillStyle = '#9a9488'; g.fillRect(X - 6, Y - 16, 10, 6); }
    else if (v === 2) { g.fillStyle = '#7a5a3a'; g.fillRect(X - 8, Y - 10, 16, 10); g.fillStyle = '#5e4630'; g.fillRect(X - 8, Y - 6, 16, 1); g.fillRect(X - 8, Y - 2, 16, 1); g.fillStyle = '#3a2c20'; g.fillRect(X + 3, Y - 10, 2, 10); }
    else if (v === 3) { for (let k = 0; k < 5; k++) { g.fillStyle = k % 2 ? '#3a5a3a' : '#6a8a8a'; g.fillRect(X - 8 + k * 3, Y - 4 - (k % 2) * 2, 2, 5); } g.fillStyle = '#c8b88a'; g.fillRect(X + 4, Y - 2, 4, 2); }
    else if (v === 4) { g.fillStyle = '#4a5a4a'; for (let k = 0; k < 12; k++) g.fillRect(X - 9 + Math.round(hsh(k, 9) * 16), Y - 6 + Math.round(hsh(k, 8) * 6), 3, 1); g.fillStyle = '#c8402a'; g.fillRect(X + 4, Y - 7, 3, 3); }
    else if (v === 5) { g.fillStyle = '#2a2a2e'; g.fillRect(X - 8, Y - 12, 16, 12); g.fillStyle = '#4a4e56'; g.fillRect(X - 6, Y - 10, 12, 8); g.fillStyle = '#7a8a9a'; g.fillRect(X - 5, Y - 9, 3, 2); }
    else { g.fillStyle = '#3a6ab0'; g.fillRect(X - 5, Y - 3, 9, 3); g.fillStyle = '#e8e4da'; g.fillRect(X - 3, Y - 4, 4, 1); }
  }
  return { canvas: c, x: minX, y: minY };
}

/** 바다에 엎드려 떠 있는 익사체 (화면 그림, 2배 크기 · 반으로 줄여 쓴다) */
export function drownedCanvas(v: number): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = 96; c.height = 40;
  const g = c.getContext('2d')!;
  const shirt = ['#5a6a7a', '#7a5a4a', '#8a8478', '#4a5a4a'][v % 4];
  const skin = ['#b8aaa0', '#a89a92', '#9a8e88', '#c2b4aa'][v % 4];
  g.fillStyle = 'rgba(20,30,34,0.35)'; g.beginPath(); g.ellipse(48, 24, 40, 10, 0, 0, Math.PI * 2); g.fill();
  // 팔을 벌리고 엎드린 몸: 등 · 머리(검은 머리칼이 물에 퍼짐) · 두 팔 · 다리는 물에 잠겨 흐리게
  g.fillStyle = shirt; g.beginPath(); g.ellipse(46, 20, 15, 7, -0.12, 0, Math.PI * 2); g.fill();
  g.fillStyle = skin; g.fillRect(16, 16, 20, 4); g.fillRect(56, 18, 22, 4); g.fillRect(12, 15, 5, 5); g.fillRect(77, 17, 5, 5);
  g.fillStyle = '#1a1614'; g.beginPath(); g.ellipse(64, 15, 7, 5, 0, 0, Math.PI * 2); g.fill();
  for (let k = 0; k < 6; k++) g.fillRect(64 + k * 2, 11 + (k % 3), 3, 1);
  g.globalAlpha = 0.45; g.fillStyle = '#4a4a50'; g.fillRect(22, 22, 14, 4); g.fillRect(22, 26, 12, 3); g.globalAlpha = 1;
  // 물이 몸 가장자리를 덮는다
  g.strokeStyle = 'rgba(210,216,222,0.55)'; g.lineWidth = 1;
  g.beginPath(); g.ellipse(48, 21, 36, 9, 0, 0.1, Math.PI - 0.1); g.stroke();
  return c;
}
