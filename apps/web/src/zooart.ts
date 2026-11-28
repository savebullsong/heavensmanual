// 51차 천국 동물원의 동물: 사람 키에 맞춘 크기(조금 크게) · 부드러운 그늘 · 가는 윤곽선 · 걷는 동작(다리 넷이 엇갈려 움직인다)
// 그림은 오른쪽을 본다 (왼쪽으로 걸을 때는 뒤집는다). 칸 0 = 서 있음 · 1~8 = 걷기 · 9 = 쉬는 모습(풀 뜯기 · 엎드리기 · 앉아 먹기)
import { Texture } from 'pixi.js';

export const ZOO_FRAMES = 10; // 0 서 있음 · 1~8 걷기 · 9 쉬는 모습
type G = CanvasRenderingContext2D;
interface Spec { w: number; h: number; ax: number; ay: number; draw: (g: G, ph: number, mode: 'stand' | 'walk' | 'rest') => void }

const ell = (g: G, x: number, y: number, rx: number, ry: number, col: string | CanvasGradient, rot = 0) => { g.fillStyle = col; g.beginPath(); g.ellipse(x, y, Math.max(0.1, rx), Math.max(0.1, ry), rot, 0, Math.PI * 2); g.fill(); };
/** 몸통처럼 둥근 덩어리: 위가 밝고 아래가 어두운 결 + 가는 윤곽 */
function blob(g: G, x: number, y: number, rx: number, ry: number, light: string, dark: string, line: string, rot = 0) {
  const gr = g.createLinearGradient(0, y - ry, 0, y + ry);
  gr.addColorStop(0, light); gr.addColorStop(1, dark);
  g.beginPath(); g.ellipse(x, y, rx, ry, rot, 0, Math.PI * 2);
  g.fillStyle = gr; g.fill(); g.strokeStyle = line; g.lineWidth = 1; g.stroke();
}
function shape(g: G, pts: [number, number][], fill: string | CanvasGradient, line: string) {
  g.beginPath(); pts.forEach(([x, y], n) => (n ? g.lineTo(x, y) : g.moveTo(x, y))); g.closePath();
  g.fillStyle = fill; g.fill(); g.strokeStyle = line; g.lineWidth = 1; g.lineJoin = 'round'; g.stroke();
}
function vgrad(g: G, y0: number, y1: number, a: string, b: string) { const gr = g.createLinearGradient(0, y0, 0, y1); gr.addColorStop(0, a); gr.addColorStop(1, b); return gr; }
/**
 * 다리 하나: 엉덩이(hx, hy)에서 땅(gy)까지 — 걸음 위상 p(라디안)에 따라 앞뒤로 흔들리고, 앞으로 내딛을 땐 발이 들리며 무릎이 굽는다
 * kneeBack: 뒷다리는 무릎(발목)이 뒤로 꺾인다
 */
function leg(g: G, hx: number, hy: number, gy: number, w0: number, w1: number, col: string, line: string, hoof: string, p: number, swing: number, lift: number, kneeBack = false) {
  const s = Math.sin(p), up = Math.max(0, Math.cos(p));
  const fx = hx + s * swing, fy = gy - up * lift;
  const kx = hx + s * swing * 0.45 + (kneeBack ? -1 : 1) * (2 + up * 3), ky = hy + (fy - hy) * 0.5;
  g.lineCap = 'round'; g.lineJoin = 'round';
  g.strokeStyle = line; g.lineWidth = w0 + 1.6; g.beginPath(); g.moveTo(hx, hy); g.lineTo(kx, ky); g.stroke();
  g.lineWidth = w1 + 1.6; g.beginPath(); g.moveTo(kx, ky); g.lineTo(fx, fy - 1); g.stroke();
  g.strokeStyle = col; g.lineWidth = w0; g.beginPath(); g.moveTo(hx, hy); g.lineTo(kx, ky); g.stroke();
  g.lineWidth = w1; g.beginPath(); g.moveTo(kx, ky); g.lineTo(fx, fy - 1); g.stroke();
  g.fillStyle = hoof; g.fillRect(Math.round(fx - w1 / 2 - 0.5), Math.round(fy - 2), Math.round(w1 + 1), 2);
}
const mix = (a: string, b: string, t: number) => { const p = (h: string) => [1, 3, 5].map((o) => parseInt(h.slice(o, o + 2), 16)); const x = p(a), y = p(b); return `rgb(${x.map((v, n) => Math.round(v + (y[n] - v) * t)).join(',')})`; };

const SPECS: Record<string, Spec> = {
  // 기린: 사람의 세 배 · 긴 목 · 갈색 그물 무늬 · 짧은 뿔
  giraffe: { w: 96, h: 156, ax: 40, ay: 152, draw: (g, ph, mode) => {
    const Y = '#dcaa62', YL = '#f0cc8e', S = '#8a5226', O = '#6a4220', GY = 152;
    const walk = mode === 'walk', sw = walk ? 5 : 0, li = walk ? 4 : 0, bob = walk ? Math.abs(Math.sin(ph)) * 1.2 : 0;
    ell(g, 40, GY, 24, 4, 'rgba(60,50,40,0.18)');
    leg(g, 26, 96 - bob, GY, 4, 3, mix(Y, '#000000', 0.18), O, '#3a2a1a', ph + Math.PI, sw, li, true);
    leg(g, 50, 94 - bob, GY, 4, 3, mix(Y, '#000000', 0.18), O, '#3a2a1a', ph, sw, li);
    blob(g, 38, 90 - bob, 21, 12, YL, Y, O, -0.12);
    for (const [x, y, r] of [[26, 88, 3.6], [34, 84, 3.8], [43, 86, 3.6], [30, 95, 3.2], [40, 94, 3.4], [50, 90, 3], [21, 93, 2.6]] as [number, number, number][]) ell(g, x, y - bob, r, r * 0.8, S);
    // 목 · 머리
    const nod = walk ? Math.sin(ph) * 1.5 : 0;
    shape(g, [[48, 86 - bob], [54, 78 - bob], [64 + nod, 24], [72 + nod, 22], [70 + nod, 32], [60, 88 - bob]], vgrad(g, 20, 90, YL, Y), O);
    g.strokeStyle = '#9a5a26'; g.lineWidth = 2; g.beginPath(); g.moveTo(53, 80 - bob); g.lineTo(64 + nod, 26); g.stroke();
    for (const [x, y] of [[58, 70], [60, 58], [62, 46], [64, 36]] as [number, number][]) ell(g, x + nod * (1 - y / 90), y - bob * (y / 90), 2.6, 2.2, S);
    shape(g, [[64 + nod, 24], [70 + nod, 15], [82 + nod, 17], [86 + nod, 22], [80 + nod, 27], [70 + nod, 28]], vgrad(g, 14, 28, YL, Y), O);
    g.fillStyle = O; g.fillRect(68 + nod, 9, 2, 7); g.fillRect(72 + nod, 9, 2, 7); ell(g, 69 + nod, 9, 1.8, 1.4, '#3a2410'); ell(g, 73 + nod, 9, 1.8, 1.4, '#3a2410');
    ell(g, 66 + nod, 17, 3.4, 1.5, Y, -0.5); ell(g, 76 + nod, 19, 1.3, 1.3, '#1a0e06'); ell(g, 85 + nod, 22, 1, 0.8, '#3a2410');
    leg(g, 30, 97 - bob, GY, 4.5, 3.2, Y, O, '#3a2a1a', ph, sw, li, true);
    leg(g, 54, 95 - bob, GY, 4.5, 3.2, Y, O, '#3a2a1a', ph + Math.PI, sw, li);
    g.strokeStyle = O; g.lineWidth = 1.2; g.beginPath(); g.moveTo(18, 86 - bob); g.quadraticCurveTo(13 + Math.sin(ph * 0.5) * 2, 98, 15, 108); g.stroke(); ell(g, 15, 110, 1.6, 2.6, '#3a2410');
  } },
  // 코끼리: 사람의 두 배 · 큰 귀 · 늘어진 코 (쉬는 모습은 코를 들어 올린다)
  elephant: { w: 118, h: 100, ax: 56, ay: 96, draw: (g, ph, mode) => {
    const C = '#9a969e', L = '#bab6be', D = '#6e6a74', O = '#4a464e', GY = 96;
    const walk = mode === 'walk', sw = walk ? 4 : 0, li = walk ? 3 : 0, bob = walk ? Math.abs(Math.sin(ph)) * 1 : 0;
    ell(g, 56, GY, 40, 6, 'rgba(60,60,70,0.18)');
    leg(g, 30, 64 - bob, GY, 10, 9, D, O, '#d8d2c8', ph + Math.PI, sw, li, true);
    leg(g, 72, 64 - bob, GY, 10, 9, D, O, '#d8d2c8', ph, sw, li);
    blob(g, 50, 52 - bob, 34, 24, L, C, O);
    ell(g, 44, 38 - bob, 22, 6, 'rgba(255,255,255,0.18)');
    // 머리 · 코
    blob(g, 86, 46 - bob, 15, 15, L, C, O);
    const up = mode === 'rest';
    g.lineCap = 'round';
    g.strokeStyle = O; g.lineWidth = 9; g.beginPath(); g.moveTo(96, 50 - bob);
    if (up) g.bezierCurveTo(108, 44, 112, 26, 104, 18); else g.bezierCurveTo(104 + Math.sin(ph) * 1.5, 62, 102, 74, 98 + Math.sin(ph) * 2, 84);
    g.stroke(); g.strokeStyle = C; g.lineWidth = 7; g.stroke();
    for (let k = 0; k < 6; k++) { const t2 = k / 6; g.strokeStyle = D; g.lineWidth = 0.8; g.beginPath(); const y = up ? 46 - t2 * 26 : 56 + t2 * 26; const x = up ? 100 + t2 * 6 : 100 + Math.sin(t2 * 2) * 2; g.moveTo(x - 3, y); g.lineTo(x + 3, y); g.stroke(); }
    shape(g, [[92, 56 - bob], [97, 58 - bob], [95, 66 - bob], [91, 62 - bob]], '#f4eee2', '#b8ae9c'); // 상아
    shape(g, [[70, 32 - bob], [82, 30 - bob], [86, 50 - bob], [80, 66 - bob], [70, 60 - bob], [66, 44 - bob]], vgrad(g, 30, 66, mix(C, '#000000', 0.08), D), O); // 귀
    ell(g, 90, 40 - bob, 1.6, 1.6, '#1a1a20'); ell(g, 89.5, 39.5 - bob, 0.5, 0.5, '#ffffff');
    leg(g, 36, 66 - bob, GY, 11, 10, C, O, '#e8e2d8', ph, sw, li, true);
    leg(g, 78, 66 - bob, GY, 11, 10, C, O, '#e8e2d8', ph + Math.PI, sw, li);
    g.strokeStyle = O; g.lineWidth = 1.4; g.beginPath(); g.moveTo(17, 48 - bob); g.quadraticCurveTo(11 + Math.sin(ph) * 2, 58, 12, 68); g.stroke();
  } },
  // 사자: 사람 허리쯤 · 짙은 갈기 · 꼬리 끝 털뭉치 (쉬면 엎드린다)
  lion: { w: 84, h: 58, ax: 40, ay: 54, draw: (g, ph, mode) => {
    const C = '#c8964e', L = '#e4bc78', B = '#ead0a0', M = '#7a4a1c', M2 = '#9e6426', O = '#5a3814', GY = 54;
    const walk = mode === 'walk', rest = mode === 'rest', sw = walk ? 4 : 0, li = walk ? 3 : 0, bob = walk ? Math.abs(Math.sin(ph)) * 1 : 0;
    ell(g, 40, GY, 28, 4, 'rgba(60,50,40,0.18)');
    const by = rest ? 42 : 32 - bob;
    if (!rest) { leg(g, 22, by + 6, GY, 5, 4, mix(C, '#000000', 0.2), O, '#4a2a10', ph + Math.PI, sw, li, true); leg(g, 52, by + 6, GY, 5, 4, mix(C, '#000000', 0.2), O, '#4a2a10', ph, sw, li); }
    blob(g, 38, by, 24, rest ? 9 : 10, L, C, O);
    ell(g, 38, by + 5, 16, 3, B);
    if (rest) { shape(g, [[52, 48], [70, 48], [72, 52], [52, 52]], C, O); shape(g, [[16, 46], [26, 46], [24, 52], [14, 52]], C, O); }
    // 꼬리
    g.strokeStyle = O; g.lineWidth = 1.6; g.beginPath(); g.moveTo(15, by - 2); g.quadraticCurveTo(6, by - 10 + Math.sin(ph) * 2, 4, by - 16 + (rest ? 18 : 0)); g.stroke(); ell(g, 4, by - 17 + (rest ? 18 : 0), 2.4, 3, M);
    // 갈기 · 얼굴
    const hx = 62, hy = by - 8 + (rest ? 4 : 0);
    g.fillStyle = M; g.beginPath(); for (let k = 0; k <= 16; k++) { const a = (k / 16) * Math.PI * 2, rr = k % 2 ? 11.5 : 14; g.lineTo(hx + Math.cos(a) * rr, hy + Math.sin(a) * rr * 0.95); } g.closePath(); g.fill(); g.strokeStyle = O; g.lineWidth = 1; g.stroke();
    ell(g, hx - 1, hy - 1, 10, 10, M2);
    shape(g, [[hx - 2, hy - 7], [hx + 8, hy - 6], [hx + 12, hy + 1], [hx + 9, hy + 7], [hx + 1, hy + 7], [hx - 4, hy + 1]], vgrad(g, hy - 7, hy + 7, L, C), O);
    ell(g, hx + 9, hy + 3, 3, 2.2, B); ell(g, hx + 11, hy + 1, 1.4, 1, '#3a1a0a'); ell(g, hx + 4, hy - 2, 1.2, 1.2, '#1a0e06');
    ell(g, hx - 1, hy - 8, 2.4, 2.2, C);
    if (!rest) { leg(g, 26, by + 6, GY, 5.5, 4.5, C, O, '#4a2a10', ph, sw, li, true); leg(g, 56, by + 6, GY, 5.5, 4.5, C, O, '#4a2a10', ph + Math.PI, sw, li); }
  } },
  // 얼룩말: 사람 어깨쯤 · 몸을 감는 줄무늬 · 짧게 선 갈기 (쉬면 고개를 숙여 풀을 뜯는다)
  zebra: { w: 80, h: 66, ax: 38, ay: 62, draw: (g, ph, mode) => {
    const W0 = '#f6f4ec', K = '#1e1e24', O = '#2a2a30', GY = 62;
    const walk = mode === 'walk', graze = mode === 'rest', sw = walk ? 4 : 0, li = walk ? 3 : 0, bob = walk ? Math.abs(Math.sin(ph)) * 1 : 0;
    ell(g, 38, GY, 24, 4, 'rgba(60,60,70,0.16)');
    const stripeLeg = (x: number, y0: number) => { g.fillStyle = K; for (let y = y0 + 4; y < GY - 3; y += 4) g.fillRect(x - 2, y, 4, 1.6); };
    leg(g, 22, 36 - bob, GY, 4, 3, '#d8d6ce', O, K, ph + Math.PI, sw, li, true); stripeLeg(22, 36);
    leg(g, 50, 36 - bob, GY, 4, 3, '#d8d6ce', O, K, ph, sw, li); stripeLeg(50, 36);
    const by = 32 - bob;
    g.save(); g.beginPath(); g.ellipse(36, by, 21, 10, 0, 0, Math.PI * 2); g.closePath(); g.fillStyle = vgrad(g, by - 10, by + 10, '#ffffff', '#e2e0d8'); g.fill(); g.clip();
    g.strokeStyle = K; g.lineWidth = 2.2; for (let x = 18; x < 58; x += 5) { g.beginPath(); g.moveTo(x, by - 12); g.quadraticCurveTo(x + 3, by, x - 1, by + 12); g.stroke(); }
    g.restore(); g.strokeStyle = O; g.lineWidth = 1; g.beginPath(); g.ellipse(36, by, 21, 10, 0, 0, Math.PI * 2); g.stroke();
    // 목 · 머리 (풀 뜯을 땐 아래로)
    const hx = graze ? 62 : 64, hy = graze ? 54 : 12;
    shape(g, [[50, by - 6], [56, by - 9], [hx + 2, hy - 2], [hx + 6, hy + 2], [58, by + 4], [52, by + 4]], vgrad(g, hy, by + 4, '#ffffff', '#e8e6de'), O);
    g.strokeStyle = K; g.lineWidth = 2; for (let k = 0; k < 4; k++) { const t2 = (k + 0.5) / 4; g.beginPath(); g.moveTo(52 + (hx - 50) * t2 - 2, by - 8 + (hy - by + 8) * t2); g.lineTo(56 + (hx - 52) * t2 + 2, by + 2 + (hy - by) * t2); g.stroke(); }
    g.strokeStyle = K; g.lineWidth = 2.6; g.beginPath(); g.moveTo(52, by - 8); g.lineTo(hx, hy - 3); g.stroke(); // 갈기
    shape(g, graze ? [[hx - 2, hy - 2], [hx + 6, hy - 4], [hx + 10, hy + 4], [hx + 6, hy + 6], [hx, hy + 3]] : [[hx - 2, hy - 3], [hx + 6, hy - 4], [hx + 13, hy + 2], [hx + 12, hy + 6], [hx + 4, hy + 6], [hx - 1, hy + 3]], '#f4f2ea', O);
    ell(g, graze ? hx + 8 : hx + 11, graze ? hy + 4 : hy + 4, 3, 2.4, K); ell(g, hx + 3, hy - 1, 1.1, 1.1, '#0a0a0e');
    g.fillStyle = K; g.fillRect(hx, hy - 7, 2, 4);
    leg(g, 26, 37 - bob, GY, 4.4, 3.4, W0, O, K, ph, sw, li, true); stripeLeg(26, 37);
    leg(g, 54, 37 - bob, GY, 4.4, 3.4, W0, O, K, ph + Math.PI, sw, li); stripeLeg(54, 37);
    g.strokeStyle = O; g.lineWidth = 1.2; g.beginPath(); g.moveTo(15, by - 2); g.quadraticCurveTo(10 + Math.sin(ph) * 2, by + 6, 11, by + 14); g.stroke(); ell(g, 11, by + 15, 1.6, 2.4, K);
  } },
  // 홍학: 사람 가슴께 · 분홍 몸 · S자 목 · 굽은 부리 (쉬면 한 다리로 서서 고개를 날개에 묻는다)
  flamingo: { w: 40, h: 54, ax: 18, ay: 51, draw: (g, ph, mode) => {
    const P1 = '#f4a6b0', P2 = '#e47c8c', O = '#a8485a', LG = '#d86c7c', GY = 51;
    const walk = mode === 'walk', rest = mode === 'rest';
    ell(g, 18, GY, 9, 2.4, 'rgba(60,40,50,0.14)');
    g.lineCap = 'round'; g.strokeStyle = LG; g.lineWidth = 1.6;
    const s1 = walk ? Math.sin(ph) * 4 : 0, s2 = walk ? Math.sin(ph + Math.PI) * 4 : 0;
    g.beginPath(); g.moveTo(17, 30); g.lineTo(17 + s1 * 0.5, 41); g.lineTo(17 + s1, GY - (walk ? Math.max(0, Math.cos(ph)) * 3 : 0)); g.stroke();
    if (rest) { g.beginPath(); g.moveTo(20, 30); g.lineTo(25, 37); g.lineTo(18, 40); g.stroke(); }
    else { g.beginPath(); g.moveTo(20, 30); g.lineTo(20 + s2 * 0.5, 41); g.lineTo(20 + s2, GY - (walk ? Math.max(0, Math.cos(ph + Math.PI)) * 3 : 0)); g.stroke(); }
    blob(g, 18, 26, 10, 6, P1, P2, O, -0.15);
    shape(g, [[9, 25], [16, 22], [25, 24], [22, 29], [12, 30]], P2, O);
    if (rest) { ell(g, 24, 21, 4, 3.4, P1); g.strokeStyle = P1; g.lineWidth = 3; g.beginPath(); g.moveTo(26, 24); g.quadraticCurveTo(30, 20, 26, 19); g.stroke(); }
    else {
      const nod = walk ? Math.sin(ph) * 1 : 0;
      g.strokeStyle = O; g.lineWidth = 3.6; g.beginPath(); g.moveTo(25, 24); g.bezierCurveTo(31, 16, 20, 12, 25 + nod, 5); g.stroke();
      g.strokeStyle = P1; g.lineWidth = 2.6; g.stroke();
      ell(g, 26 + nod, 5, 3.2, 2.6, P1);
      shape(g, [[28 + nod, 4], [34 + nod, 6], [33 + nod, 10], [30 + nod, 8]], '#f4ece0', O); shape(g, [[31.5 + nod, 7], [34 + nod, 6], [33 + nod, 10]], '#1a1a1e', '#1a1a1e');
      ell(g, 26 + nod, 4, 0.8, 0.8, '#1a1a1e');
    }
  } },
  // 판다: 네 발로 어슬렁 · 쉬면 앉아서 대나무를 씹는다
  panda: { w: 64, h: 48, ax: 30, ay: 44, draw: (g, ph, mode) => {
    const W0 = '#f6f4ec', K = '#1e1e24', O = '#2a2a30', GY = 44;
    const walk = mode === 'walk', rest = mode === 'rest', sw = walk ? 3 : 0, li = walk ? 2 : 0, bob = walk ? Math.abs(Math.sin(ph)) * 0.8 : 0;
    ell(g, 30, GY, 20, 3.4, 'rgba(60,60,70,0.16)');
    if (rest) {
      ell(g, 20, 38, 8, 6, K); ell(g, 38, 39, 7, 5, K);
      blob(g, 28, 28, 13, 12, '#ffffff', '#e6e4dc', O);
      ell(g, 28, 22, 14, 4.5, K);
      g.strokeStyle = '#3a7a3a'; g.lineWidth = 2.2; g.beginPath(); g.moveTo(44, 40); g.lineTo(50, 8); g.stroke();
      g.fillStyle = '#5aa04a'; g.beginPath(); g.ellipse(53, 10, 6, 2, -0.6, 0, Math.PI * 2); g.fill();
      ell(g, 40, 26, 4, 6, K);
      blob(g, 36, 13, 10, 9, '#ffffff', '#eceae2', O); ell(g, 29, 6, 3.4, 3, K); ell(g, 43, 6, 3.4, 3, K);
      ell(g, 33, 13, 2.6, 3.2, K, 0.5); ell(g, 40, 13, 2.6, 3.2, K, -0.5); ell(g, 33.5, 12.5, 0.7, 0.7, '#ffffff'); ell(g, 39.5, 12.5, 0.7, 0.7, '#ffffff'); ell(g, 36.5, 17, 1.6, 1.1, K);
      return;
    }
    leg(g, 18, 30 - bob, GY, 5, 4.5, K, O, K, ph + Math.PI, sw, li, true);
    leg(g, 40, 30 - bob, GY, 5, 4.5, K, O, K, ph, sw, li);
    blob(g, 28, 27 - bob, 17, 10, '#ffffff', '#e2e0d8', O);
    ell(g, 37, 25 - bob, 6, 9, K, -0.2); // 어깨 띠
    blob(g, 47, 22 - bob, 9, 8, '#ffffff', '#eceae2', O); ell(g, 42, 15 - bob, 2.8, 2.6, K); ell(g, 51, 15 - bob, 2.8, 2.6, K);
    ell(g, 46, 21 - bob, 2.2, 2.8, K, 0.5); ell(g, 51, 21 - bob, 2.2, 2.8, K, -0.5); ell(g, 46.4, 20.5 - bob, 0.6, 0.6, '#fff'); ell(g, 50.6, 20.5 - bob, 0.6, 0.6, '#fff'); ell(g, 54, 24 - bob, 1.6, 1.1, K);
    leg(g, 22, 31 - bob, GY, 5.5, 5, K, O, K, ph, sw, li, true);
    leg(g, 44, 31 - bob, GY, 5.5, 5, K, O, K, ph + Math.PI, sw, li);
    ell(g, 11, 26 - bob, 2.4, 2.4, W0);
  } },
};

const cache = new Map<string, { frames: Texture[]; ax: number; ay: number }>();
/** 동물 한 종의 그림 칸 열 (0 서 있음 · 1~8 걷기 · 9 쉬는 모습) */
export function animalFrames(kind: string): { frames: Texture[]; ax: number; ay: number } | null {
  const hit = cache.get(kind);
  if (hit) return hit;
  const sp = SPECS[kind];
  if (!sp) return null;
  const frames: Texture[] = [];
  for (let f = 0; f < ZOO_FRAMES; f++) {
    const c = document.createElement('canvas'); c.width = sp.w; c.height = sp.h;
    const g = c.getContext('2d')!;
    sp.draw(g, f >= 1 && f <= 8 ? ((f - 1) / 8) * Math.PI * 2 : 0, f === 0 ? 'stand' : f === 9 ? 'rest' : 'walk');
    const t = Texture.from(c); t.source.scaleMode = 'linear';
    frames.push(t);
  }
  const out = { frames, ax: sp.ax / sp.w, ay: sp.ay / sp.h };
  cache.set(kind, out);
  return out;
}
/** 정지 그림 (가게 · 목록 등에서 한 장만 쓸 때) */
export function animalStill(kind: string): HTMLCanvasElement | null {
  const sp = SPECS[kind];
  if (!sp) return null;
  const c = document.createElement('canvas'); c.width = sp.w; c.height = sp.h;
  sp.draw(c.getContext('2d')!, 0, 'stand');
  return c;
}
