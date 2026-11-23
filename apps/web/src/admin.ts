// 관리자 페이지: 주요 인물 그림(대화창) · 게임 속 도트 그림 교체 — 두 메뉴로 나눔
import './admin.css';
import { PORTRAIT_SLOTS, SPRITE_SLOTS, DEFAULT_PORTRAITS, type PortraitSlot } from './portraits.ts';
import { charSet, frameOf, MISS_HWANG, PX } from './sprites.ts';

const NAMES: Record<PortraitSlot, { name: string; where: string }> = {
  'miss-hwang': { name: '미스 황', where: '현실 · 우주새 점원' },
  'yellow-wing': { name: '황색날개', where: '천국 · 우주새 점원' },
  hwanghon: { name: '황혼', where: '지옥 · 우주새 점원' },
  parrot: { name: '앵무새', where: '우주새 · 환생시키는 순간에만 말함' },
  luen: { name: '루엔', where: '천국 · 환생관' },
  pashar: { name: '파샤르', where: '지옥 1층 · 환생관' },
  'goat-king': { name: '염소대왕', where: '지옥 13층 · 최종 보스' },
  'sprite-miss-hwang': { name: '미스 황', where: '우주새 카운터 뒤에 서 있는 모습 (왼쪽 아래를 봄)' },
  'sprite-parrot': { name: '앵무새 · 볏 내림', where: '카운터 끝 횃대 · 평소 모습' },
  'sprite-parrot-up': { name: '앵무새 · 볏 세움', where: '가끔 머리깃을 세울 때 (비워 두면 볏 내림 그림을 그대로 씀)' },
};

type Tab = 'portraits' | 'sprites';
const isSprite = (s: PortraitSlot) => (SPRITE_SLOTS as readonly string[]).includes(s);

/** 도트 칸의 지금 기본 그림 (게임이 구운 그림 그대로) */
interface DotSpec { canvas: HTMLCanvasElement; w: number; h: number; foot?: [number, number] }
const dotSpecs = new Map<PortraitSlot, Promise<DotSpec | null>>();
function dotSpec(slot: PortraitSlot): Promise<DotSpec | null> {
  let p = dotSpecs.get(slot);
  if (p) return p;
  p = (async () => {
    try {
      if (slot === 'sprite-miss-hwang') {
        const cs = await charSet(MISS_HWANG);
        const f = frameOf(cs, 'idle', 'sw', 0);
        if (!f) return null;
        const src = f.tex.source.resource as HTMLCanvasElement;
        const fr = f.tex.frame;
        const c = document.createElement('canvas');
        c.width = fr.width; c.height = fr.height;
        c.getContext('2d')!.drawImage(src, fr.x, fr.y, fr.width, fr.height, 0, 0, fr.width, fr.height);
        // 구운 그림이 2배 밀도(PX=2)면 캔버스는 2배, 필요한 크기(w·h)는 게임 속 크기로 적는다
        return { canvas: c, w: Math.round(c.width / PX), h: Math.round(c.height / PX), foot: [Math.round((f.ax * f.w) / PX), Math.round((f.ay * f.h) / PX)] };
      }
      const name = slot === 'sprite-parrot' ? 'shop-parrot-0' : 'shop-parrot-1';
      const im = await new Promise<HTMLImageElement>((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = `./sprites/${name}.png`; });
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

async function showSlots(tab: Tab = location.hash === '#sprites' ? 'sprites' : 'portraits') {
  await loadOverrides();
  root.innerHTML = '';
  const head = h('header');
  const tabs = h('nav', 'tabs');
  for (const [k, label] of [['portraits', '인물 그림 (대화창)'], ['sprites', '도트 그림 (게임 속)']] as [Tab, string][]) {
    const b = h('button', k === tab ? 'tab on' : 'tab', label);
    b.onclick = () => { history.replaceState(null, '', `#${k}`); showSlots(k); };
    tabs.append(b);
  }
  head.append(h('h1', '', "Heaven's Manual 관리자"), tabs,
    h('p', 'sub', tab === 'portraits'
      ? '대화할 때 크게 서는 그림입니다. 세로로 긴 상반신 그림(약 2:3)이 잘 어울립니다. 저장하면 1분 안에 게임에 반영됩니다.'
      : '게임 화면 속 작은 도트 그림입니다. 지금 그림을 내려받아 그 위에 손질한 뒤, 같은 크기의 투명 PNG로 올려 주세요. 크기가 1px이라도 다르면 받지 않습니다 (발 위치와 다른 그림과의 비율이 어긋나기 때문).'));
  const out = h('button', '', '나가기');
  out.onclick = () => { sessionStorage.removeItem(KEY_STORE); key = ''; showLogin(); };
  head.appendChild(out);
  root.appendChild(head);
  const grid = h('div', tab === 'sprites' ? 'grid dots' : 'grid');
  for (const slot of PORTRAIT_SLOTS) {
    if (isSprite(slot) !== (tab === 'sprites')) continue;
    grid.appendChild(isSprite(slot) ? dotCard(slot) : slotCard(slot));
  }
  root.appendChild(grid);
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
      const m = w === spec.w * 2 ? 2 : 1;
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
    size.innerHTML = `필요한 크기 <b>${spec.w}×${spec.h}px</b> 또는 2배 <b>${spec.w * 2}×${spec.h * 2}px</b> · 배경 투명 PNG<br><span class="hint2">2배로 그리면 게임 속 크기는 같고, 휴대폰·고해상도 화면에서 두 배 섬세하게 보입니다</span>${spec.foot ? `<br>발 기준점: 왼쪽에서 ${spec.foot[0]}px, 위에서 ${spec.foot[1]}px (2배면 ${spec.foot[0] * 2}, ${spec.foot[1] * 2}) · 빨간 십자` : '<br>그림의 왼쪽 위가 지금 그림과 같은 자리에 놓입니다'}`;
    const u = overrides[slot];
    current = u ? await asCanvas(u).catch(() => spec!.canvas) : spec.canvas;
    paint(current, current.width, current.height);
    status.textContent = u ? '바꾼 그림을 쓰는 중' : '게임이 구운 그림을 쓰는 중';
    actions.innerHTML = '';
    actions.append(pick, down, down2);
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
  pick.onclick = () => file.click();
  file.onchange = async () => {
    const f = file.files?.[0];
    file.value = '';
    if (!f || !spec) return;
    if (f.type !== 'image/png') { status.textContent = 'PNG 파일만 올릴 수 있습니다 (투명 배경이 필요해서).'; return; }
    let c: HTMLCanvasElement;
    try { c = await asCanvas(f); } catch { status.textContent = '이 파일은 열 수 없습니다.'; return; }
    const k = c.width === spec.w && c.height === spec.h ? 1 : c.width === spec.w * 2 && c.height === spec.h * 2 ? 2 : 0;
    if (!k) {
      status.textContent = `크기가 다릅니다: 올린 그림 ${c.width}×${c.height}px, 필요한 크기 ${spec.w}×${spec.h}px 또는 ${spec.w * 2}×${spec.h * 2}px`;
      return;
    }
    pending = f;
    paint(c, c.width, c.height);
    status.textContent = `미리보기 · ${c.width}×${c.height}px · 크기 맞음${k === 2 ? ' (2배)' : ''}`;
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
