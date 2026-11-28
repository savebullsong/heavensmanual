// 이 브라우저에만 남는 가벼운 저장 (서버 저장은 1단계-B에서)
import type { Look, Arrival } from './character.ts';
import type { Lang } from './i18n.ts';

export interface Save {
  look?: Look; // 이번 생의 몸 (문을 나서며 정한다)
  arrival?: { kind: Arrival; look: Look }; // 우주새에 처음 나타난 모습 (무작위)
  region?: string;
  visits: number;
  lang?: Lang;
  // 이번 생 (죽으면 사라진다)
  wallet?: number;
  /** 45차: 지금 세계가 아닌 쪽의 지갑 (현실 · 천국) */
  wallets?: { real?: number; heaven?: number };
  /** 45차: 노을과 지옥 정벌 중 (천국에서 떠나 고른 층에서 싸운다 · 한 번 쓰러지면 끝) */
  crusade?: { floor: number; at: number; got: Record<string, number>; kills: number; /** 떠나기 전 지옥 진행 (돌아오면 되돌린다) */ snap: unknown; exp0: number; rank0: number };
  /** 은행 통장: 죽어도 남는다 (영혼이 아니라 계정·기기에 붙음) */
  bank?: number;
  /** 50차: 이자를 마지막으로 셈한 달 ('2026-11') · 한 달 투자 상품 (만기 시각 ms) */
  bankMon?: string;
  invest?: { amt: number; at: number; due: number; kind?: 'safe' | 'mid' | 'risky' }[];
  bag?: Record<string, number>;
  equip?: Partial<Record<Slot, string>>;
  /** 마지막으로 있던 곳: 다시 열면 그 자리에서 (가게 안에서 일하던 중이면 계속 일한다) */
  pos?: { w: 'real' | 'ghost' | 'hell' | 'heaven' | 'border'; z: string; i: number; j: number; f?: number; k?: number; work?: boolean };
  /** 빠른 칸에 끼운 소비품 (누르면 바로 먹기) */
  quick?: string;
  ammo?: number;
  /** 화살 (활) */
  arrows?: number;
  arrowKey?: string; // 24차: 시위에 건 화살 종류 (마지막에 산 화살)
  /** 44차 화살통: 시위에 걸지 않은 다른 화살 종류 (종류 → 개수) */
  quiver?: Record<string, number>;
  hp?: number;
  /** 이번 생의 선행·악행 (천국·지옥 심판은 이번 생으로) */
  deeds?: { good: number; evil: number };
  /** 모든 생에 걸쳐 쌓인 선행·악행 (영혼의 기록) */
  deedsAll?: { good: number; evil: number };
  // 영혼 (환생해도 남는다)
  soul?: { rank: number; exp: number; stats?: { str: number; agi: number; vit: number; fai: number } };
  // 비회원: 처음 거리로 나선 뒤 지난 시간(초)과 미스 황의 전화
  streetSecs?: number;
  called?: boolean;
  /** 48차: 미가입으로 하루 넘게 비웠다 돌아온 횟수 · 마지막 연락(전화·천국에서 말 걸기) 뒤 거리에서 보낸 초 */
  comeback?: number;
  contactSecs?: number;
  // 2단계: 지금 있는 세계와 지옥에서의 걸음
  realm?: 'real' | 'ghost' | 'hell' | 'heaven' | 'border'; // ghost = 예전 저장 (24차부터 border로 옮긴다)
  /** 24차 경계의 해변: 언제 왔는지 (깨달음 없는 자는 잠깐만) · 불다를 만났는지 */
  border?: { since: number; met?: boolean; still?: boolean; told?: boolean }; // 43차: still = 뱃속에서 죽어 왔다 · told = 불다가 그네 이야기를 했다
  /** 24차: 서울 달동네 골목에서 '내 집이 여기 있다…'를 이미 보았는가 (한 번만) */
  homeSeen?: boolean;
  /** 43차: 집에 들어간 서울 날짜 (하루에 한 번만) */
  homeDay?: string;
  /** 43차: 다시 태어난 뒤 집의 회상이 잦은 남은 횟수 · 골목에서 낯익음을 느낄 차례 */
  bond?: number; bondAlley?: boolean;
  /** 40차 유내 미용실: 원장에게 유내를 물은 횟수 · 들어가 본 적 있는가 */
  ysAsk?: number; ysSeen?: boolean;
  adminTrip?: 'real' | 'ghost' | 'heaven' | 'hell'; // 관리자가 시찰(지옥 층 이동·천국)을 떠나기 전의 세계 (돌아갈 곳)
  /** 천국: 환생할 때 받을 선행 보너스 (영혼 경험치) */
  heaven?: { met?: boolean; admin?: boolean; adapted?: boolean; ywLost?: boolean; rites?: number; noeulMet?: boolean; acc?: 'lover' | 'friend' | 'family' | 'alone'; svcDay?: string; homeSeen?: boolean; praise?: number; gifts?: number; dates?: { day: string; keys: string[]; n: number } }; // 35차 acc = 아큐버스와 정한 사이 // 21차: 행사에 다녀와 익숙해졌나 · 안내천사를 따돌렸나 · 다녀온 행사 수
  /** 52차 천국 1층 주민센터 번호표 (n = 내 번호 · from = 뽑을 때 창구 번호 · at = 불리는 때, 실제 시간 5분 뒤) · 구내식당 배급 받은 때 */
  hticket?: { n: number; from: number; at: number; called?: boolean };
  /** 53차 천국의 폭력: 이번 기회에서 몇 번 쳤나 · 마지막 기회를 받았나 · 지하 감옥(풀려나는 때) · 환생 로비로 쫓겨났나 · 황색날개가 징벌로 자리를 비우는 때 · 돌아와 징벌 얘기를 할 차례 */
  pastItems?: string[]; pastFoundDay?: string; // 54차 지난 생의 물건 (쓰레기장)
  hfurnPos?: Record<string, [number, number]>; // 54차 오두막 가구를 옮긴 자리 (자리 종류 → 칸 밀기)
  twinHid?: { key: string; n: number; told?: boolean }; twinLock?: number; twinLockDay?: string; // 54차 쌍둥이 장난
  callDeclined?: number; // 54차 미스 황 · 황혼 전화를 거절한 횟수
  repairDue?: number; repairDone?: boolean; hutWater?: boolean; // 54차 수리 천사
  hstrike?: { n: number; last?: boolean; prison?: number; prisonAt?: number; scrawled?: string; exiled?: boolean; ywAway?: number; ywTell?: boolean };
  hmealAt?: number;
  /** 52차 먹이 주기: 그날 준 횟수 (선행은 하루 세 번까지) */
  feedDay?: string; feedN?: number;
  /** 52차 휴대전화: 오늘 전화를 받아 준 사람 · 인물들이 보낸 문자 · 다음 문자가 올 때 · 유내를 만났나 */
  phone?: { day?: string; answered?: Record<string, number>; texts?: { from: string; body: string; at: number; seen?: boolean }[]; nextText?: number; yunae?: boolean };
  /** 19차 지옥면죄부: 앞으로 짓는 악행에서 지워 줄 남은 점수 (한 장 = 30, 최대 10장 = 300) */
  absolve?: number;
  /** 33차: 염소대왕의 방 환전상 — 이번 지옥길(gk = 상담 번호)에 바꾼 이승 돈과 그때 통장 */
  xch?: { gk: number; base: number; used: number };
  /** 33차: 대장간 틀에 끼워 둔 템브라 파편 수 (13이면 템브라 하나) */
  tasm?: number;
  /** 34차 관리자 경제 통계: 날짜별(YYYY-MM-DD) 들어온 돈·나간 돈 (현실 e·s, 지옥 he·hs, 갈래별) · 논 시간(초) — 최근 14일 */
  eco?: Record<string, { e: Record<string, number>; s: Record<string, number>; he: Record<string, number>; hs: Record<string, number>; t: number }>;
  /** 34차 앵무새 먹이: 준 횟수 (108·144번째에 짧은 장면, 144 다음은 다시 1부터) · 34차 칼드렉의 완성 템브라: 마지막으로 산 날 */
  parrotFed?: number;
  /** 43차: 앵무새에게 마지막으로 먹이를 준 때 (30분 동안 비싼 물건 수수료 2% 덜) */
  parrotAt?: number;
  ferumDay?: number;
  ferumMet?: boolean;
  /** 34차 보관 우리: 늘린 칸 수 (기본 칸 + 늘린 칸) */
  cageExtra?: Partial<Record<'real' | 'hell', number>>;
  /** 20차 훔치기: 처음 한 번은 가장 싼 무기를 반드시 훔친다 (그 뒤로는 값에 따라) */
  stoleOnce?: boolean;
  /** 20차: 우주새에서 훔친 일 — 다음에 들르면 미스 황(황혼)이 차갑게 맞는다 */
  grudge?: boolean;
  /** 19차 켈베로스 호출: 지옥 로비에서 사 온 횟수 (현실에서 부르면 10분 동안 함께 싸운다) */
  kerberos?: number;
  /** 지옥: 지금 층, 이번 지옥행에서 쓰러뜨린 층주, 노전(영혼에 붙어 다음 지옥행에도 남는다) */
  hell?: {
    floor: number; cleared: number[]; notes: number; met?: boolean;
    /** 49차: 층마다 쓰러진 층주가 엘리베이터로 돌아오는 시각(ms) */
    bossBack?: Record<number, number>;
    /** 지옥 은행에 맡긴 노전 (쓰러져도 남는다) */
    bank?: number;
    /** 50차: 보관료를 마지막으로 뗀 때(ms) · 지난번 들른 뒤로 빠진 보관료 · 오르멧에게 베여 빠진 몫 (다음에 은행에 가면 보인다) */
    bankAt?: number; feeSeen?: number; oremetCut?: number; feeFree?: number; // 52차 보관료 면제 증서가 덮는 때까지
    /** 속죄의 회당에 층마다 바친 노전 (다 차면 위층으로) */
    atone?: Record<number, number>;
    /** 이번 지옥행에서 통행세를 낸 층 (다시 지나갈 때는 받지 않는다) */
    paid?: number[];
    /** 2층 층주 구르마에게 준 먹이 수 (100이면 잠든다) */
    fed?: number;
    /** 25차: 이 영혼이 가 본 가장 깊은 층 (계단으로는 여기까지만 내려간다 · 다음 생에도 남는다) */
    deepest?: number;
    /** 43차: 5층 인형술사 마리를 만났다 */
    mariMet?: boolean;
    /** 43차: 5층 상승 시련(맨얼굴)을 통과했다 */
    bared?: boolean;
    /** 45차: 층마다 쓰러진 횟수 (열 번이면 악업이 씻겨 위층에서 깨어난다) */
    deaths?: Record<number, number>;
    /** 45차: 죽음으로 씻겨 올라온 가장 얕은 층 · 그때의 업이 가리키던 층 (이보다 깊은 악업을 새로 지으면 다시 가라앉는다) */
    washed?: number; washFrom?: number;
  };
  /** 26차: 환생 상담에서 미리 정한 다음 생 — 처음 모습의 운, 고른 몸, 도시, 선업으로 산 물건 */
  nextLife?: { kind: import('./character.ts').Arrival; look: import('./character.ts').Look; region: string; bag: Record<string, number>; /** 37차 선업의 값 (바트 셈) */ cash?: number };
  /** 26차: 방금 환생해 몸이 미리 정해진 채 우주새에 왔다 (나갈 때 '나는 누구였지.'만) */
  freshLife?: boolean;
  /** 27차: 저격총탄 */
  rifle?: number;
  /** 26차: 초심자 야구 배트를 이미 받았다 (단 한 번) */
  batGiven?: boolean;
  /** 25차: 화살·탄약을 빼 두었다 (활·총이 쏘지 않는다) */
  unloaded?: boolean;
  /** 25차 화염방사기: 그날(UTC 날짜) 쓴 연료 초 (하루 300초) */
  flamer?: { d: string; used: number };
  /** 베스크에게 진 빚 (노전). 0이 되면 미납귀가 돌아간다 */
  debt?: number;
  /** 44차: 최근에 빌린 것 (1분 안이면 원금만 돌려주고 없던 일로) */
  loans?: { n: number; at: number }[];
  /** 44차: 쌓인 빚을 한 번 지웠다 */
  debtReset44?: boolean;
  /** 세계마다 우주새에 봉인된 물건 — 그 세계의 우주새에서 되찾는다 */
  vault?: Partial<Record<'real' | 'hell', Stash>>;
  /** 55차: 지옥에서 떨군 채 아무도 줍지 않은 물건 — 황혼이 거둬 두었다 (수수료를 내고 찾는다) */
  hlost?: Record<string, number>;
  /** 55차: 천국에 몇 번째 와 있는가 · 스탯을 다시 빚은 천국행 번호 (천국행 한 번에 한 번) */
  heavenTrip?: number; statResetTrip?: number;
  /** 55차 현실 PK: 오늘 해친 사람 수 · 대식자에게 쫓기는 중 · 선한 자의 보호 */
  pk?: { day: string; n: number; ids: string[] }; resAt?: number;
  /** 55차 상점 '대화하기': '당신은 누구예요?'를 물은 횟수 (세계마다 답이 이어진다) */
  chatWho?: Partial<Record<'real' | 'hell' | 'heaven', number>>;
  /** 30차 내구도: 쓰고 있는 장비(열쇠)마다 남은 내구도 — 없으면 새것 */
  dura?: Record<string, number>;
  /** 35차: 내구도 셈이 바뀐 판 (2 = 더 오래 가는 셈, 무기는 바닥나면 박살) */
  duraV?: number;
  /** 36차: 바뀐 조작 안내를 보였다 */
  ctlHint?: number;
  /** 35차 내 집 (방콕 콘도 · 서울 아파트) — 통장처럼 다음 생에도 남는다 */
  homes?: { bkk?: boolean; seoul?: boolean };
  /** 35차 가구점에서 산 가구 (가진 집에 저절로 놓인다) */
  furn?: string[];
  /** 47차: 천국 가구점에서 산 가구 (구름 위 내 오두막) */
  hfurn?: string[];
  /** 47차: 산 비행기 표 (가는 도시) */
  ticket?: 'bkk' | 'seoul';
  /** 31차 필드 보스: 나와 있는 자리·체력(alive) · 다시 나올 수 있는 때(due) · 지옥은 그날(day)에 쓰러졌는지(dead) */
  fb?: Record<string, { alive?: { zone: string; i: number; j: number; hp: number }; due?: number; day?: string; dead?: boolean }>;
  /** 31차: 염소대왕을 만난 횟수 (영혼) · 마지막으로 머문 때 · 이 기기에서 한 시간(초) */
  gk?: number;
  /** 31차: 142층 염소대왕의 방에서 상담을 기다리는 중 (창을 닫았다 열어도 그 방에서) */
  gkWait?: { reason: 'death' | 'chose' | 'returned'; want: number; done?: boolean };
  seen?: number;
  played?: number;
  /** 하루에 한도가 있는 선행 (기도 3 · 읽기 1 · 기부 20) */
  daily?: { d: string; pray: number; read: number; donate: number; /** 45차: 오늘 운동한 분 (헬스장 · 도장) */ train?: number; /** 54차 도장 대련에서 이겼다 */ sparWon?: boolean };
}
export interface Stash { bag: Record<string, number>; ammo: number; /** 45차: 쓰러져 떨군 채 우리로 온 것 (되찾을 때 원가의 절반) */ lost?: Record<string, number> }
export type Slot = 'weapon' | 'offhand' | 'head' | 'body' | 'hands' | 'legs' | 'shins' | 'feet' | 'back' | 'ring' | 'neck' | 'ear'; // 50차: 등(망토·외투·판초·담요) · 장신구 셋 (몸에 그리지 않는다)
// v2: 작은 캐릭터와 '처음 모습' 시나리오로 바뀌어 예전 저장은 새로 시작한다
const KEY = 'heavensmanual.save.v2';

export function load(): Save {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return { visits: 0, ...JSON.parse(raw) };
  } catch {
    /* 저장소를 쓸 수 없는 환경 */
  }
  return { visits: 0 };
}

export function save(s: Save) {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    /* 무시 */
  }
}
