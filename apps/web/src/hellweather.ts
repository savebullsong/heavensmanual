// 17차: 지옥 건물에 층의 흔적을 입힌다 (유황새만이 아니라 은행·회당·대부소·좌판·감옥·뼈집 모두)
// 1층 재의 문턱 — 화산재: 지붕·처마·창턱 위에 쌓인 잿빛 재, 벽을 뒤덮은 재 가루, 밑동의 재 더미, 그을음으로 바랜 색
// 2층 굶주림의 늪 — 녹색 이끼와 진흙: 무릎까지 찬 진흙 띠와 튄 자국, 밑동과 그늘진 틈의 이끼 덩어리, 위에서 흘러내린 물때
// 3층 피의 시장 — 핏빛과 홍등: 붉게 물든 벽, 처마에서 흘러내린 핏자국과 튄 피, 처마 끝에 매단 붉은 종이 등롱
// 그림은 건드리지 않고 새 캔버스에 (같은 그림을 여러 번 칠하지 않게)

function rng(seed: number) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const hash = (a: number, b: number, c = 0) => { let h = (a * 374761393 + b * 668265263 + c * 1274126177) | 0; h = (h ^ (h >>> 13)) * 1274126177; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
/** 부드러운 덩어리 잡음 (이끼·재가 무리 지어 붙게) */
function blobNoise(x: number, y: number, s: number, seed: number) {
  const xi = Math.floor(x / s), yi = Math.floor(y / s), fx = x / s - xi, fy = y / s - yi;
  const sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy);
  const h = (a: number, b: number) => hash(a, b, seed);
  return (h(xi, yi) * (1 - sx) + h(xi + 1, yi) * sx) * (1 - sy) + (h(xi, yi + 1) * (1 - sx) + h(xi + 1, yi + 1) * sx) * sy;
}

export function weatherHell(src: HTMLCanvasElement, floor: number, seed: number, opts: { lanterns?: boolean } = {}): HTMLCanvasElement {
  const W = src.width, H = src.height;
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const g = c.getContext('2d')!;
  g.drawImage(src, 0, 0);
  const im = g.getImageData(0, 0, W, H), D = im.data;
  const A = (x: number, y: number) => x >= 0 && y >= 0 && x < W && y < H && D[(y * W + x) * 4 + 3] > 0;
  // 칸마다: 위로 몇 점 비었나(위가 열린 면 = 재·이끼가 쌓이는 곳) · 아래로 몇 점 남았나(밑동까지 거리)
  const top = new Int16Array(W).fill(-1), bot = new Int16Array(W).fill(-1);
  for (let x = 0; x < W; x++) { for (let y = 0; y < H; y++) if (A(x, y)) { if (top[x] < 0) top[x] = y; bot[x] = y; } }
  const r = rng(seed * 7 + floor * 131);
  const mix = (o: number, col: [number, number, number], t: number) => { D[o] += (col[0] - D[o]) * t; D[o + 1] += (col[1] - D[o + 1]) * t; D[o + 2] += (col[2] - D[o + 2]) * t; };
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const o = (y * W + x) * 4;
    if (!D[o + 3]) continue;
    const upOpen = !A(x, y - 1) ? 0 : !A(x, y - 2) ? 1 : !A(x, y - 3) ? 2 : 9; // 위가 트인 정도 (0 = 바로 위가 빈 점)
    const toBase = bot[x] - y; // 밑동까지
    const lum = (D[o] + D[o + 1] + D[o + 2]) / 3;
    if (floor === 1) {
      // 그을음으로 바랜 색 (채도 낮추고 조금 어둡게)
      mix(o, [lum * 0.92, lum * 0.9, lum * 0.88], 0.38);
      // 쌓인 재: 위가 트인 면 두세 점
      if (upOpen <= 2) mix(o, [138, 133, 126], upOpen === 0 ? 0.85 : upOpen === 1 ? 0.6 : 0.3);
      // 벽을 뒤덮은 재 가루 (덩어리로)
      const n = blobNoise(x, y, 7, seed);
      if (n > 0.6) mix(o, [112, 108, 102], Math.min(0.55, (n - 0.6) * 1.8));
      if (hash(x, y, seed) < 0.012 && blobNoise(x, y, 5, seed + 3) > 0.5) mix(o, [160, 154, 146], 0.55);
      // 밑동의 재 더미 (아래 네 점은 거의 재)
      if (toBase < 5) mix(o, [96, 92, 88], 0.55 - toBase * 0.08);
    } else if (floor === 2) {
      mix(o, [lum * 0.9, lum * 0.98, lum * 0.86], 0.2); // 축축한 녹회색
      // 무릎까지 찬 진흙 띠 (위 경계는 물결 모양)
      const mudLine = 9 + Math.sin(x * 0.4 + seed) * 2 + hash(x >> 2, 3, seed) * 2;
      if (toBase < mudLine) mix(o, [58, 46, 30], toBase < mudLine - 2 ? 0.68 : 0.4);
      // 튄 진흙
      if (toBase < mudLine + 8 && hash(x, y, seed + 2) < 0.06) mix(o, [52, 40, 26], 0.8);
      // 이끼: 밑동 가까이와 위가 트인 면, 덩어리 잡음으로
      const n = blobNoise(x, y, 6, seed + 11);
      const near = toBase < 18 ? 1 : upOpen <= 1 ? 0.9 : 0.35;
      if (n * near > 0.48) mix(o, n > 0.7 ? [86, 112, 46] : [58, 82, 34], Math.min(0.85, (n * near - 0.48) * 3));
      if (n * near > 0.6 && hash(x, y, seed + 5) < 0.2) mix(o, [120, 146, 60], 0.6); // 이끼 끝의 밝은 점
    } else if (floor === 5) {
      // 43차 가면의 도시: 핏기 없이 하얗게 분칠한 벽 — 색을 빼고 흰 가루를 덮는다. 밑동엔 먹물이 번진다
      mix(o, [lum * 1.02 + 18, lum + 16, lum * 0.98 + 20], 0.42);
      if (upOpen <= 1) mix(o, [236, 230, 220], upOpen === 0 ? 0.7 : 0.4);
      const n = blobNoise(x, y, 9, seed + 23);
      if (n > 0.68) mix(o, [222, 214, 204], Math.min(0.5, (n - 0.68) * 2.2));
      if (toBase < 5) mix(o, [34, 30, 40], 0.5 - toBase * 0.08);
    } else {
      // 핏빛: 벽 전체를 붉게 물들인다
      mix(o, [Math.min(255, D[o] * 1.05 + 12), D[o + 1] * 0.72, D[o + 2] * 0.68], 0.5);
      const n = blobNoise(x, y, 8, seed + 17);
      if (n > 0.66) mix(o, [96, 10, 8], (n - 0.66) * 2);
      if (toBase < 6) mix(o, [70, 8, 6], 0.45); // 밑동에 고인 피
    }
    if (D[o + 3] < 255) D[o + 3] = 255;
  }
  // 흘러내림: 2층 물때(검녹색) · 3층 핏자국 — 위가 트인 점에서 아래로
  if (floor >= 2) {
    const n = Math.round(W * (floor === 3 ? 0.22 : 0.16));
    for (let k = 0; k < n; k++) {
      const x = Math.floor(r() * W);
      if (top[x] < 0) continue;
      let y = top[x] + 2 + Math.floor(r() * Math.max(1, (bot[x] - top[x]) * 0.5));
      const len = 5 + Math.floor(r() * (floor === 3 ? 22 : 16));
      const col: [number, number, number] = floor === 3 ? [120 + Math.floor(r() * 30), 8, 6] : floor === 5 ? [28, 24, 34] : [30, 44, 26]; // 43차: 5층은 먹물 자국
      for (let s = 0; s < len && y < bot[x] - 1; s++, y++) {
        if (!A(x, y)) break;
        const o = (y * W + x) * 4;
        mix(o, col, 0.75 * (1 - s / len) + 0.2);
      }
    }
    if (floor === 3) for (let k = 0; k < W * 0.1; k++) { // 튄 피
      const x = Math.floor(r() * W), y = Math.floor(r() * H);
      for (const [dx, dy] of [[0, 0], [1, 0], [0, 1], [-1, 0], [0, -1]]) if (A(x + dx, y + dy) && (dx === 0 && dy === 0 || r() < 0.5)) mix(((y + dy) * W + x + dx) * 4, [110, 6, 4], 0.85);
    }
  }
  g.putImageData(im, 0, 0);
  // 3층: 처마 끝에 매단 붉은 종이 등롱 (안쪽 촛불, 늘어진 술)
  if (floor === 3 && opts.lanterns !== false) {
    const xs = [0.22, 0.5, 0.78].map((f) => Math.floor(W * f));
    for (const x0 of xs) {
      if (top[x0] < 0) continue;
      const y0 = top[x0] + Math.max(6, Math.round((bot[x0] - top[x0]) * 0.28));
      if (y0 + 9 > bot[x0]) continue;
      g.fillStyle = '#1a0c08'; g.fillRect(x0, y0 - 4, 1, 4);                                    // 끈
      g.fillStyle = '#6a0a08'; g.fillRect(x0 - 3, y0, 7, 7);                                    // 등롱 몸
      g.fillStyle = '#d8281e'; g.fillRect(x0 - 2, y0, 5, 7); g.fillRect(x0 - 3, y0 + 1, 7, 5);
      g.fillStyle = '#ff8a4a'; g.fillRect(x0 - 1, y0 + 2, 2, 3);                                // 촛불 빛
      g.fillStyle = '#2a0c08'; g.fillRect(x0 - 2, y0 - 1, 5, 1); g.fillRect(x0 - 2, y0 + 7, 5, 1); // 위아래 테
      g.fillStyle = '#c9a23e'; g.fillRect(x0, y0 + 8, 1, 3);                                    // 술
      g.save(); g.globalCompositeOperation = 'source-atop'; g.globalAlpha = 0.3; g.fillStyle = '#ff5a3a'; g.fillRect(x0 - 6, y0 - 3, 13, 13); g.restore(); // 벽에 번진 빛
    }
  }
  return c;
}
