// 캐릭터 만들기: 성별 · 체격 · 피부 · 헤어 · 머리색 · 상의 · 하의
import { characterPixels, SPRITE_W, SPRITE_H, HAIR_STYLES, SKIN_COLORS, HAIR_COLORS, TOP_COLORS, BOTTOM_COLORS, BUILD_COUNT, type Look, type Facing } from './character.ts';
import { toCanvas } from './raster.ts';
import { t } from './i18n.ts';

export function openCreate(host: HTMLElement, initial: Look, onDone: (look: Look) => void) {
  host.innerHTML = '';
  host.className = 'scene create';
  const L = t();
  const look: Look = { ...initial };
  let facing: Facing = 'front';
  let frame = 0;

  const title = document.createElement('h1');
  title.textContent = L.createTitle;
  const preview = document.createElement('canvas');
  preview.width = SPRITE_W; preview.height = SPRITE_H;
  preview.className = 'preview';
  const panel = document.createElement('div');
  panel.className = 'options';
  const wrap = document.createElement('div');
  wrap.className = 'create-body';
  wrap.append(preview, panel);
  host.append(title, wrap);

  const draw = () => {
    const c = toCanvas(characterPixels(look, facing, frame), SPRITE_W, SPRITE_H);
    const g = preview.getContext('2d')!;
    g.clearRect(0, 0, SPRITE_W, SPRITE_H);
    g.drawImage(c, 0, 0);
  };

  type Row = { label: string; count: number; get: () => number; set: (v: number) => void; name: (v: number) => string; swatch?: string[] };
  const rows: Row[] = [
    { label: L.sex, count: 2, get: () => (look.sex === 'f' ? 0 : 1), set: (v) => (look.sex = v === 0 ? 'f' : 'm'), name: (v) => (v === 0 ? L.female : L.male) },
    { label: L.build, count: BUILD_COUNT, get: () => look.build, set: (v) => (look.build = v), name: (v) => L.builds[v] },
    { label: L.skin, count: SKIN_COLORS.length, get: () => look.skin, set: (v) => (look.skin = v), name: (v) => `${v + 1}`, swatch: SKIN_COLORS },
    { label: L.hair, count: HAIR_STYLES.length, get: () => look.hair, set: (v) => (look.hair = v), name: (v) => L.hairs[v] },
    { label: L.hairColor, count: HAIR_COLORS.length, get: () => look.hairColor, set: (v) => (look.hairColor = v), name: (v) => `${v + 1}`, swatch: HAIR_COLORS },
    { label: L.top, count: TOP_COLORS.length, get: () => look.top, set: (v) => (look.top = v), name: (v) => `${v + 1}`, swatch: TOP_COLORS },
    { label: L.bottom, count: BOTTOM_COLORS.length, get: () => look.bottom, set: (v) => (look.bottom = v), name: (v) => `${v + 1}`, swatch: BOTTOM_COLORS },
  ];
  for (const r of rows) {
    const row = document.createElement('div');
    row.className = 'opt';
    const label = document.createElement('span');
    label.className = 'opt-label';
    label.textContent = r.label;
    const prev = document.createElement('button');
    prev.textContent = '◀';
    prev.setAttribute('aria-label', `${r.label} −`);
    const val = document.createElement('span');
    val.className = 'opt-value';
    const next = document.createElement('button');
    next.textContent = '▶';
    next.setAttribute('aria-label', `${r.label} +`);
    const show = () => {
      const v = r.get();
      val.textContent = '';
      if (r.swatch) {
        const sw = document.createElement('i');
        sw.className = 'swatch';
        sw.style.background = r.swatch[v];
        val.appendChild(sw);
      } else val.textContent = r.name(v);
    };
    prev.onclick = () => { r.set((r.get() - 1 + r.count) % r.count); show(); draw(); };
    next.onclick = () => { r.set((r.get() + 1) % r.count); show(); draw(); };
    show();
    row.append(label, prev, val, next);
    panel.appendChild(row);
  }
  const actions = document.createElement('div');
  actions.className = 'create-actions';
  const turn = document.createElement('button');
  turn.textContent = L.turn;
  turn.onclick = () => { facing = facing === 'front' ? 'back' : 'front'; draw(); };
  const ok = document.createElement('button');
  ok.className = 'primary';
  ok.textContent = L.confirm;
  let alive = true;
  ok.onclick = () => { alive = false; onDone({ ...look }); };
  actions.append(turn, ok);
  panel.appendChild(actions);

  draw();
  const timer = setInterval(() => { if (!alive) { clearInterval(timer); return; } frame = (frame + 1) % 4; draw(); }, 160);
}
