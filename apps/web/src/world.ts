// 현실 세계 장면 (PixiJS): 실제 지도, 화면 근처만 불러오기, 클릭 이동, 행인·불량배, 차량, 방콕 실시간 낮밤
// 1단계-B: 대상 메뉴(말 걸기·살펴보기·공격·강제 공격), 싸움과 체력, 쓰러짐과 돈 줍기, 가게 노동, 차 사고
import { Hound } from './hound.ts';
import { shuttleCanvas, flameCanvas } from './shipgfx.ts';
import { goatCharSet } from './goat.ts';
import { drawDalHouse } from './dalgfx.ts';
import { drownedCanvas, monkLook, shoreF, shoreLine, shoreSkyCanvas } from './border.ts';
import { wingTexture, cloudTexture, heavenVignette, cloudStairTexture, heavenTowerTexture, terraceSkyTexture, hellPortalTexture, bedTexture, BED_ANCHOR, batWingTexture, hornTexture } from './heavengfx.ts';
import { hellDecor } from './hellprops.ts';
import { Application, ColorMatrixFilter, Container, Graphics, Matrix, Rectangle, Sprite, Text, Texture, TilingSprite } from 'pixi.js';
import { type Look } from './character.ts';
import { MISS_HWANG, TALUS_LOOK, MASKGIRL_LOOK, yunaeLook, charSet, frameOf, applyFrame, dirFromTile, turnedDir, auraFor, makeAuraSprite, ANIM_FPS, IMPACT, TWO, type CharSet, type Dir, type Anim, type Frame } from './sprites.ts';
import { type Zone, type Building, type Lane, type Prop, type HellVendor, type Furn, findPath, walkable, randomWalkTileNear, tileAt } from './zone.ts';
import { iso, TW, TH, drawBuilding, drawGroundChunk, buildingHeight } from './gfx.ts';
import { drawBuildingKit, drawGroundKit, buildingTop, upperFloors, carSprite, propSprite, CAR_MODELS, CHUNK, kitOk } from './street.ts';
import { t, lang } from './i18n.ts';
import { bangkokClock, nightFactor } from './clock.ts';
import { buildingName, buildingSub, interactive, canWork, hasBank, cuisineOf, storeOf, kindOf as bKindOf, mainPoi, type StoreKind } from './names.ts';
import * as sfx from './sfx.ts';
import { MONSTERS, GUARDS, floorDef, GURMA_FULL, fordWob, type MonsterDef, type GuardDef, raidState } from './hell.ts';
import { rollLoot, ITEMS, iconFor } from './items.ts';
import { drawHellBank, drawAtone, drawRebirthGate } from './hellhalls.ts';
import { SKIN_COLORS } from './character.ts';
import { weatherHell } from './hellweather.ts';
import { drawHellGround, hellGroundJob, type GroundJob, drawHellStructure, hellTint, hellProp, liquidInside, bloodLavaTile } from './hellgfx.ts';
import { drawCosmicBird, drawCosmicBirdHeaven, COSMIC_TOP } from './ujusae.ts';
import { SOI_SIGNS, SOI_ALIAS, BTS_STATIONS, LANDMARKS, soiSignCanvas, stationCanvas, neonGateCanvas, billboardCanvas, helixCanvas, fountainCanvas, parkSignCanvas, type Pic } from './landmarks.ts';
import { drawYuhwang } from './yuhwang.ts';
import { drawLoanHouse, LOAN_TOP } from './loanhouse.ts';
import { portraitUrl, type PortraitSlot } from './portraits.ts';

/** 22차: 지옥 휴게소의 서큐버스 — 층마다 다른 모습 (1층 잿빛 살결·불씨 머리 · 2층 늪빛 살결·이끼 머리 · 3층 붉은 비단·금붙이) */
const SUCCUBUS_LOOK: Record<number, Look> = {
  1: { sex: 'f', build: 0, skin: 0, hair: 3, hairColor: 0, top: 0, bottom: 0, outfit: 'casual', cols: { 1: '#a89c94', 10: '#a89c94', 2: '#e2622a', 3: '#1a1210', 4: '#1a1210', 9: '#a89c94', 5: '#0e0a08', 6: '#ffb02a' } },
  2: { sex: 'f', build: 0, skin: 0, hair: 4, hairColor: 0, top: 0, bottom: 0, outfit: 'casual', cols: { 1: '#9cb08c', 10: '#9cb08c', 2: '#2e4a2a', 3: '#3a5a2a', 4: '#24301e', 9: '#9cb08c', 5: '#1a2214', 6: '#d8f05a' } },
  4: { sex: 'f', build: 0, skin: 0, hair: 4, hairColor: 0, top: 0, bottom: 0, outfit: 'casual', cols: { 1: '#a8968a', 10: '#a8968a', 2: '#e8e2d8', 3: '#1a1412', 4: '#2a1a12', 9: '#a8968a', 5: '#ff8a1a' } }, // 24차: 4층 베르카 (쇳빛 머리·그을린 가죽)
  3: { sex: 'f', build: 0, skin: 0, hair: 3, hairColor: 0, top: 0, bottom: 0, outfit: 'casual', cols: { 1: '#ecc8b8', 10: '#ecc8b8', 2: '#140a0a', 3: '#8a1020', 4: '#5a0a14', 9: '#ecc8b8', 5: '#c9a23e', 6: '#ff3a4a' } },
};
const SEOUL_CARS = ['sedan-white', 'sedan-white', 'sedan-black', 'sedan-silver', 'sedan-silver', 'sedan-blue', 'sedan-red', 'pickup', 'moto', 'bus'];
/** 22차: 거리 사람 모습 묶음 (구역을 옮겨도 이어 쓴다) */
const LOOK_POOL = new Map<string, Look[]>();
/** 22차: 스트리밍 작업 시간 기록 (?debug 에서 window.__perf 로 본다) */
export const PERF: Record<string, [number, number, number]> = {};
function perf<T>(k: string, f: () => T): T { const t0 = performance.now(); const r = f(); const d = performance.now() - t0; const e = (PERF[k] ??= [0, 0, 0]); e[0]++; e[1] += d; e[2] = Math.max(e[2], d); return r; }
(globalThis as { __perf?: typeof PERF }).__perf = PERF;

/** 관리자가 갈아 끼운 인물 도트 그림 (베스크 · 탈루스). 칸마다 한 번만 받는다 */
const NPC_ART = new Map<string, Promise<Texture | null>>();
function npcArt(slot: PortraitSlot) {
  let p = NPC_ART.get(slot);
  if (!p) {
    p = portraitUrl(slot).catch(() => null).then((u) => !u ? null : new Promise<Texture | null>((res) => {
      const i = new Image(); i.crossOrigin = 'anonymous';
      i.onload = () => { const tx = Texture.from(i); tx.source.scaleMode = 'nearest'; res(tx); };
      i.onerror = () => res(null);
      i.src = u;
    }));
    NPC_ART.set(slot, p);
  }
  return p;
}
/** 관리자가 갈아 끼운 고유 건물 도트 그림 (우주새 낮·밤, 베스크 대부소). 한 번만 받아 둔다 */
const BLD_ART: Record<string, HTMLCanvasElement> = {};
let bldArtLoad: Promise<boolean> | null = null;
function loadBuildingArt() {
  bldArtLoad ??= Promise.all((['bld-ujusae', 'bld-ujusae-night', 'bld-ujusae-heaven', 'bld-loan', 'bld-hell-1', 'bld-hell-2', 'bld-hell-3'] as const).map(async (slot) => {
    const u = await portraitUrl(slot).catch(() => null);
    if (!u) return false;
    const im = await new Promise<HTMLImageElement | null>((res) => { const i = new Image(); i.crossOrigin = 'anonymous'; i.onload = () => res(i); i.onerror = () => res(null); i.src = u; });
    if (!im) return false;
    const c = document.createElement('canvas'); c.width = im.width; c.height = im.height; c.getContext('2d')!.drawImage(im, 0, 0);
    BLD_ART[slot] = c;
    return true;
  })).then((a) => a.some(Boolean));
  return bldArtLoad;
}
import { streetProp, type PropPic } from './propgfx.ts';
import { decorOf } from './decor.ts';
import { canEnter, drawRoom, drawFurn, clerkLook, grandpaLook, roomKind as roomKindOf } from './interior.ts';
import { carHit, isDanger, DANGER_SPEED, critChance, CRIT_MULTIPLIER, regenPerMinute, restRegenPerMinute, OUT_OF_COMBAT_S, armorClass, rollToHit, maxHp as maxHpFor, newStats, type DeedKey, type Stats } from '../../../packages/shared/src/rules.ts';

function tex(c: HTMLCanvasElement): Texture {
  const tx = Texture.from(c);
  tx.source.scaleMode = 'nearest';
  return tx;
}

export type NpcKind = 'passer' | 'thug' | 'suturer' | 'monster' | 'pashar' | 'clerk' | 'angel' | 'yellowwing' | 'officer' | 'guard' | 'talus' | 'soul' | 'vendor' | 'fighter' | 'elder' | 'sleeper' | 'goat' | 'maskgirl' | 'yunae';
export type Realm = 'real' | 'ghost' | 'hell' | 'heaven' | 'border'; // 24차: border = 경계의 해변 (귀신 대신)
export type Stance = 'talk' | 'hostile' | 'all';
/** name = 아이디(프로필·신고에 쓰는 열쇠), nick = 게임 속 이름(보이는 이름) */
export interface RemoteInfo { name: string; nick?: string; look: Look; weapon: string | null; armor: string[]; member: boolean; hidden?: boolean }
export interface NetPos { x: number; y: number; d: Dir; m: 0 | 1; a?: Anim; h?: number; c?: 1; k?: 1 }
interface Walker {
  art?: Texture; // 관리자가 손본 도트 (서 있을 때 남서·남동쪽을 볼 때만 — 남동은 좌우를 뒤집는다)
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
  hitBy?: boolean; // 대식자를 이미 친 적이 있다 (악행은 한 번만)
  farT?: number;
  giveUp?: boolean; // 대식자: 쫓는 사람이 멀리 떨어져 있던 시간 (오래 도망치면 포기)
  monster?: boolean; // 변신한 대식자
  hp: number;
  maxHp: number;
  down: number; // 쓰러져 있는 남은 시간
  target: Walker | null; // 공격 대상
  atkT: number;
  firstBy: Walker | null; // 이 싸움을 먼저 건 쪽
  flee: number;
  hurtT: number;
  flashT?: number; // 맞는 순간 하얗게 번쩍
  monk?: boolean; // 24차: 경계의 가부좌한 완성자
  fled?: boolean; // 24차: 염소가 한 번 달아나기로 했다
  cards?: boolean; // 24차: 테라스에서 카드 치는 천사
  glasses?: Graphics; // 24차: 환생관 할아버지의 안경
  squashT?: number; // 24차 손맛: 맞는 순간 몸이 찌그러졌다 펴진다
  lungeT?: number; // 24차 손맛: 때리는 순간 앞으로 반 걸음
  kb?: { dx: number; dy: number; t: number }; // 밀려나기
  voice?: number; // 사람마다 다른 목소리·타격음 높낮이
  stalk?: number; // 불량배: 시비 걸며 다가오는 중 (초)
  weak?: 'drunk' | 'shade'; // 잡기 쉬운 적: 현실의 취객 · 천국의 그림자
  gang?: 'robber' | 'mafia'; // 17차: 불량배보다 센 적 (강도 · 마피아)
  wings?: Sprite; // 천사·황색날개의 날개
  aggroCool?: number;
  mdef?: MonsterDef; // 지옥 괴물
  gdef?: GuardDef; // 휴식 마을 경비병
  post?: number; // 경비병 번호 (순찰로)
  patrolK?: number; // 순찰로에서 다음에 갈 곳
  warnT?: number; // 경비병: 경고하고 기다리는 시간
  pdmg?: number; // 괴물: 내가 준 피해 (경비병이 마무리하면 이만큼 나눠 받는다)
  slowT?: number; // 진흙 파문: 느려진 남은 시간
  shotT?: number; // 탈루스: 다시 쏠 수 있을 때까지
  sealT?: number; // 붉은 봉인 낙인: 남은 시간
  size?: number; // 그림 배율 (층주는 크게)
  wingK?: number; // 21차: 날개 배율 (택시 천사는 아주 크다)
  /** 22차: 서큐버스의 뿔 (머리 위에 따라 그린다) */
  horns?: Sprite;
  raider?: boolean; // 4층부터의 습격 때 마을로 몰려든 괴물
  kid?: boolean; // 26차: 떼의 곁가지 (재충) — 쓰러지거나 멀어지면 다시 나지 않는다
  brave?: boolean; // 27차: 맞으면 달아나지 않고 맞선다 (행인·관광객의 절반)
  hidden?: string | null; // 27차: 품에 숨긴 무기 (단검·권총) — 싸울 때 꺼낸다
  leave?: number; // 28차: 대문 앞의 유내가 약속 때문에 떠나는 중 (떠난 뒤 흐른 시간)
  gunman?: boolean; // 27차: 드물게 권총을 숨긴 센 행인
  pray?: boolean; // 1층 악마상 앞에 엎드려 비는 영혼
  still?: 'sit' | 'lie' | 'lotus'; // 마을의 지친 영혼: 앉아 있거나 누워 있다 · 24차 가부좌 (경계의 완성자·카드 치는 천사)
  vend?: HellVendor | 'street' | 'massage' | 'bar' | 'heaven'; // 마을 장사꾼 · 19차 현실: 손수레 노점 · 마사지 호객 · 바 호객 · 21차 천국: 먹을 것을 파는 천사
  /** 19차: 호객원이 서 있는 가게 (건물 번호) */
  shopK?: number;
  /** 20차: 천국을 침공한 악마 (지옥문에서 나왔다) */
  invader?: boolean;
  /** 21차 천국: 나를 따라오는 이성(구애) · 요리사(음식 권함) — 얼마쯤 따라오다 떠난다 */
  tail?: { kind: 'admire' | 'chef'; t: number; cool: number; rep: number };
  /** 21차 천국: 종교시설 앞에서 행사에 오라고 외치는 천사 (건물 번호) */
  preach?: number;
  /** 21차 천국: 도시 끝의 택시 천사 */
  taxi?: boolean;
  /** 19차: 외국인 관광객 (밝은 피부·검은 피부·동아시아) — 지갑이 두둑하다 */
  tour?: 'w' | 'b' | 'a';
  beg?: boolean; // 2층 층주 구르마: 먹을 것을 든 영혼에게는 싸우지 않고 조른다
  asleep?: boolean; // 배불러 잠든 구르마
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
  /** 19차: 내가 길을 막고 있는 시간 → 경적, 그다음엔 창문을 내리고 욕 */
  blockT?: number;
}
interface Coin { x: number; y: number; amount: number; sprite: Graphics; fromVictim: boolean; life: number; notes?: boolean; claimed?: boolean }
interface BView { parts: Sprite[]; base: Texture; x: number; y: number; w: number; h: number; top: number; lx: number; ly: number; alpha?: Uint8Array; cv?: HTMLCanvasElement; b: Building; ghost?: { parts: Sprite[]; base: Texture; a: number } }
interface Floater { obj: Container; t: number; vy: number }
type LabelRef = { kind: 'shop' } | { kind: 'b'; k: number } | { kind: 'w'; w: Walker } | null;

/** main.ts 가 받는 일들 */
export interface WorldHooks {
  money(n: number): void;
  deed(key: DeedKey, opt?: { floor?: number; share?: number }): void;
  hp(hp: number, max: number): void;
  died(cause: 'car' | 'beaten' | 'hell'): void;
  menu(title: string, sub: string, options: { label: string; danger?: boolean; act: () => void }[], x: number, y: number): void;
  say(name: string, text: string): void;
  /** 막지 않는 짧은 알림 (위쪽에 잠깐) */
  notice(text: string): void;
  /** 21차: 넘치는 체력 (마사지) 표시 */
  over(n: number): void;
  /** 19차: 종교시설의 가장 높은 이 — 능력치 되돌리기 */
  elder(name: string): void;
  /** 19차: 일을 마쳤다 — 번 돈을 받거나(stiffed=false), 사장에게 떼이고 쫓겨났다 */
  wage(n: number, where: string, stiffed: boolean): void;
  /** 19차: 구역 끝으로 걸어 나감 (서쪽·동쪽 이웃 구역으로). x·y = 지금 구역의 연속 좌표 */
  edge(dir: 'w' | 'e', x: number, y: number): void;
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
  hellAct(kind: 'up' | 'down' | 'pashar' | 'talus'): void;
  /** 25차: 지옥 1층 마스크 팔이 소녀의 바구니 */
  maskGirl(): void;
  yunaeOut(): void; // 28차: 대문 앞의 20대 유내에게 말을 건다
  /** 26차: 초심자 야구 배트를 떨어뜨려도 되나 (돈·장비 없음 · 아직 받은 적 없음) */
  beginnerBat(): boolean;
  /** 지옥: 층주를 쓰러뜨렸다 */
  bossDown(floor: number): void;
  /** 지옥: 노전을 주웠다 */
  notes(n: number): void;
  /** 천국: 환생관 · 황색날개 · 빈 우주새 · 천국에서 손을 듦 */
  heavenAct(what: 'officer' | 'yellowwing' | 'shop' | 'assault' | 'terrace' | 'taxi' | 'ceremony'): void;
  /** 21차 천국: 천사·요리사가 권하는 음식 (먹어도 아무 효과 없다) */
  heavenFood(from: string): void;
  /** 21차: 안내천사 황색날개를 놓쳤다 */
  ywLost(): void;
  /** 베스크에게 진 빚 (남은 노전) */
  debt(): number;
  /** 미납귀가 떨어진 노전을 물어 갔다 (빚에서 뺀다) */
  debtEat(n: number): void;
  /** 건물 문 앞에 닿았다: 안으로 (out = 나왔을 때 설 자리, chaser = 쫓아오던 대식자) */
  enterBuilding(k: number, out: { i: number; j: number }, chaser: { monster: boolean; hp: number } | null, work?: boolean): void;
  /** 24차: 서울 달동네, 내 집으로 가는 골목 들머리에 들어섰다 */
  homeAlley(): void;
  /** 방의 나가는 매트를 밟았다 */
  leaveBuilding(): void;
  /** 방의 직원에게 말을 걸었다 */
  clerk(): void;
  /** 지옥: 괴물이 떨어뜨린 물건을 주웠다 */
  loot(key: string): void;
  /** 지옥 마을 장사꾼과 거래 */
  vendor(kind: HellVendor): void;
  /** 2층 구르마에게 먹이를 준다: 준 개수와 누적을 돌려준다 */
  feedGurma(): { gave: number; total: number; full: boolean };
  /** 가방에 먹을 것이 있는가 (구르마가 덤비지 않고 조른다) */
  hasFood(): boolean;
}
export interface Gear { atk: number; def: number; dr?: number; ranged: boolean; flame?: boolean; range?: number; rate?: number; weapon: string | null; armor: string[] }

const PED_COUNT = 14;
const THUG_COUNT = 4;
// 17차: 불량배보다 센 거리의 적 — 강도(복면·후드·더플백) · 마피아(정장·선글라스·권총). 남녀 모두
const ROBBER_COUNT = 3;
const MAFIA_COUNT = 2;
const DRUNK_COUNT = 5; // 현실: 비틀거리며 시비 거는 취객 (약한 적)
const ANGEL_COUNT = 5;
const MAX_CARS = 30; // 22차: 70 → 30 (차가 너무 많고 겹쳤다)
export const PLAYER_MAX_HP = 1000;
/** 방콕 최저임금 하루 ฿400 (8시간) */
export const WAGE_PER_HOUR = 400 / 8;
const WAGE_PER_SEC = WAGE_PER_HOUR / 3600;
const ATK_INTERVAL = 0.62; // 6차: 더 빠르게
/** 고문 장면 (26차: 층마다 다른 고문) */
type Torture = {
  tor: Sprite; vic: Sprite; tcs: CharSet | null; vcs: CharSet | null; x: number; y: number; tx: number; ty: number; t: number; next: number; t0: number; hitT: number; struck: boolean; lying: boolean; tdir: Dir; vdir: Dir; spark: Graphics; free?: boolean;
  style: 'beat' | 'burn' | 'dunk' | 'whip' | 'furnace'; fx: Graphics; mask?: Graphics; sink: number; flare: number; splats: number;
  parts: { x: number; y: number; vx: number; vy: number; t: number; c: number; r: number; ring?: boolean; smoke?: boolean }[];
};
const MELEE = 1.25;
const RANGED = 5;
const FLAME = 3.2; // 25차: 불길이 닿는 거리 (화염방사기 · 불씨귀)

const rand = (a: number, b: number) => a + Math.floor(Math.random() * (b - a + 1));
/** 행인(중립)이 떨어뜨리는 돈 (1~300): 대개 불량배처럼 몇 바트, 아주 드물게 큰돈 */
function passerCash() {
  const r = Math.random();
  if (r < 0.86) return rand(1, 3);
  if (r < 0.96) return rand(5, 30);
  if (r < 0.993) return rand(40, 120);
  return rand(150, 300);
}
/** 19차 관광객: 지갑이 두둑하다 (대개 수십~수백 바트, 가끔 수천) */
function touristCash() {
  const r = Math.random();
  if (r < 0.7) return rand(40, 200);
  if (r < 0.95) return rand(200, 800);
  return rand(1000, 3000);
}
/** 지구 곳곳에서 온 영혼들: 피부 열세 가지(아주 흰 → 아주 검은), 머리 아홉 가지, 빛바랜 누더기 */
const SKINS = ['#f4dcc8', '#ecc8a8', '#e0b48c', '#d2a070', '#c08a5a', '#a87448', '#8e5c38', '#74482a', '#5a3620', '#442818', ...SKIN_COLORS];
const HAIRC = ['#141010', '#2a1a12', '#4a2e1a', '#6a4a2a', '#8a6a3a', '#b8a070', '#d8d0c0', '#5a5a5a', '#7a2a1a'];
const RAGS = ['#4a443c', '#3a3430', '#5a4a3a', '#2e2a28', '#4a3a2e', '#3a3e3a', '#5a5048', '#6a5a46', '#3a2a22'];
function randomSoulLook(clean = false): Look {
  const R = (a: number) => Math.floor(Math.random() * a);
  const sk = SKINS[R(SKINS.length)], sex = Math.random() < 0.5 ? 'm' : 'f';
  const outfit = clean ? 'casual' : (['casual', 'casual', 'patient', 'raincoat'] as const)[R(4)];
  const cl = clean ? ['#3a4a5a', '#5a5a62', '#6a5a4a', '#2a3a4a', '#7a6a5a', '#4a4a4a'] : RAGS;
  return { sex, build: R(3), skin: 0, hair: R(6), hairColor: 0, top: 0, bottom: 0, outfit, cols: { 1: sk, 10: sk, 2: HAIRC[R(HAIRC.length)], 3: cl[R(cl.length)], 4: cl[R(cl.length)], 9: cl[R(cl.length)], 8: cl[R(cl.length)], 5: '#2a2018' } };
}
/** 싸울 상대 위의 마우스 커서: 칼끝이 왼쪽 위를 가리키는 작은 검 (칼끝이 누르는 자리) */
const SWORD_CURSOR = `url("data:image/svg+xml;utf8,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="26" height="26" viewBox="0 0 26 26"><g stroke="#140e0a" stroke-width="1.4" stroke-linejoin="round"><path d="M2 2 L6.5 3.2 L17 13.7 L13.7 17 L3.2 6.5 Z" fill="#e8e4dc"/><path d="M3.2 3.2 L15.4 15.4" stroke="#9aa3ad" stroke-width="1"/><path d="M13 19.6 L19.6 13 L21.4 14.8 L14.8 21.4 Z" fill="#c9a23e"/><path d="M17.2 17.2 L22.6 22.6" stroke-width="3.6" stroke="#140e0a"/><path d="M17.2 17.2 L22.6 22.6" stroke-width="2" stroke="#6b4429"/><circle cx="23.4" cy="23.4" r="1.9" fill="#c9a23e"/></g></svg>')}") 2 2, crosshair`;

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
  /** 지옥의 고문 장면: 야크가 쇠몽둥이로 묶이거나 쓰러진 망자를 끝없이 내리친다 (만질 수 없는 풍경) */
  private tortures: Torture[] = [];
  /** 베스크의 미납귀 (빚이 있을 때만) */
  private hound: Hound | null = null;
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
  private streamMore = false;
  /** 나눠 그리는 중인 지옥 바닥 덩어리 */
  private gjob: { key: string; vis: boolean; job: GroundJob } | null = null;
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
  // 이름표: 네모칸 없이 글자만 (어두운 테두리로 읽히게) — 싸우는 장면을 가리지 않도록
  private labelText = new Text({ text: '', style: { fontFamily: 'system-ui, sans-serif', fontSize: 13, fontWeight: '700', fill: '#fff6d8', stroke: { color: '#140e0a', width: 3, join: 'round' } } });
  private labelBg = new Graphics();
  private labelT = 0;
  private labelFor: LabelRef = null;
  private hoverFor: LabelRef = null;
  private insets = { right: 0, bottom: 0 };
  private gear: Gear = { atk: 0, def: 0, ranged: false, weapon: null, armor: [] };
  private stats: Stats = newStats();
  stance: Stance = 'talk';
  private suturerT = 0; // 다음 대식자가 나타날 수 있을 때까지 (나타났다 사라진 뒤 쉬는 시간)
  private sutDue = -1; // 이번 죄에 대식자가 오기로 정해졌다면, 나타날 때까지 남은 시간
  private combatT = 99; // 마지막 싸움 뒤 지난 시간
  private criminalT = 0; // 먼저 공격한 표시가 남은 시간
  private carCool = 0;
  private stun = 0;
  private dead = false;
  private working: { k: number; name: string; earned: number; spot: [number, number]; on: boolean; job: { mult: number; drain: number; hard: 0 | 1 | 2 } } | null = null;
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
  /** 경비병 기술 효과: 곤봉 내려치기 먼지 고리 · 진흙 파문 (바닥) / 봉인 낙인 (머리 위) */
  private gfxLow = new Graphics();
  /** 흐르는 물: 용암 위로 흘러가는 달아오른 빛줄기와 터지는 거품 · 늪의 물결 · 핏물의 거품 */
  private liquidG = new Graphics();
  private liquidT = 0;
  /** 3층: 지도 밖까지 끝없이 흐르는 피의 용암 바다 (바닥 밑에 깐 반복 그림) */
  private sea: TilingSprite | null = null;
  private gfxTop = new Graphics();
  private gfx: { kind: 'slam' | 'mud'; x: number; y: number; t: number }[] = [];
  /** 내가 마을 둘레에서 마지막으로 싸움을 건 때 (경비병 적대는 3초 뒤 풀린다) */
  private guardHostAt = -99;
  /** 경비병이 잡은 괴물 수 (그만큼 바로 다시 채운다) */
  guardKills = 0;
  constructor(private app: Application, readonly zone: Zone, look: Look, private onEnterShop: () => void, private hooks: WorldHooks, hp = PLAYER_MAX_HP, opts: { realm?: Realm; bossDown?: boolean; chaser?: { monster: boolean; hp: number } | null; work?: string } = {}) {
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
    let decProps: Prop[] = [];
    if (!zone.hell && !zone.interior) {
      const dec = decorOf(zone);
      decProps = dec.props;
      for (const p of dec.props) { const key = `${Math.floor(p.i / CHUNK)},${Math.floor(p.j / CHUNK)}`; (this.dIndex.get(key) ?? this.dIndex.set(key, []).get(key)!).push(p); }
      for (const w of dec.wires) { const key = `${Math.floor(w[0] / CHUNK)},${Math.floor(w[1] / CHUNK)}`; (this.wIndex.get(key) ?? this.wIndex.set(key, []).get(key)!).push(w); }
    }
    this.spawnPlayer(look, hp);
    // 19차: 구역 끝 표지 (대로 위에 떠 있는 이웃 구역 이름) — 끝 너머를 누르면 그쪽으로 걸어 나간다
    if (zone.edges && !zone.interior) {
      const L = t();
      for (const [d, id] of [['w', zone.edges.w], ['e', zone.edges.e]] as const) {
        if (!id) continue;
        const tx = new Text({ text: L.edgeTo.replace('{dir}', d === 'w' ? '◀' : '▶').replace('{name}', L.zones[id] ?? id), style: { fontFamily: 'system-ui, sans-serif', fontSize: 14, fontWeight: '800', fill: '#fff6d8', stroke: { color: '#140e0a', width: 4, join: 'round' } } });
        tx.anchor.set(d === 'w' ? 0 : 1, 1);
        const [x, y] = iso(d === 'w' ? zone.edges.i0 + 0.5 : zone.edges.i1 - 0.5, zone.edges.c + 0.5);
        tx.position.set(Math.round(x), Math.round(y) - 70);
        tx.zIndex = 1e7;
        tx.alpha = 0.92;
        this.objects.addChild(tx);
      }
    }
    if (this.zone.hell) this.setupHell();
    else if (this.zone.interior) { this.setupInterior(opts.chaser ?? null); if (this.zone.interior?.kind === 'shore') this.setupShore(); if (opts.work) { const ob = this.zone.interior!.from; this.workIn = { name: opts.work, earned: 0, wait: 0.8, job: ob.b >= 0 && ob.bd ? this.jobOf(ob.bd) : { mult: 1, drain: 0.15, hard: 0 } }; } if (this.realm === 'heaven') this.setupHeavenSky(true); }
    else if (this.realm === 'heaven') this.setupHeaven();
    else {
      this.setupCityHaze();
      for (let n = 0; n < PED_COUNT; n++) this.spawnNpc('passer');
      // 21차: 거리의 적은 구역 위험도대로 뽑는다 (rollThug). 수는 그대로(14)
      for (let n = 0; n < (this.realm === 'real' ? THUG_COUNT + DRUNK_COUNT + ROBBER_COUNT + MAFIA_COUNT : THUG_COUNT); n++) this.spawnNpc('thug');
      if (this.realm === 'real') { this.setupStreetLife(decProps); for (let n = 0; n < 6; n++) this.spawnNpc('passer'); } // 19차: 사람이 더 북적이게
      if (this.realm === 'real' && Math.random() < 0.7) this.spawnGoat(); // 24차: 떠도는 염소 (구역마다 있을 수도, 없을 수도)
      if (this.realm === 'real' && this.zone.home) this.placeYunae();
    }
    if (this.realm === 'ghost') {
      // 귀신: 세상이 잿빛으로. 돌아다니기만 하고 우주새 말고는 아무것도 만질 수 없다
      const cm = new ColorMatrixFilter();
      cm.desaturate();
      this.camera.filters = [cm];
      this.player.sprite.alpha = 0.6;
    }
    if (this.realm !== 'heaven') this.spawnCars(); // 천국엔 차가 없다
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
      this.touchTap = e.pointerType !== 'mouse';
      this.onTap(e.global.x, e.global.y, e.ctrlKey || e.metaKey || e.shiftKey);
    });
    this.labelText.anchor.set(0.5, 1);
    this.label.addChild(this.labelBg, this.labelText);
    this.label.visible = false;
    this.label.alpha = 0.92; // 칸이 없으니 글자는 또렷하게
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
      if (this.heavenOut(p.i, p.j)) continue;
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
    if (!this.zone.interior) this.placeLandmarks();
  }

  /** 21차: 소이 번호 간판 · BTS 역사 · 구역 명소 (전체 지도 좌표 → 이 구역) */
  private landmarkSpots: { i: number; j: number; r: number; name: string; sub: string; t: number }[] = [];
  private stations: { parts: Sprite[]; i0: number; i1: number; j0: number; j1: number }[] = [];
  private underStation = -1;
  private placeLandmarks() {
    const z = this.zone;
    const o = z.origin ?? { i: 0, j: 0 };
    const e = z.edges;
    const inZone = (i: number, j: number) => i >= 0 && j >= 0 && i < z.W && j < z.H && (!e || (i >= e.i0 - 1 && i < e.i1 + 1)) && !this.heavenOut(i, j);
    const L = t();
    const put = (pic: Pic, i: number, j: number, k = 0.5, bias = 0.9) => {
      const tx = Texture.from(pic.canvas);
      const s = new Sprite(tx);
      s.anchor.set(pic.ax, pic.ay);
      s.scale.set(k);
      const [x, y] = iso(i + 0.5, j + 0.5);
      s.position.set(Math.round(x), Math.round(y));
      s.zIndex = i + j + bias;
      this.objects.addChild(s);
      const w = s.width, h = s.height, x0 = x - w * pic.ax, y0 = y - h * pic.ay;
      this.cullAdd(s, x0, y0, x0 + w, y0 + h);
      this.addTall(s, x0, y0, x0 + w, y0 + h);
      return s;
    };
    const glowAt = (i: number, j: number, dx: number, dy: number, tint: number, k = 0.8) => {
      const gl = new Sprite(this.glowTex());
      gl.anchor.set(0.5);
      gl.scale.set(k);
      gl.tint = tint;
      const [x, y] = iso(i + 0.5, j + 0.5);
      gl.position.set(x + dx, y + dy);
      gl.blendMode = 'add';
      this.lights.addChild(gl);
      this.glows.push({ s: gl, i, j });
    };
    // 소이 번호 간판
    for (const [n, , gi, gj] of SOI_SIGNS) {
      const i = gi - o.i, j = gj - o.j;
      if (!inZone(i, j)) continue;
      put(soiSignCanvas(n), i, j);
      this.landmarkSpots.push({ i, j, r: 1.6, name: n === 'R' ? L.soiRoadName : L.soiName.replace('{n}', n), sub: SOI_ALIAS[n] ? SOI_ALIAS[n][1] : '', t: 0 });
    }
    // BTS 역사: 선로 기둥 줄 위, 대로 북·남 보도까지 계단
    const MAIN = ['road', 'median', 'cross'];
    for (const st of BTS_STATIONS) {
      const ci = st.i - o.i;
      if (ci < -st.len / 2 || ci > z.W + st.len / 2) continue;
      const pil = z.props.filter((p) => p.kind === 'pillar').sort((a, b) => Math.abs(a.i - ci) - Math.abs(b.i - ci))[0];
      if (!pil || Math.abs(pil.i - ci) > 12) continue;
      const jc = pil.j;
      const reach = (dir: 1 | -1) => { let j = jc; while (MAIN.includes(tileAt(z, Math.round(ci), j + dir)) && Math.abs(j - jc) < 30) j += dir; return Math.abs(j - jc) + 1.5; };
      const d = stationCanvas(st, reach(-1), reach(1), false);
      const [bx, by] = iso(ci, jc);
      const parts = this.strips(tex(d.canvas), Math.round(bx + d.x), Math.round(by + d.y), Math.floor(ci + d.i0), Math.floor(jc + d.j0), d.w, d.d, 0.3);
      for (const s of parts) this.cullAdd(s, s.x, s.y, s.x + s.width, s.y + s.height);
      this.stations.push({ parts, i0: ci - st.len / 2, i1: ci + st.len / 2, j0: jc - 7, j1: jc + 7 }); // 밑에 들어가면 역 전체가 함께 옅어진다
      for (const f of [-0.3, 0, 0.3]) glowAt(Math.round(ci + f * st.len), jc + 6, 0, -124, 0xffe2a0, 0.9);
      const nm = L.btsName.replace('{name}', L.btsNames[st.key as keyof typeof L.btsNames] ?? st.en);
      this.landmarkSpots.push({ i: ci, j: jc, r: st.len / 2 + 2, name: nm, sub: L.btsSubEn ? st.en : st.th, t: 0 });
    }
    // 구역 명소
    for (const lm of LANDMARKS) {
      const i = lm.i - o.i, j = lm.j - o.j;
      if (!inZone(i, j)) continue;
      let pic: Pic;
      if (lm.kind === 'neonGate') { pic = neonGateCanvas(lm.text!, lm.sub!, true, lm.key === 'cowboy' ? 'pink' : 'blue'); glowAt(i, j, 0, -50, lm.key === 'cowboy' ? 0xff5ab0 : 0x5ad0ff, 1.3); }
      else if (lm.kind === 'billboard') { pic = billboardCanvas(lm.text!, lm.sub!, lm.key === 't21' ? 't21' : 'emporium', false); glowAt(i, j, 0, -64, lm.key === 't21' ? 0xbfe0ff : 0xffd77a, 0.9); }
      else if (lm.kind === 'helix') { pic = helixCanvas(false); glowAt(i, j, 0, -90, 0xffe7a8, 1.2); }
      else if (lm.kind === 'fountain') pic = fountainCanvas();
      else pic = parkSignCanvas(lm.text!, lm.sub!);
      put(pic, i, j, 0.5, lm.kind === 'fountain' ? 0.2 : 0.9);
      const nm = L.landmarks[lm.key as keyof typeof L.landmarks];
      if (nm) this.landmarkSpots.push({ i, j, r: lm.kind === 'fountain' ? 7 : 3, name: nm[0], sub: nm[1], t: 0 });
    }
  }
  /** 명소 가까이 가면 이름을 한 번 띄운다 (같은 곳은 1분에 한 번) */
  private lmT = 0;
  private updateLandmarks(dt: number) {
    if (this.stations.length) {
      const p = this.player;
      const k = this.stations.findIndex((s) => p.x >= s.i0 && p.x <= s.i1 && p.y >= s.j0 && p.y <= s.j1);
      if (k !== this.underStation) {
        for (const [n, s] of this.stations.entries()) for (const sp of s.parts) if (!sp.destroyed) sp.alpha = n === k ? 0.38 : 1;
        this.underStation = k;
      }
    }
    if ((this.lmT -= dt) > 0 || !this.landmarkSpots.length) return;
    this.lmT = 0.4;
    const p = this.player;
    for (const s of this.landmarkSpots) {
      if (s.t > 0) { s.t -= 0.4; continue; }
      if (Math.abs(p.x - s.i - 0.5) < s.r && Math.abs(p.y - s.j - 0.5) < s.r + 1) { s.t = 60; this.hooks.place(s.name, s.sub); break; }
    }
  }

  /** 지옥: 마른 나무 · 화로(늘 타는 불빛) · 부러진 돌기둥 · 경계 · 뼈와 고문 장면 · 층마다 다른 마을 울타리 */
  private placeHellProps() {
    const theme = floorDef(this.zone.hell!.floor).theme;
    const texOf = new Map<HTMLCanvasElement, Texture>();
    const fine = Math.min(2, window.devicePixelRatio || 1) >= 2 ? 'nearest' : 'linear';
    for (const p of this.zone.props) {
      const v = (p.i * 7 + p.j * 3) % 4;
      if (p.kind === 'torture') { this.addTorture(p.i, p.j, p.o ?? 0); continue; }
      const decor = p.kind === 'fence' || p.kind === 'crag' || p.kind === 'htree' || p.kind === 'rock' || p.kind === 'crack' || p.kind === 'dicetable' || p.kind === 'campfire' || p.kind === 'bones' || p.kind === 'skulls' || p.kind === 'stake' || p.kind === 'cauldron' || p.kind === 'cage' || p.kind === 'bonfire' || p.kind === 'junk' || p.kind === 'reeds' || p.kind === 'mattress' || (p.kind === 'lantern' && theme !== 'ash');
      if (decor) {
        // 같은 그림이 되풀이되지 않게: 나무·바위·땅 자국은 24가지, 해골 더미·꼬챙이·철창·가마솥·뼈는 12가지
        const vv = Math.floor(((p.i * 73856093) ^ (p.j * 19349663)) >>> 0) % (p.kind === 'crag' ? 8 : p.kind === 'htree' || p.kind === 'rock' || p.kind === 'crack' ? 24 : p.kind === 'fence' ? 6 : 12);
        const hp = hellDecor(p.kind === 'fence' ? 'wallfence' : p.kind, theme, vv, p.o ?? 0);
        let tx = texOf.get(hp.canvas);
        if (!tx) { tx = Texture.from(hp.canvas); tx.source.scaleMode = fine; texOf.set(hp.canvas, tx); }
        const s = new Sprite(tx);
        const [x, y] = iso(p.i + 0.5, p.j + 0.5);
        s.anchor.set(hp.ax, hp.ay);
        s.scale.set(0.5);
        s.position.set(x, y);
        s.zIndex = hp.flat ? p.i + p.j - 0.45 : p.i + p.j + 0.99;
        this.objects.addChild(s);
        this.cullAdd(s, x - s.width * hp.ax, y - s.height * hp.ay, x + s.width * (1 - hp.ax), y + s.height * (1 - hp.ay));
        if (!hp.flat && p.kind !== 'fence' && p.kind !== 'lantern') {
          const w = s.width, h = s.height, x0 = x - w * hp.ax, y0 = y - h * hp.ay;
          this.addTall(s, x0, y0, x0 + w, y0 + h);
        }
        if (hp.glow) {
          const glow = new Sprite(this.glowTex());
          glow.anchor.set(0.5);
          glow.scale.set(p.kind === 'bonfire' ? 1.3 : p.kind === 'crag' ? 0.6 : p.kind === 'htree' ? 0.45 : 0.7);
          glow.tint = hp.glowTint ?? 0xff7a32;
          glow.position.set(x + hp.glow[0], y + hp.glow[1]);
          glow.blendMode = 'add';
          this.lights.addChild(glow);
          this.glows.push({ s: glow, i: p.i, j: p.j });
          this.cullAdd(glow, glow.x - glow.width / 2, glow.y - glow.height / 2, glow.x + glow.width / 2, glow.y + glow.height / 2);
        }
        continue;
      }
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
        this.cullAdd(fs, fx - fs.width, fy - fs.height, fx + fs.width, fy + fs.height);
        continue;
      }
      const own = p.kind === 'tree' || p.kind === 'lamp' || p.kind === 'pillar' || p.kind === 'lantern';
      const pt = own ? null : propSprite(p.kind as 'cart', v % 3);
      if (!own && !pt) continue;
      const hp = own ? hellProp(p.kind === 'lantern' ? 'lamp' : p.kind, theme, v) : { canvas: null, ax: pt!.ax, ay: pt!.ay, glow: undefined as [number, number] | undefined };
      let tex: Texture;
      if (hp.canvas) { tex = Texture.from(hp.canvas); tex.source.scaleMode = 'nearest'; } else tex = pt!.tex;
      const s = new Sprite(tex);
      const [x, y] = iso(p.i + 0.5, p.j + 0.5);
      s.anchor.set(hp.ax, hp.ay);
      s.position.set(x, y);
      s.zIndex = p.i + p.j + 0.99;
      this.objects.addChild(s);
      this.cullAdd(s, x - s.width * hp.ax, y - s.height * hp.ay, x + s.width * (1 - hp.ax), y + s.height * (1 - hp.ay));
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

  /** margin = false 면 화면에 실제로 보이는 칸만 */
  private visibleRange(margin = true) {
    const sw = this.app.screen.width, sh = this.app.screen.height;
    const pts = [[0, 0], [sw, 0], [0, sh], [sw, sh]].map(([sx, sy]) => {
      const wx = sx - this.camera.x, wy = sy - this.camera.y;
      return [(wx / (TW / 2) + wy / (TH / 2)) / 2, (wy / (TH / 2) - wx / (TW / 2)) / 2];
    });
    const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]);
    const a = margin ? 4 : 0, b = margin ? 16 : 2;
    return { i0: Math.min(...xs) - a, i1: Math.max(...xs) + b, j0: Math.min(...ys) - a, j1: Math.max(...ys) + b };
  }

  private stream(all: boolean) {
    if (this.zone.interior) return; // 방은 처음에 한 장으로 다 그린다
    const r = this.visibleRange();
    const c0 = Math.floor(Math.max(0, r.i0) / CHUNK), c1 = Math.floor(Math.min(this.zone.W - 1, r.i1) / CHUNK);
    const d0 = Math.floor(Math.max(0, r.j0) / CHUNK), d1 = Math.floor(Math.min(this.zone.H - 1, r.j1) / CHUNK);
    const want = new Set<string>();
    const missing: { key: string; ci: number; cj: number; d: number }[] = [];
    const sr = this.visibleRange(false);
    const cx = (sr.i0 + sr.i1) / 2, cy = (sr.j0 + sr.j1) / 2;
    let pick: { key: string; ci: number; cj: number; d: number; vis: boolean } | null = null;
    for (let cj = d0; cj <= d1; cj++)
      for (let ci = c0; ci <= c1; ci++) {
        const key = `${ci},${cj}`;
        want.add(key);
        if (!this.chunks.has(key) && this.zone.hell && !all) {
          // 지옥 바닥은 점마다 계산해 무겁다: 한 덩어리씩, 프레임마다 몇 ms씩 나눠 그린다 (멈칫거림 없이)
          // 화면 가운데에 가까운 덩어리부터. 화면 안에 비어 보이는 덩어리는 더 빨리(프레임당 14ms)
          if (!this.gjob) {
            const d = Math.hypot((ci + 0.5) * CHUNK - cx, (cj + 0.5) * CHUNK - cy);
            if (!pick || d < pick.d) pick = { key, ci, cj, d, vis: ci * CHUNK < sr.i1 && (ci + 1) * CHUNK > sr.i0 && cj * CHUNK < sr.j1 && (cj + 1) * CHUNK > sr.j0 };
          }
          continue;
        }
        if (!this.chunks.has(key)) missing.push({ key, ci, cj, d: Math.hypot((ci + 0.5) * CHUNK - cx, (cj + 0.5) * CHUNK - cy) });
      }
    // 22차: 한 프레임에 몰아 그리지 않는다 — 화면 가운데에 가까운 덩어리부터, 프레임당 약 5ms 안에서 (그래도 한 프레임에 하나는)
    const t0 = performance.now();
    const spent = () => performance.now() - t0;
    missing.sort((a, b) => a.d - b.d);
    let made = 0;
    for (const { key, ci, cj } of missing) {
        if (!all && made > 0 && spent() > 5) break;
        {
          made++;
          const ch = perf('chunk', () => this.zone.hell ? drawHellGround(this.zone, floorDef(this.zone.hell.floor).theme, ci * CHUNK, cj * CHUNK) : kitOk ? drawGroundKit(this.zone, ci * CHUNK, cj * CHUNK, this.realm === 'heaven' ? this.zone.edges : undefined, this.realm === 'heaven') : drawGroundChunk(this.zone, ci * CHUNK, cj * CHUNK));
          const s = new Sprite(ch ? tex(ch.canvas) : Texture.EMPTY);
          if (ch) s.position.set(ch.x, ch.y);
          this.ground.addChild(s);
          this.chunks.set(key, s);
        }
    }
    if (pick && !this.gjob) this.gjob = { key: pick.key, vis: pick.vis, job: hellGroundJob(this.zone, floorDef(this.zone.hell!.floor).theme, pick.ci * CHUNK, pick.cj * CHUNK) };
    if (this.gjob && !want.has(this.gjob.key)) this.gjob = null;
    for (const [key, s] of this.chunks) if (!want.has(key)) { s.destroy({ texture: s.texture !== Texture.EMPTY, textureSource: s.texture !== Texture.EMPTY }); this.chunks.delete(key); }
    for (const key of want) if (!this.dViews.has(key) && (this.dIndex.has(key) || this.wIndex.has(key))) this.dViews.set(key, perf('decor', () => this.makeDecor(key)));
    for (const [key, v] of this.dViews) if (!want.has(key)) { for (const s of v.sprites) s.destroy(); v.wires?.destroy(); this.dViews.delete(key); }
    const wantB = new Set<number>();
    const missB: { k: number; d: number }[] = [];
    for (let cj = d0 - 1; cj <= d1; cj++)
      for (let ci = c0 - 1; ci <= c1; ci++)
        for (const k of this.bIndex.get(`${ci},${cj}`) ?? []) {
          wantB.add(k);
          if (!this.bViews.has(k)) { const bb = this.zone.buildings[k]; if (this.heavenOut(bb.i0, bb.j0, bb.w, bb.d)) continue; missB.push({ k, d: Math.hypot(bb.i0 + bb.w / 2 - cx, bb.j0 + bb.d / 2 - cy) }); }
        }
    // 건물도 가까운 것부터, 남은 시간 안에서 (땅을 하나도 안 그린 프레임엔 적어도 하나)
    missB.sort((a, b) => a.d - b.d);
    let madeB = 0;
    for (const { k } of missB) {
      if (!all && (made + madeB > 0) && spent() > 6) break;
      madeB++;
      this.bViews.set(k, perf('building', () => this.makeBuilding(this.zone.buildings[k])));
    }
    this.streamMore = missing.length > made || missB.length > madeB;
    for (const [k, v] of this.bViews) if (!wantB.has(k)) { this.dropBuilding(v); this.bViews.delete(k); }
  }

  private propTex = new Map<PropPic, Texture>();
  private makeDecor(key: string) {
    const sprites: Sprite[] = [];
    for (const p of this.dIndex.get(key) ?? []) {
      if (this.heavenOut(p.i, p.j)) continue;
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
    const L = t();
    if (b.hk === 'idol') { const f = this.zone.hell?.floor ?? 1; return f === 1 ? L.idolAsh : f === 2 ? L.idolMaw : L.idolScale; }
    return b.cat === 'ujusae' ? '' : b.cat === 'loan' ? L.beskHouse : b.cat === 'hbank' ? L.hbankName : b.cat === 'atone' ? L.atoneName : b.cat === 'rebirth' ? L.rebirthName : buildingName(b, lang());
  }
  /** 건물 이름 아래 한 줄 */
  private subOf(b: Building) {
    const L = t();
    if (b.hk === 'idol') { const f = this.zone.hell?.floor ?? 1; return f === 1 ? L.idolAshSub : f === 2 ? L.idolMawSub : L.idolScaleSub; }
    return b.cat === 'loan' ? L.beskHouseSub : b.cat === 'hbank' ? L.hbankSub : b.cat === 'atone' ? L.atoneSub : b.cat === 'rebirth' ? L.rebirthSub : buildingSub(b, lang());
  }

  /**
   * 건물을 세로 띠(32px)로 잘라 띠마다 앞뒤 순서를 따로 준다.
   * 건물 한 장에 순서 하나만 주면 넓은 건물 뒤를 걷는 사람이 지붕 위에 그려진다
   */
  /** 그림 한 장을 세로 띠로 잘라 띠마다 앞뒤 순서를 준다 (바닥 사각형 i0·j0·w·d 기준) */
  private strips(base: Texture, dx: number, dy: number, i0: number, j0: number, bw: number, bd: number, bias = -0.2, k = 1): Sprite[] {
    const i1 = i0 + bw, j1 = j0 + bd;
    const cornerX = (i1 - j1) * (TW / 2);
    const key = (sx: number) => (sx < cornerX ? 2 * j1 + sx / (TW / 2) : 2 * i1 - sx / (TW / 2));
    const parts: Sprite[] = [];
    // k = 그림 밀도 (2 = 관리자가 올린 2배 그림: 띠도 두 배로 잘라 반으로 줄여 놓는다)
    const W = base.source.width, H = base.source.height, SW = 32 * k;
    for (let cx = 0; cx < W; cx += SW) {
      const w = Math.min(SW, W - cx);
      const s = new Sprite(new Texture({ source: base.source, frame: new Rectangle(cx, 0, w, H) }));
      s.position.set(dx + cx / k, dy);
      if (k !== 1) s.scale.set(1 / k);
      const a = dx + cx / k, z = dx + (cx + w) / k;
      s.zIndex = Math.min(key(a), key(z), a < cornerX && z > cornerX ? key(cornerX) : 1e9) + bias;
      this.objects.addChild(s);
      parts.push(s);
    }
    return parts;
  }

  private makeBuilding(b: Building): BView {
    if (!bldArtLoad && (b.cat === 'ujusae' || b.cat === 'loan')) loadBuildingArt().then((any) => { if (any && !this.root.destroyed) this.clearBuildings(); }); // 바꾼 건물 그림이 오면 다시 세운다
    const hellTheme = this.zone.hell ? floorDef(this.zone.hell.floor).theme : null;
    const hf = this.zone.hell?.floor ?? 0;
    // 24차 서울 달동네: 낮은 벽돌집과 내 집은 따로 그린다
    const dal = this.zone.city === 'seoul' && (b.hut || b.cat === 'home');
    let d = dal ? drawDalHouse(b, this.night === 1, b.cat === 'home') : b.cat === 'ujusae' ? (hf ? drawYuhwang(b, hf) : this.realm === 'heaven' ? drawCosmicBirdHeaven(b) : drawCosmicBird(b, this.night === 1)) : b.cat === 'hbank' ? drawHellBank(b, hf || 1) : b.cat === 'atone' ? drawAtone(b, hf || 1) : b.cat === 'rebirth' ? drawRebirthGate(b) : b.cat === 'loan' ? drawLoanHouse(b) : hellTheme ? drawHellStructure(b, hellTheme, true) : kitOk ? drawBuildingKit(b, this.nameOf(b), this.night === 1, this.low) : drawBuilding(b, this.nameOf(b), this.night === 1);
    // 17차: 지옥 건물마다 층의 흔적 (1층 화산재 · 2층 이끼와 진흙 · 3층 핏빛과 홍등). 유황새는 따로 그린다, 환생 로비는 홀로 멀쩡하다
    if (hf && b.cat !== 'ujusae' && b.cat !== 'rebirth') d = { ...d, canvas: weatherHell(d.canvas, hf, b.i0 * 31 + b.j0 * 17, { lanterns: !['carcass', 'bonepile', 'guts', 'idol'].includes(b.hk ?? '') }) };
    // 관리자가 갈아 끼운 그림 (같은 크기 또는 2배)
    const art = b.cat === 'ujusae' && hf ? BLD_ART[`bld-hell-${hf}`] : b.cat === 'ujusae' && this.realm === 'heaven' ? BLD_ART['bld-ujusae-heaven'] : b.cat === 'ujusae' ? (this.night === 1 ? BLD_ART['bld-ujusae-night'] ?? BLD_ART['bld-ujusae'] : BLD_ART['bld-ujusae']) : b.cat === 'loan' ? BLD_ART['bld-loan'] : undefined;
    const k = art ? (art.width === d.canvas.width * 2 && art.height === d.canvas.height * 2 ? 2 : art.width === d.canvas.width && art.height === d.canvas.height ? 1 : 0) : 0;
    if (art && k === 2) { const c1 = document.createElement('canvas'); c1.width = d.canvas.width; c1.height = d.canvas.height; const g1 = c1.getContext('2d')!; g1.imageSmoothingEnabled = false; g1.drawImage(art, 0, 0, c1.width, c1.height); d = { ...d, canvas: c1 }; }
    else if (art && k === 1) d = { ...d, canvas: art };
    const base = tex(art && k ? art : d.canvas);
    const W = d.canvas.width, H = d.canvas.height;
    const parts = this.strips(base, d.x, d.y, b.i0, b.j0, b.w, b.d, -0.2, k === 2 ? 2 : 1);
    const top = dal ? 34 + 16 + Math.min(b.w, b.d) * 3 : b.cat === 'ujusae' ? COSMIC_TOP : b.cat === 'loan' ? LOAN_TOP : b.cat === 'hbank' ? b.h + 6 : b.cat === 'atone' ? b.h + 46 : b.cat === 'rebirth' ? b.h + 4 : hellTheme ? b.h : kitOk ? buildingTop(b, this.low) : buildingHeight(b.h);
    const [lx] = iso(b.i0 + b.w / 2, b.j0 + b.d / 2);
    // 22차: 벽이 있는 자리(투명 여백 판정)는 처음 필요할 때 만든다 — 건물을 세울 때마다 픽셀 전체를 읽던 비용을 뺐다
    return { parts, base, x: d.x, y: d.y, w: W, h: H, top, lx, ly: (b.i0 + b.j0) * (TH / 2) - top + 4, cv: d.canvas, b };
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
      if (on && b.cat !== 'ujusae' && b.cat !== 'home' && !b.hut && upperFloors(b) > 0) {
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
  /** 고유 인물에 관리자 도트를 입힌다 (없으면 구운 그림 그대로) */
  private dotArt(w: Walker, slot: PortraitSlot) {
    void npcArt(slot).then((tx) => { if (tx && !w.sprite.destroyed) w.art = tx; });
  }
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

  /**
   * 22차: 거리 사람 모습은 종류마다 몇 벌만 돌려 입힌다 (사람이 바뀔 때마다 새 그림을 합치던 것이 이동 중 끊김의 큰 원인).
   * 같은 모습이면 이미 합쳐 둔 그림을 그대로 쓴다. 지옥 괴물·특별한 인물은 따로
   */
  private npcLook(kind: NpcKind, weak?: Walker['weak'], gang?: Walker['gang']): Look {
    const key = `${this.realm}|${this.zone.hell ? 'h' : ''}|${kind}|${weak ?? ''}|${gang ?? ''}`;
    const cap = kind === 'passer' ? 12 : kind === 'thug' ? 4 : 5;
    let pool = LOOK_POOL.get(key);
    if (!pool) LOOK_POOL.set(key, (pool = []));
    if (pool.length >= cap) return pool[Math.floor(Math.random() * pool.length)];
    const l = this.npcLookNew(kind, weak, gang);
    pool.push(l);
    return l;
  }
  private npcLookNew(kind: NpcKind, weak?: Walker['weak'], gang?: Walker['gang']): Look {
    const r = (n: number) => Math.floor(Math.random() * n);
    const pick = <T,>(a: T[]) => a[r(a.length)];
    // 취객: 풀어헤친 차림, 술기운에 붉은 얼굴
    if (weak === 'drunk') return { sex: Math.random() < 0.8 ? 'm' : 'f', build: r(3), skin: r(3), hair: pick([0, 1, 5]), hairColor: r(2), top: r(4), bottom: r(3), cols: { 1: pick(['#d69a80', '#c48266', '#a8684e']) } };
    // 그림자: 사람 모양의 짙은 미련 (눈만 희게 빛난다)
    if (weak === 'shade') return { sex: Math.random() < 0.5 ? 'm' : 'f', build: r(3), skin: 0, hair: r(6), hairColor: 0, top: 0, bottom: 0, cols: { 1: '#2a2836', 2: '#16141e', 3: '#1e1c28', 4: '#18161f', 5: '#0e0c14', 6: '#f0f4ff', 9: '#1e1c28', 10: '#2a2836' } };
    if (this.realm === 'heaven') {
      // 천국의 영혼: 흰빛·연한 빛깔 옷. 천사는 흰 겉옷과 금빛 머리
      if (kind !== 'angel' && Math.random() < 0.25) return this.swimLook(Math.random() < 0.5 ? 'f' : 'm'); // 21차: 천국은 늘 여름 — 수영복 차림
      if (kind === 'angel') return { sex: Math.random() < 0.5 ? 'f' : 'm', build: 1, skin: r(3), hair: pick([3, 4, 1]), hairColor: 0, top: 0, bottom: 0, outfit: 'raincoat', cols: { 2: pick(['#e8c870', '#f2e6c8', '#d8b060']), 8: '#f8f4ea', 3: '#f8f4ea', 4: '#efe8d8', 5: '#d8ccb0' } };
      return { sex: Math.random() < 0.5 ? 'f' : 'm', build: r(3), skin: r(3), hair: r(6), hairColor: r(3), top: 0, bottom: 0, cols: { 3: pick(['#f4f0e6', '#eae4f2', '#e6f0ea', '#f2ead8']), 4: pick(['#e8e2d4', '#dcd6c8', '#ece6da']), 5: '#c8bca8' } };
    }

    // 강도: 검은·짙은 후드에 눈만 뚫린 복면, 카고 바지, 등에 더플백 (여자 강도도 같은 차림)
    if (gang === 'robber') return { sex: Math.random() < 0.7 ? 'm' : 'f', build: 1, skin: r(3), hair: 0, hairColor: 0, top: 0, bottom: 0, outfit: 'robber', cols: { 3: pick(['#24262c', '#2e3238', '#3a2e2a', '#28302a']), 8: '#121214', 4: pick(['#3a3a30', '#2a2c30', '#4a4232']), 5: '#1a1816', 7: pick(['#2a2a2e', '#3a4a5a', '#5a2a22']), 15: '#141414' } };
    // 마피아: 짙은 정장·흰 셔츠·붉은 넥타이·금붙이·선글라스, 단정히 빗어 넘긴 머리 (여자 마피아도 정장)
    if (gang === 'mafia') return { sex: Math.random() < 0.65 ? 'm' : 'f', build: 1, skin: r(3), hair: Math.random() < 0.5 ? 0 : 3, hairColor: 0, top: 0, bottom: 0, outfit: 'mafia', cols: { 3: pick(['#16181c', '#1e1a24', '#2a2a2e', '#f0ece4']), 4: '#14161a', 5: '#0e0c0c', 10: '#f2f0ea', 12: pick(['#a8202a', '#7a1a1a', '#c9a23e']), 14: '#d9b44a', 15: '#08080a' } };
    if (kind === 'thug') return { sex: Math.random() < 0.85 ? 'm' : 'f', build: 1 + r(2), skin: r(3), hair: [0, 5, 1][r(3)], hairColor: r(2), top: 4, bottom: 3 };
    // 19차: 수쿰빗 거리는 여자가 훨씬 많다
    return { sex: Math.random() < (this.realm === 'real' ? 0.68 : 0.5) ? 'f' : 'm', build: r(3), skin: r(3), hair: r(6), hairColor: r(3), top: r(4), bottom: r(3) };
  }
  /** 19차 외국인 관광객: 피부·머리색이 다른 세 무리, 반바지·민소매처럼 가벼운 차림 */
  private touristLook(tour: 'w' | 'b' | 'a'): Look {
    const r = (n: number) => Math.floor(Math.random() * n);
    const pick = <T,>(a: T[]) => a[r(a.length)];
    const skin = tour === 'w' ? pick(['#f2d2bc', '#ecc4aa', '#f6dccb', '#e6b89c']) : tour === 'b' ? pick(['#6a4430', '#5a3826', '#4a2c1e', '#7a5038']) : pick(['#f0d2b2', '#e8c6a2', '#f2d8bc']);
    const hair = tour === 'w' ? pick(['#d8b862', '#c89a52', '#8a6a44', '#a8522e', '#4a3424', '#e8d8a8']) : tour === 'b' ? pick(['#141010', '#1e1612', '#2a1e16']) : pick(['#16120f', '#241a14', '#5a3a26']);
    const top = pick(['#f2f2ee', '#3a7ac0', '#e86a4a', '#2a2a2e', '#f2d24a', '#6ab07a', '#e8a8c0', '#ffffff']);
    const bottom = pick(['#c8b48a', '#3a4a6a', '#e8e2d4', '#2a2a2a', '#6a7a4a']);
    return { sex: Math.random() < 0.55 ? 'f' : 'm', build: r(3), skin: 0, hair: r(6), hairColor: 0, top: r(4), bottom: r(3), cols: { 1: skin, 10: skin, 2: hair, 3: top, 9: top, 4: bottom } };
  }
  /** 19차 거리 장사꾼·호객원 차림: 노점 = 앞치마, 마사지 = 같은 빛깔 유니폼, 바 = 짧고 화려한 옷 */
  private streetLook(kind: 'street' | 'massage' | 'bar'): Look {
    const r = (n: number) => Math.floor(Math.random() * n);
    const pick = <T,>(a: T[]) => a[r(a.length)];
    if (kind === 'street') return { sex: Math.random() < 0.6 ? 'f' : 'm', build: 1 + r(2), skin: r(3), hair: pick([0, 1, 2, 5]), hairColor: 0, top: 0, bottom: 0, cols: { 3: pick(['#e8e4d8', '#c84a3a', '#3a6a9a']), 9: '#f2efe6', 4: '#2a2a2e' } };
    if (kind === 'massage') { const u = pick(['#7a3a6a', '#3a7a6a', '#c8862a', '#8a2a3a', '#2a5a8a']); return { sex: 'f', build: 0, skin: r(3), hair: pick([2, 3, 4]), hairColor: 0, top: 0, bottom: 0, cols: { 3: u, 9: u, 4: u } }; }
    return { sex: 'f', build: 0, skin: r(3), hair: pick([2, 3, 4]), hairColor: r(2), top: 0, bottom: 0, cols: { 3: pick(['#e83a6a', '#f2f2f2', '#2a2a2e', '#c8a23e', '#e8487a']), 9: '#f2dcc8', 4: pick(['#141414', '#e83a6a', '#f2f2f2']) } };
  }
  /** 19차 거리의 삶: 손수레 노점 옆 장사꾼, 마사지 가게·바 앞 호객원 (현실 구역에만) */
  private setupStreetLife(props: Prop[]) {
    const lim = this.zone.edges;
    const inside = (i: number, j: number) => !lim || (i >= lim.i0 && i < lim.i1 && j >= lim.j0 && j < lim.j1);
    let nv = 0;
    for (const pr of props) {
      if (pr.kind !== 'pushcart' || nv >= 16 || !inside(pr.i, pr.j)) continue;
      const spot = ([[0, -1], [1, 0], [-1, 0], [0, 1]] as const).map(([a, b]) => [pr.i + a, pr.j + b] as [number, number]).find(([a, b]) => walkable(this.zone, a, b));
      if (!spot) continue;
      const v = this.makeWalker(this.streetLook('street'), spot[0], spot[1], 'vendor');
      v.vend = 'street'; v.speed = 0; v.wait = 1e9; v.dir = dirFromTile(pr.i - spot[0], pr.j - spot[1], 'sw');
      this.walkers.push(v);
      nv++;
    }
    let np = 0;
    for (let k = 0; k < this.zone.buildings.length && np < 30; k++) {
      const b = this.zone.buildings[k];
      if (!b.sign || !mainPoi(b)) continue;
      const kd = bKindOf(b);
      const massage = kd === 'massage', bar = ['bar', 'pub', 'nightclub'].includes(kd);
      if (!massage && !bar) continue;
      const f = this.frontOf(b);
      if (!f || !inside(f[0], f[1])) continue;
      // 문 바로 앞은 비워 두고 한 칸 옆에 선다
      const spot = ([[1, 0], [-1, 0], [0, 1], [1, 1]] as const).map(([a, c]) => [f[0] + a, f[1] + c] as [number, number]).find(([a, c]) => walkable(this.zone, a, c)) ?? f;
      for (let n = 0; n < (massage && Math.random() < 0.4 ? 2 : 1); n++) {
        const s2 = n ? ([[2, 0], [-1, 1], [0, 2]] as const).map(([a, c]) => [f[0] + a, f[1] + c] as [number, number]).find(([a, c]) => walkable(this.zone, a, c)) : spot;
        if (!s2) continue;
        const pw = this.makeWalker(this.streetLook(massage ? 'massage' : 'bar'), s2[0], s2[1], 'vendor');
        pw.vend = massage ? 'massage' : 'bar'; pw.shopK = k; pw.speed = 0; pw.wait = 1e9; pw.dir = 'se';
        this.walkers.push(pw);
        np++;
      }
    }
  }

  /** 관리자 캐릭터의 투명 모드: 몹이 알아보지 못하고, 다른 사람에게 보이지 않는다 (나에게는 반투명) */
  private invisible = false;
  setInvisible(on: boolean) {
    this.invisible = on;
    this.player.sprite.alpha = on ? 0.35 : this.realm === 'ghost' ? 0.6 : 1;
    if (on) for (const w of this.walkers) { if (w.target === this.player) { w.target = null; w.path = []; } w.stalk = 0; }
  }

  /** 잡기 쉬운 적: 체력·속도·피해를 낮춘다 (취객은 비틀, 그림자는 반투명) */
  private makeWeak(w: Walker, weak: Walker['weak']) {
    w.weak = weak;
    if (!weak) { w.sprite.alpha = 1; if (w.kind === 'thug') w.speed = 0.9; return; }
    w.maxHp = w.hp = weak === 'drunk' ? 70 : 50;
    w.speed = weak === 'drunk' ? 0.55 : 0.7;
    w.sprite.alpha = weak === 'shade' ? 0.78 : 1;
  }

  /** 강도·마피아: 불량배보다 질기고 빠르다. 불량배는 취객 다음으로 약한 적 (체력 150) */
  private makeGang(w: Walker, gang: Walker['gang']) {
    w.gang = gang;
    if (w.kind !== 'thug' || w.weak) return;
    w.maxHp = w.hp = gang === 'mafia' ? 520 : gang === 'robber' ? 320 : 150;
  }
  /**
   * 21차 거리의 위험도: 우주새가 있는 아속(시작)은 취객·불량배뿐 — 우주새 문에서 멀어질수록 강도가 가끔 섞인다.
   * 소이 8–17·소이 20–33은 강도 구역, 나나·프롬퐁은 마피아 구역. 먼 곳일수록 서로 섞인다
   */
  private rollThug(spot: [number, number]): { weak?: Walker['weak']; gang?: Walker['gang'] } {
    const o = this.zone.origin ?? { i: 533, j: 512 };
    const d = Math.hypot(spot[0] + o.i - 533, spot[1] + o.j - 512); // 우주새 문까지 (전체 지도 칸, 1칸 = 3 m)
    const r = Math.random();
    // 23차: 끝 구역(나나 · 프롬퐁)은 마피아만 — 무리 지어 덤빈다
    if (this.gangZone()) return { gang: 'mafia' };
    if (this.zone.shop === false) {
      // 사이 구역(소이 8–17 · 소이 20–33): 우주새 쪽 가장자리는 불량배·강도, 끝 구역 쪽으로 갈수록 강도와 마피아
      const m = Math.max(0, Math.min(1, (d - 90) / 200));
      if (r < 0.08 * (1 - m)) return { weak: 'drunk' };
      if (r < 0.08 * (1 - m) + 0.32 * (1 - m)) return {};
      if (r < 0.95 - m * 0.4) return { gang: 'robber' };
      return { gang: 'mafia' };
    }
    // 우주새 구역: 취객·불량배 위주, 멀어질수록 강도가 조금
    const mix = Math.max(0, Math.min(1, (d - 60) / 400));
    if (r < 0.55 - mix * 0.15) return { weak: 'drunk' };
    if (r < 1 - mix * 0.22) return {};
    return { gang: 'robber' };
  }
  /** 23차: 마피아만 나오는 끝 구역 (나나 · 프롬퐁) */
  private gangZone() {
    const id = this.zone.id;
    return this.realm === 'real' && !this.zone.interior && (id === 'bkk-nana' || id === 'bkk-phromphong');
  }
  /** 한꺼번에 덤비는 적의 수 — 23차: 둘로 묶는 건 우주새 구역만. 다른 구역은 제한 없음 */
  private attackCap() {
    return this.zone.shop === false ? 99 : 2;
  }
  /** 23차: 끝 구역에서 마피아 하나가 나를 노리면 가까운 마피아가 모두 몰려온다 */
  private rallyMafia(src: Walker) {
    if (!this.gangZone() || src.gang !== 'mafia') return;
    const p = this.player;
    let called = 0;
    for (const w of this.walkers) {
      if (w === src || w.kind !== 'thug' || w.gang !== 'mafia' || w.down > 0 || w.target === p || (w.stalk ?? 0) > 0) continue;
      if (Math.hypot(w.x - src.x, w.y - src.y) > 9) continue;
      w.stalk = 0.01; w.repathT = 0; w.aggroCool = 0;
      w.home = [Math.floor(p.x), Math.floor(p.y)]; // 멀리서 달려와도 포기하지 않게
      if (called++ < 2) this.bubble(w, t().mafiaRally[Math.floor(Math.random() * t().mafiaRally.length)]);
    }
  }
  private attackersOnMe() {
    const p = this.player;
    let n = 0;
    for (const w of this.walkers) if (w.kind === 'thug' && w.down <= 0 && (w.target === p || (w.stalk ?? 0) > 0)) n++;
    return n;
  }

  /** 날개 (천사·황색날개): 등 뒤에 붙고, 위쪽을 볼 때는 앞으로 보인다. 천천히 퍼덕인다 */
  private giveWings(w: Walker, color: number) {
    const s = new Sprite(wingTexture(color));
    s.anchor.set(0.5, 0.62);
    s.scale.set(0.5);
    this.objects.addChild(s);
    w.wings = s;
  }

  /** 천국: 현실과 같은 거리지만 구름 위. 차·불량배 없음. 구원받은 영혼·천사·황색날개·환생관, 그리고 약한 그림자 */
  private setupHeaven() {
    for (let n = 0; n < PED_COUNT; n++) this.spawnNpc('passer');
    for (let n = 0; n < ANGEL_COUNT; n++) this.spawnNpc('angel');
    // 20차: 천국에 그림자는 없다
    const d = this.zone.door;
    // 19차: 환생관 루엔은 거리에 없다 — 구름 계단을 올라간 '환생의 테라스'에 있다 (황색날개와 따로)
    // 26차: 구름 계단은 우주새 곁이 아니라 지도 끝(방콕은 동쪽 끝 프롬퐁의 북동 모서리, 서울은 북쪽 가장자리). 그 너머 구름 위로 아직 갈 수 없는 천국의 탑
    const home = this.zone.shop !== false;
    const ed = this.zone.edges;
    const endZone = ed ? ed.e === null : true;
    void d;
    this.heavenStair = endZone ? this.findEdgeStairSpot() : null;
    if (this.heavenStair) this.addHeavenTower(this.heavenStair);
    if (this.heavenStair) {
      const st = new Sprite(cloudStairTexture());
      st.anchor.set(0.5, 1);
      const [sx, sy] = iso(this.heavenStair.i + 0.5, this.heavenStair.j + 0.5);
      st.position.set(Math.round(sx), Math.round(sy) + 10);
      st.zIndex = this.heavenStair.i + this.heavenStair.j + 0.4;
      st.scale.set(1.45);
      this.objects.addChild(st);
      this.stairBox = [sx - 87, sy + 10 - 275, sx + 87, sy + 10];
      // 21차: 멀리서도 보이게 — 하늘로 솟는 빛기둥과 늘 떠 있는 이름 (누르면 테라스로)
      const beam = new Sprite(this.glowTex());
      beam.anchor.set(0.5, 1);
      beam.scale.set(1.1, 5.5);
      beam.tint = 0xfff0b8;
      beam.alpha = 0.55;
      beam.blendMode = 'add';
      beam.position.set(Math.round(sx), Math.round(sy) - 30);
      beam.zIndex = st.zIndex - 0.01;
      this.objects.addChild(beam);
      const L = t();
      const tag = new Text({ text: `☁ ${L.cloudStair}`, style: { fontFamily: 'system-ui, sans-serif', fontSize: 14, fontWeight: '800', fill: '#fff4c8', stroke: { color: '#5a4418', width: 4, join: 'round' } } });
      tag.anchor.set(0.5, 1);
      tag.position.set(Math.round(sx), Math.round(sy) - 296);
      tag.zIndex = 1e7 - 1;
      this.objects.addChild(tag);
    }
    if (home) {
      // 황색날개: 미스 황과 같은 얼굴, 흰 옷에 금빛 띠, 노란 날개. 우주새 둘레를 거닌다 (처음 온 영혼에게는 안내천사로 따라붙는다)
      this.makeYellowWing(d.i, d.j + 2);
    }
    this.setupHeavenSky(false);
    this.setupHeavenEdge();
    if (home) this.setupPortal();
    this.setupHeavenLife();
  }
  private makeYellowWing(i: number, j: number) {
    const yw = this.makeWalker({ ...MISS_HWANG, cols: { 3: '#f8f4ea', 4: '#f8f4ea', 7: '#e8c23a', 9: '#f8f4ea', 5: '#d8c49a' } }, i, j, 'yellowwing');
    yw.speed = 0.6;
    yw.home = [i, j];
    this.giveWings(yw, 0xf2cf3a);
    this.walkers.push(yw);
    return yw;
  }
  /** 21차: 안내천사 황색날개가 따라다닌다 (처음 온 영혼이 천국에 익숙해질 때까지 — 구역마다 함께, 너무 멀리 달아나면 놓친다) */
  private ywFollow = false;
  setYwFollow(on: boolean) {
    this.ywFollow = on && this.realm === 'heaven' && !this.zone.interior;
    if (!this.ywFollow) return;
    if (!this.walkers.some((w) => w.kind === 'yellowwing')) {
      const s = randomWalkTileNear(this.zone, Math.floor(this.player.x), Math.floor(this.player.y), 3, ['walk', 'lot', 'cross', 'park', 'soi']) ?? [Math.floor(this.player.x), Math.floor(this.player.y)];
      this.makeYellowWing(s[0], s[1]);
    }
  }
  private thinkYellowWing(w: Walker, moving: boolean, dt: number) {
    const p = this.player;
    const d = Math.hypot(p.x - w.x, p.y - w.y);
    w.farT = d > 16 ? (w.farT ?? 0) + dt : 0;
    if (w.farT > 6) {
      // 놓쳤다: 그 자리에 멈춰 숨을 고른다 (다시 말을 걸면 또 따라온다)
      this.ywFollow = false;
      w.farT = 0;
      w.path = [];
      w.home = [Math.floor(w.x), Math.floor(w.y)];
      this.bubble(w, t().ywLostLine);
      this.hooks.ywLost();
      return;
    }
    w.speed = d > 6 ? 2.4 : 1.6;
    w.repathT -= dt;
    if (d > 2.6 && (w.repathT <= 0 || !moving)) {
      w.repathT = 0.6;
      const path = findPath(this.zone, Math.floor(w.x), Math.floor(w.y), Math.floor(p.x), Math.floor(p.y));
      if (path) w.path = path.slice(0, Math.max(1, path.length - 2));
    }
    if (!moving && d < 3) w.dir = dirFromTile(p.x - w.x, p.y - w.y, w.dir);
    if (!w.bubble && Math.random() < dt * 0.035) { const L = t(); this.bubble(w, L.ywGuideLines[Math.floor(Math.random() * L.ywGuideLines.length)]); }
  }
  /** 천국 사람들 차림: 넷에 하나쯤은 수영복 (여자는 원피스 수영복, 남자는 웃통 벗고 반바지) */
  private swimLook(sex: 'm' | 'f'): Look {
    const r = (n: number) => Math.floor(Math.random() * n);
    const pick = <T,>(a: T[]) => a[r(a.length)];
    const skin = pick(['#f2d2bc', '#e8c4a0', '#d8a882', '#a8744e', '#f0d2b2']);
    const sw = pick(['#e83a5a', '#2a8ad8', '#f2c83a', '#1ab0a0', '#f27a3a', '#a85ad8', '#ffffff', '#1e1e22']);
    return sex === 'f'
      ? { sex, build: r(2), skin: 0, hair: r(6), hairColor: r(3), top: 0, bottom: 0, cols: { 1: skin, 3: sw, 4: skin, 5: skin } } // 래시가드 수영복 · 맨다리 · 맨발
      : { sex, build: r(3), skin: 0, hair: r(6), hairColor: r(3), top: 0, bottom: 0, cols: { 1: skin, 3: skin, 4: sw, 5: skin } }; // 웃통 벗고 수영 바지 · 맨발
  }
  /**
   * 21차 천국의 거리: 나를 따라오는 이성(구애하는 이)과 음식을 권하는 요리사, 수영복 차림, 길가 침대에서 자는 사람들,
   * 가게 앞에서 먹을 것을 파는 천사(먹어도 아무 효과 없다), 종교시설 앞에서 행사에 오라고 외치며 행인을 때리는 천사, 도시 끝의 택시 천사
   */
  private setupHeavenLife() {
    const e = this.zone.edges;
    const p = this.player;
    const inside = (i: number, j: number) => !e || (i >= e.i0 && i < e.i1 && j >= e.j0 && j < e.j1);
    const mySex = (p.look?.sex ?? 'm') === 'f' ? 'm' : 'f';
    const folk = (kind: 'admire' | 'chef') => {
      const s = randomWalkTileNear(this.zone, Math.floor(p.x), Math.floor(p.y), 22, ['walk', 'cross', 'park', 'lot']);
      if (!s) return;
      const r = (n: number) => Math.floor(Math.random() * n);
      const look: Look = kind === 'chef'
        ? { sex: Math.random() < 0.5 ? 'm' : 'f', build: 1 + r(2), skin: r(3), hair: r(6), hairColor: r(3), top: 0, bottom: 0, cols: { 3: '#fbfaf6', 4: '#2a2a2e', 5: '#1a1a1e' } } // 흰 조리복 · 검은 바지
        : Math.random() < 0.4 ? this.swimLook(mySex) : { ...this.npcLook('passer'), sex: mySex };
      const w = this.makeWalker(look, s[0], s[1], 'passer');
      w.tail = { kind, t: 0, cool: 4 + Math.random() * 20, rep: 0 };
      w.speed = 1.1;
      this.walkers.push(w);
    };
    for (let n = 0; n < 3; n++) folk('admire');
    for (let n = 0; n < 2; n++) folk('chef');
    // 길가 침대와 편히 자는 사람들 (구역마다 같은 자리)
    const hsh = (a: number) => { const v = Math.sin(a * 91.7 + this.zone.W * 3.1) * 43758.5; return v - Math.floor(v); };
    let beds = 0;
    for (let n = 0; n < 400 && beds < 12; n++) {
      const i = Math.floor((e ? e.i0 : 0) + hsh(n) * ((e ? e.i1 - e.i0 : this.zone.W) - 2)), j = Math.floor((e ? e.j0 : 0) + hsh(n + 777) * ((e ? e.j1 - e.j0 : this.zone.H) - 2));
      const tt = tileAt(this.zone, i, j);
      if (!inside(i, j) || !['walk', 'park', 'lot'].includes(tt) || !walkable(this.zone, i, j) || !walkable(this.zone, i + 1, j) || !walkable(this.zone, i, j + 1)) continue;
      const bed = beds % 3 !== 2;
      if (bed) {
        const sp = new Sprite(bedTexture(n));
        sp.anchor.set(BED_ANCHOR[0], BED_ANCHOR[1]);
        const [x, y] = iso(i, j);
        sp.position.set(Math.round(x), Math.round(y));
        sp.zIndex = i + j + 1.2;
        this.objects.addChild(sp);
      }
      const look = Math.random() < 0.3 ? this.swimLook(Math.random() < 0.5 ? 'm' : 'f') : this.npcLook('passer');
      const sl = this.makeWalker(look, i + (bed ? 0 : 0), j, 'sleeper');
      sl.still = 'lie'; sl.speed = 0; sl.wait = 1e9; sl.dir = bed ? 'se' : (['se', 'sw', 'ne', 'nw'] as const)[n % 4];
      if (bed) { sl.x = i + 1.0; sl.y = j + 0.5; } // 매트리스 위
      this.walkers.push(sl);
      beds++;
    }
    // 가게 앞 천사 (먹을 것을 판다) · 종교시설 앞 천사 (행사에 오라고 외친다)
    let nv = 0, np = 0;
    for (let k = 0; k < this.zone.buildings.length; k++) {
      const b = this.zone.buildings[k];
      if (!canEnter(b)) continue;
      const rk = roomKindOf(b);
      const food = ['food', 'cafe', 'mart'].includes(rk), faith = ['temple', 'church', 'mosque', 'gurdwara'].includes(rk);
      if ((!food || nv >= 14) && (!faith || np >= 8)) continue;
      const f = this.frontOf(b);
      if (!f || !inside(f[0], f[1])) continue;
      const spots = ([[1, 0], [-1, 0], [0, 1], [1, 1]] as const).map(([a, c]) => [f[0] + a, f[1] + c] as [number, number]).filter(([a, c]) => walkable(this.zone, a, c));
      for (let n = 0; n < (faith ? 2 : 1) && n < spots.length; n++) {
        const a = this.makeWalker(this.npcLook('angel'), spots[n][0], spots[n][1], faith ? 'angel' : 'vendor', faith ? 'sword' : null);
        this.giveWings(a, 0xf8f4ea);
        a.speed = 0; a.wait = 1e9; a.dir = 'se'; a.maxHp = a.hp = 900;
        if (faith) { a.preach = k; np++; } else { a.vend = 'heaven'; a.shopK = k; nv++; }
        this.walkers.push(a);
      }
    }
    // 도시 끝(이웃 구역이 없는 쪽)의 택시 천사: 아주 큰 날개, 남녀 기사
    if (e) for (const [side, id] of [['w', e.w], ['e', e.e]] as const) {
      if (id) continue;
      const i0 = side === 'w' ? e.i0 + 5 : e.i1 - 6;
      for (const [k, sex] of [[0, 'm'], [1, 'f']] as const) {
        let at: [number, number] | null = null;
        for (let dj = 8; dj < 30 && !at; dj++) { const j = e.c + (k ? -dj : dj); if (walkable(this.zone, i0, j)) at = [i0, j]; }
        if (!at) continue;
        const al = this.npcLook('angel');
        const tw = this.makeWalker({ ...al, sex, hair: sex === 'f' ? 4 : 0, cols: { ...al.cols, 8: '#34445e', 3: '#f8f4ea', 4: '#2a3448', 5: '#1a1e28', 2: sex === 'f' ? '#e8d8a8' : '#3a2a1e' } }, at[0], at[1], 'angel'); // 남색 기사 코트
        this.giveWings(tw, 0xfffaf0);
        tw.wingK = 2.6;
        tw.size = 1.16;
        tw.taxi = true; tw.speed = 0; tw.wait = 1e9; tw.dir = side === 'w' ? 'se' : 'sw'; tw.maxHp = tw.hp = 900;
        this.walkers.push(tw);
      }
    }
  }
  /** 22차: 서큐버스 — 박쥐 날개와 뿔 (층마다 빛깔이 다르다) */
  private dressSuccubus(w: Walker, floor: number) {
    const wingCol = floor === 2 ? 0x2e3e2a : floor === 3 ? 0x5a0e18 : 0x2a2220;
    const s = new Sprite(batWingTexture(wingCol));
    s.anchor.set(0.5, 0.62);
    s.scale.set(0.5);
    this.objects.addChild(s);
    w.wings = s;
    const hn = new Sprite(hornTexture(floor === 3 ? 0xd9b44a : floor === 2 ? 0xd8d0b8 : 0x2a1210));
    hn.anchor.set(0.5, 1);
    hn.scale.set(0.5);
    this.objects.addChild(hn);
    w.horns = hn;
  }
  /** 따라오는 이(구애·요리사): 눈에 띄면 다가와 얼마쯤 곁을 따라다니며 말을 걸다 떠난다 */
  private thinkTail(w: Walker, moving: boolean, dt: number) {
    const tl = w.tail!;
    const p = this.player;
    const d = Math.hypot(p.x - w.x, p.y - w.y);
    const L = t();
    const lines = tl.kind === 'chef' ? L.chefLines : (p.look?.sex === 'f' ? L.admireToF : L.admireToM);
    if (tl.t > 0) {
      tl.t -= dt;
      w.repathT -= dt;
      if (d > 2.2 && (w.repathT <= 0 || !moving)) { w.repathT = 0.7; const path = findPath(this.zone, Math.floor(w.x), Math.floor(w.y), Math.floor(p.x), Math.floor(p.y)); if (path) w.path = path.slice(0, Math.max(1, path.length - 2)); }
      if (!moving && d < 3) w.dir = dirFromTile(p.x - w.x, p.y - w.y, w.dir);
      if (!w.bubble && Math.random() < dt * 0.22) this.bubble(w, lines[Math.floor(Math.random() * lines.length)]);
      if (tl.t <= 0 || d > 18) {
        this.bubble(w, (tl.kind === 'chef' ? L.chefBye : L.admireBye)[Math.floor(Math.random() * 3)]);
        tl.cool = 70 + Math.random() * 80;
        const away = randomWalkTileNear(this.zone, Math.floor(w.x), Math.floor(w.y), 14, ['walk', 'cross', 'park']);
        if (away) { const path = findPath(this.zone, Math.floor(w.x), Math.floor(w.y), away[0], away[1]); if (path) w.path = path; }
      }
      return true;
    }
    tl.cool -= dt;
    if (tl.cool <= 0 && d < 11 && !this.dead) { tl.t = 18 + Math.random() * 24; tl.rep++; this.bubble(w, lines[Math.floor(Math.random() * lines.length)]); return true; }
    return false;
  }
  /** 종교시설 앞 천사: 행사에 오라고 외치며 가까운 행인을 가끔 때린다 (행인도 가끔 되받아친다 · 아무도 죽지 않는다 · 나는 건드리지 않는다) */
  private thinkPreacher(w: Walker, dt: number) {
    const L = t();
    const p = this.player;
    if (Math.hypot(p.x - w.x, p.y - w.y) < 10 && !w.bubble && Math.random() < dt * 0.14) this.bubble(w, L.preachCalls[Math.floor(Math.random() * L.preachCalls.length)]);
    w.atkT -= dt;
    if (w.atkT > 0) return;
    w.atkT = 5 + Math.random() * 6;
    let tg: Walker | null = null, bd = 5;
    for (const o of this.walkers) if (o.kind === 'passer' && !o.tail && o.down <= 0) { const d = Math.hypot(o.x - w.x, o.y - w.y); if (d < bd) { bd = d; tg = o; } }
    if (!tg) return;
    w.dir = dirFromTile(tg.x - w.x, tg.y - w.y, w.dir);
    this.startAttack(w, tg, rand(4, 9));
    this.bubble(w, L.preachHit[Math.floor(Math.random() * L.preachHit.length)]);
    const victim = tg;
    // 맞은 행인도 가끔 되받아친다 (천사는 맞고도 꿈쩍 않는다)
    if (Math.random() < 0.35) setTimeout(() => { if (victim.down <= 0 && !victim.sprite.destroyed && !w.sprite.destroyed && !this.root.destroyed) { victim.flee = 0; victim.dir = dirFromTile(w.x - victim.x, w.y - victim.y, victim.dir); this.startAttack(victim, w, rand(2, 5)); this.bubble(victim, t().preachBack[Math.floor(Math.random() * 3)]); } }, 900);
  }
  /** 20차: 천국 구역의 가장자리 — 걷는 범위 밖은 하늘, 경계에 구름 벽 (구름 위에 뜬 도시) */
  private setupHeavenEdge() {
    const e = this.zone.edges;
    if (!e) return;
    const sky = new Sprite(terraceSkyTexture());
    sky.width = this.app.screen.width; sky.height = this.app.screen.height;
    this.root.addChildAt(sky, 0);
    this.terraceSky = sky;
    const ct = cloudTexture();
    const put = (i: number, j: number, k: number) => {
      const c = new Sprite(ct);
      c.anchor.set(0.5, 0.6);
      const [x, y] = iso(i, j);
      c.position.set(x + ((k * 37) % 21) - 10, y + ((k * 53) % 13) - 6);
      c.scale.set(0.9 + ((k * 7) % 5) * 0.12);
      c.alpha = 0.95;
      c.zIndex = i + j + 0.5; // 걷는 범위 바로 바깥 — 안쪽 사람·건물을 가리지 않게 보통 순서로
      this.objects.addChild(c);
    };
    let k = 0;
    for (let i = e.i0 - 3; i <= e.i1 + 3; i += 2) { put(i, e.j0 - 1.2, k++); put(i, e.j1 + 1.2, k++); }
    for (let j = e.j0; j <= e.j1; j += 2) { put(e.i0 - 1.2, j, k++); put(e.i1 + 1.2, j, k++); }
  }
  /**
   * 22차: 도시 끝 — 지도 바깥의 검은 바탕 대신 도시를 덮은 뿌연 스모그. 바탕색을 스모그 빛으로 하고,
   * 지도 가장자리를 따라 회색 연무 덩어리를 겹쳐 경계를 흐린다 (밤에는 화면 전체의 밤빛이 함께 덮는다)
   */
  private hazeOn = false;
  private setupCityHaze() {
    const z = this.zone;
    this.hazeOn = true;
    // 바탕 전체 대신 이 세계 뒤에만 스모그 판을 깐다 (가게·방 장면의 어두운 바탕은 그대로)
    const bg = new Sprite(Texture.WHITE);
    bg.tint = 0xaaa59a;
    bg.width = this.app.screen.width; bg.height = this.app.screen.height;
    this.root.addChildAt(bg, 0);
    this.terraceSky = bg;
    const ct = cloudTexture();
    const put = (i: number, j: number, k: number) => {
      const c = new Sprite(ct);
      c.anchor.set(0.5, 0.6);
      const [x, y] = iso(i, j);
      c.position.set(x + ((k * 37) % 23) - 11, y + ((k * 53) % 15) - 7);
      c.scale.set(1.5 + ((k * 7) % 5) * 0.18);
      c.tint = 0xa8a398;
      c.alpha = 0.92;
      c.zIndex = i + j + 0.5;
      c.eventMode = 'none';
      this.objects.addChild(c);
      const w = c.width, h = c.height;
      this.cullAdd(c, c.x - w / 2, c.y - h * 0.6, c.x + w / 2, c.y + h * 0.4);
    };
    let k = 0;
    for (let i = -2; i <= z.W + 2; i += 3) { put(i, -0.8, k++); put(i, z.H + 0.8, k++); }
    for (let j = 0; j <= z.H; j += 3) { put(-0.8, j, k++); put(z.W + 0.8, j, k++); }
  }
  /** 천국에서 걷는 범위 밖(구름 아래)은 그리지 않는다 */
  private heavenOut(i: number, j: number, w = 1, d = 1) {
    const e = this.zone.edges;
    return this.realm === 'heaven' && !!e && !this.zone.interior && (i + w <= e.i0 || i >= e.i1 || j + d <= e.j0 || j >= e.j1);
  }
  // ── 20차: 천국의 지옥문 — 가끔 1~13층의 악마들이 쏟아져 나오고, 천사들이 맞서 싸운다 ──
  private portal: { i: number; j: number; spr: Sprite; f: number; t: number } | null = null;
  private invadeT = 0;
  private setupPortal() {
    const e = this.zone.edges;
    if (!e) return;
    // 대로 동쪽 끝, 구름과 맞닿은 가장자리
    let at: [number, number] | null = null;
    // 21차: 문(240×330px)이 건물에 가리지 않는 빈 자리 — 문 앞쪽(화면 아래) 띠에 건물이 없는 칸을 고른다.
    // 대로 가운데의 구역 끝 표지와는 떨어지고(남북 6칸 이상), 구름 가장자리에 가까울수록 좋다
    const blocked = (i: number, j: number) => !this.heavenOut(i, j) && !walkable(this.zone, i, j) && !['water', 'void'].includes(tileAt(this.zone, i, j));
    let best = 1e9;
    for (let di = 4; di < 46; di++)
      for (let dj = -32; dj <= 32; dj++) {
        if (Math.abs(dj) < 6) continue;
        const i = e.i1 - di, j = e.c + dj;
        if (this.heavenOut(i, j) || !walkable(this.zone, i, j) || !walkable(this.zone, i - 1, j) || !walkable(this.zone, i, j + 1) || !walkable(this.zone, i - 1, j + 1)) continue;
        let n = 0;
        const d0 = i - j, s0 = i + j;
        for (let s = s0 + 1; s <= s0 + 14; s++) for (let d = d0 - 5; d <= d0 + 5; d++) { if ((s + d) & 1) continue; if (blocked((s + d) / 2, (s - d) / 2)) n++; }
        // 문 뒤(위로 솟은 부분)에 붙은 높은 건물도 조금 덜어 본다
        for (let s = s0 - 3; s <= s0; s++) for (let d = d0 - 2; d <= d0 + 2; d++) { if ((s + d) & 1) continue; if (blocked((s + d) / 2, (s - d) / 2)) n += 0.3; }
        const score = n * 100 + di * 0.6 + Math.abs(Math.abs(dj) - 12) * 0.4;
        if (score < best) { best = score; at = [i, j]; }
      }
    if (!at) return;
    const spr = new Sprite(hellPortalTexture(0));
    spr.anchor.set(0.5, 0.96);
    const [x, y] = iso(at[0] + 0.5, at[1] + 0.5);
    spr.position.set(Math.round(x), Math.round(y));
    spr.zIndex = at[0] + at[1] + 0.5;
    this.objects.addChild(spr);
    this.addTall(spr, x - 120, y - 317, x + 120, y + 13); // 뒤로 들어가면 옅어진다
    this.portal = { i: at[0], j: at[1], spr, f: 0, t: 0 };
    this.invadeT = 45 + Math.random() * 45; // 첫 침공은 금방
  }
  private updatePortal(dt: number) {
    const pt = this.portal!;
    pt.t += dt;
    const f = Math.floor(pt.t * 6) % 3;
    if (f !== pt.f) { pt.f = f; pt.spr.texture = hellPortalTexture(f); }
    this.invadeT -= dt;
    if (this.invadeT <= 0) { this.invadeT = 240 + Math.random() * 240; this.invade(); }
  }
  /** 악마들이 지옥문을 넘어온다 (모든 층의 괴물 가운데서 아무렇게나, 층주는 빼고) */
  private invade() {
    const pt = this.portal!;
    const pool = Object.values(MONSTERS).filter((m) => !m.boss && m.key !== 'gurma' && m.key !== 'talus');
    const n = 4 + Math.floor(Math.random() * 4);
    for (let k = 0; k < n; k++) {
      const m = pool[Math.floor(Math.random() * pool.length)];
      const spot = randomWalkTileNear(this.zone, pt.i, pt.j, 3, ['walk', 'cross', 'lot', 'park', 'soi', 'road']) ?? [pt.i, pt.j];
      const w = this.makeMonster(m, spot[0], spot[1]);
      w.invader = true;
      w.home = [pt.i, pt.j];
      this.walkers.push(w);
    }
    sfx.thud(this.spotOf({ x: pt.i, y: pt.j } as Walker));
    this.hooks.notice(t().invasion);
    // 가까운 천사들이 지옥문 쪽으로
    for (const a of this.walkers) if (a.kind === 'angel' && a.down <= 0 && Math.random() < 0.5) this.bubble(a, t().angelCry[Math.floor(Math.random() * t().angelCry.length)]);
  }
  /** 천사: 악마가 보이면 맞선다. 내가 가까이 오면 물러나라 · 조심하라고 한다 */
  private thinkAngel(w: Walker, moving: boolean, dt: number) {
    const p = this.player;
    if (w.target && (w.target.down > 0 || w.target.sprite.destroyed)) w.target = null;
    if (!w.target) {
      let best: Walker | null = null, bd = 18;
      for (const o of this.walkers) if (o.invader && o.down <= 0) { const d = Math.hypot(o.x - w.x, o.y - w.y); if (d < bd) { bd = d; best = o; } }
      if (best) { w.target = best; w.wait = 0; }
    }
    if (w.target && Math.hypot(p.x - w.x, p.y - w.y) < 7 && !w.bubble && Math.random() < dt * 0.3) {
      const L = t();
      this.bubble(w, L.angelWarn[Math.floor(Math.random() * L.angelWarn.length)]);
    }
    return !!w.target;
  }
  /** 구름 계단 자리: 우주새 문에서 6~12칸, 황색날개가 거니는 곳과 떨어진 보도 (늘 같은 곳) */
  heavenStair: { i: number; j: number } | null = null;
  /** 21차: 구름 계단 그림의 화면 상자 (누르면 걸어가 올라간다) · 걸어가는 중인가 */
  private stairBox: [number, number, number, number] | null = null;
  private stairWant = false;
  /** 21차: 구름 계단 자리 — 우주새 앞쪽(화면에 잘 보이는 남·동쪽)의 트인 칸. 계단 앞을 가리는 건물이 없을수록, 문에서 가까울수록 좋다 */
  /** 26차: 지도 끝의 구름 계단 자리 — 가장자리(북쪽 구름)에 붙은 트인 바닥, 앞에 건물이 덜 가리는 곳 */
  private findEdgeStairSpot(): { i: number; j: number } | null {
    const z = this.zone, e = z.edges;
    const ok = (i: number, j: number) => walkable(z, i, j) && !this.heavenOut(i, j) && ['walk', 'lot', 'soi', 'park'].includes(tileAt(z, i, j)) && [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, -1]].every(([a, b]) => walkable(z, i + a, j + b));
    const blocked = (i: number, j: number) => !this.heavenOut(i, j) && !walkable(z, i, j) && !['water', 'void'].includes(tileAt(z, i, j));
    const i0 = e ? e.i0 : 1, i1 = e ? e.i1 : z.W - 1, j0 = e ? e.j0 : 1, j1 = e ? e.j1 : z.H - 1;
    const c = e ? e.c : Math.floor(z.H / 2);
    const from: [number, number] = e ? [Math.floor((i0 + i1) / 2), e.c] : [z.door.i, z.door.j + 1];
    const cands: [number, number, number][] = [];
    // 동쪽 끝 가장자리(그 너머는 구름) 가까이, 앞쪽에 건물이 덜 가리는 트인 바닥
    for (let j = j0 + 4; j <= j1 - 4; j++)
      for (let i = i1 - 10; i <= i1 - 2; i++) {
        if (i < i0 || !ok(i, j)) continue;
        let n = 0;
        const d0 = i - j, s0 = i + j;
        for (let ss = s0 + 1; ss <= s0 + 9; ss++) for (let dd = d0 - 3; dd <= d0 + 3; dd++) { if ((ss + dd) & 1) continue; if (blocked((ss + dd) / 2, (ss - dd) / 2)) n++; }
        // 계단 오른쪽(너머 구름)도 건물에 막히지 않게
        for (let k = 1; k <= 6; k++) if (blocked(i + k, j - k)) n += 0.6;
        cands.push([i, j, n * 40 + (i1 - i) * 2 + Math.abs(j - c) * 0.08]);
      }
    cands.sort((a, b) => a[2] - b[2]);
    for (const [i, j] of cands.slice(0, 60)) if (findPath(z, from[0], from[1], i, j)) return { i, j };
    return null;
  }
  /** 26차: 계단 너머 구름 위에 솟은 천국의 탑 (닿을 수 없다 — 바라볼 뿐) */
  private addHeavenTower(st: { i: number; j: number }) {
    const e = this.zone.edges;
    // 계단 오른쪽, 동쪽 가장자리 너머 구름 위 (i를 늘리고 j를 줄이면 화면에서 같은 높이로 오른쪽)
    const k = (e ? e.i1 : this.zone.W) - st.i + 3;
    const ti = st.i + k, tj = st.j - k; // 화면에서 계단과 같은 높이, 오른쪽 구름 위
    const [x, y] = iso(ti + 0.5, tj + 0.5);
    const s = new Sprite(heavenTowerTexture());
    s.anchor.set(0.5, 0.86);
    s.position.set(Math.round(x), Math.round(y));
    s.scale.set(0.82);
    s.zIndex = ti + tj + 0.3;
    this.objects.addChild(s);
    const L = t();
    const tag = new Text({ text: L.heavenTower, style: { fontFamily: 'system-ui, sans-serif', fontSize: 13, fontWeight: '700', fill: '#fff8de', stroke: { color: '#7a6230', width: 3, join: 'round' } } });
    tag.anchor.set(0.5, 0);
    tag.alpha = 0.85;
    tag.position.set(Math.round(x), Math.round(y) - 60);
    tag.zIndex = s.zIndex + 0.01;
    this.objects.addChild(tag);
  }
  private findStairSpot(di: number, dj: number): { i: number; j: number } | null {
    const ok = (i: number, j: number) => walkable(this.zone, i, j) && ['walk', 'lot', 'soi', 'park'].includes(tileAt(this.zone, i, j)) && [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, -1]].every(([a, b]) => walkable(this.zone, i + a, j + b));
    const blocked = (i: number, j: number) => !walkable(this.zone, i, j) && !['water', 'void'].includes(tileAt(this.zone, i, j));
    const cands: [number, number, number][] = [];
    for (let j = dj - 16; j <= dj + 16; j++)
      for (let i = di - 16; i <= di + 16; i++) {
        const dd = Math.hypot(i - di, j - (dj + 2));
        if (dd < 5 || dd > 16 || this.heavenOut(i, j) || !ok(i, j)) continue;
        let n = 0;
        const d0 = i - j, s0 = i + j;
        for (let ss = s0 + 1; ss <= s0 + 9; ss++) for (let d = d0 - 3; d <= d0 + 3; d++) { if ((ss + d) & 1) continue; if (blocked((ss + d) / 2, (ss - d) / 2)) n++; }
        cands.push([i, j, n * 40 + dd + (i + j < di + dj ? 12 : 0)]);
      }
    cands.sort((a, b) => a[2] - b[2]);
    for (const [i, j] of cands.slice(0, 40)) if (findPath(this.zone, di, dj, i, j)) return { i, j };
    return null;
  }
  /** 구름과 금빛 기운: 세상을 밝고 따뜻하게, 화면 가장자리에 흘러가는 구름 (테라스: 둘레가 하늘) */
  /** 24차 사나운 염소: 아무 데서나 나타나 사람을 보면 들이받고, 죽기 직전엔 무섭게 빨리 달아난다. 가끔은 죽는다. 그래도 다시 나타난다 */
  private goatT = -1;
  private inAlley = false;
  /** 28차: 오늘 집에 있는 유내의 시절 (0 = 10대 · 1 = 20대 · 2 = 30대 후반). 골목 들머리를 지날 때마다 다시 정해진다 */
  yunaeAge: 0 | 1 | 2 = Math.floor(Math.random() * 3) as 0 | 1 | 2;
  private yunaeW: Walker | null = null;
  private ambushT = 0;
  private spawnGoat() {
    const p0 = this.player;
    const spot = randomWalkTileNear(this.zone, Math.floor(p0.x), Math.floor(p0.y), 40, ['walk', 'soi', 'park']);
    if (!spot || Math.hypot(spot[0] - p0.x, spot[1] - p0.y) < 12) return;
    const w = this.makeWalker(this.npcLook('passer'), spot[0], spot[1], 'goat');
    w.dressId = -1; // 사람 옷을 입히지 않는다
    w.cs = goatCharSet();
    w.maxHp = w.hp = 320;
    w.speed = 0.85;
    w.size = 1.35;
    w.home = [spot[0], spot[1]];
    this.walkers.push(w);
  }
  /** 25차 마스크 팔이 소녀: 휴식 마을 울타리 바깥, 몇 칸 떨어진 고리 위를 천천히 돈다 */
  private maskGirlSpot(): [number, number] | null {
    const h = this.zone.hell;
    if (!h) return null;
    for (let n = 0; n < 40; n++) {
      const to = randomWalkTileNear(this.zone, h.rest.i, h.rest.j, h.rest.r + 9, ['lot', 'walk', 'soi']);
      if (to && Math.hypot(to[0] - h.rest.i, to[1] - h.rest.j) > h.rest.r + 2.5) return to;
    }
    return null;
  }
  private thinkMaskGirl(w: Walker, moving: boolean, dt: number) {
    const p = this.player, d = Math.hypot(p.x - w.x, p.y - w.y);
    w.target = null;
    if (d < 9 && !w.bubble && Math.random() < dt * 0.05) { const c = t().maskCalls; this.bubble(w, c[Math.floor(Math.random() * c.length)]); }
    if (!moving && d < 3) { w.dir = dirFromTile(p.x - w.x, p.y - w.y, w.dir); return; } // 손님이 오면 멈춰 선다
    w.wait -= dt;
    if (!moving && w.wait <= 0) {
      const to = this.maskGirlSpot();
      if (to) w.path = findPath(this.zone, Math.floor(w.x), Math.floor(w.y), to[0], to[1]) ?? [];
      w.wait = 4 + Math.random() * 7;
    }
  }
  /** 28차: 스무 살 무렵의 유내는 집 안이 아니라 대문 앞에 서 있다 (동네 미용실을 한다). 다른 시절이면 집 안 밥상 앞에 있다 */
  private placeYunae() {
    const hm = this.zone.home;
    if (!hm) return;
    if (this.yunaeW) { this.removeWalker(this.yunaeW); this.yunaeW = null; }
    if (this.yunaeAge !== 1) return;
    const spot = ([[1, 0], [-1, 0], [1, 1], [-1, 1], [0, 1]] as const).map(([a, c]) => [hm.i + a, hm.j + c] as [number, number]).find(([a, c]) => walkable(this.zone, a, c));
    if (!spot) return;
    const w = this.makeWalker(yunaeLook(1), spot[0], spot[1], 'yunae');
    this.dotArt(w, 'sprite-yunae-20s');
    w.dir = 'sw'; w.wait = 1e9; w.maxHp = w.hp = 99999; w.home = [spot[0], spot[1]];
    this.walkers.push(w);
    this.yunaeW = w;
  }
  /** 말을 다 하고 나면 — 그 사람 만나러 간다며 골목 아래로 총총 내려간다. 눈에서 멀어지면 사라진다 */
  yunaeGo() {
    const w = this.yunaeW;
    if (!w || w.leave !== undefined) return;
    w.leave = 0; w.speed = 1.3; w.bubbleT = 0;
    const a = this.zone.homeAlley;
    const to = a ? [Math.floor((a.i0 + a.i1) / 2), Math.floor((a.j0 + a.j1) / 2)] : randomWalkTileNear(this.zone, Math.floor(w.x), Math.floor(w.y), 18);
    if (to) w.path = findPath(this.zone, Math.floor(w.x), Math.floor(w.y), to[0], to[1]) ?? [];
  }
  private thinkYunae(w: Walker, moving: boolean, dt: number) {
    const p = this.player, d = Math.hypot(p.x - w.x, p.y - w.y);
    w.target = null;
    if (w.leave !== undefined) {
      w.leave += dt;
      if (d > 10 || w.leave > 40 || (!moving && !w.path.length && w.leave > 1)) { this.removeWalker(w); if (this.yunaeW === w) this.yunaeW = null; }
      return;
    }
    if (d < 8 && !w.bubble && Math.random() < dt * 0.07) { const c = t().yunaeCalls; this.bubble(w, c[Math.floor(Math.random() * c.length)]); }
    if (d < 5) w.dir = dirFromTile(p.x - w.x, p.y - w.y, w.dir);
  }
  private thinkGoat(w: Walker, moving: boolean, dt: number) {
    const p = this.player;
    const d = Math.hypot(p.x - w.x, p.y - w.y);
    if (w.flee > 0) {
      // 달아나는 중: 시야 밖으로 사라지면 끝 (한참 뒤 다른 데서 다시)
      if (d > 16 || w.flee < 0.3) { this.removeWalker(w); this.goatT = 70 + Math.random() * 80; return; }
      if (!w.path.length) { const ax = w.x + (w.x - p.x) * 3, ay = w.y + (w.y - p.y) * 3; const to = this.nearestWalkable(Math.floor(ax), Math.floor(ay)); if (to) w.path = findPath(this.zone, Math.floor(w.x), Math.floor(w.y), to[0], to[1]) ?? []; }
      w.flee = Math.max(0.31, w.flee - dt);
      return;
    }
    if (w.target) return; // 싸우는 중 (fight가 다룬다)
    const hidden = this.dead || this.invisible || !!this.zone.interior;
    if (!hidden && d < 6.5 && Math.random() < dt * 2.2) {
      w.target = p;
      this.bubble(w, t().goatBleat[Math.floor(Math.random() * t().goatBleat.length)]);
      return;
    }
    w.wait -= dt;
    if (!moving && w.wait <= 0) {
      const to = randomWalkTileNear(this.zone, w.home[0], w.home[1], 8);
      if (to) w.path = findPath(this.zone, Math.floor(w.x), Math.floor(w.y), to[0], to[1]) ?? [];
      w.wait = 2 + Math.random() * 4;
    }
  }
  /** 24차 환생의 우주왕복선 */
  private grandpa = false;
  forceGrandpa?: boolean;
  get clerkIsGrandpa() { return this.grandpa; }
  private ship: { s: Sprite; f: Furn; door: [number, number]; hell: boolean; y0: number } | null = null;
  private shipGo: { res: () => void; phase: 'walk' | 'board' | 'lift'; t: number; v: number; flame?: Sprite; smoke: Sprite[] } | null = null;
  private addShip(f: Furn) {
    const hell = (f.v ?? 0) === 1;
    const pic = shuttleCanvas(hell);
    const [x, y] = iso(f.i + f.w / 2, f.j + f.d / 2);
    const z0 = f.i + f.w / 2 + f.j + f.d / 2;
    const put = (cv: HTMLCanvasElement, z: number) => { const sp = new Sprite(Texture.from(cv)); sp.anchor.set(pic.ax, pic.ay); sp.scale.set(0.5); sp.position.set(x, y + 8); sp.zIndex = z; this.objects.addChild(sp); return sp; };
    put(pic.back, z0 - 3); // 발사대·발사탑은 남는다
    const s = put(pic.stack, z0 + 0.5);
    put(pic.front, z0 + 0.6);
    this.ship = { s, f, door: [f.i + 1, f.j + f.d], hell, y0: s.y };
  }
  private wearGlasses(w: Walker) {
    const g = new Graphics();
    g.circle(-2.2, 0, 1.6).stroke({ color: 0x1a1410, width: 0.8 }).circle(2.2, 0, 1.6).stroke({ color: 0x1a1410, width: 0.8 }).moveTo(-0.6, 0).lineTo(0.6, 0).stroke({ color: 0x1a1410, width: 0.6 });
    g.circle(-2.2, 0, 1.2).fill({ color: 0xffffff, alpha: 0.25 }).circle(2.2, 0, 1.2).fill({ color: 0xffffff, alpha: 0.25 });
    this.objects.addChild(g);
    w.glasses = g;
  }
  /** 우주선까지 걸어가 타고 떠오른다 (다 떠오르면 끝) */
  boardShip(): Promise<void> {
    const sh = this.ship;
    if (!sh) return Promise.resolve();
    this.cancelActs();
    const to = this.nearestWalkable(sh.door[0], sh.door[1]);
    return new Promise((res) => {
      this.shipGo = { res, phase: 'walk', t: 0, v: 0, smoke: [] };
      if (!to || !this.walkTo(to[0], to[1])) this.shipGo.phase = 'board';
    });
  }
  private updateShip(dt: number) {
    const go = this.shipGo, sh = this.ship;
    if (!go || !sh) return;
    const p = this.player;
    go.t += dt;
    if (go.phase === 'walk') {
      if ((!p.path.length && go.t > 0.3) || go.t > 14) { go.phase = 'board'; go.t = 0; }
      return;
    }
    if (go.phase === 'board') {
      p.sprite.alpha = Math.max(0, 1 - go.t * 2);
      if (go.t > 0.7) {
        go.phase = 'lift'; go.t = 0;
        const fl = new Sprite(Texture.from(flameCanvas(sh.hell)));
        fl.anchor.set(0.5, 0); fl.zIndex = sh.s.zIndex - 0.05; fl.blendMode = 'add'; // 발밑 구름(앞 장)에 불꽃 끝이 가린다
        this.objects.addChild(fl);
        go.flame = fl;
        sfx.thud(this.spotOf(p));
      }
      return;
    }
    // 떠오르기: 처음엔 느리게, 점점 빠르게. 불꽃이 깜박이고 발밑에 연기가 부푼다
    go.v += dt * (go.t < 1 ? 18 : 120);
    sh.s.y -= go.v * dt;
    const rise = sh.y0 - sh.s.y;
    if (go.flame) { go.flame.position.set(sh.s.x, sh.s.y - 12); go.flame.scale.set(0.5 + Math.random() * 0.12, 0.45 + Math.min(0.5, rise / 160) + Math.random() * 0.12); go.flame.alpha = 0.85 + Math.random() * 0.15; }
    this.shakeT = Math.max(this.shakeT, 0.1); this.shakeA = Math.max(this.shakeA, go.t < 2 ? 3 : 1.5);
    if (Math.random() < dt * 14) {
      const c = new Sprite(cloudTexture());
      c.anchor.set(0.5); c.tint = sh.hell ? 0x7a6a50 : 0xffffff; c.alpha = 0.7;
      c.scale.set(0.15 + Math.random() * 0.1);
      c.position.set(sh.s.x + (Math.random() - 0.5) * 90, sh.y0 - 6 + (Math.random() - 0.5) * 20);
      c.zIndex = sh.s.zIndex + 0.02;
      this.objects.addChild(c);
      go.smoke.push(c);
    }
    for (const c of go.smoke) { c.scale.x += dt * 0.25; c.scale.y += dt * 0.18; c.alpha = Math.max(0, c.alpha - dt * 0.28); }
    if (go.t > 3.4) {
      const res = go.res;
      for (const c of go.smoke) c.destroy();
      go.flame?.destroy();
      this.shipGo = null;
      res();
    }
  }
  /** 24차 경계의 해변: 저녁 하늘 · 어스름 색 · 낮게 깔린 안개 · 가끔 떠오르는 익사체 · 밀려왔다 빠지는 거품 */
  private shoreFx: { fog: Sprite[]; bodies: { s: Sprite; t: number; T: number; i: number; j: number }[]; foam: Graphics; ft: number } | null = null;
  private setupShore() {
    const sky = new Sprite(Texture.from(shoreSkyCanvas()));
    sky.width = this.app.screen.width; sky.height = this.app.screen.height;
    this.root.addChildAt(sky, 0);
    this.terraceSky = sky;
    this.hazeOn = true;
    const cm = new ColorMatrixFilter();
    cm.saturate(-0.28, false);
    const dusk = new ColorMatrixFilter();
    dusk.tint(0xe8c8c0, true);
    this.camera.filters = [cm, dusk];
    const fog: Sprite[] = [];
    for (let k = 0; k < 9; k++) {
      const c = new Sprite(cloudTexture());
      c.anchor.set(0.5); c.tint = 0xb4aab8; c.alpha = 0.16 + Math.random() * 0.14;
      c.scale.set(1.6 + Math.random() * 1.4, 0.9 + Math.random() * 0.6);
      c.position.set(Math.random() * this.app.screen.width, this.app.screen.height * (0.15 + Math.random() * 0.8));
      this.overlay.addChild(c);
      fog.push(c);
    }
    const tx = [0, 1, 2, 3].map((v) => { const t2 = Texture.from(drownedCanvas(v)); return t2; });
    const bodies = [0, 1, 2].map((k) => {
      const s = new Sprite(tx[k % 4]);
      s.anchor.set(0.5); s.scale.set(0.5); s.alpha = 0; s.zIndex = -50;
      this.objects.addChild(s);
      return { s, t: -k * 9 - Math.random() * 6, T: 22 + Math.random() * 14, i: 0, j: 0 };
    });
    const foam = new Graphics();
    foam.zIndex = -60;
    this.objects.addChild(foam);
    this.shoreFx = { fog, bodies, foam, ft: 0 };
  }
  private updateShore(dt: number) {
    const fx = this.shoreFx;
    if (!fx) return;
    const Wd = this.app.screen.width;
    for (const [k, c] of fx.fog.entries()) { c.x += dt * (6 + k * 1.5); if (c.x - c.width / 2 > Wd) c.x = -c.width / 2; }
    // 익사체: 물가에서 몇 칸 떨어진 바다에 천천히 떠올랐다가 가라앉는다
    for (const b of fx.bodies) {
      b.t += dt;
      if (b.t < 0) continue;
      if (b.t > b.T) { b.t = -8 - Math.random() * 14; b.s.alpha = 0; continue; }
      if (b.t - dt <= 0) { b.i = 2 + Math.random() * (this.zone.W - 4); b.j = shoreLine(Math.floor(b.i)) - 2.5 - Math.random() * 4; b.s.texture = b.s.texture; }
      const a = Math.min(1, b.t / 4, (b.T - b.t) / 4);
      const [x, y] = iso(b.i + b.t * 0.02, b.j + b.t * 0.03);
      b.s.position.set(x, y + Math.sin(this.time * 1.3 + b.T) * 1.5);
      b.s.alpha = a * 0.85;
      b.s.rotation = Math.sin(this.time * 0.4 + b.T) * 0.05;
    }
    // 물가 거품: 밀려왔다 빠진다
    fx.ft += dt;
    if (fx.ft < 1 / 15) return;
    fx.ft = 0;
    const g = fx.foam;
    g.clear();
    const reach = (Math.sin(this.time * 0.55) + 1) / 2;
    for (let pass = 0; pass < 2; pass++) {
      const off = pass === 0 ? 0.35 * reach : -0.6 + 0.3 * reach;
      let first = true;
      for (let i = -6; i <= this.zone.W + 6; i += 0.5) {
        const [x, y] = iso(i, shoreF(i) + off + Math.sin(i * 1.7 + this.time) * 0.06);
        if (first) { g.moveTo(x, y); first = false; } else g.lineTo(x, y);
      }
      g.stroke({ color: 0xe6e8ea, width: pass === 0 ? 1.5 : 1, alpha: pass === 0 ? 0.55 * (1 - reach * 0.4) : 0.25 });
    }
  }
  private setupHeavenSky(terrace: boolean) {
    if (terrace) {
      const sky = new Sprite(terraceSkyTexture());
      sky.width = this.app.screen.width; sky.height = this.app.screen.height;
      (sky as Sprite & { bg?: boolean }).bg = true;
      this.root.addChildAt(sky, 0);
      this.terraceSky = sky;
    }
    const cm = new ColorMatrixFilter();
    cm.brightness(terrace ? 1.0 : 1.12, false); // 테라스는 흰 대리석·구름이라 덜 밝게 (흰빛에 묻히지 않게)
    cm.saturate(terrace ? -0.05 : -0.22, true);
    const warm = new ColorMatrixFilter();
    warm.matrix = [1.04, 0, 0, 0, 0.03, 0, 1.02, 0, 0, 0.025, 0, 0, 0.94, 0, 0.0, 0, 0, 0, 1, 0];
    this.camera.filters = terrace ? [cm] : [cm, warm];
    this.heavenSky = new Container();
    this.root.addChildAt(this.heavenSky, this.root.children.indexOf(this.camera) + 1);
    // 화면 가장자리를 감싸는 흰 구름 안개 (가운데는 맑게) — 테라스는 하늘이 보이게 안개 없이
    if (!terrace) {
      const vg = new Sprite(heavenVignette());
      vg.width = this.app.screen.width; vg.height = this.app.screen.height;
      (vg as Sprite & { vig?: boolean }).vig = true;
      this.heavenSky.addChild(vg);
    }
    const ct = cloudTexture();
    for (let k = 0; k < (terrace ? 6 : 10); k++) {
      const c = new Sprite(ct);
      c.anchor.set(0.5);
      c.scale.set(1.2 + Math.random() * 1.4);
      c.alpha = terrace ? 0.3 + Math.random() * 0.2 : 0.45 + Math.random() * 0.25;
      c.position.set(Math.random() * this.app.screen.width, (k % 2 ? 0.05 : 0.95) * this.app.screen.height + (Math.random() - 0.5) * 80);
      (c as Sprite & { vx?: number }).vx = 6 + Math.random() * 10;
      this.heavenSky.addChild(c);
    }
    this.heavenSky.eventMode = 'none';
  }
  private heavenSky: Container | null = null;
  private terraceSky: Sprite | null = null;
  private updateHeaven(dt: number) {
    if (this.terraceSky) { this.terraceSky.width = this.app.screen.width; this.terraceSky.height = this.app.screen.height; }
    const sky = this.heavenSky;
    if (!sky) return;
    const W = this.app.screen.width;
    for (const c of sky.children as (Sprite & { vx?: number; vig?: boolean })[]) {
      if (c.vig) { c.width = W; c.height = this.app.screen.height; continue; }
      c.x += (c.vx ?? 8) * dt;
      if (c.x - c.width / 2 > W) c.x = -c.width / 2;
    }
  }

  /** 대식자: 죄를 지은 사람(빨간 표시) 근처에 나타나 쫓아온다 */
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
  /** 체력이 절반 아래로 떨어진 대식자는 실밥이 터지며 괴물로 변한다 */
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
    w.wings?.destroy();
    w.horns?.destroy();
    w.sprite.destroy();
    for (const o of this.walkers) if (o.target === w) o.target = null;
  }

  private npcWeapon(kind: NpcKind, gang?: Walker['gang']): string | null {
    if (kind === 'angel') return 'sword'; // 20차: 지옥문을 지키는 천사의 칼
    if (kind !== 'thug') return null;
    const r = Math.random();
    if (gang === 'robber') return ['knife', 'pipe', 'hatchet', 'bat'][Math.floor(r * 4)];
    if (gang === 'mafia') return r < 0.55 ? 'pistol' : r < 0.8 ? 'dagger' : 'bat';
    if (this.realm === 'real' && this.zone.shop !== false && !this.zone.interior) return r < 0.6 ? 'bat' : r < 0.8 ? 'pipe' : null; // 21차: 시작 구역 불량배는 야구배트를 자주 든다 (쓰러뜨리면 떨어뜨린다)
    return [null, 'bat', 'pipe', 'knife', 'bat', null][Math.floor(r * 6)];
  }

  /**
   * 27차: 현실의 행인·관광객 절반은 맞으면 맞선다. 큰 것(장우산·야구방망이)은 들고 다니는 게 보이고,
   * 작은 것(단검)과 아주 드문 권총은 품에 숨겼다가 싸울 때 꺼낸다. 권총 든 행인은 단단하고 세다
   */
  private rollPasserArms(noFight: boolean): { brave: boolean; hidden: string | null; gunman: boolean; vis: string | null } {
    const out = { brave: false, hidden: null as string | null, gunman: false, vis: null as string | null };
    if (this.realm !== 'real' || noFight) return out;
    out.brave = Math.random() < 0.5;
    const r = Math.random();
    if (out.brave) {
      if (r < 0.03) { out.hidden = 'pistol'; out.gunman = true; }
      else if (r < 0.25) out.hidden = 'dagger';
      else if (r < 0.4) out.vis = 'umbrella';
      else if (r < 0.5) out.vis = 'bat';
    } else if (r < 0.1) out.vis = 'umbrella';
    return out;
  }
  private applyPasserArms(w: Walker, a: { brave: boolean; hidden: string | null; gunman: boolean }) {
    w.brave = a.brave; w.hidden = a.hidden; w.gunman = a.gunman;
    w.maxHp = w.hp = a.gunman ? 380 : 120;
  }
  /** 맞선다: 숨긴 무기가 있으면 꺼낸다 */
  private standUp(w: Walker, by: Walker) {
    w.flee = 0; w.path = [];
    if (!w.target) {
      w.target = by;
      const L = t();
      const one = (a: string[]) => a[Math.floor(Math.random() * a.length)];
      if (w.hidden) { this.dress(w, w.look, w.hidden); w.hidden = null; this.bubble(w, one(w.gunman ? L.passerGun : L.passerDraw)); }
      else this.bubble(w, one(L.passerFight));
    }
  }
  /** 플레이어 근처 보도(불량배는 골목)에 사람을 세운다. 이미 있던 사람이면 자리만 옮긴다 */
  private spawnNpc(kind: NpcKind, existing?: Walker, weakIn?: Walker['weak'], gangIn?: Walker['gang']) {
    const p = this.player;
    let weak = existing?.weak ?? weakIn;
    let gang = existing?.gang ?? gangIn;
    const prefer: Parameters<typeof randomWalkTileNear>[4] = kind === 'thug' ? ['soi', 'walk'] : ['walk', 'cross', 'park'];
    let spot: [number, number] | null = null;
    for (let n = 0; n < 6 && !spot; n++) {
      const s = randomWalkTileNear(this.zone, Math.floor(p.x), Math.floor(p.y), 24, prefer);
      if (s && Math.hypot(s[0] - p.x, s[1] - p.y) > 9) spot = s;
    }
    if (!spot) return;
    if (kind === 'thug' && this.realm === 'real' && weak !== 'shade') ({ weak, gang } = this.rollThug(spot));
    // 19차: 현실 거리의 행인 넷에 하나는 외국인 관광객 (나나·소이 11 쪽은 더 많다)
    const tourRate = this.zone.id === 'bkk-nana' || this.zone.id === 'bkk-soi8-17' ? 0.34 : 0.24;
    const tour = kind === 'passer' && this.realm === 'real' && !weak && Math.random() < tourRate ? (['w', 'w', 'b', 'a', 'a'] as const)[Math.floor(Math.random() * 5)] : undefined;
    const lookOf = () => {
      if (!tour) return this.npcLook(kind, weak, gang);
      const key = `tour|${JSON.stringify(tour)}`;
      let pool = LOOK_POOL.get(key);
      if (!pool) LOOK_POOL.set(key, (pool = []));
      if (pool.length >= 4) return pool[Math.floor(Math.random() * pool.length)];
      const l = this.touristLook(tour);
      pool.push(l);
      return l;
    };
    const look = lookOf();
    // 27차: 행인의 무기는 옷을 입힐 때 한 번에 (두 번 합치지 않게)
    const arms = kind === 'passer' ? this.rollPasserArms(!!weak || !!look.child) : null;
    const weapon = weak ? null : arms ? arms.vis : this.npcWeapon(kind, gang);
    if (existing) {
      Object.assign(existing, { x: spot[0] + 0.5, y: spot[1] + 0.5, path: [], hp: existing.maxHp, down: 0, target: null, firstBy: null, flee: 0, home: spot });
      existing.act = null;
      existing.pend = null;
      existing.tour = tour;
      this.dress(existing, look, weapon);
      this.makeWeak(existing, weak);
      this.makeGang(existing, gang);
      if (arms) this.applyPasserArms(existing, arms);
      return;
    }
    const w = this.makeWalker(look, spot[0], spot[1], kind, weapon);
    w.tour = tour;
    this.makeWeak(w, weak);
    this.makeGang(w, gang);
    if (arms) this.applyPasserArms(w, arms);
    if (kind === 'angel') { this.giveWings(w, 0xf8f4ea); w.maxHp = w.hp = 900; w.speed = 1.1; }
    this.walkers.push(w);
  }

  // ───────────────────────── 건물 안 ─────────────────────────
  private clerkW: Walker | null = null;
  private leaving = false;
  /** 가게 안에서 일하는 중: 조작 없이 가게 안을 오가며 시급이 쌓인다 */
  private workIn: { name: string; earned: number; wait: number; job: { mult: number; drain: number; hard: 0 | 1 | 2 } } | null = null;
  get isWorkingInside() {
    return !!this.workIn;
  }
  stopWorkInside(stiffed = false) {
    if (!this.workIn) return;
    const w = this.workIn;
    this.workIn = null;
    this.player.path = [];
    this.hooks.work(null);
    this.hooks.wage(w.earned, w.name, stiffed);
    this.shift = null;
  }
  /**
   * 19차 현실의 잔인함: 일한 값은 그만둘 때 한꺼번에 받는다. 그런데 가끔(교대 열에 하나쯤) 사장이 일을 시킬 만큼 시키고는
   * 30초~4분 사이 어느 때 한 푼도 주지 않고 내쫓는다
   */
  private shift: { t: number; kickAt: number | null } | null = null;
  private shiftStiff(dt: number) {
    if (!this.shift) this.shift = { t: 0, kickAt: Math.random() < 0.12 ? 30 + Math.random() * 210 : null };
    this.shift.t += dt;
    return this.shift.kickAt !== null && this.shift.t >= this.shift.kickAt;
  }
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
    // 밤이면 창밖이 어둡고 실내등이 따뜻하다 (들어갈 때의 방콕 시각)
    const { h: hh, m: mm } = bangkokClock();
    const nightIn = this.realm === 'hell' || (this.realm !== 'heaven' && nightFactor(hh, mm) > 0.5);
    const room = drawRoom(this.zone, nightIn);
    const rs = new Sprite(tex(room.canvas));
    rs.position.set(room.x, room.y);
    this.ground.addChild(rs);
    for (const f of info.furn) {
      if (f.kind === 'shuttle') { this.addShip(f); continue; }
      const d = drawFurn(f, info, nightIn);
      this.strips(tex(d.canvas), d.x, d.y, f.i, f.j, f.w, f.d, f.h <= 2 ? -40 : -0.2);
    }
    // 24차: 가끔은 루엔·파샤르 대신 안경 쓴 아주 늙은 할아버지가 앉아 있다 (천국·지옥 같은 사람, 옷차림만 다름)
    this.grandpa = (info.kind === 'terrace' || info.kind === 'rebirth') && (this.forceGrandpa ?? Math.random() < 0.14);
    if (info.clerk) {
      const w = this.makeWalker(this.grandpa ? grandpaLook(info.kind === 'rebirth') : info.kind === 'home' ? yunaeLook(info.age ?? 1) : clerkLook(info.kind, info.from.b), info.clerk.i, info.clerk.j, 'clerk');
      w.dir = 'sw';
      w.wait = 1e9;
      this.walkers.push(w);
      this.clerkW = w;
      if (info.kind === 'loan') this.dotArt(w, 'sprite-besk'); // 관리자가 손본 베스크 도트
      if (info.kind === 'home' && !this.grandpa) this.dotArt(w, info.age === 0 ? 'sprite-yunae-teen' : 'sprite-yunae-30s'); // 28차: 시절별 유내 도트
      if (info.kind === 'shore') { this.dotArt(w, 'sprite-bulda'); w.dir = 'se'; }
      if (info.kind === 'terrace' && !this.grandpa) this.giveWings(w, 0xf4efe4); // 루엔의 흰 날개
      if (this.grandpa) this.wearGlasses(w);
    }
    if (info.kind === 'terrace') {
      // 24차: 우주선 근처에서 카드 치는 천사 둘 (가부좌로 마주 앉아)
      const tb = info.furn.find((f) => f.kind === 'cardtable');
      if (tb) for (const [di, dir] of [[-1, 'se'], [1, 'nw']] as const) {
        const a = this.makeWalker(this.npcLook('angel'), tb.i + di, tb.j, 'soul');
        a.still = 'lotus'; a.dir = dir; a.wait = 1e9; a.speed = 0; a.cards = true;
        this.giveWings(a, 0xf8f4ea);
        this.walkers.push(a);
      }
    }
    if (['temple', 'church', 'mosque', 'gurdwara'].includes(info.kind)) {
      // 19차: 종교마다 가장 높은 이 (주지 스님 · 대주교 · 대이맘 · 수석 그란티) — 제단 옆. 신앙을 뺀 능력치를 되돌려 준다
      const ei = Math.min(this.zone.W - 3, Math.floor(this.zone.W / 2) + 3), ej = 2;
      const look: Look = info.kind === 'temple' ? { sex: 'm', build: 0, skin: 1, hair: 5, hairColor: 0, top: 0, bottom: 0, cols: { 3: '#c9701e', 9: '#c9701e', 4: '#b8601a' } }
        : info.kind === 'church' ? { sex: 'm', build: 1, skin: 0, hair: 1, hairColor: 2, top: 0, bottom: 0, outfit: 'raincoat', cols: { 8: '#8a1a2a', 3: '#8a1a2a', 4: '#8a1a2a', 2: '#d8d4cc' } }
        : info.kind === 'mosque' ? { sex: 'm', build: 1, skin: 1, hair: 0, hairColor: 0, top: 0, bottom: 0, outfit: 'raincoat', cols: { 8: '#f2efe6', 3: '#f2efe6', 4: '#f2efe6', 2: '#e8e4da' } }
        : { sex: 'm', build: 1, skin: 1, hair: 0, hairColor: 0, top: 0, bottom: 0, outfit: 'raincoat', cols: { 8: '#e8a23a', 3: '#f2efe6', 4: '#f2efe6', 2: '#2a3a6a' } };
      const [ex, ey] = this.nearestWalkable(ei, ej) ?? [ei, ej];
      const el = this.makeWalker(look, ex, ey, 'elder');
      el.dir = 'sw'; el.wait = 1e9; el.speed = 0;
      this.walkers.push(el);
    }
    if (info.kind === 'terrace') {
      // 문 양옆을 지키는 천사 둘 (말을 걸면 한마디)
      for (const [i, j] of [[info.clerk!.i - 3, 3], [info.clerk!.i + 3, 3]] as const) {
        const a = this.makeWalker(this.npcLook('angel'), i, j, 'angel');
        a.dir = 'sw'; a.wait = 1e9; a.speed = 0;
        this.giveWings(a, 0xf8f4ea);
        this.walkers.push(a);
      }
    }
    if (info.kind === 'rebirth') {
      // 지옥 로비: 다른 창구 넷의 상담관 (흰 셔츠·회색 조끼)과 창구마다 줄 선 영혼들, 대기 의자 둘레의 사람들
      for (let k = 0; k < 5; k++) {
        if (k === 2) continue; // 가운데 = 파샤르
        const i0 = 2 + k * 4;
        const offLook = randomSoulLook(true);
        offLook.cols = { ...offLook.cols, 3: '#e8e8e4', 9: '#e8e8e4', 4: '#3a3e44' };
        const o = this.makeWalker(offLook, i0 + 1, 1, 'soul');
        o.dir = 'sw'; o.wait = 1e9; o.speed = 0;
        this.walkers.push(o);
        for (let q = 0; q < 2 + ((k * 5) % 3); q++) {
          const s2 = this.makeWalker(randomSoulLook(), i0 + 1, 4 + q, 'soul');
          s2.dir = 'ne'; s2.wait = 1e9; s2.speed = 0;
          this.walkers.push(s2);
        }
      }
      for (const [i, j] of [[3, 10], [9, 11], [15, 11], [19, 10], [6, 13], [17, 14]] as const) {
        const s3 = this.makeWalker(randomSoulLook(), i, j, 'soul');
        s3.dir = (['se', 'sw', 'ne', 'nw'] as Dir[])[(i + j) % 4]; s3.wait = 1e9; s3.speed = 0;
        this.walkers.push(s3);
      }
    }
    const seats = info.seats.slice();
    if (info.kind === 'shore') {
      // 24차 경계: 마른 모래 위에 가부좌한 완성자들 — 바다를 본다
      info.seats.forEach(([i, j], k) => {
        const m = this.makeWalker(monkLook(k), i, j, 'soul');
        m.still = 'lotus'; m.dir = k % 2 ? 'ne' : 'nw'; m.wait = 1e9; m.speed = 0; m.monk = true;
        this.walkers.push(m);
      });
    }
    const n = info.kind === 'rebirth' || info.kind === 'terrace' || info.kind === 'shore' ? 0 : Math.min(seats.length, info.rest ? 2 : 3, 1 + (info.from.b % 3));
    for (let k = 0; k < n; k++) {
      const [i, j] = seats.splice((info.from.b * 7 + k * 3) % seats.length, 1)[0];
      const w = this.makeWalker(this.npcLook('passer'), i, j, 'passer');
      w.wait = 6 + Math.random() * 20;
      this.walkers.push(w);
    }
    if (chaser) this.chaserDue = { t: 2.5, ...chaser };
  }

  /** 방: 쫓아오던 대식자가 문으로 들어온다 (쉬는 곳이면 문턱에서 멈췄다가 돌아간다) · 나가는 매트 */
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
    if (this.workIn && !this.dead) {
      const w = this.workIn;
      w.earned += WAGE_PER_SEC * w.job.mult * dt;
      if (this.workStrain(w.job, dt)) { this.stopWorkInside(); return; }
      if (this.shiftStiff(dt)) { this.stopWorkInside(true); return; }
      this.workTick -= dt;
      if (this.workTick <= 0) { this.workTick = 1; this.hooks.work({ name: w.name, earned: w.earned }); }
      if (!p.path.length) {
        w.wait -= dt;
        if (w.wait <= 0) {
          // 다음 할 일 자리: 카운터 앞·진열대 앞·빈자리 (나가는 매트는 빼고)
          const spots: [number, number][] = [];
          for (let j = 1; j < this.zone.H - 1; j++) for (let i = 1; i < this.zone.W - 1; i++) if (!this.zone.blocked[j * this.zone.W + i] && !(i === info.exit.i && j === info.exit.j) && j < info.exit.j - 1) spots.push([i, j]);
          const [ti, tj] = spots[Math.floor(Math.random() * spots.length)] ?? [info.exit.i, info.exit.j - 2];
          this.walkTo(ti, tj);
          w.wait = 1.2 + Math.random() * 2.6;
        }
      }
    }
    if (info.kind !== 'shore' && !this.workIn && !this.leaving && !this.dead && !p.path.length && Math.floor(p.x) === info.exit.i && Math.floor(p.y) === info.exit.j && this.time > 0.6) {
      this.cancelActs();
      this.leaving = true;
      setTimeout(() => this.hooks.leaveBuilding(), 0); // 이 장면의 틱이 끝난 뒤에 버린다
    }
  }
  /** 방에서 나갈 때 아직 쫓고 있는 대식자 (밖으로 따라 나온다) */
  chaserLeft(): { monster: boolean; hp: number } | null {
    const w = this.chaserDue?.w;
    if (!w || w.sprite.destroyed || w.down > 0 || this.chaserDue?.stay !== undefined || w.giveUp) return null;
    return { monster: !!w.monster, hp: w.hp };
  }
  /** 거리: 들어가는 순간 쫓아오던 대식자 (8칸 안) → 방으로 따라 들어온다 */
  takeChaser(): { monster: boolean; hp: number } | null {
    const p = this.player;
    const s = this.walkers.find((w) => w.kind === 'suturer' && w.target === p && w.down <= 0 && !w.giveUp && Math.hypot(w.x - p.x, w.y - p.y) < 8);
    if (!s) return null;
    this.removeWalker(s);
    return { monster: !!s.monster, hp: s.hp };
  }
  /** 거리로 돌아왔을 때 따라 나오는 대식자 */
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
    const n = h.floor === 1 ? 22 : 12; // 1층은 넓어진 만큼 더
    for (let k = 0; k < n; k++) this.spawnMonster();
    if (!this.bossDown) this.spawnBoss();
    // (환생관 파샤르는 1층 불탄 도시 골목 끝 '지옥 로비' 안 상담 책상으로 옮겼다)
    this.featureG.zIndex = 0;
    this.objects.addChild(this.featureG);
    this.drawFeatures();
    if (floorDef(h.floor).theme === 'market' || floorDef(h.floor).theme === 'forge') {
      const st = Texture.from(bloodLavaTile(floorDef(h.floor).theme === 'forge')); st.source.scaleMode = 'nearest';
      const M = 2400, x0 = -this.zone.H * (TW / 2) - M, x1 = this.zone.W * (TW / 2) + M, y1 = (this.zone.W + this.zone.H) * (TH / 2) + M;
      this.sea = new TilingSprite({ texture: st, width: x1 - x0, height: y1 + M });
      this.sea.position.set(x0, -M);
      this.ground.addChildAt(this.sea, 0);
    }
    this.liquidG.zIndex = -1;
    this.objects.addChild(this.liquidG);
    this.gfxLow.zIndex = 0.6;
    this.gfxTop.zIndex = 1e6 - 6;
    this.objects.addChild(this.gfxLow, this.gfxTop);
    // 2층 들판의 노름꾼 탈루스 (악마가 다가오면 산탄총 한 방)
    if (h.talus) {
      const tw = this.makeWalker(TALUS_LOOK, h.talus.i, h.talus.j, 'talus', 'shotgun');
      this.dotArt(tw, 'sprite-talus');
      tw.dir = 'sw'; tw.wait = 1e9; tw.maxHp = tw.hp = 99999; tw.shotT = 0;
      this.walkers.push(tw);
    }
    // 25차: 1층 마을 바깥을 맴도는 마스크 팔이 소녀 (아무도 치지 않고, 아무도 그를 치지 못한다)
    if (h.floor === 1) {
      const at = this.maskGirlSpot() ?? [h.rest.i + h.rest.r + 4, h.rest.j];
      const mg = this.makeWalker(MASKGIRL_LOOK, at[0], at[1], 'maskgirl');
      this.dotArt(mg, 'sprite-maskgirl');
      mg.home = [h.rest.i, h.rest.j]; mg.speed = 0.8; mg.wait = 2; mg.maxHp = mg.hp = 99999;
      this.walkers.push(mg);
    }
    const gk = floorDef(h.floor).guard;
    if (gk && GUARDS[gk]) for (let k = 0; k < 2; k++) this.walkers.push(this.makeGuard(GUARDS[gk], k));
    // 위층 길 들머리를 지키는 문지기 둘 (1층 골목 · 2층 여울 · 3층 나루터) — 통행세를 받는다
    if (gk && GUARDS[gk]) for (const post of [2, 3]) this.walkers.push(this.makeGuard(GUARDS[gk], post));
    this.setupVillage();
  }

  /** 마을 사람들: 앉거나 누운 지친 영혼, 고깃간·넝마 장사꾼, 들판으로 나가 싸우는 영혼 (사람마다 피부·머리·옷이 다르다) */
  private setupVillage() {
    const h = this.zone.hell!;
    const R = (a: number) => Math.floor(Math.random() * a);
    const soulLook = randomSoulLook;
    const DIR4: Dir[] = ['se', 'sw', 'ne', 'nw'];
    for (const so of h.souls) {
      const w = this.makeWalker(soulLook(), so.i, so.j, 'soul');
      w.still = so.pose === 'stand' ? undefined : so.pose;
      w.dir = DIR4[so.d % 4];
      // 24차: 앉은 영혼은 가까운 모닥불·화톳불을 바라본다 (빌던 이는 악마상 그대로)
      if (so.pose === 'sit' && !so.pray) {
        let best: Prop | null = null, bd = 9;
        for (const q of this.zone.props) if ((q.kind === 'bonfire' || q.kind === 'campfire') && Math.hypot(q.i - so.i, q.j - so.j) < bd) { bd = Math.hypot(q.i - so.i, q.j - so.j); best = q; }
        if (best) w.dir = dirFromTile(best.i + 0.5 - (so.i + 0.5), best.j + 0.5 - (so.j + 0.5), w.dir);
      }
      if (so.pray) w.pray = true;
      w.wait = 1e9; w.speed = 0; w.maxHp = w.hp = 400;
      this.walkers.push(w);
    }
    for (const v of h.vendors) {
      const sk = SKINS[R(SKINS.length)];
      const sex = (p: number): 'm' | 'f' => (Math.random() < p ? 'm' : 'f');
      // 22차: 장사꾼마다 차림이 다르다 — 고깃간(앞치마·식칼) · 물장수(푸른 두건) · 넝마(우비) · 약장수(바랜 흰 겉옷) · 장사꾼(덕지덕지 기운 옷) · 무기상(가죽·활) · 호텔 지배인(붉은 조끼) · 서큐버스(층마다 다른 모습)
      const looks: Record<HellVendor, Look> = {
        butcher: { sex: sex(0.6), build: 2, skin: 0, hair: 5, hairColor: 0, top: 0, bottom: 0, outfit: 'casual', cols: { 1: sk, 10: sk, 2: '#1a1410', 3: '#8a7a6a', 4: '#3a2a22', 9: '#8a7a6a', 5: '#2a1a10' } },
        junk: { sex: sex(0.5), build: 0, skin: 0, hair: 1, hairColor: 0, top: 0, bottom: 0, outfit: 'raincoat', cols: { 1: sk, 10: sk, 8: '#3a3430', 3: '#2a2420', 4: '#2a2420', 5: '#1a1410' } },
        water: { sex: sex(0.5), build: 0, skin: 0, hair: 3, hairColor: 0, top: 0, bottom: 0, outfit: 'raincoat', cols: { 1: sk, 10: sk, 8: '#2e4458', 3: '#22303a', 4: '#1e2228', 5: '#141618' } },
        medic: { sex: sex(0.5), build: 1, skin: 0, hair: 4, hairColor: 0, top: 0, bottom: 0, outfit: 'raincoat', cols: { 1: sk, 10: sk, 8: '#b8b098', 3: '#8a846e', 4: '#3a362e', 5: '#1a1814' } },
        trader: { sex: sex(0.7), build: 2, skin: 0, hair: 0, hairColor: 0, top: 0, bottom: 0, outfit: 'casual', cols: { 1: sk, 10: sk, 2: '#2a1a10', 3: '#7a5a3a', 4: '#4a5a3a', 9: '#8a3a2a', 5: '#2a1a10' } },
        arms: { sex: sex(0.6), build: 2, skin: 0, hair: 5, hairColor: 0, top: 0, bottom: 0, outfit: 'casual', cols: { 1: sk, 10: sk, 2: '#1a1410', 3: '#4a3424', 4: '#2a2018', 9: '#4a3424', 5: '#120c08' } },
        hotel: { sex: sex(0.6), build: 1, skin: 0, hair: 0, hairColor: 0, top: 0, bottom: 0, outfit: 'casual', cols: { 1: sk, 10: sk, 2: '#0e0a08', 3: '#5a1a14', 4: '#1a1414', 9: '#e8e0d0', 5: '#0e0a08' } },
        succubus: SUCCUBUS_LOOK[h.floor] ?? SUCCUBUS_LOOK[1],
      };
      const weapon = v.kind === 'butcher' ? 'knife' : v.kind === 'arms' ? 'bow' : null;
      const w = this.makeWalker(looks[v.kind], v.i, v.j, 'vendor', weapon);
      w.vend = v.kind; w.dir = 'sw'; w.wait = 1e9; w.speed = 0; w.maxHp = w.hp = 400;
      if (v.kind === 'succubus') this.dressSuccubus(w, h.floor);
      this.walkers.push(w);
    }
    // 환생하려고 들판으로 나가 괴물과 싸우는 영혼들 (1층 6 · 2층 4 · 3층 3): 다치면 마을로 돌아와 쉰다
    const nF = h.floor === 1 ? 6 : h.floor === 2 ? 4 : 3;
    for (let k = 0; k < nF; k++) {
      const look = soulLook();
      look.outfit = 'casual';
      const weapon = (['bat', 'pipe', 'hammer', 'knife', 'sword', 'hatchet', 'shovel'] as const)[R(7)];
      const g = this.villageGate(k);
      const w = this.makeWalker(look, g[0], g[1], 'fighter', weapon, Math.random() < 0.5 ? ['vest'] : ['jacket']);
      w.maxHp = w.hp = 900 + h.floor * 250;
      w.speed = 1.05;
      w.home = [h.rest.i, h.rest.j];
      w.wait = Math.random() * 4;
      this.walkers.push(w);
    }
  }
  /** 마을 문 바깥 한 칸 (k번째 문) */
  private villageGate(k: number): [number, number] {
    const r = this.zone.hell!.rest, R2 = r.r + 2;
    const g: [number, number][] = [[r.i, r.j - R2], [r.i - R2, r.j], [r.i + R2, r.j], [r.i, r.j + R2]];
    const [i, j] = g[k % 4];
    return randomWalkTileNear(this.zone, i, j, 2, ['walk', 'lot', 'park', 'soi', 'cross']) ?? [r.i, r.j];
  }
  /** 싸우는 영혼: 마을 둘레 들판을 돌다 괴물을 보면 덤빈다. 체력이 3할 아래면 마을로 돌아가 다 찰 때까지 쉰다 */
  private thinkFighter(w: Walker, moving: boolean, dt: number) {
    const h = this.zone.hell!;
    const home = this.inRest(w.x, w.y);
    if (home && w.hp < w.maxHp) w.hp = Math.min(w.maxHp, w.hp + w.maxHp * 0.12 * dt);
    if (w.hp < w.maxHp * 0.3 && !home) {
      w.target = null;
      if (!moving) { const path = findPath(this.zone, Math.floor(w.x), Math.floor(w.y), h.rest.i, h.rest.j); if (path) w.path = path; }
      return;
    }
    if (home && w.hp < w.maxHp * 0.95) { w.target = null; return; }
    if (w.target) return;
    if (Math.random() < dt * 3) {
      let best: Walker | null = null, bd = 7;
      for (const m of this.walkers) {
        if (!m.mdef || m.mdef.boss || m.down > 0) continue;
        const d = Math.hypot(m.x - w.x, m.y - w.y);
        if (d < bd) { bd = d; best = m; }
      }
      if (best) { w.target = best; w.repathT = 0; if (!best.target || best.target === w) { best.target = w; best.firstBy ??= best; } if (Math.random() < 0.3) this.bubble(w, t().fighterShout[Math.floor(Math.random() * t().fighterShout.length)]); return; }
    }
    if (moving) return;
    w.wait -= dt;
    if (w.wait > 0) return;
    w.wait = 3 + Math.random() * 6;
    const sp = h.spawns[Math.floor(Math.random() * h.spawns.length)];
    if (!sp || Math.hypot(sp[0] - h.rest.i, sp[1] - h.rest.j) > h.rest.r + 22) return;
    const path = findPath(this.zone, Math.floor(w.x), Math.floor(w.y), sp[0], sp[1]);
    if (path) w.path = path.slice(0, 40);
  }
  private reviveFighter(w: Walker) {
    const [i, j] = this.villageGate(Math.floor(Math.random() * 4));
    w.x = i + 0.5; w.y = j + 0.5; w.path = []; w.target = null; w.hp = w.maxHp; w.act = null; w.pend = null;
  }
  /** 구르마가 배불러 드러눕는다: 이번에는 싸우지 않고 여울을 막지 않는다 */
  gurmaSleep(w?: Walker) {
    const g = w ?? this.walkers.find((x) => x.mdef?.key === 'gurma');
    if (!g) return;
    g.asleep = true; g.target = null; g.path = []; g.beg = false;
    g.act = { anim: 'fall', t: 0 };
    g.down = 0;
    this.bubble(g, t().gurmaFull);
    this.bossDown = true;
    this.drawFeatures();
  }

  // ───────── 떨어진 물건 (지옥 괴물이 드물게) ─────────
  private loots: { x: number; y: number; key: string; sprite: Container; life: number }[] = [];
  dropLoot(x: number, y: number, key: string, life = 180) {
    const it = ITEMS.find((q) => q.key === key);
    if (!it) return;
    // 26차: 걸어갈 수 없는 칸(건물 벽·울타리)에 떨어지면 주울 수 없다 — 가장 가까운 바닥으로
    if (!walkable(this.zone, Math.floor(x + 0.25), Math.floor(y + 0.2))) { const to = this.nearestWalkable(Math.floor(x), Math.floor(y)); if (to) { x = to[0] + 0.25; y = to[1] + 0.3; } }
    const box = new Container();
    const glow = new Graphics().ellipse(0, 0, 9, 4).fill({ color: 0xffd27a, alpha: 0.35 });
    const ic = new Sprite(Texture.from(iconFor(it)));
    ic.texture.source.scaleMode = 'nearest';
    ic.anchor.set(0.5, 0.85); ic.scale.set(0.55);
    box.addChild(glow, ic);
    const cx = x + 0.25, cy = y + 0.2;
    const [sx, sy] = iso(cx, cy);
    box.position.set(sx, sy);
    box.zIndex = cx + cy - 0.35;
    this.objects.addChild(box);
    this.loots.push({ x: cx, y: cy, key, sprite: box, life });
  }
  /** 쓰러진 자리에 들고 있던 노전과 물건을 떨어뜨린다 (오래 남는다) */
  dropOnDeath(notes: number, item: string | null) {
    const p = this.player;
    if (notes > 0) { this.dropCoin(p.x, p.y, notes, false, true); const c = this.coins[this.coins.length - 1]; c.life = 600; c.claimed = false; }
    if (item) this.dropLoot(p.x + 0.5, p.y + 0.2, item, 600);
  }
  private updateLoot(dt: number) {
    const p = this.player;
    for (let k = this.loots.length - 1; k >= 0; k--) {
      const l = this.loots[k];
      l.life -= dt;
      l.sprite.children[1].y = Math.sin(this.time * 3 + k) * 1.5;
      const close = !this.dead && Math.hypot(l.x - p.x, l.y - p.y) < 1.0;
      if (close) { this.hooks.loot(l.key); const it = ITEMS.find((q) => q.key === l.key); if (it) this.float(p, `+ ${it.name[lang()]}`, '#ffd27a'); }
      if (close || l.life <= 0) { l.sprite.destroy({ children: true }); this.loots.splice(k, 1); }
    }
  }

  /** 경비병 순찰로: 마을 가운데(모닥불·공동 식탁·등불 가게 앞) ↔ 문 안쪽. 둘이 네 문을 나눠 돈다 */
  private patrolOf(post: number): [number, number][] {
    const r = this.zone.hell!.rest;
    if (post >= 2) { const pp = this.zone.hell!.posts[post - 2]; return [walkable(this.zone, pp[0], pp[1]) ? pp : randomWalkTileNear(this.zone, pp[0], pp[1], 2, ['walk', 'lot', 'park', 'soi', 'cross']) ?? pp]; } // 위층 길 문지기: 제자리
    const C: [number, number] = [r.i, r.j], In = r.r - 1;
    const pts: [number, number][] = post === 0
      ? [[C[0] + 2, C[1] + 2], [C[0], C[1] - In], [C[0] - 1, C[1] - 1], [C[0] - In, C[1]]]
      : [[C[0] - 2, C[1] + 2], [C[0] + In, C[1]], [C[0] + 1, C[1] + 1], [C[0], C[1] + In]];
    return pts.map(([i, j]) => (walkable(this.zone, i, j) ? [i, j] : randomWalkTileNear(this.zone, i, j, 3, ['walk', 'lot', 'park', 'soi']) ?? [C[0], C[1]]) as [number, number]);
  }
  private makeGuard(g: GuardDef, post: number): Walker {
    const look: Look = { sex: 'm', build: 1, skin: 0, hair: 0, hairColor: 0, top: 0, bottom: 0, outfit: g.body, cols: g.cols };
    const [i, j] = this.patrolOf(post)[0];
    const w = this.makeWalker(look, i, j, 'guard', g.weapon);
    w.gdef = g;
    w.size = 1.14; // 마을 괴물보다 한 뼘 크다
    w.post = post;
    w.patrolK = 1;
    w.maxHp = w.hp = g.hp;
    w.speed = g.speed;
    w.voice = 0.7 + Math.random() * 0.15;
    w.wait = 1 + Math.random() * 2;
    return w;
  }
  /** 휴식 마을 둘레 (울타리 안 + 바깥 extra칸까지의 정사각형) */
  private nearRest(x: number, y: number, extra: number) {
    const r = this.zone.hell?.rest;
    return !!r && Math.max(Math.abs(x - (r.i + 0.5)), Math.abs(y - (r.j + 0.5))) < r.r + extra;
  }
  /** 내가 마을 둘레에서 싸움을 걸었다: 가까운 경비병이 1초쯤 경고하고 제압하러 온다. 맞은 경비병은 바로 */
  private guardAlarm(hitGuard: Walker | null) {
    const L = t();
    const p = this.player;
    this.guardHostAt = this.time;
    for (const g of this.walkers) {
      if (!g.gdef || g.down > 0 || g.target === p) continue;
      if (g === hitGuard) { g.target = p; g.warnT = 0; this.bubble(g, L.guardWarn[Math.floor(Math.random() * L.guardWarn.length)]); continue; }
      if (Math.hypot(g.x - p.x, g.y - p.y) > 20 || (g.warnT ?? 0) > 0) continue;
      g.warnT = 1;
      g.path = [];
      g.dir = dirFromTile(p.x - g.x, p.y - g.y, g.dir);
      this.bubble(g, L.guardWarn[Math.floor(Math.random() * L.guardWarn.length)]);
    }
  }
  /** 체력 1까지 제압된 영혼을 마을 둘레 바깥으로 내던진다 */
  private evict(by: Walker) {
    const p = this.player, r = this.zone.hell!.rest;
    const L = t();
    this.guardHostAt = -99;
    for (const g of this.walkers) if (g.gdef && g.target === p) { g.target = null; g.warnT = 0; }
    this.cancelActs();
    const dx = p.x - (r.i + 0.5), dy = p.y - (r.j + 0.5), d = Math.hypot(dx, dy) || 1;
    const far = r.r + 9;
    let spot: [number, number] | null = null;
    for (let n = 0; n < 8 && !spot; n++) {
      const s = randomWalkTileNear(this.zone, Math.floor(r.i + 0.5 + (dx / d) * far), Math.floor(r.j + 0.5 + (dy / d) * far), 3 + n, ['walk', 'lot', 'park', 'soi']);
      if (s && !this.nearRest(s[0] + 0.5, s[1] + 0.5, 7)) spot = s;
    }
    this.bubble(by, by.gdef!.line[lang()]);
    if (!spot) return;
    p.x = spot[0] + 0.5; p.y = spot[1] + 0.5; p.path = []; p.kb = undefined;
    p.act = { anim: 'hit', t: 0 }; p.pend = null;
    this.rippleAt(spot[0], spot[1]);
    this.shakeT = Math.max(this.shakeT, 0.3); this.shakeA = Math.max(this.shakeA, 5);
    this.hooks.say(by.gdef!.name[lang()], L.guardEvict);
  }
  /** 경비병의 기술: 재문지기 = 곤봉으로 내려쳐 크게 밀어냄 · 빈그릇귀 = 진흙 파문으로 비틀거리고 느려짐 · 봉랍귀 = 붉은 봉인 낙인 */
  private guardSpecial(g: Walker, to: Walker) {
    const sp = g.gdef!.special;
    if (sp === 'push') {
      const dx = to.x - g.x, dy = to.y - g.y, d = Math.hypot(dx, dy) || 1;
      to.kb = { dx: (dx / d) * 1.5, dy: (dy / d) * 1.5, t: 0.26 };
      this.gfx.push({ kind: 'slam', x: g.x + (dx / d) * 0.8, y: g.y + (dy / d) * 0.8, t: 0 });
    } else if (sp === 'mud') {
      to.slowT = 2.6;
      to.atkT = Math.max(to.atkT, 0.7); // 비틀거리는 동안 바로 치지 못한다
      this.gfx.push({ kind: 'mud', x: to.x, y: to.y, t: 0 });
    } else to.sealT = 5;
  }
  /** 경비병 효과 그리기 */
  private drawGuardFx(dt: number) {
    const lo = this.gfxLow, top = this.gfxTop;
    lo.clear(); top.clear();
    for (const e of this.gfx) e.t += dt;
    this.gfx = this.gfx.filter((e) => e.t < 0.7);
    for (const e of this.gfx) {
      const a = e.t / 0.7, [x, y] = iso(e.x, e.y);
      if (e.kind === 'slam') {
        const r = 10 + a * 46;
        lo.ellipse(x, y, r, r / 2).stroke({ color: 0xd8ccb0, width: 3 * (1 - a) + 1, alpha: 1 - a });
        lo.ellipse(x, y, r * 0.6, r * 0.3).fill({ color: 0x6a5a4a, alpha: 0.35 * (1 - a) });
        for (let k = 0; k < 6; k++) { const an = k * 1.05 + 0.3; lo.moveTo(x, y).lineTo(x + Math.cos(an) * r * 0.7, y + Math.sin(an) * r * 0.35).stroke({ color: 0x2a2018, width: 1.5, alpha: 1 - a }); }
      } else {
        for (const k of [0, 0.35]) { const b = Math.max(0, a - k) / (1 - k); if (b <= 0) continue; const r = 8 + b * 34; lo.ellipse(x, y, r, r / 2).stroke({ color: 0x6a5232, width: 3, alpha: 0.85 * (1 - b) }); }
        lo.ellipse(x, y, 16, 7).fill({ color: 0x4a3a22, alpha: 0.5 * (1 - a) });
      }
    }
    for (const w of this.walkers) {
      if (w.down > 0) { w.slowT = 0; w.sealT = 0; continue; }
      if (w.slowT && w.slowT > 0) {
        w.slowT -= dt;
        const [x, y] = iso(w.x, w.y);
        lo.ellipse(x, y + 1, 13, 5).fill({ color: 0x4a3a22, alpha: 0.6 });
        lo.ellipse(x - 4, y, 3, 1.5).fill({ color: 0x8a6a42, alpha: 0.7 });
      }
      if (w.sealT && w.sealT > 0) {
        w.sealT -= dt;
        const [x, y0] = iso(w.x, w.y), y = y0 - 58 * (w.size ?? 1), sp = this.time * 2.2;
        top.circle(x, y, 8).fill(0x8a1a12).stroke({ color: 0xc9a23e, width: 1.5 });
        top.circle(x, y, 5).stroke({ color: 0xff5a3a, width: 1 });
        for (let k = 0; k < 4; k++) { const an = sp + k * Math.PI / 2; top.moveTo(x, y).lineTo(x + Math.cos(an) * 4.5, y + Math.sin(an) * 4.5).stroke({ color: 0xffb08a, width: 1 }); }
        for (let k = 0; k < 5; k++) { const an = -sp * 0.6 + k * 1.2566; top.circle(x + Math.cos(an) * 11, y + Math.sin(an) * 11, 1.2).fill({ color: 0xc9a23e, alpha: 0.8 }); }
      }
    }
  }
  /** 탈루스: 자리에서 노름판을 지키다가, 악마(괴물)가 7칸 안에 들어오면 산탄총 한 방에 쓰러뜨린다 */
  private thinkTalus(w: Walker, dt: number) {
    const p = this.player;
    w.shotT = Math.max(0, (w.shotT ?? 0) - dt);
    w.target = null; w.path = [];
    let best: Walker | null = null, bd = 7;
    for (const m of this.walkers) {
      if (!m.mdef || m.mdef.boss || m.down > 0) continue;
      const d = Math.hypot(m.x - w.x, m.y - w.y);
      if (d < bd) { bd = d; best = m; }
    }
    if (best) {
      w.dir = dirFromTile(best.x - w.x, best.y - w.y, w.dir, !!w.cs?.eight);
      if (w.shotT <= 0 && (!w.act || w.act.anim !== 'shoot')) {
        w.shotT = 1.5;
        const tg = best;
        w.act = { anim: w.cs?.attack ?? 'shoot', t: 0 };
        setTimeout(() => {
          if (w.sprite.destroyed || tg.down > 0 || tg.sprite.destroyed) return;
          sfx.gunshot(this.spotOf(w)); sfx.gunshot(this.spotOf(w));
          this.swing(w, tg, true);
          this.shakeT = Math.max(this.shakeT, Math.hypot(p.x - w.x, p.y - w.y) < 10 ? 0.12 : 0); this.shakeA = Math.max(this.shakeA, 2.5);
          const [bx, by] = iso(tg.x, tg.y);
          for (let k = 0; k < 14; k++) { const a = Math.random() * Math.PI * 2, v = 60 + Math.random() * 90; this.sparks.push({ x: bx, y: by - 26, vx: Math.cos(a) * v, vy: Math.sin(a) * v * 0.7 - 20, t: 0.2 + Math.random() * 0.12, col: k % 3 ? 0x9a1a10 : 0xffd27a }); }
          this.impactFx(w, tg, true, 'gun');
          tg.hp = 0;
          this.knockDown(tg, w);
          if (Math.random() < 0.5) this.bubble(w, t().talusShoot[Math.floor(Math.random() * t().talusShoot.length)]);
        }, 180);
      }
      return;
    }
    // 가까이 온 사람은 돌아본다
    if (Math.hypot(p.x - w.x, p.y - w.y) < 5) w.dir = dirFromTile(p.x - w.x, p.y - w.y, w.dir);
  }

  /** 경비병의 평소 행동: 순찰 → 감지 → 개입 → 복귀 */
  private thinkGuard(w: Walker, moving: boolean, dt: number) {
    const p = this.player, L = t();
    if (this.raid && !w.target) { w.path = []; return; } // 습격 중: 휴전 협약대로 지켜보기만 한다 (자기를 친 자에게만 맞선다)
    if (w.hp < w.maxHp && !w.target) w.hp = Math.min(w.maxHp, w.hp + w.maxHp * 0.03 * dt);
    // 경고 중: 1초 동안 노려보다가, 그동안에도 싸움이 이어졌으면 제압하러 간다
    if (w.warnT && w.warnT > 0) {
      w.warnT -= dt;
      w.dir = dirFromTile(p.x - w.x, p.y - w.y, w.dir);
      if (w.warnT <= 0 && this.time - this.guardHostAt < 3 && !this.dead) w.target = p;
      return;
    }
    // 사람에 대한 적대는 마지막 싸움 뒤 3초면 풀린다
    if (w.target === p && (this.time - this.guardHostAt > 3 || this.dead)) {
      w.target = null;
      this.bubble(w, L.guardCalm[Math.floor(Math.random() * L.guardCalm.length)]);
    }
    // 마을과 둘레(울타리 밖 6칸)에 들어온 괴물을 잡는다
    if (!w.target && Math.random() < dt * 5) {
      let best: Walker | null = null, bd = 15;
      for (const m of this.walkers) {
        if (!m.mdef || m.down > 0 || !this.nearRest(m.x, m.y, 6)) continue;
        const d = Math.hypot(m.x - w.x, m.y - w.y);
        if (d < bd) { bd = d; best = m; }
      }
      if (best) { w.target = best; w.repathT = 0; if (Math.random() < 0.6) this.bubble(w, L.guardShout[Math.floor(Math.random() * L.guardShout.length)]); }
    }
    if (w.target || moving) return;
    w.wait -= dt;
    if (w.wait > 0) return;
    w.wait = 2.5 + Math.random() * 3;
    const pts = this.patrolOf(w.post ?? 0);
    const k = (w.patrolK ?? 0) % pts.length;
    w.patrolK = k + 1;
    const path = findPath(this.zone, Math.floor(w.x), Math.floor(w.y), pts[k][0], pts[k][1]);
    if (path) w.path = path;
  }

  /** 층의 길 그림: 위층 길(3층 나루터 · 2층 늪 여울 · 1층은 골목 끝 건물) + 남쪽 끝에서 아래로 내려가는 돌계단 */
  private drawFeatures() {
    const h = this.zone.hell;
    if (!h) return;
    const g = this.featureG;
    g.clear();
    if (h.exit === 'ferry') this.drawFerry(g, h);
    else if (h.exit === 'ford') this.drawFord(g, h);
    this.drawStairsDown(g, h);
    g.zIndex = 0.5;
  }

  /** 2층 늪 여울: 갈대 사이 징검돌·널빤지 길, 두개골 등을 단 길잡이 말뚝, 북쪽 끝은 짙은 안개. 구르마의 진흙 웅덩이 */
  private drawFord(g: Graphics, h: NonNullable<Zone['hell']>) {
    const [bx, by] = iso(h.boss.i + 0.5, h.boss.j + 0.5);
    g.ellipse(bx, by, 70, 34).fill({ color: 0x2a2414, alpha: 0.75 });
    g.ellipse(bx - 8, by + 4, 44, 20).fill({ color: 0x3a3018, alpha: 0.7 });
    for (let k = 0; k < 9; k++) { const a = k * 0.7; g.ellipse(bx + Math.cos(a) * 46, by + Math.sin(a) * 20, 5, 2).fill({ color: 0x5a4a28, alpha: 0.8 }); }
    // 길잡이 말뚝 (여울 양옆, 여섯 칸마다): 끝에 매단 두개골 등
    for (let j = h.up.j + 3; j < h.boss.j - 5; j += 6) {
      const wob = fordWob(j);
      for (const di of [-1, 2]) {
        const [x, y] = iso(h.up.i + wob + di + 0.5, j + 0.5);
        g.rect(x - 1.5, y - 26, 3, 28).fill(0x2a2216);
        g.circle(x, y - 28, 3).fill(0xd8ccb0);
        g.rect(x - 1.5, y - 29, 1, 1).fill(0x1a1410).rect(x + 0.5, y - 29, 1, 1).fill(0x1a1410);
        g.circle(x, y - 28, 6).fill({ color: 0xb8e06a, alpha: 0.18 });
      }
    }
    // 북쪽 끝: 늪 안개 (건너편이 보이지 않는다)
    for (let k = 0; k < 14; k++) {
      const [x, y] = iso(h.up.i - 6 + k * 1.1, h.up.j + (k % 3) * 0.6);
      g.ellipse(x, y - 6, 46, 18).fill({ color: 0x8a9a7a, alpha: 0.13 });
    }
  }

  /** 남쪽 끝 돌계단: 마을 쪽 계단 머리에서 맵 가장자리 너머 어둠으로 내려간다 (양옆 돌난간·횃불) */
  private drawStairsDown(g: Graphics, h: NonNullable<Zone['hell']>) {
    const D = h.down, H = this.zone.H;
    const sea = floorDef(h.floor).theme === 'market' || floorDef(h.floor).theme === 'forge';
    const stone = sea ? [0x4a2a24, 0x3a201c, 0x2a1612] : floorDef(h.floor).theme === 'swamp' ? [0x4a4c40, 0x3a3c32, 0x2a2c24] : [0x5a5652, 0x48443f, 0x34302c];
    const rows = H + 5 - D.j;
    for (let n = 0; n < rows; n++) {
      const j = D.j + n, drop = n < 2 ? 0 : (n - 1) * 5 + (j >= H ? (j - H + 1) * 6 : 0);
      const a = j >= H ? Math.max(0, 1 - (j - H + 1) * 0.28) : 1;
      const p1 = iso(D.i - 1.5, j), p2 = iso(D.i + 1.5, j), p3 = iso(D.i + 1.5, j + 1), p4 = iso(D.i - 1.5, j + 1);
      // 디딤판 윗면 + 앞 턱
      g.poly([p1[0], p1[1] + drop, p2[0], p2[1] + drop, p3[0], p3[1] + drop, p4[0], p4[1] + drop]).fill({ color: n % 2 ? stone[0] : stone[1], alpha: a });
      if (n >= 1) g.poly([p4[0], p4[1] + drop, p3[0], p3[1] + drop, p3[0], p3[1] + drop + 5, p4[0], p4[1] + drop + 5]).fill({ color: stone[2], alpha: a });
      g.moveTo(p4[0], p4[1] + drop).lineTo(p3[0], p3[1] + drop).stroke({ color: 0x14100c, width: 1, alpha: a * 0.8 });
      // 양옆 난간 (돌 기둥과 가로 돌)
      if (n >= 1) for (const side of [-1.5, 1.5]) {
        const [x, y] = iso(D.i + side + (side > 0 ? 0 : 0), j + 0.5);
        g.rect(x - 2, y + drop - 12, 4, 12).fill({ color: stone[1], alpha: a }).rect(x - 2, y + drop - 12, 4, 2).fill({ color: stone[0], alpha: a });
      }
    }
    // 아래쪽 어둠: 계단이 사라지는 곳
    const [ex, ey] = iso(D.i, H + 3);
    for (let k = 0; k < 5; k++) g.ellipse(ex, ey + 30, 120 - k * 18, 54 - k * 8).fill({ color: 0x050202, alpha: 0.22 });
    g.ellipse(ex, ey + 34, 30, 12).fill({ color: 0xc23a18, alpha: 0.16 });
    // 계단 머리의 횃불 둘
    for (const side of [-2.1, 2.1]) {
      const [x, y] = iso(D.i + side, D.j - 0.2);
      g.rect(x - 1.5, y - 26, 3, 26).fill(0x2a1c14);
      g.ellipse(x, y - 30, 3.5, 5).fill(0xff8a2a).ellipse(x, y - 31, 1.8, 3).fill(0xffd26a);
    }
  }

  /** 여울 끝(위층)·계단 끝(아래층)을 밟으면 저절로: 한 번 일어나면 그 자리를 떠났다 돌아와야 다시 */
  private edgeArm = { up: true, down: true };
  private edgeWalk(p: Walker, dt: number) {
    void dt;
    if (this.dead) return;
    const h = this.zone.hell!;
    const i = Math.floor(p.x), j = Math.floor(p.y);
    const atUp = h.exit === 'ford' && j <= h.up.j + 1 && Math.abs(i - h.up.i - 0.5) <= 2.5;
    const atDown = j >= this.zone.H - 2 && Math.abs(i - h.down.i) <= 1;
    if (atUp && this.edgeArm.up) { this.edgeArm.up = false; p.path = []; this.hooks.hellAct('up'); }
    if (!atUp && j > h.up.j + 3) this.edgeArm.up = true;
    if (atDown && this.edgeArm.down) { this.edgeArm.down = false; p.path = []; this.hooks.hellAct('down'); }
    if (!atDown && j < this.zone.H - 4) this.edgeArm.down = true;
  }

  /** 땅에서 솟은 손들이 주인공을 붙잡는다 (1층 골목 끝, 환생 로비 앞). on=false 면 천천히 가라앉는다 */
  private handsG = new Graphics();
  private hands: { a: number; r: number; t: number; h: number; sw: number }[] = [];
  private handsOn = false;
  handsFx(on: boolean) {
    this.handsOn = on;
    if (on && !this.hands.length) {
      this.hands = Array.from({ length: 14 }, (_, k) => ({ a: (k / 14) * Math.PI * 2 + Math.random() * 0.3, r: 0.45 + Math.random() * 0.9, t: -k * 0.07, h: 30 + Math.random() * 26, sw: Math.random() * 6 }));
      if (!this.handsG.parent) this.objects.addChild(this.handsG);
      this.shakeT = Math.max(this.shakeT, 0.4); this.shakeA = Math.max(this.shakeA, 3);
      this.player.path = [];
    }
  }
  private drawHands(dt: number) {
    const g = this.handsG;
    if (!this.hands.length) return;
    g.clear();
    const p = this.player;
    let alive = false;
    for (const hd of this.hands) {
      hd.t += this.handsOn ? dt : -dt * 1.5;
      const grow = Math.max(0, Math.min(1, hd.t / 0.7));
      if (grow > 0) alive = true;
      if (grow <= 0) continue;
      const bx0 = p.x + Math.cos(hd.a) * hd.r, by0 = p.y + Math.sin(hd.a) * hd.r * 0.8;
      const [bx, by] = iso(bx0, by0);
      const [px, py] = iso(p.x, p.y);
      const lean = (px - bx) * 0.45, h = hd.h * grow;
      const sway = Math.sin(this.time * 2.2 + hd.sw) * 2;
      const tx = bx + lean + sway, ty = by - h;
      g.ellipse(bx, by, 10, 4.5).fill({ color: 0x0a0604, alpha: 0.85 * grow }); // 땅이 갈라진 구멍
      g.ellipse(bx, by, 6, 2.5).fill({ color: 0x5a1a08, alpha: 0.6 * grow });
      // 팔: 아래는 굵고 위로 갈수록 가늘다, 팔꿈치에서 한 번 꺾인다
      const ex = (bx + tx) / 2 - lean * 0.25, ey = (by + ty) / 2 + 2;
      g.moveTo(bx, by).lineTo(ex, ey).lineTo(tx, ty).stroke({ color: 0x140e0c, width: 9, join: 'round' });
      g.moveTo(bx, by).lineTo(ex, ey).lineTo(tx, ty).stroke({ color: 0x4e463e, width: 6, join: 'round' });
      g.moveTo(bx - 1, by).lineTo(ex - 1, ey).lineTo(tx - 1, ty).stroke({ color: 0x6e665c, width: 2, join: 'round' });
      // 손바닥과 휘어진 손가락 다섯 (주인공 쪽으로 움켜쥔다)
      g.ellipse(tx, ty - 3, 6, 5).fill(0x625a50).stroke({ color: 0x140e0c, width: 1.5 });
      const dirx = Math.sign(px - tx) || 1;
      for (let f = 0; f < 5; f++) {
        const fx = tx - 5 + f * 2.5, fy = ty - 7;
        g.moveTo(fx, fy).lineTo(fx + dirx * (3 + grow * 3), fy - 7 + grow * 3).lineTo(fx + dirx * (6 + grow * 3), fy - 2).stroke({ color: 0x140e0c, width: 3, join: 'round' });
        g.moveTo(fx, fy).lineTo(fx + dirx * (3 + grow * 3), fy - 7 + grow * 3).lineTo(fx + dirx * (6 + grow * 3), fy - 2).stroke({ color: 0x5a524a, width: 1.6, join: 'round' });
      }
    }
    g.zIndex = p.x + p.y + 0.02;
    if (!alive && !this.handsOn) { this.hands = []; g.clear(); }
  }

  private ferryG = new Graphics();
  private ferryGlow: Sprite | null = null;
  private drawFerry(g: Graphics, h: NonNullable<Zone['hell']>) {
    const ui = h.up.i, uj = h.up.j;
    // 부두: 널빤지와 기둥 (기슭 → 바다)
    for (let jj = 3; jj < uj; jj += 0.34) {
      const p = [iso(ui - 0.05, jj), iso(ui + 1.05, jj), iso(ui + 1.05, jj + 0.28), iso(ui - 0.05, jj + 0.28)].flat();
      g.poly(p).fill(((jj * 3) | 0) % 2 ? 0x4a3020 : 0x3e281a).stroke({ color: 0x1a0e08, width: 1 });
    }
    for (const [pi, pj] of [[ui - 0.05, 3], [ui + 1.05, 3], [ui - 0.05, uj - 1], [ui + 1.05, uj - 1]] as [number, number][]) {
      const [x, y] = iso(pi, pj);
      g.rect(x - 2, y - 14, 4, 18).fill(0x2a1810).rect(x - 2, y - 14, 1.5, 18).fill(0x4a3020);
    }
    // 나룻배: 부두 끝에 옆으로 댄 검은 배 (선체 옆면 → 갑판 → 뱃전 → 가로 널 → 노 → 고물의 붉은 등롱)
    const f = this.ferryG;
    f.clear();
    const bj0 = 1.2, bj1 = 2.5, ba = ui - 1.6, bb = ui + 2.4, bm = (bj0 + bj1) / 2;
    const rim = [iso(ba, bj0), iso(bb, bj0), iso(bb + 0.5, bm), iso(bb, bj1), iso(ba, bj1), iso(ba - 0.5, bm)];
    const lift = (p: number[], d: number) => [p[0], p[1] - d];
    f.poly([...lift(rim[3], 6), ...lift(rim[4], 6), ...lift(rim[5], 6), ...lift(rim[5], -4), ...lift(rim[4], -6), ...lift(rim[3], -6), ...lift(rim[2], -4), ...lift(rim[2], 6)]).fill(0x24140c).stroke({ color: 0x0e0604, width: 1 });
    f.poly(rim.flatMap((p) => lift(p, 6))).fill(0x3a2418).stroke({ color: 0x5a3a24, width: 1.5 });
    const inner = [iso(ba + 0.2, bj0 + 0.2), iso(bb - 0.1, bj0 + 0.2), iso(bb + 0.25, bm), iso(bb - 0.1, bj1 - 0.2), iso(ba + 0.2, bj1 - 0.2), iso(ba - 0.2, bm)];
    f.poly(inner.flatMap((p) => lift(p, 4))).fill(0x1a0e08);
    for (const ti of [ui - 0.6, ui + 0.6, ui + 1.6]) { const a = iso(ti, bj0 + 0.15), b = iso(ti, bj1 - 0.15); f.moveTo(a[0], a[1] - 6).lineTo(b[0], b[1] - 6).stroke({ color: 0x5a3a24, width: 3 }); }
    { const a = iso(ui + 0.2, bj1 - 0.2), b = iso(ui + 1.4, bj1 + 0.9); f.moveTo(a[0], a[1] - 7).lineTo(b[0], b[1] + 2).stroke({ color: 0x6a4a2a, width: 2 }); f.ellipse(b[0], b[1] + 3, 5, 2.5).fill(0x6a4a2a); }
    const [sx, sy] = iso(ba - 0.2, bm);
    f.moveTo(sx, sy - 6).lineTo(sx, sy - 40).stroke({ color: 0x2a1810, width: 2.5 });
    f.moveTo(sx, sy - 40).lineTo(sx + 9, sy - 40).stroke({ color: 0x2a1810, width: 2 });
    f.ellipse(sx + 9, sy - 32, 6, 8).fill(0xa8140e).stroke({ color: 0x3a0a06, width: 1 });
    f.rect(sx + 5, sy - 41, 8, 2).fill(0x2a1810).rect(sx + 5, sy - 25, 8, 2).fill(0x2a1810);
    for (let k = -5; k <= 5; k += 2.5) f.moveTo(sx + 3, sy - 32 + k).lineTo(sx + 15, sy - 32 + k).stroke({ color: 0x7a0e0a, width: 1 });
    if (!this.bossDown) {
      // 층주가 살아 있는 동안: 배는 쇠사슬로 부두 기둥에 묶여 있다
      const a = iso(ui - 0.05, 3), b = iso(ui - 0.4, bj1 - 0.1);
      for (let k = 0; k <= 8; k++) { const tq = k / 8; f.ellipse(a[0] + (b[0] - a[0]) * tq, a[1] - 10 + (b[1] - a[1] - 2) * tq + Math.sin(tq * Math.PI) * 6, 2.2, 1.4).stroke({ color: 0x8a8680, width: 1 }); }
    }
    f.zIndex = ui + bm + 0.4;
    if (!f.parent) this.objects.addChild(f);
    if (!this.ferryGlow) {
      const gl = new Sprite(this.glowTex());
      gl.anchor.set(0.5); gl.scale.set(0.8); gl.tint = 0xff3a2a; gl.blendMode = 'add';
      gl.position.set(sx + 9, sy - 32);
      this.lights.addChild(gl);
      this.glows.push({ s: gl, i: Math.floor(ba), j: Math.floor(bm) });
      this.ferryGlow = gl;
    }
  }

  /** 층마다 일반 괴물 3종 중 하나를 내 둘레(휴식 공간 밖)에 세운다 */
  private spawnMonster(existing?: Walker) {
    const h = this.zone.hell!;
    const p = this.player;
    const def = floorDef(h.floor);
    const field = h.spawns.filter(([i, j]) => !this.nearRest(i + 0.5, j + 0.5, 8)); // 경비병 둘레 밖 들판
    const near = field.filter(([i, j]) => { const d = Math.hypot(i - p.x, j - p.y); return d > 10 && d < 30; });
    const pool = near.length ? near : field.length ? field : h.spawns;
    const [i, j] = pool[Math.floor(Math.random() * pool.length)];
    const m = MONSTERS[def.monsters[Math.floor(Math.random() * def.monsters.length)]];
    if (existing) this.removeWalker(existing);
    this.walkers.push(this.makeMonster(m, i, j));
    // 26차: 떼로 나오는 것 (재충): 곁에 몇 마리 더
    const kids = this.walkers.filter((x) => x.kid && x.down <= 0).length;
    for (let n = 1; n < (m.swarm ?? 1) && kids + n <= 8; n++) {
      const to = randomWalkTileNear(this.zone, i, j, 2, ['lot', 'walk', 'soi', 'park']);
      if (!to) continue;
      const k = this.makeMonster(m, to[0], to[1]);
      k.kid = true;
      this.walkers.push(k);
    }
  }
  private spawnBoss() {
    const h = this.zone.hell!;
    const m = MONSTERS[floorDef(h.floor).boss];
    const b = this.makeMonster(m, h.boss.i, h.boss.j);
    this.walkers.push(b);
  }
  /** 괴물 겉모습: 살·옷·빛 세 색 + 괴물마다 덮어쓰는 구역 색. 무기 쇠는 녹슨 쇳빛 (층주만 금빛) */
  private monsterLook(m: MonsterDef): Look {
    return { sex: 'm', build: 1, skin: 0, hair: 0, hairColor: 0, top: 0, bottom: 0, outfit: m.body, cols: { 1: m.skin, 3: m.cloth, 4: m.cloth, 5: '#1a1410', 6: m.glow, 9: m.cloth, 10: m.skin, 12: m.glow, 13: '#4a3422', 14: m.boss ? '#c9a23e' : '#7e7468', 15: '#140e0c', ...(m.cols ?? {}) } };
  }
  private makeMonster(m: MonsterDef, i: number, j: number): Walker {
    const look = this.monsterLook(m);
    const w = this.makeWalker(look, i, j, 'monster', m.weapon === undefined ? null : m.weapon ?? null);
    const f = this.zone.hell?.floor ?? 1;
    w.mdef = m;
    w.size = m.scale;
    w.maxHp = w.hp = Math.round(m.hp * (1 + 0.25 * (f - 1) * (m.boss ? 0 : 1))); // 26차: 무기 공격력 폭을 좁힌 만큼 층마다 덜 단단하게 (0.35 → 0.25)
    w.speed = m.speed;
    w.voice = 0.8 + Math.random() * 0.3;
    if (m.ghost) w.sprite.alpha = 0.72; // 회색 망령: 반쯤 비친다
    return w;
  }
  /** 휴식 공간 안인가 (싸움 불가, 괴물은 못 들어옴) */
  private inRest(x: number, y: number) {
    const r = this.zone.hell?.rest;
    if (this.raid) return false; // 4층부터: 결계가 걷힌 동안은 마을도 들판과 같다
    return !!r && Math.abs(x - (r.i + 0.5)) < r.r && Math.abs(y - (r.j + 0.5)) < r.r;
  }
  /** 4층부터의 습격: 결계가 걷힌 동안 (raidState 가 정한다) */
  private raid = false;
  private raidT = 0;
  private updateRaid(dt: number) {
    const h = this.zone.hell;
    if (!h || this.zone.interior) return;
    this.raidT -= dt;
    if (this.raidT > 0) return;
    this.raidT = 1;
    const on = raidState(h.floor).on;
    if (on === this.raid) return;
    this.raid = on;
    const L = t();
    this.hooks.notice(on ? L.raidStart : L.raidEnd);
    if (on) {
      // 마을 둘레에서 괴물 떼가 몰려든다 (그 층 괴물 여섯)
      const def = floorDef(h.floor), r = h.rest;
      for (let k = 0; k < 6; k++) {
        const a = (k / 6) * Math.PI * 2 + Math.random() * 0.5, d = r.r + 5 + Math.random() * 3;
        const spot = randomWalkTileNear(this.zone, Math.round(r.i + Math.cos(a) * d), Math.round(r.j + Math.sin(a) * d), 3, ['walk', 'lot', 'park', 'soi', 'cross']);
        if (!spot) continue;
        const m = this.makeMonster(MONSTERS[def.monsters[k % def.monsters.length]], spot[0], spot[1]);
        m.raider = true;
        m.home = [r.i, r.j];
        if (!this.dead && !this.invisible) { m.target = this.player; m.firstBy = m; }
        this.walkers.push(m);
      }
      for (const g of this.walkers) if (g.gdef) { g.target = null; g.path = []; this.bubble(g, L.raidGuard); }
    } else {
      // 결계가 다시 서면 마을 안에 남은 습격 괴물은 재가 되어 흩어진다
      for (const m of this.walkers.slice()) if (m.raider && m.down <= 0 && this.inRest(m.x, m.y)) this.removeWalker(m);
    }
  }

  private spawnCars() {
    const lanes = this.zone.lanes.slice().sort((a, b) => b.i1 - b.i0 - (a.i1 - a.i0));
    for (const lane of lanes) {
      const n = Math.max(1, Math.floor((lane.i1 - lane.i0) / 70));
      for (let k = 0; k < n && this.cars.length < MAX_CARS; k++) {
        const models = this.zone.city === 'seoul' ? SEOUL_CARS : CAR_MODELS; // 24차: 서울엔 툭툭·분홍 택시가 없다
        const ct = carSprite(models[Math.floor(Math.random() * models.length)], lane.dir);
        if (!ct) continue;
        const sprite = new Sprite(ct.tex);
        sprite.anchor.set(ct.ax, ct.ay);
        this.objects.addChild(sprite);
        const max = 4.5 + Math.random() * 2.5;
        // 같은 차로에서는 고르게 띄워 놓는다 (처음부터 겹치지 않게)
        const x = lane.i0 + ((k + 0.2 + Math.random() * 0.6) / n) * (lane.i1 - lane.i0);
        this.cars.push({ lane, x, speed: max, max, sprite, ax: ct.ax, ay: ct.ay, honked: false, bubbleT: 0 });
      }
    }
  }

  // ───────────────────────── 바깥에서 부르는 것 ─────────────────────────
  setLook(look: Look) {
    this.dress(this.player, look, this.gear.weapon, this.gear.armor);
  }
  setGear(g: Gear) {
    if (this.realm === 'heaven') g = { ...g, weapon: null, atk: 0, ranged: false }; // 20차: 천국에서는 맨주먹뿐
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
    if (info?.hidden) { this.removeRemote(id); return; } // 투명한 관리자는 그리지 않는다
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
  /** 빨간 표시가 새로 붙을 때: 대식자는 가끔만 온다 (35%, 20~60초 뒤, 한 번 다녀가면 5분은 쉼) */
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
    // 회피 굴림 (PvP 도 같다). 맞으면 피해 그대로 · 피해 감소 물건만 줄인다
    if (!this.rollHits(4)) { if (from) this.float(p, t().miss, '#d8e8ff'); return; }
    dmg = Math.max(1, Math.round(dmg) - (this.gear.dr ?? 0));
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
  /** 영격이 올랐다: 발밑에서 금빛 기둥이 솟고 빛 알갱이가 떠오른다 (체력도 가득) */
  private lvT = 0;
  private lvMotes: { a: number; r: number; y: number; v: number }[] = [];
  private lvG = new Graphics();
  rankUpFx() {
    this.lvT = 2.2;
    this.lvMotes = Array.from({ length: 26 }, () => ({ a: Math.random() * Math.PI * 2, r: 4 + Math.random() * 14, y: Math.random() * 10, v: 30 + Math.random() * 50 }));
    if (!this.lvG.parent) { this.lvG.blendMode = 'add'; this.lvG.eventMode = 'none'; this.objects.addChild(this.lvG); }
    const p = this.player;
    p.hp = p.maxHp;
    this.hooks.hp(p.hp, p.maxHp);
    this.shakeT = Math.max(this.shakeT, 0.25); this.shakeA = Math.max(this.shakeA, 2.5);
  }
  private drawRankUp(dt: number) {
    const g = this.lvG;
    if (this.lvT <= 0) { if (g.parent) g.clear(); return; }
    this.lvT -= dt;
    g.clear();
    const p = this.player;
    const [x, y] = iso(p.x, p.y);
    const k = Math.max(0, this.lvT) / 2.2, a = Math.min(1, (1 - k) * 6) * Math.min(1, k * 2.2); // 빨리 솟고 천천히 사라진다
    g.zIndex = p.x + p.y + 0.02;
    // 바닥 고리 (퍼져 나간다)
    const r = 8 + (1 - k) * 34;
    g.ellipse(x, y, r, r / 2).stroke({ color: 0xffd36a, width: 2, alpha: a * 0.8 });
    g.ellipse(x, y, r * 0.6, r * 0.3).stroke({ color: 0xfff1b8, width: 1, alpha: a * 0.6 });
    // 빛기둥 (안쪽 밝게)
    const H = 70 + (1 - k) * 40;
    for (const [w, al] of [[16, 0.16], [9, 0.24], [4, 0.4]] as const) g.rect(x - w / 2, y - H, w, H).fill({ color: 0xffc94a, alpha: al * a });
    // 떠오르는 빛 알갱이
    for (const m of this.lvMotes) {
      m.y += m.v * dt; m.a += dt * 2.4;
      const mx = x + Math.cos(m.a) * m.r, my = y - m.y + Math.sin(m.a) * m.r * 0.4;
      g.rect(Math.round(mx), Math.round(my), 2, 2).fill({ color: 0xfff1b8, alpha: a * Math.max(0, 1 - m.y / 120) });
    }
  }
  /**
   * 화면 밖 소품 숨기기 (렉 줄이기): 지옥은 나무·바위·뼈 같은 소품이 2천 개 가까이라
   * 0.2초마다 화면(+여유) 밖의 것은 그리지 않는다. 불빛(가산 혼합)도 같이
   */
  private cullList: { o: Container; x0: number; y0: number; x1: number; y1: number }[] = [];
  private cullT = 0;
  private cullAdd(o: Container, x0: number, y0: number, x1: number, y1: number) { this.cullList.push({ o, x0, y0, x1, y1 }); }
  private cullStatic(dt: number) {
    if (!this.cullList.length || (this.cullT -= dt) > 0) return;
    this.cullT = 0.2;
    const M = 96, x0 = -this.camera.x - M, y0 = -this.camera.y - M, x1 = x0 + this.app.screen.width + 2 * M, y1 = y0 + this.app.screen.height + 2 * M;
    for (const c of this.cullList) c.o.visible = c.x1 > x0 && c.x0 < x1 && c.y1 > y0 && c.y0 < y1;
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
    this.settle();
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
    this.settle();
  }
  /** 19차: 옮겨 선 자리 둘레의 땅·건물을 한 번에 세운다 (구역을 건너거나 순간이동한 뒤 검은 땅이 몇 초씩 보이지 않게). 지옥은 땅 그리기가 무거워 나눠 그린다 */
  private settle() {
    if (this.zone.hell || this.zone.interior) return;
    this.update(0);
    this.stream(true);
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

  /** 고문하는 야크를 누르면: 고문을 멈추고 진짜 괴물이 되어 덤빈다 (누른 그 자리에서) */
  private torturerAt(gx: number, gy: number, peek = false): Walker | null {
    if (!this.zone.hell) return null;
    const { wx, wy } = this.toWorld(gx, gy);
    for (const q of this.tortures) {
      if (q.free) continue;
      const [sx, sy] = iso(q.tx, q.ty);
      if (wx < sx - 13 || wx > sx + 13 || wy < sy - 50 || wy > sy + 4) continue;
      if (peek) return this.player; // 살펴보기만 (마우스 커서)
      q.free = true;
      q.tor.destroy();
      const f = this.zone.hell.floor;
      const tm = { ...MONSTERS[floorDef(f).torturer], weapon: 'club' };
      const m = this.makeMonster(tm, Math.floor(q.tx), Math.floor(q.ty));
      m.x = q.tx; m.y = q.ty; m.dir = q.tdir;
      m.home = [Math.floor(q.tx), Math.floor(q.ty)];
      this.walkers.push(m);
      this.bubble(m, t().torturerAngry[Math.floor(Math.random() * t().torturerAngry.length)]);
      if (!this.invisible && !this.dead) { m.target = this.player; m.firstBy = m; }
      return m;
    }
    return null;
  }

  /** 21차: 손가락으로 눌렀다 (모바일) — 사람을 누르는 범위를 넓히고, 빗나가도 가까운 상대를 잡아 준다 */
  private touchTap = false;
  private walkerAt(gx: number, gy: number): Walker | null {
    const { wx, wy } = this.toWorld(gx, gy);
    const k = this.touchTap ? 1.9 : 1.25; // 손가락은 거의 두 배, 마우스도 조금 넉넉히
    let best: Walker | null = null, bz = -1e9;
    for (const w of this.walkers) {
      if (w.isPlayer) continue;
      const [sx, sy] = iso(w.x, w.y);
      const sz = Math.max(1, w.size ?? 1);
      const box = w.down > 0 ? { x0: sx - 22 * k, x1: sx + 22 * k, y0: sy - 14 * k, y1: sy + 8 * k } : { x0: sx - 11 * k * sz, x1: sx + 11 * k * sz, y0: sy - 44 * sz - 6 * k, y1: sy + 6 * k };
      if (wx >= box.x0 && wx <= box.x1 && wy >= box.y0 && wy <= box.y1 && w.x + w.y > bz) { best = w; bz = w.x + w.y; }
    }
    if (best || !this.touchTap) return best;
    // 그래도 빗나갔다면: 누른 곳 둘레(손가락 하나 반쯤)에서 가장 가까운 사람 — 적이 먼저
    let bd = 46;
    for (const w of this.walkers) {
      if (w.isPlayer || w.down > 0) continue;
      const [sx, sy] = iso(w.x, w.y);
      const d = Math.hypot(wx - sx, wy - (sy - 20)) - (this.isFoe(w) ? 14 : 0);
      if (d < bd) { bd = d; best = w; }
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

  /** 적대 대상: 불량배·강도·마피아·대식자·깨어 있는 괴물·나를 노리는 누구든 (경비병은 나를 공격했을 때만) */
  private isFoe(w: Walker) {
    if (w.kind === 'remote') return this.recentAttacker(w.rid) || !!w.rpos?.c;
    if (w.gdef) return w.target === this.player;
    return w.kind === 'thug' || w.kind === 'goat' || w.kind === 'suturer' || (!!w.mdef && !w.asleep) || w.target === this.player;
  }
  private onHover(gx: number, gy: number) {
    const w = this.walkerAt(gx, gy);
    this.hoverFor = w ? { kind: 'w', w } : null;
    // 싸울 상대(괴물·불량배·대식자·고문하는 괴물·나를 노리는 누구든) 위에서는 칼 모양.
    // 경비병은 나를 공격했을 때만 적 ('모두 공격' 태세면 누구든 칼)
    const foe = this.realm !== 'ghost' && ((w && w.down <= 0 && (this.isFoe(w) || (this.stance === 'all' && w.kind !== 'clerk'))) || (!w && this.torturerAt(gx, gy, true)));
    document.body.style.cursor = foe ? SWORD_CURSOR : this.hoverFor || this.coinAt(gx, gy) || this.onDoorIcon(gx, gy) ? 'pointer' : '';
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
    if (this.workIn) return; // 가게 안에서 일하는 중: 조작 없음 (위쪽 '그만두기')
    if (this.hound && !this.hound.leaving && this.hound.contains(gx, gy)) { this.hooks.say(L.mibnap, L.mibnapLook); return; }
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
    // 1) 사람: 메뉴 (컨트롤·시프트를 누르고 누르면 바로 공격 = 강제 공격). 고문하던 야크도 누르면 고문을 멈추고 덤빈다
    const w = this.walkerAt(gx, gy) ?? this.torturerAt(gx, gy);
    // 21차: 천국의 구름 계단을 누르면 그 앞까지 걸어가 테라스로 올라간다
    if (!w && this.stairBox && this.heavenStair && this.realm === 'heaven' && !this.zone.interior) {
      const wx = gx - this.camera.x, wy = gy - this.camera.y, b = this.stairBox;
      if (wx >= b[0] && wx <= b[2] && wy >= b[1] && wy <= b[3]) {
        const st = this.heavenStair;
        this.cancelActs();
        this.hooks.place(L.cloudStair, L.cloudStairSub);
        if (Math.hypot(st.i + 0.5 - this.player.x, st.j + 0.5 - this.player.y) < 1.6) { this.hooks.heavenAct('terrace'); return; }
        if (this.walkTo(st.i, st.j + 1) || this.walkTo(st.i, st.j)) { this.stairWant = true; this.rippleAt(st.i, st.j); return; }
      }
    }
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
      const hostile = this.isFoe(w);
      // 천국: 그림자 말고 누구에게든 손을 들면 천국의 법을 어긴 것 (현실로 강제 환생)
      if (this.realm === 'heaven' && !w.weak && !w.invader && (force || this.stance === 'all')) { this.hooks.heavenAct('assault'); return; }
      if (force || this.stance === 'all' || (this.stance === 'hostile' && hostile)) { this.attack(w); return; }
      this.showLabel({ kind: 'w', w }, 2);
      const [sx, sy] = iso(w.x, w.y);
      const opts: { label: string; danger?: boolean; act: () => void }[] = [];
      if (w.kind === 'thug' || w.kind === 'goat' || w.kind === 'suturer' || (w.mdef && !w.asleep) || w.gdef) opts.push({ label: L.act.attack, act: () => this.attack(w) });
      if (w.mdef?.key === 'gurma') opts.push({ label: w.asleep ? L.act.look : L.gurmaFeedBtn, act: () => this.approach(w, 'talk') });
      if (!w.mdef) opts.push({ label: L.act.talk, act: () => this.approach(w, 'talk') });
      opts.push({ label: L.act.look, act: () => this.approach(w, 'look') });
      if (w.kind === 'passer' || w.kind === 'angel' || w.kind === 'yellowwing' || w.kind === 'officer' || w.kind === 'soul' || w.kind === 'vendor' || w.kind === 'fighter') opts.push({ label: L.act.force, danger: true, act: () => (this.realm === 'heaven' ? this.hooks.heavenAct('assault') : this.attack(w)) });
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
      const loan = b.cat === 'loan';
      if (isShop) this.hooks.place(t().shopLabel, '');
      else if (interactive(b) || loan) { const n = this.nameOf(b); if (n) this.hooks.place(n, this.subOf(b)); }
      this.cancelActs();
      let spot = this.baseSpot(b, wx);
      const door = isShop ? [this.zone.door.i, this.zone.door.j] as [number, number] : interactive(b) || loan ? this.frontCached(kb) : null;
      if (door && (!spot || Math.hypot(spot[0] - door[0], spot[1] - door[1]) <= 3)) spot = door;
      if (spot && this.walkTo(spot[0], spot[1])) { this.rippleAt(spot[0], spot[1]); return; }
    }
    // 5) 땅 (지나가는 길의 사람·건물은 신경 쓰지 않는다) — 24차: 활이면 표적을 쥔 채 무빙샷
    this.groundMove(gx, gy);
  }

  /** 화면 좌표의 땅으로 걸어간다 (못 가는 칸이면 가장 가까운 갈 수 있는 칸) */
  /**
   * 19차 켈베로스: 지옥 로비에서 사 온 호출로 부르는 지옥견. 10분 동안 곁을 따라다니며
   * 나를 노리는 자와 내가 싸우는 상대를 문다 (미납귀보다 훨씬 큰 몸, 붉은 기운)
   */
  private kerb: { h: Hound; t: number; bite: number; aim: Walker | null; glow: Graphics } | null = null;
  get kerberosLeft() {
    return this.kerb ? Math.max(0, this.kerb.t) : 0;
  }
  summonKerberos(seconds: number) {
    if (this.kerb || this.realm !== 'real' || this.zone.interior) return false;
    const p = this.player;
    const h = new Hound(p.x - 1.4, p.y + 0.8);
    h.view.scale.set(1.75);
    const glow = new Graphics().ellipse(0, -18, 30, 20).fill({ color: 0xff3a1a, alpha: 0.16 });
    h.view.addChildAt(glow, 0);
    this.objects.addChild(h.view);
    this.kerb = { h, t: seconds, bite: 0, aim: null, glow };
    this.bubble(p, t().kerberosCome);
    sfx.thud(this.spotOf(p));
    return true;
  }
  private updateKerberos(dt: number) {
    const k = this.kerb!;
    const p = this.player;
    k.t -= dt;
    k.bite -= dt;
    if (k.t <= 0 || this.dead) {
      k.h.view.alpha -= dt * 1.5;
      if (k.h.view.alpha <= 0) { k.h.destroy(); this.kerb = null; this.hooks.notice(t().kerberosGone); }
      return;
    }
    // 노릴 상대: 나를 노리는 자 · 내가 싸우는 상대 (가까운 순)
    if (!k.aim || k.aim.down > 0 || k.aim.sprite.destroyed || Math.hypot(k.aim.x - p.x, k.aim.y - p.y) > 9) {
      k.aim = null;
      let bd = 8;
      for (const w of this.walkers) {
        if (w.isPlayer || w.down > 0 || w.kind === 'remote') continue;
        if (w.target !== p && p.target !== w) continue;
        const d = Math.hypot(w.x - k.h.x, w.y - k.h.y);
        if (d < bd) { bd = d; k.aim = w; }
      }
    }
    const goal = k.aim ? { x: k.aim.x, y: k.aim.y } : { x: p.x - 1.2, y: p.y + 0.7 };
    const dx = goal.x - k.h.x, dy = goal.y - k.h.y, d = Math.hypot(dx, dy);
    const reach = k.aim ? 0.9 : 1.1;
    const moving = d > reach;
    if (moving) {
      const sp = (k.aim ? 5.2 : d > 4 ? 6 : 3.4) * dt;
      const nx = k.h.x + (dx / d) * Math.min(sp, d - reach), ny = k.h.y + (dy / d) * Math.min(sp, d - reach);
      if (walkable(this.zone, Math.floor(nx), Math.floor(ny)) || d > 6) { k.h.x = nx; k.h.y = ny; }
      else if (d > 3) { k.h.x = nx; k.h.y = ny; } // 막혀도 짐승은 뛰어넘는다
    }
    if (d > 14) { k.h.x = p.x - 1.2; k.h.y = p.y + 0.7; } // 너무 떨어지면 곁으로
    const [sx, sy] = iso(k.h.x, k.h.y);
    k.h.pose(dt, moving, dx - dy);
    k.h.view.position.set(Math.round(sx), Math.round(sy));
    k.h.view.zIndex = k.h.x + k.h.y;
    k.glow.alpha = 0.7 + Math.sin(this.time * 4) * 0.3;
    // 물기: 0.85초마다, 세 머리가 번갈아
    if (k.aim && d <= reach + 0.15 && k.bite <= 0) {
      k.bite = 0.85;
      this.petBite(k.aim, 45 + Math.floor(Math.random() * 40));
    }
  }
  /** 지옥견이 문다: 맞는 쪽 반응은 내가 친 것과 같다 (쓰러뜨리면 내 공) */
  private petBite(to: Walker, dmg: number) {
    if (to.down > 0) return;
    sfx.impact('blade', this.spotOf(to), false, this.bodyOf(to), (to.voice ??= 0.85 + Math.random() * 0.3), to.size ?? 1);
    to.flashT = 0.07;
    to.hp -= dmg;
    to.hurtT = 0.18;
    if (!to.act || to.act.anim === 'hit') { to.act = { anim: 'hit', t: 0 }; to.pend = null; }
    to.barT = 5;
    const [bx, by] = iso(to.x, to.y);
    for (let n = 0; n < 6; n++) { const a = Math.random() * Math.PI * 2, v = 50 * (0.5 + Math.random()); this.sparks.push({ x: bx, y: by - 22, vx: Math.cos(a) * v, vy: Math.sin(a) * v * 0.7 - 20, t: 0.18, col: 0xff6a3a }); }
    if (!to.target && to.kind !== 'passer') to.target = this.player;
    if (to.kind === 'passer' && to.brave && this.realm === 'real') this.standUp(to, this.player);
    else if (to.kind === 'passer') { to.flee = 7; to.path = []; }
    if (to.hp <= 0) this.knockDown(to, this.player);
  }
  /** 20차: 훔치다 걸렸다 — 대식자 하나가 나를 잡으러 온다 (방 안이면 문으로 들어온다) */
  sendEater() {
    if (this.realm === 'heaven' || this.realm === 'ghost') return;
    this.criminalT = Math.max(this.criminalT, 120); // 도둑 표시: 대식자는 표시가 남아 있는 동안 쫓는다
    if (this.zone.interior) { if (!this.chaserDue) this.chaserDue = { t: 1.6, monster: false, hp: 700 }; return; }
    this.spawnSuturer();
  }
  /** 21차: 미스 황이 알려 준 곳 — 건물 위에 금빛 표시 (다다르거나 5분이 지나면 사라진다) */
  private guide: { at: [number, number]; lift: number; front: [number, number] | null; spr: Text; t: number } | null = null;
  setGuide(k: number) {
    const b = this.zone.buildings[k];
    if (!b) return;
    this.markGuide(this.nameOf(b), [b.i0 + b.w / 2, b.j0 + b.d / 2], b.h + 18, this.frontOf(b));
  }
  /** 21차: 황색날개가 알려 준 구름 계단 (루엔에게 가는 길). 계단이 없는 구역이면 false */
  guideStair(): boolean {
    const st = this.heavenStair;
    if (!st || this.realm !== 'heaven') return false;
    this.markGuide(t().cloudStair, [st.i + 0.5, st.j + 0.5], 120, [st.i, st.j]);
    return true;
  }
  private markGuide(label: string, at: [number, number], lift: number, front: [number, number] | null) {
    this.guide?.spr.destroy();
    const tx = new Text({ text: `▼ ${label}`, style: { fontFamily: 'system-ui, sans-serif', fontSize: 15, fontWeight: '800', fill: '#ffe08a', stroke: { color: '#1a120a', width: 4, join: 'round' } } });
    tx.anchor.set(0.5, 1);
    tx.zIndex = 1e7;
    this.objects.addChild(tx);
    this.guide = { at, lift, front, spr: tx, t: 300 };
  }
  private updateGuide(dt: number) {
    const g = this.guide!;
    g.t -= dt;
    const [x, y] = iso(g.at[0], g.at[1]);
    g.spr.position.set(Math.round(x), Math.round(y - g.lift + Math.sin(this.time * 3) * 4));
    const f = g.front;
    if (g.t <= 0 || (f && Math.hypot(f[0] + 0.5 - this.player.x, f[1] + 0.5 - this.player.y) < 2)) { g.spr.destroy(); this.guide = null; }
  }
  /** 21차: 넘치는 체력 (마사지) — 맞으면 이것부터 깎이고, 10분에 걸쳐 천천히 빠진다 */
  private overHp = 0;
  private overMax = 0;
  addOverHp(n: number) {
    this.overHp = Math.max(this.overHp, n);
    this.overMax = this.overHp;
    this.hooks.over(this.overHp);
  }
  /** 19차: 자동 반격 (영혼 설정) */
  private autoCounter = true;
  setAutoCounter(v: boolean) {
    this.autoCounter = v;
  }
  /** 19차: 구역 끝 너머를 눌렀다 → 끝 칸까지 걸어가면 이웃 구역으로 */
  private edgeWant: 'w' | 'e' | null = null;
  private moveToScreen(gx: number, gy: number, fx = true) {
    const { wx, wy } = this.toWorld(gx, gy);
    let x = (wx / (TW / 2) + wy / (TH / 2)) / 2, y = (wy / (TH / 2) - wx / (TW / 2)) / 2;
    const e = this.zone.edges;
    this.edgeWant = null;
    if (e && !this.zone.interior && (x < e.i0 || x >= e.i1)) {
      this.edgeWant = x < e.i0 ? 'w' : 'e';
      x = x < e.i0 ? e.i0 + 0.5 : e.i1 - 0.5;
      // 끝 칸에서 누른 높이에 가장 가까운 걸을 수 있는 칸 (대로·보도)
      const col = Math.floor(x), row = Math.max(e.j0, Math.min(e.j1 - 1, Math.floor(y)));
      for (let r = 0; r < 40; r++) { if (walkable(this.zone, col, row - r)) { y = row - r + 0.5; break; } if (walkable(this.zone, col, row + r)) { y = row + r + 0.5; break; } }
    }
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
    // 천국: 우주새는 비어 있고(황색날개는 거리에), 다른 건물에는 들어가지 않는다
    if (this.realm === 'heaven') {
      if (k === -1 && this.zone.interior) { this.cancelActs(); this.walkTo(this.zone.interior.exit.i, this.zone.interior.exit.j); return; }
      if (k === -4) { this.cancelActs(); this.hooks.heavenAct('terrace'); return; } // 구름 계단 → 환생의 테라스
      if (k === -1 || this.zone.buildings[k]?.cat === 'ujusae') { this.hooks.heavenAct('shop'); return; }
      const hb = this.zone.buildings[k];
      if (hb && ['food', 'cafe', 'mart'].includes(roomKindOf(hb))) this.hooks.heavenFood(this.nameOf(hb)); // 21차: 천국의 가게는 모두 열려 있다
      return;
    }
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
    if (b.cat === 'loan' || b.cat === 'hbank' || b.cat === 'atone') { this.goEnter(k); return; } // 지옥 마을: 베스크 대부소 · 지옥 은행 · 속죄의 회당
    if (b.cat === 'rebirth') { this.cancelActs(); this.hooks.hellAct('up'); return; } // 1층 골목 끝: 지옥 로비 (통행·손들 장면은 main)
    const opts: { label: string; act: () => void }[] = [];
    if (canEnter(b) && this.realm === 'real') opts.push({ label: L.goInside, act: () => this.goEnter(k) });
    else {
      const store = storeOf(b);
      if (store) opts.push({ label: L.enter, act: () => this.goStore(k, store) });
      if (hasBank(b)) opts.push({ label: L.bankGo, act: () => this.goStore(k, 'bank') });
    }
    if (canWork(b)) { const job = this.jobOf(b); opts.push({ label: L.act.work.replace('{n}', String(Math.round(WAGE_PER_HOUR * job.mult))) + (job.hard ? ' · ' + L.workHard[job.hard - 1] : ''), act: () => this.goWork(k) }); }
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
    this.kite = false;
    this.pending = null;
    this.stairWant = false;
    this.wantShop = false;
    this.storeWant = null;
    this.edgeWant = null;
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
    // 천국: 환생관·황색날개는 큰 대화, 천사는 한마디
    if (w.kind === 'officer' && pd.kind === 'talk') { w.dir = dirFromTile(this.player.x - w.x, this.player.y - w.y, w.dir); this.hooks.heavenAct('officer'); return; }
    if (this.realm === 'heaven' && pd.kind === 'talk') {
      const face = () => { w.dir = dirFromTile(this.player.x - w.x, this.player.y - w.y, w.dir); };
      if (w.kind === 'sleeper') { this.hooks.say(this.npcName(w), L.sleeperLines[Math.floor(Math.random() * L.sleeperLines.length)]); return; }
      if (w.taxi) { face(); this.hooks.heavenAct('taxi'); return; }
      if (w.preach !== undefined) { face(); this.hooks.heavenAct('ceremony'); return; }
      if (w.vend === 'heaven' || w.tail?.kind === 'chef') { face(); this.hooks.heavenFood(this.npcName(w)); return; }
      if (w.tail) { face(); const lines = this.player.look?.sex === 'f' ? L.admireToF : L.admireToM; this.hooks.say(this.npcName(w), lines[Math.floor(Math.random() * lines.length)]); return; }
    }
    if (w.kind === 'yellowwing' && pd.kind === 'talk') { w.path = []; w.wait = 6; w.dir = dirFromTile(this.player.x - w.x, this.player.y - w.y, w.dir); this.hooks.heavenAct('yellowwing'); return; }
    if (w.kind === 'goat') { this.hooks.say(L.goatName, pd.kind === 'look' ? L.goatTag : L.goatTalk); return; }
    if (w.kind === 'angel' || w.kind === 'officer' || w.kind === 'yellowwing') {
      if (pd.kind === 'look') { this.hooks.say(this.npcName(w), this.npcSub(w)); return; }
      this.hooks.say(this.npcName(w), L.angelLines[Math.floor(Math.random() * L.angelLines.length)]);
      return;
    }
    if (w.weak && pd.kind === 'look') {
      const r0 = w.hp / w.maxHp;
      this.hooks.say(this.npcName(w), `${w.weak === 'drunk' ? L.drunkLook : L.shadeLook} ${L.hpWords[r0 > 0.85 ? 0 : r0 > 0.5 ? 1 : r0 > 0.25 ? 2 : 3]}`);
      return;
    }
    if (w.weak && pd.kind === 'talk') {
      const a = w.weak === 'drunk' ? L.drunkTaunt : L.shadeTaunt;
      this.hooks.say(this.npcName(w), a[Math.floor(Math.random() * a.length)]);
      w.target = this.player; w.firstBy ??= w;
      return;
    }
    if (w.kind === 'soul' || w.kind === 'fighter') {
      if (!w.still) w.dir = dirFromTile(this.player.x - w.x, this.player.y - w.y, w.dir);
      const f = this.zone.hell?.floor ?? 0;
      const lines = w.kind === 'fighter' ? L.fighterLines : w.monk ? L.monkLines : w.cards ? L.cardLines : this.zone.interior?.kind === 'rebirth' ? L.lobbySoulLines : w.pray ? L.idolPrayLines : f === 2 ? L.soulHungryLines : f === 3 && !w.still ? L.soulHaggleLines : w.still === 'lie' ? L.soulLieLines : L.soulLines;
      this.hooks.say(this.npcName(w), pd.kind === 'look' ? this.npcSub(w) : lines[Math.floor(Math.random() * lines.length)]);
      return;
    }
    if (w.kind === 'vendor' && (w.vend === 'street' || w.vend === 'massage' || w.vend === 'bar')) {
      w.dir = dirFromTile(this.player.x - w.x, this.player.y - w.y, w.dir);
      if (w.vend === 'street') {
        if (pd.kind === 'look') { this.hooks.say(this.npcName(w), L.streetVendorLook); return; }
        this.hooks.store('food', L.streetVendor, 'thai');
        return;
      }
      const lines = w.vend === 'massage' ? L.massageLines : L.barLines;
      if (pd.kind === 'look') { this.hooks.say(this.npcName(w), w.vend === 'massage' ? L.massageLook : L.barLook); return; }
      this.hooks.say(this.npcName(w), lines[Math.floor(Math.random() * lines.length)]);
      const k = w.shopK;
      if (k !== undefined && canEnter(this.zone.buildings[k])) this.goEnter(k); // 손을 잡아끈다: 가게 문 앞으로
      return;
    }
    if (w.kind === 'vendor') {
      w.dir = dirFromTile(this.player.x - w.x, this.player.y - w.y, w.dir);
      const hv = (w.vend ?? 'junk') as HellVendor;
      if (pd.kind === 'look') { this.hooks.say(this.npcName(w), hv === 'butcher' ? L.butcherLook : hv === 'junk' ? L.junkLook : L.hvLook[hv as keyof typeof L.hvLook] ?? L.junkLook); return; }
      this.hooks.vendor(hv);
      return;
    }
    if (w.mdef?.key === 'gurma' && pd.kind === 'talk') {
      if (w.asleep) { this.hooks.say(w.mdef.name[lang()], L.gurmaSleeping); return; }
      const r0 = this.hooks.feedGurma();
      if (!r0.gave) { this.hooks.say(w.mdef.name[lang()], L.gurmaNoFood); return; }
      this.bubble(w, L.gurmaMunch[Math.floor(Math.random() * L.gurmaMunch.length)]);
      this.float(w, L.gurmaFed.replace('{n}', String(r0.total)).replace('{m}', String(GURMA_FULL)), '#e8f06a');
      if (r0.full) this.gurmaSleep(w);
      return;
    }
    if (w.kind === 'elder') {
      w.dir = dirFromTile(this.player.x - w.x, this.player.y - w.y, w.dir);
      if (pd.kind === 'look') { this.hooks.say(this.npcName(w), L.elderLook); return; }
      this.hooks.elder(this.npcName(w));
      return;
    }
    if (w.kind === 'yunae') {
      if (w.leave !== undefined) return;
      w.dir = dirFromTile(this.player.x - w.x, this.player.y - w.y, w.dir);
      w.bubbleT = 0;
      if (pd.kind === 'look') { this.hooks.say(this.npcName(w), L.yunaeLook[1]); return; }
      this.hooks.yunaeOut();
      return;
    }
    if (w.kind === 'maskgirl') {
      w.dir = dirFromTile(this.player.x - w.x, this.player.y - w.y, w.dir);
      w.path = []; w.wait = 6;
      if (pd.kind === 'look') { this.hooks.say(this.npcName(w), L.maskLook); return; }
      this.hooks.maskGirl();
      return;
    }
    if (w.kind === 'talus') {
      w.dir = dirFromTile(this.player.x - w.x, this.player.y - w.y, w.dir);
      if (pd.kind === 'look') { this.hooks.say(this.npcName(w), L.talusLook); return; }
      this.hooks.hellAct('talus');
      return;
    }
    if (w.gdef) {
      const r1 = w.hp / w.maxHp;
      if (pd.kind === 'look') { this.hooks.say(this.npcName(w), `${w.gdef.look[lang()]} ${L.guardLookTail} ${L.hpWords[r1 > 0.85 ? 0 : r1 > 0.5 ? 1 : r1 > 0.25 ? 2 : 3]}`); return; }
      w.path = []; w.wait = 4; w.dir = dirFromTile(this.player.x - w.x, this.player.y - w.y, w.dir);
      this.hooks.say(this.npcName(w), w.gdef.line[lang()]);
      return;
    }
    const kind = w.kind as NpcKind;
    const r = w.hp / w.maxHp;
    if (w.mdef) {
      const cond = L.hpWords[r > 0.85 ? 0 : r > 0.5 ? 1 : r > 0.25 ? 2 : 3];
      this.hooks.say(this.npcName(w), `${L.monsterLook} ${cond}`);
      return;
    }
    if (pd.kind === 'look') {
      const cond = L.hpWords[r > 0.85 ? 0 : r > 0.5 ? 1 : r > 0.25 ? 2 : 3];
      this.hooks.say(this.npcName(w), `${kind === 'suturer' ? L.suturerLook : w.gang === 'robber' ? L.robberLook : w.gang === 'mafia' ? L.mafiaLook : w.tour ? L.touristLook : L.inspect[kind as 'passer' | 'thug']} ${cond}`);
      return;
    }
    const lines = kind === 'suturer' ? L.suturerLines : w.gang === 'robber' ? L.robberLines : w.gang === 'mafia' ? L.mafiaLines : w.tour ? L.touristLines : L.lines[kind as 'passer' | 'thug'];
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
    if (w.kind === 'clerk' && this.zone.interior?.kind === 'shore') return L.bulda;
    if (w.kind === 'clerk' && this.grandpa) return L.grandpaName;
    if (w.kind === 'clerk' && this.zone.interior?.kind === 'home') return L.yunae;
    if (w.kind === 'yunae') return L.yunae;
    if (w.cards) return L.angel;
    if (w.kind === 'goat') return L.goatName;
    if (w.kind === 'clerk') return this.zone.interior?.kind === 'loan' ? L.besk : this.zone.interior?.kind === 'rebirth' ? L.pashar : this.zone.interior?.kind === 'terrace' ? L.officer : this.zone.interior?.name ?? '';
    if (w.mdef) return w.mdef.name[lang()];
    if (w.gdef) return w.gdef.name[lang()];
    if (w.kind === 'talus') return L.talus;
    if (w.kind === 'maskgirl') return L.maskGirl;
    if (w.kind === 'elder') return L.elderName[(this.zone.interior?.kind ?? 'temple') as 'temple'];
    if (w.kind === 'pashar') return L.pashar;
    if (w.kind === 'soul') return L.soulTired;
    if (w.vend === 'heaven') return L.heavenVendor;
    if (w.kind === 'vendor' && w.vend && w.vend in L.hvName) return L.hvName[w.vend as keyof typeof L.hvName][0];
    if (w.kind === 'vendor') return w.vend === 'street' ? L.streetVendor : w.vend === 'massage' ? L.massagePromoter : w.vend === 'bar' ? L.barPromoter : w.vend === 'butcher' ? L.vendorButcher : L.vendorJunk;
    if (w.tour) return L.tourist;
    if (w.kind === 'fighter') return L.soulFighter;
    if (w.weak === 'drunk') return L.drunk;
    if (w.weak === 'shade') return L.shade;
    if (w.gang === 'robber') return L.robber;
    if (w.gang === 'mafia') return L.mafia;
    if (w.kind === 'yellowwing') return L.yellowWing;
    if (w.kind === 'sleeper') return L.sleeper;
    if (w.taxi) return L.taxiAngel;
    if (w.preach !== undefined) return L.preachAngel;
    if (w.tail) return w.tail.kind === 'chef' ? L.chefName : L.admirer;
    if (w.kind === 'officer') return L.officer;
    if (w.kind === 'angel') return L.angel;
    if (w.kind === 'passer' && this.realm === 'heaven') return L.soulPasser;
    return w.kind === 'suturer' ? L.suturer : L.npc[w.kind as 'passer' | 'thug'];
  }
  private npcSub(w: Walker) {
    const L = t();
    if (w.kind === 'clerk' && this.zone.interior?.kind === 'shore') return L.buldaSub;
    if (w.kind === 'clerk' && this.grandpa) return L.grandpaSub;
    if (w.kind === 'clerk' && this.zone.interior?.kind === 'home') return L.yunaeSub[this.zone.interior.age ?? 1];
    if (w.kind === 'yunae') return L.yunaeSub[1];
    if (w.cards) return L.cardSub;
    if (w.kind === 'goat') return L.goatSub;
    if (w.kind === 'clerk') return this.zone.interior?.kind === 'terrace' ? L.officerSub : L.clerkSub[(this.zone.interior?.kind ?? 'shop') as keyof typeof L.clerkSub] ?? '';
    if (w.mdef) return w.mdef.title ? `${L.hellBoss.replace('{n}', String(this.zone.hell?.floor ?? 1))} · ${w.mdef.title[lang()]}` : w.mdef.boss ? L.hellBoss.replace('{n}', String(this.zone.hell?.floor ?? 1)) : L.hellMonster;
    if (w.kind === 'pashar') return L.pasharSub;
    if (w.kind === 'elder') return L.elderSub;
    if (w.gdef) return L.guardSub;
    if (w.kind === 'talus') return L.talusSub;
    if (w.kind === 'maskgirl') return L.maskGirlSub;
    if (w.kind === 'soul') return L.soulTiredSub;
    if (w.vend === 'heaven') return this.nameOf(this.zone.buildings[w.shopK ?? 0]);
    if (w.kind === 'vendor' && w.vend && w.vend in L.hvName) return L.hvName[w.vend as keyof typeof L.hvName][1];
    if (w.kind === 'vendor') return w.vend === 'street' ? L.streetVendorSub : (w.vend === 'massage' || w.vend === 'bar') ? this.nameOf(this.zone.buildings[w.shopK ?? 0]) : w.vend === 'butcher' ? L.vendorButcherSub : L.vendorJunkSub;
    if (w.tour) return L.touristSub;
    if (w.kind === 'fighter') return L.soulFighterSub;
    if (w.weak === 'drunk') return L.drunkSub;
    if (w.weak === 'shade') return L.shadeSub;
    if (w.gang === 'robber') return L.robberSub;
    if (w.gang === 'mafia') return L.mafiaSub;
    if (w.kind === 'yellowwing') return L.yellowWingSub;
    if (w.kind === 'sleeper') return L.sleeperSub;
    if (w.taxi) return L.taxiAngelSub[w.look?.sex === 'f' ? 1 : 0];
    if (w.preach !== undefined) return this.nameOf(this.zone.buildings[w.preach]);
    if (w.tail) return w.tail.kind === 'chef' ? L.chefSub : L.admirerSub;
    if (w.kind === 'officer') return L.officerSub;
    if (w.kind === 'angel') return L.angelSub;
    if (w.kind === 'passer' && this.realm === 'heaven') return L.soulPasserSub;
    return w.kind === 'suturer' ? L.suturerSub : L.npcSub[w.kind as 'passer' | 'thug'];
  }

  /** 가게에 들어가 물건을 산다 */
  private goStore(k: number, kind: StoreKind | 'bank') {
    const b = this.zone.buildings[k];
    const spot = this.frontOf(b);
    if (!spot) return;
    this.cancelActs();
    if (!this.walkTo(spot[0], spot[1]) && Math.hypot(spot[0] + 0.5 - this.player.x, spot[1] + 0.5 - this.player.y) >= 2.6) return;
    this.storeWant = { k, kind, spot };
  }
  private storeWant: { k: number; kind: StoreKind | 'bank' | 'enter'; spot: [number, number] } | null = null;
  private goEnter(k: number) {
    const b = this.zone.buildings[k];
    const spot = this.frontOf(b);
    if (!spot) return;
    this.cancelActs();
    const p = this.player;
    // 19차: 출입 아이콘이 떴다 = 문 앞에 서 있다. 길이 막혀도(울타리·물) 바로 들어간다
    if (!this.walkTo(spot[0], spot[1])) {
      if (Math.hypot(spot[0] + 0.5 - p.x, spot[1] + 0.5 - p.y) < 2.6) this.hooks.enterBuilding(k, { i: spot[0], j: spot[1] }, this.zone.buildings[k]?.cat === 'home' ? null : this.takeChaser());
      return;
    }
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
    if (this.invisible) { this.bubble(this.player, t().invisibleNoFight); return; } // 투명한 관리자는 싸우지 않는다
    if (w.kind === 'remote' && (this.safeAt(w.x, w.y) || this.safeAt(this.player.x, this.player.y))) { this.hooks.say('', t().pvpSafe); return; }
    if (w.kind === 'talus') { w.dir = dirFromTile(this.player.x - w.x, this.player.y - w.y, w.dir); this.bubble(w, t().talusNoFight); return; } // 총구 앞에서는 손을 들 수 없다
    if (w.kind === 'maskgirl') { w.dir = dirFromTile(this.player.x - w.x, this.player.y - w.y, w.dir); this.bubble(w, t().maskNoFight); return; } // 25차: 중립 — 맞지도 때리지도 않는다
    if (w.kind === 'yunae') { w.dir = dirFromTile(this.player.x - w.x, this.player.y - w.y, w.dir); const n = t().yunaeNoFight; this.bubble(w, n[Math.floor(Math.random() * n.length)]); return; } // 28차: 유내에게는 손을 들 수 없다
    if (w.down > 0) return;
    // 22차: 싸우는 중인 상대를 계속 누르면 — 다섯 번에 한 번, 다음 공격이 반 박자 빨리 나간다 (자동 공격보다 시간당 피해가 조금 많다).
    // 누를 때마다 쿨타임을 지우던 것은 막았다 (연타로 무한히 빨라지지 않게)
    if (this.player.target === w) {
      this.tapCombo++;
      this.mark = { w, t: 0 };
      if (this.tapCombo % 5 === 0 && !this.quickUsed) {
        const two = !this.gear.ranged && TWO.has(this.gear.weapon ?? '');
        const half = ATK_INTERVAL * (two ? 1.6 : 1) * 0.5;
        if (this.player.atkT > 0.05) { this.player.atkT = Math.max(0.02, this.player.atkT - half); this.quickUsed = true; this.float(this.player, '⚡', '#ffe08a'); }
      }
      return;
    }
    this.cancelActs();
    this.tapCombo = 0;
    this.quickUsed = false;
    this.mark = { w, t: 0 };
    this.player.target = w;
    this.player.atkT = Math.min(this.player.atkT, 0.2);
  }
  private tapCombo = 0;
  private quickUsed = false;
  /** 24차 무빙샷: 활을 든 채 땅을 누르면 표적을 놓지 않고 걸으며 쏜다 */
  private kite = false;
  private bowOn() { return this.gear.ranged && this.gear.weapon === 'bow'; }
  private keepKite() {
    const p = this.player, tg = p.target;
    const ok = !!tg && this.bowOn() && tg.down <= 0 && Math.hypot(tg.x - p.x, tg.y - p.y) <= RANGED + 4;
    return ok ? tg : null;
  }
  /** 땅을 눌러 걷기 시작: 활이면 표적을 그대로 쥔다 */
  private groundMove(gx: number, gy: number, fx = true) {
    const keep = this.keepKite();
    this.cancelActs();
    if (keep) { this.player.target = keep; this.kite = true; }
    this.moveToScreen(gx, gy, fx);
  }
  /** 24차 손맛: 땅에 남는 핏방울·뼛가루 (몇 초 뒤 사라진다) */
  private splats: { x: number; y: number; r: number; col: number; t: number }[] = [];
  private splat(to: Walker, n: number) {
    if (this.realm === 'heaven') return;
    const b = this.bodyOf(to);
    const col = b === 'bones' ? 0xcfc2a2 : b === 'ash' ? 0x2e2824 : b === 'pret' ? 0x4e5a24 : b === 'monster' ? 0x3a4a1a : 0x7a120e;
    const [x, y] = iso(to.x, to.y);
    for (let k = 0; k < n; k++) {
      const a = Math.random() * Math.PI * 2, d = 3 + Math.random() * 11;
      this.splats.push({ x: x + Math.cos(a) * d, y: y + Math.sin(a) * d * 0.5, r: 1 + Math.random() * 2.2, col, t: 4 + Math.random() * 2 });
    }
    if (this.splats.length > 90) this.splats.splice(0, this.splats.length - 90);
  }

  // ───────────────────────── 일하기 ─────────────────────────
  /**
   * 21차 직종별 일: 힘든 일일수록 시급이 조금 높고 체력이 깎인다 (1분마다 최대 체력의 몇 %).
   * 너무 오래 하면 바닥난다 — 체력이 8% 아래로 내려가면 손을 놓는다
   */
  jobOf(b: Building): { mult: number; drain: number; hard: 0 | 1 | 2 } {
    const k = bKindOf(b);
    if (['car_repair', 'hardware', 'doityourself', 'motorcycle_repair', 'bicycle', 'car_wash', 'tyres'].includes(k)) return { mult: 1.7, drain: 2, hard: 2 };
    if (['massage', 'spa'].includes(k)) return { mult: 1.45, drain: 1.4, hard: 2 };
    if (['hotel', 'hostel', 'guest_house'].includes(k)) return { mult: 1.35, drain: 1, hard: 1 };
    if (['bar', 'pub', 'nightclub'].includes(k)) return { mult: 1.3, drain: 0.8, hard: 1 };
    if (['restaurant', 'fast_food', 'food_court', 'bakery', 'cafe'].includes(k)) return { mult: 1.2, drain: 0.6, hard: 1 };
    if (['laundry', 'dry_cleaning'].includes(k)) return { mult: 1.15, drain: 0.7, hard: 1 };
    return { mult: 1, drain: 0.15, hard: 0 };
  }
  /** 일하는 동안 몸이 닳는다. 바닥이면 true (그만둔다) */
  private workStrain(job: { drain: number }, dt: number) {
    const p = this.player;
    p.hp -= (p.maxHp * job.drain / 100 / 60) * dt;
    this.hooks.hp(Math.max(0, p.hp), p.maxHp);
    if (p.hp <= p.maxHp * 0.08) { p.hp = Math.max(1, p.hp); this.hooks.notice(t().workSpent); return true; }
    return false;
  }
  private goWork(k: number) {
    const b = this.zone.buildings[k];
    const near = this.frontOf(b);
    if (!near) return;
    this.cancelActs();
    this.walkTo(near[0], near[1]);
    this.working = { k, name: this.nameOf(b), earned: 0, spot: near, on: false, job: this.jobOf(b) };
  }

  private stopWork(stiffed = false) {
    if (!this.working) return;
    const w = this.working;
    this.working = null;
    this.player.sprite.visible = true;
    this.hooks.work(null);
    if (w.on || w.earned > 0) this.hooks.wage(w.earned, w.name, stiffed);
    this.shift = null;
  }

  // ───────────────────────── 싸움 ─────────────────────────
  /** 나를 맞히려는 쪽의 명중 보너스 (d20 에 더한다) */
  private toHitBonus(w: Walker): number {
    if (w.gdef) return 10;
    if (w.mdef) return w.mdef.boss ? 9 : 3 + (this.zone.hell?.floor ?? 1);
    if (w.kind === 'suturer') return 8;
    if (w.kind === 'fighter') return 5;
    if (w.kind === 'remote') return 4;
    if (w.weak) return 1;
    if (w.gang === 'mafia') return 7;
    if (w.gang === 'robber') return 5;
    return 3; // 불량배
  }
  private rollHits(bonus: number) {
    return rollToHit(bonus, armorClass(this.gear.def, this.stats.agi)).hit;
  }
  private hit(from: Walker, to: Walker, dmg: number, crit = false, kind?: sfx.HitKind) {
    if (to.kind === 'maskgirl' || to.kind === 'yunae') return; // 25차: 소녀는 맞지 않는다 · 28차: 유내도
    if (to.down > 0 || this.dead) return;
    // 17차 회피: 공격자가 d20 + 명중 보너스를 굴려 내 회피 등급(10 + 방어력 ÷ 2 + 민첩 ÷ 5)을 넘어야 맞는다. 방어력은 피해를 줄이지 않는다
    if (to.isPlayer && from !== to && !this.rollHits(this.toHitBonus(from))) { this.float(to, t().miss, '#d8e8ff'); return; }
    if (to.isPlayer) this.lastHitBy = from.kind === 'remote' ? (from.rid ?? null) : null;
    // 마을과 둘레에서 다른 영혼이나 경비병을 치면 경비병이 나선다
    if (from.isPlayer && this.zone.hell && (to.gdef || (to.kind === 'remote' && this.nearRest(to.x, to.y, 6)))) this.guardAlarm(to.gdef ? to : null);
    if (kind) sfx.impact(kind, this.spotOf(to), crit, this.bodyOf(to), (to.voice ??= 0.85 + Math.random() * 0.3), to.size ?? (to.gang === 'mafia' ? 1.1 : 1));
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
    if (from.gdef) {
      this.guardSpecial(from, to);
      if (to.isPlayer) dmg = Math.min(dmg, Math.max(0, to.hp - 1)); // 경비병은 죽이지 않는다: 체력 1까지 제압
    }
    if (from.isPlayer && to.mdef) to.pdmg = (to.pdmg ?? 0) + Math.min(dmg, Math.max(0, to.hp));
    if (to.asleep) { to.asleep = false; to.act = null; this.bubble(to, t().gurmaNoFood); }
    to.hp -= dmg;
    to.hurtT = 0.18;
    // 26차 회색 망령: 맞으면 가끔 가던 길을 잃는다 (누른 길이 지워진다)
    if (to.isPlayer && from.mdef?.ghost && to.path.length && Math.random() < 0.3) { to.path = []; this.kite = false; this.float(to, t().lostWay, '#c8d2ff'); }
    if (to.kind === 'goat' && to.hp > 0 && to.hp < to.maxHp * 0.28 && !to.fled) {
      to.fled = true;
      if (Math.random() < 0.72) { to.flee = 9; to.target = null; to.path = []; to.act = null; to.pend = null; this.bubble(to, t().goatFlee); if (from.isPlayer) this.player.target = null; return; } // 대개는 달아난다 — 가끔은 끝까지 버티다 죽는다
    }
    if (!to.act || to.act.anim === 'hit') { to.act = { anim: 'hit', t: 0 }; to.pend = null; }
    to.barT = 5;
    // 피해 숫자는 보여 주지 않는다: 체력 막대로만 짐작
    if (from.isPlayer || to.isPlayer) this.combatT = 0;
    if (to.isPlayer) {
      this.stopWork();
      if (this.overHp > 0) { const a = Math.min(this.overHp, dmg); this.overHp -= a; to.hp += a; this.hooks.over(this.overHp); } // 넘치는 체력이 먼저 막는다
      this.hooks.hp(Math.max(0, to.hp), to.maxHp);
      if (from.gdef && to.hp <= 1) { this.evict(from); return; }
      if (to.hp <= 0) { this.die('beaten'); return; }
      // 19차 자동 반격: 싸우는 상대가 없으면 나를 친 자에게 곧바로 맞선다 (말 걸러 가던 길·가게 가던 길은 멈춘다)
      if (this.autoCounter && !to.target && !from.isPlayer && !from.gdef && from.down <= 0 && this.realm !== 'heaven' && this.realm !== 'ghost' && !this.zone.interior?.rest) this.attack(from);
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
    if (to.kind === 'passer' && to.brave && this.realm === 'real') this.standUp(to, from);
    else if (to.kind === 'passer') {
      to.flee = 7;
      to.path = [];
      if (Math.random() < 0.6) this.bubble(to, t().help);
    } else if (!to.target && to.preach === undefined && !to.taxi) { to.target = from; if (from.isPlayer && to.gang === 'mafia') this.rallyMafia(to); }
    if (to.hp <= 0) this.knockDown(to, from);
  }

  /** 맞은 몸의 재질 → 타격음이 달라진다 */
  private bodyOf(w: Walker): sfx.Body {
    if (w.kind === 'goat') return 'yak';
    if (w.gdef) return w.gdef.body === 'warden1' ? 'ash' : w.gdef.body === 'warden2' ? 'pret' : 'suturer';
    if (w.mdef) {
      const b = w.mdef.body;
      return b === 'yak' || b === 'ashgal' || b === 'glutton' || b === 'broker' ? 'yak' : b === 'pret' || b === 'serane' || b === 'gurma' || b === 'bloat' ? 'pret' : b === 'bones' || b === 'debtor' ? 'bones' : 'ash';
    }
    if (w.kind === 'suturer') return w.monster ? 'monster' : 'suturer';
    if (w.kind === 'thug') return 'thug';
    if (w.isPlayer || w.kind === 'remote') return 'player';
    return 'flesh';
  }

  /** 타격감: 멈칫(히트스톱) · 화면 흔들림 · 번쩍 · 밀려남 · 불꽃 */
  private impactFx(from: Walker, to: Walker, crit: boolean, kind?: sfx.HitKind) {
    const mine = from.isPlayer || to.isPlayer;
    // 24차 손맛: 무기 무게에 따라 멈칫·흔들림이 다르다 (양손·둔기는 묵직하게, 활은 짧고 가볍게, 총은 쾅)
    const heavy = from.isPlayer && !this.gear.ranged && (TWO.has(this.gear.weapon ?? '') || kind === 'blunt');
    const bow = from.isPlayer && this.bowOn(), gun = from.isPlayer && this.gear.ranged && !bow;
    if (mine) {
      this.hitStop = Math.max(this.hitStop, crit ? 0.12 : bow ? 0.035 : heavy ? 0.095 : gun ? 0.08 : 0.07);
      this.shakeT = Math.max(this.shakeT, crit ? 0.24 : to.isPlayer ? 0.16 : heavy || gun ? 0.15 : 0.1);
      this.shakeA = Math.max(this.shakeA, crit ? 5.5 : to.isPlayer ? 3.5 : heavy ? 4 : gun ? 3.5 : bow ? 1.6 : 2.6);
    }
    to.flashT = 0.08;
    to.squashT = 0.13;
    if (from.isPlayer || to.isPlayer) this.splat(to, crit ? 5 : heavy ? 4 : 2);
    const dx = to.x - from.x, dy = to.y - from.y, d = Math.hypot(dx, dy) || 1;
    const push = (crit ? 0.42 : heavy ? 0.4 : kind === 'blunt' ? 0.3 : bow ? 0.12 : 0.2) * (to.kind === 'suturer' && !to.monster ? 0.5 : 1);
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
    if (by.isPlayer) {
      // 24차 손맛: 마지막 일격 — 길게 멈칫, 크게 흔들리고, 멀리 나가떨어진다
      this.hitStop = Math.max(this.hitStop, 0.17);
      this.shakeT = Math.max(this.shakeT, 0.3); this.shakeA = Math.max(this.shakeA, 6);
      const dx = w.x - by.x, dy = w.y - by.y, d = Math.hypot(dx, dy) || 1;
      w.kb = { dx: (dx / d) * 0.9, dy: (dy / d) * 0.9, t: 0.22 };
      this.splat(w, 7);
      const [sx, sy] = iso(w.x, w.y);
      for (let k = 0; k < 12; k++) { const a = Math.random() * Math.PI * 2, v = 50 + Math.random() * 60; this.sparks.push({ x: sx, y: sy - 4, vx: Math.cos(a) * v, vy: Math.sin(a) * v * 0.35 - 10, t: 0.2 + Math.random() * 0.12, col: this.realm === 'heaven' ? 0xfff2b0 : 0xb8a888 }); }
    }
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
        if (w.weak === 'drunk') this.hooks.deed('drunkDown');
        else if (w.weak === 'shade') this.hooks.deed('shadeDown');
        else {
          this.hooks.deed(w.gang === 'mafia' ? 'gangDown' : w.gang === 'robber' ? 'robberDown' : 'thugDown');
          if (w.firstBy === w) this.hooks.deed('counterWin');
          // 21차: 불량배의 야구 배트 — 맨손일 때는 반드시, 그 밖엔 가끔 떨어뜨린다 (주워서 쓸 수 있다)
          // 26차: 야구 배트는 돈도 장비도 없는 초심자에게만, 단 한 번 (줍기 전에는 한 자루만 바닥에)
          if (this.realm === 'real' && w.weapon === 'bat' && !this.loots.some((l) => l.key === 'bat') && this.hooks.beginnerBat()) this.dropLoot(w.x + 0.4, w.y + 0.2, 'bat', 300);
        }
      }
    }
    if (w.kind === 'suturer') { w.down = 4; return; }
    // 경비병: 쓰러뜨려도 보상·카르마·영격 없음. 잠시 뒤 자리로 돌아온다
    if (w.gdef) { w.down = 25; w.warnT = 0; if (by.isPlayer) this.float(w, t().guardNoReward, '#c9c0b0'); return; }
    // 20차 천국: 악마를 쓰러뜨려도 보상·경험치·카르마 없음. 천사는 쓰러졌다 다시 일어난다
    if (this.realm === 'heaven' && (w.mdef || w.kind === 'angel' || w.kind === 'passer')) { w.down = w.kind === 'angel' ? 8 : 3; if (by.isPlayer && w.mdef) this.float(w, t().heavenNoReward, '#e8e0c8'); return; } // 21차: 천국의 행인은 맞아도 죽지 않는다
    if (w.mdef) {
      const f = this.zone.hell?.floor ?? 1;
      const mult = f * (w.mdef.boss ? 6 : 1);
      let share = 1;
      w.down = 5;
      if (by.isPlayer) this.hooks.deed('hellMonster', { floor: mult });
      else if (by.gdef || by.kind === 'talus' || by.kind === 'fighter') {
        // 내가 싸우던 괴물을 경비병(또는 탈루스)이 마무리: 내가 준 피해만큼(25~80%) 영격과 노전을 나눠 받는다
        const pd = w.pdmg ?? 0;
        share = pd > 0 ? Math.max(0.25, Math.min(0.8, pd / w.maxHp)) : 0;
        if (share > 0 && !this.dead) this.hooks.deed('hellMonster', { floor: mult, share });
        // 경비병이 잡은 만큼 곧바로 다시 채운다 (몸이 빨리 사라지고 바깥 들판에 새 괴물)
        if (!w.mdef.boss) w.down = 1.2;
        this.guardKills++;
      }
      if (w.mdef.boss) { this.bossDown = true; this.drawFeatures(); this.hooks.bossDown(f); }
      // 드물게 노전 말고 물건도 떨어진다 (층주는 둘)
      if (share > 0 || by.isPlayer) for (let n = w.mdef.boss ? 2 : Math.random() < 0.05 ? 1 : 0; n > 0; n--) this.dropLoot(w.x + (n - 1) * 0.6, w.y + 0.3, rollLoot(f));
      // 22차: 지옥 괴물의 노전도 폭을 넓혀 무작위로 (최소는 그대로, 최대는 약 1.8배)
      if (share > 0) this.dropCoin(w.x, w.y, Math.max(1, Math.round(rand(w.mdef.notes[0], Math.round(w.mdef.notes[1] * 1.8)) * (w.mdef.boss ? 1 : f) * share)), false, true);
      return;
    }
    if (w.weak === 'shade') { w.down = 2.5; return; } // 그림자는 흩어질 뿐 남기는 게 없다
    // 22차: 적대 NPC가 떨어뜨리는 돈은 폭을 넓혀 무작위로 — 취객 1~4 · 불량배 2~6 · 강도 3~9 · 마피아 4~12
    // 26차 경제: 싸움 한 번에 드는 끼니값보다 조금 더 (취객 2~6 · 불량배 5~12 · 강도 12~28 · 마피아 25~60)
    const amount = w.kind === 'thug' ? (w.gang === 'mafia' ? rand(25, 60) : w.gang === 'robber' ? rand(12, 28) : w.weak === 'drunk' ? rand(2, 6) : rand(5, 12)) : w.tour ? touristCash() : passerCash();
    this.dropCoin(w.x, w.y, amount, w.kind === 'passer');
  }

  /**
   * 고문 장면 하나: 0 = 그 층의 고문(26차 — 1층 화형 · 2층 늪에 담그기 · 3층 피 흥건한 채찍질 · 4층 용광로), 1 = 바닥에 쓰러진 망자를 몽둥이로
   * (1~4층 밖은 0도 말뚝에 묶어 두고 때린다)
   */
  private addTorture(i: number, j: number, variant: number) {
    const f = this.zone.hell!.floor;
    const lying = variant === 1;
    const style: Torture['style'] = lying ? 'beat' : ({ 1: 'burn', 2: 'dunk', 3: 'whip', 4: 'furnace' } as Record<number, Torture['style']>)[f] ?? 'beat';
    const vx = i + 0.5, vy = j + 0.5, tx = i + 1.55, ty = j + 0.45;
    const vic = new Sprite(), tor = new Sprite(), spark = new Graphics(), fx = new Graphics();
    // 고문자: 그 층의 큰 괴물(1층 뼈지기 · 2층 탐식귀 · 3층 피상인 · 4층 쇠망치병)이 몽둥이를 든다
    const tm = MONSTERS[floorDef(f).torturer];
    const tlook = this.monsterLook(tm);
    const vlook: Look = { sex: 'm', build: 1, skin: 0, hair: 0, hairColor: 0, top: 0, bottom: 0, outfit: 'ash', cols: { 1: '#8a8a90', 3: '#3a3434', 4: '#2e2828', 5: '#1a1410', 6: '#7a2a22', 9: '#3a3434', 10: '#8a8a90', 12: '#7a2a22', 13: '#2a1e18', 14: '#5a5652', 15: '#140e0c' } };
    const q: Torture = { tor, vic, tcs: null, vcs: null, x: vx, y: vy, tx, ty, t: Math.random() * 2, next: 0.5 + Math.random() * 1.5, t0: -9, hitT: -9, struck: true, lying, tdir: dirFromTile(vx - tx, vy - ty, 'sw'), vdir: dirFromTile(tx - vx, ty - vy, 'se'), spark, style, fx, sink: 0, flare: 0, parts: [], splats: 0 };
    const g = new Graphics();
    const [sx, sy] = iso(vx, vy);
    const stake = () => {
      g.rect(sx - 3, sy - 66, 6, 64).fill(0x2a1c16).rect(sx - 3, sy - 66, 2, 64).fill(0x4a3628);
      g.rect(sx - 8, sy - 50, 16, 3).fill(0x3a3632);
      for (const dy of [-44, -28]) for (let k = -10; k <= 10; k += 3) g.ellipse(sx + k, sy + dy + Math.abs(k) * 0.2, 1.6, 1).stroke({ color: 0x6a6660, width: 1 });
    };
    if (style === 'beat') {
      if (!lying) stake();
      g.ellipse(sx + 8, sy + 4, 18, 6).fill({ color: 0x4a0606, alpha: 0.75 });
      g.ellipse(sx + 2, sy + 2, 9, 3).fill({ color: 0x6a0a08, alpha: 0.8 });
    } else if (style === 'burn') {
      // 화형: 말뚝 둘레에 쌓은 장작과 숯, 그을린 땅
      g.ellipse(sx, sy + 2, 30, 11).fill({ color: 0x140c08, alpha: 0.8 });
      stake();
      for (let k = 0; k < 14; k++) {
        const a = (k / 14) * Math.PI * 2, r = 12 + (k % 3) * 3, lx = sx + Math.cos(a) * r, ly = sy + Math.sin(a) * r * 0.38;
        g.poly([lx - 8, ly - 2 - (k % 2) * 4, lx + 8, ly - 5 - (k % 2) * 4, lx + 8, ly - 1 - (k % 2) * 4, lx - 8, ly + 2 - (k % 2) * 4]).fill(k % 3 ? 0x4a3020 : 0x2a1a12);
      }
    } else if (style === 'dunk' || style === 'furnace') {
      // 늪: 검은 진흙 웅덩이와 나무 교수대 / 용광로: 돌 도가니에 끓는 쇳물과 쇠 기중기 (망자를 쇠사슬로 매단다)
      const molten = style === 'furnace';
      if (molten) {
        g.ellipse(sx, sy + 3, 30, 12).fill(0x3a3634);
        g.ellipse(sx, sy + 1, 30, 11).fill(0x5a5450);
      }
      if (!molten) g.ellipse(sx, sy + 2, 31, 12).fill(0x5a4a2a);
      g.ellipse(sx, sy + 1, molten ? 25 : 28, molten ? 9 : 10).fill(molten ? 0xff7a1a : 0x16110a);
      g.ellipse(sx - 3, sy, molten ? 18 : 20, 6).fill(molten ? 0xffc04a : 0x2a2214);
      if (!molten) g.ellipse(sx - 9, sy - 2, 7, 2).fill({ color: 0x6a5a3a, alpha: 0.6 });
      if (!molten) for (const [dx, dy] of [[-22, 2], [20, 4], [-12, 8], [14, -5]]) g.ellipse(sx + dx, sy + dy, 5, 2).fill({ color: 0x4a5a2a, alpha: 0.8 });
      const post = molten ? 0x3a3a3e : 0x4a3220, post2 = molten ? 0x5a5a60 : 0x6a4a30;
      for (const dx of [-30, 30]) g.rect(sx + dx - 3, sy - 94, 6, 92).fill(post).rect(sx + dx - 3, sy - 94, 2, 92).fill(post2);
      g.rect(sx - 34, sy - 98, 68, 6).fill(post).rect(sx - 34, sy - 98, 68, 2).fill(post2);
    } else if (style === 'whip') {
      // 채찍질: 말뚝, 흥건한 핏물
      g.ellipse(sx + 6, sy + 4, 26, 9).fill({ color: 0x4a0606, alpha: 0.8 });
      g.ellipse(sx - 4, sy + 2, 14, 5).fill({ color: 0x6a0a08, alpha: 0.85 });
      for (let k = 0; k < 9; k++) g.ellipse(sx - 24 + ((k * 37) % 50), sy - 6 + ((k * 23) % 18), 2 + (k % 3), 1 + (k % 2)).fill({ color: 0x7a0c0a, alpha: 0.8 });
      stake();
    }
    g.zIndex = vx + vy - 0.02;
    this.objects.addChild(g);
    const [ttx, tty] = iso(tx, ty);
    tor.position.set(ttx, tty); tor.zIndex = tx + ty;
    vic.position.set(sx, sy); vic.zIndex = vx + vy;
    spark.zIndex = 1e6 - 5;
    fx.zIndex = vx + vy + 0.01;
    this.objects.addChild(vic, tor, spark, fx);
    if (style === 'dunk' || style === 'furnace') {
      // 웅덩이 아래로 들어간 몸은 보이지 않게 (수면 위만 그린다)
      const m = new Graphics().rect(sx - 80, sy - 260, 160, 260 + 1).fill(0xffffff);
      this.objects.addChild(m);
      vic.mask = m;
      q.mask = m;
    }
    charSet(tlook, 'club').then((cs) => { q.tcs = cs; });
    charSet(vlook).then((cs) => { q.vcs = cs; });
    this.tortures.push(q);
  }
  private updateTorture(dt: number) {
    const p = this.player;
    const SW = 0.55;
    for (const q of this.tortures) {
      q.t += dt;
      const [sx, sy] = iso(q.x, q.y);
      const near = Math.hypot(q.x - p.x, q.y - p.y) < 13;
      const spot = () => sfx.spot((q.x - q.y - (p.x - p.y)) * (TW / 2), (q.x + q.y - (p.x + p.y)) * (TH / 2));
      if (q.style !== 'beat') { this.tortureFx(q, dt, sx, sy); }
      if (q.free) { // 고문하던 괴물이 싸우러 나섰다: 망자만 남는다
        if (q.style === 'dunk' || q.style === 'furnace') q.sink = Math.max(0, q.sink - dt * 0.8);
        if (q.vcs) applyFrame(q.vic, q.lying ? frameOf(q.vcs, 'fall', q.vdir, (q.vcs.counts.fall ?? 1) - 1) : frameOf(q.vcs, 'idle', q.vdir, 0));
        if (q.style === 'dunk' || q.style === 'furnace') q.vic.y = sy - 8 + q.sink * 46;
        if (q.spark.alpha > 0) q.spark.alpha = Math.max(0, q.spark.alpha - dt * 5);
        continue;
      }
      // 늪·용광로는 한 번 담갔다 꺼내는 데 더 오래 걸린다
      const cycle = q.style === 'dunk' || q.style === 'furnace' ? 4.2 + Math.random() * 1.6 : 1.5 + Math.random() * 1.1;
      if (q.t >= q.next) { q.t0 = q.t; q.struck = false; q.next = q.t + cycle; }
      const a = (q.t - q.t0) / SW;
      if (q.tcs) {
        const n = q.tcs.counts.swing ?? 0;
        if (a >= 0 && a < 1 && n) applyFrame(q.tor, frameOf(q.tcs, 'swing', q.tdir, Math.min(n - 1, Math.floor(a * n))), 1.12);
        else applyFrame(q.tor, frameOf(q.tcs, 'idle', q.tdir, 0), 1.12);
      }
      if (!q.struck && a >= 0.62) {
        q.struck = true;
        q.hitT = q.t;
        if (q.style === 'burn') { q.flare = 1; if (near) sfx.flame(spot()); }
        else if (q.style === 'dunk' || q.style === 'furnace') { if (near) { if (q.style === 'furnace') sfx.flame(spot()); else sfx.impact('blunt', spot(), false, 'pret', 0.6); } }
        else {
          if (near) sfx.impact(q.style === 'whip' ? 'blade' : 'blunt', spot(), Math.random() < 0.2, 'ash', q.style === 'whip' ? 1.2 : 0.85);
          q.spark.clear();
          for (let k = 0; k < 6; k++) { const ang = Math.random() * Math.PI * 2, l = 4 + Math.random() * 7; q.spark.moveTo(sx, sy - 30).lineTo(sx + Math.cos(ang) * l, sy - 30 + Math.sin(ang) * l * 0.7).stroke({ color: k % 2 ? 0xff3a1a : 0xffd28a, width: 1.5 }); }
          q.spark.alpha = 1;
          if (q.style === 'whip') for (let k = 0; k < 7; k++) q.parts.push({ x: sx + (Math.random() - 0.5) * 6, y: sy - 32, vx: (Math.random() - 0.3) * 60, vy: -30 - Math.random() * 40, t: 0.7, c: 0x9a0a0a, r: 1.4 });
        }
      }
      if (q.spark.alpha > 0) q.spark.alpha = Math.max(0, q.spark.alpha - dt * 5);
      if (q.vcs) {
        const since = q.t - q.hitT;
        const nh = q.vcs.counts.hit ?? 0;
        if (q.style === 'dunk' || q.style === 'furnace') {
          // 내려가 잠기고(늪은 머리까지, 용광로는 허리까지) 잠시 버틴 뒤 끌어올린다. 올라오면 몸부림
          const deep = q.style === 'dunk' ? 1.02 : 0.55;
          const u = q.t - q.t0;
          const target = u < 0.6 ? 0 : u < 1.4 ? deep * ((u - 0.6) / 0.8) : u < 2.6 ? deep : u < 3.3 ? deep * (1 - (u - 2.6) / 0.7) : 0;
          q.sink += (target - q.sink) * Math.min(1, dt * 10);
          q.vic.y = sy - 8 + q.sink * 46;
          const writhe = (u > 3.2 && u < 3.9) || (q.style === 'furnace' && q.sink > 0.2);
          if (writhe && nh) applyFrame(q.vic, frameOf(q.vcs, 'hit', q.vdir, Math.floor(q.t * 8) % nh));
          else applyFrame(q.vic, frameOf(q.vcs, 'idle', q.vdir, 0));
        } else if (q.lying) {
          const nf = q.vcs.counts.fall ?? 1;
          applyFrame(q.vic, frameOf(q.vcs, 'fall', q.vdir, nf - 1));
          q.vic.y = sy - (since < 0.12 ? 2 : 0);
        } else {
          const burning = q.style === 'burn' && q.flare > 0.25;
          if ((since < 0.35 || burning) && nh) applyFrame(q.vic, frameOf(q.vcs, 'hit', q.vdir, burning ? Math.floor(q.t * 7) % nh : Math.min(nh - 1, Math.floor((since / 0.35) * nh))));
          else applyFrame(q.vic, frameOf(q.vcs, 'idle', q.vdir, 0));
        }
      }
    }
  }
  /** 26차: 층마다 다른 고문의 움직이는 부분 — 불길 · 진흙 거품 · 쇳물 불티 · 채찍 줄과 핏방울 */
  private tortureFx(q: Torture, dt: number, sx: number, sy: number) {
    const g = q.fx;
    g.clear();
    const T = this.time;
    if (q.style === 'burn') {
      q.flare = Math.max(0, q.flare - dt * 0.7);
      const h = 16 + q.flare * 26;
      for (let k = 0; k < 9; k++) {
        const ox = (k - 4) * 4.2, ph = T * 9 + k * 1.7, hh = h * (0.55 + 0.45 * Math.abs(Math.sin(ph))) * (1 - Math.abs(k - 4) * 0.08);
        const bx = sx + ox, by = sy - 2;
        g.poly([bx - 5, by, bx + 5, by, bx + Math.sin(ph) * 2, by - hh]).fill({ color: 0xd83a12, alpha: 0.85 });
        g.poly([bx - 3, by, bx + 3, by, bx + Math.sin(ph + 1) * 1.5, by - hh * 0.66]).fill({ color: 0xffa030, alpha: 0.9 });
        g.poly([bx - 1.5, by, bx + 1.5, by, bx, by - hh * 0.35]).fill({ color: 0xfff0a0, alpha: 0.9 });
      }
      g.ellipse(sx, sy - 10, 26 + q.flare * 10, 16 + q.flare * 6).fill({ color: 0xff7a1a, alpha: 0.1 + q.flare * 0.1 });
      if (Math.random() < dt * (6 + q.flare * 20)) q.parts.push({ x: sx + (Math.random() - 0.5) * 20, y: sy - 10, vx: (Math.random() - 0.5) * 14, vy: -30 - Math.random() * 30, t: 1.2, c: Math.random() < 0.5 ? 0xffb040 : 0x5a4a44, r: 1.1 });
    } else if (q.style === 'dunk') {
      if (q.sink > 0.4 && Math.random() < dt * 8) q.parts.push({ x: sx + (Math.random() - 0.5) * 16, y: sy, vx: 0, vy: -3, t: 0.5, c: 0x5a5236, r: 1.6, ring: true });
      if (q.sink < 0.2 && q.t - q.t0 > 3 && q.t - q.t0 < 4.5 && Math.random() < dt * 10) q.parts.push({ x: sx + (Math.random() - 0.5) * 8, y: q.vic.y - 20 - Math.random() * 20, vx: 0, vy: 40, t: 0.4, c: 0x3a3220, r: 1.2 });
      const ropeTop = sy - 94, head = q.vic.y - 46;
      g.moveTo(sx, ropeTop).lineTo(sx, head).stroke({ color: 0x8a7a5a, width: 1.5 });
      g.ellipse(sx, sy + 1, 25 * (0.9 + 0.1 * Math.sin(T * 2)), 9).stroke({ color: 0x4a4228, width: 1, alpha: 0.6 });
    } else if (q.style === 'furnace') {
      const glow = 0.25 + q.sink * 0.9;
      g.ellipse(sx, sy - 6, 34, 18).fill({ color: 0xff6a1a, alpha: 0.08 + glow * 0.12 });
      if (Math.random() < dt * (5 + q.sink * 40)) q.parts.push({ x: sx + (Math.random() - 0.5) * 30, y: sy, vx: (Math.random() - 0.5) * 50, vy: -40 - Math.random() * 60, t: 0.9, c: Math.random() < 0.6 ? 0xffd060 : 0xff6a1a, r: 1.2 });
      if (q.sink > 0.3 && Math.random() < dt * 6) q.parts.push({ x: sx + (Math.random() - 0.5) * 12, y: sy - 20, vx: (Math.random() - 0.5) * 8, vy: -22, t: 1.6, c: 0x4a4444, r: 3, smoke: true });
      const top = sy - 94, head = q.vic.y - 46;
      for (let y = top; y < head; y += 4) g.ellipse(sx + (Math.floor((y - top) / 4) % 2 ? 1 : -1), y, 1.6, 2.2).stroke({ color: 0x6a6660, width: 1 });
    } else if (q.style === 'whip') {
      // 채찍: 휘두르는 동안 고문자 손에서 망자 등으로 휘어 들어가는 줄
      const u = (q.t - q.t0) / 0.55;
      if (u >= 0.2 && u < 1.1 && !q.free) {
        const [hx, hy] = iso(q.tx, q.ty);
        const k = Math.min(1, (u - 0.2) / 0.5);
        const ex = hx + (sx - hx) * k, ey = hy - 34 + (sy - 30 - (hy - 34)) * k;
        const cx = (hx + ex) / 2, cy = Math.min(hy, sy) - 58 + k * 30;
        g.moveTo(hx, hy - 34).quadraticCurveTo(cx, cy, ex, ey).stroke({ color: 0x2a1a12, width: 1.6 });
      }
    }
    // 불티 · 거품 · 핏방울 · 연기
    for (let k = q.parts.length - 1; k >= 0; k--) {
      const pt = q.parts[k];
      pt.t -= dt;
      if (pt.t <= 0) { q.parts.splice(k, 1); continue; }
      pt.x += pt.vx * dt; pt.y += pt.vy * dt;
      if (!pt.ring && !pt.smoke && q.style === 'whip') pt.vy += 160 * dt;
      if (pt.ring) g.ellipse(pt.x, pt.y, pt.r * (2 - pt.t * 2), pt.r * (1 - pt.t)).stroke({ color: pt.c, width: 1, alpha: Math.min(1, pt.t * 3) });
      else g.circle(pt.x, pt.y, pt.smoke ? pt.r * (2.2 - pt.t) : pt.r).fill({ color: pt.c, alpha: Math.min(pt.smoke ? 0.4 : 1, pt.t * 2) });
    }
  }

  /** 미납귀: 빚이 남아 있으면 나타나 따라다니고, 미납귀 몫의 노전으로 달려가 문다. 다 갚으면 흐려지며 돌아간다 */
  private updateHound(dt: number) {
    const p = this.player;
    const debt = this.hooks.debt();
    if (debt > 0 && !this.hound && !this.dead) {
      this.hound = new Hound(p.x - 1.2, p.y + 0.6);
      this.objects.addChild(this.hound.view);
    }
    const hd = this.hound;
    if (!hd) return;
    if (debt <= 0 && !hd.leaving) {
      hd.leaving = true;
      for (const c of this.coins) c.claimed = false;
    }
    let mx = 0, my = 0;
    if (hd.leaving) {
      hd.view.alpha -= dt * 0.8;
      mx = -1.6 * dt; my = -1.6 * dt;
      if (hd.view.alpha <= 0) { hd.destroy(); this.hound = null; return; }
    } else {
      let tgt: Coin | null = null, best = 30;
      for (const c of this.coins) if (c.claimed) { const d = Math.hypot(c.x - hd.x, c.y - hd.y); if (d < best) { best = d; tgt = c; } }
      if (tgt) {
        const dx = tgt.x - hd.x, dy = tgt.y - hd.y, d = Math.hypot(dx, dy);
        const step = 5.2 * dt;
        if (d <= Math.max(0.35, step)) {
          const take = Math.min(tgt.amount, this.hooks.debt());
          this.hooks.debtEat(take);
          tgt.amount -= take;
          sfx.thud(sfx.spot(hd.x - p.x, hd.y - p.y));
          if (tgt.amount <= 0) { tgt.sprite.destroy(); this.coins.splice(this.coins.indexOf(tgt), 1); }
          else tgt.claimed = false; // 빚보다 많이 떨어지면 남은 것은 내 몫
        } else { mx = (dx / d) * step; my = (dy / d) * step; }
      } else {
        // 내 뒤 한 칸 반쯤에서 따라온다. 너무 멀어지면 가까이 다시 나타난다
        const tx = p.x - 1.1, ty = p.y + 0.9;
        const dx = tx - hd.x, dy = ty - hd.y, d = Math.hypot(dx, dy);
        if (d > 16) { hd.x = tx; hd.y = ty; }
        else if (d > 0.6) { const step = Math.min(d, Math.max(3, d * 1.6) * dt); mx = (dx / d) * step; my = (dy / d) * step; }
      }
    }
    hd.x += mx; hd.y += my;
    const [sx, sy] = iso(hd.x, hd.y);
    hd.view.position.set(Math.round(sx), Math.round(sy));
    hd.view.zIndex = hd.x + hd.y;
    hd.pose(dt, Math.hypot(mx, my) > 1e-4, mx - my);
  }

  private dropCoin(x: number, y: number, amount: number, fromVictim: boolean, notes = false) {
    const g = new Graphics();
    g.ellipse(0, 0, 6, 2.6).fill({ color: 0x000000, alpha: 0.35 });
    if (notes) {
      // 노전: 붉고 누런 종이돈 몇 장
      for (const [dx, dy, c] of [[-3, -2, 0xb8302a], [2, -2, 0xd9a03a], [0, -4, 0xc94a2a]] as const) g.rect(dx - 3, dy - 1.5, 6, 3).fill(c).stroke({ color: 0x3a1410, width: 0.6 });
    } else for (const [dx, dy, c] of [[-2, -1, 0xc9a23e], [2, -1, 0xe0b437], [0, -3, 0xf2d27a]] as const) g.ellipse(dx, dy, 3, 1.6).fill(c).stroke({ color: 0x6b4a1c, width: 0.6 });
    const cx = x + 0.3, cy = y + 0.15;
    const [sx, sy] = iso(cx, cy);
    g.position.set(sx, sy);
    g.zIndex = cx + cy - 0.4;
    this.objects.addChild(g);
    // 빚이 있으면 떨어진 노전은 미납귀 몫 (내가 먼저 밟아도 못 줍는다)
    const claimed = notes && !!this.zone.hell && this.hooks.debt() > 0;
    if (claimed) g.circle(0, -9, 2.2).fill({ color: 0xff3a1a, alpha: 0.85 });
    this.coins.push({ x: cx, y: cy, amount, sprite: g, fromVictim, life: 120, notes, claimed });
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
  /** 25차: 불을 뿜는 이 — 화염방사기를 든 나(연료가 남았을 때) · 불씨귀 */
  private flames(w: Walker) {
    return w.isPlayer ? !!this.gear.flame && this.gear.ranged : !!w.mdef?.flame;
  }
  private fires: { x: number; y: number; vx: number; vy: number; t: number; T: number; d: number; r: number }[] = [];
  private jets: { x0: number; y0: number; x1: number; y1: number; t: number; w: number }[] = [];
  private fireG = new Graphics();
  /** 불길: 분사구에서 표적까지 불덩이가 부풀며 흘러가고, 끝은 그을음이 되어 떠오른다 */
  private flameJet(from: Walker, to: Walker) {
    if (!this.fireG.parent) { this.fireG.zIndex = 1e6 - 3; this.objects.addChild(this.fireG); }
    const [ax, ay] = iso(from.x, from.y), [bx, by] = iso(to.x, to.y);
    const dx = bx - ax, dy = by - ay, L = Math.hypot(dx, dy) || 1;
    const mx = ax + (dx / L) * 16, my = ay - 24 + (dy / L) * 6;
    // 불길은 표적을 지나 조금 더 뻗는다
    const tx = bx + (dx / L) * 10, ty = by - 20 + (dy / L) * 5;
    const big = from.isPlayer ? 1.15 : 0.85;
    this.jets.push({ x0: mx, y0: my, x1: tx, y1: ty, t: 0.28, w: big });
    for (let k = 0; k < 34; k++) {
      const T = 0.3 + Math.random() * 0.22, go = T * 0.7;
      const nx = -(ty - my) / L, ny = (tx - mx) / L, sp = (Math.random() - 0.5) * 34;
      this.fires.push({ x: mx, y: my, vx: (tx - mx) / go + nx * sp, vy: (ty - my) / go + ny * sp * 0.6, t: T, T, d: k * 0.008, r: big * (0.6 + Math.random() * 0.6) });
    }
  }
  private drawFire(dt: number) {
    const g = this.fireG;
    if (!this.fires.length && !this.jets.length) { if (g.parent) g.clear(); return; }
    g.clear();
    // 분사구에서 뻗는 불줄기: 바깥 주황, 안쪽 노란 심지 (끝으로 갈수록 넓어진다)
    for (let k = this.jets.length - 1; k >= 0; k--) {
      const j = this.jets[k];
      j.t -= dt;
      if (j.t <= 0) { this.jets.splice(k, 1); continue; }
      const L = Math.hypot(j.x1 - j.x0, j.y1 - j.y0) || 1, nx = -(j.y1 - j.y0) / L, ny = (j.x1 - j.x0) / L, a = Math.min(1, j.t / 0.12);
      for (const [wd, col, al] of [[9, 0xe8481a, 0.55], [5.5, 0xffa030, 0.75], [2.2, 0xfff4c0, 0.9]] as [number, number, number][]) {
        const w0 = 1.2 * j.w, w1 = wd * j.w;
        g.poly([j.x0 + nx * w0, j.y0 + ny * w0, j.x1 + nx * w1, j.y1 + ny * w1, j.x1 - nx * w1, j.y1 - ny * w1, j.x0 - nx * w0, j.y0 - ny * w0]).fill({ color: col, alpha: al * a });
      }
    }
    for (let k = this.fires.length - 1; k >= 0; k--) {
      const f = this.fires[k];
      if (f.d > 0) { f.d -= dt; continue; }
      f.t -= dt;
      if (f.t <= 0) { this.fires.splice(k, 1); continue; }
      const a = 1 - f.t / f.T; // 0 → 1
      const slow = a > 0.7 ? 0.25 : 1;
      f.x += f.vx * dt * slow; f.y += f.vy * dt * slow;
      if (a > 0.7) f.y -= 38 * dt;
      const r = (2.2 + a * 7.5) * f.r;
      const col = a < 0.22 ? 0xfff4b0 : a < 0.5 ? 0xffb03a : a < 0.78 ? 0xe8481a : 0x3a2a26;
      const al = a < 0.78 ? 0.9 - a * 0.4 : (1 - a) * 1.6;
      if (a < 0.6) g.circle(f.x, f.y, r * 1.6).fill({ color: 0xff7a1a, alpha: 0.12 });
      g.circle(f.x, f.y, r).fill({ color: col, alpha: al });
    }
  }

  private swing(from: Walker, to: Walker, ranged = false, flame = false) {
    if (flame) { this.flameJet(from, to); return; }
    const g = new Graphics();
    if (ranged && (from.isPlayer ? this.bowOn() : false)) {
      // 24차: 활 — 화살이 날아가 꽂힌다 (총구 불꽃 대신)
      const [ax, ay] = iso(from.x, from.y), [bx, by] = iso(to.x, to.y);
      const x0 = ax, y0 = ay - 30, x1 = bx, y1 = by - 26, a = Math.atan2(y1 - y0, x1 - x0);
      g.moveTo(-9, 0).lineTo(5, 0).stroke({ color: 0xd8c8a0, width: 1.4 }).poly([5, -2, 9, 0, 5, 2]).fill(0xeeeeee).moveTo(-9, -2).lineTo(-6, 0).lineTo(-9, 2).stroke({ color: 0xc0402a, width: 1 });
      g.rotation = a; g.position.set(x0, y0); g.zIndex = 1e6 - 4;
      this.objects.addChild(g);
      this.flyArrows.push({ g, x0, y0, x1, y1, t: 0, T: Math.max(0.04, Math.hypot(x1 - x0, y1 - y0) / 900) });
      return;
    }
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
    else if (!w.act && w.still) { const sa: Anim = w.still === 'lotus' && cs.counts.lotus ? 'lotus' : 'sit'; if (w.still === 'lie' || !cs.counts[sa]) { anim = w.still === 'lie' ? 'fall' : 'idle'; i = w.still === 'lie' ? (cs.counts.fall ?? 1) - 1 : 0; } else { anim = sa; i = 0; } }
    if (anim === 'walk') i %= cs.counts.walk ?? 8;
    if (w.art && anim === 'idle' && (w.dir === 'sw' || w.dir === 'se')) { this.poseArt(w, cs, w.art); return; }
    applyFrame(w.sprite, frameOf(cs, anim, w.dir, i), w.size ?? 1);
  }
  /** 관리자 도트로 서 있기: 같은 크기면 1배, 2배 크기면 반으로 (더 섬세한 그림), 크기가 다르면 게임 속 키에 맞춘다 */
  private poseArt(w: Walker, cs: CharSet, tx: Texture) {
    const f = frameOf(cs, 'idle', 'sw', 0);
    if (!f) return;
    const s = w.sprite, size = w.size ?? 1, flip = w.dir === 'se' ? -1 : 1;
    if (s.texture !== tx) s.texture = tx;
    const lw = Math.round(f.w * f.k), lh = Math.round(f.h * f.k);
    const k = tx.width === lw * 2 && tx.height === lh * 2 ? 2 : tx.width === lw && tx.height === lh ? 1 : 0;
    if (k) { s.anchor.set(f.ax, f.ay); s.scale.set((flip * size) / k, size / k); }
    else { s.anchor.set(0.5, 1); const z = (lh / tx.height) * size; s.scale.set(flip * z, z); }
  }

  /** 사람 한 명의 싸움 행동 (쫓아가서 때리기) */
  private fight(w: Walker, dt: number) {
    const tg = w.target;
    if (!tg) return;
    if (tg.down > 0 || (tg.isPlayer && this.dead)) { w.target = null; return; }
    const dist = Math.hypot(tg.x - w.x, tg.y - w.y);
    const flame = this.flames(w);
    const ranged = w.isPlayer ? this.gear.ranged : w.weapon === 'pistol' || flame;
    const reach = flame ? FLAME : ranged ? (w.isPlayer ? this.gear.range ?? RANGED : RANGED) : MELEE;
    // 불량배는 자기 골목에서 너무 멀어지면 포기한다
    if (w.kind === 'thug' && Math.hypot(w.x - w.home[0], w.y - w.home[1]) > (this.gangZone() ? 22 : 14)) { w.target = null; w.path = []; return; }
    // 27차: 맞선 행인도 자리에서 12칸 넘게는 쫓지 않는다
    if (w.kind === 'passer' && (Math.hypot(w.x - w.home[0], w.y - w.home[1]) > 12 || (tg.isPlayer && this.invisible))) { w.target = null; w.path = []; return; }
    // 괴물: 영혼이 휴식 공간에 들어가면 포기, 층주는 자리에서 10칸 넘게 쫓지 않는다
    if (w.mdef && !w.invader && (this.inRest(tg.x, tg.y) || Math.hypot(w.x - w.home[0], w.y - w.home[1]) > (w.mdef.boss ? 10 : 18))) {
      w.target = null;
      const path = findPath(this.zone, Math.floor(w.x), Math.floor(w.y), w.home[0], w.home[1]);
      w.path = path ?? [];
      return;
    }
    // 경비병: 마을 둘레(울타리 밖 10칸)를 넘어서까지 쫓지 않는다
    if (w.gdef && !this.nearRest(tg.x, tg.y, 10)) {
      w.target = null; w.path = [];
      if (tg.isPlayer) this.guardHostAt = -99;
      return;
    }
    // 24차 무빙샷: 내가 누른 길을 걸으면서 사거리 안이면 쏜다 (멀어지면 화살을 아끼고 걷기만)
    const kiting = w.isPlayer && this.kite && ranged && w.path.length > 0;
    if (kiting && dist > RANGED + 7) { w.target = null; this.kite = false; return; }
    if (kiting && dist > reach) { w.atkT = Math.max(0, w.atkT - dt); return; }
    if (dist > reach && !kiting) {
      w.repathT -= dt;
      if (w.repathT <= 0 || !w.path.length) {
        w.repathT = 0.45;
        const path = findPath(this.zone, Math.floor(w.x), Math.floor(w.y), Math.floor(tg.x), Math.floor(tg.y));
        if (path) w.path = path.length > 1 ? path.slice(0, -1) : path;
      }
      return;
    }
    if (!kiting) w.path = [];
    // 공격 장면이 대각선으로만 있으면 대각선 넷 중에서, 상하좌우까지 있으면(2배 그림) 8방향으로 바라본다
    if (!w.act || w.act.anim !== 'fall') w.dir = dirFromTile(tg.x - w.x, tg.y - w.y, w.dir, !!w.cs?.eight);
    w.atkT -= dt;
    if (w.atkT > 0) return;
    if (w.isPlayer) {
      // 양손 무기: 한 번 내려찍는 데 더 오래 걸리지만 훨씬 묵직하다
      const two = !ranged && TWO.has(this.gear.weapon ?? '');
      w.atkT = ATK_INTERVAL * (two ? 1.6 : 1) * (ranged ? this.gear.rate ?? 1 : 1); // 저격총은 천천히
      this.quickUsed = false; // 반 박자 당기기는 공격 한 번에 한 번
      if (ranged && !this.hooks.useAmmo()) { this.gear.ranged = false; return; }
      // 근접은 힘, 원거리(권총·활)는 민첩이 공격력에 더해진다
      let dmg = Math.round((rand(4, 8) + this.gear.atk * 3 + (ranged ? Math.round(this.stats.agi * 1.5) : this.stats.str)) * (two ? 1.35 : 1));
      const crit = Math.random() * 100 < critChance(this.stats.fai);
      if (crit) dmg *= CRIT_MULTIPLIER;
      this.startAttack(w, tg, dmg, crit);
    } else {
      w.atkT = w.kind === 'goat' ? 1.05 : w.gdef ? w.gdef.atk : w.mdef ? w.mdef.atk : w.kind === 'suturer' ? (w.monster ? 0.68 : 0.8) : w.weak ? 1.25 : w.weapon === 'pistol' ? 1.4 : w.gang ? 0.8 : 0.9;
      const f = this.zone.hell?.floor ?? 1;
      const base = w.kind === 'goat' ? rand(10, 19) : w.kind === 'angel' ? rand(30, 52) : w.gdef ? (tg.isPlayer ? Math.max(rand(w.gdef.dmg[0], w.gdef.dmg[1]) * 0.6, tg.maxHp * 0.12) : rand(w.gdef.dmg[0], w.gdef.dmg[1])) * (tg.sealT && tg.sealT > 0 ? 1.5 : 1) : w.mdef ? rand(w.mdef.dmg[0], w.mdef.dmg[1]) * (w.mdef.boss ? 1 : 1 + 0.25 * (f - 1)) * (w.sealT && w.sealT > 0 ? 0.5 : 1) : w.kind === 'suturer' ? rand(10, 18) * (w.monster ? 1.6 : 1) : w.kind === 'fighter' ? rand(20, 34) * (1 + 0.3 * (f - 1)) : w.weak ? rand(1, 4) : w.kind === 'passer' ? (w.gunman ? rand(14, 22) : rand(3, 7) + (w.weapon ? 3 : 0)) : w.gang === 'mafia' ? rand(10, 17) + (w.weapon ? 4 : 0) : w.gang === 'robber' ? rand(6, 12) + (w.weapon ? 3 : 0) : rand(3, 7) + (w.weapon ? 2 : 0);
      const dmg = Math.max(1, Math.round(base) - (tg.isPlayer ? this.gear.dr ?? 0 : 0));
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
    const flame = this.flames(w);
    const ranged = w.isPlayer ? this.gear.ranged : w.weapon === 'pistol' || flame;
    if (flame) sfx.flame(this.spotOf(w));
    else if (ranged && (w.isPlayer ? this.gear.weapon : w.weapon) !== 'bow') sfx.gunshot(this.spotOf(w));
    if (Math.hypot(tg.x - w.x, tg.y - w.y) > (flame ? FLAME : ranged ? (w.isPlayer ? this.gear.range ?? RANGED : RANGED) : MELEE) + (w.isPlayer && this.kite ? 2 : 0.6)) return;
    if (w.isPlayer) w.lungeT = ranged ? 0 : 0.1;
    this.swing(w, tg, ranged, flame);
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
    if (!(w.isPlayer && this.kite && w.act && w.target)) w.dir = dirFromTile(ax / look - w.x, ay / look - w.y, w.dir); // 무빙샷: 쏘는 동안은 표적을 본다
    let speed = w.speed;
    if (w.isPlayer && this.kite && w.act) speed *= 0.8; // 시위를 당기는 동안 조금 느리게
    if (w.flee > 0) speed = 1.9;
    if (w.isPlayer && isDanger(w.hp, w.maxHp)) speed *= DANGER_SPEED;
    if (w.kind === 'thug' && w.target) speed = w.weak ? 1.05 : w.gang === 'robber' ? 1.95 : w.gang === 'mafia' ? 1.75 : 1.6;
    else if (w.kind === 'thug' && w.stalk) speed = w.weak ? 0.85 : 1.3;
    if (w.mdef && w.target) speed = w.mdef.speed * 1.35;
    if (w.gdef && w.target) speed = w.gdef.speed * 2.4;
    if (w.kind === 'goat') speed = w.flee > 0 ? 5.2 : w.target ? 2.1 : 0.85; // 죽기 직전의 염소는 믿기지 않게 빠르다
    if (w.slowT && w.slowT > 0) speed *= 0.5;
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
    this.drawFire(realDt);
    if (this.zone.hell) { this.drawEmbers(realDt); this.updateHound(dt); this.updateTorture(dt); this.drawGuardFx(dt); this.drawLiquid(realDt); }
    if (this.realm === 'heaven') this.updateHeaven(realDt);
    if (this.shoreFx) this.updateShore(realDt);
    if (this.shipGo) this.updateShip(realDt);
    if (this.zone.homeAlley && !this.zone.interior && this.realm === 'real') {
      const a = this.zone.homeAlley, pl = this.player;
      const inA = pl.x >= a.i0 && pl.x <= a.i1 + 1 && pl.y >= a.j0 && pl.y <= a.j1 + 1;
      if (inA && !this.inAlley) { this.inAlley = true; this.yunaeAge = Math.floor(Math.random() * 3) as 0 | 1 | 2; this.placeYunae(); this.hooks.homeAlley(); if (Math.random() < 0.22) this.ambushT = 2.2 + Math.random() * 2; } // 가끔 집 가는 길에 대식자
      else if (!inA && this.inAlley && (pl.x > a.i1 + 6 || pl.y > a.j1 + 6)) this.inAlley = false;
    }
    if (this.ambushT > 0 && (this.ambushT -= dt) <= 0 && !this.zone.interior) this.spawnSuturer();
    if (this.goatT > 0 && (this.goatT -= dt) <= 0) { this.goatT = -1; if (!this.walkers.some((x) => x.kind === 'goat')) this.spawnGoat(); }
    if (this.kerb) this.updateKerberos(dt);
    if (this.guide) this.updateGuide(dt);
    this.updateLandmarks(dt);
    if (this.hazeOn && this.terraceSky) { this.terraceSky.width = this.app.screen.width; this.terraceSky.height = this.app.screen.height; }
    if (this.stairWant && this.heavenStair) {
      const st = this.heavenStair;
      if (Math.hypot(st.i + 0.5 - this.player.x, st.j + 0.5 - this.player.y) < 1.6) { this.stairWant = false; this.hooks.heavenAct('terrace'); }
      else if (!this.player.path.length) this.stairWant = false;
    }
    if (this.overHp > 0) { this.overHp = Math.max(0, this.overHp - (this.overMax / 600) * dt); if (Math.floor(this.time * 2) !== Math.floor((this.time - dt) * 2)) this.hooks.over(this.overHp); }
    if (this.portal) this.updatePortal(dt);
    this.time += dt;
    if (this.stun > 0) { this.stun -= dt; p.path = []; }
    const clk = bangkokClock();
    const nf = nightFactor(clk.h, clk.m);
    // 대식자: 죄를 지었을 때 가끔(35%) 하나가 나타난다. 오래 도망치면(14칸 밖에서 8초) 포기하고, 표시가 사라져도 물러난다
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
            if (w.kind === 'goat') { this.removeWalker(w); this.goatT = 90 + Math.random() * 90; continue; }
            if (w.mdef) { if (w.mdef.boss || w.raider || w.invader || w.kid || !this.zone.hell) this.removeWalker(w); else this.spawnMonster(w); continue; }
            if (w.gdef) { const g = this.makeGuard(w.gdef, w.post ?? 0); this.removeWalker(w); this.walkers.push(g); continue; }
            if (w.kind === 'fighter') { this.reviveFighter(w); continue; }
            if (w.kind === 'soul' || w.kind === 'vendor') { w.hp = w.maxHp; continue; }
            if (this.realm === 'heaven' && (w.kind === 'passer' || w.kind === 'angel')) { w.hp = w.maxHp; w.flee = 2; continue; } // 21차: 천국에서는 아무도 죽지 않는다 — 털고 일어난다
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
      // 취객은 걸을 때 비틀거린다
      const sway = w.weak === 'drunk' && moving ? Math.sin(this.time * 3.1 + w.home[0]) * 2.2 : 0;
      let lx = 0, ly = 0;
      if (w.lungeT && w.lungeT > 0 && w.target) { // 24차: 때리는 순간 반 걸음 앞으로
        const [tx2, ty2] = iso(w.target.x, w.target.y), q = Math.sin((w.lungeT / 0.1) * Math.PI) * 4, L = Math.hypot(tx2 - sx, ty2 - sy) || 1;
        lx = ((tx2 - sx) / L) * q; ly = ((ty2 - sy) / L) * q; w.lungeT -= dt;
      }
      w.sprite.position.set(sx + sway + lx, sy + ly);
      if (w.squashT && w.squashT > 0) { const q = w.squashT / 0.13; w.sprite.scale.x *= 1 + 0.16 * q; w.sprite.scale.y *= 1 - 0.13 * q; w.squashT -= dt; }
      w.sprite.zIndex = w.down > 0 ? w.x + w.y - 0.3 : w.x + w.y;
      if (w.glasses) { const fr = w.dir === 'ne' || w.dir === 'nw' || w.dir === 'n'; w.glasses.visible = !fr && w.down <= 0 && w.sprite.visible; w.glasses.position.set(sx + (w.dir === 'sw' || w.dir === 'w' ? -2 : w.dir === 'se' || w.dir === 'e' ? 2 : 0), sy - 44.5 * (w.size ?? 1)); w.glasses.zIndex = w.x + w.y + 0.004; }
      if (w.horns) { w.horns.visible = w.down <= 0 && w.sprite.visible; w.horns.position.set(sx, sy - 47 * (w.size ?? 1)); w.horns.zIndex = w.x + w.y + 0.003; }
      if (w.wings) {
        const up = w.dir === 'ne' || w.dir === 'nw' || w.dir === 'n';
        w.wings.visible = w.down <= 0 && w.sprite.visible;
        w.wings.position.set(sx, sy - 27 * (w.size ?? 1) - (w.wingK ? (w.wingK - 1) * 6 : 0));
        w.wings.zIndex = w.x + w.y + (up ? 0.002 : -0.002);
        const wk = 0.5 * (w.wingK ?? 1);
        w.wings.scale.set(wk * (w.dir === 'e' || w.dir === 'w' ? 0.55 : 1), wk * (1 + Math.sin(this.time * (moving ? 6 : 2.2) + w.home[1]) * 0.07));
      }
      if (w.flashT && w.flashT > 0) { w.flashT -= dt; w.sprite.tint = 0xffffff; if (w.sprite.blendMode !== 'add') w.sprite.blendMode = 'add'; }
      else { if (w.sprite.blendMode !== 'normal') w.sprite.blendMode = 'normal'; if (w.hurtT > 0) { w.hurtT -= dt; w.sprite.tint = 0xff7a6a; } else w.sprite.tint = 0xffffff; }
      if (w.kb) {
        const k = Math.min(1, dt / w.kb.t);
        const nx = w.x + w.kb.dx * k, ny = w.y + w.kb.dy * k;
        if (walkable(this.zone, Math.floor(nx), Math.floor(ny)) && !(w.mdef && this.inRest(nx, ny))) { w.x = nx; w.y = ny; }
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
      if (at && this.realm === 'real' && canEnter(this.zone.buildings[this.working.k])) {
        const wk = this.working;
        this.working = null;
        this.hooks.enterBuilding(wk.k, { i: wk.spot[0], j: wk.spot[1] }, this.takeChaser(), true);
      } else if (at) {
        if (!this.working.on) {
          this.working.on = true;
          this.workTick = 0;
          p.sprite.visible = false;
          const b = this.zone.buildings[this.working.k];
          const bx = b.i0 + b.w / 2 - p.x, by = b.j0 + b.d / 2 - p.y;
          p.dir = dirFromTile(bx, by, p.dir);
        }
        this.working.earned += WAGE_PER_SEC * this.working.job.mult * dt;
        if (this.workStrain(this.working.job, dt)) { this.stopWork(); return; }
        this.workTick -= dt;
        if (this.workTick <= 0) { this.workTick = 1; this.hooks.work({ name: this.working.name, earned: this.working.earned }); }
        if (this.working && this.shiftStiff(dt)) { this.stopWork(true); return; }
      } else if (this.working.on) this.stopWork();
      if (this.working?.on) p.sprite.visible = false;
    }
    // 구역 끝: 끝 칸에 닿으면 이웃 구역으로 (이웃이 없으면 main 이 알려 준다)
    if (this.edgeWant && !p.path.length) {
      const e = this.zone.edges!, d = this.edgeWant, fx = Math.floor(p.x);
      this.edgeWant = null;
      if ((d === 'w' && fx <= e.i0) || (d === 'e' && fx >= e.i1 - 1)) this.hooks.edge(d, p.x, p.y);
    }
    // 가게: 문 앞에 닿으면 물건 고르기
    if (this.storeWant && !p.path.length && Math.hypot(this.storeWant.spot[0] + 0.5 - p.x, this.storeWant.spot[1] + 0.5 - p.y) < (Math.floor(p.x) === this.storeWant.spot[0] && Math.floor(p.y) === this.storeWant.spot[1] ? 9 : 2.6)) {
      const sw = this.storeWant;
      this.storeWant = null;
      if (sw.kind === 'enter') this.hooks.enterBuilding(sw.k, { i: sw.spot[0], j: sw.spot[1] }, this.zone.buildings[sw.k]?.cat === 'home' ? null : this.takeChaser()); // 24차: 내 집 문은 도망가는 문 — 대식자는 따라 들어오지 못한다
      else if (sw.kind === 'bank') this.hooks.bank(this.nameOf(this.zone.buildings[sw.k]));
      else this.hooks.store(sw.kind, this.nameOf(this.zone.buildings[sw.k]), cuisineOf(this.zone.buildings[sw.k]));
    }
    // 돈 줍기
    for (let k = this.coins.length - 1; k >= 0; k--) {
      const c = this.coins[k];
      c.life -= dt;
      const close = !this.dead && !c.claimed && Math.hypot(c.x - p.x, c.y - p.y) < 0.8;
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
    const inside = !!this.working?.on || (!!this.shipGo && this.shipGo.phase !== 'walk'); // 26차: 우주선에 오르면 표시도 함께 사라진다
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
    if (this.loots.length) this.updateLoot(dt); // 26차: 현실에서도 줍는다 (지옥에서만 돌던 탓에 야구 배트가 주워지지 않았다)
    if (this.zone.hell) this.edgeWalk(p, dt);
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
    if (this.streamT <= 0 || this.streamMore) { this.streamT = 0.12; this.stream(false); } // 22차: 남은 일이 있으면 다음 프레임에 조금 더
    this.updateRaid(dt);
    if (this.gjob) {
      const { key, job } = this.gjob;
      if (job.step(this.gjob.vis ? 14 : 5)) {
        this.gjob = null;
        if (!this.chunks.has(key)) {
          const s = new Sprite(tex(job.canvas));
          s.position.set(job.x, job.y);
          this.ground.addChild(s);
          this.chunks.set(key, s);
        }
        this.streamT = 0; // 다음 덩어리를 바로
      }
    }
  }

  /** 행인·불량배의 평소 행동 */
  private think(w: Walker, moving: boolean, dt: number, nf: number) {
    const p = this.player;
    if (w.kind === 'guard') { this.thinkGuard(w, moving, dt); return; }
    if (w.kind === 'talus') { this.thinkTalus(w, dt); return; }
    if (w.kind === 'maskgirl') { this.thinkMaskGirl(w, moving, dt); return; }
    if (w.kind === 'yunae') { this.thinkYunae(w, moving, dt); return; }
    if (w.pray && Math.random() < dt * 0.04 && Math.hypot(this.player.x - w.x, this.player.y - w.y) < 9) { const m = t().idolMurmur; this.bubble(w, m[Math.floor(Math.random() * m.length)]); }
    if (w.kind === 'vendor' && (w.vend === 'massage' || w.vend === 'bar' || w.vend === 'street' || w.vend === 'heaven')) {
      // 19차: 지나가는 사람을 부른다 (가까이 올수록 자주). 바 호객원은 밤에 더 바쁘다 · 21차: 천국의 천사는 공짜 음식을 권한다
      const d = Math.hypot(this.player.x - w.x, this.player.y - w.y);
      if (d < 9 && !w.bubble && Math.random() < dt * (w.vend === 'bar' ? 0.06 + nf * 0.2 : w.vend === 'massage' || w.vend === 'heaven' ? 0.14 : 0.05)) {
        const L = t();
        const c = w.vend === 'massage' ? L.massageCalls : w.vend === 'bar' ? L.barCalls : w.vend === 'heaven' ? L.heavenVendorCalls : L.streetCalls;
        this.bubble(w, c[Math.floor(Math.random() * c.length)]);
      }
      if (d < 4) w.dir = dirFromTile(this.player.x - w.x, this.player.y - w.y, w.dir);
      return;
    }
    if (w.vend === 'succubus' && !w.bubble && Math.random() < dt * 0.08 && Math.hypot(this.player.x - w.x, this.player.y - w.y) < 7) { const S = t().succubus[Math.min(3, Math.max(0, (this.zone.hell?.floor ?? 1) - 1))]; this.bubble(w, S.call[Math.floor(Math.random() * S.call.length)]); } // 22차: 서큐버스가 부른다
    if (w.kind === 'soul' || w.kind === 'vendor' || w.kind === 'elder') { if (!w.still && !moving && w.target === null && Math.hypot(this.player.x - w.x, this.player.y - w.y) < 3) w.dir = dirFromTile(this.player.x - w.x, this.player.y - w.y, w.dir); return; }
    if (w.kind === 'fighter') { this.thinkFighter(w, moving, dt); return; }
    if (w.taxi) return;
    if (w.preach !== undefined) { this.thinkPreacher(w, dt); return; }
    if (w.kind === 'sleeper') return;
    if (w.kind === 'goat') { this.thinkGoat(w, moving, dt); return; }
    if (w.tail && this.realm === 'heaven' && this.thinkTail(w, moving, dt)) return;
    if (w.kind === 'yellowwing' && this.ywFollow) { this.thinkYellowWing(w, moving, dt); return; }
    if (w.kind === 'angel' && this.realm === 'heaven' && this.thinkAngel(w, moving, dt)) return;
    if (w.invader) {
      // 천국의 악마: 가까운 천사부터 (나를 친 자에게는 맞선다)
      if (w.target && (w.target.down > 0 || w.target.sprite.destroyed)) w.target = null;
      if (!w.target) {
        let best: Walker | null = null, bd = 40;
        for (const o of this.walkers) if (o.kind === 'angel' && !o.taxi && o.preach === undefined && o.down <= 0) { const d = Math.hypot(o.x - w.x, o.y - w.y); if (d < bd) { bd = d; best = o; } }
        w.target = best;
      }
      if (Math.hypot(w.x - p.x, w.y - p.y) > 60) this.removeWalker(w);
      return;
    }
    if (w.kind !== 'pashar' && w.kind !== 'clerk' && w.kind !== 'officer' && w.kind !== 'yellowwing' && !w.taxi && w.preach === undefined && w.vend !== 'heaven' && !w.mdef?.boss && !w.tail && Math.hypot(w.x - p.x, w.y - p.y) > 34) { if (w.kind === 'suturer' || w.raider || w.kid) this.removeWalker(w); else if (w.mdef && this.zone.hell) this.spawnMonster(w); else if (w.mdef) this.removeWalker(w); else this.spawnNpc(w.kind as NpcKind, w); return; }
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
    if (w.mdef?.key === 'gurma' && (w.asleep || (w.beg = !w.target && this.hooks.hasFood()))) {
      if (w.asleep) { w.path = []; w.target = null; return; }
      const d = Math.hypot(p.x - w.x, p.y - w.y);
      if (d < w.mdef.notice && !this.dead && !this.invisible) {
        w.dir = dirFromTile(p.x - w.x, p.y - w.y, w.dir);
        if (d > 2.2 && !moving && Math.hypot(w.x - w.home[0], w.y - w.home[1]) < 6) { const path = findPath(this.zone, Math.floor(w.x), Math.floor(w.y), Math.floor(p.x), Math.floor(p.y)); if (path) w.path = path.slice(0, Math.max(1, path.length - 2)); }
        if (Math.random() < dt * 0.4) this.bubble(w, t().gurmaBeg[Math.floor(Math.random() * t().gurmaBeg.length)]);
      }
      return;
    }
    if (w.mdef) {
      const d = Math.hypot(p.x - w.x, p.y - w.y);
      if (!w.target && !this.dead && !this.invisible && !this.inRest(p.x, p.y) && d < w.mdef.notice && Math.random() < dt * 3) {
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
      const hidden = !!this.working?.on || this.invisible;
      if (w.stalk) {
        w.stalk += dt;
        if (hidden || d > notice + (this.gangZone() ? 12 : 5) || Math.hypot(w.x - w.home[0], w.y - w.home[1]) > (this.gangZone() ? 22 : 14)) {
          if (!hidden) this.bubble(w, pick(w.weak === 'drunk' ? L.drunkGiveUp : w.weak === 'shade' ? L.shadeGiveUp : w.gang === 'robber' ? L.robberGiveUp : w.gang === 'mafia' ? L.mafiaGiveUp : L.thugGiveUp));
          w.stalk = 0; w.aggroCool = 20; w.path = [];
        } else if (d < 1.8 && w.stalk > 0.7) {
          w.stalk = 0;
          w.path = [];
          w.target = p;
          w.firstBy ??= w;
          this.bubble(w, pick(w.weak === 'drunk' ? L.drunkDemand : w.weak === 'shade' ? L.shadeDemand : w.gang === 'robber' ? L.robberDemand : w.gang === 'mafia' ? L.mafiaDemand : L.thugDemand));
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
      const gz = this.gangZone();
      if (!w.aggroCool && !hidden && d < notice + (gz ? 2.5 : 0) && Math.random() < dt * (gz ? 2.4 : 1.6) && (this.realm !== 'real' || this.attackersOnMe() < this.attackCap())) {
        w.stalk = 0.01;
        w.repathT = 0;
        this.bubble(w, pick(w.weak === 'drunk' ? L.drunkTaunt : w.weak === 'shade' ? L.shadeTaunt : w.gang === 'robber' ? L.robberTaunt : w.gang === 'mafia' ? L.mafiaTaunt : L.thugTaunt));
        this.rallyMafia(w);
        return;
      }
    }
    if (w.target || moving) return;
    w.wait -= dt;
    if (w.wait > 0) return;
    w.wait = 2 + Math.random() * 5;
    const thug = w.kind === 'thug' || w.kind === 'yellowwing';
    const spot = randomWalkTileNear(this.zone, thug ? w.home[0] : Math.floor(w.x), thug ? w.home[1] : Math.floor(w.y), w.kind === 'yellowwing' ? 7 : thug ? 5 : 10, thug && w.kind === 'thug' ? ['soi', 'walk'] : ['walk', 'cross', 'park']);
    if (spot) { const path = findPath(this.zone, Math.floor(w.x), Math.floor(w.y), spot[0], spot[1]); if (path) w.path = path; }
  }

  /** 차량: 앞에 사람이 있으면 서고 경적. 바로 앞에 뛰어든 플레이어는 피하지 못한다 */
  private updateCars(dt: number, p: Walker) {
    if (this.carCool > 0) this.carCool -= dt;
    // 22차: 같은 차로의 앞차와 거리를 둔다 (겹쳐 달리지 않게) · 사람은 차로 줄별로 미리 묶어 한 번만 훑는다
    const byLane = new Map<Lane, Car[]>();
    for (const c of this.cars) { const a = byLane.get(c.lane); if (a) a.push(c); else byLane.set(c.lane, [c]); }
    const ahead = new Map<Car, number>();
    for (const [lane, cs] of byLane) {
      cs.sort((a, b) => (a.x - b.x) * lane.dir);
      for (let k = 0; k < cs.length - 1; k++) ahead.set(cs[k], (cs[k + 1].x - cs[k].x) * lane.dir);
    }
    const rowWalkers = new Map<number, Walker[]>();
    for (const w of this.walkers) { if (w.down > 0) continue; const r = Math.floor(w.y); const a = rowWalkers.get(r); if (a) a.push(w); else rowWalkers.set(r, [w]); }
    for (const c of this.cars) {
      const cy = c.lane.j + 0.5;
      let blocked = false, byMe = false;
      const gap = ahead.get(c);
      const carBlocked = gap !== undefined && gap < 3.4;
      for (const w of rowWalkers.get(c.lane.j) ?? []) {
        const ahead = (w.x - c.x) * c.lane.dir;
        if (ahead > 0.9 && ahead < 2.6) { blocked = true; if (w.isPlayer) byMe = true; }
        if (w.isPlayer && !this.dead && this.realm !== 'ghost' && ahead > -0.3 && ahead <= 0.9 && c.speed > 2.5 && this.carCool <= 0) this.carHitsPlayer(c);
      }
      c.speed = blocked || carBlocked ? Math.max(0, c.speed - 14 * dt) : Math.min(c.max, c.speed + 3 * dt);
      if (blocked && !c.honked && c.sprite.visible) { c.honked = true; this.carBubble(c, t().honk); if (byMe) sfx.horn(this.spotOf({ x: c.x, y: cy } as Walker)); }
      if (!blocked) c.honked = false;
      // 19차: 내가 차 앞을 막고 서 있으면 — 길게 경적, 그다음엔 운전사가 창문을 내리고 욕을 퍼붓는다
      if (byMe && c.sprite.visible && this.realm === 'real') {
        const before = c.blockT ?? 0;
        c.blockT = before + dt;
        const L = t();
        if (before < 1.6 && c.blockT >= 1.6) sfx.horn(this.spotOf({ x: c.x, y: cy } as Walker), true);
        if (Math.floor(before / 3.2) !== Math.floor(c.blockT / 3.2) && c.blockT > 3) this.carBubble(c, L.carCurse[Math.floor(Math.random() * L.carCurse.length)]);
      } else c.blockT = 0;
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
    c.bubbleT = text.length > 6 ? 2.4 : 1.2;
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
      this.groundMove(pr.x, pr.y);
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
  private drawLiquid(dt: number) {
    if (this.sea) this.sea.tilePosition.x += dt * 9;
    this.liquidT += dt;
    if (this.liquidT < 1 / 30) return; // 초당 30번이면 충분
    const tt = this.time;
    this.liquidT = 0;
    const g = this.liquidG;
    g.clear();
    const z = this.zone, theme = floorDef(z.hell!.floor).theme;
    const Wd = this.app.screen.width, Hd = this.app.screen.height;
    // 화면 네 모서리 → 칸 범위
    const toTile = (sx: number, sy: number) => { const X = sx - this.camera.x, Y = sy - this.camera.y; return [(X / (TW / 2) + Y / (TH / 2)) / 2, (Y / (TH / 2) - X / (TW / 2)) / 2]; };
    const cs = [toTile(0, 0), toTile(Wd, 0), toTile(0, Hd), toTile(Wd, Hd)];
    const sea = !!this.sea, lo = sea ? -60 : 1;
    const ia = Math.max(lo, Math.floor(Math.min(...cs.map((q) => q[0]))) - 1), ib = Math.min(sea ? z.W + 60 : z.W - 2, Math.ceil(Math.max(...cs.map((q) => q[0]))) + 1);
    const ja = Math.max(lo, Math.floor(Math.min(...cs.map((q) => q[1]))) - 1), jb = Math.min(sea ? z.H + 60 : z.H - 2, Math.ceil(Math.max(...cs.map((q) => q[1]))) + 1);
    let n = 0;
    for (let j = ja; j <= jb && n < 600; j++) for (let i = ia; i <= ib && n < 600; i++) {
      const out = i < 1 || j < 1 || i >= z.W - 1 || j >= z.H - 1;
      if (out ? !sea : !liquidInside(z, i, j)) continue;
      n++;
      const h1 = ((i * 73856093) ^ (j * 19349663)) >>> 0, a = (h1 % 1000) / 1000, bq = ((h1 >> 10) % 1000) / 1000, c = ((h1 >> 20) % 1000) / 1000;
      if (theme === 'ash') {
        // 용암: 칸을 가로질러 흘러가는 달아오른 빛줄기 둘 (i 방향으로 흐른다) + 가끔 부풀어 터지는 거품
        for (let k = 0; k < 2; k++) {
          const t = (tt * (0.16 + c * 0.08) + a + k * 0.5) % 1;
          const [x0, y0] = iso(i + t, j + 0.2 + ((bq + k * 0.43) % 0.6));
          const al = Math.sin(t * Math.PI);
          g.moveTo(x0, y0).lineTo(x0 + 7 + c * 5, y0 + 3.5 + c * 2.5).stroke({ color: k ? 0xffd27a : 0xffa83a, width: 1.4, alpha: 0.75 * al });
        }
        const bt = (tt * 0.35 + bq) % 1;
        if (bt < 0.22) { const [bx, by] = iso(i + 0.3 + a * 0.4, j + 0.3 + c * 0.4); const r = 1 + bt * 14; g.ellipse(bx, by, r, r * 0.5).stroke({ color: 0xffe08a, width: 1, alpha: 1 - bt / 0.22 }); }
      } else if (theme === 'swamp') {
        // 늪: 느리게 퍼지는 물결 (칸의 셋에 하나)
        if (a > 0.33) continue;
        const t = (tt * 0.18 + bq) % 1;
        const [x, y] = iso(i + 0.5, j + 0.5); const r = 3 + t * 16;
        g.ellipse(x + (c - 0.5) * 20, y, r, r * 0.5).stroke({ color: 0x5a6a5a, width: 1, alpha: 0.45 * (1 - t) });
      } else {
        // 피의 용암: 칸을 가로질러 흐르는 핏빛 빛줄기 + 부풀어 터지는 거품
        if (a > 0.6) continue;
        const t = (tt * (0.12 + c * 0.06) + a) % 1;
        const [x0, y0] = iso(i + t, j + 0.25 + bq * 0.5);
        g.moveTo(x0, y0).lineTo(x0 + 7 + c * 5, y0 + 3.5 + c * 2.5).stroke({ color: c > 0.5 ? 0xffa08a : 0xff3a2a, width: 1.3, alpha: 0.7 * Math.sin(t * Math.PI) });
        const bt = (tt * 0.3 + bq) % 1;
        if (bt < 0.16) { const [bx, by] = iso(i + 0.3 + a * 0.4, j + 0.3 + c * 0.4); const r = 1 + bt * 12; g.ellipse(bx, by, r, r * 0.5).stroke({ color: 0xff7a6a, width: 1, alpha: 1 - bt / 0.16 }); }
      }
    }
  }

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
  private flyArrows: { g: Graphics; x0: number; y0: number; x1: number; y1: number; t: number; T: number }[] = [];
  private drawSparks(dt: number) {
    for (let k = this.flyArrows.length - 1; k >= 0; k--) {
      const f = this.flyArrows[k];
      f.t += dt;
      const q = Math.min(1, f.t / f.T);
      f.g.position.set(f.x0 + (f.x1 - f.x0) * q, f.y0 + (f.y1 - f.y0) * q);
      if (f.t > f.T + 0.12) { f.g.destroy(); this.flyArrows.splice(k, 1); }
    }
    this.drawRankUp(dt);
    this.drawHands(dt);
    this.cullStatic(dt);
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
    // 24차: 땅에 떨어진 핏방울·뼛가루 — 천천히 스민다
    for (let k = this.splats.length - 1; k >= 0; k--) {
      const sp = this.splats[k];
      sp.t -= dt;
      if (sp.t <= 0) { this.splats.splice(k, 1); continue; }
      g.ellipse(sp.x, sp.y, sp.r * 1.4, sp.r * 0.7).fill({ color: sp.col, alpha: Math.min(0.75, sp.t * 0.4) });
    }
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
      if (dd < fd && !this.zone.interior && this.zone.shop !== false) { fd = dd; found = -1; }
      // 지옥: 올라가는 계단(-2) · 내려가는 구덩이(-3)
      const h = this.zone.hell;
      if (h) {
        for (const [code, f] of [[-2, h.up], [-3, h.down]] as const) {
          if (code === -2 && h.exit === 'alley') continue; // 1층: 골목 끝 환생 로비 건물의 문으로
          const d = Math.hypot(f.i + 0.5 - p.x, f.j + 0.5 - p.y);
          if (d < fd + 0.4) { fd = d; found = code; }
        }
      }
      if (this.heavenStair && this.realm === 'heaven') {
        const d = Math.hypot(this.heavenStair.i + 0.5 - p.x, this.heavenStair.j + 0.5 - p.y);
        if (d < fd + 0.4) { fd = d; found = -4; }
      }
      if (this.realm !== 'ghost') for (const k of this.bViews.keys()) {
        const b = this.zone.buildings[k];
        const hellDoor = b.cat === 'loan' || b.cat === 'hbank' || b.cat === 'atone' || b.cat === 'rebirth';
        if (!hellDoor && (this.zone.hell || b.cat === 'ujusae' || !interactive(b) || (!canEnter(b) && !storeOf(b) && !canWork(b) && !hasBank(b)))) continue;
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
        else if (found === -4) {
          fx = this.heavenStair!.i + 0.5; fy = this.heavenStair!.j - 0.6;
          this.hooks.place(t().cloudStair, t().cloudStairSub);
        }
        else if (found === -2 || found === -3) {
          const f = found === -2 ? this.zone.hell!.up : this.zone.hell!.down;
          fx = f.i + 0.5; fy = f.j + 0.5;
          const L = t();
          const ex = this.zone.hell!.exit;
          this.hooks.place(found === -2 ? (ex === 'ferry' ? L.ferryLabel : ex === 'ford' ? L.fordLabel : L.hellUp) : L.hellDownEdge, found === -2 ? (ex === 'ferry' ? (this.bossDown ? L.ferryOpen : L.ferryLocked) : ex === 'ford' ? (this.bossDown ? L.fordOpen : L.fordLocked) : '') : '');
        } else {
          const b = this.zone.buildings[found];
          const f = this.frontCached(found)!;
          if (b.sign === 'right') { fx = b.i0 + b.w; fy = f[1] + 0.5; } else { fx = f[0] + 0.5; fy = b.j0 + b.d; }
          const n = this.nameOf(b);
          if (n) this.hooks.place(n, this.subOf(b));
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
      text = w.kind === 'remote' ? w.rinfo?.nick || w.rinfo?.name || '' : this.npcName(w);
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
      this.labelBg.clear();
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
    if (!v.alpha && v.cv) {
      const id = v.cv.getContext('2d')!.getImageData(0, 0, v.w, v.h).data;
      const al = new Uint8Array(v.w * v.h);
      for (let k = 0; k < al.length; k++) al[k] = id[k * 4 + 3] > 0 ? 1 : 0;
      v.alpha = al;
      v.cv = undefined;
    }
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
    if (this.realm === 'heaven') nf = 0; // 천국은 늘 낮
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
