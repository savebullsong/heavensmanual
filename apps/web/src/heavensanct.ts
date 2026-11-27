/**
 * 46차 천국의 건물: 성소의 언덕(구름 대성당 · 연화 불당 · 새벽빛 모스크)과 대리석 가게.
 * 모두 흰 대리석과 금. 그리는 자리는 heavenworld의 frame(건물 상자 + 높이)을 그대로 쓴다.
 */
import type { Building } from './zone.ts';
import { frame } from './heavenworld.ts';

type Pt = [number, number];

export const SANCT_TOP: Record<string, number> = { church: 300, temple: 230, mosque: 250 };

export function drawSanctum(b: Building & { att?: string }) {
  const kind = b.att ?? 'church';
  const top = SANCT_TOP[kind] ?? 260;
  const f = frame(b, top + 20);
  if (kind === 'temple') temple(b, f);
  else if (kind === 'mosque') mosque(b, f);
  else church(b, f);
  return { canvas: f.c, x: f.x, y: f.y };
}

type F = ReturnType<typeof frame>;

// ───────── 공통 도구 ─────────
function tools(f: F) {
  const { g, Q, poly } = f;
  /** x = 일정한 면(오른쪽 앞면) 위의 점 */
  const onX = (x: number, y: number, z: number) => Q(x + 0.01, y, z);
  /** y = 일정한 면(왼쪽 앞면 · 정면) 위의 점 */
  const onY = (x: number, y: number, z: number) => Q(x, y + 0.01, z);
  const stroke = (pts: Pt[], col: string, w = 1, close = false) => { g.strokeStyle = col; g.lineWidth = w; g.beginPath(); g.moveTo(pts[0][0], pts[0][1]); for (const p of pts.slice(1)) g.lineTo(p[0], p[1]); if (close) g.closePath(); g.stroke(); };
  /** 정면(y 면) 아치 창: xa~xb, 높이 z0~z1, 끝이 뾰족(pointed) 또는 둥근 아치 */
  const archY = (xa: number, xb: number, y: number, z0: number, z1: number, pointed: boolean): Pt[] => {
    const pts: Pt[] = [onY(xa, y, z0), onY(xb, y, z0)];
    const spring = z1 - (xb - xa) * (pointed ? 18 : 12);
    pts.push(onY(xb, y, spring));
    for (let k = 1; k < 10; k++) { const t = k / 10, a = Math.PI * t; const xm = (xa + xb) / 2 + Math.cos(a) * (xb - xa) / 2; const zz = spring + Math.sin(a) * (z1 - spring) * (pointed ? Math.pow(Math.sin(a), 0.4) : 1); pts.push(onY(xm, y, zz)); }
    pts.push(onY(xa, y, spring));
    return pts;
  };
  const archX = (x: number, ya: number, yb: number, z0: number, z1: number, pointed: boolean): Pt[] => {
    const pts: Pt[] = [onX(x, yb, z0), onX(x, ya, z0)];
    const spring = z1 - (yb - ya) * (pointed ? 18 : 12);
    pts.push(onX(x, ya, spring));
    for (let k = 1; k < 10; k++) { const t = k / 10, a = Math.PI * t; const ym = (ya + yb) / 2 - Math.cos(a) * (yb - ya) / 2; const zz = spring + Math.sin(a) * (z1 - spring) * (pointed ? Math.pow(Math.sin(a), 0.4) : 1); pts.push(onX(x, ym, zz)); }
    pts.push(onX(x, yb, spring));
    return pts;
  };
  /** 유리창: 위가 밝은 그라디언트 + 금테 */
  const glass = (pts: Pt[], c0: string, c1: string, rim = '#d9b44a') => {
    const ys = pts.map((p) => p[1]);
    const gr = g.createLinearGradient(0, Math.min(...ys), 0, Math.max(...ys)); gr.addColorStop(0, c0); gr.addColorStop(1, c1);
    g.fillStyle = gr; g.beginPath(); g.moveTo(pts[0][0], pts[0][1]); for (const p of pts.slice(1)) g.lineTo(p[0], p[1]); g.closePath(); g.fill();
    stroke(pts, rim, 1.2, true);
  };
  /** 둥근 몸통(기둥 · 북 · 탑): 중심 (cx, cy), 반지름 r칸, z0~z1 */
  const cyl = (cx: number, cy: number, r: number, z0: number, z1: number, lite: string, dark: string, cap?: string) => {
    const rx = r * 45.25, ry = r * 22.6;
    const [bx, by] = Q(cx, cy, z0), [tx, ty] = Q(cx, cy, z1);
    const gr = g.createLinearGradient(bx - rx, 0, bx + rx, 0);
    gr.addColorStop(0, lite); gr.addColorStop(0.35, lite); gr.addColorStop(1, dark);
    g.fillStyle = gr;
    g.beginPath(); g.moveTo(bx - rx, by); g.ellipse(bx, by, rx, ry, 0, Math.PI, 0, true); g.lineTo(tx + rx, ty); g.ellipse(tx, ty, rx, ry, 0, 0, Math.PI, true); g.closePath(); g.fill();
    if (cap) { g.fillStyle = cap; g.beginPath(); g.ellipse(tx, ty, rx, ry, 0, 0, Math.PI * 2); g.fill(); }
  };
  /** 돔(양파 · 반구): 높이마다 반지름 prof(t), t = 0(밑)~1(꼭대기) */
  const dome = (cx: number, cy: number, z0: number, z1: number, prof: (t: number) => number, lite: string, dark: string) => {
    for (let z = z0; z <= z1; z += 1.5) {
      const t = (z - z0) / (z1 - z0), r = prof(t);
      if (r <= 0.02) continue;
      const [x, y] = Q(cx, cy, z);
      const rx = r * 45.25, ry = r * 22.6;
      const gr = g.createLinearGradient(x - rx, 0, x + rx, 0);
      gr.addColorStop(0, lite); gr.addColorStop(0.4, lite); gr.addColorStop(1, dark);
      g.fillStyle = gr; g.beginPath(); g.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); g.fill();
    }
  };
  /** 빛나는 십자 · 초승달 등 꼭대기 장식 둘레의 빛 */
  const halo = (x: number, y: number, r: number, col = 'rgba(255,240,190,') => {
    const gr = g.createRadialGradient(x, y, 1, x, y, r); gr.addColorStop(0, col + '0.85)'); gr.addColorStop(1, col + '0)');
    g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill();
  };
  return { g, Q, poly, onX, onY, stroke, archY, archX, glass, cyl, dome, halo };
}

// ───────── 구름 대성당 ─────────
function church(b: Building, f: F) {
  const { box } = f;
  const T = tools(f);
  const { g, Q, poly, onX, onY } = T;
  const x0 = b.i0, y0 = b.j0, x1 = b.i0 + b.w, y1 = b.j0 + b.d;
  box(x0, y0, x1, y1, 0, 8, '#f4efe4', '#e4dccc', '#d4cab6'); // 기단
  const nx0 = x0 + 3.6, nx1 = x1 - 0.6, ny0 = y0 + 2.4, ny1 = y1 - 0.8, H = 86;
  box(nx0, ny0, nx1, ny1, 8, H, '#fbf8f2', '#f4efe6', '#e2dacb'); // 본당
  // 버팀벽과 높은 뾰족창 (정면)
  for (let x = nx0 + 0.9; x < nx1 - 0.5; x += 1.55) {
    T.glass(T.archY(x + 0.25, x + 1.05, ny1, 26, 72, true), '#cfe2ff', '#7a9ad8');
    T.stroke([onY(x + 0.65, ny1, 26), onY(x + 0.65, ny1, 66)], 'rgba(217,180,74,0.8)', 0.8); // 창살
    f.box(x - 0.12, ny1, x + 0.12, ny1 + 0.35, 8, 76, '#f6f2ea', '#ebe5d9', '#d8d0c0');
    poly([Q(x - 0.12, ny1 + 0.35, 76), Q(x + 0.12, ny1 + 0.35, 76), Q(x + 0.12, ny1, 86), Q(x - 0.12, ny1, 86)], '#e8c45a');
  }
  // 지붕: 길쭉한 박공 (옅은 하늘빛 기와 · 금 용마루) + 오른쪽 박공벽의 장미창
  const ym = (ny0 + ny1) / 2, RZ = 132;
  const roof = g.createLinearGradient(0, Q(nx0, ny1, H)[1], 0, Q(nx0, ym, RZ)[1]);
  roof.addColorStop(0, '#8aa0c4'); roof.addColorStop(1, '#c4d4ec');
  poly([Q(nx0 - 0.2, ny1 + 0.2, H), Q(nx1 + 0.2, ny1 + 0.2, H), Q(nx1 + 0.2, ym, RZ), Q(nx0 - 0.2, ym, RZ)], roof as unknown as string);
  for (let x = nx0; x < nx1; x += 0.5) T.stroke([Q(x, ny1 + 0.2, H), Q(x, ym, RZ)], 'rgba(90,110,150,0.25)', 0.8);
  poly([Q(nx1, ny0, H), Q(nx1, ny1, H), Q(nx1, ym, RZ)], '#efe9dc');
  T.stroke([Q(nx0 - 0.2, ym, RZ), Q(nx1 + 0.2, ym, RZ)], '#e8c45a', 2.4);
  T.stroke([Q(nx1 + 0.2, ny1 + 0.2, H), Q(nx1 + 0.2, ym, RZ), Q(nx1 + 0.2, ny0 - 0.2, H)], '#e8c45a', 1.6);
  { // 장미창
    const cz = 104, cy = ym, rr = 0.95, rz = 18;
    const ring = (k: number, s = 1) => onX(nx1, cy + Math.cos(k) * rr * s, cz + Math.sin(k) * rz * s);
    const cols = ['#6a9ad8', '#d85a6a', '#e8c45a', '#7ac08a', '#a87ad8', '#6ac0d8', '#e88a4a', '#5a7ac8'];
    for (let n = 0; n < 8; n++) { const a0 = (n / 8) * Math.PI * 2, a1 = ((n + 1) / 8) * Math.PI * 2; poly([onX(nx1, cy, cz), ring(a0), ring((a0 + a1) / 2), ring(a1)], cols[n]); }
    const pts: Pt[] = []; for (let n = 0; n <= 24; n++) pts.push(ring((n / 24) * Math.PI * 2));
    T.stroke(pts, '#d9b44a', 2);
    const [x, y] = onX(nx1, cy, cz); g.fillStyle = '#fff4c8'; g.beginPath(); g.arc(x, y, 3, 0, Math.PI * 2); g.fill();
  }
  // 정문: 금빛 겹아치 문 (정면 가운데)
  { const xa = (nx0 + nx1) / 2 - 0.9, xb = (nx0 + nx1) / 2 + 0.9;
    T.glass(T.archY(xa - 0.25, xb + 0.25, ny1 + 0.02, 8, 64, true), '#f6e2a0', '#c99a36', '#b8862f');
    T.glass(T.archY(xa, xb, ny1 + 0.03, 8, 56, true), '#7a5232', '#5a3a22', '#e8c45a');
    T.stroke([onY((xa + xb) / 2, ny1 + 0.03, 8), onY((xa + xb) / 2, ny1 + 0.03, 50)], '#e8c45a', 1);
    for (const x of [xa + 0.35, xb - 0.35]) { const [hx, hy] = onY(x, ny1 + 0.03, 28); g.fillStyle = '#ffe9a8'; g.beginPath(); g.arc(hx, hy, 1.6, 0, Math.PI * 2); g.fill(); }
  }
  // 종탑과 첨탑 (왼쪽 앞 모서리)
  const tx0 = x0 + 0.5, tx1 = x0 + 3.4, ty0 = y1 - 3.6, ty1 = y1 - 0.5, TZ = 196;
  box(tx0, ty0, tx1, ty1, 8, TZ, '#f8f4ec', '#f6f1e8', '#e2dacb');
  for (const z of [70, 130, TZ - 4]) { poly([onY(tx0, ty1, z), onY(tx1, ty1, z), onY(tx1, ty1, z + 4), onY(tx0, ty1, z + 4)], '#e8c45a'); poly([onX(tx1, ty0, z), onX(tx1, ty1, z), onX(tx1, ty1, z + 4), onX(tx1, ty0, z + 4)], '#c9a23e'); }
  T.glass(T.archY(tx0 + 0.9, tx1 - 0.9, ty1, 24, 60, true), '#cfe2ff', '#7a9ad8');
  T.glass(T.archY(tx0 + 0.6, tx1 - 0.6, ty1, 140, 186, true), '#3a3448', '#2a2436', '#e8c45a'); // 종이 걸린 창
  T.glass(T.archX(tx1, ty0 + 0.6, ty1 - 0.6, 140, 186, true), '#2a2436', '#1e1a28', '#c9a23e');
  { const [bx, by] = onY((tx0 + tx1) / 2, ty1, 160); g.fillStyle = '#e8c45a'; g.beginPath(); g.moveTo(bx - 6, by + 6); g.quadraticCurveTo(bx, by - 12, bx + 6, by + 6); g.closePath(); g.fill(); } // 종
  { // 시계
    const [cx2, cy2] = onY((tx0 + tx1) / 2, ty1, 104);
    g.fillStyle = '#fffaf0'; g.beginPath(); g.ellipse(cx2, cy2, 10, 11, 0, 0, Math.PI * 2); g.fill(); g.strokeStyle = '#d9b44a'; g.lineWidth = 2; g.stroke();
    g.strokeStyle = '#5a4a3a'; g.lineWidth = 1.2; g.beginPath(); g.moveTo(cx2, cy2); g.lineTo(cx2, cy2 - 7); g.moveTo(cx2, cy2); g.lineTo(cx2 + 5, cy2 + 2); g.stroke();
  }
  // 뾰족 첨탑 (네 면 피라미드) + 금 십자 + 빛
  const cx = (tx0 + tx1) / 2, cy = (ty0 + ty1) / 2, apexZ = SANCT_TOP.church - 26;
  poly([Q(tx0, ty1, TZ), Q(tx1, ty1, TZ), Q(cx, cy, apexZ)], '#c4d4ec');
  poly([Q(tx1, ty0, TZ), Q(tx1, ty1, TZ), Q(cx, cy, apexZ)], '#8aa0c4');
  T.stroke([Q(tx1, ty1, TZ), Q(cx, cy, apexZ)], '#e8c45a', 1.4);
  const [ax, ay] = Q(cx, cy, apexZ);
  T.halo(ax, ay - 14, 22);
  g.fillStyle = '#f2d27a'; g.fillRect(Math.round(ax) - 1.5, Math.round(ay) - 26, 3, 26); g.fillRect(Math.round(ax) - 7, Math.round(ay) - 19, 14, 3);
}

// ───────── 연화 불당 (태국 사원풍: 겹지붕 · 금빛 처마 장식 · 뒤의 금탑) ─────────
function temple(b: Building, f: F) {
  const { box } = f;
  const T = tools(f);
  const { g, Q, poly, onX, onY } = T;
  const x0 = b.i0, y0 = b.j0, x1 = b.i0 + b.w, y1 = b.j0 + b.d;
  // 뒤쪽 금탑(체디): 종 모양 + 가늘어지는 꼭대기 (본당보다 먼저 — 뒤에 서 있다)
  { const cx = x0 + 2.2, cy = y0 + 2.2;
    T.cyl(cx, cy, 1.5, 0, 26, '#f6f0e2', '#d8cbb0', '#efe6d0');
    T.dome(cx, cy, 26, 120, (t) => t < 0.45 ? 1.45 * Math.sqrt(1 - Math.pow(t / 0.45 - 0.2, 2) * 0.55) : 1.2 * Math.pow(1 - (t - 0.45) / 0.55, 1.6) + 0.12, '#f8e08a', '#c99a36');
    T.dome(cx, cy, 120, SANCT_TOP.temple - 20, (t) => 0.18 * (1 - t) + 0.02, '#fff0b0', '#d9b44a');
    const [ax, ay] = Q(cx, cy, SANCT_TOP.temple - 20); T.halo(ax, ay, 16);
  }
  box(x0, y0, x1, y1, 0, 14, '#f6f2ea', '#ebe4d6', '#d8ccb8'); // 기단
  poly([onY(x0, y1, 10), onY(x1, y1, 10), onY(x1, y1, 14), onY(x0, y1, 14)], '#e8c45a'); poly([onX(x1, y0, 10), onX(x1, y1, 10), onX(x1, y1, 14), onX(x1, y0, 14)], '#c9a23e');
  // 앞 계단
  { const cx = (x0 + x1) / 2; for (let k = 0; k < 4; k++) box(cx - 1.4, y1 + 0.02 - 0.0, cx + 1.4, y1 + 0.55 - k * 0.12, 0, 14 - k * 3.5, '#f8f4ec', '#ece4d4', '#dcd2c0'); }
  const hx0 = x0 + 1.4, hx1 = x1 - 1.0, hy0 = y0 + 1.6, hy1 = y1 - 1.2, H = 66;
  box(hx0, hy0, hx1, hy1, 14, H, '#fbf6ec', '#f6efe2', '#e4d8c4'); // 본당
  // 흰 기둥(금 머리) · 금테 붉은 문과 창
  for (let x = hx0 + 0.3; x <= hx1 - 0.2; x += 1.3) { box(x - 0.13, hy1, x + 0.13, hy1 + 0.4, 14, H, '#fffdf8', '#f4ede0', '#e2d6c2'); poly([onY(x - 0.2, hy1 + 0.4, H - 6), onY(x + 0.2, hy1 + 0.4, H - 6), onY(x + 0.2, hy1 + 0.4, H), onY(x - 0.2, hy1 + 0.4, H)], '#e8b84a'); }
  for (let x = hx0 + 0.75; x < hx1 - 0.8; x += 2.6) T.glass([onY(x, hy1, 22), onY(x + 0.9, hy1, 22), onY(x + 0.9, hy1, 54), onY(x + 0.45, hy1, 60), onY(x, hy1, 54)], '#a8282a', '#7a1a1a', '#e8b84a');
  for (let y = hy0 + 0.8; y < hy1 - 0.6; y += 2.4) T.glass([onX(hx1, y + 0.9, 24), onX(hx1, y, 24), onX(hx1, y, 50), onX(hx1, y + 0.45, 56), onX(hx1, y + 0.9, 50)], '#a8282a', '#7a1a1a', '#c9a23e');
  { const cx = (hx0 + hx1) / 2; T.glass([onY(cx - 0.75, hy1, 14), onY(cx + 0.75, hy1, 14), onY(cx + 0.75, hy1, 52), onY(cx, hy1, 62), onY(cx - 0.75, hy1, 52)], '#e8b84a', '#b8862f', '#fff0b0'); T.stroke([onY(cx, hy1, 14), onY(cx, hy1, 52)], '#8a5a1a', 1); }
  // 겹지붕: 아래 큰 지붕 · 위 작은 지붕 (주황 기와 · 초록 띠 · 금 처마)
  const tier = (ex0: number, ex1: number, ey0: number, ey1: number, z0: number, z1: number) => {
    const ym = (ey0 + ey1) / 2;
    const gr = g.createLinearGradient(0, Q(ex0, ey1, z0)[1], 0, Q(ex0, ym, z1)[1]); gr.addColorStop(0, '#c8402a'); gr.addColorStop(1, '#e86a3a');
    poly([Q(ex0, ey1, z0), Q(ex1, ey1, z0), Q(ex1 - 0.5, ym, z1), Q(ex0 + 0.5, ym, z1)], gr as unknown as string);
    for (let x = ex0 + 0.3; x < ex1; x += 0.45) T.stroke([Q(x, ey1, z0), Q(x + (x < (ex0 + ex1) / 2 ? 0.25 : -0.25), ym, z1)], 'rgba(120,30,20,0.35)', 0.8);
    poly([Q(ex0, ey1, z0), Q(ex1, ey1, z0), Q(ex1, ey1 - 0.35, z0 + 6), Q(ex0, ey1 - 0.35, z0 + 6)], '#2a7a52'); // 초록 처마 띠
    // 박공(오른쪽): 금 테두리 · 붉은 판 · 금 연꽃
    poly([Q(ex1, ey0, z0), Q(ex1, ey1, z0), Q(ex1 - 0.5, ym, z1)], '#e8b84a');
    poly([Q(ex1 - 0.05, ey0 + 0.45, z0 + 4), Q(ex1 - 0.05, ey1 - 0.45, z0 + 4), Q(ex1 - 0.45, ym, z1 - 8)], '#a8282a');
    { const [lx, ly] = Q(ex1 - 0.2, ym, z0 + (z1 - z0) * 0.4); g.fillStyle = '#f2d27a'; for (let k = 0; k < 5; k++) { const a = -Math.PI / 2 + (k - 2) * 0.5; g.beginPath(); g.ellipse(lx + Math.cos(a) * 4, ly + Math.sin(a) * 4, 2, 4.5, a + Math.PI / 2, 0, Math.PI * 2); g.fill(); } }
    // 금 처마 테 · 용마루 끝의 금빛 쵸파(새 부리처럼 휜 장식)
    T.stroke([Q(ex1, ey1, z0), Q(ex1 - 0.5, ym, z1), Q(ex1, ey0, z0)], '#f2d27a', 2.2);
    T.stroke([Q(ex0 + 0.5, ym, z1), Q(ex1 - 0.5, ym, z1)], '#f2d27a', 2);
    for (const [xx, yy, zz] of [[ex1, ey1, z0], [ex1, ey0, z0]] as const) { const [px, py] = Q(xx, yy, zz); g.strokeStyle = '#f2d27a'; g.lineWidth = 2; g.beginPath(); g.moveTo(px, py); g.quadraticCurveTo(px + 6, py - 2, px + 7, py - 9); g.stroke(); }
    { const [px, py] = Q(ex1 - 0.5, ym, z1); g.strokeStyle = '#f2d27a'; g.lineWidth = 2.4; g.beginPath(); g.moveTo(px, py); g.quadraticCurveTo(px + 3, py - 12, px + 10, py - 16); g.stroke(); }
  };
  tier(hx0 - 0.6, hx1 + 0.6, hy0 - 0.6, hy1 + 0.7, H, 112);
  tier(hx0 + 0.8, hx1 - 0.2, hy0 + 0.5, hy1 - 0.4, 102, 146);
}

// ───────── 새벽빛 모스크 (흰 돔 · 첨탑 둘 · 정문 이완) ─────────
function mosque(b: Building, f: F) {
  const { box } = f;
  const T = tools(f);
  const { g, Q, poly, onX, onY } = T;
  const x0 = b.i0, y0 = b.j0, x1 = b.i0 + b.w, y1 = b.j0 + b.d;
  const minaret = (cx: number, cy: number) => {
    T.cyl(cx, cy, 0.55, 8, 176, '#fbfaf6', '#d8d2c4', '#f2eee6');
    for (const z of [60, 120]) T.cyl(cx, cy, 0.58, z, z + 4, '#6ac0b8', '#2a7a72');
    T.cyl(cx, cy, 0.8, 170, 176, '#f6f2ea', '#cfc8b8', '#efe8da'); // 발코니
    T.cyl(cx, cy, 0.45, 176, 196, '#fbfaf6', '#d8d2c4');
    T.dome(cx, cy, 196, 226, (t) => 0.5 * Math.sin(Math.PI * Math.min(1, t * 1.15) * 0.55 + 0.35) * (1 - t * 0.9), '#fffaf0', '#d9c8a0');
    const [ax, ay] = Q(cx, cy, 226); g.fillStyle = '#f2d27a'; g.fillRect(Math.round(ax) - 1, Math.round(ay) - 10, 2, 10);
    g.beginPath(); g.arc(ax, ay - 13, 3.2, Math.PI * 0.2, Math.PI * 1.8); g.strokeStyle = '#f2d27a'; g.lineWidth = 1.6; g.stroke();
  };
  box(x0, y0, x1, y1, 0, 8, '#f4f0e8', '#e6e0d4', '#d4ccbc');
  minaret(x1 - 0.9, y0 + 0.9); // 뒤 오른쪽
  const hx0 = x0 + 1.2, hx1 = x1 - 1.2, hy0 = y0 + 1.2, hy1 = y1 - 1.0, H = 70;
  box(hx0, hy0, hx1, hy1, 8, H, '#fcfbf7', '#f4f0e8', '#e0d8c8');
  // 위 띠: 청록과 금의 무늬
  poly([onY(hx0, hy1, H - 12), onY(hx1, hy1, H - 12), onY(hx1, hy1, H - 4), onY(hx0, hy1, H - 4)], '#2a8a80');
  poly([onX(hx1, hy0, H - 12), onX(hx1, hy1, H - 12), onX(hx1, hy1, H - 4), onX(hx1, hy0, H - 4)], '#1e6a62');
  for (let x = hx0 + 0.2; x < hx1; x += 0.5) { const [px, py] = onY(x, hy1, H - 8); g.fillStyle = '#f2d27a'; g.fillRect(Math.round(px), Math.round(py) - 1, 2, 2); }
  for (let y = hy0 + 0.2; y < hy1; y += 0.5) { const [px, py] = onX(hx1, y, H - 8); g.fillStyle = '#d9b44a'; g.fillRect(Math.round(px), Math.round(py) - 1, 2, 2); }
  // 말발굽 아치 창 (정면 · 오른쪽)
  for (let x = hx0 + 0.6; x < hx1 - 0.9; x += 1.7) if (Math.abs(x + 0.4 - (hx0 + hx1) / 2) > 1.5) T.glass(T.archY(x, x + 0.85, hy1, 22, 52, true), '#a8e0e8', '#3a8a9a');
  for (let y = hy0 + 0.6; y < hy1 - 0.9; y += 1.7) T.glass(T.archX(hx1, y, y + 0.85, 22, 52, true), '#8ad0d8', '#2a7a8a', '#c9a23e');
  // 정문 이완 (높은 직사각 틀 안의 큰 아치)
  { const cx = (hx0 + hx1) / 2;
    box(cx - 1.7, hy1, cx + 1.7, hy1 + 0.6, 8, 100, '#fffdf8', '#f6f2ea', '#e2dacb');
    poly([onY(cx - 1.7, hy1 + 0.6, 94), onY(cx + 1.7, hy1 + 0.6, 94), onY(cx + 1.7, hy1 + 0.6, 100), onY(cx - 1.7, hy1 + 0.6, 100)], '#2a8a80');
    T.glass(T.archY(cx - 1.2, cx + 1.2, hy1 + 0.61, 8, 88, true), '#f6e2a0', '#c99a36', '#2a8a80');
    T.glass(T.archY(cx - 0.75, cx + 0.75, hy1 + 0.62, 8, 60, true), '#3a6a72', '#1e4a52', '#f2d27a');
    for (let k = 0; k < 6; k++) { const [px, py] = onY(cx - 1.1 + k * 0.44, hy1 + 0.62, 76); g.fillStyle = '#2a8a80'; g.beginPath(); g.arc(px, py, 1.6, 0, Math.PI * 2); g.fill(); } // 무카르나스 점
  }
  // 큰 돔: 북(드럼) 위의 양파 돔 + 금 초승달
  const cx = (hx0 + hx1) / 2, cy = (hy0 + hy1) / 2;
  T.cyl(cx, cy, 2.5, H, H + 20, '#fbfaf6', '#d8d2c4', '#f2eee6');
  for (let k = 0; k < 10; k++) { const a = Math.PI * (0.05 + (k / 10) * 0.9); const [px, py] = Q(cx + Math.cos(a) * 2.5 * 0.707 - Math.sin(a) * 0, cy + Math.cos(a) * 0 + Math.sin(a) * 2.5 * 0.707, H + 6); g.fillStyle = '#3a8a9a'; g.fillRect(Math.round(px) - 1, Math.round(py) - 8, 3, 8); }
  T.dome(cx, cy, H + 20, SANCT_TOP.mosque - 40, (t) => 2.7 * Math.sin(Math.PI * Math.min(1, 0.3 + t * 0.85)) * (1 - Math.pow(t, 3) * 0.3) * (t > 0.85 ? (1 - t) / 0.15 * 0.5 + 0.1 : 1), '#fffcf4', '#d8c89e');
  { const [ax, ay] = Q(cx, cy, SANCT_TOP.mosque - 42);
    g.fillStyle = '#f2d27a'; g.fillRect(Math.round(ax) - 1.5, Math.round(ay) - 18, 3, 18);
    for (const [r2, y2] of [[3.5, -20], [2.5, -26]] as const) { g.beginPath(); g.arc(ax, ay + y2, r2, 0, Math.PI * 2); g.fill(); }
    g.beginPath(); g.arc(ax, ay - 34, 5, Math.PI * 0.15, Math.PI * 1.85); g.strokeStyle = '#f2d27a'; g.lineWidth = 2.2; g.stroke();
    T.halo(ax, ay - 30, 20);
  }
  minaret(x0 + 0.9, y1 - 0.9); // 앞 왼쪽
}

// ───────── 천국의 대리석 가게 ─────────
/** 흰 대리석 벽 · 금 처마돌림띠 · 벽기둥과 금 기둥머리 · 따뜻하게 빛나는 둥근 창 · 정면 금 간판 */
export function drawMarbleShop(b: Building, name: string) {
  const H = b.h;
  const f = frame(b, H + 30);
  const { box } = f;
  const T = tools(f);
  const { g, Q, poly, onX, onY } = T;
  const x0 = b.i0, y0 = b.j0, x1 = b.i0 + b.w, y1 = b.j0 + b.d;
  const tone = b.color ?? '#fbf9f4';
  box(x0, y0, x1, y1, 0, 6, '#ece6da', '#ddd5c6', '#cdc4b2');
  box(x0 + 0.15, y0 + 0.15, x1 - 0.15, y1 - 0.15, 6, H, tone, mix(tone, '#d8d0c0', 0.25), mix(tone, '#b8ae9a', 0.35));
  // 대리석 결
  g.save(); g.globalAlpha = 0.22; g.strokeStyle = '#9a9488'; g.lineWidth = 0.7;
  for (let k = 0; k < 6; k++) { const xa = x0 + 0.5 + ((k * 2.3) % (b.w - 1)), za = 14 + ((k * 37) % Math.max(20, H - 30)); T.stroke([onY(xa, y1 - 0.15, za), onY(xa + 0.6, y1 - 0.15, za + 9), onY(xa + 1.1, y1 - 0.15, za + 6)], '#9a9488', 0.7); }
  g.restore();
  // 층마다 둥근 창 (위층은 작게) · 벽기둥
  const floors = Math.max(1, Math.floor((H - 20) / 38));
  for (let fl = 0; fl < floors; fl++) {
    const z0 = 14 + fl * 38, z1 = z0 + (fl === 0 ? 28 : 24);
    for (let x = x0 + 0.7; x < x1 - 0.8; x += 1.4) if (!(fl === 0 && Math.abs(x + 0.35 - (x0 + x1) / 2) < 1.2)) T.glass(T.archY(x, x + 0.7, y1 - 0.15, z0, z1, false), '#fff6d8', '#f0d28a');
    for (let y = y0 + 0.7; y < y1 - 0.8; y += 1.4) T.glass(T.archX(x1 - 0.15, y, y + 0.7, z0, z1, false), '#f8e8b8', '#dcc07a', '#c9a23e');
  }
  for (let x = x0 + 0.35; x < x1; x += 1.4) { poly([onY(x - 0.08, y1 - 0.14, 6), onY(x + 0.08, y1 - 0.14, 6), onY(x + 0.08, y1 - 0.14, H - 8), onY(x - 0.08, y1 - 0.14, H - 8)], 'rgba(255,255,255,0.7)'); poly([onY(x - 0.13, y1 - 0.13, H - 12), onY(x + 0.13, y1 - 0.13, H - 12), onY(x + 0.13, y1 - 0.13, H - 7), onY(x - 0.13, y1 - 0.13, H - 7)], '#e8c45a'); }
  // 처마돌림띠 (금) · 난간
  box(x0, y0, x1, y1, H, H + 7, '#f6dc8a', '#e0bc5a', '#c49c3e');
  poly([Q(x0 + 0.25, y0 + 0.25, H + 7), Q(x1 - 0.25, y0 + 0.25, H + 7), Q(x1 - 0.25, y1 - 0.25, H + 7), Q(x0 + 0.25, y1 - 0.25, H + 7)], '#f4f0e8'); // 지붕: 흰 대리석 (금은 테두리만)
  poly([Q(x0 + 0.6, y0 + 0.6, H + 7), Q(x1 - 0.6, y0 + 0.6, H + 7), Q(x1 - 0.6, y1 - 0.6, H + 7), Q(x0 + 0.6, y1 - 0.6, H + 7)], '#e8e2d6');
  if (b.w >= 6) { const rcx = (x0 + x1) / 2, rcy = (y0 + y1) / 2; T.cyl(rcx, rcy, 0.9, H + 7, H + 16, '#fbf8f2', '#d8d0c0', '#f2eee6'); T.dome(rcx, rcy, H + 16, H + 30, (t) => 0.95 * Math.sqrt(Math.max(0, 1 - t * t)), '#fff6d8', '#d9b44a'); }
  for (let x = x0 + 0.2; x < x1; x += 0.35) { const a = Q(x, y1, H + 7), c = Q(x, y1, H + 15); T.stroke([a, c], '#f6f2ea', 1.6); }
  T.stroke([Q(x0, y1, H + 15), Q(x1, y1, H + 15), Q(x1, y0, H + 15)], '#e8c45a', 2);
  // 정문: 금테 유리문 + 위의 금 간판(이름)
  const cx = (x0 + x1) / 2;
  T.glass([onY(cx - 0.75, y1 - 0.14, 6), onY(cx + 0.75, y1 - 0.14, 6), onY(cx + 0.75, y1 - 0.14, 34), onY(cx - 0.75, y1 - 0.14, 34)], '#e8f2f8', '#a8c4d4', '#d9b44a');
  T.stroke([onY(cx, y1 - 0.14, 6), onY(cx, y1 - 0.14, 34)], '#d9b44a', 1);
  const [sx0, sy0] = onY(cx - 1.9, y1 - 0.12, 46), [sx1, sy1] = onY(cx + 1.9, y1 - 0.12, 46);
  poly([onY(cx - 1.9, y1 - 0.12, 38), onY(cx + 1.9, y1 - 0.12, 38), onY(cx + 1.9, y1 - 0.12, 50), onY(cx - 1.9, y1 - 0.12, 50)], '#e8c45a');
  poly([onY(cx - 1.8, y1 - 0.11, 39.5), onY(cx + 1.8, y1 - 0.11, 39.5), onY(cx + 1.8, y1 - 0.11, 48.5), onY(cx - 1.8, y1 - 0.11, 48.5)], '#fffaf0');
  g.save();
  const ang = Math.atan2(sy1 - sy0, sx1 - sx0);
  g.translate((sx0 + sx1) / 2, (sy0 + sy1) / 2 + 0.5); g.transform(1, Math.tan(ang), 0, 1, 0, 0);
  g.fillStyle = '#6a4a1a'; g.font = 'bold 8px system-ui, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
  const w = Math.hypot(sx1 - sx0, sy1 - sy0) - 6;
  let label = name; while (label.length > 1 && g.measureText(label).width > w) label = label.slice(0, -1);
  g.fillText(label, 0, 0);
  g.restore();
  // 정문 양옆 금 화분 (흰 꽃)
  for (const x of [cx - 1.25, cx + 1.25]) { const [px, py] = onY(x, y1 + 0.25, 0); g.fillStyle = '#d9b44a'; g.fillRect(Math.round(px) - 3, Math.round(py) - 7, 6, 7); g.fillStyle = '#ffffff'; for (const [dx, dy] of [[-3, -9], [0, -11], [3, -9], [-1, -13], [2, -13]]) { g.beginPath(); g.arc(px + dx, py + dy, 2, 0, Math.PI * 2); g.fill(); } }
  return { canvas: f.c, x: f.x, y: f.y };
}
function mix(a: string, b: string, t: number) {
  const pa = parseInt(a.slice(1), 16), pb = parseInt(b.slice(1), 16);
  const c = [16, 8, 0].map((s) => Math.round(((pa >> s) & 255) * (1 - t) + ((pb >> s) & 255) * t));
  return '#' + c.map((v) => v.toString(16).padStart(2, '0')).join('');
}
