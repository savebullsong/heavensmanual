// 홈 화면 설치용. 그림(sprites·zones)은 한 번 받으면 기기에 남겨 다음부터 빨리 연다
const CACHE = 'hm-v19';
// 음악은 한 번 받으면 업데이트와 상관없이 계속 기기에 둔다 (곡을 바꾸면 파일 이름을 바꾼다)
const AUDIO = 'hm-audio-1';
self.addEventListener('install', (e) => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE && k !== AUDIO).map((k) => caches.delete(k)))).then(() => self.clients.claim())));
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
  if (u.pathname.includes('/sprites/') || u.pathname.includes('/zones/')) {
    e.respondWith(caches.open(CACHE).then(async (c) => {
      const hit = await c.match(e.request);
      const net = fetch(e.request).then((r) => { if (r.ok) c.put(e.request, r.clone()); return r; }).catch(() => hit);
      return hit || net;
    }));
  }
});
