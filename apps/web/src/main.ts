// Heaven's Manual — 1단계-A: 우주새 상점 → 캐릭터 만들기 → 수쿰빗 시험 구역
import { Application } from 'pixi.js';
import './style.css';
import { openShop } from './shop.ts';
import { openCreate } from './create.ts';
import { WorldScene } from './world.ts';
import { sukhumvitTestZone, decodeZone, type Zone } from './zone.ts';
import { DEFAULT_LOOK } from './character.ts';
import { t, lang, setLang, LANGS, type Lang } from './i18n.ts';
import { load, save } from './state.ts';
import { bangkokClock } from './clock.ts';

const state = load();
if (state.lang) setLang(state.lang);
document.documentElement.lang = lang();

const ui = document.getElementById('ui')!;
const hud = document.getElementById('hud')!;
const app = new Application();
let world: WorldScene | null = null;
let closeShop: (() => void) | null = null;

// 실제 지도 존을 미리 불러 둔다 (실패하면 시험 구역)
const ZONE_URL = 'zones/bkk-sukhumvit-asok.json';
const zoneReady: Promise<Zone> = fetch(ZONE_URL)
  .then((r) => { if (!r.ok) throw new Error(String(r.status)); return r.json(); })
  .then((j) => decodeZone(j))
  .catch(() => sukhumvitTestZone());

async function boot() {
  await app.init({ resizeTo: window, background: '#14110f', antialias: false, autoDensity: true, resolution: Math.min(2, window.devicePixelRatio || 1) });
  document.getElementById('game')!.appendChild(app.canvas);
  showShop();
  setInterval(updateHud, 1000);
}

function showShop() {
  world?.stop();
  app.canvas.style.visibility = 'hidden';
  hud.hidden = true;
  ui.hidden = false;
  closeShop = openShop(ui, state.visits, () => {
    state.visits += 1;
    save(state);
    if (!state.look) showCreate();
    else enterWorld();
  });
}

function showCreate() {
  ui.hidden = false;
  openCreate(ui, state.look ?? DEFAULT_LOOK, (look) => {
    state.look = look;
    save(state);
    enterWorld();
  });
}

async function enterWorld() {
  closeShop?.();
  ui.className = 'scene loading';
  ui.textContent = t().loading;
  const zone = await zoneReady;
  ui.hidden = true;
  ui.innerHTML = '';
  ui.className = '';
  app.canvas.style.visibility = 'visible';
  if (!world) {
    world = new WorldScene(app, zone, state.look ?? DEFAULT_LOOK, () => showShop());
    app.stage.addChild(world.root);
    if (import.meta.env.DEV || location.search.includes('debug')) (window as unknown as { __hm: unknown }).__hm = world; // 개발용 확인 창구
  } else world.setLook(state.look ?? DEFAULT_LOOK);
  world.start();
  hud.hidden = false;
  renderHud();
}

function renderHud() {
  const L = t();
  hud.innerHTML = `
    <div class="hud-left"><b>${L.zones[world?.zone.id ?? ''] ?? ''}</b><span class="hint">${L.hint}</span></div>
    <div class="hud-right">
      <span class="clock"></span>
      <span>${L.wallet} ฿0</span>
      <span>${L.rank} 1</span>
      <button class="to-shop">${L.shopName}</button>
      <button class="to-look">${L.editLook}</button>
      <select class="lang" aria-label="language">${LANGS.map((l) => `<option value="${l}" ${l === lang() ? 'selected' : ''}>${l === 'ko' ? '한국어' : l === 'th' ? 'ไทย' : 'English'}</option>`).join('')}</select>
    </div>
    ${world?.zone.attribution ? '<a class="attrib" href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">© OpenStreetMap</a>' : ''}`;
  (hud.querySelector('.to-shop') as HTMLButtonElement).onclick = () => showShop();
  (hud.querySelector('.to-look') as HTMLButtonElement).onclick = () => { world?.stop(); app.canvas.style.visibility = 'hidden'; hud.hidden = true; showCreate(); };
  (hud.querySelector('.lang') as HTMLSelectElement).onchange = (e) => {
    const l = (e.target as HTMLSelectElement).value as Lang;
    setLang(l);
    state.lang = l;
    save(state);
    document.documentElement.lang = l;
    world?.relabel();
    renderHud();
  };
  updateHud();
}

function updateHud() {
  const el = hud.querySelector('.clock');
  if (el) el.textContent = `${t().bkk} ${bangkokClock().label}`;
}

boot();
