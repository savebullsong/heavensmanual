// 인물 그림 API (Vercel 함수)
// GET    /api/portraits              → { slots: { 칸: 그림 주소 } }  관리자가 바꾼 그림만
// POST   /api/portraits?check=1      → 비밀번호 확인
// POST   /api/portraits?slot=칸      → 본문(이미지)으로 그림 교체      [x-admin-key 필요]
// DELETE /api/portraits?slot=칸      → 기본 그림으로 되돌리기          [x-admin-key 필요]
import { put, del, get } from '@vercel/blob';
import { createHash, timingSafeEqual } from 'node:crypto';

const SLOTS = ['miss-hwang', 'yellow-wing', 'hwanghon', 'parrot', 'luen', 'pashar', 'goat-king', 'besk', 'sprite-miss-hwang', 'sprite-hwanghon', 'sprite-parrot', 'sprite-parrot-up'];
const MANIFEST = 'portraits/manifest.json';
const TYPES: Record<string, string> = { 'image/webp': 'webp', 'image/png': 'png', 'image/jpeg': 'jpg' };
const MAX_BYTES = 4 * 1024 * 1024;

interface Manifest {
  slots: Record<string, { url: string; at: number }>;
}

async function readManifest(): Promise<Manifest> {
  const r = await get(MANIFEST, { access: 'public', useCache: false });
  if (!r || r.statusCode !== 200 || !r.stream) return { slots: {} };
  try {
    const j = JSON.parse(await new Response(r.stream).text());
    return { slots: j && typeof j.slots === 'object' ? j.slots : {} };
  } catch {
    return { slots: {} };
  }
}

async function writeManifest(m: Manifest) {
  await put(MANIFEST, JSON.stringify(m), { access: 'public', contentType: 'application/json', addRandomSuffix: false, allowOverwrite: true, cacheControlMaxAge: 60 });
}

function authorized(req: Request): boolean {
  const want = process.env.ADMIN_PASSWORD;
  if (!want) return false;
  const got = req.headers.get('x-admin-key') ?? '';
  const a = createHash('sha256').update(got).digest();
  const b = createHash('sha256').update(want).digest();
  return timingSafeEqual(a, b);
}

function json(body: unknown, status = 200, cache = 'no-store') {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': cache } });
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function deny() {
  await sleep(800); // 비밀번호 대입을 느리게
  return json({ error: 'unauthorized' }, 401);
}

export async function GET() {
  try {
    const m = await readManifest();
    const slots = Object.fromEntries(Object.entries(m.slots).map(([k, v]) => [k, v.url]));
    return json({ slots }, 200, 'public, max-age=0, s-maxage=30, stale-while-revalidate=600');
  } catch {
    return json({ slots: {} });
  }
}

export async function POST(req: Request) {
  if (!authorized(req)) return deny();
  const url = new URL(req.url);
  if (url.searchParams.get('check') === '1') return json({ ok: true });
  const slot = url.searchParams.get('slot') ?? '';
  if (!SLOTS.includes(slot)) return json({ error: 'unknown slot' }, 400);
  const type = (req.headers.get('content-type') ?? '').split(';')[0].trim().toLowerCase();
  const ext = TYPES[type];
  if (!ext) return json({ error: 'webp, png, jpeg only' }, 415);
  const body = Buffer.from(await req.arrayBuffer());
  if (!body.length || body.length > MAX_BYTES) return json({ error: 'image too large' }, 413);
  try {
    const blob = await put(`portraits/${slot}-${Date.now()}.${ext}`, body, { access: 'public', contentType: type, addRandomSuffix: false, cacheControlMaxAge: 31536000 });
    const m = await readManifest();
    const old = m.slots[slot]?.url;
    m.slots[slot] = { url: blob.url, at: Date.now() };
    await writeManifest(m);
    if (old) await del(old).catch(() => undefined);
    return json({ ok: true, url: blob.url });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : 'storage error' }, 500);
  }
}

export async function DELETE(req: Request) {
  if (!authorized(req)) return deny();
  const slot = new URL(req.url).searchParams.get('slot') ?? '';
  if (!SLOTS.includes(slot)) return json({ error: 'unknown slot' }, 400);
  try {
    const m = await readManifest();
    const old = m.slots[slot]?.url;
    delete m.slots[slot];
    await writeManifest(m);
    if (old) await del(old).catch(() => undefined);
    return json({ ok: true });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : 'storage error' }, 500);
  }
}
