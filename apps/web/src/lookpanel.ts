// 외형 고르기 창: 따로 확대한 그림 없이, 방 안(또는 거리)의 캐릭터가 바로 바뀐다
import { HAIR_STYLES, SKIN_COLORS, HAIR_COLORS, TOP_COLORS, BOTTOM_COLORS, BUILD_COUNT, type Look, type Outfit } from './character.ts';
import { t } from './i18n.ts';

export interface Region {
  id: string;
  label: string;
  ready: boolean;
}
export interface LookPanelOpts {
  title: string;
  confirm: string;
  outfits?: Outfit[]; // 고를 수 있는 차림 (둘 이상일 때만 줄이 생긴다)
  regions?: Region[];
  onChange: (look: Look) => void;
  onTurn: () => void;
  onDone: (look: Look, region?: string) => void;
  cancel?: string; // 34차: 환생 상담에서 그만두기
  onCancel?: () => void;
}

export function openLookPanel(host: HTMLElement, initial: Look, o: LookPanelOpts): () => void {
  const L = t();
  const look: Look = { ...initial };
  let regionIdx = 0;
  const ok = document.createElement('button');
  const el = document.createElement('div');
  el.className = 'look-panel';
  const title = document.createElement('h2');
  title.textContent = o.title;
  el.appendChild(title);

  type Row = { label: string; count: number; get: () => number; set: (v: number) => void; name: (v: number) => string; swatch?: string[]; off?: (v: number) => boolean };
  const rows: Row[] = [
    { label: L.sex, count: 2, get: () => (look.sex === 'f' ? 0 : 1), set: (v) => (look.sex = v === 0 ? 'f' : 'm'), name: (v) => (v === 0 ? L.female : L.male) },
    { label: L.build, count: BUILD_COUNT, get: () => look.build, set: (v) => (look.build = v), name: (v) => L.builds[v] },
    { label: L.skin, count: SKIN_COLORS.length, get: () => look.skin, set: (v) => (look.skin = v), name: (v) => `${v + 1}`, swatch: SKIN_COLORS },
    { label: L.hair, count: HAIR_STYLES.length, get: () => look.hair, set: (v) => (look.hair = v), name: (v) => L.hairs[v] },
    { label: L.hairColor, count: HAIR_COLORS.length, get: () => look.hairColor, set: (v) => (look.hairColor = v), name: (v) => `${v + 1}`, swatch: HAIR_COLORS },
    { label: L.top, count: TOP_COLORS.length, get: () => look.top, set: (v) => (look.top = v), name: (v) => `${v + 1}`, swatch: TOP_COLORS },
    { label: L.bottom, count: BOTTOM_COLORS.length, get: () => look.bottom, set: (v) => (look.bottom = v), name: (v) => `${v + 1}`, swatch: BOTTOM_COLORS },
  ];
  const outs = o.outfits ?? [];
  if (outs.length > 1) rows.push({ label: L.outfit, count: outs.length, get: () => Math.max(0, outs.indexOf(look.outfit ?? 'casual')), set: (v) => (look.outfit = outs[v]), name: (v) => (L.outfits as Record<string, string>)[outs[v]] });
  const regs = o.regions ?? [];
  if (regs.length) rows.push({ label: L.region, count: regs.length, get: () => regionIdx, set: (v) => (regionIdx = v), name: (v) => (regs[v].ready ? regs[v].label : `${regs[v].label} (${L.soon})`), off: (v) => !regs[v].ready });
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
      val.classList.toggle('off', !!r.off?.(v));
      const blocked = regs.length > 0 && !regs[regionIdx].ready;
      ok.disabled = blocked;
    };
    const change = (d: number) => { r.set((r.get() + d + r.count) % r.count); show(); o.onChange({ ...look }); };
    prev.onclick = () => change(-1);
    next.onclick = () => change(1);
    show();
    row.append(label, prev, val, next);
    el.appendChild(row);
  }
  const actions = document.createElement('div');
  actions.className = 'look-actions';
  const turn = document.createElement('button');
  turn.textContent = L.turn;
  turn.onclick = () => o.onTurn();
  ok.className = 'primary';
  ok.textContent = o.confirm;
  ok.onclick = () => { el.remove(); o.onDone({ ...look }, regs[regionIdx]?.id); };
  actions.append(turn);
  if (o.cancel && o.onCancel) { const no = document.createElement('button'); no.textContent = o.cancel; no.onclick = () => { el.remove(); o.onCancel!(); }; actions.append(no); }
  actions.append(ok);
  el.appendChild(actions);
  host.appendChild(el);
  o.onChange({ ...look });
  return () => el.remove();
}

/** 창이 가리는 크기 (넓은 화면은 오른쪽, 좁은 화면은 아래) */
export function lookPanelInsets(): { right: number; bottom: number } {
  return window.innerWidth >= 760 ? { right: 340, bottom: 0 } : { right: 0, bottom: Math.round(window.innerHeight * 0.48) };
}
