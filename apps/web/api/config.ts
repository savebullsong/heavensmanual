// 50차 게임 설정 API (Vercel 함수) — 관리자 페이지 비밀번호(x-admin-key)가 있어야 고칠 수 있다
// GET  /api/config?key=drops            → 지금 설정 (없으면 {})
// POST /api/config  { key, data }       → 저장 (key: drops · bank)
import { createHash, timingSafeEqual } from 'node:crypto';

const SB_URL = 'https://jrqthrgahbrscmzyfknu.supabase.co';
// 공개용 키 (브라우저에도 있는 키). 실제 권한은 MAILER_SECRET(서버 비밀)으로만 생긴다
const SB_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpycXRocmdhaGJyc2Ntenlma251Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTU0MzY3NDQsImV4cCI6MjExMTAxMjc0NH0.QOQaiMJXKp20JurcIQa8G0R2K8Q6bnPCNVlfJ6lhIk4';

function authorized(req: Request): boolean {
  const want = process.env.ADMIN_PASSWORD;
  if (!want) return false;
  const got = req.headers.get('x-admin-key') ?? '';
  return timingSafeEqual(createHash('sha256').update(got).digest(), createHash('sha256').update(want).digest());
}
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } });
async function rpc(fn: string, args: Record<string, unknown>) {
  const r = await fetch(`${SB_URL}/rest/v1/rpc/${fn}`, { method: 'POST', headers: { apikey: SB_KEY, authorization: `Bearer ${SB_KEY}`, 'content-type': 'application/json' }, body: JSON.stringify(args) });
  if (!r.ok) return { error: `db ${r.status}` };
  return (await r.json()) as unknown;
}
const KEYS = new Set(['drops', 'bank']);

export async function GET(req: Request) {
  if (!authorized(req)) return json({ error: 'denied' }, 401);
  const key = new URL(req.url).searchParams.get('key') ?? '';
  if (!KEYS.has(key)) return json({ error: 'bad' }, 400);
  return json(await rpc('hm_config_get', { p_key: key }));
}

export async function POST(req: Request) {
  if (!authorized(req)) return json({ error: 'denied' }, 401);
  const secret = process.env.MAILER_SECRET ?? '';
  if (!secret) return json({ error: 'config' }, 503);
  let b: { key?: string; data?: unknown };
  try { b = await req.json(); } catch { return json({ error: 'bad' }, 400); }
  if (!b.key || !KEYS.has(b.key) || typeof b.data !== 'object' || b.data === null) return json({ error: 'bad' }, 400);
  return json(await rpc('hm_config_set', { p_secret: secret, p_key: b.key, p_data: b.data }));
}
