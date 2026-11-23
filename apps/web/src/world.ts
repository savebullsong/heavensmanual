// 현실 세계 장면 (PixiJS): 실제 지도, 화면 근처만 불러오기, 클릭 이동, 행인·불량배, 차량, 방콕 실시간 낮밤
// 1단계-B: 대상 메뉴(말 걸기·살펴보기·공격·강제 공격), 싸움과 체력, 쓰러짐과 돈 줍기, 가게 노동, 차 사고
import { Application, Container, Graphics, Rectangle, Sprite, Text, Texture } from 'pixi.js';
import { type Look } from './character.ts';
import { charSet, frameOf, applyFrame, dirFromScreen, auraFor, makeAuraSprite, ANIM_FPS, IMPACT, type CharSet, type Dir, type Anim, type Frame } from './sprites.ts';
import { type Zone, type Building, type Lane, findPath, walkable, randomWalkTileNear, tileAt } from './zone.ts';
import { iso, TW, TH, drawBuilding, drawGroundChunk, buildingHeight } from './gfx.ts';
import { drawBuildingKit, drawGroundKit, buildingTop, carSprite, propSprite, CAR_MODELS, CHUNK, kitOk } from './street.ts';
import { t, lang } from './i18n.ts';
import { bangkokClock, nightFactor } from './clock.ts';
import { shopName, WORKPLACES } from './names.ts';
import { carHit, isDanger, DANGER_SPEED, critChance, CRIT_MULTIPLIER, regenPerMinute, OUT_OF_COMBAT_S, type DeedKey } from '../../../packages/shared/src/rules.ts';

function tex(c: HTMLCanvasElement): Texture {
  const tx = Texture.from(c);
  tx.source.scaleMode = 'nearest';
  return tx;
}

export type NpcKind = 'passer' | 'thug';
interface Walker {
  x: number; y: number; // 연속 격자 좌표 (타일 중심 = i + 0.5)
  path: [number, number][];
  speed: number;
  cs: CharSet | null; // 미리 구운 그림 (불러오는 중이면 null)
  look: Look;
  weapon: string | null;
  dressId: number;
  sprite: Sprite;
  dir: Dir;
  anim: number;
  act: { anim: Anim; t: number } | null; // 한 번 재생하는 동작 (공격·맞음·쓰러짐)
  pend: { to: Walker; dmg: number; at: number } | null; // 동작이 닿는 순간 들어갈 피해
  wait: number;
  isPlayer: boolean;
  kind: 'player' | NpcKind;
  hp: number;
  maxHp: number;
  down: number; // 쓰러져 있는 남은 시간
  target: Walker | null; // 공격 대상
  atkT: number;
  firstBy: Walker | null; // 이 싸움을 먼저 건 쪽
  flee: number;
  hurtT: number;
  barT: number;
  repathT: number;
  home: [number, number];
  bubble?: Text;
  bubbleT: number;
}
interface Car {
  lane: Lane; x: number; speed: number; max: number;
  sprite: Sprite; ax: number; ay: number; honked: boolean; bubble?: Text; bubbleT: number;
}
interface Coin { x: number; y: number; amount: number; sprite: Graphics; fromVictim: boolean; life: number }
interface BView { parts: Sprite[]; base: Texture; x: number; y: number; w: number; h: number; top: number; lx: number; ly: number; alpha?: Uint8Array }
interface Floater { obj: Container; t: number; vy: number }
type LabelRef = { kind: 'shop' } | { kind: 'b'; k: number } | { kind: 'w'; w: Walker } | null;

/** main.ts 가 받는 일들 */
export interface WorldHooks {
  money(n: number): void;
  deed(key: DeedKey): void;
  hp(hp: number, max: number): void;
  died(cause: 'car' | 'beaten'): void;
  menu(title: string, sub: string, options: { label: string; danger?: boolean; act: () => void }[], x: number, y: number): void;
  say(name: string, text: string): void;
  work(state: { name: string; earned: number } | null): void;
  useAmmo(): boolean;
}
export interface Gear { atk: number; def: number; ranged: boolean; weapon: string | null }

const PED_COUNT = 14;
const THUG_COUNT = 4;
const MAX_CARS = 70;
export const PLAYER_MAX_HP = 1000;
/** 방콕 최저임금 하루 ฿400 (8시간) */
export const WAGE_PER_HOUR = 400 / 8;
const WAGE_PER_SEC = WAGE_PER_HOUR / 3600;
const ATK_INTERVAL = 0.9;
const MELEE = 1.25;
const RANGED = 5;

const rand = (a: number, b: number) => a + Math.floor(Math.random() * (b - a + 1));

export class WorldScene {
  readonly root = new Container();
  private camera = new Container();
  private ground = new Container();
  private objects = new Container();
  private overlay = new Graphics();
  private danger = new Graphics();
  private lights = new Container();
  private player!: Walker;
  private walkers: Walker[] = [];
  private cars: Car[] = [];
  private coins: Coin[] = [];
  private floaters: Floater[] = [];
  private chunks = new Map<string, Sprite>();
  private bViews = new Map<number, BView>();
  private bIndex = new Map<string, number[]>();

  private glows: { s: Sprite; i: number; j: number }[] = [];
  private tall: Sprite[] = []; // 기둥·가로등·나무 (플레이어를 가리면 비친다)
  private faded = new Set<Sprite>();
  private bars = new Graphics();
  private night = -1;
  private wantShop = false;
  private streamT = 0;
  private ring = new Graphics();
  private arrow = new Graphics();
  private aura = makeAuraSprite();
  private auraTex: Map<Dir, Frame[]> | null = null;
  private dressSeq = 0;
  private time = 0;
  private label = new Container();
  private labelText = new Text({ text: '', style: { fontFamily: 'system-ui, sans-serif', fontSize: 13, fontWeight: '600', fill: '#fff6d8' } });
  private labelBg = new Graphics();
  private labelT = 0;
  private labelFor: LabelRef = null;
  private hoverFor: LabelRef = null;
  private insets = { right: 0, bottom: 0 };
  private gear: Gear = { atk: 0, def: 0, ranged: false, weapon: null };
  private combatT = 99; // 마지막 싸움 뒤 지난 시간
  private criminalT = 0; // 먼저 공격한 표시가 남은 시간
  private carCool = 0;
  private stun = 0;
  private dead = false;
  private working: { k: number; name: string; earned: number; spot: [number, number]; on: boolean } | null = null;
  private workTick = 0;
  private pending: { kind: 'talk' | 'look'; w: Walker } | null = null;
  private tick = (tk: { deltaMS: number }) => this.update(Math.min(0.05, tk.deltaMS / 1000));

  constructor(private app: Application, readonly zone: Zone, look: Look, private onEnterShop: () => void, private hooks: WorldHooks, hp = PLAYER_MAX_HP) {
    this.objects.sortableChildren = true;
    this.camera.addChild(this.ground, this.objects);
    this.root.addChild(this.camera, this.overlay, this.lights, this.danger);
    this.lights.eventMode = 'none';
    this.overlay.eventMode = 'none';
    this.danger.eventMode = 'none';
    zone.buildings.forEach((b, k) => {
      const key = `${Math.floor(b.i0 / CHUNK)},${Math.floor(b.j0 / CHUNK)}`;
      const list = this.bIndex.get(key);
      if (list) list.push(k); else this.bIndex.set(key, [k]);
    });
    this.placeProps();
    this.spawnPlayer(look, hp);
    for (let n = 0; n < PED_COUNT; n++) this.spawnNpc('passer');
    for (let n = 0; n < THUG_COUNT; n++) this.spawnNpc('thug');
    this.spawnCars();
    this.root.eventMode = 'static';
    this.root.hitArea = this.app.screen;
    this.root.on('pointertap', (e) => this.onTap(e.global.x, e.global.y, e.ctrlKey || e.metaKey || e.shiftKey));
    this.root.on('pointermove', (e) => { if (e.pointerType === 'mouse') this.onHover(e.global.x, e.global.y); });
    this.labelText.anchor.set(0.5, 1);
    this.label.addChild(this.labelBg, this.labelText);
    this.label.visible = false;
    this.label.eventMode = 'none';
    this.label.zIndex = 1e6;
    this.bars.zIndex = 1e6 - 1;
    this.objects.addChild(this.label, this.bars);
    this.update(0);
    this.stream(true);
  }

  // ───────────────────────── 소품 · 바닥 · 건물 불러오기 ─────────────────────────
  private placeProps() {
    for (const p of this.zone.props) {
      const pt = propSprite(p.kind, (p.i * 7 + p.j * 3) % 3);
      if (!pt) continue;
      const s = new Sprite(pt.tex);
      const [x, y] = iso(p.i + 0.5, p.j + 0.5);
      s.anchor.set(pt.ax, pt.ay);
      s.position.set(x, y);
      s.zIndex = p.i + p.j + 0.99;
      this.objects.addChild(s);
      if (p.kind === 'pillar' || p.kind === 'lamp' || p.kind === 'tree') this.tall.push(s);
      if (p.kind === 'lamp') {
        const glow = new Sprite(this.glowTex());
        glow.anchor.set(0.5);
        glow.position.set(x + 19, y - 136);
        glow.blendMode = 'add';
        this.lights.addChild(glow);
        this.glows.push({ s: glow, i: p.i, j: p.j });
      }
    }
  }

  private _glow?: Texture;
  private glowTex() {
    if (!this._glow) this._glow = tex(glowCanvas());
    return this._glow;
  }

  private visibleRange() {
    const sw = this.app.screen.width, sh = this.app.screen.height;
    const pts = [[0, 0], [sw, 0], [0, sh], [sw, sh]].map(([sx, sy]) => {
      const wx = sx - this.camera.x, wy = sy - this.camera.y;
      return [(wx / (TW / 2) + wy / (TH / 2)) / 2, (wy / (TH / 2) - wx / (TW / 2)) / 2];
    });
    const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]);
    return { i0: Math.min(...xs) - 4, i1: Math.max(...xs) + 16, j0: Math.min(...ys) - 4, j1: Math.max(...ys) + 16 };
  }

  private stream(all: boolean) {
    const r = this.visibleRange();
    const c0 = Math.floor(Math.max(0, r.i0) / CHUNK), c1 = Math.floor(Math.min(this.zone.W - 1, r.i1) / CHUNK);
    const d0 = Math.floor(Math.max(0, r.j0) / CHUNK), d1 = Math.floor(Math.min(this.zone.H - 1, r.j1) / CHUNK);
    let budget = all ? 1e9 : 3;
    const want = new Set<string>();
    for (let cj = d0; cj <= d1; cj++)
      for (let ci = c0; ci <= c1; ci++) {
        const key = `${ci},${cj}`;
        want.add(key);
        if (!this.chunks.has(key) && budget > 0) {
          budget--;
          const ch = kitOk ? drawGroundKit(this.zone, ci * CHUNK, cj * CHUNK) : drawGroundChunk(this.zone, ci * CHUNK, cj * CHUNK);
          const s = new Sprite(ch ? tex(ch.canvas) : Texture.EMPTY);
          if (ch) s.position.set(ch.x, ch.y);
          this.ground.addChild(s);
          this.chunks.set(key, s);
        }
      }
    for (const [key, s] of this.chunks) if (!want.has(key)) { s.destroy({ texture: s.texture !== Texture.EMPTY, textureSource: s.texture !== Texture.EMPTY }); this.chunks.delete(key); }
    let bBudget = all ? 1e9 : 3;
    const wantB = new Set<number>();
    for (let cj = d0 - 1; cj <= d1; cj++)
      for (let ci = c0 - 1; ci <= c1; ci++)
        for (const k of this.bIndex.get(`${ci},${cj}`) ?? []) {
          wantB.add(k);
          if (!this.bViews.has(k) && bBudget > 0) { bBudget--; this.bViews.set(k, this.makeBuilding(this.zone.buildings[k])); }
        }
    for (const [k, v] of this.bViews) if (!wantB.has(k)) { this.dropBuilding(v); this.bViews.delete(k); }
  }

  /** 건물 간판 이름 */
  private nameOf(b: Building) {
    return b.cat === 'ujusae' ? '' : shopName(b.i0, b.j0, b.cat, lang());
  }

  /**
   * 건물을 세로 띠(32px)로 잘라 띠마다 앞뒤 순서를 따로 준다.
   * 건물 한 장에 순서 하나만 주면 넓은 건물 뒤를 걷는 사람이 지붕 위에 그려진다
   */
  private makeBuilding(b: Building): BView {
    const d = kitOk ? drawBuildingKit(b, this.nameOf(b), this.night === 1) : drawBuilding(b, this.nameOf(b), this.night === 1);
    const base = tex(d.canvas);
    const i1 = b.i0 + b.w, j1 = b.j0 + b.d;
    const cornerX = (i1 - j1) * (TW / 2);
    const key = (sx: number) => (sx < cornerX ? 2 * j1 + sx / (TW / 2) : 2 * i1 - sx / (TW / 2));
    const parts: Sprite[] = [];
    const W = d.canvas.width, H = d.canvas.height, SW = 32;
    for (let cx = 0; cx < W; cx += SW) {
      const w = Math.min(SW, W - cx);
      const s = new Sprite(new Texture({ source: base.source, frame: new Rectangle(cx, 0, w, H) }));
      s.position.set(d.x + cx, d.y);
      const a = d.x + cx, z = d.x + cx + w;
      s.zIndex = Math.min(key(a), key(z), a < cornerX && z > cornerX ? key(cornerX) : 1e9) - 0.2;
      this.objects.addChild(s);
      parts.push(s);
    }
    const top = kitOk ? buildingTop(b) : buildingHeight(b.h);
    const [lx] = iso(b.i0 + b.w / 2, b.j0 + b.d / 2);
    const id = d.canvas.getContext('2d')!.getImageData(0, 0, W, H).data;
    const alpha = new Uint8Array(W * H);
    for (let k = 0; k < alpha.length; k++) alpha[k] = id[k * 4 + 3] > 0 ? 1 : 0;
    return { parts, base, x: d.x, y: d.y, w: W, h: H, top, lx, ly: (b.i0 + b.j0) * (TH / 2) - top + 4, alpha };
  }

  private dropBuilding(v: BView) {
    for (const s of v.parts) s.destroy({ texture: true });
    v.base.destroy(true);
  }

  private clearBuildings() {
    for (const v of this.bViews.values()) this.dropBuilding(v);
    this.bViews.clear();
  }

  // ───────────────────────── 사람 ─────────────────────────
  private makeWalker(look: Look, i: number, j: number, kind: Walker['kind'], weapon: string | null = null): Walker {
    const sprite = new Sprite();
    sprite.visible = false;
    this.objects.addChild(sprite);
    const isPlayer = kind === 'player';
    const maxHp = isPlayer ? PLAYER_MAX_HP : kind === 'thug' ? 220 : 120;
    const dirs: Dir[] = ['se', 'sw', 'ne', 'nw'];
    const w: Walker = {
      x: i + 0.5, y: j + 0.5, path: [], speed: isPlayer ? 2.3 : kind === 'thug' ? 0.9 : 0.75 + Math.random() * 0.35, cs: null, look, weapon, dressId: 0, sprite,
      dir: dirs[Math.floor(Math.random() * 4)], anim: 0, act: null, pend: null, wait: Math.random() * 3, isPlayer, kind,
      hp: maxHp, maxHp, down: 0, target: null, atkT: 0, firstBy: null, flee: 0, hurtT: 0, barT: 0, repathT: 0, home: [i, j], bubbleT: 0,
    };
    this.dress(w, look, weapon);
    return w;
  }

  /** 옷·무기가 바뀌면 그림을 새로 합친다 (불러오는 동안은 이전 그림 유지) */
  private dress(w: Walker, look: Look, weapon: string | null) {
    w.look = look;
    w.weapon = weapon;
    const id = (w.dressId = ++this.dressSeq);
    charSet(look, weapon).then((cs) => {
      if (w.dressId !== id || w.sprite.destroyed) return;
      w.cs = cs;
      if (w.isPlayer) {
        this.auraTex = look.aura ? auraFor(cs) : null;
        this.aura.visible = !!this.auraTex;
      }
    });
  }

  private spawnPlayer(look: Look, hp: number) {
    const { i, j } = this.zone.spawn;
    this.player = this.makeWalker(look, i, j, 'player');
    this.player.hp = Math.max(1, Math.min(PLAYER_MAX_HP, hp));
    this.walkers.push(this.player);
    this.objects.addChild(this.ring, this.aura, this.arrow);
  }

  private npcLook(kind: NpcKind): Look {
    const r = (n: number) => Math.floor(Math.random() * n);
    if (kind === 'thug') return { sex: Math.random() < 0.85 ? 'm' : 'f', build: 1 + r(2), skin: r(3), hair: [0, 5, 1][r(3)], hairColor: r(2), top: 4, bottom: 3 };
    return { sex: Math.random() < 0.5 ? 'f' : 'm', build: r(3), skin: r(3), hair: r(6), hairColor: r(3), top: r(4), bottom: r(3) };
  }

  private npcWeapon(kind: NpcKind): string | null {
    if (kind !== 'thug') return null;
    return [null, 'bat', 'pipe', 'knife', 'bat', null][Math.floor(Math.random() * 6)];
  }

  /** 플레이어 근처 보도(불량배는 골목)에 사람을 세운다. 이미 있던 사람이면 자리만 옮긴다 */
  private spawnNpc(kind: NpcKind, existing?: Walker) {
    const p = this.player;
    const prefer: Parameters<typeof randomWalkTileNear>[4] = kind === 'thug' ? ['soi', 'walk'] : ['walk', 'cross', 'park'];
    let spot: [number, number] | null = null;
    for (let n = 0; n < 6 && !spot; n++) {
      const s = randomWalkTileNear(this.zone, Math.floor(p.x), Math.floor(p.y), 24, prefer);
      if (s && Math.hypot(s[0] - p.x, s[1] - p.y) > 9) spot = s;
    }
    if (!spot) return;
    if (existing) {
      Object.assign(existing, { x: spot[0] + 0.5, y: spot[1] + 0.5, path: [], hp: existing.maxHp, down: 0, target: null, firstBy: null, flee: 0, home: spot });
      existing.act = null;
      existing.pend = null;
      this.dress(existing, this.npcLook(kind), this.npcWeapon(kind));
      return;
    }
    this.walkers.push(this.makeWalker(this.npcLook(kind), spot[0], spot[1], kind, this.npcWeapon(kind)));
  }

  private spawnCars() {
    const lanes = this.zone.lanes.slice().sort((a, b) => b.i1 - b.i0 - (a.i1 - a.i0));
    for (const lane of lanes) {
      const n = Math.max(1, Math.floor((lane.i1 - lane.i0) / 40));
      for (let k = 0; k < n && this.cars.length < MAX_CARS; k++) {
        const ct = carSprite(CAR_MODELS[Math.floor(Math.random() * CAR_MODELS.length)], lane.dir);
        if (!ct) continue;
        const sprite = new Sprite(ct.tex);
        sprite.anchor.set(ct.ax, ct.ay);
        this.objects.addChild(sprite);
        const max = 4.5 + Math.random() * 2.5;
        this.cars.push({ lane, x: lane.i0 + Math.random() * (lane.i1 - lane.i0), speed: max, max, sprite, ax: ct.ax, ay: ct.ay, honked: false, bubbleT: 0 });
      }
    }
  }

  // ───────────────────────── 바깥에서 부르는 것 ─────────────────────────
  setLook(look: Look) {
    this.dress(this.player, look, this.gear.weapon);
  }
  setGear(g: Gear) {
    const changed = g.weapon !== this.gear.weapon;
    this.gear = g;
    if (changed && this.player) this.dress(this.player, this.player.look, g.weapon);
  }
  /** 먹거나 붕대를 감아 체력을 채운다 */
  heal(n: number) {
    const p = this.player;
    p.hp = Math.min(p.maxHp, p.hp + n);
    this.float(p, `+${n}`, '#8fe08a');
    this.hooks.hp(p.hp, p.maxHp);
  }
  setInsets(right: number, bottom: number) {
    this.insets = { right, bottom };
  }
  turnPlayer() {
    const d = this.player.dir;
    this.player.dir = ((d[0] === 's' ? 'n' : 's') + d[1]) as Dir;
  }
  relabel() {
    this.clearBuildings();
    this.stream(true);
  }

  /** 우주새에서 나올 때 (또는 다시 태어날 때): 가게 문 앞에 선다 */
  placeAtDoor(hp?: number) {
    const p = this.player;
    const { i, j } = this.zone.door;
    const out = [[i, j + 1], [i + 1, j + 1], [i - 1, j + 1], [i, j + 2]].find(([a, b]) => walkable(this.zone, a, b)) ?? [i, j];
    p.x = out[0] + 0.5;
    p.y = out[1] + 0.5;
    p.path = [];
    p.target = null;
    p.dir = 'se';
    p.act = null;
    if (hp !== undefined) p.hp = hp;
    this.dead = false;
    this.wantShop = false;
    this.stopWork();
    this.hooks.hp(p.hp, p.maxHp);
  }

  /** 다시 태어날 때 몸을 일으킨다 */
  revive(look: Look) {
    const p = this.player;
    p.act = null;
    p.pend = null;
    p.hp = p.maxHp;
    this.criminalT = 0;
    this.dead = false;
    this.setLook(look);
  }

  start() {
    this.app.ticker.add(this.tick);
  }
  stop() {
    this.app.ticker.remove(this.tick);
    document.body.style.cursor = '';
  }

  // ───────────────────────── 누르기 ─────────────────────────
  private toWorld(gx: number, gy: number) {
    return { wx: gx - this.camera.x, wy: gy - this.camera.y };
  }

  private walkerAt(gx: number, gy: number): Walker | null {
    const { wx, wy } = this.toWorld(gx, gy);
    let best: Walker | null = null, bz = -1e9;
    for (const w of this.walkers) {
      if (w.isPlayer) continue;
      const [sx, sy] = iso(w.x, w.y);
      const box = w.down > 0 ? { x0: sx - 22, x1: sx + 22, y0: sy - 14, y1: sy + 6 } : { x0: sx - 10, x1: sx + 10, y0: sy - 42, y1: sy + 4 };
      if (wx >= box.x0 && wx <= box.x1 && wy >= box.y0 && wy <= box.y1 && w.x + w.y > bz) { best = w; bz = w.x + w.y; }
    }
    return best;
  }

  private coinAt(gx: number, gy: number): Coin | null {
    const { wx, wy } = this.toWorld(gx, gy);
    for (const c of this.coins) {
      const [sx, sy] = iso(c.x, c.y);
      if (Math.abs(wx - sx) < 10 && Math.abs(wy - sy + 2) < 8) return c;
    }
    return null;
  }

  /** 화면 좌표 아래의 건물 (가장 앞쪽). 벽·지붕이 실제로 덮는 곳만 */
  private buildingAt(gx: number, gy: number): number | null {
    const { wx, wy } = this.toWorld(gx, gy);
    let best: number | null = null, bz = -1e9;
    for (const [k, v] of this.bViews) {
      if (wx < v.x || wx > v.x + v.w || wy < v.y || wy > v.y + v.h) continue;
      const b = this.zone.buildings[k];
      const h = v.top;
      let hitB = false;
      for (let z = 0; z <= h && !hitB; z += 4) {
        const fx = (wx / (TW / 2) + (wy + z) / (TH / 2)) / 2, fy = ((wy + z) / (TH / 2) - wx / (TW / 2)) / 2;
        if (fx >= b.i0 && fx <= b.i0 + b.w && fy >= b.j0 && fy <= b.j0 + b.d) hitB = true;
      }
      if (!hitB) continue;
      const z = b.i0 + b.j0 + b.w + b.d;
      if (z > bz) { best = k; bz = z; }
    }
    return best;
  }

  private onHover(gx: number, gy: number) {
    const w = this.walkerAt(gx, gy);
    if (w) this.hoverFor = { kind: 'w', w };
    else {
      const k = this.buildingAt(gx, gy);
      const b = k !== null ? this.zone.buildings[k] : null;
      this.hoverFor = b && b.cat === 'ujusae' ? { kind: 'shop' } : b && this.nameOf(b) ? { kind: 'b', k: k! } : null;
    }
    document.body.style.cursor = this.hoverFor || this.coinAt(gx, gy) ? 'pointer' : '';
  }

  private onTap(gx: number, gy: number, force: boolean) {
    if (this.dead) return;
    const L = t();
    // 1) 사람: 메뉴 (컨트롤·시프트를 누르고 누르면 바로 공격 = 강제 공격)
    const w = this.walkerAt(gx, gy);
    if (w && w.down <= 0) {
      if (force) { this.attack(w); return; }
      this.showLabel({ kind: 'w', w }, 2);
      const [sx, sy] = iso(w.x, w.y);
      const opts: { label: string; danger?: boolean; act: () => void }[] = [];
      if (w.kind === 'thug') opts.push({ label: L.act.attack, act: () => this.attack(w) });
      opts.push({ label: L.act.talk, act: () => this.approach(w, 'talk') });
      opts.push({ label: L.act.look, act: () => this.approach(w, 'look') });
      if (w.kind === 'passer') opts.push({ label: L.act.force, danger: true, act: () => this.attack(w) });
      this.hooks.menu(L.npc[w.kind as NpcKind], L.npcSub[w.kind as NpcKind], opts, sx + this.camera.x, sy - 44 + this.camera.y);
      return;
    }
    // 2) 떨어진 돈
    const c = this.coinAt(gx, gy);
    if (c) { this.cancelActs(); this.walkTo(Math.floor(c.x), Math.floor(c.y)); return; }
    // 3) 건물: 우주새는 들어가기, 다른 가게는 일하기
    const k = this.buildingAt(gx, gy);
    if (k !== null) {
      const b = this.zone.buildings[k];
      if (b.cat === 'ujusae') {
        this.cancelActs();
        this.showLabel({ kind: 'shop' }, 2.5);
        this.walkTo(this.zone.door.i, this.zone.door.j);
        this.wantShop = true;
        return;
      }
      const name = this.nameOf(b);
      if (name) {
        this.showLabel({ kind: 'b', k }, 2.5);
        const opts: { label: string; act: () => void }[] = [];
        if (WORKPLACES.includes(b.cat) && b.sign) opts.push({ label: L.act.work.replace('{n}', String(WAGE_PER_HOUR)), act: () => this.goWork(k) });
        opts.push({ label: L.act.close, act: () => undefined });
        this.hooks.menu(name, L.cats[b.cat] ?? '', opts, gx, gy - 10);
        return;
      }
    }
    // 4) 땅
    this.cancelActs();
    const { wx, wy } = this.toWorld(gx, gy);
    const x = (wx / (TW / 2) + wy / (TH / 2)) / 2, y = (wy / (TH / 2) - wx / (TW / 2)) / 2;
    this.walkTo(Math.floor(x), Math.floor(y));
  }

  private cancelActs() {
    this.player.target = null;
    this.pending = null;
    this.wantShop = false;
    this.stopWork();
  }

  private walkTo(i: number, j: number) {
    const p = this.player;
    const from: [number, number] = p.path.length ? p.path[0] : [Math.floor(p.x), Math.floor(p.y)];
    const path = findPath(this.zone, from[0], from[1], i, j);
    if (!path) return false;
    p.path = p.path.length ? [p.path[0], ...path] : path;
    return true;
  }

  /** 사람에게 다가가 말을 걸거나 살펴본다 */
  private approach(w: Walker, kind: 'talk' | 'look') {
    this.cancelActs();
    this.pending = { kind, w };
    if (kind === 'look') { this.finishPending(); return; }
    this.walkTo(Math.floor(w.x), Math.floor(w.y));
  }

  private finishPending() {
    const pd = this.pending;
    if (!pd) return;
    this.pending = null;
    const L = t();
    const w = pd.w;
    const kind = w.kind as NpcKind;
    if (pd.kind === 'look') {
      this.hooks.say(L.npc[kind], `${L.inspect[kind]} (${L.hpLabel} ${Math.ceil(w.hp)}/${w.maxHp})`);
      return;
    }
    const lines = L.lines[kind];
    this.hooks.say(L.npc[kind], lines[Math.floor(Math.random() * lines.length)]);
    if (kind === 'thug' && Math.random() < 0.5) { w.target = this.player; w.firstBy ??= w; }
  }

  /** 공격 시작 (행인은 강제 공격) */
  private attack(w: Walker) {
    this.cancelActs();
    this.player.target = w;
    this.player.atkT = Math.min(this.player.atkT, 0.2);
  }

  // ───────────────────────── 일하기 ─────────────────────────
  private goWork(k: number) {
    const b = this.zone.buildings[k];
    const spot: [number, number] = b.sign === 'right' ? [b.i0 + b.w, b.j0 + Math.floor(b.d / 2)] : [b.i0 + Math.floor(b.w / 2), b.j0 + b.d];
    const near = [[0, 0], [0, 1], [1, 0], [-1, 0], [0, -1], [1, 1]].map(([a, c]) => [spot[0] + a, spot[1] + c] as [number, number]).find(([a, c]) => walkable(this.zone, a, c));
    if (!near) return;
    this.cancelActs();
    this.walkTo(near[0], near[1]);
    this.working = { k, name: this.nameOf(b), earned: 0, spot: near, on: false };
  }

  private stopWork() {
    if (!this.working) return;
    this.working = null;
    this.hooks.work(null);
  }

  // ───────────────────────── 싸움 ─────────────────────────
  private hit(from: Walker, to: Walker, dmg: number) {
    if (to.down > 0 || this.dead) return;
    to.hp -= dmg;
    to.hurtT = 0.18;
    if (!to.act || to.act.anim === 'hit') { to.act = { anim: 'hit', t: 0 }; to.pend = null; }
    to.barT = 5;
    this.float(to, String(Math.round(dmg)), from.isPlayer ? '#fff1b0' : '#ff8a7a');
    if (from.isPlayer || to.isPlayer) this.combatT = 0;
    if (to.isPlayer) {
      this.stopWork();
      this.hooks.hp(Math.max(0, to.hp), to.maxHp);
      if (to.hp <= 0) this.die('beaten');
      return;
    }
    // 처음 맞은 사람: 누가 먼저 걸었는지 기록. 죄 없는 행인을 먼저 치면 악행, 선공 표시
    if (!to.firstBy) {
      to.firstBy = from;
      if (from.isPlayer && to.kind === 'passer') {
        this.hooks.deed('firstStrike');
        this.criminalT = 180;
      }
    }
    if (to.kind === 'passer') {
      to.flee = 7;
      to.path = [];
      if (Math.random() < 0.6) this.bubble(to, t().help);
    } else if (!to.target) to.target = from;
    if (to.hp <= 0) this.knockDown(to, from);
  }

  private knockDown(w: Walker, by: Walker) {
    w.hp = 0;
    w.down = 30;
    w.path = [];
    w.target = null;
    w.flee = 0;
    w.pend = null;
    w.act = { anim: 'fall', t: 0 };
    if (by.isPlayer) {
      by.target = null;
      if (w.kind === 'thug') {
        this.hooks.deed('thugDown');
        if (w.firstBy === w) this.hooks.deed('counterWin');
      }
    }
    const amount = w.kind === 'thug' ? rand(60, 260) : rand(15, 90);
    this.dropCoin(w.x, w.y, amount, w.kind === 'passer');
  }

  private dropCoin(x: number, y: number, amount: number, fromVictim: boolean) {
    const g = new Graphics();
    g.ellipse(0, 0, 6, 2.6).fill({ color: 0x000000, alpha: 0.35 });
    for (const [dx, dy, c] of [[-2, -1, 0xc9a23e], [2, -1, 0xe0b437], [0, -3, 0xf2d27a]] as const) g.ellipse(dx, dy, 3, 1.6).fill(c).stroke({ color: 0x6b4a1c, width: 0.6 });
    const cx = x + 0.3, cy = y + 0.15;
    const [sx, sy] = iso(cx, cy);
    g.position.set(sx, sy);
    g.zIndex = cx + cy - 0.4;
    this.objects.addChild(g);
    this.coins.push({ x: cx, y: cy, amount, sprite: g, fromVictim, life: 120 });
  }

  private die(cause: 'car' | 'beaten') {
    if (this.dead) return;
    this.dead = true;
    const p = this.player;
    p.hp = 0;
    p.path = [];
    p.target = null;
    p.pend = null;
    p.act = { anim: 'fall', t: 0 };
    this.stopWork();
    this.hooks.hp(0, p.maxHp);
    for (const w of this.walkers) if (w.target === p) w.target = null;
    setTimeout(() => this.hooks.died(cause), 1100);
  }

  private bubble(w: Walker, text: string) {
    w.bubble?.destroy();
    w.bubble = new Text({ text, style: { fontFamily: 'system-ui, sans-serif', fontSize: 12, fontWeight: '700', fill: '#fff6d8', stroke: { color: '#1a1410', width: 3 } } });
    w.bubble.anchor.set(0.5, 1);
    w.bubble.zIndex = 1e6 - 2;
    this.objects.addChild(w.bubble);
    w.bubbleT = 1.6;
  }

  private float(w: Walker, text: string, color: string) {
    const tx = new Text({ text, style: { fontFamily: 'system-ui, sans-serif', fontSize: 12, fontWeight: '800', fill: color, stroke: { color: '#140e0a', width: 3 } } });
    tx.anchor.set(0.5, 1);
    const [sx, sy] = iso(w.x, w.y);
    tx.position.set(sx + (Math.random() * 10 - 5), sy - 44);
    tx.zIndex = 1e6 - 3;
    this.objects.addChild(tx);
    this.floaters.push({ obj: tx, t: 0.9, vy: -26 });
  }

  /** 휘두르는 순간의 짧은 빛 줄 */
  /** 맞는 순간의 효과: 근접은 베는 선, 총은 총구 불꽃과 탄도 */
  private swing(from: Walker, to: Walker, ranged = false) {
    const g = new Graphics();
    if (ranged) {
      const [ax, ay] = iso(from.x, from.y), [bx, by] = iso(to.x, to.y);
      const dx = bx - ax, dy = by - ay, L = Math.hypot(dx, dy) || 1;
      const mx = ax + (dx / L) * 15, my = ay - 31 + (dy / L) * 7;
      g.circle(mx, my, 6).fill({ color: 0xffb040, alpha: 0.35 }).circle(mx, my, 3).fill({ color: 0xfff2a0, alpha: 0.95 });
      g.moveTo(mx, my).lineTo(bx, by - 26).stroke({ color: 0xfff6d8, width: 1, alpha: 0.55 });
      g.circle(bx, by - 26, 2.5).fill({ color: 0xffe08a, alpha: 0.9 });
      g.zIndex = 1e6 - 4;
      this.objects.addChild(g);
      this.floaters.push({ obj: g, t: 0.09, vy: 0 });
      return;
    }
    const [ax, ay] = iso(to.x, to.y);
    g.moveTo(-7, -3).lineTo(7, 3).stroke({ color: 0xfff6d8, width: 2, alpha: 0.9 });
    g.moveTo(-5, 2).lineTo(4, -2).stroke({ color: 0xffffff, width: 1, alpha: 0.6 });
    g.position.set(ax, ay - 28);
    g.zIndex = 1e6 - 4;
    this.objects.addChild(g);
    this.floaters.push({ obj: g, t: 0.14, vy: 0 });
  }

  /** 지금 보여 줄 장면을 고른다: 한 번 재생하는 동작 → 쓰러져 있음 → 걷기 → 서 있기 */
  private pose(w: Walker, moving: boolean, dt: number) {
    if (w.act) {
      w.act.t += dt;
      if (w.pend && w.act.t >= w.pend.at) this.landHit(w);
    } else if (w.pend) this.landHit(w);
    const cs = w.cs;
    w.sprite.visible = !!cs;
    if (!cs) return;
    const downed = w.down > 0 || (w.isPlayer && this.dead);
    let anim: Anim = moving ? 'walk' : 'idle';
    let i = moving ? Math.floor(w.anim) : 0;
    if (w.act) {
      const n = cs.counts[w.act.anim] ?? 0;
      const fi = Math.floor(w.act.t * ANIM_FPS[w.act.anim]);
      if (w.act.anim === 'fall' && n) { anim = 'fall'; i = Math.min(n - 1, fi); }
      else if (!n || fi >= n) w.act = null;
      else { anim = w.act.anim; i = fi; }
    }
    if (!w.act && downed) { anim = 'fall'; i = (cs.counts.fall ?? 1) - 1; }
    if (anim === 'walk') i %= cs.counts.walk ?? 8;
    applyFrame(w.sprite, frameOf(cs, anim, w.dir, i));
  }

  /** 사람 한 명의 싸움 행동 (쫓아가서 때리기) */
  private fight(w: Walker, dt: number) {
    const tg = w.target;
    if (!tg) return;
    if (tg.down > 0 || (tg.isPlayer && this.dead)) { w.target = null; return; }
    const dist = Math.hypot(tg.x - w.x, tg.y - w.y);
    const ranged = w.isPlayer && this.gear.ranged;
    const reach = ranged ? RANGED : MELEE;
    // 불량배는 자기 골목에서 너무 멀어지면 포기한다
    if (w.kind === 'thug' && Math.hypot(w.x - w.home[0], w.y - w.home[1]) > 14) { w.target = null; w.path = []; return; }
    if (dist > reach) {
      w.repathT -= dt;
      if (w.repathT <= 0 || !w.path.length) {
        w.repathT = 0.45;
        const path = findPath(this.zone, Math.floor(w.x), Math.floor(w.y), Math.floor(tg.x), Math.floor(tg.y));
        if (path) w.path = path.length > 1 ? path.slice(0, -1) : path;
      }
      return;
    }
    w.path = [];
    const sdx = (tg.x - w.x - (tg.y - w.y)) * (TW / 2), sdy = (tg.x - w.x + tg.y - w.y) * (TH / 2);
    if (!w.act || w.act.anim !== 'fall') w.dir = dirFromScreen(sdx, sdy, w.dir);
    w.atkT -= dt;
    if (w.atkT > 0) return;
    if (w.isPlayer) {
      w.atkT = ATK_INTERVAL;
      if (ranged && !this.hooks.useAmmo()) { this.gear.ranged = false; return; }
      let dmg = rand(4, 8) + this.gear.atk * 3;
      if (Math.random() * 100 < critChance(0)) dmg *= CRIT_MULTIPLIER;
      this.startAttack(w, tg, dmg);
    } else {
      w.atkT = 1.1;
      const dmg = Math.max(1, rand(4, 9) + (w.weapon ? 3 : 0) - (tg.isPlayer ? this.gear.def : 0));
      this.startAttack(w, tg, dmg);
    }
  }

  /** 공격 동작을 시작하고, 무기가 닿는 장면에서 피해를 준다 */
  private startAttack(w: Walker, tg: Walker, dmg: number) {
    const anim: Anim = w.cs?.attack ?? 'punch';
    w.act = { anim, t: 0 };
    w.pend = { to: tg, dmg, at: (IMPACT[anim] ?? 1) / ANIM_FPS[anim] };
  }

  private landHit(w: Walker) {
    const pd = w.pend!;
    w.pend = null;
    const tg = pd.to;
    if (tg.down > 0 || (tg.isPlayer && this.dead) || w.down > 0) return;
    const ranged = w.isPlayer && this.gear.ranged;
    if (Math.hypot(tg.x - w.x, tg.y - w.y) > (ranged ? RANGED : MELEE) + 0.6) return;
    this.swing(w, tg, ranged);
    this.hit(w, tg, pd.dmg);
  }

  private stepWalker(w: Walker, dt: number) {
    if (!w.path.length) return false;
    const [ti, tj] = w.path[0];
    const tx = ti + 0.5, ty = tj + 0.5;
    const dx = tx - w.x, dy = ty - w.y, dist = Math.hypot(dx, dy);
    const sdy = (dx + dy) * (TH / 2), sdx = (dx - dy) * (TW / 2);
    w.dir = dirFromScreen(sdx, sdy, w.dir);
    let speed = w.speed;
    if (w.flee > 0) speed = 1.9;
    if (w.isPlayer && isDanger(w.hp, w.maxHp)) speed *= DANGER_SPEED;
    if (w.kind === 'thug' && w.target) speed = 1.7;
    const step = speed * dt;
    if (dist <= step) { w.x = tx; w.y = ty; w.path.shift(); } else { w.x += (dx / dist) * step; w.y += (dy / dist) * step; }
    return true;
  }

  // ───────────────────────── 매 장면 ─────────────────────────
  private update(dt: number) {
    const p = this.player;
    this.time += dt;
    if (this.stun > 0) { this.stun -= dt; p.path = []; }
    const clk = bangkokClock();
    const nf = nightFactor(clk.h, clk.m);
    for (const w of this.walkers) {
      if (w.down > 0) {
        if (!w.isPlayer) {
          w.down -= dt;
          if (w.down <= 0) this.spawnNpc(w.kind as NpcKind, w);
        }
      } else if (!(w.isPlayer && this.dead)) this.fight(w, dt);
      const moving = w.down <= 0 && !(w.isPlayer && this.dead) && this.stepWalker(w, dt);
      if (!w.isPlayer && w.down <= 0) this.think(w, moving, dt, nf);
      w.anim = moving ? w.anim + dt * (w.flee > 0 ? 1.9 : w.speed) * 8.5 : 0;
      this.pose(w, moving, dt);
      const [sx, sy] = iso(w.x, w.y);
      w.sprite.position.set(sx, sy);
      w.sprite.zIndex = w.down > 0 ? w.x + w.y - 0.3 : w.x + w.y;
      if (w.hurtT > 0) { w.hurtT -= dt; w.sprite.tint = 0xff7a6a; } else w.sprite.tint = 0xffffff;
      if (w.barT > 0) w.barT -= dt;
      if (w.bubble) {
        w.bubbleT -= dt;
        w.bubble.position.set(sx, sy - 46);
        if (w.bubbleT <= 0) { w.bubble.destroy(); w.bubble = undefined; }
      }
    }
    // 말 걸기: 가까이 가면
    if (this.pending && Math.hypot(this.pending.w.x - p.x, this.pending.w.y - p.y) < 1.6) { p.path = []; this.finishPending(); }
    // 일하기: 자리에 서 있는 동안 현실 시간으로 돈이 쌓인다. 움직이면 그만
    if (this.working) {
      const at = Math.floor(p.x) === this.working.spot[0] && Math.floor(p.y) === this.working.spot[1] && !p.path.length;
      if (at) {
        if (!this.working.on) {
          this.working.on = true;
          this.workTick = 0;
          const b = this.zone.buildings[this.working.k];
          const bx = b.i0 + b.w / 2 - p.x, by = b.j0 + b.d / 2 - p.y;
          p.dir = dirFromScreen(bx - by, bx + by, p.dir);
        }
        this.working.earned += WAGE_PER_SEC * dt;
        this.hooks.money(WAGE_PER_SEC * dt);
        this.workTick -= dt;
        if (this.workTick <= 0) { this.workTick = 1; this.hooks.work({ name: this.working.name, earned: this.working.earned }); }
      } else if (this.working.on) this.stopWork();
    }
    // 돈 줍기
    for (let k = this.coins.length - 1; k >= 0; k--) {
      const c = this.coins[k];
      c.life -= dt;
      const close = !this.dead && Math.hypot(c.x - p.x, c.y - p.y) < 0.8;
      if (close || c.life <= 0) {
        if (close) {
          this.hooks.money(c.amount);
          this.float(p, `+฿${c.amount}`, '#f2d27a');
          if (c.fromVictim) this.hooks.deed('rob');
        }
        c.sprite.destroy();
        this.coins.splice(k, 1);
      }
    }
    if (this.wantShop && !p.path.length) {
      const { i, j } = this.zone.door;
      if (Math.floor(p.x) === i && Math.floor(p.y) === j) { this.wantShop = false; this.stopWork(); this.onEnterShop(); }
    }
    // 체력: 싸움이 끝나고 20초가 지나면 천천히 찬다
    this.combatT += dt;
    if (!this.dead && this.combatT > OUT_OF_COMBAT_S && p.hp < p.maxHp) {
      const before = Math.floor(p.hp);
      p.hp = Math.min(p.maxHp, p.hp + (regenPerMinute(p.maxHp, 0) / 60) * dt);
      if (Math.floor(p.hp) !== before) this.hooks.hp(p.hp, p.maxHp);
    }
    if (this.criminalT > 0) this.criminalT -= dt;
    this.updateCars(dt, p);
    // 떠오르는 글씨
    for (let k = this.floaters.length - 1; k >= 0; k--) {
      const f = this.floaters[k];
      f.t -= dt;
      f.obj.y += f.vy * dt;
      f.obj.alpha = Math.min(1, f.t * 3);
      if (f.t <= 0) { f.obj.destroy(); this.floaters.splice(k, 1); }
    }
    // 체력 막대
    this.bars.clear();
    for (const w of this.walkers) {
      const show = w.isPlayer ? !this.dead && (this.combatT < 6 || isDanger(w.hp, w.maxHp)) : w.barT > 0 && w.down <= 0;
      if (!show) continue;
      const [sx, sy] = iso(w.x, w.y);
      const r = Math.max(0, w.hp / w.maxHp);
      this.bars.rect(sx - 11, sy - 49, 22, 4).fill({ color: 0x140e0a, alpha: 0.85 });
      this.bars.rect(sx - 10, sy - 48, 20 * r, 2).fill(r > 0.25 ? (w.isPlayer ? 0x6fd06a : 0xd9534f) : 0xff3b30);
    }
    // 플레이어 표시: 발밑 고리와 머리 위 화살 (먼저 공격했으면 붉게)
    const [px, py] = iso(p.x, p.y);
    const col = this.criminalT > 0 ? 0xe0463a : 0xe0b437;
    this.ring.clear().ellipse(0, 0, 12, 5).stroke({ color: col, width: 2, alpha: 0.95 }).ellipse(0, 0, 15, 6.5).stroke({ color: col, width: 1, alpha: 0.35 });
    this.ring.position.set(px, py);
    this.ring.zIndex = p.x + p.y - 0.01;
    const bob = Math.sin(this.time * 4) * 1.5;
    this.arrow.clear().poly([-4, 0, 4, 0, 0, 5]).fill(col).stroke({ color: 0x140e0a, width: 1 });
    this.arrow.position.set(px, py - (this.combatT < 6 || isDanger(p.hp, p.maxHp) ? 60 : 52) + bob);
    this.arrow.zIndex = 1e6 - 5;
    this.arrow.visible = !this.dead;
    if (this.auraTex) {
      applyFrame(this.aura, this.auraTex.get(p.dir)?.[Math.floor(this.time * 9) % 4]);
      this.aura.position.set(px, py);
      this.aura.zIndex = p.x + p.y - 0.005;
      this.aura.alpha = 0.75 + Math.sin(this.time * 5.3) * 0.2;
      this.aura.visible = !this.dead;
    }
    const vw = this.app.screen.width - this.insets.right, vh = this.app.screen.height - this.insets.bottom;
    this.camera.position.set(Math.round(vw / 2 - px), Math.round(vh / 2 - py + 20));
    this.lights.position.copyFrom(this.camera.position);
    // 이름표 (누른 것, 마우스를 올린 것, 우주새로 걸어가는 중)
    if (this.labelT > 0) this.labelT -= dt;
    this.drawLabel(this.labelT > 0 ? this.labelFor : this.wantShop ? { kind: 'shop' } : this.hoverFor);
    // 위험 상태: 화면 가장자리가 붉게 뛴다
    const W = this.app.screen.width, H = this.app.screen.height;
    this.danger.clear();
    if (!this.dead && isDanger(p.hp, p.maxHp)) {
      const a = 0.2 + Math.sin(this.time * 5) * 0.08;
      for (let k = 0; k < 6; k++) this.danger.rect(k * 6, k * 6, W - k * 12, H - k * 12).stroke({ color: 0xb01010, width: 6, alpha: a * (1 - k / 6) });
    }
    this.seeThrough(px, py, p.x + p.y);
    this.refreshNight(nf);
    this.streamT -= dt;
    if (this.streamT <= 0) { this.streamT = 0.12; this.stream(false); }
  }

  /** 행인·불량배의 평소 행동 */
  private think(w: Walker, moving: boolean, dt: number, nf: number) {
    const p = this.player;
    if (Math.hypot(w.x - p.x, w.y - p.y) > 34) { this.spawnNpc(w.kind as NpcKind, w); return; }
    if (w.flee > 0) {
      w.flee -= dt;
      if (!w.path.length) {
        const ax = w.x - p.x, ay = w.y - p.y, d = Math.hypot(ax, ay) || 1;
        const spot = randomWalkTileNear(this.zone, Math.floor(w.x + (ax / d) * 8), Math.floor(w.y + (ay / d) * 8), 3, ['walk', 'cross', 'park', 'soi', 'lot']);
        if (spot) { const path = findPath(this.zone, Math.floor(w.x), Math.floor(w.y), spot[0], spot[1]); if (path) w.path = path; }
      }
      return;
    }
    // 불량배: 가까이 오면 덤빈다 (밤에는 더 멀리서)
    if (w.kind === 'thug' && !w.target && !this.dead) {
      const reach = nf > 0.5 ? 4.5 : 3.2;
      if (Math.hypot(p.x - w.x, p.y - w.y) < reach && Math.random() < dt * 0.8) {
        w.target = p;
        w.firstBy ??= w;
        this.bubble(w, t().thugShout);
      }
    }
    if (w.target || moving) return;
    w.wait -= dt;
    if (w.wait > 0) return;
    w.wait = 2 + Math.random() * 5;
    const thug = w.kind === 'thug';
    const spot = randomWalkTileNear(this.zone, thug ? w.home[0] : Math.floor(w.x), thug ? w.home[1] : Math.floor(w.y), thug ? 5 : 10, thug ? ['soi', 'walk'] : ['walk', 'cross', 'park']);
    if (spot) { const path = findPath(this.zone, Math.floor(w.x), Math.floor(w.y), spot[0], spot[1]); if (path) w.path = path; }
  }

  /** 차량: 앞에 사람이 있으면 서고 경적. 바로 앞에 뛰어든 플레이어는 피하지 못한다 */
  private updateCars(dt: number, p: Walker) {
    if (this.carCool > 0) this.carCool -= dt;
    for (const c of this.cars) {
      const cy = c.lane.j + 0.5;
      let blocked = false;
      for (const w of this.walkers) {
        if (Math.floor(w.y) !== c.lane.j || w.down > 0) continue;
        const ahead = (w.x - c.x) * c.lane.dir;
        if (ahead > 0.9 && ahead < 2.6) blocked = true;
        if (w.isPlayer && !this.dead && ahead > -0.3 && ahead <= 0.9 && c.speed > 2.5 && this.carCool <= 0) this.carHitsPlayer(c);
      }
      c.speed = blocked ? Math.max(0, c.speed - 14 * dt) : Math.min(c.max, c.speed + 3 * dt);
      if (blocked && !c.honked && c.sprite.visible) { c.honked = true; this.carBubble(c, t().honk); }
      if (!blocked) c.honked = false;
      c.x += c.lane.dir * c.speed * dt;
      if (c.x > c.lane.i1 + 1) c.x = c.lane.i0;
      if (c.x < c.lane.i0) c.x = c.lane.i1 + 1;
      const near = Math.abs(c.x - p.x) + Math.abs(cy - p.y) < 40;
      c.sprite.visible = near;
      if (near) {
        const [sx, sy] = iso(c.x, cy);
        c.sprite.position.set(sx, sy);
        c.sprite.zIndex = c.x + cy;
      }
      if (c.bubble) {
        c.bubbleT -= dt;
        const [sx, sy] = iso(c.x, cy);
        c.bubble.position.set(sx, sy - 52);
        c.bubble.zIndex = 99999;
        if (c.bubbleT <= 0) { c.bubble.destroy(); c.bubble = undefined; }
      }
    }
  }

  /** 차에 치임: 위험 상태가 아니면 크게 다치고 보도로 튕겨 나간다. 위험 상태면 죽는다 */
  private carHitsPlayer(c: Car) {
    const p = this.player;
    this.carCool = 1.5;
    this.stopWork();
    p.target = null;
    c.speed = 0;
    this.carBubble(c, t().crash);
    this.combatT = 0;
    const res = carHit(p.hp, p.maxHp);
    if (res.dead) { this.die('car'); return; }
    this.float(p, String(Math.round(p.hp - res.hp)), '#ff8a7a');
    p.hp = res.hp;
    this.hooks.hp(p.hp, p.maxHp);
    let best: [number, number] | null = null, bd = 1e9;
    for (let dj = -3; dj <= 3; dj++)
      for (let di = -2; di <= 2; di++) {
        const i = Math.floor(p.x) + di, j = Math.floor(p.y) + dj;
        const tt = tileAt(this.zone, i, j);
        if (!walkable(this.zone, i, j) || tt === 'road' || tt === 'median') continue;
        const d = Math.hypot(di, dj);
        if (d < bd) { bd = d; best = [i, j]; }
      }
    if (best) { p.x = best[0] + 0.5; p.y = best[1] + 0.5; }
    p.path = [];
    this.stun = 0.8;
    p.hurtT = 0.4;
  }

  private carBubble(c: Car, text: string) {
    c.bubble?.destroy();
    c.bubble = new Text({ text, style: { fontFamily: 'sans-serif', fontSize: 14, fontWeight: '700', fill: '#fff6d8', stroke: { color: '#1a1410', width: 3 } } });
    c.bubble.anchor.set(0.5);
    this.objects.addChild(c.bubble);
    c.bubbleT = 1.2;
  }

  private showLabel(f: NonNullable<LabelRef>, hold: number) {
    this.labelFor = f;
    this.labelT = hold;
  }

  private drawLabel(f: LabelRef) {
    if (!f) { this.label.visible = false; return; }
    let text = '', x = 0, y = 0;
    if (f.kind === 'w') {
      const w = f.w;
      text = t().npc[w.kind as NpcKind] ?? '';
      const [sx, sy] = iso(w.x, w.y);
      x = sx; y = sy - (w.barT > 0 ? 54 : 48);
    } else {
      let k = f.kind === 'b' ? f.k : -1;
      if (f.kind === 'shop') for (const kk of this.bViews.keys()) if (this.zone.buildings[kk].cat === 'ujusae') k = kk;
      const v = this.bViews.get(k);
      if (!v) { this.label.visible = false; return; }
      text = f.kind === 'shop' ? t().shopLabel : this.nameOf(this.zone.buildings[k]);
      x = v.lx; y = v.ly;
    }
    if (this.labelText.text !== text) {
      this.labelText.text = text;
      const w = Math.ceil(this.labelText.width) + 14, h = 20;
      this.labelBg.clear().roundRect(-w / 2, -h + 2, w, h, 4).fill({ color: 0x140e0a, alpha: 0.82 }).stroke({ color: 0xc9a23e, width: 1, alpha: 0.9 });
      this.labelText.position.set(0, -2);
    }
    this.label.position.set(Math.round(x), Math.round(y));
    this.label.visible = true;
  }

  /** 플레이어 앞을 가리는 건물 띠·기둥은 반쯤 비친다 (사람이 지붕이나 기둥 위에 선 것처럼 보이지 않게) */
  private seeThrough(px: number, py: number, depth: number) {
    // 플레이어를 가리는 건물은 통째로 비친다 (띠 하나만 비치면 사람이 지붕 위에 서 있는 것처럼 보인다)
    const x0 = px - 12, x1 = px + 12, y0 = py - 48, y1 = py - 4;
    const hit = (s: Sprite, w: number, h: number, ax: number, ay: number) => {
      const sx = s.x - w * ax, sy = s.y - h * ay;
      return s.zIndex > depth && sx < x1 && sx + w > x0 && sy < y1 && sy + h > y0;
    };
    const now = new Set<Sprite>();
    for (const v of this.bViews.values()) {
      if (v.x > x1 || v.x + v.w < x0 || v.y > y1 || v.y + v.h < y0) continue;
      if (v.parts.some((s) => hit(s, s.width, s.height, 0, 0) && this.opaqueAt(v, px - v.x, py - 26 - v.y))) for (const s of v.parts) now.add(s);
    }
    for (const s of this.tall) if (hit(s, s.width, s.height, s.anchor.x, s.anchor.y)) now.add(s);
    for (const s of this.faded) if (!now.has(s) && !s.destroyed) s.alpha = 1;
    for (const s of now) s.alpha = 0.3;
    this.faded = now;
  }

  /** 건물 그림에서 그 자리에 실제로 벽이 있는가 (투명한 여백이면 가리지 않는 것) */
  private opaqueAt(v: BView, x: number, y: number) {
    const a = v.alpha;
    if (!a) return true;
    const ix = Math.round(x), iy = Math.round(y);
    for (const [dx, dy] of [[0, 0], [0, -10], [0, 10], [-6, 0], [6, 0]]) {
      const xx = ix + dx, yy = iy + dy;
      if (xx < 0 || yy < 0 || xx >= v.w || yy >= v.h) continue;
      if (a[yy * v.w + xx]) return true;
    }
    return false;
  }

  private refreshNight(nf: number) {
    const isNight = nf > 0.5 ? 1 : 0;
    if (isNight !== this.night) { this.night = isNight; this.clearBuildings(); }
    const W = this.app.screen.width, H = this.app.screen.height;
    this.overlay.clear().rect(0, 0, W, H).fill({ color: 0x0b1030, alpha: 0.5 * nf });
    for (const g of this.glows) g.s.alpha = nf;
  }

  here() {
    return tileAt(this.zone, Math.floor(this.player.x), Math.floor(this.player.y));
  }

  destroy() {
    this.stop();
    this.root.destroy({ children: true });
  }
}

function glowCanvas() {
  const c = document.createElement('canvas');
  c.width = c.height = 120;
  const g = c.getContext('2d')!;
  const gr = g.createRadialGradient(60, 60, 4, 60, 60, 60);
  gr.addColorStop(0, 'rgba(255,214,140,0.75)');
  gr.addColorStop(1, 'rgba(255,214,140,0)');
  g.fillStyle = gr;
  g.fillRect(0, 0, 120, 120);
  return c;
}

export { walkable };
