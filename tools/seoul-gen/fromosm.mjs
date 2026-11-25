// 25차: 사용자가 올린 강남 실제 지도(.osm)로 서울 구역을 만든다.
//   node tools/osm-convert/convert.mjs 강남.osm /tmp/seoul-full.json --id seoul-gangnam --align "Teheran-ro" --keep-right
//   node tools/seoul-gen/fromosm.mjs /tmp/seoul-full.json apps/web/public/zones/seoul-gangnam.json
// - 강남역 둘레(우주새가 선 자리 가운데)를 한 구역으로 오려 낸다 (서울은 한 구역만)
// - 지도 가장 바깥(우주새에서 가장 먼 모서리)에 산비탈 달동네를 지어 넣고, 구불구불 골목 끝에 '내 집'
//   (달동네는 실제 지도에 없는 지어낸 곳 — 유저의 집)
import { readFileSync, writeFileSync } from 'node:fs';

const [inFile, outFile] = process.argv.slice(2);
const full = JSON.parse(readFileSync(inFile, 'utf8'));
const CW = 250, CH = 210;
const cx = full.door.i, cy = full.door.j;
const I0 = Math.max(0, Math.min(full.W - CW, cx - Math.round(CW * 0.55))), J0 = Math.max(0, Math.min(full.H - CH, cy - Math.round(CH * 0.5)));
const W = CW, H = CH;
const { codes, types } = full;
const T = Object.fromEntries(types.map((t, k) => [t, k]));
const tiles = new Uint8Array(W * H);
for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) tiles[j * W + i] = codes.indexOf(full.tiles[(j + J0) * full.W + i + I0]);
const get = (i, j) => (i < 0 || j < 0 || i >= W || j >= H ? -1 : tiles[j * W + i]);
const set = (i, j, t) => { if (i >= 0 && j >= 0 && i < W && j < H) tiles[j * W + i] = T[t]; };
let buildings = full.buildings.filter((b) => b.i0 >= I0 + 2 && b.j0 >= J0 + 2 && b.i0 + b.w <= I0 + W - 2 && b.j0 + b.d <= J0 + H - 2).map((b) => ({ ...b, i0: b.i0 - I0, j0: b.j0 - J0 }));
// 잘린 가장자리에 반쯤 걸친 건물 자리는 빈터로
for (const b of full.buildings) {
  const inside = b.i0 >= I0 + 2 && b.j0 >= J0 + 2 && b.i0 + b.w <= I0 + W - 2 && b.j0 + b.d <= J0 + H - 2;
  if (inside) continue;
  for (let j = b.j0; j < b.j0 + b.d; j++) for (let i = b.i0; i < b.i0 + b.w; i++) { const a = i - I0, c = j - J0; if (a >= 0 && c >= 0 && a < W && c < H && get(a, c) === T.block) set(a, c, 'lot'); }
}
let props = full.props.filter((p) => p.i >= I0 && p.j >= J0 && p.i < I0 + W && p.j < J0 + H).map((p) => ({ ...p, i: p.i - I0, j: p.j - J0 }));
const lanes = full.lanes.filter((l) => l.j >= J0 && l.j < J0 + H).map((l) => ({ ...l, j: l.j - J0, i0: Math.max(0, l.i0 - I0), i1: Math.min(W - 1, l.i1 - I0) })).filter((l) => l.i1 - l.i0 >= 20);
const door = { i: full.door.i - I0, j: full.door.j - J0 };

// ── 달동네: 우주새에서 가장 먼 모서리
let seed = 25112600;
const r = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
const ri = (a, b) => a + Math.floor(r() * (b - a + 1));
const pick = (a) => a[Math.floor(r() * a.length)];
const corners = [[0, 0], [W, 0], [0, H], [W, H]];
const [ci, cj] = corners.reduce((best, c) => (Math.hypot(c[0] - door.i, c[1] - door.j) > Math.hypot(best[0] - door.i, best[1] - door.j) ? c : best));
const sx = ci === 0 ? 1 : -1, sy = cj === 0 ? 1 : -1; // 모서리에서 안쪽으로
const DW = 50, DH = 40;
const DI0 = ci === 0 ? 0 : W - DW, DJ0 = cj === 0 ? 0 : H - DH;
const inDal = (i, j) => i >= DI0 && i < DI0 + DW && j >= DJ0 && j < DJ0 + DH;
buildings = buildings.filter((b) => !(inDal(b.i0, b.j0) || inDal(b.i0 + b.w - 1, b.j0 + b.d - 1)));
props = props.filter((p) => !inDal(p.i, p.j));
for (let j = DJ0; j < DJ0 + DH; j++) for (let i = DI0; i < DI0 + DW; i++) set(i, j, 'park');
// 골목 들머리: 달동네 안쪽 모서리 근처에서 가장 가까운 거리(골목·보도)
const inner = [ci === 0 ? DW : W - DW - 1, cj === 0 ? DH : H - DH - 1];
let start = null;
for (let rad = 0; rad < 40 && !start; rad++) for (let a = -rad; a <= rad && !start; a++) for (const b of [-rad, rad]) {
  for (const [i, j] of [[inner[0] + a, inner[1] + b], [inner[0] + b, inner[1] + a]]) {
    const t = get(i, j);
    if ((t === T.soi || t === T.walk) && !inDal(i, j)) { start = [i, j]; break; }
  }
}
// 골목 길: 들머리 → 달동네 안쪽 → 구불구불 모서리 쪽 끝 (내 집 문 앞)
const end = [ci === 0 ? 6 : W - 8, cj === 0 ? 6 : H - 8];
const path = [start];
const steps = 9;
for (let k = 1; k <= steps; k++) {
  const t = k / steps;
  const bx = start[0] + (end[0] - start[0]) * t, by = start[1] + (end[1] - start[1]) * t;
  const wob = Math.sin(k * 1.7) * 4 * (1 - Math.abs(t - 0.5));
  path.push([Math.round(bx + wob * sy), Math.round(by - wob * sx)]);
}
const pathTiles = new Set();
for (let k = 0; k < path.length - 1; k++) {
  const [a0, b0] = path[k], [a1, b1] = path[k + 1];
  const n = Math.max(Math.abs(a1 - a0), Math.abs(b1 - b0)) * 2 || 1;
  for (let s = 0; s <= n; s++) {
    const i = Math.round(a0 + ((a1 - a0) * s) / n), j = Math.round(b0 + ((b1 - b0) * s) / n);
    for (const [di, dj] of [[0, 0], [1, 0], [0, 1]]) { set(i + di, j + dj, 'soi'); pathTiles.add((j + dj) * W + i + di); }
  }
}
const occ = new Uint8Array(W * H);
for (const b of buildings) for (let j = b.j0; j < b.j0 + b.d; j++) for (let i = b.i0; i < b.i0 + b.w; i++) if (i >= 0 && j >= 0 && i < W && j < H) occ[j * W + i] = 1;
const free = (i0, j0, w, d) => { for (let j = j0; j < j0 + d; j++) for (let i = i0; i < i0 + w; i++) { if (!inDal(i, j) || get(i, j) !== T.park || occ[j * W + i]) return false; } return true; };
const addB = (i0, j0, w, d, h, cat, color, extra = {}) => {
  if (!free(i0, j0, w, d)) return null;
  for (let j = j0; j < j0 + d; j++) for (let i = i0; i < i0 + w; i++) { occ[j * W + i] = 1; set(i, j, 'block'); }
  const b = { i0, j0, w, d, h, cat, color, ...extra };
  buildings.push(b);
  return b;
};
// 내 집: 골목 끝 바로 옆 (문이 골목을 본다)
const HOME = { i0: end[0] - 1, j0: end[1] - 4, w: 3, d: 3 };
for (let j = HOME.j0; j < HOME.j0 + HOME.d; j++) for (let i = HOME.i0; i < HOME.i0 + HOME.w; i++) { set(i, j, 'park'); occ[j * W + i] = 0; }
addB(HOME.i0, HOME.j0, 3, 3, 46, 'home', '#9a8a74', { pois: [{ t: 'home', n: '내 집', nko: '내 집', nen: 'My home', nth: 'บ้านของฉัน' }], sign: 'left' });
const home = { i: HOME.i0 + 1, j: HOME.j0 + 3 };
set(home.i, home.j, 'soi');
const DALC = ['#7a5a4a', '#8a6a52', '#9a8a74', '#6e5e50', '#a8947a'];
for (const k of pathTiles) {
  const i = k % W, j = Math.floor(k / W);
  for (const [di, dj] of [[2, 0], [-3, 0], [0, 2], [0, -3], [2, 2], [-3, -3]]) {
    if (r() < 0.5) continue;
    const w = ri(2, 3), d = ri(2, 3);
    addB(i + di, j + dj, w, d, ri(32, 52), 'generic', pick(DALC), { hut: true });
  }
}
for (const k of pathTiles) { const i = k % W, j = Math.floor(k / W); if (r() < 0.07) props.push({ i, j, kind: r() < 0.5 ? 'pole' : 'plant' }); }
// 가장 바깥 둘레: 걸을 수 없다 (달동네 쪽은 수풀 벼랑)
for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) if (i < 2 || j < 2 || i >= W - 2 || j >= H - 2) set(i, j, inDal(i, j) ? 'park' : 'block');
const sa = start;
const json = {
  v: 2, id: 'seoul-gangnam', W, H, tileMeters: full.tileMeters, codes, types,
  tiles: Array.from(tiles, (t) => codes[t]).join(''),
  buildings, props, lanes, door, spawn: door, shop: true, city: 'seoul',
  homeAlley: { i0: sa[0] - 3, j0: sa[1] - 3, i1: sa[0] + 3, j1: sa[1] + 3 }, home,
  attribution: full.attribution,
};
writeFileSync(outFile, JSON.stringify(json));
console.log(`seoul-gangnam ${W}×${H} crop at ${I0},${J0}; buildings ${buildings.length} (dal ${buildings.filter((b) => b.hut).length}); lanes ${lanes.length}; door ${JSON.stringify(door)}; dal corner ${ci},${cj}; alley ${JSON.stringify(sa)} → home ${JSON.stringify(home)}`);
