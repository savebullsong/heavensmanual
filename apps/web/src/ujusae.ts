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

  // ── 입체 창 도구 ──
  // 면 앞뒤로 dd만큼 옮긴 평면 위에 그린다 (왼쪽 면은 +y가 바깥, 오른쪽 면은 +x가 바깥, -는 벽 속)
  const quadLy = (a: number, bb: number, z0: number, z1: number, dd: number, fill: string) => poly([P(a, j1 + dd, z0), P(bb, j1 + dd, z0), P(bb, j1 + dd, z1), P(a, j1 + dd, z1)], fill);
  const quadRx = (a: number, bb: number, z0: number, z1: number, dd: number, fill: string) => poly([P(i1 + dd, a, z0), P(i1 + dd, bb, z0), P(i1 + dd, bb, z1), P(i1 + dd, a, z1)], fill);
  type Outline = (dd: number, grow: number) => Pt[];
  const rectL = (a: number, bb: number, z0: number, z1: number): Outline => (dd, gr) => { const gx = gr / (TW / 2); return [P(a - gx, j1 + dd, z0 - gr), P(bb + gx, j1 + dd, z0 - gr), P(bb + gx, j1 + dd, z1 + gr), P(a - gx, j1 + dd, z1 + gr)]; };
  const rectR = (a: number, bb: number, z0: number, z1: number): Outline => (dd, gr) => { const gy = gr / (TW / 2); return [P(i1 + dd, a - gy, z0 - gr), P(i1 + dd, bb + gy, z0 - gr), P(i1 + dd, bb + gy, z1 + gr), P(i1 + dd, a - gy, z1 + gr)]; };
  const circL = (cx: number, cz: number, r: number): Outline => (dd, gr) => {
    const pts: Pt[] = [];
    for (let k = 0; k < 36; k++) { const a = (k / 36) * Math.PI * 2; pts.push(P(cx + ((r + gr) / (TW / 2)) * Math.cos(a), j1 + dd, cz + (r + gr) * Math.sin(a))); }
    return pts;
  };
  const trace = (pts: Pt[]) => { g.moveTo(pts[0][0], pts[0][1]); for (const q of pts.slice(1)) g.lineTo(q[0], q[1]); g.closePath(); };
  const shift = (face: 'L' | 'R', dd: number): Pt => (face === 'L' ? [-dd * (TW / 2), dd * (TH / 2)] : [dd * (TW / 2), dd * (TH / 2)]);
  const topLit = '#4c667a', jambL = '#22303f', jambR = '#30465a';
  /**
   * 벽에 파인 창: ① 구멍 속 단면을 얕은 곳부터 깊은 곳까지 겹쳐 그려 보이는 안쪽 벽(설주·창턱)만 남기고
   * ② 깊이만큼 옮긴 유리와 그 너머 ③ 위 설주의 그림자·유리 반사 ④ 벽 위 틀 그림자 → 튀어나온 틀(옆 두께 → 앞면)
   */
  const recess = (face: 'L' | 'R', o: Outline, opt: { dep: number; glass: string; inner?: () => void; shine?: boolean; frame?: { w: number; out: number; face: string; side: string; hi?: string } }) => {
    const { dep } = opt;
    g.save();
    g.beginPath(); trace(o(0, 0)); g.clip();
    const n = Math.max(3, Math.ceil(dep * (TW / 2)));
    for (let k = 0; k <= n; k++) {
      const pts = o(-dep * (k / n), 0);
      const ys = pts.map((q) => q[1]);
      const y0 = Math.min(...ys), y1 = Math.max(...ys);
      const gr = g.createLinearGradient(0, y0, 0, y1);
      gr.addColorStop(0, '#0c1218'); gr.addColorStop(0.5, face === 'L' ? jambL : jambR); gr.addColorStop(0.82, face === 'L' ? jambL : jambR); gr.addColorStop(1, topLit);
      g.fillStyle = gr; g.beginPath(); trace(pts); g.fill();
    }
    const gl = o(-dep, 0);
    g.beginPath(); trace(gl); g.clip();
    g.fillStyle = opt.glass; g.fillRect(0, 0, W, H);
    const [tx, ty] = shift(face, -dep);
    g.translate(tx, ty); opt.inner?.(); g.setTransform(1, 0, 0, 1, 0, 0);
    // 위 설주와 옆 설주가 유리에 드리우는 그림자
    g.globalAlpha = night ? 0.3 : 0.42; g.fillStyle = '#04070a';
    g.beginPath(); trace(gl); trace(gl.map(([x, y]) => [x + (face === 'L' ? 1.6 : -1.6), y + 3.6] as Pt)); g.fill('evenodd');
    if (opt.shine !== false) {
      const xs = gl.map((q) => q[0]), ys = gl.map((q) => q[1]);
      const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys), ww = x1 - x0;
      g.globalAlpha = night ? 0.12 : 0.22; g.fillStyle = '#ffffff';
      g.beginPath(); trace([[x0 + ww * 0.1, y1], [x0 + ww * 0.26, y1], [x0 + ww * 0.7, y0], [x0 + ww * 0.54, y0]]); g.fill();
      g.beginPath(); trace([[x0 + ww * 0.32, y1], [x0 + ww * 0.37, y1], [x0 + ww * 0.81, y0], [x0 + ww * 0.76, y0]]); g.fill();
    }
    g.globalAlpha = 1;
    g.restore();
    const f = opt.frame;
    if (!f) return;
    // 벽에 드리운 틀 그림자 (빛은 왼쪽 위)
    g.globalAlpha = 0.3; g.fillStyle = '#000';
    g.beginPath(); trace(o(0, f.w).map(([x, y]) => [x + (face === 'L' ? 1 : 2), y + 2] as Pt)); trace(o(0, 0)); g.fill('evenodd');
    g.globalAlpha = 1;
    const m = Math.max(2, Math.ceil(f.out * (TW / 2)));
    for (let k = 0; k <= m; k++) { g.fillStyle = k === m ? f.face : f.side; g.beginPath(); trace(o(f.out * (k / m), f.w)); trace(o(f.out * (k / m), 0)); g.fill('evenodd'); }
    if (f.hi) { // 앞면 바깥 위쪽 모서리에 빛 받는 선
      const pts = o(f.out, f.w);
      g.strokeStyle = f.hi; g.lineWidth = 1; g.beginPath();
      const half = pts.filter((q, k) => k >= Math.floor(pts.length * 0.25) && k <= Math.ceil(pts.length * 0.75));
      if (pts.length === 4) { g.moveTo(pts[3][0], pts[3][1]); g.lineTo(pts[2][0], pts[2][1]); } else { g.moveTo(half[0][0], half[0][1]); for (const q of half.slice(1)) g.lineTo(q[0], q[1]); }
      g.stroke();
    }
  };
  // 튀어나온 창턱·발판 상자 (왼쪽 면: +x 옆면·앞면·윗면이 보인다 / 오른쪽 면: +y 옆면·앞면·윗면)
  const ledgeL = (a: number, bb: number, z: number, out: number, h: number, top: string, front: string, side: string) => {
    g.globalAlpha = 0.3; poly([P(a + 0.03, j1, z - h), P(bb + 0.05, j1, z - h), P(bb + 0.05, j1, z - h - 4), P(a + 0.03, j1, z - h - 4)], '#000'); g.globalAlpha = 1;
    poly([P(bb, j1, z), P(bb, j1 + out, z), P(bb, j1 + out, z - h), P(bb, j1, z - h)], side);
    quadLy(a, bb, z - h, z, out, front);
    poly([P(a, j1, z), P(bb, j1, z), P(bb, j1 + out, z), P(a, j1 + out, z)], top);
  };
  const ledgeR = (a: number, bb: number, z: number, out: number, h: number, top: string, front: string, side: string) => {
    g.globalAlpha = 0.3; poly([P(i1, a - 0.03, z - h), P(i1, bb - 0.03, z - h), P(i1, bb - 0.03, z - h - 4), P(i1, a - 0.03, z - h - 4)], '#000'); g.globalAlpha = 1;
    poly([P(i1, bb, z), P(i1 + out, bb, z), P(i1 + out, bb, z - h), P(i1, bb, z - h)], side);
    quadRx(a, bb, z - h, z, out, front);
    poly([P(i1, a, z), P(i1, bb, z), P(i1 + out, bb, z), P(i1 + out, a, z)], top);
  };
  const wood = { face: trim, side: trimD, hi: '#8a5e3e' };
  const woodR = { face: trimD, side: '#2a1a10', hi: '#6a4a30' };

  // 1층 왼쪽 면: 애완동물 가게 진열창 (매단 새장 · 어항 · 잠든 고양이 · 유리의 발자국 무늬) + 유리문
  const mid = i0 + w / 2;
  const wA = i0 + 0.12, wB = mid - 0.08; // 진열창 구간
  const px = (x: number, z: number) => { const [a, b] = P(x, j1, z); return [Math.round(a), Math.round(b)] as const; };
  const dot = (x: number, y: number, ww: number, hh: number, col: string) => { g.fillStyle = col; g.fillRect(x, y, ww, hh); };
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
  recess('L', rectL(wA, wB, 10, G - 9), {
    dep: 0.14, glass: night ? '#f2d79a' : '#b9cdd2', frame: { w: 2.5, out: 0.06, ...wood },
    inner: () => {
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
      // 안쪽 창턱에 잠든 고양이
      { const [x, y] = px(wB - 0.22, 11); dot(x - 4, y - 4, 9, 4, '#e08a3a'); dot(x - 5, y - 6, 4, 3, '#e08a3a'); dot(x - 5, y - 7, 1, 1, '#e08a3a'); dot(x - 3, y - 7, 1, 1, '#e08a3a'); dot(x + 4, y - 3, 3, 2, '#c06a2a'); dot(x - 2, y - 3, 4, 1, '#c06a2a'); dot(x - 4, y, 9, 1, '#00000040'); }
      cage(wA + 0.18, G - 21, '#f2efe6', '#f2cf3a');
      cage(wA + 0.5, G - 17, '#5ac04a', '#e8e04a');
      cage(wA + 0.78, G - 22, '#d83a2a', '#3a7ad8');
    },
  });
  // 유리 바깥면의 흰 발자국 무늬 (유리 위에 붙은 것이라 깊이 없이)
  for (const [fx, fz] of [[0.6, 15], [0.66, 18], [0.72, 15.5]] as [number, number][]) { const [x, y] = px(wA + fx + 0.1, fz + 1); dot(x, y, 2, 2, '#f8f4ec'); dot(x - 1, y - 2, 1, 1, '#f8f4ec'); dot(x + 1, y - 2, 1, 1, '#f8f4ec'); dot(x + 2, y - 1, 1, 1, '#f8f4ec'); }
  // 진열창 아래 튀어나온 창턱 (화분 셋)
  ledgeL(wA - 0.06, wB + 0.06, 9, 0.16, 3.5, '#7a5236', trim, trimD);
  for (const [fx, col] of [[0.54, '#e86a5a'], [0.86, '#f2cf3a']] as [number, string][]) {
    const [x, y] = P(wA + fx, j1 + 0.1, 9); const X = Math.round(x), Y = Math.round(y);
    dot(X - 2, Y - 3, 4, 3, '#a0583a'); dot(X - 2, Y - 3, 4, 1, '#c0784a'); dot(X - 2, Y - 5, 5, 2, '#3a7a3a'); dot(X - 1, Y - 6, 2, 1, col); dot(X + 2, Y - 6, 1, 1, col);
  }
  // 진열창 위 줄무늬 천 차양: 벽에서 앞으로 기울어 나온 경사면 + 물결 드림 + 오른쪽 옆 천 + 받침 쇠
  {
    const a = wA - 0.08, bb = wB + 0.08, zw = G - 2, out = 0.27, drop = 9, nS = 8, sw = (bb - a) / nS;
    g.globalAlpha = 0.34; poly([P(a + 0.05, j1, zw - 2), P(bb + 0.1, j1, zw - 2), P(bb + 0.1, j1, zw - drop - 5), P(a + 0.05, j1, zw - drop - 5)], '#000'); g.globalAlpha = 1;
    for (const x of [a + 0.1, bb - 0.1]) { const [x0, y0] = P(x, j1, zw - drop - 6), [x1, y1] = P(x, j1 + out, zw - drop); g.strokeStyle = '#2a2420'; g.lineWidth = 1; g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke(); }
    poly([P(bb, j1, zw), P(bb, j1 + out, zw - drop), P(bb, j1 + out, zw - drop - 4), P(bb, j1, zw - 1)], '#b0921e');
    for (let k = 0; k < nS; k++) { const x0 = a + k * sw; poly([P(x0, j1, zw), P(x0 + sw, j1, zw), P(x0 + sw, j1 + out, zw - drop), P(x0, j1 + out, zw - drop)], k % 2 ? '#f4f0e4' : crest); }
    poly([P(a, j1, zw + 0.5), P(bb, j1, zw + 0.5), P(bb, j1, zw - 1), P(a, j1, zw - 1)], '#2a2420');
    for (let k = 0; k < nS; k++) {
      const x0 = a + k * sw, col = k % 2 ? '#d8d2c2' : '#d4b22a';
      quadLy(x0, x0 + sw, zw - drop - 3, zw - drop, out, col);
      const [cx, cy] = P(x0 + sw / 2, j1 + out, zw - drop - 3);
      g.fillStyle = col; g.beginPath(); g.ellipse(cx, cy, sw * (TW / 2) * 0.5, 2.2, 0.46, 0, Math.PI); g.fill();
    }
  }
  // 유리문: 벽 속으로 들어간 문 + 튀어나온 문틀 + 문턱 발판
  const dA = mid + 0.08, dB = mid + 0.62;
  recess('L', rectL(dA, dB, 0, 40), {
    dep: 0.16, glass: '#6b4429', shine: false, frame: { w: 3, out: 0.07, ...wood },
    inner: () => {
      quadL(dA + 0.06, dB - 0.06, 6, 36, lit);
      { const [x0, y0] = P(dA + 0.06, j1, 36), [x1, y1] = P(dB - 0.06, j1, 6); g.globalAlpha = night ? 0.1 : 0.22; g.fillStyle = '#fff'; g.beginPath(); g.moveTo(x0 + 3, y1); g.lineTo(x0 + 7, y1); g.lineTo(x1 - 2, y0 + 3); g.lineTo(x1 - 6, y0 + 3); g.closePath(); g.fill(); g.globalAlpha = 1; }
      quadL(dA + 0.06, dB - 0.06, 20, 21.5, '#6b4429');
      quadL(dA + 0.02, dB - 0.02, 1, 5, '#5a3820');
      quadL(dB - 0.12, dB - 0.08, 16, 20, crest); // 손잡이
      { const [x, y] = px(dA + 0.1, 39); dot(x, y, 1, 3, '#2a2420'); dot(x - 1, y + 3, 3, 3, crest); } // 문 방울
    },
  });
  ledgeL(dA - 0.1, dB + 0.1, 2.5, 0.2, 2.5, '#6a6258', '#4a443e', '#3a342e');
  // 문 위 작은 등: 벽에서 뻗은 쇠 팔 끝에 매달린 상자 등
  {
    const [ax, ay] = P(dB + 0.16, j1, 47), [lx, ly] = P(dB + 0.16, j1 + 0.22, 45);
    g.strokeStyle = '#2a2420'; g.lineWidth = 1; g.beginPath(); g.moveTo(ax, ay); g.lineTo(lx, ly - 2); g.stroke();
    const X = Math.round(lx), Y = Math.round(ly);
    dot(X - 3, Y - 2, 6, 7, '#2a2420'); dot(X - 2, Y - 1, 4, 5, night ? '#ffe7a8' : '#d9c48a'); dot(X + 1, Y - 1, 1, 5, night ? '#f2c46a' : '#b8a46a'); dot(X - 3, Y - 3, 6, 1, '#4a3a2a');
    if (night) { g.globalAlpha = 0.25; g.fillStyle = '#ffd98a'; g.beginPath(); g.arc(lx, ly + 1, 11, 0, Math.PI * 2); g.fill(); g.globalAlpha = 1; }
  }
  // 1층 오른쪽 면: 어항 벽 (벽 속으로 들어간 층층이 푸른 수조, 밤엔 더 밝게)
  recess('R', rectR(j0 + 0.32, j0 + 1.58, 12, G - 11), {
    dep: 0.13, glass: night ? '#2a8ac0' : '#4aa0c0', frame: { w: 2.5, out: 0.06, ...woodR },
    inner: () => {
      for (const z of [22, 34]) quadR(j0 + 0.32, j0 + 1.58, z, z + 2, trimD);
      for (let k = 1; k < 3; k++) quadR(j0 + 0.32 + k * 0.42, j0 + 0.34 + k * 0.42, 12, G - 11, trimD);
      for (const z of [12, 24, 36]) quadR(j0 + 0.32, j0 + 1.58, z, z + 1.5, night ? '#c8a86a' : '#b8a27a'); // 수조 바닥 모래
      for (let k = 0; k < 10; k++) {
        const yy = j0 + 0.4 + ((k * 37) % 11) / 9, zz = 15 + ((k * 13) % 3) * 12 + (k % 2) * 3;
        const [x, y] = P(i1, yy, zz);
        g.fillStyle = ['#ff8a2a', '#ffd23a', '#e8f0ff', '#ff4a8a'][k % 4]; g.fillRect(Math.round(x), Math.round(y), 3, 2);
      }
      for (let k = 0; k < 6; k++) { const [x, y] = P(i1, j0 + 0.5 + k * 0.19, 16 + (k % 3) * 12 + 5); g.fillStyle = '#e8f8ff'; g.fillRect(Math.round(x), Math.round(y), 1, 1); }
      for (let k = 0; k < 4; k++) { const [x, y] = P(i1, j0 + 0.45 + k * 0.33, 13.5); g.fillStyle = '#2a7a3a'; g.fillRect(Math.round(x), Math.round(y) - 5, 1, 5); g.fillRect(Math.round(x) + 2, Math.round(y) - 3, 1, 3); }
    },
  });
  ledgeR(j0 + 0.26, j0 + 1.64, 11, 0.12, 3, '#5a3e28', trimD, '#2a1a10');
  // 문 옆: 쌓인 사료 포대와 바깥 새장 받침대
  const sack = (x: number, y: number, col: string) => { dot(x - 5, y - 8, 10, 8, col); dot(x - 4, y - 9, 8, 1, col); dot(x - 2, y - 6, 4, 3, '#f4f0e4'); dot(x - 1, y - 5, 2, 1, '#8a4a2a'); dot(x + 3, y - 8, 2, 8, '#00000030'); };
  { const [x, y] = P(i1 - 0.2, j1 + 0.18, 0); sack(Math.round(x), Math.round(y), '#c89a4a'); sack(Math.round(x) + 6, Math.round(y) - 2, '#5a8a4a'); sack(Math.round(x) + 3, Math.round(y) - 9, '#c86a3a'); }
  { const [x, y] = P(i0 + 0.05, j1 + 0.25, 0); const X = Math.round(x), Y = Math.round(y);
    dot(X, Y - 22, 1, 22, '#2a2420'); dot(X - 3, Y - 1, 7, 1, '#2a2420');
    g.strokeStyle = '#d8b04a'; g.beginPath(); g.moveTo(X - 5, Y - 22); g.lineTo(X - 5, Y - 29); g.quadraticCurveTo(X, Y - 37, X + 5, Y - 29); g.lineTo(X + 5, Y - 22); g.closePath(); g.stroke();
    dot(X - 2, Y - 29, 4, 4, '#5ac04a'); dot(X - 1, Y - 31, 3, 2, '#e8e04a'); }
  // 매달린 그림 간판: 벽에서 뻗은 쇠 팔 + 두께 있는 둥근 판 위 앵무새와 발자국 (글자 없음)
  { const [x, y] = P(i0 + 0.02, j1, G + 6); const X = Math.round(x), Y = Math.round(y);
    dot(X - 12, Y, 13, 1, '#2a2420'); dot(X - 11, Y + 1, 1, 3, '#2a2420'); dot(X - 3, Y + 1, 1, 3, '#2a2420');
    g.fillStyle = '#2a1810'; g.beginPath(); g.arc(X - 6, Y + 10, 7, 0, Math.PI * 2); g.fill();
    g.fillStyle = trimD; g.beginPath(); g.arc(X - 7, Y + 10, 7, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#f2e6c8'; g.beginPath(); g.arc(X - 7, Y + 10, 5.5, 0, Math.PI * 2); g.fill();
    dot(X - 9, Y + 9, 4, 4, '#f4f1e8'); dot(X - 8, Y + 6, 2, 3, crest); dot(X - 6, Y + 10, 2, 1, '#2a2420'); dot(X - 10, Y + 13, 3, 2, '#c09a6a'); }

  // 2층 왼쪽 면: 볏 색 테의 둥근 창 (이 가게를 알아보는 표시) — 벽 속으로 깊이 파이고, 테는 두껍게 튀어나온다
  const cz = G + U / 2 + 1, R0 = 9.5;
  recess('L', circL(mid, cz, R0), {
    dep: 0.1, glass: lit, frame: { w: 2.5, out: 0.07, face: crest, side: '#a8861a', hi: '#fff2a8' },
    inner: () => {
      // 창 안쪽: 횃대에 앉은 앵무새 그림자 (밤엔 불빛에 비친 실루엣)
      const [bx, by] = P(mid - 0.1, j1, cz - 3);
      const sil = night ? '#8a5a2a' : '#56707c';
      dot(Math.round(bx) - 6, Math.round(by) + 2, 12, 1, sil);
      dot(Math.round(bx) - 1, Math.round(by) - 6, 4, 7, sil); dot(Math.round(bx), Math.round(by) - 9, 3, 3, sil); dot(Math.round(bx) + 1, Math.round(by) - 11, 2, 2, sil); dot(Math.round(bx) - 2, Math.round(by) + 1, 2, 3, sil);
      // 십자 창살
      const [hx0, hy0] = P(mid - R0 / (TW / 2) - 0.05, j1, cz), [hx1, hy1] = P(mid + R0 / (TW / 2) + 0.05, j1, cz);
      const [vx0, vy0] = P(mid, j1, cz - R0 - 2), [vx1, vy1] = P(mid, j1, cz + R0 + 2);
      g.strokeStyle = trimD; g.lineWidth = 1.6; g.beginPath(); g.moveTo(hx0, hy0); g.lineTo(hx1, hy1); g.moveTo(vx0, vy0); g.lineTo(vx1, vy1); g.stroke();
      g.strokeStyle = '#6a4a30'; g.lineWidth = 0.6; g.beginPath(); g.moveTo(hx0, hy0 - 0.8); g.lineTo(hx1, hy1 - 0.8); g.stroke();
    },
  });
  // 테 위의 쐐기돌과 아래 작은 받침
  { const pts = [P(mid - 0.05, j1 + 0.1, cz + R0 + 5.5), P(mid + 0.05, j1 + 0.1, cz + R0 + 5.5), P(mid + 0.035, j1 + 0.1, cz + R0 + 1), P(mid - 0.035, j1 + 0.1, cz + R0 + 1)];
    poly(pts.map(([x, y]) => [x + 1, y - 1] as Pt), '#a8861a'); poly(pts, '#ffe27a'); }
  ledgeL(mid - 0.2, mid + 0.2, cz - R0 - 4, 0.12, 2.5, '#7a5236', trim, trimD);
  // 2층 오른쪽 면: 좁은 창 (벽 속 유리 + 나무 틀 + 꽃 상자)
  recess('R', rectR(j0 + 0.74, j0 + 1.22, G + 9, top - 8), {
    dep: 0.15, glass: litR, frame: { w: 2.5, out: 0.06, ...woodR },
    inner: () => {
      // 반쯤 걷힌 커튼
      quadR(j0 + 0.74, j0 + 0.86, G + 9, top - 8, night ? '#c86a3a' : '#7a4a5a');
      quadR(j0 + 1.12, j0 + 1.22, G + 9, top - 8, night ? '#c86a3a' : '#7a4a5a');
      quadR(j0 + 0.74, j0 + 1.22, (G + top) / 2 + 0.5, (G + top) / 2 + 2, trimD);
    },
  });
  ledgeR(j0 + 0.68, j0 + 1.28, G + 7, 0.18, 5, '#5a3e28', '#4a3020', '#2a1a10');
  for (let k = 0; k < 5; k++) { const [x, y] = P(i1 + 0.1, j0 + 0.76 + k * 0.11, G + 7); const X = Math.round(x), Y = Math.round(y); dot(X - 1, Y - 4, 3, 4, '#3a7a3a'); dot(X - 1, Y - 6, 2, 2, ['#e86a5a', '#f2cf3a', '#f4f0e4', '#e86a5a', '#c86ae8'][k]); }

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
