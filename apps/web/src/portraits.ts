// 주요 인물 그림(대화창 초상화). 기본 그림은 public/portraits, 관리자 페이지에서 바꾼 그림이 있으면 그것을 쓴다
// sprite-* = 게임 속 도트 그림 (화가가 손본 그림으로 갈아 끼우는 칸. 투명 PNG, 발 = 그림 아래 가운데)
export const PORTRAIT_SLOTS = ['miss-hwang', 'yellow-wing', 'hwanghon', 'parrot', 'luen', 'pashar', 'goat-king', 'sprite-miss-hwang', 'sprite-parrot'] as const;
export type PortraitSlot = (typeof PORTRAIT_SLOTS)[number];

/** 기본 그림이 있는 칸 (없는 칸은 관리자가 올리기 전까지 그림 없이 대화한다) */
export const DEFAULT_PORTRAITS: Partial<Record<PortraitSlot, string>> = {
  'miss-hwang': 'portraits/miss-hwang.webp',
  'yellow-wing': 'portraits/yellow-wing.webp',
  hwanghon: 'portraits/hwanghon.webp',
};

let overrides: Promise<Partial<Record<PortraitSlot, string>>> | null = null;

function fetchOverrides(): Promise<Partial<Record<PortraitSlot, string>>> {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), 3000);
  return fetch('api/portraits', { signal: ctl.signal })
    .then((r) => (r.ok && (r.headers.get('content-type') ?? '').includes('json') ? r.json() : { slots: {} }))
    .then((j: { slots?: Record<string, string> }) => (j.slots ?? {}) as Partial<Record<PortraitSlot, string>>)
    .catch(() => ({}))
    .finally(() => clearTimeout(timer));
}

/** 그 인물의 지금 그림 주소. 없으면 null */
export async function portraitUrl(slot: PortraitSlot): Promise<string | null> {
  overrides ??= fetchOverrides();
  const o = await overrides;
  return o[slot] ?? DEFAULT_PORTRAITS[slot] ?? null;
}

/** 대화가 열리기 전에 미리 받아 둔다 */
export function preloadPortrait(slot: PortraitSlot) {
  portraitUrl(slot).then((u) => {
    if (u) new Image().src = u;
  });
}
