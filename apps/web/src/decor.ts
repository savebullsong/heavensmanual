// 거리 꾸밈 (지도 파일에 넣지 않고, 존을 불러올 때 위치마다 같은 결과가 나오게 만든다)
// 전봇대와 전선 · 산프라품 · 세워 둔 오토바이 · 가게 앞 화분 · 식당 앞 플라스틱 의자 · 노점 손수레 · 쓰레기통. 걸음을 막지 않는다
import { tileAt, type Zone, type Prop, type Building } from './zone.ts';
import { mainPoi, kindOf } from './names.ts';

export interface Decor { props: Prop[]; wires: [number, number, number, number][] }

const h01 = (a: number, b: number, c = 0) => {
  let h = (a * 374761393 + b * 668265263 + c * 1013904223) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
};

const made = new WeakMap<Zone, Decor>();
export function decorOf(z: Zone): Decor {
  const hit = made.get(z);
  if (hit) return hit;
  const props: Prop[] = [];
  const taken = new Set<number>();
  for (const p of z.props) for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) taken.add((p.j + dj) * z.W + p.i + di);
  const door = z.door;
  for (let dj = -3; dj <= 3; dj++) for (let di = -3; di <= 3; di++) taken.add((door.j + dj) * z.W + door.i + di); // 우주새 문 앞은 비워 둔다
  const put = (i: number, j: number, kind: Prop['kind'], o = 0, gap = 0) => {
    if (i < 1 || j < 1 || i >= z.W - 1 || j >= z.H - 1) return false;
    if (z.blocked[j * z.W + i]) return false;
    for (let dj = -gap; dj <= gap; dj++) for (let di = -gap; di <= gap; di++) if (taken.has((j + dj) * z.W + i + di)) return false;
    props.push({ i, j, kind, o });
    taken.add(j * z.W + i);
    return true;
  };
  // 1) 전봇대: 차도에 붙은 보도를 따라 드문드문
  const poles: [number, number][] = [];
  for (let j = 1; j < z.H - 1; j++)
    for (let i = 1; i < z.W - 1; i++) {
      if (tileAt(z, i, j) !== 'walk') continue;
      const byRoad = tileAt(z, i + 1, j) === 'road' || tileAt(z, i - 1, j) === 'road' || tileAt(z, i, j + 1) === 'road' || tileAt(z, i, j - 1) === 'road';
      if (!byRoad || h01(i, j, 1) > 0.11) continue;
      if (poles.some(([a, b]) => Math.abs(a - i) + Math.abs(b - j) < 7)) continue;
      if (put(i, j, 'pole', 0, 0)) poles.push([i, j]);
    }
  // 전선: 가까운 전봇대끼리 (5~12칸)
  const wires: [number, number, number, number][] = [];
  const byRow = new Map<number, [number, number][]>();
  for (const p of poles) { const k = Math.floor(p[1] / 16); (byRow.get(k) ?? byRow.set(k, []).get(k)!).push(p); }
  for (const [a, b] of poles) {
    let best: [number, number] | null = null, bd = 1e9;
    for (const k of [Math.floor(b / 16) - 1, Math.floor(b / 16), Math.floor(b / 16) + 1])
      for (const [c, d] of byRow.get(k) ?? []) {
        if (c + d <= a + b) continue;
        const dist = Math.hypot(c - a, d - b);
        if (dist >= 5 && dist <= 12 && dist < bd) { bd = dist; best = [c, d]; }
      }
    if (best) wires.push([a, b, best[0], best[1]]);
  }
  // 2) 건물 앞: 산프라품 · 오토바이 · 화분
  const front = (b: Building): [number, number, number, number] | null => {
    if (b.sign === 'right') return [b.i0 + b.w, b.j0, 0, 1]; // 앞 줄의 시작, 줄 방향
    if (b.sign === 'left') return [b.i0, b.j0 + b.d, 1, 0];
    return null;
  };
  z.buildings.forEach((b, k) => {
    const f = front(b);
    if (!f || b.cat === 'ujusae') return;
    const [fi, fj, si, sj] = f;
    const len = si ? b.w : b.d;
    const shop = !!mainPoi(b);
    const r1 = h01(b.i0, b.j0, 7), r2 = h01(b.j0, b.i0, 9), r3 = h01(k, b.i0, 11);
    // 산프라품: 건물 모서리 앞 (태국 건물 대부분이 하나씩 둔다 — 여기서는 열에 하나)
    if (r1 < 0.12) put(fi + (si ? 0 : 0), fj, 'spirit', 0, 1) || put(fi + si * (len - 1), fj + sj * (len - 1), 'spirit', 0, 1);
    if (!shop) return;
    // 오토바이: 가게 앞에 1~3대
    if (r2 < 0.35) {
      const n = 1 + Math.floor(r3 * 3);
      for (let m = 0; m < n; m++) {
        const t = Math.min(len - 1, 1 + m);
        put(fi + si * t + (sj ? 1 : 0), fj + sj * t + (si ? 1 : 0), 'moto', si ? 1 : 0, 0);
      }
    }
    // 화분
    if (r3 < 0.25) put(fi + si * Math.max(0, len - 1), fj + sj * Math.max(0, len - 1), 'plant', 0, 0);
    // 먹는 가게 앞: 빨간 플라스틱 의자와 쇠 탁자 (방콕 골목 식당의 바깥 자리)
    const t = kindOf(b);
    if (['restaurant', 'fast_food', 'food_court', 'cafe', 'bar', 'pub'].includes(t) && r2 > 0.4) {
      const m = Math.max(0, Math.floor(len / 2));
      put(fi + si * m + (sj ? 1 : 0), fj + sj * m + (si ? 1 : 0), 'stools', si ? 0 : 1, 0);
    }
  });
  // 3) 노점 손수레: 유리 진열장·가스통 (양산 없이). 큰길 보도에 드문드문
  for (let j = 1; j < z.H - 1; j++)
    for (let i = 1; i < z.W - 1; i++) {
      if (tileAt(z, i, j) !== 'walk' || h01(i, j, 5) > 0.006) continue;
      put(i, j, 'pushcart', h01(j, i, 6) < 0.5 ? 0 : 1, 2);
    }
  // 4) 쓰레기통: 보도 드문드문
  for (let j = 1; j < z.H - 1; j++)
    for (let i = 1; i < z.W - 1; i++) {
      if (tileAt(z, i, j) !== 'walk' || h01(i, j, 3) > 0.012) continue;
      put(i, j, 'bin', 0, 2);
    }
  const d = { props, wires };
  made.set(z, d);
  return d;
}
