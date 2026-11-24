// 미리 구운 거리 조각: 건물 면(1층·위층·난간), 지붕 타일, 바닥 타일, 차, 소품 (tools/sprite3d/street.py)
// 건물 조각은 '구역 번호 × 16 + 음영'이라 건물마다 벽색·차양색·밤 창문 불빛을 따로 입힌다.
import { Rectangle, Texture } from 'pixi.js';
import { type Building, type Zone, tileAt } from './zone.ts';
import { TW, TH, iso } from './gfx.ts';
import { kindOf, mainPoi } from './names.ts';

export const GPX = 100, UPX = 52, PPX = 20; // 1층 · 위층 · 옥상 난간 높이 (px)

interface Atlas { img: HTMLCanvasElement; px: Uint8ClampedArray; meta: Record<string, number[]> }
let bld: Atlas, ground: Atlas, cars: Atlas, props: Atlas;
const texCache = new Map<string, { tex: Texture; ax: number; ay: number }>();

async function loadAtlas(name: string): Promise<Atlas> {
  const [meta, img] = await Promise.all([
    fetch(`./sprites/${name}.json`).then((r) => r.json()),
    new Promise<HTMLImageElement>((res, rej) => { const im = new Image(); im.onload = () => res(im); im.onerror = rej; im.src = `./sprites/${name}.png`; }),
  ]);
  const c = document.createElement('canvas');
  c.width = img.width; c.height = img.height;
  const g = c.getContext('2d', { willReadFrequently: true })!;
  g.drawImage(img, 0, 0);
  return { img: c, px: g.getImageData(0, 0, c.width, c.height).data, meta };
}

export let kitOk = false;
export const streetReady: Promise<boolean> = (async () => {
  try {
    [bld, ground, cars, props] = await Promise.all(['bld', 'ground', 'cars', 'props'].map(loadAtlas));
    kitOk = true;
    return true;
  } catch {
    return false;
  }
})();

function rng(seed: number) {
  let s = (seed >>> 0) % 2147483647 || 1;
  return () => (s = (s * 16807) % 2147483647) / 2147483647;
}
const hash = (a: number, b: number) => ((a * 73856093) ^ (b * 19349663)) >>> 0;

// ───────────────────────── 색 ─────────────────────────
function hex(h: string): number[] { return [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255); }
function ramp(h: string): Uint8ClampedArray {
  const c = hex(h);
  const out = new Uint8ClampedArray(48);
  const cool = [0.84, 0.88, 1.08];
  for (let lv = 0; lv < 16; lv++) {
    const f = lv / 11;
    for (let k = 0; k < 3; k++) {
      let v: number;
      if (f <= 1) { const g = Math.pow(f, 1.4); v = c[k] * g; v = v * (1 - (1 - g) * 0.45) + v * cool[k] * (1 - g) * 0.45; }
      else v = c[k] + (1 - c[k]) * (f - 1) * 1.2;
      out[lv * 3 + k] = Math.round(Math.max(0, Math.min(1, v)) * 255);
    }
  }
  return out;
}
const glow = (h: string) => { const r = new Uint8ClampedArray(48); const c = hex(h); for (let lv = 0; lv < 16; lv++) for (let k = 0; k < 3; k++) r[lv * 3 + k] = Math.round(Math.min(1, c[k] * (0.82 + lv * 0.02)) * 255); return r; };
function mix(a: string, b: string, t: number) {
  const x = hex(a), y = hex(b);
  return '#' + x.map((v, k) => Math.round((v + (y[k] - v) * t) * 255).toString(16).padStart(2, '0')).join('');
}

export const SIGN_COLORS: Record<string, string> = {
  convenience: '#2f8f5b', pharmacy: '#3a7fb8', clinic: '#3f8f8a', restaurant: '#b8462f', bar: '#7a3a8a', cafe: '#6b4a32', bank: '#2f5d8f',
  worship: '#b8862f', school: '#8f6a2f', hotel: '#5a4a7a', laundry: '#5a5fae', shop: '#a0582f', office: '#55606e', condo: '#55606e',
};
const AWNINGS = ['#2f7a4a', '#2c5a8c', '#a33a2c', '#c08a2a', '#6a3a7a'];

// ───────────────────────── 건물 ─────────────────────────
type Face = 'L' | 'R';
const SHOP_GLASS = new Set(['convenience', 'supermarket', 'pharmacy', 'chemist', 'cafe', 'bank', 'bakery', 'optician', 'mobile_phone', 'computer', 'electronics', 'clothes', 'shoes', 'cosmetics', 'fitness_centre', 'bureau_de_change', 'coworking_space', 'dentist', 'clinic', 'jewelry', 'watches', 'travel_agency', 'ice_cream', 'books']);
const SHOP_SHUTTER = new Set(['restaurant', 'fast_food', 'food_court', 'bar', 'pub', 'nightclub', 'shop', 'laundry', 'massage', 'hairdresser', 'beauty', 'tailor', 'hardware', 'tattoo', 'cannabis', 'gift', 'variety_store', 'kiosk', 'motorcycle_repair', 'car_repair', 'alcohol', 'second_hand', 'marketplace']);
const LOBBY = new Set(['hotel', 'hostel', 'guest_house', 'apartment_hotel', 'mall', 'department_store', 'hospital', 'school', 'cinema']);
const TOWER = new Set(['office', 'mall', 'department_store', 'coworking_space', 'bank']);

/** 층수: 변환기 높이(px = 16 + 층 × 15) → 위층 개수 */
export function upperFloors(b: Building) {
  if (b.cat === 'ujusae') return 1;
  const lv = Math.max(1, Math.round((b.h - 16) / 15));
  return Math.max(0, Math.min(8, lv - 1));
}
export function buildingTop(b: Building, low = false) {
  return GPX + (low ? 0 : upperFloors(b)) * UPX + PPX;
}

function groundKind(b: Building, face: Face, k: number, n: number, onSign: boolean, r: () => number): string {
  if (b.cat === 'ujusae') return onSign && k === Math.floor(n / 2) ? 'wooddoor' : 'wood';
  const kd = kindOf(b);
  if (onSign && LOBBY.has(kd)) return k % 4 === 1 || k % 4 === 2 ? 'lobby' : 'glass';
  // 줄무늬 차양은 간판 면 가운데 한 칸에만 (모든 칸에 차양을 달면 거리가 차양 숲이 된다)
  const awnBay = k === Math.floor((n - 1) / 2);
  if (onSign && SHOP_GLASS.has(kd)) return 'glass';
  if (onSign && SHOP_SHUTTER.has(kd)) return awnBay ? 'shop' : 'glass';
  if (b.cat === 'office') return onSign ? 'lobby' : 'glass';
  if (b.cat === 'condo' || b.cat === 'hotel') return onSign ? (k % 4 === 1 || k % 4 === 2 ? 'lobby' : 'glass') : 'wall';
  if (onSign && SHOP_GLASS.has(b.cat)) return 'glass';
  if (onSign) return awnBay ? 'shop' : 'glass';
  const x = r();
  return face === 'L' ? (x < 0.08 ? 'shop' : x < 0.55 ? 'closed' : 'wall') : x < 0.05 ? 'shop' : x < 0.5 ? 'closed' : 'wall';
}
function upperKind(b: Building, k: number, f: number, colRand: number): string {
  if (b.cat === 'office' || TOWER.has(kindOf(b))) return 'curtain';
  if (b.cat === 'condo') return colRand < 0.55 ? 'balcony' : colRand < 0.8 ? 'plain' : 'ac';
  if (b.cat === 'hotel') return colRand < 0.6 ? 'plain' : 'ac';
  if (b.cat === 'ujusae') return 'plain';
  const h = (hash(k * 7 + 3, f * 13 + 1) % 100) / 100;
  if (colRand < 0.12) return 'wall';
  return h < 0.45 ? 'grille' : h < 0.75 ? 'ac' : h < 0.92 ? 'plain' : 'balcony';
}

/** 건물 한 채를 조각으로 조립해 캔버스 한 장에 그린다 (gfx.drawBuilding 과 같은 꼴) */
/** low = '건물 낮추기': 1층(간판 있는 층)과 옥상 난간만 그려 거리가 보이게 */
export function drawBuildingKit(b: Building, signText: string, night: boolean, low = false) {
  const { i0, j0, w, d } = b;
  const i1 = i0 + w, j1 = j0 + d;
  const nU = low ? 0 : upperFloors(b);
  const roofZ = GPX + nU * UPX;
  const top = roofZ + PPX;
  const r = rng(hash(i0, j0) + 17);
  const kd = kindOf(b);
  const temple = kd === 'place_of_worship' || b.cat === 'worship';
  const faith = temple ? faithOf(b) : null;
  const MX = 36, MT = temple ? 190 : 76, MB = 28;
  const minX = (i0 - j1) * (TW / 2) - MX;
  const topY = (i0 + j0) * (TH / 2) - top - MT;
  const W = (w + d) * (TW / 2) + MX * 2, H = (w + d) * (TH / 2) + top + MT + MB;
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const g = c.getContext('2d')!;
  const img = g.createImageData(W, H);
  const D = img.data;
  const P = (x: number, y: number, z: number): [number, number] => [Math.round((x - y) * (TW / 2) - minX), Math.round((x + y) * (TH / 2) - topY - z)];
  // 건물 색
  const wall = b.cat === 'ujusae' ? '#4a3527' : kindOf(b) === 'place_of_worship' || b.cat === 'worship' ? '#efe9dc' : b.color;
  const trim = b.cat === 'office' ? '#9aa6b2' : b.cat === 'ujusae' ? '#2e2018' : mix(wall, '#f2efe6', 0.45);
  const signCol = signColor(kd);
  const awn = signCol ? mix(signCol, '#000000', 0.05) : AWNINGS[hash(i0, j0) % AWNINGS.length];
  const glass = b.cat === 'office' || TOWER.has(kd) ? '#4e7a86' : '#4a6070';
  const base = ['#000000', wall, trim, glass, '#c9ccce', '#3b3f44', '#231c17', night ? '#ffe0a0' : '#8a6a48', '#8d98a3', awn, '#ece6d6', '#e4e0d6', '#6b4429', '#8f8a80', '#4a7a3a', ['#c06050', '#c9a24a', '#7aa0c0'][hash(j0, i0) % 3]];
  const pal = base.map((h, k) => (k === 7 && night ? glow(h) : ramp(h)));
  const lit = glow('#f2d58a'), darkGlass = ramp('#1c2430');
  const put = (key: string, sx: number, sy: number, glassMode: 0 | 1 | 2 = 0) => {
    const m = bld.meta[key];
    if (!m) return;
    const [ax, ay, mw, mh, ox, oy] = m;
    const X = sx + ox, Y = sy + oy;
    for (let yy = 0; yy < mh; yy++) {
      const ty = Y + yy;
      if (ty < 0 || ty >= H) continue;
      let si = ((ay + yy) * bld.img.width + ax) * 4;
      for (let xx = 0; xx < mw; xx++, si += 4) {
        if (bld.px[si + 3] < 128) continue;
        const tx = X + xx;
        if (tx < 0 || tx >= W) continue;
        const v = bld.px[si], reg = v >> 4, lv = (v & 15) * 3;
        const rp = reg === 3 && glassMode ? (glassMode === 1 ? lit : darkGlass) : pal[reg];
        const di = (ty * W + tx) * 4;
        D[di] = rp[lv]; D[di + 1] = rp[lv + 1]; D[di + 2] = rp[lv + 2]; D[di + 3] = 255;
      }
    }
  };
  const winMode = (): 0 | 1 | 2 => (night ? (r() < 0.45 ? 1 : 2) : 0);
  const topKind = b.cat === 'office' || TOWER.has(kd) ? 'curtain' : 'parapet';
  // 뒤쪽 난간 (안쪽 면) → 지붕 → 옥상 설비 → 앞 두 면
  for (let j = j0; j < j1; j++) { const [x, y] = P(i0, j + 1, roofZ); put(`p-${topKind}-R`, x, y); }
  for (let i = i0; i < i1; i++) { const [x, y] = P(i, j0, roofZ); put(`p-${topKind}-L`, x, y); }
  for (let j = j0; j < j1; j++)
    for (let i = i0; i < i1; i++) { const [x, y] = P(i, j, roofZ); put(`roof-${hash(i, j) % 3}`, x, y); }
  // 앞 두 면: 먼 칸부터 가까운 칸으로, 칸마다 아래층부터
  const leftSign = b.sign === 'left', rightSign = b.sign === 'right';
  const colRand = (k: number, f: Face) => (hash(k * 3 + (f === 'L' ? 1 : 2), i0 + j0) % 1000) / 1000;
  // 오른쪽 면 (x = i1, j 증가 = 가까워짐)
  for (let j = j0; j < j1; j++) {
    const k = j - j0, cr = colRand(k, 'R');
    let [x, y] = P(i1, j + 1, 0);
    put(`g-${groundKind(b, 'R', k, d, rightSign, r)}-R`, x, y, winMode());
    for (let f = 0; f < nU; f++) { [x, y] = P(i1, j + 1, GPX + f * UPX); put(`u-${upperKind(b, k, f, cr)}-R`, x, y, winMode()); }
    [x, y] = P(i1, j + 1, roofZ); put(`p-${topKind}-R`, x, y);
  }
  // 왼쪽 면 (y = j1, i 증가 = 가까워짐)
  for (let i = i0; i < i1; i++) {
    const k = i - i0, cr = colRand(k, 'L');
    let [x, y] = P(i, j1, 0);
    put(`g-${groundKind(b, 'L', k, w, leftSign, r)}-L`, x, y, winMode());
    for (let f = 0; f < nU; f++) { [x, y] = P(i, j1, GPX + f * UPX); put(`u-${upperKind(b, k, f, cr)}-L`, x, y, winMode()); }
    [x, y] = P(i, j1, roofZ); put(`p-${topKind}-L`, x, y);
  }
  g.putImageData(img, 0, 0);
  // 옥상 설비 (색 그대로)
  if (b.cat !== 'ujusae' && !temple && w >= 2 && d >= 2) {
    const items: [string, number, number][] = [];
    if (b.cat === 'office' || nU >= 6) items.push(['stair-0', i0 + Math.max(1, w * 0.35), j0 + Math.max(1, d * 0.4)]);
    if (b.cat !== 'office') items.push(['tank-0', i0 + 0.8 + r() * (w - 1.6), j0 + 0.8 + r() * Math.max(0.1, d * 0.4)]);
    for (let n = 0; n < Math.min(3, Math.floor((w * d) / 12)); n++) items.push(['acbox-0', i0 + 0.6 + r() * (w - 1.2), j0 + 0.6 + r() * (d - 1.2)]);
    items.sort((a, c2) => a[1] + a[2] - (c2[1] + c2[2]));
    for (const [key, x, y] of items) {
      const m = props.meta[key];
      if (!m) continue;
      const [px, py] = P(x, y, roofZ);
      g.drawImage(props.img, m[0], m[1], m[2], m[3], px + m[4], py + m[5], m[2], m[3]);
    }
    // 앞 난간이 설비 아래를 가린다
    const img2 = g.getImageData(0, 0, W, H);
    for (let j = j0; j < j1; j++) { const [x, y] = P(i1, j + 1, roofZ); putTo(img2.data, W, H, `p-${topKind}-R`, x, y, pal); }
    for (let i = i0; i < i1; i++) { const [x, y] = P(i, j1, roofZ); putTo(img2.data, W, H, `p-${topKind}-L`, x, y, pal); }
    g.putImageData(img2, 0, 0);
  }
  if (faith === 'church') churchRoof(g, P, i0, j0, w, d, roofZ);
  else if (faith === 'mosque' || faith === 'sikh') domeRoof(g, P, i0, j0, w, d, roofZ, faith);
  else if (temple) templeRoof(g, P, i0, j0, w, d, roofZ);
  // 간판 (가게 이름) — 1층 처마 띠에 기울여 붙인다
  if (b.sign && b.cat !== 'ujusae' && signText) {
    const left = b.sign === 'left';
    const span = left ? w : d;
    const A = (s: number, z: number) => (left ? P(i0 + s, j1, z) : P(i1, j1 - s, z));
    const z0 = GPX - 22, z1 = GPX - 5;
    const s0 = 0.15, s1 = Math.min(span - 0.15, Math.max(2.2, Math.min(span, 4.5)));
    const col = signCol ?? '#a0582f';
    const quad = (pts: [number, number][], fill: string) => { g.beginPath(); g.moveTo(...pts[0]); for (const p of pts.slice(1)) g.lineTo(...p); g.closePath(); g.fillStyle = fill; g.fill(); };
    quad([A(s0, z1 + 1), A(s1, z1 + 1), A(s1, z0 - 1), A(s0, z0 - 1)], '#1d1712');
    quad([A(s0, z1), A(s1, z1), A(s1, z0), A(s0, z0)], col);
    quad([A(s0, z1), A(s1, z1), A(s1, z1 - 2), A(s0, z1 - 2)], mix(col, '#ffffff', 0.3));
    const [sx, sy] = A((s0 + s1) / 2, z0 + 4);
    g.save();
    g.translate(sx, sy);
    g.transform(1, left ? 0.5 : -0.5, 0, 1, 0, 0);
    const room = (s1 - s0) * 35 - 8;
    let fs = 11, text = signText;
    g.font = `700 ${fs}px sans-serif`;
    while (fs > 7 && g.measureText(text).width > room) { fs -= 1; g.font = `700 ${fs}px sans-serif`; }
    if (g.measureText(text).width > room) { while (text.length > 1 && g.measureText(text + '…').width > room) text = text.slice(0, -1); text += '…'; }
    g.textAlign = 'center';
    g.fillStyle = 'rgba(0,0,0,0.35)';
    g.fillText(text, 1, 1);
    g.fillStyle = night ? '#fff6d8' : '#fffaf0';
    g.fillText(text, 0, 0);
    g.restore();
  }
  return { canvas: c, x: minX, y: topY };
}

/** 업종별 간판 색 */
function signColor(kd: string): string | null {
  const G: [string[], string][] = [
    [['convenience', 'supermarket', 'kiosk', 'variety_store'], '#2f8f5b'], [['pharmacy', 'chemist', 'clinic', 'dentist', 'hospital', 'veterinary'], '#3a7fb8'],
    [['restaurant', 'fast_food', 'food_court', 'marketplace'], '#b8462f'], [['bar', 'pub', 'nightclub'], '#7a3a8a'], [['cafe', 'bakery', 'coffee', 'tea', 'ice_cream'], '#6b4a32'],
    [['bank', 'bureau_de_change'], '#2f5d8f'], [['massage', 'beauty', 'hairdresser', 'cosmetics'], '#b0567a'], [['hotel', 'hostel', 'guest_house', 'apartment_hotel'], '#5a4a7a'],
    [['tailor', 'clothes', 'shoes', 'bag', 'jewelry', 'watches'], '#4a5a7a'], [['laundry'], '#5a5fae'], [['hardware', 'car_repair', 'motorcycle_repair', 'motorcycle'], '#c08a2a'],
    [['place_of_worship'], '#b8862f'], [['school', 'kindergarten', 'library'], '#8f6a2f'], [['cannabis'], '#3f7a3a'], [['fitness_centre'], '#c0392b'],
  ];
  for (const [ks, c] of G) if (ks.includes(kd)) return c;
  return SIGN_COLORS[kd] ?? null;
}

/** 이름으로 종교를 가린다 (지도에는 종교 표시가 빠진 곳이 많다). 모르면 태국 사원(가장 흔함) */
type Faith = 'buddhist' | 'church' | 'mosque' | 'sikh';
export function faithOf(b: Building): Faith {
  const p = mainPoi(b);
  const n = `${p?.n ?? ''} ${p?.nen ?? ''}`.toLowerCase();
  if (/church|chapel|cathedral|คริสต|โบสถ์คริสต์|อาสนวิหาร|christ|catholic/.test(n)) return 'church';
  if (/mosque|masjid|มัสยิด|surau|สุเหร่า/.test(n)) return 'mosque';
  if (/sikh|gurdwara|gurudwara|ซิกข์|namdhari|นามธารี|sangat/.test(n)) return 'sikh';
  return 'buddhist';
}

type Proj = (x: number, y: number, z: number) => [number, number];
const poly = (g: CanvasRenderingContext2D, pts: [number, number][], fill: string, stroke?: string, lw = 1.5) => {
  g.beginPath(); g.moveTo(...pts[0]); for (const p of pts.slice(1)) g.lineTo(...p); g.closePath();
  g.fillStyle = fill; g.fill(); if (stroke) { g.strokeStyle = stroke; g.lineWidth = lw; g.stroke(); }
};

/** 교회: 가파른 회색 박공 + 앞쪽 종탑(뾰족 지붕·십자가) */
function churchRoof(g: CanvasRenderingContext2D, P: Proj, i0: number, j0: number, w: number, d: number, z0: number) {
  const along = w >= d, i1 = i0 + w, j1 = j0 + d;
  const H = Math.min(110, (along ? d : w) * 26 + 24);
  if (along) {
    const jm = (j0 + j1) / 2;
    poly(g, [P(i0 - 0.1, j1 + 0.15, z0), P(i1 + 0.1, j1 + 0.15, z0), P(i1 + 0.1, jm, z0 + H), P(i0 - 0.1, jm, z0 + H)], '#5d6168', '#3d4046');
    poly(g, [P(i1 + 0.1, j0 - 0.15, z0), P(i1 + 0.1, j1 + 0.15, z0), P(i1 + 0.1, jm, z0 + H)], '#d8d1c2', '#9a9286');
    const [cx, cy] = P(i1 + 0.1, jm, z0 + H * 0.45); g.fillStyle = '#6a4a8a'; g.beginPath(); g.arc(cx, cy, Math.max(3, H * 0.08), 0, Math.PI * 2); g.fill(); // 둥근 창
  } else {
    const im = (i0 + i1) / 2;
    poly(g, [P(i1 + 0.15, j0 - 0.1, z0), P(i1 + 0.15, j1 + 0.1, z0), P(im, j1 + 0.1, z0 + H), P(im, j0 - 0.1, z0 + H)], '#4f535a', '#3d4046');
    poly(g, [P(i0 - 0.15, j1 + 0.1, z0), P(i1 + 0.15, j1 + 0.1, z0), P(im, j1 + 0.1, z0 + H)], '#d8d1c2', '#9a9286');
  }
  // 종탑: 앞(+i,+j) 모서리 쪽 네모 기둥
  const s = 0.45, ti = along ? i1 - 0.6 : (i0 + i1) / 2, tj = along ? (j0 + j1) / 2 : j1 - 0.6;
  const zt = z0 + H * 1.15, zs = zt + H * 0.7;
  poly(g, [P(ti + s, tj - s, z0), P(ti + s, tj + s, z0), P(ti + s, tj + s, zt), P(ti + s, tj - s, zt)], '#cfc7b6');
  poly(g, [P(ti - s, tj + s, z0), P(ti + s, tj + s, z0), P(ti + s, tj + s, zt), P(ti - s, tj + s, zt)], '#e6dfd0');
  const [bx, by] = P(ti + s, tj, zt - H * 0.3); g.fillStyle = '#2b2a30'; g.fillRect(bx - 2, by - 6, 4, 8);
  poly(g, [P(ti + s, tj - s, zt), P(ti + s, tj + s, zt), P(ti, tj, zs)], '#474b52');
  poly(g, [P(ti - s, tj + s, zt), P(ti + s, tj + s, zt), P(ti, tj, zs)], '#5d6168');
  const [kx, ky] = P(ti, tj, zs); g.fillStyle = '#e0b437'; g.fillRect(kx - 1, ky - 14, 2, 14); g.fillRect(kx - 5, ky - 10, 10, 2);
}

/** 이슬람 사원·시크 사원: 평평한 지붕 위 큰 돔 (+ 이슬람은 첨탑, 시크는 작은 금빛 돔 넷) */
function domeRoof(g: CanvasRenderingContext2D, P: Proj, i0: number, j0: number, w: number, d: number, z0: number, faith: 'mosque' | 'sikh') {
  const i1 = i0 + w, j1 = j0 + d;
  const dome = (ic: number, jc: number, zb: number, R: number, light: string, dark: string, tip: string) => {
    const [cx, cy] = P(ic, jc, zb);
    const rx = R, rz = R * 1.15;
    g.fillStyle = dark; g.fillRect(cx - rx * 0.92, cy - rz * 0.18, rx * 1.84, rz * 0.22); // 받침
    const gr = g.createLinearGradient(cx - rx, 0, cx + rx, 0); gr.addColorStop(0, light); gr.addColorStop(0.55, light); gr.addColorStop(1, dark);
    g.fillStyle = gr; g.beginPath(); g.ellipse(cx, cy - rz * 0.18, rx, rz, 0, Math.PI, Math.PI * 2); g.closePath(); g.fill();
    g.fillStyle = tip; g.fillRect(cx - 1, cy - rz * 1.18 - 10, 2, 10); g.beginPath(); g.arc(cx, cy - rz * 1.18 - 11, 2.2, 0, Math.PI * 2); g.fill();
  };
  const R = Math.min(46, Math.min(w, d) * 7 + 8);
  const ic = (i0 + i1) / 2, jc = (j0 + j1) / 2;
  if (faith === 'mosque') {
    dome(ic, jc, z0, R, '#3f9a6c', '#22603f', '#e0b437');
    // 첨탑: 오른쪽 모서리 (돔과 겹치지 않게)
    const ti = i1 - 0.5, tj = j0 + 0.5, th = R * 3.4;
    const [mx, my] = P(ti, tj, z0);
    g.fillStyle = '#ece6d8'; g.fillRect(mx - 4, my - th, 8, th);
    g.fillStyle = '#cfc6b2'; g.fillRect(mx + 1, my - th, 3, th);
    g.fillStyle = '#d9d2c2'; g.fillRect(mx - 6, my - th * 0.72, 12, 3); g.fillRect(mx - 6, my - th * 0.4, 12, 3);
    g.fillStyle = '#2f7a55'; g.beginPath(); g.moveTo(mx - 5, my - th); g.lineTo(mx + 5, my - th); g.lineTo(mx, my - th - 14); g.closePath(); g.fill();
  } else {
    for (const [a, c] of [[i0 + 0.5, j0 + 0.5], [i1 - 0.5, j0 + 0.5], [i0 + 0.5, j1 - 0.5], [i1 - 0.5, j1 - 0.5]] as [number, number][]) {
      if (a + c < ic + jc) dome(a, c, z0, R * 0.32, '#f2d27a', '#b88a2e', '#e0b437');
    }
    dome(ic, jc, z0, R, '#f5f1e8', '#c9c0ae', '#e0b437');
    for (const [a, c] of [[i0 + 0.5, j0 + 0.5], [i1 - 0.5, j0 + 0.5], [i0 + 0.5, j1 - 0.5], [i1 - 0.5, j1 - 0.5]] as [number, number][]) {
      if (a + c >= ic + jc) dome(a, c, z0, R * 0.32, '#f2d27a', '#b88a2e', '#e0b437');
    }
  }
}

/** 사원 지붕: 붉은 기와 박공 두 겹, 초록 테두리, 금빛 용마루와 처마 끝 장식(초파) */
function templeRoof(g: CanvasRenderingContext2D, P: (x: number, y: number, z: number) => [number, number], i0: number, j0: number, w: number, d: number, z0: number) {
  const along = w >= d; // 용마루 방향
  const i1 = i0 + w, j1 = j0 + d;
  const H = Math.min(90, (along ? d : w) * 18 + 20);
  const quad = (pts: [number, number][], fill: string, stroke?: string) => { g.beginPath(); g.moveTo(...pts[0]); for (const p of pts.slice(1)) g.lineTo(...p); g.closePath(); g.fillStyle = fill; g.fill(); if (stroke) { g.strokeStyle = stroke; g.lineWidth = 1.5; g.stroke(); } };
  const tiers = [{ inset: -0.25, z: 0, h: H * 0.55 }, { inset: 0.35, z: H * 0.38, h: H * 0.62 }];
  for (const tr of tiers) {
    const a0 = i0 - tr.inset * (along ? 0 : -1) * 0, ii0 = i0 - (along ? 0.25 : -tr.inset), ii1 = i1 + (along ? 0.25 : -tr.inset), jj0 = j0 - (along ? -tr.inset : 0.25), jj1 = j1 + (along ? -tr.inset : 0.25);
    void a0;
    const zb = z0 + tr.z, zt = z0 + tr.z + tr.h;
    if (along) {
      const jm = (jj0 + jj1) / 2;
      quad([P(ii0, jj1, zb), P(ii1, jj1, zb), P(ii1, jm, zt), P(ii0, jm, zt)], '#b5452e', '#3f6a3a'); // 앞(+j) 경사
      quad([P(ii1, jj0, zb), P(ii1, jj1, zb), P(ii1, jm, zt)], '#8a3424', '#c9a23e'); // 박공 삼각형
      g.strokeStyle = '#e0b437'; g.lineWidth = 2; g.beginPath(); g.moveTo(...P(ii0, jm, zt)); g.lineTo(...P(ii1, jm, zt)); g.stroke();
      const [fx, fy] = P(ii1, jm, zt); g.fillStyle = '#e0b437'; g.beginPath(); g.moveTo(fx, fy); g.quadraticCurveTo(fx + 8, fy - 6, fx + 6, fy - 16); g.lineTo(fx + 3, fy - 2); g.fill();
    } else {
      const im = (ii0 + ii1) / 2;
      quad([P(ii1, jj0, zb), P(ii1, jj1, zb), P(im, jj1, zt), P(im, jj0, zt)], '#9a3a28', '#3f6a3a'); // 오른쪽(+i) 경사
      quad([P(ii0, jj1, zb), P(ii1, jj1, zb), P(im, jj1, zt)], '#b5452e', '#c9a23e');
      g.strokeStyle = '#e0b437'; g.lineWidth = 2; g.beginPath(); g.moveTo(...P(im, jj0, zt)); g.lineTo(...P(im, jj1, zt)); g.stroke();
      const [fx, fy] = P(im, jj1, zt); g.fillStyle = '#e0b437'; g.beginPath(); g.moveTo(fx, fy); g.quadraticCurveTo(fx - 8, fy - 6, fx - 6, fy - 16); g.lineTo(fx - 3, fy - 2); g.fill();
    }
  }
}

function putTo(D: Uint8ClampedArray, W: number, H: number, key: string, sx: number, sy: number, pal: Uint8ClampedArray[]) {
  const m = bld.meta[key];
  if (!m) return;
  const [ax, ay, mw, mh, ox, oy] = m;
  for (let yy = 0; yy < mh; yy++) {
    const ty = sy + oy + yy;
    if (ty < 0 || ty >= H) continue;
    let si = ((ay + yy) * bld.img.width + ax) * 4;
    for (let xx = 0; xx < mw; xx++, si += 4) {
      if (bld.px[si + 3] < 128) continue;
      const tx = sx + ox + xx;
      if (tx < 0 || tx >= W) continue;
      const v = bld.px[si], rp = pal[v >> 4], lv = (v & 15) * 3, di = (ty * W + tx) * 4;
      D[di] = rp[lv]; D[di + 1] = rp[lv + 1]; D[di + 2] = rp[lv + 2]; D[di + 3] = 255;
    }
  }
}

// ───────────────────────── 바닥 ─────────────────────────
export const CHUNK = 24;
const GROUND_KEY: Record<string, string> = { road: 'road', median: 'median', walk: 'walk', soi: 'soi', cross: 'cross', lot: 'lot', block: 'block', park: 'park', water: 'water' };
export function drawGroundKit(z: Zone, i0: number, j0: number, clip?: { i0: number; i1: number; j0: number; j1: number } | null): { canvas: HTMLCanvasElement; x: number; y: number } | null {
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
  // 19차: 계단처럼 꺾이는 경계(풀밭·물·공터·보도·골목)는 모서리 반쪽을 이웃 땅 그림으로 덮어 비스듬한 선으로 · 연못 위 보도는 나무 다리
  const SOFT: Record<string, number> = { water: 0, lot: 1, block: 1, park: 2, walk: 3, soi: 3 };
  const bridge = (i: number, j: number) => tileAt(z, i, j) === 'walk' && [[1, 0], [-1, 0], [0, 1], [0, -1]].filter(([a, b]) => tileAt(z, i + a, j + b) === 'water').length >= 2;
  for (let j = j0; j < j1; j++)
    for (let i = i0; i < i1; i++) {
      const t = tileAt(z, i, j);
      if (t === 'void') continue;
      if (clip && (i < clip.i0 - 1 || i > clip.i1 || j < clip.j0 - 1 || j > clip.j1)) continue; // 20차 천국: 구름 아래는 하늘
      const m = ground.meta[`${GROUND_KEY[t] ?? 'lot'}-${hash(i, j) % 4}`];
      if (!m) continue;
      const [x, y] = S(i, j);
      g.drawImage(ground.img, m[0], m[1], m[2], m[3], x + m[4], y + m[5], m[2], m[3]);
      if (t === 'walk' && bridge(i, j)) {
        g.beginPath(); g.moveTo(x, y); g.lineTo(x + TW / 2, y + TH / 2); g.lineTo(x, y + TH); g.lineTo(x - TW / 2, y + TH / 2); g.closePath();
        g.fillStyle = '#8a6a48'; g.fill();
        g.strokeStyle = '#5e4630'; g.lineWidth = 1;
        for (let k = 1; k < 4; k++) { const a = S(i + k / 4, j), b = S(i + k / 4, j + 1); g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.stroke(); }
        continue;
      }
      const pt = SOFT[t];
      if (pt !== undefined) {
        const N = (a: number, b: number) => tileAt(z, i + a, j + b);
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
          const mx = ground.meta[`${GROUND_KEY[X] ?? 'lot'}-${hash(i + n1[0], j + n1[1]) % 4}`];
          if (!mx) continue;
          g.save();
          g.beginPath();
          tri.forEach(([a, b], k) => { const [qx, qy] = S(a, b); if (k) g.lineTo(qx, qy); else g.moveTo(qx, qy); });
          g.closePath();
          g.clip();
          g.drawImage(ground.img, mx[0], mx[1], mx[2], mx[3], x + mx[4], y + mx[5], mx[2], mx[3]);
          g.restore();
        }
      }
      if (t === 'cross') {
        g.strokeStyle = 'rgba(236,232,222,0.92)'; g.lineWidth = 7;
        for (let k = 0; k < 2; k++) {
          const a = S(i + 0.2 + k * 0.5, j + 0.12), b = S(i + 0.2 + k * 0.5, j + 0.88);
          g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.stroke();
        }
      }
    }
  // 연석과 차선
  const line = (j: number, a0: number, a1: number, color: string, dashed: boolean, width = 2) => {
    if (j < j0 || j > j1) return;
    const s0 = Math.max(a0, i0), s1 = Math.min(a1 + 1, i1);
    if (s1 <= s0) return;
    const a = S(s0, j), b = S(s1, j);
    g.strokeStyle = color; g.lineWidth = width; g.setLineDash(dashed ? [12, 14] : []);
    g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.stroke();
  };
  for (const l of z.lanes) {
    if (l.j < j0 - 1 || l.j > j1 || l.i1 < i0 || l.i0 >= i1) continue;
    const mid = Math.floor((Math.max(l.i0, i0) + Math.min(l.i1, i1 - 1)) / 2);
    const up = tileAt(z, mid, l.j - 1), down = tileAt(z, mid, l.j + 1);
    if (up === 'road' || up === 'cross') line(l.j, l.i0, l.i1, 'rgba(225,222,212,0.85)', true);
    else if (up === 'median') line(l.j, l.i0, l.i1, '#d8b63c', false);
    else if (up === 'walk') { line(l.j, l.i0, l.i1, '#8e877b', false, 3); line(l.j, l.i0, l.i1, '#c9c2b4', false, 1); }
    if (down === 'median') line(l.j + 1, l.i0, l.i1, '#d8b63c', false);
    else if (down === 'walk') { line(l.j + 1, l.i0, l.i1, '#8e877b', false, 3); line(l.j + 1, l.i0, l.i1, '#c9c2b4', false, 1); }
  }
  g.setLineDash([]);
  return { canvas: c, x: minX, y: minY };
}

// ───────────────────────── 차 · 소품 ─────────────────────────
function sub(a: Atlas, key: string) {
  const id = `${a === cars ? 'c' : 'p'}:${key}`;
  let hit = texCache.get(id);
  if (!hit) {
    const m = a.meta[key];
    if (!m) return null;
    let src = (a as Atlas & { src?: Texture['source'] }).src;
    if (!src) { src = Texture.from(a.img).source; src.scaleMode = 'nearest'; (a as Atlas & { src?: Texture['source'] }).src = src; }
    const tex = new Texture({ source: src, frame: new Rectangle(m[0], m[1], m[2], m[3]) });
    hit = { tex, ax: -m[4] / m[2], ay: -m[5] / m[3] };
    texCache.set(id, hit);
  }
  return hit;
}
export const CAR_MODELS = ['taxi-pink', 'taxi-pink', 'taxi-green', 'sedan-white', 'sedan-black', 'sedan-silver', 'sedan-red', 'sedan-blue', 'pickup', 'tuktuk', 'moto', 'moto', 'bus'];
/** 차 그림: dir = +1 (i 증가, 화면 오른쪽 아래) → se, -1 → nw. 기준점 = 차 바닥 가운데 */
export function carSprite(model: string, dir: 1 | -1) {
  return sub(cars, `${model}-${dir > 0 ? 'se' : 'nw'}`);
}
export function propSprite(kind: string, variant = 0) {
  return sub(props, `${kind}-${variant}`) ?? sub(props, `${kind}-0`);
}
