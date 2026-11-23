// 지옥 (2단계): 1~3층. 층마다 새 지도·일반 괴물 3종·층주 1명. 휴식 공간 = 황혼의 우주새.
// 지도는 층 번호로 정해진 씨앗에서 만든다 (모두에게 같은 지도).
import { TYPES, finalize, type Zone, type Building, type Prop, type TileType } from './zone.ts';
import type { Lang } from './i18n.ts';

export const OPEN_FLOORS = 3; // 지금 열린 층 (4~13층은 하나씩 업데이트)

export type Theme = 'ash' | 'swamp' | 'market';
export interface FloorDef { floor: number; theme: Theme; name: Record<Lang, string>; sin: Record<Lang, string>; monsters: string[]; boss: string }
export const FLOORS: FloorDef[] = [
  { floor: 1, theme: 'ash', name: { ko: '재의 문턱', th: 'ธรณีแห่งเถ้าถ่าน', en: 'Threshold of Ash' }, sin: { ko: '경미한 잘못, 책임 회피', th: 'ความผิดเล็กน้อย การหนีความรับผิดชอบ', en: 'Petty wrongs, evading responsibility' }, monsters: ['ashen', 'ember', 'gateyak'], boss: 'ashgal' },
  { floor: 2, theme: 'swamp', name: { ko: '굶주림의 늪', th: 'บึงแห่งความหิวโหย', en: 'Swamp of Hunger' }, sin: { ko: '탐욕', th: 'ความโลภ', en: 'Greed' }, monsters: ['pret', 'bogdead', 'gluttonyak'], boss: 'gurma' },
  { floor: 3, theme: 'market', name: { ko: '피의 시장', th: 'ตลาดเลือด', en: 'Blood Market' }, sin: { ko: '사기, 기만', th: 'การฉ้อโกง การหลอกลวง', en: 'Fraud and deceit' }, monsters: ['haggler', 'bloodpret', 'merchantyak'], boss: 'serane' },
];
export const floorDef = (f: number) => FLOORS[Math.max(1, Math.min(FLOORS.length, f)) - 1];

/** 괴물: 몸(망자·프렛·야크) + 색. 바쳐진 모델이 없으면 실밥 터진 봉합자 몸을 색만 바꿔 쓴다 */
export type MonsterBody = 'ash' | 'pret' | 'yak';
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
  M('gateyak', 'yak', '문지기 야크', 'ยักษ์เฝ้าประตู', 'Gate yak', '#5a6e8a', '#3a2a22', '#e0b437', 520, [14, 22], 0.9, 5, 1.15, 1.12, [10, 18], { weapon: 'club' }),
  M('ashgal', 'yak', '아쉬갈', 'อัชกัล', 'Ashgal', '#8a8580', '#2a2220', '#ff6a1a', 2400, [22, 32], 1.0, 9, 1.0, 1.45, [120, 160], { boss: true, weapon: 'club' }),
  // 2층 굶주림의 늪
  M('pret', 'pret', '프렛', 'เปรต', 'Phi Pret', '#9aa08a', '#4a4232', '#c9d26a', 300, [10, 18], 0.8, 6, 1.0, 1, [5, 11]),
  M('bogdead', 'ash', '늪 망자', 'ผีบึง', 'Bog dead', '#5a6a4a', '#3a3a22', '#8ad06a', 320, [11, 17], 0.9, 6, 1.0, 1, [5, 10]),
  M('gluttonyak', 'yak', '탐식 야크', 'ยักษ์ตะกละ', 'Glutton yak', '#4f7a4a', '#4a3a22', '#e0b437', 640, [16, 25], 0.85, 5, 1.15, 1.15, [12, 22], { weapon: 'club' }),
  M('gurma', 'pret', '구르마', 'กูร์มา', 'Gurma', '#7a8a5a', '#3a3222', '#e8f06a', 3200, [26, 36], 0.85, 9, 1.05, 1.55, [240, 300], { boss: true }),
  // 3층 피의 시장
  M('haggler', 'ash', '흥정꾼 망자', 'ผีพ่อค้าต่อราคา', 'Haggler dead', '#6a5a52', '#8a1a1a', '#f2c84a', 380, [13, 20], 1.1, 6, 0.95, 1, [7, 14]),
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
  // 바깥은 바위 벽
  for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) if (i < 3 || j < 3 || i >= W - 3 || j >= H - 3) set(i, j, 'block');
  const C = { i: 52, j: 56 }; // 휴식 공간
  const U = { i: 18, j: 16 }; // 올라가는 계단 (1층: 출구)
  const B = { i: 27, j: 25 }; // 층주 자리
  const D = { i: 86, j: 88 }; // 내려가는 계단
  const keep = [{ ...C, r: 9 }, { ...B, r: 7 }, { ...U, r: 4 }, { ...D, r: 4 }];
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
  road(C, B); road(B, U); road(C, D);
  disc(C.i, C.j, 7, 'walk'); disc(B.i, B.j, 6, 'walk'); disc(U.i, U.j, 2, 'walk'); disc(D.i, D.j, 2, 'walk');
  // 건물: 폐허·오두막·시장 건물 (휴식 공간에는 황혼의 우주새)
  const buildings: Building[] = [];
  const shop: Building = { i0: C.i - 2, j0: C.j - 8, w: 4, d: 4, h: 44, cat: 'ujusae', sign: 'left', color: '#3a2a2a' };
  buildings.push(shop);
  const door = { i: shop.i0 + 2, j: shop.j0 + shop.d };
  const occupied = (i0: number, j0: number, w: number, d: number) => {
    for (let j = j0 - 1; j <= j0 + d; j++) for (let i = i0 - 1; i <= i0 + w; i++) {
      const t = at(i, j);
      if (t !== TI.lot && t !== TI.park && t !== (def.theme === 'market' ? -2 : -2)) return true;
      if (!free(i, j)) return true;
    }
    return buildings.some((b) => i0 < b.i0 + b.w + 1 && i0 + w + 1 > b.i0 && j0 < b.j0 + b.d + 1 && j0 + d + 1 > b.j0);
  };
  const nB = def.theme === 'market' ? 140 : def.theme === 'ash' ? 55 : 26;
  const colors: Record<Theme, string[]> = { ash: ['#3a3532', '#2e2a28', '#4a423c'], swamp: ['#3a3a2a', '#4a3e2a', '#2e3326'], market: ['#5a2a24', '#6a3a2a', '#4a2a2a', '#3a2622'] };
  for (let n = 0, tries = 0; n < nB && tries < 4000; tries++) {
    const w = 2 + Math.floor(r() * (def.theme === 'market' ? 4 : 3)), d = 2 + Math.floor(r() * (def.theme === 'market' ? 4 : 3));
    const i0 = 4 + Math.floor(r() * (W - 8 - w)), j0 = 4 + Math.floor(r() * (H - 8 - d));
    if (occupied(i0, j0, w, d)) continue;
    const h = def.theme === 'market' ? 30 + Math.floor(r() * 50) : def.theme === 'ash' ? 14 + Math.floor(r() * 40) : 18 + Math.floor(r() * 16);
    buildings.push({ i0, j0, w, d, h, cat: 'generic', color: colors[def.theme][Math.floor(r() * colors[def.theme].length)] });
    n++;
  }
  // 소품: 죽은 나무, 화로(밤 불빛), 부러진 기둥, 시장 좌판
  const props: Prop[] = [];
  const empty = (i: number, j: number) => (at(i, j) === TI.lot || at(i, j) === TI.park) && free(i, j) && !buildings.some((b) => i >= b.i0 - 1 && i <= b.i0 + b.w && j >= b.j0 - 1 && j <= b.j0 + b.d) && !props.some((p) => Math.abs(p.i - i) + Math.abs(p.j - j) < 2);
  const scatter = (kind: Prop['kind'], n: number) => { for (let k = 0, t = 0; k < n && t < n * 30; t++) { const i = 4 + Math.floor(r() * (W - 8)), j = 4 + Math.floor(r() * (H - 8)); if (empty(i, j)) { props.push({ i, j, kind }); k++; } } };
  scatter('tree', def.theme === 'swamp' ? 150 : def.theme === 'ash' ? 70 : 10);
  scatter('pillar', def.theme === 'ash' ? 18 : 4);
  if (def.theme === 'market') {
    for (let k = 0, t = 0; k < 70 && t < 3000; t++) {
      const i = 4 + Math.floor(r() * (W - 8)), j = 4 + Math.floor(r() * (H - 8));
      const nearSoi = at(i + 1, j) === TI.soi || at(i - 1, j) === TI.soi || at(i, j + 1) === TI.soi || at(i, j - 1) === TI.soi;
      if (nearSoi && empty(i, j)) { props.push({ i, j, kind: 'cart' }); k++; }
    }
  }
  // 화로: 길을 따라
  for (let j = 4; j < H - 4; j++) for (let i = 4; i < W - 4; i++) {
    if (at(i, j) !== TI.walk && at(i, j) !== TI.soi) continue;
    if ((i * 13 + j * 7) % 23 !== 0) continue;
    for (const [di, dj] of [[1, 0], [0, 1], [-1, 0], [0, -1]]) if (empty(i + di, j + dj)) { props.push({ i: i + di, j: j + dj, kind: 'lamp' }); break; }
  }
  // 괴물이 나오는 자리: 휴식 공간에서 멀리
  const spawns: [number, number][] = [];
  for (let t = 0; spawns.length < 60 && t < 5000; t++) {
    const i = 4 + Math.floor(r() * (W - 8)), j = 4 + Math.floor(r() * (H - 8));
    const tt = at(i, j);
    if ((tt === TI.lot || tt === TI.park || tt === TI.walk || tt === TI.soi) && Math.hypot(i - C.i, j - C.j) > 14 && Math.hypot(i - B.i, j - B.j) > 8) spawns.push([i, j]);
  }
  const z = finalize({
    id: `hell-${floor}`, W, H, tiles, buildings, props, lanes: [], door, spawn: door,
    hell: { floor, rest: { i: C.i, j: C.j, r: 9 }, up: U, down: D, boss: B, pashar: floor === 1 ? { i: U.i + 3, j: U.j - 1 } : undefined, spawns },
  });
  cache.set(floor, z);
  return z;
}
