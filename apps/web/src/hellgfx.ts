// 지옥의 바닥과 구조물: 파일 없이 한 칸씩 점을 찍어 그린다 (재 · 용암 · 늪 · 핏물 · 돌 · 판자)
import { drawHellBuild } from './hellbuild.ts';
import { TW, TH, iso } from './gfx.ts';
import { tileAt, mirror, type Zone, type Building, type TileType } from './zone.ts';
import type { Theme } from './hell.ts';

const CHUNK = 24;
type RGB = [number, number, number];
const hex = (h: string): RGB => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const hash = (a: number, b: number, c = 0) => { let h = (a * 374761393 + b * 668265263 + c * 2147483647) | 0; h = (h ^ (h >>> 13)) * 1274126177; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
const mix = (a: RGB, b: RGB, t: number): RGB => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];

// ───────────────────────── 지옥 바닥 (점 하나하나를 땅의 연속된 무늬로) ─────────────────────────
// 칸마다 같은 마름모 그림을 찍던 방식(격자가 보이고 경계가 네모)을 버리고, 화면의 점마다
// ① 둘레 네 칸의 종류를 겹쳐 섞고 잡음을 더해 경계를 구불구불하게 (용암 강·늪 가장자리가 둥글게)
// ② 칸을 넘어 이어지는 무늬(재 언덕·갈라진 금·자갈·진흙의 젖은 빛·풀·판자·벽돌)와
// ③ 왼쪽 위에서 오는 빛의 높낮이 그림자로 살짝 입체감을 준다. 용암은 식은 껍질 조각 사이로 달아오른 금이 흐른다.
const NS = 256;
let NOISE: Float32Array | null = null;
/** 이어 붙여도 이음매 없는 부드러운 잡음 (256×256, 여러 겹) */
function noiseTex() {
  if (NOISE) return NOISE;
  const out = new Float32Array(NS * NS);
  for (const [per, amp] of [[64, 0.5], [32, 0.25], [16, 0.15], [8, 0.1]] as const) {
    const gN = NS / per;
    const val = (gx: number, gy: number) => hash(((gx % gN) + gN) % gN, ((gy % gN) + gN) % gN, per * 7 + 1);
    for (let y = 0; y < NS; y++) for (let x = 0; x < NS; x++) {
      const fx = x / per, fy = y / per, x0 = Math.floor(fx), y0 = Math.floor(fy);
      let tx = fx - x0, ty = fy - y0; tx = tx * tx * (3 - 2 * tx); ty = ty * ty * (3 - 2 * ty);
      const a = val(x0, y0), b = val(x0 + 1, y0), c = val(x0, y0 + 1), d = val(x0 + 1, y0 + 1);
      out[y * NS + x] += amp * ((a * (1 - tx) + b * tx) * (1 - ty) + (c * (1 - tx) + d * tx) * ty);
    }
  }
  NOISE = out;
  return out;
}
const TYPE_IDX: TileType[] = ['void', 'lot', 'park', 'water', 'walk', 'soi', 'road', 'median', 'cross', 'block', 'hill'];
/** 땅의 종류 (칸 종류를 그림 종류로): 0 바닥 · 1 마른 모래/이끼 · 2 물(용암·늪·핏물) · 3 돌길·널빤지 · 4 골목 흙길 · 5 다리 · 6 바위 바닥 */
const CLASS_OF: Record<TileType, number> = { void: 6, lot: 0, park: 1, water: 2, walk: 3, soi: 4, road: 4, median: 4, cross: 5, block: 6, hill: 6 };

/** 바닥 한 덩어리를 그리는 일: 한 번에 다 그리면 휴대폰에서 0.2초 넘게 멈춘다 → 줄 단위로 나눠 프레임마다 몇 ms씩 */
export interface GroundJob { canvas: HTMLCanvasElement; x: number; y: number; done: boolean; step(ms: number): boolean }
export function drawHellGround(z: Zone, theme: Theme, i0: number, j0: number): { canvas: HTMLCanvasElement; x: number; y: number } | null {
  const job = hellGroundJob(z, theme, i0, j0);
  job.step(Infinity);
  return job;
}
/** 색 글자 → 숫자 (점마다 다시 풀지 않게 한 번만) */
const HC = new Map<string, RGB>();
const hexc = (h: string): RGB => { let v = HC.get(h); if (!v) { v = hex(h); HC.set(h, v); } return v; };
export function hellGroundJob(z: Zone, theme: Theme, i0: number, j0: number): GroundJob {
  const NZ = noiseTex();
  const nz = (x: number, y: number) => NZ[((y & 255) << 8) | (x & 255)];
  const i1 = z.beyond ? i0 + CHUNK : Math.min(z.W, i0 + CHUNK), j1 = z.beyond ? j0 + CHUNK : Math.min(z.H, j0 + CHUNK); // 32차: 지도 밖까지
  const minX = (i0 - j1) * (TW / 2), minY = (i0 + j0) * (TH / 2);
  const W = (i1 - i0 + j1 - j0) * (TW / 2) + 2, H = (i1 - i0 + j1 - j0) * (TH / 2) + 2;
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const g = c.getContext('2d')!;
  const im = g.createImageData(W, H);
  const D = im.data;
  const tiles = z.tiles, ZW = z.W, ZH = z.H;
  const bm = z.beyond?.m;
  const cls = (i: number, j: number) => { const ii = bm !== undefined ? mirror(ZW, bm, i) : i < 0 ? 0 : i >= ZW ? ZW - 1 : i, jj = bm !== undefined ? mirror(ZH, bm, j) : j < 0 ? 0 : j >= ZH ? ZH - 1 : j; return CLASS_OF[TYPE_IDX[tiles[jj * ZW + ii]] ?? 'lot']; }; // 32차: 지도 밖은 거울
  const sc = new Float32Array(7);
  let r = 0, gg = 0, b = 0;
  const set = (h: string) => { const v = hexc(h); r = v[0]; gg = v[1]; b = v[2]; };
  const lerp = (h1: string, h2: string, t: number) => { const a = hexc(h1), bb = hexc(h2); t = t < 0 ? 0 : t > 1 ? 1 : t; r = a[0] + (bb[0] - a[0]) * t; gg = a[1] + (bb[1] - a[1]) * t; b = a[2] + (bb[2] - a[2]) * t; };
  const shade = (k: number) => { r *= k; gg *= k; b *= k; };
  const bloodLava = (_X: number, _Yp: number, a1: number, a2: number, a3: number, gr: number) => {
    const crack = Math.abs(a2 - 0.5);
    if (crack < 0.012) set('#ff8a70');
    else if (crack < 0.03) set('#ff3a2a');
    else if (a3 > 0.6) lerp('#a8100c', '#ff4a2a', (a3 - 0.6) * 4);
    else { lerp('#2a0404', '#5a0808', a1 * 1.4); if (gr < 0.04) set('#7a0e0a'); }
  };
  // 24차 4층 용광로: 쇳물 — 검게 식은 딱지 사이로 하얗게 달아오른 금, 노랗게 끓는 웅덩이
  const molten = (a1: number, a2: number, a3: number, gr: number) => {
    const crack = Math.abs(a2 - 0.5);
    if (crack < 0.014) set('#fff2b8');
    else if (crack < 0.034) set('#ffb02a');
    else if (a3 > 0.55) lerp('#d8520e', '#ffd04a', (a3 - 0.55) * 3.2);
    else { lerp('#1e0e08', '#4a1e0a', a1 * 1.4); if (gr < 0.05) set('#8a3a10'); }
  };
  const row = (py: number) => {
    const Y = py + minY;
    // 이 줄에서 마름모 안에 드는 x 범위만 (밖의 점은 건너뛴다)
    for (let px = 0; px < W; px++) {
      const X = px + minX;
      const fi = (X / (TW / 2) + Y / (TH / 2)) / 2, fj = (Y / (TH / 2) - X / (TW / 2)) / 2;
      if (fi < i0 || fi >= i1 || fj < j0 || fj >= j1) continue;
      // ① 둘레 네 칸을 섞고 잡음으로 흔든 점수 → 가장 큰 땅 / 두 번째 땅과의 차이(경계까지의 거리)
      const ci = fi - 0.5, cj = fj - 0.5, ti = Math.floor(ci), tj = Math.floor(cj), ax = ci - ti, ay = cj - tj;
      sc.fill(0);
      sc[cls(ti, tj)] += (1 - ax) * (1 - ay); sc[cls(ti + 1, tj)] += ax * (1 - ay); sc[cls(ti, tj + 1)] += (1 - ax) * ay; sc[cls(ti + 1, tj + 1)] += ax * ay;
      const Yp = Y * 2;
      let best = 0, bv = -9, second = 0, sv = -9;
      for (let k = 0; k < 7; k++) {
        if (sc[k] <= 0) continue;
        const v = sc[k] + (nz(X + k * 41, Yp + k * 67) - 0.5) * 0.62;
        if (v > bv) { sv = bv; second = best; bv = v; best = k; } else if (v > sv) { sv = v; second = k; }
      }
      const edge = sv < -8 ? 1 : bv - sv; // 0에 가까울수록 경계
      const n1 = nz(X, Yp), n2 = nz(X + 113, Yp + 71), n3 = nz((X >> 1) + 57, (Yp >> 1) + 191);
      const grain = hash(X, Y, 3);
      // ③ 높낮이 그림자: 왼쪽 위가 높으면 어둡고, 낮으면 밝다
      const relief = (nz(X - 2, Yp - 3) - n1) * 2.6;
      if (best === 2) {
        // 물: 용암 · 늪물 · 핏물
        if (theme === 'ash') {
          const crack = Math.abs(n2 - 0.5), hot = n3;
          if (edge < 0.05) set(edge < 0.025 ? '#ffd27a' : '#ff8a2a'); // 가장자리의 달아오른 테
          else if (crack < 0.012) set('#ffe08a');
          else if (crack < 0.03) set('#ff8a2a');
          else if (hot > 0.6) lerp('#c8401a', '#ffa83a', (hot - 0.6) * 4);
          else { lerp('#2e0c08', '#6a1a0c', n1 * 1.4); if (grain < 0.04) set('#8a2a10'); }
        } else if (theme === 'swamp') {
          lerp('#16201c', '#24302a', n1);
          if (Math.abs(Math.sin(X * 0.09 + Yp * 0.05 + n2 * 9)) < 0.05) set('#3a4a40');
          if (n3 > 0.66 && grain < 0.3) set('#2e3e26'); // 물이끼
          if (edge < 0.05) set('#3a3424');
        } else if (theme === 'forge') {
          molten(n1, n2, n3, grain);
          if (edge < 0.05) set(edge < 0.025 ? '#fff6d0' : '#ffb02a');
        } else {
          // 피의 용암: 검붉게 식은 껍질 사이로 핏빛 금이 달아오른다
          bloodLava(X, Yp, n1, n2, n3, grain);
          if (edge < 0.05) set(edge < 0.025 ? '#ff7a6a' : '#e0281e');
        }
      } else if (best === 3) {
        // 돌길(1·3층) · 널빤지 길(2층): 칸을 셋으로 나눈 돌·판자에 모서리 빛과 그림자
        if (theme === 'swamp') {
          const u = fi * 4 + (Math.floor(fj * 1.5) % 2) * 0.5, pu = u - Math.floor(u), plank = Math.floor(u);
          if (pu < 0.1) set('#1a1208');
          else { lerp('#5e4a32', '#46362a', hash(plank, Math.floor(fj * 1.5), 9) * 0.8 + n2 * 0.4); if (Math.abs(Math.sin(fj * 40 + plank)) < 0.12) shade(0.86); if (pu < 0.2) shade(1.12); if (pu > 0.9) shade(0.8); }
        } else {
          const rowj = Math.floor(fj * 3), u = fi * (theme === 'market' ? 2 : 3) + (rowj % 2) * 0.5, v = fj * 3;
          const cu = Math.floor(u), du = u - cu, dv = v - rowj;
          const id = hash(cu, rowj, 5);
          const e = Math.min(du, 1 - du, dv, 1 - dv);
          if (e < 0.07 + n3 * 0.03) set(theme === 'market' ? '#1e0c0a' : theme === 'forge' ? '#0a0808' : '#141010');
          else {
            if (theme === 'market') lerp('#6a2e24', '#4e2018', id * 0.8 + n1 * 0.3); else if (theme === 'forge') { lerp('#3e3836', '#2a2624', id * 0.8 + n1 * 0.3); if (du < 0.12 && dv < 0.18) set('#6a625a'); } else lerp('#4a4440', '#36302c', id * 0.8 + n1 * 0.3);
            if (du < 0.2 || dv < 0.2) shade(1.16); else if (du > 0.82 || dv > 0.8) shade(0.78);
            if (grain < 0.02) shade(0.7);
          }
        }
      } else if (best === 5) {
        // 다리: 물 위의 판자 (틈으로 아래의 빛)
        const u = fj * 5, pu = u - Math.floor(u);
        if (pu < 0.14) set(theme === 'ash' ? '#a8321a' : theme === 'swamp' ? '#101814' : '#3a0404');
        else { lerp('#4a3424', '#34241a', hash(Math.floor(u), 2, 3) + n1 * 0.3); if (pu < 0.26) shade(1.15); if (pu > 0.88) shade(0.75); }
        if ((theme === 'market' || theme === 'forge') && ((fi * 6) % 1 < 0.18)) set('#3a3a3a'); // 쇠 창살 다리
      } else if (best === 6) {
        lerp(theme === 'swamp' ? '#20221a' : theme === 'market' ? '#2a1816' : theme === 'forge' ? '#161212' : '#221e1c', theme === 'swamp' ? '#16180f' : theme === 'market' ? '#1c100e' : theme === 'forge' ? '#0c0a0a' : '#161312', n1);
      } else if (theme === 'ash') {
        if (best === 1) {
          // 그을린 모래: 바람에 쓸린 물결 무늬 + 검은 재 알갱이
          lerp('#5a4a3c', '#40362e', n1);
          if (Math.sin(X * 0.16 + Yp * 0.36 + n2 * 7) > 0.82) shade(1.12);
          if (grain < 0.05) set('#2a2420');
        } else if (best === 4) { lerp('#322c2a', '#24201e', n1); if (grain < 0.03) set('#4a4440'); }
        else {
          // 재 바닥: 낮은 재 언덕, 갈라진 금(가끔 속이 달아오름), 자갈, 불씨
          lerp('#4c4641', '#332e2b', n1 * 1.2 - 0.1);
          const crack = Math.abs(n2 - 0.5);
          if (crack < 0.008) set(n3 > 0.66 ? '#b8401a' : '#1c1816');
          else if (crack < 0.016) shade(0.82);
          if (grain < 0.004) set('#d9632a');
          else if (hash(X >> 1, Y >> 1, 11) < 0.012) set(hash(X, Y, 12) < 0.5 ? '#6e665e' : '#58504a');
        }
        if (second === 2 && edge < 0.22) { const k = 1 - edge / 0.22; r = r * (1 - k * 0.5) + 40 * k; gg *= 1 - k * 0.6; b *= 1 - k * 0.7; if (edge < 0.08 && grain < 0.25) set('#ff6a2a'); } // 용암 가의 그을린 땅
      } else if (theme === 'swamp') {
        if (best === 1) {
          // 이끼·풀: 자란 풀잎(세로 점) 끝이 밝다
          lerp('#2e3a24', '#222c1a', n1);
          const blade = hash(X, Y >> 2, 21);
          if (blade < 0.09) set(hash(X, Y, 22) < 0.5 ? '#4a6a34' : '#5e7e3a');
          else if (blade < 0.16) shade(0.82);
        } else if (best === 4) { lerp('#3e3424', '#2e2618', n1); if (Math.sin(X * 0.3 + Yp * 0.1) > 0.94) shade(0.8); }
        else {
          // 진흙: 젖어 번들거리는 곳, 고인 물웅덩이, 발자국 같은 패임
          lerp('#3c3626', '#28241a', n1 * 1.2 - 0.1);
          if (n2 > 0.7) { lerp('#4e4832', '#5e5838', (n2 - 0.7) * 3); if (grain < 0.05) set('#8a845a'); }
          if (n3 > 0.72) { set('#1c2420'); if (grain < 0.06) set('#3a4a40'); }
        }
        if (second === 2 && edge < 0.2) shade(0.65 + edge * 1.6); // 물가는 축축하게 어둡다
      } else if (theme === 'forge') {
        if (best === 1) { lerp('#2e2a28', '#1e1b1a', n1); if (hash(X, Y >> 1, 23) < 0.05) set('#6e665e'); } // 쇳가루 깔린 땅
        else if (best === 4) { lerp('#2a2422', '#1c1816', n1); if (Math.sin(X * 0.4 + Yp * 0.12) > 0.95) set('#3e3632'); }
        else {
          // 검은 쇠똥(슬래그) 바닥: 굳은 거품 자국 · 속이 달아오른 금 · 반짝이는 쇳가루 · 가끔 아직 뜨거운 덩어리
          lerp('#2a2624', '#181514', n1 * 1.2 - 0.1);
          if (n2 > 0.7) shade(0.8 + (n2 - 0.7));
          const crack = Math.abs(n3 - 0.5);
          if (crack < 0.006) set('#ff8a1a'); else if (crack < 0.012) set('#5a2a10');
          if (grain < 0.006) set('#c8b8a0'); else if (grain < 0.012) set('#ff6a1a');
        }
        if (second === 2 && edge < 0.24) { const k = 1 - edge / 0.24; r = r * (1 - k * 0.3) + 90 * k; gg = gg * (1 - k * 0.5) + 30 * k; b *= 1 - k * 0.7; if (edge < 0.08 && grain < 0.3) set('#ffb02a'); } // 쇳물가는 달아오른다
      } else {
        if (best === 1) { lerp('#3e2620', '#2e1c18', n1); if (n2 > 0.66) shade(0.75); }
        else if (best === 4) {
          const u = fi * 4 + (Math.floor(fj * 4) % 2) * 0.5, du = u - Math.floor(u), dv = fj * 4 - Math.floor(fj * 4);
          if (du < 0.1 || dv < 0.12) set('#1c0e0c'); else { lerp('#4a3430', '#3a2824', hash(Math.floor(u), Math.floor(fj * 4), 4) + n1 * 0.3); if (du < 0.24 || dv < 0.26) shade(1.12); }
        } else {
          // 붉은 흙: 핏자국 얼룩, 발에 다져진 자국, 작은 돌
          lerp('#4c2c24', '#36201a', n1 * 1.2 - 0.1);
          if (n2 > 0.72) lerp('#5a0e0a', '#3a0806', (n2 - 0.72) * 3);
          if (hash(X >> 1, Y >> 1, 13) < 0.01) set('#6a4a40');
        }
        if (second === 2 && edge < 0.2) shade(0.6 + edge * 2);
      }
      if (best !== 2) { const k = 1 + relief; r *= k; gg *= k; b *= k; } // 높낮이
      const o = (py * W + px) * 4;
      D[o] = r < 0 ? 0 : r > 255 ? 255 : r; D[o + 1] = gg < 0 ? 0 : gg > 255 ? 255 : gg; D[o + 2] = b < 0 ? 0 : b > 255 ? 255 : b; D[o + 3] = 255;
    }
  };
  let py = 0;
  const job: GroundJob = {
    canvas: c, x: minX, y: minY, done: false,
    step(ms: number) {
      if (job.done) return true;
      const t0 = performance.now();
      while (py < H) {
        row(py++);
        if ((py & 7) === 0 && performance.now() - t0 > ms) return false;
      }
      g.putImageData(im, 0, 0);
      job.done = true;
      return true;
    },
  };
  return job;
}

/** 지도 밖까지 이어지는 피의 용암 바다 (3층): 이음매 없이 반복되는 256×128 한 장 */
let SEA: HTMLCanvasElement | null = null;
export function bloodLavaTile(forge = false) {
  if (forge) return moltenSeaTile();
  if (SEA) return SEA;
  const NZ = noiseTex();
  const nz = (x: number, y: number) => NZ[((y & 255) << 8) | (x & 255)];
  const c = document.createElement('canvas');
  c.width = 256; c.height = 128;
  const g = c.getContext('2d')!;
  const im = g.createImageData(256, 128);
  const col = (h: string) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
  for (let y = 0; y < 128; y++) for (let x = 0; x < 256; x++) {
    const Yp = y * 2, n1 = nz(x, Yp), n2 = nz(x + 113, Yp + 71), n3 = nz(x + 57, Yp + 191), gr = hash(x, y, 3); // 모두 256 주기라 이음매가 없다
    const crack = Math.abs(n2 - 0.5);
    let c3: number[];
    if (crack < 0.012) c3 = col('#ff8a70');
    else if (crack < 0.03) c3 = col('#ff3a2a');
    else if (n3 > 0.6) { const a = col('#a8100c'), b = col('#ff4a2a'), t = Math.min(1, (n3 - 0.6) * 4); c3 = a.map((v, k) => v + (b[k] - v) * t); }
    else { const a = col('#2a0404'), b = col('#5a0808'), t = Math.min(1, n1 * 1.4); c3 = a.map((v, k) => v + (b[k] - v) * t); if (gr < 0.04) c3 = col('#7a0e0a'); }
    const o = (y * 256 + x) * 4;
    im.data[o] = c3[0]; im.data[o + 1] = c3[1]; im.data[o + 2] = c3[2]; im.data[o + 3] = 255;
  }
  g.putImageData(im, 0, 0);
  SEA = c;
  return c;
}

/** 24차: 4층 바깥의 끝없는 쇳물 바다 (이음매 없는 256×128) */
let IRON: HTMLCanvasElement | null = null;
function moltenSeaTile() {
  if (IRON) return IRON;
  const NZ = noiseTex();
  const nz = (x: number, y: number) => NZ[((y & 255) << 8) | (x & 255)];
  const c = document.createElement('canvas');
  c.width = 256; c.height = 128;
  const g = c.getContext('2d')!;
  const im = g.createImageData(256, 128);
  const col = (h: string) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
  for (let y = 0; y < 128; y++) for (let x = 0; x < 256; x++) {
    const Yp = y * 2, n1 = nz(x, Yp), n2 = nz(x + 113, Yp + 71), n3 = nz(x + 57, Yp + 191), gr = hash(x, y, 3);
    const crack = Math.abs(n2 - 0.5);
    let c3: number[];
    if (crack < 0.014) c3 = col('#fff2b8');
    else if (crack < 0.034) c3 = col('#ffb02a');
    else if (n3 > 0.55) { const a = col('#d8520e'), b = col('#ffd04a'), t = Math.min(1, (n3 - 0.55) * 3.2); c3 = a.map((v, k) => v + (b[k] - v) * t); }
    else { const a = col('#1e0e08'), b = col('#4a1e0a'), t = Math.min(1, n1 * 1.4); c3 = a.map((v, k) => v + (b[k] - v) * t); if (gr < 0.05) c3 = col('#8a3a10'); }
    const o = (y * 256 + x) * 4;
    im.data[o] = c3[0]; im.data[o + 1] = c3[1]; im.data[o + 2] = c3[2]; im.data[o + 3] = 255;
  }
  g.putImageData(im, 0, 0);
  IRON = c;
  return c;
}

/** 물(용암·늪·핏물) 칸인가: 흐르는 빛을 덧그릴 자리 (가장자리는 빼고 안쪽만) */
export function liquidInside(z: Zone, i: number, j: number) {
  const w = (a: number, b2: number) => tileAt(z, a, b2) === 'water';
  return w(i, j) && w(i + 1, j) && w(i - 1, j) && w(i, j + 1) && w(i, j - 1);
}

/** 지옥 구조물: 재의 문턱 = 부서진 돌 폐허, 굶주림의 늪 = 판잣집, 피의 시장 = 붉은 천막 가게. 유황새는 검붉은 돌집 */
export function drawHellStructure(b: Building, theme: Theme, night: boolean): { canvas: HTMLCanvasElement; x: number; y: number } {
  if (b.hk) return drawHellBuild(b, b.hk, theme);
  if (b.hut) return drawHellBuild(b, 'thatch', theme);
  const { i0, j0, w, d } = b;
  const i1 = i0 + w, j1 = j0 + d;
  const shop = b.cat === 'ujusae';
  const H = b.h;
  const [ax, ay] = iso(i0, j0), [bx, by] = iso(i1, j0), [cx, cy] = iso(i1, j1), [dx, dy] = iso(i0, j1);
  const MT = 30;
  const minX = dx - 2, maxX = bx + 2, minY = ay - H - MT, maxY = cy + 2;
  const W = Math.ceil(maxX - minX), Ht = Math.ceil(maxY - minY);
  const c = document.createElement('canvas');
  c.width = W; c.height = Ht;
  const g = c.getContext('2d')!;
  const im = g.createImageData(W, Ht);
  const base = hex(b.color);
  const seed = i0 * 131 + j0 * 71;
  // 무너진 윗선: 폐허만 들쭉날쭉
  const broken = theme === 'ash' && !shop;
  const topAt = (t: number, face: number) => {
    if (!broken) return H;
    const k = Math.floor(t * 9);
    return H * (0.55 + 0.45 * hash(k, face, seed)) - (hash(k + 1, face, seed) < 0.25 ? 6 : 0);
  };
  const put = (x: number, y: number, col: RGB) => {
    const px = Math.round(x - minX), py = Math.round(y - minY);
    if (px < 0 || py < 0 || px >= W || py >= Ht) return;
    const o = (py * W + px) * 4;
    im.data[o] = col[0]; im.data[o + 1] = col[1]; im.data[o + 2] = col[2]; im.data[o + 3] = 255;
  };
  const wallColor = (face: number, t: number, z: number, len: number): RGB => {
    const shade = face === 0 ? 1.0 : 0.72;
    const u = t * len, n = hash(Math.floor(u / 2), Math.floor(z / 2), seed + face);
    let col: RGB;
    if (theme === 'swamp' && !shop) {
      // 판자 (세로)
      const plank = Math.floor(u / 7);
      col = (u % 7) < 1 ? hex('#1a140e') : mix(hex('#5a4630'), hex('#3e3022'), hash(plank, 1, seed));
    } else {
      // 돌벽돌
      const row = Math.floor(z / 7), off = (row % 2) * 6;
      const mortar = z % 7 < 1 || (u + off) % 12 < 1;
      col = mortar ? mix(base, [0, 0, 0], 0.55) : mix(base, mix(base, [255, 255, 255], 0.12), n);
      if (theme === 'ash' && hash(Math.floor(u), Math.floor(z), seed) < 0.01) col = hex('#ff7a2a');
    }
    return [col[0] * shade, col[1] * shade, col[2] * shade];
  };
  // 왼쪽 면(+j): D → C, 오른쪽 면(+i): C → B
  for (const [face, p0, p1] of [[0, [dx, dy], [cx, cy]], [1, [cx, cy], [bx, by]]] as const) {
    const len = Math.hypot(p1[0] - p0[0], p1[1] - p0[1]);
    const steps = Math.ceil(Math.abs(p1[0] - p0[0]));
    for (let s = 0; s <= steps; s++) {
      const t = s / steps;
      const x = p0[0] + (p1[0] - p0[0]) * t, y = p0[1] + (p1[1] - p0[1]) * t;
      const top = topAt(t, face);
      for (let z = 0; z <= top; z++) {
        let col = wallColor(face, t, z, len);
        // 문·창: 가게 = 빛나는 문, 시장 = 붉은 천막 아래 가판, 폐허 = 검은 구멍 (밤에는 불빛)
        const u = t * len;
        if (shop && face === 0 && Math.abs(t - 0.5) < 0.12 && z < 24) col = night ? hex('#ff9a4a') : hex('#c9602a');
        else if (theme === 'market' && !shop && z > 10 && z < 30 && (u % 26) < 16) col = z > 26 ? hex('#9a1a1a') : night ? hex('#e8a03a') : hex('#3a1a12');
        else if (theme === 'ash' && !shop && z > 14 && z < 26 && (u % 22) > 8 && (u % 22) < 16) col = night && hash(Math.floor(u / 22), face, seed) < 0.5 ? hex('#ff6a1a') : hex('#120c0a');
        else if (theme === 'swamp' && !shop && face === 0 && Math.abs(t - 0.5) < 0.1 && z < 20) col = hex('#120e0a');
        put(x, y - z, col);
      }
    }
  }
  // 지붕
  const roofCol = theme === 'swamp' && !shop ? hex('#5a4a2a') : theme === 'market' && !shop ? hex('#7a1a16') : mix(base, [0, 0, 0], 0.25);
  if (!broken) {
    const steps = 140;
    for (let a = 0; a <= steps; a++)
      for (let bb = 0; bb <= steps; bb++) {
        const fi = i0 + (w * a) / steps, fj = j0 + (d * bb) / steps;
        const [x, y] = iso(fi, fj);
        const n = hash(Math.floor(a / 6), Math.floor(bb / 6), seed + 9);
        put(x, y - H, mix(roofCol, [0, 0, 0], n * 0.25));
      }
  } else {
    // 무너진 폐허 위: 잔해 몇 덩이
    for (let k = 0; k < 4; k++) {
      const fi = i0 + w * (0.2 + 0.6 * hash(k, 3, seed)), fj = j0 + d * (0.2 + 0.6 * hash(k, 5, seed));
      const [x, y] = iso(fi, fj);
      for (let yy = -3; yy <= 3; yy++) for (let xx = -6; xx <= 6; xx++) if (Math.abs(xx) / 6 + Math.abs(yy) / 3 <= 1) put(x + xx, y + yy - 3, mix(base, [0, 0, 0], 0.4));
    }
  }
  g.putImageData(im, 0, 0);
  // 가게: 지붕 위 작은 앵무새 깃발 대신 붉은 등 두 개
  if (shop) {
    for (const t of [0.25, 0.75]) {
      const x = dx + (cx - dx) * t - minX, y = dy + (cy - dy) * t - H * 0.55 - minY;
      g.fillStyle = night ? '#ffb05a' : '#c9602a';
      g.fillRect(Math.round(x) - 2, Math.round(y) - 3, 4, 6);
    }
  }
  return { canvas: c, x: minX, y: minY };
}

/** 지옥 화면 위 붉은 어둠의 세기 (깊을수록 짙다) */
export function hellTint(floor: number) {
  return { color: [0x2a0a06, 0x12200c, 0x2a0408, 0x2e1404][Math.min(3, floor - 1)], alpha: 0.32 + Math.min(3, floor) * 0.04 };
}

// ───────────────────────── 지옥 소품: 마른 나무 · 화로 · 부러진 돌기둥 ─────────────────────────
// 현실 소품(가로수·가로등·BTS 기둥) 자리에 놓인다. 화로는 불빛(가로등 빛 자리)이 바닥 가까이에 있다.
const propCache = new Map<string, { canvas: HTMLCanvasElement; ax: number; ay: number; glow?: [number, number] }>();
export function hellProp(kind: string, theme: Theme, v: number) {
  const key = `${kind}-${theme}-${v}`;
  const hit = propCache.get(key);
  if (hit) return hit;
  const c = document.createElement('canvas');
  const g = c.getContext('2d')!;
  const R = (x: number, y: number, w: number, h: number, col: string) => { g.fillStyle = col; g.fillRect(x, y, w, h); };
  let out: { canvas: HTMLCanvasElement; ax: number; ay: number; glow?: [number, number] };
  if (kind === 'tree') {
    // 잎 하나 없이 갈라진 검은 나무 (늪은 이끼가 늘어진다)
    c.width = 64; c.height = 96;
    const bark = theme === 'swamp' ? '#1e2416' : '#1a1210', hi = theme === 'swamp' ? '#3a4228' : '#3a2a22';
    const seg = (x0: number, y0: number, x1: number, y1: number, w: number) => {
      const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0));
      for (let k = 0; k <= n; k++) {
        const t = k / n, x = x0 + (x1 - x0) * t, y = y0 + (y1 - y0) * t, ww = Math.max(1, Math.round(w * (1 - t * 0.6)));
        R(Math.round(x - ww / 2), Math.round(y), ww, 1, bark);
        R(Math.round(x - ww / 2), Math.round(y), 1, 1, hi);
      }
    };
    const r = (k: number) => hash(v, k, 77);
    seg(32, 94, 31 + (r(1) - 0.5) * 6, 50, 7);
    const tips: [number, number][] = [];
    for (let k = 0; k < 5; k++) {
      const y0 = 52 + k * 7 - 10, dir = k % 2 ? 1 : -1;
      const x1 = 32 + dir * (10 + r(k + 3) * 16), y1 = y0 - 14 - r(k + 9) * 18;
      seg(32, y0, x1, y1, 3);
      seg(x1, y1, x1 + dir * 5, y1 - 7, 1);
      tips.push([x1, y1]);
    }
    seg(31, 52, 30 + (r(2) - 0.5) * 8, 14, 3);
    if (theme === 'swamp') for (const [x, y] of tips) for (let k = 0; k < 9; k++) R(Math.round(x) + (k % 3) - 1, Math.round(y) + k, 1, 1, k % 2 ? '#4a5a2a' : '#5e6e34');
    g.globalAlpha = 0.35; R(18, 93, 28, 2, '#000'); g.globalAlpha = 1;
    out = { canvas: c, ax: 0.5, ay: 94 / 96 };
  } else if (kind === 'lamp') {
    // 화로: 쇠 다리 셋 위 불붙은 그릇
    c.width = 28; c.height = 48;
    for (const [x0, x1] of [[6, 10], [21, 17], [14, 14]]) for (let y = 24; y < 46; y++) R(Math.round(x0 + ((x1 - x0) * (y - 24)) / 22), y, 2, 1, '#241a16');
    R(3, 22, 22, 4, '#3a2a22'); R(4, 26, 20, 2, '#1a1210'); R(3, 22, 22, 1, '#5a4434');
    const fl = ['#ffe08a', '#ffb02a', '#f06a1a', '#b8321a'];
    for (let k = 0; k < 40; k++) {
      const x = 5 + hash(v, k, 3) * 18, h = 4 + hash(v, k, 5) * 14 * (1 - Math.abs(x - 14) / 12);
      R(Math.round(x), Math.round(22 - h), 2, Math.round(h), fl[Math.min(3, Math.floor(hash(k, v, 9) * 4))]);
    }
    R(12, 10, 4, 10, '#ffe08a');
    g.globalAlpha = 0.35; R(4, 45, 20, 2, '#000'); g.globalAlpha = 1;
    out = { canvas: c, ax: 0.5, ay: 46 / 48, glow: [0, -30] };
  } else {
    // 부러진 돌기둥 (피의 시장은 붉은 천이 감겨 있다)
    c.width = 34; c.height = 80;
    const top = 10 + Math.floor(hash(v, 1, 4) * 22);
    for (let y = top; y < 76; y++) { R(6, y, 22, 1, '#4a4440'); R(6, y, 6, 1, '#5e5852'); R(23, y, 5, 1, '#322e2a'); }
    for (let x = 6; x < 28; x++) { const d = Math.floor(hash(x, v, 8) * 7); g.clearRect(x, top, 1, d); }
    for (let k = 0; k < 6; k++) R(8 + Math.floor(hash(v, k, 2) * 16), top + 10 + k * 9, 3, 1, '#2a2622');
    if (theme === 'market') { R(6, top + 18, 22, 5, '#7a1414'); R(6, top + 18, 22, 1, '#a42020'); R(20, top + 23, 3, 10, '#7a1414'); }
    R(3, 74, 28, 4, '#3a3430');
    g.globalAlpha = 0.35; R(2, 78, 30, 2, '#000'); g.globalAlpha = 1;
    out = { canvas: c, ax: 0.5, ay: 78 / 80 };
  }
  propCache.set(key, out);
  return out;
}

