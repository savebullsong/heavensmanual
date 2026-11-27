// 현실 세계 장면 (PixiJS): 실제 지도, 화면 근처만 불러오기, 클릭 이동, 행인·불량배, 차량, 방콕 실시간 낮밤
// 1단계-B: 대상 메뉴(말 걸기·살펴보기·공격·강제 공격), 싸움과 체력, 쓰러짐과 돈 줍기, 가게 노동, 차 사고
import { Hound } from './hound.ts';
import { shuttleCanvas, flameCanvas } from './shipgfx.ts';
import { goatCharSet } from './goat.ts';
import { dogCharSet, type DogCoat } from './dog.ts';
import { packFor, PACK_FOOT } from './maskgear.ts';
import { vendorGear, hasVendorGear, VGEAR_FOOT } from './vendorgear.ts';
import { drawDalHouse } from './dalgfx.ts';
import { snowGround, snowBuilding } from './snow.ts';
import { drownedCanvas, monkLook, shoreF, shoreLine, shoreSkyCanvas, drawShoreChunk, capeRocks, drawCapeRock } from './border.ts';
import { drawHeavenGround, drawHeavenPalace, drawAttraction, heavenMeta , ZOO_PENS } from './heavenworld.ts';
import { drawSanctum, drawMarbleShop, SANCT_TOP } from './heavensanct.ts';
import { wingTexture, cloudTexture, heavenVignette, cloudStairTexture, heavenTowerTexture, terraceSkyTexture, hellPortalTexture, bedTexture, BED_ANCHOR, batWingTexture, hornTexture, devilTailTexture, succWingTexture, spadeTailTexture, SPADE_ANCHOR, demonArmTexture, ARM_PIVOT } from './heavengfx.ts';
import { hellDecor } from './hellprops.ts';
import { smithyChimney, puppetEyes } from './hellbuild.ts';
import { Application, BlurFilter, ColorMatrixFilter, Container, Graphics, Matrix, Rectangle, Sprite, Text, Texture, TilingSprite } from 'pixi.js';
import { type Look } from './character.ts';
import { beastHand } from './passgfx.ts';
import { MISS_HWANG, TALUS_LOOK, MASKGIRL_LOOK, YELLOW_WING_LOOK, KALDREK_LOOK, OBOLO_LOOK, NOEUL_LOOK, MARI_LOOK, yunaeLook, PONCHO_DEMON, REAPER_LOOK, charSet, frameOf, artDensity, mirrorFrameOf, applyFrame, dirFromTile, turnedDir, DIRS, auraFor, makeAuraSprite, ANIM_FPS, IMPACT, TWO, type CharSet, type Dir, type Anim, type Frame, BODY_K } from './sprites.ts';
import { type Zone, type Building, type Lane, type Prop, type HellVendor, type Furn, findPath, walkable, randomWalkTileNear, tileAt, groundAt, TYPES } from './zone.ts';
import { iso, TW, TH, drawBuilding, drawGroundChunk, buildingHeight } from './gfx.ts';
import { beyondOf } from './beyond.ts';
import { drawBuildingKit, drawGroundKit, buildingTop, upperFloors, carSprite, propSprite, CAR_MODELS, CHUNK, kitOk, PPX } from './street.ts';
import { t, lang } from './i18n.ts';
import { bangkokClock, nightFactor } from './clock.ts';
import { buildingName, buildingSub, interactive, canWork, hasBank, bankName, cuisineOf, storeOf, kindOf as bKindOf, mainPoi, type StoreKind } from './names.ts';
import * as sfx from './sfx.ts';
import { MONSTERS, GUARDS, floorDef, GURMA_FULL, fordWob, type MonsterDef, type GuardDef, raidState, FIELD_BOSS, floorCurve } from './hell.ts';
import { rollLoot, ITEMS, iconFor, moneyText } from './items.ts';
import { drawHellBank, drawAtone, drawRebirthGate } from './hellhalls.ts';
import { SKIN_COLORS } from './character.ts';
import { weatherHell } from './hellweather.ts';
import { drawHellGround, hellGroundJob, type GroundJob, drawHellStructure, hellTint, hellProp, liquidInside, bloodLavaTile } from './hellgfx.ts';
import { drawCosmicBird, drawCosmicBirdHeaven, COSMIC_TOP } from './ujusae.ts';
import { SOI_SIGNS, SOI_ALIAS, BTS_STATIONS, LANDMARKS, soiSignCanvas, stationCanvas, neonGateCanvas, billboardCanvas, helixCanvas, fountainCanvas, parkSignCanvas, landmarkBuildingCanvas, landmarkTop, type Pic, type LandmarkBuild } from './landmarks.ts';
import { drawYuhwang } from './yuhwang.ts';
import { drawLoanHouse, LOAN_TOP } from './loanhouse.ts';
import { portraitUrl, type PortraitSlot } from './portraits.ts';

/** 34차 4층 대장장이 칼드렉: 대머리 · 검게 그을린 살갗 · 그을린 가죽 앞치마 (팔 넷·뿔은 따로 붙인다) */
const FERUM_LOOK: Look = { sex: 'm', build: 2, skin: 0, hair: 0, hairColor: 0, top: 0, bottom: 0, outfit: 'casual', cols: { 1: '#221a17', 10: '#221a17', 2: '#0a0706', 3: '#3a2416', 4: '#1a120e', 9: '#4a2e1a', 5: '#0a0706' } };
/** 37차: 서큐버스를 사용자 컨셉 그림대로 새 3D 몸(드레스 · 긴 머리 · 감긴 뿔을 함께 구운 'succubus')으로 — 층마다 빛깔만 다르다
 *  구역: 1 살 · 2 머리 · 3 코르셋 · 4 치마 · 5 신 · 6 눈 · 9 안감·끝동 · 12 보석 · 13 뿔 · 14 사슬 · 15 레이스
 *  1층 — 컨셉 그대로 (보랏빛 검은 머리 · 검은 레이스 · 진홍 치마 · 은사슬 · 붉은 눈)
 *  2층 — 늪의 밤빛 (포도주빛 치마 · 자줏빛 눈) · 3층 — 붉은 비단과 금사슬 · 4층 베르카 — 쇳빛 머리 · 그을린 가죽 · 쇠사슬 · 불씨 눈 */
const SUCC = (c: Record<number, string>): Look => ({ sex: 'f', build: 1, skin: 0, hair: 3, hairColor: 0, top: 0, bottom: 0, outfit: 'succubus', cols: { 5: '#120c10', 10: '#e8dcd0', ...c } });
const SUCCUBUS_LOOK: Record<number, Look> = {
  1: SUCC({ 1: '#ecd6d0', 2: '#2c1a34', 3: '#18121c', 4: '#8e1424', 6: '#ff2a3c', 9: '#4a0a16', 12: '#ff3a4e', 13: '#2a2028', 14: '#c8c4cc', 15: '#110c13' }),
  2: SUCC({ 1: '#e2d2d6', 2: '#24162e', 3: '#151018', 4: '#5c1440', 6: '#ff3a8a', 9: '#300a24', 12: '#ff4aa0', 13: '#1e1a22', 14: '#a8a4b4', 15: '#0e0b12' }),
  3: SUCC({ 1: '#f0d8cc', 2: '#1e1014', 3: '#1a0c0e', 4: '#a8101e', 6: '#ff2a2a', 9: '#5a0a12', 12: '#ff4a3a', 13: '#3a2420', 14: '#d8b048', 15: '#140a0c' }),
  4: SUCC({ 1: '#cdb8ac', 2: '#8c8a90', 3: '#2a1a12', 4: '#5a2a16', 5: '#1a120c', 6: '#ff8a1a', 9: '#2a120a', 12: '#ff9a2a', 13: '#3a3030', 14: '#7a7470', 15: '#1a120c' }), // 24차: 4층 베르카
};
/** 37차: 층마다 날개 막 · 뼈 · 꼬리 · 꼬리 끝 빛깔 */
const SUCC_WING: Record<number, [number, number, number, number]> = {
  1: [0x3a0e1a, 0x1a1218, 0x5a1424, 0xb0182c],
  2: [0x2e1030, 0x161018, 0x4a1840, 0x8a2068],
  3: [0x5a0e18, 0x1e0e0e, 0x6a1018, 0xd0201e],
  4: [0x3a2418, 0x1a120c, 0x4a2a1a, 0xd86a1a],
};
const SEOUL_CARS = ['sedan-white', 'sedan-white', 'sedan-black', 'sedan-silver', 'sedan-silver', 'sedan-blue', 'sedan-red', 'pickup', 'moto', 'bus'];
/** 22차: 거리 사람 모습 묶음 (구역을 옮겨도 이어 쓴다) */
const LOOK_POOL = new Map<string, Look[]>();
/** 22차: 스트리밍 작업 시간 기록 (?debug 에서 window.__perf 로 본다) */
export const PERF: Record<string, [number, number, number]> = {};
function perf<T>(k: string, f: () => T): T { const t0 = performance.now(); const r = f(); const d = performance.now() - t0; const e = (PERF[k] ??= [0, 0, 0]); e[0]++; e[1] += d; e[2] = Math.max(e[2], d); return r; }
(globalThis as { __perf?: typeof PERF }).__perf = PERF;

/** 32차: 염소대왕이 앉은 흑요석 단의 높이 (방의 gkdais 와 같게) · 말풍선을 띄울 얼굴 높이 */
const GK_LIFT = 16, GK_FACE = 218;
/** 31차 염소대왕의 앉은 도트 (2배 밀도 · 발 자리 = 아래 가운데). 관리자 칸이 비면 기본 그림 npc/goat-king.png
 *  32차: 손으로 찍은 거인 도트 (옥좌째 440×626 · 게임 속 220×313) */
let gkSet: Promise<CharSet | null> | null = null;
/** 33차: 기본 그림일 때 숨쉬고 깜빡이는 네 장 (내쉼 · 들이쉼 · 내쉼+감음 · 들이쉼+감음). 관리자 그림이면 없음 */
let gkAnim: Texture[] | null = null;
function loadGkAnim() {
  const names = ['goat-king', 'goat-king-in', 'goat-king-blink', 'goat-king-in-blink'];
  void Promise.all(names.map((n) => new Promise<Texture | null>((res) => { const im = new Image(); im.onload = () => { const tx = Texture.from(im); tx.source.scaleMode = 'nearest'; res(tx); }; im.onerror = () => res(null); im.src = `npc/${n}.png`; }))).then((a) => { if (a.every(Boolean)) gkAnim = a as Texture[]; });
}
function goatKingSet(): Promise<CharSet | null> {
  gkSet ??= portraitUrl('sprite-goat-king').catch(() => null).then((u) => new Promise<CharSet | null>((res) => {
    const im = new Image(); im.crossOrigin = 'anonymous';
    im.onload = () => {
      const tx = Texture.from(im); tx.source.scaleMode = 'nearest';
      const f: Frame = { tex: tx, ax: 0.5, ay: 1, w: im.width, h: im.height, k: 0.5 };
      const frames = new Map<string, Frame>();
      for (const d of ['se', 'sw', 'ne', 'nw', 's', 'e', 'n', 'w'] as Dir[]) frames.set(`idle-${d}-0`, f);
      res({ mode: 'u', attack: null, frames, counts: { idle: 1 }, eight: true, masks: new Map() });
    };
    im.onerror = () => res(null);
    if (!u) loadGkAnim();
    im.src = u ?? 'npc/goat-king.png';
  }));
  return gkSet;
}
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
  bldArtLoad ??= Promise.all((['bld-ujusae', 'bld-ujusae-night', 'bld-ujusae-heaven', 'bld-loan', 'bld-hell-1', 'bld-hell-2', 'bld-hell-3', 'bld-hell-4', 'bld-hell-5'] as const).map(async (slot) => {
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

export type NpcKind = 'passer' | 'thug' | 'suturer' | 'monster' | 'pashar' | 'clerk' | 'angel' | 'yellowwing' | 'officer' | 'guard' | 'talus' | 'soul' | 'vendor' | 'fighter' | 'elder' | 'sleeper' | 'goat' | 'maskgirl' | 'yunae' | 'goatking' | 'changer' | 'noeul' | 'mari' | 'marionette' | 'caged' | 'dog';
export type Realm = 'real' | 'ghost' | 'hell' | 'heaven' | 'border'; // 24차: border = 경계의 해변 (귀신 대신)
export type Stance = 'talk' | 'hostile' | 'all';
/** name = 아이디(프로필·신고에 쓰는 열쇠), nick = 게임 속 이름(보이는 이름) */
export interface RemoteInfo { name: string; nick?: string; look: Look; weapon: string | null; armor: string[]; member: boolean; hidden?: boolean; /** 47차 홍보 말풍선 (소개 글) */ promo?: string }
const bk = (w: { size?: number }) => (w.size ?? 1) * BODY_K;
/** 42차: t = 가는 곳(길의 끝), v = 걷는 빠르기 — 위치를 0.2초마다 보내지 않고 목적지만 보낸다 (받는 쪽이 길을 찾아 걷게 한다) */
export interface NetPos { x: number; y: number; d: Dir; m: 0 | 1; a?: Anim; h?: number; c?: 1; k?: 1; t?: [number, number]; v?: number }
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
  act: { anim: Anim; t: number; alt?: boolean } | null; // 한 번 재생하는 동작 (공격·맞음·쓰러짐) · alt = 반대 손 주먹 (29차)
  punchAlt?: boolean; // 29차: 다음 주먹은 어느 손으로
  pend: { to: Walker; dmg: number; at: number; crit?: boolean } | null; // 동작이 닿는 순간 들어갈 피해
  wait: number;
  isPlayer: boolean;
  kind: 'player' | NpcKind | 'remote';
  rid?: string; rinfo?: RemoteInfo; rpos?: NetPos; // 다른 사람 (실시간)
  rpath?: [number, number][]; rto?: string; // 42차: 다른 사람이 보낸 목적지까지 내가 찾은 길
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
  gang?: 'robber' | 'mafia' | 'pickpocket' | 'boxer' | 'enforcer' | 'collector'; // 48차 사채 수금원 // 17차: 불량배보다 센 적 (강도 · 마피아) · 35차 소매치기 · 무에타이 파이터(방콕) · 행동대장(서울)
  /** 35차 소매치기: 훔친 돈과 달아나는 남은 시간 */
  pick?: { stolen: number; flee: number };
  wings?: Sprite; // 천사·황색날개의 날개
  aggroCool?: number;
  /** 48차: 고문하던 괴물 — 맞기 전까지는 덤비지 않는다 */
  untilHit?: boolean;
  /** 48차 들개 무리 번호 */
  dogPack?: number;
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
  watch?: boolean; // 34차: 늘 주인공을 바라본다 (진료실의 유내)
  zb?: number; // 34차: 그리는 순서 덧셈 (그네 앉을판 위에 앉은 유내)
  ferum?: { arms: Sprite[] }; // 34차: 4층 대장장이 칼드렉 — 어깨 뒤의 두 팔 (망치 · 집게)
  murmur?: number; // 34차: 유내의 혼잣말 (시절 0·1·2)
  /** 22차: 서큐버스의 뿔 (머리 위에 따라 그린다) */
  horns?: Sprite;
  /** 33차: 악마의 꼬리 (환전상) */
  devTail?: Sprite;
  /** 37차: 꼬리가 나오는 높이 (발에서 위로 · 기본 17) */
  tailY?: number;
  /** 31차: 마스크 소녀의 짐 — 몸 뒤(under)·앞(over)에 겹치는 화염방사기와 바구니 */
  pack?: { under: Sprite; over: Sprite; vend?: HellVendor };
  raider?: boolean; // 4층부터의 습격 때 마을로 몰려든 괴물
  kid?: boolean; // 26차: 떼의 곁가지 (재충) — 쓰러지거나 멀어지면 다시 나지 않는다
  /** 45차: 층주가 불러낸 졸개 · 층주가 성을 냈다 */
  summoned?: boolean; raged?: boolean;
  /** 45차: 싸움 중 다음 말을 할 수 있는 때 */
  barkT?: number;
  /** 45차: 지옥 정벌에 함께 온 노을 (쓰러지면 무릎 꿇었다가 다시 선다) */
  noeulAlly?: boolean;
  escort?: boolean; // 46차 예배 시간: 칼을 뽑고 곁에 선 노을
  prowlT?: number; // 46차 황색날개를 칭찬·선물하면: 칼을 뽑고 둘레를 어슬렁거리는 노을
  /** 45차: 기술 있는 층주의 불길 (발밑과 등 뒤에서 일렁인다) */
  bossGlow?: Sprite;
  brave?: boolean; // 27차: 맞으면 달아나지 않고 맞선다 (행인·관광객의 절반)
  hidden?: string | null; // 27차: 품에 숨긴 무기 (단검·권총) — 싸울 때 꺼낸다
  leave?: number; // 28차: 대문 앞의 유내가 약속 때문에 떠나는 중 (떠난 뒤 흐른 시간)
  gunman?: boolean; // 27차: 드물게 권총을 숨긴 센 행인
  fb?: string; // 31차 필드 보스 열쇠 (mafiaboss · bkkeater · rokk · gulon · merk · ferron)
  fbT?: number; // 다음 큰 공격까지
  dash?: { fx: number; fy: number; tx: number; ty: number; t: number }; // 돌진 중
  helped?: boolean; // 29차: 행인과 싸우던 이 적을 내가 거들었다 (쓰러지면 선행)
  owe?: { t: number; ready: boolean }; // 34차: 내가 도와준 행인 — 얼마 뒤 다가와 말을 걸고, 누르면 사례를 한다
  ptier?: number; // 29차: 행인의 구역 셈 (0 = 우주새 문 앞 ~ 1 = 끝 구역) — 체력·주먹
  civ?: Civ; // 42차: 평범한 시민의 종류 (회사원 · 학생 · 아주머니 · 노인 · 노동자 · 클럽 경비 · 오토바이 기사 · 노점상)
  pray?: boolean; // 1층 악마상 앞에 엎드려 비는 영혼 · 46차 천국 성소의 회중
  choir?: boolean; // 46차 예배 때 벽가에 선 천사
  worship?: boolean; // 46차 천국 성소에 앉은 영혼
  twin?: 'boy' | 'girl'; // 46차 구름 위 옆집 쌍둥이
  still?: 'sit' | 'lie' | 'lotus'; // 마을의 지친 영혼: 앉아 있거나 누워 있다 · 24차 가부좌 (경계의 완성자·카드 치는 천사)
  vend?: HellVendor | 'street' | 'massage' | 'bar' | 'heaven'; // 마을 장사꾼 · 19차 현실: 손수레 노점 · 마사지 호객 · 바 호객 · 21차 천국: 먹을 것을 파는 천사
  /** 19차: 호객원이 서 있는 가게 (건물 번호) */
  shopK?: number;
  /** 20차: 천국을 침공한 악마 (지옥문에서 나왔다) */
  invader?: boolean;
  /** 21차 천국: 나를 따라오는 이성(구애) · 요리사(음식 권함) — 얼마쯤 따라오다 떠난다 */
  tail?: { kind: 'admire' | 'chef' | 'accubus'; t: number; cool: number; rep: number; stay?: boolean };
  /** 21차 천국: 종교시설 앞에서 행사에 오라고 외치는 천사 (건물 번호) */
  preach?: number;
  /** 21차 천국: 도시 끝의 택시 천사 */
  taxi?: boolean;
  /** 19차: 외국인 관광객 (밝은 피부·검은 피부·동아시아) — 지갑이 두둑하다 */
  tour?: 'w' | 'b' | 'a';
  beg?: boolean; // 2층 층주 구르마: 먹을 것을 든 영혼에게는 싸우지 않고 조른다
  asleep?: boolean; // 배불러 잠든 구르마
  lingerT?: number; // 싸우다 나간 사람의 몸이 남아 있는 시간
  /** 41차 몹 나누기: 방장이 붙인 번호 · 손님 기기에서는 방장 몹을 비추는 거울 */
  nid?: number;
  mirror?: { tx: number; ty: number; d: Dir; seen: number; an: number; mv: boolean };
  /** 42차: 죽은 뒤 건너가는 장면에 나오는 이 (세상이 멈춘 동안에도 움직인다) · 미끄러지듯 가는 곳 · 일어서는 중 · 땅속으로 가라앉은 깊이 */
  actor?: boolean; glide?: { tx: number; ty: number; v: number }; riseT?: number; sink?: number;
  /** 43차: 마지막 일격에 날아가는 중 (포물선 높이 · 회전) */
  fly?: { t: number; dur: number; h: number; spin: number; mine?: boolean };
  /** 46차 후속: 쓰러지는 모습 (가까이 · 중간 · 멀리 날아감 · 지옥 괴물만 두 동강) */
  deathStyle?: 'near' | 'mid' | 'far' | 'split';
  /** 47차 쌍둥이 술래잡기: 술래인가 · 잠깐 내게 와서 노는 시간 */
  tagIt?: boolean; tagNear?: number;
  /** 47차 쓰레기장을 맡은 천사 */
  dumpAngel?: boolean;
  /** 47차 일당을 떼먹은 사장 (1 = 평범 · 2 = 아주 셈) — 내가 방을 나가기 전까지 칼 표시가 뜬다 · 떼인 돈 */
  stiffBoss?: 1 | 2; owed?: number;
  gestT?: number; // 42차: 고유 동작까지 남은 시간
  watchT?: number; // 43차: 노을이 다시 멀찍이 따라붙기까지
  marion?: { left: number; dmg: [number, number]; said?: number }; // 43차 마리오네트: 남은 초 · 한 대 피해
  burnT?: number; burnDps?: number; burnAcc?: number; // 44차 불화살: 타오르는 남은 시간 · 초당 피해
  claimT?: number; // 44차: 버려진 물건을 주우러 가는 중
  elite?: boolean; // 44차: 깊은 들판 · 층주의 터의 사나운 괴물
  feigned?: boolean; rumored?: boolean; revived?: boolean; reviveUp?: boolean; // 43차 5층: 상냥한 척 다가오는 중 · 소문을 냈다 · 실에 끌려 한 번 일어섰다 · 일어서는 중
  /** 43차: 천국 동물원 우리에 갇힌 악마·괴물·죄인 (우리 안쪽 칸 범위와 종류) */
  cage?: { i0: number; j0: number; i1: number; j1: number; kind: 'demon' | 'beast' | 'sinner' };
  netActRef?: unknown; netActN?: number;
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
interface BView { parts: Sprite[]; base: Texture; x: number; y: number; w: number; h: number; top: number; lx: number; ly: number; alpha?: Uint8Array; cv?: HTMLCanvasElement; b: Building; ghost?: { parts: Sprite[]; base: Texture; a: number; used: number } }
interface Floater { obj: Container; t: number; vy: number }
type LabelRef = { kind: 'shop' } | { kind: 'b'; k: number } | { kind: 'w'; w: Walker } | null;

/** 41차: 몹 나누기 — 보내는 길 (main.ts 가 net 함수를 넣는다) */
export interface MobOut {
  snap(l: unknown[]): void;
  desc(l: unknown[]): void;
  req(ids: number[]): void;
  hit(id: number, dmg: number, crit: boolean, kind: string): void;
  strike(to: string, id: number, dmg: number, crit: boolean, kind: string): void;
  kill(id: number, by: string): void;
}

/** main.ts 가 받는 일들 */
export interface WorldHooks {
  money(n: number): void;
  /** 35차 소매치기가 지갑에서 빼 간다 — 실제로 빠진 돈 */
  stolen(n: number): number;
  deed(key: DeedKey, opt?: { floor?: number; share?: number }): void;
  hp(hp: number, max: number): void;
  died(cause: 'car' | 'beaten' | 'hell'): void;
  menu(title: string, sub: string, options: { label: string; danger?: boolean; act: () => void }[], x: number, y: number): void;
  say(name: string, text: string): void;
  /** 막지 않는 짧은 알림 (위쪽에 잠깐) */
  notice(text: string): void;
  /** 21차: 넘치는 체력 (마사지) 표시 */
  over(n: number): void;
  nav(label: string | null): void;
  wear(kind: 'weapon' | 'armor'): void; // 30차 내구도
  hutDoor(which: 'mine' | 'twins'): void; // 46차 구름 위 오두막 문 앞
  twinsTalk(): void; // 46차 쌍둥이와 이야기
  /** 31차 필드 보스: 이 구역에 나와 있어야 할 보스 (자리·체력이 있으면 그대로) */
  fieldBoss(zoneId: string): { key: string; i?: number; j?: number; hp?: number }[];
  fbossAt(key: string, i: number, j: number, hp: number): void;
  fbossDown(key: string, mine: boolean): void;
  /** 31차 염소대왕: 말을 걸면 상담 (떨어진 자들의 상담자 — 싸우지 않는다) */
  goatKing(): void;
  /** 33차: 염소대왕의 방 환전상 오볼로 */
  changer(): void;
  /** 31차: 쏘는 무기에 쏠 것이 없을 때 알림 (화살·탄약·연료·빼 둠) */
  noShots(): void; // 30차: 길 안내 켜짐(이름) · 꺼짐(null) — 화면의 '길 안내 끄기' 칩
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
  thanks(n: number): void; // 34차: 도움받은 행인의 사례 (돈)
  /** 26차: 초심자 야구 배트를 떨어뜨려도 되나 (돈·장비 없음 · 아직 받은 적 없음) */
  beginnerBat(): boolean;
  /** 지옥: 층주를 쓰러뜨렸다 */
  /** 44차: 층주가 쓰러졌다 — killer: 'me' · 다른 영혼 이름 · '' (누군지 모름) */
  bossDown(floor: number, killer: string): void;
  /** 지옥: 노전을 주웠다 */
  notes(n: number): void;
  /** 천국: 환생관 · 황색날개 · 빈 우주새 · 천국에서 손을 듦 */
  heavenAct(what: 'officer' | 'yellowwing' | 'shop' | 'assault' | 'terrace' | 'taxi' | 'ceremony' | 'noeul'): void;
  /** 46차 천국 놀이기구 앞 (대관람차 · 회전목마 · 롤러코스터) */
  ride(k: number, att: string): void;
  /** 47차 공항: 거리 끝의 공항 가는 정류장 · 출입국 심사대 앞 */
  airport(): void;
  immig(): void;
  /** 47차 홍보 말풍선을 눌렀다 (그 사람의 프로필) */
  promo(username: string): void;
  /** 47차 침대 곁에 섰다 (구름 위 오두막 · 현실의 집) */
  bed(room: string): void;
  /** 46차 아큐버스(연인)와 데이트 장소에 머물렀다 */
  accDate(key: string, x: number, y: number): void;
  /** 35차 아큐버스에게 말을 건다 */
  accubus(name: string): void;
  /** 21차 천국: 천사·요리사가 권하는 음식 (먹어도 아무 효과 없다) */
  heavenFood(from: string): void;
  /** 21차: 안내천사 황색날개를 놓쳤다 */
  ywLost(): void;
  /** 44차: 지옥에서 선 곳이 바뀌었다 (마을 · 층계 대기소 · 광산 작업장 · 깊은 들판 · 층주의 터) */
  hellArea(key: string, floor: number): void;
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
  loot(key: string, n?: number): void;
  /** 45차: 쓰러져 떨군 물건을 아무도 줍지 않았다 — 보관 우리로 (되찾을 땐 비싼 수수료) */
  lostItem(key: string): void;
  /** 45차: 정벌 중 노을에게 말을 걸었다 */
  crusadeTalk(): void;
  /** 지옥 마을 장사꾼과 거래 */
  vendor(kind: HellVendor): void;
  /** 2층 구르마에게 먹이를 준다: 준 개수와 누적을 돌려준다 */
  feedGurma(): { gave: number; total: number; full: boolean };
  /** 가방에 먹을 것이 있는가 (구르마가 덤비지 않고 조른다) */
  hasFood(): boolean;
}
export interface Gear { /** 44차 시위에 건 화살의 효과 */ arrowFx?: 'pierce' | 'fire' | 'slow' | 'drain'; atk: number; def: number; dr?: number; /** 42차: 강화 3단계마다 공격 간격이 짧아진다 (0.98 · 0.96 …) */ haste?: number; ranged: boolean; /** 31차: 쏘는 무기인데 화살·탄약·연료가 없다 (휘둘러 치지 않는다) */ dry?: boolean; flame?: boolean; range?: number; rate?: number; /** 35차: 채찍·창 — 근접인데 이만큼 떨어져서 때린다 */ reach?: number; weapon: string | null; armor: string[] }

// ───────────────────────── 31차 필드 보스 ─────────────────────────
type FbPattern = 'charge' | 'ring' | 'pull' | 'leap' | 'coins' | 'slam' | 'pillars' | 'summon' | 'rain'; // 45차 summon = 졸개를 불러낸다 · rain = 하늘에서 불붙은 재가 쏟아진다
interface FbDef { hp: number; dmg: [number, number]; size: number; passive: boolean; patterns: FbPattern[]; every: number; cash?: [number, number]; loot: [string, number][]; shards?: number; deed: DeedKey; col: number }
/** 수쿰빗: 마피아 두목(필드 보스) · 방콕의 대식자(최후 보스) — 먼저 덤비지 않는다. 지옥: 층마다 하루 한 번 (설정집의 핵심 공격 두 가지) */
/** 43차: 층주와 필드 보스가 너무 약했다 — 혼자서는 1층 층주도 버거운 수준으로 (한 대가 체력의 6~10%, 깊을수록 더) */
const FB_HIT = 2.4, BOSS_HIT = 2.6;
/**
 * 45차 층주의 기술 (필드 보스와 같은 틀). 1층 아쉬갈은 환생 전 마지막 관문 — 기술 여덟, 체력이 반 아래면 성을 내어 더 자주 쓴다.
 * hp · loot · deed는 쓰지 않는다 (층주 값은 MONSTERS)
 */
const BOSS_SK: Record<string, FbDef> = {
  ashgal: { hp: 0, dmg: [24, 36], size: 0, passive: false, patterns: ['slam', 'charge', 'ring', 'pull', 'pillars', 'leap', 'summon', 'rain'], every: 5.5, loot: [], deed: 'fbossHell', col: 0xff6a1a },
};
export const FB: Record<string, FbDef> = {
  mafiaboss: { hp: 2600, dmg: [20, 32], size: 1.3, passive: true, patterns: ['coins', 'charge'], every: 7, cash: [600, 1400], loot: [['pistol', 0.3], ['rifleammo', 0.4], ['diary', 0.5]], deed: 'fbossDown', col: 0xffd24a },
  bkkeater: { hp: 7200, dmg: [34, 52], size: 1.75, passive: true, patterns: ['pull', 'ring', 'charge'], every: 6, cash: [2000, 4000], loot: [['katana', 0.25], ['shinsakuto', 0.08], ['firstaid', 0.8]], deed: 'fbossFinal', col: 0xc83a2a },
  rokk: { hp: 6400, dmg: [24, 36], size: 1.95, passive: false, patterns: ['charge', 'ring'], every: 6.5, loot: [['ashhide', 0.45]], shards: 2, deed: 'fbossHell', col: 0xb8b0a4 },
  gulon: { hp: 7000, dmg: [26, 38], size: 1.85, passive: false, patterns: ['pull', 'leap'], every: 6.5, loot: [['gulonstone', 0.45]], shards: 2, deed: 'fbossHell', col: 0xc8e05a },
  merk: { hp: 7600, dmg: [28, 40], size: 1.8, passive: false, patterns: ['coins', 'slam'], every: 6, loot: [['redseal', 0.45]], shards: 3, deed: 'fbossHell', col: 0xf2c84a },
  ferron: { hp: 8800, dmg: [32, 46], size: 2.0, passive: false, patterns: ['slam', 'pillars'], every: 6, loot: [['heartstone', 0.45]], shards: 3, deed: 'fbossHell', col: 0xff7a1a },
  manette: { hp: 9600, dmg: [34, 48], size: 2.0, passive: false, patterns: ['pull', 'slam', 'ring'], every: 5.5, loot: [['manettethread', 0.45], ['porcelainmask', 0.3]], shards: 3, deed: 'fbossHell', col: 0xf2eee6 }, // 43차 5층 실의 어미: 실로 끌어당기고 내리찍는다
};

const PED_COUNT = 14;
/**
 * 42차: 현실은 범죄 도시가 아니다 — 평범한 시민이 대부분이고, 그들이 신경을 긁는다. 건드리면 종류마다 다르게(어떤 이는 아주 세게) 맞선다.
 * w = 나올 몫 · hp/dmg = 보통 행인 대비 · brave = 맞서는 확률 · vis/hid = 들고 다니는(보이는/숨긴) 무기와 그 확률 · rally = 같은 무리가 몰려온다
 */
export type Civ = 'office' | 'student' | 'auntie' | 'elder' | 'worker' | 'bouncer' | 'rider' | 'vendor';
const CIV: Record<Civ, { w: number; hp: number; dmg: number; brave: number; vis?: [string, number]; hid?: [string, number]; rally?: boolean }> = {
  office: { w: 18, hp: 0.85, dmg: 0.8, brave: 0.25 },
  student: { w: 12, hp: 0.75, dmg: 0.75, brave: 0.3 },
  auntie: { w: 13, hp: 1.0, dmg: 1.2, brave: 0.65, vis: ['umbrella', 0.45] },
  elder: { w: 8, hp: 0.6, dmg: 0.7, brave: 0.4, vis: ['umbrella', 0.4] },
  worker: { w: 11, hp: 1.9, dmg: 2.3, brave: 0.92, vis: ['wrench', 0.55] },
  bouncer: { w: 5, hp: 2.8, dmg: 3.0, brave: 1, hid: ['knife', 0.3] },
  rider: { w: 12, hp: 1.5, dmg: 1.7, brave: 0.85, rally: true },
  vendor: { w: 9, hp: 1.35, dmg: 2.1, brave: 0.85, hid: ['knife', 0.7], rally: true },
};
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
/** 42차: 현실의 돈은 일해서 번다 — 일하는 동안은 5분이 한 시간 (시급 그대로, 한 시간치가 5분마다) */
const WORK_HOUR_SEC = 300;
const WAGE_PER_SEC = WAGE_PER_HOUR / WORK_HOUR_SEC;
/** 32차: 서울(강남) 시급 = 한국 최저임금 ₩10,320 (2026) → 방콕(하루 ฿400 ÷ 8시간) 의 약 5.2배 */
/** 32차: 쓰러진 사람이 든 무기를 떨어뜨릴 보통 확률 (25%는 너무 잦다 — 5%, 총은 2%) */
const WEAPON_DROP = 0.015, GUN_DROP = 0.006; // 42차: 주운 배트를 팔아 큰돈을 버는 게 너무 쉬웠다 (5% → 1.5%)
export const SEOUL_WAGE = 10320 / 40 / WAGE_PER_HOUR;
const ATK_INTERVAL = 0.62; // 6차: 더 빠르게
/** 고문 장면 (26차: 층마다 다른 고문) */
type Torture = {
  tor: Sprite; vic: Sprite; tcs: CharSet | null; vcs: CharSet | null; x: number; y: number; tx: number; ty: number; t: number; next: number; t0: number; hitT: number; struck: boolean; lying: boolean; tdir: Dir; vdir: Dir; spark: Graphics; free?: boolean;
  style: 'beat' | 'burn' | 'dunk' | 'whip' | 'furnace' | 'strings'; fx: Graphics; mask?: Graphics; sink: number; flare: number; splats: number;
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
/** 19차 관광객: 지갑이 조금 더 두둑하다 — 29차: 행인·불량배보다 약간 많은 정도로 (예전엔 수천 바트까지 떨어졌다) */
function touristCash() {
  const r = Math.random();
  if (r < 0.75) return rand(8, 20);
  if (r < 0.97) return rand(20, 40);
  return rand(45, 80);
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

/** 46차 알림 화살표의 업종 그림 (가게 종류) */
function pingKind(b: Building): string {
  if (b.cat === 'hbank') return 'bank';
  if (b.cat === 'loan') return 'coin';
  if (b.cat === 'atone') return 'candle';
  if (b.cat === 'rebirth') return 'spiral';
  const rk = roomKindOf(b);
  if (['temple', 'church', 'mosque', 'gurdwara'].includes(rk)) return 'worship';
  if (rk === 'dojo') return 'gym';
  if (rk === 'lobby') return 'hotel';
  if (rk === 'dept') return 'bag';
  if (rk === 'furnshop') return 'sofa';
  if (rk === 'hardware') return 'tools';
  if (rk === 'shop') { const k = bKindOf(b); return ['gift', 'antiques', 'jewelry', 'art', 'pawnbroker'].includes(k) ? 'blade' : ['hardware', 'car_repair', 'motorcycle_repair', 'bicycle', 'second_hand', 'doityourself', 'shop'].includes(k) ? 'tools' : 'shop'; }
  return rk;
}
/** 12×12 안의 작은 그림 (가운데 0,0) */
function pingIcon(g: Graphics, kind: string) {
  const gold = 0xf2d27a, ln = (pts: number[], color: number, width = 1.6) => { g.moveTo(pts[0], pts[1]); for (let k = 2; k < pts.length; k += 2) g.lineTo(pts[k], pts[k + 1]); g.stroke({ color, width, cap: 'round', join: 'round' }); };
  switch (kind) {
    case 'bird': // 48차: 유황앵무 — 흰 몸 · 노란 볏 · 검은 부리
      g.ellipse(0.6, 1.6, 3.6, 4.2).fill(0xf6f4ee); g.poly([2.6, 3, 6, 6, 3.4, 5.6]).fill(0xe8e4da); g.circle(-1.6, -2.4, 2.8).fill(0xf6f4ee);
      g.poly([-2.6, -4.6, -4.4, -7.4, -1.8, -5.4, -1.2, -8, 0, -5, 1.6, -7.2, 0.8, -4]).fill(0xf2d24a);
      g.poly([-4.2, -2.8, -6, -1.6, -4.2, -1]).fill(0x2a2620); g.circle(-2, -2.8, 0.6).fill(0x18120c); break;
    case 'phoenix': // 48차: 불사조 — 펼친 불 날개 · 불꽃 꼬리
      g.poly([0, -1, -6.5, -6, -5, -1.5, -6.5, 0.5, -2, 1.2]).fill(0xff7a2a); g.poly([0, -1, 6.5, -6, 5, -1.5, 6.5, 0.5, 2, 1.2]).fill(0xff7a2a);
      g.poly([0, -1, -4.5, -4.6, -3, -1]).fill(0xffd25a); g.poly([0, -1, 4.5, -4.6, 3, -1]).fill(0xffd25a);
      g.ellipse(0, 0.6, 1.8, 2.8).fill(0xffb03a); g.circle(0, -2.6, 1.5).fill(0xffd25a);
      g.poly([-1.4, 3, 0, 6.8, 1.4, 3]).fill(0xe8381e); g.poly([-2.8, 2.6, -2.4, 6, -0.6, 3.4]).fill(0xff7a2a); g.poly([2.8, 2.6, 2.4, 6, 0.6, 3.4]).fill(0xff7a2a); break;
    case 'bank': g.poly([-6, -2, 0, -6, 6, -2]).fill(gold); for (const x of [-4.5, -1.5, 1.5, 4.5]) g.rect(x - 0.8, -1, 1.6, 5).fill(gold); g.rect(-6, 4.5, 12, 1.6).fill(gold); break;
    case 'coin': g.circle(0, 0, 5.2).fill(gold); g.circle(0, 0, 3.2).stroke({ color: 0x8a6a1a, width: 1 }); g.rect(-0.6, -2, 1.2, 4).fill(0x8a6a1a); break;
    case 'gear': ln([-5, 5, 4, -4], 0xd8dce2, 2); ln([2, -5, 5, -2], 0xd8dce2, 1.4); ln([-6, 2, -2, 6], 0xb8863a, 2); g.circle(-5.4, 5.4, 1.2).fill(0xb8863a); break; // 칼
    case 'blade': ln([-5, 5, 4, -4], 0xe8ecf0, 1.8); ln([-6, 2, -2, 6], gold, 1.8); g.circle(4.6, -4.6, 0.9).fill(0xffffff); break;
    case 'tools': ln([-5, 5, 2, -2], 0xd8dce2, 2.2); g.circle(3.2, -3.2, 2.6).stroke({ color: 0xd8dce2, width: 1.6 }); g.rect(3.6, -6.4, 2.6, 2.6).fill(0x18120c); break; // 스패너
    case 'mart': g.poly([-6, -2, 6, -2, 4.5, 5, -4.5, 5]).fill(0x7ac8f0); ln([-3.5, -2, -1, -6, 1, -6, 3.5, -2], 0x7ac8f0, 1.4); break;
    case 'pharmacy': g.roundRect(-5.5, -2.5, 11, 5, 2.5).fill(0x7ad89a); g.rect(-0.4, -2.5, 0.8, 5).fill(0x18120c); break;
    case 'clinic': g.rect(-1.8, -5.5, 3.6, 11).fill(0xff6a6a); g.rect(-5.5, -1.8, 11, 3.6).fill(0xff6a6a); break;
    case 'food': g.poly([-6, -1, 6, -1, 4, 4, -4, 4]).fill(0xffa04a); ln([1, -2, 5, -6], 0xe8dcc0, 1.1); ln([3, -2, 6, -5], 0xe8dcc0, 1.1); break;
    case 'cafe': g.roundRect(-5, -3, 8, 7, 2).fill(0xd8a878); g.circle(4, 0.5, 2).stroke({ color: 0xd8a878, width: 1.3 }); ln([-3, -5, -2, -6.5], 0xe8dcc0, 1); ln([0, -5, 1, -6.5], 0xe8dcc0, 1); break;
    case 'bar': g.poly([-5, -5, 5, -5, 0, 1]).fill(0xff7ab8); g.rect(-0.6, 0.5, 1.2, 4).fill(0xff7ab8); g.rect(-3, 4.5, 6, 1.2).fill(0xff7ab8); break;
    case 'salon': g.circle(-3, 3.5, 2).stroke({ color: 0xe8a8f0, width: 1.3 }); g.circle(3, 3.5, 2).stroke({ color: 0xe8a8f0, width: 1.3 }); ln([-2, 2, 4, -6], 0xe8a8f0, 1.3); ln([2, 2, -4, -6], 0xe8a8f0, 1.3); break;
    case 'massage': for (const a of [-0.9, 0, 0.9]) g.ellipse(Math.sin(a) * 3.2, -Math.cos(a) * 2, 1.8, 4).fill(0xf0a8c8); g.rect(-5, 3.5, 10, 1.4).fill(0xf0a8c8); break; // 연꽃
    case 'laundry': g.poly([-6, -3, -3, -5, 3, -5, 6, -3, 4, -1, 3, -2, 3, 5, -3, 5, -3, -2, -4, -1]).fill(0x9ad0f0); break;
    case 'hotel': g.rect(-6, 0, 12, 3).fill(0xb8c8f0); g.rect(-6, -4, 1.6, 9).fill(0xb8c8f0); g.roundRect(-4, -2.5, 4, 2.5, 1).fill(0xe8ecf8); g.rect(4.6, 2, 1.4, 3).fill(0xb8c8f0); break;
    case 'gym': g.rect(-3, -0.8, 6, 1.6).fill(0xd8dce2); g.rect(-6, -3.5, 2.2, 7).fill(0xd8dce2); g.rect(3.8, -3.5, 2.2, 7).fill(0xd8dce2); break;
    case 'worship': g.poly([-6, -1, 0, -6, 6, -1]).fill(gold); g.rect(-4, -1, 8, 6).fill(0xe8dcc0); g.rect(-1, 1, 2, 4).fill(0x18120c); break;
    case 'bag': g.roundRect(-5, -2, 10, 7.5, 1.5).fill(0xf0c86a); ln([-2.5, -2, -2.5, -4.5, 2.5, -4.5, 2.5, -2], 0xf0c86a, 1.3); break;
    case 'sofa': g.roundRect(-6, -1, 12, 5, 1.5).fill(0xc8a07a); g.roundRect(-4.5, -4.5, 9, 4, 1.5).fill(0xa8805a); break;
    case 'arcade': g.roundRect(-5.5, 0, 11, 5, 1.5).fill(0x9a8af0); g.rect(-0.7, -5, 1.4, 5).fill(0xe8ecf0); g.circle(0, -5, 1.8).fill(0xff5a5a); break;
    case 'candle': g.rect(-1.5, -2, 3, 7).fill(0xe8dcc0); g.ellipse(0, -4, 1.4, 2.4).fill(0xffb04a); break;
    case 'spiral': g.circle(0, 0, 5).stroke({ color: 0xb8a8f0, width: 1.3 }); g.circle(0.8, 0.6, 2.6).stroke({ color: 0xb8a8f0, width: 1.3 }); break;
    case 'ysalon': case 'myhome': case 'home': g.poly([-6, 0, 0, -5.5, 6, 0]).fill(0xe0b437); g.rect(-4, 0, 8, 5).fill(0xe0b437); g.rect(-1, 2, 2, 3).fill(0x18120c); break;
    default: g.rect(-5.5, -1, 11, 6).fill(0xe0b437); g.poly([-6.5, -1, -5, -5, 5, -5, 6.5, -1]).fill(0xc8381e); g.rect(-1.2, 1.5, 2.4, 3.5).fill(0x18120c); break; // 가게
  }
}
const ZOO_KINDS = new Set(['giraffe', 'elephant', 'lion', 'zebra', 'flamingo', 'panda']);
export class WorldScene {
  /** 46차: 다음에 여는 성소가 예배 중인지 · 비워 둘 내 자리 */
  static svcNext: { on: boolean; seat: [number, number] | null } | null = null;
  readonly root = new Container();
  private camera = new Container();
  /** 39차 시야 배율 (카메라 · 불빛 층을 함께 키운다). 'auto' = 손가락 기기의 작은 화면 1.6 · 큰 화면 1.3 · PC 1 */
  private zoom = 1;
  private zoomPref = (() => { try { return localStorage.getItem('heavensmanual.zoom') ?? 'auto'; } catch { return 'auto'; } })();
  setZoomPref(v: string) { this.zoomPref = v; }
  private wantZoom(): number {
    // 42차: 염소대왕의 방은 거인이 다 보이게 (휴대폰에서 당겨 보면 염소대왕이 화면 밖이었다)
    if (this.zone.interior?.kind === 'goatroom') return Math.min(1, this.zoomPref !== 'auto' ? Number(this.zoomPref) || 1 : 1);
    const coarse = typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches;
    // 47차 후속: 휴대폰 · 태블릿은 실내에서 1.2배까지만 (당겨 보면 나가는 문이 화면 밖이라 누르기 힘들었다)
    if (coarse && this.zone.interior) return Math.min(1.2, this.zoomPref !== 'auto' ? Math.max(1, Number(this.zoomPref) || 1) : 1.2);
    if (this.zoomPref !== 'auto') return Math.max(1, Math.min(2.6, Number(this.zoomPref) || 1));
    // 40차: 사람만 키우던 것(1.2배) 대신 화면 전체를 1.2배 더 당긴다 — PC 1.2 · 큰 화면 터치 1.55 · 휴대폰 1.9
    if (!coarse) return 1.2;
    return Math.min(this.app.screen.width, this.app.screen.height) < 600 ? 1.9 : 1.55;
  }
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
  /** 32차: 지도 밖에 비친 건물 (번호는 -1, -2, … — 들어가거나 고를 수 없다) */
  private ghostB: Building[] = [];
  private bAt(k: number): Building { return k < 0 ? this.ghostB[-k - 1] : this.zone.buildings[k]; }
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
  private reachRing = new Graphics(); // 34차: 쏘는 무기(권총·활·저격총·화염방사기)의 사거리 — 발밑 바닥에 둥근 테
  private arrow = new Graphics();
  private aura = makeAuraSprite();
  private auraTex: Map<Dir, Frame[]> | null = null;
  private dressSeq = 0;
  private time = 0;
  // 누른 자리 표시: 이동 = 바닥 파동, 공격 = 대상 발밑 붉은 표적, 상호작용 = 출입·말풍선 아이콘
  private fxLayer = new Graphics();
  private sparkG = new Graphics();
  private sparks: { x: number; y: number; vx: number; vy: number; t: number; col: number }[] = [];
  /** 43차: 마지막 일격의 하얀 충격 고리 */
  private flingRings: { x: number; y: number; t: number; dur: number }[] = [];
  /** 45차: 두 동강 난 괴물 (윗몸이 튀어 오르며 돌고 아랫몸은 무너진다 · 잘린 자리에서 피가 솟는다) */
  private splits: { c: Container; top: Sprite; bot: Sprite; t: number; vx: number; spin: number; tip: number; cutX: number; cutY: number; col: number; w: Walker }[] = [];
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
    if (this.passage) { this.updatePassage(dt); return; } // 42차: 죽은 뒤 — 세상이 멈춘다
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
    // 32차: 지도 밖(갈 수 없는 곳)도 화면 끝까지 — 거울에 비친 땅·건물 (방 안·천국 구름 위는 그대로)
    zone.beyond = undefined;
    if (!zone.interior && this.realm !== 'heaven') {
      const { beyond, ghosts } = beyondOf(zone, zone.city === 'seoul' ? 2 : 0);
      zone.beyond = beyond;
      this.ghostB = ghosts;
      ghosts.forEach((b, n) => {
        const key = `${Math.floor(b.i0 / CHUNK)},${Math.floor(b.j0 / CHUNK)}`;
        const list = this.bIndex.get(key);
        if (list) list.push(-(n + 1)); else this.bIndex.set(key, [-(n + 1)]);
      });
    }
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
      for (let n = 0; n < this.streetHostiles(); n++) this.spawnNpc('thug');
      if (this.realm === 'real') { this.setupStreetLife(decProps); for (let n = 0; n < 10; n++) this.spawnNpc('passer'); } // 19차: 사람이 더 북적이게 · 42차: 시민을 더
      if (this.realm === 'real' && Math.random() < 0.7) this.spawnGoat(); // 24차: 떠도는 염소 (구역마다 있을 수도, 없을 수도)
      if (this.realm === 'real' && Math.random() < 0.75) this.spawnDogs(); // 48차: 들개 무리
      this.setupAirportStop(); // 47차 공항 가는 정류장
      if (this.realm === 'real' && this.zone.home) this.placeYunae();
      if (this.realm === 'real' && this.zone.city !== 'seoul') this.spawnFieldBosses(); // 31차: 수쿰빗 필드 보스
    }
    if (this.zone.interior?.kind === 'home' && (this.zone.interior.age ?? 3) < 3) {
      // 37차 회상: 바랜 사진처럼 누렇고 조금 어둡게
      const cm = new ColorMatrixFilter();
      cm.sepia(false);
      cm.brightness(0.93, true);
      this.camera.filters = [cm];
    }
    if (this.realm === 'ghost') {
      // 귀신: 세상이 잿빛으로. 돌아다니기만 하고 우주새 말고는 아무것도 만질 수 없다
      const cm = new ColorMatrixFilter();
      cm.desaturate();
      this.camera.filters = [cm];
      this.player.sprite.alpha = 0.6;
    }
    if (this.realm !== 'heaven') this.spawnCars(); // 천국엔 차가 없다
    this.setupBeyondLife(); // 33차: 지도 밖 거리의 차 · 행인 그림자
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
    // 45차: PC 우클릭 — 겹친 몹 가운데 커서 아래의 적을 골라 친다 (같은 자리를 다시 우클릭하면 그 뒤의 적으로)
    this.root.on('rightclick', (e) => { this.touchTap = false; this.pickFoeAt(e.global.x, e.global.y, true); });
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
      let pt = propSprite(p.kind, (p.i * 7 + p.j * 3) % 3);
      if (!pt && this.zone.heavenGen) {
        // 35차 천국 1층의 소품(썬베드·파라솔·동물·분수·울타리)은 거리 소품 그림으로
        const pp = streetProp(p.kind, (p.i * 7 + p.j * 3) % 3, p.o ?? 0);
        const tx = Texture.from(pp.canvas); tx.source.scaleMode = 'nearest';
        pt = { tex: tx, ax: pp.ax, ay: pp.ay } as unknown as typeof pt;
      }
      if (!pt) continue;
      const s = new Sprite(pt.tex);
      const [x, y] = iso(p.i + 0.5, p.j + 0.5);
      s.anchor.set(pt.ax, pt.ay);
      s.position.set(x, y);
      s.zIndex = p.i + p.j + 0.99;
      this.objects.addChild(s);
      if (this.zone.heavenGen && ZOO_KINDS.has(p.kind)) { const pen = ZOO_PENS.find(([a, b]) => p.i > a && p.i < a + 5 && p.j > b && p.j < b + 6); if (pen) this.zooAnimals.push({ s, x: p.i + 0.5, y: p.j + 0.5, tx: p.i + 0.5, ty: p.j + 0.5, wait: Math.random() * 4, pen: [pen[0], pen[1]], sp: p.kind === 'flamingo' ? 0.55 : p.kind === 'elephant' || p.kind === 'panda' ? 0.28 : 0.4, ph: Math.random() * 6 }); } // 46차 걷는 동물
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
      else if (lm.kind === 'spot') pic = null as unknown as Pic; // 48차: 건물 자체가 명소 — 그림 없이 이름만
      else pic = parkSignCanvas(lm.text!, lm.sub!);
      if (pic) put(pic, i, j, 0.5, lm.kind === 'fountain' ? 0.2 : 0.9);
      const nm = L.landmarks[lm.key as keyof typeof L.landmarks];
      if (nm) this.landmarkSpots.push({ i, j, r: lm.kind === 'fountain' ? 7 : lm.kind === 'spot' ? 9 : 3, name: nm[0], sub: nm[1], t: 0 });
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
      const decor = p.kind === 'fence' || p.kind === 'wall' || p.kind === 'crag' || p.kind === 'htree' || p.kind === 'rock' || p.kind === 'crack' || p.kind === 'dicetable' || p.kind === 'campfire' || p.kind === 'bones' || p.kind === 'skulls' || p.kind === 'stake' || p.kind === 'cauldron' || p.kind === 'cage' || p.kind === 'bonfire' || p.kind === 'junk' || p.kind === 'reeds' || p.kind === 'mattress' || p.kind === 'anvil' || p.kind === 'forge' || p.kind === 'maskpost' || p.kind === 'tent' || (p.kind === 'lantern' && theme !== 'ash');
      if (decor) {
        // 같은 그림이 되풀이되지 않게: 나무·바위·땅 자국은 24가지, 해골 더미·꼬챙이·철창·가마솥·뼈는 12가지
        const vv = Math.floor(((p.i * 73856093) ^ (p.j * 19349663)) >>> 0) % (p.kind === 'wall' ? 3 : p.kind === 'crag' ? 8 : p.kind === 'htree' || p.kind === 'rock' || p.kind === 'crack' ? 24 : p.kind === 'fence' ? 6 : 12);
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
        if (p.kind === 'bonfire' || p.kind === 'campfire' || p.kind === 'forge' || p.kind === 'anvil') this.addFire(x, y, p.kind, s.zIndex + 0.001); // 46차: 불꽃이 살아 움직인다
        if (hp.glow) {
          const glow = new Sprite(this.glowTex());
          glow.anchor.set(0.5);
          glow.scale.set(p.kind === 'bonfire' ? 1.3 : p.kind === 'tent' ? 0.5 : p.kind === 'crag' ? 0.6 : p.kind === 'htree' ? 0.45 : 0.7);
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
      const wx = (sx - this.camera.x) / this.zoom, wy = (sy - this.camera.y) / this.zoom;
      return [(wx / (TW / 2) + wy / (TH / 2)) / 2, (wy / (TH / 2) - wx / (TW / 2)) / 2];
    });
    const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]);
    const a = margin ? 4 : 0, b = margin ? 16 : 2;
    return { i0: Math.min(...xs) - a, i1: Math.max(...xs) + b, j0: Math.min(...ys) - a, j1: Math.max(...ys) + b };
  }

  private stream(all: boolean) {
    const shore = this.zone.interior?.kind === 'shore';
    if (this.zone.interior && !shore) return; // 방은 처음에 한 장으로 다 그린다 (32차: 긴 해변은 덩어리로)
    const r = this.visibleRange();
    const out = !!this.zone.beyond || shore; // 32차: 지도 밖까지 그린다
    const c0 = Math.floor((out ? r.i0 : Math.max(0, r.i0)) / CHUNK), c1 = Math.floor((out ? r.i1 : Math.min(this.zone.W - 1, r.i1)) / CHUNK);
    const d0 = Math.floor((out ? r.j0 : Math.max(0, r.j0)) / CHUNK), d1 = Math.floor((out ? r.j1 : Math.min(this.zone.H - 1, r.j1)) / CHUNK);
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
          const ch = perf('chunk', () => shore ? drawShoreChunk(ci * CHUNK, cj * CHUNK) : this.zone.heavenGen ? drawHeavenGround(this.zone, ci * CHUNK, cj * CHUNK, CHUNK) : this.zone.hell ? drawHellGround(this.zone, floorDef(this.zone.hell.floor).theme, ci * CHUNK, cj * CHUNK) : kitOk ? drawGroundKit(this.zone, ci * CHUNK, cj * CHUNK, this.realm === 'heaven' ? this.zone.edges : undefined, this.realm === 'heaven') : drawGroundChunk(this.zone, ci * CHUNK, cj * CHUNK));
          if (ch && kitOk && !shore && !this.zone.heavenGen && !this.zone.hell && this.season() === 'winter') perf('snow', () => snowGround(ch.canvas, ch.x, ch.y, this.zone, ci * CHUNK, cj * CHUNK, CHUNK, (i, j) => this.dalSnow(i, j))); // 44차 서울 겨울 눈
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
          if (!this.bViews.has(k)) { const bb = this.bAt(k); if (this.heavenOut(bb.i0, bb.j0, bb.w, bb.d)) continue; missB.push({ k, d: Math.hypot(bb.i0 + bb.w / 2 - cx, bb.j0 + bb.d / 2 - cy) }); }
        }
    // 건물도 가까운 것부터, 남은 시간 안에서 (땅을 하나도 안 그린 프레임엔 적어도 하나)
    missB.sort((a, b) => a.d - b.d);
    let madeB = 0;
    for (const { k } of missB) {
      if (!all && (made + madeB > 0) && spent() > 6) break;
      madeB++;
      this.bViews.set(k, perf('building', () => this.makeBuilding(this.bAt(k))));
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
    if (b.hk === 'idol') { const f = this.zone.hell?.floor ?? 1; return f === 1 ? L.idolAsh : f === 2 ? L.idolMaw : f === 4 ? L.idolAnvil : f === 5 ? L.idolMask : L.idolScale; } // 34차: 4층 거대한 모루가 '피의 저울'로 나오던 것
    if (b.hk === 'smithy') return L.ferumSmithy;
    if (b.hk === 'mineshaft') return L.mineName;
    if (b.hk === 'puppetidol') return L.puppetIdol;
    return b.cat === 'ujusae' ? '' : b.cat === 'loan' ? L.beskHouse : b.cat === 'hbank' ? L.hbankName : b.cat === 'atone' ? L.atoneName : b.cat === 'rebirth' ? L.rebirthName : buildingName(b, lang());
  }
  /** 건물 이름 아래 한 줄 */
  private subOf(b: Building) {
    const L = t();
    if (b.hk === 'idol') { const f = this.zone.hell?.floor ?? 1; return f === 1 ? L.idolAshSub : f === 2 ? L.idolMawSub : f === 4 ? L.idolAnvilSub : f === 5 ? L.idolMaskSub : L.idolScaleSub; }
    if (b.hk === 'smithy') return L.ferumSmithySub;
    if (b.hk === 'mineshaft') return L.mineSub;
    if (b.hk === 'puppetidol') return L.puppetIdolSub;
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
    const snowy = this.season() === 'winter';
    const lmk = (b as { lmk?: LandmarkBuild }).lmk; // 47차 명소 건물
    let d = lmk && this.realm === 'real' ? landmarkBuildingCanvas(b, lmk, this.night === 1) : dal ? drawDalHouse(b, this.night === 1, b.cat === 'home', !!b.yunae, snowy) : b.cat === 'palace' ? drawHeavenPalace(b) : b.cat === 'attraction' ? drawAttraction(b) : b.cat === 'sanct' ? drawSanctum(b) : this.realm === 'heaven' && b.cat === 'shop' && !this.zone.interior ? drawMarbleShop(b, this.nameOf(b)) : b.cat === 'ujusae' ? (hf ? drawYuhwang(b, hf) : this.realm === 'heaven' ? drawCosmicBirdHeaven(b) : drawCosmicBird(b, this.night === 1)) : b.cat === 'hbank' ? drawHellBank(b, hf || 1) : b.cat === 'atone' ? drawAtone(b, hf || 1) : b.cat === 'rebirth' ? drawRebirthGate(b) : b.cat === 'loan' ? drawLoanHouse(b) : hellTheme ? drawHellStructure(b, hellTheme, true) : kitOk ? drawBuildingKit(b, this.nameOf(b), this.night === 1, this.low) : drawBuilding(b, this.nameOf(b), this.night === 1);
    // 44차 서울 겨울: 옥상 · 처마 · 창턱에 쌓인 눈 (달동네는 더 수북이)
    if (snowy && b.cat !== 'palace' && !b.yunae) d = { ...d, canvas: snowBuilding(d.canvas, b.i0 * 31 + b.j0 * 17, dal || this.dalSnow(b.i0, b.j0), !dal && kitOk && b.cat !== 'ujusae' && b.cat !== 'loan' && b.cat !== 'attraction' ? { ox: d.x, oy: d.y, b, z: buildingTop(b, this.low) - PPX } : undefined) };
    // 17차: 지옥 건물마다 층의 흔적 (1층 화산재 · 2층 이끼와 진흙 · 3층 핏빛과 홍등). 유황새는 따로 그린다, 환생 로비는 홀로 멀쩡하다
    if (hf && b.cat !== 'ujusae' && b.cat !== 'rebirth') d = { ...d, canvas: weatherHell(d.canvas, hf, b.i0 * 31 + b.j0 * 17, { lanterns: !['carcass', 'bonepile', 'guts', 'idol', 'smithy'].includes(b.hk ?? '') }) };
    // 관리자가 갈아 끼운 그림 (같은 크기 또는 2배)
    const art = b.cat === 'ujusae' && hf ? BLD_ART[`bld-hell-${hf}`] : b.cat === 'ujusae' && this.realm === 'heaven' ? BLD_ART['bld-ujusae-heaven'] : b.cat === 'ujusae' ? (this.night === 1 ? BLD_ART['bld-ujusae-night'] ?? BLD_ART['bld-ujusae'] : BLD_ART['bld-ujusae']) : b.cat === 'loan' ? BLD_ART['bld-loan'] : undefined;
    const k = art ? (art.width === d.canvas.width * 2 && art.height === d.canvas.height * 2 ? 2 : art.width === d.canvas.width && art.height === d.canvas.height ? 1 : 0) : 0;
    if (art && k === 2) { const c1 = document.createElement('canvas'); c1.width = d.canvas.width; c1.height = d.canvas.height; const g1 = c1.getContext('2d')!; g1.imageSmoothingEnabled = false; g1.drawImage(art, 0, 0, c1.width, c1.height); d = { ...d, canvas: c1 }; }
    else if (art && k === 1) d = { ...d, canvas: art };
    const base = tex(art && k ? art : d.canvas);
    const W = d.canvas.width, H = d.canvas.height;
    const parts = this.strips(base, d.x, d.y, b.i0, b.j0, b.w, b.d, -0.2, k === 2 ? 2 : 1);
    const top = lmk && this.realm === 'real' ? landmarkTop(b.h, lmk) + 40 : dal ? 34 + 16 + Math.min(b.w, b.d) * 3 : b.cat === 'palace' ? 1440 : b.cat === 'attraction' ? b.h + 30 : b.cat === 'sanct' ? (SANCT_TOP[(b as { att?: string }).att ?? 'church'] ?? 260) + 20 : this.realm === 'heaven' && b.cat === 'shop' ? b.h + 30 : b.cat === 'ujusae' ? COSMIC_TOP : b.cat === 'loan' ? LOAN_TOP : b.cat === 'hbank' ? b.h + 6 : b.cat === 'atone' ? b.h + 46 : b.cat === 'rebirth' ? b.h + 4 : hellTheme ? b.h : kitOk ? buildingTop(b, this.low) : buildingHeight(b.h);
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
    const now = performance.now();
    // 29차: 높은 건물이 빽빽한 곳(소이 8–17 고층 단지)에서 걸을 때마다 원래 높이 그림을 새로 그리고 버리느라 버벅이던 것 —
    // 한 프레임에 하나만 새로 그리고(가장 가까운 건물부터), 흐려진 그림은 버리지 않고 남겨 두었다가 다시 다가가면 그대로 쓴다 (최대 8채)
    let best: { v: BView; dist: number } | null = null;
    let kept = 0;
    for (const v of this.bViews.values()) {
      const b = v.b;
      let want = 0, dist = 99;
      if (on && b.cat !== 'ujusae' && b.cat !== 'home' && !b.hut && upperFloors(b) > 0) {
        const dx = Math.max(b.i0 - px, 0, px - (b.i0 + b.w)), dy = Math.max(b.j0 - py, 0, py - (b.j0 + b.d));
        dist = Math.hypot(dx, dy);
        want = dist < 1.5 ? 0.15 : dist < 3.5 ? (0.15 * (3.5 - dist)) / 2 : 0;
      }
      if (want > 0 && !v.ghost && (!best || dist < best.dist)) best = { v, dist };
      if (!v.ghost) continue;
      kept++;
      const g = v.ghost;
      if (want > 0) g.used = now;
      g.a += Math.sign(want - g.a) * Math.min(Math.abs(want - g.a), dt * 0.9);
      if (g.a < 0.001) g.a = 0;
      for (const s of g.parts) { s.alpha = g.a; s.renderable = g.a > 0; }
    }
    if (best) {
      const b = best.v.b;
      let d = drawBuildingKit(b, this.nameOf(b), this.night === 1, false);
      if (this.season() === 'winter') d = { ...d, canvas: snowBuilding(d.canvas, b.i0 * 31 + b.j0 * 17, this.dalSnow(b.i0, b.j0), { ox: d.x, oy: d.y, b, z: buildingTop(b, false) - PPX }) };
      const base = tex(d.canvas);
      const parts = this.strips(base, d.x, d.y, b.i0, b.j0, b.w, b.d, -0.19);
      for (const s of parts) { s.alpha = 0; s.renderable = false; }
      best.v.ghost = { parts, base, a: 0, used: now };
      kept++;
    }
    if (kept > 8) {
      const idle = [...this.bViews.values()].filter((v) => v.ghost && v.ghost.a === 0).sort((a, b) => a.ghost!.used - b.ghost!.used);
      for (const v of idle) { if (kept <= 8) break; this.dropGhost(v); kept--; }
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
    // 39차: 서울 거리의 사람은 누구든 계절옷 (관광객 · 장사꾼 · 따라오는 이 · 맞서는 행인까지 — 반팔이 섞여 나오던 것)
    if (kind !== 'player' && kind !== 'remote' && kind !== 'clerk' && (look.outfit ?? 'casual') === 'casual' && this.season()) look = this.dressForSeason(look, kind === 'thug' ? 'thug' : 'passer');
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
    charSet(look, weapon, armor, !!w.isPlayer).then((cs) => {
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
    this.reachRing.eventMode = 'none';
    this.objects.addChild(this.reachRing, this.ring, this.aura, this.arrow);
  }

  /**
   * 22차: 거리 사람 모습은 종류마다 몇 벌만 돌려 입힌다 (사람이 바뀔 때마다 새 그림을 합치던 것이 이동 중 끊김의 큰 원인).
   * 같은 모습이면 이미 합쳐 둔 그림을 그대로 쓴다. 지옥 괴물·특별한 인물은 따로
   */
  private npcLook(kind: NpcKind, weak?: Walker['weak'], gang?: Walker['gang']): Look {
    const key = `${this.realm}|${this.zone.hell ? 'h' : ''}|${kind}|${weak ?? ''}|${gang ?? ''}|${this.season()}`;
    const cap = kind === 'passer' ? 12 : kind === 'thug' ? 4 : 5;
    let pool = LOOK_POOL.get(key);
    if (!pool) LOOK_POOL.set(key, (pool = []));
    if (pool.length >= cap) return pool[Math.floor(Math.random() * pool.length)];
    const l = this.dressForSeason(this.npcLookNew(kind, weak, gang), kind, weak, gang);
    pool.push(l);
    return l;
  }
  /**
   * 35차 도시별 계절: 방콕은 늘 여름(바꾸지 않는다). 서울은 서울 날짜로 — 11월 중순~3월 초 겨울 · 3~5월 봄 · 6~8월 여름 · 9~11월 초 가을.
   * 천국·지옥은 계절이 없다
   */
  /** 44차: 주인공의 동네(달동네 · 내 집 골목) 둘레 — 눈이 더 수북이 쌓인다 */
  private dalMask: Uint8Array | null = null;
  private dalSnow(i: number, j: number): boolean {
    const z = this.zone;
    if (!this.dalMask) {
      const m = new Uint8Array(z.W * z.H);
      const mark = (a0: number, b0: number, a1: number, b1: number) => { for (let y = Math.max(0, b0); y < Math.min(z.H, b1); y++) for (let x = Math.max(0, a0); x < Math.min(z.W, a1); x++) m[y * z.W + x] = 1; };
      for (const b of z.buildings) if (b.hut || b.cat === 'home') mark(b.i0 - 5, b.j0 - 5, b.i0 + b.w + 5, b.j0 + b.d + 5);
      if (z.homeAlley) mark(z.homeAlley.i0 - 3, z.homeAlley.j0 - 3, z.homeAlley.i1 + 4, z.homeAlley.j1 + 4);
      for (let k = 0; k < z.W * z.H; k++) if (TYPES[z.tiles[k]] === 'hill') m[k] = 1;
      this.dalMask = m;
    }
    return i >= 0 && j >= 0 && i < z.W && j < z.H && this.dalMask[j * z.W + i] === 1;
  }
  private season(): 'winter' | 'spring' | 'summer' | 'autumn' | '' {
    if (this.realm !== 'real' || this.zone.hell || this.zone.city !== 'seoul') return '';
    const p = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul', month: 'numeric', day: 'numeric' }).formatToParts(new Date());
    const m = Number(p.find((x) => x.type === 'month')?.value ?? 1), d = Number(p.find((x) => x.type === 'day')?.value ?? 1);
    if (m === 12 || m <= 2 || (m === 11 && d >= 15) || (m === 3 && d <= 10)) return 'winter';
    return m <= 5 ? 'spring' : m <= 8 ? 'summer' : 'autumn';
  }
  /**
   * 39차 서울 계절옷 (방콕은 늘 여름 그대로):
   *  겨울 — 거의 다 무릎까지 오는 롱패딩(검정·남색·회색·베이지·흰색·카키·버건디, 누빈 줄은 한 톤 어둡게) · 몇은 두툼한 긴소매 점퍼. 반팔은 없다
   *  봄 — 긴소매(밝은 셔츠·카디건·얇은 재킷) 여덟에 반팔 둘 · 가을 — 긴소매(갈색·카키·버건디·남색 재킷) 아홉
   *  여름 — 반팔 그대로. 강도는 후드 차림 그대로, 마피아·행동대장은 겨울에 검은 롱패딩
   *  (35차엔 겨울 코트가 우비 몸이라 얼굴이 두건 속에 가려지고, 점퍼 차림은 반팔 몸이었다)
   */
  private dressForSeason(l: Look, kind: NpcKind, weak?: Walker['weak'], gang?: Walker['gang']): Look {
    const se = this.season();
    if (!se || weak === 'shade' || gang === 'robber' || l.child) return l;
    const o = l.outfit ?? 'casual';
    if (o !== 'casual' && o !== 'mafia') return l; // 앞치마·수영복 같은 특별한 차림은 그대로
    const pick = <T,>(a: T[]) => a[Math.floor(Math.random() * a.length)];
    const dark = (h: string) => { const n = parseInt(h.slice(1), 16); const f = (v: number) => Math.round(v * 0.62).toString(16).padStart(2, '0'); return `#${f(n >> 16)}${f((n >> 8) & 255)}${f(n & 255)}`; };
    if (se === 'winter') {
      const pants = pick(['#1e1e22', '#2a2c34', '#3a3a40', '#2e3a52']);
      if (gang === 'mafia' || gang === 'enforcer') return { ...l, outfit: 'padding', cols: { ...l.cols, 3: '#121214', 9: '#060608', 4: '#121216', 5: '#0a0a0a' } };
      if (Math.random() < (kind === 'thug' ? 0.55 : 0.8)) {
        const coat = pick(['#16161a', '#16161a', '#1e2436', '#3a3c42', '#c8b89a', '#e8e6e0', '#4a4a38', '#5a2a2a']);
        return { ...l, outfit: 'padding', cols: { ...l.cols, 3: coat, 9: dark(coat), 4: pants, 5: '#1a1816' } };
      }
      const jk = pick(['#2a2c34', '#3a2a22', '#1e2a3a', '#4a3a2a', '#6a1e22']);
      return { ...l, outfit: 'casualL', cols: { ...l.cols, 3: jk, 9: jk, 4: pants, 5: '#1a1816' } };
    }
    if (se === 'summer' || o === 'mafia') return l;
    const longP = se === 'autumn' ? 0.9 : 0.8;
    if (Math.random() > longP) return l;
    const jk = se === 'autumn' ? pick(['#7a5a3a', '#4a5a3a', '#5a2a2e', '#3a4a5a', '#8a7a5a', '#2a2c34']) : pick(['#e8e2d0', '#a8c0d8', '#d8b8b0', '#c8d0a8', '#f2efe6', '#7a8aa0']);
    return { ...l, outfit: 'casualL', cols: { ...l.cols, 3: jk, 9: jk } };
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
      // 39차: 천사는 전용 몸 — 흰 튜닉 · 금빛 가슴받이·어깨 갑·팔목 보호대 · 금발 (예전엔 두건 달린 우비 몸이라 얼굴이 어둠에 가려졌다)
      if (kind === 'angel') return { sex: Math.random() < 0.5 ? 'f' : 'm', build: 1, skin: r(3), hair: 0, hairColor: 0, top: 0, bottom: 0, outfit: 'angelk', cols: { 2: pick(['#e8c870', '#f2e6c8', '#d8b060']), 3: '#f8f4ea', 4: '#efe8d8', 5: '#b89a6a', 14: pick(['#e0b450', '#d8a83a']), 12: '#7ad8ff' } };
      return { sex: Math.random() < 0.5 ? 'f' : 'm', build: r(3), skin: r(3), hair: r(6), hairColor: r(3), top: 0, bottom: 0, cols: { 3: pick(['#f4f0e6', '#eae4f2', '#e6f0ea', '#f2ead8']), 4: pick(['#e8e2d4', '#dcd6c8', '#ece6da']), 5: '#c8bca8' } };
    }

    // 강도: 검은·짙은 후드에 눈만 뚫린 복면, 카고 바지, 등에 더플백 (여자 강도도 같은 차림)
    if (gang === 'robber') return { sex: Math.random() < 0.7 ? 'm' : 'f', build: 1, skin: r(3), hair: 0, hairColor: 0, top: 0, bottom: 0, outfit: 'robber', cols: { 3: pick(['#24262c', '#2e3238', '#3a2e2a', '#28302a']), 8: '#121214', 4: pick(['#3a3a30', '#2a2c30', '#4a4232']), 5: '#1a1816', 7: pick(['#2a2a2e', '#3a4a5a', '#5a2a22']), 15: '#141414' } };
    // 마피아: 짙은 정장·흰 셔츠·붉은 넥타이·금붙이·선글라스, 단정히 빗어 넘긴 머리 (여자 마피아도 정장)
    // 35차: 소매치기는 눈에 띄지 않는 평범한 차림(모자·작은 가방) · 무에타이 파이터는 민소매와 반바지 · 행동대장은 짧은 머리에 검은 양복
    if (gang === 'pickpocket') return { sex: Math.random() < 0.6 ? 'm' : 'f', build: r(2), skin: r(3), hair: [0, 1, 5][r(3)], hairColor: r(2), top: 0, bottom: 0, cols: { 3: pick(['#8a8478', '#6a7078', '#a09a8c', '#5a5e52']), 4: pick(['#3a3c40', '#4a4438', '#2e3440']), 5: '#2a2622' } };
    if (gang === 'boxer') return { sex: 'm', build: 2, skin: 1 + r(2), hair: 5, hairColor: 0, top: 0, bottom: 0, cols: { 3: pick(['#c8282a', '#2a48c0', '#e8e4dc']), 4: pick(['#c8282a', '#1a1a1e', '#2a48c0', '#d8a83a']), 5: '#3a2a20' } };
    // 48차 사채 수금원: 잿빛 정장에 단추를 푼 흰 셔츠, 금 목걸이 · 넥타이 없이 · 손에 장부 대신 쇠파이프
    if (gang === 'collector') return { sex: Math.random() < 0.8 ? 'm' : 'f', build: 1 + r(2), skin: r(3), hair: [5, 0][r(2)], hairColor: 0, top: 0, bottom: 0, outfit: 'mafia', cols: { 3: pick(['#5a5e64', '#6a6258', '#4a4e56']), 4: pick(['#3a3c42', '#4a443c']), 5: '#1a1816', 10: '#ece8e0', 12: '#ece8e0', 14: '#e0b84a', 15: '#2a2622' } };
    if (gang === 'enforcer') return { sex: 'm', build: 2, skin: r(2), hair: 5, hairColor: 0, top: 0, bottom: 0, outfit: 'mafia', cols: { 3: '#121216', 4: '#121216', 5: '#0a0a0a', 10: '#f2f0ea', 12: '#121216', 14: '#c9a23e', 15: '#08080a' } };
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
    w.maxHp = w.hp = gang === 'mafia' ? 520 : gang === 'robber' ? 320 : gang === 'enforcer' ? 640 : gang === 'boxer' ? 440 : gang === 'pickpocket' ? 110 : gang === 'collector' ? 400 : 150;
  }
  /**
   * 21차 거리의 위험도: 우주새가 있는 아속(시작)은 취객·불량배뿐 — 우주새 문에서 멀어질수록 강도가 가끔 섞인다.
   * 소이 8–17·소이 20–33은 강도 구역, 나나·프롬퐁은 마피아 구역. 먼 곳일수록 서로 섞인다
   */
  /** 35차 새 거리의 적들 글 (i18n 키: pickpocket · pickpocketSub · pickpocketLook · …Lines · …Taunt · …Demand · …GiveUp) */
  private gangText(g: string, suf: string): string | string[] {
    const L = t() as unknown as Record<string, string | string[]>;
    return L[g + suf] ?? L['thug' + suf] ?? '';
  }
  /**
   * 35차 소매치기: 평범한 행인처럼 다가와 슬쩍 부딪히고 지갑에서 몇 푼(4–9%, 많아야 ฿900)을 빼 달아난다.
   * 나보다 조금 빨라 쫓기 어렵지만, 때려 눕히면 훔친 돈이 고스란히 떨어진다. 18초쯤 달아나다 멀어지면 사라진다
   */
  private thinkPickpocket(w: Walker, dt: number) {
    const p = this.player;
    const pick = (a: string[]) => a[Math.floor(Math.random() * a.length)];
    const d = Math.hypot(p.x - w.x, p.y - w.y);
    const hidden = !!this.working?.on || this.invisible;
    if (w.pick && w.pick.flee > 0) {
      w.pick.flee -= dt;
      w.repathT -= dt;
      if (w.repathT <= 0 || !w.path.length) {
        w.repathT = 0.6;
        const ax = w.x + (w.x - p.x) * 2.5, ay = w.y + (w.y - p.y) * 2.5;
        const to = this.nearestWalkable(Math.floor(ax), Math.floor(ay)) ?? randomWalkTileNear(this.zone, Math.floor(w.x), Math.floor(w.y), 8, ['walk', 'soi', 'cross', 'park']);
        if (to) w.path = findPath(this.zone, Math.floor(w.x), Math.floor(w.y), to[0], to[1]) ?? [];
      }
      if (w.pick.flee <= 0 && d > 14) this.spawnNpc('thug', w); // 멀리 달아나면 사라지고 다른 사람이 거리에 나온다
      return;
    }
    w.aggroCool = Math.max(0, (w.aggroCool ?? 0) - dt);
    if (w.stalk) {
      w.stalk += dt;
      if (hidden || d > 12 || w.stalk > 25) { w.stalk = 0; w.aggroCool = 25; w.path = []; return; }
      if (d < 0.95) {
        w.stalk = 0; w.path = [];
        const wallet = this.hooks.cash();
        const want = Math.min(900, Math.max(wallet > 20 ? 8 : 0, Math.round(wallet * (0.04 + Math.random() * 0.05))));
        const got = want > 0 ? this.hooks.stolen(want) : 0;
        w.pick = { stolen: (w.pick?.stolen ?? 0) + got, flee: 14 };
        this.bubble(w, pick(this.gangText('pickpocket', 'Demand') as string[]));
        if (got > 0) this.float(p, `−${moneyText(got)}`, '#ff8a6a');
        return;
      }
      w.repathT -= dt;
      if (w.repathT <= 0 || !w.path.length) {
        w.repathT = 0.35;
        const path = findPath(this.zone, Math.floor(w.x), Math.floor(w.y), Math.floor(p.x), Math.floor(p.y));
        if (path) w.path = path;
      }
      return;
    }
    // 아무렇지 않게 걷다가 가까이 오면 슬며시 붙는다 (말은 하지 않는다)
    if (!w.aggroCool && !hidden && !w.pick && d < 7 && this.hooks.cash() > 20 && Math.random() < dt * 0.5) { w.stalk = 0.01; w.repathT = 0; }
  }
  private rollThug(spot: [number, number]): { weak?: Walker['weak']; gang?: Walker['gang'] } {
    const o = this.zone.origin ?? { i: 533, j: 512 };
    const d = Math.hypot(spot[0] + o.i - 533, spot[1] + o.j - 512); // 우주새 문까지 (전체 지도 칸, 1칸 = 3 m)
    const r = Math.random();
    // 35차: 현실이 심심하다 — 어디서나 소매치기가 섞이고, 방콕은 무에타이 파이터 · 서울은 조직 행동대장이 가끔 길을 막는다
    const seoul = this.zone.id.startsWith('seoul');
    const r0 = Math.random();
    if (r0 < (this.zone.shop === false ? 0.06 : 0.05)) return { gang: 'pickpocket' }; // 42차: 소매치기는 가끔만
    if (r0 > 0.93 && this.hooks.cash() > 100) return { gang: 'collector' }; // 48차: 사채 수금원 — 돈 냄새를 맡고 온다 (어디서나 가끔)
    if (r0 < (this.gangZone() ? 0.3 : 0.2)) return { gang: seoul ? 'enforcer' : 'boxer' };
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
    if (r < 0.25 - mix * 0.1) return { weak: 'drunk' }; // 42차: 취객이 너무 많았다
    if (r < 1 - mix * 0.22) return {};
    return { gang: 'robber' };
  }
  /**
   * 29차: 행인·관광객의 셈 (0 = 우주새 문 앞 · 1 = 끝 구역). 수쿰빗도 구역마다 다르다 —
   * 아속(우주새 구역) 0~0.3 · 사이 구역(소이 8–17 · 20–33) 0.35~0.8(끝 구역 쪽으로 갈수록) · 나나 · 프롬퐁 1. 서울은 우주새 구역처럼
   */
  private passerTier(i: number, j: number) {
    if (this.realm !== 'real') return 0;
    if (this.gangZone()) return 1;
    const o = this.zone.origin ?? { i: 533, j: 512 };
    const d = Math.hypot(i + o.i - 533, j + o.j - 512);
    if (this.zone.shop === false) return 0.35 + 0.45 * Math.max(0, Math.min(1, (d - 90) / 200));
    return 0.3 * Math.max(0, Math.min(1, (d - 60) / 400));
  }
  /**
   * 29차: 가끔 적대 행인(취객 말고 불량배·강도·마피아)이 지나가는 사람에게 시비를 건다.
   * 맞서는 행인은 싸우고 아닌 사람은 도와 달라며 달아난다. 플레이어가 그 적을 거들어 쓰러뜨리면 선행
   */
  private brawlT = 20 + Math.random() * 30;
  private startBrawl() {
    if (this.dead) return;
    const p = this.player;
    const thugs = this.walkers.filter((w) => w.kind === 'thug' && !w.weak && w.gang !== 'pickpocket' && !w.target && !(w.stalk && w.stalk > 0) && w.down <= 0 && Math.hypot(w.x - p.x, w.y - p.y) < 13);
    for (const th of thugs.sort(() => Math.random() - 0.5)) {
      let v: Walker | null = null, bd = 9;
      for (const o of this.walkers) if (o.kind === 'passer' && o.down <= 0 && !o.target && !o.tail && !o.look.child) { const d = Math.hypot(o.x - th.x, o.y - th.y); if (d < bd) { bd = d; v = o; } }
      if (!v) continue;
      const L = t();
      th.target = v; th.home = [Math.floor(th.x), Math.floor(th.y)]; th.path = [];
      this.bubble(th, L.brawlThug[Math.floor(Math.random() * L.brawlThug.length)]);
      v.firstBy = th;
      if (v.brave) this.standUp(v, th);
      else { v.flee = 7; v.path = []; this.bubble(v, L.help); }
      return;
    }
  }
  /**
   * 42차: 현실은 범죄 도시가 아니다 — 거리의 적의 수는 구역마다. 우주새 구역(아속 · 서울)은 골목 안에 몇만,
   * 사이 구역은 골목·구역 끝에 조금 더, 끝 구역(나나 · 프롬퐁)은 '적이 많은 구역'으로 마피아 떼가 그대로
   */
  private streetHostiles() {
    if (this.realm !== 'real') return THUG_COUNT;
    if (this.gangZone()) return MAFIA_COUNT + ROBBER_COUNT + THUG_COUNT + DRUNK_COUNT;
    return this.zone.shop === false ? 9 : 5;
  }
  /** 42차: 골목(소이 · 빈터)이거나 구역 끝 언저리인가 — 거리의 적이 시비를 거는 곳 */
  private roughAt(x: number, y: number) {
    const tt = tileAt(this.zone, Math.floor(x), Math.floor(y));
    return tt === 'soi' || tt === 'lot' || x < 15 || x > this.zone.W - 16;
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
      if (w === src || w.kind !== 'thug' || w.gang !== 'mafia' || w.down > 0 || w.target === p || (w.stalk ?? 0) > 0 || w.fb) continue; // 31차: 두목은 먼저 덤비지 않는다
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
    this.heavenStair = this.zone.heavenGen ? heavenMeta()?.base ?? null : endZone ? this.findEdgeStairSpot() : null;
    if (this.heavenStair && !this.zone.heavenGen) this.addHeavenTower(this.heavenStair);
    if (this.heavenStair && this.zone.heavenGen) this.addShipBase(this.heavenStair); // 35차: 동쪽 끝 우주선 기지 (구름 계단 대신)
    else if (this.heavenStair) {
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
    this.spawnNoeul();
    this.setupZooCages();
  }
  /** 43차: 천국 동물원의 지옥 우리 — 악마 · 괴물, 그리고 죄 지은 인간들 (우리 안을 서성이고, 가끔 철창 밖으로 한마디) */
  private setupZooCages() {
    // 47차 과소비의 쓰레기장 관리 천사 · 돌아다니는 닭 한 마리
    const hm = this.zone.heavenGen ? heavenMeta() : null;
    if (hm?.dump) {
      const d = hm.dump, a = this.makeWalker(this.npcLook('angel'), Math.floor((d.i0 + d.i1) / 2), d.j1 + 1, 'angel');
      a.dumpAngel = true; a.wait = 1e9; a.speed = 0; a.dir = 'ne'; a.maxHp = a.hp = 99999;
      this.giveWings(a, 0xe8e2d4);
      this.walkers.push(a);
    }
    if (hm?.chicken) this.makeChicken(hm.chicken.i, hm.chicken.j);
    const cages = this.zone.heavenGen ? heavenMeta()?.cages ?? [] : [];
    const R = (a: number) => Math.floor(Math.random() * a);
    for (const c of cages) {
      const keys = c.kind === 'demon' ? ['cinderimp', 'glutton', 'broker', 'haggler'] : c.kind === 'beast' ? ['gateyak', 'bogdead', 'hammerman'] : [];
      const n = c.kind === 'sinner' ? 4 : 2;
      for (let k = 0; k < n; k++) {
        const i = c.i0 + R(c.i1 - c.i0 + 1), j = c.j0 + R(c.j1 - c.j0 + 1);
        let w: Walker;
        if (c.kind === 'sinner') {
          const look = randomSoulLook(true);
          look.cols = { ...look.cols, 3: ['#8a8478', '#7a746a', '#9a948a'][k % 3], 4: '#5a564e' }; // 잿빛 수의
          w = this.makeWalker(look, i, j, 'caged');
          if (k === 3) w.still = 'sit';
        } else {
          const m = MONSTERS[keys[(k + R(keys.length)) % keys.length]];
          if (!m) continue;
          w = this.makeWalker(this.monsterLook(m), i, j, 'caged', null);
          w.size = Math.min(1.2, m.scale);
        }
        w.cage = c; w.speed = 0.55; w.wait = 2 + Math.random() * 4; w.maxHp = w.hp = 99999; w.home = [i, j];
        this.walkers.push(w);
      }
    }
  }
  private thinkCaged(w: Walker, moving: boolean, dt: number) {
    const c = w.cage!, p = this.player, d = Math.hypot(p.x - w.x, p.y - w.y);
    if (d < 9 && !w.bubble && Math.random() < dt * (c.kind === 'sinner' ? 0.06 : 0.03)) { const L = t(); const a = c.kind === 'sinner' ? L.zooSinnerCalls : L.zooDemonCalls; this.bubble(w, a[Math.floor(Math.random() * a.length)]); }
    if (moving || w.still) { if (!moving && d < 6) w.dir = dirFromTile(p.x - w.x, p.y - w.y, w.dir); return; }
    w.wait -= dt;
    if (w.wait > 0) { if (d < 6) w.dir = dirFromTile(p.x - w.x, p.y - w.y, w.dir); return; }
    w.wait = 3 + Math.random() * 6;
    const i = c.i0 + Math.floor(Math.random() * (c.i1 - c.i0 + 1)), j = c.j0 + Math.floor(Math.random() * (c.j1 - c.j0 + 1));
    const path = findPath(this.zone, Math.floor(w.x), Math.floor(w.y), i, j);
    if (path && path.every(([a, b]) => a >= c.i0 && a <= c.i1 && b >= c.j0 && b <= c.j1)) w.path = path;
  }
  // ───────── 43차: 천국의 신앙 감시자 노을 (유내와 똑같은 얼굴 · 긴 장검) ─────────
  /** 아무 데나 서 있다가, 내가 움직이면 가끔 멀찍이(9~15칸) 따라와 어슬렁거리며 지켜본다. 먼저 다가오지는 않는다 */
  private spawnNoeul() {
    if (this.zone.interior || this.walkers.some((w) => w.kind === 'noeul')) return;
    const p = this.player;
    let s = randomWalkTileNear(this.zone, Math.floor(p.x), Math.floor(p.y), 30, ['walk', 'park', 'lot']);
    if (!s || Math.hypot(s[0] - p.x, s[1] - p.y) < 9) s = randomWalkTileNear(this.zone, Math.floor(p.x) + 14, Math.floor(p.y) - 6, 8, ['walk', 'park', 'lot']);
    if (!s) return;
    const w = this.makeWalker(NOEUL_LOOK, s[0], s[1], 'noeul');
    w.speed = 0.9; w.home = [s[0], s[1]]; w.maxHp = w.hp = 99999; w.wait = 2;
    this.giveWings(w, 0xf8f8fc); // 46차 컨셉 그림: 새하얀 깃털 날개
    w.watchT = 20 + Math.random() * 30;
    this.walkers.push(w);
  }
  /** 46차: 노을을 곁으로 (없으면 내려앉힌다) — 날개를 펄럭이며 */
  private noeulNear(r: number): Walker | null {
    let n = this.walkers.find((w) => w.kind === 'noeul');
    if (!n) { this.spawnNoeul(); n = this.walkers.find((w) => w.kind === 'noeul'); }
    if (!n) return null;
    const p = this.player;
    const s0 = randomWalkTileNear(this.zone, Math.floor(p.x + r), Math.floor(p.y + 1), 2, ['walk', 'park', 'lot', 'cross']);
    if (s0) { n.x = s0[0] + 0.5; n.y = s0[1] + 0.5; n.path = []; n.home = [s0[0], s0[1]]; }
    this.burst(n.x, n.y, 0xffffff, 14);
    return n;
  }
  /** 46차 예배 시간: 칼을 뽑은 노을과 황색날개가 곁으로 온다 (off면 칼을 거둔다) */
  noeulEscort(on: boolean) {
    if (on) {
      const n = this.noeulNear(2);
      if (!n) return;
      this.dress(n, n.look, 'sword'); n.escort = true; n.prowlT = 0;
      this.bubble(n, t().noeulDraw);
      this.setYwFollow(true);
      const y = this.walkers.find((w) => w.kind === 'yellowwing');
      if (y) { y.x = this.player.x - 1.6; y.y = this.player.y + 0.6; y.path = []; y.dir = dirFromTile(this.player.x - y.x, this.player.y - y.y, y.dir); }
    } else {
      const n = this.walkers.find((w) => w.kind === 'noeul');
      if (n) { n.escort = false; this.dress(n, n.look, null); }
    }
  }
  /** 46차 황색날개를 칭찬하거나 선물하면: 노을이 칼을 뽑고 둘레를 어슬렁거린다 */
  noeulProwl(sec: number) {
    if (this.zone.interior) return;
    const n = this.walkers.find((w) => w.kind === 'noeul') ?? this.noeulNear(6);
    if (!n) return;
    if (!n.prowlT) { this.dress(n, n.look, 'sword'); this.bubble(n, t().noeulDraw); }
    n.prowlT = Math.max(n.prowlT ?? 0, sec); n.wait = 0.5;
  }
  private thinkNoeul(w: Walker, moving: boolean, dt: number) {
    const p = this.player, d = Math.hypot(p.x - w.x, p.y - w.y);
    w.target = null;
    if (w.escort) { w.path = []; w.dir = dirFromTile(p.x - w.x, p.y - w.y, w.dir); return; } // 46차 예배로 데려간다
    if ((w.prowlT ?? 0) > 0) { // 46차 칼을 뽑고 둘레를 어슬렁 (내가 황색날개에게 다정했다)
      w.prowlT! -= dt;
      if (w.prowlT! <= 0) { w.prowlT = 0; this.dress(w, w.look, null); this.bubble(w, t().noeulSheathe); return; }
      if (!moving) {
        w.wait -= dt;
        if (w.wait <= 0) {
          w.wait = 1.2 + Math.random() * 1.6;
          const a = Math.random() * Math.PI * 2, r = 3.5 + Math.random() * 2.5;
          const s0 = randomWalkTileNear(this.zone, Math.floor(p.x + Math.cos(a) * r), Math.floor(p.y + Math.sin(a) * r), 2, ['walk', 'park', 'lot', 'cross']);
          if (s0) { const path = findPath(this.zone, Math.floor(w.x), Math.floor(w.y), s0[0], s0[1]); if (path) w.path = path; }
        } else w.dir = dirFromTile(p.x - w.x, p.y - w.y, w.dir);
      }
      if (!w.bubble && Math.random() < dt * 0.22) { const c = t().noeulProwl; this.bubble(w, c[Math.floor(Math.random() * c.length)]); }
      return;
    }
    const pMoving = p.path.length > 0;
    w.watchT = (w.watchT ?? 30) - dt * (pMoving ? 1 : 0.35);
    if (w.watchT <= 0) {
      // 멀찍이 따라붙는다: 내 둘레 9~15칸 어딘가로 (아주 멀면 보이지 않는 곳에서 내려앉는다)
      w.watchT = 35 + Math.random() * 50;
      for (let n = 0; n < 8; n++) {
        const a = Math.random() * Math.PI * 2, r = 9 + Math.random() * 6;
        const s0 = randomWalkTileNear(this.zone, Math.floor(p.x + Math.cos(a) * r), Math.floor(p.y + Math.sin(a) * r), 3, ['walk', 'park', 'lot', 'cross']);
        if (!s0 || Math.hypot(s0[0] - p.x, s0[1] - p.y) < 8) continue;
        w.home = [s0[0], s0[1]];
        if (d > 26) { w.x = s0[0] + 0.5; w.y = s0[1] + 0.5; w.path = []; }
        else { const path = findPath(this.zone, Math.floor(w.x), Math.floor(w.y), s0[0], s0[1]); if (path) w.path = path; }
        break;
      }
      return;
    }
    if (moving) return;
    if (d < 15) w.dir = dirFromTile(p.x - w.x, p.y - w.y, w.dir);
    if (d < 13 && !w.bubble && Math.random() < dt * 0.045) { const c = t().noeulCalls; this.bubble(w, c[Math.floor(Math.random() * c.length)]); }
    w.wait -= dt;
    if (w.wait <= 0) {
      w.wait = 4 + Math.random() * 6;
      const s0 = randomWalkTileNear(this.zone, w.home[0], w.home[1], 2, ['walk', 'park', 'lot', 'cross']);
      if (s0 && Math.hypot(s0[0] - p.x, s0[1] - p.y) > 5) { const path = findPath(this.zone, Math.floor(w.x), Math.floor(w.y), s0[0], s0[1]); if (path) w.path = path; }
    }
  }
  /** 35차 천국 1층 동쪽 끝의 우주선 기지: 금빛 발사대 위에 선 흰 우주선 · 하늘로 솟는 빛기둥 · 늘 떠 있는 이름 (누르면 환생의 테라스로) */
  private addShipBase(st: { i: number; j: number }) {
    const [sx, sy] = iso(st.i + 0.5, st.j + 0.5);
    const pad = new Graphics();
    for (const [rx, ry, c] of [[150, 75, 0xe8dcc0], [128, 64, 0xf6efe0], [96, 48, 0xf2d27a], [84, 42, 0xfbf8f0]] as const) pad.ellipse(0, 0, rx, ry).fill(c);
    for (let k = 0; k < 12; k++) { const a = (k / 12) * Math.PI * 2; pad.circle(Math.cos(a) * 112, Math.sin(a) * 56, 3).fill(0xffd86a); }
    pad.position.set(Math.round(sx), Math.round(sy));
    pad.zIndex = -5;
    this.ground.addChild(pad);
    const pic = shuttleCanvas(false);
    const cv = document.createElement('canvas'); cv.width = pic.back.width; cv.height = pic.back.height;
    { const g = cv.getContext('2d')!; for (const l of [pic.back, pic.stack, pic.front]) g.drawImage(l, 0, 0); }
    const ship = new Sprite(tex(cv));
    ship.anchor.set(pic.ax, pic.ay);
    ship.scale.set(0.62); // 2배 캔버스
    ship.position.set(Math.round(sx), Math.round(sy) + 6);
    ship.zIndex = st.i + st.j + 0.4;
    this.objects.addChild(ship);
    const h = ship.height;
    this.stairBox = [sx - ship.width / 2, sy - h, sx + ship.width / 2, sy + 10];
    const beam = new Sprite(this.glowTex());
    beam.anchor.set(0.5, 1); beam.scale.set(1.3, 6); beam.tint = 0xfff0b8; beam.alpha = 0.5; beam.blendMode = 'add';
    beam.position.set(Math.round(sx), Math.round(sy) - 20); beam.zIndex = ship.zIndex - 0.01;
    this.objects.addChild(beam);
    const tag = new Text({ text: `🚀 ${t().shipBase}`, style: { fontFamily: 'system-ui, sans-serif', fontSize: 14, fontWeight: '800', fill: '#fff4c8', stroke: { color: '#5a4418', width: 4, join: 'round' } } });
    tag.anchor.set(0.5, 1);
    tag.position.set(Math.round(sx), Math.round(sy) - h - 14);
    tag.zIndex = 1e7 - 1;
    this.objects.addChild(tag);
  }
  private makeYellowWing(i: number, j: number) {
    const yw = this.makeWalker(YELLOW_WING_LOOK, i, j, 'yellowwing'); // 43차: 황색날개 전용 몸 (웨이브 금발 · 흰 드레이프 드레스 · 금 밑단 · 이마의 금관)
    yw.speed = 0.6;
    yw.home = [i, j];
    this.giveWings(yw, 0xf2cf3a);
    this.walkers.push(yw);
    return yw;
  }
  /** 21차: 안내천사 황색날개가 따라다닌다 (처음 온 영혼이 천국에 익숙해질 때까지 — 구역마다 함께, 너무 멀리 달아나면 놓친다) */
  /** 35차 아큐버스와 정한 사이 */
  private accMode: 'lover' | 'friend' | 'family' | 'alone' | undefined;
  setAccubusMode(m: 'lover' | 'friend' | 'family' | 'alone' | undefined) { this.accMode = m; }
  get hpRatio() { return this.player.hp / this.player.maxHp; }
  /** 48차: 연락이 와도 되는 한가한 때 — 싸움 · 쓰러짐 · 타는 중 · 날아가는 몸이 없을 때 */
  get calm() { const p = this.player; return !this.dead && p.down <= 0 && !p.target && !p.act && this.attackersOnMe() === 0 && !this.riding && !this.walkers.some((w) => w.target === p && w.down <= 0); }
  /** 48차: 한 시간에 한 번 황색날개가 날아와 곁에 내린다 (따라다니던 중이면 그 자리에서) */
  ywCome(): boolean {
    if (this.realm !== 'heaven' || this.zone.interior) return false;
    const p = this.player;
    let yw = this.walkers.find((w) => w.kind === 'yellowwing');
    const s0 = this.nearestWalkable(Math.floor(p.x + 1.5), Math.floor(p.y + 1));
    if (!s0) return false;
    if (!yw) yw = this.makeYellowWing(s0[0], s0[1]);
    else if (Math.hypot(yw.x - p.x, yw.y - p.y) > 3) { yw.x = s0[0] + 0.5; yw.y = s0[1] + 0.5; }
    yw.path = []; yw.dir = dirFromTile(p.x - yw.x, p.y - yw.y, yw.dir);
    p.dir = dirFromTile(yw.x - p.x, yw.y - p.y, p.dir);
    for (let k = 0; k < 14; k++) { const a = Math.random() * Math.PI * 2, v = 20 + Math.random() * 40; const [sx, sy] = iso(yw.x, yw.y); this.sparks.push({ x: sx, y: sy - 30, vx: Math.cos(a) * v, vy: Math.sin(a) * v * 0.4, t: 0.5 + Math.random() * 0.3, col: 0xf2d24a }); }
    return true;
  }
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
    // 43차: 천국에 올 때마다 잘 따라다닌다 — 멀어지면 서둘러 쫓고, 아주 멀면 노란 날개로 날아와 곁에 내린다 (예전엔 6초 만에 놓쳤다)
    if (w.farT > 3) {
      const s0 = this.nearestWalkable(Math.floor(p.x + 1.5), Math.floor(p.y + 1.5));
      if (s0) { w.x = s0[0] + 0.5; w.y = s0[1] + 0.5; w.path = []; w.farT = 0; w.dir = dirFromTile(p.x - w.x, p.y - w.y, w.dir); if (!w.bubble) this.bubble(w, t().ywCatchUp[Math.floor(Math.random() * t().ywCatchUp.length)]); return; }
    }
    if (w.farT > 60) {
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
    // 35차 아큐버스: 천국 1층에만 산다. 내가 좋아할 얼굴의 이성
    // 37차: 사용자 컨셉 그림대로 — 은빛 긴 머리 · 머리 위 금빛 고리 · 금실 무늬 흰 드레스와 별 브로치(남자는 금 영대를 건 흰 긴 옷) · 작은 흰 깃털 날개
    // 43차: 천국에 올 때마다 아큐버스 하나는 내 곁에 나타나 계속 따라다닌다 (혼자 있고 싶다고 하면 물러난다)
    if (this.zone.heavenGen) for (let n = 0; n < 4; n++) {
      const s = n === 0 ? (randomWalkTileNear(this.zone, Math.floor(p.x), Math.floor(p.y), 4, ['walk', 'park', 'lot']) ?? randomWalkTileNear(this.zone, Math.floor(p.x), Math.floor(p.y), 26, ['walk', 'park', 'lot'])) : randomWalkTileNear(this.zone, Math.floor(p.x), Math.floor(p.y), 26, ['walk', 'park', 'lot']);
      if (!s) continue;
      const r = (k: number) => Math.floor(Math.random() * k);
      const pick = <T,>(a: T[]) => a[r(a.length)];
      const look: Look = { sex: mySex, build: 1, skin: r(3), hair: 3, hairColor: 0, top: 0, bottom: 0, outfit: 'accubus', cols: { 2: pick(['#e8e6ee', '#dcdce8', '#efe8d6', '#e4dcef']), 3: pick(['#f8f4ec', '#f7eef0', '#eef2f8']), 4: '#fbf8f2', 5: '#e8dcc0', 6: pick(['#7ab8e8', '#e8c860', '#b08ae8']), 12: '#ffd65a', 14: '#e0b450' } };
      const w = this.makeWalker(look, s[0], s[1], 'passer');
      w.tail = n === 0 ? { kind: 'accubus', t: 1e9, cool: 0, rep: 1, stay: true } : { kind: 'accubus', t: 0, cool: 3 + Math.random() * 10, rep: 0 };
      w.speed = 1.25;
      this.giveWings(w, 0xfbf8f2);
      w.wingK = 0.8; // 천사보다 작은 날개
      this.walkers.push(w);
    }
    // 길가 침대와 편히 자는 사람들 (구역마다 같은 자리)
    // 37차: 침대마다 꼭 한 사람, 매트리스 한가운데 — 침대끼리 붙지 않게 둘레 한 칸을 비우고, 침대 칸은 막아 지나가던 이가 올라서지 않게
    const hsh = (a: number) => { const v = Math.sin(a * 91.7 + this.zone.W * 3.1) * 43758.5; return v - Math.floor(v); };
    const zb = this.zone as Zone & { heavenBeds?: [number, number, number][] };
    if (!zb.heavenBeds) {
      const list: [number, number, number][] = [];
      const taken = new Set<number>();
      const key = (i: number, j: number) => j * this.zone.W + i;
      for (let n = 0; n < 1400 && list.length < (this.zone.heavenGen ? 28 : 12); n++) { // 35차: 천국 1층은 곳곳에 침대
        const i = Math.floor((e ? e.i0 : 0) + hsh(n) * ((e ? e.i1 - e.i0 : this.zone.W) - 2)), j = Math.floor((e ? e.j0 : 0) + hsh(n + 777) * ((e ? e.j1 - e.j0 : this.zone.H) - 2));
        const tt = tileAt(this.zone, i, j);
        if (!inside(i, j) || !['walk', 'park', 'lot'].includes(tt) || !walkable(this.zone, i, j) || !walkable(this.zone, i + 1, j) || !walkable(this.zone, i, j + 1) || !walkable(this.zone, i + 1, j + 1)) continue;
        let clash = false;
        for (let a2 = -1; a2 <= 2 && !clash; a2++) for (let c2 = -1; c2 <= 1; c2++) if (taken.has(key(i + a2, j + c2))) { clash = true; break; }
        if (clash) continue;
        for (let a2 = -1; a2 <= 2; a2++) for (let c2 = -1; c2 <= 1; c2++) taken.add(key(i + a2, j + c2));
        list.push([i, j, n]);
      }
      // 침대 두 칸은 걸어 들어가지 못한다 (구역 그림은 한 번 만들어 계속 쓰니 한 번만)
      for (const [i, j] of list) for (const ii of [i, i + 1]) this.zone.blocked[j * this.zone.W + ii] = 1;
      zb.heavenBeds = list;
    }
    for (const [i, j, n] of zb.heavenBeds) {
      const sp = new Sprite(bedTexture(n));
      sp.anchor.set(BED_ANCHOR[0], BED_ANCHOR[1]);
      const [x, y] = iso(i, j);
      sp.position.set(Math.round(x), Math.round(y));
      sp.zIndex = i + j + 1.2;
      this.objects.addChild(sp);
      const look = Math.random() < 0.3 ? this.swimLook(Math.random() < 0.5 ? 'm' : 'f') : this.npcLook('passer');
      const sl = this.makeWalker(look, i, j, 'sleeper');
      sl.still = 'lie'; sl.speed = 0; sl.wait = 1e9; sl.dir = 'se';
      // 누운 그림은 발끝이 기준점이라 몸이 베개 쪽으로 쏠린다 — 매트리스 한가운데에 몸통이 오도록 발치 쪽으로 옮겨 둔다
      sl.x = i + 1.3; sl.y = j + 0.33;
      this.walkers.push(sl);
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
        const tw = this.makeWalker({ ...al, sex, cols: { ...al.cols, 3: '#34445e', 4: '#2a3448', 5: '#1a1e28', 14: '#c8ccd2', 2: sex === 'f' ? '#e8d8a8' : '#3a2a1e' } }, at[0], at[1], 'angel'); // 남색 튜닉 · 은빛 갑 (택시 기사)
        this.giveWings(tw, 0xfffaf0);
        tw.wingK = 2.6;
        tw.size = 1.16;
        tw.taxi = true; tw.speed = 0; tw.wait = 1e9; tw.dir = side === 'w' ? 'se' : 'sw'; tw.maxHp = tw.hp = 900;
        this.walkers.push(tw);
      }
    }
  }
  /** 22차 서큐버스 → 37차: 뿔은 몸에 함께 구웠다. 등에는 뼈와 발톱이 선 박쥐 날개, 허리 뒤로는 스페이드 꼬리 (층마다 빛깔이 다르다) */
  private dressSuccubus(w: Walker, floor: number) {
    const [mem, bone, tail, tip] = SUCC_WING[floor] ?? SUCC_WING[1];
    const s = new Sprite(succWingTexture(mem, bone));
    s.anchor.set(0.5, 0.62);
    s.scale.set(0.5);
    this.objects.addChild(s);
    w.wings = s;
    w.wingK = 0.74; // 몸에 맞춘 크기 (컨셉: 어깨 너비의 두어 배)
    const tl = new Sprite(spadeTailTexture(tail, tip));
    tl.anchor.set(SPADE_ANCHOR[0], SPADE_ANCHOR[1]);
    tl.scale.set(0.5);
    this.objects.addChild(tl);
    w.devTail = tl;
    w.tailY = 25; // 드레스 허리 뒤에서 나와 옆으로 늘어진다
  }
  /** 따라오는 이(구애·요리사): 눈에 띄면 다가와 얼마쯤 곁을 따라다니며 말을 걸다 떠난다 */
  private thinkTail(w: Walker, moving: boolean, dt: number) {
    const tl = w.tail!;
    const p = this.player;
    const d = Math.hypot(p.x - w.x, p.y - w.y);
    const L = t();
    const am = this.accMode;
    if (tl.kind === 'accubus' && am === 'alone' && (tl.t <= 0 || tl.stay)) { if (tl.stay) { tl.stay = false; tl.t = 0; tl.cool = 60; } return false; } // 혼자 있고 싶다고 했다 — 다가오지 않는다 (부르면 온다)
    // 43차: 곁의 아큐버스는 놓치지 않는다 — 멀어지면 서둘러 쫓아오고, 아주 멀면 날개로 날아와 곁에 내린다
    if (tl.stay) {
      w.speed = d > 8 ? 2.8 : 1.25;
      if (d > 30 && !this.dead) { const s0 = this.nearestWalkable(Math.floor(p.x - 1.5), Math.floor(p.y + 1.5)); if (s0) { w.x = s0[0] + 0.5; w.y = s0[1] + 0.5; w.path = []; } }
    }
    const lines = tl.kind === 'chef' ? L.chefLines : tl.kind === 'accubus' ? L.accLines[am === 'lover' ? 1 : am === 'friend' ? 2 : am === 'family' ? 3 : 0] : (p.look?.sex === 'f' ? L.admireToF : L.admireToM);
    if (tl.t > 0) {
      tl.t -= dt;
      w.repathT -= dt;
      if (d > 2.2 && (w.repathT <= 0 || !moving)) { w.repathT = 0.7; const path = findPath(this.zone, Math.floor(w.x), Math.floor(w.y), Math.floor(p.x), Math.floor(p.y)); if (path) w.path = path.slice(0, Math.max(1, path.length - 2)); }
      if (!moving && d < 3) w.dir = dirFromTile(p.x - w.x, p.y - w.y, w.dir);
      if (!w.bubble && Math.random() < dt * 0.22) this.bubble(w, lines[Math.floor(Math.random() * lines.length)]);
      if (tl.kind === 'accubus' && am && am !== 'alone' && d <= 18) tl.t = Math.max(tl.t, 4); // 정한 사이면 곁을 떠나지 않는다
      if (tl.stay) { if (tl.t < 1e6) tl.t = 1e9; return true; }
      // 43차: 이성(구애하는 이)은 내가 떠나면(12칸 넘게 멀어지면) 아쉬워하며 처음 있던 자리로 돌아간다
      if (tl.t <= 0 || d > (tl.kind === 'admire' ? 12 : 18)) {
        this.bubble(w, (tl.kind === 'chef' ? L.chefBye : tl.kind === 'accubus' ? L.accBye : L.admireBye)[Math.floor(Math.random() * 3)]);
        tl.t = 0;
        tl.cool = tl.kind === 'admire' ? 25 + Math.random() * 30 : 70 + Math.random() * 80;
        const away = tl.kind === 'admire' ? w.home : randomWalkTileNear(this.zone, Math.floor(w.x), Math.floor(w.y), 14, ['walk', 'cross', 'park']);
        if (away) { const path = findPath(this.zone, Math.floor(w.x), Math.floor(w.y), away[0], away[1]); if (path) w.path = path; }
      }
      return true;
    }
    tl.cool -= dt;
    // 이성은 내가 곁에 가야(6칸 안) 따라붙는다 — 요리사·아큐버스는 예전처럼 먼저 다가온다
    if (tl.cool <= 0 && d < (tl.kind === 'admire' ? 6 : 11) && !this.dead) { tl.t = tl.kind === 'admire' ? 60 + Math.random() * 60 : 18 + Math.random() * 24; tl.rep++; this.bubble(w, lines[Math.floor(Math.random() * lines.length)]); return true; }
    if (tl.kind === 'admire' && !moving && Math.hypot(w.x - w.home[0] - 0.5, w.y - w.home[1] - 0.5) > 1.5 && Math.random() < dt * 0.5) { const path = findPath(this.zone, Math.floor(w.x), Math.floor(w.y), w.home[0], w.home[1]); if (path) w.path = path; return true; }
    if (tl.kind === 'admire') return !moving; // 제자리에서 기다린다 (아무 데나 돌아다니지 않는다)
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
    if (!e && this.zone.heavenGen) {
      // 35차: 구름섬 둘레는 하늘 — 하늘 그림만 깐다 (가장자리 구름은 바닥 그림에 있다)
      const sky = new Sprite(terraceSkyTexture());
      sky.width = this.app.screen.width; sky.height = this.app.screen.height;
      (sky as Sprite & { bg?: boolean }).bg = true;
      this.root.addChildAt(sky, 0);
      this.terraceSky = sky;
      return;
    }
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
    if (z.beyond) return; // 32차: 지도 밖까지 도시를 그리니 가장자리 연무 벽은 걷는다 (바탕 스모그빛은 아직 안 그린 곳 몫)
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
    // 47차: 염소는 주인공의 집(서울 옛집 · 산 집) 앞에서도 나타난다 — 문 앞을 서성인다
    const home = this.zone.buildings.find((b) => b.cat === 'home' || (b.cat === 'estate' && (b as { pois?: { t: string }[] }).pois?.[0]?.t === 'ownedhome'));
    const hf = home && Math.random() < 0.35 ? this.frontOf(home) : null;
    const spot = hf ? randomWalkTileNear(this.zone, hf[0], hf[1], 3, ['walk', 'soi', 'park', 'lot', 'cross']) ?? hf : randomWalkTileNear(this.zone, Math.floor(p0.x), Math.floor(p0.y), 40, ['walk', 'soi', 'park']);
    if (!spot || (!hf && Math.hypot(spot[0] - p0.x, spot[1] - p0.y) < 12)) return;
    const w = this.makeWalker(this.npcLook('passer'), spot[0], spot[1], 'goat');
    w.dressId = -1; // 사람 옷을 입히지 않는다
    w.cs = goatCharSet();
    w.maxHp = w.hp = 320;
    w.speed = 0.85;
    w.size = 1.35;
    w.home = [spot[0], spot[1]];
    this.walkers.push(w);
  }
  /**
   * 48차 들개 무리: 골목 끝 · 공터 · 큰길 뒤편을 셋에서 다섯이 떼 지어 돈다 (밤에는 더 사납다).
   * 하나가 나를 보거나 맞으면 무리 전체가 덤빈다. 다치면 깨갱 달아나고, 둘 이하로 줄면 남은 것도 달아난다. 나보다 조금 느려 도망칠 수는 있다
   */
  private dogT = -1;
  private packN = 0;
  private spawnDogs() {
    const p0 = this.player;
    let spot: [number, number] | null = null;
    for (let n = 0; n < 30 && !spot; n++) {
      const s0 = randomWalkTileNear(this.zone, Math.floor(p0.x), Math.floor(p0.y), 45, ['soi', 'lot', 'park', 'walk']);
      if (s0 && Math.hypot(s0[0] - p0.x, s0[1] - p0.y) > 16 && !this.inSafe(s0[0], s0[1])) spot = s0;
    }
    if (!spot) { this.dogT = 60; return; }
    const id = ++this.packN, n = 3 + Math.floor(Math.random() * 3);
    for (let k = 0; k < n; k++) {
      const at = randomWalkTileNear(this.zone, spot[0], spot[1], 2, ['soi', 'lot', 'park', 'walk', 'cross']) ?? spot;
      const w = this.makeWalker(this.npcLook('passer'), at[0], at[1], 'dog');
      w.dressId = -1;
      w.cs = dogCharSet(Math.floor(Math.random() * 4) as DogCoat);
      w.maxHp = w.hp = 130 + Math.floor(Math.random() * 40);
      w.speed = 0.9;
      w.size = 1.2;
      w.home = [spot[0], spot[1]];
      w.dogPack = id;
      w.wait = Math.random() * 3;
      this.walkers.push(w);
    }
  }
  private packOf(w: Walker) { return this.walkers.filter((x) => x.kind === 'dog' && x.dogPack === w.dogPack && x.down <= 0); }
  private thinkDog(w: Walker, moving: boolean, dt: number) {
    const p = this.player;
    const d = Math.hypot(p.x - w.x, p.y - w.y);
    const L = t();
    if (w.flee > 0) {
      if (d > 15 || w.flee < 0.3) { this.removeWalker(w); if (!this.walkers.some((x) => x.kind === 'dog' && x.down <= 0)) this.dogT = 150 + Math.random() * 120; return; }
      if (!w.path.length) { const ax = w.x + (w.x - p.x) * 3, ay = w.y + (w.y - p.y) * 3; const to = this.nearestWalkable(Math.floor(ax), Math.floor(ay)); if (to) w.path = findPath(this.zone, Math.floor(w.x), Math.floor(w.y), to[0], to[1]) ?? []; }
      w.flee = Math.max(0.31, w.flee - dt);
      return;
    }
    if (w.target) {
      // 무리가 둘 이하로 줄면 꼬리를 말고 달아난다
      if (this.packOf(w).length <= 2 && Math.random() < dt * 0.6) { w.flee = 9; w.target = null; w.path = []; this.bubble(w, L.dogYelp[Math.floor(Math.random() * L.dogYelp.length)]); }
      else if (!w.bubble && Math.random() < dt * 0.25) this.bubble(w, L.dogBark[Math.floor(Math.random() * L.dogBark.length)]);
      return;
    }
    const hidden = this.dead || this.invisible || !!this.zone.interior || !!this.working?.on;
    const notice = this.night === 1 ? 8 : 6;
    if (!hidden && d < notice && !this.inSafe(p.x, p.y) && Math.random() < dt * (this.night === 1 ? 2 : 1.1)) {
      for (const x of this.packOf(w)) { x.target = p; x.repathT = 0; x.firstBy ??= x; }
      this.bubble(w, L.dogGrowl[Math.floor(Math.random() * L.dogGrowl.length)]);
      return;
    }
    // 무리 지어 어슬렁 — 우두머리(가장 먼저 난 것)를 느슨하게 따라간다
    w.wait -= dt;
    if (!moving && w.wait <= 0) {
      const lead = this.packOf(w)[0];
      const c = lead && lead !== w ? [Math.floor(lead.x), Math.floor(lead.y)] : w.home;
      const to = randomWalkTileNear(this.zone, c[0], c[1], lead && lead !== w ? 2 : 9);
      if (to) w.path = findPath(this.zone, Math.floor(w.x), Math.floor(w.y), to[0], to[1]) ?? [];
      w.wait = 1.5 + Math.random() * 3.5;
      if (lead === w && Math.random() < 0.3) w.home = [to?.[0] ?? w.home[0], to?.[1] ?? w.home[1]];
    }
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
  // ── 31차 필드 보스 ──
  private fbWarns: { g: Graphics; t: number; dur: number; fire: () => void }[] = [];
  /** 구역이 열릴 때 main이 정해 준 보스를 세운다 (자리·체력이 있으면 그대로 — 떠났다 와도 남아 있다) */
  /**
   * 31차 염소대왕 (지옥 142층 · 자기 방의 판관석 뒤에 앉아 있다): 사용자 그림을 따라 찍은 도트 — 판관 모자 · 숫양 뿔 · 붉은 눈 ·
   * 검붉은 관복 · 깍지 낀 손. 앉은 윗몸만 있고 아랫몸은 판관석이 가린다. 관리자 칸 sprite-goat-king에 그림을 올리면 그것으로
   */
  /** 33차 염소대왕의 방: 숨쉬기 · 눈 깜빡임 · 눈빛 · 화로 불꽃 */
  /** 34차: 칼드렉의 대장간 굴뚝에서 솟는 붉은 불꽃 (혀 · 빛무리 · 날리는 불티) */
  private chimFx: { g: Graphics; glow: Sprite; x: number; y: number; sparks: { x: number; y: number; vx: number; vy: number; life: number }[] } | null = null;
  /** 43차 마리의 공방: 진열창 인형 몇은 살아 있는 사람처럼 눈을 굴린다 — 가까이 오면 나를 따라 본다 */
  private dollEyes: { g: Graphics; eyes: { x: number; y: number; o: number; next: number; blink: number }[] } | null = null;
  private setupDollEyes() {
    const b = this.zone.buildings.find((x) => x.hk === 'puppetshop');
    if (!b) return;
    const g = new Graphics(); g.zIndex = b.i0 + b.w + b.j0 + b.d + 0.6; g.eventMode = 'none';
    this.objects.addChild(g);
    const eyes = puppetEyes(b).map(([i, j, z]) => { const [x, y0] = iso(i, j); return { x: Math.round(x), y: Math.round(y0 - z - 1), o: 0, next: Math.random() * 3, blink: 0 }; });
    this.dollEyes = { g, eyes };
  }
  private updateDollEyes(dt: number) {
    const fx = this.dollEyes;
    if (!fx || fx.g.destroyed) { this.dollEyes = null; return; }
    const [px] = iso(this.player.x, this.player.y);
    const near = this.zone.buildings.some((b) => b.hk === 'puppetshop' && Math.hypot(this.player.x - (b.i0 + b.w / 2), this.player.y - (b.j0 + b.d)) < 7);
    const g = fx.g;
    g.clear();
    for (const e of fx.eyes) {
      e.next -= dt; e.blink -= dt;
      if (e.next <= 0) { e.o = near ? Math.sign(px - e.x) : [-1, 0, 1][Math.floor(Math.random() * 3)]; e.next = near ? 0.4 + Math.random() * 0.8 : 1.5 + Math.random() * 4; if (Math.random() < 0.12) e.blink = 0.14; }
      g.rect(e.x - 2, e.y, 5, 1).fill(e.blink > 0 ? 0xe6ded2 : 0xf2eee6);
      if (e.blink > 0) continue;
      g.rect(e.x - 1 + e.o, e.y, 1, 1).fill(0x141014);
      g.rect(e.x + 1 + e.o, e.y, 1, 1).fill(0x141014);
    }
  }
  // ───── 46차 아큐버스 데이트: 연인으로 정한 아큐버스가 곁에 있을 때 데이트 장소(분수 · 대관람차 · 회전목마 · 풀사이드 바 · 동물원)에 2초 머물면 한 장면 (장소마다 하루 한 번) ─────
  private dateSpots: { i: number; j: number; key: string }[] | null = null;
  private dateT = 0; private dateHold = 0; private dateAt = '';
  private updateDates(dt: number) {
    if (this.realm !== 'heaven' || !this.zone.heavenGen || this.zone.interior || this.accMode !== 'lover' || this.riding) return;
    this.dateT -= dt; if (this.dateT > 0) return; this.dateT = 0.5;
    const acc = this.walkers.find((w) => w.tail?.kind === 'accubus' && w.tail.t > 0);
    const p = this.player;
    if (!acc || Math.hypot(acc.x - p.x, acc.y - p.y) > 4) { this.dateHold = 0; return; }
    if (!this.dateSpots) {
      const ds: { i: number; j: number; key: string }[] = [];
      for (const q of this.zone.props) if (q.kind === 'fountain' && !ds.some((d) => d.key === 'fountain' && Math.hypot(d.i - q.i, d.j - q.j) < 8)) ds.push({ i: q.i + 0.5, j: q.j + 0.5, key: 'fountain' });
      this.zone.buildings.forEach((b) => {
        const att = (b as { att?: string }).att, f = this.frontOf(b);
        if (!f) return;
        if (b.cat === 'attraction' && (att === 'ferris' || att === 'carousel')) ds.push({ i: f[0] + 0.5, j: f[1] + 0.5, key: att });
        else if (mainPoi(b)?.t === 'bar') ds.push({ i: f[0] + 0.5, j: f[1] + 0.5, key: 'bar' });
      });
      for (const [a, b] of ZOO_PENS) ds.push({ i: a + 2.5, j: b + 7.5, key: 'zoo' });
      this.dateSpots = ds;
    }
    const near = this.dateSpots.find((d) => Math.hypot(d.i - p.x, d.j - p.y) < (d.key === 'fountain' ? 3.2 : 2.6));
    if (!near) { this.dateHold = 0; this.dateAt = ''; return; }
    if (this.dateAt !== near.key) { this.dateAt = near.key; this.dateHold = 0; }
    this.dateHold += 0.5;
    if (this.dateHold >= 2) { this.dateHold = -1e9; this.hooks.accDate(near.key, acc.x, acc.y); }
  }
  /** 데이트 장면의 말 (아큐버스 → 나) · 둘 사이에 떠오르는 하트 */
  dateScene(lines: [string, string]) {
    const acc = this.walkers.find((w) => w.tail?.kind === 'accubus');
    if (acc) { acc.dir = dirFromTile(this.player.x - acc.x, this.player.y - acc.y, acc.dir); this.bubble(acc, lines[0]); }
    window.setTimeout(() => { if (!this.player.sprite.destroyed) this.bubble(this.player, lines[1]); }, 2600);
    const [hx, hy] = iso((this.player.x + (acc?.x ?? this.player.x)) / 2, (this.player.y + (acc?.y ?? this.player.y)) / 2);
    for (let k = 0; k < 7; k++) {
      const h = new Text({ text: '♥', style: { fontFamily: 'system-ui, sans-serif', fontSize: 11 + Math.random() * 6, fill: k % 2 ? '#ff7aa8' : '#ffb8d0', fontWeight: '800' } });
      h.anchor.set(0.5); h.position.set(hx + (Math.random() - 0.5) * 30, hy - 40); h.zIndex = 9e5; h.eventMode = 'none';
      this.objects.addChild(h);
      const t0 = performance.now() + k * 160, vx = (Math.random() - 0.5) * 14;
      const tick = () => { if (h.destroyed) return; const q = (performance.now() - t0) / 1800; if (q < 0) { h.alpha = 0; requestAnimationFrame(tick); return; } if (q >= 1) { h.destroy(); return; } h.alpha = 1 - q; h.y = hy - 40 - q * 40; h.x += vx * 0.016; requestAnimationFrame(tick); };
      requestAnimationFrame(tick);
    }
  }
  // ───── 47차 홍보 말풍선: 소개 글이 캐릭터 머리 위에 떠 있다 (나 · 다른 사람). 누르면 그 사람의 프로필 ─────
  private promos = new Map<Walker, { o: Container; text: string; user: string }>();
  private myPromo: { text: string; user: string } | null = null;
  setMyPromo(text: string | null, user: string) {
    const cur = this.myPromo;
    if ((cur?.text ?? null) === text && (cur?.user ?? '') === user) return;
    this.myPromo = text ? { text, user } : null;
  }
  private promoTag(text: string) {
    const o = new Container(); o.eventMode = 'none'; o.zIndex = 9e5 - 2;
    const tx = new Text({ text, style: { fontFamily: 'system-ui, sans-serif', fontSize: 10, fontWeight: '600', fill: '#2a2216', wordWrap: true, wordWrapWidth: 140, breakWords: true, lineHeight: 13 } });
    tx.anchor.set(0.5, 1);
    const w = Math.min(152, Math.ceil(tx.width) + 14), h = Math.ceil(tx.height) + 8;
    const g = new Graphics();
    g.roundRect(-w / 2, -h, w, h, 7).fill({ color: 0xfffbf0, alpha: 0.95 }).stroke({ color: 0xe0b437, width: 1.5 });
    g.poly([-5, 0, 5, 0, 0, 7]).fill(0xfffbf0);
    tx.position.set(0, -4);
    o.addChild(g, tx);
    return o;
  }
  private updatePromos() {
    const want = new Map<Walker, { text: string; user: string }>();
    if (this.myPromo && !this.dead && !this.invisible) want.set(this.player, this.myPromo);
    for (const w of this.walkers) if (w.kind === 'remote' && w.rinfo?.promo && w.down <= 0 && !w.rinfo.hidden) want.set(w, { text: w.rinfo.promo, user: w.rinfo.name });
    for (const [w, pr] of this.promos) { const n = want.get(w); if (!n || n.text !== pr.text || w.sprite.destroyed) { pr.o.destroy({ children: true }); this.promos.delete(w); } }
    for (const [w, n] of want) {
      let pr = this.promos.get(w);
      if (!pr) { pr = { o: this.promoTag(n.text), text: n.text, user: n.user }; this.objects.addChild(pr.o); this.promos.set(w, pr); }
      pr.o.position.set(Math.round(w.sprite.x), Math.round(w.sprite.y - 74 * BODY_K - (w.bubble ? 30 : 0)));
      pr.o.visible = w.sprite.visible;
    }
  }
  /** 화면 좌표의 홍보 말풍선 (누른 곳) */
  private promoAt(gx: number, gy: number): string | null {
    for (const pr of this.promos.values()) { if (!pr.o.visible) continue; const b = pr.o.getBounds(); if (gx >= b.x - 4 && gx <= b.x + b.width + 4 && gy >= b.y - 4 && gy <= b.y + b.height + 8) return pr.user; }
    return null;
  }
  // ───── 47차 천국의 닭 한 마리: 걷다 서서 모이를 쪼고, 가끔 푸드덕 ─────
  private chicken: { s: Sprite; x: number; y: number; tx: number; ty: number; wait: number; peck: number; tex: Texture[] } | null = null;
  private makeChicken(i: number, j: number) {
    const tex = [0, 1].map((v) => { const pp = streetProp('chicken', v, 0); const tx = Texture.from(pp.canvas); tx.source.scaleMode = 'nearest'; return tx; });
    const pp = streetProp('chicken', 0, 0);
    const s = new Sprite(tex[0]); s.anchor.set(pp.ax, pp.ay); s.eventMode = 'none';
    this.objects.addChild(s);
    this.chicken = { s, x: i + 0.5, y: j + 0.5, tx: i + 0.5, ty: j + 0.5, wait: 1, peck: 0, tex };
  }
  private updateChicken(dt: number) {
    const c = this.chicken; if (!c || c.s.destroyed) return;
    const dx = c.tx - c.x, dy = c.ty - c.y, d = Math.hypot(dx, dy);
    let hop = 0;
    if (d < 0.05) {
      c.wait -= dt;
      c.peck += dt;
      c.s.texture = c.tex[Math.floor(c.peck * 3) % 2]; // 쪼기
      if (c.wait <= 0) {
        for (let k = 0; k < 8; k++) { const ti = Math.floor(c.x + (Math.random() - 0.5) * 10), tj = Math.floor(c.y + (Math.random() - 0.5) * 10); if (walkable(this.zone, ti, tj)) { c.tx = ti + 0.5; c.ty = tj + 0.5; break; } }
        c.wait = 2 + Math.random() * 5;
      }
    } else {
      const st = Math.min(d, (d > 3 ? 1.1 : 0.7) * dt);
      c.x += (dx / d) * st; c.y += (dy / d) * st;
      c.s.texture = c.tex[0]; c.peck = 0;
      hop = Math.abs(Math.sin(this.time * 14)) * 1.5;
      const sdx = dx - dy; if (Math.abs(sdx) > 0.02) c.s.scale.x = sdx > 0 ? 1 : -1;
    }
    const [x, y] = iso(c.x, c.y);
    c.s.position.set(x, y - hop);
    c.s.zIndex = c.x + c.y + 0.49;
  }
  // ───── 46차 천국 동물원: 우리 안을 천천히 걷다 서다 한다 (가는 쪽을 바라본다 · 걸을 때 살짝 들썩) ─────
  private zooAnimals: { s: Sprite; x: number; y: number; tx: number; ty: number; wait: number; pen: [number, number]; sp: number; ph: number }[] = [];
  private updateZoo(dt: number) {
    for (const a of this.zooAnimals) {
      if (a.s.destroyed) continue;
      const dx = a.tx - a.x, dy = a.ty - a.y, d = Math.hypot(dx, dy);
      let walking = false;
      if (d < 0.05) {
        a.wait -= dt;
        if (a.wait <= 0) { a.tx = a.pen[0] + 1.4 + Math.random() * 3.2; a.ty = a.pen[1] + 1.4 + Math.random() * 4.2; a.wait = 2 + Math.random() * 6; }
      } else {
        const st = Math.min(d, a.sp * dt);
        a.x += (dx / d) * st; a.y += (dy / d) * st; walking = true;
        const sdx = dx - dy; if (Math.abs(sdx) > 0.02) a.s.scale.x = sdx > 0 ? 1 : -1; // 화면에서 오른쪽으로 가면 오른쪽을 본다
      }
      const [x, y] = iso(a.x, a.y);
      a.ph += dt * (walking ? 9 : 0);
      a.s.position.set(x, y - (walking ? Math.abs(Math.sin(a.ph)) * 1.5 : 0));
      a.s.zIndex = a.x + a.y + 0.49;
    }
  }
  // ───── 46차: 모닥불 · 화톳불 · 대장간 화덕의 불꽃이 살아 움직인다 (불 혀 · 불티) ─────
  private liveFires: { g: Graphics; x: number; y: number; hw: number; base: number; top: number; n: number; seed: number; sparks: { x: number; y: number; vx: number; vy: number; life: number }[] }[] = [];
  private addFire(x: number, y: number, kind: string, z: number) {
    const spec = kind === 'bonfire' ? { hw: 15, base: 7, top: 50, n: 9 } : kind === 'campfire' ? { hw: 5.5, base: 4, top: 16, n: 5 } : kind === 'anvil' ? { hw: 3.6, base: 5, top: 12, n: 4 } : { hw: 6.5, base: 40, top: 51, n: 6 };
    if (kind === 'anvil') x += 11; // 모루 옆 숯불 화로
    const g = new Graphics(); g.blendMode = 'add'; g.zIndex = z; g.eventMode = 'none';
    this.objects.addChild(g);
    this.liveFires.push({ g, x, y, ...spec, seed: Math.random() * 10, sparks: [] });
  }
  private updateFires(dt: number) {
    if (!this.liveFires.length) return;
    const t0 = this.time;
    const vx0 = -this.camera.x / this.zoom, vy0 = -this.camera.y / this.zoom, vw = this.app.screen.width / this.zoom, vh = this.app.screen.height / this.zoom;
    for (const f of this.liveFires) {
      if (f.g.destroyed) continue;
      const g = f.g;
      g.clear();
      if (f.x < vx0 - 60 || f.x > vx0 + vw + 60 || f.y < vy0 - 80 || f.y > vy0 + vh + 80) { f.sparks.length = 0; continue; } // 화면 밖은 쉰다
      const H = f.top - f.base, s0 = f.seed;
      for (let n = 0; n < f.n; n++) {
        const u = f.n === 1 ? 0 : n / (f.n - 1) * 2 - 1, dx = u * f.hw;
        const edge = 1 - u * u * 0.65;
        const hh = H * edge * (0.5 + 0.5 * Math.abs(Math.sin(t0 * (4.2 + n * 0.63) + n * 1.7 + s0)));
        const sway = Math.sin(t0 * (5.1 + n * 0.4) + n + s0) * f.hw * 0.18;
        const wd = Math.max(1.4, f.hw * 0.42 * edge);
        const col = Math.abs(u) < 0.25 ? 0xffb43a : Math.abs(u) < 0.6 ? 0xff6a1a : 0xd8321a;
        const bx = f.x + dx, by = f.y - f.base;
        g.moveTo(bx - wd, by).quadraticCurveTo(bx - wd * 0.6 + sway * 0.5, by - hh * 0.55, bx + sway, by - hh).quadraticCurveTo(bx + wd * 0.6 + sway * 0.5, by - hh * 0.55, bx + wd, by).closePath().fill({ color: col, alpha: 0.55 });
        if (Math.abs(u) < 0.5) g.moveTo(bx - wd * 0.45, by).quadraticCurveTo(bx + sway * 0.4, by - hh * 0.5, bx + sway * 0.7, by - hh * 0.7).quadraticCurveTo(bx + sway * 0.3, by - hh * 0.3, bx + wd * 0.45, by).closePath().fill({ color: 0xfff0b0, alpha: 0.5 });
      }
      if (Math.random() < dt * (f.n + 2)) f.sparks.push({ x: f.x + (Math.random() - 0.5) * f.hw * 1.4, y: f.y - f.base - H * 0.5, vx: (Math.random() - 0.5) * 12, vy: -30 - Math.random() * 35, life: 0.7 + Math.random() * 0.8 });
      f.sparks = f.sparks.filter((p) => (p.life -= dt) > 0);
      for (const p of f.sparks) { p.x += p.vx * dt + Math.sin(t0 * 7 + p.y) * 0.3; p.y += p.vy * dt; g.rect(Math.round(p.x), Math.round(p.y), 1.5, 1.5).fill({ color: p.life > 0.5 ? 0xffd26a : 0xff5a1a, alpha: Math.min(1, p.life * 1.6) }); }
    }
  }
  private setupChimney() {
    const b = this.zone.buildings.find((x) => x.hk === 'smithy');
    if (!b) return;
    const [ci, cj, cz] = smithyChimney(b);
    const [x, y0] = iso(ci, cj);
    const y = y0 - cz;
    const z = b.i0 + b.w + b.j0 + b.d + 0.6;
    const g = new Graphics(); g.blendMode = 'add'; g.zIndex = z; g.eventMode = 'none';
    const glow = new Sprite(this.glowTex()); glow.anchor.set(0.5); glow.tint = 0xff3a1a; glow.blendMode = 'add'; glow.position.set(x, y - 16); glow.zIndex = z - 0.01; glow.eventMode = 'none';
    this.objects.addChild(glow, g);
    this.chimFx = { g, glow, x, y, sparks: [] };
  }
  private updateChimney(dt: number) {
    const fx = this.chimFx;
    if (!fx || fx.g.destroyed) { this.chimFx = null; return; }
    const t0 = this.time, g = fx.g;
    const fl = 0.75 + 0.25 * Math.sin(t0 * 8.3) * Math.sin(t0 * 4.1 + 1);
    fx.glow.alpha = 0.45 + 0.3 * fl; fx.glow.scale.set(1.1 + 0.2 * fl, 1.4 + 0.3 * fl);
    g.clear();
    // 불꽃 혀: 붉은 것이 길게, 가운데는 누런 심지
    for (let n = 0; n < 7; n++) {
      const dx = -9 + n * 3, hh = 22 + 20 * Math.abs(Math.sin(t0 * (4.5 + n * 0.7) + n * 1.9)) + (n === 3 ? 14 : 0);
      const col = n === 3 ? 0xff8a2a : n % 2 ? 0xff3a1a : 0xc81e10;
      g.moveTo(fx.x + dx - 3.5, fx.y).quadraticCurveTo(fx.x + dx - 3 + Math.sin(t0 * 6 + n) * 3, fx.y - hh * 0.55, fx.x + dx + Math.sin(t0 * 4 + n * 2) * 4, fx.y - hh).quadraticCurveTo(fx.x + dx + 3, fx.y - hh * 0.45, fx.x + dx + 3.5, fx.y).fill({ color: col, alpha: 0.6 });
    }
    // 불티: 위로 날아오르다 사그라진다
    if (Math.random() < dt * 9) fx.sparks.push({ x: fx.x + (Math.random() - 0.5) * 10, y: fx.y - 10, vx: (Math.random() - 0.3) * 14, vy: -40 - Math.random() * 40, life: 1 + Math.random() * 0.8 });
    fx.sparks = fx.sparks.filter((p) => (p.life -= dt) > 0);
    for (const p of fx.sparks) { p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 8 * dt; g.rect(Math.round(p.x), Math.round(p.y), 2, 2).fill({ color: p.life > 0.6 ? 0xffd26a : 0xff5a1a, alpha: Math.min(1, p.life) }); }
  }
  private gkFx: { king: Walker; eyes: Sprite[]; blinkT: number; blinkOn: number; breathIn: boolean; fires: { g: Graphics; glow: Sprite; pool: Sprite; x: number; y: number; seed: number }[] } | null = null;
  private setupGoatFx(king: Walker) {
    const eyes = [-1, 1].map(() => { const e = new Sprite(this.glowTex()); e.anchor.set(0.5); e.tint = 0xff3a22; e.blendMode = 'add'; e.scale.set(0.22, 0.14); e.eventMode = 'none'; this.objects.addChild(e); return e; });
    const fires: NonNullable<typeof this.gkFx>['fires'] = [];
    for (const f of this.zone.interior?.furn ?? []) {
      if (f.kind !== 'gkbrazier') continue;
      const [x, y0] = iso(f.i + 0.5, f.j + 0.5);
      const y = y0 - (f.h - 6);
      const g = new Graphics(); g.blendMode = 'add'; g.zIndex = f.i + f.j + 1.2; g.eventMode = 'none';
      const glow = new Sprite(this.glowTex()); glow.anchor.set(0.5); glow.tint = 0xff6a2a; glow.blendMode = 'add'; glow.position.set(x, y - 14); glow.zIndex = f.i + f.j + 1.1; glow.eventMode = 'none';
      const pool = new Sprite(this.glowTex()); pool.anchor.set(0.5); pool.tint = 0xff4a1a; pool.blendMode = 'add'; pool.position.set(x, y0 + 4); pool.zIndex = -50; pool.eventMode = 'none';
      this.objects.addChild(pool, glow, g);
      fires.push({ g, glow, pool, x, y, seed: f.i * 3 + f.j });
    }
    this.gkFx = { king, eyes, blinkT: 3 + Math.random() * 3, blinkOn: 0, breathIn: false, fires };
  }
  private updateGoatFx(dt: number) {
    const fx = this.gkFx;
    if (!fx) return;
    const k = fx.king, t0 = this.time;
    if (k.sprite.destroyed) { this.gkFx = null; return; }
    // 숨: 천천히 들이쉬고 내쉰다 (넘나드는 자리에서 떨리지 않게 문턱을 둘로)
    const br = Math.sin(t0 * 0.9);
    if (br > 0.25) fx.breathIn = true; else if (br < -0.25) fx.breathIn = false;
    // 깜빡임: 몇 초에 한 번, 아주 잠깐
    fx.blinkT -= dt;
    if (fx.blinkT <= 0) { fx.blinkOn = 0.14; fx.blinkT = 3.5 + Math.random() * 4.5; if (Math.random() < 0.25) fx.blinkT = 0.3; }
    if (fx.blinkOn > 0) fx.blinkOn -= dt;
    const blink = fx.blinkOn > 0;
    if (gkAnim && k.cs?.frames.size) k.sprite.texture = gkAnim[(fx.breathIn ? 1 : 0) + (blink ? 2 : 0)];
    // 붉은 눈빛 (기본 그림일 때만 — 관리자 그림은 눈 자리를 모른다)
    const [sx, sy] = iso(k.x, k.y);
    fx.eyes.forEach((e, n) => {
      e.visible = !!gkAnim && !blink && k.sprite.visible;
      e.position.set(sx + (n ? 10.3 : -10.3), sy - GK_LIFT - 227 - (fx.breathIn ? 1 : 0));
      e.alpha = 0.4 + 0.22 * Math.sin(t0 * 3.3 + n) + 0.12 * Math.sin(t0 * 11.7 + n * 2);
      e.zIndex = k.sprite.zIndex + 0.01;
    });
    // 화로: 일렁이는 불꽃 혀 · 빛무리 · 바닥의 붉은 빛
    for (const f of fx.fires) {
      const fl = 0.8 + 0.2 * Math.sin(t0 * 9.1 + f.seed) * Math.sin(t0 * 5.3 + f.seed * 2);
      f.glow.alpha = 0.35 + 0.25 * fl; f.glow.scale.set(0.9 + 0.15 * fl, 0.8 + 0.15 * fl);
      f.pool.alpha = 0.16 + 0.1 * fl; f.pool.scale.set(2.6 + 0.3 * fl, 1.2 + 0.15 * fl);
      const g = f.g; g.clear();
      for (let n = 0; n < 5; n++) {
        const dx = -7 + n * 3.5, hh = 10 + 9 * Math.abs(Math.sin(t0 * (6 + n) + f.seed + n * 1.7)) + (n === 2 ? 6 : 0);
        const col = n === 2 ? 0xffc04a : n % 2 ? 0xff5a2a : 0xd8301e;
        g.moveTo(f.x + dx - 3, f.y).quadraticCurveTo(f.x + dx - 2 + Math.sin(t0 * 7 + n) * 2, f.y - hh * 0.6, f.x + dx + Math.sin(t0 * 5 + n) * 2.5, f.y - hh).quadraticCurveTo(f.x + dx + 2, f.y - hh * 0.5, f.x + dx + 3, f.y).fill({ color: col, alpha: 0.55 });
      }
    }
  }
  private placeGoatKing(i: number, j: number) {
    const w = this.makeWalker(this.npcLook('passer'), i, j, 'goatking');
    w.dressId = -1; // 사람 옷을 입히지 않는다
    w.maxHp = w.hp = 99999;
    w.speed = 0; w.wait = 1e9; w.dir = 'sw';
    w.size = 1; // 32차: 그림 자체가 열두 길 거인 (옥좌에 앉아 사람 다섯 길)
    w.x += 0.5; w.y += 0.5; // 단 한가운데보다 조금 앞으로 (옥좌 등받이가 모서리 벽에 닿게)
    this.walkers.push(w);
    void goatKingSet().then((cs) => { if (cs && !w.sprite.destroyed) w.cs = cs; });
    return w;
  }
  /** 33차 환전상 오볼로: 붉은 피부 · 검붉은 두건 로브 · 박쥐 날개 · 뿔 · 끝이 세모난 꼬리. 환전 탁자 뒤에 선다 (싸우지 않는다) */
  private placeChanger(i: number, j: number) {
    // 43차: 환전상 오볼로 전용 3D 몸 (붉은 살 · 검은 로브 금 테두리 · 외알 안경 · 접힌 박쥐 날개 · 꼬리를 몸에 함께) — 서 있으면 가끔 동전을 센다
    const w = this.makeWalker(OBOLO_LOOK, i, j, 'changer');
    w.maxHp = w.hp = 99999;
    w.speed = 0; w.wait = 1e9; w.dir = 'sw';
    this.walkers.push(w);
    return w;
  }
  private thinkChanger(w: Walker, dt: number) {
    const p = this.player, d = Math.hypot(p.x - w.x, p.y - w.y);
    w.target = null; w.path = [];
    if (d < 6) w.dir = p.x - w.x >= p.y - w.y ? 'se' : 'sw';
    if (d < 9 && !w.bubble && Math.random() < dt * 0.05) { const c = t().xchIdle; this.bubble(w, c[Math.floor(Math.random() * c.length)]); }
  }
  private thinkGoatKing(w: Walker, dt: number) {
    const p = this.player, d = Math.hypot(p.x - w.x, p.y - w.y);
    w.target = null; w.path = [];
    if (d < 8 && !w.bubble && Math.random() < dt * 0.03) { const c = t().gkIdle; this.bubble(w, c[Math.floor(Math.random() * c.length)]); }
  }
  private spawnFieldBosses() {
    for (const sp of this.hooks.fieldBoss(this.zone.id)) {
      const def = FB[sp.key];
      if (!def || this.walkers.some((w) => w.fb === sp.key)) continue;
      let at: [number, number] | null = sp.i !== undefined && sp.j !== undefined && walkable(this.zone, sp.i, sp.j) ? [sp.i, sp.j] : null;
      if (!at) at = this.fieldBossSpot(sp.key);
      if (!at) continue;
      let w: Walker;
      if (this.zone.hell) {
        w = this.makeMonster(MONSTERS[sp.key], at[0], at[1]);
      } else if (sp.key === 'mafiaboss') {
        // 흰 정장 · 금빛 넥타이 · 검은 안경 — 마피아 정장 몸을 크게
        w = this.makeWalker({ sex: 'm', build: 2, skin: 1, hair: 5, hairColor: 0, top: 0, bottom: 0, outfit: 'mafia', cols: { 3: '#ecebe6', 9: '#ecebe6', 4: '#e8e6e0', 7: '#d8b040', 5: '#3a2a1a', 2: '#141010' } }, at[0], at[1], 'thug', 'pistol');
        w.gang = 'mafia';
      } else {
        w = this.makeWalker({ sex: 'm', build: 1, skin: 0, hair: 0, hairColor: 0, top: 0, bottom: 0, outfit: 'suturer' as Look['outfit'] }, at[0], at[1], 'thug', 'needle');
        w.monster = true;
      }
      w.fb = sp.key;
      w.size = def.size;
      w.maxHp = def.hp;
      w.hp = Math.max(1, Math.min(def.hp, sp.hp ?? def.hp));
      w.home = [at[0], at[1]];
      w.fbT = 4 + Math.random() * 3;
      w.wait = 2;
      this.walkers.push(w);
      this.hooks.fbossAt(sp.key, at[0], at[1], Math.round(w.hp));
    }
  }
  /** 자리: 지옥은 날마다 다른 들판 (휴식처에서 먼 곳), 수쿰빗은 내게서 조금 떨어진 길 */
  private fieldBossSpot(key: string): [number, number] | null {
    const h = this.zone.hell;
    if (h) {
      const field = h.spawns.filter(([i, j]) => !this.nearRest(i + 0.5, j + 0.5, 12) && this.regionAt(i, j) === 0); // 44차: 필드 보스는 마을과 같은 들판에만
      if (!field.length) return null;
      const day = Math.floor(Date.now() / 86400000);
      return field[(day * 7 + h.floor * 13 + key.length) % field.length];
    }
    const p = this.player;
    for (let k = 0; k < 60; k++) {
      const t0 = randomWalkTileNear(this.zone, Math.floor(p.x), Math.floor(p.y), 26, ['walk', 'soi', 'lot', 'park']);
      if (t0 && Math.hypot(t0[0] - p.x, t0[1] - p.y) > 12) return t0;
    }
    return randomWalkTileNear(this.zone, Math.floor(p.x), Math.floor(p.y), 30, ['walk', 'soi', 'lot', 'park']);
  }
  /** 먼저 덤비지 않는 보스는 제자리 둘레를 거닌다. 맞으면 싸운다. 휴식처에는 따라 들어가지 않는다 */
  private thinkFieldBoss(w: Walker, moving: boolean, dt: number): boolean {
    const def = FB[w.fb!];
    const p = this.player;
    if (w.target && (this.inRest(p.x, p.y) || Math.hypot(w.x - w.home[0], w.y - w.home[1]) > 18 || this.dead)) {
      w.target = null;
      const path = findPath(this.zone, Math.floor(w.x), Math.floor(w.y), w.home[0], w.home[1]);
      w.path = path ?? [];
      return true;
    }
    if (!def.passive || w.target) return false;
    if (moving) return true;
    w.wait -= dt;
    if (w.wait > 0) return true;
    w.wait = 3 + Math.random() * 5;
    const spot = randomWalkTileNear(this.zone, w.home[0], w.home[1], 3, ['walk', 'soi', 'lot', 'park']);
    if (spot) { const path = findPath(this.zone, Math.floor(w.x), Math.floor(w.y), spot[0], spot[1]); if (path) w.path = path; }
    return true;
  }
  /** 큰 공격은 땅의 붉은 표식으로 먼저 알린다 (1초 남짓) */
  private fbMark(draw: (g: Graphics) => void, dur: number, fire: () => void) {
    const g = new Graphics();
    draw(g);
    g.zIndex = -1e6;
    g.alpha = 0.15;
    this.objects.addChild(g);
    this.fbWarns.push({ g, t: 0, dur, fire });
  }
  private fbRing(g: Graphics, x: number, y: number, r: number, col: number) {
    const [sx, sy] = iso(x, y);
    g.ellipse(sx, sy, r * 45.25, r * 22.6).fill({ color: col, alpha: 0.32 }).stroke({ color: col, width: 2, alpha: 0.9 });
  }
  /** 45차: 기술을 쓰는 큰 적 — 필드 보스, 또는 기술이 있는 층주 */
  private skillDef(w: Walker): FbDef | null { return w.fb ? FB[w.fb] ?? null : w.mdef?.boss ? BOSS_SK[w.mdef.key] ?? null : null; }
  private fbHitPlayer(w: Walker, mult: number) {
    const def = this.skillDef(w)!;
    if (this.dead || this.invisible) return;
    this.hit(w, this.player, Math.round(rand(def.dmg[0], def.dmg[1]) * mult * FB_HIT), false, 'blunt');
    this.shakeT = Math.max(this.shakeT, 0.25); this.shakeA = Math.max(this.shakeA, 4);
  }
  private fbCast(w: Walker) {
    const def = this.skillDef(w)!;
    const p = this.player;
    const pat = def.patterns[Math.floor(Math.random() * def.patterns.length)];
    const col = def.col;
    const inside = (x: number, y: number, r: number) => Math.hypot(p.x - x, p.y - y) <= r;
    w.path = [];
    const L = t();
    const shoutKey = w.fb ?? w.mdef?.key ?? '';
    const shouts = (w.fb ? (L.fbShout as Record<string, string[]>)[shoutKey] : (L.bossShout as Record<string, string[]>)[shoutKey]) ?? null;
    if (shouts?.length) this.bubble(w, shouts[def.patterns.indexOf(pat)] ?? shouts[0]);
    if (pat === 'ring') {
      const cx = w.x, cy = w.y;
      this.fbMark((g) => this.fbRing(g, cx, cy, 3.2, col), 1.25, () => { if (inside(cx, cy, 3.2)) this.fbHitPlayer(w, 1.2); this.burst(cx, cy, col, 22); });
    } else if (pat === 'charge') {
      const dx = p.x - w.x, dy = p.y - w.y, d = Math.hypot(dx, dy) || 1;
      let tx = w.x, ty = w.y;
      for (let k = 1; k <= 16; k++) { const nx = w.x + (dx / d) * k * 0.5, ny = w.y + (dy / d) * k * 0.5; if (!walkable(this.zone, Math.floor(nx), Math.floor(ny))) break; tx = nx; ty = ny; }
      const fx = w.x, fy = w.y;
      this.fbMark((g) => {
        const nx = -dy / d * 0.6, ny = dx / d * 0.6;
        const pts = [iso(fx + nx, fy + ny), iso(tx + nx, ty + ny), iso(tx - nx, ty - ny), iso(fx - nx, fy - ny)];
        g.poly(pts.flat()).fill({ color: col, alpha: 0.3 }).stroke({ color: col, width: 2, alpha: 0.9 });
      }, 1.1, () => {
        w.dash = { fx, fy, tx, ty, t: 0 };
        // 선분에서 한 칸 안이면 치인다
        const ux = tx - fx, uy = ty - fy, L2 = ux * ux + uy * uy || 1;
        const s0 = Math.max(0, Math.min(1, ((p.x - fx) * ux + (p.y - fy) * uy) / L2));
        if (Math.hypot(p.x - (fx + ux * s0), p.y - (fy + uy * s0)) <= 1.0) this.fbHitPlayer(w, 1.35);
      });
    } else if (pat === 'pull') {
      const cx = w.x, cy = w.y;
      this.fbMark((g) => this.fbRing(g, cx, cy, 6.5, col), 1.3, () => {
        if (!inside(cx, cy, 6.5)) return;
        // 보스 쪽으로 끌려간다 (막히면 그 자리에서 멈춘다)
        const d = Math.hypot(p.x - cx, p.y - cy);
        for (let k = 0; k < 10 && d > 1.6; k++) { const nx = p.x + ((cx - p.x) / d) * 0.4, ny = p.y + ((cy - p.y) / d) * 0.4; if (!walkable(this.zone, Math.floor(nx), Math.floor(ny)) || Math.hypot(nx - cx, ny - cy) < 1.5) break; p.x = nx; p.y = ny; }
        p.path = []; this.kite = false;
        this.fbHitPlayer(w, 0.6);
      });
    } else if (pat === 'leap') {
      const tx = p.x, ty = p.y;
      this.fbMark((g) => this.fbRing(g, tx, ty, 2.2, col), 1.15, () => {
        if (walkable(this.zone, Math.floor(tx), Math.floor(ty))) { w.x = tx; w.y = ty; w.path = []; }
        if (inside(tx, ty, 2.2)) { this.fbHitPlayer(w, 1.25); p.slowT = 3; }
        this.burst(tx, ty, col, 26);
      });
    } else if (pat === 'coins' || pat === 'pillars') {
      const spots: [number, number][] = [[p.x, p.y]];
      for (let k = 0; k < (pat === 'coins' ? 5 : 3); k++) spots.push([p.x + (Math.random() - 0.5) * 6, p.y + (Math.random() - 0.5) * 6]);
      const r = pat === 'coins' ? 1.0 : 1.2;
      this.fbMark((g) => { for (const [x, y] of spots) this.fbRing(g, x, y, r, col); }, pat === 'coins' ? 1.3 : 1.15, () => {
        if (spots.some(([x, y]) => inside(x, y, r))) this.fbHitPlayer(w, pat === 'coins' ? 0.9 : 1.15);
        for (const [x, y] of spots) this.burst(x, y, col, 8);
      });
    } else if (pat === 'summon') {
      // 잿더미에서 망자 셋이 일어난다 (층주 둘레 · 이미 많으면 둘)
      const live = this.walkers.filter((x) => x.kid && x.summoned && x.down <= 0).length;
      const n = Math.max(0, Math.min(3, 6 - live));
      const spots: [number, number][] = [];
      for (let k = 0; k < n; k++) { const to = randomWalkTileNear(this.zone, Math.floor(w.x), Math.floor(w.y), 3, ['lot', 'walk', 'soi', 'park']); if (to) spots.push(to); }
      this.fbMark((g) => { for (const [x, y] of spots) this.fbRing(g, x + 0.5, y + 0.5, 0.7, col); }, 1.0, () => {
        const m = MONSTERS[w.mdef?.key === 'ashgal' ? 'ashen' : floorDef(this.zone.hell?.floor ?? 1).monsters[0]];
        for (const [x, y] of spots) {
          if (!m) break;
          const k = this.makeMonster(m, x, y);
          k.kid = true; k.summoned = true; k.elite = false;
          k.target = p; k.firstBy ??= k;
          this.walkers.push(k);
          this.burst(x + 0.5, y + 0.5, col, 14);
        }
      });
    } else if (pat === 'rain') {
      // 하늘에서 불붙은 재가 쏟아진다: 내 둘레 일곱 곳에 차례로 떨어진다
      const spots: [number, number][] = [[p.x, p.y]];
      for (let k = 0; k < 6; k++) spots.push([p.x + (Math.random() - 0.5) * 7, p.y + (Math.random() - 0.5) * 7]);
      spots.forEach(([x, y], k) => {
        this.fbMark((g) => this.fbRing(g, x, y, 1.1, col), 1.0 + k * 0.18, () => { if (inside(x, y, 1.1)) this.fbHitPlayer(w, 0.7); this.burst(x, y, col, 10); });
      });
    } else if (pat === 'slam') {
      const d = Math.hypot(p.x - w.x, p.y - w.y) || 1;
      const cx = w.x + ((p.x - w.x) / d) * Math.min(1.6, d), cy = w.y + ((p.y - w.y) / d) * Math.min(1.6, d);
      this.fbMark((g) => this.fbRing(g, cx, cy, 2.3, col), 0.95, () => { if (inside(cx, cy, 2.3)) this.fbHitPlayer(w, 1.4); this.burst(cx, cy, col, 18); });
    }
  }
  /** 불티·먼지 */
  private burst(x: number, y: number, col: number, n: number) {
    const [bx, by] = iso(x, y);
    for (let k = 0; k < n; k++) { const a = Math.random() * Math.PI * 2, v = 60 * (0.4 + Math.random()); this.sparks.push({ x: bx, y: by - 6, vx: Math.cos(a) * v, vy: Math.sin(a) * v * 0.6 - 30, t: 0.35, col }); }
  }
  private updateFieldBosses(dt: number) {
    for (let k = this.fbWarns.length - 1; k >= 0; k--) {
      const m = this.fbWarns[k];
      m.t += dt;
      m.g.alpha = 0.15 + 0.85 * Math.min(1, m.t / m.dur) * (0.75 + 0.25 * Math.sin(this.time * 18));
      if (m.t >= m.dur) { m.g.destroy(); this.fbWarns.splice(k, 1); if (!this.dead) m.fire(); }
    }
    for (const w of this.walkers) {
      if (w.down > 0) continue;
      const sk = this.skillDef(w);
      if (!sk) continue;
      if (w.dash) {
        const d = w.dash; d.t += dt / 0.3;
        const k2 = Math.min(1, d.t);
        w.x = d.fx + (d.tx - d.fx) * k2; w.y = d.fy + (d.ty - d.fy) * k2;
        if (k2 >= 1) w.dash = undefined;
        continue;
      }
      if (!w.target || this.dead) continue;
      w.fbT = (w.fbT ?? 5) - dt;
      // 45차: 기술 있는 층주는 체력이 반 아래면 성을 낸다 (더 자주 · 몸에 불길)
      const rage = !w.fb && w.hp < w.maxHp * 0.5;
      if (rage && !w.raged) { w.raged = true; this.bubble(w, (t().bossRage as Record<string, string>)[w.mdef?.key ?? ''] ?? '!'); this.shakeT = Math.max(this.shakeT, 0.6); this.shakeA = Math.max(this.shakeA, 7); this.burst(w.x, w.y, sk.col, 40); sfx.gateOpen(); }
      if (w.fbT <= 0 && Math.hypot(this.player.x - w.x, this.player.y - w.y) < 9) { this.fbCast(w); w.fbT = sk.every * (rage ? 0.62 : 1) * (0.8 + Math.random() * 0.4); }
    }
  }
  /** 쓰러뜨렸다: 돈 · 희귀 전리품 · (지옥) 템브라 파편 · 경험치. 다시 나오는 때는 main이 정한다 */
  private fieldBossDown(w: Walker, by: Walker) {
    const def = FB[w.fb!];
    const key = w.fb!;
    w.down = 3;
    // 41차: 손님이 쓰러뜨린 필드 보스의 돈·물건은 손님 기기에 떨어진다 (방장 바닥에는 없다)
    const remote = by.kind === 'remote' && this.netRole === 'host';
    if (def.cash && !remote) this.dropCoin(w.x, w.y, rand(def.cash[0], def.cash[1]), false);
    let n = 0;
    if (!remote) for (const [k, ch] of def.loot) if (Math.random() < ch) this.dropLoot(w.x + (n++ % 3) * 0.5 - 0.5, w.y + 0.4, k, 900);
    if (!remote) for (let s2 = 0; s2 < (def.shards ?? 0); s2++) this.dropLoot(w.x - 0.6 + s2 * 0.5, w.y - 0.3, 'tshard', 900);
    const mine = by.isPlayer || (w.pdmg ?? 0) > 0;
    if (mine) this.hooks.deed(def.deed);
    this.float(w, t().fbDown, '#ffd45a');
    this.hooks.fbossDown(key, mine);
    // w.fb는 그대로 둔다: 쓰러진 시간이 끝나면 그냥 사라져야 한다 (지우면 보통 괴물·불량배로 다시 태어난다)
  }
  /** 28차: 스무 살 무렵의 유내는 대문 앞에 서 있었다 — 34차부터는 미용실에서 일한다 (대문을 열면 그곳). 남은 유내만 치운다 */
  private placeYunae() {
    if (this.yunaeW) { this.removeWalker(this.yunaeW); this.yunaeW = null; }
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
    // 37차: 머리 꼭대기에 검은 띠처럼 보이던 것 — 눈높이로 내리고, 가는 금테 · 맑은 알로 (멀리서 검게 뭉치지 않게)
    g.circle(-1.9, 0, 1.25).fill({ color: 0xffffff, alpha: 0.4 }).circle(1.9, 0, 1.25).fill({ color: 0xffffff, alpha: 0.4 });
    g.circle(-1.9, 0, 1.25).stroke({ color: 0x8a6e3a, width: 0.5 }).circle(1.9, 0, 1.25).stroke({ color: 0x8a6e3a, width: 0.5 }).moveTo(-0.65, -0.1).lineTo(0.65, -0.1).stroke({ color: 0x8a6e3a, width: 0.45 });
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
    // 33차: 해변 양 끝의 바위 곶 · 그 너머 안개 벽
    for (const r of capeRocks()) {
      const d = drawCapeRock(r);
      const sp = new Sprite(tex(d.canvas));
      sp.position.set(d.x, d.y);
      sp.zIndex = r.i + r.j + (r.w + r.d) / 2;
      sp.eventMode = 'none';
      this.objects.addChild(sp);
      this.cullAdd(sp, d.x, d.y, d.x + d.canvas.width, d.y + d.canvas.height);
    }
    for (const side of [-1, 1]) for (let j = -14; j < this.zone.H + 16; j += 3.2) {
      const c = new Sprite(cloudTexture());
      c.anchor.set(0.5, 0.6); c.tint = 0xa49aa8; c.alpha = 0.78;
      const [x, y] = iso(side < 0 ? -11 - (j % 2) : this.zone.W + 10 + (j % 2), j);
      c.position.set(x, y);
      c.scale.set(1.9 + Math.abs(Math.sin(j)) * 0.6);
      c.zIndex = 9e5;
      c.eventMode = 'none';
      this.objects.addChild(c);
      this.cullAdd(c, x - 360, y - 120, x + 360, y + 80);
    }
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
      if (b.t - dt <= 0) { b.i = this.player.x - 14 + Math.random() * 28; /* 32차: 긴 해변 — 내 둘레 바다에 */ b.j = shoreLine(Math.floor(b.i)) - 2.5 - Math.random() * 4; b.s.texture = b.s.texture; }
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
      const pi = Math.floor(this.player.x);
      for (let i = pi - 40; i <= pi + 40; i += 0.5) {
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
    const gen = !!this.zone.heavenGen; // 35차: 구름섬은 바닥부터 희다 — 덜 밝게, 덜 바래게
    cm.brightness(terrace ? 1.0 : gen ? 1.0 : 1.12, false); // 테라스는 흰 대리석·구름이라 덜 밝게 (흰빛에 묻히지 않게)
    cm.saturate(terrace ? -0.05 : gen ? 0.05 : -0.22, true);
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
    w.bossGlow?.destroy();
    w.wings?.destroy();
    w.horns?.destroy();
    w.ferum?.arms.forEach((a) => a.destroy());
    w.devTail?.destroy();
    w.pack?.under.destroy(); w.pack?.over.destroy();
    w.sprite.destroy();
    for (const o of this.walkers) if (o.target === w) o.target = null;
  }

  private npcWeapon(kind: NpcKind, gang?: Walker['gang']): string | null {
    if (kind === 'angel') return 'sword'; // 20차: 지옥문을 지키는 천사의 칼
    if (kind !== 'thug') return null;
    const r = Math.random();
    if (gang === 'robber') return ['knife', 'pipe', 'hatchet', 'bat'][Math.floor(r * 4)];
    if (gang === 'mafia') return r < 0.55 ? 'pistol' : r < 0.8 ? 'dagger' : 'bat';
    if (gang === 'pickpocket') return r < 0.35 ? 'knife' : null;
    if (gang === 'boxer') return null; // 맨몸: 팔꿈치·무릎·발차기
    if (gang === 'enforcer') return r < 0.45 ? 'metalbat' : r < 0.75 ? 'dagger' : 'pipe';
    if (gang === 'collector') return r < 0.5 ? 'pipe' : r < 0.8 ? 'bat' : 'knife';
    if (this.realm === 'real' && this.zone.shop !== false && !this.zone.interior) return r < 0.6 ? 'bat' : r < 0.8 ? 'pipe' : null; // 21차: 시작 구역 불량배는 야구배트를 자주 든다 (쓰러뜨리면 떨어뜨린다)
    return [null, 'bat', 'pipe', 'knife', 'bat', null][Math.floor(r * 6)];
  }

  /**
   * 27차: 현실의 행인·관광객 절반은 맞으면 맞선다. 큰 것(장우산·야구방망이)은 들고 다니는 게 보이고,
   * 작은 것(단검)과 아주 드문 권총은 품에 숨겼다가 싸울 때 꺼낸다. 권총 든 행인은 단단하고 세다
   */
  private rollPasserArms(noFight: boolean, tier = 0): { brave: boolean; hidden: string | null; gunman: boolean; vis: string | null } {
    const out = { brave: false, hidden: null as string | null, gunman: false, vis: null as string | null };
    if (this.realm !== 'real' || noFight) return out;
    out.brave = Math.random() < 0.45 + 0.2 * tier; // 29차: 끝 구역일수록 맞서는 사람이 많다 (45% → 65%)
    const r = Math.random();
    if (out.brave) {
      if (r < 0.03) { out.hidden = 'pistol'; out.gunman = true; }
      else if (r < 0.25) out.hidden = 'dagger';
      else if (r < 0.4) out.vis = 'umbrella';
      else if (r < 0.5) out.vis = 'bat';
    } else if (r < 0.1) out.vis = 'umbrella';
    return out;
  }
  private applyPasserArms(w: Walker, a: { brave: boolean; hidden: string | null; gunman: boolean }, tier = 0) {
    w.brave = a.brave; w.hidden = a.hidden; w.gunman = a.gunman;
    // 29차: 구역마다 단단함이 다르다 — 아속 140~200 · 사이 구역 220~320 · 끝 구역 360 (권총 행인은 세 배)
    w.ptier = tier;
    w.maxHp = w.hp = Math.round(140 * (1 + 1.6 * tier) * (a.gunman ? 3 : 1) * (w.civ ? CIV[w.civ].hp : 1));
  }
  // ───────── 42차: 시민 ─────────
  private rollCiv(): Civ {
    const seoul = this.zone.city === 'seoul';
    const night = (() => { const h = bangkokClock().h; return h >= 20 || h < 4; })();
    const wt = (c: Civ) => CIV[c].w * (c === 'bouncer' ? (this.zone.id === 'bkk-nana' || this.zone.id === 'bkk-soi8-17' ? 3 : 1) * (night ? 2 : 0.5) : 1) * (c === 'student' && night ? 0.2 : 1) * (c === 'rider' && seoul ? 1.2 : 1);
    const all = Object.keys(CIV) as Civ[];
    let r = Math.random() * all.reduce((a, c) => a + wt(c), 0);
    for (const c of all) { r -= wt(c); if (r <= 0) return c; }
    return 'office';
  }
  /**
   * 42차 시민 겉모습 → 43차: 서울과 방콕은 피부색이 아니라 옷차림으로 갈린다
   *   서울: 회사원은 짙은 정장·베이지 트렌치 · 학생은 남색 교복 재킷(야구모자도) · 아주머니는 선캡과 꽃무늬 · 어르신은 원색 등산복과 등산모 · 배달 기사는 색 재킷과 헬멧
   *   방콕: 회사원은 흰 셔츠에 검은 바지(재킷 없음) · 학생은 흰 교복 셔츠 · 아주머니는 헐렁한 꽃무늬 · 어르신은 밝은 셔츠와 농 모자 · 윈 기사는 주황 조끼 · 노점상은 농 모자
   */
  private civLook(c: Civ, armor: string[]): Look {
    const r = (n: number) => Math.floor(Math.random() * n);
    const pick = <T,>(a: T[]) => a[r(a.length)];
    const seoul = this.zone.city === 'seoul';
    const sex: 'm' | 'f' = c === 'auntie' ? 'f' : c === 'worker' || c === 'bouncer' ? 'm' : c === 'rider' ? (Math.random() < 0.9 ? 'm' : 'f') : Math.random() < 0.55 ? 'f' : 'm';
    const base = { sex, build: r(3), skin: r(3), hair: r(6), hairColor: r(3), top: 0, bottom: 0 };
    switch (c) {
      case 'office':
        if (seoul) {
          if (Math.random() < 0.3) armor.push(`trench${pick(['#b89a6a', '#a8885a', '#4a4440'])}`);
          else if (Math.random() < 0.8) armor.push(`jacket${pick(['#22262e', '#2e3440', '#3a3a44', '#262a34'])}`);
          return { ...base, hairColor: 0, cols: { 3: pick(['#f2f0ea', '#dce6f2', '#e8e4f0']), 4: pick(['#22262e', '#2e3440', '#26282e']), 5: '#141414' } };
        }
        if (Math.random() < 0.15) armor.push('jacket#3a3a44');
        return { ...base, cols: { 3: pick(['#f6f4ee', '#f6f4ee', '#e8f0f6', '#c8d8e8']), 4: pick(['#141416', '#1e2028', '#2a2c34']), 5: '#141414' } };
      case 'student':
        if (seoul) { armor.push(pick(['jacket#1e2a4a', 'jacket#2a2e3a', 'jacket#4a2a34'])); if (sex === 'm' && Math.random() < 0.3) armor.push(`cap${pick(['#141416', '#f2f0ea', '#2a3a5a'])}`); }
        return { ...base, build: r(2), hair: sex === 'f' ? pick([2, 4]) : pick([0, 1, 5]), hairColor: 0, cols: { 3: seoul ? pick(['#f4f4f0', '#e8ecf2']) : '#fafaf6', 4: seoul ? pick(['#2a2e40', '#3a3e48']) : pick(['#1e2a44', '#141418']), 5: seoul ? '#f0f0ea' : pick(['#141414', '#f0f0ea']) } };
      case 'auntie':
        if (seoul && Math.random() < 0.65) armor.push(`visor${pick(['#f2f0ea', '#e8c0d0', '#c8e0f0', '#f0e0a0'])}`);
        return seoul
          ? { ...base, build: 1 + r(2), hair: 0, hairColor: r(2), outfit: Math.random() < 0.25 ? 'apron' : undefined, cols: { 3: pick(['#c8507a', '#8a5aa8', '#d86a4a', '#2a8aa8']), 4: pick(['#141416', '#2e2e36', '#3a3440']), 7: pick(['#e8c0c8', '#c8d8e8']), 5: '#2a2620' } }
          : { ...base, build: 1 + r(2), hair: pick([0, 2]), hairColor: 0, outfit: Math.random() < 0.35 ? 'apron' : undefined, cols: { 3: pick(['#e0a040', '#5a9a6a', '#d8607a', '#f0c860', '#6ab0c8']), 4: pick(['#4a3a30', '#6a4a3a', '#3a4a3a']), 7: pick(['#e8d0a0', '#d8e8c0']), 5: '#5a4a40' } };
      case 'elder':
        if (seoul) {
          armor.push(`jacket${pick(['#c8302a', '#6a3aa8', '#1a8a6a', '#e86a1a', '#2a5ac8'])}`);
          if (Math.random() < 0.7) armor.push(`cap${pick(['#c8b890', '#4a4a3a', '#8a2a2a'])}`);
          return { ...base, build: r(2), hair: sex === 'm' ? pick([0, 5]) : 0, cols: { 2: pick(['#c8c4bc', '#a8a49c', '#3a3430']), 3: pick(['#e8e4dc', '#4a4a50']), 4: pick(['#3a3a3e', '#5a5448']), 5: '#2a2a2e' } };
        }
        if (Math.random() < 0.4) armor.push('ngob#c8a868');
        return { ...base, build: r(2), hair: sex === 'm' ? pick([0, 5]) : pick([2, 4]), cols: { 2: pick(['#c8c4bc', '#a8a49c', '#e0dcd4']), 3: pick(['#f0e8d8', '#d8e8f0', '#e8d8a0', '#a8c8a0']), 4: pick(['#6a4a3a', '#4a4640', '#3a4a6a']), 5: '#3a3430' } };
      case 'worker':
        armor.push('workpants', `vest${pick(['#e8741a', '#d8c83a', '#8ac83a'])}`, 'helmet#e8c83a');
        return { ...base, build: 1 + r(2), hair: 5, cols: { 3: pick(['#7a6a4a', '#5a6a7a', '#8a5a3a']), 5: '#4a3a2a' } };
      case 'bouncer':
        return { ...base, build: 2, hair: 5, hairColor: 0, cols: { 3: '#121214', 4: '#121214', 5: '#0a0a0a' } };
      case 'rider':
        if (seoul) armor.push(`jacket${pick(['#2ab8b0', '#e8a020', '#1a6ad8', '#141416'])}`, 'helmet#f2f2f2');
        else { armor.push('vest#e8741a'); if (Math.random() < 0.4) armor.push(`cap${pick(['#141416', '#e8741a', '#2a3a5a'])}`); }
        return { ...base, hair: pick([0, 1, 5]), cols: { 3: pick(['#3a4a5a', '#5a5a5e', '#e8e4dc']), 4: pick(['#2a2c30', '#3a3a30']), 5: '#1a1a1a' } };
      case 'vendor':
        if (seoul) { if (sex === 'f' && Math.random() < 0.6) armor.push('visor#f2f0ea'); else if (sex === 'm') armor.push('vest#3a4a3a'); }
        else { if (Math.random() < 0.55) armor.push('ngob#c8a868'); if (sex === 'm') armor.push('vest#4a6a8a'); }
        return { ...base, outfit: sex === 'f' ? 'apron' : undefined, cols: { 3: seoul ? pick(['#5a6a7a', '#8a3a3a', '#d8d0c0']) : pick(['#d8d0c0', '#e8c8a0', '#c8d8c8', '#f0d860']), 4: pick(['#3a3a30', '#2a2a2e']), 7: seoul ? pick(['#2a3a5a', '#8a2a2a']) : pick(['#4a6a8a', '#8a3a3a', '#5a6a3a']), 5: '#2a2622' } };
    }
  }
  private civArms(c: Civ): { brave: boolean; hidden: string | null; gunman: boolean; vis: string | null } {
    const d = CIV[c];
    return { brave: Math.random() < d.brave, hidden: d.hid && Math.random() < d.hid[1] ? d.hid[0] : null, gunman: false, vis: d.vis && Math.random() < d.vis[1] ? d.vis[0] : null };
  }
  /** 구역 끝(이웃 구역으로 넘어가는 언저리)의 걸을 수 있는 칸 — 플레이어에게서 너무 멀면 없음 */
  private edgeSpot(p: Walker): [number, number] | null {
    const W = this.zone.W;
    for (const side of Math.random() < 0.5 ? [0, 1] : [1, 0]) {
      const i = side ? W - 3 - Math.floor(Math.random() * 12) : 2 + Math.floor(Math.random() * 12);
      if (Math.abs(i - p.x) > 40) continue;
      const s = randomWalkTileNear(this.zone, i, Math.floor(p.y), 14, ['soi', 'walk', 'lot']);
      if (s) return s;
    }
    return null;
  }
  /** 42차: 시민의 신경 긁기 — 곁을 지나며 한마디, 가끔은 어깨로 툭 (한 번에 하나, 몇 초에 한 번) */
  private jabT = 6;
  private civJab(w: Walker, d: number, dt: number) {
    if (this.jabT > 0 || this.dead || this.invisible || w.target || w.flee > 0 || w.bubble || this.working?.on || this.zone.interior) return;
    if (d > 3.2 || Math.random() > dt * (w.civ ? 0.5 : 0.25)) return;
    const L = t();
    const p = this.player;
    this.jabT = 7 + Math.random() * 9;
    if (d < 1.3 && Math.random() < 0.35) {
      // 어깨로 툭: 살짝 밀린다 (맞은 것은 아니다)
      const dx = p.x - w.x, dy = p.y - w.y, n = Math.hypot(dx, dy) || 1;
      p.kb = { dx: (dx / n) * 0.35, dy: (dy / n) * 0.35, t: 0.15 };
      w.squashT = 0.1;
      this.bubble(w, L.bump[Math.floor(Math.random() * L.bump.length)]);
      return;
    }
    const pool = w.civ && Math.random() < 0.7 ? L.civ[w.civ].jab : L.jab;
    w.dir = dirFromTile(p.x - w.x, p.y - w.y, w.dir);
    this.bubble(w, pool[Math.floor(Math.random() * pool.length)]);
  }
  /** 45차 싸움 중의 말: 시민은 시민답게, 불량배·강도·마피아·무에타이·행동대장은 저마다 — 때렸을 때와 맞았을 때가 다르다 */
  private fightBark(w: Walker, hitter: boolean) {
    if (w.down > 0 || w.bubble || (w.barkT ?? 0) > this.time || Math.random() > 0.38) return;
    w.barkT = this.time + 4 + Math.random() * 4;
    const L = t() as unknown as Record<string, string[] | Record<string, string[]>>;
    const crook = w.kind === 'thug';
    const g = w.weak === 'drunk' ? 'drunk' : w.gang ?? (crook ? 'thug' : 'civ');
    const byGang = (L[hitter ? 'barkHitG' : 'barkHurtG'] as Record<string, string[]>)[g];
    const pool = byGang && Math.random() < 0.6 ? byGang : (L[crook ? (hitter ? 'crookHit' : 'crookHurt') : hitter ? 'civHit' : 'civHurt'] as string[]);
    if (pool?.length) this.bubble(w, pool[Math.floor(Math.random() * pool.length)]);
  }
  /** 맞선다: 숨긴 무기가 있으면 꺼낸다 */
  private standUp(w: Walker, by: Walker) {
    w.flee = 0; w.path = [];
    if (!w.target) {
      w.target = by;
      // 29차: 싸움이 시작된 자리에서부터 12칸 — 걷다가 제자리에서 멀어진 행인이 맞서자마자 포기하던 것(서로 공격을 멈추는 느낌) 고침
      w.home = [Math.floor(w.x), Math.floor(w.y)];
      const L = t();
      const one = (a: string[]) => a[Math.floor(Math.random() * a.length)];
      if (w.hidden) { this.dress(w, w.look, w.hidden); w.hidden = null; this.bubble(w, one(w.gunman ? L.passerGun : L.passerDraw)); }
      else this.bubble(w, one(L.passerFight));
      // 42차: 오토바이 기사·노점상은 동료가 몰려온다
      if (w.civ && CIV[w.civ].rally && by.isPlayer) {
        let n = 0;
        for (const o of this.walkers) {
          if (o === w || o.civ !== w.civ || o.down > 0 || o.target || n >= 3 || Math.hypot(o.x - w.x, o.y - w.y) > 11) continue;
          o.target = by; o.flee = 0; o.path = []; o.home = [Math.floor(o.x), Math.floor(o.y)]; o.brave = true;
          if (!n) this.bubble(o, one(L.civRally));
          n++;
        }
      }
    }
  }
  /** 플레이어 근처 보도(불량배는 골목)에 사람을 세운다. 이미 있던 사람이면 자리만 옮긴다 */
  private spawnNpc(kind: NpcKind, existing?: Walker, weakIn?: Walker['weak'], gangIn?: Walker['gang']) {
    const p = this.netRole === 'host' && (kind === 'passer' || kind === 'thug') ? this.leastBody() : this.player;
    let weak = existing?.weak ?? weakIn;
    let gang = existing?.gang ?? gangIn;
    const prefer: Parameters<typeof randomWalkTileNear>[4] = kind === 'thug' ? ['soi', 'walk'] : ['walk', 'cross', 'park'];
    let spot: [number, number] | null = null;
    // 42차: 현실의 거리의 적은 대로변이 아니라 골목(소이)과 구역 끝(이웃 구역으로 넘어가는 언저리)에 산다
    const streetThug = kind === 'thug' && this.realm === 'real' && weak !== 'shade' && !this.gangZone();
    for (let n = 0; n < (streetThug ? 12 : 6) && !spot; n++) {
      const s = streetThug ? (n % 3 === 2 ? this.edgeSpot(p) : randomWalkTileNear(this.zone, Math.floor(p.x), Math.floor(p.y), 30, ['soi'])) : randomWalkTileNear(this.zone, Math.floor(p.x), Math.floor(p.y), 24, prefer);
      if (s && this.bodies().every((b) => Math.hypot(s[0] - b.x, s[1] - b.y) > 9)) spot = s;
    }
    if (!spot) return;
    if (kind === 'thug' && this.realm === 'real' && weak !== 'shade') ({ weak, gang } = this.rollThug(spot));
    // 19차: 현실 거리의 행인 넷에 하나는 외국인 관광객 (나나·소이 11 쪽은 더 많다)
    const tourRate = this.zone.id === 'bkk-nana' || this.zone.id === 'bkk-soi8-17' ? 0.34 : 0.24;
    const tour = kind === 'passer' && this.realm === 'real' && !weak && Math.random() < tourRate ? (['w', 'w', 'b', 'a', 'a'] as const)[Math.floor(Math.random() * 5)] : undefined;
    const lookOf = () => {
      if (!tour) return this.npcLook(kind, weak, gang);
      const key = `tour|${JSON.stringify(tour)}|${this.season()}`;
      let pool = LOOK_POOL.get(key);
      if (!pool) LOOK_POOL.set(key, (pool = []));
      if (pool.length >= 4) return pool[Math.floor(Math.random() * pool.length)];
      const l = this.dressForSeason(this.touristLook(tour), kind); // 35차: 서울 겨울엔 관광객도 패딩
      pool.push(l);
      return l;
    };
    // 42차: 현실의 행인 열에 일곱은 종류가 있는 시민 (회사원 · 학생 · 아주머니 · 노인 · 노동자 · 클럽 경비 · 오토바이 기사 · 노점상)
    const civ = kind === 'passer' && this.realm === 'real' && !tour && !weak && Math.random() < 0.7 ? this.rollCiv() : undefined;
    const civArmor: string[] = [];
    const look = civ ? this.civLook(civ, civArmor) : lookOf();
    // 27차: 행인의 무기는 옷을 입힐 때 한 번에 (두 번 합치지 않게)
    const tier = kind === 'passer' ? this.passerTier(spot[0], spot[1]) : 0;
    const arms = civ ? this.civArms(civ) : kind === 'passer' ? this.rollPasserArms(!!weak || !!look.child, tier) : null;
    const weapon = weak ? null : arms ? arms.vis : this.npcWeapon(kind, gang);
    if (existing) {
      Object.assign(existing, { x: spot[0] + 0.5, y: spot[1] + 0.5, path: [], hp: existing.maxHp, down: 0, target: null, firstBy: null, flee: 0, home: spot, pick: undefined, stalk: 0 });
      existing.act = null;
      existing.pend = null;
      existing.tour = tour;
      existing.civ = civ;
      this.dress(existing, look, weapon, civArmor);
      this.makeWeak(existing, weak);
      this.makeGang(existing, gang);
      if (arms) this.applyPasserArms(existing, arms, tier);
      return;
    }
    const w = this.makeWalker(look, spot[0], spot[1], kind, weapon, civArmor);
    w.tour = tour;
    w.civ = civ;
    this.makeWeak(w, weak);
    this.makeGang(w, gang);
    if (arms) this.applyPasserArms(w, arms, tier);
    if (kind === 'angel') { this.giveWings(w, 0xf8f4ea); w.maxHp = w.hp = 900; w.speed = 1.1; }
    this.walkers.push(w);
  }

  // ───────────────────────── 건물 안 ─────────────────────────
  private clerkW: Walker | null = null;
  // ───── 46차 천국 예배 ─────
  private serviceOn = false;
  private serviceSeat: [number, number] | null = null;
  private seat: { i: number; j: number; pose: 'sit' | 'lotus'; dir: Dir } | null = null;
  /** 예배 중인가 (성소 안을 채우는 사람 수가 다르다) · 내 자리를 비워 둔다 */
  setService(on: boolean, seat: [number, number] | null = null) { this.serviceOn = on; this.serviceSeat = seat; }
  /** 예배 자리 후보: 앞쪽 가운데에서 가까운 순 */
  serviceSeats(): [number, number][] {
    const info = this.zone.interior; if (!info) return [];
    const mid = this.zone.W / 2;
    return info.seats.slice().sort((a, b) => (a[1] + Math.abs(a[0] + 0.5 - mid) * 0.6) - (b[1] + Math.abs(b[0] + 0.5 - mid) * 0.6));
  }
  /** 자리에 앉힌다 (null이면 일어난다). 앉아 있는 동안은 걷지도 치지도 않는다 */
  seatPlayer(s: { i: number; j: number; pose: 'sit' | 'lotus'; dir: Dir } | null) {
    const p = this.player;
    this.seat = s;
    if (s) { this.cancelActs(); p.path = []; p.target = null; p.act = null; this.dress(p, p.look, null, []); this.holdSeat(); }
    else { p.still = undefined; this.setGear(this.gear); }
  }
  get seated() { return !!this.seat; }
  playerTile() { return { i: Math.floor(this.player.x), j: Math.floor(this.player.y) }; }
  // ───── 46차 쌍둥이 (노을이 부모천사) ─────
  private spawnTwins() {
    const mk = (sex: 'm' | 'f', i: number, j: number, which: 'boy' | 'girl') => {
      const look: Look = sex === 'm'
        ? { sex: 'm', build: 0, skin: 1, hair: 1, hairColor: 0, top: 0, bottom: 0, cols: { 2: '#2a1e18', 3: '#8ab8e8', 4: '#e8e2d4', 5: '#6a4a32' } }
        : { sex: 'f', build: 0, skin: 1, hair: 4, hairColor: 0, top: 0, bottom: 0, cols: { 2: '#2a1e18', 3: '#f2a8bc', 4: '#f6f0e8', 5: '#c86a7a' } };
      const w = this.makeWalker(look, i, j, 'soul');
      w.size = 0.62; w.speed = 1.5; w.maxHp = w.hp = 99999; w.twin = which; w.wait = 1 + Math.random() * 2; w.home = [i, j];
      this.walkers.push(w);
      return w;
    };
    mk('m', 7, 5, 'boy'); mk('f', 8, 6, 'girl');
  }
  /** 쌍둥이: 내 오두막 둘레를 쫓아다니며 장난 · 가끔 내게 달려와 한마디 */
  private thinkTwin(w: Walker, moving: boolean, dt: number) {
    const p = this.player;
    if (!w.bubble && Math.random() < dt * 0.05) { const b = t().twinBark, sib = this.player.look.sex === 'f' ? '누나' : '형아'; this.bubble(w, b[Math.floor(Math.random() * b.length)].replaceAll('{sib}', sib)); }
    // 47차: 둘이 술래잡기하며 뛰어논다 — 오빠(업이)가 먼저 술래, 잡으면 술래가 바뀐다. 가끔 내게 달려온다
    const o = this.walkers.find((x) => x.twin && x !== w);
    if (o && !w.tagNear) {
      if (w.tagIt === undefined) w.tagIt = w.twin === 'boy';
      w.speed = 2.3;
      const d = Math.hypot(o.x - w.x, o.y - w.y);
      w.wait -= dt;
      if (w.tagIt && d < 0.9 && w.wait <= 0) {
        w.tagIt = false; o.tagIt = true; o.wait = 1.2; w.wait = 0.4; w.path = []; o.path = [];
        const L = t(); this.bubble(w, L.twinTag[Math.floor(Math.random() * L.twinTag.length)]); if (!o.bubble) this.bubble(o, L.twinCaught[Math.floor(Math.random() * L.twinCaught.length)]);
        if (Math.random() < 0.25) { w.tagNear = 4; }
        return;
      }
      if (w.wait > 0) return;
      w.repathT -= dt;
      if (w.repathT > 0 && moving) return;
      w.repathT = w.tagIt ? 0.45 : 0.9;
      let ti: number, tj: number;
      if (w.tagIt) { ti = Math.floor(o.x); tj = Math.floor(o.y); }
      else { const ax = w.x + (w.x - o.x) * 2 + (Math.random() - 0.5) * 4, ay = w.y + (w.y - o.y) * 2 + (Math.random() - 0.5) * 4; ti = Math.max(2, Math.min(this.zone.W - 3, Math.floor(ax))); tj = Math.max(5, Math.min(this.zone.H - 3, Math.floor(ay))); }
      const path = findPath(this.zone, Math.floor(w.x), Math.floor(w.y), ti, tj);
      if (path) w.path = path;
      return;
    }
    if (w.tagNear) { w.tagNear -= dt; if (w.tagNear <= 0) w.tagNear = 0; w.speed = 1.5; }
    if (moving) return;
    w.wait -= dt;
    if (w.wait > 0) { if (Math.hypot(p.x - w.x, p.y - w.y) < 5) w.dir = dirFromTile(p.x - w.x, p.y - w.y, w.dir); return; }
    w.wait = 1.5 + Math.random() * 3;
    const near = Math.random() < 0.3;
    const ti = near ? Math.floor(p.x + (Math.random() - 0.5) * 3) : 2 + Math.floor(Math.random() * 7), tj = near ? Math.floor(p.y + 1 + Math.random() * 1.5) : 5 + Math.floor(Math.random() * 5);
    const path = findPath(this.zone, Math.floor(w.x), Math.floor(w.y), ti, tj);
    if (path) w.path = path;
  }
  /** 오두막 문 앞에 서면 (내 집 · 쌍둥이네) */
  private hutAt = '';
  private checkHutDoor() {
    const info = this.zone.interior;
    if (!info || info.kind !== 'cloudisle' || this.player.path.length) return;
    const pi = Math.floor(this.player.x), pj = Math.floor(this.player.y);
    const hit = info.furn.find((f) => (f.kind === 'hut' || f.kind === 'hut2') && pj === f.j + f.d && pi >= f.i + 1 && pi <= f.i + f.w - 2);
    const key = hit ? `${hit.kind}` : '';
    if (key && key !== this.hutAt) this.hooks.hutDoor(hit!.kind === 'hut' ? 'mine' : 'twins');
    this.hutAt = key;
  }
  /** 47차 출입국 심사대 앞에 서면 */
  private immigAt = false;
  private checkImmig() {
    const info = this.zone.interior;
    if (!info || info.kind !== 'airport' || this.player.path.length) { this.immigAt = false; return; }
    const pi = Math.floor(this.player.x), pj = Math.floor(this.player.y);
    const hit = info.furn.some((f) => f.kind === 'immig' && pi >= f.i - 1 && pi <= f.i + f.w && pj >= f.j + f.d && pj <= f.j + f.d + 1);
    if (hit && !this.immigAt) this.hooks.immig();
    this.immigAt = hit;
  }
  // ───── 47차 공항 가는 정류장: 도시의 맨 끝 길가 (방콕 동쪽 끝 구역 · 서울 동쪽 가장자리) ─────
  private airportSpot: [number, number] | null = null;
  private airportNear = false;
  private setupAirportStop() {
    if (this.realm !== 'real' || this.zone.interior || this.zone.hell) return;
    const z = this.zone, ed = z.edges;
    if (ed && ed.e !== null) return; // 끝 구역에만
    const W = z.W, H = z.H, jd = z.door.j;
    let best: [number, number] | null = null;
    for (let i = (ed ? ed.i1 : W) - 3; i > W * 0.5 && !best; i--) for (let dj = 0; dj < 40 && !best; dj++) for (const j of [jd + dj, jd - dj]) if (j > 1 && j < H - 2 && walkable(z, i, j) && walkable(z, i - 1, j) && walkable(z, i, j + 1)) { best = [i, j]; break; }
    if (!best) return;
    this.airportSpot = best;
    const g = new Graphics(); g.eventMode = 'none';
    // 표지판: 기둥 · 파란 판 · 흰 비행기
    g.rect(-1.5, -64, 3, 64).fill(0x5a6068);
    g.roundRect(-22, -86, 44, 26, 4).fill(0x2a5a9a).stroke({ color: 0xffffff, width: 1.5 });
    g.poly([-12, -73, 10, -75, 14, -73, 10, -71]).fill(0xffffff); g.poly([-2, -74, 2, -84, 5, -84, 4, -74]).fill(0xffffff); g.poly([-2, -72, 2, -64, 5, -64, 4, -72]).fill(0xffffff); g.poly([-12, -73, -14, -78, -11, -78, -9, -73]).fill(0xffffff);
    const [x, y] = iso(best[0] + 0.5, best[1] + 0.5);
    g.position.set(x, y); g.zIndex = best[0] + best[1] + 0.99;
    this.objects.addChild(g);
  }
  private checkAirportStop() {
    const s = this.airportSpot; if (!s || this.zone.interior) return;
    const near = Math.hypot(this.player.x - (s[0] + 0.5), this.player.y - (s[1] + 0.5)) < 1.6 && !this.player.path.length;
    if (near && !this.airportNear) this.hooks.airport();
    this.airportNear = near;
  }
  private bedAt = '';
  private checkBed() {
    const info = this.zone.interior;
    if (!info || (info.kind !== 'hhome' && info.kind !== 'myhome') || this.player.path.length) { if (!info) this.bedAt = ''; return; }
    const pi = Math.floor(this.player.x), pj = Math.floor(this.player.y);
    const bed = info.furn.find((f) => ['cbed', 'futon', 'vbed', 'kbed'].includes(f.kind) && pi >= f.i - 1 && pi <= f.i + f.w && pj >= f.j - 1 && pj <= f.j + f.d);
    const key = bed ? 'bed' : '';
    if (key && key !== this.bedAt) this.hooks.bed(info.kind);
    this.bedAt = key;
  }
  private holdSeat() {
    const s = this.seat; if (!s) return;
    const p = this.player;
    p.path = []; p.target = null; p.x = s.i + 0.5; p.y = s.j + (s.pose === 'sit' ? 0.38 : 0.5); p.still = s.pose; p.dir = s.dir;
  }
  /** 예배를 이끄는 이(제단 곁의 천사)의 말 · 회중의 웅얼거림 */
  officiantSay(text: string) { if (this.clerkW) this.bubble(this.clerkW, text); }
  congregationSay(text: string) {
    const cs = this.walkers.filter((w) => w.worship && w.still && !w.bubble);
    const w = cs[Math.floor(Math.random() * cs.length)]; if (w) this.bubble(w, text);
  }
  /** 천국의 예배에 온 영혼: 흰빛 · 연한 빛깔 옷 (수영복은 갈아입고 왔다) */
  private congregantLook(): Look {
    const r = (n: number) => Math.floor(Math.random() * n), pick = <T,>(a: T[]) => a[r(a.length)];
    return { sex: Math.random() < 0.5 ? 'f' : 'm', build: r(3), skin: r(3), hair: r(6), hairColor: r(3), top: 0, bottom: 0, cols: { 3: pick(['#f4f0e6', '#eae4f2', '#e6f0ea', '#f2ead8', '#ffffff']), 4: pick(['#d8d2c4', '#c8c4d8', '#e2dccf', '#b8b2a4']) } };
  }
  private leaving = false;
  /** 가게 안에서 일하는 중: 조작 없이 가게 안을 오가며 시급이 쌓인다 */
  /** 32차: 서울이면 한국 시급 */
  private get wageMul() { return this.zone.city === 'seoul' ? SEOUL_WAGE : 1; }
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
    if (stiffed && this.realm === 'real' && !this.zone.interior?.rest) this.armStiffBoss(w.earned);
  }
  /**
   * 47차: 돈을 떼먹은 사장 — 내가 방을 나가기 전까지 머리 위에 칼 표시(덤비라는 듯). 먼저 치면 악행.
   * 사장마다 들고 있는 것이 다르다: 셋에 하나는 아주 세다(일본도 · 오함마 · 마체테), 나머지는 평범하다(식칼 · 쇠파이프 · 배트 · 맨손)
   */
  private stiffMark: Graphics | null = null;
  private armStiffBoss(owed: number) {
    const c = this.clerkW;
    if (!c || c.down > 0) return;
    const strong = Math.random() < 0.33;
    const pool = strong ? ['katana', 'sledge', 'machete'] : ['knife', 'pipe', 'bat', null];
    const wpn = pool[Math.floor(Math.random() * pool.length)];
    c.kind = 'thug'; c.stiffBoss = strong ? 2 : 1; c.owed = Math.max(1, owed);
    c.maxHp = c.hp = strong ? 1600 : 280; c.speed = strong ? 1.6 : 1.1; c.target = null; c.path = []; c.wait = 1e9;
    this.dress(c, c.look, wpn, c.armor ?? []);
    this.clerkW = null;
    // 계산대 뒤에서 걸어 나와 내 앞을 막아선다 (팔짱 끼고 비웃는다)
    const p = this.player, to = this.nearestWalkable(Math.floor(p.x + 1.5), Math.floor(p.y - 1)) ?? this.nearestWalkable(Math.floor(p.x), Math.floor(p.y - 2));
    if (to) { const path = findPath(this.zone, Math.floor(c.x), Math.floor(c.y), to[0], to[1]); if (path) c.path = path; else { c.x = to[0] + 0.5; c.y = to[1] + 0.5; } } // 계산대에 갇혀 있으면 넘어 나온다
    this.stiffMark?.destroy();
    const g = new Graphics(); g.eventMode = 'none'; g.zIndex = 9e5;
    g.poly([-2, -12, 2, -12, 1.2, 2, -1.2, 2]).fill(0xe8ecf0).stroke({ color: 0x3a3a40, width: 1 }); // 날
    g.rect(-5, 2, 10, 2).fill(0xc9a23e); g.rect(-1.5, 4, 3, 7).fill(0x5a3a22); // 날밑 · 손잡이
    g.circle(0, -2, 13).stroke({ color: 0xff5a4a, width: 1.5, alpha: 0.7 });
    this.objects.addChild(g);
    this.stiffMark = g;
  }
  private updateStiffMark() {
    const g = this.stiffMark; if (!g) return;
    const b = this.walkers.find((x) => x.stiffBoss && x.down <= 0);
    if (!b) { g.destroy(); this.stiffMark = null; return; }
    g.position.set(b.sprite.x, b.sprite.y - 78 * BODY_K + Math.sin(this.time * 4) * 2);
    g.visible = b.sprite.visible;
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
    // 32차: 경계의 해변은 긴 해변이라 거리처럼 덩어리로 끝없이 그린다 (stream)
    if (info.kind !== 'shore') {
      const room = drawRoom(this.zone, nightIn);
      const rs = new Sprite(tex(room.canvas));
      rs.position.set(room.x, room.y);
      this.ground.addChild(rs);
    }
    for (const f of info.furn) {
      if (f.kind === 'shuttle') { this.addShip(f); continue; }
      const d = drawFurn(f, info, nightIn);
      this.strips(tex(d.canvas), d.x, d.y, f.i, f.j, f.w, f.d, f.h <= 2 ? -40 : -0.2);
    }
    // 24차: 가끔은 루엔·파샤르 대신 안경 쓴 아주 늙은 할아버지가 앉아 있다 (천국·지옥 같은 사람, 옷차림만 다름)
    this.grandpa = (info.kind === 'terrace' || info.kind === 'rebirth') && (this.forceGrandpa ?? Math.random() < 0.14);
    if (info.kind === 'cloudisle' && info.clerk) { // 46차 구름 위의 오두막: 데려다준 황색날개 · 옆집 쌍둥이
      const yw = this.makeYellowWing(info.clerk.i, info.clerk.j); yw.wait = 1e9; yw.speed = 0; yw.dir = 'sw';
      this.spawnTwins();
    } else     if (info.kind === 'goatroom' && info.clerk) { this.setupGoatFx(this.placeGoatKing(info.clerk.i, info.clerk.j)); this.placeChanger(13, 2); } // 32차: 뒤 모서리 흑요석 단 한가운데의 옥좌 · 33차: 오른쪽 벽가 환전 탁자 뒤의 환전상
    else if (info.clerk) {
      const w = this.makeWalker(this.grandpa ? grandpaLook(info.kind === 'rebirth') : info.kind === 'home' ? yunaeLook((info.age ?? 1) as 0 | 1 | 2) : clerkLook(info.kind, info.from.b), info.clerk.i, info.clerk.j, 'clerk');
      w.dir = 'sw';
      w.wait = 1e9;
      this.walkers.push(w);
      this.clerkW = w;
      if (info.kind === 'loan') this.dotArt(w, 'sprite-besk'); // 관리자가 손본 베스크 도트
      if (info.kind === 'home' && !this.grandpa) {
        this.dotArt(w, info.age === 0 ? 'sprite-yunae-teen' : info.age === 1 ? 'sprite-yunae-20s' : 'sprite-yunae-30s'); // 28차: 시절별 유내 도트
        if (info.age === 0) w.size = 0.86; // 31차: 열여섯 무렵의 유내는 키가 작다 (구운 그림 · 관리자 도트 모두)
        // 34차: 놀이터에선 그네에 앉아 · 미용실에선 손님 머리를 자르며(손님 쪽을 본다) · 진료실에선 의자에 앉아 이쪽을 지켜본다
        if (info.age === 0 || info.age === 2) w.still = 'sit';
        if (info.age === 2) w.watch = true;
        if (info.age === 0) { w.dir = 'sw'; w.x = info.clerk.i + 0.62; w.y = info.clerk.j + 0.38; w.zb = 0.9; } // 그네 앉을판 위 (앉은 그림은 엉덩이가 뒤로 빠져 있다)
        if (info.age === 1) w.dir = 'w';
        w.murmur = info.age;
      }
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
    // 46차 천국 성소: 예배 때는 자리를 영혼들이 거의 채우고(앉아서 제단을 본다), 벽가에 천사들이 선다. 예배가 아니면 몇 사람만 기도한다
    if (info.kind === 'hchurch' || info.kind === 'htemple' || info.kind === 'hmosque') {
      const sv = WorldScene.svcNext; if (sv) { this.serviceOn = sv.on; this.serviceSeat = sv.seat; WorldScene.svcNext = null; }
      if (this.clerkW) { this.giveWings(this.clerkW, 0xf6f2e6); this.clerkW.dir = 'sw'; }
      const pose: 'sit' | 'lotus' = info.kind === 'hchurch' ? 'sit' : 'lotus';
      const keep = this.serviceSeat ? `${this.serviceSeat[0]},${this.serviceSeat[1]}` : '';
      const fill = this.serviceOn ? 0.86 : 0.12;
      for (const [i, j] of seats) {
        if (`${i},${j}` === keep || Math.random() > fill) continue;
        const c = this.makeWalker(this.congregantLook(), i, j, 'soul');
        c.x = i + 0.5; c.y = j + (pose === 'sit' ? 0.38 : 0.5); c.still = pose; c.dir = 'ne'; c.wait = 1e9; c.speed = 0; c.maxHp = c.hp = 99999; c.worship = true;
        this.walkers.push(c);
      }
      if (this.serviceOn) for (let k = 0; k < 6; k++) { // 벽가에 선 천사들
        const side = k % 2 ? this.zone.W - 3 : 2, jj = 4 + Math.floor(k / 2) * 3;
        const a = this.makeWalker(this.npcLook('angel'), side, jj, 'angel');
        a.dir = side < this.zone.W / 2 ? 'e' : 'n'; a.wait = 1e9; a.speed = 0; a.maxHp = a.hp = 99999; a.preach = undefined; a.choir = true;
        this.giveWings(a, 0xf4efe4);
        this.walkers.push(a);
      }
      seats.length = 0;
    }
    if (info.kind === 'hpalace') {
      // 46차 천국 본청: 접수 천사 셋(가운데 · 양쪽 창구) · 창구와 저울 앞에 줄 선 영혼 · 긴 의자에서 기다리는 영혼 · 서류를 들고 오가는 천사들
      const W = this.zone.W, mid = Math.floor(W / 2);
      if (this.clerkW) { this.giveWings(this.clerkW, 0xf6f2e6); this.clerkW.dir = 'sw'; }
      const still = (wk: Walker, d: Dir) => { wk.dir = d; wk.wait = 1e9; wk.speed = 0; wk.maxHp = wk.hp = 99999; this.walkers.push(wk); return wk; };
      for (const [i, j, d] of [[2, 6, 'e'], [W - 3, 6, 'n']] as [number, number, Dir][]) this.giveWings(still(this.makeWalker(this.npcLook('angel'), i, j, 'angel'), d), 0xf4efe4);
      for (let q = 0; q < 3; q++) { still(this.makeWalker(this.congregantLook(), 4 + q, 6, 'soul'), 'w'); still(this.makeWalker(this.congregantLook(), W - 5 - q, 6, 'soul'), 'e'); }
      for (let q = 0; q < 4; q++) still(this.makeWalker(this.congregantLook(), mid + (q % 2), 9 + q, 'soul'), 'ne');
      for (const [i, j] of seats) {
        if (Math.random() > 0.6) continue;
        const c = this.makeWalker(this.congregantLook(), i, j, 'soul');
        c.x = i + 0.5; c.y = j + 0.38; c.still = 'sit'; c.worship = true;
        still(c, 'ne');
      }
      for (let k = 0; k < 3; k++) { const a = this.makeWalker(this.npcLook('angel'), 6 + k * 5, 10, 'angel'); a.wait = 2 + Math.random() * 5; a.speed = 0.7; a.maxHp = a.hp = 99999; this.giveWings(a, 0xf4efe4); this.walkers.push(a); }
      seats.length = 0;
    }
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
      w.earned += WAGE_PER_SEC * w.job.mult * this.wageMul * dt;
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
    if (FIELD_BOSS[h.floor]) this.spawnFieldBosses(); // 31차: 하루 한 번 나오는 필드 보스
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
      // 43차: 전용 3D 몸 (바구니 · 화염방사기를 몸에 함께 — 관리자 도트는 쓰지 않는다)
      const mg = this.makeWalker(MASKGIRL_LOOK, at[0], at[1], 'maskgirl');
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
    this.setupChimney(); // 34차: 4층 칼드렉의 대장간 굴뚝 불꽃
    this.setupDollEyes(); // 43차: 5층 마리의 공방 인형 눈
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
        smith: { sex: 'm', build: 2, skin: 0, hair: 5, hairColor: 0, top: 0, bottom: 0, outfit: 'casual', cols: { 1: sk, 10: sk, 2: '#0e0a08', 3: '#2a1e16', 4: '#1e1612', 9: '#5a3a24', 5: '#0e0a08' } }, // 30차: 그을린 가죽 앞치마의 대장장이
        puppeteer: MARI_LOOK, // 43차 5층 인형술사 마리 (전용 3D 몸 — 서 있으면 가끔 실을 당긴다)
      };
      const weapon = v.kind === 'butcher' ? 'knife' : v.kind === 'arms' ? 'bow' : v.kind === 'smith' ? 'hammer' : null;
      const ferum = v.kind === 'smith' && h.floor === 4;
      const w = this.makeWalker(ferum ? KALDREK_LOOK : looks[v.kind], v.i, v.j, 'vendor', ferum ? null : weapon);
      w.vend = v.kind; w.dir = 'sw'; w.wait = 1e9; w.speed = 0; w.maxHp = w.hp = 400;
      if (ferum) {
        // 34차 칼드렉 → 43차: 팔 넷 · 뿔 · 망치와 집게를 모두 몸에 함께 구운 전용 3D 몸 (서 있으면 가끔 망치질)
        w.size = 1.12; w.maxHp = w.hp = 99999;
        w.ferum = { arms: [] };
      } else if (v.kind === 'succubus') this.dressSuccubus(w, h.floor);
      else if (hasVendorGear(v.kind)) { const under = new Sprite(), over = new Sprite(); this.objects.addChild(under, over); w.pack = { under, over, vend: v.kind }; } // 31차: 장사마다 알아볼 차림
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
        if (!m.mdef || m.mdef.boss || m.fb || m.down > 0) continue;
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
  /** 43차 마리오네트: 남은 초 (없으면 0) */
  get marionetteLeft(): number {
    const m = this.walkers.find((x) => x.kind === 'marionette' && x.down <= 0);
    return m?.marion ? Math.max(0, m.marion.left) : 0;
  }
  /** 43차 마리의 마리오네트를 부른다: 위에서 실이 내려와 곁에 선다 — 지옥 들판에서만, 한 번에 하나 */
  /** 45차 지옥 정벌: 노을이 곁에서 함께 싸운다 (마리오네트와 같은 틀 — 내가 노리는 괴물부터, 할 일이 없으면 내 곁) */
  summonNoeul(hp: number, dmg: [number, number]) {
    if (!this.zone.hell || this.walkers.some((x) => x.noeulAlly)) return;
    const p = this.player;
    const spot = randomWalkTileNear(this.zone, Math.floor(p.x), Math.floor(p.y), 2, ['walk', 'lot', 'park', 'soi', 'cross']) ?? [Math.floor(p.x), Math.floor(p.y)];
    const w = this.makeWalker(NOEUL_LOOK, spot[0], spot[1], 'marionette', 'sword');
    w.noeulAlly = true;
    w.maxHp = w.hp = hp;
    w.speed = 1.3;
    w.home = [spot[0], spot[1]];
    w.marion = { left: 1e9, dmg };
    w.dir = p.dir;
    this.walkers.push(w);
    this.giveWings(w, 0xf8f8fc); // 46차 컨셉 그림: 새하얀 깃털 날개
    const hi = t().crusadeHi;
    this.bubble(w, hi[Math.floor(Math.random() * hi.length)]);
  }
  /** 45차: 정벌 중에는 쉬어도 체력이 차지 않는다 (만피로 가서 다 닳으면 끝) */
  /** 47차 무게: 걷는 빠르기 · 회복 배수 · 기어감 */
  private load = { speed: 1, regen: 1, crawl: false };
  setLoad(speed: number, regen: number, crawl: boolean) { this.load = { speed, regen, crawl }; }
  private noRegen = false;
  setNoRegen(v: boolean) { this.noRegen = v; }
  summonMarionette(hp: number, dmg: [number, number], cols: Record<number, string>, secs: number): boolean {
    if (!this.zone.hell || this.zone.interior || this.dead) return false;
    if (this.walkers.some((x) => x.kind === 'marionette' && x.down <= 0)) return false;
    const p = this.player;
    const spot = randomWalkTileNear(this.zone, Math.floor(p.x), Math.floor(p.y), 2, ['walk', 'lot', 'park', 'soi', 'cross']) ?? [Math.floor(p.x), Math.floor(p.y)];
    const look: Look = { sex: 'm', build: 1, skin: 0, hair: 0, hairColor: 0, top: 0, bottom: 0, outfit: 'puppet' as Look['outfit'], cols: { 1: cols[13] ?? '#b88a5a', 5: '#1a1410', 6: '#e0b437', ...cols } };
    const w = this.makeWalker(look, spot[0], spot[1], 'marionette', 'saber');
    w.maxHp = w.hp = hp;
    w.speed = 1.2;
    w.size = 0.94;
    w.home = [spot[0], spot[1]];
    w.marion = { left: secs, dmg };
    w.dir = p.dir;
    w.riseT = 0.5;
    this.walkers.push(w);
    this.shakeT = Math.max(this.shakeT, 0.18); this.shakeA = Math.max(this.shakeA, 3);
    this.burst(w.x, w.y, 0xf2eee6, 16);
    sfx.chime();
    const hi = t().marionetteHi;
    this.bubble(w, hi[Math.floor(Math.random() * hi.length)]);
    return true;
  }
  /** 마리오네트: 내가 노리는 괴물부터, 없으면 내 곁 7칸 안 가장 가까운 괴물 (층주·필드 보스도). 할 일이 없으면 내 뒤를 따른다 */
  private thinkMarionette(w: Walker, moving: boolean, dt: number) {
    const m = w.marion!;
    const p = this.player;
    m.left -= dt;
    const L = t();
    if (m.left <= 0 || !this.zone.hell || this.dead) {
      // 시간이 다 되면 실이 툭 끊긴다
      w.target = null; w.path = [];
      w.act = { anim: 'fall', t: 0 };
      w.down = 1.4;
      m.left = 0;
      this.hooks.notice(L.marionetteGone);
      return;
    }
    if (m.left < 15 && (m.said ?? 0) < 1) { m.said = 1; this.bubble(w, L.marionetteLow[Math.floor(Math.random() * L.marionetteLow.length)]); }
    const dp = Math.hypot(p.x - w.x, p.y - w.y);
    if (dp > 22) { const to = randomWalkTileNear(this.zone, Math.floor(p.x), Math.floor(p.y), 2, ['walk', 'lot', 'park', 'soi', 'cross']); if (to) { w.x = to[0] + 0.5; w.y = to[1] + 0.5; w.path = []; w.target = null; } return; }
    if (w.target && (w.target.down > 0 || w.target.sprite.destroyed || Math.hypot(w.target.x - p.x, w.target.y - p.y) > 11)) w.target = null;
    const mine = p.target && (p.target.mdef || p.target.fb) && p.target.down <= 0 ? p.target : null;
    if (mine && w.target !== mine) { w.target = mine; w.repathT = 0; return; }
    if (w.target) return;
    if (Math.random() < dt * 4) {
      let best: Walker | null = null, bd = 7;
      for (const o of this.walkers) {
        if (!(o.mdef || o.fb) || o.down > 0 || o.asleep) continue;
        const d = Math.hypot(o.x - p.x, o.y - p.y);
        if (d < bd) { bd = d; best = o; }
      }
      if (best) { w.target = best; w.repathT = 0; if (!best.target) best.target = w; const go = w.noeulAlly ? L.crusadeAtk : L.marionetteGo; if (Math.random() < 0.25) this.bubble(w, go[Math.floor(Math.random() * go.length)]); return; }
    }
    if (dp > 2.6 && !moving) {
      const to = randomWalkTileNear(this.zone, Math.floor(p.x), Math.floor(p.y), 1, ['walk', 'lot', 'park', 'soi', 'cross']);
      const path = to ? findPath(this.zone, Math.floor(w.x), Math.floor(w.y), to[0], to[1]) : null;
      if (path) w.path = path.slice(0, 30);
    }
    if (!moving && dp < 3) w.dir = p.dir;
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
  private loots: { x: number; y: number; key: string; sprite: Container; life: number; n?: number; discard?: boolean; claimer?: Walker; hold?: boolean; gone?: boolean; death?: boolean }[] = [];
  dropLoot(x: number, y: number, key: string, life = 180) {
    const it = ITEMS.find((q) => q.key === key);
    if (!it) return;
    // 26차: 걸어갈 수 없는 칸(건물 벽·울타리)에 떨어지면 주울 수 없다 — 가장 가까운 바닥으로
    [x, y] = this.reachableSpot(x, y, 0.25, 0.2); // 35차: 닿지 않는 바닥(숲·늪 건너편)도 피한다
    const box = new Container();
    const glow = new Graphics().ellipse(0, 0, 9, 4).fill({ color: 0xffd27a, alpha: 0.35 });
    const icc = iconFor(it);
    const ic = new Sprite(Texture.from(icc));
    ic.texture.source.scaleMode = icc.dataset.hd ? 'linear' : 'nearest'; // 45차 후속: 고급 무기 그림(96칸)은 부드럽게 줄인다
    ic.anchor.set(0.5, 0.85); ic.scale.set(0.55 * 32 / icc.width);
    box.addChild(glow, ic);
    const cx = x + 0.25, cy = y + 0.2;
    const [sx, sy] = iso(cx, cy);
    box.position.set(sx, sy);
    box.zIndex = cx + cy - 0.35;
    this.objects.addChild(box);
    this.loots.push({ x: cx, y: cy, key, sprite: box, life });
  }
  /** 44차: 가방에서 버린 물건은 발치에 떨어져 보인다. 아무도 안 주우면 2~3분 뒤 둘레의 누군가(행인 · 영혼 · 불량배)가 와서 주워 간다 */
  dropDiscard(key: string, n: number) {
    const p = this.player;
    const before = this.loots.length;
    this.dropLoot(p.x + 0.6, p.y + 0.3, key, 140 + Math.random() * 60);
    const l = this.loots[before];
    if (!l) return;
    l.n = n; l.discard = true; l.hold = true;
    if (n > 1) { const tag = new Text({ text: `×${n}`, style: { fontFamily: 'sans-serif', fontSize: 9, fill: 0xffffff, stroke: { color: 0x000000, width: 3 }, fontWeight: '700' } }); tag.anchor.set(0, 1); tag.position.set(5, -2); l.sprite.addChild(tag); }
  }
  /** 주워 가러 온 이: 물건에 닿으면 집어 들고 한마디 */
  private thinkClaim(w: Walker, moving: boolean): boolean {
    const l = this.loots.find((x) => x.claimer === w);
    if (!l) { w.claimT = undefined; return false; }
    if (w.down > 0 || w.target) { l.claimer = undefined; w.claimT = undefined; return false; }
    if (Math.hypot(l.x - w.x, l.y - w.y) < 1) {
      l.sprite.destroy({ children: true }); this.loots.splice(this.loots.indexOf(l), 1);
      w.path = []; w.claimT = undefined; w.act = { anim: 'hit', t: 0 };
      const c = t().lootClaimed; this.bubble(w, c[Math.floor(Math.random() * c.length)]);
      return true;
    }
    if (!moving) { const path = findPath(this.zone, Math.floor(w.x), Math.floor(w.y), Math.floor(l.x), Math.floor(l.y)); if (path) w.path = path; else { l.claimer = undefined; w.claimT = undefined; return false; } }
    return true;
  }
  /** 쓰러진 자리에 들고 있던 노전과 물건을 떨어뜨린다 (오래 남는다) */
  dropOnDeath(notes: number, item: string | null) {
    const p = this.player;
    if (notes > 0) { this.dropCoin(p.x, p.y, notes, false, true); const c = this.coins[this.coins.length - 1]; c.life = 600; c.claimed = false; }
    if (item) { const n0 = this.loots.length; this.dropLoot(p.x + 0.5, p.y + 0.2, item, 600); const l = this.loots[n0]; if (l) l.death = true; else this.hooks.lostItem(item); }
  }
  private updateLoot(dt: number) {
    const p = this.player;
    for (let k = this.loots.length - 1; k >= 0; k--) {
      const l = this.loots[k];
      l.life -= dt;
      l.sprite.children[1].y = Math.sin(this.time * 3 + k) * 1.5;
      const dp = Math.hypot(l.x - p.x, l.y - p.y);
      if (l.hold && dp > 1.6) l.hold = false; // 44차: 방금 버린 물건은 한 번 멀어졌다 와야 다시 줍는다
      const close = !this.dead && !l.hold && dp < 1.0;
      if (close) { this.hooks.loot(l.key, l.n ?? 1); const it = ITEMS.find((q) => q.key === l.key); if (it) this.float(p, `+ ${it.name[lang()]}${(l.n ?? 1) > 1 ? ` ×${l.n}` : ''}`, '#ffd27a'); }
      // 44차: 버린 물건 — 때가 되면 둘레의 누군가가 주우러 온다 (오는 동안 25초 안에 못 닿으면 그냥 사라진다)
      if (!close && l.discard && l.life <= 0 && !l.claimer && !l.gone) {
        const who = this.walkers.filter((w) => !w.isPlayer && w.kind !== 'remote' && !w.mirror && w.down <= 0 && !w.target && !w.taxi && w.preach === undefined && !w.gdef && !w.fb && !w.mdef?.boss && w.speed > 0 && ['passer', 'thug', 'soul', 'fighter', 'monster', 'angel'].includes(w.kind) && Math.hypot(w.x - l.x, w.y - l.y) < 24 && !this.loots.some((o) => o.claimer === w));
        who.sort((a, b) => Math.hypot(a.x - l.x, a.y - l.y) - Math.hypot(b.x - l.x, b.y - l.y));
        l.gone = true;
        if (who[0]) { l.claimer = who[0]; who[0].claimT = 1; who[0].path = []; l.life = 25; continue; }
      }
      if (close || l.life <= 0) { if (l.claimer) l.claimer.claimT = undefined; if (!close && l.death) this.hooks.lostItem(l.key); l.sprite.destroy({ children: true }); this.loots.splice(k, 1); }
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
      if (w.down > 0) { w.slowT = 0; w.sealT = 0; w.burnT = 0; continue; }
      if (w.burnT && w.burnT > 0) { // 44차 불화살: 0.5초마다 타오른다 (잡으면 내 몫)
        w.burnT -= dt; w.burnAcc = (w.burnAcc ?? 0) + dt;
        const [x, y0] = iso(w.x, w.y), y = y0 - 30 * bk(w);
        for (let k = 0; k < 3; k++) { const fy = y - ((this.time * 40 + k * 9) % 18); top.ellipse(x - 5 + k * 5, fy, 2.2, 3.4).fill({ color: k % 2 ? 0xffb030 : 0xff5a1a, alpha: 0.8 }); }
        if (w.burnAcc >= 0.5) {
          w.burnAcc -= 0.5;
          const d = Math.max(1, Math.round((w.burnDps ?? 2) * 0.5));
          w.hp = Math.max(0, w.hp - d); w.barT = 5;
          if (w.mdef) w.pdmg = (w.pdmg ?? 0) + d;
          if (w.hp <= 0) { w.burnT = 0; this.knockDown(w, this.player); continue; }
        }
      }
      if (w.slowT && w.slowT > 0) {
        w.slowT -= dt;
        const [x, y] = iso(w.x, w.y);
        lo.ellipse(x, y + 1, 13, 5).fill({ color: 0x4a3a22, alpha: 0.6 });
        lo.ellipse(x - 4, y, 3, 1.5).fill({ color: 0x8a6a42, alpha: 0.7 });
      }
      if (w.sealT && w.sealT > 0) {
        w.sealT -= dt;
        const [x, y0] = iso(w.x, w.y), y = y0 - 58 * bk(w), sp = this.time * 2.2;
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
      if (!m.mdef || m.mdef.boss || m.fb || m.down > 0) continue;
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
          if (tg.isPlayer) { this.shakeT = Math.max(this.shakeT, 0.12); this.shakeA = Math.max(this.shakeA, 2.5); } // 45차 후속: 탈루스가 남을 쏠 때는 내 화면을 흔들지 않는다
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
        if (!m.mdef || m.fb || m.mirror || m.down > 0 || !this.nearRest(m.x, m.y, 6)) continue; // 31차: 필드 보스는 경비병이 건드리지 않는다 (영혼들이 잡는 것)
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
    if (this.bossDown && !this.litPath) this.makeLitPath(false);
  }
  /** 44차: 층주가 쓰러지면 층주의 자리에서 위층 길까지 빛이 켜진다 (쓰러진 순간엔 층주 쪽에서부터 차례로 번진다) */
  private litPath: { g: Graphics; pts: [number, number][]; t: number } | null = null;
  private makeLitPath(reveal: boolean) {
    const h = this.zone.hell;
    if (!h || this.zone.interior) return;
    const a = this.nearestWalkable(h.boss.i, h.boss.j + 1) ?? [h.boss.i, h.boss.j];
    const sU = h.safes?.find((q) => q.kind === 'stairUp');
    const b = this.nearestWalkable(sU ? sU.i : h.up.i, sU ? sU.j : h.up.j + 2) ?? [h.up.i, h.up.j];
    const path = findPath(this.zone, a[0], a[1], b[0], b[1]);
    if (!path?.length) return;
    const pts: [number, number][] = [[a[0], a[1]], ...path.map(([i, j]) => [i, j] as [number, number])];
    const g = new Graphics(); g.blendMode = 'add'; g.zIndex = 0.6; g.eventMode = 'none';
    this.objects.addChild(g);
    this.litPath = { g, pts, t: reveal ? 0 : 99 };
  }
  private updateLitPath(dt: number) {
    const lp = this.litPath;
    if (!lp) return;
    if (lp.g.destroyed) { this.litPath = null; return; }
    lp.t += dt;
    const g = lp.g;
    g.clear();
    const T = this.time;
    lp.pts.forEach(([i, j], k) => {
      const on = Math.min(1, Math.max(0, (lp.t * 14 - k) / 4)); // 쓰러진 순간: 초당 14칸씩 번진다
      if (on <= 0) return;
      const [x, y] = iso(i + 0.5, j + 0.5);
      const a = (0.35 + 0.25 * Math.sin(T * 3 - k * 0.45)) * on;
      g.ellipse(x, y, 26, 12).fill({ color: 0xffc860, alpha: a * 0.45 });
      g.ellipse(x, y, 12, 5.5).fill({ color: 0xfff0b0, alpha: a * 0.7 });
      if (k % 3 === 0) { const fy = y - 6 - ((T * 18 + k * 7) % 22); g.rect(x - 1, fy, 2, 2).fill({ color: 0xffe8a0, alpha: a }); }
    });
  }
  /** 44차 층주가 쓰러지는 순간: 길게 멈칫 · 크게 흔들림 · 하얀 번쩍임 · 금빛 불티 */
  private bossFallFx(w: Walker) {
    this.hitStop = Math.max(this.hitStop, 0.5);
    this.shakeT = Math.max(this.shakeT, 1.1); this.shakeA = Math.max(this.shakeA, 14);
    this.burst(w.x, w.y, 0xffd27a, 60);
    this.burst(w.x, w.y, 0xffffff, 30);
    sfx.gateOpen();
    if (this.litPath) { this.litPath.g.destroy(); this.litPath = null; }
    this.makeLitPath(true);
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
    const p = this.netRole === 'host' ? this.leastBody() : this.player;
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
    // 44차: 깊은 들판 · 층주의 터의 괴물은 사납다 (체력 1.9배 · 피해 1.5배 · 노전과 영격 두 배쯤)
    if (this.zone.hell && !m.boss && this.regionAt(i, j) % 3 !== 0) w.elite = true;
    if (w.elite) w.size = (w.size ?? 1) * 1.08;
    w.maxHp = w.hp = Math.round(m.hp * (1 + 0.25 * (f - 1) * (m.boss ? 0 : 1)) * (w.elite ? 1.9 : 1) * floorCurve(f).hp); // 46차: 6층부터 곡선을 더 얹는다 // 26차: 무기 공격력 폭을 좁힌 만큼 층마다 덜 단단하게 (0.35 → 0.25)
    w.speed = m.speed;
    w.voice = 0.8 + Math.random() * 0.3;
    if (m.ghost) w.sprite.alpha = 0.72; // 회색 망령: 반쯤 비친다
    return w;
  }
  /** 휴식 공간 안인가 (싸움 불가, 괴물은 못 들어옴) */
  private inRest(x: number, y: number) {
    const h = this.zone.hell;
    if (!h) return false;
    if (this.inSafe(x, y)) return true; // 44차: 층계 대기소 · 광산 작업장도 괴물이 못 들어온다 (습격 때도)
    if (this.raid) return false; // 4층부터: 결계가 걷힌 동안은 마을도 들판과 같다
    for (const r of h.villages ?? [h.rest]) if (Math.abs(x - (r.i + 0.5)) < r.r && Math.abs(y - (r.j + 0.5)) < r.r) return true; // 44차: 둘째 마을도
    return false;
  }
  /** 44차 보호구역(층계 대기소 · 광산 작업장): 괴물이 못 들어오고 영혼끼리 싸울 수 없다 */
  private inSafe(x: number, y: number): { kind: 'stairUp' | 'stairDown' | 'mine' } | null {
    for (const q of this.zone.hell?.safes ?? []) if (Math.abs(x - (q.i + 0.5)) <= q.r + 0.5 && Math.abs(y - (q.j + 0.5)) <= q.r + 0.5) return q;
    return null;
  }
  /** 44차 구역: 0 들판 · 1 깊은 들판 · 2 층주의 터 · 3 광산 */
  regionAt(x: number, y: number): number {
    const h = this.zone.hell;
    if (!h?.region) return 0;
    const i = Math.floor(x), j = Math.floor(y);
    if (i < 0 || j < 0 || i >= this.zone.W || j >= this.zone.H) return 0;
    return h.region[j * this.zone.W + i];
  }
  /** 44차: 쓰러진 자리에서 가장 가까운 마을 (일부러 쓰러져 건너가는 영혼들) */
  nearestVillage(): { i: number; j: number; k: number } {
    const h = this.zone.hell!;
    const vs = h.villages ?? [h.rest];
    const p = this.player;
    let k = 0, bd = Infinity;
    vs.forEach((v, n) => { const d = Math.hypot(v.i - p.x, v.j - p.y); if (d < bd) { bd = d; k = n; } });
    return { i: vs[k].i, j: vs[k].j, k };
  }
  /** 44차: 지금 선 곳 — 마을 몇째 · 보호구역 · 구역 (바뀌면 알린다) */
  private areaKey = '';
  private areaT = 0;
  private updateArea(dt: number) {
    const h = this.zone.hell;
    if (!h || this.zone.interior || this.dead) return;
    this.areaT -= dt;
    if (this.areaT > 0) return;
    this.areaT = 0.5;
    const p = this.player;
    const safe = this.inSafe(p.x, p.y);
    const vi = (h.villages ?? [h.rest]).findIndex((r) => Math.abs(p.x - (r.i + 0.5)) < r.r && Math.abs(p.y - (r.j + 0.5)) < r.r);
    const key = safe ? `s:${safe.kind}` : vi >= 0 ? `v:${vi}` : `r:${this.regionAt(p.x, p.y)}`;
    if (key === this.areaKey) return;
    const first = !this.areaKey;
    this.areaKey = key;
    if (first && key.startsWith('r:0')) return;
    this.hooks.hellArea(key, h.floor);
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

  /**
   * 33차: 지도 밖 거울 거리에도 오가는 차와 행인 그림자 — 화면에 지도 밖이 보일 때만 몇 대·몇 명씩 (부딪히지도, 고를 수도 없다)
   */
  private beyondLife: { cars: { s: Sprite; x: number; j: number; dir: 1 | -1; v: number; end: number; on: boolean }[]; peds: { s: Sprite; x: number; y: number; dx: number; dy: number; t: number; on: boolean; ph: number }[]; t: number; cs: CharSet | null } | null = null;
  private setupBeyondLife() {
    if (!this.zone.beyond || this.realm !== 'real' || this.zone.interior) return;
    const bl: NonNullable<typeof this.beyondLife> = { cars: [], peds: [], t: 0, cs: null };
    for (let n = 0; n < 7; n++) { const s = new Sprite(); s.visible = false; s.eventMode = 'none'; this.objects.addChild(s); bl.cars.push({ s, x: 0, j: 0, dir: 1, v: 4, end: 0, on: false }); }
    for (let n = 0; n < 10; n++) { const s = new Sprite(); s.visible = false; s.eventMode = 'none'; s.tint = 0x14141a; s.alpha = 0.55; this.objects.addChild(s); bl.peds.push({ s, x: 0, y: 0, dx: 0, dy: 0, t: 0, on: false, ph: Math.random() * 4 }); }
    void charSet({ sex: 'm', build: 1, skin: 0, hair: 1, hairColor: 0, top: 0, bottom: 0, outfit: 'casual' }).then((cs) => { bl.cs = cs; });
    this.beyondLife = bl;
  }
  private updateBeyondLife(dt: number) {
    const bl = this.beyondLife, z = this.zone, by = z.beyond;
    if (!bl || !by) return;
    const m = by.m, W = z.W, H = z.H;
    const out = (i: number, j: number) => i < m || j < m || i >= W - m || j >= H - m;
    const r = this.visibleRange(false);
    const showsOut = r.i0 < m + 2 || r.j0 < m + 2 || r.i1 > W - m - 2 || r.j1 > H - m - 2;
    bl.t -= dt;
    if (showsOut && bl.t <= 0) {
      bl.t = 0.35;
      // 차: 화면에 걸친 바깥 차선 하나를 골라 화면 끝에서 끝으로
      const c = bl.cars.find((q) => !q.on);
      if (c) {
        const lanes = by.lanes.filter((l) => l.j >= r.j0 - 1 && l.j <= r.j1 + 1 && l.i1 > r.i0 && l.i0 < r.i1 && (out(Math.max(l.i0, Math.floor(r.i0)), l.j) || out(Math.min(l.i1, Math.floor(r.i1)), l.j)));
        const l = lanes[Math.floor(Math.random() * lanes.length)];
        if (l) {
          const a = Math.max(l.i0, r.i0 - 3), b = Math.min(l.i1, r.i1 + 3);
          const ct = carSprite((z.city === 'seoul' ? SEOUL_CARS : CAR_MODELS)[Math.floor(Math.random() * (z.city === 'seoul' ? SEOUL_CARS.length : CAR_MODELS.length))], l.dir);
          if (ct && b - a > 6) {
            c.s.texture = ct.tex; c.s.anchor.set(ct.ax, ct.ay);
            Object.assign(c, { x: l.dir > 0 ? a : b, j: l.j + 0.5, dir: l.dir, v: 3.5 + Math.random() * 2.5, end: l.dir > 0 ? b : a, on: true });
          }
        }
      }
      // 행인 그림자: 화면 안 바깥 보도에서 나타나 보도를 따라 걷는다
      const pd = bl.peds.find((q) => !q.on);
      if (pd && bl.cs) {
        for (let tries = 0; tries < 12; tries++) {
          const i = Math.floor(r.i0 + Math.random() * (r.i1 - r.i0)), j = Math.floor(r.j0 + Math.random() * (r.j1 - r.j0));
          if (!out(i, j)) continue;
          const tt = groundAt(z, i, j);
          if (tt !== 'walk' && tt !== 'soi') continue;
          const alongI = groundAt(z, i + 1, j) === tt || groundAt(z, i - 1, j) === tt;
          const sg = Math.random() < 0.5 ? 1 : -1;
          Object.assign(pd, { x: i + 0.5, y: j + 0.5, dx: alongI ? sg : 0, dy: alongI ? 0 : sg, t: 6 + Math.random() * 8, on: true });
          break;
        }
      }
    }
    for (const c of bl.cars) {
      if (!c.on) { c.s.visible = false; continue; }
      c.x += c.dir * c.v * dt;
      if ((c.dir > 0 && c.x > c.end) || (c.dir < 0 && c.x < c.end) || !out(Math.floor(c.x), Math.floor(c.j))) { c.on = false; c.s.visible = false; continue; }
      const [sx, sy] = iso(c.x, c.j);
      c.s.position.set(sx, sy); c.s.zIndex = c.x + c.j; c.s.visible = true;
    }
    for (const p of bl.peds) {
      if (!p.on || !bl.cs) { p.s.visible = false; continue; }
      p.t -= dt;
      const nx = p.x + p.dx * 1.1 * dt, ny = p.y + p.dy * 1.1 * dt;
      const tt = groundAt(z, Math.floor(nx), Math.floor(ny));
      if (p.t <= 0 || !out(Math.floor(nx), Math.floor(ny)) || (tt !== 'walk' && tt !== 'soi' && tt !== 'cross')) { p.on = false; p.s.visible = false; continue; }
      p.x = nx; p.y = ny; p.ph += dt * 8;
      const dir: Dir = p.dx > 0 ? 'se' : p.dx < 0 ? 'nw' : p.dy > 0 ? 'sw' : 'ne';
      applyFrame(p.s, frameOf(bl.cs, 'walk', dir, Math.floor(p.ph) % (bl.cs.counts.walk ?? 1)), BODY_K);
      const [sx, sy] = iso(p.x, p.y);
      p.s.position.set(sx, sy); p.s.zIndex = p.x + p.y; p.s.visible = true;
      p.s.alpha = Math.min(0.55, p.t * 0.4);
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
  /** 34차 관리자 성능 표시: 장면에 올라간 것들의 수 */
  perfInfo() {
    let sprites = 0;
    const walk = (c: Container) => { for (const ch of c.children) { sprites++; if ((ch as Container).children?.length) walk(ch as Container); } };
    walk(this.root);
    return { walkers: this.walkers.length, objects: this.objects.children.length, sprites, zone: this.zone.id, W: this.zone.W, H: this.zone.H, room: this.zone.interior?.kind ?? '' };
  }
  setGear(g: Gear) {
    // 45차: 천국에서도 천국의 무기는 든다 (침공한 악마와 싸우려고) — 다른 세계의 무기는 gear()가 이미 뺐다
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
    const end = p.path.length ? p.path[p.path.length - 1] : null;
    return {
      x: Math.round(p.x * 100) / 100, y: Math.round(p.y * 100) / 100, d: p.dir, m: p.path.length ? 1 : 0,
      t: end ? [end[0] + 0.5, end[1] + 0.5] : undefined,
      v: end ? Math.round(p.speed * (isDanger(p.hp, p.maxHp) ? DANGER_SPEED : 1) * 100) / 100 : undefined,
      a: p.act && p.act.anim !== 'fall' ? p.act.anim : undefined,
      h: Math.round((p.hp / p.maxHp) * 100) / 100,
      c: this.criminalT > 0 ? 1 : undefined,
      k: this.dead ? 1 : undefined,
    };
  }
  /** 42차: 내 둘레 40칸 안에 다른 사람이 없다 (보내는 횟수를 더 줄인다) */
  get netAlone() { const p = this.player; return !this.walkers.some((w) => w.kind === 'remote' && !w.lingerT && Math.hypot(w.x - p.x, w.y - p.y) < 40); }
  /** 실시간: 다른 사람 나타남·움직임 */
  // ───────────────────────── 42차: 죽은 뒤 건너가는 장면 ─────────────────────────
  // 세상이 멈추고(차·사람·괴물 모두 그 자리에) 쓰러진 몸과 장면에 나오는 이들만 움직인다. 회색으로 바래는 것·글·어둠은 main(passage.ts)이 맡는다
  private passage = false;
  private passFx: ((dt: number) => void) | null = null;
  passageStart() {
    this.passage = true;
    for (const w of this.walkers) { w.path = []; w.target = null; if (w.bubble) w.bubble.visible = false; }
    this.ring.visible = false; this.reachRing.visible = false; this.arrow.visible = false; this.danger.clear();
    this.labelT = 0; this.drawLabel(null);
  }
  private updatePassage(dt: number) {
    this.time += dt;
    for (const w of this.walkers) {
      if (!w.actor && !w.isPlayer) continue;
      let moving = false;
      if (w.glide) {
        const g = w.glide, dx = g.tx - w.x, dy = g.ty - w.y, d = Math.hypot(dx, dy);
        if (d > 0.02) {
          const st = Math.min(d, g.v * dt);
          w.x += (dx / d) * st; w.y += (dy / d) * st;
          if (!w.isPlayer || !this.dead) { moving = true; w.dir = dirFromTile(dx, dy, w.dir); }
        } else w.glide = undefined;
      }
      w.anim = moving ? w.anim + dt * (w.glide?.v ?? 1) * 8.5 : 0;
      this.pose(w, moving, dt);
      const [sx, sy] = iso(w.x, w.y);
      w.sprite.position.set(sx, sy + (w.sink ?? 0));
      w.sprite.zIndex = w.x + w.y + (w.isPlayer && this.dead ? -0.3 : 0) + (w.zb ?? 0);
    }
    this.passFx?.(dt);
  }
  /** 장면에 나오는 이 (그림을 다 불러온 뒤에 세운다) */
  private async passActor(look: Look, x: number, y: number) {
    await charSet(look);
    const w = this.makeWalker(look, Math.floor(x), Math.floor(y), 'passer');
    w.x = x; w.y = y; w.actor = true; w.speed = 1;
    this.walkers.push(w);
    return w;
  }
  /** 화면 오른쪽(+1,-1) 방향으로 화면 끝까지의 칸 수 */
  private halfTiles() { return this.app.screen.width / 2 / this.zoom / TW + 1.4; }
  private after(ms: number) { return new Promise<void>((r) => setTimeout(r, ms)); }
  private glideTo(w: Walker, x: number, y: number, v: number) { w.glide = { tx: x, ty: y, v }; }
  /** 발소리 (걷는 동안 0.45초마다) */
  private steps(sec: number, heavy: boolean) { const n = Math.floor(sec / 0.45); for (let k = 0; k < n; k++) setTimeout(() => sfx.step(heavy), k * 450); }

  /**
   * 지옥으로 끌려간다 — 세 가지 중 하나:
   * 0 검은 판초를 길게 뒤집어쓴 성게머리 악마 둘이 화면 밖 양쪽에서 걸어와, 몸을 끌고 화면 밖으로 사라진다
   * 1 갓을 쓴 저승사자가 검은 문을 열고 나와, 몸에서 일어선 넋을 데리고 문 안으로 사라진다 (문이 닫힌다)
   * 2 땅이 갈라지고 거대한 검은 짐승의 손이 솟아 몸을 움켜쥐고 땅 아래로 가라앉는다
   * 끝날 무렵(어둠이 내려도 될 때) 돌아온다
   */
  async hellTake(kind: 0 | 1 | 2) {
    const p = this.player, P = { x: p.x, y: p.y };
    if (kind === 0) {
      const h = this.halfTiles();
      const [L, R] = await Promise.all([this.passActor(PONCHO_DEMON, P.x - h, P.y + h), this.passActor(PONCHO_DEMON, P.x + h, P.y - h - 0.4)]);
      const tIn = 3.0, v = (h * Math.SQRT2) / tIn;
      this.glideTo(L, P.x - 0.6, P.y + 0.6, v); this.glideTo(R, P.x + 0.62, P.y - 0.62, v);
      this.steps(tIn, true);
      await this.after(tIn * 1000 + 250);
      L.dir = dirFromTile(P.x - L.x, P.y - L.y, L.dir); R.dir = dirFromTile(P.x - R.x, P.y - R.y, R.dir);
      await this.after(1100);
      // 끌고 간다: 화면 왼쪽 아래로 (몸은 둘 사이에서 질질 끌린다)
      const T = { x: P.x - h - 1.5, y: P.y + h + 2.5 }, v2 = 0.95;
      this.glideTo(L, T.x - 0.6, T.y + 0.6, v2); this.glideTo(p, T.x, T.y, v2); this.glideTo(R, T.x + 0.62, T.y - 0.62, v2);
      this.steps(3.6, true);
      await this.after(3200);
      return;
    }
    if (kind === 1) {
      const D = { x: P.x + 1.45, y: P.y - 1.45 };
      const g = new Graphics();
      g.zIndex = 1e6 - 30; // 문은 이 세상 것이 아니다: 고가·차양에 가리지 않고 앞에 선다 (나오는 이와 넋은 그보다 앞)
      this.objects.addChild(g);
      let alpha = 0, open = 0, smoke: { x: number; y: number; r: number; t: number }[] = [];
      const [dx0, dy0] = iso(D.x, D.y);
      const DW = 44, DH = 84;
      this.passFx = (dt) => {
        if (Math.random() < dt * 14 * alpha) smoke.push({ x: dx0 + (Math.random() - 0.5) * DW * 1.3, y: dy0 - Math.random() * 10, r: 4 + Math.random() * 6, t: 0 });
        smoke = smoke.filter((q) => (q.t += dt) < 1.6);
        g.clear();
        for (const q of smoke) g.circle(q.x, q.y - q.t * 18, q.r + q.t * 10).fill({ color: 0x080606, alpha: 0.35 * (1 - q.t / 1.6) * alpha });
        if (alpha <= 0) return;
        // 문틀: 검게 옻칠한 두 기둥과 지붕돌, 안은 빛 하나 없는 어둠
        g.rect(dx0 - DW / 2 - 6, dy0 - DH - 10, DW + 12, 10).fill({ color: 0x141012, alpha });
        g.rect(dx0 - DW / 2 - 9, dy0 - DH - 14, DW + 18, 5).fill({ color: 0x0c0a0a, alpha });
        g.rect(dx0 - DW / 2 - 6, dy0 - DH, 6, DH).fill({ color: 0x141012, alpha });
        g.rect(dx0 + DW / 2, dy0 - DH, 6, DH).fill({ color: 0x141012, alpha });
        g.rect(dx0 - DW / 2, dy0 - DH, DW, DH).fill({ color: 0x000000, alpha });
        // 문짝 둘: 열릴수록 좁아지며 안쪽으로 젖혀진다
        const ww = (DW / 2) * (1 - open);
        if (ww > 0.5) {
          g.poly([dx0 - DW / 2, dy0 - DH, dx0 - DW / 2 + ww, dy0 - DH + open * 6, dx0 - DW / 2 + ww, dy0 - open * 6, dx0 - DW / 2, dy0]).fill({ color: 0x1a1618, alpha });
          g.poly([dx0 + DW / 2, dy0 - DH, dx0 + DW / 2 - ww, dy0 - DH + open * 6, dx0 + DW / 2 - ww, dy0 - open * 6, dx0 + DW / 2, dy0]).fill({ color: 0x1a1618, alpha });
          for (const sx of [-1, 1]) for (const fy of [0.25, 0.5, 0.75]) g.circle(dx0 + sx * (DW / 2 - ww * 0.82), dy0 - DH * fy, 1.6).fill({ color: 0x3a3436, alpha });
        }
        g.ellipse(dx0, dy0 + 2, DW * 0.7, 7).fill({ color: 0x000000, alpha: 0.4 * alpha });
      };
      const fade = async (to: number, sec: number, set: (v: number) => void, from: number) => { const n = Math.max(1, Math.round(sec * 30)); for (let k = 1; k <= n; k++) { set(from + (to - from) * (k / n)); await this.after(1000 / 30); } };
      await fade(1, 1.1, (v) => (alpha = v), 0);
      sfx.doorCreak();
      await fade(1, 1.0, (v) => (open = v), 0);
      const rp = await this.passActor(REAPER_LOOK, D.x, D.y);
      rp.sprite.alpha = 0; rp.zb = 1e6;
      for (let k = 1; k <= 10; k++) setTimeout(() => (rp.sprite.alpha = k / 10), k * 50);
      this.glideTo(rp, P.x + 0.55, P.y - 0.55, 0.75);
      this.steps(1.6, false);
      await this.after(1700);
      rp.dir = dirFromTile(P.x - rp.x, P.y - rp.y, rp.dir);
      await this.after(700);
      // 몸에서 넋이 일어선다 (반쯤 비친 같은 모습)
      const soul = await this.passActor({ ...p.look }, P.x, P.y);
      soul.sprite.alpha = 0; soul.zb = 1e6;
      soul.dir = dirFromTile(rp.x - P.x, rp.y - P.y, p.dir);
      for (let k = 1; k <= 12; k++) setTimeout(() => (soul.sprite.alpha = 0.55 * (k / 12)), k * 60);
      await this.after(1100);
      this.glideTo(rp, D.x, D.y, 0.7);
      setTimeout(() => this.glideTo(soul, D.x, D.y, 0.7), 450);
      this.steps(2.4, false);
      // 문턱을 넘으면 어둠에 녹는다
      const melt = (w: Walker, a0: number) => { const id = setInterval(() => { if (w.sprite.destroyed) { clearInterval(id); return; } if (Math.hypot(w.x - D.x, w.y - D.y) < 0.5) { w.sprite.alpha = Math.max(0, w.sprite.alpha - 0.08 * a0); if (w.sprite.alpha <= 0) clearInterval(id); } }, 33); };
      melt(rp, 1); melt(soul, 0.55);
      await this.after(2700);
      sfx.doorCreak(true);
      await fade(0, 0.6, (v) => (open = v), 1);
      await this.after(300);
      return;
    }
    // 2: 짐승의 손
    const tex = beastHand();
    const [px0, py0] = iso(P.x, P.y);
    const pit = new Graphics(); pit.zIndex = P.x + P.y - 0.6;
    const hand = new Sprite(tex.open); hand.anchor.set(0.5, 1); hand.scale.set(0.5);
    hand.position.set(px0, py0 + 150); hand.zIndex = 1e6 - 30; // 손은 고가·차양에 가리지 않는다
    const mask = new Graphics().rect(px0 - 220, py0 - 420, 440, 422).fill(0xffffff);
    this.objects.addChild(pit, hand, mask);
    hand.mask = mask;
    let r = 0, shake = 0, close = 0;
    const cracks = Array.from({ length: 9 }, (_, k) => ({ a: (k / 9) * Math.PI * 2 + Math.random() * 0.4, l: 0.8 + Math.random() * 0.8 }));
    this.passFx = () => {
      pit.clear();
      if (r > 0) {
        for (const c of cracks) { const L = 50 * r * c.l; pit.moveTo(px0, py0).lineTo(px0 + Math.cos(c.a) * L, py0 + Math.sin(c.a) * L * 0.5); }
        pit.stroke({ color: 0x050404, width: 2 });
        pit.ellipse(px0, py0, 40 * r * (1 - close * 0.9), 15 * r * (1 - close * 0.9)).fill(0x000000);
        pit.ellipse(px0, py0 - 1, 44 * r * (1 - close * 0.9), 17 * r * (1 - close * 0.9)).stroke({ color: 0x2a2424, width: 2 });
      }
      this.root.position.set(shake ? (Math.random() * 2 - 1) * shake : 0, shake ? (Math.random() * 2 - 1) * shake * 0.6 : 0);
    };
    const tween = async (sec: number, f: (k: number) => void) => { const n = Math.max(1, Math.round(sec * 30)); for (let k = 1; k <= n; k++) { f(k / n); await this.after(1000 / 30); } };
    sfx.groundCrack();
    shake = 3;
    await tween(0.9, (k) => (r = k));
    await tween(1.1, (k) => { hand.y = py0 + 150 - 150 * (1 - (1 - k) * (1 - k)); });
    shake = 1;
    await this.after(500);
    // 움켜쥔다: 주먹이 몸을 감싼다 (몸은 주먹 안으로)
    hand.texture = tex.fist;
    p.sprite.visible = false; p.sprite.alpha = 0;
    sfx.thud(sfx.spot(0, 0));
    shake = 4;
    await this.after(700);
    shake = 2;
    await tween(1.3, (k) => { hand.y = py0 + 150 * k * k; });
    shake = 0;
    await tween(0.6, (k) => (close = k));
    await this.after(400);
    this.root.position.set(0, 0);
  }
  /** 천국으로: 몸 위로 빛기둥이 내리고, 하얗게 빛나는 넋이 일어나 위로 떠오른다 */
  async soulRise() {
    const p = this.player, cs = p.cs;
    const [sx, sy] = iso(p.x, p.y);
    // 세상은 저물녘처럼 어두워지고(빛과 넋만 밝다), 빛기둥과 넋은 고가·차양에 가리지 않는 맨 위 층에
    const dusk = new ColorMatrixFilter(); dusk.brightness(0.55, false); dusk.saturate(-0.35, true);
    this.ground.filters = [dusk]; this.objects.filters = [dusk];
    const top = new Container(); this.camera.addChild(top);
    const beam = new Graphics();
    beam.blendMode = 'add';
    top.addChild(beam);
    const soul = new Sprite(), glow = new Sprite();
    const f = cs ? frameOf(cs, 'idle', 'sw', 0) : null;
    if (f) { applyFrame(soul, f, bk(p)); applyFrame(glow, f, bk(p)); }
    const white = new ColorMatrixFilter();
    white.matrix = [0, 0, 0, 0, 1, 0, 0, 0, 0, 0.97, 0, 0, 0, 0, 0.86, 0, 0, 0, 1, 0];
    soul.filters = [white];
    const white2 = new ColorMatrixFilter(); white2.matrix = white.matrix.slice() as typeof white.matrix;
    glow.filters = [white2, new BlurFilter({ strength: 10 })];
    glow.scale.x *= 1.25; glow.scale.y *= 1.12;
    glow.blendMode = 'add';
    for (const s of [glow, soul]) { s.alpha = 0; s.position.set(sx, sy); top.addChild(s); }
    let b = 0;
    this.passFx = () => {
      beam.clear();
      if (b <= 0) return;
      for (let k = 0; k < 12; k++) beam.rect(sx - 20 + k * 1.4, sy - 560, 40 - k * 2.8, 560).fill({ color: 0xffe8a8, alpha: 0.03 * b });
      beam.ellipse(sx, sy, 30, 11).fill({ color: 0xfff0c0, alpha: 0.3 * b });
    };
    const tween = async (sec: number, fn: (k: number) => void) => { const n = Math.max(1, Math.round(sec * 30)); for (let k = 1; k <= n; k++) { fn(k / n); await this.after(1000 / 30); } };
    await tween(0.9, (k) => (b = k));
    await tween(0.8, (k) => { soul.alpha = 0.95 * k; glow.alpha = 0.9 * k; });
    await tween(2.6, (k) => { const y = sy - 190 * k * k, sw = Math.sin(k * 6) * 3; soul.position.set(sx + sw, y); glow.position.set(sx + sw, y); soul.alpha = 0.95 * (1 - k * 0.4); glow.alpha = 0.9 * (1 - k * 0.2); });
  }
  /** 염소대왕과 이야기하기 전에는 방을 나갈 수 없다: 판관석에서 한마디 */
  gkBlock() {
    const k = this.walkers.find((w) => w.kind === 'goatking');
    if (!k) return;
    const c = t().gkWait;
    this.bubble(k, c[Math.floor(Math.random() * c.length)]);
  }
  /** 경계의 해변 · 지옥 방에서 깨어난다: 잠시 누워 있다가 일어선다 */
  wakeUp(sec: number) {
    const p = this.player;
    p.down = sec; p.act = null; p.path = []; p.target = null;
  }
  /** 천국에 닿은 뒤: 황색날개가 곁에 와 선다 (없으면 불러온다) */
  ywMeet() {
    if (this.realm !== 'heaven') return false;
    const p = this.player;
    let yw = this.walkers.find((w) => w.kind === 'yellowwing');
    const spot = this.nearestWalkable(Math.floor(p.x + 1), Math.floor(p.y)) ?? [Math.floor(p.x), Math.floor(p.y)];
    if (!yw) yw = this.makeYellowWing(spot[0], spot[1]);
    yw.x = spot[0] + 0.5; yw.y = spot[1] + 0.5; yw.path = []; yw.wait = 8;
    yw.dir = dirFromTile(p.x - yw.x, p.y - yw.y, yw.dir);
    p.dir = dirFromTile(yw.x - p.x, yw.y - p.y, p.dir);
    return true;
  }

  // ───────────────────────── 41차: 몹 나누기 (구역 방장) ─────────────────────────
  // 방장 기기가 이 구역의 행인·적·괴물·필드 보스를 움직이고 0.2초마다 나눠 준다. 손님은 그것을 비춰(거울) 그리고,
  // 때리면 방장에게 알린다. 쓰러뜨린 사람의 기기에 돈·물건·행위가 남는다. (나중에 전용 서버가 방장 자리를 맡는다)
  netRole: 'solo' | 'host' | 'guest' = 'solo';
  mobOut: MobOut | null = null;
  private netHost = '';
  private nidSeq = 0;
  private sentSig = new Map<number, string>();
  private mirrors = new Map<number, Walker>();
  private snapT = 0;
  private topT = 3;
  private reqT = 0;
  private askIds = new Set<number>();
  /** 나누는 것: 행인 · 거리의 적 · 지옥 괴물(층주 포함) · 필드 보스. 장사꾼·경비병·천사·따라오는 이·쫓아오는 대식자는 각자 */
  private isShared(w: Walker): boolean {
    if (w.isPlayer || w.kind === 'remote' || w.mirror) return false;
    if (w.fb) return true;
    if (w.kind === 'monster') return !!w.mdef && !w.invader;
    if (w.kind === 'passer') return !w.tail && !w.vend && !w.still;
    return w.kind === 'thug';
  }
  /** 몹이 볼 수 있는 사람들: 나 + (방장이면) 같은 구역 손님들 */
  private bodies(): Walker[] {
    const out: Walker[] = [];
    if (!this.dead) out.push(this.player);
    if (this.netRole === 'host') for (const w of this.walkers) if (w.kind === 'remote' && !w.lingerT && w.down <= 0 && !w.rinfo?.hidden) out.push(w);
    if (!out.length) out.push(this.player);
    return out;
  }
  private nearestBody(w: Walker): Walker {
    let best = this.player, bd = Infinity;
    for (const b of this.bodies()) { const d = Math.hypot(b.x - w.x, b.y - w.y); if (d < bd) { bd = d; best = b; } }
    return best;
  }
  /** 새 몹이 날 자리: 둘레에 몹이 가장 적은 사람 곁 */
  private leastBody(): Walker {
    const bs = this.bodies();
    if (bs.length === 1) return bs[0];
    let best = bs[0], bn = Infinity;
    for (const b of bs) {
      let n = 0;
      for (const w of this.walkers) if (this.isShared(w) && Math.hypot(w.x - b.x, w.y - b.y) < 24) n++;
      if (n < bn) { bn = n; best = b; }
    }
    return best;
  }
  /** 방장이 정해졌다 (main.ts → net.ts 에서) */
  setNet(host: boolean, hostId: string, peers: number) {
    const role: 'solo' | 'host' | 'guest' = peers === 0 ? 'solo' : host ? 'host' : 'guest';
    this.netHost = hostId;
    const prev = this.netRole;
    if (role === prev) return;
    this.netRole = role;
    this.sentSig.clear();
    if (role === 'guest') {
      // 손님이 되었다: 내 기기가 만든 몹은 걷어 내고 방장의 것을 비춘다
      for (const w of this.walkers.slice()) if (this.isShared(w)) { if (this.player.target === w) this.player.target = null; this.removeWalker(w); }
      this.mirrors.clear();
    } else if (prev === 'guest') {
      // 방장이 되었다 (먼저 온 사람이 떠났다): 비추던 것을 걷고 내 기기가 새로 채운다
      for (const w of this.mirrors.values()) { if (this.player.target === w) this.player.target = null; this.removeWalker(w); }
      this.mirrors.clear();
      this.populateShared();
    }
  }
  private populateShared() {
    if (this.zone.interior || this.realm === 'ghost' || this.realm === 'border') return;
    if (this.zone.hell) {
      for (let k = 0; k < this.sharedBase().monster; k++) this.spawnMonster();
      if (!this.bossDown && !this.walkers.some((w) => w.mdef?.boss)) this.spawnBoss();
      if (FIELD_BOSS[this.zone.hell.floor]) this.spawnFieldBosses();
      return;
    }
    const b = this.sharedBase();
    for (let n = 0; n < b.passer; n++) this.spawnNpc('passer');
    for (let n = 0; n < b.thug; n++) this.spawnNpc('thug');
    if (this.realm === 'real' && this.zone.city !== 'seoul') this.spawnFieldBosses();
  }
  private sharedBase(): { passer: number; thug: number; monster: number } {
    if (this.zone.hell) return { passer: 0, thug: 0, monster: this.zone.hell.floor === 1 ? 22 : 12 };
    if (this.realm === 'heaven') return { passer: PED_COUNT, thug: 0, monster: 0 };
    return { passer: PED_COUNT + (this.realm === 'real' ? 10 : 0), thug: this.streetHostiles(), monster: 0 };
  }
  /** 손님이 있으면 몹을 더 (손님 한 명에 8할씩, 셋까지) · 손님이 떠나면 아무도 없는 곳의 몹부터 줄인다 */
  private topUp() {
    if (this.zone.interior || this.realm === 'ghost' || this.realm === 'border') return;
    const bs = this.bodies();
    const mult = 1 + 0.8 * Math.min(3, Math.max(0, bs.length - 1));
    const base = this.sharedBase();
    const cat = (w: Walker) => (w.fb ? '' : w.kind === 'monster' ? (w.mdef && !w.mdef.boss && !w.raider && !w.kid ? 'monster' : '') : w.kind);
    for (const k of ['passer', 'thug', 'monster'] as const) {
      if (!base[k]) continue;
      const list = this.walkers.filter((w) => this.isShared(w) && cat(w) === k);
      const want = Math.round(base[k] * mult);
      if (list.length < want) { for (let n = 0; n < Math.min(2, want - list.length); n++) { if (k === 'monster') this.spawnMonster(); else this.spawnNpc(k); } }
      else if (list.length > want + 2) {
        let cut = Math.min(2, list.length - want);
        for (const w of list) {
          if (cut <= 0) break;
          if (w.down > 0 || w.target) continue;
          if (bs.every((b) => Math.hypot(b.x - w.x, b.y - w.y) > 30)) { this.removeWalker(w); cut--; }
        }
      }
    }
  }
  private sigOf(w: Walker) {
    return JSON.stringify([w.kind, w.look, w.weapon, w.armor, w.size ?? 1, w.maxHp, w.mdef?.key ?? '', w.fb ?? '', w.gang ?? '', w.weak ?? '', w.tour ?? '', w.monster ? 1 : 0, w.civ ?? '']);
  }
  private descOf(w: Walker) {
    return { i: w.nid, k: w.kind, l: w.look, w: w.weapon, ar: w.armor, s: w.size ?? 1, hp: w.maxHp, m: w.mdef?.key, fb: w.fb, g: w.gang, wk: w.weak, t: w.tour, c: w.civ, mo: w.monster ? 1 : 0, x: Math.round(w.x * 100), y: Math.round(w.y * 100), sp: w.speed };
  }
  /** 방장: 0.2초마다 손님 둘레 40칸 안의 몹을 나눠 준다 (새로 나왔거나 생김새가 바뀐 것은 생김새도) */
  private hostTick(dt: number) {
    if ((this.topT -= dt) <= 0) { this.topT = 3; this.topUp(); }
    if ((this.snapT -= dt) > 0) return;
    this.snapT = 0.2;
    const guests = this.walkers.filter((w) => w.kind === 'remote' && !w.lingerT);
    if (!guests.length || !this.mobOut) return;
    const rows: unknown[] = [], descs: unknown[] = [];
    for (const w of this.walkers) {
      if (!this.isShared(w) || w.sprite.destroyed) continue;
      if (!guests.some((b) => Math.hypot(b.x - w.x, b.y - w.y) < 40)) continue;
      w.nid ??= ++this.nidSeq;
      const sig = this.sigOf(w);
      if (this.sentSig.get(w.nid) !== sig) { this.sentSig.set(w.nid, sig); descs.push(this.descOf(w)); }
      if (w.act !== w.netActRef) { w.netActRef = w.act; if (w.act && w.act.anim !== 'fall') w.netActN = ((w.netActN ?? 0) + 1) % 1000; }
      const row: unknown[] = [w.nid, Math.round(w.x * 100), Math.round(w.y * 100), Math.max(0, DIRS.indexOf(w.dir)), Math.round((100 * Math.max(0, w.hp)) / (w.maxHp || 1)), w.down > 0 ? 1 : 0, w.netActN ?? 0];
      if (w.act && w.act.anim !== 'fall') row.push(w.act.anim);
      rows.push(row);
    }
    if (descs.length) this.mobOut.desc(descs);
    this.mobOut.snap(rows);
  }
  /** 방장: 손님이 모르는 몹의 생김새를 달라고 했다 */
  mobReq(ids: number[]) {
    if (this.netRole !== 'host') return;
    const out: unknown[] = [];
    for (const id of ids) { const w = this.walkers.find((x) => x.nid === id && this.isShared(x)); if (w) out.push(this.descOf(w)); }
    if (out.length) this.mobOut?.desc(out);
  }
  /** 손님: 오래(2.5초) 소식이 없는 거울은 걷는다 · 모르는 번호는 모아서 묻는다 */
  private guestTick() {
    for (const [id, w] of this.mirrors) if (this.time - w.mirror!.seen > 2.5) { if (this.player.target === w) this.player.target = null; this.removeWalker(w); this.mirrors.delete(id); }
    if (this.askIds.size && this.time > this.reqT) { this.reqT = this.time + 1.2; this.mobOut?.req([...this.askIds]); this.askIds.clear(); }
  }
  mobSnap(host: string, l: unknown[]) {
    if (this.netRole !== 'guest' || host !== this.netHost) return;
    for (const raw of l) {
      if (!Array.isArray(raw)) continue;
      const [id, x, y, di, hp, dn, an, a] = raw as [number, number, number, number, number, number, number, string | undefined];
      const w = this.mirrors.get(id);
      if (!w) { this.askIds.add(id); continue; }
      const m = w.mirror!;
      m.tx = x / 100; m.ty = y / 100; m.d = DIRS[di] ?? w.dir; m.seen = this.time;
      const ratio = Math.max(0, Math.min(1, hp / 100));
      if (ratio < w.hp / (w.maxHp || 1) - 0.005) w.barT = 5;
      w.hp = ratio * w.maxHp;
      if (dn && w.down <= 0) { w.down = 999; w.act = { anim: 'fall', t: 0 }; w.path = []; if (this.player.target === w) this.player.target = null; }
      else if (!dn && w.down > 0) { w.down = 0; w.act = null; }
      if (an !== m.an) { const first = m.an < 0; m.an = an; if (!first && a && !dn && w.cs?.counts[a as Anim]) w.act = { anim: a as Anim, t: 0 }; }
    }
  }
  mobDesc(host: string, l: unknown[]) {
    if (this.netRole !== 'guest' || host !== this.netHost) return;
    for (const raw of l) {
      const d = raw as { i: number; k: string; l: Look; w: string | null; ar: string[]; s: number; hp: number; m?: string; fb?: string; g?: Walker['gang']; wk?: Walker['weak']; t?: Walker['tour']; c?: Civ; mo?: number; x: number; y: number; sp?: number };
      if (!d || typeof d.i !== 'number' || !d.l || typeof d.x !== 'number') continue;
      const x = d.x / 100, y = d.y / 100;
      const old = this.mirrors.get(d.i);
      if (old) {
        old.mirror!.tx = x; old.mirror!.ty = y;
        if (JSON.stringify([old.look, old.weapon, old.armor]) !== JSON.stringify([d.l, d.w ?? null, d.ar ?? []])) this.dress(old, d.l, d.w ?? null, d.ar ?? []);
        old.gang = d.g; old.weak = d.wk; old.tour = d.t; old.civ = d.c && d.c in CIV ? d.c : undefined; old.fb = d.fb; old.size = d.s; old.maxHp = d.hp; old.monster = !!d.mo;
        old.mdef = d.m ? MONSTERS[d.m] : undefined;
        continue;
      }
      const md = d.m ? MONSTERS[d.m] : undefined;
      const kind = (['passer', 'thug', 'monster'].includes(d.k) ? d.k : 'passer') as NpcKind;
      const w = md ? this.makeMonster(md, Math.floor(x), Math.floor(y)) : this.makeWalker(d.l, Math.floor(x), Math.floor(y), kind, d.w ?? null, d.ar ?? []);
      if (md && JSON.stringify(d.l) !== JSON.stringify(w.look)) this.dress(w, d.l, d.w ?? null, d.ar ?? []);
      w.kind = kind; w.x = x; w.y = y;
      w.gang = d.g; w.weak = d.wk; w.tour = d.t; w.civ = d.c && d.c in CIV ? d.c : undefined; w.fb = d.fb; w.size = d.s; w.maxHp = w.hp = d.hp; w.monster = !!d.mo;
      if (d.sp) w.speed = d.sp;
      w.nid = d.i;
      w.mirror = { tx: x, ty: y, d: w.dir, seen: this.time, an: -1, mv: false };
      this.walkers.push(w);
      this.mirrors.set(d.i, w);
    }
  }
  /** 거울: 방장이 보낸 자리로 미끄러지듯 (0.2초 사이를 메운다). 많이 벌어지면 곧장 옮긴다 */
  private moveMirror(w: Walker, dt: number) {
    const m = w.mirror!;
    const dx = m.tx - w.x, dy = m.ty - w.y, d = Math.hypot(dx, dy);
    if (d > 6) { w.x = m.tx; w.y = m.ty; m.mv = false; return; }
    m.mv = d > 0.05 && w.down <= 0;
    if (d > 0.002) { const step = Math.min(d, Math.max(w.speed || 2, d / 0.2) * dt); w.x += (dx / d) * step; w.y += (dy / d) * step; }
    w.dir = m.mv && (!w.act || w.act.anim === 'hit') ? dirFromTile(dx, dy, w.dir) : m.d;
  }
  /** 방장: 손님이 내 몹을 때렸다 → 그 손님의 몸이 때린 것으로 계산한다 (몹은 그 손님에게 맞선다) */
  mobHitIn(from: string, id: number, dmg: number, crit: boolean, kind: string) {
    if (this.netRole !== 'host') return;
    const mob = this.walkers.find((w) => w.nid === id && this.isShared(w));
    const r = this.walkers.find((w) => w.rid === from && w.kind === 'remote');
    if (!mob || !r || mob.down > 0) return;
    this.hit(r, mob, dmg, crit, (['fist', 'blunt', 'blade', 'gun'].includes(kind) ? kind : 'fist') as sfx.HitKind);
  }
  /** 손님: 방장의 몹이 나를 쳤다 (회피·방어구는 내 기기가 계산한다) */
  mobStrikeIn(id: number, dmg: number, crit: boolean, kind: string) {
    if (this.netRole !== 'guest') return;
    const p = this.player;
    if (this.dead || this.safeAt(p.x, p.y)) return;
    const k = (['fist', 'blunt', 'blade', 'gun'].includes(kind) ? kind : 'fist') as sfx.HitKind;
    dmg = Math.max(1, Math.round(dmg) - (this.gear.dr ?? 0));
    const m = this.mirrors.get(id);
    if (m && m.down <= 0) { this.hit(m, p, dmg, crit, k); return; }
    if (!this.rollHits(4)) return;
    p.hp -= dmg; p.hurtT = 0.18; this.combatT = 0;
    this.hooks.hp(Math.max(0, p.hp), p.maxHp);
    if (p.hp <= 0) this.die('beaten');
  }
  /** 손님: 방장의 몹이 쓰러졌다 — 내가 쓰러뜨렸으면 돈·물건·행위가 내 기기에 남는다 */
  mobKillIn(id: number, by: string) {
    if (this.netRole !== 'guest') return;
    const w = this.mirrors.get(id);
    if (!w) return;
    if (this.player.target === w) this.player.target = null;
    if (by === this.myNetId) { w.down = 0; w.hp = 0; this.knockDown(w, this.player); return; }
    if (w.down > 0) return;
    w.down = 999; w.hp = 0; w.act = { anim: 'fall', t: 0 };
    sfx.thud(this.spotOf(w));
    // 층주는 누가 잡든 그 층에 있던 모두에게 '정리됨'
    if (w.mdef?.boss && this.zone.hell && !this.bossDown) { const r = this.walkers.find((x) => x.kind === 'remote' && x.rid === by); this.bossDown = true; this.drawFeatures(); this.bossFallFx(w); this.hooks.bossDown(this.zone.hell.floor, r?.rinfo?.nick || r?.rinfo?.name || ''); }
    if (w.fb) this.float(w, t().fbDown, '#ffd45a');
  }

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
      if (Math.hypot(pos.x - r.x, pos.y - r.y) > 6) { r.x = pos.x; r.y = pos.y; r.rto = undefined; }
      // 42차: 목적지가 새로 오면 내 쪽에서 길을 찾아 그 사람을 걷게 한다
      const to = pos.m && pos.t ? `${pos.t[0]},${pos.t[1]}` : undefined;
      if (to !== r.rto) {
        r.rto = to;
        r.rpath = pos.m && pos.t ? findPath(this.zone, Math.floor(r.x), Math.floor(r.y), Math.floor(pos.t[0]), Math.floor(pos.t[1])) ?? [[Math.floor(pos.t[0]), Math.floor(pos.t[1])]] : [];
      }
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
    if (!this.rollHits(4)) return; // 31차: '빗나감' 글자 없이 — 휘두르는 소리만 나고 맞는 소리·번쩍임이 없는 헛방으로 안다
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
    const z = this.zoom, M = 96, x0 = -this.camera.x / z - M, y0 = -this.camera.y / z - M, x1 = x0 + this.app.screen.width / z + 2 * M, y1 = y0 + this.app.screen.height / z + 2 * M;
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
    this.passage = false; this.passFx = null; // 42차: 건너가는 장면이 끝났다
    p.sprite.alpha = 1;
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
    for (const l of this.loots) if (l.death) this.hooks.lostItem(l.key); // 45차: 떨군 채 떠나면 그 물건은 보관 우리로
    this.loots = [];
    if (this.guide) this.hooks.nav(null); // 30차: 구역을 떠나면 길 안내 칩도 끈다
    for (const w of this.walkers) if (w.fb && w.down <= 0) this.hooks.fbossAt(w.fb, Math.floor(w.x), Math.floor(w.y), Math.round(w.hp)); // 31차: 필드 보스는 떠나도 남는다
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
    return { wx: (gx - this.camera.x) / this.zoom, wy: (gy - this.camera.y) / this.zoom };
  }

  /** 고문하는 야크를 누르면: 고문을 멈추고 진짜 괴물이 되어 덤빈다 (누른 그 자리에서) */
  private torturerAt(gx: number, gy: number, peek = false): Walker | null {
    if (!this.zone.hell) return null;
    const { wx, wy } = this.toWorld(gx, gy);
    for (const q of this.tortures) {
      if (q.free) continue;
      const [sx, sy] = iso(q.tx, q.ty);
      if (wx < sx - 13 || wx > sx + 13 || wy < sy - 50 * BODY_K || wy > sy + 4) continue;
      if (peek) return this.player; // 살펴보기만 (마우스 커서)
      q.free = true;
      q.tor.destroy();
      const f = this.zone.hell.floor;
      const tm = { ...MONSTERS[floorDef(f).torturer], weapon: 'club' };
      const m = this.makeMonster(tm, Math.floor(q.tx), Math.floor(q.ty));
      m.x = q.tx; m.y = q.ty; m.dir = q.tdir;
      m.home = [Math.floor(q.tx), Math.floor(q.ty)];
      this.walkers.push(m);
      m.untilHit = true; // 48차: 칼 태세로 누르기만 해서는 눈치채지 않는다 — 내가 먼저 때리면 그때 반격
      return m;
    }
    return null;
  }

  /** 21차: 손가락으로 눌렀다 (모바일) — 사람을 누르는 범위를 넓히고, 빗나가도 가까운 상대를 잡아 준다 */
  private touchTap = false;
  private walkerAt(gx: number, gy: number, foeFallback = false): Walker | null {
    const { wx, wy } = this.toWorld(gx, gy);
    const k = this.touchTap ? (foeFallback ? 1.9 : 1.35) : 1.15; // 36차: 손 태세에선 몸을 정확히 눌러야 (붐비는 곳에서 걷기가 사람에게 막히지 않게)
    let best: Walker | null = null, bz = -1e9;
    for (const w of this.walkers) {
      if (w.isPlayer) continue;
      const [sx, sy] = iso(w.x, w.y);
      const sz = Math.max(1, w.size ?? 1) * BODY_K;
      const box = w.down > 0 ? { x0: sx - 22 * k, x1: sx + 22 * k, y0: sy - 14 * k, y1: sy + 8 * k } : { x0: sx - 11 * k * sz, x1: sx + 11 * k * sz, y0: sy - 44 * sz - 6 * k, y1: sy + 6 * k };
      if (wx >= box.x0 && wx <= box.x1 && wy >= box.y0 && wy <= box.y1 && w.x + w.y > bz) { best = w; bz = w.x + w.y; }
    }
    if (best || !this.touchTap || !foeFallback) return best;
    // 칼 태세에서 빗나갔다면: 누른 곳 둘레(손가락 하나 반쯤)에서 가장 가까운 적만 (중립은 고르지 않는다)
    let bd = 46;
    for (const w of this.walkers) {
      if (w.isPlayer || w.down > 0 || !this.isFoe(w)) continue;
      const [sx, sy] = iso(w.x, w.y);
      const d = Math.hypot(wx - sx, wy - (sy - 20 * BODY_K)) - (this.isFoe(w) ? 14 : 0);
      if (d < bd) { bd = d; best = w; }
    }
    return best;
  }

  /** 45차: 누른 자리에 겹쳐 선 적들 (앞쪽부터) */
  private foesAt(gx: number, gy: number): Walker[] {
    const { wx, wy } = this.toWorld(gx, gy);
    const k = this.touchTap ? 1.35 : 1.1;
    const out: Walker[] = [];
    for (const w of this.walkers) {
      if (w.isPlayer || w.down > 0 || w.noeulAlly || w.kind === 'marionette' || !this.canHitFoe(w)) continue;
      const [sx, sy] = iso(w.x, w.y);
      const sz = Math.max(1, w.size ?? 1) * BODY_K;
      if (wx >= sx - 11 * k * sz && wx <= sx + 11 * k * sz && wy >= sy - 44 * sz - 6 * k && wy <= sy + 6 * k) out.push(w);
    }
    return out.sort((a, b) => b.x + b.y - (a.x + a.y));
  }
  /** 칠 수 있는 적인가 (적대하는 사람 · 괴물 · 필드 보스 · 나를 노리는 이) */
  private canHitFoe(w: Walker) {
    if (w.kind === 'remote') return false;
    if (this.realm === 'heaven') return !!w.invader;
    return this.isFoe(w) || !!w.fb || w.target === this.player;
  }
  private lastPick: { x: number; y: number; t: number; w: Walker } | null = null;
  /**
   * 45차 겹친 적 고르기. explicit = PC 우클릭 (적이 하나라도 있으면 바로 친다)
   * 그렇지 않으면 같은 자리를 1.5초 안에 다시 눌렀고 그 자리에 적이 둘 이상일 때만 다음 적으로 넘긴다 (처음 누름은 평소처럼)
   */
  private pickFoeAt(gx: number, gy: number, explicit: boolean): boolean {
    const list = this.foesAt(gx, gy);
    const lp = this.lastPick;
    const again = !!lp && Math.hypot(gx - lp.x, gy - lp.y) < 26 && this.time - lp.t < 1.5;
    if (!explicit && (!again || list.length < 2)) { this.lastPick = list[0] ? { x: gx, y: gy, t: this.time, w: list[0] } : null; return false; }
    if (!list.length) {
      if (!explicit) return false;
      // 우클릭이 빗나갔으면 커서 둘레의 가장 가까운 적
      const { wx, wy } = this.toWorld(gx, gy);
      let best: Walker | null = null, bd = 40;
      for (const w of this.walkers) { if (w.isPlayer || w.down > 0 || w.noeulAlly || w.kind === 'marionette' || !this.canHitFoe(w)) continue; const [sx, sy] = iso(w.x, w.y); const d = Math.hypot(wx - sx, wy - (sy - 20 * BODY_K)); if (d < bd) { bd = d; best = w; } }
      if (!best) return false;
      list.push(best);
    }
    const k0 = again && lp ? list.indexOf(lp.w) : -1;
    const w = list[(k0 + 1) % list.length];
    this.lastPick = { x: gx, y: gy, t: this.time, w };
    this.showLabel({ kind: 'w', w }, 1.6);
    this.attack(w);
    return true;
  }
  /** 45차: 대상 바꾸기 (모바일 단추 · PC Tab) — 내 둘레 9칸 안의 적을 가까운 순으로 돌아가며 */
  cycleTarget(): boolean {
    if (this.dead || this.zone.interior) return false;
    const p = this.player;
    const list = this.walkers.filter((w) => !w.isPlayer && w.down <= 0 && !w.noeulAlly && w.kind !== 'marionette' && this.canHitFoe(w) && Math.hypot(w.x - p.x, w.y - p.y) < 9)
      .sort((a, b) => Math.hypot(a.x - p.x, a.y - p.y) - Math.hypot(b.x - p.x, b.y - p.y));
    if (!list.length) return false;
    const k0 = p.target ? list.indexOf(p.target) : -1;
    const w = list[(k0 + 1) % list.length];
    this.showLabel({ kind: 'w', w }, 1.6);
    this.attack(w);
    return true;
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
      if (k < 0 || wx < v.x || wx > v.x + v.w || wy < v.y || wy > v.y + v.h) continue; // 지도 밖 건물은 고를 수 없다
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
    return w.kind === 'thug' || w.kind === 'goat' || w.kind === 'dog' || w.kind === 'suturer' || (!!w.mdef && !w.asleep) || w.target === this.player;
  }
  private onHover(gx: number, gy: number) {
    const w = this.walkerAt(gx, gy);
    this.hoverFor = w ? { kind: 'w', w } : null;
    // 싸울 상대(괴물·불량배·대식자·고문하는 괴물·나를 노리는 누구든) 위에서는 칼 모양.
    // 경비병은 나를 공격했을 때만 적 ('모두 공격' 태세면 누구든 칼)
    const foe = this.realm !== 'ghost' && ((w && w.down <= 0 && (this.isFoe(w) || (this.stance === 'all' && w.kind !== 'clerk'))) || (!w && this.torturerAt(gx, gy, true)));
    document.body.style.cursor = foe ? SWORD_CURSOR : this.hoverFor || this.coinAt(gx, gy) || this.onDoorIcon(gx, gy) || this.onTalkIcon(gx, gy) ? 'pointer' : '';
  }

  /** 출입 아이콘을 눌렀나 (손가락 크기를 생각해 넉넉하게) */
  private onDoorIcon(gx: number, gy: number) {
    if (!this.door.visible || this.doorFor === null) return false;
    const { wx, wy } = this.toWorld(gx, gy);
    return Math.hypot(wx - this.doorAt.x, wy - this.doorAt.y) < 20;
  }

  /** 36차: 곁에 선 사람에게 하는 일 메뉴 (살펴보기 · 말 걸기 · 강제 공격) — 같은 사람을 곁에서 한 번 더 눌렀을 때 */
  private openPersonMenu(w: Walker) {
    const L = t();
    const [sx, sy] = iso(w.x, w.y);
    const opts: { label: string; danger?: boolean; act: () => void }[] = [];
    if (w.kind === 'thug' || w.kind === 'goat' || w.kind === 'dog' || w.kind === 'suturer' || (w.mdef && !w.asleep) || w.gdef) opts.push({ label: L.act.attack, act: () => this.attack(w) });
    if (w.mdef?.key === 'gurma') opts.push({ label: w.asleep ? L.act.look : L.gurmaFeedBtn, act: () => this.approach(w, 'talk') });
    if (!w.mdef) opts.push({ label: L.act.talk, act: () => this.approach(w, 'talk') });
    opts.push({ label: L.act.look, act: () => this.approach(w, 'look') });
    if (w.kind === 'passer' || w.kind === 'angel' || w.kind === 'yellowwing' || w.kind === 'noeul' || w.kind === 'officer' || w.kind === 'soul' || w.kind === 'vendor' || w.kind === 'fighter') opts.push({ label: L.act.force, danger: true, act: () => (this.realm === 'heaven' ? this.hooks.heavenAct('assault') : this.attack(w)) });
    this.hooks.menu(this.npcName(w), this.npcSub(w), opts, sx * this.zoom + this.camera.x, (sy - 44 * BODY_K) * this.zoom + this.camera.y);
  }
  /** 36차: 말을 걸 수 있는 사람 (적·쓰러진 이·다른 유저·차는 아니다) */
  private talkable(w: Walker) {
    if (w.isPlayer || w.down > 0 || w.kind === 'remote' || w.invader) return false;
    if (w.kind === 'clerk') return true;
    if (w.mdef && w.mdef.key !== 'gurma') return false;
    if (w.kind === 'thug' || w.kind === 'goat' || w.kind === 'dog' || w.kind === 'suturer') return false;
    return !this.isFoe(w);
  }
  /** 36차: 손 태세에서 내 곁(1.9칸)의 말을 걸 수 있는 사람 하나 — 머리 위에 말풍선. 마지막으로 누른 사람이 먼저 */
  private focusW: Walker | null = null;
  nearFor: Walker | null = null;
  private findNear() {
    if (this.stance !== 'talk' || this.dead || this.realm === 'ghost' || this.pending || this.working?.on) return null;
    const p = this.player;
    const f = this.focusW;
    if (f && this.walkers.includes(f) && this.talkable(f) && Math.hypot(f.x - p.x, f.y - p.y) < 1.9) return f;
    let best: Walker | null = null, bd = 1.9;
    for (const w of this.walkers) {
      const d = Math.hypot(w.x - p.x, w.y - p.y);
      if (d < bd && this.talkable(w)) { bd = d; best = w; }
    }
    return best;
  }
  /** 말풍선을 눌렀나 (손가락 크기를 생각해 넉넉하게) */
  private onTalkIcon(gx: number, gy: number) {
    if (!this.talkIcon.visible || !this.nearFor) return false;
    const { wx, wy } = this.toWorld(gx, gy);
    return Math.hypot(wx - this.talkIcon.x, wy - this.talkIcon.y) < (this.touchTap ? 24 : 16);
  }
  /** 38차 키(F1 상호작용): 문 아이콘이 떠 있으면 들어가고, 말풍선이 떠 있으면 말을 건다. 할 것이 없으면 false */
  interactKey(): boolean {
    if (this.dead) return false;
    if (this.door.visible && this.doorFor !== null) { this.interact(this.doorFor); return true; }
    if (this.nearFor) { this.interactNear(this.nearFor); return true; }
    return false;
  }
  /**
   * 38차 줍기 단추(F4): 가까운 돈과 물건만 — 팔 닿는 곳(1.4칸)은 곧바로 줍고, 3.5칸 안에 있으면 가장 가까운 것까지 걸어가 줍는다.
   * 남이 노리는 돈(소매치기가 집으려는 것)은 건드리지 않는다
   */
  pickNearby(): 'got' | 'walk' | 'none' {
    const p = this.player;
    if (this.dead || this.realm === 'ghost') return 'none';
    let got = 0, best: { x: number; y: number } | null = null, bd = 3.5;
    const take = (o: { x: number; y: number }) => {
      const d = Math.hypot(o.x - p.x, o.y - p.y);
      if (d < 1.4) { o.x = p.x; o.y = p.y; got++; } // 다음 장면에서 발밑의 것처럼 주워진다
      else if (d < bd) { bd = d; best = o; }
    };
    for (const c of this.coins) if (!c.claimed) take(c);
    for (const l of this.loots) take(l);
    if (got) return 'got';
    const b = best as { x: number; y: number } | null;
    if (b) { this.cancelActs(); if (this.walkTo(Math.floor(b.x), Math.floor(b.y))) { this.rippleAt(Math.floor(b.x), Math.floor(b.y)); return 'walk'; } }
    return 'none';
  }
  /** 말풍선: 점원이면 계산대로, 그 밖엔 말 걸기 */
  private interactNear(w: Walker) {
    this.focusW = w;
    if (w.kind === 'clerk') { this.showLabel({ kind: 'w', w }, 2); this.approachClerk(); return; }
    this.showLabel({ kind: 'w', w }, 2);
    this.approach(w, 'talk');
  }

  private onTap(gx: number, gy: number, force: boolean) {
    if (this.seat) { if (!this.player.bubble) this.bubble(this.player, t().svcStay); return; } // 46차: 예배 중에는 가만히
    if (this.riding) return; // 46차: 놀이기구를 타는 동안
    { const u = this.promoAt(gx, gy); if (u) { this.hooks.promo(u); return; } } // 47차: 홍보 말풍선을 누르면 그 사람의 프로필
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
    // 36차 조작: ✋ 손 태세 — 사람을 누르면 이름이 뜨고 곁으로 걸어간다. 가까이 가면 머리 위에 말풍선이 뜨고, 그걸 눌러야 말을 건다
    //   (곁에 선 채 같은 사람을 한 번 더 누르면 살펴보기·강제 공격 메뉴). ⚔ 칼 태세 — 적은 누르면 공격, 중립은 누르면 그 곁으로 걷기만.
    //   고문하던 괴물은 칼 태세에서 몸을 정확히 눌렀을 때만 고문을 멈추고 덤빈다
    const sword = this.stance !== 'talk';
    // 출입 아이콘(가게 문 앞에 서 있을 때만 뜬다)과 말풍선은 사람보다 먼저 — 일부러 누른 것이니까
    if (this.onDoorIcon(gx, gy)) { this.interact(this.doorFor!); return; }
    if (!sword && this.nearFor && this.onTalkIcon(gx, gy)) { this.interactNear(this.nearFor); return; }
    // 45차: 칼 태세에서 겹친 적을 같은 자리에 다시 누르면 그 뒤의 적으로 (모바일 · PC 공통)
    if (sword && this.pickFoeAt(gx, gy, false)) return;
    const w = this.walkerAt(gx, gy, sword) ?? (sword || force ? this.torturerAt(gx, gy) : null);
    // 21차: 천국의 구름 계단을 누르면 그 앞까지 걸어가 테라스로 올라간다
    if (!w && this.stairBox && this.heavenStair && this.realm === 'heaven' && !this.zone.interior) {
      const wx = (gx - this.camera.x) / this.zoom, wy = (gy - this.camera.y) / this.zoom, b = this.stairBox;
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
      if (sword) { this.groundMove(gx, gy); return; }
      const [sx, sy] = iso(w.x, w.y);
      this.hooks.person(w.rid, w.rinfo, sx * this.zoom + this.camera.x, (sy - 44 * BODY_K) * this.zoom + this.camera.y, () => this.attack(w));
      return;
    }
    if (w && w.noeulAlly && w.down <= 0) { this.showLabel({ kind: 'w', w }, 2); this.hooks.crusadeTalk(); return; } // 45차: 정벌 중 노을에게 말 걸기 (돌아가기)
    if (w && w.down <= 0 && w.kind === 'clerk' && !force) { this.showLabel({ kind: 'w', w }, 2); this.approachClerk(); return; }
    if (w && w.down <= 0) {
      // 공격 태세: 적대 대상만 / 모두
      const hostile = this.isFoe(w);
      // 천국: 그림자 말고 누구에게든 손을 들면 천국의 법을 어긴 것 (현실로 강제 환생)
      if (this.realm === 'heaven' && !w.weak && !w.invader && (force || this.stance === 'all')) { this.hooks.heavenAct('assault'); return; }
      if (force || this.stance === 'all' || (this.stance === 'hostile' && hostile)) { this.attack(w); return; }
      if (sword) { this.showLabel({ kind: 'w', w }, 1.2); this.groundMove(gx, gy); return; } // 칼 태세의 중립: 그 곁으로 걷기만
      this.showLabel({ kind: 'w', w }, 2.5);
      const near = Math.hypot(w.x - this.player.x, w.y - this.player.y) < 1.9;
      if (!(near && this.focusW === w)) {
        // 처음 누른 사람: 곁으로 걸어가기만 (메뉴 없음)
        this.focusW = w;
        this.cancelActs();
        if (!near && this.walkTo(Math.floor(w.x), Math.floor(w.y))) this.rippleAt(Math.floor(w.x), Math.floor(w.y));
        return;
      }
      this.openPersonMenu(w);
      return;
    }
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
  private guide: { at: [number, number]; lift: number; front: [number, number] | null; spr: Text; t: number; arrow: Graphics } | null = null;
  /** 33차: 가장 가까운 은행으로 길 안내 (없으면 false) */
  guideBank(): boolean {
    if (this.realm !== 'real' || this.zone.interior) return false;
    const p = this.player;
    let best = -1, bd = 1e9;
    this.zone.buildings.forEach((b, k) => { if (roomKindOf(b) !== 'bank') return; const d = Math.hypot(b.i0 + b.w / 2 - p.x, b.j0 + b.d / 2 - p.y); if (d < bd) { bd = d; best = k; } });
    if (best < 0) return false;
    this.setGuide(best);
    return true;
  }
  // ───────── 38차 상점 알림 화살표 (33차 은행 지붕 간판을 대신한다) ─────────
  // 가게 문 가까이(6칸) 오면 그 문 위에 이름과 아래 화살표가 잠깐(3초 남짓) 떴다 사라진다. 멀리(10칸) 갔다 다시 오면 또.
  // 문 앞에 서서 출입 아이콘이 뜨면 그 가게의 화살표는 감춘다 (같은 것을 두 번 보이지 않게). 영혼 설정에서 끈다
  private shopPing = (() => { try { return localStorage.getItem('heavensmanual.shopping') !== '0'; } catch { return true; } })();
  setShopPing(v: boolean) { this.shopPing = v; if (!v) { for (const pg of this.pings.values()) pg.o.destroy({ children: true }); this.pings.clear(); } }
  private pings = new Map<number, { o: Container; t: number; y: number }>();
  private pingSeen = new Map<number, number>();
  private pingScanT = 0;
  private pingDoor(k: number): [number, number] | null {
    if (k === -1) return [this.zone.door.i + 0.5, this.zone.door.j];
    const b = this.zone.buildings[k];
    const f = this.frontCached(k);
    if (!b || !f) return null;
    return b.sign === 'right' ? [b.i0 + b.w, f[1] + 0.5] : [f[0] + 0.5, b.j0 + b.d];
  }
  private pingable(k: number) {
    const b = this.zone.buildings[k];
    if (!b) return false;
    const hellDoor = b.cat === 'loan' || b.cat === 'hbank' || b.cat === 'atone' || b.cat === 'rebirth';
    return hellDoor || !(this.zone.hell || b.cat === 'ujusae' || !interactive(b) || (!canEnter(b) && !storeOf(b) && !canWork(b) && !hasBank(b)));
  }
  private makePing(k: number, at: [number, number]) {
    const L = t();
    const b = k >= 0 ? this.zone.buildings[k] : null;
    const bank = !!b && (roomKindOf(b) === 'bank' || hasBank(b));
    let name = k === -1 ? (this.zone.hell ? L.hellShop : this.realm === 'heaven' ? L.ywShopName : L.shopLabel) : bank && bankName(b!, lang()) ? bankName(b!, lang()) : this.nameOf(b!); // 46차: 은행이 든 건물은 은행 이름으로
    if (!name) return;
    if (name.length > 16) name = name.slice(0, 15) + '…';
    const o = new Container();
    o.eventMode = 'none';
    const tx = new Text({ text: name, style: { fontFamily: 'system-ui, sans-serif', fontSize: 10, fontWeight: '800', fill: bank ? '#ffe9a8' : '#fff3d0' } });
    tx.anchor.set(0.5, 0.5);
    const w = Math.ceil(tx.width) + 14 + 15; // 46차: 왼쪽에 업종 그림
    tx.x = 7;
    const g = new Graphics();
    g.roundRect(-w / 2, -9, w, 18, 5).fill({ color: bank ? 0x14233a : 0x18120c, alpha: 0.92 }).stroke({ color: bank ? 0xf2d27a : 0xe0b437, width: 1.5 });
    g.poly([-5, 9, 5, 9, 0, 16]).fill({ color: bank ? 0xf2d27a : 0xe0b437 });
    g.poly([-3, 18, 3, 18, 0, 22]).fill({ color: bank ? 0xf2d27a : 0xe0b437, alpha: 0.7 });
    const ic = new Graphics();
    pingIcon(ic, k === -1 ? (this.zone.hell ? 'phoenix' : 'bird') : bank ? 'bank' : pingKind(b!)); // 48차: 우주새(본디 동물 가게) = 새 · 지옥 유황새 = 불사조
    ic.position.set(-w / 2 + 10, 0);
    o.addChild(g, ic, tx);
    const [x, y0] = iso(at[0], at[1]);
    const y = y0 - 66;
    o.position.set(Math.round(x), y);
    o.zIndex = 9e5 - 1;
    o.alpha = 0;
    this.objects.addChild(o);
    this.pings.set(k, { o, t: 0, y });
  }
  private updatePings(dt: number, p: Walker) {
    const LIFE = 3.4;
    for (const [k, pg] of this.pings) {
      pg.t += dt;
      const a = pg.t < 0.25 ? pg.t / 0.25 : pg.t > LIFE - 0.6 ? Math.max(0, (LIFE - pg.t) / 0.6) : 1;
      pg.o.alpha = a;
      pg.o.visible = a > 0 && this.doorFor !== k;
      pg.o.y = pg.y + Math.sin(this.time * 4 + k) * 1.5 - (1 - Math.min(1, pg.t / 0.25)) * 6;
      if (pg.t > LIFE) { pg.o.destroy({ children: true }); this.pings.delete(k); }
    }
    if (!this.shopPing || this.dead || this.zone.interior || this.realm === 'ghost') return;
    this.pingScanT -= dt;
    if (this.pingScanT > 0) return;
    this.pingScanT = 0.3;
    const cands = [...this.bViews.keys()].filter((k) => k >= 0 && this.pingable(k));
    if (this.zone.shop !== false) cands.push(-1);
    for (const k of cands) {
      const dp = this.pingDoor(k);
      if (!dp) continue;
      const d = Math.hypot(dp[0] - p.x, dp[1] - p.y);
      const last = this.pingSeen.get(k);
      if (d > 10) { if (last !== undefined && this.time - last > 20) this.pingSeen.delete(k); continue; }
      if (d > 6.5 || last !== undefined || this.pings.has(k)) continue;
      this.pingSeen.set(k, this.time);
      this.makePing(k, dp);
    }
  }
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
    this.clearGuide(false);
    const tx = new Text({ text: `▼ ${label}`, style: { fontFamily: 'system-ui, sans-serif', fontSize: 15, fontWeight: '800', fill: '#ffe08a', stroke: { color: '#1a120a', width: 4, join: 'round' } } });
    tx.anchor.set(0.5, 1);
    tx.zIndex = 1e7;
    this.objects.addChild(tx);
    // 30차 길 안내 화살표: 내 발밑을 도는 금빛 화살이 가야 할 쪽을 가리킨다 (다다르거나 끄면 사라진다)
    const ar = new Graphics();
    ar.poly([14, 0, -6, -9, -2, 0, -6, 9]).fill({ color: 0xffd45a }).stroke({ color: 0x1a120a, width: 2, alpha: 0.85 });
    ar.zIndex = 1e7;
    this.objects.addChild(ar);
    this.guide = { at, lift, front, spr: tx, t: Infinity, arrow: ar };
    this.hooks.nav(label);
  }
  /** 30차: 길 안내 끄기 (화면 칩의 ✕) */
  clearGuide(tell = true) {
    if (!this.guide) return;
    this.guide.spr.destroy();
    this.guide.arrow.destroy();
    this.guide = null;
    if (tell) this.hooks.nav(null);
  }
  private updateGuide(dt: number) {
    const g = this.guide!;
    g.t -= dt;
    const [x, y] = iso(g.at[0], g.at[1]);
    g.spr.position.set(Math.round(x), Math.round(y - g.lift + Math.sin(this.time * 3) * 4));
    const [px, py] = iso(this.player.x, this.player.y);
    const tx = g.front ? iso(g.front[0] + 0.5, g.front[1] + 0.5) : [x, y];
    const ang = Math.atan2(tx[1] - (py - 18), tx[0] - px);
    const r = 34 + Math.sin(this.time * 5) * 3;
    g.arrow.position.set(Math.round(px + Math.cos(ang) * r), Math.round(py - 18 + Math.sin(ang) * r * 0.75));
    g.arrow.rotation = ang;
    g.arrow.visible = !this.dead;
    const f = g.front;
    if (g.t <= 0 || (f && Math.hypot(f[0] + 0.5 - this.player.x, f[1] + 0.5 - this.player.y) < 2)) this.clearGuide();
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
      // 37차: 천국 1층(구름섬)의 가게·은행·호텔·오락실은 현실처럼 들어간다 (일자리는 없다 — 천국엔 돈이 모자랄 일이 없으니)
      if (hb && (hb as { att?: string }).att && hb.cat === 'attraction') { this.goRide(k); return; } // 46차 놀이기구 타기
      if (hb && this.zone.heavenGen) { if (canEnter(hb)) this.goEnter(k); return; }
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
    if (canWork(b)) { const job = this.jobOf(b); opts.push({ label: L.act.work.replace('{n}', String(Math.round(WAGE_PER_HOUR * job.mult * this.wageMul))) + ' · ' + L.workPace + (job.hard ? ' · ' + L.workHard[job.hard - 1] : ''), act: () => this.goWork(k) }); }
    if (opts.length === 1) { opts[0].act(); return; }
    if (!opts.length) return;
    opts.push({ label: L.act.close, act: () => undefined });
    this.hooks.menu(this.nameOf(b), buildingSub(b, lang()), opts, this.doorAt.x * this.zoom + this.camera.x, (this.doorAt.y - 14) * this.zoom + this.camera.y);
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
      if (w.tail?.kind === 'accubus') { face(); w.tail.t = Math.max(w.tail.t, 20); this.hooks.accubus(this.npcName(w)); return; }
      if (w.tail) { face(); const lines = this.player.look?.sex === 'f' ? L.admireToF : L.admireToM; this.hooks.say(this.npcName(w), lines[Math.floor(Math.random() * lines.length)]); return; }
    }
    if (w.kind === 'caged') { this.hooks.say(this.npcName(w), pd.kind === 'look' ? this.npcSub(w) : (w.cage?.kind === 'sinner' ? t().zooSinnerCalls : t().zooDemonCalls)[Math.floor(Math.random() * 4)]); return; }
    if (w.twin && pd.kind === 'talk') { for (const x of this.walkers) if (x.twin) { x.path = []; x.wait = 6; x.dir = dirFromTile(this.player.x - x.x, this.player.y - x.y, x.dir); } this.hooks.twinsTalk(); return; } // 46차 쌍둥이
    if (w.kind === 'noeul' && pd.kind === 'talk') { w.path = []; w.wait = 8; w.watchT = 40; w.dir = dirFromTile(this.player.x - w.x, this.player.y - w.y, w.dir); this.hooks.heavenAct('noeul'); return; }
    if (w.kind === 'yellowwing' && pd.kind === 'talk') { w.path = []; w.wait = 6; w.dir = dirFromTile(this.player.x - w.x, this.player.y - w.y, w.dir); this.hooks.heavenAct('yellowwing'); return; }
    if (w.kind === 'goat') { this.hooks.say(L.goatName, pd.kind === 'look' ? L.goatTag : L.goatTalk); return; }
    if (w.kind === 'dog') { this.hooks.say(L.dogName, pd.kind === 'look' ? L.dogLook : L.dogGrowl[0]); return; }
    if (w.kind === 'goatking') { w.path = []; w.dir = this.player.x - w.x - (this.player.y - w.y) >= 0 ? 'e' : 'w'; if (pd.kind === 'look') this.hooks.say(L.gkName, L.gkLook); else this.hooks.goatKing(); return; }
    if (w.kind === 'changer') { w.path = []; if (pd.kind === 'look') this.hooks.say(L.xchName, L.xchSub); else this.hooks.changer(); return; }
    if (w.dumpAngel) { const ls = pd.kind === 'look' ? [L.dumpLook] : L.dumpLines; this.hooks.say(this.npcName(w), ls[Math.floor(Math.random() * ls.length)]); return; } // 47차 쓰레기장 천사
    if (w.kind === 'angel' || w.kind === 'officer' || w.kind === 'yellowwing' || w.kind === 'noeul') {
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
    if (w.kind === 'passer' && w.owe?.ready && pd.kind === 'talk' && this.realm === 'real') {
      // 34차: 도움받은 행인의 사례 — 돈을 쥐여 주고 제 갈 길을 간다 (관광객은 조금 더)
      w.dir = dirFromTile(this.player.x - w.x, this.player.y - w.y, w.dir);
      w.owe = undefined;
      const n = Math.round(((40 + Math.random() * 260) * (w.tour ? 1.8 : 1) * (1 + 0.5 * (w.ptier ?? 0))) / 10) * 10;
      const th = L.thanksLines; this.bubble(w, th[Math.floor(Math.random() * th.length)]);
      this.hooks.thanks(n);
      w.wait = 2; w.path = [];
      return;
    }
    if (w.kind === 'soul' || w.kind === 'fighter') {
      if (!w.still) w.dir = dirFromTile(this.player.x - w.x, this.player.y - w.y, w.dir);
      const f = this.zone.hell?.floor ?? 0;
      const lines = w.kind === 'fighter' ? L.fighterLines : w.monk ? L.monkLines : w.cards ? L.cardLines : this.zone.interior?.kind === 'rebirth' ? L.lobbySoulLines : w.worship ? L.svcSoulLines : w.pray ? L.idolPrayLines : f === 2 ? L.soulHungryLines : f === 3 && !w.still ? L.soulHaggleLines : w.still === 'lie' ? L.soulLieLines : L.soulLines;
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
      this.hooks.say(this.npcName(w), `${kind === 'suturer' ? L.suturerLook : w.gang === 'robber' ? L.robberLook : w.gang === 'mafia' ? L.mafiaLook : w.gang ? (this.gangText(w.gang, 'Look') as string) : w.tour ? L.touristLook : w.civ ? L.civ[w.civ].look : L.inspect[kind as 'passer' | 'thug']} ${cond}`);
      return;
    }
    const lines = kind === 'suturer' ? L.suturerLines : w.gang === 'robber' ? L.robberLines : w.gang === 'mafia' ? L.mafiaLines : w.gang ? (this.gangText(w.gang, 'Lines') as string[]) : w.tour ? L.touristLines : L.lines[kind as 'passer' | 'thug'];
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
    if (w.fb && (t().fbName as Record<string, string>)[w.fb]) return (t().fbName as Record<string, string>)[w.fb]; // 31차 필드 보스
    const L = t();
    if (w.kind === 'clerk' && this.zone.interior?.kind === 'shore') return L.bulda;
    if (w.kind === 'clerk' && this.grandpa) return L.grandpaName;
    if (w.kind === 'clerk' && this.zone.interior?.kind === 'home') return L.yunae;
    if (w.kind === 'yunae') return L.yunae;
    if (w.cards) return L.angel;
    if (w.kind === 'goat') return L.goatName;
    if (w.kind === 'dog') return L.dogName;
    if (w.kind === 'goatking') return L.gkName;
    if (w.kind === 'changer') return L.xchName;
    if (w.kind === 'clerk') return this.zone.interior?.kind === 'loan' ? L.besk : this.zone.interior?.kind === 'rebirth' ? L.pashar : this.zone.interior?.kind === 'terrace' ? L.officer : this.zone.interior?.name ?? '';
    if (w.mdef) return w.elite ? L.eliteName.replace('{n}', w.mdef.name[lang()]) : w.mdef.name[lang()];
    if (w.gdef) return w.gdef.name[lang()];
    if (w.kind === 'talus') return L.talus;
    if (w.kind === 'maskgirl') return L.maskGirl;
    if (w.kind === 'elder') return L.elderName[(this.zone.interior?.kind ?? 'temple') as 'temple'];
    if (w.kind === 'pashar') return L.pashar;
    if (w.kind === 'soul') return L.soulTired;
    if (w.vend === 'heaven') return L.heavenVendor;
    if (w.ferum) return L.ferumName;
    if (w.kind === 'vendor' && w.vend && w.vend in L.hvName) return L.hvName[w.vend as keyof typeof L.hvName][0];
    if (w.kind === 'vendor') return w.vend === 'street' ? L.streetVendor : w.vend === 'massage' ? L.massagePromoter : w.vend === 'bar' ? L.barPromoter : w.vend === 'butcher' ? L.vendorButcher : L.vendorJunk;
    if (w.tour) return L.tourist;
    if (w.civ) return L.civ[w.civ].name;
    if (w.noeulAlly) return L.noeulName; // 45차
    if (w.kind === 'marionette') return L.marionetteName;
    if (w.kind === 'fighter') return L.soulFighter;
    if (w.weak === 'drunk') return L.drunk;
    if (w.weak === 'shade') return L.shade;
    if (w.gang === 'robber') return L.robber;
    if (w.gang === 'mafia') return L.mafia;
    if (w.gang) return this.gangText(w.gang, '') as string;
    if (w.kind === 'yellowwing') return L.yellowWing;
    if (w.kind === 'noeul') return L.noeulName;
    if (w.kind === 'caged') return w.cage?.kind === 'sinner' ? L.zooSinner : w.cage?.kind === 'beast' ? L.zooBeast : L.zooDemon;
    if (w.kind === 'sleeper') return L.sleeper;
    if (w.taxi) return L.taxiAngel;
    if (w.preach !== undefined) return L.preachAngel;
    if (w.tail) return w.tail.kind === 'chef' ? L.chefName : w.tail.kind === 'accubus' ? L.accName : L.admirer;
    if (w.kind === 'officer') return L.officer;
    if (w.dumpAngel) return L.dumpAngel;
    if (w.stiffBoss) return L.bossOf.replace('{shop}', this.zone.interior?.name ?? '');
    if (w.kind === 'angel') return L.angel;
    if (w.kind === 'passer' && this.realm === 'heaven') return L.soulPasser;
    return w.kind === 'suturer' ? L.suturer : L.npc[w.kind as 'passer' | 'thug'];
  }
  private npcSub(w: Walker) {
    if (w.fb && (t().fbTitle as Record<string, string>)[w.fb]) return (t().fbTitle as Record<string, string>)[w.fb]; // 31차 필드 보스
    const L = t();
    if (w.kind === 'clerk' && this.zone.interior?.kind === 'shore') return L.buldaSub;
    if (w.kind === 'clerk' && this.grandpa) return L.grandpaSub;
    if (w.kind === 'clerk' && this.zone.interior?.kind === 'home') return L.yunaeSub[this.zone.interior.age ?? 1];
    if (w.kind === 'yunae') return L.yunaeSub[1];
    if (w.cards) return L.cardSub;
    if (w.kind === 'goat') return L.goatSub;
    if (w.kind === 'dog') return L.dogSub;
    if (w.kind === 'goatking') return L.gkSub;
    if (w.kind === 'changer') return L.xchSub;
    if (w.kind === 'clerk') return this.zone.interior?.kind === 'terrace' ? L.officerSub : this.zone.interior?.kind === 'hpalace' ? L.palaceClerkSub : L.clerkSub[(this.zone.interior?.kind ?? 'shop') as keyof typeof L.clerkSub] ?? '';
    if (w.mdef) return w.mdef.title ? `${L.hellBoss.replace('{n}', String(this.zone.hell?.floor ?? 1))} · ${w.mdef.title[lang()]}` : w.mdef.boss ? L.hellBoss.replace('{n}', String(this.zone.hell?.floor ?? 1)) : L.hellMonster;
    if (w.kind === 'pashar') return L.pasharSub;
    if (w.kind === 'elder') return L.elderSub;
    if (w.gdef) return L.guardSub;
    if (w.kind === 'talus') return L.talusSub;
    if (w.kind === 'maskgirl') return L.maskGirlSub;
    if (w.kind === 'soul') return L.soulTiredSub;
    if (w.vend === 'heaven') return this.nameOf(this.zone.buildings[w.shopK ?? 0]);
    if (w.ferum) return L.ferumSub;
    if (w.kind === 'vendor' && w.vend && w.vend in L.hvName) return L.hvName[w.vend as keyof typeof L.hvName][1];
    if (w.kind === 'vendor') return w.vend === 'street' ? L.streetVendorSub : (w.vend === 'massage' || w.vend === 'bar') ? this.nameOf(this.zone.buildings[w.shopK ?? 0]) : w.vend === 'butcher' ? L.vendorButcherSub : L.vendorJunkSub;
    if (w.tour) return L.touristSub;
    if (w.civ) return CIV[w.civ].dmg >= 1.6 ? L.civStrong : L.npcSub.passer; // 42차: 건드리면 크게 맞서는 시민
    if (w.noeulAlly) return L.crusadeNoeulSub;
    if (w.kind === 'marionette') return L.marionetteSub.replace('{s}', String(Math.ceil(w.marion?.left ?? 0)));
    if (w.kind === 'fighter') return L.soulFighterSub;
    if (w.weak === 'drunk') return L.drunkSub;
    if (w.weak === 'shade') return L.shadeSub;
    if (w.gang === 'robber') return L.robberSub;
    if (w.gang === 'mafia') return L.mafiaSub;
    if (w.gang) return this.gangText(w.gang, 'Sub') as string;
    if (w.kind === 'yellowwing') return L.ywSubParent;
    if (w.kind === 'noeul') return L.noeulSubArch;
    if (w.kind === 'caged') return w.cage?.kind === 'sinner' ? L.zooSinnerSub : w.cage?.kind === 'beast' ? L.zooBeastSub : L.zooDemonSub;
    if (w.kind === 'sleeper') return L.sleeperSub;
    if (w.taxi) return L.taxiAngelSub[w.look?.sex === 'f' ? 1 : 0];
    if (w.preach !== undefined) return this.nameOf(this.zone.buildings[w.preach]);
    if (w.tail) return w.tail.kind === 'chef' ? L.chefSub : w.tail.kind === 'accubus' ? L.accSub : L.admirerSub;
    if (w.kind === 'officer') return L.officerSub;
    if (w.dumpAngel) return L.dumpAngelSub;
    if (w.stiffBoss) return w.stiffBoss === 2 ? L.stiffBossSub2 : L.stiffBossSub;
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
  private storeWant: { k: number; kind: StoreKind | 'bank' | 'enter' | 'ride'; spot: [number, number] } | null = null;
  /** 46차: 놀이기구 앞까지 걸어가 안내 천사에게 묻는다 */
  private goRide(k: number) {
    const b = this.zone.buildings[k];
    const spot = this.frontOf(b);
    if (!spot) return;
    this.cancelActs();
    if (!this.walkTo(spot[0], spot[1])) { if (Math.hypot(spot[0] + 0.5 - this.player.x, spot[1] + 0.5 - this.player.y) < 3) this.hooks.ride(k, (b as { att?: string }).att ?? ''); return; }
    this.storeWant = { k, kind: 'ride', spot };
  }
  // ───── 46차 놀이기구 타기: 대관람차는 한 바퀴(칸에 앉아 하늘까지) · 회전목마는 두 바퀴(오르내리며) · 롤러코스터는 레일을 따라 오르내린다 ─────
  private riding: { k: number; att: string; t: number; t0: number; T: number; back: [number, number] } | null = null;
  private rideCar: Graphics | null = null;
  /** 타는 것: 대관람차 칸(지붕 · 창틀 · 앞판) · 날개 달린 목마(기둥) · 롤러코스터 빨간 칸 — 사람 앞에 그린다 */
  private drawRideCar(att: string, x: number, y: number, t: number) {
    const g = this.rideCar!; g.clear();
    if (att === 'ferris') {
      g.moveTo(x, y - 40).lineTo(x, y - 30).stroke({ color: 0xc9a23e, width: 2 });
      g.roundRect(x - 15, y - 31, 30, 6, 3).fill(0xf28aa8);
      g.rect(x - 14, y - 26, 2, 22).fill(0xfbf8f0); g.rect(x + 12, y - 26, 2, 22).fill(0xfbf8f0);
      g.roundRect(x - 15, y - 10, 30, 12, 3).fill(0xf28aa8).stroke({ color: 0xfbf8f0, width: 1.5 });
      g.rect(x - 11, y - 7, 22, 2).fill({ color: 0xffffff, alpha: 0.6 });
    } else if (att === 'carousel') {
      g.rect(x - 1, y - 60, 2, 66).fill(0xd9b44a);
      g.ellipse(x, y - 4, 13, 6).fill(0xfbfaf6); g.rect(x + 9, y - 14, 5, 10).fill(0xfbfaf6); g.ellipse(x + 13, y - 15, 4, 3).fill(0xfbfaf6);
      g.rect(x - 9, y + 1, 2, 7).fill(0xeeeae0); g.rect(x + 6, y + 1, 2, 7).fill(0xeeeae0);
      const fl = Math.sin(t * 8) * 3; g.poly([x - 4, y - 8, x - 16, y - 16 - fl, x - 10, y - 6]).fill(0xf2d27a); g.rect(x - 6, y - 7, 10, 3).fill(0xe85a6a);
    } else {
      g.roundRect(x - 14, y - 9, 28, 11, 3).fill(0xe83a4a).stroke({ color: 0x8a1a22, width: 1 });
      g.rect(x - 12, y - 7, 24, 2).fill({ color: 0xffd8a8, alpha: 0.8 }); g.circle(x - 8, y + 3, 2.5).fill(0x3a3a40); g.circle(x + 8, y + 3, 2.5).fill(0x3a3a40);
    }
  }
  get isRiding() { return !!this.riding; }
  ride(k: number) {
    const b = this.zone.buildings[k] as Building & { att?: string };
    if (!b?.att || b.cat !== 'attraction' || this.riding) return;
    this.rideCar?.destroy(); this.rideCar = new Graphics(); this.rideCar.eventMode = 'none'; this.objects.addChild(this.rideCar);
    const p = this.player;
    this.cancelActs(); p.path = []; p.target = null; p.act = null;
    this.riding = { k, att: b.att, t: 0, t0: performance.now(), T: b.att === 'ferris' ? 18 : b.att === 'carousel' ? 14 : 10, back: [p.x, p.y] };
  }
  private updateRide(dt: number) {
    const r = this.riding; if (!r) return;
    const p = this.player, b = this.zone.buildings[r.k] as Building & { att?: string };
    r.t = (performance.now() - r.t0) / 1000; // 벽시계로 (프레임이 느려도 제때 끝난다)
    const q = Math.min(1, r.t / r.T);
    const cx = b.i0 + b.w / 2, cy = b.j0 + b.d / 2;
    p.path = []; p.target = null; p.x = cx; p.y = b.j0 + b.d + 0.6; // 카메라는 놀이기구를 본다
    const [bx, by] = iso(cx, cy);
    let x = bx, y = by, sc = 0.82, front = true;
    if (r.att === 'ferris') {
      const a = Math.PI / 2 - q * Math.PI * 2, R = 130; // 맨 아래에서 시작해 한 바퀴
      x = bx + Math.cos(a) * R; y = by - 160 + Math.sin(a) * R + 36; // 바퀴 테에 매달린 칸 바닥
      p.dir = 'sw';
    } else if (r.att === 'carousel') {
      const a = Math.PI / 2 + q * Math.PI * 4;
      x = bx + Math.cos(a) * 70; y = by - 70 + Math.sin(a) * 30 + 48 - Math.abs(Math.sin(r.t * 3)) * 6; front = Math.sin(a) > -0.2;
      p.dir = Math.cos(a) > 0 ? 'nw' : 'se'; sc = 0.78;
    } else {
      const u = q < 0.5 ? q * 2 : 2 - q * 2; // 끝까지 갔다가 되돌아온다
      const ii = b.i0 + 0.6 + u * (b.w - 1.2), jj = b.j0 + b.d / 2 + Math.sin(u * Math.PI * 3) * (b.d / 2 - 1), z = 30 + Math.abs(Math.sin(u * Math.PI * 2.2)) * (b.h - 50);
      const [ax, ay] = iso(ii, jj); x = ax; y = ay - z - 6;
      p.dir = q < 0.5 ? 'se' : 'nw'; sc = 0.75;
    }
    const base = Math.abs(p.sprite.scale.y) || 0.5; // 이 프레임에 몸 그림이 정한 크기 (도트 밀도마다 다르다)
    sc = base * (r.att === 'carousel' ? 0.9 : 0.8);
    const yy = r.att === 'carousel' ? y - 6 : y;
    p.sprite.position.set(x, yy);
    p.sprite.scale.set(Math.sign(p.sprite.scale.x || 1) * sc, sc);
    p.sprite.zIndex = front ? 1e7 : (b.i0 + b.j0) - 1;
    if (this.rideCar) { this.drawRideCar(r.att, x, y, r.t); this.rideCar.zIndex = p.sprite.zIndex + 0.5; }
    if (q >= 1) {
      this.riding = null;
      this.rideCar?.destroy(); this.rideCar = null;
      p.sprite.scale.set(base);
      const f = this.frontOf(b) ?? [Math.round(r.back[0]), Math.round(r.back[1])];
      p.x = f[0] + 0.5; p.y = f[1] + 0.5;
      const ls = t().rideDone[r.att === 'ferris' ? 0 : r.att === 'carousel' ? 1 : 2]; this.bubble(p, ls[Math.floor(Math.random() * ls.length)]);
    }
  }
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
    if (w.kind === 'changer') { const n = t().xchIdle; this.bubble(w, n[Math.floor(Math.random() * n.length)]); return; } // 33차: 환전상은 싸우지 않는다
    if (w.kind === 'goatking') { w.dir = dirFromTile(this.player.x - w.x, this.player.y - w.y, w.dir); const n = t().gkNoFight; this.bubble(w, n[Math.floor(Math.random() * n.length)]); return; } // 31차: 염소대왕은 싸우지 않는다 (뿔은 그냥 달려 있다)
    if (w.kind === 'maskgirl') { w.dir = dirFromTile(this.player.x - w.x, this.player.y - w.y, w.dir); this.bubble(w, t().maskNoFight); return; } // 25차: 중립 — 맞지도 때리지도 않는다
    if (w.kind === 'yunae') { w.dir = dirFromTile(this.player.x - w.x, this.player.y - w.y, w.dir); const n = t().yunaeNoFight; this.bubble(w, n[Math.floor(Math.random() * n.length)]); return; } // 28차: 유내에게는 손을 들 수 없다
    if (w.down > 0) return;
    // 31차: 활·총을 들었는데 쏠 것이 없으면 붙어서 활로 때리지 않는다 — 알리고 멈춘다
    if (this.gear.dry) { this.player.target = null; this.hooks.noShots(); return; }
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
  /** 45차 헬스장·도장: 제자리에서 샌드백·미트를 친다 (움직이면 main이 운동을 그만둔다) */
  trainSwing(): boolean {
    const p = this.player;
    if (!p || this.dead || p.path.length || p.target) return false;
    if (!p.act) { const anim: Anim = p.cs?.attack ?? 'punch'; p.act = { anim, t: 0, alt: anim === 'punch' ? (p.punchAlt = !p.punchAlt) : false }; }
    return true;
  }
  playerMoving() { return !!this.player?.path.length || !!this.player?.target; }
  /** 45차 지옥 괴물의 마지막: 지금 장면을 허리에서 둘로 잘라, 윗몸은 맞은 쪽 반대로 튀며 돌고 아랫몸은 잠깐 섰다가 무너진다 */
  private splitDeath(w: Walker, by: Walker) {
    const sp = w.sprite, tx = sp.texture;
    if (!tx || tx === Texture.EMPTY || !sp.visible) return;
    const fr = tx.frame, W = fr.width, H = fr.height;
    if (W < 4 || H < 8) return;
    const cut = Math.round(H * (0.42 + Math.random() * 0.12));
    const tTop = new Texture({ source: tx.source, frame: new Rectangle(fr.x, fr.y, W, cut) });
    const tBot = new Texture({ source: tx.source, frame: new Rectangle(fr.x, fr.y + cut, W, H - cut) });
    const c = new Container();
    c.position.copyFrom(sp.position); c.scale.copyFrom(sp.scale); c.zIndex = sp.zIndex;
    const lx = -sp.anchor.x * W + W / 2, ly = -sp.anchor.y * H;
    const top = new Sprite(tTop); top.anchor.set(0.5, 1); top.position.set(lx, ly + cut);
    const bot = new Sprite(tBot); bot.anchor.set(0.5, 1); bot.position.set(lx, ly + H);
    c.addChild(bot, top);
    this.objects.addChild(c);
    sp.renderable = false;
    const away = Math.sign((w.x - w.y) - (by.x - by.y)) || 1;
    const b = this.bodyOf(w);
    const col = b === 'bones' ? 0xcfc2a2 : b === 'ash' ? 0x2e2824 : b === 'pret' ? 0x4e5a24 : 0x8a0e0a;
    this.splits.push({ c, top, bot, t: 0, vx: away * (10 + Math.random() * 8) * Math.sign(sp.scale.x || 1), spin: away * (1.4 + Math.random() * 0.8) * Math.sign(sp.scale.x || 1), tip: (Math.random() < 0.5 ? -1 : 1) * (1.1 + Math.random() * 0.3), cutX: lx, cutY: ly + cut, col, w });
    this.splat(w, 26);
    sfx.thud(this.spotOf(w));
  }
  private updateSplits(dt: number) {
    for (let k = this.splits.length - 1; k >= 0; k--) {
      const q = this.splits[k];
      q.t += dt;
      const t = q.t;
      // 윗몸: 솟았다가 떨어지며 돈다 (땅에 닿으면 멈춤)
      const air = Math.min(t / 0.55, 1);
      q.top.x = q.cutX + q.vx * air * 2.2;
      q.top.y = q.cutY - Math.sin(air * Math.PI) * 26 + air * (q.bot.y - q.cutY - 4);
      q.top.rotation = q.spin * air * 1.2;
      // 아랫몸: 0.25초 서 있다가 옆으로 무너진다
      const fall = Math.max(0, Math.min(1, (t - 0.25) / 0.35));
      q.bot.rotation = q.tip * fall * fall;
      // 잘린 자리에서 피가 솟는다 (0.7초)
      if (t < 0.7 && q.w.sprite && !q.c.destroyed) {
        const gx = q.c.x + (q.cutX + q.vx * air * 1.1) * q.c.scale.x, gy = q.c.y + (q.cutY - Math.sin(air * Math.PI) * 13) * q.c.scale.y;
        for (let n = 0; n < 3; n++) this.sparks.push({ x: gx + (Math.random() - 0.5) * 6, y: gy, vx: (Math.random() - 0.5) * 70, vy: -90 - Math.random() * 110, t: 0.35 + Math.random() * 0.3, col: q.col });
      }
      if (t > 2.0) q.c.alpha = Math.max(0, 1 - (t - 2.0) / 0.6);
      if (t > 2.6) {
        q.c.destroy({ children: true });
        this.splits.splice(k, 1);
        if (!q.w.sprite.destroyed) q.w.sprite.renderable = true;
      }
    }
  }
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
    if (w.mdef) { const fc = floorCurve(this.zone.hell?.floor ?? 1); return w.mdef.boss ? fc.bossHit : fc.hit; } // 46차 기준점 (1~5층은 예전 그대로)
    if (w.kind === 'suturer') return 8;
    if (w.kind === 'fighter') return 5;
    if (w.kind === 'remote') return 4;
    if (w.weak) return 1;
    if (w.gang === 'mafia' || w.gang === 'enforcer') return 7;
    if (w.gang === 'robber' || w.gang === 'boxer') return w.gang === 'boxer' ? 6 : 5;
    if (w.gang === 'pickpocket') return 4;
    return 3; // 불량배
  }
  private rollHits(bonus: number) {
    return rollToHit(bonus, armorClass(this.gear.def, this.stats.agi)).hit;
  }
  private hit(from: Walker, to: Walker, dmg: number, crit = false, kind?: sfx.HitKind) {
    if (to.kind === 'maskgirl' || to.kind === 'yunae' || to.kind === 'goatking' || to.kind === 'changer') return;
    if (to.fb && !from.isPlayer && from.kind !== 'remote' && from.kind !== 'fighter' && from.kind !== 'marionette') return; // 31차: 필드 보스는 영혼(과 부른 켈베로스)에게만 맞는다 — 경비병·탈루스가 몰래 잡던 것 // 25차: 소녀는 맞지 않는다 · 28차: 유내도
    if (to.down > 0 || this.dead) return;
    // 44차 층계 대기소 · 광산 작업장: 영혼끼리는 싸울 수 없다 (치는 쪽이든 맞는 쪽이든 그 안에 있으면)
    if (to.kind === 'remote' && from.isPlayer && (this.inSafe(from.x, from.y) || this.inSafe(to.x, to.y))) { this.float(from, t().safeNoFight, '#e8e0c8'); from.target = null; return; }
    // 44차 화살 효과 (내가 활로 쏜 화살이 닿았을 때)
    if (from.isPlayer && to !== from && this.gear.ranged && this.gear.arrowFx && dmg > 0 && !to.mirror && to.kind !== 'remote') {
      const fx = this.gear.arrowFx;
      if (fx === 'pierce' && (to.mdef?.boss || to.fb || to.gdef)) dmg = Math.round(dmg * 1.3);
      else if (fx === 'fire') { to.burnT = 3; to.burnDps = Math.max(2, dmg * 0.3); }
      else if (fx === 'slow') to.slowT = Math.max(to.slowT ?? 0, 2.5);
      else if (fx === 'drain') { const g = Math.max(1, Math.round(dmg * 0.2)); from.hp = Math.min(from.maxHp, from.hp + g); this.float(from, `+${g}`, '#8ae07a'); }
    }
    // 43차 마리오네트: 곁(3칸 안)에 있으면 괴물이 나를 칠 때 셋 중 하나쯤은 대신 맞는다
    if (to.isPlayer && (from.mdef || from.fb) && dmg > 0) {
      const mr = this.walkers.find((x) => x.kind === 'marionette' && x.down <= 0);
      if (mr && Math.hypot(mr.x - to.x, mr.y - to.y) < 3 && Math.random() < 0.35) { this.hit(from, mr, dmg, crit, kind); return; }
    }
    // 17차 회피: 공격자가 d20 + 명중 보너스를 굴려 내 회피 등급(10 + 방어력 ÷ 2 + 민첩 ÷ 5)을 넘어야 맞는다. 방어력은 피해를 줄이지 않는다
    if (to.isPlayer && from !== to && !this.rollHits(this.toHitBonus(from))) {
      // 46차: 6층부터는 빗나가도 스친다 (10층부터는 회피만으로 버틸 수 없다)
      const gz = (from.mdef || from.fb) && this.zone.hell ? floorCurve(this.zone.hell.floor).graze : 0;
      if (gz <= 0 || dmg <= 0) return;
      dmg = Math.max(1, Math.round(dmg * gz)); crit = false;
    } // 31차: 헛방 — 글자 없이 (휘두름만 있고 타격음·번쩍임·움찔이 없다)
    if (to.isPlayer) this.lastHitBy = from.kind === 'remote' ? (from.rid ?? null) : null;
    // 30차 내구도: 내가 때리면 무기가, 맞으면 입은 방어구가 닳는다
    if (from.gang === 'collector' && to.isPlayer && dmg > 0 && Math.random() < 0.55) { const want = Math.min(1500, Math.max(5, Math.round(this.hooks.cash() * (0.02 + Math.random() * 0.03)))); const got = this.hooks.cash() > 0 ? this.hooks.stolen(want) : 0; if (got > 0) { from.pick = { stolen: (from.pick?.stolen ?? 0) + got, flee: 0 }; this.float(to, `−${moneyText(got)}`, '#ff8a6a'); if (!from.bubble) this.bubble(from, (this.gangText('collector', 'Interest') as string[])[Math.floor(Math.random() * 3)]); } } // 48차: 맞을 때마다 '이자'를 떼 간다 — 쓰러뜨리면 고스란히 떨어진다
    if (to.untilHit && from.isPlayer) { to.untilHit = false; to.target = from; to.firstBy ??= from; this.bubble(to, t().torturerAngry[Math.floor(Math.random() * t().torturerAngry.length)]); } // 48차: 고문하던 괴물은 맞고서야 돌아선다
    if (from.isPlayer && to.stiffBoss && !to.firstBy) { to.firstBy = from; to.wait = 0; to.target = from; this.hooks.deed('firstStrike'); this.markCrime(); this.bubble(to, t().stiffBossFight[Math.floor(Math.random() * t().stiffBossFight.length)]); } // 47차: 사장을 먼저 치면 악행
    if (from.isPlayer && from !== to && this.gear.weapon) this.hooks.wear('weapon');
    if (to.isPlayer && from !== to && dmg > 0) this.hooks.wear('armor');
    // 마을과 둘레에서 다른 영혼이나 경비병을 치면 경비병이 나선다
    if (from.isPlayer && this.zone.hell && (to.gdef || (to.kind === 'remote' && this.nearRest(to.x, to.y, 6)))) this.guardAlarm(to.gdef ? to : null);
    if (kind) sfx.impact(kind, this.spotOf(to), crit, this.bodyOf(to), (to.voice ??= 0.85 + Math.random() * 0.3), to.size ?? (to.gang === 'mafia' ? 1.1 : 1));
    this.impactFx(from, to, crit, kind);
    // 45차: 현실의 싸움은 말이 많다 — 시민·범죄자가 나와 주먹을 주고받는 동안 가끔 한마디 (사람마다 몇 초에 한 번)
    if (this.realm === 'real' && dmg > 0 && (from.isPlayer || to.isPlayer)) { const o = from.isPlayer ? to : from; if (o.kind === 'passer' || o.kind === 'thug') this.fightBark(o, from === o); }
    // 41차: 방장 몹의 거울 — 체력은 방장 기기가 계산한다. 나는 '때렸다'만 알린다 (먼저 때린 행인이면 악행은 내 몫)
    if (to.mirror) {
      if (from.isPlayer || from.kind === 'fighter') {
        if (!to.firstBy && from.isPlayer && to.kind === 'passer') { to.firstBy = from; this.hooks.deed('firstStrike'); this.markCrime(); }
        to.hurtT = 0.18; to.barT = 5;
        if (!to.act) to.act = { anim: 'hit', t: 0 };
        if (from.isPlayer) this.combatT = 0;
        if (to.nid) this.mobOut?.hit(to.nid, dmg, crit, kind ?? 'fist');
      }
      return;
    }
    // 다른 사람(실시간): 체력은 그 사람 기기가 계산한다. 몸만 남은 사람은 여기서 계산
    if (to.kind === 'remote' && to.rid && !to.lingerT) {
      if (!from.isPlayer && this.netRole === 'host' && this.isShared(from)) { from.nid ??= ++this.nidSeq; this.mobOut?.strike(to.rid, from.nid, dmg, crit, kind ?? 'fist'); to.barT = 5; return; }
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
    if (to.kind === 'dog' && to.hp > 0 && to.hp < to.maxHp * 0.3 && !to.flee && Math.random() < 0.6) { to.flee = 8; to.target = null; to.path = []; to.act = null; to.pend = null; this.bubble(to, t().dogYelp[Math.floor(Math.random() * t().dogYelp.length)]); if (from.isPlayer) this.player.target = null; return; } // 48차: 다친 개는 깨갱 달아난다
    if (to.kind === 'dog' && from.isPlayer) for (const x of this.packOf(to)) if (!x.target && !x.flee) { x.target = from; x.repathT = 0; } // 하나를 때리면 무리가 덤빈다
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
    // 29차: 행인에게 시비를 건 적대 행인을 거든다 — 그 적이 쓰러지면 선행 (누가 마무리하든)
    if (from.isPlayer && to.kind === 'thug' && to.target && !to.target.isPlayer && to.target.kind === 'passer' && !to.helped) {
      to.helped = true;
      const v = to.target;
      if (v.down <= 0 && !v.bubble) this.bubble(v, t().helpCalls[Math.floor(Math.random() * t().helpCalls.length)]);
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
    if (w.kind === 'goat' || w.kind === 'dog') return 'yak';
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
    // 42차: 맞아서 밀려나는 것은 치명타 때만 (보통 타격은 움찔만 한다)
    if (crit) { const push = (heavy ? 0.5 : 0.42) * (to.kind === 'suturer' && !to.monster ? 0.5 : 1); to.kb = { dx: (dx / d) * push, dy: (dy / d) * push, t: 0.12 }; }
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
    {
      // 24차 손맛 → 43차: 어떤 공격이든(주먹·칼·총·활·불길) 마지막 일격은 화끈하게 — 길게 멈칫, 하얗게 번쩍, 크게 흔들리고,
      // 몸이 포물선을 그리며 두어 칸 날아가 굴러떨어진다 (땅에 닿을 때 한 번 더 쿵 · 먼지). 큰 몸(층주·필드 보스·염소)은 덜 날아간다
      const mine = by.isPlayer, heavy = !!(w.mdef?.boss || w.fb || w.kind === 'goat' || w.kind === 'goatking');
      // 45차 후속: 남의 싸움(경비병·다른 영혼·노을·마리오네트)으로 내 화면이 흔들리고 멈칫하던 것 — 내가 치거나 내가 쓰러질 때만
      if (mine || w.isPlayer) {
        this.hitStop = Math.max(this.hitStop, mine ? 0.24 : 0.12);
        this.shakeT = Math.max(this.shakeT, mine ? 0.42 : 0.2); this.shakeA = Math.max(this.shakeA, mine ? (heavy ? 12 : 9) : 4);
      }
      const dx = w.x - by.x, dy = w.y - by.y, d = Math.hypot(dx, dy) || 1;
      // 46차 후속: 쓰러지는 모습을 무작위로 — 가까이(0.5칸) · 중간(1.3칸) · 멀리(2.6칸, 높이 솟아 크게 돈다) · 두 동강(지옥 괴물만, 현실엔 없다)
      // 큰 몸(층주 · 필드 보스 · 염소)과 나 자신은 예전처럼 조금만. 남이 쓰러뜨린 것은 조금 덜 날아간다
      const canSplit = !!(this.zone.hell && w.mdef && !w.mdef.boss && !w.fb && !w.mirror && !(w.mdef.revive && !w.revived));
      const r = Math.random();
      const style: NonNullable<Walker['deathStyle']> = heavy || w.isPlayer ? 'near' : canSplit ? (r < 0.22 ? 'near' : r < 0.5 ? 'mid' : r < 0.72 ? 'far' : 'split') : r < 0.33 ? 'near' : r < 0.72 ? 'mid' : 'far';
      w.deathStyle = style;
      const k0 = mine ? 1 : 0.7;
      const far = heavy ? 0.6 : w.isPlayer ? 0.9 : (style === 'near' ? 0.5 : style === 'mid' ? 1.3 : style === 'far' ? 2.6 : 0.25) * k0;
      const hh = heavy ? 4 : w.isPlayer ? 8 : (style === 'near' ? 5 : style === 'mid' ? 11 : style === 'far' ? 22 : 2) * (mine ? 1 : 0.8);
      const sp = heavy ? 0.1 : style === 'far' ? 0.9 + Math.random() * 0.5 : style === 'near' ? 0.25 : style === 'split' ? 0 : 0.45;
      w.kb = { dx: (dx / d) * far, dy: (dy / d) * far, t: style === 'far' ? 0.5 : 0.33 };
      w.fly = { t: 0, dur: style === 'far' ? 0.6 : style === 'near' ? 0.3 : 0.4, h: hh, spin: (dx - dy >= 0 ? 1 : -1) * sp, mine: mine || w.isPlayer };
      w.flashT = Math.max(w.flashT ?? 0, 0.07);
      this.splat(w, mine ? 16 : 9);
      const [sx, sy] = iso(w.x, w.y);
      const col = this.realm === 'heaven' ? 0xfff2b0 : 0xb8a888, blood = this.realm === 'heaven' ? 0xffffff : 0x9a1a10;
      for (let k = 0; k < (mine ? 28 : 14); k++) { const a = Math.random() * Math.PI * 2, v = 70 + Math.random() * 120; this.sparks.push({ x: sx, y: sy - 14, vx: Math.cos(a) * v, vy: Math.sin(a) * v * 0.45 - 30, t: 0.22 + Math.random() * 0.18, col: k % 3 ? col : blood }); }
      this.flingRings.push({ x: sx, y: sy - 12, t: 0, dur: 0.28 });
    }
    w.hp = 0;
    w.down = 30;
    w.path = [];
    w.target = null;
    w.flee = 0;
    w.pend = null;
    w.act = { anim: 'fall', t: 0 };
    const remoteKill = by.kind === 'remote' && this.netRole === 'host';
    if (remoteKill && by.rid) { w.nid ??= ++this.nidSeq; this.mobOut?.kill(w.nid, by.rid); }
    if (w.fb) this.fieldBossDown(w, by);
    if (w.kind === 'thug' && w.helped && !this.dead && this.realm === 'real') {
      w.helped = false;
      this.hooks.deed('helpNpc');
      this.float(w, t().helpedNpc, '#9fe0a8');
      const v = this.walkers.find((o) => o.kind === 'passer' && o.firstBy === w && o.down <= 0);
      if (v) {
        v.target = null; v.dir = dirFromTile(this.player.x - v.x, this.player.y - v.y, v.dir); const th = t().helpThanks; this.bubble(v, th[Math.floor(Math.random() * th.length)]);
        if (Math.random() < 0.6) v.owe = { t: 5 + Math.random() * 18, ready: false }; // 34차: 가끔은 나중에 찾아와 사례를 한다
      }
    }
    if (by.isPlayer) {
      by.target = null;
      if (w.kind === 'thug' && w.stiffBoss) { /* 47차 떼먹은 사장: 쓰러뜨려도 선행은 아니다 (먼저 친 악행은 이미 셈했다) */ }
      else if (w.kind === 'thug') {
        if (w.weak === 'drunk') this.hooks.deed('drunkDown');
        else if (w.weak === 'shade') this.hooks.deed('shadeDown');
        else {
          this.hooks.deed(w.gang === 'mafia' || w.gang === 'enforcer' ? 'gangDown' : w.gang === 'robber' || w.gang === 'boxer' ? 'robberDown' : 'thugDown');
          if (w.firstBy === w) this.hooks.deed('counterWin');
        }
      }
      // 32차: 쓰러뜨린 사람이 들고 있던 무기 — 처음 만난 야구 배트만 반드시, 그 뒤로는 무엇이든(배트·쇠파이프·칼·우산…) 보통 확률로
      if (this.realm === 'real' && (w.kind === 'thug' || w.kind === 'passer') && w.weapon) {
        const first = w.weapon === 'bat' && !this.loots.some((l) => l.key === 'bat') && this.hooks.beginnerBat();
        if (first || Math.random() < (w.weapon === 'pistol' ? GUN_DROP : WEAPON_DROP)) this.dropLoot(w.x + 0.4, w.y + 0.2, w.weapon, first ? 300 : 240);
      }
    }
    if (w.noeulAlly) { w.down = 12; w.target = null; const fl = t().crusadeNoeulDown; this.bubble(w, fl[Math.floor(Math.random() * fl.length)]); return; } // 45차: 노을은 무릎 꿇었다가 다시 선다
    if (w.kind === 'suturer') { w.down = 4; return; }
    // 경비병: 쓰러뜨려도 보상·카르마·영격 없음. 잠시 뒤 자리로 돌아온다
    if (w.gdef) { w.down = 25; w.warnT = 0; if (by.isPlayer) this.float(w, t().guardNoReward, '#c9c0b0'); return; }
    // 20차 천국: 악마를 쓰러뜨려도 보상·경험치·카르마 없음. 천사는 쓰러졌다 다시 일어난다
    if (this.realm === 'heaven' && (w.mdef || w.kind === 'angel' || w.kind === 'passer')) { w.down = w.kind === 'angel' ? 8 : 3; if (by.isPlayer && w.mdef) this.float(w, t().heavenNoReward, '#e8e0c8'); return; } // 21차: 천국의 행인은 맞아도 죽지 않는다
    // 43차 인형병사: 처음 쓰러지면 보이지 않는 실이 끌어올려 한 번 더 선다 (보상은 두 번째에)
    if (w.mdef?.revive && !w.revived && !remoteKill) { w.revived = true; w.reviveUp = true; w.down = 2.2; this.float(w, t().puppetRise, '#e8e0d0'); return; }
    if (w.mdef) {
      if (w.deathStyle === 'split' && this.zone.hell) this.splitDeath(w, by); // 45차 → 46차 후속: 지옥 괴물은 가끔(넷에 하나쯤) 피를 뿜으며 두 동강 난다
      const f = this.zone.hell?.floor ?? 1;
      const mult = f * (w.mdef.boss ? 6 : w.elite ? 2 : 1); // 44차: 사나운 괴물은 두 배
      let share = 1;
      w.down = 5;
      if (by.isPlayer || by.kind === 'marionette') this.hooks.deed('hellMonster', { floor: mult }); // 43차: 마리오네트가 잡은 것은 줄을 당긴 내 몫
      else if (by.gdef || by.kind === 'talus' || by.kind === 'fighter') {
        // 내가 싸우던 괴물을 경비병(또는 탈루스)이 마무리: 내가 준 피해만큼(25~80%) 영격과 노전을 나눠 받는다
        const pd = w.pdmg ?? 0;
        share = pd > 0 ? Math.max(0.25, Math.min(0.8, pd / w.maxHp)) : 0;
        if (share > 0 && !this.dead) this.hooks.deed('hellMonster', { floor: mult, share });
        // 경비병이 잡은 만큼 곧바로 다시 채운다 (몸이 빨리 사라지고 바깥 들판에 새 괴물)
        if (!w.mdef.boss) w.down = 1.2;
        this.guardKills++;
      }
      if (w.mdef.boss) { this.bossDown = true; this.drawFeatures(); this.bossFallFx(w); this.hooks.bossDown(f, by.isPlayer || by.kind === 'marionette' ? 'me' : by.kind === 'remote' ? by.rinfo?.nick || by.rinfo?.name || '' : ''); }
      // 드물게 노전 말고 물건도 떨어진다 (층주는 둘)
      if (remoteKill) return; // 41차: 손님이 잡은 괴물의 노전·물건은 손님 기기에 떨어진다
      if (share > 0 || by.isPlayer || by.kind === 'marionette') for (let n = w.mdef.boss ? 2 : Math.random() < (w.elite ? 0.1 : 0.05) ? 1 : 0; n > 0; n--) this.dropLoot(w.x + (n - 1) * 0.6, w.y + 0.3, rollLoot(f));
      // 30차 템브라 파편: 지옥 어디서나 아주 드물게 (보통 2.5% · 층주 40%)
      if ((share > 0 || by.isPlayer) && Math.random() < (w.mdef.boss ? 0.4 : 0.025)) this.dropLoot(w.x - 0.4, w.y + 0.5, 'tshard', 300);
      // 22차: 지옥 괴물의 노전도 폭을 넓혀 무작위로 (최소는 그대로, 최대는 약 1.8배)
      if (share > 0) this.dropCoin(w.x, w.y, Math.max(1, Math.round(rand(w.mdef.notes[0], Math.round(w.mdef.notes[1] * 1.8)) * (w.mdef.boss ? 1 : f) * share * (w.elite ? 2.2 : 1))), false, true);
      return;
    }
    if (w.weak === 'shade') { w.down = 2.5; return; } // 그림자는 흩어질 뿐 남기는 게 없다
    if (remoteKill) return; // 41차: 손님이 쓰러뜨린 사람의 돈은 손님 기기에 떨어진다
    // 22차: 적대 NPC가 떨어뜨리는 돈은 폭을 넓혀 무작위로 — 취객 1~4 · 불량배 2~6 · 강도 3~9 · 마피아 4~12
    // 26차 경제: 싸움 한 번에 드는 끼니값보다 조금 더 (취객 2~6 · 불량배 5~12 · 강도 12~28 · 마피아 25~60)
    // 42차: 현실의 돈은 일해서 번다 — 거리의 적이 떨어뜨리는 돈을 대략 절반으로
    const amount = w.stiffBoss ? Math.round((w.owed ?? 50) * (1.5 + Math.random())) : w.kind === 'thug' ? (w.gang === 'mafia' ? rand(15, 35) : w.gang === 'robber' ? rand(7, 16) : w.gang === 'enforcer' ? rand(24, 50) : w.gang === 'boxer' ? rand(12, 25) : w.gang === 'pickpocket' ? rand(3, 8) + (w.pick?.stolen ?? 0) : w.gang === 'collector' ? rand(18, 40) + (w.pick?.stolen ?? 0) : w.weak === 'drunk' ? rand(1, 3) : rand(3, 7)) : w.tour ? touristCash() : passerCash();
    this.dropCoin(w.x, w.y, amount, w.kind === 'passer');
  }

  /**
   * 고문 장면 하나: 0 = 그 층의 고문(26차 — 1층 화형 · 2층 늪에 담그기 · 3층 피 흥건한 채찍질 · 4층 용광로), 1 = 바닥에 쓰러진 망자를 몽둥이로
   * (1~4층 밖은 0도 말뚝에 묶어 두고 때린다)
   */
  private addTorture(i: number, j: number, variant: number) {
    const f = this.zone.hell!.floor;
    const lying = variant === 1;
    const style: Torture['style'] = lying ? 'beat' : ({ 1: 'burn', 2: 'dunk', 3: 'whip', 4: 'furnace', 5: 'strings' } as Record<number, Torture['style']>)[f] ?? 'beat';
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
    } else if (style === 'strings') {
      // 43차 5층 실 매달기: 두 기둥에 걸친 커다란 마리오네트 십자 막대 — 망자는 손목·목·발목이 실에 묶여 땅에서 조금 떠 있다. 발밑엔 깨진 가면
      g.ellipse(sx, sy + 3, 28, 10).fill({ color: 0x1a1820, alpha: 0.55 });
      for (const dx of [-30, 30]) g.rect(sx + dx - 3, sy - 112, 6, 110).fill(0x3a2a20).rect(sx + dx - 3, sy - 112, 2, 110).fill(0x5a4230);
      g.rect(sx - 36, sy - 116, 72, 6).fill(0x4a3424).rect(sx - 36, sy - 116, 72, 2).fill(0x6a4c34);
      g.rect(sx - 3, sy - 122, 6, 18).fill(0x4a3424).rect(sx - 18, sy - 108, 36, 4).fill(0x4a3424); // 십자 막대
      for (const [dx, dy, c] of [[-16, 4, 0xece6da], [12, 6, 0xd8d0c4], [-4, 9, 0xf2eee6]] as [number, number, number][]) {
        g.ellipse(sx + dx, sy + dy, 4, 2.4).fill(c);
        g.rect(sx + dx - 2, sy + dy - 1, 1, 1).fill(0x141014).rect(sx + dx + 1, sy + dy - 1, 1, 1).fill(0x141014);
        g.moveTo(sx + dx - 2, sy + dy + 1).lineTo(sx + dx + 2, sy + dy + 1).stroke({ color: 0xa82030, width: 1 });
      }
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
    charSet(tlook, f === 5 ? 'saber' : 'club').then((cs) => { q.tcs = cs; });
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
        if (q.vcs) applyFrame(q.vic, q.lying ? frameOf(q.vcs, 'fall', q.vdir, (q.vcs.counts.fall ?? 1) - 1) : frameOf(q.vcs, 'idle', q.vdir, 0), BODY_K);
        if (q.style === 'dunk' || q.style === 'furnace') q.vic.y = sy - 8 + q.sink * 46;
        if (q.style === 'strings') q.vic.y = sy - 10 - 3 * Math.sin(q.t * 1.7);
        if (q.spark.alpha > 0) q.spark.alpha = Math.max(0, q.spark.alpha - dt * 5);
        continue;
      }
      // 늪·용광로는 한 번 담갔다 꺼내는 데 더 오래 걸린다
      const cycle = q.style === 'dunk' || q.style === 'furnace' ? 4.2 + Math.random() * 1.6 : 1.5 + Math.random() * 1.1;
      if (q.t >= q.next) { q.t0 = q.t; q.struck = false; q.next = q.t + cycle; }
      const a = (q.t - q.t0) / SW;
      if (q.tcs) {
        const n = q.tcs.counts.swing ?? 0;
        if (a >= 0 && a < 1 && n) applyFrame(q.tor, frameOf(q.tcs, 'swing', q.tdir, Math.min(n - 1, Math.floor(a * n))), 1.12 * BODY_K);
        else applyFrame(q.tor, frameOf(q.tcs, 'idle', q.tdir, 0), 1.12 * BODY_K);
      }
      if (!q.struck && a >= 0.62) {
        q.struck = true;
        q.hitT = q.t;
        if (q.style === 'burn') { q.flare = 1; if (near) sfx.flame(spot()); }
        else if (q.style === 'dunk' || q.style === 'furnace') { if (near) { if (q.style === 'furnace') sfx.flame(spot()); else sfx.impact('blunt', spot(), false, 'pret', 0.6); } }
        else if (q.style === 'strings') { if (near) sfx.impact('blade', spot(), false, 'ash', 1.35); } // 실을 홱 잡아챈다
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
          if (writhe && nh) applyFrame(q.vic, frameOf(q.vcs, 'hit', q.vdir, Math.floor(q.t * 8) % nh), BODY_K);
          else applyFrame(q.vic, frameOf(q.vcs, 'idle', q.vdir, 0), BODY_K);
        } else if (q.style === 'strings') {
          // 잡아챌 때마다 실에 끌려 홱 솟았다가 축 늘어진다
          const u = q.t - q.hitT;
          const lift = u >= 0 && u < 0.55 ? 16 * Math.sin((u / 0.55) * Math.PI) : 0;
          q.vic.y = sy - 10 - lift - 3 * Math.sin(q.t * 1.7);
          if (u >= 0 && u < 0.55 && nh) applyFrame(q.vic, frameOf(q.vcs, 'hit', q.vdir, Math.min(nh - 1, Math.floor((u / 0.55) * nh))), BODY_K);
          else applyFrame(q.vic, frameOf(q.vcs, 'idle', q.vdir, 0), BODY_K);
        } else if (q.lying) {
          const nf = q.vcs.counts.fall ?? 1;
          applyFrame(q.vic, frameOf(q.vcs, 'fall', q.vdir, nf - 1), BODY_K);
          q.vic.y = sy - (since < 0.12 ? 2 : 0);
        } else {
          const burning = q.style === 'burn' && q.flare > 0.25;
          if ((since < 0.35 || burning) && nh) applyFrame(q.vic, frameOf(q.vcs, 'hit', q.vdir, burning ? Math.floor(q.t * 7) % nh : Math.min(nh - 1, Math.floor((since / 0.35) * nh))), BODY_K);
          else applyFrame(q.vic, frameOf(q.vcs, 'idle', q.vdir, 0), BODY_K);
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
      const ropeTop = sy - 94, head = q.vic.y - 46 * BODY_K;
      g.moveTo(sx, ropeTop).lineTo(sx, head).stroke({ color: 0x8a7a5a, width: 1.5 });
      g.ellipse(sx, sy + 1, 25 * (0.9 + 0.1 * Math.sin(T * 2)), 9).stroke({ color: 0x4a4228, width: 1, alpha: 0.6 });
    } else if (q.style === 'furnace') {
      const glow = 0.25 + q.sink * 0.9;
      g.ellipse(sx, sy - 6, 34, 18).fill({ color: 0xff6a1a, alpha: 0.08 + glow * 0.12 });
      if (Math.random() < dt * (5 + q.sink * 40)) q.parts.push({ x: sx + (Math.random() - 0.5) * 30, y: sy, vx: (Math.random() - 0.5) * 50, vy: -40 - Math.random() * 60, t: 0.9, c: Math.random() < 0.6 ? 0xffd060 : 0xff6a1a, r: 1.2 });
      if (q.sink > 0.3 && Math.random() < dt * 6) q.parts.push({ x: sx + (Math.random() - 0.5) * 12, y: sy - 20, vx: (Math.random() - 0.5) * 8, vy: -22, t: 1.6, c: 0x4a4444, r: 3, smoke: true });
      const top = sy - 94, head = q.vic.y - 46 * BODY_K;
      for (let y = top; y < head; y += 4) g.ellipse(sx + (Math.floor((y - top) / 4) % 2 ? 1 : -1), y, 1.6, 2.2).stroke({ color: 0x6a6660, width: 1 });
    } else if (q.style === 'strings') {
      // 십자 막대에서 내려온 실 다섯 가닥: 머리 · 두 손목 · 두 발목 (바람에 흔들리고, 잡아챌 때 팽팽해진다)
      const top = sy - 108, vy = q.vic.y, k = BODY_K;
      const taut = q.t - q.hitT < 0.4 ? 0 : 1;
      const pts: [number, number, number][] = [[0, -46 * k, -2], [-9 * k, -28 * k, -16], [9 * k, -28 * k, 16], [-4 * k, -2, -10], [4 * k, -2, 10]];
      for (const [dx, dy, ax] of pts) {
        const ex = sx + dx, ey = vy + dy, mx = (sx + ax + ex) / 2 + Math.sin(T * 1.3 + ax) * 2 * taut;
        g.moveTo(sx + ax, top).quadraticCurveTo(mx, (top + ey) / 2, ex, ey).stroke({ color: 0xece8e0, width: 1, alpha: 0.85 });
      }
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

  /**
   * 35차: 떨어진 돈·물건이 주울 수 없는 곳(숲·늪·벽 너머)에 놓이던 것 — 떨어질 칸이 막혔거나 내 발로 닿지 않으면
   * 가까운 바닥 중 내가 걸어갈 수 있는 곳으로 옮긴다 (없으면 내 발밑)
   */
  private reachableSpot(x: number, y: number, ox: number, oy: number): [number, number] {
    const p = this.player, z = this.zone;
    const pi = Math.floor(p.x), pj = Math.floor(p.y);
    const ti = Math.floor(x + ox), tj = Math.floor(y + oy);
    // 내 발에서 퍼져 나가는 바닥 (떨어진 곳 둘레까지만, 많아야 4000칸)
    const seen = new Set<number>();
    const far = Math.max(Math.abs(ti - pi), Math.abs(tj - pj)) + 8;
    if (walkable(z, pi, pj)) {
      const q = [pj * z.W + pi]; seen.add(q[0]);
      for (let h = 0; h < q.length && seen.size < 4000; h++) {
        const i = q[h] % z.W, j = (q[h] - i) / z.W;
        for (const [a, c] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const ni = i + a, nj = j + c, k = nj * z.W + ni;
          if (seen.has(k) || !walkable(z, ni, nj) || Math.max(Math.abs(ni - pi), Math.abs(nj - pj)) > far) continue;
          seen.add(k); q.push(k);
        }
      }
    }
    const capped = seen.size >= 4000 || !seen.size;
    const ok = (i: number, j: number) => walkable(z, i, j) && (capped || seen.has(j * z.W + i));
    if (ok(ti, tj)) return [x, y];
    for (let r = 1; r <= 6; r++) {
      const ring: [number, number, number][] = [];
      for (let a = -r; a <= r; a++) for (let c = -r; c <= r; c++) if (Math.max(Math.abs(a), Math.abs(c)) === r) ring.push([ti + a, tj + c, a * a + c * c + Math.hypot(ti + a - pi, tj + c - pj) * 0.15]);
      ring.sort((u, v) => u[2] - v[2]);
      for (const [i, j] of ring) if (ok(i, j)) return [i + 0.5 - ox, j + 0.5 - oy];
    }
    return [p.x - ox + 0.1, p.y - oy + 0.1];
  }

  private dropCoin(x: number, y: number, amount: number, fromVictim: boolean, notes = false) {
    [x, y] = this.reachableSpot(x, y, 0.3, 0.15);
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
    tx.position.set(sx + (Math.random() * 10 - 5), sy - 44 * bk(w));
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
    const anim = from.act?.anim;
    // 39차 타격감: 휘두르기는 상대 몸을 가로지르는 초승달 궤적(위에서 아래로), 찌르기는 곧게 꿰뚫는 줄, 주먹은 예전처럼 작은 엇갈린 줄
    if (anim === 'swing' || anim === 'heavy' || anim === 'stab') {
      const [fx, fy] = iso(from.x, from.y);
      const dir = Math.atan2(ay - fy, ax - fx); // 화면에서 상대 쪽
      const big = (anim === 'heavy' ? 1.3 : 1) * (from.noeulAlly ? 1.5 : 1); // 46차: 대천사 노을의 칼질은 크고 금빛 — 두 번 엇갈려 베인다
      const glowC = from.noeulAlly ? 0xffd86a : 0xfff6d8, coreC = from.noeulAlly ? 0xfffbe8 : 0xffffff;
      if (anim === 'stab') {
        const ux = Math.cos(dir), uy = Math.sin(dir) * 0.6;
        g.moveTo(-ux * 16, -uy * 16).lineTo(ux * 12, uy * 12).stroke({ color: 0xfff6d8, width: 2.4, alpha: 0.95 });
        g.moveTo(-ux * 10, -uy * 10 - 2).lineTo(ux * 8, uy * 8 - 2).stroke({ color: 0xffffff, width: 1, alpha: 0.7 });
        g.circle(ux * 12, uy * 12, 3).fill({ color: 0xffffff, alpha: 0.85 });
      } else {
        // 공격하는 쪽에서 보아 오른쪽 위 → 왼쪽 아래로 크게 베인 호 (두께가 가운데서 굵다)
        const side = Math.cos(dir) >= 0 ? 1 : -1;
        const R = 17 * big;
        const a0 = -Math.PI / 2 - 0.9 * side, a1 = Math.PI / 2 + 0.35 * side;
        const N = 10;
        for (let k = 0; k < N; k++) {
          const t0 = k / N, t1 = (k + 1) / N;
          const w = (0.6 + Math.sin(t0 * Math.PI) * 2.6) * big;
          const p0 = [Math.cos(a0 + (a1 - a0) * t0) * R * side, Math.sin(a0 + (a1 - a0) * t0) * R * 0.75], p1 = [Math.cos(a0 + (a1 - a0) * t1) * R * side, Math.sin(a0 + (a1 - a0) * t1) * R * 0.75];
          g.moveTo(p0[0], p0[1]).lineTo(p1[0], p1[1]).stroke({ color: glowC, width: w + 1.6, alpha: from.noeulAlly ? 0.6 : 0.35 });
          g.moveTo(p0[0], p0[1]).lineTo(p1[0], p1[1]).stroke({ color: coreC, width: w, alpha: 0.95 });
          if (from.noeulAlly) { g.moveTo(-p0[0], p0[1]).lineTo(-p1[0], p1[1]).stroke({ color: glowC, width: w * 0.8 + 1.2, alpha: 0.5 }); g.moveTo(-p0[0], p0[1]).lineTo(-p1[0], p1[1]).stroke({ color: coreC, width: w * 0.7, alpha: 0.9 }); }
        }
      }
      g.position.set(ax, ay - 26 * BODY_K); g.scale.set(BODY_K);
      g.zIndex = 1e6 - 4;
      this.objects.addChild(g);
      this.floaters.push({ obj: g, t: 0.18, vy: 0 });
      if (from.isPlayer) { this.shakeT = Math.max(this.shakeT, 0.09); this.shakeA = Math.max(this.shakeA, anim === 'heavy' ? 3 : 1.8); } // 내 칼이 들어갈 때 화면이 살짝 울린다
      return;
    }
    g.moveTo(-7, -3).lineTo(7, 3).stroke({ color: 0xfff6d8, width: 2, alpha: 0.9 });
    g.moveTo(-5, 2).lineTo(4, -2).stroke({ color: 0xffffff, width: 1, alpha: 0.6 });
    g.position.set(ax, ay - 28 * BODY_K); g.scale.set(BODY_K);
    g.zIndex = 1e6 - 4;
    this.objects.addChild(g);
    this.floaters.push({ obj: g, t: 0.14, vy: 0 });
  }

  /** 다른 사람: 받은 위치로 부드럽게 따라간다 */
  private moveRemote(w: Walker, dt: number) {
    const rp = w.rpos;
    if (!rp) return;
    let moving = false;
    if (rp.t && rp.m && w.rpath) {
      // 42차: 받은 목적지까지 내가 찾은 길을 그 사람의 빠르기로 걷는다 (위치는 가끔 오는 확인으로만 맞춘다)
      const v = rp.v ?? 2.3;
      let left = v * dt;
      while (left > 0 && w.rpath.length) {
        const [ti, tj] = w.rpath[0], tx = ti + 0.5, ty = tj + 0.5;
        const dx = tx - w.x, dy = ty - w.y, d = Math.hypot(dx, dy);
        if (d < 0.02) { w.rpath.shift(); continue; }
        const st = Math.min(d, left);
        w.x += (dx / d) * st; w.y += (dy / d) * st; left -= st;
        w.dir = dirFromTile(dx, dy, w.dir);
        moving = true;
      }
      if (moving) w.anim += dt * v * 8.5;
      else { w.dir = rp.d; w.anim = 0; }
    } else {
      const dx = rp.x - w.x, dy = rp.y - w.y, d = Math.hypot(dx, dy);
      moving = d > 0.04;
      if (moving) {
        const step = Math.min(d, (2.3 + d) * dt);
        w.x += (dx / d) * step; w.y += (dy / d) * step;
        w.dir = dirFromTile(dx, dy, w.dir);
        w.anim += dt * 2.3 * 8.5;
      } else { w.dir = rp.d; w.anim = 0; }
    }
    this.pose(w, moving, dt);
    const [sx, sy] = iso(w.x, w.y);
    w.sprite.position.set(sx, sy);
    w.sprite.zIndex = w.x + w.y;
    // 42차 먼 사람 잔상: 40칸 넘게 떨어진 사람은 흐릿하게 (소식도 드물게 온다)
    const far = Math.hypot(w.x - this.player.x, w.y - this.player.y) > 40;
    w.sprite.alpha = far ? 0.35 : 1;
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
    else if (!w.act && w.riseT && w.riseT > 0) { anim = 'fall'; i = Math.max(0, Math.min((cs.counts.fall ?? 1) - 1, Math.floor((w.riseT / 0.4) * (cs.counts.fall ?? 1)))); w.riseT -= dt; }
    else if (!w.act && w.still) { const sa: Anim = w.still === 'lotus' && cs.counts.lotus ? 'lotus' : 'sit'; if (w.still === 'lie' || !cs.counts[sa]) { anim = w.still === 'lie' ? 'fall' : 'idle'; i = w.still === 'lie' ? (cs.counts.fall ?? 1) - 1 : 0; } else { anim = sa; i = 0; } }
    if (anim === 'walk') i %= cs.counts.walk ?? 8;
    if (w.art && anim === 'idle' && (w.dir === 'sw' || w.dir === 'se') && this.poseArt(w, cs, w.art)) return;
    if (anim === 'punch' && w.act?.alt) {
      const f = mirrorFrameOf(cs, 'punch', w.dir, i);
      if (f) { applyFrame(w.sprite, f, bk(w)); w.sprite.scale.x = -Math.abs(w.sprite.scale.x); return; }
    }
    applyFrame(w.sprite, frameOf(cs, anim, w.dir, i), bk(w));
  }
  /** 관리자 도트로 서 있기: 같은 크기면 1배, 2배 크기면 반으로 (더 섬세한 그림), 크기가 다르면 게임 속 키에 맞춘다 */
  private poseArt(w: Walker, cs: CharSet, tx: Texture): boolean {
    const f = frameOf(cs, 'idle', 'sw', 0);
    if (!f) return false;
    const s = w.sprite, size = bk(w), flip = w.dir === 'se' ? -1 : 1;
    const lw = Math.round(f.w * f.k), lh = Math.round(f.h * f.k);
    const k = artDensity(tx, lw, lh); // 32차: 1·2·3배
    if (cs.px === 3 && k !== 3) return false; // 도트 3배 시험 중에는 3배로 그린 관리자 도트만 (아니면 3배로 구운 그림)
    if (s.texture !== tx) s.texture = tx;
    if (k) { s.anchor.set(f.ax, f.ay); s.scale.set((flip * size) / k, size / k); }
    else { s.anchor.set(0.5, 1); const z = (lh / tx.height) * size; s.scale.set(flip * z, z); }
    return true;
  }

  /** 사람 한 명의 싸움 행동 (쫓아가서 때리기) */
  private fight(w: Walker, dt: number) {
    const tg = w.target;
    if (!tg) return;
    if (tg.down > 0 || (tg.isPlayer && this.dead)) { w.target = null; return; }
    if (w.isPlayer && this.gear.dry) { w.target = null; w.path = []; this.kite = false; return; } // 31차: 쏠 것이 없는 활·총으로는 싸우지 않는다
    const dist = Math.hypot(tg.x - w.x, tg.y - w.y);
    const flame = this.flames(w);
    const ranged = w.isPlayer ? this.gear.ranged : w.weapon === 'pistol' || flame;
    const reach = flame ? FLAME : ranged ? (w.isPlayer ? this.gear.range ?? RANGED : RANGED) : w.isPlayer ? this.gear.reach ?? MELEE : MELEE;
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
      // 38차: 같은 칸(길이 비어 나온다)이나 막힌 칸에 선 상대에게는 곧장 다가간다 — 둘 다 사거리 밖에서 멈춰 서던 것
      if (!w.path.length) this.closeIn(w, tg, dt, reach);
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
      w.atkT = ATK_INTERVAL * (two ? 1.6 : 1) * (ranged ? this.gear.rate ?? 1 : 1) * (this.gear.haste ?? 1); // 저격총은 천천히 · 42차 강화 공속
      this.quickUsed = false; // 반 박자 당기기는 공격 한 번에 한 번
      if (ranged && !this.hooks.useAmmo()) { this.gear.ranged = false; this.gear.dry = true; w.target = null; w.path = []; this.kite = false; return; } // 31차: 다 쏘면 멈춘다 (예전엔 붙어서 활로 때렸다)
      // 근접은 힘, 원거리(권총·활)는 민첩이 공격력에 더해진다
      let dmg = Math.round((rand(4, 8) + this.gear.atk * 3 + (ranged ? Math.round(this.stats.agi * 1.5) : this.stats.str)) * (two ? 1.35 : 1));
      const crit = Math.random() * 100 < critChance(this.stats.fai);
      if (crit) dmg *= CRIT_MULTIPLIER;
      this.startAttack(w, tg, dmg, crit);
    } else {
      w.atkT = w.noeulAlly ? 0.48 : w.kind === 'goat' ? 1.05 : w.kind === 'dog' ? 0.75 : w.gdef ? w.gdef.atk : w.mdef ? w.mdef.atk : w.kind === 'suturer' ? (w.monster ? 0.68 : 0.8) : w.weak ? 1.25 : w.weapon === 'pistol' ? 1.4 : w.gang ? 0.8 : 0.9;
      const f = this.zone.hell?.floor ?? 1;
      const base = w.fb && FB[w.fb] ? rand(FB[w.fb].dmg[0], FB[w.fb].dmg[1]) * FB_HIT : w.kind === 'goat' ? rand(10, 19) : w.kind === 'dog' ? rand(4, 9) * (this.night === 1 ? 1.25 : 1) : w.kind === 'angel' ? rand(30, 52) : w.gdef ? (tg.isPlayer ? Math.max(rand(w.gdef.dmg[0], w.gdef.dmg[1]) * 0.6, tg.maxHp * 0.12) : rand(w.gdef.dmg[0], w.gdef.dmg[1])) * (tg.sealT && tg.sealT > 0 ? 1.5 : 1) : w.mdef ? rand(w.mdef.dmg[0], w.mdef.dmg[1]) * (w.mdef.boss ? BOSS_HIT * (1 + 0.15 * (f - 1)) : 1 + 0.25 * (f - 1)) * (w.sealT && w.sealT > 0 ? 0.5 : 1) * (w.elite ? 1.5 : 1) * floorCurve(f).dmg : w.kind === 'suturer' ? rand(10, 18) * (w.monster ? 1.6 : 1) : w.marion ? rand(w.marion.dmg[0], w.marion.dmg[1]) : w.kind === 'fighter' ? rand(20, 34) * (1 + 0.3 * (f - 1)) : w.weak ? rand(1, 4) : w.stiffBoss ? (w.stiffBoss === 2 ? rand(26, 42) : rand(6, 12)) + (w.weapon ? 3 : 0) : w.kind === 'passer' ? (w.gunman ? rand(14, 22) : rand(3, 7) + (w.weapon ? 3 : 0)) * (1 + 0.9 * (w.ptier ?? 0)) * (w.civ ? CIV[w.civ].dmg : 1) : w.gang === 'mafia' ? rand(10, 17) + (w.weapon ? 4 : 0) : w.gang === 'robber' ? rand(6, 12) + (w.weapon ? 3 : 0) : w.gang === 'enforcer' ? rand(13, 21) + (w.weapon ? 4 : 0) : w.gang === 'boxer' ? rand(11, 19) : w.gang === 'pickpocket' ? rand(3, 6) + (w.weapon ? 3 : 0) : w.gang === 'collector' ? rand(8, 14) + (w.weapon ? 3 : 0) : rand(3, 7) + (w.weapon ? 2 : 0);
      const dmg = Math.max(1, Math.round(base) - (tg.isPlayer ? this.gear.dr ?? 0 : 0));
      this.startAttack(w, tg, dmg);
    }
  }

  /** 38차: 길 찾기로 닿지 않는 거리(같은 칸의 반대쪽 귀퉁이 등)에서는 상대 쪽으로 곧장 몇 걸음 */
  private closeIn(w: Walker, tg: Walker, dt: number, reach: number) {
    const sp = w.speed;
    if (!sp || w.down > 0 || (w.act && w.act.anim === 'fall')) return;
    const dx = tg.x - w.x, dy = tg.y - w.y, d = Math.hypot(dx, dy);
    const step = Math.min(d - reach * 0.8, sp * dt);
    if (step <= 0) return;
    const nx = w.x + (dx / d) * step, ny = w.y + (dy / d) * step;
    if (!walkable(this.zone, Math.floor(nx), Math.floor(ny))) return;
    w.x = nx; w.y = ny;
    w.dir = dirFromTile(dx, dy, w.dir, !!w.cs?.eight);
  }

  /** 공격 동작을 시작하고, 무기가 닿는 장면에서 피해를 준다 */
  private startAttack(w: Walker, tg: Walker, dmg: number, crit = false) {
    const anim: Anim = w.cs?.attack ?? 'punch';
    // 29차: 맨손 주먹은 오른손 · 왼손 번갈아 (방패를 든 손은 빼고)
    const alt = anim === 'punch' && !(w.isPlayer && this.gear.armor.includes('shield')) ? (w.punchAlt = !w.punchAlt) : false;
    w.act = { anim, t: 0, alt };
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
    if (Math.hypot(tg.x - w.x, tg.y - w.y) > (flame ? FLAME : ranged ? (w.isPlayer ? this.gear.range ?? RANGED : RANGED) : w.isPlayer ? this.gear.reach ?? MELEE : MELEE) + (w.isPlayer && this.kite ? 2 : 0.6)) return;
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
    if (w.isPlayer && this.kite && w.act) speed *= 0.35; // 30차: 쏘는 동작 동안은 크게 느려진다 — 걸으며 쏘아도 무적이 아니게 (예전 0.8)
    if (w.flee > 0) speed = 1.9;
    if (w.isPlayer && isDanger(w.hp, w.maxHp)) speed *= DANGER_SPEED;
    if (w.isPlayer) speed *= this.load.speed; // 47차 무게
    if (w.kind === 'thug' && w.pick && w.pick.flee > 0 && !w.target) speed = 2.0; // 35차 → 42차: 너무 빨라 잡을 수 없었다 — 나(2.3)보다 조금 느리게
    else if (w.kind === 'thug' && w.target) speed = w.weak ? 1.05 : w.gang === 'robber' ? 1.95 : w.gang === 'mafia' ? 1.75 : w.gang === 'boxer' ? 1.9 : w.gang === 'enforcer' ? 1.7 : w.gang === 'pickpocket' ? 2.1 : w.gang === 'collector' ? 1.85 : 1.6;
    else if (w.kind === 'thug' && w.stalk) speed = w.weak ? 0.85 : 1.3;
    if (w.mdef && w.target) speed = w.mdef.speed * 1.35;
    if (w.gdef && w.target) speed = w.gdef.speed * 2.4;
    if (w.kind === 'goat') speed = w.flee > 0 ? 5.2 : w.target ? 2.1 : 0.85;
    if (w.kind === 'dog') speed = w.flee > 0 ? 3.4 : w.target ? 2.05 : 0.9; // 나(2.3)보다 조금 느리다 — 달아나면 산다 // 죽기 직전의 염소는 믿기지 않게 빠르다
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
    if (this.splits.length) this.updateSplits(realDt); // 45차 두 동강
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
    if (this.dogT > 0 && (this.dogT -= dt) <= 0) { this.dogT = -1; if (!this.walkers.some((x) => x.kind === 'dog' && x.down <= 0)) this.spawnDogs(); }
    if (this.realm === 'real' && !this.zone.interior && this.netRole !== 'guest' && (this.brawlT -= dt) <= 0) { this.brawlT = 70 + Math.random() * 80; this.startBrawl(); } // 42차: 거리 싸움은 드물게
    if (this.kerb) this.updateKerberos(dt);
    if (this.guide) this.updateGuide(dt);
    if (this.netRole !== 'guest' && (this.fbWarns.length || this.walkers.some((w) => w.fb || (w.mdef?.boss && BOSS_SK[w.mdef.key])))) this.updateFieldBosses(dt);
    if (this.netRole === 'host') this.hostTick(dt);
    else if (this.netRole === 'guest') this.guestTick();
    this.updateLandmarks(dt);
    if (this.hazeOn && this.terraceSky) { this.terraceSky.width = this.app.screen.width; this.terraceSky.height = this.app.screen.height; }
    if (this.stairWant && this.heavenStair) {
      const st = this.heavenStair;
      if (Math.hypot(st.i + 0.5 - this.player.x, st.j + 0.5 - this.player.y) < 1.6) { this.stairWant = false; this.hooks.heavenAct('terrace'); }
      else if (!this.player.path.length) this.stairWant = false;
    }
    if (this.jabT > 0) this.jabT -= dt;
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
      if (w.mirror) this.moveMirror(w, dt);
      else if (w.down > 0) {
        if (w.isPlayer && !this.dead) { w.down -= dt; if (w.down <= 0) { w.down = 0; w.riseT = 0.4; } } // 42차: 깨어나 일어선다
        if (!w.isPlayer) {
          w.down -= dt;
          if (w.down <= 0) {
            if (w.fb) { this.removeWalker(w); continue; } // 31차: 쓰러진 필드 보스는 사라진다 (다시 나올 때는 정해진 시간 뒤)
            if (w.kind === 'suturer') { this.removeWalker(w); continue; }
            if (w.kind === 'goat') { this.removeWalker(w); this.goatT = 90 + Math.random() * 90; continue; }
            if (w.kind === 'dog') { this.removeWalker(w); if (!this.walkers.some((x) => x.kind === 'dog' && x.down <= 0)) this.dogT = 120 + Math.random() * 120; continue; }
            if (w.reviveUp) { w.reviveUp = false; w.hp = Math.round(w.maxHp * 0.55); w.act = null; w.riseT = 0.4; w.sprite.rotation = 0; w.target = this.dead ? null : this.player; w.repathT = 0; continue; } // 실에 끌려 일어선다
            if (w.mdef) { if (w.mdef.boss || w.raider || w.invader || w.kid || !this.zone.hell) this.removeWalker(w); else this.spawnMonster(w); continue; }
            if (w.gdef) { const g = this.makeGuard(w.gdef, w.post ?? 0); this.removeWalker(w); this.walkers.push(g); continue; }
            if (w.kind === 'fighter') { this.reviveFighter(w); continue; }
            if (w.noeulAlly) { w.hp = Math.round(w.maxHp * 0.4); w.act = null; w.riseT = 0.5; w.sprite.rotation = 0; const ul = t().crusadeNoeulUp; this.bubble(w, ul[Math.floor(Math.random() * ul.length)]); continue; } // 45차
            if (w.kind === 'marionette') { this.removeWalker(w); continue; } // 43차: 줄이 끊긴 인형은 다시 일어나지 않는다
            if (w.kind === 'soul' || w.kind === 'vendor') { w.hp = w.maxHp; continue; }
            if (this.realm === 'heaven' && (w.kind === 'passer' || w.kind === 'angel')) { w.hp = w.maxHp; w.flee = 2; continue; } // 21차: 천국에서는 아무도 죽지 않는다 — 털고 일어난다
            this.spawnNpc(w.kind as NpcKind, w);
          }
        }
      } else if (!(w.isPlayer && this.dead)) this.fight(w, dt);
      if (w.sprite.destroyed) continue;
      const moving = w.mirror ? w.mirror.mv : w.down <= 0 && !(w.isPlayer && this.dead) && this.stepWalker(w, dt);
      // 42차: 주요 인물의 고유 동작 (서 있을 때 가끔 한 번 — 장부에 적기 · 등불 들기 · 안경 고쳐 쓰기 · 랩 한 소절)
      if (!w.isPlayer && !moving && !w.act && w.down <= 0 && w.cs?.counts.gest) { w.gestT = (w.gestT ?? 3 + Math.random() * 5) - dt; if (w.gestT <= 0) { w.act = { anim: 'gest', t: 0 }; w.gestT = 7 + Math.random() * 9; } }
      if (!w.isPlayer && w.down <= 0 && !w.mirror) this.think(w, moving, dt, nf);
      if (w.sprite.destroyed) continue;
      w.anim = moving ? w.anim + dt * (w.flee > 0 ? 1.9 : w.speed) * 8.5 * (w.isPlayer ? Math.max(0.35, this.load.speed) : 1) : 0; // 48차: 무거우면 발걸음도 느리다 (미끄러지지 않게)
      this.pose(w, moving, dt);
      if (w.isPlayer && this.load.crawl && !w.act && w.down <= 0 && !this.dead && !w.fly) { // 48차: 누운 그림 대신 짐에 짓눌려 허리를 숙이고 끌듯이 걷는다
        const lean = /e/.test(w.dir) ? 0.2 : /w/.test(w.dir) ? -0.2 : 0;
        w.sprite.rotation = lean + (moving ? Math.sin(w.anim * 1.6) * 0.04 : 0);
        w.sprite.scale.y *= 0.86;
      }
      const [sx, sy] = iso(w.x, w.y);
      // 취객은 걸을 때 비틀거린다
      const sway = w.weak === 'drunk' && moving ? Math.sin(this.time * 3.1 + w.home[0]) * 2.2 : 0;
      let lx = 0, ly = 0;
      if (w.lungeT && w.lungeT > 0 && w.target) { // 24차: 때리는 순간 반 걸음 앞으로
        const [tx2, ty2] = iso(w.target.x, w.target.y), q = Math.sin((w.lungeT / 0.1) * Math.PI) * 4, L = Math.hypot(tx2 - sx, ty2 - sy) || 1;
        lx = ((tx2 - sx) / L) * q; ly = ((ty2 - sy) / L) * q; w.lungeT -= dt;
      }
      // 43차: 마지막 일격에 날아가는 몸 — 포물선으로 떴다가 떨어지며 살짝 돈다. 땅에 닿으면 쿵 · 먼지
      let fy = 0;
      if (w.fly) {
        w.fly.t += dt;
        const q = Math.min(1, w.fly.t / w.fly.dur);
        fy = Math.sin(q * Math.PI) * w.fly.h;
        w.sprite.rotation = w.fly.spin * Math.sin(q * Math.PI * 0.5) * (q < 1 ? 1 : 0.6);
        if (q >= 1) {
          sfx.thud(this.spotOf(w));
          for (let k = 0; k < 10; k++) { const a = Math.PI + Math.random() * Math.PI, v = 30 + Math.random() * 50; this.sparks.push({ x: sx, y: sy, vx: Math.cos(a) * v, vy: Math.sin(a) * v * 0.3, t: 0.25 + Math.random() * 0.15, col: this.realm === 'heaven' ? 0xf4eedc : 0x8a7e6e }); }
          if (w.fly.mine) { this.shakeT = Math.max(this.shakeT, 0.12); this.shakeA = Math.max(this.shakeA, 3); } // 45차 후속: 내가 쓰러뜨린 몸이 떨어질 때만
          w.fly = undefined;
        }
      } else if (w.sprite.rotation && w.down <= 0 && !(w.isPlayer && this.load.crawl && !w.act && !this.dead)) w.sprite.rotation = 0;
      w.sprite.position.set(sx + sway + lx, sy + ly - fy - (w.kind === 'goatking' ? GK_LIFT : 0)); // 32차: 염소대왕은 흑요석 단 위
      // 45차: 기술 있는 층주(1층 아쉬갈)는 불길을 두른다 — 성을 내면 더 크고 붉게, 둘레로 불티가 오른다
      if (w.mdef?.boss && BOSS_SK[w.mdef.key] && this.zone.hell) {
        if (!w.bossGlow) { const g = new Sprite(this.glowTex()); g.anchor.set(0.5); g.blendMode = 'add'; g.eventMode = 'none'; this.objects.addChild(g); w.bossGlow = g; }
        const g = w.bossGlow, rg = w.raged ? 1 : 0, pul = 0.5 + 0.5 * Math.sin(this.time * (3 + rg * 3));
        g.visible = w.down <= 0 && w.sprite.visible;
        g.tint = rg ? 0xff3a10 : 0xff7a20;
        g.position.set(sx, sy - 34 * (w.size ?? 1));
        g.scale.set((2.4 + rg * 0.9 + pul * 0.35) * (w.size ?? 1) * 0.5);
        g.alpha = 0.32 + rg * 0.18 + pul * 0.12;
        g.zIndex = w.x + w.y - 0.05;
        if (w.down <= 0 && Math.random() < dt * (6 + rg * 10)) { const a = Math.random() * Math.PI * 2; this.sparks.push({ x: sx + Math.cos(a) * 22 * (w.size ?? 1), y: sy - 6 - Math.random() * 40, vx: (Math.random() - 0.5) * 20, vy: -40 - Math.random() * 40, t: 0.9 + Math.random() * 0.6, col: rg ? 0xff4a1a : 0xffa040 }); }
      }
      if (w.squashT && w.squashT > 0) { const q = w.squashT / 0.13; w.sprite.scale.x *= 1 + 0.16 * q; w.sprite.scale.y *= 1 - 0.13 * q; w.squashT -= dt; }
      w.sprite.zIndex = w.down > 0 ? w.x + w.y - 0.3 : w.x + w.y + (w.kind === 'goatking' ? 7.4 : 0) + (w.zb ?? 0); // 32차: 옥좌는 단의 앞 모서리보다 앞에 (단 위에 앉아 있다)
      // 42차: 할아버지 전용 몸은 머리가 몸 가운데에 있어 안경을 ±0.4만 민다 (사람 몸 때의 ±1.5는 안경이 얼굴 밖으로 나갔다)
      if (w.glasses) { const fr = w.dir === 'ne' || w.dir === 'nw' || w.dir === 'n'; w.glasses.visible = !fr && w.down <= 0 && w.sprite.visible; w.glasses.position.set(sx + (w.dir === 'sw' || w.dir === 'w' ? -0.4 : w.dir === 'se' || w.dir === 'e' ? 0.4 : 0), sy - (w.sprite.height * w.sprite.anchor.y - 5.5)); w.glasses.zIndex = w.x + w.y + 0.004; }
      if (w.pack?.vend) {
        // 31차: 장사꾼 차림 — 왼쪽 아래(sw)·오른쪽 아래(se)만 본다 (그림은 sw 기준, se는 좌우 뒤집기)
        if (w.dir !== 'sw' && w.dir !== 'se') w.dir = this.player.x - w.x - (this.player.y - w.y) >= 0 ? 'se' : 'sw';
        const flip = w.dir === 'se', on = w.down <= 0 && w.sprite.visible;
        for (const [sp, layer, dz] of [[w.pack.under, 'under', -0.003], [w.pack.over, 'over', 0.003]] as const) {
          const tx = vendorGear(w.pack.vend, layer);
          sp.visible = on && !!tx;
          if (!tx) continue;
          if (sp.texture !== tx) sp.texture = tx;
          sp.anchor.set(VGEAR_FOOT[0], VGEAR_FOOT[1]);
          sp.scale.set(0.5 * bk(w) * (flip ? -1 : 1), 0.5 * bk(w));
          sp.position.set(sx, sy);
          sp.zIndex = w.x + w.y + dz;
        }
      } else if (w.pack) {
        // 31차: 마스크 소녀의 짐 — 바라보는 쪽마다 앞·뒤·옆 그림, 몸 뒤와 앞에 나눠 겹친다 (관리자 도트가 서 있을 땐 숨김: 그 그림에 이미 그려 넣었을 수 있다)
        const pk = packFor(w.dir), on = w.down <= 0 && w.sprite.visible && !(w.art && w.sprite.texture === w.art);
        const bob = moving && Math.floor(this.time * 8) % 2 ? -1 : 0;
        for (const [sp, tx, dz] of [[w.pack.under, pk.under, -0.003], [w.pack.over, pk.over, 0.003]] as const) {
          sp.visible = on;
          if (sp.texture !== tx) sp.texture = tx;
          sp.anchor.set(PACK_FOOT[0], PACK_FOOT[1]);
          sp.scale.set(0.5 * bk(w) * (pk.flip ? -1 : 1), 0.5 * bk(w));
          sp.position.set(sx, sy + bob);
          sp.zIndex = w.x + w.y + dz;
        }
      }
      if (w.horns) { w.horns.visible = w.down <= 0 && w.sprite.visible; w.horns.position.set(sx, sy - 47 * bk(w)); w.horns.zIndex = w.x + w.y + 0.003; }
      if (w.ferum) { // 34차: 어깨 뒤 두 팔 — 오른쪽은 망치를 내리치고, 왼쪽은 집게를 든 채 살짝 흔들린다
        const k = bk(w), strike = Math.max(0, Math.sin(this.time * 2.6));
        w.ferum.arms.forEach((a, n) => {
          const side = n ? -1 : 1;
          a.visible = w.down <= 0 && w.sprite.visible;
          a.position.set(sx + side * 8 * k, sy - 33 * k);
          a.scale.set(0.5 * k * side, 0.5 * k);
          a.rotation = side * (n ? -0.1 + Math.sin(this.time * 1.3) * 0.06 : -0.35 + strike * strike * 0.75);
          a.zIndex = w.x + w.y - 0.004;
        });
      }
      if (w.devTail) { // 33차: 허리 뒤로 나와 살랑인다 (돌아서면 앞쪽으로 보인다)
        const back = w.dir === 'ne' || w.dir === 'nw' || w.dir === 'n';
        const flip = w.dir === 'se' || w.dir === 'e' || w.dir === 'ne' ? -1 : 1;
        w.devTail.visible = w.down <= 0 && w.sprite.visible;
        w.devTail.position.set(sx + flip * 5 * BODY_K, sy - (w.tailY ?? 17) * bk(w));
        w.devTail.scale.set(0.5 * BODY_K * flip, 0.5 * BODY_K);
        w.devTail.rotation = Math.sin(this.time * 2.1 + w.home[0]) * 0.22 * flip;
        w.devTail.zIndex = w.x + w.y + (back ? 0.004 : -0.004);
      }
      if (w.wings) {
        const up = w.dir === 'ne' || w.dir === 'nw' || w.dir === 'n';
        w.wings.visible = w.down <= 0 && w.sprite.visible;
        const seat = w.still === 'lotus' || w.still === 'sit' ? 14 : 0; // 34차: 앉은 천사는 어깨가 낮다 (날개가 머리 위에 떠 있던 것)
        w.wings.position.set(sx, sy - (27 - seat) * bk(w) - (w.wingK ? (w.wingK - 1) * 6 * BODY_K : 0));
        w.wings.zIndex = w.x + w.y + (up ? 0.002 : -0.002);
        const wk = 0.5 * BODY_K * (w.wingK ?? 1) * (seat ? 0.86 : 1);
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
        w.bubble.position.set(sx, sy - (w.kind === 'goatking' ? GK_FACE : 46));
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
        this.working.earned += WAGE_PER_SEC * this.working.job.mult * this.wageMul * dt;
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
      if (sw.kind === 'ride') this.hooks.ride(sw.k, (this.zone.buildings[sw.k] as { att?: string }).att ?? '');
      else if (sw.kind === 'enter') this.hooks.enterBuilding(sw.k, { i: sw.spot[0], j: sw.spot[1] }, this.zone.buildings[sw.k]?.cat === 'home' ? null : this.takeChaser()); // 24차: 내 집 문은 도망가는 문 — 대식자는 따라 들어오지 못한다
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
          this.float(p, `+${moneyText(c.amount)}`, '#f2d27a'); // 32차: 서울이면 원화
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
      if (!this.noRegen) p.hp = Math.min(p.maxHp, p.hp + ((resting ? restRegenPerMinute(p.maxHp, this.stats.fai) : regenPerMinute(p.maxHp, this.stats.fai)) / 60) * dt * this.load.regen); // 47차: 무거우면 회복이 더디다
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
      const r = Math.max(0, w.hp / w.maxHp), hy = Math.round(sy - 49 * bk(w));
      this.bars.rect(sx - 11, hy, 22, 4).fill({ color: 0x140e0a, alpha: 0.85 });
      this.bars.rect(sx - 10, hy + 1, 20 * r, 2).fill(r > 0.25 ? (w.isPlayer ? 0x6fd06a : 0xd9534f) : 0xff3b30);
    }
    // 다른 사람 중 먼저 공격한(범죄 표시) 사람: 머리 위 붉은 표시
    for (const w of this.walkers) {
      if (w.kind !== 'remote' || w.down > 0 || !(w.rpos?.c || w.lingerT)) continue;
      const [sx, sy] = iso(w.x, w.y);
      const col = w.lingerT ? 0x9a9a9a : 0xe0463a;
      this.bars.poly([sx - 4, sy - 56 * BODY_K, sx + 4, sy - 56 * BODY_K, sx, sy - 56 * BODY_K + 5]).fill(col).stroke({ color: 0x140e0a, width: 1 });
    }
    // 플레이어 표시: 발밑 고리와 머리 위 화살 (먼저 공격했으면 붉게)
    const [px, py] = iso(p.x, p.y);
    const col = this.criminalT > 0 ? 0xe0463a : 0xe0b437;
    this.ring.clear().ellipse(0, 0, 12, 5).stroke({ color: col, width: 2, alpha: 0.95 }).ellipse(0, 0, 15, 6.5).stroke({ color: col, width: 1, alpha: 0.35 });
    this.ring.position.set(px, py);
    this.ring.zIndex = p.x + p.y - 0.01;
    const bob = Math.sin(this.time * 4) * 1.5;
    this.arrow.clear().poly([-4, 0, 4, 0, 0, 5]).fill(col).stroke({ color: 0x140e0a, width: 1 });
    this.arrow.position.set(px, py - (this.combatT < 6 || isDanger(p.hp, p.maxHp) ? 60 : 52) * bk(p) + bob);
    this.arrow.zIndex = 1e6 - 5;
    const inside = !!this.working?.on || (!!this.shipGo && this.shipGo.phase !== 'walk'); // 26차: 우주선에 오르면 표시도 함께 사라진다
    this.arrow.visible = !this.dead && !inside;
    this.ring.visible = !inside;
    // 34차 사거리 표시: 쏘는 무기를 들었을 때만. 평소엔 옅게, 겨눈 대상이 있으면 진하게 — 대상이 테 안이면 금빛, 밖이면 붉게
    {
      const g0 = this.gear, show = (!!g0.ranged || !!g0.reach) && !g0.dry && !inside && !this.dead && !this.zone.interior?.rest && this.realm !== 'heaven';
      this.reachRing.visible = show;
      if (show) {
        const reach = g0.flame ? FLAME : g0.ranged ? g0.range ?? RANGED : g0.reach ?? MELEE;
        const tg = p.target && p.target.down <= 0 ? p.target : null;
        const inR = tg ? Math.hypot(tg.x - p.x, tg.y - p.y) <= reach + 0.2 : true;
        const c2 = tg ? (inR ? 0xf2c84a : 0xe0463a) : 0xe8dcc0, a2 = tg ? 0.55 : 0.2;
        const rx = reach * 32 * Math.SQRT2, ry = reach * 16 * Math.SQRT2;
        const r = this.reachRing.clear();
        // 점선 테 (바닥에 그린 분필 선처럼) + 안쪽 아주 옅은 채움
        r.ellipse(0, 0, rx, ry).fill({ color: c2, alpha: a2 * 0.12 });
        const n = Math.max(24, Math.round(reach * 9));
        for (let k = 0; k < n; k++) {
          const a0 = (k / n) * Math.PI * 2 + this.time * 0.15, a1 = a0 + (Math.PI * 2) / n * 0.55;
          r.moveTo(Math.cos(a0) * rx, Math.sin(a0) * ry).lineTo(Math.cos(a1) * rx, Math.sin(a1) * ry);
        }
        r.stroke({ color: c2, width: 1.5, alpha: a2 * 1.6 });
        this.reachRing.position.set(px, py);
        this.reachRing.zIndex = 1e6 - 8; // 건물에 가리지 않게 화면 위에 (옅게)
      }
    }
    if (this.auraTex) {
      applyFrame(this.aura, this.auraTex.get(p.dir)?.[Math.floor(this.time * 9) % 4], bk(p));
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
    // 32차: 거인의 방은 위를 더 보이게 — 42차: 문 앞에서 깨어나도 판관석의 염소대왕이 보이게, 사람과 염소대왕 사이를 본다
    let lift = 0, cpx = px, cpy = py;
    if (this.zone.interior?.kind === 'goatroom') {
      const k = this.walkers.find((w) => w.kind === 'goatking');
      if (k) { const [kx, ky] = iso(k.x, k.y); const kTop = ky - GK_LIFT - Math.min(260, k.sprite.height * 0.55); cpx = px * 0.45 + kx * 0.55; cpy = py * 0.45 + kTop * 0.55; }
      else lift = Math.min(150, vh * 0.2);
    }
    // 39차 시야: 휴대폰은 가까이(1.6배) · 태블릿 1.3배 · PC 1배 (영혼 설정에서 바꾼다)
    const zw = this.wantZoom();
    if (zw !== this.zoom) { this.zoom = zw; this.camera.scale.set(zw); this.lights.scale.set(zw); this.cullT = 0; }
    const z = this.zoom;
    this.camera.position.set(Math.round(vw / 2 - cpx * z + shx), Math.round(vh / 2 - cpy * z + 20 + shy + lift));
    this.lights.position.copyFrom(this.camera.position);
    // 이름표: 사람만 (건물 이름은 화면 위쪽에 잠깐)
    if (this.labelT > 0) this.labelT -= dt;
    this.drawLabel(this.labelT > 0 ? this.labelFor : this.hoverFor);
    this.updatePress();
    this.updateKeys();
    this.holdSeat(); // 46차 예배 자리
    this.checkHutDoor(); // 46차 구름 위 오두막 문
    this.checkBed(); // 47차 침대
    this.checkImmig(); this.checkAirportStop(); // 47차 공항
    this.updateRide(dt); // 46차 놀이기구
    if (this.stiffMark) this.updateStiffMark(); // 47차 떼먹은 사장의 칼 표시
    if (this.myPromo || this.promos.size || this.walkers.some((w) => w.rinfo?.promo)) this.updatePromos(); // 47차 홍보 말풍선
    this.drawFx(dt);
    this.updateDoor(p);
    this.updatePings(dt, p); // 38차 상점 알림 화살표
    if (this.loots.length) this.updateLoot(dt); // 26차: 현실에서도 줍는다 (지옥에서만 돌던 탓에 야구 배트가 주워지지 않았다)
    if (this.zone.hell) this.edgeWalk(p, dt);
    // 위험 상태: 화면 가장자리가 붉게 뛴다
    const W = this.app.screen.width, H = this.app.screen.height;
    this.danger.clear();
    if (!this.dead && isDanger(p.hp, p.maxHp)) {
      const a = 0.2 + Math.sin(this.time * 5) * 0.08;
      for (let k = 0; k < 6; k++) this.danger.rect(k * 6, k * 6, W - k * 12, H - k * 12).stroke({ color: 0xb01010, width: 6, alpha: a * (1 - k / 6) });
    }
    if (this.riding) this.seeThrough(-1e6, -1e6, -1e6); else this.seeThrough(px, py, p.x + p.y); // 46차: 놀이기구 위에선 건물을 비추지 않는다
    this.updateGhosts(p.x, p.y, dt);
    this.refreshNight(nf);
    this.streamT -= dt;
    if (this.streamT <= 0 || this.streamMore) { this.streamT = 0.12; this.stream(false); } // 22차: 남은 일이 있으면 다음 프레임에 조금 더
    if (this.netRole !== 'guest') this.updateRaid(dt);
    this.updateGoatFx(dt); // 33차
    this.updateChimney(dt); // 34차
    this.updateFires(dt); // 46차
    if (this.zooAnimals.length) this.updateZoo(dt); // 46차
    this.updateDates(dt); // 46차 아큐버스 데이트
    if (this.chicken) this.updateChicken(dt); // 47차 닭
    this.updateDollEyes(dt); // 43차
    this.updateArea(dt); // 44차
    this.updateLitPath(dt);
    this.updateBeyondLife(dt);
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
    if (w.claimT && this.thinkClaim(w, moving)) return; // 44차: 버려진 물건을 주우러 가는 중
    const p = this.netRole === 'host' && this.isShared(w) ? this.nearestBody(w) : this.player; // 41차: 방장 기기는 손님들도 '사람'으로 본다
    if (w.stiffBoss && !w.target && w.down <= 0) { if (!moving) w.dir = dirFromTile(this.player.x - w.x, this.player.y - w.y, w.dir); if (!w.bubble && Math.random() < dt * 0.06) { const ls = t().stiffBossTaunt; this.bubble(w, ls[Math.floor(Math.random() * ls.length)]); } return; } // 47차: 떼먹은 사장은 먼저 덤비지 않고 비웃는다
    if (w.fb && this.thinkFieldBoss(w, moving, dt)) return;
    if (w.kind === 'guard') { this.thinkGuard(w, moving, dt); return; }
    if (w.kind === 'talus') { this.thinkTalus(w, dt); return; }
    if (w.kind === 'maskgirl') { this.thinkMaskGirl(w, moving, dt); return; }
    if (w.kind === 'yunae') { this.thinkYunae(w, moving, dt); return; }
    if (w.pray && Math.random() < dt * 0.04 && Math.hypot(this.player.x - w.x, this.player.y - w.y) < 9) { const m = t().idolMurmur; this.bubble(w, m[Math.floor(Math.random() * m.length)]); }
    if (w.kind === 'passer' && this.realm === 'real' && !w.tail && !w.mirror) this.civJab(w, Math.hypot(this.player.x - w.x, this.player.y - w.y), dt); // 42차: 신경 긁는 시민
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
    if (w.kind === 'marionette') { this.thinkMarionette(w, moving, dt); return; }
    if (w.taxi) return;
    if (w.preach !== undefined) { this.thinkPreacher(w, dt); return; }
    if (w.kind === 'sleeper') return;
    if (w.kind === 'goat') { this.thinkGoat(w, moving, dt); return; }
    if (w.kind === 'dog') { this.thinkDog(w, moving, dt); return; }
    if (w.kind === 'goatking') { this.thinkGoatKing(w, dt); return; }
    if (w.kind === 'changer') { this.thinkChanger(w, dt); return; }
    if (w.twin) { this.thinkTwin(w, moving, dt); return; } // 46차
    if (w.kind === 'noeul') { this.thinkNoeul(w, moving, dt); return; }
    if (w.kind === 'caged') { this.thinkCaged(w, moving, dt); return; }
    if (w.tail && this.realm === 'heaven' && this.thinkTail(w, moving, dt)) return;
    if (w.kind === 'yellowwing' && this.ywFollow) { this.thinkYellowWing(w, moving, dt); return; }
    if (w.dumpAngel) { if (!w.bubble && Math.random() < dt * 0.09 && Math.hypot(this.player.x - w.x, this.player.y - w.y) < 10) { const ls = t().dumpLines; this.bubble(w, ls[Math.floor(Math.random() * ls.length)]); } return; } // 47차: 한숨 쉬며 혼잣말
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
    if (w.kind !== 'pashar' && w.kind !== 'clerk' && w.kind !== 'officer' && w.kind !== 'yellowwing' && w.kind !== 'mari' && !w.taxi && w.preach === undefined && w.vend !== 'heaven' && !w.mdef?.boss && !w.tail && !w.fb && Math.hypot(w.x - p.x, w.y - p.y) > 34) { if (w.kind === 'suturer' || w.raider || w.kid) this.removeWalker(w); else if (w.mdef && this.zone.hell) this.spawnMonster(w); else if (w.mdef) this.removeWalker(w); else this.spawnNpc(w.kind as NpcKind, w); return; }
    if (w.flee > 0) {
      w.flee -= dt;
      if (!w.path.length) {
        const ax = w.x - p.x, ay = w.y - p.y, d = Math.hypot(ax, ay) || 1;
        const spot = randomWalkTileNear(this.zone, Math.floor(w.x + (ax / d) * 8), Math.floor(w.y + (ay / d) * 8), 3, ['walk', 'cross', 'park', 'soi', 'lot']);
        if (spot) { const path = findPath(this.zone, Math.floor(w.x), Math.floor(w.y), spot[0], spot[1]); if (path) w.path = path; }
      }
      return;
    }
    if (w.watch) w.dir = dirFromTile(p.x - w.x, p.y - w.y, w.dir);
    // 34차: 도움받은 행인 — 잠시 뒤 주인공에게 다가와 말을 건다 (누르면 사례). 너무 멀어지면 그만둔다
    if (w.kind === 'passer' && w.owe && w.down <= 0 && !w.target && w.flee <= 0) {
      const d = Math.hypot(p.x - w.x, p.y - w.y);
      if (!w.owe.ready) { w.owe.t -= dt; if (w.owe.t <= 0) { if (d < 14) { w.owe.ready = true; w.bubbleT = 0; } else w.owe = undefined; } }
      if (w.owe?.ready) {
        if (d > 22) { w.owe = undefined; return; }
        if (d > 1.8 && !w.path.length) { const tgt = this.nearestWalkable(Math.floor(p.x), Math.floor(p.y) + 1); if (tgt) w.path = findPath(this.zone, Math.floor(w.x), Math.floor(w.y), tgt[0], tgt[1]) ?? []; }
        if (d <= 2.4) { w.path = []; w.dir = dirFromTile(p.x - w.x, p.y - w.y, w.dir); }
        if (!w.bubble && Math.random() < dt * 0.5) { const c = t().thanksCalls; this.bubble(w, c[Math.floor(Math.random() * c.length)]); }
        return;
      }
    }
    if (w.murmur !== undefined && !w.bubble && Math.random() < dt * 0.05) { const m = t().yunaeBub[w.murmur] ?? []; if (m.length) this.bubble(w, m[Math.floor(Math.random() * m.length)]); }
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
      const L5 = t();
      const one5 = (a: string[]) => a[Math.floor(Math.random() * a.length)];
      // 43차 가면귀: 선량한 얼굴로 천천히 다가와 상냥한 말을 건네다, 곁에 닿으면 찌른다
      if (w.mdef.feign && !w.target && !this.dead && !this.invisible && !this.inRest(p.x, p.y) && d < w.mdef.notice + 2) {
        if (d < 1.7) { w.target = p; w.firstBy ??= w; w.atkT = 0; w.feigned = false; w.path = []; this.bubble(w, one5(L5.feignStab)); return; }
        if (!w.feigned) { w.feigned = true; this.bubble(w, one5(L5.feignHi)); }
        else if (!w.bubble && Math.random() < dt * 0.35) this.bubble(w, one5(L5.feignHi));
        if (!moving) { const path = findPath(this.zone, Math.floor(w.x), Math.floor(w.y), Math.floor(p.x), Math.floor(p.y)); if (path) w.path = path.length > 1 ? path.slice(0, -1) : path; }
        return;
      }
      if (!w.target && !w.untilHit && !this.dead && !this.invisible && !this.inRest(p.x, p.y) && d < w.mdef.notice && Math.random() < dt * 3) {
        w.target = p;
        w.firstBy ??= w;
        // 43차 속삭임꾼: 나를 보면 거짓 소문을 퍼뜨린다 — 둘레 10칸의 괴물이 모두 나를 노린다
        if (w.mdef.rumor && !w.rumored) {
          w.rumored = true;
          this.bubble(w, one5(L5.rumorLines));
          let n = 0;
          for (const o of this.walkers) if (o !== w && o.mdef && !o.mdef.boss && !o.target && o.down <= 0 && Math.hypot(o.x - w.x, o.y - w.y) < 10) { o.target = p; o.firstBy ??= o; o.repathT = 0; if (n++ === 0) this.bubble(o, one5(L5.rumorHeard)); }
          if (n) this.hooks.notice(L5.rumorNotice.replace('{n}', String(n)));
        }
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
    else if (w.kind === 'thug' && w.gang === 'pickpocket' && !w.target && !this.dead && w.down <= 0) { this.thinkPickpocket(w, dt); return; }
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
          if (!hidden) this.bubble(w, pick(w.weak === 'drunk' ? L.drunkGiveUp : w.weak === 'shade' ? L.shadeGiveUp : w.gang === 'robber' ? L.robberGiveUp : w.gang === 'mafia' ? L.mafiaGiveUp : w.gang ? (this.gangText(w.gang, 'GiveUp') as string[]) : L.thugGiveUp));
          w.stalk = 0; w.aggroCool = 20; w.path = [];
        } else if (d < 1.8 && w.stalk > 0.7) {
          w.stalk = 0;
          w.path = [];
          w.target = p;
          w.firstBy ??= w;
          this.bubble(w, pick(w.weak === 'drunk' ? L.drunkDemand : w.weak === 'shade' ? L.shadeDemand : w.gang === 'robber' ? L.robberDemand : w.gang === 'mafia' ? L.mafiaDemand : w.gang ? (this.gangText(w.gang, 'Demand') as string[]) : L.thugDemand));
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
      // 42차: 대로변은 조용하다 — 거리의 적은 내가 골목·구역 끝에 들어섰을 때만 시비를 건다 (끝 구역은 어디서나)
      const rough = this.realm !== 'real' || gz || this.roughAt(p.x, p.y);
      if (rough && !w.aggroCool && !hidden && d < notice + (gz ? 2.5 : 0) && Math.random() < dt * (gz ? 2.4 : 1.6) && (this.realm !== 'real' || this.attackersOnMe() < this.attackCap())) {
        w.stalk = 0.01;
        w.repathT = 0;
        { const X = t() as unknown as Record<string, string[]>; const more = X[(w.weak === 'drunk' ? 'drunk' : w.weak === 'shade' ? 'shade' : w.gang ?? 'thug') + 'Taunt45'] ?? []; // 45차: 시비 말을 늘렸다
          const base0 = w.weak === 'drunk' ? L.drunkTaunt : w.weak === 'shade' ? L.shadeTaunt : w.gang === 'robber' ? L.robberTaunt : w.gang === 'mafia' ? L.mafiaTaunt : w.gang ? (this.gangText(w.gang, 'Taunt') as string[] | string) : L.thugTaunt;
          this.bubble(w, pick([...(Array.isArray(base0) ? base0 : [base0]), ...more])); }
        this.rallyMafia(w);
        return;
      }
    }
    if (w.target || moving) return;
    w.wait -= dt;
    if (w.wait > 0) return;
    w.wait = 2 + Math.random() * 5;
    const thug = w.kind === 'thug' || w.kind === 'yellowwing';
    const spot = randomWalkTileNear(this.zone, thug ? w.home[0] : Math.floor(w.x), thug ? w.home[1] : Math.floor(w.y), w.kind === 'yellowwing' ? 7 : thug ? 5 : 10, thug && w.kind === 'thug' ? (this.realm === 'real' && !this.gangZone() ? ['soi', 'lot'] : ['soi', 'walk']) : ['walk', 'cross', 'park']); // 42차: 거리의 적은 골목 안에서만 서성인다
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

  /** 36차 PC 키보드 이동 (W·A·S·D, 방향키): 누르고 있는 동안 화면 방향으로 걷는다 — 사람·건물 위를 눌러 생기는 일 없이 */
  private keyDir = { x: 0, y: 0, next: 0, on: false };
  setKeyDir(x: number, y: number) {
    const k = this.keyDir;
    const was = k.on;
    k.x = x; k.y = y; k.on = !!(x || y);
    if (k.on && !was) {
      if (this.working?.on) this.stopWork();
      this.cancelActs();
      this.focusW = null;
      k.next = 0;
    }
    if (!k.on && was) this.player.path = this.player.path.slice(0, 1); // 손을 떼면 지금 걸음에서 멈춘다
  }
  private updateKeys() {
    const k = this.keyDir;
    if (!k.on || this.dead || this.workIn || this.time < k.next) return;
    k.next = this.time + 0.12;
    const p = this.player;
    const [sx, sy] = iso(p.x, p.y);
    const n = Math.hypot(k.x, k.y) || 1;
    const tx = sx * this.zoom + this.camera.x + (k.x / n) * 110 * this.zoom, ty = sy * this.zoom + this.camera.y + (k.y / n) * 62 * this.zoom;
    const keep = this.keepKite();
    p.path = p.path.slice(0, 1);
    if (keep) { p.target = keep; this.kite = true; } else p.target = null;
    this.moveToScreen(tx, ty, false);
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
    const toTile = (sx: number, sy: number) => { const X = (sx - this.camera.x) / this.zoom, Y = (sy - this.camera.y) / this.zoom; return [(X / (TW / 2) + Y / (TH / 2)) / 2, (Y / (TH / 2) - X / (TW / 2)) / 2]; };
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
    for (let k = this.flingRings.length - 1; k >= 0; k--) {
      const r = this.flingRings[k];
      r.t += dt;
      if (r.t >= r.dur) { this.flingRings.splice(k, 1); continue; }
      const q = r.t / r.dur, R = 6 + q * 30;
      g.ellipse(r.x, r.y, R, R * 0.55).stroke({ color: 0xffffff, width: 3 * (1 - q) + 0.5, alpha: 0.85 * (1 - q) });
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
        if (k < 0) continue;
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
    // 36차: 걸어가던 사람 곁에 닿으면 멈춘다 (몸에 부딪히며 걷지 않게)
    const fw = this.focusW, pl = this.player;
    if (fw && !pd && pl.path.length && Math.hypot(fw.x - pl.x, fw.y - pl.y) < 1.25 && !pl.target) pl.path = pl.path.slice(0, 1);
    this.nearFor = pd ? null : this.findNear();
    const who = pd && pd.kind === 'talk' ? pd.w : this.nearFor;
    this.talkIcon.visible = !!who;
    if (who) {
      const [x, y] = iso(who.x, who.y);
      this.talkIcon.clear().roundRect(-8, -7, 16, 11, 4).fill({ color: 0xfff6d8, alpha: 0.95 }).stroke({ color: 0x140e0a, width: 1 })
        .poly([-2, 4, 3, 4, -3, 8]).fill(0xfff6d8)
        .circle(-4, -1.5, 1).circle(0, -1.5, 1).circle(4, -1.5, 1).fill(0x140e0a);
      this.talkIcon.scale.set(this.touchTap ? 1.35 : 1.1);
      this.talkIcon.position.set(Math.round(x), Math.round(y - (who.kind === 'goatking' ? GK_FACE + 30 : Math.max(58 * BODY_K, 44 * bk(who) + 14)) + Math.sin(this.time * 4)));
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
      if (f.kind === 'shop') for (const kk of this.bViews.keys()) if (kk >= 0 && this.zone.buildings[kk].cat === 'ujusae') k = kk;
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
  private behindTower = false;
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
      if (v.b.cat === 'palace') continue; // 44차: 천국의 초고층은 나를 덮을 때만 비친다 (둘레만 걸어도 통째로 비쳐 뒤의 건물이 보이던 것)
      if (!v.parts.some((s) => s.zIndex > depth + 1)) continue;
      // 건물 바닥 앞 모서리가 내 발보다 화면 아래쪽(가까운 쪽)이고, 지붕이 내 둘레를 덮을 때만
      if (v.parts.some((s) => s.zIndex > depth + 1 && s.x < X1 && s.x + s.width > X0 && s.y < Y1 && s.y + s.height > Y0 && this.opaqueAt(v, Math.min(Math.max(px, s.x + 2), s.x + s.width - 2) - v.x, py - 30 - v.y))) for (const s of v.parts) now.add(s);
    }
    for (const t of this.tall) if (t.z > depth && t.x0 < x1 && t.x1 > x0 && t.y0 < y1 && t.y1 > y0) now.add(t.o);
    // 44차: 천국의 초고층은 비치게 하지 않는다 (비치면 뒤의 아파트들이 겹쳐 '콘도'처럼 보였다) — 대신 그 뒤에 선 나를 탑 위에 옅은 그림자로 그린다
    let behind = false;
    for (const v of this.bViews.values()) if (v.b.cat === 'palace') for (const s of v.parts) if (now.delete(s)) behind = true;
    for (const s of this.faded) if (!now.has(s) && !s.destroyed) s.alpha = 1;
    for (const s of now) s.alpha = 0.28;
    this.faded = now;
    const ps = this.player.sprite;
    if (behind) { ps.zIndex = 1e6 - 20; ps.alpha = 0.62; ps.tint = 0xb8c8e8; this.behindTower = true; }
    else if (this.behindTower) { ps.alpha = 1; ps.tint = 0xffffff; this.behindTower = false; }
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
