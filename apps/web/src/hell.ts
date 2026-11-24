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
 * 한 명 한 명이 그 층의 층주만큼 강하다 (누구든 칠 수 있다). 쓰러뜨려도 보상·카르마·영격은 없다.
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
    hp: 2400, dmg: [22, 32], atk: 1.05, speed: 0.55, special: 'push', // 층주 아쉬갈만큼
  },
  hollowbowl: {
    key: 'hollowbowl', body: 'warden2', weapon: null,
    name: { ko: '빈그릇귀', th: 'ผีชามกลวง', en: 'Hollow Bowl' },
    line: { ko: '굶주림은 핑계가 될 수 없다.', th: 'ความหิวไม่ใช่ข้ออ้าง', en: 'Hunger is no excuse.' },
    look: { ko: '갈비뼈가 휜 배가 텅 빈 그릇처럼 패였다. 한쪽 팔에 진흙으로 빚은 큰 사발을 달았다.', th: 'ท้องที่ซี่โครงโค้งเว้าลึกเหมือนชามเปล่า แขนข้างหนึ่งผูกชามดินเผาใบใหญ่ไว้', en: 'Its rib-curved belly is hollowed like an empty bowl. A large clay bowl is strapped to one arm.' },
    cols: { 1: '#4e6a46', 3: '#2e3a26', 4: '#2e3a26', 10: '#a8b890', 13: '#8a6a4a', 12: '#c8f08a', 15: '#141a10', 6: '#c8f08a' },
    hp: 3200, dmg: [26, 36], atk: 1.15, speed: 0.5, special: 'mud', // 층주 구르마만큼
  },
  waxseal: {
    key: 'waxseal', body: 'warden3', weapon: 'sealstaff',
    name: { ko: '봉랍귀', th: 'ผีตราครั่ง', en: 'Waxseal' },
    line: { ko: '서명은 자유다. 칼은 아니다.', th: 'จะลงนามก็ได้ตามใจ แต่ไม่ใช่มีด', en: 'Signing is free. The blade is not.' },
    look: { ko: '붉은 봉랍처럼 굳은 얼굴, 검은 상인복, 붉은 밀랍 인장이 달린 긴 지팡이.', th: 'ใบหน้าแข็งเหมือนครั่งแดง ชุดพ่อค้าสีดำ ไม้เท้ายาวติดตราครั่งสีแดง', en: 'A face hardened like red sealing wax, a black merchant coat, and a long staff topped with a red wax seal.' },
    cols: { 1: '#a8281e', 3: '#1e1818', 4: '#141010', 14: '#c9a23e', 13: '#3a2418', 12: '#c8281e', 6: '#ffd08a', 15: '#0e0a0a', 10: '#a8281e' },
    hp: 4200, dmg: [30, 42], atk: 1.0, speed: 0.6, special: 'seal', // 층주 세라네만큼
  },
};

/** 괴물: 몸(망자·프렛·야크·해골) + 색. 일반 괴물은 모두 무기를 든다 (망자 곡괭이·낙인 쇠·쇠갈고리 장대·고기 칼, 프렛 국자·꼬챙이, 해골 넓적다리뼈·빚 갈고리, 야크 몽둥이). 거대한 층주 구르마는 맨손 */
export type MonsterBody = 'ash' | 'pret' | 'yak' | 'bones' | 'serane';
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
  M('ashen', 'ash', '잿빛 망자', 'ผีเถ้า', 'Ashen dead', '#6e6a66', '#3a3430', '#d9632a', 260, [8, 14], 1.0, 6, 1.0, 1, [3, 8], { weapon: 'pickaxe' }),
  M('ember', 'ash', '불씨 망자', 'ผีถ่านไฟ', 'Ember dead', '#4a403a', '#2a2220', '#ffb02a', 210, [10, 16], 1.5, 7, 0.8, 1, [4, 9], { weapon: 'brand' }),
  M('bonewalker', 'bones', '걷는 해골', 'โครงกระดูกเดินได้', 'Walking bones', '#d8cfb8', '#3a3026', '#ff6a2a', 230, [9, 15], 1.2, 7, 0.9, 1, [4, 9], { weapon: 'femur' }),
  M('gateyak', 'yak', '문지기 야크', 'ยักษ์เฝ้าประตู', 'Gate yak', '#5a6e8a', '#3a2a22', '#e0b437', 520, [14, 22], 0.9, 5, 1.15, 1.12, [10, 18], { weapon: 'club' }),
  M('ashgal', 'yak', '아쉬갈', 'อัชกัล', 'Ashgal', '#8a8580', '#2a2220', '#ff6a1a', 2400, [22, 32], 1.0, 9, 1.0, 1.45, [120, 160], { boss: true, weapon: 'club' }),
  // 2층 굶주림의 늪
  M('pret', 'pret', '프렛', 'เปรต', 'Phi Pret', '#9aa08a', '#4a4232', '#c9d26a', 300, [10, 18], 0.8, 6, 1.0, 1, [5, 11], { weapon: 'ladle' }),
  M('bogdead', 'ash', '늪 망자', 'ผีบึง', 'Bog dead', '#5a6a4a', '#3a3a22', '#8ad06a', 320, [11, 17], 0.9, 6, 1.0, 1, [5, 10], { weapon: 'boathook' }),
  M('gluttonyak', 'yak', '탐식 야크', 'ยักษ์ตะกละ', 'Glutton yak', '#4f7a4a', '#4a3a22', '#e0b437', 640, [16, 25], 0.85, 5, 1.15, 1.15, [12, 22], { weapon: 'club' }),
  M('gurma', 'pret', '구르마', 'กูร์มา', 'Gurma', '#7a8a5a', '#3a3222', '#e8f06a', 3200, [26, 36], 0.85, 9, 1.05, 1.55, [240, 300], { boss: true }),
  // 3층 피의 시장
  M('haggler', 'ash', '흥정꾼 망자', 'ผีพ่อค้าต่อราคา', 'Haggler dead', '#6a5a52', '#8a1a1a', '#f2c84a', 380, [13, 20], 1.1, 6, 0.95, 1, [7, 14], { weapon: 'cleaver' }),
  M('debtbones', 'bones', '빚진 해골', 'โครงกระดูกติดหนี้', 'Indebted bones', '#c9b89a', '#5a1a1a', '#f2c84a', 360, [13, 21], 1.2, 7, 0.9, 1, [7, 13], { weapon: 'hook' }),
  M('bloodpret', 'pret', '피 프렛', 'เปรตเลือด', 'Blood pret', '#a06a62', '#5a1a1a', '#ff4a3a', 420, [14, 22], 0.9, 6, 1.0, 1.05, [8, 15], { weapon: 'skewer' }),
  M('merchantyak', 'yak', '장사치 야크', 'ยักษ์พ่อค้า', 'Merchant yak', '#a0302a', '#2a1a12', '#f2c84a', 800, [19, 29], 0.9, 5, 1.1, 1.15, [15, 26], { weapon: 'club' }),
  // 세라네: 피의 시장 끝 나루터 앞에 도사린 거대한 살덩이 애벌레. 세로로 찢어진 아가리에 이빨이 세 겹 (맨손 = 발톱 팔)
  M('serane', 'serane', '세라네', 'เซราเน', 'Serane', '#5e1a20', '#360a0e', '#e0281e', 4200, [30, 42], 0.8, 6, 1.0, 1.85, [380, 460], { boss: true, weapon: null }),
].map((m) => [m.key, m]));

// ───────────────────────── 지도 ─────────────────────────
const TI = Object.fromEntries(TYPES.map((t, k) => [t, k])) as Record<TileType, number>;
function rng(seed: number) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

/** 2층 여울이 구불거리는 정도 (북쪽 끝 몇 칸은 곧게: 끝에 닿기 쉽게) */
export const fordWob = (j: number) => (j < 7 ? 0 : Math.round(Math.sin(j * 0.45) * 1.2));
const hash2 = (a: number, b: number) => { let h = (a * 374761393 + b * 668265263) | 0; h = (h ^ (h >>> 13)) * 1274126177; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
const cache = new Map<number, Zone>();
/** 위층 통행세와 속죄의 회당 목표 (노전). 층주를 피해 지나가는 값은 아주 비싸다 */
export const TOLL: Record<number, number> = { 1: 10000, 2: 20000, 3: 30000 };
export const ATONE_GOAL: Record<number, number> = { 1: 11000, 2: 21000, 3: 31000 };
/** 2층 층주 구르마가 배불러 잠드는 먹이 수 */
export const GURMA_FULL = 100;

/**
 * 층 지도. 층마다 모양이 다르다:
 * · 마을: 1층 둥근 성벽(반지름 15, 가장 크고 반듯) → 2층 늪 위 널빤지 섬(11) → 3층 비좁은 네모(8). 깊을수록 좁고 지저분하다.
 *   마을 안: 유황새 · 지옥 은행 · 속죄의 회당 · 초가집 한 채 · 고깃간과 잡동사니 좌판 · 앉거나 누운 영혼들 (3층은 베스크 대부소)
 * · 위층 길은 맵 북쪽 끝: 1층 = 불탄 도시의 골목 끝 환생 로비 · 2층 = 늪을 걸어 건너는 여울 · 3층 = 나루터. 층주가 그 앞을 지킨다
 * · 아래층 계단은 맵 남쪽 끝에서 아래로 내려간다 (아래층에서 올라오면 여기로 나온다)
 */
export function hellZone(floor: number): Zone {
  const hit = cache.get(floor);
  if (hit) return hit;
  const def = floorDef(floor);
  const T = def.theme;
  const r = rng(floor * 7919 + 13);
  // 층 넓이: 1층(재의 문턱)은 1.6배로 넓다 — 층을 늘리기보다 한 층을 넓게 먼저. 개수는 넓이에 맞춰 늘린다
  const S = floor === 1 ? 1.6 : 1, A = S * S;
  const W = Math.round(104 * S), H = W;
  const at2 = (i: number, j: number) => ({ i: Math.round(i * S), j: Math.round(j * S) });
  const tiles = new Uint8Array(W * H).fill(TI.lot);
  const at = (i: number, j: number) => (i < 0 || j < 0 || i >= W || j >= H ? -1 : tiles[j * W + i]);
  const set = (i: number, j: number, t: TileType) => { if (i >= 0 && j >= 0 && i < W && j < H) tiles[j * W + i] = TI[t]; };
  const disc = (ci: number, cj: number, rad: number, t: TileType) => { for (let j = cj - rad; j <= cj + rad; j++) for (let i = ci - rad; i <= ci + rad; i++) if ((i - ci) ** 2 + (j - cj) ** 2 <= rad * rad + 1) set(i, j, t); };
  // 바깥: 지나갈 수 없는 경계 (네 칸 바위 + 층마다 다른 해자: 1층 용암 두 칸 · 2층 늪 두 칸)
  // 3층(피의 시장)은 바깥이 벽이 아니라 끝없는 피의 용암 바다 (경계 여덟 칸이 모두 피의 용암)
  const SEA = T === 'market';
  const EDGE = SEA ? 0 : 4, MOAT = SEA ? 8 : 2;
  const edgeD = (i: number, j: number) => Math.min(i, j, W - 1 - i, H - 1 - j);
  const CITY = T === 'ash' ? 14 : 0; // 1층 북쪽 끝: 해자 대신 불탄 도시가 늘어선 띠
  const border = () => { for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) { const d = edgeD(i, j); if (d < EDGE) set(i, j, 'block'); else if (d < EDGE + MOAT + (SEA ? Math.floor(hash2(i, j) * 2) : 0) && !(CITY && j < CITY && j >= EDGE && i >= EDGE && i < W - EDGE)) set(i, j, 'water'); } };
  border();
  // 자리: 마을 C · 위층 길 U(이 칸에 닿으면 올라간다) · 층주 B · 아래층 계단 D(남쪽 끝 계단 머리)
  const VR = T === 'ash' ? 15 : T === 'swamp' ? 11 : 8;
  const shape: 'round' | 'blob' | 'square' = T === 'ash' ? 'round' : T === 'swamp' ? 'blob' : 'square';
  const C = T === 'ash' ? { i: 84, j: 100 } : T === 'swamp' ? { i: 58, j: 62 } : { i: 54, j: 60 };
  const exit: 'alley' | 'ford' | 'ferry' = T === 'ash' ? 'alley' : T === 'swamp' ? 'ford' : 'ferry';
  const U = T === 'ash' ? { i: 64, j: 8 } : T === 'swamp' ? { i: 40, j: 2 } : { i: 61, j: 10 };
  const B = T === 'ash' ? { i: 65, j: 26 } : T === 'swamp' ? { i: 40, j: 23 } : { i: 47, j: 19 };
  const D = { i: Math.round(W * 0.68), j: H - EDGE - (SEA ? 9 : 4) };
  const posts: [number, number][] = T === 'ash' ? [[62, 16], [67, 16]] : T === 'swamp' ? [[38, 15], [43, 15]] : [[U.i - 1, U.j], [U.i + 2, U.j]];
  // 2층(굶주림의 늪): 마을과 내려가는 계단 사이 들판의 노름꾼 탈루스 자리
  const TL = T === 'swamp' ? { i: 76, j: 76 } : null;
  const keep = [{ ...C, r: VR + 5 }, { ...B, r: 7 }, { ...U, r: 5 }, { ...D, r: 5 }, ...(TL ? [{ ...TL, r: 5 }] : [])];
  const free = (i: number, j: number, m = 0) => keep.every((k) => Math.hypot(i - k.i, j - k.j) > k.r + m) && !(CITY && j < CITY + 4);
  // 지형
  if (T === 'ash') {
    // 용암 강 둘: 왼쪽에서 오른쪽으로 구불구불
    for (const sj of [40, 74].map((v) => Math.round(v * S))) {
      let j = sj + Math.floor(r() * 6) - 3;
      for (let i = 3; i < W - 3; i++) {
        j += Math.floor(r() * 3) - 1; j = Math.max(CITY + 6, Math.min(H - 9, j));
        const wid = 2 + (r() < 0.3 ? 1 : 0);
        for (let k = 0; k < wid; k++) if (free(i, j + k, 1)) set(i, j + k, 'water');
      }
    }
    for (let n = 0; n < 160 * A; n++) { const i = 4 + Math.floor(r() * (W - 8)), j = 4 + Math.floor(r() * (H - 8)); if (at(i, j) === TI.lot && free(i, j)) set(i, j, 'park'); }
  } else if (T === 'swamp') {
    for (let n = 0; n < 34; n++) {
      const i = 8 + Math.floor(r() * (W - 16)), j = 8 + Math.floor(r() * (H - 16)), rad = 2 + Math.floor(r() * 4);
      if (!free(i, j, rad + 1)) continue;
      disc(i, j, rad, 'water');
    }
    for (let n = 0; n < 500; n++) { const i = 4 + Math.floor(r() * (W - 8)), j = 4 + Math.floor(r() * (H - 8)); if (at(i, j) === TI.lot && free(i, j)) set(i, j, 'park'); }
  } else {
    // 피의 시장: 11칸마다 골목, 몇몇 골목 가운데에 핏물 도랑
    for (let i = 6; i < W - 4; i += 11) for (let j = 4; j < H - 4; j++) { set(i, j, 'soi'); set(i + 1, j, 'soi'); }
    for (let j = 6; j < H - 4; j += 11) for (let i = 4; i < W - 4; i++) { set(i, j, 'soi'); set(i, j + 1, 'soi'); }
    for (let i = 4; i < W - 4; i++) if (i % 5 !== 0 && free(i, 40, 1)) set(i, 40, 'water');
    for (let j = 4; j < H - 4; j++) if (j % 5 !== 0 && free(62, j, 1)) set(62, j, 'water');
    // 피의 강: 시장 서쪽 도랑에서 시작해 층주의 자리 뒤(서쪽)를 돌아 북쪽 바다로 흘러 나간다
    { const pts: [number, number][] = [[26, 40], [30, 32], [34, 26], [38, 20], [40, 12], [41, 2]];
      for (let k = 0; k < pts.length - 1; k++) {
        const [a0, b0] = pts[k], [a1, b1] = pts[k + 1], n = Math.max(Math.abs(a1 - a0), Math.abs(b1 - b0)) * 2;
        for (let s2 = 0; s2 <= n; s2++) {
          const ci = a0 + ((a1 - a0) * s2) / n + Math.sin(s2 * 0.7 + k) * 0.6, cj = b0 + ((b1 - b0) * s2) / n;
          const wid = 1.6 + (cj < 16 ? 0.8 : 0);
          for (let dj = -2; dj <= 2; dj++) for (let di = -2; di <= 2; di++) if (Math.hypot(di, dj) <= wid) { const ii = Math.round(ci + di), jj = Math.round(cj + dj); if (Math.hypot(ii - B.i, jj - B.j) > 6 && Math.hypot(ii - U.i, jj - U.j) > 3) set(ii, jj, 'water'); }
        }
      }
    }
  }
  // 들판의 웅덩이: 1층 용암 · 3층 핏물 (늪은 이미 물웅덩이가 많다)
  if (T !== 'swamp') for (let n = 0, t = 0; n < (T === 'ash' ? 16 : 12) * A && t < 800; t++) {
    const i = 8 + Math.floor(r() * (W - 16)), j = 8 + Math.floor(r() * (H - 16)), rad = 1 + Math.floor(r() * 2);
    if (!free(i, j, rad + 3)) continue;
    disc(i, j, rad, 'water'); n++;
  }
  border(); // 강·늪이 경계를 덮지 않게 다시
  // 2층 위층 길: 북쪽 끝까지 늪을 걸어 건너는 여울 (징검돌과 널빤지, 둘레는 깊은 늪과 갈대)
  if (T === 'swamp') {
    for (let j = 0; j <= B.j + 2; j++) {
      const wob = fordWob(j);
      for (let di = -4; di <= 5; di++) { const i = U.i + wob + di; if (Math.abs(di - 0.5) > 1.5 && j < B.j - 4) set(i, j, j < EDGE ? 'block' : 'water'); }
      for (const di of [0, 1]) set(U.i + wob + di, j, j < B.j - 4 ? 'cross' : 'walk');
    }
    disc(B.i, B.j, 4, 'walk'); // 구르마가 누운 진흙 웅덩이 둘레
  }
  // 1층 위층 길: 북쪽 불탄 도시 사이로 난 골목 (끝에 환생 로비)
  if (T === 'ash') for (let j = EDGE; j < CITY + 6; j++) for (const di of [-2, -1, 0, 1, 2]) set(U.i + di, j, Math.abs(di) < 1.5 ? 'soi' : 'walk');
  // 아래층 계단: 남쪽 끝(맵 가장자리)까지 이어지는 넓은 돌계단 (3층은 피의 바다 위 둑길)
  for (let j = D.j - 1; j < H; j++) for (let di = -2; di <= 2; di++) set(D.i + di, j, Math.abs(di) <= 1 ? 'walk' : j > D.j + 1 ? 'block' : 'walk');
  // 길: 마을 문 ↔ 층주 ↔ 위층 길, 마을 문 ↔ 아래층 계단 (물 위는 다리)
  const road = (a: { i: number; j: number }, b: { i: number; j: number }) => {
    const mid = { i: Math.round((a.i + b.i) / 2 + (r() - 0.5) * 10), j: Math.round((a.j + b.j) / 2 + (r() - 0.5) * 10) };
    for (const [p, q] of [[a, mid], [mid, b]] as const) {
      const n = Math.max(Math.abs(q.i - p.i), Math.abs(q.j - p.j));
      for (let k = 0; k <= n; k++) {
        const i = Math.round(p.i + ((q.i - p.i) * k) / n), j = Math.round(p.j + ((q.j - p.j) * k) / n);
        for (const [di, dj] of [[0, 0], [1, 0], [0, 1], [1, 1]]) {
          const t = at(i + di, j + dj);
          if (t === TI.block) continue;
          set(i + di, j + dj, t === TI.water || t === TI.cross ? 'cross' : 'walk');
        }
      }
    }
  };
  // 마을 문 넷 (울타리 바로 바깥까지 길을 낸다)
  const gates = [{ i: C.i, j: C.j - VR - 1 }, { i: C.i - VR - 1, j: C.j }, { i: C.i + VR + 1, j: C.j }, { i: C.i, j: C.j + VR + 1 }];
  const gateFor = (t: { i: number; j: number }) => gates.reduce((a, g) => (Math.hypot(g.i - t.i, g.j - t.j) < Math.hypot(a.i - t.i, a.j - t.j) ? g : a));
  const approach = T === 'ash' ? { i: U.i, j: CITY + 5 } : T === 'swamp' ? { i: B.i, j: B.j + 3 } : U;
  road(gateFor(B), B); road(B, approach); road(gateFor(D), { i: D.i, j: D.j - 1 });
  disc(B.i, B.j, 6, 'walk'); disc(D.i, D.j - 2, 2, 'walk');
  if (T === 'market') for (let j = 3; j < U.j; j++) set(U.i, j, j < U.j - 1 ? 'cross' : 'walk'); // 나루터 부두 (널빤지)

  // ── 마을 ──
  const inV = (i: number, j: number, m = 0) => {
    const di = i - C.i, dj = j - C.j;
    if (shape === 'square') return Math.max(Math.abs(di), Math.abs(dj)) <= VR - m;
    if (shape === 'round') return Math.hypot(di, dj) <= VR - m + 0.3;
    const a = Math.atan2(dj, di), rr = VR * (0.86 + 0.16 * Math.sin(a * 3 + 1.3) + 0.08 * Math.sin(a * 5 + 0.4));
    return Math.hypot(di, dj) <= rr - m;
  };
  // 둘레: 2층 섬은 바깥 두 칸이 늪물 (문 앞만 널다리)
  if (shape === 'blob') for (let j = C.j - VR - 4; j <= C.j + VR + 4; j++) for (let i = C.i - VR - 4; i <= C.i + VR + 4; i++) if (!inV(i, j, -1) && inV(i, j, -3)) set(i, j, 'water');
  for (const g of gates) for (let k = -3; k <= 3; k++) {
    const i = g.i === C.i ? g.i : g.i + (g.i < C.i ? -k : k), j = g.i === C.i ? g.j + (g.j < C.j ? -k : k) : g.j;
    for (const o of [0, 1]) { const ii = g.i === C.i ? i + o : i, jj = g.i === C.i ? j : j + o; if (!inV(ii, jj)) set(ii, jj, at(ii, jj) === TI.water ? 'cross' : 'walk'); }
  }
  // 마을 안 바닥: 1층 재 위의 돌 광장 · 2층 늪 위 널빤지 · 3층 붉은 타일 광장과 자갈길
  for (let j = C.j - VR - 3; j <= C.j + VR + 3; j++) for (let i = C.i - VR - 3; i <= C.i + VR + 3; i++) {
    if (!inV(i, j, 1)) continue;
    const plaza = Math.hypot(i - C.i, j - C.j) < VR * 0.38 || (i - C.i) * (j - C.j) === 0;
    set(i, j, T === 'swamp' ? 'walk' : T === 'market' ? (plaza ? 'walk' : 'soi') : plaza ? 'walk' : 'lot');
  }
  const buildings: Building[] = [];
  const BL = (di: number, dj: number, w: number, d: number, h: number, cat: Building['cat'], hk?: HellBuildKind, sign?: 'left' | 'right') => {
    const b: Building = { i0: C.i + di, j0: C.j + dj, w, d, h, cat, sign, color: '#3a2a2a', hk };
    buildings.push(b);
    return b;
  };
  // 층마다 다른 배치 (깊을수록 비좁고 가게가 줄어든다)
  type Slot = [number, number, number, number, number, Building['cat'], HellBuildKind?, ('left' | 'right')?];
  const LAYOUT: Record<Theme, Slot[]> = {
    ash: [[-1, -10, 2, 2, 58, 'ujusae', undefined, 'left'], [6, -9, 2, 2, 52, 'hbank', undefined, 'left'], [-10, -7, 3, 3, 64, 'atone', undefined, 'left'], [-12, 4, 3, 2, 30, 'generic', 'thatch'],
      [5, 5, 2, 1, 30, 'generic', 'butcher'], [8, 4, 2, 1, 30, 'generic', 'butcher'], [-6, 8, 2, 1, 26, 'generic', 'stall'], [-2, 9, 2, 1, 26, 'generic', 'stall'], [9, -2, 1, 2, 26, 'generic', 'stall'], [2, 9, 2, 1, 26, 'generic', 'stall']],
    swamp: [[-1, -7, 2, 2, 58, 'ujusae', undefined, 'left'], [4, -7, 2, 2, 50, 'hbank', undefined, 'left'], [-8, -5, 3, 2, 56, 'atone', undefined, 'left'], [-8, 3, 2, 2, 28, 'generic', 'thatch'],
      [3, 4, 2, 1, 28, 'generic', 'butcher'], [-4, 6, 2, 1, 24, 'generic', 'stall'], [6, 0, 1, 2, 24, 'generic', 'stall']],
    market: [[-1, -6, 2, 2, 58, 'ujusae', undefined, 'left'], [3, -6, 3, 2, 62, 'loan', undefined, 'left'], [-7, -6, 2, 2, 48, 'hbank', undefined, 'left'], [-7, 1, 2, 2, 46, 'atone', undefined, 'left'],
      [3, 3, 2, 1, 26, 'generic', 'butcher'], [-3, 5, 2, 1, 22, 'generic', 'stall'], [5, -1, 1, 2, 22, 'generic', 'stall'], [-3, -2, 2, 2, 26, 'generic', 'thatch']],
  };
  let shop: Building | null = null;
  for (const [di, dj, w, d, h, cat, hk, sign] of LAYOUT[T]) {
    const b = BL(di, dj, w, d, h, cat, hk, sign);
    if (cat === 'ujusae') shop = b;
  }
  const door = { i: shop!.i0 + 1, j: shop!.j0 + shop!.d };
  // 장사꾼은 좌판 앞(마을 쪽)에 선다
  const vendors: { i: number; j: number; kind: 'butcher' | 'junk' }[] = [];
  for (const b of buildings) if (b.hk === 'butcher' || b.hk === 'stall') vendors.push({ i: b.w >= b.d ? b.i0 + 1 : b.i0 - 1, j: b.w >= b.d ? b.j0 - 1 : b.j0 + 1, kind: b.hk === 'butcher' ? 'butcher' : 'junk' });
  // 1층 북쪽: 불탄 도시 — 그을린 건물 껍데기가 늘어선 띠, 가운데 골목 끝에 환생 로비 (멀쩡한 현대식 문, 흰 빛)
  if (T === 'ash') {
    buildings.push({ i0: U.i - 2, j0: EDGE, w: 5, d: 3, h: 96, cat: 'rebirth', sign: 'left', color: '#2a2a2e' });
    // 골목 양옆: 그을린 건물 껍데기가 바짝 붙어 좁은 골목을 만든다
    buildings.push({ i0: U.i - 6, j0: EDGE + 3, w: 4, d: CITY + 3 - EDGE - 3, h: 88, cat: 'generic', color: '#1e1a18', hk: 'burnt' });
    buildings.push({ i0: U.i + 3, j0: EDGE + 3, w: 4, d: CITY + 3 - EDGE - 3, h: 104, cat: 'generic', color: '#1e1a18', hk: 'burnt' });
    for (let i = EDGE + 1; i < W - EDGE - 1;) {
      const w = 3 + Math.floor(r() * 4), d = 4 + Math.floor(r() * 5);
      if (i + w > U.i - 6 && i < U.i + 7) { i = U.i + 7; continue; }
      if (i + w > W - EDGE - 1) break;
      buildings.push({ i0: i, j0: EDGE + Math.floor(r() * 2), w, d: Math.min(d, CITY - EDGE - 1), h: 54 + Math.floor(r() * 70), cat: 'generic', color: '#1e1a18', hk: 'burnt' });
      i += w + (r() < 0.35 ? 1 : 0);
    }
  }
  for (const b of buildings) for (let j = b.j0; j < b.j0 + b.d; j++) for (let i = b.i0; i < b.i0 + b.w; i++) set(i, j, 'block');
  const occupied = (i0: number, j0: number, w: number, d: number) => {
    for (let j = j0 - 1; j <= j0 + d; j++) for (let i = i0 - 1; i <= i0 + w; i++) {
      const t = at(i, j);
      if (t !== TI.lot && t !== TI.park) return true;
      if (!free(i, j)) return true;
    }
    return buildings.some((b) => i0 < b.i0 + b.w + 1 && i0 + w + 1 > b.i0 && j0 < b.j0 + b.d + 1 && j0 + d + 1 > b.j0);
  };
  // 마을 밖: 감옥·뼈집은 몇 채만, 대신 대형 짐승 시체·뼈 무더기·내장 더미와 지옥의 나무·바위·땅의 자국
  const mixes: Record<Theme, [HellBuildKind, number][]> = {
    ash: [['prison', 2], ['bonehouse', 2], ['carcass', 4], ['bonepile', 4], ['guts', 2], ['burnt', 3]],
    swamp: [['bonehouse', 1], ['carcass', 3], ['bonepile', 3], ['guts', 3]],
    market: [['bonehouse', 4], ['prison', 3], ['carcass', 3], ['bonepile', 3], ['guts', 2]],
  };
  const sizeOf = (k: HellBuildKind): [number, number, number] => {
    const a = r() < 0.5;
    if (k === 'carcass') return a ? [4, 2, 50 + Math.floor(r() * 14)] : [2, 4, 50 + Math.floor(r() * 14)];
    if (k === 'bonepile') return r() < 0.3 ? [3, 3, 40] : [2, 2, 28 + Math.floor(r() * 8)];
    if (k === 'guts') return r() < 0.3 ? [3, 3, 22] : [2, 2, 16 + Math.floor(r() * 6)];
    if (k === 'prison') return [2 + Math.floor(r() * 3), 2 + Math.floor(r() * 2), 38 + Math.floor(r() * 10)];
    if (k === 'burnt') return [3 + Math.floor(r() * 2), 3 + Math.floor(r() * 2), 40 + Math.floor(r() * 30)];
    if (k === 'bonehouse') return [2 + Math.floor(r() * 2), 2 + Math.floor(r() * 2), 26 + Math.floor(r() * 8)];
    return [2 + Math.floor(r() * 2), 2 + Math.floor(r() * 2), 28 + Math.floor(r() * 6)];
  };
  for (const [kind, n00] of mixes[T]) {
    const n0 = kind === 'guts' ? n00 : Math.round(n00 * S); // 넓은 층은 조금 더 (내장 더미는 그대로)
    for (let n = 0, tries = 0; n < n0 && tries < 900; tries++) {
      const [w, d, h] = sizeOf(kind);
      const i0 = 6 + Math.floor(r() * (W - 12 - w)), j0 = 6 + Math.floor(r() * (H - 12 - d));
      if (occupied(i0, j0, w, d)) continue;
      buildings.push({ i0, j0, w, d, h, cat: 'generic', color: '#3a2a2a', hk: kind });
      for (let j = j0; j < j0 + d; j++) for (let i = i0; i < i0 + w; i++) set(i, j, 'block');
      n++;
    }
  }
  // 소품
  const props: Prop[] = [];
  // 마을 울타리: 둘레 칸에 (문 자리는 비운다). 방향 = 둘레의 결
  const ring: [number, number][] = [];
  for (let j = C.j - VR - 2; j <= C.j + VR + 2; j++) for (let i = C.i - VR - 2; i <= C.i + VR + 2; i++) {
    if (inV(i, j) && !inV(i, j, 1)) continue;
    if (!inV(i, j)) continue;
  }
  for (let j = C.j - VR - 2; j <= C.j + VR + 2; j++) for (let i = C.i - VR - 2; i <= C.i + VR + 2; i++) {
    if (!inV(i, j)) continue;
    const edge = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([a, b]) => !inV(i + a, j + b));
    if (edge) ring.push([i, j]);
  }
  for (const [i, j] of ring) {
    if (gates.some((g) => (g.i === C.i ? Math.abs(i - g.i - 0.5) <= 1.5 && Math.abs(j - g.j) <= 3 : Math.abs(j - g.j - 0.5) <= 1.5 && Math.abs(i - g.i) <= 3))) { set(i, j, 'walk'); continue; }
    if (buildings.some((b) => i >= b.i0 && i < b.i0 + b.w && j >= b.j0 && j < b.j0 + b.d)) continue;
    const oi = !inV(i + 1, j) || !inV(i - 1, j), oj = !inV(i, j + 1) || !inV(i, j - 1);
    props.push({ i, j, kind: 'fence', o: oi && oj ? 2 : oi ? 1 : 0 });
  }
  // 마을 불빛: 1층 광장 모닥불 · 2층 도깨비불 장대 · 3층 붉은 등롱
  const vLight: Prop['kind'] = T === 'ash' ? 'lamp' : 'lantern';
  props.push({ i: C.i + 2, j: C.j + 1, kind: T === 'ash' ? 'bonfire' : 'lantern' });
  for (const g of gates) props.push(g.i === C.i ? { i: g.i + 2, j: g.j + (g.j < C.j ? 2 : -2), kind: vLight } : { i: g.i + (g.i < C.i ? 2 : -2), j: g.j + 2, kind: vLight });
  const taken = (i: number, j: number) => buildings.some((b) => i >= b.i0 - 1 && i <= b.i0 + b.w && j >= b.j0 - 1 && j <= b.j0 + b.d) || props.some((p) => Math.abs(p.i - i) + Math.abs(p.j - j) < 2) || vendors.some((v) => v.i === i && v.j === j);
  // 지저분한 시장: 마을 안 곳곳에 쓰레기·궤짝·자루 더미 (깊을수록 더)
  const vin: [number, number][] = [];
  for (let j = C.j - VR; j <= C.j + VR; j++) for (let i = C.i - VR; i <= C.i + VR; i++) if (inV(i, j, 2) && !taken(i, j) && Math.abs(i - door.i) + Math.abs(j - door.j) > 2 && (i - C.i) * (j - C.j) !== 0) vin.push([i, j]);
  const pickV = () => vin.splice(Math.floor(r() * vin.length), 1)[0];
  for (let k = 0; k < (T === 'ash' ? 7 : T === 'swamp' ? 8 : 9) && vin.length; k++) { const [i, j] = pickV(); if (!taken(i, j)) props.push({ i, j, kind: 'junk' }); }
  if (T === 'market') for (const [di, dj] of [[3, 3], [-4, 2]]) props.push({ i: C.i + di, j: C.j + dj, kind: 'skulls' }); // 광장의 해골 더미 (촛불)
  // 앉거나 누운 영혼들: 모닥불 둘레와 좌판 앞, 담 밑 (1층 많이 · 깊을수록 지쳐 누운 이가 많다)
  const souls: { i: number; j: number; pose: 'sit' | 'lie' | 'stand'; d: number }[] = [];
  const nSoul = T === 'ash' ? 16 : T === 'swamp' ? 12 : 9;
  for (let k = 0, t = 0; souls.length < nSoul && t < 400; t++) {
    const near = k++ % 3 === 0;
    const a = r() * Math.PI * 2, rr = near ? 2.2 + r() * 1.5 : 3 + r() * (VR - 4);
    const i = Math.round(C.i + 2 + Math.cos(a) * rr), j = Math.round(C.j + 1 + Math.sin(a) * rr);
    if (!inV(i, j, 1) || taken(i, j) || souls.some((s2) => Math.abs(s2.i - i) + Math.abs(s2.j - j) < 2) || (i === door.i && Math.abs(j - door.j) < 3)) continue;
    const roll = r();
    const pose = roll < (T === 'ash' ? 0.5 : 0.35) ? 'sit' : roll < (T === 'ash' ? 0.75 : 0.75) ? 'lie' : 'stand';
    souls.push({ i, j, pose, d: Math.floor(r() * 4) });
  }
  const empty = (i: number, j: number) => (at(i, j) === TI.lot || at(i, j) === TI.park) && free(i, j) && !buildings.some((b) => i >= b.i0 - 1 && i <= b.i0 + b.w && j >= b.j0 - 1 && j <= b.j0 + b.d) && !props.some((p) => Math.abs(p.i - i) + Math.abs(p.j - j) < 2);
  const scatter = (kind: Prop['kind'], n: number) => { for (let k = 0, t = 0; k < n && t < n * 30; t++) { const i = 4 + Math.floor(r() * (W - 8)), j = 4 + Math.floor(r() * (H - 8)); if (empty(i, j)) { props.push({ i, j, kind }); k++; } } };
  const scatterO = (kind: Prop['kind'], n: number, o: (k: number) => number, sep = 0) => {
    for (let k = 0, t = 0; k < n && t < n * 40; t++) {
      const i = 5 + Math.floor(r() * (W - 10)), j = 5 + Math.floor(r() * (H - 10));
      if (!empty(i, j) || (sep && props.some((q) => q.kind === kind && Math.hypot(q.i - i, q.j - j) < sep))) continue;
      props.push({ i, j, kind, o: o(k) }); k++;
    }
  };
  // 지옥의 나무: 1층 숯 나무·뼈나무 · 2층 부푼 썩은 나무·손 덤불 · 3층 가시 나무·피 묻은 뼈나무
  scatterO('htree', Math.round((T === 'swamp' ? 70 : T === 'ash' ? 56 : 58) * A), (k) => (k % 10 < (T === 'swamp' ? 6 : 7) ? 0 : 1), 3);
  scatter('tree', Math.round((T === 'swamp' ? 60 : T === 'ash' ? 26 : 6) * A)); // 잎 없는 검은 나무 (예전 것)
  scatterO('rock', Math.round((T === 'ash' ? 60 : T === 'swamp' ? 36 : 46) * A), () => 0, 3);
  scatterO('crack', Math.round((T === 'ash' ? 60 : T === 'market' ? 56 : 40) * A), () => 0, 4);
  if (T === 'ash') scatter('pillar', 5); // 무너진 돌기둥 몇 개만
  // 2층 여울 둘레의 갈대
  if (T === 'swamp') for (let j = 4; j < B.j - 3; j += 1) for (const di of [-3, 4]) { const i = U.i + fordWob(j) + di; if (at(i, j) === TI.water && (i + j) % 2 === 0) props.push({ i, j, kind: 'reeds' }); }
  // 탈루스의 자리: 진흙을 다진 작은 터, 주사위 판(나무 상자)과 작은 모닥불
  if (TL) {
    for (let j = TL.j - 2; j <= TL.j + 2; j++) for (let i = TL.i - 2; i <= TL.i + 2; i++) if (Math.hypot(i - TL.i, j - TL.j) < 2.6) set(i, j, 'soi');
    props.push({ i: TL.i + 1, j: TL.j - 1, kind: 'dicetable' }, { i: TL.i - 1, j: TL.j + 1, kind: 'campfire' });
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
  place('torture', Math.round(4 * S), 3, (i, j) => empty(i + 1, j) && empty(i - 1, j), (k) => k % 2, 22);
  place('cauldron', Math.round(3 * S), 4, undefined, undefined, 22);
  place('cage', Math.round((T === 'market' ? 6 : 5) * S), 4, undefined, undefined, 14);
  place('stake', Math.round((T === 'market' ? 12 : 10) * S), 5, undefined, undefined, 10);
  place('skulls', Math.round(10 * S), 6, undefined, undefined, 10);
  // 뼈는 길 위에도 (납작해서 걸어 지나간다)
  for (let k = 0, t = 0; k < (T === 'ash' ? 110 : T === 'market' ? 90 : 60) * A && t < 9000; t++) {
    const i = 5 + Math.floor(r() * (W - 10)), j = 5 + Math.floor(r() * (H - 10)), tt = at(i, j);
    if ((tt !== TI.lot && tt !== TI.park && tt !== TI.walk && tt !== TI.soi) || Math.hypot(i - C.i, j - C.j) < VR + 3 || props.some((p) => p.i === i && p.j === j)) continue;
    props.push({ i, j, kind: 'bones' }); k++;
  }
  // 경계 장식: 1층 현무암 기둥(틈에 용암) · 2층 안개 낀 바위산 (3층은 벽 없이 피의 용암 바다, 1층 북쪽은 불탄 도시)
  for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) {
    const d = edgeD(i, j);
    if (T === 'market' || (CITY && j < CITY)) continue;
    if (Math.abs(i - D.i) <= 4 && j > D.j - 2) continue; // 아래층 계단 자리
    if (T === 'swamp' && Math.abs(i - U.i - 0.5) < 5 && j < B.j) continue; // 여울 자리
    if (d === EDGE - 1 || (d === 1 && (i + j) % 2 === 0)) props.push({ i, j, kind: 'crag' });
  }
  // 괴물이 나오는 자리: 휴식 공간에서 멀리
  const spawns: [number, number][] = [];
  for (let t = 0; spawns.length < 60 * A && t < 9000; t++) {
    const i = 4 + Math.floor(r() * (W - 8)), j = 4 + Math.floor(r() * (H - 8));
    const tt = at(i, j);
    if ((tt === TI.lot || tt === TI.park || tt === TI.walk || tt === TI.soi) && Math.hypot(i - C.i, j - C.j) > VR + 8 && Math.hypot(i - B.i, j - B.j) > 8 && (!TL || Math.hypot(i - TL.i, j - TL.j) > 14) && Math.hypot(i - D.i, j - D.j) > 6 && !(CITY && j < CITY + 2)) spawns.push([i, j]);
  }
  void ring;
  const z = finalize({
    id: `hell-${floor}`, W, H, tiles, buildings, props, lanes: [], door, spawn: door,
    hell: { floor, rest: { i: C.i, j: C.j, r: VR }, up: U, down: D, boss: B, talus: TL ?? undefined, spawns, exit, shape, souls, vendors, posts },
  });
  cache.set(floor, z);
  return z;
}
