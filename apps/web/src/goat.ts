// 24차: 현실을 떠도는 사나운 염소 (염소대왕의 현실 모습이라는 소문). 목에 놋쇠 이름표 —
// 살펴보면 "우주새. 당신이 찾는 평생의 동반자." 사람을 보면 들이받고, 죽기 직전엔 믿기지 않게 빨리 달아난다.
// 그림은 2배 밀도 캔버스에 점으로 찍고 반으로 줄여 보인다 (인물과 같은 밀도). 옆모습 하나를 좌우로 뒤집어 여덟 방향에.
import { Texture } from 'pixi.js';
import type { CharSet, Frame, Anim, Dir } from './sprites.ts';

const W = 100, H = 76, FX = 50, FY = 66; // 캔버스와 발 자리
type Pose = { legs: number; head: number; lunge: number; lie: number; flinch: boolean };

function drawGoat(p: Pose, flip: boolean): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const g = c.getContext('2d')!;
  if (flip) { g.translate(W, 0); g.scale(-1, 1); }
  const px = (x: number, y: number, w: number, h: number, col: string) => { g.fillStyle = col; g.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); };
  const ell = (cx: number, cy: number, rx: number, ry: number, col: string) => {
    g.fillStyle = col;
    for (let y = Math.floor(cy - ry); y <= cy + ry; y++) for (let x = Math.floor(cx - rx); x <= cx + rx; x++) {
      const dx = (x + 0.5 - cx) / rx, dy = (y + 0.5 - cy) / ry;
      if (dx * dx + dy * dy <= 1) g.fillRect(x, y, 1, 1);
    }
  };
  const FUR = '#cfc6b4', FUR2 = '#b2a894', FUR3 = '#8a7e6c', DARK = '#3a3028', HORN = '#4a4036', HORN2 = '#6e6252', HOOF = '#1e1a16', EYE = '#e8c23a';
  g.save();
  if (p.lie) { g.translate(FX, FY); g.rotate(p.lie * 1.35); g.translate(-FX, -FY + p.lie * 10); }
  const lx = p.lunge * 6, bob = p.legs % 2 ? -1 : 0;
  // 다리 넷 (뒤 둘은 어둡게): 걸을 때 앞뒤로
  const sw = [0, 3, 0, -3][p.legs % 4];
  for (const [x, s, back] of [[30, sw, true], [38, -sw, false], [58, -sw, true], [66, sw, false]] as const) {
    const col = back ? FUR3 : FUR2;
    px(x + s * 0.5 + lx * 0.4, 46 + bob, 5, 16, col);
    px(x + s + lx * 0.4, 60 + bob, 5, 3, HOOF);
  }
  // 몸통: 텁수룩한 털, 배 아래로 늘어진 털 술
  ell(48 + lx * 0.5, 40 + bob, 23, 11, FUR2);
  ell(47 + lx * 0.5, 38 + bob, 22, 10, FUR);
  for (let k = 0; k < 9; k++) px(30 + k * 4 + lx * 0.5, 47 + bob + (k % 2), 3, 4, FUR2);
  for (let k = 0; k < 14; k++) px(28 + ((k * 7) % 38) + lx * 0.5, 32 + ((k * 5) % 12) + bob, 2, 1, '#e2dacb');
  // 꼬리 (짧게 치켜든)
  px(24 + lx * 0.4, 30 + bob, 4, 6, FUR); px(23 + lx * 0.4, 28 + bob, 3, 3, FUR2);
  // 목과 머리: 들이받을 때 고개를 숙이고 앞으로
  const hx = 70 + lx, hy = 26 + bob + p.head * 9 + (p.flinch ? -3 : 0);
  ell(64 + lx * 0.8, 34 + bob + p.head * 3, 8, 9, FUR);
  ell(hx, hy, 9, 7, FUR);
  ell(hx + 7, hy + 4, 6, 4, FUR2); // 주둥이
  px(hx + 11, hy + 3, 2, 2, DARK); // 콧구멍
  // 턱수염
  for (let k = 0; k < 5; k++) px(hx + 3 + k, hy + 8 + k * 1.4, 2, 2, k > 2 ? '#a89c88' : '#d8d0c2');
  // 눈: 노란 홍채에 가로로 긴 검은 동공 (소름 끼치게)
  px(hx + 1, hy - 3, 5, 3, EYE); px(hx + 2, hy - 2, 4, 1, '#0a0806');
  // 뿔: 뒤로 휘어 감긴 굵은 뿔 (마디)
  for (let k = 0; k < 10; k++) { const a = k / 9; px(hx - 2 - a * 14, hy - 6 - Math.sin(a * 2.6) * 9, 4 - a * 1.5, 3, k % 2 ? HORN : HORN2); }
  px(hx - 4, hy - 7, 2, 2, '#2a221c');
  // 귀
  px(hx - 7, hy - 2, 6, 3, FUR2);
  // 목걸이와 놋쇠 이름표 (우주새)
  px(60 + lx * 0.8, 36 + bob + p.head * 3, 10, 2, '#8a2a1e');
  px(64 + lx * 0.8, 38 + bob + p.head * 3, 5, 5, '#d9a83a'); px(65 + lx * 0.8, 39 + bob + p.head * 3, 3, 1, '#fff2c8');
  g.restore();
  return c;
}

let cache: CharSet | null = null;
/** 염소의 장면 묶음 (사람과 같은 CharSet — 걷기·서기·들이받기·맞기·쓰러짐) */
export function goatCharSet(): CharSet {
  if (cache) return cache;
  const frames = new Map<string, Frame>();
  const poses: Partial<Record<Anim, Pose[]>> = {
    idle: [{ legs: 0, head: 0, lunge: 0, lie: 0, flinch: false }],
    walk: [0, 1, 2, 3].map((k) => ({ legs: k, head: k % 2 ? 0.15 : 0, lunge: 0, lie: 0, flinch: false })),
    heavy: [{ legs: 0, head: -0.6, lunge: -0.6, lie: 0, flinch: false }, { legs: 0, head: 0.4, lunge: -0.2, lie: 0, flinch: false }, { legs: 1, head: 1, lunge: 1, lie: 0, flinch: false }, { legs: 1, head: 0.6, lunge: 0.6, lie: 0, flinch: false }],
    hit: [{ legs: 0, head: -0.3, lunge: -0.4, lie: 0, flinch: true }],
    fall: [0.35, 0.7, 1].map((l) => ({ legs: 0, head: 0.5, lunge: 0, lie: l, flinch: true })),
  };
  const DIRS: Dir[] = ['se', 'sw', 'ne', 'nw', 's', 'e', 'n', 'w'];
  const leftward = new Set<Dir>(['sw', 'w', 'nw', 'n']);
  const counts: Partial<Record<Anim, number>> = {};
  for (const [an, list] of Object.entries(poses) as [Anim, Pose[]][]) {
    counts[an] = list.length;
    list.forEach((p, i) => {
      const tl = Texture.from(drawGoat(p, true)), tr = Texture.from(drawGoat(p, false));
      tl.source.scaleMode = 'nearest'; tr.source.scaleMode = 'nearest';
      for (const d of DIRS) frames.set(`${an}-${d}-${i}`, { tex: leftward.has(d) ? tl : tr, ax: (leftward.has(d) ? W - FX : FX) / W, ay: FY / H, w: W, h: H, k: 0.5 });
    });
  }
  cache = { mode: 'u', attack: 'heavy', frames, counts, eight: true, masks: new Map() };
  return cache;
}
/** 우주새 가게 안의 염소 (얌전히 서 있다): 서 있는 그림 한 장 */
export function goatIdleCanvas(flip = false) { return drawGoat({ legs: 0, head: 0.1, lunge: 0, lie: 0, flinch: false }, flip); }
