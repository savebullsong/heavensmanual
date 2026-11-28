// 35차 천국 1층: 현실 지도를 덮어 쓰던 천국을 버리고, 구름 위에 따로 지은 넓은 세계.
// 서쪽 끝 우주새(도착) → 상점가(현실의 모든 가게 · 돈을 마음껏 꺼내는 은행) → 한가운데 거대한 천국 본청 →
// 북쪽 놀이공원 · 남쪽 동물원 · 동쪽 휴양지(수영장 · 썬베드 · 호텔 · 오락실) → 동쪽 끝 우주선 기지(환생)까지 걸어서 간다.
import { TYPES, finalize, type Zone, type Building, type Prop } from './zone.ts';
import { TW, TH, iso } from './gfx.ts';
import type { PropPic } from './propgfx.ts';
import { lang } from './i18n.ts';
import { drawTableSet, drawCart } from './isoprop.ts';

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

/** 52차: 천국의 지붕 빌딩 — 섬 북쪽 끝 너머 하늘에 선 배경 탑(지도 칸 밖, 그림만) · 섬 가장자리의 정문 현관(들어가는 건물) */
export const PALACE_BG = { i0: 90, j0: -14, w: 18, d: 18 };
export const PALACE_GATE = { i0: 96, j0: 4, w: 6, d: 5 };
export interface HeavenMeta { sancts: Record<'church' | 'temple' | 'mosque', number>; palace: number; base: { i: number; j: number }; ship: { i: number; j: number }; ctr: number; post: number; pools: [number, number, number, number][]; cages: { i0: number; j0: number; i1: number; j1: number; kind: 'demon' | 'beast' | 'sinner' }[]; dump: { i0: number; j0: number; i1: number; j1: number }; chicken: { i: number; j: number } }
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
  // 52차: 천국의 지붕 빌딩은 섬 북쪽 끝 너머 하늘에 선 배경 — 그 뒤(화면 위)에 걸을 수 있는 땅이 남지 않게 깎는다
  for (let j = 0; j < PALACE_BG.j0 + PALACE_BG.d; j++) for (let i = PALACE_BG.i0 - 5 + j; i < PALACE_BG.i0 + PALACE_BG.w; i++) set(i, j, 'void');
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
  // 동쪽 끝 우주선 기지 — 52차: 발사대 옆 '천국 우주센터' 건물로 들어가야 환생 로비(테라스)가 나온다
  rect(182, 42, 206, 76, 'lot'); rect(168, 56, 184, 61, 'walk'); rect(184, 57, 196, 60, 'walk');
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
  // 52차: 천국의 지붕 빌딩은 광장 한가운데가 아니라 섬 북쪽 끝 너머에 선 배경(PALACE_BG). 섬 가장자리의 금빛 정문(현관)으로 들어간다
  //   (광장 한가운데 서 있으니 뒤를 걸으면 탑 위를 걷는 것처럼 보였고, 뒤쪽 놀이공원 · 오락실을 통째로 가렸다)
  const palace = buildings.length;
  buildings.push({ i0: PALACE_GATE.i0, j0: PALACE_GATE.j0, w: PALACE_GATE.w, d: PALACE_GATE.d, h: 170, cat: 'palace', sign: 'left', color: '#ffffff', pois: [P('palace', '천국의 지붕 빌딩', 'ตึกหลังคาสวรรค์', 'Roof of Heaven Building')] });
  rect(PALACE_GATE.i0 + 1, PALACE_GATE.j0 + PALACE_GATE.d, PALACE_GATE.i0 + PALACE_GATE.w - 2, 12, 'walk');
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
  // 52차 천국 우체국 (성소 앞길 동쪽 끝): 기원 편지의 답장은 현실 · 천국의 우체국에서만 받는다
  const post = buildings.length;
  buildings.push({ i0: 76, j0: 80, w: 7, d: 7, h: 110, cat: 'post' as Building['cat'], att: 'heaven', sign: 'left', color: '#ffffff', pois: [P('post_office', '구름 우체국', 'ไปรษณีย์เมฆ', 'Cloud Post Office')] });
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
  // 51차: 둘레 창살은 걷어 냈다(길을 막는 바리케이드 같았다) — 큰길의 정문 아치만 남긴다. 우리는 모서리까지 빈틈없이 이어진다
  props.push({ i: 110, j: 89, kind: 'zoogate' as Prop['kind'], o: 0 });
  // 창살 칸: o = 반쪽 막대 묶음 (1 = −i쪽 · 2 = +i쪽 · 4 = −j쪽 · 8 = +j쪽) — 곧은 칸은 3(i) · 12(j), 모서리는 둘을 잇는다
  const pen = (a: number, b: number, a1: number, b1: number) => {
    for (let i = a; i <= a1; i++) for (const j of [b, b1]) prop(i, j, 'zoobar', i === a ? (j === b ? 2 | 8 : 2 | 4) : i === a1 ? (j === b ? 1 | 8 : 1 | 4) : 3);
    for (let j = b + 1; j < b1; j++) { prop(a, j, 'zoobar', 12); prop(a1, j, 'zoobar', 12); }
  };
  for (const [a, b, an] of zoo) {
    pen(a, b, a + 5, b + 6);
    for (let n = 0; n < (an === 'flamingo' ? 4 : 2); n++) prop(a + 2 + (n % 2) * 2, b + 2 + Math.floor(n / 2) * 2, an);
  }
  // 43차: 동물원 남쪽 줄 — 지옥에서 데려온 악마 · 괴물, 그리고 죄 지은 인간들의 우리 (사람이 걸어 다니며 구경한다)
  rect(94, 109, 124, 110, 'walk'); for (const i of [102, 112]) rect(i, 110, i + 1, 113, 'walk');
  const cages: HeavenMeta['cages'] = [];
  for (const [a, b, kind] of [[94, 112, 'demon'], [104, 112, 'beast'], [114, 112, 'sinner']] as const) {
    rect(a + 1, b + 1, a + 6, b + 5, 'park');
    pen(a, b, a + 7, b + 6);
    cages.push({ i0: a + 1, j0: b + 1, i1: a + 6, j1: b + 5, kind });
  }
  // 광장 분수 · 놀이공원 풍선 수레 · 길가 나무
  // 51차: 분수를 크게 — 둘레 여덟 칸도 막아 수반 위로 걸어 들어가지 않게
  const fountain = (i: number, j: number) => { prop(i, j, 'fountain'); for (let a2 = -1; a2 <= 1; a2++) for (let b2 = -1; b2 <= 1; b2++) if (a2 || b2) prop(i + a2, j + b2, 'fblock' as string); };
  fountain(98, 70); fountain(122, 70); fountain(98, 38); fountain(122, 38);
  // 52차: 탑이 떠난 광장 한가운데 — 날개 편 천사상과 둥근 꽃밭 (사진 찍는 자리)
  { const [i, j] = [110, 52]; prop(i, j, 'angelstatue'); for (let a2 = -2; a2 <= 2; a2++) for (let b2 = -2; b2 <= 2; b2++) if (a2 || b2) prop(i + a2, j + b2, 'fblock'); }
  for (let k = 0; k < 12; k++) { const a = (k / 12) * Math.PI * 2; prop(Math.round(110 + Math.cos(a) * 6.5), Math.round(52 + Math.sin(a) * 6.5), 'flowerbed', k); }
  prop(100, 28, 'balloons'); prop(118, 28, 'balloons'); // 52차 후속: 장사꾼 없던 납작한 아이스크림 수레는 걷고, 천사가 끄는 솜구름 사탕 수레가 그 자리를 맡는다
  // 52차 후속: 길 아무 데나 흩어져 있던 손수레(장사꾼도 없이 들판 길에 덩그러니)를 걷어 내고, 사람이 모이는 다섯 자리에만 천사가 끄는 흰 수레를 둔다
  //   o = 종류 × 2 + 방향 (종류 0 만나 빵 · 1 솜구름 사탕 · 2 생명 과일 / 방향 0 = 길과 나란히 i)
  for (const st of TAXI_STOPS) prop(st.i + 1, st.j - 1, 'taxistand'); // 53차 택시 천사 정류장 표지
  for (const [i, j, kind, ax] of [[91, 57, 0, 0], [131, 57, 2, 0], [104, 87, 1, 0], [58, 89, 0, 0], [110, 30, 1, 1]] as const) prop(i, j, 'hcart', kind * 2 + ax);
  for (let i = 8; i < W - 8; i += 6) { if ((i > 88 && i < 130) || i > 180) continue; prop(i, 55, 'tree'); prop(i + 3, 62, 'tree'); }
  // 우주선 기지: 발사대 (계단 대신) · 52차 우주센터 건물(문은 큰길 쪽) · 발사 지원탑 · 연료 탱크 · 레이더 · 유도등
  const ship = { i: 201, j: 51 };
  const ctr = buildings.length;
  buildings.push({ i0: 186, j0: 47, w: 9, d: 8, h: 150, cat: 'shipctr' as Building['cat'], sign: 'left', color: '#ffffff', pois: [P('shipctr', '천국 우주센터', 'ศูนย์อวกาศสวรรค์', 'Heaven Space Center')] });
  const base = { i: 190, j: 55 };
  for (let a2 = -1; a2 <= 1; a2++) for (let b2 = -1; b2 <= 1; b2++) prop(ship.i + a2, ship.j + b2, 'fblock'); // 우주선 밑은 지나가지 못한다
  prop(203, 63, 'fueltank'); prop(204, 67, 'fueltank', 1); prop(200, 64, 'fueltank'); prop(184, 66, 'radar'); prop(188, 70, 'radar');
  for (let k = 0; k < 6; k++) { prop(192 + k * 2, 73, 'padlight'); prop(185, 62 + k * 2, 'padlight'); }
  for (const [i, j] of [[183, 44], [183, 74], [205, 44]]) prop(i, j, 'flag', i + j);
  const door = { i: 17, j: 55 };
  // 성소 앞길의 나무 · 분수
  for (let i = 30; i <= 90; i += 5) { if (i >= 55 && i <= 60) continue; prop(i, 92, 'tree'); }
  fountain(57, 84);
  // 47차 과소비의 쓰레기장 (남동쪽): 뜯지도 않은 선물 상자 · 쇼핑백 · 멀쩡한 TV · 매트리스 · 금 의자 · 샴페인 병 더미. 관리 천사가 한숨을 쉰다
  const dump = { i0: 173, j0: 80, i1: 190, j1: 97 };
  rect(dump.i0, dump.j0, dump.i1, dump.j1, 'lot'); rect(172, 58, 172, 80, 'walk');
  // 50차: 명품 가방 더미 · 귀금속 더미 · 멀쩡한 TV · 냉장고 · 세탁기가 섞인다
  // 52차: 줄 맞춘 더미가 아니라 뒤죽박죽 — 크고 작은 더미가 제멋대로 흩어지고, 낱개 쓰레기가 그 사이에 굴러다닌다. 쓰레기차가 와서 쏟고 집게 굴삭기가 집어 올린다
  { const rr = rnd(5252); const taken = new Set<string>();
    const free = (i: number, j: number) => !taken.has(`${i},${j}`) && tiles[j * W + i] === TI.lot;
    const claim = (i: number, j: number, r0 = 1) => { for (let a2 = -r0; a2 <= r0; a2++) for (let b2 = -r0; b2 <= r0; b2++) taken.add(`${i + a2},${j + b2}`); };
    claim(176, 92, 2); claim(186, 84, 2); claim(181, 81, 1);
    prop(176, 92, 'garbagetruck'); prop(186, 84, 'grabber'); prop(181, 82, 'junkpile', 7);
    for (let n = 0; n < 320; n++) {
      const i = dump.i0 + 1 + Math.floor(rr() * (dump.i1 - dump.i0 - 1)), j = dump.j0 + 1 + Math.floor(rr() * (dump.j1 - dump.j0 - 1));
      if (!free(i, j)) continue;
      const hh = rr();
      const kind = hh < 0.16 ? 'bagpile' : hh < 0.27 ? 'jewelpile' : hh < 0.42 ? 'appliance' : hh < 0.62 ? 'litter' : 'junkpile';
      prop(i, j, kind, Math.floor(rr() * 97)); claim(i, j, kind === 'appliance' && rr() < 0.4 ? 1 : 0);
    }
  }
  // 47차 닭 한 마리 (광장 서쪽에서 돌아다닌다)
  const chicken = { i: 88, j: 64 };
  meta = { sancts, palace, base, ship, ctr, post, pools, cages, dump, chicken };
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
 * 51차 천국의 지붕 빌딩 — 바벨탑처럼 끝이 보이지 않는 거대한 탑.
 * 흰 대리석 기단 세 단 · 두 면의 큰 계단과 금빛 아치 정문 → 층마다 조금씩 물러나는 단(아치 창 열 · 버팀벽 · 금 처마 · 난간),
 * 단을 비스듬히 감아 오르는 오르막길(작은 순례자들), 높이 오를수록 하늘빛에 바래고, 구름 띠가 몇 겹 감싼다.
 * 맨 위는 구름과 빛 속으로 사라진다 — 꼭대기는 보이지 않는다
 */
export const PALACE_TOP = 2300;
/** 51차: 높이 z에서 탑의 반너비(칸) — 누른 자리가 탑인지 가릴 때 (단마다 물러나는 모양 그대로) */
export function palaceHalf(z: number, R0 = 9): number {
  if (z < 44) return R0;
  let zz = 44, a = R0 - 1.6, h = 132;
  while (zz < PALACE_TOP - 40) { const z1 = Math.min(PALACE_TOP, zz + h); if (z < z1) return a; zz = z1; a = Math.max(2.6, a - 0.2); h = Math.max(70, h * 0.96); }
  return 0;
}
export function drawHeavenPalace(b: Building) {
  const TOP = PALACE_TOP;
  const f = frame(b, TOP + 120);
  const { g, Q, box, poly } = f;
  const cx = b.i0 + b.w / 2, cy = b.j0 + b.d / 2;
  const R0 = b.w / 2;
  const r = rnd(5151);
  const SKY = [238, 244, 252];
  const hx = (h: string) => [1, 3, 5].map((o) => parseInt(h.slice(o, o + 2), 16));
  const fade = (h: string, t: number) => { const c = hx(h), k = Math.max(0, Math.min(0.82, t)); return `rgb(${c.map((v, n) => Math.round(v + (SKY[n] - v) * k)).join(',')})`; };
  const haze = (z: number) => Math.pow(z / TOP, 1.15) * 0.95;
  // 얼굴 위 한 점: face 0 = 왼쪽 앞면(+j) · 1 = 오른쪽 앞면(+i). u = 0..2a 가로(왼쪽→오른쪽), z = 높이
  const FP = (face: 0 | 1, a: number, u: number, z: number, out = 0): [number, number] => face === 0 ? Q(cx - a + u, cy + a + out, z) : Q(cx + a + out, cy - a + u, z);
  const facePoly = (face: 0 | 1, a: number, pts: [number, number][], col: string, out = 0, al = 1) => poly(pts.map(([u, z]) => FP(face, a, u, z, out)), col, al);
  // ── 기단 세 단 ──
  const steps: [number, number, number][] = [[R0, 0, 14], [R0 - 0.6, 14, 28], [R0 - 1.2, 28, 44]];
  for (const [a, z0, z1] of steps) {
    box(cx - a, cy - a, cx + a, cy + a, z0, z1, '#fbf9f4', '#ece6da', '#dcd4c6');
    for (const face of [0, 1] as const) facePoly(face, a, [[0, z1 - 2.5], [2 * a, z1 - 2.5], [2 * a, z1], [0, z1]], face ? '#c9a23e' : '#e0b84e', 0.01);
  }
  // 두 면의 큰 계단 (땅에서 기단 위까지)
  for (const face of [0, 1] as const) {
    const a0 = R0, w = 4.2;
    for (let k = 0; k < 11; k++) {
      const z0 = k * 4, z1 = z0 + 4, out = 1.6 - k * 0.15, u0 = a0 - w / 2, u1 = a0 + w / 2;
      const top = '#fdfbf6', fr = face ? '#d8d0c0' : '#e8e2d6';
      if (face === 0) { box(cx - a0 + u0, cy + a0, cx - a0 + u1, cy + a0 + out, z0, z1, top, fr, '#d0c8b8'); }
      else { box(cx + a0, cy - a0 + u0, cx + a0 + out, cy - a0 + u1, z0, z1, top, '#e2dccf', fr); }
    }
  }
  // ── 단 (층) ──
  const tiers: { z0: number; z1: number; a: number }[] = [];
  { let z = 44, a = R0 - 1.6, h = 132; while (z < TOP - 40) { const z1 = Math.min(TOP, z + h); tiers.push({ z0: z, z1, a }); z = z1; a = Math.max(2.6, a - 0.2); h = Math.max(70, h * 0.96); } } // 거의 곧게 — 좁아져 끝나는 피라미드가 아니라 구름 위로 끝없이
  const arch = (face: 0 | 1, a: number, u0: number, w: number, z0: number, z1: number, col: string, glow: string, t: number) => {
    const pts: [number, number][] = [[u0, z0], [u0 + w, z0], [u0 + w, z1 - w * 0.9]];
    for (let q = 0; q <= 8; q++) { const th = (q / 8) * Math.PI; pts.push([u0 + w / 2 + (w / 2) * Math.cos(th), z1 - w * 0.9 + Math.sin(th) * w * 14]); }
    pts.push([u0, z1 - w * 0.9]);
    facePoly(face, a, pts, fade(col, t), 0.02);
    facePoly(face, a, pts.map(([u, z]) => [u0 + w / 2 + (u - u0 - w / 2) * 0.62, z0 + (z - z0) * 0.9] as [number, number]), fade(glow, t), 0.03, 0.85);
  };
  tiers.forEach((T, n) => {
    const { z0, z1, a } = T, t = haze((z0 + z1) / 2);
    const top = fade('#fbf8f0', t), left = fade('#efe9dd', t), right = fade('#ddd5c6', t);
    box(cx - a, cy - a, cx + a, cy + a, z0, z1, top, left, right);
    // 아치 창 열 (두 줄 — 큰 단은 세 줄)
    const rows = z1 - z0 > 110 ? 3 : z1 - z0 > 70 ? 2 : 1;
    for (const face of [0, 1] as const) {
      const span = 2 * a, nA = Math.max(3, Math.round(span * 1.25)), cell = span / nA;
      for (let ro = 0; ro < rows; ro++) {
        const rz0 = z0 + 8 + ((z1 - z0 - 14) / rows) * ro, rz1 = rz0 + ((z1 - z0 - 14) / rows) * 0.78;
        for (let q = 0; q < nA; q++) {
          const lit = r() < 0.28;
          arch(face, a, q * cell + cell * 0.2, cell * 0.6, rz0, rz1, face ? '#b8ae9c' : '#cfc6b4', lit ? '#ffe9a8' : face ? '#8a8272' : '#a49a88', t);
        }
        if (ro < rows - 1) facePoly(face, a, [[0, rz1 + 2], [span, rz1 + 2], [span, rz1 + 4], [0, rz1 + 4]], fade(face ? '#d8ccb0' : '#ece0c4', t), 0.02);
      }
      // 버팀벽 (모서리와 가운데)
      for (const u of [0.05, a, 2 * a - 0.35]) facePoly(face, a, [[u, z0], [u + 0.3, z0], [u + 0.3, z1], [u, z1]], fade(face ? '#d2c8b6' : '#f6f1e6', t), 0.06);
    }
    // 처마: 금 띠 + 흰 난간 (윗단 둘레)
    for (const face of [0, 1] as const) {
      facePoly(face, a + 0.08, [[0, z1 - 5], [2 * a + 0.16, z1 - 5], [2 * a + 0.16, z1], [0, z1]], fade(face ? '#c9a23e' : '#e8c45a', t * 0.8), 0.01);
      const na = a - 0.42 > 0.8 ? a - 0.42 : a;
      if (n < tiers.length - 1) for (let q = 0; q <= Math.round(2 * a * 3); q++) { const u = (q / Math.round(2 * a * 3)) * 2 * a; const p0 = FP(face, a, u, z1), p1 = FP(face, a, u, z1 + 6); g.strokeStyle = fade('#ffffff', t); g.lineWidth = 1; g.beginPath(); g.moveTo(p0[0], p0[1]); g.lineTo(p1[0], p1[1]); g.stroke(); }
      void na;
    }
    // 바벨의 오르막길: 단마다 왼쪽 면을 비스듬히 올라 오른쪽 면으로 이어진다 (작은 순례자들)
    if (n < tiers.length - 2 && z1 - z0 > 50) {
      const rz0 = z0 + 4, rz1 = z1 - 8;
      for (const face of [0, 1] as const) {
        const za = face === 0 ? rz0 : (rz0 + rz1) / 2, zb = face === 0 ? (rz0 + rz1) / 2 : rz1;
        const L = 2 * a;
        facePoly(face, a, [[0, za - 6], [L, zb - 6], [L, zb], [0, za]], fade('#000000', 0.86 + t * 0.1), 0.25, 0.25); // 그늘
        facePoly(face, a, [[0, za], [L, zb], [L, zb + 7], [0, za + 7]], fade(face ? '#e2d8c4' : '#fbf6ea', t), 0.25);
        facePoly(face, a, [[0, za + 7], [L, zb + 7], [L, zb + 9], [0, za + 9]], fade('#e0b84e', t), 0.26);
        for (let q = 0; q < 4; q++) { if (r() < 0.45) continue; const u = (q + r() * 0.6) * (L / 4), z = za + (zb - za) * (u / L) + 9; const p = FP(face, a, u, z, 0.3); g.fillStyle = fade(['#7a6a5a', '#c84a3a', '#3a5a8a', '#f2f2ea'][Math.floor(r() * 4)], t); g.fillRect(Math.round(p[0]), Math.round(p[1]) - 4, 2, 4); }
      }
    }
  });
  // ── 정문: 두 면 가운데 거대한 금빛 아치 (첫 단) ──
  {
    const T0 = tiers[0], a = T0.a;
    for (const face of [0, 1] as const) {
      const w = 3.2, u0 = a - w / 2, z0 = T0.z0, z1 = T0.z0 + 118;
      const outer: [number, number][] = [[u0 - 0.35, z0], [u0 + w + 0.35, z0], [u0 + w + 0.35, z1 - 40]];
      for (let q = 0; q <= 12; q++) { const th = (q / 12) * Math.PI; outer.push([a + (w / 2 + 0.35) * Math.cos(th), z1 - 40 + Math.sin(th) * 52]); }
      outer.push([u0 - 0.35, z1 - 40]);
      facePoly(face, a, outer, face ? '#b8922e' : '#e0b84e', 0.08);
      const inner = outer.map(([u, z]) => [a + (u - a) * 0.82, z0 + (z - z0) * 0.9] as [number, number]);
      facePoly(face, a, inner, '#fff2c4', 0.1);
      facePoly(face, a, inner.map(([u, z]) => [a + (u - a) * 0.6, z0 + (z - z0) * 0.8] as [number, number]), '#fffbe8', 0.11);
      for (const s of [-1, 1]) { const u = a + s * (w / 2 + 0.9); facePoly(face, a, [[u - 0.25, z0], [u + 0.25, z0], [u + 0.25, z1 + 4], [u - 0.25, z1 + 4]], face ? '#e4dccc' : '#fffdf8', 0.12); facePoly(face, a, [[u - 0.35, z1 + 4], [u + 0.35, z1 + 4], [u + 0.35, z1 + 10], [u - 0.35, z1 + 10]], '#e0b84e', 0.13); }
    }
  }
  // ── 구름 띠: 몇 겹이 탑을 감싼다 ──
  const cloudBand = (z: number, a: number, k: number) => {
    const [x0, y0] = Q(cx, cy, z);
    const wpx = (a * 2 + 7) * 32;
    for (let q = 0; q < 26; q++) {
      const t2 = q / 25, x = x0 - wpx / 2 + t2 * wpx + (r() - 0.5) * 30, y = y0 + 22 + Math.sin(t2 * Math.PI) * 26 + (r() - 0.5) * 16;
      const rad = 34 + r() * 46 * k;
      const gr = g.createRadialGradient(x, y, 2, x, y, rad);
      gr.addColorStop(0, 'rgba(255,255,255,0.95)'); gr.addColorStop(0.55, 'rgba(250,252,255,0.72)'); gr.addColorStop(1, 'rgba(240,246,255,0)');
      g.fillStyle = gr; g.beginPath(); g.ellipse(x, y, rad * 1.5, rad * 0.62, 0, 0, Math.PI * 2); g.fill();
    }
  };
  const aAt = (z: number) => (tiers.find((T) => z >= T.z0 && z < T.z1) ?? tiers[tiers.length - 1]).a;
  for (const [z, k] of [[640, 0.9], [1120, 1.15], [1560, 1.35]] as [number, number][]) cloudBand(z, aAt(z), k);
  // ── 맨 위: 두꺼운 구름 천장 속으로 사라진다 (꼭대기가 보이지 않는다) — 뭉게구름을 겹겹이 쌓아 네모난 테가 생기지 않게 ──
  {
    const zc = TOP - 330, a = aAt(zc);
    const [x0, y0] = Q(cx, cy, zc);
    const [, yTop] = Q(cx, cy, TOP + 110);
    const wpx = (a * 2 + 9) * 32;
    for (let q = 0; q < 70; q++) {
      const t2 = r(), up = r();
      const x = x0 + (t2 - 0.5) * wpx * (1 - up * 0.35), y = y0 + 60 - up * (y0 + 60 - yTop) * 0.95;
      const rad = 60 + r() * 90;
      const gr = g.createRadialGradient(x, y, 4, x, y, rad);
      const al = 0.55 + up * 0.45;
      gr.addColorStop(0, `rgba(255,255,253,${al})`); gr.addColorStop(0.6, `rgba(252,252,255,${al * 0.6})`); gr.addColorStop(1, 'rgba(246,250,255,0)');
      g.fillStyle = gr; g.beginPath(); g.ellipse(x, y, rad * 1.4, rad * 0.75, 0, 0, Math.PI * 2); g.fill();
    }
    const beam = g.createLinearGradient(x0 - 40, 0, x0 + 40, 0);
    beam.addColorStop(0, 'rgba(255,240,190,0)'); beam.addColorStop(0.5, 'rgba(255,246,206,0.6)'); beam.addColorStop(1, 'rgba(255,240,190,0)');
    g.fillStyle = beam; g.fillRect(x0 - 40, 0, 80, yTop + 140);
    const halo = g.createRadialGradient(x0, yTop + 120, 4, x0, yTop + 120, 200);
    halo.addColorStop(0, 'rgba(255,248,214,0.85)'); halo.addColorStop(1, 'rgba(255,248,214,0)');
    g.fillStyle = halo; g.beginPath(); g.arc(x0, yTop + 120, 200, 0, Math.PI * 2); g.fill();
  }
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
/** 53차 천국 택시 천사 정류장: 시작 지점 · 천국의 지붕 빌딩 앞 · 종교시설 구역 · 쓰레기장 (서로 오간다) */
export const TAXI_STOPS: { key: 'start' | 'palace' | 'sanct' | 'dump'; i: number; j: number }[] = [{ key: 'start', i: 22, j: 57 }, { key: 'palace', i: 103, j: 12 }, { key: 'sanct', i: 44, j: 89 }, { key: 'dump', i: 178, j: 99 }];
/** 52차 후속: 천국 수레 종류 (prop o >> 1) */
export const HCART_KINDS = ['manna', 'cotton', 'fruit'] as const;
const HCART_GOODS = ['manna', 'cotton', 'lifefruit'] as const;
export const HEAVEN_PROPS = new Set(['sunbed', 'parasol', 'giraffe', 'elephant', 'lion', 'zebra', 'flamingo', 'panda', 'fountain', 'balloons', 'icecream', 'junkpile', 'chicken', 'zoobar', 'zoogate', 'bagpile', 'jewelpile', 'appliance', 'fblock', 'angelstatue', 'flowerbed', 'gantry', 'fueltank', 'radar', 'padlight', 'flag', 'garbagetruck', 'grabber', 'litter', 'hcafe', 'hcart', 'taxistand']);
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
    case 'zoobar': return pic(68, 104, 34, 92, (_R, g) => {
      // 51차: 칸 가운데에서 네 방향 반쪽 막대를 골라 잇는다 (모서리는 굵은 기둥) — 우리끼리 이어져 빈틈이 없다
      const m = o === 0 ? 3 : o === 1 ? 12 : o;
      const C: [number, number] = [34, 92];
      const dir: Record<number, [number, number]> = { 1: [-16, -8], 2: [16, 8], 4: [16, -8], 8: [-16, 8] }; // 반 칸 = 화면 (16, 8)
      const halves = [1, 4, 2, 8].filter((k) => m & k); // 뒤쪽(−i · −j) 먼저
      const at = (k: number, t: number, z: number): [number, number] => [C[0] + dir[k][0] * t, C[1] + dir[k][1] * t - z];
      const line = (a: [number, number], b: [number, number], w: number, c: string) => { g.strokeStyle = c; g.lineWidth = w; g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.stroke(); };
      const bar = (x: number, y: number) => {
        g.fillStyle = '#26262e'; g.fillRect(Math.round(x) - 1, y - 72, 3, 72);
        g.fillStyle = '#6a6a7a'; g.fillRect(Math.round(x) - 1, y - 72, 1, 72);
        g.fillStyle = '#c9a23e'; g.fillRect(Math.round(x) - 2, y - 74, 5, 2);
        g.beginPath(); g.moveTo(x + 0.5, y - 86); g.lineTo(x + 3.5, y - 76); g.lineTo(x + 0.5, y - 73); g.lineTo(x - 2.5, y - 76); g.closePath(); g.fillStyle = '#e8c24e'; g.fill();
        g.fillStyle = '#fff2b8'; g.fillRect(Math.round(x), y - 83, 1, 6);
      };
      for (const k of halves) { const a = at(k, 0, -1), b = at(k, 1, -1); g.fillStyle = 'rgba(40,40,60,0.15)'; g.beginPath(); g.moveTo(a[0], a[1] + 2); g.lineTo(b[0], b[1] + 2); g.lineTo(b[0] + 3, b[1] + 5); g.lineTo(a[0] + 3, a[1] + 5); g.fill(); }
      for (const k of halves) {
        line(at(k, 0, 2), at(k, 1, 2), 3, '#2a2a32');
        for (const t of [0.25, 0.75]) { const [x, y] = at(k, t, 0); bar(x, y); }
        line(at(k, 0, 30), at(k, 1, 30), 2.5, '#2e2e36'); line(at(k, 0, 64), at(k, 1, 64), 3, '#2a2a32'); line(at(k, 0, 64.8), at(k, 1, 64.8), 1, '#7a7a88');
      }
      const corner = halves.length === 2 && !((m === 3) || (m === 12));
      if (corner) { g.fillStyle = '#1e1e26'; g.fillRect(C[0] - 3, C[1] - 80, 6, 80); g.fillStyle = '#5a5a6a'; g.fillRect(C[0] - 3, C[1] - 80, 2, 80); g.fillStyle = '#c9a23e'; g.fillRect(C[0] - 4, C[1] - 84, 8, 4); g.beginPath(); g.arc(C[0], C[1] - 88, 4, 0, Math.PI * 2); g.fillStyle = '#e8c24e'; g.fill(); }
      else { const [x, y] = at(halves[0], 0, 0); bar(x, y); }
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
    case 'fountain': return pic(176, 150, 88, 112, (_R, g) => {
      // 51차 천국의 분수: 팔각 대리석 수반(금 테 · 조각한 판) · 잔물결 · 가장자리 네 물줄기 · 두 단 물그릇에서 흘러내리는 물막 · 금빛 연꽃 꼭지에서 솟는 물기둥
      const cx = 88, cy = 104, RX = 74, RY = 36, H = 14;
      const oct = (rx: number, ry: number, y: number): [number, number][] => Array.from({ length: 8 }, (_, k) => { const a = (k / 8) * Math.PI * 2 + Math.PI / 8; return [cx + Math.cos(a) * rx, y + Math.sin(a) * ry]; });
      const P = (pts: [number, number][], col: string | CanvasGradient, line?: string) => { g.beginPath(); pts.forEach(([x, y], n) => (n ? g.lineTo(x, y) : g.moveTo(x, y))); g.closePath(); g.fillStyle = col; g.fill(); if (line) { g.strokeStyle = line; g.lineWidth = 1; g.stroke(); } };
      E(g, cx + 4, cy + H + 6, RX + 8, RY + 6, 'rgba(120,130,160,0.16)');
      // 수반 바깥벽 (앞쪽 다섯 면) — 면마다 조각한 판과 금 띠
      const top = oct(RX, RY, cy), bot = oct(RX, RY, cy + H);
      for (let k = 0; k < 8; k++) {
        const a = top[k], b2 = top[(k + 1) % 8], c2 = bot[(k + 1) % 8], d2 = bot[k];
        if (Math.max(a[1], b2[1]) < cy - 2) continue; // 뒤쪽 면은 보이지 않는다
        const shade = 0.86 + 0.14 * Math.cos(((k + 0.5) / 8) * Math.PI * 2 + Math.PI / 8 - Math.PI * 0.75);
        const col = `rgb(${Math.round(244 * shade)},${Math.round(240 * shade)},${Math.round(230 * shade)})`;
        P([a, b2, c2, d2], col, 'rgba(150,140,120,0.4)');
        const m = (u: number, v: number): [number, number] => [a[0] + (b2[0] - a[0]) * u + (d2[0] - a[0]) * v, a[1] + (b2[1] - a[1]) * u + (d2[1] - a[1]) * v];
        P([m(0.18, 0.3), m(0.82, 0.3), m(0.82, 0.8), m(0.18, 0.8)], `rgba(200,190,168,0.45)`);
        g.strokeStyle = '#d8b44a'; g.lineWidth = 1.4; g.beginPath(); g.moveTo(...m(0, 0.12)); g.lineTo(...m(1, 0.12)); g.stroke();
      }
      // 테두리 윗면 (넓은 대리석 띠) · 물
      P(top, '#fbf9f2', 'rgba(170,150,110,0.6)');
      const inner = oct(RX - 9, RY - 5, cy);
      const wg = g.createRadialGradient(cx, cy, 4, cx, cy, RX);
      wg.addColorStop(0, '#bff0f8'); wg.addColorStop(0.6, '#8fdcec'); wg.addColorStop(1, '#6ec8de');
      P(inner, wg, '#d8b44a');
      g.strokeStyle = 'rgba(255,255,255,0.55)'; g.lineWidth = 1;
      for (const k of [0.3, 0.5, 0.7, 0.88]) { g.beginPath(); g.ellipse(cx, cy + 2, (RX - 9) * k, (RY - 5) * k, 0, 0, Math.PI * 2); g.stroke(); }
      for (let q = 0; q < 26; q++) { const a = (q / 26) * Math.PI * 2, rr = 0.35 + ((q * 37) % 10) / 16; g.fillStyle = 'rgba(255,255,255,0.85)'; g.fillRect(Math.round(cx + Math.cos(a) * (RX - 12) * rr), Math.round(cy + 2 + Math.sin(a) * (RY - 7) * rr), 2, 1); }
      // 가장자리 네 물줄기 (안쪽으로 휘어 떨어진다)
      g.lineCap = 'round';
      for (const [ax, ay] of [[cx - RX + 10, cy], [cx + RX - 10, cy], [cx, cy - RY + 6], [cx, cy + RY - 6]] as [number, number][]) {
        const mx = (ax + cx) / 2, my = (ay + cy) / 2 - 26;
        g.strokeStyle = 'rgba(170,225,240,0.9)'; g.lineWidth = 3; g.beginPath(); g.moveTo(ax, ay - 2); g.quadraticCurveTo(mx, my, ax + (cx - ax) * 0.62, ay + (cy - ay) * 0.62); g.stroke();
        g.strokeStyle = 'rgba(255,255,255,0.95)'; g.lineWidth = 1.2; g.stroke();
        E(g, ax + (cx - ax) * 0.62, ay + (cy - ay) * 0.62 + 1, 4, 1.6, 'rgba(255,255,255,0.8)');
        E(g, ax, ay - 1, 3, 2, '#e0b84e');
      }
      // 기둥 · 아래 물그릇
      const col = (y0: number, y1: number, w: number) => { const gr = g.createLinearGradient(cx - w, 0, cx + w, 0); gr.addColorStop(0, '#fffdf6'); gr.addColorStop(0.6, '#ebe4d4'); gr.addColorStop(1, '#cfc6b2'); g.fillStyle = gr; g.fillRect(cx - w, y0, w * 2, y1 - y0); g.fillStyle = '#d8b44a'; g.fillRect(cx - w - 1, y0, w * 2 + 2, 2); g.fillRect(cx - w - 1, y1 - 3, w * 2 + 2, 2); };
      col(62, cy + 2, 6);
      const bowl = (y: number, rx: number, ry: number) => {
        // 물막: 그릇 앞 가장자리에서 아래로 흘러내린다
        for (let q = 0; q < 14; q++) { const t2 = q / 13, x = cx - rx + t2 * rx * 2, yy = y + Math.sin(t2 * Math.PI) * ry; g.strokeStyle = q % 2 ? 'rgba(190,235,246,0.65)' : 'rgba(255,255,255,0.7)'; g.lineWidth = 1.2; g.beginPath(); g.moveTo(x, yy + 3); g.lineTo(x + (x - cx) * 0.06, yy + 20 + (q % 3) * 3); g.stroke(); }
        E(g, cx, y + 3, rx, ry + 2, '#d8cfbc');
        const bg = g.createLinearGradient(0, y - ry, 0, y + ry + 4); bg.addColorStop(0, '#fffdf6'); bg.addColorStop(1, '#ddd4c0');
        g.fillStyle = bg; g.beginPath(); g.ellipse(cx, y, rx, ry, 0, 0, Math.PI * 2); g.fill();
        g.strokeStyle = '#d8b44a'; g.lineWidth = 1.4; g.beginPath(); g.ellipse(cx, y, rx, ry, 0, 0, Math.PI * 2); g.stroke();
        for (let q = 0; q < 12; q++) { const a = (q / 12) * Math.PI; g.fillStyle = 'rgba(200,180,140,0.6)'; g.fillRect(Math.round(cx + Math.cos(a) * rx * 0.96), Math.round(y + Math.sin(a) * ry + 1), 1, 3); } // 조가비 홈
        E(g, cx, y - 1, rx - 4, ry - 2, '#9fe2f0'); E(g, cx - rx * 0.3, y - 2, rx * 0.35, ry * 0.3, 'rgba(255,255,255,0.5)');
      };
      bowl(64, 30, 10);
      col(36, 62, 4);
      bowl(38, 17, 6);
      // 금빛 연꽃 꼭지 · 솟는 물기둥 · 떨어지는 물방울
      for (let k = 0; k < 6; k++) { const a = (k / 6) * Math.PI - Math.PI; g.fillStyle = k % 2 ? '#e8c24e' : '#f4d878'; g.beginPath(); g.ellipse(cx + Math.cos(a) * 4, 30 + Math.sin(a) * 2, 2.6, 5, a + Math.PI / 2, 0, Math.PI * 2); g.fill(); }
      E(g, cx, 31, 3, 2, '#f8e7a0');
      const jet = g.createLinearGradient(0, 2, 0, 30); jet.addColorStop(0, 'rgba(255,255,255,0)'); jet.addColorStop(0.3, 'rgba(230,248,255,0.95)'); jet.addColorStop(1, 'rgba(200,236,248,0.9)');
      g.fillStyle = jet; g.fillRect(cx - 1.5, 4, 3, 26);
      g.strokeStyle = 'rgba(220,244,252,0.85)'; g.lineWidth = 1.2;
      for (const sd of [-1, 1]) for (const w of [10, 16]) { g.beginPath(); g.moveTo(cx, 8); g.quadraticCurveTo(cx + sd * w * 0.6, -2, cx + sd * w, 34); g.stroke(); }
      for (let q = 0; q < 10; q++) { const x = cx + (q % 2 ? 1 : -1) * (6 + q * 1.4), y = 14 + q * 2.2; g.fillStyle = 'rgba(255,255,255,0.9)'; g.fillRect(Math.round(x), Math.round(y), 1, 2); }
    });
    case 'fblock': return pic(2, 2, 1, 1, () => {});
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
    // ── 52차: 광장의 천사상 · 꽃밭 · 우주센터 마당 · 쓰레기장의 쓰레기차 · 집게 굴삭기 · 낱개 쓰레기 ──
    case 'angelstatue': return pic(255, 357, 128, 299, (_R, g) => {
      g.scale(1.7, 1.7);
      E(g, 75, 176, 62, 22, 'rgba(0,0,0,0.12)');
      const oct = (cy: number, rx: number, ry: number, hgt: number, top: string, side: string) => {
        const pts: [number, number][] = []; for (let q = 0; q < 8; q++) { const a = (q / 8) * Math.PI * 2 + Math.PI / 8; pts.push([75 + Math.cos(a) * rx, cy + Math.sin(a) * ry]); }
        g.fillStyle = side; g.beginPath(); g.moveTo(pts[0][0], pts[0][1]); for (const [x, y] of pts) g.lineTo(x, y); for (const [x, y] of pts.slice().reverse()) g.lineTo(x, y - hgt); g.closePath(); g.fill();
        g.fillStyle = side; g.fillRect(75 - rx, cy - hgt, rx * 2, hgt);
        g.fillStyle = top; g.beginPath(); pts.forEach(([x, y], n) => (n ? g.lineTo(x, y - hgt) : g.moveTo(x, y - hgt))); g.closePath(); g.fill();
      };
      oct(172, 58, 22, 8, '#fbf9f4', '#ddd5c6'); oct(164, 46, 17, 8, '#f6f2ea', '#d4ccbc'); oct(156, 22, 9, 30, '#fbf8f0', '#e6e0d4');
      g.fillStyle = '#e0b84e'; g.fillRect(53, 122, 44, 3); g.fillRect(53, 148, 44, 2);
      // 날개 (뒤) — 깃털 줄
      for (const s of [-1, 1]) for (let q = 0; q < 7; q++) { g.fillStyle = q % 2 ? '#f4f0e8' : '#ffffff'; g.beginPath(); g.moveTo(75 + s * 6, 70); g.quadraticCurveTo(75 + s * (26 + q * 5), 38 - q * 4, 75 + s * (34 + q * 4), 44 + q * 9); g.lineTo(75 + s * (24 + q * 3), 58 + q * 7); g.closePath(); g.fill(); }
      g.strokeStyle = 'rgba(150,140,120,0.45)'; g.lineWidth = 0.8; for (const s of [-1, 1]) for (let q = 0; q < 6; q++) { g.beginPath(); g.moveTo(75 + s * 8, 70); g.quadraticCurveTo(75 + s * (22 + q * 5), 46 - q * 3, 75 + s * (30 + q * 4), 52 + q * 9); g.stroke(); }
      // 몸 (옷자락) · 머리 · 들어 올린 팔과 별
      g.fillStyle = '#f2eee6'; g.beginPath(); g.moveTo(66, 122); g.quadraticCurveTo(68, 92, 71, 70); g.lineTo(79, 70); g.quadraticCurveTo(82, 92, 84, 122); g.closePath(); g.fill();
      g.fillStyle = '#e4ded2'; g.beginPath(); g.moveTo(75, 76); g.quadraticCurveTo(77, 100, 80, 122); g.lineTo(84, 122); g.quadraticCurveTo(82, 96, 79, 72); g.closePath(); g.fill();
      for (let q = 0; q < 4; q++) { g.strokeStyle = 'rgba(140,130,110,0.35)'; g.beginPath(); g.moveTo(69 + q * 3, 84); g.lineTo(68 + q * 4, 121); g.stroke(); }
      g.fillStyle = '#f6f2ea'; g.beginPath(); g.arc(75, 63, 6.5, 0, Math.PI * 2); g.fill(); g.fillStyle = '#e8e2d6'; g.beginPath(); g.arc(77, 64, 5, -0.6, 1.6); g.fill();
      g.strokeStyle = '#e8c24e'; g.lineWidth = 1.6; g.beginPath(); g.ellipse(75, 54, 7, 2.2, 0, 0, Math.PI * 2); g.stroke();
      g.strokeStyle = '#efe9dd'; g.lineWidth = 4; g.beginPath(); g.moveTo(79, 74); g.lineTo(88, 50); g.lineTo(90, 34); g.stroke();
      g.fillStyle = '#f2d27a'; g.beginPath(); for (let q = 0; q < 10; q++) { const a = (q / 10) * Math.PI * 2 - Math.PI / 2, rr = q % 2 ? 3 : 7; g.lineTo(90 + Math.cos(a) * rr, 27 + Math.sin(a) * rr); } g.closePath(); g.fill();
      const gl = g.createRadialGradient(90, 27, 1, 90, 27, 18); gl.addColorStop(0, 'rgba(255,246,200,0.8)'); gl.addColorStop(1, 'rgba(255,240,180,0)'); g.fillStyle = gl; g.beginPath(); g.arc(90, 27, 18, 0, Math.PI * 2); g.fill();
    });
    case 'flowerbed': return pic(122, 68, 61, 48, (_R, g) => {
      g.scale(1.6, 1.6);
      E(g, 38, 30, 34, 11, '#e6e0d4'); E(g, 38, 28, 31, 10, '#fbf8f0'); E(g, 38, 27, 28, 8.5, '#7ab86a'); E(g, 38, 26, 24, 7, '#8ac87a');
      const cols = [['#f28aa8', '#ffffff'], ['#f2d27a', '#ffffff'], ['#c8a8f2', '#f2d27a'], ['#ffffff', '#f28aa8'], ['#f2a87a', '#ffe0a0'], ['#8ac8f2', '#ffffff'], ['#e85a6a', '#f2d27a'], ['#ffffff', '#c8a8f2']][v % 8];
      for (let q = 0; q < 34; q++) { const a = q * 2.399, rr = Math.sqrt(q / 34); const x = 38 + Math.cos(a) * rr * 24, y = 26 + Math.sin(a) * rr * 6.5 - 2; g.fillStyle = cols[q % 2]; g.beginPath(); g.arc(x, y, 1.8, 0, Math.PI * 2); g.fill(); if (q % 5 === 0) { g.fillStyle = '#f2d27a'; g.fillRect(Math.round(x), Math.round(y), 1, 1); } }
    });
    case 'gantry': return pic(110, 270, 55, 250, (_R, g) => {
      E(g, 55, 250, 40, 12, 'rgba(0,0,0,0.13)');
      g.fillStyle = '#e0e2e8'; g.beginPath(); g.moveTo(20, 250); g.lineTo(55, 262); g.lineTo(90, 250); g.lineTo(55, 238); g.closePath(); g.fill();
      for (const x of [36, 62]) { g.fillStyle = x < 50 ? '#f4f5f8' : '#d4d8e0'; g.fillRect(x, 20, 10, 230); }
      g.strokeStyle = '#c9a23e'; g.lineWidth = 1.2; for (let y = 30; y < 246; y += 14) { g.beginPath(); g.moveTo(36, y); g.lineTo(72, y + 14); g.moveTo(72, y); g.lineTo(36, y + 14); g.stroke(); }
      for (let y = 26; y < 250; y += 28) { g.fillStyle = '#e8c24e'; g.fillRect(34, y, 40, 3); }
      for (const y of [70, 150, 210]) { g.fillStyle = '#eceef2'; g.fillRect(6, y, 32, 5); g.fillStyle = '#c9a23e'; g.fillRect(6, y + 5, 32, 2); } // 우주선 쪽으로 뻗은 팔
      g.fillStyle = '#e8322a'; g.beginPath(); g.arc(54, 14, 3, 0, Math.PI * 2); g.fill(); g.strokeStyle = '#b8bcc6'; g.beginPath(); g.moveTo(54, 20); g.lineTo(54, 10); g.stroke();
    });
    case 'fueltank': return pic(84, 124, 42, 110, (_R, g) => {
      E(g, 42, 110, 34, 10, 'rgba(0,0,0,0.13)');
      if (v % 2) {
        for (const [x, y] of [[20, 108], [64, 108], [30, 112], [54, 112]]) { g.fillStyle = '#b8bcc6'; g.fillRect(x - 1, y - 40, 3, 40); }
        const gr = g.createRadialGradient(34, 46, 6, 42, 58, 36); gr.addColorStop(0, '#ffffff'); gr.addColorStop(0.7, '#e6e8ee'); gr.addColorStop(1, '#b8bfcc');
        g.fillStyle = gr; g.beginPath(); g.arc(42, 58, 32, 0, Math.PI * 2); g.fill();
        g.strokeStyle = '#e0b84e'; g.lineWidth = 2; g.beginPath(); g.ellipse(42, 58, 32, 6, 0, 0, Math.PI); g.stroke();
      } else {
        const gr = g.createLinearGradient(14, 0, 70, 0); gr.addColorStop(0, '#ffffff'); gr.addColorStop(0.6, '#e6e8ee'); gr.addColorStop(1, '#b0b8c4');
        g.fillStyle = gr; g.fillRect(14, 22, 56, 86); E(g, 42, 108, 28, 7, '#c4cad4'); E(g, 42, 22, 28, 7, '#f6f7fa');
        for (const y of [40, 72]) { g.fillStyle = '#e0b84e'; g.fillRect(14, y, 56, 4); }
        g.fillStyle = '#2a3a5a'; g.fillRect(30, 50, 24, 14); g.fillStyle = '#f6e2a0'; g.font = 'bold 9px system-ui'; g.textAlign = 'center'; g.fillText('H₂', 42, 61);
      }
    });
    case 'radar': return pic(84, 116, 42, 104, (_R, g) => {
      E(g, 42, 104, 26, 8, 'rgba(0,0,0,0.13)');
      g.fillStyle = '#d4d8e0'; g.fillRect(36, 60, 12, 44); g.fillStyle = '#f4f5f8'; g.fillRect(36, 60, 6, 44); E(g, 42, 104, 16, 5, '#c4cad4');
      g.save(); g.translate(42, 46); g.rotate(-0.45);
      const gr = g.createLinearGradient(-34, 0, 34, 0); gr.addColorStop(0, '#ffffff'); gr.addColorStop(1, '#c2c8d4');
      g.fillStyle = gr; g.beginPath(); g.ellipse(0, 0, 34, 20, 0, 0, Math.PI * 2); g.fill(); g.strokeStyle = '#e0b84e'; g.lineWidth = 2; g.stroke();
      g.fillStyle = '#dfe3ea'; g.beginPath(); g.ellipse(0, 2, 24, 13, 0, 0, Math.PI * 2); g.fill();
      g.strokeStyle = '#9aa2ae'; g.lineWidth = 1.4; g.beginPath(); g.moveTo(0, 2); g.lineTo(0, -22); g.stroke(); g.fillStyle = '#e8322a'; g.beginPath(); g.arc(0, -23, 2.2, 0, Math.PI * 2); g.fill();
      g.restore();
    });
    case 'padlight': return pic(14, 16, 7, 12, (_R, g) => {
      E(g, 7, 12, 5, 2, 'rgba(0,0,0,0.15)'); g.fillStyle = '#c9a23e'; g.fillRect(5, 6, 4, 6);
      const gl = g.createRadialGradient(7, 6, 0.5, 7, 6, 6); gl.addColorStop(0, '#fffbe0'); gl.addColorStop(1, 'rgba(255,230,150,0)'); g.fillStyle = gl; g.beginPath(); g.arc(7, 6, 6, 0, Math.PI * 2); g.fill();
    });
    case 'flag': return pic(40, 96, 6, 92, (_R, g) => {
      E(g, 6, 92, 5, 2, 'rgba(0,0,0,0.15)'); g.fillStyle = '#e0e2e8'; g.fillRect(5, 6, 2, 86); g.fillStyle = '#e8c24e'; g.beginPath(); g.arc(6, 5, 2.5, 0, Math.PI * 2); g.fill();
      const wv = v % 3;
      g.fillStyle = '#ffffff'; g.beginPath(); g.moveTo(7, 9); for (let x = 0; x <= 30; x += 3) g.lineTo(7 + x, 9 + Math.sin(x * 0.25 + wv) * 2); for (let x = 30; x >= 0; x -= 3) g.lineTo(7 + x, 29 + Math.sin(x * 0.25 + wv) * 2); g.closePath(); g.fill();
      g.strokeStyle = 'rgba(0,0,0,0.12)'; g.stroke();
      g.fillStyle = '#e0b84e'; g.beginPath(); g.moveTo(22, 19); for (let q = 0; q < 4; q++) g.lineTo(22 - 3 - q * 2, 15 + q * 2.5); g.lineTo(22, 22); for (let q = 3; q >= 0; q--) g.lineTo(22 + 3 + q * 2, 15 + q * 2.5); g.closePath(); g.fill();
    });
    case 'litter': return pic(44, 28, 22, 20, (_R, g) => {
      E(g, 22, 20, 16, 4, 'rgba(0,0,0,0.1)');
      const k = v % 6;
      if (k === 0) { g.fillStyle = '#1e1e1e'; g.fillRect(10, 10, 9, 10); g.fillStyle = '#c9a23e'; g.fillRect(10, 10, 9, 2); g.fillStyle = '#f2c8d4'; g.fillRect(24, 13, 9, 7); } // 쇼핑백 둘
      else if (k === 1) { g.fillStyle = '#e85a6a'; g.fillRect(12, 16, 8, 3); g.fillRect(18, 11, 2, 6); g.fillStyle = '#2a5a3a'; g.fillRect(26, 9, 3, 11); g.fillStyle = '#e0b84e'; g.fillRect(26, 7, 2, 2); } // 하이힐 · 샴페인 병
      else if (k === 2) { g.fillStyle = '#f28aa8'; g.fillRect(8, 9, 12, 10); g.fillStyle = '#ffffff'; g.fillRect(13, 9, 2, 10); g.fillRect(8, 13, 12, 2); g.fillStyle = '#8ac8f2'; g.fillRect(24, 12, 10, 8); g.fillStyle = '#c9a23e'; g.fillRect(28, 12, 2, 8); } // 뜯지 않은 선물 상자
      else if (k === 3) { g.fillStyle = '#1e1e24'; g.beginPath(); g.moveTo(6, 18); g.lineTo(30, 20); g.lineTo(38, 14); g.lineTo(14, 12); g.closePath(); g.fill(); g.fillStyle = '#2a3e5a'; g.beginPath(); g.moveTo(9, 17); g.lineTo(29, 18.6); g.lineTo(35, 14); g.lineTo(15, 12.6); g.closePath(); g.fill(); } // 엎어진 TV
      else if (k === 4) { g.fillStyle = '#fbfaf6'; g.fillRect(6, 12, 30, 7); g.fillStyle = '#e8e4dc'; g.fillRect(6, 12, 30, 2); for (let x = 8; x < 34; x += 4) { g.fillStyle = '#d8d4cc'; g.fillRect(x, 14, 1, 4); } } // 매트리스
      else { g.fillStyle = '#7a4a2a'; g.fillRect(10, 12, 10, 8); g.fillStyle = '#c89a5a'; g.fillRect(11, 13, 8, 1); g.strokeStyle = '#e0b84e'; g.beginPath(); g.ellipse(15, 12, 3, 3, 0, Math.PI, 0); g.stroke(); g.fillStyle = '#ffe07a'; for (let q = 0; q < 6; q++) g.fillRect(24 + q * 2, 17 - (q % 2), 2, 1); } // 가방 · 금 사슬
    });
    case 'garbagetruck': return pic(170, 120, 84, 102, (_R, g) => {
      E(g, 84, 102, 70, 14, 'rgba(0,0,0,0.14)');
      // 쿼터뷰 상자: 길이 방향 = +i (오른쪽 아래). 바닥 앞 모서리 (ox, oy)
      const S = (i: number, j: number, z: number): [number, number] => [30 + i * 1.6 - j * 1.6, 70 + i * 0.8 + j * 0.8 - z];
      const f = (pts: [number, number][], c: string) => { g.fillStyle = c; g.beginPath(); pts.forEach(([x, y], n) => (n ? g.lineTo(x, y) : g.moveTo(x, y))); g.closePath(); g.fill(); g.strokeStyle = 'rgba(0,0,0,0.22)'; g.lineWidth = 0.8; g.stroke(); };
      const bx = (i0: number, j0: number, i1: number, j1: number, z0: number, z1: number, top: string, left: string, right: string) => { f([S(i0, j1, z0), S(i1, j1, z0), S(i1, j1, z1), S(i0, j1, z1)], left); f([S(i1, j0, z0), S(i1, j1, z0), S(i1, j1, z1), S(i1, j0, z1)], right); f([S(i0, j0, z1), S(i1, j0, z1), S(i1, j1, z1), S(i0, j1, z1)], top); };
      // 바퀴
      for (const i of [8, 30, 40]) for (const j of [0, 18]) { const [x, y] = S(i, j + (j ? 0.5 : 0), 5); g.fillStyle = '#1e1e22'; g.beginPath(); g.ellipse(x, y, 5, 6, -0.5, 0, Math.PI * 2); g.fill(); g.fillStyle = '#c9c9c9'; g.beginPath(); g.ellipse(x, y, 2, 2.4, -0.5, 0, Math.PI * 2); g.fill(); }
      bx(0, 0, 46, 18, 6, 9, '#4a4a50', '#3a3a40', '#2e2e34'); // 차대
      bx(0, 1, 32, 17, 9, 38, '#f4f5f8', '#e2e4ea', '#c8ccd6'); // 압축 적재함 (흰색 · 금 띠)
      f([S(0, 17, 22), S(32, 17, 22), S(32, 17, 25), S(0, 17, 25)], '#e0b84e');
      bx(33, 2, 46, 16, 9, 30, '#f8f9fc', '#eceef2', '#d4d8e0'); // 운전석
      f([S(38, 16, 20), S(45, 16, 20), S(45, 16, 28), S(38, 16, 28)], '#8ab0d8'); f([S(46, 4, 20), S(46, 14, 20), S(46, 14, 28), S(46, 4, 28)], '#6a90b8');
      // 뒤쪽 뚜껑이 열리고 쏟아지는 더미
      f([S(-2, 1, 38), S(-2, 17, 38), S(-6, 17, 26), S(-6, 1, 26)], '#d8dbe2');
      const r = (k: number) => { const x = Math.sin(k * 77.7 + 3.3) * 43758.5; return x - Math.floor(x); };
      for (let q = 0; q < 18; q++) { const [x, y] = S(-10 - r(q) * 12, 2 + r(q + 30) * 14, 2 + r(q + 60) * 10); g.fillStyle = ['#f28aa8', '#8ac8f2', '#f2d27a', '#1e1e1e', '#ffffff', '#7a4a2a', '#e85a6a'][q % 7]; g.fillRect(Math.round(x) - 3, Math.round(y) - 3, 5 + (q % 3) * 2, 4 + (q % 2) * 2); }
      { const [x, y] = S(20, 17, 30); g.fillStyle = '#c9a23e'; g.font = 'bold 7px system-ui'; g.fillText('♲', x - 3, y); }
    });
    case 'grabber': return pic(200, 210, 96, 186, (_R, g) => {
      E(g, 96, 186, 70, 16, 'rgba(0,0,0,0.14)');
      // 무한궤도 · 몸통 · 운전석
      g.fillStyle = '#2a2a2e'; g.beginPath(); g.moveTo(40, 176); g.lineTo(136, 194); g.lineTo(156, 182); g.lineTo(60, 164); g.closePath(); g.fill();
      g.fillStyle = '#3a3a40'; g.beginPath(); g.moveTo(40, 176); g.lineTo(136, 194); g.lineTo(136, 186); g.lineTo(40, 168); g.closePath(); g.fill();
      for (let q = 0; q < 10; q++) { g.fillStyle = '#55555c'; g.fillRect(44 + q * 9.4, 170 + q * 1.8, 3, 6); }
      g.fillStyle = '#e8c24e'; g.beginPath(); g.moveTo(60, 160); g.lineTo(124, 172); g.lineTo(140, 160); g.lineTo(76, 148); g.closePath(); g.fill();
      g.fillStyle = '#c9a23e'; g.beginPath(); g.moveTo(60, 160); g.lineTo(124, 172); g.lineTo(124, 150); g.lineTo(60, 138); g.closePath(); g.fill();
      g.fillStyle = '#d9b44a'; g.beginPath(); g.moveTo(124, 172); g.lineTo(140, 160); g.lineTo(140, 138); g.lineTo(124, 150); g.closePath(); g.fill();
      g.fillStyle = '#f6dc8a'; g.beginPath(); g.moveTo(60, 138); g.lineTo(124, 150); g.lineTo(140, 138); g.lineTo(76, 126); g.closePath(); g.fill();
      g.fillStyle = '#efc848'; g.fillRect(96, 104, 30, 40); g.fillStyle = '#8ab0d8'; g.fillRect(100, 108, 22, 18); g.fillStyle = '#b8d4f0'; g.fillRect(100, 108, 22, 5); g.fillStyle = '#c9a23e'; g.fillRect(126, 104, 6, 40);
      // 붐 · 암 · 집게 (쓰레기를 집어 올린 채)
      g.strokeStyle = '#d9b44a'; g.lineCap = 'round'; g.lineWidth = 11; g.beginPath(); g.moveTo(92, 132); g.lineTo(60, 52); g.stroke();
      g.strokeStyle = '#efc848'; g.lineWidth = 8; g.beginPath(); g.moveTo(60, 52); g.lineTo(28, 96); g.stroke();
      g.strokeStyle = '#3a3a40'; g.lineWidth = 3; g.beginPath(); g.moveTo(84, 120); g.lineTo(64, 66); g.stroke();
      g.fillStyle = '#55555c'; g.beginPath(); g.arc(60, 52, 6, 0, Math.PI * 2); g.fill(); g.beginPath(); g.arc(28, 96, 5, 0, Math.PI * 2); g.fill();
      g.strokeStyle = '#4a4a50'; g.lineWidth = 3; for (let q = 0; q < 5; q++) { const a = -2.2 + q * 0.55; g.beginPath(); g.moveTo(28, 98); g.quadraticCurveTo(28 + Math.cos(a) * 16, 106 + Math.sin(a) * 4, 28 + Math.cos(a) * 12, 124); g.stroke(); }
      for (let q = 0; q < 9; q++) { g.fillStyle = ['#f28aa8', '#1e1e24', '#8ac8f2', '#f2d27a', '#7a4a2a', '#ffffff'][q % 6]; g.fillRect(18 + (q * 7) % 20, 108 + (q * 5) % 12, 6, 5); }
      g.fillStyle = 'rgba(255,255,255,0.55)'; for (let q = 0; q < 4; q++) g.fillRect(22 + q * 5, 128 + q * 6, 2, 2); // 떨어지는 부스러기
    });
    case 'chicken': return pic(24, 24, 12, 21, (R, g) => {
      // 47차 천국의 닭 한 마리: 흰 몸 · 붉은 볏 · 노란 부리와 다리 (v 1 = 모이 쪼기)
      E(g, 12, 21, 7, 2, 'rgba(0,0,0,0.15)');
      const dn = v % 2 ? 3 : 0;
      R(9, 17, 1, 4, '#e0a83a'); R(13, 17, 1, 4, '#e0a83a'); R(8, 20, 3, 1, '#e0a83a'); R(12, 20, 3, 1, '#e0a83a');
      E(g, 11, 13, 6, 5, '#fbfaf6'); E(g, 9, 14, 4, 3, '#ece8e0'); R(4, 9, 3, 5, '#f4f2ee'); R(3, 8, 2, 3, '#ffffff'); // 몸 · 날개 · 꼬리
      E(g, 16, 8 + dn, 3, 3, '#fbfaf6'); R(15, 4 + dn, 3, 2, '#e8322a'); R(16, 3 + dn, 1, 1, '#e8322a'); R(19, 8 + dn, 2, 1, '#f2b23a'); R(16, 10 + dn, 2, 2, '#e8322a'); R(17, 7 + dn, 1, 1, '#1e1a16');
    });
    // 52차 후속: 식당 · 카페 앞 바깥 자리 (흰 대리석 둥근 탁자 · 금빛 의자 넷 · 찻주전자) — 쿼터뷰 입체
    case 'hcafe': return pic(72, 52, 36, 38, (_R, g) => drawTableSet(g, 36, 38, 'heaven', v));
    // 52차 후속: 천사가 끄는 흰 수레 (o = 종류 × 2 + 방향 · 종류 0 만나 빵 · 1 솜구름 사탕 · 2 생명 과일)
    case 'hcart': return pic(72, 80, 36, 62, (_R, g) => drawCart(g, 36, 62, (o & 1) as 0 | 1, 'heaven', HCART_GOODS[(o >> 1) % 3], v));
    // 53차 택시 천사 정류장: 금빛 기둥(둥근 그늘) · 흰 둥근 표지판(날개 · 금테 · 기울어진 두께) · 받침
    case 'taxistand': return pic(40, 96, 20, 90, (_R, g) => {
      E(g, 20, 90, 11, 4, 'rgba(0,0,0,0.14)');
      E(g, 20, 89, 7, 3, '#b8902e'); E(g, 20, 88, 6, 2.5, '#d9b04a');
      const pole = g.createLinearGradient(17, 0, 23, 0); pole.addColorStop(0, '#f6dc8a'); pole.addColorStop(0.5, '#d9b04a'); pole.addColorStop(1, '#8a661c');
      g.fillStyle = pole; g.fillRect(18, 28, 4, 60);
      g.fillStyle = '#c9a23e'; g.beginPath(); g.ellipse(21.5, 20, 15, 14, 0, 0, Math.PI * 2); g.fill(); // 두께 (뒤로 비껴 보이는 테)
      g.fillStyle = '#e8c86a'; g.beginPath(); g.ellipse(20, 20, 15, 14, 0, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#fffcf2'; g.beginPath(); g.ellipse(20, 20, 12.5, 11.5, 0, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#34445e'; g.beginPath(); g.moveTo(8.5, 23); g.quadraticCurveTo(10, 11, 20, 10); g.quadraticCurveTo(15, 15, 17, 16); g.quadraticCurveTo(12, 18, 15, 20); g.quadraticCurveTo(11, 21, 8.5, 23); g.fill();
      g.beginPath(); g.moveTo(31.5, 23); g.quadraticCurveTo(30, 11, 20, 10); g.quadraticCurveTo(25, 15, 23, 16); g.quadraticCurveTo(28, 18, 25, 20); g.quadraticCurveTo(29, 21, 31.5, 23); g.fill();
      g.fillStyle = '#d9b04a'; g.beginPath(); g.arc(20, 25, 2.5, 0, Math.PI * 2); g.fill();
      g.fillStyle = 'rgba(255,255,255,0.55)'; g.beginPath(); g.ellipse(15, 15, 4, 2, -0.6, 0, Math.PI * 2); g.fill();
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
