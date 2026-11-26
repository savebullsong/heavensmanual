// 관리자 페이지: 주요 인물 그림(대화창) · 게임 속 도트 그림 교체 — 두 메뉴로 나눔
import './canvasfix.ts'; // 29차: 맨 먼저 — 2D 캔버스를 메모리 쪽에
import './admin.css';
import { PORTRAIT_SLOTS, SPRITE_SLOTS, DEFAULT_PORTRAITS, type PortraitSlot } from './portraits.ts';
import { charSet, charSet3, frameOf, artDensity, MISS_HWANG, HWANGHON, BESK_LOOK, TALUS_LOOK, MASKGIRL_LOOK, yunaeLook, PX } from './sprites.ts';
import { BULDA_LOOK } from './border.ts';
import { drawCosmicBird, drawCosmicBirdHeaven } from './ujusae.ts';
import { drawYuhwang } from './yuhwang.ts';
import { drawLoanHouse } from './loanhouse.ts';
import type { Building } from './zone.ts';

const NAMES: Record<PortraitSlot, { name: string; where: string }> = {
  'miss-hwang': { name: '미스 황', where: '현실 · 우주새 점원' },
  'yellow-wing': { name: '황색날개', where: '천국 · 우주새 점원' },
  hwanghon: { name: '황혼', where: '지옥 · 유황새 점원 (미스 황과는 다른 사람이라고 믿는다)' },
  parrot: { name: '앵무새', where: '우주새 · 환생시키는 순간에만 말함' },
  luen: { name: '루엔', where: '천국 · 구름 계단 위 환생의 테라스' },
  pashar: { name: '파샤르', where: '지옥 1층 · 환생관' },
  'goat-king': { name: '염소대왕', where: '지옥 142층 · 떨어진 자들의 상담자 (지옥에 오면 맨 먼저 만난다)' },
  changer: { name: '환전상 오볼로', where: '지옥 142층 염소대왕의 방 · 이승 돈을 노전으로 바꿔 주는 붉은 악마 (꼬리 · 날개 · 로브)' },
  ferum: { name: '대장장이 페룸', where: '지옥 4층 · 팔이 넷인 검게 그을린 거대한 악마, 붉은 불꽃이 솟는 낡은 대장간 (완성 템브라 하루 한 개)' },
  besk: { name: '베스크', where: '지옥 3층 · 베스크 대부소의 대부업자' },
  talus: { name: '탈루스', where: '지옥 2층 들판 · 뼈주사위 노름꾼' },
  grandpa: { name: '환생관 할아버지', where: '천국 환생의 테라스 · 지옥 로비 — 가끔 루엔·파샤르 대신 나오는 안경 쓴 아주 늙은 할아버지 (천국·지옥 같은 사람, 옷차림만 다름)' },
  bulda: { name: '불다', where: '경계의 해변 · 콘로 머리의 어부 겸 랩퍼 (붓다 아님)' },
  maskgirl: { name: '마스크 팔이 소녀', where: '지옥 1층 · 휴식 마을 바깥을 맴도는 중립 상인 (검은 마스크 · 화염방사기)' },
  yunae: { name: '유내 · 공통', where: '서울 · 내 집 — 아래 나이별 칸이 비어 있을 때 쓰는 그림' },
  'yunae-teen': { name: '유내 · 10대', where: '서울 · 내 집 안 — 놀러 가자고 조르는 열몇 살' },
  'yunae-20s': { name: '유내 · 20대', where: '서울 · 내 집 대문 앞 — 동네 미용실을 하는 스무 살 무렵' },
  'yunae-30s': { name: '유내 · 30대 후반', where: '서울 · 내 집 안 — 밥상을 차려 두고 기다리는 서른여덟쯤' },
  'sprite-miss-hwang': { name: '미스 황', where: '우주새 카운터 뒤에 서 있는 모습 (왼쪽 아래를 봄)' },
  'sprite-hwanghon': { name: '황혼', where: '유황새(지옥) 카운터 뒤에 서 있는 모습 (왼쪽 아래를 봄)' },
  'sprite-parrot': { name: '앵무새 · 볏 내림', where: '카운터 끝 횃대 · 평소 모습' },
  'sprite-parrot-up': { name: '앵무새 · 볏 세움', where: '가끔 머리깃을 세울 때 (비워 두면 볏 내림 그림을 그대로 씀)' },
  'sprite-besk': { name: '베스크', where: '지옥 3층 · 베스크 대부소 카운터 뒤에 서 있는 모습 (왼쪽 아래를 봄 · 오른쪽 아래를 볼 때는 좌우를 뒤집어 씀)' },
  'sprite-bulda': { name: '불다', where: '경계의 해변 · 잔교 들머리에 서 있는 모습 (왼쪽 아래를 봄 · 오른쪽 아래는 좌우 뒤집기)' },
  'sprite-maskgirl': { name: '마스크 팔이 소녀', where: '지옥 1층 휴식 마을 바깥 · 바구니를 든 채 서 있는 모습 (왼쪽 아래를 봄 · 오른쪽 아래는 좌우 뒤집기 · 걷는 모습은 구운 그림)' },
  'sprite-yunae-teen': { name: '유내 · 10대', where: '서울 · 내 집 안 · 밥상 앞에 서 있는 모습 (왼쪽 아래를 봄 · 오른쪽 아래는 좌우 뒤집기 · 걷는 모습은 구운 그림)' },
  'sprite-yunae-20s': { name: '유내 · 20대', where: '서울 · 내 집 대문 앞 · 서 있는 모습 (왼쪽 아래를 봄 · 걸어 나가는 모습은 구운 그림)' },
  'sprite-yunae-30s': { name: '유내 · 30대 후반', where: '서울 · 내 집 안 · 밥상 앞에 서 있는 모습 (왼쪽 아래를 봄 · 걷는 모습은 구운 그림)' },
  'sprite-goat-king': { name: '염소대왕', where: '지옥 142층 · 뒤 모서리 흑요석 단 위 옥좌에 앉은 온몸 (옥좌째 · 정면 · 기본 그림과 같은 크기 440×626 · 2배 밀도 → 게임 속 220×313)' },
  'sprite-talus': { name: '탈루스', where: '지옥 2층 들판 · 산탄총을 든 채 서 있는 모습 (왼쪽 아래를 봄 · 오른쪽 아래는 좌우 뒤집기 · 총을 쏠 때는 구운 그림)' },
  'bld-ujusae': { name: '우주새 건물 · 낮', where: '현실·천국의 우주새 · 바닥 2×2칸' },
  'bld-ujusae-night': { name: '우주새 건물 · 밤', where: '창에 불이 켜진 밤 모습 (비워 두면 낮 그림을 밤에도 씀)' },
  'bld-ujusae-heaven': { name: '우주새 건물 · 천국', where: '천국의 우주새 (늘 낮) · 바닥 2×2칸 · 비워 두면 볕에 바랜 흰·금빛 기본 그림' },
  'bld-loan': { name: '베스크 대부소', where: '지옥 3층 피의 시장 마을 · 바닥 3×2칸' },
  'bld-hell-1': { name: '유황새 · 지옥 1층', where: '재의 문턱 마을 (그을음·재 더미) · 바닥 2×2칸' },
  'bld-hell-2': { name: '유황새 · 지옥 2층', where: '굶주림의 늪 마을 (진흙·이끼·판자 창) · 바닥 2×2칸' },
  'bld-hell-3': { name: '유황새 · 지옥 3층', where: '피의 시장 마을 (금 간 벽·봉랍·붉은 등롱) · 바닥 2×2칸' },
  'bld-hell-4': { name: '유황새 · 지옥 4층', where: '비명의 용광로 마을 (그을음·쇳물빛 실금·쇠사슬·찌꺼기 더미) · 바닥 2×2칸' },
};

type Tab = 'portraits' | 'sprites' | 'chars';
const isSprite = (s: PortraitSlot) => (SPRITE_SLOTS as readonly string[]).includes(s);

/** 도트 칸의 지금 기본 그림 (게임이 구운 그림 그대로) */
interface DotSpec { canvas: HTMLCanvasElement; w: number; h: number; foot?: [number, number]; /** 32차: 3배 밑그림을 구울 사람 */ who?: { look: import('./character.ts').Look; weapon: string | null } }
const dotSpecs = new Map<PortraitSlot, Promise<DotSpec | null>>();
function dotSpec(slot: PortraitSlot): Promise<DotSpec | null> {
  let p = dotSpecs.get(slot);
  if (p) return p;
  p = (async () => {
    try {
      // 건물: 게임이 그리는 그림을 그대로 (그림의 왼쪽 위가 같은 자리에 놓인다)
      if (slot === 'bld-ujusae' || slot === 'bld-ujusae-night' || slot === 'bld-ujusae-heaven' || slot === 'bld-loan' || slot.startsWith('bld-hell-')) {
        const b = { i0: 0, j0: 0, w: slot === 'bld-loan' ? 3 : 2, d: 2, h: 60, cat: slot === 'bld-loan' ? 'loan' : 'ujusae', color: '#000000' } as Building;
        const d = slot === 'bld-loan' ? drawLoanHouse(b) : slot.startsWith('bld-hell-') ? drawYuhwang(b, Number(slot.slice(9))) : slot === 'bld-ujusae-heaven' ? drawCosmicBirdHeaven(b) : drawCosmicBird(b, slot === 'bld-ujusae-night');
        return { canvas: d.canvas, w: d.canvas.width, h: d.canvas.height };
      }
      if (slot === 'sprite-miss-hwang' || slot === 'sprite-hwanghon' || slot === 'sprite-besk' || slot === 'sprite-talus' || slot === 'sprite-bulda' || slot === 'sprite-maskgirl' || slot.startsWith('sprite-yunae-')) {
        const who = slot === 'sprite-talus' ? { look: TALUS_LOOK, weapon: 'shotgun' } : { look: slot.startsWith('sprite-yunae-') ? yunaeLook(slot === 'sprite-yunae-teen' ? 0 : slot === 'sprite-yunae-20s' ? 1 : 2) : slot === 'sprite-maskgirl' ? MASKGIRL_LOOK : slot === 'sprite-bulda' ? BULDA_LOOK : slot === 'sprite-besk' ? BESK_LOOK : slot === 'sprite-hwanghon' ? HWANGHON : MISS_HWANG, weapon: null };
        const cs = await charSet(who.look, who.weapon);
        const f = frameOf(cs, 'idle', 'sw', 0);
        if (!f) return null;
        const src = f.tex.source.resource as HTMLCanvasElement;
        const fr = f.tex.frame;
        const c = document.createElement('canvas');
        c.width = fr.width; c.height = fr.height;
        c.getContext('2d')!.drawImage(src, fr.x, fr.y, fr.width, fr.height, 0, 0, fr.width, fr.height);
        // 구운 그림이 2배 밀도(PX=2)면 캔버스는 2배, 필요한 크기(w·h)는 게임 속 크기로 적는다 (32차: 3배 시험 중이면 3으로 나눈다)
        const P = cs.px ?? PX;
        return { canvas: c, w: Math.round(c.width / P), h: Math.round(c.height / P), foot: [Math.round((f.ax * f.w) / P), Math.round((f.ay * f.h) / P)], who };
      }
      const name = slot === 'sprite-parrot' ? 'shop-parrot-0' : 'shop-parrot-1';
      const im = await new Promise<HTMLImageElement>((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = slot === 'sprite-goat-king' ? './npc/goat-king.png' : `./sprites/${name}.png`; });
      if (slot === 'sprite-goat-king') { const c = document.createElement('canvas'); c.width = im.width; c.height = im.height; c.getContext('2d')!.drawImage(im, 0, 0); return { canvas: c, w: Math.round(c.width / 2), h: Math.round(c.height / 2), foot: [Math.round(c.width / 4), Math.round(c.height / 2)] }; }
      const c = document.createElement('canvas');
      c.width = im.width; c.height = im.height;
      c.getContext('2d')!.drawImage(im, 0, 0);
      return { canvas: c, w: c.width, h: c.height };
    } catch {
      return null;
    }
  })();
  dotSpecs.set(slot, p);
  return p;
}

const KEY_STORE = 'hm.admin.key';
const root = document.getElementById('admin')!;
let key = sessionStorage.getItem(KEY_STORE) ?? '';
let overrides: Partial<Record<PortraitSlot, string>> = {};

function h<K extends keyof HTMLElementTagNameMap>(tag: K, cls?: string, text?: string) {
  const el = document.createElement(tag);
  if (cls) el.className = cls;
  if (text !== undefined) el.textContent = text;
  return el;
}

async function api(method: string, query: string, body?: Blob) {
  return fetch(`api/portraits${query}`, {
    method,
    headers: { 'x-admin-key': key, ...(body ? { 'content-type': body.type } : {}) },
    body,
  });
}

function showLogin(message = '') {
  root.innerHTML = '';
  const card = h('form', 'login');
  card.append(h('h1', '', "Heaven's Manual 관리자"), h('p', 'sub', '주요 인물 그림과 게임 속 도트 그림을 바꾸는 곳입니다.'));
  const input = h('input');
  input.type = 'password';
  input.placeholder = '비밀번호';
  input.autocomplete = 'current-password';
  const btn = h('button', 'primary', '들어가기');
  btn.type = 'submit';
  const msg = h('p', 'msg', message);
  card.append(input, btn, msg);
  card.onsubmit = async (e) => {
    e.preventDefault();
    key = input.value;
    btn.disabled = true;
    msg.textContent = '확인하는 중…';
    try {
      const r = await api('POST', '?check=1');
      if (r.ok) {
        sessionStorage.setItem(KEY_STORE, key);
        await showSlots();
        return;
      }
      msg.textContent = r.status === 401 ? '비밀번호가 맞지 않습니다.' : `서버 응답 ${r.status}`;
    } catch {
      msg.textContent = '서버에 연결할 수 없습니다.';
    }
    btn.disabled = false;
  };
  root.appendChild(card);
  input.focus();
}

async function loadOverrides() {
  try {
    const r = await fetch(`api/portraits?fresh=${Date.now()}`);
    const j = await r.json();
    overrides = j.slots ?? {};
  } catch {
    overrides = {};
  }
}

async function showSlots(tab: Tab = location.hash === '#sprites' ? 'sprites' : location.hash === '#chars' ? 'chars' : 'portraits') {
  await loadOverrides();
  root.innerHTML = '';
  const head = h('header');
  const tabs = h('nav', 'tabs');
  for (const [k, label] of [['portraits', '인물 그림 (대화창)'], ['sprites', '도트 그림 (게임 속)'], ['chars', '관리자 캐릭터']] as [Tab, string][]) {
    const b = h('button', k === tab ? 'tab on' : 'tab', label);
    b.onclick = () => { history.replaceState(null, '', `#${k}`); showSlots(k); };
    tabs.append(b);
  }
  head.append(h('h1', '', "Heaven's Manual 관리자"), tabs,
    h('p', 'sub', tab === 'chars'
      ? '아이디를 넣으면 그 계정이 관리자 캐릭터가 됩니다. 게임 안 영혼 설정에서 투명해질 수 있습니다(몹이 알아보지 못하고 다른 사람에게 보이지 않음, 지도 확인용). 투명한 동안은 싸울 수 없고, 환생·죽음·돈은 다른 사람과 똑같은 절차를 따릅니다. 다음 접속(또는 새로고침)부터 적용됩니다.'
      : tab === 'portraits'
      ? '대화할 때 크게 서는 그림입니다. 세로로 긴 상반신 그림(약 2:3)이 잘 어울립니다. 저장하면 1분 안에 게임에 반영됩니다.'
      : '게임 화면 속 작은 도트 그림입니다. 지금 그림을 내려받아 그 위에 손질한 뒤, 같은 크기의 투명 PNG로 올려 주세요. 크기가 1px이라도 다르면 받지 않습니다 (발 위치와 다른 그림과의 비율이 어긋나기 때문).'));
  const out = h('button', '', '나가기');
  out.onclick = () => { sessionStorage.removeItem(KEY_STORE); key = ''; showLogin(); };
  head.appendChild(out);
  root.appendChild(head);
  if (tab === 'chars') { root.appendChild(adminChars()); return; }
  const grid = h('div', tab === 'sprites' ? 'grid dots' : 'grid');
  for (const slot of PORTRAIT_SLOTS) {
    if (isSprite(slot) !== (tab === 'sprites')) continue;
    grid.appendChild(isSprite(slot) ? dotCard(slot) : slotCard(slot));
  }
  root.appendChild(grid);
}

/** 관리자 캐릭터: 아이디로 지정·해제, 지금 지정된 계정 목록 */
function adminChars() {
  const card = h('section', 'card chars');
  card.append(h('h2', '', '관리자 캐릭터 지정'));
  const row = h('div', 'actions');
  const input = h('input');
  input.placeholder = '아이디 (영문 소문자·숫자·밑줄 4~16자)';
  input.autocapitalize = 'none';
  input.spellcheck = false;
  const on = h('button', 'primary', '관리자로 지정');
  const off = h('button', '', '해제');
  row.append(input, on, off);
  const status = h('p', 'status');
  const list = h('ul', 'admin-list');
  card.append(row, status, h('h2', '', '지금 관리자 캐릭터'), list);
  const load = async () => {
    list.innerHTML = '';
    try {
      const r = await fetch('api/admins', { headers: { 'x-admin-key': key } });
      if (r.status === 401) { showLogin('다시 로그인해 주세요.'); return; }
      const j = await r.json();
      const arr = (j.admins ?? []) as { username: string; name: string | null }[];
      if (!arr.length) list.append(h('li', 'muted', '아직 없습니다.'));
      for (const a of arr) list.append(h('li', '', a.name ? `${a.username} · ${a.name}` : a.username));
    } catch {
      list.append(h('li', 'muted', '목록을 불러오지 못했습니다.'));
    }
  };
  const set = async (v: boolean) => {
    const u = input.value.trim().toLowerCase();
    if (!/^[a-z0-9_]{4,16}$/.test(u)) { status.textContent = '아이디 형식이 아닙니다.'; return; }
    on.disabled = off.disabled = true;
    status.textContent = '저장하는 중…';
    try {
      const r = await fetch('api/admins', { method: 'POST', headers: { 'x-admin-key': key, 'content-type': 'application/json' }, body: JSON.stringify({ username: u, on: v }) });
      const j = await r.json().catch(() => ({}));
      status.textContent = j.ok ? (v ? `${u} 계정을 관리자 캐릭터로 지정했습니다.` : `${u} 계정의 관리자 지정을 풀었습니다.`) : j.error === 'no_user' ? '그런 아이디가 없습니다.' : `실패했습니다 (${j.error ?? r.status}).`;
      if (j.ok) { input.value = ''; await load(); }
    } catch {
      status.textContent = '서버에 연결할 수 없습니다.';
    }
    on.disabled = off.disabled = false;
  };
  on.onclick = () => set(true);
  off.onclick = () => set(false);
  void load();
  return card;
}

/** 도트 칸: 지금 그림(확대) · 정확한 크기 · 밑그림 내려받기 · 같은 크기 PNG만 올리기 */
function dotCard(slot: PortraitSlot) {
  const card = h('section', 'card dot');
  const info = NAMES[slot];
  card.append(h('h2', '', info.name), h('p', 'where', info.where));
  const size = h('p', 'size', '크기 확인 중…');
  const frame = h('div', 'frame dotframe');
  const view = h('canvas', 'dotview');
  frame.append(view);
  const status = h('p', 'status');
  const actions = h('div', 'actions');
  const file = h('input');
  file.type = 'file';
  file.accept = 'image/png';
  file.hidden = true;
  const pick = h('button', 'primary', 'PNG 올리기');
  const down = h('button', '', '지금 그림 (1배)');
  const down2 = h('button', '', '2배 밑그림');
  const down3 = h('button', '', '3배 밑그림');
  const reset = h('button', '', '구운 그림으로');
  const save = h('button', 'primary', '저장');
  const cancel = h('button', '', '취소');
  card.append(size, frame, status, actions, file);
  let spec: DotSpec | null = null;
  let pending: Blob | null = null;
  let current: HTMLCanvasElement | null = null;

  const paint = (src: CanvasImageSource, w: number, h0: number) => {
    const Z = Math.max(2, Math.min(8, Math.floor(200 / Math.max(w, h0))));
    view.width = w * Z; view.height = h0 * Z;
    const g = view.getContext('2d')!;
    g.imageSmoothingEnabled = false;
    g.clearRect(0, 0, view.width, view.height);
    g.drawImage(src, 0, 0, w * Z, h0 * Z);
    if (spec?.foot) {
      // 발 기준점 (게임에서 바닥에 닿는 점)
      const m = Math.abs(w - spec.w * 3) <= 3 ? 3 : Math.abs(w - spec.w * 2) <= 2 ? 2 : 1;
      const [fx, fy] = [spec.foot[0] * m + (m - 1) * 0.5, spec.foot[1] * m + (m - 1) * 0.5];
      g.strokeStyle = 'rgba(224,70,58,0.9)'; g.lineWidth = 1;
      g.beginPath(); g.moveTo((fx + 0.5) * Z - 6, (fy + 0.5) * Z); g.lineTo((fx + 0.5) * Z + 6, (fy + 0.5) * Z);
      g.moveTo((fx + 0.5) * Z, (fy + 0.5) * Z - 6); g.lineTo((fx + 0.5) * Z, (fy + 0.5) * Z + 6); g.stroke();
    }
  };
  const asCanvas = async (src: string | Blob) => {
    const bmp = await createImageBitmap(typeof src === 'string' ? await (await fetch(src)).blob() : src);
    const c = document.createElement('canvas');
    c.width = bmp.width; c.height = bmp.height;
    c.getContext('2d')!.drawImage(bmp, 0, 0);
    return c;
  };
  const show = async () => {
    spec = await dotSpec(slot);
    if (!spec) { size.textContent = '구운 그림을 읽지 못했습니다.'; return; }
    size.innerHTML = `필요한 크기 <b>${spec.w}×${spec.h}px</b> · 2배 <b>${spec.w * 2}×${spec.h * 2}px</b>${spec.who ? ` · 3배 <b>${spec.w * 3}×${spec.h * 3}px</b>` : ''} · 배경 투명 PNG<br><span class="hint2">2배·3배로 그리면 게임 속 크기는 같고, 휴대폰·고해상도 화면에서 그만큼 섬세하게 보입니다${spec.who ? ' (도트 3배 시험을 켜면 3배 그림만 보입니다)' : ''}</span>${spec.foot ? `<br>발 기준점: 왼쪽에서 ${spec.foot[0]}px, 위에서 ${spec.foot[1]}px (2배면 ${spec.foot[0] * 2}, ${spec.foot[1] * 2}${spec.who ? ` · 3배면 ${spec.foot[0] * 3 + 1}, ${spec.foot[1] * 3 + 1}` : ''}) · 빨간 십자` : '<br>그림의 왼쪽 위가 지금 그림과 같은 자리에 놓입니다'}`;
    const u = overrides[slot];
    current = u ? await asCanvas(u).catch(() => spec!.canvas) : spec.canvas;
    paint(current, current.width, current.height);
    status.textContent = u ? '바꾼 그림을 쓰는 중' : '게임이 구운 그림을 쓰는 중';
    actions.innerHTML = '';
    actions.append(pick, down, down2);
    if (spec.who) actions.append(down3);
    if (u) actions.append(reset);
  };
  const save2 = (c: HTMLCanvasElement) => c.toBlob((b) => {
    if (!b) return;
    const a = document.createElement('a');
    a.href = URL.createObjectURL(b);
    a.download = `${slot}-${c.width}x${c.height}.png`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  }, 'image/png');
  // 1배: 지금 게임 그림 그대로 · 2배: 같은 그림을 픽셀째 두 배로 키운 밑그림 (그 위에 섬세하게 손질)
  down.onclick = () => {
    if (!spec) return;
    if (spec.canvas.width === spec.w) { save2(spec.canvas); return; }
    const c = document.createElement('canvas');
    c.width = spec.w; c.height = spec.h;
    const g = c.getContext('2d')!;
    g.imageSmoothingEnabled = false;
    g.drawImage(spec.canvas, 0, 0, c.width, c.height);
    save2(c);
  };
  down2.onclick = () => {
    if (!spec) return;
    const c = document.createElement('canvas');
    c.width = spec.w * 2; c.height = spec.h * 2;
    const g = c.getContext('2d')!;
    g.imageSmoothingEnabled = false;
    g.drawImage(spec.canvas, 0, 0, c.width, c.height);
    save2(c);
  };
  // 32차: 3배 밑그림 — 3배로 구운 층이 있으면 그 그림을, 없으면 지금 그림을 픽셀째 세 배로. 크기·발 기준점은 게임 그림에 맞춰 둔다
  down3.onclick = async () => {
    if (!spec?.who) return;
    const c = document.createElement('canvas');
    c.width = spec.w * 3; c.height = spec.h * 3;
    const g = c.getContext('2d')!;
    g.imageSmoothingEnabled = false;
    const cs3 = await charSet3(spec.who.look, spec.who.weapon).catch(() => null);
    const f3 = cs3 ? frameOf(cs3, 'idle', 'sw', 0) : undefined;
    if (f3 && spec.foot) {
      const fr = f3.tex.frame;
      const fx = Math.round(f3.ax * f3.w), fy = Math.round(f3.ay * f3.h);
      g.drawImage(f3.tex.source.resource as HTMLCanvasElement, fr.x, fr.y, fr.width, fr.height, spec.foot[0] * 3 + 1 - fx, spec.foot[1] * 3 + 1 - fy, fr.width, fr.height);
    } else g.drawImage(spec.canvas, 0, 0, c.width, c.height);
    save2(c);
  };
  pick.onclick = () => file.click();
  file.onchange = async () => {
    const f = file.files?.[0];
    file.value = '';
    if (!f || !spec) return;
    // 휴대폰에서 고르면 파일 종류가 비어 오기도 해서, 이름표 대신 파일 첫머리(PNG 서명)로 확인한다
    const sig = new Uint8Array(await f.slice(0, 8).arrayBuffer());
    const isPng = sig[0] === 0x89 && sig[1] === 0x50 && sig[2] === 0x4e && sig[3] === 0x47;
    if (!isPng) { status.textContent = `PNG 파일만 올릴 수 있습니다 (투명 배경이 필요해서). 이 파일은 ${f.type || '종류를 알 수 없는 파일'}입니다. 사진 앱이 JPEG로 바꿔 보냈다면 '파일'에서 원본 PNG를 골라 주세요.`; return; }
    let c: HTMLCanvasElement;
    try { c = await asCanvas(f); } catch { status.textContent = '이 파일은 열 수 없습니다.'; return; }
    const k = artDensity(c, spec.w, spec.h);
    if (!k || (k === 3 && !spec.who)) {
      status.textContent = `크기가 다릅니다: 올린 그림 ${c.width}×${c.height}px, 필요한 크기 ${spec.w}×${spec.h}px · ${spec.w * 2}×${spec.h * 2}px${spec.who ? ` · ${spec.w * 3}×${spec.h * 3}px` : ''}`;
      return;
    }
    pending = f.type === "image/png" ? f : new Blob([f], { type: "image/png" });
    paint(c, c.width, c.height);
    status.textContent = `미리보기 · ${c.width}×${c.height}px · 크기 맞음${k > 1 ? ` (${k}배)` : ''}`;
    actions.innerHTML = '';
    actions.append(save, cancel);
  };
  cancel.onclick = () => { pending = null; void show(); };
  save.onclick = async () => {
    if (!pending) return;
    save.disabled = true;
    status.textContent = '저장하는 중…';
    try {
      const r = await api('POST', `?slot=${slot}`, pending);
      const j = await r.json().catch(() => ({}));
      if (r.status === 401) { showLogin('다시 로그인해 주세요.'); return; }
      if (!r.ok) throw new Error(j.error ?? String(r.status));
      overrides[slot] = j.url;
      pending = null;
      await show();
      status.textContent = '저장했습니다. 1분 안에 게임에 반영됩니다.';
    } catch (e) {
      status.textContent = `저장하지 못했습니다 (${e instanceof Error ? e.message : '오류'})`;
    }
    save.disabled = false;
  };
  reset.onclick = async () => {
    if (!confirm(`${info.name} 도트 그림을 게임이 구운 그림으로 되돌릴까요?`)) return;
    status.textContent = '되돌리는 중…';
    try {
      const r = await api('DELETE', `?slot=${slot}`);
      if (r.status === 401) { showLogin('다시 로그인해 주세요.'); return; }
      if (!r.ok) throw new Error(String(r.status));
      delete overrides[slot];
      await show();
      status.textContent = '구운 그림으로 되돌렸습니다.';
    } catch (e) {
      status.textContent = `되돌리지 못했습니다 (${e instanceof Error ? e.message : '오류'})`;
    }
  };
  void show();
  return card;
}

function slotCard(slot: PortraitSlot) {
  const card = h('section', 'card');
  const info = NAMES[slot];
  card.append(h('h2', '', info.name), h('p', 'where', info.where));
  const frame = h('div', 'frame');
  const img = h('img');
  img.alt = info.name;
  const empty = h('div', 'empty', '그림 없음\n대화창에 이름만 나옵니다');
  frame.append(img, empty);
  const status = h('p', 'status');
  const actions = h('div', 'actions');
  const file = h('input');
  file.type = 'file';
  file.accept = 'image/*';
  file.hidden = true;
  const pick = h('button', 'primary', '그림 바꾸기');
  const reset = h('button', '', '기본 그림으로');
  const save = h('button', 'primary', '저장');
  const cancel = h('button', '', '취소');
  card.append(frame, status, actions, file);
  let pending: Blob | null = null;

  const show = () => {
    const cur = overrides[slot] ?? DEFAULT_PORTRAITS[slot] ?? '';
    img.hidden = !cur;
    empty.hidden = !!cur;
    if (cur) img.src = cur;
    status.textContent = overrides[slot] ? '바꾼 그림' : DEFAULT_PORTRAITS[slot] ? '기본 그림' : '';
    actions.innerHTML = '';
    actions.append(pick);
    if (overrides[slot]) actions.append(reset);
  };
  pick.onclick = () => file.click();
  file.onchange = async () => {
    const f = file.files?.[0];
    file.value = '';
    if (!f) return;
    status.textContent = '그림을 줄이는 중…';
    try {
      pending = await shrink(f);
    } catch {
      status.textContent = '이 파일은 열 수 없습니다.';
      return;
    }
    img.src = URL.createObjectURL(pending);
    img.hidden = false;
    empty.hidden = true;
    status.textContent = `미리보기 · ${(pending.size / 1024).toFixed(0)}KB`;
    actions.innerHTML = '';
    actions.append(save, cancel);
  };
  cancel.onclick = () => { pending = null; show(); };
  save.onclick = async () => {
    if (!pending) return;
    save.disabled = true;
    status.textContent = '저장하는 중…';
    try {
      const r = await api('POST', `?slot=${slot}`, pending);
      const j = await r.json().catch(() => ({}));
      if (r.status === 401) { showLogin('다시 로그인해 주세요.'); return; }
      if (!r.ok) throw new Error(j.error ?? String(r.status));
      overrides[slot] = j.url;
      pending = null;
      show();
      status.textContent = '저장했습니다. 1분 안에 게임에 반영됩니다.';
    } catch (e) {
      status.textContent = `저장하지 못했습니다 (${e instanceof Error ? e.message : '오류'})`;
    }
    save.disabled = false;
  };
  reset.onclick = async () => {
    if (!confirm(`${info.name}의 그림을 기본 그림으로 되돌릴까요?`)) return;
    status.textContent = '되돌리는 중…';
    try {
      const r = await api('DELETE', `?slot=${slot}`);
      if (r.status === 401) { showLogin('다시 로그인해 주세요.'); return; }
      if (!r.ok) throw new Error(String(r.status));
      delete overrides[slot];
      show();
      status.textContent = '기본 그림으로 되돌렸습니다.';
    } catch (e) {
      status.textContent = `되돌리지 못했습니다 (${e instanceof Error ? e.message : '오류'})`;
    }
  };
  show();
  return card;
}

/** 올리기 전에 긴 쪽 1712px 이하로 줄이고 webp로 바꾼다 (안 되는 브라우저는 jpeg) */
async function shrink(f: File): Promise<Blob> {
  const bmp = await createImageBitmap(f);
  const scale = Math.min(1, 1712 / bmp.height, 1200 / bmp.width);
  const c = document.createElement('canvas');
  c.width = Math.round(bmp.width * scale);
  c.height = Math.round(bmp.height * scale);
  const g = c.getContext('2d')!;
  g.imageSmoothingQuality = 'high';
  g.drawImage(bmp, 0, 0, c.width, c.height);
  const as = (type: string, q: number) => new Promise<Blob | null>((res) => c.toBlob(res, type, q));
  const webp = await as('image/webp', 0.86);
  if (webp && webp.type === 'image/webp') return webp;
  const jpg = await as('image/jpeg', 0.88);
  if (!jpg) throw new Error('encode');
  return jpg;
}

if (key) showSlots(); else showLogin();
