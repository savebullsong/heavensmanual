// Heaven's Manual — 1단계: 우주새 상점(첫 장면, 무작위 처음 모습) → "나는 누구였지" → 이번 생의 모습 → 수쿰빗 거리
// 1단계-B: 대상 메뉴와 싸움, 체력·위험 상태·차 사고, 돈 줍기와 노동, 가방(먹기·장착), 죽음과 심판, 다시 우주새에서 눈뜨기
import { Application } from 'pixi.js';
import './style.css';
import { WorldScene, type WorldHooks, type Stance, type RemoteInfo } from './world.ts';
import { ShopRoom, type ShopTarget } from './shoproom.ts';
import { Dialog } from './dialog.ts';
import { openLookPanel, lookPanelInsets } from './lookpanel.ts';
import { ITEMS, STORES, menuFor, iconFor, effectText, priceText, type ItemDef, type ItemCat } from './items.ts';
import * as net from './net.ts';
import { preloadPortrait } from './portraits.ts';
import { sukhumvitTestZone, decodeZone, type Zone } from './zone.ts';
import { streetReady } from './street.ts';
import { ARRIVALS, rollArrival, arrivalLook, type Arrival, type Look, type Outfit } from './character.ts';
import { t, lang, setLang, LANGS, type Lang } from './i18n.ts';
import { load, save, type Slot, type Stash } from './state.ts';
import { hellZone, OPEN_FLOORS, floorDef, MONSTERS } from './hell.ts';
import { interiorZone } from './interior.ts';
import { buildingName } from './names.ts';
import { bangkokClock } from './clock.ts';
import { unlockAudio, isMuted, setMuted, plunge, chime } from './sfx.ts';
import * as sfx from './sfx.ts';
import { bgmMode, setBgmMode, setIndoor, type BgmMode } from './bgm.ts';
import { applyDeed, addSoulExp, judge, prayerAnswerChance, restRegenPerMinute, isDanger, DEED_TABLE, newStats, soulExpToNext, maxHp as maxHpFor, POINTS_PER_RANK, STAT_KEYS, STAT_MAX, type DeedKey, type StatKey } from '../../../packages/shared/src/rules.ts';

const state = load();
if (state.lang) setLang(state.lang);
// 시험용: ?newlife 는 새 영혼으로 다시 시작, ?form=raincoat 처럼 처음 모습을 고정
const params = new URLSearchParams(location.search);
const forced = params.get('form') as Arrival | null;
if (params.has('newlife') || (forced && ARRIVALS.includes(forced))) newLife(forced && ARRIVALS.includes(forced) ? forced : undefined);
if (!state.look && !state.arrival) newLife();
state.soul ??= { rank: 1, exp: 0 };
state.soul.stats ??= newStats();
save(state);
const stats = () => (state.soul!.stats ??= newStats());
const maxHp = () => maxHpFor(stats().vit);

/** 새 생: 처음 모습을 뽑고, 이번 생의 것(돈·가방·업)은 비운다. 영혼(영격)은 남는다 */
function newLife(kind?: Arrival) {
  const k = kind ?? rollArrival();
  state.arrival = { kind: k, look: arrivalLook(k) };
  delete state.look;
  state.wallet = 0;
  state.bag = {};
  state.equip = {};
  state.ammo = 0;
  state.hp = maxHpFor(state.soul?.stats?.vit ?? 1);
  state.deeds = { good: 0, evil: 0 };
  state.visits = 0;
}
/** 지금 보이는 몸: 이번 생의 몸이 정해지기 전에는 처음 모습 */
const bodyLook = (): Look => state.look ?? state.arrival!.look;
document.documentElement.lang = lang();

const ui = document.getElementById('ui')!;
const hud = document.getElementById('hud')!;
const app = new Application();
const dlg = new Dialog(document.body);
let shop!: ShopRoom;
let world: WorldScene | null = null;
let scene: 'shop' | 'world' = 'shop';
let talkedThisVisit = false;
let busy = false;
let workLine = '';

// 실제 지도 존을 미리 불러 둔다 (실패하면 시험 구역)
const ZONE_URL = 'zones/bkk-sukhumvit-asok.json';
const zoneReady: Promise<Zone> = fetch(ZONE_URL)
  .then((r) => { if (!r.ok) throw new Error(String(r.status)); return r.json(); })
  .then((j) => decodeZone(j))
  .catch(() => sukhumvitTestZone());

const shopLabels = () => ({ hwang: state.realm === 'hell' ? t().hwanghon : t().clerk, parrot: t().parrot, door: t().doorLabel });
const realm = () => state.realm ?? 'real';
/** 관리자 캐릭터의 투명 모드 (관리자로 지정된 계정만) */
const INVIS_KEY = 'heavensmanual.invisible';
const invisible = () => !!net.account()?.admin && localStorage.getItem(INVIS_KEY) === '1';
/** 노자돈 환율: ฿10 = 노전 1닢 */
const OBOL_RATE = 10;
const inHell = () => realm() === 'hell';
const hellState = () => (state.hell ??= { floor: 1, cleared: [], notes: 0 });

// ───────────────────────── 세계마다 봉인되는 물건 ─────────────────────────
/** 지금 가방(장착 포함)을 그 세계의 우주새에 봉인한다 */
function seal(w: 'real' | 'hell') {
  const bag = { ...(state.bag ?? {}) };
  for (const k of Object.values(state.equip ?? {})) if (k && !bag[k]) bag[k] = 1;
  const keys = Object.keys(bag).filter((k) => bag[k] > 0);
  if (!keys.length && !(state.ammo ?? 0)) return false;
  state.vault ??= {};
  const v: Stash = state.vault[w] ?? { bag: {}, ammo: 0 };
  for (const k of keys) v.bag[k] = (v.bag[k] ?? 0) + bag[k];
  v.ammo += state.ammo ?? 0;
  state.vault[w] = v;
  state.bag = {};
  state.equip = {};
  state.ammo = 0;
  return true;
}
function vaultOf(w: 'real' | 'hell'): Stash | null {
  const v = state.vault?.[w];
  return v && (Object.values(v.bag).some((n) => n > 0) || v.ammo > 0) ? v : null;
}
function reclaim(w: 'real' | 'hell') {
  const v = vaultOf(w);
  if (!v) return;
  state.bag ??= {};
  for (const [k, n] of Object.entries(v.bag)) if (n > 0) state.bag[k] = (state.bag[k] ?? 0) + n;
  state.ammo = (state.ammo ?? 0) + v.ammo;
  delete state.vault![w];
}

async function boot() {
  await app.init({ resizeTo: window, background: '#14110f', antialias: false, autoDensity: true, resolution: Math.min(2, window.devicePixelRatio || 1) });
  document.getElementById('game')!.appendChild(app.canvas);
  ui.hidden = true;
  shop = new ShopRoom(app, bodyLook(), false, shopLabels());
  shop.onArrive = onShopArrive;
  app.stage.addChild(shop.root);
  preloadPortrait('miss-hwang');
  if (realm() === 'hell') enterHell(hellState().floor, 'resume');
  else if (realm() === 'ghost' || realm() === 'heaven') enterWorld(realm() === 'heaven' ? 'door' : undefined);
  else enterShop(false);
  setInterval(updateHud, 1000);
  setInterval(() => save(state), 4000);
  if (import.meta.env.DEV || location.search.includes('debug')) (window as unknown as { __hm: unknown }).__hm = { shop: () => shop, world: () => world, state, hell: enterHell }; // 개발용 확인 창구
}

// ───────────────────────── 장면 전환 ─────────────────────────
/** 우주새 안도 쉬는 곳: 머문 시간만큼 체력이 찬다 (나올 때 계산) */
let shopSince = 0;
function restInShop() {
  if (!shopSince) return;
  const sec = (performance.now() - shopSince) / 1000;
  shopSince = 0;
  const max = maxHp();
  state.hp = Math.min(max, (state.hp ?? max) + (restRegenPerMinute(max, state.soul?.stats?.fai ?? 1) / 60) * sec);
}

function enterShop(fromStreet: boolean) {
  scene = 'shop';
  shopSince = performance.now();
  document.querySelector('.store-panel')?.remove(); // 거리 가게·은행 창은 두고 오지 않는다
  setIndoor(true);
  talkedThisVisit = false;
  closeMenus();
  world?.stop();
  if (world) world.root.visible = false;
  { const r = realm(); shop.setRealm(r === 'heaven' ? 'real' : r); }
  shop.setLabels(shopLabels());
  if (inHell()) preloadPortrait('hwanghon');
  shop.setLook(bodyLook());
  shop.enter(fromStreet);
  shop.start();
  renderHud();
  showStance(false);
  net.leaveZone();
}

async function enterWorld(at: 'door' | [number, number] = 'door') {
  restInShop();
  dropInterior();
  if (inHell()) { enterHell(hellState().floor, 'shop'); return; }
  shop.stop();
  scene = 'world';
  setIndoor(false);
  hud.hidden = true;
  ui.hidden = false;
  ui.className = 'scene loading';
  ui.textContent = t().loading;
  const [zone] = await Promise.all([zoneReady, streetReady]);
  ui.hidden = true;
  ui.textContent = '';
  ui.className = '';
  const want = realm() === 'ghost' ? 'ghost' : realm() === 'heaven' ? 'heaven' : 'real';
  if (world && (world.zone.hell || world.realm !== want)) { world.destroy(); world = null; }
  if (!world) {
    world = new WorldScene(app, zone, bodyLook(), () => enterShop(true), hooks, state.hp ?? maxHp(), { realm: want });
    app.stage.addChild(world.root);
  }
  world.root.visible = true;
  world.setLook(bodyLook());
  world.setGear(gear());
  world.setStats(stats());
  if (at === 'door') world.placeAtDoor(state.hp ?? maxHp());
  else world.placeNear(at[0], at[1], state.hp ?? maxHp());
  world.setStance(stance);
  world.setInvisible(invisible());
  world.start();
  renderHud();
  showStance(want !== 'ghost');
  if (want === 'ghost') { net.leaveZone(); return; } // 귀신은 산 사람들 사이에 보이지 않는다
  joinNet(world);
}

/** 지옥 n층으로: 떨어짐(죽음·악업) · 계단 · 구덩이 · 황혼의 가게에서 나옴 · 다시 열기 */
/** 지옥으로 떨어지는 장면: 화면이 꺼지고 붉은 빛줄기가 위로 스쳐 간다 (떨어지는 느낌). 덮인 뒤 세계를 바꾸고 걷힌다 */
function hellFall(long: boolean) {
  return worldFade('hell', long);
}
/** 세계를 건너는 장면: 지옥은 붉은 어둠 속으로 떨어지고, 천국은 흰 빛 속으로 떠오른다 */
function worldFade(kind: 'hell' | 'heaven', long: boolean) {
  const el = document.createElement('div');
  el.className = 'hell-fall' + (long ? ' long' : '') + (kind === 'heaven' ? ' heaven' : '');
  const streaks = Array.from({ length: long ? 26 : 14 }, () => {
    const l = (Math.random() * 100).toFixed(1), d = (Math.random() * (long ? 1.6 : 0.7)).toFixed(2), s = (0.35 + Math.random() * 0.5).toFixed(2), w = Math.random() < 0.25 ? 3 : 1;
    return `<i style="left:${l}%;animation-delay:${d}s;animation-duration:${s}s;width:${w}px"></i>`;
  }).join('');
  el.innerHTML = `<div class="hf-dark"></div><div class="hf-streaks">${streaks}</div><p class="hf-text"></p>`;
  if (long) el.querySelector('.hf-text')!.textContent = kind === 'heaven' ? t().risingHeaven : t().fallingHell;
  document.body.appendChild(el);
  if (kind === 'hell') plunge(long); else chime();
  requestAnimationFrame(() => el.classList.add('show'));
  const covered = new Promise<void>((r) => setTimeout(r, long ? 900 : 380));
  const minEnd = Date.now() + (long ? 2300 : 1000);
  return {
    covered,
    done() {
      setTimeout(() => { el.classList.add('out'); setTimeout(() => el.remove(), 900); }, Math.max(0, minEnd - Date.now()));
    },
  };
}

const hintedFloors = new Set<number>();
async function enterHell(floor: number, how: 'fall' | 'drop' | 'up' | 'down' | 'shop' | 'resume' | 'teleport') {
  const fx = how === 'fall' || how === 'drop' || how === 'down' || how === 'teleport' ? hellFall(how === 'fall' || how === 'drop') : null;
  if (fx) await fx.covered;
  if (how === 'shop') restInShop();
  const f = Math.max(1, Math.min(OPEN_FLOORS, floor));
  const h = hellState();
  state.realm = 'hell';
  h.floor = f;
  save(state);
  shop.stop();
  scene = 'world';
  setIndoor(false);
  closeMenus();
  document.querySelector('.store-panel')?.remove();
  await streetReady;
  const zone = hellZone(f);
  if (street) { street.destroy(); street = null; }
  if (world && world.zone !== zone) { world.destroy(); world = null; net.leaveZone(); }
  if (how === 'fall') state.hp = maxHp();
  if (!world) {
    world = new WorldScene(app, zone, bodyLook(), () => enterShop(true), hooks, state.hp ?? maxHp(), { realm: 'hell', bossDown: h.cleared.includes(f) });
    app.stage.addChild(world.root);
  }
  const w = world;
  w.root.visible = true;
  w.setLook(bodyLook());
  w.setGear(gear());
  w.setStats(stats());
  const zh = zone.hell!;
  const hp = state.hp ?? maxHp();
  if (how === 'shop') w.placeAtDoor(hp);
  else if (how === 'up') w.placeNear(zh.down.i + 1, zh.down.j + 1, hp); // 아래층에서 올라오면 이 층의 구덩이 곁
  else if (how === 'down') w.placeNear(zh.up.i + 1, zh.up.j + 1, hp); // 위층에서 내려오면 이 층의 계단 곁
  else w.placeNear(zh.rest.i, zh.rest.j, hp);
  w.setStance(stance);
  w.setInvisible(invisible()); // 관리자 투명은 층을 옮겨도 그대로
  w.start();
  renderHud();
  showStance(true);
  if (how !== 'shop' && how !== 'resume') showPlace(t().hellPlace.replace('{n}', String(f)).replace('{name}', floorDef(f).name[lang()]), floorDef(f).sin[lang()]);
  // 층주를 아직 못 쓰러뜨린 층: 위로 가는 길을 한 번 알려 준다 (세션마다 층당 한 번)
  if (!h.cleared.includes(f) && how !== 'shop' && !hintedFloors.has(f)) { hintedFloors.add(f); setTimeout(() => toast((floorDef(f).theme === 'market' ? t().hellHintFerry : t().hellHint).replace('{boss}', MONSTERS[floorDef(f).boss].name[lang()])), 2600); }
  joinNet(w);
  fx?.done();
}

/**
 * 관리자: 지옥 n층 휴식 마을로 바로 옮겨 간다 (지도 확인용). 지옥 밖(현실·천국·귀신)에서 왔으면 그 세계를 적어 두고
 * '원래 세계로' 단추로 돌아간다 — 환생이 아니라 시찰에서 돌아오는 것이라 몸·돈·업은 그대로다
 */
function adminTeleport(to: number | 'back') {
  if (!net.account()?.admin || busy || dlg.isOpen) return;
  document.querySelector('.set-panel')?.remove();
  closeMenus();
  dropInterior();
  if (to === 'back') {
    const trip = state.adminTrip;
    if (!trip || !inHell()) return;
    delete state.adminTrip;
    state.realm = trip;
    save(state);
    if (world) { world.destroy(); world = null; net.leaveZone(); }
    enterWorld('door');
    return;
  }
  if (!inHell()) state.adminTrip = realm() as 'real' | 'ghost' | 'heaven';
  enterHell(to, 'teleport');
}

function joinNet(w: WorldScene) {
  w.myNetId = net.myId();
  // 천국은 같은 지도라도 다른 세계: 천국에 있는 사람끼리만 보인다
  net.joinZone(w.realm === 'heaven' ? `${w.zone.id}~heaven` : w.zone.id, () => (scene === 'world' && world ? { info: myInfo(), pos: world.netPos() } : null), (id, info, pos) => w.upsertRemote(id, info, pos), (id) => w.removeRemote(id), {
    hit: (from, dmg, crit, kind) => w.pvpHit(from, dmg, crit, kind),
    down: (victim, by, cash, crim) => w.pvpDown(victim, by, cash, crim),
  });
}

function leaveShop() {
  state.visits += 1;
  save(state);
  enterWorld();
}

// ───────────────────────── 거리에서 오는 일 ─────────────────────────
const hooks: WorldHooks = {
  money(n) {
    state.wallet = (state.wallet ?? 0) + n;
    updateHud();
  },
  deed(key, opt) {
    recordDeed(key, opt);
  },
  hp(hp, max) {
    state.hp = Math.max(0, hp);
    updateHpBar(hp, max);
  },
  died(cause) {
    if (realm() === 'heaven') { heavenFaint(); return; }
    showDeath(cause);
  },
  heavenAct(what) {
    heavenAct(what);
  },
  menu(title, sub, options, x, y) {
    openTargetMenu(title, sub, options, x, y);
  },
  say(name, text) {
    npcSay(name, text);
  },
  work(st) {
    workLine = st ? t().workingLine.replace('{name}', st.name).replace('{n}', st.earned.toFixed(2)) : '';
    const el = hud.querySelector('.work');
    if (el) { el.textContent = workLine; el.setAttribute('title', st ? t().workOut : ''); }
    hud.querySelector('.hud-left')?.classList.toggle('working', !!st);
    // 가게 안에서 일할 때만 '그만두기' 단추 (붙이거나 뗄 때만 다시 그린다)
    if (!!hud.querySelector('.work-stop') !== (!!st && !!world?.isWorkingInside)) renderHud();
  },
  store(kind, name, cuisine) {
    openStore(kind, name, cuisine);
  },
  away() {
    document.querySelector('.store-panel')?.remove();
  },
  person(id, info, x, y, attack) {
    personMenu(id, info, x, y, attack);
  },
  pvpHit(to, dmg, crit, kind) {
    net.sendHit(to, dmg, crit, kind);
  },
  pvpDown(by, cash, wasCriminal) {
    net.sendDown(by, cash, wasCriminal);
  },
  cash() {
    return state.wallet ?? 0;
  },
  place(name, sub) {
    showPlace(name, sub);
  },
  bank(name) {
    openBank(name);
  },
  useAmmo() {
    if ((state.ammo ?? 0) <= 0) { toast(t().noAmmo); return false; }
    state.ammo = (state.ammo ?? 0) - 1;
    return true;
  },
  hellAct(kind) {
    hellAct(kind);
  },
  enterBuilding(k, out, chaser, work) {
    enterInterior(k, out, chaser, !!work);
  },
  leaveBuilding() {
    leaveInterior();
  },
  clerk() {
    clerkTalk();
  },
  bossDown(floor) {
    const h = hellState();
    if (!h.cleared.includes(floor)) h.cleared.push(floor);
    save(state);
    toast(t().hellCleared, 'good');
  },
  notes(n) {
    hellState().notes += n;
    updateHud();
  },
  debt: () => state.debt ?? 0,
  debtEat(n) {
    const L = t();
    state.debt = Math.max(0, (state.debt ?? 0) - n);
    save(state);
    updateHud();
    if (state.debt > 0) toast(L.debtTaken.replace('{n}', String(n)).replace('{m}', String(state.debt)));
    else toast(L.debtPaid, 'good');
  },
};

// ───────────────────────── 건물 안 ─────────────────────────
/** 방에 들어가 있는 동안 멈춰 둔 거리 (나오면 그대로 이어진다) */
let street: WorldScene | null = null;

function enterInterior(k: number, out: { i: number; j: number }, chaser: { monster: boolean; hp: number } | null, work = false) {
  if (!world || world.zone.interior || busy) return;
  const outer = world;
  const b = outer.zone.buildings[k];
  const z = interiorZone(b, k, out, b.cat === 'loan' ? t().beskHouse : buildingName(b, lang()));
  closeMenus();
  document.querySelector('.store-panel')?.remove();
  outer.stop();
  outer.root.visible = false;
  street = outer;
  net.leaveZone(); // 방 안은 혼자
  const w = new WorldScene(app, z, bodyLook(), () => enterShop(true), hooks, state.hp ?? maxHp(), { realm: realm() === 'hell' ? 'hell' : 'real', chaser, work: work ? z.interior!.name : undefined });
  w.crimeT = outer.crimeT;
  world = w;
  app.stage.addChild(w.root);
  w.setLook(bodyLook());
  w.setGear(gear());
  w.setStats(stats());
  w.placeNear(z.spawn.i, z.spawn.j, state.hp ?? maxHp());
  w.setStance(stance);
  w.start();
  setIndoor(true);
  renderHud();
  showPlace(z.interior!.name, '');
  if (work) toast(t().workInside);
  else if (z.interior!.rest) toast(t().restRoom, 'good');
}

/** 방의 나가는 매트: 거리의 그 건물 앞으로 (쫓던 대식자는 따라 나온다) */
function leaveInterior() {
  if (!world?.zone.interior || !street) return;
  const inner = world;
  const info = inner.zone.interior!;
  const ch = inner.chaserLeft();
  const crime = inner.crimeT;
  closeMenus();
  document.querySelector('.store-panel')?.remove();
  inner.destroy();
  world = street;
  street = null;
  world.crimeT = crime;
  world.root.visible = true;
  world.setLook(bodyLook());
  world.setGear(gear());
  world.setStats(stats());
  world.placeNear(info.from.out.i, info.from.out.j, state.hp ?? maxHp());
  world.setStance(stance);
  world.start();
  setIndoor(false);
  renderHud();
  joinNet(world);
  if (ch) world.releaseChaser(ch);
}

/** 방이 열려 있으면 버리고 거리를 되돌린다 (죽음·환생·지옥으로 갈 때) */
function dropInterior() {
  if (world?.zone.interior) { world.destroy(); world = street; street = null; }
}

const today = () => new Date().toISOString().slice(0, 10);
function daily() {
  if (state.daily?.d !== today()) state.daily = { d: today(), pray: 0, read: 0, donate: 0 };
  return state.daily!;
}
function pay(n: number) {
  if ((state.wallet ?? 0) < n) { toast(t().payShort); return false; }
  state.wallet = (state.wallet ?? 0) - n;
  updateHud();
  return true;
}
function healFull() {
  state.hp = maxHp();
  world?.heal(maxHp());
  updateHpBar(state.hp, maxHp());
}

/** 방의 직원: 업종마다 할 수 있는 것 */
function clerkTalk() {
  const info = world?.zone.interior;
  if (!info) return;
  const L = t();
  const sub = L.clerkSub[info.kind as keyof typeof L.clerkSub] ?? '';
  if (info.kind === 'loan') { talkToBesk(); return; } // 3층 피의 시장: 베스크 대부소
  if (info.store === 'bank') { openBank(info.name); return; }
  if (info.store === 'mart' || info.store === 'pharmacy' || info.store === 'food' || info.store === 'cafe') { openStore(info.store, info.name, info.cuisine); return; }
  const opts: { label: string; danger?: boolean; act: () => void }[] = [];
  const faith = ['temple', 'church', 'mosque', 'gurdwara'].includes(info.kind);
  if (faith) {
    opts.push({ label: L.prayBtn, act: () => {
      const dd = daily();
      if (dd.pray >= 3) { toast(L.prayLimit); return; }
      dd.pray++;
      recordDeed('pray');
      if (Math.random() * 100 < prayerAnswerChance(state.soul?.stats?.fai ?? 1)) { world?.heal(maxHp() * 0.3); toast(L.prayAnswered, 'good'); }
      else toast(L.prayed);
    } });
    opts.push({ label: L.readBtn, act: () => {
      const dd = daily();
      if (dd.read >= 1) { toast(L.readLimit); return; }
      dd.read++;
      npcSay(info.name, L.readLines[Math.floor(Math.random() * L.readLines.length)]);
      recordDeed('readScripture');
    } });
    opts.push({ label: L.offerBtn, act: () => {
      const dd = daily();
      if (dd.donate >= 20) { toast(L.donateLimit); return; }
      if (!pay(100)) return;
      dd.donate++;
      recordDeed('donate100');
    } });
  } else if (info.kind === 'clinic') {
    const cost = 200;
    opts.push({ label: L.healBuy.replace('{n}', String(cost)), act: () => { if (pay(cost)) { healFull(); toast(L.treated, 'good'); } } });
    opts.push({ label: L.donateBtn, act: () => {
      const dd = daily();
      if (dd.donate >= 20) { toast(L.donateLimit); return; }
      if (!pay(100)) return;
      dd.donate++;
      recordDeed('donate100');
    } });
  } else if (info.kind === 'massage') {
    opts.push({ label: L.massageBtn, act: () => { if (pay(250)) { healFull(); toast(L.massaged, 'good'); } } });
  } else if (info.kind === 'salon') {
    opts.push({ label: L.haircutBtn, act: () => {
      if (!state.look || !pay(300)) return;
      state.look = { ...state.look, hair: (state.look.hair + 1 + Math.floor(Math.random() * 4)) % 6, hairColor: Math.floor(Math.random() * 4) };
      world?.setLook(bodyLook());
      toast(L.haircut, 'good');
    } });
  } else if (info.kind === 'bar') {
    opts.push({ label: L.drinkBtn, act: () => { if (pay(80)) { world?.heal(60); toast(L.drank); } } });
  } else {
    npcSay(info.name, L.clerkIdle[Math.floor(Math.random() * L.clerkIdle.length)]);
    return;
  }
  opts.push({ label: L.act.close, act: () => undefined });
  save(state);
  openTargetMenu(info.name, sub, opts, window.innerWidth / 2, window.innerHeight * 0.38);
}

// ───────────────────────── 지옥: 계단 · 구덩이 · 파샤르 ─────────────────────────
function hellAct(kind: 'up' | 'down' | 'pashar' | 'talus') {
  if (!inHell() || busy || dlg.isOpen) return;
  const L = t();
  const h = hellState();
  if (kind === 'pashar' || (kind === 'up' && h.floor === 1)) { talkToPashar(); return; }
  if (kind === 'talus') { talkToTalus(); return; }
  if (kind === 'up') {
    if (floorDef(h.floor).theme === 'market') { ferry(); return; } // 3층: 나루터
    if (!h.cleared.includes(h.floor)) { toast(L.hellLocked); return; }
    enterHell(h.floor - 1, 'up');
    return;
  }
  if (h.floor + 1 > OPEN_FLOORS) { toast(L.hellDeeper); return; }
  enterHell(h.floor + 1, 'down');
}

/** 지옥 2층 들판의 노름꾼 탈루스: 뼈주사위 두 개의 합이 홀인지 짝인지 노전을 건다 (맞히면 건 만큼 더, 틀리면 잃음). 불고기맛 과자도 판다 */
const TALUS_SNACK = 3;
async function talkToTalus() {
  if (busy) return;
  busy = true;
  shop.lock(true);
  const L = t();
  const h = hellState();
  dlg.open({ name: L.talus, portrait: 'talus' });
  await dlg.say(L.talusGreet);
  for (;;) {
    const c = await dlg.choose([L.talusOdd, L.talusEven, L.talusSnack.replace('{n}', String(TALUS_SNACK)), L.talusBye]);
    if (c === 3 || c < 0) break;
    if (c === 2) {
      if (h.notes < TALUS_SNACK) { await dlg.say(L.talusPoor); continue; }
      h.notes -= TALUS_SNACK;
      state.bag = state.bag ?? {};
      state.bag.bulgogichips = (state.bag.bulgogichips ?? 0) + 1;
      save(state); renderHud();
      await dlg.say(L.talusSnackBought);
      continue;
    }
    if (h.notes <= 0) { await dlg.say(L.talusPoor); continue; }
    const amounts = [5, 10, 25].filter((n) => n <= h.notes);
    if (!amounts.length) amounts.push(h.notes);
    const ci = await dlg.choose([...amounts.map((n) => L.talusBet.replace('{n}', String(n))), L.talusBack]);
    if (ci < 0 || ci >= amounts.length) continue;
    const bet = amounts[ci];
    const d1 = 1 + Math.floor(Math.random() * 6), d2 = 1 + Math.floor(Math.random() * 6), sum = d1 + d2, odd = sum % 2 === 1;
    sfx.dice();
    await dlg.say(L.talusRoll.replace('{a}', String(d1)).replace('{b}', String(d2)).replace('{s}', String(sum)).replace('{r}', odd ? L.talusOddW : L.talusEvenW));
    if (odd === (c === 0)) { h.notes += bet; await dlg.say(L.talusWin.replace('{n}', String(bet))); }
    else { h.notes -= bet; await dlg.say(L.talusLose.replace('{n}', String(bet))); }
    save(state); renderHud();
  }
  endTalk();
}

/** 3층 나루터: 층주 세라네가 쓰러졌으면 바로 타고, 아니면 경비병에게 뱃삯을 내고 건넌다 (혼자서도 올라갈 수 있는 다른 길) */
const FERRY_FARE = 300;
async function ferry() {
  if (busy) return;
  const L = t();
  const h = hellState();
  const go = () => { toast(L.ferryGo); enterHell(h.floor - 1, 'up'); };
  if (h.cleared.includes(h.floor)) { toast(L.ferryFree); go(); return; }
  busy = true;
  dlg.open({ name: L.ferryGuard });
  await dlg.say(L.ferryNo);
  const c = await dlg.choose([L.ferryPay.replace('{n}', String(FERRY_FARE)), L.ferryLeave]);
  if (c === 0 && h.notes < FERRY_FARE) await dlg.say(L.ferryPoor.replace('{n}', String(FERRY_FARE)));
  dlg.close();
  busy = false;
  if (c === 0 && h.notes >= FERRY_FARE) { h.notes -= FERRY_FARE; save(state); renderHud(); go(); }
}

/** 지옥 1층 환생관: 층주(아쉬갈)를 쓰러뜨렸으면 현실로 다시 태어나게 해 준다 */
async function talkToPashar() {
  const L = t();
  const h = hellState();
  busy = true;
  dlg.open({ name: L.pashar, portrait: 'pashar' });
  if (!h.cleared.includes(1)) {
    await dlg.say(L.pasharNo.replace('{boss}', MONSTERS[floorDef(1).boss].name[lang()]));
    dlg.close();
    busy = false;
    return;
  }
  await dlg.say(L.pasharYes);
  await dlg.say(L.pasharAsk);
  const c = await dlg.choose([L.pasharGo, L.pasharWait]);
  if (c === 1) { dlg.close(); busy = false; return; }
  await dlg.say(L.pasharBye);
  dlg.close();
  busy = false;
  rebirthFrom('hell');
}

/** 현실로 다시 태어난다 (지옥에서 파샤르를 거쳐, 또는 귀신이 앵무새를 만나) */
function rebirthFrom(from: 'hell' | 'ghost' | 'heaven') {
  if (from === 'heaven') delete state.heaven;
  if (from === 'hell') {
    seal('hell');
    hellState().cleared = [];
  }
  state.realm = 'real';
  newLife();
  save(state);
  if (street) { street.destroy(); street = null; }
  if (world) { world.destroy(); world = null; }
  net.leaveZone();
  enterShop(false);
}

/** 행위를 기록하고 영혼 경험치를 더한다 */
function recordDeed(key: DeedKey, opt: { floor?: number; share?: number } = {}) {
  const L = t();
  const res = applyDeed(state.deeds ?? { good: 0, evil: 0 }, key, opt);
  state.deeds = res.deeds;
  const rule = DEED_TABLE[key];
  const parts: string[] = [];
  if (opt.share !== undefined) parts.push(L.guardAssist.replace('{p}', String(Math.round(opt.share * 100))));
  if (rule.kind === 'good') parts.push(L.toastGood.replace('{n}', String(rule.points)));
  if (rule.kind === 'evil') parts.push(L.toastEvil.replace('{n}', String(rule.points)));
  if (res.exp) {
    parts.push(L.toastExp.replace('{n}', String(res.exp)));
    const soul = state.soul ?? { rank: 1, exp: 0 };
    const up = addSoulExp(soul.rank, soul.exp, res.exp);
    if (up.rank > soul.rank) parts.push(L.rankUp.replace('{n}', String(up.rank)));
    state.soul = { ...soul, rank: up.rank, exp: up.exp }; // 스탯 배분은 그대로 둔다
  }
  toast(parts.join(' · '), rule.kind === 'evil' ? 'evil' : rule.kind === 'good' ? 'good' : '');
  renderHud();
  // 지옥에서 악행이 쌓여 악업 비율이 더 깊은 층을 가리키면 그 층으로 떨어진다
  if (inHell() && rule.kind === 'evil') {
    const j = judge(state.deeds!);
    const to = j.world === 'hell' ? Math.min(OPEN_FLOORS, j.floor) : 0;
    if (to > hellState().floor) {
      toast(L.hellFell.replace('{n}', String(to)), 'evil');
      setTimeout(() => { if (inHell() && !world?.isDead) enterHell(to, 'drop'); }, 900);
    }
  }
}

// ───────────────────────── 상점 안 ─────────────────────────
function onShopArrive(target: ShopTarget) {
  if (busy) return;
  if (realm() === 'ghost' && target !== 'door') { ghostParrot(); return; }
  if (target === 'hwang') talkToHwang();
  else if (target === 'door') goOut();
}

/** 한국어 조사: 받침이 있으면 '이요', 없으면 '요' */
function iyo(word: string) {
  const c = word.charCodeAt(word.length - 1);
  if (c < 0xac00 || c > 0xd7a3) return '이요';
  return (c - 0xac00) % 28 ? '이요' : '요';
}

async function talkToHwang() {
  busy = true;
  shop.lock(true);
  const L = t();
  const hell = inHell();
  const money = () => (hell ? hellState().notes : state.wallet ?? 0);
  dlg.open({ name: hell ? L.hwanghon : L.clerk, portrait: hell ? 'hwanghon' : 'miss-hwang' });
  if (!talkedThisVisit) {
    if (hell) {
      // 황혼은 미스 황도 황색날개도 모른다 (스스로 다른 사람이라 여긴다)
      if (!hellState().met) { hellState().met = true; save(state); await dlg.say(L.hwFirst); }
      await dlg.say(L.hwGreet);
    }
    else if (!state.look) {
      await dlg.say(L.greetFirst);
      await dlg.say(L.react[state.arrival!.kind]);
    } else await dlg.say(L.greetUsual);
    // 이 세계의 우주새에 봉인해 둔 물건
    const w = hell ? 'hell' : 'real';
    if (vaultOf(w)) {
      await dlg.say(L.vaultHas);
      if ((await dlg.choose([L.vaultTake, L.vaultLater])) === 0) {
        reclaim(w);
        save(state);
        await dlg.say(L.vaultBack);
      }
    }
  }
  talkedThisVisit = true;
  for (;;) {
    const picked = await pickItem(hell);
    if (!picked) {
      await dlg.say(L.closeMenu);
      break;
    }
    const name = picked.name[lang()];
    // 지옥에서 무기를 사는 건 당연한 일: '그걸로 뭘 하시려고요'는 현실에서만
    const line = picked.cat === 'weapon' ? (hell ? L.pickGoods : L.pickWeapon) : picked.cat === 'armor' ? L.pickArmor : L.pickGoods;
    await dlg.say(line.replace('{item}', name).replace('{iyo}', iyo(name)));
    if (money() >= picked.price) {
      if (hell) hellState().notes -= picked.price;
      else state.wallet = (state.wallet ?? 0) - picked.price;
      addToBag(picked);
      save(state);
      renderHud();
      await dlg.say(L.bought.replace('{item}', name));
      const c = await dlg.choose([L.more, L.enough]);
      if (c === 1) break;
      continue;
    }
    await dlg.say(hell ? L.hwNoMoney : L.noMoney);
    await dlg.say(hell ? L.hwGoEarn : L.goEarn);
    const c = await dlg.choose([L.exit, L.browse]);
    if (c === 0) {
      endTalk();
      shop.goTo('door');
      return;
    }
  }
  endTalk();
}

/** 유황새의 대부업자 베스크: 최대 100닢, 갚을 땐 두 배. 빚이 남으면 미납귀가 따라다닌다 */
const DEBT_MAX = 100;
async function talkToBesk() {
  busy = true;
  shop.lock(true);
  const L = t();
  const h = hellState();
  const debt = () => state.debt ?? 0;
  dlg.open({ name: L.besk, portrait: 'besk' });
  if (debt() > 0) await dlg.say(L.beskOwe.replace('{n}', String(debt())));
  else { await dlg.say(L.beskGreet); await dlg.say(L.beskTerms); }
  const room = Math.floor((DEBT_MAX * 2 - debt()) / 2); // 더 빌릴 수 있는 원금
  const amounts = [...new Set([30, 60, DEBT_MAX].map((n) => Math.min(n, room)))].filter((n) => n > 0);
  const opts = amounts.map((n) => L.beskBorrow.replace('{n}', String(n)));
  if (debt() > 0) opts.push(L.beskRepay.replace('{n}', String(debt())));
  opts.push(L.beskNo);
  const c = await dlg.choose(opts);
  if (c < amounts.length) {
    const n = amounts[c];
    h.notes += n;
    state.debt = debt() + n * 2;
    save(state);
    renderHud();
    await dlg.say(L.beskLent.replace('{n}', String(n)).replace('{m}', String(state.debt)));
  } else if (debt() > 0 && c === amounts.length) {
    if (h.notes <= 0) await dlg.say(L.beskEmpty);
    else {
      const pay = Math.min(h.notes, debt());
      h.notes -= pay;
      state.debt = debt() - pay;
      save(state);
      renderHud();
      await dlg.say(state.debt > 0 ? L.beskPart.replace('{n}', String(pay)).replace('{m}', String(state.debt)) : L.beskPaid);
    }
  }
  endTalk();
}

/** 귀신: 미스 황은 나를 보지 못한다. 앵무새가 갑자기 말을 하고 현실로 돌려보낸다 */
async function ghostParrot() {
  const L = t();
  busy = true;
  shop.lock(true);
  shop.crest(true);
  dlg.open({ name: L.parrot, portrait: 'parrot' });
  for (const line of L.ghostParrot) await dlg.say(line);
  dlg.close();
  shop.crest(false);
  shop.lock(false);
  busy = false;
  rebirthFrom('ghost');
}

function endTalk() {
  dlg.close();
  shop.lock(false);
  busy = false;
}

/** 상품 창을 띄우고, 고른 물건(닫으면 null)을 돌려준다 */
function pickItem(hell = false): Promise<ItemDef | null> {
  const L = t();
  const cats: ItemCat[] = ['goods', 'weapon', 'armor']; // 무기와 방어구도 처음부터
  let cat: ItemCat = 'goods';
  return new Promise((resolve) => {
    const el = document.createElement('div');
    el.className = 'shop-menu';
    const head = document.createElement('div');
    head.className = 'menu-head';
    const tabs = document.createElement('div');
    tabs.className = 'menu-tabs';
    const closeBtn = document.createElement('button');
    closeBtn.className = 'menu-close';
    closeBtn.textContent = '✕';
    closeBtn.setAttribute('aria-label', L.close);
    head.append(tabs, closeBtn);
    const list = document.createElement('div');
    list.className = 'menu-list';
    el.append(head, list);
    const done = (v: ItemDef | null) => { dlg.setPanel(null); resolve(v); };
    closeBtn.onclick = () => done(null);
    const render = () => {
      tabs.innerHTML = '';
      for (const c of cats) {
        const b = document.createElement('button');
        b.textContent = L.tabs[c];
        b.className = c === cat ? 'on' : '';
        b.onclick = () => { cat = c; render(); };
        tabs.appendChild(b);
      }
      list.innerHTML = '';
      const money = hell ? hellState().notes : state.wallet ?? 0;
      for (const it of ITEMS.filter((x) => x.cat === cat && !x.store && !!x.hell === hell)) list.appendChild(itemRow(it, priceText(it.price, hell), () => done(it), money < it.price));
    };
    render();
    dlg.setPanel(el);
    dlg.say(L.pickPrompt);
  });
}

function itemRow(it: ItemDef, right: string, onClick: () => void, dim = false) {
  const b = document.createElement('button');
  b.className = 'menu-item' + (dim ? ' dim' : '');
  const ic = iconFor(it);
  ic.className = 'icon';
  const nm = document.createElement('span');
  nm.className = 'name';
  nm.textContent = it.name[lang()];
  const ef = document.createElement('span');
  ef.className = 'effect';
  ef.textContent = effectText(it, lang());
  const pr = document.createElement('span');
  pr.className = 'price';
  pr.textContent = right;
  b.append(ic, nm, ef, pr);
  b.onclick = onClick;
  return b;
}

/** 문으로 나간다. 이번 생의 몸이 아직 없으면 스스로 묻고, 모습·성별·지역을 다시 고른다 */
async function goOut() {
  if (state.look) { leaveShop(); return; }
  busy = true;
  shop.lock(true);
  const L = t();
  dlg.open({ name: '', monologue: true });
  await dlg.say(L.whoWasI);
  dlg.close();
  const arrival = state.arrival!;
  // 아이 모습으로 왔어도 거리로 나가는 몸은 어른이다. 광채는 그대로 남는다
  const start: Look = { ...arrival.look, child: false };
  const special = arrival.look.outfit && arrival.look.outfit !== 'casual' ? [arrival.look.outfit] : [];
  const outfits: Outfit[] = ['casual', ...special];
  start.outfit = arrival.look.outfit ?? 'casual';
  const { look, region } = await chooseBody(L.bodyTitle, L.bodyConfirm, start, {
    outfits,
    regions: [
      { id: 'bkk', label: L.regions.bkk, ready: true },
      { id: 'seoul', label: L.regions.seoul, ready: false },
    ],
  });
  state.look = look;
  state.region = region ?? 'bkk';
  save(state);
  shop.lock(false);
  busy = false;
  leaveShop();
}

/** 외형 창: 지금 장면의 캐릭터가 바로 바뀐다 */
function chooseBody(title: string, confirm: string, initial: Look, extra: { outfits?: Outfit[]; regions?: { id: string; label: string; ready: boolean }[] } = {}): Promise<{ look: Look; region?: string }> {
  return new Promise((resolve) => {
    const ins = lookPanelInsets();
    const target = scene === 'shop' ? shop : world!;
    target.setInsets(ins.right, ins.bottom);
    hud.hidden = true;
    openLookPanel(document.body, initial, {
      title,
      confirm,
      ...extra,
      onChange: (look) => target.setLook(look),
      onTurn: () => (scene === 'shop' ? shop.turn() : world!.turnPlayer()),
      onDone: (look, region) => {
        target.setInsets(0, 0);
        hud.hidden = false;
        resolve({ look, region });
      },
    });
  });
}

// ───────────────────────── 가방 · 장착 ─────────────────────────
const SLOT_OF: Record<string, Slot> = {
  pipe: 'weapon', hammer: 'weapon', knife: 'weapon', shovel: 'weapon', bat: 'weapon', hatchet: 'weapon', dagger: 'weapon', sword: 'weapon', pistol: 'weapon',
  helmet: 'head', jacket: 'body', vest: 'body', gloves: 'hands', workpants: 'legs', shinguard: 'shins', boots: 'feet',
  hdagger: 'weapon', hhammer: 'weapon', hspear: 'weapon', hsword: 'weapon',
  hhelm: 'head', hvest: 'body', hgloves: 'hands', hshin: 'shins', hboots: 'feet',
};
const itemByKey = (k: string) => ITEMS.find((x) => x.key === k)!;

function addToBag(it: ItemDef) {
  if (it.key === 'ammo') { state.ammo = (state.ammo ?? 0) + 12; return; }
  state.bag = state.bag ?? {};
  state.bag[it.key] = (state.bag[it.key] ?? 0) + 1;
}

function gear() {
  const eq = state.equip ?? {};
  const w = eq.weapon ? itemByKey(eq.weapon) : null;
  const pistol = w?.key === 'pistol';
  const def = Object.entries(eq).reduce((s, [slot, k]) => (slot === 'weapon' || !k ? s : s + (itemByKey(k).def ?? 0)), 0);
  const armor = Object.entries(eq).filter(([slot, k]) => slot !== 'weapon' && k).map(([, k]) => itemByKey(k as string).sprite ?? (k as string));
  return { atk: pistol ? ((state.ammo ?? 0) > 0 ? w.atk ?? 0 : 1) : w?.atk ?? 0, def, ranged: pistol && (state.ammo ?? 0) > 0, weapon: w ? w.sprite ?? w.key : null, armor };
}
/** 실시간으로 남에게 보이는 나 */
function myInfo(): RemoteInfo {
  const g = gear();
  const acc = net.account();
  return { name: acc?.username ?? '', nick: acc?.name, look: bodyLook(), weapon: g.weapon, armor: g.armor, member: !!acc, hidden: invisible() || undefined };
}

function toggleBag() {
  const old = document.querySelector('.bag-panel');
  if (old) { old.remove(); return; }
  closeMenus();
  renderBag();
}

function renderBag() {
  document.querySelector('.bag-panel')?.remove();
  const L = t();
  const el = document.createElement('div');
  el.className = 'bag-panel shop-menu';
  const head = document.createElement('div');
  head.className = 'menu-head';
  const title = document.createElement('b');
  title.textContent = L.bag;
  const close = document.createElement('button');
  close.className = 'menu-close';
  close.textContent = '✕';
  close.onclick = () => el.remove();
  head.append(title, close);
  const info = document.createElement('div');
  info.className = 'bag-info';
  const d = state.deeds ?? { good: 0, evil: 0 };
  info.textContent = `${L.karma.replace('{g}', String(d.good)).replace('{e}', String(d.evil))}${(state.ammo ?? 0) > 0 ? ' · ' + L.ammoLeft.replace('{n}', String(state.ammo)) : ''}`;
  const list = document.createElement('div');
  list.className = 'menu-list';
  const bag = state.bag ?? {};
  const keys = Object.keys(bag).filter((k) => bag[k] > 0);
  if (!keys.length) { const p = document.createElement('p'); p.className = 'bag-empty'; p.textContent = L.bagEmpty; list.appendChild(p); }
  for (const k of keys) {
    const it = itemByKey(k);
    const slot = SLOT_OF[k];
    const on = !!slot && state.equip?.[slot] === k;
    const label = it.heal ? (it.key === 'bandage' || it.key === 'hbandage' ? L.use : L.eat) : slot ? (on ? L.unequip : L.equip) : '';
    const row = itemRow(it, `×${bag[k]}${on ? ' · ' + L.equipped : ''}`, () => {
      if (it.heal) {
        bag[k] -= 1;
        if (world && scene === 'world') world.heal(it.heal);
        else state.hp = Math.min(maxHp(), (state.hp ?? maxHp()) + it.heal);
      } else if (slot) {
        state.equip = state.equip ?? {};
        if (on) delete state.equip[slot]; else state.equip[slot] = k;
        world?.setGear(gear());
        net.nudge();
      } else return;
      save(state);
      renderBag();
      renderHud();
    });
    if (label) { const tag = document.createElement('span'); tag.className = 'act'; tag.textContent = label; row.appendChild(tag); row.classList.add('has-act'); }
    list.appendChild(row);
  }
  el.append(head, info, list);
  document.body.appendChild(el);
  // HUD가 두 줄로 접히는 좁은 화면에서도 가방이 HUD를 덮지 않도록
  const hudBottom = document.getElementById('hud')?.getBoundingClientRect().bottom ?? 56;
  el.style.top = `${Math.round(hudBottom + 6)}px`;
  el.style.maxHeight = `calc(100vh - ${Math.round(hudBottom + 20)}px)`;
}

// ───────────────────────── 대상 메뉴 · 일반 NPC 대화 · 알림 ─────────────────────────
function closeMenus() {
  document.querySelector('.target-menu')?.remove();
}

function openTargetMenu(title: string, sub: string, options: { label: string; danger?: boolean; act: () => void }[], x: number, y: number) {
  closeMenus();
  const el = document.createElement('div');
  el.className = 'target-menu';
  const h = document.createElement('div');
  h.className = 'tm-head';
  h.innerHTML = `<b></b><span></span>`;
  h.querySelector('b')!.textContent = title;
  h.querySelector('span')!.textContent = sub;
  el.appendChild(h);
  for (const o of options) {
    const b = document.createElement('button');
    b.textContent = o.label;
    if (o.danger) b.className = 'danger';
    b.onclick = (e) => { e.stopPropagation(); el.remove(); o.act(); };
    el.appendChild(b);
  }
  document.body.appendChild(el);
  const r = el.getBoundingClientRect();
  el.style.left = `${Math.max(8, Math.min(window.innerWidth - r.width - 8, x - r.width / 2))}px`;
  el.style.top = `${Math.max(64, Math.min(window.innerHeight - r.height - 8, y - r.height - 6))}px`;
  setTimeout(() => {
    const off = (e: PointerEvent) => { if (!el.contains(e.target as Node)) { el.remove(); document.removeEventListener('pointerdown', off, true); } };
    document.addEventListener('pointerdown', off, true);
  }, 0);
}

/** 주요 인물이 아닌 사람과의 대화: 그림 없이 글상자만 */
async function npcSay(name: string, text: string) {
  if (dlg.isOpen) return;
  dlg.open({ name });
  await dlg.say(text);
  dlg.close();
}

function toast(text: string, kind: '' | 'good' | 'evil' = '') {
  let area = document.querySelector('.toasts');
  if (!area) { area = document.createElement('div'); area.className = 'toasts'; document.body.appendChild(area); }
  const el = document.createElement('div');
  el.className = `toast ${kind}`;
  el.textContent = text;
  area.appendChild(el);
  setTimeout(() => el.classList.add('out'), 2400);
  setTimeout(() => el.remove(), 3000);
}

// ───────────────────────── 죽음과 심판 ─────────────────────────
function showDeath(cause: 'car' | 'beaten' | 'hell') {
  if (cause === 'hell' || inHell()) { showHellDeath(); return; }
  const L = t();
  closeMenus();
  document.querySelector('.bag-panel')?.remove();
  document.querySelector('.store-panel')?.remove();
  const d = state.deeds ?? { good: 0, evil: 0 };
  const j = judge(d);
  const verdict = j.world === 'heaven' ? L.judgeHeaven : j.world === 'hell' ? L.judgeHell.replace('{n}', String(j.floor)) : L.judgeGhost;
  const el = document.createElement('div');
  el.className = 'death';
  el.innerHTML = `<div class="death-box"><h1></h1><p class="cause"></p><p class="karma"></p><p class="money"></p><p class="verdict"></p><p class="closed"></p><button class="primary"></button></div>`;
  const lost = Math.floor(state.wallet ?? 0), kept = Math.floor(state.bank ?? 0);
  // 들고 있던 돈은 길에 흩어지고, 가방은 우주새에 봉인된다 (다음 생에 되찾는다)
  const sealed = seal('real');
  state.wallet = 0;
  const inside = world?.zone.interior;
  const here = inside ? { x: inside.from.out.i + 0.5, y: inside.from.out.j + 0.5 } : world?.netPos();
  dropInterior(); // 방에서 죽었으면 방은 버리고 거리로 돌아간다
  save(state);
  el.querySelector('.money')!.textContent = [lost > 0 ? L.deathLost.replace('{n}', lost.toLocaleString('en-US')) : '', kept > 0 ? L.deathKept.replace('{n}', kept.toLocaleString('en-US')) : lost > 0 ? L.deathNoBank : '', sealed ? L.deathVault : ''].filter(Boolean).join(' ');
  el.querySelector('h1')!.textContent = L.deathTitle;
  el.querySelector('.cause')!.textContent = cause === 'car' ? L.deathCar : L.deathBeaten;
  el.querySelector('.karma')!.textContent = L.karma.replace('{g}', String(d.good)).replace('{e}', String(d.evil));
  el.querySelector('.verdict')!.textContent = verdict;
  const closed = el.querySelector('.closed')!;
  const btn = el.querySelector('button')!;
  if (j.world === 'hell') {
    // 2단계: 지옥 1~3층이 열렸다. 더 깊은 층으로 떨어질 영혼은 지금 열린 가장 깊은 층으로
    closed.textContent = j.floor > OPEN_FLOORS ? L.hellCap.replaceAll('{m}', String(OPEN_FLOORS)) : '';
    btn.textContent = L.toHell;
    btn.onclick = () => { el.remove(); world?.revive(bodyLook()); enterHell(j.floor, 'fall'); };
  } else if (j.world === 'ghost') {
    closed.textContent = L.ghostLine;
    btn.textContent = L.toGhost;
    btn.onclick = () => {
      el.remove();
      state.realm = 'ghost';
      state.hp = maxHp();
      save(state);
      enterWorld(here ? [Math.floor(here.x), Math.floor(here.y)] : 'door');
    };
  } else {
    // 3단계: 천국이 열렸다. 쌓은 선행은 환생할 때 영혼 경험치로 돌려받는다 (환생관에게)
    closed.textContent = '';
    btn.textContent = L.toHeaven;
    btn.onclick = () => {
      el.remove();
      state.heaven = { bonus: j.world === 'heaven' ? j.bonusSoulExp : 0, met: state.heaven?.met };
      state.realm = 'heaven';
      state.hp = maxHp();
      save(state);
      const fx = worldFade('heaven', true);
      fx.covered.then(async () => {
        world?.revive(bodyLook());
        await enterWorld('door');
        fx.done();
      });
    };
  }
  document.body.appendChild(el);
  requestAnimationFrame(() => el.classList.add('show'));
}

// ───────────────────────── 천국 (3단계) ─────────────────────────
function heavenAct(what: 'officer' | 'yellowwing' | 'shop' | 'assault') {
  if (busy || dlg.isOpen) return;
  if (what === 'officer') talkToOfficer();
  else if (what === 'yellowwing') talkToYellowWing();
  else if (what === 'shop') npcSay(t().shopLabel, t().heavenShopEmpty);
  else heavenAssault();
}
/** 천국의 환생관: 언제든 다시 태어날 수 있다. 쌓은 선행만큼 영혼 경험치를 얹어 준다 */
async function talkToOfficer() {
  const L = t();
  busy = true;
  const bonus = state.heaven?.bonus ?? 0;
  dlg.open({ name: L.officer, portrait: 'luen' });
  await dlg.say(L.offGreet);
  await dlg.say(L.offAsk.replace('{n}', bonus.toLocaleString('en-US')));
  const c = await dlg.choose([L.offYes, L.offNo]);
  if (c === 1) { await dlg.say(L.offStay); dlg.close(); busy = false; return; }
  dlg.close();
  busy = false;
  if (bonus > 0) {
    const soul = state.soul ?? { rank: 1, exp: 0 };
    const up = addSoulExp(soul.rank, soul.exp, bonus);
    state.soul = { ...soul, rank: up.rank, exp: up.exp };
    toast(L.offBonus.replace('{n}', bonus.toLocaleString('en-US')) + (up.rank > soul.rank ? ` · ${L.rankUp.replace('{n}', String(up.rank))}` : ''), 'good');
  }
  rebirthFrom('heaven');
}
/** 황색날개: 미스 황과 같은 얼굴이지만 스스로는 다른 사람이라 여긴다. 천국의 물건은 공짜 */
const HEAVEN_GIFTS = ['water', 'cola', 'choco', 'chips', 'bandage'];
async function talkToYellowWing() {
  const L = t();
  busy = true;
  dlg.open({ name: L.yellowWing, portrait: 'yellow-wing' });
  if (!state.heaven?.met) { state.heaven = { bonus: state.heaven?.bonus ?? 0, met: true }; save(state); await dlg.say(L.ywFirst); }
  else await dlg.say(L.ywLines[Math.floor(Math.random() * L.ywLines.length)]);
  await dlg.say(L.ywGreet);
  const gifts = HEAVEN_GIFTS.map((k) => ITEMS.find((i) => i.key === k)!).filter(Boolean);
  const c = await dlg.choose([...gifts.map((i) => i.name[lang()]), L.ywNo]);
  if (c < gifts.length) {
    const it = gifts[c];
    state.bag ??= {};
    state.bag[it.key] = (state.bag[it.key] ?? 0) + 1;
    save(state);
    await dlg.say(L.ywGot.replace('{item}', it.name[lang()]));
  }
  dlg.close();
  busy = false;
  renderHud();
}
/** 천국에서 손을 들면: 악행이 기록되고 현실로 떨어진다 (선행 보너스는 받지 못한다) */
async function heavenAssault() {
  const L = t();
  busy = true;
  recordDeed('angelAssault');
  dlg.open({ name: L.officer, portrait: 'luen' });
  await dlg.say(L.heavenAssault);
  await dlg.say(L.heavenFall);
  dlg.close();
  busy = false;
  const fx = worldFade('hell', false);
  fx.covered.then(() => { rebirthFrom('heaven'); fx.done(); });
}
/** 천국에서 쓰러지면: 잃는 것 없이 환생관 곁에서 깨어난다 */
function heavenFaint() {
  if (!world) return;
  state.hp = maxHp();
  save(state);
  world.revive(bodyLook());
  world.placeAtDoor(state.hp);
  toast(t().heavenFaint);
}

/** 지옥에서 쓰러지면: 들고 있던 노전 절반을 잃고, 그 층의 휴식처에서 다시 일어난다 */
function showHellDeath() {
  const L = t();
  closeMenus();
  document.querySelector('.bag-panel')?.remove();
  const h = hellState();
  const lost = Math.floor(h.notes / 2);
  h.notes -= lost;
  state.hp = maxHp();
  save(state);
  const el = document.createElement('div');
  el.className = 'death hell';
  el.innerHTML = `<div class="death-box"><h1></h1><p class="cause"></p><p class="money"></p><button class="primary"></button></div>`;
  el.querySelector('h1')!.textContent = L.hellPlace.replace('{n}', String(h.floor)).replace('{name}', floorDef(h.floor).name[lang()]);
  el.querySelector('.cause')!.textContent = L.hellDeath;
  el.querySelector('.money')!.textContent = lost > 0 ? L.hellDeathNotes.replace('{n}', lost.toLocaleString('en-US')) : '';
  const btn = el.querySelector('button')!;
  btn.textContent = L.hellRise;
  btn.onclick = () => {
    el.remove();
    if (!world) return;
    world.revive(bodyLook());
    const zh = world.zone.hell!;
    world.placeNear(zh.rest.i, zh.rest.j, maxHp());
    renderHud();
  };
  document.body.appendChild(el);
  requestAnimationFrame(() => el.classList.add('show'));
}

// ───────────────────────── 상단 표시줄 ─────────────────────────
function renderHud() {
  const L = t();
  hud.hidden = false;
  const place = placeName();
  const live = !net.account() ? `<button class="live">${L.live}</button>` : '';
  const narrow = matchMedia('(max-width: 640px)').matches;
  hudNarrow = narrow;
  hud.innerHTML = `
    <div class="hud-left${workLine ? ' working' : ''}"><div class="where" data-zone="${escHtml(place)}"><b>${escHtml(place)}</b></div>${scene === 'shop' ? `<span class="hint">${realm() === 'hell' ? L.hintHell : realm() === 'ghost' ? L.hintGhost : L.hintShop}</span>` : ''}<span class="work">${workLine}</span>${workLine && world?.isWorkingInside ? `<button class="work-stop">${L.workStop}</button>` : ''}</div>
    <div class="hud-tools">${live}<div class="hud-right">
      <span class="hpbox" title="${L.hpLabel}"><span class="clock"></span><i class="hpbar"><i></i></i></span>
      <span class="wallet"></span>
      <button class="to-soul">${narrow ? L.rankShort : L.rank} ${state.soul?.rank ?? 1}</button>
      <button class="to-bag">${L.bag}</button>
      <button class="to-set" aria-label="${L.settings}" title="${L.settings}">${SET_SVG}${narrow ? '' : `<span>${L.settings}</span>`}</button>
    </div></div>
    ${scene === 'world' && world?.zone.attribution ? '<a class="attrib" href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">© OpenStreetMap</a>' : ''}`;
  (hud.querySelector('.to-bag') as HTMLButtonElement).onclick = toggleBag;
  (hud.querySelector('.to-set') as HTMLButtonElement).onclick = toggleSettings;
  (hud.querySelector('.to-soul') as HTMLButtonElement).onclick = toggleSoul;
  hud.querySelector('.work-stop')?.addEventListener('click', () => { world?.stopWorkInside(); leaveInterior(); });
  const lb = hud.querySelector('.live') as HTMLButtonElement | null;
  if (lb) lb.onclick = () => openSignup('signup');
  updateHud();
}

/** 언어 바꾸기 (영혼 설정) */
function changeLang(l: Lang) {
  setLang(l);
  state.lang = l;
  save(state);
  document.documentElement.lang = l;
  world?.relabel();
  shop.setLabels(shopLabels());
  renderHud();
}

// ───────────────────────── 영혼 설정 ─────────────────────────
// 소리(배경·효과음) · 언어 · 내 영혼(아이디·이름·이메일 인증·비밀번호·프로필·떠나기)를 한 창에
function toggleSettings() {
  const old = document.querySelector('.set-panel');
  if (old) { old.remove(); return; }
  closeMenus();
  document.querySelector('.bag-panel')?.remove();
  document.querySelector('.soul-panel')?.remove();
  renderSettings();
}
function renderSettings() {
  document.querySelector('.set-panel')?.remove();
  const L = t();
  const el = document.createElement('div');
  el.className = 'set-panel soul-panel shop-menu';
  el.innerHTML = `<div class="menu-head"><b></b><button class="menu-close" aria-label="${L.close}">✕</button></div>
    <section class="set-sec"><h4></h4>
      <div class="set-row"><span class="lbl l-bgm"></span><div class="seg s-bgm"></div></div>
      <div class="set-row"><span class="lbl l-sfx"></span><div class="seg s-sfx"></div></div>
    </section>
    <section class="set-sec"><h4 class="h-lang"></h4><div class="seg s-lang wide"></div></section>
    <section class="set-sec set-acc"><h4 class="h-acc"></h4><div class="acc"></div></section>
    ${net.account()?.admin ? `<section class="set-sec set-admin"><h4 class="h-admin"></h4><div class="set-row"><span class="lbl l-inv"></span><div class="seg s-inv"></div></div><div class="set-row"><span class="lbl l-tp"></span><div class="seg s-tp"></div></div>${inHell() && state.adminTrip ? '<div class="set-row"><span class="lbl"></span><button class="tp-back"></button></div>' : ''}<p class="note n-admin"></p></section>` : ''}`;
  el.querySelector('.menu-head b')!.textContent = L.settings;
  (el.querySelector('.menu-close') as HTMLButtonElement).onclick = () => el.remove();
  el.querySelector('.set-sec h4')!.textContent = L.setSound;
  el.querySelector('.l-bgm')!.textContent = L.setBgm;
  el.querySelector('.l-sfx')!.textContent = L.setSfx;
  el.querySelector('.h-lang')!.textContent = L.setLang;
  el.querySelector('.h-acc')!.textContent = L.setAccount;
  const seg = <T extends string>(box: Element, vals: T[], labels: string[], cur: () => T, pick: (v: T) => void) => {
    const draw = () => {
      box.innerHTML = '';
      vals.forEach((v, k) => {
        const b = document.createElement('button');
        b.textContent = labels[k];
        b.className = v === cur() ? 'on' : '';
        b.setAttribute('aria-pressed', String(v === cur()));
        b.onclick = () => { unlockAudio(); pick(v); draw(); };
        box.appendChild(b);
      });
    };
    draw();
  };
  seg(el.querySelector('.s-bgm')!, ['music', 'nature', 'off'] as BgmMode[], L.bgmOpts, bgmMode, (v) => setBgmMode(v));
  seg(el.querySelector('.s-sfx')!, ['on', 'off'], L.onOff, () => (isMuted() ? 'off' : 'on'), (v) => setMuted(v === 'off'));
  seg(el.querySelector('.s-lang')!, LANGS, LANGS.map((l) => (l === 'ko' ? '한국어' : l === 'th' ? 'ไทย' : 'English')), lang, (v) => { changeLang(v); renderSettings(); });
  renderAccountSettings(el.querySelector('.acc')!);
  if (el.querySelector('.set-admin')) {
    el.querySelector('.h-admin')!.textContent = L.setAdmin;
    el.querySelector('.l-inv')!.textContent = L.adminInvisible;
    el.querySelector('.n-admin')!.textContent = L.adminNote;
    seg(el.querySelector('.s-inv')!, ['off', 'on'], L.adminOpts, () => (invisible() ? 'on' : 'off'), (v) => {
      localStorage.setItem(INVIS_KEY, v === 'on' ? '1' : '0');
      world?.setInvisible(v === 'on');
      net.nudge();
      toast(v === 'on' ? L.invisibleOn : L.invisibleOff);
    });
    // 지옥 층 이동: 지금 있는 층이 눌린 채로 보인다
    el.querySelector('.l-tp')!.textContent = L.adminTp;
    const floors = Array.from({ length: OPEN_FLOORS }, (_, k) => String(k + 1));
    seg(el.querySelector('.s-tp')!, floors, floors.map((f) => L.adminFloor.replace('{n}', f)), () => (inHell() ? String(hellState().floor) : ''), (v) => adminTeleport(Number(v)));
    const back = el.querySelector<HTMLButtonElement>('.tp-back');
    if (back) { back.textContent = L.adminBack.replace('{w}', state.adminTrip === 'heaven' ? L.tripHeaven : state.adminTrip === 'ghost' ? L.tripGhost : L.tripReal); back.onclick = () => adminTeleport('back'); }
  }
  document.body.appendChild(el);
  const hudBottom = document.getElementById('hud')?.getBoundingClientRect().bottom ?? 56;
  el.style.top = `${Math.round(hudBottom + 6)}px`;
  el.style.maxHeight = `calc(100vh - ${Math.round(hudBottom + 20)}px)`;
}
/** 내 영혼: 비회원은 안내 한 줄, 회원은 아이디·이름·이메일·비밀번호·프로필·떠나기 */
function renderAccountSettings(box: Element) {
  const L = t();
  const acc = net.account();
  box.innerHTML = '';
  if (!acc) {
    const p = document.createElement('p');
    p.className = 'note';
    p.textContent = L.setGuest;
    box.append(p);
    return;
  }
  box.innerHTML = `
    <div class="set-row"><span class="lbl"></span><span class="val id"></span></div>
    <div class="set-field f-name"><label><span class="lbl"></span><div class="inline"><input class="name" maxlength="12" autocomplete="nickname" spellcheck="false"><button class="name-go"></button></div></label><small class="hint"></small><small class="f-err"></small></div>
    <div class="set-field f-mail"><label><span class="lbl"></span><span class="chip"></span><div class="inline"><input class="mail" type="email" inputmode="email" maxlength="120" autocomplete="email" autocapitalize="none" spellcheck="false"><button class="mail-go"></button></div></label><small class="hint"></small><small class="f-err"></small></div>
    <details class="set-field f-pw"><summary></summary><div class="pw-box"><input class="pw-old" type="password" autocomplete="current-password" maxlength="72"><input class="pw-new" type="password" autocomplete="new-password" maxlength="72"><small class="f-err"></small><div class="row"><button class="pw-go"></button></div></div></details>
    <div class="set-field f-prof"><span class="lbl"></span><input class="intro" maxlength="140"><input class="contact" maxlength="80"><div class="row"><button class="logout"></button><button class="save primary"></button></div></div>`;
  const q = <T extends Element>(s: string) => box.querySelector(s) as T;
  const lbls = box.querySelectorAll('.lbl');
  lbls[0].textContent = L.setId; lbls[1].textContent = L.setName; lbls[2].textContent = L.setEmail; lbls[3].textContent = L.profileTitle;
  q<HTMLElement>('.val.id').textContent = acc.username;
  const nameIn = q<HTMLInputElement>('.name'), nameGo = q<HTMLButtonElement>('.name-go'), nameErr = q<HTMLElement>('.f-name .f-err');
  const mailIn = q<HTMLInputElement>('.mail'), mailGo = q<HTMLButtonElement>('.mail-go'), mailErr = q<HTMLElement>('.f-mail .f-err'), chip = q<HTMLElement>('.chip');
  const intro = q<HTMLInputElement>('.intro'), contact = q<HTMLInputElement>('.contact');
  nameIn.placeholder = L.setNamePh;
  nameIn.value = acc.name ?? '';
  q<HTMLElement>('.f-name .hint').textContent = acc.name ? L.setNameRule : `${L.noName} ${L.setNameRule}`;
  nameGo.textContent = acc.name ? L.setNameChange : L.setNameMake;
  mailIn.placeholder = L.emailPh;
  q<HTMLElement>('.f-mail .hint').textContent = L.emailRule;
  q<HTMLElement>('.f-pw summary').textContent = L.setPw;
  q<HTMLInputElement>('.pw-old').placeholder = L.pwOld;
  q<HTMLInputElement>('.pw-new').placeholder = L.pwNew;
  q<HTMLButtonElement>('.pw-go').textContent = L.pwBtn;
  intro.placeholder = L.introPh; contact.placeholder = L.contactPh;
  q<HTMLButtonElement>('.save').textContent = L.save;
  q<HTMLButtonElement>('.logout').textContent = L.logout;
  let verified = false, savedMail = '';
  const drawMail = () => {
    const same = mailIn.value.trim().toLowerCase() === savedMail && !!savedMail;
    chip.textContent = same && verified ? L.emailVerified : L.emailNot;
    chip.className = 'chip' + (same && verified ? ' ok' : '');
    chip.hidden = !savedMail;
    mailGo.textContent = same && !verified ? L.emailResend : L.emailSend;
    mailGo.disabled = same && verified;
  };
  net.loadServer().then((r) => {
    if (!r) return;
    intro.value = r.profile?.intro ?? ''; contact.value = r.profile?.contact ?? '';
    savedMail = (r.email ?? '').toLowerCase(); verified = !!r.email_verified;
    mailIn.value = r.email ?? '';
    if (r.name && !nameIn.value) nameIn.value = r.name;
    drawMail();
  });
  drawMail();
  mailIn.oninput = () => { mailErr.textContent = ''; drawMail(); };
  nameIn.oninput = () => { nameErr.textContent = ''; nameIn.classList.remove('bad'); };
  const busyBtn = async <T,>(b: HTMLButtonElement, f: () => Promise<T>) => { b.disabled = true; try { return await f(); } finally { b.disabled = false; } };
  nameGo.onclick = async () => {
    const v = nameIn.value.trim();
    if (!/^[0-9A-Za-z_\uAC00-\uD7A3\u0E01-\u0E5B]{2,12}$/.test(v)) { nameErr.textContent = L.nameErr.bad; nameIn.classList.add('bad'); return; }
    const r = await busyBtn(nameGo, () => net.setName(v));
    if (r.name) {
      toast(L.nameDone.replace('{name}', r.name), 'good');
      net.nudge();
      renderAccountSettings(box);
    } else { nameErr.textContent = (L.nameErr[r.error ?? 'net'] ?? L.nameErr.net).replace('{n}', String(r.days ?? 7)); nameIn.classList.add('bad'); }
  };
  mailGo.onclick = async () => {
    const v = mailIn.value.trim();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v)) { mailErr.textContent = L.emailErr.bad; return; }
    const r = await busyBtn(mailGo, () => net.sendVerify(v, lang()));
    if (r.ok) { savedMail = (r.email ?? v).toLowerCase(); verified = false; drawMail(); mailErr.textContent = ''; toast(L.emailSent.replace('{email}', r.email ?? v), 'good'); }
    else mailErr.textContent = L.emailErr[r.error ?? 'net'] ?? L.emailErr.net;
    drawMail();
  };
  const pwGo = q<HTMLButtonElement>('.pw-go'), pwErr = q<HTMLElement>('.f-pw .f-err');
  pwGo.onclick = async () => {
    const o = q<HTMLInputElement>('.pw-old').value, n = q<HTMLInputElement>('.pw-new').value;
    if (n.length < 6 || n.length > 72) { pwErr.textContent = L.pwErr.bad_pw; return; }
    const r = await busyBtn(pwGo, () => net.setPassword(o, n));
    if (r.ok) { pwErr.textContent = ''; q<HTMLInputElement>('.pw-old').value = ''; q<HTMLInputElement>('.pw-new').value = ''; (q<HTMLDetailsElement>('.f-pw')).open = false; toast(L.pwDone, 'good'); }
    else pwErr.textContent = L.pwErr[r.error ?? 'net'] ?? L.pwErr.net;
  };
  const sv = q<HTMLButtonElement>('.save');
  sv.onclick = async () => { const ok = await busyBtn(sv, () => net.setProfile(intro.value, contact.value, savedMail)); toast(ok ? L.saved : L.errNet); };
  q<HTMLButtonElement>('.logout').onclick = async () => { await net.pushSave(state, true); await net.logout(); renderHud(); renderSettings(); };
}

const escHtml = (v: string) => v.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
/** 지금 있는 곳의 이름 (상단 왼쪽) */
function placeName() {
  const L = t();
  const r = realm();
  if (scene === 'shop') return r === 'hell' ? L.hellShop : L.shopLabel;
  if (world?.zone.interior) return world.zone.interior.name;
  if (r === 'hell') { const f = hellState().floor; return L.hellPlace.replace('{n}', String(f)).replace('{name}', floorDef(f).name[lang()]); }
  const z = L.zones[world?.zone.id ?? ''] ?? '';
  return r === 'ghost' ? L.ghostPlace.replace('{zone}', z) : r === 'heaven' ? L.heavenPlace.replace('{zone}', z) : z;
}

let hudNarrow = false;
// 영혼 설정 단추: 빛살 두른 고리
const SET_SVG = '<svg viewBox="0 0 20 20" width="16" height="16" aria-hidden="true"><circle cx="10" cy="10" r="3.1" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M10 1.8v2.6M10 15.6v2.6M1.8 10h2.6M15.6 10h2.6M4.2 4.2l1.9 1.9M13.9 13.9l1.9 1.9M4.2 15.8l1.9-1.9M13.9 6.1l1.9-1.9" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>';
document.addEventListener('pointerdown', unlockAudio, true);
// 길게 누르기 = 이동이라, 게임 화면에서는 길게 눌러도 메뉴가 뜨지 않게
document.getElementById('game')?.addEventListener('contextmenu', (e) => e.preventDefault());
addEventListener('resize', () => { if (!hud.hidden && matchMedia('(max-width: 640px)').matches !== hudNarrow) renderHud(); });

/** 누른 건물·가까이 온 가게 이름: 위쪽 지역 이름 자리에 잠깐 바꿔 보여 준다 (팝업 없음) */
let placeTimer = 0;
function showPlace(name: string, sub: string) {
  const el = hud.querySelector('.hud-left .where') as HTMLElement | null;
  if (!el) return;
  el.innerHTML = `<b></b>${sub ? '<small></small>' : ''}`;
  (el.querySelector('b') as HTMLElement).textContent = name;
  if (sub) (el.querySelector('small') as HTMLElement).textContent = sub;
  el.classList.remove('flash'); void el.offsetWidth; el.classList.add('flash', 'is-place');
  clearTimeout(placeTimer);
  placeTimer = window.setTimeout(() => {
    el.classList.remove('flash', 'is-place');
    el.innerHTML = '';
    const b = document.createElement('b');
    b.textContent = el.dataset.zone ?? '';
    el.append(b);
  }, 2600);
}

function updateHpBar(hp: number, max: number) {
  const bar = hud.querySelector('.hpbar > i') as HTMLElement | null;
  if (!bar) return;
  const r = Math.max(0, Math.min(1, hp / max));
  bar.style.width = `${r * 100}%`;
  bar.parentElement!.classList.toggle('danger', isDanger(hp, max));
}

function updateHud() {
  // 좁은 화면에서는 '방콕'·'지갑' 글자를 빼고 숫자만 (CSS가 .lbl을 숨김)
  const el = hud.querySelector('.clock');
  if (el) el.innerHTML = `${inHell() ? '' : `<span class="lbl">${t().bkk}</span> `}${bangkokClock().label}`;
  const w = hud.querySelector('.wallet');
  if (w) w.innerHTML = inHell()
    ? `<span class="lbl">${t().notesLabel}</span> <i class="obol-ic"></i>${Math.floor(hellState().notes).toLocaleString('en-US')}${(state.debt ?? 0) > 0 ? ` <span class="debt">${t().debtHud.replace('{n}', String(Math.ceil(state.debt ?? 0)))}</span>` : ''}`
    : `<span class="lbl">${t().wallet}</span> ฿${Math.floor(state.wallet ?? 0).toLocaleString('en-US')}`;
  updateHpBar(state.hp ?? maxHp(), maxHp());
}

boot();

// ───────────────────────── 영혼 창 (영격을 누르면): 스탯 · 프로필 ─────────────────────────
function toggleSoul() {
  const old = document.querySelector('.soul-panel');
  if (old) { old.remove(); return; }
  closeMenus();
  document.querySelector('.bag-panel')?.remove();
  renderSoul();
}
function spentPoints() {
  const s = stats();
  return STAT_KEYS.reduce((a, k) => a + s[k], 0) - STAT_KEYS.length;
}
function renderSoul() {
  document.querySelector('.soul-panel')?.remove();
  const L = t();
  const soul = state.soul!;
  const s = stats();
  const left = Math.max(0, (soul.rank - 1) * POINTS_PER_RANK - spentPoints());
  const el = document.createElement('div');
  el.className = 'soul-panel shop-menu';
  const need = soulExpToNext(soul.rank);
  el.innerHTML = `<div class="menu-head"><b></b><button class="menu-close">✕</button></div>
    <div class="soul-exp"><span></span><i class="xpbar"><i style="width:${Math.min(100, (soul.exp / need) * 100)}%"></i></i></div>
    <div class="soul-points"></div><div class="soul-stats"></div>`;
  el.querySelector('.menu-head b')!.textContent = `${L.soulTitle} · ${L.rank} ${soul.rank}`;
  el.querySelector('.soul-exp span')!.textContent = L.soulExp;
  el.querySelector('.soul-points')!.textContent = left ? L.points.replace('{n}', String(left)) : '';
  (el.querySelector('.menu-close') as HTMLButtonElement).onclick = () => el.remove();
  const list = el.querySelector('.soul-stats')!;
  for (const k of STAT_KEYS) {
    const row = document.createElement('div');
    row.className = 'stat-row';
    row.innerHTML = `<b></b><span></span><em></em>`;
    row.querySelector('b')!.textContent = L.statNames[k];
    row.querySelector('span')!.textContent = L.statDesc[k];
    row.querySelector('em')!.textContent = String(s[k]);
    if (left > 0 && s[k] < STAT_MAX) {
      const plus = document.createElement('button');
      plus.textContent = '+';
      plus.onclick = () => addStat(k);
      row.appendChild(plus);
    }
    list.appendChild(row);
  }
  document.body.appendChild(el);
  const hudBottom = document.getElementById('hud')?.getBoundingClientRect().bottom ?? 56;
  el.style.top = `${Math.round(hudBottom + 6)}px`;
  el.style.maxHeight = `calc(100vh - ${Math.round(hudBottom + 20)}px)`;
}
function addStat(k: StatKey) {
  const s = stats();
  s[k] += 1;
  save(state);
  if (k === 'vit') world?.setStats(s);
  else world?.setStats(s);
  renderSoul();
  updateHud();
}
// ───────────────────────── 거리 가게 (편의점·약국·식당·카페) ─────────────────────────
function openStore(kind: 'mart' | 'pharmacy' | 'food' | 'cafe', name: string, cuisine?: string) {
  closeMenus();
  document.querySelector('.store-panel')?.remove();
  const L = t();
  const el = document.createElement('div');
  el.className = 'store-panel shop-menu';
  el.innerHTML = `<div class="menu-head"><b></b><button class="menu-close">✕</button></div><p class="store-line"></p><div class="menu-list"></div>`;
  el.querySelector('.menu-head b')!.textContent = name;
  el.querySelector('.store-line')!.textContent = L.storeLine;
  (el.querySelector('.menu-close') as HTMLButtonElement).onclick = () => el.remove();
  const list = el.querySelector('.menu-list')!;
  const draw = () => {
    list.innerHTML = '';
    for (const { key, price } of menuFor(kind, cuisine)) {
      const it = itemByKey(key);
      const poor = (state.wallet ?? 0) < price;
      const row = itemRow(it, priceText(price), () => {
        if ((state.wallet ?? 0) < price) { toast(L.noMoney); return; }
        state.wallet = (state.wallet ?? 0) - price;
        if (it.now) {
          world?.heal(it.heal ?? 0);
          toast(L.ate.replace('{item}', it.name[lang()]));
        } else {
          addToBag(it);
          toast(L.bought.replace('{item}', it.name[lang()]));
        }
        save(state);
        updateHud();
        draw();
      }, poor);
      const tag = document.createElement('span');
      tag.className = 'act';
      tag.textContent = it.now ? L.eatHere : L.buy;
      row.appendChild(tag);
      row.classList.add('has-act');
      list.appendChild(row);
    }
  };
  draw();
  document.body.appendChild(el);
  const hudBottom = document.getElementById('hud')?.getBoundingClientRect().bottom ?? 56;
  el.style.top = `${Math.round(hudBottom + 6)}px`;
}

// ───────────────────────── 은행: 통장 돈은 죽어도 남는다 ─────────────────────────
function openBank(name: string) {
  closeMenus();
  document.querySelector('.store-panel')?.remove();
  const L = t();
  const el = document.createElement('div');
  el.className = 'store-panel shop-menu bank-panel';
  el.innerHTML = `<div class="menu-head"><b></b><button class="menu-close">✕</button></div>
    <p class="store-line"></p>
    <div class="bank-body">
      <div class="bank-row"><span>${L.wallet}</span><b class="b-wallet"></b></div>
      <div class="bank-row"><span>${L.bankBook}</span><b class="b-bank"></b></div>
      <input class="b-amt" type="number" inputmode="numeric" min="1" step="1" placeholder="${L.bankAmount}">
      <div class="bank-quick"></div>
      <div class="bank-act"><button class="primary b-in">${L.bankIn}</button><button class="primary b-out">${L.bankOut}</button></div>
      <p class="bank-note">${L.bankNote}</p>
      <div class="obol-ex"><div class="bank-row"><span>${L.obolEx}</span><b class="b-obol"></b></div><p class="bank-note">${L.obolExSub.replace('{r}', String(OBOL_RATE))}</p><div class="bank-quick obol-quick"></div></div>
    </div>`;
  el.querySelector('.menu-head b')!.textContent = name;
  el.querySelector('.store-line')!.textContent = L.bankLine;
  (el.querySelector('.menu-close') as HTMLButtonElement).onclick = () => el.remove();
  const amt = el.querySelector('.b-amt') as HTMLInputElement;
  const draw = () => {
    el.querySelector('.b-wallet')!.textContent = `฿${Math.floor(state.wallet ?? 0).toLocaleString('en-US')}`;
    el.querySelector('.b-bank')!.textContent = `฿${Math.floor(state.bank ?? 0).toLocaleString('en-US')}`;
    el.querySelector('.b-obol')!.textContent = L.obolFmt.replace('{n}', String(Math.floor(hellState().notes)));
  };
  // 노자돈: 지갑의 바트를 노전으로 바꿔 둔다 (죽어서 지옥에 가면 그대로 들고 간다 · 되돌릴 수 없음)
  for (const b of [100, 500, 1000]) {
    const btn = document.createElement('button');
    btn.textContent = L.obolExBtn.replace('{b}', b.toLocaleString('en-US')).replace('{n}', String(b / OBOL_RATE));
    btn.onclick = () => {
      if ((state.wallet ?? 0) < b) { toast(L.noMoney); return; }
      state.wallet = (state.wallet ?? 0) - b;
      hellState().notes += b / OBOL_RATE;
      save(state);
      updateHud();
      draw();
      toast(L.obolDone.replace('{n}', String(b / OBOL_RATE)), 'good');
    };
    el.querySelector('.obol-quick')!.appendChild(btn);
  }
  const quick = el.querySelector('.bank-quick')!;
  for (const n of [100, 500, 1000]) {
    const b = document.createElement('button');
    b.textContent = `฿${n.toLocaleString('en-US')}`;
    b.onclick = () => { amt.value = String(n); };
    quick.appendChild(b);
  }
  const all = document.createElement('button');
  all.textContent = L.bankAll;
  all.onclick = () => { amt.value = String(Math.floor(state.wallet ?? 0)); };
  quick.appendChild(all);
  const move = (dir: 1 | -1) => {
    const n = Math.floor(Number(amt.value));
    if (!n || n <= 0) { toast(L.bankAmount); return; }
    if (dir === 1 && n > Math.floor(state.wallet ?? 0)) { toast(L.noMoney); return; }
    if (dir === -1 && n > Math.floor(state.bank ?? 0)) { toast(L.bankShort); return; }
    state.wallet = (state.wallet ?? 0) - dir * n;
    state.bank = (state.bank ?? 0) + dir * n;
    save(state);
    updateHud();
    draw();
    toast((dir === 1 ? L.bankDone : L.bankTook).replace('{n}', n.toLocaleString('en-US')), 'good');
  };
  (el.querySelector('.b-in') as HTMLButtonElement).onclick = () => move(1);
  (el.querySelector('.b-out') as HTMLButtonElement).onclick = () => move(-1);
  draw();
  document.body.appendChild(el);
  const hudBottom = document.getElementById('hud')?.getBoundingClientRect().bottom ?? 56;
  el.style.top = `${Math.round(hudBottom + 6)}px`;
}

// ───────────────────────── 공격 태세 (오른쪽 아래) ─────────────────────────
let stance: Stance = 'talk';
const LOW_SVG = '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><g class="tall"><rect x="4" y="3" width="8" height="18" rx="1" fill="none" stroke="currentColor" stroke-width="1.8"/><rect x="13" y="9" width="7" height="12" rx="1" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M7 7h2M7 11h2M7 15h2M16 13h1M16 17h1" stroke="currentColor" stroke-width="1.6"/></g><g class="short"><rect x="3" y="14" width="18" height="7" rx="1" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M7 17.5h2M11 17.5h2M15 17.5h2" stroke="currentColor" stroke-width="1.6"/><path d="M12 3v7M9 7.5l3 3 3-3" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></g></svg>';
const stanceBox = document.createElement('div');
stanceBox.className = 'stance';
stanceBox.innerHTML = `<button class="st-low" aria-label="lower buildings">${LOW_SVG}</button><button class="st-hand" aria-label="interact">✋</button><button class="st-sword" aria-label="attack stance"><span class="sw">⚔</span><small></small></button>`;
document.body.appendChild(stanceBox);
stanceBox.hidden = true;
(stanceBox.querySelector('.st-hand') as HTMLButtonElement).onclick = () => setStance('talk');
// 건물 낮추기 (1층만 보이게) — 도심에서 길이 가려 움직이기 힘들 때
(stanceBox.querySelector('.st-low') as HTMLButtonElement).onclick = () => {
  if (!world) return;
  world.setLowBuildings(!world.low);
  stanceBox.classList.toggle('low', world.low);
  toast(world.low ? t().lowOn : t().lowOff);
};
(stanceBox.querySelector('.st-sword') as HTMLButtonElement).onclick = () => setStance(stance === 'hostile' ? 'all' : 'hostile');
function setStance(s: Stance) {
  stance = s;
  world?.setStance(s);
  stanceBox.dataset.mode = s;
  stanceBox.querySelector('small')!.textContent = s === 'talk' ? '' : t().stance[s];
  (stanceBox.querySelector('.st-sword') as HTMLElement).title = t().stance[s === 'talk' ? 'hostile' : s];
  (stanceBox.querySelector('.st-hand') as HTMLElement).title = t().stance.talk;
}
function showStance(on: boolean) {
  stanceBox.hidden = !on;
  stanceBox.classList.toggle('low', !!world?.low);
  (stanceBox.querySelector('.st-low') as HTMLElement).title = t().lowLabel;
  setStance(stance);
}

// ───────────────────────── 다른 사람 (실시간) ─────────────────────────
function personMenu(id: string, info: RemoteInfo, x: number, y: number, attack: () => void) {
  const L = t();
  const name = info.member ? info.nick || info.name : L.guestName;
  const opts: { label: string; danger?: boolean; act: () => void }[] = [];
  if (info.member) opts.push({ label: L.viewProfile, act: () => showProfile(info.name) });
  opts.push({ label: L.act.force, danger: true, act: attack });
  if (info.member && net.account()) opts.push({ label: L.report, danger: true, act: () => reportMenu(info.name, x, y) });
  opts.push({ label: L.act.close, act: () => undefined });
  openTargetMenu(name, L.playerSub, opts, x, y);
  void id;
}
async function showProfile(username: string) {
  const L = t();
  const p = await net.getProfile(username);
  if (!p) { toast(L.errNet); return; }
  const lines = [`${L.rank} ${p.rank}`, p.intro || L.noIntro, p.contact || ''].filter(Boolean).join('\n');
  npcSay(p.name || p.username, lines);
}
function reportMenu(username: string, x: number, y: number) {
  const L = t();
  openTargetMenu(L.report, username, L.reportReasons.map((r) => ({ label: r, act: async () => toast((await net.report(username, r)) ? L.reported : L.errNet) })), x, y);
}

// ───────────────────────── 이 세상에서 살기 (가입 · 로그인) ─────────────────────────
let installEvt: (Event & { prompt(): Promise<void> }) | null = null;
window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); installEvt = e as Event & { prompt(): Promise<void> }; });
const standalone = () => window.matchMedia('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;

function openSignup(tab: 'signup' | 'login' | 'forgot') {
  document.querySelector('.signup')?.remove();
  closeMenus();
  const L = t();
  const el = document.createElement('div');
  el.className = 'signup';
  el.innerHTML = `<div class="signup-box">
    <div class="tabs"><button data-t="signup"></button><button data-t="login"></button></div>
    <h2></h2><p class="sub"></p>
    <label><span class="l-id"></span><input class="id" inputmode="email" autocomplete="username" autocapitalize="none" autocorrect="off" spellcheck="false" maxlength="16"><small class="r-id"></small><small class="f-err e-id"></small></label>
    <label class="pw-row"><span class="l-pw"></span><input class="pw" type="password" autocomplete="new-password" maxlength="72"><small class="r-pw"></small><small class="f-err e-pw"></small></label>
    <label class="pw2-row"><span class="l-pw2"></span><input class="pw2" type="password" autocomplete="new-password" maxlength="72"><small class="f-err e-pw2"></small></label>
    <p class="err"></p><button class="forgot linkish"></button>
    <div class="row"><button class="go primary"></button><button class="cancel"></button></div></div>`;
  const q = <T extends Element>(s: string) => el.querySelector(s) as T;
  const [tSign, tLogin] = el.querySelectorAll('.tabs button') as NodeListOf<HTMLButtonElement>;
  tSign.textContent = L.signupTab; tLogin.textContent = L.loginTab;
  q<HTMLElement>('.l-id').textContent = L.idLabel; q<HTMLElement>('.l-pw').textContent = L.pwLabel; q<HTMLElement>('.l-pw2').textContent = L.pw2Label;
  q<HTMLElement>('.r-id').textContent = L.idRule; q<HTMLElement>('.r-pw').textContent = L.pwRule;
  q<HTMLButtonElement>('.cancel').textContent = L.later;
  const setTab = (tb: 'signup' | 'login' | 'forgot') => {
    tab = tb;
    el.dataset.tab = tb;
    q<HTMLElement>('h2').textContent = tb === 'signup' ? L.signupTitle : tb === 'forgot' ? L.forgot : L.loginTab;
    q<HTMLElement>('.sub').textContent = tb === 'signup' ? L.signupSub : tb === 'forgot' ? L.forgotSub : '';
    q<HTMLButtonElement>('.go').textContent = tb === 'signup' ? L.signup : tb === 'forgot' ? L.forgotBtn : L.login;
    q<HTMLElement>('.err').textContent = '';
    q<HTMLElement>('.err').classList.remove('info');
    tSign.classList.toggle('on', tb === 'signup'); tLogin.classList.toggle('on', tb !== 'signup');
  };
  q<HTMLButtonElement>('.forgot').textContent = L.forgot;
  q<HTMLButtonElement>('.forgot').onclick = () => setTab('forgot');
  tSign.onclick = () => setTab('signup');
  tLogin.onclick = () => setTab('login');
  q<HTMLButtonElement>('.cancel').onclick = () => el.remove();
  const go = q<HTMLButtonElement>('.go');
  // 문제가 있는 칸 바로 아래에 빨갛게 (예전엔 맨 아래 한 줄이라 비밀번호 문제처럼 보였다)
  const fieldErr = (f: 'id' | 'pw' | 'pw2' | null, msg = '') => {
    for (const k of ['id', 'pw', 'pw2'] as const) {
      q<HTMLElement>(`.e-${k}`).textContent = k === f ? msg : '';
      q<HTMLInputElement>(`.${k}`).classList.toggle('bad', k === f);
    }
    q<HTMLElement>('.err').textContent = '';
  };
  const idIn = q<HTMLInputElement>('.id');
  idIn.addEventListener('input', () => {
    const v = idIn.value.trim().toLowerCase();
    fieldErr(/^[a-z0-9_]*$/.test(v) ? null : 'id', L.idBadChar);
  });
  go.onclick = async () => {
    const id = idIn.value.trim().toLowerCase(), pw = q<HTMLInputElement>('.pw').value, pw2 = q<HTMLInputElement>('.pw2').value;
    const err = q<HTMLElement>('.err');
    fieldErr(null);
    // 아이디: 영어·숫자 (대문자는 소문자로 바꿔 받는다 · 밑줄 _ 은 받아 주지만 안내하지 않는다)
    if (!/^[a-z0-9_]*$/.test(id)) { fieldErr('id', L.idBadChar); idIn.focus(); return; }
    if (id.length < 4 || id.length > 16) { fieldErr('id', L.idBadLen); idIn.focus(); return; }
    if (tab === 'forgot') {
      go.disabled = true;
      const r = await net.requestReset(id, lang());
      go.disabled = false;
      err.classList.add('info');
      err.textContent = r.ok ? L.forgotSent : r.error === 'wait' ? L.forgotWait : L.errNet;
      return;
    }
    if (pw.length < 6) { fieldErr('pw', L.pwRule); return; }
    if (tab === 'signup' && pw !== pw2) { fieldErr('pw2', L.pwMismatch); return; }
    go.disabled = true;
    if (tab === 'signup') {
      const r = await net.register(id, pw, state);
      go.disabled = false;
      if ('token' in r && r.token) { el.remove(); welcome(id); renderHud(); }
      else {
        const e = 'error' in r ? r.error : 'net';
        if (e === 'taken') fieldErr('id', L.errTaken);
        else if (e === 'bad_id') fieldErr('id', L.idBadChar);
        else if (e === 'bad_pw') fieldErr('pw', L.pwRule);
        else err.textContent = L.errNet;
      }
    } else {
      const r = await net.login(id, pw);
      go.disabled = false;
      if ('token' in r && r.token) {
        // 서버에 남은 삶이 있으면 그것을 이어서 한다
        if (r.save && typeof r.save === 'object') { save(r.save as typeof state); location.reload(); return; }
        await net.pushSave(state, true);
        el.remove(); welcome(id); renderHud();
      } else err.textContent = 'error' in r && r.error === 'bad' ? L.errBad : L.errNet;
    }
  };
  setTab(tab);
  document.body.appendChild(el);
  q<HTMLInputElement>('.id').focus();
}
/** 가입을 마친 뒤: 환영 + 홈 화면 설치 */
function welcome(id: string) {
  const L = t();
  const el = document.createElement('div');
  el.className = 'signup';
  el.innerHTML = `<div class="signup-box"><h2></h2><p class="sub"></p><p class="ios"></p><div class="row"><button class="inst primary"></button><button class="ok"></button></div></div>`;
  el.querySelector('h2')!.textContent = L.signupTitle;
  el.querySelector('.sub')!.textContent = L.welcome.replace('{id}', id);
  const inst = el.querySelector('.inst') as HTMLButtonElement, ok = el.querySelector('.ok') as HTMLButtonElement;
  inst.textContent = L.install; ok.textContent = L.close;
  const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
  if (standalone()) inst.hidden = true;
  else if (!installEvt && ios) { inst.hidden = true; el.querySelector('.ios')!.textContent = L.installIos; }
  else if (!installEvt) inst.hidden = true;
  inst.onclick = async () => { if (installEvt) { await installEvt.prompt(); installEvt = null; inst.textContent = L.installed; inst.disabled = true; } };
  ok.onclick = () => el.remove();
  document.body.appendChild(el);
}

// ───────────────────────── 미스 황의 전화 (비회원, 처음 거리로 나선 뒤 5분) ─────────────────────────
const CALL_AFTER = params.has('call') ? 5 : 300;
setInterval(() => {
  if (scene !== 'world' || realm() !== 'real' || net.account() || state.called || busy || dlg.isOpen) return;
  state.streetSecs = (state.streetSecs ?? 0) + 1;
  if (state.streetSecs >= CALL_AFTER) { state.called = true; save(state); phoneCall(); }
}, 1000);
function phoneCall() {
  const L = t();
  const el = document.createElement('div');
  el.className = 'phone';
  el.innerHTML = `<div class="phone-box"><div class="ring">📱</div><b></b><span></span><div class="row"><button class="ans primary"></button><button class="dec"></button></div></div>`;
  el.querySelector('b')!.textContent = L.clerk;
  el.querySelector('span')!.textContent = L.ring;
  const ans = el.querySelector('.ans') as HTMLButtonElement, dec = el.querySelector('.dec') as HTMLButtonElement;
  ans.textContent = L.answer; dec.textContent = L.decline;
  try { navigator.vibrate?.([300, 200, 300, 200, 300]); } catch { /* 무시 */ }
  dec.onclick = () => el.remove();
  ans.onclick = async () => {
    el.remove();
    busy = true;
    dlg.open({ name: L.clerk, portrait: 'miss-hwang' });
    await dlg.say(L.callLine);
    const yes = await dlg.choose([L.yes, L.no]);
    dlg.close();
    busy = false;
    if (yes === 0) openSignup('signup');
  };
  document.body.appendChild(el);
}

// ───────────────────────── 서버 저장 (회원) ─────────────────────────
setInterval(() => { if (net.account()) net.pushSave(state); }, 20000);
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden' && net.account()) net.pushSave(state); });
if (net.account()) net.loadServer().then((r) => { if (!r) renderHud(); else net.nudge(); });

/** 메일의 '새 비밀번호 정하기' 링크로 들어왔을 때 (?reset=코드) */
(() => {
  const code = new URLSearchParams(location.search).get('reset');
  if (!code || !/^[0-9a-f]{48}$/.test(code)) return;
  history.replaceState(null, '', location.pathname);
  const L = t();
  const el = document.createElement('div');
  el.className = 'signup';
  el.innerHTML = `<div class="signup-box"><h2></h2><label><span class="l-pw"></span><input class="pw" type="password" autocomplete="new-password" maxlength="72"><small class="r-pw"></small></label><label><span class="l-pw2"></span><input class="pw2" type="password" autocomplete="new-password" maxlength="72"></label><p class="err"></p><div class="row"><button class="go primary"></button><button class="cancel"></button></div></div>`;
  const q = <T extends Element>(s: string) => el.querySelector(s) as T;
  q<HTMLElement>('h2').textContent = L.resetTitle;
  q<HTMLElement>('.l-pw').textContent = L.pwNew; q<HTMLElement>('.l-pw2').textContent = L.pw2Label; q<HTMLElement>('.r-pw').textContent = L.pwRule;
  const go = q<HTMLButtonElement>('.go'), err = q<HTMLElement>('.err');
  go.textContent = L.resetBtn; q<HTMLButtonElement>('.cancel').textContent = L.close;
  q<HTMLButtonElement>('.cancel').onclick = () => el.remove();
  go.onclick = async () => {
    const pw = q<HTMLInputElement>('.pw').value, pw2 = q<HTMLInputElement>('.pw2').value;
    if (pw.length < 6 || pw.length > 72) { err.textContent = L.pwErr.bad_pw; return; }
    if (pw !== pw2) { err.textContent = L.pwMismatch; return; }
    go.disabled = true;
    const r = await net.finishReset(code, pw);
    go.disabled = false;
    if (r.ok) { el.remove(); toast(L.resetDone, 'good'); openSignup('login'); const idIn = document.querySelector('.signup .id') as HTMLInputElement | null; if (idIn && r.username) idIn.value = r.username; }
    else err.textContent = r.error === 'bad_pw' ? L.pwErr.bad_pw : r.error === 'net' ? L.errNet : L.resetBad;
  };
  document.body.appendChild(el);
})();

// 홈 화면 설치용 서비스 워커
if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('./sw.js').catch(() => undefined);
