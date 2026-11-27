// 홈 화면 설치용. 그림(sprites·zones)은 한 번 받으면 기기에 남겨 다음부터 빨리 연다
const CACHE = 'hm-v47';
// 음악은 한 번 받으면 업데이트와 상관없이 계속 기기에 둔다 (곡을 바꾸면 파일 이름을 바꾼다)
const AUDIO = 'hm-audio-1';
// 42차: 그림(sprites · sprites3x · zones)은 앱 버전과 떼어 놓은 캐시에 — '?v=지문'이 같은 그림은 배포해도 다시 받지 않는다.
// 새 버전이 들어설 때 지문표(art-manifest.json)에 없는 옛 그림만 지운다
const ART = 'hm-art-1';
const ART_RE = /\/(sprites|sprites3x|zones)\//;
self.addEventListener('install', (e) => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil((async () => {
  const ks = await caches.keys();
  await Promise.all(ks.filter((k) => k !== CACHE && k !== AUDIO && k !== ART).map((k) => caches.delete(k)));
  try {
    const man = await fetch('./art-manifest.json', { cache: 'no-cache' }).then((r) => (r.ok ? r.json() : null));
    if (man) {
      const c = await caches.open(ART);
      for (const req of await c.keys()) {
        const u = new URL(req.url), m = /\/((?:sprites|sprites3x|zones)\/[^/?]+)$/.exec(u.pathname);
        if (!m || man[m[1]] !== u.searchParams.get('v')) await c.delete(req);
      }
    }
  } catch { /* 다음에 */ }
  await self.clients.claim();
})()));
self.addEventListener('fetch', (e) => {
  const u = new URL(e.request.url);
  if (e.request.method !== 'GET' || u.origin !== location.origin) return;
  if (u.pathname.includes('/audio/')) {
    e.respondWith(caches.open(AUDIO).then(async (c) => {
      const hit = await c.match(e.request, { ignoreSearch: true });
      if (hit) return hit;
      const r = await fetch(e.request);
      if (r.ok && r.status === 200) c.put(e.request, r.clone());
      return r;
    }));
    return;
  }
  if (ART_RE.test(u.pathname) && u.searchParams.has('v')) {
    // 지문이 붙은 그림: 캐시에 있으면 그대로 (내용이 바뀌면 지문이 바뀌어 다른 주소가 된다)
    e.respondWith(caches.open(ART).then(async (c) => {
      const hit = await c.match(e.request);
      if (hit) return hit;
      const r = await fetch(e.request);
      if (r.ok && r.status === 200) c.put(e.request, r.clone());
      return r;
    }));
    return;
  }
  if (ART_RE.test(u.pathname)) {
    e.respondWith(caches.open(CACHE).then(async (c) => {
      const hit = await c.match(e.request);
      const net = fetch(e.request).then((r) => { if (r.ok) c.put(e.request, r.clone()); return r; }).catch(() => hit);
      return hit || net;
    }));
  }
});
