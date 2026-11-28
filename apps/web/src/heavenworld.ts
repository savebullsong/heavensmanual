// 35차 천국 1층: 현실 지도를 덮어 쓰던 천국을 버리고, 구름 위에 따로 지은 넓은 세계.
// 서쪽 끝 우주새(도착) → 상점가(현실의 모든 가게 · 돈을 마음껏 꺼내는 은행) → 한가운데 거대한 천국 본청 →
// 북쪽 놀이공원 · 남쪽 동물원 · 동쪽 휴양지(수영장 · 썬베드 · 호텔 · 오락실) → 동쪽 끝 우주선 기지(환생)까지 걸어서 간다.
import { TYPES, finalize, type Zone, type Building, type Prop } from './zone.ts';
import { TW, TH, iso } from './gfx.ts';
import type { PropPic } from './propgfx.ts';
import { lang } from './i18n.ts';

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
  P('furniture', '구름 가구점', 'ร้านเฟอร์นิเจอร์เมฆ', 'Cloud Furniture'), // 47차: 구름 위 내 오두막에 놓을 가구 (거리 칸이 열여섯이라 스시집 자리에)
  P('cafe', '무지개 디저트', 'ขนมรุ้ง', 'Rainbow Desserts', 'dessert'),
  P('antiques', '영원 골동품', 'ของเก่านิรันดร์', 'Eternity Antiques'),
];
/** 가게마다 값이 다르다 — 이름으로 정해지는 배수 (어떤 곳은 터무니없이 비싸다) */
export function heavenPriceMul(name: string): number {
  if (/보석|Jewel|เพชร|골동|Antique|ของเก่า/.test(name)) return 1000;
  let h = 0; for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return [1, 2, 3, 5, 10, 50, 200][h % 7];
}

export interface HeavenMeta { sancts: Record<'church' | 'temple' | 'mosque', number>; palace: number; base: { i: number; j: number }; pools: [number, number, number, number][]; cages: { i0: number; j0: number; i1: number; j1: number; kind: 'demon' | 'beast' | 'sinner' }[]; dump: { i0: number; j0: number; i1: number; j1: number }; chicken: { i: number; j: number } }
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
  // 50차: 나무 울타리 → 끝이 뾰족한 높은 쇠창살 (감옥처럼) · 동물원 둘레도 창살로 막고 북쪽 큰길에 정문 하나
  for (let i = 93; i <= 126; i++) { if (i !== 110 && i !== 111) prop(i, 89, 'zoobar', 0); prop(i, 120, 'zoobar', 0); }
  for (let j = 90; j <= 119; j++) { prop(93, j, 'zoobar', 1); prop(126, j, 'zoobar', 1); }
  props.push({ i: 110, j: 89, kind: 'zoogate' as Prop['kind'], o: 0 });
  for (const [a, b, an] of zoo) {
    for (let i = a; i <= a + 5; i++) { prop(i, b, 'zoobar', 0); prop(i, b + 6, 'zoobar', 0); }
    for (let j = b + 1; j <= b + 5; j++) { prop(a, j, 'zoobar', 1); prop(a + 5, j, 'zoobar', 1); }
    for (let n = 0; n < (an === 'flamingo' ? 4 : 2); n++) prop(a + 2 + (n % 2) * 2, b + 2 + Math.floor(n / 2) * 2, an);
  }
  // 43차: 동물원 남쪽 줄 — 지옥에서 데려온 악마 · 괴물, 그리고 죄 지은 인간들의 우리 (사람이 걸어 다니며 구경한다)
  rect(94, 109, 124, 110, 'walk'); for (const i of [102, 112]) rect(i, 110, i + 1, 113, 'walk');
  const cages: HeavenMeta['cages'] = [];
  for (const [a, b, kind] of [[94, 112, 'demon'], [104, 112, 'beast'], [114, 112, 'sinner']] as const) {
    rect(a + 1, b + 1, a + 6, b + 5, 'park');
    for (let i = a; i <= a + 7; i++) { prop(i, b, 'zoobar', 0); prop(i, b + 6, 'zoobar', 0); }
    for (let j = b + 1; j <= b + 5; j++) { prop(a, j, 'zoobar', 1); prop(a + 7, j, 'zoobar', 1); }
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
  // 47차 과소비의 쓰레기장 (남동쪽): 뜯지도 않은 선물 상자 · 쇼핑백 · 멀쩡한 TV · 매트리스 · 금 의자 · 샴페인 병 더미. 관리 천사가 한숨을 쉰다
  const dump = { i0: 173, j0: 80, i1: 190, j1: 97 };
  rect(dump.i0, dump.j0, dump.i1, dump.j1, 'lot'); rect(172, 58, 172, 80, 'walk');
  // 50차: 명품 가방 더미 · 귀금속 더미 · 멀쩡한 TV · 냉장고 · 세탁기가 섞인다
  for (let j = dump.j0 + 1; j < dump.j1; j += 2) for (let i = dump.i0 + 1; i < dump.i1; i += 2) if ((i * 7 + j * 3) % 7 !== 0) {
    const hh = ((i * 928371 + j * 1237) >>> 0) % 20;
    prop(i + (j % 4 === 1 ? 1 : 0), j, hh < 4 ? 'bagpile' : hh < 7 ? 'jewelpile' : hh < 11 ? 'appliance' : 'junkpile'); // 빽빽하게 — 산처럼 쌓였다
  }
  // 47차 닭 한 마리 (광장 서쪽에서 돌아다닌다)
  const chicken = { i: 88, j: 64 };
  meta = { sancts, palace, base, pools, cages, dump, chicken };
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
  // 50차 섬 가장자리 (뒤쪽 두 면): 칸 모서리가 계단처럼 각져 보이던 것 — 테두리를 따라 뭉게구름을 얹어 둥글게 감싼다
  for (let j = j0 - 1; j < j1 + 1; j++) for (let i = i0 - 1; i < i1 + 1; i++) {
    if (at(i, j) === 'void') continue;
    const sides: [number, number, [number, number], [number, number]][] = [];
    if (at(i - 1, j) === 'void') sides.push([-1, 0, [i, j], [i, j + 1]]);
    if (at(i, j - 1) === 'void') sides.push([0, -1, [i, j], [i + 1, j]]);
    if (at(i - 1, j - 1) === 'void' && at(i - 1, j) !== 'void' && at(i, j - 1) !== 'void') sides.push([-1, -1, [i, j], [i, j]]); // 안쪽으로 꺾인 모서리
    for (const [di, dj, p0, p1] of sides) {
      for (const t2 of p0[0] === p1[0] && p0[1] === p1[1] ? [0] : [0.2, 0.7]) {
        const fi = p0[0] + (p1[0] - p0[0]) * (t2 + r() * 0.1) + di * 0.12, fj = p0[1] + (p1[1] - p0[1]) * (t2 + r() * 0.1) + dj * 0.12;
        const [x, y] = S(fi, fj);
        const rx = 13 + r() * 9, ry = 6 + r() * 4;
        g.fillStyle = 'rgba(214,222,238,0.9)'; g.beginPath(); g.ellipse(x, y + 2, rx, ry, 0, 0, Math.PI * 2); g.fill();
        g.fillStyle = 'rgba(255,255,255,0.97)'; g.beginPath(); g.ellipse(x - 2, y - 1, rx * 0.85, ry * 0.8, 0, 0, Math.PI * 2); g.fill();
        g.fillStyle = 'rgba(255,255,255,0.6)'; g.beginPath(); g.ellipse(x + rx * 0.5, y - 3, rx * 0.45, ry * 0.55, 0, 0, Math.PI * 2); g.fill();
      }
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
export const HEAVEN_PROPS = new Set(['sunbed', 'parasol', 'giraffe', 'elephant', 'lion', 'zebra', 'flamingo', 'panda', 'fountain', 'balloons', 'icecream', 'junkpile', 'chicken', 'zoobar', 'zoogate', 'bagpile', 'jewelpile', 'appliance']);
function pic(w: number, h: number, ax: number, ay: number, draw: (R: (x: number, y: number, w: number, h: number, c: string) => void, g: CanvasRenderingContext2D) => void): PropPic {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const g = c.getContext('2d')!;
  const R = (x: number, y: number, ww: number, hh: number, col: string) => { g.fillStyle = col; g.fillRect(Math.round(x), Math.round(y), Math.round(ww), Math.round(hh)); };
  draw(R, g);
  return { canvas: c, ax: ax / w, ay: ay / h };
}
/** 50차 동물 그림 도우미: 채운 다각형 + 윤곽선 · 다리 (위가 굵고 아래가 가는 기둥 + 발굽) · 무늬 얼룩 */
function shape(g: CanvasRenderingContext2D, pts: [number, number][], fill: string, line: string) {
  g.beginPath(); pts.forEach(([x, y], n) => (n ? g.lineTo(x, y) : g.moveTo(x, y))); g.closePath();
  g.fillStyle = fill; g.fill(); g.strokeStyle = line; g.lineWidth = 1.5; g.lineJoin = 'round'; g.stroke();
}
function leg(g: CanvasRenderingContext2D, x0: number, y0: number, x1: number, y1: number, w: number, fill: string, line: string) {
  shape(g, [[x0 - w / 2, y0], [x0 + w / 2, y0], [x1 + w * 0.35, y1 - 3], [x1 - w * 0.35, y1 - 3]], fill, line);
  g.fillStyle = line; g.fillRect(Math.round(x1 - w * 0.45), y1 - 4, Math.round(w * 0.9) + 1, 4);
}
function patch(g: CanvasRenderingContext2D, x: number, y: number, r: number, col: string) {
  g.fillStyle = col; g.beginPath();
  for (let k = 0; k < 7; k++) { const a = (k / 7) * Math.PI * 2, rr = r * (0.75 + ((Math.sin(x * 3.1 + y * 1.7 + k * 2.3) + 1) / 2) * 0.45); g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr * 0.85); }
  g.closePath(); g.fill();
}
export function heavenProp(kind: string, v: number, o = 0): PropPic {
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
    // 50차 동물을 크게 · 윤곽선 · 그늘 (오른쪽을 본다 — 걸을 때 뒤집힌다)
    case 'giraffe': return pic(76, 156, 34, 150, (_R, g) => {
      E(g, 34, 150, 20, 5, 'rgba(0,0,0,0.16)');
      const Y = '#ecbc5c', S = '#9a5a22', O = '#5a3412', D = '#c8964a';
      leg(g, 20, 98, 18, 148, 4, D, O); leg(g, 27, 100, 28, 148, 4, Y, O); leg(g, 42, 98, 44, 148, 4, D, O); leg(g, 49, 96, 50, 148, 4, Y, O);
      shape(g, [[12, 92], [16, 80], [34, 76], [50, 80], [56, 92], [50, 104], [30, 106], [16, 102]], Y, O);
      shape(g, [[44, 84], [50, 76], [58, 30], [64, 22], [70, 26], [66, 36], [58, 84], [52, 92]], Y, O);
      g.strokeStyle = '#8a4a1a'; g.lineWidth = 3; g.beginPath(); g.moveTo(52, 80); g.lineTo(59, 30); g.stroke(); // 갈기
      shape(g, [[58, 22], [64, 14], [74, 16], [76, 22], [72, 26], [62, 28]], Y, O);
      g.fillStyle = O; g.fillRect(62, 8, 2, 7); g.fillRect(66, 8, 2, 7); E(g, 63, 8, 2, 1.6, '#3a200c'); E(g, 67, 8, 2, 1.6, '#3a200c');
      E(g, 60, 18, 3, 1.6, D); E(g, 69, 19, 1.4, 1.4, '#1a0e06'); E(g, 75, 22, 1.2, 1, '#3a200c');
      for (const [x, y, r] of [[22, 86, 4], [32, 82, 4.5], [42, 86, 4], [28, 94, 4], [40, 96, 3.6], [18, 96, 3], [50, 90, 3], [54, 70, 3], [55, 56, 2.8], [57, 42, 2.4], [53, 80, 2.6]] as [number, number, number][]) patch(g, x, y, r, S);
      g.strokeStyle = O; g.lineWidth = 1.5; g.beginPath(); g.moveTo(13, 92); g.quadraticCurveTo(6, 104, 8, 114); g.stroke(); E(g, 8, 116, 2, 3, '#3a200c');
    });
    case 'elephant': return pic(124, 100, 60, 94, (_R, g) => {
      E(g, 60, 94, 40, 7, 'rgba(0,0,0,0.16)');
      const C = '#a2a2ae', D = '#7e7e8c', L2 = '#c0c0cc', O = '#3e3e48';
      for (const [x, c] of [[26, D], [38, C], [62, D], [74, C]] as [number, string][]) { shape(g, [[x - 7, 62], [x + 7, 62], [x + 7, 90], [x - 8, 90]], c, O); g.fillStyle = '#e8e6e0'; for (let k = 0; k < 3; k++) g.fillRect(x - 6 + k * 4, 88, 3, 2); }
      shape(g, [[10, 48], [18, 26], [44, 18], [72, 22], [86, 34], [86, 58], [74, 70], [34, 72], [14, 64]], C, O);
      E(g, 46, 30, 22, 7, L2);
      shape(g, [[80, 22], [96, 16], [108, 26], [108, 44], [100, 52], [86, 50]], C, O); // 머리
      shape(g, [[100, 44], [108, 42], [112, 58], [116, 76], [112, 86], [106, 84], [108, 72], [102, 56]], C, O); // 코
      for (let k = 0; k < 6; k++) { g.strokeStyle = D; g.lineWidth = 1; g.beginPath(); g.moveTo(103 + k * 0.8, 52 + k * 5); g.lineTo(110 + k * 0.6, 51 + k * 5); g.stroke(); }
      shape(g, [[78, 24], [92, 26], [94, 52], [84, 62], [72, 54], [70, 34]], D, O); // 귀
      shape(g, [[98, 48], [104, 52], [102, 62], [96, 58]], '#f4f0e4', '#a8a090'); // 상아
      E(g, 100, 30, 1.8, 1.8, '#1a1a20'); E(g, 99.4, 29.4, 0.6, 0.6, '#ffffff');
      g.strokeStyle = O; g.lineWidth = 2; g.beginPath(); g.moveTo(11, 46); g.quadraticCurveTo(4, 56, 6, 66); g.stroke();
    });
    case 'lion': return pic(98, 78, 46, 72, (_R, g) => {
      E(g, 46, 72, 30, 5, 'rgba(0,0,0,0.16)');
      const C = '#dcaa58', D = '#b8863c', M = '#8a4a18', O = '#4a2a0e';
      leg(g, 22, 44, 20, 70, 5, D, O); leg(g, 30, 46, 32, 70, 5, C, O); leg(g, 58, 46, 58, 70, 5, D, O); leg(g, 66, 44, 68, 70, 5, C, O);
      shape(g, [[12, 36], [20, 28], [50, 26], [70, 30], [74, 44], [66, 52], [24, 52], [12, 46]], C, O);
      g.strokeStyle = O; g.lineWidth = 2.2; g.beginPath(); g.moveTo(13, 38); g.quadraticCurveTo(0, 30, 4, 18); g.stroke(); E(g, 4, 16, 3.5, 4.5, M);
      // 갈기: 들쭉날쭉한 둥근 털 덩어리
      g.fillStyle = M; g.beginPath(); for (let k = 0; k <= 18; k++) { const a = (k / 18) * Math.PI * 2, r = k % 2 ? 17 : 21; g.lineTo(74 + Math.cos(a) * r, 24 + Math.sin(a) * r * 0.95); } g.closePath(); g.fill(); g.strokeStyle = O; g.lineWidth = 1.4; g.stroke();
      E(g, 72, 22, 14, 13, '#a8601e');
      shape(g, [[70, 12], [84, 14], [90, 24], [86, 34], [76, 36], [68, 28]], C, O); // 얼굴
      E(g, 86, 27, 4, 3, '#f2d8a8'); E(g, 88, 24, 2, 1.4, '#3a1a0a'); E(g, 80, 20, 1.6, 1.6, '#1a0e06'); E(g, 79.5, 19.5, 0.5, 0.5, '#fff');
      E(g, 72, 12, 3, 3, C);
    });
    case 'zebra': return pic(92, 86, 42, 80, (_R, g) => {
      E(g, 42, 80, 26, 5, 'rgba(0,0,0,0.16)');
      const W0 = '#fbfaf4', K = '#1c1c22', O = '#2a2a30';
      leg(g, 20, 48, 18, 78, 4, W0, O); leg(g, 27, 50, 28, 78, 4, W0, O); leg(g, 52, 50, 52, 78, 4, W0, O); leg(g, 59, 48, 61, 78, 4, W0, O);
      const body: [number, number][] = [[12, 40], [18, 30], [46, 28], [62, 30], [74, 14], [80, 8], [88, 14], [86, 22], [76, 26], [70, 44], [62, 54], [22, 54], [12, 48]];
      shape(g, body, W0, O);
      g.save(); g.beginPath(); body.forEach(([x, y], n) => (n ? g.lineTo(x, y) : g.moveTo(x, y))); g.closePath(); g.clip();
      g.strokeStyle = K; g.lineWidth = 2.6;
      for (let x = 14; x < 64; x += 6) { g.beginPath(); g.moveTo(x, 26); g.quadraticCurveTo(x + 3, 40, x - 1, 56); g.stroke(); }
      for (let k = 0; k < 5; k++) { g.beginPath(); g.moveTo(62 + k * 3, 18 + k); g.lineTo(70 + k * 2.4, 34 + k); g.stroke(); }
      g.restore();
      for (const x of [18, 28, 52, 61]) { g.fillStyle = K; for (let y = 58; y < 74; y += 5) g.fillRect(x - 2, y, 4, 2); }
      g.strokeStyle = K; g.lineWidth = 3; g.beginPath(); g.moveTo(64, 26); g.lineTo(78, 8); g.stroke(); // 갈기
      E(g, 86, 18, 3, 3, '#3a3a40'); E(g, 80, 13, 1.4, 1.4, '#0a0a0e');
      g.strokeStyle = O; g.lineWidth = 1.6; g.beginPath(); g.moveTo(13, 42); g.quadraticCurveTo(6, 50, 8, 62); g.stroke(); E(g, 8, 63, 2, 3, K);
    });
    case 'flamingo': return pic(46, 100, 22, 96, (_R, g) => {
      E(g, 22, 96, 10, 3, 'rgba(0,0,0,0.14)');
      const P1 = '#f6a0b2', P2 = '#e8788e', O = '#a8485a';
      g.strokeStyle = '#d8687e'; g.lineWidth = 2; g.beginPath(); g.moveTo(20, 58); g.lineTo(21, 96); g.stroke(); // 선 다리
      g.beginPath(); g.moveTo(25, 58); g.lineTo(30, 70); g.lineTo(21, 74); g.stroke(); // 접은 다리
      shape(g, [[6, 50], [14, 42], [30, 42], [38, 48], [32, 58], [14, 60]], P1, O);
      shape(g, [[10, 50], [18, 46], [30, 48], [24, 56], [12, 56]], P2, O);
      g.strokeStyle = P1; g.lineWidth = 4.5; g.lineCap = 'round'; g.beginPath(); g.moveTo(32, 46); g.bezierCurveTo(42, 32, 22, 26, 28, 12); g.stroke();
      g.strokeStyle = O; g.lineWidth = 1; g.stroke();
      E(g, 30, 10, 5, 4, P1); shape(g, [[33, 9], [41, 12], [40, 18], [36, 15]], '#f4ece0', O); shape(g, [[38, 13], [41, 12], [40, 18]], '#1a1a1e', '#1a1a1e');
      E(g, 30, 9, 1.2, 1.2, '#1a1a1e');
    });
    case 'panda': return pic(82, 72, 40, 66, (_R, g) => {
      E(g, 40, 66, 24, 5, 'rgba(0,0,0,0.16)');
      const W0 = '#fbfaf4', K = '#1e1e24', O = '#2a2a30';
      E(g, 26, 58, 11, 8, K); E(g, 50, 60, 10, 7, K); // 앉은 다리
      shape(g, [[16, 40], [22, 26], [40, 20], [56, 26], [60, 44], [52, 60], [26, 60]], W0, O);
      E(g, 38, 34, 20, 6, K); // 어깨 띠
      E(g, 56, 40, 6, 10, K); g.strokeStyle = '#3a7a3a'; g.lineWidth = 3; g.beginPath(); g.moveTo(62, 58); g.lineTo(70, 18); g.stroke(); // 대나무
      for (const y of [26, 38, 50]) { g.fillStyle = '#2a5a2a'; g.fillRect(64 + (58 - y) * 0.2 - 2, y, 6, 2); }
      g.fillStyle = '#5aa04a'; g.beginPath(); g.ellipse(74, 22, 7, 2.5, -0.6, 0, Math.PI * 2); g.fill();
      E(g, 52, 14, 14, 12, W0); g.strokeStyle = O; g.lineWidth = 1.5; g.beginPath(); g.ellipse(52, 14, 14, 12, 0, 0, Math.PI * 2); g.stroke();
      E(g, 42, 4, 5, 4.5, K); E(g, 61, 4, 5, 4.5, K);
      g.fillStyle = K; g.beginPath(); g.ellipse(47, 14, 3.6, 4.6, 0.5, 0, Math.PI * 2); g.fill(); g.beginPath(); g.ellipse(58, 14, 3.6, 4.6, -0.5, 0, Math.PI * 2); g.fill();
      E(g, 47.5, 13.5, 1, 1, '#fff'); E(g, 57.5, 13.5, 1, 1, '#fff'); E(g, 53, 20, 2.4, 1.6, K);
    });
    // 50차 동물원 창살: 한 칸마다 쇠기둥 넷 · 위아래 가로대 · 끝은 금빛 창날 (o 0 = i 방향 · 1 = j 방향)
    case 'zoobar': return pic(44, 100, 22, 92, (_R, g) => {
      const dx = o ? -16 : 16, dy = 8;
      const at = (t: number, z: number): [number, number] => [22 + dx * (t * 2 - 1), 92 + dy * (t * 2 - 1) - z];
      const rail = (z: number, w: number, c: string) => { const [x0, y0] = at(0, z), [x1, y1] = at(1, z); g.strokeStyle = c; g.lineWidth = w; g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke(); };
      g.fillStyle = 'rgba(40,40,60,0.15)'; { const [x0, y0] = at(0, -1), [x1, y1] = at(1, -1); g.beginPath(); g.moveTo(x0, y0 + 2); g.lineTo(x1, y1 + 2); g.lineTo(x1 + 3, y1 + 5); g.lineTo(x0 + 3, y0 + 5); g.fill(); }
      rail(2, 3, '#2a2a32');
      for (const t of [0.125, 0.375, 0.625, 0.875]) {
        const [x, y] = at(t, 0);
        g.fillStyle = '#26262e'; g.fillRect(Math.round(x) - 1, y - 72, 3, 72);
        g.fillStyle = '#6a6a7a'; g.fillRect(Math.round(x) - 1, y - 72, 1, 72);
        g.fillStyle = '#c9a23e'; g.fillRect(Math.round(x) - 2, y - 74, 5, 2); // 고리
        g.beginPath(); g.moveTo(x + 0.5, y - 86); g.lineTo(x + 3.5, y - 76); g.lineTo(x + 0.5, y - 73); g.lineTo(x - 2.5, y - 76); g.closePath(); g.fillStyle = '#e8c24e'; g.fill();
        g.fillStyle = '#fff2b8'; g.fillRect(Math.round(x), y - 83, 1, 6);
      }
      rail(30, 2.5, '#2e2e36'); rail(64, 3, '#2a2a32'); rail(64.8, 1, '#7a7a88');
    });
    case 'zoogate': return pic(150, 210, 59, 186, (_R, g) => {
      // 50차 동물원 정문: 흰 돌기둥 둘 · 위로 굽은 쇠 아치(창날 장식) · 금빛 간판 · 기둥 위 등불. 문짝은 활짝 열려 안쪽 창살에 붙어 있다
      const C = [75, 194] as const, U: [number, number] = [32, 16];
      const pt = (ti: number, z: number): [number, number] => [C[0] + U[0] * ti, C[1] + U[1] * ti - z];
      const pillar = (ti: number) => {
        const [x, y] = pt(ti, 0);
        g.fillStyle = 'rgba(40,40,60,0.18)'; g.beginPath(); g.ellipse(x + 2, y + 2, 13, 5, 0, 0, Math.PI * 2); g.fill();
        g.fillStyle = '#e8e2d6'; g.fillRect(x - 9, y - 118, 9, 118); g.fillStyle = '#fbf8f0'; g.fillRect(x - 9, y - 118, 4, 118);
        g.fillStyle = '#cfc8b8'; g.fillRect(x, y - 118, 8, 118);
        g.fillStyle = '#c9a23e'; g.fillRect(x - 11, y - 124, 21, 6); g.fillRect(x - 10, y - 8, 19, 4);
        g.fillStyle = '#2a2a32'; g.fillRect(x - 3, y - 140, 6, 16); g.fillStyle = '#fff2b8'; g.fillRect(x - 2, y - 138, 4, 10); // 등불
        g.fillStyle = 'rgba(255,240,180,0.35)'; g.beginPath(); g.arc(x, y - 133, 10, 0, Math.PI * 2); g.fill();
      };
      pillar(-1.5);
      // 아치
      const L = pt(-1.5, 112), Rr = pt(1.5, 112);
      const mx = (L[0] + Rr[0]) / 2, my = (L[1] + Rr[1]) / 2 - 34;
      g.strokeStyle = '#26262e'; g.lineWidth = 5; g.beginPath(); g.moveTo(L[0], L[1]); g.quadraticCurveTo(mx, my - 16, Rr[0], Rr[1]); g.stroke();
      g.strokeStyle = '#6a6a7a'; g.lineWidth = 1; g.stroke();
      for (let k = 1; k < 12; k++) { const t = k / 12, x = (1 - t) * (1 - t) * L[0] + 2 * (1 - t) * t * mx + t * t * Rr[0], y = (1 - t) * (1 - t) * L[1] + 2 * (1 - t) * t * (my - 16) + t * t * Rr[1]; g.fillStyle = '#26262e'; g.fillRect(x - 1, y - 9, 2, 9); g.beginPath(); g.moveTo(x, y - 15); g.lineTo(x + 2.5, y - 9); g.lineTo(x - 2.5, y - 9); g.closePath(); g.fillStyle = '#e8c24e'; g.fill(); }
      // 간판
      const sw = 74, sh = 20, sx = mx - sw / 2, sy = my + 4;
      g.fillStyle = '#7a5a2a'; g.fillRect(sx - 2, sy - 2, sw + 4, sh + 4); g.fillStyle = '#c9a23e'; g.fillRect(sx, sy, sw, sh); g.fillStyle = '#f2d27a'; g.fillRect(sx + 2, sy + 2, sw - 4, 3);
      g.strokeStyle = '#26262e'; g.lineWidth = 1; g.beginPath(); g.moveTo(sx + 8, sy); g.lineTo(sx + 12, sy - 10); g.moveTo(sx + sw - 8, sy); g.lineTo(sx + sw - 12, sy - 10); g.stroke();
      g.fillStyle = '#3a240c'; g.font = 'bold 11px system-ui, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillText(({ ko: '천국 동물원', th: 'สวนสัตว์สวรรค์', en: 'HEAVEN ZOO' } as Record<string, string>)[lang()] ?? 'HEAVEN ZOO', mx, sy + sh / 2 + 1);
      pillar(1.5);
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
    case 'junkpile': return pic(76, 58, 38, 50, (R, g) => {
      // 47차 과소비의 더미: 리본 달린 선물 상자 · 브랜드 쇼핑백 · 멀쩡한 TV · 금 의자 · 샴페인 병 · 하이힐 · 꽃다발 (여섯 가지가 섞인다)
      E(g, 38, 50, 34, 8, 'rgba(0,0,0,0.12)');
      const r = (k: number) => { const x = Math.sin((v + 1) * 91.7 + k * 12.9) * 43758.5453; return x - Math.floor(x); };
      E(g, 38, 43, 34, 12, '#d8d2c6'); E(g, 37, 38, 27, 12, '#e6e0d6'); E(g, 36, 31, 17, 10, '#efeae2'); // 봉긋 쌓인 더미 (포장재 · 비닐)
      for (let k = 0; k < 14; k++) R(6 + r(k + 60) * 62, 28 + r(k + 75) * 20, 4, 2, ['#ffffff', '#d8e4f0', '#f2e6d0'][k % 3]); // 구겨진 포장지
      const box = (x: number, y: number, w: number, h: number, c: string, rb: string) => { R(x, y, w, h, c); R(x, y, w, 2, 'rgba(255,255,255,0.45)'); R(x + w - 2, y, 2, h, 'rgba(0,0,0,0.12)'); R(x + w / 2 - 1, y, 2, h, rb); R(x, y + h / 2 - 1, w, 2, rb); R(x + w / 2 - 4, y - 3, 3, 3, rb); R(x + w / 2 + 1, y - 3, 3, 3, rb); };
      const cols = ['#f28aa8', '#8ac8f2', '#f2d27a', '#c8a8f2', '#a8e0a0', '#ffffff', '#e85a6a'];
      for (let k = 0; k < 8; k++) box(6 + r(k) * 52, 14 + r(k + 9) * 26, 9 + r(k + 3) * 9, 7 + r(k + 5) * 7, cols[Math.floor(r(k + 7) * cols.length)], k % 2 ? '#c9a23e' : '#ffffff');
      if (v % 3 === 0) { R(46, 20, 20, 14, '#1e1e24'); R(48, 22, 16, 10, '#3a4a6a'); R(49, 23, 6, 3, '#8aa8d8'); R(54, 34, 4, 3, '#2a2a30'); } // 멀쩡한 TV
      if (v % 3 === 1) { R(12, 14, 3, 20, '#c9a23e'); R(12, 26, 14, 3, '#e0b84e'); R(24, 26, 3, 12, '#c9a23e'); R(12, 14, 12, 3, '#e0b84e'); R(14, 17, 9, 8, '#e85a6a'); } // 금 의자
      if (v % 3 === 2) { R(40, 12, 22, 8, '#fbfaf6'); R(40, 12, 22, 2, '#e8e4dc'); for (let x = 42; x < 62; x += 4) R(x, 14, 1, 5, '#d8d4cc'); } // 매트리스
      for (let k = 0; k < 3; k++) { const x = 18 + r(k + 20) * 40, y = 34 + r(k + 23) * 8; R(x, y, 3, 8, '#2a5a3a'); R(x, y - 3, 2, 3, '#e0b84e'); } // 샴페인 병
      R(26 + r(30) * 20, 40, 8, 10, '#1e1e1e'); R(26 + r(30) * 20, 40, 8, 2, '#c9a23e'); R(27 + r(30) * 20, 37, 6, 3, '#1e1e1e'); // 쇼핑백
      R(50 + r(31) * 10, 44, 6, 3, '#e85a6a'); R(55 + r(31) * 10, 41, 1, 4, '#e85a6a'); // 하이힐
      for (let k = 0; k < 4; k++) E(g, 10 + r(k + 40) * 56, 46 + r(k + 44) * 6, 2.5, 2, ['#f28aa8', '#f2d27a', '#ffffff', '#c8a8f2'][k]); // 시든 꽃잎
    });
    // 50차 과소비의 쓰레기장: 명품 가방 더미 (누빔 · 금 사슬 · 손잡이 · 상표 없는 무늬)
    case 'bagpile': return pic(84, 64, 42, 56, (_R, g) => {
      E(g, 42, 56, 36, 7, 'rgba(0,0,0,0.13)');
      const r = (k: number) => { const x = Math.sin((v + 3) * 77.3 + k * 19.1) * 43758.5453; return x - Math.floor(x); };
      E(g, 42, 48, 34, 11, '#e2dcd0'); E(g, 40, 42, 26, 10, '#ece6dc');
      const bag = (x: number, y: number, w: number, h: number, body: string, trim: string, kind: number) => {
        g.fillStyle = 'rgba(0,0,0,0.15)'; g.fillRect(x + 2, y + h - 1, w, 3);
        g.fillStyle = body; g.beginPath(); g.moveTo(x + 2, y); g.lineTo(x + w - 2, y); g.lineTo(x + w, y + h); g.lineTo(x, y + h); g.closePath(); g.fill();
        g.strokeStyle = 'rgba(0,0,0,0.35)'; g.lineWidth = 1; g.stroke();
        if (kind === 0) { g.strokeStyle = 'rgba(255,255,255,0.18)'; for (let q = -h; q < w; q += 4) { g.beginPath(); g.moveTo(x + q, y + h); g.lineTo(x + q + h, y); g.moveTo(x + q, y); g.lineTo(x + q + h, y + h); g.stroke(); } } // 누빔
        if (kind === 1) { g.fillStyle = trim; for (let yy = y + 2; yy < y + h - 1; yy += 3) for (let xx = x + 2 + ((yy - y) % 6 ? 1.5 : 0); xx < x + w - 1; xx += 3) g.fillRect(Math.round(xx), Math.round(yy), 1, 1); } // 잔무늬
        g.fillStyle = 'rgba(255,255,255,0.2)'; g.fillRect(x + 2, y + 1, w - 4, 2);
        g.strokeStyle = kind === 0 ? '#e0b84e' : trim; g.lineWidth = kind === 0 ? 1.2 : 2; g.beginPath(); g.ellipse(x + w / 2, y, w * 0.32, kind === 0 ? 6 : 5, 0, Math.PI, 0); g.stroke(); // 손잡이 · 금 사슬
        g.fillStyle = '#e8c24e'; g.fillRect(Math.round(x + w / 2 - 2), Math.round(y + h * 0.35), 4, 3); // 잠금 장식
      };
      const cols: [string, string, number][] = [['#1e1c1e', '#e0b84e', 0], ['#7a4a2a', '#c89a5a', 1], ['#d8702a', '#8a3a10', 2], ['#b8282e', '#f2d27a', 0], ['#efe4d0', '#a8865a', 2], ['#2a3a5a', '#c9a23e', 1], ['#f2c8d4', '#c9a23e', 0]];
      for (let k = 0; k < 9; k++) { const c = cols[Math.floor(r(k) * cols.length)]; bag(8 + r(k + 10) * 56, 14 + r(k + 20) * 28, 12 + r(k + 30) * 8, 9 + r(k + 40) * 6, c[0], c[1], c[2]); }
      for (let k = 0; k < 3; k++) { const x = 10 + r(k + 50) * 60, y = 40 + r(k + 55) * 8; g.fillStyle = ['#f6f2ea', '#1e1e1e', '#e8d6b0'][k]; g.fillRect(x, y, 10, 9); g.fillStyle = '#c9a23e'; g.fillRect(x + 4, y + 3, 2, 2); } // 상자
    });
    // 50차 귀금속 더미: 금빛 무더기 · 목걸이 사슬 · 진주 · 보석 반지 · 시계 · 왕관 (반짝임)
    case 'jewelpile': return pic(70, 52, 35, 44, (_R, g) => {
      E(g, 35, 44, 30, 6, 'rgba(0,0,0,0.13)');
      const r = (k: number) => { const x = Math.sin((v + 5) * 63.1 + k * 23.7) * 43758.5453; return x - Math.floor(x); };
      E(g, 35, 38, 28, 9, '#b8862a'); E(g, 34, 34, 22, 9, '#d8a83a'); E(g, 33, 30, 14, 7, '#f2c84a'); E(g, 30, 27, 6, 3, '#fff0a8');
      for (let k = 0; k < 40; k++) { const x = 8 + r(k) * 54, y = 24 + r(k + 50) * 20; g.fillStyle = ['#ffe07a', '#c9922a', '#fff4c0'][k % 3]; g.fillRect(Math.round(x), Math.round(y), 2, 1); } // 금 사슬 고리
      g.strokeStyle = '#ffe07a'; g.lineWidth = 1.2; for (let k = 0; k < 3; k++) { g.beginPath(); g.ellipse(18 + k * 16, 34 - k * 2, 9, 4, 0.2 * k, 0, Math.PI); g.stroke(); }
      for (let k = 0; k < 9; k++) { const t = k / 8; g.fillStyle = '#fbf8f0'; g.beginPath(); g.arc(14 + t * 20, 40 - Math.sin(t * Math.PI) * 5, 1.6, 0, Math.PI * 2); g.fill(); } // 진주
      const gem = (x: number, y: number, c: string) => { g.strokeStyle = '#e0b84e'; g.lineWidth = 1.2; g.beginPath(); g.ellipse(x, y + 2, 3, 1.6, 0, 0, Math.PI * 2); g.stroke(); g.fillStyle = c; g.beginPath(); g.moveTo(x, y - 3); g.lineTo(x + 2.4, y); g.lineTo(x, y + 1.4); g.lineTo(x - 2.4, y); g.closePath(); g.fill(); g.fillStyle = 'rgba(255,255,255,0.8)'; g.fillRect(x - 1, y - 2, 1, 1); };
      gem(22, 26, '#3a7ae8'); gem(44, 30, '#e8283a'); gem(52, 38, '#2ac87a'); gem(28, 36, '#ffffff');
      g.fillStyle = '#3a3a40'; g.fillRect(46, 22, 8, 6); g.fillStyle = '#e8e6e0'; g.beginPath(); g.arc(50, 25, 2.4, 0, Math.PI * 2); g.fill(); g.fillStyle = '#c9a23e'; g.fillRect(49, 20, 2, 2); g.fillRect(49, 28, 2, 2); // 시계
      g.fillStyle = '#e8c24e'; g.beginPath(); g.moveTo(26, 22); for (const [x, y] of [[28, 14], [31, 19], [34, 12], [37, 19], [40, 14], [42, 22]]) g.lineTo(x, y); g.closePath(); g.fill(); g.fillStyle = '#e8283a'; g.fillRect(33, 16, 2, 2); // 작은 왕관
      for (const [x, y] of [[18, 22], [40, 26], [56, 32], [30, 32]]) { g.fillStyle = '#ffffff'; g.fillRect(x, y - 2, 1, 5); g.fillRect(x - 2, y, 5, 1); } // 반짝임
    });
    // 50차 멀쩡한 가전: v 0 = 겹쳐 세운 TV · 1 = 양문 냉장고 · 2 = 세탁기 두 대
    case 'appliance': return pic(72, 76, 36, 68, (_R, g) => {
      E(g, 36, 68, 30, 6, 'rgba(0,0,0,0.13)');
      const k = v % 3;
      // 쿼터뷰 상자: (a, b) 바닥 · h 높이 · 바닥 앞 모서리가 (ox, oy). 윗면 · 왼쪽 앞면(+j) · 오른쪽 앞면(+i)
      const box = (ox: number, oy: number, a: number, b: number, h: number, top: string, left: string, right: string) => {
        const S = (i: number, j: number, z: number): [number, number] => [ox + (i - a) - (j - b), oy + (i - a) * 0.5 + (j - b) * 0.5 - z];
        const f = (pts: [number, number][], c: string) => { g.fillStyle = c; g.beginPath(); pts.forEach(([x, y], n) => (n ? g.lineTo(x, y) : g.moveTo(x, y))); g.closePath(); g.fill(); g.strokeStyle = 'rgba(0,0,0,0.25)'; g.lineWidth = 0.8; g.stroke(); };
        f([S(0, b, 0), S(a, b, 0), S(a, b, h), S(0, b, h)], left);
        f([S(a, 0, 0), S(a, b, 0), S(a, b, h), S(a, 0, h)], right);
        f([S(0, 0, h), S(a, 0, h), S(a, b, h), S(0, b, h)], top);
        return S;
      };
      if (k === 0) {
        for (const [ox, oy, tilt] of [[30, 64, 0], [50, 58, 1], [22, 46, 0]] as [number, number, number][]) {
          const S = box(ox, oy, 26, 3, 17, '#2a2a30', '#141418', '#1e1e24');
          const p0 = S(1.5, 3, 1.5), p1 = S(24.5, 3, 1.5), p2 = S(24.5, 3, 15.5), p3 = S(1.5, 3, 15.5);
          g.fillStyle = tilt ? '#2a3e5a' : '#1e2a40'; g.beginPath(); g.moveTo(...p0); g.lineTo(...p1); g.lineTo(...p2); g.lineTo(...p3); g.closePath(); g.fill();
          g.strokeStyle = 'rgba(180,210,255,0.4)'; g.lineWidth = 1; g.beginPath(); g.moveTo(...S(4, 3, 13)); g.lineTo(...S(10, 3, 9)); g.stroke(); // 화면 반사
        }
      } else if (k === 1) {
        const S = box(40, 66, 18, 16, 46, '#e8ecf0', '#c8ced6', '#a8b0ba');
        g.strokeStyle = '#8a929c'; g.lineWidth = 1; g.beginPath(); g.moveTo(...S(9, 16, 1)); g.lineTo(...S(9, 16, 45)); g.stroke(); // 양문 틈
        g.fillStyle = '#6a727c'; for (const [i, z] of [[7.5, 24], [10.5, 24]]) { const [x, y] = S(i, 16, z); g.fillRect(x - 0.5, y - 8, 1.5, 12); } // 손잡이
        g.fillStyle = '#2a3a4a'; { const [x, y] = S(3, 16, 34); g.fillRect(x, y - 5, 4, 5); g.fillStyle = '#7ad8ff'; g.fillRect(x + 1, y - 4, 2, 1); } // 디스플레이
        g.fillStyle = 'rgba(255,255,255,0.35)'; { const [x, y] = S(1, 16, 44); g.fillRect(x, y, 2, 30); }
      } else {
        for (const [ox, oy] of [[30, 66], [54, 58]] as [number, number][]) {
          const S = box(ox, oy, 16, 16, 19, '#f6f6f4', '#e2e2de', '#c8c8c2');
          const [cx, cy] = S(8, 16, 8.5);
          g.fillStyle = '#9aa0a8'; g.beginPath(); g.ellipse(cx, cy, 6.2, 6.8, -0.45, 0, Math.PI * 2); g.fill();
          g.fillStyle = '#3a4a5e'; g.beginPath(); g.ellipse(cx, cy, 4.6, 5.2, -0.45, 0, Math.PI * 2); g.fill();
          g.fillStyle = 'rgba(200,230,255,0.45)'; g.beginPath(); g.ellipse(cx - 1.4, cy - 1.6, 1.6, 2, -0.45, 0, Math.PI * 2); g.fill();
          g.fillStyle = '#b8bcc2'; { const [x, y] = S(3, 16, 17); g.fillRect(x, y, 10, 2); } g.fillStyle = '#5ac87a'; { const [x, y] = S(12, 16, 17); g.fillRect(x, y, 2, 2); } // 조작판
        }
      }
    });
    case 'chicken': return pic(24, 24, 12, 21, (R, g) => {
      // 47차 천국의 닭 한 마리: 흰 몸 · 붉은 볏 · 노란 부리와 다리 (v 1 = 모이 쪼기)
      E(g, 12, 21, 7, 2, 'rgba(0,0,0,0.15)');
      const dn = v % 2 ? 3 : 0;
      R(9, 17, 1, 4, '#e0a83a'); R(13, 17, 1, 4, '#e0a83a'); R(8, 20, 3, 1, '#e0a83a'); R(12, 20, 3, 1, '#e0a83a');
      E(g, 11, 13, 6, 5, '#fbfaf6'); E(g, 9, 14, 4, 3, '#ece8e0'); R(4, 9, 3, 5, '#f4f2ee'); R(3, 8, 2, 3, '#ffffff'); // 몸 · 날개 · 꼬리
      E(g, 16, 8 + dn, 3, 3, '#fbfaf6'); R(15, 4 + dn, 3, 2, '#e8322a'); R(16, 3 + dn, 1, 1, '#e8322a'); R(19, 8 + dn, 2, 1, '#f2b23a'); R(16, 10 + dn, 2, 2, '#e8322a'); R(17, 7 + dn, 1, 1, '#1e1a16');
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
