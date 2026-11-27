// 42차: 죽은 뒤 건너가는 장면 (화면 위에 덮는 것들 — 회색으로 바래기 · 천국의 문 · 화이트아웃 · 글 · 어둠 · 텔레비전 꺼짐).
// 세상 안에서 움직이는 것(넋이 떠오름 · 판초 악마 · 저승사자 · 짐승의 손)은 world.ts 가 맡는다.
// 배경 소리를 '끔'으로 두었으면 건너가는 동안의 음악 같은 소리(합창 · 저음)도 내지 않는다. 문 · 땅 · 파도 같은 소리는 효과음 설정을 따른다.
import type { Application } from 'pixi.js';
import { Rectangle } from 'pixi.js';
import * as sfx from './sfx.ts';
import { bgmMode } from './bgm.ts';

export interface Passage {
  /** 화면이 다 덮였다 (이때 세계를 바꾼다) */
  covered: Promise<void>;
  /** 새 세계가 섰다: 덮개를 걷는다 (다 걷히면 끝) */
  done(): Promise<void>;
}
const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
const music = () => bgmMode() !== 'off';
function layer(cls: string, html: string) {
  document.body.classList.add('passing');
  const el = document.createElement('div');
  el.className = 'passage ' + cls;
  el.innerHTML = html;
  document.body.appendChild(el);
  return el;
}

/** 지옥: 세상이 회색으로 바래고 멈춘다 → 끌려간다(take) → 글 한 줄 → 어둠. 걷히면 염소대왕의 방 바닥에서 눈을 뜬다 */
export function hellPassage(app: Application, take: () => Promise<void>, line: string): Passage {
  const cv = app.canvas as HTMLCanvasElement;
  const el = layer('p-hell', '<div class="p-vig"></div><p class="p-line"></p><div class="p-black"></div>');
  if (music()) sfx.hellDrone(16);
  cv.style.transition = 'filter 1.6s ease';
  requestAnimationFrame(() => { cv.style.filter = 'grayscale(1) contrast(1.06) brightness(0.82)'; el.classList.add('show'); });
  const covered = (async () => {
    await wait(1500);
    await take();
    el.querySelector('.p-line')!.textContent = line;
    el.classList.add('text');
    await wait(3000);
    el.classList.add('dark');
    await wait(1900);
    cv.style.transition = 'none';
    cv.style.filter = '';
  })();
  return {
    covered,
    async done() {
      await wait(600);
      el.classList.add('lift');
      await wait(2400);
      el.remove();
      document.body.classList.remove('passing');
    },
  };
}

/**
 * 천국: 몸 위로 빛기둥, 넋이 떠오른다(rise) → 하늘 위 천국의 문 앞으로 넋이 올라가고, 문이 활짝 열리며 빛이 쏟아진다 →
 * 하얗게 바랜 화면에 글 한 줄 → 걷히면 황색날개가 곁에 서 있다
 */
export function heavenPassage(rise: () => Promise<void>, soul: HTMLCanvasElement | null, line: string): Passage {
  const el = layer('p-heaven', '<canvas class="p-gate"></canvas><div class="p-white"></div><p class="p-line"></p>');
  const cvs = el.querySelector('canvas')!;
  const W = 240, H = 150;
  cvs.width = W; cvs.height = H;
  const g = cvs.getContext('2d')!;
  g.imageSmoothingEnabled = false;
  if (music()) sfx.heavenPad(13);
  let raf = 0, t0 = 0, shown = 0;
  const st = { soulY: H + 30, open: 0, glow: 0 };
  // 구름 덩이 (떠다닌다)
  const clouds = Array.from({ length: 26 }, (_, k) => ({ x: Math.random() * W, y: k < 12 ? H * 0.6 + Math.random() * H * 0.16 : H * 0.86 + Math.random() * H * 0.2, r: 8 + Math.random() * 16, v: 1 + Math.random() * 3, back: k < 12 }));
  const stars = Array.from({ length: 40 }, () => ({ x: Math.random() * W, y: Math.random() * H * 0.4, b: Math.random() }));
  const draw = (now: number) => {
    const t = (now - t0) / 1000;
    // 하늘: 위는 짙은 남빛, 지평선 쪽은 금빛 (계단처럼 띠를 지어 도트 하늘)
    const top = [16, 22, 52], mid = [70, 66, 118], low = [236, 204, 142];
    for (let y = 0; y < H; y++) {
      const k = y / H, band = Math.floor(k * 14) / 14;
      const a = band < 0.5 ? top : mid, b = band < 0.5 ? mid : low, q = band < 0.5 ? band / 0.5 : (band - 0.5) / 0.5;
      g.fillStyle = `rgb(${a.map((v, i) => Math.round(v + (b[i] - v) * q)).join(',')})`;
      g.fillRect(0, y, W, 1);
    }
    for (const s of stars) { g.fillStyle = `rgba(255,248,220,${0.3 + 0.5 * Math.abs(Math.sin(t * 1.3 + s.b * 9))})`; g.fillRect(Math.round(s.x), Math.round(s.y), 1, 1); }
    const gx = W / 2, gy = Math.round(H * 0.74);
    // 문 뒤에서 새어 나오는 빛줄기 (문이 열릴수록 넓고 밝게)
    if (st.open > 0) {
      g.save();
      g.globalCompositeOperation = 'lighter';
      for (let k = 0; k < 9; k++) {
        const a = -Math.PI / 2 + (k - 4) * 0.22 + Math.sin(t * 0.7 + k) * 0.03, L = 200;
        g.fillStyle = `rgba(255,236,170,${0.07 * st.open})`;
        g.beginPath(); g.moveTo(gx, gy - 40); g.lineTo(gx + Math.cos(a - 0.06) * L, gy - 40 + Math.sin(a - 0.06) * L); g.lineTo(gx + Math.cos(a + 0.06) * L, gy - 40 + Math.sin(a + 0.06) * L); g.fill();
      }
      g.restore();
    }
    // 뒤 구름
    for (const c of clouds) if (c.back) { const x = ((c.x + t * c.v) % (W + 40)) - 20; puff(g, x, c.y - 18, c.r, '#9a8eb4', '#c8bcd8'); }
    // 문: 흰 대리석 기둥 둘 · 금빛 기둥머리 · 반원 아치 · 문짝 둘 (열리면 안쪽으로 젖혀져 좁아진다) · 안은 눈부신 빛
    const DW = 46, DH = 56;
    g.fillStyle = '#fffbe8'; g.fillRect(gx - DW / 2, gy - DH, DW, DH);
    if (st.open > 0) { // 문 안의 빛이 번진다
      const rg = g.createRadialGradient(gx, gy - DH / 2, 4, gx, gy - DH / 2, 30 + st.glow * 260);
      rg.addColorStop(0, `rgba(255,255,248,${Math.min(1, 0.6 + st.glow)})`); rg.addColorStop(1, 'rgba(255,240,200,0)');
      g.fillStyle = rg; g.fillRect(0, 0, W, H);
    }
    const leaf = (side: -1 | 1) => {
      const w = (DW / 2) * (1 - st.open), x0 = gx + side * (DW / 2);
      if (w < 0.6) return;
      const x1 = x0 - side * w, sk = st.open * 6;
      g.fillStyle = '#e8dcc0';
      g.beginPath(); g.moveTo(x0, gy - DH); g.lineTo(x1, gy - DH + sk); g.lineTo(x1, gy - sk); g.lineTo(x0, gy); g.fill();
      g.fillStyle = '#c9a54a'; // 금 테 · 판 무늬
      for (const fy of [0.12, 0.5, 0.88]) g.fillRect(Math.min(x0, x1), Math.round(gy - DH * fy), Math.max(1, Math.abs(x1 - x0)), 1);
      g.fillRect(Math.round(x1) - (side > 0 ? 0 : 1), gy - DH + Math.round(sk), 1, DH - Math.round(sk * 2));
    };
    leaf(-1); leaf(1);
    for (const sx of [-1, 1]) { // 기둥
      const x = gx + sx * (DW / 2 + 6);
      g.fillStyle = '#f4efe4'; g.fillRect(Math.round(x - 6), gy - DH - 6, 12, DH + 6);
      g.fillStyle = '#d8d0c0'; g.fillRect(Math.round(x + 2 * sx), gy - DH - 6, 2, DH + 6);
      g.fillStyle = '#d8b24a'; g.fillRect(Math.round(x - 8), gy - DH - 10, 16, 5); g.fillRect(Math.round(x - 8), gy - 3, 16, 3);
    }
    g.strokeStyle = '#d8b24a'; g.lineWidth = 3; // 아치
    g.beginPath(); g.arc(gx, gy - DH - 8, DW / 2 + 9, Math.PI, 0); g.stroke();
    g.fillStyle = '#fff4c8'; g.fillRect(gx - 1, gy - DH - 8 - DW / 2 - 14, 3, 6); g.fillRect(gx - 3, gy - DH - 8 - DW / 2 - 12, 7, 2); // 꼭대기 장식
    // 넋: 하얗게 빛나는 작은 모습이 아래에서 문 앞까지 떠오른다
    if (soul) {
      const sh = 22, sw2 = Math.round((soul.width / soul.height) * sh);
      const sx = gx - sw2 / 2, sy = Math.round(st.soulY - sh);
      g.save(); g.globalCompositeOperation = 'lighter'; g.fillStyle = 'rgba(255,250,230,0.25)'; g.beginPath(); g.ellipse(gx, sy + sh / 2, sw2, sh * 0.75, 0, 0, Math.PI * 2); g.fill(); g.restore();
      g.globalAlpha = 0.92; g.drawImage(soul, sx, sy, sw2, sh); g.globalAlpha = 1;
    }
    // 앞 구름 (문 발치를 덮는다)
    for (const c of clouds) if (!c.back) { const x = ((c.x + t * c.v * 1.6) % (W + 40)) - 20; puff(g, x, c.y, c.r * 1.2, '#b8acd0', '#eee6f4'); }
    raf = requestAnimationFrame(draw);
  };
  const ease = (k: number) => 1 - (1 - k) * (1 - k);
  const covered = (async () => {
    await rise();
    t0 = performance.now();
    raf = requestAnimationFrame(draw);
    el.classList.add('show');
    const start = performance.now();
    const tl = (a: number, b: number) => Math.max(0, Math.min(1, (performance.now() - start - a) / (b - a)));
    let bell = false;
    await new Promise<void>((res) => {
      const step = () => {
        st.soulY = H + 30 - (H + 30 - (H * 0.74 + 4)) * ease(tl(300, 3000));
        st.open = ease(tl(2600, 4400));
        st.glow = tl(3800, 5200);
        if (!bell && performance.now() - start > 2600) { bell = true; sfx.gateOpen(); }
        if (performance.now() - start > 5000) { el.classList.add('white'); }
        if (performance.now() - start > 5800) { res(); return; }
        setTimeout(step, 30);
      };
      step();
    });
    cancelAnimationFrame(raf);
    el.querySelector('.p-line')!.textContent = line;
    el.classList.add('text');
    shown = performance.now();
  })();
  return {
    covered,
    async done() {
      await wait(Math.max(0, 3000 - (performance.now() - shown)));
      el.classList.add('lift');
      await wait(2200);
      el.remove();
      document.body.classList.remove('passing');
    },
  };
}
function puff(g: CanvasRenderingContext2D, x: number, y: number, r: number, shade: string, lit: string) {
  g.fillStyle = shade;
  g.beginPath(); g.ellipse(x, y + 2, r * 1.6, r * 0.6, 0, 0, Math.PI * 2); g.fill();
  g.fillStyle = lit;
  g.beginPath(); g.ellipse(x - r * 0.3, y - r * 0.15, r * 1.1, r * 0.55, 0, 0, Math.PI * 2); g.fill();
  g.beginPath(); g.ellipse(x + r * 0.5, y, r * 0.8, r * 0.45, 0, 0, Math.PI * 2); g.fill();
}

/** 경계: 영혼은 어디로도 가지 못한다 — 화면이 옛날 텔레비전처럼 꺼진다(가로줄 → 점 → 어둠). 어둠 속에서 파도 소리, 그리고 깨어난다. 글은 없다 */
export function borderPassage(app: Application): Passage {
  const el = layer('p-border', '<canvas class="p-snap"></canvas>');
  const snap = el.querySelector('canvas')!;
  try {
    const src = app.renderer.extract.canvas({ target: app.stage, frame: new Rectangle(0, 0, app.screen.width, app.screen.height) }) as HTMLCanvasElement;
    snap.width = src.width; snap.height = src.height;
    snap.getContext('2d')!.drawImage(src, 0, 0);
  } catch { /* 찍지 못하면 그냥 어둠으로 */ }
  sfx.tvOff();
  requestAnimationFrame(() => el.classList.add('off'));
  const covered = (async () => {
    await wait(900);
    sfx.waves(7);
    await wait(3600);
  })();
  return {
    covered,
    async done() {
      el.classList.add('lift');
      await wait(2600);
      el.remove();
      document.body.classList.remove('passing');
    },
  };
}
