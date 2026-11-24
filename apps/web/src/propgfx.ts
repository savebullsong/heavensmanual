// 거리의 작은 것들 (점으로 직접 그린다): 전봇대·산프라품(정령의 집)·세워 둔 오토바이·화분·쓰레기통·울타리
// 모두 1배 그림(거리·건물과 같은 밀도). 화면 근처만 그렸다가 멀어지면 버린다 (world.stream)
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
    // 식당 바깥 자리: 쇠 탁자 하나와 빨간(가끔 파란) 플라스틱 의자 넷, 탁자 위 양념통·물병
    const seat = v % 3 === 2 ? ['#2a5ac0', '#4a7ae0'] : ['#c8281e', '#e84a3a'];
    out = pic(56, 40, 28, 30, (R) => {
      R(8, 30, 40, 4, 'rgba(0,0,0,0.22)');
      const stool = (x: number, y: number) => { R(x, y - 8, 9, 3, seat[1]); R(x + 1, y - 5, 7, 2, seat[0]); R(x + 1, y - 3, 1, 4, seat[0]); R(x + 7, y - 3, 1, 4, seat[0]); R(x + 4, y - 3, 1, 3, seat[0]); };
      stool(6, 22); stool(38, 22);
      // 탁자: 은빛 판 + 다리
      R(14, 14, 28, 4, '#c8ccd0'); R(14, 14, 28, 1, '#e8ecf0'); R(14, 18, 28, 1, '#7a7e84');
      R(16, 19, 2, 9, '#8a8e94'); R(38, 19, 2, 9, '#8a8e94');
      R(20, 9, 3, 5, '#b8341e'); R(24, 10, 2, 4, '#d8c8a0'); R(27, 8, 3, 6, '#c8e0f0'); R(33, 10, 4, 4, '#e8e4da');
      stool(10, 34); stool(34, 34);
    });
  } else if (kind === 'pushcart') {
    // 노점 손수레: 유리 진열장(튀김·꼬치·과일), 아래 가스통, 바퀴 둘. 양산은 없다
    const goods = [['#d89a3a', '#b8701e'], ['#e84a6a', '#f0c040'], ['#8a5a2a', '#c8902a']][v % 3];
    out = pic(48, 52, 24, 44, (R) => {
      R(8, 44, 34, 4, 'rgba(0,0,0,0.25)');
      R(8, 26, 32, 14, '#9aa2aa'); R(8, 26, 32, 2, '#c8d0d8'); R(8, 39, 32, 1, '#5a6068');
      R(10, 30, 8, 9, '#3a5a8a'); R(11, 31, 2, 7, '#6a8ac0'); // 가스통
      R(22, 32, 16, 6, '#7a8088');
      R(10, 8, 28, 18, '#2a2e34'); R(11, 9, 26, 16, '#cfe4ec'); R(11, 9, 26, 2, '#f2fbff');
      for (let k = 0; k < 6; k++) R(13 + k * 4, 18 + (k % 2), 3, 3, goods[k % 2]);
      for (let k = 0; k < 5; k++) R(14 + k * 5, 13, 1, 5, '#8a6a3a'); // 꼬치
      R(8, 6, 32, 2, '#5a6068');
      if (o) R(40, 18, 6, 2, '#5a6068'); else R(2, 18, 6, 2, '#5a6068'); // 손잡이
      for (const x of [12, 34]) { R(x - 3, 40, 7, 7, '#1a1a1a'); R(x - 1, 42, 3, 3, '#6a6a6a'); }
    });
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
