// 주요 인물 그림(대화창 초상화). 기본 그림은 public/portraits, 관리자 페이지에서 바꾼 그림이 있으면 그것을 쓴다
// sprite-* = 게임 속 도트 그림 (화가가 손본 그림으로 갈아 끼우는 칸). 지금 구운 그림과 크기가 똑같은 투명 PNG만 받는다
export const PORTRAIT_SLOTS = ['miss-hwang', 'yellow-wing', 'hwanghon', 'parrot', 'luen', 'pashar', 'goat-king', 'besk', 'talus', 'grandpa', 'bulda', 'yunae', 'yunae-teen', 'yunae-20s', 'yunae-30s', 'maskgirl', 'sprite-miss-hwang', 'sprite-hwanghon', 'sprite-parrot', 'sprite-parrot-up', 'sprite-besk', 'sprite-talus', 'sprite-bulda', 'sprite-maskgirl', 'sprite-yunae-teen', 'sprite-yunae-20s', 'sprite-yunae-30s', 'sprite-goat-king', 'bld-ujusae', 'bld-ujusae-night', 'bld-ujusae-heaven', 'bld-loan', 'bld-hell-1', 'bld-hell-2', 'bld-hell-3', 'bld-hell-4'] as const;
// bld-* = 움직이지 않는 고유 건물의 도트 그림 (우주새 낮·밤, 베스크 대부소). 캐릭터처럼 그려서 갈아 끼운다
export const SPRITE_SLOTS = ['sprite-miss-hwang', 'sprite-hwanghon', 'sprite-parrot', 'sprite-parrot-up', 'sprite-besk', 'sprite-talus', 'sprite-bulda', 'sprite-maskgirl', 'sprite-yunae-teen', 'sprite-yunae-20s', 'sprite-yunae-30s', 'sprite-goat-king', 'bld-ujusae', 'bld-ujusae-night', 'bld-ujusae-heaven', 'bld-loan', 'bld-hell-1', 'bld-hell-2', 'bld-hell-3', 'bld-hell-4'] as const;
export type PortraitSlot = (typeof PORTRAIT_SLOTS)[number];

/** 기본 그림이 있는 칸 (없는 칸은 관리자가 올리기 전까지 그림 없이 대화한다) */
export const DEFAULT_PORTRAITS: Partial<Record<PortraitSlot, string>> = {
  'miss-hwang': 'portraits/miss-hwang.webp',
  'yellow-wing': 'portraits/yellow-wing.webp',
  hwanghon: 'portraits/hwanghon.webp',
  luen: 'portraits/luen.webp', // 천국 환생관 루엔 (사용자 컨셉 아트: 흰 머리·별 가시 후광·날개·등불)
  pashar: 'portraits/pashar.webp',
  'goat-king': 'portraits/goat-king.webp', // 31차 염소대왕 (사용자 그림: 판관 모자 · 숫양 뿔 · 검붉은 관복 · 옥좌에 기대 턱을 괸 모습)
  maskgirl: 'portraits/maskgirl.webp', // 25차 지옥 1층 마스크 팔이 소녀 (사용자 컨셉 아트: 연료통 둘·화염방사기·검은 마스크 바구니) // 지옥 환생관 파샤르 (사용자 컨셉 아트: 잿빛 머리·검은 망토 코트·장부와 깃펜)
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

/** 그 인물의 지금 그림 주소. 없으면 null (27차: 유내의 나이별 칸이 비면 공통 '유내' 칸으로) */
export async function portraitUrl(slot: PortraitSlot): Promise<string | null> {
  overrides ??= fetchOverrides();
  const o = await overrides;
  const url = o[slot] ?? DEFAULT_PORTRAITS[slot] ?? null;
  if (!url && slot.startsWith('yunae-')) return o.yunae ?? DEFAULT_PORTRAITS.yunae ?? null;
  return url;
}

/** 대화가 열리기 전에 미리 받아 둔다 */
export function preloadPortrait(slot: PortraitSlot) {
  portraitUrl(slot).then((u) => {
    if (u) new Image().src = u;
  });
}
