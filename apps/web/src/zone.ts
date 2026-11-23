// 존(동네) 데이터 — OSM 변환기(v2)와 시험 구역 생성기가 같은 형식을 쓴다
export const TYPES = ['void', 'lot', 'park', 'water', 'walk', 'soi', 'road', 'median', 'cross', 'block'] as const;
export type TileType = (typeof TYPES)[number];
const TI = Object.fromEntries(TYPES.map((t, k) => [t, k])) as Record<TileType, number>;

// generic = 이름·간판 없는 건물 (정부시설은 모두 이것으로 바뀐다)
export type Category =
  | 'convenience' | 'pharmacy' | 'clinic' | 'restaurant' | 'bar' | 'cafe' | 'bank' | 'worship' | 'school'
  | 'hotel' | 'laundry' | 'shop' | 'office' | 'condo' | 'ujusae' | 'generic';

export interface Building {
  i0: number; j0: number; w: number; d: number; // 바닥 사각형 (타일)
  h: number; // 높이 px
  cat: Category;
  sign?: 'left' | 'right'; // 간판 면: left = +j 면, right = +i 면
  color: string;
}
export interface Prop { i: number; j: number; kind: 'tree' | 'lamp' | 'pillar' | 'cart' }
/** 차가 달리는 구간: j 행의 i0~i1, dir = +1 이면 +i 방향 */
export interface Lane { j: number; i0: number; i1: number; dir: 1 | -1 }
export interface Zone {
  id: string;
  W: number; H: number;
  tiles: Uint8Array; // TYPES 인덱스, index = j * W + i
  buildings: Building[];
  props: Prop[];
  lanes: Lane[];
  door: { i: number; j: number };
  spawn: { i: number; j: number };
  attribution?: string;
  blocked: Uint8Array; // 1 = 걸을 수 없음
}

export function tileAt(z: Zone, i: number, j: number): TileType {
  if (i < 0 || j < 0 || i >= z.W || j >= z.H) return 'void';
  return TYPES[z.tiles[j * z.W + i]];
}

function finalize(z: Omit<Zone, 'blocked'>): Zone {
  const blocked = new Uint8Array(z.W * z.H);
  for (let k = 0; k < blocked.length; k++) {
    const t = TYPES[z.tiles[k]];
    // 빈 땅(주차장·공터·광장)은 걸을 수 있다. 건물·물·지도 바깥만 막는다
    blocked[k] = t === 'block' || t === 'void' || t === 'water' ? 1 : 0;
  }
  for (const p of z.props) if (p.kind !== 'tree') blocked[p.j * z.W + p.i] = 1;
  // 건물 바닥은 막는다. 지도 변환에서 골목·보도가 건물 밑으로 그려진 곳이 많아 사람이 건물을 뚫고 다녔다
  // (큰길과 횡단보도만 남겨 길이 끊기지 않게 한다)
  for (const b of z.buildings)
    for (let j = b.j0; j < b.j0 + b.d; j++)
      for (let i = b.i0; i < b.i0 + b.w; i++) {
        if (i < 0 || j < 0 || i >= z.W || j >= z.H) continue;
        const t = TYPES[z.tiles[j * z.W + i]];
        if (t !== 'road' && t !== 'cross' && t !== 'median') blocked[j * z.W + i] = 1;
      }
  return { ...z, blocked };
}

/** 변환기가 만든 JSON(v2)을 읽는다 */
export function decodeZone(json: {
  id: string; W: number; H: number; codes: string; types: string[]; tiles: string;
  buildings: Building[]; props: Prop[]; lanes: Lane[]; door: { i: number; j: number }; spawn: { i: number; j: number }; attribution?: string;
}): Zone {
  const map = new Uint8Array(128);
  for (let k = 0; k < json.codes.length; k++) map[json.codes.charCodeAt(k)] = TI[json.types[k] as TileType] ?? 0;
  const tiles = new Uint8Array(json.W * json.H);
  for (let k = 0; k < tiles.length; k++) tiles[k] = map[json.tiles.charCodeAt(k)];
  return finalize({ id: json.id, W: json.W, H: json.H, tiles, buildings: json.buildings, props: json.props, lanes: json.lanes, door: json.door, spawn: json.spawn, attribution: json.attribution });
}

/** 수쿰빗 대로를 본뜬 시험 구역 (실제 지도를 불러오지 못할 때 쓴다) */
export function sukhumvitTestZone(): Zone {
  const W = 48, H = 40;
  const tiles = new Uint8Array(W * H).fill(TI.lot);
  const set = (i: number, j: number, t: TileType) => { if (i >= 0 && j >= 0 && i < W && j < H) tiles[j * W + i] = TI[t]; };
  for (let i = 0; i < W; i++) {
    set(i, 15, 'walk'); set(i, 16, 'walk');
    for (const j of [17, 18, 19, 21, 22, 23]) set(i, j, 'road');
    set(i, 20, 'median');
    set(i, 24, 'walk'); set(i, 25, 'walk');
  }
  for (const i of [20, 21]) for (let j = 17; j <= 23; j++) set(i, j, 'cross');
  for (let j = 0; j <= 14; j++) for (const i of [12, 13, 14]) set(i, j, 'soi');
  for (let j = 26; j < H; j++) for (const i of [30, 31, 32]) set(i, j, 'soi');
  const buildings: Building[] = [];
  const B = (i0: number, j0: number, w: number, d: number, h: number, cat: Category, color: string, sign?: 'left' | 'right') => {
    buildings.push({ i0, j0, w, d, h, cat, color, sign });
    for (let j = j0; j < j0 + d; j++) for (let i = i0; i < i0 + w; i++) set(i, j, 'block');
  };
  B(0, 10, 6, 5, 70, 'convenience', '#c9c3b5', 'left');
  B(6, 10, 6, 5, 96, 'pharmacy', '#b8c4c2', 'left');
  B(15, 11, 3, 4, 58, 'ujusae', '#4a3527', 'left');
  B(18, 10, 6, 5, 84, 'restaurant', '#c7a88a', 'left');
  B(24, 10, 6, 5, 112, 'cafe', '#9aa59a', 'left');
  B(30, 9, 8, 6, 190, 'office', '#8c97a6', 'left');
  B(38, 10, 6, 5, 70, 'convenience', '#c9c3b5', 'left');
  B(44, 10, 4, 5, 92, 'laundry', '#b5aab8', 'left');
  B(0, 3, 6, 6, 160, 'condo', '#a39e94');
  B(6, 2, 6, 7, 210, 'condo', '#9c958c');
  B(15, 2, 7, 8, 150, 'condo', '#a7a196');
  B(22, 2, 8, 7, 240, 'office', '#7f8a99');
  B(31, 1, 8, 7, 170, 'condo', '#a39e94');
  B(39, 2, 9, 7, 130, 'condo', '#aaa39a');
  B(0, 27, 7, 6, 90, 'condo', '#a8a196');
  B(8, 27, 6, 5, 76, 'restaurant', '#c3a487');
  B(15, 27, 6, 6, 120, 'office', '#8995a3');
  B(23, 27, 7, 5, 80, 'pharmacy', '#b8c4c2', 'right');
  B(23, 33, 7, 6, 140, 'condo', '#a49d92');
  B(33, 27, 6, 5, 66, 'cafe', '#9aa59a');
  B(40, 27, 8, 7, 180, 'condo', '#9e978d');
  const props: Prop[] = [];
  for (let i = 2; i < W; i += 8) props.push({ i, j: 20, kind: 'pillar' });
  for (let i = 3; i < W; i += 6) if (i !== 21) { props.push({ i, j: 16, kind: i % 12 === 3 ? 'lamp' : 'tree' }); props.push({ i: i + 2, j: 24, kind: i % 12 === 3 ? 'tree' : 'lamp' }); }
  props.push({ i: 11, j: 15, kind: 'cart' });
  // 태국은 좌측통행: 북쪽 차선이 +i, 남쪽 차선이 −i
  const lanes: Lane[] = [
    ...[17, 18, 19].map((j): Lane => ({ j, i0: 0, i1: W - 1, dir: 1 })),
    ...[21, 22, 23].map((j): Lane => ({ j, i0: 0, i1: W - 1, dir: -1 })),
  ];
  return finalize({ id: 'bkk-sukhumvit-test', W, H, tiles, buildings, props, lanes, door: { i: 16, j: 15 }, spawn: { i: 16, j: 15 } });
}

export function walkable(z: Zone, i: number, j: number): boolean {
  return i >= 0 && j >= 0 && i < z.W && j < z.H && !z.blocked[j * z.W + i];
}

/** 주변 반경 r 안의 걸을 수 있는 보도 타일 하나 */
export function randomWalkTileNear(z: Zone, i: number, j: number, r: number, prefer: TileType[] = ['walk', 'cross', 'park']): [number, number] | null {
  for (let n = 0; n < 60; n++) {
    const a = i + Math.round((Math.random() * 2 - 1) * r), b = j + Math.round((Math.random() * 2 - 1) * r);
    if (walkable(z, a, b) && prefer.includes(tileAt(z, a, b))) return [a, b];
  }
  return null;
}

const DIRS: [number, number][] = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]];

/** 8방향 너비 우선 탐색 — 출발점과 목표를 감싼 상자 안에서만 찾는다 */
export function findPath(z: Zone, si: number, sj: number, ti: number, tj: number): [number, number][] | null {
  if (!walkable(z, ti, tj)) return null;
  const M = 14;
  const x0 = Math.max(0, Math.min(si, ti) - M), y0 = Math.max(0, Math.min(sj, tj) - M);
  const x1 = Math.min(z.W - 1, Math.max(si, ti) + M), y1 = Math.min(z.H - 1, Math.max(sj, tj) + M);
  const bw = x1 - x0 + 1, bh = y1 - y0 + 1;
  if (bw * bh > 200 * 200) return null;
  const prev = new Int32Array(bw * bh).fill(-2);
  const K = (i: number, j: number) => (j - y0) * bw + (i - x0);
  const q = new Int32Array(bw * bh);
  let head = 0, tail = 0;
  q[tail++] = K(si, sj);
  prev[K(si, sj)] = -1;
  while (head < tail) {
    const k = q[head++];
    const a = (k % bw) + x0, b = Math.floor(k / bw) + y0;
    if (a === ti && b === tj) {
      const path: [number, number][] = [];
      let c = k;
      while (prev[c] !== -1) { path.unshift([(c % bw) + x0, Math.floor(c / bw) + y0]); c = prev[c]; }
      return path;
    }
    for (const [da, db] of DIRS) {
      const na = a + da, nb = b + db;
      if (na < x0 || nb < y0 || na > x1 || nb > y1 || !walkable(z, na, nb)) continue;
      const nk = K(na, nb);
      if (prev[nk] !== -2) continue;
      if (da && db && (!walkable(z, a + da, b) || !walkable(z, a, b + db))) continue;
      prev[nk] = k;
      q[tail++] = nk;
    }
  }
  return null;
}
