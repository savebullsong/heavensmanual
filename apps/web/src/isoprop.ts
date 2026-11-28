// 52차 후속: 식당 바깥 자리(탁자 + 의자 넷)와 노점 손수레를 정면 그림이 아니라 쿼터뷰 입체로 그린다.
//   (정면으로 납작하게 그려 두니 바닥 위에 선 표지판 · 바리케이드처럼 보였다)
// 좌표: 칸 한가운데 바닥이 (cx, cy). i 한 칸 = 화면 (+32, +16), j 한 칸 = (−32, +16), 높이 1 = 위로 1점.
type Pt = [number, number];
type G = CanvasRenderingContext2D;
type P3 = (i: number, j: number, z?: number) => Pt;
const SQ = Math.SQRT2;

const isoAt = (cx: number, cy: number): P3 => (i, j, z = 0) => [cx + (i - j) * 32, cy + (i + j) * 16 - z];
function poly(g: G, pts: Pt[], fill: string, line?: string, lw = 1) {
  g.beginPath(); pts.forEach(([x, y], n) => (n ? g.lineTo(x, y) : g.moveTo(x, y))); g.closePath();
  g.fillStyle = fill; g.fill();
  if (line) { g.strokeStyle = line; g.lineWidth = lw; g.lineJoin = 'round'; g.stroke(); }
}
function ell(g: G, x: number, y: number, rx: number, ry: number, fill: string) {
  g.fillStyle = fill; g.beginPath(); g.ellipse(x, y, Math.max(0.5, rx), Math.max(0.5, ry), 0, 0, Math.PI * 2); g.fill();
}
function seg(g: G, a: Pt, b: Pt, col: string, w = 1) {
  g.strokeStyle = col; g.lineWidth = w; g.lineCap = 'round'; g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.stroke();
}
/** 상자 i0..i1 × j0..j1 × z0..z1 — 보이는 면: 왼쪽 아래(+j 면) · 오른쪽 아래(+i 면) · 위 */
function box(g: G, P: P3, i0: number, j0: number, i1: number, j1: number, z0: number, z1: number, top: string, left: string, right: string, line?: string) {
  poly(g, [P(i0, j1, z0), P(i1, j1, z0), P(i1, j1, z1), P(i0, j1, z1)], left, line);
  poly(g, [P(i1, j0, z0), P(i1, j1, z0), P(i1, j1, z1), P(i1, j0, z1)], right, line);
  poly(g, [P(i0, j0, z1), P(i1, j0, z1), P(i1, j1, z1), P(i0, j1, z1)], top, line);
}
/** 바닥에 누운 원 (반지름 r칸)의 화면 크기 */
const rxOf = (r: number) => r * 32 * SQ, ryOf = (r: number) => r * 16 * SQ;

// ───────────────────────── 탁자와 의자 ─────────────────────────
const STOOL = {
  red: ['#7e1610', '#c8281e', '#e8493a', '#f47a68'],
  blue: ['#183a7a', '#2a5ac0', '#4a7ae0', '#86aaf0'],
  green: ['#1e5a32', '#2e8a4a', '#4ab06a', '#8ad8a0'],
};
/** 방콕 골목 식당의 빨간 플라스틱 의자: 다리 넷이 아래로 벌어지고, 다리 사이가 아치로 뚫리고, 앉는 판 한가운데 손잡이 구멍 */
function stool(g: G, P: P3, i: number, j: number, c: string[]) {
  const [x, y] = P(i, j, 0);
  const rx = rxOf(0.15), ry = ryOf(0.15), h = 11;
  ell(g, x, y + 1, rx + 1.5, ry + 1, 'rgba(0,0,0,0.16)');
  poly(g, [[x - rx + 0.5, y - h], [x + rx - 0.5, y - h], [x + rx + 1, y], [x - rx - 1, y]], c[1]);
  g.fillStyle = c[3]; g.fillRect(Math.round(x - rx + 1), y - h, 1, h - 1);
  for (const s of [-1, 1]) {
    const ax = x + s * rx * 0.5;
    g.fillStyle = c[0]; g.beginPath(); g.moveTo(ax - 2, y + 0.5); g.lineTo(ax - 2, y - 4); g.quadraticCurveTo(ax, y - 7.5, ax + 2, y - 4); g.lineTo(ax + 2, y + 0.5); g.closePath(); g.fill();
  }
  ell(g, x, y - h, rx, ry, c[2]);
  ell(g, x - 1.2, y - h - 0.6, rx * 0.55, ry * 0.45, c[3]);
  ell(g, x, y - h, 1.8, 0.9, c[0]);
}
/** 천국 카페 의자: 금빛 다리 · 흰 방석 · 둥근 등받이 (등받이는 탁자 반대쪽) */
function hchair(g: G, P: P3, i: number, j: number, di: number, dj: number) {
  const [x, y] = P(i, j, 0);
  const rx = rxOf(0.15), ry = ryOf(0.15), h = 10, gold = '#c9a23e', goldL = '#e8c86a';
  const back = () => {
    const pi = -dj, pj = di, b = 0.13;
    const a0 = P(i + di * b + pi * 0.1, j + dj * b + pj * 0.1, h), a1 = P(i + di * b - pi * 0.1, j + dj * b - pj * 0.1, h);
    const t0: Pt = [a0[0], a0[1] - 7], t1: Pt = [a1[0], a1[1] - 7];
    g.beginPath(); g.moveTo(a0[0], a0[1]); g.lineTo(t0[0], t0[1]);
    g.quadraticCurveTo((t0[0] + t1[0]) / 2, Math.min(t0[1], t1[1]) - 3.5, t1[0], t1[1]); g.lineTo(a1[0], a1[1]); g.closePath();
    g.fillStyle = '#fbfaf6'; g.fill(); g.strokeStyle = gold; g.lineWidth = 1; g.stroke();
  };
  const seat = () => {
    ell(g, x, y + 1, rx + 1, ry + 0.8, 'rgba(0,0,0,0.12)');
    for (const [a, b] of [[-0.09, 0], [0.09, 0], [0, -0.09], [0, 0.09]] as const) { const p = P(i + a, j + b, 0); seg(g, p, [p[0], p[1] - h], gold, 1.2); }
    ell(g, x, y - h + 1, rx, ry, gold);
    ell(g, x, y - h, rx, ry, '#fbfaf6');
    ell(g, x - 1, y - h - 0.5, rx * 0.5, ry * 0.4, '#ffffff');
    g.strokeStyle = goldL; g.lineWidth = 0.8; g.beginPath(); g.ellipse(x, y - h, rx, ry, 0, 0, Math.PI * 2); g.stroke();
  };
  if (di + dj < 0) { back(); seat(); } else { seat(); back(); }
}

/** 식당 바깥 자리 한 벌. style street = 쇠 탁자 + 플라스틱 의자 넷 · heaven = 흰 대리석 둥근 탁자 + 금빛 의자 넷 */
export function drawTableSet(g: G, cx: number, cy: number, style: 'street' | 'heaven', v: number) {
  const P = isoAt(cx, cy);
  const seats: [number, number][] = [[-0.5, 0], [0, -0.5], [0.5, 0], [0, 0.5]]; // 뒤 둘 → 앞 둘
  ell(g, cx, cy + 1, 30, 14, 'rgba(0,0,0,0.08)');
  const sc = v % 5 === 4 ? STOOL.blue : v % 7 === 6 ? STOOL.green : STOOL.red;
  const seatAt = (k: number) => {
    const [i, j] = seats[k];
    if (style === 'street') stool(g, P, i, j, sc);
    else hchair(g, P, i, j, Math.sign(i), Math.sign(j));
  };
  seatAt(0); seatAt(1);
  if (style === 'street') {
    // 접이식 쇠 탁자: 네 다리 · 은빛 판 · 판 가장자리 그늘
    const a = 0.3, zt = 17;
    for (const [i, j] of [[-a + 0.03, -a + 0.03], [a - 0.03, -a + 0.03], [-a + 0.03, a - 0.03], [a - 0.03, a - 0.03]] as const) seg(g, P(i, j, 0), P(i, j, zt - 2), '#6e737a', 1.6);
    seg(g, P(-a + 0.03, a - 0.03, 6), P(a - 0.03, a - 0.03, 6), '#7e848b', 1);
    box(g, P, -a, -a, a, a, zt - 2, zt, '#cdd2d7', '#9aa0a6', '#7f858c');
    g.strokeStyle = '#f2f5f8'; g.lineWidth = 1; g.beginPath(); const e0 = P(-a, a, zt), e1 = P(-a, -a, zt), e2 = P(a, -a, zt); g.moveTo(e0[0], e0[1]); g.lineTo(e1[0], e1[1]); g.lineTo(e2[0], e2[1]); g.stroke();
    // 양념통 받침 (고춧가루 · 설탕 · 식초 · 피시소스)
    box(g, P, -0.17, -0.2, -0.03, -0.1, zt, zt + 1.5, '#dfe3e6', '#a8adb2', '#8a9096');
    ['#c8321e', '#f2e6b0', '#e8eef0', '#9a5a1e'].forEach((c, k) => { const [x, y] = P(-0.155 + k * 0.035, -0.15 - k * 0.0, zt + 1.5); g.fillStyle = c; g.fillRect(Math.round(x - 1), Math.round(y - 4), 2, 4); g.fillStyle = '#f6f6f2'; g.fillRect(Math.round(x - 1), Math.round(y - 5), 2, 1); });
    // 물병 · 컵 · 그릇 둘 (국수 · 쏨땀 · 밥)
    { const [x, y] = P(0.15, -0.12, zt); g.fillStyle = 'rgba(160,210,230,0.9)'; g.fillRect(Math.round(x - 2), Math.round(y - 8), 4, 8); g.fillStyle = '#e8f6fb'; g.fillRect(Math.round(x - 1), Math.round(y - 7), 1, 5); g.fillStyle = '#d8dcdf'; g.fillRect(Math.round(x - 2), Math.round(y - 9), 4, 1); }
    if (v % 2) { const [x, y] = P(0.02, -0.18, zt); g.fillStyle = 'rgba(190,228,240,0.95)'; g.fillRect(Math.round(x - 1), Math.round(y - 4), 3, 4); }
    const food = [['#e8b25a', '#c8862a'], ['#d8602a', '#f2a24a'], ['#f6f2e6', '#e8c23a']];
    for (const [k, [i, j]] of ([[0, [0.1, 0.13]], [1, [-0.13, 0.08]]] as const)) {
      const [x, y] = P(i, j, zt); const f = food[(v + k) % 3];
      ell(g, x, y - 1, 4.2, 2.2, '#f4f4f0'); ell(g, x, y - 1.6, 3.2, 1.4, f[0]); ell(g, x - 0.8, y - 1.9, 1.4, 0.6, f[1]);
      seg(g, [x + 2, y - 1], [x + 6, y - 4], '#c89a5a', 0.8); seg(g, [x + 2.5, y - 0.5], [x + 6.5, y - 3.2], '#c89a5a', 0.8);
    }
  } else {
    // 흰 대리석 둥근 탁자: 금빛 기둥 다리 · 흰 식탁보 · 금빛 테두리
    const zt = 17, rx = rxOf(0.31), ry = ryOf(0.31);
    ell(g, cx, cy, 5, 2.5, '#b8902e'); ell(g, cx, cy - 0.6, 4.2, 2, '#d9b04a');
    g.fillStyle = '#c9a23e'; g.fillRect(cx - 1.5, cy - zt + 2, 3, zt - 2); g.fillStyle = '#ecd08a'; g.fillRect(cx - 1.5, cy - zt + 2, 1, zt - 2);
    ell(g, cx, cy - zt + 3.2, rx, ry, '#d9b04a');
    g.fillStyle = '#f4f1ea'; g.fillRect(cx - rx, cy - zt, rx * 2, 3);
    ell(g, cx, cy - zt + 2.6, rx, ry, '#ece7dc');
    ell(g, cx, cy - zt, rx, ry, '#fbfaf6');
    ell(g, cx - 3, cy - zt - 1, rx * 0.5, ry * 0.4, '#ffffff');
    g.strokeStyle = '#e2c46e'; g.lineWidth = 0.8; g.beginPath(); g.ellipse(cx, cy - zt, rx - 1.5, ry - 0.8, 0, 0, Math.PI * 2); g.stroke();
    // 찻주전자 · 찻잔 둘 · 구름 케이크 한 조각 · 백합 한 송이
    { const [x, y] = P(-0.06, -0.1, zt); ell(g, x, y - 3, 3.4, 2.8, '#fbfaf6'); ell(g, x - 1, y - 3.8, 1.4, 1, '#ffffff'); ell(g, x, y - 5.8, 1.2, 0.7, '#d9b04a'); seg(g, [x + 3, y - 3], [x + 5.5, y - 5], '#e8e2d4', 1.2); seg(g, [x - 3, y - 4], [x - 4.5, y - 2.5], '#d9b04a', 0.9); }
    for (const [i, j] of [[0.14, 0.02], [-0.04, 0.15]] as const) { const [x, y] = P(i, j, zt); ell(g, x, y - 0.5, 2.6, 1.2, '#ece7dc'); g.fillStyle = '#fbfaf6'; g.fillRect(Math.round(x - 1.5), Math.round(y - 3), 3, 2.5); ell(g, x, y - 3, 1.5, 0.6, '#c8864a'); g.fillStyle = '#d9b04a'; g.fillRect(Math.round(x - 1.5), Math.round(y - 1), 3, 0.8); }
    if (v % 2) { const [x, y] = P(0.13, -0.13, zt); poly(g, [[x - 3, y - 1], [x + 3, y - 1], [x + 1, y - 4]], '#fbfaf6'); poly(g, [[x - 3, y - 1], [x + 3, y - 1], [x + 3, y], [x - 3, y]], '#f2a8b8'); }
    else { const [x, y] = P(0.12, -0.14, zt); g.fillStyle = '#d9b04a'; g.fillRect(Math.round(x - 1), Math.round(y - 5), 2, 5); seg(g, [x, y - 5], [x, y - 9], '#5a9a4a', 0.8); ell(g, x, y - 10, 2, 1.4, '#ffffff'); ell(g, x, y - 10.2, 0.7, 0.5, '#f2d27a'); }
  }
  seatAt(2); seatAt(3);
}

// ───────────────────────── 손수레 ─────────────────────────
export type CartGoods = 'skewer' | 'fruit' | 'fried' | 'manna' | 'cotton' | 'lifefruit';
/** 바퀴 (수레 긴 옆면과 나란한 세로 원). d = 수레 길이 방향 화면 벡터(한 칸) */
function wheel(g: G, c: Pt, d: Pt, R: number, rim: string, spoke: string, hub: string) {
  const k = R / 32, ux = d[0] * k, uy = d[1] * k;
  const at = (t: number, s: number): Pt => [c[0] + Math.cos(t) * ux * s, c[1] + Math.cos(t) * uy * s - Math.sin(t) * R * s];
  g.beginPath();
  for (let n = 0; n <= 24; n++) { const p = at((n / 24) * Math.PI * 2, 1); n ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]); }
  for (let n = 24; n >= 0; n--) { const p = at((n / 24) * Math.PI * 2, 0.74); n === 24 ? g.moveTo(p[0], p[1]) : g.lineTo(p[0], p[1]); }
  g.fillStyle = rim; g.fill('evenodd');
  for (let n = 0; n < 6; n++) seg(g, c, at((n / 6) * Math.PI * 2 + 0.3, 0.76), spoke, 0.7);
  ell(g, c[0], c[1], 1.6, 1.6, hub);
}
/** 노점 손수레. ax = 0: 수레 긴 쪽이 i 방향 · 1: j 방향. 손잡이는 긴 쪽 + 끝 */
export function drawCart(g: G, cx: number, cy: number, ax: 0 | 1, style: 'street' | 'heaven', goods: CartGoods, v = 0) {
  const P = isoAt(cx, cy);
  const L: P3 = (u, w, z = 0) => (ax === 0 ? P(u, w, z) : P(w, u, z));
  const lbox = (u0: number, w0: number, u1: number, w1: number, z0: number, z1: number, top: string, long: string, short: string, line?: string) =>
    ax === 0 ? box(g, P, u0, w0, u1, w1, z0, z1, top, long, short, line) : box(g, P, w0, u0, w1, u1, z0, z1, top, short, long, line);
  const dU: Pt = ax === 0 ? [32, 16] : [-32, 16];
  const H = style === 'heaven';
  const C = H
    ? { top: '#fbfaf6', long: '#ece6da', short: '#d8d0c0', trim: '#d9b04a', frame: '#c9a23e', rim: '#b8902e', spoke: '#e8c86a', hub: '#fff2c0', glass: 'rgba(236,248,255,0.42)', glassTop: 'rgba(250,253,255,0.5)' }
    : { top: '#c2c8ce', long: '#9aa2aa', short: '#7d858d', trim: '#5a6068', frame: '#2a2e34', rim: '#1c1c1e', spoke: '#8a8e94', hub: '#c8ccd0', glass: 'rgba(206,232,242,0.45)', glassTop: 'rgba(230,246,252,0.55)' };
  // 그림자 · 먼 쪽 바퀴 · 받침 다리 · 가스통
  poly(g, [L(-0.48, -0.26), L(0.66, -0.26), L(0.66, 0.3), L(-0.48, 0.3)], 'rgba(0,0,0,0.16)');
  wheel(g, L(0.06, -0.25, 9), dU, 9, C.rim, C.spoke, C.hub);
  for (const w of [-0.16, 0.16]) seg(g, L(-0.38, w, 0), L(-0.38, w, 12), C.trim, 1.4);
  if (!H) {
    const [x, y] = L(-0.2, 0.02, 0);
    ell(g, x, y, 3.6, 1.8, '#1e3e6a'); g.fillStyle = '#2a5a9a'; g.fillRect(Math.round(x - 3.5), Math.round(y - 9), 7, 9); g.fillStyle = '#5a8ac8'; g.fillRect(Math.round(x - 2.5), Math.round(y - 9), 1, 9);
    ell(g, x, y - 9, 3.5, 1.7, '#4a7ab8'); g.fillStyle = '#c8ccd0'; g.fillRect(Math.round(x - 1), Math.round(y - 11), 2, 2);
  }
  // 몸통 (위가 조리대)
  lbox(-0.42, -0.2, 0.42, 0.2, 12, 24, C.top, C.long, C.short);
  { const a = L(-0.42, 0.2, 16), b = L(0.42, 0.2, 16); seg(g, a, b, C.trim, 1); const a2 = L(-0.42, 0.2, 23), b2 = L(0.42, 0.2, 23); seg(g, a2, b2, H ? C.trim : '#c8d0d8', 1); }
  if (H) for (let k = 0; k < 4; k++) { const p = L(-0.3 + k * 0.2, 0.2, 19.5); ell(g, p[0], p[1], 1.4, 1.4, C.trim); }
  // 진열장 속 물건
  const gl = { u0: -0.4, u1: 0.1, w0: -0.17, w1: 0.17, z0: 24, z1: 40 };
  const shelf = (z: number, cols: string[], kind: 'ball' | 'stick' | 'loaf') => {
    for (let n = 0; n < 6; n++) {
      const u = gl.u0 + 0.06 + n * 0.075, [x, y] = L(u, 0.02, z), c = cols[n % cols.length];
      if (kind === 'stick') { seg(g, [x, y], [x, y - 6], '#8a6a3a', 0.8); ell(g, x, y - 3, 1.4, 1.4, c); ell(g, x, y - 5, 1.4, 1.4, c); }
      else if (kind === 'loaf') { ell(g, x, y - 1.6, 2.6, 1.6, c); ell(g, x - 0.6, y - 2.2, 1.2, 0.6, '#f6dca0'); }
      else { ell(g, x, y - 1.5, 1.8, 1.8, c); ell(g, x - 0.5, y - 2.1, 0.6, 0.6, 'rgba(255,255,255,0.7)'); }
    }
  };
  lbox(gl.u0, gl.w0, gl.u1, gl.w1, gl.z0, gl.z0 + 1, H ? '#f2ecdc' : '#e8ecee', C.long, C.short);
  if (goods === 'skewer') { shelf(26, ['#b8641e', '#d8843a', '#8a4a1e'], 'stick'); shelf(33, ['#e85a7a', '#d8843a'], 'stick'); }
  else if (goods === 'fruit') { shelf(26, ['#e8486a', '#f2c23a', '#7ac84a', '#f28a3a'], 'ball'); shelf(32.5, ['#f2c23a', '#e8486a'], 'ball'); }
  else if (goods === 'fried') { shelf(26, ['#d89a3a', '#c8782a', '#e8b25a'], 'loaf'); shelf(32.5, ['#b8701e', '#d89a3a'], 'ball'); }
  else if (goods === 'manna') { shelf(26, ['#e8c27a', '#d8a85a', '#f0d08a'], 'loaf'); shelf(32.5, ['#f0d08a', '#e8c27a'], 'loaf'); }
  else if (goods === 'cotton') { shelf(26, ['#f6c6d6', '#ffffff', '#c6e6f6'], 'ball'); shelf(32.5, ['#ffffff', '#f6c6d6'], 'ball'); }
  else { shelf(26, ['#e8486a', '#f2a23a', '#f2d23a'], 'ball'); shelf(32.5, ['#7ac84a', '#e8486a'], 'ball'); }
  // 유리 (뒤 모서리 → 앞 면들 · 위) 와 테
  lbox(gl.u0, gl.w0, gl.u1, gl.w1, gl.z0 + 1, gl.z1, C.glassTop, C.glass, C.glass);
  for (const [u, w] of [[gl.u0, gl.w1], [gl.u1, gl.w1], [gl.u1, gl.w0]] as const) seg(g, L(u, w, gl.z0), L(u, w, gl.z1), C.frame, 1.2);
  for (const [a, b] of [[[gl.u0, gl.w1], [gl.u1, gl.w1]], [[gl.u1, gl.w1], [gl.u1, gl.w0]], [[gl.u1, gl.w0], [gl.u0, gl.w0]], [[gl.u0, gl.w0], [gl.u0, gl.w1]]] as const) seg(g, L(a[0], a[1], gl.z1), L(b[0], b[1], gl.z1), C.frame, 1.2);
  { const a = L(gl.u0 + 0.05, gl.w1, gl.z1 - 3), b = L(gl.u0 + 0.05, gl.w1, gl.z0 + 4); seg(g, a, b, 'rgba(255,255,255,0.75)', 1); }
  // 지붕 판과 간판 띠 (양산은 없다)
  lbox(-0.44, -0.22, 0.14, 0.22, gl.z1, gl.z1 + 2, H ? '#fbfaf6' : '#3a3e44', H ? C.trim : '#2a2e34', H ? C.frame : '#22262a');
  {
    const band = H ? C.trim : ['#c8321e', '#e8b21e', '#2a7a4a'][v % 3], ink = H ? '#fffaf0' : '#fff6e0';
    const a = L(-0.44, 0.22, gl.z1 - 5), b = L(0.14, 0.22, gl.z1 - 5), c = L(0.14, 0.22, gl.z1), d = L(-0.44, 0.22, gl.z1);
    poly(g, [a, b, c, d], band);
    for (let n = 0; n < 6; n++) { const p = L(-0.38 + n * 0.08, 0.22, gl.z1 - 2.5); g.fillStyle = ink; g.fillRect(Math.round(p[0] - 1), Math.round(p[1] - 1), 2 + (n % 2), 1); g.fillRect(Math.round(p[0] - (n % 2)), Math.round(p[1]), 1, 1); }
    if (H) for (let n = 0; n < 7; n++) { const p = L(-0.42 + n * 0.09, 0.22, gl.z1 - 5); ell(g, p[0], p[1] + 0.6, 2.2, 1.3, n % 2 ? '#8ac8f2' : '#ffffff'); }
  }
  // 조리대 (손잡이 쪽): 숯불 석쇠 + 꼬치 / 얼음 통 / 기름 솥 · 천국은 금빛 쟁반
  {
    const z = 24;
    if (H) {
      lbox(0.16, -0.14, 0.38, 0.14, z, z + 1.5, '#f6e6b0', C.trim, C.frame);
      if (goods === 'cotton') for (let n = 0; n < 4; n++) { const [x, y] = L(0.2 + (n % 2) * 0.12, -0.08 + Math.floor(n / 2) * 0.14, z + 1.5); seg(g, [x, y], [x, y - 7], '#e8d8b0', 0.9); ell(g, x, y - 10, 3.6, 3.2, n % 2 ? '#f6c6d6' : '#ffffff'); ell(g, x - 1, y - 11, 1.6, 1.2, '#ffffff'); }
      else if (goods === 'manna') for (let n = 0; n < 3; n++) { const [x, y] = L(0.22 + n * 0.06, -0.04 + (n % 2) * 0.08, z + 1.5); ell(g, x, y - 1.8, 3, 1.8, '#e8c27a'); ell(g, x - 0.8, y - 2.4, 1.3, 0.6, '#f8e4b0'); }
      else for (let n = 0; n < 5; n++) { const [x, y] = L(0.2 + (n % 3) * 0.07, -0.06 + Math.floor(n / 3) * 0.1, z + 1.5); ell(g, x, y - 1.8, 2, 2, ['#e8486a', '#f2a23a', '#f2d23a', '#7ac84a', '#e8486a'][n]); ell(g, x - 0.5, y - 2.4, 0.7, 0.7, '#ffffff'); }
    } else if (goods === 'skewer') {
      lbox(0.16, -0.15, 0.4, 0.15, z, z + 3, '#2a2422', '#3a3432', '#2a2624');
      { const [x, y] = L(0.28, 0, z + 3); ell(g, x, y, 6, 2.6, '#d8501e'); ell(g, x, y, 3.5, 1.4, '#f2a03a'); }
      for (let n = 0; n < 4; n++) { const a = L(0.18 + n * 0.055, -0.14, z + 4), b = L(0.18 + n * 0.055, 0.16, z + 4); seg(g, a, b, '#8a6a3a', 0.9); const m = L(0.18 + n * 0.055, 0.02, z + 4.5); ell(g, m[0], m[1], 1.6, 1.2, '#a8501e'); }
    } else if (goods === 'fruit') {
      lbox(0.16, -0.15, 0.4, 0.15, z, z + 4, '#dff2fa', '#9ac6d8', '#7aa8bc');
      for (let n = 0; n < 5; n++) { const [x, y] = L(0.2 + (n % 3) * 0.07, -0.08 + Math.floor(n / 3) * 0.12, z + 4); ell(g, x, y - 1, 1.8, 1.2, ['#f2c23a', '#e8486a', '#7ac84a', '#f28a3a', '#f2c23a'][n]); }
    } else {
      const [x, y] = L(0.28, 0, z); ell(g, x, y - 1, 6.5, 3.2, '#2a2a2c'); ell(g, x, y - 2, 5.5, 2.6, '#c8902a'); ell(g, x - 1, y - 2.4, 2, 0.8, '#f2c86a');
    }
  }
  // 가까운 쪽 바퀴 · 손잡이
  wheel(g, L(0.06, 0.25, 9), dU, 9, C.rim, C.spoke, C.hub);
  for (const w of [-0.12, 0.12]) seg(g, L(0.42, w, 20), L(0.62, w, 21), H ? C.frame : '#5a6068', 1.4);
  seg(g, L(0.62, -0.13, 21), L(0.62, 0.13, 21), H ? C.trim : '#1e1e20', 2);
}
