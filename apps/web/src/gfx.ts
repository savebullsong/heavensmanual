// 지형 · 건물 · 소품 · 차량 그래픽 (도트 느낌의 캔버스 그리기)
import { type Zone, type Building, type Prop, tileAt } from './zone.ts';
import { ramp } from './raster.ts';

export const TW = 64, TH = 32;
/** 연속 격자 좌표 → 화면 좌표 (타일 중심 = (i+0.5, j+0.5)) */
export function iso(x: number, y: number): [number, number] {
  return [(x - y) * (TW / 2), (x + y) * (TH / 2)];
}

function rnd(seed: number) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => (s = (s * 16807) % 2147483647) / 2147483647;
}

const TILE_COLORS: Record<string, string> = {
  void: '#14110f', road: '#4a4b4e', median: '#7c7a72', walk: '#a59a8c', soi: '#56575a', cross: '#4a4b4e',
  lot: '#3d3a36', block: '#3d3a36', park: '#55703f', water: '#3b6478',
};
const RAMPS: Record<string, string[]> = Object.fromEntries(Object.entries(TILE_COLORS).map(([k, v]) => [k, ramp(v)]));

export const CHUNK = 24;

/** 바닥을 CHUNK×CHUNK 타일 조각으로 그린다 (화면에 보이는 조각만 만든다) */
export function drawGroundChunk(z: Zone, i0: number, j0: number): { canvas: HTMLCanvasElement; x: number; y: number } | null {
  const i1 = Math.min(z.W, i0 + CHUNK), j1 = Math.min(z.H, j0 + CHUNK);
  let any = false;
  for (let j = j0; j < j1 && !any; j++) for (let i = i0; i < i1; i++) if (tileAt(z, i, j) !== 'void') { any = true; break; }
  if (!any) return null;
  const minX = (i0 - j1) * (TW / 2), minY = (i0 + j0) * (TH / 2);
  const c = document.createElement('canvas');
  c.width = (i1 - i0 + j1 - j0) * (TW / 2) + 2;
  c.height = (i1 - i0 + j1 - j0) * (TH / 2) + 2;
  const g = c.getContext('2d')!;
  g.imageSmoothingEnabled = false;
  const S = (x: number, y: number): [number, number] => { const [a, b] = iso(x, y); return [a - minX, b - minY]; };
  const r = rnd(7 + i0 * 131 + j0 * 977);
  // 19차: 네모 칸이 그대로 보이지 않게 — 칸마다 제멋대로인 밝기 대신 넓게 번지는 얼룩(값 잡음),
  // 계단처럼 꺾이는 경계(풀밭·물·공터·보도)는 모서리를 비스듬히 깎아 자연스러운 선으로, 연못 위 보도는 나무 다리
  const shade = (i: number, j: number) => {
    const ci = Math.floor(i / 5), cj = Math.floor(j / 5), fi = (i % 5) / 5, fj = (j % 5) / 5;
    const h = (a: number, b: number) => { const v = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return v - Math.floor(v); };
    const top = h(ci, cj) * (1 - fi) + h(ci + 1, cj) * fi, bot = h(ci, cj + 1) * (1 - fi) + h(ci + 1, cj + 1) * fi;
    return top * (1 - fj) + bot * fj;
  };
  const SOFT: Record<string, number> = { water: 0, lot: 1, block: 1, park: 2, walk: 3, soi: 3 };
  const bridge = (i: number, j: number) => tileAt(z, i, j) === 'walk' && [[1, 0], [-1, 0], [0, 1], [0, -1]].filter(([a, b]) => tileAt(z, i + a, j + b) === 'water').length >= 2;
  const diamond = (x: number, y: number) => { g.beginPath(); g.moveTo(x, y); g.lineTo(x + TW / 2, y + TH / 2); g.lineTo(x, y + TH); g.lineTo(x - TW / 2, y + TH / 2); g.closePath(); };
  for (let j = j0; j < j1; j++)
    for (let i = i0; i < i1; i++) {
      const t = tileAt(z, i, j);
      if (t === 'void') continue;
      const base = RAMPS[t];
      const [x, y] = S(i, j);
      diamond(x, y);
      const sv = shade(i, j) + (r() - 0.5) * 0.12;
      g.fillStyle = base[sv < 0.3 ? 1 : sv < 0.72 ? 2 : 3];
      g.fill();
      if (t === 'walk' && bridge(i, j)) {
        // 나무 다리: 널빤지 결 + 양옆 난간 그림자
        diamond(x, y); g.fillStyle = '#8a6a48'; g.fill();
        g.strokeStyle = '#5e4630'; g.lineWidth = 1;
        for (let k = 1; k < 4; k++) { const a = S(i + k / 4, j), b = S(i + k / 4, j + 1); g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.stroke(); }
        continue;
      }
      if (t === 'walk' && (i + j) % 2 === 0) { diamond(x, y); g.strokeStyle = 'rgba(60,50,40,0.16)'; g.lineWidth = 1; g.stroke(); }
      // 모서리 깎기: 맞닿은 두 이웃이 같은 다른 땅(그리고 대각선도)이면 그 모서리 반쪽을 이웃 땅으로 칠한다
      const pt = SOFT[t];
      if (pt !== undefined) {
        const N = (a: number, b: number) => tileAt(z, i + a, j + b);
        // [이웃1, 이웃2, 대각선, 반대쪽1, 반대쪽2, 깎을 삼각형의 세 꼭짓점]
        const corners: [[number, number], [number, number], [number, number], [number, number], [number, number], [number, number][]][] = [
          [[-1, 0], [0, -1], [-1, -1], [1, 0], [0, 1], [[i, j], [i + 1, j], [i, j + 1]]],
          [[1, 0], [0, -1], [1, -1], [-1, 0], [0, 1], [[i + 1, j], [i + 1, j + 1], [i, j]]],
          [[1, 0], [0, 1], [1, 1], [-1, 0], [0, -1], [[i + 1, j + 1], [i, j + 1], [i + 1, j]]],
          [[-1, 0], [0, 1], [-1, 1], [1, 0], [0, -1], [[i, j + 1], [i, j], [i + 1, j + 1]]],
        ];
        for (const [n1, n2, dg, o1, o2, tri] of corners) {
          const X = N(n1[0], n1[1]);
          if (X === t || X !== N(n2[0], n2[1]) || X !== N(dg[0], dg[1]) || N(o1[0], o1[1]) === X || N(o2[0], o2[1]) === X) continue;
          const px = SOFT[X];
          if (px === undefined || px <= pt || bridge(i + n1[0], j + n1[1])) continue;
          const xr = RAMPS[X], sx = shade(i + n1[0], j + n1[1]);
          g.beginPath();
          tri.forEach(([a, b], k) => { const [qx, qy] = S(a, b); if (k) g.lineTo(qx, qy); else g.moveTo(qx, qy); });
          g.closePath();
          g.fillStyle = xr[sx < 0.3 ? 1 : sx < 0.72 ? 2 : 3];
          g.fill();
        }
      }
      const dots = t === 'park' ? 10 : 6;
      for (let n = 0; n < dots; n++) {
        const px = x + (r() - 0.5) * TW * 0.6, py = y + TH / 2 + (r() - 0.5) * TH * 0.5;
        g.fillStyle = r() < 0.5 ? base[0] : base[3];
        g.fillRect(Math.round(px), Math.round(py), t === 'park' ? 2 : 1, 1);
      }
      if (t === 'water' && r() < 0.3) { g.fillStyle = base[3]; g.fillRect(Math.round(x - 6), Math.round(y + TH / 2), 10, 1); }
      if (t === 'cross') {
        g.strokeStyle = '#e6e2d6'; g.lineWidth = 7;
        for (let k = 0; k < 2; k++) {
          const a = S(i + 0.2 + k * 0.5, j + 0.12), b = S(i + 0.2 + k * 0.5, j + 0.88);
          g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.stroke();
        }
      }
    }
  // 차선 표시: 위쪽이 같은 차도면 흰 점선, 중앙분리대면 노란 실선, 보도면 경계석
  const line = (j: number, a0: number, a1: number, color: string, dashed: boolean) => {
    if (j < j0 || j > j1) return;
    const s0 = Math.max(a0, i0), s1 = Math.min(a1 + 1, i1);
    if (s1 <= s0) return;
    const a = S(s0, j), b = S(s1, j);
    g.strokeStyle = color; g.lineWidth = 2; g.setLineDash(dashed ? [12, 14] : []);
    g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.stroke();
  };
  for (const l of z.lanes) {
    if (l.j < j0 - 1 || l.j > j1 || l.i1 < i0 || l.i0 >= i1) continue;
    const mid = Math.floor((Math.max(l.i0, i0) + Math.min(l.i1, i1 - 1)) / 2);
    const up = tileAt(z, mid, l.j - 1), down = tileAt(z, mid, l.j + 1);
    if (up === 'road' || up === 'cross') line(l.j, l.i0, l.i1, '#d9d6cc', true);
    else if (up === 'median') line(l.j, l.i0, l.i1, '#d8b63c', false);
    else if (up === 'walk') line(l.j, l.i0, l.i1, '#6e665b', false);
    if (down === 'median') line(l.j + 1, l.i0, l.i1, '#d8b63c', false);
    else if (down === 'walk') line(l.j + 1, l.i0, l.i1, '#6e665b', false);
  }
  g.setLineDash([]);
  return { canvas: c, x: minX, y: minY };
}

/** 등각 상자 건물: 지붕 + 왼쪽 면(+j) + 오른쪽 면(+i), 창문과 1층 상점, 간판 */
/** 사람 키(약 40px)에 맞춰 1층을 높인 건물 높이 */
export function buildingHeight(h: number) {
  return Math.max(76, Math.round(h * 1.35 + 26));
}

export function drawBuilding(b: Building, signText: string, night: boolean) {
  const { i0, j0, w, d } = b;
  const h = buildingHeight(b.h);
  const minX = (i0 - (j0 + d)) * (TW / 2);
  const topY = (i0 + j0) * (TH / 2);
  const width = (w + d) * (TW / 2);
  const height = (w + d) * (TH / 2) + h;
  const c = document.createElement('canvas');
  c.width = Math.ceil(width) + 2; c.height = Math.ceil(height) + 2;
  const g = c.getContext('2d')!;
  const P = (x: number, y: number, z: number): [number, number] => [(x - y) * (TW / 2) - minX + 1, (x + y) * (TH / 2) - topY + h - z + 1];
  const quad = (pts: [number, number][], fill: string) => {
    g.beginPath(); g.moveTo(pts[0][0], pts[0][1]);
    for (const p of pts.slice(1)) g.lineTo(p[0], p[1]);
    g.closePath(); g.fillStyle = fill; g.fill();
  };
  const R = ramp(b.color);
  const i1 = i0 + w, j1 = j0 + d;
  // 면
  quad([P(i0, j1, h), P(i1, j1, h), P(i1, j1, 0), P(i0, j1, 0)], R[1]); // 왼쪽 면
  quad([P(i1, j0, h), P(i1, j1, h), P(i1, j1, 0), P(i1, j0, 0)], R[0]); // 오른쪽 면
  quad([P(i0, j0, h), P(i1, j0, h), P(i1, j1, h), P(i0, j1, h)], R[3]); // 지붕
  // 지붕 난간과 설비
  quad([P(i0, j1, h), P(i1, j1, h), P(i1, j1, h - 3), P(i0, j1, h - 3)], R[2]);
  const r = rnd(i0 * 31 + j0 * 17 + h);
  if (b.cat !== 'ujusae') {
    const ux = i0 + w * 0.3 + r() * w * 0.3, uy = j0 + d * 0.3;
    quad([P(ux, uy, h + 10), P(ux + 1, uy, h + 10), P(ux + 1, uy + 1, h + 10), P(ux, uy + 1, h + 10)], R[2]);
    quad([P(ux, uy + 1, h + 10), P(ux + 1, uy + 1, h + 10), P(ux + 1, uy + 1, h), P(ux, uy + 1, h)], R[1]);
    quad([P(ux + 1, uy, h + 10), P(ux + 1, uy + 1, h + 10), P(ux + 1, uy + 1, h), P(ux + 1, uy, h)], R[0]);
  }
  // 창문
  const winLit = night ? '#f2d58a' : '#5f7486';
  const winDark = night ? '#2a2f3a' : '#3f4f5e';
  const floorH = 24, ground = 62;
  for (let z = ground + 8; z < h - 12; z += floorH) {
    for (let s = 0.35; s < w - 0.2; s += 0.8) {
      const lit = r() < (night ? 0.55 : 0.0);
      quad([P(i0 + s, j1, z + 13), P(i0 + s + 0.45, j1, z + 13), P(i0 + s + 0.45, j1, z), P(i0 + s, j1, z)], lit ? winLit : winDark);
    }
    for (let s = 0.35; s < d - 0.2; s += 0.8) {
      const lit = r() < (night ? 0.45 : 0.0);
      quad([P(i1, j0 + s, z + 13), P(i1, j0 + s + 0.45, z + 13), P(i1, j0 + s + 0.45, z), P(i1, j0 + s, z)], lit ? winLit : '#334150');
    }
  }
  // 1층 상점 (유리 + 차양 + 간판)
  if (b.sign) {
    const left = b.sign === 'left';
    const A = (s: number, z: number) => (left ? P(i0 + s, j1, z) : P(i1, j0 + s, z));
    const span = left ? w : d;
    const glass = b.cat === 'ujusae' ? '#2a1a12' : night ? '#e9d7a0' : '#6d8796';
    quad([A(0.2, 50), A(span - 0.2, 50), A(span - 0.2, 0), A(0.2, 0)], glass);
    if (b.cat !== 'ujusae') for (let s = 0.9; s < span - 0.4; s += 0.9) quad([A(s, 50), A(s + 0.05, 50), A(s + 0.05, 0), A(s, 0)], '#2a2f36'); // 유리 칸살
    if (b.cat === 'ujusae') {
      // 낡은 나무 문과 노란 등
      quad([A(span / 2 - 0.36, 47), A(span / 2 + 0.36, 47), A(span / 2 + 0.36, 0), A(span / 2 - 0.36, 0)], '#6b4429');
      quad([A(span / 2 - 0.28, 42), A(span / 2 + 0.28, 42), A(span / 2 + 0.28, 30), A(span / 2 - 0.28, 30)], '#e8c97a');
      quad([A(span / 2 + 0.5, 36), A(span / 2 + 0.62, 36), A(span / 2 + 0.62, 31), A(span / 2 + 0.5, 31)], '#e0b437');
    }
    if (b.cat === 'ujusae') {
      // 우주새는 간판이 없다. 처마 아래 나무 띠만 두른다 (이름은 누르면 보인다)
      quad([A(0, 60), A(span, 60), A(span, 51), A(0, 51)], '#3a2416');
      quad([A(0, 60), A(span, 60), A(span, 59), A(0, 59)], '#5a3d26');
    } else {
      const signCol = SIGN_COLORS[b.cat] ?? '#c7553f';
      quad([A(0, 63), A(span, 63), A(span, 51), A(0, 51)], signCol);
      // 간판 글씨 (면의 기울기를 따라 기울인다)
      const [sx, sy] = A(span / 2, 54);
      g.save();
      g.translate(sx, sy);
      g.transform(1, left ? 0.5 : -0.5, 0, 1, 0, 0);
      // 간판 폭에 맞춰 글씨를 줄인다 (면 한 칸 ≈ 35px)
      const room = span * 35 - 8;
      let fs = 10;
      g.font = `600 ${fs}px sans-serif`;
      while (fs > 7 && g.measureText(signText).width > room) { fs -= 1; g.font = `600 ${fs}px sans-serif`; }
      if (g.measureText(signText).width > room) { while (signText.length > 1 && g.measureText(signText + '…').width > room) signText = signText.slice(0, -1); signText += '…'; }
      g.textAlign = 'center';
      g.fillStyle = '#fffaf0';
      g.fillText(signText, 0, 0);
      g.restore();
    }
  }
  // 외곽선
  g.strokeStyle = 'rgba(20,14,10,0.55)'; g.lineWidth = 1;
  g.beginPath();
  const o = [P(i0, j0, h), P(i1, j0, h), P(i1, j0, 0), P(i1, j1, 0), P(i0, j1, 0), P(i0, j1, h)];
  g.moveTo(o[0][0], o[0][1]); for (const p of o.slice(1)) g.lineTo(p[0], p[1]); g.closePath(); g.stroke();
  return { canvas: c, x: minX - 1, y: topY - h - 1 };
}

const SIGN_COLORS: Record<string, string> = {
  convenience: '#2f8f5b', pharmacy: '#3a7fb8', clinic: '#3f8f8a', restaurant: '#b8462f', bar: '#7a3a8a', cafe: '#6b4a32', bank: '#2f5d8f',
  worship: '#b8862f', school: '#8f6a2f', hotel: '#5a4a7a', laundry: '#5a5fae', shop: '#a0582f', office: '#55606e', condo: '#55606e',
};

/** 소품 스프라이트 (발 위치 = 캔버스 아래 가운데) */
export function drawProp(p: Prop): HTMLCanvasElement {
  const c = document.createElement('canvas');
  const g = c.getContext('2d')!;
  if (p.kind === 'tree') {
    c.width = 48; c.height = 86;
    g.fillStyle = 'rgba(0,0,0,0.25)'; g.beginPath(); g.ellipse(24, 80, 16, 5, 0, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#5a3f2a'; g.fillRect(22, 46, 4, 34);
    const leaf = ramp('#3f6b3a');
    const blob = (x: number, y: number, rr: number, col: string) => { g.fillStyle = col; g.beginPath(); g.arc(x, y, rr, 0, Math.PI * 2); g.fill(); };
    blob(24, 34, 18, leaf[1]); blob(17, 28, 12, leaf[2]); blob(30, 24, 11, leaf[2]); blob(22, 18, 9, leaf[3]); blob(32, 38, 9, leaf[0]);
  } else if (p.kind === 'lamp') {
    c.width = 20; c.height = 110;
    g.fillStyle = '#3c3f44'; g.fillRect(9, 10, 3, 98);
    g.fillRect(9, 8, 10, 3);
    g.fillStyle = '#d9d2b8'; g.fillRect(14, 11, 5, 3);
  } else if (p.kind === 'pillar') {
    c.width = 40; c.height = 200;
    const R = ramp('#9a978e');
    g.fillStyle = R[1]; g.fillRect(8, 20, 12, 180);
    g.fillStyle = R[0]; g.fillRect(20, 20, 12, 180);
    g.fillStyle = R[2]; g.fillRect(2, 8, 36, 14);
    g.fillStyle = R[3]; g.fillRect(2, 8, 36, 3);
  } else {
    // 노점 수레
    c.width = 56; c.height = 56;
    const R = ramp('#b03a2e');
    g.fillStyle = 'rgba(0,0,0,0.25)'; g.beginPath(); g.ellipse(28, 50, 22, 6, 0, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#7a6a58'; g.fillRect(8, 26, 40, 20);
    g.fillStyle = '#5c4f42'; g.fillRect(8, 40, 40, 6);
    g.fillStyle = R[2]; g.fillRect(4, 10, 48, 8);
    g.fillStyle = R[3]; g.fillRect(4, 10, 48, 2);
    g.fillStyle = '#e8e2d4'; for (let x = 8; x < 52; x += 8) g.fillRect(x, 18, 4, 4);
    g.fillStyle = '#3a3330'; g.fillRect(10, 18, 2, 10); g.fillRect(44, 18, 2, 10);
    g.fillStyle = '#d98b3a'; g.fillRect(14, 22, 6, 4); g.fillStyle = '#c94a3a'; g.fillRect(24, 22, 6, 4);
  }
  return c;
}

export const CAR_COLORS = ['#e46aa6', '#8cc63f', '#e8e6e0', '#1e2228', '#c9c2b4', '#e46aa6'];

/** 대로를 따라 달리는 차 (i 축 방향, 길이 2타일) */
export function drawCar(color: string, taxi: boolean): { canvas: HTMLCanvasElement; ax: number; ay: number } {
  const L = 2, Wd = 0.8, hBody = 17, hCab = 14;
  const minX = (0 - Wd) * (TW / 2) - 2, topY = 0;
  const c = document.createElement('canvas');
  c.width = (L + Wd) * (TW / 2) + 4; c.height = (L + Wd) * (TH / 2) + hBody + hCab + 4;
  const g = c.getContext('2d')!;
  const zTop = hBody + hCab;
  const P = (x: number, y: number, z: number): [number, number] => [(x - y) * (TW / 2) - minX, (x + y) * (TH / 2) - topY + zTop - z + 2];
  const quad = (pts: [number, number][], fill: string) => { g.beginPath(); g.moveTo(...pts[0]); for (const p of pts.slice(1)) g.lineTo(...p); g.closePath(); g.fillStyle = fill; g.fill(); };
  const R = ramp(color);
  g.fillStyle = 'rgba(0,0,0,0.3)';
  quad([P(-0.05, -0.05, 0), P(L + 0.05, -0.05, 0), P(L + 0.05, Wd + 0.05, 0), P(-0.05, Wd + 0.05, 0)], 'rgba(0,0,0,0.3)');
  // 차체
  quad([P(0, Wd, hBody), P(L, Wd, hBody), P(L, Wd, 3), P(0, Wd, 3)], R[1]);
  quad([P(L, 0, hBody), P(L, Wd, hBody), P(L, Wd, 3), P(L, 0, 3)], R[0]);
  quad([P(0, 0, hBody), P(L, 0, hBody), P(L, Wd, hBody), P(0, Wd, hBody)], R[3]);
  // 캐빈
  const a = 0.5, bq = 1.5;
  quad([P(a, Wd - 0.08, zTop), P(bq, Wd - 0.08, zTop), P(bq + 0.15, Wd - 0.04, hBody), P(a - 0.2, Wd - 0.04, hBody)], '#2b3440');
  quad([P(bq, 0.08, zTop), P(bq, Wd - 0.08, zTop), P(bq + 0.15, Wd - 0.04, hBody), P(bq + 0.15, 0.04, hBody)], '#3a4656');
  quad([P(a, 0.08, zTop), P(bq, 0.08, zTop), P(bq, Wd - 0.08, zTop), P(a, Wd - 0.08, zTop)], R[2]);
  if (taxi) quad([P(0.9, 0.3, zTop + 4), P(1.15, 0.3, zTop + 4), P(1.15, 0.5, zTop + 4), P(0.9, 0.5, zTop + 4)], '#f2e6a0');
  // 바퀴
  g.fillStyle = '#141414';
  for (const s of [0.35, 1.6]) { const [x, y] = P(s, Wd, 3); g.fillRect(x - 5, y - 4, 10, 7); g.fillStyle = '#5a5a5a'; g.fillRect(x - 2, y - 2, 4, 3); g.fillStyle = '#141414'; }
  const [hx, hy] = P(L, Wd * 0.75, 10); g.fillStyle = '#f2ead0'; g.fillRect(hx - 2, hy - 1, 3, 2);
  // 차의 기준점: 차체 바닥 중심 (L/2, Wd/2)
  const [ax, ay] = P(L / 2, Wd / 2, 0);
  return { canvas: c, ax, ay };
}
