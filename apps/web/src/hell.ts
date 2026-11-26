// 지옥 (2단계): 1~3층. 층마다 새 지도·일반 괴물·층주 1명. 휴식 공간 = 울타리 마을 안 황혼의 유황새.
// 지도는 층 번호로 정해진 씨앗에서 만든다 (모두에게 같은 지도).
import { TYPES, finalize, type Zone, type Building, type HellBuildKind, type Prop, type TileType , type HellVendor} from './zone.ts';
import type { Lang } from './i18n.ts';

export const OPEN_FLOORS = 4; // 지금 열린 층 (4~13층은 하나씩 업데이트)

export type Theme = 'ash' | 'swamp' | 'market' | 'forge'; // 24차: 4층 용광로
export interface FloorDef { floor: number; theme: Theme; name: Record<Lang, string>; sin: Record<Lang, string>; monsters: string[]; boss: string; guard?: string; /** 고문 장면의 고문자 (그 층의 큰 괴물이 몽둥이를 든다) */ torturer: string }
export const FLOORS: FloorDef[] = [
  { floor: 1, theme: 'ash', name: { ko: '재의 문턱', th: 'ธรณีแห่งเถ้าถ่าน', en: 'Threshold of Ash' }, sin: { ko: '경미한 잘못, 책임 회피', th: 'ความผิดเล็กน้อย การหนีความรับผิดชอบ', en: 'Petty wrongs, evading responsibility' }, monsters: ['ashbug', 'ashen', 'gateyak', 'bonewalker'], boss: 'ashgal', guard: 'ashwarden', torturer: 'gateyak' }, // 26차 설정집: 재충 · 회색 망령 · 뼈지기 (+ 걷는 해골은 우리 것)
  { floor: 2, theme: 'swamp', name: { ko: '굶주림의 늪', th: 'บึงแห่งความหิวโหย', en: 'Swamp of Hunger' }, sin: { ko: '탐욕과 타인의 몫을 빼앗는 행위', th: 'ความโลภและการแย่งส่วนของผู้อื่น', en: 'Greed and taking what belongs to others' }, monsters: ['mudworm', 'glutton', 'bogdead'], boss: 'gurma', guard: 'hollowbowl', torturer: 'glutton' }, // 26차 설정집: 늪충 · 탐식귀 · 진흙거인
  { floor: 3, theme: 'market', name: { ko: '피의 시장', th: 'ตลาดเลือด', en: 'Blood Market' }, sin: { ko: '사기와 반복적인 기만', th: 'การฉ้อโกงและหลอกลวงซ้ำซาก', en: 'Fraud and repeated deceit' }, monsters: ['pactworm', 'broker', 'haggler', 'debtbones'], boss: 'serane', guard: 'waxseal', torturer: 'broker' }, // 26차 설정집: 계약충 · 피상인 · 가면도적 (+ 빚쟁이 해골)
  // 25차: 설정집대로 — 비명의 용광로 · 고의적인 폭력과 상해 · 불씨귀(불을 뿜는다) · 쇠망치병(거대한 망치) · 철갑마(쇠로 덮인 전사) / 층주 바르칸, 용광로의 장군
  { floor: 4, theme: 'forge', name: { ko: '비명의 용광로', th: 'เตาหลอมแห่งเสียงกรีดร้อง', en: 'Furnace of Screams' }, sin: { ko: '고의적인 폭력과 상해', th: 'ความรุนแรงและการทำร้ายโดยเจตนา', en: 'Deliberate violence and injury' }, monsters: ['cinderimp', 'hammerman', 'ironclad', 'chainbones'], boss: 'barkan', guard: 'anvilward', torturer: 'hammerman' }, // + 사슬 해골 (해골은 층마다 우리 것)
];
/**
 * 25차: 아직 열지 않은 5~13층 계획 (지옥 설정집). 악업 띠 — 1~4층 개인의 죄 · 5~8층 남을 고의로 망가뜨린 죄 · 9~12층 오래 이어진 학대와 조직적 착취 · 13층 절멸.
 * 설정상 지옥은 144층, 지옥의 주인이 사는 어비스까지 이어지지만 지금 계획은 13층까지. 떨어지는 깊이는 packages/shared rules.ts의 hellNeed()
 */
export const HELL_PLAN: { floor: number; name: string; monsters: string[]; boss: string; title?: string; karma?: string; land?: string; trial?: string }[] = [
  { floor: 5, name: '가면의 도시', monsters: ['가면귀', '속삭임꾼', '인형병사'], boss: '마르시온' },
  { floor: 6, name: '거울 미궁', monsters: ['유리거미', '모방귀', '파편기사'], boss: '릴미르' },
  { floor: 7, name: '사슬의 감옥해', monsters: ['사슬귀', '익사망령', '검은 간수'], boss: '도르카인' },
  { floor: 8, name: '검은 사냥숲', monsters: ['그림자늑대', '뿔사냥꾼', '목 없는 기사'], boss: '펜르자' },
  { floor: 9, name: '멈춘 시간의 도시', monsters: ['초침충', '반복망령', '시계기사'], boss: '크로벨' },
  { floor: 10, name: '부패의 궁정', monsters: ['부패충', '검은 시종', '타락기사'], boss: '모르비아' },
  { floor: 11, name: '무명의 서고', monsters: ['종이망령', '백지귀', '기억수집가'], boss: '에노크라' },
  { floor: 12, name: '왕관 없는 황궁', monsters: ['철면병', '지배귀', '황궁거인'], boss: '타나토르' },
  // 31차: 13층은 예전 설정집대로 — 무형귀(정해진 형태가 없다) · 공허거인(주변의 빛을 삼킨다) · 심연의 그림자(상대의 능력과 모습을 흡수한다)
  {
    floor: 13, name: '심연의 옥좌', monsters: ['무형귀', '공허거인', '심연의 그림자'], boss: '무형왕', title: '심연의 지배자',
    karma: '광범위한 생명과 문명의 의도적인 절멸',
    land: '빛도 하늘도 없는 무한한 심연. 부서진 대륙의 파편들이 공중에 떠 있고, 중심에 거대한 검은 옥좌',
    trial: '자신이 파괴한 생명의 무게를 온전히 받아들이고, 처음으로 타인의 생존을 위해 자신을 희생할 것',
  },
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
    look: { ko: '얼굴이 있어야 할 자리에 어둠만 고인 깊은 두건. 재가 엉겨 붙은 누더기 망토 사이로 불씨가 숨 쉬고, 어깨에서는 재가 부스러져 흩날린다. 뼈만 남은 손에 문고리 달린 뼈 곤봉.', th: 'ผ้าคลุมหัวลึกที่มีเพียงความมืดแทนใบหน้า ถ่านไฟหายใจอยู่ในผ้าขี้ริ้วที่เถ้าเกาะ ไหล่ร่วงเป็นเถ้าปลิว มือที่เหลือแต่กระดูกถือกระบองห่วงประตู', en: 'A deep hood with only darkness where a face should be. Embers breathe between ash-caked rags, and its shoulders crumble away as drifting ash. Skeletal hands grip a bone club topped with a door knocker.' },
    cols: { 1: '#2a2624', 3: '#5c5853', 4: '#403c38', 10: '#c8bea8', 14: '#6a5a3a', 15: '#050303', 12: '#ff7a2a', 6: '#ff7a2a' },
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
  // 24차 4층: 모루지기 — 쇠 두건 아래 그을린 얼굴, 모루를 닮은 쇳덩이 곤봉으로 내려쳐 밀어낸다
  anvilward: {
    key: 'anvilward', body: 'warden1', weapon: 'knocker',
    name: { ko: '모루지기', th: 'ผู้เฝ้าทั่ง', en: 'Anvil Warden' },
    line: { ko: '여기선 쇠만 두드린다. 사람은 아니다.', th: 'ที่นี่ตีแต่เหล็ก ไม่ตีคน', en: 'Here we strike iron. Not people.' },
    look: { ko: '쇳물에 그을린 쇠 두건, 가슴에 박힌 모루 모양의 쇳덩이, 손에는 쇠똥이 엉겨 붙은 무거운 곤봉. 두건 틈으로 불티가 샌다.', th: 'ผ้าคลุมหัวเหล็กไหม้เกรียมจากน้ำเหล็ก ก้อนเหล็กรูปทั่งฝังที่อก ในมือคือกระบองหนักมีตะกรันติด ประกายไฟลอดออกจากรอยผ้า', en: 'An iron hood scorched by molten metal, an anvil-shaped lump of iron set in its chest, a heavy club crusted with slag. Sparks leak from the hood.' },
    cols: { 1: '#3a3634', 3: '#2a2624', 4: '#1a1716', 10: '#5a524c', 14: '#8a7e6e', 15: '#060404', 12: '#ff8a1a', 6: '#ff8a1a' },
    hp: 5400, dmg: [34, 46], atk: 1.0, speed: 0.6, special: 'push', // 층주 바르칸만큼
  },
};

/** 괴물: 몸 + 색. 일반 괴물은 모두 무기를 든다. 16차부터 층마다 몸이 다르다:
 *  1층 잿빛 망자(곡괭이) · 불씨 망자(머리가 타오르는 숯 몸, 낙인 쇠) · 걷는 해골 · 문지기 야크 / 층주 아쉬갈(숯 바위 거인, 성문 빗장)
 *  2층 프렛(국자) · 늪 망자(불어 터진 시체, 쇠갈고리 장대) · 탐식귀(두꺼비 거구, 몽둥이) / 층주 구르마(산 같은 배, 맨손)
 *  3층 흥정꾼(웃는 가면 상인, 고기 칼) · 빚쟁이 해골(멍에·족쇄, 빚 갈고리) · 살점 거간꾼(뚱뚱한 금붙이 상인, 고기 칼) / 층주 세라네 */
export type MonsterBody = 'ash' | 'pret' | 'yak' | 'bones' | 'serane' | 'ashgal' | 'gurma' | 'cinder' | 'bloat' | 'glutton' | 'hawker' | 'debtor' | 'broker' | 'forgeknight';
export interface MonsterDef {
  key: string; body: MonsterBody; name: Record<Lang, string>;
  skin: string; cloth: string; glow: string; // 살·옷·빛나는 곳 색
  hp: number; dmg: [number, number]; speed: number; notice: number; atk: number; scale: number; notes: [number, number];
  boss?: boolean; weapon?: string | null;
  /** 25차: 불을 뿜는다 — 몇 칸 떨어진 곳에서 불길로 공격한다 (불씨귀) */
  flame?: boolean;
  /** 이름 뒤에 붙는 칭호 (살펴보기) */
  title?: Record<Lang, string>;
  /** 26차: 떼로 나온다 — 한 마리가 나타날 때 곁에 몇 마리가 더 (재충) */
  swarm?: number;
  /** 26차: 반쯤 비치는 유령 — 맞으면 가던 길을 잃는다 (회색 망령) */
  ghost?: boolean;
  /** 몸 구역 색 덮어쓰기 (가면·금붙이·뿔처럼 살·옷·빛 셋으로 모자란 곳) */
  cols?: Record<number, string>;
}
const M = (key: string, body: MonsterBody, ko: string, th: string, en: string, skin: string, cloth: string, glow: string, hp: number, dmg: [number, number], speed: number, notice: number, atk: number, scale: number, notes: [number, number], extra: Partial<MonsterDef> = {}): MonsterDef =>
  ({ key, body, name: { ko, th, en }, skin, cloth, glow, hp, dmg, speed, notice, atk, scale, notes, ...extra });
export const MONSTERS: Record<string, MonsterDef> = Object.fromEntries([
  // 1층 재의 문턱 (26차 설정집): 재충 — 떼 지어 덤비는 작은 벌레 · 회색 망령 — 길을 잃게 하는 유령 · 뼈지기 — 거대한 뼈 몽둥이의 경비병 · 걷는 해골(우리 것)
  M('ashbug', 'serane', '재충', 'หนอนเถ้า', 'Ash mite', '#5a5450', '#2e2a28', '#ff8a2a', 120, [5, 9], 1.45, 7, 0.7, 0.42, [2, 5], { weapon: null, swarm: 3 }), // 곁가지는 층 전체 8마리까지
  M('ashen', 'ash', '회색 망령', 'วิญญาณสีเทา', 'Gray wraith', '#9a9a9e', '#5a5a60', '#d8e0ff', 260, [8, 14], 1.0, 7, 1.0, 1, [3, 8], { weapon: null, ghost: true, cols: { 6: '#e8eeff', 12: '#c8d2ff' } }),
  M('bonewalker', 'bones', '걷는 해골', 'โครงกระดูกเดินได้', 'Walking bones', '#d8cfb8', '#3a3026', '#ff6a2a', 230, [9, 15], 1.2, 7, 0.9, 1, [4, 9], { weapon: 'femur' }),
  M('gateyak', 'yak', '뼈지기', 'ผู้เฝ้ากระดูก', 'Bone warden', '#6a6e76', '#3a2a22', '#e0b437', 520, [14, 22], 0.9, 5, 1.15, 1.12, [10, 18], { weapon: 'club', cols: { 13: '#e0d6bc', 14: '#c8bea4' } }),
  // 아쉬갈: 숯이 된 바위 거인. 갈라진 틈으로 용암이 흐르고 숫양 뿔이 말렸다. 불탄 성문의 쇠 빗장을 휘두른다
  M('ashgal', 'ashgal', '아쉬갈', 'อัชกัล', 'Ashgal', '#4a4440', '#2a2220', '#ff6a1a', 2400, [22, 32], 1.0, 9, 1.15, 1.45, [120, 160], { boss: true, weapon: 'gatebar', title: { ko: '재의 문지기', th: 'ผู้เฝ้าประตูเถ้า', en: 'Gatekeeper of Ash' }, cols: { 13: '#3a2a1e', 14: '#5a5652', 15: '#120c0a' } }),
  // 2층 굶주림의 늪 (26차 설정집): 늪충 — 진흙 속에서 튀어나온다 · 탐식귀 — 주변을 삼킨다 · 진흙거인 — 거대한 몸으로 길을 막는다
  M('mudworm', 'serane', '늪충', 'หนอนบึง', 'Mud worm', '#4a5a32', '#2a3018', '#c8e05a', 300, [10, 17], 1.05, 6, 0.95, 0.72, [5, 11], { weapon: null }),
  M('glutton', 'glutton', '탐식귀', 'ผีตะกละ', 'Glutton', '#5f7a4a', '#c9b27a', '#e0b437', 640, [16, 25], 0.85, 5, 1.15, 1.1, [12, 22], { weapon: 'club', cols: { 4: '#3a2a1a' } }),
  M('bogdead', 'bloat', '진흙거인', 'ยักษ์โคลน', 'Mud giant', '#5a4a32', '#3a2e1c', '#a8c05a', 980, [18, 28], 0.6, 5, 1.3, 1.5, [14, 26], { weapon: 'boathook', cols: { 4: '#2e2416', 10: '#6a5a3a' } }),
  M('gurma', 'gurma', '구르마', 'กูร์มา', 'Gurma', '#8a8a6a', '#4a3a26', '#e8f06a', 3200, [26, 36], 0.85, 9, 1.05, 1.45, [240, 300], { boss: true, weapon: null, title: { ko: '굶주림의 군주', th: 'เจ้าแห่งความหิว', en: 'Lord of Hunger' } }),
  // 3층 피의 시장 (26차 설정집): 계약충 — 물건에 숨어드는 기생 악마 · 피상인 — 거짓 거래로 영혼을 속인다 · 가면도적 — 남의 모습으로 둔갑한다 · 빚쟁이 해골(우리 것)
  M('pactworm', 'serane', '계약충', 'หนอนสัญญา', 'Pact worm', '#c8b48a', '#6a1a14', '#e0b437', 340, [12, 19], 1.25, 7, 0.85, 0.55, [6, 12], { weapon: null, cols: { 9: '#8a2a1e' } }),
  M('haggler', 'hawker', '가면도적', 'โจรหน้ากาก', 'Masked thief', '#6a5a52', '#1a1414', '#c8281e', 380, [13, 20], 1.25, 6, 0.9, 1, [7, 14], { weapon: 'cleaver', cols: { 10: '#efe8dc', 14: '#c9a23e', 4: '#120e0e' } }),
  M('debtbones', 'debtor', '빚쟁이 해골', 'โครงกระดูกลูกหนี้', 'Debtor bones', '#c9b89a', '#6a5a3a', '#f2c84a', 360, [13, 21], 1.2, 7, 0.9, 1, [7, 13], { weapon: 'hook', cols: { 10: '#e8dcc0' } }),
  M('broker', 'broker', '피상인', 'พ่อค้าเลือด', 'Blood merchant', '#8a5a4a', '#2a1a12', '#f2c84a', 800, [19, 29], 0.9, 5, 1.1, 1.1, [15, 26], { weapon: 'cleaver', cols: { 14: '#c9a23e' } }),
  // 세라네: 피의 시장 끝 나루터 앞에 도사린 거대한 살덩이 애벌레. 세로로 찢어진 아가리에 이빨이 세 겹 (맨손 = 발톱 팔)
  // 4층 비명의 용광로 (25차, 설정집): 불을 뿜는 숯불 꼬마 악귀 · 거대한 쇠망치를 멘 야크 병사 · 온몸을 쇠로 덮은 전사
  M('chainbones', 'debtor', '사슬 해골', 'โครงกระดูกโซ่', 'Chained bones', '#4a423c', '#2a2420', '#ff6a1a', 420, [15, 24], 1.25, 7, 0.88, 1, [8, 15], { weapon: 'hook', cols: { 10: '#5e5650', 14: '#8a8078' } }), // 해골은 층마다 우리 것 (24차의 사슬 해골을 되살림)
  M('cinderimp', 'cinder', '불씨귀', 'ผีลูกไฟ', 'Cinder imp', '#2a2220', '#3a1a10', '#ff9a1a', 380, [14, 22], 1.35, 7, 1.15, 0.95, [8, 15], { weapon: 'brand', flame: true, cols: { 12: '#ffcf4a', 14: '#5a4a40' } }),
  M('hammerman', 'yak', '쇠망치병', 'ทหารค้อนเหล็ก', 'Hammer soldier', '#4a4644', '#2a2422', '#ff7a2a', 950, [24, 34], 0.85, 5, 1.3, 1.14, [18, 30], { weapon: 'sledge', cols: { 13: '#3a2a20', 14: '#7a7470' } }),
  M('ironclad', 'forgeknight', '철갑마', 'อัศวินเกราะเหล็ก', 'Ironclad', '#3e3c3a', '#4a4846', '#ffb04a', 1100, [24, 36], 0.9, 6, 1.15, 1.05, [20, 34], { weapon: 'greatsword', cols: { 13: '#5a5856', 14: '#8a8682', 15: '#141210' } }),
  // 바르칸, 용광로의 장군: 뿔 달린 검은 가시 갑옷, 해골 얼굴에 붉은 눈, 쇠사슬 감긴 철퇴 지팡이, 해진 붉은 망토 (사용자 컨셉 그림)
  M('barkan', 'forgeknight', '바르칸', 'บาร์คาน', 'Barkan', '#2a2422', '#5a0e10', '#ff4a1a', 5400, [34, 48], 0.9, 8, 1.05, 1.6, [520, 640], { boss: true, weapon: 'chainmace', title: { ko: '용광로의 장군', th: 'แม่ทัพแห่งเตาหลอม', en: 'General of the Furnace' }, cols: { 13: '#7a1014', 14: '#5a5250', 15: '#0a0606' } }),
  M('serane', 'serane', '세라네', 'เซราเน', 'Serane', '#5e1a20', '#360a0e', '#e0281e', 4200, [30, 42], 0.8, 6, 1.0, 1.85, [380, 460], { boss: true, weapon: null, title: { ko: '붉은 시장의 주인', th: 'เจ้าตลาดแดง', en: 'Master of the Red Market' } }),
  // 31차 필드 보스 (사용자 설정집 「지옥 13층 · 필드보스 설정집」): 층주와 다른 희귀 개체 — 하루 한 번, 날마다 다른 자리에. 몸은 있는 것을 빌려 색과 크기로 (전용 모습은 나중에)
  M('rokk', 'bloat', '로크', 'ร็อก', 'Rokk', '#6e6862', '#3a3430', '#ff8a3a', 6400, [24, 36], 0.95, 8, 1.2, 1.95, [700, 900], { weapon: 'boathook', title: { ko: '재등짐승', th: 'สัตว์หลังเถ้า', en: 'Ashback' }, cols: { 4: '#2a2622', 10: '#5a5450', 14: '#8a8278' } }),
  M('gulon', 'gurma', '굴론', 'กูลอน', 'Gulon', '#4e5a3a', '#2e3420', '#d8f04a', 7000, [26, 38], 0.9, 8, 1.15, 1.85, [760, 960], { weapon: null, title: { ko: '빈배의 포식자', th: 'ผู้กลืนกินท้องกลวง', en: 'Hollow Maw' } }),
  M('merk', 'broker', '메르크', 'เมิร์ก', 'Merk', '#6a5a3a', '#2a2018', '#f2c84a', 7600, [28, 40], 0.95, 8, 1.1, 1.8, [820, 1020], { weapon: 'cleaver', title: { ko: '계약포식자', th: 'ผู้กลืนสัญญา', en: 'Contract Eater' }, cols: { 14: '#c9a23e', 13: '#8a1a14' } }),
  M('ferron', 'forgeknight', '페론', 'เฟอร์รอน', 'Ferron', '#3a3430', '#4a2a1a', '#ff7a1a', 8800, [32, 46], 0.85, 8, 1.15, 2.0, [900, 1150], { weapon: 'greatsword', title: { ko: '용광로의 심장', th: 'หัวใจเตาหลอม', en: 'Furnace Heart' }, cols: { 12: '#ffb04a', 6: '#ff6a1a' } }),
].map((m) => [m.key, m]));
/** 31차: 층마다 하루 한 번 나오는 필드 보스 */
export const FIELD_BOSS: Record<number, string> = { 1: 'rokk', 2: 'gulon', 3: 'merk', 4: 'ferron' };

// ───────────────────────── 지도 ─────────────────────────
const TI = Object.fromEntries(TYPES.map((t, k) => [t, k])) as Record<TileType, number>;
function rng(seed: number) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

/** 2층 여울이 구불거리는 정도 (북쪽 끝 몇 칸은 곧게: 끝에 닿기 쉽게) */
export const fordWob = (j: number) => (j < 7 ? 0 : Math.round(Math.sin(j * 0.45) * 1.2));
const hash2 = (a: number, b: number) => { let h = (a * 374761393 + b * 668265263) | 0; h = (h ^ (h >>> 13)) * 1274126177; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
/** 부드러운 값 잡음 (0~1): 해안선과 산등성이를 구불구불하게 */
function vnoise(x: number, y: number, seed: number) {
  const xi = Math.floor(x), yi = Math.floor(y), fx = x - xi, fy = y - yi;
  const h = (a: number, b: number) => hash2(a + seed * 131, b - seed * 71);
  const sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy);
  return (h(xi, yi) * (1 - sx) + h(xi + 1, yi) * sx) * (1 - sy) + (h(xi, yi + 1) * (1 - sx) + h(xi + 1, yi + 1) * sx) * sy;
}
const cache = new Map<number, Zone>();
/** 위층 통행세와 속죄의 회당 목표 (노전). 층주를 피해 지나가는 값은 아주 비싸다 */
export const TOLL: Record<number, number> = { 1: 10000, 2: 20000, 3: 30000, 4: 40000 };
export const ATONE_GOAL: Record<number, number> = { 1: 11000, 2: 21000, 3: 31000, 4: 41000 };
/**
 * 4층부터: 마을의 결계(보호)가 주기적으로 걷힌다. 그동안 괴물이 마을로 몰려들고, 경비병은 휴전 협약대로 움직이지 않는다.
 * 모두에게 같은 시각에 일어나도록 실제 시계로 정한다 (층마다 어긋나게). 매 15분 중 2분.
 */
export const RAID = { from: 4, every: 15 * 60, length: 2 * 60 };
/** 시험용: true/false 로 강제 (null = 시계대로) */
export let raidForce: boolean | null = null;
export const setRaidForce = (v: boolean | null) => { raidForce = v; };
export function raidState(floor: number, nowMs = Date.now()): { on: boolean; left: number } {
  if (raidForce !== null) return { on: raidForce, left: raidForce ? RAID.length : RAID.every };
  if (floor < RAID.from) return { on: false, left: Infinity };
  const t = (Math.floor(nowMs / 1000) + floor * 211) % RAID.every;
  const start = RAID.every - RAID.length;
  return t >= start ? { on: true, left: RAID.every - t } : { on: false, left: start - t };
}
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
  const MK = T === 'market' || T === 'forge'; // 4층 용광로도 바깥이 끝없는 쇳물 바다 · 나루터
  const SEA = MK;
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
  // ── 17차: 땅을 가로막는 산등성이 (1층 현무암 능선 · 2층 깊은 늪 물길 · 3층 무너진 시장 담) ──
  // 구불구불 이어져 들판을 골짜기로 나눈다. 길만 고개(틈)로 지나간다 → 미로처럼, 빠져나가기 어렵게
  const ridge = new Set<number>();
  {
    const nR = Math.round((T === 'ash' ? 7 : T === 'swamp' ? 6 : 5) * S);
    for (let n = 0, tries = 0; n < nR && tries < 80; tries++) {
      let i = 10 + r() * (W - 20), j = 10 + r() * (H - 20);
      if (!free(Math.round(i), Math.round(j), 6)) continue;
      let a = r() * Math.PI * 2;
      const len = Math.round((28 + r() * 30) * S);
      for (let k = 0; k < len; k++) {
        a += (r() - 0.5) * 0.5;
        i += Math.cos(a); j += Math.sin(a);
        if (i < 6 || j < 6 || i > W - 7 || j > H - 7) break;
        const wid = T === 'swamp' ? 1.6 : 1.2 + (k % 9 < 3 ? 0.6 : 0);
        for (let dj = -2; dj <= 2; dj++) for (let di = -2; di <= 2; di++) {
          if (Math.hypot(di, dj) > wid) continue;
          const ii = Math.round(i + di), jj = Math.round(j + dj);
          if (!free(ii, jj, 2)) continue;
          if (T === 'swamp') set(ii, jj, 'water'); else { set(ii, jj, 'block'); ridge.add(jj * W + ii); }
        }
      }
      n++;
    }
  }
  const roadTiles = new Set<number>();
  // 길: 마을 문 ↔ 층주 ↔ 위층 길, 마을 문 ↔ 아래층 계단 (물 위는 다리, 산등성이는 고개로 뚫는다)
  const road = (a: { i: number; j: number }, b: { i: number; j: number }) => {
    const mid = { i: Math.round((a.i + b.i) / 2 + (r() - 0.5) * 10), j: Math.round((a.j + b.j) / 2 + (r() - 0.5) * 10) };
    for (const [p, q] of [[a, mid], [mid, b]] as const) {
      const n = Math.max(Math.abs(q.i - p.i), Math.abs(q.j - p.j));
      for (let k = 0; k <= n; k++) {
        const i = Math.round(p.i + ((q.i - p.i) * k) / n), j = Math.round(p.j + ((q.j - p.j) * k) / n);
        for (const [di, dj] of [[0, 0], [1, 0], [0, 1], [1, 1]]) {
          const t = at(i + di, j + dj), idx = (j + dj) * W + i + di;
          if (t === TI.block && !ridge.has(idx)) continue;
          if (ridge.has(idx)) ridge.delete(idx); // 고개
          set(i + di, j + dj, t === TI.water || t === TI.cross ? 'cross' : 'walk');
          roadTiles.add(idx);
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
  if (MK) for (let j = 3; j < U.j; j++) set(U.i, j, j < U.j - 1 ? 'cross' : 'walk'); // 나루터 부두 (널빤지)

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
    set(i, j, T === 'swamp' ? 'walk' : MK ? (plaza ? 'walk' : 'soi') : plaza ? 'walk' : 'lot');
  }
  // ── 17차: 사각형이 아닌 땅 — 들쭉날쭉한 해안선 ──
  // 땅 = 가운데에서 잡음으로 흔든 반지름 안 + 꼭 필요한 곳(마을·층주·위층 길·아래층 계단·길) 둘레.
  // 바깥: 1층 용암 바다(가장자리는 현무암 절벽) · 2층 늪물 너머 안개 낀 바위산 · 3층 피의 용암 바다
  const ph = [r() * 6.28, r() * 6.28, r() * 6.28];
  const coast = (i: number, j: number) => {
    const dx = (i - W / 2) / (W * 0.5), dy = (j - H / 2) / (H * 0.5);
    const a = Math.atan2(dy, dx), dd = Math.hypot(dx, dy);
    const R0 = 0.74 + 0.08 * Math.sin(3 * a + ph[0]) + 0.05 * Math.sin(5 * a + ph[1]) + 0.035 * Math.sin(9 * a + ph[2]) + (vnoise(i * 0.09, j * 0.09, floor) - 0.5) * 0.18;
    return Math.min(0.9, R0) - dd;
  };
  const vital: { i: number; j: number; r: number }[] = [{ i: C.i, j: C.j, r: VR + 7 }, { i: B.i, j: B.j, r: 9 }, { i: U.i, j: U.j, r: 6 }, { i: D.i, j: D.j, r: 6 }, ...(TL ? [{ i: TL.i, j: TL.j, r: 7 }] : [])];
  const byRoad = (i: number, j: number, rad: number) => { for (let b2 = -rad; b2 <= rad; b2++) for (let a2 = -rad; a2 <= rad; a2++) if (roadTiles.has((j + b2) * W + i + a2)) return true; return false; };
  const landHold = (i: number, j: number) =>
    vital.some((v) => Math.hypot(i - v.i, j - v.j) <= v.r + (hash2(i, j) < 0.5 ? 0 : 1)) ||
    (CITY > 0 && j < CITY + 6 && Math.abs(i - U.i) <= 24 + Math.floor(vnoise(j * 0.3, 1, floor) * 6)) ||
    (T === 'swamp' && Math.abs(i - U.i - fordWob(j)) <= 6 && j <= B.j + 2) ||
    (Math.abs(i - D.i) <= 4 && j >= D.j - 2) ||
    byRoad(i, j, 3);
  const cliff = new Set<number>();
  for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) {
    if (landHold(i, j)) continue;
    const cv = coast(i, j);
    if (cv >= 0.03 || (SEA && cv >= 0)) continue;
    if (cv >= 0) { if (!MK) { set(i, j, 'block'); cliff.add(j * W + i); } continue; } // 해안 절벽
    if (T === 'swamp') set(i, j, cv < -0.07 ? 'block' : 'water'); // 늪물 너머는 바위산
    else set(i, j, 'water');
  }
  const buildings: Building[] = [];
  const BL = (di: number, dj: number, w: number, d: number, h: number, cat: Building['cat'], hk?: HellBuildKind, sign?: 'left' | 'right') => {
    const b: Building = { i0: C.i + di, j0: C.j + dj, w, d, h, cat, sign, color: '#3a2a2a', hk };
    buildings.push(b);
    return b;
  };
  // 층마다 다른 배치 (깊을수록 비좁고 가게가 줄어든다)
  type Slot = [number, number, number, number, number, Building['cat'], HellBuildKind?, ('left' | 'right')?];
  // 17차: 들어갈 수 없는 집은 없앴다. 대신 층마다 다른 조형물 — 1층 재의 악마상(엎드려 비는 영혼들) · 2층 굶주린 아가리 · 3층 피의 저울
  const LAYOUT: Record<Theme, Slot[]> = {
    ash: [[-1, -10, 2, 2, 58, 'ujusae', undefined, 'left'], [6, -9, 2, 2, 52, 'hbank', undefined, 'left'], [-10, -7, 3, 3, 64, 'atone', undefined, 'left'], [-11, 3, 3, 3, 150, 'generic', 'idol'],
      [5, 5, 2, 1, 30, 'generic', 'butcher'], [8, 4, 2, 1, 30, 'generic', 'butcher'], [-6, 9, 2, 1, 26, 'generic', 'stall'], [-2, 9, 2, 1, 26, 'generic', 'stall'], [9, -2, 1, 2, 26, 'generic', 'stall'], [2, 9, 2, 1, 26, 'generic', 'stall']],
    swamp: [[-1, -7, 2, 2, 58, 'ujusae', undefined, 'left'], [4, -7, 2, 2, 50, 'hbank', undefined, 'left'], [-8, -5, 3, 2, 56, 'atone', undefined, 'left'], [-7, 2, 3, 3, 46, 'generic', 'idol'],
      [-4, 6, 2, 1, 24, 'generic', 'stall'], [6, 0, 1, 2, 24, 'generic', 'stall']],
    market: [[-1, -6, 2, 2, 58, 'ujusae', undefined, 'left'], [3, -6, 3, 2, 62, 'loan', undefined, 'left'], [-7, -6, 2, 2, 48, 'hbank', undefined, 'left'], [-7, 1, 2, 2, 46, 'atone', undefined, 'left'],
      [3, 3, 2, 1, 26, 'generic', 'butcher'], [-3, 5, 2, 1, 22, 'generic', 'stall'], [5, -1, 1, 2, 22, 'generic', 'stall'], [-3, -2, 2, 2, 76, 'generic', 'idol']],
    // 4층 용광로: 대부소 없이 · 쇠를 두드리는 대장간 노점 · 가운데 큰 모루 조형물
    forge: [[-1, -6, 2, 2, 58, 'ujusae', undefined, 'left'], [4, -6, 2, 2, 48, 'hbank', undefined, 'left'], [-7, -6, 2, 2, 46, 'atone', undefined, 'left'],
      [3, 3, 2, 1, 26, 'generic', 'butcher'], [-3, 5, 2, 1, 22, 'generic', 'stall'], [5, -1, 1, 2, 22, 'generic', 'stall'], [-7, 1, 1, 2, 22, 'generic', 'stall'], [-3, -2, 2, 2, 76, 'generic', 'idol']],
  };
  let shop: Building | null = null;
  for (const [di, dj, w, d, h, cat, hk, sign] of LAYOUT[T]) {
    const b = BL(di, dj, w, d, h, cat, hk, sign);
    if (cat === 'ujusae') shop = b;
  }
  const door = { i: shop!.i0 + 1, j: shop!.j0 + shop!.d };
  // 장사꾼은 좌판 앞(마을 쪽)에 선다
  // 22차: 장사꾼은 종류마다 한 명 (겹치던 고깃간·넝마를 정리) — 고깃간 좌판에 고깃간 하나, 나머지 좌판엔 물장수·넝마·약장수·장사꾼·무기상 차례로.
  // 좌판이 모자란 층은 뒤에서 빈 땅에 자리를 편다
  const vendors: { i: number; j: number; kind: HellVendor }[] = [];
  const STALL_KINDS: HellVendor[] = ['water', 'junk', 'medic', 'trader', 'arms'];
  const stalls = buildings.filter((b) => b.hk === 'butcher' || b.hk === 'stall').sort((a, b) => (a.hk === 'butcher' ? 0 : 1) - (b.hk === 'butcher' ? 0 : 1));
  for (const b of stalls) {
    const kind: HellVendor | undefined = b.hk === 'butcher' && !vendors.some((v) => v.kind === 'butcher') ? 'butcher' : STALL_KINDS.find((k) => !vendors.some((v) => v.kind === k));
    if (!kind) continue;
    vendors.push({ i: b.w >= b.d ? b.i0 + 1 : b.i0 - 1, j: b.w >= b.d ? b.j0 - 1 : b.j0 + 1, kind });
  }
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
      const jb = EDGE + Math.floor(r() * 2), db = Math.min(d, CITY - EDGE - 1);
      let land = true;
      for (let jj = jb; jj < jb + db && land; jj++) for (let ii = i; ii < i + w; ii++) if (at(ii, jj) === TI.water || cliff.has(jj * W + ii)) { land = false; break; }
      if (land) buildings.push({ i0: i, j0: jb, w, d: db, h: 54 + Math.floor(r() * 70), cat: 'generic', color: '#1e1a18', hk: 'burnt' });
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
    forge: [['prison', 4], ['burnt', 4], ['bonepile', 3], ['carcass', 2]], // 4층: 쇠 감옥 · 타 버린 집 · 녹다 만 뼈 무더기
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
  // 19차: 출입문 앞(간판 면)은 울타리를 비우고 땅으로 — 문 앞이 울타리 너머에 갇혀 못 들어가던 일 (2층 속죄의 회당)
  for (const b of buildings) {
    if (!b.sign) continue;
    const fi = b.sign === 'right' ? b.i0 + b.w : b.i0 + Math.floor(b.w / 2), fj = b.sign === 'right' ? b.j0 + Math.floor(b.d / 2) : b.j0 + b.d;
    for (let n = props.length - 1; n >= 0; n--) { const q = props[n]; if (q.kind === 'fence' && Math.abs(q.i - fi) <= 1 && Math.abs(q.j - fj) <= 1) props.splice(n, 1); }
    for (const [a, c] of [[0, 0], [0, 1], [1, 0], [-1, 0], [1, 1], [-1, 1]]) {
      const ii = fi + a, jj = fj + c;
      if (buildings.some((o) => ii >= o.i0 && ii < o.i0 + o.w && jj >= o.j0 && jj < o.j0 + o.d)) continue;
      const tt = at(ii, jj);
      if (tt === TI.block || tt === TI.water) set(ii, jj, 'walk');
    }
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
  // 22차: 좌판 없이 자리 편 장사꾼 · 지옥호텔(바깥 공터에 매트리스만, 지배인 하나) · 서큐버스 (층마다 하나)
  // 마을이 좁은 층(2·3층)도 자리가 나도록: 처음엔 넉넉한 조건, 안 되면 조금씩 느슨하게
  const freeSpot = (minD: number, maxD: number, ok: (i: number, j: number) => boolean = () => true): [number, number] | null => {
    for (const [m, gap, dd] of [[2, 3, 4], [1, 2, 3], [1, 2, 2]] as const)
      for (let t = 0; t < 600; t++) {
        const a = r() * Math.PI * 2, rr = Math.max(1.5, minD - (m === 1 ? 1 : 0)) + r() * (maxD + (m === 1 ? 1 : 0) - minD);
        const i = Math.round(C.i + Math.cos(a) * rr), j = Math.round(C.j + Math.sin(a) * rr);
        if (!inV(i, j, m) || taken(i, j) || Math.abs(i - door.i) + Math.abs(j - door.j) < dd || vendors.some((v) => Math.abs(v.i - i) + Math.abs(v.j - j) < gap) || !ok(i, j)) continue;
        return [i, j];
      }
    return null;
  };
  for (const kind of ['butcher', ...STALL_KINDS] as HellVendor[]) {
    if (vendors.some((v) => v.kind === kind)) continue;
    const at = freeSpot(3, VR - 3);
    if (at) vendors.push({ i: at[0], j: at[1], kind });
  }
  // 30차 대장간: 모루와 숯불 화로 옆에 선 대장장이 (지옥 장비 수리 · 템브라 강화)
  {
    const at = freeSpot(3, VR - 2, (i, j) => inV(i + 1, j, 1) && !taken(i + 1, j));
    if (at) { vendors.push({ i: at[0], j: at[1], kind: 'smith' }); props.push({ i: at[0] + 1, j: at[1], kind: 'anvil' }); }
  }
  // 지옥호텔: 매트리스 셋이 한 줄 (사이를 한 칸씩 띄워 밟고 지나갈 수 있다)
  // 좁으면 두 장, 그래도 안 되면 세로로
  let hotel: { at: [number, number]; cells: [number, number][] } | null = null;
  for (const cells of [[[0, 0], [2, 0], [4, 0]], [[0, 0], [0, 2], [0, 4]], [[0, 0], [2, 0]], [[0, 0], [0, 2]]] as [number, number][][]) {
    const at = freeSpot(3, VR - 1, (i, j) => cells.every(([a, b]) => inV(i + a, j + b, 1) && !taken(i + a, j + b)) && !taken(i - 1, j + 1));
    if (at) { hotel = { at, cells }; break; }
  }
  if (hotel) {
    for (const [a, b] of hotel.cells) props.push({ i: hotel.at[0] + a, j: hotel.at[1] + b, kind: 'mattress' });
    vendors.push({ i: hotel.at[0] - 1, j: hotel.at[1] + 1, kind: 'hotel' });
  }
  const sucAt = freeSpot(3, VR - 3);
  if (sucAt) vendors.push({ i: sucAt[0], j: sucAt[1], kind: 'succubus' });
  // 앉거나 누운 영혼들: 모닥불 둘레와 좌판 앞, 담 밑 (1층 많이 · 깊을수록 지쳐 누운 이가 많다)
  const souls: { i: number; j: number; pose: 'sit' | 'lie' | 'stand'; d: number; pray?: boolean }[] = [];
  const idol = buildings.find((b) => b.hk === 'idol')!;
  if (T === 'ash' && idol) {
    // 악마상 앞 두 줄: 상을 바라보고 무릎 꿇고 앉아 빈다
    const fi = idol.i0 + idol.w / 2, fj = idol.j0 + idol.d / 2;
    for (const [di, dj] of [[0, 1], [1, 1], [2, 1], [-1, 2], [0.5, 2], [2, 2], [3, 0], [3, 1.5]] as [number, number][]) {
      const i = Math.round(idol.i0 + di), j = Math.round(idol.j0 + idol.d + dj);
      if (!inV(i, j, 1) || taken(i, j)) continue;
      const ai = fi - (i + 0.5), aj = fj - (j + 0.5);
      souls.push({ i, j, pose: 'sit', d: Math.abs(ai) > Math.abs(aj) ? (ai > 0 ? 0 : 3) : aj > 0 ? 1 : 2, pray: true });
    }
  }
  const nSoul = souls.length + (T === 'ash' ? 10 : T === 'swamp' ? 12 : 9);
  for (let k = 0, t = 0; souls.length < nSoul && t < 400; t++) {
    const near = k++ % 3 === 0;
    const a = r() * Math.PI * 2, rr = near ? 2.2 + r() * 1.5 : 3 + r() * (VR - 4);
    const i = Math.round(C.i + 2 + Math.cos(a) * rr), j = Math.round(C.j + 1 + Math.sin(a) * rr);
    if (!inV(i, j, 1) || taken(i, j) || souls.some((s2) => Math.abs(s2.i - i) + Math.abs(s2.j - j) < 2) || (i === door.i && Math.abs(j - door.j) < 3)) continue;
    const roll = r();
    const pose = T === 'swamp' ? (roll < 0.25 ? 'sit' : roll < 0.85 ? 'lie' : 'stand') : T === 'market' ? (roll < 0.25 ? 'sit' : roll < 0.4 ? 'lie' : 'stand') : roll < 0.5 ? 'sit' : roll < 0.75 ? 'lie' : 'stand';
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
  // 경계 장식 (17차): 해안 절벽과 산등성이에 바위 기둥 — 1층 현무암(틈에 용암) · 2층 안개 낀 바위산 · 3층 무너진 담
  const isBlk = (i: number, j: number) => at(i, j) === TI.block && !buildings.some((b) => i >= b.i0 && i < b.i0 + b.w && j >= b.j0 && j < b.j0 + b.d);
  for (const idx of cliff) { const i = idx % W, j = Math.floor(idx / W); if (isBlk(i, j) && (i + j) % 2 === 0) props.push({ i, j, kind: 'crag' }); }
  for (const idx of ridge) { const i = idx % W, j = Math.floor(idx / W); if (isBlk(i, j) && ((i + j) % 2 === 0 || hash2(i, j) < 0.25)) props.push({ i, j, kind: hash2(j, i) < 0.8 ? 'crag' : 'rock' }); }
  if (T === 'swamp') for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) {
    if (!isBlk(i, j) || cliff.has(j * W + i) || ridge.has(j * W + i)) continue;
    const shore = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([a, b2]) => at(i + a, j + b2) === TI.water);
    if (shore ? (i + j) % 2 === 0 : hash2(i * 3, j * 5) < 0.1) props.push({ i, j, kind: 'crag' });
  }
  // 1층 북쪽 불탄 도시 가장자리는 예전처럼 사각형 끝을 현무암으로 막는다
  if (CITY) for (let j = 0; j < CITY; j++) for (let i = 0; i < W; i++) if (edgeD(i, j) === EDGE - 1 && isBlk(i, j)) props.push({ i, j, kind: 'crag' });
  // ── 이어짐 확인: 마을에서 걸어서 못 가는 땅은 고개를 뚫어 잇고, 아주 작은 웅덩이 땅은 바위로 ──
  const pass = (t: number) => t === TI.lot || t === TI.park || t === TI.walk || t === TI.soi || t === TI.cross;
  const inBld = (i: number, j: number) => buildings.some((b) => i >= b.i0 && i < b.i0 + b.w && j >= b.j0 && j < b.j0 + b.d);
  const reach = new Uint8Array(W * H);
  const flood = () => {
    reach.fill(0);
    const q: number[] = [];
    const st = (door.j) * W + door.i;
    reach[st] = 1; q.push(st);
    while (q.length) { const k = q.pop()!; const i = k % W, j = (k - i) / W; for (const [a, b2] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const ii = i + a, jj = j + b2; if (ii < 0 || jj < 0 || ii >= W || jj >= H) continue; const kk = jj * W + ii; if (!reach[kk] && pass(tiles[kk])) { reach[kk] = 1; q.push(kk); } } }
  };
  for (let round = 0; round < 8; round++) {
    flood();
    // 못 가는 땅 덩어리 하나를 찾아 마을 쪽으로 곧게 뚫는다
    let pick = -1, best = 1e9;
    const seen = new Uint8Array(W * H);
    for (let k = 0; k < W * H; k++) {
      if (reach[k] || seen[k] || !pass(tiles[k])) continue;
      const comp: number[] = [k]; seen[k] = 1;
      for (let n = 0; n < comp.length; n++) { const c = comp[n], i = c % W, j = (c - i) / W; for (const [a, b2] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const ii = i + a, jj = j + b2; if (ii < 0 || jj < 0 || ii >= W || jj >= H) continue; const kk = jj * W + ii; if (!seen[kk] && !reach[kk] && pass(tiles[kk])) { seen[kk] = 1; comp.push(kk); } } }
      if (comp.length < 30) { for (const c of comp) tiles[c] = TI.block; continue; }
      for (const c of comp) { const i = c % W, j = (c - i) / W, dd = Math.hypot(i - C.i, j - C.j); if (dd < best) { best = dd; pick = c; } }
    }
    if (pick < 0) break;
    let i = pick % W, j = (pick - i) / W;
    for (let n = 0; n < W * 2; n++) {
      const di = Math.sign(C.i - i), dj = Math.sign(C.j - j);
      if (Math.abs(C.i - i) >= Math.abs(C.j - j)) i += di; else j += dj;
      const k = j * W + i;
      if (reach[k]) break;
      if (inBld(i, j)) break;
      if (tiles[k] === TI.water) tiles[k] = TI.cross; else if (tiles[k] === TI.block) { tiles[k] = TI.walk; ridge.delete(k); }
      for (let n2 = props.length - 1; n2 >= 0; n2--) if (props[n2].i === i && props[n2].j === j && (props[n2].kind === 'crag' || props[n2].kind === 'rock')) props.splice(n2, 1);
    }
  }
  flood();
  // 괴물이 나오는 자리: 휴식 공간에서 멀리
  const spawns: [number, number][] = [];
  for (let t = 0; spawns.length < 60 * A && t < 9000; t++) {
    const i = 4 + Math.floor(r() * (W - 8)), j = 4 + Math.floor(r() * (H - 8));
    const tt = at(i, j);
    if (reach[j * W + i] && (tt === TI.lot || tt === TI.park || tt === TI.walk || tt === TI.soi) && Math.hypot(i - C.i, j - C.j) > VR + 8 && Math.hypot(i - B.i, j - B.j) > 8 && (!TL || Math.hypot(i - TL.i, j - TL.j) > 14) && Math.hypot(i - D.i, j - D.j) > 6 && !(CITY && j < CITY + 2)) spawns.push([i, j]);
  }
  void ring;
  const z = finalize({
    id: `hell-${floor}`, W, H, tiles, buildings, props, lanes: [], door, spawn: door,
    hell: { floor, rest: { i: C.i, j: C.j, r: VR }, up: U, down: D, boss: B, talus: TL ?? undefined, spawns, exit, shape, souls, vendors, posts },
  });
  cache.set(floor, z);
  return z;
}
