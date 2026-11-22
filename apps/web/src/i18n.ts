// 다국어: 방문자 기기 언어를 먼저 보여 준다 (한국어 · 태국어 · 영어)
export type Lang = 'ko' | 'th' | 'en';
export const LANGS: Lang[] = ['ko', 'th', 'en'];

const dict = {
  ko: {
    shopName: '우주새',
    clerk: '미스 황',
    greet: '어서 오세요, 우주새입니다. 마음에 드는 물건을 골라 보세요.',
    greetAgain: '또 오셨네요. 오늘은 다른 물건도 들어왔어요.',
    picked: '{item}… 좋은 선택이에요. 그런데 지갑이 비어 있네요.',
    goEarn: '돈이 없으면 나가서 돈을 버세요.',
    exit: '나가기',
    wallet: '지갑',
    items: { cola: '콜라', chips: '감자칩', snack: '과자', choco: '초콜릿', knife: '식칼', bat: '야구 배트', hammer: '장도리' },
    createTitle: '거리로 나가기 전에',
    sex: '성별', female: '여성', male: '남성',
    build: '체격', builds: ['마름', '보통', '건장'],
    skin: '피부',
    hair: '헤어', hairs: ['짧은 머리', '옆가르마', '단발', '긴 머리', '포니테일', '삭발'],
    hairColor: '머리색',
    top: '상의', bottom: '하의',
    turn: '돌려 보기',
    editLook: '외형 바꾸기',
    confirm: '거리로 나가기',
    bkk: '방콕',
    rank: '영격',
    hint: '땅을 눌러 이동 · 우주새 간판을 누르면 상점으로',
    honk: '빵!',
    cats: { convenience: '편의점', pharmacy: '약국', clinic: '병원', restaurant: '식당', bar: '바', cafe: '카페', bank: '은행', worship: '종교시설', school: '학교', hotel: '호텔', laundry: '세탁소', shop: '상점', office: '오피스', condo: '콘도', ujusae: '우주새', generic: '' },
    zones: { 'bkk-sukhumvit-asok': '수쿰빗 · 나나–아속–프롬퐁', 'bkk-sukhumvit-test': '수쿰빗 시험 구역' } as Record<string, string>,
    loading: '거리를 불러오는 중…',
  },
  th: {
    shopName: 'Cosmic Bird',
    clerk: 'มิสฮวัง',
    greet: 'ยินดีต้อนรับสู่ Cosmic Bird ค่ะ เลือกของที่ถูกใจได้เลยนะคะ',
    greetAgain: 'มาอีกแล้วนะคะ วันนี้มีของใหม่เข้ามาด้วยค่ะ',
    picked: '{item}… เลือกได้ดีค่ะ แต่กระเป๋าเงินว่างเปล่านะคะ',
    goEarn: 'ถ้าไม่มีเงิน ก็ออกไปหาเงินมาสิคะ',
    exit: 'ออกไปข้างนอก',
    wallet: 'กระเป๋าเงิน',
    items: { cola: 'โคล่า', chips: 'มันฝรั่งทอด', snack: 'ขนม', choco: 'ช็อกโกแลต', knife: 'มีดทำครัว', bat: 'ไม้เบสบอล', hammer: 'ค้อนหงอน' },
    createTitle: 'ก่อนออกไปที่ถนน',
    sex: 'เพศ', female: 'หญิง', male: 'ชาย',
    build: 'รูปร่าง', builds: ['ผอม', 'ปกติ', 'ล่ำ'],
    skin: 'สีผิว',
    hair: 'ทรงผม', hairs: ['ผมสั้น', 'แสกข้าง', 'บ๊อบ', 'ผมยาว', 'หางม้า', 'เกรียน'],
    hairColor: 'สีผม',
    top: 'เสื้อ', bottom: 'กางเกง',
    turn: 'หมุนดู',
    editLook: 'เปลี่ยนรูปลักษณ์',
    confirm: 'ออกไปที่ถนน',
    bkk: 'กรุงเทพฯ',
    rank: 'ระดับวิญญาณ',
    hint: 'แตะพื้นเพื่อเดิน · แตะป้าย Cosmic Bird เพื่อเข้าร้าน',
    honk: 'ปี๊น!',
    cats: { convenience: 'ร้านสะดวกซื้อ', pharmacy: 'ร้านขายยา', clinic: 'คลินิก', restaurant: 'ร้านอาหาร', bar: 'บาร์', cafe: 'คาเฟ่', bank: 'ธนาคาร', worship: 'ศาสนสถาน', school: 'โรงเรียน', hotel: 'โรงแรม', laundry: 'ร้านซักรีด', shop: 'ร้านค้า', office: 'ออฟฟิศ', condo: 'คอนโด', ujusae: 'Cosmic Bird', generic: '' },
    zones: { 'bkk-sukhumvit-asok': 'สุขุมวิท · นานา–อโศก–พร้อมพงษ์', 'bkk-sukhumvit-test': 'สุขุมวิท พื้นที่ทดสอบ' } as Record<string, string>,
    loading: 'กำลังโหลดถนน…',
  },
  en: {
    shopName: 'Cosmic Bird',
    clerk: 'Miss Hwang',
    greet: 'Welcome to Cosmic Bird. Pick anything you like.',
    greetAgain: 'Back again? New things came in today.',
    picked: '{item}… a fine choice. But your wallet is empty.',
    goEarn: 'If you have no money, go out and earn some.',
    exit: 'Go outside',
    wallet: 'Wallet',
    items: { cola: 'Cola', chips: 'Potato chips', snack: 'Snack', choco: 'Chocolate', knife: 'Kitchen knife', bat: 'Baseball bat', hammer: 'Claw hammer' },
    createTitle: 'Before you step outside',
    sex: 'Sex', female: 'Female', male: 'Male',
    build: 'Build', builds: ['Slim', 'Average', 'Sturdy'],
    skin: 'Skin',
    hair: 'Hair', hairs: ['Short', 'Side part', 'Bob', 'Long', 'Ponytail', 'Buzz cut'],
    hairColor: 'Hair color',
    top: 'Top', bottom: 'Bottom',
    turn: 'Turn around',
    editLook: 'Change look',
    confirm: 'Step outside',
    bkk: 'Bangkok',
    rank: 'Soul Rank',
    hint: 'Tap the ground to walk · tap the Cosmic Bird sign to enter the shop',
    honk: 'Honk!',
    cats: { convenience: 'Convenience', pharmacy: 'Pharmacy', clinic: 'Clinic', restaurant: 'Restaurant', bar: 'Bar', cafe: 'Cafe', bank: 'Bank', worship: 'Worship', school: 'School', hotel: 'Hotel', laundry: 'Laundry', shop: 'Shop', office: 'Office', condo: 'Condo', ujusae: 'Cosmic Bird', generic: '' },
    zones: { 'bkk-sukhumvit-asok': 'Sukhumvit · Nana–Asok–Phrom Phong', 'bkk-sukhumvit-test': 'Sukhumvit test zone' } as Record<string, string>,
    loading: 'Loading the street…',
  },
};

export type Dict = (typeof dict)['ko'];

function deviceLang(): Lang {
  const list = (navigator.languages && navigator.languages.length ? navigator.languages : [navigator.language]) as string[];
  for (const l of list) {
    const base = l.toLowerCase().slice(0, 2);
    if ((LANGS as string[]).includes(base)) return base as Lang;
  }
  return 'en';
}

let current: Lang = deviceLang();
export function lang(): Lang {
  return current;
}
export function setLang(l: Lang) {
  current = l;
}
export function t(): Dict {
  return dict[current] as Dict;
}
