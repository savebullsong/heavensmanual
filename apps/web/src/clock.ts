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
  const parts = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Bangkok', hour: '2-digit', minute: '2-digit', hour12: false }).formatToParts(new Date());
  const h = Number(parts.find((p) => p.type === 'hour')!.value) % 24;
  const m = Number(parts.find((p) => p.type === 'minute')!.value);
  return { h, m, label: `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}` };
}

/** 0 = 한낮, 1 = 한밤 */
export function nightFactor(h: number, m: number): number {
  const tt = h + m / 60;
  if (tt >= 7 && tt <= 17) return 0;
  if (tt > 17 && tt < 19.5) return (tt - 17) / 2.5;
  if (tt >= 19.5 || tt < 5) return 1;
  return 1 - (tt - 5) / 2;
}
