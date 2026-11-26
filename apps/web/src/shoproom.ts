// 우주새 상점 안 — 거리와 같은 축척의 등각 방. 첫 장면이고, 미스 황을 눌러 말을 건다
import { Application, Assets, ColorMatrixFilter, Container, Graphics, Sprite, Text, Texture } from 'pixi.js';
import { portraitUrl } from './portraits.ts';
import { parrotPixels, type Look } from './character.ts';
import { goatIdleCanvas } from './goat.ts';
import { toCanvas } from './raster.ts';
import { iso } from './gfx.ts';
import { MISS_HWANG, HWANGHON, charSet, frameOf, applyFrame, dirFromTile, turnedDir, auraFor, makeAuraSprite, type CharSet, type Dir, type Frame } from './sprites.ts';
import { RW, RD, COUNTER, ROOM_BOUNDS, PARROT_PERCH, CAGE, drawCage, drawRoomBackground, drawCounterPieces, drawLamp, nightFactor } from './shopgfx.ts';
import { bangkokClock } from './clock.ts';
import { shopKitReady, counterStrips, type ShopKit } from './shopkit.ts';

export { MISS_HWANG };
/** 지옥의 우주새: 같은 얼굴, 검은 레이스 옷의 황혼 */

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
const GOAT_SPOT: [number, number] = [4.5, 6.2]; // 24차: 가게 안 염소가 서는 자리 (문 가까운 바닥)
const DOOR_TILE: [number, number] = [1, 7]; // 남서쪽(앞 왼쪽) 벽의 문 안쪽 매트 — 바깥 우주새의 문과 같은 쪽
const START_FIRST: [number, number] = [4, 5];
const START_BACK: [number, number] = [2, 6];
const SPEED = 2.3;
/** 유황새: 바닥에 선 큰 앵무새 (사람 키쯤), 베스크 자리와 말 거는 칸 */
const BIRD_START = { x: 6.5, y: 4.5 }; // 29차: 데스크 앞은 보관 우리 자리
const CAGE_TILE: [number, number] = [7, 4]; // 29차: 보관 우리 앞에 서는 칸
const BIRD_SPEED = 1.15;
/** 유황새의 앵무새: 사람 키로 자라 두 발로 걷는 유황앵무 (사람 NPC처럼 가게 안을 돌아다닌다) */
const BIRD_LOOK: Look = { sex: 'm', build: 1, skin: 0, hair: 0, hairColor: 0, top: 0, bottom: 0, outfit: 'cockatoo', cols: { 5: '#8a8078', 6: '#141010', 11: '#efede4', 12: '#efc63a', 15: '#2a2624' } };

function tex(c: HTMLCanvasElement): Texture {
  const t = Texture.from(c);
  t.source.scaleMode = 'nearest';
  return t;
}

/** 걸을 수 없는 칸: 카운터와 그 뒤, 창 아래 의자, 화분, 우산꽂이 */
let hellRoom = false; // 유황새: 바닥에 선 큰 앵무새와 대부업자 베스크 자리도 막는다
function blocked(i: number, j: number) {
  if (i < 0 || j < 0 || i >= RW || j >= RD) return true;
  if (j <= 2) return true;
  if (hellRoom && i === 1 && j === 3) return true;
  if (i === 0 && (j === 4 || j === 5 || j === 7)) return true;
  if (i === 8 && j === 7) return true; // 30차: 화분을 앞 오른쪽 구석으로
  if (j === 3 && (i === 7 || i === 8)) return true; // 29차: 앵무새 데스크 앞의 보관 우리
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

export type ShopTarget = 'hwang' | 'parrot' | 'door' | 'goat' | 'cage';

export interface ShopLabels {
  hwang: string;
  parrot: string;
  door: string;
  goat: string;
  cage: string;
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
  /** 유황새의 앵무새: 사람만큼 커져 가게 안을 걸어 다닌다 */
  private bird = new Sprite();
  private birdShadow = new Graphics();
  private birdCS: CharSet | null = null;
  private bx = BIRD_START.x;
  private by = BIRD_START.y;
  private bdir: Dir = 'sw';
  private bpath: [number, number][] = [];
  private bwait = 1.5;
  private banim = 0;
  private hellOn = false;
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

  /** 20차: 앵무새를 눌렀다 (대화) */
  onParrot?: () => void;
  onGoat?: () => void;
  private cage = new Sprite();
  private cageItems: HTMLCanvasElement[] = [];
  /** 24차: 가끔 가게 안에 들어와 있는 염소 (안에서는 얌전하다) */
  private goat: Sprite | null = null;
  setGoat(on: boolean) {
    if (!on) { this.goat?.destroy(); this.goat = null; return; }
    if (this.goat) return;
    const tx = Texture.from(goatIdleCanvas(true));
    tx.source.scaleMode = 'nearest';
    const g = new Sprite(tx);
    g.anchor.set(50 / 100, 66 / 76); g.scale.set(0.5);
    const [x, y] = iso(GOAT_SPOT[0], GOAT_SPOT[1]);
    g.position.set(x, y); g.zIndex = GOAT_SPOT[0] + GOAT_SPOT[1];
    this.objects.addChild(g);
    this.goat = g;
  }
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
    // 29차: 데스크 앞 보관 우리 (맡긴 물건이 몇 개 보인다)
    this.cage.zIndex = 11.2;
    this.objects.addChild(this.cage);
    this.redrawCage();
    // 유황새: 같은 앵무새가 사람 키만큼 자라 두 발로 가게 안을 걷는다
    this.birdShadow.ellipse(0, 0, 11, 4.5).fill({ color: 0x000000, alpha: 0.3 });
    this.bird.visible = this.birdShadow.visible = false;
    this.objects.addChild(this.birdShadow, this.bird);
    // (대부업자 베스크는 3층 피의 시장의 자기 대부소로 옮겼다)
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
    Promise.all([charSet(hell ? HWANGHON : MISS_HWANG, null, [], true), portraitUrl(hell ? 'sprite-hwanghon' : 'sprite-miss-hwang')]).then(async ([cs, u]) => {
      if (id !== this.keeperId) return;
      const f = frameOf(cs, 'idle', 'sw', 0);
      applyFrame(this.hwang, f);
      if (!u || !f || cs.px === 3) return; // 31차: 도트 3배 시험 중에는 관리자 도트 대신 3배로 구운 그림을 보여 준다
      const tx = await loadPixel(u);
      if (!tx) return;
      this.hwang.texture = tx;
      // 같은 크기 또는 2배(더 섬세한 그림)면 그 배율 그대로, 크기가 조금이라도 다르면(구운 그림이 바뀌어 한두 점 달라졌을 때)
      // 게임 속 키에 맞춰 줄인다 — 거인이 되지 않게 (발 기준점은 아래 가운데)
      const lw = Math.round(f.w * f.k), lh = Math.round(f.h * f.k); // 게임 속 크기
      const k = tx.width === lw * 2 && tx.height === lh * 2 ? 2 : tx.width === lw && tx.height === lh ? 1 : 0;
      if (k) { this.hwang.scale.set(1 / k); this.hwang.anchor.set(f.ax, f.ay); }
      else { this.hwang.scale.set(lh / tx.height); this.hwang.anchor.set(0.5, 1); }
    });
  }

  /** 29차: 보관 우리 안에 보일 맡긴 물건 그림 (현실 · 지옥 따로) */
  setCage(items: HTMLCanvasElement[]) {
    this.cageItems = items;
    this.redrawCage();
  }
  private redrawCage() {
    const d = drawCage(this.cageItems, this.hellOn);
    const old = this.cage.texture;
    this.cage.texture = tex(d.canvas);
    if (old && old !== Texture.EMPTY) old.destroy(true);
    this.cage.position.set(d.x, d.y);
  }
  /** 세계마다 같은 가게, 다른 빛: 귀신에게는 잿빛, 지옥에서는 황혼의 붉은 가게 */
  setRealm(r: 'real' | 'ghost' | 'hell') {
    this.dressKeeper(r === 'hell');
    const wasHell = this.hellOn;
    this.hellOn = hellRoom = r === 'hell';
    if (wasHell !== this.hellOn) this.redrawCage();
    this.parrot.visible = !this.hellOn;
    this.bird.visible = this.birdShadow.visible = this.hellOn;
    if (this.hellOn && !this.birdCS) charSet(BIRD_LOOK).then((cs) => { this.birdCS = cs; });
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

  /** 몸과 입은 것: 방어구도 거리처럼 그린다 (안 주면 맨몸 — 처음 모습 고르기) */
  setLook(look: Look, g?: { weapon: string | null; armor: string[] }) {
    const id = ++this.dressId;
    charSet(look, g?.weapon ?? null, g?.armor ?? [], true).then((cs) => {
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
    const [ti, tj] = t === 'door' ? DOOR_TILE : t === 'cage' ? CAGE_TILE : TALK_TILE;
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
    if (this.hellOn) {
      if (inSprite(this.bird, 4)) return 'parrot';
    } else if (inSprite(this.parrot, 6)) return 'parrot';
    if (this.goat && inSprite(this.goat, 4)) return 'goat';
    if (inSprite(this.hwang)) return 'hwang';
    if (inSprite(this.cage)) return 'cage';
    // 남서쪽 앞 벽(j = RD)의 문: 화면 좌표를 그 벽 위의 (i, 높이)로 바꿔 본다
    const di = x / 32 + RD, dz = (di + RD) * 16 - y;
    if (di >= 0.85 && di <= 2.35 && dz >= -14 && dz <= 36) return 'door';
    // 문 안쪽 매트 칸을 눌러도 나간다
    const fx = (x / 32 + y / 16) / 2, fy = (y / 16 - x / 32) / 2;
    if (Math.floor(fx) === DOOR_TILE[0] && Math.floor(fy) === DOOR_TILE[1]) return 'door';
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
      if (t === 'goat') { this.onGoat?.(); return; }
      if (t === 'parrot') {
        this.crestT = 0.8;
        this.onParrot?.();
        // 걷던 앵무새는 멈춰 서서 나를 돌아본다
        if (this.hellOn) { this.bpath = []; this.bwait = 3; this.bdir = dirFromTile(this.px - this.bx, this.py - this.by, this.bdir); }
        return;
      }
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
    if (t === 'goat') { const [x, y] = iso(GOAT_SPOT[0], GOAT_SPOT[1]); return [x, y - 34]; }
    if (t === 'cage') { const [x, y] = iso((CAGE.x0 + CAGE.x1) / 2, (CAGE.y0 + CAGE.y1) / 2); return [x, y - CAGE.h - 12]; }
    if (t === 'parrot' && this.hellOn) { const [x, y] = iso(this.bx, this.by); return [x, y - 64]; }
    if (t === 'parrot') { const [x, y] = iso(PARROT_PERCH.x, PARROT_PERCH.y); return [x + 1, y - PARROT_PERCH.z - 20]; }
    const [x, y] = iso(1.6, RD);
    return [x, y - 36];
  }

  /** 큰 앵무새: 잠깐 서 있다가 빈 바닥 한 곳을 골라 걸어간다 (나와 베스크 자리는 피한다) */
  private updateBird(dt: number) {
    let moving = false;
    if (this.bpath.length) {
      const [ti, tj] = this.bpath[0];
      const tx = ti + 0.5, ty = tj + 0.5, dx = tx - this.bx, dy = ty - this.by, d = Math.hypot(dx, dy);
      // 내가 그 칸에 서 있으면 기다린다
      if (Math.floor(this.px) === ti && Math.floor(this.py) === tj) { this.bpath = []; this.bwait = 1.2; }
      else {
        this.bdir = dirFromTile(dx, dy, this.bdir);
        const step = BIRD_SPEED * dt;
        if (d <= step) { this.bx = tx; this.by = ty; this.bpath.shift(); if (!this.bpath.length) this.bwait = 2 + Math.random() * 4; }
        else { this.bx += (dx / d) * step; this.by += (dy / d) * step; }
        moving = true;
      }
    } else if ((this.bwait -= dt) <= 0) {
      const si = Math.floor(this.bx), sj = Math.floor(this.by);
      for (let k = 0; k < 12; k++) {
        const ti = Math.floor(Math.random() * RW), tj = 3 + Math.floor(Math.random() * (RD - 3));
        if (blocked(ti, tj) || (ti === Math.floor(this.px) && tj === Math.floor(this.py)) || Math.hypot(ti - si, tj - sj) < 2) continue;
        const p = roomPath(si, sj, ti, tj);
        if (p && p.length <= 9) { this.bpath = p; break; }
      }
      this.bwait = 1.5;
      if (!this.bpath.length && Math.random() < 0.5) this.bdir = dirFromTile(this.px - this.bx, this.py - this.by, this.bdir);
    }
    this.banim = moving ? this.banim + dt * BIRD_SPEED * 7.5 : 0;
    if (this.birdCS) applyFrame(this.bird, frameOf(this.birdCS, moving ? 'walk' : 'idle', this.bdir, moving ? Math.floor(this.banim) % (this.birdCS.counts.walk ?? 8) : 0));
    const [x, y] = iso(this.bx, this.by);
    this.bird.position.set(Math.round(x), Math.round(y));
    this.birdShadow.position.set(Math.round(x), Math.round(y));
    this.bird.zIndex = this.bx + this.by + 0.008;
    this.birdShadow.zIndex = this.bx + this.by - 0.3;
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
    if (this.hellOn) {
      this.updateBird(dt);
    }
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
