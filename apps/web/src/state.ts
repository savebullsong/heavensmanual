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
  pos?: { w: 'real' | 'ghost' | 'hell' | 'heaven'; z: string; i: number; j: number; f?: number; k?: number; work?: boolean };
  /** 빠른 칸에 끼운 소비품 (누르면 바로 먹기) */
  quick?: string;
  ammo?: number;
  hp?: number;
  deeds?: { good: number; evil: number };
  // 영혼 (환생해도 남는다)
  soul?: { rank: number; exp: number; stats?: { str: number; agi: number; vit: number; fai: number } };
  // 비회원: 처음 거리로 나선 뒤 지난 시간(초)과 미스 황의 전화
  streetSecs?: number;
  called?: boolean;
  // 2단계: 지금 있는 세계와 지옥에서의 걸음
  realm?: 'real' | 'ghost' | 'hell' | 'heaven';
  adminTrip?: 'real' | 'ghost' | 'heaven'; // 관리자가 지옥 층 이동으로 들어오기 전의 세계 (시찰에서 돌아갈 곳)
  /** 천국: 환생할 때 받을 선행 보너스 (영혼 경험치) */
  heaven?: { bonus: number; met?: boolean };
  /** 지옥: 지금 층, 이번 지옥행에서 쓰러뜨린 층주, 노전(영혼에 붙어 다음 지옥행에도 남는다) */
  hell?: { floor: number; cleared: number[]; notes: number; met?: boolean };
  /** 베스크에게 진 빚 (노전). 0이 되면 미납귀가 돌아간다 */
  debt?: number;
  /** 세계마다 우주새에 봉인된 물건 — 그 세계의 우주새에서 되찾는다 */
  vault?: Partial<Record<'real' | 'hell', Stash>>;
  /** 하루에 한도가 있는 선행 (기도 3 · 읽기 1 · 기부 20) */
  daily?: { d: string; pray: number; read: number; donate: number };
}
export interface Stash { bag: Record<string, number>; ammo: number }
export type Slot = 'weapon' | 'head' | 'body' | 'hands' | 'legs' | 'shins' | 'feet';
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
