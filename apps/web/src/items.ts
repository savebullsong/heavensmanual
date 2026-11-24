// 우주새 상품: 소비품 · 무기 · 방어구 (브랜드 실명 없음, 가격은 바트)
import { t, type Lang } from './i18n.ts';

export type ItemCat = 'goods' | 'weapon' | 'armor';
export interface ItemDef {
  key: string;
  cat: ItemCat;
  price: number;
  heal?: number; // 체력 회복
  atk?: number; // 공격력
  def?: number; // 방어력
  note?: 'rope' | 'needsAmmo' | 'ammo' | 'needsArrows' | 'arrows';
  name: Record<Lang, string>;
  store?: 'mart' | 'pharmacy' | 'food' | 'cafe' | 'talus' | 'hmeat' | 'tools' | 'dept' | 'hjunk'; // 우주새가 아니라 거리 가게(철물점·백화점) · 지옥 탈루스·고깃간·넝마장수에서 파는 것
  now?: boolean; // 가게에서 바로 먹는다 (가방에 넣지 않음)
  hell?: boolean; // 지옥의 우주새(황혼)에서만, 노전으로 판다
  sprite?: string; // 몸에 그릴 때 쓰는 그림 (지옥 무기·방어구는 현실 그림을 빌려 쓴다)
  icon?: string; // 아이콘 그림 (없으면 key)
  two?: boolean; // 양손 무기: 두 손으로 내려찍는다 (느리지만 묵직하다)
  ranged?: boolean; // 멀리서 쏜다 (권총·활) — 민첩이 공격력에 더해진다
  dr?: number; // 피해 감소 (17차: 방어력은 회피만 올린다. 피해를 줄이는 건 이 값이 있는 물건뿐)
}

export const ITEMS: ItemDef[] = [
  // 소비품
  { key: 'chips', cat: 'goods', price: 30, heal: 25, name: { ko: '감자칩', th: 'มันฝรั่งทอด', en: 'Potato chips' } },
  { key: 'bulgogichips', cat: 'goods', price: 3, heal: 35, store: 'talus', name: { ko: '불고기맛 과자', th: 'ขนมรสบุลโกกิ', en: 'Bulgogi-flavored snack' } }, // 탈루스가 노전 3닢에 판다
  { key: 'choco', cat: 'goods', price: 35, heal: 30, name: { ko: '초콜릿', th: 'ช็อกโกแลต', en: 'Chocolate' } },
  { key: 'cola', cat: 'goods', price: 17, heal: 15, name: { ko: '콜라', th: 'โคล่า', en: 'Cola' } },
  { key: 'water', cat: 'goods', price: 10, heal: 10, name: { ko: '물', th: 'น้ำเปล่า', en: 'Water' } },
  { key: 'rope', cat: 'goods', price: 120, note: 'rope', name: { ko: '밧줄', th: 'เชือก', en: 'Rope' } },
  { key: 'bandage', cat: 'goods', price: 45, heal: 120, name: { ko: '붕대', th: 'ผ้าพันแผล', en: 'Bandage' } },
  // 무기 — 공격력 차이가 가격에 반영된다
  { key: 'pipe', cat: 'weapon', price: 180, atk: 4, store: 'tools', name: { ko: '쇠파이프', th: 'ท่อเหล็ก', en: 'Steel pipe' } },
  { key: 'hammer', cat: 'weapon', price: 290, atk: 4, store: 'tools', name: { ko: '장도리', th: 'ค้อนหงอน', en: 'Claw hammer' } },
  { key: 'knife', cat: 'weapon', price: 390, atk: 5, store: 'dept', name: { ko: '식칼', th: 'มีดทำครัว', en: 'Kitchen knife' } },
  { key: 'shovel', cat: 'weapon', price: 420, atk: 5, store: 'tools', name: { ko: '삽', th: 'พลั่ว', en: 'Shovel' } },
  { key: 'bat', cat: 'weapon', price: 850, atk: 6, store: 'dept', name: { ko: '야구 배트', th: 'ไม้เบสบอล', en: 'Baseball bat' } },
  { key: 'hatchet', cat: 'weapon', price: 950, atk: 7, name: { ko: '손도끼', th: 'ขวานมือ', en: 'Hatchet' } },
  { key: 'dagger', cat: 'weapon', price: 1800, atk: 8, name: { ko: '단검', th: 'มีดสั้น', en: 'Dagger' } },
  { key: 'sword', cat: 'weapon', price: 7500, atk: 12, name: { ko: '장검', th: 'ดาบยาว', en: 'Longsword' } },
  // 양손 무기 (16차)
  { key: 'sledge', cat: 'weapon', price: 2600, atk: 10, store: 'tools', two: true, name: { ko: '오함마', th: 'ค้อนปอนด์', en: 'Sledgehammer' } },
  { key: 'fireaxe', cat: 'weapon', price: 5200, atk: 13, two: true, name: { ko: '소방 도끼', th: 'ขวานดับเพลิง', en: 'Fire axe' } },
  { key: 'pistol', cat: 'weapon', price: 45000, atk: 20, ranged: true, note: 'needsAmmo', name: { ko: '권총', th: 'ปืนพก', en: 'Pistol' } },
  { key: 'ammo', cat: 'weapon', price: 600, note: 'ammo', name: { ko: '권총탄 12발', th: 'กระสุนปืนพก 12 นัด', en: 'Pistol rounds ×12' } },
  // 17차 활: 소리 없이 멀리서. 민첩이 높을수록 세다
  { key: 'bow', cat: 'weapon', price: 3200, atk: 9, ranged: true, note: 'needsArrows', name: { ko: '사냥 활', th: 'ธนูล่าสัตว์', en: 'Hunting bow' } },
  { key: 'arrows', cat: 'weapon', price: 150, note: 'arrows', name: { ko: '화살 20대', th: 'ลูกธนู 20 ดอก', en: 'Arrows ×20' } },
  // 방어구
  { key: 'helmet', cat: 'armor', price: 690, def: 3, name: { ko: '헬멧', th: 'หมวกกันน็อก', en: 'Helmet' } },
  { key: 'jacket', cat: 'armor', price: 1290, def: 4, name: { ko: '보호 재킷', th: 'แจ็กเก็ตกันกระแทก', en: 'Protective jacket' } },
  { key: 'vest', cat: 'armor', price: 4900, def: 7, name: { ko: '방호 조끼', th: 'เสื้อเกราะ', en: 'Protective vest' } },
  { key: 'gloves', cat: 'armor', price: 120, def: 1, name: { ko: '작업 장갑', th: 'ถุงมือช่าง', en: 'Work gloves' } },
  { key: 'workpants', cat: 'armor', price: 450, def: 2, name: { ko: '작업 바지', th: 'กางเกงช่าง', en: 'Work trousers' } },
  { key: 'shinguard', cat: 'armor', price: 390, def: 2, name: { ko: '정강이 보호대', th: 'สนับแข้ง', en: 'Shin guards' } },
  { key: 'boots', cat: 'armor', price: 990, def: 2, name: { ko: '안전화', th: 'รองเท้าเซฟตี้', en: 'Safety boots' } },
  // 거리 가게 (방콕 실제 가격대)
  { key: 'noodle', cat: 'goods', price: 15, heal: 35, store: 'mart', name: { ko: '컵라면', th: 'บะหมี่ถ้วย', en: 'Cup noodles' } },
  { key: 'ricebox', cat: 'goods', price: 39, heal: 70, store: 'mart', name: { ko: '편의점 도시락', th: 'ข้าวกล่อง', en: 'Boxed rice meal' } },
  { key: 'plaster', cat: 'goods', price: 25, heal: 30, store: 'mart', name: { ko: '반창고', th: 'พลาสเตอร์ยา', en: 'Plasters' } },
  { key: 'painkiller', cat: 'goods', price: 30, heal: 60, store: 'pharmacy', name: { ko: '진통제', th: 'ยาแก้ปวด', en: 'Painkillers' } },
  { key: 'saline', cat: 'goods', price: 20, heal: 25, store: 'pharmacy', name: { ko: '전해질 음료', th: 'เกลือแร่', en: 'Rehydration salts' } },
  { key: 'firstaid', cat: 'goods', price: 250, heal: 300, store: 'pharmacy', name: { ko: '구급상자', th: 'ชุดปฐมพยาบาล', en: 'First-aid kit' } },
  { key: 'padthai', cat: 'goods', price: 60, heal: 150, store: 'food', now: true, name: { ko: '팟타이', th: 'ผัดไทย', en: 'Pad thai' } },
  { key: 'khaoman', cat: 'goods', price: 50, heal: 130, store: 'food', now: true, name: { ko: '카오만까이', th: 'ข้าวมันไก่', en: 'Chicken rice' } },
  { key: 'noodlesoup', cat: 'goods', price: 50, heal: 120, store: 'food', now: true, name: { ko: '국수', th: 'ก๋วยเตี๋ยว', en: 'Noodle soup' } },
  { key: 'coffee', cat: 'goods', price: 65, heal: 35, store: 'cafe', now: true, name: { ko: '커피', th: 'กาแฟ', en: 'Coffee' } },
  { key: 'thaitea', cat: 'goods', price: 45, heal: 30, store: 'cafe', now: true, name: { ko: '타이 밀크티', th: 'ชาไทย', en: 'Thai milk tea' } },
  { key: 'cake', cat: 'goods', price: 80, heal: 60, store: 'cafe', now: true, name: { ko: '케이크', th: 'เค้ก', en: 'Cake' } },
  // 지옥 (유황새 · 노전) — 단검·둔기·장병기·검 네 갈래
  { key: 'hdagger', cat: 'weapon', price: 30, atk: 6, hell: true, sprite: 'dagger', name: { ko: '녹슨 망자의 단검', th: 'มีดสั้นสนิมของผู้ตาย', en: 'Rusted dead man’s dagger' } },
  { key: 'hhammer', cat: 'weapon', price: 70, atk: 8, hell: true, sprite: 'hammer', name: { ko: '뼈 망치', th: 'ค้อนกระดูก', en: 'Bone hammer' } },
  { key: 'hspear', cat: 'weapon', price: 110, atk: 9, hell: true, sprite: 'pipe', name: { ko: '쇠사슬 창', th: 'หอกโซ่', en: 'Chain spear' } },
  { key: 'hsword', cat: 'weapon', price: 200, atk: 12, hell: true, sprite: 'sword', name: { ko: '흑철 검', th: 'ดาบเหล็กดำ', en: 'Black-iron sword' } },
  { key: 'hmaul', cat: 'weapon', price: 260, atk: 15, hell: true, two: true, sprite: 'maul', name: { ko: '가시 철퇴', th: 'กระบองหนาม', en: 'Spiked maul' } },
  { key: 'hgreatsword', cat: 'weapon', price: 360, atk: 17, hell: true, two: true, sprite: 'greatsword', name: { ko: '흑철 대검', th: 'ดาบใหญ่เหล็กดำ', en: 'Black-iron greatsword' } },
  { key: 'hhelm', cat: 'armor', price: 45, def: 3, hell: true, sprite: 'helmet', icon: 'helmet', name: { ko: '그을린 투구', th: 'หมวกเกราะไหม้เกรียม', en: 'Scorched helm' } },
  { key: 'hvest', cat: 'armor', price: 150, def: 6, hell: true, sprite: 'vest', icon: 'vest', name: { ko: '망자의 가죽 조끼', th: 'เสื้อหนังของผู้ตาย', en: 'Dead man’s leather vest' } },
  { key: 'hgloves', cat: 'armor', price: 20, def: 1, hell: true, sprite: 'gloves', icon: 'gloves', name: { ko: '사슬 장갑', th: 'ถุงมือโซ่', en: 'Chain gloves' } },
  { key: 'hshin', cat: 'armor', price: 35, def: 2, hell: true, sprite: 'shinguard', icon: 'shinguard', name: { ko: '뼈 정강이받이', th: 'สนับแข้งกระดูก', en: 'Bone greaves' } },
  { key: 'hboots', cat: 'armor', price: 60, def: 2, hell: true, sprite: 'boots', icon: 'boots', name: { ko: '숯 장화', th: 'รองเท้าถ่าน', en: 'Charcoal boots' } },
  { key: 'lethe', cat: 'goods', price: 3, heal: 60, hell: true, icon: 'water', name: { ko: '망각의 물', th: 'น้ำแห่งการลืมเลือน', en: 'Water of oblivion' } },
  { key: 'ashcake', cat: 'goods', price: 6, heal: 130, hell: true, icon: 'cake', name: { ko: '재떡', th: 'ขนมเถ้า', en: 'Ash cake' } },
  { key: 'hbandage', cat: 'goods', price: 8, heal: 150, hell: true, icon: 'bandage', name: { ko: '검은 붕대', th: 'ผ้าพันแผลสีดำ', en: 'Black bandage' } },
  { key: 'bloodfruit', cat: 'goods', price: 12, heal: 260, hell: true, icon: 'choco', name: { ko: '피 열매', th: 'ผลไม้เลือด', en: 'Blood fruit' } },
  // 지옥 마을 고깃간 (노전) — 무엇의 고기인지는 묻지 않는 게 좋다
  { key: 'hjerky', cat: 'goods', price: 3, heal: 50, hell: true, store: 'hmeat', icon: 'chips', name: { ko: '말린 고기', th: 'เนื้อแห้ง', en: 'Dried meat' } },
  { key: 'hskewer', cat: 'goods', price: 5, heal: 100, hell: true, store: 'hmeat', icon: 'ricebox', name: { ko: '고기 꼬치', th: 'เนื้อเสียบไม้', en: 'Meat skewer' } },
  { key: 'hstew', cat: 'goods', price: 10, heal: 220, hell: true, store: 'hmeat', icon: 'noodle', name: { ko: '뼈국', th: 'ซุปกระดูก', en: 'Bone broth' } },
  // 17차: 마을 장사꾼만 파는 무기 (유황새와 겹치지 않는다) — 고깃간 고기 칼 · 넝마장수의 주워 온 것들
  { key: 'hcleaver', cat: 'weapon', price: 90, atk: 10, hell: true, store: 'hmeat', sprite: 'cleaver', icon: 'hatchet', name: { ko: '푸줏간 고기 칼', th: 'มีดสับเนื้อ', en: 'Butcher’s cleaver' } },
  { key: 'hfemur', cat: 'weapon', price: 40, atk: 7, hell: true, store: 'hjunk', sprite: 'femur', icon: 'bat', name: { ko: '넓적다리뼈 몽둥이', th: 'กระบองกระดูกต้นขา', en: 'Thighbone club' } },
  { key: 'hpick', cat: 'weapon', price: 140, atk: 11, hell: true, store: 'hjunk', sprite: 'pickaxe', icon: 'pickaxe', name: { ko: '망자의 곡괭이', th: 'จอบของผู้ตาย', en: 'Dead man’s pickaxe' } },
  { key: 'hhook', cat: 'weapon', price: 230, atk: 13, hell: true, store: 'hjunk', sprite: 'hook', icon: 'hook', name: { ko: '빚 갈고리', th: 'ขอเกี่ยวทวงหนี้', en: 'Debt hook' } },
  // 음식점마다 실제 업종(지도의 cuisine)에 맞는 메뉴
  ...([
    ['pizza', 120, 140, '피자 한 조각', 'พิซซ่าหนึ่งชิ้น', 'Pizza slice'], ['pasta', 220, 190, '파스타', 'พาสต้า', 'Pasta'],
    ['burger', 180, 170, '햄버거', 'แฮมเบอร์เกอร์', 'Burger'], ['fries', 80, 70, '감자튀김', 'เฟรนช์ฟรายส์', 'Fries'],
    ['steak', 390, 260, '스테이크', 'สเต๊ก', 'Steak'], ['pancake', 150, 120, '팬케이크', 'แพนเค้ก', 'Pancakes'],
    ['eggtoast', 140, 130, '달걀 토스트', 'ไข่กับขนมปังปิ้ง', 'Eggs on toast'], ['sandwich', 120, 120, '샌드위치', 'แซนด์วิช', 'Sandwich'],
    ['ramen', 250, 200, '라멘', 'ราเมน', 'Ramen'], ['sushi', 300, 180, '초밥', 'ซูชิ', 'Sushi'], ['matcha', 90, 40, '말차', 'มัทฉะ', 'Matcha'],
    ['bibimbap', 220, 200, '비빔밥', 'บิบิมบับ', 'Bibimbap'], ['kimchistew', 200, 190, '김치찌개', 'ซุปกิมจิ', 'Kimchi stew'], ['tteok', 150, 140, '떡볶이', 'ต็อกบกกี', 'Tteokbokki'],
    ['curry', 220, 200, '카레와 난', 'แกงกับแป้งนาน', 'Curry & naan'], ['biryani', 250, 210, '비리야니', 'ข้าวหมกบริยานี', 'Biryani'], ['lassi', 90, 50, '라씨', 'ลัสซี่', 'Lassi'],
    ['friedrice', 70, 140, '볶음밥', 'ข้าวผัด', 'Fried rice'], ['dimsum', 150, 130, '딤섬', 'ติ่มซำ', 'Dim sum'],
    ['pho', 150, 160, '쌀국수(퍼)', 'เฝอ', 'Pho'], ['banhmi', 120, 120, '반미', 'บั๋นหมี่', 'Bánh mì'],
    ['taco', 150, 140, '타코', 'ทาโก้', 'Tacos'], ['burrito', 220, 190, '부리토', 'เบอร์ริโต', 'Burrito'],
    ['kebab', 150, 160, '케밥', 'เคบับ', 'Kebab'], ['hummus', 180, 140, '후무스와 빵', 'ฮัมมัสกับขนมปัง', 'Hummus & bread'],
    ['friedchicken', 120, 160, '프라이드치킨', 'ไก่ทอด', 'Fried chicken'], ['tomyum', 150, 170, '똠얌꿍', 'ต้มยำกุ้ง', 'Tom yum goong'],
    ['grilledfish', 250, 200, '생선구이', 'ปลาเผา', 'Grilled fish'], ['somtam', 50, 100, '쏨땀', 'ส้มตำ', 'Papaya salad'], ['bamee', 50, 120, '바미 (달걀국수)', 'บะหมี่', 'Egg noodles'],
  ] as [string, number, number, string, string, string][]).map(([key, price, heal, ko, th, en]): ItemDef => ({ key, cat: 'goods', price, heal, store: 'food', now: true, name: { ko, th, en } })),
  ...([
    ['croissant', 90, 60, '크루아상', 'ครัวซองต์', 'Croissant'], ['donut', 45, 45, '도넛', 'โดนัท', 'Donut'],
    ['icecream', 80, 50, '아이스크림', 'ไอศกรีม', 'Ice cream'], ['bubbletea', 60, 40, '버블티', 'ชานมไข่มุก', 'Bubble tea'],
  ] as [string, number, number, string, string, string][]).map(([key, price, heal, ko, th, en]): ItemDef => ({ key, cat: 'goods', price, heal, store: 'cafe', now: true, name: { ko, th, en } })),
];

// 회복은 말로, 무기·방어구는 숫자로 (17차: 공격력·방어력 표시)
/** 거리 가게 진열 (우주새 물건도 가게 가격으로 판다) */
/** 음식점·카페 메뉴: 지도의 cuisine(없으면 이름)으로 고른다. 모르면 태국 음식 / 커피 */
const M = (...xs: [string, number][]) => xs.map(([key, price]) => ({ key, price }));
export const MENUS: Record<string, { key: string; price: number }[]> = {
  thai: M(['padthai', 60], ['khaoman', 50], ['somtam', 50], ['tomyum', 150], ['thaitea', 40], ['water', 10]),
  noodle: M(['noodlesoup', 50], ['bamee', 50], ['khaoman', 50], ['water', 10]),
  seafood: M(['tomyum', 150], ['grilledfish', 250], ['somtam', 50], ['water', 10]),
  italian: M(['pizza', 120], ['pasta', 220], ['cola', 35], ['water', 15]),
  burger: M(['burger', 180], ['fries', 80], ['cola', 35], ['water', 15]),
  steak: M(['steak', 390], ['fries', 80], ['cola', 35], ['water', 15]),
  brunch: M(['pancake', 150], ['eggtoast', 140], ['coffee', 80], ['water', 15]),
  sandwich: M(['sandwich', 120], ['coffee', 70], ['water', 15]),
  japanese: M(['ramen', 250], ['sushi', 300], ['matcha', 90], ['water', 15]),
  korean: M(['bibimbap', 220], ['kimchistew', 200], ['tteok', 150], ['water', 15]),
  indian: M(['curry', 220], ['biryani', 250], ['lassi', 90], ['water', 15]),
  chinese: M(['friedrice', 70], ['dimsum', 150], ['water', 10]),
  vietnamese: M(['pho', 150], ['banhmi', 120], ['water', 15]),
  mexican: M(['taco', 150], ['burrito', 220], ['cola', 35], ['water', 15]),
  middle_eastern: M(['kebab', 150], ['hummus', 180], ['water', 15]),
  chicken: M(['friedchicken', 120], ['fries', 80], ['cola', 35]),
  coffee: M(['coffee', 65], ['thaitea', 45], ['cake', 80], ['water', 10]),
  bakery: M(['croissant', 90], ['cake', 80], ['coffee', 65]),
  donut: M(['donut', 45], ['coffee', 65]),
  icecream: M(['icecream', 80], ['water', 10]),
  tea: M(['bubbletea', 60], ['thaitea', 45], ['matcha', 90]),
};
export function menuFor(kind: 'mart' | 'pharmacy' | 'food' | 'cafe' | 'tools' | 'dept', cuisine?: string) {
  if (kind === 'food') return MENUS[cuisine ?? ''] ?? MENUS.thai;
  if (kind === 'cafe') return MENUS[cuisine ?? ''] ?? MENUS.coffee;
  return STORES[kind];
}

export const STORES: Record<'mart' | 'pharmacy' | 'food' | 'cafe' | 'tools' | 'dept', { key: string; price: number }[]> = {
  mart: [{ key: 'water', price: 10 }, { key: 'cola', price: 17 }, { key: 'noodle', price: 15 }, { key: 'ricebox', price: 39 }, { key: 'chips', price: 30 }, { key: 'choco', price: 35 }, { key: 'plaster', price: 25 }],
  pharmacy: [{ key: 'painkiller', price: 30 }, { key: 'bandage', price: 45 }, { key: 'saline', price: 20 }, { key: 'firstaid', price: 250 }, { key: 'water', price: 10 }],
  food: [{ key: 'padthai', price: 60 }, { key: 'khaoman', price: 50 }, { key: 'noodlesoup', price: 50 }, { key: 'water', price: 10 }],
  cafe: [{ key: 'coffee', price: 65 }, { key: 'thaitea', price: 45 }, { key: 'cake', price: 80 }, { key: 'water', price: 10 }],
  // 17차: 우주새와 다른 무기를 파는 거리 상인
  tools: [{ key: 'pipe', price: 180 }, { key: 'hammer', price: 290 }, { key: 'shovel', price: 420 }, { key: 'sledge', price: 2600 }, { key: 'water', price: 10 }], // 철물점·수리점: 공구
  dept: [{ key: 'knife', price: 390 }, { key: 'bat', price: 850 }, { key: 'cola', price: 20 }, { key: 'chips', price: 35 }], // 백화점·쇼핑몰: 주방칼·운동용품
};

const EFFECT: Record<Lang, { heal: string[]; atkN: string; defN: string; rope: string; needsAmmo: string; ammo: string; two: string; ranged: string; needsArrows: string; arrows: string }> = {
  ko: { heal: ['조금 회복', '회복', '많이 회복', '크게 회복'], atkN: '공격력 {n}', defN: '방어력 {n}', rope: '추락을 한 번 막아 줌', needsAmmo: '탄약 필요', ammo: '권총에 넣는 탄약', two: '양손 · 느리지만 묵직하게 내려찍음', ranged: '원거리 · 민첩이 더해짐', needsArrows: '화살 필요', arrows: '활에 메기는 화살' },
  th: { heal: ['ฟื้นฟูเล็กน้อย', 'ฟื้นฟู', 'ฟื้นฟูมาก', 'ฟื้นฟูมหาศาล'], atkN: 'พลังโจมตี {n}', defN: 'พลังป้องกัน {n}', rope: 'กันตกจากที่สูงได้หนึ่งครั้ง', needsAmmo: 'ต้องใช้กระสุน', ammo: 'กระสุนสำหรับปืนพก', two: 'สองมือ · ช้าแต่ฟาดลงหนักหน่วง', ranged: 'ระยะไกล · ความว่องไวช่วยเพิ่มพลัง', needsArrows: 'ต้องใช้ลูกธนู', arrows: 'ลูกธนูสำหรับธนู' },
  en: { heal: ['Heals a little', 'Heals', 'Heals a lot', 'Heals greatly'], atkN: 'Attack {n}', defN: 'Defense {n}', rope: 'Saves you from one fall', needsAmmo: 'Needs ammo', ammo: 'Rounds for the pistol', two: 'Two-handed · slow, crushing overhead blows', ranged: 'Ranged · agility adds power', needsArrows: 'Needs arrows', arrows: 'Arrows for the bow' },
};

export function effectText(it: ItemDef, l: Lang): string {
  const E = EFFECT[l];
  const parts: string[] = [];
  if (it.heal) parts.push(E.heal[it.heal <= 30 ? 0 : it.heal <= 80 ? 1 : it.heal <= 160 ? 2 : 3]);
  if (it.atk) parts.push(E.atkN.replace('{n}', String(it.atk)));
  if (it.def) parts.push(E.defN.replace('{n}', String(it.def)));
  if (it.two) parts.push(E.two);
  if (it.ranged && it.key !== 'pistol') parts.push(E.ranged);
  if (it.note) parts.push(E[it.note]);
  return parts.join(' · ');
}

export function priceText(n: number, hell = false): string {
  return hell ? t().obolFmt.replace('{n}', n.toLocaleString('en-US')) : `฿${n.toLocaleString('en-US')}`;
}

/** 물건 아이콘 — 지옥 물건은 현실 그림을 빌려 그을리고 붉게 물들인다 */
export function iconFor(it: ItemDef): HTMLCanvasElement {
  const c = itemIcon(it.icon ?? it.sprite ?? it.key);
  if (!it.hell) return c;
  const g = c.getContext('2d')!;
  g.globalCompositeOperation = 'source-atop';
  g.fillStyle = 'rgba(70,8,4,0.42)';
  g.fillRect(0, 0, 32, 32);
  g.fillStyle = 'rgba(255,90,30,0.18)';
  g.fillRect(0, 22, 32, 10);
  g.globalCompositeOperation = 'source-over';
  return c;
}

// ───────────────────────── 32×32 아이콘 ─────────────────────────
const OUTLINE = [20, 14, 10];

export function itemIcon(key: string): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = c.height = 32;
  const g = c.getContext('2d')!;
  const R = (x: number, y: number, w: number, h: number, col: string) => { g.fillStyle = col; g.fillRect(x, y, w, h); };
  const E = (cx: number, cy: number, rx: number, ry: number, col: string) => {
    g.fillStyle = col;
    for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++)
      for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++)
        if (((x + 0.5 - cx) / rx) ** 2 + ((y + 0.5 - cy) / ry) ** 2 <= 1) g.fillRect(x, y, 1, 1);
  };
  // 굵기 있는 대각선 (왼쪽 아래 → 오른쪽 위)
  const Ln = (x0: number, y0: number, x1: number, y1: number, w: number, col: string) => {
    g.fillStyle = col;
    const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0));
    for (let k = 0; k <= n; k++) {
      const x = x0 + ((x1 - x0) * k) / n, y = y0 + ((y1 - y0) * k) / n;
      g.fillRect(Math.round(x - w / 2), Math.round(y - w / 2), w, w);
    }
  };
  const P = (pts: [number, number][], col: string) => {
    g.fillStyle = col;
    g.beginPath();
    g.moveTo(pts[0][0], pts[0][1]);
    for (const p of pts.slice(1)) g.lineTo(p[0], p[1]);
    g.closePath();
    g.fill();
  };

  switch (key) {
    case 'cola':
      R(10, 5, 12, 2, '#b9b9b4'); R(9, 7, 14, 21, '#8e1f1c'); R(9, 7, 3, 21, '#b8322c'); R(20, 7, 3, 21, '#5e1412');
      R(9, 13, 14, 6, '#2a1210'); R(12, 15, 8, 2, '#d8d2c4'); R(10, 27, 12, 2, '#9a9a94'); R(13, 4, 6, 1, '#d6d6d0');
      break;
    case 'chips':
      P([[8, 6], [24, 6], [25, 27], [7, 27]], '#d99a2b');
      for (let x = 8; x < 25; x += 2) { R(x, 4, 1, 3, '#c9c4b4'); R(x, 27, 1, 3, '#c9c4b4'); }
      R(8, 5, 17, 2, '#e8e2d0'); R(7, 26, 18, 2, '#e8e2d0'); R(9, 8, 3, 18, '#f2c25a');
      E(16, 18, 5, 4, '#f6dd8a'); E(16, 18, 3, 2, '#e9c463'); R(10, 10, 12, 3, '#8a2e1e');
      break;
    case 'choco':
      P([[5, 20], [20, 5], [27, 12], [12, 27]], '#4a2a18');
      for (let k = 0; k < 3; k++) for (let m = 0; m < 2; m++) Ln(9 + k * 5 + m * 3, 21 - k * 5 + m * 3, 11 + k * 5 + m * 3, 19 - k * 5 + m * 3, 1, '#6e4128');
      P([[12, 27], [27, 12], [29, 15], [15, 30]], '#7a1e2a'); P([[20, 18], [24, 14], [26, 16], [22, 20]], '#c9a23e');
      break;
    case 'water':
      R(13, 3, 6, 3, '#2f6fb8'); R(12, 6, 8, 2, '#9fc6e4'); P([[11, 8], [21, 8], [23, 12], [23, 28], [9, 28], [9, 12]], '#b9dcef');
      R(9, 15, 14, 7, '#e8f2f6'); R(11, 17, 10, 3, '#3f8fd0'); R(10, 9, 2, 18, '#e6f4fb'); R(20, 12, 2, 15, '#8fbcd6');
      break;
    case 'rope':
      E(16, 17, 12, 10, '#b08a52'); E(16, 17, 9, 7, '#8a6838'); E(16, 17, 6, 4.5, '#c49a5e'); E(16, 17, 3, 2, '#2b2014');
      for (let a = 0; a < 18; a++) { const t = (a / 18) * Math.PI * 2; R(Math.round(16 + Math.cos(t) * 10.5), Math.round(17 + Math.sin(t) * 8.5), 1, 1, '#e0c08a'); }
      Ln(24, 24, 29, 30, 3, '#b08a52');
      break;
    case 'bandage':
      E(13, 16, 9, 9, '#ece8de'); E(13, 16, 5, 5, '#d6d0c2'); E(13, 16, 2, 2, '#a89f8c');
      P([[19, 22], [28, 18], [30, 23], [21, 27]], '#ece8de'); R(22, 22, 6, 1, '#cfc8b8');
      R(6, 12, 2, 8, '#fbfaf4');
      break;
    case 'knife':
      P([[4, 27], [19, 12], [22, 15], [8, 28]], '#dfe4ea'); Ln(5, 27, 19, 13, 1, '#f6f9fc'); Ln(9, 28, 21, 16, 1, '#9aa3ad');
      Ln(21, 12, 28, 5, 4, '#3a2418'); R(22, 10, 2, 2, '#c9c4b8'); R(25, 7, 2, 2, '#c9c4b8');
      break;
    case 'bat':
      Ln(4, 28, 10, 22, 3, '#8a6238'); Ln(10, 22, 26, 6, 6, '#c49a5e'); Ln(11, 20, 25, 6, 2, '#e0bd84');
      R(2, 28, 4, 3, '#5a3d22'); Ln(5, 27, 8, 24, 1, '#2a1a10');
      break;
    case 'hammer':
      Ln(6, 28, 19, 13, 4, '#7a5232'); Ln(7, 26, 18, 14, 1, '#a07448');
      P([[14, 10], [22, 4], [27, 9], [23, 13]], '#5d6470'); P([[22, 4], [25, 2], [30, 6], [27, 9]], '#7c8492');
      P([[14, 10], [10, 9], [8, 12], [12, 13]], '#4a505a'); Ln(9, 11, 12, 11, 1, '#2e323a');
      break;
    case 'pipe':
      Ln(4, 28, 27, 5, 6, '#6e747c'); Ln(4, 26, 26, 4, 2, '#a9afb6'); Ln(6, 29, 28, 7, 1, '#454a50');
      E(27, 5, 3, 3, '#3a3e44'); E(27, 5, 1.5, 1.5, '#1e2125');
      break;
    case 'hatchet':
      Ln(7, 29, 19, 9, 3, '#8a6238'); Ln(8, 28, 18, 11, 1, '#b08a52');
      P([[15, 7], [23, 3], [28, 10], [24, 17], [18, 13]], '#7c8492'); P([[24, 17], [28, 10], [29, 15], [26, 19]], '#c9ced6');
      R(16, 9, 4, 4, '#4a505a');
      break;
    case 'shovel':
      Ln(3, 29, 18, 14, 2, '#8a6238'); E(4, 28, 3, 3, '#5a3d22'); E(4, 28, 1.5, 1.5, '#14100c');
      P([[17, 12], [24, 5], [30, 8], [29, 15], [21, 19]], '#7c8492'); P([[24, 5], [30, 8], [29, 11], [25, 9]], '#a9afb6');
      Ln(17, 15, 20, 12, 2, '#4a505a');
      break;
    case 'dagger':
      P([[13, 19], [24, 6], [27, 5], [26, 8], [15, 21]], '#dfe4ea'); Ln(14, 19, 25, 6, 1, '#f6f9fc');
      Ln(9, 15, 17, 23, 2, '#a07c3a'); Ln(6, 27, 12, 21, 3, '#3a2418'); E(5, 28, 2, 2, '#a07c3a');
      break;
    case 'sword':
      P([[9, 21], [27, 3], [30, 2], [29, 5], [11, 23]], '#dfe4ea'); Ln(10, 21, 28, 3, 1, '#f6f9fc');
      Ln(5, 17, 15, 27, 2, '#8a6a2a'); Ln(3, 29, 9, 23, 3, '#3a2418'); E(3, 29, 2, 2, '#8a6a2a');
      break;
    case 'sledge':
      Ln(3, 30, 22, 11, 3, '#8a6238'); Ln(4, 28, 21, 11, 1, '#b08a52');
      P([[16, 9], [24, 1], [31, 8], [23, 16]], '#4a505a'); P([[24, 1], [27, 1], [31, 5], [31, 8]], '#7c8492'); Ln(17, 9, 23, 15, 1, '#2e323a');
      break;
    case 'fireaxe':
      Ln(3, 30, 22, 11, 3, '#8a6238'); Ln(4, 28, 21, 11, 1, '#b08a52');
      P([[18, 9], [25, 2], [31, 9], [27, 15], [22, 13]], '#b8282a'); P([[27, 15], [31, 9], [31, 13], [29, 16]], '#d9dde2');
      P([[18, 9], [14, 6], [12, 8], [16, 12]], '#b8282a');
      break;
    case 'greatsword':
      P([[8, 20], [26, 2], [31, 1], [30, 6], [12, 24]], '#3a3e46'); Ln(9, 20, 27, 2, 1, '#8a929e'); Ln(11, 21, 28, 4, 1, '#1e2228');
      Ln(4, 15, 17, 28, 2, '#5a5e66'); Ln(1, 31, 9, 23, 3, '#2a1c14'); E(2, 30, 2, 2, '#5a5e66');
      break;
    case 'maul':
      Ln(3, 30, 20, 13, 3, '#2e2a28'); Ln(4, 28, 19, 13, 1, '#5a5652');
      E(23, 9, 7, 7, '#4a505a'); E(21, 7, 3, 3, '#7c8492');
      for (const [x, y] of [[23, 0], [31, 9], [23, 18], [15, 9], [29, 3], [29, 15], [17, 3]] as [number, number][]) R(x - 1, y, 2, 2, '#9aa3ad');
      break;
    case 'pistol':
      P([[4, 9], [28, 9], [28, 15], [13, 15], [12, 26], [5, 26], [7, 15], [4, 15]], '#25272b');
      R(4, 9, 24, 2, '#4a4e55'); R(6, 18, 5, 7, '#3a2f28'); P([[13, 15], [17, 15], [17, 20], [13, 19]], '#1a1b1e');
      R(14, 16, 2, 2, '#4a4e55'); R(26, 8, 2, 1, '#4a4e55'); R(9, 12, 12, 1, '#3a3d42');
      break;
    case 'bow':
      for (let k = 0; k < 26; k++) { const a = (k / 25 - 0.5) * 2.2, x = Math.round(9 + Math.cos(a) * 14 - 6), y = Math.round(16 + Math.sin(a) * 14); R(x, y, 2, 2, '#8a6238'); R(x, y, 1, 1, '#b08a52'); }
      Ln(5, 2, 5, 29, 1, '#e8e2d0'); R(6, 14, 3, 4, '#3a2a1e');
      Ln(4, 16, 28, 16, 1, '#9a7a4a'); P([[28, 14], [31, 16], [28, 18]], '#c9ced6'); P([[3, 13], [6, 16], [3, 19]], '#c8382a');
      break;
    case 'arrows':
      for (let k = 0; k < 4; k++) { const y = 8 + k * 5; Ln(4, y + 6, 26, y, 1, '#9a7a4a'); P([[26, y - 2], [30, y - 1], [27, y + 2]], '#c9ced6'); P([[3, y + 4], [6, y + 5], [4, y + 8]], '#c8382a'); }
      R(9, 22, 13, 8, '#6a4a2a'); R(9, 22, 13, 2, '#8a6238');
      break;
    case 'pickaxe':
      Ln(6, 29, 20, 9, 3, '#6a4a2e'); Ln(7, 28, 19, 11, 1, '#8a6238');
      P([[8, 6], [16, 4], [24, 6], [31, 12], [24, 9], [16, 8], [9, 9]], '#6a6e74'); P([[24, 6], [31, 12], [29, 12]], '#a8aeb6');
      break;
    case 'hook':
      Ln(4, 30, 18, 12, 2, '#3a3430');
      for (let k = 0; k < 14; k++) { const a = Math.PI * (0.9 + k / 13 * 1.3), x = Math.round(22 + Math.cos(a) * 6), y = Math.round(10 + Math.sin(a) * 6); R(x, y, 2, 2, '#7c8492'); }
      P([[27, 13], [30, 9], [28, 15]], '#c9ced6');
      break;
    case 'ammo':
      R(5, 16, 22, 12, '#4a5a3a'); R(5, 16, 22, 2, '#6a7a52'); R(7, 20, 18, 3, '#d8d2c4');
      for (let k = 0; k < 4; k++) { R(7 + k * 5, 6, 3, 10, '#c9963a'); R(7 + k * 5, 4, 3, 3, '#b0703a'); R(7 + k * 5, 6, 1, 10, '#e8c26a'); }
      break;
    case 'helmet':
      E(16, 16, 12, 11, '#2b2f36');
      g.clearRect(0, 22, 32, 10); R(5, 20, 22, 4, '#2b2f36');
      P([[9, 14], [26, 13], [26, 20], [11, 20]], '#5c7f9a'); R(12, 15, 10, 1, '#a9c7da');
      R(8, 6, 6, 2, '#4a505a'); R(4, 24, 24, 2, '#1a1c20');
      break;
    case 'jacket':
      P([[10, 5], [22, 5], [29, 12], [26, 15], [24, 13], [24, 28], [8, 28], [8, 13], [6, 15], [3, 12]], '#4a5236');
      R(15, 6, 2, 22, '#2e3322'); R(16, 6, 1, 22, '#b9b49a'); R(10, 5, 4, 3, '#3a4028'); R(18, 5, 4, 3, '#3a4028');
      for (let y = 10; y < 28; y += 5) { R(8, y, 7, 1, '#3a4028'); R(17, y, 7, 1, '#3a4028'); }
      break;
    case 'vest':
      P([[9, 4], [13, 4], [16, 8], [19, 4], [23, 4], [26, 10], [26, 28], [6, 28], [6, 10]], '#3a3f46');
      R(9, 12, 6, 9, '#4f5660'); R(17, 12, 6, 9, '#4f5660'); R(6, 23, 20, 3, '#2a2e33');
      R(8, 24, 2, 1, '#9aa3ad'); R(22, 24, 2, 1, '#9aa3ad');
      break;
    case 'gloves':
      P([[4, 22], [4, 12], [6, 9], [8, 12], [9, 8], [11, 11], [12, 8], [14, 12], [15, 16], [16, 22]], '#d1a83a');
      P([[16, 24], [16, 13], [18, 10], [20, 13], [21, 9], [23, 12], [24, 9], [26, 13], [27, 17], [28, 24]], '#e0b84a');
      R(4, 22, 12, 5, '#8a6a2a'); R(16, 24, 12, 5, '#9a7a32');
      break;
    case 'workpants':
      P([[8, 3], [24, 3], [26, 29], [19, 29], [16, 12], [13, 29], [6, 29]], '#2f3c55');
      R(8, 3, 16, 3, '#25304a'); R(15, 4, 2, 6, '#1c2438'); R(7, 18, 6, 5, '#46557a'); R(19, 18, 6, 5, '#46557a');
      R(10, 7, 4, 3, '#25304a');
      break;
    case 'shinguard':
      P([[6, 4], [13, 4], [14, 26], [10, 29], [5, 26]], '#24262a'); P([[18, 4], [25, 4], [26, 26], [22, 29], [17, 26]], '#24262a');
      R(7, 8, 5, 14, '#5c626b'); R(19, 8, 5, 14, '#5c626b'); R(6, 10, 8, 1, '#8a6a2a'); R(18, 10, 8, 1, '#8a6a2a');
      R(6, 20, 8, 1, '#8a6a2a'); R(18, 20, 8, 1, '#8a6a2a');
      break;
    case 'noodle':
      P([[8, 9], [24, 9], [22, 28], [10, 28]], '#efe9dc'); R(8, 8, 16, 3, '#c94a3a'); R(10, 16, 12, 5, '#d99a2b'); R(9, 27, 14, 2, '#cfc8b8');
      break;
    case 'ricebox':
      P([[4, 14], [16, 8], [28, 14], [16, 20]], '#3a3330'); P([[4, 14], [16, 20], [16, 26], [4, 20]], '#2a2420'); P([[16, 20], [28, 14], [28, 20], [16, 26]], '#1f1a17');
      P([[7, 14], [16, 10], [21, 12], [12, 16]], '#f4f0e6'); P([[13, 16], [22, 12], [25, 14], [16, 18]], '#c9783a'); E(20, 15, 2, 1, '#5a9a4a');
      break;
    case 'plaster':
      P([[4, 20], [20, 4], [28, 12], [12, 28]], '#d9a87a'); P([[11, 13], [13, 11], [21, 19], [19, 21]], '#f2ead8');
      for (let k = 0; k < 4; k++) R(6 + k * 4, 18 - k * 4, 1, 1, '#b8865a');
      break;
    case 'painkiller':
      R(6, 8, 20, 16, '#cfd6dc'); R(6, 8, 20, 2, '#eef2f5');
      for (let y = 0; y < 2; y++) for (let x = 0; x < 3; x++) E(11 + x * 5, 14 + y * 6, 2, 2, '#f8f8f4');
      R(6, 22, 20, 2, '#8a96a0');
      break;
    case 'saline':
      P([[9, 6], [23, 6], [25, 28], [7, 28]], '#f2a24a'); R(10, 12, 12, 8, '#fff4e0'); R(13, 14, 6, 2, '#2f6fb8');
      break;
    case 'firstaid':
      R(5, 10, 22, 16, '#e8e2d6'); R(5, 10, 22, 2, '#fbfaf4'); R(13, 6, 6, 4, '#8a8478'); R(14, 13, 4, 10, '#c9302a'); R(11, 16, 10, 4, '#c9302a');
      break;
    case 'padthai': case 'khaoman': case 'noodlesoup': {
      E(16, 20, 13, 7, '#efe9dc'); E(16, 19, 10, 5, key === 'noodlesoup' ? '#b8662e' : '#f6f0e2');
      if (key === 'padthai') { E(16, 18, 8, 4, '#d9a04a'); R(12, 16, 3, 1, '#c94a3a'); R(18, 19, 3, 1, '#5a9a4a'); E(22, 17, 2, 1, '#e8d64a'); }
      if (key === 'khaoman') { E(13, 18, 5, 3, '#fbf8f0'); P([[16, 15], [24, 15], [24, 21], [16, 21]], '#e9c49a'); R(17, 16, 6, 1, '#d9a87a'); }
      if (key === 'noodlesoup') { for (let k = 0; k < 4; k++) R(10 + k * 3, 17, 1, 4, '#f2e2b0'); R(18, 16, 3, 2, '#5a9a4a'); }
      break;
    }
    case 'coffee': case 'thaitea':
      P([[9, 7], [23, 7], [21, 28], [11, 28]], key === 'coffee' ? '#7a4a2a' : '#e8873a'); R(8, 5, 16, 3, '#f4f0e6'); R(15, 1, 2, 5, '#c94a3a');
      R(11, 18, 10, 4, '#f4f0e6');
      break;
    case 'cake':
      P([[4, 20], [16, 12], [28, 20], [16, 26]], '#f4e6d0'); P([[4, 20], [16, 26], [16, 29], [4, 23]], '#d9a87a'); P([[16, 26], [28, 20], [28, 23], [16, 29]], '#c9905a');
      E(16, 16, 2, 2, '#c9302a');
      break;
    // ── 음식점 메뉴 (접시·그릇·컵 틀에 색만 바꾼다)
    case 'pizza':
      P([[6, 9], [27, 9], [16, 29]], '#e8b85a'); R(6, 7, 21, 3, '#c9883a'); E(12, 13, 2, 2, '#b8302a'); E(19, 14, 2, 2, '#b8302a'); E(16, 20, 2, 2, '#b8302a'); R(14, 11, 2, 1, '#4a8a3a');
      break;
    case 'burger':
      E(16, 11, 11, 6, '#d99a4a'); R(5, 14, 22, 3, '#5a9a3a'); R(5, 17, 22, 4, '#6a3a22'); R(6, 21, 20, 2, '#e8c84a'); E(16, 25, 11, 3, '#c9883a'); R(10, 8, 1, 1, '#f6e6b0'); R(17, 7, 1, 1, '#f6e6b0');
      break;
    case 'fries':
      for (let k = 0; k < 6; k++) R(9 + k * 2.5, 5 + (k % 3) * 2, 2, 12, '#f2cf5a');
      P([[7, 14], [25, 14], [23, 29], [9, 29]], '#c9302a'); R(12, 19, 8, 4, '#f4f0e6');
      break;
    case 'sandwich': case 'banhmi':
      if (key === 'banhmi') { E(16, 17, 13, 6, '#d9a04a'); R(5, 16, 22, 2, '#5a9a3a'); R(6, 18, 20, 1, '#c94a3a'); }
      else { P([[4, 22], [16, 8], [28, 22]], '#ecd9a8'); R(6, 20, 20, 2, '#5a9a3a'); R(6, 22, 20, 2, '#e8a0a0'); P([[4, 24], [28, 24], [28, 27], [4, 27]], '#ecd9a8'); }
      break;
    case 'taco': case 'burrito': case 'kebab':
      if (key === 'taco') { E(16, 20, 12, 9, '#e8c070'); E(16, 22, 9, 6, '#7a3a22'); R(9, 15, 14, 2, '#5a9a3a'); R(11, 14, 3, 1, '#c94a3a'); R(18, 14, 3, 1, '#f4e06a'); R(4, 22, 24, 7, 'rgba(0,0,0,0)'); }
      else { Ln(8, 26, 24, 8, 9, key === 'kebab' ? '#e8d6a8' : '#e8d2a0'); Ln(22, 10, 26, 6, 5, key === 'kebab' ? '#a0522a' : '#7a5a2a'); R(20, 9, 3, 2, '#5a9a3a'); }
      break;
    case 'sushi':
      for (const [x, y] of [[9, 17], [17, 13], [23, 19]] as [number, number][]) { E(x, y + 3, 5, 3, '#f4f0e6'); E(x, y, 5, 3, '#e8744a'); R(x - 1, y - 1, 2, 5, '#1c2a1c'); }
      break;
    case 'croissant':
      E(16, 18, 12, 7, '#d99a3a'); for (let k = -2; k <= 2; k++) R(16 + k * 4, 12, 1, 12, '#b8742a'); E(16, 16, 9, 4, '#e8b45a');
      break;
    case 'donut':
      E(16, 17, 12, 10, '#d9a050'); E(16, 15, 11, 8, '#e88aa8'); E(16, 16, 4, 3, 'rgba(0,0,0,0)'); g.clearRect(13, 14, 7, 5);
      for (const [x, y] of [[10, 12], [20, 11], [22, 18], [9, 19]] as [number, number][]) R(x, y, 2, 1, '#f4f0a0');
      break;
    case 'icecream':
      P([[10, 16], [22, 16], [16, 30]], '#d9a05a'); E(16, 12, 7, 6, '#f4e6e0'); E(12, 15, 4, 3, '#f4e6e0'); E(20, 15, 4, 3, '#f4e6e0'); E(16, 8, 3, 2, '#e88aa8');
      break;
    case 'lassi': case 'matcha': case 'bubbletea':
      P([[9, 7], [23, 7], [21, 28], [11, 28]], key === 'lassi' ? '#f6eed8' : key === 'matcha' ? '#8ab85a' : '#c9a07a'); R(8, 5, 16, 3, '#f4f0e6');
      if (key === 'bubbletea') { for (const [x, y] of [[13, 25], [17, 24], [19, 26], [15, 22]] as [number, number][]) E(x, y, 1.5, 1.5, '#2a1a12'); R(15, 1, 2, 5, '#e88aa8'); }
      break;
    case 'steak': case 'grilledfish': case 'eggtoast': case 'pancake': case 'hummus': case 'curry': case 'dimsum': case 'friedchicken': {
      E(16, 20, 14, 8, '#efe9dc'); E(16, 19, 11, 6, '#f8f4ea');
      if (key === 'steak') { E(15, 18, 8, 4, '#7a3a22'); R(10, 17, 9, 1, '#5a2a18'); R(22, 17, 3, 2, '#5a9a3a'); }
      if (key === 'grilledfish') { E(15, 18, 9, 3, '#a87a4a'); P([[23, 18], [28, 15], [28, 21]], '#a87a4a'); R(9, 17, 1, 1, '#1c1410'); }
      if (key === 'eggtoast') { R(8, 15, 9, 7, '#d9a04a'); E(21, 18, 5, 3.5, '#fbfaf4'); E(21, 18, 2, 2, '#f2c22a'); }
      if (key === 'pancake') { E(16, 19, 9, 3, '#d99a4a'); E(16, 17, 9, 3, '#e8b45a'); E(16, 15, 9, 3, '#e8b45a'); R(14, 12, 4, 2, '#fbf0c0'); }
      if (key === 'hummus') { E(13, 18, 6, 4, '#e8d6a0'); E(13, 18, 2, 1, '#c9a03a'); E(22, 17, 5, 3, '#e8c88a'); }
      if (key === 'curry') { E(12, 19, 6, 4, '#c97a2a'); E(21, 17, 6, 3, '#f0dca8'); R(18, 16, 1, 1, '#b8883a'); R(23, 17, 1, 1, '#b8883a'); }
      if (key === 'dimsum') { for (const [x, y] of [[11, 18], [17, 16], [21, 20]] as [number, number][]) { E(x, y, 4, 3, '#f4eedc'); R(x, y - 3, 1, 2, '#e0d6c0'); } }
      if (key === 'friedchicken') { E(13, 18, 5, 4, '#c97a2a'); E(20, 17, 5, 4, '#b8682a'); R(23, 13, 2, 4, '#f4eedc'); }
      break;
    }
    case 'pasta': case 'ramen': case 'pho': case 'bamee': case 'tomyum': case 'kimchistew': case 'tteok': case 'bibimbap': case 'biryani': case 'friedrice': case 'somtam': {
      const broth: Record<string, string> = { pasta: '#f2d88a', ramen: '#d9a86a', pho: '#e8d2a0', bamee: '#e8c070', tomyum: '#e8743a', kimchistew: '#c9402a', tteok: '#d9402a', bibimbap: '#f4f0e6', biryani: '#e8b85a', friedrice: '#e8c070', somtam: '#d9e2a0' };
      E(16, 20, 13, 7, key === 'bibimbap' || key === 'kimchistew' ? '#3a2a22' : '#efe9dc'); E(16, 19, 10, 5, broth[key]);
      if (key === 'pasta' || key === 'ramen' || key === 'pho' || key === 'bamee') for (let k = 0; k < 4; k++) R(10 + k * 3, 17, 1, 4, '#fbf0c0');
      if (key === 'pasta') E(16, 18, 4, 2, '#c94a3a');
      if (key === 'ramen') { E(20, 17, 2.5, 2, '#fbfaf4'); E(20, 17, 1, 1, '#f2b22a'); R(11, 16, 3, 2, '#5a9a4a'); }
      if (key === 'pho') { R(18, 16, 4, 2, '#8a4a3a'); R(11, 16, 3, 1, '#5a9a4a'); }
      if (key === 'tomyum') { E(13, 18, 2, 1.5, '#f2a07a'); E(19, 19, 2, 1.5, '#f2a07a'); R(16, 16, 3, 1, '#5a9a4a'); }
      if (key === 'kimchistew') { R(12, 17, 3, 2, '#f4f0e6'); R(18, 18, 3, 2, '#f4f0e6'); }
      if (key === 'tteok') for (let k = 0; k < 4; k++) R(10 + k * 3, 17 + (k % 2), 2, 3, '#f4e6d8');
      if (key === 'bibimbap') { R(10, 16, 4, 3, '#5a9a3a'); R(14, 18, 4, 2, '#e8743a'); R(18, 16, 4, 3, '#7a3a22'); E(16, 18, 2, 1.5, '#f2c22a'); }
      if (key === 'biryani' || key === 'friedrice') { for (let k = 0; k < 6; k++) R(9 + k * 3, 17 + (k % 2), 1, 1, key === 'biryani' ? '#c9702a' : '#5a9a4a'); }
      if (key === 'somtam') { for (let k = 0; k < 5; k++) R(10 + k * 3, 17, 2, 1, '#f2a03a'); E(20, 19, 1.5, 1.5, '#c9302a'); }
      break;
    }
    case 'boots':
      P([[6, 6], [16, 6], [17, 19], [28, 21], [29, 27], [5, 27]], '#5a3a22'); R(5, 27, 25, 3, '#1c1410');
      E(25, 23, 4, 3, '#7c8492'); R(7, 6, 9, 2, '#3a2416');
      for (let y = 10; y < 18; y += 3) R(11, y, 4, 1, '#c9b48a');
      break;
  }
  // 반투명 가장자리를 정리하고 1px 외곽선을 두른다
  const im = g.getImageData(0, 0, 32, 32);
  const d = im.data;
  for (let k = 3; k < d.length; k += 4) d[k] = d[k] > 110 ? 255 : 0;
  const solid = (x: number, y: number) => x >= 0 && y >= 0 && x < 32 && y < 32 && d[(y * 32 + x) * 4 + 3] > 0;
  const edge: number[] = [];
  for (let y = 0; y < 32; y++)
    for (let x = 0; x < 32; x++)
      if (!solid(x, y) && (solid(x - 1, y) || solid(x + 1, y) || solid(x, y - 1) || solid(x, y + 1))) edge.push(y * 32 + x);
  for (const p of edge) { d[p * 4] = OUTLINE[0]; d[p * 4 + 1] = OUTLINE[1]; d[p * 4 + 2] = OUTLINE[2]; d[p * 4 + 3] = 255; }
  g.putImageData(im, 0, 0);
  return c;
}

/** 먹을 수 있는 지옥 물건 (2층 층주 구르마가 받아먹는다). 붕대는 먹지 않는다 */
export const HELL_FOOD = ['lethe', 'ashcake', 'bloodfruit', 'bulgogichips', 'hjerky', 'hskewer', 'hstew'];
/** 지옥 괴물이 드물게 떨어뜨리는 물건: 층이 깊을수록 좋은 것이 섞인다 [물건, 무게] */
export const HELL_LOOT: Record<number, [string, number][]> = {
  1: [['lethe', 30], ['ashcake', 26], ['hbandage', 18], ['hgloves', 8], ['hdagger', 7], ['hhelm', 6], ['hshin', 5]],
  2: [['ashcake', 24], ['hbandage', 20], ['bloodfruit', 12], ['hhammer', 8], ['hboots', 8], ['hshin', 8], ['hhelm', 7], ['hgloves', 6], ['hspear', 4], ['hmaul', 2]],
  3: [['bloodfruit', 22], ['hbandage', 20], ['hstew', 14], ['hspear', 9], ['hvest', 8], ['hboots', 8], ['hhammer', 8], ['hsword', 5], ['hhelm', 6], ['hmaul', 3], ['hgreatsword', 2]],
};
export function rollLoot(floor: number, rnd = Math.random): string {
  const t = HELL_LOOT[Math.max(1, Math.min(3, floor))];
  let s = t.reduce((a, [, w]) => a + w, 0) * rnd();
  for (const [k, w] of t) { if ((s -= w) <= 0) return k; }
  return t[0][0];
}
