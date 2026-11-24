// 미납귀: 베스크의 빚 독촉견. 목에 장부를 건 머리 셋 달린 작은 켈베로스.
// 빚이 남아 있는 동안 지옥에서 나를 따라다니고, 떨어진 노전을 먼저 물어 간다.
// 그림은 2배 밀도 캔버스에 점으로 찍고 반으로 줄여 보인다 (인물과 같은 밀도).
import { Container, Graphics, Sprite, Texture } from 'pixi.js';

const W = 64, H = 50;
const HS = 0.64; // 화면 크기 (사람 허리께)
let cache: Texture[] | null = null;

function frames(): Texture[] {
  if (cache) return cache;
  cache = [0, 1, 2, 3, 4].map((f) => {
    const c = document.createElement('canvas');
    c.width = W; c.height = H;
    const g = c.getContext('2d')!;
    const px = (x: number, y: number, w: number, h: number, col: string) => { g.fillStyle = col; g.fillRect(Math.round(x), Math.round(y), w, h); };
    const ell = (cx: number, cy: number, rx: number, ry: number, col: string) => {
      g.fillStyle = col;
      for (let y = Math.floor(cy - ry); y <= cy + ry; y++) for (let x = Math.floor(cx - rx); x <= cx + rx; x++) {
        const dx = (x + 0.5 - cx) / rx, dy = (y + 0.5 - cy) / ry;
        if (dx * dx + dy * dy <= 1) g.fillRect(x, y, 1, 1);
      }
    };
    const FUR = '#2c1d1c', FUR2 = '#43302c', FUR3 = '#1a1010', EYE = '#ff3a1a', TOOTH = '#eadcc4', GOLD = '#d9a83a';
    const walk = f > 0;
    const sw = walk ? [0, 2, 0, -2][f - 1] : 0;
    const bob = walk ? (f % 2 ? -1 : 0) : 0;
    // 꼬리: 위로 말린 채찍, 끝에 불씨
    for (let k = 0; k < 9; k++) px(12 - k * 0.7, 24 - k * 1.3 + bob, 2, 2, k > 6 ? '#ff7a2a' : FUR);
    px(5, 11 + bob, 2, 2, '#ffd06a');
    // 다리 넷 (뒤쪽 둘은 어둡게)
    const leg = (x: number, off: number, col: string) => { px(x, 31 + bob, 4, 9 + off, col); px(x - 1, 39 + bob + off, 6, 2, FUR3); };
    leg(17 - sw, 0, FUR3);
    leg(36 + sw, 0, FUR3);
    leg(21 + sw, 1, FUR);
    leg(40 - sw, 1, FUR);
    // 몸통
    ell(29, 27 + bob, 15, 7, FUR);
    ell(29, 24.5 + bob, 13, 4, FUR2);
    for (let k = 0; k < 6; k++) px(18 + k * 4, 21 + bob + (k % 2), 2, 2, FUR3); // 등 갈기
    px(19, 30 + bob, 20, 2, FUR3);
    // 목 셋과 머리 셋 (뒤 → 앞 순서)
    const head = (hx: number, hy: number, shade: string, hi: string) => {
      ell(hx, hy, 6, 5, shade);
      ell(hx - 1, hy - 1.5, 4.5, 2.5, hi);
      px(hx + 3, hy, 6, 4, shade); // 주둥이
      px(hx + 8, hy, 2, 2, FUR3); // 코
      px(hx + 4, hy + 3, 1, 2, TOOTH); px(hx + 7, hy + 3, 1, 2, TOOTH);
      px(hx - 3, hy - 7, 3, 4, shade); px(hx - 2, hy - 8, 1, 1, shade); // 귀
      px(hx + 1, hy - 2, 2, 2, EYE);
    };
    ell(44, 20 + bob, 4, 6, FUR3);
    head(46, 11 + bob, FUR3, FUR);
    ell(46, 22 + bob, 4.5, 6, FUR);
    head(50, 17 + bob, FUR, FUR2);
    ell(41, 24 + bob, 4, 5, FUR2);
    head(43, 22 + bob, FUR, FUR2);
    // 가시 박힌 금 목걸이
    for (let k = 0; k < 4; k++) px(45 + k * 2, 26 + bob, 2, 2, GOLD);
    // 목에 건 장부: 끈 두 줄 + 가죽 표지 + 종이 + 금 모서리
    const lb = walk ? [0, 1, 0, -1][f - 1] : 0;
    g.strokeStyle = '#8a6a3a'; g.lineWidth = 1;
    g.beginPath(); g.moveTo(46.5, 27 + bob); g.lineTo(44.5 + lb, 31 + bob); g.moveTo(50.5, 27 + bob); g.lineTo(52.5 + lb, 31 + bob); g.stroke();
    px(42 + lb, 31 + bob, 13, 10, '#5a2216');
    px(43 + lb, 32 + bob, 11, 8, '#e8dcc0');
    px(48 + lb, 32 + bob, 1, 8, '#b8a888');
    for (let k = 0; k < 3; k++) px(44 + lb, 34 + bob + k * 2, 3, 1, '#7a2a1a'), px(50 + lb, 34 + bob + k * 2, 3, 1, '#7a2a1a');
    px(42 + lb, 31 + bob, 2, 2, GOLD); px(53 + lb, 39 + bob, 2, 2, GOLD);
    // 외곽선 (점 바깥 한 칸을 어둡게)
    const img = g.getImageData(0, 0, W, H);
    const d = img.data;
    const solid = (x: number, y: number) => x >= 0 && y >= 0 && x < W && y < H && d[(y * W + x) * 4 + 3] > 0;
    const out: number[] = [];
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (!solid(x, y) && (solid(x - 1, y) || solid(x + 1, y) || solid(x, y - 1) || solid(x, y + 1))) out.push(x, y);
    for (let k = 0; k < out.length; k += 2) { const o = (out[k + 1] * W + out[k]) * 4; d[o] = 10; d[o + 1] = 6; d[o + 2] = 6; d[o + 3] = 235; }
    g.putImageData(img, 0, 0);
    const t = Texture.from(c);
    t.source.scaleMode = 'nearest';
    return t;
  });
  return cache;
}

export class Hound {
  readonly view = new Container();
  private body: Sprite;
  private shadow = new Graphics();
  x = 0;
  y = 0;
  leaving = false;
  private anim = 0;
  private face = 1;
  constructor(x: number, y: number) {
    this.x = x; this.y = y;
    this.shadow.ellipse(0, 0, 17, 5.5).fill({ color: 0x000000, alpha: 0.38 });
    this.body = new Sprite(frames()[0]);
    this.body.anchor.set(0.47, 41 / H);
    this.body.scale.set(HS);
    this.view.addChild(this.shadow, this.body);
  }
  /** 화면 방향(왼쪽/오른쪽)과 걷는지에 따라 그림을 고른다 */
  pose(dt: number, moving: boolean, screenDx: number) {
    if (Math.abs(screenDx) > 0.01) this.face = screenDx < 0 ? -1 : 1;
    this.anim = moving ? this.anim + dt * 10 : 0;
    const tx = frames();
    this.body.texture = moving ? tx[1 + (Math.floor(this.anim) % 4)] : tx[0];
    this.body.scale.x = HS * this.face;
  }
  contains(gx: number, gy: number) {
    const b = this.body.getBounds();
    return gx >= b.x - 4 && gx <= b.x + b.width + 4 && gy >= b.y - 4 && gy <= b.y + b.height + 4;
  }
  destroy() { this.view.destroy({ children: true }); }
}
