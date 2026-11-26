// 32차: 지도 밖 — 갈 수 없는 곳도 화면 끝까지 그린다 (그리기 전용: 들어가거나 부딪히지 않는다)
// 가장자리 m칸 안쪽을 거울 삼아 바깥에 땅·차선·건물을 비춘다. 지도 안의 빈 땅(자료가 끊긴 곳)은 12칸 동네로 지어 채운다.
import { mirror, tileAt, FILL_CELL, type Zone, type Building, type Lane, type Beyond } from './zone.ts';

/** 거울에 비추지 않는 건물: 하나뿐이어야 하는 곳 (우주새 · 내 집 · 지옥의 관청 · 좌판 · 우상) */
const ONLY_ONE = new Set(['ujusae', 'home', 'loan', 'hbank', 'atone', 'rebirth', 'terrace', 'goatroom']);
/** 가장자리에서 이만큼 안쪽 건물까지 비춘다 (휴대폰 세로 화면의 반보다 넉넉히) */
const DEPTH = 48;
const COLORS = ['#bfb39f', '#9b968c', '#c7a88a', '#d4d8d6', '#a89c8a', '#b8b0a2'];

const h01 = (a: number, b: number, c = 0) => { const s = Math.sin(a * 127.1 + b * 311.7 + c * 74.7) * 43758.5453; return s - Math.floor(s); };

export function beyondOf(z: Zone, m: number): { beyond: Beyond; ghosts: Building[] } {
  const W = z.W, H = z.H;
  // 1) 지도 안의 빈 땅: 12칸 동네마다 두 칸 골목 + 5칸짜리 건물 네 채 (모두 빈 칸 위에 설 때만)
  const fillers: Building[] = [];
  const empty = (i0: number, j0: number, w: number, d: number) => {
    if (i0 < 0 || j0 < 0 || i0 + w > W || j0 + d > H) return false;
    for (let j = j0; j < j0 + d; j++) for (let i = i0; i < i0 + w; i++) if (tileAt(z, i, j) !== 'void') return false;
    return true;
  };
  for (let cj = 0; cj * FILL_CELL < H; cj++) for (let ci = 0; ci * FILL_CELL < W; ci++) {
    for (const [di, dj] of [[0, 0], [5, 0], [0, 5], [5, 5]] as const) {
      const i0 = ci * FILL_CELL + 2 + di, j0 = cj * FILL_CELL + 2 + dj;
      if (!empty(i0, j0, 5, 5)) continue;
      const r = h01(i0, j0), tall = h01(j0, i0, 3);
      const w = r < 0.3 ? 4 : 5, d = r > 0.7 ? 4 : 5;
      fillers.push({ i0, j0, w, d, h: Math.round(36 + tall * tall * 190), cat: tall > 0.7 ? 'condo' : tall > 0.45 ? 'office' : 'generic', color: COLORS[Math.floor(r * COLORS.length)] });
    }
  }
  // 2) 거울: 건물을 가장자리 너머로 뒤집어 비춘다 (모서리 쪽은 두 번)
  const ghosts: Building[] = fillers.slice();
  const lo = m, hiI = W - m, hiJ = H - m;
  for (const b of [...z.buildings, ...fillers]) {
    if (ONLY_ONE.has(b.cat) || b.vend || b.hk === 'idol' || b.hk === 'stall' || b.hk === 'butcher') continue;
    const xs: (0 | 1 | 2)[] = [0], ys: (0 | 1 | 2)[] = [0];
    if (b.i0 < lo + DEPTH) xs.push(1);
    if (b.i0 + b.w > hiI - DEPTH) xs.push(2);
    if (b.j0 < lo + DEPTH) ys.push(1);
    if (b.j0 + b.d > hiJ - DEPTH) ys.push(2);
    for (const x of xs) for (const y of ys) {
      if (!x && !y) continue;
      const i0 = x === 1 ? 2 * lo - b.i0 - b.w : x === 2 ? 2 * hiI - b.i0 - b.w : b.i0;
      const j0 = y === 1 ? 2 * lo - b.j0 - b.d : y === 2 ? 2 * hiJ - b.j0 - b.d : b.j0;
      ghosts.push({ i0, j0, w: b.w, d: b.d, h: b.h, cat: b.cat, color: b.color, ...(b.hut ? { hut: true } : {}), ...(b.hk ? { hk: b.hk } : {}) });
    }
  }
  // 3) 차선도 거울에 (줄 j = 차가 달리는 줄 — 뒤집으면 2m-1-j)
  const lanes: Lane[] = [];
  const mi = (l: Lane, x: 0 | 1 | 2) => (x === 1 ? { i0: 2 * lo - 1 - l.i1, i1: 2 * lo - 1 - l.i0 } : x === 2 ? { i0: 2 * hiI - 1 - l.i1, i1: 2 * hiI - 1 - l.i0 } : { i0: l.i0, i1: l.i1 });
  for (const l of z.lanes) {
    const xs: (0 | 1 | 2)[] = [0, 1, 2], ys: (0 | 1 | 2)[] = [0];
    if (l.j < lo + DEPTH) ys.push(1);
    if (l.j > hiJ - DEPTH) ys.push(2);
    for (const x of xs) for (const y of ys) {
      if (!x && !y) continue;
      const j = y === 1 ? 2 * lo - 1 - l.j : y === 2 ? 2 * hiJ - 1 - l.j : l.j;
      lanes.push({ j, ...mi(l, x), dir: (x ? -l.dir : l.dir) as 1 | -1 });
    }
  }
  return { beyond: { m, lanes }, ghosts };
}

/** 거울에 비친 칸이 지도 안의 어느 칸인가 (그림 확인용) */
export function mirrored(z: Zone, i: number, j: number): [number, number] {
  const m = z.beyond?.m ?? 0;
  return [mirror(z.W, m, i), mirror(z.H, m, j)];
}
