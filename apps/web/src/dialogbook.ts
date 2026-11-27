// 42차: 관리자 '대화문 내려받기' — 게임 안의 말을 인물·몹별로 모아 글 파일 하나로.
// 내려받을 때마다 지금 판의 글귀(i18n)에서 새로 모으므로, 인물의 말이 바뀌면 파일도 저절로 바뀐다.
import { dictFor, type Lang } from './i18n.ts';

/** 인물 · 몹 → 글귀 열쇠 (앞에서부터 처음 맞는 곳에 넣는다) */
const GROUPS: [string, RegExp][] = [
  ['미스 황 (현실 우주새 점원)', /^(clerk|greet|react|pick(Prompt|Goods|Weapon|Armor)|noMoney|goEarn|hwang|ask|cage|stash|vault|diary|nav|steal)/],
  ['앵무새', /^parrot/],
  ['황혼 (지옥 유황새)', /^hw(?!ang)/],
  ['황색날개 (천국 안내천사)', /^yw/],
  ['루엔 (천국 환생관)', /^(off|officer)/],
  ['환생관 할아버지', /^grandpa/],
  ['파샤르 (지옥 로비 환생관)', /^(lobby|pashar)/],
  ['다음 생 상담', /^nl/],
  ['염소대왕', /^gk/],
  ['환전상 오볼로', /^xch/],
  ['칼드렉 (4층 대장장이)', /^(ferum|kald)/],
  ['대장간 · 수리 · 강화', /^(smith|repair|dura|enh|renh|tembra|asm|wreck)/],
  ['베스크 (3층 대부업자)', /^(besk|loan|debt)/],
  ['탈루스 (2층 노름꾼)', /^talus/],
  ['구르마 (2층 층주)', /^(gurma|ford|toll)/],
  ['마스크 팔이 소녀', /^mask/],
  ['서큐버스', /^(succ|suc)/],
  ['아큐버스', /^acc/],
  ['유내', /^yunae/],
  ['유내 미용실 원장', /^ys/],
  ['불다 · 경계의 해변', /^(bulda|border|born|void)/],
  ['지옥 경비병 · 켈베로스', /^(guard|warden|kerb|kerberos)/],
  ['속죄의 회당', /^(atone|absolve)/],
  ['지옥 은행 · 현실 은행', /^(hbank|bank)/],
  ['지옥 장사꾼 · 호텔', /^(vendor|butcher|junk|hotel)/],
  ['천국 사람들 (천사 · 요리사 · 설교자 · 택시 · 침대)', /^(heaven|angel|chef|preach|ceremony|taxi|admire|admirer|terrace|cloud|ship|card|sleeper|arcade|idol)/],
  ['거리의 적 (불량배 · 취객 · 강도 · 마피아 · 소매치기 · 권투꾼 · 수금원)', /^(thug|drunk|robber|mafia|pickpocket|boxer|enforcer|brawl|shade|agent)/],
  ['행인 · 관광객', /^(passer|tourist|help|thanks|street|massage|bar|elder|soul|monk|stiff|other)/],
  ['대식자', /^(suturer|eater)/],
  ['현실의 검은 염소', /^goat/],
  ['필드 보스', /^fb/],
  ['지옥 · 습격 · 괴물', /^(hell|raid|invasion|torture|boss)/],
  ['죽음 · 건너가는 길', /^(death|judge|pass|refuse|life|risingHeaven|fallingHell|karma)/],
];
type V = string | V[] | { [k: string]: V };
function lines(key: string, v: V, out: string[], pad = '') {
  if (typeof v === 'string') { out.push(`${pad}[${key}] ${v.replace(/\n/g, ' / ')}`); return; }
  if (Array.isArray(v)) {
    out.push(`${pad}[${key}]`);
    const walk = (a: V[], pre: string) => a.forEach((x, i) => {
      const n = pre ? `${pre}-${i + 1}` : String(i + 1);
      if (typeof x === 'string') out.push(`${pad}  ${n}. ${x.replace(/\n/g, ' / ')}`);
      else if (Array.isArray(x)) walk(x, n);
      else for (const [k2, v2] of Object.entries(x)) lines(`${key}.${n}.${k2}`, v2, out, pad + '  ');
    });
    walk(v, '');
    return;
  }
  for (const [k2, v2] of Object.entries(v)) lines(`${key}.${k2}`, v2, out, pad);
}
const NAME: Record<Lang, string> = { ko: '한국어', th: 'ภาษาไทย', en: 'English' };
/** 대화문 한 벌 (langs 여러 개면 열쇠마다 언어를 나란히) */
export function dialogBook(langs: Lang[]): string {
  const dicts = langs.map((l) => dictFor(l) as unknown as Record<string, V>);
  const keys = Object.keys(dicts[0]);
  const used = new Set<string>();
  const out: string[] = [];
  const day = new Date().toISOString().slice(0, 10);
  out.push(`Heaven's Manual 대화문 · ${day} · ${langs.map((l) => NAME[l]).join(' / ')}`);
  out.push('인물·몹별로 게임 안의 말을 모았습니다. 고칠 때는 [열쇠]는 그대로 두고 그 뒤의 글만 고쳐 주세요. {n} {item} 같은 괄호는 게임이 채우는 자리입니다.');
  out.push('');
  const section = (title: string, ks: string[]) => {
    if (!ks.length) return;
    out.push('', `■ ${title} (${ks.length})`, '');
    for (const k of ks) {
      if (langs.length === 1) lines(k, dicts[0][k], out);
      else dicts.forEach((d, i) => { if (d[k] !== undefined) lines(`${k} · ${langs[i]}`, d[k], out); });
      if (langs.length > 1) out.push('');
    }
  };
  for (const [title, re] of GROUPS) {
    const ks = keys.filter((k) => !used.has(k) && re.test(k));
    ks.forEach((k) => used.add(k));
    section(title, ks);
  }
  // 어느 인물에도 묶이지 않은 말 (여러 줄짜리 글만 — 단추 이름 같은 화면 글은 뺀다)
  const rest = keys.filter((k) => !used.has(k) && Array.isArray(dicts[0][k]) && (dicts[0][k] as V[]).some((x) => typeof x !== 'string' || x.length > 12));
  section('그 밖의 말 (분류 전)', rest);
  return out.join('\n');
}
