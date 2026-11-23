// Heaven's Manual — 1단계: 우주새 상점(첫 장면, 무작위 처음 모습) → "나는 누구였지" → 이번 생의 모습 → 수쿰빗 거리
// 1단계-B: 대상 메뉴와 싸움, 체력·위험 상태·차 사고, 돈 줍기와 노동, 가방(먹기·장착), 죽음과 심판, 다시 우주새에서 눈뜨기
import { Application } from 'pixi.js';
import './style.css';
import { WorldScene, PLAYER_MAX_HP, type WorldHooks } from './world.ts';
import { ShopRoom, type ShopTarget } from './shoproom.ts';
import { Dialog } from './dialog.ts';
import { openLookPanel, lookPanelInsets } from './lookpanel.ts';
import { ITEMS, itemIcon, effectText, priceText, type ItemDef, type ItemCat } from './items.ts';
import { preloadPortrait } from './portraits.ts';
import { sukhumvitTestZone, decodeZone, type Zone } from './zone.ts';
import { streetReady } from './street.ts';
import { ARRIVALS, rollArrival, arrivalLook, type Arrival, type Look, type Outfit } from './character.ts';
import { t, lang, setLang, LANGS, type Lang } from './i18n.ts';
import { load, save, type Slot } from './state.ts';
import { bangkokClock } from './clock.ts';
import { applyDeed, addSoulExp, judge, isDanger, DEED_TABLE, type DeedKey } from '../../../packages/shared/src/rules.ts';

const state = load();
if (state.lang) setLang(state.lang);
// 시험용: ?newlife 는 새 영혼으로 다시 시작, ?form=raincoat 처럼 처음 모습을 고정
const params = new URLSearchParams(location.search);
const forced = params.get('form') as Arrival | null;
if (params.has('newlife') || (forced && ARRIVALS.includes(forced))) newLife(forced && ARRIVALS.includes(forced) ? forced : undefined);
if (!state.look && !state.arrival) newLife();
state.soul ??= { rank: 1, exp: 0 };
save(state);

/** 새 생: 처음 모습을 뽑고, 이번 생의 것(돈·가방·업)은 비운다. 영혼(영격)은 남는다 */
function newLife(kind?: Arrival) {
  const k = kind ?? rollArrival();
  state.arrival = { kind: k, look: arrivalLook(k) };
  delete state.look;
  state.wallet = 0;
  state.bag = {};
  state.equip = {};
  state.ammo = 0;
  state.hp = PLAYER_MAX_HP;
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
    world = new WorldScene(app, zone, bodyLook(), () => enterShop(true), hooks, state.hp ?? PLAYER_MAX_HP);
    app.stage.addChild(world.root);
  }
  world.root.visible = true;
  world.setLook(bodyLook());
  world.setGear(gear());
  world.placeAtDoor(state.hp ?? PLAYER_MAX_HP);
  world.start();
  renderHud();
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
    workLine = st ? `${t().working} · ${st.name} · ${t().earned.replace('{n}', st.earned.toFixed(2))}` : '';
    const el = hud.querySelector('.work');
    if (el) el.textContent = workLine;
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
      for (const it of ITEMS.filter((x) => x.cat === cat)) list.appendChild(itemRow(it, priceText(it.price), () => done(it), (state.wallet ?? 0) < it.price));
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
  return { atk: pistol ? ((state.ammo ?? 0) > 0 ? w.atk ?? 0 : 1) : w?.atk ?? 0, def, ranged: pistol && (state.ammo ?? 0) > 0, weapon: w?.key ?? null };
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
        else state.hp = Math.min(PLAYER_MAX_HP, (state.hp ?? PLAYER_MAX_HP) + it.heal);
      } else if (slot) {
        state.equip = state.equip ?? {};
        if (on) delete state.equip[slot]; else state.equip[slot] = k;
        world?.setGear(gear());
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
  hud.innerHTML = `
    <div class="hud-left"><b>${place}</b>${scene === 'shop' ? `<span class="hint">${L.hintShop}</span>` : ''}<span class="work">${workLine}</span></div>
    <div class="hud-right">
      <span class="clock"></span>
      <span class="hpbox" title="${L.hpLabel}"><i class="hpbar"><i></i></i><em class="hpnum"></em></span>
      <span class="wallet"></span>
      <span>${L.rank} ${state.soul?.rank ?? 1}</span>
      <button class="to-bag">${L.bag}</button>
      <select class="lang" aria-label="language">${LANGS.map((l) => `<option value="${l}" ${l === lang() ? 'selected' : ''}>${l === 'ko' ? '한국어' : l === 'th' ? 'ไทย' : 'English'}</option>`).join('')}</select>
    </div>
    ${scene === 'world' && world?.zone.attribution ? '<a class="attrib" href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">© OpenStreetMap</a>' : ''}`;
  (hud.querySelector('.to-bag') as HTMLButtonElement).onclick = toggleBag;
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
  const num = hud.querySelector('.hpnum');
  if (!bar || !num) return;
  const r = Math.max(0, Math.min(1, hp / max));
  bar.style.width = `${r * 100}%`;
  bar.parentElement!.classList.toggle('danger', isDanger(hp, max));
  num.textContent = `${Math.ceil(hp)}`;
}

function updateHud() {
  const el = hud.querySelector('.clock');
  if (el) el.textContent = `${t().bkk} ${bangkokClock().label}`;
  const w = hud.querySelector('.wallet');
  if (w) w.textContent = `${t().wallet} ฿${Math.floor(state.wallet ?? 0).toLocaleString('en-US')}`;
  updateHpBar(state.hp ?? PLAYER_MAX_HP, PLAYER_MAX_HP);
}

boot();
