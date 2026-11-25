// 24차: 서울 강남 한 구역 (우주새가 있는 곳) — 지도 자료 없이 강남대로 뒷골목을 본떠 짓는다.
// node tools/seoul-gen/gen.mjs apps/web/public/zones/seoul-gangnam.json
// 방콕과 다른 개성: 열 줄이 넘는 큰길(오른쪽 통행), 유리 빌딩 숲, 반듯한 바둑판 뒷골목의 먹자골목(고깃집·국밥·치킨·포차·노래방·PC방·학원·교회 붉은 십자가·모텔),
// 그리고 지도 가장 바깥(북서쪽 끝) 산비탈의 달동네 — 구불구불 좁은 골목 끝에 '내 집'.
import { writeFileSync } from 'node:fs';

const out = process.argv[2];
const W = 180, H = 150;
const CODES = ' .p~wsrmcb', TYPES = ['void', 'lot', 'park', 'water', 'walk', 'soi', 'road', 'median', 'cross', 'block'];
const T = Object.fromEntries(TYPES.map((t, k) => [t, k]));
const tiles = new Uint8Array(W * H).fill(T.lot);
let seed = 20261125;
const r = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
const ri = (a, b) => a + Math.floor(r() * (b - a + 1));
const pick = (a) => a[Math.floor(r() * a.length)];
const set = (i, j, t) => { if (i >= 0 && j >= 0 && i < W && j < H) tiles[j * W + i] = T[t]; };
const get = (i, j) => (i < 0 || j < 0 || i >= W || j >= H ? -1 : tiles[j * W + i]);
const rect = (i0, j0, i1, j1, t) => { for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) set(i, j, t); };

// ── 큰길 (강남대로 본뜸): 보도 4 · 차로 6 · 중앙분리대 2 · 차로 6 · 보도 4
const BJ = 66;
rect(0, BJ, W - 1, BJ + 3, 'walk');
rect(0, BJ + 4, W - 1, BJ + 9, 'road');
rect(0, BJ + 10, W - 1, BJ + 11, 'median');
rect(0, BJ + 12, W - 1, BJ + 17, 'road');
rect(0, BJ + 18, W - 1, BJ + 21, 'walk');
for (const ci of [40, 112, 160]) rect(ci, BJ + 4, ci + 3, BJ + 17, 'cross');
const lanes = [];
for (let j = BJ + 4; j <= BJ + 9; j++) lanes.push({ j, i0: 0, i1: W - 1, dir: -1 }); // 오른쪽 통행: 위 차로는 서쪽으로
for (let j = BJ + 12; j <= BJ + 17; j++) lanes.push({ j, i0: 0, i1: W - 1, dir: 1 });

// ── 뒷골목 바둑판 (3칸 너비, 조금씩 어긋나게)
const vN = [18, 38, 60, 84, 106, 128, 150, 170], hN = [20, 40, 56];
const vS = [12, 34, 58, 80, 102, 124, 146, 168], hS = [100, 118, 134];
for (const i of vN) rect(i, 4, i + 2, BJ - 1, 'soi');
for (const j of hN) rect(0, j, W - 1, j + 2, 'soi');
for (const i of vS) rect(i, BJ + 22, i + 2, H - 5, 'soi');
for (const j of hS) rect(0, j, W - 1, j + 2, 'soi');
// 큰길가 보도 앞 1칸 띠 (가게 입구)
rect(0, BJ - 1, W - 1, BJ - 1, 'walk'); rect(0, BJ + 22, W - 1, BJ + 22, 'walk');

// ── 달동네 (북서쪽 끝 산비탈): 바둑판을 지우고 수풀 비탈 위로 구불거리는 좁은 골목
const DAL = { i0: 0, j0: 0, i1: 46, j1: 36 };
rect(DAL.i0, DAL.j0, DAL.i1, DAL.j1, 'park');
const path = [[39, 40], [38, 34], [34, 30], [29, 27], [25, 21], [20, 17], [14, 13], [10, 9], [6, 6]];
const pathTiles = new Set();
for (let k = 0; k < path.length - 1; k++) {
  const [a0, b0] = path[k], [a1, b1] = path[k + 1];
  const n = Math.max(Math.abs(a1 - a0), Math.abs(b1 - b0)) * 2;
  for (let s = 0; s <= n; s++) {
    const i = Math.round(a0 + ((a1 - a0) * s) / n), j = Math.round(b0 + ((b1 - b0) * s) / n);
    for (const [di, dj] of [[0, 0], [1, 0], [0, 1]]) { set(i + di, j + dj, 'soi'); pathTiles.add((j + dj) * W + i + di); }
  }
}
// 지도 가장 바깥 둘레: 걸을 수 없는 벼랑 (달동네 쪽은 수풀)
for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) if (i < 2 || j < 2 || i >= W - 2 || j >= H - 2) set(i, j, i < DAL.i1 && j < DAL.j1 ? 'park' : 'block');

// ── 건물
const buildings = [];
const props = [];
const occ = new Uint8Array(W * H);
const free = (i0, j0, w, d) => { for (let j = j0; j < j0 + d; j++) for (let i = i0; i < i0 + w; i++) { const t = get(i, j); if (t !== T.lot && t !== T.park || occ[j * W + i]) return false; } return true; };
const take = (i0, j0, w, d) => { for (let j = j0; j < j0 + d; j++) for (let i = i0; i < i0 + w; i++) occ[j * W + i] = 1; };
const N = {
  food: [['청춘 고깃집', 'Youth BBQ', 'ร้านหมูย่างชองชุน', 'restaurant'], ['할매 순대국', "Grandma's Sundae Soup", 'ซุปซุนแดคุณยาย', 'restaurant'], ['바삭 치킨', 'Crispy Chicken', 'ไก่ทอดกรอบ', 'fast_food'], ['명동 칼국수', 'Myeongdong Noodles', 'บะหมี่มย็องดง', 'restaurant'],
    ['24시 해장국', '24h Hangover Soup', 'ซุปแก้แฮงค์ 24 ชม.', 'restaurant'], ['엄마 김밥', "Mom's Gimbap", 'คิมบับคุณแม่', 'fast_food'], ['불타는 닭갈비', 'Burning Dakgalbi', 'ทักคัลบีไฟลุก', 'restaurant'], ['왕십리 곱창', 'Wangsimni Gopchang', 'ไส้ย่างวังซิมนี', 'restaurant'],
    ['신당 떡볶이', 'Sindang Tteokbokki', 'ต็อกบกกีชินดัง', 'fast_food'], ['전주 비빔밥', 'Jeonju Bibimbap', 'บิบิมบับช็อนจู', 'restaurant'], ['원조 족발', 'Original Jokbal', 'ขาหมูต้นตำรับ', 'restaurant'], ['마포 갈매기살', 'Mapo Galmaegi', 'หมูกัลแมกีมาโพ', 'restaurant']],
  cafe: [['커피 한 잔', 'One Cup', 'กาแฟหนึ่งแก้ว', 'cafe'], ['달빛 카페', 'Moonlight Café', 'คาเฟ่แสงจันทร์', 'cafe'], ['다방 1987', 'Dabang 1987', 'ดาบัง 1987', 'cafe'], ['붕어빵 굽는 집', 'Fish Bread Bakery', 'บ้านขนมปลา', 'bakery']],
  bar: [['포장마차 둘', 'Pojangmacha Two', 'โพจังมาชา 2', 'pub'], ['이자카야 달', 'Izakaya Dal', 'อิซากายะดัล', 'pub'], ['호프 노가리', 'Hof Nogari', 'ฮอฟโนการี', 'pub'], ['소주 한 잔', 'One Shot Soju', 'โซจูหนึ่งแก้ว', 'pub']],
  fun: [['스타 노래방', 'Star Karaoke', 'คาราโอเกะสตาร์', 'karaoke'], ['레벨업 PC방', 'Level Up PC Bang', 'พีซีบังเลเวลอัป', 'internet_cafe'], ['블루존 PC방', 'Blue Zone PC Bang', 'พีซีบังบลูโซน', 'internet_cafe'], ['한빛 코인노래방', 'Hanbit Coin Karaoke', 'คาราโอเกะหยอดเหรียญฮันบิต', 'karaoke']],
  study: [['일등 수학학원', 'No.1 Math Academy', 'สถาบันคณิตอันดับหนึ่ง', 'academy'], ['강남 영어학원', 'Gangnam English Academy', 'สถาบันภาษาอังกฤษคังนัม', 'academy'], ['정석 독서실', 'Jeongseok Study Room', 'ห้องอ่านหนังสือช็องซ็อก', 'academy']],
  health: [['새봄 약국', 'Saebom Pharmacy', 'ร้านขายยาแซบม', 'pharmacy'], ['바른 정형외과', 'Bareun Orthopedics', 'คลินิกกระดูกบารึน', 'clinic'], ['맑은눈 안과', 'Clear Eye Clinic', 'คลินิกตามัลกึน', 'clinic'], ['미소 치과', 'Smile Dental', 'คลินิกทันตกรรมมิโซ', 'dentist']],
  misc: [['24시 코인빨래방', '24h Coin Laundry', 'ร้านซักผ้าหยอดเหรียญ', 'laundry'], ['모텔 하늘', 'Motel Haneul', 'โมเต็ลฮานึล', 'hotel'], ['세계 휴대폰', 'World Phones', 'ร้านมือถือเซกเย', 'mobile_phone'], ['언니네 미용실', "Unnie's Salon", 'ร้านทำผมออนนี', 'hairdresser'], ['파워 헬스', 'Power Gym', 'ฟิตเนสพาวเวอร์', 'fitness_centre']],
};
const conv = () => ({ t: 'convenience', b: 1 });
const poi = ([n, nen, nth, t]) => ({ t, n, nko: n, nen, nth });
const GLASS = ['#8a9aaa', '#7a8a9e', '#9aa6b2', '#6e7e90', '#a4b0bc'], VILLA = ['#a8644a', '#b8785a', '#c8b49a', '#9a8a78', '#d8ccb8', '#b8a48a'];
function addB(i0, j0, w, d, h, cat, color, pois, sign) {
  if (!free(i0, j0, w, d)) return null;
  take(i0, j0, w, d);
  for (let j = j0; j < j0 + d; j++) for (let i = i0; i < i0 + w; i++) set(i, j, 'block');
  const b = { i0, j0, w, d, h, cat, color };
  if (pois && pois.length) b.pois = pois;
  if (sign) b.sign = sign;
  buildings.push(b);
  return b;
}
// 우주새: 큰길 남쪽 뒷골목 모퉁이 (가로 골목 j=100 위쪽에 문)
const US = addB(56, 98, 2, 2, 58, 'ujusae', '#4a3527', null, 'left');
const door = { i: US.i0 + 1, j: US.j0 + US.d };
// 내 집: 달동네 골목 끝 (지도 가장 바깥)
const HOME = { i0: 3, j0: 2, w: 3, d: 3 };
addB(HOME.i0, HOME.j0, HOME.w, HOME.d, 46, 'home', '#9a8a74', [{ t: 'home', n: '내 집', nko: '내 집', nen: 'My home', nth: 'บ้านของฉัน' }], 'left');
set(HOME.i0 + 1, HOME.j0 + HOME.d, 'soi'); set(HOME.i0 + 1, HOME.j0 + HOME.d + 1, 'soi'); set(HOME.i0 + 2, HOME.j0 + HOME.d + 1, 'soi');
// 큰길가: 유리 빌딩 숲 (높이 200~420)
for (const [j0, d, sign] of [[BJ - 13, 11, 'left'], [BJ + 23, 11, 'right']]) {
  for (let i = 3; i < W - 6;) {
    const w = ri(7, 12);
    const isGap = get(i, j0 + (sign === 'left' ? d - 1 : 0)) === T.soi;
    if (isGap) { i += 3; continue; }
    const kinds = r() < 0.45 ? [poi(pick(N.cafe)), poi(pick(N.health))] : r() < 0.6 ? [conv(), poi(pick(N.study))] : r() < 0.7 ? [{ t: 'bank', n: pick(['하나로 은행', '푸른 은행', '한빛 저축은행']), nen: 'Bank', nth: 'ธนาคาร' }] : [poi(pick(N.food))];
    if (addB(i, j0, w, d, ri(200, 420), r() < 0.5 ? 'office' : 'condo', pick(GLASS), kinds, sign)) i += w + 1; else i += 1;
  }
}
// 뒷골목 블록: 4~6층 상가(1층 가게) · 빌라 · 교회 · 모텔
for (let j = 4; j < H - 4; j++) for (let i = 4; i < W - 4; i++) {
  if (i < DAL.i1 + 2 && j < DAL.j1 + 2) continue;
  if (occ[j * W + i] || get(i, j) !== T.lot) continue;
  const w = ri(3, 6), d = ri(3, 5);
  if (!free(i, j, w, d)) continue;
  // 골목을 마주 보는 쪽에 간판
  const southSoi = get(i + 1, j + d) === T.soi || get(i + 1, j + d) === T.walk, eastSoi = get(i + w, j + 1) === T.soi || get(i + w, j + 1) === T.walk;
  if (!southSoi && !eastSoi && r() < 0.6) { addB(i, j, w, d, ri(60, 120), 'condo', pick(VILLA), null); continue; }
  const roll = r();
  let pois, h = ri(90, 190), cat = 'shop';
  if (roll < 0.34) { pois = [poi(pick(N.food))]; if (r() < 0.4) pois.push(poi(pick(N.fun))); cat = 'restaurant'; }
  else if (roll < 0.44) { pois = [poi(pick(N.bar))]; cat = 'bar'; }
  else if (roll < 0.54) { pois = [poi(pick(N.fun)), poi(pick(N.study))]; }
  else if (roll < 0.62) { pois = [poi(pick(N.cafe))]; cat = 'cafe'; }
  else if (roll < 0.7) { pois = [conv()]; cat = 'convenience'; }
  else if (roll < 0.78) { pois = [poi(pick(N.health))]; cat = 'clinic'; }
  else if (roll < 0.84) { pois = [poi(pick(N.misc))]; }
  else if (roll < 0.87) { pois = [{ t: 'place_of_worship', n: pick(['사랑의 교회', '은혜 교회', '빛의 교회']), nen: pick(['Love Church', 'Grace Church', 'Light Church']), nth: 'โบสถ์คริสต์' }]; cat = 'worship'; h = ri(120, 170); }
  else { addB(i, j, w, d, ri(60, 130), 'condo', pick(VILLA), null); continue; }
  addB(i, j, w, d, h, cat, pick(VILLA), pois, southSoi ? 'left' : 'right');
}
// 달동네의 낮은 집들: 골목을 따라 다닥다닥 (파란·초록 슬레이트 지붕, 붉은 벽돌)
const DALC = ['#7a5a4a', '#8a6a52', '#9a8a74', '#6e5e50', '#a8947a'];
for (const k of pathTiles) {
  const i = k % W, j = Math.floor(k / W);
  for (const [di, dj] of [[2, 0], [-3, 0], [0, 2], [0, -3], [2, 2], [-3, -3]]) {
    if (r() < 0.55) continue;
    const w = ri(2, 3), d = ri(2, 3);
    const a = i + di, b = j + dj;
    if (a < 2 || b < 2 || a + w >= DAL.i1 || b + d >= DAL.j1 + 4) continue;
    if (!free(a, b, w, d)) continue;
    const hb = addB(a, b, w, d, ri(32, 52), 'generic', pick(DALC), null);
    if (hb) hb.hut = true; // 달동네 낮은 집 (따로 그린다)
  }
}
// 소품: 큰길 가로수(은행나무)·가로등, 뒷골목 배달 오토바이·쓰레기봉투·화분, 달동네 전봇대·화분·연탄 자리
for (let i = 4; i < W - 4; i += 9) { if (get(i, BJ + 1) === T.walk) props.push({ i, j: BJ + 1, kind: 'tree' }); if (get(i + 4, BJ + 20) === T.walk) props.push({ i: i + 4, j: BJ + 20, kind: 'tree' }); }
for (let i = 8; i < W - 4; i += 18) { props.push({ i, j: BJ + 2, kind: 'lamp' }); props.push({ i: i + 9, j: BJ + 19, kind: 'lamp' }); }
const near = (i, j, kind) => { for (const [a, b] of [[0, -1], [1, 0], [-1, 0], [0, 1]]) { if (get(i + a, j + b) === T.block) return true; } return false; };
let nb = 0;
for (let j = 4; j < H - 4; j++) for (let i = 4; i < W - 4; i++) {
  if (get(i, j) !== T.soi || !near(i, j)) continue;
  const q = r();
  const inDal = i < DAL.i1 && j < DAL.j1;
  if (inDal) { if (q < 0.08) props.push({ i, j, kind: 'pole' }); else if (q < 0.16) props.push({ i, j, kind: 'plant' }); continue; }
  if (q < 0.012 && nb++ < 40) props.push({ i, j, kind: 'moto' }); else if (q < 0.022) props.push({ i, j, kind: 'bin' }); else if (q < 0.028) props.push({ i, j, kind: 'plant' });
}
const json = {
  v: 2, id: 'seoul-gangnam', W, H, tileMeters: 3, codes: CODES, types: TYPES,
  tiles: Array.from(tiles, (t) => CODES[t]).join(''),
  buildings, props, lanes, door, spawn: { i: door.i, j: door.j + 1 }, shop: true,
  homeAlley: { i0: 35, j0: 36, i1: 42, j1: 43 }, home: { i: HOME.i0 + 1, j: HOME.j0 + HOME.d },
  city: 'seoul',
};
writeFileSync(out, JSON.stringify(json));
console.log('seoul-gangnam', W, H, 'buildings', buildings.length, 'props', props.length, 'door', door);
