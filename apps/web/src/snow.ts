// 44차: 서울 겨울 눈 — 도심 바닥 · 지붕 · 처마에 쌓인 눈 (주인공의 동네 달동네는 더 많이)
import { iso, TW, TH } from './gfx.ts';
import { groundAt, type Zone, type Building } from './zone.ts';

const hash = (a: number, b: number, c = 0) => { let h = (a * 374761393 + b * 668265263 + c * 1274126177) | 0; h = (h ^ (h >>> 13)) * 1274126177; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };

/** 땅마다 눈이 덮인 정도: 공원·빈터는 거의 하얗고, 인도는 가장자리에 쌓이고, 찻길은 바퀴 자국 둘레에 질척한 눈만 */
const COVER: Partial<Record<string, number>> = { park: 0.82, hill: 0.86, lot: 0.74, soi: 0.5, walk: 0.34, median: 0.72, road: 0.12, cross: 0.06 };

/** 바닥 덩어리 그림 위에 눈을 얹는다 (그림이 있는 곳에만 — source-atop). 칸마다 자르지 않고 눈더미를 흩뿌려 경계가 자연스럽게 번진다 */
export function snowGround(c: HTMLCanvasElement, ox: number, oy: number, z: Zone, i0: number, j0: number, n: number, heavy: (i: number, j: number) => boolean) {
  const L = document.createElement('canvas');
  L.width = c.width; L.height = c.height;
  const g = L.getContext('2d')!;
  const blobs: [number, number, number, string][] = [];
  for (let j = j0; j < j0 + n; j++) for (let i = i0; i < i0 + n; i++) {
    const t = groundAt(z, i, j);
    let cov = COVER[t] ?? 0;
    if (cov <= 0) continue;
    if (heavy(i, j)) cov = Math.min(0.96, cov + 0.32);
    const [ax, ay] = iso(i, j);
    const x = ax - ox, y = ay - oy;
    const wet = t === 'road' || t === 'cross';
    if (cov >= 0.7) { // 수북한 땅: 칸 전체를 덮고, 군데군데 옅은 푸른 그늘만
      g.beginPath(); g.moveTo(x, y - 1); g.lineTo(x + TW / 2 + 1, y + TH / 2); g.lineTo(x, y + TH + 1); g.lineTo(x - TW / 2 - 1, y + TH / 2); g.closePath(); g.fillStyle = '#eef2f6'; g.fill();
      if (hash(i, j, 5) < 0.45) { g.fillStyle = 'rgba(184,200,218,0.32)'; g.beginPath(); g.ellipse(x + (hash(i, j, 6) - 0.5) * 24, y + TH / 2 + (hash(j, i, 6) - 0.5) * 10, 8 + hash(i, j, 9) * 8, 2.5, 0, 0, Math.PI * 2); g.fill(); }
      continue;
    }
    // 덜 덮인 땅: 넓적한 눈 자리 몇 개 (찻길은 가장자리 질척한 눈만)
    const nb = wet ? (hash(i, j, 2) < cov * 4 ? 1 : 0) : 1 + Math.round(cov * 3);
    for (let k = 0; k < nb; k++) {
      const h1 = hash(i, j, k * 3), h2 = hash(j, i, k * 3 + 1), h3 = hash(i + k, j - k, 7);
      const rx = wet ? 4 + h3 * 5 : 6 + h3 * 8;
      blobs.push([x + (h1 - 0.5) * TW * 0.6, y + TH / 2 + (h2 - 0.5) * TH * 0.5, rx, wet ? 'rgba(206,212,220,0.6)' : '#f0f4f8']);
    }
  }
  // 눈 자리는 동그라미 하나가 아니라 비스듬히 이어진 덩이 셋 — 쓸어 낸 눈이 길 따라 길게 남은 모양
  for (const [x, y, rx, col] of blobs) {
    g.fillStyle = col;
    const dir = hash(Math.round(x), Math.round(y), 3) < 0.5 ? 1 : -1;
    for (const [dx, r] of [[0, 1], [0.75, 0.62], [-0.7, 0.55]] as const) { g.beginPath(); g.ellipse(x + dx * rx, y + dx * rx * 0.5 * dir, rx * r, rx * r * 0.42, 0, 0, Math.PI * 2); g.fill(); }
  }
  g.fillStyle = 'rgba(176,192,212,0.35)';
  for (let k = 0; k < blobs.length; k += 3) { const [x, y, rx] = blobs[k]; g.fillRect(Math.round(x - rx * 0.6), Math.round(y + rx * 0.3), Math.round(rx * 1.1), 1); } // 눈 자리 아랫단 옅은 그늘 한 줄
  const cg = c.getContext('2d')!;
  cg.save(); cg.globalCompositeOperation = 'source-atop'; cg.drawImage(L, 0, 0); cg.restore();
}

/**
 * 건물 그림 위의 눈: 위가 트인 점(지붕 끝 · 난간 · 창턱 · 간판 위)에 두세 점 하얗게 쌓이고,
 * roof가 주어지면 평지붕 마름모 안에도 군데군데 (물탱크 · 실외기 위에도) 덮인다
 */
export function snowBuilding(src: HTMLCanvasElement, seed: number, heavy: boolean, roof?: { ox: number; oy: number; b: Building; z: number }): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = src.width; c.height = src.height;
  const g = c.getContext('2d')!;
  g.drawImage(src, 0, 0);
  if (roof) {
    const { b, z, ox, oy } = roof;
    const P = (x: number, y: number): [number, number] => { const [a, bb] = iso(x, y); return [a - ox, bb - z - oy]; };
    const L = document.createElement('canvas'); L.width = c.width; L.height = c.height;
    const lg = L.getContext('2d')!;
    const pts = [P(b.i0 + 0.15, b.j0 + 0.15), P(b.i0 + b.w - 0.15, b.j0 + 0.15), P(b.i0 + b.w - 0.15, b.j0 + b.d - 0.15), P(b.i0 + 0.15, b.j0 + b.d - 0.15)];
    lg.beginPath(); lg.moveTo(pts[0][0], pts[0][1]); for (const p of pts.slice(1)) lg.lineTo(p[0], p[1]); lg.closePath(); lg.clip();
    lg.fillStyle = '#eef2f6'; lg.fill();
    for (let k = 0; k < b.w + b.d; k++) { const [x, y] = P(b.i0 + hash(k, seed, 4) * b.w, b.j0 + hash(seed, k, 5) * b.d); lg.fillStyle = 'rgba(180,196,216,0.4)'; lg.fillRect(Math.round(x - 6), Math.round(y), 12, 1); } // 바람에 밀린 눈결
    g.save(); g.globalCompositeOperation = 'source-atop'; g.drawImage(L, 0, 0); g.restore();
  }
  // 위가 트인 점: 처마 · 난간 · 창턱
  const W = c.width, H = c.height;
  const im = g.getImageData(0, 0, W, H), D = im.data;
  const A = (x: number, y: number) => y >= 0 && D[(y * W + x) * 4 + 3] > 0;
  const amt = heavy ? 1 : 0.85;
  for (let y = 1; y < H; y++) for (let x = 0; x < W; x++) {
    const o = (y * W + x) * 4;
    if (!D[o + 3]) continue;
    const up = !A(x, y - 1) ? 0 : !A(x, y - 2) ? 1 : !A(x, y - 3) ? 2 : 9;
    if (up > 2) continue;
    if (hash(x >> 2, y >> 3, seed) > (up === 0 ? 0.95 : 0.8)) continue; // 군데군데 녹은 자리
    const k = (up === 0 ? 0.92 : up === 1 ? 0.78 : 0.45) * amt;
    D[o] = D[o] + (242 - D[o]) * k; D[o + 1] = D[o + 1] + (246 - D[o + 1]) * k; D[o + 2] = D[o + 2] + (250 - D[o + 2]) * k;
  }
  g.putImageData(im, 0, 0);
  return c;
}
