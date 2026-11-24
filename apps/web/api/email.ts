// 메일 API (Vercel 함수) — 이메일 인증과 비밀번호 다시 정하기
// POST /api/email  { action: 'verify', token, email, lang }      → 인증 메일 보내기
// POST /api/email  { action: 'reset', username, lang }           → 비밀번호 다시 정하기 메일 (인증된 이메일에만)
// POST /api/email  { action: 'resetDone', code, password }       → 새 비밀번호 저장
// GET  /api/email?v=코드                                           → 인증 링크를 누른 뒤 보이는 쪽
// 데이터베이스 함수(hm_email_*)는 MAILER_SECRET 없이는 아무것도 하지 않는다.
const SB_URL = 'https://jrqthrgahbrscmzyfknu.supabase.co';
// 공개용 키 (브라우저에도 있는 키)
const SB_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpycXRocmdhaGJyc2Ntenlma251Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTU0MzY3NDQsImV4cCI6MjExMTAxMjc0NH0.QOQaiMJXKp20JurcIQa8G0R2K8Q6bnPCNVlfJ6lhIk4';
const SITE = 'https://heavensmanual.com';
const FROM = "Heaven's Manual <no-reply@heavensmanual.com>";

type Lang = 'ko' | 'th' | 'en';
const T: Record<Lang, Record<string, string>> = {
  ko: {
    vSubject: "Heaven's Manual 이메일 인증", vHi: '{name} 님,', vBody: '아래 단추를 누르면 이 주소가 영혼에 묶입니다. 비밀번호를 잊었을 때 이 주소로 다시 정할 수 있어요.', vBtn: '이메일 인증하기', vFoot: '24시간 안에 눌러 주세요. 직접 요청하지 않았다면 이 메일은 지워도 됩니다.',
    rSubject: "Heaven's Manual 비밀번호 다시 정하기", rBody: '아이디 {id}의 비밀번호를 다시 정하려면 아래 단추를 누르세요.', rBtn: '새 비밀번호 정하기', rFoot: '1시간 안에 눌러 주세요. 요청한 적이 없다면 이 메일은 지워도 됩니다. 비밀번호는 바뀌지 않습니다.',
    okTitle: '이메일이 인증되었습니다', okBody: '이제 비밀번호를 잊어도 이 주소로 다시 정할 수 있어요.', badTitle: '링크가 맞지 않아요', badBody: '이미 쓴 링크이거나 시간이 지났어요. 게임의 영혼 설정에서 다시 보내 주세요.', back: '게임으로 돌아가기',
  },
  th: {
    vSubject: "ยืนยันอีเมล Heaven's Manual", vHi: 'คุณ {name}', vBody: 'กดปุ่มด้านล่างเพื่อผูกอีเมลนี้กับวิญญาณของคุณ หากลืมรหัสผ่าน จะตั้งใหม่ได้ด้วยอีเมลนี้', vBtn: 'ยืนยันอีเมล', vFoot: 'กรุณากดภายใน 24 ชั่วโมง หากไม่ได้ขอ ลบอีเมลนี้ได้เลย',
    rSubject: "ตั้งรหัสผ่านใหม่ Heaven's Manual", rBody: 'กดปุ่มด้านล่างเพื่อตั้งรหัสผ่านใหม่ของไอดี {id}', rBtn: 'ตั้งรหัสผ่านใหม่', rFoot: 'กรุณากดภายใน 1 ชั่วโมง หากไม่ได้ขอ ลบอีเมลนี้ได้เลย รหัสผ่านจะไม่เปลี่ยน',
    okTitle: 'ยืนยันอีเมลแล้ว', okBody: 'ต่อไปหากลืมรหัสผ่าน ตั้งใหม่ได้ด้วยอีเมลนี้', badTitle: 'ลิงก์ไม่ถูกต้อง', badBody: 'ลิงก์นี้ใช้แล้วหรือหมดเวลา กรุณาส่งใหม่จากการตั้งค่าวิญญาณในเกม', back: 'กลับไปที่เกม',
  },
  en: {
    vSubject: "Confirm your email for Heaven's Manual", vHi: 'Hello {name},', vBody: 'Press the button below to bind this address to your soul. If you forget your password, you can reset it with this address.', vBtn: 'Confirm email', vFoot: 'Please confirm within 24 hours. If you did not ask for this, you can delete this email.',
    rSubject: "Reset your Heaven's Manual password", rBody: 'Press the button below to set a new password for the ID {id}.', rBtn: 'Set a new password', rFoot: 'The link works for 1 hour. If you did not ask for this, delete this email. Your password stays the same.',
    okTitle: 'Email confirmed', okBody: 'From now on, if you forget your password you can reset it with this address.', badTitle: 'This link does not work', badBody: 'It was already used or has expired. Send a new one from Soul Settings in the game.', back: 'Back to the game',
  },
};
const langOf = (v: unknown, accept = ''): Lang => {
  const s = typeof v === 'string' && v ? v : accept.slice(0, 2).toLowerCase();
  return s === 'ko' || s === 'th' ? s : 'en';
};
const esc = (v: string) => v.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } });
}

async function rpc<T>(fn: string, args: Record<string, unknown>): Promise<T | null> {
  try {
    const r = await fetch(`${SB_URL}/rest/v1/rpc/${fn}`, { method: 'POST', headers: { apikey: SB_KEY, authorization: `Bearer ${SB_KEY}`, 'content-type': 'application/json' }, body: JSON.stringify(args) });
    if (!r.ok) return null;
    return (await r.json()) as T;
  } catch {
    return null;
  }
}

/** 메일 본문: 어두운 바탕 위 금빛 단추 하나 (메일 앱마다 깨지지 않게 표 대신 단순한 블록) */
function mailHtml(lang: Lang, title: string, lines: string[], btn: string, url: string, foot: string) {
  return `<!doctype html><html lang="${lang}"><body style="margin:0;padding:24px 12px;background:#14110f;font-family:-apple-system,'Segoe UI',Roboto,'Noto Sans KR','Noto Sans Thai',sans-serif;color:#efe6d4">
<div style="max-width:460px;margin:0 auto;background:#1e1814;border:1px solid #5a4528;border-radius:8px;padding:28px 24px">
<div style="font-size:13px;letter-spacing:.12em;color:#c9a23e;margin-bottom:14px">HEAVEN'S MANUAL</div>
<div style="font-size:19px;font-weight:700;margin-bottom:14px">${esc(title)}</div>
${lines.map((l) => `<p style="margin:0 0 12px;font-size:15px;line-height:1.6;color:#e2d8c4">${esc(l)}</p>`).join('')}
<a href="${url}" style="display:inline-block;margin:10px 0 18px;padding:12px 22px;background:#c9a23e;color:#1a120a;text-decoration:none;font-weight:700;border-radius:6px;font-size:15px">${esc(btn)}</a>
<p style="margin:0;font-size:12px;line-height:1.6;color:#9a8e7a">${esc(foot)}</p>
<p style="margin:14px 0 0;font-size:11px;color:#6e6456;word-break:break-all">${url}</p>
</div></body></html>`;
}

async function send(to: string, subject: string, html: string) {
  const key = process.env.RESEND_API_KEY;
  if (!key) return false;
  try {
    const r = await fetch('https://api.resend.com/emails', { method: 'POST', headers: { authorization: `Bearer ${key}`, 'content-type': 'application/json' }, body: JSON.stringify({ from: FROM, to: [to], subject, html }) });
    if (!r.ok) console.error('resend', r.status, (await r.text()).slice(0, 300));
    return r.ok;
  } catch (e) {
    console.error('resend', e);
    return false;
  }
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function POST(req: Request) {
  const secret = process.env.MAILER_SECRET ?? '';
  if (!secret) return json({ error: 'config' }, 503);
  let b: Record<string, unknown>;
  try { b = await req.json(); } catch { return json({ error: 'bad' }, 400); }
  const lang = langOf(b.lang, req.headers.get('accept-language') ?? '');
  const L = T[lang];
  if (b.action === 'verify') {
    const r = await rpc<{ code?: string; email?: string; name?: string; error?: string }>('hm_email_begin', { p_secret: secret, p_token: String(b.token ?? ''), p_email: String(b.email ?? '') });
    if (!r) return json({ error: 'net' }, 502);
    if (r.error || !r.code || !r.email) return json({ error: r.error ?? 'bad' });
    const url = `${SITE}/api/email?v=${r.code}&l=${lang}`;
    const ok = await send(r.email, L.vSubject, mailHtml(lang, L.vSubject, [L.vHi.replace('{name}', r.name ?? ''), L.vBody], L.vBtn, url, L.vFoot));
    return json(ok ? { ok: true, email: r.email } : { error: 'mail' });
  }
  if (b.action === 'reset') {
    const r = await rpc<{ code?: string; email?: string; username?: string; none?: boolean; error?: string }>('hm_reset_begin', { p_secret: secret, p_username: String(b.username ?? '') });
    if (!r) return json({ error: 'net' }, 502);
    if (r.error === 'wait') return json({ error: 'wait' });
    // 있는 아이디인지 알려 주지 않는다 (없거나 인증 전이어도 같은 대답)
    if (r.code && r.email) {
      const url = `${SITE}/?reset=${r.code}`;
      await send(r.email, L.rSubject, mailHtml(lang, L.rSubject, [L.rBody.replace('{id}', r.username ?? '')], L.rBtn, url, L.rFoot));
    } else await sleep(400);
    return json({ ok: true });
  }
  if (b.action === 'resetDone') {
    const r = await rpc<{ ok?: boolean; username?: string; error?: string }>('hm_reset_finish', { p_secret: secret, p_code: String(b.code ?? ''), p_password: String(b.password ?? '') });
    if (!r) return json({ error: 'net' }, 502);
    return json(r.ok ? { ok: true, username: r.username } : { error: r.error ?? 'bad' });
  }
  return json({ error: 'bad' }, 400);
}

export async function GET(req: Request) {
  const u = new URL(req.url);
  const lang = langOf(u.searchParams.get('l'), req.headers.get('accept-language') ?? '');
  const L = T[lang];
  const secret = process.env.MAILER_SECRET ?? '';
  const code = u.searchParams.get('v') ?? '';
  const r = secret && /^[0-9a-f]{48}$/.test(code) ? await rpc<{ ok?: boolean; error?: string }>('hm_email_confirm', { p_secret: secret, p_code: code }) : null;
  const ok = !!r?.ok;
  const html = `<!doctype html><html lang="${lang}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(ok ? L.okTitle : L.badTitle)} · Heaven's Manual</title><link rel="icon" href="/favicon.svg"></head>
<body style="margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;background:#14110f;font-family:-apple-system,'Segoe UI',Roboto,'Noto Sans KR','Noto Sans Thai',sans-serif;color:#efe6d4">
<div style="max-width:420px;margin:16px;padding:30px 26px;background:#1e1814;border:1px solid #5a4528;border-radius:8px;text-align:center">
<div style="font-size:12px;letter-spacing:.14em;color:#c9a23e;margin-bottom:14px">HEAVEN'S MANUAL</div>
<h1 style="font-size:20px;margin:0 0 12px">${esc(ok ? L.okTitle : L.badTitle)}</h1>
<p style="font-size:15px;line-height:1.6;color:#d8ceb8;margin:0 0 22px">${esc(ok ? L.okBody : L.badBody)}</p>
<a href="/" style="display:inline-block;padding:11px 20px;background:#c9a23e;color:#1a120a;text-decoration:none;font-weight:700;border-radius:6px">${esc(L.back)}</a>
</div></body></html>`;
  return new Response(html, { status: ok ? 200 : 400, headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' } });
}
