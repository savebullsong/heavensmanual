// 서버: 아이디·비밀번호 가입과 저장 (Supabase 함수), 같은 동네 사람들 실시간 (Supabase Realtime)
// 표는 직접 못 읽는다. 모든 것은 hm_* 함수로만 (비밀번호는 서버에서 bcrypt로 바꿔 보관).
import { createClient, type RealtimeChannel } from '@supabase/supabase-js';
import type { RemoteInfo, NetPos } from './world.ts';

const URL = 'https://jrqthrgahbrscmzyfknu.supabase.co';
// 공개용 키 (브라우저에 드러나도 되는 키. 표 접근은 막혀 있고 함수만 부를 수 있다)
const KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpycXRocmdhaGJyc2Ntenlma251Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTU0MzY3NDQsImV4cCI6MjExMTAxMjc0NH0.QOQaiMJXKp20JurcIQa8G0R2K8Q6bnPCNVlfJ6lhIk4';
const sb = createClient(URL, KEY, { auth: { persistSession: false, autoRefreshToken: false } });

const ACC = 'heavensmanual.account';
export interface Account { token: string; username: string; name?: string; admin?: boolean }
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
const LOOP = (() => { try { return new URLSearchParams(location.search).has('loopnet'); } catch { return false; } })();
let loopId = '';
export function myId() {
  // 시험용 (?loopnet): 탭마다 다른 사람
  if (LOOP) return (loopId ||= `loop-${Math.random().toString(36).slice(2, 7)}`);
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
  const r = await rpc<{ username: string; name: string | null; save: unknown; profile: { intro?: string; contact?: string }; email: string | null; email_verified: boolean; admin?: boolean; error?: Err }>('hm_load', { p_token: a.token });
  if ('error' in r && r.error === 'session') setAccount(null);
  if ('error' in r && r.error) return null;
  const ok = r as { username: string; name: string | null; save: unknown; profile: { intro?: string; contact?: string }; email: string | null; email_verified: boolean; admin?: boolean };
  // 게임 속 이름과 관리자 지정은 기기에도 적어 둔다
  if ((ok.name ?? undefined) !== a.name || !!ok.admin !== !!a.admin) setAccount({ ...a, name: ok.name ?? undefined, admin: !!ok.admin || undefined });
  return ok;
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
/** 게임 속 이름 짓기·바꾸기 */
export async function setName(name: string): Promise<{ name?: string; error?: string; days?: number }> {
  const a = account();
  if (!a) return { error: 'session' };
  const r = await rpc<{ name?: string; error?: string; days?: number }>('hm_name_set', { p_token: a.token, p_name: name });
  if ('name' in r && r.name) setAccount({ ...a, name: r.name });
  return r as { name?: string; error?: string; days?: number };
}
/** 비밀번호 바꾸기 (지금 비밀번호 확인) */
export async function setPassword(oldPw: string, newPw: string): Promise<{ ok?: boolean; error?: string }> {
  const a = account();
  if (!a) return { error: 'session' };
  return (await rpc<{ ok?: boolean; error?: string }>('hm_password_set', { p_token: a.token, p_old: oldPw, p_new: newPw })) as { ok?: boolean; error?: string };
}
/** 메일 함수 (인증 메일 · 비밀번호 다시 정하기) */
async function mail(body: Record<string, unknown>): Promise<{ ok?: boolean; error?: string; email?: string; username?: string }> {
  try {
    const r = await fetch('/api/email', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
    return await r.json();
  } catch {
    return { error: 'net' };
  }
}
export function sendVerify(email: string, lang: string) {
  const a = account();
  if (!a) return Promise.resolve({ error: 'session' } as { ok?: boolean; error?: string; email?: string });
  return mail({ action: 'verify', token: a.token, email, lang });
}
export const requestReset = (username: string, lang: string) => mail({ action: 'reset', username, lang });
export const finishReset = (code: string, password: string) => mail({ action: 'resetDone', code, password });

export async function getProfile(username: string) {
  const r = await rpc<{ username: string; name: string | null; rank: number; intro: string | null; contact: string | null } | null>('hm_profile_get', { p_username: username });
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
/** 사람끼리 싸움 (PvP): 맞은 쪽 기기가 자기 체력을 계산한다 (때린 쪽은 '때렸다'만 알린다) */
export interface PvpHooks {
  hit(from: string, dmg: number, crit: boolean, kind: string): void;
  down(victim: string, by: string, cash: number, wasCriminal: boolean): void;
}
let pvp: PvpHooks | null = null;
export function sendHit(to: string, dmg: number, crit: boolean, kind: string) {
  channel?.send({ type: 'broadcast', event: 'hit', payload: { from: myId(), to, dmg, crit, kind } });
}
export function sendDown(by: string, cash: number, wasCriminal: boolean) {
  channel?.send({ type: 'broadcast', event: 'down', payload: { id: myId(), by, cash, crim: wasCriminal } });
}
// ───────────────────────── 41차: 같은 구역의 몹은 한 사람(방장)이 계산해 나눈다 ─────────────────────────
// 방장 = 이 구역에 가장 먼저 들어온 사람 (같은 때면 아이디 순). 방장 기기가 몹·행인을 움직이고 0.2초마다 모두에게 나눠 준다.
// 손님은 그 몹을 비춰 그리고, 때리면 '때렸다'만 방장에게 알린다. 나중에 전용 서버(C안)가 방장 자리를 대신한다.
export interface MobHooks {
  /** 방장이 정해졌다 · 바뀌었다 (peers = 나 말고 같은 구역 사람 수) */
  role(host: boolean, hostId: string, peers: number): void;
  /** 방장 → 모두: 몹 위치·동작 */
  snap(host: string, l: unknown[]): void;
  /** 방장 → 모두: 몹 생김새 (새로 나왔거나 바뀐 것) */
  desc(host: string, l: unknown[]): void;
  /** 손님 → 방장: 모르는 몹의 생김새를 달라 */
  req(from: string, ids: number[]): void;
  /** 손님 → 방장: 이 몹을 때렸다 */
  hit(from: string, id: number, dmg: number, crit: boolean, kind: string): void;
  /** 방장 → 손님: 몹이 나를 쳤다 */
  strike(id: number, dmg: number, crit: boolean, kind: string): void;
  /** 방장 → 모두: 몹이 쓰러졌다 (by = 쓰러뜨린 사람) */
  kill(id: number, by: string): void;
}
let mob: MobHooks | null = null;
let joinedAt = 0;
const peerSince = new Map<string, number>();
let curHost = '';
let roleKey = '';
function computeHost() {
  const id = myId();
  let best = id, bs = joinedAt;
  for (const [pid, s] of peerSince) if (s < bs || (s === bs && pid < best)) { best = pid; bs = s; }
  curHost = best;
  const k = `${best}|${peerSince.size}`;
  if (k !== roleKey) { roleKey = k; mob?.role(best === id, best, peerSince.size); }
}
export function hostId() { return curHost; }
export function isHost() { return !!curHost && curHost === myId(); }
function bsend(event: string, payload: unknown) { channel?.send({ type: 'broadcast', event, payload }); }
export function sendMobSnap(l: unknown[]) { bsend('ms', { h: myId(), l }); }
export function sendMobDesc(l: unknown[]) { bsend('md', { h: myId(), l }); }
export function sendMobReq(ids: number[]) { bsend('mq', { from: myId(), to: curHost, ids: ids.slice(0, 80) }); }
export function sendMobHit(id: number, dmg: number, crit: boolean, kind: string) { bsend('mh', { from: myId(), to: curHost, id, dmg, crit, kind }); }
export function sendMobStrike(to: string, id: number, dmg: number, crit: boolean, kind: string) { bsend('mx', { h: myId(), to, id, dmg, crit, kind }); }
export function sendMobKill(id: number, by: string) { bsend('mk', { h: myId(), id, by }); }

/** 시험용 (?loopnet): 같은 브라우저의 탭끼리 BroadcastChannel로 서로 보이고 싸운다 (서버 없이 PvP 확인) */
function loopChannel(name: string, key: string) {
  const bc = new BroadcastChannel(`hm-${name}`);
  const state: Record<string, unknown[]> = {};
  const subs: { type: string; ev: string; cb: (x: any) => void }[] = [];
  const fire = (type: string, ev: string, arg: unknown) => subs.filter((x) => x.type === type && x.ev === ev).forEach((x) => x.cb(arg));
  bc.onmessage = (e) => {
    const m = e.data;
    if (m.k === 'track') { const fresh = !state[m.key]; state[m.key] = [m.meta]; fire('presence', 'sync', {}); if (fresh) bc.postMessage({ k: 'track', key, meta: mine }); }
    else if (m.k === 'leave') { delete state[m.key]; fire('presence', 'leave', { key: m.key }); }
    else if (m.k === 'b') fire('broadcast', m.event, { payload: m.payload });
  };
  let mine: unknown = null;
  addEventListener('pagehide', () => bc.postMessage({ k: 'leave', key }));
  const ch = {
    presenceState: () => state,
    on(type: string, f: { event: string }, cb: (x: any) => void) { subs.push({ type, ev: f.event, cb }); return ch; },
    subscribe(cb: (s: string) => void) { setTimeout(() => cb('SUBSCRIBED'), 0); return ch; },
    track(m: unknown) { mine = m; bc.postMessage({ k: 'track', key, meta: m }); },
    send(m: { event: string; payload: unknown }) { bc.postMessage({ k: 'b', event: m.event, payload: m.payload }); },
    close() { bc.postMessage({ k: 'leave', key }); bc.close(); },
  };
  return ch;
}

export function joinZone(zoneId: string, me: () => { info: RemoteInfo; pos: NetPos; alone?: boolean } | null, onPeer: (id: string, info: RemoteInfo | null, pos: NetPos | null) => void, onLeave: (id: string) => void, hooks?: PvpHooks, mobHooks?: MobHooks) {
  pvp = hooks ?? null;
  leaveZone();
  mob = mobHooks ?? null;
  joinedAt = Date.now();
  const id = myId();
  const ch = (LOOP ? loopChannel(`zone:${zoneId}`, id) : sb.channel(`zone:${zoneId}`, { config: { presence: { key: id }, broadcast: { self: false } } })) as ReturnType<typeof sb.channel>;
  channel = ch;
  const fromPresence = () => {
    const st = ch.presenceState() as Record<string, { info: RemoteInfo; pos: NetPos }[]>;
    for (const [pid, metas] of Object.entries(st)) {
      if (pid === id || !metas.length) continue;
      const m = metas[metas.length - 1] as { info: RemoteInfo; pos: NetPos; since?: number };
      onPeer(pid, m.info, m.pos);
      // 41차: 방장 고르기 — 들어온 때를 함께 싣는다 (옛 판의 사람은 방장이 되지 않는다)
      peerSince.set(pid, typeof m.since === 'number' ? m.since : Number.MAX_SAFE_INTEGER);
    }
    for (const pid of [...peerSince.keys()]) if (!st[pid]?.length) peerSince.delete(pid);
    computeHost();
  };
  ch.on('presence', { event: 'sync' }, fromPresence);
  ch.on('presence', { event: 'leave' }, ({ key }) => { if (key !== id) { onLeave(key); peerSince.delete(key); computeHost(); } });
  ch.on('broadcast', { event: 'p' }, ({ payload }) => { if (payload?.id && payload.id !== id) onPeer(payload.id, null, payload.pos); });
  ch.on('broadcast', { event: 'hit' }, ({ payload }) => {
    if (!payload || payload.to !== id || typeof payload.dmg !== 'number') return;
    pvp?.hit(String(payload.from), Math.max(0, Math.min(400, payload.dmg)), !!payload.crit, String(payload.kind ?? 'fist'));
  });
  ch.on('broadcast', { event: 'down' }, ({ payload }) => {
    if (!payload?.id || payload.id === id) return;
    pvp?.down(String(payload.id), String(payload.by), Math.max(0, Math.min(100000, Number(payload.cash) || 0)), !!payload.crim);
  });
  // 41차: 몹 나누기 (방장 ↔ 손님)
  const num = (v: unknown, lo: number, hi: number) => Math.max(lo, Math.min(hi, Number(v) || 0));
  ch.on('broadcast', { event: 'ms' }, ({ payload }) => { if (payload?.h && payload.h === curHost && !isHost() && Array.isArray(payload.l)) mob?.snap(payload.h, payload.l); });
  ch.on('broadcast', { event: 'md' }, ({ payload }) => { if (payload?.h && payload.h === curHost && !isHost() && Array.isArray(payload.l)) mob?.desc(payload.h, payload.l); });
  ch.on('broadcast', { event: 'mq' }, ({ payload }) => { if (payload?.to === id && isHost() && Array.isArray(payload.ids)) mob?.req(String(payload.from), payload.ids.map(Number).filter(Number.isFinite)); });
  ch.on('broadcast', { event: 'mh' }, ({ payload }) => { if (payload?.to === id && isHost() && payload.from) mob?.hit(String(payload.from), num(payload.id, 0, 1e9), num(payload.dmg, 0, 400), !!payload.crit, String(payload.kind ?? 'fist')); });
  ch.on('broadcast', { event: 'mx' }, ({ payload }) => { if (payload?.to === id && payload.h === curHost) mob?.strike(num(payload.id, 0, 1e9), num(payload.dmg, 0, 400), !!payload.crit, String(payload.kind ?? 'fist')); });
  ch.on('broadcast', { event: 'mk' }, ({ payload }) => { if (payload?.h && payload.h === curHost) mob?.kill(num(payload.id, 0, 1e9), String(payload.by ?? '')); });
  let lastPos = '';
  lastTrack = 0;
  ch.subscribe((status) => {
    if (status !== 'SUBSCRIBED') return;
    computeHost(); // 혼자면 내가 방장
    // 42차: 위치를 0.2초마다 보내지 않는다 — 가는 곳(목적지) · 동작 · 체력 · 표시가 바뀔 때만, 걷는 동안은 3초마다 한 번 확인
    //   (둘레 40칸에 아무도 없으면 6초마다). 멈추면 멈춘 자리를 한 번. 옛 판의 사람도 받아서 걸을 수 있다 (x·y가 함께 간다)
    let lastSent = 0, lastKey = '', lastStill = '';
    const tick = () => {
      const m = me();
      if (!m) return;
      const now = Date.now();
      if (now - lastTrack > 6000) { lastTrack = now; ch.track({ info: m.info, pos: m.pos, since: joinedAt }); }
      const p = m.pos;
      const key = JSON.stringify({ ...p, x: 0, y: 0, d: p.m ? 0 : p.d });
      const still = p.m ? '' : `${p.x},${p.y},${p.d}`;
      const beat = p.m ? (m.alone ? 6000 : 3000) : Infinity;
      if (key !== lastKey || (still && still !== lastStill) || now - lastSent > beat) {
        lastKey = key; lastStill = still; lastSent = now;
        lastPos = JSON.stringify(p);
        ch.send({ type: 'broadcast', event: 'p', payload: { id, pos: p } });
      }
    };
    tick();
    timer = window.setInterval(tick, 200);
  });
}
export function leaveZone() {
  peerSince.clear(); curHost = ''; roleKey = '';
  if (timer) clearInterval(timer);
  timer = 0;
  if (channel) { if (LOOP) (channel as unknown as { close(): void }).close(); else sb.removeChannel(channel); }
  channel = null;
}
