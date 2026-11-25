// 지옥의 집과 큰 덩어리 (1배 점 그림, 거리 건물과 같은 밀도)
// 집: 초가집(둥근 짚 지붕) · 감옥(쇠창살 감방) · 뼈집(뼈를 쌓은 벽, 갈비뼈 지붕에 가죽)
// 덩어리: 대형 짐승 시체(갈비뼈 아치와 썩은 살, 뿔 달린 해골) · 뼈 무더기 · 내장 더미
// 모두 바닥 칸을 차지하고 지나갈 수 없다. 층 색(재·늪·피)에 따라 조금씩 다르다.
import { TW, TH } from './gfx.ts';
import type { Building, HellBuildKind } from './zone.ts';
import type { Theme } from './hell.ts';

type Pt = [number, number];
const hash = (a: number, b: number, c = 0) => { let h = (a * 374761393 + b * 668265263 + c * 1274126177) | 0; h = (h ^ (h >>> 13)) * 1274126177; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
const BONE = '#ddd2b6', BONE2 = '#b8ab8c', BONE3 = '#857a62', HOLE = '#140c0a';

function canvasFor(b: Building, top: number, pad = 10) {
  const { i0, j0, w, d } = b;
  const minX = (i0 - (j0 + d)) * (TW / 2) - pad, minY = (i0 + j0) * (TH / 2) - top - pad;
  const W = (w + d) * (TW / 2) + pad * 2, H = (w + d) * (TH / 2) + top + pad * 2;
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const g = c.getContext('2d')!;
  const P = (x: number, y: number, z: number): Pt => [(x - y) * (TW / 2) - minX, (x + y) * (TH / 2) - z - minY];
  const poly = (pts: Pt[], fill: string) => { g.beginPath(); g.moveTo(pts[0][0], pts[0][1]); for (const p of pts.slice(1)) g.lineTo(p[0], p[1]); g.closePath(); g.fillStyle = fill; g.fill(); };
  const R = (x: number, y: number, w: number, h: number, col: string) => { g.fillStyle = col; g.fillRect(Math.round(x), Math.round(y), Math.max(1, Math.round(w)), Math.max(1, Math.round(h))); };
  const line = (a: Pt, bb: Pt, wdt: number, col: string) => { g.strokeStyle = col; g.lineWidth = wdt; g.lineCap = 'round'; g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(bb[0], bb[1]); g.stroke(); };
  const finish = () => {
    const im = g.getImageData(0, 0, W, H), D = im.data;
    for (let k = 3; k < D.length; k += 4) D[k] = D[k] < 120 ? 0 : 255;
    const solid = (x: number, y: number) => x >= 0 && y >= 0 && x < W && y < H && D[(y * W + x) * 4 + 3] > 0;
    const out: number[] = [];
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (!solid(x, y) && (solid(x - 1, y) || solid(x + 1, y) || solid(x, y - 1))) out.push(x, y);
    for (let k = 0; k < out.length; k += 2) { const o = (out[k + 1] * W + out[k]) * 4; D[o] = 12; D[o + 1] = 7; D[o + 2] = 6; D[o + 3] = 255; }
    g.putImageData(im, 0, 0);
  };
  return { c, g, P, poly, R, line, finish, minX, minY };
}
type Cv = ReturnType<typeof canvasFor>;

function shade(hex: string, k: number) {
  const n = parseInt(hex.slice(1), 16);
  const f = (v: number) => Math.max(0, Math.min(255, Math.round(v * k))).toString(16).padStart(2, '0');
  return `#${f(n >> 16)}${f((n >> 8) & 255)}${f(n & 255)}`;
}

/** 작은 해골 (화면 기준 5×5 점) */
function skull(cv: Cv, x: number, y: number, s = 1) {
  const { R } = cv;
  R(x - 2 * s, y - 2 * s, 5 * s, 4 * s, BONE); R(x - 1 * s, y + 2 * s, 3 * s, 1 * s, BONE2);
  R(x - 1.5 * s, y - 0.5 * s, s, s, HOLE); R(x + 0.5 * s, y - 0.5 * s, s, s, HOLE); R(x, y + 1 * s, 1, 1, HOLE);
}

/** 벽 두 면을 칠한다: col(face, u, z) → 색. face 0 = 왼쪽 앞면(y = j1), 1 = 오른쪽 앞면(x = i1) */
function walls(cv: Cv, b: Building, Hw: number, col: (face: number, u: number, z: number) => string) {
  const { i0, j0, w, d } = b, i1 = i0 + w, j1 = j0 + d;
  const { R, P } = cv;
  // 왼쪽 면: x = i0..i1 (화면에서 오른쪽 아래로), 오른쪽 면: y = j1..j0 (화면에서 오른쪽 위로)
  const LW = w * (TW / 2), RWd = d * (TW / 2);
  for (let k = 0; k < LW; k++) {
    const x = i0 + k / (TW / 2);
    const [sx, sy] = P(x, j1, 0);
    for (let z = 0; z < Hw; z++) R(sx, sy - z - 1, 1, 1, col(0, k, z));
  }
  for (let k = 0; k < RWd; k++) {
    const y = j1 - k / (TW / 2);
    const [sx, sy] = P(i1, y, 0);
    for (let z = 0; z < Hw; z++) R(sx, sy - z - 1, 1, 1, col(1, k, z));
  }
}

/** 둥근 우진각 지붕: 처마에서 용마루까지 볼록하게 솟는다 (sin 곡선). 보이는 앞 경사와 오른쪽 끝 경사를 화면 좌표로 */
function roundRoof(cv: Cv, b: Building, z0: number, rise: number, ov: number, k = 0.85) {
  const { i0, j0, w, d } = b, i1 = i0 + w, j1 = j0 + d;
  const jm = (j0 + j1) / 2;
  const inset = Math.min(d / 2, w / 2) * k;
  const r0 = i0 + inset, r1 = i1 - inset;
  const N = 10, zf = (a: number) => z0 + rise * Math.sin((a * Math.PI) / 2);
  const front: Pt[] = [], side: Pt[] = [];
  for (let n = 0; n <= N; n++) { const a = n / N; front.push(cv.P(i0 - ov + a * (r0 - (i0 - ov)), j1 + ov - a * (j1 + ov - jm), zf(a))); }
  for (let n = N; n >= 0; n--) { const a = n / N; front.push(cv.P(i1 + ov - a * (i1 + ov - r1), j1 + ov - a * (j1 + ov - jm), zf(a))); }
  for (let n = 0; n <= N; n++) { const a = n / N; side.push(cv.P(i1 + ov - a * (i1 + ov - r1), j1 + ov - a * (j1 + ov - jm), zf(a))); }
  for (let n = N; n >= 0; n--) { const a = n / N; side.push(cv.P(i1 + ov - a * (i1 + ov - r1), j0 - ov + a * (jm - (j0 - ov)), zf(a))); }
  return { front, side, zf, jm, r0, r1 };
}

// ───────── 초가집: 흙벽, 나무 기둥, 둥근 짚 지붕 (새끼줄 그물), 문 위 해골 ─────────
function thatch(b: Building, theme: Theme) {
  const Hw = b.h, rise = 14 + Math.min(b.w, b.d) * 7, ov = 0.16;
  const cv = canvasFor(b, Hw + rise + 8);
  const { g, P, poly, R, line, finish } = cv;
  const { i0, j0, w, d } = b, i1 = i0 + w, j1 = j0 + d;
  const seed = i0 * 131 + j0 * 71;
  const mud = theme === 'ash' ? '#6e6252' : theme === 'swamp' ? '#5e5640' : '#704a38';
  walls(cv, b, Hw, (face, u, z) => {
    const n = hash(Math.floor(u / 2), Math.floor(z / 2), seed + face);
    let c = shade(mud, (face ? 0.7 : 1) * (0.9 + n * 0.18));
    if (n > 0.93) c = theme === 'swamp' ? '#8a8a5a' : '#a8946a'; // 짚 부스러기
    if (z < 3) c = shade(mud, face ? 0.5 : 0.65);
    if (theme === 'swamp' && z < 7 && hash(u, z, seed) < 0.4) c = '#3e4a26'; // 이끼
    if (theme === 'market' && z > Hw - 6 && hash(u >> 1, 3, seed) < 0.12) c = '#5a0e0a'; // 핏자국
    return c;
  });
  // 나무 기둥
  for (const x of [i0, i0 + w / 2, i1]) { const [sx, sy] = P(x, j1, 0); R(sx - 1, sy - Hw, 2, Hw, '#3a2618'); }
  for (const y of [j0, j0 + d / 2]) { const [sx, sy] = P(i1, y, 0); R(sx - 1, sy - Hw, 2, Hw, '#2a1a10'); }
  // 문 (왼쪽 면 가운데): 어두운 입구 + 거적
  const m = i0 + w / 2;
  poly([P(m - 0.28, j1, 0), P(m + 0.28, j1, 0), P(m + 0.28, j1, 19), P(m - 0.28, j1, 19)], '#2a1a10');
  poly([P(m - 0.22, j1, 0), P(m + 0.22, j1, 0), P(m + 0.22, j1, 17), P(m - 0.22, j1, 17)], HOLE);
  poly([P(m - 0.22, j1, 8), P(m + 0.05, j1, 4), P(m + 0.05, j1, 17), P(m - 0.22, j1, 17)], theme === 'market' ? '#6a1a14' : '#5a4a32');
  { const [sx, sy] = P(m, j1, 22); skull(cv, sx, sy, 1); }
  // 오른쪽 면: 살창 사이로 새는 불빛
  const wm = j0 + d / 2;
  poly([P(i1, wm - 0.22, 9), P(i1, wm + 0.22, 9), P(i1, wm + 0.22, 18), P(i1, wm - 0.22, 18)], '#2a1a10');
  poly([P(i1, wm - 0.18, 10), P(i1, wm + 0.18, 10), P(i1, wm + 0.18, 17), P(i1, wm - 0.18, 17)], '#e8862a');
  for (const t of [-0.08, 0.02, 0.12]) line(P(i1, wm + t, 10), P(i1, wm + t, 17), 1, '#3a2418');
  // 둥근 짚 지붕
  const roofZ = Hw - 2;
  const rf = roundRoof(cv, b, roofZ, rise, ov, 0.95);
  const straw = theme === 'ash' ? ['#8a7e66', '#6e6452', '#a09276', '#4e463a'] : theme === 'swamp' ? ['#7e7a4a', '#62603a', '#9a9460', '#3e3e24'] : ['#9a6e42', '#7a5432', '#b8865a', '#4e3220'];
  const side = rf.side, front = rf.front;
  // 처마 두께 (지붕 아래 그늘)
  poly([P(i0 - ov, j1 + ov, roofZ), P(i1 + ov, j1 + ov, roofZ), P(i1 + ov, j1 + ov, roofZ - 5), P(i0 - ov, j1 + ov, roofZ - 5)], straw[3]);
  poly([P(i1 + ov, j0 - ov, roofZ), P(i1 + ov, j1 + ov, roofZ), P(i1 + ov, j1 + ov, roofZ - 5), P(i1 + ov, j0 - ov, roofZ - 5)], shade(straw[3], 0.8));
  poly(side, straw[1]);
  poly(front, straw[0]);
  // 짚결: 경사를 따라 내려오는 짧은 결 (지붕 안쪽만)
  const strands = (pts: Pt[], base: string, light: string, dark: string, k0: number) => {
    g.save(); g.beginPath(); g.moveTo(pts[0][0], pts[0][1]); for (const p of pts.slice(1)) g.lineTo(p[0], p[1]); g.closePath(); g.clip();
    const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]);
    const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
    for (let n = 0; n < (x1 - x0) * (y1 - y0) / 9; n++) {
      const x = x0 + hash(n, 1, seed + k0) * (x1 - x0), y = y0 + hash(n, 2, seed + k0) * (y1 - y0);
      g.fillStyle = hash(n, 3, seed + k0) < 0.5 ? light : dark;
      g.fillRect(Math.round(x), Math.round(y), 1, 3 + Math.floor(hash(n, 4, seed) * 3));
    }
    g.fillStyle = base;
    g.restore();
  };
  strands(front, straw[0], straw[2], straw[1], 1);
  strands(side, straw[1], straw[0], straw[3], 2);
  // 새끼줄 그물 (앞 경사를 가로지르는 사선)
  g.save(); g.beginPath(); g.moveTo(front[0][0], front[0][1]); for (const p of front.slice(1)) g.lineTo(p[0], p[1]); g.closePath(); g.clip();
  for (let k = -6; k <= w * 4 + 6; k++) {
    const x = i0 - ov + k * 0.45;
    line(P(x, j1 + ov, roofZ), P(x + 0.9, (j0 + j1) / 2, roofZ + rise), 1, straw[3]);
    line(P(x, j1 + ov, roofZ), P(x - 0.9, (j0 + j1) / 2, roofZ + rise), 1, straw[3]);
  }
  g.restore();
  // 처마 끝 술 (늘어진 짚)
  for (let k = 0; k <= (w + 2 * ov) * 10; k++) {
    const [sx, sy] = P(i0 - ov + k / 10, j1 + ov, roofZ - 4);
    R(sx, sy, 1, 2 + (k % 3), k % 2 ? straw[1] : straw[3]);
  }
  for (let k = 0; k <= (d + 2 * ov) * 10; k++) {
    const [sx, sy] = P(i1 + ov, j1 + ov - k / 10, roofZ - 4);
    R(sx, sy, 1, 2 + (k % 3), k % 2 ? shade(straw[1], 0.8) : straw[3]);
  }
  // 3층: 처마 끝에 매단 붉은 등
  if (theme === 'market') { const [sx, sy] = P(i1 + ov, j1 + ov, roofZ - 5); R(sx - 2, sy, 1, 3, '#2a1a10'); R(sx - 4, sy + 3, 5, 6, '#b8180e'); R(sx - 3, sy + 4, 2, 3, '#ff5a2a'); }
  finish();
  return { canvas: cv.c, x: cv.minX, y: cv.minY };
}

// ───────── 감옥: 낮고 두꺼운 돌덩이, 쇠창살 감방, 창살을 쥔 손, 쇠문, 사슬, 횃불 ─────────
function prison(b: Building, theme: Theme) {
  const Hw = b.h;
  const cv = canvasFor(b, Hw + 16);
  const { P, poly, R, line, finish } = cv;
  const { i0, j0, w, d } = b, i1 = i0 + w, j1 = j0 + d;
  const seed = i0 * 97 + j0 * 53;
  const stone = theme === 'swamp' ? '#4a4c44' : theme === 'market' ? '#4e3e3a' : '#4a4644';
  walls(cv, b, Hw, (face, u, z) => {
    const row = Math.floor(z / 6), off = (row % 2) * 6;
    const brick = Math.floor((u + off) / 12);
    const mortar = z % 6 === 0 || (u + off) % 12 === 0;
    const n = hash(brick, row, seed + face);
    let c = mortar ? '#1e1a18' : shade(stone, (face ? 0.68 : 1) * (0.82 + n * 0.3));
    if (!mortar && hash(u, z, seed) < 0.05) c = shade(stone, 0.6);
    if (theme === 'swamp' && z < 9 && hash(u >> 1, z >> 1, seed) < 0.45) c = face ? '#2e3a1c' : '#3e4a26';
    if (theme === 'ash' && z > Hw - 8 && hash(u >> 1, z, seed) < 0.5) c = '#2a2624';
    return c;
  });
  // 감방 창: 왼쪽 면에 2~4칸
  const cells = Math.max(1, Math.floor(w * 1.1));
  for (let k = 0; k < cells; k++) {
    const a = i0 + (k + 0.5) * (w / cells) - 0.26, bb = a + 0.52;
    poly([P(a - 0.04, j1, 9), P(bb + 0.04, j1, 9), P(bb + 0.04, j1, 27), P(a - 0.04, j1, 27)], '#24201e');
    poly([P(a, j1, 10), P(bb, j1, 10), P(bb, j1, 26), P(a, j1, 26)], '#0c0808');
    // 안의 갇힌 자: 창살을 쥔 두 손 또는 해골 얼굴
    const [cx, cy] = P((a + bb) / 2, j1, 18);
    if (hash(k, 7, seed) < 0.6) { R(cx - 6, cy - 2, 3, 4, '#8a7a6a'); R(cx + 3, cy - 3, 3, 4, '#8a7a6a'); R(cx - 2, cy - 6, 4, 4, '#3a302a'); R(cx - 1, cy - 5, 1, 1, '#d8a050'); R(cx + 1, cy - 5, 1, 1, '#d8a050'); }
    else skull(cv, cx, cy - 2, 1);
    for (let t = 0; t <= 4; t++) { const x = a + (t / 4) * (bb - a); line(P(x, j1, 10), P(x, j1, 26), 1.4, '#6e6a64'); }
    line(P(a, j1, 18), P(bb, j1, 18), 1, '#5a5650');
    if (theme === 'market') R(cx - 1, cy + 6, 1, 6 + (k % 2) * 4, '#6a0a08');
  }
  // 오른쪽 면: 쇠문 (징 박힌 판)
  const dm = j0 + d / 2;
  poly([P(i1, dm - 0.32, 0), P(i1, dm + 0.32, 0), P(i1, dm + 0.32, 26), P(i1, dm - 0.32, 26)], '#1a1816');
  poly([P(i1, dm - 0.27, 0), P(i1, dm + 0.27, 0), P(i1, dm + 0.27, 24), P(i1, dm - 0.27, 24)], '#3a3634');
  for (let r = 0; r < 4; r++) for (let q = 0; q < 3; q++) { const [sx, sy] = P(i1, dm - 0.2 + q * 0.2, 4 + r * 6); R(sx, sy, 1, 1, '#8a8680'); }
  { const [sx, sy] = P(i1, dm + 0.12, 12); R(sx - 1, sy - 1, 3, 3, '#6a6660'); }
  // 지붕: 평평한 돌판 + 앞 가장자리의 쇠꼬챙이
  poly([P(i0, j0, Hw), P(i1, j0, Hw), P(i1, j1, Hw), P(i0, j1, Hw)], shade(stone, 0.55));
  poly([P(i0, j1, Hw), P(i1, j1, Hw), P(i1, j1, Hw - 3), P(i0, j1, Hw - 3)], shade(stone, 0.8));
  for (let k = 0; k <= w * 4; k++) { const [sx, sy] = P(i0 + k / 4, j1, Hw); line([sx, sy], [sx, sy - 7], 1, '#5a5652'); }
  for (let k = 0; k <= d * 4; k++) { const [sx, sy] = P(i1, j1 - k / 4, Hw); line([sx, sy], [sx, sy - 7], 1, '#4a4642'); }
  // 처마에서 늘어진 사슬과 족쇄
  { const [sx, sy] = P(i0 + 0.25, j1, Hw - 3); for (let k = 0; k < 6; k++) R(sx + (k % 2), sy + k * 3, 2, 2, '#6a6660'); R(sx - 1, sy + 18, 4, 3, '#5a5650'); }
  // 문 옆 횃불
  { const [sx, sy] = P(i1, dm - 0.5, 22); R(sx - 1, sy, 2, 7, '#3a2618'); R(sx - 2, sy - 4, 4, 4, '#ff8a2a'); R(sx - 1, sy - 7, 2, 3, '#ffd26a'); }
  finish();
  return { canvas: cv.c, x: cv.minX, y: cv.minY };
}

// ───────── 뼈집: 뼈를 가로로 쌓은 벽, 박힌 해골, 상아 엄니 문, 갈비뼈 지붕에 씌운 가죽, 용마루 끝 뿔 해골 ─────────
function bonehouse(b: Building, theme: Theme) {
  const Hw = b.h, rise = 20, ov = 0.18;
  const cv = canvasFor(b, Hw + rise + 22);
  const { g, P, poly, R, line, finish } = cv;
  const { i0, j0, w, d } = b, i1 = i0 + w, j1 = j0 + d;
  const seed = i0 * 61 + j0 * 89;
  walls(cv, b, Hw, (face, u, z) => {
    const row = Math.floor(z / 5), off = Math.floor(hash(row, 1, seed + face) * 9);
    const L = 9 + Math.floor(hash(row, 2, seed) * 6);
    const pos = (u + off) % L;
    const gap = z % 5 === 0;
    if (gap) return '#1a120e';
    const knob = pos < 2 || pos > L - 3; // 뼈 끝 마디
    const zz = z % 5;
    let c = knob ? (zz === 2 ? BONE : BONE2) : zz === 1 ? BONE : zz === 4 ? BONE3 : BONE2;
    if (pos === 0 && zz !== 2) c = '#1a120e';
    if (face) c = shade(c, 0.74);
    if (theme === 'market' && hash(u >> 2, z >> 3, seed) < 0.08) c = '#7a1410';
    if (theme === 'swamp' && z < 6 && hash(u, z, seed) < 0.4) c = '#5a6030';
    return c;
  });
  // 벽에 박힌 해골
  for (let k = 0; k < w * 3; k++) { if (hash(k, 3, seed) < 0.45) continue; const [sx, sy] = P(i0 + (k + 0.5) / 3, j1, 8 + (k % 2) * 10); skull(cv, sx, sy, 1); }
  for (let k = 0; k < d * 3; k++) { if (hash(k, 4, seed) < 0.55) continue; const [sx, sy] = P(i1, j1 - (k + 0.5) / 3, 10 + (k % 2) * 8); skull(cv, sx, sy, 1); }
  // 문: 가죽 휘장 + 양옆으로 휘어 오른 상아 엄니
  const m = i0 + w / 2;
  poly([P(m - 0.26, j1, 0), P(m + 0.26, j1, 0), P(m + 0.26, j1, 18), P(m - 0.26, j1, 18)], HOLE);
  poly([P(m - 0.24, j1, 18), P(m + 0.24, j1, 18), P(m + 0.1, j1, 2), P(m - 0.2, j1, 6)], '#6a3a2a');
  for (const sd of [-1, 1]) {
    const [bx, by] = P(m + sd * 0.34, j1, 0);
    for (let t = 0; t < 14; t++) { const a = t / 13; R(bx + sd * Math.sin(a * 2.2) * 6 - 1, by - a * 26, 3 - a * 1.5, 2, a > 0.85 ? BONE : BONE2); }
  }
  // 지붕: 우진각 위에 씌운 가죽, 그 위를 지나는 갈비뼈
  const roofZ = Hw - 1;
  const rf = roundRoof(cv, b, roofZ, rise, ov, 0.4);
  const side = rf.side, front = rf.front;
  const hide = theme === 'swamp' ? ['#5a5034', '#423a26'] : theme === 'market' ? ['#7a3426', '#5a2418'] : ['#6a4a3a', '#4a3428'];
  poly(side, hide[1]); poly(front, hide[0]);
  // 꿰맨 자국
  const xs = front.map((p) => p[0]), ys = front.map((p) => p[1]);
  g.save(); g.beginPath(); g.moveTo(front[0][0], front[0][1]); for (const p of front.slice(1)) g.lineTo(p[0], p[1]); g.closePath(); g.clip();
  for (let k = 0; k < 60; k++) { const x = Math.min(...xs) + hash(k, 9, seed) * (Math.max(...xs) - Math.min(...xs)), y = Math.min(...ys) + hash(k, 10, seed) * (Math.max(...ys) - Math.min(...ys)); R(x, y, 2, 1, shade(hide[0], 0.65)); }
  // 갈비뼈: 가죽 위를 처마에서 용마루로 (표면을 따라)
  const jm = rf.jm;
  for (let k = 0; k <= w * 2.5; k++) {
    const x = i0 - ov + k * ((w + 2 * ov) / (w * 2.5));
    const xr = Math.max(rf.r0, Math.min(rf.r1, x));
    const pts: Pt[] = [];
    for (let t = 0; t <= 8; t++) { const a = t / 8; pts.push(P(x + (xr - x) * a, j1 + ov - a * (j1 + ov - jm), rf.zf(a) + 1)); }
    for (let t = 0; t < 8; t++) line(pts[t], pts[t + 1], 2.2, t > 5 ? BONE : BONE2);
  }
  g.restore();
  // 용마루 끝의 뿔 달린 짐승 해골
  { const [sx, sy] = P(rf.r1, jm, roofZ + rise + 4);
    R(sx - 5, sy - 4, 10, 7, BONE); R(sx - 3, sy + 3, 6, 4, BONE2); R(sx - 3, sy - 1, 2, 2, HOLE); R(sx + 1, sy - 1, 2, 2, HOLE);
    for (const sd of [-1, 1]) for (let t = 0; t < 8; t++) R(sx + sd * (5 + t * 1.2), sy - 4 - Math.sin(t / 7 * 2.4) * 6, 2, 2, t > 5 ? BONE : BONE2); }
  finish();
  return { canvas: cv.c, x: cv.minX, y: cv.minY };
}

// ───────── 대형 짐승 시체: 땅에 누운 등뼈, 솟은 갈비뼈 아치, 늘어진 썩은 살, 뿔 달린 해골, 고인 피 ─────────
function carcass(b: Building, theme: Theme) {
  const Hc = b.h;
  const cv = canvasFor(b, Hc + 14, 14);
  const { g, P, poly, R, line, finish } = cv;
  const { i0, j0, w, d } = b, i1 = i0 + w, j1 = j0 + d;
  const seed = i0 * 41 + j0 * 67;
  const alongI = w >= d;
  const L = alongI ? w : d, Wd = alongI ? d : w;
  // 축 좌표 (s: 몸 길이 방향 0..L, c: 옆 방향 -Wd/2..Wd/2) → 격자
  const at = (s: number, c: number, z: number): Pt => alongI ? P(i0 + s, j0 + Wd / 2 + c, z) : P(i0 + Wd / 2 + c, j0 + s, z);
  const ooze = theme === 'swamp' ? ['#2e3a16', '#4a5a24'] : ['#3a0606', '#6a0e0a'];
  // 고인 피·고름
  const pool: Pt[] = [];
  for (let k = 0; k < 18; k++) { const a = (k / 18) * Math.PI * 2; const rr = 0.85 + hash(k, 1, seed) * 0.25; pool.push(at(L / 2 + Math.cos(a) * (L / 2) * rr, Math.sin(a) * (Wd / 2) * rr, 0)); }
  poly(pool, ooze[0]);
  for (let k = 0; k < 6; k++) { const [x, y] = at(0.4 + hash(k, 2, seed) * (L - 0.8), (hash(k, 3, seed) - 0.5) * Wd * 0.6, 0); R(x, y, 4, 1, ooze[1]); }
  const flesh = theme === 'swamp' ? ['#5a4a3a', '#3a3022', '#7a6a4a'] : ['#6a1a22', '#4a0e16', '#9a3a3a'];
  const ribs = Math.round(L * 3.2);
  const ribPts = (k: number, side: number): Pt[] => {
    const s = 0.7 + (k / (ribs - 1)) * (L - 1.4);
    const hh = Hc * (0.55 + 0.45 * Math.sin((k / (ribs - 1)) * Math.PI)) * (0.9 + hash(k, 4, seed) * 0.15);
    const broken = hash(k, side + 5, seed) < 0.18 ? 0.55 : 1; // 부러진 갈비
    const out: Pt[] = [];
    for (let t = 0; t <= 10 * broken; t++) { const a = t / 10; out.push(at(s, side * Math.sin(a * Math.PI / 2) * (Wd / 2) * 0.92, 6 + Math.cos(a * Math.PI / 2) * hh)); }
    return out;
  };
  const drawRib = (pts: Pt[], col: string, dark: string) => { for (let t = 0; t < pts.length - 1; t++) { const thick = 3.2 - (t / pts.length) * 1.4; line(pts[t], pts[t + 1], thick, t < 2 ? col : dark); } };
  // 뒤쪽 갈비 (먼 쪽 = 화면 위) 먼저
  const back = alongI ? -1 : -1;
  for (let k = 0; k < ribs; k++) drawRib(ribPts(k, back), BONE2, BONE3);
  // 등뼈 (땅 위 6px 높이를 따라 이어진 마디)
  for (let k = 0; k <= L * 8; k++) { const [x, y] = at(0.3 + k / 8, 0, 6 + Hc * 0.0); R(x - 2, y - 2, 4, 3, k % 2 ? BONE : BONE2); }
  // 갈비 사이에 늘어진 썩은 살
  for (let k = 0; k < ribs - 1; k++) {
    if (hash(k, 6, seed) < 0.45) continue;
    const a = ribPts(k, back), bb = ribPts(k + 1, back);
    const n = Math.min(a.length, bb.length) - 1, t0 = Math.floor(hash(k, 7, seed) * 3), t1 = Math.min(n, t0 + 3 + Math.floor(hash(k, 8, seed) * 4));
    const pts: Pt[] = [...a.slice(t0, t1 + 1), ...bb.slice(t0, t1 + 1).reverse()];
    if (pts.length > 2) { poly(pts, flesh[0]); for (let q = t0; q < t1; q += 2) R(a[q][0] + 2, a[q][1] + 2, 1, 4 + (q % 3) * 2, flesh[1]); }
  }
  // 앞쪽 갈비 (가까운 쪽)
  for (let k = 0; k < ribs; k++) drawRib(ribPts(k, -back), BONE, BONE2);
  // 앞쪽에도 군데군데 살점
  for (let k = 0; k < ribs; k++) { if (hash(k, 9, seed) < 0.6) continue; const p = ribPts(k, -back); const q = p[Math.min(p.length - 1, 3 + (k % 3))]; R(q[0] - 2, q[1], 5, 4, flesh[0]); R(q[0] - 1, q[1] + 4, 2, 3, flesh[1]); R(q[0] - 1, q[1], 2, 1, flesh[2]); }
  // 뿔 달린 해골 (머리 쪽 끝)
  { const [x, y] = at(L - 0.1, 0.1, 10); const X = Math.round(x), Y = Math.round(y);
    g.fillStyle = BONE2; g.beginPath(); g.ellipse(X, Y, 11, 8, 0, 0, Math.PI * 2); g.fill();
    g.fillStyle = BONE; g.beginPath(); g.ellipse(X - 2, Y - 2, 8, 5, 0, 0, Math.PI * 2); g.fill();
    R(X + 4, Y + 1, 10, 6, BONE2); R(X + 5, Y + 1, 8, 2, BONE); // 주둥이
    R(X - 5, Y - 2, 4, 4, HOLE); R(X + 1, Y - 3, 3, 3, HOLE); R(X + 11, Y + 2, 2, 2, HOLE);
    for (let t = 0; t < 5; t++) R(X + 5 + t * 2, Y + 7, 1, 2, BONE);
    for (const sd of [-1, 1]) for (let t = 0; t < 12; t++) { const a = t / 11; R(X - 2 + sd * (6 + a * 9), Y - 6 - Math.sin(a * 2.6) * 12 + a * 4, 3 - a * 1.5, 2, a > 0.8 ? '#efe6cc' : BONE2); } }
  // 꼬리뼈
  for (let k = 0; k < 8; k++) { const [x, y] = at(0.3 - k * 0.09, -0.05 * k, 6 - k * 0.6); R(x - 1, y - 1, 3 - k * 0.2, 2, BONE2); }
  // 파리 떼
  for (let k = 0; k < 14; k++) { const [x, y] = at(hash(k, 11, seed) * L, (hash(k, 12, seed) - 0.5) * Wd, Hc * 0.5 + hash(k, 13, seed) * Hc * 0.7); R(x, y, 1, 1, '#0a0606'); }
  finish();
  return { canvas: cv.c, x: cv.minX, y: cv.minY };
}

// ───────── 뼈 무더기: 원뿔로 쌓인 뼈와 해골 ─────────
function bonepile(b: Building, theme: Theme) {
  const Hm = b.h;
  const cv = canvasFor(b, Hm + 8, 12);
  const { g, P, R, line, finish } = cv;
  const { i0, j0, w, d } = b;
  const seed = i0 * 29 + j0 * 83;
  const ci = i0 + w / 2, cj = j0 + d / 2, rad = Math.min(w, d) / 2 * 0.95;
  const items: { x: number; y: number; z: number; a: number; l: number; sk: boolean }[] = [];
  for (let n = 0; n < 260 * w * d / 4; n++) {
    const rr = Math.sqrt(hash(n, 1, seed)) * rad, a = hash(n, 2, seed) * Math.PI * 2;
    const surf = Hm * Math.pow(1 - rr / rad, 0.85);
    const z = surf * (0.7 + hash(n, 3, seed) * 0.3);
    items.push({ x: ci + Math.cos(a) * rr, y: cj + Math.sin(a) * rr, z, a: hash(n, 4, seed) * Math.PI, l: 3 + hash(n, 5, seed) * 5, sk: hash(n, 6, seed) < 0.12 });
  }
  // 뒤에서 앞으로 (화면 아래로 갈수록 나중)
  items.sort((p, q) => (p.x + p.y) * 16 - p.z - ((q.x + q.y) * 16 - q.z));
  { const [x, y] = P(ci, cj, 0); g.fillStyle = theme === 'market' ? '#3a0606' : '#1a120e'; g.beginPath(); g.ellipse(x, y, rad * 34, rad * 17, 0, 0, Math.PI * 2); g.fill(); }
  for (const it of items) {
    const [x, y] = P(it.x, it.y, it.z);
    if (it.sk) { skull(cv, x, y, 1); continue; }
    const dx = Math.cos(it.a) * it.l, dy = Math.sin(it.a) * it.l * 0.5;
    line([x - dx, y - dy], [x + dx, y + dy], 2, hash(Math.round(x), Math.round(y), seed) < 0.5 ? BONE2 : BONE3);
    line([x - dx, y - dy - 0.6], [x + dx, y + dy - 0.6], 1, BONE);
    R(x - dx - 1, y - dy - 1, 2, 2, BONE); R(x + dx - 1, y + dy - 1, 2, 2, BONE);
  }
  // 꼭대기의 큰 해골
  { const [x, y] = P(ci, cj, Hm + 2); skull(cv, x, y, 2); }
  finish();
  return { canvas: cv.c, x: cv.minX, y: cv.minY };
}

// ───────── 내장 더미: 똬리 튼 창자, 번들거리는 빛, 고인 피, 파리 ─────────
function guts(b: Building, theme: Theme) {
  const Hm = b.h;
  const cv = canvasFor(b, Hm + 10, 12);
  const { g, P, R, finish } = cv;
  const { i0, j0, w, d } = b;
  const seed = i0 * 53 + j0 * 37;
  const ci = i0 + w / 2, cj = j0 + d / 2, rad = Math.min(w, d) / 2 * 0.9;
  const pal = theme === 'swamp' ? ['#a8787a', '#86585e', '#d8b0b0', '#4a2a2e'] : ['#c0606e', '#943a4c', '#f0a2ae', '#5e1e2e'];
  { const [x, y] = P(ci, cj, 0); g.fillStyle = theme === 'swamp' ? '#2e3416' : '#4a0606'; g.beginPath(); g.ellipse(x, y + 2, rad * 40, rad * 19, 0, 0, Math.PI * 2); g.fill(); g.fillStyle = theme === 'swamp' ? '#4a5424' : '#7a0e0a'; g.beginPath(); g.ellipse(x - 8, y, rad * 14, rad * 5, 0, 0, Math.PI * 2); g.fill(); }
  // 창자: 바깥 큰 고리에서 안쪽 작은 고리로 똬리를 틀며 쌓인다 (돔 모양). 굵은 관 + 마디 + 번들거리는 빛
  const layers = 5 + Math.min(w, d);
  const segs: { p: Pt; q: Pt; k: number; n: number; depth: number }[] = [];
  for (let L = 0; L < layers; L++) {
    const t = L / layers;
    const rr0 = rad * Math.pow(1 - t, 0.75) * 0.95;
    const z0 = Hm * Math.pow(t, 0.9) * 0.95;
    const N = Math.max(10, Math.round(rr0 * 34));
    let prev: Pt | null = null, prevA = 0;
    const off = hash(L, 1, seed) * Math.PI * 2;
    for (let n = 0; n <= N; n++) {
      const a = off + (n / N) * Math.PI * 2 * 1.05;
      const wob = 1 + Math.sin(a * 3 + L) * 0.12;
      const x = ci + Math.cos(a) * rr0 * wob, y = cj + Math.sin(a) * rr0 * wob;
      const p = P(x, y, z0 + Math.sin(a * 2 + L) * 1.5);
      if (prev) segs.push({ p: prev, q: p, k: L, n, depth: (Math.sin(prevA) + Math.sin(a)) / 2 + L * 0.6 });
      prev = p; prevA = a;
    }
  }
  // 먼 쪽(화면 위) 아래층부터
  segs.sort((A, B) => A.depth - B.depth);
  g.lineCap = 'round';
  for (const s2 of segs) {
    g.strokeStyle = pal[3]; g.lineWidth = 7.5; g.beginPath(); g.moveTo(s2.p[0], s2.p[1]); g.lineTo(s2.q[0], s2.q[1]); g.stroke();
    g.strokeStyle = s2.k % 2 ? pal[1] : pal[0]; g.lineWidth = 5.6; g.beginPath(); g.moveTo(s2.p[0], s2.p[1]); g.lineTo(s2.q[0], s2.q[1]); g.stroke();
    if (s2.n % 4 === 0) { g.strokeStyle = pal[3]; g.lineWidth = 1; g.beginPath(); g.moveTo(s2.q[0] - 1, s2.q[1] - 2.5); g.lineTo(s2.q[0] + 1, s2.q[1] + 2.5); g.stroke(); }
    g.strokeStyle = pal[2]; g.lineWidth = 1.2; g.beginPath(); g.moveTo(s2.p[0], s2.p[1] - 1.8); g.lineTo(s2.q[0], s2.q[1] - 1.8); g.stroke();
  }
  // 꼭대기에 얹힌 덩어리 (간·염통)
  { const [x, y] = P(ci, cj, Hm); g.fillStyle = pal[3]; g.beginPath(); g.ellipse(x, y, 7, 5, 0, 0, Math.PI * 2); g.fill(); g.fillStyle = theme === 'swamp' ? '#6a4a3a' : '#7a1e2a'; g.beginPath(); g.ellipse(x, y - 1, 6, 4, 0, 0, Math.PI * 2); g.fill(); R(x - 3, y - 3, 3, 1, pal[2]); }
  // 파리
  for (let k = 0; k < 12; k++) { const [x, y] = P(ci + (hash(k, 7, seed) - 0.5) * rad * 2, cj + (hash(k, 8, seed) - 0.5) * rad * 2, Hm * 0.6 + hash(k, 9, seed) * Hm); R(x, y, 1, 1, '#0a0606'); }
  finish();
  return { canvas: cv.c, x: cv.minX, y: cv.minY };
}

// ───────── 고깃간: 기둥 넷에 얹은 누더기 차양, 갈고리에 매단 고깃덩이, 피 밴 도마와 칼, 바닥의 핏물 ─────────
function butcher(b: Building, theme: Theme) {
  const Hw = b.h;
  const cv = canvasFor(b, Hw + 12, 14);
  const { g, P, poly, R, line, finish } = cv;
  const { i0, j0, w, d } = b, i1 = i0 + w, j1 = j0 + d;
  const seed = i0 * 37 + j0 * 91;
  const cloth = theme === 'swamp' ? ['#5a5a3a', '#4a4a2e'] : theme === 'market' ? ['#6a1a14', '#4a100c'] : ['#5a4a3a', '#463a2e'];
  // 바닥 핏물
  g.globalAlpha = 0.75; g.fillStyle = '#3a0606'; { const [x, y] = P(i0 + w / 2, j1 + 0.15, 0); g.beginPath(); g.ellipse(x, y, 20, 6, 0, 0, Math.PI * 2); g.fill(); } g.globalAlpha = 1;
  // 도마 상 (앞쪽): 두꺼운 나무 판 + 다리
  const tz = 15;
  for (const [x, y] of [[i0 + 0.1, j1 - 0.1], [i1 - 0.1, j1 - 0.1], [i1 - 0.1, j0 + 0.15]] as const) { const [sx, sy] = P(x, y, 0); R(sx - 1, sy - tz, 2, tz, '#2a1a10'); }
  poly([P(i0, j0 + 0.1, tz), P(i1, j0 + 0.1, tz), P(i1, j1, tz), P(i0, j1, tz)], '#6a4a30');
  poly([P(i0, j1, tz), P(i1, j1, tz), P(i1, j1, tz - 4), P(i0, j1, tz - 4)], '#4a3020');
  poly([P(i1, j0 + 0.1, tz), P(i1, j1, tz), P(i1, j1, tz - 4), P(i1, j0 + 0.1, tz - 4)], '#3a2418');
  // 도마 위: 고깃덩이·갈비·칼
  for (let k = 0; k < 3; k++) {
    const [x, y] = P(i0 + 0.35 + k * (w - 0.6) / 2, j0 + d * 0.55, tz);
    g.fillStyle = '#8a2a22'; g.beginPath(); g.ellipse(x, y - 2, 6, 3, 0, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#c84a3a'; g.beginPath(); g.ellipse(x - 1, y - 3, 3.5, 1.6, 0, 0, Math.PI * 2); g.fill();
    R(x - 3, y - 3, 6, 1, '#e8d8c0');
  }
  { const [x, y] = P(i1 - 0.4, j1 - 0.2, tz); line([x - 8, y - 1], [x + 2, y - 4], 2, '#9aa0a8'); R(x + 2, y - 5, 3, 2, '#2a1a10'); }
  // 차양 기둥 넷
  const top = Hw;
  for (const [x, y] of [[i0, j1], [i1, j1], [i1, j0], [i0, j0]] as const) { const [sx, sy] = P(x, y, 0); R(sx - 1, sy - top, 2, top, x === i0 && y === j0 ? '#1e140c' : '#3a2618'); }
  // 가로대와 갈고리에 매단 고기 (뒤쪽 가로대)
  line(P(i0, j0, top - 4), P(i1, j0, top - 4), 2, '#2a1a10');
  for (let k = 0; k < Math.max(2, w * 2); k++) {
    const [x, y] = P(i0 + 0.25 + k * ((w - 0.5) / Math.max(1, w * 2 - 1)), j0, top - 4);
    R(x, y, 1, 4, '#8a8680');
    const big = hash(k, 3, seed) < 0.4;
    if (big) { // 갈비짝
      g.fillStyle = '#7a1e18'; g.fillRect(Math.round(x) - 4, Math.round(y) + 4, 8, 16);
      for (let r2 = 0; r2 < 5; r2++) R(x - 4, y + 6 + r2 * 3, 8, 1, '#e8d8c0');
      R(x - 4, y + 4, 2, 16, '#a83a2a');
    } else { g.fillStyle = hash(k, 4, seed) < 0.5 ? '#8a2a22' : '#6a1a16'; g.beginPath(); g.ellipse(x + 0.5, y + 11, 3.5, 7, 0, 0, Math.PI * 2); g.fill(); R(x - 1, y + 13, 2, 3, '#e8d8c0'); }
    if (hash(k, 5, seed) < 0.6) R(x, y + 20, 1, 3 + Math.floor(hash(k, 6, seed) * 5), '#5a0606'); // 떨어지는 핏방울
  }
  // 누더기 차양 (구멍 난 천, 처진 가장자리)
  const ov = 0.12;
  const roof = [P(i0 - ov, j0 - ov, top + 2), P(i1 + ov, j0 - ov, top + 2), P(i1 + ov, j1 + ov, top - 3), P(i0 - ov, j1 + ov, top - 3)];
  poly(roof, cloth[0]);
  for (let k = 0; k < 14; k++) { const [x, y] = P(i0 + hash(k, 1, seed) * w, j0 + hash(k, 2, seed) * d, top); R(x, y, 2 + Math.floor(hash(k, 7, seed) * 3), 1, k % 3 ? cloth[1] : '#2a1a10'); }
  for (let k = 0; k <= w * 6; k++) { const [x, y] = P(i0 - ov + k / 6, j1 + ov, top - 3); R(x, y, 1, 2 + (k % 3) + (hash(k, 9, seed) < 0.2 ? 4 : 0), cloth[1]); }
  for (let k = 0; k <= d * 6; k++) { const [x, y] = P(i1 + ov, j1 + ov - k / 6, top - 3); R(x, y, 1, 2 + (k % 2), shade(cloth[1], 0.8)); }
  // 파리
  for (let k = 0; k < 8; k++) { const [x, y] = P(i0 + hash(k, 11, seed) * w, j0 + hash(k, 12, seed) * d, tz + 4 + hash(k, 13, seed) * 16); R(x, y, 1, 1, '#0a0606'); }
  finish();
  return { canvas: cv.c, x: cv.minX, y: cv.minY };
}

// ───────── 잡동사니 좌판: 궤짝 위 널판, 기운 천막, 쌓인 해골 잔·녹슨 쇠붙이·누더기·항아리 ─────────
function stall(b: Building, theme: Theme) {
  const Hw = b.h;
  const cv = canvasFor(b, Hw + 10, 14);
  const { g, P, poly, R, line, finish } = cv;
  const { i0, j0, w, d } = b, i1 = i0 + w, j1 = j0 + d;
  const seed = i0 * 53 + j0 * 29;
  const cloth = theme === 'swamp' ? ['#4e5a3a', '#3a4428', '#6a6a44'] : theme === 'market' ? ['#7a3a1a', '#5a2a12', '#8a1a14'] : ['#5e544a', '#4a423a', '#7a6a52'];
  const tz = 12;
  // 궤짝 둘 위의 널판
  for (const x of [i0 + 0.1, i1 - 0.45]) { poly([P(x, j1 - 0.05, 0), P(x + 0.35, j1 - 0.05, 0), P(x + 0.35, j1 - 0.05, tz - 2), P(x, j1 - 0.05, tz - 2)], '#5a4028'); line(P(x, j1 - 0.05, 2), P(x + 0.35, j1 - 0.05, tz - 4), 1, '#3a2818'); }
  poly([P(i0, j0 + 0.15, tz), P(i1, j0 + 0.15, tz), P(i1, j1, tz), P(i0, j1, tz)], '#7a5a3a');
  poly([P(i0, j1, tz), P(i1, j1, tz), P(i1, j1, tz - 2), P(i0, j1, tz - 2)], '#4a3424');
  // 팔 것들
  const goods = ['#ddd2b6', '#6a6660', '#8a4a2a', '#3a4a5a', '#a88a4a', '#5a1a14', '#c9a23e'];
  for (let k = 0; k < w * 5; k++) {
    const [x, y] = P(i0 + 0.12 + (k / (w * 5)) * (w - 0.2), j0 + 0.35 + hash(k, 1, seed) * (d - 0.5), tz);
    const t = Math.floor(hash(k, 2, seed) * 5);
    const c = goods[Math.floor(hash(k, 3, seed) * goods.length)];
    if (t === 0) skull(cv, x, y - 3, 1);
    else if (t === 1) { R(x - 2, y - 6, 4, 6, c); R(x - 3, y - 7, 6, 1, shade(c, 0.7)); } // 항아리
    else if (t === 2) { line([x - 4, y - 1], [x + 4, y - 3], 1.5, '#7a7670'); } // 녹슨 쇠
    else if (t === 3) { R(x - 3, y - 2, 6, 2, c); R(x - 2, y - 3, 4, 1, shade(c, 1.2)); } // 개킨 누더기
    else { R(x - 1, y - 4, 2, 4, '#e8d8c0'); R(x - 2, y - 5, 4, 1, '#c9a23e'); } // 뼈 잔
  }
  // 기운 천막: 뒤쪽 기둥 둘이 높고 앞은 낮다, 천은 기운 조각
  const hb = Hw, hf = Hw - 10;
  for (const [x, y, hh] of [[i0, j0, hb], [i1, j0, hb], [i0, j1, hf], [i1, j1, hf]] as const) { const [sx, sy] = P(x, y, 0); R(sx - 1, sy - hh, 2, hh, '#2e2014'); }
  const ov = 0.15;
  const nP = 4;
  for (let k = 0; k < nP; k++) {
    const a = i0 - ov + (k / nP) * (w + 2 * ov), bb = a + (w + 2 * ov) / nP;
    poly([P(a, j0 - ov, hb + 1), P(bb, j0 - ov, hb + 1), P(bb, j1 + ov, hf - 2), P(a, j1 + ov, hf - 2)], cloth[Math.floor(hash(k, 4, seed) * 3)]);
  }
  for (let k = 0; k <= (w + 2 * ov) * 5; k++) { const [x, y] = P(i0 - ov + k / 5, j1 + ov, hf - 2); R(x, y, 1, 1 + (k % 3), cloth[1]); }
  // 끈에 매단 물건 (앞 처마)
  for (let k = 0; k < w * 2; k++) { const [x, y] = P(i0 + 0.3 + k * 0.5, j1 + ov * 0.6, hf - 2); R(x, y, 1, 5, '#2a1a10'); if (k % 2) skull(cv, x, y + 7, 1); else { R(x - 1, y + 5, 3, 5, goods[k % goods.length]); } }
  finish();
  return { canvas: cv.c, x: cv.minX, y: cv.minY };
}

// ───────── 불탄 건물: 지붕이 무너지고 창이 뚫린 숯 검정 벽, 위로 갈수록 부서진 윤곽, 그을음과 남은 불씨 ─────────
function burnt(b: Building, theme: Theme) {
  const Hw = b.h;
  const cv = canvasFor(b, Hw + 6, 8);
  const { g, P, poly, R, finish } = cv;
  const { i0, j0, w, d } = b, i1 = i0 + w, j1 = j0 + d;
  const seed = i0 * 71 + j0 * 13 + Hw;
  void theme;
  // 위쪽 윤곽: 군데군데 무너져 내려앉았다 (칸마다 높이가 다르다)
  const LW = w * (TW / 2), RWd = d * (TW / 2);
  const hL = (u: number) => Hw - Math.floor(hash(Math.floor(u / 6), 1, seed) * Hw * 0.45) - (hash(Math.floor(u / 2), 2, seed) < 0.3 ? 3 : 0);
  const hR = (u: number) => Hw - Math.floor(hash(Math.floor(u / 6), 3, seed) * Hw * 0.5) - (hash(Math.floor(u / 2), 4, seed) < 0.3 ? 3 : 0);
  const floorH = 22;
  const winAt = (face: number, u: number, z: number) => {
    const span = face ? RWd : LW;
    const cell = u % 16, story = Math.floor(z / floorH), zz = z % floorH;
    return u > 4 && u < span - 4 && cell >= 4 && cell <= 11 && zz >= 7 && zz <= 17 && story >= 0 && hash(Math.floor(u / 16), story, seed + face) < 0.85;
  };
  // 안쪽: 무너진 윗선 너머로 보이는 뒤쪽 두 벽(그을린 속살)과 바닥의 잿더미
  poly([P(i0, j0, 0), P(i1, j0, 0), P(i1, j1, 0), P(i0, j1, 0)], '#141110');
  for (let k = 0; k < LW; k++) { const [sx, sy] = P(i0 + k / (TW / 2), j0, 0); for (let z = 0; z < Hw * 0.92; z++) R(sx, sy - z - 1, 1, 1, (z % floorH === 0 || winAt(0, k, z)) ? '#060504' : shade('#221e1c', 0.7 + hash(k >> 1, z >> 1, seed + 21) * 0.35)); }
  for (let k = 0; k < RWd; k++) { const [sx, sy] = P(i0, j1 - k / (TW / 2), 0); for (let z = 0; z < Hw * 0.92; z++) R(sx, sy - z - 1, 1, 1, (z % floorH === 0 || winAt(1, k, z)) ? '#040303' : shade('#1a1716', 0.7 + hash(k >> 1, z >> 1, seed + 23) * 0.35)); }
  for (let k = 0; k < LW; k++) {
    const [sx, sy] = P(i0 + k / (TW / 2), j1, 0), top = hL(k);
    for (let z = 0; z < top; z++) {
      let c = shade('#2a2624', 0.75 + hash(k >> 1, z >> 1, seed) * 0.4);
      if (z % floorH === 0) c = '#141110';
      if (winAt(0, k, z)) c = (z % floorH) < 9 && hash(k, z, seed) < 0.25 ? '#3a1a0e' : '#060504';
      if (z > top - 3 && hash(k, 5, seed) < 0.5) c = '#0e0c0b';
      if (z < 10 && hash(k >> 2, z >> 2, seed) < 0.3) c = '#5a5650'; // 재 더미
      R(sx, sy - z - 1, 1, 1, c);
    }
  }
  for (let k = 0; k < RWd; k++) {
    const [sx, sy] = P(i1, j1 - k / (TW / 2), 0), top = hR(k);
    for (let z = 0; z < top; z++) {
      let c = shade('#1e1b1a', 0.75 + hash(k >> 1, z >> 1, seed + 7) * 0.4);
      if (z % floorH === 0) c = '#0e0c0b';
      if (winAt(1, k, z)) c = '#040303';
      if (z < 10 && hash(k >> 2, z >> 2, seed + 3) < 0.3) c = '#4a4642';
      R(sx, sy - z - 1, 1, 1, c);
    }
  }
  // 무너진 층 바닥 끝의 휜 철근
  for (let k = 0; k < 5; k++) {
    const u = hash(k, 8, seed) * LW, [sx, sy] = P(i0 + u / (TW / 2), j1, hL(u));
    g.strokeStyle = '#5a4a3e'; g.lineWidth = 1; g.beginPath(); g.moveTo(sx, sy); g.lineTo(sx + (hash(k, 9, seed) - 0.5) * 8, sy - 4 - hash(k, 10, seed) * 6); g.stroke();
  }
  // 창 몇 곳에 아직 남은 불씨 (붉은 빛)
  for (let k = 0; k < 4; k++) {
    const u = 6 + hash(k, 11, seed) * (LW - 12), z = 6 + Math.floor(hash(k, 12, seed) * (Hw * 0.5));
    if (!winAt(0, Math.floor(u), z)) continue;
    const [sx, sy] = P(i0 + u / (TW / 2), j1, z);
    R(sx - 1, sy - 2, 3, 2, '#ff6a1a'); R(sx, sy - 3, 1, 1, '#ffd26a');
  }
  // 벽 밑 잔해
  for (let k = 0; k < 9; k++) { const [x, y] = P(i0 + hash(k, 14, seed) * w, j1 + 0.1 + hash(k, 15, seed) * 0.2, 0); R(x - 2, y - 2, 3 + Math.floor(hash(k, 16, seed) * 4), 2, k % 2 ? '#3a3632' : '#1a1614'); }
  void poly;
  finish();
  return { canvas: cv.c, x: cv.minX, y: cv.minY };
}

/** 지옥의 집·덩어리 한 채 */
/** 24차 4층 조형물: 거대한 모루 — 그 위에 박힌 대장장이 망치, 감긴 쇠사슬, 위에서 쇳물을 붓는 도가니 (분노를 두들겨 펴는 곳) */
function greatAnvil(b: Building) {
  const top = b.h + 30;
  const cv = canvasFor(b, top, 18);
  const { g, P, R, line, finish } = cv;
  const { i0, j0, w, d } = b, j1 = j0 + d;
  const E = (x: number, y: number, rx: number, ry: number, col: string) => { g.fillStyle = col; g.beginPath(); g.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); g.fill(); };
  plinth(cv, b, 0, 10, 0.1, '#2e2a28', '#221e1c', '#161312');
  plinth(cv, b, 10, 18, 0.6, '#3a3634', '#2a2624', '#1a1716');
  const [cx, cy] = P(i0 + w / 2, j0 + d / 2, 18);
  const iron = '#3a3634', ironL = '#6a625a', ironD = '#1a1614', hot = '#ff8a1a', white = '#fff2b8';
  // 모루: 허리가 잘록한 받침 · 넓은 머리 · 앞으로 뾰족한 뿔
  R(cx - 9, cy - 22, 18, 22, iron); R(cx - 9, cy - 22, 3, 22, ironL); R(cx + 6, cy - 22, 3, 22, ironD);
  R(cx - 14, cy - 6, 28, 6, ironD);
  R(cx - 22, cy - 34, 40, 12, iron); R(cx - 22, cy - 34, 40, 2, ironL); R(cx - 22, cy - 24, 40, 2, ironD);
  for (let k = 0; k < 12; k++) R(cx + 18 + k, cy - 33 + Math.floor(k / 3), 1, 10 - Math.floor(k * 0.8), k < 6 ? iron : ironD); // 뿔
  // 모루 위에 달아오른 쇳덩이와 박힌 망치
  E(cx - 4, cy - 36, 8, 3, hot); E(cx - 4, cy - 37, 5, 2, white);
  line([cx + 4, cy - 36], [cx + 14, cy - 66], 3, '#4a3424');
  R(cx + 7, cy - 74, 16, 9, iron); R(cx + 7, cy - 74, 16, 2, ironL); R(cx + 20, cy - 74, 3, 9, ironD);
  // 감긴 쇠사슬
  for (let k = 0; k < 16; k++) R(cx - 20 + k * 2.6, cy - 30 + Math.sin(k * 0.8) * 3 + k * 1.1, 3, 2, k % 2 ? '#5a5652' : '#8a8078');
  // 위에서 쇳물을 붓는 도가니 (사슬에 매달림) — 하얗게 떨어지는 쇳물 줄기
  line([cx - 30, cy - 104], [cx - 12, cy - 84], 1, '#5a5652'); line([cx + 2, cy - 104], [cx - 4, cy - 86], 1, '#5a5652');
  R(cx - 16, cy - 88, 14, 10, ironD); R(cx - 15, cy - 87, 12, 3, hot);
  R(cx - 6, cy - 80, 3, 42, hot); R(cx - 5, cy - 80, 1, 42, white);
  // 받침 둘레로 흘러내린 쇳물과 흩어진 불티
  for (let k = 0; k < 5; k++) { const [x, y] = P(i0 + 0.3 + k * (w - 0.6) / 4, j1 - 0.1, 18); R(x, y, 1, 8 + (k * 5) % 9, k % 2 ? hot : '#c8420e'); }
  for (let k = 0; k < 14; k++) { const [x, y] = P(i0 + hash(k, 1, i0) * w, j1 + 0.1 + hash(k, 2, j0) * 0.4, 0); R(x, y - 1, 1, 1, hash(k, 3) < 0.5 ? hot : white); }
  finish();
  return { canvas: cv.c, x: cv.minX, y: cv.minY };
}

export function drawHellBuild(b: Building, kind: HellBuildKind, theme: Theme): { canvas: HTMLCanvasElement; x: number; y: number } {
  if (kind === 'idol') return theme === 'ash' ? demonIdol(b) : theme === 'swamp' ? hungryMaw(b) : theme === 'forge' ? greatAnvil(b) : bloodScale(b);
  if (kind === 'thatch') return thatch(b, theme);
  if (kind === 'prison') return prison(b, theme);
  if (kind === 'bonehouse') return bonehouse(b, theme);
  if (kind === 'carcass') return carcass(b, theme);
  if (kind === 'butcher') return butcher(b, theme);
  if (kind === 'stall') return stall(b, theme);
  if (kind === 'burnt') return burnt(b, theme);
  if (kind === 'bonepile') return bonepile(b, theme);
  return guts(b, theme);
}


// ───────── 17차: 마을의 조형물 (들어갈 수 없는 건물 대신) — 층마다 다르다 ─────────
/** 계단식 돌 받침 (위에서 본 네모 두 단) */
function plinth(cv: Cv, b: Building, z0: number, z1: number, inset: number, top: string, left: string, right: string) {
  const { P, poly } = cv;
  const { i0, j0, w, d } = b, a0 = i0 + inset, a1 = i0 + w - inset, c0 = j0 + inset, c1 = j0 + d - inset;
  poly([P(a0, c1, z0), P(a1, c1, z0), P(a1, c1, z1), P(a0, c1, z1)], left);
  poly([P(a1, c1, z0), P(a1, c0, z0), P(a1, c0, z1), P(a1, c1, z1)], right);
  poly([P(a0, c0, z1), P(a1, c0, z1), P(a1, c1, z1), P(a0, c1, z1)], top);
}

/** 1층: 재의 악마상 — 두 단 현무암 받침 위에 무릎 꿇은 거대한 뿔 달린 악마. 접은 박쥐 날개, 불씨 눈, 앞으로 내민 손에 공물 그릇.
 *  받침 앞에는 화로 둘과 공물(해골·촛불), 둘레에는 재 더미. 영혼들이 그 앞에 엎드려 빈다 */
function demonIdol(b: Building) {
  const top = b.h + 24;
  const cv = canvasFor(b, top, 22);
  const { g, P, R, line, finish } = cv;
  const { i0, j0, w, d } = b, i1 = i0 + w, j1 = j0 + d;
  plinth(cv, b, 0, 7, 0.05, '#4a4642', '#3a3634', '#2a2624');
  plinth(cv, b, 7, 13, 0.5, '#56524c', '#403c38', '#2e2a28');
  const [cx, cy] = P(i0 + w / 2, j0 + d / 2, 13);
  const K = 1.85; // 상의 크기
  const stone = '#2c2826', stoneL = '#4a4440', stoneD = '#1a1614', ember = '#ff7a2a', ember2 = '#ffd27a';
  const X = (a: number) => cx + a * K, Y = (a: number) => cy + a * K;
  const E = (x: number, y: number, rx: number, ry: number, col: string) => { g.fillStyle = col; g.beginPath(); g.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); g.fill(); };
  const EK = (a: number, b2: number, rx: number, ry: number, col: string) => E(X(a), Y(b2), rx * K, ry * K, col);
  const LK = (a: [number, number], b2: [number, number], wd: number, col: string) => line([X(a[0]), Y(a[1])], [X(b2[0]), Y(b2[1])], wd * K, col);
  // 접은 날개 (몸 뒤로 솟은 뼈대와 막)
  for (const sx of [-1, 1]) {
    g.fillStyle = stoneD; g.beginPath();
    for (const [n, [a, b2]] of ([[6, -44], [26, -78], [30, -60], [22, -40], [24, -24], [10, -18]] as [number, number][]).entries()) { if (n === 0) g.moveTo(X(sx * a), Y(b2)); else g.lineTo(X(sx * a), Y(b2)); }
    g.closePath(); g.fill();
    LK([sx * 6, -44], [sx * 26, -78], 1.1, stoneL); LK([sx * 26, -78], [sx * 22, -40], 0.6, stone); LK([sx * 26, -78], [sx * 12, -22], 0.6, stone);
    for (let k = 0; k < 3; k++) LK([sx * (24 - k * 3), -70 + k * 10], [sx * (14 - k * 2), -26 + k * 2], 0.4, '#24201e'); // 날개막 결
  }
  // 무릎 꿇은 다리와 몸통
  EK(-8, -4, 9, 5, stone); EK(8, -4, 9, 5, stone); EK(-10, -6, 4, 3, stoneL);
  EK(0, -22, 13, 16, stone); EK(-3, -26, 8, 10, stoneL);
  for (let k = 0; k < 4; k++) R(X(-7), Y(-30 + k * 4), 14 * K, K, stoneD); // 갈비 같은 근육 결
  // 어깨와 앞으로 내민 팔, 손바닥 위 공물 그릇 (안에 불씨)
  EK(-12, -34, 6, 5, stoneL); EK(12, -34, 6, 5, stone);
  LK([-14, -32], [-10, -14], 5, stone); LK([14, -32], [10, -14], 5, stone);
  EK(0, -12, 10, 4, stoneD); EK(0, -13, 8, 2.5, '#4a1a0a'); R(X(-3), Y(-15), 6 * K, 2 * K, ember); R(X(-1), Y(-17), 2 * K, 2 * K, ember2);
  // 머리: 짐승 같은 주둥이, 불씨 눈, 크게 말린 숫양 뿔
  EK(0, -46, 7, 8, stone); EK(0, -41, 5, 4, stoneL);
  for (const sx of [-1, 1]) { R(X(sx * 3 - 1), Y(-48), 2 * K, 2 * K, ember); R(X(sx * 3 - 1), Y(-48), K, K, ember2); }
  R(X(-3), Y(-39), 6 * K, K, '#140c0a'); R(X(-3), Y(-40), K, 2 * K, '#c8bca8'); R(X(2), Y(-40), K, 2 * K, '#c8bca8'); // 송곳니
  for (const sx of [-1, 1]) {
    let px = 5 * sx, py = -52;
    for (let k = 0; k < 9; k++) { const a = (k / 8) * Math.PI * 1.4; const nx = sx * (6 + Math.sin(a) * 11), ny = -54 - Math.cos(a) * 9 + k * 0.6; LK([px, py], [nx, ny], Math.max(0.8, 2.2 - k * 0.16), k % 2 ? '#3a2e26' : '#4a3c30'); px = nx; py = ny; }
  }
  // 재가 쌓인 머리와 어깨
  R(X(-6), Y(-54), 12 * K, 2, '#8a8580'); R(X(-16), Y(-39), 8 * K, 2, '#8a8580'); R(X(9), Y(-39), 8 * K, 2, '#7a7570');
  // 받침 앞: 화로 둘 · 해골 공물 · 촛불
  for (const x of [i0 + 0.3, i1 - 0.4]) {
    const [fx, fy] = P(x, j1 + 0.1, 0);
    R(fx - 1, fy - 14, 3, 14, '#1a1412'); E(fx + 0.5, fy - 15, 6, 2, '#2a2420');
    R(fx - 3, fy - 21, 7, 5, ember); R(fx - 1, fy - 25, 3, 4, ember2); R(fx, fy - 27, 1, 2, '#fff0c0');
  }
  for (let k = 0; k < 3; k++) { const [x, y] = P(i0 + 0.9 + k * 0.5, j1 + 0.15, 7); skull(cv, x, y - 2); }
  for (let k = 0; k < 6; k++) { const [x, y] = P(i0 + 0.6 + k * 0.32, j1 + 0.2, 0); R(x, y - 4, 1, 4, '#efe6d0'); R(x, y - 6, 1, 2, '#ffc04a'); }
  for (let k = 0; k < 7; k++) { const [x, y] = P(i0 + hash(k, 1, i0) * w, j0 + hash(k, 2, j0) * d, 0); E(x, y, 4 + hash(k, 3) * 4, 2, '#6a6560'); }
  finish();
  return { canvas: cv.c, x: cv.minX, y: cv.minY };
}

/** 2층: 굶주린 아가리 — 진흙 늪에 반쯤 잠긴 거대한 돌 얼굴. 턱이 빠질 듯 벌린 입 속은 끝없는 어둠, 깨진 이빨,
 *  눈구멍에서 흘러내린 이끼 물, 입 앞에 놓인 빈 그릇과 뼈다귀 (먹을 것을 바쳐도 채워지지 않는다) */
function hungryMaw(b: Building) {
  const top = b.h + 10;
  const cv = canvasFor(b, top, 16);
  const { g, P, R, line, finish } = cv;
  const { i0, j0, w, d } = b, j1 = j0 + d;
  const E = (x: number, y: number, rx: number, ry: number, col: string) => { g.fillStyle = col; g.beginPath(); g.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); g.fill(); };
  const [cx, cy] = P(i0 + w / 2, j0 + d / 2, 0);
  // 둘레의 진흙 웅덩이
  E(cx, cy + 4, 40, 13, '#2e2618'); E(cx, cy + 3, 34, 10, '#3a3020');
  // 머리통 (이끼 낀 녹회색 돌)
  const st = '#4a5040', stL = '#5e6650', stD = '#2e3428';
  E(cx, cy - 30, 30, 30, st); E(cx - 8, cy - 40, 16, 14, stL);
  // 이마 주름과 눈두덩, 텅 빈 눈구멍에서 흘러내린 물때
  for (let k = 0; k < 3; k++) line([cx - 18, cy - 50 + k * 4], [cx + 18, cy - 51 + k * 4], 1, stD);
  for (const sx of [-1, 1]) {
    E(cx + sx * 11, cy - 36, 6, 4, '#0e100c');
    R(cx + sx * 11 - 1, cy - 33, 2, 10, '#2e3e22'); R(cx + sx * 11, cy - 24, 1, 5, '#3e5a2a');
  }
  // 벌린 입: 위턱 이빨 → 끝없는 어둠 → 아래턱이 진흙에 잠긴다
  g.fillStyle = '#050605'; g.beginPath(); g.moveTo(cx - 20, cy - 24); g.quadraticCurveTo(cx, cy - 30, cx + 20, cy - 24); g.quadraticCurveTo(cx + 22, cy - 2, cx, cy + 2); g.quadraticCurveTo(cx - 22, cy - 2, cx - 20, cy - 24); g.fill();
  for (let k = 0; k < 7; k++) { const x = cx - 16 + k * 5.3, h = k === 2 ? 2 : 4 + (k % 2) * 2; g.fillStyle = '#b8b098'; g.beginPath(); g.moveTo(x - 2, cy - 26 + Math.abs(k - 3) * 0.6); g.lineTo(x + 2, cy - 26 + Math.abs(k - 3) * 0.6); g.lineTo(x, cy - 26 + h + Math.abs(k - 3) * 0.6); g.fill(); }
  for (let k = 0; k < 6; k++) { const x = cx - 13 + k * 5.2; g.fillStyle = k === 4 ? '#6a6250' : '#a8a088'; g.beginPath(); g.moveTo(x - 2, cy - 1); g.lineTo(x + 2, cy - 1); g.lineTo(x, cy - 5 - (k % 2)); g.fill(); }
  // 입에서 늘어진 침 (녹빛)
  for (const x of [cx - 9, cx + 6]) { R(x, cy - 22, 1, 12, '#8ab05a'); R(x, cy - 10, 2, 2, '#a8d06a'); }
  // 이끼 덩어리와 진흙 튄 자국
  for (let k = 0; k < 14; k++) { const a = hash(k, 1, i0) * Math.PI * 2, rr = 22 + hash(k, 2, j0) * 8; E(cx + Math.cos(a) * rr * 0.9, cy - 30 + Math.sin(a) * rr * 0.9, 3 + hash(k, 3) * 3, 2, hash(k, 4) < 0.5 ? '#3e5a2a' : '#56702e'); }
  // 입 앞: 빈 그릇 넷과 뼈다귀 (먹을 것은 없다)
  for (let k = 0; k < 4; k++) { const [x, y] = P(i0 + 0.5 + k * 0.6, j1 + 0.25, 0); E(x, y - 1, 4, 1.6, '#5a4a36'); E(x, y - 1.6, 3, 1, '#1a140e'); }
  for (let k = 0; k < 3; k++) { const [x, y] = P(i0 + 0.8 + k * 0.7, j1 + 0.45, 0); line([x - 3, y], [x + 3, y - 1], 2, BONE2); R(x - 4, y - 1, 2, 2, BONE); R(x + 3, y - 2, 2, 2, BONE); }
  finish();
  return { canvas: cv.c, x: cv.minX, y: cv.minY };
}

/** 3층: 피의 저울 — 핏빛 돌 받침 위 쇠기둥, 가로대 양 끝에 사슬로 매단 두 접시: 한쪽엔 뛰는 심장, 한쪽엔 노전 더미.
 *  늘 노전 쪽으로 기운다. 가로대 끝의 붉은 등롱, 받침을 타고 흐르는 피, 바닥에 흩어진 동전 */
function bloodScale(b: Building) {
  const top = b.h + 24;
  const cv = canvasFor(b, top, 18);
  const { g, P, R, line, finish } = cv;
  const { i0, j0, w, d } = b, j1 = j0 + d;
  const E = (x: number, y: number, rx: number, ry: number, col: string) => { g.fillStyle = col; g.beginPath(); g.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); g.fill(); };
  plinth(cv, b, 0, 10, 0.1, '#5a2a24', '#4a1e1a', '#36140f');
  plinth(cv, b, 10, 18, 0.7, '#6a3028', '#521f1a', '#3a1410');
  const [cx, cy] = P(i0 + w / 2, j0 + d / 2, 18);
  const iron = '#3a3634', gold = '#c9a23e', goldD = '#8a6a2a';
  // 기둥과 꼭대기 장식 (눈 하나)
  R(cx - 2, cy - 74, 5, 74, iron); R(cx - 1, cy - 74, 1, 74, '#5a5652');
  E(cx + 0.5, cy - 78, 5, 5, gold); E(cx + 0.5, cy - 78, 2.5, 2.5, '#2a0a06'); R(cx, cy - 79, 1, 1, '#ff4a2a');
  // 기운 가로대 (노전 쪽 = 왼쪽이 낮다)
  const L: Pt = [cx - 30, cy - 66], Rr: Pt = [cx + 31, cy - 74];
  line(L, Rr, 3, goldD); line([L[0], L[1] - 1], [Rr[0], Rr[1] - 1], 1, gold);
  // 사슬과 접시
  const pan = (p: Pt, drop: number, fill: (x: number, y: number) => void) => {
    for (const dx of [-7, 0, 7]) for (let k = 0; k < drop; k += 3) R(p[0] + (dx * k) / drop, p[1] + k, 1, 2, '#6a6660');
    E(p[0], p[1] + drop, 10, 3, goldD); E(p[0], p[1] + drop - 1, 9, 2, gold);
    fill(p[0], p[1] + drop - 2);
  };
  pan(L, 30, (x, y) => { for (let k = 0; k < 9; k++) E(x - 6 + (k % 5) * 3, y - 1 - Math.floor(k / 5) * 2, 2, 1, k % 2 ? '#d9b44a' : '#f2d27a'); });
  pan(Rr, 22, (x, y) => { E(x, y - 3, 4, 4, '#8a0e0c'); E(x - 1, y - 4, 2, 2, '#d8281e'); R(x + 1, y - 8, 1, 3, '#5a0606'); R(x - 2, y - 7, 1, 2, '#5a0606'); });
  // 가로대 끝의 붉은 등롱
  for (const p of [L, Rr]) {
    const x = p[0] + (p === L ? -4 : 4), y = p[1] + 2;
    R(x, y, 1, 4, '#1a0c08'); R(x - 3, y + 4, 7, 7, '#6a0a08'); R(x - 2, y + 4, 5, 7, '#d8281e'); R(x - 1, y + 6, 2, 3, '#ff8a4a'); R(x, y + 11, 1, 3, gold);
  }
  // 받침을 타고 흐르는 피와 바닥에 흩어진 동전
  for (let k = 0; k < 5; k++) { const [x, y] = P(i0 + 0.3 + k * (w - 0.6) / 4, j1 - 0.1, 18); R(x, y, 1, 8 + (k * 5) % 9, '#7a0a08'); }
  for (let k = 0; k < 10; k++) { const [x, y] = P(i0 + hash(k, 1, i0) * w, j1 + 0.1 + hash(k, 2, j0) * 0.4, 0); R(x, y - 1, 2, 1, hash(k, 3) < 0.5 ? '#d9b44a' : '#a8823a'); }
  finish();
  return { canvas: cv.c, x: cv.minX, y: cv.minY };
}
