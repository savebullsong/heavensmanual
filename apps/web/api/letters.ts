// 49차 편지 API (Vercel 함수) — 관리자 페이지 비밀번호(x-admin-key)가 있어야 한다
// GET  /api/letters?before=ID             → { letters: [...], total, open }  (최근 50통씩)
// POST /api/letters  { id, reply }         → 답을 적는다 (빈 글이면 답을 지운다)
// POST /api/letters  { id, del: true }     → 편지를 지운다
// 게임 안에서는 답이 온다는 안내가 없다. 답은 그 사람의 '보낸 편지' 아래에 조용히 보일 뿐이다
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
  const before = Number(new URL(req.url).searchParams.get('before') ?? '') || null;
  return json(await rpc('hm_letter_admin_list', { p_secret: secret, p_before: before }));
}

export async function POST(req: Request) {
  if (!authorized(req)) return json({ error: 'denied' }, 401);
  const secret = process.env.MAILER_SECRET ?? '';
  if (!secret) return json({ error: 'config' }, 503);
  let b: { id?: number; reply?: string; del?: boolean };
  try { b = await req.json(); } catch { return json({ error: 'bad' }, 400); }
  const id = Number(b.id);
  if (!Number.isFinite(id) || id <= 0) return json({ error: 'bad' }, 400);
  if (b.del) return json(await rpc('hm_letter_admin_delete', { p_secret: secret, p_id: id }));
  return json(await rpc('hm_letter_admin_reply', { p_secret: secret, p_id: id, p_reply: String(b.reply ?? '').slice(0, 1000) }));
}
