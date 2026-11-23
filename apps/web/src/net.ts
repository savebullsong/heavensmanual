// 서버: 아이디·비밀번호 가입과 저장 (Supabase 함수), 같은 동네 사람들 실시간 (Supabase Realtime)
// 표는 직접 못 읽는다. 모든 것은 hm_* 함수로만 (비밀번호는 서버에서 bcrypt로 바꿔 보관).
import { createClient, type RealtimeChannel } from '@supabase/supabase-js';
import type { RemoteInfo, NetPos } from './world.ts';

const URL = 'https://jrqthrgahbrscmzyfknu.supabase.co';
// 공개용 키 (브라우저에 드러나도 되는 키. 표 접근은 막혀 있고 함수만 부를 수 있다)
const KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpycXRocmdhaGJyc2Ntenlma251Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTU0MzY3NDQsImV4cCI6MjExMTAxMjc0NH0.QOQaiMJXKp20JurcIQa8G0R2K8Q6bnPCNVlfJ6lhIk4';
const sb = createClient(URL, KEY, { auth: { persistSession: false, autoRefreshToken: false } });

const ACC = 'heavensmanual.account';
export interface Account { token: string; username: string }
export function account(): Account | null {
  try { return JSON.parse(localStorage.getItem(ACC) ?? 'null'); } catch { return null; }
}
function setAccount(a: Account | null) {
  try { if (a) localStorage.setItem(ACC, JSON.stringify(a)); else localStorage.removeItem(ACC); } catch { /* 무시 */ }
}
/** 비회원의 떠돌이 번호 (실시간에서 나를 구분) */
function guestId() {
  try {
    let g = localStorage.getItem('heavensmanual.guest');
    if (!g) { g = 'g-' + Math.random().toString(36).slice(2, 10); localStorage.setItem('heavensmanual.guest', g); }
    return g;
  } catch { return 'g-' + Math.random().toString(36).slice(2, 10); }
}
export function myId() {
  return account()?.username ?? guestId();
}

type Err = 'bad_id' | 'bad_pw' | 'taken' | 'bad' | 'wait' | 'net' | 'session';
async function rpc<T>(fn: string, args: Record<string, unknown>): Promise<T | { error: Err }> {
  try {
    const { data, error } = await sb.rpc(fn, args);
    if (error) return { error: 'net' };
    return data as T;
  } catch {
    return { error: 'net' };
  }
}

export async function register(username: string, password: string, save: unknown) {
  const r = await rpc<{ token: string; username: string; error?: Err }>('hm_register', { p_username: username, p_password: password, p_save: save });
  if ('token' in r && r.token) setAccount({ token: r.token, username: r.username });
  return r;
}
export async function login(username: string, password: string) {
  const r = await rpc<{ token: string; username: string; save: unknown; error?: Err }>('hm_login', { p_username: username, p_password: password });
  if ('token' in r && r.token) setAccount({ token: r.token, username: r.username });
  return r;
}
export async function logout() {
  const a = account();
  if (a) await rpc('hm_logout', { p_token: a.token });
  setAccount(null);
}
export async function loadServer() {
  const a = account();
  if (!a) return null;
  const r = await rpc<{ username: string; save: unknown; profile: { intro?: string; contact?: string }; email: string | null; error?: Err }>('hm_load', { p_token: a.token });
  if ('error' in r && r.error === 'session') setAccount(null);
  return 'error' in r && r.error ? null : r;
}
let lastSaved = '';
/** 서버 저장 (바뀐 것이 있을 때만) */
export async function pushSave(save: unknown, force = false) {
  const a = account();
  if (!a) return false;
  const s = JSON.stringify(save);
  if (!force && s === lastSaved) return true;
  const r = await rpc<boolean>('hm_save', { p_token: a.token, p_save: save });
  if (r === true) lastSaved = s;
  return r === true;
}
export async function setProfile(intro: string, contact: string, email: string) {
  const a = account();
  if (!a) return false;
  return (await rpc<boolean>('hm_profile_set', { p_token: a.token, p_intro: intro, p_contact: contact, p_email: email })) === true;
}
export async function getProfile(username: string) {
  const r = await rpc<{ username: string; rank: number; intro: string | null; contact: string | null } | null>('hm_profile_get', { p_username: username });
  return r && !('error' in r) ? r : null;
}
export async function report(target: string, reason: string) {
  const a = account();
  if (!a) return false;
  return (await rpc<boolean>('hm_report', { p_token: a.token, p_target: target, p_reason: reason })) === true;
}

// ───────────────────────── 실시간: 같은 동네 사람들 ─────────────────────────
let channel: RealtimeChannel | null = null;
let timer = 0;
let lastTrack = 0;
/** 옷·무기가 바뀌었을 때 바로 알린다 */
export function nudge() { lastTrack = 0; }
export function joinZone(zoneId: string, me: () => { info: RemoteInfo; pos: NetPos } | null, onPeer: (id: string, info: RemoteInfo | null, pos: NetPos | null) => void, onLeave: (id: string) => void) {
  leaveZone();
  const id = myId();
  const ch = sb.channel(`zone:${zoneId}`, { config: { presence: { key: id }, broadcast: { self: false } } });
  channel = ch;
  const fromPresence = () => {
    const st = ch.presenceState() as Record<string, { info: RemoteInfo; pos: NetPos }[]>;
    for (const [pid, metas] of Object.entries(st)) {
      if (pid === id || !metas.length) continue;
      const m = metas[metas.length - 1];
      onPeer(pid, m.info, m.pos);
    }
  };
  ch.on('presence', { event: 'sync' }, fromPresence);
  ch.on('presence', { event: 'leave' }, ({ key }) => { if (key !== id) onLeave(key); });
  ch.on('broadcast', { event: 'p' }, ({ payload }) => { if (payload?.id && payload.id !== id) onPeer(payload.id, null, payload.pos); });
  let lastPos = '';
  lastTrack = 0;
  ch.subscribe((status) => {
    if (status !== 'SUBSCRIBED') return;
    const tick = () => {
      const m = me();
      if (!m) return;
      const s = JSON.stringify(m.pos);
      const now = Date.now();
      if (now - lastTrack > 6000) { lastTrack = now; ch.track(m); }
      if (s !== lastPos) { lastPos = s; ch.send({ type: 'broadcast', event: 'p', payload: { id, pos: m.pos } }); }
    };
    tick();
    timer = window.setInterval(tick, 200);
  });
}
export function leaveZone() {
  if (timer) clearInterval(timer);
  timer = 0;
  if (channel) sb.removeChannel(channel);
  channel = null;
}
