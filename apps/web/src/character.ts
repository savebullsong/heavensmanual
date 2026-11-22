// 실제 체형 캐릭터 도트 생성기 (72×144px)
// 성별 · 체격 3종 · 피부 3종 · 헤어 6종 · 머리색 4종 · 상의/하의 색, 정면/뒷모습, 걷기 4프레임
import { Raster, ramp, type Pt } from './raster.ts';

export const SPRITE_W = 72;
export const SPRITE_H = 144;

export type Sex = 'f' | 'm';
export type Facing = 'front' | 'back';
export interface Look {
  sex: Sex;
  build: number; // 0 마름 · 1 보통 · 2 건장
  skin: number; // 0~2
  hair: number; // HAIR_STYLES 인덱스
  hairColor: number;
  top: number;
  bottom: number;
  outfit?: 'casual' | 'apron';
}

export const HAIR_STYLES = ['short', 'swept', 'bob', 'long', 'ponytail', 'buzz'] as const;
export const SKIN_COLORS = ['#f2cba6', '#d6a275', '#a26c48'];
export const HAIR_COLORS = ['#2a1f1a', '#4a3327', '#7a5236', '#b9a07a'];
export const TOP_COLORS = ['#3b5b78', '#7a2e2e', '#d9d4c6', '#3e4b35', '#2b2b30'];
export const BOTTOM_COLORS = ['#34455f', '#3a3633', '#6b5a44', '#1f232b'];
export const BUILD_COUNT = 3;

export const DEFAULT_LOOK: Look = { sex: 'f', build: 1, skin: 0, hair: 3, hairColor: 0, top: 0, bottom: 0 };

const SK = 1, HR = 2, TP = 3, BT = 4, SH = 5, AP = 6, RB = 7, EAR = 8;

export function characterPixels(look: Look, facing: Facing, frame: number, opt: { flat?: boolean; noOutline?: boolean } = {}) {
  const pal: Record<number, string[]> = {
    [SK]: ramp(SKIN_COLORS[look.skin]),
    [EAR]: ramp(SKIN_COLORS[look.skin]),
    [HR]: ramp(HAIR_COLORS[look.hairColor]),
    [TP]: ramp(look.outfit === 'apron' ? '#2e2a33' : TOP_COLORS[look.top]),
    [BT]: ramp(look.outfit === 'apron' ? '#2e2a33' : BOTTOM_COLORS[look.bottom]),
    [SH]: ramp(look.outfit === 'apron' ? '#3a2418' : '#e6e2da'),
    [AP]: ramp('#c9a23e'),
    [RB]: ramp('#e0b437'),
  };
  const r = new Raster(SPRITE_W, SPRITE_H, pal);
  const P = (pts: Pt[], m: number) => r.poly(pts.map(tf), m);
  const S = (pts: Pt[], s: number, ms: number[]) => r.shade(pts.map(tf), s, ms);
  const D = (x: number, y: number, c: string) => { const [, yy] = tf([x, y]); r.dot(x, yy, c); };

  const f = look.sex === 'f';
  const w = [0.88, 1, 1.14][look.build] ?? 1;
  const cx = 36;
  const front = facing === 'front';
  const phase = [0, 1, 0, -1][frame % 4];
  const bob = phase !== 0 ? 1 : 0;
  // 걷기: 무릎 위는 1px 들림
  function tf([x, y]: Pt): Pt {
    return [x, y - bob * Math.max(0, Math.min(1, (104 - y) / 8))];
  }
  const M = (pts: Pt[]): Pt[] => pts.map(([x, y]) => [2 * cx - x, y]);

  const sh = (f ? 10 : 12) * w;
  const ch = (f ? 9.6 : 11) * w;
  const wa = (f ? 7 : 9.4) * w;
  const hp = (f ? 10.6 : 10) * w;
  const ua = (f ? 2.6 : 3.1) * w;
  const fa = (f ? 2.2 : 2.6) * w;
  const th = (f ? 5.4 : 5.6) * w;
  const kn = (f ? 3.6 : 3.9) * w;
  const an = (f ? 2.6 : 2.9) * w;
  const nk = f ? 2.6 : 3.2;
  const hipC = hp * 0.48, kneeC = kn + 1.2, ankleC = an + 1.6;
  const longSleeve = look.outfit === 'apron';
  const style = HAIR_STYLES[look.hair] ?? 'short';

  // ── 뒤쪽에 깔리는 머리카락 덩어리
  const skullBack: Record<string, Pt[]> = {
    buzz: [[29.8, 10], [31.5, 7], [36, 5.8], [40.5, 7], [42.2, 10], [42.3, 16], [29.7, 16]],
    short: [[29.4, 10], [31.2, 6.6], [36, 5.2], [40.8, 6.6], [42.6, 10], [42.8, 19], [29.2, 19]],
    swept: [[29.4, 10], [31.2, 6.6], [36, 5.2], [40.8, 6.6], [42.6, 10], [42.8, 19], [29.2, 19]],
    bob: [[29, 10], [31, 6.6], [36, 5.2], [41, 6.6], [43, 10], [43.4, 26], [28.6, 26]],
    long: [[28.6, 10], [31, 6.6], [36, 5.2], [41, 6.6], [43.4, 10], [44, 31], [28, 31]],
    ponytail: [[29.4, 10], [31.2, 6.6], [36, 5.2], [40.8, 6.6], [42.6, 10], [42.8, 18], [29.2, 18]],
  };
  if (front) {
    if (style === 'ponytail') P([[41.4, 13], [44, 15.5], [45.6, 24], [45.8, 34], [44.4, 42], [42.6, 40], [43, 30], [42.2, 20]], HR);
    P(skullBack[style], HR);
  }

  // ── 목
  P([[cx - nk, 21], [cx + nk, 21], [cx + nk + 0.3, 31], [cx - nk - 0.3, 31]], SK);

  // ── 다리 (바지)
  const legL = (lift: number): Pt[] => [
    [cx - hipC - th, 58], [cx - 0.4, 58], [cx - 0.4, 72],
    [cx - kneeC + kn, 100 - lift * 0.4], [cx - ankleC + an, 131 - lift],
    [cx - ankleC - an, 131 - lift], [cx - kneeC - kn, 100 - lift * 0.4], [cx - hipC - th + 0.3, 80],
  ];
  const liftL = phase === 1 ? 3 : 0, liftR = phase === -1 ? 3 : 0;
  P(legL(liftL), BT);
  P(M(legL(liftR)), BT);
  // 신발
  const shoe = (ax: number, lift: number): Pt[] => [
    [ax - an - 0.6, 127 - lift], [ax + an + 0.4, 127 - lift], [ax + an + 1.2, 133 - lift],
    [ax + an + 0.8, 137 - lift], [ax - an - 1.8, 137 - lift], [ax - an - 1.4, 132 - lift],
  ];
  P(shoe(cx - ankleC, liftL), SH);
  P(M(shoe(cx - ankleC, liftR)), SH);

  // ── 몸통 (상의)
  P([[cx - sh, 30], [cx + sh, 30], [cx + ch + 0.5, 38], [cx + ch, 44], [cx + wa + 0.5, 52], [cx + hp * 0.96, 63.5],
     [cx - hp * 0.96, 63.5], [cx - wa - 0.5, 52], [cx - ch, 44], [cx - ch - 0.5, 38]], TP);
  if (front) {
    P([[cx - 3.4, 29.4], [cx + 3.4, 29.4], [cx + 2.4, 32.4], [cx - 2.4, 32.4]], SK);
  }

  // ── 팔
  const armSwingL = phase === -1 ? -2 : phase === 1 ? 1 : 0;
  const armSwingR = -armSwingL;
  const arm = (swing: number) => {
    const Sx = cx - sh + 1.2, Sy = 31.5;
    const Ex = cx - sh - 1.0, Ey = 52 + swing * 0.4;
    const Wx = cx - sh - 1.6, Wy = 71 + swing;
    const mid = Sx + (Ex - Sx) * 0.51;
    return {
      upper: [[Sx - ua - 0.8, 31], [Sx + ua, 31.5], [Ex + ua * 0.9, Ey], [Ex - ua * 0.9, Ey]] as Pt[],
      fore: [[Ex - ua * 0.9, Ey - 1], [Ex + ua * 0.9, Ey - 1], [Wx + fa, Wy], [Wx - fa, Wy]] as Pt[],
      hand: [[Wx - fa - 0.6, Wy - 1], [Wx + fa + 0.4, Wy - 1], [Wx + fa + 0.8, Wy + 4], [Wx + fa - 0.2, Wy + 8], [Wx - fa, Wy + 8], [Wx - fa - 1, Wy + 4]] as Pt[],
      sleeve: (longSleeve
        ? [[Sx - ua - 1.6, 30.4], [Sx + ua + 0.8, 30.6], [Ex + ua + 0.4, Ey], [Wx + fa + 0.6, Wy - 2], [Wx - fa - 0.8, Wy - 2], [Ex - ua - 1, Ey]]
        : [[Sx - ua - 1.6, 30.4], [Sx + ua + 0.8, 30.6], [mid + ua + 0.9, 42.5], [mid - ua - 1.1, 42.5]]) as Pt[],
    };
  };
  const aL = arm(armSwingL), aR = arm(armSwingR);
  for (const [a, mir] of [[aL, false], [aR, true]] as const) {
    const t = (p: Pt[]) => (mir ? M(p) : p);
    P(t(a.upper), SK);
    P(t(a.fore), SK);
    P(t(a.hand), SK);
    P(t(a.sleeve), TP);
  }

  // ── 앞치마 (상점 직원용)
  if (look.outfit === 'apron' && front) {
    P([[cx - 5, 35], [cx + 5, 35], [cx + 6, 49], [cx + hp * 0.9, 64], [cx + hp * 0.82, 84], [cx - hp * 0.82, 84], [cx - hp * 0.9, 64], [cx - 6, 49]], AP);
  }

  // ── 머리
  if (front) {
    const face: Pt[] = f
      ? [[31, 12], [41, 12], [41.3, 18], [40.3, 21.5], [38.5, 23.6], [36, 24.8], [33.5, 23.6], [31.7, 21.5], [30.7, 18]]
      : [[30.8, 12], [41.2, 12], [41.5, 18], [40.8, 21.8], [39, 24], [36, 25.2], [33, 24], [31.2, 21.8], [30.5, 18]];
    P(face, SK);
    P([[30.2, 16.2], [31.3, 16.2], [31.3, 20.2], [30.5, 19.6]], EAR);
    P([[40.7, 16.2], [41.8, 16.2], [41.5, 19.6], [40.7, 20.2]], EAR);
  } else {
    P([[30.6, 12], [41.4, 12], [41.6, 19], [40, 23.4], [32, 23.4], [30.4, 19]], SK);
    P([[30, 16.2], [31.2, 16.2], [31.2, 20.2], [30.3, 19.6]], EAR);
    P([[40.8, 16.2], [42, 16.2], [41.7, 19.6], [40.8, 20.2]], EAR);
  }

  // ── 앞머리 / 뒷머리
  if (front) {
    const fringe: Record<string, Pt[][]> = {
      buzz: [[[30.4, 12.6], [30.6, 9.4], [32.6, 7], [36, 6.2], [39.4, 7], [41.4, 9.4], [41.6, 12.6], [40.8, 11.4], [36, 10.6], [31.2, 11.4]]],
      short: [[[30, 13], [30.1, 9.3], [32.4, 6.5], [36, 5.4], [39.6, 6.5], [41.9, 9.3], [42, 13], [41.2, 14.2], [40.2, 11.8], [38, 12.6], [36.4, 11.2], [34.4, 12.6], [32.4, 11.6], [31.3, 14.2]]],
      swept: [[[30, 14.2], [30, 9.2], [32.6, 6.2], [36.4, 5.2], [40.2, 6.3], [42.2, 9.4], [42.3, 15], [41.4, 13.4], [39.6, 11.6], [37, 10.6], [34.6, 11.2], [32.6, 12.6], [31.2, 15.4]]],
      bob: [[[29.2, 25.6], [29.1, 12], [30.4, 8.4], [33, 6], [36, 5.2], [39, 6], [41.6, 8.4], [42.9, 12], [42.8, 25.6], [41, 25.6], [41.2, 16], [40.6, 13.4], [31.4, 13.4], [30.8, 16], [31, 25.6]]],
      long: [
        [[29.6, 14], [30, 9], [32.6, 6.2], [36, 5.2], [39.4, 6.2], [42, 9], [42.4, 14], [41.6, 13.2], [40, 10.6], [36.6, 9.4], [36, 10.6], [35.4, 9.4], [32, 10.6], [30.4, 13.2]],
        [[29.2, 13], [31.2, 14], [31.4, 22], [32.2, 28], [31.6, 32], [30.4, 40], [29.4, 48], [27, 47.4], [27.6, 36], [28.6, 26], [28.6, 18]],
        M([[29.2, 13], [31.2, 14], [31.4, 22], [32.2, 28], [31.6, 32], [30.4, 40], [29.4, 48], [27, 47.4], [27.6, 36], [28.6, 26], [28.6, 18]]),
      ],
      ponytail: [[[30.2, 13], [30.3, 9.2], [32.6, 6.4], [36, 5.4], [39.4, 6.4], [41.8, 9.2], [41.9, 13], [41.1, 12.2], [39.4, 10.4], [36, 9.8], [32.6, 10.4], [31, 12.2]]],
    };
    for (const p of fringe[style]) P(p, HR);
    if (look.outfit === 'apron') P([[40.2, 7], [43, 6.4], [43.4, 9.6], [41, 9.6]], RB);
  } else {
    const backHair: Record<string, Pt[][]> = {
      buzz: [[[30.2, 9.6], [32, 6.6], [36, 5.8], [40, 6.6], [41.8, 9.6], [42, 15], [30, 15]]],
      short: [[[29.4, 10], [31.2, 6.4], [36, 5.2], [40.8, 6.4], [42.6, 10], [42.6, 20.6], [36, 21.6], [29.4, 20.6]]],
      swept: [[[29.4, 10], [31.2, 6.4], [36, 5.2], [40.8, 6.4], [42.6, 10], [42.6, 20.6], [36, 21.6], [29.4, 20.6]]],
      bob: [[[29, 10], [31, 6.6], [36, 5.2], [41, 6.6], [43, 10], [43.4, 26], [28.6, 26]]],
      long: [[[28.6, 10], [31, 6.6], [36, 5.2], [41, 6.6], [43.4, 10], [44, 30], [43.2, 48], [36, 50], [28.8, 48], [28, 30]]],
      ponytail: [[[29.4, 10], [31.2, 6.4], [36, 5.2], [40.8, 6.4], [42.6, 10], [42.6, 20], [29.4, 20]], [[34.6, 15], [37.4, 15], [38.2, 30], [37.2, 42], [34.8, 42], [33.8, 30]]],
    };
    for (const p of backHair[style]) P(p, HR);
    if (look.outfit === 'apron') P([[34.4, 14], [37.6, 14], [37.6, 16.6], [34.4, 16.6]], RB);
  }

  // ── 수동 음영
  S([[cx - 4, 24.5], [cx + 4, 24.5], [cx + 4, 27.4], [cx - 4, 27.4]], 1, [SK]);
  S([[29, 12], [43, 12], [43, 13.2], [29, 13.2]], 1, [SK]);
  S([[cx - hp - 2, 63.5], [cx + hp + 2, 63.5], [cx + hp + 2, 65.6], [cx - hp - 2, 65.6]], 1, [BT]);
  if (front) S([[cx - ch, 41.4], [cx + ch, 41.4], [cx + ch, 42.6], [cx - ch, 42.6]], 1, [TP]);

  // ── 얼굴과 디테일
  const ink = '#160f0c';
  if (front) {
    const brow = pal[HR][0];
    if (f) {
      D(32, 16, ink); D(33, 15, brow); D(34, 15, brow); D(38, 15, brow); D(39, 15, brow); D(40, 16, ink);
    } else {
      for (const x of [32, 33, 34, 38, 39, 40]) D(x, 15, brow);
      D(33, 14, brow); D(39, 14, brow);
    }
    D(33, 16, ink); D(34, 16, ink); D(38, 16, ink); D(39, 16, ink);
    D(32, 17, '#ece6dc'); D(33, 17, '#4a6478'); D(34, 17, '#1e2630');
    D(38, 17, '#1e2630'); D(39, 17, '#4a6478'); D(40, 17, '#ece6dc');
    const sk = pal[SK];
    D(37, 19, sk[1]); D(37, 20, sk[0]); D(36, 20, sk[1]);
    if (f) {
      D(35, 22, '#a35850'); D(36, 22, '#b8645c'); D(37, 22, '#a35850'); D(36, 23, '#d4917e');
      D(33, 20, '#e8a08a'); D(39, 20, '#df9a80');
    } else {
      D(35, 22, sk[0]); D(36, 22, sk[0]); D(37, 22, sk[0]);
    }
    // 상의 칼라 선
    for (let x = cx - 3; x <= cx + 3; x++) D(x, 32, pal[TP][0]);
    if (look.outfit === 'apron') {
      D(cx - 5, 33, pal[AP][1]); D(cx - 6, 31, pal[AP][1]); D(cx + 5, 33, pal[AP][1]); D(cx + 6, 31, pal[AP][1]);
      D(cx - 3, 58, pal[AP][0]); D(cx + 3, 58, pal[AP][0]);
    }
  } else {
    for (let x = cx - 3; x <= cx + 3; x++) D(x, 30, pal[TP][0]);
  }
  // 운동화 밑창 선
  for (const [ax, lift] of [[cx - ankleC, liftL], [cx + ankleC, liftR]] as const) {
    for (let x = Math.round(ax - an - 1.6); x <= Math.round(ax + an + 0.8); x++) D(x, 136 - lift, look.outfit === 'apron' ? '#1c120c' : '#9a958c');
  }

  return r.finish(opt);
}

/** 앵무새(유황앵무) 32×40 */
export function parrotPixels(crestUp: boolean) {
  const pal: Record<number, string[]> = { 1: ramp('#ece9e0'), 2: ramp('#e8c23a'), 3: ramp('#2a2522'), 4: ramp('#7a5a3a') };
  const r = new Raster(32, 40, pal);
  r.poly([[3, 31], [29, 31], [29, 33.4], [3, 33.4]], 4); // 횃대
  r.poly([[12, 14], [19, 13], [22, 18], [22, 26], [19, 31], [13, 31], [10, 26], [10, 19]], 1); // 몸
  r.poly([[17, 26], [21, 26], [23, 36], [19, 37], [16, 31]], 1); // 꼬리
  r.poly([[11, 9], [17, 7], [20, 10], [20, 15], [16, 17], [12, 16]], 1); // 머리
  if (crestUp) r.poly([[12, 9], [10, 2], [13, 4], [14, 0.5], [16, 4.6], [18, 2.4], [17.4, 8]], 2);
  else r.poly([[12, 9], [7, 6.6], [10.6, 5.4], [9.6, 3], [14, 5], [16, 4.6], [17.4, 8]], 2);
  r.poly([[19.6, 11.6], [23, 12.4], [22.4, 15.4], [20, 15]], 3); // 부리
  r.dot(17, 11, '#151210');
  r.dot(14, 31, '#3a3330'); r.dot(18, 31, '#3a3330');
  return r.finish();
}
