// 지옥 (2단계): 1~3층. 층마다 새 지도·일반 괴물·층주 1명. 휴식 공간 = 울타리 마을 안 황혼의 유황새.
// 지도는 층 번호로 정해진 씨앗에서 만든다 (모두에게 같은 지도).
import { TYPES, finalize, type Zone, type Building, type HellBuildKind, type Prop, type TileType } from './zone.ts';
import type { Lang } from './i18n.ts';

export const OPEN_FLOORS = 3; // 지금 열린 층 (4~13층은 하나씩 업데이트)

export type Theme = 'ash' | 'swamp' | 'market';
export interface FloorDef { floor: number; theme: Theme; name: Record<Lang, string>; sin: Record<Lang, string>; monsters: string[]; boss: string; guard?: string }
export const FLOORS: FloorDef[] = [
  { floor: 1, theme: 'ash', name: { ko: '재의 문턱', th: 'ธรณีแห่งเถ้าถ่าน', en: 'Threshold of Ash' }, sin: { ko: '경미한 잘못, 책임 회피', th: 'ความผิดเล็กน้อย การหนีความรับผิดชอบ', en: 'Petty wrongs, evading responsibility' }, monsters: ['ashen', 'ember', 'bonewalker', 'gateyak'], boss: 'ashgal', guard: 'ashwarden' },
  { floor: 2, theme: 'swamp', name: { ko: '굶주림의 늪', th: 'บึงแห่งความหิวโหย', en: 'Swamp of Hunger' }, sin: { ko: '탐욕', th: 'ความโลภ', en: 'Greed' }, monsters: ['pret', 'bogdead', 'gluttonyak'], boss: 'gurma', guard: 'hollowbowl' },
  { floor: 3, theme: 'market', name: { ko: '피의 시장', th: 'ตลาดเลือด', en: 'Blood Market' }, sin: { ko: '사기, 기만', th: 'การฉ้อโกง การหลอกลวง', en: 'Fraud and deceit' }, monsters: ['haggler', 'debtbones', 'bloodpret', 'merchantyak'], boss: 'serane', guard: 'waxseal' },
];
export const floorDef = (f: number) => FLOORS[Math.max(1, Math.min(FLOORS.length, f)) - 1];

/**
 * 휴식 마을의 경비병 (「지옥 13층 경비병 설정집」 B01~B03). 층주의 휴전 협약에 따라 마을을 지키는 중립 NPC.
 * 순찰 → 감지 → 개입 → 복귀. 마을과 둘레(완충 경계)에 다가온 괴물을 잡고, 그 안에서 싸움을 건 사람은 경고 뒤 체력 1까지 제압해 마을 밖으로 내보낸다.
 * 일반 괴물보다 강하다. 쓰러뜨려도 보상·카르마·영격은 없다.
 */
export interface GuardDef {
  key: string; body: 'warden1' | 'warden2' | 'warden3'; weapon: string | null;
  name: Record<Lang, string>; line: Record<Lang, string>; look: Record<Lang, string>;
  cols: Record<number, string>; hp: number; dmg: [number, number]; atk: number; speed: number;
  /** push = 곤봉으로 내려쳐 밀어냄 · mud = 진흙 파문으로 느리게 · seal = 붉은 봉인 낙인 */
  special: 'push' | 'mud' | 'seal';
}
export const GUARDS: Record<string, GuardDef> = {
  ashwarden: {
    key: 'ashwarden', body: 'warden1', weapon: 'knocker',
    name: { ko: '재문지기', th: 'ผู้เฝ้าประตูเถ้า', en: 'Ash Warden' },
    line: { ko: '이 문 앞에서는 더 이상 누구도 다치지 않는다.', th: 'หน้าประตูนี้ จะไม่มีใครต้องเจ็บอีกแล้ว', en: 'Before this gate, no one is hurt anymore.' },
    look: { ko: '재가 묻은 해골. 낡은 회색 망토에 문고리 모양의 뼈 곤봉, 허리엔 작은 돌문 열쇠.', th: 'โครงกระดูกเปื้อนเถ้า สวมผ้าคลุมสีเทาเก่า ถือกระบองกระดูกรูปห่วงประตู มีกุญแจประตูหินห้อยเอว', en: 'An ash-dusted skeleton in an old grey cloak, holding a bone club shaped like a door knocker. A small stone-gate key hangs at its waist.' },
    cols: { 1: '#cfc6b0', 3: '#6a6662', 4: '#56524e', 10: '#d8ccb0', 14: '#6a5a3a', 15: '#1a1614', 12: '#ff7a2a', 6: '#ff7a2a' },
    hp: 1600, dmg: [22, 32], atk: 1.05, speed: 0.55, special: 'push',
  },
  hollowbowl: {
    key: 'hollowbowl', body: 'warden2', weapon: null,
    name: { ko: '빈그릇귀', th: 'ผีชามกลวง', en: 'Hollow Bowl' },
    line: { ko: '굶주림은 핑계가 될 수 없다.', th: 'ความหิวไม่ใช่ข้ออ้าง', en: 'Hunger is no excuse.' },
    look: { ko: '갈비뼈가 휜 배가 텅 빈 그릇처럼 패였다. 한쪽 팔에 진흙으로 빚은 큰 사발을 달았다.', th: 'ท้องที่ซี่โครงโค้งเว้าลึกเหมือนชามเปล่า แขนข้างหนึ่งผูกชามดินเผาใบใหญ่ไว้', en: 'Its rib-curved belly is hollowed like an empty bowl. A large clay bowl is strapped to one arm.' },
    cols: { 1: '#4e6a46', 3: '#2e3a26', 4: '#2e3a26', 10: '#a8b890', 13: '#8a6a4a', 12: '#c8f08a', 15: '#141a10', 6: '#c8f08a' },
    hp: 2000, dmg: [24, 34], atk: 1.15, speed: 0.5, special: 'mud',
  },
  waxseal: {
    key: 'waxseal', body: 'warden3', weapon: 'sealstaff',
    name: { ko: '봉랍귀', th: 'ผีตราครั่ง', en: 'Waxseal' },
    line: { ko: '서명은 자유다. 칼은 아니다.', th: 'จะลงนามก็ได้ตามใจ แต่ไม่ใช่มีด', en: 'Signing is free. The blade is not.' },
    look: { ko: '붉은 봉랍처럼 굳은 얼굴, 검은 상인복, 붉은 밀랍 인장이 달린 긴 지팡이.', th: 'ใบหน้าแข็งเหมือนครั่งแดง ชุดพ่อค้าสีดำ ไม้เท้ายาวติดตราครั่งสีแดง', en: 'A face hardened like red sealing wax, a black merchant coat, and a long staff topped with a red wax seal.' },
    cols: { 1: '#a8281e', 3: '#1e1818', 4: '#141010', 14: '#c9a23e', 13: '#3a2418', 12: '#c8281e', 6: '#ffd08a', 15: '#0e0a0a', 10: '#a8281e' },
    hp: 2400, dmg: [28, 38], atk: 1.0, speed: 0.6, special: 'seal',
  },
};

/** 괴물: 몸(망자·프렛·야크·해골) + 색 */
export type MonsterBody = 'ash' | 'pret' | 'yak' | 'bones';
export interface MonsterDef {
  key: string; body: MonsterBody; name: Record<Lang, string>;
  skin: string; cloth: string; glow: string; // 살·옷·빛나는 곳 색
  hp: number; dmg: [number, number]; speed: number; notice: number; atk: number; scale: number; notes: [number, number];
  boss?: boolean; weapon?: string | null;
}
const M = (key: string, body: MonsterBody, ko: string, th: string, en: string, skin: string, cloth: string, glow: string, hp: number, dmg: [number, number], speed: number, notice: number, atk: number, scale: number, notes: [number, number], extra: Partial<MonsterDef> = {}): MonsterDef =>
  ({ key, body, name: { ko, th, en }, skin, cloth, glow, hp, dmg, speed, notice, atk, scale, notes, ...extra });
export const MONSTERS: Record<string, MonsterDef> = Object.fromEntries([
  // 1층 재의 문턱
  M('ashen', 'ash', '잿빛 망자', 'ผีเถ้า', 'Ashen dead', '#6e6a66', '#3a3430', '#d9632a', 260, [8, 14], 1.0, 6, 1.0, 1, [3, 8]),
  M('ember', 'ash', '불씨 망자', 'ผีถ่านไฟ', 'Ember dead', '#4a403a', '#2a2220', '#ffb02a', 210, [10, 16], 1.5, 7, 0.8, 1, [4, 9]),
  M('bonewalker', 'bones', '걷는 해골', 'โครงกระดูกเดินได้', 'Walking bones', '#d8cfb8', '#3a3026', '#ff6a2a', 230, [9, 15], 1.2, 7, 0.9, 1, [4, 9]),
  M('gateyak', 'yak', '문지기 야크', 'ยักษ์เฝ้าประตู', 'Gate yak', '#5a6e8a', '#3a2a22', '#e0b437', 520, [14, 22], 0.9, 5, 1.15, 1.12, [10, 18], { weapon: 'club' }),
  M('ashgal', 'yak', '아쉬갈', 'อัชกัล', 'Ashgal', '#8a8580', '#2a2220', '#ff6a1a', 2400, [22, 32], 1.0, 9, 1.0, 1.45, [120, 160], { boss: true, weapon: 'club' }),
  // 2층 굶주림의 늪
  M('pret', 'pret', '프렛', 'เปรต', 'Phi Pret', '#9aa08a', '#4a4232', '#c9d26a', 300, [10, 18], 0.8, 6, 1.0, 1, [5, 11]),
  M('bogdead', 'ash', '늪 망자', 'ผีบึง', 'Bog dead', '#5a6a4a', '#3a3a22', '#8ad06a', 320, [11, 17], 0.9, 6, 1.0, 1, [5, 10]),
  M('gluttonyak', 'yak', '탐식 야크', 'ยักษ์ตะกละ', 'Glutton yak', '#4f7a4a', '#4a3a22', '#e0b437', 640, [16, 25], 0.85, 5, 1.15, 1.15, [12, 22], { weapon: 'club' }),
  M('gurma', 'pret', '구르마', 'กูร์มา', 'Gurma', '#7a8a5a', '#3a3222', '#e8f06a', 3200, [26, 36], 0.85, 9, 1.05, 1.55, [240, 300], { boss: true }),
  // 3층 피의 시장
  M('haggler', 'ash', '흥정꾼 망자', 'ผีพ่อค้าต่อราคา', 'Haggler dead', '#6a5a52', '#8a1a1a', '#f2c84a', 380, [13, 20], 1.1, 6, 0.95, 1, [7, 14]),
  M('debtbones', 'bones', '빚진 해골', 'โครงกระดูกติดหนี้', 'Indebted bones', '#c9b89a', '#5a1a1a', '#f2c84a', 360, [13, 21], 1.2, 7, 0.9, 1, [7, 13]),
  M('bloodpret', 'pret', '피 프렛', 'เปรตเลือด', 'Blood pret', '#a06a62', '#5a1a1a', '#ff4a3a', 420, [14, 22], 0.9, 6, 1.0, 1.05, [8, 15]),
  M('merchantyak', 'yak', '장사치 야크', 'ยักษ์พ่อค้า', 'Merchant yak', '#a0302a', '#2a1a12', '#f2c84a', 800, [19, 29], 0.9, 5, 1.1, 1.15, [15, 26], { weapon: 'club' }),
  M('serane', 'yak', '세라네', 'เซราเน', 'Serane', '#c9a0a8', '#5a0a1a', '#f2d27a', 4200, [30, 42], 1.1, 9, 0.95, 1.5, [380, 460], { boss: true, weapon: 'club' }),
].map((m) => [m.key, m]));

// ───────────────────────── 지도 ─────────────────────────
const TI = Object.fromEntries(TYPES.map((t, k) => [t, k])) as Record<TileType, number>;
function rng(seed: number) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

const cache = new Map<number, Zone>();
export function hellZone(floor: number): Zone {
  const hit = cache.get(floor);
  if (hit) return hit;
  const def = floorDef(floor);
  const r = rng(floor * 7919 + 13);
  const W = 104, H = 104;
  const tiles = new Uint8Array(W * H).fill(TI.lot);
  const at = (i: number, j: number) => (i < 0 || j < 0 || i >= W || j >= H ? -1 : tiles[j * W + i]);
  const set = (i: number, j: number, t: TileType) => { if (i >= 0 && j >= 0 && i < W && j < H) tiles[j * W + i] = TI[t]; };
  const disc = (ci: number, cj: number, rad: number, t: TileType) => { for (let j = cj - rad; j <= cj + rad; j++) for (let i = ci - rad; i <= ci + rad; i++) if ((i - ci) ** 2 + (j - cj) ** 2 <= rad * rad + 1) set(i, j, t); };
  // 바깥: 지나갈 수 없는 경계 (네 칸 바위 + 층마다 다른 해자: 1층 용암 두 칸 · 2층 늪 두 칸 · 3층 핏물 한 칸)
  const EDGE = 4, MOAT = def.theme === 'market' ? 1 : 2;
  const edgeD = (i: number, j: number) => Math.min(i, j, W - 1 - i, H - 1 - j);
  const border = () => { for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) { const d = edgeD(i, j); if (d < EDGE) set(i, j, 'block'); else if (d < EDGE + MOAT) set(i, j, 'water'); } };
  border();
  const C = { i: 52, j: 56 }; // 휴식 공간
  const U = { i: 18, j: 16 }; // 올라가는 계단 (1층: 출구)
  const B = { i: 27, j: 25 }; // 층주 자리
  const D = { i: 86, j: 88 }; // 내려가는 계단
  const VR = 11; // 휴식 마을: 울타리로 두른 정사각형 (가운데에서 ±11칸), 네 면 가운데에 문
  const keep = [{ ...C, r: VR + 4 }, { ...B, r: 7 }, { ...U, r: 4 }, { ...D, r: 4 }];
  const free = (i: number, j: number, m = 0) => keep.every((k) => Math.hypot(i - k.i, j - k.j) > k.r + m);
  // 지형
  if (def.theme === 'ash') {
    // 용암 강 둘: 왼쪽에서 오른쪽으로 구불구불
    for (const sj of [34, 74]) {
      let j = sj + Math.floor(r() * 6) - 3;
      for (let i = 3; i < W - 3; i++) {
        j += Math.floor(r() * 3) - 1; j = Math.max(8, Math.min(H - 9, j));
        const wid = 2 + (r() < 0.3 ? 1 : 0);
        for (let k = 0; k < wid; k++) if (free(i, j + k, 1)) set(i, j + k, 'water');
      }
    }
    for (let n = 0; n < 160; n++) { const i = 4 + Math.floor(r() * (W - 8)), j = 4 + Math.floor(r() * (H - 8)); if (at(i, j) === TI.lot && free(i, j)) set(i, j, 'park'); }
  } else if (def.theme === 'swamp') {
    for (let n = 0; n < 34; n++) {
      const i = 8 + Math.floor(r() * (W - 16)), j = 8 + Math.floor(r() * (H - 16)), rad = 2 + Math.floor(r() * 4);
      if (!free(i, j, rad + 1)) continue;
      disc(i, j, rad, 'water');
    }
    for (let n = 0; n < 500; n++) { const i = 4 + Math.floor(r() * (W - 8)), j = 4 + Math.floor(r() * (H - 8)); if (at(i, j) === TI.lot && free(i, j)) set(i, j, 'park'); }
  } else {
    // 피의 시장: 9칸마다 골목, 몇몇 골목 가운데에 핏물 도랑
    for (let i = 6; i < W - 4; i += 11) for (let j = 4; j < H - 4; j++) { set(i, j, 'soi'); set(i + 1, j, 'soi'); }
    for (let j = 6; j < H - 4; j += 11) for (let i = 4; i < W - 4; i++) { set(i, j, 'soi'); set(i, j + 1, 'soi'); }
    for (let i = 4; i < W - 4; i++) if (i % 5 !== 0 && free(i, 40, 1)) set(i, 40, 'water');
    for (let j = 4; j < H - 4; j++) if (j % 5 !== 0 && free(62, j, 1)) set(62, j, 'water');
  }
  border(); // 강·늪이 경계를 덮지 않게 다시
  // 길: 휴식 공간 ↔ 층주 ↔ 올라가는 계단, 휴식 공간 ↔ 내려가는 계단 (물 위는 다리)
  const pathTile: TileType = def.theme === 'market' ? 'walk' : 'walk';
  const road = (a: { i: number; j: number }, b: { i: number; j: number }) => {
    const mid = { i: Math.round((a.i + b.i) / 2 + (r() - 0.5) * 10), j: Math.round((a.j + b.j) / 2 + (r() - 0.5) * 10) };
    for (const [p, q] of [[a, mid], [mid, b]] as const) {
      const n = Math.max(Math.abs(q.i - p.i), Math.abs(q.j - p.j));
      for (let k = 0; k <= n; k++) {
        const i = Math.round(p.i + ((q.i - p.i) * k) / n), j = Math.round(p.j + ((q.j - p.j) * k) / n);
        for (const [di, dj] of [[0, 0], [1, 0], [0, 1], [1, 1]]) {
          const t = at(i + di, j + dj);
          set(i + di, j + dj, t === TI.water || t === TI.cross ? 'cross' : pathTile);
        }
      }
    }
  };
  // 마을 문 넷 (울타리 바로 바깥까지 길을 낸다)
  const gates = [{ i: C.i, j: C.j - VR - 1 }, { i: C.i - VR - 1, j: C.j }, { i: C.i + VR + 1, j: C.j }, { i: C.i, j: C.j + VR + 1 }];
  const gateFor = (t: { i: number; j: number }) => gates.reduce((a, g) => (Math.hypot(g.i - t.i, g.j - t.j) < Math.hypot(a.i - t.i, a.j - t.j) ? g : a));
  road(gateFor(B), B); road(B, U); road(gateFor(D), D);
  for (const g of gates) road(C, g);
  disc(B.i, B.j, 6, 'walk'); disc(U.i, U.j, 2, 'walk'); disc(D.i, D.j, 2, 'walk');
  // 마을 안 바닥: 1층 재 위의 돌 광장 · 2층 늪 위 널빤지 · 3층 붉은 타일 광장과 자갈길
  for (let j = C.j - VR + 1; j <= C.j + VR - 1; j++) for (let i = C.i - VR + 1; i <= C.i + VR - 1; i++) {
    const sq = (Math.abs(i - C.i) < 5 && Math.abs(j - C.j) < 5) || (i - C.i) * (j - C.j) === 0;
    set(i, j, def.theme === 'swamp' ? 'walk' : def.theme === 'market' ? (sq ? 'walk' : 'soi') : sq ? 'walk' : 'lot');
  }
  // 건물: 폐허·오두막·시장 건물 (마을 안에는 유황새와 오두막 넷)
  const buildings: Building[] = [];
  const shop: Building = { i0: C.i - 1, j0: C.j - 6, w: 2, d: 2, h: 58, cat: 'ujusae', sign: 'left', color: '#3a2a2a' };
  buildings.push(shop);
  const door = { i: shop.i0 + 1, j: shop.j0 + shop.d };
  const hutCol: Record<Theme, string> = { ash: '#4a3e36', swamp: '#4a4230', market: '#5a3228' };
  // 마을 안 집은 초가집 (사람이 사는 곳)
  for (const [di, dj, w, d] of [[-8, -8, 3, 2], [5, -9, 2, 3], [-9, 4, 2, 3], [5, 5, 3, 2], [-9, -3, 2, 2]] as const)
    buildings.push({ i0: C.i + di, j0: C.j + dj, w, d, h: 30, cat: 'generic', color: hutCol[def.theme], hk: 'thatch' });
  for (const b of buildings) for (let j = b.j0; j < b.j0 + b.d; j++) for (let i = b.i0; i < b.i0 + b.w; i++) set(i, j, 'block');
  const occupied = (i0: number, j0: number, w: number, d: number) => {
    for (let j = j0 - 1; j <= j0 + d; j++) for (let i = i0 - 1; i <= i0 + w; i++) {
      const t = at(i, j);
      if (t !== TI.lot && t !== TI.park && t !== (def.theme === 'market' ? -2 : -2)) return true;
      if (!free(i, j)) return true;
    }
    return buildings.some((b) => i0 < b.i0 + b.w + 1 && i0 + w + 1 > b.i0 && j0 < b.j0 + b.d + 1 && j0 + d + 1 > b.j0);
  };
  // 마을 밖: 집은 초가집·감옥·뼈집, 그보다 많은 것은 대형 짐승 시체·뼈 무더기·내장 더미
  // 층마다 비율이 다르다: 1층 감옥과 뼈 · 2층(굶주림) 내장과 초가 · 3층(피의 시장) 뼈집과 감옥이 빽빽하게
  const mixes: Record<Theme, [HellBuildKind, number][]> = {
    ash: [['prison', 12], ['bonehouse', 12], ['thatch', 6], ['carcass', 12], ['bonepile', 18], ['guts', 6]],
    swamp: [['thatch', 10], ['bonehouse', 5], ['prison', 4], ['carcass', 8], ['bonepile', 8], ['guts', 16]],
    market: [['bonehouse', 30], ['prison', 22], ['thatch', 24], ['carcass', 12], ['bonepile', 16], ['guts', 12]],
  };
  const sizeOf = (k: HellBuildKind): [number, number, number] => {
    const a = r() < 0.5;
    if (k === 'carcass') return a ? [4, 2, 50 + Math.floor(r() * 14)] : [2, 4, 50 + Math.floor(r() * 14)];
    if (k === 'bonepile') return r() < 0.3 ? [3, 3, 40] : [2, 2, 28 + Math.floor(r() * 8)];
    if (k === 'guts') return r() < 0.3 ? [3, 3, 22] : [2, 2, 16 + Math.floor(r() * 6)];
    if (k === 'prison') return [2 + Math.floor(r() * 3), 2 + Math.floor(r() * 2), 38 + Math.floor(r() * 10)];
    if (k === 'bonehouse') return [2 + Math.floor(r() * 2), 2 + Math.floor(r() * 2), 26 + Math.floor(r() * 8)];
    return [2 + Math.floor(r() * 2), 2 + Math.floor(r() * 2), 28 + Math.floor(r() * 6)];
  };
  for (const [kind, n0] of mixes[def.theme]) {
    for (let n = 0, tries = 0; n < n0 && tries < 900; tries++) {
      const [w, d, h] = sizeOf(kind);
      const i0 = 6 + Math.floor(r() * (W - 12 - w)), j0 = 6 + Math.floor(r() * (H - 12 - d));
      if (occupied(i0, j0, w, d)) continue;
      buildings.push({ i0, j0, w, d, h, cat: 'generic', color: hutCol[def.theme], hk: kind });
      n++;
    }
  }
  // 소품: 마을 울타리, 죽은 나무, 화로(밤 불빛), 부러진 기둥, 시장 좌판
  const props: Prop[] = [];
  for (let k = -VR; k <= VR; k++) {
    const gate = Math.abs(k) <= 1;
    for (const [i, j, o] of [[C.i + k, C.j - VR, 0], [C.i + k, C.j + VR, 0], [C.i - VR, C.j + k, 1], [C.i + VR, C.j + k, 1]] as const) {
      if (gate) { set(i, j, 'walk'); continue; }
      props.push({ i, j, kind: 'fence', o: Math.abs(k) === VR ? 2 : o });
    }
  }
  // 마을 불빛: 1층 광장 모닥불과 화로 · 2층 도깨비불 장대 · 3층 붉은 등롱
  const vLight: Prop['kind'] = def.theme === 'ash' ? 'lamp' : 'lantern';
  props.push({ i: C.i + 2, j: C.j + 1, kind: def.theme === 'ash' ? 'bonfire' : 'lantern' });
  for (const g of gates) for (const s2 of def.theme === 'ash' ? [-2, 2] : [2]) props.push(g.i === C.i ? { i: g.i + s2, j: g.j + (g.j < C.j ? 1 : -1), kind: vLight } : { i: g.i + (g.i < C.i ? 1 : -1), j: g.j + s2, kind: vLight });
  if (def.theme === 'market') for (const [di, dj] of [[3, 3], [-4, 2]]) props.push({ i: C.i + di, j: C.j + dj, kind: 'skulls' }); // 광장의 해골 더미 (촛불)
  const empty = (i: number, j: number) => (at(i, j) === TI.lot || at(i, j) === TI.park) && free(i, j) && !buildings.some((b) => i >= b.i0 - 1 && i <= b.i0 + b.w && j >= b.j0 - 1 && j <= b.j0 + b.d) && !props.some((p) => Math.abs(p.i - i) + Math.abs(p.j - j) < 2);
  const scatter = (kind: Prop['kind'], n: number) => { for (let k = 0, t = 0; k < n && t < n * 30; t++) { const i = 4 + Math.floor(r() * (W - 8)), j = 4 + Math.floor(r() * (H - 8)); if (empty(i, j)) { props.push({ i, j, kind }); k++; } } };
  scatter('tree', def.theme === 'swamp' ? 150 : def.theme === 'ash' ? 70 : 10);
  scatter('pillar', def.theme === 'ash' ? 18 : 4);
  if (def.theme === 'market') {
    for (let k = 0, t = 0; k < 16 && t < 3000; t++) { // 노점은 드문드문 (예전 70은 파라솔 숲이었다)
      const i = 4 + Math.floor(r() * (W - 8)), j = 4 + Math.floor(r() * (H - 8));
      const nearSoi = at(i + 1, j) === TI.soi || at(i - 1, j) === TI.soi || at(i, j + 1) === TI.soi || at(i, j - 1) === TI.soi;
      if (nearSoi && empty(i, j)) { props.push({ i, j, kind: 'cart' }); k++; }
    }
  }
  // 화로·등: 길을 따라 (2층은 도깨비불 장대, 3층은 등롱과 화로가 섞인다)
  for (let j = 4; j < H - 4; j++) for (let i = 4; i < W - 4; i++) {
    if (at(i, j) !== TI.walk && at(i, j) !== TI.soi) continue;
    if ((i * 13 + j * 7) % 23 !== 0) continue;
    const kind: Prop['kind'] = def.theme === 'swamp' ? 'lantern' : def.theme === 'market' && (i + j) % 3 ? 'lantern' : 'lamp';
    for (const [di, dj] of [[1, 0], [0, 1], [-1, 0], [0, -1]]) if (empty(i + di, j + dj)) { props.push({ i: i + di, j: j + dj, kind }); break; }
  }
  // 처절함: 고문 장면 · 가마솥 · 철창 · 꼬챙이 · 해골 더미 · 흩어진 뼈 (길에서 보이는 곳에 먼저)
  const nearRoad = (i: number, j: number, d: number) => { for (let b = -d; b <= d; b++) for (let a = -d; a <= d; a++) { const t = at(i + a, j + b); if (t === TI.walk || t === TI.soi) return true; } return false; };
  const place = (kind: Prop['kind'], n: number, road: number, extra?: (i: number, j: number) => boolean, o?: (k: number) => number, sep = 6) => {
    for (let k = 0, t = 0; k < n && t < n * 120; t++) {
      const i = 6 + Math.floor(r() * (W - 12)), j = 6 + Math.floor(r() * (H - 12));
      if (!empty(i, j) || Math.hypot(i - C.i, j - C.j) < VR + 6 || (road && !nearRoad(i, j, road)) || (extra && !extra(i, j))) continue;
      if (props.some((p) => p.kind === kind && Math.hypot(p.i - i, p.j - j) < sep)) continue; // 한곳에 몰리지 않게
      props.push({ i, j, kind, o: o?.(k) }); k++;
    }
  };
  const T = def.theme;
  place('torture', T === 'market' ? 9 : 8, 3, (i, j) => empty(i + 1, j) && empty(i - 1, j), (k) => k % 3 === 2 ? 1 : 0, 14);
  place('cauldron', T === 'swamp' ? 8 : 6, 4, undefined, undefined, 12);
  place('cage', T === 'market' ? 12 : 9, 4);
  place('stake', T === 'market' ? 26 : T === 'ash' ? 22 : 14, 5);
  place('skulls', T === 'ash' ? 20 : 14, 6);
  // 뼈는 길 위에도 (납작해서 걸어 지나간다)
  for (let k = 0, t = 0; k < (T === 'ash' ? 130 : T === 'market' ? 100 : 70) && t < 6000; t++) {
    const i = 5 + Math.floor(r() * (W - 10)), j = 5 + Math.floor(r() * (H - 10)), tt = at(i, j);
    if ((tt !== TI.lot && tt !== TI.park && tt !== TI.walk && tt !== TI.soi) || Math.hypot(i - C.i, j - C.j) < VR + 3 || props.some((p) => p.i === i && p.j === j)) continue;
    props.push({ i, j, kind: 'bones' }); k++;
  }
  // 경계 장식: 1층 현무암 기둥(틈에 용암) · 2층 안개 낀 바위산 · 3층 가시 성벽과 망루
  for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) {
    const d = edgeD(i, j);
    if (T === 'market') {
      if (d !== EDGE - 1) continue;
      const corner = (i === EDGE - 1 || i === W - EDGE) && (j === EDGE - 1 || j === H - EDGE);
      const alongI = j === EDGE - 1 || j === H - EDGE;
      const tower = corner || (alongI ? i : j) % 12 === 6;
      props.push({ i, j, kind: 'crag', o: tower ? 2 : alongI ? 0 : 1 });
    } else if (d === EDGE - 1 || (d === 1 && (i + j) % 2 === 0)) props.push({ i, j, kind: 'crag' });
  }
  // 괴물이 나오는 자리: 휴식 공간에서 멀리
  const spawns: [number, number][] = [];
  for (let t = 0; spawns.length < 60 && t < 5000; t++) {
    const i = 4 + Math.floor(r() * (W - 8)), j = 4 + Math.floor(r() * (H - 8));
    const tt = at(i, j);
    if ((tt === TI.lot || tt === TI.park || tt === TI.walk || tt === TI.soi) && Math.hypot(i - C.i, j - C.j) > 19 && Math.hypot(i - B.i, j - B.j) > 8) spawns.push([i, j]);
  }
  const z = finalize({
    id: `hell-${floor}`, W, H, tiles, buildings, props, lanes: [], door, spawn: door,
    hell: { floor, rest: { i: C.i, j: C.j, r: VR }, up: U, down: D, boss: B, pashar: floor === 1 ? { i: U.i + 3, j: U.j - 1 } : undefined, spawns },
  });
  cache.set(floor, z);
  return z;
}
