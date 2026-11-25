// 게임 시간 = 현실 시간. 지역마다 그 도시의 현재 시각을 쓴다.
// 주소에 ?hour=21 을 붙이면 그 시각으로 미리보기 (개발용)
const forced = (() => {
  try {
    const v = new URLSearchParams(location.search).get('hour');
    return v === null ? null : Number(v);
  } catch {
    return null;
  }
})();

export function bangkokClock(): { h: number; m: number; label: string } {
  if (forced !== null && !Number.isNaN(forced)) {
    const h = Math.floor(forced) % 24, m = Math.round((forced % 1) * 60);
    return { h, m, label: `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}` };
  }
  // 22차: 매 프레임 불려서 서식기(Intl)를 한 번만 만들고, 같은 초 안에서는 지난 값을 그대로 쓴다
  const now = Date.now(), sec = Math.floor(now / 1000);
  if (last && sec === lastSec) return last;
  fmt ??= new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Bangkok', hour: '2-digit', minute: '2-digit', hour12: false });
  const parts = fmt.formatToParts(new Date(now));
  const h = Number(parts.find((p) => p.type === 'hour')!.value) % 24;
  const m = Number(parts.find((p) => p.type === 'minute')!.value);
  lastSec = sec;
  last = { h, m, label: `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}` };
  return last;
}
let fmt: Intl.DateTimeFormat | null = null;
let last: { h: number; m: number; label: string } | null = null;
let lastSec = -1;

/** 0 = 한낮, 1 = 한밤 */
export function nightFactor(h: number, m: number): number {
  const tt = h + m / 60;
  if (tt >= 7 && tt <= 17) return 0;
  if (tt > 17 && tt < 19.5) return (tt - 17) / 2.5;
  if (tt >= 19.5 || tt < 5) return 1;
  return 1 - (tt - 5) / 2;
}
