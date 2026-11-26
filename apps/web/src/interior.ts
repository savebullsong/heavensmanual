// 건물 안: 들어갈 때만 업종에 맞는 작은 방을 만든다 (내려받는 그림 없음 · 한 번에 한 방만 메모리에)
// 방 = 작은 존. 뒤쪽 두 벽(i=0 줄, j=0 줄)은 막히고, 앞쪽 두 가장자리는 잘라 보인다(컷어웨이).
// 앞 가장자리 가운데의 매트를 밟으면 거리로 나간다.
import { TYPES, finalize, type Zone, type Building, type Furn, type InteriorInfo } from './zone.ts';
import { kindOf, mainPoi, hasBank, storeOf, cuisineOf } from './names.ts';
import { faithOf } from './street.ts';
import { TW, TH } from './gfx.ts';
import { BESK_LOOK } from './sprites.ts';
import { drawShore, drawShoreFurn, BULDA_LOOK } from './border.ts';
export { BESK_LOOK };

const TI = Object.fromEntries(TYPES.map((t, k) => [t, k])) as Record<(typeof TYPES)[number], number>;

/** 들어갈 수 있는 건물: 가게·시설이 있고 문(간판 면)이 있는 곳 */
export function canEnter(b: Building) {
  const p = mainPoi(b);
  if (b.cat === 'home') return true; // 24차 내 집
  if (!p || b.cat === 'ujusae') return false;
  // 간판이 없어도 들어갈 수 있는 곳: 종교시설·병원·은행
  // 32차: 물건을 파는 곳·은행은 반드시 안으로 들어가서 산다 (문 앞에서 사던 버그)
  return !!b.sign || ['place_of_worship', 'hospital', 'clinic', 'bank'].includes(p.t) || !!storeOf(b) || hasBank(b);
}

/** 17차: 우주새와 다른 무기를 파는 거리 상인 — 철물점·수리점(공구) · 백화점·쇼핑몰(주방칼·운동용품) */
function streetSeller(b: Building): 'tools' | 'dept' | 'antique' | undefined {
  const k = kindOf(b);
  // 26차: 이름 없는 가게(잡화점)도 공구·농기구를 판다 · 기념품·골동품·보석 가게는 진열장의 칼
  if (['hardware', 'car_repair', 'motorcycle_repair', 'bicycle', 'second_hand', 'doityourself', 'general', 'houseware', 'garden_centre'].includes(k)) return 'tools';
  if (k === 'shop' && !mainPoi(b)?.n) return 'tools'; // 간판 없는 가게 = 동네 잡화점 (이름 있는 가게는 제 업종대로)
  if (['gift', 'antiques', 'jewelry', 'art', 'pawnbroker'].includes(k)) return 'antique';
  if (['department_store', 'mall'].includes(k)) return 'dept';
  return undefined;
}

export function roomKind(b: Building): string {
  if (b.cat === 'loan') return 'loan'; // 지옥 3층 베스크 대부소
  if (b.cat === 'hbank' || b.cat === 'atone' || b.cat === 'rebirth' || b.cat === 'terrace' || b.cat === 'home' || b.cat === 'goatroom') return b.cat; // 31차 goatroom = 지옥 142층 염소대왕의 방 // 지옥 은행 · 속죄의 회당 · 지옥 로비 · 천국 환생의 테라스
  const k = kindOf(b);
  if (k === 'place_of_worship' || b.cat === 'worship') {
    const f = faithOf(b);
    return f === 'church' ? 'church' : f === 'mosque' ? 'mosque' : f === 'sikh' ? 'gurdwara' : 'temple';
  }
  if (k === 'bank' || k === 'bureau_de_change') return 'bank';
  if (['clinic', 'hospital', 'dentist', 'veterinary'].includes(k) || b.cat === 'clinic') return 'clinic';
  if (['fitness_centre', 'fitness_center', 'sports_centre', 'gym', 'dojo'].includes(k)) return 'gym'; // 19차 헬스장
  if (['department_store', 'mall'].includes(k)) return 'dept'; // 22차 백화점·쇼핑몰: 넓은 매장
  // 대표 가게(첫 POI)의 업종이 먼저 (한 건물에 식당·미용실이 같이 있으면 대표 가게의 방)
  if (['convenience', 'supermarket', 'kiosk', 'variety_store'].includes(k)) return 'mart';
  if (['pharmacy', 'chemist'].includes(k)) return 'pharmacy';
  if (['restaurant', 'fast_food', 'food_court', 'marketplace'].includes(k)) return 'food';
  if (['cafe', 'bakery', 'coffee', 'tea', 'ice_cream'].includes(k)) return 'cafe';
  if (['bar', 'pub', 'nightclub'].includes(k) || b.cat === 'bar') return 'bar';
  if (['hairdresser', 'beauty', 'tattoo', 'cosmetics'].includes(k)) return 'salon';
  if (k === 'massage') return 'massage';
  if (k === 'laundry' || b.cat === 'laundry') return 'laundry';
  if (['hotel', 'hostel', 'guest_house', 'apartment_hotel'].includes(k) || b.cat === 'hotel') return 'lobby';
  if (hasBank(b)) return 'bank';
  return 'shop';
}

/** 쉬는 곳: 종교시설·은행·병원·약국 (싸움 불가 · 빠른 회복) */
export const REST_ROOMS = new Set(['home', 'temple', 'church', 'mosque', 'gurdwara', 'bank', 'clinic', 'pharmacy', 'hbank', 'atone', 'rebirth', 'terrace', 'goatroom']);

const SIZE: Record<string, [number, number]> = {
  temple: [13, 11], church: [13, 11], mosque: [12, 11], gurdwara: [12, 11], bank: [12, 10], clinic: [12, 10], pharmacy: [9, 8],
  mart: [11, 9], food: [12, 10], cafe: [10, 9], bar: [10, 9], salon: [9, 8], massage: [10, 9], laundry: [9, 8], lobby: [11, 9], shop: [9, 8], loan: [10, 8],
  hbank: [10, 8], atone: [11, 10], rebirth: [31, 17], terrace: [23, 16], home: [11, 9], gym: [13, 11], dept: [26, 20], goatroom: [17, 17],
};
const LOOKS: Record<string, { floor: string; wall: string; trim: string }> = {
  temple: { floor: 'temple', wall: '#e9dcc0', trim: '#a8322a' }, church: { floor: 'stone', wall: '#e8e2d4', trim: '#6b4a30' },
  mosque: { floor: 'prayer', wall: '#efe8d8', trim: '#2a6a5a' }, gurdwara: { floor: 'prayer', wall: '#f2ecdc', trim: '#c9822a' },
  bank: { floor: 'marble', wall: '#dfe2e4', trim: '#2a4a6a' }, clinic: { floor: 'pale', wall: '#e8eeec', trim: '#3a8a7a' },
  pharmacy: { floor: 'pale', wall: '#edf2ee', trim: '#2a8a4a' }, mart: { floor: 'grey', wall: '#e4e4e0', trim: '#2a6aa8' },
  food: { floor: 'terracotta', wall: '#e8d8b8', trim: '#8a3a2a' }, cafe: { floor: 'wood', wall: '#d8c8b0', trim: '#4a3022' },
  bar: { floor: 'dark', wall: '#3a2e2a', trim: '#7a2a5a' }, salon: { floor: 'checker', wall: '#f0e8ea', trim: '#c96a8a' },
  massage: { floor: 'wood', wall: '#e2d6c0', trim: '#6a4a2a' }, laundry: { floor: 'pale', wall: '#dce6ee', trim: '#3a6a9a' },
  lobby: { floor: 'marble', wall: '#e6ddd0', trim: '#8a6a3a' }, shop: { floor: 'wood', wall: '#e6e0d4', trim: '#5a5a5a' },
  loan: { floor: 'dark', wall: '#3a2420', trim: '#8a6a2a' },
  hbank: { floor: 'dark', wall: '#34302c', trim: '#8a6a2a' }, atone: { floor: 'stone', wall: '#4a4440', trim: '#6a2a22' },
  rebirth: { floor: 'marble', wall: '#dfe3e6', trim: '#56687a' },
  terrace: { floor: 'cloud', wall: '#f6f2ea', trim: '#c9a23e' },
  home: { floor: 'jangpan', wall: '#e6dcc6', trim: '#7a5a3e' }, // 24차 내 집: 누런 장판 · 바랜 벽지
  gym: { floor: 'rubber', wall: '#d6d8da', trim: '#c83a2a' },
  dept: { floor: 'marble', wall: '#ece6dc', trim: '#b08a4a' },
  goatroom: { floor: 'obsidian', wall: '#2c1214', trim: '#a8822e' }, // 31차: 검붉은 벽 · 금빛 띠 · 흑요석 바닥
};

/** 거리의 건물 k에 들어갈 때 방을 만든다 (같은 건물이면 늘 같은 방) */
export function interiorZone(b: Building, k: number, out: { i: number; j: number }, name: string, yunaeAge?: 0 | 1 | 2): Zone {
  const kind = roomKind(b);
  const [W, H] = SIZE[kind];
  const tiles = new Uint8Array(W * H);
  for (let j = 0; j < H; j++)
    for (let i = 0; i < W; i++) tiles[j * W + i] = i === 0 || j === 0 ? TI.block : i === W - 1 || j === H - 1 ? TI.void : TI.walk;
  const furn: Furn[] = [];
  const F = (i: number, j: number, w: number, d: number, h: number, kind2: string, v = 0) => furn.push({ i, j, w, d, h, kind: kind2, v });
  const seats: [number, number][] = [];
  const mid = Math.floor(W / 2);
  let clerk = { i: W - 4, j: 1 }, counter = { i: W - 4, j: 3 };
  const x1 = W - 2, y1 = H - 2; // 마지막 바닥 칸
  switch (kind) {
    case 'mart':
      // 19차 손질: 뒤 벽 진열대 · 냉장고 줄 · 가운데 진열대 두 줄(끝에 특가 매대) · 계산대 앞 과자 걸이 · 아이스크림 냉동고 · 장바구니
      F(W - 5, 2, 3, 1, 22, 'counter'); clerk = { i: W - 4, j: 1 }; counter = { i: W - 4, j: 3 };
      F(1, 1, W - 6, 1, 50, 'shelf', 1);
      for (const jj of [4, 6]) if (jj < y1 - 1) { F(2, jj, W - 7, 1, 40, 'shelf', jj); F(W - 5, jj, 1, 1, 22, 'island', jj); }
      F(x1, 4, 1, 3, 56, 'fridge');
      F(W - 6, 3, 1, 1, 30, 'snackrack', 2);
      if (y1 - 1 > 6) F(1, y1 - 1, 2, 1, 18, 'freezer');
      F(mid + 1, y1, 1, 1, 8, 'baskets');
      seats.push([3, 5], [5, 3]);
      break;
    case 'pharmacy':
      F(1, 1, W - 2, 1, 54, 'shelf', 3); F(2, 3, W - 4, 1, 24, 'counter', 1); clerk = { i: mid, j: 2 }; counter = { i: mid, j: 4 };
      F(1, 5, 1, 1, 14, 'chair'); F(x1, 5, 1, 1, 40, 'shelf', 5);
      break;
    case 'food':
      F(2, 2, W - 4, 1, 24, 'kitchen'); clerk = { i: mid, j: 1 }; counter = { i: mid, j: 3 };
      for (let jj = 5; jj < y1; jj += 2) for (let ii = 2; ii < x1; ii += 3) { if (ii === mid || ii + 1 === mid) continue; F(ii, jj, 1, 1, 16, 'table', ii + jj); seats.push([ii + 1, jj]); }
      break;
    case 'cafe':
      F(W - 6, 2, 4, 1, 24, 'counter', 2); clerk = { i: W - 4, j: 1 }; counter = { i: W - 4, j: 3 };
      F(1, 2, 1, 3, 14, 'sofa'); F(2, 3, 1, 1, 14, 'table', 1);
      for (const [ii, jj] of [[3, 6], [6, 6]]) if (jj < y1) { F(ii, jj, 1, 1, 16, 'table', ii); seats.push([ii + 1, jj]); }
      F(1, y1 - 1, 1, 1, 12, 'plant');
      break;
    case 'bar':
      F(2, 2, W - 4, 1, 26, 'bar'); clerk = { i: mid, j: 1 }; counter = { i: mid - 1, j: 3 };
      for (let ii = 3; ii < W - 3; ii += 2) if (ii !== mid - 1) F(ii, 3, 1, 1, 10, 'stool');
      F(2, 6, 1, 1, 16, 'table', 3); F(W - 4, 6, 1, 1, 16, 'table', 4); seats.push([3, 6], [W - 3, 6]);
      break;
    case 'bank':
      F(2, 3, W - 4, 1, 28, 'teller'); clerk = { i: mid, j: 2 }; counter = { i: mid, j: 4 };
      F(x1, 5, 1, 1, 44, 'atm'); F(2, 6, 3, 1, 12, 'bench'); F(2, 7, 3, 1, 12, 'bench'); F(1, 1, 1, 1, 30, 'plant'); seats.push([3, 5]);
      break;
    case 'clinic':
      F(W - 5, 2, 3, 1, 24, 'counter', 3); clerk = { i: W - 4, j: 1 }; counter = { i: W - 4, j: 3 };
      F(1, 2, 1, 2, 16, 'bed'); F(1, 5, 1, 2, 16, 'bed'); F(3, y1 - 1, 3, 1, 12, 'bench'); seats.push([2, 3]);
      break;
    case 'temple':
      F(mid - 2, 1, 4, 2, 24, 'altar'); clerk = { i: mid + 3, j: 2 }; counter = { i: mid + 2, j: 4 };
      F(mid - 4, 2, 1, 1, 22, 'candle'); F(mid + 2, 1, 1, 1, 22, 'candle');
      for (let jj = 4; jj < y1 - 1; jj += 2) for (const ii of [mid - 3, mid - 1]) seats.push([ii, jj]);
      break;
    case 'church':
      F(mid - 1, 1, 3, 1, 20, 'altar', 1); clerk = { i: mid + 3, j: 2 }; counter = { i: mid + 2, j: 3 };
      for (let jj = 4; jj < y1 - 1; jj += 2) { F(2, jj, mid - 3, 1, 14, 'pew'); F(mid + 2, jj, W - mid - 4, 1, 14, 'pew'); seats.push([3, jj + 1]); }
      break;
    case 'mosque':
      F(mid + 2, 1, 1, 2, 30, 'minbar'); clerk = { i: mid - 3, j: 2 }; counter = { i: mid - 3, j: 4 };
      for (let jj = 4; jj < y1; jj += 2) seats.push([mid - 1 + (jj % 3), jj]);
      break;
    case 'gurdwara':
      F(mid - 1, 1, 3, 2, 22, 'altar', 2); clerk = { i: mid + 3, j: 2 }; counter = { i: mid + 2, j: 4 };
      for (let jj = 4; jj < y1; jj += 2) seats.push([mid - 2, jj], [mid + 2, jj]);
      break;
    case 'salon':
      for (let ii = 2; ii < W - 3; ii += 2) F(ii, 1, 1, 1, 14, 'salonchair');
      F(W - 4, 4, 2, 1, 22, 'counter', 4); clerk = { i: 3, j: 2 }; counter = { i: 3, j: 3 };
      F(1, y1 - 1, 2, 1, 14, 'sofa');
      break;
    case 'massage':
      for (let jj = 2; jj < y1 - 1; jj += 2) F(2, jj, 3, 1, 8, 'mat', jj);
      F(W - 5, 2, 3, 1, 22, 'counter', 5); clerk = { i: W - 4, j: 1 }; counter = { i: W - 4, j: 3 };
      F(x1, y1 - 1, 1, 1, 12, 'plant');
      break;
    case 'laundry':
      for (let ii = 1; ii < W - 3; ii++) F(ii, 1, 1, 1, 28, 'washer', ii);
      F(W - 3, 3, 1, 2, 22, 'counter', 6); clerk = { i: x1, j: 3 }; counter = { i: W - 4, j: 4 };
      F(2, 4, 3, 1, 12, 'bench');
      break;
    case 'lobby':
      F(3, 2, W - 6, 1, 24, 'counter', 7); clerk = { i: mid, j: 1 }; counter = { i: mid, j: 3 };
      F(1, 5, 1, 2, 14, 'sofa'); F(x1, 5, 1, 2, 14, 'sofa'); F(1, 1, 1, 1, 30, 'plant'); seats.push([2, 5]);
      break;
    case 'loan':
      // 베스크의 장부 책상 · 장부가 빽빽한 서가 · 쇠 금고 · 노전 자루 · 촛대
      F(W - 6, 2, 4, 1, 22, 'ledgerdesk'); clerk = { i: W - 4, j: 1 }; counter = { i: W - 4, j: 3 };
      F(1, 1, W - 7, 1, 58, 'ledgers', 3);
      F(x1, 1, 1, 1, 34, 'safe');
      F(1, 3, 1, 1, 18, 'coinsacks', 1); F(1, 4, 1, 1, 14, 'coinsacks', 2);
      F(x1, 4, 1, 1, 20, 'candle');
      break;
    case 'hbank':
      // 지옥 은행: 쇠창살 창구 · 쇠 금고 둘 · 노전 자루 · 촛대
      F(2, 3, W - 4, 1, 28, 'teller'); clerk = { i: mid, j: 2 }; counter = { i: mid, j: 4 };
      F(1, 1, 1, 1, 34, 'safe'); F(x1, 1, 1, 1, 34, 'safe'); F(2, 1, 1, 1, 18, 'coinsacks', 1); F(x1, 5, 1, 1, 22, 'candle'); F(1, 5, 1, 1, 14, 'coinsacks', 2);
      break;
    case 'atone':
      // 속죄의 회당: 제단(금 간 후광) · 촛대 · 무릎 꿇는 긴 의자들 · 헌금함
      F(mid - 1, 1, 3, 1, 22, 'altar', 3); clerk = { i: mid + 3, j: 2 }; counter = { i: mid + 2, j: 3 };
      F(mid - 3, 1, 1, 1, 22, 'candle'); F(mid + 3, 1, 1, 1, 22, 'candle');
      for (let jj = 4; jj < y1 - 1; jj += 2) { F(2, jj, mid - 3, 1, 12, 'pew'); F(mid + 2, jj, W - mid - 4, 1, 12, 'pew'); seats.push([3, jj + 1], [W - 3, jj + 1]); }
      F(mid, 3, 1, 1, 16, 'offerbox');
      break;
    case 'rebirth': {
      // 지옥 로비: 현대식 큰 홀. 뒤 벽을 따라 환생 상담 창구 다섯 (칸막이 사이 책상), 창구마다 줄을 세우는 기둥 줄, 아래쪽 대기 의자
      for (let k = 0; k < 5; k++) {
        const i0 = 2 + k * 4;
        F(i0, 2, 3, 1, 24, 'cdesk', k);
        if (k < 4) F(i0 + 3, 1, 1, 2, 44, 'partition');
        F(i0, 4, 1, 4, 12, 'rope'); F(i0 + 2, 4, 1, 4, 12, 'rope');
      }
      clerk = { i: 11, j: 1 }; counter = { i: 11, j: 3 };
      F(W - 8, 2, 6, 6, 6, 'shuttle', 1); // 24차: 로비 오른쪽 끝의 발사장 — 환생할 영혼은 이 우주선을 탄다
      F(2, 11, 4, 1, 12, 'bench'); F(8, 12, 3, 1, 12, 'bench'); F(14, 12, 3, 1, 12, 'bench'); F(18, 11, 3, 1, 12, 'bench');
      F(1, 1, 1, 1, 30, 'plant'); F(x1, 9, 1, 1, 30, 'plant'); F(1, 13, 1, 1, 30, 'plant');
      break;
    }
    case 'terrace': {
      // 천국 환생의 테라스: 구름 위에 뜬 흰 대리석 단 (벽 없음). 뒤쪽 가운데 환생의 문 — 문 안으로 아래 세상의 빛이 비친다.
      // 문 앞에 환생관 루엔, 네 귀퉁이 등불 기둥, 앞쪽 대리석 의자 둘. 앞 가장자리 가운데에서 구름 계단으로 내려간다
      // 24차: 환생의 문 대신 오른쪽 뒤에 우주왕복선 발사대 — 환생하려면 걸어가 탄다. 왼쪽엔 카드 치는 천사 둘
      clerk = { i: mid - 1, j: 3 }; counter = { i: mid - 1, j: 5 };
      F(W - 8, 1, 6, 6, 6, 'shuttle', 0);
      for (const [ii, jj] of [[2, 2], [2, 10], [W - 3, 10], [mid - 4, 1]]) F(ii, jj, 1, 1, 70, 'cpillar', ii + jj);
      F(4, 6, 1, 1, 10, 'cardtable');
      F(3, 13, 2, 1, 12, 'cbench'); F(W - 6, 13, 2, 1, 12, 'cbench');
      // 둥글게 깎은 모서리 (구름 위의 단이라 반듯한 네모가 아니게)
      for (const [ii, jj] of [[W - 2, 1], [W - 3, 1], [W - 2, 2], [1, H - 2], [2, H - 2], [1, H - 3], [W - 2, H - 2], [W - 3, H - 2], [W - 2, H - 3], [W - 4, H - 2], [W - 2, H - 4]]) tiles[jj * W + ii] = TI.void;
      break;
    }
    case 'goatroom': {
      // 32차 지옥 142층 · 염소대왕의 방: 뒤 모서리의 흑요석 단 위, 열두 길 거인이 옥좌에 앉아 문 쪽을 내려다본다.
      // 단 양옆 청동 화로(붉은 불), 쇠사슬 감긴 검붉은 기둥 넷, 문(앞 모서리)에서 단까지 비스듬한 붉은 융단
      clerk = { i: 3, j: 3 }; counter = { i: 7, j: 7 };
      F(1, 1, 5, 5, 16, 'gkdais');
      F(7, 1, 1, 1, 24, 'gkbrazier'); F(1, 7, 1, 1, 24, 'gkbrazier', 1);
      F(10, 1, 1, 1, 236, 'gkpillar', 2); F(1, 10, 1, 1, 236, 'gkpillar', 3);
      F(11, 7, 1, 1, 236, 'gkpillar'); F(7, 11, 1, 1, 236, 'gkpillar', 1);
      break;
    }
    case 'home': {
      // 24차 내 집 (서울 달동네): 작은 방 하나 — 앉은뱅이 밥상 · 개어 둔 이불 · 낡은 텔레비전 · 옷장 · 창가 화분. 유내가 밥상 앞에 있다 (28차: 10대·30대 후반일 때만)
      // 25차: 칸마다 제 모양 — 자개 옷장 · 브라운관 텔레비전 · 개어 둔 이불 · 앉은뱅이 밥상(공기·반찬) · 밥상 밑 꽃무늬 깔개 · 선풍기 · 문 앞 신발
      F(2, 1, 2, 1, 46, 'wardrobe'); F(W - 3, 1, 1, 1, 22, 'tv'); F(1, 4, 1, 2, 12, 'futon'); F(mid, 4, 2, 1, 8, 'lowtable', 3); F(x1, 5, 1, 1, 26, 'plant');
      F(mid - 1, 3, 4, 3, 1, 'rug', 1); F(x1, 2, 1, 1, 34, 'fan');
      clerk = { i: mid, j: 3 }; counter = { i: mid, j: 5 };
      break;
    }
    case 'gym': {
      // 19차 헬스장: 거울 벽 앞 덤벨 걸이 · 러닝머신 줄 · 벤치 프레스 · 스쿼트 랙 · 샌드백 · 요가 매트 · 안내 데스크(트레이너)
      F(W - 5, y1 - 2, 3, 1, 22, 'counter', 4); clerk = { i: W - 4, j: y1 - 3 }; counter = { i: W - 4, j: y1 - 1 };
      F(2, 1, 4, 1, 24, 'dumbbells');
      for (let n = 0; n < 3; n++) F(1, 3 + n * 2, 2, 1, 26, 'treadmill', n);
      F(7, 1, 2, 2, 60, 'squatrack');
      F(5, 4, 2, 1, 20, 'benchpress'); F(8, 5, 2, 1, 20, 'benchpress', 1);
      F(x1, 1, 1, 1, 64, 'punchbag'); F(x1, 3, 1, 1, 64, 'punchbag', 1);
      F(5, 7, 2, 1, 2, 'mat'); F(8, 7, 2, 1, 2, 'mat', 1);
      seats.push([4, 6], [9, 3], [6, 8]);
      break;
    }
    case 'dept': {
      // 22차 백화점: 넓은 대리석 홀 — 뒤 벽을 따라 명품 진열장, 왼쪽 화장품 매대 줄, 오른쪽 옷걸이 숲과 거울,
      // 가운데 분수 대신 화분 섬과 쉬는 소파, 안내 데스크(점원). 앞쪽 가운데가 입구
      F(1, 1, 7, 1, 56, 'shelf', 8); F(9, 1, 8, 1, 60, 'display', 2); F(18, 1, W - 19, 1, 56, 'shelf', 3);
      for (let jj = 4; jj <= 12; jj += 4) { F(2, jj, 3, 1, 24, 'counter', jj); F(2, jj + 1, 1, 1, 34, 'mirror'); }
      for (let jj = 4; jj <= 13; jj += 3) for (const ii of [W - 7, W - 4]) F(ii, jj, 1, 2, 34, 'rack', ii + jj);
      F(x1, 3, 1, 1, 50, 'mirror'); F(x1, 9, 1, 1, 50, 'mirror');
      F(mid - 2, 6, 1, 1, 40, 'plant', 1); F(mid + 1, 6, 1, 1, 40, 'plant', 2); F(mid - 2, 9, 1, 1, 40, 'plant', 3); F(mid + 1, 9, 1, 1, 40, 'plant', 4);
      F(mid - 1, 7, 2, 1, 14, 'sofa'); F(mid - 1, 9, 2, 1, 14, 'sofa', 1);
      F(8, 5, 2, 1, 18, 'island', 2); F(8, 10, 2, 1, 18, 'island', 5); F(W - 11, 5, 2, 1, 18, 'island', 3); F(W - 11, 10, 2, 1, 18, 'island', 6);
      F(mid + 3, y1 - 3, 3, 1, 22, 'counter', 9); clerk = { i: mid + 4, j: y1 - 4 }; counter = { i: mid + 4, j: y1 - 2 };
      F(mid - 4, y1, 1, 1, 8, 'baskets');
      seats.push([mid - 1, 8], [mid, 8], [6, 7], [W - 9, 8], [10, 14], [W - 12, 14], [mid - 3, 12], [mid + 3, 12]);
      break;
    }
    default:
      // 19차 손질: 뒤 벽·왼쪽 벽 진열장, 가운데 진열 탁자 둘과 옷걸이, 거울, 입구 매트 앞 장바구니, 계산대(금전등록기)
      F(W - 5, 2, 3, 1, 22, 'counter', 8); clerk = { i: W - 4, j: 1 }; counter = { i: W - 4, j: 3 };
      F(1, 1, W - 6, 1, 46, 'shelf', 8);
      if (y1 - 2 > 3) F(1, 3, 1, y1 - 4, 40, 'shelf', 5);
      F(3, 4, 2, 1, 18, 'island', 1); if (y1 > 6) F(3, 6, 2, 1, 18, 'island', 4);
      F(W - 4, 5, 1, 2, 34, 'rack', 2);
      F(x1, y1 - 1, 1, 1, 50, 'mirror');
      F(mid - 1, y1, 1, 1, 8, 'baskets');
      break;
  }
  // 25차: 방마다 손때 묻은 살림을 더한다 — 빈 바닥에만, 드나드는 길(문 → 창구 · 자리)을 막지 않을 때만
  const DECOR: Record<string, [number, number, number, number, number, string, number?][]> = {
    mart: [[x1, 1, 1, 1, 20, 'crates', 1], [1, y1, 1, 1, 10, 'bin']],
    pharmacy: [[1, y1, 1, 1, 10, 'bin'], [x1, 3, 1, 1, 34, 'cooler']],
    food: [[1, 1, 1, 1, 20, 'crates', 2], [x1, 1, 1, 1, 34, 'cooler'], [1, y1, 1, 1, 10, 'bin'], [x1, y1 - 1, 1, 1, 34, 'fan']],
    cafe: [[x1, 1, 1, 1, 42, 'lamp'], [x1, y1, 1, 1, 10, 'bin'], [1, 2, 3, 3, 1, 'rug', 2]],
    bar: [[1, 1, 1, 1, 22, 'crates', 3], [x1, 1, 1, 1, 22, 'crates', 4], [x1, y1, 1, 1, 10, 'bin']],
    bank: [[1, y1, 1, 1, 18, 'umbrella'], [x1, 1, 1, 1, 34, 'cooler'], [2, 5, 4, 3, 1, 'rug', 3]],
    clinic: [[x1, 1, 1, 1, 22, 'tv'], [x1, y1 - 1, 1, 1, 34, 'cooler'], [1, y1, 1, 1, 10, 'bin']],
    temple: [[mid - 1, y1, 1, 1, 1, 'shoes'], [mid + 1, y1, 1, 1, 1, 'shoes', 1], [1, y1 - 1, 1, 1, 34, 'fan']],
    mosque: [[mid - 1, y1, 1, 1, 1, 'shoes'], [mid + 1, y1, 1, 1, 1, 'shoes', 1]],
    gurdwara: [[mid - 1, y1, 1, 1, 1, 'shoes', 1], [mid + 1, y1, 1, 1, 1, 'shoes']],
    salon: [[x1, 1, 1, 1, 18, 'towels'], [x1, y1, 1, 1, 10, 'bin'], [1, y1 - 2, 1, 1, 34, 'fan']],
    massage: [[x1, 1, 1, 1, 18, 'towels'], [1, 1, 1, 1, 42, 'lamp'], [x1, 4, 1, 1, 34, 'fan'], [mid - 1, y1, 1, 1, 1, 'shoes'], [mid + 1, y1, 1, 1, 1, 'shoes', 1]],
    laundry: [[1, y1, 1, 1, 14, 'baskets'], [x1, 1, 1, 1, 10, 'bin'], [x1, y1, 1, 1, 34, 'fan']],
    lobby: [[x1, 1, 1, 1, 18, 'umbrella'], [1, y1, 1, 1, 42, 'lamp'], [3, 4, W - 6, 2, 1, 'rug', 0], [x1, y1, 1, 1, 22, 'tv']],
    loan: [[1, y1, 1, 1, 10, 'bin']],
    gym: [[1, y1, 1, 1, 34, 'cooler'], [x1, y1, 1, 1, 10, 'bin']],
    dept: [[1, y1, 1, 1, 18, 'umbrella'], [x1, y1, 1, 1, 10, 'bin'], [mid - 2, 7, 4, 3, 1, 'rug', 3]],
    home: [[mid - 1, y1, 1, 1, 1, 'shoes']],
    shop: [[1, y1, 1, 1, 10, 'bin'], [x1, 1, 1, 1, 20, 'crates']],
  };
  const blockedBy = (list: Furn[]) => { const B = new Uint8Array(W * H); for (const f of list) if (f.h > 2) for (let j = f.j; j < f.j + f.d; j++) for (let i = f.i; i < f.i + f.w; i++) B[j * W + i] = 1; return B; };
  const reachAll = () => {
    const B = blockedBy(furn), seen = new Uint8Array(W * H), q: [number, number][] = [[mid, y1]];
    seen[y1 * W + mid] = 1;
    while (q.length) {
      const [a, b] = q.pop()!;
      for (const [da, db] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const na = a + da, nb = b + db;
        if (na < 1 || nb < 1 || na > x1 || nb > y1 || seen[nb * W + na] || B[nb * W + na]) continue;
        seen[nb * W + na] = 1; q.push([na, nb]);
      }
    }
    return [counter, ...seats.map(([a, b]) => ({ i: a, j: b }))].every((p) => !B[p.j * W + p.i] ? !!seen[p.j * W + p.i] : true);
  };
  for (const [a, b, w2, d2, h2, k2, v2] of DECOR[kind] ?? []) {
    if (a < 1 || b < 1 || a + w2 - 1 > x1 || b + d2 - 1 > y1) continue;
    const flat = h2 <= 2;
    if (!flat) {
      const B = blockedBy(furn);
      let clash = false;
      for (let j = b; j < b + d2; j++) for (let i = a; i < a + w2; i++) if (B[j * W + i] || (i === mid && j === y1) || (i === clerk.i && j === clerk.j) || (i === counter.i && j === counter.j) || seats.some(([si, sj]) => si === i && sj === j)) clash = true;
      if (clash) continue;
    } else if (furn.some((f) => f.h <= 2 && a < f.i + f.w && f.i < a + w2 && b < f.j + f.d && f.j < b + d2)) continue;
    furn.push({ i: a, j: b, w: w2, d: d2, h: h2, kind: k2, v: v2 ?? 0 });
    if (!flat && !reachAll()) furn.pop();
  }
  // 깔개는 맨 아래에 (가구 밑에 깔린다)
  furn.sort((p, q) => (p.h <= 2 ? 0 : 1) - (q.h <= 2 ? 0 : 1));
  for (const f of furn) if (f.h > 2) for (let j = f.j; j < f.j + f.d; j++) for (let i = f.i; i < f.i + f.w; i++) tiles[j * W + i] = TI.block;
  const exit = kind === 'goatroom' ? { i: x1, j: y1 } : { i: mid, j: y1 }; // 32차: 염소대왕의 방은 옥좌 맞은편 앞 모서리가 문
  tiles[exit.j * W + exit.i] = TI.walk;
  const look = LOOKS[kind];
  const info: InteriorInfo = {
    // 28차: 내 집의 유내 — 거리에서 정해 둔 시절을 따른다. 20대(1)면 방은 비어 있다 (대문 앞에 나가 있거나, 그 사람 만나러 갔다)
    kind, rest: REST_ROOMS.has(kind), name, ...look, exit, clerk: kind === 'home' && (yunaeAge ?? 1) === 1 ? undefined : clerk, counter, furn, age: kind === 'home' ? (yunaeAge ?? (Math.floor(Math.random() * 3) as 0 | 1 | 2)) : undefined,
    from: { b: k, out, bd: b }, store: kind === 'bank' ? 'bank' : ['mart', 'pharmacy', 'food', 'cafe'].includes(kind) ? kind : streetSeller(b), cuisine: cuisineOf(b), seats: seats.filter(([i, j]) => tiles[j * W + i] === TI.walk),
  };
  return finalize({ id: `in-${k}`, W, H, tiles, buildings: [], props: [], lanes: [], door: exit, spawn: { i: exit.i, j: exit.j - 1 }, interior: info });
}

// ───────────────────────── 그림 ─────────────────────────
type Pt = [number, number];
let WALL = 100; // 벽 높이 px (32차: 염소대왕의 방은 거인이 앉을 만큼 높다)

function mixHex(a: string, b: string, t: number) {
  const pa = parseInt(a.slice(1), 16), pb = parseInt(b.slice(1), 16);
  const ch = (s: number) => Math.round(((pa >> s) & 255) * (1 - t) + ((pb >> s) & 255) * t);
  return `#${[16, 8, 0].map((s) => ch(s).toString(16).padStart(2, '0')).join('')}`;
}

function painter(minX: number, minY: number, W: number, H: number) {
  const c = document.createElement('canvas');
  c.width = Math.ceil(W); c.height = Math.ceil(H);
  const g = c.getContext('2d')!;
  const P = (x: number, y: number, z: number): Pt => [(x - y) * (TW / 2) - minX, (x + y) * (TH / 2) - z - minY];
  const poly = (pts: Pt[], fill: string, alpha = 1) => {
    g.globalAlpha = alpha;
    g.beginPath(); g.moveTo(pts[0][0], pts[0][1]);
    for (const p of pts.slice(1)) g.lineTo(p[0], p[1]);
    g.closePath(); g.fillStyle = fill; g.fill();
    g.globalAlpha = 1;
  };
  return { c, g, P, poly };
}

const FLOORS: Record<string, [string, string]> = {
  temple: ['#8a3a2a', '#9a4632'], stone: ['#b8b0a2', '#aaa294'], prayer: ['#2f6a52', '#3a7a5e'], marble: ['#e4e0da', '#d6d2cc'], pale: ['#e2e8e6', '#d4dcda'],
  grey: ['#c8c8c4', '#bcbcb8'], terracotta: ['#b8704a', '#a8643e'], wood: ['#a0764e', '#946a44'], dark: ['#4a3426', '#3e2c20'], checker: ['#ece8e4', '#3a3434'],
  cloud: ['#ebe4d6', '#e2dacb'],
  jangpan: ['#d8b46a', '#d0ab62'],
  rubber: ['#3a3c40', '#34363a'],
  obsidian: ['#221818', '#1a1212'],
};

/** 뭉게구름 한 덩이: 아래는 옅은 보랏빛 그늘, 위는 흰 빛 (도트 느낌이 나게 좌표를 반올림) */
function cloudPuff(g: CanvasRenderingContext2D, x: number, y: number, r: number, a = 1) {
  x = Math.round(x); y = Math.round(y); r = Math.round(r);
  g.globalAlpha = a;
  g.fillStyle = '#cfd3e2'; g.beginPath(); g.ellipse(x, y + r * 0.22, r, r * 0.6, 0, 0, Math.PI * 2); g.fill();
  g.fillStyle = '#f4f3f0'; g.beginPath(); g.ellipse(x - r * 0.06, y, r * 0.94, r * 0.56, 0, 0, Math.PI * 2); g.fill();
  g.fillStyle = '#ffffff'; g.beginPath(); g.ellipse(x - r * 0.28, y - r * 0.2, r * 0.52, r * 0.3, 0, 0, Math.PI * 2); g.fill();
  g.globalAlpha = 1;
}

/** 19차: 천국 '환생의 테라스' — 벽 없이 구름 위에 뜬 흰 대리석 단. 뒤로는 먼 구름 봉우리, 가장자리 아래는 구름 바다 */
function drawTerrace(z: Zone): { canvas: HTMLCanvasElement; x: number; y: number } {
  const info = z.interior!;
  const W = z.W, H = z.H;
  const M = 170;
  const minX = (0 - H) * (TW / 2) - M, maxX = W * (TW / 2) + M;
  const minY = -190, maxY = (W + H) * (TH / 2) + M;
  const { c, g, P, poly } = painter(minX, minY, maxX - minX, maxY - minY);
  const VOID = TI.void;
  const floor = (i: number, j: number) => i >= 1 && j >= 1 && i < W - 1 && j < H - 1 && z.tiles[j * W + i] !== VOID;
  const hsh = (a: number, b: number) => { const s = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return s - Math.floor(s); };
  // 1) 먼 구름 봉우리 (단 뒤쪽 하늘 — 벽이 있던 자리)
  for (let n = 0; n < 9; n++) {
    const [x, y] = P(-1.5 + n * 0.2, -1 + n * 2.1, 40 + hsh(n, 1) * 70);
    for (let k = 0; k < 4; k++) cloudPuff(g, x + (k - 1.5) * 22 + hsh(n, k) * 10, y + k * 9, 26 + hsh(k, n) * 16, 0.75);
  }
  for (let n = 0; n < 9; n++) {
    const [x, y] = P(-1 + n * 2.1, -1.5 + n * 0.2, 40 + hsh(n, 7) * 80);
    for (let k = 0; k < 4; k++) cloudPuff(g, x + (k - 1.5) * 22 + hsh(k, n + 3) * 10, y + k * 9, 26 + hsh(n + 2, k) * 16, 0.75);
  }
  // 2) 단 뒤쪽 가장자리 밑의 구름 (단이 그 위에 얹혀 있다)
  for (let j = 0; j < H; j += 1.4) { const [x, y] = P(0.6, j, -4); cloudPuff(g, x, y, 24 + hsh(j, 2) * 10); }
  for (let i = 0; i < W; i += 1.4) { const [x, y] = P(i, 0.6, -4); cloudPuff(g, x, y, 24 + hsh(i, 5) * 10); }
  // 3) 대리석 단의 두께 (앞쪽 면) — 금띠 한 줄
  const T = 14;
  for (let j = 1; j < H - 1; j++) for (let i = 1; i < W - 1; i++) {
    if (!floor(i, j)) continue;
    if (!floor(i + 1, j)) { poly([P(i + 1, j, 0), P(i + 1, j + 1, 0), P(i + 1, j + 1, -T), P(i + 1, j, -T)], '#cfc9bc'); poly([P(i + 1, j, -3), P(i + 1, j + 1, -3), P(i + 1, j + 1, -5), P(i + 1, j, -5)], '#c9a23e'); }
    if (!floor(i, j + 1)) { poly([P(i, j + 1, 0), P(i + 1, j + 1, 0), P(i + 1, j + 1, -T), P(i, j + 1, -T)], '#e2ddd2'); poly([P(i, j + 1, -3), P(i + 1, j + 1, -3), P(i + 1, j + 1, -5), P(i, j + 1, -5)], '#d9b44a'); }
  }
  // 4) 바닥: 흰 대리석 (옅은 결) + 가운데 금빛 해무늬 + 출구에서 문까지 옅은 하늘빛 길
  const [fa, fb] = FLOORS.cloud;
  for (let j = 1; j < H - 1; j++) for (let i = 1; i < W - 1; i++) {
    if (!floor(i, j)) continue;
    poly([P(i, j, 0), P(i + 1, j, 0), P(i + 1, j + 1, 0), P(i, j + 1, 0)], (i + j) % 2 ? fb : fa);
    if (hsh(i, j) < 0.3) poly([P(i + 0.15, j + 0.25, 0), P(i + 0.75, j + 0.5, 0), P(i + 0.77, j + 0.54, 0), P(i + 0.17, j + 0.29, 0)], '#d2c9b8');
  }
  const mid = Math.floor(W / 2), ex = info.exit;
  poly([P(mid - 0.1, 3, 0.2), P(mid + 1.1, 3, 0.2), P(mid + 1.1, H - 1, 0.2), P(mid - 0.1, H - 1, 0.2)], '#d9b44a');
  poly([P(mid + 0.02, 3, 0.3), P(mid + 0.98, 3, 0.3), P(mid + 0.98, H - 1, 0.3), P(mid + 0.02, H - 1, 0.3)], '#c8d4ec');
  {
    const [cx, cy] = P(mid + 0.5, Math.floor(H / 2) + 0.5, 0.4);
    g.strokeStyle = '#d9b44a'; g.lineWidth = 2;
    g.beginPath(); g.ellipse(cx, cy, 58, 29, 0, 0, Math.PI * 2); g.stroke();
    g.lineWidth = 1;
    for (let k = 0; k < 12; k++) { const a = (k / 12) * Math.PI * 2; g.beginPath(); g.moveTo(cx + Math.cos(a) * 46, cy + Math.sin(a) * 23); g.lineTo(cx + Math.cos(a) * 56, cy + Math.sin(a) * 28); g.stroke(); }
  }
  // 5) 앞 가장자리 아래 구름 (단이 구름 위에 떠 있다)
  for (let j = 1; j < H - 1; j++) for (let i = 1; i < W - 1; i++) {
    if (!floor(i, j)) continue;
    if (!floor(i + 1, j)) { const [x, y] = P(i + 1.3, j + 0.5, -24); cloudPuff(g, x, y, 20 + hsh(i, j) * 9); }
    if (!floor(i, j + 1) && !(i === ex.i)) { const [x, y] = P(i + 0.5, j + 1.3, -24); cloudPuff(g, x, y, 20 + hsh(j, i) * 9); }
  }
  // 6) 나가는 곳: 구름 계단 셋이 아래로 이어진다 (거리로 내려가는 길)
  for (let k = 2; k >= 0; k--) {
    const y0 = H - 1 + k * 0.55, z0 = -8 - k * 12;
    poly([P(ex.i, y0, z0), P(ex.i + 1, y0, z0), P(ex.i + 1, y0 + 0.55, z0), P(ex.i, y0 + 0.55, z0)], '#f4f1ea');
    poly([P(ex.i, y0 + 0.55, z0), P(ex.i + 1, y0 + 0.55, z0), P(ex.i + 1, y0 + 0.55, z0 - 6), P(ex.i, y0 + 0.55, z0 - 6)], '#d8d3c8');
    const [x, y] = P(ex.i + 1.1, y0 + 0.3, z0 - 10); cloudPuff(g, x, y, 12, 0.9);
    const [x2, y2] = P(ex.i - 0.1, y0 + 0.5, z0 - 12); cloudPuff(g, x2, y2, 11, 0.9);
  }
  poly([P(ex.i, ex.j, 0.5), P(ex.i + 1, ex.j, 0.5), P(ex.i + 1, ex.j + 1, 0.5), P(ex.i, ex.j + 1, 0.5)], '#e6dcc0');
  void c;
  return { canvas: c, x: minX, y: minY };
}

/** 바닥 + 뒤쪽 두 벽 + 벽 장식 (방 전체를 한 장으로) */
export function drawRoom(z: Zone, night: boolean): { canvas: HTMLCanvasElement; x: number; y: number } {
  if (z.interior!.kind === 'terrace') return drawTerrace(z);
  if (z.interior!.kind === 'shore') return drawShore(z); // 24차 경계의 해변
  const info = z.interior!;
  WALL = info.kind === 'goatroom' ? 270 : 100; // 32차: 거인의 방은 벽이 높다
  const W = z.W, H = z.H;
  const minX = (0 - H) * (TW / 2) - 8, maxX = W * (TW / 2) + 8;
  const minY = -WALL - 20, maxY = (W + H) * (TH / 2) + 8;
  const { c, g, P, poly } = painter(minX, minY, maxX - minX, maxY - minY);
  const [fa, fb] = FLOORS[info.floor] ?? FLOORS.wood;
  // 바닥 (1..W-1 × 1..H-1)
  for (let j = 1; j < H - 1; j++)
    for (let i = 1; i < W - 1; i++) {
      const alt = info.floor === 'prayer' ? j % 2 === 0 : info.floor === 'wood' || info.floor === 'dark' ? false : (i + j) % 2 === 0;
      poly([P(i, j, 0), P(i + 1, j, 0), P(i + 1, j + 1, 0), P(i, j + 1, 0)], alt ? fb : fa);
      if (info.floor === 'wood' || info.floor === 'dark') for (let k = 1; k < 4; k++) poly([P(i, j + k / 4, 0), P(i + 1, j + k / 4, 0), P(i + 1, j + k / 4 + 0.02, 0), P(i, j + k / 4 + 0.02, 0)], fb);
      if (info.floor === 'marble' && (i * 7 + j * 3) % 5 === 0) poly([P(i + 0.2, j + 0.3, 0), P(i + 0.7, j + 0.5, 0), P(i + 0.72, j + 0.53, 0), P(i + 0.22, j + 0.33, 0)], '#c4c0ba');
    }
  if (info.floor === 'temple') {
    // 법당: 가운데 붉은 융단 + 금빛 테
    const a = Math.floor(W / 2) - 3, b2 = Math.floor(W / 2) + 2;
    poly([P(a, 3, 0), P(b2, 3, 0), P(b2, H - 2, 0), P(a, H - 2, 0)], '#c9a23e');
    poly([P(a + 0.12, 3.12, 0), P(b2 - 0.12, 3.12, 0), P(b2 - 0.12, H - 2.12, 0), P(a + 0.12, H - 2.12, 0)], '#a8282a');
  }
  if (info.kind === 'goatroom') {
    // 32차: 문(앞 모서리)에서 옥좌의 단까지 비스듬히 곧게 깔린 붉은 융단 (금빛 테) · 흑요석 바닥의 붉은 실금
    const band = (a0: number, a1: number, wd: number, col: string) => poly([P(a0 + wd, a0 - wd, 0), P(a1 + wd, a1 - wd, 0), P(a1 - wd, a1 + wd, 0), P(a0 - wd, a0 + wd, 0)], col);
    band(5.6, H - 1.4, 1.25, '#c9a23e');
    band(5.7, H - 1.45, 1.1, '#7a1014');
    band(5.8, H - 1.5, 0.85, '#8e1418');
    for (let t = 7; t < H - 2; t += 2) { const [cx, cy] = P(t + 0.5, t + 0.5, 0); g.fillStyle = '#c9a23e'; g.beginPath(); g.moveTo(cx, cy - 5); g.lineTo(cx + 9, cy); g.lineTo(cx, cy + 5); g.lineTo(cx - 9, cy); g.closePath(); g.fill(); g.fillStyle = '#7a1014'; g.fillRect(Math.round(cx) - 2, Math.round(cy) - 1, 4, 2); }
    for (let j = 1; j < H - 1; j++) for (let i = 1; i < W - 1; i++) if ((i * 7 + j * 13) % 9 === 0 && Math.abs(i - j) > 2) poly([P(i + 0.2, j + 0.4, 0), P(i + 0.8, j + 0.6, 0), P(i + 0.82, j + 0.63, 0), P(i + 0.22, j + 0.43, 0)], '#5a1a14');
  }
  // 앞 가장자리 걸레받이 (잘린 벽 단면)
  poly([P(W - 1, 1, 0), P(W - 1, H - 1, 0), P(W - 1, H - 1, 6), P(W - 1, 1, 6)], mixHex(info.wall, '#000000', 0.45));
  poly([P(1, H - 1, 0), P(W - 1, H - 1, 0), P(W - 1, H - 1, 6), P(1, H - 1, 6)], mixHex(info.wall, '#000000', 0.3));
  // 나가는 매트 + 바깥 빛
  const ex = info.exit;
  poly([P(ex.i, ex.j, 0.5), P(ex.i + 1, ex.j, 0.5), P(ex.i + 1, ex.j + 1, 0.5), P(ex.i, ex.j + 1, 0.5)], '#5a4632');
  poly([P(ex.i + 0.1, ex.j + 0.1, 0.6), P(ex.i + 0.9, ex.j + 0.1, 0.6), P(ex.i + 0.9, ex.j + 0.9, 0.6), P(ex.i + 0.1, ex.j + 0.9, 0.6)], '#7a6448');
  poly([P(ex.i, H - 1, 0), P(ex.i + 1, H - 1, 0), P(ex.i + 1.3, H - 0.2, 0), P(ex.i - 0.3, H - 0.2, 0)], night ? '#3a4a6a' : '#fff2c8', 0.35);
  // 뒤 벽: x = 1 면(왼쪽 뒤, 어두운 쪽)과 y = 1 면(오른쪽 뒤, 밝은 쪽)
  const wl = mixHex(info.wall, '#000000', 0.18), wr = info.wall;
  poly([P(1, 1, 0), P(1, H - 1, 0), P(1, H - 1, WALL), P(1, 1, WALL)], wl);
  poly([P(1, 1, 0), P(W - 1, 1, 0), P(W - 1, 1, WALL), P(1, 1, WALL)], wr);
  // 벽 윗단·아랫단
  poly([P(1, 1, WALL - 6), P(1, H - 1, WALL - 6), P(1, H - 1, WALL), P(1, 1, WALL)], mixHex(info.trim, '#000000', 0.2));
  poly([P(1, 1, WALL - 6), P(W - 1, 1, WALL - 6), P(W - 1, 1, WALL), P(1, 1, WALL)], info.trim);
  poly([P(1, 1, 0), P(1, H - 1, 0), P(1, H - 1, 8), P(1, 1, 8)], mixHex(info.trim, '#000000', 0.35));
  poly([P(1, 1, 0), P(W - 1, 1, 0), P(W - 1, 1, 8), P(1, 1, 8)], mixHex(info.trim, '#000000', 0.15));
  // 벽 장식
  const winL = (y0: number, y2: number, z0: number, z1: number, col = night ? '#22304a' : '#a8c8d8') => {
    poly([P(1, y0, z0), P(1, y2, z0), P(1, y2, z1), P(1, y0, z1)], mixHex(info.trim, '#000000', 0.3));
    poly([P(1, y0 + 0.08, z0 + 3), P(1, y2 - 0.08, z0 + 3), P(1, y2 - 0.08, z1 - 3), P(1, y0 + 0.08, z1 - 3)], col);
  };
  const onR = (x0: number, x2: number, z0: number, z1: number, col: string) => poly([P(x0, 1, z0), P(x2, 1, z0), P(x2, 1, z1), P(x0, 1, z1)], col);
  const k = info.kind, mid = Math.floor(W / 2);
  for (let y = 3; y < H - 2; y += 3) {
    if (k === 'church') { winL(y, y + 1, 34, 86, night ? '#3a2a5a' : '#c94a6a'); winL(y + 0.3, y + 0.7, 40, 80, night ? '#2a3a6a' : '#4a8ac9'); }
    else if (k === 'mosque') { winL(y, y + 1, 30, 76); poly([P(1, y, 76), P(1, y + 1, 76), P(1, y + 0.5, 88)], mixHex(info.trim, '#000000', 0.3)); }
    else if (k !== 'bar' && k !== 'goatroom') winL(y, y + 1.2, 34, 74);
  }
  if (k === 'temple') {
    // 벽화: 금빛 띠와 연꽃
    onR(2, W - 2, 64, 70, '#c9a23e');
    for (let x = 2.5; x < W - 2; x += 1.5) { const [lx, ly] = P(x, 1, 46); g.fillStyle = '#d9849a'; g.beginPath(); g.ellipse(lx, ly, 6, 4, 0, 0, Math.PI * 2); g.fill(); g.fillStyle = '#4a7a3a'; g.fillRect(lx - 1, ly + 3, 2, 8); }
  } else if (k === 'church') {
    onR(mid, mid + 0.2, 34, 92, '#6b4a30'); onR(mid - 0.6, mid + 0.8, 70, 76, '#6b4a30'); // 십자가
  } else if (k === 'mosque') {
    onR(mid - 1, mid + 1, 8, 70, mixHex(info.trim, '#000000', 0.25)); onR(mid - 0.8, mid + 0.8, 10, 62, '#d8c89a'); // 미흐랍
    poly([P(mid - 1, 1, 70), P(mid + 1, 1, 70), P(mid, 1, 88)], mixHex(info.trim, '#000000', 0.25));
  } else if (k === 'gurdwara') {
    onR(2, W - 2, 60, 66, '#c9822a');
  } else if (k === 'bank') {
    onR(2, W - 2, 56, 62, info.trim); onR(2, W - 2, 64, 66, '#c9a23e');
  } else if (k === 'clinic' || k === 'pharmacy') {
    // 녹색 십자 (약국·의원 표시)
    const x0 = k === 'pharmacy' ? W - 2.6 : 2.4;
    onR(x0, x0 + 0.9, 64, 72, '#2a9a5a'); onR(x0 + 0.32, x0 + 0.58, 56, 80, '#2a9a5a');
  } else if (k === 'food' || k === 'cafe') {
    onR(mid - 2, mid + 2, 56, 84, k === 'cafe' ? '#2a2a28' : '#e8dcc0'); // 메뉴판
    for (let n = 0; n < 4; n++) onR(mid - 1.7, mid - 1.7 + 1.2 + (n % 2) * 0.8, 62 + n * 5, 64 + n * 5, k === 'cafe' ? '#d8d4c8' : '#8a3a2a');
  } else if (k === 'bar') {
    for (const z of [40, 60, 80]) { onR(2, W - 2, z, z + 3, '#5a3a2a'); for (let x = 2.2; x < W - 2.2; x += 0.35) onR(x, x + 0.15, z + 3, z + 13, ['#3a7a4a', '#a83a2a', '#c9a23e', '#5a4a8a'][Math.floor(x * 3) % 4]); }
    onR(mid - 1.5, mid + 1.5, 86, 92, night ? '#ff4ab0' : '#c94a8a');
  } else if (k === 'salon') {
    for (let x = 2; x < W - 3; x += 2) onR(x + 0.1, x + 0.9, 30, 70, '#c8dce4');
  } else if (k === 'dept') {
    // 22차 백화점: 뒤 벽 위 금빛 간판 띠와 층 안내판, 높은 유리창
    onR(2, W - 2, 84, 92, info.trim); onR(mid - 3, mid + 3, 60, 78, '#2a2622');
    for (let n = 0; n < 4; n++) onR(mid - 2.6, mid - 2.6 + 4.2 - n * 0.6, 63 + n * 4, 65 + n * 4, '#e8d8a8');
    winL(2, H - 3, 30, 76, night ? '#2a3448' : '#bcd4e2');
  } else if (k === 'mart' || k === 'shop') {
    onR(W - 5, W - 2, 66, 76, info.trim);
    onR(2, W - 6, 80, 86, mixHex(info.trim, '#ffffff', 0.35)); // 19차: 뒤 벽 위 간판 띠
  } else if (k === 'gym') {
    // 거울 벽과 붉은 띠, 동기 부여 문구판
    onR(2, W - 2, 12, 72, night ? '#5a6a80' : '#a8c0d0'); for (let x = 3; x < W - 2; x += 2.5) onR(x, x + 0.08, 12, 72, '#7a8a9a');
    onR(2, W - 2, 76, 82, info.trim);
    winL(2, 6, 30, 70, night ? '#22304a' : '#a8c8d8');
  } else if (k === 'rebirth') {
    // 창구 위 번호판(붉은 숫자) · 가운데 큰 안내판 · 시계
    for (let n = 0; n < 5; n++) {
      const x0 = 2 + n * 4;
      onR(x0 + 0.6, x0 + 2.4, 70, 84, '#20262c');
      const [nx, ny] = P(x0 + 1.5, 1, 80);
      g.fillStyle = n === 2 ? '#ff4a3a' : '#c8302a'; g.font = 'bold 9px monospace'; g.textAlign = 'center'; g.fillText(String(n + 1), nx, ny + 3);
      onR(x0 + 0.3, x0 + 2.7, 56, 58, info.trim);
    }
    winL(2, 6, 30, 86, night ? '#2a3448' : '#cfe0ea'); winL(8, 12, 30, 86, night ? '#2a3448' : '#cfe0ea');
    { const [cx, cy] = P(1, 14, 76); g.fillStyle = '#f4f4f0'; g.beginPath(); g.ellipse(cx, cy, 6, 7, 0, 0, Math.PI * 2); g.fill(); g.strokeStyle = '#2a2a2a'; g.lineWidth = 1; g.beginPath(); g.moveTo(cx, cy); g.lineTo(cx, cy - 5); g.moveTo(cx, cy); g.lineTo(cx + 3, cy + 1); g.stroke(); }
  } else if (k === 'hbank') {
    onR(2, W - 2, 56, 62, '#5a4a2a'); onR(2, W - 2, 64, 66, '#c9a23e');
    for (let x = 2.5; x < W - 2; x += 2) { const [cx, cy] = P(x, 1, 74); g.fillStyle = '#b8902a'; g.beginPath(); g.ellipse(cx, cy, 5, 4, 0, 0, Math.PI * 2); g.fill(); g.fillStyle = '#2a1a0c'; g.fillRect(Math.round(cx) - 1, Math.round(cy) - 1, 3, 2); }
  } else if (k === 'atone') {
    onR(mid, mid + 0.25, 30, 92, '#6a2a22');
    { const [hx, hy] = P(mid + 0.12, 1, 78); g.strokeStyle = '#c9a23e'; g.lineWidth = 2; g.beginPath(); g.ellipse(hx, hy, 12, 8, 0, 0.4, Math.PI * 2 - 0.3); g.stroke(); }
    for (let x = 2; x < W - 2; x += 3) for (let z = 20; z < 90; z += 4) onR(x, x + 0.06, z, z + 2, '#5a5650');
  } else if (k === 'goatroom') {
    // 32차 염소대왕의 방 (높은 벽): 금빛 글자를 수놓은 긴 붉은 깃발 · 벽을 타고 내려오는 쇠사슬
    const hz = 2.3; // 깃발 길이 (벽이 높다)
    const banner = (x0: number, z0: number, onLeft: boolean) => {
      const quad = (a: number, b: number, z1: number, z2: number, col: string) => onLeft ? poly([P(1, a, z1), P(1, b, z1), P(1, b, z2), P(1, a, z2)], col) : onR(a, b, z1, z2, col);
      const L = 62 * hz;
      quad(x0 - 0.05, x0 + 0.85, z0 - 2, z0 + L, '#3a0a0c');
      quad(x0, x0 + 0.8, z0, z0 + L - 2, '#8a1418');
      quad(x0 + 0.06, x0 + 0.74, z0 + 3, z0 + L - 5, '#a8181c');
      quad(x0, x0 + 0.8, z0 + L - 4, z0 + L, '#c9a23e');
      for (let n = 0; n < 4; n++) {
        const zc = z0 + L - 26 - n * 28;
        quad(x0 + 0.3, x0 + 0.5, zc - 8, zc + 8, '#d9b44a');
        quad(x0 + 0.16, x0 + 0.64, zc - 1.5, zc + 1.5, '#d9b44a');
        quad(x0 + 0.24, x0 + 0.3, zc - 6, zc - 3, '#e8c86a');
      }
      for (let n = 0; n < 4; n++) quad(x0 + 0.1 + n * 0.18, x0 + 0.16 + n * 0.18, z0 - 12, z0, n % 2 ? '#c9a23e' : '#8a1418');
    };
    for (const x0 of [7.3, 12.4, W - 3.2]) banner(x0, 70, false);
    for (const y0 of [7.3, 12.4, H - 3.2]) banner(y0, 70, true);
    const chain = (x0: number, onLeft: boolean) => { for (let z = WALL - 8; z > 40; z -= 5) { const q = (z / 5) % 2; if (onLeft) poly([P(1, x0, z), P(1, x0 + 0.12, z), P(1, x0 + 0.12, z - 4), P(1, x0, z - 4)], q ? '#3a3638' : '#5a5458'); else onR(x0 + (q ? 0.02 : 0), x0 + 0.1 + (q ? 0 : 0.02), z - 4, z, q ? '#3a3638' : '#5a5458'); } };
    for (const x0 of [9.2, 14.0]) { chain(x0, false); chain(x0, true); }
  } else if (k === 'lobby') {
    winL(2, 3, 0, 64, '#8a8a84'); winL(4, 5, 0, 64, '#8a8a84'); // 승강기 문
    onR(3, W - 3, 60, 66, '#c9a23e');
  }
  // ── 25차: 벽에 사는 흔적 — 시계 · 달력 · 액자 · 포스터 · 홍등 · 족자 · 벽보 ──
  const clock = (x: number, z: number) => {
    const [cx, cy] = P(x, 1, z);
    g.fillStyle = '#3a2e26'; g.beginPath(); g.ellipse(cx, cy, 7, 8, 0, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#f4f2ea'; g.beginPath(); g.ellipse(cx, cy, 5.5, 6.5, 0, 0, Math.PI * 2); g.fill();
    g.strokeStyle = '#2a2a2a'; g.lineWidth = 1; g.beginPath(); g.moveTo(cx, cy); g.lineTo(cx, cy - 4.5); g.moveTo(cx, cy); g.lineTo(cx + 3, cy + 1.5); g.stroke();
  };
  const frame = (x0: number, x2: number, z0: number, z1: number, inner: string, edge = '#5a4030') => { onR(x0, x2, z0, z1, edge); onR(x0 + 0.08, x2 - 0.08, z0 + 2, z1 - 2, inner); };
  const calendar = (x: number, z: number) => { onR(x, x + 0.7, z, z + 18, '#f4f0e6'); onR(x, x + 0.7, z + 14, z + 18, '#c8302a'); for (let r = 0; r < 3; r++) for (let q = 0; q < 4; q++) onR(x + 0.08 + q * 0.15, x + 0.14 + q * 0.15, z + 3 + r * 3.5, z + 4.5 + r * 3.5, r === 1 && q === 2 ? '#c8302a' : '#8a8478'); };
  const leftPaper = (y: number, z: number, col = '#efe8d4') => { poly([P(1, y, z), P(1, y + 0.55, z), P(1, y + 0.55, z + 12), P(1, y, z + 12)], col); poly([P(1, y + 0.05, z + 9), P(1, y + 0.5, z + 9), P(1, y + 0.5, z + 10), P(1, y + 0.05, z + 10)], '#8a8478'); };
  if (k === 'bank' || k === 'lobby' || k === 'laundry' || k === 'food' || k === 'clinic' || k === 'loan' || k === 'hbank') clock(k === 'food' ? W - 2.4 : mid + 2.6, 78);
  if (k === 'clinic') {
    // 시력표: 흰 판에 아래로 갈수록 작아지는 검은 글자 줄
    onR(mid - 1.6, mid - 0.4, 36, 74, '#f4f4ee'); for (let r = 0; r < 6; r++) { const half = 0.42 - r * 0.06; onR(mid - 1 - half, mid - 1 + half, 68 - r * 5.5, 70.5 - r * 5.5, '#1e1e1e'); }
    frame(mid + 0.4, mid + 1.8, 40, 62, '#cfe6e0');
  } else if (k === 'food') {
    // 홍등: 벽 위로 걸린 줄에 붉은 등 다섯
    onR(1.5, W - 1.5, 90, 91, '#2a2a2a');
    for (let x = 2.2; x < W - 2; x += (W - 4) / 5) { const [lx, ly] = P(x, 1, 84); g.fillStyle = '#c8282a'; g.beginPath(); g.ellipse(lx, ly, 5, 6, 0, 0, Math.PI * 2); g.fill(); g.fillStyle = '#e8b83a'; g.fillRect(Math.round(lx) - 3, Math.round(ly) - 7, 6, 2); g.fillRect(Math.round(lx) - 3, Math.round(ly) + 5, 6, 2); if (night) { g.fillStyle = 'rgba(255,120,80,0.25)'; g.beginPath(); g.ellipse(lx, ly, 10, 11, 0, 0, Math.PI * 2); g.fill(); } }
  } else if (k === 'cafe') {
    // 컵 선반: 나무 선반 둘에 색 다른 머그
    for (const z of [40, 52]) { onR(W - 5, W - 2, z, z + 2, '#6a4a32'); for (let x = W - 4.8; x < W - 2.3; x += 0.42) onR(x, x + 0.26, z + 2, z + 7, ['#f2ece0', '#c86a4a', '#3a6a8a', '#e8c86a'][Math.floor(x * 7) % 4]); }
    frame(2, 3.4, 44, 66, '#8aa86a');
  } else if (k === 'massage') {
    // 족자 둘 (먹으로 친 대나무) · 난초 액자
    for (const x of [2.2, 4.4]) { onR(x, x + 0.9, 30, 78, '#efe6cc'); onR(x - 0.05, x + 0.95, 77, 80, '#6a4a2a'); onR(x - 0.05, x + 0.95, 28, 31, '#6a4a2a'); for (let n = 0; n < 3; n++) onR(x + 0.3 + n * 0.12, x + 0.34 + n * 0.12, 36 + n * 3, 70 - n * 4, '#3a4a3a'); }
    frame(mid + 1, mid + 2.4, 46, 64, '#e8dcf0');
  } else if (k === 'salon') {
    // 머리 모양 포스터 셋
    for (let n = 0; n < 3; n++) { const x0 = 2.2 + n * 1.6; frame(x0, x0 + 1.2, 74, 92, ['#f2d8e0', '#d8e8f2', '#f2ecd0'][n], '#c96a8a'); const [hx, hy] = P(x0 + 0.6, 1, 82); g.fillStyle = ['#3a2a22', '#c89a4a', '#1e1e1e'][n]; g.beginPath(); g.ellipse(hx, hy - 1, 4, 4.5, 0, 0, Math.PI * 2); g.fill(); g.fillStyle = '#e8c8a8'; g.beginPath(); g.ellipse(hx, hy + 1, 2.5, 3, 0, 0, Math.PI * 2); g.fill(); }
  } else if (k === 'laundry') {
    // 요금표 (파란 판) · 벽에 붙은 안내문
    onR(mid - 1.5, mid + 1, 50, 74, '#2a5a8a'); for (let r = 0; r < 4; r++) onR(mid - 1.3, mid + 0.6 - (r % 2) * 0.4, 66 - r * 5, 68 - r * 5, '#e8f0f8');
    leftPaper(3, 44);
  } else if (k === 'home') {
    // 바랜 벽지 잔꽃 · 물 얼룩 · 가족사진 액자 · 달력 · 벽시계
    for (let x = 1.6; x < W - 1.5; x += 0.7) for (let z = 16; z < 86; z += 12) { const [dx, dy] = P(x + ((z * 7) % 5) / 20, 1, z); g.fillStyle = 'rgba(160,120,90,0.35)'; g.fillRect(Math.round(dx), Math.round(dy), 2, 2); }
    { const [sx, sy] = P(W - 3.2, 1, 82); g.fillStyle = 'rgba(120,96,60,0.22)'; g.beginPath(); g.ellipse(sx, sy, 16, 7, 0.3, 0, Math.PI * 2); g.fill(); }
    frame(mid - 0.6, mid + 0.8, 52, 70, '#c8b8a0', '#4a3a2a');
    { const [px, py] = P(mid + 0.1, 1, 61); g.fillStyle = '#6a5a4a'; g.beginPath(); g.ellipse(px - 3, py, 2.5, 3, 0, 0, Math.PI * 2); g.ellipse(px + 3, py + 1, 2, 2.5, 0, 0, Math.PI * 2); g.fill(); }
    calendar(mid + 1.6, 50);
    clock(mid - 2, 74);
  } else if (k === 'loan') {
    // 압류 딱지 같은 벽보들 (붉은 도장)
    for (let n = 0; n < 5; n++) { const x0 = 2 + n * 0.9; onR(x0, x0 + 0.6, 50 + (n % 2) * 8, 64 + (n % 2) * 8, '#e8dcc0'); const [sx, sy] = P(x0 + 0.42, 1, 54 + (n % 2) * 8); g.fillStyle = '#a8201a'; g.beginPath(); g.ellipse(sx, sy, 2.5, 2.5, 0, 0, Math.PI * 2); g.fill(); }
  } else if (k === 'mart') {
    // 특가 포스터 (노란 바탕 · 붉은 띠)
    for (const x of [2.4, 4.6]) { onR(x, x + 1.4, 56, 74, '#f2d23a'); onR(x, x + 1.4, 66, 70, '#c8302a'); }
  } else if (k === 'shop' || k === 'pharmacy') {
    frame(mid - 1, mid + 0.6, 44, 62, k === 'pharmacy' ? '#e8f2e8' : '#e8e0d0');
  } else if (k === 'lobby' || k === 'bank') {
    frame(mid - 1.6, mid + 1, 40, 58, k === 'bank' ? '#3a5a7a' : '#7a8a5a', '#8a6a3a');
  }
  // 벽 모서리 기둥
  poly([P(1, 1, 0), P(1.06, 1, 0), P(1.06, 1, WALL), P(1, 1, WALL)], mixHex(info.trim, '#000000', 0.4));
  return { canvas: c, x: minX, y: minY };
}

/** 가구 하나 (바닥 사각형 i·j·w·d, 높이 h) */
export function drawFurn(f: Furn, info: InteriorInfo, night: boolean): { canvas: HTMLCanvasElement; x: number; y: number } {
  if (f.kind === 'boat' || f.kind === 'netpole' || f.kind === 'drift' || f.kind === 'flot') return drawShoreFurn(f);
  if (f.kind === 'shuttle') { const e = document.createElement('canvas'); e.width = e.height = 1; return { canvas: e, x: 0, y: 0 }; } // 우주선은 장면이 따로 세운다 (떠오를 수 있게)
  if (f.kind === 'cardtable') {
    // 구름 대리석 작은 탁자 위에 펼친 카드 (천사 둘의 노름 — 판돈은 없다)
    const [x, y] = [(f.i - f.j) * (TW / 2), (f.i + f.j + 1) * (TH / 2)];
    const c = document.createElement('canvas'); c.width = 72; c.height = 44;
    const g = c.getContext('2d')!;
    g.fillStyle = 'rgba(120,110,140,0.25)'; g.beginPath(); g.ellipse(36, 36, 26, 8, 0, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#d8cfbe'; g.fillRect(33, 22, 6, 14);
    g.fillStyle = '#efe8da'; g.beginPath(); g.ellipse(36, 20, 28, 11, 0, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#c9a23e'; g.beginPath(); g.ellipse(36, 22, 28, 11, 0, 0, Math.PI); g.fill(); g.fillStyle = '#efe8da'; g.beginPath(); g.ellipse(36, 20, 28, 10, 0, 0, Math.PI * 2); g.fill();
    const cards: [number, number, string][] = [[22, 17, '#ffffff'], [27, 15, '#ffffff'], [44, 18, '#ffffff'], [48, 21, '#ffffff'], [34, 19, '#b8282a']];
    for (const [cx2, cy2, col] of cards) { g.fillStyle = '#4a3a2a'; g.fillRect(cx2, cy2 + 1, 6, 4); g.fillStyle = col; g.fillRect(cx2, cy2, 6, 4); g.fillStyle = col === '#ffffff' ? '#b8282a' : '#ffffff'; g.fillRect(cx2 + 2, cy2 + 1, 2, 2); }
    return { canvas: c, x: x - 36, y: y - 28 };
  }
  const { i, j, w, d, h } = f;
  const i1 = i + w, j1 = j + d;
  const extra = f.kind === 'gkbrazier' ? 40 : f.kind === 'gkdesk' ? 20 : f.kind === 'altar' ? 64 : f.kind === 'rgate' ? 46 : f.kind === 'cpillar' ? 30 : f.kind === 'salonchair' || f.kind === 'candle' || f.kind === 'fan' || f.kind === 'lamp' || f.kind === 'cooler' ? 18 : 14;
  const minX = (i - j1) * (TW / 2) - 4, maxX = (i1 - j) * (TW / 2) + 4;
  const minY = (i + j) * (TH / 2) - h - extra, maxY = (i1 + j1) * (TH / 2) + 4;
  const { c, g, P, poly } = painter(minX, minY, maxX - minX, maxY - minY);
  const box = (x0: number, y0: number, x2: number, y2: number, z0: number, z1: number, top: string, left: string, right: string) => {
    poly([P(x2, y0, z0), P(x2, y2, z0), P(x2, y2, z1), P(x2, y0, z1)], right);
    poly([P(x0, y2, z0), P(x2, y2, z0), P(x2, y2, z1), P(x0, y2, z1)], left);
    poly([P(x0, y0, z1), P(x2, y0, z1), P(x2, y2, z1), P(x0, y2, z1)], top);
  };
  const tri = (base: string) => [mixHex(base, '#ffffff', 0.18), base, mixHex(base, '#000000', 0.25)] as const;
  const B3 = (x0: number, y0: number, x2: number, y2: number, z0: number, z1: number, col: string) => { const [a, b, cc] = tri(col); box(x0, y0, x2, y2, z0, z1, a, b, cc); };
  const faceL = (x0: number, x2: number, z0: number, z1: number, col: string) => poly([P(x0, j1, z0), P(x2, j1, z0), P(x2, j1, z1), P(x0, j1, z1)], col);
  const faceR = (y0: number, y2: number, z0: number, z1: number, col: string) => poly([P(i1, y0, z0), P(i1, y2, z0), P(i1, y2, z1), P(i1, y0, z1)], col);
  const prod = ['#c9302a', '#2a6aa8', '#e8c02a', '#3a9a5a', '#e87a2a', '#8a4ac9', '#f2f2ea'];
  const pick = (n: number) => prod[(n * 7 + (f.v ?? 0) * 3) % prod.length];
  // 그림자
  poly([P(i, j1, 0), P(i1, j1, 0), P(i1 + 0.12, j1 + 0.12, 0), P(i + 0.12, j1 + 0.12, 0)], '#000000', 0.18);
  switch (f.kind) {
    case 'counter': case 'kitchen': case 'bar': case 'teller': {
      const wood = f.kind === 'bar' ? '#4a2a22' : f.kind === 'teller' ? '#6a7a8a' : f.kind === 'kitchen' ? '#8a8a86' : info.trim;
      B3(i, j, i1, j1, 0, h - 3, wood);
      box(i - 0.05, j - 0.05, i1 + 0.05, j1 + 0.05, h - 3, h, '#e8e4dc', '#c8c4bc', '#b0aca4');
      if (f.kind === 'teller') { poly([P(i, j + 0.5, h), P(i1, j + 0.5, h), P(i1, j + 0.5, h + 34), P(i, j + 0.5, h + 34)], '#bcdce8', 0.35); for (let x = i + 1; x < i1; x += 1.5) poly([P(x, j + 0.5, h), P(x + 0.04, j + 0.5, h), P(x + 0.04, j + 0.5, h + 34), P(x, j + 0.5, h + 34)], '#8a9aa8'); }
      if (f.kind === 'kitchen') { for (let x = i + 0.3; x < i1 - 0.5; x += 1.3) { B3(x, j + 0.2, x + 0.5, j + 0.7, h, h + 6, '#3a3a3a'); } }
      if (f.kind === 'counter') B3(i1 - 0.8, j + 0.2, i1 - 0.3, j + 0.7, h, h + 7, '#2a2a2a'); // 계산대
      if (f.kind === 'bar') for (let x = i + 0.4; x < i1; x += 0.9) B3(x, j + 0.3, x + 0.12, j + 0.42, h, h + 8, pick(Math.floor(x * 5)));
      break;
    }
    case 'shelf': {
      B3(i, j, i1, j1, 0, h, '#8a8a86');
      for (let z = 6; z < h - 4; z += 11) {
        for (let x = i + 0.05; x < i1 - 0.1; x += 0.22) faceL(x, x + 0.16, z, z + 7, pick(Math.floor(x * 11 + z)));
        for (let y = j + 0.05; y < j1 - 0.1; y += 0.22) faceR(y, y + 0.16, z, z + 7, pick(Math.floor(y * 13 + z)));
      }
      break;
    }
    case 'fridge': {
      B3(i, j, i1, j1, 0, h, '#d8dcde');
      faceL(i + 0.08, i1 - 0.08, 6, h - 8, night ? '#cfe8f2' : '#bcdce8');
      for (let z = 10; z < h - 10; z += 10) for (let x = i + 0.15; x < i1 - 0.1; x += 0.18) faceL(x, x + 0.08, z, z + 7, pick(Math.floor(x * 9 + z)));
      faceR(j + 0.1, j1 - 0.1, 6, h - 8, '#a8c8d4');
      break;
    }
    case 'table': {
      box(i + 0.1, j + 0.1, i1 - 0.1, j1 - 0.1, h - 3, h, '#c89a6a', '#9a6a42', '#7a5232');
      B3(i + 0.42, j + 0.42, i + 0.58, j + 0.58, 0, h - 3, '#4a3424');
      const [px, py] = P(i + 0.5, j + 0.5, h);
      g.fillStyle = '#f2f0e8'; g.beginPath(); g.ellipse(px, py, 7, 3.5, 0, 0, Math.PI * 2); g.fill();
      g.fillStyle = pick(f.v ?? 1); g.beginPath(); g.ellipse(px, py - 1, 4, 2, 0, 0, Math.PI * 2); g.fill();
      break;
    }
    case 'chair': case 'stool': B3(i + 0.25, j + 0.25, i1 - 0.25, j1 - 0.25, 0, h, f.kind === 'stool' ? '#5a3a2a' : '#6a7a8a'); break;
    case 'bench': B3(i + 0.05, j + 0.2, i1 - 0.05, j1 - 0.2, 0, h, '#6a7a8a'); break;
    case 'sofa': B3(i + 0.05, j + 0.05, i1 - 0.05, j1 - 0.05, 0, h, '#7a4a5a'); B3(i + 0.05, j + 0.05, i + 0.3, j1 - 0.05, h, h + 10, '#6a3a4a'); break;
    case 'bed': {
      B3(i + 0.05, j + 0.05, i1 - 0.05, j1 - 0.05, 0, h - 4, '#a8b0b4');
      box(i + 0.05, j + 0.05, i1 - 0.05, j1 - 0.05, h - 4, h, '#f4f4f0', '#dcdcd8', '#c8c8c4');
      B3(i + 0.15, j + 0.1, i1 - 0.15, j + 0.45, h, h + 3, '#ffffff');
      poly([P(i1 + 0.05, j, 0), P(i1 + 0.05, j1, 0), P(i1 + 0.05, j1, 50), P(i1 + 0.05, j, 50)], '#9ac8c0', 0.5); // 커튼
      break;
    }
    case 'altar': {
      if (f.v === 1) { B3(i, j, i1, j1, 0, h, '#e8e2d4'); faceL(i + 0.2, i1 - 0.2, 4, h - 4, '#c9a23e'); B3(i + w / 2 - 0.1, j + 0.4, i + w / 2 + 0.1, j + 0.6, h, h + 12, '#c9a23e'); break; }
      if (f.v === 3) { B3(i, j, i1, j1, 0, h, '#4a4440'); faceL(i + 0.2, i1 - 0.2, 4, h - 4, '#2a2420'); for (let n = 0; n < 5; n++) { const [cx, cy] = P(i + 0.4 + n * 0.5, j + 0.5, h); g.fillStyle = '#efe6d0'; g.fillRect(Math.round(cx) - 1, Math.round(cy) - 7, 2, 7); g.fillStyle = '#ffc04a'; g.fillRect(Math.round(cx) - 1, Math.round(cy) - 10, 2, 3); } break; }
      if (f.v === 2) { B3(i, j, i1, j1, 0, h, '#c9822a'); box(i, j, i1, j1, h + 36, h + 40, '#e8a23a', '#c9822a', '#a8621a'); for (const [x, y] of [[i, j1], [i1, j1], [i1, j]] as const) poly([P(x - 0.03, y, h), P(x + 0.03, y, h), P(x + 0.03, y, h + 36), P(x - 0.03, y, h + 36)], '#c9a23e'); break; }
      // 불단: 붉은·금빛 계단 + 금빛 불상
      B3(i, j, i1, j1, 0, h * 0.5, '#a8282a'); B3(i + 0.3, j + 0.2, i1 - 0.3, j1 - 0.2, h * 0.5, h, '#c9a23e');
      const [bx, by] = P(i + w / 2, j + d / 2, h);
      g.fillStyle = '#d9b04a'; g.beginPath(); g.ellipse(bx, by - 8, 16, 9, 0, 0, Math.PI * 2); g.fill(); // 무릎
      g.fillStyle = '#e0b84e'; g.beginPath(); g.ellipse(bx, by - 26, 9, 15, 0, 0, Math.PI * 2); g.fill(); // 몸
      g.fillStyle = '#ecc866'; g.beginPath(); g.ellipse(bx, by - 46, 6, 7, 0, 0, Math.PI * 2); g.fill(); // 머리
      g.fillStyle = '#c9a23e'; g.fillRect(Math.round(bx) - 1, Math.round(by) - 58, 3, 6); // 육계
      g.fillStyle = '#f6e6a0'; g.globalAlpha = 0.25; g.beginPath(); g.ellipse(bx, by - 34, 22, 30, 0, 0, Math.PI * 2); g.fill(); g.globalAlpha = 1;
      for (const x of [i + 0.3, i1 - 0.3]) { const [fx, fy] = P(x, j1 - 0.2, h * 0.5); g.fillStyle = '#f2a03a'; g.beginPath(); g.ellipse(fx, fy - 4, 4, 4, 0, 0, Math.PI * 2); g.fill(); }
      break;
    }
    case 'rgate': {
      // 환생의 문: 흰 대리석 기둥 둘과 둥근 아치, 금띠. 열린 문 안으로 아래 세상의 빛이 위로 비쳐 오른다.
      // 아치 위에는 루엔의 별 가시 후광과 같은 금빛 별
      const yz = j + 0.5, top = h - 16, spring = h - 40;
      const xa = i + 0.95, xb = i1 - 0.95, cxm = (xa + xb) / 2, rr = (xb - xa) / 2;
      // 문 안의 빛 (아래가 밝은 하늘빛 → 위로 흰빛)
      for (let n = 0; n < 14; n++) {
        const z0 = (n / 14) * spring, z1 = ((n + 1) / 14) * spring;
        poly([P(xa, yz, z0), P(xb, yz, z0), P(xb, yz, z1), P(xa, yz, z1)], mixHex('#9fc4ec', '#fffaf0', n / 13));
      }
      { const pts: Pt[] = [P(xa, yz, spring)]; for (let k = 0; k <= 12; k++) { const a = Math.PI - (k / 12) * Math.PI; pts.push(P(cxm + Math.cos(a) * rr, yz, spring + Math.sin(a) * (top - spring))); } pts.push(P(xb, yz, spring)); poly(pts, '#fffdf6'); }
      // 빛줄기와 반짝임
      for (let n = 0; n < 5; n++) { const x = xa + 0.25 + n * ((xb - xa - 0.5) / 4); poly([P(x - 0.04, yz, 0), P(x + 0.04, yz, 0), P(x + 0.02, yz, spring - 6), P(x - 0.02, yz, spring - 6)], '#ffffff', 0.55); }
      for (let n = 0; n < 9; n++) { const [sx, sy] = P(xa + ((n * 37) % 10) / 10 * (xb - xa), yz, 8 + ((n * 23) % 9) * 6); g.fillStyle = '#ffffff'; g.fillRect(Math.round(sx), Math.round(sy), 1, 1); g.fillRect(Math.round(sx) - 1, Math.round(sy), 3, 1); g.fillRect(Math.round(sx), Math.round(sy) - 1, 1, 3); }
      // 아치 테 (문 둘레 대리석) — 앞면만
      { const outer: Pt[] = []; const inner: Pt[] = []; for (let k = 0; k <= 12; k++) { const a = Math.PI - (k / 12) * Math.PI; outer.push(P(cxm + Math.cos(a) * (rr + 0.18), j1, spring + Math.sin(a) * (top - spring + 6))); inner.push(P(cxm + Math.cos(a) * rr, j1, spring + Math.sin(a) * (top - spring))); } poly([...outer, ...inner.reverse()], '#ece6d8'); }
      // 기둥 (받침·몸·머리)
      for (const x0 of [i + 0.1, i1 - 0.9]) {
        B3(x0 - 0.05, j + 0.05, x0 + 0.85, j1 - 0.05, 0, 8, '#e2dccf');
        B3(x0 + 0.08, j + 0.15, x0 + 0.72, j1 - 0.15, 8, top, '#f4f0e8');
        for (let q = 0; q < 3; q++) faceL(x0 + 0.18 + q * 0.2, x0 + 0.22 + q * 0.2, 12, top - 4, '#ddd7ca');
        B3(x0 - 0.05, j + 0.05, x0 + 0.85, j1 - 0.05, top - 6, top, '#d9b44a');
      }
      // 상인방과 금띠, 위의 별
      B3(i, j + 0.05, i1, j1 - 0.05, top, h, '#f2eee6');
      faceL(i + 0.1, i1 - 0.1, top + 5, top + 8, '#c9a23e');
      { const [sx, sy] = P(i + w / 2, j1, h + 20);
        g.fillStyle = '#fff4c8'; g.globalAlpha = 0.35; g.beginPath(); g.ellipse(sx, sy, 24, 24, 0, 0, Math.PI * 2); g.fill(); g.globalAlpha = 1;
        g.strokeStyle = '#d9b44a'; g.lineWidth = 2;
        for (let k = 0; k < 8; k++) { const a = (k / 8) * Math.PI * 2 + Math.PI / 8, L2 = k % 2 ? 11 : 18; g.beginPath(); g.moveTo(sx + Math.cos(a) * 5, sy + Math.sin(a) * 5); g.lineTo(sx + Math.cos(a) * L2, sy + Math.sin(a) * L2); g.stroke(); }
        g.fillStyle = '#f2d27a'; g.beginPath(); g.ellipse(sx, sy, 5, 5, 0, 0, Math.PI * 2); g.fill(); }
      break;
    }
    case 'cpillar': {
      // 등불 기둥: 구름 받침 위 흰 기둥, 금빛 머리, 위에 작은 등불 (루엔의 등불과 같은 빛)
      B3(i + 0.22, j + 0.22, i1 - 0.22, j1 - 0.22, 0, h, '#f4f0e8');
      faceL(i + 0.3, i + 0.34, 6, h - 6, '#ddd7ca'); faceL(i + 0.6, i + 0.64, 6, h - 6, '#ddd7ca');
      B3(i + 0.12, j + 0.12, i1 - 0.12, j1 - 0.12, h - 5, h, '#d9b44a');
      const [lx, ly] = P(i + 0.5, j + 0.5, h);
      g.fillStyle = '#fff2c0'; g.globalAlpha = 0.3; g.beginPath(); g.ellipse(lx, ly - 12, 18, 18, 0, 0, Math.PI * 2); g.fill(); g.globalAlpha = 1;
      g.fillStyle = '#c9a23e'; g.fillRect(Math.round(lx) - 5, Math.round(ly) - 4, 10, 3);
      g.fillStyle = '#fff6d8'; g.fillRect(Math.round(lx) - 4, Math.round(ly) - 17, 8, 13);
      g.fillStyle = '#f2c85a'; g.fillRect(Math.round(lx) - 2, Math.round(ly) - 13, 4, 6);
      g.fillStyle = '#c9a23e'; g.fillRect(Math.round(lx) - 5, Math.round(ly) - 19, 10, 2); g.fillRect(Math.round(lx) - 1, Math.round(ly) - 22, 2, 3);
      { const [bx, by] = P(i + 0.5, j + 0.5, 0); cloudPuff(g, bx - 6, by + 2, 11, 0.95); cloudPuff(g, bx + 8, by + 4, 9, 0.95); }
      break;
    }
    case 'cbench': B3(i + 0.05, j + 0.2, i1 - 0.05, j1 - 0.2, 6, h, '#f2eee6'); for (const x of [i + 0.15, i1 - 0.45]) B3(x, j + 0.25, x + 0.3, j1 - 0.25, 0, 6, '#d9d2c4'); faceL(i + 0.1, i1 - 0.1, h - 2, h, '#d9b44a'); break;
    case 'ledgerdesk': {
      // 검붉은 책상, 펼친 장부와 깃펜, 쌓인 노전, 앞판의 금 테
      box(i + 0.05, j + 0.1, i1 - 0.05, j1 - 0.1, 0, h, '#4a1e16', '#3a1410', '#2a0e0a');
      faceL(i + 0.15, i1 - 0.15, h - 6, h - 4, '#c9a23e'); faceL(i + 0.15, i1 - 0.15, 4, 6, '#c9a23e');
      box(i + 0.6, j + 0.25, i + 1.6, j + 0.75, h, h + 2, '#efe6cc', '#d8ccaa', '#c8b898'); // 펼친 장부
      { const [lx, ly] = P(i + 1.1, j + 0.5, h + 2); g.fillStyle = '#b8a888'; g.fillRect(Math.round(lx), Math.round(ly) - 4, 1, 8); g.fillStyle = '#5a3a2a'; for (let n = 0; n < 4; n++) g.fillRect(Math.round(lx) - 12 + n * 2, Math.round(ly) - 3 + n, 8, 1); }
      { const [qx, qy] = P(i + 1.55, j + 0.4, h + 2); g.strokeStyle = '#f2ece0'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(qx, qy); g.lineTo(qx + 6, qy - 12); g.stroke(); }
      for (let n = 0; n < 3; n++) for (let m = 0; m < 3 + n; m++) { const [cx, cy] = P(i1 - 0.9 + n * 0.22, j + 0.5, h + m * 2); g.fillStyle = m % 2 ? '#e8c86a' : '#c9a23e'; g.fillRect(Math.round(cx) - 3, Math.round(cy) - 1, 6, 2); }
      break;
    }
    case 'ledgers': {
      // 장부 서가: 검은 나무 칸마다 붉은·갈색 장부 등, 금 띠, 사슬로 묶은 칸
      B3(i, j, i1, j1, 0, h, '#2a1612');
      const spine = ['#6a1a14', '#4a2a1a', '#7a3a1a', '#3a1a14', '#8a2a1a'];
      for (let z = 6; z < h - 4; z += 12) {
        for (let x = i + 0.05; x < i1 - 0.1; x += 0.14) { faceL(x, x + 0.11, z, z + 9 - (Math.floor(x * 31) % 3), spine[Math.floor(x * 17 + z) % 5]); faceL(x, x + 0.11, z + 6, z + 6.8, '#c9a23e'); }
        faceL(i, i1, z - 1.5, z, '#1a0c0a');
      }
      for (const x of [i + w * 0.3, i + w * 0.72]) for (let z = 10; z < h - 8; z += 3) faceL(x, x + 0.04, z, z + 2, '#7a7670');
      break;
    }
    case 'safe': {
      // 쇠 금고: 리벳, 금 자물쇠
      box(i + 0.1, j + 0.1, i1 - 0.1, j1 - 0.1, 0, h, '#5a5652', '#3a3632', '#2a2622');
      faceL(i + 0.18, i1 - 0.18, 4, h - 4, '#2e2a26');
      for (const z of [6, h - 8]) for (const x of [i + 0.22, i1 - 0.26]) faceL(x, x + 0.04, z, z + 2, '#8a8680');
      { const [sx, sy] = P(i + 0.5, j1 - 0.1, h * 0.55); g.fillStyle = '#c9a23e'; g.beginPath(); g.arc(sx, sy, 5, 0, Math.PI * 2); g.fill(); g.fillStyle = '#2a2622'; g.beginPath(); g.arc(sx, sy, 2, 0, Math.PI * 2); g.fill(); g.fillStyle = '#e8c86a'; g.fillRect(Math.round(sx) - 1, Math.round(sy) - 7, 2, 3); }
      break;
    }
    case 'coinsacks': {
      // 노전 자루: 묶인 삼베 자루와 흘러나온 동전
      for (let n = 0; n < (f.v === 1 ? 3 : 2); n++) {
        const [cx, cy] = P(i + 0.3 + n * 0.25, j + 0.5 + (n % 2) * 0.15, 0);
        g.fillStyle = '#8a6a42'; g.beginPath(); g.ellipse(cx, cy - 7, 8, 8, 0, 0, Math.PI * 2); g.fill();
        g.fillStyle = '#a8865a'; g.beginPath(); g.ellipse(cx - 2, cy - 9, 4, 4, 0, 0, Math.PI * 2); g.fill();
        g.fillStyle = '#5a3a22'; g.fillRect(Math.round(cx) - 3, Math.round(cy) - 16, 6, 2);
        g.fillStyle = '#8a6a42'; g.fillRect(Math.round(cx) - 2, Math.round(cy) - 19, 4, 3);
      }
      for (let n = 0; n < 6; n++) { const [cx, cy] = P(i + 0.2 + n * 0.12, j1 - 0.1, 0); g.fillStyle = n % 2 ? '#e8c86a' : '#c9a23e'; g.fillRect(Math.round(cx), Math.round(cy) - 2, 3, 2); }
      break;
    }
    case 'candle': {
      B3(i + 0.35, j + 0.35, i1 - 0.35, j1 - 0.35, 0, h, '#c9a23e');
      for (let n = 0; n < 3; n++) { const [cx, cy] = P(i + 0.38 + n * 0.12, j + 0.5, h); g.fillStyle = '#f2ece0'; g.fillRect(Math.round(cx) - 1, Math.round(cy) - 8, 2, 8); g.fillStyle = '#ffc04a'; g.fillRect(Math.round(cx) - 1, Math.round(cy) - 11, 2, 3); }
      break;
    }
    case 'pew': B3(i, j + 0.3, i1, j1, 0, h, '#7a5232'); B3(i, j, i1, j + 0.3, 0, h + 14, '#6a4628'); break;
    case 'gkdesk': {
      // 31차 판관석: 검은 옻칠 · 금빛 테두리 · 앞에 늘어진 붉은 휘장(금빛 숫양 문장) · 위에 펼친 장부 · 붓 · 붉은 인장
      B3(i, j, i1, j1, 0, h - 4, '#1e1414');
      box(i - 0.08, j - 0.08, i1 + 0.08, j1 + 0.08, h - 4, h, '#3a2a22', '#2a1c18', '#22160f');
      faceL(i, i1, h - 6, h - 4, '#c9a23e'); faceL(i, i1, 2, 4, '#c9a23e'); faceR(j, j1, h - 6, h - 4, '#a8822e');
      faceL(i + 1.2, i1 - 1.2, 4, h - 7, '#7a1014'); faceL(i + 1.35, i1 - 1.35, 6, h - 9, '#8e1418');
      { const [cx, cy] = P(i + w / 2, j1, h / 2 + 1); g.fillStyle = '#c9a23e'; g.beginPath(); g.ellipse(cx, cy, 7, 6, 0, 0, Math.PI * 2); g.fill(); g.fillStyle = '#e8dcc0'; g.fillRect(Math.round(cx) - 2, Math.round(cy) - 3, 4, 5); g.fillStyle = '#7a1014'; g.fillRect(Math.round(cx) - 1, Math.round(cy) - 2, 1, 1); g.fillRect(Math.round(cx) + 1, Math.round(cy) - 2, 1, 1); g.strokeStyle = '#e8c86a'; g.lineWidth = 1.5; g.beginPath(); g.arc(cx - 5, cy - 1, 3, Math.PI * 0.2, Math.PI * 1.7); g.stroke(); g.beginPath(); g.arc(cx + 5, cy - 1, 3, Math.PI * 1.3, Math.PI * 0.8, true); g.stroke(); }
      for (let n = 0; n < 6; n++) { const x = i + 0.35 + n * ((w - 0.7) / 5); const [tx, ty] = P(x, j1, 4); g.fillStyle = n % 2 ? '#c9a23e' : '#8a1418'; g.fillRect(Math.round(tx) - 1, Math.round(ty), 2, 4); }
      box(i + 1.6, j + 0.25, i + 3.2, j + 0.75, h, h + 2, '#efe6cc', '#cfc4a6', '#bfb496'); // 펼친 장부
      poly([P(i + 2.4, j + 0.25, h + 2.1), P(i + 2.43, j + 0.25, h + 2.1), P(i + 2.43, j + 0.75, h + 2.1), P(i + 2.4, j + 0.75, h + 2.1)], '#8a8068');
      for (let n = 0; n < 5; n++) poly([P(i + 1.7, j + 0.32 + n * 0.08, h + 2.2), P(i + 2.3, j + 0.32 + n * 0.08, h + 2.2), P(i + 2.3, j + 0.34 + n * 0.08, h + 2.2), P(i + 1.7, j + 0.34 + n * 0.08, h + 2.2)], '#3a3028');
      B3(i + 3.6, j + 0.35, i + 3.85, j + 0.6, h, h + 5, '#8a1418'); // 인장
      poly([P(i + 0.7, j + 0.4, h + 1), P(i + 1.3, j + 0.6, h + 1), P(i + 1.3, j + 0.64, h + 1), P(i + 0.7, j + 0.44, h + 1)], '#2a1a12'); // 붓
      break;
    }
    case 'gkdais': {
      // 32차 옥좌의 단: 흑요석 두 단 · 금빛 모서리 · 위에 붉은 깔개
      B3(i, j, i1, j1, 0, h / 2, '#1e1a24');
      faceL(i, i1, h / 2 - 2, h / 2, '#c9a23e'); faceR(j, j1, h / 2 - 2, h / 2, '#8a6a22');
      box(i, j, i1 - 0.35, j1 - 0.35, h / 2, h, '#2e2838', '#221d2a', '#18141e');
      poly([P(i, j1 - 0.35, h - 2), P(i1 - 0.35, j1 - 0.35, h - 2), P(i1 - 0.35, j1 - 0.35, h), P(i, j1 - 0.35, h)], '#d9b44a');
      poly([P(i1 - 0.35, j, h - 2), P(i1 - 0.35, j1 - 0.35, h - 2), P(i1 - 0.35, j1 - 0.35, h), P(i1 - 0.35, j, h)], '#a8822e');
      poly([P(i + 0.4, j + 0.4, h + 0.2), P(i1 - 0.8, j + 0.4, h + 0.2), P(i1 - 0.8, j1 - 0.8, h + 0.2), P(i + 0.4, j1 - 0.8, h + 0.2)], '#5a0e14');
      poly([P(i + 0.55, j + 0.55, h + 0.3), P(i1 - 0.95, j + 0.55, h + 0.3), P(i1 - 0.95, j1 - 0.95, h + 0.3), P(i + 0.55, j1 - 0.95, h + 0.3)], '#7a1418');
      break;
    }
    case 'gkbrazier': {
      // 청동 화로: 세 발 · 넓은 사발 · 붉은 불꽃과 빛무리
      for (const [a, b] of [[0.3, 0.35], [0.7, 0.35], [0.5, 0.7]] as const) B3(i + a - 0.05, j + b - 0.05, i + a + 0.05, j + b + 0.05, 0, h - 8, '#4a3220');
      { const [cx, cy] = P(i + 0.5, j + 0.5, h - 6);
        g.fillStyle = '#5a3a1a'; g.beginPath(); g.ellipse(cx, cy + 3, 15, 7, 0, 0, Math.PI); g.fill();
        g.fillStyle = '#8a6a2a'; g.beginPath(); g.ellipse(cx, cy, 15, 6, 0, 0, Math.PI * 2); g.fill();
        g.fillStyle = '#2a0e08'; g.beginPath(); g.ellipse(cx, cy, 12, 4.5, 0, 0, Math.PI * 2); g.fill();
        const glow = g.createRadialGradient(cx, cy - 12, 2, cx, cy - 12, 28); glow.addColorStop(0, 'rgba(255,90,40,0.55)'); glow.addColorStop(1, 'rgba(255,40,20,0)');
        g.fillStyle = glow; g.beginPath(); g.ellipse(cx, cy - 12, 28, 24, 0, 0, Math.PI * 2); g.fill();
        for (const [dx, hh, col] of [[-6, 14, '#c8281e'], [5, 16, '#c8281e'], [-1, 22, '#ff4a2a'], [-3, 12, '#ff8a3a'], [3, 10, '#ffc04a']] as const) { g.fillStyle = col; g.beginPath(); g.moveTo(cx + dx - 4, cy); g.quadraticCurveTo(cx + dx - 3, cy - hh * 0.6, cx + dx, cy - hh); g.quadraticCurveTo(cx + dx + 3, cy - hh * 0.6, cx + dx + 4, cy); g.fill(); } }
      break;
    }
    case 'gkpillar': {
      // 검붉은 기둥 · 금빛 띠 셋 · 감아 내린 쇠사슬
      const x0 = i + 0.2, x2 = i1 - 0.2, y0 = j + 0.2, y2 = j1 - 0.2;
      box(x0, y0, x2, y2, 0, h, '#6a2a2c', '#521a1e', '#3a1014');
      // 금빛 띠 (옆면에만 — 위에서 보이는 판처럼 보이지 않게)
      for (const z of [6, h * 0.55, h - 12]) { poly([P(x0, y2, z), P(x2, y2, z), P(x2, y2, z + 4), P(x0, y2, z + 4)], '#c9a23e'); poly([P(x2, y0, z), P(x2, y2, z), P(x2, y2, z + 4), P(x2, y0, z + 4)], '#8a6a22'); }
      box(x0 - 0.06, y0 - 0.06, x2 + 0.06, y2 + 0.06, h, h + 5, '#d9b44a', '#a8822e', '#7a5a1e'); // 머리 받침
      for (let z = h - 16; z > 14; z -= 4) { const t = (z / 4) % 6, [cx, cy] = P(i + 0.2 + (t < 3 ? t : 6 - t) * 0.2, j1 - 0.15, z); g.fillStyle = (z / 4) % 2 ? '#4a4648' : '#6a6468'; g.fillRect(Math.round(cx) - 2, Math.round(cy) - 2, 4, 3); }
      break;
    }
    case 'cdesk': {
      // 상담 책상: 흰 상판, 회색 앞판, 모니터·서류 더미·명패 (가운데 창구는 장부와 깃펜)
      box(i + 0.05, j + 0.1, i1 - 0.05, j1 - 0.1, h - 3, h, '#f2f2ee', '#d8d8d4', '#c4c4c0');
      B3(i + 0.1, j + 0.15, i1 - 0.1, j1 - 0.15, 0, h - 3, '#7a8088');
      faceL(i + 0.2, i1 - 0.2, 6, h - 8, '#8a9098');
      if (f.v === 2) {
        box(i + 0.9, j + 0.25, i + 1.9, j + 0.75, h, h + 2, '#5a3a22', '#4a2e1a', '#3a2414'); // 펼친 낡은 장부
        box(i + 1.0, j + 0.3, i + 1.8, j + 0.7, h + 2, h + 3, '#efe6cc', '#d8ccaa', '#c8b898');
        { const [qx, qy] = P(i + 1.75, j + 0.4, h + 3); g.strokeStyle = '#e8e4dc'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(qx, qy); g.lineTo(qx + 6, qy - 12); g.stroke(); }
      } else {
        B3(i + 1.0, j + 0.35, i + 1.9, j + 0.5, h, h + 12, '#2a2e34'); faceL(i + 1.05, i + 1.85, h + 2, h + 11, night ? '#6ab8e8' : '#4a8ab8'); // 모니터
        for (let n = 0; n < 4; n++) box(i + 0.3, j + 0.3, i + 0.8, j + 0.7, h + n, h + n + 1, n % 2 ? '#f4f4f0' : '#e8e8e2', '#d8d8d2', '#c8c8c2');
      }
      B3(i + 2.2, j + 0.7, i + 2.7, j + 0.85, h, h + 4, '#c9a23e'); // 명패
      break;
    }
    case 'partition': B3(i + 0.4, j, i + 0.6, j1, 0, h, '#9aa4ac'); poly([P(i + 0.6, j, 8), P(i + 0.6, j1, 8), P(i + 0.6, j1, h - 4), P(i + 0.6, j, h - 4)], '#cfe0ea', 0.55); break;
    case 'rope': {
      // 줄 세우는 기둥: 은빛 기둥 사이 붉은 줄
      for (let n = 0; n <= d; n++) { const y = j + Math.min(d - 0.15, n) + 0.15; B3(i + 0.42, y - 0.06, i + 0.58, y + 0.06, 0, h + 6, '#b8bcc0'); B3(i + 0.38, y - 0.1, i + 0.62, y + 0.1, 0, 2, '#8a8e92'); }
      for (let n = 0; n < d; n++) { const ya = j + n + 0.15, yb = j + n + 1.15; const [ax, ay] = P(i + 0.5, ya, h + 4), [bx, by] = P(i + 0.5, Math.min(j1 - 0.15, yb), h + 4); g.strokeStyle = '#a8201a'; g.lineWidth = 2; g.beginPath(); g.moveTo(ax, ay); g.quadraticCurveTo((ax + bx) / 2, (ay + by) / 2 + 4, bx, by); g.stroke(); }
      break;
    }
    case 'offerbox': box(i + 0.25, j + 0.25, i1 - 0.25, j1 - 0.25, 0, h, '#5a3a22', '#4a2e1a', '#3a2414'); faceL(i + 0.35, i1 - 0.35, h - 6, h - 4, '#c9a23e'); { const [sx, sy] = P(i + 0.5, j + 0.5, h); g.fillStyle = '#0c0806'; g.fillRect(Math.round(sx) - 3, Math.round(sy) - 1, 6, 2); } break;
    case 'minbar': B3(i, j, i1, j1, 0, h, '#8a6a3a'); for (let n = 1; n < 4; n++) B3(i, j + (n - 1) * d / 4, i1, j + (n * d) / 4, 0, (h * n) / 4, '#a07a4a'); break;
    case 'atm': B3(i + 0.15, j + 0.15, i1 - 0.15, j1 - 0.15, 0, h, '#5a6a7a'); faceL(i + 0.3, i1 - 0.3, h - 20, h - 8, night ? '#8adcff' : '#6ab8d8'); faceL(i + 0.3, i1 - 0.3, h - 28, h - 24, '#2a2a2a'); break;
    case 'salonchair': {
      B3(i + 0.25, j + 0.3, i1 - 0.25, j1 - 0.2, 0, h, '#2a2a2a'); B3(i + 0.25, j + 0.15, i1 - 0.25, j + 0.3, h, h + 16, '#3a3a3a');
      break;
    }
    case 'mat': box(i, j + 0.1, i1, j1 - 0.1, 0, h, '#e8dcc0', '#c8a878', '#a88858'); B3(i + 0.1, j + 0.25, i + 0.5, j1 - 0.25, h, h + 3, '#f2f2ec'); break;
    case 'washer': B3(i + 0.08, j + 0.08, i1 - 0.08, j1 - 0.08, 0, h, '#e8eef2'); { const [wx, wy] = P(i + 0.5, j1 - 0.08, h * 0.5); g.fillStyle = '#5a6a7a'; g.beginPath(); g.ellipse(wx, wy, 7, 7, 0, 0, Math.PI * 2); g.fill(); g.fillStyle = '#a8c8e0'; g.beginPath(); g.ellipse(wx, wy, 5, 5, 0, 0, Math.PI * 2); g.fill(); } break;
    case 'island': {
      // 진열 탁자: 나무 상판 위에 개어 둔 물건·상자 무더기
      B3(i + 0.08, j + 0.12, i1 - 0.08, j1 - 0.12, 0, h - 3, '#b08a5e');
      box(i + 0.04, j + 0.08, i1 - 0.04, j1 - 0.08, h - 3, h, '#d8c8a8', '#b8a888', '#a09070');
      for (let x = i + 0.2; x < i1 - 0.25; x += 0.32) for (let n = 0; n < 2 + (Math.floor(x * 7) % 2); n++) B3(x, j + 0.3, x + 0.24, j + 0.7, h + n * 3, h + n * 3 + 3, pick(Math.floor(x * 11) + n));
      break;
    }
    case 'rack': {
      // 옷걸이: 쇠 기둥 두 개와 가로대, 걸린 옷들
      for (const y of [j + 0.15, j1 - 0.15]) B3(i + 0.45, y - 0.05, i + 0.55, y + 0.05, 0, h, '#8a8a8a');
      poly([P(i + 0.5, j + 0.15, h), P(i + 0.5, j1 - 0.15, h), P(i + 0.5, j1 - 0.15, h - 2), P(i + 0.5, j + 0.15, h - 2)], '#6a6a6a');
      for (let y = j + 0.25; y < j1 - 0.2; y += 0.16) poly([P(i + 0.5, y, h - 2), P(i + 0.5, y + 0.12, h - 2), P(i + 0.5, y + 0.12, h - 22), P(i + 0.5, y, h - 22)], pick(Math.floor(y * 13)));
      break;
    }
    case 'mirror': B3(i + 0.7, j + 0.1, i1 - 0.05, j1 - 0.1, 0, h, '#6a5a4a'); faceL(i + 0.72, i1 - 0.07, 4, h - 4, night ? '#7a8aa0' : '#c8dce8'); poly([P(i + 0.8, j1, 10), P(i + 0.86, j1, 10), P(i + 0.95, j1, h - 8), P(i + 0.89, j1, h - 8)], '#f2f8ff', 0.6); break;
    case 'baskets': for (let n = 0; n < 3; n++) B3(i + 0.2, j + 0.2, i1 - 0.2, j1 - 0.2, n * 2.5, n * 2.5 + 3, n % 2 ? '#c83a2a' : '#d84a3a'); break;
    case 'snackrack': B3(i + 0.3, j + 0.3, i1 - 0.3, j1 - 0.3, 0, h, '#5a5a5a'); for (let z = 6; z < h - 2; z += 6) for (let x = i + 0.32; x < i1 - 0.35; x += 0.12) faceL(x, x + 0.09, z, z + 4, pick(Math.floor(x * 17 + z))); break;
    case 'freezer': { B3(i + 0.05, j + 0.15, i1 - 0.05, j1 - 0.15, 0, h, '#e8ecee'); box(i + 0.1, j + 0.2, i1 - 0.1, j1 - 0.2, h, h + 1, night ? '#b8d8e8' : '#d2eef8', '#a8c8d8', '#98b8c8'); for (let x = i + 0.25; x < i1 - 0.2; x += 0.3) B3(x, j + 0.35, x + 0.2, j + 0.65, h - 6, h - 2, pick(Math.floor(x * 5))); break; }
    case 'treadmill': {
      // 러닝머신: 검은 벨트 · 앞쪽 손잡이 기둥과 화면
      box(i + 0.05, j + 0.25, i1 - 0.05, j1 - 0.25, 0, 6, '#2a2a2e', '#1e1e22', '#141418');
      box(i + 0.15, j + 0.3, i1 - 0.35, j1 - 0.3, 6, 7, '#3a3a3e', '#2a2a2e', '#202024');
      for (const y of [j + 0.28, j1 - 0.32]) B3(i1 - 0.3, y, i1 - 0.22, y + 0.06, 6, h, '#9a9ea4');
      B3(i1 - 0.35, j + 0.25, i1 - 0.15, j1 - 0.25, h - 4, h, '#2a2a2e');
      faceL(i1 - 0.33, i1 - 0.17, h - 3, h - 1, night ? '#4af08a' : '#3ac07a');
      break;
    }
    case 'benchpress': {
      // 벤치 프레스: 패드 벤치 · 받침대 · 원판 낀 바벨
      B3(i + 0.3, j + 0.35, i1 - 0.3, j1 - 0.35, 0, 8, '#4a4a4e'); box(i + 0.3, j + 0.35, i1 - 0.3, j1 - 0.35, 8, 11, '#c83a2a', '#a82a1e', '#8a2216');
      for (const y of [j + 0.12, j1 - 0.18]) B3(i + 0.4, y, i + 0.46, y + 0.06, 0, h, '#9a9ea4');
      poly([P(i + 0.43, j - 0.1, h), P(i + 0.43, j1 + 0.1, h), P(i + 0.43, j1 + 0.1, h - 2), P(i + 0.43, j - 0.1, h - 2)], '#c8ccd2');
      for (const y of [j - 0.05, j1 + 0.05]) { const [cx, cy] = P(i + 0.43, y, h - 1); g.fillStyle = '#1e1e22'; g.beginPath(); g.ellipse(cx, cy, 3, 7, 0, 0, Math.PI * 2); g.fill(); }
      break;
    }
    case 'squatrack': {
      // 스쿼트 랙: 네 기둥 쇠틀 · 걸린 바벨 · 옆 원판 걸이
      for (const [x, y] of [[i + 0.1, j + 0.1], [i1 - 0.2, j + 0.1], [i + 0.1, j1 - 0.2], [i1 - 0.2, j1 - 0.2]] as const) B3(x, y, x + 0.1, y + 0.1, 0, h, '#2a2a2e');
      box(i + 0.1, j + 0.1, i1 - 0.1, j + 0.2, h - 3, h, '#3a3a3e', '#2a2a2e', '#1e1e22'); box(i + 0.1, j1 - 0.2, i1 - 0.1, j1 - 0.1, h - 3, h, '#3a3a3e', '#2a2a2e', '#1e1e22');
      poly([P(i - 0.15, j + 0.9, h * 0.6), P(i1 + 0.15, j + 0.9, h * 0.6), P(i1 + 0.15, j + 0.9, h * 0.6 - 2), P(i - 0.15, j + 0.9, h * 0.6 - 2)], '#c8ccd2');
      for (const x of [i - 0.05, i1 + 0.05]) { const [cx, cy] = P(x, j + 0.9, h * 0.6 - 1); g.fillStyle = '#c83a2a'; g.beginPath(); g.ellipse(cx, cy, 7, 8, 0, 0, Math.PI * 2); g.fill(); g.fillStyle = '#1e1e22'; g.beginPath(); g.ellipse(cx, cy, 2, 2, 0, 0, Math.PI * 2); g.fill(); }
      box(i + 0.4, j + 0.4, i + 0.6, j + 0.6, 0, 1, '#1e1e22', '#141418', '#0e0e10');
      break;
    }
    case 'dumbbells': {
      // 덤벨 걸이: 두 단 선반에 크기 순서대로
      B3(i + 0.05, j + 0.3, i1 - 0.05, j1 - 0.3, 0, h, '#3a3a3e');
      for (const z of [h * 0.45, h]) for (let x = i + 0.15; x < i1 - 0.2; x += 0.3) { const [cx, cy] = P(x + 0.12, j + 0.5, z + 2); const rr = 2 + ((x - i) / w) * 3; g.fillStyle = '#1e1e22'; g.fillRect(Math.round(cx) - 4, Math.round(cy - rr), 2, Math.round(rr * 2)); g.fillRect(Math.round(cx) + 3, Math.round(cy - rr), 2, Math.round(rr * 2)); g.fillStyle = '#9a9ea4'; g.fillRect(Math.round(cx) - 2, Math.round(cy) - 1, 5, 2); }
      break;
    }
    case 'punchbag': {
      // 샌드백: 천장에서 늘어진 쇠사슬과 붉은 가죽 자루
      const [cx, cy] = P(i + 0.5, j + 0.5, h);
      g.fillStyle = '#6a6a6a'; g.fillRect(Math.round(cx), Math.round(cy) - 6, 1, 14);
      g.fillStyle = f.v ? '#2a2a2e' : '#a82a1e'; g.fillRect(Math.round(cx) - 6, Math.round(cy) + 8, 12, 34);
      g.fillStyle = f.v ? '#3a3a3e' : '#c83a2a'; g.fillRect(Math.round(cx) - 6, Math.round(cy) + 8, 4, 34);
      g.fillStyle = '#1e1e22'; g.fillRect(Math.round(cx) - 6, Math.round(cy) + 12, 12, 2); g.fillRect(Math.round(cx) - 6, Math.round(cy) + 36, 12, 2);
      break;
    }
    case 'mat': poly([P(i + 0.05, j + 0.2, 1), P(i1 - 0.05, j + 0.2, 1), P(i1 - 0.05, j1 - 0.2, 1), P(i + 0.05, j1 - 0.2, 1)], f.v ? '#3a6a9a' : '#7a3a8a'); break;
    case 'display': B3(i + 0.1, j + 0.1, i1 - 0.1, j1 - 0.1, 0, h, '#c8b090'); for (let x = i + 0.25; x < i1 - 0.2; x += 0.35) B3(x, j + 0.3, x + 0.2, j + 0.6, h, h + 6, pick(Math.floor(x * 7))); break;
    // ── 25차: 방마다 더한 살림 ──
    case 'rug': {
      // 깔개: 테두리 · 안쪽 무늬 띠 (가구 밑에 깔린다)
      const RC = [['#8a2a2a', '#c9a23e', '#a8483a'], ['#b84a5a', '#f2e0c8', '#3a7a5a'], ['#6a5a2a', '#d8c89a', '#8a7a3a'], ['#2a4a7a', '#c8b88a', '#3a5a8a']][(f.v ?? 0) % 4];
      poly([P(i + 0.08, j + 0.08, 0.5), P(i1 - 0.08, j + 0.08, 0.5), P(i1 - 0.08, j1 - 0.08, 0.5), P(i + 0.08, j1 - 0.08, 0.5)], RC[0]);
      poly([P(i + 0.2, j + 0.2, 0.6), P(i1 - 0.2, j + 0.2, 0.6), P(i1 - 0.2, j1 - 0.2, 0.6), P(i + 0.2, j1 - 0.2, 0.6)], RC[1]);
      poly([P(i + 0.3, j + 0.3, 0.7), P(i1 - 0.3, j + 0.3, 0.7), P(i1 - 0.3, j1 - 0.3, 0.7), P(i + 0.3, j1 - 0.3, 0.7)], RC[2]);
      for (let x = i + 0.5; x < i1 - 0.4; x += 0.5) for (let y = j + 0.5; y < j1 - 0.4; y += 0.5) poly([P(x, y - 0.1, 0.8), P(x + 0.1, y, 0.8), P(x, y + 0.1, 0.8), P(x - 0.1, y, 0.8)], RC[1]);
      break;
    }
    case 'crates': {
      // 나무 궤짝 두세 개 (술집은 초록 병 상자)
      const bottles = (f.v ?? 0) >= 3, wood2 = bottles ? '#3a5a3a' : '#a07a4a';
      B3(i + 0.08, j + 0.1, i + 0.6, j1 - 0.1, 0, 10, wood2); B3(i + 0.5, j + 0.2, i1 - 0.06, j1 - 0.15, 0, 9, mixHex(wood2, '#000000', 0.1));
      B3(i + 0.2, j + 0.25, i + 0.75, j1 - 0.2, 10, h, mixHex(wood2, '#ffffff', 0.08));
      if (bottles) for (let x = i + 0.28; x < i + 0.7; x += 0.12) B3(x, j + 0.35, x + 0.06, j + 0.45, h, h + 6, (Math.floor(x * 9) % 2) ? '#2a6a3a' : '#6a4a22');
      else { faceL(i + 0.1, i + 0.58, 4, 5, '#6a4a2a'); faceL(i + 0.22, i + 0.73, 14, 15, '#6a4a2a'); }
      break;
    }
    case 'bin': {
      B3(i + 0.32, j + 0.32, i1 - 0.32, j1 - 0.32, 0, h, f.v ? '#3a6a4a' : '#5a6a6e');
      box(i + 0.28, j + 0.28, i1 - 0.28, j1 - 0.28, h, h + 2, '#3a4446', '#2a3436', '#202a2c');
      break;
    }
    case 'cooler': {
      // 정수기: 흰 몸통, 위에 거꾸로 꽂힌 파란 물통, 꼭지 둘
      B3(i + 0.28, j + 0.28, i1 - 0.28, j1 - 0.28, 0, h - 12, '#e8ecee');
      faceL(i + 0.36, i + 0.46, h - 22, h - 19, '#c8302a'); faceL(i + 0.54, i + 0.64, h - 22, h - 19, '#2a6ac8');
      const [bx, by] = P(i + 0.5, j + 0.5, h - 4);
      g.fillStyle = '#7ab8e0'; g.beginPath(); g.ellipse(bx, by, 6, 8, 0, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#a8d8f2'; g.fillRect(Math.round(bx) - 4, Math.round(by) - 5, 2, 9);
      break;
    }
    case 'fan': {
      // 선풍기: 둥근 받침 · 가는 기둥 · 철망 머리와 날개 (연한 하늘색)
      const [bx, by] = P(i + 0.5, j + 0.5, 0);
      g.fillStyle = '#d8e4ea'; g.beginPath(); g.ellipse(bx, by, 7, 3, 0, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#b8c8d0'; g.fillRect(Math.round(bx) - 1, Math.round(by) - h + 8, 2, h - 8);
      const hx = bx, hy = by - h + 4;
      g.fillStyle = '#9ab8c8'; g.beginPath(); g.ellipse(hx, hy, 8, 9, 0, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#cfe6f0'; for (let n = 0; n < 3; n++) { const a = n * 2.1 + (f.v ?? 0); g.beginPath(); g.ellipse(hx + Math.cos(a) * 3.5, hy + Math.sin(a) * 4, 3.5, 2, a, 0, Math.PI * 2); g.fill(); }
      g.strokeStyle = '#6a8a9a'; g.lineWidth = 1; g.beginPath(); g.ellipse(hx, hy, 8, 9, 0, 0, Math.PI * 2); g.stroke();
      g.fillStyle = '#4a6a7a'; g.fillRect(Math.round(hx) - 1, Math.round(hy) - 1, 3, 3);
      break;
    }
    case 'tv': {
      // 브라운관 텔레비전: 낮은 받침장 위 볼록한 상자, 화면
      B3(i + 0.12, j + 0.15, i1 - 0.12, j1 - 0.15, 0, 8, '#6a4a32');
      B3(i + 0.2, j + 0.22, i1 - 0.2, j1 - 0.22, 8, h, '#3a3a3c');
      faceL(i + 0.26, i1 - 0.3, 10, h - 3, night ? '#6a9ac8' : '#2a3a4a');
      if (night) faceL(i + 0.3, i + 0.5, 12, h - 6, '#a8d0f0');
      break;
    }
    case 'wardrobe': {
      // 자개 옷장: 검은 옻칠 문 둘, 자개 무늬 점, 놋쇠 고리
      B3(i + 0.04, j + 0.2, i1 - 0.04, j1 - 0.1, 0, h, '#2a1e1a');
      faceL(i + 0.08, i + w / 2 - 0.03, 4, h - 4, '#3a2a22'); faceL(i + w / 2 + 0.03, i1 - 0.08, 4, h - 4, '#3a2a22');
      for (let n = 0; n < 9; n++) { const [mx, my] = P(i + 0.2 + ((n * 37) % 80) / 100 * (w - 0.4), j1 - 0.1, 10 + ((n * 53) % 70) / 100 * (h - 20)); g.fillStyle = n % 3 ? '#9ad0c8' : '#e8d8f0'; g.fillRect(Math.round(mx), Math.round(my), 2, 1); }
      for (const x of [i + w / 2 - 0.12, i + w / 2 + 0.08]) faceL(x, x + 0.05, h / 2 - 2, h / 2 + 2, '#c9a23e');
      break;
    }
    case 'futon': {
      // 개어 둔 이불 셋과 베개
      const cols = ['#c84a5a', '#3a7aa8', '#e8c86a'];
      for (let n = 0; n < 3; n++) B3(i + 0.1 + n * 0.02, j + 0.12, i1 - 0.1 - n * 0.02, j1 - 0.12, n * 4, n * 4 + 4, cols[n]);
      B3(i + 0.25, j + 0.2, i1 - 0.25, j + 0.7, 12, 15, '#f2eee4');
      break;
    }
    case 'lowtable': {
      // 앉은뱅이 밥상: 둥근 상판, 공기 둘, 반찬 접시 넷, 수저
      box(i + 0.05, j + 0.1, i1 - 0.05, j1 - 0.1, h - 3, h, '#a8743a', '#8a5a2a', '#6a4422');
      for (const x of [i + 0.15, i1 - 0.2]) B3(x, j + 0.2, x + 0.05, j + 0.25, 0, h - 3, '#5a3a1e');
      const dish = (x: number, y: number, rx: number, col: string) => { const [px, py] = P(x, y, h); g.fillStyle = '#f2f0e8'; g.beginPath(); g.ellipse(px, py, rx, rx / 2, 0, 0, Math.PI * 2); g.fill(); g.fillStyle = col; g.beginPath(); g.ellipse(px, py - 0.5, rx - 1.5, (rx - 1.5) / 2, 0, 0, Math.PI * 2); g.fill(); };
      dish(i + 0.5, j + 0.5, 4, '#f8f8f2'); dish(i + 1.4, j + 0.5, 4, '#c8562a');
      dish(i + 0.9, j + 0.3, 3, '#3a8a3a'); dish(i + 1.0, j + 0.7, 3, '#c83a2a'); dish(i + 0.3, j + 0.75, 2.5, '#e8c86a'); dish(i + 1.7, j + 0.75, 2.5, '#6a4a2a');
      break;
    }
    case 'shoes': {
      // 문 앞에 벗어 둔 신발 두 켤레
      const sc = (f.v ?? 0) ? ['#2a2a2a', '#c8c8c0'] : ['#6a3a22', '#3a4a6a'];
      for (let n = 0; n < 2; n++) for (const dy of [0, 0.14]) poly([P(i + 0.2 + n * 0.35, j + 0.3 + dy, 0.8), P(i + 0.45 + n * 0.35, j + 0.3 + dy, 0.8), P(i + 0.45 + n * 0.35, j + 0.4 + dy, 0.8), P(i + 0.2 + n * 0.35, j + 0.4 + dy, 0.8)], sc[n]);
      break;
    }
    case 'umbrella': {
      // 우산꽂이: 쇠 통에 꽂힌 장우산 셋
      B3(i + 0.32, j + 0.32, i1 - 0.32, j1 - 0.32, 0, 10, '#4a4e54');
      for (const [dx, col] of [[-3, '#2a4a8a'], [0, '#c83a2a'], [3, '#2a2a2a']] as [number, string][]) { const [ux, uy] = P(i + 0.5, j + 0.5, 10); g.fillStyle = col; g.fillRect(Math.round(ux + dx) - 1, Math.round(uy) - 14, 3, 14); g.fillStyle = '#6a4a2a'; g.fillRect(Math.round(ux + dx), Math.round(uy) - 18, 1, 4); }
      break;
    }
    case 'lamp': {
      // 스탠드: 둥근 받침 · 가는 기둥 · 갓 (밤에는 불빛이 번진다)
      const [bx, by] = P(i + 0.5, j + 0.5, 0);
      g.fillStyle = '#3a2e26'; g.beginPath(); g.ellipse(bx, by, 5, 2, 0, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#5a4a3a'; g.fillRect(Math.round(bx), Math.round(by) - h + 6, 1, h - 6);
      if (night) { g.fillStyle = 'rgba(255,214,140,0.28)'; g.beginPath(); g.ellipse(bx, by - h + 8, 16, 12, 0, 0, Math.PI * 2); g.fill(); }
      g.fillStyle = night ? '#ffe0a0' : '#e8d8b8'; g.beginPath(); g.moveTo(bx - 4, by - h); g.lineTo(bx + 5, by - h); g.lineTo(bx + 8, by - h + 9); g.lineTo(bx - 7, by - h + 9); g.closePath(); g.fill();
      break;
    }
    case 'towels': {
      // 낮은 장 위에 말아 쌓은 수건 · 허브 찜질 공
      B3(i + 0.1, j + 0.2, i1 - 0.1, j1 - 0.2, 0, h - 6, '#7a5a3a');
      for (let r = 0; r < 2; r++) for (let n = 0; n < 3; n++) { const [tx, ty] = P(i + 0.3 + n * 0.2, j + 0.5, h - 4 + r * 4); g.fillStyle = r ? '#f2ece0' : '#e0c890'; g.beginPath(); g.ellipse(tx, ty, 3, 2.5, 0, 0, Math.PI * 2); g.fill(); g.fillStyle = '#c8b898'; g.fillRect(Math.round(tx) - 1, Math.round(ty) - 1, 2, 2); }
      { const [hx, hy] = P(i1 - 0.25, j + 0.5, h - 6); g.fillStyle = '#8a9a5a'; g.beginPath(); g.ellipse(hx, hy - 3, 3, 3, 0, 0, Math.PI * 2); g.fill(); }
      break;
    }
    case 'plant': {
      B3(i + 0.3, j + 0.3, i1 - 0.3, j1 - 0.3, 0, 12, '#9a5a3a');
      for (let n = 0; n < 14; n++) { const [lx, ly] = P(i + 0.2 + ((n * 37) % 60) / 100, j + 0.2 + ((n * 53) % 60) / 100, 12 + ((n * 7) % (h - 8))); g.fillStyle = n % 2 ? '#3a7a32' : '#5a9a42'; g.fillRect(Math.round(lx) - 2, Math.round(ly) - 2, 5, 4); }
      break;
    }
    default: B3(i, j, i1, j1, 0, h, info.trim);
  }
  const im = g.getImageData(0, 0, c.width, c.height);
  for (let k2 = 3; k2 < im.data.length; k2 += 4) im.data[k2] = im.data[k2] > 200 ? 255 : im.data[k2] < 30 ? 0 : im.data[k2];
  g.putImageData(im, 0, 0);
  return { canvas: c, x: minX, y: minY };
}

/** 방의 직원 모습: 업종마다 옷 색 (은행 남색 · 의원 흰색 · 사원 주황 · 술집 검정 …), 얼굴·머리는 건물마다 다르게 */
import { SKIN_COLORS, HAIR_COLORS, type Look } from './character.ts';
const STAFF: Record<string, [string, string]> = {
  bank: ['#24344e', '#1e2430'], clinic: ['#eef2f0', '#c8d4d8'], pharmacy: ['#eef2f0', '#3a4a5a'], temple: ['#e0862a', '#c9701e'],
  church: ['#2a2a2e', '#2a2a2e'], mosque: ['#e8e4da', '#e8e4da'], gurdwara: ['#e8a23a', '#2a3a6a'], mart: ['#2a6aa8', '#2a2a30'],
  food: ['#e8e2d6', '#3a2a22'], cafe: ['#4a3022', '#2a2a30'], bar: ['#1e1c22', '#1e1c22'], salon: ['#c96a8a', '#2a2a30'],
  massage: ['#6a3a5a', '#4a2a3a'], laundry: ['#3a6a9a', '#34455f'], lobby: ['#5a4630', '#2a2a30'], shop: ['#5a5a5a', '#34455f'],
  gym: ['#1e1e22', '#1e1e22'],
};
/** 대부업자 베스크: 붉은 피부·대머리·아주 뚱뚱·금 장신구·장부 */
/** 지옥 로비의 환생관 파샤르 (컨셉 아트: 잿빛 머리, 검은 망토 코트에 은 장식, 낡은 장부와 깃펜) */
export const PASHAR_LOOK: Look = { sex: 'm', build: 0, skin: 0, hair: 1, hairColor: 0, top: 0, bottom: 0, outfit: 'casual', cols: { 1: '#e8d6c8', 10: '#e8d6c8', 2: '#9a9aa2', 3: '#1c1c22', 4: '#22222a', 9: '#1c1c22', 5: '#141418' } };
/** 천국의 환생관 루엔 (컨셉 아트: 길고 흰 머리, 흰 법의에 옅은 푸른 띠, 흰 날개, 등불) */
export const LUEN_LOOK: Look = { sex: 'f', build: 0, skin: 0, hair: 3, hairColor: 0, top: 0, bottom: 0, cols: { 1: '#f2dccc', 10: '#f2dccc', 2: '#e8e6f2', 3: '#f8f6f2', 4: '#b8c4e2', 9: '#f8f6f2', 5: '#d8ccb0' } };
/** 24차: 환생관 할아버지 — 안경 쓴 아주 늙은 사람 (천국은 흰 옷, 지옥은 잿빛 외투). 그림은 관리자 'grandpa' 칸 */
export function grandpaLook(hell: boolean): Look {
  const skin = '#e6c9ae';
  return { sex: 'm', build: 0, skin: 0, hair: 1, hairColor: 0, top: 0, bottom: 0, cols: hell
    ? { 1: skin, 10: skin, 2: '#e8e4dc', 3: '#3a3634', 9: '#3a3634', 4: '#2a2624', 5: '#141210' }
    : { 1: skin, 10: skin, 2: '#f2efe8', 3: '#f2ede2', 9: '#f2ede2', 4: '#e8e2d4', 5: '#c8c0b0' } };
}
export function clerkLook(kind: string, seed: number): Look {
  if (kind === 'terrace') return LUEN_LOOK;
  if (kind === 'shore') return BULDA_LOOK;
  if (kind === 'loan') return BESK_LOOK;
  if (kind === 'rebirth') return PASHAR_LOOK;
  if (kind === 'hbank') return { sex: 'm', build: 0, skin: 0, hair: 0, hairColor: 0, top: 0, bottom: 0, outfit: 'casual', cols: { 1: '#9a948c', 10: '#9a948c', 2: '#2a2622', 3: '#1e1c1c', 4: '#1a1818', 9: '#1e1c1c', 5: '#0e0c0c' } }; // 잿빛 피부의 은행원
  if (kind === 'atone') return { sex: 'f', build: 0, skin: 0, hair: 3, hairColor: 0, top: 0, bottom: 0, outfit: 'raincoat', cols: { 1: '#d8c8b8', 10: '#d8c8b8', 8: '#4a1a16', 3: '#2a1210', 4: '#2a1210', 5: '#1a0e0c' } }; // 붉은 두건의 속죄 수녀
  const [top, bottom] = STAFF[kind] ?? STAFF.shop;
  const sex = seed % 2 ? 'f' : 'm';
  const monk = kind === 'temple';
  return {
    sex: monk ? 'm' : sex, build: 1, skin: seed % 3, hair: monk ? 5 : (seed >> 1) % 6, hairColor: (seed >> 2) % 3, top: 0, bottom: 0, outfit: 'casual',
    cols: { 1: SKIN_COLORS[seed % 3], 2: HAIR_COLORS[(seed >> 2) % 3], 3: top, 4: bottom, 5: '#2a2422', 9: top, 10: SKIN_COLORS[seed % 3] },
  };
}
