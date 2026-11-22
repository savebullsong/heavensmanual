// 도트 래스터 엔진: 다각형 → 재질 버퍼 → 원통형 음영 → 셀아웃 외곽선
export type Pt = [number, number];

/** 기준 색 하나로 4단 명암 램프를 만든다 (어둠 → 밝음) */
export function ramp(hex: string): string[] {
  const [h, s, l] = hexToHsl(hex);
  const mk = (dl: number, dh: number, ds: number) =>
    hslToHex((h + dh + 360) % 360, clamp(s + ds, 0, 100), clamp(l + dl, 4, 96));
  return [mk(-24, -8, 4), mk(-11, -4, 2), mk(0, 0, 0), mk(11, 4, -4)];
}

function clamp(v: number, a: number, b: number) {
  return Math.max(a, Math.min(b, v));
}

function hexToHsl(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  const r = ((n >> 16) & 255) / 255, g = ((n >> 8) & 255) / 255, b = (n & 255) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === r) h = (g - b) / d + (g < b ? 6 : 0);
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h *= 60;
  }
  return [h, s * 100, l * 100];
}

function hslToHex(h: number, s: number, l: number): string {
  s /= 100; l /= 100;
  const k = (n: number) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  const to = (x: number) => Math.round(x * 255).toString(16).padStart(2, '0');
  return '#' + to(f(0)) + to(f(8)) + to(f(4));
}

function inside(pts: Pt[], px: number, py: number) {
  let c = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const [xi, yi] = pts[i], [xj, yj] = pts[j];
    if (yi > py !== yj > py && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) c = !c;
  }
  return c;
}

export class Raster {
  readonly mat: Int8Array;
  readonly man: Int8Array;
  readonly fix: (string | null)[];
  readonly W: number;
  readonly H: number;
  readonly pal: Record<number, string[]>;
  constructor(W: number, H: number, pal: Record<number, string[]>) {
    this.W = W; this.H = H; this.pal = pal;
    this.mat = new Int8Array(W * H);
    this.man = new Int8Array(W * H).fill(-1);
    this.fix = new Array(W * H).fill(null);
  }
  private each(pts: Pt[], fn: (k: number) => void) {
    let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
    for (const [x, y] of pts) {
      x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y);
    }
    for (let y = Math.max(0, Math.floor(y0)); y <= Math.min(this.H - 1, Math.ceil(y1)); y++)
      for (let x = Math.max(0, Math.floor(x0)); x <= Math.min(this.W - 1, Math.ceil(x1)); x++)
        if (inside(pts, x + 0.5, y + 0.5)) fn(y * this.W + x);
  }
  /** 재질 m 으로 다각형을 칠한다 */
  poly(pts: Pt[], m: number) {
    this.each(pts, (k) => { this.mat[k] = m; this.man[k] = -1; this.fix[k] = null; });
  }
  /** 이미 칠해진 재질 ms 위에만 명암 단계 s 를 덮어쓴다 */
  shade(pts: Pt[], s: number, ms: number[]) {
    this.each(pts, (k) => { if (ms.includes(this.mat[k])) this.man[k] = s; });
  }
  /** 한 점을 고정색으로 찍는다 (눈, 끈, 버클 같은 손 픽셀) */
  dot(x: number, y: number, c: string) {
    x = Math.round(x); y = Math.round(y);
    if (x >= 0 && x < this.W && y >= 0 && y < this.H && this.mat[y * this.W + x]) this.fix[y * this.W + x] = c;
  }
  private at(x: number, y: number) {
    return x < 0 || y < 0 || x >= this.W || y >= this.H ? 0 : this.mat[y * this.W + x];
  }
  /** 음영과 외곽선을 적용해 색 배열을 돌려준다 */
  finish(opt: { flat?: boolean; noOutline?: boolean } = {}): (string | null)[] {
    const { W, H, mat, man, fix, pal } = this;
    const out: (string | null)[] = new Array(W * H).fill(null);
    for (let y = 0; y < H; y++) {
      let x = 0;
      while (x < W) {
        const m = mat[y * W + x];
        if (!m) { x++; continue; }
        let R = x;
        while (R + 1 < W && mat[y * W + R + 1] === m) R++;
        const len = R - x + 1;
        for (let i = x; i <= R; i++) {
          const k = y * W + i;
          let s = 2;
          if (!opt.flat) {
            const t = (i - x + 0.5) / len;
            if (len >= 4) s = t < 0.22 ? 3 : t < 0.6 ? 2 : 1;
            else if (len === 3) s = i === x ? 3 : i === R ? 1 : 2;
            if (this.at(i, y - 1) !== m && s >= 2) s = 3;
            if (this.at(i, y + 1) !== m) s = Math.min(s, 1);
            if (len >= 6 && i === R && this.at(i, y + 1) !== m) s = 0;
            if (man[k] >= 0) s = man[k];
          }
          out[k] = fix[k] || pal[m][s];
        }
        x = R + 1;
      }
    }
    if (opt.noOutline) return out;
    const o2 = out.slice();
    for (let y = 0; y < H; y++)
      for (let x = 0; x < W; x++) {
        const k = y * W + x;
        if (mat[k]) continue;
        const r = this.at(x + 1, y), d = this.at(x, y + 1), l = this.at(x - 1, y), u = this.at(x, y - 1);
        if (r || d || l || u) o2[k] = (r || d) && !(l || u) ? pal[r || d][0] : '#120b09';
      }
    return o2;
  }
}

/** 색 배열을 캔버스로 */
export function toCanvas(px: (string | null)[], W: number, H: number): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const g = c.getContext('2d')!;
  const id = g.createImageData(W, H);
  for (let i = 0; i < px.length; i++) {
    const col = px[i];
    if (!col) continue;
    const n = parseInt(col.slice(1), 16);
    id.data[i * 4] = (n >> 16) & 255;
    id.data[i * 4 + 1] = (n >> 8) & 255;
    id.data[i * 4 + 2] = n & 255;
    id.data[i * 4 + 3] = 255;
  }
  g.putImageData(id, 0, 0);
  return c;
}
