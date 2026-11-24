// 관리자 캐릭터 API (Vercel 함수) — 관리자 페이지 비밀번호(x-admin-key)가 있어야 한다
// GET  /api/admins                       → { admins: [{ username, name }] }
// POST /api/admins  { username, on }      → 그 아이디를 관리자 캐릭터로 지정·해제
// 관리자 캐릭터는 게임 안 '영혼 설정'에서 투명해질 수 있다 (몹이 알아보지 못함, 지도 확인용). 다른 특권은 없다.
import { createHash, timingSafeEqual } from 'node:crypto';

const SB_URL = 'https://jrqthrgahbrscmzyfknu.supabase.co';
// 공개용 키 (브라우저에도 있는 키). 실제 권한은 MAILER_SECRET(서버 비밀)으로만 생긴다
const SB_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpycXRocmdhaGJyc2Ntenlma251Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTU0MzY3NDQsImV4cCI6MjExMTAxMjc0NH0.QOQaiMJXKp20JurcIQa8G0R2K8Q6bnPCNVlfJ6lhIk4';

function authorized(req: Request): boolean {
  const want = process.env.ADMIN_PASSWORD;
  if (!want) return false;
  const got = req.headers.get('x-admin-key') ?? '';
  const a = createHash('sha256').update(got).digest();
  const b = createHash('sha256').update(want).digest();
  return timingSafeEqual(a, b);
}
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } });

async function rpc(fn: string, args: Record<string, unknown>) {
  const r = await fetch(`${SB_URL}/rest/v1/rpc/${fn}`, { method: 'POST', headers: { apikey: SB_KEY, authorization: `Bearer ${SB_KEY}`, 'content-type': 'application/json' }, body: JSON.stringify(args) });
  if (!r.ok) return { error: `db ${r.status}` };
  return (await r.json()) as Record<string, unknown>;
}

export async function GET(req: Request) {
  if (!authorized(req)) return json({ error: 'denied' }, 401);
  const secret = process.env.MAILER_SECRET ?? '';
  if (!secret) return json({ error: 'config' }, 503);
  return json(await rpc('hm_admin_list', { p_secret: secret }));
}

export async function POST(req: Request) {
  if (!authorized(req)) return json({ error: 'denied' }, 401);
  const secret = process.env.MAILER_SECRET ?? '';
  if (!secret) return json({ error: 'config' }, 503);
  let b: { username?: string; on?: boolean };
  try { b = await req.json(); } catch { return json({ error: 'bad' }, 400); }
  const username = String(b.username ?? '').trim().toLowerCase();
  if (!/^[a-z0-9_]{4,16}$/.test(username)) return json({ error: 'bad_id' }, 400);
  return json(await rpc('hm_admin_set', { p_secret: secret, p_username: username, p_on: !!b.on }));
}
