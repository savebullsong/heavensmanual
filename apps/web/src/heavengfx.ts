// 천국 그림: 천사·황색날개의 날개 (2배 밀도로 그려 반으로 줄임), 화면 가장자리를 흐르는 구름
import { Texture } from 'pixi.js';

const wingCache = new Map<number, Texture>();
/** 34차: 펼친 두 날개 한 쌍 — 어깨에서 위로 솟은 날개뼈(손목)를 지나 바깥으로 뻗고, 깃은 아래로 드리운다.
 *  뒤 칼깃(첫째 깃, 가장 길고 어둡게) → 둘째 깃 → 덮깃(짧은 비늘) → 날개뼈 띠 순서로 겹친다. 깃 끝은 뾰족하게 */
export function wingTexture(color: number): Texture {
  const hit = wingCache.get(color);
  if (hit) return hit;
  const W = 124, H = 96, cx = W / 2, ay = Math.round(H * 0.62); // 기준점(어깨) = (cx, ay)
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const g = c.getContext('2d')!;
  const rgb = [(color >> 16) & 255, (color >> 8) & 255, color & 255];
  const col = (k: number) => `rgb(${Math.min(255, Math.round(rgb[0] * k))},${Math.min(255, Math.round(rgb[1] * k))},${Math.min(255, Math.round(rgb[2] * k))})`;
  const lerp = (a: [number, number], b: [number, number], t: number): [number, number] => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
  /** 깃 하나: 밑동 b에서 각도 th(아래가 0, 바깥이 +) 쪽으로 길이 L, 폭 w — 끝이 뾰족한 잎 모양 */
  const feather = (b: [number, number], sd: number, th: number, L: number, w: number, k: number) => {
    const dx = Math.sin(th) * sd, dy = Math.cos(th);
    const px = -dy * sd, py = dx * sd; // 깃의 옆 방향
    const tip: [number, number] = [b[0] + dx * L, b[1] + dy * L];
    const m = (f: number, s: number): [number, number] => [b[0] + dx * L * f + px * w * s, b[1] + dy * L * f + py * w * s];
    g.beginPath();
    g.moveTo(...m(0, -0.5));
    g.quadraticCurveTo(...m(0.55, -0.62), ...m(0.86, -0.32));
    g.lineTo(...tip);
    g.lineTo(...m(0.86, 0.36));
    g.quadraticCurveTo(...m(0.5, 0.6), ...m(0, 0.5));
    g.closePath();
    g.fillStyle = col(k); g.fill();
    g.strokeStyle = col(k * 0.68); g.lineWidth = 1.4; g.stroke();
    // 깃대 (밝은 가는 줄)
    g.strokeStyle = col(k * 1.08); g.lineWidth = 0.9;
    g.beginPath(); g.moveTo(...m(0.08, 0)); g.lineTo(...m(0.78, 0)); g.stroke();
  };
  for (const sd of [-1, 1]) {
    const S: [number, number] = [cx + sd * 7, ay - 4]; // 어깨 (등에 붙는 곳)
    const Wr: [number, number] = [cx + sd * 33, ay - 46]; // 날개뼈 손목 (가장 높은 곳)
    const T: [number, number] = [cx + sd * 56, ay - 30]; // 첫째 깃이 붙는 바깥 끝
    // 1) 첫째 깃 (칼깃): 손목에서 바깥 끝까지, 바깥으로 갈수록 길고 바깥으로 눕는다
    for (let f = 0; f < 6; f++) { const t = f / 5; feather(lerp(Wr, T, t), sd, 0.18 + t * 0.5, 44 + t * 14, 9, 0.8); }
    // 2) 둘째 깃: 어깨에서 손목까지, 아래로 곧게 (어깨 쪽은 짧게)
    for (let f = 0; f < 6; f++) { const t = 0.12 + (f / 5) * 0.88; feather(lerp(S, Wr, t), sd, 0.04 + t * 0.16, 16 + t * 30, 10, 0.9); }
    // 3) 덮깃: 날개뼈 바로 밑의 짧은 비늘 깃 두 줄
    for (let f = 0; f < 7; f++) { const t = f / 6; const b = t < 0.6 ? lerp(S, Wr, 0.25 + t / 0.6 * 0.75) : lerp(Wr, T, (t - 0.6) / 0.4 * 0.7); feather([b[0], b[1] + 3], sd, 0.1 + t * 0.35, 18, 9, 0.97); }
    for (let f = 0; f < 6; f++) { const t = f / 5; const b = lerp(S, Wr, 0.35 + t * 0.65); feather([b[0] + sd * 1, b[1] + 1], sd, 0.12 + t * 0.2, 10, 8, 1.04); }
    // 4) 날개뼈 띠: 어깨 → 손목 → 바깥 끝 (둥글고 굵게)
    g.lineCap = 'round'; g.lineJoin = 'round';
    g.strokeStyle = col(0.7); g.lineWidth = 8;
    g.beginPath(); g.moveTo(...S); g.quadraticCurveTo(cx + sd * 12, ay - 40, ...Wr); g.quadraticCurveTo(cx + sd * 46, ay - 46, ...T); g.stroke();
    g.strokeStyle = col(1.06); g.lineWidth = 5.5;
    g.beginPath(); g.moveTo(...S); g.quadraticCurveTo(cx + sd * 12, ay - 40, ...Wr); g.quadraticCurveTo(cx + sd * 46, ay - 46, ...T); g.stroke();
  }
  // 점 그림처럼: 반투명 가장자리 정리 + 어두운 외곽선
  const im = g.getImageData(0, 0, W, H), D = im.data;
  for (let k = 3; k < D.length; k += 4) D[k] = D[k] < 110 ? 0 : 255;
  const solid = (x: number, y: number) => x >= 0 && y >= 0 && x < W && y < H && D[(y * W + x) * 4 + 3] > 0;
  const out: number[] = [];
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (!solid(x, y) && (solid(x - 1, y) || solid(x + 1, y) || solid(x, y - 1) || solid(x, y + 1))) out.push(x, y);
  for (let k = 0; k < out.length; k += 2) { const o = (out[k + 1] * W + out[k]) * 4; D[o] = Math.round(rgb[0] * 0.35); D[o + 1] = Math.round(rgb[1] * 0.33); D[o + 2] = Math.round(rgb[2] * 0.3); D[o + 3] = 255; }
  g.putImageData(im, 0, 0);
  const t = Texture.from(c);
  t.source.scaleMode = Math.min(2, window.devicePixelRatio || 1) >= 2 ? 'nearest' : 'linear';
  wingCache.set(color, t);
  return t;
}

let cloud: Texture | null = null;
/** 부드러운 구름 덩어리 (여러 원을 겹친 흰 빛) */
export function cloudTexture(): Texture {
  if (cloud) return cloud;
  const W = 360, H = 172; // 32차: 아래 구름 덩이(110+55)가 잘려 가로 금이 보이던 것 — 아래를 넉넉히
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const g = c.getContext('2d')!;
  const puffs: [number, number, number][] = [[90, 90, 60], [160, 70, 70], [240, 88, 62], [300, 100, 45], [60, 108, 40], [200, 110, 55]];
  for (const [x, y, r] of puffs) {
    const gr = g.createRadialGradient(x, y, r * 0.2, x, y, r);
    gr.addColorStop(0, 'rgba(255,253,246,0.95)');
    gr.addColorStop(0.6, 'rgba(255,250,238,0.6)');
    gr.addColorStop(1, 'rgba(255,248,232,0)');
    g.fillStyle = gr;
    g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill();
  }
  cloud = Texture.from(c);
  return cloud;
}

let vig: Texture | null = null;
/** 화면 가장자리의 흰 구름 안개 (가운데는 투명) */
export function heavenVignette(): Texture {
  if (vig) return vig;
  const W = 256, H = 256;
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const g = c.getContext('2d')!;
  const gr = g.createRadialGradient(W / 2, H / 2, W * 0.3, W / 2, H / 2, W * 0.72);
  gr.addColorStop(0, 'rgba(255,252,242,0)');
  gr.addColorStop(0.6, 'rgba(255,250,236,0.35)');
  gr.addColorStop(1, 'rgba(255,248,230,0.8)');
  g.fillStyle = gr;
  g.fillRect(0, 0, W, H);
  vig = Texture.from(c);
  return vig;
}

/**
 * 19차: 거리의 '구름 계단' — 환생의 테라스(환생관 루엔)로 올라가는 길.
 * 흰 대리석 디딤돌이 구름을 딛고 뒤쪽 위로 비스듬히 이어지고, 꼭대기는 금빛 테두리의 구름 뭉치에 닿는다. 위에서 빛 한 줄기
 */
let stairTex: Texture | null = null;
export function cloudStairTexture(): Texture {
  if (stairTex) return stairTex;
  const W = 120, H = 190;
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const g = c.getContext('2d')!;
  const puff = (x: number, y: number, r: number, a = 1) => {
    x = Math.round(x); y = Math.round(y);
    g.globalAlpha = a;
    g.fillStyle = '#cfd3e2'; g.beginPath(); g.ellipse(x, y + r * 0.22, r, r * 0.6, 0, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#f4f3f0'; g.beginPath(); g.ellipse(x - r * 0.06, y, r * 0.94, r * 0.56, 0, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#ffffff'; g.beginPath(); g.ellipse(x - r * 0.28, y - r * 0.2, r * 0.52, r * 0.3, 0, 0, Math.PI * 2); g.fill();
    g.globalAlpha = 1;
  };
  // 위에서 내려오는 빛 한 줄기
  const beam = g.createLinearGradient(0, 0, 0, H);
  beam.addColorStop(0, 'rgba(255,248,220,0.55)'); beam.addColorStop(0.7, 'rgba(255,248,220,0.12)'); beam.addColorStop(1, 'rgba(255,248,220,0)');
  g.fillStyle = beam;
  g.beginPath(); g.moveTo(62, 0); g.lineTo(96, 0); g.lineTo(86, H - 20); g.lineTo(40, H - 20); g.closePath(); g.fill();
  // 꼭대기 구름 뭉치 (금빛 테)
  puff(78, 34, 26); puff(56, 40, 20); puff(98, 44, 18);
  g.strokeStyle = '#d9b44a'; g.lineWidth = 1;
  g.beginPath(); g.ellipse(76, 40, 34, 13, 0, 0.15, Math.PI - 0.15); g.stroke();
  // 디딤돌 일곱: 앞 아래(바닥)에서 뒤 위로. 돌마다 밑에 작은 구름
  for (let k = 6; k >= 0; k--) {
    const x = 30 + k * 6.5, y = H - 22 - k * 19;
    puff(x + 4, y + 9, 10, 0.95);
    g.fillStyle = '#d8d2c6'; g.fillRect(Math.round(x) - 13, Math.round(y) + 2, 27, 4); // 옆면
    g.fillStyle = '#f6f3ec'; g.beginPath(); g.moveTo(x - 14, y + 2); g.lineTo(x, y - 5); g.lineTo(x + 14, y + 2); g.lineTo(x, y + 8); g.closePath(); g.fill(); // 윗면 (마름모)
    g.fillStyle = '#d9b44a'; g.fillRect(Math.round(x) - 13, Math.round(y) + 5, 27, 1); // 금띠
  }
  // 바닥 구름
  puff(30, H - 10, 22); puff(52, H - 6, 16); puff(14, H - 4, 12);
  // 반짝임
  g.fillStyle = '#ffffff';
  for (const [x, y] of [[70, 70], [48, 104], [88, 92], [64, 136], [40, 60]]) { g.fillRect(x, y, 1, 1); g.fillRect(x - 1, y + 1, 3, 1); g.fillRect(x, y + 2, 1, 1); }
  stairTex = Texture.from(c);
  return stairTex;
}

/** 환생의 테라스 둘레 하늘: 위는 맑은 하늘빛, 아래로 갈수록 따뜻한 흰빛 (단 아래 구름 바다) */
let skyTex: Texture | null = null;
export function terraceSkyTexture(): Texture {
  if (skyTex) return skyTex;
  const c = document.createElement('canvas');
  c.width = 4; c.height = 256;
  const g = c.getContext('2d')!;
  const gr = g.createLinearGradient(0, 0, 0, 256);
  gr.addColorStop(0, '#8fb4e0'); gr.addColorStop(0.45, '#c4d8ee'); gr.addColorStop(0.75, '#e8e8ec'); gr.addColorStop(1, '#ddd8d2');
  g.fillStyle = gr; g.fillRect(0, 0, 4, 256);
  skyTex = Texture.from(c);
  return skyTex;
}

/**
 * 20차: 천국 가장자리의 거대한 지옥문 — 검게 그을린 바위 고리에 뿔처럼 솟은 가시, 안쪽은 붉은 소용돌이.
 * 장면 셋(소용돌이가 돈다)과 아래로 번지는 핏빛 기운
 */
const portalTex: Texture[] = [];
export function hellPortalTexture(k: number): Texture {
  if (portalTex.length) return portalTex[k % 3];
  for (let f = 0; f < 3; f++) {
    const W = 240, H = 330, cx = W / 2, cy = 168, rx = 82, ry = 128;
    const c = document.createElement('canvas');
    c.width = W; c.height = H;
    const g = c.getContext('2d')!;
    // 바닥의 붉은 기운
    const fl = g.createRadialGradient(cx, H - 24, 4, cx, H - 24, 120);
    fl.addColorStop(0, 'rgba(255,70,30,0.55)'); fl.addColorStop(1, 'rgba(255,40,20,0)');
    g.fillStyle = fl; g.beginPath(); g.ellipse(cx, H - 24, 120, 34, 0, 0, Math.PI * 2); g.fill();
    // 소용돌이 (안쪽)
    const vg = g.createRadialGradient(cx, cy, 6, cx, cy, ry);
    vg.addColorStop(0, '#ffd08a'); vg.addColorStop(0.18, '#ff6a2a'); vg.addColorStop(0.5, '#b8160e'); vg.addColorStop(0.85, '#3a0606'); vg.addColorStop(1, '#120202');
    g.fillStyle = vg; g.beginPath(); g.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2); g.fill();
    g.save(); g.beginPath(); g.ellipse(cx, cy, rx - 4, ry - 4, 0, 0, Math.PI * 2); g.clip();
    for (let arm = 0; arm < 5; arm++) {
      g.strokeStyle = arm % 2 ? 'rgba(255,190,110,0.55)' : 'rgba(255,90,40,0.5)'; g.lineWidth = 3;
      g.beginPath();
      for (let s = 0; s < 60; s++) {
        const a = arm * (Math.PI * 2 / 5) + s * 0.16 + f * 0.42, r = s * 2.1;
        const x = cx + Math.cos(a) * r * (rx / ry), y = cy + Math.sin(a) * r;
        if (s) g.lineTo(x, y); else g.moveTo(x, y);
      }
      g.stroke();
    }
    g.restore();
    // 바위 고리: 바깥 테두리를 두껍게, 군데군데 금
    g.lineWidth = 20; g.strokeStyle = '#1e1416'; g.beginPath(); g.ellipse(cx, cy, rx + 8, ry + 8, 0, 0, Math.PI * 2); g.stroke();
    g.lineWidth = 6; g.strokeStyle = '#3a2a2a'; g.beginPath(); g.ellipse(cx, cy, rx + 4, ry + 4, 0, Math.PI * 1.05, Math.PI * 1.95); g.stroke();
    g.lineWidth = 2; g.strokeStyle = '#ff5a2a';
    for (let n = 0; n < 9; n++) { const a = n * 0.71 + 0.3, x = cx + Math.cos(a) * (rx + 8), y = cy + Math.sin(a) * (ry + 8); g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * 6, y + Math.sin(a) * 9); g.stroke(); }
    // 가시·뿔 (위쪽으로 휘어 솟는다)
    for (let n = 0; n < 11; n++) {
      const a = Math.PI + 0.15 + n * ((Math.PI - 0.3) / 10), x = cx + Math.cos(a) * (rx + 14), y = cy + Math.sin(a) * (ry + 14);
      const len = 22 + ((n * 37) % 5) * 7 + (n === 5 ? 26 : 0);
      g.fillStyle = '#16100f';
      g.beginPath(); g.moveTo(x - 6, y + 4); g.lineTo(x + Math.cos(a) * len * 0.7 + (n < 5 ? -6 : n > 5 ? 6 : 0), y + Math.sin(a) * len); g.lineTo(x + 6, y + 4); g.closePath(); g.fill();
    }
    // 받침: 갈라진 검은 바위
    g.fillStyle = '#1a1214'; g.beginPath(); g.moveTo(cx - 110, H - 22); g.lineTo(cx - 70, cy + ry - 10); g.lineTo(cx + 70, cy + ry - 10); g.lineTo(cx + 110, H - 22); g.lineTo(cx + 60, H - 8); g.lineTo(cx - 60, H - 8); g.closePath(); g.fill();
    g.strokeStyle = '#ff5a2a'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(cx - 40, H - 14); g.lineTo(cx - 20, H - 30); g.lineTo(cx - 28, H - 44); g.moveTo(cx + 30, H - 12); g.lineTo(cx + 44, H - 32); g.stroke();
    // 불씨
    for (let n = 0; n < 16; n++) { const x = cx - 70 + ((n * 53 + f * 17) % 140), y = 20 + ((n * 97 + f * 41) % 260); g.fillStyle = n % 3 ? '#ff8a3a' : '#ffd27a'; g.fillRect(Math.round(x), Math.round(y), 2, 2); }
    portalTex.push(Texture.from(c));
  }
  return portalTex[k % 3];
}

/** 21차: 천국 길가의 침대 — 나무 틀, 흰 매트리스, 베개, 옅은 빛깔 이불 (i 방향 두 칸 길이). 그림의 (BED_ANCHOR) 점이 칸 (i, j) 모서리에 놓인다 */
const bedTex = new Map<number, Texture>();
const BW = 112, BH = 86, BOX = 39, BOY = 28;
export const BED_ANCHOR: [number, number] = [BOX / BW, BOY / BH];
export function bedTexture(v: number): Texture {
  const k = v % 4;
  const hit = bedTex.get(k);
  if (hit) return hit;
  const c = document.createElement('canvas');
  c.width = BW; c.height = BH;
  const g = c.getContext('2d')!;
  const quilt = ['#b8d0ec', '#f2c8d4', '#d8e8c0', '#f2e2b0'][k];
  const quiltD = ['#94b0d2', '#d8a6b4', '#b4c89c', '#d8c48c'][k];
  const P = (i: number, j: number, z: number): [number, number] => [BOX + (i - j) * 32, BOY + (i + j) * 16 - z];
  const poly = (pts: [number, number][], col: string) => { g.fillStyle = col; g.beginPath(); pts.forEach(([x, y], n) => (n ? g.lineTo(x, y) : g.moveTo(x, y))); g.closePath(); g.fill(); };
  const a0 = 0.08, a1 = 1.92, b0 = 0.14, b1 = 0.86;
  // 그림자
  g.fillStyle = 'rgba(120,130,160,0.18)';
  poly([P(a0, b0 + 0.06, -2), P(a1 + 0.08, b0 + 0.06, -2), P(a1 + 0.08, b1 + 0.1, -2), P(a0, b1 + 0.1, -2)], 'rgba(120,130,160,0.18)');
  // 다리와 틀 (앞면 · 옆면)
  poly([P(a0, b1, 0), P(a1, b1, 0), P(a1, b1, 9), P(a0, b1, 9)], '#8a6a48');
  poly([P(a1, b0, 0), P(a1, b1, 0), P(a1, b1, 9), P(a1, b0, 9)], '#6e5236');
  // 매트리스
  poly([P(a0, b1, 9), P(a1, b1, 9), P(a1, b1, 14), P(a0, b1, 14)], '#e4dfd4');
  poly([P(a1, b0, 9), P(a1, b1, 9), P(a1, b1, 14), P(a1, b0, 14)], '#d4cec2');
  poly([P(a0, b0, 14), P(a1, b0, 14), P(a1, b1, 14), P(a0, b1, 14)], '#fbfaf6');
  // 이불 (발치 쪽 · 가장자리로 흘러내린다)
  const q0 = 0.72;
  poly([P(q0, b0 - 0.03, 15), P(a1 + 0.03, b0 - 0.03, 15), P(a1 + 0.03, b1 + 0.03, 15), P(q0, b1 + 0.03, 15)], quilt);
  poly([P(q0, b1 + 0.03, 15), P(a1 + 0.03, b1 + 0.03, 15), P(a1 + 0.03, b1 + 0.03, 8), P(q0, b1 + 0.03, 8)], quiltD);
  poly([P(a1 + 0.03, b0 - 0.03, 15), P(a1 + 0.03, b1 + 0.03, 15), P(a1 + 0.03, b1 + 0.03, 8), P(a1 + 0.03, b0 - 0.03, 8)], quiltD);
  g.strokeStyle = 'rgba(255,255,255,0.6)'; g.lineWidth = 1;
  for (const f of [1.1, 1.5]) { const a = P(f, b0, 15.2), b = P(f, b1, 15.2); g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.stroke(); }
  // 베개
  poly([P(0.16, 0.24, 15), P(0.6, 0.24, 15), P(0.6, 0.76, 15), P(0.16, 0.76, 15)], '#ffffff');
  poly([P(0.16, 0.76, 15), P(0.6, 0.76, 15), P(0.6, 0.76, 12), P(0.16, 0.76, 12)], '#e8e6e0');
  // 머리판 (구름 무늬로 깎은 나무)
  poly([P(a0, b0, 0), P(a0, b1, 0), P(a0, b1, 26), P(a0, b0, 26)], '#9a7a56');
  poly([P(a0, b0, 26), P(a0, b1, 26), P(a0, b1, 28), P(a0, b0, 28)], '#b8946a');
  g.fillStyle = 'rgba(255,255,255,0.28)';
  for (const f of [0.3, 0.5, 0.7]) { const [x, y] = P(a0, f, 20); g.beginPath(); g.arc(x, y, 3, 0, Math.PI * 2); g.fill(); }
  bedTex.set(k, Texture.from(c));
  return bedTex.get(k)!;
}

/** 22차: 서큐버스의 박쥐 날개 — 뼈대 넷에 얇은 막, 끝이 톱니처럼 패였다 (giveWings와 같은 크기·기준점) */
const batTex = new Map<number, Texture>();
export function batWingTexture(color: number): Texture {
  const hit = batTex.get(color);
  if (hit) return hit;
  const W = 160, H = 90;
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const g = c.getContext('2d')!;
  const hex = '#' + color.toString(16).padStart(6, '0');
  const side = (sgn: number) => {
    const cx = W / 2, cy = 56;
    const tip = (k: number): [number, number] => [cx + sgn * (26 + k * 13), 8 + k * 9];
    g.fillStyle = hex; g.globalAlpha = 0.92;
    g.beginPath(); g.moveTo(cx + sgn * 6, cy - 14);
    g.lineTo(...tip(0));
    for (let k = 1; k < 4; k++) { const a = tip(k - 1), b = tip(k); g.quadraticCurveTo((a[0] + b[0]) / 2 - sgn * 4, (a[1] + b[1]) / 2 + 10, b[0], b[1]); }
    g.quadraticCurveTo(cx + sgn * 40, cy + 18, cx + sgn * 6, cy + 4);
    g.closePath(); g.fill();
    g.globalAlpha = 1;
    g.strokeStyle = 'rgba(0,0,0,0.55)'; g.lineWidth = 1.6;
    for (let k = 0; k < 4; k++) { const t = tip(k); g.beginPath(); g.moveTo(cx + sgn * 6, cy - 12); g.lineTo(t[0], t[1]); g.stroke(); }
  };
  side(-1); side(1);
  batTex.set(color, Texture.from(c));
  return batTex.get(color)!;
}
/** 점 그림처럼: 반투명 가장자리를 자르고 한 점짜리 어두운 외곽선을 두른다 (2배 밀도 그림) */
function crispen(g: CanvasRenderingContext2D, W: number, H: number, edge: [number, number, number]) {
  const im = g.getImageData(0, 0, W, H), D = im.data;
  for (let k = 3; k < D.length; k += 4) D[k] = D[k] < 110 ? 0 : 255;
  const solid = (x: number, y: number) => x >= 0 && y >= 0 && x < W && y < H && D[(y * W + x) * 4 + 3] > 0;
  const out: number[] = [];
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (!solid(x, y) && (solid(x - 1, y) || solid(x + 1, y) || solid(x, y - 1) || solid(x, y + 1))) out.push(x, y);
  for (let k = 0; k < out.length; k += 2) { const o = (out[k + 1] * W + out[k]) * 4; D[o] = edge[0]; D[o + 1] = edge[1]; D[o + 2] = edge[2]; D[o + 3] = 255; }
  g.putImageData(im, 0, 0);
}
/**
 * 37차 서큐버스의 박쥐 날개 (컨셉 그림): 어깨에서 솟은 팔뼈 끝(손목)에 작은 갈고리 발톱, 손가락뼈 넷이 부채처럼 펴지고
 * 그 사이 막은 가장자리로 갈수록 어둡고 뼈 곁은 핏빛이 비친다. 막 끝은 뼈 사이마다 안으로 패였다.
 * giveWings와 같은 기준점(가운데 · 높이의 62%) · 2배 밀도
 */
const succWingTex = new Map<string, Texture>();
export function succWingTexture(membrane: number, bone: number): Texture {
  const key = membrane + ':' + bone;
  const hit = succWingTex.get(key);
  if (hit) return hit;
  const W = 150, H = 100, cx = W / 2, ay = Math.round(H * 0.62);
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const g = c.getContext('2d')!;
  const rgb = (v: number) => [(v >> 16) & 255, (v >> 8) & 255, v & 255];
  const col = (v: number, k: number) => { const a = rgb(v); return `rgb(${a.map((x) => Math.min(255, Math.round(x * k))).join(',')})`; };
  for (const sd of [-1, 1]) {
    const S: [number, number] = [cx + sd * 6, ay - 6];
    const Wr: [number, number] = [cx + sd * 30, ay - 46];
    const F: [number, number][] = [[cx + sd * 66, ay - 54], [cx + sd * 72, ay - 26], [cx + sd * 62, ay - 2], [cx + sd * 40, ay + 14]];
    const B: [number, number] = [cx + sd * 9, ay + 8];
    // 막: 손목 → 손가락 끝마다 안으로 패인 물결 → 몸 쪽 아래
    g.beginPath(); g.moveTo(...S); g.quadraticCurveTo(cx + sd * 12, ay - 40, ...Wr); g.lineTo(...F[0]);
    const pts = [...F, B];
    for (let k = 1; k < pts.length; k++) {
      const a = pts[k - 1], b = pts[k];
      const mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2;
      g.quadraticCurveTo(mx + (Wr[0] - mx) * 0.32, my + (Wr[1] - my) * 0.32, b[0], b[1]);
    }
    g.closePath();
    const gr = g.createRadialGradient(Wr[0], Wr[1], 4, Wr[0], Wr[1], 70);
    gr.addColorStop(0, col(membrane, 1.35)); gr.addColorStop(0.45, col(membrane, 1.0)); gr.addColorStop(1, col(membrane, 0.62));
    g.fillStyle = gr; g.fill();
    // 뼈 곁으로 비치는 핏줄 (가는 밝은 줄)
    g.lineCap = 'round';
    for (const f of F) {
      g.strokeStyle = col(membrane, 1.6); g.lineWidth = 1;
      g.beginPath(); g.moveTo(Wr[0] + (f[0] - Wr[0]) * 0.15, Wr[1] + (f[1] - Wr[1]) * 0.15 + 3); g.lineTo(Wr[0] + (f[0] - Wr[0]) * 0.8, Wr[1] + (f[1] - Wr[1]) * 0.8 + 3); g.stroke();
    }
    // 손가락뼈 넷 (밑동이 굵고 끝이 가늘다)
    for (const f of F) {
      g.strokeStyle = col(bone, 1); g.lineWidth = 3.2;
      g.beginPath(); g.moveTo(...Wr); g.lineTo(Wr[0] + (f[0] - Wr[0]) * 0.55, Wr[1] + (f[1] - Wr[1]) * 0.55); g.stroke();
      g.lineWidth = 2; g.beginPath(); g.moveTo(Wr[0] + (f[0] - Wr[0]) * 0.5, Wr[1] + (f[1] - Wr[1]) * 0.5); g.lineTo(...f); g.stroke();
      g.strokeStyle = col(bone, 1.9); g.lineWidth = 0.9;
      g.beginPath(); g.moveTo(Wr[0], Wr[1] - 1); g.lineTo(Wr[0] + (f[0] - Wr[0]) * 0.5, Wr[1] + (f[1] - Wr[1]) * 0.5 - 1); g.stroke();
    }
    // 팔뼈 (어깨 → 손목) + 손목 마디 + 갈고리 발톱
    g.strokeStyle = col(bone, 1); g.lineWidth = 5.5;
    g.beginPath(); g.moveTo(...S); g.quadraticCurveTo(cx + sd * 12, ay - 40, ...Wr); g.stroke();
    g.strokeStyle = col(bone, 1.8); g.lineWidth = 1.4;
    g.beginPath(); g.moveTo(S[0], S[1] - 2); g.quadraticCurveTo(cx + sd * 11, ay - 42, Wr[0], Wr[1] - 2); g.stroke();
    g.fillStyle = col(bone, 1.25); g.beginPath(); g.arc(Wr[0], Wr[1], 3.6, 0, Math.PI * 2); g.fill();
    g.fillStyle = col(bone, 2.2); // 손목의 작은 갈고리 발톱 (뿔로 보이지 않게 작고 어둡게)
    g.beginPath(); g.moveTo(Wr[0] - sd * 1.5, Wr[1] - 2); g.quadraticCurveTo(Wr[0] + sd * 1, Wr[1] - 6, Wr[0] + sd * 5, Wr[1] - 6.5); g.lineTo(Wr[0] + sd * 2, Wr[1] - 1); g.closePath(); g.fill();
  }
  const e = rgb(bone);
  crispen(g, W, H, [Math.round(e[0] * 0.35), Math.round(e[1] * 0.3), Math.round(e[2] * 0.3)]);
  const t = Texture.from(c);
  t.source.scaleMode = 'nearest';
  succWingTex.set(key, t);
  return t;
}
/** 37차 서큐버스의 꼬리: 허리 뒤에서 나와 옆으로 늘어지며 S자로 휘고, 무릎께에서 끝이 살짝 들린 스페이드 (기준점 = 왼쪽 위 밑동 (0.08, 0.14)) */
const spadeTex = new Map<string, Texture>();
export const SPADE_ANCHOR: [number, number] = [0.08, 0.14];
export function spadeTailTexture(color: number, tip: number): Texture {
  const key = color + ':' + tip;
  const hit = spadeTex.get(key);
  if (hit) return hit;
  const W = 76, H = 60;
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const g = c.getContext('2d')!;
  const hx = (v: number, k = 1) => `rgb(${[(v >> 16) & 255, (v >> 8) & 255, v & 255].map((x) => Math.min(255, Math.round(x * k))).join(',')})`;
  const curve = () => { g.beginPath(); g.moveTo(6, 8); g.bezierCurveTo(20, 6, 22, 30, 34, 38); g.bezierCurveTo(44, 45, 52, 46, 58, 40); };
  g.lineCap = 'round';
  curve(); g.strokeStyle = hx(color); g.lineWidth = 4.4; g.stroke();
  g.beginPath(); g.moveTo(8, 6.5); g.bezierCurveTo(20, 5, 22, 28, 34, 35.5); g.strokeStyle = hx(color, 1.8); g.lineWidth = 1.1; g.stroke();
  // 스페이드: 끝이 오른쪽 위를 본다
  g.save(); g.translate(61, 36); g.rotate(-0.75);
  g.fillStyle = hx(tip);
  g.beginPath(); g.arc(-1, -4.2, 4.6, 0, Math.PI * 2); g.fill();
  g.beginPath(); g.arc(-1, 4.2, 4.6, 0, Math.PI * 2); g.fill();
  g.beginPath(); g.moveTo(-3, -8); g.lineTo(12, 0); g.lineTo(-3, 8); g.closePath(); g.fill();
  g.beginPath(); g.moveTo(-8, -1.5); g.lineTo(-2, -1.5); g.lineTo(-2, 1.5); g.lineTo(-8, 1.5); g.closePath(); g.fill();
  g.fillStyle = hx(tip, 1.7); g.beginPath(); g.arc(-2, -5, 1.7, 0, Math.PI * 2); g.fill();
  g.restore();
  crispen(g, W, H, [16, 6, 8]);
  const t = Texture.from(c);
  t.source.scaleMode = 'nearest';
  spadeTex.set(key, t);
  return t;
}
/** 22차: 머리 위의 작은 뿔 한 쌍 */
const hornTex = new Map<number, Texture>();
/** 33차: 악마 꼬리 — 허리에서 나와 S자로 휘다가 끝이 세모(스페이드) (2배 크기, 반으로 줄여 쓴다 · 기준점 = 왼쪽 밑동) */
const tailTex = new Map<number, Texture>();
export function devilTailTexture(color: number): Texture {
  const hit = tailTex.get(color);
  if (hit) return hit;
  const c = document.createElement('canvas');
  c.width = 72; c.height = 56;
  const g = c.getContext('2d')!;
  const hex = '#' + color.toString(16).padStart(6, '0');
  const curve = () => { g.beginPath(); g.moveTo(6, 40); g.bezierCurveTo(26, 52, 34, 20, 50, 26); g.bezierCurveTo(58, 29, 60, 20, 58, 14); };
  g.lineCap = 'round';
  curve(); g.strokeStyle = '#140606'; g.lineWidth = 8; g.stroke();
  curve(); g.strokeStyle = hex; g.lineWidth = 5; g.stroke();
  g.beginPath(); g.moveTo(10, 38); g.bezierCurveTo(26, 46, 32, 20, 48, 22); g.strokeStyle = 'rgba(255,170,150,0.45)'; g.lineWidth = 1.5; g.stroke();
  // 끝의 세모
  g.beginPath(); g.moveTo(58, 2); g.lineTo(68, 16); g.lineTo(58, 13); g.lineTo(49, 17); g.closePath();
  g.fillStyle = '#140606'; g.fill(); g.lineWidth = 3; g.strokeStyle = '#140606'; g.stroke();
  g.beginPath(); g.moveTo(58, 5); g.lineTo(65, 15); g.lineTo(58, 12); g.lineTo(52, 15); g.closePath(); g.fillStyle = hex; g.fill();
  const t = Texture.from(c);
  t.source.scaleMode = 'nearest';
  tailTex.set(color, t);
  return t;
}
export function hornTexture(color: number): Texture {
  const hit = hornTex.get(color);
  if (hit) return hit;
  const c = document.createElement('canvas');
  c.width = 40; c.height = 24;
  const g = c.getContext('2d')!;
  const hex = '#' + color.toString(16).padStart(6, '0');
  g.fillStyle = hex;
  for (const s of [-1, 1]) { g.beginPath(); g.moveTo(20 + s * 6, 24); g.quadraticCurveTo(20 + s * 16, 16, 20 + s * 13, 2); g.quadraticCurveTo(20 + s * 11, 14, 20 + s * 2, 22); g.closePath(); g.fill(); }
  hornTex.set(color, Texture.from(c));
  return hornTex.get(color)!;
}

/**
 * 26차: 지도 끝 구름 너머에 솟은 천국의 탑 — 아직 갈 수 없는 곳.
 * 구름 바다 위 대리석 기단, 기둥이 늘어선 세 층의 회랑, 가운데 높은 탑(층마다 좁아지며 창마다 금빛), 금빛 둥근 지붕과 첨탑 끝의 별,
 * 양옆의 작은 탑 둘. 아래는 구름에 잠겨 흐려지고, 둘레로 옅은 빛이 번진다
 */
let towerTex: Texture | null = null;
export function heavenTowerTexture(): Texture {
  if (towerTex) return towerTex;
  const W = 560, H = 900;
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const g = c.getContext('2d')!;
  const cx = W / 2;
  // 둘레 빛
  const halo = g.createRadialGradient(cx, 300, 20, cx, 320, 330);
  halo.addColorStop(0, 'rgba(255,240,200,0.32)'); halo.addColorStop(1, 'rgba(255,246,214,0)');
  g.fillStyle = halo; g.fillRect(0, 0, W, H);
  // 빛줄기 몇
  g.globalAlpha = 0.16; g.fillStyle = '#fff6d8';
  for (const [a, w] of [[-0.42, 24], [-0.18, 16], [0.12, 20], [0.36, 14]] as [number, number][]) { g.beginPath(); g.moveTo(cx, 120); g.lineTo(cx + Math.sin(a) * 900 - w, 120 + Math.cos(a) * 900); g.lineTo(cx + Math.sin(a) * 900 + w, 120 + Math.cos(a) * 900); g.closePath(); g.fill(); }
  g.globalAlpha = 1;
  const marble = (x: number, y: number, w: number, h: number, light = '#ece5d6', shade = '#c4b9a4') => {
    g.fillStyle = shade; g.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
    g.fillStyle = light; g.fillRect(Math.round(x), Math.round(y), Math.round(w * 0.62), Math.round(h));
  };
  const gold = '#c99a2e', goldD = '#8a6418';
  const colonnade = (x: number, y: number, w: number, h: number, n: number) => {
    marble(x - 6, y - 8, w + 12, 8, '#f2ece0', '#cfc5b2'); g.fillStyle = gold; g.fillRect(Math.round(x - 6), Math.round(y - 2), Math.round(w + 12), 2);
    g.fillStyle = '#8a7a5e'; g.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
    g.fillStyle = 'rgba(255,214,120,0.55)'; g.fillRect(Math.round(x + 2), Math.round(y + 4), Math.round(w - 4), Math.round(h - 8)); // 안쪽 금빛
    for (let k = 0; k <= n; k++) { const px = x + (k * w) / n - 3; marble(px, y, 7, h, '#f4efe4', '#bfb39c'); }
    marble(x - 6, y + h, w + 12, 7, '#f4efe6', '#d6cebf');
  };
  // 양옆 작은 탑
  for (const sx of [-1, 1]) {
    const tx = cx + sx * 168;
    marble(tx - 26, 330, 52, 300);
    for (let y = 360; y < 600; y += 46) { g.fillStyle = '#f2cf72'; g.fillRect(Math.round(tx - 6), y, 12, 22); g.fillStyle = '#fff2c0'; g.fillRect(Math.round(tx - 6), y, 5, 22); }
    g.fillStyle = gold; g.beginPath(); g.ellipse(tx, 330, 30, 26, 0, Math.PI, 0); g.fill(); g.fillStyle = '#f2d27a'; g.beginPath(); g.ellipse(tx - 8, 324, 12, 14, 0, Math.PI, 0); g.fill();
    g.fillStyle = goldD; g.fillRect(Math.round(tx - 2), 270, 4, 40);
  }
  // 기단과 회랑 세 층
  colonnade(cx - 230, 640, 460, 90, 14);
  colonnade(cx - 170, 540, 340, 92, 10);
  colonnade(cx - 120, 450, 240, 84, 8);
  // 가운데 탑: 위로 갈수록 좁아지는 네 마디
  const seg: [number, number, number][] = [[96, 370, 80], [80, 290, 80], [64, 220, 70], [50, 160, 60]];
  for (const [hw, top, h] of seg) {
    marble(cx - hw, top, hw * 2, h, '#efe8da', '#c2b7a2');
    g.fillStyle = gold; g.fillRect(Math.round(cx - hw - 4), top - 3, Math.round(hw * 2 + 8), 4);
    for (let x = cx - hw + 12; x < cx + hw - 10; x += 22) { g.fillStyle = '#f2c862'; g.beginPath(); g.ellipse(x + 5, top + h * 0.45, 5, 12, 0, 0, Math.PI * 2); g.fill(); g.fillStyle = '#fff4cc'; g.fillRect(Math.round(x + 2), Math.round(top + h * 0.4), 3, 10); }
  }
  // 금빛 둥근 지붕과 첨탑, 별
  g.fillStyle = goldD; g.beginPath(); g.ellipse(cx, 160, 56, 58, 0, Math.PI, 0); g.fill();
  g.fillStyle = gold; g.beginPath(); g.ellipse(cx - 6, 158, 48, 54, 0, Math.PI, 0); g.fill();
  g.fillStyle = '#f6dc8a'; g.beginPath(); g.ellipse(cx - 20, 140, 14, 30, 0, Math.PI, 0); g.fill();
  g.fillStyle = goldD; g.beginPath(); g.moveTo(cx - 6, 104); g.lineTo(cx + 6, 104); g.lineTo(cx, 30); g.closePath(); g.fill();
  const star = (x: number, y: number, r: number) => { g.fillStyle = '#fffbe8'; g.beginPath(); for (let k = 0; k < 8; k++) { const a = (k * Math.PI) / 4, rr = k % 2 ? r * 0.35 : r; g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); } g.closePath(); g.fill(); };
  const sg = g.createRadialGradient(cx, 30, 1, cx, 30, 40); sg.addColorStop(0, 'rgba(255,250,220,0.95)'); sg.addColorStop(1, 'rgba(255,250,220,0)');
  g.fillStyle = sg; g.fillRect(cx - 40, -10, 80, 80);
  star(cx, 30, 14);
  // 아래는 구름에 잠긴다: 구름 뭉치를 겹치고, 맨 아래로 갈수록 투명하게
  const puff = (x: number, y: number, r: number) => {
    g.fillStyle = '#d4d8e6'; g.beginPath(); g.ellipse(x, y + r * 0.2, r, r * 0.55, 0, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#f6f5f2'; g.beginPath(); g.ellipse(x - r * 0.08, y, r * 0.92, r * 0.5, 0, 0, Math.PI * 2); g.fill();
  };
  for (let k = 0; k < 26; k++) puff(20 + ((k * 97) % 520), 700 + ((k * 53) % 120), 40 + ((k * 31) % 36));
  const fade = g.createLinearGradient(0, 640, 0, H);
  fade.addColorStop(0, 'rgba(0,0,0,0)'); fade.addColorStop(1, 'rgba(0,0,0,1)');
  g.globalCompositeOperation = 'destination-out'; g.fillStyle = fade; g.fillRect(0, 640, W, H - 640);
  g.globalCompositeOperation = 'source-over';
  towerTex = Texture.from(c);
  return towerTex;
}

/**
 * 34차 칼드렉의 위쪽 두 팔 (어깨 뒤에서 하나 더 돋은 팔): 검게 그을린 살갗에 불씨가 갈라진 틈. 오른팔은 큰 망치, 왼팔은 달군 쇠를 문 집게.
 * 2배 크기로 그려 반으로 줄여 쓴다 · 기준점 = 어깨 (돌려서 망치질)
 */
const armTex = new Map<string, Texture>();
export const ARM_PIVOT: [number, number] = [10, 70]; // 캔버스 안의 어깨 자리 (오른팔 기준)
export function demonArmTexture(tool: 'hammer' | 'tongs'): Texture {
  const hit = armTex.get(tool);
  if (hit) return hit;
  const W = 84, H = 84;
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const g = c.getContext('2d')!;
  const [sx, sy] = ARM_PIVOT, ex = 36, ey = 58, fx = 48, fy = 28;
  const limb = (ax: number, ay: number, bx: number, by: number, w0: number, w1: number, col: string) => {
    const dx = bx - ax, dy = by - ay, L = Math.hypot(dx, dy), nx = -dy / L, ny = dx / L;
    g.fillStyle = col; g.beginPath();
    g.moveTo(ax + nx * w0, ay + ny * w0); g.lineTo(bx + nx * w1, by + ny * w1); g.lineTo(bx - nx * w1, by - ny * w1); g.lineTo(ax - nx * w0, ay - ny * w0); g.closePath(); g.fill();
    g.beginPath(); g.ellipse(bx, by, w1, w1, 0, 0, Math.PI * 2); g.fill();
  };
  const OUT = '#0a0706', SKIN = '#221a17', LIT = '#3e322c';
  // 외곽선 먼저 (두껍게) → 살 → 빛
  limb(sx, sy, ex, ey, 8, 7, OUT); limb(ex, ey, fx, fy, 7, 6.5, OUT);
  limb(sx, sy, ex, ey, 6.5, 5.5, SKIN); limb(ex, ey, fx, fy, 5.5, 5, SKIN);
  limb(sx + 1, sy - 3, ex, ey - 3, 2, 1.6, LIT); limb(ex + 1, ey - 2, fx + 1, fy + 2, 1.6, 1.4, LIT);
  // 불씨 갈라진 틈
  g.strokeStyle = '#ff5a1a'; g.lineWidth = 1.2;
  for (const [a, b, c2, d] of [[16, 66, 22, 63], [27, 60, 31, 57], [40, 48, 42, 43], [45, 38, 47, 33]]) { g.beginPath(); g.moveTo(a, b); g.lineTo(c2, d); g.stroke(); }
  // 주먹
  g.fillStyle = OUT; g.beginPath(); g.ellipse(fx, fy, 8, 7.5, 0, 0, Math.PI * 2); g.fill();
  g.fillStyle = SKIN; g.beginPath(); g.ellipse(fx, fy, 6.5, 6, 0, 0, Math.PI * 2); g.fill();
  g.fillStyle = LIT; g.fillRect(fx - 4, fy - 4, 5, 2);
  if (tool === 'hammer') {
    // 자루는 주먹에서 위로, 머리는 가로로 크게
    g.strokeStyle = OUT; g.lineWidth = 5; g.beginPath(); g.moveTo(fx - 2, fy + 4); g.lineTo(fx - 10, fy - 26); g.stroke();
    g.strokeStyle = '#5a3a22'; g.lineWidth = 3; g.beginPath(); g.moveTo(fx - 2, fy + 4); g.lineTo(fx - 10, fy - 26); g.stroke();
    g.fillStyle = OUT; g.fillRect(fx - 24, fy - 34, 30, 14);
    g.fillStyle = '#4a4440'; g.fillRect(fx - 23, fy - 33, 28, 12);
    g.fillStyle = '#7a726a'; g.fillRect(fx - 23, fy - 33, 28, 3);
    g.fillStyle = '#2a2624'; g.fillRect(fx - 23, fy - 24, 28, 3);
  } else {
    // 집게: 두 갈래가 앞으로 뻗고 끝에 달군 쇠
    g.strokeStyle = OUT; g.lineWidth = 4;
    for (const dy of [-3, 3]) { g.beginPath(); g.moveTo(fx + 2, fy); g.lineTo(fx + 26, fy - 12 + dy); g.stroke(); }
    g.strokeStyle = '#6a625a'; g.lineWidth = 2;
    for (const dy of [-3, 3]) { g.beginPath(); g.moveTo(fx + 2, fy); g.lineTo(fx + 26, fy - 12 + dy); g.stroke(); }
    g.fillStyle = '#ff6a1a'; g.fillRect(fx + 24, fy - 20, 10, 9);
    g.fillStyle = '#ffd26a'; g.fillRect(fx + 26, fy - 18, 6, 4);
  }
  const t = Texture.from(c);
  armTex.set(tool, t);
  return t;
}
