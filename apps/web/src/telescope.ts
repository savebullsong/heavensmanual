// 54차 섬 가장자리 망원경: 구름 아래 현실 거리를 내려다본다. 그 순간 그 거리에 있는 다른 유저가 작게 보인다 (실시간 방을 듣기만 하고 나는 알리지 않는다).
//   거리는 지도 자료(타일 · 건물)를 작은 쿼터뷰로 그리고, 둥근 접안렌즈 · 놋쇠 테 · 흘러가는 구름 · 그 도시의 지금 시각(밤이면 창에 불)
import type { Zone } from './zone.ts';
import { TYPES } from './zone.ts';
import type { RemoteInfo, NetPos } from './world.ts';

export interface TeleText { teleTitle: string; teleNobody: string; teleSome: string; teleLooking: string; teleZones: Record<string, string>; teleHint: string }
interface Person { id: string; info: RemoteInfo; pos: NetPos; x: number; y: number }
const TI = Object.fromEntries(TYPES.map((t, k) => [t, k])) as Record<(typeof TYPES)[number], number>;
const TW = 14, TH = 7; // 작은 쿼터뷰 한 칸

function hourIn(zoneId: string) {
  try { return Number(new Date().toLocaleString('en-US', { timeZone: zoneId.startsWith('seoul') ? 'Asia/Seoul' : 'Asia/Bangkok', hour: 'numeric', hour12: false })) % 24; } catch { return 12; }
}
/** 거리 한 조각을 그린다 (초점 둘레 R칸) */
function drawStreet(z: Zone, fx: number, fy: number, night: boolean, size: number): HTMLCanvasElement {
  const c = document.createElement('canvas'); c.width = size; c.height = size;
  const g = c.getContext('2d')!;
  const R = 26;
  const ox = size / 2 - ((fx - fy) * TW) / 2, oy = size / 2 - ((fx + fy) * TH) / 2;
  const P = (i: number, j: number, z0 = 0): [number, number] => [ox + ((i - j) * TW) / 2, oy + ((i + j) * TH) / 2 - z0];
  g.fillStyle = night ? '#141820' : '#5a6a52'; g.fillRect(0, 0, size, size);
  const col: Record<number, string> = night
    ? { [TI.lot]: '#262a30', [TI.park]: '#1e3024', [TI.water]: '#142438', [TI.walk]: '#3a3a40', [TI.soi]: '#2e2e34', [TI.road]: '#1c1c22', [TI.median]: '#24302a', [TI.cross]: '#4a4a52', [TI.block]: '#2a2a30', [TI.hill]: '#2a2a26' }
    : { [TI.lot]: '#a8a294', [TI.park]: '#6a9a5a', [TI.water]: '#5a8ab0', [TI.walk]: '#c8c2b4', [TI.soi]: '#9a948a', [TI.road]: '#5a5a5e', [TI.median]: '#7a9a6a', [TI.cross]: '#e8e4dc', [TI.block]: '#8a8478', [TI.hill]: '#8a8068' };
  const i0 = Math.max(0, Math.floor(fx - R)), i1 = Math.min(z.W - 1, Math.ceil(fx + R)), j0 = Math.max(0, Math.floor(fy - R)), j1 = Math.min(z.H - 1, Math.ceil(fy + R));
  for (let s = i0 + j0; s <= i1 + j1; s++) for (let i = Math.max(i0, s - j1); i <= Math.min(i1, s - j0); i++) {
    const j = s - i, t = z.tiles[j * z.W + i];
    if (!t) continue;
    const [x, y] = P(i, j);
    g.fillStyle = col[t] ?? '#888'; g.beginPath(); g.moveTo(x, y); g.lineTo(x + TW / 2, y + TH / 2); g.lineTo(x, y + TH); g.lineTo(x - TW / 2, y + TH / 2); g.closePath(); g.fill();
    if (t === TI.road && (i + j) % 4 === 0 && !night) { g.fillStyle = 'rgba(255,255,255,0.25)'; g.fillRect(x - 1, y + TH / 2 - 0.5, 2, 1); }
  }
  // 건물: 먼 것부터 (상자 · 창)
  const bs = z.buildings.filter((b) => b.i0 + b.w >= i0 && b.i0 <= i1 && b.j0 + b.d >= j0 && b.j0 <= j1).sort((a, b) => a.i0 + a.j0 + a.w + a.d - (b.i0 + b.j0 + b.w + b.d));
  for (const b of bs) {
    const h = Math.min(90, Math.max(6, b.h * 0.22));
    const a = P(b.i0, b.j0 + b.d), bb = P(b.i0 + b.w, b.j0 + b.d), cc = P(b.i0 + b.w, b.j0);
    const base = night ? ['#3a3e48', '#2a2e36', '#22252c'] : ['#e8e2d6', '#c8c0b2', '#a8a092'];
    g.fillStyle = base[1]; g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(bb[0], bb[1]); g.lineTo(bb[0], bb[1] - h); g.lineTo(a[0], a[1] - h); g.closePath(); g.fill();
    g.fillStyle = base[2]; g.beginPath(); g.moveTo(bb[0], bb[1]); g.lineTo(cc[0], cc[1]); g.lineTo(cc[0], cc[1] - h); g.lineTo(bb[0], bb[1] - h); g.closePath(); g.fill();
    const t0 = P(b.i0, b.j0, h), t1 = P(b.i0 + b.w, b.j0, h), t2 = P(b.i0 + b.w, b.j0 + b.d, h), t3 = P(b.i0, b.j0 + b.d, h);
    g.fillStyle = base[0]; g.beginPath(); g.moveTo(t0[0], t0[1]); g.lineTo(t1[0], t1[1]); g.lineTo(t2[0], t2[1]); g.lineTo(t3[0], t3[1]); g.closePath(); g.fill();
    // 창 (밤엔 군데군데 불)
    for (let zz = 6; zz < h - 4; zz += 7) for (let q = 0.2; q < 0.95; q += 0.25) {
      const lx = a[0] + (bb[0] - a[0]) * q, ly = a[1] + (bb[1] - a[1]) * q - zz;
      const lit = night && ((b.i0 * 7 + b.j0 * 3 + zz + q * 10) % 5) < 2;
      g.fillStyle = lit ? '#ffd88a' : night ? '#1a1c22' : 'rgba(90,110,140,0.55)'; g.fillRect(Math.round(lx), Math.round(ly), 2, 3);
    }
  }
  return c;
}
/** 사람 하나: 작은 몸 (피부 · 윗옷 · 바지) · 이름 */
function drawPerson(g: CanvasRenderingContext2D, x: number, y: number, p: Person, step: number) {
  const cols = p.info.look?.cols ?? {};
  const skin = cols[1] ?? '#e0b48c', top = cols[3] ?? '#c8c0b0', bot = cols[4] ?? '#3a3a44';
  g.fillStyle = 'rgba(0,0,0,0.35)'; g.beginPath(); g.ellipse(x, y, 3, 1.2, 0, 0, Math.PI * 2); g.fill();
  const lg = Math.round(Math.sin(step) * 1);
  g.fillStyle = bot; g.fillRect(x - 2, y - 4, 1.5, 4 + lg); g.fillRect(x + 0.5, y - 4, 1.5, 4 - lg);
  g.fillStyle = top; g.fillRect(x - 2.5, y - 9, 5, 5);
  g.fillStyle = skin; g.beginPath(); g.arc(x, y - 11, 1.8, 0, Math.PI * 2); g.fill();
  const name = p.info.nick || p.info.name || '';
  if (name) { g.font = '600 9px system-ui, sans-serif'; g.textAlign = 'center'; g.lineWidth = 3; g.strokeStyle = 'rgba(0,0,0,0.7)'; g.strokeText(name, x, y - 16); g.fillStyle = '#fff6d8'; g.fillText(name, x, y - 16); }
}

export function openTelescope(o: { L: TeleText; zones: string[]; start: string; load: (id: string) => Promise<Zone>; peek: (id: string) => Promise<{ id: string; info: RemoteInfo; pos: NetPos }[]> }) {
  document.querySelector('.tele-panel')?.remove();
  const L = o.L;
  const el = document.createElement('div');
  el.className = 'store-panel shop-menu tele-panel';
  el.innerHTML = `<div class="menu-head"><b></b><button class="menu-close">✕</button></div><div class="tele-wrap"><canvas class="tele-view"></canvas></div><div class="tele-foot"><button class="tele-prev">◀</button><span class="tele-say"></span><button class="tele-next">▶</button></div><p class="tele-hint"></p>`;
  const head = el.querySelector('.menu-head b')!, say = el.querySelector('.tele-say')!;
  el.querySelector('.tele-hint')!.textContent = L.teleHint;
  const cv = el.querySelector('.tele-view') as HTMLCanvasElement;
  const css = Math.min(340, innerWidth - 56), dpr = Math.min(2, devicePixelRatio || 1);
  cv.width = Math.round(css * dpr); cv.height = Math.round(css * dpr); cv.style.width = cv.style.height = `${css}px`;
  let alive = true, idx = Math.max(0, o.zones.indexOf(o.start));
  (el.querySelector('.menu-close') as HTMLButtonElement).onclick = () => { alive = false; el.remove(); };
  let street: HTMLCanvasElement | null = null, people: Person[] = [], focus: [number, number] = [0, 0], fi = 0, zone: Zone | null = null, night = false;
  const clouds = Array.from({ length: 7 }, (_, k) => ({ x: Math.random(), y: Math.random(), r: 0.18 + Math.random() * 0.22, v: 0.008 + Math.random() * 0.012, a: 0.35 + (k % 3) * 0.12 }));
  const look = async () => {
    const id = o.zones[idx];
    head.textContent = `${L.teleTitle} · ${L.teleZones[id] ?? id}`;
    say.textContent = L.teleLooking; street = null; people = [];
    const [z, ps] = await Promise.all([o.load(id), o.peek(id)]);
    if (!alive || o.zones[idx] !== id) return;
    zone = z; night = (() => { const h = hourIn(id); return h >= 19 || h < 6; })();
    people = ps.map((p) => ({ ...p, x: p.pos.x, y: p.pos.y }));
    fi = 0; focus = people[0] ? [people[0].x, people[0].y] : [z.door.i, z.door.j];
    street = drawStreet(z, focus[0], focus[1], night, cv.width);
    say.textContent = people.length ? L.teleSome.replace('{n}', String(people.length)) : L.teleNobody;
  };
  (el.querySelector('.tele-prev') as HTMLButtonElement).onclick = () => { idx = (idx + o.zones.length - 1) % o.zones.length; void look(); };
  (el.querySelector('.tele-next') as HTMLButtonElement).onclick = () => { idx = (idx + 1) % o.zones.length; void look(); };
  cv.onclick = () => { if (!zone || people.length < 2) return; fi = (fi + 1) % people.length; focus = [people[fi].x, people[fi].y]; street = drawStreet(zone, focus[0], focus[1], night, cv.width); }; // 눌러서 다음 사람에게로
  const g = cv.getContext('2d')!;
  let last = performance.now(), step = 0;
  const frame = (now: number) => {
    if (!alive || !el.isConnected) return;
    const dt = Math.min(0.1, (now - last) / 1000); last = now; step += dt * 6;
    const S = cv.width, R = S / 2;
    g.clearRect(0, 0, S, S);
    g.save(); g.beginPath(); g.arc(R, R, R - 6 * dpr, 0, Math.PI * 2); g.clip();
    if (street) {
      g.drawImage(street, 0, 0);
      // 걷고 있는 사람은 가는 곳으로 천천히
      for (const p of people) {
        if (p.pos.t) { const [tx, ty] = p.pos.t, d = Math.hypot(tx - p.x, ty - p.y); if (d > 0.05) { const v = Math.min(d, (p.pos.v ?? 2.2) * dt); p.x += ((tx - p.x) / d) * v; p.y += ((ty - p.y) / d) * v; } }
        const ox = R - ((focus[0] - focus[1]) * TW) / 2, oy = R - ((focus[0] + focus[1]) * TH) / 2;
        drawPerson(g, ox + ((p.x - p.y) * TW) / 2, oy + ((p.x + p.y) * TH) / 2, p, p.pos.t ? step : 0);
      }
    } else { g.fillStyle = '#c8d8e8'; g.fillRect(0, 0, S, S); }
    for (const c of clouds) { // 구름 사이로
      c.x += c.v * dt; if (c.x > 1.4) { c.x = -0.4; c.y = Math.random(); }
      const gr = g.createRadialGradient(c.x * S, c.y * S, 0, c.x * S, c.y * S, c.r * S); gr.addColorStop(0, `rgba(255,255,255,${c.a})`); gr.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = gr; g.fillRect(0, 0, S, S);
    }
    const vg = g.createRadialGradient(R, R, R * 0.55, R, R, R); vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(10,8,4,0.75)'); g.fillStyle = vg; g.fillRect(0, 0, S, S);
    g.restore();
    g.lineWidth = 8 * dpr; const rg = g.createLinearGradient(0, 0, S, S); rg.addColorStop(0, '#f2dc98'); rg.addColorStop(0.5, '#b8902e'); rg.addColorStop(1, '#6a5018'); g.strokeStyle = rg; g.beginPath(); g.arc(R, R, R - 5 * dpr, 0, Math.PI * 2); g.stroke(); // 놋쇠 테
    g.strokeStyle = 'rgba(255,255,255,0.18)'; g.lineWidth = 1.2 * dpr; g.beginPath(); g.moveTo(R - 8 * dpr, R); g.lineTo(R + 8 * dpr, R); g.moveTo(R, R - 8 * dpr); g.lineTo(R, R + 8 * dpr); g.stroke(); // 십자선
    requestAnimationFrame(frame);
  };
  document.body.appendChild(el);
  requestAnimationFrame(frame);
  void look();
}
