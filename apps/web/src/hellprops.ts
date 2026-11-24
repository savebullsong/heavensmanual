// 지옥의 처절한 소품 (2배 밀도로 점을 찍고 반으로 줄여 보인다 · 인물과 같은 밀도)
// 경계: 1층 현무암 기둥과 용암 · 2층 안개 낀 바위산 · 3층 핏물 해자 위 가시 성벽
// 바닥: 흩어진 뼈 · 해골 더미 · 꼬챙이에 꿰인 해골 · 끓는 가마솥 · 해골 든 철창
// 마을: 층마다 다른 울타리(그을린 말뚝 · 갈대 · 돌담)와 불빛(모닥불 · 도깨비불 등 · 붉은 등롱)
import type { Theme } from './hell.ts';

export interface HPic { canvas: HTMLCanvasElement; ax: number; ay: number; glow?: [number, number]; glowTint?: number; flat?: boolean }
type RGB = [number, number, number];
const hash = (a: number, b: number, c = 0) => { let h = (a * 374761393 + b * 668265263 + c * 2147483647) | 0; h = (h ^ (h >>> 13)) * 1274126177; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };

const BONE = '#e4dac2', BONE2 = '#c2b69a', BONE3 = '#8c8068', HOLE = '#140c0a';

/** 2배 캔버스 도구: 좌표는 2배 점 단위. 다 그린 뒤 바깥 테두리를 한 점 두께로 어둡게 두른다 */
function pen(w1: number, h1: number) {
  const c = document.createElement('canvas');
  c.width = w1 * 2; c.height = h1 * 2;
  const g = c.getContext('2d')!;
  const R = (x: number, y: number, w: number, h: number, col: string) => { g.fillStyle = col; g.fillRect(Math.round(x), Math.round(y), Math.max(1, Math.round(w)), Math.max(1, Math.round(h))); };
  const E = (cx: number, cy: number, rx: number, ry: number, col: string) => {
    g.fillStyle = col;
    for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) {
      const t = (y + 0.5 - cy) / ry;
      if (Math.abs(t) > 1) continue;
      const hw = rx * Math.sqrt(1 - t * t);
      g.fillRect(Math.round(cx - hw), y, Math.max(1, Math.round(hw * 2)), 1);
    }
  };
  const L = (x0: number, y0: number, x1: number, y1: number, w: number, col: string, w1e = w) => {
    const n = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0)));
    g.fillStyle = col;
    for (let k = 0; k <= n; k++) { const t = k / n, ww = w + (w1e - w) * t; g.fillRect(Math.round(x0 + (x1 - x0) * t - ww / 2), Math.round(y0 + (y1 - y0) * t - ww / 2), Math.max(1, Math.round(ww)), Math.max(1, Math.round(ww))); }
  };
  const poly = (pts: [number, number][], col: string) => { g.beginPath(); g.moveTo(pts[0][0], pts[0][1]); for (const p of pts.slice(1)) g.lineTo(p[0], p[1]); g.closePath(); g.fillStyle = col; g.fill(); };
  const finish = (line: RGB = [12, 8, 7], skipBelow = 1e9) => {
    // 반투명 가장자리를 없애 점 그림처럼 (안개·연기 같은 반투명은 따로 나중에)
    const im = g.getImageData(0, 0, c.width, c.height), d = im.data, W = c.width, H = c.height;
    for (let k = 3; k < d.length; k += 4) d[k] = d[k] < 110 ? 0 : 255;
    const solid = (x: number, y: number) => x >= 0 && y >= 0 && x < W && y < H && d[(y * W + x) * 4 + 3] > 0;
    const out: number[] = [];
    for (let y = 0; y < Math.min(H, skipBelow); y++) for (let x = 0; x < W; x++) if (!solid(x, y) && (solid(x - 1, y) || solid(x + 1, y) || solid(x, y - 1) || solid(x, y + 1))) out.push(x, y);
    for (let k = 0; k < out.length; k += 2) { const o = (out[k + 1] * W + out[k]) * 4; d[o] = line[0]; d[o + 1] = line[1]; d[o + 2] = line[2]; d[o + 3] = 255; }
    g.putImageData(im, 0, 0);
  };
  return { c, g, R, E, L, poly, finish };
}
type Pen = ReturnType<typeof pen>;

/** 해골 하나 (cx, cy = 머리 가운데, s = 크기, f = 바라보는 쪽 -1/1) */
function skull(p: Pen, cx: number, cy: number, s: number, f = 1, jawOpen = 0) {
  const { E, R } = p;
  E(cx, cy, 6 * s, 5.2 * s, BONE2);
  E(cx - 0.8 * s * f, cy - 0.8 * s, 5.2 * s, 4.2 * s, BONE);
  R(cx - 3.6 * s, cy + 3 * s, 7.2 * s, (2.6 + jawOpen) * s, BONE2); // 턱
  for (let k = 0; k < 4; k++) R(cx - 3 * s + k * 1.8 * s, cy + 3 * s, Math.max(1, 0.7 * s), (1.2 + jawOpen) * s, HOLE); // 이 사이
  E(cx - 2.2 * s + f * 0.6 * s, cy + 0.4 * s, 1.6 * s, 1.7 * s, HOLE);
  E(cx + 2.2 * s + f * 0.6 * s, cy + 0.4 * s, 1.6 * s, 1.7 * s, HOLE);
  R(cx + f * 0.5 * s - 0.5 * s, cy + 1.8 * s, Math.max(1, s), Math.max(1, 1.2 * s), HOLE); // 코
  R(cx - 3 * s, cy - 3.6 * s, 2 * s, Math.max(1, s * 0.8), '#f4ecd8'); // 빛
}
/** 긴 뼈 (양 끝이 둥근 마디) */
function bone(p: Pen, x0: number, y0: number, x1: number, y1: number, w: number) {
  p.L(x0, y0, x1, y1, w, BONE2);
  p.L(x0, y0 - w * 0.3, x1, y1 - w * 0.3, Math.max(1, w * 0.45), BONE);
  for (const [x, y] of [[x0, y0], [x1, y1]]) { p.E(x - w * 0.45, y, w * 0.6, w * 0.6, BONE2); p.E(x + w * 0.45, y, w * 0.6, w * 0.6, BONE2); p.E(x - w * 0.5, y - w * 0.25, w * 0.35, w * 0.3, BONE); }
}
/** 갈비뼈 (가운데 등뼈 + 휘어진 갈비 넷) */
function ribs(p: Pen, cx: number, cy: number, s: number) {
  p.L(cx, cy - 8 * s, cx, cy + 8 * s, 1.6 * s, BONE2);
  for (let k = 0; k < 4; k++) {
    const y = cy - 6 * s + k * 3.6 * s, wd = (6 - Math.abs(k - 1.2) * 0.9) * s;
    for (const sd of [-1, 1]) for (let t = 0; t <= 10; t++) { const a = t / 10; p.R(cx + sd * wd * Math.sin(a * Math.PI * 0.55), y + a * 3 * s, Math.max(1, 1.2 * s), Math.max(1, 1.2 * s), t < 3 ? BONE : BONE2); }
  }
}

const cache = new Map<string, HPic>();
/** kind: crag(경계) · bones · skulls · stake · cauldron · cage · lantern · bonfire · wallfence(마을 울타리, o = 방향) */
export function hellDecor(kind: string, theme: Theme, v: number, o = 0): HPic {
  const key = `${kind}-${theme}-${v}-${o}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const r = (k: number) => hash(v + 1, k, kind.length * 13 + theme.length);
  let out: HPic;
  if (kind === 'bones') {
    // 바닥에 흩어진 뼈: 긴 뼈 몇 개, 갈비 조각, 가끔 해골
    const p = pen(44, 24);
    const n = 2 + Math.floor(r(1) * 3);
    for (let k = 0; k < n; k++) {
      const cx = 14 + r(k + 2) * 60, cy = 18 + r(k + 7) * 20, a = r(k + 12) * Math.PI, l = 9 + r(k + 17) * 9;
      bone(p, cx - Math.cos(a) * l, cy - Math.sin(a) * l * 0.5, cx + Math.cos(a) * l, cy + Math.sin(a) * l * 0.5, 2.6);
    }
    if (r(30) < 0.55) ribs(p, 24 + r(31) * 36, 24, 0.8);
    if (r(40) < 0.6) skull(p, 26 + r(41) * 34, 26 + r(42) * 8, 1.15, r(43) < 0.5 ? -1 : 1);
    if (theme === 'market') for (let k = 0; k < 3; k++) p.E(20 + r(50 + k) * 50, 36 + r(55 + k) * 8, 6 + r(60 + k) * 6, 2 + r(65 + k) * 2, '#5a0a08');
    p.finish([40, 28, 22]);
    out = { canvas: p.c, ax: 0.5, ay: 0.6, flat: true };
  } else if (kind === 'skulls') {
    // 해골 더미 (아래 셋 · 가운데 둘 · 위 하나). 가끔 꼭대기에 녹은 초
    const p = pen(36, 34);
    p.E(36, 60, 30, 7, '#1a1210');
    const rows: [number, number][] = [[3, 52], [2, 40], [1, 28]];
    for (const [n, y] of rows) for (let k = 0; k < n; k++) {
      const x = 36 + (k - (n - 1) / 2) * 15 + (r(n * 7 + k) - 0.5) * 3;
      skull(p, x, y + (r(n * 9 + k) - 0.5) * 2, 1.05 + r(n + k * 3) * 0.2, r(k + n * 5) < 0.5 ? -1 : 1);
    }
    let glow: [number, number] | undefined;
    if (v % 3 === 0) { p.R(34, 8, 5, 12, '#d8ccaa'); p.R(34, 8, 2, 12, '#efe6cc'); p.R(35, 2, 3, 6, '#ffc24a'); p.R(36, 0, 1, 3, '#fff0b0'); for (let k = 0; k < 4; k++) p.R(33 + k * 2, 19 + (k % 2) * 2, 2, 3, '#d8ccaa'); glow = [0, -26]; }
    p.finish();
    out = { canvas: p.c, ax: 0.5, ay: 31 / 34, glow, glowTint: 0xffb04a };
  } else if (kind === 'stake') {
    // 꼬챙이에 꿰인 해골: 위가 뾰족한 검은 말뚝, 축 늘어진 몸 (시장은 핏자국)
    const p = pen(44, 100);
    const x = 44, base = 194, top = 22;
    p.E(x, base + 2, 22, 6, '#140c0a');
    p.poly([[x - 6, base], [x + 6, base], [x + 1.5, top], [x - 1.5, top]], '#2a1c16');
    p.poly([[x - 6, base], [x - 2, base], [x - 0.5, top + 6], [x - 1.5, top]], '#4a3628');
    // 몸: 골반이 말뚝 중간에 꿰였다
    const py = 104 + r(1) * 12, f = r(2) < 0.5 ? -1 : 1;
    p.E(x, py, 9, 6, BONE2); p.E(x, py - 2, 7, 3, BONE); p.E(x - 3, py, 2.4, 2.4, HOLE); p.E(x + 3, py, 2.4, 2.4, HOLE);
    p.L(x, py - 4, x + f * 8, py - 30, 3, BONE2); // 등뼈 (앞으로 꺾임)
    ribs(p, x + f * 6, py - 22, 1.05);
    skull(p, x + f * 14, py - 32 + 5, 1.3, f, 1.2); // 고개가 떨어진 해골
    bone(p, x + f * 2, py - 28, x - f * 10, py - 8, 2.6); // 늘어진 팔
    bone(p, x - f * 10, py - 8, x - f * 12, py + 14, 2.2);
    bone(p, x + f * 10, py - 26, x + f * 18, py - 4, 2.4);
    bone(p, x - 4, py + 4, x - 10, py + 30, 3); bone(p, x - 10, py + 30, x - 8, py + 56, 2.6); // 다리
    bone(p, x + 4, py + 4, x + 12, py + 28, 3); bone(p, x + 12, py + 28, x + 16, py + 52, 2.6);
    p.R(x + 0.5, top - 4, 1, 8, '#4a3628'); // 몸을 뚫고 나온 끝
    if (theme === 'market') { for (let k = 0; k < 5; k++) p.R(x - 4 + r(k + 30) * 8, py + 6 + k * 14, 1.5, 6 + r(k + 35) * 10, '#7a0a0a'); p.E(x + 3, base, 12, 3, '#5a0606'); }
    if (theme === 'swamp') for (let k = 0; k < 6; k++) p.R(x - 6 + k * 2, py + 2 + (k % 3) * 2, 1, 10 + (k % 2) * 6, '#4a5a2a');
    p.finish();
    out = { canvas: p.c, ax: 0.5, ay: 97 / 100 };
  } else if (kind === 'cauldron') {
    // 끓는 가마솥: 장작불 위 쇠솥, 넘칠 듯 끓는 것 (1층 녹은 쇠 · 2층 담즙 · 3층 피), 밖으로 뻗은 뼈 손
    const p = pen(64, 60);
    const cx = 64, cy = 74;
    const fill: Record<Theme, [string, string, string]> = { ash: ['#ff7a1a', '#ffc24a', '#b8320e'], swamp: ['#6a8a2a', '#a8c24a', '#3a4a16'], market: ['#9a0e0a', '#d8261a', '#5a0606'] };
    const [m, mh, md] = fill[theme];
    p.E(cx, 112, 46, 8, '#120a08');
    for (const [a, b] of [[-30, 26], [26, -28]]) p.L(cx + a, 110, cx + b, 100, 5, '#3a2416');
    for (let k = 0; k < 30; k++) { const x = cx - 26 + r(k) * 52, h = 6 + r(k + 40) * 16 * (1 - Math.abs(x - cx) / 30); p.R(x, 106 - h, 3, h, ['#ffe08a', '#ffb02a', '#f06a1a', '#b8321a'][Math.floor(r(k + 80) * 4)]); }
    for (const sx of [-26, 0, 26]) p.L(cx + sx * 0.9, 108, cx + sx, 86, 4, '#1a1412');
    p.E(cx, cy + 8, 38, 26, '#1e1a18');
    p.E(cx - 8, cy + 2, 24, 16, '#2e2a26');
    p.E(cx - 18, cy - 2, 6, 8, '#3e3a34');
    p.E(cx, cy - 14, 40, 10, '#3a3430'); // 테두리
    p.E(cx, cy - 14, 35, 7.5, md);
    p.E(cx, cy - 15, 32, 6, m);
    for (let k = 0; k < 7; k++) { const bx = cx - 26 + r(k + 100) * 52, by = cy - 17 + r(k + 110) * 6; p.E(bx, by, 3 + r(k + 120) * 2, 1.8, mh); }
    if (v % 2 === 0) { bone(p, cx + 16, cy - 16, cx + 30, cy - 40, 3); for (let k = 0; k < 4; k++) p.L(cx + 30, cy - 40, cx + 27 + k * 3, cy - 50, 1.6, BONE); }
    else skull(p, cx - 12, cy - 18, 1.2, 1, 0.6);
    p.finish();
    // 김 (반투명이라 테두리 뒤에)
    p.g.globalAlpha = 0.18;
    for (let k = 0; k < 5; k++) p.E(cx - 14 + k * 7 + r(k + 150) * 6, cy - 34 - k * 9, 10 + k * 2, 6, theme === 'swamp' ? '#c8e0a0' : '#e8d8c8');
    p.g.globalAlpha = 1;
    out = { canvas: p.c, ax: 0.5, ay: 112 / 120, glow: [0, -14], glowTint: theme === 'swamp' ? 0x9ad24a : theme === 'market' ? 0xff3a2a : 0xff8a2a };
  } else if (kind === 'cage') {
    // 교수대 철창: 기둥과 팔, 쇠사슬, 쪼그려 앉은 해골
    const p = pen(48, 112);
    const px = 18, base = 220;
    p.E(px + 6, base + 2, 18, 4, '#140c0a');
    p.R(px - 4, 20, 9, base - 20, '#2a1e18'); p.R(px - 4, 20, 3, base - 20, '#463428');
    p.R(px - 6, 16, 72, 8, '#2a1e18'); p.R(px - 6, 16, 72, 2, '#463428');
    p.L(px + 4, 50, px + 24, 24, 4, '#2a1e18');
    const cx = 70, ct = 70, cb = 150;
    for (let y = 24; y < ct; y += 4) p.E(cx, y, 2, 2, '#5a5652');
    p.E(cx, ct, 20, 6, '#3a3632'); p.E(cx, cb, 20, 6, '#3a3632');
    // 안의 해골 (먼저) → 창살 (나중에)
    skull(p, cx - 2, cb - 32, 1.15, -1, 0.8);
    ribs(p, cx + 2, cb - 14, 0.75);
    bone(p, cx - 12, cb - 6, cx + 4, cb - 2, 2.2); bone(p, cx + 4, cb - 2, cx + 12, cb - 14, 2.2);
    for (let k = 0; k < 7; k++) { const x = cx - 18 + k * 6; p.R(x, ct, 2, cb - ct, k % 3 === 0 ? '#6a6660' : '#4a4642'); }
    p.R(cx - 20, ct + 24, 40, 2, '#4a4642');
    if (theme === 'market') p.R(cx - 6, cb + 4, 2, 14, '#7a0a0a');
    p.finish();
    out = { canvas: p.c, ax: 18.5 / 96, ay: 110 / 112 };
  } else if (kind === 'crag') {
    out = crag(theme, v, o, r);
  } else if (kind === 'bonfire') {
    // 1층 마을 한가운데 모닥불: 엇갈린 통나무, 높은 불길, 둘레의 돌
    const p = pen(60, 76);
    const cx = 60, by = 140;
    p.E(cx, by + 4, 50, 10, '#120a08');
    for (let k = 0; k < 10; k++) { const a = (k / 10) * Math.PI * 2; p.E(cx + Math.cos(a) * 42, by + Math.sin(a) * 9, 7, 4.5, k % 2 ? '#4a4440' : '#5e5852'); }
    for (const [a, b] of [[-34, 30], [30, -32], [-6, 8]]) p.L(cx + a, by + 2, cx + b, by - 16, 7, '#3a2416');
    const fl = ['#fff0b0', '#ffd06a', '#ffa02a', '#f06a1a', '#b8321a'];
    for (let k = 0; k < 90; k++) { const x = cx - 30 + r(k) * 60, d = Math.abs(x - cx) / 32, h = (14 + r(k + 200) * 70) * (1 - d * d); p.R(x, by - 10 - h, 3, h, fl[Math.min(4, Math.floor((r(k + 400) * 0.6 + d * 0.7) * 5))]); }
    p.E(cx, by - 30, 10, 22, '#fff0b0');
    p.finish([30, 10, 6]);
    for (let k = 0; k < 14; k++) p.R(cx - 30 + r(k + 600) * 60, 10 + r(k + 700) * 50, 2, 2, '#ffb04a');
    out = { canvas: p.c, ax: 0.5, ay: 72 / 76, glow: [0, -36], glowTint: 0xff8a3a };
  } else if (kind === 'lantern') {
    if (theme === 'swamp') {
      // 늪: 굽은 장대에 매단 도깨비불 등
      const p = pen(32, 92);
      p.E(20, 180, 12, 3, '#120e0a');
      p.L(18, 180, 20, 30, 4, '#2e2a1c'); p.L(20, 30, 40, 22, 3, '#2e2a1c');
      p.L(40, 22, 40, 40, 1, '#5a5440');
      p.R(33, 40, 15, 3, '#3a3426'); p.R(34, 43, 13, 18, '#22281a'); p.R(36, 45, 9, 14, '#b8e05a'); p.R(38, 47, 5, 8, '#eaffb0'); p.R(33, 61, 15, 3, '#3a3426');
      for (let k = 0; k < 3; k++) skull(p, 12 + k * 0, 70 + k * 20, 0.6 + k * 0.08, 1); // 장대에 묶은 작은 해골들
      p.finish();
      out = { canvas: p.c, ax: 20 / 64, ay: 90 / 92, glow: [10, -64], glowTint: 0xa8f05a };
    } else if (theme === 'market') {
      // 시장: 붉은 종이 등롱 두 개를 단 장대
      const p = pen(36, 96);
      p.E(36, 188, 14, 3, '#120a08');
      p.R(33, 26, 6, 162, '#3a1a12'); p.R(33, 26, 2, 162, '#5a2a1e'); p.R(14, 24, 44, 5, '#3a1a12');
      for (const lx of [18, 54]) { p.L(lx, 29, lx, 40, 1, '#2a1a12'); p.E(lx, 54, 10, 14, '#a8140e'); p.E(lx - 3, 50, 5, 9, '#e0301e'); p.R(lx - 6, 39, 12, 3, '#2a1a12'); p.R(lx - 6, 66, 12, 3, '#2a1a12'); p.R(lx, 69, 1, 8, '#d8a83a'); for (let y = 44; y < 66; y += 5) p.R(lx - 9, y, 18, 1, '#7a0e0a'); }
      p.finish();
      out = { canvas: p.c, ax: 0.5, ay: 94 / 96, glow: [0, -70], glowTint: 0xff3a2a };
    } else {
      out = { canvas: document.createElement('canvas'), ax: 0.5, ay: 1 };
    }
  } else {
    // wallfence: 마을 울타리 한 칸 (o = 0: i 방향, 1: j 방향, 2: 모서리 기둥)
    out = villageFence(theme, v, o, r);
  }
  cache.set(key, out);
  return out;
}

/** 경계 (지나갈 수 없는 곳) */
function crag(theme: Theme, v: number, o: number, r: (k: number) => number): HPic {
  if (theme === 'ash') {
    // 현무암 기둥 무더기: 육각 기둥 3~5개, 틈마다 용암이 흐르는 금
    const h = 86 + Math.floor(r(1) * 60);
    const p = pen(70, h + 14);
    const base = (h + 8) * 2;
    p.E(70, base, 62, 12, '#1a0806');
    const n = 2 + Math.floor(r(2) * 2);
    const cols = Array.from({ length: n }, (_, k) => ({ x: 34 + (k / Math.max(1, n - 1)) * 72 + (r(k + 3) - 0.5) * 14, w: 30 + r(k + 9) * 18, ht: (0.5 + r(k + 15) * 0.5) * h * 2 }));
    cols.sort((a, b) => b.ht - a.ht);
    for (const c of cols) {
      const x0 = c.x - c.w / 2, x1 = c.x + c.w / 2, top = base - c.ht;
      p.poly([[x0, base], [c.x, base + 6], [c.x, top + 6], [x0, top]], '#2c2624');
      p.poly([[c.x, base + 6], [x1, base], [x1, top], [c.x, top + 6]], '#191514');
      p.poly([[x0, top], [c.x, top - 6], [x1, top], [c.x, top + 6]], '#4a423e');
      for (let y = top + 20; y < base - 10; y += 16 + Math.floor(r(Math.floor(y)) * 18)) p.R(x0 + 2, y, c.w / 2 - 3, 1, '#3c3532');
      // 용암 금: 구불구불 아래로
      if (r(Math.floor(c.x)) < 0.75) {
        let cx = c.x + (r(Math.floor(c.x) + 1) - 0.5) * c.w * 0.5;
        for (let y = top + 14 + r(Math.floor(c.x) + 2) * 30; y < base - 2; y += 2) { cx += (r(Math.floor(y + c.x)) - 0.5) * 2.4; cx = Math.max(x0 + 3, Math.min(x1 - 3, cx)); p.R(cx - 1, y, 3, 2, '#c23a10'); p.R(cx, y, 1, 2, '#ffb03a'); }
      }
    }
    // 발치의 굴러떨어진 돌
    for (let k = 0; k < 5; k++) { const x = 16 + r(k + 50) * 108, y = base - 2 + r(k + 55) * 6; p.E(x, y, 6 + r(k + 58) * 6, 4, '#24201e'); p.E(x - 2, y - 2, 4, 2, '#3a3430'); }
    p.finish([8, 4, 4]);
    for (let k = 0; k < 10; k++) { const x = 20 + r(k + 60) * 100; p.R(x, base - 4 - r(k + 70) * 6, 3, 2, '#ff8a2a'); }
    return { canvas: p.c, ax: 0.5, ay: base / (2 * (h + 14)) };
  }
  if (theme === 'swamp') {
    // 이끼 낀 바위산: 들쭉날쭉한 능선, 왼쪽 위에서 오는 흐린 빛, 아래에 깔린 안개
    const h = 110 + Math.floor(r(1) * 70);
    const W1 = 84;
    const p = pen(W1, h + 16);
    const base = (h + 8) * 2, cx = W1, peakX = cx + (r(2) - 0.5) * 40, top = base - h * 2;
    const ridge: [number, number][] = [[6, base]];
    for (let k = 1; k < 8; k++) { const t = k / 8, x = 6 + t * (W1 * 2 - 12); const peak = 1 - Math.abs(x - peakX) / (W1 * 0.95); ridge.push([x, base - Math.max(18, peak * h * 2) + (r(k + 5) - 0.5) * 26]); }
    ridge.push([W1 * 2 - 6, base]);
    p.poly(ridge, '#262a22');
    // 빛 받는 왼쪽 면
    const lit: [number, number][] = ridge.filter(([x]) => x <= peakX + 4).concat([[peakX, base]]);
    p.poly(lit, '#3a4034');
    for (let k = 0; k < 9; k++) { const y = top + 30 + k * ((base - top - 40) / 9), x = 20 + r(k + 30) * (W1 * 2 - 60); p.R(x, y, 18 + r(k + 40) * 30, 2, '#1c1f19'); }
    for (let k = 0; k < 14; k++) { const x = 16 + r(k + 50) * (W1 * 2 - 40), y = top + 40 + r(k + 60) * (base - top - 50); p.E(x, y, 5 + r(k + 70) * 8, 2.4, k % 2 ? '#4a5a2a' : '#3e4e24'); }
    for (let k = 0; k < 3; k++) { const x = 30 + r(k + 90) * (W1 * 2 - 60), y = base - 30 - r(k + 95) * 60; p.L(x, y, x + 10, y - 22, 2, '#1a1a12'); p.L(x + 10, y - 22, x + 18, y - 26, 1, '#1a1a12'); }
    p.finish([10, 12, 8]);
    // 안개: 반투명 띠 (테두리 뒤에 덧칠)
    p.g.globalAlpha = 0.22;
    for (let k = 0; k < 6; k++) p.E(20 + k * 28 + r(k + 120) * 10, base - 6 - r(k + 130) * 16, 30 + r(k + 140) * 16, 8, '#a8b89a');
    p.g.globalAlpha = 1;
    return { canvas: p.c, ax: 0.5, ay: base / (2 * (h + 16)) };
  }
  // 피의 시장: 가시 박힌 붉은 벽돌 성벽 (o = 0: i 방향, 1: j 방향, 2: 망루)
  const tower = o === 2;
  const Hh = tower ? 128 : 96;
  const p = pen(72, Hh + 70);
  const ox = 72, oy = (Hh + 52) * 2; // 칸 가운데 바닥
  const dir = o === 1 ? -1 : 1;
  const brick = (x0: number, y0: number, x1: number, y1: number, ht: number, face: string, dark: string, slope: number) => {
    const n = Math.max(1, Math.round(Math.abs(x1 - x0)));
    for (let k = 0; k <= n; k++) {
      const t = k / n, x = x0 + (x1 - x0) * t, y = y0 + (y1 - y0) * t;
      p.R(x, y - ht, 1, ht, face);
      for (let yy = 8; yy < ht; yy += 8) { const off = (Math.floor(yy / 8) % 2) * 6; if (((k + off) % 12) === 0) p.R(x, y - yy, 1, 8, dark); p.R(x, y - yy, 1, 1, dark); }
    }
    void slope;
  };
  if (tower) {
    const s = 30;
    brick(ox - s * 2, oy - s, ox, oy, Hh * 2, '#5a2a24', '#2a1210', 0.5);
    brick(ox, oy, ox + s * 2, oy - s, Hh * 2, '#3e1c18', '#1e0c0a', -0.5);
    p.poly([[ox - s * 2, oy - s - Hh * 2], [ox, oy - Hh * 2 - s * 2], [ox + s * 2, oy - s - Hh * 2], [ox, oy - Hh * 2]], '#6a3a30');
    for (let k = 0; k < 4; k++) { const x = ox - s * 2 + 10 + k * 30; p.R(x, oy - Hh * 2 - s - 14 + (k > 1 ? (k - 1.5) * 10 : (1.5 - k) * -10), 12, 16, '#5a2a24'); }
    skull(p, ox, oy - Hh * 2 - s - 26, 1.3, 1);
    p.L(ox, oy - Hh * 2 - s - 12, ox, oy - Hh * 2 - s - 36, 2, '#4a4642');
  } else {
    const ax = ox - 64 * dir, ay = oy - 32, bx = ox + 64 * dir, by = oy + 32; // 칸을 가로지르는 바닥 선 (2배)
    const th = 10; // 두께 (뒤쪽으로)
    const tx = dir * th, ty = -th / 2;
    brick(Math.min(ax, bx), dir > 0 ? ay : by, Math.max(ax, bx), dir > 0 ? by : ay, Hh * 2, '#5a2a24', '#2a1210', 0.5);
    p.poly([[ax, ay - Hh * 2], [bx, by - Hh * 2], [bx + tx, by - Hh * 2 + ty], [ax + tx, ay - Hh * 2 + ty]], '#6a3a30');
    // 톱니 (총안)
    for (let k = 0; k < 4; k++) {
      const t0 = k / 4 + 0.03, t1 = t0 + 0.14;
      const x0 = ax + (bx - ax) * t0, y0 = ay + (by - ay) * t0, x1 = ax + (bx - ax) * t1, y1 = ay + (by - ay) * t1;
      p.poly([[x0, y0 - Hh * 2], [x1, y1 - Hh * 2], [x1, y1 - Hh * 2 - 16], [x0, y0 - Hh * 2 - 16]], '#5a2a24');
      p.poly([[x0, y0 - Hh * 2 - 16], [x1, y1 - Hh * 2 - 16], [x1 + tx, y1 - Hh * 2 - 16 + ty], [x0 + tx, y0 - Hh * 2 - 16 + ty]], '#7a4a3e');
    }
    // 쇠 가시와 꽂힌 해골
    for (let k = 0; k < 5; k++) {
      const t = (k + 0.5) / 5, x = ax + (bx - ax) * t + tx / 2, y = ay + (by - ay) * t - Hh * 2 + ty / 2;
      if (k % 2 === 1) { p.L(x, y, x, y - 22, 2, '#5a5652'); if ((v + k) % 3 === 0) skull(p, x, y - 26, 1.0, dir); }
    }
    // 위에서 흘러내린 핏자국
    for (let k = 0; k < 4; k++) {
      const t = r(k + 10), x = ax + (bx - ax) * t, y = ay + (by - ay) * t - Hh * 2 + 6;
      p.R(x, y, 2, 20 + r(k + 20) * 70, '#6a0a08');
    }
  }
  p.finish([10, 4, 4]);
  return { canvas: p.c, ax: 0.5, ay: oy / (2 * (Hh + 70)) };
}

/** 마을 울타리 한 칸: 1층 그을린 뾰족 말뚝(가끔 해골), 2층 갈대 울(뼈 부적), 3층 낮은 돌담 */
function villageFence(theme: Theme, v: number, o: number, r: (k: number) => number): HPic {
  const p = pen(68, 72);
  const ox = 68, oy = 108; // 칸 가운데 바닥 (2배)
  const dir = o === 1 ? -1 : 1;
  const along = (t: number): [number, number] => [ox + dir * t * 128 - dir * 64, oy - 32 + t * 64];
  if (theme === 'ash') {
    const stake = (x: number, y: number, h: number, k: number) => {
      p.poly([[x - 4, y], [x + 4, y], [x + 4, y - h], [x, y - h - 10], [x - 4, y - h]], '#2a1e18');
      p.R(x - 4, y - h, 2, h, '#4a3a2e');
      p.R(x - 1, y - h - 8, 2, 4, '#c84a1a');
      if ((v + k) % 7 === 0) skull(p, x, y - h - 14, 0.9, dir);
    };
    if (o === 2) { stake(ox, oy, 70, 0); p.finish(); return { canvas: p.c, ax: 0.5, ay: oy / 144 }; }
    for (const ry of [24, 44]) for (let t = 0; t <= 1; t += 1 / 64) { const [x, y] = along(t); p.R(x - 1, y - ry, 2, 3, '#5a4636'); }
    for (let k = 0; k < 8; k++) { const [x, y] = along((k + 0.5) / 8); stake(x, y + 1, 50 + ((v + k) % 3) * 6 + r(k) * 4, k); }
  } else if (theme === 'swamp') {
    if (o === 2) { p.L(ox, oy, ox, oy - 74, 6, '#3a3220'); skull(p, ox, oy - 80, 1, 1); p.finish(); return { canvas: p.c, ax: 0.5, ay: oy / 144 }; }
    for (let k = 0; k < 22; k++) { const [x, y] = along((k + 0.5) / 22); const h = 40 + r(k) * 22; p.R(x - 2, y - h, 4, h, k % 3 ? '#6a6238' : '#7e7646'); p.R(x - 2, y - h, 1, h, '#948a56'); p.R(x - 1, y - h - 6, 2, 7, '#8a8a4a'); }
    for (const ry of [16, 32]) for (let t = 0; t <= 1; t += 1 / 64) { const [x, y] = along(t); p.R(x - 1, y - ry, 2, 3, '#3a2e18'); }
    if (v % 2 === 0) { const [x, y] = along(0.5); p.L(x, y - 30, x, y - 22, 1, '#2a2414'); bone(p, x - 5, y - 18, x + 5, y - 20, 2); p.R(x - 1, y - 16, 2, 6, '#6a1a12'); }
  } else {
    // 낮은 돌담: 돌 줄 둘 + 덮개돌
    const H = 30;
    if (o === 2) { p.R(ox - 12, oy - H - 18, 24, H + 18, '#5a4a44'); p.R(ox - 12, oy - H - 18, 8, H + 18, '#6e5c54'); p.R(ox - 14, oy - H - 22, 28, 6, '#7a6a60'); p.finish(); return { canvas: p.c, ax: 0.5, ay: oy / 144 }; }
    for (let t = 0; t <= 1; t += 1 / 128) {
      const [x, y] = along(t);
      p.R(x, y - H, 1, H, '#4a3c36');
      const k = Math.floor(t * 128);
      if (k % 14 === 0) p.R(x, y - H, 1, H, '#2a201c');
      p.R(x, y - 15 - ((Math.floor(k / 14) % 2) * 0), 1, 1, '#2a201c');
      p.R(x, y - H - 6, 1, 6, '#6e5e56');
    }
  }
  p.finish();
  return { canvas: p.c, ax: 0.5, ay: oy / 144 };
}
