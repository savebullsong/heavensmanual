// 유황새 — 지옥의 우주새. 같은 작은 애완동물 가게지만 층이 깊을수록 낡고 망가졌다.
// 1층(재의 문턱): 그을음과 재 더미, 그을린 차양 끝, 문 옆 쇠사슬 등불 — 아직은 멀쩡한 편
// 2층(굶주림의 늪): 무릎까지 찬 진흙 자국과 흘러내린 물때, 이끼, 판자로 막은 위층 창, 지붕 구멍, 기댄 갈대 다발
// 3층(피의 시장): 금 간 회벽, 붉은 봉랍 낙인, 판자를 엇대어 막은 진열창, 처마와 차양에 매단 붉은 종이 등롱, 핏자국
import { TW, TH } from './gfx.ts';
import type { Building } from './zone.ts';
import { drawCosmicBird, COSMIC_TOP } from './ujusae.ts';

const G = 60, U = 34, TOP = G + U;
type Pt = [number, number];

function rng(seed: number) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

export function drawYuhwang(b: Building, floor: number): { canvas: HTMLCanvasElement; x: number; y: number } {
  const base = drawCosmicBird(b, true);
  const c = base.canvas, g = c.getContext('2d')!;
  const W = c.width, H = c.height;
  const { i0, j0, w, d } = b;
  const i1 = i0 + w, j1 = j0 + d, jm = (j0 + j1) / 2;
  const minX = base.x, minY = base.y;
  const P = (x: number, y: number, z: number): Pt => [(x - y) * (TW / 2) - minX, (x + y) * (TH / 2) - z - minY];
  const r = rng(floor * 977 + 31);
  const poly = (pts: Pt[], fill: string, alpha = 1) => {
    g.globalAlpha = alpha;
    g.beginPath(); g.moveTo(pts[0][0], pts[0][1]); for (const p of pts.slice(1)) g.lineTo(p[0], p[1]); g.closePath();
    g.fillStyle = fill; g.fill(); g.globalAlpha = 1;
  };
  const qL = (a: number, bb: number, z0: number, z1: number, fill: string, alpha = 1, dd = 0) => poly([P(a, j1 + dd, z0), P(bb, j1 + dd, z0), P(bb, j1 + dd, z1), P(a, j1 + dd, z1)], fill, alpha);
  const qR = (a: number, bb: number, z0: number, z1: number, fill: string, alpha = 1, dd = 0) => poly([P(i1 + dd, a, z0), P(i1 + dd, bb, z0), P(i1 + dd, bb, z1), P(i1 + dd, a, z1)], fill, alpha);
  const dot = (x: number, y: number, ww: number, hh: number, col: string, alpha = 1) => { g.globalAlpha = alpha; g.fillStyle = col; g.fillRect(Math.round(x), Math.round(y), ww, hh); g.globalAlpha = 1; };
  const line = (a: Pt, bb: Pt, col: string, wd = 1, alpha = 1) => { g.globalAlpha = alpha; g.strokeStyle = col; g.lineWidth = wd; g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(bb[0], bb[1]); g.stroke(); g.globalAlpha = 1; };

  // ① 건물 위에만 칠하기 (source-atop): 층마다 다른 때와 얼룩
  g.save();
  g.globalCompositeOperation = 'source-atop';
  if (floor === 1) {
    // 그을음: 창과 문 위로 번진 검은 연기 자국
    for (const [a, bb, z] of [[i0 + 0.12, i0 + 0.92, 56], [i0 + 1.08, i0 + 1.62, 40]] as const) {
      for (let k = 0; k < 6; k++) qL(a + k * 0.03, bb - k * 0.03, z + k * 3, z + 3 + k * 3, '#000', 0.13);
    }
    for (let k = 0; k < 5; k++) qR(j0 + 0.3 + k * 0.04, j0 + 1.6 - k * 0.04, 48 + k * 3, 51 + k * 3, '#000', 0.12);
    // 아래쪽 재: 회색 가루가 벽 밑동에 앉았다
    qL(i0, i1, 0, 7, '#8a847c', 0.45); qR(j0, j1, 0, 7, '#6a645c', 0.45);
  } else if (floor === 2) {
    // 진흙 자국: 무릎 높이까지 찼다가 빠진 흙탕물 띠 + 흘러내린 물때
    qL(i0, i1, 0, 15, '#3a3a1e', 0.62); qR(j0, j1, 0, 15, '#2e2e18', 0.62);
    qL(i0, i1, 14, 16, '#5a5430', 0.7); qR(j0, j1, 14, 16, '#4a4428', 0.7);
    for (let k = 0; k < 22; k++) {
      const onL = k % 2 === 0, t = r(), len = 8 + r() * 26, z0 = TOP - 4 - r() * 40;
      const [x0, y0] = onL ? P(i0 + 0.05 + t * (w - 0.1), j1, z0) : P(i1, j0 + 0.05 + t * (d - 0.1), z0);
      dot(x0, y0, 1, len, '#2a2a14', 0.35);
    }
    // 이끼: 처마 밑과 모서리에 초록 얼룩
    for (let k = 0; k < 40; k++) {
      const onL = r() < 0.5, t = r(), z = TOP - 2 - r() * 10;
      const [x0, y0] = onL ? P(i0 + t * w, j1, z) : P(i1, j0 + t * d, z);
      dot(x0, y0, 2 + Math.floor(r() * 3), 1 + Math.floor(r() * 2), r() < 0.5 ? '#4a6a2a' : '#5a7a34', 0.7);
    }
  } else if (floor >= 4) {
    // 29차 4층 비명의 용광로: 쇳가루 그을음 띠 + 벽 틈으로 새는 쇳물빛 실금
    qL(i0, i1, 0, 12, '#1a1210', 0.7); qR(j0, j1, 0, 12, '#140e0c', 0.7);
    for (let k = 0; k < 6; k++) { qL(i0 + 0.1 + k * 0.03, i1 - 0.1 - k * 0.03, 58 + k * 3, 61 + k * 3, '#000', 0.14); qR(j0 + 0.2, j1 - 0.2, 50 + k * 3, 53 + k * 3, '#000', 0.13); }
    for (let k = 0; k < 9; k++) {
      const onL = k < 5, t = 0.08 + r() * 0.84, z = 6 + r() * (TOP - 24);
      let p: Pt = onL ? P(i0 + t * w, j1, z) : P(i1, j0 + t * d, z);
      for (let s2 = 0; s2 < 7; s2++) { const q: Pt = [p[0] + (r() - 0.5) * 5, p[1] + 2 + r() * 4]; line(p, q, s2 % 3 === 0 ? '#ffb24a' : '#ff6a1a', 1, 0.9); p = q; }
    }
  } else {
    // 금 간 회벽: 검은 실금과 떨어져 나간 회칠 (속의 붉은 벽돌)
    for (const [a, bb, z0, z1, onL] of [[i0 + 0.05, i0 + 0.5, 64, 86, true], [i1 - 0.5, i1 - 0.1, 70, 90, true], [j0 + 0.1, j0 + 0.6, 56, 80, false], [j1 - 0.6, j1 - 0.15, 6, 30, false]] as const) {
      const x = a + r() * (bb - a), z = z0 + r() * (z1 - z0), ww = 0.12 + r() * 0.12, hh = 5 + r() * 6;
      if (onL) { qL(x, x + ww, z, z + hh, '#6a2a1e', 0.9); qL(x, x + ww, z + hh - 1, z + hh, '#2a1410', 0.8); }
      else { qR(x, x + ww, z, z + hh, '#5a2418', 0.9); qR(x, x + ww, z + hh - 1, z + hh, '#2a1410', 0.8); }
    }
    for (let k = 0; k < 7; k++) {
      const onL = k < 4, t = 0.08 + r() * 0.84, z = 8 + r() * (TOP - 20);
      let p: Pt = onL ? P(i0 + t * w, j1, z) : P(i1, j0 + t * d, z);
      for (let s = 0; s < 6; s++) { const q: Pt = [p[0] + (r() - 0.5) * 5, p[1] + 2 + r() * 4]; line(p, q, '#140808', 1, 0.75); p = q; }
    }
    // 핏자국: 벽 밑동에 튀고 흘러내린 자국
    for (let k = 0; k < 9; k++) {
      const onL = r() < 0.6, t = r(), z = 1 + r() * 16;
      const [x0, y0] = onL ? P(i0 + t * w, j1, z) : P(i1, j0 + t * d, z);
      dot(x0, y0, 2 + Math.floor(r() * 4), 2, '#5a0606', 0.8); dot(x0 + 1, y0 + 2, 1, 2 + Math.floor(r() * 5), '#4a0404', 0.75);
    }
  }
  // 층이 깊을수록 전체가 어둡고 칙칙하다
  g.fillStyle = floor === 1 ? 'rgba(30,20,16,0.12)' : floor === 2 ? 'rgba(20,26,10,0.22)' : floor >= 4 ? 'rgba(34,14,6,0.3)' : 'rgba(40,8,6,0.28)';
  g.fillRect(0, 0, W, H);
  g.restore();
  // 빛바랜 색: 층이 깊을수록 색이 빠지고 그 층의 빛(재·늪·피)으로 물든다
  {
    const [sat, tr, tg, tb, dim] = floor === 1 ? [0.5, 1.05, 0.95, 0.88, 0.86] : floor === 2 ? [0.35, 0.92, 1.0, 0.72, 0.74] : floor >= 4 ? [0.3, 1.1, 0.86, 0.72, 0.68] : [0.4, 1.12, 0.78, 0.7, 0.72];
    const im = g.getImageData(0, 0, W, H), D = im.data;
    for (let k = 0; k < D.length; k += 4) {
      if (!D[k + 3]) continue;
      const lum = D[k] * 0.3 + D[k + 1] * 0.59 + D[k + 2] * 0.11;
      const hot = Math.max(D[k], D[k + 1], D[k + 2]) > 200 && D[k] > D[k + 2] + 40; // 창의 불빛은 남긴다
      const s2 = hot ? 0.85 : sat, dm = hot ? 1 : dim;
      D[k] = Math.min(255, (lum + (D[k] - lum) * s2) * tr * dm);
      D[k + 1] = Math.min(255, (lum + (D[k + 1] - lum) * s2) * tg * dm);
      D[k + 2] = Math.min(255, (lum + (D[k + 2] - lum) * s2) * tb * dm);
    }
    g.putImageData(im, 0, 0);
  }

  // ② 덧붙인 것들 (건물 밖으로 나와도 되는 것)
  if (floor === 1) {
    // 벽 밑동의 재 더미
    for (let k = 0; k < 7; k++) {
      const onL = k < 4, t = r();
      const [x0, y0] = onL ? P(i0 + 0.1 + t * (w - 0.2), j1 + 0.06, 0) : P(i1 + 0.06, j0 + 0.1 + t * (d - 0.2), 0);
      const rw = 5 + r() * 6;
      g.fillStyle = '#7a746c'; g.beginPath(); g.ellipse(x0, y0, rw, rw * 0.42, 0, Math.PI, 0); g.fill();
      g.fillStyle = '#9a948a'; g.beginPath(); g.ellipse(x0 - 1, y0 - 1, rw * 0.6, rw * 0.22, 0, Math.PI, 0); g.fill();
    }
    // 그을린 차양 끝 (검게 탄 물결)
    for (let k = 0; k < 9; k++) { const [x0, y0] = P(i0 + 0.08 + k * 0.1, j1 + 0.27, G - 13); dot(x0, y0, 3, 2, '#1a1410', 0.8); }
    // 문 옆 쇠사슬 등불 (붉은 불씨)
    const [lx, ly] = P(i0 + w / 2 + 0.72, j1 + 0.12, 46);
    for (let k = 0; k < 4; k++) dot(lx, ly - 10 + k * 2.5, 1, 2, '#3a3632');
    dot(lx - 2, ly, 5, 6, '#2a2420'); dot(lx - 1, ly + 1, 3, 4, '#ff7a2a'); dot(lx, ly + 2, 1, 2, '#ffd08a');
  } else if (floor === 2) {
    // 위층 오른쪽 좁은 창: 판자 두 장을 엇대어 못질
    for (const [z0, z1] of [[G + 10, G + 16], [G + 20, G + 25]] as const) poly([P(i1 + 0.03, j0 + 0.6, z0), P(i1 + 0.03, j0 + 1.36, z1), P(i1 + 0.03, j0 + 1.36, z1 + 4), P(i1 + 0.03, j0 + 0.6, z0 + 4)], '#5a4a30');
    // 지붕 구멍 둘 (썩어 내려앉음)
    for (const [x, y] of [[i0 + 0.5, jm + 0.35], [i0 + 1.5, jm + 0.6]] as const) { const [hx, hy] = P(x, y, TOP + 26 - (y - jm) * 26); g.fillStyle = '#100c08'; g.beginPath(); g.ellipse(hx, hy, 4, 2.2, 0.4, 0, Math.PI * 2); g.fill(); dot(hx - 3, hy - 2, 2, 1, '#4a3a24'); }
    // 처마에서 늘어진 이끼 가닥
    for (let k = 0; k < 10; k++) { const [x0, y0] = P(i0 + 0.05 + k * 0.19, j1 + 0.12, TOP - 2); dot(x0, y0, 1, 3 + Math.floor(r() * 7), '#3e5a24', 0.85); }
    // 벽에 기댄 갈대 다발과 진흙 웅덩이
    for (let k = 0; k < 2; k++) {
      const [x0, y0] = P(i1 + 0.05, j0 + 0.25 + k * 1.2, 0);
      for (let s = 0; s < 6; s++) line([x0 + s - 3, y0], [x0 + s * 1.6 - 1, y0 - 20 - r() * 8], s % 2 ? '#8a8a4a' : '#6a6a34', 1);
    }
    g.fillStyle = 'rgba(40,38,20,0.75)'; { const [x0, y0] = P(i0 + 0.7, j1 + 0.25, 0); g.beginPath(); g.ellipse(x0, y0, 14, 4, 0, 0, Math.PI * 2); g.fill(); }
  } else if (floor >= 4) {
    // 29차 4층: 문 옆에 식어 가는 쇳물 찌꺼기 더미 · 처마에 늘어진 쇠사슬 · 진열창 위 쇠판
    for (const [x, y] of [[i0 + 0.35, j1 + 0.25], [i1 + 0.22, j0 + 0.5]] as const) {
      const [x0, y0] = P(x, y, 0);
      g.fillStyle = '#2a201c'; g.beginPath(); g.ellipse(x0, y0, 9, 3.6, 0, Math.PI, 0); g.fill();
      dot(x0 - 4, y0 - 3, 3, 1, '#ff7a2a'); dot(x0 + 1, y0 - 2, 2, 1, '#ffb24a'); dot(x0 + 4, y0 - 1, 2, 1, '#c8401a');
    }
    for (let k = 0; k < 6; k++) { const [x0, y0] = P(i0 + 0.15 + k * 0.33, j1 + 0.12, TOP - 2); for (let c2 = 0; c2 < 3 + (k % 3); c2++) dot(x0, y0 + c2 * 3, 2, 2, c2 % 2 ? '#3a3430' : '#5a524a'); }
    poly([P(i0 + 0.14, j1 + 0.04, 40), P(i0 + 0.86, j1 + 0.04, 40), P(i0 + 0.86, j1 + 0.04, 46), P(i0 + 0.14, j1 + 0.04, 46)], '#3a3632');
    for (const x of [i0 + 0.2, i0 + 0.5, i0 + 0.8]) { const [nx, ny] = P(x, j1 + 0.05, 43); dot(nx, ny, 1, 1, '#8a8278'); }
    g.globalAlpha = 0.35; g.fillStyle = '#ff6a1a'; { const [x0, y0] = P(i0 + 1.35, j1 + 0.35, 0); g.beginPath(); g.ellipse(x0, y0, 12, 4, 0, 0, Math.PI * 2); g.fill(); } g.globalAlpha = 1;
  } else {
    // 진열창을 판자 엇대어 막았다
    for (const [za, zb] of [[12, 44], [44, 14]] as const) poly([P(i0 + 0.16, j1 + 0.04, za), P(i0 + 0.84, j1 + 0.04, zb), P(i0 + 0.84, j1 + 0.04, zb + 5), P(i0 + 0.16, j1 + 0.04, za + 5)], '#4a3424');
    for (const x of [i0 + 0.2, i0 + 0.8]) { const [nx, ny] = P(x, j1 + 0.05, 30); dot(nx, ny, 1, 1, '#c9a23e'); }
    // 붉은 봉랍 낙인 (빚 문서처럼 벽에 찍힌 인장)
    for (const [x, z, onL] of [[i0 + 1.75, 30, true], [j0 + 0.2, 70, false], [j0 + 1.75, 22, false]] as const) {
      const [sx, sy] = onL ? P(x, j1 + 0.01, z) : P(i1 + 0.01, x, z);
      g.fillStyle = '#a8160e'; g.beginPath(); g.ellipse(sx, sy, 3.2, 2.6, 0, 0, Math.PI * 2); g.fill();
      dot(sx - 1, sy - 1, 2, 1, '#e84a2a'); dot(sx, sy + 2, 1, 3, '#a8160e');
    }
    // 처마와 차양 끝에 매단 붉은 종이 등롱 (안에 불)
    const lantern = (x: number, y: number) => {
      dot(x, y - 6, 1, 6, '#2a1410');
      g.globalAlpha = 0.28; g.fillStyle = '#ff5a2a'; g.beginPath(); g.ellipse(x, y + 4, 9, 7, 0, 0, Math.PI * 2); g.fill(); g.globalAlpha = 1;
      dot(x - 3, y, 7, 8, '#c8180e'); dot(x - 2, y - 1, 5, 10, '#c8180e'); dot(x - 1, y + 1, 3, 6, '#ff6a3a'); dot(x, y + 2, 1, 3, '#ffd08a');
      dot(x - 2, y - 2, 5, 1, '#2a1410'); dot(x - 2, y + 9, 5, 1, '#2a1410'); dot(x, y + 10, 1, 3, '#e0b437');
    };
    for (const x of [i0 + 0.15, i0 + 1.0, i0 + 1.85]) { const [lx, ly] = P(x, j1 + 0.14, TOP - 6); lantern(lx, ly); }
    { const [lx, ly] = P(i0 + 0.5, j1 + 0.3, G - 22); lantern(lx, ly); }
    for (const y of [j0 + 0.4, j0 + 1.5]) { const [lx, ly] = P(i1 + 0.14, y, TOP - 6); lantern(lx, ly); }
    // 문 앞 핏물 웅덩이
    g.fillStyle = 'rgba(70,4,4,0.8)'; { const [x0, y0] = P(i0 + 1.35, j1 + 0.35, 0); g.beginPath(); g.ellipse(x0, y0, 10, 3.5, 0, 0, Math.PI * 2); g.fill(); }
  }
  void COSMIC_TOP;
  return base;
}
