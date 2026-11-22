// 우주새 상점 장면: 첫 화면이자 튜토리얼
import { characterPixels, parrotPixels, SPRITE_W, SPRITE_H, type Look } from './character.ts';
import { toCanvas } from './raster.ts';
import { t } from './i18n.ts';
import { bangkokClock, nightFactor } from './clock.ts';

export const MISS_HWANG: Look = { sex: 'f', build: 1, skin: 0, hair: 3, hairColor: 0, top: 0, bottom: 0, outfit: 'apron' };

type ItemKey = 'cola' | 'chips' | 'snack' | 'choco' | 'knife' | 'bat' | 'hammer';
const PRICES: Record<ItemKey, number> = { cola: 17, chips: 59, snack: 20, choco: 35, knife: 390, bat: 850, hammer: 290 };

/** 16×16 상품 아이콘 */
function icon(key: ItemKey): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = c.height = 16;
  const g = c.getContext('2d')!;
  const R = (x: number, y: number, w: number, h: number, col: string) => { g.fillStyle = col; g.fillRect(x, y, w, h); };
  if (key === 'cola') { R(6, 1, 4, 3, '#c9c4b8'); R(5, 4, 6, 11, '#3a1a12'); R(5, 7, 6, 4, '#b8432f'); R(6, 5, 1, 9, '#6a3a2a'); }
  else if (key === 'chips') { R(4, 1, 8, 2, '#d9d4c4'); R(4, 3, 8, 12, '#d6a032'); R(4, 6, 8, 4, '#7a3a24'); R(5, 3, 1, 12, '#f0c860'); }
  else if (key === 'snack') { R(3, 2, 10, 2, '#9a2a2a'); R(3, 4, 10, 9, '#c8473a'); R(3, 13, 10, 2, '#9a2a2a'); R(6, 6, 4, 4, '#f2d27a'); }
  else if (key === 'choco') { R(2, 5, 12, 7, '#5a3420'); R(2, 5, 5, 7, '#b8a06a'); R(8, 6, 1, 5, '#7a4a30'); R(11, 6, 1, 5, '#7a4a30'); }
  else if (key === 'knife') { R(2, 7, 9, 2, '#d9dde2'); R(3, 6, 7, 1, '#eef2f6'); R(11, 6, 4, 4, '#3a2418'); }
  else if (key === 'bat') { for (let i = 0; i < 12; i++) R(2 + i, 12 - i, i > 6 ? 3 : 2, i > 6 ? 3 : 2, '#b0844e'); R(1, 13, 2, 2, '#6b4a2c'); }
  else { R(7, 3, 2, 12, '#6b4a2c'); R(3, 2, 10, 3, '#5d6470'); R(3, 2, 2, 5, '#5d6470'); R(11, 1, 2, 2, '#5d6470'); }
  return c;
}

function drawShop(g: CanvasRenderingContext2D, crestUp: boolean, hwang: HTMLCanvasElement, parrots: HTMLCanvasElement[]) {
  const R = (x: number, y: number, w: number, h: number, col: string) => { g.fillStyle = col; g.fillRect(x, y, w, h); };
  // 벽: 세로 나무판
  for (let x = 0; x < 320; x += 12) R(x, 0, 12, 180, x % 24 ? '#2f221b' : '#35271f');
  for (let x = 0; x < 320; x += 12) R(x, 0, 1, 180, '#22180f');
  // 창문: 방콕의 지금 하늘
  const { h, m } = bangkokClock();
  const nf = nightFactor(h, m);
  const sky = nf > 0.7 ? '#141a33' : nf > 0.2 ? '#c9774a' : '#9cc4e4';
  R(236, 18, 64, 62, '#1a120d');
  R(240, 22, 56, 54, sky);
  const bld = nf > 0.7 ? '#232a40' : '#6d7686';
  R(242, 50, 10, 26, bld); R(254, 40, 12, 36, bld); R(268, 54, 9, 22, bld); R(279, 36, 15, 40, bld);
  if (nf > 0.5) for (let i = 0; i < 14; i++) R(244 + ((i * 7) % 48), 44 + ((i * 11) % 28), 2, 2, '#f2d58a');
  R(240, 64, 56, 3, '#8a8a84'); // BTS 선로
  R(240, 22, 56, 1, '#e8e0cc'); R(267, 22, 2, 54, '#1a120d'); R(240, 48, 56, 2, '#1a120d');
  // 선반 세 줄
  const shelfY = [34, 62, 90];
  let seed = 3;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  for (const y of shelfY) {
    R(10, y, 216, 4, '#5a3d2a'); R(10, y, 216, 1, '#7a5636'); R(10, y + 4, 216, 2, '#1c130d');
    for (let x = 14; x < 222; ) {
      const w = 5 + Math.floor(rnd() * 7), hh = 8 + Math.floor(rnd() * 14);
      const cols = ['#6b8f9a', '#a3473a', '#c9a23e', '#4f6b3e', '#7a6a8a', '#d9d4c6', '#3a2a5a'];
      const col = cols[Math.floor(rnd() * cols.length)];
      R(x, y - hh, w, hh, col);
      R(x, y - hh, 1, hh, 'rgba(255,255,255,0.25)');
      if (rnd() < 0.3) R(x + 1, y - hh - 2, w - 2, 2, '#2a1d15');
      x += w + 2 + Math.floor(rnd() * 4);
    }
  }
  // 촛불 하나, 깃털 하나 (가게의 기묘함)
  R(30, 104, 3, 8, '#e8dcc0'); R(31, 101, 1, 3, '#f2b84a');
  // 매달린 등
  R(159, 0, 2, 12, '#1a120d'); R(152, 12, 16, 8, '#6b4a2c'); R(155, 20, 10, 4, '#f2d27a');
  const glow = g.createRadialGradient(160, 26, 2, 160, 26, 70);
  glow.addColorStop(0, 'rgba(255,214,140,0.45)'); glow.addColorStop(1, 'rgba(255,214,140,0)');
  g.fillStyle = glow; g.fillRect(90, 0, 140, 100);
  // 미스 황
  g.drawImage(hwang, 124, 30);
  // 카운터
  R(0, 114, 320, 66, '#4a3020'); R(0, 114, 320, 4, '#7a5232'); R(0, 118, 320, 2, '#2a1a10');
  for (let x = 0; x < 320; x += 40) R(x, 120, 1, 60, '#3a2516');
  // 종과 장부
  R(92, 108, 10, 6, '#c9a23e'); R(95, 105, 4, 3, '#e0b437');
  R(60, 109, 22, 5, '#2a1a12'); R(61, 109, 20, 1, '#8a6a4a');
  // 앵무새
  g.drawImage(parrots[crestUp ? 1 : 0], 196, 76);
}

export function openShop(host: HTMLElement, visits: number, onExit: () => void) {
  host.innerHTML = '';
  host.className = 'scene shop';
  const L = t();
  const stage = document.createElement('div');
  stage.className = 'shop-stage';
  const cv = document.createElement('canvas');
  cv.width = 320; cv.height = 180;
  stage.appendChild(cv);
  const sign = document.createElement('div');
  sign.className = 'shop-sign';
  sign.textContent = L.shopName;
  stage.appendChild(sign);
  host.appendChild(stage);

  const box = document.createElement('div');
  box.className = 'dialog';
  box.innerHTML = `<div class="speaker"></div><div class="line"></div><div class="choices"></div><div class="wallet"></div>`;
  host.appendChild(box);
  (box.querySelector('.speaker') as HTMLElement).textContent = L.clerk;
  (box.querySelector('.wallet') as HTMLElement).textContent = `${L.wallet} ฿0`;
  const lineEl = box.querySelector('.line') as HTMLElement;
  const choices = box.querySelector('.choices') as HTMLElement;

  const g = cv.getContext('2d')!;
  g.imageSmoothingEnabled = false;
  const hwang = toCanvas(characterPixels(MISS_HWANG, 'front', 0), SPRITE_W, SPRITE_H);
  const parrots = [toCanvas(parrotPixels(false), 32, 40), toCanvas(parrotPixels(true), 32, 40)];
  let crest = false, alive = true;
  drawShop(g, crest, hwang, parrots);
  const timer = setInterval(() => {
    if (!alive) return;
    crest = Math.random() < 0.25;
    drawShop(g, crest, hwang, parrots);
  }, 900);

  let typing: ReturnType<typeof setInterval> | undefined;
  const say = (text: string, then?: () => void) => {
    if (typing) clearInterval(typing);
    lineEl.textContent = '';
    let n = 0;
    typing = setInterval(() => {
      n += 1;
      lineEl.textContent = text.slice(0, n);
      if (n >= text.length) { clearInterval(typing); typing = undefined; then?.(); }
    }, 28);
  };
  const keys: ItemKey[] = visits > 0 ? ['cola', 'chips', 'snack', 'choco', 'knife', 'bat', 'hammer'] : ['cola', 'chips', 'snack', 'choco'];
  const showItems = () => {
    choices.innerHTML = '';
    choices.className = 'choices items';
    for (const k of keys) {
      const b = document.createElement('button');
      b.className = 'item';
      const ic = icon(k);
      ic.className = 'icon';
      b.appendChild(ic);
      const label = document.createElement('span');
      label.textContent = L.items[k];
      const price = document.createElement('span');
      price.className = 'price';
      price.textContent = `฿${PRICES[k]}`;
      b.append(label, price);
      b.onclick = () => {
        choices.innerHTML = '';
        say(L.picked.replace('{item}', L.items[k]), () => setTimeout(() => say(L.goEarn, showExit), 500));
      };
      choices.appendChild(b);
    }
  };
  const showExit = () => {
    choices.className = 'choices';
    choices.innerHTML = '';
    const b = document.createElement('button');
    b.className = 'primary';
    b.textContent = L.exit;
    b.onclick = () => { alive = false; clearInterval(timer); if (typing) clearInterval(typing); onExit(); };
    choices.appendChild(b);
  };
  say(visits > 0 ? L.greetAgain : L.greet, showItems);
  return () => { alive = false; clearInterval(timer); if (typing) clearInterval(typing); };
}
