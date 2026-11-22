// Heaven's Manual — 게임 규칙 (클라이언트와 서버가 함께 쓰는 판정 코드)
// 기준 문서: 통합 기획서 v1, 3장 영혼 시스템

export const STAT_KEYS = ['str', 'agi', 'vit', 'fai'] as const;
export type StatKey = (typeof STAT_KEYS)[number];
export type Stats = Record<StatKey, number>;

/** 스탯 한 개의 최대치 */
export const STAT_MAX = 99;
/** 영격이 1 오를 때 받는 스탯 포인트 */
export const POINTS_PER_RANK = 2;
/** 지옥 층 수 */
export const HELL_FLOORS = 13;

/** 이번 생에서 쌓인 선행·악행 점수 (한 번의 삶 단위로 새로 시작) */
export interface Deeds {
  good: number;
  evil: number;
}

export type Afterlife =
  | { world: 'heaven'; bonusSoulExp: number }
  | { world: 'ghost' }
  | { world: 'hell'; floor: number };

/** 악행 비율(%) = 악행 ÷ (선행 + 악행) × 100. 기록이 없으면 null */
export function evilRatio(d: Deeds): number | null {
  const total = d.good + d.evil;
  if (total <= 0) return null;
  return (d.evil / total) * 100;
}

/**
 * 지옥 시작 층 = ⌈(r − 50) / 50 × 13⌉  (r = 악행 비율, 50 초과일 때)
 * 예: 51% → 1층, 60% → 3층, 90% → 11층, 100% → 13층
 */
export function hellFloor(ratio: number): number {
  const f = Math.ceil(((ratio - 50) / 50) * HELL_FLOORS);
  return Math.min(HELL_FLOORS, Math.max(1, f));
}

/** 천국행 보너스 영혼 경험치 환산 비율 — 미정 (기획서 15장). 임시값 */
export const HEAVEN_BONUS_PER_GOOD = 1;

/** 사후 판정: 기록 없음·정확히 50% → 귀신, 50% 미만 → 천국, 50% 초과 → 지옥 */
export function judge(d: Deeds): Afterlife {
  const r = evilRatio(d);
  if (r === null || r === 50) return { world: 'ghost' };
  if (r < 50) return { world: 'heaven', bonusSoulExp: Math.floor(d.good * HEAVEN_BONUS_PER_GOOD) };
  return { world: 'hell', floor: hellFloor(r) };
}

/**
 * 영격 레벨업에 필요한 누적 영혼 경험치 — "아주 느리게" (곡선은 미정, 임시 식)
 * 영격 n → n+1 에 필요한 경험치 = 1000 × n^1.8
 */
export function soulExpToNext(rank: number): number {
  return Math.round(1000 * Math.pow(rank, 1.8));
}

/** 영혼 경험치를 더하고, 오른 영격 수와 남은 경험치를 돌려준다 */
export function addSoulExp(rank: number, exp: number, gained: number) {
  let r = rank;
  let e = exp + gained;
  let ups = 0;
  while (e >= soulExpToNext(r)) {
    e -= soulExpToNext(r);
    r += 1;
    ups += 1;
  }
  return { rank: r, exp: e, statPoints: ups * POINTS_PER_RANK };
}

export function newStats(): Stats {
  return { str: 1, agi: 1, vit: 1, fai: 1 };
}

/** 신앙 → 치명타 확률(%) — 임시 식, 기적 확률표는 미정 */
export function critChance(fai: number): number {
  return Math.min(50, fai * 0.5);
}

/** 민첩 → 회피율(%) — 임시 식 */
export function dodgeChance(agi: number): number {
  return Math.min(40, agi * 0.4);
}
