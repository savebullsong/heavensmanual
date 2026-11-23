// 우주새 상점 안 — 거리와 같은 축척의 등각 방. 첫 장면이고, 미스 황을 눌러 말을 건다
import { Application, ColorMatrixFilter, Container, Graphics, Sprite, Text, Texture } from 'pixi.js';
import { characterPixels, parrotPixels, SPRITE_W, SPRITE_H, type Look, type Facing } from './character.ts';
import { toCanvas } from './raster.ts';
import { iso } from './gfx.ts';
import { lookTextures } from './world.ts';
import { RW, RD, COUNTER, DOOR, ROOM_BOUNDS, drawRoomBackground, drawCounterPieces, drawPerch, drawLamp, nightFactor } from './shopgfx.ts';
import { bangkokClock } from './clock.ts';

export const MISS_HWANG: Look = { sex: 'f', build: 1, skin: 0, hair: 3, hairColor: 3, top: 0, bottom: 0, outfit: 'apron' };

const HWANG = { x: 6.5, y: 2.2 };
const PERCH = { x: 8.35, y: 1.6 };
const TALK_TILE: [number, number] = [6, 4];
const DOOR_TILE: [number, number] = [0, 5];
const START_FIRST: [number, number] = [2, 4];
const START_BACK: [number, number] = [1, 5];

function tex(c: HTMLCanvasElement): Texture {
  const t = Texture.from(c);
  t.source.scaleMode = 'nearest';
  return t;
}

/** 걸을 수 없는 칸: 진열대 앞줄, 카운터와 그 뒤 */
function blocked(i: number, j: number) {
  if (i < 0 || j < 0 || i >= RW || j >= RD) return true;
  if (j === 0 && i <= 4) return true;
  if (i >= 4 && j <= 3) return true;
  return false;
}

/** 방 안 길찾기 (8방향, 모서리 끼어들기 없음) */
function roomPath(si: number, sj: number, ti: number, tj: number): [number, number][] | null {
  if (blocked(ti, tj)) return null;
  const key = (i: number, j: number) => j * RW + i;
  const prev = new Map<number, number>();
  const q: [number, number][] = [[si, sj]];
  prev.set(key(si, sj), -1);
  while (q.length) {
    const [i, j] = q.shift()!;
    if (i === ti && j === tj) break;
    for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]]) {
      const ni = i + di, nj = j + dj;
      if (blocked(ni, nj) || prev.has(key(ni, nj))) continue;
      if (di && dj && (blocked(i + di, j) || blocked(i, j + dj))) continue;
      prev.set(key(ni, nj), key(i, j));
      q.push([ni, nj]);
    }
  }
  if (!prev.has(key(ti, tj))) return null;
  const path: [number, number][] = [];
  let k = key(ti, tj);
  while (k !== key(si, sj)) { path.unshift([k % RW, Math.floor(k / RW)]); k = prev.get(k)!; }
  return path;
}

export type ShopTarget = 'hwang' | 'parrot' | 'door';

export interface ShopLabels {
  hwang: string;
  parrot: string;
  door: string;
}

export class ShopRoom {
  readonly root = new Container();
  private camera = new Container();
  private objects = new Container();
  private topLayer = new Container();
  private overlay = new Graphics();
  private bg = new Sprite();
  private glow: Sprite;
  private player: Sprite;
  private frames: Record<Facing, Texture[]>;
  private hwang: Sprite;
  private parrot: Sprite;
  private parrotTex: Texture[];
  private px = START_FIRST[0] + 0.5;
  private py = START_FIRST[1] + 0.5;
  private path: [number, number][] = [];
  private facing: Facing = 'front';
  private anim = 0;
  private ghost = false;
  private ghostFilter = new ColorMatrixFilter();
  private time = 0;
  private crestT = 0;
  private bgMinute = -1;
  private pending: ShopTarget | null = null;
  private label = new Container();
  private labelText = new Text({ text: '', style: { fontFamily: 'system-ui, sans-serif', fontSize: 13, fontWeight: '600', fill: '#fff6d8' } });
  private labelBg = new Graphics();
  private labelFor: ShopTarget | null = null;
  private labelT = 0;
  private insets = { right: 0, bottom: 0 };
  private locked = false;
  private tick = (tk: { deltaMS: number }) => this.update(Math.min(0.05, tk.deltaMS / 1000));

  /** 대상(미스 황·앵무새·문)을 눌러 도착했을 때 */
  onArrive: (t: ShopTarget) => void = () => {};

  constructor(private app: Application, look: Look, ghost: boolean, private labels: ShopLabels) {
    this.objects.sortableChildren = true;
    this.bg.zIndex = -1;
    this.camera.addChild(this.bg, this.objects, this.topLayer);
    this.root.addChild(this.camera, this.overlay);
    this.overlay.eventMode = 'none';
    this.refreshBackground();
    for (const piece of drawCounterPieces()) {
      const s = new Sprite(tex(piece.canvas));
      s.position.set(piece.x, piece.y);
      s.zIndex = piece.i + 0.5 + (COUNTER.y0 + COUNTER.y1) / 2;
      this.objects.addChild(s);
    }
    // 미스 황
    this.hwang = new Sprite(tex(toCanvas(characterPixels(MISS_HWANG, 'front', 0), SPRITE_W, SPRITE_H)));
    this.hwang.anchor.set(0.5, 137 / 144);
    const [hx, hy] = iso(HWANG.x, HWANG.y);
    this.hwang.position.set(hx, hy);
    this.hwang.zIndex = HWANG.x + HWANG.y;
    this.objects.addChild(this.hwang);
    // 횃대와 앵무새
    const perch = new Sprite(tex(drawPerch()));
    perch.anchor.set(0.5, 104 / 112);
    const [ax, ay] = iso(PERCH.x, PERCH.y);
    perch.position.set(ax, ay);
    perch.zIndex = PERCH.x + PERCH.y;
    this.objects.addChild(perch);
    this.parrotTex = [tex(toCanvas(parrotPixels(false), 32, 40)), tex(toCanvas(parrotPixels(true), 32, 40))];
    this.parrot = new Sprite(this.parrotTex[0]);
    this.parrot.anchor.set(0.5, 32 / 40);
    this.parrot.position.set(ax + 2, ay - 89);
    this.parrot.zIndex = PERCH.x + PERCH.y + 0.001;
    this.objects.addChild(this.parrot);
    // 매달린 등과 불빛
    const lamp = new Sprite(tex(drawLamp()));
    lamp.anchor.set(0.5, 1);
    const [lx, ly] = iso(6.6, 2.7);
    lamp.position.set(lx, ly - 146);
    this.topLayer.addChild(lamp);
    this.glow = new Sprite(tex(glowCanvas()));
    this.glow.anchor.set(0.5);
    this.glow.position.set(lx, ly - 140);
    this.glow.blendMode = 'add';
    this.glow.eventMode = 'none';
    this.topLayer.addChild(this.glow);
    // 플레이어
    this.frames = lookTextures(look);
    this.player = new Sprite(this.frames.front[0]);
    this.player.anchor.set(0.5, 137 / 144);
    this.objects.addChild(this.player);
    this.ghostFilter.desaturate();
    this.setGhost(ghost);
    // 이름표
    this.labelText.anchor.set(0.5, 1);
    this.label.addChild(this.labelBg, this.labelText);
    this.label.visible = false;
    this.label.eventMode = 'none';
    this.topLayer.addChild(this.label);
    // 입력
    this.root.eventMode = 'static';
    this.root.hitArea = this.app.screen;
    this.root.on('pointertap', (e) => this.onTap(e.global.x, e.global.y));
    this.root.on('pointermove', (e) => { if (e.pointerType === 'mouse') this.onHover(e.global.x, e.global.y); });
    this.update(0);
  }

  private refreshBackground() {
    const d = drawRoomBackground();
    const old = this.bg.texture;
    this.bg.texture = tex(d.canvas);
    this.bg.position.set(d.x, d.y);
    if (old && old !== Texture.EMPTY) old.destroy(true);
    this.bgMinute = bangkokClock().m;
  }

  setGhost(on: boolean) {
    this.ghost = on;
    this.player.filters = on ? [this.ghostFilter] : [];
    this.player.alpha = on ? 0.55 : 1;
  }

  setLook(look: Look) {
    this.frames = lookTextures(look);
  }

  setLabels(labels: ShopLabels) {
    this.labels = labels;
    if (this.labelFor) this.showLabel(this.labelFor, 0);
  }

  turn() {
    this.facing = this.facing === 'front' ? 'back' : 'front';
  }

  /** 대화·외형 창이 열려 있으면 화면 이동만 막는다 */
  lock(on: boolean) {
    this.locked = on;
    if (on) this.path = [];
    this.hideLabel();
  }

  /** 옆이나 아래를 가리는 창이 있으면 그만큼 비켜서 방을 보여 준다 */
  setInsets(right: number, bottom: number) {
    this.insets = { right, bottom };
  }

  /** 상점에 들어온다 (처음이면 방 가운데, 거리에서 왔으면 문 앞) */
  enter(fromStreet: boolean) {
    const [i, j] = fromStreet ? DOOR_TILE : START_FIRST;
    this.px = i + 0.5;
    this.py = j + 0.5;
    this.facing = 'front';
    this.path = fromStreet ? roomPath(i, j, START_BACK[0], START_BACK[1]) ?? [] : [];
    this.pending = null;
    this.refreshBackground();
    this.update(0);
  }

  start() {
    this.app.ticker.add(this.tick);
    this.root.visible = true;
  }
  stop() {
    this.app.ticker.remove(this.tick);
    this.root.visible = false;
  }

  /** 앵무새가 머리깃을 세운다 (말하는 장면) */
  crest(on: boolean) {
    this.crestT = on ? 9999 : 0;
  }

  /** 지정한 대상 앞으로 걸어간다 */
  goTo(t: ShopTarget) {
    const [ti, tj] = t === 'door' ? DOOR_TILE : TALK_TILE;
    const si = Math.floor(this.px), sj = Math.floor(this.py);
    this.pending = t;
    if (si === ti && sj === tj) { this.path = []; return; }
    const p = roomPath(si, sj, ti, tj);
    this.path = p ?? [];
    if (!p) this.pending = null;
  }

  private toWorld(gx: number, gy: number) {
    return { x: gx - this.camera.x, y: gy - this.camera.y };
  }

  private hit(gx: number, gy: number): ShopTarget | null {
    const { x, y } = this.toWorld(gx, gy);
    const inSprite = (s: Sprite, pad = 0) => {
      const b = s.getBounds();
      return gx >= b.x - pad && gx <= b.x + b.width + pad && gy >= b.y - pad && gy <= b.y + b.height + pad;
    };
    if (inSprite(this.parrot, 6)) return 'parrot';
    if (inSprite(this.hwang)) return 'hwang';
    // 왼쪽 벽(x = 0)의 문: 화면 좌표를 벽 위의 (y, z)로 바꿔 본다
    const wy = -x / 32, wz = wy * 16 - y;
    if (wy >= DOOR.y0 - 0.1 && wy <= DOOR.y1 + 0.1 && wz >= -6 && wz <= DOOR.h + 4) return 'door';
    return null;
  }

  private onHover(gx: number, gy: number) {
    if (this.locked) return;
    const t = this.hit(gx, gy);
    if (t) this.showLabel(t, 0); else if (this.labelT <= 0) this.hideLabel();
    document.body.style.cursor = t ? 'pointer' : '';
  }

  private onTap(gx: number, gy: number) {
    if (this.locked) return;
    const t = this.hit(gx, gy);
    if (t) {
      this.showLabel(t, 2.2);
      if (t === 'parrot') { this.crestT = 0.8; return; }
      this.goTo(t);
      return;
    }
    const { x, y } = this.toWorld(gx, gy);
    const fx = (x / 32 + y / 16) / 2, fy = (y / 16 - x / 32) / 2;
    const ti = Math.floor(fx), tj = Math.floor(fy);
    const p = roomPath(Math.floor(this.px), Math.floor(this.py), ti, tj);
    if (p) { this.path = p; this.pending = null; }
  }

  private showLabel(t: ShopTarget, hold: number) {
    this.labelFor = t;
    this.labelT = Math.max(this.labelT, hold);
    this.labelText.text = this.labels[t];
    const w = Math.ceil(this.labelText.width) + 14, h = 20;
    this.labelBg.clear().roundRect(-w / 2, -h + 2, w, h, 4).fill({ color: 0x140e0a, alpha: 0.82 }).stroke({ color: 0xc9a23e, width: 1, alpha: 0.9 });
    this.labelText.position.set(0, -2);
    this.label.visible = true;
  }
  private hideLabel() {
    this.labelFor = null;
    this.labelT = 0;
    this.label.visible = false;
  }
  private labelAnchor(t: ShopTarget): [number, number] {
    if (t === 'hwang') { const [x, y] = iso(HWANG.x, HWANG.y); return [x, y - 146]; }
    if (t === 'parrot') { const [x, y] = iso(PERCH.x, PERCH.y); return [x + 2, y - 126]; }
    const [x, y] = iso(0, (DOOR.y0 + DOOR.y1) / 2);
    return [x, y - DOOR.h - 26];
  }

  private update(dt: number) {
    this.time += dt;
    // 걷기
    let moving = false;
    if (this.path.length) {
      const [ti, tj] = this.path[0];
      const tx = ti + 0.5, ty = tj + 0.5;
      const dx = tx - this.px, dy = ty - this.py, dist = Math.hypot(dx, dy);
      const sdy = dx + dy;
      if (Math.abs(sdy) > 0.01) this.facing = sdy > 0 ? 'front' : 'back';
      const step = 3.2 * dt;
      if (dist <= step) { this.px = tx; this.py = ty; this.path.shift(); } else { this.px += (dx / dist) * step; this.py += (dy / dist) * step; }
      moving = true;
    } else if (this.pending) {
      const t = this.pending;
      this.pending = null;
      if (t === 'hwang') this.facing = 'back';
      this.onArrive(t);
    }
    this.anim = moving ? this.anim + dt * 7 : 0;
    this.player.texture = this.frames[this.facing][moving ? Math.floor(this.anim) % 4 : 0];
    const [sx, sy] = iso(this.px, this.py);
    const float = this.ghost ? -6 + Math.sin(this.time * 2.2) * 2 : 0;
    this.player.position.set(sx, sy + float);
    this.player.zIndex = this.px + this.py + 0.01;
    // 앵무새: 가끔 머리깃을 세운다
    if (this.crestT > 0) this.crestT -= dt;
    else if (Math.random() < dt * 0.25) this.crestT = 0.6;
    this.parrot.texture = this.parrotTex[this.crestT > 0 ? 1 : 0];
    // 이름표
    if (this.labelT > 0) { this.labelT -= dt; if (this.labelT <= 0) this.hideLabel(); }
    if (this.labelFor) { const [lx, ly] = this.labelAnchor(this.labelFor); this.label.position.set(Math.round(lx), Math.round(ly)); }
    // 카메라: 방이 화면에 들어오면 방 가운데, 아니면 플레이어를 따라가되 방 밖은 보이지 않게
    const vw = this.app.screen.width - this.insets.right, vh = this.app.screen.height - this.insets.bottom;
    const B = ROOM_BOUNDS;
    const follow = (lo: number, hi: number, p: number, span: number) => (hi - lo <= span ? (lo + hi) / 2 : Math.max(lo + span / 2, Math.min(hi - span / 2, p)));
    const roomCx = (B.x0 + B.x1) / 2;
    // 좁은 화면: 플레이어와 방 가운데의 중간을 본다 (미스 황과 문이 함께 보이도록)
    const cx = follow(B.x0, B.x1, (sx + roomCx) / 2, vw), cy = follow(B.y0 + 20, B.y1, sy - 50, vh - 20);
    this.camera.position.set(Math.round(vw / 2 - cx), Math.round(vh / 2 - cy + (vh < 560 ? 10 : 30)));
    // 밤에는 방이 조금 어둡고 등불이 밝다
    const { h, m } = bangkokClock();
    const nf = nightFactor(h, m);
    this.glow.alpha = 0.55 + nf * 0.35 + Math.sin(this.time * 3) * 0.03;
    this.overlay.clear().rect(0, 0, this.app.screen.width, this.app.screen.height).fill({ color: 0x0b0a18, alpha: 0.18 * nf });
    if (m !== this.bgMinute) this.refreshBackground();
  }

  destroy() {
    this.stop();
    this.root.destroy({ children: true });
  }
}

function glowCanvas() {
  const c = document.createElement('canvas');
  c.width = c.height = 300;
  const g = c.getContext('2d')!;
  const gr = g.createRadialGradient(150, 150, 6, 150, 150, 150);
  gr.addColorStop(0, 'rgba(255,214,140,0.55)');
  gr.addColorStop(0.4, 'rgba(255,200,120,0.18)');
  gr.addColorStop(1, 'rgba(255,200,120,0)');
  g.fillStyle = gr;
  g.fillRect(0, 0, 300, 300);
  return c;
}
