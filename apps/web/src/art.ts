// 42차: 그림 파일(sprites · sprites3x · zones)의 캐시를 앱과 떼어 놓는다.
// 빌드할 때마다 art-manifest.json 에 파일마다 내용의 지문(짧은 해시)을 적고, 그림은 '?v=지문'을 붙여 받는다.
// 서비스 워커는 이 그림들을 앱 버전과 상관없는 따로 된 캐시에 두므로, 배포해도 바뀌지 않은 그림은 다시 받지 않는다 (바뀐 그림만 새로).
let man: Promise<Record<string, string>> | null = null;
export function artManifest(): Promise<Record<string, string>> {
  return (man ??= fetch('./art-manifest.json', { cache: 'no-cache' }).then((r) => (r.ok ? r.json() : {})).catch(() => ({})));
}
/** 'sprites/b-m1-casual-u.png' → './sprites/b-m1-casual-u.png?v=1a2b3c4d' (지문이 없으면 그대로) */
export async function artUrl(path: string): Promise<string> {
  const v = (await artManifest())[path];
  return v ? `./${path}?v=${v}` : `./${path}`;
}
