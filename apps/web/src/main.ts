// Heaven's Manual — 1단계: 우주새 상점(첫 장면, 무작위 처음 모습) → "나는 누구였지" → 이번 생의 모습 → 수쿰빗 거리
import { Application } from 'pixi.js';
import './style.css';
import { WorldScene } from './world.ts';
import { ShopRoom, type ShopTarget } from './shoproom.ts';
import { Dialog } from './dialog.ts';
import { openLookPanel, lookPanelInsets } from './lookpanel.ts';
import { ITEMS, itemIcon, effectText, priceText, type ItemDef, type ItemCat } from './items.ts';
import { preloadPortrait } from './portraits.ts';
import { sukhumvitTestZone, decodeZone, type Zone } from './zone.ts';
import { ARRIVALS, rollArrival, arrivalLook, type Arrival, type Look, type Outfit } from './character.ts';
import { t, lang, setLang, LANGS, type Lang } from './i18n.ts';
import { load, save } from './state.ts';
import { bangkokClock } from './clock.ts';

const state = load();
if (state.lang) setLang(state.lang);
// 시험용: ?newlife 는 새 영혼으로 다시 시작, ?form=raincoat 처럼 처음 모습을 고정
const params = new URLSearchParams(location.search);
const forced = params.get('form') as Arrival | null;
if (params.has('newlife') || (forced && ARRIVALS.includes(forced))) {
  delete state.look;
  delete state.arrival;
  state.visits = 0;
}
if (!state.look && !state.arrival) {
  const kind = forced && ARRIVALS.includes(forced) ? forced : rollArrival();
  state.arrival = { kind, look: arrivalLook(kind) };
  save(state);
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
  if (import.meta.env.DEV || location.search.includes('debug')) (window as unknown as { __hm: unknown }).__hm = { shop: () => shop, world: () => world, state }; // 개발용 확인 창구
}

// ───────────────────────── 장면 전환 ─────────────────────────
function enterShop(fromStreet: boolean) {
  scene = 'shop';
  talkedThisVisit = false;
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
  const zone = await zoneReady;
  ui.hidden = true;
  ui.textContent = '';
  ui.className = '';
  if (!world) {
    world = new WorldScene(app, zone, bodyLook(), () => enterShop(true));
    app.stage.addChild(world.root);
  }
  world.root.visible = true;
  world.setLook(bodyLook());
  world.placeAtDoor();
  world.start();
  renderHud();
}

function leaveShop() {
  state.visits += 1;
  save(state);
  enterWorld();
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
      for (const it of ITEMS.filter((x) => x.cat === cat)) {
        const b = document.createElement('button');
        b.className = 'menu-item';
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
        pr.textContent = priceText(it.price);
        b.append(ic, nm, ef, pr);
        b.onclick = () => done(it);
        list.appendChild(b);
      }
    };
    render();
    dlg.setPanel(el);
    dlg.say(L.pickPrompt);
  });
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

// ───────────────────────── 상단 표시줄 ─────────────────────────
function renderHud() {
  const L = t();
  hud.hidden = false;
  const place = scene === 'shop' ? L.shopLabel : L.zones[world?.zone.id ?? ''] ?? '';
  hud.innerHTML = `
    <div class="hud-left"><b>${place}</b><span class="hint">${scene === 'shop' ? L.hintShop : L.hint}</span></div>
    <div class="hud-right">
      <span class="clock"></span>
      <span>${L.wallet} ฿0</span>
      <span>${L.rank} 1</span>
      <select class="lang" aria-label="language">${LANGS.map((l) => `<option value="${l}" ${l === lang() ? 'selected' : ''}>${l === 'ko' ? '한국어' : l === 'th' ? 'ไทย' : 'English'}</option>`).join('')}</select>
    </div>
    ${scene === 'world' && world?.zone.attribution ? '<a class="attrib" href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">© OpenStreetMap</a>' : ''}`;
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

function updateHud() {
  const el = hud.querySelector('.clock');
  if (el) el.textContent = `${t().bkk} ${bangkokClock().label}`;
}

boot();
