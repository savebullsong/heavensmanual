// 이 브라우저에만 남는 가벼운 저장 (서버 저장은 1단계-B에서)
import type { Look } from './character.ts';
import type { Lang } from './i18n.ts';

export interface Save {
  look?: Look;
  visits: number;
  lang?: Lang;
}
const KEY = 'heavensmanual.save.v1';

export function load(): Save {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return { visits: 0, ...JSON.parse(raw) };
  } catch {
    /* 저장소를 쓸 수 없는 환경 */
  }
  return { visits: 0 };
}

export function save(s: Save) {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    /* 무시 */
  }
}
