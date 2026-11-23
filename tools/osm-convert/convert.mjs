// OSM(.osm XML) → Heaven's Manual 존 JSON (v2) 변환기
// node tools/osm-convert/convert.mjs 입력.osm 출력.json [--tile 3] [--id 존ID] [--align "Sukhumvit Road"] [--keep-right]
//  - --align 으로 지정한 길(기본: Sukhumvit Road)이 가로축(i)에 오도록 지도를 돌린다
//  - 정부시설(경찰서·관공서·법원·대사관·군 시설)은 이름·간판 없는 일반 건물(generic)로 바꾼다
//  - 브랜드 이름은 쓰지 않고 업종만 남긴다
//  - 태국은 좌측통행이 기본, 서울 강남은 --keep-right
import { readFileSync, writeFileSync } from 'node:fs';

const args = process.argv.slice(2);
const opt = (name, def) => { const k = args.indexOf(name); return k >= 0 ? args[k + 1] : def; };
const [inFile, outFile] = args;
if (!inFile || !outFile) { console.error('usage: convert.mjs in.osm out.json [--tile 3] [--id zone] [--align "Sukhumvit Road"] [--keep-right]'); process.exit(1); }
const TILE_M = Number(opt('--tile', '3'));
const ZONE_ID = opt('--id', 'zone');
const ALIGN = opt('--align', 'Sukhumvit Road');
const LEFT_HAND = !args.includes('--keep-right');
const t0 = Date.now();

// ── 파싱
const xml = readFileSync(inFile, 'utf8');
const attrs = (s) => Object.fromEntries([...s.matchAll(/([\w:]+)="([^"]*)"/g)].map((m) => [m[1], m[2]]));
const tagsOf = (s) => Object.fromEntries([...s.matchAll(/<tag k="([^"]*)" v="([^"]*)"\s*\/>/g)].map((m) => [m[1], m[2]]));
const nodes = new Map();
for (const m of xml.matchAll(/<node\b([^>]*?)(?:\/>|>([\s\S]*?)<\/node>)/g)) {
  const a = attrs(m[1]);
  nodes.set(a.id, { lat: +a.lat, lon: +a.lon, tags: m[2] ? tagsOf(m[2]) : {} });
}
const ways = new Map();
for (const m of xml.matchAll(/<way\b([^>]*)>([\s\S]*?)<\/way>/g)) {
  const a = attrs(m[1]);
  const ids = [...m[2].matchAll(/<nd ref="(\d+)"\s*\/>/g)].map((r) => r[1]);
  ways.set(a.id, { ids, refs: ids.map((id) => nodes.get(id)).filter(Boolean), tags: tagsOf(m[2]) });
}
// 멀티폴리곤: 닫힌 outer 길만 따로 다각형으로 쓴다
const areas = [...ways.values()].filter((w) => w.ids.length > 3 && w.ids[0] === w.ids[w.ids.length - 1]).map((w) => ({ refs: w.refs, tags: w.tags }));
for (const m of xml.matchAll(/<relation\b[^>]*>([\s\S]*?)<\/relation>/g)) {
  const tags = tagsOf(m[1]);
  if (tags.type !== 'multipolygon') continue;
  for (const mm of m[1].matchAll(/<member type="way" ref="(\d+)" role="outer"\s*\/>/g)) {
    const w = ways.get(mm[1]);
    if (w && w.ids.length > 3 && w.ids[0] === w.ids[w.ids.length - 1]) areas.push({ refs: w.refs, tags: { ...tags, ...w.tags } });
  }
}
const bm = xml.match(/<bounds\b([^>]*)\/>/);
const B = attrs(bm[1]);
const lat0 = (+B.minlat + +B.maxlat) / 2, lon0 = (+B.minlon + +B.maxlon) / 2;
const cosLat = Math.cos((lat0 * Math.PI) / 180);
const proj = (lat, lon) => [(lon - lon0) * cosLat * 111320, (lat0 - lat) * 110540];

// ── 정렬 각도 (각도 두 배 평균으로 축 방향을 구한다)
let C = 0, S = 0;
const named = (t) => (t.name || '').includes(ALIGN) || (t['name:en'] || '').includes(ALIGN);
for (const w of ways.values()) {
  if (!w.tags.highway || !named(w.tags)) continue;
  for (let k = 0; k + 1 < w.refs.length; k++) {
    const [ax, ay] = proj(w.refs[k].lat, w.refs[k].lon), [bx, by] = proj(w.refs[k + 1].lat, w.refs[k + 1].lon);
    const L = Math.hypot(bx - ax, by - ay), th = Math.atan2(by - ay, bx - ax);
    C += L * Math.cos(2 * th); S += L * Math.sin(2 * th);
  }
}
const theta = C || S ? Math.atan2(S, C) / 2 : 0;
const ca = Math.cos(-theta), sa = Math.sin(-theta);
const P = (n) => { const [x, y] = proj(n.lat, n.lon); return [x * ca - y * sa, x * sa + y * ca]; };

// ── 격자
const corners = [[+B.minlat, +B.minlon], [+B.minlat, +B.maxlon], [+B.maxlat, +B.maxlon], [+B.maxlat, +B.minlon]].map(([la, lo]) => P({ lat: la, lon: lo }));
const minX = Math.min(...corners.map((p) => p[0])), minY = Math.min(...corners.map((p) => p[1]));
const maxX = Math.max(...corners.map((p) => p[0])), maxY = Math.max(...corners.map((p) => p[1]));
const W = Math.ceil((maxX - minX) / TILE_M), H = Math.ceil((maxY - minY) / TILE_M);
const toT = ([x, y]) => [(x - minX) / TILE_M, (y - minY) / TILE_M]; // 연속 타일 좌표
const TYPES = ['void', 'lot', 'park', 'water', 'walk', 'soi', 'road', 'median', 'cross', 'block'];
const T = Object.fromEntries(TYPES.map((t, k) => [t, k]));
const RANK = { void: 0, lot: 1, park: 2, water: 3, walk: 4, soi: 5, road: 6, median: 7, cross: 8, block: 9 };
const tiles = new Uint8Array(W * H);
const inPoly = (pts, x, y) => { let c = false; for (let a = 0, z = pts.length - 1; a < pts.length; z = a++) { const [xi, yi] = pts[a], [xj, yj] = pts[z]; if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c; } return c; };
const crop = corners.map(toT);
for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) tiles[j * W + i] = inPoly(crop, i + 0.5, j + 0.5) ? T.lot : T.void;
const setIf = (i, j, type) => { if (i < 0 || j < 0 || i >= W || j >= H) return; const k = j * W + i; const cur = TYPES[tiles[k]]; if (cur !== 'void' && RANK[type] > RANK[cur]) tiles[k] = T[type]; };

// 면: 공원·녹지, 물
const isPark = (t) => ['park', 'garden', 'pitch', 'playground'].includes(t.leisure) || ['wood', 'scrub', 'grassland'].includes(t.natural) || ['grass', 'recreation_ground', 'village_green'].includes(t.landuse);
const isWater = (t) => t.natural === 'water' || t.waterway === 'riverbank' || t.water;
const fillPoly = (pts, fn) => {
  const tp = pts.map(toT);
  const x0 = Math.max(0, Math.floor(Math.min(...tp.map((p) => p[0])))), x1 = Math.min(W - 1, Math.ceil(Math.max(...tp.map((p) => p[0]))));
  const y0 = Math.max(0, Math.floor(Math.min(...tp.map((p) => p[1])))), y1 = Math.min(H - 1, Math.ceil(Math.max(...tp.map((p) => p[1]))));
  for (let j = y0; j <= y1; j++) for (let i = x0; i <= x1; i++) if (inPoly(tp, i + 0.5, j + 0.5)) fn(i, j);
};
for (const a of areas) {
  if (a.tags.building) continue;
  if (isWater(a.tags)) fillPoly(a.refs.map(P), (i, j) => setIf(i, j, 'water'));
  else if (isPark(a.tags)) fillPoly(a.refs.map(P), (i, j) => setIf(i, j, 'park'));
}

// 선: 도로, 물길, 보행로
const ROAD = { motorway: 22, trunk: 22, primary: 20, secondary: 14, tertiary: 10, motorway_link: 8, primary_link: 8, secondary_link: 7, tertiary_link: 6 };
const SOI = { residential: 6, unclassified: 6, service: 4, living_street: 5 };
const WALK = { footway: 3, pedestrian: 5, path: 2, steps: 2, cycleway: 2 };
const strokeSeg = (a, b, halfW, fn) => {
  const [ax, ay] = toT(a), [bx, by] = toT(b);
  const r = halfW / TILE_M + 1;
  const x0 = Math.max(0, Math.floor(Math.min(ax, bx) - r)), x1 = Math.min(W - 1, Math.ceil(Math.max(ax, bx) + r));
  const y0 = Math.max(0, Math.floor(Math.min(ay, by) - r)), y1 = Math.min(H - 1, Math.ceil(Math.max(ay, by) + r));
  const dx = bx - ax, dy = by - ay, L = dx * dx + dy * dy || 1;
  for (let j = y0; j <= y1; j++)
    for (let i = x0; i <= x1; i++) {
      const px = i + 0.5, py = j + 0.5;
      const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / L));
      fn(i, j, Math.hypot(px - ax - t * dx, py - ay - t * dy) * TILE_M);
    }
};
const elevated = (t) => t.bridge === 'yes' && (t.highway === 'motorway' || t.highway === 'motorway_link'); // 고가 고속도로는 땅에 그리지 않는다
const medianTiles = new Set();
for (const w of ways.values()) {
  const t = w.tags, pts = w.refs.map(P);
  if (pts.length < 2) continue;
  if (t.waterway === 'canal' || t.waterway === 'river') {
    for (let k = 0; k + 1 < pts.length; k++) strokeSeg(pts[k], pts[k + 1], 7, (i, j, d) => { if (d <= 7) setIf(i, j, 'water'); });
    continue;
  }
  const h = t.highway;
  if (!h || elevated(t) || t.layer === '2' || t.layer === '3') continue;
  if (h in ROAD) {
    const hw = ROAD[h] / 2, sw = ROAD[h] >= 14 ? 3.5 : 0;
    const isAlign = named(t);
    for (let k = 0; k + 1 < pts.length; k++)
      strokeSeg(pts[k], pts[k + 1], hw + sw, (i, j, d) => {
        if (d <= hw) {
          if (isAlign && h === 'primary' && d <= TILE_M * 0.55) { setIf(i, j, 'median'); medianTiles.add(j * W + i); }
          else setIf(i, j, 'road');
        } else if (d <= hw + sw) setIf(i, j, 'walk');
      });
  } else if (h in SOI) {
    for (let k = 0; k + 1 < pts.length; k++) strokeSeg(pts[k], pts[k + 1], SOI[h] / 2, (i, j, d) => { if (d <= SOI[h] / 2) setIf(i, j, 'soi'); });
  } else if (h in WALK) {
    const ww = WALK[h] / 2, cross = t.footway === 'crossing';
    for (let k = 0; k + 1 < pts.length; k++)
      strokeSeg(pts[k], pts[k + 1], ww, (i, j, d) => {
        if (d > ww) return;
        const cur = TYPES[tiles[j * W + i]];
        if (cross && (cur === 'road' || cur === 'median')) tiles[j * W + i] = T.cross;
        else setIf(i, j, 'walk');
      });
  }
}
// 횡단보도 점
for (const n of nodes.values()) {
  if (n.tags.highway !== 'crossing' && n.tags.crossing === undefined) continue;
  const [x, y] = toT(P(n));
  const i = Math.floor(x), j = Math.floor(y);
  for (let dj = -1; dj <= 1; dj++) for (let di = 0; di <= 0; di++) { const k = (j + dj) * W + (i + di); if (k >= 0 && k < W * H && (tiles[k] === T.road || tiles[k] === T.median)) tiles[k] = T.cross; }
}

// ── 건물
const GOV = (t) => ['police', 'townhall', 'courthouse', 'embassy', 'prison', 'ranger_station'].includes(t.amenity) || t.office === 'government' || t.office === 'diplomatic' || 'military' in t || t.landuse === 'military' || 'government' in t || t.building === 'government' || t.building === 'military' || t.diplomatic !== undefined;
const CAT = (t) => {
  if (GOV(t)) return 'generic';
  if (t.shop === 'convenience' || t.shop === 'supermarket') return 'convenience';
  if (t.amenity === 'pharmacy' || t.shop === 'chemist') return 'pharmacy';
  if (['hospital', 'clinic', 'doctors', 'dentist'].includes(t.amenity)) return 'clinic';
  if (['restaurant', 'fast_food', 'food_court'].includes(t.amenity)) return 'restaurant';
  if (['bar', 'pub', 'nightclub'].includes(t.amenity)) return 'bar';
  if (t.amenity === 'cafe') return 'cafe';
  if (t.amenity === 'bank') return 'bank';
  if (t.amenity === 'place_of_worship' || t.building === 'temple' || t.building === 'church' || t.building === 'mosque') return 'worship';
  if (['school', 'college', 'university', 'kindergarten'].includes(t.amenity) || t.building === 'school') return 'school';
  if (t.tourism === 'hotel' || t.tourism === 'hostel' || t.building === 'hotel') return 'hotel';
  if (t.shop === 'laundry' || t.shop === 'dry_cleaning') return 'laundry';
  if ('shop' in t) return 'shop';
  if ('office' in t || t.building === 'office' || t.building === 'commercial') return 'office';
  if (['apartments', 'residential', 'house', 'dormitory'].includes(t.building)) return 'condo';
  return null;
};
// 세부 업종 (간판·이름표·일자리·가게 메뉴에 쓴다). 정부시설·ATM·주차장 같은 것은 뺀다
const DETAIL = (t) => {
  if (GOV(t)) return null;
  const s = t.shop, a = t.amenity, tr = t.tourism, l = t.leisure, h = t.healthcare;
  const SHOPS = ['convenience', 'supermarket', 'massage', 'hairdresser', 'beauty', 'tailor', 'clothes', 'laundry', 'dry_cleaning', 'mall', 'bakery', 'optician', 'books', 'gift', 'shoes', 'computer', 'mobile_phone', 'electronics', 'hardware', 'doityourself', 'travel_agency', 'cannabis', 'chemist', 'jewelry', 'florist', 'furniture', 'alcohol', 'butcher', 'greengrocer', 'department_store', 'car_repair', 'motorcycle', 'motorcycle_repair', 'bicycle', 'tattoo', 'pet', 'sports', 'stationery', 'tobacco', 'variety_store', 'kiosk', 'coffee', 'tea', 'cosmetics', 'bag', 'watches', 'photo', 'copyshop', 'second_hand', 'toys', 'art'];
  if (s && SHOPS.includes(s)) return s === 'dry_cleaning' ? 'laundry' : s === 'doityourself' ? 'hardware' : s;
  if (s) return 'shop';
  const AMEN = ['restaurant', 'fast_food', 'food_court', 'cafe', 'bar', 'pub', 'nightclub', 'bank', 'bureau_de_change', 'pharmacy', 'clinic', 'dentist', 'doctors', 'hospital', 'school', 'kindergarten', 'college', 'university', 'place_of_worship', 'cinema', 'theatre', 'marketplace', 'fuel', 'car_wash', 'veterinary', 'coworking_space', 'library', 'ice_cream', 'internet_cafe', 'post_office'];
  if (a && AMEN.includes(a)) return a === 'doctors' ? 'clinic' : a === 'college' || a === 'university' ? 'school' : a;
  if (tr === 'hotel' || tr === 'hostel' || tr === 'guest_house' || tr === 'motel' || tr === 'apartment') return tr === 'motel' ? 'hotel' : tr === 'apartment' ? 'apartment_hotel' : tr;
  if (l === 'fitness_centre' || l === 'sports_centre') return 'fitness_centre';
  if (h === 'clinic' || h === 'dentist') return h;
  if (t.office === 'coworking') return 'coworking_space';
  return null;
};
const BRAND_WORDS = /7-?eleven|seven eleven|familymart|lawson|tops|foodland|villa market|big ?c|lotus|starbucks|amazon|coffee world|mcdonald|kfc|burger king|subway|pizza company|swensen|dairy queen|boots|watsons|uniqlo|zara|h&m|central|robinson|emporium|terminal 21|bangkok bank|kasikorn|krungsri|siam commercial|krung thai|uob|citibank|ttb|tmb|gsb|superrich|ธนาคาร|เซเว่น|แฟมิลี่มาร์ท|สตาร์บัคส์|คาเฟ่ อเมซอน|ท็อปเจริญ/i;
// 음식점·카페의 메뉴 묶음 (cuisine 태그 → 없으면 이름으로 짐작). 게임에서 파는 음식이 달라진다
const CUISINE = [
  ['italian', /pizza|italian|pasta|pizzeria/], ['burger', /burger|american|diner|fish_and_chips/], ['steak', /steak|grill|barbecue|bbq/],
  ['brunch', /breakfast|brunch|pancake|western|international|european|french|german|swiss|swedish|australian|british/], ['sandwich', /sandwich|deli|bagel/],
  ['japanese', /japanese|sushi|ramen|izakaya|yakiniku|udon|tonkatsu|yakitori/], ['korean', /korean|kimchi/], ['indian', /indian|curry|tandoor|nepal|pakistan/],
  ['chinese', /chinese|dim ?sum|cantonese|szechuan|sichuan|hot_?pot/], ['vietnamese', /vietnam|pho\b|banh/], ['mexican', /mexican|taco|burrito|tex/],
  ['middle_eastern', /arab|lebanese|middle_eastern|turkish|kebab|shawarma|falafel|persian|egypt|israeli|mediterranean/],
  ['chicken', /chicken|wings/], ['seafood', /seafood|fish/], ['noodle', /noodle|ก๋วยเตี๋ยว|บะหมี่/], ['thai', /thai|regional|asian|isan|isaan|som_?tam|savory_pancakes|ไทย|ข้าว|ส้มตำ/],
  ['icecream', /ice_?cream|gelato/], ['donut', /donut|doughnut/], ['bakery', /cake|bakery|pastry|patisserie|croissant/], ['tea', /bubble|tea\b|milk_?tea/], ['coffee', /coffee|cafe|café|espresso/],
];
const cuisineOf = (t, d) => {
  if (!['restaurant', 'fast_food', 'food_court', 'cafe', 'bakery', 'ice_cream', 'coffee', 'tea'].includes(d)) return null;
  const tag = (t.cuisine || '').toLowerCase().replace(/ /g, '_');
  for (const [k, re] of CUISINE) if (tag && re.test(tag)) return k;
  const name = `${t.name || ''} ${t['name:en'] || ''}`.toLowerCase();
  for (const [k, re] of CUISINE) if (re.test(name)) return k;
  return null;
};
const poiOf = (t) => {
  const d = DETAIL(t);
  if (!d) return null;
  const p = { t: d };
  const c = cuisineOf(t, d);
  if (c) p.c = c;
  const brand = !!t.brand || !!t['brand:wikidata'] || BRAND_WORDS.test(t.name || '') || BRAND_WORDS.test(t['name:en'] || '');
  if (brand) p.b = 1;
  else if (t.name) {
    p.n = t.name;
    if (t['name:th'] && t['name:th'] !== t.name) p.nth = t['name:th'];
    if (t['name:en'] && t['name:en'] !== t.name) p.nen = t['name:en'];
    if (t['name:ko']) p.nko = t['name:ko'];
  }
  return p;
};
const poiList = [];
for (const n of nodes.values()) {
  const p = poiOf(n.tags);
  if (!p) continue;
  const [x, y] = toT(P(n));
  poiList.push({ x, y, p });
}
// 가게 점(POI)을 타일 위치로 색인
const poiAt = new Map();
for (const n of nodes.values()) {
  const c = CAT(n.tags);
  if (!c) continue;
  const [x, y] = toT(P(n));
  const k = Math.floor(y) * W + Math.floor(x);
  if (!poiAt.has(k)) poiAt.set(k, c);
}
const COLORS = { convenience: '#c9c3b5', pharmacy: '#b8c4c2', clinic: '#d4d8d6', restaurant: '#c7a88a', bar: '#8e7a8f', cafe: '#9aa59a', bank: '#a8b0b8', worship: '#c9a86a', school: '#c4b49a', hotel: '#a9a3b4', laundry: '#b5aab8', shop: '#bfb39f', office: '#8c97a6', condo: '#a39e94', generic: '#9b968c' };
const hash = (n) => { let h = 2166136261; for (const ch of String(n)) h = Math.imul(h ^ ch.charCodeAt(0), 16777619); return (h >>> 0) / 4294967295; };
const buildings = [];
let bid = 0;
for (const a of areas) {
  if (!a.tags.building || a.tags.building === 'roof' || a.tags.layer === '-1') continue;
  bid++;
  const cells = [];
  fillPoly(a.refs.map(P), (i, j) => { const cur = TYPES[tiles[j * W + i]]; if (cur === 'lot' || cur === 'park') cells.push([i, j]); });
  if (!cells.length) continue;
  let cat = CAT(a.tags);
  if (!cat) for (const [i, j] of cells) { const c = poiAt.get(j * W + i); if (c) { cat = c; break; } }
  cat = cat ?? 'generic';
  const levels = Number(a.tags['building:levels']) || 0;
  const h = levels ? Math.min(360, 16 + levels * 15) : cat === 'condo' || cat === 'hotel' || cat === 'office' ? 90 + Math.round(hash(bid) * 120) : 40 + Math.round(hash(bid) * 50);
  const color = COLORS[cat];
  // 큰 건물은 10×10 이하 조각으로 나눠 그린다 (조각 안 칸의 절반 이상이 건물일 때만)
  const cellSet = new Set(cells.map(([i, j]) => j * W + i));
  const I0 = Math.min(...cells.map((c) => c[0])), J0 = Math.min(...cells.map((c) => c[1]));
  const I1 = Math.max(...cells.map((c) => c[0])), J1 = Math.max(...cells.map((c) => c[1]));
  const pieces = [];
  for (let pj = J0; pj <= J1; pj += 10)
    for (let pi = I0; pi <= I1; pi += 10) {
      const inside = [];
      for (let j = pj; j < Math.min(pj + 10, J1 + 1); j++) for (let i = pi; i < Math.min(pi + 10, I1 + 1); i++) if (cellSet.has(j * W + i)) inside.push([i, j]);
      const area = (Math.min(pi + 10, I1 + 1) - pi) * (Math.min(pj + 10, J1 + 1) - pj);
      if (!inside.length || inside.length < area * 0.5) continue;
      const i0 = Math.min(...inside.map((c) => c[0])), j0 = Math.min(...inside.map((c) => c[1]));
      const i1 = Math.max(...inside.map((c) => c[0])), j1 = Math.max(...inside.map((c) => c[1]));
      pieces.push({ i0, j0, w: i1 - i0 + 1, d: j1 - j0 + 1, h, cat, color });
    }
  if (!pieces.length) continue;
  const own = poiOf(a.tags);
  if (own) for (const p of pieces) p.pois = [own];
  for (const p of pieces) for (let j = p.j0; j < p.j0 + p.d; j++) for (let i = p.i0; i < p.i0 + p.w; i++) { const k = j * W + i; if (tiles[k] === T.lot || tiles[k] === T.park) tiles[k] = T.block; }
  // 간판은 한 조각에만: 앞(+j) 면 앞이 길이면 left, 아니면 오른쪽(+i) 면
  if (cat !== 'generic' && cat !== 'condo') {
    const open = (i, j) => i >= 0 && j >= 0 && i < W && j < H && ['walk', 'soi', 'road', 'cross', 'park', 'median'].includes(TYPES[tiles[j * W + i]]);
    const front = pieces.slice().sort((x, y) => y.j0 + y.d - (x.j0 + x.d))[0];
    if (open(front.i0 + Math.floor(front.w / 2), front.j0 + front.d)) front.sign = 'left';
    else { const right = pieces.slice().sort((x, y) => y.i0 + y.w - (x.i0 + x.w))[0]; if (open(right.i0 + right.w, right.j0 + Math.floor(right.d / 2))) right.sign = 'right'; }
  }
  buildings.push(...pieces);
}

// ── 가게 점 → 건물 조각: 점이 들어 있는 조각, 없으면 2칸 안의 가장 가까운 조각
{
  const byCell = new Map();
  buildings.forEach((b, k) => { for (let j = b.j0; j < b.j0 + b.d; j++) for (let i = b.i0; i < b.i0 + b.w; i++) byCell.set(j * W + i, k); });
  let attached = 0;
  for (const { x, y, p } of poiList) {
    const i = Math.floor(x), j = Math.floor(y);
    let k = byCell.get(j * W + i);
    if (k === undefined) {
      let best = 9;
      for (let dj = -2; dj <= 2; dj++) for (let di = -2; di <= 2; di++) { const kk = byCell.get((j + dj) * W + i + di); if (kk !== undefined && Math.hypot(di, dj) < best) { best = Math.hypot(di, dj); k = kk; } }
    }
    if (k === undefined) continue;
    const b = buildings[k];
    b.pois = b.pois ?? [];
    if (b.pois.length >= 4) continue;
    // 이름 있는 가게를 앞에 둔다
    if (p.n && b.pois.length && !b.pois[0].n) b.pois.unshift(p); else b.pois.push(p);
    attached++;
  }
  // 가게가 붙었는데 간판 면이 없던 건물은 간판 면을 다시 찾는다
  const open = (i, j) => i >= 0 && j >= 0 && i < W && j < H && ['walk', 'soi', 'road', 'cross', 'park', 'median'].includes(TYPES[tiles[j * W + i]]);
  for (const b of buildings) {
    if (!b.pois || b.sign || b.cat === 'ujusae') continue;
    if (open(b.i0 + Math.floor(b.w / 2), b.j0 + b.d)) b.sign = 'left';
    else if (open(b.i0 + b.w, b.j0 + Math.floor(b.d / 2))) b.sign = 'right';
  }
  console.error(`pois ${poiList.length}, attached ${attached}, buildings with shops ${buildings.filter((b) => b.pois).length}`);
}

// ── 소품: 가로수, BTS 기둥(수쿰빗 대로 중앙)
const props = [];
for (const n of nodes.values()) {
  if (n.tags.natural !== 'tree') continue;
  const [x, y] = toT(P(n));
  const i = Math.floor(x), j = Math.floor(y);
  if (i < 0 || j < 0 || i >= W || j >= H) continue;
  const tt = TYPES[tiles[j * W + i]];
  if (tt === 'walk' || tt === 'park' || tt === 'lot') props.push({ i, j, kind: 'tree' });
}
const med = [...medianTiles].map((k) => [k % W, Math.floor(k / W)]).filter(([i, j]) => tiles[j * W + i] === T.median).sort((a, b) => a[0] - b[0]);
let lastPillar = -99;
for (const [i, j] of med) if (i - lastPillar >= 9) { props.push({ i, j, kind: 'pillar' }); lastPillar = i; }

// ── 우주새: 지도 가운데(아속)에서 가장 가까운, 보도 바로 뒤의 빈 3×4 땅
const cx = W / 2, cy = H / 2;
const free = (i0, j0, w, d) => { for (let j = j0; j < j0 + d; j++) for (let i = i0; i < i0 + w; i++) { if (i < 0 || j < 0 || i >= W || j >= H) return false; const t = TYPES[tiles[j * W + i]]; if (t !== 'lot' && t !== 'park') return false; } return true; };
let shop = null, bestD = 1e9;
for (let j = 1; j < H - 6; j++)
  for (let i = 1; i < W - 4; i++) {
    const d = Math.hypot(i - cx, j - cy);
    if (d >= bestD) continue;
    if (!free(i, j, 3, 4)) continue;
    const fi = i + 1, fj = j + 4;
    if (TYPES[tiles[fj * W + fi]] !== 'walk') continue;
    let nearRoad = false;
    for (let k = 1; k <= 4; k++) { const t = TYPES[tiles[(fj + k) * W + fi]]; if (t === 'road' || t === 'median') nearRoad = true; }
    if (!nearRoad) continue;
    bestD = d; shop = { i0: i, j0: j };
  }
let door;
if (shop) {
  buildings.push({ i0: shop.i0, j0: shop.j0, w: 3, d: 4, h: 58, cat: 'ujusae', color: '#4a3527', sign: 'left' });
  for (let j = shop.j0; j < shop.j0 + 4; j++) for (let i = shop.i0; i < shop.i0 + 3; i++) tiles[j * W + i] = T.block;
  door = { i: shop.i0 + 1, j: shop.j0 + 4 };
}

// ── 차선: 행마다 도로가 24칸 이상 이어지는 구간. 중앙분리대 위쪽 행은 좌측통행에서 +i 방향
const lanes = [];
const medianRowAt = new Map();
for (const k of medianTiles) { const i = k % W, j = Math.floor(k / W); if (!medianRowAt.has(i)) medianRowAt.set(i, j); }
for (let j = 0; j < H; j++) {
  let i = 0;
  while (i < W) {
    if (tiles[j * W + i] !== T.road && tiles[j * W + i] !== T.cross) { i++; continue; }
    let e = i;
    while (e + 1 < W && (tiles[j * W + e + 1] === T.road || tiles[j * W + e + 1] === T.cross)) e++;
    if (e - i + 1 >= 24) {
      const mid = Math.floor((i + e) / 2);
      const mj = medianRowAt.get(mid);
      const above = mj !== undefined ? j < mj : j % 2 === 0;
      lanes.push({ j, i0: i, i1: e, dir: above === LEFT_HAND ? 1 : -1 });
    }
    i = e + 1;
  }
}

const CODES = ' .p~wsrmcb';
let tileStr = '';
for (let k = 0; k < tiles.length; k++) tileStr += CODES[tiles[k]];
const zone = {
  v: 2, id: ZONE_ID, W, H, tileMeters: TILE_M, codes: CODES, types: TYPES, tiles: tileStr,
  buildings, props, lanes, door, spawn: door,
  attribution: '© OpenStreetMap contributors (ODbL)',
};
writeFileSync(outFile, JSON.stringify(zone));
const cnt = (t) => tileStr.split(CODES[T[t]]).length - 1;
console.log(`zone ${ZONE_ID}: ${W}×${H} tiles @${TILE_M}m, rotated ${((theta * 180) / Math.PI).toFixed(1)}°, pieces ${buildings.length} (from ${bid} buildings, generic ${buildings.filter((b) => b.cat === 'generic').length}), signs ${buildings.filter((b) => b.sign).length}, trees ${props.filter((p) => p.kind === 'tree').length}, pillars ${props.filter((p) => p.kind === 'pillar').length}, lanes ${lanes.length}, door ${JSON.stringify(door)}; road ${cnt('road')} median ${cnt('median')} cross ${cnt('cross')} soi ${cnt('soi')} walk ${cnt('walk')} park ${cnt('park')} water ${cnt('water')}; ${(Date.now() - t0) / 1000}s`);
