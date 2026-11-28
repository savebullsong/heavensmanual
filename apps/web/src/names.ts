// 거리 가게: OpenStreetMap 에 실제로 있는 가게의 업종과 이름을 쓴다.
// 체인점(브랜드)은 이름을 숨기고 업종만 적는다 (편의점·카페·은행…). 이름 없는 가게도 업종만.
import type { Building } from './zone.ts';
import type { Lang } from './i18n.ts';

export interface Poi { t: string; n?: string; nth?: string; nen?: string; nko?: string; b?: 1
  /** 음식점·카페 메뉴 묶음 (지도의 cuisine) */
  c?: string;
}
type B = Building & { pois?: Poi[] };

// 업종 [한국어, 태국어, 영어]
const TYPES: Record<string, [string, string, string]> = {
  convenience: ['편의점', 'ร้านสะดวกซื้อ', 'Convenience store'], supermarket: ['슈퍼마켓', 'ซูเปอร์มาร์เก็ต', 'Supermarket'],
  massage: ['마사지', 'ร้านนวด', 'Massage'], hairdresser: ['미용실', 'ร้านทำผม', 'Hair salon'], beauty: ['네일·뷰티', 'ร้านเสริมสวย', 'Beauty salon'],
  tailor: ['양복점', 'ร้านตัดสูท', 'Tailor'], clothes: ['옷가게', 'ร้านเสื้อผ้า', 'Clothing store'], laundry: ['세탁소', 'ร้านซักรีด', 'Laundry'],
  mall: ['쇼핑몰', 'ห้างสรรพสินค้า', 'Shopping mall'], department_store: ['백화점', 'ห้างสรรพสินค้า', 'Department store'],
  bakery: ['빵집', 'ร้านเบเกอรี่', 'Bakery'], optician: ['안경점', 'ร้านแว่นตา', 'Optician'], books: ['서점', 'ร้านหนังสือ', 'Bookstore'],
  gift: ['기념품 가게', 'ร้านของฝาก', 'Gift shop'], shoes: ['신발 가게', 'ร้านรองเท้า', 'Shoe store'], computer: ['컴퓨터 가게', 'ร้านคอมพิวเตอร์', 'Computer shop'],
  mobile_phone: ['휴대폰 가게', 'ร้านมือถือ', 'Phone shop'], electronics: ['전자제품 가게', 'ร้านเครื่องใช้ไฟฟ้า', 'Electronics'],
  hardware: ['철물점', 'ร้านวัสดุก่อสร้าง', 'Hardware store'], travel_agency: ['여행사', 'บริษัทนำเที่ยว', 'Travel agency'],
  cannabis: ['대마 판매점', 'ร้านกัญชา', 'Cannabis shop'], chemist: ['드러그스토어', 'ร้านขายยาและเครื่องสำอาง', 'Drugstore'],
  jewelry: ['보석상', 'ร้านเพชรพลอย', 'Jeweller'], florist: ['꽃집', 'ร้านดอกไม้', 'Florist'], furniture: ['가구점', 'ร้านเฟอร์นิเจอร์', 'Furniture store'], residence: ['분양 중', 'เปิดขาย', 'Now selling'], ownedhome: ['내 집', 'บ้านของฉัน', 'My home'],
  alcohol: ['주류 판매점', 'ร้านขายเหล้า', 'Liquor store'], butcher: ['정육점', 'ร้านขายเนื้อ', 'Butcher'], greengrocer: ['청과물 가게', 'ร้านผักผลไม้', 'Greengrocer'],
  car_repair: ['자동차 정비소', 'อู่ซ่อมรถ', 'Car repair'], motorcycle: ['오토바이 가게', 'ร้านมอเตอร์ไซค์', 'Motorbike shop'], motorcycle_repair: ['오토바이 정비소', 'ร้านซ่อมมอเตอร์ไซค์', 'Motorbike repair'],
  bicycle: ['자전거 가게', 'ร้านจักรยาน', 'Bicycle shop'], tattoo: ['타투숍', 'ร้านสัก', 'Tattoo studio'], pet: ['애견숍', 'ร้านสัตว์เลี้ยง', 'Pet shop'],
  sports: ['스포츠용품점', 'ร้านกีฬา', 'Sports shop'], stationery: ['문구점', 'ร้านเครื่องเขียน', 'Stationery'], tobacco: ['담배 가게', 'ร้านยาสูบ', 'Tobacconist'],
  variety_store: ['잡화점', 'ร้านขายของเบ็ดเตล็ด', 'Variety store'], kiosk: ['매점', 'ซุ้มขายของ', 'Kiosk'], coffee: ['원두 가게', 'ร้านเมล็ดกาแฟ', 'Coffee roaster'],
  tea: ['찻집', 'ร้านชา', 'Tea shop'], cosmetics: ['화장품 가게', 'ร้านเครื่องสำอาง', 'Cosmetics'], bag: ['가방 가게', 'ร้านกระเป๋า', 'Bag shop'],
  watches: ['시계점', 'ร้านนาฬิกา', 'Watch shop'], photo: ['사진관', 'ร้านถ่ายรูป', 'Photo studio'], copyshop: ['복사집', 'ร้านถ่ายเอกสาร', 'Copy shop'],
  second_hand: ['중고품 가게', 'ร้านของมือสอง', 'Second-hand shop'], toys: ['장난감 가게', 'ร้านของเล่น', 'Toy shop'], art: ['화랑', 'แกลเลอรี', 'Art gallery'],
  shop: ['철물점', 'ร้านวัสดุก่อสร้าง', 'Hardware store'], // 27차: 간판 없는 가게는 공구·농기구를 판다 · 30차: 이름도 철물점 (닳은 장비를 고쳐 준다)
  restaurant: ['식당', 'ร้านอาหาร', 'Restaurant'], fast_food: ['패스트푸드', 'ฟาสต์ฟู้ด', 'Fast food'], food_court: ['푸드코트', 'ศูนย์อาหาร', 'Food court'],
  cafe: ['카페', 'คาเฟ่', 'Café'], bar: ['바', 'บาร์', 'Bar'], pub: ['펍', 'ผับ', 'Pub'], nightclub: ['클럽', 'ไนต์คลับ', 'Nightclub'],
  ice_cream: ['아이스크림 가게', 'ร้านไอศกรีม', 'Ice cream'], internet_cafe: ['PC방', 'ร้านอินเทอร์เน็ต', 'Internet café'],
  bank: ['은행', 'ธนาคาร', 'Bank'], bureau_de_change: ['환전소', 'ร้านแลกเงิน', 'Money exchange'],
  pharmacy: ['약국', 'ร้านขายยา', 'Pharmacy'], clinic: ['의원', 'คลินิก', 'Clinic'], dentist: ['치과', 'คลินิกทันตกรรม', 'Dentist'], hospital: ['병원', 'โรงพยาบาล', 'Hospital'],
  veterinary: ['동물병원', 'คลินิกสัตว์', 'Vet'],
  school: ['학교', 'โรงเรียน', 'School'], kindergarten: ['유치원', 'โรงเรียนอนุบาล', 'Kindergarten'], library: ['도서관', 'ห้องสมุด', 'Library'],
  place_of_worship: ['사원', 'ศาสนสถาน', 'Place of worship'], cinema: ['영화관', 'โรงภาพยนตร์', 'Cinema'], theatre: ['극장', 'โรงละคร', 'Theatre'],
  marketplace: ['시장', 'ตลาด', 'Market'], fuel: ['주유소', 'ปั๊มน้ำมัน', 'Gas station'], car_wash: ['세차장', 'คาร์แคร์', 'Car wash'],
  coworking_space: ['공유 오피스', 'โคเวิร์กกิ้งสเปซ', 'Coworking'], post_office: ['우체국', 'ไปรษณีย์', 'Post office'],
  karaoke: ['노래방', 'คาราโอเกะ', 'Karaoke'], academy: ['학원', 'สถาบันกวดวิชา', 'Cram school'], home: ['집', 'บ้าน', 'Home'],
  hotel: ['호텔', 'โรงแรม', 'Hotel'], hostel: ['호스텔', 'โฮสเทล', 'Hostel'], guest_house: ['게스트하우스', 'เกสต์เฮาส์', 'Guesthouse'],
  apartment_hotel: ['서비스 아파트', 'เซอร์วิสอพาร์ตเมนต์', 'Serviced apartment'], fitness_centre: ['헬스장', 'ฟิตเนส', 'Gym'],
};
const LI: Record<Lang, number> = { ko: 0, th: 1, en: 2 };

export function typeLabel(t: string, l: Lang): string {
  return (TYPES[t] ?? TYPES.shop)[LI[l]];
}
export function mainPoi(b: Building): Poi | null {
  return (b as B).pois?.[0] ?? null;
}
/** 건물의 업종 (가게가 없으면 지도 분류) */
export function kindOf(b: Building): string {
  return mainPoi(b)?.t ?? b.cat;
}
const thai = /[฀-๿]/;
/** 가게 이름: 체인점이나 이름 없는 가게는 업종 이름 */
export function poiName(p: Poi, l: Lang): string {
  if (p.b || !p.n) return typeLabel(p.t, l);
  if (l === 'th') return p.nth ?? p.n;
  if (l === 'ko') return p.nko ?? (thai.test(p.n) ? p.nen ?? p.n : p.n);
  return p.nen ?? (thai.test(p.n) && p.nen ? p.nen : p.n);
}
/** 누를 수 있는 건물인가 (가게가 있거나 우주새) */
export function interactive(b: Building) {
  return b.cat === 'ujusae' || !!mainPoi(b);
}
/** 간판·이름표에 쓰는 이름 (누를 수 없는 건물은 빈칸) */
export function buildingName(b: Building, l: Lang): string {
  const p = mainPoi(b);
  return p ? poiName(p, l) : '';
}
/** 이름표 아랫줄: 업종 (이름이 곧 업종이면 비운다 — 같은 말을 두 번 쓰지 않는다) */
export function buildingSub(b: Building, l: Lang): string {
  const p = mainPoi(b);
  if (!p) return '';
  const name = poiName(p, l), label = typeLabel(p.t, l);
  const extra = ((b as B).pois?.length ?? 1) - 1;
  return [name === label ? '' : label, extra > 0 ? `+${extra}` : ''].filter(Boolean).join(' · ');
}

/** 일할 수 있는 업종 (시급은 방콕 최저임금) */
const NO_WORK = new Set(['place_of_worship', 'school', 'kindergarten', 'library', 'post_office']);
export function canWork(b: Building) {
  // 43차: 내 집(서울 옛집 · 산 집)과 유내 미용실에서는 일하지 않는다
  if (b.cat === 'home' || b.cat === 'estate' || (b as { yunae?: boolean }).yunae) return false;
  const p = mainPoi(b);
  return !!p && !NO_WORK.has(p.t) && !!b.sign;
}

/** 그 가게의 메뉴 묶음 (먹을 것을 파는 첫 가게의 cuisine) */
export function cuisineOf(b: Building): string | undefined {
  const k = storeOf(b);
  if (k !== 'food' && k !== 'cafe') return undefined;
  const FOOD = ['restaurant', 'fast_food', 'food_court', 'marketplace'], CAFE = ['cafe', 'bakery', 'coffee', 'tea', 'ice_cream'];
  return ((b as B).pois ?? []).find((p) => (k === 'food' ? FOOD : CAFE).includes(p.t))?.c;
}

// 46차 서울 은행 간판: 체인 은행(이름을 숨긴 은행)과 이름 없는 은행에 이 세상에 없는 은행 이름을 단다 (실제 상표는 쓰지 않는다)
const SEOUL_BANKS: [string, string, string][] = [
  ['미리내은행', 'ธนาคารมีรีแน', 'Mirinae Bank'], ['가람은행', 'ธนาคารการัม', 'Garam Bank'], ['새날은행', 'ธนาคารแซนัล', 'Saenal Bank'],
  ['다온은행', 'ธนาคารดาออน', 'Daon Bank'], ['누리은행', 'ธนาคารนูรี', 'Nuri Bank'], ['온새미은행', 'ธนาคารออนแซมี', 'Onsaemi Bank'],
];
export function nameSeoulBanks(z: { city?: string; buildings: Building[] }, walk: (i: number, j: number) => boolean) {
  if (z.city !== 'seoul') return;
  for (const b of z.buildings) {
    // 간판이 없던 은행: 걸어서 닿는 앞면(+j 면 → +i 면)에 간판을 단다
    if (!b.sign && mainPoi(b)?.t === 'bank') {
      const okL = [0, 1, -1].some((d) => walk(b.i0 + Math.floor(b.w / 2) + d, b.j0 + b.d));
      const okR = [0, 1, -1].some((d) => walk(b.i0 + b.w, b.j0 + Math.floor(b.d / 2) + d));
      if (okL || okR) b.sign = okL ? 'left' : 'right';
    }
  }
  for (const b of z.buildings) for (const p of (b as B).pois ?? []) {
    if (p.t !== 'bank' || (p.n && !p.b)) continue;
    const [ko, th, en] = SEOUL_BANKS[(((b.i0 * 73856093) ^ (b.j0 * 19349663)) >>> 0) % SEOUL_BANKS.length];
    p.n = ko; p.nko = ko; p.nth = th; p.nen = en; delete p.b;
  }
}
/**
 * 52차 우체국: 기원 편지의 답장을 받는 곳 (현실 · 천국에만 — 지옥의 죄인은 답장을 받을 자격이 없다).
 * 방콕 아속은 지도 자료의 우체국 건물, 서울 강남은 정문 가까운 길가 건물 하나. 이름은 동네 이름만 (실제 기관명은 쓰지 않는다)
 */
export function designatePost(z: { id: string; city?: string; buildings: Building[]; door: { i: number; j: number } }, walk: (i: number, j: number) => boolean) {
  const bs = z.buildings as B[];
  let b = bs.find((x) => (x.pois ?? []).some((p) => p.t === 'post_office'));
  let nm: [string, string, string] = ['아속 우체국', 'ไปรษณีย์อโศก', 'Asok Post Office'];
  if (!b && z.id === 'seoul-gangnam') {
    const cands = bs.filter((x) => x.sign && ['generic', 'office', 'shop'].includes(x.cat) && x.w >= 4 && x.d >= 4 && x.w <= 12 && x.d <= 12 && !(x as { landmark?: unknown }).landmark)
      .sort((a, c) => Math.hypot(a.i0 - z.door.i, a.j0 - z.door.j) - Math.hypot(c.i0 - z.door.i, c.j0 - z.door.j));
    b = cands[2] ?? cands[0];
    nm = ['강남 우체국', 'ไปรษณีย์คังนัม', 'Gangnam Post Office'];
  }
  if (!b) return;
  b.cat = 'post';
  b.pois = [{ t: 'post_office', n: nm[2], nko: nm[0], nth: nm[1], nen: nm[2] } as unknown as Poi];
  if (!b.sign) { const okL = [0, 1, -1].some((d) => walk(b!.i0 + Math.floor(b!.w / 2) + d, b!.j0 + b!.d)); b.sign = okL ? 'left' : 'right'; }
}
/** 46차: 건물에 든 은행의 이름 (은행이 대표 가게가 아니어도 — 호텔 1층 은행 같은) */
export function bankName(b: Building, l: Lang): string {
  const p = ((b as B).pois ?? []).find((q) => q.t === 'bank');
  return p ? poiName(p, l) : '';
}
/** 은행이 들어 있는 건물 (저금·찾기) */
export function hasBank(b: Building) {
  return ((b as B).pois ?? []).some((p) => p.t === 'bank');
}

/** 물건을 살 수 있는 가게 */
export type StoreKind = 'mart' | 'pharmacy' | 'food' | 'cafe';
export function storeOf(b: Building): StoreKind | null {
  // 32차: 대표 가게(첫 POI)만 — 미용실 건물 2층 식당 때문에 미용실 문에서 음식을 팔던 문제
  const main = mainPoi(b);
  for (const p of main ? [main] : []) {
    if (['convenience', 'supermarket', 'kiosk', 'variety_store'].includes(p.t)) return 'mart';
    if (['pharmacy', 'chemist'].includes(p.t)) return 'pharmacy';
    if (['restaurant', 'fast_food', 'food_court', 'marketplace'].includes(p.t)) return 'food';
    if (['cafe', 'bakery', 'coffee', 'tea', 'ice_cream'].includes(p.t)) return 'cafe';
  }
  return null;
}

/**
 * 47차 → 48차 명소 건물: 터미널 21은 표지판 둘레의 가장 큰 건물.
 * 프롬퐁(사용자: '북쪽 엠쿼티어, 남쪽 엠포리움 — 나나 플라자에서 여기까지가 가장 붐비는 번화가')은
 * 지도 자료가 10칸씩 잘게 쪼갠 덩어리를 실제 건물 하나로 합친다 (전체 지도 칸 기준)
 */
const MALLS: { key: 'emquartier' | 'emqtower' | 'emporium'; i0: number; j0: number; w: number; d: number; poi: { t: string; n: string; nth: string } }[] = [
  { key: 'emqtower', i0: 926, j0: 464, w: 40, d: 20, poi: { t: 'mall', n: 'EmQuartier', nth: 'เอ็มควอเทียร์' } }, // 뒤 동 · 헬릭스
  { key: 'emquartier', i0: 926, j0: 484, w: 20, d: 10, poi: { t: 'mall', n: 'EmQuartier', nth: 'เอ็มควอเทียร์' } }, // 앞 동 · 큰 화면
  { key: 'emporium', i0: 924, j0: 508, w: 30, d: 20, poi: { t: 'department_store', n: 'Emporium', nth: 'เอ็มโพเรียม' } }, // 대로 남쪽 · 엠쿼티어 맞은편
];
export function tagLandmarks(z: { W: number; H: number; buildings: Building[]; blocked?: Uint8Array; tiles?: Uint8Array; origin?: { i: number; j: number }; city?: string }, marks: { key: string; i: number; j: number }[]) {
  if (z.city === 'seoul') return;
  const o = z.origin ?? { i: 0, j: 0 };
  for (const m of MALLS) {
    const i0 = m.i0 - o.i, j0 = m.j0 - o.j, i1 = i0 + m.w, j1 = j0 + m.d;
    if (i1 <= 0 || j1 <= 0 || i0 >= z.W || j0 >= z.H) continue;
    const parts = z.buildings.filter((b) => { const cx = b.i0 + b.w / 2, cy = b.j0 + b.d / 2; return cx >= i0 && cx < i1 && cy >= j0 && cy < j1 && b.cat !== 'ujusae' && b.cat !== 'home' && b.cat !== 'estate'; });
    if (!parts.length) continue;
    const pois = [m.poi, ...parts.flatMap((b) => ((b as B).pois ?? []).filter((p) => p.n !== m.poi.n && !/EmQuartier|Emporium/i.test(p.n ?? '')))];
    const mall = { i0, j0, w: m.w, d: m.d, h: Math.max(...parts.map((b) => b.h)), cat: 'shop', color: parts[0].color, pois, lmk: m.key } as unknown as Building;
    z.buildings = z.buildings.filter((b) => !parts.includes(b));
    z.buildings.push(mall);
    if (z.blocked) for (let j = Math.max(0, j0); j < Math.min(z.H, j1); j++) for (let i = Math.max(0, i0); i < Math.min(z.W, i1); i++) z.blocked[j * z.W + i] = 1;
  }
  for (const m of marks) {
    if (m.key !== 't21') continue;
    const li = m.i - o.i, lj = m.j - o.j;
    let best: Building | null = null, area = 0;
    for (const b of z.buildings) {
      const cx = b.i0 + b.w / 2, cy = b.j0 + b.d / 2;
      if (Math.hypot(cx - li, cy - lj) > 14 || b.cat === 'home' || b.cat === 'estate' || b.cat === 'ujusae') continue;
      if (b.w * b.d > area) { area = b.w * b.d; best = b; }
    }
    if (best && area >= 16 && !(best as Building & { lmk?: string }).lmk) (best as Building & { lmk?: string }).lmk = m.key;
  }
}
