// 48차: 들개 무리 — 방콕 소이·서울 골목 끝을 떼 지어 도는 떠돌이 개. 털빛은 넷 (누렁이 · 검둥이 · 흰둥이 · 얼룩이).
// 그림은 염소와 같은 방식: 2배 밀도 캔버스에 점으로 찍어 반으로 줄이고, 옆모습 하나를 좌우로 뒤집어 여덟 방향에 쓴다.
import { Texture } from 'pixi.js';
import type { CharSet, Frame, Anim, Dir } from './sprites.ts';

const W = 72, H = 52, FX = 36, FY = 46; // 캔버스와 발 자리
type Pose = { legs: number; head: number; lunge: number; lie: number; flinch: boolean };
export type DogCoat = 0 | 1 | 2 | 3;
const COATS: { fur: string; fur2: string; dark: string; belly: string; spot?: string }[] = [
  { fur: '#b8864e', fur2: '#9a6e3e', dark: '#6a4a2a', belly: '#d8b07a' }, // 누렁이
  { fur: '#2e2a26', fur2: '#221f1c', dark: '#141210', belly: '#4a443e' }, // 검둥이
  { fur: '#d8d0c2', fur2: '#bcb2a2', dark: '#8a8070', belly: '#ece6da' }, // 흰둥이
  { fur: '#d8d0c2', fur2: '#bcb2a2', dark: '#6a5a48', belly: '#ece6da', spot: '#4a3a2a' }, // 얼룩이
];

function drawDog(p: Pose, flip: boolean, coat: DogCoat): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const g = c.getContext('2d')!;
  if (flip) { g.translate(W, 0); g.scale(-1, 1); }
  const C = COATS[coat];
  const px = (x: number, y: number, w: number, h: number, col: string) => { g.fillStyle = col; g.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); };
  const ell = (cx: number, cy: number, rx: number, ry: number, col: string) => {
    g.fillStyle = col;
    for (let y = Math.floor(cy - ry); y <= cy + ry; y++) for (let x = Math.floor(cx - rx); x <= cx + rx; x++) {
      const dx = (x + 0.5 - cx) / rx, dy = (y + 0.5 - cy) / ry;
      if (dx * dx + dy * dy <= 1) g.fillRect(x, y, 1, 1);
    }
  };
  g.save();
  if (p.lie) { g.translate(FX, FY); g.rotate(p.lie * 1.4); g.translate(-FX, -FY + p.lie * 6); }
  const lx = p.lunge * 5, bob = p.legs % 2 ? -1 : 0;
  // 가는 다리 넷 (뒤 둘은 어둡게)
  const sw = [0, 3, 0, -3][p.legs % 4];
  for (const [x, s, back] of [[20, sw, true], [26, -sw, false], [42, -sw, true], [48, sw, false]] as const) {
    px(x + s * 0.5 + lx * 0.4, 32 + bob, 3, 12, back ? C.dark : C.fur2);
    px(x + s + lx * 0.4, 43 + bob, 4, 2, '#1a1612');
  }
  // 몸통: 마른 갈비뼈가 비치는 허리, 배는 밝게
  ell(35 + lx * 0.5, 27 + bob, 16, 7, C.fur2);
  ell(34 + lx * 0.5, 26 + bob, 15, 6, C.fur);
  ell(36 + lx * 0.5, 30 + bob, 11, 3, C.belly);
  for (let k = 0; k < 4; k++) px(30 + k * 3 + lx * 0.5, 25 + bob, 1, 4, C.fur2); // 갈비
  if (C.spot) { ell(28 + lx * 0.5, 24 + bob, 5, 3, C.spot); ell(43 + lx * 0.5, 27 + bob, 4, 3, C.spot); }
  // 꼬리: 낫처럼 말아 올린 (겁먹으면 다리 사이로)
  if (p.flinch) for (let k = 0; k < 6; k++) px(20 - k * 0.6 + lx * 0.4, 28 + k * 1.6 + bob, 2, 2, C.fur2);
  else for (let k = 0; k < 7; k++) px(19 - k * 0.8 + lx * 0.4, 24 - k * 1.3 + Math.max(0, k - 4) * 1.6 + bob, 2, 2, k > 4 ? C.fur2 : C.fur);
  // 머리: 짖거나 물 때 고개를 낮추고 입을 벌린다
  const hx = 52 + lx, hy = 19 + bob + p.head * 5 + (p.flinch ? -2 : 0);
  ell(48 + lx * 0.8, 23 + bob + p.head * 2, 6, 6, C.fur);
  ell(hx, hy, 6, 5, C.fur);
  ell(hx + 6, hy + 2, 4, 2.5, C.fur2); // 주둥이
  px(hx + 9, hy + 1, 2, 2, '#120e0c'); // 코
  if (p.lunge > 0.3) { px(hx + 4, hy + 4, 6, 2, '#5a1a1a'); px(hx + 5, hy + 4, 1, 1, '#f2ead8'); px(hx + 8, hy + 4, 1, 1, '#f2ead8'); } // 벌린 입 · 송곳니
  px(hx + 1, hy - 2, 2, 2, '#e8c23a'); px(hx + 2, hy - 1, 1, 1, '#0a0806'); // 눈
  // 귀: 쫑긋 (겁먹으면 뒤로 젖힌다)
  if (p.flinch) px(hx - 5, hy - 2, 5, 2, C.dark);
  else { px(hx - 3, hy - 7, 3, 4, C.fur2); px(hx - 2, hy - 8, 2, 2, C.dark); }
  g.restore();
  return c;
}

const cache = new Map<DogCoat, CharSet>();
/** 들개의 장면 묶음 (사람과 같은 CharSet — 걷기·서기·물기·맞기·쓰러짐) */
export function dogCharSet(coat: DogCoat): CharSet {
  const hit = cache.get(coat);
  if (hit) return hit;
  const frames = new Map<string, Frame>();
  const poses: Partial<Record<Anim, Pose[]>> = {
    idle: [{ legs: 0, head: 0, lunge: 0, lie: 0, flinch: false }],
    walk: [0, 1, 2, 3].map((k) => ({ legs: k, head: k % 2 ? 0.2 : 0, lunge: 0, lie: 0, flinch: false })),
    punch: [{ legs: 0, head: 0.3, lunge: -0.4, lie: 0, flinch: false }, { legs: 1, head: 0.8, lunge: 1, lie: 0, flinch: false }, { legs: 1, head: 0.5, lunge: 0.5, lie: 0, flinch: false }],
    hit: [{ legs: 0, head: -0.3, lunge: -0.4, lie: 0, flinch: true }],
    fall: [0.35, 0.7, 1].map((l) => ({ legs: 0, head: 0.5, lunge: 0, lie: l, flinch: true })),
  };
  const DIRS: Dir[] = ['se', 'sw', 'ne', 'nw', 's', 'e', 'n', 'w'];
  const leftward = new Set<Dir>(['sw', 'w', 'nw', 'n']);
  const counts: Partial<Record<Anim, number>> = {};
  for (const [an, list] of Object.entries(poses) as [Anim, Pose[]][]) {
    counts[an] = list.length;
    list.forEach((p, i) => {
      const tl = Texture.from(drawDog(p, true, coat)), tr = Texture.from(drawDog(p, false, coat));
      tl.source.scaleMode = 'nearest'; tr.source.scaleMode = 'nearest';
      for (const d of DIRS) frames.set(`${an}-${d}-${i}`, { tex: leftward.has(d) ? tl : tr, ax: (leftward.has(d) ? W - FX : FX) / W, ay: FY / H, w: W, h: H, k: 0.5 });
    });
  }
  const cs: CharSet = { mode: 'u', attack: 'punch', frames, counts, eight: true, masks: new Map() };
  cache.set(coat, cs);
  return cs;
}
