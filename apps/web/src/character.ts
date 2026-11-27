// 캐릭터 도트 생성기 — 리니지 초기 크기 (어른 키 약 40px, 아이 약 28px)
// 3/4 시점 두 방향(앞: 오른쪽 아래를 봄, 뒤: 오른쪽 위를 봄)을 그리고, 왼쪽은 좌우 뒤집어 쓴다 → 대각선 4방향
import { Raster, ramp, type Pt } from './raster.ts';

export const SPRITE_W = 32;
export const SPRITE_H = 48;
/** 발이 땅에 닿는 줄 (스프라이트 기준점) */
export const FOOT_Y = 46;

export type Sex = 'f' | 'm';
export type Facing = 'front' | 'back';
export type Outfit = 'casual' | 'apron' | 'raincoat' | 'patient' | 'parrot' | 'suturer' | 'stitched' | 'ash' | 'pret' | 'yak' | 'bones' | 'besk' | 'cockatoo' | 'warden1' | 'warden2' | 'warden3' | 'warden4' | 'warden5' | 'talus' | 'serane' | 'robber' | 'mafia' | 'ashgal' | 'gurma' | 'cinder' | 'bloat' | 'glutton' | 'hawker' | 'debtor' | 'broker' | 'forgeknight' | 'succubus' | 'accubus' | 'casualL' | 'padding' | 'misshwang' | 'angelk' | 'ponchod' | 'reaper' | 'yunae1' | 'yunae2' | 'yunae3' | 'pashar' | 'luen' | 'grandpa' | 'bulda' | 'yellowwing' | 'maskgirl' | 'kaldrek' | 'obolo' | 'noeul' | 'mari' | 'maskfiend' | 'whisperer' | 'puppet' | 'marcion' | 'manette' | 'rokkb' | 'gulonb' | 'merkb' | 'ferronb' | 'goatkingw'; // 48차 필드 보스 · 걷는 염소대왕 // 42차 // 39차 서울 계절옷: 긴소매 · 롱패딩 // 37차: 서큐버스 · 아큐버스 (드레스 · 머리 · 뿔/고리를 몸에 함께 구운 3D 몸)
export interface Look {
  sex: Sex;
  build: number; // 0 마름 · 1 보통 · 2 건장
  skin: number; // 0~2
  hair: number; // HAIR_STYLES 인덱스
  hairColor: number;
  top: number;
  bottom: number;
  outfit?: Outfit;
  child?: boolean;
  aura?: boolean; // 드물게 나타나는 광채
  /** 구역 번호 → 색 (지옥 괴물·파샤르처럼 정해진 색을 덮어쓸 때) */
  cols?: Record<number, string>;
}

export const HAIR_STYLES = ['short', 'swept', 'bob', 'long', 'ponytail', 'buzz'] as const;
export const SKIN_COLORS = ['#f0c8a2', '#d29f72', '#9c6844'];
export const HAIR_COLORS = ['#2a1f1a', '#4a3327', '#7a5236', '#b9a07a'];
export const TOP_COLORS = ['#3b5b78', '#8a3030', '#d9d4c6', '#4a5a3a', '#2b2b30'];
export const BOTTOM_COLORS = ['#34455f', '#3a3633', '#6b5a44', '#1f232b'];
export const BUILD_COUNT = 3;

export const DEFAULT_LOOK: Look = { sex: 'f', build: 1, skin: 0, hair: 3, hairColor: 0, top: 0, bottom: 0 };

// ───────────────────────── 처음 모습 (무작위) ─────────────────────────
export const ARRIVALS = ['raincoat', 'patient', 'man', 'woman', 'child', 'parrot', 'auraMan', 'auraWoman'] as const;
export type Arrival = (typeof ARRIVALS)[number];

/** 처음 모습을 뽑는다. 광채는 남녀 합쳐 3%, 나머지 여섯은 같은 확률 */
export function rollArrival(rnd: () => number = Math.random): Arrival {
  const r = rnd();
  if (r < 0.015) return 'auraMan';
  if (r < 0.03) return 'auraWoman';
  const plain: Arrival[] = ['raincoat', 'patient', 'man', 'woman', 'child', 'parrot'];
  return plain[Math.min(plain.length - 1, Math.floor(((r - 0.03) / 0.97) * plain.length))];
}

export function arrivalLook(kind: Arrival, rnd: () => number = Math.random): Look {
  const pick = (n: number) => Math.floor(rnd() * n);
  const sex: Sex = kind === 'man' || kind === 'auraMan' ? 'm' : kind === 'woman' || kind === 'auraWoman' ? 'f' : rnd() < 0.5 ? 'f' : 'm';
  const look: Look = {
    sex,
    build: pick(BUILD_COUNT),
    skin: pick(SKIN_COLORS.length),
    hair: sex === 'f' ? [1, 2, 3, 4][pick(4)] : [0, 1, 5][pick(3)],
    hairColor: pick(HAIR_COLORS.length),
    top: pick(TOP_COLORS.length),
    bottom: pick(BOTTOM_COLORS.length),
    outfit: kind === 'raincoat' ? 'raincoat' : kind === 'patient' ? 'patient' : kind === 'parrot' ? 'parrot' : 'casual',
  };
  if (kind === 'child') look.child = true;
  if (kind === 'auraMan' || kind === 'auraWoman') look.aura = true;
  return look;
}

// ───────────────────────── 그리기 ─────────────────────────
const SK = 1, HR = 2, TP = 3, BT = 4, SH = 5, AP = 6, RC = 7, HD = 8, GW = 9, BD = 10, PC = 11, CR = 12, BK = 13, FT = 14, RS = 15;

function ell(cx: number, cy: number, rx: number, ry: number, a0 = 0, a1 = Math.PI * 2, n = 18): Pt[] {
  const out: Pt[] = [];
  for (let k = 0; k <= n; k++) {
    const a = a0 + ((a1 - a0) * k) / n;
    out.push([cx + Math.cos(a) * rx, cy + Math.sin(a) * ry]);
  }
  return out;
}
/** 두 점 사이 팔다리 (굵기 w0 → w1) */
function limb(x0: number, y0: number, x1: number, y1: number, w0: number, w1: number): Pt[] {
  const dx = x1 - x0, dy = y1 - y0, L = Math.hypot(dx, dy) || 1;
  const nx = -dy / L, ny = dx / L;
  return [[x0 + (nx * w0) / 2, y0 + (ny * w0) / 2], [x1 + (nx * w1) / 2, y1 + (ny * w1) / 2], [x1 - (nx * w1) / 2, y1 - (ny * w1) / 2], [x0 - (nx * w0) / 2, y0 - (ny * w0) / 2]];
}

export function characterPixels(look: Look, facing: Facing, frame: number) {
  const outfit = look.outfit ?? 'casual';
  const pal: Record<number, string[]> = {
    [SK]: ramp(SKIN_COLORS[look.skin] ?? SKIN_COLORS[0]),
    [HR]: ramp(HAIR_COLORS[look.hairColor] ?? HAIR_COLORS[0]),
    [TP]: ramp(outfit === 'apron' ? '#e6e1d6' : TOP_COLORS[look.top] ?? TOP_COLORS[0]),
    [BT]: ramp(outfit === 'apron' ? '#3a2f28' : BOTTOM_COLORS[look.bottom] ?? BOTTOM_COLORS[0]),
    [SH]: ramp(outfit === 'raincoat' ? '#2d342e' : outfit === 'patient' ? '#d6d2c8' : outfit === 'apron' ? '#3a2418' : '#3a332e'),
    [AP]: ramp('#b49c74'),
    [RC]: ramp('#c9a53c'),
    [HD]: ['#0b0807', '#100c0a', '#15100d', '#1b1511'],
    [GW]: ramp('#a3b7c6'),
    [BD]: ramp('#eeebe2'),
    [PC]: ramp('#efede4'),
    [CR]: ramp('#efc63a'),
    [BK]: ramp('#4a4744'),
    [FT]: ramp('#8f7f70'),
    [RS]: ramp('#a8892c'),
  };
  const r = new Raster(SPRITE_W, SPRITE_H, pal);
  const P = (pts: Pt[], m: number) => r.poly(pts, m);
  const D = (x: number, y: number, c: string) => r.dot(x, y, c);

  const child = !!look.child;
  const f = look.sex === 'f';
  const w = [0.9, 1, 1.12][look.build] ?? 1;
  const front = facing === 'front';
  const phase = [0, 1, 0, -1][frame % 4];
  const bob = phase !== 0 ? 1 : 0; // 걸음을 디딜 때 몸이 1px 내려간다
  const cx = 16;
  const foot = FOOT_Y;
  // 키 기준점 (아이는 머리가 크고 몸이 짧다)
  const k = child ? 0.66 : f ? 0.97 : 1;
  const Y = (y: number) => foot - (foot - y) * k; // 어른 기준 좌표 → 실제
  const U = (y: number) => Y(y) + bob; // 상체는 걸음에 따라 내려간다
  const headR = child ? { rx: 3.4, ry: 3.8 } : { rx: 3.2, ry: 3.8 };
  const hx = cx + (front ? 0.6 : 0.3), hy = child ? U(10.8) - 1.4 : U(10.8);
  const sw = (child ? 3.8 : f ? 4.3 : 5.1) * w; // 어깨 반폭
  const wa = (child ? 3.5 : f ? 3.2 : 3.9) * w; // 허리
  const hp = (child ? 3.6 : f ? 4.4 : 4.1) * w; // 엉덩이
  const legW = (child ? 2.6 : f ? 2.8 : 3.0) * w;
  const shY = U(16.4), waistY = U(23.8), hipY = U(27), kneeY = Y(35.4) + bob * 0.5, ankleY = Y(43);
  const stride = phase * (child ? 1.6 : 2.2);
  // 3/4 시점: 오른쪽 아래를 보면 몸의 오른쪽 옆면이 화면 왼쪽에 보이고(가까운 쪽), 오른쪽 위를 보면 화면 오른쪽이 가깝다
  const nearSign = front ? -1 : 1;
  const halfW = (side: number) => (side === nearSign ? 1 : 0.8); // 먼 쪽 몸은 좁게 보인다
  const fwdY = front ? 0.35 : -0.35; // 앞으로 내딛는 발은 앞모습에선 아래, 뒷모습에선 위

  const coat = outfit === 'raincoat' || outfit === 'patient';
  const parrot = outfit === 'parrot';
  const legMat = parrot ? PC : outfit === 'patient' ? SK : BT;
  const armMatUpper = outfit === 'casual' ? TP : outfit === 'apron' ? TP : outfit === 'raincoat' ? RS : outfit === 'patient' ? GW : PC;
  const armMatLower = outfit === 'casual' || outfit === 'patient' ? SK : armMatUpper;

  const leg = (side: number) => {
    const near = side === nearSign;
    // 걸음은 보는 방향(오른쪽 대각선)으로: 번갈아 앞뒤로 내딛는다
    const fwd = (side === 1 ? 1 : -1) * stride;
    const hx0 = cx + side * (hp - legW / 2 - 0.3) * halfW(side);
    const ax = cx + side * (near ? 1.5 : 1.1) + fwd;
    const dy = Math.max(-1, Math.min(1, fwd * fwdY)) - (near ? 0 : 0.5);
    const ay = ankleY + dy, fy = Math.min(foot + 0.6, foot + dy);
    const kx = (hx0 + ax) / 2 + fwd * 0.25;
    const ky = kneeY + dy * 0.5;
    const darken = (pts: Pt[]) => { if (!near) r.shade(pts, 1, [legMat, SH, FT, PC]); };
    if (parrot) {
      const a = limb(hx0, hipY - 1, kx, ky + 2, legW + 1.2, legW + 0.6), b = limb(kx, ky + 2, ax, ay, 1.2, 1.1);
      const c: Pt[] = [[ax - 1.6, ay - 0.4], [ax + 3, ay + 1], [ax + 3.6, fy + 0.2], [ax - 2, fy + 0.2]];
      P(a, PC); P(b, FT); P(c, FT); darken(a); darken(b); darken(c);
      return;
    }
    const a = limb(hx0, hipY - 1, kx, ky, legW, legW * 0.86), b = limb(kx, ky, ax, ay, legW * 0.86, legW * 0.66);
    P(a, legMat); P(b, legMat);
    // 신발: 발끝은 보는 쪽(오른쪽). 뒷모습은 뒤꿈치가 보여 짧다
    const toe = front ? 2.6 : 1.6;
    const sh: Pt[] = [[ax - 1.5, ay - 0.6], [ax + 1.3, ay - 0.6], [ax + toe, fy - 1.2], [ax + toe, fy + 0.2], [ax - 1.7, fy + 0.2]];
    P(sh, SH);
    darken(a); darken(b); darken(sh);
  };
  const arm = (side: number, swing: number) => {
    const s = side * nearSign;
    const near = side === nearSign;
    const sx0 = cx + side * (sw - (near ? 0.7 : 1.4));
    const ex = sx0 + side * 0.6 - s * swing * 0.5, ey = U(child ? 21.5 : 21.8);
    const wx = sx0 + side * 0.4 - s * swing, wy = U(child ? 26 : 27.2);
    const ua = (child ? 2.1 : f ? 2.2 : 2.6) * w, fa = (child ? 1.8 : f ? 1.9 : 2.2) * w;
    const wide = outfit === 'patient' || outfit === 'raincoat';
    P(limb(sx0, shY + 0.6, ex, ey, ua + (wide ? 0.8 : 0), fa + (wide ? 0.6 : 0)), armMatUpper);
    P(limb(ex, ey, wx, wy, fa, fa * 0.9), armMatLower);
    if (outfit === 'patient') P(limb(sx0, shY + 0.6, ex, ey - 1.4, ua + 1, fa + 1.2), GW);
    if (parrot) { P(limb(sx0, shY + 0.4, wx, wy + 1, ua + 1.6, 1.2), PC); P(limb(ex, ey + 1, wx, wy + 1.5, 1.4, 0.8), CR); return; }
    P(ell(wx + side * 0.1, wy + 1.1, 1.05, 1.25, 0, Math.PI * 2, 10), SK);
    if (!near) r.shade(limb(sx0, shY, wx, wy + 2.4, ua + 2, fa + 2), 1, [armMatUpper, armMatLower, SK]);
  };

  // ── 긴 머리 뒷부분 (앞모습에서는 몸 뒤)
  const style = HAIR_STYLES[look.hair] ?? 'short';
  const hairBehind = !parrot && outfit !== 'raincoat' && front && (style === 'long' || style === 'ponytail');
  if (hairBehind) {
    if (style === 'long') P([[hx - headR.rx - 0.6, hy], [hx + headR.rx * 0.2, hy], [hx + 0.6, U(21.5)], [hx - headR.rx - 0.8, U(22)]], HR);
    else P(limb(hx - headR.rx + 0.2, hy - 1.2, hx - headR.rx - 1.6, hy + 6.5, 2.4, 1.4), HR);
  }
  // 뒤쪽 팔·다리
  arm(-nearSign, phase * 1.6);
  leg(-nearSign);
  // 몸통
  if (parrot) {
    if (!front) P([[cx - 2.4, U(26)], [cx + 2.4, U(26)], [cx + 1.6, U(33)], [cx - 1.6, U(33)]], PC); // 꼬리깃
    P(ell(cx, U(23), sw + 1.6, 7.6, 0, Math.PI * 2, 22), PC);
    if (front) r.shade(ell(cx + 1.4, U(24), sw - 1, 5), 3, [PC]);
  } else {
    const L = halfW(-1), Rr = halfW(1);
    const torso: Pt[] = [[cx - sw * L, shY], [cx + sw * Rr, shY], [cx + (sw - 0.3) * Rr, U(19)], [cx + wa * Rr, waistY], [cx + hp * Rr, hipY], [cx - hp * L, hipY], [cx - wa * L, waistY], [cx - (sw - 0.3) * L, U(19)]];
    if (outfit === 'raincoat') {
      P([[cx - sw + 0.2, shY - 0.4], [cx + sw - 0.2, shY - 0.4], [cx + sw + 0.2, U(19)], [cx + hp + 1.5, Y(36.5)], [cx - hp - 1.5, Y(36.5)], [cx - sw - 0.2, U(19)]], RC);
      if (front) { r.shade([[cx + 0.8, shY + 1], [cx + 1.6, shY + 1], [cx + 1.8, Y(36.5)], [cx + 1, Y(36.5)]], 1, [RC]); for (const y of [19.5, 23, 26.5, 30]) D(cx + 2.3, U(y), '#5e4a18'); }
      P([[cx - hp - 0.6, waistY + 0.6], [cx + hp + 0.6, waistY + 0.6], [cx + hp + 0.7, waistY + 1.7], [cx - hp - 0.7, waistY + 1.7]], RS); // 허리끈
    } else if (outfit === 'patient') {
      P([[cx - sw - 0.6, shY], [cx + sw + 0.6, shY], [cx + hp + 2.6, Y(35.5)], [cx - hp - 2.6, Y(35.5)]], GW);
      for (let y = Math.ceil(shY + 2); y < Y(35); y += 3) for (let x = Math.ceil(cx - sw); x < cx + sw + 1; x += 3) D(x + ((y / 3) % 2), y, '#8fa3b2');
    } else {
      P(torso, TP);
      const far = -nearSign;
      r.shade([[cx + far * sw * 0.45, shY], [cx + far * sw, shY], [cx + far * hp, hipY], [cx + far * hp * 0.5, hipY]], 1, [TP]);
      P([[cx - hp, hipY - 1.4], [cx + hp, hipY - 1.4], [cx + hp, hipY + 0.6], [cx - hp, hipY + 0.6]], BT);
      if (outfit === 'apron') {
        if (front) P([[cx - sw + 1.2, U(17.5)], [cx + sw - 0.4, U(17.5)], [cx + hp + 0.9, Y(36.5)], [cx - hp + 0.4, Y(36.5)]], AP);
        else { P([[cx - wa, U(23)], [cx + wa, U(23)], [cx + wa, U(24.2)], [cx - wa, U(24.2)]], AP); P([[cx - 1.6, U(23.2)], [cx + 1.6, U(23.2)], [cx + 0.8, U(26.5)], [cx - 0.8, U(26.5)]], AP); }
        P([[cx - hp - 0.3, hipY], [cx + hp + 0.3, hipY], [cx + hp + 1, Y(38)], [cx - hp - 1, Y(38)]], BT); // 긴 치마
        if (front) P([[cx - hp + 0.4, U(26)], [cx + hp + 0.9, U(26)], [cx + hp + 1.2, Y(37)], [cx - hp + 0.6, Y(37)]], AP);
      }
    }
  }
  leg(nearSign);
  // 목
  if (!parrot && outfit !== 'raincoat') P([[hx - 1.1, hy + headR.ry - 1], [hx + 1.1, hy + headR.ry - 1], [hx + 1.1, shY + 0.5], [hx - 1.1, shY + 0.5]], SK);
  // 머리
  if (parrot) {
    const ph = { x: cx + (front ? 0.6 : 0), y: U(child ? 21 : 9.6) };
    P(ell(ph.x, ph.y, 4.5, 4.3, 0, Math.PI * 2, 22), PC);
    const crest: Pt[] = front
      ? [[ph.x + 0.6, ph.y - 3.8], [ph.x - 1.2, ph.y - 8], [ph.x - 3.6, ph.y - 10.2], [ph.x - 2.4, ph.y - 7.4], [ph.x - 5.6, ph.y - 8.6], [ph.x - 3.4, ph.y - 5.6], [ph.x - 6, ph.y - 5], [ph.x - 2.8, ph.y - 3.2]]
      : [[ph.x - 1.4, ph.y - 3.6], [ph.x - 3.6, ph.y - 9], [ph.x - 1, ph.y - 6.6], [ph.x + 0.2, ph.y - 9.8], [ph.x + 1.2, ph.y - 6.4], [ph.x + 3.4, ph.y - 8.6], [ph.x + 1.6, ph.y - 3.6]];
    P(crest, CR);
    if (front) {
      P([[ph.x + 3, ph.y - 0.8], [ph.x + 6.4, ph.y + 0.2], [ph.x + 5.6, ph.y + 2.6], [ph.x + 3.4, ph.y + 2.2]], BK);
      D(ph.x + 2, ph.y - 1.2, '#111111'); D(ph.x - 0.6, ph.y - 1.2, '#111111');
    }
  } else if (outfit === 'raincoat') {
    P(ell(hx - 0.3, hy - 0.4, headR.rx + 1.1, headR.ry + 1.2, 0, Math.PI * 2, 20), RC);
    P([[hx - headR.rx - 1.2, hy + 1.4], [hx + headR.rx + 0.8, hy + 1.4], [hx + headR.rx + 1.2, shY + 0.8], [hx - headR.rx - 1.6, shY + 0.8]], RC);
    if (front) P(ell(hx + 1, hy + 0.6, headR.rx - 0.6, headR.ry - 0.6, 0, Math.PI * 2, 14), HD); // 모자 속 얼굴은 어둠
  } else {
    P(ell(hx, hy, headR.rx, headR.ry, 0, Math.PI * 2, 18), SK);
    // 머리카락
    const top = hy - headR.ry, rx = headR.rx;
    const cap = (backY: number, fringeY: number): Pt[] => front
      ? [[hx - rx - 0.6, backY], [hx - rx - 0.7, hy - 1], [hx - rx + 0.2, top - 0.2], [hx, top - 0.8], [hx + rx - 0.2, top - 0.1], [hx + rx + 0.4, hy - 1.6], [hx + rx + 0.2, fringeY], [hx + 1.4, fringeY - 0.4], [hx - 0.2, fringeY + 0.3], [hx - rx + 1.2, hy + 0.8], [hx - rx + 0.6, backY]]
      : [[hx - rx - 0.7, backY], [hx - rx - 0.7, hy - 1], [hx - rx + 0.2, top - 0.2], [hx, top - 0.8], [hx + rx - 0.2, top - 0.1], [hx + rx + 0.7, hy - 1], [hx + rx + 0.7, backY]];
    if (style === 'buzz') {
      P(front ? [[hx - rx - 0.3, hy + 0.6], [hx - rx, top + 1], [hx, top - 0.4], [hx + rx - 0.4, top + 0.6], [hx + rx - 0.2, hy - 1.8], [hx - 0.4, hy - 1.6], [hx - rx + 1, hy + 0.6]] : ell(hx, hy - 0.4, rx + 0.3, headR.ry, Math.PI * 0.95, Math.PI * 2.05, 14), HR);
    } else if (style === 'short') P(cap(hy + 1.6, hy - 1.6), HR);
    else if (style === 'swept') P(cap(hy + 1.6, hy - 2.4), HR), P([[hx - 0.6, top - 0.4], [hx + rx + 0.8, top + 0.8], [hx + rx + 0.6, hy - 1]], HR);
    else if (style === 'bob') P(cap(hy + headR.ry + 0.6, hy - 1.4), HR), front && P([[hx + rx - 0.6, hy - 1.6], [hx + rx + 0.5, hy - 1], [hx + rx + 0.4, hy + 2.6], [hx + rx - 0.4, hy + 2.6]], HR);
    else if (style === 'long') {
      P(cap(hy + headR.ry, hy - 1.3), HR);
      if (!front) P([[hx - rx - 0.7, hy], [hx + rx + 0.7, hy], [hx + rx + 0.4, U(22)], [hx - rx - 0.4, U(22)]], HR);
    } else if (style === 'ponytail') {
      P(cap(hy + 1.2, hy - 1.4), HR);
      if (!front) P(limb(hx, hy - 1, hx - 0.4, hy + 7, 2.2, 1.3), HR);
    }
    // 얼굴
    if (front) {
      D(hx + 1.9, hy + 0.2, '#1d1410');
      D(hx - 0.6, hy + 0.2, '#1d1410');
      if (!child) D(hx + 1.3, hy + 2.3, f ? '#a8524a' : '#8a5a48');
    }
    if (outfit === 'patient') {
      // 머리 붕대
      P([[hx - rx - 0.6, top + 1.2], [hx + rx + 0.6, top + 0.8], [hx + rx + 0.6, top + 2.6], [hx - rx - 0.6, top + 3]], BD);
      P([[hx - 1.6, top - 0.6], [hx + 0.8, top - 0.8], [hx + 2, top + 1.4], [hx - 0.4, top + 1.6]], BD);
    }
  }
  // 앞쪽 팔
  arm(nearSign, -phase * 1.6);
  if (outfit === 'apron' && front) D(cx + sw - 0.6, U(17.5), '#8a7454');
  return r.finish();
}

/** 상점 앵무새 (유황앵무) 16×18 — 횃대 줄 = 맨 아래 */
export function parrotPixels(crestUp: boolean) {
  const pal: Record<number, string[]> = { 1: ramp('#ece9e0'), 2: ramp('#e8c23a'), 3: ramp('#2a2522'), 4: ramp('#7a5a3a') };
  const r = new Raster(16, 18, pal);
  r.poly([[1, 15.4], [15, 15.4], [15, 17], [1, 17]], 4);
  r.poly(ell(8, 11, 3.2, 4, 0, Math.PI * 2, 14), 1);
  r.poly([[8, 13], [10.4, 13], [11, 17.6], [9, 17.6]], 1);
  r.poly(ell(8.6, 6.4, 2.6, 2.4, 0, Math.PI * 2, 12), 1);
  if (crestUp) r.poly([[6.6, 5.2], [5.6, 0.2], [7.6, 2.6], [8.4, 0], [9.6, 3], [9.4, 5]], 2);
  else r.poly([[6.6, 5.6], [3.2, 3.4], [5.6, 3.6], [5, 1.8], [8, 3.4], [9.4, 4.4]], 2);
  r.poly([[10.6, 5.8], [12.8, 6.6], [12.2, 8.6], [10.6, 8.2]], 3);
  r.dot(9.6, 5.8, '#151210');
  return r.finish();
}

/** 광채: 몸의 윤곽 바깥으로 금빛이 일렁이며 위로 솟는 4장면 (가산 혼합으로 그린다) */
export const AURA_PAD = 10;
export function auraFrames(px: (string | null)[]): HTMLCanvasElement[] {
  const solid = new Uint8Array(SPRITE_W * SPRITE_H);
  for (let i = 0; i < solid.length; i++) solid[i] = px[i] ? 1 : 0;
  return auraFromMask(solid, SPRITE_W, SPRITE_H);
}
/** 실루엣(w×h, 1 = 몸) → 사방으로 AURA_PAD 만큼 넓힌 광채 4장면 */
export function auraFromMask(mask: Uint8Array, w0: number, h0: number): HTMLCanvasElement[] {
  const W = w0 + AURA_PAD * 2, H = h0 + AURA_PAD * 2;
  const solid = new Uint8Array(W * H);
  for (let y = 0; y < h0; y++) for (let x = 0; x < w0; x++) if (mask[y * w0 + x]) solid[(y + AURA_PAD) * W + x + AURA_PAD] = 1;
  // 윤곽까지 거리: 위쪽은 멀리까지 닿게 해서 불꽃처럼 솟는다
  const MAXD = 8;
  const dist = new Float32Array(W * H).fill(99);
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      if (solid[y * W + x]) { dist[y * W + x] = 0; continue; }
      let best = 99;
      for (let dy = -6; dy <= 10; dy++)
        for (let dx = -6; dx <= 6; dx++) {
          const xx = x + dx, yy = y + dy;
          if (xx < 0 || yy < 0 || xx >= W || yy >= H || !solid[yy * W + xx]) continue;
          const d = Math.hypot(dx, dy > 0 ? dy * 0.62 : dy * 1.5);
          if (d < best) best = d;
        }
      dist[y * W + x] = best;
    }
  const hash = (x: number, y: number) => { let h = (x * 374761393 + y * 668265263) ^ 0x5bd1e995; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967295; };
  return [0, 1, 2, 3].map((f) => {
    const c = document.createElement('canvas');
    c.width = W; c.height = H;
    const g = c.getContext('2d')!;
    const id = g.createImageData(W, H);
    for (let y = 0; y < H; y++)
      for (let x = 0; x < W; x++) {
        const d = dist[y * W + x];
        if (d === 0 || d > MAXD) continue;
        // 위로 흘러가는 결: 장면마다 3줄씩 올라간다
        const n = hash(x, Math.floor((y + f * 3) / 3)) * 0.8 + hash(x >> 1, Math.floor((y + f * 3) / 2)) * 0.5;
        const a = Math.max(0, 1 - d / MAXD) * (0.35 + n * 0.85);
        if (a < 0.22) continue;
        const i = (y * W + x) * 4;
        const t = d / MAXD;
        id.data[i] = 255;
        id.data[i + 1] = Math.round(244 - t * 90);
        id.data[i + 2] = Math.round(190 - t * 160);
        id.data[i + 3] = Math.min(255, Math.round(a * 255));
      }
    g.putImageData(id, 0, 0);
    return c;
  });
}
