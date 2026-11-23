// Heaven's Manual — 1단계: 우주새 상점(첫 장면, 무작위 처음 모습) → "나는 누구였지" → 이번 생의 모습 → 수쿰빗 거리
// 1단계-B: 대상 메뉴와 싸움, 체력·위험 상태·차 사고, 돈 줍기와 노동, 가방(먹기·장착), 죽음과 심판, 다시 우주새에서 눈뜨기
import { Application } from 'pixi.js';
import './style.css';
import { WorldScene, type WorldHooks, type Stance, type RemoteInfo } from './world.ts';
import { ShopRoom, type ShopTarget } from './shoproom.ts';
import { Dialog } from './dialog.ts';
import { openLookPanel, lookPanelInsets } from './lookpanel.ts';
import { ITEMS, STORES, itemIcon, effectText, priceText, type ItemDef, type ItemCat } from './items.ts';
import * as net from './net.ts';
import { preloadPortrait } from './portraits.ts';
import { sukhumvitTestZone, decodeZone, type Zone } from './zone.ts';
import { streetReady } from './street.ts';
import { ARRIVALS, rollArrival, arrivalLook, type Arrival, type Look, type Outfit } from './character.ts';
import { t, lang, setLang, LANGS, type Lang } from './i18n.ts';
import { load, save, type Slot } from './state.ts';
import { bangkokClock } from './clock.ts';
import { applyDeed, addSoulExp, judge, isDanger, DEED_TABLE, newStats, soulExpToNext, maxHp as maxHpFor, POINTS_PER_RANK, STAT_KEYS, STAT_MAX, type DeedKey, type StatKey } from '../../../packages/shared/src/rules.ts';

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

const shopLabels = () => ({ hwang: t().clerk, parrot: t().parrot, door: t().doorLabel });

async function boot() {
  await app.init({ resizeTo: window, background: '#14110f', antialias: false, autoDensity: true, resolution: Math.min(2, window.devicePixelRatio || 1) });
  document.getElementById('game')!.appendChild(app.canvas);
  ui.hidden = true;
  shop = new ShopRoom(app, bodyLook(), false, shopLabels());
  shop.onArrive = onShopArrive;
  app.stage.addChild(shop.root);
  preloadPortrait('miss-hwang');
  enterShop(false);
  setInterval(updateHud, 1000);
  setInterval(() => save(state), 4000);
  if (import.meta.env.DEV || location.search.includes('debug')) (window as unknown as { __hm: unknown }).__hm = { shop: () => shop, world: () => world, state }; // 개발용 확인 창구
}

// ───────────────────────── 장면 전환 ─────────────────────────
function enterShop(fromStreet: boolean) {
  scene = 'shop';
  talkedThisVisit = false;
  closeMenus();
  world?.stop();
  if (world) world.root.visible = false;
  shop.setLook(bodyLook());
  shop.enter(fromStreet);
  shop.start();
  renderHud();
  showStance(false);
  net.leaveZone();
}

async function enterWorld() {
  shop.stop();
  scene = 'world';
  hud.hidden = true;
  ui.hidden = false;
  ui.className = 'scene loading';
  ui.textContent = t().loading;
  const [zone] = await Promise.all([zoneReady, streetReady]);
  ui.hidden = true;
  ui.textContent = '';
  ui.className = '';
  if (!world) {
    world = new WorldScene(app, zone, bodyLook(), () => enterShop(true), hooks, state.hp ?? maxHp());
    app.stage.addChild(world.root);
  }
  world.root.visible = true;
  world.setLook(bodyLook());
  world.setGear(gear());
  world.setStats(stats());
  world.placeAtDoor(state.hp ?? maxHp());
  world.setStance(stance);
  world.start();
  renderHud();
  showStance(true);
  const w = world;
  net.joinZone(w.zone.id, () => (scene === 'world' && world ? { info: myInfo(), pos: world.netPos() } : null), (id, info, pos) => w.upsertRemote(id, info, pos), (id) => w.removeRemote(id));
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
  deed(key) {
    recordDeed(key);
  },
  hp(hp, max) {
    state.hp = Math.max(0, hp);
    updateHpBar(hp, max);
  },
  died(cause) {
    showDeath(cause);
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
  },
  store(kind, name) {
    openStore(kind, name);
  },
  person(id, info, x, y) {
    personMenu(id, info, x, y);
  },
  useAmmo() {
    if ((state.ammo ?? 0) <= 0) { toast(t().noAmmo); return false; }
    state.ammo = (state.ammo ?? 0) - 1;
    return true;
  },
};

/** 행위를 기록하고 영혼 경험치를 더한다 */
function recordDeed(key: DeedKey) {
  const L = t();
  const res = applyDeed(state.deeds ?? { good: 0, evil: 0 }, key);
  state.deeds = res.deeds;
  const rule = DEED_TABLE[key];
  const parts: string[] = [];
  if (rule.kind === 'good') parts.push(L.toastGood.replace('{n}', String(rule.points)));
  if (rule.kind === 'evil') parts.push(L.toastEvil.replace('{n}', String(rule.points)));
  if (res.exp) {
    parts.push(L.toastExp.replace('{n}', String(res.exp)));
    const soul = state.soul ?? { rank: 1, exp: 0 };
    const up = addSoulExp(soul.rank, soul.exp, res.exp);
    if (up.rank > soul.rank) parts.push(L.rankUp.replace('{n}', String(up.rank)));
    state.soul = { rank: up.rank, exp: up.exp };
  }
  toast(parts.join(' · '), rule.kind === 'evil' ? 'evil' : rule.kind === 'good' ? 'good' : '');
  renderHud();
}

// ───────────────────────── 상점 안 ─────────────────────────
function onShopArrive(target: ShopTarget) {
  if (busy) return;
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
  dlg.open({ name: L.clerk, portrait: 'miss-hwang' });
  if (!talkedThisVisit) {
    if (!state.look) {
      await dlg.say(L.greetFirst);
      await dlg.say(L.react[state.arrival!.kind]);
    } else await dlg.say(L.greetUsual);
  }
  talkedThisVisit = true;
  for (;;) {
    const picked = await pickItem();
    if (!picked) {
      await dlg.say(L.closeMenu);
      break;
    }
    const name = picked.name[lang()];
    const line = picked.cat === 'weapon' ? L.pickWeapon : picked.cat === 'armor' ? L.pickArmor : L.pickGoods;
    await dlg.say(line.replace('{item}', name).replace('{iyo}', iyo(name)));
    if ((state.wallet ?? 0) >= picked.price) {
      state.wallet = (state.wallet ?? 0) - picked.price;
      addToBag(picked);
      save(state);
      renderHud();
      await dlg.say(L.bought.replace('{item}', name));
      const c = await dlg.choose([L.more, L.enough]);
      if (c === 1) break;
      continue;
    }
    await dlg.say(L.noMoney);
    await dlg.say(L.goEarn);
    const c = await dlg.choose([L.exit, L.browse]);
    if (c === 0) {
      endTalk();
      shop.goTo('door');
      return;
    }
  }
  endTalk();
}

function endTalk() {
  dlg.close();
  shop.lock(false);
  busy = false;
}

/** 상품 창을 띄우고, 고른 물건(닫으면 null)을 돌려준다 */
function pickItem(): Promise<ItemDef | null> {
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
      for (const it of ITEMS.filter((x) => x.cat === cat && !x.store)) list.appendChild(itemRow(it, priceText(it.price), () => done(it), (state.wallet ?? 0) < it.price));
    };
    render();
    dlg.setPanel(el);
    dlg.say(L.pickPrompt);
  });
}

function itemRow(it: ItemDef, right: string, onClick: () => void, dim = false) {
  const b = document.createElement('button');
  b.className = 'menu-item' + (dim ? ' dim' : '');
  const ic = itemIcon(it.key);
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
  const armor = Object.entries(eq).filter(([slot, k]) => slot !== 'weapon' && k).map(([, k]) => k as string);
  return { atk: pistol ? ((state.ammo ?? 0) > 0 ? w.atk ?? 0 : 1) : w?.atk ?? 0, def, ranged: pistol && (state.ammo ?? 0) > 0, weapon: w?.key ?? null, armor };
}
/** 실시간으로 남에게 보이는 나 */
function myInfo(): RemoteInfo {
  const g = gear();
  const acc = net.account();
  return { name: acc?.username ?? '', look: bodyLook(), weapon: g.weapon, armor: g.armor, member: !!acc };
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
    const label = it.heal ? (it.key === 'bandage' ? L.use : L.eat) : slot ? (on ? L.unequip : L.equip) : '';
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
function showDeath(cause: 'car' | 'beaten') {
  const L = t();
  closeMenus();
  document.querySelector('.bag-panel')?.remove();
  const d = state.deeds ?? { good: 0, evil: 0 };
  const j = judge(d);
  const verdict = j.world === 'heaven' ? L.judgeHeaven : j.world === 'hell' ? L.judgeHell.replace('{n}', String(j.floor)) : L.judgeGhost;
  const el = document.createElement('div');
  el.className = 'death';
  el.innerHTML = `<div class="death-box"><h1></h1><p class="cause"></p><p class="karma"></p><p class="verdict"></p><p class="closed"></p><button class="primary"></button></div>`;
  el.querySelector('h1')!.textContent = L.deathTitle;
  el.querySelector('.cause')!.textContent = cause === 'car' ? L.deathCar : L.deathBeaten;
  el.querySelector('.karma')!.textContent = L.karma.replace('{g}', String(d.good)).replace('{e}', String(d.evil));
  el.querySelector('.verdict')!.textContent = verdict;
  el.querySelector('.closed')!.textContent = L.judgeClosed;
  const btn = el.querySelector('button')!;
  btn.textContent = L.reborn;
  btn.onclick = () => {
    el.remove();
    newLife();
    save(state);
    world?.revive(bodyLook());
    world?.setGear(gear());
    enterShop(false);
  };
  document.body.appendChild(el);
  requestAnimationFrame(() => el.classList.add('show'));
}

// ───────────────────────── 상단 표시줄 ─────────────────────────
function renderHud() {
  const L = t();
  hud.hidden = false;
  const place = scene === 'shop' ? L.shopLabel : L.zones[world?.zone.id ?? ''] ?? '';
  const live = !net.account() ? `<button class="live">${L.live}</button>` : '';
  hud.innerHTML = `
    <div class="hud-left"><b>${place}</b>${scene === 'shop' ? `<span class="hint">${L.hintShop}</span>` : ''}<span class="work">${workLine}</span></div>
    <div class="hud-tools">${live}<div class="hud-right">
      <span class="clock"></span>
      <span class="hpbox" title="${L.hpLabel}"><i class="hpbar"><i></i></i></span>
      <span class="wallet"></span>
      <button class="to-soul">${L.rank} ${state.soul?.rank ?? 1}</button>
      <button class="to-bag">${L.bag}</button>
      <select class="lang" aria-label="language">${LANGS.map((l) => `<option value="${l}" ${l === lang() ? 'selected' : ''}>${l === 'ko' ? '한국어' : l === 'th' ? 'ไทย' : 'English'}</option>`).join('')}</select>
    </div></div>
    ${scene === 'world' && world?.zone.attribution ? '<a class="attrib" href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">© OpenStreetMap</a>' : ''}`;
  (hud.querySelector('.to-bag') as HTMLButtonElement).onclick = toggleBag;
  (hud.querySelector('.to-soul') as HTMLButtonElement).onclick = toggleSoul;
  const lb = hud.querySelector('.live') as HTMLButtonElement | null;
  if (lb) lb.onclick = () => openSignup('signup');
  (hud.querySelector('.lang') as HTMLSelectElement).onchange = (e) => {
    const l = (e.target as HTMLSelectElement).value as Lang;
    setLang(l);
    state.lang = l;
    save(state);
    document.documentElement.lang = l;
    world?.relabel();
    shop.setLabels(shopLabels());
    renderHud();
  };
  updateHud();
}

function updateHpBar(hp: number, max: number) {
  const bar = hud.querySelector('.hpbar > i') as HTMLElement | null;
  if (!bar) return;
  const r = Math.max(0, Math.min(1, hp / max));
  bar.style.width = `${r * 100}%`;
  bar.parentElement!.classList.toggle('danger', isDanger(hp, max));
}

function updateHud() {
  const el = hud.querySelector('.clock');
  if (el) el.textContent = `${t().bkk} ${bangkokClock().label}`;
  const w = hud.querySelector('.wallet');
  if (w) w.textContent = `${t().wallet} ฿${Math.floor(state.wallet ?? 0).toLocaleString('en-US')}`;
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
    <div class="soul-points"></div><div class="soul-stats"></div><div class="soul-account"></div>`;
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
  renderAccountBox(el.querySelector('.soul-account')!);
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
/** 영혼 창 아래: 비회원이면 '살기로 결정', 회원이면 프로필 */
function renderAccountBox(box: Element) {
  const L = t();
  const acc = net.account();
  box.innerHTML = '';
  if (!acc) {
    const p = document.createElement('p');
    p.className = 'note';
    p.textContent = L.guestNote; // 가입 단추는 화면 위쪽에 이미 있으니 여기서는 다시 그리지 않는다
    box.append(p);
    return;
  }
  box.innerHTML = `<p class="note"></p><b class="prof-title"></b><input class="intro" maxlength="140"><input class="contact" maxlength="80"><input class="email" type="email" maxlength="120"><div class="row"><button class="save primary"></button><button class="logout"></button></div>`;
  box.querySelector('.note')!.textContent = `${acc.username} · ${L.memberNote}`;
  box.querySelector('.prof-title')!.textContent = L.profileTitle;
  const intro = box.querySelector('.intro') as HTMLInputElement, contact = box.querySelector('.contact') as HTMLInputElement, email = box.querySelector('.email') as HTMLInputElement;
  intro.placeholder = L.introPh; contact.placeholder = L.contactPh; email.placeholder = L.emailPh;
  net.loadServer().then((r) => { if (r) { intro.value = r.profile?.intro ?? ''; contact.value = r.profile?.contact ?? ''; email.value = r.email ?? ''; } });
  const sv = box.querySelector('.save') as HTMLButtonElement, lo = box.querySelector('.logout') as HTMLButtonElement;
  sv.textContent = L.save; lo.textContent = L.logout;
  sv.onclick = async () => { sv.disabled = true; const ok = await net.setProfile(intro.value, contact.value, email.value); sv.disabled = false; toast(ok ? L.saved : L.errNet); };
  lo.onclick = async () => { await net.pushSave(state, true); await net.logout(); renderHud(); renderSoul(); };
}

// ───────────────────────── 거리 가게 (편의점·약국·식당·카페) ─────────────────────────
function openStore(kind: 'mart' | 'pharmacy' | 'food' | 'cafe', name: string) {
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
    for (const { key, price } of STORES[kind]) {
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

// ───────────────────────── 공격 태세 (오른쪽 아래) ─────────────────────────
let stance: Stance = 'talk';
const stanceBox = document.createElement('div');
stanceBox.className = 'stance';
stanceBox.innerHTML = `<button class="st-hand" aria-label="interact">✋</button><button class="st-sword" aria-label="attack stance"><span class="sw">⚔</span><small></small></button>`;
document.body.appendChild(stanceBox);
stanceBox.hidden = true;
(stanceBox.querySelector('.st-hand') as HTMLButtonElement).onclick = () => setStance('talk');
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
  setStance(stance);
}

// ───────────────────────── 다른 사람 (실시간) ─────────────────────────
function personMenu(id: string, info: RemoteInfo, x: number, y: number) {
  const L = t();
  const name = info.member ? info.name : L.guestName;
  const opts: { label: string; danger?: boolean; act: () => void }[] = [];
  if (info.member) opts.push({ label: L.viewProfile, act: () => showProfile(info.name) });
  opts.push({ label: L.act.attack, act: () => toast(L.pvpLater) });
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
  npcSay(p.username, lines);
}
function reportMenu(username: string, x: number, y: number) {
  const L = t();
  openTargetMenu(L.report, username, L.reportReasons.map((r) => ({ label: r, act: async () => toast((await net.report(username, r)) ? L.reported : L.errNet) })), x, y);
}

// ───────────────────────── 이 세상에서 살기 (가입 · 로그인) ─────────────────────────
let installEvt: (Event & { prompt(): Promise<void> }) | null = null;
window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); installEvt = e as Event & { prompt(): Promise<void> }; });
const standalone = () => window.matchMedia('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;

function openSignup(tab: 'signup' | 'login') {
  document.querySelector('.signup')?.remove();
  closeMenus();
  const L = t();
  const el = document.createElement('div');
  el.className = 'signup';
  el.innerHTML = `<div class="signup-box">
    <div class="tabs"><button data-t="signup"></button><button data-t="login"></button></div>
    <h2></h2><p class="sub"></p>
    <label><span class="l-id"></span><input class="id" autocomplete="username" autocapitalize="none" spellcheck="false" maxlength="16"><small class="r-id"></small></label>
    <label><span class="l-pw"></span><input class="pw" type="password" autocomplete="new-password" maxlength="72"><small class="r-pw"></small></label>
    <label class="pw2-row"><span class="l-pw2"></span><input class="pw2" type="password" autocomplete="new-password" maxlength="72"></label>
    <p class="err"></p>
    <div class="row"><button class="go primary"></button><button class="cancel"></button></div></div>`;
  const q = <T extends Element>(s: string) => el.querySelector(s) as T;
  const [tSign, tLogin] = el.querySelectorAll('.tabs button') as NodeListOf<HTMLButtonElement>;
  tSign.textContent = L.signupTab; tLogin.textContent = L.loginTab;
  q<HTMLElement>('.l-id').textContent = L.idLabel; q<HTMLElement>('.l-pw').textContent = L.pwLabel; q<HTMLElement>('.l-pw2').textContent = L.pw2Label;
  q<HTMLElement>('.r-id').textContent = L.idRule; q<HTMLElement>('.r-pw').textContent = L.pwRule;
  q<HTMLButtonElement>('.cancel').textContent = L.later;
  const setTab = (tb: 'signup' | 'login') => {
    tab = tb;
    el.dataset.tab = tb;
    q<HTMLElement>('h2').textContent = tb === 'signup' ? L.signupTitle : L.loginTab;
    q<HTMLElement>('.sub').textContent = tb === 'signup' ? L.signupSub : '';
    q<HTMLButtonElement>('.go').textContent = tb === 'signup' ? L.signup : L.login;
    q<HTMLElement>('.err').textContent = '';
    tSign.classList.toggle('on', tb === 'signup'); tLogin.classList.toggle('on', tb === 'login');
  };
  tSign.onclick = () => setTab('signup');
  tLogin.onclick = () => setTab('login');
  q<HTMLButtonElement>('.cancel').onclick = () => el.remove();
  const go = q<HTMLButtonElement>('.go');
  go.onclick = async () => {
    const id = q<HTMLInputElement>('.id').value.trim().toLowerCase(), pw = q<HTMLInputElement>('.pw').value, pw2 = q<HTMLInputElement>('.pw2').value;
    const err = q<HTMLElement>('.err');
    if (!/^[a-z0-9_]{4,16}$/.test(id)) { err.textContent = L.idRule; return; }
    if (pw.length < 6) { err.textContent = L.pwRule; return; }
    if (tab === 'signup' && pw !== pw2) { err.textContent = L.pwMismatch; return; }
    go.disabled = true;
    if (tab === 'signup') {
      const r = await net.register(id, pw, state);
      go.disabled = false;
      if ('token' in r && r.token) { el.remove(); welcome(id); renderHud(); }
      else err.textContent = 'error' in r && r.error === 'taken' ? L.errTaken : L.errNet;
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
  if (scene !== 'world' || net.account() || state.called || busy || dlg.isOpen) return;
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
if (net.account()) net.loadServer().then((r) => { if (!r) renderHud(); });

// 홈 화면 설치용 서비스 워커
if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('./sw.js').catch(() => undefined);
