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

export interface HeavenMeta { sancts: Record<'church' | 'temple' | 'mosque', number>; palace: number; base: { i: number; j: number }; pools: [number, number, number, number][]; cages: { i0: number; j0: number; i1: number; j1: number; kind: 'demon' | 'beast' | 'sinner' }[] }
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
  // 46차 성소의 언덕 (남서쪽): 구름 대성당 · 연화 불당 · 새벽빛 모스크 — 하루 한 번 예배(안으로 들어가 앉는다)
  rect(26, 88, 92, 90, 'walk'); rect(41, 77, 41, 87, 'park'); rect(54, 77, 55, 87, 'lot');
  const sancts = {} as Record<'church' | 'temple' | 'mosque', number>;
  sancts.church = buildings.length;
  buildings.push({ i0: 29, j0: 77, w: 11, d: 10, h: 150, cat: 'sanct', att: 'church', sign: 'left', color: '#ffffff', pois: [P('place_of_worship', '구름 대성당', 'มหาวิหารเมฆ', 'Cloud Cathedral', 'church')] });
  sancts.temple = buildings.length;
  buildings.push({ i0: 42, j0: 77, w: 11, d: 10, h: 120, cat: 'sanct', att: 'temple', sign: 'left', color: '#ffffff', pois: [P('place_of_worship', '연화 불당', 'วิหารดอกบัว', 'Lotus Hall', 'temple')] });
  sancts.mosque = buildings.length;
  buildings.push({ i0: 61, j0: 77, w: 11, d: 10, h: 130, cat: 'sanct', att: 'mosque', sign: 'left', color: '#ffffff', pois: [P('place_of_worship', '새벽빛 모스크', 'มัสยิดรุ่งอรุณ', 'Mosque of Dawn', 'mosque')] });
  // 소품
  const props: Prop[] = [];
  const prop = (i: number, j: number, kind: string, o = 0) => { if (tiles[j * W + i] !== TI.water && tiles[j * W + i] !== TI.void) props.push({ i, j, kind: kind as Prop['kind'], o }); };
  // 수영장 가의 썬베드와 파라솔
  for (const [a, b, c, d] of pools) {
    for (let i = a; i <= c; i += 2) { prop(i, b - 2, i % 4 ? 'sunbed' : 'parasol'); prop(i, d + 2, (i + 1) % 4 ? 'sunbed' : 'parasol'); }
  }
  // 동물원: 울타리 친 우리 여섯, 우리마다 동물
  const zoo = ZOO_PENS;
  for (const [a, b, an] of zoo) {
    for (let i = a; i <= a + 5; i++) { prop(i, b, 'fence', 0); prop(i, b + 6, 'fence', 0); }
    for (let j = b + 1; j <= b + 5; j++) { prop(a, j, 'fence', 1); prop(a + 5, j, 'fence', 1); }
    for (let n = 0; n < (an === 'flamingo' ? 4 : 2); n++) prop(a + 2 + (n % 2) * 2, b + 2 + Math.floor(n / 2) * 2, an);
  }
  // 43차: 동물원 남쪽 줄 — 지옥에서 데려온 악마 · 괴물, 그리고 죄 지은 인간들의 우리 (사람이 걸어 다니며 구경한다)
  rect(94, 109, 124, 110, 'walk'); for (const i of [102, 112]) rect(i, 110, i + 1, 113, 'walk');
  const cages: HeavenMeta['cages'] = [];
  for (const [a, b, kind] of [[94, 112, 'demon'], [104, 112, 'beast'], [114, 112, 'sinner']] as const) {
    rect(a + 1, b + 1, a + 6, b + 5, 'park');
    for (let i = a; i <= a + 7; i++) { prop(i, b, 'fence', 0); prop(i, b + 6, 'fence', 0); }
    for (let j = b + 1; j <= b + 5; j++) { prop(a, j, 'fence', 1); prop(a + 7, j, 'fence', 1); }
    cages.push({ i0: a + 1, j0: b + 1, i1: a + 6, j1: b + 5, kind });
  }
  // 광장 분수 · 놀이공원 풍선 수레 · 길가 나무
  prop(98, 70, 'fountain'); prop(122, 70, 'fountain'); prop(98, 38, 'fountain'); prop(122, 38, 'fountain');
  prop(100, 28, 'balloons'); prop(118, 28, 'balloons'); prop(110, 30, 'icecream');
  for (let i = 8; i < W - 8; i += 6) { if ((i > 88 && i < 130) || i > 180) continue; prop(i, 55, 'tree'); prop(i + 3, 62, 'tree'); }
  // 우주선 기지: 발사대 (계단 대신)
  const base = { i: 194, j: 58 };
  const door = { i: 17, j: 55 };
  // 성소 앞길의 나무 · 분수
  for (let i = 30; i <= 90; i += 5) { if (i >= 55 && i <= 60) continue; prop(i, 92, 'tree'); }
  prop(57, 84, 'fountain');
  meta = { sancts, palace, base, pools, cages };
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
  // 37차: 네모 칸이 보이지 않게 — 종류마다 한 장의 바닥(경로)으로 칠하고, 세상 좌표에 묶인 부드러운 얼룩(몇 칸에 걸친 원형 번짐)으로
  // 결을 낸다. 얼룩은 덩어리 경계 밖 몇 칸까지 그려 이웃 덩어리와 이어지게 한다
  const h2 = (i: number, j: number, s2 = 0) => { const v = Math.sin(i * 127.1 + j * 311.7 + s2 * 74.7) * 43758.5453; return v - Math.floor(v); };
  const paths: Record<string, Path2D> = { park: new Path2D(), walk: new Path2D(), lot: new Path2D(), water: new Path2D() };
  const grow = 0.012; // 칸 사이 머리카락 틈이 생기지 않게 살짝 키운다
  for (let j = j0; j < j1; j++) for (let i = i0; i < i1; i++) {
    const t = at(i, j);
    const pth = paths[t];
    if (!pth) continue;
    const a = S(i - grow, j - grow), b = S(i + 1 + grow, j - grow), cc = S(i + 1 + grow, j + 1 + grow), d = S(i - grow, j + 1 + grow);
    pth.moveTo(a[0], a[1]); pth.lineTo(b[0], b[1]); pth.lineTo(cc[0], cc[1]); pth.lineTo(d[0], d[1]); pth.closePath();
  }
  const SKIN: Record<string, { base: string; lite: string; dark: string; amt: number }> = {
    park: { base: '#dcebc8', lite: '#f2f8e6', dark: '#bcd6a2', amt: 0.55 },
    walk: { base: '#f5f2ea', lite: '#ffffff', dark: '#e2dccf', amt: 0.6 },
    lot: { base: '#f1e3c2', lite: '#faf1dc', dark: '#e0cc9e', amt: 0.55 },
    water: { base: '#7fd6ea', lite: '#b4ecf6', dark: '#62c2dc', amt: 0.5 },
  };
  const M = 4, STEP = 3;
  for (const t of ['park', 'walk', 'lot', 'water'] as const) {
    const sk = SKIN[t];
    g.save();
    g.clip(paths[t]);
    g.fillStyle = sk.base;
    g.fill(paths[t]);
    for (let j = Math.floor((j0 - M) / STEP) * STEP; j < j1 + M; j += STEP) for (let i = Math.floor((i0 - M) / STEP) * STEP; i < i1 + M; i += STEP) {
      const k = h2(i, j, t.length);
      const [x, y] = S(i + h2(i, j, 3) * STEP, j + h2(i, j, 4) * STEP);
      const rad = 46 + h2(i, j, 5) * 70;
      const gr = g.createRadialGradient(x, y, 0, x, y, rad);
      const col = k < 0.5 ? sk.lite : sk.dark;
      gr.addColorStop(0, col);
      gr.addColorStop(1, col + '00');
      g.globalAlpha = sk.amt * (0.35 + Math.abs(k - 0.5));
      g.fillStyle = gr;
      g.beginPath(); g.ellipse(x, y, rad, rad * 0.5, 0, 0, Math.PI * 2); g.fill();
    }
    g.globalAlpha = 1;
    // 잔 무늬 (칸 자리와 상관없이 흩뿌린다)
    for (let j = j0; j < j1; j++) for (let i = i0; i < i1; i++) {
      if (at(i, j) !== t) continue;
      if (t === 'park') {
        // 솜털 같은 풀 · 드문드문 작은 꽃
        for (let q = 0; q < 4; q++) { const [x, y] = S(i + r(), j + r()); g.fillStyle = r() < 0.5 ? '#f8fcf0' : '#b2cc96'; g.fillRect(Math.round(x), Math.round(y), 1, 2); }
        if (h2(i, j, 9) < 0.12) { const [x, y] = S(i + r(), j + r()); g.fillStyle = ['#ffffff', '#f6c8d8', '#f2e28a', '#d8c8f2'][Math.floor(h2(i, j, 10) * 4)]; g.fillRect(Math.round(x), Math.round(y), 2, 2); g.fillRect(Math.round(x) - 3, Math.round(y) + 1, 2, 2); }
      } else if (t === 'walk') {
        // 대리석 결: 가늘고 길게 휘는 잿빛 금
        if (h2(i, j, 11) < 0.22) {
          const [x, y] = S(i + r(), j + r());
          g.strokeStyle = 'rgba(150,140,130,0.28)'; g.lineWidth = 0.7;
          g.beginPath(); g.moveTo(x, y); g.bezierCurveTo(x + 14 * (r() - 0.3), y + 6 * r(), x + 30 * r(), y - 4 + 8 * r(), x + 44 * (r() - 0.1), y + 10 * (r() - 0.5)); g.stroke();
        }
      } else if (t === 'lot') {
        for (let q = 0; q < 3; q++) { const [x, y] = S(i + r(), j + r()); g.fillStyle = r() < 0.5 ? 'rgba(255,250,236,0.8)' : 'rgba(196,168,112,0.35)'; g.fillRect(Math.round(x), Math.round(y), 1, 1); }
      } else if (t === 'water') {
        for (let q = 0; q < 2; q++) { const [x, y] = S(i + r(), j + r()); g.fillStyle = 'rgba(255,255,255,0.7)'; g.fillRect(Math.round(x), Math.round(y), 5, 1); }
      }
    }
    g.restore();
  }
  // 경계: 흰 대리석 길 가장자리의 금줄 · 수영장 흰 타일 테두리 (네 면 모두)
  const edge = (i: number, j: number, side: 0 | 1 | 2 | 3, col: string, w: number) => {
    const pts = side === 0 ? [S(i, j), S(i + 1, j)] : side === 1 ? [S(i, j), S(i, j + 1)] : side === 2 ? [S(i, j + 1), S(i + 1, j + 1)] : [S(i + 1, j), S(i + 1, j + 1)];
    g.strokeStyle = col; g.lineWidth = w; g.beginPath(); g.moveTo(pts[0][0], pts[0][1]); g.lineTo(pts[1][0], pts[1][1]); g.stroke();
  };
  for (let j = j0; j < j1; j++) for (let i = i0; i < i1; i++) {
    const t = at(i, j);
    if (t !== 'walk' && t !== 'water') continue;
    const nb: [number, number, 0 | 1 | 2 | 3][] = [[i, j - 1, 0], [i - 1, j, 1], [i, j + 1, 2], [i + 1, j, 3]];
    for (const [a2, b2, sd] of nb) {
      const o = at(a2, b2);
      if (o === t || o === 'void') continue;
      if (t === 'walk') edge(i, j, sd, 'rgba(216,184,96,0.85)', 1);
      else edge(i, j, sd, '#ffffff', 2);
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
export function frame(b: Building, top: number) {
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
/**
 * 천국 본청 — 44차: 롯데타워처럼 하늘로 가늘어지는 초고층 (아직 들어가지 않는다 · 올려다볼 뿐).
 * 흰 대리석 저층부(금 띠 · 유리 로비) 위로 은빛 유리 탑이 곧게 솟으며 점점 가늘어지고, 면 가운데 세로 주름 · 모서리로 모이는 가는 세로줄 ·
 * 층마다 가는 띠 · 드문드문 켜진 금빛 창. 꼭대기 열에 하나는 갈라진 왕관 — 비어 있는 격자 사이로 하늘이 보이고, 맨 위에 빛나는 바늘 첨탑
 */
export function drawHeavenPalace(b: Building) {
  const TOP = 1320;
  const f = frame(b, TOP + 150);
  const { g, Q, box, poly } = f;
  const cx = b.i0 + b.w / 2, cy = b.j0 + b.d / 2;
  const R0 = b.w / 2;
  const r = rnd(4242);
  // 저층부: 흰 대리석 기단 두 단 + 금 띠 + 유리 로비
  box(cx - R0, cy - R0, cx + R0, cy + R0, 0, 46, '#fbf9f4', '#ebe5d9', '#dcd4c4');
  box(cx - R0 - 0.1, cy - R0 - 0.1, cx + R0 + 0.1, cy + R0 + 0.1, 46, 52, '#f2d27a', '#d9b44a', '#c09a36');
  const glassFace = (pts: [number, number][], top: string, bottom: string) => {
    const ys = pts.map((p) => p[1]), y0 = Math.min(...ys), y1 = Math.max(...ys);
    const gr = g.createLinearGradient(0, y0, 0, y1); gr.addColorStop(0, top); gr.addColorStop(1, bottom);
    g.fillStyle = gr; g.beginPath(); g.moveTo(pts[0][0], pts[0][1]); for (const p of pts.slice(1)) g.lineTo(p[0], p[1]); g.closePath(); g.fill();
  };
  glassFace([Q(cx - R0 + 1, cy + R0 + 0.01, 4), Q(cx + R0 - 1, cy + R0 + 0.01, 4), Q(cx + R0 - 1, cy + R0 + 0.01, 40), Q(cx - R0 + 1, cy + R0 + 0.01, 40)], '#fff6d8', '#f2e2b0');
  glassFace([Q(cx + R0 + 0.01, cy - R0 + 1, 4), Q(cx + R0 + 0.01, cy + R0 - 1, 4), Q(cx + R0 + 0.01, cy + R0 - 1, 40), Q(cx + R0 + 0.01, cy - R0 + 1, 40)], '#f6e8c0', '#e2cc94');
  box(cx - R0 + 1.2, cy - R0 + 1.2, cx + R0 - 1.2, cy + R0 - 1.2, 52, 96, '#fdfbf6', '#f4efe4', '#e4dccc'); // 둘째 단 (저층 상가)
  for (let z = 60; z < 94; z += 9) { const a = Q(cx - R0 + 1.2, cy + R0 - 1.19, z), c2 = Q(cx + R0 - 1.2, cy + R0 - 1.19, z); g.strokeStyle = 'rgba(210,190,140,0.7)'; g.lineWidth = 1; g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(c2[0], c2[1]); g.stroke(); }
  // 탑: 반지름이 아래 6.2칸 → 꼭대기 1.3칸으로 부드럽게 가늘어진다
  const Z0 = 96, ZC = TOP - 150; // 왕관이 시작하는 높이
  const RA = R0 - 4.6, RB = 0.9;
  const rr = (z: number) => RA - (RA - RB) * Math.pow(Math.max(0, z - Z0) / (TOP - Z0), 1.7); // 아래는 곧게, 위로 갈수록 빨리 가늘어진다
  const step = 6;
  for (let z = Z0; z < ZC; z += step) {
    const a = rr(z), c2 = rr(z + step), t = (z - Z0) / (TOP - Z0);
    const lt = Math.round(236 - t * 18), lb = Math.round(250 - t * 10);
    poly([Q(cx - a, cy + a, z), Q(cx + a, cy + a, z), Q(cx + c2, cy + c2, z + step), Q(cx - c2, cy + c2, z + step)], `rgb(${lt},${lt + 8},${lb})`);
    poly([Q(cx + a, cy - a, z), Q(cx + a, cy + a, z), Q(cx + c2, cy + c2, z + step), Q(cx + c2, cy - c2, z + step)], `rgb(${lt - 40},${lt - 26},${lb - 22})`);
    // 층마다 가는 띠 · 드문드문 켜진 금빛 창
    if (z % 12 === 0) {
      g.strokeStyle = 'rgba(255,255,255,0.45)'; g.lineWidth = 1;
      for (const [p0, p1] of [[Q(cx - a, cy + a, z), Q(cx + a, cy + a, z)], [Q(cx + a, cy - a, z), Q(cx + a, cy + a, z)]] as const) { g.beginPath(); g.moveTo(p0[0], p0[1]); g.lineTo(p1[0], p1[1]); g.stroke(); }
      const n = Math.max(4, Math.round(a * 5));
      for (let q = 0; q < n; q++) {
        if (r() > 0.12) continue;
        const t0 = q / n, t1 = (q + 0.7) / n, left = r() < 0.55;
        const pts = left ? [Q(cx - a + 2 * a * t0, cy + a, z + 2), Q(cx - a + 2 * a * t1, cy + a, z + 2), Q(cx - a + 2 * a * t1, cy + a, z + 9), Q(cx - a + 2 * a * t0, cy + a, z + 9)]
                         : [Q(cx + a, cy - a + 2 * a * t0, z + 2), Q(cx + a, cy - a + 2 * a * t1, z + 2), Q(cx + a, cy - a + 2 * a * t1, z + 9), Q(cx + a, cy - a + 2 * a * t0, z + 9)];
        poly(pts as [number, number][], left ? '#ffe9a8' : '#f2d48a', 0.8);
      }
    }
  }
  // 위로 모이는 세로줄 (면마다 다섯) · 앞면 가운데 밝은 주름
  const seam = (face: 0 | 1, u: number, col: string, wd: number, z1 = ZC) => {
    g.strokeStyle = col; g.lineWidth = wd; g.beginPath();
    for (let z = Z0; z <= z1; z += 12) { const a = rr(z); const p = face === 0 ? Q(cx - a + 2 * a * u, cy + a + 0.01, z) : Q(cx + a + 0.01, cy - a + 2 * a * u, z); if (z === Z0) g.moveTo(p[0], p[1]); else g.lineTo(p[0], p[1]); }
    g.stroke();
  };
  for (const u of [0.12, 0.3, 0.7, 0.88]) { seam(0, u, 'rgba(255,255,255,0.5)', 1); seam(1, u, 'rgba(240,246,252,0.35)', 1); }
  seam(0, 0.5, 'rgba(255,255,255,0.95)', 2); seam(1, 0.5, 'rgba(220,232,244,0.7)', 2);
  seam(0, 0.0, 'rgba(255,255,255,0.8)', 1.5); // 앞 모서리의 빛
  // 하늘이 비친 긴 빛줄기
  g.globalAlpha = 0.16; g.fillStyle = '#ffffff';
  { const z1 = Z0 + 120, z2 = ZC - 60; const a1 = rr(z1), a2 = rr(z2); const p = [Q(cx - a1 + 2 * a1 * 0.18, cy + a1, z1), Q(cx - a1 + 2 * a1 * 0.34, cy + a1, z1), Q(cx - a2 + 2 * a2 * 0.46, cy + a2, z2), Q(cx - a2 + 2 * a2 * 0.32, cy + a2, z2)];
    g.beginPath(); g.moveTo(p[0][0], p[0][1]); for (const q of p.slice(1)) g.lineTo(q[0], q[1]); g.closePath(); g.fill(); }
  g.globalAlpha = 1;
  // 금 띠 둘 (전망층)
  for (const zb of [Math.round(Z0 + (ZC - Z0) * 0.42), ZC - 6]) { // 옆 두 면만 (윗면을 칠하면 탑 한가운데 금빛 판이 생긴다)
    const a = rr(zb) + 0.05, c2 = rr(zb + 5) + 0.05;
    poly([Q(cx - a, cy + a, zb), Q(cx + a, cy + a, zb), Q(cx + c2, cy + c2, zb + 5), Q(cx - c2, cy + c2, zb + 5)], '#e8c45a');
    poly([Q(cx + a, cy - a, zb), Q(cx + a, cy + a, zb), Q(cx + c2, cy + c2, zb + 5), Q(cx + c2, cy - c2, zb + 5)], '#c9a23e');
  }
  // 왕관: 갈라진 격자 — 가는 기둥과 엇갈린 사선 사이로 하늘이 비친다
  const lat = (face: 0 | 1, col: string) => {
    g.strokeStyle = col; g.lineWidth = 1.5;
    for (let k = 0; k <= 8; k++) {
      const u = k / 8;
      g.beginPath();
      for (let z = ZC; z <= TOP; z += 6) { const a = rr(z) * (1 - 0.35 * ((z - ZC) / (TOP - ZC))); const p = face === 0 ? Q(cx - a + 2 * a * u, cy + a, z) : Q(cx + a, cy - a + 2 * a * u, z); if (z === ZC) g.moveTo(p[0], p[1]); else g.lineTo(p[0], p[1]); }
      g.stroke();
    }
    for (let k = 0; k < 6; k++) { // 사선
      const zA = ZC + (k / 6) * (TOP - ZC), zB = ZC + ((k + 1) / 6) * (TOP - ZC);
      for (const [u0, u1] of [[0, 1], [1, 0]] as const) {
        const aA = rr(zA) * (1 - 0.35 * ((zA - ZC) / (TOP - ZC))), aB = rr(zB) * (1 - 0.35 * ((zB - ZC) / (TOP - ZC)));
        const pA = face === 0 ? Q(cx - aA + 2 * aA * u0, cy + aA, zA) : Q(cx + aA, cy - aA + 2 * aA * u0, zA);
        const pB = face === 0 ? Q(cx - aB + 2 * aB * u1, cy + aB, zB) : Q(cx + aB, cy - aB + 2 * aB * u1, zB);
        g.beginPath(); g.moveTo(pA[0], pA[1]); g.lineTo(pB[0], pB[1]); g.stroke();
      }
    }
  };
  // 왕관 안쪽 (뒤 두 면이 비쳐 보이는 옅은 유리)
  { const a0 = rr(ZC), a1 = rr(TOP) * 0.65;
    poly([Q(cx - a0, cy - a0, ZC), Q(cx + a0, cy - a0, ZC), Q(cx + a1, cy - a1, TOP), Q(cx - a1, cy - a1, TOP)], '#eef4fa', 0.5);
    poly([Q(cx - a0, cy - a0, ZC), Q(cx - a0, cy + a0, ZC), Q(cx - a1, cy + a1, TOP), Q(cx - a1, cy - a1, TOP)], '#e2ecf4', 0.5); }
  lat(1, 'rgba(206,220,234,0.95)'); lat(0, 'rgba(250,252,255,0.95)');
  // 꼭대기 바늘 첨탑과 빛
  const apex = Q(cx, cy, TOP + 4);
  g.fillStyle = '#fff4c0'; g.fillRect(Math.round(apex[0]) - 1.5, Math.round(apex[1]) - 110, 3, 110);
  const glow = g.createRadialGradient(apex[0], apex[1] - 114, 1, apex[0], apex[1] - 114, 34);
  glow.addColorStop(0, 'rgba(255,250,220,1)'); glow.addColorStop(1, 'rgba(255,240,180,0)');
  g.fillStyle = glow; g.beginPath(); g.arc(apex[0], apex[1] - 114, 34, 0, Math.PI * 2); g.fill();
  return { canvas: f.c, x: f.x, y: f.y };
}
/** 놀이공원 탈것: 대관람차 · 회전목마 · 롤러코스터 */
/** 46차: 동물원 우리 (울타리 i a..a+5 · j b..b+6) — 동물은 우리 안을 천천히 걸어 다닌다 */
export const ZOO_PENS: [number, number, string][] = [[96, 92, 'giraffe'], [104, 92, 'elephant'], [114, 92, 'lion'], [96, 102, 'zebra'], [104, 102, 'flamingo'], [114, 102, 'panda']];
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
