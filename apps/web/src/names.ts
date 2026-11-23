// 거리 간판 이름 — 실제 상호 대신 지어낸 이름. 건물마다 늘 같은 이름이 나오고, 언어마다 같은 뜻으로 바뀐다
import type { Category } from './zone.ts';
import type { Lang } from './i18n.ts';

// [한국어, 태국어, 영어]
const PREFIX: [string, string, string][] = [
  ['행운', 'โชคดี', 'Lucky'], ['황금', 'ทองคำ', 'Golden'], ['별빛', 'แสงดาว', 'Starlight'], ['달빛', 'แสงจันทร์', 'Moonlight'],
  ['코끼리', 'ช้างน้อย', 'Elephant'], ['망고', 'มะม่วง', 'Mango'], ['연꽃', 'ดอกบัว', 'Lotus'], ['파란 대문', 'ประตูฟ้า', 'Blue Door'],
  ['할머니', 'คุณยาย', "Grandma's"], ['미소', 'ยิ้มแย้ม', 'Smile'], ['바나나', 'กล้วยหอม', 'Banana'], ['장미', 'กุหลาบ', 'Rose'],
  ['비둘기', 'นกพิราบ', 'Pigeon'], ['대나무', 'ไผ่งาม', 'Bamboo'], ['붉은 등', 'โคมแดง', 'Red Lantern'], ['강변', 'ริมคลอง', 'Canal'],
  ['고양이', 'แมวเหมียว', 'Cat'], ['열대', 'ทรอปิคอล', 'Tropical'], ['새벽', 'รุ่งอรุณ', 'Dawn'], ['구름', 'ก้อนเมฆ', 'Cloud'],
];

// 업종 이름 [한국어, 태국어(이름 앞에 붙음), 영어]
const NOUN: Partial<Record<Category, [string, string, string][]>> = {
  convenience: [['마트', 'มินิมาร์ท', 'Mart'], ['24시', 'ร้าน 24 ชม.', '24/7']],
  pharmacy: [['약국', 'ร้านขายยา', 'Pharmacy']],
  clinic: [['의원', 'คลินิก', 'Clinic']],
  restaurant: [['식당', 'ร้านอาหาร', 'Kitchen'], ['국숫집', 'ก๋วยเตี๋ยว', 'Noodles'], ['밥집', 'ข้าวแกง', 'Rice House']],
  bar: [['바', 'บาร์', 'Bar'], ['펍', 'ผับ', 'Pub']],
  cafe: [['카페', 'คาเฟ่', 'Café'], ['커피', 'กาแฟ', 'Coffee']],
  bank: [['은행', 'ธนาคาร', 'Bank']],
  worship: [['사원', 'วัด', 'Temple']],
  school: [['학교', 'โรงเรียน', 'School']],
  hotel: [['호텔', 'โรงแรม', 'Hotel'], ['게스트하우스', 'เกสต์เฮาส์', 'Guesthouse']],
  laundry: [['세탁소', 'ร้านซักรีด', 'Laundry']],
  shop: [['상회', 'ร้าน', 'Store'], ['잡화점', 'ร้านค้า', 'Goods']],
  office: [['빌딩', 'อาคาร', 'Building'], ['타워', 'ทาวเวอร์', 'Tower']],
  condo: [['레지던스', 'เรสซิเดนซ์', 'Residence'], ['맨션', 'แมนชั่น', 'Mansion']],
};

function hash(a: number, b: number) {
  let h = Math.imul(a * 73856093 ^ b * 19349663, 2654435761);
  h ^= h >>> 15;
  return (h >>> 0) / 4294967295;
}

/** 건물 하나의 간판 이름 (정부시설·우주새는 빈칸) */
export function shopName(i0: number, j0: number, cat: Category, l: Lang): string {
  const nouns = NOUN[cat];
  if (!nouns) return '';
  const p = PREFIX[Math.floor(hash(i0, j0) * PREFIX.length)];
  const n = nouns[Math.floor(hash(j0 + 7, i0 + 3) * nouns.length)];
  if (l === 'th') return `${n[1]}${p[1]}`;
  if (l === 'en') return `${p[2]} ${n[2]}`;
  return `${p[0]} ${n[0]}`;
}

/** 일할 수 있는 업종 */
export const WORKPLACES: Category[] = ['convenience', 'pharmacy', 'clinic', 'restaurant', 'bar', 'cafe', 'bank', 'school', 'hotel', 'laundry', 'shop', 'office'];
