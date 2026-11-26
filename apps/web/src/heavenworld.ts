// 35차 천국 1층: 현실 지도를 덮어 쓰던 천국을 버리고, 구름 위에 따로 지은 넓은 세계.
// 서쪽 끝 우주새(도착) → 상점가(현실의 모든 가게 · 돈을 마음껏 꺼내는 은행) → 한가운데 거대한 천국 본청 →
// 북쪽 놀이공원 · 남쪽 동물원 · 동쪽 휴양지(수영장 · 썬베드 · 호텔 · 오락실) → 동쪽 끝 우주선 기지(환생)까지 걸어서 간다.
import { TYPES, finalize, type Zone, type Building, type Prop } from './zone.ts';
import { TW, TH, iso } from './gfx.ts';
import type { PropPic } from './propgfx.ts';

const TI = Object.fromEntries(TYPES.map((t, k) => [t, k])) as Record<(typeof TYPES)[number], number>;
export const HEAVEN_ID = 'heaven-1';
const W = 216, H = 124;

type B = Building & { pois?: { t: string; n: string; nko: string; nth: string; nen: string; c?: string }[]; att?: string };
const P = (t: string, ko: string, th: string, en: string, c?: string) => ({ t, n: en, nko: ko, nth: th, nen: en, ...(c ? { c } : {}) });
/** 상점가의 가게들 (이름은 천국의 것, 파는 것은 현실의 것) */
const SHOPS = [
  P('bank', '천상은행 본점', 'ธนาคารสวรรค์', 'Bank of Heaven'),
  P('convenience', '구름 편의점', 'ร้านสะดวกซื้อเมฆ', 'Cloud Mart'),
  P('restaurant', '천상 타이 키친', 'ครัวไทยสวรรค์', 'Celestial Thai Kitchen', 'thai'),
  P('cafe', '엔젤 커피', 'แองเจิลคอฟฟี่', 'Angel Coffee'),
  P('pharmacy', '은하 약국', 'ร้านยากาแล็กซี่', 'Galaxy Pharmacy'),
  P('restaurant', '하늘 한식당', 'ร้านอาหารเกาหลีฟ้า', 'Sky Korean Table', 'korean'),
  P('hairdresser', '날개 미용실', 'ร้านทำผมปีก', 'Wings Salon'),
  P('jewelry', '성배 보석관', 'หอเพชรจอกศักดิ์สิทธิ์', 'Grail Jewels'),
  P('massage', '솜구름 마사지', 'นวดเมฆฝ้าย', 'Cottoncloud Massage'),
  P('bar', '헤일로 바', 'เฮโลบาร์', 'Halo Bar'),
  P('restaurant', '만나 버거', 'มานาเบอร์เกอร์', 'Manna Burger', 'burger'),
  P('fitness_centre', '천상 피트니스', 'ฟิตเนสสวรรค์', 'Celestial Fitness'),
  P('department_store', '에덴 백화점', 'ห้างอีเดน', 'Eden Department Store'),
  P('hardware', '천국 공구점', 'ร้านเครื่องมือสวรรค์', 'Heaven Hardware'),
  P('bank', '구름은행', 'ธนาคารเมฆ', 'Cloud Bank'),
  P('restaurant', '오로라 스시', 'ออโรร่าซูชิ', 'Aurora Sushi', 'japanese'),
  P('cafe', '무지개 디저트', 'ขนมรุ้ง', 'Rainbow Desserts', 'dessert'),
  P('antiques', '영원 골동품', 'ของเก่านิรันดร์', 'Eternity Antiques'),
];
/** 가게마다 값이 다르다 — 이름으로 정해지는 배수 (어떤 곳은 터무니없이 비싸다) */
export function heavenPriceMul(name: string): number {
  if (/보석|Jewel|เพชร|골동|Antique|ของเก่า/.test(name)) return 1000;
  let h = 0; for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return [1, 2, 3, 5, 10, 50, 200][h % 7];
}

export interface HeavenMeta { palace: number; base: { i: number; j: number }; pools: [number, number, number, number][] }
let meta: HeavenMeta | null = null;
export const heavenMeta = () => meta;

export function heavenZone(): Zone {
  const tiles = new Uint8Array(W * H).fill(TI.void);
  const set = (i: number, j: number, t: keyof typeof TI) => { if (i >= 0 && j >= 0 && i < W && j < H) tiles[j * W + i] = TI[t]; };
  const rect = (i0: number, j0: number, i1: number, j1: number, t: keyof typeof TI) => { for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) set(i, j, t); };
  const cx = W / 2, cy = H / 2;
  // 구름섬: 가장자리가 뭉게뭉게한 긴 타원
  for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) {
    const a = Math.atan2(j - cy, i - cx);
    const wob = 0.06 * Math.sin(a * 5 + 1.3) + 0.04 * Math.sin(a * 11 + 0.4) + 0.03 * Math.sin(a * 17);
    const r = ((i - cx) / (cx - 3)) ** 2 + ((j - cy) / (cy - 3)) ** 2;
    if (r < 1 + wob) set(i, j, 'park');
  }
  // 큰길(동서) · 상점가 뒷길 · 남북 길
  rect(6, 56, W - 6, 61, 'walk');
  rect(24, 69, 90, 71, 'walk');
  for (const i of [24, 56, 128, 168]) rect(i, 14, i + 3, H - 14, 'walk');
  // 중앙 광장 (천국 본청)
  rect(92, 34, 128, 82, 'lot');
  // 북쪽 놀이공원 · 남쪽 동물원 길
  rect(92, 12, 126, 33, 'lot'); rect(100, 24, 120, 26, 'walk');
  rect(96, 86, 124, 88, 'walk'); for (const i of [100, 110, 120]) rect(i, 86, i + 1, 110, 'walk');
  // 동쪽 휴양지: 수영장 여럿 (물가는 흰 타일 바닥)
  const pools: [number, number, number, number][] = [[134, 64, 145, 72], [150, 66, 162, 76], [134, 80, 146, 90], [152, 84, 162, 94], [134, 40, 146, 48], [150, 36, 162, 46]];
  for (const [a, b, c, d] of pools) { rect(a - 2, b - 2, c + 2, d + 2, 'lot'); rect(a, b, c, d, 'water'); }
  // 동쪽 끝 우주선 기지
  rect(184, 44, 204, 74, 'lot'); rect(168, 56, 184, 61, 'walk');
  // 건물
  const buildings: B[] = [];
  // 우주새: 도착하는 문 (서쪽 끝)
  buildings.push({ i0: 16, j0: 52, w: 2, d: 2, h: 58, cat: 'ujusae', sign: 'left', color: '#ffffff' });
  // 상점가: 큰길 북쪽 줄(간판이 큰길 쪽 +j) · 뒷길 줄(간판이 뒷길 쪽 +j)
  let s = 0;
  for (let i = 28; i + 6 <= 90 && s < SHOPS.length; i += 7) {
    if (i >= 56 && i <= 59) continue;
    const big = SHOPS[s].t === 'department_store';
    buildings.push({ i0: i, j0: big ? 44 : 49, w: 6, d: big ? 12 : 7, h: big ? 190 : 84 + ((i * 7) % 5) * 18, cat: 'shop', sign: 'left', color: ['#f6f0e4', '#eef2f6', '#f8ecee', '#eef6ee', '#f4f0f8'][s % 5], pois: [SHOPS[s]] });
    s++;
  }
  for (let i = 28; i + 6 <= 90 && s < SHOPS.length; i += 7) {
    if (i >= 56 && i <= 59) continue;
    buildings.push({ i0: i, j0: 62, w: 6, d: 7, h: 78 + ((i * 5) % 4) * 20, cat: 'shop', sign: 'left', color: ['#f4f0f8', '#f6f0e4', '#eef6ee', '#eef2f6'][s % 4], pois: [SHOPS[s]] });
    s++;
  }
  // 천국 본청: 광장 한가운데 (들어가지 않는다 — 올려다볼 뿐)
  const palace = buildings.length;
  buildings.push({ i0: 101, j0: 43, w: 18, d: 18, h: 520, cat: 'palace', color: '#ffffff', pois: [P('palace', '천국 본청', 'หอสวรรค์', 'Hall of Heaven')] });
  // 놀이공원 · 오락실
  buildings.push({ i0: 94, j0: 13, w: 8, d: 8, h: 300, cat: 'attraction', att: 'ferris', color: '#ffffff', pois: [P('attraction', '구름 대관람차', 'ชิงช้าสวรรค์เมฆ', 'Cloud Ferris Wheel')] });
  buildings.push({ i0: 105, j0: 15, w: 6, d: 6, h: 90, cat: 'attraction', att: 'carousel', color: '#ffffff', pois: [P('attraction', '날개 회전목마', 'ม้าหมุนปีก', 'Winged Carousel')] });
  buildings.push({ i0: 113, j0: 12, w: 12, d: 9, h: 160, cat: 'attraction', att: 'coaster', color: '#ffffff', pois: [P('attraction', '은하 롤러코스터', 'รถไฟเหาะกาแล็กซี่', 'Galaxy Coaster')] });
  buildings.push({ i0: 84, j0: 18, w: 7, d: 6, h: 96, cat: 'shop', sign: 'left', color: '#2a2440', pois: [P('amusement_arcade', '스타라이트 오락실', 'อาเขตสตาร์ไลท์', 'Starlight Arcade')] });
  // 휴양지 호텔 (큰길 북쪽)
  buildings.push({ i0: 134, j0: 50, w: 12, d: 6, h: 260, cat: 'hotel', sign: 'left', color: '#fbf6ea', pois: [P('hotel', '그랜드 헤븐 호텔', 'แกรนด์เฮเว่นโฮเต็ล', 'Grand Heaven Hotel')] });
  buildings.push({ i0: 150, j0: 50, w: 8, d: 6, h: 120, cat: 'shop', sign: 'left', color: '#eef6f4', pois: [P('bar', '풀사이드 바', 'พูลไซด์บาร์', 'Poolside Bar')] });
  // 소품
  const props: Prop[] = [];
  const prop = (i: number, j: number, kind: string, o = 0) => { if (tiles[j * W + i] !== TI.water && tiles[j * W + i] !== TI.void) props.push({ i, j, kind: kind as Prop['kind'], o }); };
  // 수영장 가의 썬베드와 파라솔
  for (const [a, b, c, d] of pools) {
    for (let i = a; i <= c; i += 2) { prop(i, b - 2, i % 4 ? 'sunbed' : 'parasol'); prop(i, d + 2, (i + 1) % 4 ? 'sunbed' : 'parasol'); }
  }
  // 동물원: 울타리 친 우리 여섯, 우리마다 동물
  const zoo: [number, number, string][] = [[96, 92, 'giraffe'], [104, 92, 'elephant'], [114, 92, 'lion'], [96, 102, 'zebra'], [104, 102, 'flamingo'], [114, 102, 'panda']];
  for (const [a, b, an] of zoo) {
    for (let i = a; i <= a + 5; i++) { prop(i, b, 'fence', 0); prop(i, b + 6, 'fence', 0); }
    for (let j = b + 1; j <= b + 5; j++) { prop(a, j, 'fence', 1); prop(a + 5, j, 'fence', 1); }
    for (let n = 0; n < (an === 'flamingo' ? 4 : 2); n++) prop(a + 2 + (n % 2) * 2, b + 2 + Math.floor(n / 2) * 2, an);
  }
  // 광장 분수 · 놀이공원 풍선 수레 · 길가 나무
  prop(98, 70, 'fountain'); prop(122, 70, 'fountain'); prop(98, 38, 'fountain'); prop(122, 38, 'fountain');
  prop(100, 28, 'balloons'); prop(118, 28, 'balloons'); prop(110, 30, 'icecream');
  for (let i = 8; i < W - 8; i += 6) { if ((i > 88 && i < 130) || i > 180) continue; prop(i, 55, 'tree'); prop(i + 3, 62, 'tree'); }
  // 우주선 기지: 발사대 (계단 대신)
  const base = { i: 194, j: 58 };
  const door = { i: 17, j: 55 };
  meta = { palace, base, pools };
  return finalize({ id: HEAVEN_ID, W, H, tiles, buildings, props, lanes: [], door, spawn: door, heavenGen: true } as unknown as Omit<Zone, 'blocked'>);
}

// ───────────────────────── 바닥 ─────────────────────────
const rnd = (seed: number) => { let s = seed >>> 0 || 1; return () => ((s = Math.imul(s ^ (s >>> 15), 2246822519) ^ Math.imul(s ^ (s >>> 13), 3266489917)) >>> 0) / 4294967296; };
/** 구름 잔디 · 흰 대리석 길(금줄) · 옅은 금빛 광장 · 하늘빛 수영장 · 섬 가장자리의 뭉게구름 */
export function drawHeavenGround(z: Zone, i0: number, j0: number, chunk: number): { canvas: HTMLCanvasElement; x: number; y: number } | null {
  const i1 = Math.min(z.W, i0 + chunk), j1 = Math.min(z.H, j0 + chunk);
  const at = (i: number, j: number) => (i < 0 || j < 0 || i >= z.W || j >= z.H ? 'void' : TYPES[z.tiles[j * z.W + i]]);
  let any = false;
  for (let j = j0; j < j1 && !any; j++) for (let i = i0; i < i1; i++) if (at(i, j) !== 'void') { any = true; break; }
  if (!any) return null;
  const minX = (i0 - j1) * (TW / 2), minY = (i0 + j0) * (TH / 2);
  const c = document.createElement('canvas');
  c.width = (i1 - i0 + j1 - j0) * (TW / 2) + 2;
  c.height = (i1 - i0 + j1 - j0) * (TH / 2) + 30;
  const g = c.getContext('2d')!;
  const S = (x: number, y: number): [number, number] => { const [a, b] = iso(x, y); return [a - minX, b - minY]; };
  const r = rnd(11 + i0 * 131 + j0 * 977);
  const quad = (i: number, j: number, col: string) => {
    const a = S(i, j), b = S(i + 1, j), cc = S(i + 1, j + 1), d = S(i, j + 1);
    g.fillStyle = col; g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.lineTo(cc[0], cc[1]); g.lineTo(d[0], d[1]); g.closePath(); g.fill();
  };
  for (let j = j0; j < j1; j++) for (let i = i0; i < i1; i++) {
    const t = at(i, j);
    if (t === 'void') continue;
    const n = ((i * 7 + j * 13) % 5) / 5;
    if (t === 'park') quad(i, j, ['#dfeccc', '#d8e8c4', '#e4efd2', '#dbe9c8', '#e2eed0'][Math.floor(n * 5)]);
    else if (t === 'walk') { quad(i, j, (i + j) % 2 ? '#fbfaf7' : '#ece8de'); }
    else if (t === 'lot') quad(i, j, (i + j) % 2 ? '#f6ecd4' : '#eedfbc');
    else if (t === 'water') quad(i, j, ((i * 3 + j) % 4) ? '#7ad4e8' : '#8adcee');
  }
  // 무늬: 잔디의 솜털 · 길의 금줄 · 물결 · 물가 타일 테두리
  for (let j = j0; j < j1; j++) for (let i = i0; i < i1; i++) {
    const t = at(i, j);
    if (t === 'park') for (let k = 0; k < 3; k++) { const [x, y] = S(i + r(), j + r()); g.fillStyle = r() < 0.5 ? '#f6fbee' : '#c6dbb0'; g.fillRect(Math.round(x), Math.round(y), 2, 1); }
    if (t === 'walk') {
      if (at(i, j - 1) !== 'walk') { const a = S(i, j), b = S(i + 1, j); g.strokeStyle = '#d8b860'; g.lineWidth = 1; g.beginPath(); g.moveTo(a[0], a[1] + 0.5); g.lineTo(b[0], b[1] + 0.5); g.stroke(); }
      if (at(i - 1, j) !== 'walk') { const a = S(i, j), b = S(i, j + 1); g.strokeStyle = '#d8b860'; g.lineWidth = 1; g.beginPath(); g.moveTo(a[0] + 0.5, a[1]); g.lineTo(b[0] + 0.5, b[1]); g.stroke(); }
    }
    if (t === 'water') {
      for (let k = 0; k < 2; k++) { const [x, y] = S(i + r(), j + r()); g.fillStyle = 'rgba(255,255,255,0.7)'; g.fillRect(Math.round(x), Math.round(y), 5, 1); }
      if (at(i, j - 1) !== 'water') { const a = S(i, j), b = S(i + 1, j); g.strokeStyle = '#ffffff'; g.lineWidth = 2; g.beginPath(); g.moveTo(a[0], a[1] + 1); g.lineTo(b[0], b[1] + 1); g.stroke(); }
      if (at(i - 1, j) !== 'water') { const a = S(i, j), b = S(i, j + 1); g.strokeStyle = '#ffffff'; g.lineWidth = 2; g.beginPath(); g.moveTo(a[0] + 1, a[1]); g.lineTo(b[0] + 1, b[1]); g.stroke(); }
    }
  }
  // 섬 가장자리: 아래로 흘러내리는 구름 덩이 (앞쪽 두 면)
  for (let j = j0; j < j1; j++) for (let i = i0; i < i1; i++) {
    if (at(i, j) === 'void') continue;
    if (at(i, j + 1) === 'void' || at(i + 1, j) === 'void') {
      const [x, y] = S(i + 1, j + 1);
      for (let k = 0; k < 3; k++) {
        const rx = 10 + r() * 12, ry = 6 + r() * 6;
        g.fillStyle = k === 0 ? 'rgba(220,226,240,0.95)' : 'rgba(255,255,255,0.95)';
        g.beginPath(); g.ellipse(x - 14 + r() * 28, y + 4 + k * 4 + r() * 6, rx, ry, 0, 0, Math.PI * 2); g.fill();
      }
    }
  }
  return { canvas: c, x: minX, y: minY };
}

// ───────────────────────── 건물 ─────────────────────────
function frame(b: Building, top: number) {
  const i1 = b.i0 + b.w, j1 = b.j0 + b.d;
  const minX = (b.i0 - j1) * (TW / 2) - 8, maxX = (i1 - b.j0) * (TW / 2) + 8;
  const minY = (b.i0 + b.j0) * (TH / 2) - top - 8, maxY = (i1 + j1) * (TH / 2) + 6;
  const c = document.createElement('canvas');
  c.width = Math.ceil(maxX - minX); c.height = Math.ceil(maxY - minY);
  const g = c.getContext('2d')!;
  const Q = (x: number, y: number, z: number): [number, number] => [(x - y) * (TW / 2) - minX, (x + y) * (TH / 2) - z - minY];
  const poly = (pts: [number, number][], col: string, a = 1) => { g.globalAlpha = a; g.fillStyle = col; g.beginPath(); g.moveTo(pts[0][0], pts[0][1]); for (const p of pts.slice(1)) g.lineTo(p[0], p[1]); g.closePath(); g.fill(); g.globalAlpha = 1; };
  const box = (x0: number, y0: number, x1: number, y1: number, z0: number, z1: number, top2: string, left: string, right: string) => {
    poly([Q(x1, y0, z0), Q(x1, y1, z0), Q(x1, y1, z1), Q(x1, y0, z1)], right);
    poly([Q(x0, y1, z0), Q(x1, y1, z0), Q(x1, y1, z1), Q(x0, y1, z1)], left);
    poly([Q(x0, y0, z1), Q(x1, y0, z1), Q(x1, y1, z1), Q(x0, y1, z1)], top2);
  };
  return { c, g, Q, poly, box, x: minX, y: minY };
}
/** 천국 본청: 층층이 좁아지는 흰 대리석 탑 · 금빛 띠와 기둥 줄 · 꼭대기 금빛 둥근 지붕과 빛나는 첨탑 */
export function drawHeavenPalace(b: Building) {
  const f = frame(b, b.h + 60);
  const { g, Q, box, poly } = f;
  const cx = b.i0 + b.w / 2, cy = b.j0 + b.d / 2;
  const lv = [{ r: b.w / 2, z0: 0, z1: 130 }, { r: b.w / 2 - 2, z0: 130, z1: 250 }, { r: b.w / 2 - 3.6, z0: 250, z1: 350 }, { r: b.w / 2 - 5, z0: 350, z1: 430 }];
  for (const [k, L] of lv.entries()) {
    const x0 = cx - L.r, x1 = cx + L.r, y0 = cy - L.r, y1 = cy + L.r;
    box(x0, y0, x1, y1, L.z0, L.z1, '#fdfbf6', '#ece6da', '#ddd5c6');
    // 기둥 줄 (앞 두 면)
    const n = Math.round(L.r * 2);
    for (let q = 0; q <= n; q++) {
      const x = x0 + (q / n) * (x1 - x0), y = y0 + (q / n) * (y1 - y0);
      poly([Q(x - 0.08, y1, L.z0 + 6), Q(x + 0.08, y1, L.z0 + 6), Q(x + 0.08, y1, L.z1 - 10), Q(x - 0.08, y1, L.z1 - 10)], '#fbf8f0');
      poly([Q(x1, y - 0.08, L.z0 + 6), Q(x1, y + 0.08, L.z0 + 6), Q(x1, y + 0.08, L.z1 - 10), Q(x1, y - 0.08, L.z1 - 10)], '#efe8da');
    }
    // 금빛 띠
    box(x0 - 0.1, y0 - 0.1, x1 + 0.1, y1 + 0.1, L.z1 - 8, L.z1, '#f2d27a', '#d9b44a', '#c09a36');
    if (k === 0) { // 정면 큰 문 (빛이 새는 아치)
      poly([Q(cx - 1.2, y1 + 0.01, 0), Q(cx + 1.2, y1 + 0.01, 0), Q(cx + 1.2, y1 + 0.01, 60), Q(cx - 1.2, y1 + 0.01, 60)], '#fff1c4');
      poly([Q(cx - 0.9, y1 + 0.02, 0), Q(cx + 0.9, y1 + 0.02, 0), Q(cx + 0.9, y1 + 0.02, 52), Q(cx - 0.9, y1 + 0.02, 52)], '#ffe28a');
    }
  }
  // 둥근 지붕과 첨탑
  const [dx, dy] = Q(cx, cy, 430);
  const grd = g.createRadialGradient(dx - 12, dy - 30, 4, dx, dy - 10, 70);
  grd.addColorStop(0, '#fff6c8'); grd.addColorStop(0.5, '#f2c84a'); grd.addColorStop(1, '#b8862a');
  g.fillStyle = grd; g.beginPath(); g.ellipse(dx, dy, 62, 70, 0, Math.PI, 0); g.closePath(); g.fill();
  g.fillStyle = '#fff4c0'; g.fillRect(Math.round(dx) - 2, Math.round(dy) - 120, 4, 52);
  const glow = g.createRadialGradient(dx, dy - 124, 1, dx, dy - 124, 26);
  glow.addColorStop(0, 'rgba(255,250,220,1)'); glow.addColorStop(1, 'rgba(255,240,180,0)');
  g.fillStyle = glow; g.beginPath(); g.arc(dx, dy - 124, 26, 0, Math.PI * 2); g.fill();
  return { canvas: f.c, x: f.x, y: f.y };
}
/** 놀이공원 탈것: 대관람차 · 회전목마 · 롤러코스터 */
export function drawAttraction(b: Building & { att?: string }) {
  const f = frame(b, b.h + 20);
  const { g, Q, box, poly } = f;
  const cx = b.i0 + b.w / 2, cy = b.j0 + b.d / 2;
  const line = (a: [number, number], c2: [number, number], col: string, w = 2) => { g.strokeStyle = col; g.lineWidth = w; g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(c2[0], c2[1]); g.stroke(); };
  if (b.att === 'ferris') {
    box(cx - 1.5, cy - 1.5, cx + 1.5, cy + 1.5, 0, 10, '#f6efe0', '#e6dcc8', '#d6ccb6');
    const [hx, hy] = Q(cx, cy, 160);
    const R = 130;
    for (const s of [-1, 1]) { const [fx, fy] = Q(cx - 1.2 * s, cy + 1.2 * s, 8); line([fx, fy], [hx, hy], '#d8d0c0', 5); }
    g.strokeStyle = '#f2d27a'; g.lineWidth = 4; g.beginPath(); g.arc(hx, hy, R, 0, Math.PI * 2); g.stroke();
    g.strokeStyle = '#ffffff'; g.lineWidth = 2; g.beginPath(); g.arc(hx, hy, R - 8, 0, Math.PI * 2); g.stroke();
    const cols = ['#f28aa8', '#8ac8f2', '#f2d27a', '#a8e0a0', '#c8a8f2', '#f2a87a'];
    for (let k = 0; k < 16; k++) {
      const a = (k / 16) * Math.PI * 2, x = hx + Math.cos(a) * R, y = hy + Math.sin(a) * R;
      line([hx, hy], [x, y], 'rgba(255,255,255,0.9)', 1.5);
      g.fillStyle = cols[k % cols.length]; g.fillRect(Math.round(x) - 6, Math.round(y) + 2, 12, 10);
      g.fillStyle = 'rgba(255,255,255,0.7)'; g.fillRect(Math.round(x) - 4, Math.round(y) + 4, 8, 3);
      g.fillStyle = '#c9a23e'; g.fillRect(Math.round(x) - 1, Math.round(y) - 1, 2, 4);
    }
    g.fillStyle = '#c9a23e'; g.beginPath(); g.arc(hx, hy, 9, 0, Math.PI * 2); g.fill();
  } else if (b.att === 'carousel') {
    box(cx - 2.8, cy - 2.8, cx + 2.8, cy + 2.8, 0, 8, '#f6e8d0', '#e8d4b4', '#d8c09a');
    const [tx, ty] = Q(cx, cy, 70);
    // 줄무늬 천막 지붕
    for (let k = 0; k < 12; k++) {
      const a0 = (k / 12) * Math.PI * 2, a1 = ((k + 1) / 12) * Math.PI * 2;
      g.fillStyle = k % 2 ? '#f6f2ea' : '#e85a6a';
      g.beginPath(); g.moveTo(tx, ty - 34); g.lineTo(tx + Math.cos(a0) * 92, ty + Math.sin(a0) * 40); g.lineTo(tx + Math.cos(a1) * 92, ty + Math.sin(a1) * 40); g.closePath(); g.fill();
    }
    g.fillStyle = '#c9a23e'; g.fillRect(Math.round(tx) - 2, Math.round(ty) - 48, 4, 16);
    // 기둥과 날개 단 목마
    for (let k = 0; k < 8; k++) {
      const a = (k / 8) * Math.PI * 2, x = tx + Math.cos(a) * 70, y = ty + Math.sin(a) * 30 + 40;
      if (Math.sin(a) < -0.2) continue;
      line([x, ty + Math.sin(a) * 30 + 6], [x, y + 18], '#d9b44a', 2);
      g.fillStyle = '#fbfaf6'; g.fillRect(Math.round(x) - 7, Math.round(y), 14, 7);
      g.fillStyle = '#fbfaf6'; g.fillRect(Math.round(x) + 5, Math.round(y) - 5, 4, 7);
      g.fillStyle = '#f2d27a'; g.fillRect(Math.round(x) - 4, Math.round(y) - 3, 6, 3);
    }
  } else if (b.att === 'coaster') {
    // 흰 기둥 위로 굽이치는 금빛 레일, 앞쪽에 빨간 열차
    const pts: [number, number][] = [];
    for (let k = 0; k <= 40; k++) {
      const t = k / 40, x = b.i0 + 0.6 + t * (b.w - 1.2), y = b.j0 + b.d / 2 + Math.sin(t * Math.PI * 3) * (b.d / 2 - 1), z = 30 + Math.abs(Math.sin(t * Math.PI * 2.2)) * (b.h - 50);
      pts.push(Q(x, y, z));
      if (k % 3 === 0) { const base = Q(x, y, 0); line(base, pts[pts.length - 1], '#ece6da', 2); }
    }
    g.strokeStyle = '#d9b44a'; g.lineWidth = 4; g.beginPath(); g.moveTo(pts[0][0], pts[0][1]); for (const p of pts) g.lineTo(p[0], p[1]); g.stroke();
    g.strokeStyle = '#fff4c8'; g.lineWidth = 1; g.beginPath(); g.moveTo(pts[0][0], pts[0][1] - 2); for (const p of pts) g.lineTo(p[0], p[1] - 2); g.stroke();
    for (let k = 0; k < 4; k++) { const p = pts[12 + k]; g.fillStyle = '#e83a4a'; g.fillRect(Math.round(p[0]) - 5, Math.round(p[1]) - 8, 10, 6); g.fillStyle = '#ffd8a8'; g.fillRect(Math.round(p[0]) - 2, Math.round(p[1]) - 11, 3, 3); }
    poly([Q(b.i0, b.j0 + b.d, 0), Q(b.i0 + b.w, b.j0 + b.d, 0), Q(b.i0 + b.w, b.j0 + b.d, 0.1), Q(b.i0, b.j0 + b.d, 0.1)], '#ffffff');
  }
  return { canvas: f.c, x: f.x, y: f.y };
}

// ───────────────────────── 소품 ─────────────────────────
export const HEAVEN_PROPS = new Set(['sunbed', 'parasol', 'giraffe', 'elephant', 'lion', 'zebra', 'flamingo', 'panda', 'fountain', 'balloons', 'icecream']);
function pic(w: number, h: number, ax: number, ay: number, draw: (R: (x: number, y: number, w: number, h: number, c: string) => void, g: CanvasRenderingContext2D) => void): PropPic {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const g = c.getContext('2d')!;
  const R = (x: number, y: number, ww: number, hh: number, col: string) => { g.fillStyle = col; g.fillRect(Math.round(x), Math.round(y), Math.round(ww), Math.round(hh)); };
  draw(R, g);
  return { canvas: c, ax: ax / w, ay: ay / h };
}
export function heavenProp(kind: string, v: number): PropPic {
  const E = (g: CanvasRenderingContext2D, x: number, y: number, rx: number, ry: number, col: string) => { g.fillStyle = col; g.beginPath(); g.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); g.fill(); };
  switch (kind) {
    case 'sunbed': return pic(52, 30, 26, 22, (R, g) => {
      E(g, 26, 24, 22, 6, 'rgba(0,0,0,0.12)');
      g.fillStyle = '#ffffff'; g.beginPath(); g.moveTo(6, 22); g.lineTo(32, 26); g.lineTo(46, 19); g.lineTo(20, 15); g.closePath(); g.fill();
      g.fillStyle = ['#7ac8e8', '#f2a8b8', '#f2d27a'][v % 3]; g.beginPath(); g.moveTo(9, 20); g.lineTo(30, 23.5); g.lineTo(40, 18); g.lineTo(19, 15); g.closePath(); g.fill();
      g.fillStyle = '#f6f2ea'; g.beginPath(); g.moveTo(32, 26); g.lineTo(46, 19); g.lineTo(46, 9); g.lineTo(36, 14); g.closePath(); g.fill();
      R(8, 22, 2, 4, '#d8d0c0'); R(30, 25, 2, 4, '#d8d0c0'); R(44, 19, 2, 4, '#d8d0c0');
    });
    case 'parasol': return pic(56, 70, 28, 64, (R, g) => {
      E(g, 28, 64, 18, 5, 'rgba(0,0,0,0.12)');
      R(27, 18, 2, 46, '#e8e0d0');
      for (let k = 0; k < 8; k++) { const a0 = (k / 8) * Math.PI * 2, a1 = ((k + 1) / 8) * Math.PI * 2; g.fillStyle = k % 2 ? '#ffffff' : ['#f28aa8', '#7ac8e8', '#f2c84a'][v % 3]; g.beginPath(); g.moveTo(28, 6); g.lineTo(28 + Math.cos(a0) * 26, 20 + Math.sin(a0) * 9); g.lineTo(28 + Math.cos(a1) * 26, 20 + Math.sin(a1) * 9); g.closePath(); g.fill(); }
    });
    case 'giraffe': return pic(40, 86, 20, 80, (R, g) => {
      E(g, 20, 80, 12, 4, 'rgba(0,0,0,0.15)');
      const Y = '#e8b858', S = '#a8642a';
      R(10, 52, 18, 12, Y); for (const x of [11, 15, 22, 26]) R(x, 62, 2, 18, Y);
      R(24, 14, 5, 42, Y); R(23, 8, 10, 7, Y); R(31, 10, 3, 3, Y); R(25, 4, 1, 4, S); R(28, 4, 1, 4, S); R(30, 10, 1, 1, '#2a1a10');
      for (const [x, y] of [[12, 54], [18, 57], [22, 53], [25, 22], [26, 32], [25, 42], [14, 60]]) R(x, y, 3, 3, S);
    });
    case 'elephant': return pic(58, 52, 29, 46, (R, g) => {
      E(g, 29, 46, 22, 5, 'rgba(0,0,0,0.15)');
      E(g, 26, 26, 18, 13, '#a8a8b0'); E(g, 42, 20, 10, 9, '#b0b0b8'); E(g, 36, 20, 7, 10, '#9a9aa4');
      for (const x of [14, 22, 30, 36]) R(x, 32, 6, 13, '#a0a0a8');
      R(48, 22, 4, 16, '#a8a8b0'); R(46, 37, 4, 3, '#a8a8b0'); R(45, 16, 2, 2, '#2a2a2e'); R(47, 26, 4, 2, '#f6f2ea');
    });
    case 'lion': return pic(46, 40, 23, 34, (R, g) => {
      E(g, 23, 34, 16, 4, 'rgba(0,0,0,0.15)');
      E(g, 20, 22, 13, 8, '#d8a050'); for (const x of [10, 15, 24, 29]) R(x, 26, 4, 8, '#d0984a');
      E(g, 34, 16, 9, 9, '#a8642a'); E(g, 35, 17, 5.5, 5.5, '#e0aa5a'); R(37, 15, 1, 1, '#2a1a10'); R(38, 19, 2, 1, '#6a3a1a');
      R(4, 18, 6, 2, '#d0984a'); R(2, 16, 3, 3, '#8a4a1a');
    });
    case 'zebra': return pic(44, 44, 22, 38, (R, g) => {
      E(g, 22, 38, 15, 4, 'rgba(0,0,0,0.15)');
      R(8, 18, 22, 12, '#fbfaf6'); for (const x of [9, 13, 24, 28]) R(x, 28, 3, 10, '#fbfaf6');
      R(28, 8, 6, 14, '#fbfaf6'); R(30, 4, 8, 6, '#fbfaf6'); R(36, 7, 3, 3, '#2a2a2e');
      for (let x = 10; x < 30; x += 4) R(x, 18, 2, 12, '#1e1e22'); for (let y = 9; y < 21; y += 4) R(28, y, 6, 2, '#1e1e22');
    });
    case 'flamingo': return pic(22, 46, 11, 42, (R, g) => {
      E(g, 11, 42, 7, 2, 'rgba(0,0,0,0.12)');
      R(10, 26, 1, 16, '#e87a8a'); R(13, 26, 1, 10, '#e87a8a'); R(12, 36, 3, 1, '#e87a8a');
      E(g, 11, 22, 7, 5, '#f498a8'); R(14, 8, 2, 13, '#f498a8'); R(13, 5, 5, 4, '#f498a8'); R(17, 7, 3, 2, '#2a2a2e');
    });
    case 'panda': return pic(40, 36, 20, 30, (R, g) => {
      E(g, 20, 30, 14, 4, 'rgba(0,0,0,0.15)');
      E(g, 18, 20, 12, 9, '#fbfaf6'); E(g, 18, 23, 12, 5, '#1e1e22'); E(g, 29, 14, 8, 7, '#fbfaf6');
      E(g, 24, 8, 3, 3, '#1e1e22'); E(g, 33, 8, 3, 3, '#1e1e22'); E(g, 27, 14, 2, 2, '#1e1e22'); E(g, 32, 14, 2, 2, '#1e1e22');
      R(31, 23, 6, 3, '#3a7a3a'); R(36, 18, 1, 10, '#4a9a4a');
    });
    case 'fountain': return pic(76, 70, 38, 56, (R, g) => {
      E(g, 38, 56, 34, 13, '#e8e2d6'); E(g, 38, 54, 30, 11, '#8adcee'); E(g, 38, 52, 26, 9, '#a8e8f4');
      R(34, 22, 8, 32, '#f6f2ea'); E(g, 38, 26, 14, 5, '#f2d27a'); E(g, 38, 24, 12, 4, '#a8e8f4');
      g.strokeStyle = 'rgba(255,255,255,0.85)'; g.lineWidth = 2;
      for (const s of [-1, 1]) { g.beginPath(); g.moveTo(38, 14); g.quadraticCurveTo(38 + s * 16, 2, 38 + s * 24, 48); g.stroke(); }
      R(37, 6, 2, 16, 'rgba(255,255,255,0.9)');
    });
    case 'balloons': return pic(40, 86, 20, 80, (R, g) => {
      E(g, 20, 80, 12, 4, 'rgba(0,0,0,0.12)');
      R(10, 64, 20, 14, '#f6efe0'); R(10, 64, 20, 3, '#e85a6a'); R(12, 78, 3, 3, '#5a4a3a'); R(25, 78, 3, 3, '#5a4a3a');
      const cols = ['#f28aa8', '#7ac8e8', '#f2d27a', '#a8e0a0', '#c8a8f2', '#f2a87a', '#ffffff'];
      for (let k = 0; k < 7; k++) { const x = 8 + ((k * 37) % 25), y = 8 + ((k * 23) % 26); g.strokeStyle = 'rgba(120,110,100,0.6)'; g.lineWidth = 1; g.beginPath(); g.moveTo(20, 64); g.lineTo(x, y + 8); g.stroke(); E(g, x, y, 6, 7.5, cols[k]); E(g, x - 2, y - 3, 1.5, 2, 'rgba(255,255,255,0.7)'); }
    });
    case 'icecream': return pic(44, 56, 22, 50, (R, g) => {
      E(g, 22, 50, 16, 4, 'rgba(0,0,0,0.12)');
      R(8, 30, 28, 18, '#fbfaf6'); R(8, 30, 28, 4, '#8ac8f2'); R(10, 48, 4, 3, '#4a4a4e'); R(30, 48, 4, 3, '#4a4a4e');
      for (let k = 0; k < 10; k++) { g.fillStyle = k % 2 ? '#f28aa8' : '#ffffff'; g.beginPath(); g.moveTo(22, 4); g.lineTo(6 + k * 3.2, 18); g.lineTo(9.2 + k * 3.2, 18); g.closePath(); g.fill(); }
      R(21, 18, 2, 12, '#c9a23e');
      E(g, 15, 33, 3, 3, '#f2d27a'); E(g, 22, 33, 3, 3, '#f28aa8'); E(g, 29, 33, 3, 3, '#a8e0a0');
    });
  }
  return pic(2, 2, 1, 1, () => {});
}
