// Heaven's Manual — 1단계: 우주새 상점(첫 장면, 무작위 처음 모습) → "나는 누구였지" → 이번 생의 모습 → 수쿰빗 거리
// 1단계-B: 대상 메뉴와 싸움, 체력·위험 상태·차 사고, 돈 줍기와 노동, 가방(먹기·장착), 죽음과 심판, 다시 우주새에서 눈뜨기
import './canvasfix.ts'; // 29차: 맨 먼저 — 2D 캔버스를 메모리 쪽에
import { Application } from 'pixi.js';
import './style.css';
import { WorldScene, type WorldHooks, type Stance, type RemoteInfo } from './world.ts';
import { ShopRoom, type ShopTarget } from './shoproom.ts';
import { Dialog } from './dialog.ts';
import { openLookPanel, lookPanelInsets } from './lookpanel.ts';
import { ITEMS, STORES, menuFor, itemByKey, iconFor, itemIcon, effectText, priceText, moneyText, setWon, wonify, wonRate, cashText, HELL_FOOD, type ItemDef, type ItemCat } from './items.ts';
import * as net from './net.ts';
import { preloadPortrait, type PortraitSlot } from './portraits.ts';
import { sukhumvitTestZone, decodeZone, type Zone, type Building, type InteriorInfo } from './zone.ts';
import { streetReady } from './street.ts';
import { ARRIVALS, rollArrival, arrivalLook, type Arrival, type Look, type Outfit } from './character.ts';
import { t, lang, setLang, LANGS, type Lang } from './i18n.ts';
import { load, save, type Slot, type Stash } from './state.ts';
import { hellZone, OPEN_FLOORS, floorDef, MONSTERS, GUARDS, TOLL, ATONE_GOAL, GURMA_FULL, setRaidForce, FLOORS, FIELD_BOSS } from './hell.ts';
import type { HellVendor } from './zone.ts';
import { interiorZone, roomKind as roomKindOf, canEnter, voidZone, drawFurn } from './interior.ts';
import { heavenZone, HEAVEN_ID, heavenPriceMul } from './heavenworld.ts';
import { designateHomes, HOME_PRICE, FURN, furnByKey, type FurnDef } from './home.ts';
import { borderZone } from './border.ts';
import { TWO, DOT3, setDot3 } from './sprites.ts';
import { buildingName, hasBank } from './names.ts';
import { bangkokClock, seoulClock } from './clock.ts';
import { unlockAudio, isMuted, setMuted, plunge, chime } from './sfx.ts';
import * as sfx from './sfx.ts';
import { bgmMode, setBgmMode, setIndoor, type BgmMode } from './bgm.ts';
import { applyDeed, karmaPoints, fmtKarma, armorClass, addSoulExp, judge, evilRatio, HELL_START, prayerAnswerChance, restRegenPerMinute, isDanger, DEED_TABLE, newStats, soulExpToNext, maxHp as maxHpFor, POINTS_PER_RANK, STAT_KEYS, STAT_MAX, type DeedKey, type StatKey } from '../../../packages/shared/src/rules.ts';

const state = load();

/**
 * 36차 유령 누르기 막기: 휴대폰은 손가락을 뗀 뒤 같은 자리에 '클릭'을 한 번 더 보낸다. 그 사이 대사가 넘어가며 선택지·메뉴가
 * 손가락 밑에 새로 뜨면, 누르지도 않은 단추가 눌린다 (베스크 '1000닢 빌리기'가 저절로 눌리던 것).
 * 단추는 손가락이 그 단추 위에서 눌렸을 때만 눌린 것으로 친다 (키보드로 누른 것은 그대로)
 */
{
  let downEl: Element | null = null;
  document.addEventListener('pointerdown', (e) => { downEl = e.target as Element; }, true);
  document.addEventListener('click', (e) => {
    if (!e.isTrusted || e.detail === 0) return;
    const b = (e.target as Element | null)?.closest?.('button, .menu-item, [role="button"]');
    if (!b || (downEl && b.contains(downEl))) return;
    e.stopPropagation();
    e.preventDefault();
  }, true);
}
if (state.realm === 'ghost') { state.realm = 'border'; delete state.pos; } // 24차: 귀신은 없어졌다 — 떠돌던 영혼은 경계의 해변으로
if (state.lang) setLang(state.lang);
// 시험용: ?newlife 는 새 영혼으로 다시 시작, ?form=raincoat 처럼 처음 모습을 고정
const params = new URLSearchParams(location.search);
const forced = params.get('form') as Arrival | null;
if (params.has('newlife') || (forced && ARRIVALS.includes(forced))) newLife(forced && ARRIVALS.includes(forced) ? forced : undefined);
if (!state.look && !state.arrival) newLife();
state.soul ??= { rank: 1, exp: 0 };
state.soul.stats ??= newStats();
migrateDura();
save(state);
const stats = () => (state.soul!.stats ??= newStats());
const maxHp = () => maxHpFor(stats().vit);

/** 새 생: 처음 모습을 뽑고, 이번 생의 것(돈·가방·업)은 비운다. 영혼(영격)은 남는다 */
function newLife(kind?: Arrival) {
  const k = kind ?? rollArrival();
  state.arrival = { kind: k, look: arrivalLook(k) };
  delete state.look;
  state.wallet = 0;
  // 26차: 세계를 건너도 몸에 남는 물건(검은 마스크)은 새 생에도 그대로
  const cross = (k: string) => !!itemByKey(k)?.cross;
  const keepBag: Record<string, number> = {}, keepEq: Partial<Record<Slot, string>> = {};
  for (const [k, n] of Object.entries(state.bag ?? {})) if (n > 0 && cross(k)) keepBag[k] = n;
  for (const [slot, k] of Object.entries(state.equip ?? {})) if (k && cross(k)) keepEq[slot as Slot] = k;
  state.bag = keepBag;
  state.equip = keepEq;
  state.ammo = 0;
  state.arrows = 0;
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

// 19차: 수쿰빗을 대로를 따라 다섯 구역으로 나눴다 (나나 · 소이 8–17 · 아속 · 소이 20–33 · 프롬퐁). 우주새는 아속에만.
// 구역은 필요할 때 불러 두고(이웃 구역은 미리), 실패하면 시험 구역
const ZONE_IDS = ['bkk-nana', 'bkk-soi8-17', 'bkk-asok', 'bkk-soi20-33', 'bkk-phromphong'];
// 24차: 서울 강남 한 구역 (우주새가 있는 곳). 서울에서 태어난 몸은 서울 우주새 문으로 나간다
const SEOUL_IDS = ['seoul-gangnam'];
const ALL_ZONES = [...ZONE_IDS, ...SEOUL_IDS];
const homeZone = () => (state.region === 'seoul' ? 'seoul-gangnam' : 'bkk-asok');
const zoneCache = new Map<string, Promise<Zone>>();
function loadZone(id: string): Promise<Zone> {
  if (id === HEAVEN_ID) { let h = zoneCache.get(id); if (!h) zoneCache.set(id, (h = Promise.resolve(heavenZone()))); return h; } // 35차: 천국 1층은 구름 위에 따로 짓는다
  if (!ALL_ZONES.includes(id)) id = homeZone();
  let p = zoneCache.get(id);
  if (!p) {
    p = fetch(`zones/${id}.json`)
      .then((r) => { if (!r.ok) throw new Error(String(r.status)); return r.json(); })
      .then((j) => { const z = decodeZone(j); designateHomes(z); markOwned(z); return z; }) // 35차: 아속·강남에 분양 중인 집과 가구점
      .catch(() => { zoneCache.delete(id); return sukhumvitTestZone(); });
    zoneCache.set(id, p);
  }
  return p;
}
loadZone(homeZone());

const shopLabels = () => ({ hwang: state.realm === 'hell' ? t().hwanghon : t().clerk, parrot: t().parrot, door: t().doorLabel, goat: t().goatName, cage: t().cageName });
const realm = () => state.realm ?? 'real';
/** 관리자 캐릭터의 투명 모드 (관리자로 지정된 계정만) */
const INVIS_KEY = 'heavensmanual.invisible';
/** 19차: 자동 반격 (영혼 설정) — 기본은 켬 */
const COUNTER_KEY = 'heavensmanual.counter';
const autoCounter = () => { try { return localStorage.getItem(COUNTER_KEY) !== '0'; } catch { return true; } };
/** 38차 영혼 설정: 자동 회복(빠른 칸의 회복품을 체력이 몇 % 아래로 떨어지면) · 상점 알림 화살표 · PC 키 */
const HEAL_KEY = 'heavensmanual.autoheal', HEALPCT_KEY = 'heavensmanual.autohealpct', PING_KEY = 'heavensmanual.shopping', KEYS_KEY = 'heavensmanual.keys';
const lsGet = (k: string) => { try { return localStorage.getItem(k); } catch { return null; } };
const lsSet = (k: string, v: string) => { try { localStorage.setItem(k, v); } catch { /* 그만 */ } };
const autoHealOn = () => lsGet(HEAL_KEY) === '1';
const autoHealPct = () => Math.max(10, Math.min(80, Number(lsGet(HEALPCT_KEY) ?? 30) || 30));
type KeyAct = 'interact' | 'attack' | 'heal' | 'pick';
const KEY_ACTS: KeyAct[] = ['interact', 'attack', 'heal', 'pick'];
const KEY_DEFAULT: Record<KeyAct, string> = { interact: 'F1', attack: 'F2', heal: 'F3', pick: 'F4' };
const keyMap = (): Record<KeyAct, string> => { try { return { ...KEY_DEFAULT, ...(JSON.parse(lsGet(KEYS_KEY) ?? '{}') as Partial<Record<KeyAct, string>>) }; } catch { return { ...KEY_DEFAULT }; } };
const keyName = (code: string) => code.replace(/^Key/, '').replace(/^Digit/, '').replace(/^Numpad/, 'Num ');
const MOVE_KEYS = new Set(['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight']);
let keyCapture: ((code: string) => void) | null = null;
const invisible = () => !!net.account()?.admin && localStorage.getItem(INVIS_KEY) === '1';
/** 노자돈 환율: ฿10 = 노전 1닢 */
// 33차 노자돈 환전: 업(묵을 층 ÷ 13)만큼만, 값은 양쪽 다 형편없이 — 이승 돈은 저승에선 종이, 노전은 이승에선 쇳조각
const XCH_CASH_PER_OBOL = 1000; // 이승 돈 ฿1,000 = 1닢
const XCH_CASH_FEE_RATE = 0.3, XCH_CASH_FEE_BASE = 500; // 수수료: 바꾸는 돈의 3할 + ฿500 (통장에서 따로)
const XCH_BAHT_PER_OBOL = 1; // 1닢 = ฿1
const XCH_OBOL_FEE_RATE = 0.3, XCH_OBOL_FEE_BASE = 20; // 수수료: 바꾸는 노전의 3할 + 20닢
const xchShare = (floor: number) => Math.max(1, Math.min(13, floor)) / 13;
/** 업으로 정해지는 층 (지옥에서 시작할 층 · 환생 때도 같은 기준) */
function karmaFloor(): number {
  const j = judge(state.deeds ?? { good: 0, evil: 0 });
  return Math.max(HELL_START, j.world === 'hell' ? j.floor : HELL_START);
}
/**
 * 37차 선업의 값 (환생 상담 어디서든 · 다음 생 도시의 돈으로): 이승에서 선업을 올리는 데 드는 돈의 10분의 1.
 * 병원·학교 기부 ฿100 = 선업 0.2 → 선업 1 = ฿500 기부 → 선업 1마다 ฿50 (서울이면 ₩2,000)
 */
const GOOD_CASH_PER = 50;
function goodCash(): number {
  const g = state.deeds?.good ?? 0;
  return g < 0.1 ? 0 : Math.round(g * GOOD_CASH_PER);
}
/** 서울 사람인가 (돈 표기) */
const seoulCash = () => (state.nextLife?.region ?? state.region) === 'seoul';
const inHell = () => realm() === 'hell';
const hellState = () => (state.hell ??= { floor: 1, cleared: [], notes: 0 });

// ───────────────────────── 세계마다 봉인되는 물건 ─────────────────────────
/** 지금 가방(장착 포함)을 그 세계의 우주새에 봉인한다 */
function seal(w: 'real' | 'hell') {
  // 25차: 세계를 건너도 몸에 남는 물건(검은 마스크)은 봉인하지 않는다 — 끼고 있던 그대로 따라온다
  const cross = (k: string) => !!itemByKey(k)?.cross;
  const keepBag: Record<string, number> = {}, keepEq: Partial<Record<Slot, string>> = {};
  for (const [k, n] of Object.entries(state.bag ?? {})) if (n > 0 && cross(k)) keepBag[k] = n;
  for (const [slot, k] of Object.entries(state.equip ?? {})) if (k && cross(k)) keepEq[slot as Slot] = k;
  const bag = { ...(state.bag ?? {}) };
  for (const k of Object.keys(keepBag)) delete bag[k];
  for (const k of Object.values(state.equip ?? {})) if (k && !bag[k] && !cross(k)) bag[k] = 1;
  const keys = Object.keys(bag).filter((k) => bag[k] > 0);
  if (!keys.length && !(state.ammo ?? 0)) { state.bag = keepBag; state.equip = keepEq; return false; }
  state.vault ??= {};
  const v: Stash = state.vault[w] ?? { bag: {}, ammo: 0 };
  // 38차: 물건은 제 세계의 우리로 — 지옥 물건은 유황새, 현실 물건은 우주새 (다른 세계의 우리에 들어가 못 쓰게 되지 않게)
  for (const k of keys) {
    const home: 'real' | 'hell' = itemByKey(k)?.hell ? 'hell' : 'real';
    const dv: Stash = home === w ? v : (state.vault[home] ??= { bag: {}, ammo: 0 });
    dv.bag[k] = (dv.bag[k] ?? 0) + bag[k];
  }
  v.ammo += state.ammo ?? 0;
  if (state.arrows) v.bag.arrows20 = (v.bag.arrows20 ?? 0) + Math.ceil(state.arrows / 20);
  if (state.rifle) v.bag.rifleammo = (v.bag.rifleammo ?? 0) + Math.ceil(state.rifle / 10);
  state.vault[w] = v;
  state.bag = keepBag;
  state.equip = keepEq;
  state.ammo = 0;
  state.arrows = 0;
  state.rifle = 0;
  return true;
}
/** 38차: 현실 물건은 지옥에서, 지옥 물건은 현실·천국에서 쓰지 못한다 (세계를 건너는 검은 마스크 · 일기장 · 관리자는 예외) */
function worldOk(it: ItemDef | null | undefined): boolean {
  if (!it) return false;
  if (it.cross || it.use === 'diary' || net.account()?.admin) return true;
  return inHell() ? !!it.hell : !it.hell;
}
function vaultOf(w: 'real' | 'hell'): Stash | null {
  const v = state.vault?.[w];
  return v && (Object.values(v.bag).some((n) => n > 0) || v.ammo > 0) ? v : null;
}
function reclaim(w: 'real' | 'hell') {
  const v = vaultOf(w);
  if (!v) return;
  state.bag ??= {};
  for (const [k, n] of Object.entries(v.bag)) if (n > 0) { if (k === 'arrows20') state.arrows = (state.arrows ?? 0) + n * 20; else if (k === 'rifleammo') state.rifle = (state.rifle ?? 0) + n * 10; else state.bag[k] = (state.bag[k] ?? 0) + n; }
  state.ammo = (state.ammo ?? 0) + v.ammo;
  delete state.vault![w];
}

// ───────────────────────── 29차: 우주새 보관 우리 ─────────────────────────
/** 현실과 지옥의 우리는 따로 — 현실 우주새는 현실 우리, 유황새는 지옥 우리 */
const cageW = (): 'real' | 'hell' => (inHell() ? 'hell' : 'real');
/** 우리 칸의 열쇠 → 물건 (봉인할 때 화살은 'arrows20' 묶음으로 넣는다) */
const stashItem = (k: string) => itemByKey(k === 'arrows20' ? 'arrows' : k);
/**
 * 꺼낼 때 수수료: 꺼내는 물건 값을 모두 더한 것의 1할. 한 번 꺼낼 때 적어도 ฿20 (지옥 2닢).
 * 37차: 전엔 한 개마다 '적어도 ฿20'이라 콜라 열 개를 꺼내면 콜라 값만큼 수수료가 붙었다
 */
/** 38차: 싼 물건은 낮은 비율, 비싼 무기는 높은 비율 — ฿100 이하 2% · ฿1,000 4% · ฿10,000 6% · ฿100,000 8% · ฿1,000,000부터 10%.
 *  지옥 물건은 값의 단위가 열의 하나라 기준도 그만큼 (10닢 이하 2%). 최소는 ฿1 (지옥 1닢) — 물 한 병 꺼내는데 최소 수수료 ₩800이 붙던 것 */
const stashRate = (it: ItemDef) => Math.max(0.02, Math.min(0.1, 0.02 + 0.02 * Math.log10(Math.max(1, it.price) / (it.hell ? 10 : 100))));
const stashFee = (it: ItemDef) => it.price * stashRate(it);
const stashTotal = (sel: { it: ItemDef; n: number }[], hell: boolean) => Math.max(1, Math.round(sel.reduce((a, x) => a + stashFee(x.it) * x.n, 0)));
/** 가게 안 우리 그림에 맡긴 물건 몇 개를 보인다 */
function refreshCage() {
  const v = state.vault?.[cageW()];
  const icons: HTMLCanvasElement[] = [];
  if (v) for (const [k, n] of Object.entries(v.bag)) if (n > 0 && stashItem(k)) icons.push(iconFor(stashItem(k)));
  if (v?.ammo) icons.push(iconFor(itemByKey('ammo')));
  shop.setCage(icons);
}
/** 우리 창: 꺼내기(수수료) · 맡기기(공짜). 맡기는 것은 무엇이든 — 끼고 있는 하나뿐인 장비만 빼고 */
/** 34차 보관 우리 칸: 물건 종류 하나가 한 칸 (탄약 주머니도 한 칸). 처음 6칸, 돈을 내고 2칸씩 늘린다 (최대 30칸). 죽어서 봉인된 물건은 칸을 넘어도 들어간다 */
const CAGE_BASE = 6, CAGE_STEP = 2, CAGE_MAX = 30;
function cageCap(w: 'real' | 'hell') { return Math.min(CAGE_MAX, CAGE_BASE + (state.cageExtra?.[w] ?? 0)); }
function cageUsed(w: 'real' | 'hell') { const v = state.vault?.[w]; return v ? Object.values(v.bag).filter((n) => n > 0).length + (v.ammo > 0 ? 1 : 0) : 0; }
function cageExpandCost(w: 'real' | 'hell') { const k = (state.cageExtra?.[w] ?? 0) / CAGE_STEP + 1; return w === 'hell' ? 60 * k : 5000 * k; }
function openCage() {
  closeMenus();
  document.querySelector('.store-panel')?.remove();
  const L = t();
  const hell = inHell(), w = cageW();
  shop.lock(true);
  const el = document.createElement('div');
  el.className = 'store-panel shop-menu cage-panel';
  el.innerHTML = `<div class="menu-head"><b></b><button class="menu-close">✕</button></div><p class="store-line"></p><div class="menu-tabs store-tabs"></div><div class="menu-list"></div>`;
  el.querySelector('.menu-head b')!.textContent = L.cageName;
  el.querySelector('.store-line')!.textContent = hell ? L.cageLineHell : L.cageLine;
  const close = () => { el.remove(); if (!busy) shop.lock(false); };
  (el.querySelector('.menu-close') as HTMLButtonElement).onclick = close;
  const list = el.querySelector('.menu-list')!;
  const tabs = el.querySelector('.store-tabs')!;
  // 30차: 탭 셋 — 맡기기 / 현실 우리 / 지옥 우리. 현실 물건은 현실 우주새에서만, 지옥 물건은 유황새에서만 꺼낸다 (다른 쪽은 보기만)
  let mode: 'store' | 'real' | 'hell' = vaultOf(w) ? w : 'store';
  const bStore = document.createElement('button'), bReal = document.createElement('button'), bHell = document.createElement('button');
  bStore.textContent = L.cageStoreTab; bReal.textContent = L.cageRealTab; bHell.textContent = L.cageHellTab;
  bStore.onclick = () => { mode = 'store'; draw(); }; bReal.onclick = () => { mode = 'real'; draw(); }; bHell.onclick = () => { mode = 'hell'; draw(); };
  tabs.append(bStore, bReal, bHell);
  const empty = (txt: string) => { const p = document.createElement('p'); p.className = 'bag-empty'; p.textContent = txt; list.appendChild(p); };
  const draw = () => {
    list.innerHTML = '';
    bStore.classList.toggle('on', mode === 'store'); bReal.classList.toggle('on', mode === 'real'); bHell.classList.toggle('on', mode === 'hell');
    if (mode === 'store') {
      // 34차: 칸 수와 늘리기
      {
        const used = cageUsed(w), cap = cageCap(w), cost = cageExpandCost(w);
        const head = document.createElement('div'); head.className = 'cage-slots';
        const sp = document.createElement('span'); sp.textContent = L.cageSlots.replace('{u}', String(used)).replace('{m}', String(cap)); if (used >= cap) sp.className = 'full';
        const bx = document.createElement('button');
        bx.textContent = cap >= CAGE_MAX ? L.cageMaxed : L.cageExpand.replace('{n}', String(CAGE_STEP)).replace('{p}', priceText(cost, hell));
        bx.disabled = cap >= CAGE_MAX;
        bx.onclick = async () => {
          if (!(await confirmBox(L.cageExpandAsk.replace('{n}', String(CAGE_STEP)).replace('{p}', priceText(cost, hell)), L.cageExpandGo))) return;
          const have = hell ? hellState().notes : state.wallet ?? 0;
          if (have < cost) { toast(hell ? L.hwNoMoney : L.noMoney); return; }
          if (hell) hellState().notes -= cost; else state.wallet = (state.wallet ?? 0) - cost;
          ecoLog('spend', 'cage', cost, hell);
          state.cageExtra = { ...(state.cageExtra ?? {}), [w]: (state.cageExtra?.[w] ?? 0) + CAGE_STEP };
          save(state); renderHud();
          toast(L.cageExpanded.replace('{m}', String(cageCap(w))), 'good');
          draw();
        };
        head.append(sp, bx);
        list.appendChild(head);
      }
      const bag = state.bag ?? {};
      const worn = new Set(Object.values(state.equip ?? {}));
      const mine = Object.keys(bag).filter((k) => bag[k] > 0 && !(worn.has(k) && bag[k] <= 1)).map(itemByKey).filter(Boolean);
      if (!mine.length) { empty(L.cageNothingBag); return; }
      for (const it of mine) {
        const row = itemRow(it, `×${(bag[it.key] ?? 0) - (worn.has(it.key) ? 1 : 0)}`, async () => {
          const room = (state.bag?.[it.key] ?? 0) - (worn.has(it.key) ? 1 : 0);
          if (!((state.vault?.[w]?.bag[it.key] ?? 0) > 0) && cageUsed(w) >= cageCap(w)) { toast(L.cageFull, 'evil'); return; } // 34차: 새 종류는 빈 칸이 있어야
          const n = room > 1 ? await askQty(it, 0, room, 'store') : 1;
          if (n <= 0 || (state.bag?.[it.key] ?? 0) < n) return;
          state.bag![it.key] -= n;
          state.vault ??= {};
          const v = (state.vault[w] ??= { bag: {}, ammo: 0 });
          v.bag[it.key] = (v.bag[it.key] ?? 0) + n;
          save(state); updateHud(); renderQuick(); refreshCage();
          toast(L.cageStored.replace('{item}', it.name[lang()]).replace('{n}', String(n)));
          draw();
        });
        list.appendChild(row); // 탭 이름과 같은 글('맡기기')은 줄마다 다시 쓰지 않는다
      }
      return;
    }
    const tw = mode, here = tw === w;
    const v = vaultOf(tw);
    if (!here) { const p = document.createElement('p'); p.className = 'cage-note'; p.textContent = tw === 'real' ? L.cageOnlyReal : L.cageOnlyHell; list.appendChild(p); } // 비어 있어도 규칙은 알려 준다
    if (!v) { empty(L.cageEmpty); return; }
    const rows: { key: string; it: ItemDef; n: number; ammo?: boolean }[] = Object.entries(v.bag).filter(([k, n]) => n > 0 && stashItem(k)).map(([k, n]) => ({ key: k, it: stashItem(k), n }));
    if (v.ammo > 0) rows.push({ key: 'ammo', it: itemByKey('ammo'), n: Math.ceil(v.ammo / 12), ammo: true });
    // 32차: 꺼낼 물건을 눌러 여러 개 고른 뒤 한 번에 꺼낸다 (수수료도 한 번에)
    for (const k of [...picked.keys()]) if (!rows.some((r) => r.key === k)) picked.delete(k);
    if (here && rows.length) { const p = document.createElement('p'); p.className = 'cage-note'; p.textContent = L.cagePickHint; list.appendChild(p); }
    for (const r of rows) {
      const fee = stashFee(r.it);
      const k0 = picked.get(r.key);
      const row = itemRow(r.it, here ? (k0 ? `${L.cagePicked.replace('{n}', String(k0))} · ${priceText(Math.round(fee * k0), hell)}` : `×${r.n} · ${L.cageFeeEach.replace('{p}', priceText(Math.max(1, Math.round(fee)), hell))}`) : `×${r.n}`, async () => {
        if (!here) return;
        if (picked.has(r.key)) { picked.delete(r.key); draw(); return; }
        const n = r.n > 1 ? await askQty(r.it, Math.max(1, Math.round(fee)), r.n, 'take') : 1;
        if (n <= 0 || !document.body.contains(el)) return;
        picked.set(r.key, n);
        draw();
      }, !here);
      if (k0) row.classList.add('picked');
      list.appendChild(row);
    }
    if (!here || !rows.length) return;
    const foot = document.createElement('div');
    foot.className = 'cage-foot';
    const all = document.createElement('button');
    const everyOn = rows.every((r) => picked.get(r.key) === r.n);
    all.textContent = everyOn ? L.cagePickNone : L.cagePickAll;
    all.onclick = () => { if (everyOn) picked.clear(); else for (const r of rows) picked.set(r.key, r.n); draw(); };
    const go = document.createElement('button');
    go.className = 'primary';
    const sel = rows.filter((r) => picked.has(r.key)).map((r) => ({ r, n: picked.get(r.key)! }));
    const total = stashTotal(sel.map((x) => ({ it: x.r.it, n: x.n })), tw === 'hell');
    go.textContent = L.cageTakeSel.replace('{k}', String(sel.length)).replace('{p}', priceText(total, hell));
    go.disabled = !sel.length;
    go.onclick = async () => {
      if (!sel.length) return;
      el.remove();
      picked.clear();
      await parrotFee(sel, total, hell);
      if (document.body.contains(el)) return;
      openCage();
    };
    foot.append(all, go);
    list.appendChild(foot);
  };
  const picked = new Map<string, number>();
  draw();
  panelAt(el);
}
/** 꺼낼 때 — 앵무새가 여자 목소리로 수수료를 받는다 */
async function parrotFee(sel: { r: { key: string; it: ItemDef; n: number; ammo?: boolean }; n: number }[], fee: number, hell: boolean) {
  const L = t();
  const w = cageW();
  busy = true;
  shop.lock(true);
  dlg.open({ name: L.parrot, portrait: 'parrot' });
  await dlg.say(L.parrotVoice);
  await dlg.say(pick(L.parrotFee));
  const c = await dlg.choose([L.cagePay.replace('{p}', priceText(fee, hell)), L.cageNo]);
  if (c === 0) {
    const have = hell ? hellState().notes : state.wallet ?? 0;
    if (have < fee) { await dlg.say(pick(L.parrotBroke)); }
    else {
      if (hell) hellState().notes -= fee; else state.wallet = (state.wallet ?? 0) - fee;
      ecoLog('spend', 'fee', fee, hell);
      const v = state.vault![w]!;
      for (const { r, n } of sel) {
        if (r.ammo) { const k = Math.min(v.ammo, n * 12); state.ammo = (state.ammo ?? 0) + k; v.ammo -= k; ammoGear(); }
        else {
          v.bag[r.key] = Math.max(0, (v.bag[r.key] ?? 0) - n);
          if (r.key === 'arrows20') { state.arrows = (state.arrows ?? 0) + n * 20; ammoGear(); }
          else if (r.key === 'rifleammo') { state.rifle = (state.rifle ?? 0) + n * 10; ammoGear(); }
          else { state.bag ??= {}; state.bag[r.key] = (state.bag[r.key] ?? 0) + n; }
        }
      }
      if (!vaultOf(w)) delete state.vault![w];
      save(state); renderHud(); renderQuick(); refreshCage();
      await dlg.say(sel.length === 1 ? L.cageOpened.replace('{item}', sel[0].r.it.name[lang()]).replace('{n}', String(sel[0].n)) : L.cageOpenedMany.replace('{list}', sel.map(({ r, n }) => L.cageListItem.replace('{item}', r.it.name[lang()]).replace('{n}', String(n))).join(', ')));
    }
  } else await dlg.say(L.cageLeave);
  endTalk();
}

async function boot() {
  await app.init({ resizeTo: window, background: '#14110f', antialias: false, autoDensity: true, resolution: Math.min(DOT3 ? 3 : 2, window.devicePixelRatio || 1) }); // 31차: 도트 3배 시험 중에는 3배 화면까지
  // 느린 기기: 처음 몇 초 평균이 40fps 아래면 화면 밀도를 1로 낮춘다 (한 번만, 고해상도 휴대폰의 버벅임 줄이기)
  {
    let acc = 0, n = 0, skip = 360; // 불러오는 동안(처음 몇 초)은 세지 않는다
    const watch = () => {
      if (skip > 0) { skip--; return; }
      acc += app.ticker.FPS; n++;
      if (n < 240) return;
      const avg = acc / n; acc = 0; n = 0;
      if (avg < 40 && app.renderer.resolution > 1) {
        app.renderer.resolution = 1;
        app.renderer.resize(window.innerWidth, window.innerHeight);
        app.ticker.remove(watch);
      }
    };
    app.ticker.add(watch);
  }
  document.getElementById('game')!.appendChild(app.canvas);
  ui.hidden = true;
  shop = new ShopRoom(app, bodyLook(), false, shopLabels());
  shop.onArrive = onShopArrive;
  shop.onParrot = talkToParrot;
  shop.onGoat = () => npcSay(t().goatName, pick([t().goatTag, t().goatShop]));
  app.stage.addChild(shop.root);
  preloadPortrait('miss-hwang');
  // 다시 열면 마지막 자리에서 (현실·천국·귀신은 거리의 그 자리, 가게 안에서 일하던 중이면 그 가게 안에서 계속)
  const pos = state.pos && state.pos.w === realm() ? state.pos : null;
  const ghosted = returnedGhost(); // 31차: 살기로 결정하지 않고 며칠 비웠다 — 모르는 사이에 죽었다
  state.played ??= state.look ? RETURN_PLAYED : 0; // 예전 저장은 오래 한 사람으로 친다
  state.seen = Date.now();
  if (ghosted) fallToGoat('returned');
  else if (realm() === 'hell') enterHell(hellState().floor, 'resume');
  else if (realm() === 'border') enterBorder('resume');
  else if (pos && (state.look || realm() !== 'real')) resumeAt(pos);
  else if (realm() === 'ghost' || realm() === 'heaven') enterWorld(realm() === 'heaven' ? 'door' : undefined);
  else enterShop(false);
  setInterval(updateHud, 1000);
  setInterval(() => { snapPos(); state.played = (state.played ?? 0) + 4; state.seen = Date.now(); if (scene === 'world' && !document.hidden) ecoDay().t += 4; save(state); }, 4000);
  addEventListener('pagehide', () => { snapPos(); save(state); });
  if (import.meta.env.DEV || location.search.includes('debug')) (window as unknown as { __hm: unknown }).__hm = { shop: () => shop, world: () => world, state, hell: enterHell, deed: recordDeed, interior: enterInterior, raid: setRaidForce, pashar: () => talkToPashar(), bulda: () => talkToBulda(), border: (w: 'zero' | 'stillborn') => enterBorder(w), hellDeath: () => showHellDeath(), gearBag: () => { bagTab = 'gear'; renderBag(); }, mask: () => talkToMaskGirl(), gear: () => gear(), rooms: () => (world?.zone.buildings ?? []).map((b, k) => [k, roomKindOf(b), canEnter(b)]), leave: () => leaveInterior(), store: (k: 'tools' | 'antique', n: string) => openStore(k, n), terrace: () => enterTerrace(), officer: () => talkToOfficer(), pasharTalk: () => talkToPashar(), cage: () => openCage(), parrot: () => talkToParrot(), hstore: (k: HellVendor) => openHellStore(k), smith: () => openSmith(), soul: () => renderSoul(), give: (k: string) => { addToBag(itemByKey(k)); save(state); }, regear: () => world?.setGear(gear()), eco: () => openEcoStats(), perf: (v: boolean) => setPerf(v), xchTalk: () => talkToChanger(), shopIn: () => enterShop(true), ferum: () => talkToFerum(), parrotFeed: (n: number) => { state.parrotFed = n; save(state); }, wearW: (n: number) => { for (let i = 0; i < n; i++) wear('weapon'); }, setDura: (k: string, n: number) => { (state.dura ??= {})[k] = n; save(state); }, duraMax: (k: string) => duraMax(itemByKey(k)) }; // 개발용 확인 창구
  if (perfOn()) setPerf(true); // 34차: 관리자가 켜 둔 성능 표시
}

// ───────────────────────── 장면 전환 ─────────────────────────
/** 지금 서 있는 곳을 적어 둔다 (방 안이면 그 건물과, 일하는 중인지) */
function snapPos() {
  if (realm() === 'border') { delete state.pos; return; }
  if (scene !== 'world' || !world || world.isDead) { if (scene === 'shop') delete state.pos; return; }
  const inside = world.zone.interior;
  const base = inside && street ? street : world;
  const p = inside ? { x: inside.from.out.i + 0.5, y: inside.from.out.j + 0.5 } : base.netPos();
  state.pos = { w: realm(), z: base.zone.id, i: Math.floor(p.x), j: Math.floor(p.y), f: inHell() ? hellState().floor : undefined, k: inside ? inside.from.b : undefined, work: inside ? world.isWorkingInside || undefined : undefined };
}
/** 적어 둔 자리로 돌아간다 */
async function resumeAt(pos: NonNullable<typeof state.pos>) {
  await enterWorld([pos.i, pos.j], pos.z);
  if (!world || world.zone.id !== pos.z) return;
  if (pos.k !== undefined && world.zone.buildings[pos.k] && realm() === 'real') {
    enterInterior(pos.k, { i: pos.i, j: pos.j }, null, !!pos.work);
  }
}
/** 우주새 안도 쉬는 곳: 머문 시간만큼 체력이 찬다 (나올 때 계산) */
let shopSince = 0;
function restInShop() {
  if (!shopSince) return;
  const sec = (performance.now() - shopSince) / 1000;
  shopSince = 0;
  const max = maxHp();
  state.hp = Math.min(max, (state.hp ?? max) + (restRegenPerMinute(max, state.soul?.stats?.fai ?? 1) / 60) * sec);
}

/** 31차 수쿰빗 필드 보스가 나올 수 있는 구역 · 다시 나올 때까지의 시간 · 구역을 열 때 나올 확률 */
const FB_REAL: Record<string, { zones: string[]; every: number; chance: number }> = {
  mafiaboss: { zones: ['bkk-soi8-17', 'bkk-soi20-33', 'bkk-nana', 'bkk-phromphong'], every: 2 * 3600e3, chance: 0.3 },
  bkkeater: { zones: ['bkk-nana', 'bkk-phromphong'], every: 6 * 3600e3, chance: 0.2 },
};
/** 30차 길 안내 칩: 미스 황(황색날개)이 알려 준 곳으로 화살표가 이끄는 동안 위에 뜬다 — ✕로 끈다 */
function navChip(label: string | null) {
  document.querySelector('.nav-chip')?.remove();
  if (!label) return;
  const b = document.createElement('button');
  b.className = 'nav-chip';
  const s1 = document.createElement('span'); s1.textContent = t().navTo.replace('{place}', label);
  const x = document.createElement('i'); x.textContent = '✕';
  b.append(s1, x);
  b.title = t().navOff;
  b.onclick = () => { world?.clearGuide(); b.remove(); };
  document.body.appendChild(b);
}
// 30차: 가게 안에서도 차오르는 체력이 바로 보이게 — 1초마다 셈하고 체력 막대를 고친다 (예전엔 나갈 때 한 번에 계산)
setInterval(() => {
  if (scene !== 'shop' || !shopSince) return;
  restInShop();
  shopSince = performance.now();
  updateHpBar(state.hp ?? maxHp(), maxHp());
}, 1000);

function enterShop(fromStreet: boolean) {
  scene = 'shop';
  navChip(null); // 30차: 다른 곳으로 가면 길 안내는 끝
  workLine = '';
  shopSince = performance.now();
  document.querySelector('.store-panel')?.remove(); // 거리 가게·은행 창은 두고 오지 않는다
  setIndoor(true);
  talkedThisVisit = false;
  closeMenus();
  world?.stop();
  if (world) world.root.visible = false;
  { const r = realm(); shop.setRealm(r === 'heaven' || r === 'border' ? 'real' : r); }
  shop.setLabels(shopLabels());
  shop.setGoat(realm() === 'real' && Math.random() < 0.16); // 24차: 가끔 가게 안에 염소 (안에서는 들이받지 않는다)
  if (inHell()) preloadPortrait('hwanghon');
  shop.setLook(bodyLook(), gear()); // 입은 방어구 그대로 (맨몸이면 환자복 같은 처음 옷이 드러난다)
  refreshCage(); // 29차: 우리 안에 맡긴 물건
  shop.enter(fromStreet);
  shop.start();
  renderHud();
  showStance(false);
  net.leaveZone();
}

async function enterWorld(at: 'door' | [number, number] = 'door', zoneId?: string) {
  restInShop();
  dropInterior();
  // 어느 구역: 우주새 문 = 아속. 자리로 들어가면 주어진 구역 → 지금 서 있던 현실 구역 → 아속 (모르는 구역(옛 저장)이면 우주새 문 앞)
  if (zoneId !== undefined && !ALL_ZONES.includes(zoneId) && zoneId !== HEAVEN_ID) { at = 'door'; zoneId = undefined; }
  const zid = at === 'door' ? homeZone() : zoneId ?? (world && !world.zone.hell && !world.zone.interior && ALL_ZONES.includes(world.zone.id) && (world.zone.city === 'seoul') === (state.region === 'seoul') ? world.zone.id : homeZone());
  if (inHell()) { enterHell(hellState().floor, 'shop'); return; }
  const zidH = realm() === 'heaven' ? HEAVEN_ID : zid; // 35차: 천국은 현실 지도가 아니라 천국 1층
  if (realm() === 'heaven' && zoneId !== HEAVEN_ID) at = 'door';
  shop.stop();
  scene = 'world';
  setIndoor(false);
  hud.hidden = true;
  ui.hidden = false;
  ui.className = 'scene loading';
  ui.textContent = t().loading;
  const [zone] = await Promise.all([loadZone(zidH), streetReady]);
  ui.hidden = true;
  ui.textContent = '';
  ui.className = '';
  const want = realm() === 'ghost' ? 'ghost' : realm() === 'heaven' ? 'heaven' : 'real';
  if (world && (world.zone.hell || world.realm !== want || world.zone.id !== zone.id)) { world.destroy(); world = null; }
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
  world.setAutoCounter(autoCounter());
  world.start();
  renderHud();
  showStance(want !== 'ghost');
  for (const nb of [zone.edges?.w, zone.edges?.e]) if (nb) loadZone(nb); // 이웃 구역은 미리
  if (pendingEater && want === 'real') { pendingEater = false; setTimeout(() => world?.sendEater(), 1500); }
  if (pendingGuide !== null && want === 'real' && zone.id === homeZone()) { world.setGuide(pendingGuide); pendingGuide = null; }
  if (want === 'heaven') { world.setYwFollow(ywShouldFollow()); world.setAccubusMode(state.heaven?.acc); }
  if (want === 'ghost') { net.leaveZone(); return; } // 귀신은 산 사람들 사이에 보이지 않는다
  joinNet(world);
}

/** 19차: 구역 끝으로 걸어 나가면 이웃 구역으로 (같은 거리의 다음 토막). 좌표는 전체 지도 기준으로 맞춘다 */
let crossing = false;
async function crossEdge(dir: 'w' | 'e', x: number, y: number) {
  if (!world || crossing || busy || world.zone.interior || world.zone.hell || dlg.isOpen) return;
  const z = world.zone;
  const id = dir === 'w' ? z.edges?.w : z.edges?.e;
  if (!id) { toast(t().edgeEnd); return; }
  crossing = true;
  try {
    const next = await loadZone(id);
    if (!world || world.zone !== z) return;
    const o0 = z.origin ?? { i: 0, j: 0 }, o1 = next.origin ?? { i: 0, j: 0 };
    let ni = Math.floor(x) + o0.i - o1.i;
    const nj = Math.floor(y) + o0.j - o1.j;
    if (next.edges) ni = Math.max(next.edges.i0, Math.min(next.edges.i1 - 1, ni));
    const want = world.realm, crime = world.crimeT;
    closeMenus();
    world.destroy();
    net.leaveZone();
    world = new WorldScene(app, next, bodyLook(), () => enterShop(true), hooks, state.hp ?? maxHp(), { realm: want });
    app.stage.addChild(world.root);
    world.crimeT = crime;
    world.setLook(bodyLook());
    world.setGear(gear());
    world.setStats(stats());
    world.placeNear(ni, nj, state.hp ?? maxHp());
    world.setStance(stance);
    world.setInvisible(invisible());
    world.setAutoCounter(autoCounter());
    world.start();
    renderHud();
    if (want === 'heaven') world.setYwFollow(ywShouldFollow());
    showPlace(t().zones[id] ?? id, '');
    snapPos();
    save(state);
    for (const nb of [next.edges?.w, next.edges?.e]) if (nb) loadZone(nb);
    if (want !== 'ghost') joinNet(world);
  } finally {
    crossing = false;
  }
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

async function enterHell(floor: number, how: 'fall' | 'drop' | 'up' | 'down' | 'shop' | 'resume' | 'teleport', goat?: { reason: GkWhy; want: number } | null) {
  const fx = how === 'fall' || how === 'drop' || how === 'down' || how === 'teleport' ? hellFall(how === 'fall' || how === 'drop') : null;
  if (fx) await fx.covered;
  if (how === 'shop') restInShop();
  workLine = ''; // 하던 일은 이 세계에 두고 간다 ('일하는 중'이 따라오지 않게)
  const f = Math.max(1, Math.min(OPEN_FLOORS, floor));
  const h = hellState();
  state.realm = 'hell';
  h.floor = f;
  h.deepest = Math.max(h.deepest ?? 0, f, ...h.cleared); // 25차: 가 본 층은 다시 계단으로 내려갈 수 있다
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
  else if (how === 'up') w.placeNear(zh.down.i, zh.down.j - 1, hp); // 아래층에서 올라오면: 남쪽 끝 계단 머리
  else if (how === 'down') w.placeNear(zh.up.i, zh.up.j + (zh.exit === 'ford' ? 6 : 2), hp); // 위층에서 내려오면: 이 층의 위층 길 들머리
  else if (how === 'resume' && state.pos?.w === 'hell' && state.pos.f === f && state.pos.z === zone.id) w.placeNear(state.pos.i, state.pos.j, hp); // 다시 열면 마지막 자리
  else w.placeNear(zh.rest.i, zh.rest.j, hp);
  w.setStance(stance);
  w.setAutoCounter(autoCounter());
  w.setInvisible(invisible()); // 관리자 투명은 층을 옮겨도 그대로
  if (zh.exit === 'ford' && (h.fed ?? 0) >= GURMA_FULL && !h.cleared.includes(f)) w.gurmaSleep(); // 배불러 잠든 구르마
  w.start();
  if (pendingEater) { pendingEater = false; setTimeout(() => world?.sendEater(), 1500); } // 황혼의 가게에서 훔치다 걸렸다
  renderHud();
  showStance(true);
  // 31차: 떨어진 자는 먼저 142층 염소대왕의 방으로 (상담 중에 창을 닫았으면 다시 열 때도). 방을 나서면 이 층 휴식 마을
  const gw = goat ?? (how === 'resume' ? state.gkWait ?? null : null);
  if (gw) openGoatRoom(gw);
  else if (how !== 'shop' && how !== 'resume') showPlace(t().hellPlace.replace('{n}', String(f)).replace('{name}', floorDef(f).name[lang()]), floorDef(f).sin[lang()]);
  joinNet(w);
  fx?.done();
}

/**
 * 관리자: 지옥 n층 휴식 마을로 바로 옮겨 간다 (지도 확인용). 지옥 밖(현실·천국·귀신)에서 왔으면 그 세계를 적어 두고
 * '원래 세계로' 단추로 돌아간다 — 환생이 아니라 시찰에서 돌아오는 것이라 몸·돈·업은 그대로다
 */
function adminTeleport(to: number | 'back' | 'heaven' | 'bkk' | 'seoul' | 'goat' | 'border' | 'terrace' | 'hlobby' | 'home') {
  if (!net.account()?.admin || busy || dlg.isOpen) return;
  document.querySelector('.set-panel')?.remove();
  closeMenus();
  dropInterior();
  if (to === 'back') {
    const trip = state.adminTrip;
    if (!trip || trip === realm()) return;
    delete state.adminTrip;
    if (realm() === 'heaven' && state.heaven?.admin) delete state.heaven;
    if (realm() === 'border') delete state.border;
    if (trip === 'hell') { enterHell(hellState().floor, 'teleport'); return; }
    state.realm = trip;
    save(state);
    if (world) { world.destroy(); world = null; net.leaveZone(); }
    enterWorld('door');
    return;
  }
  // 시찰을 떠나기 전 세계를 기억한다 (이미 시찰 중이면 처음 세계를 그대로)
  if (!state.adminTrip) state.adminTrip = realm() as 'real' | 'ghost' | 'heaven' | 'hell';
  if (to === 'bkk' || to === 'seoul') {
    // 25차: 관리자 도시 이동 — 그 도시의 우주새 문 앞 (현실로)
    state.region = to;
    if (realm() !== 'real') { state.realm = 'real'; delete state.adminTrip; }
    save(state);
    if (world) { world.destroy(); world = null; net.leaveZone(); }
    enterWorld('door');
    return;
  }
  // 31차: 염소대왕의 방(142층) — 지금 묵는 층(없으면 3층) 휴식 마을 위에 연다. 나서면 그 층으로 떨어진다
  if (to === 'goat') {
    if (state.adminTrip === 'hell') delete state.adminTrip;
    if (inHell() && world) { openGoatRoom(null); return; }
    void enterHell(hellState().floor || HELL_START, 'teleport').then(() => openGoatRoom(null));
    return;
  }
  // 33차: 서울 달동네 골목 끝 내 집 (현실로 · 바로 집 안)
  if (to === 'home') {
    state.region = 'seoul';
    if (realm() !== 'real') { state.realm = 'real'; delete state.adminTrip; }
    save(state);
    if (world) { world.destroy(); world = null; net.leaveZone(); }
    void loadZone('seoul-gangnam').then(async (z) => {
      const h = z.home ?? z.door;
      await enterWorld([h.i, h.j], 'seoul-gangnam');
      const k = world?.zone.buildings.findIndex((b) => b.cat === 'home') ?? -1;
      if (k >= 0) enterInterior(k, { i: h.i, j: h.j }, null, false);
    });
    return;
  }
  // 32차: 지옥 1층 환생 로비 (파샤르) — 지옥 밖이면 1층으로 내려가서 바로 로비 안
  if (to === 'hlobby') {
    if (state.adminTrip === 'hell') delete state.adminTrip;
    const lobby = () => { if (!world || world.zone.interior || !world.zone.hell) return; const k = world.zone.buildings.findIndex((b) => b.cat === 'rebirth'); const u = world.zone.hell.up; if (k >= 0) enterInterior(k, { i: u.i, j: u.j + 1 }, null, false); };
    if (inHell() && world && hellState().floor === 1) { lobby(); return; }
    void enterHell(1, 'teleport').then(lobby);
    return;
  }
  // 32차: 천국 환생의 테라스 (루엔) — 천국 밖이면 천국으로 건너가서 바로 테라스
  if (to === 'terrace') {
    const open = () => { if (!world || world.zone.interior || realm() !== 'heaven') return; const st = world.heavenStair ?? world.zone.door; /* 계단이 없는 구역이면 우주새 문 앞에서 바로 */ const b: Building = { i0: st.i, j0: st.j, w: 1, d: 1, h: 0, cat: 'terrace', color: '#ffffff' }; openRoom(interiorZone(b, -4, { i: st.i, j: st.j + 1 }, t().terraceName), null, false); };
    if (realm() === 'heaven' && world) { open(); return; }
    state.heaven ??= { admin: true };
    state.realm = 'heaven';
    save(state);
    if (world) { world.destroy(); world = null; net.leaveZone(); }
    const fx = worldFade('heaven', true);
    fx.covered.then(async () => { await enterWorld('door'); open(); fx.done(); });
    return;
  }
  // 31차: 경계의 해변 (시찰 중에는 불다가 환생을 재촉하지 않는다)
  if (to === 'border') {
    if (realm() === 'border') return;
    if (world) { world.destroy(); world = null; net.leaveZone(); }
    void enterBorder('zero');
    return;
  }
  if (to === 'heaven') {
    if (realm() === 'heaven') return;
    state.heaven ??= { admin: true };
    state.realm = 'heaven';
    save(state);
    if (world) { world.destroy(); world = null; net.leaveZone(); }
    const fx = worldFade('heaven', true);
    fx.covered.then(async () => { await enterWorld('door'); fx.done(); });
    return;
  }
  if (state.adminTrip === 'hell') delete state.adminTrip; // 지옥 안에서 층만 옮기는 것
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
  noShots() {
    const wi = state.equip?.weapon ? itemByKey(state.equip.weapon) : null;
    const L = t();
    toast(state.unloaded && wi?.note !== 'fuel' ? L.unloadedToast : wi?.note === 'needsArrows' ? L.noArrows : wi?.note === 'needsRifle' ? L.noRifleAmmo : wi?.note === 'fuel' ? L.fuelOut : L.noAmmo);
  },
  goatKing: () => (gkPending ? talkToGoatKing(gkPending.reason, gkPending.want) : talkToGoatKing('visit')),
  changer: () => void talkToChanger(),
  notice(text) { toast(text, 'evil'); },
  thanks(n) {
    // 34차: 도움받은 행인이 쥐여 준 사례
    state.wallet = (state.wallet ?? 0) + n;
    ecoLog('earn', 'thanks', n);
    save(state); updateHud();
    toast(t().thanksGot.replace('{n}', priceText(n)), 'good');
  },
  money(n) {
    state.wallet = (state.wallet ?? 0) + n;
    ecoLog('earn', 'drop', n);
    updateHud();
  },
  stolen(n) {
    const got = Math.max(0, Math.min(Math.floor(state.wallet ?? 0), Math.round(n)));
    state.wallet = (state.wallet ?? 0) - got;
    ecoLog('spend', 'theft', got);
    save(state);
    updateHud();
    if (got > 0) toast(t().pickpocketToast.replace('{n}', moneyText(got)), 'evil');
    return got;
  },
  elder(name) {
    talkToElder(name);
  },
  wage(n, where, stiffed) {
    const L = t();
    const amt = (Math.floor(n * 100) / 100).toLocaleString('en-US', { maximumFractionDigits: 2 });
    if (stiffed) {
      // 19차: 일을 시킬 만큼 시키고 한 푼도 주지 않고 내쫓는 사장
      npcSay(L.bossOf.replace('{shop}', where), L.stiffLines[Math.floor(Math.random() * L.stiffLines.length)]);
      toast(L.stiffToast.replace('{n}', amt));
      return;
    }
    if (n <= 0) return;
    state.wallet = (state.wallet ?? 0) + n;
    ecoLog('earn', 'work', n);
    updateHud();
    toast(L.wagePaid.replace('{n}', amt), 'good');
  },
  deed(key, opt) {
    recordDeed(key, opt);
  },
  hp(hp, max) {
    state.hp = Math.max(0, hp);
    updateHpBar(hp, max);
    autoHealCheck(hp, max);
  },
  nav(label) {
    navChip(label);
  },
  wear(kind) {
    wear(kind);
  },
  // 31차 필드 보스 — 수쿰빗: 마피아 두목(아속 밖 구역, 2시간마다 다시 나올 수 있다) · 방콕의 대식자(나나·프롬퐁, 6시간).
  // 구역을 열 때 가끔 나타나고, 나타나면 쓰러질 때까지 그 자리에 남는다. 지옥: 층마다 하루 한 번 (쓰러뜨리면 다음 날)
  fieldBoss(zoneId) {
    const out: { key: string; i?: number; j?: number; hp?: number }[] = [];
    const fb = (state.fb ??= {});
    if (inHell()) {
      const key = FIELD_BOSS[hellState().floor];
      if (!key) return out;
      const s0 = fb[key];
      if (s0?.day === today() && s0.dead) return out;
      if (s0?.day === today() && s0.alive?.zone === zoneId) out.push({ key, ...s0.alive });
      else out.push({ key });
      return out;
    }
    if (realm() !== 'real') return out;
    for (const [key, rule] of Object.entries(FB_REAL)) {
      const s0 = fb[key];
      if (s0?.alive) { if (s0.alive.zone === zoneId) out.push({ key, ...s0.alive }); continue; }
      if (!rule.zones.includes(zoneId) || Date.now() < (s0?.due ?? 0)) continue;
      if (Math.random() < rule.chance) out.push({ key });
    }
    return out;
  },
  fbossAt(key, i, j, hp) {
    const fb = (state.fb ??= {});
    fb[key] = { ...(fb[key] ?? {}), alive: { zone: world?.zone.id ?? '', i, j, hp }, day: today(), dead: false };
    save(state);
  },
  fbossDown(key, mine) {
    const fb = (state.fb ??= {});
    fb[key] = { due: Date.now() + (FB_REAL[key]?.every ?? 0), day: today(), dead: true };
    save(state);
    if (mine) toast(t().fbDownToast.replace('{name}', (t().fbName as Record<string, string>)[key] ?? key), 'good'); // 31차: 내가 거든 때만 알린다
  },
  over(n) {
    // 21차: 넘치는 체력 — 체력 막대 오른쪽에 금빛 +숫자
    const el = hud.querySelector('.hp-over') as HTMLElement | null;
    if (el) { el.textContent = n >= 1 ? `+${Math.ceil(n)}` : ''; el.hidden = n < 1; }
  },
  died(cause) {
    if (realm() === 'heaven') { heavenFaint(); return; }
    showDeath(cause);
  },
  heavenFood(from) {
    heavenFood(from);
  },
  ywLost() {
    state.heaven = { ...state.heaven, ywLost: true };
    save(state);
    toast(t().ywLostToast);
  },
  heavenAct(what) {
    heavenAct(what);
  },
  accubus(name) {
    void talkToAccubus(name);
  },
  edge(dir, x, y) {
    crossEdge(dir, x, y);
  },
  menu(title, sub, options, x, y) {
    openTargetMenu(title, sub, options.map((o) => ({ ...o, label: wonify(o.label) })), x, y);
  },
  say(name, text) {
    npcSay(name, text);
  },
  work(st) {
    workLine = st ? wonify(t().workingLine.replace('{name}', st.name).replace('{n}', st.earned.toFixed(2))) : ''; // 35차: 서울에서 일하면 원화로
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
  yunaeOut() {
    void talkToYunaeOut();
  },
  maskGirl() {
    void talkToMaskGirl();
  },
  beginnerBat() {
    // 32차: 처음 한 번은 누구에게나 반드시 (주워 들면 끝) — 그 뒤로는 보통 확률 (world)
    return !state.batGiven && realm() === 'real';
  },
  useAmmo() {
    const wi = state.equip?.weapon ? itemByKey(state.equip.weapon) : null;
    if (wi?.note === 'fuel') {
      // 25차 화염방사기: 불을 뿜는 동안만 연료가 준다 (하루 5분)
      if (fuelLeft() <= 0) { toast(t().fuelOut); world?.setGear(gear()); return false; }
      const day = today();
      state.flamer = state.flamer?.d === day ? state.flamer : { d: day, used: 0 };
      state.flamer.used = Math.min(FLAMER_SEC, state.flamer.used + FLAME_BURST);
      renderAmmo();
      return true;
    }
    if (wi?.note === 'needsArrows') {
      if ((state.arrows ?? 0) <= 0) { toast(t().noArrows); return false; }
      state.arrows = (state.arrows ?? 0) - 1;
      renderAmmo();
      return true;
    }
    if (wi?.note === 'needsRifle') {
      if ((state.rifle ?? 0) <= 0) { toast(t().noRifleAmmo); return false; }
      state.rifle = (state.rifle ?? 0) - 1;
      renderAmmo();
      return true;
    }
    if ((state.ammo ?? 0) <= 0) { toast(t().noAmmo); return false; }
    state.ammo = (state.ammo ?? 0) - 1;
    renderAmmo();
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
    ecoLog('earn', 'drop', n, true);
    updateHud();
  },
  loot(key) {
    const it = itemByKey(key);
    if (!it) return;
    if (key === 'bat' && realm() === 'real') state.batGiven = true;
    addToBag(it);
    toast(t().lootGot.replace('{item}', it.name[lang()]), 'good');
    // 33차: 파편은 저절로 붙지 않는다 — 대장간에서 직접 틀에 끼워 템브라로 조립한다
    save(state);
    if (document.querySelector('.bag-panel')) renderBag();
    renderQuick();
  },
  vendor(kind) {
    if (kind === 'smith' && inHell() && hellState().floor === 4) void talkToFerum(); // 34차: 4층은 칼드렉
    else if (kind === 'smith') openSmith();
    else openHellStore(kind);
  },
  homeAlley() {
    // 24차: 서울 달동네 — 집으로 가는 골목 들머리. 처음 한 번은 '내 집이 여기 있다…', 그다음부터는 갈 때마다 망설이는 혼잣말
    if (busy || dlg.isOpen) return;
    const L = t();
    const first = !state.homeSeen;
    if (first) { state.homeSeen = true; save(state); }
    (async () => { busy = true; dlg.open({ name: '', monologue: true }); await dlg.say(first ? L.homeFirst : pick(L.homeAgain)); dlg.close(); busy = false; })();
  },
  feedGurma() {
    const h = hellState();
    const bag = state.bag ?? {};
    let gave = 0;
    for (const k of HELL_FOOD) {
      while ((bag[k] ?? 0) > 0 && (h.fed ?? 0) + gave < GURMA_FULL) { bag[k]--; gave++; }
    }
    h.fed = (h.fed ?? 0) + gave;
    if (state.quick && !(bag[state.quick] > 0)) renderQuick();
    save(state);
    return { gave, total: h.fed, full: h.fed >= GURMA_FULL };
  },
  hasFood() {
    const bag = state.bag ?? {};
    return HELL_FOOD.some((k) => (bag[k] ?? 0) > 0);
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
  const b = world.zone.buildings[k];
  const L0 = t();
  // 37차: 집은 한 곳 — 대문을 열 때마다 열에 넷쯤은 회상(놀이터·미용실·진료실 중 하나), 나머지는 지금의 빈집
  const age: 0 | 1 | 2 | 3 = b.cat === 'home' && Math.random() < 0.4 ? (Math.floor(Math.random() * 3) as 0 | 1 | 2) : 3;
  if (b.cat === 'estate' && b.estate && !state.homes?.[b.estate]) { void talkToAgent(k, out); return; } // 35차: 아직 내 집이 아니면 분양 사무소 직원이 맞는다
  openRoom(interiorZone(b, k, out, b.cat === 'estate' ? L0.myHomeName.replace('{name}', buildingName(b, lang())) : b.cat === 'loan' ? L0.beskHouse : b.cat === 'hbank' ? L0.hbankName : b.cat === 'atone' ? L0.atoneName : b.cat === 'rebirth' ? L0.rebirthName : b.cat === 'home' ? (age === 3 ? L0.homeName : L0.flashTag.replace('{place}', L0.yunaePlace[age])) : buildingName(b, lang()), b.cat === 'home' ? age : undefined, state.furn ?? []), chaser, work);
  // 37차: 들어서면 짧은 혼잣말 — 회상이면 기억이 밀려드는 말 다음 그 장소, 지금의 집이면 빈방의 흔적
  if (b.cat === 'home' && !busy) {
    yunaeLooked = false;
    void (async () => {
      busy = true;
      dlg.open({ name: '', monologue: true });
      if (age === 3) await dlg.say(pick(L0.homeIn));
      else { await dlg.say(pick(L0.flashIn)); await dlg.say(pick(L0.yunaeIn[age])); }
      dlg.close();
      busy = false;
    })();
  }
}
/**
 * 35차 분양 사무소: 아속의 콘도 ฿1,200,000 · 역삼의 아파트 ₩3,500,000,000. 통장에서 먼저, 모자라면 지갑에서 — 둘을 합쳐 값이 되면 산다.
 * 사고 나면 바로 들어간다. 집은 통장처럼 다음 생에도 남는다
 */
async function talkToAgent(k: number, out: { i: number; j: number }) {
  if (busy || dlg.isOpen || !world) return;
  const b = world.zone.buildings[k];
  const city = b.estate!;
  const L = t();
  const price = HOME_PRICE[city];
  busy = true;
  dlg.open({ name: L.agentName, exit: true });
  await dlg.say(L.agentGreet[city === 'seoul' ? 1 : 0].replace('{name}', buildingName(b, lang())));
  const bank = Math.floor(state.bank ?? 0), wallet = Math.floor(state.wallet ?? 0);
  await dlg.say(L.agentPrice.replace('{p}', moneyText(price)).replace('{b}', moneyText(bank)).replace('{w}', moneyText(wallet)));
  const short = bank + wallet < price;
  const c = await dlg.choose([short ? L.agentShort.replace('{n}', moneyText(price - bank - wallet)) : L.agentBuy.replace('{p}', moneyText(price)), L.agentQuit], short ? [0] : []);
  if (c === 0 && !short && !dlg.cancelled) {
    const fromBank = Math.min(bank, price);
    state.bank = (state.bank ?? 0) - fromBank;
    state.wallet = (state.wallet ?? 0) - (price - fromBank);
    (state.homes ??= {})[city] = true;
    markOwned(world.zone);
    ecoLog('spend', 'home', price);
    save(state);
    renderHud();
    sfx.rankUp();
    await dlg.say(L.agentDone);
    endTalk();
    enterInterior(k, out, null);
    return;
  }
  if (!dlg.cancelled) await dlg.say(pick(L.agentBye));
  endTalk();
}
/** 35차 천국 은행: 천국에서는 돈이 모자랄 일이 없다 — 원하는 만큼 꺼내 간다. 넣을 수는 없다 (이승 통장과 따로) */
async function heavenBank(name: string) {
  if (busy || dlg.isOpen) return;
  const L = t();
  busy = true;
  dlg.open({ name, exit: true });
  await dlg.say(pick(L.hbankGreet));
  const amts = [10_000, 100_000, 1_000_000, 10_000_000, 100_000_000];
  for (;;) {
    const c = await dlg.choose([...amts.map((a) => L.hbankTake.replace('{a}', moneyText(a))), L.hbankDone]);
    if (c < 0 || c >= amts.length || dlg.cancelled) break;
    state.wallet = (state.wallet ?? 0) + amts[c];
    ecoLog('earn', 'heaven', amts[c]);
    save(state); renderHud();
    sfx.dice();
    await dlg.say(pick(L.hbankGiven).replace('{a}', moneyText(amts[c])));
  }
  endTalk();
}
/** 35차 천국 오락실: 한 판 하고 갈 수 있다 (값은 가게마다 · 이겨도 남는 건 웃음뿐) */
async function arcadeTalk(name: string) {
  if (busy || dlg.isOpen) return;
  const L = t();
  busy = true;
  dlg.open({ name, exit: true });
  await dlg.say(pick(L.arcadeGreet));
  const price = 20 * (realm() === 'heaven' ? heavenPriceMul(name) : 1);
  for (;;) {
    const c = await dlg.choose([L.arcadeFight.replace('{p}', moneyText(price)), L.arcadeClaw.replace('{p}', moneyText(price)), L.arcadeRhythm.replace('{p}', moneyText(price)), L.arcadeQuit]);
    if (c < 0 || c > 2 || dlg.cancelled) break;
    if ((state.wallet ?? 0) < price) { await dlg.say(L.noMoney); break; }
    state.wallet = (state.wallet ?? 0) - price;
    ecoLog('spend', 'fun', price);
    renderHud(); save(state);
    sfx.dice();
    const win = Math.random() < (c === 1 ? 0.3 : 0.55);
    await dlg.say(pick((win ? L.arcadeWin : L.arcadeLose)[c]));
  }
  endTalk();
}
/**
 * 35차 아큐버스: 천국 1층에 사는 사람 닮은 존재. 상대가 좋아할 얼굴로 먼저 다가와 마음을 표현하고,
 * 상대가 바라는 사이가 되려 한다. 사람의 욕망과 감정을 읽는다 — 천사들이 돌보지만 천사는 아니다. 진심인지 본능인지는 아무도 모른다
 */
async function talkToAccubus(name: string) {
  if (busy || dlg.isOpen) return;
  const L = t();
  busy = true;
  dlg.open({ name, portrait: 'accubus', exit: true });
  const hp = world?.hpRatio ?? 1;
  const d = state.deeds ?? { good: 0, evil: 0 };
  const mood = hp < 0.5 ? 0 : d.evil > d.good ? 1 : (state.wallet ?? 0) < 100 ? 2 : 3;
  const mode = state.heaven?.acc;
  if (!mode) {
    await dlg.say(pick(L.accFirst));
    await dlg.say(L.accSense[mood]);
    await dlg.say(L.accAsk);
  } else {
    await dlg.say(pick(L.accAgain[['lover', 'friend', 'family', 'alone'].indexOf(mode)]));
  }
  const c = await dlg.choose([L.accLover, L.accFriend, L.accFamily, L.accAlone, ...(mode ? [L.accTruth] : [])]);
  if (c >= 0 && c <= 3 && !dlg.cancelled) {
    const m = (['lover', 'friend', 'family', 'alone'] as const)[c];
    state.heaven = { ...(state.heaven ?? {}), acc: m };
    save(state);
    world?.setAccubusMode(m);
    await dlg.say(pick(L.accReply[c]));
  } else if (c === 4 && !dlg.cancelled) {
    for (const line of L.accTruthLines) await dlg.say(line);
  }
  endTalk();
}
/** 35차: 산 집은 이름표 아랫줄이 '분양 중' 대신 '내 집' */
function markOwned(z: Zone) {
  for (const b of z.buildings) if (b.cat === 'estate' && b.estate && state.homes?.[b.estate]) { const p = (b as Building & { pois?: { t: string }[] }).pois?.[0]; if (p) p.t = 'ownedhome'; }
}
/** 35차 가구점: 산 가구는 들고 다니지 않고 가진 집에 바로 놓인다. 같은 자리의 가구는 가장 좋은 것 하나만 보인다 */
async function openFurnStore(name: string) {
  closeMenus();
  document.querySelector('.store-panel')?.remove();
  const L = t();
  const el = document.createElement('div');
  el.className = 'store-panel shop-menu';
  el.innerHTML = `<div class="menu-head"><b></b><button class="menu-close">✕</button></div><p class="store-line"></p><div class="menu-list"></div>`;
  el.querySelector('.menu-head b')!.textContent = name;
  const homes = state.homes ?? {};
  el.querySelector('.store-line')!.textContent = homes.bkk || homes.seoul ? L.furnLine : L.furnNoHome;
  (el.querySelector('.menu-close') as HTMLButtonElement).onclick = () => el.remove();
  const list = el.querySelector('.menu-list')!;
  const info = world?.zone.interior;
  const draw = () => {
    list.innerHTML = '';
    for (const f of FURN) {
      const owned = (state.furn ?? []).includes(f.key);
      const row = document.createElement('button');
      row.className = 'menu-item' + (owned ? ' dim' : '');
      row.appendChild(furnIcon(f, info));
      const nm = document.createElement('span'); nm.className = 'name'; nm.textContent = f.name[lang()];
      const ef = document.createElement('span'); ef.className = 'effect'; ef.textContent = owned ? L.furnOwned : f.tier > 1 ? L.furnUpgrade : '';
      const pr = document.createElement('span'); pr.className = 'price'; pr.textContent = owned ? '' : moneyText(f.price);
      row.append(nm, ef, pr);
      row.onclick = () => {
        if (owned) return;
        if (!homes.bkk && !homes.seoul) { toast(L.furnNoHome); return; }
        if ((state.wallet ?? 0) < f.price) { toast(L.noMoney); return; }
        state.wallet = (state.wallet ?? 0) - f.price;
        (state.furn ??= []).push(f.key);
        ecoLog('spend', 'furniture', f.price);
        save(state); renderHud();
        toast(L.furnBought.replace('{item}', f.name[lang()]), 'good');
        draw();
      };
      list.appendChild(row);
    }
  };
  draw();
  document.body.appendChild(el);
}
/** 가구 그림을 작은 아이콘으로 (방에 놓일 때와 같은 그림) */
function furnIcon(f: FurnDef, info?: InteriorInfo) {
  const c = document.createElement('canvas');
  c.width = c.height = 32; c.className = 'icon';
  const kind = f.slot === 'bed' ? (f.tier === 1 ? 'futon' : f.tier === 3 ? 'kbed' : 'vbed') : f.slot === 'sofa' ? 'homesofa' : f.slot === 'tv' ? 'flattv' : f.slot === 'lowtable' ? 'ctable' : f.slot === 'table' && f.tier === 2 ? 'mtable' : f.slot === 'shelf' ? 'shelf' : f.slot === 'lamp' ? 'lamp' : f.slot;
  const wd: Record<string, [number, number, number]> = { vbed: [2, 3, 16], mtable: [2, 1, 16], futon: [2, 3, 4], bed: [2, 3, 16], kbed: [2, 3, 16], homesofa: [1, 3, 14], flattv: [1, 3, 26], table: [2, 1, 16], shelf: [2, 1, 50], wardrobe: [1, 2, 58], rug: [3, 3, 1], treadmill: [2, 1, 26], fridge: [1, 1, 56], mirror: [1, 1, 46], lamp: [1, 1, 48], punchbag: [1, 1, 60] };
  const [w, d, h] = wd[kind] ?? [1, 1, 24];
  const v = f.slot === 'sofa' ? (f.tier === 2 ? 1 : 0) : f.slot === 'tv' ? (f.tier === 2 ? 2 : 0) : f.slot === 'rug' ? 3 : f.slot === 'shelf' ? 9 : 0;
  try {
    const fake: InteriorInfo = info ?? { kind: 'myhome', rest: true, name: '', floor: 'wood', wall: '#eee', trim: '#777', exit: { i: 0, j: 0 }, furn: [], from: { b: 0, out: { i: 0, j: 0 } }, seats: [] };
    const pic = drawFurn({ i: 0, j: 0, w, d, h, kind, v }, fake, false).canvas;
    const g = c.getContext('2d')!;
    const sc = Math.min(30 / pic.width, 30 / pic.height);
    g.imageSmoothingEnabled = false;
    g.drawImage(pic, (32 - pic.width * sc) / 2, (32 - pic.height * sc) / 2, pic.width * sc, pic.height * sc);
  } catch { /* 그림이 없는 가구 */ }
  return c;
}
/** 19차: 천국의 구름 계단 → 환생의 테라스. 거리의 건물이 아니라 구름 위에 따로 떠 있는 단 (환생관 루엔은 여기에만 있다) */
function enterTerrace() {
  if (!world || world.zone.interior || busy || realm() !== 'heaven') return;
  const st = world.heavenStair;
  if (!st) return;
  const b: Building = { i0: st.i, j0: st.j, w: 1, d: 1, h: 0, cat: 'terrace', color: '#ffffff' };
  const fx = worldFade('heaven', false);
  fx.covered.then(() => {
    openRoom(interiorZone(b, -4, { i: st.i, j: st.j + 1 }, t().terraceName), null, false);
    toast(t().terraceArrive);
    fx.done();
  });
}
function openRoom(z: Zone, chaser: { monster: boolean; hp: number } | null, work: boolean) {
  if (!world || world.zone.interior) return;
  const outer = world;
  if (!z.city && outer.zone.city) z.city = outer.zone.city; // 32차: 강남 안의 방은 강남 (₩·한국 시급·한국 메뉴)
  closeMenus();
  document.querySelector('.store-panel')?.remove();
  outer.stop();
  outer.root.visible = false;
  street = outer;
  net.leaveZone(); // 방 안은 혼자
  const w = new WorldScene(app, z, bodyLook(), () => enterShop(true), hooks, state.hp ?? maxHp(), { realm: realm() === 'hell' ? 'hell' : realm() === 'heaven' ? 'heaven' : 'real', chaser, work: work ? z.interior!.name : undefined });
  w.crimeT = outer.crimeT;
  world = w;
  app.stage.addChild(w.root);
  w.setLook(bodyLook());
  w.setGear(gear());
  w.setStats(stats());
  w.placeNear(z.spawn.i, z.spawn.j, state.hp ?? maxHp());
  w.setStance(stance);
  w.setAutoCounter(autoCounter());
  w.start();
  setIndoor(true);
  renderHud();
  showPlace(z.interior!.name, '');
  if (work) toast(t().workInside);
  else if (z.interior!.rest && z.interior!.kind !== 'terrace' && z.interior!.kind !== 'goatroom') toast(t().restRoom, 'good');
}

/** 방의 나가는 매트: 거리의 그 건물 앞으로 (쫓던 대식자는 따라 나온다) */
function leaveInterior(force = false) {
  if (!world?.zone.interior || !street) return;
  // 31차: 염소대왕의 방은 나가는 매트로 그냥 나가지 않는다 — 상담 전이면 염소대왕이 부르고, 끝났으면 아래로 떨어진다
  if (!force && world.zone.interior.kind === 'goatroom') { if (gkPending) talkToGoatKing(gkPending.reason, gkPending.want); else leaveGoatRoom(); return; }
  // 37차: 회상의 문을 나서면 거리가 아니라 지금의 집 — 정신이 들면 빈방이다
  if (!force && world.zone.interior.kind === 'home' && (world.zone.interior.age ?? 3) < 3 && !busy) {
    const info0 = world.zone.interior;
    const outer = street;
    const b = outer.zone.buildings[info0.from.b];
    closeMenus();
    world.destroy();
    world = outer;
    street = null;
    openRoom(interiorZone(b, info0.from.b, info0.from.out, t().homeName, 3), null, false);
    void (async () => { busy = true; dlg.open({ name: '', monologue: true }); await dlg.say(pick(t().flashOut)); dlg.close(); busy = false; })();
    return;
  }
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
  world.setAutoCounter(autoCounter());
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
  ecoLog('spend', 'service', n);
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
  if (info.kind === 'hbank') { openHellBank(); return; }
  if (info.kind === 'atone') { openAtone(); return; }
  if ((info.kind === 'rebirth' || info.kind === 'terrace') && world?.clerkIsGrandpa) { talkToGrandpa(info.kind === 'rebirth'); return; }
  if (info.kind === 'rebirth') { talkToPashar(); return; }
  if (info.kind === 'terrace') { talkToOfficer(); return; }
  if (info.kind === 'shore') { talkToBulda(); return; }
  if (info.kind === 'home') { talkToYunae(); return; }
  if (info.store === 'bank') { openBank(info.name); return; }
  if (info.store === 'furniture') { void openFurnStore(info.name); return; }
  if (info.kind === 'arcade') { void arcadeTalk(info.name); return; }
  if (info.store === 'mart' || info.store === 'pharmacy' || info.store === 'food' || info.store === 'cafe' || info.store === 'tools' || info.store === 'dept' || info.store === 'antique') { openStore(info.store, info.name, info.cuisine); return; }
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
    // 21차: 마사지 — 체력을 가득 채우고 넘치게 (최대 체력의 40%만큼 더, 맞으면 먼저 깎이고 10분에 걸쳐 빠진다)
    opts.push({ label: L.massageBtn, act: () => { if (pay(250)) { healFull(); world?.addOverHp(Math.round(maxHp() * 0.4)); toast(L.massaged, 'good'); } } });
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

/**
 * 19차: 종교시설의 가장 높은 이 (주지 스님 · 대주교 · 대이맘 · 수석 그란티) — 현실에만.
 * 보시 ฿10,000을 받고 신앙을 뺀 능력치(힘·민첩·체력)를 처음으로 되돌린다. 되돌린 점수는 다시 나눌 수 있다
 */
const RESET_COST = 10000;
async function talkToElder(name: string) {
  if (busy || dlg.isOpen) return;
  const L = t();
  busy = true;
  dlg.open({ name });
  await dlg.say(L.elderGreet);
  const s = stats();
  const freed = s.str - 1 + (s.agi - 1) + (s.vit - 1);
  await dlg.say(L.elderOffer.replace('{n}', RESET_COST.toLocaleString('en-US')).replace('{p}', String(freed)));
  const c = await dlg.choose([L.elderReset.replace('{n}', RESET_COST.toLocaleString('en-US')), L.elderNo]);
  if (c === 0) {
    if (freed <= 0) await dlg.say(L.elderNothing);
    else if ((state.wallet ?? 0) < RESET_COST) await dlg.say(L.elderPoor);
    else {
      state.wallet = (state.wallet ?? 0) - RESET_COST;
      ecoLog('spend', 'service', RESET_COST);
      state.soul = { ...state.soul!, stats: { str: 1, agi: 1, vit: 1, fai: s.fai } };
      state.hp = Math.min(state.hp ?? maxHp(), maxHp());
      world?.setStats(stats());
      world?.setGear(gear());
      save(state);
      updateHud();
      await dlg.say(L.elderDone.replace('{p}', String(freed)));
      toast(L.elderToast.replace('{p}', String(freed)), 'good');
    }
  } else await dlg.say(L.elderBye);
  dlg.close();
  busy = false;
  renderHud();
}

// ───────────────────────── 지옥: 위층 길 · 아래층 계단 ─────────────────────────
function hellAct(kind: 'up' | 'down' | 'pashar' | 'talus') {
  if (!inHell() || busy || dlg.isOpen) return;
  const L = t();
  const h = hellState();
  if (kind === 'talus') { talkToTalus(); return; }
  if (kind === 'pashar') return; // 파샤르는 지옥 로비 안 상담 책상에 있다
  if (kind === 'up') { passUp(); return; }
  if (h.floor + 1 > OPEN_FLOORS) { toast(L.hellDeeper); return; }
  // 25차: 계단은 가 본 층까지만. 더 깊은 곳은 악업을 쌓고 쓰러져야 떨어진다
  if (h.floor + 1 > (h.deepest ?? h.floor)) { toast(L.hellNoStair); return; }
  enterHell(h.floor + 1, 'down');
}
const sleepMs = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * 위층으로: 층주를 쓰러뜨렸거나(누구든 함께) · 통행세를 냈거나 · 2층은 구르마를 배불렸으면 지나간다.
 * 아니면 들머리 문지기가 통행세를 받는다 (층주를 피해 가는 값은 아주 비싸다: 1층 1만 · 2층 2만 · 3층 3만).
 * 1층은 불탄 도시 골목 끝 지옥 로비, 2층은 늪 여울을 걸어서, 3층은 나룻배로
 */
async function passUp() {
  const L = t();
  const h = hellState(), f = h.floor, def = floorDef(f);
  const exit = world?.zone.hell?.exit;
  const go = () => {
    if (exit === 'alley') { rebirthGate(); return; }
    toast(exit === 'ferry' ? L.ferryGo : L.fordGo);
    enterHell(f - 1, 'up');
  };
  if (h.cleared.includes(f) || (h.paid ?? []).includes(f) || (exit === 'ford' && (h.fed ?? 0) >= GURMA_FULL)) {
    if (exit === 'ferry' && h.cleared.includes(f)) toast(L.ferryFree);
    go();
    return;
  }
  busy = true;
  const fare = TOLL[f] ?? 10000;
  const gd = def.guard ? GUARDS[def.guard] : null;
  dlg.open({ name: gd ? gd.name[lang()] : L.ferryGuard });
  const bossName = MONSTERS[def.boss].name[lang()];
  await dlg.say(L.tollAsk.replace('{boss}을(를)', bossName + eulReul(bossName)).replace('{boss}', bossName).replace('{n}', fare.toLocaleString('en-US')));
  const c = await dlg.choose([L.tollPay.replace('{n}', fare.toLocaleString('en-US')), L.tollLeave]);
  let ok = false;
  if (c === 0 && h.notes < fare) await dlg.say(L.tollPoor.replace('{n}', fare.toLocaleString('en-US')));
  else if (c === 0) {
    h.notes -= fare;
    ecoLog('spend', 'fee', fare, true);
    h.paid = [...(h.paid ?? []), f];
    save(state); renderHud();
    await dlg.say(L.tollPaid);
    ok = true;
  }
  dlg.close();
  busy = false;
  if (ok) go();
}

/** 1층 골목 끝, 지옥 로비 앞: 땅에서 손들이 솟아 붙잡는다. 남을 수도 있다 */
async function rebirthGate() {
  if (!world?.zone.hell || busy) return;
  const L = t();
  busy = true;
  world.handsFx(true);
  sfx.plunge(false);
  await sleepMs(1000);
  dlg.open({ name: L.handsName });
  await dlg.say(L.handsLine);
  const c = await dlg.choose([L.handsGo, L.handsStay]);
  if (c === 1) { await dlg.say(L.handsStayed); dlg.close(); world?.handsFx(false); busy = false; return; }
  dlg.close();
  world.handsFx(false);
  busy = false;
  const k = world.zone.buildings.findIndex((b) => b.cat === 'rebirth');
  const u = world.zone.hell.up;
  if (k >= 0) enterInterior(k, { i: u.i, j: u.j + 1 }, null, false);
}

/** 지옥 2층 들판의 노름꾼 탈루스: 뼈주사위 두 개의 합이 홀인지 짝인지 노전을 건다 (맞히면 건 만큼 더, 틀리면 잃음). 불고기맛 과자도 판다 */
const TALUS_SNACK = 3;
/** 25차 지옥 1층 마스크 팔이 소녀: 바구니의 검은 마스크와, 등에 멘 화염방사기를 노전으로 판다 */
async function talkToMaskGirl() {
  if (busy) return;
  busy = true;
  shop.lock(true);
  const L = t();
  const h = hellState();
  const mask = itemByKey('blackmask'), fire = itemByKey('flamer');
  const label = (it: ItemDef) => `${it.name[lang()]} · ${effectText(it, lang())} · ${priceText(it.price, true)}`;
  dlg.open({ name: L.maskGirl, portrait: 'maskgirl' });
  await dlg.say(L.maskGreet[Math.floor(Math.random() * L.maskGreet.length)]);
  for (;;) {
    const c = await dlg.choose([label(mask), label(fire), L.maskBye]);
    if (c === 2 || c < 0) break;
    const it = c === 0 ? mask : fire;
    await dlg.say(c === 0 ? L.maskPitch : L.flamerPitch);
    const ok = await dlg.choose([L.maskBuy.replace('{n}', priceText(it.price, true)), L.maskNo]);
    if (ok !== 0) continue;
    if (h.notes < it.price) { await dlg.say(L.maskPoor); continue; }
    h.notes -= it.price;
    ecoLog('spend', 'shop', it.price, true);
    addToBag(it);
    save(state); renderHud(); renderQuick();
    await dlg.say(c === 0 ? L.maskSold : L.flamerSold);
  }
  await dlg.say(L.maskFarewell);
  endTalk();
}

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
    if (odd === (c === 0)) { h.notes += bet; ecoLog('earn', 'gamble', bet, true); await dlg.say(L.talusWin.replace('{n}', String(bet))); }
    else { h.notes -= bet; ecoLog('spend', 'gamble', bet, true); await dlg.say(L.talusLose.replace('{n}', String(bet))); }
    save(state); renderHud();
  }
  endTalk();
}

/**
 * 지옥 로비 가운데 창구의 환생관 파샤르: 이번 생의 악행 비율에 따라 혜택이 다르다.
 * 악행 100% = 아무것도 못 가져가고 태어날 도시도 고를 수 없다 · 그 밖 = 노전의 (100 − 악행%)만큼 현생 돈으로 바꿔 가고 도시를 고른다
 */
const INDULGENCE = 666; // 지옥면죄부 한 장 (노전)
const KERBEROS = 333; // 켈베로스 호출 한 번 (노전)
async function talkToPashar() {
  if (busy) return;
  const L = t();
  const h = hellState();
  busy = true;
  dlg.open({ name: L.pashar, portrait: 'pashar', exit: true });
  await dlg.say(L.lobbyGreet);
  const ratio = Math.round(evilRatio(state.deeds ?? { good: 0, evil: 0 }) ?? 100);
  await dlg.say(L.lobbyRatio.replace('{r}', String(ratio)));
  // 19차 환생 혜택 둘: 가진 노전(손에 든 것 + 은행)으로 산다. 은행 돈은 저절로 빠진다
  const spend = (n: number) => { ecoLog('spend', 'perk', n, true); const a = Math.min(n, Math.floor(h.notes)); h.notes -= a; h.bank = Math.max(0, (h.bank ?? 0) - (n - a)); save(state); renderHud(); };
  await dlg.say(L.perkIntro);
  for (;;) {
    const obol = Math.floor(h.notes + (h.bank ?? 0));
    const ind = Math.round((state.absolve ?? 0) / 30);
    const c = await dlg.choose([
      L.perkInd.replace('{n}', String(INDULGENCE)).replace('{h}', String(ind)),
      L.perkKerb.replace('{n}', String(KERBEROS)).replace('{h}', String(state.kerberos ?? 0)),
      L.perkDone.replace('{o}', obol.toLocaleString('en-US')),
      L.lobbyLeave,
    ]);
    if (c === 0) {
      if (ind >= 10) await dlg.say(L.perkIndMax);
      else if (obol < INDULGENCE) await dlg.say(L.perkPoor);
      else { spend(INDULGENCE); state.absolve = (state.absolve ?? 0) + 30; save(state); await dlg.say(L.perkIndGot.replace('{h}', String(ind + 1))); }
    } else if (c === 1) {
      if (obol < KERBEROS) await dlg.say(L.perkPoor);
      else { spend(KERBEROS); state.kerberos = (state.kerberos ?? 0) + 1; save(state); await dlg.say(L.perkKerbGot); }
    } else if (c === 2) break;
    else { if (c === 3) await dlg.say(L.lobbyLater); dropped() || endTalk(); return; } // 34차: 그만두고 나간다 (✕도 같다)
  }
  let region = 'bkk';
  if (ratio >= 100) { await dlg.say(L.lobbyNoCity); await dlg.say(L.lobbyCityRandom); }
  // 33차: 노전 → 현생의 돈은 업(시작할 층 ÷ 13)만큼만, 값은 형편없이 · 수수료는 따로
  const x = await rebirthExchange();
  if (dropped() || !x) return;
  await dlg.say(L.lobbyAsk);
  const go = await dlg.choose([L.lobbyGo, L.lobbyWait]);
  if (go !== 0) { if (!dropped()) endTalk(); return; }
  // 26차: 다음 생의 몸·도시·가져갈 물건을 여기서 정한다 (악행 100%면 도시는 고를 수 없다)
  if (ratio < 100) await dlg.say(L.lobbyCity);
  if (!(await prepareNextLife({ name: L.pashar, portrait: 'pashar', exit: true }, ratio >= 100 ? (Math.random() < 0.5 ? 'seoul' : 'bkk') : null))) return;
  region = state.nextLife?.region ?? region;
  await dlg.say(L.lobbyBye);
  if (dropped()) { delete state.nextLife; save(state); return; }
  dlg.close();
  busy = false;
  state.region = region;
  shipThenRebirth(() => payRebirthExchange(x));
}
/**
 * 33차 환생할 때의 환전 (파샤르 · 지옥의 할아버지): 가진 노전(손 + 지옥 은행) 중 업만큼(시작할 층 ÷ 13)만 현생의 돈으로.
 * 노전은 저 위에선 쇳조각 — 1닢 = ฿1, 수수료는 바꾸는 노전의 3할 + 20닢 따로 (치를 노전이 있어야 바꾼다)
 */
async function rebirthExchange(): Promise<{ n: number; fee: number } | null> {
  const L = t();
  const h = hellState();
  const own = Math.floor(h.notes + (h.bank ?? 0));
  const F = karmaFloor();
  const share = xchShare(F);
  const fee = (n: number) => Math.ceil(n * XCH_OBOL_FEE_RATE) + XCH_OBOL_FEE_BASE;
  let max = Math.min(Math.floor(own * share), Math.floor((own - XCH_OBOL_FEE_BASE) / (1 + XCH_OBOL_FEE_RATE)));
  while (max > 0 && max + fee(max) > own) max--;
  const sc = seoulCash();
  await dlg.say(L.lobbyXRule.replace('{o}', own.toLocaleString('en-US')).replace(/\{f\}/g, String(F)).replace('{p}', (Math.floor(share * 1000) / 10).toFixed(1)).replace('{r}', cashText(XCH_BAHT_PER_OBOL, sc)).replace('{c}', String(XCH_OBOL_FEE_BASE)));
  if (dlg.cancelled) return null;
  if (max < 1) { await dlg.say(L.lobbyXPoor); return dlg.cancelled ? null : { n: 0, fee: 0 }; }
  const opts = [...new Set([max, ...(max >= 4 ? [Math.ceil(max / 2)] : [])])];
  const c = await dlg.choose([...opts.map((n) => L.lobbyXOpt.replace('{n}', n.toLocaleString('en-US')).replace('{a}', cashText(n * XCH_BAHT_PER_OBOL, sc)).replace('{f}', fee(n).toLocaleString('en-US'))), L.lobbyXNone]);
  if (c < 0) return null;
  if (c >= opts.length) return { n: 0, fee: 0 };
  return { n: opts[c], fee: fee(opts[c]) };
}
/** 고른 환전을 치르고 현실로 (노전은 손에 든 것부터, 모자라면 지옥 은행에서) */
function payRebirthExchange(x: { n: number; fee: number }) {
  const h = hellState();
  const total = x.n + x.fee;
  const fromHand = Math.min(total, Math.floor(h.notes));
  h.notes -= fromHand;
  h.bank = Math.max(0, (h.bank ?? 0) - (total - fromHand));
  const cash = x.n * XCH_BAHT_PER_OBOL;
  ecoLog('spend', 'exchange', total, true); ecoLog('earn', 'exchange', cash);
  rebirthFrom('hell', cash);
  if (x.n > 0) setTimeout(() => toast(t().lobbyCarry2.replace('{n}', x.n.toLocaleString('en-US')).replace('{a}', cashText(cash, seoulCash())), 'good'), 600);
}
/** 33차 염소대왕의 방 환전상 오볼로: 이승 통장의 돈 → 노전. 이번 지옥길에 업만큼(묵을 층 ÷ 13)만, ฿1,000 = 1닢, 수수료 3할 + ฿500 (통장에서 따로) */
async function talkToChanger() {
  if (busy || dlg.isOpen) return;
  const L = t();
  busy = true;
  dlg.open({ name: L.xchName, portrait: 'changer', exit: true });
  await dlg.say(pick(L.xchGreet));
  const F = inHell() ? hellState().floor : karmaFloor();
  const share = xchShare(F);
  const gk = state.gk ?? 0;
  if (!state.xch || state.xch.gk !== gk) state.xch = { gk, base: Math.floor(state.bank ?? 0), used: 0 };
  const xs = state.xch;
  const sc = state.region === 'seoul';
  const bank = Math.floor(state.bank ?? 0);
  const R = XCH_CASH_PER_OBOL;
  const fee = (a: number) => Math.ceil(a * XCH_CASH_FEE_RATE) + XCH_CASH_FEE_BASE;
  const cap = Math.floor(xs.base * share) - xs.used;
  let n = Math.floor(Math.min(cap, (bank - XCH_CASH_FEE_BASE) / (1 + XCH_CASH_FEE_RATE)) / R);
  while (n > 0 && n * R + fee(n * R) > bank) n--;
  await dlg.say(L.xchRule.replace('{b}', cashText(bank, sc)).replace(/\{f\}/g, String(F)).replace('{p}', (Math.floor(share * 1000) / 10).toFixed(1)).replace('{r}', cashText(R, sc)).replace('{c}', cashText(XCH_CASH_FEE_BASE, sc)));
  if (n < 1) {
    // 34차: 바꿀 수 없어도 선택지는 보인다 — 1닢을 바꾸려면 통장에 얼마가 있어야 하는지 (흐리게) · 물러난다
    const used = xs.used > 0 && cap < R;
    const need = Math.max(R + fee(R), Math.ceil((xs.used + R) / share));
    await dlg.say(used ? L.xchUsedUp : L.xchPoor);
    await dlg.choose([used ? L.xchOptUsed : L.xchOptNeed.replace('{a}', cashText(need, sc)), L.xchQuit], [0]);
  } else {
    const opts = [...new Set([n, ...(n >= 4 ? [Math.ceil(n / 2)] : []), ...(n >= 2 ? [1] : [])])];
    const c = await dlg.choose([...opts.map((k) => L.xchOpt.replace('{a}', cashText(k * R, sc)).replace('{n}', String(k)).replace('{f}', cashText(fee(k * R), sc))), L.xchQuit]);
    if (c >= 0 && c < opts.length) {
      const k = opts[c], a = k * R, f = fee(a);
      state.bank = Math.max(0, (state.bank ?? 0) - a - f);
      hellState().notes += k;
      ecoLog('spend', 'exchange', a + f); ecoLog('earn', 'exchange', k, true);
      xs.used += a;
      save(state); renderHud();
      sfx.dice();
      await dlg.say(L.xchDone.replace('{n}', String(k)).replace('{a}', cashText(a, sc)).replace('{f}', cashText(f, sc)));
    }
  }
  await dlg.say(pick(L.xchBye));
  endTalk();
}

/** 현실로 다시 태어난다 (지옥에서 파샤르를 거쳐, 또는 귀신이 앵무새를 만나) */
const STILLBORN = 0.035; // 24차: 환생할 때 드물게 — 태어나자마자, 또는 배 속에서 숨이 멎어 경계로 간다
function rebirthFrom(from: 'hell' | 'ghost' | 'heaven' | 'border', carryBaht = 0) {
  if (from === 'heaven') delete state.heaven;
  if (from === 'border') delete state.border;
  if (from === 'hell') {
    seal('hell');
    const h = hellState();
    h.cleared = []; h.paid = []; h.fed = 0;
  } else seal('real'); // 26차: 천국·경계에서 들고 있던 것(관리자 시찰로 가져간 현실 물건 등)도 현실 우주새에 봉인 — 사라지지 않게
  state.realm = 'real';
  delete state.pos;
  // 26차: 상담에서 미리 정한 다음 생 (모습·도시·선업으로 산 물건)
  const nl = state.nextLife;
  delete state.nextLife;
  newLife(nl?.kind);
  if (nl) {
    state.look = nl.look;
    state.arrival = { kind: nl.kind, look: { ...nl.look, child: nl.kind === 'child' } };
    state.region = nl.region;
    for (const [k, n] of Object.entries(nl.bag)) { const it = ITEMS.find((x) => x.key === k); if (it) for (let c = 0; c < n; c++) addToBag(it); }
    state.freshLife = true;
  }
  // 지옥 로비에서 노전을 바꿔 가져온 돈 + 37차 선업의 값 (상담에서 정한 것)
  const goodMoney = nl?.cash ?? 0;
  state.wallet = carryBaht + goodMoney;
  if (goodMoney > 0) { ecoLog('earn', 'bonus', goodMoney); setTimeout(() => toast(t().nlCashToast.replace('{a}', cashText(goodMoney, state.region === 'seoul')), 'good'), 900); }
  save(state);
  if (vaultOf('real')) setTimeout(() => toast(t().vaultHint, 'good'), 2600); // 맡겨 둔 물건이 있으면 미스 황에게 말을 걸라고
  if (street) { street.destroy(); street = null; }
  if (world) { world.destroy(); world = null; }
  net.leaveZone();
  if (from !== 'border' && Math.random() < STILLBORN) { enterBorder('stillborn'); return; }
  enterShop(false);
}

// ───────────────────────── 24차: 경계의 해변 ─────────────────────────
/** 경계로: zero = 카르마 0으로 죽어서 · stillborn = 환생하자마자 죽어서 · resume = 다시 열었을 때 */
async function enterBorder(why: 'zero' | 'stillborn' | 'resume') {
  const L = t();
  closeMenus();
  dropInterior();
  if (street) { street.destroy(); street = null; }
  net.leaveZone();
  state.realm = 'border';
  if (why !== 'resume' || !state.border) state.border = { since: Date.now(), met: state.border?.met };
  state.hp = maxHp();
  delete state.pos;
  save(state);
  if (why === 'stillborn') await bornAndDied();
  shop.stop();
  shop.root.visible = false;
  if (world) { world.destroy(); world = null; }
  scene = 'world';
  setIndoor(false);
  const z = borderZone(L.borderName);
  world = new WorldScene(app, z, bodyLook(), () => undefined, hooks, maxHp(), { realm: 'border' });
  app.stage.addChild(world.root);
  world.setLook(bodyLook());
  world.setGear(gear());
  world.setStats(stats());
  world.placeNear(z.spawn.i, z.spawn.j, maxHp());
  world.setStance('talk');
  world.start();
  hud.hidden = false;
  renderHud();
  showStance(false);
  showPlace(L.borderName, L.borderSub);
}
/** "나는 태어났다. 그러나 바로 죽었다." — 검은 화면에 두 줄, 그리고 왜 죽었는지 한 줄 */
function bornAndDied(): Promise<void> {
  const L = t();
  const el = document.createElement('div');
  el.className = 'born-died';
  el.innerHTML = '<p class="a"></p><p class="b"></p><p class="c"></p>';
  el.querySelector('.a')!.textContent = L.bornA;
  el.querySelector('.b')!.textContent = L.bornB;
  el.querySelector('.c')!.textContent = pick(L.bornWhy);
  document.body.appendChild(el);
  requestAnimationFrame(() => el.classList.add('show'));
  return new Promise((r) => setTimeout(() => { el.classList.add('out'); setTimeout(() => el.remove(), 1600); r(); }, 6200));
}
/** 불다: 어부이자 랩퍼. 경계가 어떤 곳인지 말해 주고, 다시 태어나고 싶으면 물 쪽으로 보낸다 */
async function talkToBulda(force = false) {
  const L = t();
  if (busy) return;
  busy = true;
  dlg.open({ name: L.bulda, portrait: 'bulda' });
  if (force) {
    for (const line of L.buldaTimeUp) await dlg.say(line);
    dlg.close(); busy = false;
    leaveBorder();
    return;
  }
  if (!state.border?.met) {
    state.border = { ...(state.border ?? { since: Date.now() }), met: true };
    save(state);
    for (const line of L.buldaFirst) await dlg.say(line);
  } else await dlg.say(pick(L.buldaAgain));
  for (;;) {
    const c = await dlg.choose(L.buldaMenu);
    if (c === 0) { for (const line of L.buldaWhere) await dlg.say(line); }
    else if (c === 1) { for (const line of L.buldaWho) await dlg.say(line); }
    else if (c === 2) { await dlg.say(pick(L.buldaRaps)); }
    else if (c === 3) {
      await dlg.say(L.buldaRebirthAsk);
      const y = await dlg.choose([L.buldaRebirthYes, L.buldaRebirthNo]);
      if (y === 0) { if (!(await prepareNextLife({ name: L.bulda, portrait: 'bulda' }, null))) return; await dlg.say(L.buldaRebirthGo); dlg.close(); busy = false; leaveBorder(); return; }
      await dlg.say(L.buldaStay);
    } else break;
  }
  dlg.close();
  busy = false;
}
/** 24차 유내: 내 집에 있는 사람. 누구인지는 아무도 말하지 않는다
 *  28차: 올 때마다 한 시절 — 10대(집 안, 놀러 나가자고 조른다) · 20대(대문 앞, 동네 미용실 · 말을 다 하면 그 사람 만나러 떠난다) · 30대 후반(집 안, 늦었다고 나무라고 밥부터 먹인다)
 *  같은 장면이 연달아 나오지 않게 시절마다 지난번 장면을 기억해 둔다 */
const yunaeLast: number[] = [-1, -1, -1, -1];
function yunaePick<T>(slot: number, a: readonly T[]): T {
  let k = Math.floor(Math.random() * a.length);
  if (a.length > 1 && k === yunaeLast[slot]) k = (k + 1 + Math.floor(Math.random() * (a.length - 1))) % a.length;
  yunaeLast[slot] = k;
  return a[k];
}
/** 34차: 놀이터(10대) · 미용실(20대, 손님 머리를 자르며 말한다) · 진료실(30대 후반, 걱정스레 본다). 들어와 처음 말을 걸면 그 모습부터 */
let yunaeLooked = false;
async function talkToYunae() {
  const L = t();
  if (busy) return;
  const age = (world?.zone.interior?.age ?? 0) as 0 | 1 | 2;
  busy = true;
  if (!yunaeLooked) { yunaeLooked = true; dlg.open({ name: '', monologue: true }); await dlg.say(L.yunaeLook[age]); }
  dlg.open({ name: L.yunae, portrait: age === 0 ? 'yunae-teen' : age === 1 ? 'yunae-20s' : 'yunae-30s' }); // 시절마다 다른 그림 (비면 공통 그림)
  for (const line of yunaePick(age, age === 0 ? L.yunaeTeen : age === 1 ? L.yunae20 : L.yunae30)) await dlg.say(line);
  if (age === 1) await dlg.say(yunaePick(3, L.yunae20Go));
  dlg.close();
  busy = false;
}
/** 28차: 대문 앞의 20대 유내 — 머리 자르러 안 오냐고 타박하다가, 약속이 있다며 골목 아래로 내려간다 */
async function talkToYunaeOut() {
  const L = t();
  if (busy || !world) return;
  const w = world;
  busy = true;
  dlg.open({ name: L.yunae, portrait: 'yunae-20s' });
  for (const line of yunaePick(1, L.yunae20)) await dlg.say(line);
  await dlg.say(yunaePick(3, L.yunae20Go));
  dlg.close();
  busy = false;
  w.yunaeGo();
}
/** 물속으로 걸어 들어가 다시 태어난다 */
function leaveBorder() {
  toast(t().borderWalk);
  const fx = worldFade('heaven', false);
  fx.covered.then(() => { rebirthFrom('border'); fx.done(); });
}
/** 깨달음 없는 자는 잠깐만: 12분이 지나면 불다가 부른다 */
const BORDER_STAY = 12 * 60 * 1000;
setInterval(() => {
  if (realm() !== 'border' || busy || dlg.isOpen || !state.border || state.adminTrip) return; // 31차: 관리자 시찰 중에는 재촉하지 않는다
  if (Date.now() - state.border.since > BORDER_STAY) talkToBulda(true);
}, 5000);

/** 행위를 기록하고 영혼 경험치를 더한다 */
function recordDeed(key: DeedKey, opt: { floor?: number; share?: number } = {}) {
  const L = t();
  const res = applyDeed(state.deeds ?? { good: 0, evil: 0 }, key, opt);
  state.deeds = res.deeds;
  // 모든 생에 걸친 기록에도 같은 만큼
  state.deedsAll = applyDeed(state.deedsAll ?? { good: 0, evil: 0 }, key, opt).deeds;
  const rule = DEED_TABLE[key];
  let pts = fmtKarma(karmaPoints(key));
  const parts: string[] = [];
  // 19차 지옥면죄부: 남은 면죄 점수만큼 이 악행을 지운다 (이번 생 · 모든 생 기록 모두)
  if (rule.kind === 'evil' && (state.absolve ?? 0) > 0) {
    const raw = karmaPoints(key);
    const f = Math.min(raw, state.absolve ?? 0);
    state.absolve = Math.round(((state.absolve ?? 0) - f) * 10) / 10;
    state.deeds.evil = Math.max(0, Math.round((state.deeds.evil - f) * 10) / 10);
    if (state.deedsAll) state.deedsAll.evil = Math.max(0, Math.round((state.deedsAll.evil - f) * 10) / 10);
    parts.push(L.absolved.replace('{n}', fmtKarma(f)).replace('{m}', fmtKarma(state.absolve)));
    pts = fmtKarma(Math.max(0, raw - f));
  }
  if (opt.share !== undefined) parts.push(L.guardAssist.replace('{p}', String(Math.round(opt.share * 100))));
  if (rule.kind === 'good') parts.push(L.toastGood.replace('{n}', pts));
  if (rule.kind === 'evil') parts.push(L.toastEvil.replace('{n}', pts));
  if (res.exp) {
    parts.push(L.toastExp.replace('{n}', String(res.exp)));
    const soul = state.soul ?? { rank: 1, exp: 0 };
    const up = addSoulExp(soul.rank, soul.exp, res.exp);
    state.soul = { ...soul, rank: up.rank, exp: up.exp }; // 스탯 배분은 그대로 둔다
    if (up.rank > soul.rank) rankUpShow(up.rank);
  }
  toast(parts.join(' · '), rule.kind === 'evil' ? 'evil' : rule.kind === 'good' ? 'good' : '');
  renderHud();
  // 25차: 지옥에서 악업이 더 깊은 층을 가리켜도 바로 떨어지지 않는다 — 쓰러질 때 가라앉는다 (한 번만 알린다)
  if (inHell() && rule.kind === 'evil') {
    const to = sinkTo();
    if (to > hellState().floor && to > pullWarned) { pullWarned = to; setTimeout(() => toast(L.hellPull.replace('{n}', String(to)), 'evil'), 1400); }
  }
}

// ───────────────────────── 상점 안 ─────────────────────────
function onShopArrive(target: ShopTarget) {
  if (busy) return;
  if (realm() === 'ghost' && target !== 'door') { ghostParrot(); return; }
  if (target === 'hwang') talkToHwang();
  else if (target === 'cage') openCage();
  else if (target === 'door') goOut();
}

/** 한국어 조사: 받침이 있으면 '을', 없으면 '를' */
function eulReul(word: string) {
  const c = word.charCodeAt(word.length - 1);
  if (c < 0xac00 || c > 0xd7a3) return '을(를)';
  return (c - 0xac00) % 28 ? '을' : '를';
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
  if (!talkedThisVisit && state.grudge) {
    // 20차: 지난번에 훔쳐 간 손님
    state.grudge = false;
    save(state);
    await dlg.say(hell ? L.hwGrudge : L.hwangGrudge);
  } else if (!talkedThisVisit) {
    if (hell) {
      // 황혼은 미스 황도 황색날개도 모른다 (스스로 다른 사람이라 여긴다)
      if (!hellState().met) { hellState().met = true; save(state); await dlg.say(L.hwFirst); }
      await dlg.say(L.hwGreet);
    }
    else if (!state.look || state.freshLife) {
      await dlg.say(L.greetFirst);
      await dlg.say(L.react[state.arrival!.kind]);
    } else await dlg.say(L.greetUsual);
    // 이 세계의 우주새에 봉인해 둔 물건
    // 29차: 맡긴 물건(죽거나 다시 태어날 때 봉인된 것 포함)은 데스크 앞 보관 우리에 — 꺼낼 때는 앵무새가 수수료를 받는다
    if (vaultOf(hell ? 'hell' : 'real')) await dlg.say(hell ? L.cageHintHw : L.cageHintHwang);
    // 38차: 끼고 있는 무기·방어구가 많이 닳았으면 철물점을 일러 준다 (현실만)
    if (!hell && Object.values(state.equip ?? {}).some((k) => { const it = k ? itemByKey(k) : null; return !!it && !it.hell && duraOf(k!) < duraMax(it) * 0.4; })) await dlg.say(L.hwangRepairHint);
  }
  talkedThisVisit = true;
  // 물건 고르기 → (소비품은 수량) → 사고 나면 한마디 뒤 다시 목록. '나가기'나 빈 곳을 누르면 말없이 끝
  let tab: ShopTab = 'goods';
  for (;;) {
    const picked = await pickItem(hell, tab);
    if (!picked) break;
    tab = picked.tab;
    if (picked.ask === 'work') { for (const line of L.hwangWork) await dlg.say(line); continue; }
    if (picked.ask === 'dir') {
      // 주요 가게 자리: 아속 구역 지도에서 우주새 문에서 가장 가까운 곳을 찾아 방향·거리로 말해 주고, 나가면 그곳 위에 표시
      const places = await nearbyPlaces();
      const c = await dlg.choose([...places.map((p) => `${p.label} · ${p.name}`), L.askNever]);
      if (c >= 0 && c < places.length) {
        const p = places[c];
        await dlg.say(L.hwangDir.replace('{name}', p.name).replace('{dir}', p.dir).replace('{m}', String(p.m)));
        if (p.label === L.placeTools) await dlg.say(L.hwangToolsTip);
        pendingGuide = p.k;
        await dlg.say(L.hwangDirMark);
      }
      continue;
    }
    const it = picked.it, name = it.name[lang()];
    if (picked.steal) {
      // 20차: 우주새에서 훔치기 — 미스 황(황혼)은 몹시 화를 내고 내쫓는다. 걸리면 밖에서 대식자가 기다린다
      const shelf = ITEMS.filter((x) => x.cat === it.cat && !x.store && !!x.hell === hell && onSale(x)).map((x) => ({ it: x, price: x.price }));
      const ok = trySteal(it, it.price, shelf);
      if (ok) await dlg.say(L.stealSlip.replace('{item}', name));
      for (const line of (ok ? (hell ? L.hwFury : L.hwangFury) : (hell ? L.hwCaught : L.hwangCaught))) await dlg.say(line); // 31차: 못 훔쳤으면 '가져가라'는 말 없이
      state.grudge = true;
      if (!ok) pendingEater = true;
      save(state);
      renderHud();
      endTalk();
      leaveShop();
      return;
    }
    if (picked.sell) {
      const unit = sellPrice(it);
      const have = state.bag?.[it.key] ?? 0;
      const n = have > 1 ? await askQty(it, unit, have, 'sell') : 1;
      if (n <= 0) continue;
      state.bag![it.key] = have - n;
      if (hell) hellState().notes += unit * n; else state.wallet = (state.wallet ?? 0) + unit * n;
      ecoLog('earn', 'sell', unit * n, hell);
      save(state);
      renderHud();
      await dlg.say(L.sold.replace('{item}', name).replace('{n}', String(n)).replace('{p}', priceText(unit * n, hell)));
      continue;
    }
    if (money() < it.price) { await dlg.say(hell ? L.hwNoMoney : L.noMoney); continue; }
    // 회복하는 물건은 몇 개 살지 고른다
    const most = Math.min(it.cat === 'weapon' || it.cat === 'armor' ? 9 : 99, Math.floor(money() / it.price));
    const n = needsConfirm(it) ? await askQty(it, it.price, most, 'buy') : 1; // 29차: 장비도 한 번 더 (누르자마자 돈이 사라지지 않게)
    if (n <= 0) continue;
    if (n === 1) {
      // 지옥에서 무기를 사는 건 당연한 일: '그걸로 뭘 하시려고요'는 현실에서만
      const line = it.cat === 'weapon' ? (hell ? L.pickGoods : L.pickWeapon) : it.cat === 'armor' ? L.pickArmor : L.pickGoods;
      await dlg.say(line.replace('{item}', name).replace('{iyo}', iyo(name)));
    }
    if (hell) hellState().notes -= it.price * n;
    else state.wallet = (state.wallet ?? 0) - it.price * n;
    ecoLog('spend', 'shop', it.price * n, hell);
    for (let k = 0; k < n; k++) addToBag(it);
    save(state);
    renderHud();
    await dlg.say(n > 1 ? L.boughtN.replace('{item}', name).replace('{n}', String(n)) : L.bought.replace('{item}', name));
  }
  endTalk();
}

/** 유황새의 대부업자 베스크: 22차 — 최대 1000닢, 갚을 땐 두 배. 빚이 남으면 미납귀가 따라다닌다 */
const DEBT_MAX = 1000;
async function talkToBesk() {
  busy = true;
  shop.lock(true);
  const L = t();
  const h = hellState();
  const debt = () => state.debt ?? 0;
  dlg.open({ name: L.besk, portrait: 'besk', exit: true });
  if (debt() > 0) await dlg.say(L.beskOwe.replace('{n}', String(debt())));
  else { await dlg.say(L.beskGreet); await dlg.say(L.beskTerms); }
  const room = Math.floor((DEBT_MAX * 2 - debt()) / 2); // 더 빌릴 수 있는 원금
  const amounts = [...new Set([50, 200, 500, DEBT_MAX].map((n) => Math.min(n, room)))].filter((n) => n > 0);
  const opts = amounts.map((n) => L.beskBorrow.replace('{n}', String(n)));
  if (debt() > 0) opts.push(L.beskRepay.replace('{n}', String(debt())));
  opts.push(L.beskNo);
  const c = await dlg.choose(opts);
  if (c >= 0 && c < amounts.length) { // 36차: ✕로 그만두면 −1 — 빌린 것도 갚은 것도 없다
    const n = amounts[c];
    h.notes += n;
    ecoLog('earn', 'loan', n, true);
    state.debt = debt() + n * 2;
    save(state);
    renderHud();
    await dlg.say(L.beskLent.replace('{n}', String(n)).replace('{m}', String(state.debt)));
  } else if (debt() > 0 && c === amounts.length) {
    if (h.notes <= 0) await dlg.say(L.beskEmpty);
    else {
      const pay = Math.min(h.notes, debt());
      h.notes -= pay;
      ecoLog('spend', 'loan', pay, true);
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
/** 34차 관리자 경제 통계: 돈이 들고 나는 곳마다 적는다 (날짜별 · 갈래별 · 현실 돈과 노전 따로). 최근 14일만 남긴다 */
function ecoDay() {
  const d = new Date(), key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  state.eco = state.eco ?? {};
  if (!state.eco[key]) {
    state.eco[key] = { e: {}, s: {}, he: {}, hs: {}, t: 0 };
    const keys = Object.keys(state.eco).sort();
    while (keys.length > 14) delete state.eco[keys.shift()!];
  }
  return state.eco[key];
}
function ecoLog(dir: 'earn' | 'spend', cat: string, n: number, hell = false) {
  if (!(n > 0)) return;
  const d = ecoDay();
  const b = hell ? (dir === 'earn' ? d.he : d.hs) : dir === 'earn' ? d.e : d.s;
  b[cat] = (b[cat] ?? 0) + Math.round(n);
}
/** 34차 관리자 경제 통계 창: 오늘 · 최근 7일 — 갈래별로 들어온 돈·나간 돈 (현실 돈 / 노전), 지금 가진 것, 논 시간과 시간당 수입 */
function openEcoStats() {
  closeMenus();
  document.querySelector('.store-panel')?.remove();
  const L = t();
  const el = document.createElement('div');
  el.className = 'store-panel shop-menu eco-panel';
  el.innerHTML = `<div class="menu-head"><b></b><button class="menu-close">✕</button></div><p class="store-line"></p><div class="menu-list"></div>`;
  el.querySelector('.menu-head b')!.textContent = L.ecoTitle;
  el.querySelector('.store-line')!.textContent = L.ecoLine;
  (el.querySelector('.menu-close') as HTMLButtonElement).onclick = () => el.remove();
  const list = el.querySelector('.menu-list')!;
  const days = Object.keys(state.eco ?? {}).sort();
  const last = (n: number) => days.slice(-n).map((k) => state.eco![k]);
  const sum = (ds: { e: Record<string, number>; s: Record<string, number>; he: Record<string, number>; hs: Record<string, number> }[], f: 'e' | 's' | 'he' | 'hs') => { const o: Record<string, number> = {}; for (const d of ds) for (const [k, v] of Object.entries(d[f])) o[k] = (o[k] ?? 0) + v; return o; };
  const fmt = (n: number) => Math.round(n).toLocaleString('en-US');
  const cat = (k: string) => (L.ecoCats as Record<string, string>)[k] ?? k;
  const h = state.hell;
  const hold = document.createElement('p'); hold.className = 'eco-hold';
  hold.textContent = L.ecoHold.replace('{w}', priceText(Math.floor(state.wallet ?? 0))).replace('{b}', priceText(Math.floor(state.bank ?? 0))).replace('{n}', fmt(h?.notes ?? 0)).replace('{hb}', fmt(h?.bank ?? 0));
  list.appendChild(hold);
  const today = last(1), week = last(7);
  const secs = (ds: { t: number }[]) => ds.reduce((a, d) => a + (d.t ?? 0), 0);
  for (const [title, ds] of (days.length > 1 ? [[L.ecoToday, today], [L.ecoWeek, week]] : [[L.ecoToday, today]]) as [string, typeof today][]) { // 하루치뿐이면 같은 표를 두 번 보이지 않는다
    const box = document.createElement('div'); box.className = 'eco-box';
    const hrs = secs(ds) / 3600;
    const e = sum(ds, 'e'), sp = sum(ds, 's'), he = sum(ds, 'he'), hs = sum(ds, 'hs');
    const tot = (o: Record<string, number>) => Object.values(o).reduce((a, b) => a + b, 0);
    const head = document.createElement('b'); head.textContent = `${title} · ${L.ecoPlay.replace('{h}', hrs.toFixed(1))}`; box.appendChild(head);
    const table = document.createElement('table'); table.className = 'eco-table';
    const row = (a: string, b: string, c: string, cls = '') => { const tr = document.createElement('tr'); if (cls) tr.className = cls; for (const x of [a, b, c]) { const td = document.createElement('td'); td.textContent = x; tr.appendChild(td); } table.appendChild(tr); };
    row('', L.ecoReal, L.ecoObol, 'eco-th');
    const keysIn = [...new Set([...Object.keys(e), ...Object.keys(he)])];
    const keysOut = [...new Set([...Object.keys(sp), ...Object.keys(hs)])];
    row(L.ecoIn, '', '', 'eco-sec');
    for (const k of keysIn.sort((a, b) => (e[b] ?? 0) + (he[b] ?? 0) - (e[a] ?? 0) - (he[a] ?? 0))) row(cat(k), e[k] ? fmt(e[k]) : '·', he[k] ? fmt(he[k]) : '·');
    row(L.ecoOut, '', '', 'eco-sec');
    for (const k of keysOut.sort((a, b) => (sp[b] ?? 0) + (hs[b] ?? 0) - (sp[a] ?? 0) - (hs[a] ?? 0))) row(cat(k), sp[k] ? fmt(sp[k]) : '·', hs[k] ? fmt(hs[k]) : '·');
    row(L.ecoNet, fmt(tot(e) - tot(sp)), fmt(tot(he) - tot(hs)), 'eco-net');
    if (hrs > 0.05) row(L.ecoPerHour, fmt(tot(e) / hrs), fmt(tot(he) / hrs), 'eco-net');
    box.appendChild(table);
    if (!keysIn.length && !keysOut.length) { const p = document.createElement('p'); p.className = 'bag-empty'; p.textContent = L.ecoEmpty; box.appendChild(p); }
    list.appendChild(box);
  }
  panelAt(el);
}
/** 34차 관리자 성능 표시: 초당 장면 수 · 한 장면 시간(평균/최대) · 해상도 · 메모리 · 장면 위 물체 수 · 구역 (실기기 확인용, 이 기기에만 저장) */
const PERF_KEY = 'heavensmanual.perf';
const perfOn = () => { try { return localStorage.getItem(PERF_KEY) === '1' && !!net.account()?.admin; } catch { return false; } };
let perfEl: HTMLElement | null = null;
let perfTick: (() => void) | null = null;
function setPerf(on: boolean) {
  try { if (on) localStorage.setItem(PERF_KEY, '1'); else localStorage.removeItem(PERF_KEY); } catch { /* 저장 안 되면 이번만 */ }
  if (perfTick) { app.ticker.remove(perfTick); perfTick = null; }
  perfEl?.remove(); perfEl = null;
  if (!on) return;
  perfEl = document.createElement('div');
  perfEl.className = 'perf-hud';
  document.body.appendChild(perfEl);
  let n = 0, acc = 0, worst = 0, t0 = performance.now();
  perfTick = () => {
    const dt = app.ticker.deltaMS;
    n++; acc += dt; worst = Math.max(worst, dt);
    const now = performance.now();
    if (now - t0 < 500 || !perfEl) return;
    const mem = (performance as unknown as { memory?: { usedJSHeapSize: number } }).memory;
    const pi = world?.perfInfo();
    const r = app.renderer;
    perfEl.textContent = [
      `FPS ${(1000 / (acc / n)).toFixed(0)}  ·  ${(acc / n).toFixed(1)}ms / max ${worst.toFixed(0)}ms`,
      `${r.name ?? 'renderer'} · res ${r.resolution} · ${r.width}×${r.height}${mem ? ` · JS ${(mem.usedJSHeapSize / 1048576).toFixed(0)}MB` : ''}`,
      pi ? `${pi.zone}${pi.room ? ` (${pi.room})` : ''} ${pi.W}×${pi.H} · walkers ${pi.walkers} · objects ${pi.objects} · nodes ${pi.sprites}` : scene,
    ].join('\n');
    n = 0; acc = 0; worst = 0; t0 = now;
  };
  app.ticker.add(perfTick);
}
/** 34차: ✕로 그만둔 대화면 정리하고 true (환전상·환생관 상담 곳곳에서 묻는다) */
function dropped(): boolean {
  if (!dlg.cancelled) return false;
  world?.setLook(bodyLook());
  endTalk();
  return true;
}

/** 되팔 때 값: 산 값의 4할 (적어도 1) */
const sellPrice = (it: ItemDef) => Math.max(1, Math.floor(it.price * 0.4));
type ShopTab = ItemCat | 'sell' | 'ask';
/** 이 세계 돈으로 값이 매겨지는 내 물건 (지옥 = 노전 물건, 현실 = 바트 물건). 끼고 있는 건 팔지 않는다 */
function sellable(hell: boolean) {
  const bag = state.bag ?? {};
  const worn = new Set(Object.values(state.equip ?? {}));
  return Object.keys(bag).filter((k) => bag[k] > 0).map(itemByKey).filter((it) => it && it.price > 0 && (hell ? !!it.hell || it.store === 'talus' : !it.hell && it.store !== 'talus') && !(worn.has(it.key) && bag[it.key] <= 1));
}

/** 상품 창: 고른 물건(사기·팔기)을 돌려준다. '나가기'나 창 밖 빈 곳을 누르면 null */
// ───────────────────────── 21차: 미스 황에게 길 묻기 ─────────────────────────
/** 거리에 나가면 그 건물 위에 표시 (미스 황이 알려 준 곳) */
let pendingGuide: number | null = null;
/** 우주새 문에서 가까운 은행 · 종교시설 · 병원·약국 · 마사지 · 편의점 · 헬스장 */
async function nearbyPlaces() {
  const L = t();
  const z = await loadZone(homeZone());
  const d = z.door;
  const want: [string, (b: Building) => boolean][] = [
    [L.placeTools, (b) => roomKindOf(b) === 'hardware'], // 38차: 무기 수리 — 큰길가 철물점
    [L.placeKinds.bank, (b) => hasBank(b)],
    [L.placeKinds.worship, (b) => ['temple', 'church', 'mosque', 'gurdwara'].includes(roomKindOf(b))],
    [L.placeKinds.clinic, (b) => ['clinic', 'pharmacy'].includes(roomKindOf(b))],
    [L.placeKinds.massage, (b) => roomKindOf(b) === 'massage'],
    [L.placeKinds.mart, (b) => roomKindOf(b) === 'mart'],
    [L.placeKinds.gym, (b) => roomKindOf(b) === 'gym'],
  ];
  const out: { label: string; name: string; k: number; dir: string; m: number }[] = [];
  for (const [label, test] of want) {
    let best = -1, bd = 1e9;
    z.buildings.forEach((b, k) => {
      if (!canEnter(b) || !test(b)) return;
      const dd = Math.hypot(b.i0 + b.w / 2 - d.i, b.j0 + b.d / 2 - d.j);
      if (dd < bd) { bd = dd; best = k; }
    });
    if (best < 0) continue;
    const b = z.buildings[best];
    const di = b.i0 + b.w / 2 - d.i, dj = b.j0 + b.d / 2 - d.j;
    // 수쿰빗이 가로(i)로 놓였다: +i = 프롬퐁 쪽, -i = 나나 쪽, -j = 홀수 소이 쪽(대로 북쪽), +j = 짝수 소이 쪽(남쪽)
    const ew = Math.abs(di) > 6 ? (di > 0 ? L.dirs.e : L.dirs.w) : '';
    const ns = Math.abs(dj) > 6 ? (dj > 0 ? L.dirs.s : L.dirs.n) : '';
    const dir = [ew, ns].filter(Boolean).join(L.dirs.and) || L.dirs.here;
    out.push({ label, name: buildingName(b, lang()), k: best, dir, m: Math.max(10, Math.round(bd * 3 / 10) * 10) });
  }
  return out;
}

// ───────────────────────── 20차: 훔치기 ─────────────────────────
/** 걸려서 쫓겨난 뒤 거리에 나가면 대식자가 온다 */
let pendingEater = false;
/** 처음 한 번은 그 가게의 가장 싼 무기를 반드시 훔친다 */
function freeSteal(it: ItemDef, shelf: { it: ItemDef; price: number }[]) {
  if (state.stoleOnce || it.cat !== 'weapon' || !it.atk) return false;
  const ws = shelf.filter((x) => x.it.cat === 'weapon' && !!x.it.atk); // 탄약·화살은 무기가 아니다
  return !!ws.length && Math.min(...ws.map((x) => x.price)) === shelf.find((x) => x.it.key === it.key)?.price;
}
/** 쌀수록 쉽고 비쌀수록 어렵다 (민첩이 조금 돕는다): ฿10 ≈ 70% · ฿100 ≈ 50% · ฿1,000 ≈ 27% · ฿10,000 ≈ 5% */
function stealChance(it: ItemDef, price: number, shelf: { it: ItemDef; price: number }[]) {
  if (freeSteal(it, shelf)) return 1;
  return Math.max(0.04, Math.min(0.9, 0.93 - Math.log10(Math.max(1, price)) * 0.22 + stats().agi * 0.004)) + maskSteal();
}
/** 25차: 검은 마스크를 쓰면 현실과 지옥에서 훔치기 확률이 오른다 */
function maskSteal() {
  if (realm() !== 'real' && realm() !== 'hell') return 0;
  return Object.values(state.equip ?? {}).reduce((s, k) => s + (k ? itemByKey(k)?.steal ?? 0 : 0), 0);
}
/** 훔치기 한 번: 악행은 늘 기록된다. 성공하면 가방에 (그 자리에서 먹는 음식은 먹는다) */
function trySteal(it: ItemDef, price: number, shelf: { it: ItemDef; price: number }[]) {
  const ok = Math.random() < stealChance(it, price, shelf);
  recordDeed('steal');
  state.stoleOnce = true;
  if (ok) {
    if (it.now) world?.heal(it.heal ?? 0);
    else addToBag(it);
  }
  save(state);
  updateHud();
  renderQuick();
  return ok;
}
/** 물건 줄 옆에 '훔치기' 단추 (확률을 보여 준다) */
function withSteal(row: HTMLButtonElement, it: ItemDef, price: number, shelf: { it: ItemDef; price: number }[], act: () => void) {
  if (realm() === 'heaven' || realm() === 'ghost') return row;
  const wrap = document.createElement('div');
  wrap.className = 'bag-row steal-row';
  const side = document.createElement('div');
  side.className = 'bag-side';
  const b = document.createElement('button');
  b.className = 'b-steal';
  const pc = Math.round(stealChance(it, price, shelf) * 100);
  // 20차 → 손 이모지 대신 도트 복면 그림 + '훔치기' 글자 + 확률 (기종마다 모양이 다른 이모지는 쓰지 않는다)
  const ic = itemIcon('steal');
  ic.className = 'icon';
  const lb = document.createElement('small');
  lb.textContent = t().stealShort;
  const pcEl = document.createElement('b');
  pcEl.textContent = `${pc}%`;
  b.append(ic, lb, pcEl);
  b.title = t().stealBtn.replace('{p}', String(pc));
  b.setAttribute('aria-label', b.title);
  b.onclick = (e) => { e.stopPropagation(); act(); };
  side.appendChild(b);
  wrap.append(row, side);
  return wrap;
}
/** 거리·지옥 가게에서 훔치기: 성공하면 슬쩍, 걸리면 주인이 소리치고 대식자가 잡으러 온다 */
function streetSteal(it: ItemDef, price: number, shelf: { it: ItemDef; price: number }[], panel: HTMLElement, redraw: () => void) {
  const L = t();
  if (trySteal(it, price, shelf)) { toast(L.stealOk.replace('{item}', it.name[lang()]), 'evil'); redraw(); return; }
  panel.remove();
  toast(L.stealCaught, 'evil');
  world?.sendEater();
}

/** 20차: 앵무새는 말이 없다. 아주 가끔 한 마디 */
async function talkToParrot() {
  if (busy || dlg.isOpen) return;
  const L = t();
  busy = true;
  shop.lock(true);
  dlg.open({ name: L.parrot, portrait: 'parrot' });
  await dlg.say(Math.random() < 0.01 ? L.parrotRare : '......');
  // 29차: 먹이 주기 — 해바라기씨 한 줌 (현실 ฿10 · 지옥 1닢). 가끔 여자 목소리로 한마디
  const hell = inHell(), price = hell ? 1 : 10;
  const c = await dlg.choose([L.parrotFeed.replace('{p}', priceText(price, hell)), L.parrotLeave]);
  if (c === 0) {
    const have = hell ? hellState().notes : state.wallet ?? 0;
    if (have < price) await dlg.say(hell ? L.hwNoMoney : L.noMoney);
    else {
      if (hell) hellState().notes -= price; else state.wallet = (state.wallet ?? 0) - price;
      ecoLog('spend', 'parrot', price, hell);
      // 34차: 먹이 준 횟수 (1~144를 돈다) — 108번째엔 경계의 해변, 144번째엔 우주 어딘가의 유리 바닥 방이 잠깐 보인다
      const fed = (state.parrotFed ?? 0) % 144 + 1;
      state.parrotFed = fed;
      save(state); renderHud();
      shop.crest(true);
      await dlg.say(pick(L.parrotEat));
      if (fed !== 108 && fed !== 144 && Math.random() < 0.25) { await dlg.say(L.parrotVoice); await dlg.say(pick(L.parrotAfter)); }
      shop.crest(false);
      if (fed === 108 || fed === 144) { await parrotVision(fed === 108 ? 'shore' : 'void'); return; }
    }
  }
  endTalk();
}
/**
 * 34차 앵무새가 보여 주는 곳: 하얗게 바래며 잠깐 다른 곳에 서 있다 — 혼잣말 한마디 뒤 다시 우주새.
 * 저장(세계·자리)은 건드리지 않는다. 그동안 다른 것은 누를 수 없다 (busy)
 */
async function parrotVision(kind: 'shore' | 'void') {
  const L = t();
  dlg.close();
  const fx = worldFade('heaven', false);
  await fx.covered;
  shop.stop();
  shop.root.visible = false;
  hud.hidden = true;
  const z = kind === 'shore' ? borderZone(L.borderName) : voidZone(L.voidName);
  const v = new WorldScene(app, z, bodyLook(), () => undefined, hooks, maxHp(), { realm: 'border' });
  app.stage.addChild(v.root);
  v.setLook(bodyLook());
  v.setGear(gear());
  v.placeNear(z.spawn.i, z.spawn.j, maxHp());
  v.setStance('talk');
  v.start();
  if (kind === 'shore') showPlace(L.borderName, L.borderSub);
  fx.done();
  await new Promise((r) => setTimeout(r, 2600));
  dlg.open({ name: '', monologue: true });
  for (const line of kind === 'shore' ? L.parrotSee108 : L.parrotSee144) await dlg.say(line);
  dlg.close();
  await new Promise((r) => setTimeout(r, 900));
  const fx2 = worldFade('heaven', false);
  await fx2.covered;
  v.stop();
  v.destroy();
  shop.root.visible = true;
  shop.start();
  hud.hidden = false;
  renderHud();
  fx2.done();
  endTalk();
}

// ───────────────────────── 31차 염소대왕 ─────────────────────────
/**
 * 지옥에 떨어진 자가 맨 먼저 오는 곳: 지옥 142층 염소대왕의 방 (판관석 뒤에 앉은 염소대왕). 싸우지 않는다.
 * death = 현실에서 죽어 떨어짐 · chose = 살지 않기로 결정 · returned = 살기로 결정하지 않은 채 며칠 비웠다가 (모르는 사이에 죽었다) ·
 * visit = 상담이 끝난 뒤나 관리자가 찾아왔을 때 (꾸중 없이 묻고 답하기만). 방을 나서면 카르마에 맞는 층의 휴식 마을로 떨어진다
 */
type GkWhy = 'death' | 'chose' | 'returned';
let gkPending: { reason: GkWhy; want: number } | null = null;
async function talkToGoatKing(reason: GkWhy | 'visit', want = 0) {
  if (busy || dlg.isOpen) return;
  const L = t();
  busy = true;
  dlg.open({ name: L.gkName, portrait: 'goat-king' });
  const first = !(state.gk ?? 0);
  if (reason === 'visit') for (const l of L.gkWander) await dlg.say(l);
  else {
    gkPending = null;
    await dlg.say(L.gkArrive);
    state.gk = (state.gk ?? 0) + 1;
    save(state);
    for (const l of first ? L.gkFirst : L.gkAgain) await dlg.say(l);
    if (reason === 'chose') for (const l of L.gkChose) await dlg.say(l);
    if (reason === 'returned') for (const l of L.gkReturned) await dlg.say(l);
    // 꾸중 · 업의 수치 · 이번에 묵을 층
    const d = state.deeds ?? { good: 0, evil: 0 };
    const r = Math.round(evilRatio(d) ?? 100);
    const tier = d.good >= d.evil && d.evil < 1 ? 3 : r >= 80 ? 0 : r >= 60 ? 1 : r > 50 ? 2 : 3;
    await dlg.say(L.gkScold[tier]);
    await dlg.say(L.gkKarma.replace('{g}', fmtKarma(d.good)).replace('{e}', fmtKarma(d.evil)).replace('{r}', String(r)));
    const f = hellState().floor;
    await dlg.say(L.gkFloor.replace('{n}', String(f)).replace('{name}', floorDef(f).name[lang()]));
    if (want > f) await dlg.say(L.gkCap.replace('{m}', String(want)).replace('{n}', String(f)));
    if (first) await dlg.say(L.gkStart);
    await dlg.say(L.gkAsk);
  }
  // 묻고 답하기 (물러날 때까지)
  for (let n = 0; ; n++) {
    if (n > 0) await dlg.say(L.gkMore);
    const c = await dlg.choose(L.gkQ);
    if (c < 0 || c >= L.gkA.length) break;
    for (const l of L.gkA[c]) await dlg.say(l);
  }
  for (const l of L.gkBye) await dlg.say(l);
  if (reason !== 'visit') await dlg.say(L.gkChanger);
  endTalk();
  // 33차: 상담이 끝나도 바로 떨어지지 않는다 — 환전상에게 들렀다가 문(나가는 매트)으로 나서면 묵을 층의 휴식 마을로
  if (reason !== 'visit') { state.gkWait = { reason, want, done: true }; save(state); }
}
/** 142층 염소대왕의 방을 연다 (이 층 휴식 마을 위에 겹쳐 연다 — 나가면 그 휴식 마을). why가 있으면 잠시 뒤 염소대왕이 먼저 말을 건다 */
function openGoatRoom(g: { reason: GkWhy; want: number; done?: boolean } | null) {
  if (!world || world.zone.interior) return;
  const zh = world.zone.hell;
  if (!zh) return;
  const b: Building = { i0: zh.rest.i, j0: zh.rest.j, w: 1, d: 1, h: 0, cat: 'goatroom', color: '#000000' };
  openRoom(interiorZone(b, -142, { i: zh.rest.i, j: zh.rest.j }, t().gkRoom), null, false);
  if (!g || g.done) return; // 33차: 상담을 마친 뒤 다시 열면 방만 (환전상에게 들르고 문으로 나간다)
  gkPending = g;
  state.gkWait = g; // 상담 중에 창을 닫아도 다시 열면 이 방에서
  save(state);
  const tryMeet = (n: number) => {
    if (!gkPending || world?.zone.interior?.kind !== 'goatroom') return;
    if (busy || dlg.isOpen) { if (n < 30) setTimeout(() => tryMeet(n + 1), 1000); return; }
    talkToGoatKing(gkPending.reason, gkPending.want);
  };
  setTimeout(() => tryMeet(0), 1600);
}
/** 방을 나선다: 아래로 떨어져 묵을 층의 휴식 마을로 */
function leaveGoatRoom() {
  if (world?.zone.interior?.kind !== 'goatroom') return;
  if (state.gkWait) { delete state.gkWait; save(state); }
  const fx = hellFall(true);
  fx.covered.then(() => {
    leaveInterior(true);
    const f = hellState().floor;
    showPlace(t().hellPlace.replace('{n}', String(f)).replace('{name}', floorDef(f).name[lang()]), floorDef(f).sin[lang()]);
    fx.done();
  });
}
/** 살지 않기로 결정 · 며칠 비운 사이 죽음: 죽을 때처럼 돈은 흩어지고 가방은 봉인된다. 지옥(적어도 3층)에서 염소대왕을 만난다 */
function fallToGoat(reason: 'chose' | 'returned') {
  closeMenus();
  document.querySelector('.bag-panel')?.remove();
  document.querySelector('.store-panel')?.remove();
  const d = state.deeds ?? { good: 0, evil: 0 };
  const j = judge(d);
  const want = Math.max(HELL_START, j.world === 'hell' ? j.floor : HELL_START);
  seal('real');
  state.wallet = 0;
  state.played = Math.max(state.played ?? 0, RETURN_PLAYED);
  dropInterior();
  save(state);
  world?.revive(bodyLook());
  enterHell(want, 'fall', { reason, want });
}
const RETURN_AWAY = 3 * 864e5, RETURN_PLAYED = 30 * 60;
/** 살기로 결정하지 않은(가입하지 않은) 채 거의 하지 않고 나갔다가 며칠 뒤 돌아왔다 */
function returnedGhost() {
  if (net.account() || realm() !== 'real') return false;
  if (state.seen === undefined || state.played === undefined) return false;
  return Date.now() - state.seen > RETURN_AWAY && state.played < RETURN_PLAYED;
}

function pickItem(hell: boolean, start: ShopTab): Promise<{ it: ItemDef; sell: boolean; tab: ShopTab; steal?: boolean; ask?: 'dir' | 'work' } | null> {
  const L = t();
  const cats: ShopTab[] = hell ? ['goods', 'weapon', 'armor', 'sell'] : ['goods', 'weapon', 'armor', 'sell', 'ask']; // 무기와 방어구도 처음부터 · 팔기 · 21차 묻기(현실)
  let cat: ShopTab = start;
  return new Promise((resolve) => {
    const el = document.createElement('div');
    el.className = 'shop-menu';
    const head = document.createElement('div');
    head.className = 'menu-head';
    const tabs = document.createElement('div');
    tabs.className = 'menu-tabs';
    // 나가기는 탭 줄 끝의 ✕ (가방·은행 창과 같은 모양) — 좁은 화면에서 밀려나지 않게
    const closeBtn = document.createElement('button');
    closeBtn.className = 'menu-close';
    closeBtn.textContent = '✕';
    closeBtn.title = L.exitShop;
    closeBtn.setAttribute('aria-label', L.exitShop);
    head.append(tabs, closeBtn);
    const list = document.createElement('div');
    list.className = 'menu-list';
    el.append(head, list);
    let off: ((e: PointerEvent) => void) | null = null;
    const done = (v: { it: ItemDef; sell: boolean; tab: ShopTab; steal?: boolean; ask?: 'dir' | 'work' } | null) => {
      if (off) document.removeEventListener('pointerdown', off, true);
      dlg.setPanel(null);
      resolve(v);
    };
    closeBtn.onclick = () => done(null);
    const render = () => {
      tabs.innerHTML = '';
      for (const c of cats) {
        const b = document.createElement('button');
        b.textContent = c === 'sell' ? L.tabSell : c === 'ask' ? L.tabAsk : L.tabs[c];
        b.className = (c === cat ? 'on' : '') + (c === 'sell' ? ' sell' : '');
        b.onclick = () => { cat = c; render(); };
        tabs.appendChild(b);
      }
      list.innerHTML = '';
      const money = hell ? hellState().notes : state.wallet ?? 0;
      if (cat === 'ask') {
        // 21차: 미스 황에게 묻기 — 주요 가게 자리 · 일하는 법
        for (const [k, title, sub] of [['dir', L.askDir, L.askDirSub], ['work', L.askWork, L.askWorkSub]] as const) {
          const row = document.createElement('button');
          row.className = 'menu-item';
          row.innerHTML = `<span class="nm"></span><small></small>`;
          row.querySelector('.nm')!.textContent = title;
          row.querySelector('small')!.textContent = sub;
          row.onclick = () => done({ it: ITEMS[0], sell: false, tab: 'ask', ask: k });
          list.appendChild(row);
        }
        return;
      }
      if (cat === 'sell') {
        const mine = sellable(hell);
        if (!mine.length) { const p = document.createElement('p'); p.className = 'bag-empty'; p.textContent = L.sellNothing; list.appendChild(p); }
        for (const it of mine) {
          const row = itemRow(it, `×${state.bag![it.key]} · ${priceText(sellPrice(it), hell)}`, () => done({ it, sell: true, tab: cat }));
          const tag = document.createElement('span'); tag.className = 'act'; tag.textContent = L.sellBtn; row.appendChild(tag); row.classList.add('has-act');
          list.appendChild(row);
        }
        return;
      }
      const shelf = ITEMS.filter((x) => x.cat === cat && !x.store && !!x.hell === hell && onSale(x)); // 31차: 층 장비는 그 층에서만
      for (const it of shelf) list.appendChild(withSteal(itemRow(it, priceText(it.price, hell), () => done({ it, sell: false, tab: cat }), money < it.price), it, it.price, shelf.map((x) => ({ it: x, price: x.price })), () => done({ it, sell: false, tab: cat, steal: true })));
    };
    render();
    dlg.setPanel(el);
    dlg.say(L.pickPrompt);
    // 창 밖 빈 곳을 누르면 말없이 나간다 (대화 글상자·선택지는 빼고)
    off = (e: PointerEvent) => {
      const tg = e.target as HTMLElement;
      if (tg.closest('.dlg-panel, .dlg-box, .dlg-choices, #hud, .bag-panel, .soul-panel, .set-panel')) return;
      e.stopPropagation();
      done(null);
    };
    setTimeout(() => { if (off) document.addEventListener('pointerdown', off, true); }, 0);
  });
}

/** 몇 개: − 숫자 + 와 1·5·10·최대, 사기/팔기 단추에 모두 얼마인지. 뒤로 = 0 */
function askQty(it: ItemDef, unit: number, max: number, verb: 'buy' | 'sell' | 'store' | 'take'): Promise<number> {
  const L = t();
  const hell = inHell();
  return new Promise((resolve) => {
    let n = 1;
    const el = document.createElement('div');
    el.className = 'shop-menu qty-panel';
    el.innerHTML = `<div class="menu-head"><b></b><button class="menu-exit q-back"></button></div>
      <div class="qty-body"><div class="qty-item"></div>
        <div class="qty-row"><button class="q-m" aria-label="-">−</button><output class="q-n">1</output><button class="q-p" aria-label="+">+</button></div>
        <div class="qty-quick"></div>
        <button class="primary q-go"></button></div>`;
    el.querySelector('.menu-head b')!.textContent = verb === 'buy' ? L.qtyBuyTitle : verb === 'sell' ? L.qtySellTitle : verb === 'store' ? L.qtyStoreTitle : L.qtyTakeTitle;
    const back = el.querySelector('.q-back') as HTMLButtonElement;
    back.textContent = L.qtyBack;
    const row = itemRow(it, verb === 'store' ? '' : verb === 'take' ? L.cageFeeEach.replace('{p}', priceText(unit, hell)) : priceText(unit, hell), () => undefined);
    row.disabled = true;
    el.querySelector('.qty-item')!.appendChild(row);
    const out = el.querySelector('.q-n') as HTMLOutputElement, go = el.querySelector('.q-go') as HTMLButtonElement;
    const draw = () => {
      out.textContent = String(n);
      go.textContent = (verb === 'buy' ? L.qtyBuy : verb === 'sell' ? L.qtySell : verb === 'store' ? L.qtyStore : L.qtyTake).replace('{n}', String(n)).replace('{p}', priceText(unit * n, hell));
    };
    const set = (v: number) => { n = Math.max(1, Math.min(max, v)); draw(); };
    // 38차: 빠른 단추는 처음엔 그 수로, 다음부터는 더한다 (×10을 한 번 더 누르면 20) — 한 번 누른 뒤엔 '+10'으로 보인다
    let touched = false;
    const quickBtns: [HTMLButtonElement, number][] = [];
    const relabel = () => { for (const [b, q] of quickBtns) b.textContent = touched ? `+${q}` : `×${q}`; };
    (el.querySelector('.q-m') as HTMLButtonElement).onclick = () => { touched = true; set(n - 1); relabel(); };
    (el.querySelector('.q-p') as HTMLButtonElement).onclick = () => { touched = true; set(n + 1); relabel(); };
    for (const q of [1, 5, 10]) if (q <= max) { const b = document.createElement('button'); b.onclick = () => { set(touched ? n + q : q); touched = true; relabel(); }; quickBtns.push([b, q]); el.querySelector('.qty-quick')!.appendChild(b); }
    relabel();
    if (max > 1) { const b = document.createElement('button'); b.textContent = L.qtyMax.replace('{n}', String(max)); b.onclick = () => { set(max); touched = true; relabel(); }; el.querySelector('.qty-quick')!.appendChild(b); }
    // 29차: 대화창이 없을 때(거리 가게·지옥 장사꾼 창)는 화면 가운데 작은 창으로 — 한 번 더 확인하고 산다/판다
    const inDlg = dlg.isOpen;
    const wrap = inDlg ? null : document.createElement('div');
    const finish = (v: number) => { if (wrap) wrap.remove(); else dlg.setPanel(null); resolve(v); };
    back.onclick = () => finish(0);
    go.onclick = () => finish(n);
    draw();
    if (wrap) {
      wrap.className = 'qty-overlay';
      // 31차: 작은 창에서는 묻는 말을 빼다 — 제목('몇 개 살까요')과 물건 줄이 이미 같은 말을 한다
      wrap.appendChild(el);
      wrap.onpointerdown = (e) => { if (e.target === wrap) finish(0); };
      document.body.appendChild(wrap);
      return;
    }
    dlg.setPanel(el);
    dlg.say((verb === 'buy' ? L.qtyAsk : verb === 'sell' ? L.qtyAskSell : verb === 'store' ? L.qtyAskStore : L.qtyAskTake).replace('{item}', it.name[lang()]));
  });
}
/** 29차: 장비(무기·방어구·탄약)는 눌러도 바로 사지지 않는다 — 몇 개 살지 한 번 더 */
const needsConfirm = (it: ItemDef) => !it.now;
/** 29차: 모든 가게의 '사기 · 팔기' 탭 (가게 이름 줄 아래) */
type StoreMode = 'buy' | 'sell' | 'repair' | 'enh';
function storeTabs(el: HTMLElement, mode: () => StoreMode, set: (m: StoreMode) => void, repair = false) {
  const L = t();
  const tabs = document.createElement('div');
  tabs.className = 'menu-tabs store-tabs';
  const mk = (m: StoreMode, label: string) => {
    const b = document.createElement('button');
    b.textContent = label;
    b.className = m === 'sell' ? 'sell' : '';
    b.onclick = () => set(m);
    return b;
  };
  const bBuy = mk('buy', L.tabBuy), bSell = mk('sell', L.tabSell), bFix = mk('repair', L.tabRepair), bEnh = mk('enh', L.tabEnhance);
  tabs.append(bBuy, bSell);
  if (repair) tabs.append(bFix); // 30차: 철물점은 고쳐 준다 (35차: 현실 무기 강화는 없앴다 — 대신 비싼 장비가 단계별로 강하다)
  el.querySelector('.store-line')!.after(tabs);
  return () => { bBuy.classList.toggle('on', mode() === 'buy'); bSell.classList.toggle('on', mode() === 'sell'); bFix.classList.toggle('on', mode() === 'repair'); bEnh.classList.toggle('on', mode() === 'enh'); };
}
/** 29차: 가게 창의 '팔기' 목록 — 이 세계의 물건만 (현실 가게는 현실 물건 · 지옥 장사꾼은 지옥 물건), 값은 4할 */
function sellList(list: Element, hell: boolean, redraw: () => void) {
  const L = t();
  const mine = sellable(hell);
  if (!mine.length) { const p = document.createElement('p'); p.className = 'bag-empty'; p.textContent = L.sellNothing; list.appendChild(p); return; }
  // 37차: 몸에 걸친 것은 팔 수 있는 수에서 뺀다 (가방 3 · 1개 착용이면 2개까지)
  const wornN = (k: string) => Object.values(state.equip ?? {}).filter((x) => x === k).length;
  const free = (k: string) => Math.max(0, (state.bag?.[k] ?? 0) - wornN(k));
  for (const it of mine) {
    const p = sellPrice(it);
    if (free(it.key) <= 0) continue;
    const row = itemRow(it, `×${free(it.key)} · ${priceText(p, hell)}`, async () => {
      const have = free(it.key);
      const n = await askQty(it, p, have, 'sell');
      if (n <= 0 || free(it.key) < n) return;
      state.bag![it.key] -= n;
      if (hell) hellState().notes += p * n; else state.wallet = (state.wallet ?? 0) + p * n;
      ecoLog('earn', 'sell', p * n, hell);
      save(state); updateHud(); renderQuick();
      toast(L.sold.replace('{item}', it.name[lang()]).replace('{n}', String(n)).replace('{p}', priceText(p * n, hell)));
      redraw();
    });
    list.appendChild(row); // '팔기' 탭 안에서는 줄마다 '팔기'를 다시 쓰지 않는다
  }
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
  // 23차: 화살·탄약은 가방에 따로 안 보이니 지금 가진 수를 함께
  if (it.note === 'arrows' || it.note === 'ammo' || it.note === 'rifleammo') ef.textContent += ' · ' + (it.note === 'arrows' ? t().haveArrows : it.note === 'rifleammo' ? t().haveRifle : t().haveAmmo).replace('{n}', String((it.note === 'arrows' ? state.arrows : it.note === 'rifleammo' ? state.rifle : state.ammo) ?? 0));
  const pr = document.createElement('span');
  pr.className = 'price';
  pr.textContent = right;
  b.append(ic, nm, ef, pr);
  b.onclick = onClick;
  return b;
}

/** 문으로 나간다. 이번 생의 몸이 아직 없으면 스스로 묻고, 모습·성별·지역을 다시 고른다 */
async function goOut() {
  if (state.look && state.freshLife) {
    // 26차: 몸은 상담에서 이미 정했다 — 문 앞에서 한 번 스스로 묻고 나간다
    delete state.freshLife; save(state);
    busy = true; shop.lock(true);
    dlg.open({ name: '', monologue: true });
    await dlg.say(t().whoWasI);
    dlg.close();
    shop.lock(false); busy = false;
    leaveShop();
    return;
  }
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
      { id: 'seoul', label: L.regions.seoul, ready: true }, // 24차: 서울 강남 열림
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
function chooseBody(title: string, confirm: string, initial: Look, extra: { outfits?: Outfit[]; regions?: { id: string; label: string; ready: boolean }[]; cancel?: string } = {}): Promise<{ look: Look; region?: string; cancelled?: boolean }> {
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
      onCancel: extra.cancel ? () => { target.setInsets(0, 0); hud.hidden = false; resolve({ look: initial, cancelled: true }); } : undefined,
    });
  });
}

// ───────────────────────── 가방 · 장착 ─────────────────────────
// 장착 칸은 물건 종류에서 정한다 (목록을 따로 두면 새 무기가 빠진다 — 흑철 대검이 끼워지지 않던 까닭)
const ARMOR_SLOT: Record<string, Slot> = { helmet: 'head', mask: 'head', jacket: 'body', vest: 'body', gloves: 'hands', workpants: 'legs', shinguard: 'shins', boots: 'feet', shield: 'offhand' };
function slotOf(k: string): Slot | undefined {
  const it = itemByKey(k);
  if (!it || it.note === 'ammo' || it.note === 'arrows' || it.note === 'rifleammo') return undefined;
  if (it.cat === 'weapon') return 'weapon';
  if (it.cat === 'armor') return ARMOR_SLOT[it.sprite ?? it.key];
  return undefined;
}

function addToBag(it: ItemDef) {
  if (it.note === 'ammo' || it.note === 'arrows' || it.note === 'rifleammo') { delete state.unloaded; ammoGear(); } // 새로 사면 다시 끼운다
  if (it.note === 'rifleammo') { state.rifle = (state.rifle ?? 0) + 10; return; }
  if (it.note === 'ammo') { state.ammo = (state.ammo ?? 0) + 12; return; } // 22차: 지옥 유황 탄환·흑요석 화살도 같은 주머니로
  if (it.note === 'arrows') { state.arrows = (state.arrows ?? 0) + 20; state.arrowKey = it.key; return; } // 24차: 마지막에 산 화살이 시위에 걸린다 (화살 종류마다 공격력이 다르다)
  state.bag = state.bag ?? {};
  state.bag[it.key] = (state.bag[it.key] ?? 0) + 1;
}

/**
 * 31차: 화살·탄약이 새로 들어오면 손에 든 무기를 다시 셈한다. 활을 화살 없이 들었다가(휘둘러 치는 셈) 거리 가게·지옥 무기상·보관 우리에서
 * 화살을 받아도, 다음에 가방을 열기 전까지 계속 붙어서 활로 때리던 것 (싸우다 화살이 떨어진 뒤에도 같았다)
 */
function ammoGear() { queueMicrotask(() => { if (world) { world.setGear(gear()); renderAmmo(); } }); }
/** 20차: 방패는 권총·활·양손 무기와 함께 들 수 없다 */
const noShieldWith = (k?: string) => { const it = k ? itemByKey(k) : null; return !!it && (!!it.ranged || !!it.two || TWO.has(it.sprite ?? it.key)); };
// ───────────────────────── 30차: 내구도 · 수리 · 템브라 강화 ─────────────────────────
/**
 * 장비의 처음 내구도 (35차: 너무 빨리 망가진다 — 늘렸다): 칼·연장 220 · 양손 무기 260 · 쏘는 무기 240 · 방어구 220.
 * 값비싼 장비는 더 오래 간다 (현실 10만 바트↑ ×1.5 · 100만↑ ×2 / 지옥 300닢↑ ×1.5 · 900닢↑ ×2)
 */
function duraMax(it: ItemDef) {
  const b = it.cat === 'armor' ? 220 : it.two || TWO.has(it.sprite ?? it.key) ? 260 : it.ranged ? 240 : 220;
  const tier = it.hell ? (it.price >= 900 ? 2 : it.price >= 300 ? 1.5 : 1) : it.price >= 1_000_000 ? 2 : it.price >= 100_000 ? 1.5 : 1;
  return Math.round(b * tier);
}
function duraOf(k: string) { const it = itemByKey(k); return it ? Math.min(duraMax(it), state.dura?.[k] ?? duraMax(it)) : 0; }
function broken(k: string) { return (state.dura?.[k] ?? 1) <= 0; }
/** 35차: 예전 셈(최대 140~180)으로 닳은 값을 새 최대에 맞춰 늘린다. 예전에 망가진 무기는 박살 직전(5%)으로 되살려 고칠 기회를 준다 */
function migrateDura() {
  if ((state.duraV ?? 1) >= 2) return;
  state.duraV = 2;
  for (const [k, v] of Object.entries(state.dura ?? {})) {
    const it = itemByKey(k);
    if (!it) { delete state.dura![k]; continue; }
    const old = it.cat === 'armor' ? 160 : it.two ? 180 : it.ranged ? 160 : 140, max = duraMax(it);
    state.dura![k] = v <= 0 && it.cat === 'weapon' ? Math.max(1, Math.round(max * 0.05)) : Math.round((Math.max(0, v) / old) * max);
  }
}
/**
 * 싸울 때 닳는다 (35차: 때릴 때마다가 아니라 무기는 10번에 4번, 방어구는 맞을 때 2번에 1번).
 * 무기는 남은 내구도가 20% · 10% · 3%가 되면 그림 알림, 0이 되면 박살난다 — 고칠 수 없는 '박살난 무기'가 되어 싸게 팔기만 된다 (손은 맨손)
 */
function wear(kind: 'weapon' | 'armor') {
  if (Math.random() >= (kind === 'weapon' ? 0.4 : 0.5)) return;
  const eq = state.equip ?? {};
  const keys = kind === 'weapon' ? [eq.weapon].filter(Boolean) as string[] : Object.entries(eq).filter(([sl, k]) => sl !== 'weapon' && k).map(([, k]) => k as string);
  if (!keys.length) return;
  const k = keys[Math.floor(Math.random() * keys.length)];
  const it = itemByKey(k);
  if (!it || it.note === 'fuel') return;
  const max = duraMax(it), was = duraOf(k);
  if (was <= 0) return;
  const now = was - 1;
  (state.dura ??= {})[k] = now;
  const L = t();
  if (it.cat === 'weapon') {
    if (now <= 0) { shatterWeapon(k); return; }
    if ([0.2, 0.1, 0.03].some((f) => now === Math.max(1, Math.floor(max * f)))) duraAlert(it, now, max);
    return;
  }
  if (now === Math.floor(max * 0.2)) toast(L.duraLow.replace('{item}', it.name[lang()]));
  if (now === 0) { toast(L.duraBroken.replace('{item}', it.name[lang()]), 'evil'); world?.setGear(gear()); renderAmmo(); }
}
/** 35차: 무기가 박살난다 — 손에서 사라지고 가방에 '박살난 무기'가 남는다. 같은 무기가 더 있으면 새것을 꺼내 든다 */
function shatterWeapon(k: string) {
  const it = itemByKey(k);
  const bag = (state.bag ??= {});
  bag[k] = Math.max(0, (bag[k] ?? 1) - 1);
  const spare = bag[k] > 0;
  if (spare) state.dura![k] = duraMax(it); else { delete bag[k]; delete state.dura![k]; if (state.equip?.weapon === k) delete state.equip.weapon; }
  const wk = `wreck:${k}`;
  bag[wk] = (bag[wk] ?? 0) + 1;
  sfx.shatter();
  duraAlert(it, 0, duraMax(it), spare);
  world?.setGear(gear());
  if (scene === 'shop') shop.setLook(bodyLook(), gear());
  net.nudge();
  renderAmmo();
  save(state);
  if (document.querySelector('.bag-panel')) renderBag();
}
/**
 * 35차 그림 알림: 화면 위쪽 가운데에 무기 그림이 크게 뜬다. 닳았을 땐 금이 번지고 막대가 붉게 깜박이며,
 * 박살나면 그림이 두 조각으로 갈라져 흩어진다
 */
function duraAlert(it: ItemDef, now: number, max: number, spare = false) {
  const L = t();
  document.querySelector('.dura-alert')?.remove();
  const el = document.createElement('div');
  const gone = now <= 0;
  el.className = 'dura-alert' + (gone ? ' gone' : now <= max * 0.03 ? ' dire' : '');
  const pic = document.createElement('div');
  pic.className = 'da-pic';
  const base = iconFor(it);
  if (gone) {
    // 비스듬히 갈라진 두 조각 + 튀는 파편
    for (const side of [0, 1]) {
      const c = document.createElement('canvas'); c.width = c.height = 32;
      const g = c.getContext('2d')!;
      g.beginPath();
      if (side === 0) { g.moveTo(0, 0); g.lineTo(18, 0); g.lineTo(14, 10); g.lineTo(19, 17); g.lineTo(13, 24); g.lineTo(16, 32); g.lineTo(0, 32); }
      else { g.moveTo(18, 0); g.lineTo(32, 0); g.lineTo(32, 32); g.lineTo(16, 32); g.lineTo(13, 24); g.lineTo(19, 17); g.lineTo(14, 10); }
      g.closePath(); g.clip(); g.drawImage(base, 0, 0);
      c.className = 'da-half ' + (side ? 'r' : 'l');
      pic.appendChild(c);
    }
    for (let n = 0; n < 9; n++) { const s = document.createElement('i'); s.style.setProperty('--dx', `${Math.round((Math.random() - 0.5) * 150)}px`); s.style.setProperty('--dy', `${Math.round(-20 - Math.random() * 70)}px`); s.style.setProperty('--r', `${Math.round(Math.random() * 360)}deg`); pic.appendChild(s); }
  } else {
    base.className = 'da-whole';
    pic.appendChild(base);
    // 금: 남은 내구도가 적을수록 길게 번진다
    const ck = document.createElement('canvas'); ck.width = ck.height = 32; ck.className = 'da-crack';
    const g = ck.getContext('2d')!;
    const f = 1 - now / (max * 0.2);
    g.strokeStyle = '#fff4e0'; g.lineWidth = 1;
    g.beginPath(); g.moveTo(16, 2); g.lineTo(13, 9); g.lineTo(18, 14);
    if (f > 0.4) { g.lineTo(14, 21); g.moveTo(13, 9); g.lineTo(8, 12); }
    if (f > 0.8) { g.moveTo(14, 21); g.lineTo(19, 28); g.moveTo(18, 14); g.lineTo(25, 16); }
    g.stroke();
    pic.appendChild(ck);
  }
  const txt = document.createElement('div');
  txt.className = 'da-text';
  const name = it.name[lang()];
  const head = document.createElement('b');
  head.textContent = gone ? L.duraShatter.replace('{item}', name) : L.duraCrack.replace('{item}', name);
  const sub = document.createElement('span');
  sub.textContent = gone ? (spare ? L.duraSpare : L.duraBare) : L.duraLeft.replace('{n}', String(now)).replace('{m}', String(max));
  txt.append(head, sub);
  if (!gone) { const bar = document.createElement('i'); bar.className = 'da-bar'; bar.style.setProperty('--p', `${Math.max(3, Math.round((now / max) * 100))}%`); txt.appendChild(bar); }
  el.append(pic, txt);
  document.body.appendChild(el);
  if (!gone) sfx.crack();
  setTimeout(() => el.classList.add('out'), gone ? 3600 : 2800);
  setTimeout(() => el.remove(), gone ? 4200 : 3400);
}
/** 수리비: 닳은 만큼 물건 값의 3할 (적어도 ฿20 / 지옥 2닢) */
function repairCost(k: string) {
  const it = itemByKey(k);
  const max = duraMax(it), miss = max - duraOf(k);
  if (miss <= 0) return 0;
  return Math.max(it.hell ? 2 : 20, Math.ceil((it.price * 0.3 * miss) / max));
}
/** 고칠 것: 입고 있는 것과 가방의 장비 중 닳은 것 (현실 철물점은 현실 물건만 · 지옥 대장간은 지옥 물건만) */
function repairables(hell: boolean) {
  const ks = new Set<string>([...Object.values(state.equip ?? {}).filter(Boolean) as string[], ...Object.keys(state.bag ?? {}).filter((k) => (state.bag?.[k] ?? 0) > 0)]);
  return [...ks].map((k) => itemByKey(k)).filter((it) => it && isGearItem(it) && !it.wreck && !!it.hell === hell && it.note !== 'ammo' && it.note !== 'arrows' && it.note !== 'rifleammo' && it.note !== 'fuel' && repairCost(it.key) > 0);
}
function repairList(list: Element, hell: boolean, redraw: () => void) {
  const L = t();
  const items = repairables(hell);
  const p0 = document.createElement('p'); p0.className = 'cage-note'; p0.textContent = hell ? L.smithLine : L.repairLine; list.appendChild(p0);
  if (!items.length) { const p = document.createElement('p'); p.className = 'bag-empty'; p.textContent = L.repairNothing; list.appendChild(p); return; }
  // 33차: 한 번에 전부 고치기 (값은 하나씩 고칠 때와 같다)
  if (items.length >= 2) {
    const total = items.reduce((a, it) => a + repairCost(it.key), 0);
    const all = document.createElement('button');
    all.className = 'primary repair-all';
    all.textContent = L.repairAll.replace('{n}', String(items.length)).replace('{p}', priceText(total, hell));
    const have0 = hell ? hellState().notes : state.wallet ?? 0;
    all.disabled = have0 < total;
    all.onclick = () => {
      const have = hell ? hellState().notes : state.wallet ?? 0;
      if (have < total) { toast(hell ? L.hwNoMoney : L.noMoney); return; }
      if (hell) hellState().notes -= total; else state.wallet = (state.wallet ?? 0) - total;
      ecoLog('spend', 'repair', total, hell);
      for (const it of items) delete state.dura![it.key];
      save(state); updateHud(); world?.setGear(gear()); renderAmmo();
      toast(L.repairAllDone.replace('{n}', String(items.length)), 'good');
      redraw();
    };
    list.appendChild(all);
  }
  for (const it of items) {
    const cost = repairCost(it.key);
    const row = itemRow(it, `${L.duraShort.replace('{n}', String(duraOf(it.key))).replace('{m}', String(duraMax(it)))} · ${priceText(cost, hell)}`, () => {
      const have = hell ? hellState().notes : state.wallet ?? 0;
      if (have < cost) { toast(hell ? L.hwNoMoney : L.noMoney); return; }
      if (hell) hellState().notes -= cost; else state.wallet = (state.wallet ?? 0) - cost;
      ecoLog('spend', 'repair', cost, hell);
      delete state.dura![it.key];
      save(state); updateHud(); world?.setGear(gear()); renderAmmo();
      toast(L.repaired.replace('{item}', it.name[lang()]), 'good');
      redraw();
    }, (hell ? hellState().notes : state.wallet ?? 0) < cost);
    list.appendChild(row);
  }
}
/** 템브라 강화: +1~+3은 꼭 되고, 그 뒤로는 단계마다 어렵다. 실패해도 장비는 남는다 (템브라만 사라진다). 지옥 장비만, +10까지 */
const ENH_MAX = 10;
const ENH_ODDS = [1, 1, 1, 1, 0.7, 0.55, 0.42, 0.32, 0.24, 0.17, 0.12]; // 칸 = 오를 단계
function enhanceList(list: Element, redraw: () => void) {
  const L = t();
  const tem = state.bag?.tembra ?? 0, sh = state.bag?.tshard ?? 0;
  // 33차: ① 파편을 직접 틀에 끼워 템브라를 조립한다 (열세 칸) → ② 템브라를 쓸 장비를 고른다
  const asm = document.createElement('div');
  asm.className = 'tembra-asm';
  const filled = Math.min(12, state.tasm ?? 0);
  asm.innerHTML = `<b class="asm-title"></b><p class="cage-note"></p><div class="asm-ring"></div><button class="primary asm-put"></button>`;
  asm.querySelector('.asm-title')!.textContent = L.asmTitle;
  asm.querySelector('.cage-note')!.textContent = L.asmLine.replace('{s}', String(sh)).replace('{t}', String(tem));
  const ring = asm.querySelector('.asm-ring') as HTMLElement;
  for (let k = 0; k < 13; k++) { const d = document.createElement('i'); const a = (k / 13) * Math.PI * 2 - Math.PI / 2; d.style.left = `${50 + Math.cos(a) * 40}%`; d.style.top = `${50 + Math.sin(a) * 40}%`; if (k < filled) d.className = 'on'; ring.appendChild(d); }
  const put = asm.querySelector('.asm-put') as HTMLButtonElement;
  put.textContent = L.asmPut.replace('{n}', String(filled));
  put.disabled = sh < 1;
  put.onclick = () => {
    if ((state.bag?.tshard ?? 0) < 1) { toast(L.asmNone); return; }
    state.bag!.tshard -= 1;
    state.tasm = (state.tasm ?? 0) + 1;
    if (state.tasm >= 13) { state.tasm = 0; state.bag!.tembra = (state.bag!.tembra ?? 0) + 1; toast(L.tembraMade2, 'good'); sfx.chime(); }
    else sfx.thud(sfx.spot(0, 0));
    save(state); renderQuick();
    redraw();
  };
  list.appendChild(asm);
  const p0 = document.createElement('p'); p0.className = 'cage-note'; p0.textContent = `${L.asmPick} — ${L.enhRule}`; list.appendChild(p0);
  const ks = new Set<string>([...Object.values(state.equip ?? {}).filter(Boolean) as string[], ...Object.keys(state.bag ?? {}).filter((k) => (state.bag?.[k] ?? 0) > 0)]);
  const items = [...ks].map((k) => itemByKey(k)).filter((it) => it && it.hell && isGearItem(it) && !it.wreck && it.note !== 'fuel' && (it.enh ?? 0) < ENH_MAX);
  if (!items.length) { const p = document.createElement('p'); p.className = 'bag-empty'; p.textContent = L.enhNothing; list.appendChild(p); return; }
  for (const it of items) {
    const next = (it.enh ?? 0) + 1;
    const odds = ENH_ODDS[next];
    const row = itemRow(it, L.enhOdds.replace('{n}', String(next)).replace('{p}', String(Math.round(odds * 100))), async () => {
      if ((state.bag?.tembra ?? 0) < 1) { toast(L.enhNoTem2); return; }
      if (!(await confirmBox(L.enhAsk.replace('{item}', it.name[lang()]).replace('{n}', String(next)).replace('{p}', String(Math.round(odds * 100))), L.enhGo))) return;
      if ((state.bag?.tembra ?? 0) < 1) return;
      state.bag!.tembra -= 1;
      const base = it.base ?? it.key;
      if (Math.random() < odds) {
        const nk = `${base}+${next}`;
        // 입고 있던 것이면 바꿔 낀다 · 가방에서 하나를 강화한 것으로 바꾼다 · 내구도는 그대로
        const eq = state.equip ?? {};
        const slot = Object.entries(eq).find(([, k]) => k === it.key)?.[0] as Slot | undefined;
        state.bag![it.key] = Math.max(0, (state.bag![it.key] ?? 1) - 1);
        state.bag![nk] = (state.bag![nk] ?? 0) + 1;
        if (slot && (state.bag![it.key] ?? 0) < Object.values(eq).filter((x) => x === it.key).length) eq[slot] = nk;
        if (state.dura?.[it.key] !== undefined) { state.dura[nk] = state.dura[it.key]; if (!(state.bag![it.key] > 0)) delete state.dura[it.key]; }
        toast(L.enhOk.replace('{item}', itemByKey(nk).name[lang()]), 'good');
        sfx.chime();
      } else toast(L.enhFail.replace('{item}', it.name[lang()]), 'evil');
      save(state); world?.setGear(gear()); renderQuick();
      redraw();
    }, (state.bag?.tembra ?? 0) < 1);
    list.appendChild(row);
  }
}
/** 31차: 유황새가 이 층에서 파는가 (층 장비는 그 층에서만 · 공통 장비는 어디서나) */
function onSale(it: ItemDef) { return !it.sale || !inHell() || it.sale.includes(hellState().floor); }
/** 30차: 한 번 더 묻는 작은 창 (예 / 아니오) */
function confirmBox(text: string, ok: string): Promise<boolean> {
  return new Promise((resolve) => {
    const wrap = document.createElement('div');
    wrap.className = 'qty-overlay';
    const box = document.createElement('div');
    box.className = 'shop-menu qty-panel';
    const p = document.createElement('p'); p.className = 'qty-ask'; p.textContent = text;
    const row = document.createElement('div'); row.className = 'confirm-row';
    const no = document.createElement('button'); no.textContent = t().qtyBack;
    const yes = document.createElement('button'); yes.className = 'q-go'; yes.textContent = ok;
    const done = (v: boolean) => { wrap.remove(); resolve(v); };
    no.onclick = () => done(false); yes.onclick = () => done(true);
    wrap.onpointerdown = (e) => { if (e.target === wrap) done(false); };
    row.append(no, yes); box.append(p, row); wrap.appendChild(box);
    document.body.appendChild(wrap);
  });
}

function gear() {
  const eqAll = state.equip ?? {};
  const eq0 = Object.fromEntries(Object.entries(eqAll).filter(([, k]) => k && worldOk(itemByKey(k)))) as typeof eqAll; // 38차: 다른 세계의 장비는 힘을 쓰지 못한다
  const eq = eq0.offhand && noShieldWith(eq0.weapon) ? { ...eq0, offhand: undefined } : eq0;
  const w = eq.weapon ? itemByKey(eq.weapon) : null;
  const wBroken = !!w && broken(w.key); // 30차: 내구도가 바닥난 무기는 맨손 셈 (몸에는 그대로 든다)
  // 쏘는 무기: 권총은 탄약, 활은 화살이 있어야 멀리서 쏜다 (없으면 휘둘러 치는 셈)
  const shots = w?.note === 'needsAmmo' ? state.ammo ?? 0 : w?.note === 'needsArrows' ? state.arrows ?? 0 : w?.note === 'needsRifle' ? state.rifle ?? 0 : w?.note === 'fuel' ? fuelLeft() : 0; // 22차: 지옥의 뼈활·화승총도 · 25차 화염방사기는 오늘 남은 연료
  const ranged = !!w?.ranged && shots > 0 && !(state.unloaded && w.note !== 'fuel'); // 25차: 화살·탄약을 빼 두면 쏘지 않는다
  const def = Object.entries(eq).reduce((s, [slot, k]) => (slot === 'weapon' || !k || broken(k) ? s : s + (itemByKey(k)?.def ?? 0)), 0);
  const dr = Object.entries(eq).reduce((s, [, k]) => (!k ? s : s + (itemByKey(k)?.dr ?? 0)), 0);
  const armor = Object.entries(eq).filter(([slot, k]) => slot !== 'weapon' && k && itemByKey(k)).map(([, k]) => itemByKey(k as string).sprite ?? (k as string));
  // 24차: 활과 화살이 공격력을 반씩 나눈다 (활 < 근접 < 총)
  const arrowAtk = w?.note === 'needsArrows' ? itemByKey(state.arrowKey ?? (inHell() ? 'harrows' : 'arrows'))?.atk ?? 3 : 0;
  return { atk: wBroken ? 0 : w?.ranged ? (ranged ? (w.atk ?? 0) + arrowAtk : 1) : w?.atk ?? 0, def, dr, ranged: ranged && !wBroken, dry: !!w?.ranged && !wBroken && !ranged, flame: w?.note === 'fuel', range: w?.range, rate: w?.rate, reach: !wBroken && !w?.ranged ? w?.reach : undefined, weapon: w ? w.sprite ?? w.key : null, armor };
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

/** 가방의 두 칸: 소비(먹고 쓰는 것) · 장비(무기·방어구) */
let bagTab: 'use' | 'gear' = 'use';
/** 25차: 장비 몸 그림에서 눌러 둔 칸 (자세한 효과를 아래에 보인다) */
type DollSel = Slot | 'ammo';
let dollSel: DollSel | null = null;
const isGearItem = (it: ItemDef) => it.cat === 'weapon' || it.cat === 'armor' || !!it.wreck; // 35차: 박살난 무기도 장비 칸에 (낄 수는 없다)
/** 하나를 먹거나 감는다 (가방 · 빠른 칸 공통) */
/** 38차: 먹고 쓰는 것은 한 번 쓰면 잠깐(1초) 뒤에 다시 — 마구 삼켜 버티지 못하게, 비싼 회복약이 값을 하게 */
const USE_CD_MS = 1000;
let useReadyAt = 0;
const itemCooling = () => performance.now() < useReadyAt;
function useItem(k: string): boolean | 'wait' {
  const bag = state.bag ?? {};
  const it = itemByKey(k);
  if (!it?.heal || !(bag[k] > 0)) return false;
  if (!worldOk(it)) { toast(t().otherWorldItem); return false; }
  if (itemCooling()) return 'wait';
  useReadyAt = performance.now() + USE_CD_MS;
  quickBtn.classList.remove('cd'); void quickBtn.offsetWidth; quickBtn.classList.add('cd');
  bag[k] -= 1;
  if (world && scene === 'world') world.heal(it.heal);
  else state.hp = Math.min(maxHp(), (state.hp ?? maxHp()) + it.heal);
  save(state);
  return true;
}
/**
 * 30차 일기장: 읽으면 가장 가까운 우주새로 — 현실은 지금 도시(방콕·서울)의 우주새, 지옥은 그 층의 유황새, 천국은 천국의 우주새.
 * 이미 우주새 안이거나 경계·귀신이면 쓸 수 없다
 */
async function readDiary(k: string) {
  const L = t();
  if (busy) return;
  if (scene === 'shop') { toast(L.diaryHere); return; }
  if (realm() === 'border' || realm() === 'ghost' || !world || world.isDead) { toast(L.diaryNo); return; }
  const bag = state.bag ?? {};
  if (!(bag[k] > 0)) return;
  bag[k] -= 1;
  save(state);
  busy = true;
  dlg.open({ name: '', monologue: true });
  await dlg.say(pick(L.diaryRead));
  dlg.close();
  busy = false;
  if (world.zone.interior) dropInterior();
  enterShop(false);
}
let bagDrop: string | null = null; // 버리기를 묻고 있는 물건
function renderBag() {
  document.querySelector('.bag-panel')?.remove();
  const L = t();
  const el = document.createElement('div');
  el.className = 'bag-panel shop-menu';
  const head = document.createElement('div');
  head.className = 'menu-head';
  const tabs = document.createElement('div');
  tabs.className = 'menu-tabs';
  for (const [k, label] of [['use', L.bagUse], ['gear', L.bagGear]] as const) {
    const b = document.createElement('button');
    b.textContent = label;
    b.className = bagTab === k ? 'on' : '';
    b.onclick = () => { bagTab = k; bagDrop = null; renderBag(); };
    tabs.appendChild(b);
  }
  const close = document.createElement('button');
  close.className = 'menu-close';
  close.textContent = '✕';
  close.onclick = () => el.remove();
  head.append(tabs, close);
  const info = document.createElement('div');
  info.className = 'bag-info';
  info.hidden = true; // 23차: 화살·탄약은 장비 몸 그림의 칸과 공격 버튼 위에만 (같은 것을 두 번 보이지 않게)
  // 19차 켈베로스 호출 (지옥 로비에서 사 온 것): 현실에서만 부를 수 있다
  if ((state.kerberos ?? 0) > 0 && bagTab === 'use') {
    const kb = document.createElement('button');
    kb.className = 'bag-kerberos';
    const left = world?.kerberosLeft ?? 0;
    kb.textContent = left > 0 ? L.kerbActive.replace('{m}', String(Math.ceil(left / 60))) : L.kerbCall.replace('{n}', String(state.kerberos));
    kb.disabled = left > 0;
    kb.onclick = () => {
      if (!world || scene !== 'world' || realm() !== 'real' || world.zone.interior) { toast(L.kerbOnlyReal); return; }
      if (!world.summonKerberos(600)) return;
      state.kerberos = Math.max(0, (state.kerberos ?? 1) - 1);
      save(state);
      el.remove();
    };
    info.hidden = false;
    info.appendChild(kb);
  }
  const list = document.createElement('div');
  list.className = 'menu-list';
  const bag = state.bag ?? {};
  // 20차: 장비 탭에서는 끼고 있는 것은 위 몸 그림에만 (같은 것을 두 번 보이지 않게) — 남는 것만 목록에
  const worn = (k: string) => Object.values(state.equip ?? {}).filter((x) => x === k).length;
  const keys = Object.keys(bag).filter((k) => bag[k] > 0 && itemByKey(k) && isGearItem(itemByKey(k)) === (bagTab === 'gear') && (bagTab !== 'gear' || bag[k] - worn(k) > 0));
  if (!keys.length) { const p = document.createElement('p'); p.className = 'bag-empty'; p.textContent = bagTab === 'gear' ? L.bagEmptyGear : L.bagEmpty; list.appendChild(p); }
  const redraw = () => { renderBag(); renderHud(); renderQuick(); };
  for (const k of keys) {
    const it = itemByKey(k);
    const slot = slotOf(k);
    const on = bagTab !== 'gear' && !!slot && state.equip?.[slot] === k; // 장비 탭의 목록은 끼지 않은 여분뿐
    const quick = state.quick === k;
    const label = it.use ? L.readBook : it.heal ? (it.key === 'bandage' || it.key === 'hbandage' ? L.use : L.eat) : slot ? (on ? L.unequip : L.equip) : '';
    const foreign = !worldOk(it);
    const row = itemRow(it, `${foreign ? L.otherWorldTag + ' · ' : ''}${slot ? L.slotNames[slot] + ' · ' : it.wreck ? L.wreckTag + ' · ' : ''}×${bag[k] - (bagTab === 'gear' ? worn(k) : 0)}${on ? ' · ' + L.equipped : ''}`, () => {
      if (bagDrop) { bagDrop = null; renderBag(); return; }
      if (it.use === 'diary') { el.remove(); void readDiary(k); return; }
      if (!on && !worldOk(it)) { toast(L.otherWorldItem); return; } // 38차
      if (it.heal) { if (useItem(k) === 'wait') { toast(L.useWait); return; } }
      else if (slot) {
        state.equip = state.equip ?? {};
        if (!on && slot === 'offhand' && noShieldWith(state.equip.weapon)) { toast(L.shieldNo); return; }
        if (!on && slot === 'weapon' && state.equip.offhand && noShieldWith(k)) { delete state.equip.offhand; toast(L.shieldOff); }
        if (on) delete state.equip[slot]; else state.equip[slot] = k;
        world?.setGear(gear());
        if (scene === 'shop') shop.setLook(bodyLook(), gear());
        net.nudge();
      } else return;
      save(state);
      redraw();
    });
    if (label) { const tag = document.createElement('span'); tag.className = 'act'; tag.textContent = label; row.appendChild(tag); row.classList.add('has-act'); }
    const wrap = document.createElement('div');
    wrap.className = 'bag-row' + (quick ? ' quick' : '');
    wrap.appendChild(row);
    const side = document.createElement('div');
    side.className = 'bag-side';
    // 소비품 하나를 빠른 칸에 끼운다 (화면 오른쪽 아래, 누르면 바로 먹기)
    if (it.heal) {
      const q = document.createElement('button');
      q.className = 'b-quick' + (quick ? ' on' : '');
      q.title = quick ? L.quickOff : L.quickOn;
      q.textContent = quick ? '★' : '☆';
      q.onclick = () => { state.quick = quick ? undefined : k; save(state); redraw(); toast(quick ? L.quickOffDone : L.quickOnDone.replace('{item}', it.name[lang()])); };
      side.appendChild(q);
    }
    const del = document.createElement('button');
    del.className = 'b-drop';
    del.title = L.dropItem;
    del.textContent = '🗑';
    del.onclick = () => { bagDrop = bagDrop === k ? null : k; renderBag(); };
    side.appendChild(del);
    wrap.appendChild(side);
    list.appendChild(wrap);
    // 버리기: 하나 · 모두 · 그만 (끼고 있던 것이면 벗고 버린다)
    if (bagDrop === k) {
      const ask = document.createElement('div');
      ask.className = 'bag-ask';
      ask.innerHTML = `<span></span>`;
      ask.querySelector('span')!.textContent = L.dropAsk.replace('{item}', it.name[lang()]);
      const drop = (n: number) => {
        bag[k] = Math.max(0, bag[k] - n);
        if (bag[k] <= 0 && slot && state.equip?.[slot] === k) { delete state.equip![slot]; world?.setGear(gear()); net.nudge(); }
        if (bag[k] <= 0 && state.quick === k) state.quick = undefined;
        bagDrop = null;
        save(state);
        toast(L.dropped.replace('{item}', it.name[lang()]).replace('{n}', String(n)));
        redraw();
      };
      const b1 = document.createElement('button'); b1.textContent = L.dropOne; b1.onclick = () => drop(1);
      ask.appendChild(b1);
      if (bag[k] > 1) { const ba = document.createElement('button'); ba.textContent = L.dropAll.replace('{n}', String(bag[k])); ba.onclick = () => drop(bag[k]); ask.appendChild(ba); }
      const bc = document.createElement('button'); bc.textContent = L.dropCancel; bc.onclick = () => { bagDrop = null; renderBag(); };
      ask.appendChild(bc);
      list.appendChild(ask);
    }
  }
  // 20차: 장비 탭 — 위에 몸 그림(부위마다 끼고 있는 것), 아래로 넘겨 보는 목록
  if (bagTab === 'gear') {
    const doll = document.createElement('div');
    doll.className = 'bag-doll';
    doll.innerHTML = dollSvg(bodyLook().sex === 'f' ? 'f' : 'm');
    const equip = state.equip ?? {};
    // 25차: 칸을 누르면 아래에 그 물건의 자세한 효과 · 벗는 것은 ✕를 정확히 눌렀을 때만. 공격력·방어력은 칸에 늘 보인다
    const pick = (k: DollSel) => { dollSel = dollSel === k ? null : k; renderBag(); };
    const offBtn = (act: () => void, title: string) => {
      const x = document.createElement('button');
      x.className = 'off'; x.textContent = '✕'; x.title = title; x.setAttribute('aria-label', title);
      x.onclick = (e) => { e.stopPropagation(); dollSel = null; act(); };
      return x;
    };
    const statOf = (it: ItemDef) => {
      const parts = [it.atk ? L.atkShort.replace('{n}', String(it.atk)) : '', it.def ? L.defShort.replace('{n}', String(it.def)) : ''].filter(Boolean);
      if (!parts.length) return null;
      const b = document.createElement('b'); b.className = 'stat'; b.textContent = parts.join(' '); return b;
    };
    const unwear = (sl: Slot) => {
      if (!state.equip?.[sl]) return;
      delete state.equip[sl];
      world?.setGear(gear());
      if (scene === 'shop') shop.setLook(bodyLook(), gear());
      net.nudge();
      save(state);
      renderBag(); renderHud(); renderAmmo();
    };
    for (const sl of ['weapon', 'offhand', 'head', 'body', 'hands', 'legs', 'shins', 'feet'] as Slot[]) {
      const cell = document.createElement('div');
      const k = equip[sl];
      const it = k ? itemByKey(k) : null;
      cell.className = `doll-slot ds-${sl}` + (it ? ' on' : '') + (it && dollSel === sl ? ' sel' : '');
      const lb = document.createElement('small');
      lb.textContent = L.slotNames[sl];
      cell.appendChild(lb);
      if (it) {
        const ic = iconFor(it); ic.className = 'icon';
        const tx = document.createElement('div'); tx.className = 'ds-text';
        const nm = document.createElement('span'); nm.textContent = it.name[lang()];
        tx.appendChild(nm);
        const st = statOf(it); if (st) tx.appendChild(st);
        // 30차 내구도: 칸 아래 가는 막대 (닳으면 주황 · 망가지면 빨강)
        const dm = duraMax(it), dn = duraOf(it.key);
        const bar = document.createElement('i'); bar.className = 'dura' + (dn <= 0 ? ' broken' : dn <= dm * 0.2 ? ' low' : '');
        bar.style.setProperty('--d', `${Math.max(0, Math.round((dn / dm) * 100))}%`);
        cell.append(ic, tx, offBtn(() => unwear(sl), L.unequip), bar);
        cell.tabIndex = 0; cell.setAttribute('role', 'button');
        cell.onclick = () => pick(sl);
      } else { const nm = document.createElement('span'); nm.className = 'empty'; nm.textContent = '—'; cell.appendChild(nm); }
      doll.appendChild(cell);
    }
    // 23차: 화살·탄약 칸 — 활이면 화살, 총이면 탄약, 둘 다 아니면 가진 것 · 25차: ✕로 빼 두고 '끼우기'로 다시 (빼 두면 쏘지 않는다)
    const am = pouch();
    const ac = document.createElement('div');
    const loadable = am.some((x) => x.it.note === 'arrows' || x.it.note === 'ammo' || x.it.note === 'rifleammo');
    ac.className = 'doll-slot ds-ammo' + (am.length ? ' on' : '') + (am.some((x) => x.need && x.n <= 0) ? ' dry' : '') + (state.unloaded && loadable ? ' unloaded' : '') + (dollSel === 'ammo' && am.length ? ' sel' : '');
    const al = document.createElement('small');
    al.textContent = am[0]?.text ? L.fuelSlot : L.ammoSlot;
    ac.appendChild(al);
    if (am.length) {
      for (const x of am) { const ic = iconFor(x.it); ic.className = 'icon'; const nm = document.createElement('span'); nm.textContent = x.text ?? x.label; ac.append(ic, nm); }
      const at = am[0].it.atk; if (at && am[0].it.note === 'arrows') { const b = document.createElement('b'); b.className = 'stat'; b.textContent = L.atkShort.replace('{n}', String(at)); ac.appendChild(b); }
      if (loadable && !state.unloaded) ac.appendChild(offBtn(() => { state.unloaded = true; world?.setGear(gear()); save(state); renderBag(); renderAmmo(); toast(L.unloadedToast); }, L.unload));
      if (loadable && state.unloaded) { const rl = document.createElement('button'); rl.className = 'reload'; rl.textContent = L.reload; rl.onclick = (e) => { e.stopPropagation(); state.unloaded = false; world?.setGear(gear()); save(state); renderBag(); renderAmmo(); }; ac.appendChild(rl); }
      ac.tabIndex = 0; ac.setAttribute('role', 'button');
      ac.onclick = () => pick('ammo');
    } else { const nm = document.createElement('span'); nm.className = 'empty'; nm.textContent = '—'; ac.appendChild(nm); }
    doll.appendChild(ac);
    // 고른 칸의 자세한 효과 (칸에 이미 보이는 이름·공격력·방어력은 되풀이하지 않는다). 고른 칸이 없으면 끼고 있는 것의 합
    const det = document.createElement('div');
    det.className = 'doll-info';
    const selIt = dollSel === 'ammo' ? am[0]?.it : dollSel ? (equip[dollSel] ? itemByKey(equip[dollSel]!) : null) : null;
    if (selIt) {
      const more = effectText(selIt, lang(), true);
      const du = isGearItem(selIt) && dollSel !== 'ammo' && selIt.note !== 'fuel' ? L.duraShort.replace('{n}', String(duraOf(selIt.key))).replace('{m}', String(duraMax(selIt))) : '';
      det.textContent = [du, more].filter(Boolean).join(' · ') || L.dollNoMore;
    } else {
      const g = gear();
      det.textContent = L.dollTotal.replace('{a}', String(g.atk)).replace('{d}', String(g.def)) + (g.dr ? ' · ' + L.dollDr.replace('{n}', String(g.dr)) : '');
    }
    doll.appendChild(det);
    doll.appendChild(ac);
    el.append(head, info, doll, list);
  } else el.append(head, info, list);
  document.body.appendChild(el);
  // HUD가 두 줄로 접히는 좁은 화면에서도 가방이 HUD를 덮지 않도록
  const hudBottom = document.getElementById('hud')?.getBoundingClientRect().bottom ?? 56;
  el.style.top = `${Math.round(hudBottom + 6)}px`;
  el.style.maxHeight = `calc(100vh - ${Math.round(hudBottom + 20)}px)`;
}

/**
 * 22차: 장비 창 몸 그림 — 남성형(넓은 어깨·곧은 허리)과 여성형(좁은 어깨·잘록한 허리·넓은 골반·긴 머리).
 * 왼쪽 반을 그리고 거울로 오른쪽을 만든다
 */
type Seg = ['L', number, number] | ['Q', number, number, number, number];
/** 가운데 줄(x=30)에서 시작해 왼쪽 윤곽을 돌아 다시 가운데로 오는 반쪽 → 거울로 이어 붙인 온전한 윤곽 (가운데 이음선이 생기지 않게) */
function mirrorPath(start: [number, number], segs: Seg[]) {
  const pts: [number, number][] = [start];
  for (const sg of segs) pts.push(sg[0] === 'L' ? [sg[1], sg[2]] : [sg[3], sg[4]]);
  const m = (x: number) => +(60 - x).toFixed(2);
  let d = `M${start[0]} ${start[1]}`;
  for (const sg of segs) d += sg[0] === 'L' ? ` L${sg[1]} ${sg[2]}` : ` Q${sg[1]} ${sg[2]} ${sg[3]} ${sg[4]}`;
  for (let k = segs.length - 1; k >= 0; k--) {
    const sg = segs[k], prev = pts[k];
    d += sg[0] === 'L' ? ` L${m(prev[0])} ${prev[1]}` : ` Q${m(sg[1])} ${sg[2]} ${m(prev[0])} ${prev[1]}`;
  }
  return `<path d="${d} Z"/>`;
}
function dollSvg(sex: 'm' | 'f') {
  const torso = sex === 'm'
    ? mirrorPath([30, 23.5], [['Q', 22, 23, 16, 25.5], ['L', 14.2, 34], ['Q', 15.5, 49, 20, 61.5], ['L', 21, 70.5], ['L', 30, 70.5]])
    : mirrorPath([30, 23.8], [['Q', 23, 23.5, 18, 25.8], ['L', 17, 33.5], ['Q', 17.6, 43, 22, 52], ['Q', 23, 56.5, 21, 62], ['Q', 18.2, 67.5, 18.4, 72.5], ['L', 30, 72.5]]);
  const limbs = sex === 'm'
    ? `<path d="M15.2 27 Q10 29.5 9.6 39 L8.6 59 Q8.4 69 10.2 76 L13.2 76 Q13.8 68 14.2 60 L16.4 42 Z"/>
       <path d="M21 70.5 H29.6 L29.1 97 L28.2 121.5 Q28.4 125.5 24.8 125.5 L20.6 125.5 Q19.4 123.5 22 121.2 L22.2 97 Q20.6 84 21 70.5 Z"/>`
    : `<path d="M18 27.2 Q13 29.5 12.6 39 L12.2 59.5 Q12.1 68.5 13.8 75 L16.3 75 Q16.5 67 16.6 60 L18.6 42 Z"/>
       <path d="M18.6 72.5 H29.6 L29.1 98.5 L28.6 121.5 Q28.6 125.5 25.6 125.5 L22.4 125.5 Q21.3 123.5 23.6 121.2 L22.6 98.5 Q19.4 86 18.6 72.5 Z"/>`;
  // 머리: 남자는 짧은 머리, 여자는 어깨 너머로 흘러내리는 긴 머리 (얼굴 뒤에 그린다)
  const hair = sex === 'm'
    ? mirrorPath([30, 3.4], [['Q', 23, 3.4, 22.8, 11], ['Q', 26, 6.8, 30, 7.4]]).replace('<path', '<path class="hair"')
    : mirrorPath([30, 2.8], [['Q', 22.6, 2.6, 22.4, 12], ['Q', 22.2, 20, 20.4, 27.6], ['Q', 24.4, 26, 26.4, 21.6], ['Q', 25.6, 15.4, 27.6, 12.8], ['Q', 29, 11.4, 30, 11.4]]).replace('<path', '<path class="hair"');
  const face = sex === 'm' ? `<ellipse cx="30" cy="12.5" rx="7.2" ry="8.6"/><path d="M27.2 19.6 h5.6 v4.6 h-5.6z"/>` : `<path d="M28 19.8 h4 v4.4 h-4z"/><ellipse cx="30" cy="12.6" rx="6.5" ry="8.2"/>`;
  const order = sex === 'm' ? `${face}${hair}` : `${hair}${face}`;
  return `<svg class="doll-fig doll-${sex}" viewBox="0 0 60 130" aria-hidden="true"><g>${limbs}</g><g transform="matrix(-1 0 0 1 60 0)">${limbs}</g>${torso}${order}</svg>`;
}

/** 23차: 화살 주머니·탄약 주머니. 쏘는 무기를 들었으면 그 무기에 맞는 것만(0이어도), 아니면 가진 것 */
/** 25차 화염방사기 연료: 하루(UTC 날짜) 5분 = 300초. 불을 한 번 뿜을 때마다 FLAME_BURST초 */
const FLAMER_SEC = 300;
const FLAME_BURST = 0.62;
function fuelLeft() {
  const f = state.flamer;
  return Math.max(0, FLAMER_SEC - (f && f.d === today() ? f.used : 0));
}
const mmss = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
function pouch(): { it: ItemDef; n: number; label: string; need: boolean; text?: string }[] {
  const L = t();
  const w = state.equip?.weapon ? itemByKey(state.equip.weapon) : null;
  if (w?.note === 'fuel') { const n = fuelLeft(); return [{ it: w, n: Math.ceil(n), label: L.fuelLeft.replace('{t}', mmss(n)), need: true, text: mmss(n) }]; }
  const hell = inHell();
  const arrows = { it: itemByKey(state.arrowKey ?? (hell ? 'harrows' : 'arrows')), n: state.arrows ?? 0, label: L.arrowsLeft.replace('{n}', String(state.arrows ?? 0)), need: w?.note === 'needsArrows' };
  const ammo = { it: itemByKey(hell ? 'hshot' : 'ammo'), n: state.ammo ?? 0, label: L.ammoLeft.replace('{n}', String(state.ammo ?? 0)), need: w?.note === 'needsAmmo' };
  const rifle = { it: itemByKey('rifleammo'), n: state.rifle ?? 0, label: L.rifleLeft.replace('{n}', String(state.rifle ?? 0)), need: w?.note === 'needsRifle' };
  if (arrows.need) return [arrows];
  if (ammo.need) return [ammo];
  if (rifle.need) return [rifle];
  return [arrows, ammo, rifle].filter((x) => x.n > 0);
}
/** 23차: 공격 버튼 위의 남은 화살·탄약 (쏘는 무기를 들었을 때만). 누르면 장비 칸 */
const ammoChip = document.createElement('button');
ammoChip.className = 'ammo-chip';
ammoChip.hidden = true;
document.body.appendChild(ammoChip);
ammoChip.onclick = () => { if (busy || dlg.isOpen) return; bagTab = 'gear'; bagDrop = null; closeMenus(); renderBag(); };
let ammoShown = '';
function renderAmmo() {
  const x = pouch().find((p) => p.need);
  const on = !!x && scene === 'world' && realm() !== 'ghost';
  const key = on ? `${x.it.key}|${x.n}|${state.unloaded ? 1 : 0}` : '';
  if (key === ammoShown) return;
  ammoShown = key;
  ammoChip.hidden = !on;
  if (!on) return;
  ammoChip.innerHTML = '';
  const ic = iconFor(x.it);
  ic.className = 'icon';
  const c = document.createElement('b');
  c.textContent = x.text ?? String(x.n);
  ammoChip.append(ic, c);
  ammoChip.classList.toggle('dry', x.n <= 0);
  ammoChip.classList.toggle('low', x.n > 0 && x.n <= (x.text ? 30 : 5));
  ammoChip.classList.toggle('off', !!state.unloaded && !x.text); // 25차: 빼 둔 화살·탄약
  ammoChip.title = x.label;
}
/** 빠른 칸: 가방에서 별표한 소비품 하나. 누르면 바로 먹는다 (다 떨어지면 빈 칸) */
const quickBtn = document.createElement('button');
quickBtn.className = 'quick-slot';
quickBtn.hidden = true;
document.body.appendChild(quickBtn);
quickBtn.onclick = () => {
  const k = state.quick;
  if (!k || busy || dlg.isOpen) return;
  const r = useItem(k);
  if (r === 'wait') return;
  if (!r) { toast(t().quickEmpty); return; }
  quickBtn.classList.remove('pop'); void quickBtn.offsetWidth; quickBtn.classList.add('pop');
  renderQuick();
  if (document.querySelector('.bag-panel')) renderBag();
};
function renderQuick() {
  renderAmmo();
  const k = state.quick;
  const n = k ? state.bag?.[k] ?? 0 : 0;
  quickBtn.hidden = !k || scene !== 'world';
  if (!k) return;
  const it = itemByKey(k);
  quickBtn.innerHTML = '';
  const ic = iconFor(it);
  ic.className = 'icon';
  const c = document.createElement('small');
  c.textContent = String(n);
  quickBtn.append(ic, c);
  quickBtn.classList.toggle('empty', n <= 0);
  quickBtn.title = `${it.name[lang()]} ×${n}`;
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

/** 영격이 올랐다: 화면 가운데 금빛 글자 + 캐릭터 발밑 빛기둥 + 소리. 오른 만큼 능력치 점수가 생긴다 */
function rankUpShow(rank: number) {
  const L = t();
  sfx.rankUp();
  world?.rankUpFx();
  if (world && scene === 'world') state.hp = maxHp();
  document.querySelector('.rankup')?.remove();
  const el = document.createElement('div');
  el.className = 'rankup';
  el.innerHTML = `<div class="ru-ray"></div><small></small><b></b><span></span>`;
  el.querySelector('small')!.textContent = L.rankUpTitle;
  el.querySelector('b')!.textContent = `${L.rank} ${rank}`;
  el.querySelector('span')!.textContent = L.rankUpSub.replace('{n}', String(POINTS_PER_RANK));
  document.body.appendChild(el);
  requestAnimationFrame(() => el.classList.add('show'));
  setTimeout(() => el.classList.add('out'), 2800);
  setTimeout(() => el.remove(), 3600);
  renderHud();
  hud.querySelector('.to-soul')?.classList.add('glow');
}

function toast(text: string, kind: '' | 'good' | 'evil' = '') {
  text = wonify(text); // 32차: 서울이면 원화로
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
  const verdict = j.world === 'heaven' ? L.judgeHeaven : j.world === 'hell' ? L.judgeHell.replace('{n}', String(j.floor)) : L.judgeBorder;
  const el = document.createElement('div');
  el.className = 'death';
  el.innerHTML = `<div class="death-box"><h1></h1><p class="cause"></p><p class="karma"></p><p class="money"></p><p class="verdict"></p><p class="closed"></p><button class="primary"></button></div>`;
  const lost = Math.floor(state.wallet ?? 0), kept = Math.floor(state.bank ?? 0);
  ecoLog('spend', 'death', lost);
  // 들고 있던 돈은 길에 흩어지고, 가방은 우주새에 봉인된다 (다음 생에 되찾는다)
  const sealed = seal('real');
  state.wallet = 0;
  const inside = world?.zone.interior;
  const here = inside ? { x: inside.from.out.i + 0.5, y: inside.from.out.j + 0.5 } : world?.netPos();
  dropInterior(); // 방에서 죽었으면 방은 버리고 거리로 돌아간다
  save(state);
  el.querySelector('.money')!.textContent = wonify([lost > 0 ? L.deathLost.replace('{n}', lost.toLocaleString('en-US')) : '', kept > 0 ? L.deathKept.replace('{n}', kept.toLocaleString('en-US')) : lost > 0 ? L.deathNoBank : '', sealed ? L.deathVault : ''].filter(Boolean).join(' '));
  el.querySelector('h1')!.textContent = L.deathTitle;
  el.querySelector('.cause')!.textContent = cause === 'car' ? L.deathCar : L.deathBeaten;
  el.querySelector('.karma')!.textContent = L.karma.replace('{g}', fmtKarma(d.good)).replace('{e}', fmtKarma(d.evil));
  el.querySelector('.verdict')!.textContent = verdict;
  const closed = el.querySelector('.closed')!;
  const btn = el.querySelector('button')!;
  if (j.world === 'hell') {
    // 2단계: 지옥 1~3층이 열렸다. 더 깊은 층으로 떨어질 영혼은 지금 열린 가장 깊은 층으로
    closed.textContent = j.floor > OPEN_FLOORS ? L.hellCap.replaceAll('{m}', String(OPEN_FLOORS)) : '';
    btn.textContent = L.toHell;
    btn.onclick = () => { el.remove(); world?.revive(bodyLook()); enterHell(j.floor, 'fall', { reason: 'death', want: j.floor }); }; // 31차: 떨어지면 염소대왕을 먼저 만난다
  } else if (j.world === 'border') {
    // 24차: 선악이 꼭 같은 영혼 — 귀신 대신 경계의 해변으로
    closed.textContent = L.borderLine;
    btn.textContent = L.toBorder;
    btn.onclick = () => { el.remove(); world?.revive(bodyLook()); enterBorder('zero'); };
    void here;
  } else {
    // 3단계: 천국이 열렸다. 쌓은 선행은 환생할 때 영혼 경험치로 돌려받는다 (환생관에게)
    closed.textContent = '';
    btn.textContent = L.toHeaven;
    btn.onclick = () => {
      el.remove();
      state.heaven = { met: state.heaven?.met };
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
function heavenAct(what: 'officer' | 'yellowwing' | 'shop' | 'assault' | 'terrace' | 'taxi' | 'ceremony') {
  if (busy || dlg.isOpen) return;
  if (what === 'terrace') enterTerrace();
  else if (what === 'taxi') talkToTaxi();
  else if (what === 'ceremony') talkToPreacher();
  else if (what === 'officer') talkToOfficer();
  else if (what === 'yellowwing') talkToYellowWing();
  else if (what === 'shop') npcSay(t().shopLabel, t().heavenShopEmpty);
  else heavenAssault();
}
/**
 * 천국의 환생관 루엔 (구름 계단 위 환생의 테라스): 19차 — 천국에서 환생하는 혜택은 없다.
 * 천국을 떠나 다시 태어나겠다는 영혼은 드물다. 루엔은 의아해하고, 세 번에 걸쳐 온 힘으로 말린다.
 * 그래도 가겠다면 한숨을 쉬고 문을 연다 (가져가는 것도, 덤도 없다)
 */
async function talkToOfficer() {
  const L = t();
  busy = true;
  dlg.open({ name: L.officer, portrait: 'luen', exit: true });
  await dlg.say(L.offGreet);
  const c0 = await dlg.choose([L.offAskRebirth, L.offJustLook]);
  if (c0 !== 0) { await dlg.say(L.offStay); dropped() || endTalk(); return; }
  // 의아함
  await dlg.say(L.offPuzzled);
  // 설득 세 번: 천국에 있는 것 → 아래에 기다리는 것 → 영혼의 강등. 한 번이라도 '다시 생각해 보겠다'면 멈춘다
  for (const [plea, more] of L.offPleas as [string, string][]) {
    await dlg.say(plea);
    if (more) await dlg.say(more);
    const c = await dlg.choose([L.offInsist, L.offReconsider]);
    if (c !== 0) { await dlg.say(L.offRelief); dropped() || endTalk(); return; }
  }
  await dlg.say(L.offLast);
  const fin = await dlg.choose([L.offFinalGo, L.offReconsider]);
  if (fin !== 0) { await dlg.say(L.offRelief); dropped() || endTalk(); return; }
  await dlg.say(L.offSigh);
  if (dropped()) return;
  if (!(await prepareNextLife({ name: L.officer, portrait: 'luen', exit: true }, null))) return;
  // 37차: 선업의 값은 상담(prepareNextLife)에서 정해 다음 생에 쥐여 보낸다
  await dlg.say(L.offSend);
  if (dropped()) { delete state.nextLife; save(state); return; }
  dlg.close();
  busy = false;
  shipThenRebirth(() => heavenRebirth(0));
}
// ───────────────────────── 26차: 다음 생 상담 ─────────────────────────
/**
 * 환생하기로 한 영혼과 상담하는 이(루엔·파샤르·할아버지·불다)가 다음 생을 미리 정한다:
 * 처음 모습의 운(우비·환자복·아이·앵무새 옷·광채)을 뽑고 그 위에서 몸을 고른 뒤, 도시를 묻고, 선업만큼의 돈을 그 도시의 돈으로 쥐여 보낸다.
 * 37차: 선업으로 물건을 사던 것은 없앴다 (돈으로만) · 도시는 몸 고르기 창이 아니라 대화의 선택지로 묻는다
 */
async function prepareNextLife(who: { name: string; portrait: PortraitSlot; exit?: boolean }, fixedRegion: string | null): Promise<boolean> {
  const L = t();
  const kind = rollArrival();
  const arr = arrivalLook(kind);
  await dlg.say(L.nlLook);
  if (dropped()) return false;
  dlg.close();
  const start: Look = { ...arr, child: false, outfit: arr.outfit ?? 'casual' };
  const outfits: Outfit[] = ['casual', ...(arr.outfit && arr.outfit !== 'casual' ? [arr.outfit] : [])];
  world?.setLook(start); // 고르는 동안은 다음 생의 몸으로 보인다
  const res = await chooseBody(L.nlLookTitle, L.nlLookConfirm, start, { outfits, cancel: L.nlCancel });
  world?.setLook(bodyLook()); // 지금의 몸은 떠나기 전까지 그대로
  if (res.cancelled) { endTalk(); toast(L.nlCancelled); return false; } // 34차: 몸 고르기에서 그만두면 상담도 끝 (아무것도 정하지 않는다)
  dlg.open(who);
  let region = fixedRegion;
  if (!region) {
    await dlg.say(L.nlCityAsk);
    const c = await dlg.choose([L.regions.bkk, L.regions.seoul]);
    if (c < 0 || dropped()) return false;
    region = c === 1 ? 'seoul' : 'bkk';
  } else await dlg.say(L.nlCityFixed.replace('{city}', (L.regions as Record<string, string>)[region] ?? region));
  const good = state.deeds?.good ?? 0;
  const cash = goodCash();
  await dlg.say(cash > 0 ? L.nlCash.replace('{g}', fmtKarma(good)).replace('{a}', cashText(cash, region === 'seoul')) : L.nlCashNone);
  state.nextLife = { kind, look: res.look, region, bag: {}, cash };
  save(state);
  return true;
}

/** 24차: 환생은 우주왕복선으로 — 걸어가 타고, 떠오르면 아래 세상으로 */
async function shipThenRebirth(go: () => void) {
  busy = true;
  toast(t().shipBoard);
  await world?.boardShip();
  const fx = worldFade('heaven', false);
  fx.covered.then(() => { busy = false; go(); fx.done(); });
}
/** 24차: 가끔 루엔·파샤르 대신 앉아 있는 안경 쓴 할아버지. 설득하지 않는다 — 우주선을 가리킬 뿐 */
async function talkToGrandpa(hell: boolean) {
  const L = t();
  if (busy) return;
  busy = true;
  dlg.open({ name: L.grandpaName, portrait: 'grandpa', exit: true });
  for (const line of hell ? L.grandpaGreetHell : L.grandpaGreet) await dlg.say(line);
  await dlg.say(L.grandpaAsk);
  const c = await dlg.choose([L.grandpaGo, L.grandpaWait]);
  if (c !== 0) { await dlg.say(L.grandpaStay); dropped() || endTalk(); return; }
  {
    const ratio0 = Math.round(evilRatio(state.deeds ?? { good: 0, evil: 0 }) ?? 100);
    if (!(await prepareNextLife({ name: L.grandpaName, portrait: 'grandpa', exit: true }, hell && ratio0 >= 100 ? (Math.random() < 0.5 ? 'seoul' : 'bkk') : null))) return;
  }
  // 33차: 지옥에선 파샤르와 같은 환전 (업만큼 · 형편없는 값), 천국에선 선업의 값
  const x = hell ? await rebirthExchange() : null;
  if (dropped() || (hell && !x)) { delete state.nextLife; save(state); return; }
  await dlg.say(L.grandpaBye);
  if (dropped()) { delete state.nextLife; save(state); return; }
  dlg.close();
  busy = false;
  if (!hell) { shipThenRebirth(() => heavenRebirth(0)); return; }
  shipThenRebirth(() => payRebirthExchange(x ?? { n: 0, fee: 0 }));
}
/** 33차: 천국에서 환생 — 선업의 값을 쥐고 태어난다 */
function heavenRebirth(bonus: number) {
  if (bonus > 0) ecoLog('earn', 'bonus', bonus);
  rebirthFrom('heaven', bonus);
  if (bonus > 0) setTimeout(() => toast(t().heavenBonusToast.replace('{a}', cashText(bonus, seoulCash())), 'good'), 600);
}
/** 21차: 안내천사가 따라다니는가 — 처음 온 영혼이 천국에 익숙해질 때까지 (종교행사에 한 번 다녀오면 끝, 따돌리면 멈춘다) */
function ywShouldFollow() {
  return realm() === 'heaven' && !state.heaven?.adapted && !state.heaven?.ywLost;
}
const pick = <T,>(a: readonly T[]) => a[Math.floor(Math.random() * a.length)];
/** 셋을 겹치지 않게 고른다 */
function pickN<T>(a: readonly T[], n: number): T[] {
  const b = [...a];
  for (let k = b.length - 1; k > 0; k--) { const r = Math.floor(Math.random() * (k + 1)); [b[k], b[r]] = [b[r], b[k]]; }
  return b.slice(0, n);
}
/**
 * 황색날개: 미스 황과 같은 얼굴이지만 스스로는 다른 사람이라 여긴다. 21차 — 천국의 안내천사.
 * 처음 온 영혼 곁을 따라다니며 규칙을 일러 준다 (종교행사는 필수 · 사람이 천사를 사랑하면 벌은 천사가). 환생을 물으면 의아해하며 말린다. 루엔이 어디 있는지 알려 준다
 */
const HEAVEN_GIFTS = ['water', 'cola', 'choco', 'chips', 'bandage'];
async function talkToYellowWing() {
  const L = t();
  busy = true;
  dlg.open({ name: L.yellowWing, portrait: 'yellow-wing' });
  if (!state.heaven?.met) {
    state.heaven = { ...state.heaven, met: true };
    save(state);
    await dlg.say(L.ywFirst);
    for (const line of L.ywAssigned) await dlg.say(line);
  } else await dlg.say(pick(L.ywLines));
  for (;;) {
    const M = L.ywMenu;
    const opts: [string, string][] = [['rebirth', M.rebirth], ['luen', M.luen], ['rules', M.rules], ['gift', M.gift]];
    if (!state.heaven?.adapted) opts.push(state.heaven?.ywLost ? ['follow', M.follow] : ['alone', M.alone]);
    opts.push(['bye', M.bye]);
    const c = opts[await dlg.choose(opts.map((o) => o[1]))]?.[0] ?? 'bye';
    if (c === 'bye') break;
    if (c === 'rebirth') {
      await dlg.say(pick(L.ywRebirthPuzzled));
      for (const line of pickN(L.ywRebirthPleas, 3)) await dlg.say(line);
      await dlg.say(L.ywRebirthEnd);
    } else if (c === 'luen') {
      if (world?.guideStair()) await dlg.say(L.ywLuenHere);
      else {
        const here = ZONE_IDS.indexOf(world?.zone.id ?? homeZone()), end = ZONE_IDS.length - 1; // 26차: 루엔은 동쪽 끝
        await dlg.say(L.ywLuenFar.replace('{dir}', here < end ? L.dirs.e : L.dirs.w));
      }
    } else if (c === 'rules') {
      for (const line of L.ywRules) await dlg.say(line);
    } else if (c === 'gift') {
      await dlg.say(L.ywGreet);
      const gifts = HEAVEN_GIFTS.map((k) => ITEMS.find((i) => i.key === k)!).filter(Boolean);
      const g = await dlg.choose([...gifts.map((i) => i.name[lang()]), L.ywNo]);
      if (g < gifts.length) {
        const it = gifts[g];
        state.bag ??= {};
        state.bag[it.key] = (state.bag[it.key] ?? 0) + 1;
        save(state);
        await dlg.say(L.ywGot.replace('{item}', it.name[lang()]));
      }
    } else if (c === 'alone') {
      await dlg.say(L.ywAlone);
    } else if (c === 'follow') {
      state.heaven = { ...state.heaven, ywLost: false };
      save(state);
      world?.setYwFollow(true);
      await dlg.say(L.ywFollowAgain);
    }
  }
  dlg.close();
  busy = false;
  renderHud();
}
/** 21차: 천국의 음식 — 가게 앞 천사와 따라다니는 요리사가 권한다. 공짜, 맛있다, 아무 효과도 없다 */
async function heavenFood(from: string) {
  if (busy || dlg.isOpen) return;
  const L = t();
  busy = true;
  dlg.open({ name: from });
  await dlg.say(pick(L.heavenFoodOffer));
  const dishes = pickN(L.heavenDishes, 3);
  const c = await dlg.choose([...dishes, L.heavenFoodNo]);
  if (c >= 0 && c < dishes.length) {
    chime();
    await dlg.say(L.heavenAte.replace('{food}', dishes[c]));
  }
  await dlg.say(L.heavenFoodBye);
  dlg.close();
  busy = false;
}
/** 21차: 종교시설 앞 천사 — 행사는 필수. 한 번 다녀오면 천국에 익숙해진 것으로 치고, 안내천사는 제자리로 돌아간다 */
async function talkToPreacher() {
  const L = t();
  busy = true;
  dlg.open({ name: L.preachAngel });
  await dlg.say(L.ceremonyCall);
  const c = await dlg.choose([L.ceremonyJoin, L.ceremonyLater]);
  if (c !== 0) { await dlg.say(L.ceremonyNag); dlg.close(); busy = false; return; }
  dlg.close();
  const fx = worldFade('heaven', false);
  await fx.covered;
  dlg.open({ name: L.ceremonyTitle });
  for (const line of L.ceremonyLines) await dlg.say(line);
  dlg.close();
  fx.done();
  dlg.open({ name: L.preachAngel });
  await dlg.say(L.ceremonyDone);
  dlg.close();
  const first = !state.heaven?.adapted;
  state.heaven = { ...state.heaven, adapted: true, rites: (state.heaven?.rites ?? 0) + 1 };
  save(state);
  if (first) {
    world?.setYwFollow(false);
    dlg.open({ name: L.yellowWing, portrait: 'yellow-wing' });
    await dlg.say(L.ywAdapted);
    dlg.close();
  }
  busy = false;
}
/** 21차: 도시 끝의 택시 천사 — 아주 큰 날개로 다른 도시까지 태워 준다 (지금은 수쿰빗 안에서만. 서울·파타야는 아직 하늘길이 없다) */
async function talkToTaxi() {
  const L = t();
  busy = true;
  dlg.open({ name: L.taxiAngel });
  await dlg.say(L.taxiGreet);
  const here = world?.zone.id ?? homeZone();
  const far = here === ZONE_IDS[0] ? ZONE_IDS[ZONE_IDS.length - 1] : ZONE_IDS[0];
  const T = L.taxiTo;
  const c = await dlg.choose([T.asok, T.far.replace('{zone}', L.zones[far] ?? far), T.seoul, T.pattaya, T.no]);
  if (c === 2 || c === 3) { await dlg.say(L.taxiNotYet.replace('{city}', c === 2 ? T.seoul : T.pattaya)); dlg.close(); busy = false; return; }
  if (c !== 0 && c !== 1) { dlg.close(); busy = false; return; }
  await dlg.say(L.taxiFly);
  dlg.close();
  const fx = worldFade('heaven', true);
  await fx.covered;
  if (c === 0) await enterWorld('door');
  else {
    const z = await loadZone(far);
    const e = z.edges;
    const at: [number, number] = e ? [far === ZONE_IDS[0] ? e.i0 + 6 : e.i1 - 7, e.c] : [z.door.i, z.door.j + 2];
    await enterWorld(at, far);
  }
  fx.done();
  snapPos();
  save(state);
  busy = false;
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

/**
 * 지옥에서 쓰러지면: 들고 있던 노전은 모두 그 자리에 떨어진다 (10분 안에 가서 주울 수 있다, 은행에 맡긴 것은 그대로).
 * 장비는 운이 없으면 하나 떨어뜨린다 (35%). 그 층의 휴식 마을에서 다시 일어난다
 */
/** 25차: 지금 악업으로 쓰러지면 가라앉을 층 (열린 층까지) — 지옥이 아니면 0 */
let pullWarned = 0;
function sinkTo() {
  const j = judge(state.deeds ?? { good: 0, evil: 0 });
  return j.world === 'hell' ? Math.min(OPEN_FLOORS, j.floor) : 0;
}
function showHellDeath() {
  const L = t();
  closeMenus();
  document.querySelector('.bag-panel')?.remove();
  const h = hellState();
  const sink = sinkTo();
  const deeper = sink > h.floor ? sink : 0;
  const dropped = Math.floor(h.notes);
  h.notes -= dropped;
  ecoLog('spend', 'death', dropped, true);
  // 운이 없으면 장비 하나: 끼고 있던 것 중 하나 (없으면 가방의 장비 중 하나)
  let lost: string | null = null;
  if (Math.random() < 0.35) {
    const worn = Object.entries(state.equip ?? {}).filter(([, k]) => !!k) as [Slot, string][];
    const bagGear = Object.keys(state.bag ?? {}).filter((k) => (state.bag![k] ?? 0) > 0 && isGearItem(itemByKey(k)) && !itemByKey(k).wreck);
    if (worn.length) { const [slot, k] = worn[Math.floor(Math.random() * worn.length)]; lost = k; delete state.equip![slot]; }
    else if (bagGear.length) lost = bagGear[Math.floor(Math.random() * bagGear.length)];
    if (lost) { state.bag![lost] = Math.max(0, (state.bag![lost] ?? 1) - 1); world?.setGear(gear()); net.nudge(); }
  }
  if (world && !world.zone.interior) world.dropOnDeath(dropped, lost);
  // 38차: 떨구지 않은 물건은 모두 유황새 보관 우리로 (꺼낼 때 수수료) — 현실 물건이 섞여 있으면 그것은 우주새 우리로
  const sealedH = seal('hell');
  if (sealedH) { world?.setGear(gear()); net.nudge(); renderQuick(); }
  state.hp = maxHp();
  save(state);
  const el = document.createElement('div');
  el.className = 'death hell';
  el.innerHTML = `<div class="death-box"><h1></h1><p class="cause"></p><p class="money"></p><button class="primary"></button></div>`;
  el.querySelector('h1')!.textContent = L.hellPlace.replace('{n}', String(h.floor)).replace('{name}', floorDef(h.floor).name[lang()]);
  el.querySelector('.cause')!.textContent = deeper ? L.hellSink.replace('{n}', String(deeper)) : L.hellDeath;
  el.querySelector('.money')!.textContent = [
    dropped > 0 ? L.hellDeathDrop.replace('{n}', dropped.toLocaleString('en-US')) : '',
    lost ? L.hellDeathItem.replace('{item}', itemByKey(lost).name[lang()]) : '',
    sealedH ? L.hellDeathVault : '',
    (h.bank ?? 0) > 0 ? L.hellDeathBank.replace('{n}', Math.floor(h.bank ?? 0).toLocaleString('en-US')) : '',
  ].filter(Boolean).join(' ');
  const btn = el.querySelector('button')!;
  btn.textContent = deeper ? L.hellSinkBtn.replace('{n}', String(deeper)) : L.hellRise;
  btn.onclick = () => {
    el.remove();
    if (!world) return;
    world.revive(bodyLook());
    if (deeper) { pullWarned = 0; enterHell(deeper, 'drop'); return; }
    const zh = world.zone.hell!;
    world.placeNear(zh.rest.i, zh.rest.j, maxHp());
    renderHud();
  };
  document.body.appendChild(el);
  requestAnimationFrame(() => el.classList.add('show'));
}

// ───────────────────────── 지옥 마을: 은행 · 속죄의 회당 · 장사꾼 ─────────────────────────
function panelAt(el: HTMLElement) {
  document.body.appendChild(el);
  const hudBottom = document.getElementById('hud')?.getBoundingClientRect().bottom ?? 56;
  el.style.top = `${Math.round(hudBottom + 6)}px`;
}
/** 지옥 은행: 노전을 맡기고 찾는다 (맡긴 노전은 쓰러져도 남는다) */
function openHellBank() {
  closeMenus();
  document.querySelector('.store-panel')?.remove();
  const L = t();
  const h = hellState();
  const el = document.createElement('div');
  el.className = 'store-panel shop-menu bank-panel';
  el.innerHTML = `<div class="menu-head"><b></b><button class="menu-close">✕</button></div>
    <p class="store-line"></p>
    <div class="bank-body">
      <div class="bank-row"><span></span><b class="b-wallet"></b></div>
      <div class="bank-row"><span></span><b class="b-bank"></b></div>
      <input class="b-amt" type="number" inputmode="numeric" min="1" step="1">
      <div class="bank-quick"></div>
      <div class="bank-act"><button class="primary b-in"></button><button class="primary b-out"></button></div>
    </div>`;
  el.querySelector('.menu-head b')!.textContent = L.hbankTitle;
  el.querySelector('.store-line')!.textContent = L.hbankLine;
  const sp = el.querySelectorAll('.bank-row span');
  sp[0].textContent = L.hbankHand; sp[1].textContent = L.hbankBook;
  (el.querySelector('.b-in') as HTMLButtonElement).textContent = L.hbankIn;
  (el.querySelector('.b-out') as HTMLButtonElement).textContent = L.hbankOut;
  const amt = el.querySelector('.b-amt') as HTMLInputElement;
  amt.placeholder = L.bankAmount;
  (el.querySelector('.menu-close') as HTMLButtonElement).onclick = () => el.remove();
  const draw = () => {
    el.querySelector('.b-wallet')!.textContent = L.obolFmt.replace('{n}', Math.floor(h.notes).toLocaleString('en-US'));
    el.querySelector('.b-bank')!.textContent = L.obolFmt.replace('{n}', Math.floor(h.bank ?? 0).toLocaleString('en-US'));
  };
  for (const n of [100, 1000, 10000]) { const b = document.createElement('button'); b.textContent = n.toLocaleString('en-US'); b.onclick = () => { amt.value = String(n); }; el.querySelector('.bank-quick')!.appendChild(b); }
  // 27차: '전부'는 바로 실행 — 맡기기·찾기 따로 (예전엔 '전부'가 늘 손에 든 양만 적어 찾기가 어려웠다)
  { const br = document.createElement('span'); br.className = 'flex-break'; el.querySelector('.bank-quick')!.appendChild(br); }
  { const b = document.createElement('button'); b.className = 'b-all'; b.textContent = L.bankAllIn; b.onclick = () => { amt.value = String(Math.floor(h.notes)); move(1); }; el.querySelector('.bank-quick')!.appendChild(b); }
  { const b = document.createElement('button'); b.className = 'b-all'; b.textContent = L.bankAllOut; b.onclick = () => { amt.value = String(Math.floor(h.bank ?? 0)); move(-1); }; el.querySelector('.bank-quick')!.appendChild(b); }
  const move = (dir: 1 | -1) => {
    const n = Math.floor(Number(amt.value) / wonRate());
    if (!n || n <= 0) { toast(L.bankAmount); return; }
    if (dir === 1 && n > Math.floor(h.notes)) { toast(L.hwNoMoney); return; }
    if (dir === -1 && n > Math.floor(h.bank ?? 0)) { toast(L.bankShort); return; }
    h.notes -= dir * n;
    h.bank = (h.bank ?? 0) + dir * n;
    save(state); updateHud(); draw();
    toast((dir === 1 ? L.hbankDone : L.hbankTook).replace('{n}', n.toLocaleString('en-US')), 'good');
  };
  (el.querySelector('.b-in') as HTMLButtonElement).onclick = () => move(1);
  (el.querySelector('.b-out') as HTMLButtonElement).onclick = () => move(-1);
  draw();
  panelAt(el);
}

/** 속죄의 회당: 층마다 바친 노전이 쌓인다. 목표(3층 31,000)를 채우면 위층으로 (1층은 지옥 로비 앞으로). 1,000닢마다 선행 */
function openAtone() {
  closeMenus();
  document.querySelector('.store-panel')?.remove();
  const L = t();
  const h = hellState(), f = h.floor, goal = ATONE_GOAL[f] ?? 11000;
  h.atone ??= {};
  const el = document.createElement('div');
  el.className = 'store-panel shop-menu bank-panel atone-panel';
  el.innerHTML = `<div class="menu-head"><b></b><button class="menu-close">✕</button></div>
    <p class="store-line"></p><div class="bank-body"><i class="xpbar"><i></i></i><div class="bank-quick"></div><div class="bank-act"></div></div>`;
  el.querySelector('.menu-head b')!.textContent = L.atoneTitle;
  (el.querySelector('.menu-close') as HTMLButtonElement).onclick = () => el.remove();
  const give = (n: number) => {
    n = Math.min(n, Math.floor(h.notes), goal - (h.atone![f] ?? 0));
    if (n <= 0) { toast(L.hwNoMoney); return; }
    const before = Math.floor((h.atone![f] ?? 0) / 1000);
    h.notes -= n;
    ecoLog('spend', 'atone', n, true);
    h.atone![f] = (h.atone![f] ?? 0) + n;
    const deeds = Math.floor(h.atone![f] / 1000) - before;
    save(state); updateHud();
    toast(L.atoneDone.replace('{n}', n.toLocaleString('en-US')), 'good');
    for (let k = 0; k < deeds; k++) recordDeed('hellAtone');
    draw();
  };
  const draw = () => {
    const a = h.atone![f] ?? 0;
    el.querySelector('.store-line')!.textContent = L.atoneLine.replace('{a}', a.toLocaleString('en-US')).replace('{g}', goal.toLocaleString('en-US'));
    (el.querySelector('.xpbar > i') as HTMLElement).style.width = `${Math.min(100, (a / goal) * 100)}%`;
    const q = el.querySelector('.bank-quick')!, act = el.querySelector('.bank-act')!;
    q.innerHTML = ''; act.innerHTML = '';
    if (a >= goal) {
      const b = document.createElement('button');
      b.className = 'primary';
      b.textContent = f === 1 ? L.atoneGoLobby : L.atoneGo.replace('{n}', String(f - 1));
      b.onclick = () => { el.remove(); h.atone![f] = 0; save(state); toast(L.atoneRise, 'good'); atoneRise(f); };
      act.appendChild(b);
      return;
    }
    for (const n of [100, 1000, 10000]) { const b = document.createElement('button'); b.textContent = L.atoneBtn.replace('{n}', n.toLocaleString('en-US')); b.onclick = () => give(n); q.appendChild(b); }
    const all = document.createElement('button'); all.textContent = L.atoneAllBtn; all.onclick = () => give(Math.floor(h.notes)); q.appendChild(all);
  };
  draw();
  panelAt(el);
}
/** 속죄가 차서 올라간다: 2·3층은 위층 아래 계단 머리로, 1층은 골목 끝 지옥 로비 앞으로 (손들이 붙잡는다) */
function atoneRise(f: number) {
  if (f > 1) { leaveInterior(); enterHell(f - 1, 'up'); return; }
  leaveInterior();
  const u = world?.zone.hell?.up;
  if (!world || !u) return;
  const fx = worldFade('heaven', false);
  fx.covered.then(() => { world?.placeNear(u.i, u.j + 1, state.hp ?? maxHp()); fx.done(); setTimeout(() => rebirthGate(), 900); });
}

/** 22차: 물장수가 파는 '그 층 괴물의 피' — 층마다 그 층 괴물 이름이 붙는다 (가방에서도 이름이 풀리게 처음에 한 번 등록) */
(function registerBloodItems() {
  for (const fd of FLOORS) for (const mk of fd.monsters) {
    const m = MONSTERS[mk];
    const key = `blood-${mk}`;
    if (!m || ITEMS.some((x) => x.key === key)) continue;
    ITEMS.push({ key, cat: 'goods', price: 5 + fd.floor * 5, heal: 90 + fd.floor * 70, hell: true, store: 'hwater', bloodFloor: fd.floor, icon: 'cola', name: { ko: `${m.name.ko}의 피`, th: `เลือด${m.name.th}`, en: `${m.name.en} blood` } });
  }
})();

/** 22차: 지옥 휴게소 장사꾼 — 종류마다 한 명. 호텔 지배인·서큐버스는 대화로 */
function openHellStore(kind: HellVendor) {
  if (kind === 'hotel') { talkToHotel(); return; }
  if (kind === 'succubus') { talkToSuccubus(); return; }
  closeMenus();
  document.querySelector('.store-panel')?.remove();
  const L = t();
  const h = hellState();
  const el = document.createElement('div');
  el.className = 'store-panel shop-menu';
  el.innerHTML = `<div class="menu-head"><b></b><button class="menu-close">✕</button></div><p class="store-line"></p><div class="menu-list"></div>`;
  el.querySelector('.menu-head b')!.textContent = L.hvName[kind][0];
  el.querySelector('.store-line')!.textContent = L.hvLine[kind];
  (el.querySelector('.menu-close') as HTMLButtonElement).onclick = () => el.remove();
  const list = el.querySelector('.menu-list')!;
  // 넝마장수의 헌 물건: 날마다 층마다 바뀌는 네 가지 (값 7할)
  const day = Math.floor(Date.now() / 86400000);
  const used = ITEMS.filter((x) => x.hell && x.cat === 'armor' && !x.store && onSale(x)).sort((a, b) => ((a.key.length * 7 + day * 13 + h.floor * 5 + a.price) % 11) - ((b.key.length * 7 + day * 13 + h.floor * 5 + b.price) % 11)).slice(0, 2);
  let mode: StoreMode = 'buy';
  const tabsOn = storeTabs(el, () => mode, (m) => { mode = m; draw(); });
  const draw = () => {
    list.innerHTML = '';
    tabsOn();
    if (mode === 'sell') { sellList(list, true, draw); return; }
    const of = (st: ItemDef['store']) => ITEMS.filter((x) => x.store === st).map((x): [ItemDef, number] => [x, x.price]);
    // 장사꾼: 이름만 장사꾼 — 날마다 바뀌는 잡동사니 넷 (값은 조금 비싸게)
    const odd = ITEMS.filter((x) => x.hell && !x.floor && x.store !== 'drop' && x.store !== 'maskgirl' && x.note !== 'ammo' && x.note !== 'arrows' && !x.bloodFloor).sort((a, b) => ((a.key.charCodeAt(1) * 31 + day * 17 + h.floor * 7 + a.price) % 13) - ((b.key.charCodeAt(1) * 31 + day * 17 + h.floor * 7 + b.price) % 13)).slice(0, 4);
    const stock: [ItemDef, number][] =
      kind === 'butcher' ? of('hmeat')
      : kind === 'water' ? [...of('hwater').filter(([x]) => !x.bloodFloor || x.bloodFloor === h.floor)]
      : kind === 'medic' ? of('hmed')
      : kind === 'arms' ? of('harms')
      : kind === 'trader' ? odd.map((x): [ItemDef, number] => [x, Math.max(1, Math.round(x.price * 1.3))])
      : [...of('hjunk'), ...used.map((x): [ItemDef, number] => [x, Math.max(1, Math.round(x.price * 0.7))])];
    const shelf = stock.map(([x, p]) => ({ it: x, price: p }));
    for (const [it, price] of stock) {
      const row = itemRow(it, priceText(price, true), async () => {
        if (h.notes < price) { toast(L.hwNoMoney); return; }
        const n = await askQty(it, price, Math.min(it.cat === 'weapon' || it.cat === 'armor' ? 9 : 99, Math.floor(h.notes / price)), 'buy'); // 29차: 장비는 한 번 더 · 31차: 무엇이든 여러 개
        if (n <= 0 || h.notes < price * n) return;
        h.notes -= price * n;
        ecoLog('spend', 'shop', price * n, true);
        for (let k = 0; k < n; k++) addToBag(it);
        save(state); updateHud(); renderQuick();
        toast(n > 1 ? L.boughtN.replace('{item}', it.name[lang()]).replace('{n}', String(n)) : L.bought.replace('{item}', it.name[lang()]));
        draw();
      }, h.notes < price);
      list.appendChild(withSteal(row, it, price, shelf, () => streetSteal(it, price, shelf, el, draw)));
    }
  };
  draw();
  panelAt(el);
}

/** 30차 지옥 대장간: 지옥 장비를 고치고(노전), 템브라로 강화한다 */
function openSmith(title?: string, hello?: string) {
  closeMenus();
  document.querySelector('.store-panel')?.remove();
  const L = t();
  const el = document.createElement('div');
  el.className = 'store-panel shop-menu';
  el.innerHTML = `<div class="menu-head"><b></b><button class="menu-close">✕</button></div><p class="store-line"></p><div class="menu-tabs store-tabs"></div><div class="menu-list"></div>`;
  el.querySelector('.menu-head b')!.textContent = title ?? L.smithName;
  el.querySelector('.store-line')!.textContent = hello ?? pick(L.smithHello);
  (el.querySelector('.menu-close') as HTMLButtonElement).onclick = () => el.remove();
  const list = el.querySelector('.menu-list')!;
  const tabs = el.querySelector('.store-tabs')!;
  let mode: 'repair' | 'enh' = 'repair';
  const bFix = document.createElement('button'), bEnh = document.createElement('button');
  bFix.textContent = L.tabRepair; bEnh.textContent = L.tabEnhance;
  bFix.onclick = () => { mode = 'repair'; draw(); }; bEnh.onclick = () => { mode = 'enh'; draw(); };
  tabs.append(bFix, bEnh);
  const draw = () => {
    list.innerHTML = '';
    bFix.classList.toggle('on', mode === 'repair'); bEnh.classList.toggle('on', mode === 'enh');
    if (mode === 'repair') repairList(list, true, draw); else enhanceList(list, draw);
  };
  draw();
  panelAt(el);
}

/**
 * 34차 4층 대장장이 칼드렉 (팔이 넷인 검게 그을린 거대한 악마, 붉은 불꽃이 솟는 낡은 대장간): 4층의 유일한 대장장이.
 * 고치고 두드리는 것(수리 · 템브라 강화)은 여느 대장간과 같고, 완성된 템브라를 하루에 하나만 판다 — 4,444닢
 */
const FERUM_TEMBRA = 4444;
async function talkToFerum() {
  if (busy || dlg.isOpen) return;
  const L = t();
  const h = hellState();
  busy = true;
  dlg.open({ name: L.ferumName, portrait: 'ferum', exit: true });
  const first = !state.ferumMet;
  if (first) { state.ferumMet = true; save(state); }
  await dlg.say(first ? L.ferumFirst : pick(L.ferumAgain));
  for (;;) {
    const day = Math.floor(Date.now() / 86400000);
    const sold = state.ferumDay === day;
    const c = await dlg.choose([L.ferumFix, sold ? L.ferumTemSold : L.ferumTemBuy.replace('{p}', FERUM_TEMBRA.toLocaleString('en-US')), L.ferumAsk, L.ferumLeave], sold ? [1] : []);
    if (c === 0) { endTalk(); openSmith(L.ferumSmithy, pick(L.ferumHello)); return; }
    if (c === 1) {
      if (h.notes < FERUM_TEMBRA) { await dlg.say(L.ferumPoor.replace('{p}', FERUM_TEMBRA.toLocaleString('en-US'))); continue; }
      h.notes -= FERUM_TEMBRA;
      ecoLog('spend', 'shop', FERUM_TEMBRA, true);
      addToBag(itemByKey('tembra'));
      state.ferumDay = day;
      save(state); renderHud(); renderQuick();
      sfx.chime();
      await dlg.say(L.ferumSold);
      continue;
    }
    if (c === 2) { for (const line of L.ferumTembra) await dlg.say(line); continue; }
    if (c === 3) await dlg.say(pick(L.ferumBye));
    break;
  }
  dropped() || endTalk();
}
/** 22차 지옥호텔: 바깥 공터의 매트리스 한 장 — 층×10 노전에 한숨 자면 체력이 다 찬다 */
async function talkToHotel() {
  const L = t();
  const h = hellState();
  const price = 10 * h.floor;
  busy = true;
  dlg.open({ name: L.hvName.hotel[0] });
  await dlg.say(L.hotelGreet[Math.floor(Math.random() * L.hotelGreet.length)]);
  const c = await dlg.choose([L.hotelStay.replace('{p}', String(price)), L.hotelNo]);
  if (c !== 0) { await dlg.say(L.hotelBye); dlg.close(); busy = false; return; }
  if (h.notes < price) { await dlg.say(L.hotelPoor); dlg.close(); busy = false; return; }
  h.notes -= price;
  ecoLog('spend', 'service', price, true);
  dlg.close();
  const fx = worldFade('hell', false);
  await fx.covered;
  healFull();
  fx.done();
  save(state); updateHud();
  dlg.open({ name: L.hvName.hotel[0] });
  await dlg.say(L.hotelWake[Math.floor(Math.random() * L.hotelWake.length)]);
  dlg.close();
  busy = false;
}
/** 22차 서큐버스 (층마다 한 명, 모습도 말씨도 다르다): 곁에 머물면 노전을 받고 체력을 채워 주고 넘치게 한다 */
async function talkToSuccubus() {
  const L = t();
  const h = hellState();
  const f = Math.min(3, Math.max(1, h.floor));
  const S = L.succubus[f - 1];
  const price = 33 * h.floor;
  busy = true;
  dlg.open({ name: S.name, portrait: 'succubus' }); // 35차: 관리자 칸 그림 (층마다 같은 한 장)
  await dlg.say(S.greet[Math.floor(Math.random() * S.greet.length)]);
  for (;;) {
    const c = await dlg.choose([L.sucStay.replace('{p}', String(price)), L.sucTalk, L.sucLeave]);
    if (c === 1) { await dlg.say(S.talk[Math.floor(Math.random() * S.talk.length)]); continue; }
    if (c !== 0) { await dlg.say(S.bye[Math.floor(Math.random() * S.bye.length)]); break; }
    if (h.notes < price) { await dlg.say(S.poor); break; }
    h.notes -= price;
    ecoLog('spend', 'service', price, true);
    dlg.close();
    const fx = worldFade('hell', false);
    await fx.covered;
    healFull();
    world?.addOverHp(Math.round(maxHp() * 0.25));
    fx.done();
    save(state); updateHud();
    dlg.open({ name: S.name, portrait: 'succubus' }); // 35차: 관리자 칸 그림 (층마다 같은 한 장)
    await dlg.say(S.after);
    break;
  }
  dlg.close();
  busy = false;
}

// ───────────────────────── 상단 표시줄 ─────────────────────────
function renderHud() {
  const L = t();
  hud.hidden = false;
  const place = placeName();
  const live = !net.account() && realm() !== 'border' ? `<button class="live">${L.live}</button>` : '';
  const narrow = matchMedia('(max-width: 640px)').matches;
  hudNarrow = narrow;
  hud.innerHTML = `
    <div class="hud-left${workLine ? ' working' : ''}"><div class="where" data-zone="${escHtml(place)}"><b>${escHtml(place)}</b></div>${scene === 'shop' && realm() === 'ghost' ? `<span class="hint">${L.hintGhost}</span>` : ''}<span class="work">${wonify(workLine)}</span>${workLine && world?.isWorkingInside ? `<button class="work-stop">${L.workStop}</button>` : ''}</div>
    <div class="hud-tools">${live}<div class="hud-right">
      <span class="hpbox" title="${L.hpLabel}"><span class="clock"></span><i class="hpbar"><i></i></i><b class="hp-over" hidden></b></span>
      <span class="wallet"></span>${scene === 'world' && realm() === 'real' && !world?.zone.interior ? `<button class="to-bank" aria-label="${L.bankFind}" title="${L.bankFind}">${BANK_SVG}</button>` : ''}
      <button class="to-soul">${narrow ? L.rankShort : L.rank} <b class="rk">${state.soul?.rank ?? 1}</b></button>
      <button class="to-bag">${L.bag}</button>
      <button class="to-set" aria-label="${L.settings}" title="${L.settings}">${SET_SVG}${narrow ? '' : `<span>${L.settings}</span>`}</button>
    </div></div>
    ${scene === 'world' && world?.zone.attribution ? '<a class="attrib" href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">© OpenStreetMap</a>' : ''}`;
  (hud.querySelector('.to-bag') as HTMLButtonElement).onclick = toggleBag;
  // 33차: 은행 단추 — 가장 가까운 은행으로 길 안내 (돈을 맡겨야 죽어도 남는다)
  const tb = hud.querySelector('.to-bank') as HTMLButtonElement | null;
  if (tb) tb.onclick = () => { if (!world?.guideBank()) toast(L.bankNone); };
  (hud.querySelector('.to-set') as HTMLButtonElement).onclick = toggleSettings;
  (hud.querySelector('.to-soul') as HTMLButtonElement).onclick = toggleSoul;
  hud.querySelector('.work-stop')?.addEventListener('click', () => { world?.stopWorkInside(); leaveInterior(); });
  const lb = hud.querySelector('.live') as HTMLButtonElement | null;
  if (lb) lb.onclick = () => openSignup('signup');
  updateHud();
  renderQuick();
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
    <section class="set-sec"><h4 class="h-fight"></h4><div class="set-row"><span class="lbl l-counter"></span><div class="seg s-counter"></div></div><p class="note n-counter"></p>
      <div class="set-row"><span class="lbl l-heal"></span><div class="seg s-heal"></div></div><div class="set-row"><span class="lbl l-healpct"></span><div class="seg s-healpct"></div></div><p class="note n-heal"></p></section>
    <section class="set-sec"><h4 class="h-screen"></h4><div class="set-row"><span class="lbl l-zoom"></span><div class="seg s-zoom"></div></div><div class="set-row"><span class="lbl l-ping"></span><div class="seg s-ping"></div></div><div class="set-row"><span class="lbl l-low"></span><div class="seg s-low"></div></div></section>
    ${matchMedia('(pointer: coarse)').matches ? '' : '<section class="set-sec set-keys"><h4 class="h-keys"></h4><div class="keys"></div><p class="note n-keys"></p></section>'}
    <section class="set-sec"><h4 class="h-lang"></h4><div class="seg s-lang wide"></div></section>
    <section class="set-sec set-acc"><h4 class="h-acc"></h4><div class="acc"></div></section>
    ${net.account()?.admin ? `<section class="set-sec set-admin"><h4 class="h-admin"></h4><div class="set-row"><span class="lbl l-inv"></span><div class="seg s-inv"></div></div><div class="set-row"><span class="lbl l-tp"></span><div class="seg s-tp"></div></div><div class="set-row"><span class="lbl l-city"></span><div class="seg s-city"></div></div><div class="set-row"><span class="lbl l-dot3"></span><div class="seg s-dot3"></div></div><div class="set-row"><span class="lbl"></span><button class="tp-heaven"></button></div><div class="set-row"><span class="lbl l-worlds"></span><div class="tp-more"><button class="tp-home"></button><button class="tp-terrace"></button><button class="tp-hlobby"></button><button class="tp-goat"></button><button class="tp-border"></button></div></div><div class="set-row"><span class="lbl l-tools"></span><div class="tp-more"><button class="ad-eco"></button><button class="ad-perf"></button></div></div>${state.adminTrip && state.adminTrip !== realm() ? '<div class="set-row"><span class="lbl"></span><button class="tp-back"></button></div>' : ''}<p class="note n-admin"></p></section>` : ''}`;
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
  // 19차: 자동 반격 — 나를 친 자에게 곧바로 맞선다 (가만히 서 있거나 걷는 중일 때)
  el.querySelector('.h-fight')!.textContent = L.setFight;
  el.querySelector('.l-counter')!.textContent = L.setCounter;
  el.querySelector('.n-counter')!.textContent = L.setCounterNote;
  seg(el.querySelector('.s-counter')!, ['on', 'off'], L.onOff, () => (autoCounter() ? 'on' : 'off'), (v) => { try { localStorage.setItem(COUNTER_KEY, v === 'on' ? '1' : '0'); } catch { /* 그만 */ } world?.setAutoCounter(v === 'on'); });
  // 38차: 자동 회복 — 체력이 정한 %까지 떨어지면 빠른 칸의 회복품을 먹는다
  el.querySelector('.l-heal')!.textContent = L.setAutoHeal;
  el.querySelector('.l-healpct')!.textContent = L.setAutoHealPct;
  el.querySelector('.n-heal')!.textContent = L.setAutoHealNote;
  seg(el.querySelector('.s-heal')!, ['on', 'off'], L.onOff, () => (autoHealOn() ? 'on' : 'off'), (v) => { lsSet(HEAL_KEY, v === 'on' ? '1' : '0'); (el.querySelector('.s-healpct') as HTMLElement).classList.toggle('off', v !== 'on'); });
  const pcts = ['20', '30', '40', '50', '60'];
  seg(el.querySelector('.s-healpct')!, pcts, pcts.map((x) => `${x}%`), () => String(autoHealPct()), (v) => lsSet(HEALPCT_KEY, v));
  (el.querySelector('.s-healpct') as HTMLElement).classList.toggle('off', !autoHealOn());
  // 38차: 화면 — 상점 알림 화살표 · 건물 1층으로 줄이기 (오른쪽 아래 단추에서 옮겨 왔다)
  el.querySelector('.h-screen')!.textContent = L.setScreen;
  el.querySelector('.l-ping')!.textContent = L.setShopPing;
  // 39차 시야: 자동(휴대폰 1.6배 · 태블릿 1.3배 · PC 1배) 또는 직접
  el.querySelector('.l-zoom')!.textContent = L.setZoom;
  const zooms = ['auto', '1', '1.3', '1.6', '2'];
  seg(el.querySelector('.s-zoom')!, zooms, [L.zoomAuto, '1×', '1.3×', '1.6×', '2×'], () => lsGet('heavensmanual.zoom') ?? 'auto', (v) => { lsSet('heavensmanual.zoom', v); world?.setZoomPref(v); street?.setZoomPref(v); });
  el.querySelector('.l-low')!.textContent = L.lowLabel;
  seg(el.querySelector('.s-ping')!, ['on', 'off'], L.onOff, () => (lsGet(PING_KEY) === '0' ? 'off' : 'on'), (v) => { lsSet(PING_KEY, v === 'on' ? '1' : '0'); world?.setShopPing(v === 'on'); });
  seg(el.querySelector('.s-low')!, ['on', 'off'], L.onOff, () => (world?.low ? 'on' : 'off'), (v) => { if (!world) return; world.setLowBuildings(v === 'on'); street?.setLowBuildings(v === 'on'); });
  // 38차: PC 키 지정 (손가락 기기에서는 보이지 않는다)
  const keysBox = el.querySelector('.set-keys .keys');
  if (keysBox) {
    el.querySelector('.h-keys')!.textContent = L.setKeys;
    el.querySelector('.n-keys')!.textContent = L.setKeysNote;
    const drawKeys = () => {
      keysBox.innerHTML = '';
      const km = keyMap();
      for (const a of KEY_ACTS) {
        const row = document.createElement('div'); row.className = 'set-row';
        const lb = document.createElement('span'); lb.className = 'lbl'; lb.textContent = L.keyActs[a];
        const b = document.createElement('button'); b.className = 'keycap'; b.textContent = keyName(km[a]);
        b.onclick = () => {
          b.textContent = L.keyPress; b.classList.add('wait');
          keyCapture = (code) => {
            keyCapture = null;
            if (code === 'Escape') { drawKeys(); return; }
            if (MOVE_KEYS.has(code)) { toast(L.keyTaken); drawKeys(); return; }
            const m = keyMap();
            const other = KEY_ACTS.find((x) => x !== a && m[x] === code);
            if (other) m[other] = m[a]; // 이미 쓰는 키면 서로 바꾼다
            m[a] = code;
            lsSet(KEYS_KEY, JSON.stringify(m));
            drawKeys();
          };
        };
        row.append(lb, b);
        keysBox.appendChild(row);
      }
      const rs = document.createElement('button'); rs.className = 'keys-reset'; rs.textContent = L.keyReset;
      rs.onclick = () => { lsSet(KEYS_KEY, '{}'); drawKeys(); };
      keysBox.appendChild(rs);
    };
    drawKeys();
  }
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
    if (back) { back.textContent = L.adminBack.replace('{w}', state.adminTrip === 'heaven' ? L.tripHeaven : state.adminTrip === 'ghost' ? L.tripGhost : state.adminTrip === 'hell' ? L.tripHell : L.tripReal); back.onclick = () => adminTeleport('back'); }
    // 25차: 도시 이동 (현실의 우주새 문 앞으로)
    // 31차: 도트 3배 시험 (주인공·미스 황·황색날개 — 3배로 구운 층이 있는 사람만). 켜고 끄면 다시 연다
    el.querySelector('.l-dot3')!.textContent = L.adminDot3;
    seg(el.querySelector('.s-dot3')!, ['off', 'on'], L.adminOpts, () => (DOT3 ? 'on' : 'off'), (v) => { setDot3(v === 'on'); snapPos(); save(state); location.reload(); });
    el.querySelector('.l-city')!.textContent = L.adminCity;
    seg(el.querySelector('.s-city')!, ['bkk', 'seoul'], [L.regions.bkk, L.regions.seoul], () => (realm() === 'real' && !inHell() ? (world?.zone.city === 'seoul' || (world?.zone.interior && street?.zone.city === 'seoul') ? 'seoul' : 'bkk') : ''), (v) => adminTeleport(v === 'seoul' ? 'seoul' : 'bkk'));
    const hv = el.querySelector<HTMLButtonElement>('.tp-heaven')!;
    hv.textContent = L.adminHeaven;
    hv.disabled = realm() === 'heaven';
    hv.onclick = () => adminTeleport('heaven');
    el.querySelector('.l-worlds')!.textContent = L.adminWorlds;
    const tg = el.querySelector('.tp-goat') as HTMLButtonElement, tb = el.querySelector('.tp-border') as HTMLButtonElement;
    tg.textContent = L.adminGoat; tg.onclick = () => adminTeleport('goat');
    tb.textContent = L.adminBorder; tb.onclick = () => adminTeleport('border');
    const tt = el.querySelector('.tp-terrace') as HTMLButtonElement, tl = el.querySelector('.tp-hlobby') as HTMLButtonElement;
    tt.textContent = L.adminTerrace; tt.onclick = () => adminTeleport('terrace');
    tl.textContent = L.adminHellLobby; tl.onclick = () => adminTeleport('hlobby');
    // 34차: 관리자 도구 — 경제 통계 창 · 성능 표시 (켜고 끄기)
    el.querySelector('.l-tools')!.textContent = L.adminTools;
    const be = el.querySelector('.ad-eco') as HTMLButtonElement; be.textContent = L.ecoTitle; be.onclick = () => { el.remove(); openEcoStats(); };
    const bp = el.querySelector('.ad-perf') as HTMLButtonElement; bp.textContent = perfOn() ? L.perfOff : L.perfOn; bp.onclick = () => { setPerf(!perfOn()); bp.textContent = perfOn() ? L.perfOff : L.perfOn; };
    const th = el.querySelector('.tp-home') as HTMLButtonElement;
    th.textContent = L.adminHome; th.onclick = () => adminTeleport('home');
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
/** 33차: 은행 단추 그림 (기둥 넷 · 박공 지붕) */
const BANK_SVG = '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M12 2 2 7v2h20V7z" fill="currentColor"/><path d="M4 10h3v8H4zm6.5 0h3v8h-3zM17 10h3v8h-3z" fill="currentColor"/><path d="M2 19h20v3H2z" fill="currentColor"/></svg>';
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
  const border = realm() === 'border'; // 24차: 경계에는 시계도 돈도 없다
  const zNow = world?.zone.interior ? street?.zone : world?.zone;
  const seoul = (!inHell() && scene === 'world' && zNow?.city === 'seoul') || (scene === 'shop' && state.region === 'seoul' && realm() === 'real');
  setWon(realm() === 'real' && state.region === 'seoul');
  if (el) el.innerHTML = border ? '' : `${inHell() ? '' : `<span class="lbl">${seoul ? t().seoulLbl : t().bkk}</span> `}${(seoul ? seoulClock() : bangkokClock()).label}`;
  const w = hud.querySelector('.wallet');
  if (w) (w as HTMLElement).hidden = border;
  if (w && !border) w.innerHTML = inHell()
    ? `<span class="lbl">${t().notesLabel}</span> <i class="obol-ic"></i>${Math.floor(hellState().notes).toLocaleString('en-US')}${(state.debt ?? 0) > 0 ? ` <span class="debt">${t().debtHud.replace('{n}', String(Math.ceil(state.debt ?? 0)))}</span>` : ''}`
    : `<span class="lbl">${t().wallet}</span> ${moneyText(Math.floor(state.wallet ?? 0))}`;
  // 33차: 들고 다니는 돈이 많으면 은행 단추가 깜빡인다 (죽으면 길에 흩어진다)
  hud.querySelector('.to-bank')?.classList.toggle('urge', (state.wallet ?? 0) >= 1000);
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
    <div class="soul-points"></div><div class="soul-stats"></div><div class="soul-karma"></div>`;
  el.querySelector('.menu-head b')!.textContent = `${L.soulTitle} · ${L.rank} ${soul.rank}`;
  el.querySelector('.soul-exp span')!.textContent = L.soulExp;
  el.querySelector('.soul-points')!.textContent = left ? L.points.replace('{n}', String(left)) : '';
  (el.querySelector('.menu-close') as HTMLButtonElement).onclick = () => el.remove();
  const list = el.querySelector('.soul-stats')!;
  for (const k of STAT_KEYS) {
    const row = document.createElement('div');
    row.className = 'stat-row';
    row.innerHTML = `<b></b><em></em>`;
    row.querySelector('b')!.textContent = L.statNames[k];
    row.querySelector('em')!.textContent = String(s[k]);
    if (left > 0 && s[k] < STAT_MAX) {
      const plus = document.createElement('button');
      plus.textContent = '+';
      plus.onclick = () => addStat(k);
      row.appendChild(plus);
    }
    list.appendChild(row);
  }
  // 방어: 방어구 방어력 합과 회피 등급(맞히려면 넘어야 하는 수)
  const g = gear();
  const kd = el.querySelector('.soul-karma')!;
  const ac = document.createElement('div');
  ac.className = 'stat-row soft';
  ac.innerHTML = '<b></b><em></em>';
  ac.querySelector('b')!.textContent = L.defenseRow;
  ac.querySelector('em')!.textContent = L.defenseVal.replace('{d}', String(g.def)).replace('{ac}', String(armorClass(g.def, s.agi)));
  kd.appendChild(ac);
  // 선행·악행: 이번 생(심판은 이것으로) · 모든 생에 걸친 영혼의 기록
  // 29차: 이번 생은 선악 저울 그래프 — 이번 생 전체의 누적량만 센다 (선행 1000 · 악행 1001이면 바늘이 악 쪽으로 살짝 → 지옥)
  const life = state.deeds ?? { good: 0, evil: 0 }, all = state.deedsAll ?? life;
  {
    const tot = life.good + life.evil;
    const ev = tot > 0 ? (life.evil / tot) * 100 : 50;
    const box = document.createElement('div');
    box.className = 'karma-life';
    box.innerHTML = '<b></b><div class="kbar"><span class="kb-g"></span><div class="kb"><i class="kb-good"></i><i class="kb-evil"></i><i class="kb-mid"></i><i class="kb-mark"></i></div><span class="kb-e"></span></div>';
    box.querySelector('b')!.textContent = L.karmaLife;
    box.querySelector('.kb-g')!.textContent = L.karmaGood.replace('{n}', fmtKarma(life.good));
    box.querySelector('.kb-e')!.textContent = L.karmaEvil.replace('{n}', fmtKarma(life.evil));
    (box.querySelector('.kb-good') as HTMLElement).style.width = `${tot > 0 ? 100 - ev : 0}%`;
    (box.querySelector('.kb-evil') as HTMLElement).style.width = `${tot > 0 ? ev : 0}%`;
    (box.querySelector('.kb-mark') as HTMLElement).style.left = `${ev}%`;
    box.classList.toggle('lean-evil', tot > 0 && life.evil > life.good);
    box.classList.toggle('lean-good', tot > 0 && life.good > life.evil);
    kd.appendChild(box);
  }
  // 모든 생의 기록은 이번 생과 다를 때만 (첫 생이면 같은 숫자를 두 번 쓰지 않는다)
  for (const [label, d] of (all.good !== life.good || all.evil !== life.evil ? [[L.karmaAll, all]] : []) as [string, typeof all][]) {
    const row = document.createElement('div');
    row.className = 'stat-row soft';
    row.innerHTML = '<b></b><em></em>';
    row.querySelector('b')!.textContent = label;
    row.querySelector('em')!.innerHTML = `<span class="kg"></span> · <span class="ke"></span>`;
    row.querySelector('.kg')!.textContent = L.karmaGood.replace('{n}', fmtKarma(d.good));
    row.querySelector('.ke')!.textContent = L.karmaEvil.replace('{n}', fmtKarma(d.evil));
    kd.appendChild(row);
  }
  if ((state.absolve ?? 0) > 0) {
    const row = document.createElement('div');
    row.className = 'stat-row soft';
    row.innerHTML = '<b></b><em></em>';
    row.querySelector('b')!.textContent = L.absolveRow;
    row.querySelector('em')!.textContent = L.absolveVal.replace('{n}', fmtKarma(state.absolve ?? 0));
    kd.appendChild(row);
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
function openStore(kind: 'mart' | 'pharmacy' | 'food' | 'cafe' | 'tools' | 'dept' | 'antique', name: string, cuisine?: string) {
  closeMenus();
  document.querySelector('.store-panel')?.remove();
  const L = t();
  const el = document.createElement('div');
  el.className = 'store-panel shop-menu';
  el.innerHTML = `<div class="menu-head"><b></b><button class="menu-close">✕</button></div><p class="store-line"></p><div class="menu-list"></div>`;
  el.querySelector('.menu-head b')!.textContent = name;
  el.querySelector('.store-line')!.textContent = kind === 'tools' ? L.storeTools : kind === 'dept' ? L.storeDept : kind === 'antique' ? L.storeAntique : L.storeLine;
  (el.querySelector('.menu-close') as HTMLButtonElement).onclick = () => el.remove();
  const list = el.querySelector('.menu-list')!;
  let mode: StoreMode = 'buy';
  const tabsOn = storeTabs(el, () => mode, (m) => { mode = m; draw(); }, kind === 'tools');
  const draw = () => {
    list.innerHTML = '';
    tabsOn();
    if (mode === 'sell') { sellList(list, false, draw); return; }
    if (mode === 'repair') { repairList(list, false, draw); return; }
    // 32차: 강남이면 한국 메뉴 (분식·국밥·중식·고깃집…) — 같은 가게는 늘 같은 메뉴
    const seoul = (world?.zone.city ?? street?.zone.city) === 'seoul';
    const hm = realm() === 'heaven' ? heavenPriceMul(name) : 1; // 35차: 천국 가게는 가게마다 값이 다르다 (어떤 곳은 터무니없다)
    const menu = menuFor(kind, cuisine, seoul, name).map((m) => ({ ...m, price: m.price * hm }));
    const shelf = menu.map((m) => ({ it: itemByKey(m.key), price: m.price }));
    for (const { key, price } of menu) {
      const it = itemByKey(key);
      const poor = (state.wallet ?? 0) < price;
      const row = itemRow(it, priceText(price), async () => {
        if ((state.wallet ?? 0) < price) { toast(L.noMoney); return; }
        // 29차: 무기·방어구 같은 물건은 몇 개 살지 한 번 더 (그 자리에서 먹는 것만 바로)
        // 31차: 우주새만이 아니라 모든 가게에서 여러 개 — 그 자리에서 먹는 것만 바로
        const n = !it.now ? await askQty(it, price, Math.min(it.cat === 'weapon' || it.cat === 'armor' ? 9 : 99, Math.floor((state.wallet ?? 0) / price)), 'buy') : 1;
        if (n <= 0 || (state.wallet ?? 0) < price * n) return;
        state.wallet = (state.wallet ?? 0) - price * n;
        ecoLog('spend', it.now ? 'food' : 'shop', price * n);
        if (it.now) {
          world?.heal(it.heal ?? 0);
          toast(L.ate.replace('{item}', it.name[lang()]));
        } else {
          for (let k = 0; k < n; k++) addToBag(it);
          toast(n > 1 ? L.boughtN.replace('{item}', it.name[lang()]).replace('{n}', String(n)) : L.bought.replace('{item}', it.name[lang()]));
        }
        save(state);
        updateHud();
        draw();
      }, poor);
      // 29차: '사기' 탭이 생겨 줄마다 '사기'는 빼고, 그 자리에서 먹는 것만 표시
      if (it.now) { const tag = document.createElement('span'); tag.className = 'act'; tag.textContent = L.eatHere; row.appendChild(tag); row.classList.add('has-act'); }
      list.appendChild(withSteal(row, it, price, shelf, () => streetSteal(it, price, shelf, el, draw)));
    }
  };
  draw();
  document.body.appendChild(el);
  const hudBottom = document.getElementById('hud')?.getBoundingClientRect().bottom ?? 56;
  el.style.top = `${Math.round(hudBottom + 6)}px`;
}

// ───────────────────────── 은행: 통장 돈은 죽어도 남는다 ─────────────────────────
function openBank(name: string) {
  if (realm() === 'heaven') { void heavenBank(name); return; } // 35차: 천국 은행은 꺼내 가기만 한다 (얼마든지)
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
    </div>`;
  el.querySelector('.menu-head b')!.textContent = name;
  el.querySelector('.store-line')!.textContent = L.bankLine;
  (el.querySelector('.menu-close') as HTMLButtonElement).onclick = () => el.remove();
  const amt = el.querySelector('.b-amt') as HTMLInputElement;
  const draw = () => {
    el.querySelector('.b-wallet')!.textContent = moneyText(Math.floor(state.wallet ?? 0));
    el.querySelector('.b-bank')!.textContent = moneyText(Math.floor(state.bank ?? 0));
  };
  // 33차: 현실 은행의 노자돈 미리 바꾸기는 없앴다 — 이승 돈은 염소대왕의 방 환전상에게서만 (업만큼 · 값은 형편없이)
  const quick = el.querySelector('.bank-quick')!;
  for (const n of [100, 500, 1000]) {
    const b = document.createElement('button');
    b.textContent = moneyText(n);
    b.onclick = () => { amt.value = String(n * wonRate()); }; // 32차: 서울이면 원 단위로 적힌다
    quick.appendChild(b);
  }
  // 27차: '전부'는 바로 실행 — 지갑 전부 맡기기 · 통장 전부 찾기
  const allIn = document.createElement('button');
  allIn.className = 'b-all';
  allIn.textContent = L.bankAllIn;
  allIn.onclick = () => { amt.value = String(Math.floor(state.wallet ?? 0) * wonRate()); move(1); };
  const allOut = document.createElement('button');
  allOut.className = 'b-all';
  allOut.textContent = L.bankAllOut;
  allOut.onclick = () => { amt.value = String(Math.floor(state.bank ?? 0) * wonRate()); move(-1); };
  const br = document.createElement('span'); br.className = 'flex-break';
  quick.append(br, allIn, allOut);
  const move = (dir: 1 | -1) => {
    // 37차: 서울에선 원으로 적는다 — 바트 셈으로 바꿔서 지갑과 견준다 (원 금액을 바트로 견줘 '지갑이 비어 있다'고 하던 것)
    const typed = Number(amt.value);
    const n = Math.floor(typed / wonRate() + 1e-9);
    if (!typed || typed <= 0 || n <= 0) { toast(L.bankAmount); return; }
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
// 38차: '1층으로 줄이기'는 영혼 설정으로 옮기고 그 자리는 줍기 단추. 손 단추는 돋보기 + '상호작용'
const PICK_SVG = '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="M12 2.5v9m-3.5-3.5L12 11.5 15.5 8" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/><path d="M4 12.5h16l-1.6 8H5.6z" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linejoin="round"/><circle cx="12" cy="16.3" r="1.6" fill="currentColor"/></svg>';
const LENS_SVG = '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><circle cx="10" cy="10" r="6" fill="none" stroke="currentColor" stroke-width="2.2"/><path d="M14.5 14.5 20 20" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"/></svg>';
stanceBox.innerHTML = `<button class="st-pick" aria-label="pick up">${PICK_SVG}<small></small></button><button class="st-hand" aria-label="interact">${LENS_SVG}<small></small></button><button class="st-sword" aria-label="attack stance"><span class="sw">⚔</span><small></small></button>`;
document.body.appendChild(stanceBox);
stanceBox.hidden = true;
(stanceBox.querySelector('.st-hand') as HTMLButtonElement).onclick = () => setStance('talk');
// 건물 낮추기 (1층만 보이게) — 도심에서 길이 가려 움직이기 힘들 때
(stanceBox.querySelector('.st-pick') as HTMLButtonElement).onclick = () => pickAct();
/** 38차 줍기: 가까운 돈·물건만 (멀면 그쪽으로 걸어가 줍는다) */
function pickAct() {
  if (!world || scene !== 'world' || busy || dlg.isOpen) return;
  if (world.pickNearby() === 'none') toast(t().pickNone);
}
/** 38차 회복 키(F3): 빠른 칸의 회복품, 없으면 가방에서 가장 싼 회복품 */
function healAct() {
  if (!world || scene !== 'world' || world.isDead) return;
  const bag = state.bag ?? {};
  const ok = (k: string | undefined) => !!k && (bag[k] ?? 0) > 0 && !!itemByKey(k)?.heal && !itemByKey(k)?.use && worldOk(itemByKey(k));
  const k = ok(state.quick) ? state.quick! : Object.keys(bag).filter(ok).sort((a, b) => itemByKey(a).price - itemByKey(b).price)[0];
  if (!k) { toast(t().healNone); return; }
  const r = useItem(k);
  if (r === true) { renderQuick(); if (document.querySelector('.bag-panel')) renderBag(); }
}
/** 38차 자동 회복: 체력이 정한 % 아래면 빠른 칸의 회복품을 먹는다 (대기 시간 지키기 · 빠른 칸이 비면 하지 않는다) */
function autoHealCheck(hp: number, max: number) {
  if (!autoHealOn() || hp <= 0 || !world || scene !== 'world' || world.isDead || itemCooling()) return;
  if ((hp / max) * 100 > autoHealPct()) return;
  const k = state.quick, it = k ? itemByKey(k) : null;
  if (!k || !it?.heal || it.use || !((state.bag?.[k] ?? 0) > 0) || !worldOk(it)) return;
  if (useItem(k) === true) { renderQuick(); if (document.querySelector('.bag-panel')) renderBag(); }
}
setInterval(() => { if (state.hp !== undefined) autoHealCheck(state.hp, maxHp()); }, 400);
(stanceBox.querySelector('.st-sword') as HTMLButtonElement).onclick = () => setStance(stance === 'hostile' ? 'all' : 'hostile');
function setStance(s: Stance) {
  stance = s;
  world?.setStance(s);
  stanceBox.dataset.mode = s;
  stanceBox.querySelector('.st-sword small')!.textContent = s === 'talk' ? '' : t().stance[s];
  (stanceBox.querySelector('.st-sword') as HTMLElement).title = t().stance[s === 'talk' ? 'hostile' : s];
  (stanceBox.querySelector('.st-hand') as HTMLElement).title = t().stance.talk;
}
function showStance(on: boolean) {
  stanceBox.hidden = !on;
  // 36차: 바뀐 조작을 한 번만 알려 준다 (손가락이면 길게 누르기, PC면 W·A·S·D)
  if (on && !state.ctlHint) {
    state.ctlHint = 1;
    save(state);
    setTimeout(() => toast(matchMedia('(pointer: coarse)').matches ? t().ctlHintTouch : t().ctlHintPc), 1800);
  }
  (stanceBox.querySelector('.st-pick') as HTMLElement).title = t().pickLabel;
  (stanceBox.querySelector('.st-pick small') as HTMLElement).textContent = t().pickLabel;
  (stanceBox.querySelector('.st-hand small') as HTMLElement).textContent = t().stance.talk;
  setStance(stance);
}

// ───────────────────────── 36차 PC 키보드 이동 (W·A·S·D · 방향키) ─────────────────────────
{
  const held = new Set<string>();
  const DIR: Record<string, [number, number]> = { KeyW: [0, -1], ArrowUp: [0, -1], KeyS: [0, 1], ArrowDown: [0, 1], KeyA: [-1, 0], ArrowLeft: [-1, 0], KeyD: [1, 0], ArrowRight: [1, 0] };
  const typing = (e: KeyboardEvent) => { const el = e.target as HTMLElement | null; return !!el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT' || el.isContentEditable); };
  const push = () => {
    let x = 0, y = 0;
    for (const c of held) { const d = DIR[c]; if (d) { x += d[0]; y += d[1]; } }
    world?.setKeyDir(Math.sign(x), Math.sign(y));
  };
  window.addEventListener('keydown', (e) => {
    if (!DIR[e.code] || typing(e) || e.ctrlKey || e.metaKey || e.altKey) return;
    if (scene !== 'world' || busy || dlg.isOpen) { if (held.size) { held.clear(); push(); } return; }
    if (e.code.startsWith('Arrow')) e.preventDefault();
    if (held.has(e.code)) return;
    held.add(e.code);
    push();
  });
  window.addEventListener('keyup', (e) => { if (held.delete(e.code)) push(); });
  window.addEventListener('blur', () => { if (held.size) { held.clear(); push(); } });
  // 38차 PC 키 (영혼 설정에서 바꾼다): F1 상호작용 · F2 공격 태세 · F3 회복품 · F4 줍기
  window.addEventListener('keydown', (e) => {
    if (keyCapture) { e.preventDefault(); e.stopPropagation(); keyCapture(e.code); return; }
    if (typing(e) || e.ctrlKey || e.metaKey || e.altKey) return;
    const km = keyMap();
    const act = KEY_ACTS.find((a) => km[a] === e.code);
    if (!act) return;
    e.preventDefault(); // F1 도움말 · F3 찾기 같은 브라우저 기본 동작을 막는다
    if (scene !== 'world' || !world || stanceBox.hidden) return;
    if (act === 'heal') { healAct(); return; }
    if (busy || dlg.isOpen) return;
    if (act === 'pick') { pickAct(); return; }
    if (act === 'attack') { setStance(stance === 'talk' ? 'hostile' : 'talk'); return; }
    if (stance !== 'talk') { setStance('talk'); return; }
    world.interactKey();
  }, true);
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
    <div class="row"><button class="go primary"></button><button class="cancel"></button></div>
    <div class="refuse-row"><button class="refuse"></button><small class="refuse-sub"></small></div></div>`;
  const q = <T extends Element>(s: string) => el.querySelector(s) as T;
  // 31차: 살기로 결정 ↔ 살지 않기로 결정 (지옥 3층에서 시작 · 염소대왕을 만난다). 현실에서 사는 중일 때만
  const refuse = q<HTMLButtonElement>('.refuse');
  refuse.textContent = L.refuseLive; q<HTMLElement>('.refuse-sub').textContent = L.refuseSub;
  if (realm() !== 'real') q<HTMLElement>('.refuse-row').remove();
  refuse.onclick = async () => {
    if (!(await confirmBox(L.refuseAsk, L.refuseGo))) return;
    el.remove();
    fallToGoat('chose');
  };
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
