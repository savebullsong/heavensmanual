// 거리의 작은 것들 (점으로 직접 그린다): 전봇대·산프라품(정령의 집)·세워 둔 오토바이·화분·쓰레기통·울타리
// 모두 1배 그림(거리·건물과 같은 밀도). 화면 근처만 그렸다가 멀어지면 버린다 (world.stream)
import { HEAVEN_PROPS, heavenProp } from './heavenworld.ts';
import { drawTableSet, drawCart } from './isoprop.ts';
export interface PropPic { canvas: HTMLCanvasElement; ax: number; ay: number; top?: [number, number] }

const cache = new Map<string, PropPic>();
const hash = (a: number, b: number, c = 0) => {
  let h = (a * 374761393 + b * 668265263 + c * 2147483647) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
};

function pic(w: number, h: number, ax: number, ay: number, draw: (R: (x: number, y: number, w: number, h: number, c: string) => void, g: CanvasRenderingContext2D) => void, top?: [number, number]): PropPic {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const g = c.getContext('2d')!;
  const R = (x: number, y: number, ww: number, hh: number, col: string) => { g.fillStyle = col; g.fillRect(Math.round(x), Math.round(y), Math.round(ww), Math.round(hh)); };
  draw(R, g);
  return { canvas: c, ax: ax / w, ay: ay / h, top };
}

/** kind: pole | spirit | moto | plant | bin | stools | pushcart | fence (o = 방향) · v = 변형 번호 */
export function streetProp(kind: string, v: number, o = 0, night = false, hell = false): PropPic {
  const key = `${kind}-${v}-${o}-${night ? 1 : 0}-${hell ? 1 : 0}`;
  const hit = cache.get(key);
  if (hit) return hit;
  if (HEAVEN_PROPS.has(kind)) { const hp = heavenProp(kind, v, o); cache.set(key, hp); return hp; } // 35차 천국 1층의 썬베드·파라솔·동물·분수
  let out: PropPic;
  if (kind === 'pole') {
    // 콘크리트 전봇대: 가로대·애자·변압기 통, 아래로 처진 전선 뭉치
    out = pic(40, 124, 20, 120, (R) => {
      R(17, 10, 6, 110, '#8f8a80'); R(17, 10, 2, 110, '#a9a49a'); R(22, 10, 1, 110, '#6e6a62');
      R(6, 16, 28, 3, '#5a5650'); R(8, 26, 24, 2, '#5a5650');
      for (const x of [7, 13, 26, 32]) R(x, 13, 2, 3, '#d8d2c4');
      if (v % 2 === 0) { R(24, 34, 9, 13, '#6e7a72'); R(24, 34, 9, 2, '#8a968e'); R(26, 47, 1, 4, '#2a2622'); }
      // 처진 전선 뭉치 (방콕 골목의 엉킨 전선)
      for (let k = 0; k < 5; k++) { const y = 30 + k * 3 + (v % 3); for (let x = 2; x < 17; x++) R(x, y + Math.round(Math.sin((x / 15) * Math.PI) * (2 + k)), 1, 1, k % 2 ? '#1e1c1a' : '#2c2a28'); }
      R(16, 56, 8, 6, '#2a2826'); R(15, 58, 10, 1, '#1a1816');
      R(14, 118, 12, 3, 'rgba(0,0,0,0.3)');
    }, [20, 12]);
  } else if (kind === 'spirit') {
    // 산프라품: 기둥 위의 작은 금빛 사당, 꽃목걸이·코끼리·물잔
    const gold = '#d9b04a', goldD = '#a8822a', red = '#b8322a';
    out = pic(30, 50, 15, 47, (R) => {
      R(4, 44, 22, 3, 'rgba(0,0,0,0.3)');
      R(12, 22, 6, 24, '#e8e2d4'); R(12, 22, 2, 24, '#f6f2e8');
      R(6, 20, 18, 3, '#e8e2d4');
      R(8, 9, 14, 11, gold); R(8, 9, 3, 11, '#ecc866'); R(19, 9, 3, 11, goldD);
      R(12, 13, 6, 7, red); R(13, 14, 4, 5, '#5a1a14');
      for (let k = 0; k < 5; k++) R(9 - k * 0 + k * 3, 8 - (k === 2 ? 4 : k % 2 ? 2 : 1), 2, k === 2 ? 4 : 2, gold);
      R(14, 0, 2, 5, gold);
      for (let k = 0; k < 7; k++) R(7 + k * 2.4, 21 + (k % 2), 2, 2, ['#f2a03a', '#e8e0f0', '#f05a8a'][k % 3]);
      if (v % 2) { R(5, 17, 3, 3, '#6a5a4a'); R(22, 18, 3, 2, '#c94a2a'); }
    });
  } else if (kind === 'moto') {
    // 세워 둔 스쿠터 (o = 0: i 방향, 1: j 방향)
    const body = ['#c9302a', '#2a5aa8', '#e8e4da', '#1e1e22', '#3a8a5a', '#e0a020'][v % 6];
    const flip = o === 1;
    out = pic(36, 24, 18, 21, (R) => {
      const X = (x: number, w: number) => (flip ? 36 - x - w : x);
      R(X(4, 28), 20, 28, 2, 'rgba(0,0,0,0.3)');
      R(X(5, 7), 14, 7, 7, '#141414'); R(X(7, 3), 16, 3, 3, '#5a5a5a');
      R(X(24, 7), 14, 7, 7, '#141414'); R(X(26, 3), 16, 3, 3, '#5a5a5a');
      R(X(10, 16), 10, 16, 5, body); R(X(12, 10), 8, 10, 3, '#222'); R(X(24, 4), 4, 4, 9, body);
      R(X(23, 6), 3, 6, 2, '#3a3a3a'); R(X(27, 2), 6, 2, 2, night ? '#fff2b0' : '#d8d8d0');
    });
  } else if (kind === 'plant') {
    // 가게 앞 화분 무리
    out = pic(34, 34, 17, 31, (R) => {
      R(4, 29, 26, 3, 'rgba(0,0,0,0.25)');
      const pots = 2 + (v % 2);
      for (let k = 0; k < pots; k++) {
        const x = 5 + k * 9, hgt = 8 + ((v + k) % 3) * 4, pot = ['#9a5a3a', '#6a6a6a', '#2a5a8a'][(v + k) % 3];
        R(x, 22, 8, 8, pot); R(x, 22, 8, 2, '#b8b0a0');
        for (let n = 0; n < 9; n++) R(x - 2 + hash(v, k, n) * 10, 22 - hash(k, n, v) * hgt, 3, 3, n % 3 ? '#4a7a32' : '#6a9a42');
      }
    });
  } else if (kind === 'bin') {
    const col = ['#2a7a4a', '#2a5aa8', '#c9a020'][v % 3];
    out = pic(18, 24, 9, 22, (R) => {
      R(2, 20, 15, 3, 'rgba(0,0,0,0.3)');
      R(4, 7, 10, 14, col); R(4, 7, 3, 14, 'rgba(255,255,255,0.18)'); R(3, 5, 12, 3, col); R(3, 5, 12, 1, '#1a1a1a');
      if (v % 2) { R(8, 2, 5, 4, '#e8e4da'); R(6, 3, 3, 3, '#3a3a3a'); }
    });
  } else if (kind === 'stools') {
    // 식당 바깥 자리: 쇠 탁자 하나와 빨간(가끔 파랑 · 초록) 플라스틱 의자 넷, 탁자 위 양념통 · 물병 · 그릇 — 52차 후속: 쿼터뷰 입체로 (정면 그림은 표지판처럼 보였다)
    out = pic(72, 52, 36, 38, (_R, g) => drawTableSet(g, 36, 38, 'street', v));
  } else if (kind === 'pushcart') {
    // 노점 손수레: 유리 진열장(꼬치 · 과일 · 튀김), 숯불 석쇠, 가스통, 자전거 바퀴, 손잡이. 양산은 없다 — o = 긴 쪽 방향(0: i · 1: j)
    out = pic(72, 80, 36, 62, (_R, g) => drawCart(g, 36, 62, o ? 1 : 0, 'street', (['skewer', 'fruit', 'fried'] as const)[v % 3], v));
  } else {
    // 울타리 한 칸: 끝이 뾰족한 말뚝 + 가로대 (지옥은 그을린 나무에 뼈빛 끝)
    const wood = hell ? '#2e221c' : '#6b4a30', woodL = hell ? '#4a3a2e' : '#8a6440', tip = hell ? '#d8ccb4' : '#8a6440';
    out = pic(68, 64, 34, 48, (R) => {
      const stake = (x: number, y: number, h: number) => { R(x, y - h, 4, h, wood); R(x, y - h, 1, h, woodL); R(x + 1, y - h - 3, 2, 3, tip); };
      if (o === 2) { stake(32, 50, 34); return; }
      // o = 0: i 방향 → 화면 오른쪽 아래로, o = 1: j 방향 → 왼쪽 아래로
      const dir = o === 0 ? 1 : -1;
      const rail = hell ? '#5a4636' : '#7a5636';
      for (const ry of [-11, -22]) for (let s = -32; s <= 32; s++) R(34 + dir * s - 1, 48 + s * 0.5 + ry, 2, 3, rail);
      for (let k = 0; k < 6; k++) { const t = (k - 2.5) / 6; stake(32 + dir * t * 64 - 2, 48 + t * 32 + 1, 28 + ((v + k) % 3) * 3); }
    });
  }
  cache.set(key, out);
  return out;
}
