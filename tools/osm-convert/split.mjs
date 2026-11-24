// 19차: 큰 수쿰빗 존(나나–아속–프롬퐁 OSM 전체)을 대로를 따라 여러 구역으로 자른다
// node tools/osm-convert/split.mjs tools/osm-convert/source/bkk-sukhumvit-full.json apps/web/public/zones/
//  (원본 = convert.mjs 로 만든 전체 지도. 게임에는 싣지 않는다)
//  - 구역 = 수쿰빗 대로를 가운데 둔 띠 (위아래 ±HALF칸). 띠 바깥 가장자리는 빽빽한 건물 숲으로 막는다
//  - 구역마다 대로가 같은 줄(가운데)에 오게 맞춘다 → 구역을 이어 걸으면 곧은 길
//  - 골목과 골목을 잇는 뒷길(대로와 나란한 좁은 길)을 위아래로 하나씩 낸다 (한 길로만 들어갔다 나오는 미로가 되지 않게)
//  - 공원 연못 위 보행로는 건널목(흰 줄)이 아니라 다리 (walk)
//  - 대부분의 상가 건물은 3~4층 높이로 (콘도·호텔·사무용 빌딩만 높게)
import { readFileSync, writeFileSync } from 'node:fs';

const [inFile, outDir] = process.argv.slice(2);
const full = JSON.parse(readFileSync(inFile, 'utf8'));
const { W, H, codes, types } = full;
const T = Object.fromEntries(types.map((t, k) => [t, k]));
const tiles = new Uint8Array(W * H);
for (let k = 0; k < W * H; k++) tiles[k] = codes.indexOf(full.tiles[k]);
const at = (i, j) => (i < 0 || j < 0 || i >= W || j >= H ? T.void : tiles[j * W + i]);
const hash = (n) => { let h = 2166136261; for (const ch of String(n)) h = Math.imul(h ^ ch.charCodeAt(0), 16777619); return (h >>> 0) / 4294967295; };

// ── 대로 가운데 줄: 열마다 중앙분리대 줄의 가운데, 없으면 이웃 열에서 메운 뒤 부드럽게
const cRaw = new Array(W).fill(NaN);
for (let i = 0; i < W; i++) {
  const js = [];
  for (let j = 0; j < H; j++) if (tiles[j * W + i] === T.median) js.push(j);
  if (js.length) cRaw[i] = (js[0] + js[js.length - 1]) / 2;
}
for (let i = 0; i < W; i++) if (Number.isNaN(cRaw[i])) {
  let a = i, b = i;
  while (a > 0 && Number.isNaN(cRaw[a])) a--;
  while (b < W - 1 && Number.isNaN(cRaw[b])) b++;
  cRaw[i] = Number.isNaN(cRaw[a]) ? cRaw[b] : Number.isNaN(cRaw[b]) ? cRaw[a] : cRaw[a] + ((cRaw[b] - cRaw[a]) * (i - a)) / Math.max(1, b - a);
}
const center = cRaw.map((_, i) => { let s = 0, n = 0; for (let k = i - 20; k <= i + 20; k++) if (k >= 0 && k < W) { s += cRaw[k]; n++; } return s / n; });

// ── 구역 (OSM에서 찾은 실제 소이 위치: 1@143 2@181 4@200 3@222 나나플라자@264 5@267 6@326 7@329 BTS나나@329 9@343 8@365 11@372 13@406 10@427 15@450 12@459 17@487
//    19@519 14@542 BTS아속@548 터미널21@550 소이카우보이@624 16@611 23@647 18@657 25@678 27@712 20@712 29@754 22@763 31@799 33@843 35@914 벤짜시리공원@915 엠포리움@935 BTS프롬퐁@964 24@965 37@982 39@991)
const PLAN = [
  { id: 'bkk-nana', a: 190 },
  { id: 'bkk-soi8-17', a: 354 },
  { id: 'bkk-asok', a: 503 },
  { id: 'bkk-soi20-33', a: 695 },
  { id: 'bkk-phromphong', a: 870 },
];
const AP = 20; // 구역 동서 끝 너머로 보이는 실제 거리 (걸을 수는 없다): 이웃 구역·더 먼 도시가 이어져 보이게
const APJ = 12; // 위아래 끝 너머 건물 숲
const END = 1012;
const HALF = 74; // 대로 가운데에서 위아래로 74칸 (약 220 m)
const FOREST = 7; // 가장자리 건물 숲 두께
const LANE = 50; // 뒷길: 대로 가운데에서 50칸 (약 150 m)
// 자르는 열은 소이(골목)를 피해 ±6칸 안에서 골목 칸이 가장 적은 곳으로
const soiCount = (i, c) => { let n = 0; for (let j = Math.round(c) - HALF; j <= Math.round(c) + HALF; j++) if (Math.abs(j - c) > 12 && at(i, j) === T.soi) n++; return n; };
for (const z of PLAN) {
  let best = z.a, bn = 1e9;
  for (let d = -6; d <= 6; d++) { const n = soiCount(z.a + d, center[z.a + d]) + soiCount(z.a + d + 1, center[z.a + d]); if (n < bn) { bn = n; best = z.a + d; } }
  z.a = best;
}
PLAN.forEach((z, k) => { z.b = k + 1 < PLAN.length ? PLAN[k + 1].a : END; });

const CODES = codes;
const ROADS = new Set([T.road, T.median, T.cross]);
const summary = [];
for (const [zk, Z] of PLAN.entries()) {
  let cs = 0;
  for (let i = Z.a; i < Z.b; i++) cs += center[i];
  const cz = Math.round(cs / (Z.b - Z.a));
  // 그려지는 범위 = 걷는 범위 + 둘레(AP·APJ). 걷는 범위: i ∈ [AP, AP + (b−a)), j ∈ [APJ, APJ + 2·HALF + 1)
  const a = Z.a - AP, b = Z.b + AP, Wz = b - a;
  const top = cz - HALF - APJ, Hz = (HALF * 2 + 1) + APJ * 2;
  const C = HALF + APJ; // 지역 좌표에서 대로 가운데 줄
  const lim = { i0: AP, i1: AP + (Z.b - Z.a), j0: APJ, j1: APJ + HALF * 2 + 1 };
  const tz = new Uint8Array(Wz * Hz);
  for (let j = 0; j < Hz; j++) for (let i = 0; i < Wz; i++) tz[j * Wz + i] = at(a + i, top + j);
  const get = (i, j) => (i < 0 || j < 0 || i >= Wz || j >= Hz ? T.void : tz[j * Wz + i]);
  const put = (i, j, t) => { if (i >= 0 && j >= 0 && i < Wz && j < Hz) tz[j * Wz + i] = t; };
  // 공원 연못 위 보행로 = 다리 (건널목 흰 줄이 아니게): 차도 2칸 안에 없는 건널목은 보도로
  for (let j = 0; j < Hz; j++) for (let i = 0; i < Wz; i++) {
    if (get(i, j) !== T.cross) continue;
    let nearRoad = false;
    for (let dj = -2; dj <= 2 && !nearRoad; dj++) for (let di = -2; di <= 2; di++) if (get(i + di, j + dj) === T.road || get(i + di, j + dj) === T.median) { nearRoad = true; break; }
    if (!nearRoad) put(i, j, T.walk);
  }
  // 건물 조각: 구역 안으로 자르고 (가장자리 숲 줄과 뒷길 줄은 비운다)
  const inForest = (j) => j < APJ + FOREST || j >= Hz - APJ - FOREST;
  const laneRows = new Set([C - LANE - 1, C - LANE, C + LANE, C + LANE + 1]);
  const out = [];
  const pushPiece = (p, i0, j0, w, d) => { if (w < 1 || d < 1) return null; const q = { ...p, i0, j0, w, d }; out.push(q); return q; };
  for (const p of full.buildings) {
    if (p.cat === 'ujusae') continue;
    let i0 = p.i0 - a, j0 = p.j0 - top, i1 = i0 + p.w, j1 = j0 + p.d;
    i0 = Math.max(0, i0); i1 = Math.min(Wz, i1); j0 = Math.max(APJ + FOREST, j0); j1 = Math.min(Hz - APJ - FOREST, j1);
    if (i1 <= i0 || j1 <= j0) continue;
    // 높이: 콘도·호텔·사무용 빌딩만 높게, 나머지 상가는 3~4층
    const tall = ['condo', 'hotel', 'office'].includes(p.cat) && p.h > 80;
    const h = tall ? p.h : Math.min(p.h, 58 + Math.round(hash(p.i0 * 7 + p.j0) * 18));
    // 뒷길 줄에서 위아래로 나눈다
    const cuts = [...laneRows].filter((r) => r >= j0 && r < j1).sort((x, y) => x - y);
    let s = j0;
    const parts = [];
    for (const r of cuts) { if (r > s) parts.push([s, r]); s = r + 1; }
    if (s < j1) parts.push([s, j1]);
    let big = null, bigA = 0;
    for (const [pj0, pj1] of parts) {
      const q = pushPiece({ ...p, h, pois: undefined, sign: undefined }, i0, pj0, i1 - i0, pj1 - pj0);
      if (q && q.w * q.d > bigA) { bigA = q.w * q.d; big = q; }
    }
    if (big) { if (p.pois) big.pois = p.pois; if (p.sign) big.sign = p.sign; }
  }
  // 바닥: 조각 아래는 건물(block), 조각이 사라진 자리(숲 줄·뒷길·잘린 끝)는 빈 땅
  for (let k = 0; k < tz.length; k++) if (tz[k] === T.block) tz[k] = T.lot;
  for (const q of out) for (let j = q.j0; j < q.j0 + q.d; j++) for (let i = q.i0; i < q.i0 + q.w; i++) tz[j * Wz + i] = T.block;
  // 뒷길: 대로와 나란한 2칸 골목. 물·차도는 건너뛴다
  for (const r of [C - LANE - 1, C - LANE, C + LANE, C + LANE + 1]) for (let i = 1; i < Wz - 1; i++) { const t = get(i, r); if (t === T.lot || t === T.park || t === T.block || t === T.walk) put(i, r, T.soi); }
  // 가장자리 건물 숲: 위아래 FOREST줄 + 구역 끝의 막힌 자리. 4~6칸 덩어리, 4~9층, 가끔 높은 탑
  const forest = [];
  const cols = ['#8f8a80', '#9a948a', '#a39e94', '#8c97a6', '#a9a3b4', '#9b968c', '#b5ab9c', '#7f8790'];
  const fillForest = (j0, j1) => {
    for (let i = 0; i < Wz;) {
      const w = 3 + Math.floor(hash(`${zk}w${i}${j0}`) * 4);
      const tall = hash(`${zk}t${i}${j0}`) < 0.18;
      const h = tall ? 150 + Math.round(hash(`${zk}h${i}`) * 140) : 62 + Math.round(hash(`${zk}h${i}${j0}`) * 70);
      const ww = Math.min(w, Wz - i);
      forest.push({ i0: i, j0, w: ww, d: j1 - j0, h, cat: tall ? 'condo' : 'generic', color: cols[Math.floor(hash(`${zk}c${i}${j0}`) * cols.length)], forest: 1 });
      for (let j = j0; j < j1; j++) for (let ii = i; ii < i + ww; ii++) put(ii, j, T.block);
      i += ww;
    }
  };
  fillForest(0, APJ + FOREST);
  fillForest(Hz - APJ - FOREST, Hz);
  // ── 이어짐: 대로에서 걸어서 못 가는 땅 덩어리는 가장 가까운 길로 뚫어 잇는다 (작은 건 건물 사이 마당이라 그대로)
  const pass = (t) => t === T.lot || t === T.park || t === T.walk || t === T.soi || t === T.road || t === T.median || t === T.cross;
  const reach = new Uint8Array(Wz * Hz);
  const flood = () => {
    reach.fill(0);
    const q = [];
    for (let i = lim.i0; i < lim.i1; i++) { const k = C * Wz + i; if (pass(tz[k])) { reach[k] = 1; q.push(k); } }
    while (q.length) { const k = q.pop(), i = k % Wz, j = (k - i) / Wz; for (const [da, db] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const ii = i + da, jj = j + db; if (ii < lim.i0 || jj < lim.j0 || ii >= lim.i1 || jj >= lim.j1) continue; const kk = jj * Wz + ii; if (!reach[kk] && pass(tz[kk])) { reach[kk] = 1; q.push(kk); } } }
  };
  let carved = 0;
  for (let round = 0; round < 40; round++) {
    flood();
    let pick = -1;
    const seen = new Uint8Array(Wz * Hz);
    for (let k = 0; k < Wz * Hz && pick < 0; k++) {
      { const ii = k % Wz, jj = (k - ii) / Wz; if (ii < lim.i0 || jj < lim.j0 || ii >= lim.i1 || jj >= lim.j1) continue; }
      if (reach[k] || seen[k] || !(tz[k] === T.soi || tz[k] === T.walk)) continue;
      const comp = [k]; seen[k] = 1;
      for (let n = 0; n < comp.length; n++) { const c = comp[n], i = c % Wz, j = (c - i) / Wz; for (const [da, db] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const ii = i + da, jj = j + db; if (ii < lim.i0 || jj < lim.j0 || ii >= lim.i1 || jj >= lim.j1) continue; const kk = jj * Wz + ii; if (!seen[kk] && !reach[kk] && pass(tz[kk])) { seen[kk] = 1; comp.push(kk); } } }
      if (comp.length >= 12) pick = comp[Math.floor(comp.length / 2)];
    }
    if (pick < 0) break;
    // 가장 가까운 닿는 칸 쪽으로 곧게 (건물 조각은 지운다)
    let i = pick % Wz, j = (pick - i) / Wz;
    let ti = -1, tj = -1, bd = 1e9;
    for (let k = 0; k < Wz * Hz; k++) if (reach[k] && (tz[k] === T.soi || tz[k] === T.walk || tz[k] === T.lot)) { const ii = k % Wz, jj = (k - ii) / Wz, d = Math.abs(ii - i) + Math.abs(jj - j); if (d < bd) { bd = d; ti = ii; tj = jj; } }
    if (ti < 0) break;
    while (i !== ti || j !== tj) {
      if (i !== ti) i += Math.sign(ti - i); else j += Math.sign(tj - j);
      if (inForest(j)) break;
      const k = j * Wz + i;
      if (tz[k] === T.block) {
        for (let n = out.length - 1; n >= 0; n--) { const q = out[n]; if (i >= q.i0 && i < q.i0 + q.w && j >= q.j0 && j < q.j0 + q.d) { for (let jj = q.j0; jj < q.j0 + q.d; jj++) for (let ii = q.i0; ii < q.i0 + q.w; ii++) tz[jj * Wz + ii] = T.lot; out.splice(n, 1); } }
      }
      if (tz[k] === T.lot || tz[k] === T.park) tz[k] = T.soi;
      if (tz[k] === T.water) tz[k] = T.walk;
    }
    carved++;
  }
  flood();
  // 우주새: 아속 구역에만 (전 세계에 하나)
  const shopB = full.buildings.find((p) => p.cat === 'ujusae');
  let door = null, hasShop = false;
  if (shopB && shopB.i0 - a >= lim.i0 && shopB.i0 + shopB.w - a <= lim.i1 && shopB.j0 - top >= APJ + FOREST && shopB.j0 + shopB.d - top < Hz - APJ - FOREST) {
    const q = { ...shopB, i0: shopB.i0 - a, j0: shopB.j0 - top };
    for (let n = out.length - 1; n >= 0; n--) { const o = out[n]; if (o.i0 < q.i0 + q.w && o.i0 + o.w > q.i0 && o.j0 < q.j0 + q.d && o.j0 + o.d > q.j0) out.splice(n, 1); }
    out.push(q);
    for (let j = q.j0; j < q.j0 + q.d; j++) for (let i = q.i0; i < q.i0 + q.w; i++) put(i, j, T.block);
    door = { i: full.door.i - a, j: full.door.j - top };
    hasShop = true;
  }
  if (!door) {
    // 우주새가 없는 구역의 첫 자리: 가운데 가까운 대로 남쪽 보도
    let bd = 1e9;
    for (let j = C + 2; j < C + 14; j++) for (let i = lim.i0 + 4; i < lim.i1 - 4; i++) if (get(i, j) === T.walk && reach[j * Wz + i]) { const d = Math.abs(i - Wz / 2) + Math.abs(j - C) * 2; if (d < bd) { bd = d; door = { i, j }; } }
  }
  // 소품
  const props = full.props.filter((p) => p.i >= a && p.i < b && p.j - top >= APJ + FOREST && p.j - top < Hz - APJ - FOREST).map((p) => ({ ...p, i: p.i - a, j: p.j - top })).filter((p) => get(p.i, p.j) !== T.block);
  // 차선 (convert.mjs 와 같은 규칙)
  const lanes = [];
  const medianRow = new Map();
  for (let j = 0; j < Hz; j++) for (let i = 0; i < Wz; i++) if (get(i, j) === T.median && !medianRow.has(i)) medianRow.set(i, j);
  for (let j = 0; j < Hz; j++) {
    let i = 0;
    while (i < Wz) {
      if (get(i, j) !== T.road && get(i, j) !== T.cross) { i++; continue; }
      let e = i;
      while (e + 1 < Wz && (get(e + 1, j) === T.road || get(e + 1, j) === T.cross)) e++;
      if (e - i + 1 >= 24) {
        const mid = Math.floor((i + e) / 2);
        const mj = medianRow.get(mid);
        const above = mj !== undefined ? j < mj : j % 2 === 0;
        lanes.push({ j, i0: i, i1: e, dir: above ? 1 : -1 });
      }
      i = e + 1;
    }
  }
  let tileStr = '';
  for (let k = 0; k < tz.length; k++) tileStr += CODES[tz[k]];
  const prev = zk > 0 ? PLAN[zk - 1].id : null, next = zk + 1 < PLAN.length ? PLAN[zk + 1].id : null;
  const zone = {
    v: 2, id: Z.id, W: Wz, H: Hz, tileMeters: full.tileMeters, codes: CODES, types, tiles: tileStr,
    buildings: [...out, ...forest], props, lanes, door, spawn: door, shop: hasShop,
    // 구역 잇기: 걷는 범위(lim)의 서쪽·동쪽 끝으로 걸어 나가면 이웃 구역. origin = 전체 지도에서 이 구역 (0,0)의 자리 (구역 사이 좌표 맞추기)
    edges: { w: prev, e: next, c: C, ...lim }, origin: { i: a, j: top },
    attribution: full.attribution,
  };
  writeFileSync(`${outDir}/${Z.id}.json`, JSON.stringify(zone));
  summary.push(`${Z.id}: i ${Z.a}–${Z.b} (${Wz}×${Hz}), center ${cz}, pieces ${out.length}, forest ${forest.length}, lanes ${lanes.length}, carved ${carved}, shop ${hasShop}, door ${JSON.stringify(door)}, ${Math.round(JSON.stringify(zone).length / 1024)}KB`);
}
console.log(summary.join('\n'));
