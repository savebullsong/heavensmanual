// 건물 안: 들어갈 때만 업종에 맞는 작은 방을 만든다 (내려받는 그림 없음 · 한 번에 한 방만 메모리에)
// 방 = 작은 존. 뒤쪽 두 벽(i=0 줄, j=0 줄)은 막히고, 앞쪽 두 가장자리는 잘라 보인다(컷어웨이).
// 앞 가장자리 가운데의 매트를 밟으면 거리로 나간다.
import { TYPES, finalize, type Zone, type Building, type Furn, type InteriorInfo } from './zone.ts';
import { kindOf, mainPoi, hasBank, storeOf, cuisineOf } from './names.ts';
import { faithOf } from './street.ts';
import { TW, TH } from './gfx.ts';
import { BESK_LOOK, YELLOW_WING_LOOK } from './sprites.ts';
import { drawShore, drawShoreFurn, BULDA_LOOK } from './border.ts';
import { menuFor, itemByKey } from './items.ts';
import { furnishHome, furnishShowroom } from './home.ts';
export { BESK_LOOK };

const TI = Object.fromEntries(TYPES.map((t, k) => [t, k])) as Record<(typeof TYPES)[number], number>;

/** 들어갈 수 있는 건물: 가게·시설이 있고 문(간판 면)이 있는 곳 */
/** 45차: 관리자는 아파트·콘도 안에도 들어가 본다 (main이 관리자 로그인 때 켠다) */
let adminVisit = false;
export function setAdminVisit(v: boolean) { adminVisit = v; }
export function canEnter(b: Building) {
  const p = mainPoi(b);
  if (b.cat === 'condo' && adminVisit) return true;
  if (b.cat === 'home' || b.cat === 'estate') return true; // 24차 내 집 · 35차 사는 집
  if (!p || b.cat === 'ujusae') return false;
  // 간판이 없어도 들어갈 수 있는 곳: 종교시설·병원·은행
  // 32차: 물건을 파는 곳·은행은 반드시 안으로 들어가서 산다 (문 앞에서 사던 버그)
  return !!b.sign || ['place_of_worship', 'hospital', 'clinic', 'bank', 'fitness_centre', 'fitness_center', 'sports_centre', 'gym', 'dojo', 'martial_arts'].includes(p.t) || !!storeOf(b) || hasBank(b); // 45차: 헬스장 · 도장은 간판이 없어도 들어간다
}

/** 17차: 우주새와 다른 무기를 파는 거리 상인 — 철물점·수리점(공구) · 백화점·쇼핑몰(주방칼·운동용품) */
export function streetSeller(b: Building): 'tools' | 'dept' | 'antique' | undefined {
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
  if (b.cat === 'estate') return 'myhome'; // 35차 내가 산 집
  if (b.cat === 'condo' && !mainPoi(b)) return 'condo'; // 45차 아파트·콘도 한 집 (관리자만 들어가 본다)
  if (b.yunae) return 'ysalon'; // 40차 유내 미용실 (회상 속 그 미용실 그대로, 사람만 다르다)
  if (b.cat === 'sanct') { const att = (b as { att?: string }).att; return att === 'temple' ? 'htemple' : att === 'mosque' ? 'hmosque' : 'hchurch'; } // 46차 천국 성소
  if (b.cat === 'cottage') return 'cloudisle'; // 46차 구름 위의 오두막 (옆집 쌍둥이)
  if (b.cat === 'hbank' || b.cat === 'atone' || b.cat === 'rebirth' || b.cat === 'terrace' || b.cat === 'home' || b.cat === 'goatroom') return b.cat; // 31차 goatroom = 지옥 142층 염소대왕의 방 // 지옥 은행 · 속죄의 회당 · 지옥 로비 · 천국 환생의 테라스
  const k = kindOf(b);
  if (k === 'place_of_worship' || b.cat === 'worship') {
    const f = faithOf(b);
    return f === 'church' ? 'church' : f === 'mosque' ? 'mosque' : f === 'sikh' ? 'gurdwara' : 'temple';
  }
  if (k === 'bank' || k === 'bureau_de_change') return 'bank';
  if (['clinic', 'hospital', 'dentist', 'veterinary'].includes(k) || b.cat === 'clinic') return 'clinic';
  if (['dojo', 'martial_arts'].includes(k)) return 'dojo'; // 45차 도장 (방콕 무에타이 체육관 · 서울 태권도장)
  if (['fitness_centre', 'fitness_center', 'sports_centre', 'gym'].includes(k)) return 'gym'; // 19차 헬스장
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
  if (k === 'furniture') return 'furnshop'; // 35차 가구점
  if (k === 'hardware' || k === 'doityourself') return 'hardware'; // 38차 철물점 (수리)
  if (k === 'amusement_arcade') return 'arcade'; // 35차 천국 오락실
  if (hasBank(b)) return 'bank';
  return 'shop';
}

/** 쉬는 곳: 종교시설·은행·병원·약국 (싸움 불가 · 빠른 회복) */
export const REST_ROOMS = new Set(['hchurch', 'htemple', 'hmosque', 'cloudisle', 'home', 'myhome', 'temple', 'church', 'mosque', 'gurdwara', 'bank', 'clinic', 'pharmacy', 'hbank', 'atone', 'rebirth', 'terrace', 'goatroom']);

const SIZE: Record<string, [number, number]> = {
  hchurch: [19, 16], htemple: [19, 16], hmosque: [19, 16], cloudisle: [20, 15], // 46차
  temple: [13, 11], church: [13, 11], mosque: [12, 11], gurdwara: [12, 11], bank: [12, 10], clinic: [12, 10], pharmacy: [9, 8],
  mart: [11, 9], food: [12, 10], cafe: [10, 9], bar: [10, 9], salon: [9, 8], ysalon: [10, 9], massage: [10, 9], laundry: [9, 8], lobby: [11, 9], shop: [9, 8], loan: [10, 8],
  hbank: [10, 8], atone: [11, 10], myhome: [14, 11], furnshop: [12, 10], hardware: [12, 10], arcade: [13, 10], rebirth: [31, 17], terrace: [23, 16], home: [11, 9], gym: [13, 11], dojo: [13, 11], condo: [13, 10], dept: [26, 20], goatroom: [17, 17],
};
const LOOKS: Record<string, { floor: string; wall: string; trim: string }> = {
  hchurch: { floor: 'marble', wall: '#f6f2ea', trim: '#c9a23e' }, htemple: { floor: 'temple', wall: '#faf2e2', trim: '#c9a23e' }, hmosque: { floor: 'prayer', wall: '#f8f6f0', trim: '#2a8a80' }, // 46차 천국 성소
  cloudisle: { floor: 'cloud', wall: '#f6f2ea', trim: '#c9a23e' }, // 46차 구름 위 오두막
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
  home: { floor: 'jangpan', wall: '#e6dcc6', trim: '#7a5a3e' },
  condo: { floor: 'wood', wall: '#eae6de', trim: '#5a6a7a' }, // 45차 아파트·콘도
  dojo: { floor: 'rubber', wall: '#e8e0d0', trim: '#b8302a' }, // 45차 도장
  myhome: { floor: 'wood', wall: '#ece4d6', trim: '#7a6450' }, // 35차 방콕 콘도 (서울 아파트는 아래에서 대리석)
  furnshop: { floor: 'wood', wall: '#e6ddd0', trim: '#5a4636' },
  hardware: { floor: 'grey', wall: '#dcd6c8', trim: '#d8641e' }, // 38차 철물점: 시멘트 바닥 · 주황 띠
  arcade: { floor: 'dark', wall: '#241e3a', trim: '#c83ac8' }, // 24차 내 집: 누런 장판 · 바랜 벽지
  gym: { floor: 'rubber', wall: '#d6d8da', trim: '#c83a2a' },
  dept: { floor: 'marble', wall: '#ece6dc', trim: '#b08a4a' },
  goatroom: { floor: 'obsidian', wall: '#2c1214', trim: '#a8822e' }, // 31차: 검붉은 벽 · 금빛 띠 · 흑요석 바닥
};

/** 거리의 건물 k에 들어갈 때 방을 만든다 (같은 건물이면 늘 같은 방) */
export function interiorZone(b: Building, k: number, out: { i: number; j: number }, name: string, yunaeAge?: 0 | 1 | 2 | 3, owned?: string[]): Zone {
  const kind = roomKind(b);
  // 37차: 내 집은 한 곳(3 = 지금의 빈집). 가끔 대문을 열면 회상 — 10대 놀이터 · 20대 동네 미용실 · 30대 후반 진료실
  const hAge = kind === 'home' ? (yunaeAge ?? 3) : undefined;
  const [W, H] = hAge === 0 ? [14, 12] : hAge !== undefined ? [10, 9] : kind === 'myhome' && b.estate === 'seoul' ? [16, 12] : SIZE[kind]; // 35차: 강남 아파트는 콘도보다 넓다
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
    case 'cloudisle': {
      // 46차 구름 위의 작은 섬: 왼쪽 뒤 내 오두막 · 오른쪽 뒤 쌍둥이네 집(그네) · 빨랫줄 · 꽃밭 · 벤치. 황색날개가 데려다주고 곁에 있다
      clerk = { i: 9, j: 7 }; counter = { i: 9, j: 8 };
      F(2, 1, 5, 4, 74, 'hut'); F(13, 1, 4, 4, 62, 'hut2');
      F(13, 7, 4, 1, 40, 'swing'); F(2, 8, 4, 1, 36, 'washline');
      for (const [ii, jj, v] of [[8, 2, 0], [10, 3, 1], [1, 11, 2], [17, 10, 3], [7, 11, 1], [12, 12, 0]] as const) F(ii, jj, 1, 1, 4, 'flowerbed', v);
      F(10, 11, 2, 1, 12, 'cbench');
      // 둥근 섬: 네 귀퉁이를 깎는다
      for (const [ii, jj] of [[1, 1], [W - 2, 1], [W - 3, 1], [W - 2, 2], [1, H - 2], [2, H - 2], [1, H - 3], [W - 2, H - 2], [W - 3, H - 2], [W - 2, H - 3], [W - 4, H - 2], [W - 2, H - 4]]) tiles[jj * W + ii] = TI.void;
      break;
    }
    // ── 46차 천국 성소: 하루 한 번 예배. 자리(seats)는 앉는 곳 — 많은 영혼이 채운다 ──
    case 'hchurch':
      F(mid - 2, 1, 5, 1, 22, 'altar', 1); F(mid, 1, 1, 1, 70, 'hcross'); clerk = { i: mid + 1, j: 3 }; counter = { i: mid + 1, j: 4 };
      for (const ii of [mid - 4, mid + 4]) F(ii, 1, 1, 1, 30, 'lampstand');
      for (let jj = 3; jj < y1; jj += 3) { F(1, jj, 1, 1, 96, 'pillar'); F(x1, jj, 1, 1, 96, 'pillar'); }
      for (let jj = 6; jj < y1; jj += 2) {
        // 칸마다 한 토막씩 (앉은 사람과 의자 등받이가 칸 단위로 겹쳐 그려지게)
        for (let ii = 2; ii < mid - 1; ii++) { F(ii, jj, 1, 1, 12, 'hpew', ii === 2 ? 1 : ii === mid - 2 ? 2 : 0); seats.push([ii, jj]); }
        for (let ii = mid + 2; ii < x1; ii++) { F(ii, jj, 1, 1, 12, 'hpew', ii === mid + 2 ? 1 : ii === x1 - 1 ? 2 : 0); seats.push([ii, jj]); }
      }
      break;
    case 'htemple':
      F(mid - 2, 1, 5, 2, 30, 'altar'); clerk = { i: mid + 3, j: 3 }; counter = { i: mid + 3, j: 4 };
      for (const ii of [mid - 4, mid + 4]) F(ii, 1, 1, 1, 30, 'lampstand');
      F(mid - 3, 1, 1, 1, 22, 'candle'); F(mid + 3, 1, 1, 1, 22, 'candle');
      for (let jj = 3; jj < y1; jj += 3) { F(1, jj, 1, 1, 96, 'pillar', 1); F(x1, jj, 1, 1, 96, 'pillar', 1); }
      for (let jj = 6; jj < y1; jj += 2) for (let ii = 3; ii < x1 - 1; ii += 2) { if (ii === mid || ii === mid + 1) continue; F(ii, jj, 1, 1, 3, 'cushion', 1); seats.push([ii, jj]); }
      break;
    case 'hmosque':
      F(mid - 1, 0, 3, 1, 80, 'mihrab'); F(mid + 3, 1, 1, 2, 30, 'minbar'); clerk = { i: mid - 3, j: 3 }; counter = { i: mid - 3, j: 4 };
      for (const ii of [mid - 5, mid + 5]) F(ii, 1, 1, 1, 34, 'lampstand', 2);
      for (let jj = 3; jj < y1; jj += 3) { F(1, jj, 1, 1, 96, 'pillar', 2); F(x1, jj, 1, 1, 96, 'pillar', 2); }
      for (let jj = 6; jj < y1; jj += 2) for (let ii = 3; ii < x1 - 1; ii++) { if (ii === mid) continue; seats.push([ii, jj]); }
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
      F(12, 3, 3, 1, 20, 'xchdesk'); // 33차: 환전상 오볼로의 탁자 (오른쪽 벽가)
      break;
    }
    case 'myhome': furnishHome(owned ?? [], W, H, F); break; // 35차: 산 가구가 저절로 놓인다 (직원 없음)
    case 'dojo': {
      // 45차 도장: 바닥 매트 넷 · 샌드백 줄 · 거울 · 앞쪽 관장 자리 (무에타이는 샌드백, 태권도는 매트 위 발차기)
      F(W - 5, y1 - 2, 3, 1, 22, 'counter', 6); clerk = { i: W - 4, j: y1 - 3 }; counter = { i: W - 4, j: y1 - 1 };
      for (let n = 0; n < 4; n++) F(1 + n * 2, 1, 1, 1, 64, 'punchbag', n);
      F(2, 4, 5, 5, 1, 'rug', 5); // 넓은 수련 매트 한 장
      F(x1, 1, 1, 1, 30, 'rope'); F(x1, 3, 1, 1, 20, 'towels'); F(9, 1, 2, 1, 24, 'dumbbells');
      seats.push([3, 5], [6, 5], [3, 8]);
      break;
    }
    case 'condo':
      // 45차 아파트·콘도 한 집: 부엌 · 큰 침대 · 소파와 TV · 식탁 · 옷장 · 화분 (사람은 없다)
      F(1, 1, 3, 1, 24, 'kitchen', 1); F(5, 1, 2, 3, 16, 'kbed', 1); F(8, 1, 2, 1, 50, 'shelf', 4); F(x1, 1, 1, 2, 58, 'wardrobe');
      F(1, 5, 1, 3, 24, 'flattv', 1); F(4, 5, 1, 3, 14, 'homesofa'); F(3, 6, 1, 1, 12, 'ctable'); F(2, 5, 3, 3, 1, 'rug', 2);
      F(7, 6, 2, 1, 16, 'table', 4); F(7, 7, 1, 1, 12, 'chair'); F(8, 7, 1, 1, 12, 'chair', 1);
      F(x1, y1, 1, 1, 12, 'plant'); F(1, y1, 1, 1, 48, 'lamp');
      break;
    case 'arcade':
      // 35차 오락실: 뒤 벽을 따라 게임기 줄 · 왼쪽 벽 인형 뽑기 둘 · 가운데 에어하키 · 앞쪽 리듬 발판 · 동전 바꾸는 계산대
      for (let n = 0; n < 6; n++) F(1 + n, 1, 1, 1, 44, 'arcadecab', n);
      F(1, 4, 1, 1, 50, 'claw', 0); F(1, 6, 1, 1, 50, 'claw', 1);
      F(4, 5, 2, 1, 14, 'airhockey'); F(8, 5, 2, 2, 3, 'ddr');
      F(W - 4, 2, 2, 1, 24, 'counter', 5); clerk = { i: W - 3, j: 1 }; counter = { i: W - 3, j: 3 };
      break;
    case 'furnshop':
      F(W - 5, 2, 3, 1, 24, 'counter', 3); clerk = { i: W - 4, j: 1 }; counter = { i: W - 4, j: 3 };
      furnishShowroom(W, H, F);
      break;
    case 'home': {
      if (hAge === 3) {
        // 37차 지금의 집: 달동네 단칸방 — 장판, 개어 둔 이불, 식은 밥상, 브라운관 TV, 자개 옷장, 낡은 냉장고. 아무도 없다
        F(1, 1, 1, 2, 58, 'wardrobe'); F(3, 1, 2, 1, 50, 'shelf', 9); F(6, 1, 1, 1, 56, 'fridge');
        F(x1, 3, 1, 1, 26, 'tv'); F(4, 4, 1, 1, 10, 'lowtable'); F(1, 4, 2, 3, 4, 'futon');
        F(x1, 5, 1, 1, 46, 'mirror'); F(x1, y1, 1, 1, 12, 'plant', 1);
      } else if (hAge === 0) {
        // 34차 놀이터 (해 질 녘): 그네 둘(하나에 유내) · 미끄럼틀 · 시소 · 정글짐 · 벤치 · 가로등
        F(2, 2, 4, 1, 46, 'swing'); F(8, 2, 2, 3, 40, 'slide'); F(8, 7, 3, 1, 12, 'seesaw'); F(2, 6, 2, 2, 34, 'jungle');
        F(2, y1 - 1, 2, 1, 14, 'pbench'); F(x1, 5, 1, 1, 92, 'plamp');
        clerk = { i: 3, j: 2 }; counter = { i: 3, j: 4 };
      } else if (hAge === 1) {
        // 34차 동네 미용실: 거울 앞 의자 둘(하나엔 보자기 쓴 손님) · 둥근 머리 말리개 · 머리 감는 곳 · 대기 소파와 잡지 탁자 — 유내는 손님 옆에 서서 자른다
        F(2, 1, 1, 1, 14, 'salonchair', 9); F(4, 1, 1, 1, 14, 'salonchair'); F(6, 1, 1, 1, 40, 'hooddryer');
        F(x1, 3, 1, 2, 22, 'washbasin'); F(1, y1 - 1, 2, 1, 14, 'sofa'); F(3, y1 - 1, 1, 1, 12, 'table', 2); F(x1, y1 - 1, 1, 1, 12, 'plant');
        clerk = { i: 3, j: 1 }; counter = { i: 3, j: 3 };
      } else {
        // 34차 진료실: 의사 없는 책상(모니터·차트) · 빈 환자 의자 · 커튼 친 진찰대(구겨진 담요) · 링거대 · 약장 — 유내는 의자에 앉아 이쪽을 본다
        F(5, 1, 3, 1, 24, 'mdesk'); F(6, 2, 1, 1, 12, 'chair'); F(1, 4, 1, 2, 16, 'bed', 1); F(2, 3, 1, 1, 52, 'ivstand');
        F(x1, 3, 1, 2, 44, 'shelf', 7); F(3, 3, 1, 1, 12, 'chair', 1);
        clerk = { i: 3, j: 3 }; counter = { i: 4, j: 5 };
      }
      break;
    }
    case 'ysalon':
      // 40차 유내 미용실: 회상 속 미용실과 같은 자리에 같은 것들 — 거울 앞 의자 둘(하나엔 보자기 쓴 손님) · 머리 말리개 · 머리 감는 곳 · 소파와 잡지 탁자
      F(2, 1, 1, 1, 14, 'salonchair', 9); F(4, 1, 1, 1, 14, 'salonchair'); F(6, 1, 1, 1, 40, 'hooddryer');
      F(x1, 3, 1, 2, 22, 'washbasin'); F(1, y1 - 1, 2, 1, 14, 'sofa'); F(3, y1 - 1, 1, 1, 12, 'table', 2); F(x1, y1 - 1, 1, 1, 12, 'plant');
      clerk = { i: 3, j: 1 }; counter = { i: 3, j: 3 };
      break;
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
    case 'hardware':
      // 38차 철물점: 뒤 벽 구멍판에 걸린 공구 · 페인트 깡통 선반 · 계산대(주인) / 왼쪽 벽 목재·파이프 거치대와 사다리 /
      // 가운데 수리 작업대(바이스 · 그라인더 · 고치던 칼)와 나사통 진열대 / 오른쪽 벽 밧줄·사슬·호스 감개, 빗자루 통 / 빨간 공구함
      F(1, 1, 5, 1, 54, 'pegboard'); F(6, 1, 2, 1, 50, 'paintshelf');
      F(8, 2, 3, 1, 22, 'counter', 8); clerk = { i: 9, j: 1 }; counter = { i: 9, j: 3 };
      F(1, 3, 1, 3, 46, 'lumber'); F(1, 6, 1, 1, 52, 'ladder');
      F(3, 4, 3, 1, 20, 'workbench'); F(3, 6, 3, 1, 30, 'binshelf');
      F(x1, 4, 1, 2, 50, 'ropespool'); F(x1, y1 - 1, 1, 1, 30, 'brooms'); F(7, 5, 1, 1, 24, 'toolchest');
      F(mid - 1, y1, 1, 1, 8, 'baskets');
      break;
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
  const look = kind === 'myhome' && b.estate === 'seoul' ? { floor: 'marble', wall: '#f2eee6', trim: '#9a8a6a' } : hAge === 0 ? { floor: 'sand', wall: '#b8b0a4', trim: '#6a6a66' } : hAge === 1 || kind === 'ysalon' ? { floor: 'checker', wall: '#f2e6e0', trim: '#b85a74' } : hAge === 2 ? { floor: 'pale', wall: '#e6ecea', trim: '#3a8a7a' } : LOOKS[kind];
  const info: InteriorInfo = {
    // 28차: 내 집의 유내 — 거리에서 정해 둔 시절을 따른다. 20대(1)면 방은 비어 있다 (대문 앞에 나가 있거나, 그 사람 만나러 갔다)
    kind, rest: REST_ROOMS.has(kind), name, ...look, exit, clerk: kind === 'myhome' || kind === 'condo' || hAge === 3 ? undefined : clerk, counter: kind === 'myhome' || kind === 'condo' || hAge === 3 ? undefined : counter, furn, age: hAge,
    from: { b: k, out, bd: b }, store: kind === 'bank' ? 'bank' : kind === 'furnshop' ? 'furniture' : ['mart', 'pharmacy', 'food', 'cafe'].includes(kind) ? kind : streetSeller(b), cuisine: cuisineOf(b), seats: kind === 'hchurch' || kind === 'htemple' ? seats : seats.filter(([i, j]) => tiles[j * W + i] === TI.walk), // 46차: 성소는 의자 · 방석 위가 자리
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
  sand: ['#d4bd8c', '#ccb482'], // 34차 놀이터 모래
};

/** 뭉게구름 한 덩이: 아래는 옅은 보랏빛 그늘, 위는 흰 빛 (도트 느낌이 나게 좌표를 반올림) */
const lerpN = (a: number, b: number, t: number) => a + (b - a) * t;
function cloudPuff(g: CanvasRenderingContext2D, x: number, y: number, r: number, a = 1) {
  x = Math.round(x); y = Math.round(y); r = Math.round(r);
  g.globalAlpha = a;
  g.fillStyle = '#cfd3e2'; g.beginPath(); g.ellipse(x, y + r * 0.22, r, r * 0.6, 0, 0, Math.PI * 2); g.fill();
  g.fillStyle = '#f4f3f0'; g.beginPath(); g.ellipse(x - r * 0.06, y, r * 0.94, r * 0.56, 0, 0, Math.PI * 2); g.fill();
  g.fillStyle = '#ffffff'; g.beginPath(); g.ellipse(x - r * 0.28, y - r * 0.2, r * 0.52, r * 0.3, 0, 0, Math.PI * 2); g.fill();
  g.globalAlpha = 1;
}

/** 19차: 천국 '환생의 테라스' — 벽 없이 구름 위에 뜬 흰 대리석 단. 뒤로는 먼 구름 봉우리, 가장자리 아래는 구름 바다 */
/** 46차 구름 위의 작은 섬: 먼 구름 봉우리 · 섬 밑의 뭉게구름 · 풀밭(작은 들꽃) · 출구에서 오두막까지 징검돌 */
function drawCloudIsle(z: Zone): { canvas: HTMLCanvasElement; x: number; y: number } {
  const info = z.interior!;
  const W = z.W, H = z.H;
  const M = 170;
  const minX = (0 - H) * (TW / 2) - M, maxX = W * (TW / 2) + M;
  const minY = -190, maxY = (W + H) * (TH / 2) + M;
  const { c, g, P, poly } = painter(minX, minY, maxX - minX, maxY - minY);
  const VOID = TI.void;
  const floor = (i: number, j: number) => i >= 1 && j >= 1 && i < W - 1 && j < H - 1 && z.tiles[j * W + i] !== VOID;
  const hsh = (a: number, b: number) => { const v = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return v - Math.floor(v); };
  for (let n = 0; n < 9; n++) { const [x, y] = P(-1.5 + n * 0.2, -1 + n * 1.8, 30 + hsh(n, 1) * 60); for (let k = 0; k < 4; k++) cloudPuff(g, x + (k - 1.5) * 22 + hsh(n, k) * 10, y + k * 9, 24 + hsh(k, n) * 16, 0.7); }
  for (let n = 0; n < 11; n++) { const [x, y] = P(-1 + n * 2, -1.5 + n * 0.2, 30 + hsh(n, 7) * 70); for (let k = 0; k < 4; k++) cloudPuff(g, x + (k - 1.5) * 22 + hsh(k, n + 3) * 10, y + k * 9, 24 + hsh(n + 2, k) * 16, 0.7); }
  for (let j = 0; j < H; j += 1.3) { const [x, y] = P(0.8, j, -6); cloudPuff(g, x, y, 26 + hsh(j, 2) * 10); }
  for (let i = 0; i < W; i += 1.3) { const [x, y] = P(i, 0.8, -6); cloudPuff(g, x, y, 26 + hsh(i, 5) * 10); }
  // 풀밭: 칸마다 조금씩 다른 초록 + 밝은 얼룩 + 작은 들꽃
  const greens = ['#cfe6b0', '#c6e0a4', '#d6ebba', '#bfdb9c'];
  for (let j = 1; j < H - 1; j++) for (let i = 1; i < W - 1; i++) {
    if (!floor(i, j)) continue;
    poly([P(i - 0.01, j - 0.01, 0), P(i + 1.01, j - 0.01, 0), P(i + 1.01, j + 1.01, 0), P(i - 0.01, j + 1.01, 0)], greens[Math.floor(hsh(i, j) * 4)]);
    if (hsh(j, i) < 0.35) { const [x, y] = P(i + hsh(i, 3), j + hsh(4, j), 0); g.fillStyle = 'rgba(255,255,255,0.35)'; g.beginPath(); g.ellipse(x, y, 10, 4, 0, 0, Math.PI * 2); g.fill(); }
    for (let k = 0; k < 3; k++) if (hsh(i * 3 + k, j * 5) < 0.28) { const [x, y] = P(i + hsh(i + k, 9), j + hsh(k, j + 2), 0); g.fillStyle = ['#ffffff', '#f6d860', '#f4a8c0', '#a8c8f4'][Math.floor(hsh(k, i + j) * 4)]; g.fillRect(Math.round(x), Math.round(y) - 2, 2, 2); g.fillStyle = '#7aa05a'; g.fillRect(Math.round(x), Math.round(y), 1, 2); }
  }
  // 섬 가장자리: 풀이 구름 위로 살짝 넘친다 · 앞쪽 아래 뭉게구름
  for (let j = 1; j < H - 1; j++) for (let i = 1; i < W - 1; i++) {
    if (!floor(i, j)) continue;
    if (!floor(i + 1, j)) { poly([P(i + 1, j, 0), P(i + 1, j + 1, 0), P(i + 1, j + 1, -6), P(i + 1, j, -6)], '#a8c888'); const [x, y] = P(i + 1.3, j + 0.5, -20); cloudPuff(g, x, y, 22 + hsh(i, j) * 9); }
    if (!floor(i, j + 1)) { poly([P(i, j + 1, 0), P(i + 1, j + 1, 0), P(i + 1, j + 1, -6), P(i, j + 1, -6)], '#b8d498'); if (i !== info.exit.i) { const [x, y] = P(i + 0.5, j + 1.3, -20); cloudPuff(g, x, y, 22 + hsh(j, i) * 9); } }
  }
  // 징검돌: 출구에서 내 오두막 문까지
  const ex = info.exit;
  for (let k = 0; k <= 8; k++) { const t2 = k / 8, si = ex.i + 0.5 + (4.5 - ex.i - 0.5) * t2, sj = ex.j + 0.5 + (5.6 - ex.j - 0.5) * t2; const [x, y] = P(si, sj, 0.3); g.fillStyle = '#c8c0b0'; g.beginPath(); g.ellipse(x, y + 1, 9, 4.5, 0, 0, Math.PI * 2); g.fill(); g.fillStyle = '#ece6da'; g.beginPath(); g.ellipse(x - 1, y, 8, 4, 0, 0, Math.PI * 2); g.fill(); }
  // 출구: 구름 계단 (황색날개가 안고 내려간다)
  for (let k = 2; k >= 0; k--) { const y0 = H - 1 + k * 0.55, z0 = -8 - k * 12; poly([P(ex.i, y0, z0), P(ex.i + 1, y0, z0), P(ex.i + 1, y0 + 0.55, z0), P(ex.i, y0 + 0.55, z0)], '#f4f1ea'); const [x, y] = P(ex.i + 1.1, y0 + 0.3, z0 - 10); cloudPuff(g, x, y, 12, 0.9); }
  return { canvas: c, x: minX, y: minY };
}
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
/**
 * 34차 앵무새 먹이 144번째: 어두운 우주 어딘가 — 벽도 천장도 없이 별 위에 깔린 유리 바닥, 그 위에 침대와 살림 몇 가지.
 * 잠깐 보였다 사라지는 곳이라 문이 없다 (장면이 끝나면 우주새로 돌아간다)
 */
export function voidZone(name: string): Zone {
  const W = 13, H = 11;
  const tiles = new Uint8Array(W * H);
  for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) tiles[j * W + i] = i === 0 || j === 0 ? TI.block : i === W - 1 || j === H - 1 ? TI.void : TI.walk;
  const furn: Furn[] = [];
  const F = (i: number, j: number, w: number, d: number, h: number, kind: string, v = 0) => furn.push({ i, j, w, d, h, kind, v });
  F(4, 3, 4, 3, 1, 'rug', 2); F(5, 2, 2, 3, 16, 'vbed'); F(2, 2, 2, 1, 46, 'wardrobe'); F(8, 2, 1, 1, 34, 'lamp'); F(9, 5, 1, 1, 12, 'chair'); F(3, 6, 2, 1, 8, 'lowtable', 1);
  for (const f of furn) if (f.h > 2) for (let j = f.j; j < f.j + f.d; j++) for (let i = f.i; i < f.i + f.w; i++) tiles[j * W + i] = TI.block;
  const info: InteriorInfo = { kind: 'voidroom', rest: true, name, floor: 'glass', wall: '#0a0816', trim: '#2a2a4a', exit: { i: -9, j: -9 }, furn, from: { b: -9, out: { i: 0, j: 0 } }, seats: [] };
  return finalize({ id: 'void-room', W, H, tiles, buildings: [], props: [], lanes: [], door: { i: 6, j: 8 }, spawn: { i: 6, j: 8 }, interior: info });
}
function drawVoidRoom(z: Zone): { canvas: HTMLCanvasElement; x: number; y: number } {
  const W = z.W, H = z.H, M = 520;
  const minX = (0 - H) * (TW / 2) - M, maxX = W * (TW / 2) + M;
  const minY = -M * 0.75, maxY = (W + H) * (TH / 2) + M * 0.75;
  const { c, g, P, poly } = painter(minX, minY, maxX - minX, maxY - minY);
  const hsh = (a: number, b: number) => { const v = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return v - Math.floor(v); };
  // 1) 깊은 우주: 위는 검푸르고 아래는 검보라 · 성운 두 덩이 · 별 (몇은 십자 빛)
  const sky = g.createLinearGradient(0, 0, 0, c.height);
  sky.addColorStop(0, '#04030a'); sky.addColorStop(0.5, '#0a0718'); sky.addColorStop(1, '#120820');
  g.fillStyle = sky; g.fillRect(0, 0, c.width, c.height);
  for (const [fx, fy, r, col] of [[0.28, 0.62, 380, '90,40,140'], [0.74, 0.3, 300, '30,90,130'], [0.55, 0.85, 260, '120,40,80']] as const) {
    const gr = g.createRadialGradient(c.width * fx, c.height * fy, 10, c.width * fx, c.height * fy, r);
    gr.addColorStop(0, `rgba(${col},0.32)`); gr.addColorStop(1, `rgba(${col},0)`);
    g.fillStyle = gr; g.fillRect(0, 0, c.width, c.height);
  }
  for (let k = 0; k < 900; k++) {
    const x = hsh(k, 1) * c.width, y = hsh(k, 2) * c.height, b = hsh(k, 3);
    g.fillStyle = b > 0.97 ? '#fff6e0' : b > 0.85 ? '#c8d8ff' : b > 0.6 ? '#8a90b8' : '#4a4a6a';
    g.fillRect(Math.round(x), Math.round(y), b > 0.93 ? 2 : 1, b > 0.93 ? 2 : 1);
    if (b > 0.985) { g.fillStyle = 'rgba(255,246,224,0.5)'; g.fillRect(Math.round(x) - 3, Math.round(y), 8, 1); g.fillRect(Math.round(x), Math.round(y) - 3, 1, 8); }
  }
  // 2) 유리 바닥: 거의 비치는 푸른 판 · 판 사이 줄눈 · 비스듬한 빛 반사 · 앞 가장자리 두께
  for (let j = 1; j < H - 1; j++) for (let i = 1; i < W - 1; i++) poly([P(i, j, 0), P(i + 1, j, 0), P(i + 1, j + 1, 0), P(i, j + 1, 0)], (i + j) % 2 ? '#9ac0ff' : '#b8d4ff', 0.08);
  g.strokeStyle = 'rgba(200,225,255,0.28)'; g.lineWidth = 1;
  for (let i = 1; i <= W - 1; i++) { const a = P(i, 1, 0), b = P(i, H - 1, 0); g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.stroke(); }
  for (let j = 1; j <= H - 1; j++) { const a = P(1, j, 0), b = P(W - 1, j, 0); g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.stroke(); }
  for (let k = 0; k < 6; k++) { const a = 2 + k * 1.7; poly([P(a, 1.2, 0), P(a + 0.5, 1.2, 0), P(a - 1.5, H - 1.4, 0), P(a - 2, H - 1.4, 0)], '#ffffff', 0.035); }
  poly([P(W - 1, 1, 0), P(W - 1, H - 1, 0), P(W - 1, H - 1, -5), P(W - 1, 1, -5)], '#8ab0e8', 0.35);
  poly([P(1, H - 1, 0), P(W - 1, H - 1, 0), P(W - 1, H - 1, -5), P(1, H - 1, -5)], '#a8c8ff', 0.4);
  poly([P(1, 1, 0), P(W - 1, 1, 0), P(W - 1, 1, 1), P(1, 1, 1)], '#c8dcff', 0.4);
  poly([P(1, 1, 0), P(1, H - 1, 0), P(1, H - 1, 1), P(1, 1, 1)], '#c8dcff', 0.4);
  return { canvas: c, x: minX, y: minY };
}

/**
 * 34차: 10대 유내의 놀이터 — 해 질 녘. 모래 바닥, 뒤로는 낮은 시멘트 담과 철망, 그 너머 복도식 아파트(불 켜진 창 몇 개)와
 * 보랏빛에서 주홍으로 내려오는 하늘, 전봇대 전선. 앞 가장자리는 연석, 가운데가 나가는 길
 */
function drawPlayground(z: Zone, night: boolean): { canvas: HTMLCanvasElement; x: number; y: number } {
  const info = z.interior!;
  const W = z.W, H = z.H, SKY = 210;
  const minX = (0 - H) * (TW / 2) - 8, maxX = W * (TW / 2) + 8;
  const minY = -SKY - 30, maxY = (W + H) * (TH / 2) + 10;
  const { c, g, P, poly } = painter(minX, minY, maxX - minX, maxY - minY);
  const hsh = (a: number, b: number) => { const v = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return v - Math.floor(v); };
  // 1) 하늘 (뒤 두 면 전체) — 위는 보라, 지평선은 주홍
  const [, skyTop] = P(1, 1, SKY), [, skyBot] = P(W - 1, 1, 0);
  const sky = g.createLinearGradient(0, skyTop, 0, skyBot);
  sky.addColorStop(0, night ? '#14142a' : '#3a2e5a'); sky.addColorStop(0.45, night ? '#2a2440' : '#8a4a6a'); sky.addColorStop(0.8, night ? '#4a3040' : '#e0875a'); sky.addColorStop(1, night ? '#5a3a3a' : '#f2b46a');
  for (const pts of [[P(1, 1, 0), P(1, H - 1, 0), P(1, H - 1, SKY), P(1, 1, SKY)], [P(1, 1, 0), P(W - 1, 1, 0), P(W - 1, 1, SKY), P(1, 1, SKY)]]) {
    g.beginPath(); g.moveTo(pts[0][0], pts[0][1]); for (const q of pts.slice(1)) g.lineTo(q[0], q[1]); g.closePath(); g.fillStyle = sky; g.fill();
  }
  // 2) 복도식 아파트 (벽면 위 어두운 덩어리 · 켜진 창) — 왼쪽 뒤 면과 오른쪽 뒤 면
  const block = (onLeft: boolean, a0: number, a1: number, ht: number, seed: number) => {
    const Q = (a: number, zz: number) => (onLeft ? P(1, a, zz) : P(a, 1, zz));
    const col = onLeft ? '#2e2a40' : '#3a3450';
    poly([Q(a0, 30), Q(a1, 30), Q(a1, ht), Q(a0, ht)], col);
    poly([Q(a0, ht), Q(a1, ht), Q(a1, ht + 3), Q(a0, ht + 3)], '#24203a');
    poly([Q(a0 + (a1 - a0) * 0.7, ht + 3), Q(a0 + (a1 - a0) * 0.85, ht + 3), Q(a0 + (a1 - a0) * 0.85, ht + 12), Q(a0 + (a1 - a0) * 0.7, ht + 12)], '#24203a'); // 물탱크
    for (let zz = 40; zz < ht - 6; zz += 9) for (let a = a0 + 0.15; a < a1 - 0.2; a += 0.38) {
      const lit = hsh(a * 3 + seed, zz) < 0.22;
      poly([Q(a, zz), Q(a + 0.16, zz), Q(a + 0.16, zz + 4), Q(a, zz + 4)], lit ? (hsh(zz, a) < 0.5 ? '#f2d48a' : '#e8e0c0') : 'rgba(20,18,32,0.6)');
    }
  };
  block(true, 1.6, 5.2, 150, 1); block(true, 6.4, 10.6, 120, 2);
  block(false, 1.8, 6.8, 170, 3); block(false, 8.2, 12.6, 140, 4);
  { const [tx, ty] = P(4.3, 1, 156); g.fillStyle = '#4a4466'; g.font = 'bold 10px monospace'; g.textAlign = 'center'; g.fillText('103', tx, ty); } // 동 번호
  // 3) 전봇대 · 처진 전선
  {
    const [px, py] = P(1, H - 2.5, 0), [, pt] = P(1, H - 2.5, 140);
    g.fillStyle = '#3a3230'; g.fillRect(Math.round(px) - 2, Math.round(pt), 4, Math.round(py - pt));
    g.fillRect(Math.round(px) - 9, Math.round(pt) + 8, 18, 2);
    g.strokeStyle = 'rgba(30,24,30,0.85)'; g.lineWidth = 1;
    for (const dz of [8, 14]) { const [ax, ay] = [px - 8, pt + dz], [bx2, by2] = P(W - 2, 1, 150 - dz); g.beginPath(); g.moveTo(ax, ay); g.quadraticCurveTo((ax + bx2) / 2, Math.max(ay, by2) + 26, bx2, by2); g.stroke(); }
  }
  // 4) 낮은 시멘트 담 + 철망
  const wallL = '#9a968e', wallR = '#aaa69e';
  poly([P(1, 1, 0), P(1, H - 1, 0), P(1, H - 1, 18), P(1, 1, 18)], wallL);
  poly([P(1, 1, 0), P(W - 1, 1, 0), P(W - 1, 1, 18), P(1, 1, 18)], wallR);
  poly([P(1, 1, 18), P(1, H - 1, 18), P(1, H - 1, 21), P(1, 1, 21)], '#bab6ae');
  poly([P(1, 1, 18), P(W - 1, 1, 18), P(W - 1, 1, 21), P(1, 1, 21)], '#c6c2ba');
  for (let a = 1.5; a < H - 1; a += 1.3) poly([P(1, a, 2), P(1, a + 0.02, 2), P(1, a + 0.02, 18), P(1, a, 18)], '#8a867e'); // 블록 줄눈
  for (let a = 1.5; a < W - 1; a += 1.3) poly([P(a, 1, 2), P(a + 0.02, 1, 2), P(a + 0.02, 1, 18), P(a, 1, 18)], '#9a968e');
  g.strokeStyle = 'rgba(96,100,104,0.75)'; g.lineWidth = 1;
  for (const onLeft of [true, false]) {
    const n = onLeft ? H - 1 : W - 1;
    for (let a = 1; a <= n; a += 0.25) { const [x1p, y1p] = onLeft ? P(1, a, 21) : P(a, 1, 21), [x2p, y2p] = onLeft ? P(1, Math.min(n, a + 0.25), 48) : P(Math.min(n, a + 0.25), 1, 48); g.beginPath(); g.moveTo(x1p, y1p); g.lineTo(x2p, y2p); g.stroke(); const [x3p, y3p] = onLeft ? P(1, Math.min(n, a + 0.25), 21) : P(Math.min(n, a + 0.25), 1, 21), [x4p, y4p] = onLeft ? P(1, a, 48) : P(a, 1, 48); g.beginPath(); g.moveTo(x3p, y3p); g.lineTo(x4p, y4p); g.stroke(); }
    for (let a = 1; a <= n; a += 2) { const [x1p, y1p] = onLeft ? P(1, a, 18) : P(a, 1, 18), [, y2p] = onLeft ? P(1, a, 50) : P(a, 1, 50); g.fillStyle = '#5a5e62'; g.fillRect(Math.round(x1p) - 1, Math.round(y2p), 2, Math.round(y1p - y2p)); }
  }
  // 5) 모래 바닥 (점점이 자갈 · 발자국) + 연석
  const [fa, fb] = FLOORS.sand;
  for (let j = 1; j < H - 1; j++) for (let i = 1; i < W - 1; i++) {
    poly([P(i, j, 0), P(i + 1, j, 0), P(i + 1, j + 1, 0), P(i, j + 1, 0)], (i * 3 + j * 5) % 7 < 3 ? fb : fa);
    for (let n = 0; n < 3; n++) { const [sx, sy] = P(i + hsh(i, j + n), j + hsh(j, i + n), 0); g.fillStyle = hsh(n, i * j) < 0.5 ? '#b8a072' : '#e4d0a4'; g.fillRect(Math.round(sx), Math.round(sy), 2, 1); }
  }
  for (const [a, b2] of [[3.2, 3.6], [3.6, 4.3], [3.1, 5.0], [3.7, 5.7]] as const) { const [fx, fy] = P(a, b2, 0); g.fillStyle = 'rgba(150,120,80,0.5)'; g.beginPath(); g.ellipse(fx, fy, 3, 1.6, 0.3, 0, Math.PI * 2); g.fill(); } // 그네 밑 발자국
  { const [bx, by] = P(4.4, 7.6, 0); g.fillStyle = '#d8402a'; g.fillRect(Math.round(bx) - 3, Math.round(by) - 5, 6, 5); g.fillStyle = '#2a7ac8'; g.fillRect(Math.round(bx) + 4, Math.round(by) - 2, 7, 2); } // 두고 간 모래 놀이 통과 삽
  { const [lx, ly] = P(W - 2.5, 5.5, 0); const gl = g.createRadialGradient(lx, ly, 2, lx, ly, 46); gl.addColorStop(0, 'rgba(255,226,150,0.35)'); gl.addColorStop(1, 'rgba(255,220,150,0)'); g.fillStyle = gl; g.beginPath(); g.ellipse(lx, ly, 46, 24, 0, 0, Math.PI * 2); g.fill(); } // 가로등 불빛
  poly([P(1, 1, 0), P(W - 1, 1, 0), P(W - 1, H - 1, 0), P(1, H - 1, 0)], night ? '#101030' : '#3a2050', night ? 0.25 : 0.1); // 저녁빛
  poly([P(W - 1, 1, 0), P(W - 1, H - 1, 0), P(W - 1, H - 1, 6), P(W - 1, 1, 6)], '#8a867e');
  poly([P(1, H - 1, 0), P(W - 1, H - 1, 0), P(W - 1, H - 1, 6), P(1, H - 1, 6)], '#a29e96');
  const ex = info.exit;
  poly([P(ex.i, ex.j, 0.5), P(ex.i + 1, ex.j, 0.5), P(ex.i + 1, ex.j + 1, 0.5), P(ex.i, ex.j + 1, 0.5)], '#8a8478'); // 나가는 시멘트 길
  poly([P(ex.i, H - 1, 0), P(ex.i + 1, H - 1, 0), P(ex.i + 1.3, H - 0.2, 0), P(ex.i - 0.3, H - 0.2, 0)], '#fff2c8', 0.25);
  poly([P(1, 1, 0), P(1.06, 1, 0), P(1.06, 1, 21), P(1, 1, 21)], '#7a766e');
  return { canvas: c, x: minX, y: minY };
}

export function drawRoom(z: Zone, night: boolean): { canvas: HTMLCanvasElement; x: number; y: number } {
  if (z.interior!.kind === 'terrace') return drawTerrace(z);
  if (z.interior!.kind === 'cloudisle') return drawCloudIsle(z); // 46차
  if (z.interior!.kind === 'shore') return drawShore(z); // 24차 경계의 해변
  if (z.interior!.kind === 'home' && z.interior!.age === 0) return drawPlayground(z, night); // 34차 10대 유내의 놀이터
  if (z.interior!.kind === 'voidroom') return drawVoidRoom(z); // 34차 우주 위 유리 바닥의 방
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
      const alt = info.floor === 'prayer' ? j % 2 === 0 : info.floor === 'wood' || info.floor === 'dark' || info.floor === 'cloud' ? false : (i + j) % 2 === 0;
      poly([P(i, j, 0), P(i + 1, j, 0), P(i + 1, j + 1, 0), P(i, j + 1, 0)], alt ? fb : fa);
      if (info.floor === 'wood' || info.floor === 'dark') for (let k = 1; k < 4; k++) poly([P(i, j + k / 4, 0), P(i + 1, j + k / 4, 0), P(i + 1, j + k / 4 + 0.02, 0), P(i, j + k / 4 + 0.02, 0)], fb);
      if (info.floor === 'marble' && (i * 7 + j * 3) % 5 === 0) poly([P(i + 0.2, j + 0.3, 0), P(i + 0.7, j + 0.5, 0), P(i + 0.72, j + 0.53, 0), P(i + 0.22, j + 0.33, 0)], '#c4c0ba');
    }
  if (info.floor === 'cloud') {
    // 37차 환생의 테라스: 네모 칸 대신 구름을 밟는 듯 — 흰빛·모랫빛 번짐이 겹친 한 장의 바닥
    const fl = [P(1, 1, 0), P(W - 1, 1, 0), P(W - 1, H - 1, 0), P(1, H - 1, 0)];
    g.save();
    g.beginPath(); g.moveTo(fl[0][0], fl[0][1]); for (const q of fl.slice(1)) g.lineTo(q[0], q[1]); g.closePath(); g.clip();
    let sd = 7;
    const rr = () => { sd = (sd * 16807) % 2147483647; return sd / 2147483647; };
    for (let n = 0; n < (W + H) * 6; n++) {
      const [x, y] = P(1 + rr() * (W - 2), 1 + rr() * (H - 2), 0);
      const rad = 24 + rr() * 60;
      const col = rr() < 0.55 ? '#ffffff' : '#d8ccb4';
      const gr = g.createRadialGradient(x, y, 0, x, y, rad);
      gr.addColorStop(0, col); gr.addColorStop(1, col + '00');
      g.globalAlpha = 0.18 + rr() * 0.22;
      g.fillStyle = gr;
      g.beginPath(); g.ellipse(x, y, rad, rad * 0.5, 0, 0, Math.PI * 2); g.fill();
    }
    g.globalAlpha = 1;
    g.restore();
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
  const k = (info.kind === 'home' && info.age === 1) || info.kind === 'ysalon' ? 'salon' : info.kind === 'home' && info.age === 2 ? 'clinic' : info.kind, mid = Math.floor(W / 2); // 34차: 유내의 미용실·진료실은 그 가게처럼 꾸민다
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
  } else if ((k === 'food' || k === 'cafe' || k === 'mart') && z.city === 'seoul' && info.store) {
    // 33차 서울 가게: 한국어 메뉴판 (이 가게가 실제로 파는 것과 값 — 원)
    const menu = menuFor(k as 'food' | 'cafe' | 'mart', info.cuisine, true, info.name).slice(0, 5);
    // 34차: 값은 한국 메뉴판 식으로 천 원 단위 (7.0 = 7,000원) — 편의점 가격표만 원 단위 그대로
    const rows = menu.map((m) => { const won = Math.round(m.price * 40); return [itemByKey(m.key).name.ko, k === 'mart' ? won.toLocaleString('en-US') : (won / 1000).toFixed(1)] as [string, string]; });
    // 34차: 벽에 붙인 메뉴 — 한국 가게 벽에 나란히 박은 세로 메뉴 패 (이름은 세로로, 값은 아래). 패가 좁아 벽면 기울기에도 글씨가 곧게 읽힌다.
    // 식당 = 나무 패에 먹글씨 · 카페 = 검은 칠판 패에 분필 글씨 · 편의점 = 흰 가격표에 파란 띠. 글씨는 세 배로 그려 벽면에 맞춰 줄인다
    const look = k === 'cafe' ? { bg: '#24221f', ink: '#efe8d8', price: '#e8c86a', edge: '#5a3e28' } : k === 'mart' ? { bg: '#f6f6f2', ink: '#1e2a3a', price: '#c8302a', edge: '#2a6aa8' } : { bg: '#d8b880', ink: '#2a1a10', price: '#7a1a10', edge: '#7a5430' };
    const FONT = '"Apple SD Gothic Neo","Malgun Gothic","Noto Sans KR","Nanum Gothic",sans-serif';
    const S = 3, PW = k === 'mart' ? 19 : 17, GAP = k === 'mart' ? 3 : 4, ZT = 92;
    const x0w = k === 'mart' ? Math.max(6.05, W - 1.25 - (rows.length * (PW + GAP)) / 32) : k === 'cafe' ? 1.5 : mid - 2; // 편의점: 진열대(왼쪽)와 벽 끝(오른쪽) 사이에
    // 패를 박은 나무 띠 (벽 위쪽)
    poly([P(x0w - 0.1, 1, ZT + 4), P(x0w + (rows.length * (PW + GAP)) / 32 + 0.05, 1, ZT + 4), P(x0w + (rows.length * (PW + GAP)) / 32 + 0.05, 1, ZT), P(x0w - 0.1, 1, ZT)], look.edge);
    rows.forEach(([nm, pr], r) => {
      const chars = Array.from(nm);
      const PH = 8 + chars.length * 10 + 13;
      const off = document.createElement('canvas'); off.width = PW * S; off.height = PH * S;
      const o = off.getContext('2d')!;
      o.fillStyle = look.edge; o.fillRect(0, 0, PW * S, PH * S);
      o.fillStyle = look.bg; o.fillRect(S, S, (PW - 2) * S, (PH - 2) * S);
      if (k === 'mart') { o.fillStyle = look.edge; o.fillRect(S, S, (PW - 2) * S, 4 * S); }
      if (k === 'food') { o.fillStyle = 'rgba(120,80,40,0.25)'; for (let yy = 4; yy < PH; yy += 5) o.fillRect(2 * S, yy * S, (PW - 4) * S, Math.max(1, S >> 1)); } // 나뭇결
      o.textAlign = 'center'; o.textBaseline = 'middle';
      o.fillStyle = look.ink; o.font = `700 ${9 * S}px ${FONT}`;
      chars.forEach((ch, n) => o.fillText(ch, (PW / 2) * S, (7 + 4 + n * 10) * S));
      o.fillStyle = look.price; o.font = `800 ${(k === 'mart' ? 6.4 : 7.4) * S}px ${FONT}`;
      o.fillText(pr, (PW / 2) * S, (PH - 6) * S);
      if (night) { o.fillStyle = 'rgba(255,240,200,0.08)'; o.fillRect(0, 0, off.width, off.height); }
      const xa = x0w + (r * (PW + GAP)) / 32;
      poly([P(xa + 0.06, 1, ZT - 2), P(xa + 0.06 + PW / 32, 1, ZT - 2), P(xa + 0.06 + PW / 32, 1, ZT - PH - 3), P(xa + 0.06, 1, ZT - PH - 3)], 'rgba(0,0,0,0.2)'); // 벽 그림자
      const [ox, oy] = P(xa, 1, ZT);
      g.save();
      g.imageSmoothingEnabled = true;
      g.setTransform(1 / S, 0.5 / S, 0, 1 / S, ox, oy);
      g.drawImage(off, 0, 0);
      g.restore();
      const [nx, ny] = P(xa + PW / 64, 1, ZT - 1); g.fillStyle = '#3a3230'; g.fillRect(Math.round(nx), Math.round(ny), 1, 1); // 못
    });
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
  if (k === 'clinic' && info.kind === 'home') {
    // 34차 진료실: 왼쪽 벽 엑스레이 판 (빛나는 흰 판 · 갈비뼈 그림자)
    const yc = 5.1;
    poly([P(1, yc - 0.8, 38), P(1, yc + 0.8, 38), P(1, yc + 0.8, 74), P(1, yc - 0.8, 74)], '#3a4448');
    poly([P(1, yc - 0.7, 41), P(1, yc + 0.7, 41), P(1, yc + 0.7, 71), P(1, yc - 0.7, 71)], night ? '#a8c8d8' : '#dceef4');
    poly([P(1, yc - 0.1, 44), P(1, yc + 0.1, 44), P(1, yc + 0.1, 68), P(1, yc - 0.1, 68)], '#6a7a84'); // 등뼈
    for (let r = 0; r < 5; r++) for (const sd of [-1, 1]) { const y0 = yc + sd * 0.08, y2 = yc + sd * 0.55; poly([P(1, y0, 64 - r * 4.6), P(1, y2, 61 - r * 4.6), P(1, y2, 59.6 - r * 4.6), P(1, y0, 62.6 - r * 4.6)], '#7a8a94'); }
  }
  if (k === 'clinic') {
    // 시력표: 흰 판에 아래로 갈수록 작아지는 검은 글자 줄
    onR(mid - 1.6, mid - 0.4, 36, 74, '#f4f4ee'); for (let r = 0; r < 6; r++) { const half = 0.42 - r * 0.06; onR(mid - 1 - half, mid - 1 + half, 68 - r * 5.5, 70.5 - r * 5.5, '#1e1e1e'); }
    frame(mid + 0.4, mid + 1.8, 40, 62, '#cfe6e0');
  } else if (k === 'food' && z.city !== 'seoul') { // 33차: 서울 식당은 홍등 대신 매단 한국어 메뉴판
    // 홍등: 벽 위로 걸린 줄에 붉은 등 다섯
    onR(1.5, W - 1.5, 90, 91, '#2a2a2a');
    for (let x = 2.2; x < W - 2; x += (W - 4) / 5) { const [lx, ly] = P(x, 1, 84); g.fillStyle = '#c8282a'; g.beginPath(); g.ellipse(lx, ly, 5, 6, 0, 0, Math.PI * 2); g.fill(); g.fillStyle = '#e8b83a'; g.fillRect(Math.round(lx) - 3, Math.round(ly) - 7, 6, 2); g.fillRect(Math.round(lx) - 3, Math.round(ly) + 5, 6, 2); if (night) { g.fillStyle = 'rgba(255,120,80,0.25)'; g.beginPath(); g.ellipse(lx, ly, 10, 11, 0, 0, Math.PI * 2); g.fill(); } }
  } else if (k === 'cafe') {
    // 컵 선반: 나무 선반 둘에 색 다른 머그
    for (const z of [40, 52]) { onR(W - 5, W - 2, z, z + 2, '#6a4a32'); for (let x = W - 4.8; x < W - 2.3; x += 0.42) onR(x, x + 0.26, z + 2, z + 7, ['#f2ece0', '#c86a4a', '#3a6a8a', '#e8c86a'][Math.floor(x * 7) % 4]); }
    if (z.city !== 'seoul') frame(2, 3.4, 44, 66, '#8aa86a'); // 33차: 서울 카페는 그 자리에 메뉴판
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
  const extra = f.kind === 'hut' || f.kind === 'hut2' ? 44 : f.kind === 'hcross' ? 30 : f.kind === 'lampstand' ? 12 : f.kind === 'kbed' ? 34 : f.kind === 'flattv' ? 14 : f.kind === 'homesofa' ? 14 : f.kind === 'vbed' ? 24 : f.kind === 'plamp' ? 30 : f.kind === 'salonchair' && f.v === 9 ? 30 : f.kind === 'ivstand' || f.kind === 'hooddryer' ? 16 : f.kind === 'gkbrazier' ? 40 : f.kind === 'gkdesk' ? 20 : f.kind === 'xchdesk' ? 30 : f.kind === 'altar' ? 64 : f.kind === 'rgate' ? 46 : f.kind === 'cpillar' ? 30 : f.kind === 'salonchair' || f.kind === 'candle' || f.kind === 'fan' || f.kind === 'lamp' || f.kind === 'cooler' ? 18 : 14;
  const minX = (i - j1) * (TW / 2) - 4, maxX = (i1 - j) * (TW / 2) + 4;
  const minY = (i + j) * (TH / 2) - h - extra, maxY = (i1 + j1) * (TH / 2) + 4;
  const { c, g, P, poly } = painter(minX, minY, maxX - minX, maxY - minY);
  const box = (x0: number, y0: number, x2: number, y2: number, z0: number, z1: number, top: string, left: string, right: string) => {
    poly([P(x2, y0, z0), P(x2, y2, z0), P(x2, y2, z1), P(x2, y0, z1)], right);
    poly([P(x0, y2, z0), P(x2, y2, z0), P(x2, y2, z1), P(x0, y2, z1)], left);
    poly([P(x0, y0, z1), P(x2, y0, z1), P(x2, y2, z1), P(x0, y2, z1)], top);
    // 43차: 손으로 찍은 도트처럼 모서리를 또렷하게 — 앞 윗모서리 두 줄은 밝게, 앞 세로 모서리는 어둡게 (아주 얇은 것은 건너뛴다)
    if (z1 - z0 >= 3 && Math.min(x2 - x0, y2 - y0) >= 0.12) {
      const ln = (a: [number, number], b2: [number, number], col: string) => { g.strokeStyle = col; g.lineWidth = 1; g.beginPath(); g.moveTo(Math.round(a[0]) + 0.5, Math.round(a[1]) + 0.5); g.lineTo(Math.round(b2[0]) + 0.5, Math.round(b2[1]) + 0.5); g.stroke(); };
      ln(P(x0, y2, z1), P(x2, y2, z1), mixHex(top, '#ffffff', 0.35));
      ln(P(x2, y0, z1), P(x2, y2, z1), mixHex(top, '#ffffff', 0.25));
      ln(P(x2, y2, z0), P(x2, y2, z1), mixHex(right, '#000000', 0.35));
    }
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
    case 'vbed': {
      // 34차 우주의 방 침대: 나무 머리판 · 흰 이불 위 접힌 푸른 이불 · 베개 둘 (누군가 막 일어난 듯 한쪽이 젖혀졌다)
      B3(i + 0.05, j + 0.05, i1 - 0.05, j1 - 0.05, 0, 8, '#6a4a32');
      box(i + 0.08, j + 0.08, i1 - 0.08, j1 - 0.08, 8, h, '#f2f0ea', '#d8d4cc', '#c4c0b8');
      B3(i + 0.05, j + 0.02, i1 - 0.05, j + 0.16, 0, h + 18, '#7a5638');
      for (const x of [i + 0.25, i + 1.1]) B3(x, j + 0.25, x + 0.65, j + 0.65, h, h + 4, '#ffffff');
      poly([P(i + 0.1, j + 1.3, h + 1), P(i1 - 0.1, j + 1.3, h + 1), P(i1 - 0.1, j1 - 0.1, h + 1), P(i + 0.1, j1 - 0.1, h + 1)], '#4a6a9a');
      poly([P(i + 0.1, j + 1.3, h + 1), P(i + 1.0, j + 1.1, h + 3), P(i + 1.0, j + 1.3, h + 3), P(i + 0.1, j + 1.5, h + 1)], '#6a8aba');
      faceL(i + 0.1, i1 - 0.1, 2, h, '#3a5a8a');
      break;
    }
    // ── 34차: 유내의 세 곳 ──
    case 'swing': {
      // 그네: 양 끝 ㅅ자 붉은 쇠다리 · 가로대 · 쇠사슬 · 검은 고무 앉을판 둘
      const ln = (a: Pt, b: Pt, wd: number, col: string) => { g.strokeStyle = col; g.lineWidth = wd; g.lineCap = 'round'; g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.stroke(); };
      const red = '#b8402e', redD = '#7e2a20';
      for (const x of [i + 0.15, i1 - 0.15]) ln(P(x, j + 0.05, 0), P(x, j + 0.5, h), 3, redD); // 뒷다리
      ln(P(i + 0.15, j + 0.5, h), P(i1 - 0.15, j + 0.5, h), 3.5, red); // 가로대
      for (const x of [i + 1.5, i + 2.5]) {
        for (const dx of [-0.2, 0.2]) ln(P(x + dx, j + 0.5, h - 1), P(x + dx, j + 0.5, 13), 1, '#8a8a8a');
        B3(x - 0.24, j + 0.38, x + 0.24, j + 0.62, 10, 12.5, '#2a2a2a');
      }
      for (const x of [i + 0.15, i1 - 0.15]) ln(P(x, j + 0.95, 0), P(x, j + 0.5, h), 3, red); // 앞다리
      break;
    }
    case 'slide': {
      // 미끄럼틀: 뒤 사다리 → 난간 두른 발판 → 앞으로 내려오는 노란 미끄럼판
      const ln = (a: Pt, b: Pt, wd: number, col: string) => { g.strokeStyle = col; g.lineWidth = wd; g.lineCap = 'round'; g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.stroke(); };
      const ph = h - 6, pj0 = j + 0.35, pj1 = j + 1.15;
      for (const x of [i + 0.45, i1 - 0.45]) ln(P(x, j + 0.05, 0), P(x, pj0, ph), 2.5, '#2a5a9a'); // 사다리 기둥
      for (let r = 1; r < 5; r++) { const t2 = r / 5; ln(P(i + 0.45, j + 0.05 + (pj0 - j - 0.05) * t2, ph * t2), P(i1 - 0.45, j + 0.05 + (pj0 - j - 0.05) * t2, ph * t2), 1.5, '#4a7ab8'); }
      for (const [x, y] of [[i + 0.4, pj1], [i1 - 0.4, pj1]] as const) ln(P(x, y, 0), P(x, y, ph), 2.5, '#2a5a9a');
      B3(i + 0.35, pj0, i1 - 0.35, pj1, ph - 2, ph, '#3a6aa8'); // 발판
      for (const x of [i + 0.35, i1 - 0.35]) ln(P(x, pj0, ph + 9), P(x, pj1, ph + 9), 2, '#c8402e'); // 난간
      for (const [x, y] of [[i + 0.35, pj0], [i1 - 0.35, pj0], [i + 0.35, pj1], [i1 - 0.35, pj1]] as const) ln(P(x, y, ph), P(x, y, ph + 9), 2, '#c8402e');
      // 미끄럼판
      poly([P(i + 0.5, pj1, ph), P(i1 - 0.5, pj1, ph), P(i1 - 0.5, j1 - 0.1, 2), P(i + 0.5, j1 - 0.1, 2)], '#e8b83a');
      poly([P(i + 0.62, pj1, ph - 0.5), P(i1 - 0.62, pj1, ph - 0.5), P(i1 - 0.62, j1 - 0.15, 2), P(i + 0.62, j1 - 0.15, 2)], '#f4d060');
      for (const x of [i + 0.5, i1 - 0.5]) poly([P(x, pj1, ph), P(x, j1 - 0.1, 2), P(x, j1 - 0.1, 6), P(x, pj1, ph + 4)], '#c8902a');
      break;
    }
    case 'seesaw': {
      // 시소: 가운데 받침 · 기운 널빤지 · 양끝 손잡이
      const ln = (a: Pt, b: Pt, wd: number, col: string) => { g.strokeStyle = col; g.lineWidth = wd; g.lineCap = 'round'; g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.stroke(); };
      const cxm = i + w / 2;
      poly([P(cxm - 0.3, j + 0.5, 0), P(cxm + 0.3, j + 0.5, 0), P(cxm, j + 0.5, 8)], '#5a5e64');
      poly([P(i + 0.1, j + 0.32, 3), P(i1 - 0.1, j + 0.32, 13), P(i1 - 0.1, j + 0.68, 13), P(i + 0.1, j + 0.68, 3)], '#3a8a5a');
      poly([P(i + 0.1, j + 0.68, 3), P(i1 - 0.1, j + 0.68, 13), P(i1 - 0.1, j + 0.68, 11), P(i + 0.1, j + 0.68, 1)], '#2a6a42');
      for (const [x, z] of [[i + 0.45, 4.5], [i1 - 0.45, 11.5]] as const) ln(P(x, j + 0.5, z), P(x, j + 0.5, z + 7), 2, '#c8402e');
      break;
    }
    case 'jungle': {
      // 정글짐: 세 겹 쇠 격자 (칠이 벗겨진 파랑·초록)
      const ln = (a: Pt, b: Pt, wd: number, col: string) => { g.strokeStyle = col; g.lineWidth = wd; g.lineCap = 'round'; g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.stroke(); };
      const xs = [i + 0.1, i + w / 2, i1 - 0.1], ys = [j + 0.1, j + d / 2, j1 - 0.1], zs = [h / 3, (h * 2) / 3, h];
      const col = (n: number) => (n % 2 ? '#3a7a5a' : '#2a5a9a');
      for (const y of ys) for (const x of xs) ln(P(x, y, 0), P(x, y, h), 2, '#24486a');
      zs.forEach((z, n) => { for (const y of ys) ln(P(xs[0], y, z), P(xs[2], y, z), 1.8, col(n)); for (const x of xs) ln(P(x, ys[0], z), P(x, ys[2], z), 1.8, col(n + 1)); });
      break;
    }
    case 'pbench': {
      // 공원 벤치: 쇠다리 · 나무 살 앉을판 · 등받이 (뒤쪽)
      for (const x of [i + 0.15, i1 - 0.2]) B3(x, j + 0.25, x + 0.06, j + 0.8, 0, h, '#3a3a3a');
      for (let n = 0; n < 3; n++) B3(i + 0.05, j + 0.3 + n * 0.17, i1 - 0.05, j + 0.42 + n * 0.17, h - 2, h, '#9a6a3e');
      for (let n = 0; n < 2; n++) B3(i + 0.05, j + 0.2, i1 - 0.05, j + 0.28, h + 4 + n * 6, h + 8 + n * 6, '#8a5e36');
      break;
    }
    case 'plamp': {
      // 놀이터 가로등: 긴 쇠기둥 · 꺾인 팔 · 등갓 (해 질 녘이라 켜져 있다)
      const [bx, by] = P(i + 0.5, j + 0.5, 0), [tx, ty] = P(i + 0.5, j + 0.5, h - 6);
      g.fillStyle = '#2e3236'; g.fillRect(Math.round(bx) - 2, Math.round(ty), 4, Math.round(by - ty));
      g.fillRect(Math.round(tx) - 12, Math.round(ty) - 2, 14, 3);
      const lx = Math.round(tx) - 12, ly = Math.round(ty) + 1;
      const gl = g.createRadialGradient(lx, ly + 4, 1, lx, ly + 4, 26); gl.addColorStop(0, 'rgba(255,230,160,0.75)'); gl.addColorStop(1, 'rgba(255,220,150,0)');
      g.fillStyle = gl; g.beginPath(); g.ellipse(lx, ly + 4, 26, 26, 0, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#3a3e42'; g.beginPath(); g.moveTo(lx - 6, ly + 4); g.lineTo(lx + 6, ly + 4); g.lineTo(lx + 3, ly - 1); g.lineTo(lx - 3, ly - 1); g.closePath(); g.fill();
      g.fillStyle = '#fff2c4'; g.fillRect(lx - 4, ly + 4, 8, 2);
      break;
    }
    case 'hooddryer': {
      // 둥근 머리 말리개: 의자 + 뒤에서 솟은 대 + 크림색 둥근 갓
      B3(i + 0.25, j + 0.3, i1 - 0.25, j1 - 0.2, 0, 14, '#5a3a44'); B3(i + 0.25, j + 0.15, i1 - 0.25, j + 0.3, 14, 28, '#4a2e38');
      B3(i + 0.46, j + 0.18, i + 0.54, j + 0.26, 28, h - 6, '#8a8a86');
      const [hx, hy] = P(i + 0.5, j + 0.45, h);
      g.fillStyle = '#b8ab98'; g.beginPath(); g.ellipse(hx, hy + 2, 11, 9, 0, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#e8dcc8'; g.beginPath(); g.ellipse(hx, hy, 10, 8, 0, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#5a4a3a'; g.beginPath(); g.ellipse(hx + 1, hy + 5, 7, 3, 0, 0, Math.PI); g.fill();
      break;
    }
    case 'washbasin': {
      // 머리 감는 곳: 뒤쪽 흰 세면 대야(목 받침) · 앞쪽 뒤로 젖힌 의자 · 샤워기
      B3(i + 0.1, j + 0.05, i1 - 0.1, j + 0.9, 0, h, '#2a2a2e');
      const [sx, sy] = P(i + 0.5, j + 0.48, h);
      g.fillStyle = '#f2f2ee'; g.beginPath(); g.ellipse(sx, sy, 10, 6, 0, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#c8d0d4'; g.beginPath(); g.ellipse(sx, sy + 1, 7, 3.5, 0, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#9aa0a4'; g.fillRect(Math.round(sx) - 1, Math.round(sy) - 10, 2, 8); g.fillRect(Math.round(sx) - 1, Math.round(sy) - 10, 5, 2);
      B3(i + 0.2, j + 1.0, i1 - 0.2, j1 - 0.05, 0, 12, '#3a3236');
      poly([P(i + 0.2, j + 0.95, 12), P(i1 - 0.2, j + 0.95, 12), P(i1 - 0.2, j + 1.2, 22), P(i + 0.2, j + 1.2, 22)], '#4a4046'); // 젖힌 등받이
      break;
    }
    case 'mdesk': {
      // 진료 책상: 흰 상판 · 모니터 · 차트철 · 펜꽂이 · 혈압계 (의사는 없다)
      B3(i + 0.05, j + 0.1, i1 - 0.05, j1 - 0.1, 0, h - 3, '#b8b0a2');
      box(i, j + 0.05, i1, j1 - 0.05, h - 3, h, '#eeeae2', '#d6d0c4', '#c0baae');
      B3(i1 - 1.0, j + 0.2, i1 - 0.3, j + 0.32, h, h + 18, '#2a2c30'); faceL(i1 - 0.95, i1 - 0.35, h + 4, h + 16, night ? '#5a8ab0' : '#7ab0d0');
      B3(i + 0.3, j + 0.45, i + 0.9, j + 0.85, h, h + 2, '#e8e4d4'); B3(i + 0.32, j + 0.47, i + 0.88, j + 0.83, h + 2, h + 3, '#c8d8e8'); // 차트
      B3(i + 1.2, j + 0.5, i + 1.32, j + 0.62, h, h + 6, '#5a6a7a');
      B3(i + 1.5, j + 0.4, i + 1.9, j + 0.8, h, h + 4, '#3a4a5a'); // 혈압계
      break;
    }
    case 'ivstand': {
      // 링거대: 바퀴 달린 받침 · 긴 대 · 걸린 수액 봉지와 줄
      const [bx, by] = P(i + 0.5, j + 0.5, 0), [, ty] = P(i + 0.5, j + 0.5, h);
      g.fillStyle = '#6a6e72'; g.fillRect(Math.round(bx) - 6, Math.round(by) - 1, 12, 2);
      g.fillStyle = '#9aa0a4'; g.fillRect(Math.round(bx) - 1, Math.round(ty), 2, Math.round(by - ty));
      g.fillRect(Math.round(bx) - 6, Math.round(ty), 12, 2);
      g.fillStyle = 'rgba(200,230,240,0.85)'; g.fillRect(Math.round(bx) - 5, Math.round(ty) + 3, 6, 10);
      g.fillStyle = '#e8f4f8'; g.fillRect(Math.round(bx) - 4, Math.round(ty) + 4, 2, 5);
      g.strokeStyle = 'rgba(220,235,240,0.9)'; g.lineWidth = 1; g.beginPath(); g.moveTo(bx - 2, ty + 13); g.quadraticCurveTo(bx - 10, ty + 30, bx - 16, ty + 34); g.stroke();
      break;
    }
    case 'counter': case 'kitchen': case 'bar': case 'teller': {
      const wood = f.kind === 'bar' ? '#4a2a22' : f.kind === 'teller' ? '#6a7a8a' : f.kind === 'kitchen' ? '#8a8a86' : info.trim;
      B3(i, j, i1, j1, 0, h - 3, wood);
      box(i - 0.05, j - 0.05, i1 + 0.05, j1 + 0.05, h - 3, h, '#e8e4dc', '#c8c4bc', '#b0aca4');
      if (f.kind === 'teller') { poly([P(i, j + 0.5, h), P(i1, j + 0.5, h), P(i1, j + 0.5, h + 34), P(i, j + 0.5, h + 34)], '#bcdce8', 0.35); for (let x = i + 1; x < i1; x += 1.5) poly([P(x, j + 0.5, h), P(x + 0.04, j + 0.5, h), P(x + 0.04, j + 0.5, h + 34), P(x, j + 0.5, h + 34)], '#8a9aa8'); }
      if (f.kind === 'kitchen') {
        // 43차: 붙박이 주방 — 아래 서랍 문짝 줄 · 스테인리스 개수대와 수도꼭지 · 가스레인지 화구 둘 · 벽의 위 수납장과 후드
        for (let x = i + 0.08; x < i1 - 0.1; x += 0.5) faceL(x, x + 0.44, 3, h - 6, mixHex(wood, '#ffffff', 0.1));
        for (let x = i + 0.2; x < i1 - 0.1; x += 0.5) faceL(x, x + 0.1, h - 10, h - 9, '#d8d8d4');
        box(i + 0.25, j + 0.2, i + 1.05, j + 0.75, h - 1, h + 0.5, '#c8ccd0', '#a8acb0', '#90949a');
        poly([P(i + 0.32, j + 0.28, h + 0.6), P(i + 0.98, j + 0.28, h + 0.6), P(i + 0.98, j + 0.68, h + 0.6), P(i + 0.32, j + 0.68, h + 0.6)], '#7a8288');
        B3(i + 0.62, j + 0.08, i + 0.68, j + 0.16, h, h + 9, '#d8dcde');
        for (const x of [i1 - 1.0, i1 - 0.55]) { const [bx, by] = P(x + 0.18, j + 0.45, h + 0.6); g.fillStyle = '#1e1e1e'; g.beginPath(); g.ellipse(bx, by, 5, 2.6, 0, 0, Math.PI * 2); g.fill(); g.strokeStyle = night ? '#3a6ae8' : '#5a5a5a'; g.lineWidth = 1; g.beginPath(); g.ellipse(bx, by, 3, 1.5, 0, 0, Math.PI * 2); g.stroke(); }
        box(i, j, i1, j + 0.35, h + 26, h + 44, '#e8e4dc', mixHex(wood, '#ffffff', 0.15), mixHex(wood, '#000000', 0.1));
        for (let x = i + 0.08; x < i1 - 0.1; x += 0.75) faceL(x, x + 0.68, h + 28, h + 42, mixHex(wood, '#ffffff', 0.25));
        box(i1 - 1.05, j, i1 - 0.35, j + 0.55, h + 20, h + 26, '#b8bcc0', '#a0a4a8', '#888c90');
      }
      if (f.kind === 'counter') B3(i1 - 0.8, j + 0.2, i1 - 0.3, j + 0.7, h, h + 7, '#2a2a2a'); // 계산대
      if (f.kind === 'bar') for (let x = i + 0.4; x < i1; x += 0.9) B3(x, j + 0.3, x + 0.12, j + 0.42, h, h + 8, pick(Math.floor(x * 5)));
      break;
    }
    case 'shelf': {
      if (f.v === 7) {
        // 34차 약장: 흰 철제 · 유리문 너머 약병
        B3(i + 0.1, j, i1, j1, 0, h, '#e8eae8');
        faceL(i + 0.16, i1 - 0.06, 6, h - 4, '#cfe0e4'); faceR(j + 0.08, j1 - 0.08, 6, h - 4, night ? '#8aa8b4' : '#bcd4dc');
        for (let z = 10; z < h - 6; z += 10) for (let y = j + 0.15; y < j1 - 0.15; y += 0.2) faceR(y, y + 0.1, z, z + 6, ['#f2f2ee', '#c86a3a', '#3a7a9a', '#e8d8a8'][Math.floor(y * 9 + z) % 4]);
        poly([P(i1, j + 0.2, 10), P(i1, j + 0.3, 10), P(i1, j + 0.5, h - 8), P(i1, j + 0.4, h - 8)], '#ffffff', 0.4);
        break;
      }
      B3(i, j, i1, j1, 0, h, '#8a8a86');
      for (let z = 6; z < h - 4; z += 11) {
        for (let x = i + 0.05; x < i1 - 0.1; x += 0.22) faceL(x, x + 0.16, z, z + 7, pick(Math.floor(x * 11 + z)));
        for (let y = j + 0.05; y < j1 - 0.1; y += 0.22) faceR(y, y + 0.16, z, z + 7, pick(Math.floor(y * 13 + z)));
      }
      break;
    }
    case 'fridge': {
      if (info.kind === 'home') {
        // 43차 옛집 냉장고: 누렇게 바랜 상아색 · 위 냉동칸 · 세로 손잡이 · 붙여 둔 자석과 쪽지
        B3(i + 0.05, j + 0.08, i1 - 0.05, j1 - 0.05, 0, h, '#e8e0c8');
        faceL(i + 0.08, i1 - 0.08, h - 16, h - 15, '#a89a7a');
        for (const [z0, z1] of [[h - 13, h - 4], [12, h - 20]]) faceL(i1 - 0.22, i1 - 0.17, z0, z1, '#8a8070');
        for (const [x, z, col] of [[i + 0.3, h - 26, '#c83a3a'], [i + 0.5, h - 32, '#3a7aa8'], [i + 0.38, h - 40, '#f2f0e4']] as [number, number, string][]) faceL(x, x + 0.12, z, z + 3, col);
        break;
      }
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
    case 'chair': case 'stool': {
      // 43차: 상자 대신 진짜 의자 — 네 다리 · 앉는 판 · (의자는) 등받이. v=1은 등받이가 반대쪽
      const col = f.kind === 'stool' ? '#5a3a2a' : info.kind === 'myhome' || info.kind === 'furnshop' ? '#7a5638' : '#6a7a8a';
      for (const [x, y] of [[i + 0.27, j + 0.27], [i1 - 0.33, j + 0.27], [i + 0.27, j1 - 0.33], [i1 - 0.33, j1 - 0.33]]) B3(x, y, x + 0.06, y + 0.06, 0, h - 3, mixHex(col, '#000000', 0.25));
      box(i + 0.24, j + 0.24, i1 - 0.24, j1 - 0.24, h - 3, h, mixHex(col, '#ffffff', 0.2), col, mixHex(col, '#000000', 0.2));
      if (f.kind === 'chair') { const back = f.v === 1 ? j1 - 0.3 : j + 0.24; B3(i + 0.24, back, i1 - 0.24, back + 0.06, h, h + 13, col); }
      break;
    }
    case 'bench': B3(i + 0.05, j + 0.2, i1 - 0.05, j1 - 0.2, 0, h, '#6a7a8a'); break;
    case 'sofa': B3(i + 0.05, j + 0.05, i1 - 0.05, j1 - 0.05, 0, h, '#7a4a5a'); B3(i + 0.05, j + 0.05, i + 0.3, j1 - 0.05, h, h + 10, '#6a3a4a'); break;
    case 'bed': {
      B3(i + 0.05, j + 0.05, i1 - 0.05, j1 - 0.05, 0, h - 4, '#a8b0b4');
      box(i + 0.05, j + 0.05, i1 - 0.05, j1 - 0.05, h - 4, h, '#f4f4f0', '#dcdcd8', '#c8c8c4');
      B3(i + 0.15, j + 0.1, i1 - 0.15, j + 0.45, h, h + 3, '#ffffff');
      if (f.v === 1) { // 34차: 방금까지 누가 누워 있던 것처럼 젖혀진 담요 · 베개에 눌린 자국
        poly([P(i + 0.1, j + 0.9, h + 1), P(i1 - 0.1, j + 0.7, h + 1), P(i1 - 0.1, j1 - 0.1, h + 1), P(i + 0.1, j1 - 0.1, h + 1)], '#9ab8d8');
        poly([P(i + 0.1, j + 0.9, h + 1), P(i1 - 0.1, j + 0.7, h + 1), P(i1 - 0.1, j + 0.85, h + 3), P(i + 0.1, j + 1.05, h + 3)], '#b8d0e8');
        const [px, py] = P(i + 0.5, j + 0.28, h + 3); g.fillStyle = '#e0e0da'; g.beginPath(); g.ellipse(px, py, 4, 2, 0, 0, Math.PI * 2); g.fill();
      }
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
    // ── 46차 구름 위의 오두막 ──
    case 'hut': case 'hut2': {
      // 통나무 오두막: 돌 기초 · 꿀빛 통나무 벽 · 하늘빛(쌍둥이네는 분홍) 너와 지붕 · 굴뚝 · 둥근 창의 따뜻한 불빛 · 꽃 상자 · 앞문
      const twins = f.kind === 'hut2';
      const x0 = i + 0.2, x2 = i1 - 0.2, y0 = j + 0.2, y2 = j1 - 0.2, wallH = h * 0.55, ym = (y0 + y2) / 2;
      B3(x0 - 0.05, y0 - 0.05, x2 + 0.05, y2 + 0.05, 0, 5, '#b8b0a0');
      const log = twins ? '#e8c89a' : '#d8a868';
      for (let z = 5; z < wallH; z += 5) { box(x0, y0, x2, y2, z, Math.min(wallH, z + 5), mixHex(log, '#ffffff', 0.15), mixHex(log, '#000000', (z / 5) % 2 ? 0.06 : 0.12), mixHex(log, '#000000', (z / 5) % 2 ? 0.22 : 0.28)); }
      // 앞문 (+j 면) · 둥근 창
      const dx = (x0 + x2) / 2;
      poly([P(dx - 0.35, y2 + 0.01, 5), P(dx + 0.35, y2 + 0.01, 5), P(dx + 0.35, y2 + 0.01, 30), P(dx - 0.35, y2 + 0.01, 30)], '#7a4e2e');
      poly([P(dx - 0.29, y2 + 0.02, 7), P(dx + 0.29, y2 + 0.02, 7), P(dx + 0.29, y2 + 0.02, 28), P(dx - 0.29, y2 + 0.02, 28)], '#8e5c36');
      { const [kx, ky] = P(dx + 0.2, y2 + 0.03, 18); g.fillStyle = '#e8c45a'; g.fillRect(Math.round(kx), Math.round(ky), 2, 2); }
      for (const wx of [x0 + 0.6, x2 - 0.6]) { const [cx, cy] = P(wx, y2 + 0.01, wallH * 0.62); g.fillStyle = '#7a4e2e'; g.beginPath(); g.ellipse(cx, cy, 8, 8, 0, 0, Math.PI * 2); g.fill(); g.fillStyle = '#ffe9a8'; g.beginPath(); g.ellipse(cx, cy, 6, 6, 0, 0, Math.PI * 2); g.fill(); g.strokeStyle = '#7a4e2e'; g.lineWidth = 1; g.beginPath(); g.moveTo(cx - 6, cy); g.lineTo(cx + 6, cy); g.moveTo(cx, cy - 6); g.lineTo(cx, cy + 6); g.stroke();
        poly([P(wx - 0.35, y2 + 0.05, wallH * 0.62 - 11), P(wx + 0.35, y2 + 0.05, wallH * 0.62 - 11), P(wx + 0.35, y2 + 0.05, wallH * 0.62 - 15), P(wx - 0.35, y2 + 0.05, wallH * 0.62 - 15)], '#8a5a32');
        for (let k = 0; k < 4; k++) { const [fx, fy] = P(wx - 0.28 + k * 0.18, y2 + 0.06, wallH * 0.62 - 13); g.fillStyle = ['#f4a8c0', '#ffffff', '#f6d860', '#a8c8f4'][k]; g.beginPath(); g.arc(fx, fy - 3, 2.4, 0, Math.PI * 2); g.fill(); } }
      { const [cx, cy] = P(x2 + 0.01, ym, wallH * 0.6); g.fillStyle = '#7a4e2e'; g.beginPath(); g.ellipse(cx, cy, 6, 7, 0, 0, Math.PI * 2); g.fill(); g.fillStyle = '#ffe2a0'; g.beginPath(); g.ellipse(cx, cy, 4.5, 5.5, 0, 0, Math.PI * 2); g.fill(); }
      // 지붕: 앞뒤로 기운 박공 (처마가 튀어나온다) · 너와 줄무늬
      const roofC = twins ? '#e89aa8' : '#7aa8d8', RZ = h;
      const eave = 0.35;
      const front = [P(x0 - eave, y2 + eave, wallH - 2), P(x2 + eave, y2 + eave, wallH - 2), P(x2 + eave, ym, RZ), P(x0 - eave, ym, RZ)] as Pt[];
      poly(front, roofC);
      for (let k = 1; k < 6; k++) { const t2 = k / 6; const a2 = P(x0 - eave, lerpN(y2 + eave, ym, t2), lerpN(wallH - 2, RZ, t2)), b2 = P(x2 + eave, lerpN(y2 + eave, ym, t2), lerpN(wallH - 2, RZ, t2)); g.strokeStyle = mixHex(roofC, '#000000', 0.18); g.lineWidth = 1; g.beginPath(); g.moveTo(a2[0], a2[1]); g.lineTo(b2[0], b2[1]); g.stroke(); }
      poly([P(x2, y0, wallH), P(x2, y2, wallH), P(x2, ym, RZ - 4)], mixHex(log, '#000000', 0.12));
      poly([P(x2 + eave, y2 + eave, wallH - 2), P(x2 + eave, ym, RZ), P(x2 + eave, y0 - eave, wallH - 2), P(x2 + eave + 0.02, y0 - eave, wallH - 5), P(x2 + eave + 0.02, ym, RZ - 3), P(x2 + eave + 0.02, y2 + eave, wallH - 5)], mixHex(roofC, '#000000', 0.3));
      { const a2 = P(x0 - eave, ym, RZ), b2 = P(x2 + eave, ym, RZ); g.strokeStyle = mixHex(roofC, '#ffffff', 0.4); g.lineWidth = 2; g.beginPath(); g.moveTo(a2[0], a2[1]); g.lineTo(b2[0], b2[1]); g.stroke(); }
      // 굴뚝과 옅은 연기
      { const cx0 = x0 + 0.5, cy0 = ym - 0.3; B3(cx0, cy0, cx0 + 0.5, cy0 + 0.5, RZ - 14, RZ + 14, '#b8a898'); const [sx, sy] = P(cx0 + 0.25, cy0 + 0.25, RZ + 16); for (let k = 0; k < 4; k++) { g.fillStyle = `rgba(255,255,255,${0.5 - k * 0.1})`; g.beginPath(); g.arc(sx + k * 4, sy - k * 9, 4 + k * 2, 0, Math.PI * 2); g.fill(); } }
      if (twins) { // 쌍둥이네 문 앞: 공 · 나무 칼 두 자루
        const [bx, by] = P(x2 - 0.3, y2 + 0.6, 0); g.fillStyle = '#e85a5a'; g.beginPath(); g.arc(bx, by - 3, 3.5, 0, Math.PI * 2); g.fill(); g.fillStyle = '#ffffff'; g.fillRect(Math.round(bx) - 3, Math.round(by) - 4, 6, 1);
        const [sx, sy] = P(x0 + 0.4, y2 + 0.5, 0); g.strokeStyle = '#b8864a'; g.lineWidth = 2; g.beginPath(); g.moveTo(sx - 6, sy); g.lineTo(sx + 6, sy - 4); g.moveTo(sx - 4, sy + 3); g.lineTo(sx + 8, sy); g.stroke();
      }
      break;
    }
    case 'washline': { // 빨랫줄: 기둥 둘 · 흰 이불 · 셔츠 · 작은 옷 둘 (쌍둥이 것이 섞여 있다)
      const ln = (a: Pt, b2: Pt, wd: number, col: string) => { g.strokeStyle = col; g.lineWidth = wd; g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b2[0], b2[1]); g.stroke(); };
      ln(P(i + 0.2, j + 0.5, 0), P(i + 0.2, j + 0.5, h), 2.5, '#9a7a52'); ln(P(i1 - 0.2, j + 0.5, 0), P(i1 - 0.2, j + 0.5, h), 2.5, '#9a7a52');
      ln(P(i + 0.2, j + 0.5, h - 2), P(i1 - 0.2, j + 0.5, h - 4), 1, '#e8e2d6');
      const cloths: [number, number, string][] = [[0.5, 1.2, '#ffffff'], [1.85, 0.6, '#a8c8f4'], [2.6, 0.38, '#f4a8c0'], [3.1, 0.38, '#f6d860']];
      for (const [u, wd, col] of cloths) { const za = h - 3, zb = h - 3 - (wd > 1 ? 18 : 11); poly([P(i + 0.2 + u, j + 0.5, za), P(i + 0.2 + u + wd, j + 0.5, za - 0.5), P(i + 0.2 + u + wd, j + 0.5, zb), P(i + 0.2 + u, j + 0.5, zb + 1)], col); poly([P(i + 0.2 + u, j + 0.5, zb + 1), P(i + 0.2 + u + wd, j + 0.5, zb), P(i + 0.2 + u + wd, j + 0.5, zb - 1.5), P(i + 0.2 + u, j + 0.5, zb - 0.5)], mixHex(col, '#000000', 0.15)); }
      break;
    }
    case 'flowerbed': { // 작은 꽃밭 (돌 테두리 · 색은 v마다)
      const cols = [['#f4a8c0', '#ffffff'], ['#f6d860', '#f2a040'], ['#a8c8f4', '#ffffff'], ['#e86a6a', '#f6d860']][(f.v ?? 0) % 4];
      const [cx, cy] = P(i + 0.5, j + 0.5, 0);
      g.fillStyle = '#b8ae9c'; g.beginPath(); g.ellipse(cx, cy, 20, 10, 0, 0, Math.PI * 2); g.fill(); g.fillStyle = '#6a8a4a'; g.beginPath(); g.ellipse(cx, cy - 1, 17, 8, 0, 0, Math.PI * 2); g.fill();
      for (let k = 0; k < 11; k++) { const a = k * 2.4, r = (k % 4) * 3.4 + 2; const fx = cx + Math.cos(a) * r * 1.6, fy = cy - 2 + Math.sin(a) * r * 0.7; g.fillStyle = '#4a7a3a'; g.fillRect(Math.round(fx), Math.round(fy) - 1, 1, 4); g.fillStyle = cols[k % 2]; g.beginPath(); g.arc(fx, fy - 2, 2.2, 0, Math.PI * 2); g.fill(); }
      break;
    }
    // ── 46차 천국 성소의 가구 ──
    case 'hpew': // 등받이가 뒤(+j)에 있는 흰 나무 의자 (앞의 제단을 보고 앉는다) · 금 테
      B3(i, j + 0.05, i1, j1 - 0.3, 0, h, '#e8dcc4'); B3(i, j1 - 0.3, i1, j1, 0, h + 16, '#d8c8a8');
      poly([P(i, j1, h + 14), P(i1, j1, h + 14), P(i1, j1, h + 16), P(i, j1, h + 16)], '#d9b44a');
      if (f.v === 1) B3(i, j + 0.05, i + 0.12, j1, 0, h + 10, '#cdb88e'); // 줄 끝의 팔걸이
      if (f.v === 2) B3(i1 - 0.12, j + 0.05, i1, j1, 0, h + 10, '#cdb88e');
      break;
    case 'hcross': { // 제단 뒤 큰 금 십자가와 둘레의 빛
      const [cx, cy] = P(i + 0.5, j + 0.2, 0);
      const gl = g.createRadialGradient(cx, cy - h * 0.6, 2, cx, cy - h * 0.6, 40); gl.addColorStop(0, 'rgba(255,240,180,0.9)'); gl.addColorStop(1, 'rgba(255,240,180,0)');
      g.fillStyle = gl; g.beginPath(); g.arc(cx, cy - h * 0.6, 40, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#c9a23e'; g.fillRect(Math.round(cx) - 3, Math.round(cy - h), 6, h - 22); g.fillRect(Math.round(cx) - 16, Math.round(cy - h * 0.72), 32, 6);
      g.fillStyle = '#f6dc8a'; g.fillRect(Math.round(cx) - 2, Math.round(cy - h), 2, h - 22); g.fillRect(Math.round(cx) - 16, Math.round(cy - h * 0.72), 32, 2);
      break;
    }
    case 'pillar': { // 흰 대리석 기둥 (금 기둥머리) · v1 붉은 기둥(불당) · v2 청록 띠(모스크)
      const col = f.v === 1 ? '#b8322a' : '#f6f2ea';
      B3(i + 0.15, j + 0.15, i1 - 0.15, j1 - 0.15, 0, 8, '#e8e0d0');
      B3(i + 0.25, j + 0.25, i1 - 0.25, j1 - 0.25, 8, h - 10, col);
      B3(i + 0.15, j + 0.15, i1 - 0.15, j1 - 0.15, h - 10, h, '#e0b84e');
      if (f.v === 2) B3(i + 0.24, j + 0.24, i1 - 0.24, j1 - 0.24, h * 0.45, h * 0.45 + 6, '#2a8a80');
      break;
    }
    case 'cushion': { // 둥근 방석 (주황 · 금 테)
      const [cx, cy] = P(i + 0.5, j + 0.5, 0);
      g.fillStyle = '#a8621a'; g.beginPath(); g.ellipse(cx, cy, 16, 8, 0, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#e8963a'; g.beginPath(); g.ellipse(cx, cy - 2, 15, 7, 0, 0, Math.PI * 2); g.fill();
      g.strokeStyle = '#f2d27a'; g.lineWidth = 1; g.beginPath(); g.ellipse(cx, cy - 2, 11, 5, 0, 0, Math.PI * 2); g.stroke();
      break;
    }
    case 'mihrab': { // 앞벽의 미흐랍: 금 테 두른 뾰족 아치 벽감 · 안은 청록 타일 · 위로 빛
      const yy = j1 - 0.05, xa = i + 0.3, xb = i1 - 0.3, cxm = (xa + xb) / 2;
      const arch = (inset: number, col: string, top: number) => { const pts: Pt[] = [P(xa + inset, yy, 0), P(xb - inset, yy, 0), P(xb - inset, yy, top * 0.6)]; for (let k = 1; k < 10; k++) { const a = Math.PI * k / 10; pts.push(P(cxm + Math.cos(a) * ((xb - xa) / 2 - inset), yy, top * 0.6 + Math.sin(a) * top * 0.4 * Math.pow(Math.sin(a), 0.4))); } pts.push(P(xa + inset, yy, top * 0.6)); poly(pts, col); };
      arch(0, '#e0b84e', h); arch(0.18, '#f6f2ea', h - 8); arch(0.32, '#2a8a80', h - 18); arch(0.5, '#1e6a62', h - 30);
      const [lx, ly] = P(cxm, yy, h * 0.5); g.fillStyle = 'rgba(255,240,190,0.5)'; g.beginPath(); g.arc(lx, ly, 6, 0, Math.PI * 2); g.fill();
      break;
    }
    case 'lampstand': { // 금 촛대: 가는 기둥 · 세 갈래 · 불꽃
      const [cx, cy] = P(i + 0.5, j + 0.5, 0);
      g.fillStyle = '#b8862f'; g.fillRect(Math.round(cx) - 4, Math.round(cy) - 3, 8, 3); g.fillStyle = '#e0b84e'; g.fillRect(Math.round(cx) - 1, Math.round(cy - h), 2, h);
      g.strokeStyle = '#e0b84e'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(cx - 8, cy - h + 4); g.quadraticCurveTo(cx, cy - h + 14, cx + 8, cy - h + 4); g.stroke();
      for (const dx of [-8, 0, 8]) { const fy = cy - h + (dx ? 2 : -2); const gl = g.createRadialGradient(cx + dx, fy, 0.5, cx + dx, fy, 7); gl.addColorStop(0, 'rgba(255,230,150,0.9)'); gl.addColorStop(1, 'rgba(255,200,100,0)'); g.fillStyle = gl; g.beginPath(); g.arc(cx + dx, fy, 7, 0, Math.PI * 2); g.fill(); g.fillStyle = '#fff2b0'; g.fillRect(Math.round(cx + dx) - 1, Math.round(fy) - 3, 2, 3); }
      break;
    }
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
    case 'xchdesk': {
      // 33차 환전 탁자: 검게 탄 나무 · 놋쇠 테 · 위에 놋쇠 저울 · 금화 더미 · 이승 지폐 뭉치 · 장부 · 붉은 등
      B3(i, j, i1, j1, 0, h - 3, '#2a1a14');
      box(i - 0.05, j - 0.05, i1 + 0.05, j1 + 0.05, h - 3, h, '#4a3022', '#3a2418', '#2a1a10');
      faceL(i, i1, h - 5, h - 3, '#b8902a'); faceR(j, j1, h - 5, h - 3, '#8a6a22');
      faceL(i + 0.3, i1 - 0.3, 3, h - 7, '#5a0e14');
      for (let n = 0; n < 5; n++) { const [cx, cy] = P(i + 0.5 + n * ((w - 1) / 4), j1, h / 2 - 2); g.fillStyle = '#c9a23e'; g.beginPath(); g.ellipse(cx, cy, 3, 3, 0, 0, Math.PI * 2); g.fill(); }
      { // 놋쇠 저울
        const [cx, cy] = P(i + 1.5, j + 0.5, h);
        g.fillStyle = '#8a6a22'; g.fillRect(Math.round(cx) - 1, Math.round(cy) - 22, 3, 22);
        g.fillStyle = '#d9b44a'; g.fillRect(Math.round(cx) - 14, Math.round(cy) - 22, 30, 2);
        g.strokeStyle = '#a8822e'; g.lineWidth = 1;
        for (const dx of [-13, 14]) { g.beginPath(); g.moveTo(cx + dx, cy - 21); g.lineTo(cx + dx - 4, cy - 10); g.moveTo(cx + dx, cy - 21); g.lineTo(cx + dx + 4, cy - 10); g.stroke(); g.fillStyle = '#c9a23e'; g.beginPath(); g.ellipse(cx + dx, cy - 9, 6, 2, 0, 0, Math.PI * 2); g.fill(); }
        g.fillStyle = '#e8dcc0'; g.fillRect(Math.round(cx) + 9, Math.round(cy) - 13, 9, 4); // 저울 한쪽엔 이승 지폐
        g.fillStyle = '#f2d27a'; g.beginPath(); g.ellipse(cx - 13, cy - 11, 3, 1.5, 0, 0, Math.PI * 2); g.fill(); // 다른 쪽엔 노전 한 닢 — 그래도 노전 쪽이 무겁다
      }
      for (const [a, b, n] of [[0.35, 0.3, 5], [0.6, 0.55, 3], [2.4, 0.35, 6]] as const) for (let k = 0; k < n; k++) { const [cx, cy] = P(i + a, j + b, h + k * 2); g.fillStyle = k % 2 ? '#a8822e' : '#e0b437'; g.beginPath(); g.ellipse(cx, cy, 4, 2, 0, 0, Math.PI * 2); g.fill(); }
      box(i + 2.1, j + 0.55, i + 2.8, j + 0.85, h, h + 3, '#d8ccb0', '#bfb498', '#a89c80'); // 지폐 뭉치
      poly([P(i + 2.2, j + 0.55, h + 3.1), P(i + 2.7, j + 0.55, h + 3.1), P(i + 2.7, j + 0.6, h + 3.1), P(i + 2.2, j + 0.6, h + 3.1)], '#8a3a2a');
      { const [lx, ly] = P(i + 0.3, j + 0.7, h); g.fillStyle = '#2a1a10'; g.fillRect(Math.round(lx) - 1, Math.round(ly) - 14, 2, 14); const gl = g.createRadialGradient(lx, ly - 17, 1, lx, ly - 17, 14); gl.addColorStop(0, 'rgba(255,80,50,0.7)'); gl.addColorStop(1, 'rgba(255,40,20,0)'); g.fillStyle = gl; g.beginPath(); g.ellipse(lx, ly - 17, 14, 12, 0, 0, Math.PI * 2); g.fill(); g.fillStyle = '#c8281e'; g.fillRect(Math.round(lx) - 3, Math.round(ly) - 21, 6, 7); g.fillStyle = '#ff8a4a'; g.fillRect(Math.round(lx) - 1, Math.round(ly) - 19, 2, 3); } // 붉은 등
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
      if (f.v === 9) {
        // 34차: 보자기를 두른 손님 (거울을 보고 앉아 등만 보인다) · 젖은 머리
        const [cx, cy] = P(i + 0.5, j + 0.5, h);
        g.fillStyle = '#4a6a8a'; g.beginPath(); g.moveTo(cx - 12, cy + 4); g.lineTo(cx + 12, cy + 4); g.lineTo(cx + 7, cy - 18); g.lineTo(cx - 7, cy - 18); g.closePath(); g.fill();
        g.fillStyle = '#5a7a9a'; g.fillRect(Math.round(cx) - 6, Math.round(cy) - 18, 12, 3);
        g.fillStyle = '#e8c8a8'; g.fillRect(Math.round(cx) - 2, Math.round(cy) - 21, 4, 3);
        g.fillStyle = '#2a2220'; g.beginPath(); g.ellipse(cx, cy - 26, 6, 6.5, 0, 0, Math.PI * 2); g.fill();
        g.fillStyle = '#4a3a34'; g.fillRect(Math.round(cx) - 3, Math.round(cy) - 31, 3, 2);
        for (let n = 0; n < 5; n++) { g.fillStyle = 'rgba(42,34,32,0.8)'; g.fillRect(Math.round(cx) - 9 + n * 4, Math.round(cy) + 2 + (n % 2), 2, 1); } // 바닥에 떨어진 머리카락
      }
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
    // ── 38차 철물점 ──
    case 'pegboard': {
      // 뒤 벽의 구멍판: 촘촘한 구멍, 걸린 공구(망치 · 스패너 · 톱 · 드라이버 · 펜치 · 줄자), 위의 주황 띠
      const y = j + 0.16;
      B3(i, j, i1, y, 4, h, '#b8946a');
      const fl = (x0: number, x2: number, z0: number, z1: number, col: string) => poly([P(x0, y, z0), P(x2, y, z0), P(x2, y, z1), P(x0, y, z1)], col);
      for (let z = 8; z < h - 7; z += 5) for (let x = i + 0.08; x < i1 - 0.05; x += 0.16) fl(x, x + 0.035, z, z + 1, '#6a5034');
      fl(i, i1, h - 5, h, '#d8641e');
      const kinds = ['hammer', 'wrench', 'saw', 'driver', 'pliers', 'tape'];
      let k = 0;
      for (let x = i + 0.14; x < i1 - 0.24; x += 0.34, k++) {
        const z = k % 2 ? 10 : 25;
        switch (kinds[k % kinds.length]) {
          case 'hammer': fl(x + 0.08, x + 0.12, z, z + 13, '#8a5a2a'); fl(x, x + 0.22, z + 11, z + 15, '#4a4e56'); break;
          case 'wrench': fl(x + 0.07, x + 0.11, z, z + 14, '#a8acb4'); fl(x + 0.03, x + 0.15, z + 12, z + 16, '#a8acb4'); fl(x + 0.07, x + 0.11, z + 14, z + 16, '#b8946a'); break;
          case 'saw': poly([P(x, y, z + 14), P(x + 0.26, y, z + 4), P(x + 0.26, y, z + 2), P(x, y, z + 7)], '#c8ccd2'); fl(x - 0.03, x + 0.05, z + 5, z + 15, '#c83a2a'); break;
          case 'driver': fl(x + 0.08, x + 0.11, z, z + 8, '#9aa0a8'); fl(x + 0.06, x + 0.13, z + 8, z + 15, k % 4 ? '#e8c02a' : '#c83a2a'); break;
          case 'pliers': fl(x + 0.05, x + 0.08, z, z + 12, '#3a6ac8'); fl(x + 0.12, x + 0.15, z, z + 12, '#3a6ac8'); fl(x + 0.06, x + 0.14, z + 11, z + 15, '#8a8e96'); break;
          case 'tape': fl(x + 0.02, x + 0.18, z + 3, z + 12, '#f2c42a'); fl(x + 0.07, x + 0.13, z + 6, z + 9, '#3a3a3a'); break;
        }
      }
      break;
    }
    case 'paintshelf': {
      // 페인트 깡통 선반: 철제 칸 셋 · 칸마다 색이 다른 깡통(흰 상표)
      const y = j + 0.75;
      B3(i, j, i1, j + 0.08, 0, h, '#6a6e74');
      B3(i, j, i + 0.05, y, 0, h, '#7a7e84');
      for (let z = 4; z < h - 8; z += 14) {
        box(i + 0.05, j + 0.08, i1 - 0.05, y, z, z + 1.5, '#9a9ea4', '#5a5e64', '#4a4e54');
        for (let x = i + 0.08, n = 0; x < i1 - 0.24; x += 0.24, n++) {
          const col = ['#ece8dc', '#c83a2a', '#2a6aa8', '#3a9a5a', '#e8c02a', '#e87a2a'][(n + z) % 6];
          box(x, y - 0.24, x + 0.2, y - 0.04, z + 1.5, z + 10, '#cfd2d6', col, mixHex(col, '#000000', 0.25));
          poly([P(x + 0.03, y - 0.04, z + 4), P(x + 0.17, y - 0.04, z + 4), P(x + 0.17, y - 0.04, z + 7), P(x + 0.03, y - 0.04, z + 7)], '#f4f2ea');
        }
      }
      B3(i1 - 0.05, j, i1, y, 0, h, '#7a7e84');
      break;
    }
    case 'lumber': {
      // 목재·파이프 거치대: 벽에 기대 선 각목과 합판 · 가로로 걸친 쇠파이프
      B3(i, j, i + 0.12, j1, 0, h, '#5a4a3a');
      for (let y = j + 0.08, n = 0; y < j1 - 0.12; y += 0.14, n++) {
        const col = ['#c8a070', '#b88a58', '#d8b888', '#a87a48'][n % 4];
        const top = h - 4 - ((n * 7) % 14);
        box(i + 0.14, y, i + 0.34, y + 0.11, 0, top, mixHex(col, '#ffffff', 0.15), col, mixHex(col, '#000000', 0.2));
      }
      for (const z of [12, 28]) box(i + 0.36, j + 0.05, i + 0.46, j1 - 0.05, z, z + 3, '#d0d4da', '#9aa0a8', '#7a8088');
      break;
    }
    case 'ladder': {
      // 알루미늄 A자 사다리 (꼭대기 주황 발판)
      const x0 = i + 0.25, x2 = i + 0.75;
      for (const yy of [j + 0.22, j1 - 0.22]) { B3(x0, yy - 0.03, x0 + 0.05, yy + 0.03, 0, h, '#c8ccd2'); B3(x2 - 0.05, yy - 0.03, x2, yy + 0.03, 0, h - 2, '#b0b4ba'); }
      for (let z = 9; z < h - 4; z += 9) box(x0, j + 0.2, x0 + 0.05, j1 - 0.2, z, z + 1.5, '#eef0f2', '#c8ccd2', '#a8acb2');
      B3(x0 - 0.02, j + 0.16, x2 + 0.02, j1 - 0.16, h, h + 2, '#e8642a');
      break;
    }
    case 'workbench': {
      // 수리 작업대: 두꺼운 나무 상판 · 쇠 다리 · 아래 칸의 빨간 공구함 · 바이스 · 그라인더 · 고치던 칼과 줄
      for (const [x, y] of [[i + 0.08, j + 0.1], [i1 - 0.14, j + 0.1], [i + 0.08, j1 - 0.16], [i1 - 0.14, j1 - 0.16]] as const) B3(x, y, x + 0.06, y + 0.06, 0, h - 3, '#4a4e56');
      box(i + 0.1, j + 0.12, i1 - 0.1, j1 - 0.12, 5, 7, '#8a7a5a', '#6a5a40', '#5a4a34');
      B3(i + 0.3, j + 0.25, i + 0.9, j1 - 0.25, 7, 14, '#c83a2a');
      box(i, j, i1, j1, h - 3, h, '#c8a070', '#a87a48', '#8a6238');
      B3(i1 - 0.42, j + 0.3, i1 - 0.1, j1 - 0.3, h, h + 6, '#3a5a8a'); B3(i1 - 0.47, j + 0.42, i1 - 0.42, j1 - 0.42, h + 1, h + 5, '#5a7aaa');
      B3(i + 0.1, j + 0.3, i + 0.45, j1 - 0.3, h, h + 6, '#5a5e66'); box(i + 0.15, j + 0.24, i + 0.4, j + 0.32, h + 2, h + 10, '#9aa0a8', '#7a8088', '#6a7078');
      poly([P(i + 0.85, j + 0.48, h + 0.5), P(i + 1.95, j + 0.4, h + 0.5), P(i + 2.0, j + 0.47, h + 0.5), P(i + 0.85, j + 0.6, h + 0.5)], '#dce0e6');
      poly([P(i + 0.58, j + 0.46, h + 0.5), P(i + 0.85, j + 0.48, h + 0.5), P(i + 0.85, j + 0.6, h + 0.5), P(i + 0.58, j + 0.58, h + 0.5)], '#3a2a1a');
      poly([P(i + 1.2, j + 0.72, h + 0.5), P(i + 1.7, j + 0.76, h + 0.5), P(i + 1.7, j + 0.81, h + 0.5), P(i + 1.2, j + 0.77, h + 0.5)], '#6a6e76');
      break;
    }
    case 'binshelf': {
      // 가운데 진열대: 나사·못·경첩을 담은 작은 플라스틱 통이 칸칸이 (위에 주황 가격표 띠)
      B3(i + 0.05, j + 0.35, i1 - 0.05, j1 - 0.35, 0, h, '#8a8e94');
      for (let z = 3; z < h - 4; z += 7) for (let x = i + 0.1, n = 0; x < i1 - 0.2; x += 0.2, n++) {
        const col = ['#2a6aa8', '#c83a2a', '#e8c02a', '#3a9a5a'][(n + z) % 4];
        box(x, j1 - 0.38, x + 0.17, j1 - 0.3, z, z + 5, mixHex(col, '#ffffff', 0.2), col, mixHex(col, '#000000', 0.25));
      }
      B3(i + 0.02, j + 0.33, i1 - 0.02, j1 - 0.33, h, h + 2, '#d8641e');
      break;
    }
    case 'ropespool': {
      // 밧줄·쇠사슬·호스 감개: 오른쪽 벽의 쇠막대에 큰 감개 셋
      B3(i + 0.42, j + 0.05, i + 0.5, j1 - 0.05, 0, h, '#5a5e66');
      const cols = ['#d8c08a', '#9aa0a8', '#2a8a4a'];
      for (let n = 0; n < 3; n++) {
        const y0 = j + 0.12 + (n * (d - 0.24)) / 3, y2 = y0 + (d - 0.24) / 3 - 0.06;
        box(i + 0.15, y0, i + 0.75, y2, h - 30, h - 8, mixHex(cols[n], '#ffffff', 0.2), cols[n], mixHex(cols[n], '#000000', 0.2));
        for (let z = h - 28; z < h - 9; z += 3) poly([P(i + 0.75, y0, z), P(i + 0.75, y2, z), P(i + 0.75, y2, z + 1), P(i + 0.75, y0, z + 1)], mixHex(cols[n], '#000000', 0.35));
      }
      break;
    }
    case 'brooms': {
      // 빗자루·대걸레를 꽂은 파란 통
      B3(i + 0.25, j + 0.25, i1 - 0.25, j1 - 0.25, 0, 10, '#2a6aa8');
      for (const [dx, dy, c2] of [[0.35, 0.4, '#c8a070'], [0.55, 0.35, '#e8c02a'], [0.45, 0.6, '#c83a2a']] as const) {
        B3(i + dx, j + dy, i + dx + 0.04, j + dy + 0.04, 8, h, '#8a6a4a');
        B3(i + dx - 0.07, j + dy - 0.07, i + dx + 0.11, j + dy + 0.11, h - 5, h + 3, c2);
      }
      break;
    }
    case 'toolchest': {
      // 바퀴 달린 빨간 공구함 (서랍 줄 · 은빛 손잡이)
      B3(i + 0.1, j + 0.15, i1 - 0.1, j1 - 0.15, 2, h, '#c8282a');
      for (let z = 6; z < h - 2; z += 5) { poly([P(i + 0.12, j1 - 0.15, z), P(i1 - 0.12, j1 - 0.15, z), P(i1 - 0.12, j1 - 0.15, z + 0.8), P(i + 0.12, j1 - 0.15, z + 0.8)], '#7a1418'); poly([P(i + 0.4, j1 - 0.15, z + 2), P(i1 - 0.4, j1 - 0.15, z + 2), P(i1 - 0.4, j1 - 0.15, z + 3), P(i + 0.4, j1 - 0.15, z + 3)], '#dce0e6'); }
      for (const x of [i + 0.15, i1 - 0.2]) B3(x, j1 - 0.22, x + 0.05, j1 - 0.16, 0, 2, '#2a2a2a');
      break;
    }
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
    // ── 35차 내 집 가구 ──
    case 'flattv': {
      // 벽걸이처럼 얇은 TV: 낮은 원목 받침장 위, 화면은 +i 쪽(소파 쪽)을 본다. v=2는 85인치 (화면이 받침장보다 넓다)
      const big = f.v === 2;
      B3(i + 0.1, j + 0.15, i1 - 0.35, j1 - 0.15, 0, 9, big ? '#2a2420' : '#8a6a4a');
      const y0 = big ? j + 0.05 : j + 0.45, y2 = big ? j1 - 0.05 : j1 - 0.45, z0 = 12, z1 = big ? h + 6 : h;
      B3(i + 0.2, (y0 + y2) / 2 - 0.08, i + 0.3, (y0 + y2) / 2 + 0.08, 9, z0 + 2, '#1a1a1c');
      poly([P(i + 0.32, y0, z0), P(i + 0.32, y2, z0), P(i + 0.32, y2, z1), P(i + 0.32, y0, z1)], '#121214');
      poly([P(i + 0.33, y0 + 0.04, z0 + 1.5), P(i + 0.33, y2 - 0.04, z0 + 1.5), P(i + 0.33, y2 - 0.04, z1 - 1.5), P(i + 0.33, y0 + 0.04, z1 - 1.5)], night ? '#4a7ab8' : '#1e2a3a');
      if (night) poly([P(i + 0.34, y0 + 0.2, z0 + 4), P(i + 0.34, y0 + 0.6, z0 + 4), P(i + 0.34, y0 + 0.6, z1 - 5), P(i + 0.34, y0 + 0.2, z1 - 5)], '#9ac8f0');
      break;
    }
    case 'homesofa': {
      // 거실 소파: 등받이가 +i 쪽(벽 반대편 TV를 본다) — v=0 회색 천 · v=1 밤색 가죽(단추 박음)
      const col = f.v === 1 ? '#5a3424' : '#8a8e94', dk = f.v === 1 ? '#3e2218' : '#6a6e74';
      B3(i + 0.1, j + 0.05, i1 - 0.05, j1 - 0.05, 0, h - 4, dk);
      box(i + 0.1, j + 0.15, i1 - 0.3, j1 - 0.15, h - 4, h, col, mixHex(col, '#000000', 0.15), mixHex(col, '#000000', 0.3));
      B3(i1 - 0.3, j + 0.05, i1 - 0.05, j1 - 0.05, h - 4, h + 12, dk);
      for (const y of [j + 0.05, j1 - 0.22]) B3(i + 0.1, y, i1 - 0.3, y + 0.17, h - 4, h + 5, dk);
      if (f.v === 1) for (let y = j + 0.5; y < j1 - 0.3; y += 0.5) { const [bx, by] = P(i1 - 0.3, y, h + 7); g.fillStyle = '#2a1810'; g.fillRect(Math.round(bx), Math.round(by), 1, 1); }
      for (const y of [j + 0.4, j1 - 0.9]) B3(i1 - 0.55, y, i1 - 0.32, y + 0.5, h, h + 7, f.v === 1 ? '#c9a23e' : '#d8c8a8');
      for (let y = j + 0.25; y < j1 - 0.4; y += (d - 0.4) / 3) faceR(y, y + 0.02, h - 3, h, mixHex(col, '#000000', 0.35)); // 43차: 앉는 쿠션 이음
      break;
    }
    case 'arcadecab': {
      // 오락기: 검은 몸통 · 위에 번쩍이는 간판 · 앞으로 기운 화면 · 조이스틱과 버튼
      const hue = ['#e83a8a', '#3ac8e8', '#f2c83a', '#8a5ae8', '#3ae88a', '#f27a3a'][(f.v ?? 0) % 6];
      B3(i + 0.1, j + 0.15, i1 - 0.1, j1 - 0.1, 0, h, '#1e1a2a');
      B3(i + 0.08, j + 0.12, i1 - 0.08, j1 - 0.1, h - 8, h + 2, hue);
      faceL(i + 0.18, i1 - 0.18, h - 24, h - 10, night ? '#b8f0ff' : '#6ad8f0');
      faceL(i + 0.22, i1 - 0.22, h - 22, h - 12, ['#2a3a8a', '#8a2a5a', '#2a6a3a'][(f.v ?? 0) % 3]);
      B3(i + 0.12, j1 - 0.35, i1 - 0.12, j1 - 0.05, h - 32, h - 28, '#2a2438');
      { const [bx, by] = P(i + 0.35, j1 - 0.2, h - 27); g.fillStyle = '#e83a3a'; g.fillRect(Math.round(bx), Math.round(by) - 3, 2, 3); g.fillStyle = '#f2d23a'; g.fillRect(Math.round(bx) + 5, Math.round(by) - 1, 2, 2); g.fillStyle = '#3a8ae8'; g.fillRect(Math.round(bx) + 9, Math.round(by) + 1, 2, 2); }
      break;
    }
    case 'claw': {
      // 인형 뽑기: 유리 상자 안 알록달록한 인형 더미 · 위에 집게
      B3(i + 0.08, j + 0.08, i1 - 0.08, j1 - 0.08, 0, 16, f.v ? '#e85a8a' : '#3a8ae8');
      poly([P(i + 0.1, j1 - 0.1, 16), P(i1 - 0.1, j1 - 0.1, 16), P(i1 - 0.1, j1 - 0.1, h - 6), P(i + 0.1, j1 - 0.1, h - 6)], '#d8f0ff', 0.35);
      poly([P(i1 - 0.1, j + 0.1, 16), P(i1 - 0.1, j1 - 0.1, 16), P(i1 - 0.1, j1 - 0.1, h - 6), P(i1 - 0.1, j + 0.1, h - 6)], '#c8e8f8', 0.3);
      for (let n = 0; n < 7; n++) { const [px, py] = P(i + 0.25 + (n % 3) * 0.22, j + 0.3 + Math.floor(n / 3) * 0.2, 18 + (n % 2) * 3); g.fillStyle = ['#f2a8b8', '#f2d27a', '#a8e0a0', '#c8a8f2', '#ffffff'][n % 5]; g.fillRect(Math.round(px) - 2, Math.round(py) - 3, 5, 4); }
      { const [cx2, cy2] = P(i + 0.5, j + 0.5, h - 8); g.fillStyle = '#c8c8d0'; g.fillRect(Math.round(cx2), Math.round(cy2), 1, 8); g.fillRect(Math.round(cx2) - 2, Math.round(cy2) + 8, 5, 1); }
      B3(i + 0.06, j + 0.06, i1 - 0.06, j1 - 0.06, h - 6, h, f.v ? '#e85a8a' : '#3a8ae8');
      break;
    }
    case 'airhockey': {
      B3(i + 0.05, j + 0.1, i1 - 0.05, j1 - 0.1, 0, h - 3, '#2a2a3a');
      box(i + 0.05, j + 0.1, i1 - 0.05, j1 - 0.1, h - 3, h, '#e8f2f8', '#3a6ad8', '#2a5ac8');
      { const [mx, my] = P(i + w / 2, j + 0.5, h); g.fillStyle = '#e83a3a'; g.fillRect(Math.round(mx) - 1, Math.round(my) - 1, 3, 2); g.strokeStyle = '#e83a3a'; g.lineWidth = 0.8; g.beginPath(); g.ellipse(mx, my, 6, 3, 0, 0, Math.PI * 2); g.stroke(); }
      break;
    }
    case 'ddr': {
      // 리듬 발판: 화살표 넷이 번갈아 빛난다
      box(i + 0.05, j + 0.05, i1 - 0.05, j1 - 0.05, 0, h, '#2a2a34', '#1e1e28', '#16161e');
      const cols = ['#e83a8a', '#3ac8e8', '#f2c83a', '#3ae88a'];
      for (let n = 0; n < 4; n++) { const x = i + 0.3 + (n % 2) * 0.9, y = j + 0.3 + Math.floor(n / 2) * 0.9; poly([P(x, y, h + 0.3), P(x + 0.5, y, h + 0.3), P(x + 0.5, y + 0.5, h + 0.3), P(x, y + 0.5, h + 0.3)], cols[n]); }
      break;
    }
    case 'mtable': {
      // 대리석 식탁: 흰 대리석 상판(잿빛 결) · 검은 쇠다리 둘 · 꽃병
      for (const x of [i + 0.3, i1 - 0.35]) B3(x, j + 0.35, x + 0.06, j1 - 0.35, 0, h - 3, '#1e1e20');
      box(i + 0.05, j + 0.08, i1 - 0.05, j1 - 0.08, h - 3, h, '#f2f0ec', '#d8d4ce', '#c4c0ba');
      g.strokeStyle = 'rgba(120,120,130,0.45)'; g.lineWidth = 0.6; g.beginPath(); { const a = P(i + 0.3, j + 0.3, h), b2 = P(i + 1.2, j + 0.6, h), c2 = P(i1 - 0.3, j + 0.4, h); g.moveTo(a[0], a[1]); g.lineTo(b2[0], b2[1]); g.lineTo(c2[0], c2[1]); } g.stroke();
      B3(i + w / 2 - 0.08, j + 0.42, i + w / 2 + 0.08, j + 0.58, h, h + 9, '#3a6a8a');
      { const [fx, fy] = P(i + w / 2, j + 0.5, h + 11); g.fillStyle = '#e85a6a'; g.fillRect(Math.round(fx) - 2, Math.round(fy) - 2, 4, 3); g.fillStyle = '#f2c84a'; g.fillRect(Math.round(fx), Math.round(fy) - 3, 2, 2); }
      break;
    }
    case 'ctable': {
      // 유리 거실 탁자: 검은 쇠다리 · 맑은 유리 상판 · 책 한 권과 컵
      for (const [x, y] of [[i + 0.15, j + 0.15], [i1 - 0.2, j + 0.15], [i + 0.15, j1 - 0.2], [i1 - 0.2, j1 - 0.2]]) B3(x, y, x + 0.05, y + 0.05, 0, h - 1, '#2a2a2c');
      poly([P(i + 0.1, j + 0.1, h), P(i1 - 0.1, j + 0.1, h), P(i1 - 0.1, j1 - 0.1, h), P(i + 0.1, j1 - 0.1, h)], '#bcdce6', 0.55);
      B3(i + 0.3, j + 0.3, i + 0.6, j + 0.5, h, h + 2, '#a8382a');
      B3(i + 0.62, j + 0.6, i + 0.7, j + 0.68, h, h + 4, '#f2f0ea');
      break;
    }
    case 'kbed': {
      // 킹사이즈 호텔 침대: 높고 넓은 패브릭 머리판 · 흰 시트 · 회색 띠 이불 · 베개 넷
      B3(i + 0.05, j + 0.05, i1 - 0.05, j1 - 0.05, 0, h - 5, '#4a4642');
      box(i + 0.05, j + 0.1, i1 - 0.05, j1 - 0.05, h - 5, h, '#fbfaf6', '#e2e0da', '#cecbc4');
      B3(i - 0.02, j + 0.0, i1 + 0.02, j + 0.14, 0, h + 26, '#7a7066');
      for (let n = 0; n < 4; n++) { const x = i + 0.12 + n * (w - 0.24) / 4; B3(x, j + 0.2, x + (w - 0.3) / 4, j + 0.55, h, h + 5, n % 3 ? '#ffffff' : '#e8e2d6'); }
      poly([P(i + 0.05, j + 1.9, h + 0.5), P(i1 - 0.05, j + 1.9, h + 0.5), P(i1 - 0.05, j + 2.35, h + 0.5), P(i + 0.05, j + 2.35, h + 0.5)], '#6a6e78');
      faceL(i + 0.05, i1 - 0.05, h - 5, h, '#e2e0da');
      { const [lx2, ly2] = P(i1 - 0.15, j + 0.2, h + 26); g.fillStyle = night ? 'rgba(255,214,140,0.35)' : 'rgba(255,240,210,0.2)'; g.beginPath(); g.ellipse(lx2, ly2 + 4, 12, 8, 0, 0, Math.PI * 2); g.fill(); g.fillStyle = night ? '#ffe2a8' : '#efe4cc'; g.fillRect(Math.round(lx2) - 3, Math.round(ly2), 6, 4); } // 43차: 머리판 위의 은은한 벽등
      break;
    }
    case 'tv': {
      // 브라운관 텔레비전: 낮은 받침장 위 볼록한 상자, 화면
      B3(i + 0.12, j + 0.15, i1 - 0.12, j1 - 0.15, 0, 8, '#6a4a32');
      B3(i + 0.2, j + 0.22, i1 - 0.2, j1 - 0.22, 8, h, '#4a3a2e');
      faceL(i + 0.24, i1 - 0.36, 10, h - 3, '#1a1a1c');
      faceL(i + 0.27, i1 - 0.39, 11.5, h - 4.5, night ? '#6a9ac8' : '#2a3a4a');
      faceL(i + 0.3, i + 0.42, h - 9, h - 6, night ? '#c8e4ff' : '#5a6a7a');
      for (const z of [h - 7, h - 13]) { const [kx, ky] = P(i1 - 0.29, j1 - 0.22, z); g.fillStyle = '#c9a23e'; g.fillRect(Math.round(kx) - 1, Math.round(ky) - 1, 2, 2); }
      { const [ax, ay] = P(i + 0.5, j + 0.5, h); g.strokeStyle = '#8a8a8a'; g.lineWidth = 1; g.beginPath(); g.moveTo(ax, ay); g.lineTo(ax - 7, ay - 13); g.moveTo(ax, ay); g.lineTo(ax + 6, ay - 14); g.stroke(); g.fillStyle = '#2a2a2a'; g.fillRect(Math.round(ax) - 2, Math.round(ay) - 1, 4, 2); }
      break;
    }
    case 'wardrobe': {
      // 자개 옷장: 검은 옻칠 문 둘, 자개 무늬 점, 놋쇠 고리
      B3(i + 0.04, j + 0.2, i1 - 0.04, j1 - 0.1, 0, h, '#2a1e1a');
      faceL(i + 0.08, i + w / 2 - 0.03, 4, h - 4, '#3a2a22'); faceL(i + w / 2 + 0.03, i1 - 0.08, 4, h - 4, '#3a2a22');
      for (let n = 0; n < 9; n++) { const [mx, my] = P(i + 0.2 + ((n * 37) % 80) / 100 * (w - 0.4), j1 - 0.1, 10 + ((n * 53) % 70) / 100 * (h - 20)); g.fillStyle = n % 3 ? '#9ad0c8' : '#e8d8f0'; g.fillRect(Math.round(mx), Math.round(my), 2, 1); }
      { // 43차: 자개 학 한 마리 (날개를 편 흰 선) · 매화 가지
        const [cx3, cy3] = P(i + w * 0.3, j1 - 0.1, h * 0.62); g.fillStyle = '#e8f2f0';
        g.fillRect(Math.round(cx3) - 3, Math.round(cy3), 7, 1); g.fillRect(Math.round(cx3) - 4, Math.round(cy3) - 1, 2, 1); g.fillRect(Math.round(cx3) + 3, Math.round(cy3) - 1, 2, 1); g.fillRect(Math.round(cx3), Math.round(cy3) + 1, 1, 3);
        const [bx2, by2] = P(i + w * 0.72, j1 - 0.1, h * 0.35); g.fillStyle = '#c8a8d8';
        for (let n = 0; n < 5; n++) g.fillRect(Math.round(bx2) + (n % 3) * 2 - 2, Math.round(by2) - n * 2, 1, 1);
      }
      for (const x of [i + w / 2 - 0.12, i + w / 2 + 0.08]) faceL(x, x + 0.05, h / 2 - 2, h / 2 + 2, '#c9a23e');
      for (const z of [8, h - 8]) { faceL(i + 0.1, i + 0.16, z, z + 3, '#b08a3a'); faceL(i1 - 0.16, i1 - 0.1, z, z + 3, '#b08a3a'); }
      break;
    }
    case 'futon': {
      // 개어 둔 이불 셋과 베개
      const cols = ['#c84a5a', '#3a7aa8', '#e8c86a'];
      for (let n = 0; n < 3; n++) {
        B3(i + 0.1 + n * 0.02, j + 0.12, i1 - 0.1 - n * 0.02, j1 - 0.12, n * 4, n * 4 + 4, cols[n]);
        // 43차: 이불마다 무늬 — 줄 · 작은 꽃 점
        for (let x = i + 0.2; x < i1 - 0.15; x += 0.25) faceL(x, x + 0.05, n * 4 + 1, n * 4 + 3, mixHex(cols[n], '#ffffff', 0.45));
      }
      B3(i + 0.25, j + 0.2, i1 - 0.25, j + 0.7, 12, 15, '#f2eee4');
      { const [px2, py2] = P(i + w / 2, j + 0.45, 15); g.fillStyle = '#c84a5a'; g.fillRect(Math.round(px2) - 1, Math.round(py2) - 1, 3, 2); g.fillStyle = '#3a8a4a'; g.fillRect(Math.round(px2) + 2, Math.round(py2), 2, 1); }
      break;
    }
    case 'lowtable': {
      // 앉은뱅이 밥상: 둥근 상판, 공기 둘, 반찬 접시 넷, 수저
      box(i + 0.05, j + 0.1, i1 - 0.05, j1 - 0.1, h - 3, h, '#a8743a', '#8a5a2a', '#6a4422');
      for (const x of [i + 0.15, i1 - 0.2]) B3(x, j + 0.2, x + 0.05, j + 0.25, 0, h - 3, '#5a3a1e');
      const dish = (x: number, y: number, rx: number, col: string) => { const [px, py] = P(x, y, h); g.fillStyle = '#f2f0e8'; g.beginPath(); g.ellipse(px, py, rx, rx / 2, 0, 0, Math.PI * 2); g.fill(); g.fillStyle = col; g.beginPath(); g.ellipse(px, py - 0.5, rx - 1.5, (rx - 1.5) / 2, 0, 0, Math.PI * 2); g.fill(); };
      dish(i + 0.5, j + 0.5, 4, '#f8f8f2'); dish(i + 1.4, j + 0.5, 4, '#c8562a');
      { const [rx, ry] = P(i + 0.5, j + 0.5, h); g.fillStyle = '#ffffff'; g.beginPath(); g.ellipse(rx, ry - 2, 2.5, 2, 0, 0, Math.PI * 2); g.fill(); } // 소복한 밥
      { const [sx2, sy2] = P(i + 0.75, j + 0.82, h); g.fillStyle = '#c8c8c0'; g.fillRect(Math.round(sx2), Math.round(sy2), 6, 1); g.fillRect(Math.round(sx2), Math.round(sy2) + 2, 7, 1); } // 수저
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
      B3(i + 0.3, j + 0.3, i1 - 0.3, j1 - 0.3, 0, 12, info.kind === 'myhome' || info.kind === 'furnshop' ? '#e8e4dc' : '#9a5a3a');
      if (info.kind === 'myhome' || info.kind === 'furnshop') {
        // 43차 몬스테라: 줄기마다 갈라진 큰 잎 (밝은 잎맥)
        const [bx3, by3] = P(i + 0.5, j + 0.5, 12);
        for (let n = 0; n < 6; n++) {
          const a = -Math.PI / 2 + (n - 2.5) * 0.45, L2 = 10 + (n % 3) * 4, ex = bx3 + Math.cos(a) * L2, ey = by3 + Math.sin(a) * L2 * 0.9 - 6;
          g.strokeStyle = '#3a6a2a'; g.lineWidth = 1; g.beginPath(); g.moveTo(bx3, by3); g.lineTo(ex, ey); g.stroke();
          g.fillStyle = n % 2 ? '#2e7a36' : '#3a8a3e'; g.beginPath(); g.ellipse(ex, ey, 6, 4, a, 0, Math.PI * 2); g.fill();
          g.fillStyle = '#1e5a26'; g.fillRect(Math.round(ex) - 1, Math.round(ey), 3, 1);
        }
        break;
      }
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
export const PASHAR_LOOK: Look = { sex: 'm', build: 0, skin: 0, hair: 1, hairColor: 0, top: 0, bottom: 0, outfit: 'pashar', cols: { 1: '#e8d6c8', 2: '#9a9aa2', 3: '#1c1c22', 4: '#22222a', 5: '#141418', 10: '#e8e0cc', 13: '#4a2e1e', 14: '#c8ccd4' } }; // 42차: 전용 3D 몸 (장부에 적는 고유 동작)
/** 천국의 환생관 루엔 (컨셉 아트: 길고 흰 머리, 흰 법의에 옅은 푸른 띠, 흰 날개, 등불) */
export const LUEN_LOOK: Look = { sex: 'f', build: 0, skin: 0, hair: 3, hairColor: 0, top: 0, bottom: 0, outfit: 'luen', cols: { 1: '#f2dccc', 2: '#eceaf4', 3: '#f8f6f2', 4: '#f2f0ea', 5: '#d8ccb0', 9: '#b8cce8', 12: '#fff2b0', 14: '#d8c890' } }; // 42차: 전용 3D 몸 (등불을 드는 고유 동작)
/** 24차: 환생관 할아버지 — 안경 쓴 아주 늙은 사람 (천국은 흰 옷, 지옥은 잿빛 외투). 그림은 관리자 'grandpa' 칸 */
export function grandpaLook(hell: boolean): Look {
  const skin = '#e6c9ae';
  // 42차: 전용 3D 몸 (조금 구부정한 등 · 빈 정수리 · 짧은 흰 수염 · 안경 고쳐 쓰는 고유 동작)
  return { sex: 'm', build: 0, skin: 0, hair: 1, hairColor: 0, top: 0, bottom: 0, outfit: 'grandpa', cols: hell
    ? { 1: skin, 10: skin, 2: '#e8e4dc', 3: '#3a3634', 4: '#2a2624', 5: '#141210', 14: '#8a8680' }
    : { 1: skin, 10: skin, 2: '#f2efe8', 3: '#f2ede2', 4: '#e8e2d4', 5: '#c8c0b0', 14: '#d8c890' } };
}
/** 40차: 유내 미용실의 지금 원장 (마흔 줄의 여자, 짧은 단발 · 검은 미용 가운 · 앞치마) */
export const YSALON_LOOK: Look = { sex: 'f', build: 1, skin: 0, hair: 2, hairColor: 0, top: 0, bottom: 0, outfit: 'apron', cols: { 2: '#3a2620', 3: '#24212a', 9: '#24212a', 4: '#3a3638', 5: '#1e1a1a', 7: '#2e2a30' } };
export function clerkLook(kind: string, seed: number): Look {
  if (kind === 'terrace') return LUEN_LOOK;
  if (kind === 'cloudisle') return YELLOW_WING_LOOK;
  if (kind === 'hchurch' || kind === 'htemple' || kind === 'hmosque') return { sex: kind === 'htemple' ? 'm' : seed % 2 ? 'f' : 'm', build: 1, skin: 0, hair: 0, hairColor: 0, top: 0, bottom: 0, outfit: 'angelk', cols: { 2: kind === 'hmosque' ? '#f2e6c8' : '#e8c870', 3: '#fbf8f0', 4: '#efe8d8', 5: '#b89a6a', 14: '#e0b450', 12: kind === 'htemple' ? '#f2a040' : '#7ad8ff' } } as Look; // 46차: 예배를 이끄는 천사 // 46차 구름 위 오두막: 데려다준 황색날개가 곁에
  if (kind === 'shore') return BULDA_LOOK;
  if (kind === 'loan') return BESK_LOOK;
  if (kind === 'rebirth') return PASHAR_LOOK;
  if (kind === 'hbank') return { sex: 'm', build: 0, skin: 0, hair: 0, hairColor: 0, top: 0, bottom: 0, outfit: 'casual', cols: { 1: '#9a948c', 10: '#9a948c', 2: '#2a2622', 3: '#1e1c1c', 4: '#1a1818', 9: '#1e1c1c', 5: '#0e0c0c' } }; // 잿빛 피부의 은행원
  if (kind === 'ysalon') return YSALON_LOOK; // 40차: 유내 미용실의 지금 원장 — 단발 파마 머리, 검은 가운
  if (kind === 'atone') return { sex: 'f', build: 0, skin: 0, hair: 3, hairColor: 0, top: 0, bottom: 0, outfit: 'raincoat', cols: { 1: '#d8c8b8', 10: '#d8c8b8', 8: '#4a1a16', 3: '#2a1210', 4: '#2a1210', 5: '#1a0e0c' } }; // 붉은 두건의 속죄 수녀
  const [top, bottom] = STAFF[kind] ?? STAFF.shop;
  const sex = seed % 2 ? 'f' : 'm';
  const monk = kind === 'temple';
  return {
    sex: monk ? 'm' : sex, build: 1, skin: seed % 3, hair: monk ? 5 : (seed >> 1) % 6, hairColor: (seed >> 2) % 3, top: 0, bottom: 0, outfit: 'casual',
    cols: { 1: SKIN_COLORS[seed % 3], 2: HAIR_COLORS[(seed >> 2) % 3], 3: top, 4: bottom, 5: '#2a2422', 9: top, 10: SKIN_COLORS[seed % 3] },
  };
}
