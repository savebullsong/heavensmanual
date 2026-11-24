// 천국 그림: 천사·황색날개의 날개 (2배 밀도로 그려 반으로 줄임), 화면 가장자리를 흐르는 구름
import { Texture } from 'pixi.js';

const wingCache = new Map<number, Texture>();
/** 펼친 두 날개 한 쌍: 가운데(등)에서 양옆 위로 펼쳐지고, 깃이 세 겹으로 겹친다 */
export function wingTexture(color: number): Texture {
  const hit = wingCache.get(color);
  if (hit) return hit;
  const W = 112, H = 64, cx = W / 2, cy = 38;
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const g = c.getContext('2d')!;
  const rgb = [(color >> 16) & 255, (color >> 8) & 255, color & 255];
  const col = (k: number) => `rgb(${Math.round(rgb[0] * k)},${Math.round(rgb[1] * k)},${Math.round(rgb[2] * k)})`;
  for (const sd of [-1, 1]) {
    // 깃 세 겹: 뒤(긴 첫째 깃, 어둡게) → 가운데 → 앞(짧고 밝게). 등 가운데는 비워 머리가 보이게
    const root = cx + sd * 11;
    for (const [len, k, n, dy] of [[36, 0.78, 7, 4], [27, 0.9, 6, 1], [16, 1.0, 5, -2]] as [number, number, number, number][]) {
      for (let f = 0; f < n; f++) {
        const a = (-0.7 + (f / (n - 1)) * 1.0) * Math.PI / 2; // 바깥 위에서 바깥 아래로 부채꼴
        const L = len * (0.75 + 0.25 * Math.cos((f / (n - 1) - 0.3) * 2));
        const ex = root + sd * Math.cos(a) * L, ey = cy + dy + Math.sin(a) * L * 0.7;
        g.strokeStyle = col(k * 0.82); g.lineWidth = 7; g.lineCap = 'round';
        g.beginPath(); g.moveTo(root, cy + dy - 4); g.lineTo(ex, ey); g.stroke();
        g.strokeStyle = col(k); g.lineWidth = 5;
        g.beginPath(); g.moveTo(root, cy + dy - 4); g.lineTo(ex, ey); g.stroke();
      }
    }
    // 날개 어깨 (둥근 덩어리)
    g.fillStyle = col(1.0); g.beginPath(); g.ellipse(root + sd * 3, cy - 6, 8, 7, 0, 0, Math.PI * 2); g.fill();
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
  const W = 360, H = 150;
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
