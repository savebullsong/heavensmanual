// 현실 세계 장면 (PixiJS): 실제 지도, 화면 근처만 불러오기, 클릭 이동, 행인, 차량, 방콕 실시간 낮밤
import { Application, Container, Graphics, Sprite, Text, Texture } from 'pixi.js';
import { characterPixels, SPRITE_W, SPRITE_H, type Look, type Facing } from './character.ts';
import { toCanvas } from './raster.ts';
import { type Zone, type Building, type Lane, findPath, walkable, randomWalkTileNear, tileAt } from './zone.ts';
import { iso, drawGroundChunk, CHUNK, drawBuilding, drawProp, drawCar, CAR_COLORS, TW, TH } from './gfx.ts';
import { t } from './i18n.ts';
import { bangkokClock, nightFactor } from './clock.ts';

function tex(c: HTMLCanvasElement): Texture {
  const tx = Texture.from(c);
  tx.source.scaleMode = 'nearest';
  return tx;
}

interface Walker {
  x: number; y: number; // 연속 격자 좌표 (타일 중심 = i + 0.5)
  path: [number, number][];
  speed: number;
  frames: Record<Facing, Texture[]>;
  sprite: Sprite;
  facing: Facing;
  anim: number;
  wait: number;
  isPlayer: boolean;
}
interface Car {
  lane: Lane; x: number; speed: number; max: number;
  sprite: Sprite; ax: number; ay: number; honked: boolean; bubble?: Text; bubbleT: number;
}

const lookCache = new Map<string, Record<Facing, Texture[]>>();
export function lookTextures(look: Look): Record<Facing, Texture[]> {
  const key = JSON.stringify(look);
  const hit = lookCache.get(key);
  if (hit) return hit;
  const mk = (f: Facing) => [0, 1, 2, 3].map((fr) => tex(toCanvas(characterPixels(look, f, fr), SPRITE_W, SPRITE_H)));
  const res = { front: mk('front'), back: mk('back') };
  lookCache.set(key, res);
  return res;
}

const PED_COUNT = 14;
const MAX_CARS = 70;

export class WorldScene {
  readonly root = new Container();
  private camera = new Container();
  private ground = new Container();
  private objects = new Container();
  private overlay = new Graphics();
  private lights = new Container();
  private player!: Walker;
  private walkers: Walker[] = [];
  private cars: Car[] = [];
  private chunks = new Map<string, Sprite>();
  private bSprites = new Map<number, Sprite>();
  private bIndex = new Map<string, number[]>();
  private propTex = new Map<string, { tex: Texture; anchorY: number }>();
  private carTex = new Map<string, { tex: Texture; ax: number; ay: number }>();
  private glows: { s: Sprite; i: number; j: number }[] = [];
  private night = -1;
  private wantShop = false;
  private streamT = 0;
  private marker = new Graphics().ellipse(0, 0, 17, 7).stroke({ color: 0xe0b437, width: 2, alpha: 0.9 });
  private shopLabel = new Container();
  private shopLabelText = new Text({ text: '', style: { fontFamily: 'system-ui, sans-serif', fontSize: 13, fontWeight: '600', fill: '#fff6d8' } });
  private shopLabelBg = new Graphics();
  private shopLabelT = 0;
  private shopHover = false;
  private insets = { right: 0, bottom: 0 };
  private tick = (tk: { deltaMS: number }) => this.update(Math.min(0.05, tk.deltaMS / 1000));

  constructor(private app: Application, readonly zone: Zone, look: Look, private onEnterShop: () => void) {
    this.objects.sortableChildren = true;
    this.camera.addChild(this.ground, this.objects);
    this.root.addChild(this.camera, this.overlay, this.lights);
    this.lights.eventMode = 'none';
    this.overlay.eventMode = 'none';
    // 건물 조각을 바닥 조각 단위로 색인
    zone.buildings.forEach((b, k) => {
      const key = `${Math.floor(b.i0 / CHUNK)},${Math.floor(b.j0 / CHUNK)}`;
      const list = this.bIndex.get(key);
      if (list) list.push(k); else this.bIndex.set(key, [k]);
    });
    this.placeProps();
    this.spawnPlayer(look);
    for (let n = 0; n < PED_COUNT; n++) this.spawnPedestrian();
    this.spawnCars();
    this.root.eventMode = 'static';
    this.root.hitArea = this.app.screen;
    this.root.on('pointertap', (e) => this.onTap(e.global.x, e.global.y));
    this.root.on('pointermove', (e) => { if (e.pointerType === 'mouse') this.onHover(e.global.x, e.global.y); });
    this.shopLabelText.anchor.set(0.5, 1);
    this.shopLabel.addChild(this.shopLabelBg, this.shopLabelText);
    this.shopLabel.visible = false;
    this.shopLabel.eventMode = 'none';
    this.shopLabel.zIndex = 1e6;
    this.objects.addChild(this.shopLabel);
    this.setShopLabel();
    this.update(0);
    this.stream(true);
  }

  private propTexture(kind: string) {
    let hit = this.propTex.get(kind);
    if (!hit) {
      const c = drawProp({ i: 0, j: 0, kind: kind as 'tree' });
      hit = { tex: tex(c), anchorY: kind === 'tree' ? 80 / 86 : kind === 'cart' ? 50 / 56 : 1 };
      this.propTex.set(kind, hit);
    }
    return hit;
  }

  private placeProps() {
    for (const p of this.zone.props) {
      const pt = this.propTexture(p.kind);
      const s = new Sprite(pt.tex);
      const [x, y] = iso(p.i + 0.5, p.j + 0.5);
      s.anchor.set(0.5, pt.anchorY);
      s.position.set(x, y);
      s.zIndex = p.i + p.j + 0.99;
      this.objects.addChild(s);
      if (p.kind === 'lamp') {
        const glow = new Sprite(this.glowTex());
        glow.anchor.set(0.5);
        glow.position.set(x + 6, y - 96);
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

  // ── 화면 근처만 불러오고, 멀어지면 지운다
  private visibleRange() {
    const sw = this.app.screen.width, sh = this.app.screen.height;
    const pts = [[0, 0], [sw, 0], [0, sh], [sw, sh]].map(([sx, sy]) => {
      const wx = sx - this.camera.x, wy = sy - this.camera.y;
      return [(wx / (TW / 2) + wy / (TH / 2)) / 2, (wy / (TH / 2) - wx / (TW / 2)) / 2];
    });
    const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]);
    // 화면 아래쪽 바깥에 선 높은 건물도 보이도록 +방향으로 여유를 더 둔다
    return { i0: Math.min(...xs) - 4, i1: Math.max(...xs) + 14, j0: Math.min(...ys) - 4, j1: Math.max(...ys) + 14 };
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
          const ch = drawGroundChunk(this.zone, ci * CHUNK, cj * CHUNK);
          const s = new Sprite(ch ? tex(ch.canvas) : Texture.EMPTY);
          if (ch) s.position.set(ch.x, ch.y);
          this.ground.addChild(s);
          this.chunks.set(key, s);
        }
      }
    for (const [key, s] of this.chunks) if (!want.has(key)) { s.destroy({ texture: s.texture !== Texture.EMPTY, textureSource: s.texture !== Texture.EMPTY }); this.chunks.delete(key); }
    // 건물: 보이는 조각 주변의 건물만
    let bBudget = all ? 1e9 : 10;
    const wantB = new Set<number>();
    for (let cj = d0 - 1; cj <= d1; cj++)
      for (let ci = c0 - 1; ci <= c1; ci++)
        for (const k of this.bIndex.get(`${ci},${cj}`) ?? []) {
          wantB.add(k);
          if (!this.bSprites.has(k) && bBudget > 0) { bBudget--; this.bSprites.set(k, this.makeBuilding(this.zone.buildings[k])); }
        }
    for (const [k, s] of this.bSprites) if (!wantB.has(k)) { s.destroy({ texture: true, textureSource: true }); this.bSprites.delete(k); }
  }

  private makeBuilding(b: Building) {
    const d = drawBuilding(b, t().cats[b.cat] ?? '', this.night === 1);
    const s = new Sprite(tex(d.canvas));
    s.position.set(d.x, d.y);
    s.zIndex = b.i0 + b.j0 + b.d - 0.5;
    this.objects.addChild(s);
    return s;
  }

  private clearBuildings() {
    for (const s of this.bSprites.values()) s.destroy({ texture: true, textureSource: true });
    this.bSprites.clear();
  }

  private makeWalker(look: Look, i: number, j: number, isPlayer: boolean): Walker {
    const frames = lookTextures(look);
    const sprite = new Sprite(frames.front[0]);
    sprite.anchor.set(0.5, 137 / 144);
    this.objects.addChild(sprite);
    return { x: i + 0.5, y: j + 0.5, path: [], speed: isPlayer ? 3.2 : 1.3 + Math.random() * 0.6, frames, sprite, facing: 'front', anim: 0, wait: Math.random() * 3, isPlayer };
  }

  private spawnPlayer(look: Look) {
    const { i, j } = this.zone.spawn;
    this.player = this.makeWalker(look, i, j, true);
    this.walkers.push(this.player);
    this.objects.addChild(this.marker);
  }

  private randomLook(): Look {
    const r = (n: number) => Math.floor(Math.random() * n);
    return { sex: Math.random() < 0.5 ? 'f' : 'm', build: r(3), skin: r(3), hair: r(6), hairColor: r(3), top: r(5), bottom: r(4) };
  }

  private spawnPedestrian(existing?: Walker) {
    const p = this.player;
    const spot = randomWalkTileNear(this.zone, Math.floor(p.x), Math.floor(p.y), 24);
    if (!spot) return;
    if (existing) { existing.x = spot[0] + 0.5; existing.y = spot[1] + 0.5; existing.path = []; return; }
    this.walkers.push(this.makeWalker(this.randomLook(), spot[0], spot[1], false));
  }

  private carTexture(color: string) {
    let hit = this.carTex.get(color);
    if (!hit) {
      const d = drawCar(color, color === '#e46aa6' || color === '#8cc63f');
      hit = { tex: tex(d.canvas), ax: d.ax, ay: d.ay };
      this.carTex.set(color, hit);
    }
    return hit;
  }

  private spawnCars() {
    const lanes = this.zone.lanes.slice().sort((a, b) => b.i1 - b.i0 - (a.i1 - a.i0));
    for (const lane of lanes) {
      const n = Math.max(1, Math.floor((lane.i1 - lane.i0) / 40));
      for (let k = 0; k < n && this.cars.length < MAX_CARS; k++) {
        const ct = this.carTexture(CAR_COLORS[Math.floor(Math.random() * CAR_COLORS.length)]);
        const sprite = new Sprite(ct.tex);
        this.objects.addChild(sprite);
        const max = 4.5 + Math.random() * 2.5;
        this.cars.push({ lane, x: lane.i0 + Math.random() * (lane.i1 - lane.i0), speed: max, max, sprite, ax: ct.ax, ay: ct.ay, honked: false, bubbleT: 0 });
      }
    }
  }

  setLook(look: Look) {
    this.player.frames = lookTextures(look);
  }

  /** 외형 창 등으로 화면 일부가 가려지면 남은 곳 가운데에 플레이어를 둔다 */
  setInsets(right: number, bottom: number) {
    this.insets = { right, bottom };
  }

  turnPlayer() {
    this.player.facing = this.player.facing === 'front' ? 'back' : 'front';
  }

  /** 언어가 바뀌면 간판 글씨를 다시 그린다 */
  relabel() {
    this.clearBuildings();
    this.stream(true);
    this.setShopLabel();
  }

  private setShopLabel() {
    this.shopLabelText.text = t().shopLabel;
    const w = Math.ceil(this.shopLabelText.width) + 14, h = 20;
    this.shopLabelBg.clear().roundRect(-w / 2, -h + 2, w, h, 4).fill({ color: 0x140e0a, alpha: 0.82 }).stroke({ color: 0xc9a23e, width: 1, alpha: 0.9 });
    this.shopLabelText.position.set(0, -2);
  }

  /** 우주새 상점에서 나올 때: 가게 문 앞에 선다 */
  placeAtDoor() {
    const p = this.player;
    const { i, j } = this.zone.door;
    // 문 바로 앞 칸에 선다 (다시 누르면 한 걸음 걸어 들어가며 이름이 보이도록)
    const out = [[i, j + 1], [i + 1, j + 1], [i - 1, j + 1], [i, j + 2]].find(([a, b]) => walkable(this.zone, a, b)) ?? [i, j];
    p.x = out[0] + 0.5;
    p.y = out[1] + 0.5;
    p.path = [];
    p.facing = 'front';
    this.wantShop = false;
    this.shopLabelT = 0;
  }

  /** 화면 좌표가 우주새 건물 위인지 */
  private overShop(gx: number, gy: number): boolean {
    const wx = gx - this.camera.x, wy = gy - this.camera.y;
    for (const [k, s] of this.bSprites) {
      if (this.zone.buildings[k].cat !== 'ujusae') continue;
      if (wx >= s.x && wx <= s.x + s.width && wy >= s.y && wy <= s.y + s.height) return true;
    }
    return false;
  }

  private onHover(gx: number, gy: number) {
    this.shopHover = this.overShop(gx, gy);
    document.body.style.cursor = this.shopHover ? 'pointer' : '';
  }

  start() {
    this.app.ticker.add(this.tick);
  }
  stop() {
    this.app.ticker.remove(this.tick);
    document.body.style.cursor = '';
  }

  private onTap(gx: number, gy: number) {
    const wx = gx - this.camera.x, wy = gy - this.camera.y;
    // 우주새 건물을 누르면 이름이 뜨고, 입구로 걸어가 상점으로 들어간다
    if (this.overShop(gx, gy)) {
      this.shopLabelT = 2.5;
      this.walkTo(this.zone.door.i, this.zone.door.j, true);
      return;
    }
    const x = (wx / (TW / 2) + wy / (TH / 2)) / 2, y = (wy / (TH / 2) - wx / (TW / 2)) / 2;
    this.walkTo(Math.floor(x), Math.floor(y), false);
  }

  private walkTo(i: number, j: number, shop: boolean) {
    const p = this.player;
    const from: [number, number] = p.path.length ? p.path[0] : [Math.floor(p.x), Math.floor(p.y)];
    const path = findPath(this.zone, from[0], from[1], i, j);
    if (!path) return;
    p.path = p.path.length ? [p.path[0], ...path] : path;
    this.wantShop = shop;
  }

  private stepWalker(w: Walker, dt: number) {
    if (!w.path.length) return false;
    const [ti, tj] = w.path[0];
    const tx = ti + 0.5, ty = tj + 0.5;
    const dx = tx - w.x, dy = ty - w.y, dist = Math.hypot(dx, dy);
    const sdy = (dx + dy) * (TH / 2);
    if (Math.abs(sdy) > 0.01) w.facing = sdy > 0 ? 'front' : 'back';
    const step = w.speed * dt;
    if (dist <= step) { w.x = tx; w.y = ty; w.path.shift(); } else { w.x += (dx / dist) * step; w.y += (dy / dist) * step; }
    return true;
  }

  private update(dt: number) {
    const p = this.player;
    for (const w of this.walkers) {
      const moving = this.stepWalker(w, dt);
      if (!w.isPlayer) {
        if (Math.hypot(w.x - p.x, w.y - p.y) > 34) this.spawnPedestrian(w);
        else if (!moving) {
          w.wait -= dt;
          if (w.wait <= 0) {
            w.wait = 2 + Math.random() * 5;
            const spot = randomWalkTileNear(this.zone, Math.floor(w.x), Math.floor(w.y), 10);
            if (spot) { const path = findPath(this.zone, Math.floor(w.x), Math.floor(w.y), spot[0], spot[1]); if (path) w.path = path; }
          }
        }
      }
      w.anim = moving ? w.anim + dt * 7 : 0;
      w.sprite.texture = w.frames[w.facing][moving ? Math.floor(w.anim) % 4 : 0];
      const [sx, sy] = iso(w.x, w.y);
      w.sprite.position.set(sx, sy);
      w.sprite.zIndex = w.x + w.y;
    }
    if (this.wantShop && !p.path.length) {
      const { i, j } = this.zone.door;
      if (Math.floor(p.x) === i && Math.floor(p.y) === j) { this.wantShop = false; this.onEnterShop(); }
    }
    // 차량: 앞에 사람이 있으면 서고 경적
    for (const c of this.cars) {
      const cy = c.lane.j + 0.5;
      let blocked = false;
      for (const w of this.walkers) {
        if (Math.floor(w.y) !== c.lane.j) continue;
        const ahead = (w.x - c.x) * c.lane.dir;
        if (ahead > 0 && ahead < 2.4) blocked = true;
      }
      c.speed = blocked ? Math.max(0, c.speed - 14 * dt) : Math.min(c.max, c.speed + 3 * dt);
      if (blocked && !c.honked && c.sprite.visible) {
        c.honked = true;
        c.bubble = new Text({ text: t().honk, style: { fontFamily: 'sans-serif', fontSize: 14, fontWeight: '700', fill: '#fff6d8', stroke: { color: '#1a1410', width: 3 } } });
        c.bubble.anchor.set(0.5);
        this.objects.addChild(c.bubble);
        c.bubbleT = 1.2;
      }
      if (!blocked) c.honked = false;
      c.x += c.lane.dir * c.speed * dt;
      if (c.x > c.lane.i1 + 1) c.x = c.lane.i0;
      if (c.x < c.lane.i0) c.x = c.lane.i1 + 1;
      const near = Math.abs(c.x - p.x) + Math.abs(cy - p.y) < 40;
      c.sprite.visible = near;
      if (near) {
        const [sx, sy] = iso(c.x, cy);
        c.sprite.position.set(sx - c.ax, sy - c.ay);
        c.sprite.zIndex = c.x + cy;
      }
      if (c.bubble) {
        c.bubbleT -= dt;
        const [sx, sy] = iso(c.x, cy);
        c.bubble.position.set(sx, sy - 44);
        c.bubble.zIndex = 99999;
        if (c.bubbleT <= 0) { c.bubble.destroy(); c.bubble = undefined; }
      }
    }
    // 카메라
    const [px, py] = iso(p.x, p.y);
    this.marker.position.set(px, py);
    this.marker.zIndex = p.x + p.y - 0.01;
    const vw = this.app.screen.width - this.insets.right, vh = this.app.screen.height - this.insets.bottom;
    this.camera.position.set(Math.round(vw / 2 - px), Math.round(vh / 2 - py + (this.insets.bottom ? 70 : 60)));
    this.lights.position.copyFrom(this.camera.position);
    // 우주새 이름표: 누르거나 마우스를 올렸을 때
    if (this.shopLabelT > 0) this.shopLabelT -= dt;
    let shopSprite: Sprite | undefined;
    if (this.shopLabelT > 0 || this.shopHover || this.wantShop) for (const [k, s] of this.bSprites) if (this.zone.buildings[k].cat === 'ujusae') shopSprite = s;
    this.shopLabel.visible = !!shopSprite;
    if (shopSprite) this.shopLabel.position.set(Math.round(shopSprite.x + shopSprite.width / 2), Math.round(shopSprite.y + 10));
    this.refreshNight();
    this.streamT -= dt;
    if (this.streamT <= 0) { this.streamT = 0.12; this.stream(false); }
  }

  private refreshNight() {
    const { h, m } = bangkokClock();
    const nf = nightFactor(h, m);
    const isNight = nf > 0.5 ? 1 : 0;
    if (isNight !== this.night) { this.night = isNight; this.clearBuildings(); }
    const W = this.app.screen.width, H = this.app.screen.height;
    this.overlay.clear().rect(0, 0, W, H).fill({ color: 0x0b1030, alpha: 0.5 * nf });
    for (const g of this.glows) g.s.alpha = nf;
  }

  /** 지금 서 있는 곳의 바닥 종류 (HUD 표시용) */
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
