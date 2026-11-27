/**
 * 45차 후속: 무기 그림(가방 · 가게 · 장비 칸)을 고급스럽게 — 96×96 벡터 그림 (화면에선 32px 남짓으로 줄여 부드럽게 보인다)
 * 무기는 왼쪽 아래(손잡이) → 오른쪽 위(끝)로 눕힌다. 그릴 때는 무기를 x축에 눕힌 좌표(x: 손잡이 −, 끝 +, y: −가 빛 받는 쪽)로 그리고 45° 돌린다.
 * 같은 모양이라도 값·세계에 따라 장식이 다르다: 싼 것은 쇠, 중간은 놋쇠, 비싼 것은 금과 보석, 전설은 은은한 빛 · 지옥은 검은 쇠와 달아오른 날, 천국은 흰 금
 */
import type { ItemDef } from './items.ts';

const S = 96;
type Ctx = CanvasRenderingContext2D;
type Style = { blade: string; fit: string; grip: string; gem?: string; glow?: string; edge?: string; wrap: string; hell?: boolean };

function shade(hex: string, k: number): string {
  const n = parseInt(hex.slice(1, 7), 16), f = (v: number) => Math.round(Math.max(0, Math.min(255, k < 0 ? v * (1 + k) : v + (255 - v) * k)));
  return '#' + [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => f(v).toString(16).padStart(2, '0')).join('');
}

const BONE_KEYS = /bone|rib|femur|fang|horn|molar|claw|pincer|sting|warden/;
function styleOf(it: ItemDef): Style {
  if (it.heaven) return { blade: '#f2ead6', fit: '#e6be52', grip: '#efe8d8', wrap: '#c9a23e', gem: '#6fb4ff', glow: 'rgba(255,240,190,0.55)' };
  if (it.hell) {
    const bone = BONE_KEYS.test(it.key);
    return { hell: true, blade: bone ? '#d8ccb0' : '#8e868a', fit: bone ? '#8a7a62' : '#4e4446', grip: '#2a1c1a', wrap: '#5a1a14', edge: bone ? undefined : '#ff6a2a', gem: it.price >= 3_000 ? '#ff3a1a' : undefined, glow: it.price >= 20_000 ? 'rgba(255,80,30,0.35)' : undefined };
  }
  const p = it.price;
  if (p >= 1_000_000) return { blade: it.key === 'meteorblade' ? '#7a8494' : '#e4ebf2', fit: '#ecc04a', grip: '#4a1018', wrap: '#e0b437', gem: it.key === 'meteorblade' ? '#8a5aff' : '#e0283a', glow: 'rgba(255,220,140,0.45)' };
  if (p >= 100_000) return { blade: '#dde4ec', fit: '#d9aa3c', grip: '#5a1820', wrap: '#c9a23e', gem: '#d0202a' };
  if (p >= 10_000) return { blade: '#cfd7df', fit: '#b88a3a', grip: '#3a2418', wrap: '#6a4a2a' };
  return { blade: '#c4ccd4', fit: '#8e959e', grip: '#4a2e1c', wrap: '#2a1a10' };
}

// ───────── 칠하기 도구 (무기 좌표) ─────────
/** 금속: 빛 받는 쪽(−y)이 밝고 반대가 어둡다 */
function metal(g: Ctx, y0: number, y1: number, base: string) {
  const gr = g.createLinearGradient(0, y0, 0, y1);
  gr.addColorStop(0, shade(base, 0.6)); gr.addColorStop(0.3, shade(base, 0.22)); gr.addColorStop(0.55, base); gr.addColorStop(1, shade(base, -0.5));
  return gr;
}
/** x 방향으로 바뀌는 금속 (가로 막대 · 둥근 장식) */
function metalX(g: Ctx, x0: number, x1: number, base: string) {
  const gr = g.createLinearGradient(x0, 0, x1, 0);
  gr.addColorStop(0, shade(base, -0.35)); gr.addColorStop(0.35, shade(base, 0.45)); gr.addColorStop(0.6, base); gr.addColorStop(1, shade(base, -0.45));
  return gr;
}
function poly(g: Ctx, pts: [number, number][], fill: string | CanvasGradient) {
  g.beginPath(); g.moveTo(pts[0][0], pts[0][1]); for (const p of pts.slice(1)) g.lineTo(p[0], p[1]); g.closePath(); g.fillStyle = fill; g.fill();
}
function line(g: Ctx, pts: [number, number][], w: number, col: string, cap: CanvasLineCap = 'round') {
  g.beginPath(); g.moveTo(pts[0][0], pts[0][1]); for (const p of pts.slice(1)) g.lineTo(p[0], p[1]); g.strokeStyle = col; g.lineWidth = w; g.lineCap = cap; g.lineJoin = 'round'; g.stroke();
}
function ball(g: Ctx, x: number, y: number, r: number, base: string) {
  const gr = g.createRadialGradient(x - r * 0.35, y - r * 0.4, r * 0.1, x, y, r);
  gr.addColorStop(0, shade(base, 0.7)); gr.addColorStop(0.45, base); gr.addColorStop(1, shade(base, -0.55));
  g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fillStyle = gr; g.fill();
}
function gem(g: Ctx, x: number, y: number, r: number, col: string) {
  ball(g, x, y, r, col);
  g.fillStyle = 'rgba(255,255,255,0.9)'; g.beginPath(); g.arc(x - r * 0.35, y - r * 0.35, Math.max(0.8, r * 0.28), 0, Math.PI * 2); g.fill();
}
/** 반짝: 네 갈래 작은 별 */
function glint(g: Ctx, x: number, y: number, r: number) {
  g.save(); g.fillStyle = 'rgba(255,255,255,0.95)';
  poly(g, [[x - r, y], [x - r * 0.18, y - r * 0.18], [x, y - r], [x + r * 0.18, y - r * 0.18], [x + r, y], [x + r * 0.18, y + r * 0.18], [x, y + r], [x - r * 0.18, y + r * 0.18]], 'rgba(255,255,255,0.95)');
  g.restore();
}
/** 곧은 날: x0에서 폭 w0, 끝으로 갈수록 w1, 마지막 tip 길이만큼 뾰족 */
function straightBlade(g: Ctx, st: Style, x0: number, x1: number, w0: number, w1: number, tip: number, fuller = true) {
  const pts: [number, number][] = [[x0, -w0 / 2], [x1 - tip, -w1 / 2], [x1, 0], [x1 - tip, w1 / 2], [x0, w0 / 2]];
  poly(g, pts, metal(g, -w0 / 2, w0 / 2, st.blade));
  // 날 가장자리: 빛 받는 쪽은 밝은 선, 반대는 어두운 선 · 지옥은 달아오른 날
  line(g, [[x0 + 1, -w0 / 2 + 0.8], [x1 - tip, -w1 / 2 + 0.8], [x1 - 1, 0]], 1.1, st.edge ?? shade(st.blade, 0.75));
  line(g, [[x0 + 1, w0 / 2 - 0.8], [x1 - tip, w1 / 2 - 0.8], [x1 - 1, 0]], 1, st.edge ? shade(st.edge, -0.2) : shade(st.blade, -0.55));
  if (fuller) { // 피홈
    line(g, [[x0 + 3, 0.6], [x1 - tip - 4, 0.6]], 1.6, shade(st.blade, -0.45), 'butt');
    line(g, [[x0 + 3, -0.9], [x1 - tip - 4, -0.9]], 0.9, shade(st.blade, 0.7), 'butt');
  }
  glint(g, x1 - tip - 2, -w1 / 2 + 1.5, 3.2);
}
/** 휜 날 (일본도 · 세이버): 등(+y 쪽)이 둥글게 휘고 날은 −y */
function curvedBlade(g: Ctx, st: Style, x0: number, x1: number, w: number, bend: number, hamon = false) {
  const cy = (x: number) => -bend * ((x - x0) / (x1 - x0)) ** 2; // 끝으로 갈수록 −y로 휜다
  const top: [number, number][] = [], bot: [number, number][] = [];
  const n = 24;
  for (let k = 0; k <= n; k++) {
    const x = x0 + ((x1 - x0) * k) / n, q = k / n;
    const ww = w * (q < 0.86 ? 1 - q * 0.15 : (1 - q) / 0.14 * 0.87);
    top.push([x, cy(x) - ww / 2]); bot.push([x, cy(x) + ww / 2]);
  }
  poly(g, [...top, ...bot.reverse()], metal(g, -w / 2 - bend, w / 2, st.blade));
  line(g, top.slice(1), 1.1, st.edge ?? shade(st.blade, 0.8));
  line(g, bot.slice(0, -1).reverse().slice(1), 1.1, shade(st.blade, -0.55));
  if (hamon) { // 물결무늬 (날 쪽)
    g.beginPath();
    for (let k = 1; k < n - 2; k++) { const x = x0 + ((x1 - x0) * k) / n, y = cy(x) - w * 0.12 + Math.sin(k * 1.9) * 0.9; if (k === 1) g.moveTo(x, y); else g.lineTo(x, y); }
    g.strokeStyle = 'rgba(255,255,255,0.75)'; g.lineWidth = 0.9; g.stroke();
  }
  glint(g, x1 - 8, cy(x1 - 8) - w * 0.3, 3.2);
}
/** 손잡이: 감은 가죽(비스듬한 띠) */
function grip(g: Ctx, st: Style, x0: number, x1: number, w: number, cross = false) {
  const gr = g.createLinearGradient(0, -w / 2, 0, w / 2);
  gr.addColorStop(0, shade(st.grip, 0.35)); gr.addColorStop(0.45, st.grip); gr.addColorStop(1, shade(st.grip, -0.55));
  g.beginPath(); g.roundRect(x0, -w / 2, x1 - x0, w, w * 0.35); g.fillStyle = gr; g.fill();
  g.save(); g.beginPath(); g.roundRect(x0, -w / 2, x1 - x0, w, w * 0.35); g.clip();
  for (let x = x0 - w; x < x1 + w; x += 3.2) {
    line(g, [[x, -w / 2], [x + w * 0.9, w / 2]], 1.1, shade(st.wrap, -0.3), 'butt');
    line(g, [[x + 0.9, -w / 2], [x + w * 0.9 + 0.9, w / 2]], 0.6, shade(st.wrap, 0.35), 'butt');
    if (cross) line(g, [[x, w / 2], [x + w * 0.9, -w / 2]], 1.1, shade(st.wrap, -0.1), 'butt');
  }
  g.restore();
}
/** 가로막이 (날밑): x에 놓인 막대, 길이 len (y 방향) */
function guard(g: Ctx, st: Style, x: number, len: number, th: number, curl = false) {
  g.beginPath(); g.roundRect(x - th / 2, -len / 2, th, len, th / 2); g.fillStyle = metalX(g, x - th / 2, x + th / 2, st.fit); g.fill();
  if (curl) { ball(g, x - th * 0.4, -len / 2, th * 0.62, st.fit); ball(g, x - th * 0.4, len / 2, th * 0.62, st.fit); }
  else { ball(g, x, -len / 2, th * 0.55, st.fit); ball(g, x, len / 2, th * 0.55, st.fit); }
  ball(g, x, 0, th * 0.75, st.fit);
  if (st.gem) gem(g, x, 0, th * 0.42, st.gem);
}
function pommel(g: Ctx, st: Style, x: number, r: number) {
  ball(g, x, 0, r, st.fit);
  if (st.gem) gem(g, x, 0, r * 0.45, st.gem);
}
/** 나무 자루: 결 무늬 */
function shaft(g: Ctx, x0: number, x1: number, w: number, wood = '#8a6238') {
  g.beginPath(); g.roundRect(x0, -w / 2, x1 - x0, w, w / 2); g.fillStyle = metal(g, -w / 2, w / 2, wood); g.fill();
  for (let k = 0; k < 3; k++) { const y = -w / 2 + (w * (k + 1)) / 4, ph = k * 7; line(g, [[x0 + 4 + ph, y], [x0 + (x1 - x0) * 0.45 + ph, y + 0.3], [x1 - 6 - ph, y - 0.2]], 0.6, shade(wood, -0.4)); }
}

// ───────── 무기마다 ─────────
type Draw = (g: Ctx, st: Style, it: ItemDef) => void;
const ROT: Record<string, Draw> = {
  sword: (g, st) => { straightBlade(g, st, -28, 57, 9, 7.5, 12); guard(g, st, -30, 28, 5); grip(g, st, -48, -32, 6); pommel(g, st, -51, 5.2); },
  arming: (g, st) => { straightBlade(g, st, -24, 52, 10, 8, 11); guard(g, st, -26, 24, 4.5); grip(g, st, -42, -28, 6.2); ball(g, -46, 0, 6, st.fit); g.beginPath(); g.arc(-46, 0, 3, 0, Math.PI * 2); g.fillStyle = shade(st.fit, -0.45); g.fill(); if (st.gem) gem(g, -46, 0, 2.2, st.gem); },
  greatsword: (g, st) => { straightBlade(g, st, -24, 59, 12.5, 10.5, 15); line(g, [[-24, 0], [-14, 0]], 6, shade(st.blade, -0.25), 'butt'); guard(g, st, -26, 36, 6, true); grip(g, st, -52, -29, 6.4); pommel(g, st, -56, 5.4); },
  dagger: (g, st) => { poly(g, [[-16, -5], [26, -3.2], [40, 0], [26, 3.2], [-16, 5]], metal(g, -5, 5, st.blade)); line(g, [[-15, -4.2], [26, -2.6], [39, 0]], 1, st.edge ?? shade(st.blade, 0.8)); line(g, [[-14, 0], [30, 0]], 1, shade(st.blade, -0.4)); glint(g, 30, -1.6, 2.8); guard(g, st, -18, 20, 4.2); grip(g, st, -34, -20, 5.4); pommel(g, st, -37, 4.6); },
  knife: (g, st) => {
    poly(g, [[-12, -5.5], [36, -5.5], [44, -4], [40, 0.5], [26, 5.5], [-12, 6.5]], metal(g, -5.5, 6.5, st.hell ? st.blade : '#d6dde4'));
    line(g, [[-11, 5.6], [24, 4.8], [39, 0.5], [44, -4]], 1.2, st.edge ?? '#f4f8fb'); line(g, [[-11, -4.8], [36, -4.8]], 1, '#8a929c');
    glint(g, 36, -2.6, 2.6);
    g.beginPath(); g.roundRect(-14, -6.5, 3, 13, 1.2); g.fillStyle = metalX(g, -14, -11, '#b8c0c8'); g.fill();
    g.beginPath(); g.roundRect(-46, -5, 32, 10, 3.5); g.fillStyle = metal(g, -5, 5, st.hell ? '#3a2a24' : '#24201e'); g.fill();
    for (const x of [-40, -31, -22]) { ball(g, x, 0, 1.7, '#d8dde4'); }
  },
  machete: (g, st) => {
    poly(g, [[-26, -5], [44, -7.5], [55, -4], [52, 7], [-26, 5]], metal(g, -7.5, 7, '#bcc4cc'));
    line(g, [[-25, 4.2], [51, 6.2], [55, -4]], 1.2, '#eef2f6'); line(g, [[-25, -4.3], [44, -6.8]], 1, '#7a828c'); glint(g, 46, 3.5, 2.8);
    grip(g, { ...st, grip: '#1e1e22', wrap: '#3a3a40' }, -52, -26, 8); for (const x of [-45, -34]) ball(g, x, 0, 1.6, '#c8cdd4');
  },
  saber: (g, st) => {
    curvedBlade(g, st, -24, 56, 7, 9);
    // 손을 감싸는 손등 막이 (금빛 활)
    g.beginPath(); g.moveTo(-25, 2); g.bezierCurveTo(-28, 13, -44, 14, -48, 4); g.strokeStyle = st.fit; g.lineWidth = 3; g.stroke();
    g.beginPath(); g.moveTo(-25, 2); g.bezierCurveTo(-28, 13, -44, 14, -48, 4); g.strokeStyle = shade(st.fit, 0.5); g.lineWidth = 1; g.stroke();
    guard(g, st, -26, 16, 4.5); grip(g, st, -46, -28, 6); pommel(g, st, -49, 4.6);
  },
  rapier: (g, st) => {
    poly(g, [[-22, -2.2], [55, -1], [61, 0], [55, 1], [-22, 2.2]], metal(g, -2.2, 2.2, st.blade)); line(g, [[-21, -1.4], [58, -0.4]], 0.8, shade(st.blade, 0.8)); glint(g, 52, -1.2, 2.6);
    // 잔 모양 날밑 · 휘감는 고리
    g.beginPath(); g.ellipse(-24, 0, 4, 10, 0, 0, Math.PI * 2); g.fillStyle = metalX(g, -28, -20, st.fit); g.fill();
    g.beginPath(); g.ellipse(-24, 0, 2, 6, 0, 0, Math.PI * 2); g.fillStyle = shade(st.fit, -0.45); g.fill();
    for (const s of [-1, 1]) { g.beginPath(); g.moveTo(-26, 0); g.bezierCurveTo(-30, s * 16, -42, s * 14, -46, s * 3); g.strokeStyle = st.fit; g.lineWidth = 2.2; g.stroke(); }
    line(g, [[-25, -14], [-25, 14]], 2.6, shade(st.fit, 0.2)); ball(g, -25, -14, 2.4, st.fit); ball(g, -25, 14, 2.4, st.fit);
    grip(g, st, -44, -28, 5.2, true); pommel(g, st, -48, 4.8);
  },
  katana: (g, st) => {
    curvedBlade(g, { ...st, blade: st.hell ? st.blade : shade(st.blade, 0.1) }, -24, 58, 6.5, 8, true);
    g.beginPath(); g.roundRect(-25, -3.8, 3, 7.6, 1); g.fillStyle = metalX(g, -25, -22, '#d9aa3c'); g.fill(); // 하바키
    g.beginPath(); g.ellipse(-27.5, 0, 2.8, 9.5, 0, 0, Math.PI * 2); g.fillStyle = metalX(g, -30, -25, '#2e2a2c'); g.fill(); // 쓰바
    g.beginPath(); g.ellipse(-27.5, 0, 2.8, 9.5, 0, 0, Math.PI * 2); g.strokeStyle = st.fit === '#8e959e' ? '#6a6460' : st.fit; g.lineWidth = 1.1; g.stroke();
    grip(g, { ...st, grip: '#1c1a20', wrap: st.hell ? '#5a1a14' : '#e8e2d0' }, -56, -30, 6.2, true);
    g.beginPath(); g.roundRect(-59, -3.4, 3.4, 6.8, 1.4); g.fillStyle = metalX(g, -59, -55.6, st.fit === '#8e959e' ? '#5a5650' : st.fit); g.fill();
    if (st.gem) gem(g, -45, 0, 1.8, st.gem);
  },
  spear: (g, st) => {
    shaft(g, -60, 30, 5, st.hell ? '#3a3034' : st.fit === '#e6be52' ? '#efe6d2' : '#7a5232');
    poly(g, [[28, -2.8], [36, -6.5], [52, -3], [60, 0], [52, 3], [36, 6.5], [28, 2.8]], metal(g, -6.5, 6.5, st.blade));
    line(g, [[30, 0], [54, 0]], 1, shade(st.blade, -0.45)); line(g, [[36, -5.5], [52, -2.4], [59, 0]], 1, st.edge ?? shade(st.blade, 0.8)); glint(g, 50, -2, 2.6);
    g.beginPath(); g.roundRect(22, -3.6, 7, 7.2, 1.5); g.fillStyle = metalX(g, 22, 29, st.fit); g.fill();
    for (const x of [23.5, 26.5]) line(g, [[x, -3.6], [x, 3.6]], 0.7, shade(st.fit, -0.5), 'butt');
    if (!st.hell) { line(g, [[22, 2], [16, 9], [14, 13]], 2.2, st.fit === '#e6be52' ? '#f2e8c8' : '#b8282a'); line(g, [[21, 2.5], [13, 6], [10, 10]], 2, st.fit === '#e6be52' ? '#e8d8a8' : '#9a1e1e'); }
    else for (let k = 0; k < 4; k++) ball(g, 14 - k * 5, 4 + (k % 2) * 2, 1.8, '#5a5458'); // 쇠사슬
    if (st.gem) gem(g, 25.5, 0, 1.6, st.gem);
  },
  hatchet: (g, st, it) => {
    const cleaver = it.key === 'hcleaver' || it.key === 'scalecleaver';
    shaft(g, -56, 24, 5.2, st.hell ? '#3e2e28' : it.price >= 100_000 ? '#2a2c30' : '#8a6238');
    if (cleaver) { poly(g, [[4, -4], [30, -4], [32, -22], [2, -22]], metal(g, -22, -4, st.blade)); line(g, [[2, -21.5], [32, -21.5]], 1.2, st.edge ?? '#eef2f6'); g.beginPath(); g.arc(25, -16, 2, 0, Math.PI * 2); g.fillStyle = '#1a1416'; g.fill(); return; }
    poly(g, [[12, -3.5], [26, -3.5], [34, -14], [33, -22], [22, -20], [10, -18], [12, -8]], metal(g, -22, -3.5, it.price >= 100_000 ? '#8a929c' : st.blade));
    g.beginPath(); g.moveTo(34, -14); g.quadraticCurveTo(26, -24, 10, -18); g.strokeStyle = st.edge ?? '#f0f4f8'; g.lineWidth = 1.4; g.stroke();
    poly(g, [[13, 3.5], [25, 3.5], [23, 8], [15, 8]], metal(g, 3.5, 8, shade(st.blade, -0.25)));
    g.beginPath(); g.roundRect(11, -4, 16, 8, 2); g.fillStyle = metalX(g, 11, 27, shade(st.blade, -0.35)); g.fill();
    glint(g, 22, -19, 2.4);
  },
  fireaxe: (g, st, it) => {
    shaft(g, -58, 34, 5.4, st.hell ? '#3a2a24' : '#c8a060');
    const head = st.hell ? '#4a3a36' : '#b8282a';
    poly(g, [[22, -3.6], [36, -3.6], [46, -16], [44, -24], [30, -21], [18, -18], [21, -8]], metal(g, -24, -3.6, head));
    g.beginPath(); g.moveTo(46, -16); g.quadraticCurveTo(36, -26, 18, -18); g.strokeStyle = st.hell ? '#ff6a2a' : '#e8ecf0'; g.lineWidth = 2.4; g.stroke();
    poly(g, [[24, 3.6], [34, 3.6], [30, 16], [27, 18]], metal(g, 3.6, 18, head));
    g.beginPath(); g.roundRect(20, -4.2, 18, 8.4, 2); g.fillStyle = metalX(g, 20, 38, shade(head, -0.3)); g.fill();
    if (it.hell) for (let k = 0; k < 5; k++) ball(g, 30 + k * 3, -12 - (k % 2) * 3, 0.9, '#ffb04a');
  },
  sledge: (g, st, it) => {
    shaft(g, -58, 40, 5.6, st.hell ? '#3a2e2a' : '#9a7044');
    const head = it.key === 'slagmaul' ? '#5a4a44' : st.hell ? '#4e4a4e' : '#5d6470';
    g.beginPath(); g.roundRect(34, -16, 18, 32, 3); g.fillStyle = metalX(g, 34, 52, head); g.fill();
    g.beginPath(); g.roundRect(34, -16, 18, 4, 2); g.fillStyle = shade(head, 0.45); g.fill();
    g.beginPath(); g.roundRect(34, 12, 18, 4, 2); g.fillStyle = shade(head, -0.5); g.fill();
    if (it.key === 'slagmaul') for (let k = 0; k < 4; k++) line(g, [[37 + k * 4, -14], [36 + k * 4, 14]], 0.9, '#ff7a2a');
    if (st.gem) gem(g, 43, 0, 2.4, st.gem);
  },
  hammer: (g, st, it) => {
    const bone = it.key === 'hhammer' || it.key === 'molarmace';
    shaft(g, -56, 30, 5.4, bone ? '#cfc2a2' : st.hell ? '#3a2e2a' : '#9a7044');
    if (bone) { ball(g, 34, -2, 10, '#ddd0b0'); for (const [x, y] of [[30, -10], [40, -8], [42, 4], [28, 6]] as [number, number][]) ball(g, x, y, 3.4, '#efe6d0'); return; }
    g.beginPath(); g.roundRect(26, -14, 11, 12, 2); g.fillStyle = metalX(g, 26, 37, '#6a727e'); g.fill(); // 때리는 쪽
    g.beginPath(); g.ellipse(31.5, -15, 6, 2.4, 0, 0, Math.PI * 2); g.fillStyle = '#a8b0ba'; g.fill();
    poly(g, [[27, -2], [36, -2], [36, 6], [33, 16], [30, 18], [31, 8], [28, 4]], metal(g, -2, 18, '#6a727e')); // 노루발
    line(g, [[31.5, 6], [31.5, 16]], 1, '#2e323a');
  },
  maul: (g, st) => {
    shaft(g, -58, 34, 5.2, st.hell ? '#2e2a28' : '#5a4a3a');
    for (let k = 0; k < 8; k++) { const a = (k / 8) * Math.PI * 2, x = 42 + Math.cos(a) * 12, y = Math.sin(a) * 12; poly(g, [[42 + Math.cos(a - 0.22) * 9, Math.sin(a - 0.22) * 9], [x + Math.cos(a) * 6, y + Math.sin(a) * 6], [42 + Math.cos(a + 0.22) * 9, Math.sin(a + 0.22) * 9]], metal(g, -16, 16, '#9aa3ad')); }
    ball(g, 42, 0, 11, st.hell ? '#4a4448' : '#5d6470');
    g.beginPath(); g.roundRect(28, -3.6, 6, 7.2, 1.5); g.fillStyle = metalX(g, 28, 34, st.fit); g.fill();
    if (st.gem) gem(g, 42, 0, 2.6, st.gem);
  },
  pickaxe: (g, st) => {
    shaft(g, -58, 32, 5.2, st.hell ? '#3a2e28' : '#7a5232');
    g.beginPath(); g.moveTo(30, -26); g.quadraticCurveTo(38, 0, 30, 26); g.lineTo(34, 26); g.quadraticCurveTo(44, 0, 34, -26); g.closePath(); g.fillStyle = metalX(g, 30, 44, '#6e747c'); g.fill();
    line(g, [[33, -25], [38, -8]], 1, '#c0c6ce');
    g.beginPath(); g.roundRect(29, -4.5, 10, 9, 2); g.fillStyle = metalX(g, 29, 39, '#4a4e55'); g.fill();
  },
  shovel: (g, st) => {
    shaft(g, -50, 24, 4.6, '#8a6238');
    g.beginPath(); g.ellipse(-55, 0, 6, 8, 0, 0, Math.PI * 2); g.strokeStyle = '#5a3d22'; g.lineWidth = 3; g.stroke(); // D 손잡이
    g.beginPath(); g.moveTo(22, -3); g.lineTo(28, -12); g.quadraticCurveTo(52, -14, 60, 0); g.quadraticCurveTo(52, 14, 28, 12); g.lineTo(22, 3); g.closePath(); g.fillStyle = metal(g, -14, 14, '#7c8492'); g.fill();
    line(g, [[28, 0], [52, 0]], 1.4, '#4a505a'); line(g, [[30, -10], [52, -10]], 0.9, '#b8c0c8');
  },
  crowbar: (g) => {
    line(g, [[-56, 3], [40, 3]], 7, '#7a1a16'); line(g, [[-56, 2], [40, 2]], 5, '#b8302a'); line(g, [[-55, 0.6], [40, 0.6]], 1.2, '#e86a5a');
    g.beginPath(); g.moveTo(40, 3); g.quadraticCurveTo(56, 3, 54, -10); g.strokeStyle = '#7a1a16'; g.lineWidth = 7; g.stroke(); g.strokeStyle = '#b8302a'; g.lineWidth = 5; g.stroke();
    poly(g, [[51, -10], [58, -10], [55, -18]], '#a9b2bb');
    poly(g, [[-58, 0], [-62, -4], [-62, 6], [-58, 6]], '#a9b2bb');
  },
  wrench: (g) => {
    g.beginPath(); g.roundRect(-58, -4.5, 64, 9, 3); g.fillStyle = metal(g, -4.5, 4.5, '#b8302a'); g.fill();
    for (let x = -54; x < 0; x += 4) line(g, [[x, -4.5], [x + 2, 4.5]], 0.6, '#7a1a16');
    poly(g, [[4, -7], [26, -10], [34, -4], [30, 2], [36, 6], [30, 12], [6, 7]], metal(g, -10, 12, '#9aa2ac'));
    g.beginPath(); g.roundRect(14, -1, 10, 3, 1); g.fillStyle = '#4a505a'; g.fill();
    line(g, [[8, -6], [26, -8.5]], 1, '#dde3ea');
  },
  boltcutter: (g) => {
    for (const s of [-1, 1]) { line(g, [[-56, s * 7], [10, s * 2]], 6, '#7a1a16'); line(g, [[-56, s * 7 - 0.6], [10, s * 2 - 0.6]], 4, '#c0342e'); }
    line(g, [[10, -2], [40, -5]], 5, '#6a727c'); line(g, [[10, 2], [40, 5]], 5, '#5a626c');
    poly(g, [[38, -6], [56, -2], [40, -1]], '#b8c0c8'); poly(g, [[38, 6], [56, 2], [40, 1]], '#8a929c');
    ball(g, 12, 0, 4, '#4a4e55'); ball(g, 26, 0, 2.6, '#4a4e55');
  },
  pipe: (g) => {
    g.beginPath(); g.roundRect(-58, -5.5, 114, 11, 2); g.fillStyle = metal(g, -5.5, 5.5, '#7a8088'); g.fill();
    g.beginPath(); g.roundRect(-6, -7, 12, 14, 2); g.fillStyle = metal(g, -7, 7, '#6a7078'); g.fill(); // 이음쇠
    g.beginPath(); g.ellipse(56, 0, 2.4, 5.5, 0, 0, Math.PI * 2); g.fillStyle = '#1e2125'; g.fill();
    for (const x of [-40, 30]) line(g, [[x, -5], [x + 8, 5]], 0.8, 'rgba(120,60,30,0.6)'); // 녹
  },
  metalbat: (g) => {
    g.beginPath(); g.moveTo(-54, -3); g.lineTo(-18, -3.6); g.quadraticCurveTo(10, -7.5, 54, -7.5); g.quadraticCurveTo(59, 0, 54, 7.5); g.quadraticCurveTo(10, 7.5, -18, 3.6); g.lineTo(-54, 3); g.closePath(); g.fillStyle = metal(g, -7.5, 7.5, '#a9b2bb'); g.fill();
    g.beginPath(); g.roundRect(-54, -3.4, 30, 6.8, 2); g.fillStyle = '#1c1c20'; g.fill();
    for (let x = -52; x < -24; x += 3) line(g, [[x, -3.4], [x + 2, 3.4]], 0.6, '#3a3a40');
    g.beginPath(); g.ellipse(-56, 0, 2.6, 5, 0, 0, Math.PI * 2); g.fillStyle = '#2a2a2e'; g.fill();
    line(g, [[0, -5.5], [50, -6]], 1, '#eef2f6'); glint(g, 40, -4.5, 2.4);
  },
  bat: (g, st, it) => {
    if (it.key === 'hfemur') { // 넓적다리뼈
      line(g, [[-50, 0], [46, 0]], 8, '#cfc2a2'); line(g, [[-50, -1.6], [46, -1.6]], 3, '#efe6d0');
      for (const x of [-54, 50]) { ball(g, x, -4, 6, '#e2d6bc'); ball(g, x, 4, 6, '#d8ccb0'); }
      return;
    }
    const wood = it.key === 'wardenclub' ? '#5a4a3a' : '#c49a5e';
    g.beginPath(); g.moveTo(-54, -2.8); g.lineTo(-18, -3.4); g.quadraticCurveTo(10, -8, 54, -8); g.quadraticCurveTo(59, 0, 54, 8); g.quadraticCurveTo(10, 8, -18, 3.4); g.lineTo(-54, 2.8); g.closePath(); g.fillStyle = metal(g, -8, 8, wood); g.fill();
    for (let k = 0; k < 3; k++) line(g, [[-10 + k * 8, -4 + k * 3], [50, -5 + k * 3.4]], 0.6, shade(wood, -0.35));
    g.beginPath(); g.ellipse(-56, 0, 2.6, 5, 0, 0, Math.PI * 2); g.fillStyle = shade(wood, -0.4); g.fill();
    if (it.key === 'wardenclub') for (let k = 0; k < 5; k++) ball(g, 20 + k * 7, (k % 2 ? 1 : -1) * 6.5, 1.8, '#e2d6bc');
  },
  umbrella: (g) => {
    poly(g, [[-26, -2.5], [48, -7], [56, 0], [48, 7], [-26, 2.5]], metal(g, -7, 7, '#2a2a30'));
    for (const y of [-3.5, 0, 3.5]) line(g, [[-20, y * 0.4], [50, y]], 0.7, '#4a4a54');
    line(g, [[-24, 0], [-48, 0]], 2.4, '#a9b2bb'); line(g, [[56, 0], [61, 0]], 1.6, '#a9b2bb');
    g.beginPath(); g.moveTo(-48, 0); g.lineTo(-54, 0); g.arc(-54, 6, 6, -Math.PI / 2, Math.PI * 0.85, true); g.strokeStyle = '#7a5232'; g.lineWidth = 4; g.stroke();
    g.beginPath(); g.roundRect(-28, -3, 6, 6, 1); g.fillStyle = '#b8282a'; g.fill();
  },
  sickle: (g) => {
    shaft(g, -56, -8, 6, '#8a6238');
    g.beginPath(); g.moveTo(-8, -2); g.bezierCurveTo(10, -6, 40, -30, 18, -40); g.bezierCurveTo(34, -26, 14, -8, -8, 3); g.closePath(); g.fillStyle = metal(g, -40, 3, '#aab2bc'); g.fill();
    g.beginPath(); g.moveTo(-6, -3); g.bezierCurveTo(10, -7, 38, -30, 18, -40); g.strokeStyle = '#eef2f6'; g.lineWidth = 1.2; g.stroke();
    g.beginPath(); g.roundRect(-10, -4, 4, 8, 1); g.fillStyle = '#6a727c'; g.fill();
  },
  hook: (g, st, it) => {
    for (let k = 0; k < 8; k++) { g.beginPath(); g.ellipse(-56 + k * 7, 0, 4.2, k % 2 ? 1.8 : 3, 0, 0, Math.PI * 2); g.strokeStyle = '#7c8492'; g.lineWidth = 1.8; g.stroke(); }
    g.beginPath(); g.roundRect(2, -3, 18, 6, 2); g.fillStyle = metal(g, -3, 3, st.hell ? '#4a4448' : '#7c8492'); g.fill();
    g.beginPath(); g.moveTo(20, 0); g.lineTo(38, 0); g.arc(38, -12, 12, Math.PI / 2, -Math.PI * 0.9, true); g.strokeStyle = st.hell ? '#5a5458' : '#8a929c'; g.lineWidth = 5; g.stroke();
    g.beginPath(); g.moveTo(20, -1); g.lineTo(38, -1); g.arc(38, -12, 10.5, Math.PI / 2, -Math.PI * 0.9, true); g.strokeStyle = shade(st.hell ? '#5a5458' : '#8a929c', 0.5); g.lineWidth = 1; g.stroke();
    poly(g, [[27, -18], [24, -27], [31, -21]], it.key === 'leechhook' ? '#7a9a4a' : '#d8dde4');
  },
  whip: (g, st) => {
    grip(g, st, -58, -36, 7);
    pommel(g, st, -60, 3.6);
    g.beginPath(); g.moveTo(-36, 0); g.bezierCurveTo(-10, -20, 6, 22, 26, 2); g.bezierCurveTo(38, -10, 48, -16, 58, -8);
    g.strokeStyle = st.hell ? '#3a1a16' : '#4a2a18'; g.lineWidth = 3.6; g.stroke(); g.strokeStyle = st.hell ? '#6a2a20' : '#7a4a2a'; g.lineWidth = 1.2; g.stroke();
    if (st.hell) for (let k = 0; k < 9; k++) { const q = k / 9, x = -30 + q * 84, y = Math.sin(q * 6) * 8; poly(g, [[x, y - 2], [x + 2, y - 5], [x + 3, y - 1]], '#d8ccb0'); }
  },
  rifle: (g, st, it) => {
    const furn = it.key === 'milrifle' || it.key === 'sorifle' ? '#4a5038' : it.key === 'amrifle' ? '#2a2c30' : '#6a4228';
    poly(g, [[-60, 4], [-56, -5], [-24, -4], [-14, -4], [-12, 6], [-24, 8], [-40, 6], [-58, 10]], metal(g, -5, 10, furn)); // 개머리
    g.beginPath(); g.roundRect(-16, -5, 34, 9, 2); g.fillStyle = metal(g, -5, 4, '#2a2c30'); g.fill(); // 몸통
    g.beginPath(); g.roundRect(16, -2.6, 44, 4.4, 1.5); g.fillStyle = metal(g, -2.6, 1.8, '#1e2024'); g.fill(); // 총열
    g.beginPath(); g.roundRect(56, -3.4, 5, 6, 1); g.fillStyle = '#3a3c42'; g.fill();
    g.beginPath(); g.roundRect(-10, -13, 26, 5.6, 2.6); g.fillStyle = metal(g, -13, -7.4, '#1a1c20'); g.fill(); // 조준경
    g.beginPath(); g.ellipse(16, -10.2, 1.6, 3.4, 0, 0, Math.PI * 2); g.fillStyle = '#3a6a9a'; g.fill(); g.fillStyle = 'rgba(255,255,255,0.8)'; g.fillRect(15.4, -12.4, 0.9, 1.6);
    for (const x of [-4, 10]) { g.beginPath(); g.roundRect(x, -8, 3, 4, 0.6); g.fillStyle = '#2e3036'; g.fill(); }
    poly(g, [[-6, 4], [-2, 4], [-4, 12], [-8, 11]], '#1a1c20'); // 방아쇠울
    g.beginPath(); g.roundRect(-2, 4, 6, 8, 1.5); g.fillStyle = '#2a2c30'; g.fill(); // 탄창
    if (it.price >= 800_000) { line(g, [[20, 4], [26, 12]], 1.2, '#3a3c42'); line(g, [[20, 4], [16, 12]], 1.2, '#3a3c42'); } // 양각대
  },
  matchlock: (g) => { // 유황 화승총: 긴 총열 · 휜 개머리 · 놋쇠 띠 · 불붙은 화승
    g.beginPath(); g.moveTo(-60, -4); g.quadraticCurveTo(-40, -6, -18, -3.5); g.lineTo(-18, 4); g.quadraticCurveTo(-40, 6, -58, 12); g.closePath(); g.fillStyle = metal(g, -6, 12, '#5a2e1e'); g.fill();
    g.beginPath(); g.roundRect(-20, -3.5, 40, 7, 2); g.fillStyle = metal(g, -3.5, 3.5, '#4a2618'); g.fill(); // 앞 나무
    g.beginPath(); g.roundRect(-22, -2.6, 84, 4.2, 1.6); g.fillStyle = metal(g, -2.6, 1.6, '#3a3438'); g.fill(); // 총열
    for (const x of [0, 22, 44]) { g.beginPath(); g.roundRect(x, -3.2, 3, 6.4, 1); g.fillStyle = metalX(g, x, x + 3, '#c9a23e'); g.fill(); }
    g.beginPath(); g.roundRect(-24, 2, 14, 5, 1.5); g.fillStyle = metalX(g, -24, -10, '#8a7a5a'); g.fill(); // 불판
    g.beginPath(); g.moveTo(-16, 4); g.quadraticCurveTo(-22, -6, -14, -10); g.strokeStyle = '#c9a23e'; g.lineWidth = 2; g.stroke(); // 용두
    const fl = g.createRadialGradient(-13, -11, 0.5, -13, -11, 5); fl.addColorStop(0, '#fff2b0'); fl.addColorStop(0.5, '#ff8a2a'); fl.addColorStop(1, 'rgba(255,60,20,0)');
    g.beginPath(); g.arc(-13, -11, 5, 0, Math.PI * 2); g.fillStyle = fl; g.fill();
    line(g, [[-10, 8], [-4, 8]], 1.6, '#2a2224'); // 방아쇠
  },
  bow: (g, st, it) => {
    const wood = st.hell ? (it.key === 'hbonebow' ? '#d8ccb0' : '#4a2a22') : '#8a5a30';
    g.beginPath(); g.moveTo(-58, 6); g.quadraticCurveTo(-30, -22, 0, -14); g.quadraticCurveTo(30, -22, 58, 6); g.strokeStyle = shade(wood, -0.45); g.lineWidth = 5.6; g.stroke(); g.strokeStyle = wood; g.lineWidth = 3.8; g.stroke(); g.strokeStyle = shade(wood, 0.45); g.lineWidth = 1; g.stroke();
    line(g, [[-58, 6], [58, 6]], 0.9, '#efe8d6');
    g.beginPath(); g.roundRect(-6, -17, 12, 6, 2); g.fillStyle = st.hell ? '#2a1c1a' : '#3a2418'; g.fill();
    for (const x of [-58, 58]) ball(g, x, 6, 1.8, st.fit);
    // 걸어 둔 화살 한 대
    line(g, [[-2, 14], [52, -10]], 1.3, '#9a7a4a'); poly(g, [[52, -12], [58, -12.6], [53, -8]], '#c9ced6'); poly(g, [[-2, 14], [-6, 10], [2, 12]], '#c8382a');
  },
};

/** 눕히지 않고 그리는 것 (권총 · 화염방사기) — 화면 좌표 그대로 */
const FLAT: Record<string, Draw> = {
  pistol: (g, st, it) => {
    g.save(); g.translate(48, 46); g.rotate(-0.1);
    g.beginPath(); g.roundRect(-34, -16, 66, 13, 2.5); g.fillStyle = metal(g, -16, -3, '#2a2c32'); g.fill(); // 슬라이드
    for (let x = -30; x < -16; x += 2.6) line(g, [[x, -14], [x, -6]], 0.8, '#45484f', 'butt');
    line(g, [[-33, -14.6], [31, -14.6]], 1, '#6a6e76');
    g.beginPath(); g.roundRect(26, -18, 3, 3, 0.6); g.fillStyle = '#4a4e55'; g.fill(); g.beginPath(); g.roundRect(-30, -18, 4, 3, 0.6); g.fill();
    g.beginPath(); g.roundRect(-30, -4, 50, 6, 2); g.fillStyle = metal(g, -4, 2, '#1e2024'); g.fill(); // 프레임
    poly(g, [[-30, 0], [-12, 0], [-16, 30], [-34, 30], [-36, 26]], metal(g, 0, 30, '#24262c')); // 손잡이 (뒤로 기운다)
    g.beginPath(); g.moveTo(-28, 4); g.lineTo(-16, 4); g.lineTo(-19, 26); g.lineTo(-31, 26); g.closePath(); g.fillStyle = metal(g, 4, 26, it.price >= 100_000 ? '#6a4228' : '#3a2f28'); g.fill();
    for (let y = 7; y < 25; y += 2.6) line(g, [[-29 + (y - 4) * -0.12, y], [-18 + (y - 4) * -0.12, y]], 0.6, 'rgba(0,0,0,0.35)');
    ball(g, -24, 15, 1.4, '#9aa0a8');
    g.beginPath(); g.moveTo(-12, 2); g.quadraticCurveTo(-8, 14, 2, 2); g.strokeStyle = '#1a1b1e'; g.lineWidth = 2.6; g.stroke(); // 방아쇠울
    line(g, [[-7, 2], [-6, 8]], 1.8, '#3a3d44');
    g.beginPath(); g.roundRect(32, -12, 3, 5, 1); g.fillStyle = '#111215'; g.fill(); // 총구
    glint(g, 18, -13, 2.4);
    g.restore();
  },
  flamer: (g) => {
    for (const [x, w, col] of [[10, 16, '#4e5a2e'], [26, 16, '#5c6a36']] as [number, number, string][]) {
      g.beginPath(); g.roundRect(x, 16, w, 52, 7); g.fillStyle = metalX(g, x, x + w, col); g.fill();
      g.beginPath(); g.roundRect(x + 4, 10, w - 8, 8, 2); g.fillStyle = '#3a4222'; g.fill();
      line(g, [[x + 1, 40], [x + w - 1, 40]], 2, '#2e341a', 'butt');
    }
    g.beginPath(); g.moveTo(30, 66); g.bezierCurveTo(36, 84, 50, 82, 52, 64); g.strokeStyle = '#1e1e22'; g.lineWidth = 4; g.stroke();
    g.save(); g.translate(48, 52); g.rotate(-0.35);
    g.beginPath(); g.roundRect(0, -4, 40, 8, 2); g.fillStyle = metal(g, -4, 4, '#8a9098'); g.fill();
    g.beginPath(); g.roundRect(36, -6, 8, 12, 2); g.fillStyle = metal(g, -6, 6, '#4a4e55'); g.fill();
    g.beginPath(); g.roundRect(6, 4, 7, 12, 2); g.fillStyle = '#2a6a6a'; g.fill();
    const fl = g.createRadialGradient(48, 0, 1, 48, 0, 9); fl.addColorStop(0, '#fff2b0'); fl.addColorStop(0.5, '#ffb040'); fl.addColorStop(1, 'rgba(255,80,20,0)');
    g.beginPath(); g.ellipse(49, 0, 9, 6, 0, 0, Math.PI * 2); g.fillStyle = fl; g.fill();
    g.restore();
  },
};

const cache = new Map<string, HTMLCanvasElement>();

/** 무기 그림 (96×96). 그 모양이 없으면 null */
export function weaponArt(key: string, it: ItemDef): HTMLCanvasElement | null {
  if (it.key === 'hmatchlock') key = 'matchlock';
  const draw = ROT[key], flat = FLAT[key];
  if (!draw && !flat) return null;
  const id = `${key}|${it.key}`;
  let done = cache.get(id);
  if (!done) { done = paint(key, it, draw, flat); cache.set(id, done); }
  // 같은 그림을 여러 곳(가방 · 장비 칸 · 빠른 칸)에 붙이므로 매번 새 캔버스로 베껴 준다
  const c = document.createElement('canvas'); c.width = c.height = S; c.getContext('2d')!.drawImage(done, 0, 0); c.dataset.hd = '1';
  return c;
}
function paint(key: string, it: ItemDef, draw: Draw | undefined, flat: Draw | undefined): HTMLCanvasElement {
  const st = styleOf(it);
  const render = (k: number, bx: number, by: number) => {
    const art = document.createElement('canvas'); art.width = art.height = S;
    const g = art.getContext('2d')!;
    g.translate(S / 2, S / 2); g.scale(k, k); g.translate(-bx, -by);
    if (flat) flat(g, st, it);
    else if (draw) { g.translate(S / 2, S / 2); g.rotate(-Math.PI / 4); draw(g, st, it); }
    return art;
  };
  // 틀에 꽉 차게: 한 번 그려 테두리 상자를 재고, 그만큼 키워 다시 그린다 (짧은 단검도 칸을 채운다 · 너무 굵어지지 않게 1.45배까지)
  const first = render(1, S / 2, S / 2);
  const d = first.getContext('2d')!.getImageData(0, 0, S, S).data;
  let x0 = S, y0 = S, x1 = -1, y1 = -1;
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) if (d[(y * S + x) * 4 + 3] > 24) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  const pad = 8, k = x1 < 0 ? 1 : Math.min(1.45, (S - pad * 2) / Math.max(x1 - x0 + 1, y1 - y0 + 1));
  const fit = x1 < 0 ? first : render(k, (x0 + x1 + 1) / 2, (y0 + y1 + 1) / 2);
  // 실루엣으로 외곽선과 그림자
  const sil = document.createElement('canvas'); sil.width = sil.height = S;
  const sg = sil.getContext('2d')!;
  sg.drawImage(fit, 0, 0); sg.globalCompositeOperation = 'source-in'; sg.fillStyle = '#120c08'; sg.fillRect(0, 0, S, S);
  const out = document.createElement('canvas'); out.width = out.height = S;
  const o = out.getContext('2d')!;
  if (st.glow) { // 전설 · 천국 · 깊은 지옥 무기는 은은한 빛
    o.save(); o.shadowColor = st.glow; o.shadowBlur = 10; o.drawImage(sil, 0, 0); o.drawImage(sil, 0, 0); o.restore();
  }
  o.save(); o.shadowColor = 'rgba(0,0,0,0.55)'; o.shadowBlur = 4; o.shadowOffsetX = 2; o.shadowOffsetY = 3; o.drawImage(sil, 0, 0); o.restore();
  for (const [dx, dy] of [[-3, 0], [3, 0], [0, -3], [0, 3], [-2.1, -2.1], [2.1, -2.1], [-2.1, 2.1], [2.1, 2.1]]) o.drawImage(sil, dx, dy); // 화면에서 1px쯤 되는 테두리
  o.drawImage(fit, 0, 0);
  return out;
}
