// 효과음: 파일 없이 Web Audio로 그 자리에서 만든다 (저작권·용량 걱정 없음).
// 휘두르는 바람 소리, 맨손·둔기·칼날 타격음, 총소리, 쓰러지는 소리.
// 소리는 내 캐릭터에서 멀수록 작게, 화면 왼쪽·오른쪽에 따라 좌우로 나뉜다.

export type HitKind = 'fist' | 'blunt' | 'blade' | 'gun';
/** 맞는 쪽의 몸: 같은 무기라도 대상마다 소리가 다르다 */
export type Body = 'flesh' | 'thug' | 'suturer' | 'monster' | 'player' | 'ash' | 'pret' | 'yak' | 'bones';

const BLADES = new Set(['knife', 'dagger', 'sword', 'hatchet', 'needle', 'pickaxe', 'cleaver', 'hook', 'skewer', 'boathook', 'fireaxe', 'greatsword']);
export function hitKind(weapon: string | null | undefined, ranged = false): HitKind {
  if (ranged || weapon === 'pistol') return 'gun';
  if (!weapon) return 'fist';
  return BLADES.has(weapon) ? 'blade' : 'blunt';
}

const KEY = 'heavensmanual.sfx';
let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let noiseBuf: AudioBuffer | null = null;
let muted = (() => { try { return localStorage.getItem(KEY) === 'off'; } catch { return false; } })();

export function isMuted() { return muted; }
export function setMuted(m: boolean) {
  muted = m;
  try { localStorage.setItem(KEY, m ? 'off' : 'on'); } catch { /* 저장 못 해도 그만 */ }
  if (master) master.gain.value = m ? 0 : 0.55;
}

/** 배경 소리도 같은 AudioContext를 쓴다 (효과음 끄기와는 따로) */
export function audioContext(): AudioContext | null { return ctx; }
export function noiseBuffer(): AudioBuffer | null { return noiseBuf; }
const unlockListeners: (() => void)[] = [];
export function onUnlock(f: () => void) { unlockListeners.push(f); if (ctx && ctx.state === 'running') f(); }

/** 브라우저는 사용자가 한 번 누른 뒤에야 소리를 허락한다 */
export function unlockAudio() {
  if (!ctx) {
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = muted ? 0 : 0.55;
    // 한꺼번에 여러 소리가 겹쳐도 찢어지지 않게
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -14; comp.ratio.value = 6;
    master.connect(comp).connect(ctx.destination);
    const n = ctx.sampleRate;
    noiseBuf = ctx.createBuffer(1, n, n);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
  }
  if (ctx.state === 'suspended') void ctx.resume().then(() => unlockListeners.forEach((f) => f()));
  else if (!unlocked) unlockListeners.forEach((f) => f());
  unlocked = true;
}
let unlocked = false;

interface Spot { pan: number; vol: number }
/** 화면에서의 위치(내 캐릭터 기준 픽셀)로 좌우·크기를 정한다 */
export function spot(dx: number, dy: number): Spot {
  const d = Math.hypot(dx, dy * 2);
  return { pan: Math.max(-0.8, Math.min(0.8, dx / 320)), vol: 1 / (1 + d / 220) };
}

function out(s: Spot, gain: number) {
  const g = ctx!.createGain();
  g.gain.value = gain * s.vol;
  const p = ctx!.createStereoPanner();
  p.pan.value = s.pan;
  g.connect(p).connect(master!);
  return g;
}
function noise(dest: AudioNode, t: number, dur: number, type: BiquadFilterType, f0: number, f1: number, q: number, peak: number, attack = 0.004) {
  const src = ctx!.createBufferSource();
  src.buffer = noiseBuf;
  src.playbackRate.value = 0.9 + Math.random() * 0.2;
  const f = ctx!.createBiquadFilter();
  f.type = type; f.Q.value = q;
  f.frequency.setValueAtTime(f0, t);
  f.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
  const g = ctx!.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(peak, t + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.connect(f).connect(g).connect(dest);
  src.start(t, Math.random() * 0.5, dur + 0.05);
}
function tone(dest: AudioNode, t: number, dur: number, type: OscillatorType, f0: number, f1: number, peak: number) {
  const o = ctx!.createOscillator();
  o.type = type;
  o.frequency.setValueAtTime(f0, t);
  o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
  const g = ctx!.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(peak, t + 0.005);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(dest);
  o.start(t); o.stop(t + dur + 0.02);
}
const ready = () => !!ctx && ctx.state === 'running' && !muted;
const jit = (x: number, r = 0.08) => x * (1 - r + Math.random() * r * 2);

/** 휘두르는 바람 소리 (맨손은 짧고 가볍게, 둔기는 낮고 굵게, 칼은 높고 날카롭게) */
export function swing(kind: HitKind, s: Spot) {
  if (!ready() || kind === 'gun') return;
  const t = ctx!.currentTime, o = out(s, 1);
  if (kind === 'fist') noise(o, t, 0.12, 'bandpass', jit(700), jit(1500), 1.2, 0.25, 0.03);
  else if (kind === 'blunt') noise(o, t, 0.22, 'bandpass', jit(350), jit(900), 1.6, 0.45, 0.08);
  else noise(o, t, 0.18, 'bandpass', jit(1600), jit(4200), 2.2, 0.35, 0.06);
}

/** 짧은 신음 (톱니파 → 모음 공명 두 개) */
function grunt(o: AudioNode, t: number, f0: number, vowel: [number, number], peak: number, dur = 0.16) {
  const src = ctx!.createOscillator(); src.type = 'sawtooth';
  src.frequency.setValueAtTime(f0 * 1.15, t); src.frequency.exponentialRampToValueAtTime(f0 * 0.8, t + dur);
  const g = ctx!.createGain();
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(peak, t + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  for (const [f, q] of [[vowel[0], 5], [vowel[1], 7]]) {
    const bp = ctx!.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = f; bp.Q.value = q;
    src.connect(bp).connect(g);
  }
  g.connect(o);
  src.start(t); src.stop(t + dur + 0.05);
}

/** 맞는 소리 = 무기 층 + 몸 층. 치명타는 한 겹 더 묵직하게. pitch = 사람마다 다른 높낮이 */
export function impact(kind: HitKind, s: Spot, crit = false, body: Body = 'flesh', pitch = 1) {
  if (!ready()) return;
  const t = ctx!.currentTime, o = out(s, crit ? 1.25 : 1);
  // 무기
  if (kind === 'fist') {
    tone(o, t, 0.13, 'sine', jit(150) * pitch, 55, 0.9);
    noise(o, t, 0.06, 'lowpass', 1400, 400, 0.7, 0.5);
  } else if (kind === 'blunt') {
    tone(o, t, 0.16, 'triangle', jit(210), 70, 0.8);
    noise(o, t, 0.09, 'bandpass', jit(950), 500, 1.4, 0.8);
    tone(o, t, 0.05, 'square', jit(620), 300, 0.08);
  } else if (kind === 'blade') {
    noise(o, t, 0.1, 'highpass', jit(3200), 2000, 0.8, 0.55);
    tone(o, t, 0.2, 'sine', jit(2600), 2300, 0.07);
    tone(o, t, 0.16, 'sine', jit(3900), 3500, 0.05);
  } else {
    tone(o, t, 0.1, 'sine', jit(120), 50, 0.6);
  }
  // 몸
  if (body === 'thug') {
    // 단단한 근육 · 낮고 굵은 신음
    tone(o, t, 0.15, 'sine', 105 * pitch, 50, 0.85);
    noise(o, t, 0.05, 'bandpass', 600, 300, 1, 0.4);
    if (Math.random() < 0.6) grunt(o, t + 0.03, 118 * pitch, [650, 1080], 0.22);
  } else if (body === 'flesh') {
    // 행인: 가볍고 높은 비명 섞인 신음
    tone(o, t, 0.1, 'sine', 170 * pitch, 80, 0.55);
    if (Math.random() < 0.7) grunt(o, t + 0.02, 190 * pitch, [800, 1300], 0.18, 0.2);
  } else if (body === 'suturer') {
    // 두꺼운 코트를 치는 둔탁함 + 몸에 꿰맨 금실·바늘이 울리는 쇳소리
    noise(o, t, 0.07, 'bandpass', 1700, 900, 1.6, 0.6);
    tone(o, t, 0.12, 'sine', 90 * pitch, 45, 0.7);
    tone(o, t + 0.01, 0.35, 'sine', 1420 * pitch, 1400, 0.09);
    tone(o, t + 0.01, 0.28, 'sine', 2130 * pitch, 2100, 0.06);
  } else if (body === 'monster') {
    // 실밥 터진 몸: 젖은 듯 찢기는 소리 + 아주 낮은 울림 + 으르렁
    noise(o, t, 0.14, 'lowpass', 2400, 300, 0.7, 0.9, 0.002);
    noise(o, t + 0.03, 0.09, 'bandpass', 3800, 1500, 3, 0.35);
    tone(o, t, 0.28, 'sine', 62, 32, 1.0);
    const g = ctx!.createOscillator(); g.type = 'sawtooth'; g.frequency.value = 58 * pitch;
    const lf = ctx!.createBiquadFilter(); lf.type = 'lowpass'; lf.frequency.value = 420;
    const gg = ctx!.createGain(); gg.gain.setValueAtTime(0.0001, t); gg.gain.exponentialRampToValueAtTime(0.35, t + 0.04); gg.gain.exponentialRampToValueAtTime(0.0001, t + 0.38);
    const trem = ctx!.createOscillator(); trem.frequency.value = 23; const tg = ctx!.createGain(); tg.gain.value = 0.15; trem.connect(tg).connect(gg.gain);
    g.connect(lf).connect(gg).connect(o); g.start(t); g.stop(t + 0.42); trem.start(t); trem.stop(t + 0.42);
  } else if (body === 'ash') {
    // 잿빛 망자: 마른 숯이 부서지는 바삭한 소리 + 재가 흩날림
    noise(o, t, 0.12, 'highpass', 1800, 900, 0.8, 0.6, 0.002);
    noise(o, t + 0.02, 0.2, 'bandpass', 700, 300, 1.2, 0.35);
    tone(o, t, 0.1, 'sine', 120 * pitch, 60, 0.4);
  } else if (body === 'pret') {
    // 프렛: 텅 빈 몸이 울리는 소리 + 가늘고 높은 신음
    tone(o, t, 0.18, 'triangle', 240 * pitch, 140, 0.45);
    grunt(o, t + 0.03, 330 * pitch, [900, 2400], 0.16, 0.32);
  } else if (body === 'bones') {
    // 해골: 마른 뼈가 부딪히는 딱딱한 소리 두세 번
    for (let k = 0; k < 3; k++) noise(o, t + k * 0.035, 0.03, 'bandpass', 2600 - k * 400, 1800, 6, 0.55 - k * 0.12, 0.001);
    tone(o, t, 0.05, 'square', 900 * pitch, 500, 0.12);
  } else if (body === 'yak') {
    // 야크: 거대한 몸통을 치는 깊은 울림 + 낮은 노성
    tone(o, t, 0.3, 'sine', 70 * pitch, 34, 1.0);
    noise(o, t, 0.08, 'lowpass', 900, 200, 0.8, 0.6);
    if (Math.random() < 0.5) grunt(o, t + 0.05, 82 * pitch, [480, 820], 0.3, 0.3);
  } else if (body === 'player') {
    // 내가 맞을 때: 가슴이 울리는 낮은 쿵
    tone(o, t, 0.2, 'sine', 80, 40, 1.0);
    noise(o, t, 0.05, 'lowpass', 900, 300, 0.7, 0.4);
  }
  if (crit) { tone(o, t + 0.01, 0.22, 'sine', 90, 38, 0.9); noise(o, t, 0.05, 'highpass', 2500, 1500, 0.7, 0.3); }
}

/** 총소리 */
export function gunshot(s: Spot) {
  if (!ready()) return;
  const t = ctx!.currentTime, o = out(s, 1.1);
  noise(o, t, 0.28, 'highpass', jit(900), 300, 0.6, 1.0, 0.002);
  noise(o, t, 0.45, 'lowpass', 1800, 200, 0.7, 0.5, 0.002);
  tone(o, t, 0.2, 'sine', 95, 38, 0.9);
}

/** 뼈주사위가 나무 상자 위를 구르는 소리: 짧은 딸깍 여럿이 잦아든다 */
export function dice() {
  if (!ready()) return;
  const t = ctx!.currentTime, o = out({ pan: 0, vol: 0.9 }, 1);
  for (let k = 0; k < 7; k++) { const dt = k * 0.07 + k * k * 0.012; noise(o, t + dt, 0.03, 'bandpass', jit(2600), 1800, 4, 0.5 * (1 - k / 8), 0.001); tone(o, t + dt, 0.04, 'triangle', jit(900), 600, 0.12 * (1 - k / 8)); }
}

/** 쓰러지는 소리 */
export function thud(s: Spot) {
  if (!ready()) return;
  const t = ctx!.currentTime, o = out(s, 1);
  noise(o, t, 0.32, 'lowpass', 420, 120, 0.8, 0.7, 0.01);
  tone(o, t, 0.26, 'sine', 75, 38, 0.8);
  noise(o, t + 0.12, 0.18, 'lowpass', 300, 100, 0.8, 0.35, 0.01);
}

/** 지옥으로 떨어질 때: 낮게 울리는 땅울림과 아래로 꺼지는 바람 소리 */
export function plunge(long = true) {
  if (!ready()) return;
  const t = ctx!.currentTime, o = out({ pan: 0, vol: 1 }, 1);
  const dur = long ? 2.2 : 1.1;
  noise(o, t, dur, 'lowpass', 260, 60, 0.9, 0.9, 0.25);
  noise(o, t + 0.05, dur * 0.9, 'bandpass', 1400, 180, 1.4, 0.45, 0.3);
  tone(o, t, dur, 'sawtooth', 62, 28, 0.32);
  tone(o, t + 0.1, dur * 0.8, 'sine', 120, 40, 0.4);
  if (long) noise(o, t + dur - 0.2, 0.5, 'lowpass', 500, 90, 0.8, 0.8, 0.01); // 바닥에 닿는 소리
}

/** 천국으로 떠오를 때: 위로 올라가는 맑은 종소리 */
export function chime() {
  if (!ready()) return;
  const t = ctx!.currentTime, o = out({ pan: 0, vol: 0.8 }, 1);
  [523, 659, 784, 1047, 1319].forEach((f, k) => tone(o, t + k * 0.16, 1.4, 'sine', f, f * 1.002, 0.22));
  noise(o, t, 1.6, 'highpass', 3000, 6000, 0.6, 0.12, 0.2);
}

/** 영격이 오를 때: 낮은 울림 위로 솟는 금빛 화음 (종 두 겹 + 반짝임) */
export function rankUp() {
  if (!ready()) return;
  const t = ctx!.currentTime, o = out({ pan: 0, vol: 1 }, 1);
  tone(o, t, 1.6, 'sine', 98, 96, 0.38);
  noise(o, t, 0.9, 'lowpass', 600, 120, 0.7, 0.35, 0.05);
  [392, 494, 587, 784].forEach((f, k) => { tone(o, t + 0.08 + k * 0.11, 1.5, 'triangle', f, f * 1.003, 0.16); tone(o, t + 0.08 + k * 0.11, 1.2, 'sine', f * 2, f * 2.004, 0.07); });
  tone(o, t + 0.55, 2.0, 'sine', 1175, 1176, 0.12);
  noise(o, t + 0.5, 1.4, 'highpass', 4000, 7000, 0.5, 0.1, 0.15);
}
