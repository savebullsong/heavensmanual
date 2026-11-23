// 관리자 페이지: 주요 인물 그림 교체
import './admin.css';
import { PORTRAIT_SLOTS, DEFAULT_PORTRAITS, type PortraitSlot } from './portraits.ts';

const NAMES: Record<PortraitSlot, { name: string; where: string }> = {
  'miss-hwang': { name: '미스 황', where: '현실 · 우주새 점원' },
  'yellow-wing': { name: '황색날개', where: '천국 · 우주새 점원' },
  hwanghon: { name: '황혼', where: '지옥 · 우주새 점원' },
  parrot: { name: '앵무새', where: '우주새 · 환생시키는 순간에만 말함' },
  luen: { name: '루엔', where: '천국 · 환생관' },
  pashar: { name: '파샤르', where: '지옥 1층 · 환생관' },
  'goat-king': { name: '염소대왕', where: '지옥 13층 · 최종 보스' },
  'sprite-miss-hwang': { name: '미스 황 (게임 속 도트)', where: '우주새 카운터 뒤에 서 있는 모습 · 투명 PNG, 높이 약 46px, 발 = 그림 아래 가운데' },
  'sprite-parrot': { name: '앵무새 (게임 속 도트)', where: '카운터 끝 횃대 · 투명 PNG, 높이 약 28px, 발 = 그림 아래 가운데' },
};

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
  card.append(h('h1', '', "Heaven's Manual 관리자"), h('p', 'sub', '주요 인물 그림을 바꾸는 곳입니다.'));
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

async function showSlots() {
  await loadOverrides();
  root.innerHTML = '';
  const head = h('header');
  head.append(h('h1', '', '인물 그림'), h('p', 'sub', '대화할 때 크게 서는 그림입니다. 세로로 긴 상반신 그림(약 2:3)이 잘 어울립니다. 저장하면 1분 안에 게임에 반영됩니다.'));
  const out = h('button', '', '나가기');
  out.onclick = () => { sessionStorage.removeItem(KEY_STORE); key = ''; showLogin(); };
  head.appendChild(out);
  root.appendChild(head);
  const grid = h('div', 'grid');
  for (const slot of PORTRAIT_SLOTS) grid.appendChild(slotCard(slot));
  root.appendChild(grid);
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
      pending = await shrink(f, slot);
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
async function shrink(f: File, slot?: string): Promise<Blob> {
  // 도트 그림은 줄이거나 다시 압축하지 않는다 (픽셀이 뭉개짐)
  if (slot?.startsWith('sprite-')) {
    if (f.type !== 'image/png') throw new Error('png only');
    return f;
  }
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
