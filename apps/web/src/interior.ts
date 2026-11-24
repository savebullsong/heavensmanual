// 건물 안: 들어갈 때만 업종에 맞는 작은 방을 만든다 (내려받는 그림 없음 · 한 번에 한 방만 메모리에)
// 방 = 작은 존. 뒤쪽 두 벽(i=0 줄, j=0 줄)은 막히고, 앞쪽 두 가장자리는 잘라 보인다(컷어웨이).
// 앞 가장자리 가운데의 매트를 밟으면 거리로 나간다.
import { TYPES, finalize, type Zone, type Building, type Furn, type InteriorInfo } from './zone.ts';
import { kindOf, mainPoi, hasBank, storeOf, cuisineOf } from './names.ts';
import { faithOf } from './street.ts';
import { TW, TH } from './gfx.ts';

const TI = Object.fromEntries(TYPES.map((t, k) => [t, k])) as Record<(typeof TYPES)[number], number>;

/** 들어갈 수 있는 건물: 가게·시설이 있고 문(간판 면)이 있는 곳 */
export function canEnter(b: Building) {
  const p = mainPoi(b);
  if (!p || b.cat === 'ujusae') return false;
  // 간판이 없어도 들어갈 수 있는 곳: 종교시설·병원·은행
  return !!b.sign || ['place_of_worship', 'hospital', 'clinic', 'bank'].includes(p.t);
}

export function roomKind(b: Building): string {
  if (b.cat === 'loan') return 'loan'; // 지옥 3층 베스크 대부소
  const k = kindOf(b);
  if (k === 'place_of_worship' || b.cat === 'worship') {
    const f = faithOf(b);
    return f === 'church' ? 'church' : f === 'mosque' ? 'mosque' : f === 'sikh' ? 'gurdwara' : 'temple';
  }
  if (k === 'bank' || k === 'bureau_de_change') return 'bank';
  if (['clinic', 'hospital', 'dentist', 'veterinary'].includes(k) || b.cat === 'clinic') return 'clinic';
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
export const REST_ROOMS = new Set(['temple', 'church', 'mosque', 'gurdwara', 'bank', 'clinic', 'pharmacy']);

const SIZE: Record<string, [number, number]> = {
  temple: [13, 11], church: [13, 11], mosque: [12, 11], gurdwara: [12, 11], bank: [12, 10], clinic: [12, 10], pharmacy: [9, 8],
  mart: [11, 9], food: [12, 10], cafe: [10, 9], bar: [10, 9], salon: [9, 8], massage: [10, 9], laundry: [9, 8], lobby: [11, 9], shop: [9, 8], loan: [10, 8],
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
};

/** 거리의 건물 k에 들어갈 때 방을 만든다 (같은 건물이면 늘 같은 방) */
export function interiorZone(b: Building, k: number, out: { i: number; j: number }, name: string): Zone {
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
      F(W - 5, 2, 3, 1, 22, 'counter'); clerk = { i: W - 4, j: 1 }; counter = { i: W - 4, j: 3 };
      F(1, 1, W - 6, 1, 50, 'shelf', 1);
      for (const jj of [4, 6]) if (jj < y1 - 1) F(2, jj, W - 6, 1, 40, 'shelf', jj);
      F(x1, 4, 1, 3, 56, 'fridge');
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
    default:
      F(W - 5, 2, 3, 1, 22, 'counter', 8); clerk = { i: W - 4, j: 1 }; counter = { i: W - 4, j: 3 };
      F(1, 1, W - 6, 1, 46, 'shelf', 8); F(2, 4, 2, 1, 20, 'display', 1); F(5, 4, 1, 2, 20, 'display', 2);
      break;
  }
  for (const f of furn) if (f.h > 2) for (let j = f.j; j < f.j + f.d; j++) for (let i = f.i; i < f.i + f.w; i++) tiles[j * W + i] = TI.block;
  const exit = { i: mid, j: y1 };
  tiles[exit.j * W + exit.i] = TI.walk;
  const look = LOOKS[kind];
  const info: InteriorInfo = {
    kind, rest: REST_ROOMS.has(kind), name, ...look, exit, clerk, counter, furn,
    from: { b: k, out }, store: kind === 'bank' ? 'bank' : ['mart', 'pharmacy', 'food', 'cafe'].includes(kind) ? kind : undefined, cuisine: cuisineOf(b), seats: seats.filter(([i, j]) => tiles[j * W + i] === TI.walk),
  };
  return finalize({ id: `in-${k}`, W, H, tiles, buildings: [], props: [], lanes: [], door: exit, spawn: { i: exit.i, j: exit.j - 1 }, interior: info });
}

// ───────────────────────── 그림 ─────────────────────────
type Pt = [number, number];
const WALL = 100; // 벽 높이 px

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
};

/** 바닥 + 뒤쪽 두 벽 + 벽 장식 (방 전체를 한 장으로) */
export function drawRoom(z: Zone, night: boolean): { canvas: HTMLCanvasElement; x: number; y: number } {
  const info = z.interior!;
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
    else if (k !== 'bar') winL(y, y + 1.2, 34, 74);
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
  } else if (k === 'mart' || k === 'shop') {
    onR(W - 5, W - 2, 66, 76, info.trim);
  } else if (k === 'lobby') {
    winL(2, 3, 0, 64, '#8a8a84'); winL(4, 5, 0, 64, '#8a8a84'); // 승강기 문
    onR(3, W - 3, 60, 66, '#c9a23e');
  }
  // 벽 모서리 기둥
  poly([P(1, 1, 0), P(1.06, 1, 0), P(1.06, 1, WALL), P(1, 1, WALL)], mixHex(info.trim, '#000000', 0.4));
  return { canvas: c, x: minX, y: minY };
}

/** 가구 하나 (바닥 사각형 i·j·w·d, 높이 h) */
export function drawFurn(f: Furn, info: InteriorInfo, night: boolean): { canvas: HTMLCanvasElement; x: number; y: number } {
  const { i, j, w, d, h } = f;
  const i1 = i + w, j1 = j + d;
  const extra = f.kind === 'altar' ? 64 : f.kind === 'salonchair' || f.kind === 'candle' ? 18 : 14;
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
    case 'minbar': B3(i, j, i1, j1, 0, h, '#8a6a3a'); for (let n = 1; n < 4; n++) B3(i, j + (n - 1) * d / 4, i1, j + (n * d) / 4, 0, (h * n) / 4, '#a07a4a'); break;
    case 'atm': B3(i + 0.15, j + 0.15, i1 - 0.15, j1 - 0.15, 0, h, '#5a6a7a'); faceL(i + 0.3, i1 - 0.3, h - 20, h - 8, night ? '#8adcff' : '#6ab8d8'); faceL(i + 0.3, i1 - 0.3, h - 28, h - 24, '#2a2a2a'); break;
    case 'salonchair': {
      B3(i + 0.25, j + 0.3, i1 - 0.25, j1 - 0.2, 0, h, '#2a2a2a'); B3(i + 0.25, j + 0.15, i1 - 0.25, j + 0.3, h, h + 16, '#3a3a3a');
      break;
    }
    case 'mat': box(i, j + 0.1, i1, j1 - 0.1, 0, h, '#e8dcc0', '#c8a878', '#a88858'); B3(i + 0.1, j + 0.25, i + 0.5, j1 - 0.25, h, h + 3, '#f2f2ec'); break;
    case 'washer': B3(i + 0.08, j + 0.08, i1 - 0.08, j1 - 0.08, 0, h, '#e8eef2'); { const [wx, wy] = P(i + 0.5, j1 - 0.08, h * 0.5); g.fillStyle = '#5a6a7a'; g.beginPath(); g.ellipse(wx, wy, 7, 7, 0, 0, Math.PI * 2); g.fill(); g.fillStyle = '#a8c8e0'; g.beginPath(); g.ellipse(wx, wy, 5, 5, 0, 0, Math.PI * 2); g.fill(); } break;
    case 'display': B3(i + 0.1, j + 0.1, i1 - 0.1, j1 - 0.1, 0, h, '#c8b090'); for (let x = i + 0.25; x < i1 - 0.2; x += 0.35) B3(x, j + 0.3, x + 0.2, j + 0.6, h, h + 6, pick(Math.floor(x * 7))); break;
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
};
/** 대부업자 베스크: 붉은 피부·대머리·아주 뚱뚱·금 장신구·장부 */
export const BESK_LOOK: Look = { sex: 'm', build: 1, skin: 0, hair: 0, hairColor: 0, top: 0, bottom: 0, outfit: 'besk', cols: { 1: '#b8382a', 3: '#3a1410', 4: '#2a100c', 5: '#140a08', 6: '#e8c050', 9: '#3a1410', 10: '#e8dcc0', 12: '#f2d27a', 13: '#4a2a1a', 14: '#e0b437', 15: '#140e0c' } };
export function clerkLook(kind: string, seed: number): Look {
  if (kind === 'loan') return BESK_LOOK;
  const [top, bottom] = STAFF[kind] ?? STAFF.shop;
  const sex = seed % 2 ? 'f' : 'm';
  const monk = kind === 'temple';
  return {
    sex: monk ? 'm' : sex, build: 1, skin: seed % 3, hair: monk ? 5 : (seed >> 1) % 6, hairColor: (seed >> 2) % 3, top: 0, bottom: 0, outfit: 'casual',
    cols: { 1: SKIN_COLORS[seed % 3], 2: HAIR_COLORS[(seed >> 2) % 3], 3: top, 4: bottom, 5: '#2a2422', 9: top, 10: SKIN_COLORS[seed % 3] },
  };
}
