// 24차: 서울 달동네의 낮은 집 — 붉은 벽돌 벽, 비스듬한 함석·슬레이트 지붕(파랑·초록·주황), 쇠창살 낀 작은 창,
// 지붕 위 파란 물탱크·연통·위성 안테나, 담벼락 빨랫줄, 문 앞 연탄. 맨 끝 '내 집'은 창에 노란 불빛과 문패.
// 거리 상가(조립 그림 묶음)는 1층 높이가 정해져 있어 이런 낮은 집은 따로 점을 찍어 그린다.
import { TW, TH } from './gfx.ts';
import type { Building } from './zone.ts';

const hash = (a: number, b: number, c = 0) => { let h = (a * 374761393 + b * 668265263 + c * 2147483647) | 0; h = (h ^ (h >>> 13)) * 1274126177; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
const shade = (hex: string, k: number) => { const n = parseInt(hex.slice(1), 16); const f = (v: number) => Math.max(0, Math.min(255, Math.round(v * k))).toString(16).padStart(2, '0'); return `#${f(n >> 16)}${f((n >> 8) & 255)}${f(n & 255)}`; };

export function drawDalHouse(b: Building, night: boolean, home = false, salon = false): { canvas: HTMLCanvasElement; x: number; y: number } {
  const { i0, j0, w, d } = b;
  const i1 = i0 + w, j1 = j0 + d;
  const wallH = 34, roofH = 16 + Math.min(w, d) * 3;
  const M = 24, top = wallH + roofH + 26;
  const minX = (i0 - j1) * (TW / 2) - M, minY = (i0 + j0) * (TH / 2) - top;
  const W = (w + d) * (TW / 2) + M * 2, H = (w + d) * (TH / 2) + top + 10;
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const g = c.getContext('2d')!;
  const P = (x: number, y: number, z: number): [number, number] => [Math.round((x - y) * (TW / 2) - minX), Math.round((x + y) * (TH / 2) - z - minY)];
  const poly = (pts: [number, number][], fill: string) => { g.beginPath(); g.moveTo(pts[0][0], pts[0][1]); for (const p of pts.slice(1)) g.lineTo(p[0], p[1]); g.closePath(); g.fillStyle = fill; g.fill(); };
  const R = (x: number, y: number, ww: number, hh: number, col: string) => { g.fillStyle = col; g.fillRect(Math.round(x), Math.round(y), ww, hh); };
  const seed = i0 * 31 + j0 * 17;
  const brick = salon ? '#b8a08a' : home ? '#9a6a52' : ['#8a5a44', '#9a6448', '#7a5040', '#a8705a', '#b0a08a'][Math.floor(hash(seed, 1) * 5)];
  const roof = salon ? '#8a3a4a' : home ? '#3a5a7a' : ['#3a5a7a', '#4a7a5a', '#c8642a', '#5a6a7a', '#2e4e6e'][Math.floor(hash(seed, 2) * 5)];
  // 그림자
  poly([P(i0 + 0.1, j1 + 0.2, 0), P(i1 + 0.3, j1 + 0.2, 0), P(i1 + 0.3, j0 + 0.1, 0), P(i1 + 0.1, j0, 0)], 'rgba(20,16,14,0.3)');
  // 벽: 앞 왼쪽 면(j1) · 앞 오른쪽 면(i1), 벽돌 줄눈
  poly([P(i0, j1, 0), P(i1, j1, 0), P(i1, j1, wallH), P(i0, j1, wallH)], brick);
  poly([P(i1, j0, 0), P(i1, j1, 0), P(i1, j1, wallH), P(i1, j0, wallH)], shade(brick, 0.72));
  for (let z = 4; z < wallH; z += 4) {
    const [ax, ay] = P(i0, j1, z), [bx, by] = P(i1, j1, z);
    g.strokeStyle = shade(brick, 0.82); g.lineWidth = 1; g.beginPath(); g.moveTo(ax, ay); g.lineTo(bx, by); g.stroke();
    const [cx, cy] = P(i1, j0, z), [dx, dy] = P(i1, j1, z);
    g.strokeStyle = shade(brick, 0.6); g.beginPath(); g.moveTo(cx, cy); g.lineTo(dx, dy); g.stroke();
  }
  // 시멘트로 덧바른 아랫단
  poly([P(i0, j1, 0), P(i1, j1, 0), P(i1, j1, 6), P(i0, j1, 6)], '#8a8680');
  poly([P(i1, j0, 0), P(i1, j1, 0), P(i1, j1, 6), P(i1, j0, 6)], '#6e6a66');
  // 문 (앞 왼쪽 면 가운데 근처): 녹슨 철문, 문 앞 연탄 몇 장
  const dm = i0 + Math.min(w - 0.7, 1.2);
  poly([P(dm - 0.35, j1, 0), P(dm + 0.35, j1, 0), P(dm + 0.35, j1, 24), P(dm - 0.35, j1, 24)], home ? '#5a3a2a' : '#4a5a5e');
  { const [kx, ky] = P(dm + 0.25, j1, 12); R(kx - 1, ky, 2, 2, '#c9a23e'); }
  if (home) { const [nx, ny] = P(dm + 0.55, j1, 20); R(nx - 6, ny, 10, 4, '#e8dcc0'); R(nx - 5, ny + 1, 8, 1, '#3a2a1e'); } // 문패
  for (let k = 0; k < (home ? 3 : Math.floor(hash(seed, 3) * 3)); k++) { const [x, y] = P(dm - 0.9 + k * 0.18, j1 + 0.25, 0); R(x - 3, y - 6, 6, 6, '#2a2624'); R(x - 3, y - 6, 6, 1, '#4a4440'); }
  // 40차 유내 미용실: 문 위 분홍 간판(글씨) · 문 옆에 도는 줄무늬 기둥 · 넓은 유리창(커튼 반쯤) · 문에 붙은 '커트 · 펌 · 염색'
  if (salon) {
    const [px, py] = P(dm + 0.75, j1 + 0.12, 0);
    R(px - 2, py - 26, 5, 26, '#e8e4dc');
    for (let k = 0; k < 6; k++) { R(px - 2, py - 24 + k * 4, 5, 2, k % 2 ? '#2a5ab0' : '#c8302a'); }
    R(px - 3, py - 28, 7, 3, '#c9a23e'); R(px - 3, py - 1, 7, 2, '#8a8680');
    const glass = night ? '#f6d2a8' : '#d8e6ec';
    poly([P(i0 + 0.2, j1, 8), P(dm - 0.5, j1, 8), P(dm - 0.5, j1, 26), P(i0 + 0.2, j1, 26)], glass);
    poly([P(i0 + 0.2, j1, 18), P(dm - 0.5, j1, 18), P(dm - 0.5, j1, 26), P(i0 + 0.2, j1, 26)], night ? '#e8b0b8' : '#f2c8d4');
    { const [tx, ty] = P(dm, j1, 16); R(tx - 3, ty, 6, 4, '#f2ece0'); R(tx - 2, ty + 1, 4, 1, '#c96a8a'); R(tx - 2, ty + 3, 3, 1, '#8a8680'); }
  }
  // 창: 쇠창살 낀 작은 창 (밤엔 노란 불빛 — 내 집은 늘 켜져 있다)
  const lit = home || salon || (night && hash(seed, 4) < 0.55);
  for (const t of [0.25, 0.72]) {
    if ((w < 2 || salon) && t < 0.5) continue;
    const wx = i0 + w * t;
    if (Math.abs(wx - dm) < 0.6) continue;
    poly([P(wx - 0.25, j1, 12), P(wx + 0.25, j1, 12), P(wx + 0.25, j1, 24), P(wx - 0.25, j1, 24)], lit ? '#f2d27a' : '#2a3438');
    for (let k = 0; k < 4; k++) { const [x, y] = P(wx - 0.22 + k * 0.15, j1, 24); R(x, y, 1, 12, '#3a3634'); }
  }
  { const wy = j0 + d * 0.5; poly([P(i1, wy - 0.25, 12), P(i1, wy + 0.25, 12), P(i1, wy + 0.25, 24), P(i1, wy - 0.25, 24)], lit ? '#d8b860' : '#222a2e'); }
  // 지붕: 앞뒤로 기운 함석 (골이 진 줄무늬), 처마가 조금 나온다
  const ov = 0.18, ridge = wallH + roofH;
  const jm = j0 + d / 2;
  poly([P(i0 - ov, j1 + ov, wallH - 2), P(i1 + ov, j1 + ov, wallH - 2), P(i1 + ov, jm, ridge), P(i0 - ov, jm, ridge)], roof);
  poly([P(i1 + ov, j0 - ov, wallH - 2), P(i1 + ov, jm, ridge), P(i1 + ov, j1 + ov, wallH - 2)], shade(roof, 0.68));
  for (let t = 0; t <= 1.001; t += 1 / (w * 4)) {
    const x = i0 - ov + (w + ov * 2) * t;
    const [ax, ay] = P(x, j1 + ov, wallH - 2), [bx, by] = P(x, jm, ridge);
    g.strokeStyle = shade(roof, 0.8); g.lineWidth = 1; g.beginPath(); g.moveTo(ax, ay); g.lineTo(bx, by); g.stroke();
  }
  // 40차 유내 미용실 간판: 처마 끝에 내건 분홍 판 (지붕보다 앞)
  if (salon) {
    const [ax, ay] = P(i0 + 0.12, j1 + 0.22, wallH + 9), [bx, by] = P(i1 - 0.12, j1 + 0.22, wallH + 9);
    g.save();
    g.translate(ax, ay);
    g.rotate(Math.atan2(by - ay, bx - ax));
    const len = Math.hypot(bx - ax, by - ay);
    R(0, -13, len, 13, '#f6dde4'); R(0, -13, len, 1, '#b8506e'); R(0, -1, len, 1, '#b8506e'); R(0, -13, 1, 13, '#b8506e'); R(len - 1, -13, 1, 13, '#b8506e');
    g.fillStyle = '#8a2446'; g.font = 'bold 9px system-ui, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText('유내 미용실', len / 2, -6.5);
    g.restore();
  }
  // 녹 자국 · 지붕을 누른 돌과 타이어
  for (let k = 0; k < 5; k++) { const [x, y] = P(i0 + hash(seed, 10 + k) * w, j1 - hash(seed, 20 + k) * d * 0.4, wallH + roofH * 0.4); R(x, y, 3, 2, '#7a4a2a'); }
  if (hash(seed, 5) < 0.6) { const [x, y] = P(i0 + w * 0.4, jm + 0.3, ridge - 3); g.fillStyle = '#1e1c1c'; g.beginPath(); g.ellipse(x, y, 6, 3, 0, 0, Math.PI * 2); g.fill(); }
  // 지붕 위 파란 물탱크 · 연통 · 안테나
  if (hash(seed, 6) < 0.7 || home) { const [x, y] = P(i0 + w * 0.7, jm - 0.2, ridge - 2); R(x - 5, y - 12, 10, 12, '#2e6ab0'); R(x - 5, y - 12, 10, 2, '#4a8ad0'); R(x - 3, y - 14, 6, 2, '#2a5a98'); }
  { const [x, y] = P(i0 + w * 0.2, jm + 0.1, ridge - 4); R(x, y - 14, 2, 14, '#8a8680'); R(x - 1, y - 15, 4, 2, '#6a6660'); }
  if (hash(seed, 7) < 0.35) { const [x, y] = P(i1 - 0.3, jm, ridge); g.strokeStyle = '#c8c4bc'; g.lineWidth = 1; g.beginPath(); g.ellipse(x, y - 8, 4, 5, -0.5, 0, Math.PI * 2); g.stroke(); R(x, y - 4, 1, 5, '#8a8680'); }
  // 담벼락 빨랫줄 (가끔)
  if (hash(seed, 8) < 0.45) {
    const [ax, ay] = P(i0 - 0.2, j1 + 0.5, 22), [bx, by] = P(i0 + w * 0.8, j1 + 0.5, 22);
    g.strokeStyle = '#d8d4cc'; g.lineWidth = 1; g.beginPath(); g.moveTo(ax, ay); g.quadraticCurveTo((ax + bx) / 2, (ay + by) / 2 + 4, bx, by); g.stroke();
    const cols = ['#e8e4dc', '#c8402a', '#3a6ab0', '#e0b437', '#8ab06a'];
    for (let k = 0; k < 4; k++) { const t = 0.15 + k * 0.22; const x = ax + (bx - ax) * t, y = ay + (by - ay) * t + 3; R(x - 2, y, 5, 7 - (k % 2) * 2, cols[Math.floor(hash(seed, 30 + k) * 5)]); }
  }
  return { canvas: c, x: minX, y: minY };
}
