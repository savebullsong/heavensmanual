// 존(동네) 데이터 — OSM 변환기(v2)와 시험 구역 생성기가 같은 형식을 쓴다
export const TYPES = ['void', 'lot', 'park', 'water', 'walk', 'soi', 'road', 'median', 'cross', 'block', 'hill'] as const; // 35차 hill = 달동네 산비탈 (못 걷는다 · 축대)
export type TileType = (typeof TYPES)[number];
const TI = Object.fromEntries(TYPES.map((t, k) => [t, k])) as Record<TileType, number>;

// generic = 이름·간판 없는 건물 (정부시설은 모두 이것으로 바뀐다)
export type Category =
  | 'convenience' | 'pharmacy' | 'clinic' | 'restaurant' | 'bar' | 'cafe' | 'bank' | 'worship' | 'school'
  | 'hotel' | 'laundry' | 'shop' | 'office' | 'condo' | 'ujusae' | 'loan' | 'generic'
  | 'hbank' | 'atone' | 'rebirth' // 지옥: 지옥 은행 · 속죄의 회당 · (1층 불탄 도시 골목 끝) 환생 로비 입구
  | 'terrace' // 천국: 구름 계단 위 환생의 테라스 (환생관 루엔)
  | 'goatroom' // 31차 지옥 142층: 염소대왕의 방 (떨어진 자가 맨 먼저 오는 곳)
  | 'home' // 24차 서울 달동네 골목 끝의 내 집 (유내)
  | 'palace' | 'attraction' // 35차 천국 1층: 천국 본청 · 놀이공원 탈것
  | 'estate'; // 35차 사서 들어가 사는 집: 방콕 아속의 콘도 · 서울 역삼의 아파트

export interface Building {
  /** 31차: 지옥 좌판에 자리 잡은 장사꾼 (좌판 모양이 장사마다 다르다) */
  vend?: HellVendor;
  i0: number; j0: number; w: number; d: number; // 바닥 사각형 (타일)
  h: number; // 높이 px
  cat: Category;
  sign?: 'left' | 'right'; // 간판 면: left = +j 면, right = +i 면
  color: string;
  hut?: boolean; // (예전) 지옥 마을의 오두막
  hk?: HellBuildKind; // 지옥의 집·덩어리 종류
  estate?: 'bkk' | 'seoul'; // 35차: 사는 집 매물의 도시
  yunae?: boolean; // 40차: 서울 달동네의 '유내 미용실' (지금은 다른 사람이 한다)
}
/** 지옥: 초가집 · 감옥 · 뼈집 · 대형 짐승 시체 · 뼈 무더기 · 내장 더미 */
export type HellBuildKind = 'thatch' | 'prison' | 'bonehouse' | 'carcass' | 'bonepile' | 'guts' | 'butcher' | 'stall' | 'burnt' | 'idol' | 'smithy' | 'maskhouse' | 'puppetshop' | 'mineshaft' | 'puppetidol'; // 34차 smithy = 4층 칼드렉의 대장간 · 43차 5층: 안과 밖이 다른 집 · 인형술사 마리의 공방
/** fence o: 0 = i 방향, 1 = j 방향, 2 = 모서리 기둥 */
export interface Prop { i: number; j: number; kind: 'tree' | 'lamp' | 'pillar' | 'cart' | 'fence' | 'pole' | 'spirit' | 'moto' | 'plant' | 'bin' | 'stools' | 'pushcart' | HellDecorKind | 'sunbed' | 'parasol' | 'giraffe' | 'elephant' | 'lion' | 'zebra' | 'flamingo' | 'panda' | 'fountain' | 'balloons' | 'icecream'; o?: number }
/** 지옥 소품: 경계 바위·성벽, 뼈, 해골 더미, 꼬챙이, 가마솥, 철창, 마을 불빛, 고문 장면(움직임) */
export type HellDecorKind = 'crag' | 'bones' | 'skulls' | 'stake' | 'cauldron' | 'cage' | 'lantern' | 'bonfire' | 'torture' | 'htree' | 'rock' | 'crack' | 'dicetable' | 'campfire' | 'junk' | 'reeds' | 'mattress' | 'anvil' | 'forge' | 'maskpost'; // 43차: 가면을 줄줄이 건 나무 기둥 (5층)
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
  /** 지옥 층 (현실 지도에는 없음) */
  hell?: HellInfo;
  /** 건물 안 (들어갈 때 만드는 작은 방) */
  interior?: InteriorInfo;
  /** 19차: 현실 구역에 우주새가 있는가 (아속 구역에만). 없으면 zone.door 는 처음 서는 자리일 뿐 */
  shop?: boolean;
  /** 19차: 구역 잇기 — 걷는 범위(i0..i1, j0..j1, 끝 제외)와 서쪽·동쪽 이웃 구역. 범위 밖 둘레는 보이기만 한다 */
  edges?: { w: string | null; e: string | null; c: number; i0: number; i1: number; j0: number; j1: number };
  /** 전체 지도에서 이 구역 (0,0)의 자리 (구역 사이 좌표를 맞춘다) */
  origin?: { i: number; j: number };
  /** 24차: 도시 (서울이면 간판·차·시계·화폐가 서울식) · 내 집으로 가는 골목 들머리 · 내 집 문 앞 */
  city?: 'seoul';
  /** 35차: 구름 위에 따로 지은 천국 1층 (현실 지도를 덮지 않는다) */
  heavenGen?: boolean;
  homeAlley?: { i0: number; j0: number; i1: number; j1: number };
  home?: { i: number; j: number };
  /** 32차: 지도 밖(갈 수 없는 곳)까지 그린다 — 그리기 전용. 가장자리 m칸 안쪽을 거울삼아 바깥을 비춘다 (빈 땅은 지어낸 골목·건물로) */
  beyond?: Beyond;
}
export interface Beyond { m: number; lanes: Lane[] }
/** 방의 가구: 바닥 사각형(타일)과 높이(px), 무엇인지 */
export interface Furn { i: number; j: number; w: number; d: number; h: number; kind: string; v?: number }
export interface InteriorInfo {
  kind: string; // temple · church · mosque · gurdwara · bank · clinic · pharmacy · mart · food · cafe · bar · salon · massage · laundry · lobby · shop
  rest: boolean; // 쉬는 곳 (싸움 불가 · 빠른 회복)
  name: string;
  floor: string; wall: string; trim: string;
  exit: { i: number; j: number }; // 나가는 문 (이 칸을 밟으면 거리로)
  clerk?: { i: number; j: number }; // 직원이 서는 곳
  counter?: { i: number; j: number }; // 직원에게 말을 거는 자리 (카운터 앞)
  furn: Furn[];
  age?: 0 | 1 | 2 | 3; // 24차 내 집: 유내의 시절 (28차: 10대 · 20대 · 30대 후반) · 37차: 0~2는 회상, 3은 지금의 빈집
  from: { b: number; out: { i: number; j: number }; bd?: Building }; // 거리의 건물 번호와 나왔을 때 설 자리 (bd = 그 건물, 21차 직종 판단용)
  store?: string; cuisine?: string; // 가게 창 (mart · pharmacy · food · cafe) / bank
  seats: [number, number][]; // 손님이 서 있을 자리
}
export interface HellInfo {
  floor: number;
  rest: { i: number; j: number; r: number }; // 휴식 마을 (울타리 안 ±r칸 정사각형: 유황새, 싸움 불가·괴물 못 들어옴)
  up: { i: number; j: number }; // 올라가는 계단 (층주를 쓰러뜨려야 열림) · 1층은 출구 = 파샤르
  down: { i: number; j: number }; // 내려가는 계단 (언제나 열림)
  boss: { i: number; j: number };
  pashar?: { i: number; j: number };
  talus?: { i: number; j: number }; // 2층 들판의 노름꾼 탈루스의 자리
  spawns: [number, number][]; // 괴물이 나오는 자리
  /** 위층으로 가는 길의 모양: 1층 불탄 도시의 골목(끝에 환생 로비) · 2층 늪을 걸어 건너는 여울 · 3층 나루터 */
  exit: 'alley' | 'ford' | 'ferry';
  /** 마을 모양: 1층 둥근 성벽(가장 크다) · 2층 늪 위 널빤지 섬 · 3층 비좁은 네모 */
  shape: 'round' | 'blob' | 'square';
  /** 마을에 앉거나 누운 영혼들 (환생을 기다리며 지친 사람들) */
  souls: { i: number; j: number; pose: 'sit' | 'lie' | 'stand'; d: number; pray?: boolean }[];
  /** 장사꾼 자리: 고깃간 · 잡동사니 좌판 */
  vendors: { i: number; j: number; kind: HellVendor }[];
  /** 문지기(경비병) 둘이 서는 곳 — 위층 길 들머리 */
  posts: [number, number][];
  /** 44차 구역 (칸마다): 0 들판(마을 · 필드 보스) · 1 깊은 들판(센 괴물) · 2 층주의 터 · 3 광산(4층) */
  region?: Uint8Array;
  /** 44차 마을들 (첫째가 rest · 깊은 층엔 둘째 마을). 쓰러지면 가장 가까운 마을에서 일어난다 */
  villages?: { i: number; j: number; r: number }[];
  /** 44차 보호구역: 층계 대기소(위층 길 앞 · 아래층 계단 머리) · 광산 작업장 — 괴물이 못 들어오고 영혼끼리 싸울 수 없다 */
  safes?: { i: number; j: number; r: number; kind: 'stairUp' | 'stairDown' | 'mine' }[];
}

/** 22차: 지옥 마을 장사꾼 — 고깃간 · 물장수 · 넝마 · 약장수 · 장사꾼 · 무기상 · 지옥호텔 지배인 · 서큐버스 (층마다 한 명씩) */
export type HellVendor = 'butcher' | 'water' | 'junk' | 'medic' | 'trader' | 'arms' | 'hotel' | 'succubus' | 'smith' | 'puppeteer'; // 30차: 대장장이 · 43차: 5층 인형술사 마리

export function tileAt(z: Zone, i: number, j: number): TileType {
  if (i < 0 || j < 0 || i >= z.W || j >= z.H) return 'void';
  return TYPES[z.tiles[j * z.W + i]];
}

/** 32차: 거울 좌표 — [m, n-m) 범위를 벗어나면 그 끝을 거울 삼아 뒤집는다 (멀리 가면 다시 뒤집힌다) */
export function mirror(n: number, m: number, x: number): number {
  const lo = m, span = n - 2 * m;
  if (x >= lo && x < lo + span) return x;
  let t = (x - lo) % (2 * span);
  if (t < 0) t += 2 * span;
  return t < span ? lo + t : lo + 2 * span - 1 - t;
}
/** 32차: 지어낸 동네 — 12칸마다 두 칸 골목, 나머지는 건물 자리 */
export const FILL_CELL = 12;
export function fillTile(i: number, j: number): TileType {
  const a = ((i % FILL_CELL) + FILL_CELL) % FILL_CELL, b = ((j % FILL_CELL) + FILL_CELL) % FILL_CELL;
  return a < 2 || b < 2 ? 'soi' : 'block';
}
/** 그리기용 땅: 지도 안은 tileAt 그대로, 밖(과 비어 있는 땅)은 거울에 비친 땅 */
export function groundAt(z: Zone, i: number, j: number): TileType {
  const b = z.beyond;
  if (!b) return tileAt(z, i, j);
  const mi = mirror(z.W, b.m, i), mj = mirror(z.H, b.m, j);
  const t = TYPES[z.tiles[mj * z.W + mi]];
  return t === 'void' ? fillTile(mi, mj) : t;
}

export function finalize(z: Omit<Zone, 'blocked'>): Zone {
  const blocked = new Uint8Array(z.W * z.H);
  for (let k = 0; k < blocked.length; k++) {
    const t = TYPES[z.tiles[k]];
    // 빈 땅(주차장·공터·광장)은 걸을 수 있다. 건물·물·지도 바깥만 막는다
    blocked[k] = t === 'block' || t === 'void' || t === 'water' || t === 'hill' ? 1 : 0;
  }
  for (const p of z.props) if (p.kind !== 'tree' && p.kind !== 'bones' && p.kind !== 'crack' && p.kind !== 'reeds' && p.kind !== 'mattress') blocked[p.j * z.W + p.i] = 1; // 나무·흩어진 뼈·땅의 자국은 밟고 지나간다
  // 구역 둘레(이웃 거리가 보이기만 하는 곳)는 걸을 수 없다
  const e = z.edges;
  if (e) for (let j = 0; j < z.H; j++) for (let i = 0; i < z.W; i++) if (i < e.i0 || i >= e.i1 || j < e.j0 || j >= e.j1) blocked[j * z.W + i] = 1;
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
  shop?: boolean; edges?: Zone['edges']; origin?: Zone['origin']; city?: Zone['city']; homeAlley?: Zone['homeAlley']; home?: Zone['home'];
}): Zone {
  const map = new Uint8Array(128);
  for (let k = 0; k < json.codes.length; k++) map[json.codes.charCodeAt(k)] = TI[json.types[k] as TileType] ?? 0;
  const tiles = new Uint8Array(json.W * json.H);
  for (let k = 0; k < tiles.length; k++) tiles[k] = map[json.tiles.charCodeAt(k)];
  const lanes = widenMainWalks(tiles, json.W, json.H, json.lanes, json.buildings);
  return finalize({ id: json.id, W: json.W, H: json.H, tiles, buildings: json.buildings, props: json.props, lanes, door: json.door, spawn: json.spawn, attribution: json.attribution, shop: json.shop ?? true, edges: json.edges, origin: json.origin, city: json.city, homeAlley: json.homeAlley, home: json.home });
}

/**
 * 22차: 대로 보도 넓히기 — 실제보다 좁아 차가 사람 바로 옆을 스쳤다.
 * 칸마다(세로 줄) 보도↔보도 사이의 찻길 띠(8~26칸)를 찾아 가장 바깥 차로 한 줄씩을 보도로 바꾸고,
 * 그 줄을 달리던 차로는 지운다 (남은 찻길 위로만 차가 다닌다)
 */
function widenMainWalks(tiles: Uint8Array, W: number, H: number, lanes: Lane[], buildings: Building[] = []): Lane[] {
  const R = TI.road, M = TI.median, C = TI.cross, WK = TI.walk, LOT = TI.lot;
  const isRoad = (v: number) => v === R || v === M || v === C;
  // 38차: 찻길 한가운데 섬처럼 떠 있는 작은 보도 조각(지도의 건널목 선이 계단처럼 남은 것)은 찻길로 — 서울 대로의 '깨진 그림'
  {
    const seen = new Uint8Array(W * H);
    for (let s0 = 0; s0 < W * H; s0++) {
      if (tiles[s0] !== WK || seen[s0]) continue;
      const comp: number[] = [s0]; seen[s0] = 1;
      let closed = true;
      for (let q = 0; q < comp.length; q++) {
        const k = comp[q], i = k % W, j = (k - i) / W;
        for (const [a, b] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
          const ni = i + a, nj = j + b;
          if (ni < 0 || nj < 0 || ni >= W || nj >= H) { closed = false; continue; }
          const nk = nj * W + ni, v = tiles[nk];
          if (v === WK) { if (!seen[nk]) { seen[nk] = 1; comp.push(nk); } }
          else if (!isRoad(v)) closed = false;
        }
      }
      if (closed && comp.length <= 40) for (const k of comp) tiles[k] = R;
    }
  }
  for (let i = 0; i < W; i++) {
    let j = 0;
    while (j < H) {
      if (!isRoad(tiles[j * W + i])) { j++; continue; }
      const a = j;
      while (j < H && isRoad(tiles[j * W + i])) j++;
      const b = j - 1, len = b - a + 1;
      if (len < 8 || len > 26 || a < 1 || b >= H - 1) continue;
      if (tiles[(a - 1) * W + i] !== WK || tiles[(b + 1) * W + i] !== WK) continue;
      for (const r of [a, b]) if (tiles[r * W + i] === R || tiles[r * W + i] === C) tiles[r * W + i] = WK;
    }
  }
  // 38차: 세로·비스듬한 대로(아속 몬뜨리 · 강남대로)도 — 줄마다(가로) 찻길 띠의 가장 바깥 한 칸씩을 보도로
  for (let j = 0; j < H; j++) {
    let i = 0;
    while (i < W) {
      if (!isRoad(tiles[j * W + i])) { i++; continue; }
      const a = i;
      while (i < W && isRoad(tiles[j * W + i])) i++;
      const b = i - 1, len = b - a + 1;
      if (len < 8 || len > 26 || a < 1 || b >= W - 1) continue;
      if (tiles[j * W + a - 1] !== WK || tiles[j * W + b + 1] !== WK) continue;
      for (const c of [a, b]) if (tiles[j * W + c] === R || tiles[j * W + c] === C) tiles[j * W + c] = WK;
    }
  }
  // 38차: 연석 보도에서 건물 쪽 빈터(공터)로 두 칸까지 보도를 넓힌다 — 건물이 서 있는 칸은 건드리지 않는다
  const foot = new Uint8Array(W * H);
  for (const b of buildings) for (let j = Math.max(0, b.j0); j < Math.min(H, b.j0 + b.d); j++) for (let i = Math.max(0, b.i0); i < Math.min(W, b.i0 + b.w); i++) foot[j * W + i] = 1;
  const N4: [number, number][] = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  let front: number[] = [];
  for (let j = 1; j < H - 1; j++) for (let i = 1; i < W - 1; i++) {
    const k = j * W + i;
    if (tiles[k] === WK && N4.some(([a, b]) => isRoad(tiles[(j + b) * W + i + a]))) front.push(k);
  }
  for (let pass = 0; pass < 2; pass++) {
    const next: number[] = [];
    for (const k of front) {
      const i = k % W, j = (k - i) / W;
      for (const [a, b] of N4) {
        const ni = i + a, nj = j + b;
        if (ni < 1 || nj < 1 || ni >= W - 1 || nj >= H - 1) continue;
        const nk = nj * W + ni;
        if (tiles[nk] !== LOT || foot[nk]) continue;
        tiles[nk] = WK;
        next.push(nk);
      }
    }
    front = next;
  }
  // 차로: 아직 찻길인 구간만 남긴다 (6칸 이상)
  const out: Lane[] = [];
  for (const l of lanes) {
    let s = -1;
    for (let i = l.i0; i <= l.i1 + 1; i++) {
      const ok = i <= l.i1 && i >= 0 && i < W && isRoad(tiles[l.j * W + i]);
      if (ok && s < 0) s = i;
      if (!ok && s >= 0) { if (i - s >= 6) out.push({ ...l, i0: s, i1: i - 1 }); s = -1; }
    }
  }
  return out;
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
  B(15, 13, 2, 2, 58, 'ujusae', '#4a3527', 'left');
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
