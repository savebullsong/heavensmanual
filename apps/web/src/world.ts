// 현실 세계 장면 (PixiJS): 실제 지도, 화면 근처만 불러오기, 클릭 이동, 행인·불량배, 차량, 방콕 실시간 낮밤
// 1단계-B: 대상 메뉴(말 걸기·살펴보기·공격·강제 공격), 싸움과 체력, 쓰러짐과 돈 줍기, 가게 노동, 차 사고
import { Application, ColorMatrixFilter, Container, Graphics, Matrix, Rectangle, Sprite, Text, Texture } from 'pixi.js';
import { type Look } from './character.ts';
import { charSet, frameOf, applyFrame, dirFromTile, turnedDir, auraFor, makeAuraSprite, ANIM_FPS, IMPACT, type CharSet, type Dir, type Anim, type Frame } from './sprites.ts';
import { type Zone, type Building, type Lane, type Prop, findPath, walkable, randomWalkTileNear, tileAt } from './zone.ts';
import { iso, TW, TH, drawBuilding, drawGroundChunk, buildingHeight } from './gfx.ts';
import { drawBuildingKit, drawGroundKit, buildingTop, upperFloors, carSprite, propSprite, CAR_MODELS, CHUNK, kitOk } from './street.ts';
import { t, lang } from './i18n.ts';
import { bangkokClock, nightFactor } from './clock.ts';
import { buildingName, buildingSub, interactive, canWork, hasBank, cuisineOf, storeOf, type StoreKind } from './names.ts';
import * as sfx from './sfx.ts';
import { MONSTERS, floorDef, type MonsterDef } from './hell.ts';
import { drawHellGround, drawHellStructure, hellTint, hellProp } from './hellgfx.ts';
import { drawCosmicBird, COSMIC_TOP } from './ujusae.ts';
import { streetProp, type PropPic } from './propgfx.ts';
import { decorOf } from './decor.ts';
import { canEnter, drawRoom, drawFurn, clerkLook } from './interior.ts';
import { carHit, isDanger, DANGER_SPEED, critChance, CRIT_MULTIPLIER, regenPerMinute, restRegenPerMinute, OUT_OF_COMBAT_S, dodgeChance, maxHp as maxHpFor, newStats, type DeedKey, type Stats } from '../../../packages/shared/src/rules.ts';

function tex(c: HTMLCanvasElement): Texture {
  const tx = Texture.from(c);
  tx.source.scaleMode = 'nearest';
  return tx;
}

export type NpcKind = 'passer' | 'thug' | 'suturer' | 'monster' | 'pashar' | 'clerk';
export type Realm = 'real' | 'ghost' | 'hell';
export type Stance = 'talk' | 'hostile' | 'all';
export interface RemoteInfo { name: string; look: Look; weapon: string | null; armor: string[]; member: boolean }
export interface NetPos { x: number; y: number; d: Dir; m: 0 | 1; a?: Anim; h?: number; c?: 1; k?: 1 }
interface Walker {
  x: number; y: number; // 연속 격자 좌표 (타일 중심 = i + 0.5)
  path: [number, number][];
  speed: number;
  cs: CharSet | null; // 미리 구운 그림 (불러오는 중이면 null)
  look: Look;
  weapon: string | null;
  armor: string[];
  dressId: number;
  sprite: Sprite;
  dir: Dir;
  anim: number;
  act: { anim: Anim; t: number } | null; // 한 번 재생하는 동작 (공격·맞음·쓰러짐)
  pend: { to: Walker; dmg: number; at: number; crit?: boolean } | null; // 동작이 닿는 순간 들어갈 피해
  wait: number;
  isPlayer: boolean;
  kind: 'player' | NpcKind | 'remote';
  rid?: string; rinfo?: RemoteInfo; rpos?: NetPos; // 다른 사람 (실시간)
  hitBy?: boolean; // 봉합자를 이미 친 적이 있다 (악행은 한 번만)
  farT?: number;
  giveUp?: boolean; // 봉합자: 쫓는 사람이 멀리 떨어져 있던 시간 (오래 도망치면 포기)
  monster?: boolean; // 변신한 봉합자
  hp: number;
  maxHp: number;
  down: number; // 쓰러져 있는 남은 시간
  target: Walker | null; // 공격 대상
  atkT: number;
  firstBy: Walker | null; // 이 싸움을 먼저 건 쪽
  flee: number;
  hurtT: number;
  flashT?: number; // 맞는 순간 하얗게 번쩍
  kb?: { dx: number; dy: number; t: number }; // 밀려나기
  voice?: number; // 사람마다 다른 목소리·타격음 높낮이
  stalk?: number; // 불량배: 시비 걸며 다가오는 중 (초)
  aggroCool?: number;
  mdef?: MonsterDef; // 지옥 괴물
  size?: number; // 그림 배율 (층주는 크게)
  lingerT?: number; // 싸우다 나간 사람의 몸이 남아 있는 시간
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
interface Coin { x: number; y: number; amount: number; sprite: Graphics; fromVictim: boolean; life: number; notes?: boolean }
interface BView { parts: Sprite[]; base: Texture; x: number; y: number; w: number; h: number; top: number; lx: number; ly: number; alpha?: Uint8Array; b: Building; ghost?: { parts: Sprite[]; base: Texture; a: number } }
interface Floater { obj: Container; t: number; vy: number }
type LabelRef = { kind: 'shop' } | { kind: 'b'; k: number } | { kind: 'w'; w: Walker } | null;

/** main.ts 가 받는 일들 */
export interface WorldHooks {
  money(n: number): void;
  deed(key: DeedKey, opt?: { floor?: number }): void;
  hp(hp: number, max: number): void;
  died(cause: 'car' | 'beaten' | 'hell'): void;
  menu(title: string, sub: string, options: { label: string; danger?: boolean; act: () => void }[], x: number, y: number): void;
  say(name: string, text: string): void;
  work(state: { name: string; earned: number } | null): void;
  useAmmo(): boolean;
  store(kind: StoreKind, name: string, cuisine?: string): void;
  /** 걸어서 자리를 뜨면 가게·은행 창을 닫는다 */
  away(): void;
  person(id: string, info: RemoteInfo, x: number, y: number, attack: () => void): void;
  /** 누른 건물·가까이 온 가게의 이름을 화면 위쪽에 잠깐 보여 준다 */
  place(name: string, sub: string): void;
  /** 은행 창구 */
  bank(name: string): void;
  /** 다른 사람을 때렸다 (맞은 사람 기기로 알린다) */
  pvpHit(to: string, dmg: number, crit: boolean, kind: string): void;
  /** 다른 사람에게 쓰러졌다 (때린 사람에게 알린다: 떨어뜨린 돈, 내가 범죄 표시였는지) */
  pvpDown(by: string, cash: number, wasCriminal: boolean): void;
  /** 지금 들고 있는 돈 (쓰러질 때 떨어뜨림) */
  cash(): number;
  /** 지옥: 계단·파샤르 */
  hellAct(kind: 'up' | 'down' | 'pashar'): void;
  /** 지옥: 층주를 쓰러뜨렸다 */
  bossDown(floor: number): void;
  /** 지옥: 저승돈을 주웠다 */
  notes(n: number): void;
  /** 건물 문 앞에 닿았다: 안으로 (out = 나왔을 때 설 자리, chaser = 쫓아오던 봉합자) */
  enterBuilding(k: number, out: { i: number; j: number }, chaser: { monster: boolean; hp: number } | null): void;
  /** 방의 나가는 매트를 밟았다 */
  leaveBuilding(): void;
  /** 방의 직원에게 말을 걸었다 */
  clerk(): void;
}
export interface Gear { atk: number; def: number; ranged: boolean; weapon: string | null; armor: string[] }

const PED_COUNT = 14;
const THUG_COUNT = 4;
const MAX_CARS = 70;
export const PLAYER_MAX_HP = 1000;
/** 방콕 최저임금 하루 ฿400 (8시간) */
export const WAGE_PER_HOUR = 400 / 8;
const WAGE_PER_SEC = WAGE_PER_HOUR / 3600;
const ATK_INTERVAL = 0.62; // 6차: 더 빠르게
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
  /** 거리 꾸밈(전봇대·산프라품·오토바이·화분·쓰레기통): 덩어리(CHUNK)마다 화면 근처만 그린다 */
  private dIndex = new Map<string, Prop[]>();
  private wIndex = new Map<string, [number, number, number, number][]>();
  private dViews = new Map<string, { sprites: Sprite[]; wires: Graphics | null }>();

  private glows: { s: Sprite; i: number; j: number }[] = [];
  // 기둥·가로등·나무·고가 상판 (플레이어를 가리면 비친다). 상자는 objects 좌표
  private tall: { o: Container; x0: number; y0: number; x1: number; y1: number; z: number }[] = [];
  private faded = new Set<Container>();
  private addTall(o: Container, x0: number, y0: number, x1: number, y1: number) {
    this.tall.push({ o, x0, y0, x1, y1, z: o.zIndex });
  }
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
  // 누른 자리 표시: 이동 = 바닥 파동, 공격 = 대상 발밑 붉은 표적, 상호작용 = 출입·말풍선 아이콘
  private fxLayer = new Graphics();
  private sparkG = new Graphics();
  private sparks: { x: number; y: number; vx: number; vy: number; t: number; col: number }[] = [];
  private hitStop = 0;
  private shakeT = 0;
  private shakeA = 0;
  private ripple: { x: number; y: number; t: number } | null = null;
  private mark: { w: Walker; t: number } | null = null;
  private door = new Graphics();
  private doorFor: number | null = null; // 아이콘이 떠 있는 건물 (-1 = 우주새)
  private doorAt = { x: 0, y: 0 };
  private talkIcon = new Graphics();
  private fronts = new Map<number, [number, number] | null>();
  // 길게 누르기 (0.25초) = 무조건 이동, 누른 채 움직이면 목적지가 따라온다
  private press: { id: number; x: number; y: number; sx: number; sy: number; t0: number; hold: boolean; next: number } | null = null;
  private skipTap = false;
  private label = new Container();
  private labelText = new Text({ text: '', style: { fontFamily: 'system-ui, sans-serif', fontSize: 13, fontWeight: '600', fill: '#fff6d8' } });
  private labelBg = new Graphics();
  private labelT = 0;
  private labelFor: LabelRef = null;
  private hoverFor: LabelRef = null;
  private insets = { right: 0, bottom: 0 };
  private gear: Gear = { atk: 0, def: 0, ranged: false, weapon: null, armor: [] };
  private stats: Stats = newStats();
  stance: Stance = 'talk';
  private suturerT = 0; // 다음 봉합자가 나타날 수 있을 때까지 (나타났다 사라진 뒤 쉬는 시간)
  private sutDue = -1; // 이번 죄에 봉합자가 오기로 정해졌다면, 나타날 때까지 남은 시간
  private combatT = 99; // 마지막 싸움 뒤 지난 시간
  private criminalT = 0; // 먼저 공격한 표시가 남은 시간
  private carCool = 0;
  private stun = 0;
  private dead = false;
  private working: { k: number; name: string; earned: number; spot: [number, number]; on: boolean } | null = null;
  private workTick = 0;
  private pending: { kind: 'talk' | 'look'; w: Walker } | null = null;
  private tick = (tk: { deltaMS: number }) => {
    let dt = Math.min(0.05, tk.deltaMS / 1000);
    // 히트스톱: 맞는 순간 세상이 아주 잠깐 멈칫한다
    if (this.hitStop > 0) { this.hitStop -= dt; dt *= 0.04; }
    this.update(dt, Math.min(0.05, tk.deltaMS / 1000));
  };

  readonly realm: Realm;
  private bossDown: boolean;
  private embers: { x: number; y: number; vx: number; vy: number; t: number }[] = [];
  private emberG = new Graphics();
  private featureG = new Graphics();
  constructor(private app: Application, readonly zone: Zone, look: Look, private onEnterShop: () => void, private hooks: WorldHooks, hp = PLAYER_MAX_HP, opts: { realm?: Realm; bossDown?: boolean; chaser?: { monster: boolean; hp: number } | null } = {}) {
    this.realm = opts.realm ?? (zone.hell ? 'hell' : 'real');
    this.bossDown = !!opts.bossDown;
    this.objects.sortableChildren = true;
    this.camera.addChild(this.ground, this.fxLayer, this.objects);
    this.fxLayer.eventMode = 'none';
    this.root.addChild(this.camera, this.overlay, this.lights, this.emberG, this.danger);
    this.emberG.eventMode = 'none';
    this.lights.eventMode = 'none';
    this.overlay.eventMode = 'none';
    this.danger.eventMode = 'none';
    zone.buildings.forEach((b, k) => {
      const key = `${Math.floor(b.i0 / CHUNK)},${Math.floor(b.j0 / CHUNK)}`;
      const list = this.bIndex.get(key);
      if (list) list.push(k); else this.bIndex.set(key, [k]);
    });
    this.placeProps();
    if (!zone.hell && !zone.interior) {
      const dec = decorOf(zone);
      for (const p of dec.props) { const key = `${Math.floor(p.i / CHUNK)},${Math.floor(p.j / CHUNK)}`; (this.dIndex.get(key) ?? this.dIndex.set(key, []).get(key)!).push(p); }
      for (const w of dec.wires) { const key = `${Math.floor(w[0] / CHUNK)},${Math.floor(w[1] / CHUNK)}`; (this.wIndex.get(key) ?? this.wIndex.set(key, []).get(key)!).push(w); }
    }
    this.spawnPlayer(look, hp);
    if (this.zone.hell) this.setupHell();
    else if (this.zone.interior) this.setupInterior(opts.chaser ?? null);
    else {
      for (let n = 0; n < PED_COUNT; n++) this.spawnNpc('passer');
      for (let n = 0; n < THUG_COUNT; n++) this.spawnNpc('thug');
    }
    if (this.realm === 'ghost') {
      // 귀신: 세상이 잿빛으로. 돌아다니기만 하고 우주새 말고는 아무것도 만질 수 없다
      const cm = new ColorMatrixFilter();
      cm.desaturate();
      this.camera.filters = [cm];
      this.player.sprite.alpha = 0.6;
    }
    this.spawnCars();
    this.root.eventMode = 'static';
    this.root.hitArea = this.app.screen;
    this.root.on('pointerdown', (e) => {
      sfx.unlockAudio();
      this.skipTap = false;
      this.press = { id: e.pointerId, x: e.global.x, y: e.global.y, sx: e.global.x, sy: e.global.y, t0: this.time, hold: false, next: 0 };
    });
    this.root.on('globalpointermove', (e) => {
      const pr = this.press;
      if (pr && pr.id === e.pointerId) { pr.x = e.global.x; pr.y = e.global.y; }
      if (e.pointerType === 'mouse') this.onHover(e.global.x, e.global.y);
    });
    const up = (e: { pointerId: number }) => { if (this.press?.id === e.pointerId) this.press = null; };
    this.root.on('pointerup', up);
    this.root.on('pointerupoutside', up);
    this.root.on('pointertap', (e) => {
      if (this.skipTap) { this.skipTap = false; return; }
      this.onTap(e.global.x, e.global.y, e.ctrlKey || e.metaKey || e.shiftKey);
    });
    this.labelText.anchor.set(0.5, 1);
    this.label.addChild(this.labelBg, this.labelText);
    this.label.visible = false;
    this.label.alpha = 0.62; // 이름표는 반투명 (뒤의 길·사람이 비쳐 보이게)
    this.label.eventMode = 'none';
    this.label.zIndex = 1e6;
    this.bars.zIndex = 1e6 - 1;
    this.door.zIndex = 1e6 - 3;
    this.door.visible = false;
    this.talkIcon.zIndex = 1e6 - 3;
    this.talkIcon.visible = false;
    this.sparkG.zIndex = 1e6 - 2;
    this.sparkG.eventMode = 'none';
    this.objects.addChild(this.label, this.bars, this.door, this.talkIcon, this.sparkG);
    this.update(0);
    this.stream(true);
  }

  // ───────────────────────── 소품 · 바닥 · 건물 불러오기 ─────────────────────────
  private placeProps() {
    if (this.zone.hell) { this.placeHellProps(); return; }
    for (const p of this.zone.props) {
      const pt = propSprite(p.kind, (p.i * 7 + p.j * 3) % 3);
      if (!pt) continue;
      const s = new Sprite(pt.tex);
      const [x, y] = iso(p.i + 0.5, p.j + 0.5);
      s.anchor.set(pt.ax, pt.ay);
      s.position.set(x, y);
      s.zIndex = p.i + p.j + 0.99;
      this.objects.addChild(s);
      if (p.kind === 'pillar' || p.kind === 'lamp' || p.kind === 'tree') {
        const w = s.width, h = s.height, x0 = x - w * pt.ax, y0 = y - h * pt.ay;
        this.addTall(s, x0, y0, x0 + w, y0 + h);
      }
      if (p.kind === 'lamp') {
        const glow = new Sprite(this.glowTex());
        glow.anchor.set(0.5);
        glow.position.set(x + 19, y - 136);
        glow.blendMode = 'add';
        this.lights.addChild(glow);
        this.glows.push({ s: glow, i: p.i, j: p.j });
      }
    }
    this.placeDeck();
  }

  /** 지옥: 마른 나무 · 화로(늘 타는 불빛) · 부러진 돌기둥 */
  private placeHellProps() {
    const theme = floorDef(this.zone.hell!.floor).theme;
    for (const p of this.zone.props) {
      const v = (p.i * 7 + p.j * 3) % 4;
      if (p.kind === 'fence') {
        const fp = streetProp('fence', v, p.o ?? 0, false, true);
        const ft = Texture.from(fp.canvas);
        ft.source.scaleMode = 'nearest';
        const fs = new Sprite(ft);
        const [fx, fy] = iso(p.i + 0.5, p.j + 0.5);
        fs.anchor.set(fp.ax, fp.ay);
        fs.position.set(fx, fy);
        fs.zIndex = p.i + p.j + 0.99;
        this.objects.addChild(fs);
        continue;
      }
      const own = p.kind === 'tree' || p.kind === 'lamp' || p.kind === 'pillar';
      const pt = own ? null : propSprite(p.kind, v % 3);
      if (!own && !pt) continue;
      const hp = own ? hellProp(p.kind, theme, v) : { canvas: null, ax: pt!.ax, ay: pt!.ay, glow: undefined as [number, number] | undefined };
      let tex: Texture;
      if (hp.canvas) { tex = Texture.from(hp.canvas); tex.source.scaleMode = 'nearest'; } else tex = pt!.tex;
      const s = new Sprite(tex);
      const [x, y] = iso(p.i + 0.5, p.j + 0.5);
      s.anchor.set(hp.ax, hp.ay);
      s.position.set(x, y);
      s.zIndex = p.i + p.j + 0.99;
      this.objects.addChild(s);
      if (p.kind !== 'lamp') {
        const w = s.width, h = s.height, x0 = x - w * hp.ax, y0 = y - h * hp.ay;
        this.addTall(s, x0, y0, x0 + w, y0 + h);
      }
      if (hp.glow) {
        const glow = new Sprite(this.glowTex());
        glow.anchor.set(0.5);
        glow.scale.set(0.75);
        glow.tint = 0xff7a32;
        glow.position.set(x + hp.glow[0], y + hp.glow[1]);
        glow.blendMode = 'add';
        this.lights.addChild(glow);
        this.glows.push({ s: glow, i: p.i, j: p.j });
      }
    }
  }

  // BTS 고가 상판: 같은 줄의 다음 기둥까지 한 칸씩 이어 붙인다 (선로는 +i 방향).
  // 선로가 휘어 j가 조금씩 바뀌는 구간은 계단처럼 보이지 않도록 상판 그림을 기울여(전단 변환) 매끈하게 잇는다.
  private placeDeck() {
    const deck = propSprite('deck', 0);
    if (!deck) return;
    const H = 196; // 상판 가운데선의 화면 높이 (픽셀) — 여기를 기준으로 기울인다
    const ps = this.zone.props.filter((p) => p.kind === 'pillar');
    for (const p of ps) {
      let best: { i: number; j: number } | null = null;
      for (const q of ps) {
        const di = q.i - p.i;
        if (di <= 0 || di > 20 || Math.abs(q.j - p.j) > 5) continue;
        if (!best || di < best.i - p.i) best = q;
      }
      if (!best) continue;
      const n = best.i - p.i;
      const sl = (best.j - p.j) / n; // 한 칸 갈 때 j 변화
      for (let k = 0; k < n; k++) {
        const fi = p.i + k;
        const fj = p.j + sl * k;
        const [x, y] = iso(fi + 0.5, fj + 0.5);
        const s = new Sprite(deck.tex);
        s.anchor.set(deck.ax, deck.ay);
        s.position.set(0, H);
        const c = new Container();
        c.addChild(s);
        // (16,8) → (16-16s, 8+8s), (-16,8) → 그대로
        const m = new Matrix(1 - sl / 2, sl / 4, -sl, 1 + sl / 2, Math.round(x), Math.round(y) - H);
        c.setFromMatrix(m);
        c.zIndex = fi + Math.round(fj) + 0.995;
        this.objects.addChild(c);
        // 기울인 상판의 화면 상자 (네 모서리를 변환해서 구한다)
        const w = s.width, h = s.height, lx = -w * deck.ax, ly = H - h * deck.ay;
        const xs: number[] = [], ys: number[] = [];
        for (const [u, v] of [[lx, ly], [lx + w, ly], [lx, ly + h], [lx + w, ly + h]]) { xs.push(m.a * u + m.c * v + m.tx); ys.push(m.b * u + m.d * v + m.ty); }
        this.addTall(c, Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys));
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
    if (this.zone.interior) return; // 방은 처음에 한 장으로 다 그린다
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
          const ch = this.zone.hell ? drawHellGround(this.zone, floorDef(this.zone.hell.floor).theme, ci * CHUNK, cj * CHUNK) : kitOk ? drawGroundKit(this.zone, ci * CHUNK, cj * CHUNK) : drawGroundChunk(this.zone, ci * CHUNK, cj * CHUNK);
          const s = new Sprite(ch ? tex(ch.canvas) : Texture.EMPTY);
          if (ch) s.position.set(ch.x, ch.y);
          this.ground.addChild(s);
          this.chunks.set(key, s);
        }
      }
    for (const [key, s] of this.chunks) if (!want.has(key)) { s.destroy({ texture: s.texture !== Texture.EMPTY, textureSource: s.texture !== Texture.EMPTY }); this.chunks.delete(key); }
    for (const key of want) if (!this.dViews.has(key) && (this.dIndex.has(key) || this.wIndex.has(key))) this.dViews.set(key, this.makeDecor(key));
    for (const [key, v] of this.dViews) if (!want.has(key)) { for (const s of v.sprites) s.destroy(); v.wires?.destroy(); this.dViews.delete(key); }
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

  private propTex = new Map<PropPic, Texture>();
  private makeDecor(key: string) {
    const sprites: Sprite[] = [];
    for (const p of this.dIndex.get(key) ?? []) {
      const v = Math.floor(((p.i * 7 + p.j * 13) % 17) % 6);
      const pp = streetProp(p.kind, v, p.o ?? 0);
      let tx = this.propTex.get(pp);
      if (!tx) { tx = Texture.from(pp.canvas); tx.source.scaleMode = 'nearest'; this.propTex.set(pp, tx); }
      const s = new Sprite(tx);
      const [x, y] = iso(p.i + 0.5, p.j + 0.5);
      s.anchor.set(pp.ax, pp.ay);
      s.position.set(x, y);
      s.zIndex = p.i + p.j + 0.98;
      s.eventMode = 'none';
      this.objects.addChild(s);
      sprites.push(s);
    }
    // 전선: 전봇대 꼭대기끼리 처지게 세 가닥 (사람·건물 위로 지나간다)
    let wires: Graphics | null = null;
    const ws = this.wIndex.get(key);
    if (ws?.length) {
      wires = new Graphics();
      wires.eventMode = 'none';
      wires.zIndex = 9e5;
      for (const [a, b, c, d] of ws) {
        const [x0, y0] = iso(a + 0.5, b + 0.5), [x1, y1] = iso(c + 0.5, d + 0.5);
        for (let k = 0; k < 3; k++) {
          const sag = 10 + k * 5, oy = -106 + k * 4;
          wires.moveTo(x0 - 12 + k * 8, y0 + oy).quadraticCurveTo((x0 + x1) / 2, (y0 + y1) / 2 + oy + sag * 2, x1 - 12 + k * 8, y1 + oy);
        }
      }
      wires.stroke({ color: 0x1a1816, width: 1, alpha: 0.85 });
      this.objects.addChild(wires);
    }
    return { sprites, wires };
  }

  /** 건물 간판 이름 */
  private nameOf(b: Building) {
    return b.cat === 'ujusae' ? '' : buildingName(b, lang());
  }

  /**
   * 건물을 세로 띠(32px)로 잘라 띠마다 앞뒤 순서를 따로 준다.
   * 건물 한 장에 순서 하나만 주면 넓은 건물 뒤를 걷는 사람이 지붕 위에 그려진다
   */
  /** 그림 한 장을 세로 띠로 잘라 띠마다 앞뒤 순서를 준다 (바닥 사각형 i0·j0·w·d 기준) */
  private strips(base: Texture, dx: number, dy: number, i0: number, j0: number, bw: number, bd: number, bias = -0.2): Sprite[] {
    const i1 = i0 + bw, j1 = j0 + bd;
    const cornerX = (i1 - j1) * (TW / 2);
    const key = (sx: number) => (sx < cornerX ? 2 * j1 + sx / (TW / 2) : 2 * i1 - sx / (TW / 2));
    const parts: Sprite[] = [];
    const W = base.source.width, H = base.source.height, SW = 32;
    for (let cx = 0; cx < W; cx += SW) {
      const w = Math.min(SW, W - cx);
      const s = new Sprite(new Texture({ source: base.source, frame: new Rectangle(cx, 0, w, H) }));
      s.position.set(dx + cx, dy);
      const a = dx + cx, z = dx + cx + w;
      s.zIndex = Math.min(key(a), key(z), a < cornerX && z > cornerX ? key(cornerX) : 1e9) + bias;
      this.objects.addChild(s);
      parts.push(s);
    }
    return parts;
  }

  private makeBuilding(b: Building): BView {
    const hellTheme = this.zone.hell ? floorDef(this.zone.hell.floor).theme : null;
    const d = b.cat === 'ujusae' ? drawCosmicBird(b, this.night === 1) : hellTheme ? drawHellStructure(b, hellTheme, true) : kitOk ? drawBuildingKit(b, this.nameOf(b), this.night === 1, this.low) : drawBuilding(b, this.nameOf(b), this.night === 1);
    const base = tex(d.canvas);
    const W = d.canvas.width, H = d.canvas.height;
    const parts = this.strips(base, d.x, d.y, b.i0, b.j0, b.w, b.d);
    const top = b.cat === 'ujusae' ? COSMIC_TOP : hellTheme ? b.h : kitOk ? buildingTop(b, this.low) : buildingHeight(b.h);
    const [lx] = iso(b.i0 + b.w / 2, b.j0 + b.d / 2);
    const id = d.canvas.getContext('2d')!.getImageData(0, 0, W, H).data;
    const alpha = new Uint8Array(W * H);
    for (let k = 0; k < alpha.length; k++) alpha[k] = id[k * 4 + 3] > 0 ? 1 : 0;
    return { parts, base, x: d.x, y: d.y, w: W, h: H, top, lx, ly: (b.i0 + b.j0) * (TH / 2) - top + 4, alpha, b };
  }

  private dropBuilding(v: BView) {
    for (const s of v.parts) s.destroy({ texture: true });
    v.base.destroy(true);
    this.dropGhost(v);
  }
  private dropGhost(v: BView) {
    if (!v.ghost) return;
    for (const s of v.ghost.parts) s.destroy({ texture: true });
    v.ghost.base.destroy(true);
    v.ghost = undefined;
  }

  /**
   * 건물은 처음부터 낮게(1층+옥상 난간) 그린다. 가까이 다가가면 원래 높이의 모습이 희미하게 겹쳐 보인다
   * (2.5칸 안 = 가장 진하게 30%, 5칸 밖 = 사라짐). 희미한 모습은 필요할 때만 그리고 멀어지면 버린다
   */
  private updateGhosts(px: number, py: number, dt: number) {
    const on = this.low && !this.zone.hell && !this.zone.interior && kitOk;
    for (const v of this.bViews.values()) {
      const b = v.b;
      let want = 0;
      if (on && b.cat !== 'ujusae' && upperFloors(b) > 0) {
        const dx = Math.max(b.i0 - px, 0, px - (b.i0 + b.w)), dy = Math.max(b.j0 - py, 0, py - (b.j0 + b.d));
        const dist = Math.hypot(dx, dy);
        want = dist < 1.5 ? 0.15 : dist < 3.5 ? (0.15 * (3.5 - dist)) / 2 : 0;
      }
      if (want > 0 && !v.ghost) {
        const d = drawBuildingKit(b, this.nameOf(b), this.night === 1, false);
        const base = tex(d.canvas);
        v.ghost = { parts: this.strips(base, d.x, d.y, b.i0, b.j0, b.w, b.d, -0.19), base, a: 0 };
      }
      if (!v.ghost) continue;
      const g = v.ghost;
      g.a += Math.sign(want - g.a) * Math.min(Math.abs(want - g.a), dt * 0.9);
      if (g.a <= 0.001 && want === 0) { this.dropGhost(v); continue; }
      for (const s of g.parts) s.alpha = g.a;
    }
  }

  /** 건물 낮추기: 처음부터 낮게 (단추로 원래 높이로 되돌릴 수 있다) */
  low = (() => { try { return localStorage.getItem('heavensmanual.lowb') !== '0'; } catch { return true; } })();
  setLowBuildings(v: boolean) {
    if (v === this.low) return;
    this.low = v;
    try { localStorage.setItem('heavensmanual.lowb', v ? '1' : '0'); } catch { /* 그만 */ }
    this.clearBuildings();
    this.stream(true);
  }

  private clearBuildings() {
    for (const v of this.bViews.values()) this.dropBuilding(v);
    this.bViews.clear();
  }

  // ───────────────────────── 사람 ─────────────────────────
  private makeWalker(look: Look, i: number, j: number, kind: Walker['kind'], weapon: string | null = null, armor: string[] = []): Walker {
    const sprite = new Sprite();
    sprite.visible = false;
    this.objects.addChild(sprite);
    const isPlayer = kind === 'player';
    const maxHp = isPlayer ? PLAYER_MAX_HP : kind === 'suturer' ? 700 : kind === 'thug' ? 220 : kind === 'remote' ? 1 : 120;
    const dirs: Dir[] = ['se', 'sw', 'ne', 'nw'];
    const w: Walker = {
      x: i + 0.5, y: j + 0.5, path: [], speed: isPlayer ? 2.3 : kind === 'suturer' ? 1.55 : kind === 'thug' ? 0.9 : 0.75 + Math.random() * 0.35, cs: null, look, weapon, armor, dressId: 0, sprite,
      dir: dirs[Math.floor(Math.random() * 4)], anim: 0, act: null, pend: null, wait: Math.random() * 3, isPlayer, kind,
      hp: maxHp, maxHp, down: 0, target: null, atkT: 0, firstBy: null, flee: 0, hurtT: 0, barT: 0, repathT: 0, home: [i, j], bubbleT: 0,
    };
    this.dress(w, look, weapon, armor);
    return w;
  }

  /** 옷·무기가 바뀌면 그림을 새로 합친다 (불러오는 동안은 이전 그림 유지) */
  private dress(w: Walker, look: Look, weapon: string | null, armor: string[] = w.armor ?? []) {
    w.look = look;
    w.weapon = weapon;
    w.armor = armor;
    const id = (w.dressId = ++this.dressSeq);
    charSet(look, weapon, armor).then((cs) => {
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

  /** 봉합자: 죄를 지은 사람(빨간 표시) 근처에 나타나 쫓아온다 */
  private spawnSuturer() {
    const p = this.player;
    let spot: [number, number] | null = null;
    for (let n = 0; n < 8 && !spot; n++) {
      const s = randomWalkTileNear(this.zone, Math.floor(p.x), Math.floor(p.y), 18, ['walk', 'soi', 'cross', 'lot']);
      if (s && Math.hypot(s[0] - p.x, s[1] - p.y) > 10) spot = s;
    }
    if (!spot) return;
    const s = this.makeWalker({ sex: 'm', build: 1, skin: 0, hair: 0, hairColor: 0, top: 0, bottom: 0, outfit: 'suturer' }, spot[0], spot[1], 'suturer', 'needle');
    s.target = p;
    s.firstBy = s;
    this.walkers.push(s);
    this.bubble(s, t().suturerLines[Math.floor(Math.random() * 3)]);
  }
  /** 체력이 절반 아래로 떨어진 봉합자는 실밥이 터지며 괴물로 변한다 */
  private transform(w: Walker) {
    w.monster = true;
    w.speed = 2.0;
    w.act = null;
    this.dress(w, { ...w.look, outfit: 'stitched' }, 'needle', []);
    this.bubble(w, t().stitchBurst);
  }
  private removeWalker(w: Walker) {
    const k = this.walkers.indexOf(w);
    if (k >= 0) this.walkers.splice(k, 1);
    w.bubble?.destroy();
    w.sprite.destroy();
    for (const o of this.walkers) if (o.target === w) o.target = null;
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

  // ───────────────────────── 건물 안 ─────────────────────────
  private clerkW: Walker | null = null;
  private leaving = false;
  /** 빨간 표시(먼저 공격한 죄)가 남은 시간 — 건물 안팎을 오갈 때 이어진다 */
  get crimeT() {
    return this.criminalT;
  }
  set crimeT(v: number) {
    this.criminalT = v;
  }
  private chaserDue: { t: number; monster: boolean; hp: number; w?: Walker; stay?: number } | null = null;
  private setupInterior(chaser: { monster: boolean; hp: number } | null) {
    const info = this.zone.interior!;
    const room = drawRoom(this.zone, false);
    const rs = new Sprite(tex(room.canvas));
    rs.position.set(room.x, room.y);
    this.ground.addChild(rs);
    for (const f of info.furn) {
      const d = drawFurn(f, info, false);
      this.strips(tex(d.canvas), d.x, d.y, f.i, f.j, f.w, f.d, f.h <= 2 ? -40 : -0.2);
    }
    if (info.clerk) {
      const w = this.makeWalker(clerkLook(info.kind, info.from.b), info.clerk.i, info.clerk.j, 'clerk');
      w.dir = 'sw';
      w.wait = 1e9;
      this.walkers.push(w);
      this.clerkW = w;
    }
    const seats = info.seats.slice();
    const n = Math.min(seats.length, info.rest ? 2 : 3, 1 + (info.from.b % 3));
    for (let k = 0; k < n; k++) {
      const [i, j] = seats.splice((info.from.b * 7 + k * 3) % seats.length, 1)[0];
      const w = this.makeWalker(this.npcLook('passer'), i, j, 'passer');
      w.wait = 6 + Math.random() * 20;
      this.walkers.push(w);
    }
    if (chaser) this.chaserDue = { t: 2.5, ...chaser };
  }

  /** 방: 쫓아오던 봉합자가 문으로 들어온다 (쉬는 곳이면 문턱에서 멈췄다가 돌아간다) · 나가는 매트 */
  private updateInterior(dt: number) {
    const info = this.zone.interior!;
    const p = this.player;
    const ch = this.chaserDue;
    if (ch) {
      if (!ch.w) {
        ch.t -= dt;
        if (ch.t <= 0) {
          const s = this.makeWalker({ sex: 'm', build: 1, skin: 0, hair: 0, hairColor: 0, top: 0, bottom: 0, outfit: ch.monster ? 'stitched' : 'suturer' }, info.exit.i, info.exit.j, 'suturer', 'needle');
          s.hp = Math.max(1, ch.hp);
          if (ch.monster) { s.monster = true; s.speed = 2.0; }
          s.dir = 'ne';
          this.walkers.push(s);
          ch.w = s;
          if (info.rest) { ch.stay = 8; s.target = null; this.bubble(s, t().suturerSanctuary); }
          else { s.target = p; s.firstBy = s; this.bubble(s, t().suturerFollow); }
        }
      } else if (ch.stay !== undefined) {
        ch.stay -= dt;
        ch.w.path = [];
        if (ch.stay <= 0) { this.removeWalker(ch.w); this.chaserDue = null; }
      } else if (ch.w.sprite.destroyed || ch.w.down > 0) this.chaserDue = null;
    }
    if (!this.leaving && !this.dead && !p.path.length && Math.floor(p.x) === info.exit.i && Math.floor(p.y) === info.exit.j && this.time > 0.6) {
      this.cancelActs();
      this.leaving = true;
      setTimeout(() => this.hooks.leaveBuilding(), 0); // 이 장면의 틱이 끝난 뒤에 버린다
    }
  }
  /** 방에서 나갈 때 아직 쫓고 있는 봉합자 (밖으로 따라 나온다) */
  chaserLeft(): { monster: boolean; hp: number } | null {
    const w = this.chaserDue?.w;
    if (!w || w.sprite.destroyed || w.down > 0 || this.chaserDue?.stay !== undefined || w.giveUp) return null;
    return { monster: !!w.monster, hp: w.hp };
  }
  /** 거리: 들어가는 순간 쫓아오던 봉합자 (8칸 안) → 방으로 따라 들어온다 */
  takeChaser(): { monster: boolean; hp: number } | null {
    const p = this.player;
    const s = this.walkers.find((w) => w.kind === 'suturer' && w.target === p && w.down <= 0 && !w.giveUp && Math.hypot(w.x - p.x, w.y - p.y) < 8);
    if (!s) return null;
    this.removeWalker(s);
    return { monster: !!s.monster, hp: s.hp };
  }
  /** 거리로 돌아왔을 때 따라 나오는 봉합자 */
  releaseChaser(c: { monster: boolean; hp: number }) {
    const d = this.zone.door;
    void d;
    const p = this.player;
    const s = this.makeWalker({ sex: 'm', build: 1, skin: 0, hair: 0, hairColor: 0, top: 0, bottom: 0, outfit: c.monster ? 'stitched' : 'suturer' }, Math.floor(p.x), Math.floor(p.y), 'suturer', 'needle');
    s.hp = c.hp;
    if (c.monster) { s.monster = true; s.speed = 2.0; }
    s.target = p;
    s.firstBy = s;
    s.x = p.x + 0.6;
    this.walkers.push(s);
    this.suturerT = 300;
  }

  // ───────────────────────── 지옥 ─────────────────────────
  /** 지옥 층: 괴물을 풀고, 층주를 세우고, 계단·파샤르를 놓는다 */
  private setupHell() {
    const h = this.zone.hell!;
    const n = h.floor === 1 ? 10 : 12;
    for (let k = 0; k < n; k++) this.spawnMonster();
    if (!this.bossDown) this.spawnBoss();
    if (h.pashar) {
      const look: Look = { sex: 'm', build: 1, skin: 0, hair: 0, hairColor: 0, top: 0, bottom: 0, outfit: 'suturer', cols: { 1: '#7a2a2a', 3: '#1a1216', 4: '#120c0e', 5: '#0a0808', 10: '#c9a23e', 15: '#0a0808', 6: '#ff4a2a' } };
      const pw = this.makeWalker(look, h.pashar.i, h.pashar.j, 'pashar', 'needle');
      pw.dir = 'sw';
      pw.wait = 1e9;
      this.walkers.push(pw);
    }
    this.featureG.zIndex = 0;
    this.objects.addChild(this.featureG);
    this.drawFeatures();
  }

  /** 계단 그림: 올라가는 돌계단(빛) · 내려가는 구덩이(붉은 빛) */
  private drawFeatures() {
    const h = this.zone.hell;
    if (!h) return;
    const g = this.featureG;
    g.clear();
    // 올라가는 계단 (층주가 쓰러지기 전에는 사슬로 막혀 있다)
    {
      const [x, y] = iso(h.up.i + 0.5, h.up.j + 0.5);
      for (let k = 0; k < 5; k++) {
        const yy = y - k * 7, w = 30 - k * 3;
        g.poly([x - w, yy, x, yy - w / 2, x + w, yy, x, yy + w / 2]).fill(k % 2 ? 0x5a524c : 0x6a625a).stroke({ color: 0x2a2420, width: 1 });
      }
      if (this.bossDown || h.floor === 1 && this.bossDown) g.ellipse(x, y - 40, 10, 26).fill({ color: 0xfff1c4, alpha: 0.35 });
      if (!this.bossDown) for (let k = -1; k <= 1; k += 2) g.moveTo(x - 24, y - 14 + k * 4).lineTo(x + 24, y - 14 - k * 4).stroke({ color: 0x8a8a8a, width: 2 });
    }
    // 내려가는 구덩이
    {
      const [x, y] = iso(h.down.i + 0.5, h.down.j + 0.5);
      g.ellipse(x, y, 34, 17).fill(0x1a0806).stroke({ color: 0x4a1a10, width: 3 });
      g.ellipse(x, y + 2, 26, 12).fill(0x050202);
      g.ellipse(x, y + 4, 14, 6).fill({ color: 0xc23a18, alpha: 0.55 });
    }
    g.zIndex = 0.5;
  }

  /** 층마다 일반 괴물 3종 중 하나를 내 둘레(휴식 공간 밖)에 세운다 */
  private spawnMonster(existing?: Walker) {
    const h = this.zone.hell!;
    const p = this.player;
    const def = floorDef(h.floor);
    const near = h.spawns.filter(([i, j]) => { const d = Math.hypot(i - p.x, j - p.y); return d > 10 && d < 30; });
    const pool = near.length ? near : h.spawns;
    const [i, j] = pool[Math.floor(Math.random() * pool.length)];
    const m = MONSTERS[def.monsters[Math.floor(Math.random() * def.monsters.length)]];
    if (existing) this.removeWalker(existing);
    this.walkers.push(this.makeMonster(m, i, j));
  }
  private spawnBoss() {
    const h = this.zone.hell!;
    const m = MONSTERS[floorDef(h.floor).boss];
    const b = this.makeMonster(m, h.boss.i, h.boss.j);
    this.walkers.push(b);
  }
  private makeMonster(m: MonsterDef, i: number, j: number): Walker {
    const look: Look = { sex: 'm', build: 1, skin: 0, hair: 0, hairColor: 0, top: 0, bottom: 0, outfit: m.body, cols: { 1: m.skin, 3: m.cloth, 4: m.cloth, 5: '#1a1410', 6: m.glow, 9: m.cloth, 10: m.skin, 12: m.glow, 13: '#4a3422', 14: '#c9a23e', 15: '#140e0c' } };
    const w = this.makeWalker(look, i, j, 'monster', m.weapon === undefined ? null : m.weapon ?? null);
    const f = this.zone.hell!.floor;
    w.mdef = m;
    w.size = m.scale;
    w.maxHp = w.hp = Math.round(m.hp * (1 + 0.35 * (f - 1) * (m.boss ? 0 : 1)));
    w.speed = m.speed;
    w.voice = 0.8 + Math.random() * 0.3;
    return w;
  }
  /** 휴식 공간 안인가 (싸움 불가, 괴물은 못 들어옴) */
  private inRest(x: number, y: number) {
    const r = this.zone.hell?.rest;
    return !!r && Math.abs(x - (r.i + 0.5)) < r.r && Math.abs(y - (r.j + 0.5)) < r.r;
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
    this.dress(this.player, look, this.gear.weapon, this.gear.armor);
  }
  setGear(g: Gear) {
    const changed = g.weapon !== this.gear.weapon || g.armor.join() !== this.gear.armor.join();
    this.gear = g;
    if (changed && this.player) this.dress(this.player, this.player.look, g.weapon, g.armor);
  }
  /** 영혼의 스탯: 생명력 → 최대 체력, 힘 → 피해, 민첩 → 피하기, 신앙 → 치명타·회복 */
  setStats(s: Stats) {
    this.stats = s;
    const p = this.player;
    const max = maxHpFor(s.vit);
    if (p.maxHp !== max) { p.hp = Math.round((p.hp / p.maxHp) * max); p.maxHp = max; this.hooks.hp(p.hp, p.maxHp); }
  }
  setStance(s: Stance) {
    this.stance = s;
  }
  /** 실시간: 내 위치 (다른 사람에게 보낼 것) */
  netPos(): NetPos {
    const p = this.player;
    return {
      x: Math.round(p.x * 100) / 100, y: Math.round(p.y * 100) / 100, d: p.dir, m: p.path.length ? 1 : 0,
      a: p.act && p.act.anim !== 'fall' ? p.act.anim : undefined,
      h: Math.round((p.hp / p.maxHp) * 100) / 100,
      c: this.criminalT > 0 ? 1 : undefined,
      k: this.dead ? 1 : undefined,
    };
  }
  /** 실시간: 다른 사람 나타남·움직임 */
  upsertRemote(id: string, info: RemoteInfo | null, pos: NetPos | null) {
    let r = this.walkers.find((w) => w.rid === id);
    if (!r) {
      if (!info || !pos) return;
      r = this.makeWalker(info.look, Math.floor(pos.x), Math.floor(pos.y), 'remote', info.weapon, info.armor);
      r.x = pos.x; r.y = pos.y; r.rid = id; r.rinfo = info; r.rpos = pos;
      this.walkers.push(r);
      return;
    }
    if (info && JSON.stringify(info) !== JSON.stringify(r.rinfo)) { r.rinfo = info; this.dress(r, info.look, info.weapon, info.armor); }
    if (pos) {
      if (pos.a && pos.a !== r.rpos?.a) r.act = { anim: pos.a, t: 0 };
      if (pos.h !== undefined && pos.h < (r.rpos?.h ?? 1)) r.barT = 5;
      r.rpos = pos;
      r.hp = pos.h ?? 1;
      r.maxHp = 1;
      r.down = pos.k ? 999 : 0;
      r.lingerT = undefined;
      if (Math.hypot(pos.x - r.x, pos.y - r.y) > 6) { r.x = pos.x; r.y = pos.y; }
    }
  }

  // ───────────────────────── 사람끼리 싸움 (PvP) ─────────────────────────
  /** 우주새 문 근처는 싸울 수 없다 (다시 태어나는 자리) */
  /** 빨간 표시가 새로 붙을 때: 봉합자는 가끔만 온다 (35%, 20~60초 뒤, 한 번 다녀가면 5분은 쉼) */
  private markCrime() {
    const fresh = this.criminalT <= 0;
    this.criminalT = 180;
    if (fresh && this.sutDue < 0 && this.suturerT <= 0 && !this.zone.hell && Math.random() < 0.35) this.sutDue = 20 + Math.random() * 40;
  }
  /** 빨리 회복하는 자리 */
  private restAt(x: number, y: number) {
    if (this.zone.interior) return !!this.zone.interior.rest;
    return this.safeAt(x, y);
  }
  private safeAt(x: number, y: number) {
    if (this.zone.hell) return this.inRest(x, y);
    if (this.zone.interior) return !!this.zone.interior.rest;
    return Math.hypot(x - (this.zone.door.i + 0.5), y - (this.zone.door.j + 0.5)) < 5;
  }
  /** 최근 60초 안에 나를 먼저 때린 사람 */
  private attackedBy = new Map<string, number>();
  private recentAttacker(id?: string) {
    return !!id && (this.attackedBy.get(id) ?? -1e9) > this.time - 60;
  }
  /** 내가 먼저 때린 사람 (그 사람에게는 이미 선공 악행을 받았다) */
  private struckFirst = new Set<string>();
  /** 다른 사람이 나를 때렸다 */
  pvpHit(fromId: string, dmg: number, crit: boolean, kind: string) {
    const p = this.player;
    if (this.dead || this.safeAt(p.x, p.y)) return;
    const from = this.walkers.find((w) => w.rid === fromId);
    if (!this.struckFirst.has(fromId)) this.attackedBy.set(fromId, this.time);
    this.lastHitBy = fromId;
    dmg = Math.max(1, Math.round(dmg) - this.gear.def);
    if (from) {
      this.hit(from, p, dmg, crit, (['fist', 'blunt', 'blade', 'gun'].includes(kind) ? kind : 'fist') as sfx.HitKind);
      // 공격 태세가 '적대'나 '모두'면 바로 반격
      if (!p.target && this.stance !== 'talk' && !this.working?.on) p.target = from;
    } else {
      p.hp -= dmg;
      p.hurtT = 0.18;
      this.combatT = 0;
      this.hooks.hp(Math.max(0, p.hp), p.maxHp);
      if (p.hp <= 0) this.die('beaten');
    }
  }
  /** 누군가 다른 사람에게 쓰러졌다 (나에게 쓰러졌으면 돈이 떨어지고 행위가 기록된다) */
  pvpDown(victimId: string, byId: string, cash: number, wasCriminal: boolean) {
    const v = this.walkers.find((w) => w.rid === victimId);
    if (v) { v.down = 999; v.act = { anim: 'fall', t: 0 }; sfx.thud(this.spotOf(v)); }
    if (byId !== this.myNetId) return;
    if (this.player.target === v) this.player.target = null;
    if (wasCriminal) this.hooks.deed('criminalUserDown');
    else if (this.recentAttacker(victimId) && !this.struckFirst.has(victimId)) this.hooks.deed('counterWin');
    else this.hooks.deed('murder');
    if (cash > 0 && v) this.dropCoin(v.x, v.y, cash, !wasCriminal && this.struckFirst.has(victimId));
  }
  myNetId = '';
  private lastHitBy: string | null = null;
  removeRemote(id: string) {
    const k = this.walkers.findIndex((w) => w.rid === id);
    if (k < 0) return;
    const r = this.walkers[k];
    // 싸우다 나가면 몸이 30초 남는다 (그동안 맞으면 쓰러진다 — 지금은 이 기기 안에서만)
    const fighting = this.recentAttacker(id) || this.struckFirst.has(id) || this.player.target === r || r.rpos?.c;
    if (fighting && r.down <= 0 && !r.lingerT) { r.lingerT = 30; r.rpos = undefined; r.path = []; return; }
    r.sprite.destroy();
    this.walkers.splice(k, 1);
  }
  /** 먹거나 붕대를 감아 체력을 채운다 */
  heal(n: number) {
    const p = this.player;
    p.hp = Math.min(p.maxHp, p.hp + n);
    this.float(p, t().healed, '#8fe08a');
    this.hooks.hp(p.hp, p.maxHp);
  }
  setInsets(right: number, bottom: number) {
    this.insets = { right, bottom };
  }
  turnPlayer() {
    this.player.dir = turnedDir(this.player.dir);
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

  /** 지옥에 떨어지거나 층을 옮길 때: 이 자리(휴식처·계단)에서 일어선다 */
  placeNear(i: number, j: number, hp?: number) {
    const p = this.player;
    const to = this.nearestWalkable(Math.floor(i), Math.floor(j)) ?? [Math.floor(i), Math.floor(j)];
    p.x = to[0] + 0.5;
    p.y = to[1] + 0.5;
    p.path = [];
    p.target = null;
    p.pend = null;
    p.act = null;
    p.dir = 'se';
    if (hp !== undefined) p.hp = hp;
    this.dead = false;
    this.wantShop = false;
    this.stopWork();
    this.hooks.hp(p.hp, p.maxHp);
  }

  /** 다른 세계·다른 층으로 옮겨 가면 이 장면은 버린다 */
  destroy() {
    this.stop();
    this.root.parent?.removeChild(this.root);
    this.root.destroy({ children: true });
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
    this.hoverFor = w ? { kind: 'w', w } : null;
    document.body.style.cursor = this.hoverFor || this.coinAt(gx, gy) || this.onDoorIcon(gx, gy) ? 'pointer' : '';
  }

  /** 출입 아이콘을 눌렀나 (손가락 크기를 생각해 넉넉하게) */
  private onDoorIcon(gx: number, gy: number) {
    if (!this.door.visible || this.doorFor === null) return false;
    const { wx, wy } = this.toWorld(gx, gy);
    return Math.hypot(wx - this.doorAt.x, wy - this.doorAt.y) < 20;
  }

  private onTap(gx: number, gy: number, force: boolean) {
    if (this.dead) return;
    const L = t();
    // 일하는 중이면: 어디를 누르든 일을 그만두고 가게에서 나온다
    if (this.working?.on) { this.stopWork(); return; }
    // 귀신: 사람·돈·가게는 만질 수 없다. 걷기와 우주새 문만
    if (this.realm === 'ghost') {
      if (this.onDoorIcon(gx, gy)) { this.interact(this.doorFor!); return; }
      const kb = this.buildingAt(gx, gy);
      if (kb !== null && this.zone.buildings[kb].cat === 'ujusae') {
        this.hooks.place(t().shopLabel, '');
        this.cancelActs();
        if (this.walkTo(this.zone.door.i, this.zone.door.j)) { this.rippleAt(this.zone.door.i, this.zone.door.j); return; }
      }
      this.cancelActs();
      this.moveToScreen(gx, gy);
      return;
    }
    // 1) 사람: 메뉴 (컨트롤·시프트를 누르고 누르면 바로 공격 = 강제 공격)
    const w = this.walkerAt(gx, gy);
    if (w && w.kind === 'remote' && w.rid && w.rinfo) {
      const hostile = this.recentAttacker(w.rid) || !!w.rpos?.c;
      if (w.down <= 0 && (force || this.stance === 'all' || (this.stance === 'hostile' && hostile))) { this.attack(w); return; }
      const [sx, sy] = iso(w.x, w.y);
      this.hooks.person(w.rid, w.rinfo, sx + this.camera.x, sy - 44 + this.camera.y, () => this.attack(w));
      return;
    }
    if (w && w.down <= 0 && w.kind === 'clerk' && !force) { this.showLabel({ kind: 'w', w }, 2); this.approachClerk(); return; }
    if (w && w.down <= 0) {
      // 공격 태세: 적대 대상만 / 모두
      const hostile = w.kind === 'thug' || w.kind === 'suturer' || w.target === this.player || (w.kind === 'remote' && (this.recentAttacker(w.rid) || !!w.rpos?.c));
      if (force || this.stance === 'all' || (this.stance === 'hostile' && hostile)) { this.attack(w); return; }
      this.showLabel({ kind: 'w', w }, 2);
      const [sx, sy] = iso(w.x, w.y);
      const opts: { label: string; danger?: boolean; act: () => void }[] = [];
      if (w.kind === 'thug' || w.kind === 'suturer' || w.mdef) opts.push({ label: L.act.attack, act: () => this.attack(w) });
      if (!w.mdef) opts.push({ label: L.act.talk, act: () => this.approach(w, 'talk') });
      opts.push({ label: L.act.look, act: () => this.approach(w, 'look') });
      if (w.kind === 'passer') opts.push({ label: L.act.force, danger: true, act: () => this.attack(w) });
      this.hooks.menu(this.npcName(w), this.npcSub(w), opts, sx + this.camera.x, sy - 44 + this.camera.y);
      return;
    }
    // 2) 출입 아이콘 (가게 문 앞에 서 있을 때만 뜬다) = 상호작용
    if (this.onDoorIcon(gx, gy)) { this.interact(this.doorFor!); return; }
    // 3) 떨어진 돈
    const c = this.coinAt(gx, gy);
    if (c) { this.cancelActs(); this.walkTo(Math.floor(c.x), Math.floor(c.y)); this.rippleAt(Math.floor(c.x), Math.floor(c.y)); return; }
    // 4) 건물: 메뉴 없이 이동만. 이름 있는 건물이면 위쪽에 이름이 잠깐 뜬다.
    //    손가락 아래 벽 밑동(앞쪽 보도)으로 걸어간다. 가게 문 근처면 문 앞으로 맞춰 준다 → 도착하면 출입 아이콘
    let kb = this.buildingAt(gx, gy);
    // 비쳐 보이는(앞을 가리는) 건물은 누를 수 없다: 그 너머의 땅을 누른 것
    if (kb !== null && this.bViews.get(kb)?.parts.some((s) => s.alpha < 1)) kb = null;
    if (kb !== null) {
      const b = this.zone.buildings[kb];
      const { wx } = this.toWorld(gx, gy);
      const isShop = b.cat === 'ujusae';
      if (isShop) this.hooks.place(t().shopLabel, '');
      else if (interactive(b)) { const n = this.nameOf(b); if (n) this.hooks.place(n, buildingSub(b, lang())); }
      this.cancelActs();
      let spot = this.baseSpot(b, wx);
      const door = isShop ? [this.zone.door.i, this.zone.door.j] as [number, number] : interactive(b) ? this.frontCached(kb) : null;
      if (door && (!spot || Math.hypot(spot[0] - door[0], spot[1] - door[1]) <= 3)) spot = door;
      if (spot && this.walkTo(spot[0], spot[1])) { this.rippleAt(spot[0], spot[1]); return; }
    }
    // 5) 땅 (지나가는 길의 사람·건물은 신경 쓰지 않는다)
    this.cancelActs();
    this.moveToScreen(gx, gy);
  }

  /** 화면 좌표의 땅으로 걸어간다 (못 가는 칸이면 가장 가까운 갈 수 있는 칸) */
  private moveToScreen(gx: number, gy: number, fx = true) {
    const { wx, wy } = this.toWorld(gx, gy);
    const x = (wx / (TW / 2) + wy / (TH / 2)) / 2, y = (wy / (TH / 2) - wx / (TW / 2)) / 2;
    const to = this.nearestWalkable(Math.floor(x), Math.floor(y));
    if (!to) return;
    if (this.walkTo(to[0], to[1]) && fx) this.rippleAt(to[0], to[1]);
  }

  private nearestWalkable(i: number, j: number): [number, number] | null {
    if (walkable(this.zone, i, j)) return [i, j];
    for (let r = 1; r <= 5; r++) {
      let best: [number, number] | null = null, bd = 1e9;
      for (let a = -r; a <= r; a++)
        for (let c = -r; c <= r; c++) {
          if (Math.max(Math.abs(a), Math.abs(c)) !== r || !walkable(this.zone, i + a, j + c)) continue;
          const d = a * a + c * c;
          if (d < bd) { bd = d; best = [i + a, j + c]; }
        }
      if (best) return best;
    }
    return null;
  }

  /** 건물 앞쪽(화면에 보이는 두 면) 밑동의 보도 중 손가락 가로 위치에 가장 가까운 칸 */
  private baseSpot(b: Building, wx: number): [number, number] | null {
    const i1 = b.i0 + b.w, j1 = b.j0 + b.d;
    let best: [number, number] | null = null, bd = 1e9;
    const test = (i: number, j: number) => {
      if (!walkable(this.zone, i, j)) return;
      const [sx] = iso(i + 0.5, j + 0.5);
      const d = Math.abs(sx - wx);
      if (d < bd) { bd = d; best = [i, j]; }
    };
    for (let i = b.i0 - 1; i <= i1; i++) test(i, j1);
    for (let j = b.j0 - 1; j < j1; j++) test(i1, j);
    return best;
  }

  private frontCached(k: number) {
    if (!this.fronts.has(k)) this.fronts.set(k, this.frontOf(this.zone.buildings[k]));
    return this.fronts.get(k)!;
  }

  /** 문 앞에서 아이콘을 눌렀을 때: 우주새는 들어가기, 가게는 사기·일하기 (하나뿐이면 바로) */
  private interact(k: number) {
    const L = t();
    if (this.realm === 'ghost' && k !== -1) return;
    if (k === -2) { this.hooks.hellAct('up'); return; }
    if (k === -3) { this.hooks.hellAct('down'); return; }
    if (k === -1 && this.zone.interior) { this.cancelActs(); this.walkTo(this.zone.interior.exit.i, this.zone.interior.exit.j); return; }
    if (k === -1) {
      this.cancelActs();
      this.walkTo(this.zone.door.i, this.zone.door.j);
      this.wantShop = true;
      return;
    }
    const b = this.zone.buildings[k];
    const opts: { label: string; act: () => void }[] = [];
    if (canEnter(b) && this.realm === 'real') opts.push({ label: L.goInside, act: () => this.goEnter(k) });
    else {
      const store = storeOf(b);
      if (store) opts.push({ label: L.enter, act: () => this.goStore(k, store) });
      if (hasBank(b)) opts.push({ label: L.bankGo, act: () => this.goStore(k, 'bank') });
    }
    if (canWork(b)) opts.push({ label: L.act.work.replace('{n}', String(WAGE_PER_HOUR)), act: () => this.goWork(k) });
    if (opts.length === 1) { opts[0].act(); return; }
    if (!opts.length) return;
    opts.push({ label: L.act.close, act: () => undefined });
    this.hooks.menu(this.nameOf(b), buildingSub(b, lang()), opts, this.doorAt.x + this.camera.x, this.doorAt.y + this.camera.y - 14);
  }

  private rippleAt(i: number, j: number) {
    const [x, y] = iso(i + 0.5, j + 0.5);
    this.ripple = { x, y, t: 0 };
  }

  private cancelActs() {
    this.hooks.away();
    this.player.target = null;
    this.pending = null;
    this.wantShop = false;
    this.storeWant = null;
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
    if (w.kind === 'pashar') { this.hooks.hellAct('pashar'); return; }
    if (w.kind === 'clerk') { this.hooks.clerk(); return; }
    const kind = w.kind as NpcKind;
    const r = w.hp / w.maxHp;
    if (w.mdef) {
      const cond = L.hpWords[r > 0.85 ? 0 : r > 0.5 ? 1 : r > 0.25 ? 2 : 3];
      this.hooks.say(this.npcName(w), `${L.monsterLook} ${cond}`);
      return;
    }
    if (pd.kind === 'look') {
      const cond = L.hpWords[r > 0.85 ? 0 : r > 0.5 ? 1 : r > 0.25 ? 2 : 3];
      this.hooks.say(this.npcName(w), `${kind === 'suturer' ? L.suturerLook : L.inspect[kind as 'passer' | 'thug']} ${cond}`);
      return;
    }
    const lines = kind === 'suturer' ? L.suturerLines : L.lines[kind as 'passer' | 'thug'];
    this.hooks.say(this.npcName(w), lines[Math.floor(Math.random() * lines.length)]);
    if (kind === 'thug' && Math.random() < 0.5) { w.target = this.player; w.firstBy ??= w; }
  }

  /** 직원 앞(카운터 앞 칸)으로 가서 말을 건다 */
  approachClerk() {
    const info = this.zone.interior;
    const w = this.clerkW;
    if (!info || !w) return;
    this.cancelActs();
    this.pending = { kind: 'talk', w };
    const c = info.counter ?? { i: Math.floor(w.x), j: Math.floor(w.y) + 2 };
    if (!this.walkTo(c.i, c.j)) this.finishPending();
  }
  private npcName(w: Walker) {
    const L = t();
    if (w.kind === 'clerk') return this.zone.interior?.name ?? '';
    if (w.mdef) return w.mdef.name[lang()];
    if (w.kind === 'pashar') return L.pashar;
    return w.kind === 'suturer' ? L.suturer : L.npc[w.kind as 'passer' | 'thug'];
  }
  private npcSub(w: Walker) {
    const L = t();
    if (w.kind === 'clerk') return L.clerkSub[(this.zone.interior?.kind ?? 'shop') as keyof typeof L.clerkSub] ?? '';
    if (w.mdef) return w.mdef.boss ? L.hellBoss.replace('{n}', String(this.zone.hell?.floor ?? 1)) : L.hellMonster;
    if (w.kind === 'pashar') return L.pasharSub;
    return w.kind === 'suturer' ? L.suturerSub : L.npcSub[w.kind as 'passer' | 'thug'];
  }

  /** 가게에 들어가 물건을 산다 */
  private goStore(k: number, kind: StoreKind | 'bank') {
    const b = this.zone.buildings[k];
    const spot = this.frontOf(b);
    if (!spot) return;
    this.cancelActs();
    this.walkTo(spot[0], spot[1]);
    this.storeWant = { k, kind, spot };
  }
  private storeWant: { k: number; kind: StoreKind | 'bank' | 'enter'; spot: [number, number] } | null = null;
  private goEnter(k: number) {
    const b = this.zone.buildings[k];
    const spot = this.frontOf(b);
    if (!spot) return;
    this.cancelActs();
    this.walkTo(spot[0], spot[1]);
    this.storeWant = { k, kind: 'enter', spot };
  }

  /** 간판 면 앞 (사람이 설 수 있는 칸) */
  private frontOf(b: Building): [number, number] | null {
    const near = (spot: [number, number]) => [[0, 0], [0, 1], [1, 0], [-1, 0], [0, -1], [1, 1]].map(([a, c]) => [spot[0] + a, spot[1] + c] as [number, number]).find(([a, c]) => walkable(this.zone, a, c)) ?? null;
    if (b.sign) return near(b.sign === 'right' ? [b.i0 + b.w, b.j0 + Math.floor(b.d / 2)] : [b.i0 + Math.floor(b.w / 2), b.j0 + b.d]);
    // 간판 없는 건물(사원 경내 등): 앞쪽 두 면 → 뒤쪽 두 면 순서로 걸을 수 있는 둘레 칸
    const ring: [number, number][] = [];
    for (let i = b.i0; i < b.i0 + b.w; i++) ring.push([i, b.j0 + b.d]);
    for (let j = b.j0; j < b.j0 + b.d; j++) ring.push([b.i0 + b.w, j]);
    for (let i = b.i0; i < b.i0 + b.w; i++) ring.push([i, b.j0 - 1]);
    for (let j = b.j0; j < b.j0 + b.d; j++) ring.push([b.i0 - 1, j]);
    const mid = (a: [number, number]) => Math.abs(a[0] - (b.i0 + b.w / 2)) + Math.abs(a[1] - (b.j0 + b.d / 2));
    const front = ring.slice(0, b.w + b.d).filter(([a, c]) => walkable(this.zone, a, c)).sort((x, y) => mid(x) - mid(y));
    if (front.length) return front[0];
    return ring.find(([a, c]) => walkable(this.zone, a, c)) ?? null;
  }

  /** 공격 시작 (행인은 강제 공격) */
  private attack(w: Walker) {
    if (this.realm === 'ghost' || w.kind === 'pashar') return;
    if (w.kind === 'remote' && (this.safeAt(w.x, w.y) || this.safeAt(this.player.x, this.player.y))) { this.hooks.say('', t().pvpSafe); return; }
    if (w.down > 0) return;
    this.cancelActs();
    this.mark = { w, t: 0 };
    this.player.target = w;
    this.player.atkT = Math.min(this.player.atkT, 0.2);
  }

  // ───────────────────────── 일하기 ─────────────────────────
  private goWork(k: number) {
    const b = this.zone.buildings[k];
    const near = this.frontOf(b);
    if (!near) return;
    this.cancelActs();
    this.walkTo(near[0], near[1]);
    this.working = { k, name: this.nameOf(b), earned: 0, spot: near, on: false };
  }

  private stopWork() {
    if (!this.working) return;
    this.working = null;
    this.player.sprite.visible = true;
    this.hooks.work(null);
  }

  // ───────────────────────── 싸움 ─────────────────────────
  private hit(from: Walker, to: Walker, dmg: number, crit = false, kind?: sfx.HitKind) {
    if (to.down > 0 || this.dead) return;
    if (to.isPlayer && Math.random() * 100 < dodgeChance(this.stats.agi)) { this.float(to, t().miss, '#d8e8ff'); return; }
    if (to.isPlayer) this.lastHitBy = from.kind === 'remote' ? (from.rid ?? null) : null;
    if (kind) sfx.impact(kind, this.spotOf(to), crit, this.bodyOf(to), (to.voice ??= 0.85 + Math.random() * 0.3));
    this.impactFx(from, to, crit, kind);
    // 다른 사람(실시간): 체력은 그 사람 기기가 계산한다. 몸만 남은 사람은 여기서 계산
    if (to.kind === 'remote' && to.rid && !to.lingerT) {
      if (from.isPlayer) {
        if (!to.rpos?.c && !this.recentAttacker(to.rid) && !this.struckFirst.has(to.rid)) {
          this.struckFirst.add(to.rid);
          // 지옥에서 다른 영혼을 치면 '지옥 영혼 공격' 악행 (악행 비율이 오르면 아래층으로 떨어진다)
          this.hooks.deed(this.zone.hell ? 'hellSoulHit' : 'firstStrike');
          if (!this.zone.hell) this.markCrime();
        }
        this.combatT = 0;
        to.barT = 5;
        this.hooks.pvpHit(to.rid, dmg, crit, kind ?? 'fist');
      }
      return;
    }
    if (to.kind === 'remote' && to.lingerT) {
      to.hp -= dmg / 600;
      to.barT = 5;
      if (to.hp <= 0) { to.down = 999; to.act = { anim: 'fall', t: 0 }; sfx.thud(this.spotOf(to)); if (from.isPlayer) { this.player.target = null; this.hooks.deed(to.rpos?.c ? 'criminalUserDown' : 'murder'); } }
      return;
    }
    to.hp -= dmg;
    to.hurtT = 0.18;
    if (!to.act || to.act.anim === 'hit') { to.act = { anim: 'hit', t: 0 }; to.pend = null; }
    to.barT = 5;
    // 피해 숫자는 보여 주지 않는다: 체력 막대로만 짐작
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
        this.markCrime();
      }
    }
    if (to.kind === 'suturer' && from.isPlayer) {
      if (!to.hitBy) { to.hitBy = true; this.hooks.deed('suturerHit'); }
      if (!to.monster && to.hp < to.maxHp * 0.5) this.transform(to);
    }
    if (to.kind === 'passer') {
      to.flee = 7;
      to.path = [];
      if (Math.random() < 0.6) this.bubble(to, t().help);
    } else if (!to.target) to.target = from;
    if (to.hp <= 0) this.knockDown(to, from);
  }

  /** 맞은 몸의 재질 → 타격음이 달라진다 */
  private bodyOf(w: Walker): sfx.Body {
    if (w.mdef) return w.mdef.body === 'yak' ? 'yak' : w.mdef.body === 'pret' ? 'pret' : 'ash';
    if (w.kind === 'suturer') return w.monster ? 'monster' : 'suturer';
    if (w.kind === 'thug') return 'thug';
    if (w.isPlayer || w.kind === 'remote') return 'player';
    return 'flesh';
  }

  /** 타격감: 멈칫(히트스톱) · 화면 흔들림 · 번쩍 · 밀려남 · 불꽃 */
  private impactFx(from: Walker, to: Walker, crit: boolean, kind?: sfx.HitKind) {
    const mine = from.isPlayer || to.isPlayer;
    if (mine) {
      this.hitStop = Math.max(this.hitStop, crit ? 0.11 : 0.065);
      this.shakeT = Math.max(this.shakeT, crit ? 0.22 : to.isPlayer ? 0.16 : 0.1);
      this.shakeA = Math.max(this.shakeA, crit ? 5 : to.isPlayer ? 3.5 : 2.5);
    }
    to.flashT = 0.07;
    const dx = to.x - from.x, dy = to.y - from.y, d = Math.hypot(dx, dy) || 1;
    const push = (crit ? 0.42 : kind === 'blunt' ? 0.3 : 0.2) * (to.kind === 'suturer' && !to.monster ? 0.5 : 1);
    to.kb = { dx: (dx / d) * push, dy: (dy / d) * push, t: 0.12 };
    const [ax, ay] = iso(from.x, from.y), [bx, by] = iso(to.x, to.y);
    const sx = ax + (bx - ax) * 0.7, sy = ay + (by - ay) * 0.7 - 24;
    const n = crit ? 11 : 7;
    for (let k = 0; k < n; k++) {
      const a = Math.random() * Math.PI * 2, v = (crit ? 90 : 60) * (0.5 + Math.random());
      this.sparks.push({ x: sx, y: sy, vx: Math.cos(a) * v, vy: Math.sin(a) * v * 0.7 - 20, t: 0.16 + Math.random() * 0.1, col: crit ? 0xffd27a : kind === 'blade' ? 0xeaf4ff : 0xfff1c4 });
    }
  }

  private knockDown(w: Walker, by: Walker) {
    sfx.thud(this.spotOf(w));
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
    if (w.kind === 'suturer') { w.down = 4; return; }
    if (w.mdef) {
      const f = this.zone.hell?.floor ?? 1;
      w.down = 5;
      if (by.isPlayer) this.hooks.deed('hellMonster', { floor: f * (w.mdef.boss ? 6 : 1) });
      if (w.mdef.boss) { this.bossDown = true; this.drawFeatures(); this.hooks.bossDown(f); }
      this.dropCoin(w.x, w.y, rand(w.mdef.notes[0], w.mdef.notes[1]) * (w.mdef.boss ? 1 : f), false, true);
      return;
    }
    const amount = w.kind === 'thug' ? rand(60, 260) : rand(15, 90);
    this.dropCoin(w.x, w.y, amount, w.kind === 'passer');
  }

  private dropCoin(x: number, y: number, amount: number, fromVictim: boolean, notes = false) {
    const g = new Graphics();
    g.ellipse(0, 0, 6, 2.6).fill({ color: 0x000000, alpha: 0.35 });
    if (notes) {
      // 저승돈: 붉고 누런 종이돈 몇 장
      for (const [dx, dy, c] of [[-3, -2, 0xb8302a], [2, -2, 0xd9a03a], [0, -4, 0xc94a2a]] as const) g.rect(dx - 3, dy - 1.5, 6, 3).fill(c).stroke({ color: 0x3a1410, width: 0.6 });
    } else for (const [dx, dy, c] of [[-2, -1, 0xc9a23e], [2, -1, 0xe0b437], [0, -3, 0xf2d27a]] as const) g.ellipse(dx, dy, 3, 1.6).fill(c).stroke({ color: 0x6b4a1c, width: 0.6 });
    const cx = x + 0.3, cy = y + 0.15;
    const [sx, sy] = iso(cx, cy);
    g.position.set(sx, sy);
    g.zIndex = cx + cy - 0.4;
    this.objects.addChild(g);
    this.coins.push({ x: cx, y: cy, amount, sprite: g, fromVictim, life: 120, notes });
  }

  private die(cause: 'car' | 'beaten') {
    sfx.thud(sfx.spot(0, 0));
    if (cause === 'beaten' && this.lastHitBy && this.combatT < 3) this.hooks.pvpDown(this.lastHitBy, Math.floor(this.hooks.cash()), this.criminalT > 0);
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
    setTimeout(() => this.hooks.died(this.zone.hell ? 'hell' : cause), 1100);
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

  /** 다른 사람: 받은 위치로 부드럽게 따라간다 */
  private moveRemote(w: Walker, dt: number) {
    const rp = w.rpos;
    if (!rp) return;
    const dx = rp.x - w.x, dy = rp.y - w.y, d = Math.hypot(dx, dy);
    const moving = d > 0.04;
    if (moving) {
      const step = Math.min(d, (2.3 + d) * dt);
      w.x += (dx / d) * step; w.y += (dy / d) * step;
      w.dir = dirFromTile(dx, dy, w.dir);
      w.anim += dt * 2.3 * 8.5;
    } else { w.dir = rp.d; w.anim = 0; }
    this.pose(w, moving, dt);
    const [sx, sy] = iso(w.x, w.y);
    w.sprite.position.set(sx, sy);
    w.sprite.zIndex = w.x + w.y;
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
    applyFrame(w.sprite, frameOf(cs, anim, w.dir, i), w.size ?? 1);
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
    // 괴물: 영혼이 휴식 공간에 들어가면 포기, 층주는 자리에서 10칸 넘게 쫓지 않는다
    if (w.mdef && (this.inRest(tg.x, tg.y) || Math.hypot(w.x - w.home[0], w.y - w.home[1]) > (w.mdef.boss ? 10 : 18))) {
      w.target = null;
      const path = findPath(this.zone, Math.floor(w.x), Math.floor(w.y), w.home[0], w.home[1]);
      w.path = path ?? [];
      return;
    }
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
    // 공격 장면이 대각선으로만 있으면 대각선 넷 중에서, 상하좌우까지 있으면(2배 그림) 8방향으로 바라본다
    if (!w.act || w.act.anim !== 'fall') w.dir = dirFromTile(tg.x - w.x, tg.y - w.y, w.dir, !!w.cs?.eight);
    w.atkT -= dt;
    if (w.atkT > 0) return;
    if (w.isPlayer) {
      w.atkT = ATK_INTERVAL;
      if (ranged && !this.hooks.useAmmo()) { this.gear.ranged = false; return; }
      let dmg = rand(4, 8) + this.gear.atk * 3 + this.stats.str;
      const crit = Math.random() * 100 < critChance(this.stats.fai);
      if (crit) dmg *= CRIT_MULTIPLIER;
      this.startAttack(w, tg, dmg, crit);
    } else {
      w.atkT = w.mdef ? w.mdef.atk : w.kind === 'suturer' ? (w.monster ? 0.68 : 0.8) : 0.85;
      const f = this.zone.hell?.floor ?? 1;
      const base = w.mdef ? rand(w.mdef.dmg[0], w.mdef.dmg[1]) * (w.mdef.boss ? 1 : 1 + 0.25 * (f - 1)) : w.kind === 'suturer' ? rand(10, 18) * (w.monster ? 1.6 : 1) : rand(4, 9) + (w.weapon ? 3 : 0);
      const dmg = Math.max(1, Math.round(base) - (tg.isPlayer ? this.gear.def : 0));
      this.startAttack(w, tg, dmg);
    }
  }

  /** 공격 동작을 시작하고, 무기가 닿는 장면에서 피해를 준다 */
  private startAttack(w: Walker, tg: Walker, dmg: number, crit = false) {
    const anim: Anim = w.cs?.attack ?? 'punch';
    w.act = { anim, t: 0 };
    w.pend = { to: tg, dmg, at: (IMPACT[anim] ?? 1) / ANIM_FPS[anim], crit };
    sfx.swing(this.kindOf(w), this.spotOf(w));
  }

  /** 효과음: 무기 종류와 내 캐릭터에서 본 위치 */
  private kindOf(w: Walker) {
    return w.isPlayer ? sfx.hitKind(this.gear.weapon, this.gear.ranged) : sfx.hitKind(w.weapon);
  }
  private spotOf(w: Walker) {
    const p = this.player;
    return sfx.spot((w.x - w.y - (p.x - p.y)) * (TW / 2), (w.x + w.y - (p.x + p.y)) * (TH / 2));
  }

  private landHit(w: Walker) {
    const pd = w.pend!;
    w.pend = null;
    const tg = pd.to;
    if (tg.down > 0 || (tg.isPlayer && this.dead) || w.down > 0) return;
    const ranged = w.isPlayer && this.gear.ranged;
    if (ranged) sfx.gunshot(this.spotOf(w));
    if (Math.hypot(tg.x - w.x, tg.y - w.y) > (ranged ? RANGED : MELEE) + 0.6) return;
    this.swing(w, tg, ranged);
    this.hit(w, tg, pd.dmg, pd.crit, this.kindOf(w));
  }

  private stepWalker(w: Walker, dt: number) {
    if (!w.path.length) return false;
    const [ti, tj] = w.path[0];
    const tx = ti + 0.5, ty = tj + 0.5;
    const dx = tx - w.x, dy = ty - w.y, dist = Math.hypot(dx, dy);
    // 바라보는 쪽은 앞으로 갈 두세 칸의 평균으로 정한다 (지그재그 길에서도 몸이 한쪽을 본다)
    let ax = 0, ay = 0;
    const look = Math.min(3, w.path.length);
    for (let k = 0; k < look; k++) { ax += w.path[k][0] + 0.5; ay += w.path[k][1] + 0.5; }
    w.dir = dirFromTile(ax / look - w.x, ay / look - w.y, w.dir);
    let speed = w.speed;
    if (w.flee > 0) speed = 1.9;
    if (w.isPlayer && isDanger(w.hp, w.maxHp)) speed *= DANGER_SPEED;
    if (w.kind === 'thug' && w.target) speed = 1.7;
    else if (w.kind === 'thug' && w.stalk) speed = 1.3;
    if (w.mdef && w.target) speed = w.mdef.speed * 1.35;
    // 괴물은 휴식 공간에 들어오지 못한다
    if (w.mdef && this.inRest(tx, ty)) { w.path = []; return false; }
    const step = speed * dt;
    if (dist <= step) { w.x = tx; w.y = ty; w.path.shift(); } else { w.x += (dx / dist) * step; w.y += (dy / dist) * step; }
    return true;
  }

  // ───────────────────────── 매 장면 ─────────────────────────
  private update(dt: number, realDt = dt) {
    const p = this.player;
    this.drawSparks(realDt);
    if (this.zone.hell) this.drawEmbers(realDt);
    this.time += dt;
    if (this.stun > 0) { this.stun -= dt; p.path = []; }
    const clk = bangkokClock();
    const nf = nightFactor(clk.h, clk.m);
    // 봉합자: 죄를 지었을 때 가끔(35%) 하나가 나타난다. 오래 도망치면(14칸 밖에서 8초) 포기하고, 표시가 사라져도 물러난다
    const sut = this.walkers.filter((w) => w.kind === 'suturer');
    if (!sut.length) this.suturerT -= dt;
    if (this.sutDue >= 0) {
      this.sutDue -= dt;
      if (this.sutDue < 0) { if (this.criminalT > 0 && !this.dead && !sut.length) { this.spawnSuturer(); this.suturerT = 300; } }
    }
    for (const s of sut) {
      if (this.zone.interior?.rest) { s.target = null; continue; } // 성소: 문턱에서 기다리다 돌아간다
      const d = Math.hypot(s.x - p.x, s.y - p.y);
      s.farT = d > 14 ? (s.farT ?? 0) + dt : 0;
      if (this.criminalT > 0 && !this.dead && s.farT < 8 && !s.giveUp) { if (s.down <= 0) s.target = p; continue; }
      if (!s.giveUp && s.farT >= 8) { s.giveUp = true; this.bubble(s, t().suturerGiveUp); }
      s.target = null;
      if (d > 16) this.removeWalker(s);
      else if (s.flee <= 0) s.flee = 6;
    }
    for (const w of [...this.walkers]) {
      if (w.kind === 'remote') {
        if (w.lingerT !== undefined) {
          // 싸우다 나간 사람의 몸: 30초 뒤 사라진다
          w.lingerT -= dt;
          this.pose(w, false, dt);
          if (w.lingerT <= 0) { w.sprite.destroy(); this.walkers.splice(this.walkers.indexOf(w), 1); }
          continue;
        }
        this.moveRemote(w, dt);
        continue;
      }
      if (w.down > 0) {
        if (!w.isPlayer) {
          w.down -= dt;
          if (w.down <= 0) {
            if (w.kind === 'suturer') { this.removeWalker(w); continue; }
            if (w.mdef) { if (w.mdef.boss) this.removeWalker(w); else this.spawnMonster(w); continue; }
            this.spawnNpc(w.kind as NpcKind, w);
          }
        }
      } else if (!(w.isPlayer && this.dead)) this.fight(w, dt);
      if (w.sprite.destroyed) continue;
      const moving = w.down <= 0 && !(w.isPlayer && this.dead) && this.stepWalker(w, dt);
      if (!w.isPlayer && w.down <= 0) this.think(w, moving, dt, nf);
      if (w.sprite.destroyed) continue;
      w.anim = moving ? w.anim + dt * (w.flee > 0 ? 1.9 : w.speed) * 8.5 : 0;
      this.pose(w, moving, dt);
      const [sx, sy] = iso(w.x, w.y);
      w.sprite.position.set(sx, sy);
      w.sprite.zIndex = w.down > 0 ? w.x + w.y - 0.3 : w.x + w.y;
      if (w.flashT && w.flashT > 0) { w.flashT -= dt; w.sprite.tint = 0xffffff; if (w.sprite.blendMode !== 'add') w.sprite.blendMode = 'add'; }
      else { if (w.sprite.blendMode !== 'normal') w.sprite.blendMode = 'normal'; if (w.hurtT > 0) { w.hurtT -= dt; w.sprite.tint = 0xff7a6a; } else w.sprite.tint = 0xffffff; }
      if (w.kb) {
        const k = Math.min(1, dt / w.kb.t);
        const nx = w.x + w.kb.dx * k, ny = w.y + w.kb.dy * k;
        if (walkable(this.zone, Math.floor(nx), Math.floor(ny))) { w.x = nx; w.y = ny; }
        w.kb.dx *= 1 - k; w.kb.dy *= 1 - k; w.kb.t -= dt;
        if (w.kb.t <= 0) w.kb = undefined;
      }
      if (w.barT > 0) w.barT -= dt;
      if (w.bubble) {
        w.bubbleT -= dt;
        w.bubble.position.set(sx, sy - 46);
        if (w.bubbleT <= 0) { w.bubble.destroy(); w.bubble = undefined; }
      }
    }
    // 말 걸기: 가까이 가면
    if (this.pending && Math.hypot(this.pending.w.x - p.x, this.pending.w.y - p.y) < (this.pending.w.kind === 'clerk' ? 2.6 : 1.6)) { p.path = []; this.finishPending(); }
    // 일하기: 자리에 서 있는 동안 현실 시간으로 돈이 쌓인다. 움직이면 그만
    if (this.working) {
      const at = Math.floor(p.x) === this.working.spot[0] && Math.floor(p.y) === this.working.spot[1] && !p.path.length;
      if (at) {
        if (!this.working.on) {
          this.working.on = true;
          this.workTick = 0;
          p.sprite.visible = false;
          const b = this.zone.buildings[this.working.k];
          const bx = b.i0 + b.w / 2 - p.x, by = b.j0 + b.d / 2 - p.y;
          p.dir = dirFromTile(bx, by, p.dir);
        }
        this.working.earned += WAGE_PER_SEC * dt;
        this.hooks.money(WAGE_PER_SEC * dt);
        this.workTick -= dt;
        if (this.workTick <= 0) { this.workTick = 1; this.hooks.work({ name: this.working.name, earned: this.working.earned }); }
      } else if (this.working.on) this.stopWork();
      if (this.working?.on) p.sprite.visible = false;
    }
    // 가게: 문 앞에 닿으면 물건 고르기
    if (this.storeWant && !p.path.length && Math.floor(p.x) === this.storeWant.spot[0] && Math.floor(p.y) === this.storeWant.spot[1]) {
      const sw = this.storeWant;
      this.storeWant = null;
      if (sw.kind === 'enter') this.hooks.enterBuilding(sw.k, { i: sw.spot[0], j: sw.spot[1] }, this.takeChaser());
      else if (sw.kind === 'bank') this.hooks.bank(this.nameOf(this.zone.buildings[sw.k]));
      else this.hooks.store(sw.kind, this.nameOf(this.zone.buildings[sw.k]), cuisineOf(this.zone.buildings[sw.k]));
    }
    // 돈 줍기
    for (let k = this.coins.length - 1; k >= 0; k--) {
      const c = this.coins[k];
      c.life -= dt;
      const close = !this.dead && Math.hypot(c.x - p.x, c.y - p.y) < 0.8;
      if (close || c.life <= 0) {
        if (close && c.notes) { this.hooks.notes(c.amount); this.float(p, t().notesGain.replace('{n}', String(c.amount)), '#f2a07a'); }
        else if (close) {
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
    // 체력: 싸움이 끝나고 잠시 지나면 찬다. 휴식처(지옥 마을·우주새 앞·쉬는 시설 안)에서는 바로, 아주 빠르게
    this.combatT += dt;
    const resting = this.restAt(p.x, p.y);
    if (!this.dead && (resting || this.combatT > OUT_OF_COMBAT_S) && p.hp < p.maxHp) {
      const before = Math.floor(p.hp);
      p.hp = Math.min(p.maxHp, p.hp + ((resting ? restRegenPerMinute(p.maxHp, this.stats.fai) : regenPerMinute(p.maxHp, this.stats.fai)) / 60) * dt);
      if (Math.floor(p.hp) !== before) this.hooks.hp(p.hp, p.maxHp);
    }
    if (this.criminalT > 0) this.criminalT -= dt;
    if (this.zone.interior) this.updateInterior(dt);
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
    // 다른 사람 중 먼저 공격한(범죄 표시) 사람: 머리 위 붉은 표시
    for (const w of this.walkers) {
      if (w.kind !== 'remote' || w.down > 0 || !(w.rpos?.c || w.lingerT)) continue;
      const [sx, sy] = iso(w.x, w.y);
      const col = w.lingerT ? 0x9a9a9a : 0xe0463a;
      this.bars.poly([sx - 4, sy - 56, sx + 4, sy - 56, sx, sy - 51]).fill(col).stroke({ color: 0x140e0a, width: 1 });
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
    const inside = !!this.working?.on;
    this.arrow.visible = !this.dead && !inside;
    this.ring.visible = !inside;
    if (this.auraTex) {
      applyFrame(this.aura, this.auraTex.get(p.dir)?.[Math.floor(this.time * 9) % 4]);
      this.aura.position.set(px, py);
      this.aura.zIndex = p.x + p.y - 0.005;
      this.aura.alpha = 0.75 + Math.sin(this.time * 5.3) * 0.2;
      this.aura.visible = !this.dead && !inside;
    }
    const vw = this.app.screen.width - this.insets.right, vh = this.app.screen.height - this.insets.bottom;
    let shx = 0, shy = 0;
    if (this.shakeT > 0) {
      this.shakeT -= realDt;
      const a = this.shakeA * Math.max(0, this.shakeT) / 0.2;
      shx = (Math.random() * 2 - 1) * a; shy = (Math.random() * 2 - 1) * a * 0.7;
      if (this.shakeT <= 0) this.shakeA = 0;
    }
    this.camera.position.set(Math.round(vw / 2 - px + shx), Math.round(vh / 2 - py + 20 + shy));
    this.lights.position.copyFrom(this.camera.position);
    // 이름표: 사람만 (건물 이름은 화면 위쪽에 잠깐)
    if (this.labelT > 0) this.labelT -= dt;
    this.drawLabel(this.labelT > 0 ? this.labelFor : this.hoverFor);
    this.updatePress();
    this.drawFx(dt);
    this.updateDoor(p);
    // 위험 상태: 화면 가장자리가 붉게 뛴다
    const W = this.app.screen.width, H = this.app.screen.height;
    this.danger.clear();
    if (!this.dead && isDanger(p.hp, p.maxHp)) {
      const a = 0.2 + Math.sin(this.time * 5) * 0.08;
      for (let k = 0; k < 6; k++) this.danger.rect(k * 6, k * 6, W - k * 12, H - k * 12).stroke({ color: 0xb01010, width: 6, alpha: a * (1 - k / 6) });
    }
    this.seeThrough(px, py, p.x + p.y);
    this.updateGhosts(p.x, p.y, dt);
    this.refreshNight(nf);
    this.streamT -= dt;
    if (this.streamT <= 0) { this.streamT = 0.12; this.stream(false); }
  }

  /** 행인·불량배의 평소 행동 */
  private think(w: Walker, moving: boolean, dt: number, nf: number) {
    const p = this.player;
    if (w.kind !== 'pashar' && w.kind !== 'clerk' && !w.mdef?.boss && Math.hypot(w.x - p.x, w.y - p.y) > 34) { if (w.kind === 'suturer') this.removeWalker(w); else if (w.mdef) this.spawnMonster(w); else this.spawnNpc(w.kind as NpcKind, w); return; }
    if (w.flee > 0) {
      w.flee -= dt;
      if (!w.path.length) {
        const ax = w.x - p.x, ay = w.y - p.y, d = Math.hypot(ax, ay) || 1;
        const spot = randomWalkTileNear(this.zone, Math.floor(w.x + (ax / d) * 8), Math.floor(w.y + (ay / d) * 8), 3, ['walk', 'cross', 'park', 'soi', 'lot']);
        if (spot) { const path = findPath(this.zone, Math.floor(w.x), Math.floor(w.y), spot[0], spot[1]); if (path) w.path = path; }
      }
      return;
    }
    if (w.kind === 'pashar' || w.kind === 'clerk') return;
    // 지옥 괴물: 휴식 공간 밖의 영혼을 보면 곧장 덤빈다. 층주는 자기 자리를 크게 벗어나지 않는다
    if (w.mdef) {
      const d = Math.hypot(p.x - w.x, p.y - w.y);
      if (!w.target && !this.dead && !this.inRest(p.x, p.y) && d < w.mdef.notice && Math.random() < dt * 3) {
        w.target = p;
        w.firstBy ??= w;
      }
      if (w.target) return;
      if (moving) return;
      w.wait -= dt;
      if (w.wait > 0) return;
      w.wait = 2 + Math.random() * 4;
      const spot = randomWalkTileNear(this.zone, w.home[0], w.home[1], w.mdef.boss ? 3 : 6, ['lot', 'walk', 'park', 'soi']);
      if (spot && !this.inRest(spot[0], spot[1])) { const path = findPath(this.zone, Math.floor(w.x), Math.floor(w.y), spot[0], spot[1]); if (path) w.path = path; }
      return;
    }
    // 귀신에게는 아무도 시비를 걸지 않는다 (보이지 않는 사람)
    if (this.realm === 'ghost' && w.kind === 'thug') { w.stalk = 0; }
    // 불량배: 눈에 띄면 시비를 걸며 다가오고, 코앞에서 돈을 요구하며 덤빈다 (밤에는 더 멀리서 알아본다)
    else if (w.kind === 'thug' && !w.target && !this.dead && w.down <= 0) {
      const L = t();
      const pick = (a: string[]) => a[Math.floor(Math.random() * a.length)];
      const d = Math.hypot(p.x - w.x, p.y - w.y);
      const notice = nf > 0.5 ? 8.5 : 6;
      w.aggroCool = Math.max(0, (w.aggroCool ?? 0) - dt);
      const hidden = !!this.working?.on;
      if (w.stalk) {
        w.stalk += dt;
        if (hidden || d > notice + 5 || Math.hypot(w.x - w.home[0], w.y - w.home[1]) > 14) {
          if (!hidden) this.bubble(w, pick(L.thugGiveUp));
          w.stalk = 0; w.aggroCool = 20; w.path = [];
        } else if (d < 1.8 && w.stalk > 0.7) {
          w.stalk = 0;
          w.path = [];
          w.target = p;
          w.firstBy ??= w;
          this.bubble(w, pick(L.thugDemand));
        } else {
          w.repathT -= dt;
          if (w.repathT <= 0 || !w.path.length) {
            w.repathT = 0.4;
            const path = findPath(this.zone, Math.floor(w.x), Math.floor(w.y), Math.floor(p.x), Math.floor(p.y));
            if (path) w.path = path.length > 1 ? path.slice(0, -1) : path;
          }
        }
        return;
      }
      if (!w.aggroCool && !hidden && d < notice && Math.random() < dt * 1.6) {
        w.stalk = 0.01;
        w.repathT = 0;
        this.bubble(w, pick(L.thugTaunt));
        return;
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
        if (w.isPlayer && !this.dead && this.realm !== 'ghost' && ahead > -0.3 && ahead <= 0.9 && c.speed > 2.5 && this.carCool <= 0) this.carHitsPlayer(c);
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
    sfx.impact('blunt', sfx.spot(0, 0), true);
    if (res.dead) { this.die('car'); return; }
    // 피해 숫자는 보여 주지 않는다 (체력 막대로만)
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

  /** 길게 누르기: 0.25초가 지나면 무조건 이동, 누른 채 움직이면 목적지를 다시 잡는다 */
  private updatePress() {
    const pr = this.press;
    if (!pr || this.dead) return;
    if (!pr.hold) {
      if (this.time - pr.t0 < 0.25) return;
      pr.hold = true;
      this.skipTap = true;
      if (this.working?.on) { this.stopWork(); }
      this.cancelActs();
      this.moveToScreen(pr.x, pr.y);
      pr.next = this.time + 0.15;
      return;
    }
    if (this.time >= pr.next) {
      pr.next = this.time + 0.15;
      this.player.path = this.player.path.slice(0, 1);
      this.moveToScreen(pr.x, pr.y, false);
      const last = this.player.path[this.player.path.length - 1];
      if (last) { const [x, y] = iso(last[0] + 0.5, last[1] + 0.5); if (this.ripple) { this.ripple.x = x; this.ripple.y = y; } }
    }
  }

  /** 지옥의 불티: 화면 아래에서 위로 날아오른다 */
  private drawEmbers(dt: number) {
    const W = this.app.screen.width, H = this.app.screen.height;
    const g = this.emberG;
    g.clear();
    const theme = floorDef(this.zone.hell!.floor).theme;
    const want = theme === 'swamp' ? 18 : 45;
    while (this.embers.length < want) this.embers.push({ x: Math.random() * W, y: H + Math.random() * H * 0.5, vx: (Math.random() - 0.5) * 14, vy: -(18 + Math.random() * 40), t: 4 + Math.random() * 6 });
    const col = theme === 'swamp' ? 0xb8d06a : 0xff8a2a;
    for (let k = this.embers.length - 1; k >= 0; k--) {
      const e = this.embers[k];
      e.t -= dt; e.x += (e.vx + Math.sin(this.time * 2 + k) * 8) * dt; e.y += e.vy * dt;
      if (e.t <= 0 || e.y < -10) { this.embers.splice(k, 1); continue; }
      g.rect(Math.round(e.x), Math.round(e.y), 2, 2).fill({ color: col, alpha: Math.min(1, e.t / 2) * 0.8 });
    }
  }

  /** 타격 불꽃 */
  private drawSparks(dt: number) {
    const g = this.sparkG;
    g.clear();
    for (let k = this.sparks.length - 1; k >= 0; k--) {
      const s = this.sparks[k];
      s.t -= dt;
      if (s.t <= 0) { this.sparks.splice(k, 1); continue; }
      const x0 = s.x, y0 = s.y;
      s.x += s.vx * dt; s.y += s.vy * dt; s.vy += 260 * dt;
      g.moveTo(x0, y0).lineTo(s.x, s.y).stroke({ color: s.col, width: 2, alpha: Math.min(1, s.t * 7) });
    }
  }

  /** 바닥 파동(이동)과 붉은 표적(공격) */
  private drawFx(dt: number) {
    const g = this.fxLayer;
    g.clear();
    const rp = this.ripple;
    if (rp) {
      rp.t += dt;
      const hold = !!this.press?.hold;
      const T = 0.55;
      for (const off of [0, 0.18]) {
        const k = hold ? ((rp.t + off) % T) / T : (rp.t - off) / T;
        if (k < 0 || k > 1) continue;
        g.ellipse(rp.x, rp.y, 4 + 13 * k, (4 + 13 * k) / 2).stroke({ color: 0xfff1c4, width: 1.5, alpha: (1 - k) * 0.9 });
      }
      if (!hold && rp.t > T + 0.2) this.ripple = null;
    }
    const m = this.mark;
    if (m) {
      m.t += dt;
      if (m.t > 0.8 || m.w.down > 0) this.mark = null;
      else {
        const [x, y] = iso(m.w.x, m.w.y);
        const k = Math.min(1, m.t / 0.15), a = m.t < 0.5 ? 1 : 1 - (m.t - 0.5) / 0.3;
        const r = 16 - 4 * k;
        g.ellipse(x, y, r, r / 2).stroke({ color: 0xe0463a, width: 2, alpha: a });
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) g.moveTo(x + dx * (r + 1), y + dy * (r / 2 + 1)).lineTo(x + dx * (r + 5), y + dy * (r / 2 + 3)).stroke({ color: 0xe0463a, width: 2, alpha: a });
      }
    }
  }

  /** 문 앞에 멈춰 서면 그 가게 위에 출입 아이콘. 사람에게 말 걸러 가는 중이면 그 사람 머리 위에 말풍선 */
  private updateDoor(p: Walker) {
    let found: number | null = null, fd = 2.3;
    if (!this.dead && !p.path.length && !this.working && !p.target) {
      const di = this.zone.door;
      const dd = Math.hypot(di.i + 0.5 - p.x, di.j + 0.5 - p.y);
      if (dd < fd && !this.zone.interior) { fd = dd; found = -1; }
      // 지옥: 올라가는 계단(-2) · 내려가는 구덩이(-3)
      const h = this.zone.hell;
      if (h) {
        for (const [code, f] of [[-2, h.up], [-3, h.down]] as const) {
          const d = Math.hypot(f.i + 0.5 - p.x, f.j + 0.5 - p.y);
          if (d < fd + 0.4) { fd = d; found = code; }
        }
      }
      if (!this.zone.hell && this.realm !== 'ghost') for (const k of this.bViews.keys()) {
        const b = this.zone.buildings[k];
        if (b.cat === 'ujusae' || !interactive(b) || (!canEnter(b) && !storeOf(b) && !canWork(b) && !hasBank(b))) continue;
        const f = this.frontCached(k);
        if (!f) continue;
        const d = Math.hypot(f[0] + 0.5 - p.x, f[1] + 0.5 - p.y);
        if (d < fd) { fd = d; found = k; }
      }
    }
    if (found !== this.doorFor) {
      this.doorFor = found;
      if (found !== null) {
        // 문이 있는 면의 가운데 (간판 쪽), 1층 차양 위
        let fx: number, fy: number;
        if (found === -1) { fx = this.zone.door.i + 0.5; fy = this.zone.door.j; }
        else if (found === -2 || found === -3) {
          const f = found === -2 ? this.zone.hell!.up : this.zone.hell!.down;
          fx = f.i + 0.5; fy = f.j + 0.5;
          const L = t();
          this.hooks.place(found === -2 ? (this.zone.hell!.floor === 1 ? L.hellExit : L.hellUp) : L.hellDown, '');
        } else {
          const b = this.zone.buildings[found];
          const f = this.frontCached(found)!;
          if (b.sign === 'right') { fx = b.i0 + b.w; fy = f[1] + 0.5; } else { fx = f[0] + 0.5; fy = b.j0 + b.d; }
          const n = this.nameOf(b);
          if (n) this.hooks.place(n, buildingSub(b, lang()));
        }
        if (found === -1) this.hooks.place(this.zone.hell ? t().hellShop : t().shopLabel, '');
        const [x, y] = iso(fx, fy);
        this.doorAt = { x, y: y - 74 };
      }
    }
    this.door.visible = found !== null;
    if (found !== null) {
      const bob = Math.sin(this.time * 3.2) * 1.5;
      const { x, y } = this.doorAt;
      this.door.clear()
        .circle(0, 0, 12).fill({ color: 0x140e0a, alpha: 0.88 }).stroke({ color: 0xe0b437, width: 1.5 })
        .rect(-4.5, -6, 9, 12).stroke({ color: 0xfff1c4, width: 1.4 })
        .circle(2, 0.5, 1.1).fill(0xe0b437)
        .poly([-2, 9, 2, 9, 0, 13]).fill(0xe0b437);
      this.door.position.set(Math.round(x), Math.round(y + bob));
    }
    const pd = this.pending;
    this.talkIcon.visible = !!pd && pd.kind === 'talk';
    if (pd && pd.kind === 'talk') {
      const [x, y] = iso(pd.w.x, pd.w.y);
      this.talkIcon.clear().roundRect(-8, -7, 16, 11, 4).fill({ color: 0xfff6d8, alpha: 0.95 }).stroke({ color: 0x140e0a, width: 1 })
        .poly([-2, 4, 3, 4, -3, 8]).fill(0xfff6d8)
        .circle(-4, -1.5, 1).circle(0, -1.5, 1).circle(4, -1.5, 1).fill(0x140e0a);
      this.talkIcon.position.set(Math.round(x), Math.round(y - 58 + Math.sin(this.time * 4)));
    }
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
      text = w.kind === 'remote' ? w.rinfo?.name ?? '' : this.npcName(w);
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
    const now = new Set<Container>();
    for (const v of this.bViews.values()) {
      if (v.x > x1 || v.x + v.w < x0 || v.y > y1 || v.y + v.h < y0) continue;
      if (v.parts.some((s) => hit(s, s.width, s.height, 0, 0) && this.opaqueAt(v, px - v.x, py - 26 - v.y))) for (const s of v.parts) now.add(s);
    }
    // 내 둘레의 길을 가리는 앞쪽 건물도 비친다 (도심에서 길을 눌러 움직일 수 있게)
    const X0 = px - 130, X1 = px + 130, Y0 = py - 120, Y1 = py + 90;
    for (const v of this.bViews.values()) {
      if (v.x > X1 || v.x + v.w < X0 || v.y > Y1 || v.y + v.h < Y0) continue;
      if (!v.parts.some((s) => s.zIndex > depth + 1)) continue;
      // 건물 바닥 앞 모서리가 내 발보다 화면 아래쪽(가까운 쪽)이고, 지붕이 내 둘레를 덮을 때만
      if (v.parts.some((s) => s.zIndex > depth + 1 && s.x < X1 && s.x + s.width > X0 && s.y < Y1 && s.y + s.height > Y0 && this.opaqueAt(v, Math.min(Math.max(px, s.x + 2), s.x + s.width - 2) - v.x, py - 30 - v.y))) for (const s of v.parts) now.add(s);
    }
    for (const t of this.tall) if (t.z > depth && t.x0 < x1 && t.x1 > x0 && t.y0 < y1 && t.y1 > y0) now.add(t.o);
    for (const s of this.faded) if (!now.has(s) && !s.destroyed) s.alpha = 1;
    for (const s of now) s.alpha = 0.28;
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
    if (this.zone.interior) { this.overlay.clear(); return; } // 방 안은 늘 불이 켜져 있다
    if (this.zone.hell) {
      // 지옥: 늘 어둡고 붉다. 화로는 늘 탄다
      if (this.night !== 1) { this.night = 1; this.clearBuildings(); }
      const W = this.app.screen.width, H = this.app.screen.height, ht = hellTint(this.zone.hell.floor);
      this.overlay.clear().rect(0, 0, W, H).fill({ color: ht.color, alpha: ht.alpha });
      for (const g of this.glows) g.s.alpha = 1;
      return;
    }
    const isNight = nf > 0.5 ? 1 : 0;
    if (isNight !== this.night) { this.night = isNight; this.clearBuildings(); }
    const W = this.app.screen.width, H = this.app.screen.height;
    this.overlay.clear().rect(0, 0, W, H).fill({ color: 0x0b1030, alpha: 0.5 * nf });
    for (const g of this.glows) g.s.alpha = nf;
  }

  here() {
    return tileAt(this.zone, Math.floor(this.player.x), Math.floor(this.player.y));
  }

  get isDead() {
    return this.dead;
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
