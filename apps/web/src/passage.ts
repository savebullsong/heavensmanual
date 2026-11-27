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
 * 천국: 몸 위로 빛기둥, 넋이 떠오른다(rise) → 43차(42차 중간 요청): 그림 속 문이 아니라 '화면'이 문이 된다 —
 * 화면 한가운데에 눈부신 빛줄기가 갈라지고, 화면이 두 짝의 문처럼 양쪽으로 활짝 열리며 그 뒤의 빛 속으로 들어간다 →
 * 하얗게 바랜 화면에 글 한 줄 → 걷히면 황색날개가 곁에 서 있다
 */
export function heavenPassage(app: Application, rise: () => Promise<void>, line: string): Passage {
  const el = layer('p-heaven', '<div class="p-light"></div><canvas class="p-half l"></canvas><canvas class="p-half r"></canvas><i class="p-seam"></i><div class="p-white"></div><p class="p-line"></p>');
  el.classList.add('wait');
  if (music()) sfx.heavenPad(12);
  let shown = 0;
  const covered = (async () => {
    await rise();
    // 지금 화면을 찍어 왼쪽·오른쪽 두 짝으로 나눈다 (화면이 곧 문짝)
    const [L, R] = [el.querySelector('.p-half.l') as HTMLCanvasElement, el.querySelector('.p-half.r') as HTMLCanvasElement];
    try {
      const src = app.renderer.extract.canvas({ target: app.stage, frame: new Rectangle(0, 0, app.screen.width, app.screen.height) }) as HTMLCanvasElement;
      const hw = Math.ceil(src.width / 2);
      for (const [c, x0] of [[L, 0], [R, hw]] as const) {
        c.width = hw; c.height = src.height;
        c.getContext('2d')!.drawImage(src, x0, 0, hw, src.height, 0, 0, hw, src.height);
      }
    } catch { /* 찍지 못하면 빛만 */ }
    el.classList.remove('wait');
    el.classList.add('seam');           // 한가운데 빛줄기가 갈라진다
    await wait(900);
    sfx.gateOpen();
    el.classList.add('open');           // 화면이 두 짝으로 활짝 열린다
    await wait(2000);
    el.classList.add('white');
    await wait(800);
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
