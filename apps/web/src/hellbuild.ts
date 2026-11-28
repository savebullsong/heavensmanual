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
/** 46차: 작은 해골도 빛 · 그늘 · 이 · 콧구멍 (s ≥ 2 면 금 간 자국과 눈 속 불씨) */
function skull(cv: Cv, x: number, y: number, s = 1, ember = false) {
  const { R } = cv;
  R(x - 2 * s, y - 2 * s, 5 * s, 4 * s, BONE); R(x - 1.5 * s, y - 2.6 * s, 4 * s, Math.max(1, 0.6 * s), BONE);
  R(x + 2 * s, y - 2 * s, Math.max(1, s), 4 * s, BONE2); R(x - 2 * s, y - 2 * s, Math.max(1, s), Math.max(1, s), '#f4ecd8'); // 그늘 · 빛
  R(x - 1 * s, y + 2 * s, 3 * s, 1 * s, BONE2); if (s >= 2) for (let k = 0; k < 3; k++) R(x - 1 * s + k * s, y + 2 * s, 1, s, HOLE); // 턱 · 이 사이
  R(x - 1.5 * s, y - 0.5 * s, s, s, HOLE); R(x + 0.5 * s, y - 0.5 * s, s, s, HOLE); R(x, y + 1 * s, 1, 1, HOLE);
  if (ember) { R(x - 1.5 * s + s / 2 - 0.5, y - 0.5 * s + s / 2 - 0.5, 1, 1, '#ff5a1a'); R(x + 0.5 * s + s / 2 - 0.5, y - 0.5 * s + s / 2 - 0.5, 1, 1, '#ff5a1a'); }
  if (s >= 2) { R(x + 0.5 * s, y - 2.4 * s, 1, s, BONE3); R(x + s, y - 1.6 * s, 1, s * 0.6, BONE3); } // 금
}
/** 46차: 뿔 달린 짐승 해골 (뼈 무더기 · 뼈집의 장식) */
function beastSkull(cv: Cv, x: number, y: number, s = 1, f = 1) {
  const { R, line } = cv;
  line([x - 2 * s * f, y - 2 * s], [x - 8 * s * f, y - 7 * s], 2 * s, BONE2); line([x - 8 * s * f, y - 7 * s], [x - 9 * s * f, y - 12 * s], 1.4 * s, BONE); // 뒤 뿔
  R(x - 3 * s, y - 3 * s, 6 * s, 4 * s, BONE); R(x + 1 * s * f, y - 1 * s, 5 * s, 3 * s, BONE2); R(x + 5 * s * (f > 0 ? 1 : -1.4), y, 2 * s, 2 * s, BONE3); // 머리 · 길쭉한 주둥이
  R(x - 1 * s, y - 2 * s, 2 * s, 2 * s, HOLE); R(x + 4 * s * f, y, Math.max(1, s), Math.max(1, s), HOLE);
  for (let k = 0; k < 4; k++) R(x + (1 + k) * s * f, y + 2 * s, 1, Math.max(1, s * 0.8), '#f0e8d4'); // 이
  line([x + 1 * s * f, y - 3 * s], [x + 6 * s * f, y - 8 * s], 2 * s, BONE2); line([x + 6 * s * f, y - 8 * s], [x + 5 * s * f, y - 13 * s], 1.4 * s, BONE); // 앞 뿔
  R(x - 2 * s, y - 3 * s, Math.max(1, s), Math.max(1, s), '#f4ecd8');
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
  { const [sx, sy] = P(m, j1, 22); skull(cv, sx, sy, 2, true); for (const sd of [-1, 1]) { const [bx, by] = P(m + sd * 0.42, j1, 20); R(bx - 1, by, 2, 6, BONE2); R(bx - 2, by + 6, 4, 2, BONE); } } // 46차: 문 위의 해골 (눈 속 불씨) · 양옆 뼈 술
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
  // 50차 등뼈: 갈비가 솟아오른 꼭대기를 따라 이어진다 (갈비는 등뼈에서 내려와 땅에 닿는다 — 예전엔 등뼈가 땅에 따로 누워 있었다)
  const ridge = (sv: number) => 6 + Hc * (0.55 + 0.45 * Math.sin(Math.max(0, Math.min(1, (sv - 0.7) / Math.max(0.1, L - 1.4))) * Math.PI)) * 0.98;
  const spineAt = (sv: number): Pt => sv < 0.7 ? at(sv, 0, 6 + (ridge(0.7) - 6) * (sv / 0.7)) : sv > L - 0.7 ? at(sv, 0, ridge(L - 0.7) + (10 + 6 - ridge(L - 0.7)) * ((sv - (L - 0.7)) / 0.7)) : at(sv, 0, ridge(sv));
  const vert = (sv: number, k: number) => { const [x, y] = spineAt(sv); const X = Math.round(x), Y = Math.round(y); R(X - 3, Y - 1, 6, 4, BONE3); R(X - 3, Y - 2, 5, 3, k % 2 ? BONE : BONE2); R(X - 1, Y - 5, 2, 3, BONE2); R(X - 1, Y - 5, 1, 2, BONE); }; // 마디 · 위로 솟은 가시돌기
  // 갈비 사이에 늘어진 썩은 살
  for (let k = 0; k < ribs - 1; k++) {
    if (hash(k, 6, seed) < 0.45) continue;
    const a = ribPts(k, back), bb = ribPts(k + 1, back);
    const n = Math.min(a.length, bb.length) - 1, t0 = Math.floor(hash(k, 7, seed) * 3), t1 = Math.min(n, t0 + 3 + Math.floor(hash(k, 8, seed) * 4));
    const pts: Pt[] = [...a.slice(t0, t1 + 1), ...bb.slice(t0, t1 + 1).reverse()];
    if (pts.length > 2) { poly(pts, flesh[0]); for (let q = t0; q < t1; q += 2) R(a[q][0] + 2, a[q][1] + 2, 1, 4 + (q % 3) * 2, flesh[1]); }
  }
  for (let k = 0, sv = 0.25; sv <= L + 0.05; sv += 0.12, k++) vert(sv, k);
  // 앞쪽 갈비 (가까운 쪽)
  for (let k = 0; k < ribs; k++) drawRib(ribPts(k, -back), BONE, BONE2);
  // 앞쪽에도 군데군데 살점
  for (let k = 0; k < ribs; k++) { if (hash(k, 9, seed) < 0.6) continue; const p = ribPts(k, -back); const q = p[Math.min(p.length - 1, 3 + (k % 3))]; R(q[0] - 2, q[1], 5, 4, flesh[0]); R(q[0] - 1, q[1] + 4, 2, 3, flesh[1]); R(q[0] - 1, q[1], 2, 1, flesh[2]); }
  // 50차 뿔 달린 짐승 해골: 둥근 머리뼈 · 길게 뻗은 주둥이(콧구멍 · 윗니) · 벌어진 아래턱 · 깊은 눈구멍 · 뒤로 휘어 오른 두 뿔. 목뼈로 등뼈에 이어진다
  { const [x, y] = at(L + 0.15, 0.05, 12); const X = Math.round(x), Y = Math.round(y), f = alongI ? 1 : -1;
    const Q = (pts: [number, number][], col: string) => poly(pts.map(([px, py]) => [X + px * f, Y + py] as Pt), col);
    const hornC = theme === 'swamp' ? ['#5a5240', '#8a8064'] : ['#5a4836', '#8e7a5e'];
    // 먼 쪽 뿔 (먼저)
    Q([[-4, -6], [-10, -14], [-18, -18], [-24, -16], [-27, -10], [-24, -12], [-18, -14], [-12, -10], [-6, -3]], hornC[0]);
    // 아래턱 (살짝 벌어짐)
    Q([[-4, 4], [6, 6], [18, 10], [20, 12], [6, 10], [-4, 8]], BONE3);
    for (let t = 0; t < 5; t++) R(X + (6 + t * 2.6) * f - (f < 0 ? 1 : 0), Y + 6 + t * 0.7, 1, 2, BONE);
    // 머리뼈 · 주둥이
    Q([[-9, -2], [-7, -7], [-1, -9], [5, -7], [10, -3], [22, 2], [24, 5], [21, 7], [8, 5], [-2, 6], [-8, 4]], BONE2);
    Q([[-7, -6], [-1, -8], [5, -6], [10, -3], [21, 2], [12, 0], [2, -3], [-5, -2]], BONE); // 윗면 빛
    Q([[-9, 1], [-2, 6], [8, 5], [21, 7], [18, 8], [6, 7], [-3, 8], [-9, 4]], BONE3); // 아랫면 그늘
    // 눈구멍 · 광대 · 콧구멍 · 윗니
    g.fillStyle = HOLE; g.beginPath(); g.ellipse(X + 1 * f, Y - 2, 3.2, 2.6, 0, 0, Math.PI * 2); g.fill();
    R(X + (f > 0 ? -2 : -1), Y + 1, 6, 1, BONE3);
    Q([[18, 1], [22, 2], [21, 4], [17, 3]], HOLE);
    for (let t = 0; t < 6; t++) R(X + (8 + t * 2.3) * f - (f < 0 ? 1 : 0), Y + 5 + t * 0.35, 1, 2, '#efe6cc');
    // 금 · 얼룩
    R(X - 4 * f, Y - 6, 1, 3, BONE3); R(X - 3 * f, Y - 4, 1, 1, BONE3);
    // 가까운 쪽 뿔 (굵은 밑동에서 뒤로 휘어 올라 끝이 뾰족하다 · 결이 진다)
    Q([[-3, -7], [-8, -15], [-15, -21], [-23, -22], [-29, -17], [-30, -10], [-27, -13], [-22, -17], [-15, -16], [-9, -11], [-4, -3]], hornC[1]);
    for (const [px, py] of [[-8, -13], [-13, -17], [-19, -19], [-24, -18]] as [number, number][]) R(X + px * f, Y + py, 2, 1, hornC[0]);
    R(X + -29 * f, Y - 12, 1, 2, '#efe6cc');
    // 목뼈: 머리뼈 뒤에서 등뼈 끝으로
    for (let t = 0; t <= 4; t++) { const sv = L - 0.55 + t * 0.12; const [vx, vy] = spineAt(Math.min(L, sv)); R(Math.round(vx) - 2, Math.round(vy) - 1, 4, 3, t % 2 ? BONE : BONE2); } }
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
    if (it.sk) { skull(cv, x, y, 1, hash(Math.round(x), 7, seed) < 0.1); continue; }
    const dx = Math.cos(it.a) * it.l, dy = Math.sin(it.a) * it.l * 0.5;
    const kind = hash(Math.round(x * 3), Math.round(y * 5), seed);
    if (kind < 0.06) { // 갈비 한 짝 (휘어진 살 넷)
      for (let r2 = 0; r2 < 4; r2++) { g.strokeStyle = r2 % 2 ? BONE2 : BONE; g.lineWidth = 1; g.beginPath(); g.arc(x, y + r2 * 2, 4 - r2 * 0.4, Math.PI * 1.05, Math.PI * 1.95); g.stroke(); }
      R(x - 0.5, y - 4, 1, 9, BONE3); continue;
    }
    line([x - dx, y - dy + 0.6], [x + dx, y + dy + 0.6], 2, BONE3); // 아래 그늘
    line([x - dx, y - dy], [x + dx, y + dy], 2, hash(Math.round(x), Math.round(y), seed) < 0.5 ? BONE2 : BONE);
    line([x - dx, y - dy - 0.6], [x + dx, y + dy - 0.6], 1, BONE);
    for (const sg of [-1, 1]) { R(x + sg * dx - 1.5, y + sg * dy - 1, 3, 2, BONE); R(x + sg * dx - 1.5, y + sg * dy + 1, 3, 1, BONE3); R(x + sg * dx - 0.5, y + sg * dy - 1, 1, 1, BONE2); } // 마디 (가운데 홈)
  }
  // 꼭대기: 뿔 달린 짐승 해골 하나와 큰 해골 (눈 속 불씨)
  { const [x, y] = P(ci - 0.5, cj + 0.3, Hm * 0.7); beastSkull(cv, x, y, 1.3, hash(1, 9, seed) < 0.5 ? 1 : -1); }
  { const [x, y] = P(ci, cj, Hm + 2); skull(cv, x, y, 2, theme === 'forge' || theme === 'ash'); }
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
  { const [x, y] = P(i0 + 0.45, j1 - 0.35, tz); R(x - 4, y - 5, 8, 5, '#5a3a22'); R(x - 4, y - 6, 8, 1, '#8a6a42'); R(x + 3, y - 5, 1, 5, '#3a2416'); R(x - 1, y - 12, 5, 6, '#9aa0a8'); R(x - 1, y - 12, 5, 1, '#d0d4da'); R(x + 3, y - 15, 1, 4, '#3a2416'); R(x - 2, y - 3, 3, 1, '#7a0a0a'); } // 도마 덩이에 박힌 큰 칼
  for (let k = 0; k < 5; k++) { const [x, y] = P(i0 + 0.2 + k * 0.18, j1 - 0.05, tz - 2); g.fillStyle = k % 2 ? '#8a3a2a' : '#7a2a1e'; g.beginPath(); g.ellipse(x, y + 1 + (k % 2), 2, 1.6, 0, 0, Math.PI * 2); g.fill(); } // 판 끝에 늘어뜨린 순대
  // 차양 기둥 넷
  const top = Hw;
  const jm = j0 + Math.max(0.6, d * 0.5); // 46차: 차양은 뒤 절반만 — 앞 가로대에 매단 고기와 도마 위가 보이게
  for (const [x, y] of [[i0, jm], [i1, jm], [i1, j0], [i0, j0]] as const) { const [sx, sy] = P(x, y, 0); R(sx - 1, sy - top, 2, top, x === i0 && y === j0 ? '#1e140c' : '#3a2618'); }
  // 누더기 차양 (구멍 난 천, 처진 가장자리)
  const ov = 0.12;
  const roof = [P(i0 - ov, j0 - ov, top + 2), P(i1 + ov, j0 - ov, top + 2), P(i1 + ov, jm + ov, top - 3), P(i0 - ov, jm + ov, top - 3)];
  poly(roof, cloth[0]);
  for (let k = 0; k < 14; k++) { const [x, y] = P(i0 + hash(k, 1, seed) * w, j0 + hash(k, 2, seed) * (jm - j0), top); R(x, y, 2 + Math.floor(hash(k, 7, seed) * 3), 1, k % 3 ? cloth[1] : '#2a1a10'); }
  for (let k = 0; k <= w * 6; k++) { const [x, y] = P(i0 - ov + k / 6, jm + ov, top - 3); R(x, y, 1, 2 + (k % 3) + (hash(k, 9, seed) < 0.2 ? 4 : 0), cloth[1]); }
  for (let k = 0; k <= (jm - j0) * 6; k++) { const [x, y] = P(i1 + ov, jm + ov - k / 6, top - 3); R(x, y, 1, 2 + (k % 2), shade(cloth[1], 0.8)); }
  // 가로대와 갈고리에 매단 고기 (뒤쪽 가로대)
  line(P(i0, jm, top - 4), P(i1, jm, top - 4), 2, '#2a1a10');
  for (let k = 0; k < Math.max(2, w * 2); k++) {
    const [x, y] = P(i0 + 0.25 + k * ((w - 0.5) / Math.max(1, w * 2 - 1)), jm, top - 4);
    R(x, y, 1, 4, '#8a8680');
    const big = hash(k, 3, seed) < 0.4;
    R(x - 1, y + 3, 3, 1, '#8a8680'); R(x + 1, y + 4, 1, 2, '#8a8680'); // 갈고리
    if (big) { // 갈비짝 (기름 · 갈비 마디 · 등뼈)
      g.fillStyle = '#7a1e18'; g.fillRect(Math.round(x) - 4, Math.round(y) + 5, 8, 16);
      R(x + 2, y + 5, 2, 16, '#5a1410'); R(x - 4, y + 5, 8, 2, '#e8d0b8');
      for (let r2 = 0; r2 < 5; r2++) { R(x - 4, y + 8 + r2 * 3, 7, 1, '#e8d8c0'); R(x + 2, y + 8 + r2 * 3, 1, 1, '#b8a890'); }
      R(x - 4, y + 5, 2, 16, '#a83a2a'); R(x - 3, y + 7, 1, 10, '#c84a3a');
    } else { // 넓적다리 (껍질 · 기름 · 뼈 끝)
      g.fillStyle = hash(k, 4, seed) < 0.5 ? '#8a2a22' : '#6a1a16'; g.beginPath(); g.ellipse(x + 0.5, y + 12, 3.5, 7, 0, 0, Math.PI * 2); g.fill();
      R(x - 2, y + 9, 2, 5, '#c84a3a'); R(x + 2, y + 9, 1, 6, '#4a0e0c'); R(x - 1, y + 7, 3, 1, '#e8d0b8'); R(x - 1, y + 5, 2, 3, '#e8d8c0'); R(x - 2, y + 4, 4, 1, '#f0e8d4');
    }
    if (hash(k, 5, seed) < 0.6) R(x, y + 20, 1, 3 + Math.floor(hash(k, 6, seed) * 5), '#5a0606'); // 떨어지는 핏방울
  }
  // 파리
  for (let k = 0; k < 8; k++) { const [x, y] = P(i0 + hash(k, 11, seed) * w, j0 + hash(k, 12, seed) * d, tz + 4 + hash(k, 13, seed) * 16); R(x, y, 1, 1, '#0a0606'); }
  finish();
  return { canvas: cv.c, x: cv.minX, y: cv.minY };
}

// ───────── 잡동사니 좌판: 궤짝 위 널판, 기운 천막, 쌓인 해골 잔·녹슨 쇠붙이·누더기·항아리 ─────────
// ───────── 31차: 장사마다 다른 좌판 — 물장수(나무 가판 · 물통) · 장사꾼(선반 달린 나무 가판 · 줄무늬 차양) · 넝마주이(리어카) · 약장수(보자기 씌운 탁자) · 무기상(나무 거치대) ─────────
function boxOn(cv: Cv, x0: number, y0: number, x1: number, y1: number, z0: number, z1: number, top: string, left: string, right: string) {
  const { P, poly } = cv;
  poly([P(x1, y0, z0), P(x1, y1, z0), P(x1, y1, z1), P(x1, y0, z1)], right);
  poly([P(x0, y1, z0), P(x1, y1, z0), P(x1, y1, z1), P(x0, y1, z1)], left);
  poly([P(x0, y0, z1), P(x1, y0, z1), P(x1, y1, z1), P(x0, y1, z1)], top);
}
const WOOD = ['#8a6440', '#6a4a2e', '#4e3420'] as const;
function plank(cv: Cv, x0: number, y0: number, x1: number, y1: number, z0: number, z1: number) {
  boxOn(cv, x0, y0, x1, y1, z0, z1, WOOD[0], WOOD[1], WOOD[2]);
  const { P, line } = cv;
  for (let z = z0 + 3; z < z1 - 1; z += 3) line(P(x0, y1, z), P(x1, y1, z), 1, '#3a2616'); // 널판 결
}
/** 46차 좌판 물건 하나 (화면 x, y = 물건 밑 가운데). 빛 · 그늘 · 테를 한 점씩 넣는다
 *  0 병 · 1 항아리 · 2 작은 궤짝 · 3 천 두루마리 · 4 자루 · 5 해골 잔과 초 · 6 노전 무더기 · 7 초 묶음 · 8 눈알 사발 · 9 말린 풀 · 10 구슬 꿰미 · 11 놋 등잔 · 12 쥐포(말린 박쥐) */
function ware(cv: Cv, x: number, y: number, t: number, c: string) {
  const { R, line } = cv;
  x = Math.round(x); y = Math.round(y);
  switch (t % 13) {
    case 0: R(x - 1, y - 6, 3, 6, c); R(x + 1, y - 6, 1, 6, shade(c, 0.65)); R(x - 1, y - 5, 1, 3, shade(c, 1.6)); R(x, y - 8, 1, 2, shade(c, 0.8)); R(x, y - 9, 1, 1, '#8a6a3a'); R(x - 1, y - 3, 3, 1, '#e8dcc0'); break;
    case 1: R(x - 3, y - 5, 6, 5, c); R(x - 2, y - 6, 4, 1, c); R(x + 1, y - 5, 2, 5, shade(c, 0.72)); R(x - 2, y - 4, 1, 2, shade(c, 1.35)); R(x - 2, y - 7, 4, 1, shade(c, 0.55)); R(x - 3, y - 3, 6, 1, '#c8a860'); break;
    case 2: R(x - 3, y - 4, 6, 4, '#7a5a3a'); R(x - 3, y - 5, 6, 1, '#9a7a52'); R(x + 2, y - 4, 1, 4, '#4e3420'); R(x - 1, y - 5, 1, 5, '#3a2616'); R(x - 3, y - 2, 5, 1, '#5a3e26'); break;
    case 3: R(x - 4, y - 3, 8, 3, c); R(x - 4, y - 3, 8, 1, shade(c, 1.3)); R(x - 2, y - 3, 1, 3, shade(c, 0.65)); R(x + 1, y - 3, 1, 3, shade(c, 0.65)); R(x + 4, y - 3, 1, 3, shade(c, 1.45)); R(x + 4, y - 2, 1, 1, shade(c, 0.5)); break;
    case 4: R(x - 3, y - 4, 6, 4, '#9a8a62'); R(x - 2, y - 5, 4, 1, '#9a8a62'); R(x + 1, y - 4, 2, 4, '#7a6a4a'); R(x - 1, y - 6, 2, 1, '#5a4a2a'); R(x - 1, y - 7, 2, 1, '#b8a87a'); R(x - 2, y - 3, 1, 1, '#b8a87a'); R(x + 3, y - 1, 1, 1, c); break;
    case 5: skull(cv, x, y - 3, 1); R(x, y - 8, 1, 3, '#e8dcc0'); R(x, y - 9, 1, 1, '#ffc24a'); break;
    case 6: R(x - 3, y - 2, 6, 2, '#a8822a'); R(x - 2, y - 3, 5, 1, '#c9a23e'); R(x - 1, y - 4, 3, 1, '#e8c86a'); R(x + 2, y - 1, 1, 1, '#6a4a12'); R(x - 3, y - 1, 1, 1, '#e8c86a'); break;
    case 7: for (const [dx, h] of [[-2, 3], [0, 5], [2, 4]]) { R(x + dx, y - h, 1, h, '#e8dcc0'); R(x + dx, y - h - 1, 1, 1, '#ffb04a'); } R(x - 2, y - 1, 5, 1, '#c8b896'); break;
    case 8: R(x - 3, y - 2, 6, 2, '#6a5a4a'); R(x - 2, y, 4, 1, '#4a3a2a'); for (const [dx, dy, iris] of [[-2, -4, '#3a6aa8'], [0, -4, '#a8281e'], [-1, -5, '#2a6a3a']] as const) { R(x + dx, y + dy, 2, 2, '#f0ece4'); R(x + dx + 1, y + dy + 1, 1, 1, iris); } break;
    case 9: line([x - 3, y], [x + 3, y - 3], 2, '#4a6a2a'); R(x - 1, y - 2, 2, 2, '#c8a860'); R(x + 2, y - 4, 2, 1, '#6a8a3a'); R(x + 3, y - 3, 1, 1, '#8aa84a'); break;
    case 10: for (let k = 0; k < 6; k++) R(x - 3 + k, y - 1 - Math.round(Math.sin((k / 5) * Math.PI) * 2), 1, 1, ['#c8281e', '#e8c86a', '#3a6aa8', '#e8e4dc', '#8a4a8a', '#4a8a4a'][k]); break;
    case 11: R(x - 1, y - 5, 3, 4, '#c9a23e'); R(x, y - 4, 1, 2, '#ffd07a'); R(x - 1, y - 6, 3, 1, '#8a6a1a'); R(x - 2, y - 1, 5, 1, '#8a6a1a'); R(x + 1, y - 5, 1, 4, '#a8822a'); break;
    default: R(x - 2, y - 3, 5, 2, '#5a4a40'); R(x - 3, y - 4, 2, 1, '#4a3a34'); R(x + 2, y - 4, 2, 1, '#4a3a34'); R(x - 1, y - 4, 1, 1, '#ff3a1a'); R(x + 1, y - 2, 1, 1, '#2a1e1a'); break;
  }
}
/** 처마 끈에 매단 것 (x, y = 끈 끝) — 0 박 바가지 · 1 말린 박쥐 · 2 마늘 꿰미 · 3 작은 해골 · 4 풀 다발 */
function hang(cv: Cv, x: number, y: number, t: number) {
  const { R } = cv;
  x = Math.round(x); y = Math.round(y);
  R(x, y, 1, 3, '#2a1a10');
  switch (t % 5) {
    case 0: R(x - 2, y + 3, 4, 4, '#c8a050'); R(x - 1, y + 2, 2, 1, '#a88038'); R(x + 1, y + 3, 1, 4, '#8a6a2a'); R(x - 1, y + 4, 1, 1, '#e8c878'); break;
    case 1: R(x - 1, y + 3, 2, 4, '#3a2e2a'); R(x - 4, y + 3, 3, 2, '#2a1e1a'); R(x + 1, y + 3, 3, 2, '#2a1e1a'); R(x - 4, y + 5, 1, 1, '#2a1e1a'); R(x + 3, y + 5, 1, 1, '#2a1e1a'); break;
    case 2: for (let k = 0; k < 3; k++) { R(x - 1, y + 3 + k * 2, 3, 2, '#e8e0cc'); R(x + 1, y + 3 + k * 2, 1, 2, '#c8b896'); } break;
    case 3: skull(cv, x, y + 5, 1); break;
    default: R(x - 1, y + 3, 3, 1, '#c8a860'); for (let k = -1; k <= 1; k++) R(x + k, y + 4, 1, 4 + (k & 1), k ? '#5a7a32' : '#6a8a3a'); break;
  }
}
/** 물장수: 나무 가판 위 항아리 · 뒤에 쇠테 두른 물통 둘 · 널빤지 지붕 · 물방울 간판 */
function stallWater(b: Building, cv: Cv) {
  const { g, P, R, line } = cv;
  const { i0, j0, w, d } = b, i1 = i0 + w, j1 = j0 + d;
  for (const [x, y] of [[i0 + 0.35, j0 + 0.35], [i1 - 0.35, j0 + 0.35]] as const) {
    const [cx, cy] = P(x, y, 0);
    R(cx - 7, cy - 22, 14, 22, '#6a4a2e'); R(cx - 7, cy - 22, 3, 22, '#4e3420'); R(cx + 4, cy - 22, 3, 22, '#7a5a3a');
    for (const z of [5, 16]) R(cx - 7, cy - z - 2, 14, 2, '#3a3a40');
    g.fillStyle = '#4e3420'; g.beginPath(); g.ellipse(cx, cy - 22, 7, 3, 0, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#2a4a4a'; g.beginPath(); g.ellipse(cx, cy - 22, 5.5, 2, 0, 0, Math.PI * 2); g.fill(); // 흐린 물
  }
  plank(cv, i0 + 0.05, j0 + 0.55, i1 - 0.05, j1 - 0.02, 0, 14);
  for (let k = 0; k < w * 2 + d; k++) {
    const [x, y] = P(i0 + 0.3 + (k / (w * 2 + d)) * (w - 0.5), j0 + 0.55 + (j1 - j0 - 0.6) / 2, 14);
    g.fillStyle = k % 2 ? '#8a4a2a' : '#7a3a22'; g.beginPath(); g.ellipse(x, y - 4, 3.5, 4.5, 0, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#5a2a16'; g.beginPath(); g.ellipse(x + 1, y - 3, 2.5, 3.5, 0, -Math.PI / 2, Math.PI / 2); g.fill(); // 그늘 반쪽
    R(x - 2, y - 9, 4, 2, '#5a2a16'); R(x - 1, y - 6, 1, 2, '#c88a5a'); R(x - 2, y - 2, 4, 1, '#6a3a1e'); R(x - 1, y - 10, 2, 1, '#2a4a4a'); // 빛 · 띠 · 물 비침
    if (k % 3 === 0) R(x + 3, y - 1, 2, 1, '#2a4a5a'); // 흘린 물
  }
  { const [x, y] = P(i1 - 0.25, j1 - 0.3, 14); line([x - 6, y - 1], [x + 2, y - 6], 1.5, '#a8a49c'); g.fillStyle = '#8a8680'; g.beginPath(); g.ellipse(x + 3, y - 6, 2.5, 1.5, 0, 0, Math.PI * 2); g.fill(); } // 국자
  // 뒤쪽 반만 덮는 널빤지 차양 (앞의 항아리가 보이게)
  const hb = b.h + 6, hf = b.h, jm = j0 + Math.min(0.55, d * 0.45);
  for (const [x, y, hh] of [[i0, j0, hb], [i1, j0, hb]] as const) { const [sx, sy] = P(x, y, 0); R(sx - 1, sy - hh, 2, hh, '#3a2616'); }
  for (let k = 0; k < 5; k++) { const a = i0 - 0.1 + (k / 5) * (w + 0.2), bb = a + (w + 0.2) / 5; cv.poly([P(a, j0 - 0.1, hb + 1), P(bb, j0 - 0.1, hb + 1), P(bb, jm, hf - 1), P(a, jm, hf - 1)], k % 2 ? '#6a4a2e' : '#5a3e26'); }
  for (let k = 0; k < Math.max(2, w * 2); k++) { const [x, y] = P(i0 + 0.25 + k * ((w - 0.5) / Math.max(1, w * 2 - 1)), jm, hf - 1); if (Math.abs(x - P(i0 + w / 2, jm, 0)[0]) > 8) hang(cv, x, y, k % 2 ? 0 : 4); } // 처마에 매단 박 바가지 · 풀
  { const [x, y] = P(i0 + w / 2, jm, hf - 1); R(x - 5, y, 1, 4, '#2a1a10'); R(x + 4, y, 1, 4, '#2a1a10'); R(x - 6, y + 4, 12, 9, '#7a5a3a'); R(x - 6, y + 4, 12, 1, '#9a7a52'); g.fillStyle = '#4a8aa8'; g.beginPath(); g.moveTo(x, y + 6); g.quadraticCurveTo(x + 3, y + 10, x, y + 11); g.quadraticCurveTo(x - 3, y + 10, x, y + 6); g.fill(); }
}
/** 장사꾼: 나무 진열대(병 · 궤짝 · 천 두루마리) · 한쪽 끝에 선반 달린 높은 나무 가판 · 바랜 줄무늬 차양 (장사꾼은 진열대 뒤에 선다) */
function stallTrader(b: Building, cv: Cv) {
  const { P, R } = cv;
  const { i0, j0, w, d } = b, i1 = i0 + w, j1 = j0 + d;
  const long = w >= d;
  const goods = ['#c9a23e', '#3a5a7a', '#8a2a22', '#e8dcc0', '#4a6a3a', '#7a4a8a'];
  // 끝의 높은 선반 (긴 쪽의 오른쪽 끝 · 세로 좌판은 뒤쪽 끝)
  const sx0 = long ? i1 - 0.4 : i0, sy0 = j0, sx1 = i1, sy1 = long ? j1 : j0 + 0.4;
  boxOn(cv, sx0, sy0, sx1, sy1, 0, 34, WOOD[1], WOOD[2], '#3a2616');
  for (const z of [11, 21, 31]) {
    for (let k = 0; k < 3; k++) {
      const t = (k + 0.5) / 3;
      const [x, y] = long ? P(sx0, sy0 + t * (sy1 - sy0), z) : P(sx0 + t * (sx1 - sx0), sy1, z);
      const c = goods[(k * 3 + z) % goods.length];
      ware(cv, x, y, [0, 1, 11, 7, 0, 10, 1, 6, 0][(k * 3 + z) % 9], c);
    }
    cv.poly(long ? [P(sx0, sy0, z), P(sx0, sy1, z), P(sx0, sy1, z - 1.5), P(sx0, sy0, z - 1.5)] : [P(sx0, sy1, z), P(sx1, sy1, z), P(sx1, sy1, z - 1.5), P(sx0, sy1, z - 1.5)], '#a87a4e');
  }
  // 진열대
  const cx1 = long ? sx0 - 0.05 : i1 - 0.05, cy0 = long ? j0 + 0.15 : sy1 + 0.05;
  plank(cv, i0 + 0.05, cy0, cx1, j1 - 0.05, 0, 12);
  for (let k = 0; k < 14; k++) {
    const u = hash(k, 7, i0), v = hash(k, 8, j0);
    const [x, y] = P(i0 + 0.2 + u * (cx1 - i0 - 0.35), cy0 + 0.15 + v * (j1 - cy0 - 0.3), 12);
    const c = goods[k % goods.length];
    ware(cv, x, y, [3, 0, 2, 4, 6, 8, 3, 1, 9, 10, 5, 12][k % 12], c);
  }
  const hb = b.h + 6, hf = b.h - 2, jm = j0 + Math.max(0.5, d * 0.45); // 46차: 차양은 뒤 절반만 (진열대 위 물건이 보이게)
  for (const [x, y, hh] of [[i0, jm, hf], [i1, jm, hf], [i0, j0, hb]] as const) { const [px, py] = P(x, y, 0); R(px - 1, py - hh, 2, hh, '#3a2616'); }
  const nS = 6;
  for (let k = 0; k < nS; k++) { const a = i0 - 0.1 + (k / nS) * (w + 0.2), bb = a + (w + 0.2) / nS; cv.poly([P(a, j0 - 0.05, hb), P(bb, j0 - 0.05, hb), P(bb, jm + 0.1, hf - 1), P(a, jm + 0.1, hf - 1)], k % 2 ? '#8a2a22' : '#c8b896'); }
  for (let k = 0; k <= (w + 0.2) * 6; k++) { const [x, y] = P(i0 - 0.1 + k / 6, jm + 0.1, hf - 1); R(x, y, 2, 2 + (k % 2), k % 2 ? '#8a2a22' : '#c8b896'); }
  for (let k = 0; k < w * 2 - 1; k++) { const [x, y] = P(i0 + 0.4 + k * 0.5, jm + 0.08, hf - 3); hang(cv, x, y, [2, 1, 4, 0][k % 4]); } // 차양 끝에 매단 마늘 꿰미 · 말린 박쥐 · 풀 다발
}
/** 넝마주이: 리어카 — 큰 바퀴 둘 · 앞으로 뻗은 손잡이 · 짐칸에 수북한 고물(녹슨 쇠 · 뼈 · 누더기 · 부러진 우산 · 깡통) */
function stallCart(b: Building, cv: Cv) {
  const { g, P, R, line } = cv;
  const { i0, j0, w, d } = b, i1 = i0 + w, j1 = j0 + d;
  const long = w >= d;
  const x0 = i0 + 0.1, y0 = j0 + 0.15, x1 = i1 - (long ? 0.45 : 0.15), y1 = j1 - (long ? 0.15 : 0.45);
  // 손잡이 (짐칸 끝에서 땅으로)
  for (const off of [0.15, 0.75]) {
    if (long) line(P(x1, y0 + off * (y1 - y0) + 0.05, 12), P(i1 + 0.1, y0 + off * (y1 - y0) + 0.05, 3), 2, '#5a4028');
    else line(P(x0 + off * (x1 - x0) + 0.05, y1, 12), P(x0 + off * (x1 - x0) + 0.05, j1 + 0.1, 3), 2, '#5a4028');
  }
  // 고물 더미 (짐칸 위로 봉긋)
  const junk = ['#6a6660', '#8a4a2a', '#5a5448', '#7a6a4a', '#3a3a40', '#9a8a62', '#a83a22'];
  for (let k = 0; k < 26; k++) {
    const u = hash(k, 1, i0), v = hash(k, 2, j0), hgt = 14 + (1 - Math.abs(u - 0.5) * 2) * (1 - Math.abs(v - 0.5) * 2) * 16;
    const [x, y] = P(x0 + 0.1 + u * (x1 - x0 - 0.2), y0 + 0.1 + v * (y1 - y0 - 0.2), hgt);
    const c = junk[Math.floor(hash(k, 3, i0 + j0) * junk.length)];
    const t = k % 6;
    if (t === 0) skull(cv, x, y - 2, 1);
    else if (t === 1) line([x - 5, y], [x + 4, y - 4], 1.5, '#7a7670');
    else if (t === 2) { g.strokeStyle = '#3a3a40'; g.lineWidth = 1; g.beginPath(); g.arc(x, y - 3, 4, 0, Math.PI * 2); g.stroke(); } // 바퀴테
    else if (t === 3) { R(x - 2, y - 5, 4, 5, '#8a8680'); R(x - 2, y - 5, 4, 1, '#aaa6a0'); } // 깡통
    else { g.fillStyle = c; g.beginPath(); g.ellipse(x, y - 2, 4 + (k % 3), 2.5, 0, 0, Math.PI * 2); g.fill(); }
  }
  { const [x, y] = P(x0 + 0.3, y0 + 0.3, 28); line([x, y], [x + 7, y - 9], 1, '#2a2a2e'); g.fillStyle = '#1e1e24'; g.beginPath(); g.moveTo(x + 7, y - 9); g.lineTo(x + 1, y - 13); g.lineTo(x + 13, y - 11); g.fill(); } // 부러진 우산
  // 짐칸 옆판 (앞 · 오른쪽)
  boxOn(cv, x0, y0, x1, y1, 8, 15, '#00000000', WOOD[1], WOOD[2]);
  cv.poly([P(x0, y1, 15), P(x1, y1, 15), P(x1, y1, 14), P(x0, y1, 14)], WOOD[0]);
  // 바퀴 (보이는 쪽)
  const [wx, wy] = long ? P(x0 + (x1 - x0) / 2, y1 + 0.02, 8) : P(x1 + 0.02, y0 + (y1 - y0) / 2, 8);
  g.fillStyle = '#1e1a16'; g.beginPath(); g.ellipse(wx, wy, 9, 9, 0, 0, Math.PI * 2); g.fill();
  g.fillStyle = '#3a3430'; g.beginPath(); g.ellipse(wx, wy, 6.5, 6.5, 0, 0, Math.PI * 2); g.fill();
  for (let k = 0; k < 6; k++) { const a = (k / 6) * Math.PI * 2; line([wx, wy], [wx + Math.cos(a) * 6, wy + Math.sin(a) * 6], 1, '#6a6660'); }
  R(wx - 1, wy - 1, 3, 3, '#8a8680');
}
/** 약장수: 쪽빛 보자기(흰 매듭 무늬 · 붉은 테)를 씌운 탁자 — 약병 · 말린 풀 묶음 · 약사발 · 보자기에 싼 약첩 */
function stallCloth(b: Building, cv: Cv) {
  const { g, P, R, line, poly } = cv;
  const { i0, j0, w, d } = b, i1 = i0 + w, j1 = j0 + d;
  const tz = 14, x0 = i0 + 0.08, y0 = j0 + 0.2, x1 = i1 - 0.08, y1 = j1 - 0.05;
  const BLUE = '#26345e', BLUE_D = '#1a2444', BLUE_L = '#34467a';
  poly([P(x1, y0, 2), P(x1, y1, 2), P(x1, y1, tz), P(x1, y0, tz)], BLUE_D);
  poly([P(x0, y1, 2), P(x1, y1, 2), P(x1, y1, tz), P(x0, y1, tz)], BLUE);
  poly([P(x0, y0, tz), P(x1, y0, tz), P(x1, y1, tz), P(x0, y1, tz)], BLUE_L);
  // 늘어진 단의 붉은 테 · 흰 매듭 무늬 · 모서리 매듭
  poly([P(x0, y1, 2), P(x1, y1, 2), P(x1, y1, 4), P(x0, y1, 4)], '#a8281e');
  poly([P(x1, y0, 2), P(x1, y1, 2), P(x1, y1, 4), P(x1, y0, 4)], '#7a1a14');
  for (let k = 0; k < (x1 - x0) * 4; k++) { const [x, y] = P(x0 + 0.15 + k * 0.25, y1, 9); R(x - 1, y - 1, 3, 1, '#e8e4dc'); R(x, y - 2, 1, 3, '#e8e4dc'); }
  for (const [x, y] of [[x0, y1], [x1, y1]] as const) { const [cx, cy] = P(x, y, 3); g.fillStyle = BLUE_D; g.beginPath(); g.ellipse(cx, cy + 1, 3, 2, 0, 0, Math.PI * 2); g.fill(); R(cx - 1, cy + 2, 2, 3, BLUE_D); }
  // 위에 늘어놓은 약
  const liq = ['#6a9a3a', '#a8281e', '#c9a23e', '#5a7aa8', '#8a4a8a'];
  for (let k = 0; k < Math.round((x1 - x0) * (y1 - y0) * 9); k++) {
    const u = hash(k, 5, i0), v = hash(k, 6, j0);
    const [x, y] = P(x0 + 0.15 + u * (x1 - x0 - 0.3), y0 + 0.15 + v * (y1 - y0 - 0.3), tz);
    const t = k % 6;
    if (t === 0 || t === 4) ware(cv, x, y, 0, liq[k % liq.length]); // 약병
    else if (t === 1) ware(cv, x, y, 9, '#4a6a2a'); // 말린 풀
    else if (t === 2) { g.fillStyle = '#8a8274'; g.beginPath(); g.ellipse(x, y - 1, 4, 2, 0, 0, Math.PI * 2); g.fill(); R(x - 2, y - 2, 4, 1, '#3a5a2a'); line([x + 1, y - 2], [x + 4, y - 6], 1, '#6a6458'); } // 약사발 (빻은 풀)
    else if (t === 5) ware(cv, x, y, 8, '#6a5a4a'); // 눈알 사발
    else { R(x - 3, y - 3, 6, 3, '#c8a860'); R(x - 3, y - 3, 6, 1, '#e0c480'); R(x - 1, y - 5, 2, 2, '#a8281e'); R(x + 2, y - 3, 1, 3, '#a8904a'); } // 약첩
  }
}
/** 무기상: 낮은 나무 진열대(화살 묶음 · 쇠뇌) · 한쪽 끝에 나무 거치대(걸어 둔 활 · 기대 놓은 창 · 화살통) */
function stallArms(b: Building, cv: Cv) {
  const { g, P, R, line } = cv;
  const { i0, j0, w, d } = b, i1 = i0 + w, j1 = j0 + d;
  const long = w >= d;
  // 진열대
  plank(cv, i0 + 0.05, j0 + 0.15, i1 - 0.05, j1 - 0.05, 0, 9);
  const L = long ? w : d;
  for (let k = 0; k < L + 1; k++) { const t = (k + 0.5) / (L + 1); const [x, y] = long ? P(i0 + 0.2 + t * (w - 0.6), j0 + 0.5, 9) : P(i0 + 0.5, j0 + 0.2 + t * (d - 0.6), 9); for (let n = 0; n < 4; n++) line([x - 5, y - n], [x + 5, y - 2 - n], 1, '#c8b48a'); R(x - 1, y - 4, 2, 4, '#3a2616'); } // 화살 묶음
  { const [x, y] = P(i1 - 0.35, j1 - 0.3, 9); line([x - 6, y - 2], [x + 4, y - 4], 2, '#4e3420'); line([x - 2, y - 7], [x + 1, y + 2], 1.5, '#8a8680'); } // 쇠뇌
  { const [x, y] = P(i0 + (long ? w * 0.55 : 0.6), j1 - (long ? 0.3 : d * 0.45), 9); R(x - 3, y - 4, 6, 4, '#6a6e76'); R(x - 2, y - 5, 4, 1, '#8a8e96'); R(x - 3, y - 2, 6, 1, '#3a3e46'); R(x - 1, y - 3, 1, 1, '#1a1a1e'); R(x + 1, y - 3, 1, 1, '#1a1a1e'); R(x + 2, y - 4, 1, 2, '#a8acb4'); } // 녹슨 투구
  { const [x, y] = P(i0 + (long ? w * 0.3 : 0.45), j1 - (long ? 0.25 : d * 0.7), 9); line([x - 6, y], [x + 5, y - 3], 1.5, '#b8bec6'); R(x - 8, y, 3, 1, '#5a3a22'); R(x - 6, y - 2, 1, 4, '#8a6a2a'); R(x + 3, y - 3, 1, 1, '#e8ecf0'); } // 칼 한 자루
  // 끝의 거치대 (긴 좌판은 왼쪽 끝을 가로질러 · 세로 좌판은 뒤쪽 끝)
  const A = long ? P(i0 + 0.12, j0 + 0.05, 0) : P(i0 + 0.05, j0 + 0.12, 0), B = long ? P(i0 + 0.12, j1 - 0.05, 0) : P(i1 - 0.05, j0 + 0.12, 0);
  const up = (p: number[], z: number) => [p[0], p[1] - z] as [number, number];
  for (const p of [A, B]) line(up(p, 0), up(p, 44), 2, '#4e3420');
  for (const z of [40, 26]) line(up(A, z), up(B, z), 2, '#6a4a2e');
  for (let k = 0; k < 4; k++) {
    const t = 0.15 + k * 0.24, x = A[0] + (B[0] - A[0]) * t, y = A[1] + (B[1] - A[1]) * t;
    if (k % 2 === 0) { g.strokeStyle = '#7a5a32'; g.lineWidth = 2; g.beginPath(); g.arc(x - 2, y - 30, 9, -Math.PI / 2.2, Math.PI / 2.2); g.stroke(); line([x - 2, y - 38], [x - 2, y - 22], 1, '#d8d0c0'); }
    else { line([x, y], [x + 3, y - 50], 1.5, '#5a4028'); g.fillStyle = '#a8aeb6'; g.beginPath(); g.moveTo(x + 3, y - 56); g.lineTo(x + 1, y - 49); g.lineTo(x + 5, y - 49); g.fill(); }
  }
  { const x = B[0], y = B[1]; R(x - 3, y - 20, 5, 13, '#5a3a22'); for (let k = 0; k < 3; k++) R(x - 2 + k * 1.5, y - 23, 1, 4, k === 1 ? '#c8281e' : '#e8e0d0'); } // 화살통
}

function stall(b: Building, theme: Theme) {
  // 31차: 장사꾼이 정해진 좌판은 그 장사의 모양으로
  if (b.vend === 'water' || b.vend === 'trader' || b.vend === 'junk' || b.vend === 'medic' || b.vend === 'arms') {
    const cv = canvasFor(b, b.h + 26, 16);
    if (b.vend === 'water') stallWater(b, cv);
    else if (b.vend === 'trader') stallTrader(b, cv);
    else if (b.vend === 'junk') stallCart(b, cv);
    else if (b.vend === 'medic') stallCloth(b, cv);
    else stallArms(b, cv);
    cv.finish();
    return { canvas: cv.c, x: cv.minX, y: cv.minY };
  }
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
    if (t === 2) { line([x - 4, y - 1], [x + 4, y - 3], 1.5, '#7a7670'); R(x - 1, y - 3, 2, 1, '#8a4a2a'); } // 녹슨 쇠 (녹 자국)
    else ware(cv, x, y, [5, 1, 0, 3, 7, 4, 6, 12][(t + k) % 8], c);
  }
  // 기운 천막: 뒤쪽 기둥 둘이 높고 앞은 낮다, 천은 기운 조각
  const hb = Hw, hf = Hw - 4, jm = j0 + Math.max(0.5, d * 0.45); // 46차: 기운 천막은 뒤 절반만 (널판 위 물건이 보이게)
  for (const [x, y, hh] of [[i0, j0, hb], [i1, j0, hb], [i0, jm, hf], [i1, jm, hf]] as const) { const [sx, sy] = P(x, y, 0); R(sx - 1, sy - hh, 2, hh, '#2e2014'); }
  const ov = 0.15;
  const nP = 4;
  for (let k = 0; k < nP; k++) {
    const a = i0 - ov + (k / nP) * (w + 2 * ov), bb = a + (w + 2 * ov) / nP;
    poly([P(a, j0 - ov, hb + 1), P(bb, j0 - ov, hb + 1), P(bb, jm + ov, hf - 2), P(a, jm + ov, hf - 2)], cloth[Math.floor(hash(k, 4, seed) * 3)]);
    const [sx, sy] = P(a + 0.1, j0 + 0.2, hb - 2); R(sx, sy, 3, 2, shade(cloth[Math.floor(hash(k, 4, seed) * 3)], 0.7)); // 기운 자국
  }
  for (let k = 0; k <= (w + 2 * ov) * 5; k++) { const [x, y] = P(i0 - ov + k / 5, jm + ov, hf - 2); R(x, y, 1, 1 + (k % 3), cloth[1]); }
  // 끈에 매단 물건 (앞 처마)
  for (let k = 0; k < w * 2; k++) { const [x, y] = P(i0 + 0.3 + k * 0.5, jm + ov * 0.6, hf - 2); hang(cv, x, y, [3, 1, 0, 2][k % 4]); }
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

/** 굴뚝 꼭대기 (불꽃을 올릴 자리): 건물 바닥 칸 좌표와 높이 */
export function smithyChimney(b: Building): [number, number, number] { return [b.i0 + b.w * 0.78, b.j0 + 0.32, b.h + 50]; }
/**
 * 34차 4층 칼드렉의 대장간: 낡고 그을린 대장간 — 아래는 검게 탄 돌, 위는 숯이 된 널빤지, 내려앉은 슬레이트 지붕(구멍 숭숭).
 * 왼쪽 앞면에 크게 벌어진 화덕 아가리(안에서 숯불이 붉다), 오른쪽 면엔 붉은 빛이 새는 덧문과 걸린 집게·망치,
 * 뒤 모서리엔 벽돌 굴뚝(꼭대기에서 붉은 불꽃이 솟는다 — 불꽃은 장면이 따로 움직인다), 앞엔 담금질 통·쇠막대 더미·숫돌, 망치 간판
 */
function smithy(b: Building) {
  const Hw = b.h;
  const top = Hw + 64;
  const cv = canvasFor(b, top, 14);
  const { g, P, poly, R, line, finish } = cv;
  const { i0, j0, w, d } = b, i1 = i0 + w, j1 = j0 + d;
  const seed = i0 * 37 + j0 * 11;
  const LW = w * (TW / 2), RWd = d * (TW / 2);
  const stoneH = 18;
  const mouth = (u: number, z: number) => u > LW * 0.28 && u < LW * 0.74 && z < 30 - Math.pow((u - LW * 0.51) / (LW * 0.23), 2) * 8;
  const shutter = (u: number, z: number) => u > RWd * 0.3 && u < RWd * 0.66 && z > 24 && z < 40;
  walls(cv, b, Hw - 8, (face, u, z) => {
    if (face === 0 && mouth(u, z)) {
      // 화덕 아가리 안: 아래는 숯불, 위로 갈수록 검다
      if (z < 5) return hash(u, z, seed) < 0.4 ? '#ffd26a' : '#ff6a1a';
      if (z < 10) return hash(u >> 1, z, seed) < 0.5 ? '#c8320e' : '#7a1a0a';
      return shade('#1a0c08', 0.8 + hash(u, z >> 2, seed) * 0.3);
    }
    if (face === 1 && shutter(u, z)) return (u % 4 === 0 || z % 5 === 0) ? '#1a0e0a' : (hash(u, z, seed) < 0.5 ? '#c8401a' : '#8a2410');
    if (z < stoneH) {
      const row = Math.floor(z / 6), off = row % 2 ? 5 : 0;
      if (z % 6 === 0 || (u + off) % 10 === 0) return '#120e0c';
      return shade(face ? '#2e2a28' : '#3a3532', 0.7 + hash((u + off) >> 3, row, seed + face) * 0.4);
    }
    if (u % 6 === 0) return '#120c08'; // 널빤지 틈
    let c = shade(face ? '#241a12' : '#2e2216', 0.65 + hash(u >> 1, z >> 3, seed + 9 + face) * 0.45);
    if (hash(u, z >> 1, seed + 4) < 0.012) c = '#ff5a1a'; // 숯이 된 나무 속 불씨
    return c;
  });
  // 화덕 아가리 위 돌 아치 테두리와 그을음
  for (let k = 0; k < LW; k++) { const z = 30 - Math.pow((k - LW * 0.51) / (LW * 0.23), 2) * 8; if (k > LW * 0.26 && k < LW * 0.76) { const [sx, sy] = P(i0 + k / (TW / 2), j1, z); R(sx, sy - 3, 1, 3, '#5a524c'); R(sx, sy - 9, 1, 6, 'rgba(10,6,4,0.55)'); } }
  // 내려앉은 슬레이트 외쪽 지붕 (앞이 낮고 뒤가 높다, 구멍 몇)
  const zf = Hw - 8, zb = Hw + 10;
  poly([P(i0 - 0.15, j1 + 0.15, zf), P(i1 + 0.15, j1 + 0.15, zf - 3), P(i1 + 0.15, j0 - 0.1, zb - 2), P(i0 - 0.15, j0 - 0.1, zb)], '#2a2624');
  poly([P(i1 + 0.15, j1 + 0.15, zf - 3), P(i1 + 0.15, j0 - 0.1, zb - 2), P(i1 + 0.15, j0 - 0.1, zb - 6), P(i1 + 0.15, j1 + 0.15, zf - 7)], '#1a1716');
  poly([P(i0 - 0.15, j1 + 0.15, zf), P(i1 + 0.15, j1 + 0.15, zf - 3), P(i1 + 0.15, j1 + 0.15, zf - 7), P(i0 - 0.15, j1 + 0.15, zf - 4)], '#141211');
  for (let r = 1; r < 6; r++) { const t2 = r / 6; line(P(i0 - 0.15, j1 + 0.15 - (d + 0.25) * t2, zf + (zb - zf) * t2), P(i1 + 0.15, j1 + 0.15 - (d + 0.25) * t2, zf - 3 + (zb - 2 - zf + 3) * t2), 1, '#3a3532'); }
  for (let k = 0; k < 4; k++) { const [hx, hy] = P(i0 + 0.3 + hash(k, 1, seed) * (w - 0.6), j0 + 0.3 + hash(k, 2, seed) * (d - 0.6), zf + (zb - zf) * 0.5); R(hx - 2, hy - 1, 4 + (k % 2) * 2, 2, '#0a0706'); }
  // 벽돌 굴뚝 (뒤 모서리) — 위로 갈수록 그을린다
  const [cxw, cyw, czt] = smithyChimney(b);
  const c0 = cxw - 0.18, c1 = cxw + 0.18, e0 = cyw - 0.18, e1 = cyw + 0.18;
  for (let z = zb - 8; z < czt; z += 1) {
    const soot = (z - zb) / (czt - zb);
    const brick = (u: number) => (Math.floor(z / 4) % 2 ? u % 6 === 0 : (u + 3) % 6 === 0) || z % 4 === 0;
    for (let u = 0; u < 12; u++) { const [sx, sy] = P(c0 + (u / 12) * 0.36, e1, z); R(sx, sy, 1, 1, brick(u) ? '#1a0c0a' : shade('#6a2a1e', 1 - soot * 0.65 + hash(u >> 1, z >> 2, seed) * 0.15)); }
    for (let u = 0; u < 12; u++) { const [sx, sy] = P(c1, e1 - (u / 12) * 0.36, z); R(sx, sy, 1, 1, brick(u) ? '#120806' : shade('#4a1e16', 1 - soot * 0.65 + hash(u >> 1, z >> 2, seed + 5) * 0.15)); }
  }
  poly([P(c0 - 0.05, e0 - 0.05, czt), P(c1 + 0.05, e0 - 0.05, czt), P(c1 + 0.05, e1 + 0.05, czt), P(c0 - 0.05, e1 + 0.05, czt)], '#2a2422');
  poly([P(c0 + 0.05, e0 + 0.05, czt + 0.5), P(c1 - 0.05, e0 + 0.05, czt + 0.5), P(c1 - 0.05, e1 - 0.05, czt + 0.5), P(c0 + 0.05, e1 - 0.05, czt + 0.5)], '#ff4a1a');
  // 오른쪽 면: 걸린 집게 · 망치 둘
  for (let k = 0; k < 3; k++) { const [tx, ty] = P(i1, j1 - 0.25 - k * 0.22, 40); line([tx, ty], [tx + (k - 1) * 0.5, ty + 14], 1.5, k === 1 ? '#7a6e64' : '#4a3a2a'); R(tx - 2 + (k - 1) * 0.5, ty + 12, 5, 3, '#5a524c'); }
  // 망치 간판 (지붕 앞 모서리에 쇠사슬로)
  { const [ax, ay] = P(i0 + 0.15, j1 + 0.15, zf - 2); line([ax, ay], [ax - 2, ay + 8], 1, '#5a5652'); line([ax + 12, ay - 2], [ax + 12, ay + 7], 1, '#5a5652'); R(ax - 6, ay + 8, 22, 12, '#4a3020'); R(ax - 5, ay + 9, 20, 10, '#3a2416'); R(ax - 1, ay + 11, 9, 3, '#8a8078'); R(ax + 3, ay + 14, 2, 4, '#6a4a2a'); }
  // 앞: 담금질 통 · 쇠막대 더미 · 숫돌 바퀴 · 바닥의 재와 불티
  { const [bx, by] = P(i0 + 0.2, j1 + 0.45, 0); g.fillStyle = '#2a1a10'; g.fillRect(Math.round(bx) - 7, Math.round(by) - 12, 14, 12); g.fillStyle = '#4a3020'; g.fillRect(Math.round(bx) - 7, Math.round(by) - 12, 14, 2); g.fillStyle = '#1a2a2a'; g.fillRect(Math.round(bx) - 6, Math.round(by) - 12, 12, 2); g.fillStyle = '#7a6e64'; g.fillRect(Math.round(bx) - 7, Math.round(by) - 7, 14, 1); }
  for (let k = 0; k < 6; k++) { const [sx, sy] = P(i1 - 0.2, j1 + 0.15 + k * 0.05, 1 + k); line([sx - 8, sy], [sx + 6, sy - 3], 1.5, k % 2 ? '#5a524c' : '#3a3634'); }
  { const [gx, gy] = P(i1 + 0.35, j1 - 0.6, 10); g.fillStyle = '#6a625a'; g.beginPath(); g.ellipse(gx, gy, 4, 8, 0, 0, Math.PI * 2); g.fill(); g.fillStyle = '#3a3634'; g.fillRect(Math.round(gx) - 1, Math.round(gy) - 1, 2, 2); g.fillStyle = '#2a1a10'; g.fillRect(Math.round(gx) - 1, Math.round(gy) + 6, 2, 6); }
  for (let k = 0; k < 16; k++) { const [x, y] = P(i0 + hash(k, 21, seed) * w, j1 + 0.05 + hash(k, 22, seed) * 0.5, 0); R(x, y - 1, 1, 1, hash(k, 23) < 0.35 ? '#ff7a2a' : '#3a3634'); }
  finish();
  return { canvas: cv.c, x: cv.minX, y: cv.minY };
}

export function drawHellBuild(b: Building, kind: HellBuildKind, theme: Theme): { canvas: HTMLCanvasElement; x: number; y: number } {
  if (kind === 'smithy') return smithy(b);
  if (kind === 'maskhouse') return maskHouse(b);
  if (kind === 'puppetshop') return puppetShop(b);
  if (kind === 'mineshaft') return mineShaft(b);
  if (kind === 'puppetidol') return puppetIdol(b);
  if (kind === 'idol') return theme === 'ash' ? demonIdol(b) : theme === 'swamp' ? hungryMaw(b) : theme === 'forge' ? greatAnvil(b) : theme === 'mask' ? maskIdol(b) : bloodScale(b);
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


// ───────── 43차 5층 가면의 도시 ─────────
/** 안과 밖이 다른 집: 길 쪽(왼쪽 앞면)은 흰 회벽에 꽃 상자와 웃는 가면을 단 말끔한 얼굴, 옆면(오른쪽)은 썩어 갈라진 돌과 핏물 얼룩·뜯긴 판자 */
function maskHouse(b: Building) {
  const Hw = b.h;
  const top = Hw + 34;
  const cv = canvasFor(b, top, 12);
  const { P, poly, R, line, finish } = cv;
  const { i0, j0, w, d } = b, i1 = i0 + w, j1 = j0 + d;
  const seed = i0 * 41 + j0 * 13;
  const LW = w * (TW / 2), RWd = d * (TW / 2);
  const win = (u: number, z: number, L: number) => { const n = Math.max(1, Math.round(L / 22)); const cell = L / n; const uu = u % cell; return uu > cell * 0.3 && uu < cell * 0.7 && ((z > 14 && z < 28) || (z > Hw * 0.55 && z < Hw * 0.55 + 14)); };
  walls(cv, b, Hw, (face, u, z) => {
    if (face === 0) {
      // 말끔한 얼굴: 흰 회벽 · 검은 창틀의 창 (안은 따뜻한 빛) · 바닥 띠 · 처마 아래 붉은 줄
      if (z > Hw - 4) return '#a82a3a';
      if (z < 5) return '#5a5650';
      if (win(u, z, LW)) { const n = Math.max(1, Math.round(LW / 22)), cell = LW / n, uu = u % cell; return (Math.abs(uu - cell / 2) < 1 || z === 21 || z === Math.round(Hw * 0.55 + 7)) ? '#141216' : '#e8c878'; }
      return shade('#ece6da', 0.92 + hash(u >> 2, z >> 2, seed) * 0.08);
    }
    // 썩은 옆면: 갈라진 검은 돌 · 핏물 자국 · 뜯긴 판자 사이로 어둠
    if (hash(u >> 2, z >> 3, seed + 7) < 0.12) return '#08060a';
    const row = Math.floor(z / 7), off = row % 2 ? 4 : 0;
    if (z % 7 === 0 || (u + off) % 9 === 0) return '#141018';
    let c = shade('#3a3440', 0.6 + hash((u + off) >> 3, row, seed + 3) * 0.4);
    if (hash(u, z >> 1, seed + 11) < 0.05 && z > 10) c = '#5a0e14';
    return c;
  });
  // 썩은 면의 흘러내린 핏물 줄기 몇
  for (let k = 0; k < 4; k++) { const [sx, sy] = P(i1, j1 - 0.3 - k * (d - 0.6) / 3, Hw - 6 - (k % 2) * 10); R(sx, sy, 1, 10 + (k * 7) % 14, '#6a0a12'); }
  // 말끔한 면의 꽃 상자 (창 아래) · 문 위의 웃는 가면
  const n = Math.max(1, Math.round(LW / 22));
  for (let q = 0; q < n; q++) { const [fx, fy] = P(i0 + ((q + 0.5) / n) * w, j1, 13); R(fx - 5, fy, 10, 3, '#5a3a22'); for (let k = 0; k < 5; k++) R(fx - 4 + k * 2, fy - 2, 1, 2, k % 2 ? '#e85a7a' : '#f2d27a'); }
  { const [mx, my] = P(i0 + w * 0.5, j1, Hw * 0.42); R(mx - 5, my - 6, 10, 11, '#f2eee6'); R(mx - 3, my - 3, 2, 1, '#141014'); R(mx + 2, my - 3, 2, 1, '#141014'); for (let k = 0; k < 6; k++) R(mx - 3 + k, my + 2 + (k === 0 || k === 5 ? -1 : 0), 1, 1, '#b8283a'); }
  // 지붕: 말끔한 검푸른 기와 (앞쪽 반) · 뒤쪽은 내려앉아 구멍
  const zr = Hw, zt = Hw + 22;
  poly([P(i0 - 0.15, j1 + 0.15, zr), P(i1 + 0.15, j1 + 0.15, zr), P(i1 + 0.15, (j0 + j1) / 2, zt), P(i0 - 0.15, (j0 + j1) / 2, zt)], '#2a3048');
  poly([P(i0 - 0.15, (j0 + j1) / 2, zt), P(i1 + 0.15, (j0 + j1) / 2, zt), P(i1 + 0.15, j0 - 0.15, zr), P(i0 - 0.15, j0 - 0.15, zr)], '#1a1a24');
  poly([P(i1 + 0.15, j1 + 0.15, zr), P(i1 + 0.15, (j0 + j1) / 2, zt), P(i1 + 0.15, j0 - 0.15, zr)], '#1e1a22');
  for (let r = 1; r < 5; r++) { const t2 = r / 5; line(P(i0 - 0.15, j1 + 0.15 - (d / 2 + 0.15) * t2, zr + (zt - zr) * t2), P(i1 + 0.15, j1 + 0.15 - (d / 2 + 0.15) * t2, zr + (zt - zr) * t2), 1, '#3a4260'); }
  for (let k = 0; k < 3; k++) { const [hx, hy] = P(i1 - 0.2 - hash(k, 1, seed) * 0.6, j0 + 0.3 + hash(k, 2, seed) * (d / 2 - 0.4), zr + 8); R(hx - 2, hy - 1, 4, 2, '#0a0810'); }
  finish();
  return { canvas: cv.c, x: cv.minX, y: cv.minY };
}
/** 5층 한가운데의 큰 가면 조형물: 두 단 흰 돌 받침 위에 선 거대한 가면 — 왼쪽 반은 웃고 오른쪽 반은 운다. 금 테두리, 붉은 눈물. 둘레엔 작은 가면과 촛불 */
function maskIdol(b: Building) {
  const top = b.h + 40;
  const cv = canvasFor(b, top, 20);
  const { g, P, R, finish } = cv;
  const { i0, j0, w, d } = b, j1 = j0 + d;
  plinth(cv, b, 0, 10, 0.05, '#c8c2b8', '#a8a298', '#8a847a');
  plinth(cv, b, 10, 20, 0.5, '#dcd6cc', '#bcb6ac', '#9a948a');
  const [cx, cy] = P(i0 + w / 2, j0 + d / 2, 20);
  const E = (x: number, y: number, rx: number, ry: number, col: string) => { g.fillStyle = col; g.beginPath(); g.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); g.fill(); };
  const H = b.h - 10;
  E(cx, cy - H / 2 - 4, 30, H / 2, '#d8b048'); E(cx, cy - H / 2 - 4, 27, H / 2 - 3, '#f2eee6');
  g.fillStyle = '#e2dcd0'; g.beginPath(); g.ellipse(cx, cy - H / 2 - 4, 27, H / 2 - 3, 0, -Math.PI / 2, Math.PI / 2); g.fill(); // 오른쪽 반은 조금 어둡다
  const ey = cy - H * 0.62;
  // 왼쪽 눈: 웃는 초승달 · 오른쪽 눈: 처진 눈 + 붉은 눈물
  for (let k = 0; k < 9; k++) R(cx - 17 + k, ey - Math.round(Math.sin((k / 8) * Math.PI) * 4), 1, 2, '#141014');
  for (let k = 0; k < 9; k++) R(cx + 8 + k, ey - 3 + Math.round(Math.sin((k / 8) * Math.PI) * 3), 1, 2, '#141014');
  R(cx + 12, ey + 2, 2, 20, '#a82030'); R(cx + 12, ey + 22, 3, 3, '#a82030');
  // 입: 왼쪽 반은 올라가고 오른쪽 반은 내려간다
  const my = cy - H * 0.3;
  for (let k = 0; k < 13; k++) R(cx - 13 + k, my - Math.round((12 - k) * 0.35), 1, 2, '#141014');
  for (let k = 0; k < 13; k++) R(cx + k, my + Math.round(k * 0.35), 1, 2, '#141014');
  R(cx - 1, ey + 8, 2, 12, '#c8c0b4');
  // 받침 둘레의 작은 가면과 촛불
  for (let k = 0; k < 7; k++) { const [x, y] = P(i0 + 0.2 + k * (w - 0.4) / 6, j1 + 0.15, 0); E(x, y - 5, 3, 4, k % 3 === 1 ? '#d8b048' : k % 3 === 2 ? '#a82a3a' : '#f2eee6'); R(x - 2, y - 6, 1, 1, '#141014'); R(x + 1, y - 6, 1, 1, '#141014'); }
  for (let k = 0; k < 4; k++) { const [x, y] = P(i0 + 0.1 + hash(k, 5, i0) * w, j1 + 0.35, 0); R(x, y - 6, 2, 6, '#ece6da'); R(x, y - 8, 2, 2, '#ffd27a'); }
  finish();
  return { canvas: cv.c, x: cv.minX, y: cv.minY };
}
/** 44차 4층 광산 갱도 입구: 쇳물빛 바위 언덕을 파고 들어간 굴, 굵은 통나무 틀과 버팀목, 레일과 광석 수레, 입구 위 붉은 등 */
function mineShaft(b: Building) {
  const top = b.h + 20;
  const cv = canvasFor(b, top, 16);
  const { g, P, poly, R, line, finish } = cv;
  const { i0, j0, w, d } = b, i1 = i0 + w, j1 = j0 + d;
  const seed = i0 * 31 + j0 * 17;
  // 바위 언덕: 울퉁불퉁한 덩어리 셋 (앞면 · 옆면 · 윗면)
  const hill = (cx: number, cy: number, rx: number, h: number, col: string) => {
    const [x, y] = P(cx, cy, 0);
    g.fillStyle = col; g.beginPath(); g.moveTo(x - rx, y); g.quadraticCurveTo(x - rx * 0.7, y - h, x, y - h - 4); g.quadraticCurveTo(x + rx * 0.8, y - h * 0.9, x + rx, y); g.closePath(); g.fill();
  };
  hill(i0 + w * 0.3, j0 + d * 0.4, 58, b.h, '#3a3032');
  hill(i0 + w * 0.75, j0 + d * 0.3, 48, b.h * 0.8, '#2e2628');
  hill(i0 + w * 0.5, j0 + d * 0.8, 70, b.h * 0.55, '#463a3a');
  for (let k = 0; k < 60; k++) { const [x, y] = P(i0 + hash(k, 1, seed) * w, j0 + hash(k, 2, seed) * d, hash(k, 3, seed) * b.h * 0.6); R(x, y, 2, 1, hash(k, 4, seed) < 0.15 ? '#ff7a1a' : '#5a4c4c'); } // 바위 결 · 쇳물빛 광맥
  // 갱도 입구: 앞면 가운데 검은 굴 + 통나무 틀
  const m = i0 + w / 2;
  poly([P(m - 0.7, j1, 0), P(m + 0.7, j1, 0), P(m + 0.7, j1, 30), P(m - 0.7, j1, 30)], '#0a0606');
  for (const x of [m - 0.78, m + 0.62]) poly([P(x, j1 + 0.02, 0), P(x + 0.16, j1 + 0.02, 0), P(x + 0.16, j1 + 0.02, 34), P(x, j1 + 0.02, 34)], '#6a4a2a');
  poly([P(m - 0.9, j1 + 0.02, 30), P(m + 0.9, j1 + 0.02, 30), P(m + 0.9, j1 + 0.02, 36), P(m - 0.9, j1 + 0.02, 36)], '#7a5632');
  for (let k = 0; k < 5; k++) { const [x, y] = P(m - 0.6 + k * 0.3, j1 + 0.03, 32); R(x, y, 1, 3, '#3a2a1a'); }
  // 입구 위 붉은 등 · 레일 (굴에서 앞으로) · 광석 수레
  { const [x, y] = P(m, j1 + 0.05, 42); R(x - 2, y, 5, 5, '#ff5a2a'); R(x - 1, y + 1, 3, 3, '#ffd08a'); line([x, y - 6], [x, y], 1, '#2a2020'); }
  for (const dx of [-0.25, 0.25]) line(P(m + dx, j1, 0), P(m + dx, j1 + 1.2, 0), 1, '#8a8e96');
  for (let k = 0; k < 6; k++) line(P(m - 0.35, j1 + k * 0.2, 0), P(m + 0.35, j1 + k * 0.2, 0), 1, '#4a3420');
  { const cx = m + 0.6, cy = j1 + 0.55;
    poly([P(cx - 0.3, cy - 0.2, 4), P(cx + 0.3, cy - 0.2, 4), P(cx + 0.3, cy + 0.2, 4), P(cx - 0.3, cy + 0.2, 4)], '#5a5e66');
    poly([P(cx - 0.3, cy + 0.2, 4), P(cx + 0.3, cy + 0.2, 4), P(cx + 0.3, cy + 0.2, 14), P(cx - 0.3, cy + 0.2, 14)], '#3a3e46');
    for (let k = 0; k < 7; k++) { const [x, y] = P(cx - 0.2 + hash(k, 7, seed) * 0.4, cy - 0.1 + hash(k, 8, seed) * 0.2, 16); R(x, y, 3, 2, k % 3 ? '#4a3a3a' : '#c8642a'); } }
  void i1;
  finish();
  return { canvas: cv.c, x: cv.minX, y: cv.minY };
}
/** 44차 5층 마을 바깥 인형 조형물: 교수대처럼 높은 두 기둥 사이 거대한 마리오네트 십자 막대, 실에 매달려 고개를 꺾은 거인 나무 인형 (흰 얼굴 · 붉은 볼 · 깨진 금) */
function puppetIdol(b: Building) {
  const top = b.h + 30;
  const cv = canvasFor(b, top, 20);
  const { g, P, R, line, finish } = cv;
  const { i0, j0, w, d } = b;
  plinth(cv, b, 0, 8, 0.05, '#c8c2b8', '#a8a298', '#8a847a');
  const cx0 = i0 + w / 2, cy0 = j0 + d / 2;
  const [bx, by] = P(cx0, cy0, 8);
  const H = b.h;
  // 두 기둥과 가로대
  for (const dx of [-1.15, 1.15]) { const [x, y] = P(cx0 + dx * 0.7, cy0 - dx * 0.7, 8); R(x - 3, y - H, 6, H, '#3a2a1e'); R(x - 3, y - H, 2, H, '#5a4230'); }
  { const [xl, yl] = P(cx0 - 0.8, cy0 + 0.8, H + 8), [xr, yr] = P(cx0 + 0.8, cy0 - 0.8, H + 8); line([xl, yl], [xr, yr], 6, '#4a3424'); }
  // 매달린 십자 막대
  const cy = by - H + 6;
  R(bx - 22, cy, 44, 4, '#6a4a2a'); R(bx - 2, cy - 10, 4, 24, '#6a4a2a');
  // 인형: 머리(꺾인) · 몸통(붉은 외투) · 팔다리(나무 막대 · 공 관절)
  const hy = cy + 34, sy = hy + 20;
  const strings: [number, number][] = [];
  const E = (x: number, y: number, rx: number, ry: number, col: string) => { g.fillStyle = col; g.beginPath(); g.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); g.fill(); };
  // 몸통
  g.fillStyle = '#a8281e'; g.beginPath(); g.moveTo(bx - 14, sy); g.lineTo(bx + 14, sy); g.lineTo(bx + 11, sy + 34); g.lineTo(bx - 11, sy + 34); g.closePath(); g.fill();
  R(bx - 1, sy + 2, 2, 30, '#d8b048'); for (let k = 0; k < 4; k++) R(bx - 5, sy + 6 + k * 7, 2, 2, '#e0b437');
  // 팔: 한쪽은 들리고 한쪽은 축 늘어졌다
  line([bx - 14, sy + 3], [bx - 30, sy - 8], 4, '#b88a5a'); E(bx - 31, sy - 9, 4, 4, '#6a4a2a'); strings.push([bx - 31, sy - 12]);
  line([bx + 14, sy + 3], [bx + 22, sy + 30], 4, '#b88a5a'); E(bx + 22, sy + 31, 4, 4, '#6a4a2a'); strings.push([bx + 22, sy + 28]);
  // 다리: 땅에 닿지 않고 흔들린다
  line([bx - 6, sy + 34], [bx - 10, sy + 62], 5, '#b88a5a'); line([bx + 6, sy + 34], [bx + 4, sy + 64], 5, '#b88a5a');
  E(bx - 10, sy + 64, 5, 3, '#141014'); E(bx + 4, sy + 66, 5, 3, '#141014');
  strings.push([bx - 8, sy + 46], [bx + 5, sy + 48]);
  // 머리: 옆으로 꺾인 흰 얼굴 (그린 눈 · 붉은 볼 · 깨진 금) · 검은 모자
  E(bx + 6, hy, 13, 15, '#efe8dc');
  R(bx + 1, hy - 3, 3, 2, '#141014'); R(bx + 10, hy - 1, 3, 2, '#141014');
  R(bx - 1, hy + 4, 3, 2, '#e07a7a'); R(bx + 13, hy + 6, 3, 2, '#e07a7a');
  for (let k = 0; k < 6; k++) R(bx + 3 + k, hy + 9 + (k % 2), 1, 1, '#141014');
  for (let k = 0; k < 8; k++) R(bx + 12 - k * 0.6, hy - 14 + k * 2, 1, 2, '#6a5a50'); // 금
  R(bx - 6, hy - 22, 24, 8, '#141014'); R(bx - 9, hy - 15, 30, 3, '#141014');
  strings.push([bx + 6, hy - 22]);
  // 실: 십자 막대에서 내려온다
  g.strokeStyle = '#ece8e0'; g.lineWidth = 1;
  const ends: [number, number][] = [[bx - 22, cy + 2], [bx + 22, cy + 2], [bx - 12, cy + 2], [bx + 12, cy + 2], [bx, cy + 12]];
  strings.forEach(([x, y], k) => { const [ex, ey] = ends[k % ends.length]; g.beginPath(); g.moveTo(ex, ey); g.lineTo(x, y); g.stroke(); });
  // 받침 앞 작은 인형 공물 · 촛불
  for (let k = 0; k < 5; k++) { const [x, y] = P(i0 + 0.3 + k * (w - 0.6) / 4, j0 + d + 0.2, 0); E(x, y - 6, 3, 3, '#efe8dc'); R(x - 2, y - 3, 4, 4, ['#a8281e', '#2a4a7a', '#d8b048'][k % 3]); R(x - 1, y - 7, 1, 1, '#141014'); R(x + 1, y - 7, 1, 1, '#141014'); }
  finish();
  return { canvas: cv.c, x: cv.minX, y: cv.minY };
}
/** 인형 진열창의 인형 얼굴 자리 (장면이 몇몇 인형의 눈을 굴린다): [x, y, z] 칸 좌표 */
export function puppetEyes(b: Building): [number, number, number][] {
  const out: [number, number, number][] = [];
  const { i0, j0, w, d } = b, j1 = j0 + d;
  for (let row = 0; row < 3; row++) for (let k = 0; k < 6; k++) if ((k * 7 + row * 3) % 4 === 1) out.push([i0 + 0.3 + (k + 0.5) * (w - 0.6) / 6, j1 + 0.02, 14 + row * 11 + 6]);
  return out;
}
/** 인형술사 마리의 공방: 낡은 나무 가게 · 왼쪽 앞면 큰 진열창에 세 줄로 앉힌 인형 수십 개 (흰 얼굴 · 빨간 볼) · 오른쪽 면엔 실에 매달린 마리오네트 · 가위와 실패 간판 */
function puppetShop(b: Building) {
  const Hw = b.h;
  const top = Hw + 30;
  const cv = canvasFor(b, top, 14);
  const { P, poly, R, line, finish } = cv;
  const { i0, j0, w, d } = b, i1 = i0 + w, j1 = j0 + d;
  const seed = i0 * 29 + j0 * 7;
  const LW = w * (TW / 2);
  const glass = (u: number, z: number) => u > LW * 0.08 && u < LW * 0.92 && z > 10 && z < 46;
  walls(cv, b, Hw, (face, u, z) => {
    if (face === 0 && glass(u, z)) return (z === 21 || z === 32) ? '#3a2416' : shade('#3a2a2a', 0.8 + hash(u >> 3, z >> 3, seed) * 0.3); // 진열창 안 (선반 둘)
    if (z < 6) return '#2a1c14';
    if (u % 7 === 0) return '#1e140e';
    return shade(face ? '#5a3a24' : '#6a4630', 0.75 + hash(u >> 1, z >> 3, seed + face) * 0.35);
  });
  // 진열창의 인형들: 세 줄, 흰 얼굴 · 빨간 볼 · 알록달록한 옷
  const cols = ['#a82a3a', '#2a4a7a', '#d8b048', '#3a6a3a', '#6a3a7a', '#ece6da'];
  for (let row = 0; row < 3; row++) for (let k = 0; k < 6; k++) {
    const [x, y] = P(i0 + 0.3 + (k + 0.5) * (w - 0.6) / 6, j1 + 0.02, 14 + row * 11);
    R(x - 2, y - 4, 5, 4, cols[(k + row * 2) % cols.length]);
    R(x - 2, y - 9, 5, 5, '#f2eee6'); R(x - 1, y - 7, 1, 1, '#141014'); R(x + 1, y - 7, 1, 1, '#141014'); R(x - 2, y - 6, 1, 1, '#e88a8a'); R(x + 2, y - 6, 1, 1, '#e88a8a');
    R(x - 2, y - 10, 5, 1, ['#2a1a12', '#d8b048', '#141014'][(k + row) % 3]);
  }
  // 오른쪽 면: 처마 끝에서 실에 매달린 마리오네트 셋
  for (let k = 0; k < 3; k++) {
    const [ax, ay] = P(i1 + 0.05, j1 - 0.35 - k * (d - 0.7) / 2, Hw - 2);
    line([ax, ay], [ax, ay + 14], 1, '#ece8e0');
    R(ax - 2, ay + 14, 5, 5, '#f2eee6'); R(ax - 2, ay + 19, 5, 7, cols[k + 1]); R(ax - 4, ay + 19, 2, 6, '#b88a5a'); R(ax + 3, ay + 19, 2, 6, '#b88a5a'); R(ax - 1, ay + 26, 1, 6, '#b88a5a'); R(ax + 1, ay + 26, 1, 6, '#b88a5a');
    R(ax - 1, ay + 16, 1, 1, '#141014'); R(ax + 1, ay + 16, 1, 1, '#141014');
  }
  // 앞으로 튀어나온 처마 (줄무늬 천) · 실패와 가위 간판
  const ze = Hw;
  poly([P(i0 - 0.1, j1 + 0.45, ze - 8), P(i1 + 0.1, j1 + 0.45, ze - 8), P(i1 + 0.1, j1, ze), P(i0 - 0.1, j1, ze)], '#7a1e2a');
  for (let k = 0; k < 6; k++) { const x0 = i0 - 0.1 + (k / 6) * (w + 0.2), x1 = x0 + (w + 0.2) / 12; poly([P(x0, j1 + 0.45, ze - 8), P(x1, j1 + 0.45, ze - 8), P(x1, j1, ze), P(x0, j1, ze)], '#ece6da'); }
  poly([P(i0 - 0.1, j0 - 0.1, ze + 16), P(i1 + 0.1, j0 - 0.1, ze + 16), P(i1 + 0.1, j1, ze), P(i0 - 0.1, j1, ze)], '#2a1e18');
  poly([P(i1 + 0.1, j0 - 0.1, ze + 16), P(i1 + 0.1, j1, ze), P(i1 + 0.1, j1, ze - 3), P(i1 + 0.1, j0 - 0.1, ze + 13)], '#1a120e');
  { const [sx, sy] = P(i0 + w * 0.5, j1 + 0.45, ze - 10); R(sx - 8, sy, 16, 10, '#2a1a12'); R(sx - 7, sy + 1, 14, 8, '#d8c8a8'); R(sx - 4, sy + 3, 3, 4, '#a82a3a'); R(sx - 3, sy + 2, 1, 6, '#5a3a22'); R(sx + 1, sy + 3, 1, 4, '#5a5652'); R(sx + 3, sy + 3, 1, 4, '#5a5652'); R(sx + 1, sy + 6, 3, 1, '#5a5652'); }
  finish();
  return { canvas: cv.c, x: cv.minX, y: cv.minY };
}
