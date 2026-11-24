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
  | { world: 'heaven' }
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

// 19차: 천국에서 환생하는 혜택은 없다 — 천국을 떠나 다시 태어나는 것은 영혼의 강등이다 (환생관 루엔이 말린다)

/** 사후 판정: 기록 없음·정확히 50% → 귀신, 50% 미만 → 천국, 50% 초과 → 지옥 */
export function judge(d: Deeds): Afterlife {
  const r = evilRatio(d);
  if (r === null || r === 50) return { world: 'ghost' };
  if (r < 50) return { world: 'heaven' };
  return { world: 'hell', floor: hellFloor(r) };
}

/**
 * 영격 레벨업에 필요한 영혼 경험치 — "아주 힘들고 아주 느리게" (11월 23일 확정)
 * 영격 n → n+1 = 800 × n^1.7
 * 예: 1→2 800 · 5→6 12,341 · 10→11 40,095 · 30→31 259,535
 * 불량배 한 명(30)을 기준으로 영격 2까지 27명, 영격 10까지 누적 129,010
 */
export function soulExpToNext(rank: number): number {
  return Math.round(800 * Math.pow(rank, 1.7));
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

// ───────────────────────── 행위별 점수표 (11월 23일 확정) ─────────────────────────
// karma: good = 선행 점수, evil = 악행 점수, none = 카르마 변화 없음 · exp = 영혼 경험치
export type DeedKind = 'good' | 'evil' | 'none';
export interface DeedRule { kind: DeedKind; points: number; exp: number; note?: string }

export const DEED_TABLE = {
  // 선행
  counterWin: { kind: 'good', points: 2, exp: 20, note: '선제공격 없이 반격만 해서 싸움을 끝냄' },
  thugDown: { kind: 'good', points: 3, exp: 30, note: '불량배·건달 처치' },
  drunkDown: { kind: 'good', points: 1, exp: 10, note: '시비 거는 취객 제압 (약한 적)' },
  shadeDown: { kind: 'good', points: 1, exp: 8, note: '천국의 그림자(미련)를 흩음 (약한 적)' },
  robberDown: { kind: 'good', points: 4, exp: 45, note: '강도 처치 (17차)' },
  gangDown: { kind: 'good', points: 5, exp: 60, note: '범죄조직원(마피아) 처치' },
  criminalUserDown: { kind: 'good', points: 8, exp: 80, note: '범죄 표시가 된 유저 처치' },
  donate100: { kind: 'good', points: 1, exp: 5, note: '병원·학교 기부 ฿100마다 (하루 20점까지)' },
  pray: { kind: 'good', points: 1, exp: 5, note: '종교시설 기도 (하루 3번)' },
  readScripture: { kind: 'good', points: 1, exp: 10, note: '종교시설에서 읽기 5분 (하루 1번)' },
  hellAtone: { kind: 'good', points: 1, exp: 10, note: '지옥 속죄의 회당에 노전 1,000닢을 바칠 때마다' },
  // 악행
  firstStrike: { kind: 'evil', points: 2, exp: 10, note: '먼저 공격하기' },
  extort: { kind: 'evil', points: 3, exp: 30, note: '갈취 성공' },
  rob: { kind: 'evil', points: 4, exp: 40, note: '쓰러뜨리고 돈을 빼앗기' },
  steal: { kind: 'evil', points: 3, exp: 15, note: '가게에서 훔치기 (20차)' },
  suturerHit: { kind: 'evil', points: 4, exp: 40, note: '대식자 공격' },
  murder: { kind: 'evil', points: 10, exp: 100, note: '유저 살해 (밀쳐서 일으킨 사고사 포함)' },
  angelAssault: { kind: 'evil', points: 5, exp: 0, note: '천사 공격·유혹 — 현실로 강제 환생' },
  hellSoulHit: { kind: 'evil', points: 2, exp: 20, note: '지옥에서 다른 영혼 공격' },
  // 카르마 변화 없음
  hellMonster: { kind: 'none', points: 0, exp: 10, note: '지옥 괴물 처치 — 경험치 = 10 × 층' },
  labor: { kind: 'none', points: 0, exp: 0, note: '노동 — 돈만 번다' },
} as const satisfies Record<string, DeedRule>;
export type DeedKey = keyof typeof DEED_TABLE;

/** 같은 상대에게서 다시 경험치를 받으려면 기다려야 하는 시간(분) — 짜고 치는 반복 방지 */
export const SAME_TARGET_COOLDOWN_MIN = 60;
/** 하루에 기부로 얻을 수 있는 선행 점수 상한 — 돈으로 카르마를 사는 것 방지 */
export const DONATION_DAILY_CAP = 20;

/**
 * 선행·악행은 아주 조금씩 쌓인다 (17차): 표의 점수 × 0.2 (소수 첫째 자리까지)
 * 예: 불량배 처치 +0.6 · 살해 +2 · 속죄 헌금 1,000닢 +0.2. 심판은 이번 생의 비율로
 */
export const KARMA_SCALE = 0.2;
export const karmaPoints = (key: DeedKey) => Math.round(DEED_TABLE[key].points * KARMA_SCALE * 10) / 10;
/** 0.6 · 2 · 12.4 처럼 보이게 */
export const fmtKarma = (n: number) => String(Math.round(n * 10) / 10);

/** 행위 하나를 기록에 더한다. 지옥 괴물은 층수를 곱한다 */
export function applyDeed(d: Deeds, key: DeedKey, opt: { floor?: number; share?: number } = {}): { deeds: Deeds; exp: number } {
  const rule: DeedRule = DEED_TABLE[key];
  const full = key === 'hellMonster' ? rule.exp * Math.max(1, opt.floor ?? 1) : rule.exp;
  // share: 함께 싸우다 경비병이 마무리한 괴물은 내가 준 피해만큼만 (0~1)
  const exp = opt.share !== undefined ? Math.round(full * Math.max(0, Math.min(1, opt.share))) : full;
  const deeds = { ...d };
  const pts = karmaPoints(key);
  if (rule.kind === 'good') deeds.good = Math.round((deeds.good + pts) * 10) / 10;
  else if (rule.kind === 'evil') deeds.evil = Math.round((deeds.evil + pts) * 10) / 10;
  return { deeds, exp };
}

// ───────────────────────── 체력 · 위험 상태 · 사고사 ─────────────────────────
/** 최대 체력 = 1000 + 생명력 × 20 */
export function maxHp(vit: number): number {
  return 1000 + vit * 20;
}
/** 체력이 25% 이하로 떨어지면 위험 상태 */
export const DANGER_RATIO = 0.25;
export function isDanger(hp: number, max: number): boolean {
  return hp <= max * DANGER_RATIO;
}
/** 위험 상태에서는 걸음이 느려진다 */
export const DANGER_SPEED = 0.8;
/** 차에 치였을 때 체력 피해 (최대 체력 비율) */
export const CAR_HIT_DAMAGE = 0.3;

/**
 * 차에 치임 (11월 23일 확정)
 * 위험 상태가 아니면 크게 다치고 위험 상태로 떨어질 뿐 죽지 않는다.
 * 위험 상태에서 무리하게 다니다 다시 치이면 사망한다.
 * 높은 곳에서 떨어질 때도 같은 규칙을 쓴다.
 */
export function carHit(hp: number, max: number): { hp: number; dead: boolean } {
  if (isDanger(hp, max)) return { hp: 0, dead: true };
  return { hp: Math.max(1, Math.round(hp - max * CAR_HIT_DAMAGE)), dead: false };
}
export const fallHit = carHit;

// ───────────────────────── 기적 (모두 신앙과 연결, 11월 23일 확정) ─────────────────────────
/** 확률적 부활(%) = 2 + 신앙 × 0.25, 최대 25. 한 번 일어나면 24시간 동안 다시 일어나지 않는다 */
export function resurrectionChance(fai: number): number {
  return Math.min(25, 2 + fai * 0.25);
}
export const RESURRECTION_COOLDOWN_H = 24;
/** 부활하면 최대 체력의 30%로 일어난다 */
export const RESURRECTION_HP = 0.3;

/** 신앙 → 치명타 확률(%) = 1 + 신앙 × 0.3, 최대 30. 치명타는 피해 2배 */
export function critChance(fai: number): number {
  return Math.min(30, 1 + fai * 0.3);
}
export const CRIT_MULTIPLIER = 2;

/** 민첩 → 회피율(%) = 민첩 × 0.4, 최대 40 */
/**
 * 17차 D&D식 회피: 공격하는 쪽이 d20 + 명중 보너스를 굴려 방어 등급(AC) 이상이면 맞는다.
 * AC = 10 + 방어구 방어력 합 ÷ 2 + 민첩 ÷ 5. 1은 늘 빗나가고 20은 늘 맞는다 (20은 치명타)
 * 맞으면 피해는 무작위 그대로 (방어력은 피해를 줄이지 않는다 · 피해 감소 물건만 줄인다)
 */
export function armorClass(def: number, agi: number): number {
  return 10 + Math.floor(def / 2) + Math.floor(agi / 5);
}
export function rollToHit(bonus: number, ac: number, roll = 1 + Math.floor(Math.random() * 20)): { hit: boolean; roll: number; nat20: boolean } {
  if (roll === 1) return { hit: false, roll, nat20: false };
  if (roll === 20) return { hit: true, roll, nat20: true };
  return { hit: roll + bonus >= ac, roll, nat20: false };
}
/** 예전 회피 확률 (17차부터 쓰지 않음 — armorClass 로) */
export function dodgeChance(agi: number): number {
  return Math.min(40, agi * 0.4);
}

/** 회복력: 싸움에서 벗어난 뒤 1분마다 최대 체력의 2% × (1 + 신앙/100) */
export function regenPerMinute(max: number, fai: number): number {
  return max * 0.08 * (1 + fai / 100); // 밖에서는 약 12분이면 다 찬다
}
/** 휴식처(지옥 마을·우주새·종교시설·은행·병원·약국 안)에서는 약 50초면 다 찬다 */
export function restRegenPerMinute(max: number, fai: number): number {
  return max * 1.2 * (1 + fai / 100);
}
/** 싸움에서 벗어났다고 보는 시간(초) */
export const OUT_OF_COMBAT_S = 8;

/** 기도 응답: 기도할 때 (5 + 신앙 × 0.2)% 확률로 체력 30% 회복, 시설마다 하루 한 번 */
export function prayerAnswerChance(fai: number): number {
  return Math.min(25, 5 + fai * 0.2);
}

/** 지옥 방어막: 같은 층에 30분 넘게 갇히면 생김. 지속 시간(초) = 60 + 신앙 */
export const HELL_SHIELD_STUCK_MIN = 30;
export function hellShieldSeconds(fai: number): number {
  return 60 + fai;
}
