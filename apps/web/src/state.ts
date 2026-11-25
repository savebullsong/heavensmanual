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
  /** 은행 통장: 죽어도 남는다 (영혼이 아니라 계정·기기에 붙음) */
  bank?: number;
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
  // 2단계: 지금 있는 세계와 지옥에서의 걸음
  realm?: 'real' | 'ghost' | 'hell' | 'heaven' | 'border'; // ghost = 예전 저장 (24차부터 border로 옮긴다)
  /** 24차 경계의 해변: 언제 왔는지 (깨달음 없는 자는 잠깐만) · 불다를 만났는지 */
  border?: { since: number; met?: boolean };
  /** 24차: 서울 달동네 골목에서 '내 집이 여기 있다…'를 이미 보았는가 (한 번만) */
  homeSeen?: boolean;
  adminTrip?: 'real' | 'ghost' | 'heaven' | 'hell'; // 관리자가 시찰(지옥 층 이동·천국)을 떠나기 전의 세계 (돌아갈 곳)
  /** 천국: 환생할 때 받을 선행 보너스 (영혼 경험치) */
  heaven?: { met?: boolean; admin?: boolean; adapted?: boolean; ywLost?: boolean; rites?: number }; // 21차: 행사에 다녀와 익숙해졌나 · 안내천사를 따돌렸나 · 다녀온 행사 수
  /** 19차 지옥면죄부: 앞으로 짓는 악행에서 지워 줄 남은 점수 (한 장 = 30, 최대 10장 = 300) */
  absolve?: number;
  /** 20차 훔치기: 처음 한 번은 가장 싼 무기를 반드시 훔친다 (그 뒤로는 값에 따라) */
  stoleOnce?: boolean;
  /** 20차: 우주새에서 훔친 일 — 다음에 들르면 미스 황(황혼)이 차갑게 맞는다 */
  grudge?: boolean;
  /** 19차 켈베로스 호출: 지옥 로비에서 사 온 횟수 (현실에서 부르면 10분 동안 함께 싸운다) */
  kerberos?: number;
  /** 지옥: 지금 층, 이번 지옥행에서 쓰러뜨린 층주, 노전(영혼에 붙어 다음 지옥행에도 남는다) */
  hell?: {
    floor: number; cleared: number[]; notes: number; met?: boolean;
    /** 지옥 은행에 맡긴 노전 (쓰러져도 남는다) */
    bank?: number;
    /** 속죄의 회당에 층마다 바친 노전 (다 차면 위층으로) */
    atone?: Record<number, number>;
    /** 이번 지옥행에서 통행세를 낸 층 (다시 지나갈 때는 받지 않는다) */
    paid?: number[];
    /** 2층 층주 구르마에게 준 먹이 수 (100이면 잠든다) */
    fed?: number;
  };
  /** 베스크에게 진 빚 (노전). 0이 되면 미납귀가 돌아간다 */
  debt?: number;
  /** 세계마다 우주새에 봉인된 물건 — 그 세계의 우주새에서 되찾는다 */
  vault?: Partial<Record<'real' | 'hell', Stash>>;
  /** 하루에 한도가 있는 선행 (기도 3 · 읽기 1 · 기부 20) */
  daily?: { d: string; pray: number; read: number; donate: number };
}
export interface Stash { bag: Record<string, number>; ammo: number }
export type Slot = 'weapon' | 'offhand' | 'head' | 'body' | 'hands' | 'legs' | 'shins' | 'feet';
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
