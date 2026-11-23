// 인물 그림 API 확인: Blob 저장소를 메모리로 바꿔 끼워 돌린다
// node --experimental-test-module-mocks --experimental-strip-types --test test/portraits.test.mjs
import { test, mock } from 'node:test';
import assert from 'node:assert/strict';
const store = new Map();
let n = 0;
mock.module('@vercel/blob', {
  namedExports: {
    async put(path, body, opt) {
      if (store.has(path) && !opt.allowOverwrite) throw new Error('exists');
      const buf = typeof body === 'string' ? Buffer.from(body) : Buffer.from(body);
      store.set(path, { buf, type: opt.contentType });
      return { url: `https://store.example/${path}`, pathname: path };
    },
    async get(path) {
      const v = store.get(path);
      if (!v) return null;
      return { statusCode: 200, stream: new Response(v.buf).body, headers: new Headers(), blob: {} };
    },
    async del(url) { store.delete(url.replace('https://store.example/', '')); },
  },
});
process.env.ADMIN_PASSWORD = 'secret-pass';
const api = await import('../api/portraits.ts');
const R = (method, q, headers = {}, body) => new Request(`https://x.test/api/portraits${q}`, { method, headers, body });

test('portrait api', async () => {
  let r = await api.GET();
  assert.deepEqual(await r.json(), { slots: {} });
  r = await api.POST(R('POST', '?check=1', { 'x-admin-key': 'wrong' }));
  assert.equal(r.status, 401);
  r = await api.POST(R('POST', '?check=1', { 'x-admin-key': 'secret-pass' }));
  assert.equal(r.status, 200);
  r = await api.POST(R('POST', '?slot=nobody', { 'x-admin-key': 'secret-pass', 'content-type': 'image/webp' }, new Uint8Array([1, 2])));
  assert.equal(r.status, 400);
  r = await api.POST(R('POST', '?slot=miss-hwang', { 'x-admin-key': 'secret-pass', 'content-type': 'text/html' }, 'x'));
  assert.equal(r.status, 415);
  r = await api.POST(R('POST', '?slot=miss-hwang', { 'x-admin-key': 'secret-pass', 'content-type': 'image/webp' }, new Uint8Array([1, 2, 3])));
  const j1 = await r.json();
  assert.equal(r.status, 200);
  r = await api.GET();
  assert.equal((await r.json()).slots['miss-hwang'], j1.url);
  await new Promise((res) => setTimeout(res, 5));
  r = await api.POST(R('POST', '?slot=miss-hwang', { 'x-admin-key': 'secret-pass', 'content-type': 'image/png' }, new Uint8Array([4, 5])));
  const j2 = await r.json();
  assert.notEqual(j1.url, j2.url);
  assert.equal(store.has(j1.url.replace('https://store.example/', '')), false, 'old image deleted');
  r = await api.DELETE(R('DELETE', '?slot=miss-hwang', { 'x-admin-key': 'secret-pass' }));
  assert.equal(r.status, 200);
  r = await api.GET();
  assert.deepEqual((await r.json()).slots, {});
  assert.equal([...store.keys()].filter((k) => k !== 'portraits/manifest.json').length, 0);
});
