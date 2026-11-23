// 우주새 상점 안 — 거리와 같은 축척의 등각 방. 첫 장면이고, 미스 황을 눌러 말을 건다
import { Application, Assets, ColorMatrixFilter, Container, Graphics, Sprite, Text, Texture } from 'pixi.js';
import { portraitUrl } from './portraits.ts';
import { parrotPixels, type Look } from './character.ts';
import { toCanvas } from './raster.ts';
import { iso } from './gfx.ts';
import { MISS_HWANG, charSet, frameOf, applyFrame, dirFromTile, turnedDir, auraFor, makeAuraSprite, type CharSet, type Dir, type Frame } from './sprites.ts';
import { RW, RD, COUNTER, DOOR, ROOM_BOUNDS, PARROT_PERCH, drawRoomBackground, drawCounterPieces, drawLamp, nightFactor } from './shopgfx.ts';
import { bangkokClock } from './clock.ts';
import { shopKitReady, counterStrips, type ShopKit } from './shopkit.ts';

export { MISS_HWANG };
/** 지옥의 우주새: 같은 얼굴, 검은 레이스 옷의 황혼 */
const HWANGHON: Look = { ...MISS_HWANG, cols: { 1: '#e6c2a6', 2: '#c9a46e', 3: '#18121a', 4: '#120e12', 5: '#0c0a0a', 6: '#1a1210', 7: '#2a161c' } };

/** 관리자가 올린 도트 그림 (뭉개지지 않게 nearest) */
async function loadPixel(u: string): Promise<Texture | null> {
  try {
    const tx = await Assets.load({ src: u, loadParser: 'loadTextures' });
    tx.source.scaleMode = 'nearest';
    return tx;
  } catch { return null; }
}

const HWANG = { x: 4.6, y: 1.55 };
const TALK_TILE: [number, number] = [4, 3];
const DOOR_TILE: [number, number] = [0, 6];
const START_FIRST: [number, number] = [4, 5];
const START_BACK: [number, number] = [1, 6];
const SPEED = 2.3;

function tex(c: HTMLCanvasElement): Texture {
  const t = Texture.from(c);
  t.source.scaleMode = 'nearest';
  return t;
}

/** 걸을 수 없는 칸: 카운터와 그 뒤, 창 아래 의자, 화분, 우산꽂이 */
function blocked(i: number, j: number) {
  if (i < 0 || j < 0 || i >= RW || j >= RD) return true;
  if (j <= 2) return true;
  if (i === 0 && (j === 4 || j === 5 || j === 7)) return true;
  if (i === 8 && j === 4) return true;
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
  private glows: Sprite[] = [];
  private player: Sprite;
  private cs: CharSet | null = null;
  private dressId = 0;
  private hwang: Sprite;
  private parrot: Sprite;
  private parrotTex: Texture[];
  private px = START_FIRST[0] + 0.5;
  private py = START_FIRST[1] + 0.5;
  private path: [number, number][] = [];
  private dir: Dir = 'se';
  private anim = 0;
  private ghost = false;
  private ghostFilter = new ColorMatrixFilter();
  private aura = makeAuraSprite();
  private auraTex: Map<Dir, Frame[]> | null = null;
  private time = 0;
  private crestT = 0;
  private bgMinute = -1;
  private kit: ShopKit | null = null;
  private customParrot: [Texture, Texture] | null = null;
  private counterSprites: Sprite[] = [];
  private lampSprites: Sprite[] = [];
  private clock = new Graphics();
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
      this.counterSprites.push(s);
    }
    // 미스 황
    this.hwang = new Sprite();
    // 관리자가 손본 도트 그림이 있으면 그것을, 없으면 구운 그림을 쓴다
    // 관리자 그림은 구운 그림과 크기가 같으니 발 기준점도 그대로 쓴다
    this.dressKeeper(false);
    const [hx, hy] = iso(HWANG.x, HWANG.y);
    this.hwang.position.set(hx, hy);
    this.hwang.zIndex = HWANG.x + HWANG.y;
    this.objects.addChild(this.hwang);
    // 카운터 끝 횃대 위의 앵무새
    this.parrotTex = [tex(toCanvas(parrotPixels(false), 16, 18)), tex(toCanvas(parrotPixels(true), 16, 18))];
    this.parrot = new Sprite(this.parrotTex[0]);
    this.parrot.anchor.set(0.5, 16 / 18);
    const [ax, ay] = iso(PARROT_PERCH.x, PARROT_PERCH.y);
    this.parrot.position.set(ax + 1, ay - PARROT_PERCH.z);
    this.parrot.zIndex = PARROT_PERCH.x + PARROT_PERCH.y + 1;
    this.objects.addChild(this.parrot);
    // 매달린 등 두 개와 불빛
    this.glow = new Sprite(tex(glowCanvas()));
    for (const [gx2, gy2] of [[2.4, 2.0], [6.6, 2.0]] as const) {
      const lamp = new Sprite(tex(drawLamp()));
      lamp.anchor.set(0.5, 1);
      const [lx, ly] = iso(gx2, gy2);
      lamp.position.set(lx, ly - 50);
      this.topLayer.addChild(lamp);
      this.lampSprites.push(lamp);
      const glow = gx2 === 2.4 ? this.glow : new Sprite(this.glow.texture);
      glow.anchor.set(0.5);
      glow.position.set(lx, ly - 52);
      glow.blendMode = 'add';
      glow.eventMode = 'none';
      this.topLayer.addChild(glow);
      this.glows.push(glow);
    }
    // 플레이어
    this.player = new Sprite();
    this.player.visible = false;
    this.objects.addChild(this.aura);
    this.objects.addChild(this.player);
    this.setLook(look);
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
    shopKitReady.then((k) => { if (k) this.useKit(k); });
    // 앵무새: 볏 내림·세움 두 칸 (하나만 있으면 둘 다 그것으로)
    Promise.all([portraitUrl('sprite-parrot'), portraitUrl('sprite-parrot-up')]).then(async ([a, b]) => {
      const [t0, t1] = await Promise.all([a ? loadPixel(a) : null, b ? loadPixel(b) : null]);
      if (t0 || t1) this.customParrot = [t0 ?? t1!, t1 ?? t0!];
    });
  }

  /** 미리 구운 방으로 바꾼다 (실패하면 그린 방을 그대로 쓴다) */
  private useKit(k: ShopKit) {
    this.kit = k;
    for (const s of this.counterSprites) s.destroy({ texture: true, textureSource: true });
    this.counterSprites = [];
    const gyc = (COUNTER.y0 + COUNTER.y1) / 2;
    for (const st of counterStrips(k.counter)) {
      const s = new Sprite(st.tex);
      s.position.set(st.x, st.y);
      s.zIndex = Math.floor(st.sx / 32 + gyc) + 0.5 + gyc;
      this.objects.addChild(s);
      this.counterSprites.push(s);
    }
    this.parrot.anchor.set(0, 0);
    for (const [n, lamp] of this.lampSprites.entries()) {
      const [gx, gy] = n === 0 ? [2.4, 2.0] : [6.6, 2.0];
      const [lx, ly] = iso(gx, gy);
      lamp.texture = k.lamp.tex;
      lamp.anchor.set(0, 0);
      lamp.position.set(lx + k.lamp.x, ly + k.lamp.y);
      const cord = new Graphics().moveTo(lx, ly + k.lamp.y).lineTo(lx, ly + k.lamp.y - 90).stroke({ color: 0x14100c, width: 1, alpha: 0.85 });
      this.topLayer.addChildAt(cord, 0);
    }
    this.topLayer.addChildAt(this.clock, 0);
    this.refreshBackground();
  }

  private refreshBackground() {
    if (this.kit) {
      const { h, m } = bangkokClock();
      const p = nightFactor(h, m) > 0.5 ? this.kit.night : this.kit.day;
      this.bg.texture = p.tex;
      this.bg.position.set(p.x, p.y);
      this.bgMinute = m;
      this.drawClock(h, m);
      return;
    }
    const d = drawRoomBackground();
    const old = this.bg.texture;
    this.bg.texture = tex(d.canvas);
    this.bg.position.set(d.x, d.y);
    if (old && old !== Texture.EMPTY) old.destroy(true);
    this.bgMinute = bangkokClock().m;
  }

  /** 왼쪽 벽 시계 바늘 (방콕 시각) */
  private drawClock(h: number, m: number) {
    const [cx, cy] = iso(0.08, 3.55);
    const x0 = cx, y0 = cy - 68;
    const up = [0, -1], right = [0.894, -0.447];
    const hand = (a: number, len: number, col: number) => {
      const vx = (up[0] * Math.cos(a) + right[0] * Math.sin(a)) * len, vy = (up[1] * Math.cos(a) + right[1] * Math.sin(a)) * len;
      this.clock.moveTo(x0, y0).lineTo(x0 + vx, y0 + vy).stroke({ color: col, width: 1 });
    };
    this.clock.clear();
    hand((((h % 12) + m / 60) / 12) * Math.PI * 2, 2.2, 0x1a120c);
    hand((m / 60) * Math.PI * 2, 3.2, 0x2a1a10);
  }

  /** 카운터 뒤의 사람: 현실은 미스 황(관리자가 손본 도트가 있으면 그것), 지옥은 검은 레이스의 황혼 */
  private keeperId = 0;
  private keeperHell: boolean | null = null;
  private dressKeeper(hell: boolean) {
    if (this.keeperHell === hell) return;
    this.keeperHell = hell;
    const id = ++this.keeperId;
    if (hell) {
      charSet(HWANGHON).then((cs) => { if (id === this.keeperId) applyFrame(this.hwang, frameOf(cs, 'idle', 'sw', 0)); });
      return;
    }
    Promise.all([charSet(MISS_HWANG), portraitUrl('sprite-miss-hwang')]).then(async ([cs, u]) => {
      if (id !== this.keeperId) return;
      const f = frameOf(cs, 'idle', 'sw', 0);
      applyFrame(this.hwang, f);
      if (!u || !f) return;
      const tx = await loadPixel(u);
      if (!tx) return;
      this.hwang.texture = tx;
      // 같은 크기 또는 2배(더 섬세한 그림): 2배면 반으로 줄여 같은 크기로 보인다 (고해상도 화면에서 두 배 선명)
      const lw = Math.round(f.w * f.k), lh = Math.round(f.h * f.k); // 게임 속 크기
      const k = tx.width === lw * 2 && tx.height === lh * 2 ? 2 : 1;
      this.hwang.scale.set(1 / k);
      if (tx.width === lw * k && tx.height === lh * k) this.hwang.anchor.set(f.ax, f.ay); else this.hwang.anchor.set(0.5, 1);
    });
  }

  /** 세계마다 같은 가게, 다른 빛: 귀신에게는 잿빛, 지옥에서는 황혼의 붉은 가게 */
  setRealm(r: 'real' | 'ghost' | 'hell') {
    this.dressKeeper(r === 'hell');
    if (r === 'real') { this.camera.filters = []; this.setGhost(false); return; }
    const cm = new ColorMatrixFilter();
    if (r === 'ghost') cm.desaturate();
    else cm.matrix = [0.95, 0.25, 0.05, 0, 0.04, 0.1, 0.42, 0.04, 0, 0, 0.06, 0.12, 0.3, 0, 0.01, 0, 0, 0, 1, 0];
    this.camera.filters = [cm];
    this.setGhost(r === 'ghost');
  }

  setGhost(on: boolean) {
    this.ghost = on;
    this.player.filters = on ? [this.ghostFilter] : [];
    this.player.alpha = on ? 0.55 : 1;
  }

  setLook(look: Look) {
    const id = ++this.dressId;
    charSet(look).then((cs) => {
      if (id !== this.dressId) return;
      this.cs = cs;
      this.auraTex = look.aura ? auraFor(cs) : null;
      this.aura.visible = !!this.auraTex;
    });
  }

  setLabels(labels: ShopLabels) {
    this.labels = labels;
    if (this.labelFor) this.showLabel(this.labelFor, 0);
  }

  turn() {
    this.dir = turnedDir(this.dir);
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
    this.dir = 'se';
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
    if (t === 'hwang') { const [x, y] = iso(HWANG.x, HWANG.y); return [x, y - 48]; }
    if (t === 'parrot') { const [x, y] = iso(PARROT_PERCH.x, PARROT_PERCH.y); return [x + 1, y - PARROT_PERCH.z - 20]; }
    const [x, y] = iso(0, (DOOR.y0 + DOOR.y1) / 2);
    return [x, y - DOOR.h - 12];
  }

  private update(dt: number) {
    this.time += dt;
    // 걷기
    let moving = false;
    if (this.path.length) {
      const [ti, tj] = this.path[0];
      const tx = ti + 0.5, ty = tj + 0.5;
      const dx = tx - this.px, dy = ty - this.py, dist = Math.hypot(dx, dy);
      let ax = 0, ay = 0;
      const look = Math.min(3, this.path.length);
      for (let k = 0; k < look; k++) { ax += this.path[k][0] + 0.5; ay += this.path[k][1] + 0.5; }
      this.dir = dirFromTile(ax / look - this.px, ay / look - this.py, this.dir);
      const step = SPEED * dt;
      if (dist <= step) { this.px = tx; this.py = ty; this.path.shift(); } else { this.px += (dx / dist) * step; this.py += (dy / dist) * step; }
      moving = true;
    } else if (this.pending) {
      const t = this.pending;
      this.pending = null;
      if (t === 'hwang') this.dir = 'ne';
      this.onArrive(t);
    }
    this.anim = moving ? this.anim + dt * SPEED * 8.5 : 0;
    this.player.visible = !!this.cs;
    if (this.cs) applyFrame(this.player, frameOf(this.cs, moving ? 'walk' : 'idle', this.dir, moving ? Math.floor(this.anim) % (this.cs.counts.walk ?? 8) : 0));
    const [sx, sy] = iso(this.px, this.py);
    const float = this.ghost ? -3 + Math.sin(this.time * 2.2) : 0;
    this.player.position.set(sx, sy + float);
    this.player.zIndex = this.px + this.py + 0.01;
    if (this.auraTex) {
      applyFrame(this.aura, this.auraTex.get(this.dir)?.[Math.floor(this.time * 9) % 4]);
      this.aura.position.set(sx, sy + float);
      this.aura.zIndex = this.px + this.py + 0.005;
      this.aura.alpha = 0.75 + Math.sin(this.time * 5.3) * 0.2;
    }
    // 앵무새: 가끔 머리깃을 세운다
    if (this.crestT > 0) this.crestT -= dt;
    else if (Math.random() < dt * 0.25) this.crestT = 0.6;
    const ci = this.crestT > 0 ? 1 : 0;
    if (this.kit) {
      // 관리자 그림은 구운 그림과 크기가 같아 같은 자리(왼쪽 위 기준)에 둔다
      const pp = this.kit.parrot[ci];
      const ct = this.customParrot?.[ci];
      this.parrot.texture = ct ?? pp.tex;
      this.parrot.scale.set(ct && ct.width >= pp.w * 2 ? 0.5 : 1);
      this.parrot.position.set(pp.x, pp.y);
    } else this.parrot.texture = this.customParrot?.[ci] ?? this.parrotTex[ci];
    // 이름표
    if (this.labelT > 0) { this.labelT -= dt; if (this.labelT <= 0) this.hideLabel(); }
    if (this.labelFor) { const [lx, ly] = this.labelAnchor(this.labelFor); this.label.position.set(Math.round(lx), Math.round(ly)); }
    // 카메라: 방이 화면에 들어오면 방 가운데, 아니면 플레이어를 따라가되 방 밖은 보이지 않게
    const vw = this.app.screen.width - this.insets.right, vh = this.app.screen.height - this.insets.bottom;
    const B = ROOM_BOUNDS;
    const follow = (lo: number, hi: number, p: number, span: number) => (hi - lo <= span ? (lo + hi) / 2 : Math.max(lo + span / 2, Math.min(hi - span / 2, p)));
    const roomCx = (B.x0 + B.x1) / 2;
    // 좁은 화면: 플레이어와 방 가운데의 중간을 본다 (미스 황과 문이 함께 보이도록)
    const cx = follow(B.x0, B.x1, (sx + roomCx) / 2, vw), cy = follow(B.y0, B.y1, sy - 20, vh - 40);
    this.camera.position.set(Math.round(vw / 2 - cx), Math.round(vh / 2 - cy + 16));
    // 밤에는 방이 조금 어둡고 등불이 밝다
    const { h, m } = bangkokClock();
    const nf = nightFactor(h, m);
    for (const gl of this.glows) gl.alpha = 0.45 + nf * 0.35 + Math.sin(this.time * 3) * 0.03;
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
  const gr = g.createRadialGradient(150, 150, 4, 150, 150, 150);
  gr.addColorStop(0, 'rgba(255,214,140,0.55)');
  gr.addColorStop(0.4, 'rgba(255,200,120,0.18)');
  gr.addColorStop(1, 'rgba(255,200,120,0)');
  g.fillStyle = gr;
  g.fillRect(0, 0, 300, 300);
  return c;
}
