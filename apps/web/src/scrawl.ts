// 54차 지하 감옥 벽 낙서: 손가락이나 마우스로 벽에 긁어 그리고(갇힐 때마다 하나), 다른 영혼들이 남긴 낙서를 게시판처럼 넘겨 본다.
//   획은 0~1000 × 0~700 정수 좌표로 서버에 (net.graffitiPost). 그리는 동안 남은 수감 시간이 위에 보인다.
import * as net from './net.ts';

export interface ScrawlText {
  scrawlTitle: string; scrawlHead: string; scrawlUnnamed: string; scrawlPost: string; scrawlClear: string; scrawlUndo: string;
  scrawlDone: string; scrawlDup: string; scrawlWaitMsg: string; scrawlFail: string; scrawlEmpty: string; scrawlMore: string; scrawlBack: string;
  scrawlLeft: string; scrawlNoInk: string; scrawlDel: string; scrawlOnce: string; scrawlDraw: string; scrawlView: string;
}
export interface ScrawlOpts {
  L: ScrawlText; mode: 'draw' | 'view'; stay: string; posted: boolean; admin: boolean; lang: string;
  leftMin: () => number | null;
  toast: (s: string, kind?: 'good') => void;
  onPosted: () => void;
}
const W = 1000, H = 700;
const COLS = ['#f2eee6', '#f2a8b8', '#f2d27a', '#9ad0f0', '#2a2622', '#b8402a'];
const WIDTHS = [5, 10, 20];

/** 돌벽 바탕: 차가운 흰 돌 · 줄눈 · 오래된 긁힘 (보는 사람마다 같은 무늬) */
function wall(g: CanvasRenderingContext2D, cw: number, ch: number) {
  const gr = g.createLinearGradient(0, 0, 0, ch); gr.addColorStop(0, '#8e8a82'); gr.addColorStop(1, '#6e6a63');
  g.fillStyle = gr; g.fillRect(0, 0, cw, ch);
  const sx = cw / W, sy = ch / H;
  let seed = 7; const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  g.strokeStyle = 'rgba(40,36,32,0.35)'; g.lineWidth = Math.max(1, 2 * sx);
  for (let r = 0; r < 6; r++) { // 돌 줄눈 (어긋나게 쌓은 벽돌)
    const y = (r + 1) * (H / 6) * sy; g.beginPath(); g.moveTo(0, y); g.lineTo(cw, y); g.stroke();
    for (let c = 0; c < 5; c++) { const x = ((c + (r % 2) * 0.5) * (W / 4.5)) * sx; g.beginPath(); g.moveTo(x, y - (H / 6) * sy); g.lineTo(x, y); g.stroke(); }
  }
  for (let k = 0; k < 900; k++) { g.fillStyle = rnd() < 0.5 ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.07)'; g.fillRect(rnd() * cw, rnd() * ch, 2 * sx + 1, 2 * sy + 1); }
  g.strokeStyle = 'rgba(230,226,218,0.12)'; g.lineWidth = Math.max(1, 1.5 * sx); // 오래된 날짜 세기 자국
  for (let k = 0; k < 5; k++) { const x0 = (60 + k * 190 + rnd() * 40) * sx, y0 = (40 + rnd() * 560) * sy; for (let q = 0; q < 5; q++) { g.beginPath(); g.moveTo(x0 + q * 9 * sx, y0); g.lineTo(x0 + q * 9 * sx + 3 * sx, y0 + 40 * sy); g.stroke(); } g.beginPath(); g.moveTo(x0 - 4 * sx, y0 + 30 * sy); g.lineTo(x0 + 44 * sx, y0 + 8 * sy); g.stroke(); }
}
/** 분필 획: 본 줄 + 가는 거친 줄 둘 (분필이 돌에 긁힌 결) */
function drawStroke(g: CanvasRenderingContext2D, s: net.Stroke, cw: number, ch: number) {
  const sx = cw / W, sy = ch / H, p = s.p;
  if (p.length < 2) return;
  g.lineCap = 'round'; g.lineJoin = 'round';
  const path = (ox: number, oy: number) => { g.beginPath(); g.moveTo(p[0] * sx + ox, p[1] * sy + oy); if (p.length === 2) g.lineTo(p[0] * sx + ox + 0.1, p[1] * sy + oy); for (let k = 2; k < p.length; k += 2) g.lineTo(p[k] * sx + ox, p[k + 1] * sy + oy); g.stroke(); };
  g.strokeStyle = COLS[s.c] ?? COLS[0];
  g.globalAlpha = 0.82; g.lineWidth = Math.max(1, s.w * sx); path(0, 0);
  g.globalAlpha = 0.35; g.lineWidth = Math.max(1, s.w * sx * 0.35); path(s.w * sx * 0.3, -s.w * sy * 0.2); path(-s.w * sx * 0.25, s.w * sy * 0.25);
  g.globalAlpha = 1;
}
function render(cv: HTMLCanvasElement, strokes: net.Stroke[]) {
  const g = cv.getContext('2d')!;
  wall(g, cv.width, cv.height);
  for (const s of strokes) drawStroke(g, s, cv.width, cv.height);
}
function makeCanvas() {
  const cv = document.createElement('canvas');
  const cssW = Math.min(560, innerWidth - 48), cssH = Math.round(cssW * H / W), dpr = Math.min(2, devicePixelRatio || 1);
  cv.width = Math.round(cssW * dpr); cv.height = Math.round(cssH * dpr);
  cv.style.width = `${cssW}px`; cv.style.height = `${cssH}px`;
  cv.className = 'scrawl-canvas';
  return cv;
}
const fmtDate = (iso: string, lang: string) => { try { return new Date(iso).toLocaleDateString(lang === 'ko' ? 'ko-KR' : lang === 'th' ? 'th-TH' : 'en-US', { month: 'short', day: 'numeric' }); } catch { return ''; } };

export function openScrawl(o: ScrawlOpts) {
  document.querySelector('.scrawl-panel')?.remove();
  const L = o.L;
  const el = document.createElement('div');
  el.className = 'store-panel shop-menu scrawl-panel';
  el.innerHTML = `<div class="menu-head"><b></b><button class="menu-close">✕</button></div><p class="store-line scrawl-line"></p><div class="menu-tabs store-tabs"></div><div class="menu-list scrawl-body"></div>`;
  el.querySelector('.menu-head b')!.textContent = L.scrawlTitle;
  (el.querySelector('.menu-close') as HTMLButtonElement).onclick = () => { clearInterval(tick); el.remove(); };
  const line = el.querySelector('.scrawl-line') as HTMLElement, body = el.querySelector('.scrawl-body') as HTMLElement, tabs = el.querySelector('.store-tabs')!;
  const bD = document.createElement('button'), bV = document.createElement('button');
  bD.textContent = L.scrawlDraw; bV.textContent = L.scrawlView; tabs.append(bD, bV);
  let mode = o.mode, posted = o.posted;
  const strokes: net.Stroke[] = [];
  const setLine = () => { const m = o.leftMin(); line.textContent = mode === 'draw' ? (m !== null ? `${L.scrawlLeft.replace('{m}', String(m))} · ${L.scrawlOnce}` : L.scrawlOnce) : ''; line.style.display = line.textContent ? '' : 'none'; };
  const tick = setInterval(() => { if (!el.isConnected) { clearInterval(tick); return; } setLine(); }, 15000);
  bD.onclick = () => { mode = 'draw'; draw(); }; bV.onclick = () => { mode = 'view'; draw(); };

  const drawPad = () => {
    const cv = makeCanvas(); cv.style.touchAction = 'none';
    render(cv, strokes);
    let col = 0, wid = 1, cur: net.Stroke | null = null;
    const pt = (e: PointerEvent): [number, number] => { const r = cv.getBoundingClientRect(); return [Math.round(Math.max(0, Math.min(1, (e.clientX - r.left) / r.width)) * W), Math.round(Math.max(0, Math.min(1, (e.clientY - r.top) / r.height)) * H)]; };
    cv.onpointerdown = (e) => { if (posted) return; cv.setPointerCapture(e.pointerId); const [x, y] = pt(e); cur = { c: col, w: WIDTHS[wid], p: [x, y] }; strokes.push(cur); render(cv, strokes); e.preventDefault(); };
    cv.onpointermove = (e) => {
      if (!cur) return;
      const [x, y] = pt(e), n = cur.p.length;
      if (Math.hypot(x - cur.p[n - 2], y - cur.p[n - 1]) < 5) return; // 점을 솎아 가볍게
      if (strokes.reduce((a, s) => a + s.p.length, 0) > 14000) return; // 한 벽에 너무 많이는 못 긁는다
      cur.p.push(x, y);
      const g = cv.getContext('2d')!; drawStroke(g, { ...cur, p: cur.p.slice(-4) }, cv.width, cv.height);
    };
    const end = () => { if (cur) { cur = null; render(cv, strokes); upd(); } };
    cv.onpointerup = end; cv.onpointercancel = end;
    const pal = document.createElement('div'); pal.className = 'scrawl-tools';
    const sw: HTMLButtonElement[] = [];
    COLS.forEach((c, k) => { const b = document.createElement('button'); b.className = 'scrawl-col'; b.style.background = c; b.onclick = () => { col = k; sw.forEach((q, n) => q.classList.toggle('on', n === col)); }; sw.push(b); pal.appendChild(b); });
    sw[0].classList.add('on');
    const ww: HTMLButtonElement[] = [];
    WIDTHS.forEach((wd, k) => { const b = document.createElement('button'); b.className = 'scrawl-w'; b.innerHTML = `<i style="width:${4 + k * 4}px;height:${4 + k * 4}px"></i>`; b.onclick = () => { wid = k; ww.forEach((q, n) => q.classList.toggle('on', n === wid)); }; ww.push(b); pal.appendChild(b); void wd; });
    ww[1].classList.add('on');
    const foot = document.createElement('div'); foot.className = 'scrawl-foot';
    const undo = document.createElement('button'); undo.textContent = L.scrawlUndo;
    const clr = document.createElement('button'); clr.textContent = L.scrawlClear;
    const post = document.createElement('button'); post.className = 'primary'; post.textContent = L.scrawlPost;
    const upd = () => { undo.disabled = clr.disabled = posted || !strokes.length; post.disabled = posted || !strokes.length; };
    undo.onclick = () => { strokes.pop(); render(cv, strokes); upd(); };
    clr.onclick = () => { strokes.length = 0; render(cv, strokes); upd(); };
    post.onclick = async () => {
      if (!strokes.length) { o.toast(L.scrawlNoInk); return; }
      post.disabled = true;
      const r = await net.graffitiPost(o.stay, strokes);
      if (r === 'ok') { posted = true; o.onPosted(); o.toast(L.scrawlDone, 'good'); mode = 'view'; draw(); return; }
      if (r === 'dup') { posted = true; o.onPosted(); }
      o.toast(r === 'dup' ? L.scrawlDup : r === 'wait' ? L.scrawlWaitMsg : L.scrawlFail);
      upd();
    };
    foot.append(undo, clr, post); upd();
    body.append(cv, pal, foot);
    if (posted) { const p = document.createElement('p'); p.className = 'bag-empty'; p.textContent = L.scrawlDup; body.insertBefore(p, cv); }
  };

  let loaded: net.GraffitiList['items'] = [], head: { authors: number; total: number } | null = null, more = true;
  const listView = async (append = false) => {
    if (!append) { body.innerHTML = ''; const w = document.createElement('p'); w.className = 'bag-empty'; w.textContent = '…'; body.appendChild(w); }
    const r = await net.graffitiList(append && loaded.length ? loaded[loaded.length - 1].id : undefined);
    if (mode !== 'view' || !el.isConnected) return;
    if (!r) { body.innerHTML = ''; const p = document.createElement('p'); p.className = 'bag-empty'; p.textContent = L.scrawlFail; body.appendChild(p); return; }
    head = { authors: r.authors, total: r.total };
    loaded = append ? loaded.concat(r.items) : r.items; more = r.items.length >= 40;
    paintList();
  };
  const paintList = () => {
    body.innerHTML = '';
    const h = document.createElement('p'); h.className = 'scrawl-head'; h.textContent = L.scrawlHead.replace('{a}', String(head?.authors ?? 0)).replace('{n}', String(head?.total ?? 0)); body.appendChild(h);
    if (!loaded.length) { const p = document.createElement('p'); p.className = 'bag-empty'; p.textContent = L.scrawlEmpty; body.appendChild(p); return; }
    loaded.forEach((it, k) => {
      const row = document.createElement('button'); row.className = 'scrawl-row';
      row.innerHTML = '<b></b><span></span>';
      row.querySelector('b')!.textContent = it.nick || L.scrawlUnnamed; row.querySelector('span')!.textContent = fmtDate(it.at, o.lang);
      row.onclick = () => void one(k);
      body.appendChild(row);
    });
    if (more) { const m = document.createElement('button'); m.className = 'scrawl-more'; m.textContent = L.scrawlMore; m.onclick = () => void listView(true); body.appendChild(m); }
  };
  const one = async (k: number) => {
    const it = loaded[k]; if (!it) return;
    body.innerHTML = '';
    const cap = document.createElement('p'); cap.className = 'scrawl-head'; cap.textContent = `${it.nick || L.scrawlUnnamed} · ${fmtDate(it.at, o.lang)}`;
    const cv = makeCanvas(); render(cv, []);
    const nav = document.createElement('div'); nav.className = 'scrawl-foot';
    const prev = document.createElement('button'); prev.textContent = '◀'; prev.disabled = k <= 0; prev.onclick = () => void one(k - 1);
    const back = document.createElement('button'); back.textContent = L.scrawlBack; back.onclick = () => paintList();
    const next = document.createElement('button'); next.textContent = '▶'; next.disabled = k >= loaded.length - 1; next.onclick = () => void one(k + 1);
    nav.append(prev, back, next);
    if (o.admin) { const del = document.createElement('button'); del.textContent = L.scrawlDel; del.onclick = async () => { if (await net.graffitiDelete(it.id)) { loaded.splice(k, 1); if (head) head.total--; paintList(); } }; nav.appendChild(del); }
    body.append(cap, cv, nav);
    const r = await net.graffitiGet(it.id);
    if (r && cv.isConnected) render(cv, r.strokes);
  };
  const draw = () => {
    bD.classList.toggle('on', mode === 'draw'); bV.classList.toggle('on', mode === 'view');
    setLine();
    body.innerHTML = '';
    if (mode === 'draw') drawPad(); else void listView();
  };
  document.body.appendChild(el);
  draw();
}
