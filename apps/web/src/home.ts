// 35차 내 집: 방콕 아속의 콘도(฿1,200,000) · 서울 역삼의 아파트(₩3,500,000,000) — 사면 들어가 쉴 수 있는 방이 된다.
// 가구점에서 산 가구는 따로 들고 다니지 않고, 가지고 있는 집에 저절로 놓인다 (같은 자리의 가구는 가장 좋은 것 하나만).
// 통장과 같이, 집과 가구는 다음 생에도 남는다 (영혼 앞으로 된 등기).
import type { Zone, Building, Furn } from './zone.ts';
import { walkable, tileAt } from './zone.ts';
import type { Lang } from './i18n.ts';

export type EstateCity = 'bkk' | 'seoul';
/** 집값 (바트 셈 · 서울은 ₩1 = ฿1/40 이라 ₩3,500,000,000 = ฿87,500,000) */
export const HOME_PRICE: Record<EstateCity, number> = { bkk: 1_200_000, seoul: 87_500_000 };

type Slot = 'bed' | 'sofa' | 'tv' | 'table' | 'fridge' | 'washer' | 'shelf' | 'wardrobe' | 'mirror' | 'lamp' | 'rug' | 'plant' | 'treadmill' | 'safe' | 'lowtable' | 'punchbag';
export interface FurnDef { key: string; slot: Slot; tier: number; price: number; name: Record<Lang, string> }
const N = (ko: string, th: string, en: string) => ({ ko, th, en });
export const FURN: FurnDef[] = [
  { key: 'mattress', slot: 'bed', tier: 1, price: 4500, name: N('바닥 매트리스', 'ที่นอนปูพื้น', 'Floor mattress') },
  { key: 'queenbed', slot: 'bed', tier: 2, price: 28000, name: N('퀸 침대', 'เตียงควีนไซซ์', 'Queen bed') },
  { key: 'kingbed', slot: 'bed', tier: 3, price: 190000, name: N('킹사이즈 호텔 침대', 'เตียงคิงไซซ์แบบโรงแรม', 'Hotel king bed') },
  { key: 'sofa2', slot: 'sofa', tier: 1, price: 12000, name: N('2인 패브릭 소파', 'โซฟาผ้า 2 ที่นั่ง', 'Two-seat fabric sofa') },
  { key: 'leathersofa', slot: 'sofa', tier: 2, price: 95000, name: N('이탈리아 가죽 소파', 'โซฟาหนังอิตาลี', 'Italian leather sofa') },
  { key: 'tv43', slot: 'tv', tier: 1, price: 14000, name: N('43인치 TV', 'ทีวี 43 นิ้ว', '43-inch TV') },
  { key: 'tv85', slot: 'tv', tier: 2, price: 165000, name: N('85인치 OLED TV', 'ทีวี OLED 85 นิ้ว', '85-inch OLED TV') },
  { key: 'woodtable', slot: 'table', tier: 1, price: 9000, name: N('원목 식탁 세트', 'ชุดโต๊ะอาหารไม้', 'Wooden dining set') },
  { key: 'marbletable', slot: 'table', tier: 2, price: 72000, name: N('대리석 식탁 세트', 'ชุดโต๊ะอาหารหินอ่อน', 'Marble dining set') },
  { key: 'lowtable', slot: 'lowtable', tier: 1, price: 6500, name: N('유리 거실 탁자', 'โต๊ะกลางกระจก', 'Glass coffee table') },
  { key: 'fridge', slot: 'fridge', tier: 1, price: 32000, name: N('양문형 냉장고', 'ตู้เย็นสองประตู', 'Double-door fridge') },
  { key: 'washer', slot: 'washer', tier: 1, price: 16000, name: N('드럼 세탁기', 'เครื่องซักผ้าฝาหน้า', 'Front-load washer') },
  { key: 'bookshelf', slot: 'shelf', tier: 1, price: 7500, name: N('원목 책장', 'ชั้นหนังสือไม้', 'Wooden bookshelf') },
  { key: 'wardrobe', slot: 'wardrobe', tier: 1, price: 15000, name: N('붙박이 옷장', 'ตู้เสื้อผ้า', 'Wardrobe') },
  { key: 'mirror', slot: 'mirror', tier: 1, price: 2800, name: N('전신 거울', 'กระจกเต็มตัว', 'Full-length mirror') },
  { key: 'floorlamp', slot: 'lamp', tier: 1, price: 3500, name: N('플로어 스탠드', 'โคมไฟตั้งพื้น', 'Floor lamp') },
  { key: 'persianrug', slot: 'rug', tier: 1, price: 48000, name: N('페르시안 러그', 'พรมเปอร์เซีย', 'Persian rug') },
  { key: 'monstera', slot: 'plant', tier: 1, price: 1200, name: N('몬스테라 화분 두 개', 'กระถางมอนสเตอร่า 2 ใบ', 'Two monstera pots') },
  { key: 'treadmill', slot: 'treadmill', tier: 1, price: 45000, name: N('러닝머신', 'ลู่วิ่ง', 'Treadmill') },
  { key: 'punchbag', slot: 'punchbag', tier: 1, price: 6000, name: N('샌드백', 'กระสอบทราย', 'Punching bag') },
  { key: 'safe', slot: 'safe', tier: 1, price: 95000, name: N('대형 금고', 'ตู้เซฟขนาดใหญ่', 'Large safe') },
];
export const furnByKey = (k: string) => FURN.find((f) => f.key === k);

/** 방(W×H) 안의 자리마다 가구 한 점 — [i, j, w, d, 높이px, 그림 종류, 변형] (뒤 두 벽은 i=0 · j=0, 나가는 문은 앞 가운데) */
function spotOf(f: FurnDef, W: number, H: number): [number, number, number, number, number, string, number][] {
  const x1 = W - 2, y1 = H - 2;
  switch (f.slot) {
    case 'bed': return [[W - 4, 1, 2, 3, f.tier === 1 ? 4 : 16, f.tier === 1 ? 'futon' : f.tier === 3 ? 'kbed' : 'vbed', 0]];
    case 'sofa': return [[4, 5, 1, 3, 14, 'homesofa', f.tier === 2 ? 1 : 0]];
    case 'rug': return [[2, 5, 3, 3, 1, 'rug', 3]];
    case 'lowtable': return [[3, 6, 1, 1, 12, 'ctable', 0]];
    case 'tv': return [[1, 5, 1, 3, f.tier === 2 ? 30 : 24, 'flattv', f.tier === 2 ? 2 : 0]];
    case 'table': return [[6, 3, 2, 1, 16, f.tier === 2 ? 'mtable' : 'table', 1], [6, 4, 1, 1, 12, 'chair', 0], [7, 4, 1, 1, 12, 'chair', 1]];
    case 'fridge': return [[4, 1, 1, 1, 56, 'fridge', 0]];
    case 'washer': return [[5, 1, 1, 1, 24, 'washer', 0]];
    case 'shelf': return [[6, 1, 2, 1, 50, 'shelf', 9]];
    case 'wardrobe': return [[x1, 5, 1, 2, 58, 'wardrobe', 0]];
    case 'mirror': return [[x1, 4, 1, 1, 46, 'mirror', 0]];
    case 'lamp': return [[1, 4, 1, 1, 48, 'lamp', 0]];
    case 'plant': return [[x1, y1 - 1, 1, 1, 12, 'plant', 0], [1, y1 - 1, 1, 1, 12, 'plant', 1]];
    case 'treadmill': return [[W - 6, y1 - 2, 2, 1, 26, 'treadmill', 0]];
    case 'punchbag': return [[W - 4, 5, 1, 1, 60, 'punchbag', 0]];
    case 'safe': return [[x1, 7, 1, 1, 26, 'safe', 0]];
  }
}
/** 가진 가구 중 자리마다 가장 좋은 것 */
export function bestFurn(owned: string[]): FurnDef[] {
  const best = new Map<Slot, FurnDef>();
  for (const k of owned) { const f = furnByKey(k); if (f && (best.get(f.slot)?.tier ?? 0) < f.tier) best.set(f.slot, f); }
  return [...best.values()];
}
/** 내 집 방에 가구를 놓는다 (붙박이 주방은 처음부터 있다) */
export function furnishHome(owned: string[], W: number, H: number, put: (i: number, j: number, w: number, d: number, h: number, kind: string, v?: number) => void) {
  put(1, 1, 3, 1, 24, 'kitchen', 0);
  for (const f of bestFurn(owned)) for (const s of spotOf(f, W, H)) put(...s);
}
/** 가구점 진열: 크고 눈에 띄는 것 몇 점 */
export function furnishShowroom(W: number, H: number, put: (i: number, j: number, w: number, d: number, h: number, kind: string, v?: number) => void) {
  const y1 = H - 2;
  put(1, 1, 2, 3, 16, 'kbed'); put(4, 1, 2, 1, 50, 'shelf', 9); put(1, 5, 1, 3, 24, 'flattv', 2); put(4, 5, 1, 3, 14, 'homesofa', 1); put(3, 6, 1, 1, 12, 'ctable');
  put(2, 5, 3, 3, 1, 'rug', 3); put(5, 7, 1, 1, 48, 'lamp'); put(W - 2, y1, 1, 1, 12, 'plant'); put(W - 2, 5, 1, 2, 58, 'wardrobe');
  put(6, 4, 2, 1, 16, 'table', 7); put(6, 5, 1, 1, 12, 'chair'); put(7, 5, 1, 1, 12, 'chair', 1);
}

// ───────────────────────── 거리에 집과 가구점을 정한다 ─────────────────────────
type Nm = { n: string; nko: string; nth: string; nen: string };
const NAMES: Record<EstateCity, { home: Nm; furn: Nm; tools: Nm }> = {
  bkk: { home: { n: 'The Asok Residence', nko: '더 아속 레지던스', nth: 'ดิ อโศก เรสซิเดนซ์', nen: 'The Asok Residence' }, furn: { n: 'Baan Living', nko: '반 리빙 가구', nth: 'บ้านลิฟวิ่ง', nen: 'Baan Living Furniture' }, tools: { n: 'Sin Thai Hardware', nko: '신타이 철물점', nth: 'สินไทย ฮาร์ดแวร์', nen: 'Sin Thai Hardware' } },
  seoul: { home: { n: 'Yeoksam Central Heights', nko: '역삼 센트럴 하이츠', nth: 'ยอกซัม เซ็นทรัล ไฮทส์', nen: 'Yeoksam Central Heights' }, furn: { n: 'Nonhyeon Living', nko: '논현 리빙 가구', nth: 'นนฮยอน ลิฟวิ่ง', nen: 'Nonhyeon Living Furniture' }, tools: { n: 'Yeoksam Hardware', nko: '역삼 철물점', nth: 'ร้านฮาร์ดแวร์ยอกซัม', nen: 'Yeoksam Hardware' } },
};
/** 건물 앞(간판 면)에 걸어 설 수 있는 칸이 있으면 그 면 */
function openFace(z: Zone, b: Building): 'left' | 'right' | null {
  const okL = walkable(z, b.i0 + Math.floor(b.w / 2), b.j0 + b.d) || walkable(z, b.i0 + Math.floor(b.w / 2), b.j0 + b.d + 1);
  const okR = walkable(z, b.i0 + b.w, b.j0 + Math.floor(b.d / 2)) || walkable(z, b.i0 + b.w + 1, b.j0 + Math.floor(b.d / 2));
  return okL ? 'left' : okR ? 'right' : null;
}
/**
 * 우주새 문 가까이의 이름 없는 건물 둘을 고른다 (늘 같은 건물): 큰 건물 하나는 분양 중인 내 집, 작은 건물 하나는 가구점.
 * 아속(bkk-asok)과 강남(seoul-gangnam)에만
 */
export function designateHomes(z: Zone) {
  const city: EstateCity | null = z.id === 'bkk-asok' ? 'bkk' : z.id === 'seoul-gangnam' ? 'seoul' : null;
  if (!city || z.buildings.some((b) => b.cat === 'estate')) return;
  const d0 = z.door;
  type B = Building & { pois?: { t: string; n?: string; nko?: string; nth?: string; nen?: string }[]; estate?: EstateCity };
  const free = (z.buildings as B[]).map((b, k) => ({ b, k, dist: Math.hypot(b.i0 + b.w / 2 - d0.i, b.j0 + b.d / 2 - d0.j), face: openFace(z, b) }))
    .filter((x) => !x.b.pois?.length && !x.b.hut && x.b.cat !== 'ujusae' && x.b.cat !== 'home' && x.face && x.b.h >= 30);
  const home = free.filter((x) => x.b.w * x.b.d >= 36 && x.b.h >= 70 && x.dist >= 9 && x.dist <= 40).sort((a, b) => Math.abs(a.dist - 18) - Math.abs(b.dist - 18) || a.k - b.k)[0];
  if (home) {
    home.b.cat = 'estate';
    home.b.estate = city;
    home.b.sign = home.face!;
    home.b.pois = [{ t: 'residence', ...NAMES[city].home }];
  }
  const shop = free.filter((x) => x !== home && x.b.w * x.b.d >= 12 && x.b.w * x.b.d <= 80 && x.dist >= 6 && x.dist <= 30).sort((a, b) => Math.abs(a.dist - 12) - Math.abs(b.dist - 12) || a.k - b.k)[0];
  if (shop) {
    shop.b.cat = 'shop';
    shop.b.sign = shop.face!;
    shop.b.pois = [{ t: 'furniture', ...NAMES[city].furn }];
  }
  // 38차: 우주새에서 멀지 않은 큰길가에 철물점 하나 (무기 수리 — 미스 황이 길을 알려 준다)
  const roadside = (x: (typeof free)[number]) => {
    const b = x.b;
    const [fi, fj, di, dj] = x.face === 'left' ? [b.i0 + Math.floor(b.w / 2), b.j0 + b.d, 0, 1] : [b.i0 + b.w, b.j0 + Math.floor(b.d / 2), 1, 0];
    for (let k = 0; k <= 6; k++) { const t = tileAt(z, fi + di * k, fj + dj * k); if (t === 'road' || t === 'cross' || t === 'median') return true; }
    return false;
  };
  const tools = free.filter((x) => x !== home && x !== shop && x.b.w * x.b.d >= 10 && x.b.w * x.b.d <= 110 && x.dist >= 5 && x.dist <= 50 && roadside(x)).sort((a, b) => Math.abs(a.dist - 14) - Math.abs(b.dist - 14) || a.k - b.k)[0];
  if (tools) {
    tools.b.cat = 'shop';
    tools.b.sign = tools.face!;
    tools.b.pois = [{ t: 'hardware', ...NAMES[city].tools }];
  }
}
